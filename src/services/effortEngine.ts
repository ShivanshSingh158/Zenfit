/**
 * effortEngine.ts — ZenFit Biomechanical Effort & RIR Engine
 *
 * RIR (Reps in Reserve) & RPE (Rating of Perceived Exertion) Dual-Scale Engine:
 * - Rest-Interval Aware Automatic RIR Inference incorporating ATP-PCr Resynthesis Kinetics
 * - Real-time bidirectional conversion: RPE = 10 - RIR, RIR = 10 - RPE
 * - Hard Set classification (RIR <= 3 / RPE >= 7) for hypertrophic stimulus tracking
 * - Relative Intensity evaluation against rolling e1RM
 */

export const HARD_RIR_THRESHOLD = 3; // RIR <= 3 (RPE >= 7) drives muscle hypertrophy
export const MIN_RATED_SETS_FOR_AVG = 4;

export type EffortScale = 'rir' | 'rpe';

export interface SetLike {
  weight?: number | string | null;
  reps?: number | string | null;
  rir?: number | null;
  rpe?: number | null;
  restSeconds?: number | null;
  restTimeSecs?: number | null;
  isWarmup?: boolean;
  completed?: boolean;
  [key: string]: any;
}

/**
 * Normalizes effort input to RIR value (0 to 10)
 */
export function toRIR(value: number | null | undefined, scale: EffortScale = 'rir'): number | null {
  if (value === null || value === undefined) return null;
  if (scale === 'rpe') {
    return Math.max(0, Math.min(10, Math.round((10 - value) * 10) / 10));
  }
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10));
}

/**
 * Converts internal RIR to display scale value
 */
export function fromRIR(rir: number | null | undefined, scale: EffortScale = 'rir'): number | null {
  if (rir === null || rir === undefined) return null;
  if (scale === 'rpe') {
    return Math.max(6, Math.min(10, Math.round((10 - rir) * 10) / 10));
  }
  return Math.max(0, Math.min(10, Math.round(rir * 10) / 10));
}

/**
 * High-Precision Automatic RIR Inference Engine:
 * Incorporates Rest Time (delta t_rest) and ATP-PCr Resynthesis Kinetics.
 *
 * Evaluates:
 * 1. Explicit user RIR/RPE entry (highest priority)
 * 2. Rest Duration & ATP-PCr resynthesis factor: RecoveryFactor = 1 - e^(-rest/90)
 * 3. Expected Rep Decay vs Actual Rep Drop-Off
 * 4. Relative Load vs Rolling e1RM
 */
export function inferAutomaticRIR(
  currentSet: SetLike,
  exerciseSets?: SetLike[],
  historicalMax1RM?: number | null,
  restDurationSeconds?: number
): number {
  // 1. Manual user entry takes absolute priority if present
  if (currentSet.rir !== undefined && currentSet.rir !== null) {
    return Math.max(0, Math.min(10, Math.round(Number(currentSet.rir) * 10) / 10));
  }
  if (currentSet.rpe !== undefined && currentSet.rpe !== null) {
    return Math.max(0, Math.min(10, Math.round((10 - Number(currentSet.rpe)) * 10) / 10));
  }
  if (currentSet.isWarmup) {
    return 5;
  }

  const weight = Number(currentSet.weight) || 0;
  const reps = Number(currentSet.reps) || 0;

  if (reps <= 0) return 4;

  const validSets = (exerciseSets || []).filter(s => s.completed !== false && !s.isWarmup);
  const weights = validSets.map(s => Number(s.weight) || 0);
  const maxSessionWeight = Math.max(weight, ...weights);

  // Bodyweight-only exercise heuristic (e.g. pullups, pushups, dips with 0kg logged)
  if (maxSessionWeight <= 0) {
    if (reps >= 15) return 1;
    if (reps >= 10) return 2;
    if (reps >= 6) return 3;
    return 4;
  }

  const loadRatio = weight / maxSessionWeight;

  // Step 1: Base RIR from load ratio relative to session peak
  let rir = 2;
  if (loadRatio < 0.65) {
    rir = 5; // Warmup / Ramp-up feeder set
  } else if (loadRatio < 0.75) {
    rir = 4; // Light / sub-maximal preparation set
  } else if (loadRatio < 0.85) {
    rir = 3; // Moderate working volume
  } else if (loadRatio < 0.95) {
    rir = 2; // Heavy working set
  } else {
    rir = 1; // Top / Peak working set
  }

  // Step 2: Check intra-session set sequence, rest duration, and ATP-PCr kinetics
  const currentIdx = validSets.findIndex(s => s === currentSet);
  if (currentIdx > 0) {
    const prevSet = validSets[currentIdx - 1];
    const prevWeight = Number(prevSet.weight) || 0;
    const prevReps = Number(prevSet.reps) || 0;

    const restTime = Number(currentSet.restSeconds ?? currentSet.restTimeSecs ?? restDurationSeconds) || 90;
    // ATP-PCr resynthesis: tau ~ 90s (half life 30-45s, complete neural recovery ~ 180s)
    const recoveryFactor = 1 - Math.exp(-restTime / 90);
    const expectedDrop = prevReps * 0.28 * (1 - 0.75 * recoveryFactor);
    const actualDrop = prevReps - reps;

    if (weight >= prevWeight * 0.95) {
      if (restTime >= 180 && actualDrop <= 0) {
        // Full ATP-PCr recovery with long rest: lifter maintained reps due to adequate rest
        if (historicalMax1RM && historicalMax1RM > 0) {
          // Infer from relative intensity via modified Brzycki:
          const relRir = Math.max(0, Math.round(37 - (36 * weight) / historicalMax1RM - reps));
          rir = Math.min(rir, relRir);
        } else {
          // Default heavy set at complete rest is working RIR 1-2, never junk volume
          rir = Math.min(rir, 2);
        }
      } else if (actualDrop >= expectedDrop + 1) {
        // Crossed true metabolic failure threshold
        rir = Math.max(0, rir - 2);
      } else if (actualDrop >= 1) {
        rir = Math.max(0, rir - 1);
      }
    }
  }

  // Step 3: Final set rule (if last set of the exercise at working weight)
  const isLastSet = currentIdx === validSets.length - 1 && validSets.length >= 2;
  if (isLastSet && loadRatio >= 0.80) {
    rir = Math.min(rir, 1);
  }

  // Step 4: High-rep burnout (>= 15 reps at >= 70% load)
  if (reps >= 15 && loadRatio >= 0.70) {
    rir = Math.min(rir, 1);
  }

  // Step 5: Heavy grinder (<= 4 reps at >= 98% top weight)
  if (reps <= 4 && loadRatio >= 0.98 && reps >= 1) {
    rir = Math.min(rir, 1);
  }

  return Math.max(0, Math.min(10, rir));
}

/**
 * Checks if a set is a true Hard Working Set driving muscle hypertrophy
 */
export function isHardSet(
  setOrRir: SetLike | number | null | undefined,
  exerciseSets?: SetLike[],
  scale: EffortScale = 'rir',
  historicalMax1RM?: number | null,
  restDurationSeconds?: number
): boolean {
  if (typeof setOrRir === 'number') {
    const rir = toRIR(setOrRir, scale);
    return rir !== null && rir <= HARD_RIR_THRESHOLD;
  }
  if (setOrRir && typeof setOrRir === 'object') {
    const rir = inferAutomaticRIR(setOrRir, exerciseSets, historicalMax1RM, restDurationSeconds);
    return rir <= HARD_RIR_THRESHOLD;
  }
  return true;
}

/**
 * Calculates Effort Distribution (Hard Sets vs Junk/Warmup sets)
 */
export function calculateEffortDistribution(sets: SetLike[]): {
  hardSets: number;
  submaximalSets: number;
  averageRIR: number | null;
  hypertrophicStimulusScore: number; // 0 to 100
} {
  const valid = (sets || []).filter(s => s.completed !== false && !s.isWarmup);
  if (!valid.length) {
    return { hardSets: 0, submaximalSets: 0, averageRIR: null, hypertrophicStimulusScore: 0 };
  }

  let hardSets = 0;
  let submaximalSets = 0;
  let totalRir = 0;

  for (const s of valid) {
    const rir = inferAutomaticRIR(s, valid);
    totalRir += rir;
    if (rir <= HARD_RIR_THRESHOLD) {
      hardSets++;
    } else {
      submaximalSets++;
    }
  }

  const avgRir = Math.round((totalRir / valid.length) * 10) / 10;
  // Hypertrophic stimulus score scales with density of sets <= 2 RIR
  const stimulusRatio = hardSets / valid.length;
  const rirQuality = Math.max(0, 1 - avgRir / 4);
  const score = Math.round((stimulusRatio * 0.6 + rirQuality * 0.4) * 100);

  return {
    hardSets,
    submaximalSets,
    averageRIR: avgRir,
    hypertrophicStimulusScore: Math.min(100, Math.max(0, score)),
  };
}

/**
 * Calculates High-Level Effort Summary for Cards and Dashboards
 */
export function calculateEffortSummary(sets: SetLike[]): {
  totalSets: number;
  hardSets: number;
  submaximalSets: number;
  hardSetPercentage: number;
  averageRIR: number | null;
  averageRPE: number | null;
  hypertrophicStimulusScore: number;
} {
  const dist = calculateEffortDistribution(sets);
  const total = (sets || []).filter(s => s.completed !== false && !s.isWarmup).length;
  const hardPct = total > 0 ? Math.round((dist.hardSets / total) * 100) : 0;
  const avgRpe = dist.averageRIR !== null ? Math.round((10 - dist.averageRIR) * 10) / 10 : null;

  return {
    totalSets: total,
    hardSets: dist.hardSets,
    submaximalSets: dist.submaximalSets,
    hardSetPercentage: hardPct,
    averageRIR: dist.averageRIR,
    averageRPE: avgRpe,
    hypertrophicStimulusScore: dist.hypertrophicStimulusScore,
  };
}
