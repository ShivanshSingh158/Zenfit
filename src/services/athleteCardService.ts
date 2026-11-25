/**
 * athleteCardService.ts — ZenFit
 *
 * Data engine for the Athlete Performance Card:
 * Analyzes real workout logs, bodyweight, height, and goal to compute
 * verified strength ratios, consistency streaks, muscle focus distribution,
 * archetype, and tier rank without static or fabricated placeholders.
 */

import { GymDayLog, GymProfile } from '../types/gym.types';
import { estimate1RM } from './oneRepMaxEngine';
import { formatVolumeParts, getUnitIsLbsSync } from '../utils/weightUnit';
import { computeOrGetHotCache, generateDatasetFingerprint } from '../utils/hotCacheStore';
import { parseLocalDate } from '../utils/dateCore';
import {
  calculateGymStreak,
  calculateHighestGymStreak,
  resolveExerciseTargetMuscle,
  getVolumeMultiplier,
} from '../utils/gymUtils';

export type LifterTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'elite';
export type LifterArchetype =
  | 'Powerbuilder'
  | 'Hypertrophy Specialist'
  | 'Strength Specialist'
  | 'Consistent Grinder'
  | 'Iron Rookie';

export interface MuscleDistributionItem {
  group: string;
  sets: number;
  pct: number;
}

export interface StrengthBenchmark {
  exerciseName: string;
  category: 'Bench' | 'Squat' | 'Deadlift' | 'OHP';
  categoryLabel: string;
  iconName: 'barbell' | 'body' | 'fitness' | 'trending-up';
  maxWeightKg: number;
  est1RMKg: number;
  bwRatio: number;
  isCompoundStandard: boolean;
  level: 'Novice' | 'Intermediate' | 'Advanced' | 'Elite';
  progressPct: number;
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
  heightFormatted: string;
  weightKg: number;
  weightFormatted: string;
  bmi: number;
  bmiClassification: string;
  goalLabel: string;

  // Consistency & Output
  streakDays: number;
  highestStreakDays: number;
  totalWorkouts: number;
  totalWorkingSets: number;
  totalPRCount: number;
  weeklyFrequency: number;
  totalLifetimeVolumeKg: number;
  totalLifetimeVolumeFormatted: string;
  consistencyScorePct: number;

  // Strength & Tier
  tier: LifterTier;
  tierLabel: string;
  tierNextName: string | null;
  tierProgressPct: number;
  tierRequirementText: string;
  archetype: LifterArchetype;
  benchmarks: StrengthBenchmark[];
  overallStrengthScore: number;

  // Signatures & Distribution
  signatureExercise: string;
  topMuscleGroup: string;
  muscleDistribution: MuscleDistributionItem[];
}

const STRENGTH_STANDARDS = {
  Bench:    { novice: 0.8, intermediate: 1.15, advanced: 1.45, elite: 1.75 },
  Squat:    { novice: 1.1, intermediate: 1.50, advanced: 1.90, elite: 2.25 },
  Deadlift: { novice: 1.3, intermediate: 1.75, advanced: 2.15, elite: 2.60 },
  OHP:      { novice: 0.5, intermediate: 0.70, advanced: 0.90, elite: 1.10 },
};

const COMPOUND_KEYWORDS: Record<'Bench' | 'Squat' | 'Deadlift' | 'OHP', string[]> = {
  Bench: ['bench press', 'chest press', 'floor press', 'dip'],
  Squat: ['squat', 'hack squat', 'leg press'],
  Deadlift: ['deadlift', 'rdl', 'romanian', 'rack pull', 'good morning'],
  OHP: ['overhead press', 'military press', 'shoulder press', 'arnold press', 'push press'],
};

const MUSCLE_PRETTY_PAIRS: Record<string, string> = {
  Chest: 'Chest & Push',
  Back: 'Back & Lats',
  Shoulders: 'Shoulders & Delts',
  Quads: 'Quads & Legs',
  Hamstrings: 'Hamstrings & Hinge',
  Glutes: 'Glutes & Lower',
  Biceps: 'Biceps & Pull',
  Triceps: 'Triceps & Arms',
  Calves: 'Calves & Lower',
  Abs: 'Core & Abs',
};

function formatHeight(cm: number): string {
  if (!cm || cm <= 0) return '—';
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches % 12);
  let adjFeet = feet;
  if (inches === 12) {
    adjFeet += 1;
    inches = 0;
  }
  return `${Math.round(cm)} cm (${adjFeet}'${inches}")`;
}

function formatWeight(kg: number): string {
  if (!kg || kg <= 0) return '—';
  const lbs = Math.round(kg * 2.20462);
  return `${Math.round(kg * 10) / 10} kg (${lbs} lbs)`;
}

function getBmiStatus(bmi: number): string {
  if (bmi <= 0) return '—';
  if (bmi < 18.5) return 'Lean';
  if (bmi < 25) return 'Athletic';
  if (bmi < 30) return 'Solid Mass';
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

  if (currentEst1RM <= 0 || ratio <= 0) {
    const nextKg = Math.round(std.intermediate * bw);
    return {
      level: 'Novice',
      progressPct: 0,
      nextMilestoneKg: nextKg,
      nextTierName: 'Intermediate',
      kgToNextTier: nextKg,
    };
  }

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

export function computeAthleteCardStats(
  profile: GymProfile | null | undefined,
  logs: GymDayLog[] = [],
  userAuth?: { uid?: string | null; displayName?: string | null; photoURL?: string | null; email?: string | null },
  latestTrackedWeightKg?: number | null,
  userGymPlan?: any | null
): AthleteCardStats {
  const profileKey = `${profile?.displayName || ''}_${profile?.weightKg || 0}_${profile?.heightCm || 0}_${profile?.goal || ''}`;
  const cacheKey = `athlete_card_${profileKey}_${generateDatasetFingerprint(logs)}`;
  return computeOrGetHotCache(cacheKey, () => {
  const heightCm = profile?.heightCm || 0;
  const weightKg =
    latestTrackedWeightKg && latestTrackedWeightKg > 0
      ? latestTrackedWeightKg
      : profile?.weightKg || profile?.bodyweightKg || 0;
  const hasPhysicalStats = heightCm > 0 && weightKg > 0;

  const displayName =
    profile?.displayName?.trim() ||
    userAuth?.displayName?.trim() ||
    (userAuth?.email ? userAuth.email.split('@')[0] : 'Athlete');
  const photoURL = userAuth?.photoURL || profile?.photoURL || null;

  const heightM = heightCm / 100;
  const bmi = heightM > 0 && weightKg > 0 ? Math.round((weightKg / (heightM * heightM)) * 10) / 10 : 0;
  const bmiClassification = getBmiStatus(bmi);

  const rawGoal = profile?.goal || profile?.primaryGoal || 'hypertrophy';
  const goalMap: Record<string, string> = {
    hypertrophy: 'Hypertrophy',
    strength: 'Strength',
    fat_loss: 'Fat Loss',
    athletic: 'Athletic',
    recomp: 'Recomposition',
  };
  const goalLabel = goalMap[rawGoal] || 'General';

  const totalWorkouts = logs.filter((l) => l.completed).length;
  let totalLifetimeVolumeKg = 0;
  let totalWorkingSets = 0;

  const exerciseMaxes: Record<string, { maxWeight: number; est1RM: number; count: number; muscle?: string }> = {};
  const exerciseSetCounts: Record<string, number> = {};
  const muscleSetCounts: Record<string, number> = {};

  const sortedLogs = [...logs].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const streakDays = calculateGymStreak(logs, userGymPlan);
  const highestStreakDays = calculateHighestGymStreak(logs, userGymPlan);

  logs.forEach((dayLog) => {
    (dayLog.exercises || []).forEach((ex) => {
      const name = (ex.name || (ex as any).exerciseName || '').trim();
      if (!name) return;

      const sets = ex.setsLog || (ex as any).sets || [];
      const canonical = resolveExerciseTargetMuscle(name, ex.muscle).canonicalGroup || 'Other';

      let loggedSetsInEx = 0;
      sets.forEach((s: any) => {
        if (!s.completed && s.completed !== undefined) return;
        if (s.isWarmup) return;
        loggedSetsInEx += 1;

        const w = Number(s.weight) || 0;
        const r = Number(s.reps) || 0;
        if (w > 0 && r > 0) {
          const mult = getVolumeMultiplier(name);
          totalLifetimeVolumeKg += w * r * mult;
          const oneRM = estimate1RM(w, r, 'hybrid', s.rir ?? 0);

          if (!exerciseMaxes[name]) {
            exerciseMaxes[name] = { maxWeight: w, est1RM: oneRM, count: 1, muscle: ex.muscle };
          } else {
            exerciseMaxes[name].maxWeight = Math.max(exerciseMaxes[name].maxWeight, w);
            exerciseMaxes[name].est1RM = Math.max(exerciseMaxes[name].est1RM, oneRM);
            exerciseMaxes[name].count += 1;
          }
        }
      });

      if (loggedSetsInEx > 0) {
        totalWorkingSets += loggedSetsInEx;
        exerciseSetCounts[name] = (exerciseSetCounts[name] || 0) + loggedSetsInEx;
        if (canonical !== 'Mixed' && canonical !== 'Other') {
          muscleSetCounts[canonical] = (muscleSetCounts[canonical] || 0) + loggedSetsInEx;
        }
      }
    });
  });

  const totalPRCount = Object.keys(exerciseMaxes).length;

  const totalLifetimeVolumeFormatted = formatVolumeParts(
    totalLifetimeVolumeKg,
    getUnitIsLbsSync()
  ).full;

  const firstLogDate = sortedLogs[0]?.date ? parseLocalDate(sortedLogs[0].date).getTime() : Date.now();
  const weeksDiff = Math.max(1, (Date.now() - firstLogDate) / (1000 * 60 * 60 * 24 * 7));
  const weeklyFrequency = Math.round((totalWorkouts / weeksDiff) * 10) / 10;
  const consistencyScorePct = Math.min(100, Math.round((weeklyFrequency / 4.0) * 100));

  const muscleDistribution: MuscleDistributionItem[] = Object.entries(muscleSetCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([group, sets]) => ({
      group,
      sets,
      pct: totalWorkingSets > 0 ? Math.round((sets / totalWorkingSets) * 100) : 0,
    }));

  // Cached target muscle resolution to avoid repetitive lookups
  const muscleResMap = new Map<string, { targetMuscle: string; canonicalGroup: string }>();
  const getCachedMuscleRes = (liftName: string, expMuscle?: string | null) => {
    let cached = muscleResMap.get(liftName);
    if (!cached) {
      cached = resolveExerciseTargetMuscle(liftName, expMuscle);
      muscleResMap.set(liftName, cached);
    }
    return cached;
  };

  const findBestLoggedLift = (
    category: 'Bench' | 'Squat' | 'Deadlift' | 'OHP',
    keywords: string[],
    muscleCategories: string[]
  ): { name: string; maxWeight: number; est1RM: number; isCompoundStandard: boolean } => {
    let best = { name: '', maxWeight: 0, est1RM: 0, isCompoundStandard: false };

    Object.keys(exerciseMaxes).forEach((name) => {
      const lower = name.toLowerCase();
      const item = exerciseMaxes[name];
      const matchKeyword = keywords.some((k) => lower.includes(k));
      const res = getCachedMuscleRes(name, item.muscle);
      const targetM = (res.targetMuscle || '').toLowerCase();
      const canonical = (res.canonicalGroup || '').toLowerCase();
      const matchMuscle = muscleCategories.some((m) => targetM.includes(m) || canonical.includes(m));

      if (matchKeyword || matchMuscle) {
        const isCompound = COMPOUND_KEYWORDS[category].some((ck) => lower.includes(ck));
        const candidateScore = item.est1RM * (isCompound ? 1.15 : 1);
        const currentScore = best.est1RM * (best.isCompoundStandard ? 1.15 : 1);
        if (candidateScore > currentScore || (best.est1RM === 0 && item.maxWeight > best.maxWeight)) {
          best = {
            name,
            maxWeight: item.maxWeight,
            est1RM: item.est1RM,
            isCompoundStandard: isCompound,
          };
        }
      }
    });

    return best;
  };

  const benchLift = findBestLoggedLift(
    'Bench',
    ['bench', 'chest', 'fly', 'pec', 'dip'],
    ['chest', 'pectoral']
  );
  const squatLift = findBestLoggedLift(
    'Squat',
    ['squat', 'hack', 'leg press', 'lunge', 'extension'],
    ['quad', 'leg', 'glute']
  );
  const deadLift = findBestLoggedLift(
    'Deadlift',
    ['deadlift', 'rdl', 'romanian', 'pulldown', 'row', 'pull-up', 'chin'],
    ['back', 'lat', 'hamstring']
  );
  const ohpLift = findBestLoggedLift(
    'OHP',
    ['overhead', 'military', 'shoulder press', 'arnold', 'raise', 'delt', 'curl', 'tricep'],
    ['shoulder', 'delt', 'bicep', 'tricep']
  );

  const refWeight = weightKg > 0 ? weightKg : 75;

  const buildBenchmark = (
    category: 'Bench' | 'Squat' | 'Deadlift' | 'OHP',
    categoryLabel: string,
    iconName: 'barbell' | 'body' | 'fitness' | 'trending-up',
    lift: { name: string; maxWeight: number; est1RM: number; isCompoundStandard: boolean }
  ): StrengthBenchmark => {
    const est1RMKg = Math.round(lift.est1RM);
    const maxWeightKg = Math.round(lift.maxWeight);
    const hasHistory = est1RMKg > 0 && Boolean(lift.name);
    const bwRatio = hasHistory ? Math.round((est1RMKg / refWeight) * 100) / 100 : 0;
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
      exerciseName: lift.name || categoryLabel,
      maxWeightKg,
      est1RMKg,
      bwRatio,
      isCompoundStandard: lift.isCompoundStandard,
      level,
      progressPct,
      nextMilestoneKg,
      nextTierName,
      kgToNextTier,
      hasHistory,
    };
  };

  const benchmarks: StrengthBenchmark[] = [
    buildBenchmark('Bench', 'Chest & Press', 'barbell', benchLift),
    buildBenchmark('Squat', 'Legs & Squat', 'body', squatLift),
    buildBenchmark('Deadlift', 'Back & Hinge', 'fitness', deadLift),
    buildBenchmark('OHP', 'Shoulders & Arms', 'trending-up', ohpLift),
  ];

  const trackedBenchmarks = benchmarks.filter((b) => b.hasHistory);
  const overallStrengthScore =
    trackedBenchmarks.length > 0
      ? Math.round(benchmarks.reduce((acc, b) => acc + b.progressPct, 0) / benchmarks.length)
      : 0;

  // Tier Rank + Progress to Next Tier
  let tier: LifterTier = 'bronze';
  let tierLabel = 'BRONZE';
  let tierNextName: string | null = 'Silver';
  let tierProgressPct = Math.min(100, Math.round((totalWorkouts / 3) * 100));
  let tierRequirementText = `${Math.max(0, 3 - totalWorkouts)} more session${3 - totalWorkouts === 1 ? '' : 's'} to unlock Silver Tier`;

  if (overallStrengthScore >= 90 && totalWorkouts >= 30) {
    tier = 'elite';
    tierLabel = 'ELITE';
    tierNextName = null;
    tierProgressPct = 100;
    tierRequirementText = 'Peak rank achieved across all verified lifts';
  } else if (overallStrengthScore >= 75 && totalWorkouts >= 20) {
    tier = 'diamond';
    tierLabel = 'DIAMOND';
    tierNextName = 'Elite';
    tierProgressPct = Math.min(99, Math.round(((overallStrengthScore - 75) / 15) * 50 + (Math.min(30, totalWorkouts) - 20) * 5));
    tierRequirementText = `Score 90 & 30 sessions required for Elite Tier`;
  } else if (overallStrengthScore >= 60 && totalWorkouts >= 12) {
    tier = 'platinum';
    tierLabel = 'PLATINUM';
    tierNextName = 'Diamond';
    tierProgressPct = Math.min(99, Math.round(((overallStrengthScore - 60) / 15) * 50 + (Math.min(20, totalWorkouts) - 12) * 6));
    tierRequirementText = `Score 75 & 20 sessions required for Diamond Tier`;
  } else if (overallStrengthScore >= 45 || totalWorkouts >= 8) {
    tier = 'gold';
    tierLabel = 'GOLD';
    tierNextName = 'Platinum';
    tierProgressPct = Math.min(99, Math.round((Math.min(60, overallStrengthScore) / 60) * 50 + (Math.min(12, totalWorkouts) / 12) * 50));
    tierRequirementText = `Score 60 & 12 sessions required for Platinum Tier`;
  } else if (totalWorkouts >= 3) {
    tier = 'silver';
    tierLabel = 'SILVER';
    tierNextName = 'Gold';
    tierProgressPct = Math.min(99, Math.round((totalWorkouts / 8) * 100));
    tierRequirementText = `${Math.max(0, 8 - totalWorkouts)} sessions or 45 strength score for Gold Tier`;
  }

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

  let signatureExercise = 'No lifts logged yet';
  let maxSets = 0;
  Object.keys(exerciseSetCounts).forEach((name) => {
    if (exerciseSetCounts[name] > maxSets) {
      maxSets = exerciseSetCounts[name];
      signatureExercise = name;
    }
  });

  const topGroupKey = muscleDistribution[0]?.group;
  const topMuscleGroup = topGroupKey
    ? MUSCLE_PRETTY_PAIRS[topGroupKey] || topGroupKey
    : 'Not logged yet';

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
    totalWorkingSets,
    totalPRCount,
    weeklyFrequency,
    totalLifetimeVolumeKg,
    totalLifetimeVolumeFormatted,
    consistencyScorePct,
    tier,
    tierLabel,
    tierNextName,
    tierProgressPct,
    tierRequirementText,
    archetype,
    benchmarks,
    overallStrengthScore,
    signatureExercise,
    topMuscleGroup,
    muscleDistribution,
  };

  });
}
