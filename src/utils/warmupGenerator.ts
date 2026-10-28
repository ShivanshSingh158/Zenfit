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
}

const snap2_5 = (val: number) => Math.max(2.5, Math.round(val / 2.5) * 2.5);

export function generateWarmupLadder(
  workingWeightOrConfig: number | WarmupConfig,
  legacyBarTare = 20
): GymSet[] {
  let targetW = 40;
  let category: MovementCategory = 'STANDARD_COMPOUND';
  let priorSets = 0;
  let barTare = legacyBarTare;

  if (typeof workingWeightOrConfig === 'number') {
    targetW = Math.max(10, workingWeightOrConfig || 40);
  } else if (workingWeightOrConfig && typeof workingWeightOrConfig === 'object') {
    targetW = Math.max(10, workingWeightOrConfig.workingWeight || 40);
    barTare = workingWeightOrConfig.barTare ?? 20;
    priorSets = workingWeightOrConfig.priorSetsForMuscleGroup ?? 0;
    if (workingWeightOrConfig.category) {
      category = workingWeightOrConfig.category;
    } else if (workingWeightOrConfig.exerciseName) {
      const bio = resolveExerciseBiometrics(workingWeightOrConfig.exerciseName);
      category = bio.category;
    }
  }

  // ── 1. Check Prior Warmth: Acclimation set only if muscle is already warm ──
  if (priorSets >= 2) {
    const acclimationWeight = snap2_5(Math.max(barTare, targetW * 0.75));
    const safeW = Math.min(targetW - 2.5, acclimationWeight);
    return [
      {
        setNumber: 1,
        weight: safeW > 0 ? safeW : targetW,
        reps: 3,
        completed: false,
        isWarmup: true,
        warmupLabel: 'W1',
      },
    ];
  }

  // ── 2. Check Exercise Category: Isolations require 1 pump set max ───────────
  if (category === 'ISOLATION' || targetW <= 25) {
    const w1 = snap2_5(targetW * 0.6);
    const safeW1 = Math.min(targetW - 2.5, Math.max(2.5, w1));
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
  const isHeavyBarbell = category === 'HEAVY_COMPOUND' || targetW >= 60;
  const wBase = isHeavyBarbell ? Math.min(barTare, targetW * 0.5) : snap2_5(targetW * 0.35);
  const deltaW = Math.max(10, targetW - wBase);

  // Scale warmup sets count from 2 to 6 sets based on load delta:
  // 60kg Bench (deltaW = 40kg) -> 3 sets
  // 100kg Bench (deltaW = 80kg) -> 4 sets
  // 180kg Squat (deltaW = 160kg) -> 6 sets
  const numWarmupSets = Math.min(6, Math.max(2, Math.ceil(deltaW / 32.5) + 1));

  const warmupSets: GymSet[] = [];

  for (let k = 1; k <= numWarmupSets; k++) {
    // Neural potentiation curve: 0.85 exponent front-loads bigger jumps early
    const progress = (k - 1) / (numWarmupSets - 1);
    const pct = (wBase / targetW) + (0.88 - (wBase / targetW)) * Math.pow(progress, 0.85);

    const rawWeight = snap2_5(targetW * pct);
    const weight = Math.min(targetW - 2.5, Math.max(wBase, rawWeight));

    // Rep decay: 10 reps on empty bar down to 1-2 singles on top potentiation sets
    const reps = Math.max(1, Math.round(10 * Math.pow(1 - pct, 1.4)));

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
      weight: snap2_5(targetW * 0.5),
      reps: 8,
      completed: false,
      isWarmup: true,
      warmupLabel: 'W1',
    },
    {
      setNumber: 2,
      weight: snap2_5(targetW * 0.75),
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
  barTare = 20
): GymSet[] {
  // Filter out any existing warmups
  const workingSetsOnly = existingSets.filter(s => !s.isWarmup);

  const warmups = generateWarmupLadder(workingWeightOrConfig, barTare);

  // Renumber working sets sequentially starting from 1
  const reindexedWorkingSets = workingSetsOnly.map((s, i) => ({
    ...s,
    setNumber: i + 1,
    isWarmup: false,
    warmupLabel: undefined,
  }));

  return [...warmups, ...reindexedWorkingSets];
}
