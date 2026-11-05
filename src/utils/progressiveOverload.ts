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

  const activeHeadline =
    completedSetsToday && completedSetsToday.length > 0 && baseRec.state !== 'BASELINE'
      ? `Next Target: ${
          livePrescribedSets[completedSetsToday.length]?.label ??
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
export function calculate1RM(weight: number, reps: number, formula: OneRMFormula = 'epley'): number {
  return Math.round(estimate1RM(weight, reps, formula));
}

// ─── PR Storage ──────────────────────────────────────────────────────────────
const PR_STORAGE_KEY = 'zentrack_exercise_prs_v1';

export interface ExercisePR {
  best1RM: number;
  heaviestWeight: number;
  bestReps: number;
  achievedAt: string;
}

export type PRRecord = Record<string, ExercisePR>;

async function readPRs(): Promise<PRRecord> {
  try {
    const raw = await AsyncStorage.getItem(PR_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writePRs(record: PRRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(PR_STORAGE_KEY, JSON.stringify(record));
  } catch { /* ignore */ }
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

export async function getAllPRs(): Promise<PRRecord> {
  return readPRs();
}

export async function clearAllPRs(): Promise<void> {
  await AsyncStorage.removeItem(PR_STORAGE_KEY);
}
