/**
 * athleteCardService.ts — ZenFit
 *
 * Data engine for the Athlete Profile Card:
 * Analyzes lifter history, workout logs, bodyweight, height, and exercise database
 * to compute strength-to-weight ratios, consistency stats, lifter archetype, and tier rank.
 */

import { GymDayLog, GymProfile } from '../types/gym.types';
import { calculate1RM } from '../utils/progressiveOverload';
import { calculateGymStreak, calculateHighestGymStreak, resolveExerciseTargetMuscle } from '../utils/gymUtils';

export type LifterTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'elite';
export type LifterArchetype =
  | 'Powerbuilder'
  | 'Hypertrophy Specialist'
  | 'Strength Specialist'
  | 'Consistent Grinder'
  | 'Iron Rookie';

export interface StrengthBenchmark {
  exerciseName: string;
  category: 'Bench' | 'Squat' | 'Deadlift' | 'OHP';
  categoryLabel: string;
  iconName: 'barbell' | 'body' | 'fitness' | 'trending-up';
  maxWeightKg: number;
  est1RMKg: number;
  bwRatio: number; // e.g. 1.35x
  level: 'Novice' | 'Intermediate' | 'Advanced' | 'Elite';
  progressPct: number; // 0 - 100 towards Elite
  nextMilestoneKg: number;
  nextTierName: string;
  kgToNextTier: number;
  hasHistory: boolean;
}

export interface AthleteCardStats {
  hasPhysicalStats: boolean;
  displayName: string;
  photoURL: string | null;
  heightCm: number;
  heightFormatted: string; // e.g. "180 cm (5'11\")"
  weightKg: number;
  weightFormatted: string; // e.g. "78 kg (172 lbs)"
  bmi: number;
  bmiClassification: string; // e.g. "Athletic / Lean"
  goalLabel: string;

  // Consistency & Grind
  streakDays: number;
  highestStreakDays: number;
  totalWorkouts: number;
  weeklyFrequency: number;
  totalLifetimeVolumeKg: number;
  totalLifetimeVolumeFormatted: string; // e.g. "142.5k kg"
  consistencyScorePct: number; // 0 - 100

  // Strength Ratios
  tier: LifterTier;
  tierLabel: string; // e.g. "DIAMOND TIER"
  archetype: LifterArchetype;
  benchmarks: StrengthBenchmark[];
  overallStrengthScore: number; // 0 - 100

  // Signatures
  signatureExercise: string;
  topMuscleGroup: string;
}

// ── Standard Strength-to-Bodyweight Standards ─────────────────────────────────
const STRENGTH_STANDARDS = {
  Bench:    { novice: 0.8, intermediate: 1.15, advanced: 1.45, elite: 1.75 },
  Squat:    { novice: 1.1, intermediate: 1.50, advanced: 1.90, elite: 2.25 },
  Deadlift: { novice: 1.3, intermediate: 1.75, advanced: 2.15, elite: 2.60 },
  OHP:      { novice: 0.5, intermediate: 0.70, advanced: 0.90, elite: 1.10 },
};

function formatHeight(cm: number): string {
  if (!cm || cm <= 0) return '—';
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${Math.round(cm)} cm (${feet}'${inches}")`;
}

function formatWeight(kg: number): string {
  if (!kg || kg <= 0) return '—';
  const lbs = Math.round(kg * 2.20462);
  return `${Math.round(kg * 10) / 10} kg (${lbs} lbs)`;
}

function getBmiStatus(bmi: number): string {
  if (bmi <= 0) return '—';
  if (bmi < 18.5) return 'Lean';
  if (bmi < 24.9) return 'Athletic';
  if (bmi < 29.9) return 'Solid Mass';
  return 'Heavy Mass';
}

function getStrengthLevel(
  category: 'Bench' | 'Squat' | 'Deadlift' | 'OHP',
  ratio: number,
  bodyweightKg: number,
  currentEst1RM: number
): {
  level: 'Novice' | 'Intermediate' | 'Advanced' | 'Elite';
  progressPct: number;
  nextMilestoneKg: number;
  nextTierName: string;
  kgToNextTier: number;
} {
  const std = STRENGTH_STANDARDS[category];
  const bw = bodyweightKg > 0 ? bodyweightKg : 75;

  if (ratio >= std.elite) {
    return {
      level: 'Elite',
      progressPct: 100,
      nextMilestoneKg: Math.round(std.elite * bw),
      nextTierName: 'Mastery',
      kgToNextTier: 0,
    };
  }
  if (ratio >= std.advanced) {
    const range = std.elite - std.advanced;
    const progress = 75 + Math.min(25, ((ratio - std.advanced) / range) * 25);
    const nextKg = Math.round(std.elite * bw);
    return {
      level: 'Advanced',
      progressPct: Math.round(progress),
      nextMilestoneKg: nextKg,
      nextTierName: 'Elite',
      kgToNextTier: Math.max(0, nextKg - currentEst1RM),
    };
  }
  if (ratio >= std.intermediate) {
    const range = std.advanced - std.intermediate;
    const progress = 45 + Math.min(30, ((ratio - std.intermediate) / range) * 30);
    const nextKg = Math.round(std.advanced * bw);
    return {
      level: 'Intermediate',
      progressPct: Math.round(progress),
      nextMilestoneKg: nextKg,
      nextTierName: 'Advanced',
      kgToNextTier: Math.max(0, nextKg - currentEst1RM),
    };
  }
  const progress = Math.min(45, (ratio / std.intermediate) * 45);
  const nextKg = Math.round(std.intermediate * bw);
  return {
    level: 'Novice',
    progressPct: Math.round(progress),
    nextMilestoneKg: nextKg,
    nextTierName: 'Intermediate',
    kgToNextTier: Math.max(0, nextKg - currentEst1RM),
  };
}

/**
 * Computes full Athlete Profile Card stats from profile and workout history.
 */
export function computeAthleteCardStats(
  profile: GymProfile | null | undefined,
  logs: GymDayLog[] = [],
  userAuth?: { displayName?: string | null; photoURL?: string | null; email?: string | null },
  latestTrackedWeightKg?: number | null,
  userGymPlan?: any | null
): AthleteCardStats {
  const heightCm = profile?.heightCm || 0;
  // Prioritize live latest tracked weight from Weight Tracking section
  const weightKg =
    (latestTrackedWeightKg && latestTrackedWeightKg > 0)
      ? latestTrackedWeightKg
      : profile?.weightKg || profile?.bodyweightKg || 0;
  const hasPhysicalStats = heightCm > 0 && weightKg > 0;

  // Name & Avatar (Prioritize Google auth then profile)
  const displayName =
    userAuth?.displayName?.trim() ||
    profile?.displayName?.trim() ||
    (userAuth?.email ? userAuth.email.split('@')[0] : 'Athlete');
  const photoURL = userAuth?.photoURL || profile?.photoURL || null;

  // BMI calculation
  const heightM = heightCm / 100;
  const bmi = heightM > 0 && weightKg > 0 ? Math.round((weightKg / (heightM * heightM)) * 10) / 10 : 0;
  const bmiClassification = getBmiStatus(bmi);

  // Goal Label
  const rawGoal = profile?.goal || profile?.primaryGoal || 'hypertrophy';
  const goalMap: Record<string, string> = {
    hypertrophy: 'Hypertrophy & Growth',
    strength: 'Maximum Strength',
    fat_loss: 'Fat Loss & Conditioning',
    athletic: 'Athletic Performance',
    recomp: 'Body Recomposition',
  };
  const goalLabel = goalMap[rawGoal] || 'General Fitness';

  // 1. Consistency & Workouts
  const totalWorkouts = logs.filter((l) => l.completed).length;
  let totalLifetimeVolumeKg = 0;
  const exerciseMaxes: Record<string, { maxWeight: number; est1RM: number; count: number }> = {};
  const exerciseSetCounts: Record<string, number> = {};

  // Sort logs chronological
  const sortedLogs = [...logs].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // Calculate streaks using canonical gymUtils engine
  const streakDays = calculateGymStreak(logs, userGymPlan);
  const highestStreakDays = calculateHighestGymStreak(logs, userGymPlan);

  // Aggregate set weights & 1RMs
  logs.forEach((dayLog) => {
    (dayLog.exercises || []).forEach((ex) => {
      const name = ex.name || (ex as any).exerciseName || '';
      if (!name) return;

      const sets = ex.setsLog || (ex as any).sets || [];
      exerciseSetCounts[name] = (exerciseSetCounts[name] || 0) + sets.length;

      sets.forEach((s: any) => {
        if (!s.completed && s.completed !== undefined) return;
        const w = Number(s.weight) || 0;
        const r = Number(s.reps) || 0;
        if (w > 0 && r > 0) {
          totalLifetimeVolumeKg += w * r;
          const oneRM = calculate1RM(w, r);

          if (!exerciseMaxes[name]) {
            exerciseMaxes[name] = { maxWeight: w, est1RM: oneRM, count: 1 };
          } else {
            exerciseMaxes[name].maxWeight = Math.max(exerciseMaxes[name].maxWeight, w);
            exerciseMaxes[name].est1RM = Math.max(exerciseMaxes[name].est1RM, oneRM);
            exerciseMaxes[name].count += 1;
          }
        }
      });
    });
  });

  // Format Tonnage
  const totalLifetimeVolumeFormatted =
    totalLifetimeVolumeKg >= 1000000
      ? `${(totalLifetimeVolumeKg / 1000000).toFixed(1)}M kg`
      : totalLifetimeVolumeKg >= 1000
      ? `${Math.round(totalLifetimeVolumeKg / 1000).toLocaleString()}k kg`
      : `${Math.round(totalLifetimeVolumeKg)} kg`;

  // Weekly frequency
  const firstLogDate = sortedLogs[0]?.date ? new Date(sortedLogs[0].date).getTime() : Date.now();
  const weeksDiff = Math.max(1, (Date.now() - firstLogDate) / (1000 * 60 * 60 * 24 * 7));
  const weeklyFrequency = Math.round((totalWorkouts / weeksDiff) * 10) / 10;
  const consistencyScorePct = Math.min(100, Math.round((weeklyFrequency / 4.0) * 100));

  // 2. Intelligent Dynamic Lifts Identification (Prioritizes Athlete's Real Tracked PRs)
  const findBestLift = (
    keywords: string[],
    muscleCategories: string[],
    fallbackPlanExercise?: string
  ): { name: string; maxWeight: number; est1RM: number } => {
    let best = { name: '', maxWeight: 0, est1RM: 0 };

    // 1. Check logged exercises where the athlete has actual tracked weight/reps
    Object.keys(exerciseMaxes).forEach((name) => {
      const lower = name.toLowerCase();
      const matchKeyword = keywords.some((k) => lower.includes(k));
      const targetM = (resolveExerciseTargetMuscle(name).targetMuscle || '').toLowerCase();
      const matchMuscle = muscleCategories.some((m) => targetM.includes(m.toLowerCase()));

      if (matchKeyword || matchMuscle) {
        const item = exerciseMaxes[name];
        if (item.est1RM > best.est1RM || (best.est1RM === 0 && item.maxWeight > best.maxWeight)) {
          best = { name, maxWeight: item.maxWeight, est1RM: item.est1RM };
        }
      }
    });

    // 2. If nothing logged yet, pull the primary exercise from the athlete's active plan
    if (!best.name && userGymPlan) {
      const planDays = Object.values(userGymPlan.customDays || {}) as any[];
      for (const day of planDays) {
        for (const ex of day.exercises || []) {
          const exName = ex.name || '';
          const lower = exName.toLowerCase();
          const matchKeyword = keywords.some((k) => lower.includes(k));
          const targetM = (resolveExerciseTargetMuscle(exName, ex.muscle).targetMuscle || '').toLowerCase();
          const matchMuscle = muscleCategories.some((m) => targetM.includes(m.toLowerCase()));
          if (matchKeyword || matchMuscle) {
            best = { name: exName, maxWeight: 0, est1RM: 0 };
            return best;
          }
        }
      }
    }

    // 3. Fallback to recommended key exercise
    if (!best.name && fallbackPlanExercise) {
      best = { name: fallbackPlanExercise, maxWeight: 0, est1RM: 0 };
    }

    return best;
  };

  // Find best lifts with broad, inclusive keyword and muscle matching (e.g. flyes, dumbbells, cables, presses)
  const benchLift = findBestLift(
    ['bench', 'chest', 'fly', 'press', 'push', 'pec'],
    ['chest', 'pectoral'],
    'Incline Bench Press (Dumbbell)'
  );
  const squatLift = findBestLift(
    ['squat', 'hack', 'leg press', 'extension', 'quad', 'lunge'],
    ['quad', 'leg', 'glute'],
    'Hack Squat (Machine)'
  );
  const deadLift = findBestLift(
    ['deadlift', 'rdl', 'romanian', 'lat', 'pulldown', 'row', 'pull'],
    ['back', 'lat', 'hamstring'],
    'Lat Pulldown (Cable)'
  );
  const ohpLift = findBestLift(
    ['shoulder', 'overhead', 'military', 'raise', 'delt', 'curl', 'tricep', 'arm'],
    ['shoulder', 'delt', 'arm', 'bicep', 'tricep'],
    'Lateral Raise (Cable)'
  );

  const refWeight = weightKg > 0 ? weightKg : 75; // fallback standard

  const buildBenchmark = (
    category: 'Bench' | 'Squat' | 'Deadlift' | 'OHP',
    categoryLabel: string,
    iconName: 'barbell' | 'body' | 'fitness' | 'trending-up',
    lift: { name: string; maxWeight: number; est1RM: number },
    defaultName: string
  ): StrengthBenchmark => {
    const est1RMKg = Math.round(lift.est1RM);
    const maxWeightKg = Math.round(lift.maxWeight);
    const bwRatio = Math.round((est1RMKg / refWeight) * 100) / 100;
    const { level, progressPct, nextMilestoneKg, nextTierName, kgToNextTier } = getStrengthLevel(
      category,
      bwRatio,
      refWeight,
      est1RMKg
    );

    return {
      category,
      categoryLabel,
      iconName,
      exerciseName: lift.name || defaultName,
      maxWeightKg,
      est1RMKg,
      bwRatio,
      level,
      progressPct,
      nextMilestoneKg,
      nextTierName,
      kgToNextTier,
      hasHistory: est1RMKg > 0,
    };
  };

  const benchmarks: StrengthBenchmark[] = [
    buildBenchmark('Bench', 'CHEST & PRESS', 'barbell', benchLift, 'Incline Bench Press (Dumbbell)'),
    buildBenchmark('Squat', 'LEGS & SQUAT', 'body', squatLift, 'Hack Squat (Machine)'),
    buildBenchmark('Deadlift', 'BACK & PULL', 'fitness', deadLift, 'Lat Pulldown (Cable)'),
    buildBenchmark('OHP', 'DELTS & ARMS', 'trending-up', ohpLift, 'Lateral Raise (Cable)'),
  ];

  // 3. Overall Strength Score (0 - 100)
  const avgProgress = Math.round(
    benchmarks.reduce((acc, b) => acc + b.progressPct, 0) / benchmarks.length
  );
  const overallStrengthScore = avgProgress;

  // 4. Lifter Tier Rank
  let tier: LifterTier = 'bronze';
  let tierLabel = 'BRONZE TIER';

  if (overallStrengthScore >= 90 && totalWorkouts >= 30) {
    tier = 'elite';
    tierLabel = '👑 ELITE TIER';
  } else if (overallStrengthScore >= 75 && totalWorkouts >= 20) {
    tier = 'diamond';
    tierLabel = '💎 DIAMOND TIER';
  } else if (overallStrengthScore >= 60 && totalWorkouts >= 12) {
    tier = 'platinum';
    tierLabel = '⚡ PLATINUM TIER';
  } else if (overallStrengthScore >= 45 || totalWorkouts >= 8) {
    tier = 'gold';
    tierLabel = '🥇 GOLD TIER';
  } else if (totalWorkouts >= 3) {
    tier = 'silver';
    tierLabel = '🥈 SILVER TIER';
  }

  // 5. Lifter Archetype
  let archetype: LifterArchetype = 'Iron Rookie';
  if (totalWorkouts >= 5) {
    if (benchmarks[0].bwRatio >= 1.25 && benchmarks[1].bwRatio >= 1.6) {
      archetype = 'Powerbuilder';
    } else if (weeklyFrequency >= 4.0 && consistencyScorePct >= 85) {
      archetype = 'Consistent Grinder';
    } else if (rawGoal === 'hypertrophy' || totalLifetimeVolumeKg >= 50000) {
      archetype = 'Hypertrophy Specialist';
    } else {
      archetype = 'Strength Specialist';
    }
  }

  // 6. Signatures (Favorite Exercise & Top Muscle)
  let signatureExercise = 'Barbell Bench Press';
  let maxSets = 0;
  Object.keys(exerciseSetCounts).forEach((name) => {
    if (exerciseSetCounts[name] > maxSets) {
      maxSets = exerciseSetCounts[name];
      signatureExercise = name;
    }
  });

  const topMuscleGroup = benchmarks[0].bwRatio > benchmarks[1].bwRatio ? 'Chest & Triceps' : 'Quads & Glutes';

  return {
    hasPhysicalStats,
    displayName,
    photoURL,
    heightCm,
    heightFormatted: formatHeight(heightCm),
    weightKg,
    weightFormatted: formatWeight(weightKg),
    bmi,
    bmiClassification,
    goalLabel,
    streakDays,
    highestStreakDays,
    totalWorkouts,
    weeklyFrequency,
    totalLifetimeVolumeKg,
    totalLifetimeVolumeFormatted,
    consistencyScorePct,
    tier,
    tierLabel,
    archetype,
    benchmarks,
    overallStrengthScore,
    signatureExercise,
    topMuscleGroup,
  };
}
