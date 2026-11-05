import { todayStr } from '../hooks/useGymLog';
import { getPreviousExerciseSession } from './gymUtils';
import { getExerciseLedgerSetsSync } from './exerciseLedger';

export interface SetInputState {
  weight: string;
  reps: string;
}

/**
 * Pure Helper: Parse Upper Circuit of Reps (e.g., "10-12" or "10–12" -> 12, "8-10" -> 10)
 * Allows high-rep endurance sets up to 999 reps (e.g. 100 jump rope, 60 calf raises).
 */
export function parseUpperTargetReps(targetRepsStr?: string | number | null): number {
  if (!targetRepsStr) return 10;
  const str = String(targetRepsStr).trim();
  if (/[-–—]/.test(str)) {
    const parts = str.split(/[-–—]/);
    const upper = parseInt(parts[parts.length - 1].trim(), 10);
    if (!isNaN(upper) && upper > 0) return Math.min(999, upper);
  }
  const val = parseInt(str, 10);
  return !isNaN(val) && val > 0 ? Math.min(999, val) : 10;
}

/**
 * Standardized Target Reps Default (Lower Bound: "8-12" -> 8, "10-12" -> 10)
 */
export function parseTargetRepsDefault(targetRepsStr?: string | number | null): number {
  if (!targetRepsStr) return 8;
  const str = String(targetRepsStr).trim();
  if (/[-–—]/.test(str)) {
    const parts = str.split(/[-–—]/);
    const lower = parseInt(parts[0].trim(), 10);
    if (!isNaN(lower) && lower > 0) return Math.min(999, lower);
  }
  const val = parseInt(str, 10);
  return !isNaN(val) && val > 0 ? Math.min(999, val) : 8;
}

/**
 * Pure Helper: Resolve Set Weight & Reps across fallback tiers
 */
export function resolveSetWeightAndReps(
  input?: SetInputState,
  currentSet?: any,
  prevInput?: SetInputState | null,
  prevSet?: any | null,
  overloadSuggestion?: any | null,
  targetRepsStr?: string,
  isWeightEdited?: boolean,
  isRepsEdited?: boolean,
  lastSessionSet?: any | null,
  setIndex?: number
): { weight: number | null; reps: number | null } {
  // 1. Resolve Weight (Clamped 0 - 1000 kg, supports 0 kg bodyweight)
  let weight: number | null = null;
  if (input?.weight !== '' && input?.weight !== undefined) {
    weight = parseFloat(input.weight);
  } else if (isWeightEdited) {
    weight = null;
  } else if (currentSet?.weight != null && !isNaN(Number(currentSet.weight)) && Number(currentSet.weight) >= 0) {
    weight = Number(currentSet.weight);
  } else if (lastSessionSet?.weight != null && !isNaN(Number(lastSessionSet.weight)) && Number(lastSessionSet.weight) >= 0) {
    weight = Number(lastSessionSet.weight);
  } else if (prevInput?.weight !== '' && prevInput?.weight !== undefined) {
    weight = parseFloat(prevInput.weight);
  } else if (prevSet?.weight != null && !isNaN(Number(prevSet.weight)) && Number(prevSet.weight) >= 0) {
    weight = Number(prevSet.weight);
  } else if (setIndex != null && overloadSuggestion?.prescribedSets?.[setIndex]?.targetWeight != null) {
    weight = Number(overloadSuggestion.prescribedSets[setIndex].targetWeight);
  } else if (overloadSuggestion?.recommended) {
    weight = Number(overloadSuggestion.recommended);
  }

  // 2. Resolve Reps (Clamped 1 - 999 reps, supports endurance and high reps)
  let reps: number | null = null;
  if (input?.reps !== '' && input?.reps !== undefined) {
    const directUserReps = parseInt(input.reps, 10);
    reps = !isNaN(directUserReps) && directUserReps > 0 ? Math.min(999, directUserReps) : 10;
  } else if (isRepsEdited) {
    reps = null;
  } else if (currentSet?.reps != null && Number(currentSet.reps) > 0) {
    reps = Number(currentSet.reps);
  } else if (lastSessionSet?.reps != null && Number(lastSessionSet.reps) > 0) {
    reps = Number(lastSessionSet.reps);
  } else if (prevInput?.reps !== '' && prevInput?.reps !== undefined) {
    const directPrevReps = parseInt(prevInput.reps, 10);
    reps = !isNaN(directPrevReps) && directPrevReps > 0 ? Math.min(999, directPrevReps) : 10;
  } else if (prevSet?.reps != null && Number(prevSet.reps) > 0) {
    reps = Number(prevSet.reps);
  } else if (setIndex != null && overloadSuggestion?.prescribedSets?.[setIndex]?.targetReps != null) {
    reps = Number(overloadSuggestion.prescribedSets[setIndex].targetReps);
  } else {
    reps = parseTargetRepsDefault(targetRepsStr);
  }

  return {
    weight: weight !== null && !isNaN(weight) ? Math.min(1000, Math.max(0, weight)) : null,
    reps: reps !== null && !isNaN(reps) ? Math.min(999, Math.max(1, reps)) : 10,
  };
}

/**
 * Pure Helper: Find next superset partner index with incomplete sets
 */
export function findNextSupersetExerciseIndex(exercises: any[], currentIdx: number, supersetGroup?: string): number {
  if (!supersetGroup) return -1;
  const supersetIndices = exercises
    .map((ex, idx) => (ex.supersetGroup === supersetGroup ? idx : -1))
    .filter(idx => idx !== -1);

  if (supersetIndices.length <= 1) return -1;
  const currentIndexInGroup = supersetIndices.indexOf(currentIdx);

  for (let i = 1; i < supersetIndices.length; i++) {
    const checkIndex = supersetIndices[(currentIndexInGroup + i) % supersetIndices.length];
    const checkEx = exercises[checkIndex];
    if (checkEx?.setsLog?.some((s: any) => !s.completed)) {
      return checkIndex;
    }
  }
  return -1;
}

/**
 * Pure helper: compute initial set-input state synchronously.
 * Called inside useState() initializer so the component never renders with empty
 * inputs and immediately re-renders — eliminating double-renders on mount.
 */
export function computeInitialSetInputs(
  exercise: any,
  gymLogs: any[] | null | undefined,
  date: string | undefined
): SetInputState[] {
  if (!exercise || !exercise.setsLog) return [];
  let lastSessionSets = (Array.isArray(exercise.lastSessionSets) && exercise.lastSessionSets.length > 0)
    ? exercise.lastSessionSets
    : (getPreviousExerciseSession(exercise.name, gymLogs, date || todayStr())?.sets ?? []);

  // Zero-Data-Loss Ledger Fallback: If gymLogs hasn't hydrated or last session had no sets, read permanent ledger!
  if ((!lastSessionSets || lastSessionSets.length === 0) && exercise.name) {
    const ledgerSets = getExerciseLedgerSetsSync(exercise.name);
    if (ledgerSets && ledgerSets.length > 0) {
      lastSessionSets = ledgerSets;
    }
  }

  const lastValidPastSet = lastSessionSets.length > 0 ? lastSessionSets[lastSessionSets.length - 1] : null;
  return exercise.setsLog.map((s: any, idx: number) => {
    if (s.completed) {
      return {
        weight: (s.weight !== null && s.weight !== undefined && Number(s.weight) >= 0) ? String(s.weight) : '',
        reps: (s.reps !== null && s.reps !== undefined && Number(s.reps) > 0) ? String(s.reps) : '',
      };
    }
    const lastSet = lastSessionSets[idx] || lastValidPastSet;
    let initialWeight = (s.weight !== null && s.weight !== undefined && Number(s.weight) >= 0) ? String(s.weight) : '';
    if (!initialWeight && lastSet?.weight != null && Number(lastSet.weight) >= 0) {
      initialWeight = String(lastSet.weight);
    }
    const defaultTargetReps = String(parseTargetRepsDefault(exercise.targetReps));
    const initialReps = (s.reps !== null && s.reps !== undefined && Number(s.reps) > 0)
      ? String(s.reps)
      : (lastSet?.reps ? String(lastSet.reps) : defaultTargetReps);
    return { weight: initialWeight, reps: initialReps };
  });
}
