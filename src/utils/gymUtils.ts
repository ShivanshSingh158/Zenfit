import { estimate1RM } from '../services/oneRepMaxEngine';
import { resolveExerciseBiometrics } from './exerciseClassifier';
import { getCanonicalExerciseKey } from '../data/exerciseAliasMap';
import { GymExerciseLog, GymDayLog, GymSet } from '../types/gym.types';
import { computeOrGetHotCache, generateDatasetFingerprint } from './hotCacheStore';
export { computeOrGetHotCache, generateDatasetFingerprint };

let _cachedDb: any[] | null = null;
export function getExerciseDatabase(): any[] {
  if (!_cachedDb) {
    const db = require('../data/exerciseDatabase')?.EXERCISE_DATABASE;
    if (Array.isArray(db) && db.length > 0) _cachedDb = db;
    else return [];
  }
  return _cachedDb;
}

export const MUSCLE_COLORS: Record<string, string> = {
  'Chest': '#FF6B6B', 'Back': '#0A84FF', 'Shoulders': '#38BDF8',
  'Side Delts': '#60A5FA', 'Rear Delts': '#2563EB', 'Triceps': '#30D158',
  'Biceps': '#32ADE6', 'Brachialis': '#0EA5E9', 'Forearms': '#0284C7',
  'Quads': '#FF9F0A', 'Hamstrings': '#FF7849', 'Glutes/Hams': '#FF8787',
  'Quads/Glutes': '#FFA94D', 'Calves': '#64D2FF', 'Soleus': '#5AC8FA',
  'Abs': '#FF6482', 'Core': '#FF453A', 'Obliques': '#FF375F',
  'Upper Back / Rear Delts': '#007AFF', 'Serratus / Pec Minor': '#FF9F0A',
  'Upper Chest': '#FF6B6B', 'Mid Chest': '#FF6B6B', 'Lower Chest': '#FF6B6B',
  'Lat Width': '#0A84FF', 'Mid-Back': '#0A84FF',
  'Front Delts': '#38BDF8', 'Upper Traps': '#007AFF',
  'Long Tricep': '#30D158', 'Lat/Med Tricep': '#30D158',
  'Short Bicep': '#32ADE6', 'Long Bicep': '#32ADE6',
  'Quad Teardrop': '#FF9F0A', 'Glutes/Abductors': '#FF8787',
  'Gastrocnemius': '#64D2FF',
  'Upper Abs': '#FF6482', 'Lower Abs': '#FF6482', 'Transverse Abs': '#FF6482',
  'Forearm Flexors': '#0284C7', 'Forearm Extensors': '#0284C7', 'Brachioradialis': '#0284C7',
  'Lats': '#0A84FF', 'Glutes': '#FF8787', 'Traps': '#007AFF', 'Full Body': '#0A84FF'
};

const MUSCLE_COLORS_LOWER = new Map<string, string>(
  Object.entries(MUSCLE_COLORS).map(([k, v]) => [k.toLowerCase(), v])
);

export const MUSCLE_CANONICAL: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  'side delts': 'Shoulders',
  triceps: 'Triceps',
  biceps: 'Biceps',
  brachialis: 'Biceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
  abs: 'Abs',
  forearms: 'Forearms',
  glutes: 'Glutes',
  'glutes/abductors': 'Glutes/Abductors',
  'glutes/abductors (outer glutes)': 'Glutes/Abductors',
  'gluteus medius': 'Glutes/Abductors',
  abductor: 'Glutes/Abductors',
  'gluteus maximus': 'Glutes',
  'glutes/hams': 'Glutes',
  traps: 'Traps',
  mixed: 'Mixed',
  // Micro-targets
  'upper chest': 'Chest',
  'mid chest': 'Chest',
  'lower chest': 'Chest',
  'lat width': 'Back',
  'mid-back': 'Back',
  'lower back': 'Back',
  'front delts': 'Shoulders',
  'rear delts': 'Shoulders',
  'upper traps': 'Traps',
  'long tricep': 'Triceps',
  'lat/med tricep': 'Triceps',
  'short bicep': 'Biceps',
  'long bicep': 'Biceps',
  'quad teardrop': 'Quads',
  'glutes/quads': 'Quads',
  'quads/glutes': 'Quads',
  'gastrocnemius': 'Calves',
  'soleus': 'Calves',
  'upper abs': 'Abs',
  'lower abs': 'Abs',
  'transverse abs': 'Abs',
  'obliques': 'Abs',
  'forearm flexors': 'Forearms',
  'forearm extensors': 'Forearms',
  'forearm extensors (outside)': 'Forearms',
  'forearm flexors (inside)': 'Forearms',
  'brachioradialis': 'Forearms',
  'grip': 'Forearms',
  'wrist': 'Forearms',
};

export function canonicalizeMuscle(muscle?: string): string {
  if (!muscle) return 'Mixed';
  const clean = muscle.trim().toLowerCase();
  
  // 1. Direct dictionary match
  if (MUSCLE_CANONICAL[clean]) {
    return MUSCLE_CANONICAL[clean];
  }

  // 2. Pattern-based grouping (Issue 51: Glutes & Abductors separated from Hamstrings)
  if (clean.includes('forearm') || clean.includes('wrist') || clean.includes('brachio') || clean.includes('grip')) {
    return 'Forearms';
  }
  if (clean.includes('abductor') || clean.includes('adductor')) {
    return 'Glutes/Abductors';
  }
  if (clean.includes('glute') && !clean.includes('ham') && !clean.includes('ghr')) {
    return 'Glutes';
  }
  if (clean.includes('hamstring') || clean.includes('hams') || clean.includes('glute ham') || clean.includes('ghr')) {
    return 'Hamstrings';
  }
  if (clean.includes('chest') || clean.includes('pec')) {
    return 'Chest';
  }
  if (clean.includes('lat') || clean.includes('back') || clean.includes('erector')) {
    return 'Back';
  }
  if (clean.includes('delt') || clean.includes('shoulder')) {
    return 'Shoulders';
  }
  if (clean.includes('tricep')) {
    return 'Triceps';
  }
  if (clean.includes('bicep')) {
    return 'Biceps';
  }
  if (clean.includes('quad')) {
    return 'Quads';
  }
  if (clean.includes('calv') || clean.includes('soleus') || clean.includes('gastro')) {
    return 'Calves';
  }
  if (clean.includes('ab') || clean.includes('core') || clean.includes('oblique')) {
    return 'Abs';
  }
  if (clean.includes('trap')) {
    return 'Traps';
  }

  // Capitalize each word properly as fallback
  return clean
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const resolveMuscleColor = (m: string | undefined | null) => {
  if (!m) return '#0A84FF';
  return MUSCLE_COLORS_LOWER.get(m.trim().toLowerCase()) ?? '#0A84FF';
};

export type ExerciseEquipmentType = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'smith' | 'ez_bar' | 'other';

export interface ExerciseEquipmentInfo {
  type: ExerciseEquipmentType;
  label: string;
  iconName: string;
}

export function resolveExerciseEquipment(exerciseName?: string | null): ExerciseEquipmentInfo {
  if (!exerciseName) {
    return { type: 'other', label: 'Weight', iconName: 'barbell-outline' };
  }
  const n = exerciseName.toLowerCase();
  // Issue #63 & #145: Check specific equipment keywords before generic movement names like 'extension'
  if (n.includes('smith')) {
    return { type: 'smith', label: 'Smith Machine', iconName: 'git-compare-outline' };
  }
  if (n.includes('dumbbell') || n.includes('db ') || n.includes('db-') || n.includes('(db)')) {
    return { type: 'dumbbell', label: 'Dumbbell', iconName: 'fitness-outline' };
  }
  if (n.includes('ez bar') || n.includes('ez-bar') || n.includes('ez curl') || n.includes('skull crusher') || n.includes('skullcrusher') || n.includes('preacher curl')) {
    return { type: 'ez_bar', label: 'EZ Bar', iconName: 'barbell-outline' };
  }
  if (n.includes('barbell') || n.includes('bb ') || n.includes('deadlift') || (n.includes('squat') && !n.includes('goblet')) || n.includes('bench press')) {
    return { type: 'barbell', label: 'Barbell', iconName: 'barbell-outline' };
  }
  if (n.includes('cable') || n.includes('pulley') || n.includes('pushdown') || n.includes('pulldown') || n.includes('face pull') || n.includes('crossover')) {
    return { type: 'cable', label: 'Cable', iconName: 'swap-vertical-outline' };
  }
  if (n.includes('machine') || n.includes('leg press') || n.includes('hack') || n.includes('pec deck') || n.includes('chest press') || n.includes('leg extension') || n.includes('curl machine') || n.includes('seated row')) {
    return { type: 'machine', label: 'Machine', iconName: 'hardware-chip-outline' };
  }
  if (n.includes('pull-up') || n.includes('pullup') || n.includes('chin-up') || n.includes('chinup') || n.includes('dip') || n.includes('push-up') || n.includes('pushup') || n.includes('crunch') || n.includes('plank') || n.includes('hanging leg') || n.includes('bodyweight') || n.includes('calisthenic')) {
    return { type: 'bodyweight', label: 'Bodyweight', iconName: 'body-outline' };
  }
  return { type: 'other', label: 'Exercise', iconName: 'barbell-outline' };
}

/**
 * Formats date into Indian Standard Date format: 'DD/MM/YYYY'
 * Example: '2026-07-22' -> '22/07/2026'
 */
export function formatIndianDate(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const clean = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      const parts = clean.slice(0, 10).split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  const dateObj = typeof dateInput === 'number' ? new Date(dateInput) : (dateInput instanceof Date ? dateInput : new Date(dateInput));
  if (isNaN(dateObj.getTime())) return String(dateInput);
  const d = String(dateObj.getDate()).padStart(2, '0');
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const y = dateObj.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Formats date into Pretty Indian Date format: '22 Jul 2026'
 */
export function formatIndianDatePretty(dateInput?: string | number | Date | null, fullMonth: boolean = false): string {
  if (!dateInput) return '';
  let y: number, m: number, d: number;
  if (typeof dateInput === 'string') {
    const clean = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      const parts = clean.slice(0, 10).split('-').map(Number);
      [y, m, d] = parts;
    } else {
      const dateObj = new Date(dateInput);
      if (isNaN(dateObj.getTime())) return String(dateInput);
      y = dateObj.getFullYear(); m = dateObj.getMonth() + 1; d = dateObj.getDate();
    }
  } else {
    const dateObj = typeof dateInput === 'number' ? new Date(dateInput) : (dateInput instanceof Date ? dateInput : new Date(dateInput));
    if (isNaN(dateObj.getTime())) return String(dateInput);
    y = dateObj.getFullYear(); m = dateObj.getMonth() + 1; d = dateObj.getDate();
  }

  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = fullMonth ? monthsFull[m - 1] : monthsShort[m - 1];
  return `${d} ${monthName} ${y}`;
}

export const hexToRgba = (hex: string, alpha: number = 1): string => {
  if (!hex || typeof hex !== 'string') return `rgba(0, 0, 0, ${alpha})`;
  if (hex === 'transparent') return `rgba(0, 0, 0, 0)`;
  if (hex.startsWith('rgb')) {
    const nums = hex.match(/\d+(\.\d+)?/g);
    if (nums && nums.length >= 3) {
      return `rgba(${nums[0]}, ${nums[1]}, ${nums[2]}, ${alpha})`;
    }
    return hex;
  }
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  let r = 0, g = 0, b = 0;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16) || 0;
    g = parseInt(clean[1] + clean[1], 16) || 0;
    b = parseInt(clean[2] + clean[2], 16) || 0;
  } else if (clean.length === 6 || clean.length === 8) {
    r = parseInt(clean.slice(0, 2), 16) || 0;
    g = parseInt(clean.slice(2, 4), 16) || 0;
    b = parseInt(clean.slice(4, 6), 16) || 0;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Qualifies a gym log as a legitimate workout session:
 * Requires logging at least 1 completed exercise (or set) from the routine, or a completed cardio session,
 * or an explicitly finished workout log with recorded sets/exercises.
 */
export function isValidWorkoutSession(log: any): boolean {
  if (!log) return false;
  const completedExercises = (log.exercises ?? []).filter(
    (e: any) => !e.skipped && (e.setsLog ?? []).some((s: any) => s.completed && !s.isWarmup),
  ).length;

  const hasCompletedSets = (log.exercises ?? []).some(
    (e: any) => !e.skipped && (e.setsLog ?? []).some((s: any) => s.completed && !s.isWarmup),
  );

  const hasCompletedCardio = (log.cardio ?? []).some(
    (c: any) => c.completed && (Number(c.durationMinutes) || 0) >= 5,
  );

  return (
    completedExercises >= 1 ||
    hasCompletedSets ||
    hasCompletedCardio ||
    Boolean(log.completed && ((log.exercises?.length ?? 0) > 0 || (log.cardio?.length ?? 0) > 0))
  );
}

// NOTE: gymPlan is required lazily inside functions to break the circular dependency:
//   gymPlan.ts → gymUtils.ts → gymPlan.ts
// Do NOT add a top-level import of gymPlan here.

export const calculateGymStreak = (logs: any[] | null | undefined, userGymPlan?: any | null): number => {
  if (!logs || logs.length === 0) return 0;

  const toDateStr = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const normalizeLocalDateStr = (val: any): string => {
    if (!val) return '';
    const s = String(val).trim();
    const match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return toDateStr(d);
    }
    return '';
  };

  const todayStr = toDateStr(new Date());
  const planSig = userGymPlan ? `${userGymPlan.templateId || 'c'}_${userGymPlan.scheduleMode || 'fixed'}_${userGymPlan.updatedAt || 0}` : 'def';
  const cacheKey = `gym_streak_${todayStr}_${generateDatasetFingerprint(logs)}_${planSig}`;

  return computeOrGetHotCache(cacheKey, () => {
    const validDates = logs
      .filter(isValidWorkoutSession)
      .map(l => normalizeLocalDateStr(l?.date))
      .filter(Boolean);

    if (validDates.length === 0) return 0;

    const loggedDates = new Set<string>(validDates);

    // Hoist require outside loop & precompute 7-element lookup (Issue #29)
    const { WEEKDAY_TO_PLAN: WTP, resolvePlanDay } = require('../data/gymPlan');
    const restByDow = [0, 1, 2, 3, 4, 5, 6].map(dow => {
      const planIdx = WTP[dow] ?? 7;
      const plan = resolvePlanDay(userGymPlan, planIdx);
      return plan?.isRest === true;
    });

    const isRotation = userGymPlan?.scheduleMode === 'rotation';
    const hasAtLeastOneWorkoutDay = isRotation || restByDow.some(isRest => !isRest);

    let streak = 0;
    const curDate = new Date();
    curDate.setHours(0, 0, 0, 0);

    if (loggedDates.has(todayStr)) {
      streak++;
    }

    if (!hasAtLeastOneWorkoutDay) {
      return streak;
    }

    const MAX_LOOKBACK_DAYS = 1095; // 3-year hard safety ceiling
    let graceDaysUsedInWindow = 0;
    let daysSinceLastGrace = 0;
    let consecutiveRestDays = 0;

    for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
      curDate.setDate(curDate.getDate() - 1);
      const dStr = toDateStr(curDate);
      daysSinceLastGrace++;
      if (daysSinceLastGrace >= 7) {
        graceDaysUsedInWindow = 0;
      }

      if (loggedDates.has(dStr)) {
        streak++;
        consecutiveRestDays = 0;
      } else if (isRotation) {
        // In rotation mode, allow up to 2 rest days between workouts
        consecutiveRestDays++;
        if (consecutiveRestDays > 2) {
          break;
        }
      } else if (restByDow[curDate.getDay()]) {
        // Scheduled rest day
        consecutiveRestDays = 0;
      } else {
        // Unscheduled rest day: allow 1 flexible rest day per 7-day window (Issue #69)
        if (graceDaysUsedInWindow < 1) {
          graceDaysUsedInWindow++;
          daysSinceLastGrace = 0;
        } else {
          break;
        }
      }
    }

    return streak;
  });
};

export const calculateHighestGymStreak = (logs: any[] | null | undefined, userGymPlan?: any | null): number => {
  if (!logs || logs.length === 0) return 0;

  const toDateStr = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const normalizeLocalDateStr = (val: any): string => {
    if (!val) return '';
    const s = String(val).trim();
    const match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return toDateStr(d);
    }
    return '';
  };

  const todayStr = toDateStr(new Date());
  const planSig = userGymPlan ? `${userGymPlan.templateId || 'c'}_${userGymPlan.scheduleMode || 'fixed'}_${userGymPlan.updatedAt || 0}` : 'def';
  const cacheKey = `gym_highest_streak_${todayStr}_${generateDatasetFingerprint(logs)}_${planSig}`;

  return computeOrGetHotCache(cacheKey, () => {
    const validDates = logs
      .filter(isValidWorkoutSession)
      .map(l => normalizeLocalDateStr(l?.date))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    if (validDates.length === 0) return 0;

    const loggedDates = new Set<string>(validDates);

    // Hoist require outside loop & precompute 7-element lookup (Issue #29)
    const { WEEKDAY_TO_PLAN: WTP, resolvePlanDay } = require('../data/gymPlan');
    const restByDow = [0, 1, 2, 3, 4, 5, 6].map(dow => {
      const planIdx = WTP[dow] ?? 7;
      const plan = resolvePlanDay(userGymPlan, planIdx);
      return plan?.isRest === true;
    });

    const isRotation = userGymPlan?.scheduleMode === 'rotation';
    let maxStreak = 0;
    let currentRun = 0;
    let consecutiveRestDays = 0;

    const [startY, startM, startD] = validDates[0].split('-').map(Number);
    const cur = new Date(startY, startM - 1, startD, 0, 0, 0, 0);
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);

    const MAX_DAYS = 1095; // 3-year safety
    let daysIterated = 0;
    let graceDaysUsedInWindow = 0;
    let daysSinceLastGrace = 0;

    while (cur <= endDate && daysIterated < MAX_DAYS) {
      daysIterated++;
      daysSinceLastGrace++;
      if (daysSinceLastGrace >= 7) { graceDaysUsedInWindow = 0; }
      const dStr = toDateStr(cur);
      if (loggedDates.has(dStr)) {
        currentRun++;
        consecutiveRestDays = 0;
        if (currentRun > maxStreak) {
          maxStreak = currentRun;
        }
      } else if (isRotation) {
        consecutiveRestDays++;
        if (consecutiveRestDays > 2) {
          if (currentRun > maxStreak) {
            maxStreak = currentRun;
          }
          currentRun = 0;
        }
      } else if (restByDow[cur.getDay()]) {
        // Scheduled rest day preserves streak run
        consecutiveRestDays = 0;
      } else {
        // Unscheduled rest day: allow 1 flexible grace day per 7-day window
        if (graceDaysUsedInWindow < 1) {
          graceDaysUsedInWindow++;
          daysSinceLastGrace = 0;
        } else {
          if (currentRun > maxStreak) {
            maxStreak = currentRun;
          }
          currentRun = 0;
        }
      }
      cur.setDate(cur.getDate() + 1);
    }

    // Eliminate recursive calculation (Issue #30)
    return Math.max(maxStreak, currentRun, validDates.length > 0 ? 1 : 0);
  });
};

export const calculateExerciseMaxWeight = (exercise: GymExerciseLog | undefined | null): number => {
  if (!exercise || !exercise.setsLog || exercise.setsLog.length === 0) return 0;
  const validSets = exercise.setsLog.filter(s => {
    if (!s || s.completed !== true || s.isWarmup || s.setType === 'warmup') return false;
    const w = s.weight !== undefined && s.weight !== null ? s.weight : (s as any)?.weightKg;
    return w != null && Number(w) >= 0;
  });
  if (validSets.length === 0) return 0;
  return Math.max(...validSets.map(s => {
    const w = s.weight !== undefined && s.weight !== null ? s.weight : (s as any)?.weightKg;
    return Number(w);
  }));
};

export function getVolumeMultiplier(exerciseName?: string | null): number {
  if (!exerciseName) return 1;
  const name = exerciseName.toLowerCase();

  // Single-implement two-handed dumbbell movements are 1x (#68)
  if (name.includes('goblet') || name.includes('pullover') || name.includes('around the world')) {
    return 1;
  }

  // Bilateral equipment explicitly excluded from 2x multiplier (#68, #150)
  const isExplicitBilateral = (
    name.includes('machine') ||
    name.includes('rope') ||
    name.includes('barbell') ||
    name.includes('ez bar') ||
    name.includes('ez-bar') ||
    name.includes('both arms') ||
    name.includes('smith') ||
    name.includes('trap bar') ||
    name.includes('hex bar')
  ) && !(
    name.includes('single') ||
    name.includes('one') ||
    name.includes('unilateral') ||
    name.includes('iso-lateral') ||
    name.includes('dumbbell') ||
    name.includes('db ')
  );
  if (isExplicitBilateral) return 1;

  const unilateralKeywords = [
    'dumbbell', 'db ', '(db)', 'single arm', 'single-arm', 'one arm', 'one-arm',
    'single leg', 'single-leg', 'one leg', 'one-leg', 'unilateral',
    'bulgarian split', 'split squat', 'lunges', 'lunge',
    'step up', 'step-up', 'pistol squat', 'concentration curl',
    'hammer curl', 'kickback'
  ];
  return unilateralKeywords.some(kw => name.includes(kw)) ? 2 : 1;
}

export const calculateEstimated1RM = (exercise: GymExerciseLog | undefined | null): number => {
  if (!exercise || !exercise.setsLog || exercise.setsLog.length === 0) return 0;
  const validSets = exercise.setsLog.filter(s => {
    if (!s || s.completed !== true || s.isWarmup || s.setType === 'warmup') return false;
    const w = s.weight !== undefined && s.weight !== null ? s.weight : (s as any)?.weightKg;
    return w != null && Number(w) > 0 && s.reps != null && Number(s.reps) > 0;
  });
  if (validSets.length === 0) return 0;

  const category = resolveExerciseBiometrics(exercise.name).category;
  const oneRepMaxes = validSets.map(s => {
    const w = Number(s.weight !== undefined && s.weight !== null ? s.weight : (s as any)?.weightKg);
    const r = Number(s.reps);
    const rir = s.rir != null && Number.isFinite(Number(s.rir)) ? Math.max(0, Math.min(5, Number(s.rir))) : 0;
    return estimate1RM(w, r, 'hybrid', rir, category);
  });

  return Math.round(Math.max(...oneRepMaxes));
};

export const calculateHistorical1RM = (gymLogs: any[], exerciseIdOrName: string): number => {
  if (!gymLogs || gymLogs.length === 0 || !exerciseIdOrName) return 0;
  const targetKey = normalizeExerciseKey(exerciseIdOrName);
  if (!targetKey) return 0;

  // Fix #182: Single O(N) map for all exercises occupying only 1 slot in _HOT_CACHE
  const mapCacheKey = `hist_1rm_map_all_${generateDatasetFingerprint(gymLogs)}`;
  const allMaxMap = computeOrGetHotCache<Map<string, number>>(mapCacheKey, () => {
    const map = new Map<string, number>();
    for (const log of gymLogs) {
      if (!Array.isArray(log?.exercises)) continue;
      for (const ex of log.exercises) {
        if (!ex?.name || ex.skipped) continue;
        const k = normalizeExerciseKey(ex.name);
        if (!k) continue;
        const ex1RM = calculateEstimated1RM(ex);
        if (ex1RM > (map.get(k) || 0)) {
          map.set(k, ex1RM);
        }
      }
    }
    return map;
  });

  return allMaxMap.get(targetKey) || 0;
};

export const calculateExerciseAvgReps = (exercise: GymExerciseLog | undefined | null): number => {
  if (!exercise || !exercise.setsLog || exercise.setsLog.length === 0) return 0;
  const validSets = exercise.setsLog.filter(
    s => s && s.completed === true && !s.isWarmup && s.setType !== 'warmup' && s.reps != null && Number(s.reps) > 0
  );
  if (validSets.length === 0) return 0;
  const totalReps = validSets.reduce((sum, s) => sum + Number(s.reps), 0);
  return Math.round(totalReps / validSets.length);
};

export const calculateWorkoutMaxWeight = (log: GymDayLog | undefined | null): number => {
  if (!log || !log.exercises || log.exercises.length === 0) return 0;
  let maxW = 0;
  for (const ex of log.exercises) {
    if (ex.skipped) continue;
    const exMax = calculateExerciseMaxWeight(ex);
    if (exMax > maxW) maxW = exMax;
  }
  return maxW;
};

export interface PreviousExerciseSession {
  sets: { setNumber: number; weight: number | null; reps: number | null; completed: boolean }[];
  lastWeight: number | null;
  avgReps: number | null;
  maxWeight: number | null;
  sessionDate: string;
}

/**
 * Normalizes an exercise name for strict identity matching & alias resolution.
 * Maps synonyms, legacy database names, machine variations, and typos to a single canonical master key.
 * (e.g. "pec deck", "Pec Deck Fly", "Machine Chest Fly" -> "pecdeckfly").
 */
export function normalizeExerciseKey(name?: string | null): string {
  if (!name) return '';
  return getCanonicalExerciseKey(name);
}

/**
 * Builds an ultra-fast O(1) in-memory history index from past gym logs.
 * Performs a single O(N) pass over chronologically sorted logs (newest first).
 * Ensures that each exercise key maps strictly to its TRUE most recent completed session.
 */
export function buildExerciseHistoryIndex(
  gymLogs: any[] | null | undefined,
  beforeDate?: string
): Map<string, PreviousExerciseSession> {
  const emptyIndex = new Map<string, PreviousExerciseSession>();
  if (!gymLogs || gymLogs.length === 0) return emptyIndex;

  const cacheKey = `ex_hist_idx_${beforeDate || 'all'}_${generateDatasetFingerprint(gymLogs)}`;
  return computeOrGetHotCache(cacheKey, () => {
    const pastLogs = beforeDate
      ? gymLogs.filter(l => l && l.date < beforeDate && Array.isArray(l.exercises) && l.exercises.length > 0)
      : gymLogs.filter(l => l && Array.isArray(l.exercises) && l.exercises.length > 0);

    const index = new Map<string, PreviousExerciseSession>();
    const sorted = pastLogs
      .slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    for (const log of sorted) {
      for (const ex of log.exercises) {
        if (!ex || !ex.name || ex.skipped) continue;
        const key = normalizeExerciseKey(ex.name);
        if (!key || index.has(key)) continue;

        if (Array.isArray(ex.setsLog) && ex.setsLog.length > 0) {
          // Fix #124: Strictly exclude warmup sets so working sets never pre-fill with warmup weights!
          const completedSets = ex.setsLog.filter((s: any) => {
            if (!s || s.completed !== true || s.isWarmup || s.setType === 'warmup') return false;
            const rawW = s.weight !== undefined && s.weight !== null ? s.weight : s.weightKg;
            const w = rawW !== undefined && rawW !== null ? Number(rawW) : null;
            const r = s.reps !== undefined && s.reps !== null ? Number(s.reps) : null;
            return w !== null && !isNaN(w) && w >= 0 && r !== null && !isNaN(r) && r > 0;
          });

          if (completedSets.length > 0) {
            const mappedSets = completedSets.map((s: any, idx: number) => {
              const rawW = s.weight !== undefined && s.weight !== null ? s.weight : s.weightKg;
              const w = rawW !== undefined && rawW !== null ? Number(rawW) : null;
              const r = s.reps !== undefined && s.reps !== null ? Number(s.reps) : null;
              return {
                setNumber: idx + 1,
                weight: w !== null && !isNaN(w) && w >= 0 ? w : null,
                reps: r !== null && !isNaN(r) && r > 0 ? r : null,
                completed: true,
              };
            });

            const weights = mappedSets.map((s: { weight: number | null }) => s.weight).filter((w: number | null): w is number => w !== null && w >= 0);
            const reps = mappedSets.map((s: { reps: number | null }) => s.reps).filter((r: number | null): r is number => r !== null && r > 0);

            const lastWeight = weights.length > 0 ? weights[weights.length - 1] : null;
            const maxWeight = weights.length > 0 ? Math.max(...weights) : null;
            const avgReps = reps.length > 0 ? Math.round(reps.reduce((a: number, b: number) => a + b, 0) / reps.length) : null;

            index.set(key, {
              sets: mappedSets,
              lastWeight,
              avgReps,
              maxWeight,
              sessionDate: log.date,
            });
          }
        }
      }
    }

    return index;
  });
}

// Tier-1 Upgrade #71: Persistent In-Memory History Cache for O(K) Delta Updates
let _liveHistoryIndexCache: Map<string, PreviousExerciseSession> | null = null;

export function updateExerciseHistoryIndexDelta(completedLog: any): void {
  if (!completedLog || !Array.isArray(completedLog.exercises)) return;
  if (!_liveHistoryIndexCache) {
    _liveHistoryIndexCache = new Map<string, PreviousExerciseSession>();
  }
  for (const ex of completedLog.exercises) {
    if (!ex || !ex.name) continue;
    const key = normalizeExerciseKey(ex.name);
    if (!key) continue;

    const completedSets = (ex.setsLog || []).filter((s: any) => {
      const isWarmup = s?.isWarmup === true || s?.setType === 'warmup';
      if (isWarmup) return false;
      const rawW = s?.weight !== undefined && s?.weight !== null ? s.weight : (s as any)?.weightKg;
      const w = rawW !== undefined && rawW !== null ? Number(rawW) : null;
      const r = s?.reps !== undefined && s?.reps !== null ? Number(s.reps) : null;
      return s.completed === true && ((w !== null && !isNaN(w) && w >= 0) || (r !== null && !isNaN(r) && r > 0));
    });

    if (completedSets.length > 0) {
      const mappedSets = completedSets.map((s: any, idx: number) => {
        const rawW = s?.weight !== undefined && s?.weight !== null ? s.weight : (s as any)?.weightKg;
        const w = rawW !== undefined && rawW !== null ? Number(rawW) : null;
        const r = s?.reps !== undefined && s?.reps !== null ? Number(s.reps) : null;
        return {
          setNumber: idx + 1,
          weight: w !== null && !isNaN(w) && w >= 0 ? w : null,
          reps: r !== null && !isNaN(r) && r > 0 ? r : null,
          completed: true,
        };
      });

      const weights = mappedSets.map((s: { weight: number | null }) => s.weight).filter((w: number | null): w is number => w !== null && w >= 0);
      const reps = mappedSets.map((s: { reps: number | null }) => s.reps).filter((r: number | null): r is number => r !== null && r > 0);

      const lastWeight = weights.length > 0 ? weights[weights.length - 1] : null;
      const maxWeight = weights.length > 0 ? Math.max(...weights) : null;
      const avgReps = reps.length > 0 ? Math.round(reps.reduce((a: number, b: number) => a + b, 0) / reps.length) : null;

      _liveHistoryIndexCache.set(key, {
        sets: mappedSets,
        lastWeight,
        avgReps,
        maxWeight,
        sessionDate: completedLog.date,
      });
    }
  }
}

/**
 * Finds the most recent legitimately completed workout session for a given exercise.
 * Guarantees:
 * 1. STRICT name-only matching: an exercise will NEVER load data from a different exercise.
 * 2. Only considers sets that were ACTUALLY completed (s.completed === true).
 * 3. Returns null (blank) if the user has never done this specific exercise before.
 */
export function getPreviousExerciseSession(
  exerciseName: string,
  gymLogs: any[] | null | undefined,
  beforeDate?: string
): PreviousExerciseSession | null {
  if (!exerciseName) return null;
  const key = normalizeExerciseKey(exerciseName);
  if (!key) return null;

  if (gymLogs && gymLogs.length > 0) {
    const index = buildExerciseHistoryIndex(gymLogs, beforeDate);
    const match = index.get(key);
    if (match) return match;
  }
  const liveMatch = _liveHistoryIndexCache?.get(key);
  if (liveMatch && (!beforeDate || liveMatch.sessionDate < beforeDate)) return liveMatch;
  return null;
}

export interface MuscleTargetResolution {
  targetMuscle: string;      // e.g. "Upper Chest", "Long Head Triceps", "Lats", "Side Delts", "Quads"
  canonicalGroup: string;    // e.g. "Chest", "Triceps", "Back", "Shoulders", "Quads"
}

/**
 * Accurately determines the true biomechanical target muscle and parent group for any exercise.
 * 1. Checks EXERCISE_DATABASE for exact metadata.
 * 2. Uses explicitMuscle if provided.
 * 3. Falls back to precise biomechanical keyword analysis (never blind 'Chest' fallbacks).
 */
let exerciseDbByKey: Map<string, any> | null = null;
function getExerciseDbByKey(): Map<string, any> {
  if (!exerciseDbByKey) {
    exerciseDbByKey = new Map<string, any>();
    const db = getExerciseDatabase();
    for (const e of db) {
      exerciseDbByKey.set(normalizeExerciseKey(e.name), e);
      if (Array.isArray(e.aliases)) {
        for (const a of e.aliases) {
          if (a) exerciseDbByKey.set(normalizeExerciseKey(a), e);
        }
      }
    }
  }
  return exerciseDbByKey;
}

/**
 * Resolves any legacy exercise name or synonym to its official canonical database name.
 * e.g. "Incline Dumbbell Press" -> "Incline Bench Press (Dumbbell)"
 * If no match is found, returns the original name untouched.
 */
export function getCanonicalExerciseName(exerciseName?: string | null): string {
  if (!exerciseName) return '';
  const key = normalizeExerciseKey(exerciseName);
  if (!key) return exerciseName;
  const match = getExerciseDbByKey().get(key);
  return match?.name || exerciseName;
}

const _muscleResolutionCache = new Map<string, MuscleTargetResolution>();

export function resolveExerciseTargetMuscle(
  exerciseName: string,
  explicitMuscle?: string | null
): MuscleTargetResolution {
  const cacheKey = `${exerciseName || ''}__${explicitMuscle || ''}`;
  const cached = _muscleResolutionCache.get(cacheKey);
  if (cached) return cached;

  const commitCache = (res: MuscleTargetResolution): MuscleTargetResolution => {
    if (_muscleResolutionCache.size >= 1000) {
      const oldestKey = _muscleResolutionCache.keys().next().value;
      if (oldestKey) _muscleResolutionCache.delete(oldestKey);
    }
    _muscleResolutionCache.set(cacheKey, res);
    return res;
  };

  // 0. Fast-path: if explicitMuscle is a specific known muscle (excluding generic 'Full Body' / 'Mixed')
  if (explicitMuscle) {
    const trimmed = explicitMuscle.trim();
    if (MUSCLE_COLORS[trimmed] && trimmed !== 'Full Body' && trimmed !== 'Mixed') {
      return commitCache({
        targetMuscle: trimmed,
        canonicalGroup: canonicalizeMuscle(trimmed),
      });
    }
  }

  // 1. Check EXERCISE_DATABASE (O(1) Map lookup)
  if (exerciseName) {
    const key = normalizeExerciseKey(exerciseName);
    const dbMatch = getExerciseDbByKey().get(key);
    if (
      dbMatch &&
      dbMatch.muscle &&
      dbMatch.muscle.trim().length > 0 &&
      !['none', 'general', 'unknown', 'mixed', 'null', 'undefined'].includes(dbMatch.muscle.trim().toLowerCase())
    ) {
      return commitCache({
        targetMuscle: dbMatch.muscle,
        canonicalGroup: canonicalizeMuscle(dbMatch.muscle),
      });
    }
  }

  // 2. Try explicitMuscle if valid and not generic
  if (
    explicitMuscle &&
    explicitMuscle.trim().length > 0 &&
    !['none', 'general', 'unknown', 'mixed', 'null', 'undefined', 'full body'].includes(explicitMuscle.trim().toLowerCase())
  ) {
    return commitCache({
      targetMuscle: explicitMuscle.trim(),
      canonicalGroup: canonicalizeMuscle(explicitMuscle),
    });
  }

  // 3. Keyword Biomechanical Classifier (Ordered from most specific to general — Fixes #184 & #237)
  const lower = (exerciseName || '').toLowerCase();

  // Hamstrings MUST precede 'curl' so "Seated Leg Curl" / "Nordic Curl" never match Biceps!
  if (
    lower.includes('leg curl') ||
    lower.includes('hamstring') ||
    lower.includes('romanian') ||
    lower.includes('rdl') ||
    lower.includes('stiff leg') ||
    lower.includes('stiff-leg') ||
    lower.includes('good morning') ||
    lower.includes('glute ham') ||
    lower.includes('ghr') ||
    lower.includes('nordic')
  ) {
    return commitCache({ targetMuscle: 'Hamstrings', canonicalGroup: 'Hamstrings' });
  }

  // Forearms MUST precede 'curl' so "Wrist Curl" / "Reverse Curl" never match Biceps!
  if (
    lower.includes('wrist') ||
    lower.includes('forearm') ||
    lower.includes('farmers') ||
    lower.includes('brachioradialis') ||
    lower.includes('reverse curl') ||
    lower.includes('reverse barbell curl')
  ) {
    return commitCache({ targetMuscle: 'Forearms', canonicalGroup: 'Forearms' });
  }

  // Biceps MUST precede 'incline' so "Incline Dumbbell Curl" never matches Upper Chest!
  if (
    lower.includes('bicep') ||
    lower.includes('curl') ||
    lower.includes('preacher') ||
    lower.includes('hammer') ||
    lower.includes('spider') ||
    lower.includes('bayesian') ||
    lower.includes('chin-up') ||
    lower.includes('chin up')
  ) {
    return commitCache({ targetMuscle: 'Biceps', canonicalGroup: 'Biceps' });
  }

  // Triceps MUST precede 'incline' so "Incline Skullcrusher" never matches Upper Chest!
  if (
    lower.includes('tricep') ||
    lower.includes('pushdown') ||
    lower.includes('skull crusher') ||
    lower.includes('skullcrusher') ||
    lower.includes('overhead extension') ||
    lower.includes('katana') ||
    lower.includes('french press') ||
    (lower.includes('kickback') && !lower.includes('glute') && !lower.includes('cable standing')) ||
    lower.includes('close-grip bench') ||
    lower.includes('close grip bench') ||
    lower.includes('jm press')
  ) {
    return commitCache({ targetMuscle: 'Triceps', canonicalGroup: 'Triceps' });
  }

  // Rear Delts MUST precede 'incline' and 'fly'
  if (
    lower.includes('rear delt') ||
    lower.includes('reverse fly') ||
    lower.includes('reverse pec') ||
    lower.includes('face pull')
  ) {
    return commitCache({ targetMuscle: 'Rear Delts', canonicalGroup: 'Shoulders' });
  }

  // Side Delts
  if (
    lower.includes('lateral raise') ||
    lower.includes('side raise') ||
    lower.includes('side delt') ||
    lower.includes('upright row') ||
    lower.includes('egyptian')
  ) {
    return commitCache({ targetMuscle: 'Side Delts', canonicalGroup: 'Shoulders' });
  }

  // Lats / Vertical Back
  if (
    lower.includes('lat pulldown') ||
    lower.includes('pull down') ||
    lower.includes('pulldown') ||
    lower.includes('pullup') ||
    lower.includes('pull up') ||
    lower.includes('pull-up') ||
    lower.includes('straight arm') ||
    lower.includes('lat row')
  ) {
    return commitCache({ targetMuscle: 'Lats', canonicalGroup: 'Back' });
  }

  // Mid-Back / Rows MUST precede 'incline' so "Chest Supported Incline Row" never matches Upper Chest!
  if (
    lower.includes('row') ||
    lower.includes('t-bar') ||
    lower.includes('t bar') ||
    lower.includes('shrug') ||
    lower.includes('trap') ||
    lower.includes('deadlift') ||
    lower.includes('back extension') ||
    lower.includes('hyperextension')
  ) {
    return commitCache({ targetMuscle: 'Back', canonicalGroup: 'Back' });
  }

  // Upper Chest
  if (
    lower.includes('incline') ||
    lower.includes('low-to-high') ||
    lower.includes('low to high') ||
    lower.includes('clavicular') ||
    lower.includes('reverse grip bench')
  ) {
    return commitCache({ targetMuscle: 'Upper Chest', canonicalGroup: 'Chest' });
  }

  // Lower / Mid Chest
  if (
    lower.includes('high-to-low') ||
    lower.includes('high to low') ||
    lower.includes('decline') ||
    lower.includes('pec deck') ||
    lower.includes('butterfly') ||
    lower.includes('chest fly') ||
    lower.includes('cable fly') ||
    lower.includes('bench press') ||
    lower.includes('chest press') ||
    lower.includes('cable crossover') ||
    lower.includes('dips') ||
    lower.includes('pushup') ||
    lower.includes('push-up')
  ) {
    return commitCache({ targetMuscle: 'Chest', canonicalGroup: 'Chest' });
  }

  // Front Delts / Shoulders
  if (
    lower.includes('shoulder') ||
    lower.includes('military') ||
    lower.includes('overhead press') ||
    lower.includes('front raise') ||
    lower.includes('arnold press') ||
    lower.includes('delt')
  ) {
    return commitCache({ targetMuscle: 'Shoulders', canonicalGroup: 'Shoulders' });
  }

  // Glute Abductors MUST precede Abs
  if (
    lower.includes('abduct') ||
    lower.includes('adduct') ||
    lower.includes('outer glute') ||
    lower.includes('clamshell') ||
    lower.includes('fire hydrant') ||
    lower.includes('curtsy') ||
    lower.includes('lateral band walk')
  ) {
    return commitCache({ targetMuscle: 'Glutes/Abductors', canonicalGroup: 'Glutes/Abductors' });
  }

  // Glutes
  if (
    lower.includes('hip thrust') ||
    lower.includes('glute bridge') ||
    lower.includes('kas bridge') ||
    lower.includes('glute kickback') ||
    lower.includes('pull-through') ||
    (lower.includes('glute') && !lower.includes('ham') && !lower.includes('ghr'))
  ) {
    return commitCache({ targetMuscle: 'Glutes', canonicalGroup: 'Glutes' });
  }

  // Quads
  if (
    lower.includes('squat') ||
    lower.includes('leg press') ||
    lower.includes('leg extension') ||
    lower.includes('hack') ||
    lower.includes('lunge') ||
    lower.includes('split squat') ||
    lower.includes('sissy') ||
    lower.includes('quad')
  ) {
    return commitCache({ targetMuscle: 'Quads', canonicalGroup: 'Quads' });
  }

  // Calves
  if (lower.includes('calf') || lower.includes('calves') || lower.includes('soleus') || lower.includes('tibialis')) {
    return commitCache({ targetMuscle: 'Calves', canonicalGroup: 'Calves' });
  }

  // Abs — Fix #237: Use word boundary \b(abs|abdominals?|core|obliques?)\b instead of .includes('ab')!
  if (
    /\b(abs|abdominals?|core|obliques?)\b/i.test(lower) ||
    lower.includes('crunch') ||
    lower.includes('plank') ||
    lower.includes('leg raise') ||
    lower.includes('knee raise') ||
    lower.includes('rollout') ||
    lower.includes('woodchopper') ||
    lower.includes('pallof') ||
    lower.includes('vacuum')
  ) {
    return commitCache({ targetMuscle: 'Abs', canonicalGroup: 'Abs' });
  }

  return commitCache({
    targetMuscle: explicitMuscle || 'Full Body',
    canonicalGroup: explicitMuscle ? canonicalizeMuscle(explicitMuscle) : 'Mixed',
  });
}

/**
 * Intelligent Biomechanical Prescription Generator.
 * Calibrates sets, rep targets, and rest periods according to movement pattern,
 * CNS/axial demands, and muscle fiber recruitment characteristics.
 */
export function getBiomechanicalPrescription(
  exerciseName: string,
  muscle?: string
): { targetSets: number; targetReps: string; restTimeSecs: number } {
  const n = (exerciseName || '').toLowerCase().trim();

  // 1. Calves, Abs, Forearms & High-Rep Burnout (12–15 / 15–20 reps, 45–60s rest)
  if (
    n.includes('calf') ||
    n.includes('soleus') ||
    n.includes('wrist curl') ||
    n.includes('ab crunch') ||
    n.includes('cable crunch') ||
    n.includes('knee raise') ||
    n.includes('leg raise') ||
    n.includes('woodchopper') ||
    n.includes('pallof') ||
    n.includes('clamshell') ||
    n.includes('band walk') ||
    n.includes('fire hydrant')
  ) {
    if (n.includes('clamshell') || n.includes('band walk') || n.includes('fire hydrant')) {
      return { targetSets: 3, targetReps: '15–20', restTimeSecs: 45 };
    }
    return { targetSets: 3, targetReps: '12–15', restTimeSecs: 60 };
  }

  // 2. Heavy Primary Free-Weight Compounds (4 sets, 6–8 reps, 150–180s rest) (Issue #64)
  const isHeavySquat = n.includes('squat') && (n.includes('barbell') || n.includes('back squat')) && !n.includes('split') && !n.includes('hack') && !n.includes('goblet');
  const isHeavyBench = n.includes('bench press') && (n.includes('barbell') || n.includes('flat')) && !n.includes('incline') && !n.includes('close') && !n.includes('dumbbell');
  const isHeavyDeadlift = (n.includes('deadlift') && (n.includes('barbell') || n === 'deadlift' || n.includes('conventional') || n.includes('sumo') || n.includes('romanian'))) && !n.includes('dumbbell') && !n.includes('cable');
  const isHeavyRow = n.includes('bent-over row') || n.includes('bent over row') || (n.includes('barbell') && n.includes('row') && !n.includes('upright'));
  const isHeavyMilitary = (n.includes('military press') || n.includes('overhead press')) && (n.includes('barbell') || n.includes('standing')) && !n.includes('dumbbell');

  if (isHeavySquat || isHeavyBench || isHeavyDeadlift || isHeavyRow || isHeavyMilitary) {
    return { targetSets: 4, targetReps: '6–8', restTimeSecs: 150 };
  }

  // 3. Heavy Machine Compounds & Dumbbell Power Presses (8–10 reps, 120s rest)
  if (
    n.includes('hack squat') ||
    n.includes('leg press') ||
    n.includes('incline dumbbell press') ||
    n.includes('converging incline') ||
    n.includes('hammer strength incline') ||
    n.includes('incline barbell') ||
    n.includes('chest-supported t-bar') ||
    n.includes('weighted pull') ||
    n.includes('weighted chin') ||
    n.includes('weighted dip') ||
    n.includes('barbell hip thrust') ||
    n.includes('seated dumbbell shoulder press') ||
    n.includes('machine overhead press') ||
    n.includes('close-grip barbell bench')
  ) {
    return { targetSets: 3, targetReps: '8–10', restTimeSecs: 120 };
  }

  // 4. Pure Isolations, Stretch Loading & Arm Work (10–12 reps, 75s rest)
  if (
    n.includes('lateral raise') ||
    n.includes('reverse pec deck') ||
    n.includes('face pull') ||
    n.includes('pec deck') ||
    n.includes('cable crossover') ||
    n.includes('cable fly') ||
    n.includes('dumbbell fly') ||
    n.includes('skullcrusher') ||
    n.includes('skull crusher') ||
    n.includes('katana') ||
    n.includes('overhead cable tricep') ||
    n.includes('tricep pushdown') ||
    n.includes('curl') ||
    n.includes('seated leg curl') ||
    n.includes('lying leg curl') ||
    n.includes('leg extension') ||
    n.includes('hip abduction') ||
    n.includes('glute kickback') ||
    n.includes('shrug')
  ) {
    return { targetSets: 3, targetReps: '10–12', restTimeSecs: 75 };
  }

  // 5. Default Secondary Compound (8–12 reps, 90s rest)
  return { targetSets: 3, targetReps: '8–12', restTimeSecs: 90 };
}

export interface ExerciseSwapOption {
  id: string;
  name: string;
  muscle: string;
  canonicalGroup: string;
  targetSets: number;
  targetReps: string;
  restTimeSecs: number;
  videoId?: string;
  reason?: string;
  tier?: 'S Tier' | 'A+ Tier' | 'A Tier' | 'B Tier';
  isFromTemplate?: boolean;
  dayName?: string;
  matchPercentage?: number;
  muscleDivision?: string;
  equipment?: string;
  isEquipmentVariant?: boolean;
}

/**
 * Returns clean, strictly relevant swap alternatives for the exercise's target muscle.
 * Prioritizes top-8 high-yield biomechanical movements ranked S Tier -> A+ Tier -> A Tier -> B Tier.
 * Strictly excludes the current exercise being swapped.
 */
export function getExerciseSwapAlternatives(
  currentExerciseName: string,
  explicitMuscle?: string | null,
  activePlanDays?: any[] | null
): ExerciseSwapOption[] {
  const { targetMuscle, canonicalGroup } = resolveExerciseTargetMuscle(currentExerciseName, explicitMuscle);
  const currentKey = normalizeExerciseKey(currentExerciseName);
  const seenKeys = new Set<string>();
  seenKeys.add(currentKey);

  const results: ExerciseSwapOption[] = [];

  // 1. Primary Source: Biomechanical Matching Engine (Top 3 Direct + Equipment Variants)
  try {
    const { getBiomechanicalSwaps } = require('../services/biomechanicalMatchingEngine');
    const bioResult = getBiomechanicalSwaps(currentExerciseName, explicitMuscle);

    for (const alt of bioResult.allSubstitutes) {
      const key = normalizeExerciseKey(alt.name);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      results.push({
        id: alt.id,
        name: alt.name,
        muscle: alt.targetMuscle || targetMuscle,
        canonicalGroup,
        targetSets: alt.targetSets,
        targetReps: alt.targetReps,
        restTimeSecs: alt.restTimeSecs,
        videoId: alt.videoId,
        reason: alt.reason,
        tier: alt.matchPercentage >= 95 ? 'S Tier' : 'A+ Tier',
        isFromTemplate: false,
        matchPercentage: alt.matchPercentage,
        muscleDivision: alt.muscleDivision,
        equipment: alt.equipment,
        isEquipmentVariant: alt.isEquipmentVariant,
      });
      if (results.length >= 8) break;
    }
  } catch {
    // fallback if engine cannot load
  }

  // Fallback / Supplementary: Curated Alternatives
  if (results.length < 8) {
    const { EXERCISE_ALTERNATIVES: EA } = require('../data/gymPlan');
    const curatedList = EA[targetMuscle] || EA[canonicalGroup] || [];
    for (const alt of curatedList) {
      if (!alt?.name) continue;
      const key = normalizeExerciseKey(alt.name);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const rx = getBiomechanicalPrescription(alt.name, targetMuscle);

      const dbEntry = getExerciseDbByKey().get(key);
      results.push({
        id: `curated_swap_${results.length}`,
        name: alt.name,
        muscle: targetMuscle,
        canonicalGroup,
        targetSets: alt.targetSets || rx.targetSets,
        targetReps: alt.targetReps || rx.targetReps,
        restTimeSecs: alt.restTimeSecs || rx.restTimeSecs,
        videoId: dbEntry?.videoId || alt.videoId,
        tier: alt.tier,
        reason: alt.reason || `Direct alternative for ${targetMuscle}`,
        isFromTemplate: false,
      });
      if (results.length >= 8) break;
    }
  }

  // 2. Secondary: If user has other workout days in active plan, surface relevant exercises from their routine
  if (Array.isArray(activePlanDays) && activePlanDays.length > 0 && results.length < 8) {
    for (const day of activePlanDays) {
      if (!Array.isArray(day?.exercises)) continue;
      for (const ex of day.exercises) {
        if (!ex?.name) continue;
        const key = normalizeExerciseKey(ex.name);
        if (seenKeys.has(key)) continue;

        const exTarget = resolveExerciseTargetMuscle(ex.name, ex.muscle);
        if (exTarget.targetMuscle === targetMuscle || exTarget.canonicalGroup === canonicalGroup) {
          seenKeys.add(key);
          results.push({
            id: ex.id || `template_swap_${results.length}`,
            name: ex.name,
            muscle: ex.muscle || targetMuscle,
            canonicalGroup,
            targetSets: Number(ex.targetSets) || 3,
            targetReps: ex.targetReps || '8–12',
            restTimeSecs: Number(ex.restTimeSecs) || 90,
            videoId: ex.videoId || getExerciseDbByKey().get(key)?.videoId,
            reason: `From your ${day.name || 'Routine'}`,
            isFromTemplate: true,
            dayName: day.name,
          });
          if (results.length >= 8) break;
        }
      }
    }
  }

  // 3. Fallback: Broad database only if still fewer than 6
  if (results.length < 6) {
    const dbMatches = getExerciseDatabase().filter(db => {
      if (!db.name || seenKeys.has(normalizeExerciseKey(db.name))) return false;
      const dbMuscleLower = (db.muscle || '').toLowerCase();
      const targetLower = targetMuscle.toLowerCase();
      return dbMuscleLower === targetLower || dbMuscleLower.includes(targetLower) || targetLower.includes(dbMuscleLower);
    });

    for (const db of dbMatches) {
      if (results.length >= 8) break;
      const key = normalizeExerciseKey(db.name);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const rx = getBiomechanicalPrescription(db.name, targetMuscle);

      results.push({
        id: db.id || `swap_db_${results.length}`,
        name: db.name,
        muscle: db.muscle || targetMuscle,
        canonicalGroup,
        targetSets: rx.targetSets,
        targetReps: rx.targetReps,
        restTimeSecs: rx.restTimeSecs,
        isFromTemplate: false,
        reason: `Alternative for ${targetMuscle}`,
      });
    }
  }

  return results;
}

/**
 * Merges a local in-memory GymDayLog with an incoming Firestore GymDayLog
 * so no logged weight, rep, RIR, or completed checkmark is EVER lost.
 */
export function mergeGymLogMonotonic(local: GymDayLog | null, remote: GymDayLog): GymDayLog {
  if (!local || local.date !== remote.date) return remote;
  const localTs = Number(local.updatedAt) || 0;
  const remoteTs = Number(remote.updatedAt) || 0;

  // Fix #67: If one state has a strictly newer non-zero timestamp (> 0), respect its explicit set/exercise structure!
  const primary = localTs >= remoteTs ? local : remote;
  const secondary = localTs >= remoteTs ? remote : local;
  const isStrictlyNewer = (localTs > 0 && remoteTs > 0 && localTs !== remoteTs);

  // Fix #186: Track matched secondary exercises by index so duplicate-named exercises never collide!
  const matchedSecondaryIndices = new Set<number>();
  const mergedExercises = (primary.exercises || []).map((pEx) => {
    const pKey = normalizeExerciseKey(pEx.name);
    const sIdx = (secondary.exercises || []).findIndex((e, idx) => {
      if (matchedSecondaryIndices.has(idx)) return false;
      if (e.exerciseId && pEx.exerciseId && e.exerciseId === pEx.exerciseId) return true;
      const eKey = normalizeExerciseKey(e.name);
      return Boolean(eKey && eKey === pKey);
    });

    if (sIdx === -1) return pEx;
    matchedSecondaryIndices.add(sIdx);
    const sEx = secondary.exercises[sIdx];

    // If primary is strictly newer, respect its set count so removed sets don't resurrect (#67)
    const targetSetLen = isStrictlyNewer
      ? (pEx.setsLog?.length || 0)
      : Math.max(pEx.setsLog?.length || 0, sEx.setsLog?.length || 0);
    const mergedSets: GymSet[] = [];

    for (let i = 0; i < targetSetLen; i++) {
      const pSet = pEx.setsLog?.[i];
      const sSet = sEx.setsLog?.[i];
      if (pSet && !sSet) { mergedSets.push(pSet); continue; }
      if (!pSet && sSet) { mergedSets.push(sSet); continue; }

      const weightVal = localTs >= remoteTs
        ? pSet.weight
        : ((pSet.weight !== null && pSet.weight !== undefined) ? pSet.weight : sSet.weight);
      const repsVal = localTs >= remoteTs
        ? pSet.reps
        : ((pSet.reps !== null && pSet.reps !== undefined) ? pSet.reps : sSet.reps);

      mergedSets.push({
        ...sSet,
        ...pSet,
        weight: weightVal,
        reps: repsVal,
        completed: isStrictlyNewer ? Boolean(pSet.completed) : Boolean(pSet.completed || sSet.completed),
        rir: pSet.rir !== undefined ? pSet.rir : sSet.rir,
        rpe: (pSet as any)?.rpe !== undefined ? (pSet as any).rpe : (sSet as any)?.rpe,
        isWarmup: pSet.isWarmup ?? sSet.isWarmup,
        setType: pSet.setType || sSet.setType,
      });
    }

    return {
      ...sEx,
      ...pEx,
      notes: (pEx as any).notes || (sEx as any).notes,
      setsLog: mergedSets,
    };
  });

  // Only backfill secondary exercises if timestamps were equal or 0 (template hydration) (#67)
  if (!isStrictlyNewer) {
    (secondary.exercises || []).forEach((sEx, idx) => {
      if (!matchedSecondaryIndices.has(idx)) {
        mergedExercises.push(sEx);
      }
    });
  }

  const mergedCardio: any[] = [];
  const primaryCardio = Array.isArray(primary.cardio) ? primary.cardio : [];
  const secondaryCardio = Array.isArray(secondary.cardio) ? secondary.cardio : [];
  const matchedCardioIndices = new Set<number>();

  for (const pC of primaryCardio) {
    const sIdx = secondaryCardio.findIndex((c, idx) =>
      !matchedCardioIndices.has(idx) && ((c.id && pC.id && c.id === pC.id) || (c.type && pC.type && c.type === pC.type))
    );
    if (sIdx !== -1) {
      matchedCardioIndices.add(sIdx);
      const sC = secondaryCardio[sIdx];
      mergedCardio.push({
        ...sC,
        ...pC,
        completed: isStrictlyNewer ? Boolean(pC.completed) : Boolean(pC.completed || sC.completed),
      });
    } else {
      mergedCardio.push(pC);
    }
  }

  if (!isStrictlyNewer) {
    secondaryCardio.forEach((sC, idx) => {
      if (!matchedCardioIndices.has(idx)) mergedCardio.push(sC);
    });
  }

  const isCompleted = isStrictlyNewer ? Boolean(primary.completed) : Boolean(local.completed || remote.completed);
  const result: GymDayLog = {
    ...secondary,
    ...primary,
    completed: isCompleted,
    exercises: mergedExercises,
    cardio: mergedCardio,
    updatedAt: Math.max(localTs, remoteTs),
  };

  if (isCompleted) {
    delete (result as any).workoutStartTime;
    delete (result as any).restTimerStartTime;
    delete (result as any).restTimerDurationSecs;
    delete (result as any).restTimerExerciseName;
  }

  return result;
}


