/**
 * muscleRecoveryService.ts — ZenTrack Mobile
 *
 * Anatomical Muscle Load & Fatigue Recovery Calculation Engine:
 * - Maps exercises to primary (1.0x) and secondary (0.4x) anatomical muscles.
 * - Computes training load distribution across 18 drawable muscle groups.
 * - Exponential Fatigue & Muscle Recovery modeling (Fatigued / Recovering / Ready).
 * - Strength retention & 1RM capacity decay tracking over time.
 *
 * CACHE DESIGN NOTE: All time-sensitive functions (calculateMuscleLoad,
 * calculateMuscleFatigue, calculateMacroVolumeLoad, calculateMuscleGrowthProgression,
 * calculateSymmetryAndBalance) embed today's ISO date string in the cache key when
 * no anchorDateStr is provided. This forces a daily cache invalidation — fatigue scores
 * decay over hours and must not be served stale from a previous morning's computation.
 */

import { GymDayLog, UserGymPlanDoc, GymPlanDay } from '../types/gym.types';
import { GYM_PLAN, GYM_PLAN_ARNOLD } from '../data/gymPlan';
import { inferAutomaticRIR } from './effortEngine';
import { computeOrGetHotCache, generateDatasetFingerprint } from '../utils/hotCacheStore';
import { formatLocalDateStr, parseLocalDate } from '../utils/dateUtils';
import { getVolumeMultiplier } from '../utils/gymUtils';
import { SCIENTIFIC_BY_NAME, SCIENTIFIC_EXERCISE_MAP } from '../data/scientificExerciseMap';
import { getCanonicalExerciseKey } from '../data/exerciseAliasMap';

export const MUSCLES = [
  'trapezius',
  'deltoids',
  'chest',
  'upper-back',
  'serratus',
  'biceps',
  'triceps',
  'forearm',
  'abs',
  'obliques',
  'lower-back',
  'gluteal',
  'quadriceps',
  'hamstring',
  'adductors',
  'hip-flexors',
  'calves',
  'tibialis',
] as const;

export type MuscleSlug = typeof MUSCLES[number];

export const INERT = ['head', 'hair', 'neck', 'hands', 'feet', 'knees', 'ankles'] as const;

export const MUSCLE_NAME: Record<string, string> = {
  trapezius: 'Traps',
  deltoids: 'Shoulders',
  chest: 'Chest',
  'upper-back': 'Upper Back & Lats',
  serratus: 'Serratus',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearm: 'Forearms',
  abs: 'Abs',
  obliques: 'Obliques',
  'lower-back': 'Lower Back',
  gluteal: 'Glutes',
  quadriceps: 'Quads',
  hamstring: 'Hamstrings',
  adductors: 'Adductors',
  'hip-flexors': 'Hip Flexors',
  calves: 'Calves',
  tibialis: 'Shins / Tibialis',
};

const ALIAS: Record<string, MuscleSlug | null> = {
  // Primaries
  abs: 'abs',
  abdominals: 'abs',
  core: 'abs',
  'lower abs': 'abs',
  'upper abs': 'abs',
  pectorals: 'chest',
  chest: 'chest',
  'mid chest': 'chest',
  'upper chest': 'chest',
  'lower chest': 'chest',
  biceps: 'biceps',
  'short bicep': 'biceps',
  'long bicep': 'biceps',
  brachialis: 'biceps',
  glutes: 'gluteal',
  gluteal: 'gluteal',
  delts: 'deltoids',
  deltoids: 'deltoids',
  shoulders: 'deltoids',
  'front delts': 'deltoids',
  'side delts': 'deltoids',
  'rear delts': 'deltoids',
  triceps: 'triceps',
  'long tricep': 'triceps',
  'lat/med tricep': 'triceps',
  'upper back': 'upper-back',
  'upper-back': 'upper-back',
  'mid-back': 'upper-back',
  'mid back': 'upper-back',
  'lat width': 'upper-back',
  lats: 'upper-back',
  'latissimus dorsi': 'upper-back',
  rhomboids: 'upper-back',
  calves: 'calves',
  gastrocnemius: 'calves',
  soleus: 'calves',
  quads: 'quadriceps',
  quadriceps: 'quadriceps',
  'quad teardrop': 'quadriceps',
  forearms: 'forearm',
  forearm: 'forearm',
  'forearm flexors': 'forearm',
  'forearm extensors': 'forearm',
  hamstrings: 'hamstring',
  hamstring: 'hamstring',
  spine: 'lower-back',
  'lower back': 'lower-back',
  'lower-back': 'lower-back',
  traps: 'trapezius',
  trapezius: 'trapezius',
  'upper traps': 'trapezius',
  adductors: 'adductors',
  'hip flexors': 'hip-flexors',
  'hip-flexors': 'hip-flexors',
  obliques: 'obliques',
  'serratus anterior': 'serratus',
  serratus: 'serratus',
  shins: 'tibialis',
  tibialis: 'tibialis',
};

const BY_BODYPART: Record<string, Partial<Record<MuscleSlug, number>>> = {
  chest: { chest: 1 },
  back: { 'upper-back': 0.75, 'lower-back': 0.25 },
  shoulders: { deltoids: 1 },
  arms: { biceps: 0.5, triceps: 0.5 },
  'upper arms': { biceps: 0.5, triceps: 0.5 },
  'lower arms': { forearm: 1 },
  forearms: { forearm: 1 },
  waist: { abs: 0.7, obliques: 0.3 },
  core: { abs: 0.7, obliques: 0.3 },
  legs: { quadriceps: 0.45, hamstring: 0.35, gluteal: 0.2 },
  'upper legs': { quadriceps: 0.45, hamstring: 0.35, gluteal: 0.2 },
  'lower legs': { calves: 0.8, tibialis: 0.2 },
  calves: { calves: 1 },
  traps: { trapezius: 1 },
  neck: { trapezius: 1 },
};

export function canonicalizeMuscleSlug(name?: string): MuscleSlug | null {
  if (!name) return null;
  const clean = name.toLowerCase().trim();
  if ((MUSCLES as readonly string[]).includes(clean)) return clean as MuscleSlug;
  return ALIAS[clean] || null;
}

const _EXERCISE_WEIGHTS_MEMO = new Map<string, Partial<Record<MuscleSlug, number>>>();

/**
 * Returns muscle weight distribution (primary = 1.0, secondary = 0.4) for any exercise
 */
export function getExerciseMuscleWeights(exercise: { name?: string; muscle?: string; target?: string }): Partial<Record<MuscleSlug, number>> {
  const rawName = (exercise.name || '').trim();
  const muscleRaw = (exercise.muscle || '').trim();
  const targetRaw = (exercise.target || '').trim();
  const memoKey = `${rawName}|${muscleRaw}|${targetRaw}`;
  const cached = _EXERCISE_WEIGHTS_MEMO.get(memoKey);
  if (cached) return cached;

  const canonicalKey = getCanonicalExerciseKey(rawName).toLowerCase().trim();
  const lowerRaw = rawName.toLowerCase();
  const sanitizedRaw = lowerRaw.replace(/[^a-z0-9]/g, '');

  // 1. High-Precision Scientific Database Match (525 exercises)
  const sciEntry = SCIENTIFIC_BY_NAME[lowerRaw] || SCIENTIFIC_BY_NAME[sanitizedRaw] || SCIENTIFIC_BY_NAME[canonicalKey];
  if (sciEntry && sciEntry.weights && Object.keys(sciEntry.weights).length > 0) {
    const res = { ...sciEntry.weights };
    _EXERCISE_WEIGHTS_MEMO.set(memoKey, res);
    return res;
  }

  // 2. Heuristic fallback for custom/unmapped exercises
  const out: Partial<Record<MuscleSlug, number>> = {};
  const name = lowerRaw;
  const muscle = muscleRaw.toLowerCase();
  const target = targetRaw.toLowerCase();

  const add = (slugStr: string | null | undefined, weight: number) => {
    const slug = canonicalizeMuscleSlug(slugStr || '');
    if (slug) {
      out[slug] = Math.max(out[slug] || 0, weight);
    }
  };

  // Direct muscle field match
  add(muscle, 1.0);
  add(target, 1.0);

  // Common exercise patterns & secondary muscles
  if (name.includes('press') && (name.includes('bench') || name.includes('chest') || name.includes('incline') || name.includes('decline') || name.includes('push-up') || name.includes('pushup') || name.includes('dip'))) {
    add('chest', 1.0);
    add('triceps', 0.4);
    add('deltoids', 0.4);
  } else if (name.includes('overhead press') || name.includes('shoulder press') || name.includes('military press') || name.includes('arnold press')) {
    add('deltoids', 1.0);
    add('triceps', 0.4);
    add('trapezius', 0.3);
  } else if (name.includes('lateral raise') || name.includes('front raise')) {
    add('deltoids', 1.0);
    add('trapezius', 0.3);
  } else if (name.includes('pulldown') || name.includes('pull-up') || name.includes('pullup') || name.includes('chin-up')) {
    add('upper-back', 1.0);
    add('biceps', 0.4);
    add('forearm', 0.3);
  } else if (name.includes('row')) {
    add('upper-back', 1.0);
    add('biceps', 0.4);
    add('lower-back', 0.3);
    add('trapezius', 0.3);
  } else if (name.includes('deadlift') || name.includes('rdl')) {
    add('hamstring', 1.0);
    add('gluteal', 0.8);
    add('lower-back', 0.8);
    add('trapezius', 0.4);
    add('forearm', 0.4);
  } else if (name.includes('squat') || name.includes('leg press') || name.includes('hack squat') || name.includes('lunge')) {
    add('quadriceps', 1.0);
    add('gluteal', 0.7);
    add('adductors', 0.4);
    add('calves', 0.3);
  } else if (name.includes('curl') && !name.includes('leg curl')) {
    add('biceps', 1.0);
    add('forearm', 0.4);
  } else if (name.includes('tricep') || name.includes('skullcrusher') || name.includes('pushdown') || name.includes('extension') && !name.includes('leg extension')) {
    add('triceps', 1.0);
  } else if (name.includes('leg extension')) {
    add('quadriceps', 1.0);
  } else if (name.includes('leg curl')) {
    add('hamstring', 1.0);
    add('calves', 0.3);
  } else if (name.includes('calf') || name.includes('calves')) {
    add('calves', 1.0);
    add('tibialis', 0.3);
  } else if (name.includes('crunch') || name.includes('sit-up') || name.includes('leg raise') || name.includes('plank')) {
    add('abs', 1.0);
    add('obliques', 0.4);
  } else if (name.includes('shrug')) {
    add('trapezius', 1.0);
    add('forearm', 0.4);
  }

  if (Object.keys(out).length === 0 && muscle) {
    const fb = BY_BODYPART[muscle];
    if (fb) Object.assign(out, fb);
  }

  _EXERCISE_WEIGHTS_MEMO.set(memoKey, out);
  return out;
}

export const MUSCLE_RECOVERY_SCALAR: Record<MuscleSlug, number> = {
  quadriceps: 1.2,
  hamstring: 1.2,
  gluteal: 1.15,
  'lower-back': 1.2,
  'upper-back': 1.1,
  chest: 1.1,
  deltoids: 0.85,
  trapezius: 0.9,
  biceps: 0.8,
  triceps: 0.85,
  forearm: 0.7,
  abs: 0.7,
  obliques: 0.75,
  serratus: 0.75,
  adductors: 0.95,
  'hip-flexors': 0.8,
  calves: 0.75,
  tibialis: 0.7,
};

export const SMALL_MUSCLE_SLUGS = new Set<MuscleSlug>([
  'forearm',
  'abs',
  'obliques',
  'serratus',
  'tibialis',
  'hip-flexors',
  'lower-back',
]);

function resolveAnchorTimestamp(anchorDateStr?: string): number {
  if (!anchorDateStr) return Date.now();
  const cleanIso = anchorDateStr.slice(0, 10);
  const todayIso = formatLocalDateStr(new Date());
  if (cleanIso >= todayIso) {
    return Date.now();
  }
  const d = parseLocalDate(cleanIso);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function resolveLogTimestamp(log: GymDayLog): number {
  if (typeof log.workoutStartTime === 'number' && log.workoutStartTime > 1000000000000) {
    return log.workoutStartTime;
  }
  if (typeof log.updatedAt === 'number' && log.updatedAt > 1000000000000 && log.date === formatLocalDateStr(new Date(log.updatedAt))) {
    return log.updatedAt;
  }
  const d = parseLocalDate(String(log.date || '').slice(0, 10));
  d.setHours(18, 0, 0, 0); // Default historical session anchor at 6:00 PM local time
  return d.getTime();
}

/**
 * Determines the primary weekly rest day index (1 = Monday ... 7 = Sunday).
 * If user has customized a day as rest in customDays or in split template, find it.
 * Defaults to 7 (Sunday).
 */
export function getPrimaryRestDayIndex(userGymPlan?: UserGymPlanDoc | null): number {
  if (!userGymPlan) return 7; // Sunday by default

  const basePlan = userGymPlan.templateId === 'arnold' ? GYM_PLAN_ARNOLD : GYM_PLAN;

  const isRest = (d: number): boolean => {
    const custom = userGymPlan.customDays?.[d];
    if (custom) {
      if (custom.isRest === true) return true;
      if (custom.name && /rest|recovery/i.test(custom.name)) return true;
      if (Array.isArray(custom.exercises) && custom.exercises.length === 0) return true;
      return false;
    }
    const baseDay = basePlan.find(bd => bd.dayIndex === d) || basePlan[d - 1];
    return baseDay ? Boolean(baseDay.isRest) : d === 7;
  };

  // If Sunday (7) is rest, Sunday is the primary reset day (standard case)
  if (isRest(7)) return 7;

  // Otherwise check if any other day is marked rest
  for (let d = 1; d <= 7; d++) {
    if (isRest(d)) return d;
  }

  return 7;
}

export interface TrainingWeekBounds {
  startDate: Date;
  endDate: Date;
  startDateIso: string;
  endDateIso: string;
  startDayIndex: number;
  restDayIndex: number;
  startDayName: string;
  restDayName: string;
}

/**
 * Calculates the current training week bounds anchored after the user's rest day.
 * Example: For a Sunday rest day (restDayIndex=7), the week starts on Monday (startDayIndex=1).
 * On Sunday, it represents the full week (Monday..Sunday). On Monday, it resets to the new week.
 */
export function getTrainingWeekBounds(
  anchorDate?: Date | string | null,
  userGymPlan?: UserGymPlanDoc | null
): TrainingWeekBounds {
  const restDayIndex = getPrimaryRestDayIndex(userGymPlan);
  const startDayIndex = (restDayIndex % 7) + 1;

  let now: Date;
  if (!anchorDate) {
    now = new Date();
  } else if (typeof anchorDate === 'string') {
    now = parseLocalDate(anchorDate.slice(0, 10));
  } else {
    now = new Date(anchorDate.getTime());
  }

  // Convert JS Sunday=0..Saturday=6 to Monday=1..Sunday=7
  const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

  // Number of days since the most recent week start
  const daysSinceStart = (currentDayOfWeek - startDayIndex + 7) % 7;

  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceStart, 0, 0, 0, 0);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6, 23, 59, 59, 999);

  const startDateIso = formatLocalDateStr(startDate);
  const endDateIso = formatLocalDateStr(endDate);

  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return {
    startDate,
    endDate,
    startDateIso,
    endDateIso,
    startDayIndex,
    restDayIndex,
    startDayName: DAY_NAMES[startDayIndex - 1],
    restDayName: DAY_NAMES[restDayIndex - 1],
  };
}

/**
 * Calculates effective volume load per muscle from an array of workout logs
 */
export function calculateMuscleLoad(
  logs: GymDayLog[],
  windowDays: number = 7,
  anchorDateStr?: string,
  onlyHardSets: boolean = false
): Record<MuscleSlug, number> {
  const todayTag = anchorDateStr || formatLocalDateStr(new Date());
  const cacheKey = `muscle_load_${generateDatasetFingerprint(logs, `${windowDays}_${todayTag}_${onlyHardSets}`)}`;
  return computeOrGetHotCache(cacheKey, () => {
    const load: Record<MuscleSlug, number> = {} as any;
    MUSCLES.forEach(m => (load[m] = 0));

    const now = resolveAnchorTimestamp(anchorDateStr);
    const windowMs = windowDays === 0 ? Infinity : windowDays * 86400000;

    for (const log of logs || []) {
      if (!log.date) continue;
      const logTime = resolveLogTimestamp(log);
      if (windowMs !== Infinity && (now - logTime > windowMs || logTime > now + 86400000)) {
        continue;
      }

      for (const ex of log.exercises || []) {
        if (ex.skipped) continue;
        const completedSets = (ex.setsLog || []).filter((s: any) => {
          if (!s.completed || s.isWarmup) return false;
          if (!onlyHardSets) return true;
          const rir = inferAutomaticRIR(s, ex.setsLog);
          return rir <= 3;
        }).length;
        if (!completedSets) continue;

        const weights = getExerciseMuscleWeights(ex);
        for (const [slug, w] of Object.entries(weights)) {
          if (slug in load) {
            load[slug as MuscleSlug] += (w || 0) * completedSets;
          }
        }
      }
    }

    // Round all final muscle loads to whole discrete integer sets so users never see confusing decimals (e.g. 1.2 or 4.8)
    for (const slug of MUSCLES) {
      load[slug] = Math.round(load[slug] || 0);
    }

    return load;
  });
}

/**
 * Normalizes muscle load into 0–4 discrete shading tiers
 */
export function calculateMuscleLevels(load: Record<MuscleSlug, number>): Record<MuscleSlug, number> {
  const values = Object.values(load);
  const max = Math.max(0, ...values);
  const levels: Record<MuscleSlug, number> = {} as any;

  MUSCLES.forEach(m => {
    const val = load[m] || 0;
    if (!val || max <= 0) {
      levels[m] = 0;
    } else {
      levels[m] = Math.max(1, Math.min(4, Math.ceil((val / max) * 4)));
    }
  });

  return levels;
}

export type FatigueState = 'ready' | 'recovering' | 'fatigued';

export interface MuscleRecoveryData {
  fatigueScore: number; // 0.0 (fresh) to 1.0+ (heavily fatigued)
  fatigueLevel: number; // 0 (ready) to 4 (peak fatigue)
  state: FatigueState;
  strengthScore: number; // 0.60 to 1.0 (retained capacity)
  lastTrainedDaysAgo: number | null;
  totalSets: number;
  estimatedRecoveryHours: number; // 0 if ready, or hours remaining until recovery threshold
  readinessPct: number; // 0 to 100% capacity
}

/**
 * Calculates exponential Fatigue & Recovery state for each muscle based on training recency & volume
 */
export function calculateMuscleFatigue(
  logs: GymDayLog[],
  anchorDateStr?: string
): Record<MuscleSlug, MuscleRecoveryData> {
  const now = resolveAnchorTimestamp(anchorDateStr);
  // Hour-bucketed cache key so countdowns tick down accurately every hour
  const hourBucket = Math.floor(now / 3600000);
  const cacheKey = `muscle_fatigue_${generateDatasetFingerprint(logs, `${hourBucket}`)}`;

  return computeOrGetHotCache(cacheKey, () => {
    const out: Record<MuscleSlug, MuscleRecoveryData> = {} as any;

    // Group sets per muscle PER SESSION (by log date/timestamp) so multi-exercise
    // workouts don't add the base fatigue penalty multiple times!
    const muscleSessions: Record<MuscleSlug, Map<number, number>> = {} as any;
    MUSCLES.forEach(m => (muscleSessions[m] = new Map()));

    for (const log of logs || []) {
      if (!log.date) continue;
      const logTime = resolveLogTimestamp(log);
      // Ignore future logs or logs older than 10 days for acute fatigue
      if (logTime > now + 3600000 || now - logTime > 10 * 86400000) continue;

      for (const ex of log.exercises || []) {
        if (ex.skipped) continue;
        const completedSets = (ex.setsLog || []).filter((s: any) => s.completed && !s.isWarmup).length;
        if (!completedSets) continue;

        const weights = getExerciseMuscleWeights(ex);
        for (const [slug, w] of Object.entries(weights)) {
          if (slug in muscleSessions) {
            const mSlug = slug as MuscleSlug;
            const prev = muscleSessions[mSlug].get(logTime) || 0;
            muscleSessions[mSlug].set(logTime, prev + completedSets * (w || 1));
          }
        }
      }
    }

    MUSCLES.forEach(m => {
      const sessionMap = muscleSessions[m];
      const sizeScalar = MUSCLE_RECOVERY_SCALAR[m] || 1.0;
      const tauHours = 36 * sizeScalar; // Tissue-specific recovery time constant

      let totalFatigue = 0;
      let mostRecentTime: number | null = null;
      let totalSetsIn7Days = 0;

      sessionMap.forEach((sessionSets, sessionTime) => {
        if (!mostRecentTime || sessionTime > mostRecentTime) {
          mostRecentTime = sessionTime;
        }
        const hoursAgo = Math.max(0, (now - sessionTime) / 3600000);
        if (hoursAgo <= 168) {
          totalSetsIn7Days += sessionSets;
        }
        const decay = Math.exp(-hoursAgo / tauHours);
        const intensityWeight = Math.min(1.5, (0.22 + sessionSets * 0.09) * sizeScalar);
        totalFatigue += intensityWeight * decay;
      });

      const daysAgo = mostRecentTime != null
        ? Math.max(0, Math.floor((now - mostRecentTime) / 86400000))
        : null;

      // Clean, non-contradictory thresholds:
      // <= 0.28: Ready (100%)
      // 0.29 - 0.56: Recovering (Yellow)
      // >= 0.57: Fatigued / Rest Priority (Red)
      const isPrime = totalFatigue <= 0.28;
      const isFatigued = totalFatigue >= 0.57;
      const state: FatigueState = isPrime ? 'ready' : isFatigued ? 'fatigued' : 'recovering';
      const fLevel = isPrime ? 0 : isFatigued ? (totalFatigue >= 0.85 ? 4 : 3) : (totalFatigue >= 0.42 ? 2 : 1);

      const hoursSince = mostRecentTime != null ? Math.max(0, (now - mostRecentTime) / 3600000) : 999;
      const strengthScore = Math.min(1.0, 0.65 + 0.35 * (1 - Math.exp(-hoursSince / tauHours)));

      let estimatedRecoveryHours = 0;
      if (!isPrime && totalFatigue > 0.28) {
        estimatedRecoveryHours = Math.max(1, Math.round(tauHours * Math.log(totalFatigue / 0.28)));
      }

      const readinessPct = isPrime
        ? 100
        : Math.max(35, Math.min(99, Math.round((1 - Math.min(1, (totalFatigue - 0.28) / 1.1)) * 100)));

      out[m] = {
        fatigueScore: Math.round(totalFatigue * 100) / 100,
        fatigueLevel: fLevel,
        state,
        strengthScore: Math.round(strengthScore * 100) / 100,
        lastTrainedDaysAgo: daysAgo,
        totalSets: Math.round(totalSetsIn7Days),
        estimatedRecoveryHours,
        readinessPct,
      };
    });

    return out;
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// ─── 3 MACRO LONG-TERM ANALYTICS ENGINES (Volume, Growth, Balance) ────────────
// ═════════════════════════════════════════════════════════════════════════════

export interface MacroMuscleVolume {
  sets: number;
  volumeKg: number;
  level: number; // 0–4
  percentage: number;
}

export interface MacroMuscleGrowth {
  gainPct: number; // e.g. +12.5%
  status: 'high_gain' | 'steady_gain' | 'maintained' | 'untrained';
  color: string;
  bestExercise: string | null;
  loadDeltaKg: number;
}

export interface MacroMuscleBalance {
  status: 'optimal' | 'dominant' | 'lagging' | 'untrained';
  ratio: number;
  color: string;
  recommendation: string;
  addExerciseName?: string;
  addExerciseId?: string;
  targetDayIndex?: number;
  targetDayName?: string;
  removeExerciseName?: string;
  removeExerciseId?: string;
  removeDayIndex?: number;
  removeDayName?: string;
}

/**
 * 1. Macro Volume Load Engine (Cumulative sets & tonnage)
 */
export function calculateMacroVolumeLoad(
  logs: GymDayLog[],
  windowDays: number = 30,
  anchorDateStr?: string
): Record<MuscleSlug, MacroMuscleVolume> {
  const todayTag = anchorDateStr || formatLocalDateStr(new Date());
  const cacheKey = `macro_vol_${generateDatasetFingerprint(logs, `${windowDays}_${todayTag}`)}`;
  return computeOrGetHotCache(cacheKey, () => {
    const out: Record<MuscleSlug, MacroMuscleVolume> = {} as any;
    MUSCLES.forEach(m => (out[m] = { sets: 0, volumeKg: 0, level: 0, percentage: 0 }));

    const now = resolveAnchorTimestamp(anchorDateStr);
    const windowMs = windowDays === 0 ? Infinity : windowDays * 86400000;

    let totalKgAll = 0;

    for (const log of logs || []) {
      if (!log.date) continue;
      const logTime = resolveLogTimestamp(log);
      if (windowMs !== Infinity && (now - logTime > windowMs || logTime > now + 86400000)) {
        continue;
      }

      for (const ex of log.exercises || []) {
        if (ex.skipped) continue;
        const weights = getExerciseMuscleWeights(ex);

        const mult = getVolumeMultiplier(ex.name);
        for (const s of ex.setsLog || []) {
          if (!s.completed || s.isWarmup) continue;
          const w = Number(s.weight) || 0;
          const r = Number(s.reps) || 0;
          const setVol = w * r * mult;

          for (const [slug, mWeight] of Object.entries(weights)) {
            if (slug in out) {
              const muscleKey = slug as MuscleSlug;
              out[muscleKey].sets += mWeight || 1;
              out[muscleKey].volumeKg += setVol * (mWeight || 1);
              totalKgAll += setVol * (mWeight || 1);
            }
          }
        }
      }
    }

    const maxVol = Math.max(0, ...Object.values(out).map(v => v.volumeKg));

    MUSCLES.forEach(m => {
      const item = out[m];
      item.sets = Math.round(item.sets || 0);
      item.volumeKg = Math.round(item.volumeKg);
      item.percentage = totalKgAll > 0 ? Math.round((item.volumeKg / totalKgAll) * 100) : 0;
      item.level = maxVol > 0 && item.volumeKg > 0 ? Math.max(1, Math.min(4, Math.ceil((item.volumeKg / maxVol) * 4))) : 0;
    });

    return out;
  });
}

/**
 * 2. Macro Growth & Overload Engine (Progressive strength % gains)
 */
export function calculateMuscleGrowthProgression(
  logs: GymDayLog[],
  windowDays: number = 30,
  anchorDateStr?: string
): Record<MuscleSlug, MacroMuscleGrowth> {
  const todayTag = anchorDateStr || formatLocalDateStr(new Date());
  const cacheKey = `macro_growth_${generateDatasetFingerprint(logs, `${windowDays}_${todayTag}`)}`;
  return computeOrGetHotCache(cacheKey, () => {
    const out: Record<MuscleSlug, MacroMuscleGrowth> = {} as any;
    MUSCLES.forEach(m => (out[m] = {
      gainPct: 0,
      status: 'untrained',
      color: '#232128',
      bestExercise: null,
      loadDeltaKg: 0,
    }));

    const now = resolveAnchorTimestamp(anchorDateStr);
    const windowMs = windowDays === 0 ? Infinity : windowDays * 86400000;

    // Filter logs in window & sort chronologically
    const filtered = (logs || [])
      .filter(l => {
        if (!l.date) return false;
        const t = resolveLogTimestamp(l);
        return windowMs === Infinity || (now - t <= windowMs && t <= now + 86400000);
      })
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    if (filtered.length === 0) return out;

    // Group exercise top loads by muscle over time
    const muscleExerciseLoads: Record<MuscleSlug, Record<string, { baseline1RM: number; latest1RM: number }>> = {} as any;
    MUSCLES.forEach(m => (muscleExerciseLoads[m] = {}));

    for (const log of filtered) {
      for (const ex of log.exercises || []) {
        if (ex.skipped || !ex.name) continue;
        const completed = (ex.setsLog || []).filter((s: any) => s.completed && !s.isWarmup);
        if (!completed.length) continue;

        const topW = Math.max(0, ...completed.map((s: any) => Number(s.weight) || 0));
        const topR = completed.find((s: any) => Number(s.weight) === topW)?.reps || 1;
        const rm = topW * (1 + topR / 30); // Epley 1RM

        const weights = getExerciseMuscleWeights(ex);
        for (const slug of Object.keys(weights)) {
          if (slug in muscleExerciseLoads) {
            const mKey = slug as MuscleSlug;
            if (!muscleExerciseLoads[mKey][ex.name]) {
              muscleExerciseLoads[mKey][ex.name] = { baseline1RM: rm, latest1RM: rm };
            } else {
              muscleExerciseLoads[mKey][ex.name].latest1RM = rm;
            }
          }
        }
      }
    }

    // Calculate percentage delta
    MUSCLES.forEach(m => {
      const exercises = Object.entries(muscleExerciseLoads[m]);
      if (exercises.length === 0) return;

      let totalBase = 0;
      let totalLatest = 0;
      let bestEx = '';
      let maxExGain = -Infinity;

      for (const [exName, loads] of exercises) {
        totalBase += loads.baseline1RM;
        totalLatest += loads.latest1RM;
        const gain = loads.latest1RM - loads.baseline1RM;
        if (gain > maxExGain) {
          maxExGain = gain;
          bestEx = exName;
        }
      }

      if (totalBase > 0) {
        const delta = totalLatest - totalBase;
        const pct = Math.round((delta / totalBase) * 1000) / 10;
        let status: MacroMuscleGrowth['status'] = 'maintained';
        let color = '#89dceb'; // Ice blue maintained

        if (pct >= 8) {
          status = 'high_gain';
          color = '#ffd32a'; // 🔥 Gold
        } else if (pct >= 2.5) {
          status = 'steady_gain';
          color = '#5eda9e'; // 🟢 Green
        } else if (pct < 0) {
          status = 'maintained';
          color = '#8e8e93';
        }

        out[m] = {
          gainPct: pct,
          status,
          color,
          bestExercise: bestEx || null,
          loadDeltaKg: Math.round(delta * 10) / 10,
        };
      }
    });

    return out;
  });
}

/**
 * 3. Macro Symmetry & Balance Engine (Biomechanical push/pull & anterior/posterior ratios)
 */
export function calculateSymmetryAndBalance(
  logs: GymDayLog[],
  windowDays: number = 30,
  anchorDateStr?: string,
  userGymPlan?: UserGymPlanDoc | null
): Record<MuscleSlug, MacroMuscleBalance> {
  // FIX (Bug A): Same daily cache key needed here.
  // FIX (Bug G): Pre-call calculateMacroVolumeLoad OUTSIDE the computeOrGetHotCache wrapper
  // to avoid a double cold-miss on first render. On first call both symmetry AND volume are
  // cache misses — without this hoist, the full log traversal ran twice in one JS frame.
  // Now volumeMap is computed once (and itself cached), then reused by symmetry calculation.
  const todayTag = anchorDateStr || formatLocalDateStr(new Date());
  const planSig = userGymPlan ? JSON.stringify(userGymPlan.customDays || {}) + (userGymPlan.templateId || '') : 'default';
  const cacheKey = `macro_symmetry_${generateDatasetFingerprint(logs, `${windowDays}_${todayTag}_${planSig}`)}`;
  const volumeMap = calculateMacroVolumeLoad(logs, windowDays, anchorDateStr);
  return computeOrGetHotCache(cacheKey, () => {
    const out: Record<MuscleSlug, MacroMuscleBalance> = {} as any;

    // Calculate antagonistic pair details
    const pairs = calculateAntagonisticPairs(logs, windowDays, anchorDateStr, userGymPlan);
    const upperPair = pairs.find(p => p.id === 'upper');
    const legPair = pairs.find(p => p.id === 'legs');
    const armPair = pairs.find(p => p.id === 'arms');

    MUSCLES.forEach(m => {
      const vol = volumeMap[m]?.volumeKg || 0;

      // Pair-aware check BEFORE returning 'untrained' so 0-set lagging antagonists still turn RED!
      if (m === 'hamstring' || m === 'gluteal') {
        if (!legPair || legPair.status === 'untrained') {
          out[m] = { status: 'untrained', ratio: 0, color: '#232128', recommendation: 'No leg sessions logged this week.' };
        } else if (legPair.status === 'lagging_b') {
          out[m] = { 
            status: 'lagging', 
            ratio: legPair.ratio, 
            color: '#FF453A', 
            recommendation: `Hamstrings & Glutes are falling behind your Quads. Add 3 sets of Romanian Deadlifts (RDLs) or Leg Curls to protect your knees and balance your hips.`,
            addExerciseName: legPair.correctiveExerciseName || 'Romanian Deadlift (Barbell)',
            addExerciseId: legPair.correctiveExerciseId || 'rdl_barbell',
            targetDayIndex: legPair.targetDayIndex || 6,
            targetDayName: legPair.targetDayName || 'Saturday',
            removeExerciseName: legPair.removeExerciseName,
            removeExerciseId: legPair.removeExerciseId,
            removeDayIndex: legPair.removeDayIndex,
            removeDayName: legPair.removeDayName,
          };
        } else if (legPair.status === 'lagging_a') {
          out[m] = { status: 'dominant', ratio: legPair.ratio, color: '#FF9F0A', recommendation: 'Posterior chain is dominant. Ensure quad movements like Squats or Leg Extensions maintain balance.' };
        } else {
          out[m] = { status: 'optimal', ratio: legPair.ratio, color: '#30D158', recommendation: legPair.correctiveRecommendation };
        }
        return;
      }

      if (m === 'quadriceps') {
        if (!legPair || legPair.status === 'untrained') {
          out[m] = { status: 'untrained', ratio: 0, color: '#232128', recommendation: 'No leg sessions logged this week.' };
        } else if (legPair.status === 'lagging_b') {
          out[m] = { 
            status: 'dominant', 
            ratio: legPair.ratio, 
            color: '#FF9F0A', 
            recommendation: `Quad dominant (${Math.round(legPair.totalSetsA)} sets). Balance with more Hamstring & Glute work to prevent knee strain.`,
            removeExerciseName: legPair.removeExerciseName,
            removeExerciseId: legPair.removeExerciseId,
            removeDayIndex: legPair.removeDayIndex,
            removeDayName: legPair.removeDayName,
            addExerciseName: legPair.correctiveExerciseName,
            addExerciseId: legPair.correctiveExerciseId,
            targetDayIndex: legPair.targetDayIndex,
            targetDayName: legPair.targetDayName,
          };
        } else if (legPair.status === 'lagging_a') {
          out[m] = { status: 'lagging', ratio: legPair.ratio, color: '#FF453A', recommendation: 'Quads are lagging behind your posterior chain. Add 3 sets of Squats or Leg Extensions.' };
        } else {
          out[m] = { status: 'optimal', ratio: legPair.ratio, color: '#30D158', recommendation: legPair.correctiveRecommendation };
        }
        return;
      }

      if (m === 'chest' || m === 'deltoids') {
        if (!upperPair || upperPair.status === 'untrained') {
          out[m] = { status: 'untrained', ratio: 0, color: '#232128', recommendation: 'No upper body sessions logged this week.' };
        } else if (upperPair.status === 'lagging_b') {
          out[m] = { 
            status: 'dominant', 
            ratio: upperPair.ratio, 
            color: '#FF9F0A', 
            recommendation: `Push volume is very high (${Math.round(upperPair.totalSetsA)} sets). To prevent forward shoulder rounding, either add more Back pulling or reduce excess pushing.`,
            removeExerciseName: upperPair.removeExerciseName,
            removeExerciseId: upperPair.removeExerciseId,
            removeDayIndex: upperPair.removeDayIndex,
            removeDayName: upperPair.removeDayName,
            addExerciseName: upperPair.correctiveExerciseName,
            addExerciseId: upperPair.correctiveExerciseId,
            targetDayIndex: upperPair.targetDayIndex,
            targetDayName: upperPair.targetDayName,
          };
        } else if (upperPair.status === 'lagging_a') {
          out[m] = { status: 'lagging', ratio: upperPair.ratio, color: '#FF453A', recommendation: 'Chest is lagging behind Back pulling. Add 3 sets of Incline Dumbbell Press or Bench Press.' };
        } else {
          out[m] = { status: 'optimal', ratio: upperPair.ratio, color: '#30D158', recommendation: upperPair.correctiveRecommendation };
        }
        return;
      }

      if (m === 'upper-back' || m === 'trapezius') {
        if (!upperPair || upperPair.status === 'untrained') {
          out[m] = { status: 'untrained', ratio: 0, color: '#232128', recommendation: 'No upper body sessions logged this week.' };
        } else if (upperPair.status === 'lagging_b') {
          const ratioPct = Math.round(upperPair.ratio * 100);
          out[m] = { 
            status: 'lagging', 
            ratio: upperPair.ratio, 
            color: '#FF453A', 
            recommendation: `Your Back & Lats are falling behind your Chest (Pull is only ${ratioPct}% of Push). Add 3–4 sets of Rows, Lat Pulldowns, or Face Pulls to match your pushing volume and protect your posture.`,
            addExerciseName: upperPair.correctiveExerciseName || 'Face Pull (Cable)',
            addExerciseId: upperPair.correctiveExerciseId || 'face_pull_cable',
            targetDayIndex: upperPair.targetDayIndex || 2,
            targetDayName: upperPair.targetDayName || 'Tuesday',
            removeExerciseName: upperPair.removeExerciseName,
            removeExerciseId: upperPair.removeExerciseId,
            removeDayIndex: upperPair.removeDayIndex,
            removeDayName: upperPair.removeDayName,
          };
        } else if (upperPair.status === 'lagging_a') {
          out[m] = { status: 'dominant', ratio: upperPair.ratio, color: '#FF9F0A', recommendation: 'Great back pulling volume. Ensure chest pressing stays in healthy proportion.' };
        } else {
          out[m] = { status: 'optimal', ratio: upperPair.ratio, color: '#30D158', recommendation: upperPair.correctiveRecommendation };
        }
        return;
      }

      if (m === 'biceps' || m === 'triceps') {
        if (!armPair || armPair.status === 'untrained') {
          out[m] = { status: 'untrained', ratio: 0, color: '#232128', recommendation: 'No arm work logged this week.' };
        } else if (armPair.status === 'lagging_a' || armPair.status === 'lagging_b') {
          const isLagging = (m === 'biceps' && armPair.status === 'lagging_a') || (m === 'triceps' && armPair.status === 'lagging_b');
          out[m] = {
            status: isLagging ? 'lagging' : 'dominant',
            ratio: armPair.ratio,
            color: isLagging ? '#FF453A' : '#FF9F0A',
            recommendation: armPair.correctiveRecommendation,
          };
        } else {
          out[m] = { status: 'optimal', ratio: armPair.ratio, color: '#30D158', recommendation: armPair.correctiveRecommendation };
        }
        return;
      }

      if (vol <= 0) {
        out[m] = { status: 'untrained', ratio: 0, color: '#232128', recommendation: 'No sets logged in this timeframe.' };
      } else {
        out[m] = { status: 'optimal', ratio: 1.0, color: '#30D158', recommendation: 'Consistent stimulus applied across core chains.' };
      }
    });

    return out;
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// ─── HIGH-IMPACT UTILITY HELPERS (Recovery, Growth Targets, Antagonists) ─────
// ═════════════════════════════════════════════════════════════════════════════

export interface DailyRecoveryRecommendations {
  primeToTrain: { slug: MuscleSlug; name: string; readinessPct: number; lastTrainedDaysAgo: number | null }[];
  restPriority: { slug: MuscleSlug; name: string; estimatedHours: number; state: FatigueState; totalSets: number }[];
}

/**
 * 1. Daily Training Recommendation helper (🟢 Prime for Today vs 🔴 Rest Priority)
 */
export function getDailyRecoveryRecommendations(
  fatigueMap: Record<MuscleSlug, MuscleRecoveryData>
): DailyRecoveryRecommendations {
  const prime: { slug: MuscleSlug; name: string; readinessPct: number; lastTrainedDaysAgo: number | null }[] = [];
  const rest: { slug: MuscleSlug; name: string; estimatedHours: number; state: FatigueState; totalSets: number }[] = [];

  for (const slug of MUSCLES) {
    const data = fatigueMap[slug];
    if (!data) continue;
    const name = MUSCLE_NAME[slug] || slug;

    if (data.state === 'fatigued') {
      rest.push({
        slug,
        name,
        estimatedHours: data.estimatedRecoveryHours,
        state: 'fatigued',
        totalSets: data.totalSets,
      });
    } else if (data.state === 'recovering') {
      rest.push({
        slug,
        name,
        estimatedHours: data.estimatedRecoveryHours,
        state: 'recovering',
        totalSets: data.totalSets,
      });
    } else if (data.state === 'ready') {
      prime.push({
        slug,
        name,
        readinessPct: data.readinessPct,
        lastTrainedDaysAgo: data.lastTrainedDaysAgo,
      });
    }
  }

  // Sort rest by longest recovery hours remaining
  rest.sort((a, b) => b.estimatedHours - a.estimatedHours);
  // Sort prime: Prioritize muscles trained in the past that have fully recovered first, then fresh
  prime.sort((a, b) => {
    if (a.lastTrainedDaysAgo == null && b.lastTrainedDaysAgo != null) return 1;
    if (a.lastTrainedDaysAgo != null && b.lastTrainedDaysAgo == null) return -1;
    return (b.lastTrainedDaysAgo ?? 0) - (a.lastTrainedDaysAgo ?? 0);
  });

  return { primeToTrain: prime, restPriority: rest };
}

export interface HypertrophyLandmarkInfo {
  tier: 'untrained' | 'below_mev' | 'mev' | 'mav' | 'mrv_risk';
  tierLabel: string;
  tierColor: string;
  currentSets: number;
  mevTarget: number; // 6
  mavMinTarget: number; // 10
  mavMaxTarget: number; // 16
  mrvLimit: number; // 20
  actionableDeficitSets: number;
  actionableMessage: string;
}

/**
 * 2. Adaptive Hypertrophy Landmark & Actionable Weekly Deficit Calculator
 * (MEV: 6 sets | MAV: 10–16 sets sweet spot | MRV: 20+ sets junk volume)
 */
export function getHypertrophyLandmarkInfo(
  weeklySets: number,
  targetDayName: string = 'Sunday',
  muscleSlug?: MuscleSlug
): HypertrophyLandmarkInfo {
  const s = Math.round(weeklySets || 0);
  const isSmall = muscleSlug ? SMALL_MUSCLE_SLUGS.has(muscleSlug) : false;

  const mev = isSmall ? 4 : 6;
  const mavMin = isSmall ? 6 : 10;
  const mavMax = isSmall ? 12 : 16;
  const mrv = isSmall ? 16 : 20;

  if (s <= 0) {
    return {
      tier: 'untrained',
      tierLabel: 'Not Trained Yet (0 sets)',
      tierColor: '#8E8E93',
      currentSets: 0,
      mevTarget: mev,
      mavMinTarget: mavMin,
      mavMaxTarget: mavMax,
      mrvLimit: mrv,
      actionableDeficitSets: mavMin,
      actionableMessage: `Do ${mev} sets to maintain muscle, or ${mavMin} sets by ${targetDayName} to build new muscle.`,
    };
  }

  if (s < mev) {
    const deficitToMev = Math.max(1, mev - s);
    const deficitToMav = Math.max(1, mavMin - s);
    return {
      tier: 'below_mev',
      tierLabel: `Just Started (${s} sets)`,
      tierColor: '#6D5FE0', // 🔮 Deep Purple
      currentSets: s,
      mevTarget: mev,
      mavMinTarget: mavMin,
      mavMaxTarget: mavMax,
      mrvLimit: mrv,
      actionableDeficitSets: deficitToMav,
      actionableMessage: `Do +${deficitToMev} more ${deficitToMev === 1 ? 'set' : 'sets'} to maintain, or +${deficitToMav} more sets by ${targetDayName} to hit the Growth Zone.`,
    };
  }

  if (s < mavMin) {
    const deficitToMav = Math.max(1, mavMin - s);
    return {
      tier: 'mev',
      tierLabel: `Maintaining (${s} sets)`,
      tierColor: '#A599FF', // 🟣 Light Purple
      currentSets: s,
      mevTarget: mev,
      mavMinTarget: mavMin,
      mavMaxTarget: mavMax,
      mrvLimit: mrv,
      actionableDeficitSets: deficitToMav,
      actionableMessage: `Enough to keep your muscle. Do +${deficitToMav} more ${deficitToMav === 1 ? 'set' : 'sets'} by ${targetDayName} to trigger new growth.`,
    };
  }

  if (s <= mavMax) {
    return {
      tier: 'mav',
      tierLabel: `Growth Zone (${s} sets)`,
      tierColor: '#30D158', // 🟢 Green
      currentSets: s,
      mevTarget: mev,
      mavMinTarget: mavMin,
      mavMaxTarget: mavMax,
      mrvLimit: mrv,
      actionableDeficitSets: 0,
      actionableMessage: `Weekly goal hit! You've done enough sets for maximum muscle growth this week.`,
    };
  }

  if (s <= mrv) {
    return {
      tier: 'mav',
      tierLabel: `Heavy Workload (${s} sets)`,
      tierColor: '#64D2FF', // 🔹 Ice Blue
      currentSets: s,
      mevTarget: mev,
      mavMinTarget: mavMin,
      mavMaxTarget: mavMax,
      mrvLimit: mrv,
      actionableDeficitSets: 0,
      actionableMessage: `Strong week. You're close to the max your body can recover from—no more sets needed.`,
    };
  }

  return {
    tier: 'mrv_risk',
    tierLabel: `Overworked (${s} sets)`,
    tierColor: '#FF9F0A', // 🟠 Orange Alert
    currentSets: s,
    mevTarget: mev,
    mavMinTarget: mavMin,
    mavMaxTarget: mavMax,
    mrvLimit: mrv,
    actionableDeficitSets: 0,
    actionableMessage: `Too many sets this week. Extra sets won't build more muscle and may cause joint pain—rest this muscle.`,
  };
}

export interface AntagonisticPairAnalysis {
  id: 'upper' | 'legs' | 'arms' | 'pull_balance';
  category: string;
  nameA: string;
  nameB: string;
  musclesA: MuscleSlug[];
  musclesB: MuscleSlug[];
  setsA: number;
  setsB: number;
  volA: number;
  volB: number;
  upcomingSetsA: number;
  upcomingSetsB: number;
  totalSetsA: number;
  totalSetsB: number;
  ratio: number;
  ratioFormatted: string;
  status: 'optimal' | 'lagging_a' | 'lagging_b' | 'untrained';
  statusLabel: string;
  statusColor: string;
  deficitSets: number;
  correctiveRecommendation: string;
  correctiveExerciseName?: string;
  correctiveExerciseId?: string;
  humanStatus: string;
  actionType: 'add' | 'remove' | 'none';
  removeExerciseName?: string;
  removeExerciseId?: string;
  removeDayIndex?: number;
  removeDayName?: string;
  targetDayIndex?: number;
  targetDayName?: string;
}

const PLAN_DAY_NAMES: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

interface ScheduledPlanExerciseItem {
  dayIndex: number;
  dayName: string;
  routineName: string;
  exerciseName: string;
  exerciseId?: string;
  targetSets: number;
  weights: Partial<Record<MuscleSlug, number>>;
  pattern: string;
  isVertPull: boolean;
  isHorizPull: boolean;
}

/**
 * 3. Core Antagonistic Pair Biomechanical Balance Engine
 * Plan-aware: checks logged volume + upcoming scheduled days in userGymPlan.
 * Recommends 1-tap additions for lagging movements or 1-tap removals from user's actual routine if overloaded.
 */
export function calculateAntagonisticPairs(
  logs: GymDayLog[],
  windowDays: number = 30,
  anchorDateStr?: string,
  userGymPlan?: UserGymPlanDoc | null
): AntagonisticPairAnalysis[] {
  const planSig = userGymPlan
    ? JSON.stringify(userGymPlan.customDays || {}) + (userGymPlan.updatedAt || '') + (userGymPlan.templateId || '')
    : 'default_plan';
  const todayTag = anchorDateStr || formatLocalDateStr(new Date());
  const cacheKey = `antagonistic_pairs_${generateDatasetFingerprint(logs, `${windowDays}_${todayTag}_${planSig}`)}`;
  return computeOrGetHotCache(cacheKey, () => {
    const volumeMap = calculateMacroVolumeLoad(logs, windowDays, anchorDateStr);

  const getSetsAndVol = (slugs: MuscleSlug[]) => {
    let s = 0;
    let v = 0;
    for (const slug of slugs) {
      const data = volumeMap[slug];
      if (data) {
        s += data.sets;
        v += data.volumeKg;
      }
    }
    return { sets: Math.round(s * 10) / 10, vol: Math.round(v) };
  };

  // ── Plan Awareness & Upcoming Schedule Extraction ─────────────────────────
  const anchorDate = anchorDateStr ? parseLocalDate(anchorDateStr.slice(0, 10)) : new Date();
  const currentDayIndex = anchorDate.getDay() === 0 ? 7 : anchorDate.getDay();
  const todayStr = formatLocalDateStr(anchorDate);

  const hasCompletedWorkoutToday = (logs || []).some(
    l => l.date === todayStr && (l.exercises || []).some(
      e => (e.setsLog || []).some((s: any) => s.completed && !s.isWarmup)
    )
  );
  const startUpcomingDay = hasCompletedWorkoutToday ? currentDayIndex + 1 : currentDayIndex;

  const isArnold = userGymPlan?.templateId === 'arnold';
  const basePlan = isArnold ? GYM_PLAN_ARNOLD : GYM_PLAN;

  const restDayIndex = getPrimaryRestDayIndex(userGymPlan);
  const daysUntilRestDay = (restDayIndex - currentDayIndex + 7) % 7;

  const allWeekExercises: ScheduledPlanExerciseItem[] = [];
  const upcomingExercises: ScheduledPlanExerciseItem[] = [];

  for (let d = 1; d <= 7; d++) {
    const customDay = userGymPlan?.customDays?.[d];
    const baseDay = basePlan.find(bd => bd.dayIndex === d) || basePlan[d - 1];
    const planDay: GymPlanDay | undefined = customDay || baseDay;
    if (!planDay || planDay.isRest || !planDay.exercises?.length) continue;

    const dayName = PLAN_DAY_NAMES[d] || `Day ${d}`;
    const routineName = planDay.name || dayName;

    for (const ex of planDay.exercises) {
      if (!ex.name) continue;
      const targetSets = Number(ex.targetSets) || 3;
      const weights = getExerciseMuscleWeights({ name: ex.name, muscle: ex.muscle });
      const exNameLower = ex.name.trim().toLowerCase();
      const canonKey = getCanonicalExerciseKey(exNameLower);
      const sciEntry = SCIENTIFIC_BY_NAME[exNameLower] || SCIENTIFIC_BY_NAME[canonKey];
      const pattern = sciEntry?.pattern || '';
      const isVert = pattern === 'Pull (Vertical)' || exNameLower.includes('pulldown') || exNameLower.includes('pull-up') || exNameLower.includes('chin-up');
      const isHoriz = pattern === 'Pull (Horizontal)' || exNameLower.includes('row') || exNameLower.includes('face pull') || exNameLower.includes('rear delt');

      const item: ScheduledPlanExerciseItem = {
        dayIndex: d,
        dayName,
        routineName,
        exerciseName: ex.name,
        exerciseId: ex.id,
        targetSets,
        weights,
        pattern,
        isVertPull: isVert,
        isHorizPull: isHoriz,
      };

      allWeekExercises.push(item);
      const daysFromCurrent = (d - currentDayIndex + 7) % 7;
      const isUpcoming = hasCompletedWorkoutToday
        ? (daysFromCurrent > 0 && daysFromCurrent <= daysUntilRestDay)
        : (daysFromCurrent >= 0 && daysFromCurrent <= daysUntilRestDay);

      if (isUpcoming) {
        upcomingExercises.push(item);
      }
    }
  }

  const getUpcomingSets = (slugs: MuscleSlug[], filter?: (item: ScheduledPlanExerciseItem) => boolean) => {
    let sets = 0;
    const days = new Set<string>();
    for (const item of upcomingExercises) {
      if (filter && !filter(item)) continue;
      let maxWeight = 0;
      for (const slug of slugs) {
        const w = item.weights[slug] || 0;
        if (w > maxWeight) maxWeight = w;
      }
      if (maxWeight > 0) {
        sets += item.targetSets * maxWeight;
        days.add(item.dayName);
      }
    }
    return {
      sets: Math.round(sets * 10) / 10,
      days: Array.from(days),
    };
  };

  const isPullMovement = (item: ScheduledPlanExerciseItem) => {
    const name = item.exerciseName.toLowerCase();
    return (
      item.isVertPull ||
      item.isHorizPull ||
      item.pattern.includes('Pull') ||
      name.includes('pull') ||
      name.includes('row') ||
      name.includes('chin') ||
      name.includes('curl') ||
      name.includes('shrug') ||
      name.includes('rear delt') ||
      name.includes('lat') ||
      (item.weights['upper-back'] || 0) > 0.3 ||
      (item.weights['trapezius'] || 0) > 0.5
    );
  };

  const isPushMovement = (item: ScheduledPlanExerciseItem) => {
    const name = item.exerciseName.toLowerCase();
    if (isPullMovement(item)) return false;
    return (
      item.pattern.includes('Push') ||
      item.pattern.includes('Press') ||
      name.includes('press') ||
      name.includes('push') ||
      name.includes('fly') ||
      name.includes('dip') ||
      name.includes('raise') ||
      name.includes('extension') ||
      (item.weights['chest'] || 0) >= 0.4 ||
      (item.weights['deltoids'] || 0) >= 0.4
    );
  };

  const findExerciseToRemove = (slugs: MuscleSlug[], filter?: (item: ScheduledPlanExerciseItem) => boolean) => {
    // Only search upcoming scheduled exercises so we never ask user to remove an already-completed exercise!
    const upcomingMatch = upcomingExercises.find(item => {
      if (filter && !filter(item)) return false;
      return slugs.some(slug => (item.weights[slug] || 0) >= 0.4);
    });
    if (upcomingMatch) return upcomingMatch;

    return undefined;
  };

  const findBestDayToAdd = (slugs: MuscleSlug[]) => {
    const match = upcomingExercises.find(item => slugs.some(slug => (item.weights[slug] || 0) > 0.2));
    if (match) return { dayIndex: match.dayIndex, dayName: match.dayName };
    if (upcomingExercises.length > 0) return { dayIndex: upcomingExercises[0].dayIndex, dayName: upcomingExercises[0].dayName };
    return { dayIndex: 1, dayName: 'Monday' };
  };

  // ── 1. Upper Body: Push (Chest + Delts) vs Pull (Upper Back + Traps) ───────
  const pushSlugs: MuscleSlug[] = ['chest', 'deltoids'];
  const pullSlugs: MuscleSlug[] = ['upper-back', 'trapezius'];
  const pushData = getSetsAndVol(pushSlugs);
  const pullData = getSetsAndVol(pullSlugs);
  const pushUpcoming = getUpcomingSets(pushSlugs, item => isPushMovement(item));
  const pullUpcoming = getUpcomingSets(pullSlugs, item => isPullMovement(item));
  const totalPush = Math.round((pushData.sets + pushUpcoming.sets) * 10) / 10;
  const totalPull = Math.round((pullData.sets + pullUpcoming.sets) * 10) / 10;

  const routineHasFacePullOrRows = allWeekExercises.some(item => {
    const n = item.exerciseName.toLowerCase();
    return isPullMovement(item) && (n.includes('face pull') || n.includes('row') || n.includes('rear delt'));
  });
  const routineHasPushExercise = allWeekExercises.some(item => isPushMovement(item));

  let upperStatus: AntagonisticPairAnalysis['status'] = 'optimal';
  let upperStatusLabel = 'Optimal 1:1 Balance';
  let upperHumanStatus = 'Well Balanced 🟢';
  let upperColor = '#30D158';
  let upperDeficit = 0;
  let upperRec = 'Great balance between Chest and Back. This keeps your posture straight and protects your shoulders.';
  let upperAction: AntagonisticPairAnalysis['actionType'] = 'none';
  let upperExName: string | undefined;
  let upperExId: string | undefined;
  let upperRemoveName: string | undefined;
  let upperRemoveId: string | undefined;
  let upperRemoveDayIdx: number | undefined;
  let upperRemoveDayName: string | undefined;
  const bestUpperPullDay = findBestDayToAdd(pullSlugs);
  const bestUpperPushDay = findBestDayToAdd(pushSlugs);

  if (pushData.sets === 0 && pullData.sets === 0 && totalPush === 0 && totalPull === 0) {
    upperStatus = 'untrained';
    upperStatusLabel = 'No Data';
    upperHumanStatus = 'No Workouts Logged';
    upperColor = '#8E8E93';
    upperRec = 'No chest pressing or back pulling logged or scheduled this week.';
  } else if (totalPush > 20 || (totalPush > totalPull + 8 && totalPush >= 12)) {
    const pushToRemove = findExerciseToRemove(pushSlugs, item => isPushMovement(item));
    if (pushToRemove) {
      upperStatus = 'lagging_b';
      upperStatusLabel = `Push Heavy (${Math.round(totalPush)} sets)`;
      upperHumanStatus = 'Needs Catch-Up 🔴';
      upperColor = '#FF453A';
      upperAction = 'remove';
      upperRemoveName = pushToRemove.exerciseName;
      upperRemoveId = pushToRemove.exerciseId;
      upperRemoveDayIdx = pushToRemove.dayIndex;
      upperRemoveDayName = pushToRemove.dayName;
      upperExName = 'Face Pull (Cable)';
      upperExId = 'face_pull_cable';
      upperRec = `Push volume is very high (${Math.round(totalPush)} sets). Suggest removing ${pushToRemove.exerciseName} from ${pushToRemove.dayName} or adding Face Pulls to balance shoulders.`;
    } else if (pullUpcoming.sets > 0 || routineHasFacePullOrRows || totalPull >= 8) {
      upperStatus = 'optimal';
      const setsPlanned = Math.round(pullUpcoming.sets || 3);
      upperStatusLabel = `Balanced (+${setsPlanned} Pull sets planned)`;
      upperHumanStatus = `${setsPlanned} Pull sets planned 🟢`;
      upperColor = '#30D158';
      upperAction = 'none';
      upperRec = `Upcoming pull exercises (${Math.round(totalPull)} sets planned/logged) balance your routine. No further changes needed.`;
    } else {
      upperStatus = 'lagging_b';
      upperStatusLabel = `Back lagging (${Math.round(totalPush)} vs ${Math.round(totalPull)} sets)`;
      upperHumanStatus = 'Needs Catch-Up 🔴';
      upperColor = '#FF453A';
      upperAction = 'add';
      upperExName = 'Face Pull';
      upperExId = 'rear_delts_face_pulls';
      upperRec = `Push volume is very high (${Math.round(totalPush)} sets). Add 3 sets of Face Pulls or Rows to protect your shoulders from forward rounding.`;
    }
  } else if (totalPush > totalPull + 2.5) {
    upperDeficit = Math.round(totalPush - totalPull);
    if (pullUpcoming.sets > 0 || routineHasFacePullOrRows) {
      upperStatus = 'optimal';
      const setsPlanned = Math.round(pullUpcoming.sets || 3);
      upperStatusLabel = `Balanced (+${setsPlanned} Pull sets planned)`;
      upperHumanStatus = `${setsPlanned} Pull sets planned 🟢`;
      upperColor = '#30D158';
      upperAction = 'none';
      upperRec = `Pull exercises are already scheduled in your routine (+${setsPlanned} sets). No additions needed.`;
    } else {
      upperStatus = 'lagging_b';
      upperStatusLabel = `Back lagging by ${upperDeficit} sets`;
      upperHumanStatus = `Needs ${upperDeficit} more Back sets ⚠️`;
      upperColor = '#FF453A';
      upperAction = 'add';
      upperExName = 'Face Pull';
      upperExId = 'rear_delts_face_pulls';
      upperRec = `You're training Chest much more than Back, which pulls your shoulders forward. Add 3 sets of Face Pulls or Rows.`;
    }
  } else if (totalPull > totalPush + 4) {
    upperDeficit = Math.round(totalPull - totalPush);
    if (pushUpcoming.sets > 0 || routineHasPushExercise) {
      upperStatus = 'optimal';
      const setsPlanned = Math.round(pushUpcoming.sets || 3);
      upperStatusLabel = `Balanced (+${setsPlanned} Push sets planned)`;
      upperHumanStatus = `${setsPlanned} Push sets planned 🟢`;
      upperColor = '#30D158';
      upperAction = 'none';
      upperRec = `Chest pressing is already scheduled in your routine (+${setsPlanned} sets). No additions needed.`;
    } else {
      upperStatus = 'lagging_a';
      upperStatusLabel = `Chest lagging by ${upperDeficit} sets`;
      upperHumanStatus = `Needs ${upperDeficit} more Chest sets ⚠️`;
      upperColor = '#FF9F0A';
      upperAction = 'add';
      upperExName = 'Incline Bench Press (Dumbbell)';
      upperExId = 'upper_chest_incline_dumbbell_press';
      upperRec = `You're training Back much more than Chest. Add 3 sets of Incline Dumbbell Press to keep your pressing power balanced.`;
    }
  } else {
    upperStatus = 'optimal';
    upperStatusLabel = 'Optimal 1:1 Balance';
    upperHumanStatus = 'Well Balanced 🟢';
    upperColor = '#30D158';
    upperRec = pullUpcoming.sets > 0
      ? `Great balance between Chest and Back (+${Math.round(pullUpcoming.sets)} pull sets scheduled on ${pullUpcoming.days.join(', ')}). This keeps posture straight.`
      : 'Great balance between Chest and Back. This keeps your posture straight and protects your shoulders.';
  }

  const upperRatio = totalPush > 0 && totalPull > 0
    ? Math.round((totalPull / totalPush) * 100) / 100
    : 1.0;

  // ── 2. Legs: Front Thighs (Quads) vs Back Legs (Hamstrings + Glutes) ────────
  const isPosteriorLeg = (item: ScheduledPlanExerciseItem) => {
    const name = item.exerciseName.toLowerCase();
    return (
      name.includes('deadlift') ||
      name.includes('rdl') ||
      name.includes('leg curl') ||
      name.includes('glute') ||
      name.includes('hip') ||
      name.includes('bridge') ||
      (item.weights['hamstring'] || 0) > 0.4 ||
      (item.weights['gluteal'] || 0) > 0.4
    );
  };
  const isQuadMovement = (item: ScheduledPlanExerciseItem) => {
    const name = item.exerciseName.toLowerCase();
    if (isPosteriorLeg(item)) return false;
    return (
      name.includes('squat') ||
      name.includes('press') ||
      name.includes('lunge') ||
      name.includes('extension') ||
      (item.weights['quadriceps'] || 0) >= 0.4
    );
  };

  const quadSlugs: MuscleSlug[] = ['quadriceps'];
  const postSlugs: MuscleSlug[] = ['hamstring', 'gluteal'];
  const quadData = getSetsAndVol(quadSlugs);
  const postData = getSetsAndVol(postSlugs);
  const quadUpcoming = getUpcomingSets(quadSlugs, item => isQuadMovement(item));
  const postUpcoming = getUpcomingSets(postSlugs, item => isPosteriorLeg(item));
  const totalQuads = Math.round((quadData.sets + quadUpcoming.sets) * 10) / 10;
  const totalPost = Math.round((postData.sets + postUpcoming.sets) * 10) / 10;

  const routineHasPosterior = allWeekExercises.some(item => isPosteriorLeg(item));
  const routineHasQuad = allWeekExercises.some(item => isQuadMovement(item));

  let legStatus: AntagonisticPairAnalysis['status'] = 'optimal';
  let legStatusLabel = 'Even Leg Balance';
  let legHumanStatus = 'Well Balanced 🟢';
  let legColor = '#30D158';
  let legDeficit = 0;
  let legRec = 'Front and back leg muscles are evenly trained, keeping your knees and lower back safe.';
  let legAction: AntagonisticPairAnalysis['actionType'] = 'none';
  let legExName: string | undefined;
  let legExId: string | undefined;
  let legRemoveName: string | undefined;
  let legRemoveId: string | undefined;
  let legRemoveDayIdx: number | undefined;
  let legRemoveDayName: string | undefined;
  const bestLegB_Day = findBestDayToAdd(postSlugs);
  const bestLegA_Day = findBestDayToAdd(quadSlugs);

  if (quadData.sets === 0 && postData.sets === 0 && totalQuads === 0 && totalPost === 0) {
    legStatus = 'untrained';
    legStatusLabel = 'No Data';
    legHumanStatus = 'No Leg Sessions';
    legColor = '#8E8E93';
    legRec = 'No leg sessions logged or scheduled this week.';
  } else if (totalQuads > 20 || (totalQuads > totalPost + 8 && totalQuads >= 12)) {
    const quadToRemove = findExerciseToRemove(quadSlugs, item => isQuadMovement(item));
    if (quadToRemove) {
      legStatus = 'lagging_b';
      legStatusLabel = `Quad Heavy (${Math.round(totalQuads)} sets)`;
      legHumanStatus = 'Needs Catch-Up 🔴';
      legColor = '#FF453A';
      legAction = 'remove';
      legRemoveName = quadToRemove.exerciseName;
      legRemoveId = quadToRemove.exerciseId;
      legRemoveDayIdx = quadToRemove.dayIndex;
      legRemoveDayName = quadToRemove.dayName;
      legExName = 'Romanian Deadlift (Barbell)';
      legExId = 'rdl_barbell';
      legRec = `High Quad volume (${Math.round(totalQuads)} sets). Suggest removing ${quadToRemove.exerciseName} from ${quadToRemove.dayName} or adding RDLs to balance leg load.`;
    } else if (postUpcoming.sets > 0 || routineHasPosterior || totalPost >= 8) {
      legStatus = 'optimal';
      const setsPlanned = Math.round(postUpcoming.sets || 3);
      legStatusLabel = `Balanced (+${setsPlanned} Back Leg sets planned)`;
      legHumanStatus = `${setsPlanned} Back Leg sets planned 🟢`;
      legColor = '#30D158';
      legAction = 'none';
      legRec = `Hamstring and glute exercises (${Math.round(totalPost)} sets planned/logged) balance your leg load.`;
    } else {
      legStatus = 'lagging_b';
      legStatusLabel = `Back Legs lagging (${Math.round(totalQuads)} vs ${Math.round(totalPost)} sets)`;
      legHumanStatus = 'Needs Catch-Up 🔴';
      legColor = '#FF453A';
      legAction = 'add';
      legExName = 'Romanian Deadlift (Barbell)';
      legExId = 'hamstrings_romanian_deadlifts_rdls';
      legRec = `Front thighs are working much harder than hamstrings. Add 3 sets of Romanian Deadlifts or Leg Curls to protect knees and hips.`;
    }
  } else if (totalQuads > totalPost + 2.5) {
    legDeficit = Math.round(totalQuads - totalPost);
    if (postUpcoming.sets > 0 || routineHasPosterior) {
      legStatus = 'optimal';
      const setsPlanned = Math.round(postUpcoming.sets || 3);
      legStatusLabel = `Balanced (+${setsPlanned} Back Leg sets planned)`;
      legHumanStatus = `${setsPlanned} Back Leg sets planned 🟢`;
      legColor = '#30D158';
      legAction = 'none';
      legRec = `Hamstring and glute exercises are already scheduled in your routine (+${setsPlanned} sets). No additions needed.`;
    } else {
      legStatus = 'lagging_b';
      legStatusLabel = `Back Legs lagging by ${legDeficit} sets`;
      legHumanStatus = `Needs ${legDeficit} more Back Leg sets ⚠️`;
      legColor = '#FF453A';
      legAction = 'add';
      legExName = 'Romanian Deadlift (Barbell)';
      legExId = 'hamstrings_romanian_deadlifts_rdls';
      legRec = `Front thighs are working much harder than hamstrings and glutes. Add 3 sets of Romanian Deadlifts or Leg Curls to protect knees and hips.`;
    }
  } else if (totalPost > totalQuads + 4) {
    legDeficit = Math.round(totalPost - totalQuads);
    if (quadUpcoming.sets > 0 || routineHasQuad) {
      legStatus = 'optimal';
      const setsPlanned = Math.round(quadUpcoming.sets || 3);
      legStatusLabel = `Balanced (+${setsPlanned} Quad sets planned)`;
      legHumanStatus = `${setsPlanned} Quad sets planned 🟢`;
      legColor = '#30D158';
      legAction = 'none';
      legRec = `Quad exercises are already scheduled in your routine (+${setsPlanned} sets). No additions needed.`;
    } else {
      legStatus = 'lagging_a';
      legStatusLabel = `Quads lagging by ${legDeficit} sets`;
      legHumanStatus = `Needs ${legDeficit} more Quad sets ⚠️`;
      legColor = '#FF9F0A';
      legAction = 'add';
      legExName = 'Hack Squat (Machine)';
      legExId = 'quads_hack_squats';
      legRec = `Back leg muscles are getting more work than your quads. Add 3 sets of Hack Squats or Leg Extensions.`;
    }
  } else {
    legStatus = 'optimal';
    legStatusLabel = 'Even Leg Balance';
    legHumanStatus = 'Well Balanced 🟢';
    legColor = '#30D158';
    legRec = postUpcoming.sets > 0
      ? `Front and back leg muscles are evenly balanced this week (+${Math.round(postUpcoming.sets)} back leg sets scheduled on ${postUpcoming.days.join(', ')}).`
      : 'Front and back leg muscles are evenly trained, keeping your knees and lower back safe.';
  }

  const legRatio = totalQuads > 0 && totalPost > 0
    ? Math.round((totalPost / totalQuads) * 100) / 100
    : 1.0;

  // ── 3. Arms: Biceps vs Triceps ────────────────────────────────────────────
  const biSlugs: MuscleSlug[] = ['biceps'];
  const triSlugs: MuscleSlug[] = ['triceps'];
  const biData = getSetsAndVol(biSlugs);
  const triData = getSetsAndVol(triSlugs);
  const isTricepMovement = (item: ScheduledPlanExerciseItem) => {
    const name = item.exerciseName.toLowerCase();
    return (
      name.includes('tricep') ||
      name.includes('pushdown') ||
      name.includes('kickback') ||
      name.includes('skull crusher') ||
      name.includes('overhead') ||
      (item.weights['triceps'] || 0) >= 0.4
    );
  };

  const isBicepMovement = (item: ScheduledPlanExerciseItem) => {
    const name = item.exerciseName.toLowerCase();
    return (
      name.includes('curl') ||
      name.includes('bicep') ||
      name.includes('chin') ||
      (item.weights['biceps'] || 0) >= 0.4
    );
  };

  const biUpcoming = getUpcomingSets(biSlugs, item => isBicepMovement(item));
  const triUpcoming = getUpcomingSets(triSlugs, item => isTricepMovement(item));
  const totalBi = Math.round((biData.sets + biUpcoming.sets) * 10) / 10;
  const totalTri = Math.round((triData.sets + triUpcoming.sets) * 10) / 10;

  const routineHasBiceps = allWeekExercises.some(item => isBicepMovement(item));
  const routineHasTriceps = allWeekExercises.some(item => isTricepMovement(item));

  let armStatus: AntagonisticPairAnalysis['status'] = 'optimal';
  let armStatusLabel = 'Balanced Arm Ratio';
  let armHumanStatus = 'Well Balanced 🟢';
  let armColor = '#30D158';
  let armDeficit = 0;
  let armRec = 'Biceps and triceps are evenly matched for strong arms and healthy elbow joints.';
  let armAction: AntagonisticPairAnalysis['actionType'] = 'none';
  let armExName: string | undefined;
  let armExId: string | undefined;
  let armRemoveName: string | undefined;
  let armRemoveId: string | undefined;
  let armRemoveDayIdx: number | undefined;
  let armRemoveDayName: string | undefined;
  const bestArmB_Day = findBestDayToAdd(triSlugs);
  const bestArmA_Day = findBestDayToAdd(biSlugs);

  if (biData.sets === 0 && triData.sets === 0 && totalBi === 0 && totalTri === 0) {
    armStatus = 'untrained';
    armStatusLabel = 'No Data';
    armHumanStatus = 'No Direct Arm Work';
    armColor = '#8E8E93';
    armRec = 'No direct arm work logged or scheduled this week.';
  } else if (totalBi > totalTri + 2.5) {
    armDeficit = Math.round(totalBi - totalTri);
    if (triUpcoming.sets > 0 || routineHasTriceps) {
      armStatus = 'optimal';
      const setsPlanned = Math.round(triUpcoming.sets || 3);
      armStatusLabel = `Balanced (+${setsPlanned} Tricep sets planned)`;
      armHumanStatus = `${setsPlanned} Tricep sets planned 🟢`;
      armColor = '#30D158';
      armAction = 'none';
      armRec = `Triceps training is already scheduled in your routine (+${setsPlanned} sets). No additions needed.`;
    } else {
      armStatus = 'lagging_b';
      armStatusLabel = `Triceps lagging by ${armDeficit} sets`;
      armHumanStatus = `Needs ${armDeficit} more Tricep sets ⚠️`;
      armColor = '#FF453A';
      armAction = 'add';
      armExName = 'Overhead Triceps Extension (Cable)';
      armExId = 'long_tricep_overhead_cable_extensions';
      armRec = `Biceps are getting more work than triceps. Add 3 sets of Overhead Cable Extensions to balance your arms.`;
    }
  } else if (totalTri > totalBi + 3.5) {
    armDeficit = Math.round(totalTri - totalBi);
    if (biUpcoming.sets > 0 || routineHasBiceps) {
      armStatus = 'optimal';
      const setsPlanned = Math.round(biUpcoming.sets || 3);
      armStatusLabel = `Balanced (+${setsPlanned} Bicep sets planned)`;
      armHumanStatus = `${setsPlanned} Bicep sets planned 🟢`;
      armColor = '#30D158';
      armAction = 'none';
      armRec = `Biceps training is already scheduled in your routine (+${setsPlanned} sets). No additions needed.`;
    } else {
      armStatus = 'lagging_a';
      armStatusLabel = `Biceps lagging by ${armDeficit} sets`;
      armHumanStatus = `Needs ${armDeficit} more Bicep sets ⚠️`;
      armColor = '#FF9F0A';
      armAction = 'add';
      armExName = 'EZ Bar Biceps Curl';
      armExId = 'short_bicep_standing_ez_bar_curls';
      armRec = `Triceps are getting more work than biceps. Add 3 sets of EZ Bar Curls to balance your arm strength.`;
    }
  } else {
    armStatus = 'optimal';
    armStatusLabel = 'Balanced Arm Ratio';
    armHumanStatus = 'Well Balanced 🟢';
    armColor = '#30D158';
    armRec = triUpcoming.sets > 0
      ? `Biceps and triceps are evenly matched this week (+${Math.round(triUpcoming.sets)} tricep sets scheduled on ${triUpcoming.days.join(', ')}).`
      : 'Biceps and triceps are evenly matched for strong arms and healthy elbow joints.';
  }

  const armRatio = totalBi > 0 && totalTri > 0
    ? Math.round((totalTri / totalBi) * 100) / 100
    : 1.0;

  // ── 4. Back Balance: Vertical Pull vs Horizontal Pull ─────────────────────
  let vertPullSets = 0;
  let horizPullSets = 0;
  let vertPullVol = 0;
  let horizPullVol = 0;

  const nowMs = resolveAnchorTimestamp(anchorDateStr);
  const winMs = windowDays === 0 ? Infinity : windowDays * 86400000;

  for (const log of logs || []) {
    if (!log.date) continue;
    const logTime = resolveLogTimestamp(log);
    if (winMs !== Infinity && (nowMs - logTime > winMs || logTime > nowMs + 86400000)) continue;

    for (const ex of log.exercises || []) {
      if (ex.skipped) continue;
      const exName = (ex.name || '').trim().toLowerCase();
      const canonKey = getCanonicalExerciseKey(exName);
      const sciEntry = SCIENTIFIC_BY_NAME[exName] || SCIENTIFIC_BY_NAME[canonKey];
      const pattern = sciEntry?.pattern || '';

      const mult = getVolumeMultiplier(ex.name);
      for (const s of ex.setsLog || []) {
        if (!s.completed || s.isWarmup) continue;
        const w = Number(s.weight) || 0;
        const r = Number(s.reps) || 0;
        const setTonnage = w * r * mult;

        if (pattern === 'Pull (Vertical)' || exName.includes('pulldown') || exName.includes('pull-up') || exName.includes('chin-up')) {
          vertPullSets += 1;
          vertPullVol += setTonnage;
        } else if (pattern === 'Pull (Horizontal)' || exName.includes('row') || exName.includes('face pull') || exName.includes('rear delt')) {
          horizPullSets += 1;
          horizPullVol += setTonnage;
        }
      }
    }
  }

  const vertUpcoming = getUpcomingSets(['upper-back'], item => item.isVertPull);
  const horizUpcoming = getUpcomingSets(['upper-back', 'trapezius'], item => item.isHorizPull);
  const totalVert = Math.round((vertPullSets + vertUpcoming.sets) * 10) / 10;
  const totalHoriz = Math.round((horizPullSets + horizUpcoming.sets) * 10) / 10;

  const routineHasVertPull = allWeekExercises.some(item => item.isVertPull);
  const routineHasHorizPull = allWeekExercises.some(item => item.isHorizPull);

  let pullStatus: AntagonisticPairAnalysis['status'] = 'optimal';
  let pullStatusLabel = 'Balanced Pull Planes';
  let pullHumanStatus = 'Well Balanced 🟢';
  let pullColor = '#30D158';
  let pullDeficit = 0;
  let pullRec = 'Balanced vertical and horizontal pulling keeps your shoulders healthy and gives you a thick, wide back.';
  let pullAction: AntagonisticPairAnalysis['actionType'] = 'none';
  let pullExName: string | undefined;
  let pullExId: string | undefined;
  let pullRemoveName: string | undefined;
  let pullRemoveId: string | undefined;
  let pullRemoveDayIdx: number | undefined;
  let pullRemoveDayName: string | undefined;
  const bestVertDay = findBestDayToAdd(['upper-back']);
  const bestHorizDay = findBestDayToAdd(['upper-back', 'trapezius']);

  if (vertPullSets === 0 && horizPullSets === 0 && totalVert === 0 && totalHoriz === 0) {
    pullStatus = 'untrained';
    pullStatusLabel = 'No Data';
    pullHumanStatus = 'No Back Pulling';
    pullColor = '#8E8E93';
    pullRec = 'No back pulling movements logged or scheduled this week.';
  } else if (totalVert > totalHoriz + 2.5) {
    pullDeficit = Math.round(totalVert - totalHoriz);
    if (horizUpcoming.sets > 0 || routineHasHorizPull) {
      pullStatus = 'optimal';
      const setsPlanned = Math.round(horizUpcoming.sets || 3);
      pullStatusLabel = `Balanced (+${setsPlanned} Row sets planned)`;
      pullHumanStatus = `${setsPlanned} Row sets planned 🟢`;
      pullColor = '#30D158';
      pullAction = 'none';
      pullRec = `Horizontal rows are already scheduled in your routine (+${setsPlanned} sets). No additions needed.`;
    } else {
      pullStatus = 'lagging_b';
      pullStatusLabel = `Rows lagging by ${pullDeficit} sets`;
      pullHumanStatus = `Needs ${pullDeficit} more Row sets ⚠️`;
      pullColor = '#FF9F0A';
      pullAction = 'add';
      pullExName = 'Face Pull';
      pullExId = 'rear_delts_face_pulls';
      pullRec = `You're doing more pulldowns than rows. Add 3 sets of Face Pulls or Rows to build back thickness and pull your shoulders back.`;
    }
  } else if (totalHoriz > totalVert + 3.5) {
    pullDeficit = Math.round(totalHoriz - totalVert);
    if (vertUpcoming.sets > 0 || routineHasVertPull) {
      pullStatus = 'optimal';
      const setsPlanned = Math.round(vertUpcoming.sets || 3);
      pullStatusLabel = `Balanced (+${setsPlanned} Pulldown sets planned)`;
      pullHumanStatus = `${setsPlanned} Pulldown sets planned 🟢`;
      pullColor = '#30D158';
      pullAction = 'none';
      pullRec = `Vertical pulls are already scheduled in your routine (+${setsPlanned} sets). No additions needed.`;
    } else {
      pullStatus = 'lagging_a';
      pullStatusLabel = `Vertical pull lagging by ${pullDeficit} sets`;
      pullHumanStatus = `Needs ${pullDeficit} more Pulldown sets ⚠️`;
      pullColor = '#FF9F0A';
      pullAction = 'add';
      pullExName = 'Lat Pulldown (Cable)';
      pullExId = 'lat_width_lat_pulldowns_standard';
      pullRec = `You're doing more rows than pulldowns. Add 3 sets of Lat Pulldowns to build back width.`;
    }
  } else {
    pullStatus = 'optimal';
    pullStatusLabel = 'Balanced Pull Planes';
    pullHumanStatus = 'Well Balanced 🟢';
    pullColor = '#30D158';
    pullRec = horizUpcoming.sets > 0
      ? `Balanced vertical and horizontal pulling (+${Math.round(horizUpcoming.sets)} row sets scheduled on ${horizUpcoming.days.join(', ')}). Excellent posture and shoulder health.`
      : 'Balanced vertical and horizontal pulling keeps your shoulders healthy and gives you a thick, wide back.';
  }

  const pullRatio = totalVert > 0 && totalHoriz > 0
    ? Math.round((totalHoriz / totalVert) * 100) / 100
    : 1.0;

  return [
    {
      id: 'upper',
      category: 'Upper Body',
      nameA: 'Push (Chest & Shoulders)',
      nameB: 'Pull (Back & Traps)',
      musclesA: pushSlugs,
      musclesB: pullSlugs,
      setsA: pushData.sets,
      setsB: pullData.sets,
      volA: pushData.vol,
      volB: pullData.vol,
      upcomingSetsA: pushUpcoming.sets,
      upcomingSetsB: pullUpcoming.sets,
      totalSetsA: totalPush,
      totalSetsB: totalPull,
      ratio: upperRatio,
      ratioFormatted: `${upperRatio}x`,
      status: upperStatus,
      statusLabel: upperStatusLabel,
      humanStatus: upperHumanStatus,
      statusColor: upperColor,
      deficitSets: upperDeficit,
      correctiveRecommendation: upperRec,
      correctiveExerciseName: upperExName,
      correctiveExerciseId: upperExId,
      actionType: upperAction,
      removeExerciseName: upperRemoveName,
      removeExerciseId: upperRemoveId,
      removeDayIndex: upperRemoveDayIdx,
      removeDayName: upperRemoveDayName,
      targetDayIndex: upperStatus === 'lagging_a' ? bestUpperPushDay.dayIndex : bestUpperPullDay.dayIndex,
      targetDayName: upperStatus === 'lagging_a' ? bestUpperPushDay.dayName : bestUpperPullDay.dayName,
    },
    {
      id: 'pull_balance',
      category: 'Back Balance',
      nameA: 'Back Width (Pulldowns)',
      nameB: 'Back Thickness (Rows)',
      musclesA: ['upper-back'],
      musclesB: ['upper-back', 'trapezius'],
      setsA: Math.round(vertPullSets * 10) / 10,
      setsB: Math.round(horizPullSets * 10) / 10,
      volA: Math.round(vertPullVol),
      volB: Math.round(horizPullVol),
      upcomingSetsA: vertUpcoming.sets,
      upcomingSetsB: horizUpcoming.sets,
      totalSetsA: totalVert,
      totalSetsB: totalHoriz,
      ratio: pullRatio,
      ratioFormatted: `${pullRatio}x`,
      status: pullStatus,
      statusLabel: pullStatusLabel,
      humanStatus: pullHumanStatus,
      statusColor: pullColor,
      deficitSets: pullDeficit,
      correctiveRecommendation: pullRec,
      correctiveExerciseName: pullExName,
      correctiveExerciseId: pullExId,
      actionType: pullAction,
      removeExerciseName: pullRemoveName,
      removeExerciseId: pullRemoveId,
      removeDayIndex: pullRemoveDayIdx,
      removeDayName: pullRemoveDayName,
      targetDayIndex: pullStatus === 'lagging_a' ? bestVertDay.dayIndex : bestHorizDay.dayIndex,
      targetDayName: pullStatus === 'lagging_a' ? bestVertDay.dayName : bestHorizDay.dayName,
    },
    {
      id: 'legs',
      category: 'Legs',
      nameA: 'Front Thighs (Quads)',
      nameB: 'Back Legs (Hamstrings & Glutes)',
      musclesA: quadSlugs,
      musclesB: postSlugs,
      setsA: quadData.sets,
      setsB: postData.sets,
      volA: quadData.vol,
      volB: postData.vol,
      upcomingSetsA: quadUpcoming.sets,
      upcomingSetsB: postUpcoming.sets,
      totalSetsA: totalQuads,
      totalSetsB: totalPost,
      ratio: legRatio,
      ratioFormatted: `${legRatio}x`,
      status: legStatus,
      statusLabel: legStatusLabel,
      humanStatus: legHumanStatus,
      statusColor: legColor,
      deficitSets: legDeficit,
      correctiveRecommendation: legRec,
      correctiveExerciseName: legExName,
      correctiveExerciseId: legExId,
      actionType: legAction,
      removeExerciseName: legRemoveName,
      removeExerciseId: legRemoveId,
      removeDayIndex: legRemoveDayIdx,
      removeDayName: legRemoveDayName,
      targetDayIndex: legStatus === 'lagging_a' ? bestLegA_Day.dayIndex : bestLegB_Day.dayIndex,
      targetDayName: legStatus === 'lagging_a' ? bestLegA_Day.dayName : bestLegB_Day.dayName,
    },
    {
      id: 'arms',
      category: 'Arms',
      nameA: 'Biceps',
      nameB: 'Triceps',
      musclesA: biSlugs,
      musclesB: triSlugs,
      setsA: biData.sets,
      setsB: triData.sets,
      volA: biData.vol,
      volB: triData.vol,
      upcomingSetsA: biUpcoming.sets,
      upcomingSetsB: triUpcoming.sets,
      totalSetsA: totalBi,
      totalSetsB: totalTri,
      ratio: armRatio,
      ratioFormatted: `${armRatio}x`,
      status: armStatus,
      statusLabel: armStatusLabel,
      humanStatus: armHumanStatus,
      statusColor: armColor,
      deficitSets: armDeficit,
      correctiveRecommendation: armRec,
      correctiveExerciseName: armExName,
      correctiveExerciseId: armExId,
      actionType: armAction,
      removeExerciseName: armRemoveName,
      removeExerciseId: armRemoveId,
      removeDayIndex: armRemoveDayIdx,
      removeDayName: armRemoveDayName,
      targetDayIndex: armStatus === 'lagging_a' ? bestArmA_Day.dayIndex : bestArmB_Day.dayIndex,
      targetDayName: armStatus === 'lagging_a' ? bestArmA_Day.dayName : bestArmB_Day.dayName,
    },
  ];
  });
}
