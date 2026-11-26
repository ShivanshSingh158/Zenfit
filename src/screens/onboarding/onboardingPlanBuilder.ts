import AsyncStorage from '@react-native-async-storage/async-storage';
import { serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { CURATED_SPLITS_BY_ID, REST_DAY_TEMPLATE } from '../../data/curatedSplits';
import { generatePersonalizedGymPlan } from '../../services/personalizedPlanService';
import { GymPlanDay, UserGymPlanDoc } from '../../types/gym.types';
import { getCanonicalExerciseName, resolveExerciseTargetMuscle } from '../../utils/gymUtils';
import { BOOT_KEYS, setL1Sync, updateL1Cache } from '../../utils/bootManifest';
import { DOMAIN_CACHE_KEYS, writeWellnessCache } from '../../utils/domainCache';
import { formatLocalDateStr } from '../../utils/dateUtils';
import { COLLECTION } from '../../config/constants';
import { db } from '../../services/firebase';
import { safeWrite } from '../../utils/safeWrite';
import { queueWrite } from '../../services/offlineSync';
import {
  ExperienceLevelId,
  SplitPreferenceId,
  TrainingGoalId,
  getTrainingDayMask,
} from './onboardingTypes';

function canonicalizePlanDay(day: GymPlanDay): GymPlanDay {
  if (!day || !Array.isArray(day.exercises)) return day;
  return {
    ...day,
    exercises: day.exercises.map((ex, idx) => {
      const canonicalName = getCanonicalExerciseName(ex.name);
      return {
        ...ex,
        id: ex.id || `onb_${day.dayIndex}_${idx + 1}`,
        name: canonicalName,
        muscle: resolveExerciseTargetMuscle(canonicalName, ex.muscle).targetMuscle,
      };
    }),
  };
}

export interface BuildOnboardingPlanInput {
  userId: string;
  displayName: string;
  weightKg: number;
  heightCm: number;
  goal: TrainingGoalId;
  experience: ExperienceLevelId;
  daysPerWeek: number;
  splitPreference: SplitPreferenceId;
}

/**
 * Builds a complete, canonical 7-day UserGymPlanDoc matching the user's selected
 * split and weekly frequency so Home/Today and Plan are ready on Frame 0.
 */
export function buildOnboardingUserGymPlan(input: BuildOnboardingPlanInput): UserGymPlanDoc {
  const {
    userId,
    displayName,
    weightKg,
    heightCm,
    goal,
    experience,
    daysPerWeek,
    splitPreference,
  } = input;

  const curatedSplit = CURATED_SPLITS_BY_ID[splitPreference];
  const now = Date.now();
  const customDays: Record<number, GymPlanDay> = {};

  if (curatedSplit) {
    if (curatedSplit.daysPerWeek === daysPerWeek) {
      for (let dayIndex = 1; dayIndex <= 7; dayIndex++) {
        const workoutId = curatedSplit.defaultDayMap[dayIndex];
        const workout = workoutId && workoutId !== 'rest'
          ? curatedSplit.workouts.find((w) => w.id === workoutId)
          : null;

        if (workout) {
          customDays[dayIndex] = canonicalizePlanDay({
            dayIndex,
            routineId: workout.id,
            name: workout.name,
            subtitle: workout.subtitle,
            focus: workout.focus,
            isRest: false,
            exercises: workout.exercises.map((ex) => ({ ...ex })),
          });
        } else {
          customDays[dayIndex] = { ...REST_DAY_TEMPLATE, dayIndex };
        }
      }
    } else {
      // Adapt curated workouts cleanly onto the user's chosen training-day mask
      const activeMask = getTrainingDayMask(daysPerWeek);
      const workoutsPool = curatedSplit.workouts;
      let poolCursor = 0;

      for (let dayIndex = 1; dayIndex <= 7; dayIndex++) {
        if (activeMask[dayIndex - 1] && workoutsPool.length > 0) {
          const workout = workoutsPool[poolCursor % workoutsPool.length];
          poolCursor += 1;
          customDays[dayIndex] = canonicalizePlanDay({
            dayIndex,
            routineId: workout.id,
            name: workout.name,
            subtitle: workout.subtitle,
            focus: workout.focus,
            isRest: false,
            exercises: workout.exercises.map((ex) => ({ ...ex })),
          });
        } else {
          customDays[dayIndex] = { ...REST_DAY_TEMPLATE, dayIndex };
        }
      }
    }

    return {
      id: userId,
      userId,
      schemaVersion: 2,
      templateId: curatedSplit.id,
      name: curatedSplit.name,
      scheduleMode: 'calendar',
      routines: {},
      customDays,
      updatedAt: now,
    };
  }

  const personalized = generatePersonalizedGymPlan({
    displayName,
    weightKg,
    heightCm,
    goal,
    daysPerWeek,
    level: experience,
  });

  for (let dayIndex = 1; dayIndex <= 7; dayIndex++) {
    const day = personalized.days[dayIndex];
    customDays[dayIndex] = day
      ? canonicalizePlanDay(day)
      : { ...REST_DAY_TEMPLATE, dayIndex };
  }

  return {
    id: userId,
    userId,
    schemaVersion: 2,
    templateId: splitPreference,
    name: personalized.planName,
    scheduleMode: 'calendar',
    routines: {},
    customDays,
    updatedAt: now,
  };
}

export interface FirstWorkoutPreviewData {
  workoutName: string;
  subtitle: string;
  exerciseCount: number;
  trainingDaysCount: number;
  totalSets: number;
  estimatedMinutes: number;
  trainingMask: boolean[];
  exercises: Array<{
    name: string;
    muscle: string;
    sets: number;
    reps: string;
  }>;
}

/**
 * Returns Day 1 (or first non-rest workout day) summary + exercise lineup for the Athlete Pass reveal.
 */
export function getFirstWorkoutPreview(plan: UserGymPlanDoc): FirstWorkoutPreviewData {
  const days = Object.values(plan.customDays || {}).sort((a, b) => a.dayIndex - b.dayIndex);
  const activeDays = days.filter((d) => !d.isRest && (d.exercises?.length || 0) > 0);
  const first = activeDays[0] || days[0];
  const exList = first?.exercises || [];
  const totalSets = exList.reduce((acc, ex) => acc + (ex.targetSets || 3), 0);
  const trainingMask = [1, 2, 3, 4, 5, 6, 7].map((dayIdx) => {
    const day = plan.customDays?.[dayIdx];
    return Boolean(day && !day.isRest && (day.exercises?.length || 0) > 0);
  });

  return {
    workoutName: first?.name || 'Upper Body A',
    subtitle: first?.subtitle || '',
    exerciseCount: exList.length,
    trainingDaysCount: activeDays.length,
    totalSets,
    estimatedMinutes: Math.max(25, Math.round(totalSets * 2.4)),
    trainingMask,
    exercises: exList.map((ex) => ({
      name: ex.name,
      muscle: ex.muscle || '',
      sets: ex.targetSets || 3,
      reps: ex.targetReps ? String(ex.targetReps) : '8–12',
    })),
  };
}

/**
 * Persists the initial UserGymPlanDoc and Day-1 bodyweight entry directly into L1/L2 caches
 * (since WellnessProvider mounts after onboarding finishes) and queues Firestore sync if signed in.
 */
export async function persistOnboardingPlanAndSeedWeight(params: {
  plan: UserGymPlanDoc;
  weightKg: number;
  isCloudUser: boolean;
  uid: string;
}): Promise<void> {
  const { plan, weightKg, isCloudUser, uid } = params;
  const today = formatLocalDateStr(new Date());
  const weightEntry = {
    id: `${uid}_weight_${today}`,
    userId: uid,
    weight: weightKg,
    weightKg,
    date: today,
    loggedAt: Date.now(),
  };

  const weightList = [weightEntry];

  updateL1Cache('userGymPlan', plan);
  setL1Sync(BOOT_KEYS.USER_GYM_PLAN, plan, true);
  updateL1Cache('weightLogs', weightList as any);
  setL1Sync(BOOT_KEYS.WEIGHT_LOGS, weightList, true);

  await Promise.all([
    AsyncStorage.setItem(BOOT_KEYS.USER_GYM_PLAN, JSON.stringify(plan)).catch(() => {}),
    AsyncStorage.setItem(DOMAIN_CACHE_KEYS.USER_GYM_PLAN, JSON.stringify(plan)).catch(() => {}),
    AsyncStorage.setItem(BOOT_KEYS.WEIGHT_LOGS, JSON.stringify(weightList)).catch(() => {}),
    AsyncStorage.setItem(DOMAIN_CACHE_KEYS.WEIGHT_LOGS, JSON.stringify(weightList)).catch(() => {}),
    writeWellnessCache({ userGymPlan: plan, weightLogs: weightList }, true).catch(() => {}),
  ]);

  if (isCloudUser && uid && uid !== 'guest_local_user') {
    const planDocRef = doc(db, COLLECTION.USER_GYM_PLANS, uid);
    const planPayload = {
      userId: uid,
      schemaVersion: 2,
      templateId: plan.templateId,
      name: plan.name,
      scheduleMode: plan.scheduleMode || 'calendar',
      customDays: plan.customDays,
      updatedAt: plan.updatedAt,
    };
    safeWrite(
      () => setDoc(planDocRef, planPayload, { merge: true }),
      COLLECTION.USER_GYM_PLANS,
      'set',
      planPayload,
      uid
    ).catch(() => {});

    queueWrite(
      COLLECTION.WEIGHT_LOGS,
      'set',
      {
        userId: uid,
        weightKg,
        weight: weightKg,
        date: today,
        createdAt: serverTimestamp(),
      },
      weightEntry.id
    ).catch(() => {});
  }
}
