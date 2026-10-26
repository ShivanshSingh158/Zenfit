/**
 * exerciseLedger.ts — ZenTrack Mobile
 *
 * Dedicated O(1) Per-Exercise Working Sets Ledger:
 * Key: '@zentrack_exercise_ledger_v1'
 *
 * Guarantees that every exercise's latest completed working weights, reps,
 * best 1RM, and RIR are permanently remembered and available synchronously in 0ms on Frame 0,
 * even when `gymLogs` is empty, cleared, or still hydrating from Firestore.
 */

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
  sets: LedgerSetEntry[]; // Always holds the latest completed working sets for instant pre-fill
}

export type ExerciseLedgerMap = Record<string, ExerciseLedgerRecord>;

/**
 * 0ms Synchronous Read: Returns the last logged sets for an exercise even if `gymLogs` is empty!
 */
export function getExerciseLedgerSetsSync(exerciseName: string): LedgerSetEntry[] | null {
  if (!exerciseName) return null;
  const key = normalizeExerciseKey(exerciseName);
  const ledger = getL1Sync<ExerciseLedgerMap>(EXERCISE_LEDGER_KEY, {});
  return ledger[key]?.sets?.length ? ledger[key].sets : null;
}

/**
 * 0ms Synchronous Read: Returns the full ledger record for an exercise.
 */
export function getExerciseLedgerRecordSync(exerciseName: string): ExerciseLedgerRecord | null {
  if (!exerciseName) return null;
  const key = normalizeExerciseKey(exerciseName);
  const ledger = getL1Sync<ExerciseLedgerMap>(EXERCISE_LEDGER_KEY, {});
  return ledger[key] || null;
}

/**
 * Updates the permanent ledger the moment a set is completed.
 * Guarantees that future sessions (or app restarts) ALWAYS pre-fill the exact weight/reps logged.
 */
export function recordExerciseToLedger(
  exerciseName: string,
  setsLog: any[],
  dateStr: string
): void {
  if (!exerciseName || !Array.isArray(setsLog)) return;
  const key = normalizeExerciseKey(exerciseName);
  if (!key) return;

  const workingDone = setsLog.filter(
    s => s && !s.isWarmup && s.setType !== 'warmup' && (s.completed || (Number(s.weight) > 0 && Number(s.reps) > 0))
  );
  if (workingDone.length === 0) return;

  const ledger = { ...getL1Sync<ExerciseLedgerMap>(EXERCISE_LEDGER_KEY, {}) };
  const existing = ledger[key];

  let bestWeight = existing?.bestWeight || 0;
  let best1RM = existing?.best1RM || 0;

  const cleanSets: LedgerSetEntry[] = workingDone.map((s, idx) => {
    const w = Number(s.weight ?? s.weightKg) || 0;
    const r = Number(s.reps) || 0;
    if (w > bestWeight) bestWeight = w;
    const e1rm = w * (1 + r / 30);
    if (e1rm > best1RM) best1RM = Math.round(e1rm * 10) / 10;
    return {
      setNumber: idx + 1,
      weight: w,
      reps: r,
      ...(s.rir !== undefined ? { rir: s.rir } : {}),
      ...(s.setType ? { setType: s.setType } : {}),
    };
  });

  ledger[key] = {
    exerciseName,
    lastDate: dateStr,
    updatedAt: Date.now(),
    bestWeight,
    best1RM,
    sets: cleanSets,
  };

  // Writes synchronously to L1_RAM_CACHE and persists to AsyncStorage via setL1Sync
  setL1Sync(EXERCISE_LEDGER_KEY, ledger);
}
