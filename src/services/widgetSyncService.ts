/**
 * widgetSyncService.ts — ZenFit Live Workout Widget Synchronization Engine
 * Handles live workout state aggregation, caching, and home screen widget updates.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { InteractionManager } from 'react-native';
import { LiveWorkoutWidget } from '../widgets/LiveWorkoutWidget';
import { LiveWorkoutWidgetData } from '../types/widget.types';
import { formatLocalDateStr } from '../utils/dateUtils';
import { planDayIndexForDate, resolvePlanDay } from '../data/gymPlan';
import { dismissActiveWorkoutNotification } from './activeWorkoutNotificationService';

const LIVE_WORKOUT_STORAGE_KEY = '@zenfit_widget_live_workout_data';

// Safe no-op for Expo Go (Android home screen widgets are only active in bare native builds)
const requestWidgetUpdate = async (_options: any): Promise<void> => {};

let _memoryCachedWorkoutData: LiveWorkoutWidgetData | null = null;
let _lastWidgetUpdateTime = 0;
let _pendingWidgetUpdateTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingWidgetData: LiveWorkoutWidgetData | null = null;

/**
 * Builds LiveWorkoutWidgetData from live workout state, logs, and master plan.
 */
export function buildLiveWorkoutWidgetData({
  todayStr: customDateStr,
  gymLogs = [],
  userGymPlan = null,
}: {
  todayStr?: string;
  gymLogs?: any[];
  userGymPlan?: any;
}): LiveWorkoutWidgetData {
  const now = new Date();
  const dateStr = customDateStr || formatLocalDateStr(now);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayIdx = now.getDay();
  const dayOfWeek = dayNames[dayIdx];
  const displayDate = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const planIdx = planDayIndexForDate(dateStr);
  const planDay = resolvePlanDay(userGymPlan, planIdx);

  const todayGym = (gymLogs || []).find((l: any) => l.date === dateStr);

  const isCompleted = !!(
    todayGym?.completed ||
    (todayGym?.workoutDurationMinutes && todayGym.workoutDurationMinutes > 0 && !todayGym?.isRestDay)
  );

  const isRestPlan = !planDay || planDay.isRest === true || planDay.name?.toLowerCase().includes('rest') || (Array.isArray(planDay.exercises) && planDay.exercises.length === 0);
  const isRestDay = !todayGym?.workoutStartTime && isRestPlan;
  const isActive = !!(todayGym?.workoutStartTime && !isCompleted && !todayGym?.isRestDay);

  const splitTitle = isRestDay
    ? 'Rest & Recovery'
    : todayGym?.dayPlanIndex !== undefined && todayGym.name
    ? todayGym.name
    : planDay?.name || 'Workout Session';

  const splitSubtitle = isRestDay
    ? 'Muscles grow while resting'
    : planDay?.focus || planDay?.subtitle || 'Target: Progressive Overload';

  let rawExercises: any[] = [];
  if (Array.isArray(todayGym?.exercises) && todayGym.exercises.length > 0) {
    rawExercises = todayGym.exercises;
  } else if (Array.isArray(planDay?.exercises) && planDay.exercises.length > 0) {
    rawExercises = planDay.exercises;
  }

  const allExercises = rawExercises.map((ex: any, idx: number) => {
    const rawSets = ex.setsLog || ex.sets;
    const targetSetsCount = Array.isArray(rawSets) && rawSets.length > 0
      ? rawSets.length
      : Number(ex.targetSets) || 3;
    const sets = Array.isArray(rawSets) && rawSets.length > 0
      ? rawSets.map((s: any, sIdx: number) => ({
          setNumber: sIdx + 1,
          weight: Number(s.weight) || Number(ex.targetWeight) || 20,
          reps: Number(s.reps) || Number(ex.targetReps) || 10,
          completed: Boolean(s.completed),
        }))
      : Array.from({ length: targetSetsCount }, (_, sIdx) => ({
          setNumber: sIdx + 1,
          weight: Number(ex.targetWeight) || 20,
          reps: Number(ex.targetReps) || 10,
          completed: false,
        }));

    const allSetsCompleted = sets.length > 0 && sets.every((s: any) => s.completed);

    return {
      id: ex.id || `ex-${idx}`,
      name: ex.name || 'Exercise',
      targetSets: targetSetsCount,
      targetWeight: Number(ex.targetWeight) || Number(sets[0]?.weight) || 20,
      targetReps: Number(ex.targetReps) || Number(sets[0]?.reps) || 10,
      completed: allSetsCompleted,
      sets,
    };
  });

  const totalExercises = allExercises.length;
  let currentExerciseIndex = 0;
  if (isActive && totalExercises > 0) {
    const uncompletedExIdx = allExercises.findIndex(ex => !ex.completed);
    currentExerciseIndex = uncompletedExIdx >= 0 ? uncompletedExIdx : totalExercises - 1;
  }

  const curExData = allExercises[currentExerciseIndex];
  let currentExercise: any = undefined;

  if (curExData) {
    const sets = curExData.sets || [];
    const uncompletedSetIdx = sets.findIndex((s: any) => !s.completed);
    const currentSetIndex = uncompletedSetIdx >= 0 ? uncompletedSetIdx : Math.max(0, sets.length - 1);
    const activeSet = sets[currentSetIndex];

    currentExercise = {
      id: curExData.id,
      name: curExData.name,
      targetSets: curExData.targetSets,
      currentSetIndex,
      sets,
      targetWeight: activeSet?.weight ?? curExData.targetWeight ?? 20,
      targetReps: activeSet?.reps ?? curExData.targetReps ?? 10,
    };
  }

  const nextExData = allExercises[currentExerciseIndex + 1];

  let completedSetsCount = 0;
  let totalSetsCount = 0;
  allExercises.forEach(ex => {
    totalSetsCount += ex.targetSets;
    if (ex.sets) {
      completedSetsCount += ex.sets.filter((s: any) => s.completed).length;
    }
  });

  let duration: number | undefined = todayGym?.workoutDurationMinutes;
  if (isActive && todayGym?.workoutStartTime) {
    duration = Math.max(1, Math.round((Date.now() - todayGym.workoutStartTime) / 60000));
  }

  const plannedExercisesPreview = allExercises.map(e => e.name).filter(Boolean);

  return {
    dateStr,
    dayName: dayOfWeek,
    displayDate,
    isActive,
    isCompleted,
    isRestDay,
    splitTitle,
    splitSubtitle,
    workoutDurationMinutes: duration,
    currentExerciseIndex,
    totalExercises,
    currentExercise,
    nextExerciseName: nextExData?.name,
    completedSetsCount,
    totalSetsCount,
    plannedExercisesPreview,
    allExercises,
    lastUpdated: Date.now(),
  };
}

export async function saveCachedLiveWorkoutData(data: LiveWorkoutWidgetData): Promise<void> {
  _memoryCachedWorkoutData = data;
  try {
    await AsyncStorage.setItem(LIVE_WORKOUT_STORAGE_KEY, JSON.stringify(data));
  } catch (_) {}
}

export async function getCachedLiveWorkoutData(): Promise<LiveWorkoutWidgetData | null> {
  if (_memoryCachedWorkoutData) return _memoryCachedWorkoutData;
  try {
    const raw = await AsyncStorage.getItem(LIVE_WORKOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    _memoryCachedWorkoutData = parsed;
    return parsed;
  } catch (_) {
    return null;
  }
}

export async function updateLiveWorkoutWidget(data?: LiveWorkoutWidgetData | null): Promise<void> {
  if (data) _pendingWidgetData = data;
  const now = Date.now();
  const elapsed = now - _lastWidgetUpdateTime;

  if (elapsed < 3000) {
    if (_pendingWidgetUpdateTimer) clearTimeout(_pendingWidgetUpdateTimer);
    _pendingWidgetUpdateTimer = setTimeout(() => {
      _pendingWidgetUpdateTimer = null;
      updateLiveWorkoutWidget(_pendingWidgetData);
    }, 3000 - elapsed);
    return;
  }

  _lastWidgetUpdateTime = now;

  setTimeout(() => {
    InteractionManager.runAfterInteractions(async () => {
      try {
        const widgetData = _pendingWidgetData || data || (await getCachedLiveWorkoutData());
        _pendingWidgetData = null;
        if (!widgetData) return;
        await requestWidgetUpdate({
          widgetName: 'LiveWorkout',
          renderWidget: (props: any) =>
            React.createElement(LiveWorkoutWidget, {
              data: widgetData,
              width: props?.width || 330,
              height: props?.height || 280,
            }),
          widgetNotFound: () => {},
        });
      } catch (_) {}
    });
  }, 100);
}

export async function handleWidgetClickAction(payload: any): Promise<void> {
  if (payload.action === 'finish_workout_session') {
    await dismissActiveWorkoutNotification();
  }
}
