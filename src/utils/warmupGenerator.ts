/**
 * warmupGenerator.ts — ZenFit Biomechanical Load-Scaled Warmup Engine
 *
 * Implements load-scaled warmup progression & neural potentiation:
 * 1. Prior Muscle Warmth Check:
 *    - If >= 2 sets already performed for target muscle group, skip blood-flow sets.
 *    - Output 1 Acclimation Set only: 75% W_working x 3 reps.
 * 2. Isolation Movements:
 *    - 1-2 light pump sets max (60% x 10). Never prescribe heavy singles on isolations.
 * 3. Fresh Compounds:
 *    - Dynamically scales warmup sets from 2 to 6 based on delta W = W_working - W_base.
 *    - Uses 0.85 power distribution for neural potentiation (larger jumps early, tight jumps near 88%).
 *    - Snapped to 2.5 kg gym increments (or 20 kg barbell tare).
 */

import { GymSet } from '../types/gym.types';
import { MovementCategory } from '../types/exercise';
import { resolveExerciseBiometrics } from './exerciseClassifier';

export interface WarmupConfig {
  workingWeight: number;
  exerciseName?: string;
  category?: MovementCategory;
  priorSetsForMuscleGroup?: number;
  barTare?: number;
  weightStep?: number;
  isLbs?: boolean;
}

const snapWeightStep = (val: number, step: number) =>
  Math.max(step, Math.round(val / step) * step);

export function generateWarmupLadder(
  workingWeightOrConfig: number | WarmupConfig,
  legacyBarTare?: number
): GymSet[] {
  let category: MovementCategory = 'STANDARD_COMPOUND';
  let priorSets = 0;
  const isConfigObj = typeof workingWeightOrConfig === 'object' && workingWeightOrConfig !== null;
  const isLbs = isConfigObj ? Boolean(workingWeightOrConfig.isLbs) : false;
  const step = isConfigObj && workingWeightOrConfig.weightStep && workingWeightOrConfig.weightStep > 0
    ? workingWeightOrConfig.weightStep
    : (isLbs ? 5 : 2.5);
  let barTare = isConfigObj
    ? (workingWeightOrConfig.barTare ?? (isLbs ? 45 : 20))
    : (legacyBarTare ?? 20);

  const rawW = typeof workingWeightOrConfig === 'number'
    ? workingWeightOrConfig
    : workingWeightOrConfig?.workingWeight ?? (isLbs ? 95 : 40);

  if (isConfigObj) {
    priorSets = workingWeightOrConfig.priorSetsForMuscleGroup ?? 0;
    if (workingWeightOrConfig.category) {
      category = workingWeightOrConfig.category;
    } else if (workingWeightOrConfig.exerciseName) {
      const bio = resolveExerciseBiometrics(workingWeightOrConfig.exerciseName);
      category = bio.category;
    }
  }

  if (rawW <= step * 2) {
    return [
      {
        setNumber: 1,
        weight: 0,
        reps: 10,
        completed: false,
        isWarmup: true,
        warmupLabel: 'W1',
      },
    ];
  }

  const targetW = rawW;
  const effectiveTare = Math.min(barTare, Math.max(0, targetW - step));

  // ── 1. Check Prior Warmth: Acclimation set only if muscle is already warm ──
  if (priorSets >= 2) {
    const acclimationWeight = snapWeightStep(Math.max(effectiveTare, targetW * 0.75), step);
    const safeW = Math.min(targetW - step, acclimationWeight);
    return [
      {
        setNumber: 1,
        weight: safeW > 0 ? safeW : Math.max(0, targetW - step),
        reps: 3,
        completed: false,
        isWarmup: true,
        warmupLabel: 'W1',
      },
    ];
  }

  // ── 2. Check Exercise Category: Isolations require 1 pump set max ───────────
  const isolationThreshold = isLbs ? 55 : 25;
  if (category === 'ISOLATION' || targetW <= isolationThreshold) {
    const w1 = snapWeightStep(targetW * 0.6, step);
    const safeW1 = Math.min(targetW - step, Math.max(step, w1));
    return [
      {
        setNumber: 1,
        weight: safeW1,
        reps: 10,
        completed: false,
        isWarmup: true,
        warmupLabel: 'W1',
      },
    ];
  }

  // ── 3. Fresh Compounds: Dynamic Step Count by Absolute Bar Load ───────────
  const heavyThreshold = isLbs ? 135 : 60;
  const isHeavyBarbell = category === 'HEAVY_COMPOUND' || targetW >= heavyThreshold;
  const wBase = isHeavyBarbell ? Math.min(barTare, targetW * 0.5) : snapWeightStep(targetW * 0.35, step);
  const deltaStepSpan = isLbs ? 70 : 32.5;
  const deltaW = Math.max(step * 4, targetW - wBase);

  // Scale warmup sets count from 2 to 6 sets based on load delta:
  // 60kg Bench (deltaW = 40kg) -> 3 sets
  // 100kg Bench (deltaW = 80kg) -> 4 sets
  // 180kg Squat (deltaW = 160kg) -> 6 sets
  const numWarmupSets = Math.min(6, Math.max(2, Math.ceil(deltaW / deltaStepSpan) + 1));

  const warmupSets: GymSet[] = [];

  for (let k = 1; k <= numWarmupSets; k++) {
    // Neural potentiation curve: 0.85 exponent front-loads bigger jumps early (Issue #95: guard division by 0)
    const progress = (k - 1) / Math.max(1, numWarmupSets - 1);
    const pct = (wBase / targetW) + (0.88 - (wBase / targetW)) * Math.pow(progress, 0.85);

    const rawWeight = snapWeightStep(targetW * pct, step);
    const weight = Math.min(targetW - step, Math.max(wBase, rawWeight));

    // Physiological rep decay: 8-10 reps on light sets, tapering to 3-5 on acclimation sets, 1-2 on final potentiation
    const reps =
      pct <= 0.45 ? 10 :
      pct <= 0.60 ? 8 :
      pct <= 0.72 ? 5 :
      pct <= 0.82 ? 3 :
      pct <= 0.90 ? 2 : 1;

    // Prevent duplicate weights on consecutive warmup rungs
    const prevWeight = warmupSets[warmupSets.length - 1]?.weight;
    if (prevWeight !== undefined && weight <= prevWeight) {
      continue;
    }

    warmupSets.push({
      setNumber: warmupSets.length + 1,
      weight,
      reps,
      completed: false,
      isWarmup: true,
      warmupLabel: `W${warmupSets.length + 1}`,
    });
  }

  return warmupSets.length > 0 ? warmupSets : [
    {
      setNumber: 1,
      weight: snapWeightStep(targetW * 0.5, step),
      reps: 8,
      completed: false,
      isWarmup: true,
      warmupLabel: 'W1',
    },
    {
      setNumber: 2,
      weight: snapWeightStep(targetW * 0.75, step),
      reps: 4,
      completed: false,
      isWarmup: true,
      warmupLabel: 'W2',
    },
  ];
}

/**
 * Inserts or replaces warmups at the top of an exercise's set list
 */
export function insertWarmupLadder(
  existingSets: GymSet[],
  workingWeightOrConfig: number | WarmupConfig,
  barTare?: number
): GymSet[] {
  // Filter out any existing warmups
  const workingSetsOnly = existingSets.filter(s => !s.isWarmup);

  const warmups = generateWarmupLadder(workingWeightOrConfig, barTare);

  // Renumber all sets sequentially so setNumber is unique and strictly monotonic
  const merged = [...warmups, ...workingSetsOnly];
  return merged.map((s, i) => ({
    ...s,
    setNumber: i + 1,
    warmupLabel: s.isWarmup ? s.warmupLabel || `W${i + 1}` : undefined,
  }));
}
