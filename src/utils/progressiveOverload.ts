// src/utils/progressiveOverload.ts
import {
  ExerciseProfileInput,
  HistoricalSessionInput,
  LoggedSetInput,
  ProgressionRecommendation,
  ProgressionPolicy,
  ProgressionResult,
  RecoveryContextInput,
  SetPrescription,
  generateProgressionRecommendation,
  recalculateRemainingSetsLive,
  convertGymLogsToHistory,
} from './progressionEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeExerciseKey } from './gymUtils';
import { formatLocalDateStr } from './dateUtils';
import { estimate1RM, OneRMFormula, calculateRepMaxTable } from '../services/oneRepMaxEngine';

export {
  estimate1RM,
  OneRMFormula,
  calculateRepMaxTable,
  generateProgressionRecommendation,
  recalculateRemainingSetsLive,
  convertGymLogsToHistory,
  ProgressionPolicy,
  ProgressionResult,
  ProgressionRecommendation,
  SetPrescription,
};

const COMPOUND_EXERCISES = [
  "squat", "deadlift", "bench", "press", "row", "pull-up", "pullup",
  "barbell", "romanian", "rdl", "hip thrust", "military", "overhead",
  "incline", "decline", "landmine", "hack squat",
];
const SECONDARY_COMPOUND = ["dip", "chin-up", "chinup", "weighted pull", "cable row"];

function isLegacyCompound(name: string): boolean {
  const lower = name.toLowerCase();
  return COMPOUND_EXERCISES.some((k) => lower.includes(k));
}
function isLegacySecondaryCompound(name: string): boolean {
  const lower = name.toLowerCase();
  return SECONDARY_COMPOUND.some((k) => lower.includes(k));
}

/** REST time in seconds based on exercise type */
export function getRestDuration(exercise: { name: string; isCompound?: boolean }): number {
  if (exercise.isCompound === true) return 180;
  if (exercise.isCompound === false) return 90;
  if (isLegacyCompound(exercise.name)) return 180;
  if (isLegacySecondaryCompound(exercise.name)) return 120;
  return 90;
}

export interface OverloadSuggestion extends ProgressionRecommendation {
  /** Legacy & convenience fields so existing UI components never break */
  suggestedWeight: number;
  suggestedReps: string;
  reason: string;
  isWeightIncrease: boolean;
  isDeload: boolean;
  recommended: number;
  reps?: string;
  policy?: ProgressionPolicy;
  type: "increase" | "decrease" | "maintain";
}

/**
 * Universal entry point for ActiveLoggingScreen.tsx and ActiveExerciseHeader.tsx.
 * Supports:
 *   1. Modern: getOverloadSuggestion(profileOrName, history, recoveryContext, completedSetsToday)
 *   2. Legacy: getOverloadSuggestion(exercise, curWeight, targetSets, targetRepsStr, gymLogs, recoveryContext, completedSetsToday)
 */
export function getOverloadSuggestion(
  profileOrName: any,
  arg2?: any,
  arg3?: any,
  arg4?: any,
  arg5?: any,
  arg6?: any,
  arg7?: any
): OverloadSuggestion {
  let profile: ExerciseProfileInput;
  let history: HistoricalSessionInput[] = [];
  let recoveryContext: RecoveryContextInput = {};
  let completedSetsToday: LoggedSetInput[] = [];

  // Check if called with legacy multi-param signature
  if (typeof arg2 === 'number' && typeof arg3 === 'number') {
    const rawEx = typeof profileOrName === 'string' ? { name: profileOrName } : profileOrName;
    const targetSets = arg3;
    const targetRepsStr = String(arg4 || '8-12');
    const gymLogs = arg5 || [];
    recoveryContext = arg6 || {};
    completedSetsToday = arg7 || [];

    let targetRepLow = 8;
    let targetRepHigh = 12;
    const repMatch = targetRepsStr.match(/(\d+)\s*(?:[-–—]|to)\s*(\d+)/i);
    if (repMatch) {
      targetRepLow = parseInt(repMatch[1], 10);
      targetRepHigh = parseInt(repMatch[2], 10);
    } else {
      const s = parseInt(targetRepsStr, 10);
      if (!isNaN(s) && s > 0) {
        targetRepLow = s;
        targetRepHigh = s;
      }
    }

    profile = {
      id: rawEx.id,
      name: rawEx.name || 'Exercise',
      primaryMuscle: rawEx.primaryMuscle || rawEx.muscle,
      isCompound: rawEx.isCompound,
      equipment: rawEx.equipment,
      targetSets: rawEx.targetSets || targetSets || 3,
      targetRepLow,
      targetRepHigh,
      hasMicroPlates: rawEx.hasMicroPlates,
      progressionPolicy: rawEx.progressionPolicy || (rawEx as any).progressionModel || 'double',
    };

    history = convertGymLogsToHistory(profile.name, gymLogs);
  } else {
    // Modern signature
    profile = typeof profileOrName === 'string' ? { name: profileOrName } : {
      ...profileOrName,
      progressionPolicy: (profileOrName as any).progressionPolicy || (profileOrName as any).progressionModel || 'double',
    };
    const rawHistory = arg2 || [];

    // If history is passed as raw GymDayLog array, auto-convert it
    if (rawHistory.length > 0 && Array.isArray(rawHistory[0]?.exercises)) {
      history = convertGymLogsToHistory(profile.name, rawHistory);
    } else {
      history = rawHistory;
    }

    recoveryContext = arg3 || {};
    completedSetsToday = arg4 || [];
  }

  const baseRec = generateProgressionRecommendation(
    profile,
    history,
    recoveryContext
  );

  const livePrescribedSets =
    completedSetsToday && completedSetsToday.length > 0
      ? recalculateRemainingSetsLive(baseRec, completedSetsToday)
      : baseRec.prescribedSets;

  const repTargetsJoined = livePrescribedSets
    .map((s) => s.targetReps)
    .join(', ');

  // Issue #109: Count completed working sets only (excluding warmups) when indexing livePrescribedSets
  const completedWorkingCount = completedSetsToday
    ? completedSetsToday.filter(s => !s.isWarmup && s.setType !== 'warmup').length
    : 0;

  const activeHeadline =
    completedWorkingCount > 0 && baseRec.state !== 'BASELINE'
      ? `Next Target: ${
          livePrescribedSets[completedWorkingCount]?.label ??
          `${baseRec.recommendedWeight} kg × ${repTargetsJoined}`
        }`
      : baseRec.headline;

  const isWeightIncrease =
    baseRec.state === 'WEIGHT_UNLOCK' || baseRec.state === 'PLATEAU_BREAK';
  const isDeload =
    baseRec.state === 'REACTIVE_DELOAD' || baseRec.state === 'DETRAINED_RAMP' || baseRec.isDeload;

  let type: "increase" | "decrease" | "maintain" = "maintain";
  if (isWeightIncrease || baseRec.weightDelta > 0) {
    type = "increase";
  } else if (isDeload || baseRec.weightDelta < 0) {
    type = "decrease";
  }

  return {
    ...baseRec,
    headline: activeHeadline,
    prescribedSets: livePrescribedSets,
    suggestedWeight: baseRec.recommendedWeight,
    suggestedReps: repTargetsJoined,
    reps: repTargetsJoined,
    reason: baseRec.subheadline,
    isWeightIncrease,
    isDeload,
    recommended: baseRec.recommendedWeight,
    type,
    policy: (profile as any).progressionPolicy || 'double',
  };
}

/**
 * Backward-compatible evaluateProgression wrapper
 */
export function evaluateProgression(
  exercise: {
    name: string;
    targetSets: number;
    targetReps: string;
    isCompound?: boolean;
    muscle?: string;
    progressionPolicy?: ProgressionPolicy;
  },
  currentWeight: number,
  gymLogs: any[]
): ProgressionResult {
  const suggestion = getOverloadSuggestion(
    exercise,
    currentWeight,
    exercise.targetSets,
    exercise.targetReps,
    gymLogs
  );

  return {
    policy: exercise.progressionPolicy || 'double',
    recommendedWeight: suggestion.recommendedWeight,
    recommendedReps: suggestion.suggestedReps,
    weightDelta: suggestion.weightDelta,
    isDeload: suggestion.isDeload,
    reason: suggestion.subheadline,
    consecutiveMisses: suggestion.state === 'REACTIVE_DELOAD' ? 2 : 0,
  };
}

// ─── 1RM Calculator ──────────────────────────────────────────────────────────
export function calculate1RM(weight: number, reps: number, formula: OneRMFormula = 'hybrid'): number {
  return Math.round(estimate1RM(weight, reps, formula));
}

// ─── PR Storage ──────────────────────────────────────────────────────────────
const PR_STORAGE_KEY = 'zentrack_exercise_prs_v1';

export interface ExercisePR {
  exerciseName?: string;
  best1RM: number;
  heaviestWeight: number;
  bestReps: number;
  achievedAt: string;
}

export type PRRecord = Record<string, ExercisePR>;

let _prMemoryCache: PRRecord | null = null;
let _cachedMergedPRs: PRRecord | null = null;
let _cachedMergedPRsFingerprint: string = '';

export function invalidatePRCache(): void {
  _prMemoryCache = null;
  _cachedMergedPRs = null;
  _cachedMergedPRsFingerprint = '';
}

async function readPRs(): Promise<PRRecord> {
  if (_prMemoryCache !== null) return _prMemoryCache;
  try {
    const raw = await AsyncStorage.getItem(PR_STORAGE_KEY);
    _prMemoryCache = raw ? JSON.parse(raw) : {};
    return _prMemoryCache!;
  } catch {
    _prMemoryCache = {};
    return _prMemoryCache;
  }
}

async function writePRs(record: PRRecord): Promise<void> {
  _prMemoryCache = record;
  _cachedMergedPRs = null;
  _cachedMergedPRsFingerprint = '';
  try {
    await AsyncStorage.setItem(PR_STORAGE_KEY, JSON.stringify(record));
  } catch { /* ignore */ }
}

/**
 * Accurately formats any ISO date (YYYY-MM-DD) or date string into standard Day Month Year (e.g. "12 Aug 2025").
 */
export function formatPRDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    const cleaned = String(dateStr).trim();
    const parts = cleaned.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
        return `${day} ${months[monthIdx]} ${year}`;
      }
    }
    const d = new Date(cleaned.length === 10 ? `${cleaned}T12:00:00` : cleaned);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch {
    // fallback
  }
  return String(dateStr);
}

/**
 * Extracts real all-time Personal Records dynamically from user's workout history logs.
 * Evaluates all valid completed working sets chronologically, extracting heaviest weight,
 * max reps at load, estimated 1RM, and the exact calendar date achieved.
 */
export function extractAllPRsFromLogs(logs: any[]): PRRecord {
  const prs: PRRecord = {};
  if (!Array.isArray(logs) || logs.length === 0) return prs;

  const sorted = [...logs]
    .filter(Boolean)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  for (const log of sorted) {
    const logDate = log.date || '';
    for (const ex of log.exercises || []) {
      if (ex.skipped || !ex.name) continue;
      const rawName = String(ex.name).trim();
      if (!rawName) continue;
      const normKey = normalizeExerciseKey(rawName) || rawName.toLowerCase();

      for (const set of ex.setsLog || []) {
        if (!set || !set.completed || set.isWarmup || set.setType === 'warmup') continue;
        const w = Number(set.weight ?? (set as any).weightKg) || 0;
        const r = Number(set.reps) || 0;
        if (w <= 0 || r <= 0) continue;

        const e1rm = calculate1RM(w, r);
        const existing = prs[normKey];

        if (!existing) {
          prs[normKey] = {
            exerciseName: rawName,
            best1RM: e1rm,
            heaviestWeight: w,
            bestReps: r,
            achievedAt: logDate,
          };
        } else {
          const isHigher1RM = e1rm > existing.best1RM;
          const isHeavier = w > existing.heaviestWeight;
          const isMoreRepsAtSame = w === existing.heaviestWeight && r > existing.bestReps;

          if (isHigher1RM || isHeavier || isMoreRepsAtSame) {
            prs[normKey] = {
              exerciseName: existing.exerciseName || rawName,
              best1RM: Math.max(existing.best1RM, e1rm),
              heaviestWeight: Math.max(existing.heaviestWeight, w),
              bestReps: w >= existing.heaviestWeight ? r : existing.bestReps,
              achievedAt: logDate || existing.achievedAt,
            };
          }
        }
      }
    }
  }

  return prs;
}

export async function detectPR(
  exerciseName: string,
  weight: number,
  reps: number
): Promise<{ isNewPR: boolean; previous1RM: number; new1RM: number }> {
  if (!exerciseName || weight <= 0 || reps <= 0) {
    return { isNewPR: false, previous1RM: 0, new1RM: 0 };
  }

  const key = normalizeExerciseKey(exerciseName) || exerciseName.toLowerCase().trim();
  const new1RM = calculate1RM(weight, reps);
  const prs = await readPRs();
  const existing = prs[key] || prs[exerciseName.toLowerCase().trim()];

  const previous1RM = existing?.best1RM ?? 0;

  if (!existing || new1RM > existing.best1RM) {
    prs[key] = {
      exerciseName,
      best1RM: new1RM,
      heaviestWeight: weight,
      bestReps: reps,
      achievedAt: formatLocalDateStr(new Date()),
    };
    await writePRs(prs);
    return { isNewPR: true, previous1RM, new1RM };
  }

  return { isNewPR: false, previous1RM, new1RM };
}

export async function getAllPRs(logs?: any[]): Promise<PRRecord> {
  const fp = logs && Array.isArray(logs) ? `${logs.length}_${logs[0]?.date || ''}_${logs[logs.length - 1]?.date || ''}` : 'empty';
  if (_cachedMergedPRs && _cachedMergedPRsFingerprint === fp) {
    return _cachedMergedPRs;
  }

  const stored = await readPRs();
  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    _cachedMergedPRs = stored;
    _cachedMergedPRsFingerprint = fp;
    return stored;
  }
  const fromLogs = extractAllPRsFromLogs(logs);
  const merged: PRRecord = { ...stored };

  for (const [key, logPR] of Object.entries(fromLogs)) {
    const storedPR = merged[key];
    if (!storedPR) {
      merged[key] = logPR;
    } else {
      merged[key] = {
        exerciseName: storedPR.exerciseName || logPR.exerciseName,
        best1RM: Math.max(storedPR.best1RM || 0, logPR.best1RM || 0),
        heaviestWeight: Math.max(storedPR.heaviestWeight || 0, logPR.heaviestWeight || 0),
        bestReps: (logPR.heaviestWeight || 0) >= (storedPR.heaviestWeight || 0) ? logPR.bestReps : storedPR.bestReps,
        achievedAt: (logPR.achievedAt && (!storedPR.achievedAt || logPR.achievedAt >= storedPR.achievedAt))
          ? logPR.achievedAt
          : (storedPR.achievedAt || logPR.achievedAt),
      };
    }
  }

  _cachedMergedPRs = merged;
  _cachedMergedPRsFingerprint = fp;
  return merged;
}

export async function clearAllPRs(): Promise<void> {
  invalidatePRCache();
  await AsyncStorage.removeItem(PR_STORAGE_KEY);
}
