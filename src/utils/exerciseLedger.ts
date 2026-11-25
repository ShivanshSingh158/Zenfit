import { estimate1RM } from '../services/oneRepMaxEngine';
// src/utils/exerciseLedger.ts

import { getL1Sync, setL1Sync } from './bootManifest';
import { normalizeExerciseKey } from './gymUtils';

export const EXERCISE_LEDGER_KEY = '@zentrack_exercise_ledger_v1';

export interface LedgerSetEntry {
  setNumber: number;
  weight: number;
  reps: number;
  rir?: number;
  setType?: string;
}

export interface ExerciseLedgerRecord {
  exerciseName: string;
  lastDate: string;
  updatedAt: number;
  bestWeight: number;
  best1RM: number;
  historicalBestWeight?: number;
  historicalBest1RM?: number;
  historicalSets?: LedgerSetEntry[];
  historicalDate?: string;
  sets: LedgerSetEntry[];
}

export type ExerciseLedgerMap = Record<string, ExerciseLedgerRecord>;

export function getExerciseLedgerSetsSync(exerciseName: string): LedgerSetEntry[] | null {
  if (!exerciseName) return null;
  const key = normalizeExerciseKey(exerciseName);
  const ledger = getL1Sync<ExerciseLedgerMap>(EXERCISE_LEDGER_KEY, {});
  return ledger[key]?.sets?.length ? ledger[key].sets : null;
}

export function getExerciseLedgerRecordSync(exerciseName: string): ExerciseLedgerRecord | null {
  if (!exerciseName) return null;
  const key = normalizeExerciseKey(exerciseName);
  const ledger = getL1Sync<ExerciseLedgerMap>(EXERCISE_LEDGER_KEY, {});
  return ledger[key] || null;
}

function calcLedgerSet1RM(w: number, r: number, rir?: number): number {
  if (w <= 0 || r <= 0) return 0;
  return Math.round(estimate1RM(w, r, 'hybrid', rir ?? 0) * 10) / 10;
}

export function recordExerciseToLedger(
  exerciseName: string,
  setsLog: any[],
  dateStr: string
): void {
  if (!exerciseName || !Array.isArray(setsLog) || !dateStr) return;
  const key = normalizeExerciseKey(exerciseName);
  if (!key) return;

  const workingDone = setsLog.filter(
    s => s && s.completed === true && !s.isWarmup && s.setType !== 'warmup' && (Number(s.weight ?? s.weightKg) >= 0 && Number(s.reps) > 0)
  );

  const ledger = { ...getL1Sync<ExerciseLedgerMap>(EXERCISE_LEDGER_KEY, {}) };
  const existing = ledger[key];

  // Fix #244: If user unchecked all sets on the latest session date, roll back to historical snapshot!
  if (workingDone.length === 0) {
    if (existing && existing.lastDate === dateStr) {
      if (existing.historicalSets && existing.historicalSets.length > 0 && existing.historicalDate) {
        ledger[key] = {
          ...existing,
          lastDate: existing.historicalDate,
          bestWeight: existing.historicalBestWeight || 0,
          best1RM: existing.historicalBest1RM || 0,
          sets: existing.historicalSets,
          updatedAt: Date.now(),
        };
      } else {
        delete ledger[key];
      }
      setL1Sync(EXERCISE_LEDGER_KEY, ledger, true);
    }
    return;
  }

  let todayMaxWeight = 0;
  let todayMax1RM = 0;

  const cleanSets: LedgerSetEntry[] = workingDone.map((s, idx) => {
    const w = Math.max(0, Number(s.weight ?? s.weightKg) || 0);
    const r = Math.max(1, Number(s.reps) || 0);
    if (w > todayMaxWeight) todayMaxWeight = w;
    const e1rm = calcLedgerSet1RM(w, r, s.rir);
    if (e1rm > todayMax1RM) todayMax1RM = e1rm;
    return {
      setNumber: idx + 1,
      weight: w,
      reps: r,
      ...(s.rir !== undefined ? { rir: s.rir } : {}),
      ...(s.setType ? { setType: s.setType } : {}),
    };
  });

  // Fix #74 & #126: Never overwrite newer `sets` or `lastDate` when editing an older past workout!
  if (existing && existing.lastDate && dateStr < existing.lastDate) {
    if (todayMaxWeight > (existing.bestWeight || 0) || todayMax1RM > (existing.best1RM || 0)) {
      ledger[key] = {
        ...existing,
        bestWeight: Math.max(existing.bestWeight || 0, todayMaxWeight),
        best1RM: Math.max(existing.best1RM || 0, todayMax1RM),
        historicalBestWeight: Math.max(existing.historicalBestWeight || 0, todayMaxWeight),
        historicalBest1RM: Math.max(existing.historicalBest1RM || 0, todayMax1RM),
        updatedAt: Date.now(),
      };
      setL1Sync(EXERCISE_LEDGER_KEY, ledger);
    }
    return;
  }

  const isNewerDate = existing && existing.lastDate && existing.lastDate < dateStr;
  const baselineBestWeight = isNewerDate ? (existing.bestWeight || 0) : (existing?.historicalBestWeight || 0);
  const baselineBest1RM = isNewerDate ? (existing.best1RM || 0) : (existing?.historicalBest1RM || 0);
  const historicalSets = isNewerDate ? existing.sets : existing?.historicalSets;
  const historicalDate = isNewerDate ? existing.lastDate : existing?.historicalDate;

  ledger[key] = {
    exerciseName,
    lastDate: dateStr,
    updatedAt: Date.now(),
    bestWeight: Math.max(baselineBestWeight, todayMaxWeight),
    best1RM: Math.max(baselineBest1RM, todayMax1RM),
    historicalBestWeight: baselineBestWeight,
    historicalBest1RM: baselineBest1RM,
    ...(historicalSets ? { historicalSets } : {}),
    ...(historicalDate ? { historicalDate } : {}),
    sets: cleanSets,
  };

  setL1Sync(EXERCISE_LEDGER_KEY, ledger, true);
}
