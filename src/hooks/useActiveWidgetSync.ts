import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, AppState, InteractionManager } from 'react-native';
import { todayStr } from './useGymLog';
import { saveCachedLiveWorkoutData, updateLiveWorkoutWidget } from '../services/widgetSyncService';
import type { LiveWorkoutWidgetData } from '../types/widget.types';

interface UseActiveWidgetSyncProps {
  activeExercises: any[];
  safeIdx: number;
  date: string;
  log: any;
}

/**
 * Hook to synchronize active workout state with the Android Home Screen Widget.
 * Strictly synced on AppState backgrounding or workout start/completion.
 * Never runs on active set logging or typing so foreground interactions remain 120fps.
 */
export function useActiveWidgetSync({
  activeExercises,
  safeIdx,
  date,
  log,
}: UseActiveWidgetSyncProps) {
  const [appState, setAppState] = useState(AppState.currentState);
  const prevAppStateRef = useRef(AppState.currentState);

  const latestWidgetStateRef = useRef({
    activeExercises,
    safeIdx,
    date,
    logDate: log?.date,
    isCompleted: Boolean(log?.completed),
    dayPlanIndex: log?.dayPlanIndex,
    workoutDurationMinutes: log?.workoutDurationMinutes,
    splitName: (log as any)?.name,
  });

  useEffect(() => {
    latestWidgetStateRef.current = {
      activeExercises,
      safeIdx,
      date,
      logDate: log?.date,
      isCompleted: Boolean(log?.completed),
      dayPlanIndex: log?.dayPlanIndex,
      workoutDurationMinutes: log?.workoutDurationMinutes,
      splitName: (log as any)?.name,
    };
  }, [
    activeExercises,
    safeIdx,
    date,
    log?.date,
    log?.completed,
    log?.workoutDurationMinutes,
    log?.dayPlanIndex,
    (log as any)?.name,
  ]);

  const syncAndroidLiveWidget = useCallback(() => {
    if (Platform.OS !== 'android') return;
    const {
      activeExercises: exercises,
      safeIdx: curIdx,
      date: curDate,
      logDate,
      isCompleted,
      dayPlanIndex,
      workoutDurationMinutes,
      splitName,
    } = latestWidgetStateRef.current;

    if (!exercises || exercises.length === 0) return;

    InteractionManager.runAfterInteractions(() => {
      const currentEx = exercises[curIdx] || exercises[0];
      if (!currentEx) return;
      const nextEx = exercises[curIdx + 1];
      const completedSets = exercises.reduce(
        (sum, ex) => sum + (ex.setsLog || []).filter((s: any) => s.completed).length,
        0
      );
      const totalSets = exercises.reduce(
        (sum, ex) => sum + (ex.setsLog || []).length,
        0
      );

      const now = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[now.getDay()];
      const displayDate = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      const widgetData: LiveWorkoutWidgetData = {
        dateStr: curDate || logDate || todayStr(),
        dayName,
        displayDate,
        isActive: !isCompleted,
        isCompleted,
        isRestDay: false,
        splitTitle: `${splitName || 'Workout'} • Ex ${curIdx + 1}/${exercises.length}`,
        splitSubtitle: currentEx ? `${currentEx.name} (${currentEx.targetSets || 3} × ${currentEx.targetReps || '8-12'})` : 'Workout in progress',
        workoutDurationMinutes,
        currentExerciseIndex: curIdx,
        totalExercises: exercises.length,
        currentExercise: {
          id: currentEx.id || currentEx.name,
          name: currentEx.name,
          targetSets: currentEx.setsLog?.length || currentEx.targetSets || 4,
          currentSetIndex: (currentEx.setsLog || []).findIndex((s: any) => !s.completed) >= 0
            ? (currentEx.setsLog || []).findIndex((s: any) => !s.completed)
            : 0,
          sets: (currentEx.setsLog || []).map((s: any, idx: number) => ({
            setNumber: idx + 1,
            weight: Number(s.weight) || 0,
            reps: Number(s.reps) || 10,
            completed: Boolean(s.completed),
          })),
          targetWeight: currentEx.setsLog?.[0]?.weight != null ? Number(currentEx.setsLog[0].weight) : null,
          targetReps: currentEx.setsLog?.[0]?.reps != null ? Number(currentEx.setsLog[0].reps) : null,
        },
        nextExerciseName: nextEx?.name,
        completedSetsCount: completedSets,
        totalSetsCount: totalSets,
        plannedExercisesPreview: exercises.map(e => e.name),
        lastUpdated: Date.now(),
      };

      saveCachedLiveWorkoutData(widgetData).catch(() => {});
      updateLiveWorkoutWidget(widgetData).catch(() => {});
    });
  }, []);

  // Sync on AppState backgrounding
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (prevAppStateRef.current === 'active' && (nextState === 'background' || nextState === 'inactive')) {
        syncAndroidLiveWidget();
      }
      prevAppStateRef.current = nextState;
      setAppState(nextState);
    });
    return () => sub.remove();
  }, [syncAndroidLiveWidget]);

  // Sync on mount / workout completion
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    syncAndroidLiveWidget();
  }, [log?.completed, syncAndroidLiveWidget]);

  return {
    appState,
    syncAndroidLiveWidget,
  };
}
