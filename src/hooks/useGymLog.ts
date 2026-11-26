import { getRotationNextDayIndex } from '../services/gymRotationService';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { InteractionManager, DeviceEventEmitter, AppState } from 'react-native';
import { collection, doc, setDoc, updateDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useGymLogs, useGymPlan, getWorkoutActiveGlobal } from '../contexts/domains/WellnessContext';
import { useCoreData } from '../contexts/domains/CoreDataContext';
import { GYM_PLAN, GYM_PLAN_ARNOLD, WEEKDAY_TO_PLAN } from '../data/gymPlan';
import { GymDayLog, GymExerciseLog, GymSet, GymCardioLog, GymPlanCardio, GymPlanDay } from '../types/gym.types';

function debounce<T extends (...args: any[]) => any>(fn: T, ms: number) {
  let timer: any;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { COLLECTION } from '../config/constants';
import { deepSanitize, getMonotonicTimestamp } from '../utils/firebaseUtils';
import { awardXP } from '../services/xpSystem';
import { getPreviousExerciseSession, buildExerciseHistoryIndex, normalizeExerciseKey, resolveExerciseTargetMuscle, mergeGymLogMonotonic, getCanonicalExerciseName } from '../utils/gymUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  dismissActiveWorkoutNotification,
  showWorkoutInProgressNotification,
  showWorkoutCompletedNotification,
  scheduleWorkoutAutoFinishNotification,
  cancelWorkoutAutoFinishNotification,
} from '../services/activeWorkoutNotificationService';
import { cancelTodayTrainingAlerts, reconcileNotificationQueue } from '../services/notifications';
import { REST_TIMER_CHANNEL_ID } from '../services/notificationChannels';
import { safeWrite } from '../utils/safeWrite';
import { buildLiveWorkoutWidgetData, saveCachedLiveWorkoutData, updateLiveWorkoutWidget } from '../services/widgetSyncService';
import { setWorkoutActiveGlobal } from '../contexts/domains/WellnessContext';
import { isAutoTimerEnabledSync } from './useGymProfile';
import { generateDatasetFingerprint } from '../utils/hotCacheStore';
import { writeWellnessCache, flushDomainCache } from '../utils/domainCache';
import { updateL1Cache, setL1Sync, getL1Sync, L1_RAM_CACHE } from '../utils/bootManifest';
import { recordExerciseToLedger } from '../utils/exerciseLedger';
import { SCIENTIFIC_BY_NAME } from '../data/scientificExerciseMap';
import { detectPR } from '../utils/progressiveOverload';
import {
  startGlobalRestTimer,
  clearGlobalRestTimer,
  setGlobalRestTimerDuration,
  getGlobalRestTimer,
  REST_TIMER_EVENT,
} from '../services/restTimerService';




// Issue 4: Module-scope debounce queue keyed by logId so all useGymLog instances share a single write queue
const globalPendingFirestoreWrites = new Map<string, { log: GymDayLog; timer: ReturnType<typeof setTimeout> | null }>();

async function executeFirestoreLogWrite(logId: string, updatedLog: GymDayLog) {
  try {
    const docRef = doc(db, COLLECTION.GYM_LOGS, logId);
    const sanitizedLog: any = { id: logId };
    Object.keys(updatedLog).forEach(key => {
      if (key === '_idx') return;
      const val = (updatedLog as any)[key];
      if (val !== undefined && val !== null) {
        sanitizedLog[key] = deepSanitize(val);
      }
    });
    if (Array.isArray(sanitizedLog.exercises)) {
      sanitizedLog.exercises = sanitizedLog.exercises.map((ex: any) => {
        const cleanEx = { ...ex };
        delete cleanEx._idx;
        delete cleanEx.lastSessionSets;
        return cleanEx;
      });
    }
    const onlinePayload: any = { ...sanitizedLog };
    const offlinePayload: any = { ...sanitizedLog };
    if (updatedLog.completed) {
      onlinePayload.completed = true;
      onlinePayload.workoutStartTime = deleteField();
      onlinePayload.restTimerStartTime = deleteField();
      onlinePayload.restTimerDurationSecs = deleteField();
      onlinePayload.restTimerExerciseName = deleteField();

      offlinePayload.completed = true;
      offlinePayload.workoutStartTime = { __zentrackDeleteField: true, $op: 'deleteField' };
      offlinePayload.restTimerStartTime = { __zentrackDeleteField: true, $op: 'deleteField' };
      offlinePayload.restTimerDurationSecs = { __zentrackDeleteField: true, $op: 'deleteField' };
      offlinePayload.restTimerExerciseName = { __zentrackDeleteField: true, $op: 'deleteField' };
    }
    await safeWrite(
      () => setDoc(docRef, onlinePayload, { merge: true }),
      COLLECTION.GYM_LOGS,
      'set',
      offlinePayload,
      logId,
      true
    );
  } catch (e) {
    console.error('[Gym] Save error', e);
  }
}

export async function flushGlobalPendingFirestoreWrite(targetLogId?: string) {
  if (targetLogId) {
    const entry = globalPendingFirestoreWrites.get(targetLogId);
    if (!entry) return;
    if (entry.timer) clearTimeout(entry.timer);
    globalPendingFirestoreWrites.delete(targetLogId);
    await executeFirestoreLogWrite(targetLogId, entry.log);
  } else {
    const entries = Array.from(globalPendingFirestoreWrites.entries());
    globalPendingFirestoreWrites.clear();
    for (const [id, entry] of entries) {
      if (entry.timer) clearTimeout(entry.timer);
      await executeFirestoreLogWrite(id, entry.log);
    }
  }
}

// ── Re-export date & plan helpers from gymPlan (breaks circular dependency with widgetSyncService) ──
import {
  todayStr,
  dateStrOffset,
  planDayIndexForDate,
  getCustomPlanDay,
  resolvePlanDay,
} from '../data/gymPlan';
export {
  todayStr,
  dateStrOffset,
  planDayIndexForDate,
  getCustomPlanDay,
  resolvePlanDay,
};

export function mapPlanCardioToLogs(planCardio?: GymPlanCardio[] | null): GymCardioLog[] {
  if (!Array.isArray(planCardio) || planCardio.length === 0) return [];
  const baseTs = Date.now();
  return planCardio.map((c, idx) => ({
    id: c.id || `cardio_plan_${idx}_${baseTs}`,
    type: c.type || 'Cardio',
    durationMinutes: c.durationMinutes ?? null,
    distanceKm: c.distanceKm ?? null,
    speedKmh: c.speedKmh ?? null,
    incline: c.incline ?? null,
    calories: c.calories ?? null,
    floors: c.floors ?? null,
    level: c.level ?? null,
    laps: c.laps ?? null,
    rounds: c.rounds ?? null,
    spm: c.spm ?? null,
    pace: c.pace ?? null,
    completed: false,
  }));
}

export function useGymLog(dateStr: string, options?: { skipHistoryIndex?: boolean }) {
  const skipHistoryIndex = Boolean(options?.skipHistoryIndex);
  const { gymLogs, gymLogsReady, ensureSubscribed: gymEnsureSubscribed, optimisticAddGymLog, optimisticUpdateGymLog } = useGymLogs();
  const { userGymPlan, updateMasterPlan, updateFullMasterPlan } = useGymPlan();
  const { user } = useCoreData();

  // ── FIX 1: Ref-based gymLogs access inside saveLog ────────────────────────
  // Keeping gymLogs in saveLog's deps caused a new saveLog reference on EVERY
  // Firestore snapshot, which cascaded to recreate all 10+ useCallbacks that
  // depend on saveLog — triggering a full screen re-render on each snapshot.
  // Using a ref breaks that chain: saveLog always reads the latest gymLogs
  // without becoming a new function reference when the array changes.
  const gymLogsRef = useRef(gymLogs);
  useEffect(() => {
    gymLogsRef.current = gymLogs;
  });

  useEffect(() => {
    gymEnsureSubscribed?.();
  }, [gymEnsureSubscribed]);

  // ── Reset local workout state on sign-out ─────────────────────────────────
  // When user becomes null (logout), wipe the local log and today's active draft
  // so no ghost workoutStartTime bleeds into the next login session.
  useEffect(() => {
    if (user === null) {
      if (pendingOptimisticUpdateTimerRef.current) {
        clearTimeout(pendingOptimisticUpdateTimerRef.current);
        pendingOptimisticUpdateTimerRef.current = null;
      }
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }
      for (const entry of globalPendingFirestoreWrites.values()) {
        if (entry.timer) clearTimeout(entry.timer);
      }
      globalPendingFirestoreWrites.clear();
      setLog(null);
      logRef.current = null;
      localWriteAtRef.current = 0;
      L1_RAM_CACHE.delete(`gym_active_draft_${dateStr}`);
      const todayKey = `gym_active_draft_${dateStr}`;
      AsyncStorage.multiRemove([
        '@zentrack_active_workout_state',
        todayKey,
      ]).catch(() => {});
    }
  }, [user, dateStr]);

  const userGymPlanRef = useRef(userGymPlan);
  const updateMasterPlanRef = useRef(updateMasterPlan);
  useEffect(() => {
    userGymPlanRef.current = userGymPlan;
    updateMasterPlanRef.current = updateMasterPlan;
  });

  const debouncedSyncMasterPlan = useRef(
    debounce((newExercises: GymExerciseLog[], planDayIndex: number) => {
      const existingPlan = resolvePlanDay(userGymPlanRef.current, planDayIndex);
      updateMasterPlanRef.current(planDayIndex, {
        dayIndex: planDayIndex,
        name: existingPlan?.name || `Day ${planDayIndex}`,
        subtitle: existingPlan?.subtitle || '',
        focus: existingPlan?.focus || '',
        exercises: newExercises.map(ex => ({
          id: ex.exerciseId || (ex as any).id || `ex_${normalizeExerciseKey(ex.name)}`,
          name: ex.name,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          muscle: ex.muscle,
          videoId: ex.videoId,
          restTimeSecs: ex.restTimeSecs,
          isCompound: ex.isCompound,
        })) as any,
        cardio: existingPlan?.cardio || [],
        isRest: existingPlan?.isRest || false,
      });
    }, 3500)
  ).current;

  const [log, setLog] = useState<GymDayLog | null>(() => {
    if (!dateStr) return null;
    const effectiveUid = user?.uid || auth.currentUser?.uid || 'local_user';
    const existing = (gymLogs || []).find(l => l.date === dateStr);
    const initialPlanIdx = userGymPlan?.scheduleMode === 'rotation'
      ? getRotationNextDayIndex(userGymPlan, gymLogs || [], dateStr)
      : planDayIndexForDate(dateStr);
    const initialPlanDay = resolvePlanDay(userGymPlan, initialPlanIdx);

    const draft =
      getL1Sync<any>(`gym_active_draft_${effectiveUid}_${dateStr}`, null) ||
      (existing?.id ? getL1Sync<any>(`gym_active_draft_${existing.id}`, null) : null) ||
      getL1Sync<any>(`gym_active_draft_${dateStr}`, null);

    if (draft && draft.date === dateStr && !draft.completed && !existing?.completed) {
      const draftCompleted = (draft.exercises || []).reduce((acc: number, ex: any) => acc + (ex.setsLog || []).filter((s: any) => s.completed).length, 0);
      const existingCompleted = (existing?.exercises || []).reduce((acc: number, ex: any) => acc + (ex.setsLog || []).filter((s: any) => s.completed).length, 0);
      if (draftCompleted > existingCompleted || Number(draft.updatedAt || 0) > Number(existing?.updatedAt || 0) || !existing) {
        return draft;
      }
    }

    // Lazily pull cached history index only when a new or empty day needs template seeding
    const getSeedHistory = () => (skipHistoryIndex ? new Map() : buildExerciseHistoryIndex(gymLogs, dateStr));

    if (existing) {
      let patchedExercises = (existing.exercises || []).map((ex, idx) => ({ ...ex, _idx: idx }));
      if (patchedExercises.length === 0 && initialPlanDay && !initialPlanDay.isRest && Array.isArray(initialPlanDay.exercises)) {
        const seedIdx = getSeedHistory();
        patchedExercises = initialPlanDay.exercises.map((e: any, idx: number) => {
          const prevSession = seedIdx.get(normalizeExerciseKey(e.name));
          const lastSets = prevSession?.sets || null;
          const lastValidSet = lastSets && lastSets.length > 0 ? lastSets[lastSets.length - 1] : null;
          const defaultTargetReps = parseInt(String(e.targetReps || '8-12').split(/[-–—]/)[0], 10) || 8;
          return {
            _idx: idx,
            exerciseId: e.id,
            name: e.name,
            targetSets: e.targetSets,
            targetReps: e.targetReps,
            muscle: resolveExerciseTargetMuscle(e.name, e.muscle).targetMuscle,
            videoId: e.videoId,
            restTimeSecs: e.restTimeSecs,
            lastSessionSets: lastSets ?? undefined,
            setsLog: Array.from({ length: e.targetSets || 3 }, (_, i) => {
              const lastSet = lastSets?.[i] || lastValidSet;
              return {
                setNumber: i + 1,
                reps: lastSet?.reps ? Number(lastSet.reps) : defaultTargetReps,
                weight: (lastSet?.weight != null && Number(lastSet.weight) >= 0) ? Number(lastSet.weight) : null,
                completed: false,
              };
            }),
          };
        });
      }
      const templateCardio = (existing.cardio && existing.cardio.length > 0)
        ? existing.cardio
        : (!existing.completed && !existing.workoutStartTime && initialPlanDay && !initialPlanDay.isRest && Number(userGymPlan?.updatedAt || 0) >= Number(existing.updatedAt || 0))
        ? mapPlanCardioToLogs(initialPlanDay.cardio)
        : [];
      return {
        ...existing,
        id: existing.id || (user?.uid ? `${user.uid}_${dateStr}` : undefined),
        dayPlanIndex: existing.dayPlanIndex ?? initialPlanIdx,
        exercises: patchedExercises,
        cardio: templateCardio,
        ...(existing.completed ? { workoutStartTime: undefined } : {}),
      } as GymDayLog;
    }

    const seedIdx = getSeedHistory();
    const templateExercises = (initialPlanDay && !initialPlanDay.isRest && Array.isArray(initialPlanDay.exercises))
      ? initialPlanDay.exercises.map((e: any, idx: number) => {
          const prevSession = seedIdx.get(normalizeExerciseKey(e.name));
          const lastSets = prevSession?.sets || null;
          const lastValidSet = lastSets && lastSets.length > 0 ? lastSets[lastSets.length - 1] : null;
          const defaultTargetReps = parseInt(String(e.targetReps || '8-12').split(/[-–—]/)[0], 10) || 8;
          return {
            _idx: idx,
            exerciseId: e.id,
            name: e.name,
            targetSets: e.targetSets,
            targetReps: e.targetReps,
            muscle: resolveExerciseTargetMuscle(e.name, e.muscle).targetMuscle,
            videoId: e.videoId,
            restTimeSecs: e.restTimeSecs,
            lastSessionSets: lastSets ?? undefined,
            setsLog: Array.from({ length: e.targetSets || 3 }, (_, i) => {
              const lastSet = lastSets?.[i] || lastValidSet;
              return {
                setNumber: i + 1,
                reps: lastSet?.reps ? Number(lastSet.reps) : defaultTargetReps,
                weight: (lastSet?.weight != null && Number(lastSet.weight) >= 0) ? Number(lastSet.weight) : null,
                completed: false,
              };
            }),
          };
        })
      : [];
    const templateCardio = (!initialPlanDay?.isRest && Array.isArray(initialPlanDay?.cardio))
      ? mapPlanCardioToLogs(initialPlanDay.cardio)
      : [];

    return {
      userId: user?.uid || '',
      id: user?.uid ? `${user.uid}_${dateStr}` : undefined,
      date: dateStr,
      dayPlanIndex: initialPlanIdx,
      exercises: templateExercises,
      cardio: templateCardio,
      createdAt: 0,
      updatedAt: 0,
    };
  });
  const [restTimerState, setRestTimerState] = useState<{
    startTime?: number;
    durationSecs?: number;
    exerciseName?: string;
  }>({});

  useEffect(() => {
    const initialGlobal = getGlobalRestTimer();
    if (initialGlobal && initialGlobal.startTime && initialGlobal.durationSecs) {
      setRestTimerState({
        startTime: initialGlobal.startTime,
        durationSecs: initialGlobal.durationSecs,
        exerciseName: initialGlobal.exerciseName,
      });
    }

    const sub = DeviceEventEmitter.addListener(REST_TIMER_EVENT, (timer) => {
      if (timer && timer.startTime && timer.durationSecs) {
        setRestTimerState({
          startTime: timer.startTime,
          durationSecs: timer.durationSecs,
          exerciseName: timer.exerciseName,
        });
      } else {
        setRestTimerState({});
      }
    });
    return () => sub.remove();
  }, []);
  const [reloadKey, setReloadKey] = useState(0);
  const logRef = useRef<GymDayLog | null>(log);
  // Tracks the most recent local write timestamp so we can skip stale Firestore snapshots
  const localWriteAtRef = useRef<number>(0);

  const instanceIdRef = useRef<string>('gym_inst_' + Math.random().toString(36).slice(2));
  const pendingOptimisticUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingOptimisticUpdateLogRef = useRef<{ logId: string; log: GymDayLog } | null>(null);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingOptimisticUpdate = useCallback(() => {
    if (pendingOptimisticUpdateTimerRef.current) {
      clearTimeout(pendingOptimisticUpdateTimerRef.current);
      pendingOptimisticUpdateTimerRef.current = null;
    }
    const pending = pendingOptimisticUpdateLogRef.current;
    if (pending) {
      pendingOptimisticUpdateLogRef.current = null;
      // Synchronously update gymLogsRef so rapid date switches immediately see committed logs
      const existingIdx = gymLogsRef.current.findIndex(l => l.id === pending.logId || l.date === pending.log.date);
      if (existingIdx !== -1) {
        gymLogsRef.current[existingIdx] = pending.log;
      } else {
        gymLogsRef.current.push(pending.log);
      }
      queueMicrotask(() => {
        optimisticUpdateGymLog(pending.logId, pending.log as any);
      });
      queueMicrotask(() => {
        DeviceEventEmitter.emit('gym_log_local_mutation', {
          date: pending.log.date,
          log: pending.log,
          senderId: instanceIdRef.current,
        });
      });
    }
  }, [optimisticUpdateGymLog]);

  const flushPendingFirestoreWrite = useCallback(async () => {
    if (!user) return;
    const logId = logRef.current?.id || `${user.uid}_${dateStr}`;
    await flushGlobalPendingFirestoreWrite(logId);
  }, [user, dateStr]);

  // Pass shared `gymLogs` reference directly so WeakMap fingerprint + HotCache hit O(1) on open
  const pastLogsFingerprint = useMemo(
    () => (skipHistoryIndex || !dateStr ? 'empty' : generateDatasetFingerprint(gymLogs, dateStr)),
    [skipHistoryIndex, gymLogs, dateStr]
  );
  const historyIndex = useMemo(
    () => (skipHistoryIndex || !dateStr ? new Map() : buildExerciseHistoryIndex(gymLogs, dateStr)),
    [skipHistoryIndex, pastLogsFingerprint, dateStr, gymLogs]
  );

  useEffect(() => {
    logRef.current = log;
  }, [log]);

  const endWorkoutRef = useRef<((completed?: boolean, overrideExercises?: GymExerciseLog[]) => Promise<GymDayLog | void>) | null>(null);
  const prevDateStrRef = useRef<string | null>(null);
  const prevPlanUpdatedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!dateStr) return;
    const isDateSwitch = prevDateStrRef.current !== null && prevDateStrRef.current !== dateStr;
    if (isDateSwitch) {
      const prevDate = prevDateStrRef.current!;
      const prevLogId = logRef.current?.id || (user?.uid ? `${user.uid}_${prevDate}` : undefined);

      // 1. Synchronously commit any pending optimistic update for the previous date into WellnessContext.gymLogs!
      flushPendingOptimisticUpdate();

      // 2. Flush any pending draft timer for the previous date immediately
      if (draftSaveTimerRef.current && logRef.current && !logRef.current.completed && prevLogId) {
        clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
        setL1Sync(`gym_active_draft_${prevLogId}`, logRef.current);
      }

      // 3. Flush Firestore write using the PREVIOUS date's logId (not the new dateStr!)
      if (prevLogId) {
        flushGlobalPendingFirestoreWrite(prevLogId);
      }

      setLog(null);
      logRef.current = null;
      localWriteAtRef.current = 0;
    }
    prevDateStrRef.current = dateStr;

    // Only skip hydration if we are on the SAME date and wrote within the last 5000ms
    if (!isDateSwitch && logRef.current && logRef.current.date === dateStr && (Date.now() - localWriteAtRef.current) < 5000) {
      return;
    }

    const currentPlanUpdatedAt = userGymPlan?.updatedAt ?? 0;
    if (prevPlanUpdatedRef.current !== null && prevPlanUpdatedRef.current !== currentPlanUpdatedAt) {
      // Issue #87: Check completed sets or completed cardio so unstarted templates update with plan edits
      const hasLoggedSets = (logRef.current?.exercises || []).some((ex: any) =>
        (ex.setsLog || []).some((s: any) => s.completed === true)
      );
      const hasCompletedCardio = (logRef.current?.cardio || []).some((c: any) => Boolean(c.completed));
      if (
        logRef.current &&
        !logRef.current.workoutStartTime &&
        !logRef.current.completed &&
        !hasLoggedSets &&
        !hasCompletedCardio
      ) {
        setLog(null);
        logRef.current = null;
        localWriteAtRef.current = 0;
      }
    }
    prevPlanUpdatedRef.current = currentPlanUpdatedAt;

    const planIdx = userGymPlan?.scheduleMode === 'rotation'
      ? getRotationNextDayIndex(userGymPlan, gymLogs || [], dateStr)
      : planDayIndexForDate(dateStr);
    const planDay = resolvePlanDay(userGymPlan, planIdx);

    const existing = (gymLogs || []).find(l => l.date === dateStr);

    if (existing) {
      const existingTs: number =
        typeof existing.updatedAt === 'number'
          ? existing.updatedAt
          : (existing.updatedAt as any)?.toMillis?.() ?? 0;
      const localTs: number = logRef.current?.updatedAt ?? 0;

      // If local state is already marked completed for today, never let a stale uncompleted snapshot from Firestore revert it
      if (logRef.current?.completed && !existing.completed && dateStr === todayStr()) {
        return;
      }

      // ── FIX 3: Strengthen the local-write guard with a 5000ms grace window.
      // The original guard compared Firestore server timestamps vs local Date.now() timestamps.
      // Server timestamps can differ from client time (clock skew, latency), causing the
      // guard to fail and let the Firestore echo snapshot re-run setLog() right after a write.
      // Grace window: if we wrote within the last 5000ms, always skip Firestore snapshots
      // for this document — our local state is definitively fresher.
      const recentLocalWrite = (Date.now() - localWriteAtRef.current) < 5000;

      // Only skip if: local state is newer AND local exercises have actual weight data
      const localHasWeights = (logRef.current?.exercises || []).some((ex: any) =>
        (ex.setsLog || []).some((s: any) => s.weight !== null && s.weight !== undefined && Number(s.weight) >= 0)
      );
      const firestoreHasWeights = (existing.exercises || []).some((ex: any) =>
        (ex.setsLog || []).some((s: any) => s.weight !== null && s.weight !== undefined && Number(s.weight) >= 0)
      );

      // ── Secondary guard: if Firestore snapshot has fewer completed sets than local
      // state, it is definitively stale (a server-confirmed echo of an older state).
      // This covers the ~500ms delayed server-confirmation snapshot that arrives after
      // the hasPendingWrites echo is already blocked in WellnessContext.
      const localCompletedCount = (logRef.current?.exercises || []).reduce(
        (sum: number, ex: any) => sum + (ex.setsLog || []).filter((s: any) => s.completed).length, 0
      );
      const firestoreCompletedCount = (existing.exercises || []).reduce(
        (sum: number, ex: any) => sum + (ex.setsLog || []).filter((s: any) => s.completed).length, 0
      );
      const firestoreIsStale = logRef.current !== null && firestoreCompletedCount < localCompletedCount;

      // ── Active workout protection: shield in-progress workouts from older server echoes,
      // but accept newer snapshots or updates that contain more/equal completed sets
      const isLocalSessionActive = logRef.current !== null && !logRef.current.completed;
      if (isLocalSessionActive) {
        if (firestoreCompletedCount <= localCompletedCount && (localTs >= existingTs || recentLocalWrite)) {
          return;
        }
      }

      if (logRef.current && (recentLocalWrite || firestoreIsStale || (existingTs <= localTs && (logRef.current.exercises?.length ?? 0) > 0 && (localHasWeights || !firestoreHasWeights)))) {
        return; // Local write in-flight or Firestore snapshot is older than local state — skip
      }

      let patchedExercises: GymExerciseLog[] = [];

      const isHistorical = !!(
        existing.completed ||
        existing.workoutStartTime ||
        (existing.exercises || []).some((e: any) =>
          (e.setsLog || []).some((s: any) => Boolean(s.completed))
        )
      );

      if (isHistorical && existing.exercises && existing.exercises.length > 0) {
        patchedExercises = existing.exercises.map((ex, idx) => {
          const effectiveName = ex.name;
          const prevSession = historyIndex.get(normalizeExerciseKey(effectiveName));
          const lastSets = prevSession?.sets || null;
          const lastValidSet = lastSets && lastSets.length > 0 ? lastSets[lastSets.length - 1] : null;

          let patchedVideoId = ex.videoId;
          if (!patchedVideoId && planDay && Array.isArray(planDay.exercises)) {
            const planEx = planDay.exercises.find((pe: any) => pe.id === ex.exerciseId || pe.name === effectiveName || pe.name === ex.name);
            if (planEx?.videoId) {
              patchedVideoId = planEx.videoId;
            }
          }

          let patchedMuscle = ex.muscle;
          if (!patchedMuscle || ['general', 'unknown', 'none', 'mixed', 'null', 'undefined'].includes(patchedMuscle.trim().toLowerCase())) {
            patchedMuscle = resolveExerciseTargetMuscle(effectiveName, ex.muscle).targetMuscle;
          }

          // Pre-fill unlogged set values with last session's exact set data (Issue 5: preserve explicit 0 weight)
          const patchedSetsLog = (ex.setsLog || []).map((s: any, sIdx: number) => {
            const lastSet = lastSets?.[sIdx] || lastValidSet;
            const hasUserWeight = s.weight !== null && s.weight !== undefined && !isNaN(Number(s.weight));
            const userLoggedWeight = hasUserWeight ? Number(s.weight) : null;
            const finalWeight = userLoggedWeight ?? (lastSet?.weight != null && Number(lastSet.weight) >= 0 ? Number(lastSet.weight) : null);

            const hasUserReps = s.reps !== null && s.reps !== undefined && !isNaN(Number(s.reps));
            const userLoggedReps = hasUserReps ? Number(s.reps) : null;
            const defaultTargetReps = parseInt(String(ex.targetReps || '8-12').split(/[-–—]/)[0], 10) || 8;
            const finalReps = userLoggedReps ?? (lastSet?.reps ? Number(lastSet.reps) : defaultTargetReps);

            return {
              ...s,
              reps: finalReps,
              weight: finalWeight,
            };
          });

          return {
            ...ex,
            _idx: idx,
            name: effectiveName,
            muscle: patchedMuscle,
            videoId: patchedVideoId,
            lastSessionSets: lastSets || ex.lastSessionSets || undefined,
            setsLog: patchedSetsLog,
          };
        });
      } else if (planDay && !planDay.isRest && Array.isArray(planDay.exercises) && planDay.exercises.length > 0) {
        patchedExercises = planDay.exercises.map((e: any, idx: number) => {
          const prevSession = historyIndex.get(normalizeExerciseKey(e.name));
          const lastSets = prevSession?.sets || null;
          const lastValidSet = lastSets && lastSets.length > 0 ? lastSets[lastSets.length - 1] : null;

          let patchedMuscle = e.muscle;
          if (!patchedMuscle || ['general', 'unknown', 'none', 'mixed', 'null', 'undefined'].includes(patchedMuscle.trim().toLowerCase())) {
            patchedMuscle = resolveExerciseTargetMuscle(e.name, e.muscle).targetMuscle;
          }

          return {
            _idx: idx,
            exerciseId: e.id,
            name: e.name,
            targetSets: e.targetSets,
            targetReps: e.targetReps,
            muscle: patchedMuscle,
            videoId: e.videoId,
            restTimeSecs: e.restTimeSecs,
            lastSessionSets: lastSets ?? undefined,
            setsLog: Array.from({ length: e.targetSets }, (_, i) => {
              const lastSet = lastSets?.[i] || lastValidSet;
              const setWeight = (lastSet?.weight != null && Number(lastSet.weight) >= 0) ? Number(lastSet.weight) : null;
              const defaultTargetReps = parseInt(String(e.targetReps || '8-12').split(/[-–—]/)[0], 10) || 8;
              return {
                setNumber: i + 1,
                reps: lastSet?.reps ? Number(lastSet.reps) : defaultTargetReps,
                weight: setWeight,
                completed: false,
              };
            }),
          };
        });
      } else if (existing.exercises && existing.exercises.length > 0) {
        patchedExercises = existing.exercises.map((ex, idx) => ({ ...ex, _idx: idx }));
      }

      const existingTsNum: number =
        typeof existing.updatedAt === 'number'
          ? existing.updatedAt
          : (existing.updatedAt as any)?.toMillis?.() ?? 0;
      const shouldSeedPlanCardio =
        !isHistorical &&
        !existing.completed &&
        !existing.workoutStartTime &&
        (!existing.cardio || existing.cardio.length === 0) &&
        planDay &&
        !planDay.isRest &&
        Array.isArray(planDay.cardio) &&
        planDay.cardio.length > 0 &&
        (existingTsNum === 0 || currentPlanUpdatedAt >= existingTsNum);

      let patchedLog = { 
        ...existing, 
        id: existing.id || (user?.uid ? `${user.uid}_${dateStr}` : undefined),
        dayPlanIndex: isHistorical ? (existing.dayPlanIndex ?? planIdx) : planIdx,
        exercises: patchedExercises,
        ...(shouldSeedPlanCardio ? { cardio: mapPlanCardioToLogs(planDay.cardio) } : {}),
        ...(existing.completed ? { workoutStartTime: undefined } : {}),
      } as GymDayLog;
      if (!patchedLog.cardio) {
        patchedLog.cardio = [];
      }
      setLog(prev => {
        const merged = mergeGymLogMonotonic(prev, patchedLog);
        if (merged?.completed) {
          merged.workoutStartTime = undefined;
        }
        return merged;
      });
    } else {
      // CRITICAL FIX: If local state (logRef.current) already has a started/completed workout
      // or ANY logged sets/weights for this dateStr, NEVER overwrite it with a blank template!
      const localHasProgress =
        logRef.current &&
        logRef.current.date === dateStr &&
        (logRef.current.completed ||
          logRef.current.workoutStartTime ||
          (logRef.current.exercises || []).some((ex: any) =>
            (ex.setsLog || []).some(
              (s: any) => s.completed || (s.weight != null && Number(s.weight) >= 0)
            )
          ));

      if (localHasProgress) {
        return;
      }

      // No existing record in Firestore -> create log from planDay
      const newExercises = (planDay && !planDay.isRest && Array.isArray(planDay.exercises)) ? planDay.exercises.map((e: any, idx: number) => {
        const prevSession = historyIndex.get(normalizeExerciseKey(e.name));
        const lastSets = prevSession?.sets || null;
        const lastValidSet = lastSets && lastSets.length > 0 ? lastSets[lastSets.length - 1] : null;
        const defaultTargetReps = parseInt(String(e.targetReps || '8-12').split(/[-–—]/)[0], 10) || 8;

        let patchedMuscle = e.muscle;
        if (!patchedMuscle || ['general', 'unknown', 'none', 'mixed', 'null', 'undefined'].includes(patchedMuscle.trim().toLowerCase())) {
          patchedMuscle = resolveExerciseTargetMuscle(e.name, e.muscle).targetMuscle;
        }

        return {
          _idx: idx,
          exerciseId: e.id,
          name: e.name,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
          muscle: patchedMuscle,
          videoId: e.videoId,
          restTimeSecs: e.restTimeSecs,
          lastSessionSets: lastSets ?? undefined,
          setsLog: Array.from({ length: e.targetSets }, (_, i) => {
            const lastSet = lastSets?.[i] || lastValidSet;
            const setWeight = (lastSet?.weight != null && Number(lastSet.weight) >= 0) ? Number(lastSet.weight) : null;
            return {
              setNumber: i + 1,
              reps: lastSet?.reps ? Number(lastSet.reps) : defaultTargetReps,
              weight: setWeight,
              completed: false,
            };
          }),
        };
      }) : [];

      const newLog: GymDayLog = {
        userId: user?.uid || '',
        id: user?.uid ? `${user.uid}_${dateStr}` : undefined,
        date: dateStr,
        dayPlanIndex: planIdx,
        exercises: newExercises,
        cardio: (planDay && !planDay.isRest && Array.isArray(planDay.cardio))
          ? mapPlanCardioToLogs(planDay.cardio)
          : [],
        createdAt: 0, // <-- Critical: 0 for unstarted template logs so real crash drafts ALWAYS win!
        updatedAt: 0,
      };
      setLog(newLog);
    }

    // ── Crash-Recovery Active Draft Hydration ─────────────────────────────
    let isCancelled = false;
    const effectStartWriteAt = localWriteAtRef.current;
    const effectiveUid = user?.uid || auth.currentUser?.uid || 'local_user';
    const primaryKey = `gym_active_draft_${effectiveUid}_${dateStr}`;
    const altKey = existing?.id ? `gym_active_draft_${existing.id}` : null;
    const dateKey = `gym_active_draft_${dateStr}`;
    const keysToFetch = Array.from(new Set([primaryKey, altKey, dateKey].filter(Boolean) as string[]));

    // If the log is already marked completed, never hydrate an active draft, and purge any leftovers
    if (existing?.completed || logRef.current?.completed) {
      AsyncStorage.multiRemove(keysToFetch).catch(() => {});
    } else {
      AsyncStorage.multiGet(keysToFetch).then(pairs => {
        if (isCancelled || localWriteAtRef.current !== effectStartWriteAt) return;
        if (existing?.completed || logRef.current?.completed) {
          AsyncStorage.multiRemove(keysToFetch).catch(() => {});
          return;
        }
        const found = pairs.find(([_, val]) => !!val);
        if (found && found[1]) {
          try {
            const draft = JSON.parse(found[1]);
            if (draft && draft.date === dateStr && !draft.completed) {
              const draftUpdatedAt = Number(draft.updatedAt) || 0;
              const currentUpdatedAt = Number(logRef.current?.updatedAt) || 0;
              const existingUpdatedAt = Number(existing?.updatedAt) || 0;
              if (existing?.completed) {
                AsyncStorage.multiRemove(keysToFetch).catch(() => {});
                return;
              }
              const draftCompletedSets = (draft.exercises || []).reduce((acc: number, ex: any) => acc + (ex.setsLog || []).filter((s: any) => s.completed).length, 0);
              const existingCompletedSets = ((existing?.exercises || []) as any[]).reduce((acc: number, ex: any) => acc + (ex.setsLog || []).filter((s: any) => s.completed).length, 0);
              if (draftCompletedSets > existingCompletedSets || draftUpdatedAt > Math.max(currentUpdatedAt, existingUpdatedAt) || !existing) {
                logRef.current = draft;
                setLog(draft);
              }
            }
          } catch (_) {}
        }
      }).catch(() => {});
    }
    return () => { isCancelled = true; };
  }, [gymLogsReady, gymLogs, dateStr, user?.uid, reloadKey, userGymPlan]);



  // Only trigger a Firestore re-init if the local log is absent (null)
  // Calling this on every tab focus was the biggest source of inter-module lag
  const reloadFromFirestore = useCallback((force = false) => {
    if (force || logRef.current === null) {
      logRef.current = null;
      setReloadKey(k => k + 1);
    }
  }, []);

  const planIdx = useMemo(() => {
    return userGymPlan?.scheduleMode === 'rotation'
      ? getRotationNextDayIndex(userGymPlan, gymLogs || [], dateStr)
      : planDayIndexForDate(dateStr);
  }, [userGymPlan, gymLogs, dateStr]);

  const activePlanIdx = log?.dayPlanIndex ?? planIdx;

  const planDay = useMemo(() => {
    return resolvePlanDay(userGymPlan, activePlanIdx);
  }, [userGymPlan, activePlanIdx]);

  const saveLog = useCallback((updatedLog: GymDayLog) => {
    const effectiveUid = user?.uid || auth.currentUser?.uid || 'local_user';
    const logId = updatedLog.id || `${effectiveUid}_${updatedLog.date}`;
    const writeAt = Date.now();
    localWriteAtRef.current = writeAt;

    if (updatedLog.completed) {
      // 1. Cancel any pending draft save timer so it NEVER writes a stale uncompleted draft after completion
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }

      // 2. Purge all draft keys from AsyncStorage and L1 RAM cache (Issue #89)
      const draftKeys = [
        `gym_active_draft_${logId}`,
        `gym_active_draft_${updatedLog.date}`,
        effectiveUid ? `gym_active_draft_${effectiveUid}_${updatedLog.date}` : null,
        updatedLog.id ? `gym_active_draft_${updatedLog.id}` : null,
        `@gym_active_session_${updatedLog.date}`,
        '@zentrack_active_workout_state',
      ].filter(Boolean) as string[];
      AsyncStorage.multiRemove(draftKeys).catch(() => {});
      draftKeys.forEach(k => L1_RAM_CACHE.delete(k));

      if (pendingOptimisticUpdateTimerRef.current) {
        clearTimeout(pendingOptimisticUpdateTimerRef.current);
        pendingOptimisticUpdateTimerRef.current = null;
      }
      pendingOptimisticUpdateLogRef.current = null;

      // 3. Synchronously write completed log to L1_RAM_CACHE, writeWellnessCache, AND gymLogsRef
      // Issue #85: Strip lastSessionSets from persisted exercises to prevent state bloat
      const cleanExercises = (updatedLog.exercises || []).map((ex: any) => {
        if (!ex) return ex;
        const { lastSessionSets, ...rest } = ex;
        return rest;
      });

      const cleanCompletedLog: GymDayLog = {
        ...updatedLog,
        exercises: cleanExercises,
        id: logId,
        userId: effectiveUid,
        completed: true,
        workoutStartTime: undefined,
      };
      try {
        const currentLogs = gymLogsRef.current || [];
        const exists = currentLogs.some(l => l.id === logId || l.date === updatedLog.date);
        const nextLogs = exists
          ? currentLogs.map(l => (l.id === logId || l.date === updatedLog.date) ? cleanCompletedLog : l)
          : [cleanCompletedLog, ...currentLogs];
        gymLogsRef.current = nextLogs;
        updateL1Cache('gymLogs', nextLogs);
        // Immediate disk write for completed workout durability
        writeWellnessCache({ gymLogs: nextLogs as any }, true);
      } catch (_) {}

      // 4. Defer context sync & cross-screen broadcast out of any React commit phase
      queueMicrotask(() => {
        optimisticUpdateGymLog(logId, cleanCompletedLog as any);
        DeviceEventEmitter.emit('gym_log_local_mutation', {
          date: updatedLog.date,
          log: cleanCompletedLog,
          senderId: instanceIdRef.current,
        });
      });

      const existingEntry = globalPendingFirestoreWrites.get(logId);
      if (existingEntry?.timer) clearTimeout(existingEntry.timer);
      globalPendingFirestoreWrites.delete(logId);
      if (user?.uid || auth.currentUser?.uid) {
        executeFirestoreLogWrite(logId, cleanCompletedLog);
      }
    } else {
      const logWithId: GymDayLog = { ...updatedLog, id: logId, userId: effectiveUid };

      // AUTO-START ON ANY LOGGED SET:
      // If any set IS completed and workoutStartTime is not yet set, automatically start the session!
      const hasAnyCompletedSet = (logWithId.exercises || []).some((ex: any) =>
        (ex.setsLog || []).some((s: any) => s.completed)
      );
      if (hasAnyCompletedSet && !logWithId.workoutStartTime && !logWithId.completed) {
        const pastDurationMs = (logWithId.workoutDurationSeconds ? logWithId.workoutDurationSeconds * 1000 : (logWithId.workoutDurationMinutes || 0) * 60000);
        logWithId.workoutStartTime = Date.now() - pastDurationMs;
        logRef.current = logWithId;
        setWorkoutActiveGlobal(true, logWithId.workoutStartTime, dateStr);

        InteractionManager.runAfterInteractions(() => {
          const completedCount = (logWithId.exercises || []).reduce(
            (sum: number, ex: any) => sum + (ex.setsLog || []).filter((s: any) => s.completed).length, 0
          );
          const workoutName = planDay?.name || resolvePlanDay(userGymPlan, logWithId.dayPlanIndex ?? planIdx)?.name || 'Workout';
          showWorkoutInProgressNotification({
            workoutName,
            completedSets: completedCount,
            dateStr,
          }).catch(() => {});
          scheduleWorkoutAutoFinishNotification({
            workoutName,
            workoutStartTime: Number(logWithId.workoutStartTime),
            dateStr,
          }).catch(() => {});
          const widgetData = buildLiveWorkoutWidgetData({
            todayStr: dateStr,
            gymLogs: [logWithId, ...(gymLogsRef.current || []).filter(l => l.date !== dateStr)],
            userGymPlan,
          });
          saveCachedLiveWorkoutData(widgetData).catch(() => {});
          updateLiveWorkoutWidget(widgetData).catch(() => {});
        });
      }

      // Synchronously update in-memory gymLogsRef & L1 cache
      try {
        const currentLogs = gymLogsRef.current || [];
        const exists = currentLogs.some(l => l.id === logId || l.date === logWithId.date);
        const nextLogs = exists
          ? currentLogs.map(l => (l.id === logId || l.date === logWithId.date) ? logWithId : l)
          : [logWithId, ...currentLogs];
        gymLogsRef.current = nextLogs;
        updateL1Cache('gymLogs', nextLogs);
      } catch (_) {}

      // Write active draft to L1 RAM cache immediately & debounced AsyncStorage (250ms)
      const canonicalDraftKey = `gym_active_draft_${logId}`;
      setL1Sync(canonicalDraftKey, logWithId);
      if (effectiveUid !== 'local_user') {
        setL1Sync(`gym_active_draft_${effectiveUid}_${updatedLog.date}`, logWithId);
      }
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
      draftSaveTimerRef.current = setTimeout(() => {
        draftSaveTimerRef.current = null;
        try {
          AsyncStorage.setItem(canonicalDraftKey, JSON.stringify(logWithId)).catch(() => {});
        } catch (_) {}
      }, 250);
      try {
        // Debounced non-blocking write to wellness domain disk cache during active workouts
        writeWellnessCache({ gymLogs: gymLogsRef.current as any }, false);
      } catch (_) {}

      // 2. 0ms cross-screen broadcast
      queueMicrotask(() => {
        DeviceEventEmitter.emit('gym_log_local_mutation', { date: updatedLog.date, log: logWithId, senderId: instanceIdRef.current });
      });

      // 3. Stage global context update
      pendingOptimisticUpdateLogRef.current = { logId, log: logWithId };
      if (pendingOptimisticUpdateTimerRef.current) {
        clearTimeout(pendingOptimisticUpdateTimerRef.current);
      }
      pendingOptimisticUpdateTimerRef.current = setTimeout(() => {
        pendingOptimisticUpdateTimerRef.current = null;
        flushPendingOptimisticUpdate();
      }, 250);

      // 4. Coalesced Cloud Checkpoint (1.5s idle window)
      // Rapid checkmarks coalesce into ONE Firestore write, but writes complete within 1.5s of finishing an exercise
      const existingEntry = globalPendingFirestoreWrites.get(logId);
      if (existingEntry?.timer) clearTimeout(existingEntry.timer);

      const cloudDebounceMs = 1500;
      const timer = setTimeout(() => {
        globalPendingFirestoreWrites.delete(logId);
        if (user?.uid || auth.currentUser?.uid) {
          executeFirestoreLogWrite(logId, logWithId);
        }
      }, cloudDebounceMs);
      globalPendingFirestoreWrites.set(logId, { log: logWithId, timer });
    }
  }, [user, optimisticAddGymLog, optimisticUpdateGymLog, flushPendingOptimisticUpdate]);

  // ── Flush pending updates on unmount ──────────────────────────────
  useEffect(() => {
    return () => {
      flushPendingOptimisticUpdate();
      flushPendingFirestoreWrite();
    };
  }, [flushPendingOptimisticUpdate, flushPendingFirestoreWrite]);

  // Flush detached writes immediately when app goes to background or is locked
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        // Auto-finish watchdog: if workout ran in background past 120 minutes, autocomplete it immediately
        const currentLog = logRef.current;
        if (currentLog?.workoutStartTime && !currentLog?.completed) {
          const elapsedMs = Date.now() - Number(currentLog.workoutStartTime);
          if (elapsedMs >= 120 * 60 * 1000) {
            endWorkoutRef.current?.(true);
            return;
          }
        }
      } else if (nextState === 'background' || nextState === 'inactive') {
        flushPendingOptimisticUpdate();
        const currentLog = logRef.current;
        if (currentLog) {
          const effectiveUid = user?.uid || auth.currentUser?.uid || 'local_user';
          const logId = currentLog.id || `${effectiveUid}_${currentLog.date}`;
          if (!currentLog.completed) {
            setL1Sync(`gym_active_draft_${logId}`, currentLog);
            if (effectiveUid !== 'local_user') {
              setL1Sync(`gym_active_draft_${effectiveUid}_${currentLog.date}`, currentLog);
            }
            try {
              const serializedDraft = JSON.stringify(currentLog);
              AsyncStorage.setItem(`gym_active_draft_${logId}`, serializedDraft).catch(() => {});
              if (effectiveUid !== 'local_user') {
                AsyncStorage.setItem(`gym_active_draft_${effectiveUid}_${currentLog.date}`, serializedDraft).catch(() => {});
              }
              AsyncStorage.setItem(`gym_active_draft_${currentLog.date}`, serializedDraft).catch(() => {});
            } catch (_) {}
          }
          flushGlobalPendingFirestoreWrite(logId);

          // Pinned notification self-healing: if workout is active, ensure persistent ongoing notification stays up
          if (!currentLog.completed && currentLog.workoutStartTime) {
            const completedCount = (currentLog.exercises || []).reduce(
              (sum: number, ex: any) => sum + (ex.setsLog || []).filter((s: any) => s.completed).length, 0
            );
            const name = planDay?.name || resolvePlanDay(userGymPlan, currentLog.dayPlanIndex ?? planIdx)?.name || 'Workout';
            showWorkoutInProgressNotification({
              workoutName: name,
              completedSets: completedCount,
              dateStr,
            }).catch(() => {});
            scheduleWorkoutAutoFinishNotification({
              workoutName: name,
              workoutStartTime: Number(currentLog.workoutStartTime),
              dateStr,
            }).catch(() => {});
          }
        }
        flushDomainCache('wellness').catch(() => {});
      }
    });
    return () => sub.remove();
  }, [user, flushPendingOptimisticUpdate, planDay, userGymPlan, planIdx, dateStr]);

  // Issue 1 & 2: Listen for local mutations across all sibling screens (ExerciseSwap, ExerciseDetail, CardioLog)
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('gym_log_local_mutation', (event: any) => {
      if (event?.date && event.date !== dateStr) return;
      if (event?.senderId === instanceIdRef.current) return; // Skip self-notification to avoid double-render
      if (event?.log) {
        // Never allow an uncompleted mutation to overwrite a completed workout!
        const isCurrentCompleted = Boolean(logRef.current?.completed || (gymLogsRef.current || []).find(l => l.date === dateStr)?.completed);
        if (isCurrentCompleted && !event.log.completed) {
          return;
        }
        logRef.current = event.log;
        queueMicrotask(() => {
          setLog(event.log);
        });
      }
    });
    return () => sub.remove();
  }, [dateStr]);

  // ── Cross-instance sync: mark log completed when ANY useGymLog calls endWorkout ────
  // GymHomeScreen and ActiveLoggingScreen each mount their own useGymLog instance.
  // When ActiveLoggingScreen's endWorkout() fires, it emits 'gym_workout_completed'.
  // This listener ensures GymHomeScreen's log immediately reflects completed=true,
  // making the banner switch from "IN PROGRESS" to "Workout Completed" instantly.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('gym_workout_completed', (event: any) => {
      if (event?.date && event.date !== dateStr) return;
      queueMicrotask(() => {
        setLog(prev => {
          const base = prev || (gymLogsRef.current || []).find(l => l.date === dateStr);
          if (!base) return prev;
          if (base.completed && !base.workoutStartTime) return prev;
          const updated: GymDayLog = {
            ...base,
            exercises: (base.exercises as any) || [],
            cardio: (base.cardio as any) || [],
            dayPlanIndex: base.dayPlanIndex ?? planIdx,
            createdAt: (base as any)?.createdAt || Date.now(),
            completed: true,
            workoutStartTime: undefined,
            workoutDurationMinutes: event?.duration ?? base.workoutDurationMinutes,
            restTimerStartTime: undefined,
            restTimerDurationSecs: undefined,
            restTimerExerciseName: undefined,
            updatedAt: Date.now(),
          };
          logRef.current = updated;
          return updated;
        });
      });
    });
    return () => sub.remove();
  }, [dateStr]);


  const updateSet = useCallback((exerciseIndex: number, setIndex: number, set: GymSet) => {
    const prev = logRef.current;
    if (!prev) return;
    const exercises = prev.exercises.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      const setsLog = ex.setsLog.map((s, si) => si === setIndex ? set : s);
      return { ...ex, setsLog };
    });
    const hasAnyCompleted = exercises.some(e => e.setsLog?.some(s => s.completed));
    const pastDurationMs = (prev.workoutDurationSeconds ? prev.workoutDurationSeconds * 1000 : (prev.workoutDurationMinutes || 0) * 60000);
    const isReopening = Boolean(prev.completed && hasAnyCompleted);
    const workoutStartTime = prev.workoutStartTime || (hasAnyCompleted ? (Date.now() - pastDurationMs) : undefined);
    const updated: GymDayLog = {
      ...prev,
      exercises,
      completed: isReopening ? false : prev.completed,
      workoutStartTime,
      updatedAt: Date.now(),
    };
    logRef.current = updated;
    setLog(updated);
    saveLog(updated);
    if (hasAnyCompleted && (!prev.workoutStartTime || isReopening)) {
      setWorkoutActiveGlobal(true, workoutStartTime, dateStr);
      cancelTodayTrainingAlerts(dateStr).catch(() => {});
    }
    if (updated.workoutStartTime && !updated.completed) {
      InteractionManager.runAfterInteractions(() => {
        const completedCount = (updated.exercises || []).reduce(
          (sum: number, ex: any) => sum + (ex.setsLog || []).filter((s: any) => s.completed).length, 0
        );
        const name = planDay?.name || resolvePlanDay(userGymPlan, updated.dayPlanIndex ?? planIdx)?.name || 'Workout';
        showWorkoutInProgressNotification({
          workoutName: name,
          completedSets: completedCount,
          dateStr,
        }).catch(() => {});
      });
    }
  }, [saveLog, planDay, userGymPlan, planIdx, dateStr]);

  const toggleSetComplete = useCallback((exerciseIndex: number, setIndex: number) => {
    const prev = logRef.current;
    if (!prev) return;
    let newlyCompleted = false;
    const exercises = prev.exercises.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      const setsLog = ex.setsLog.map((s, si) => {
        if (si === setIndex) {
          const nextCompleted = !s.completed;
          if (nextCompleted) newlyCompleted = true;
          return { ...s, completed: nextCompleted };
        }
        return s;
      });
      return { ...ex, setsLog };
    });
    const hasAnyCompleted = exercises.some(e => e.setsLog?.some(s => s.completed));
    const pastDurationMs = (prev.workoutDurationSeconds ? prev.workoutDurationSeconds * 1000 : (prev.workoutDurationMinutes || 0) * 60000);
    const isReopening = Boolean(prev.completed && hasAnyCompleted);
    const workoutStartTime = prev.workoutStartTime || (hasAnyCompleted ? (Date.now() - pastDurationMs) : undefined);
    const updated: GymDayLog = {
      ...prev,
      exercises,
      completed: isReopening ? false : prev.completed,
      workoutStartTime,
      updatedAt: Date.now(),
    };
    logRef.current = updated;
    setLog(updated);
    saveLog(updated);
    if (newlyCompleted) {
      awardXP('GYM_SET').catch(() => {});
    }
    if (hasAnyCompleted && (!prev.workoutStartTime || isReopening)) {
      setWorkoutActiveGlobal(true, workoutStartTime, dateStr);
      cancelTodayTrainingAlerts(dateStr).catch(() => {});
    }
    if (updated.workoutStartTime && !updated.completed) {
      InteractionManager.runAfterInteractions(() => {
        const completedCount = (updated.exercises || []).reduce(
          (sum: number, ex: any) => sum + (ex.setsLog || []).filter((s: any) => s.completed).length, 0
        );
        const name = planDay?.name || resolvePlanDay(userGymPlan, updated.dayPlanIndex ?? planIdx)?.name || 'Workout';
        showWorkoutInProgressNotification({
          workoutName: name,
          completedSets: completedCount,
          dateStr,
        }).catch(() => {});
      });
    }
  }, [saveLog, planDay, userGymPlan, planIdx, dateStr]);

  const deleteExercise = useCallback((exerciseIdOrIndex: string | number) => {
    const prev = logRef.current;
    if (!prev) return;
    const exercises = prev.exercises
      .filter((ex, i) => {
        if (typeof exerciseIdOrIndex === 'number') return i !== exerciseIdOrIndex;
        if (ex.exerciseId) return ex.exerciseId !== exerciseIdOrIndex;
        if ((ex as any).id) return (ex as any).id !== exerciseIdOrIndex;
        return String(i) !== exerciseIdOrIndex && ex.name !== exerciseIdOrIndex;
      })
      .map((ex, i) => ({ ...ex, _idx: i }));
    const updated = { ...prev, exercises, updatedAt: Date.now() };
    logRef.current = updated;
    setLog(updated);
    saveLog(updated);
  }, [saveLog]);

  const addExercise = useCallback((exercise: GymExerciseLog) => {
    const prev = logRef.current;
    if (!prev) return;
    const idx = prev.exercises.length;
    let patchedMuscle = exercise.muscle;
    if (!patchedMuscle || ['general', 'unknown', 'none', 'mixed', 'null', 'undefined'].includes(patchedMuscle.trim().toLowerCase())) {
      patchedMuscle = resolveExerciseTargetMuscle(exercise.name, exercise.muscle).targetMuscle;
    }
    const exercises = [...prev.exercises, { ...exercise, muscle: patchedMuscle, _idx: idx }];
    const updated = { ...prev, exercises, updatedAt: Date.now() };
    logRef.current = updated;
    setLog(updated);
    saveLog(updated);
  }, [saveLog]);

  const addSet = useCallback((exerciseIndex: number) => {
    const prev = logRef.current;
    if (!prev) return;
    const exercises = prev.exercises.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      const lastSet = ex.setsLog.length > 0 ? ex.setsLog[ex.setsLog.length - 1] : null;
      const newSetNumber = (Number(lastSet?.setNumber) || ex.setsLog.length) + 1;
      const defaultWeight = lastSet?.weight != null ? lastSet.weight : null;
      const defaultReps = lastSet?.reps != null ? lastSet.reps : 10;
      return {
        ...ex,
        setsLog: [...ex.setsLog, { setNumber: newSetNumber, reps: defaultReps, weight: defaultWeight, completed: false }]
      };
    });
    const updated = { ...prev, exercises, updatedAt: Date.now() };
    logRef.current = updated;
    setLog(updated);
    saveLog(updated);
  }, [saveLog]);

  const removeSet = useCallback((exerciseIndex: number, setIndex: number) => {
    const prev = logRef.current;
    if (!prev) return;
    const exercises = prev.exercises.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      const setsLog = ex.setsLog
        .filter((_, si) => si !== setIndex)
        .map((s, si) => ({ ...s, setNumber: si + 1 }));
      return { ...ex, setsLog };
    });
    const updated = { ...prev, exercises, updatedAt: Date.now() };
    logRef.current = updated;
    setLog(updated);
    saveLog(updated);
  }, [saveLog]);

  const reorderExercise = useCallback((fromIndex: number, toIndex: number, syncToMasterPlan = false) => {
    const prev = logRef.current;
    if (!prev || fromIndex < 0 || toIndex < 0 || fromIndex >= prev.exercises.length || toIndex >= prev.exercises.length) return;
    const exercises = [...prev.exercises];
    const [moved] = exercises.splice(fromIndex, 1);
    exercises.splice(toIndex, 0, moved);
    const reindexed = exercises.map((ex, i) => ({ ...ex, _idx: i }));
    const updated = { ...prev, exercises: reindexed, updatedAt: getMonotonicTimestamp(prev?.updatedAt) };
    logRef.current = updated;
    setLog(updated);
    saveLog(updated);
    if (syncToMasterPlan && updated.dayPlanIndex !== undefined && updated.dayPlanIndex !== null) {
      debouncedSyncMasterPlan(reindexed, updated.dayPlanIndex);
    }
  }, [saveLog, debouncedSyncMasterPlan]);

  const reorderExercisesFull = useCallback((newExercisesList: GymExerciseLog[], syncToMasterPlan = false) => {
    const prev = logRef.current;
    if (!prev) return;
    const reindexed = newExercisesList.map((ex, i) => ({ ...ex, _idx: i }));
    const updated = { ...prev, exercises: reindexed, updatedAt: getMonotonicTimestamp(prev?.updatedAt) };
    logRef.current = updated;
    setLog(updated);
    saveLog(updated);
    if (syncToMasterPlan && updated.dayPlanIndex !== undefined && updated.dayPlanIndex !== null) {
      debouncedSyncMasterPlan(reindexed, updated.dayPlanIndex);
    }
  }, [saveLog, debouncedSyncMasterPlan]);

  const addCardio = useCallback((type: string, preset?: { durationMinutes?: number | null }) => {
    const prev = logRef.current;
    if (!prev) return;
    const cardio = [...(prev.cardio || []), {
      id: `cardio_${Date.now()}`,
      type,
      durationMinutes: preset?.durationMinutes ?? null,
      distanceKm: null,
      speedKmh: null,
      incline: null,
      calories: null,
      completed: false,
    }];
    const updated = { ...prev, cardio, updatedAt: Date.now() };
    logRef.current = updated;
    setLog(updated);
    saveLog(updated);
  }, [saveLog]);

  const updateCardio = useCallback((cardioId: string, updates: Partial<GymCardioLog>) => {
    const prev = logRef.current;
    if (!prev?.cardio) return;
    const cardio = prev.cardio.map(c => c.id === cardioId ? { ...c, ...updates } : c);
    const updated = { ...prev, cardio, updatedAt: Date.now() };
    logRef.current = updated;
    setLog(updated);
    saveLog(updated);
  }, [saveLog]);

  const deleteCardio = useCallback((cardioId: string) => {
    const prev = logRef.current;
    if (!prev?.cardio) return;
    const cardio = prev.cardio.filter(c => c.id !== cardioId);
    const updated = { ...prev, cardio, updatedAt: Date.now() };
    logRef.current = updated;
    setLog(updated);
    saveLog(updated);
  }, [saveLog]);

  const updateExercise = useCallback((exerciseIndex: number, updatedExercise: GymExerciseLog) => {
    let base = logRef.current;
    if (!base) {
      const basePlanDay = planDay || resolvePlanDay(userGymPlan, planIdx);
      const initialExercises = (basePlanDay && !basePlanDay.isRest && Array.isArray(basePlanDay.exercises))
        ? basePlanDay.exercises.map((e: any, idx: number) => {
            const prevSession = historyIndex.get(normalizeExerciseKey(e.name));
            const lastSets = prevSession?.sets || null;
            const lastValidSet = lastSets && lastSets.length > 0 ? lastSets[lastSets.length - 1] : null;
            const defaultTargetReps = parseInt(String(e.targetReps || '8-12').split(/[-–—]/)[0], 10) || 8;
            return {
              _idx: idx,
              exerciseId: e.id,
              name: e.name,
              targetSets: e.targetSets || 3,
              targetReps: e.targetReps || '8-12',
              muscle: e.muscle || 'Mixed',
              videoId: e.videoId || '',
              restTimeSecs: e.restTimeSecs || 90,
              lastSessionSets: lastSets ?? undefined,
              setsLog: Array.from({ length: e.targetSets || 3 }, (_, i) => {
                const lastSet = lastSets?.[i] || lastValidSet;
                const setWeight = (lastSet?.weight != null && Number(lastSet.weight) >= 0) ? Number(lastSet.weight) : null;
                return {
                  setNumber: i + 1,
                  reps: lastSet?.reps ? Number(lastSet.reps) : defaultTargetReps,
                  weight: setWeight,
                  completed: false,
                };
              }),
            };
          })
        : [];
      base = {
        userId: user?.uid || 'local_user',
        id: user?.uid ? `${user.uid}_${dateStr}` : undefined,
        date: dateStr,
        dayPlanIndex: planIdx,
        exercises: initialExercises,
        cardio: (basePlanDay && !basePlanDay.isRest && Array.isArray(basePlanDay.cardio))
          ? mapPlanCardioToLogs(basePlanDay.cardio)
          : [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    let targetIdx = exerciseIndex;
    if (targetIdx < 0 || targetIdx >= base.exercises.length) {
      targetIdx = base.exercises.findIndex(e =>
        (e.exerciseId && updatedExercise.exerciseId && e.exerciseId === updatedExercise.exerciseId) ||
        (e._idx !== undefined && updatedExercise._idx !== undefined && e._idx === updatedExercise._idx) ||
        e.name === updatedExercise.name
      );
    }
    if (targetIdx < 0 || targetIdx >= base.exercises.length) return;

    const exercises = base.exercises.map((ex, i) =>
      i === targetIdx ? { ...updatedExercise, _idx: i } : ex
    );
    const hasAnyCompleted = exercises.some((e: any) => e.setsLog?.some((s: any) => s.completed));
    const pastDurationMs = (base.workoutDurationSeconds ? base.workoutDurationSeconds * 1000 : (base.workoutDurationMinutes || 0) * 60000);
    const isReopening = Boolean(base.completed && hasAnyCompleted);
    const workoutStartTime = base.workoutStartTime || (hasAnyCompleted ? (Date.now() - pastDurationMs) : undefined);
    const updated: GymDayLog = {
      ...base,
      id: base.id || (user?.uid ? `${user.uid}_${dateStr}` : undefined),
      exercises,
      completed: isReopening ? false : base.completed,
      workoutStartTime,
      updatedAt: Date.now(),
    };
    logRef.current = updated;
    setLog(updated);
    recordExerciseToLedger(updatedExercise.name, updatedExercise.setsLog, dateStr);
    saveLog(updated);
    if (hasAnyCompleted && (!base.workoutStartTime || isReopening)) {
      setWorkoutActiveGlobal(true, workoutStartTime, dateStr);
    }
  }, [saveLog, planDay, userGymPlan, planIdx, user, dateStr, historyIndex]);

  const logSetAndStartTimer = useCallback(async (
    exerciseIndex: number,
    updatedExercise: GymExerciseLog,
    durationSecs: number,
    exerciseName?: string
  ) => {
    const prev = logRef.current;
    if (!prev) return;
    const prevEx = prev.exercises?.[exerciseIndex] || prev.exercises?.find(e =>
      (e.exerciseId && updatedExercise.exerciseId && e.exerciseId === updatedExercise.exerciseId) ||
      e.name === updatedExercise.name
    );
    const newlyCompletedIdx = (updatedExercise.setsLog || []).findIndex((s, idx) => {
      const prevSet = prevEx?.setsLog?.[idx];
      return s.completed && (!prevSet || !prevSet.completed);
    });
    if (newlyCompletedIdx >= 0) {
      const setActionKey = `set_${dateStr}_${updatedExercise.exerciseId || updatedExercise.name}_${newlyCompletedIdx}`;
      InteractionManager.runAfterInteractions(() => {
        awardXP('GYM_SET', setActionKey).catch(() => {});
      });
    }

    let targetIdx = exerciseIndex;
    if (targetIdx < 0 || targetIdx >= prev.exercises.length) {
      targetIdx = prev.exercises.findIndex(e =>
        (e.exerciseId && updatedExercise.exerciseId && e.exerciseId === updatedExercise.exerciseId) ||
        (e._idx !== undefined && updatedExercise._idx !== undefined && e._idx === updatedExercise._idx) ||
        e.name === updatedExercise.name
      );
    }
    if (targetIdx < 0 || targetIdx >= prev.exercises.length) return;

    const exercises = prev.exercises.map((ex, i) =>
      i === targetIdx ? { ...updatedExercise, _idx: i } : ex
    );
    const hasAnyCompleted = exercises.some((e: any) => e.setsLog?.some((s: any) => s.completed));
    const pastDurationMs = (prev.workoutDurationSeconds ? prev.workoutDurationSeconds * 1000 : (prev.workoutDurationMinutes || 0) * 60000);
    const isReopening = Boolean(prev.completed && hasAnyCompleted);
    const workoutStartTime = prev.workoutStartTime || (hasAnyCompleted ? (Date.now() - pastDurationMs) : undefined);

    const updated: GymDayLog = {
      ...prev,
      exercises,
      completed: isReopening ? false : prev.completed,
      workoutStartTime,
      updatedAt: getMonotonicTimestamp(prev?.updatedAt),
    };
    logRef.current = updated;
    setLog(updated);

    const isAutoTimerOn = isAutoTimerEnabledSync();
    const shouldStartTimer = isAutoTimerOn && durationSecs > 0;
    if (shouldStartTimer) {
      setRestTimerState({
        startTime: Date.now(),
        durationSecs,
        exerciseName,
      });
      startGlobalRestTimer(durationSecs, exerciseName).catch(() => {});
    }

    saveLog(updated);
    if (hasAnyCompleted && (!prev.workoutStartTime || isReopening)) {
      setWorkoutActiveGlobal(true, workoutStartTime, dateStr);
      cancelTodayTrainingAlerts(dateStr).catch(() => {});
    }
    recordExerciseToLedger(updatedExercise.name, updatedExercise.setsLog, dateStr);
    if (updated.workoutStartTime && !updated.completed) {
      InteractionManager.runAfterInteractions(() => {
        const completedCount = (updated.exercises || []).reduce(
          (sum: number, ex: any) => sum + (ex.setsLog || []).filter((s: any) => s.completed).length, 0
        );
        const name = planDay?.name || resolvePlanDay(userGymPlan, updated.dayPlanIndex ?? planIdx)?.name || 'Workout';
        showWorkoutInProgressNotification({
          workoutName: name,
          completedSets: completedCount,
          dateStr,
        }).catch(() => {});
      });
    }
  }, [saveLog, dateStr, planDay, userGymPlan, planIdx]);

  const swapExercise = useCallback((exerciseIndex: number, newName: string, newVideoId?: string, newMuscle?: string) => {
    const prev = logRef.current;
    if (!prev) return;
    const exercises = prev.exercises.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      const resolvedMuscle = resolveExerciseTargetMuscle(newName, newMuscle || ex.muscle).targetMuscle;
      const normKey = normalizeExerciseKey(newName);
      const prevSession = historyIndex.get(normKey);
      const newHistorySets = prevSession?.sets || null;

      const presetExercise = [...GYM_PLAN, ...GYM_PLAN_ARNOLD]
        .flatMap(d => d.exercises || [])
        .find(e => normalizeExerciseKey(e.name) === normKey);
      const sciEntry = SCIENTIFIC_BY_NAME[newName.toLowerCase().trim()] || SCIENTIFIC_BY_NAME[normKey];

      const resolvedVideoId = newVideoId ?? presetExercise?.videoId ?? undefined;
      const resolvedRest = presetExercise?.restTimeSecs ?? (sciEntry?.pattern?.includes('Compound') ? 120 : 90);
      const resolvedTargetReps = presetExercise?.targetReps ?? ex.targetReps ?? '8-12';

      const updatedSetsLog = ex.setsLog.map((s: any, sIdx: number) => {
        if (s.completed) return s;
        return {
          ...s,
          weight: newHistorySets?.[sIdx]?.weight ?? null,
          reps: newHistorySets?.[sIdx]?.reps ?? s.reps ?? 10,
        };
      });
      return {
        ...ex,
        exerciseId: `ex_${normKey}`,
        name: newName,
        muscle: resolvedMuscle,
        targetReps: resolvedTargetReps,
        restTimeSecs: resolvedRest,
        lastSessionSets: newHistorySets ?? undefined,
        setsLog: updatedSetsLog,
        videoId: resolvedVideoId,
      };
    });
    const updated = { ...prev, exercises, updatedAt: Date.now() };
    logRef.current = updated;
    setLog(updated);
    saveLog(updated);
  }, [saveLog, historyIndex]);

  const makeSwapPermanent = useCallback(async (
    origName: string,
    newName: string,
    newVideoId?: string,
    newMuscle?: string,
    newSets?: number,
    newReps?: string,
    newRestTime?: number
  ) => {
    if (!user || !userGymPlan) return;

    // Issue #48: Properly inspect Array.isArray on userGymPlan.customDays before dictionary conversion
    let currentCustomDays: Record<string, any> = {};
    if (Array.isArray(userGymPlan.customDays)) {
      userGymPlan.customDays.forEach((d: any) => { if (d && d.dayIndex != null) currentCustomDays[String(d.dayIndex)] = d; });
    } else if (userGymPlan.customDays && typeof userGymPlan.customDays === 'object') {
      currentCustomDays = { ...userGymPlan.customDays };
    }

    let changed = false;
    const resolvedDay = resolvePlanDay(userGymPlan, planIdx);
    const basePlan = userGymPlan.templateId === 'arnold' ? GYM_PLAN_ARNOLD : GYM_PLAN;
    // Scope swap to active routine day so substituting on Monday does not overwrite Friday
    const targetDays = basePlan.filter(d => d.dayIndex === planIdx);
    const daysToProcess = targetDays.length > 0 ? targetDays : (resolvedDay ? [resolvedDay] : basePlan);

    daysToProcess.forEach(day => {
      const dayIndex = day.dayIndex;
      const targetDay = currentCustomDays[dayIndex] ? { ...currentCustomDays[dayIndex] } : { ...day };
      if (targetDay.exercises) {
        let dayExercisesChanged = false;
        const newExercises = targetDay.exercises.map((ex: any) => {
          if (normalizeExerciseKey(ex.name) === normalizeExerciseKey(origName)) {
            dayExercisesChanged = true;
            changed = true;
            return {
              ...ex,
              name: newName,
              muscle: resolveExerciseTargetMuscle(newName, newMuscle || ex.muscle).targetMuscle,
              ...(newVideoId !== undefined ? { videoId: newVideoId } : {}),
              ...(newSets !== undefined ? { targetSets: newSets } : {}),
              ...(newReps !== undefined ? { targetReps: newReps } : {}),
              ...(newRestTime !== undefined ? { restTimeSecs: newRestTime } : {}),
            };
          }
          return ex;
        });
        if (dayExercisesChanged) {
          targetDay.exercises = newExercises;
          currentCustomDays[dayIndex] = targetDay;
        }
      }
    });

    if (changed) {
      await updateFullMasterPlan(currentCustomDays);
      // Redundant safeWrite removed: updateFullMasterPlan already persists to Firestore!
    }
  }, [user, userGymPlan, updateFullMasterPlan, planIdx]);

  const startWorkout = useCallback((customStartTime?: number) => {
    // GUARD: Never re-start an already running active workout timer.
    if (logRef.current?.workoutStartTime) return;

    let base = logRef.current;
    if (!base) {
      const basePlanDay = planDay || resolvePlanDay(userGymPlan, planIdx);
      const initialExercises = (basePlanDay && !basePlanDay.isRest && Array.isArray(basePlanDay.exercises))
        ? basePlanDay.exercises.map((e: any, idx: number) => {
            const prevSession = historyIndex.get(normalizeExerciseKey(e.name));
            const lastSets = prevSession?.sets || null;
            const lastValidSet = lastSets && lastSets.length > 0 ? lastSets[lastSets.length - 1] : null;
            const defaultTargetReps = parseInt(String(e.targetReps || '8-12').split(/[-–—]/)[0], 10) || 8;

            return {
              _idx: idx,
              exerciseId: e.id,
              name: e.name,
              targetSets: e.targetSets || 3,
              targetReps: e.targetReps || '8–12',
              muscle: e.muscle || 'Mixed',
              videoId: e.videoId || '',
              restTimeSecs: e.restTimeSecs || 90,
              lastSessionSets: lastSets ?? undefined,
              setsLog: Array.from({ length: e.targetSets || 3 }, (_, i) => {
                const lastSet = lastSets?.[i] || lastValidSet;
                const setWeight = (lastSet?.weight != null && Number(lastSet.weight) >= 0) ? Number(lastSet.weight) : null;
                return {
                  setNumber: i + 1,
                  reps: lastSet?.reps ? Number(lastSet.reps) : defaultTargetReps,
                  weight: setWeight,
                  completed: false,
                };
              }),
            };
          })
        : [];
      base = {
        userId: user?.uid || 'local_user',
        id: user?.uid ? `${user.uid}_${dateStr}` : undefined,
        date: dateStr,
        dayPlanIndex: planIdx,
        exercises: initialExercises,
        cardio: (basePlanDay && !basePlanDay.isRest && Array.isArray(basePlanDay.cardio))
          ? mapPlanCardioToLogs(basePlanDay.cardio)
          : [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    const pastDurationMs = (base?.workoutDurationSeconds ? base.workoutDurationSeconds * 1000 : (base?.workoutDurationMinutes || 0) * 60000);
    const updated: GymDayLog = {
      ...base,
      id: base.id || (user?.uid ? `${user.uid}_${dateStr}` : undefined),
      completed: false,
      workoutDurationMinutes: base.workoutDurationMinutes,
      workoutDurationSeconds: base.workoutDurationSeconds,
      workoutStartTime: customStartTime ?? (Date.now() - pastDurationMs),
      updatedAt: Date.now(),
    };
    logRef.current = updated;
    setLog(updated);
    saveLog(updated);

    setWorkoutActiveGlobal(true, updated.workoutStartTime, dateStr);

    const workoutName = planDay?.name || resolvePlanDay(userGymPlan, planIdx)?.name || 'Workout';
    InteractionManager.runAfterInteractions(() => {
      showWorkoutInProgressNotification({
        workoutName,
        completedSets: 0,
        dateStr,
      }).catch(() => {});
      scheduleWorkoutAutoFinishNotification({
        workoutName,
        workoutStartTime: updated.workoutStartTime!,
        dateStr,
      }).catch(() => {});
      try {
        const sessionDate = dateStr;
        const widgetData = buildLiveWorkoutWidgetData({
          todayStr: sessionDate,
          gymLogs: [updated, ...(gymLogsRef.current || []).filter(l => l.date !== sessionDate)],
          userGymPlan,
        });
        saveCachedLiveWorkoutData(widgetData).catch(() => {});
        updateLiveWorkoutWidget(widgetData).catch(() => {});
      } catch {}
    });
  }, [saveLog, userGymPlan, dateStr, planDay, planIdx, historyIndex, user]);

  const resumeWorkout = useCallback((customStartTime?: number) => {
    const prev = logRef.current;
    if (!prev) return;
    const pastDurationMs = (prev.workoutDurationSeconds ? prev.workoutDurationSeconds * 1000 : (prev.workoutDurationMinutes || 0) * 60000);
    const anchorNow = customStartTime ?? Date.now();
    const updated: GymDayLog = {
      ...prev,
      completed: false,
      workoutStartTime: prev.workoutStartTime || (anchorNow - pastDurationMs),
      workoutDurationMinutes: prev.workoutDurationMinutes,
      workoutDurationSeconds: prev.workoutDurationSeconds,
      updatedAt: Date.now(),
    };
    setWorkoutActiveGlobal(true, updated.workoutStartTime, dateStr);
    logRef.current = updated;
    setLog(updated);
    saveLog(updated);

    const workoutName = planDay?.name || resolvePlanDay(userGymPlan, planIdx)?.name || 'Workout';
    InteractionManager.runAfterInteractions(() => {
      scheduleWorkoutAutoFinishNotification({
        workoutName,
        workoutStartTime: updated.workoutStartTime!,
        dateStr,
      }).catch(() => {});
    });
  }, [saveLog, planDay, userGymPlan, planIdx, dateStr]);

  const revertWorkout = useCallback(() => {
    const prev = logRef.current;
    if (!prev) return;
    const resetExercises = (prev.exercises || []).map(ex => ({
      ...ex,
      setsLog: (ex.setsLog || []).map(s => ({ ...s, completed: false })),
    }));
    const updated: GymDayLog = {
      ...prev,
      completed: false,
      exercises: resetExercises,
      workoutStartTime: undefined,
      workoutDurationMinutes: undefined,
      workoutDurationSeconds: undefined,
      startTime: undefined,
      endTime: undefined,
      restTimerStartTime: undefined,
      restTimerDurationSecs: undefined,
      restTimerExerciseName: undefined,
      updatedAt: Date.now(),
    };
    logRef.current = updated;
    setLog(updated);
    saveLog(updated);

    try {
      const sessionDate = dateStr;
      const widgetData = buildLiveWorkoutWidgetData({
        todayStr: sessionDate,
        gymLogs: [updated, ...(gymLogsRef.current || []).filter(l => l.date !== sessionDate)],
        userGymPlan,
      });
      saveCachedLiveWorkoutData(widgetData).catch(() => {});
      updateLiveWorkoutWidget(widgetData).catch(() => {});
    } catch {}

    clearGlobalRestTimer().catch(() => {});
    setWorkoutActiveGlobal(false);

    const sessionDate = dateStr;
    const draftKeys = [
      '@zentrack_active_workout_state',
      '@gym_last_completed_session',
      `@gym_active_session_${sessionDate}`,
      `gym_active_draft_${sessionDate}`,
      `gym_active_draft_${user?.uid || 'local_user'}_${sessionDate}`,
    ];
    if (logRef.current?.id) {
      draftKeys.push(`gym_active_draft_${logRef.current.id}`);
    }
    draftKeys.forEach(k => L1_RAM_CACHE.delete(k));
    AsyncStorage.multiRemove(draftKeys).catch(() => {});
    dismissActiveWorkoutNotification().catch(() => {});
  }, [saveLog, userGymPlan, dateStr, user?.uid]);

  const endWorkout = useCallback(async (completed = true, overrideExercises?: GymExerciseLog[]) => {
    if (!completed) {
      revertWorkout();
      return;
    }

    const currentLog = logRef.current || (gymLogsRef.current || []).find(l => l.date === dateStr);
    const targetDate = currentLog?.date || dateStr;
    awardXP('GYM_SESSION', `session_${targetDate}`).catch(() => {});

    // PRESERVE DURATION:
    // If workout was already completed and has a stored duration (e.g. 10 mins / 600 secs),
    // re-finishing (e.g. after logging another set) must accumulate and NEVER reset!
    const prevDurationMinutes = (typeof currentLog?.workoutDurationMinutes === 'number' && currentLog.workoutDurationMinutes > 0)
      ? currentLog.workoutDurationMinutes
      : 0;
    const prevDurationSeconds = (typeof currentLog?.workoutDurationSeconds === 'number' && currentLog.workoutDurationSeconds > 0)
      ? currentLog.workoutDurationSeconds
      : prevDurationMinutes * 60;

    let duration: number;
    let durationSeconds: number;
    let startMs = currentLog?.workoutStartTime;
    if (startMs) {
      // 120-minute (7,200s) maximum session limit
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - startMs) / 1000));
      durationSeconds = Math.min(7200, Math.max(prevDurationSeconds, elapsedSeconds));
      const elapsedMins = Math.min(120, Math.max(1, Math.round(durationSeconds / 60)));
      duration = Math.min(120, Math.max(prevDurationMinutes, elapsedMins));
    } else {
      duration = prevDurationMinutes > 0 ? Math.min(120, prevDurationMinutes) : 1;
      durationSeconds = prevDurationSeconds > 0 ? Math.min(7200, prevDurationSeconds) : duration * 60;
      startMs = Date.now() - (durationSeconds * 1000);
    }

    const startD = new Date(startMs);
    const endD = new Date();
    const startTimeStr = `${startD.getHours().toString().padStart(2, '0')}:${startD.getMinutes().toString().padStart(2, '0')}`;
    const endTimeStr = `${endD.getHours().toString().padStart(2, '0')}:${endD.getMinutes().toString().padStart(2, '0')}`;

    // Exercise preservation: prioritize explicitly passed live screen exercises,
    // fallback to currentLog, then logRef, so no sets are ever lost or blanked out!
    const exercisesToSave = (overrideExercises && overrideExercises.length > 0)
      ? overrideExercises
      : (currentLog?.exercises && currentLog.exercises.length > 0)
      ? currentLog.exercises
      : (logRef.current?.exercises || []);

    const updated: GymDayLog = {
      ...(currentLog || {}),
      id: currentLog?.id || (user ? `${user.uid}_${targetDate}` : undefined),
      userId: user?.uid || currentLog?.userId || '',
      date: targetDate,
      dayPlanIndex: currentLog?.dayPlanIndex ?? planIdx,
      exercises: exercisesToSave,
      cardio: currentLog?.cardio || [],
      completed: true,
      workoutStartTime: undefined,
      workoutDurationMinutes: duration,
      workoutDurationSeconds: durationSeconds,
      startTime: currentLog?.startTime || startTimeStr,
      endTime: currentLog?.endTime || endTimeStr,
      restTimerStartTime: undefined,
      restTimerDurationSecs: undefined,
      restTimerExerciseName: undefined,
      createdAt: (currentLog as any)?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    // 1. Synchronously update local ref and local state
    logRef.current = updated;
    setLog(updated);

    // 2. Broadcast workout completion cleanly via microtask
    queueMicrotask(() => {
      DeviceEventEmitter.emit('gym_workout_completed', {
        date: targetDate,
        duration,
        log: updated,
      });
    });

    // 3. Synchronously trigger saveLog (which runs immediate optimistic update & immediate Firestore write)
    saveLog(updated);

    // 4. Update widget data & detect newly established PRs deferred after animations
    InteractionManager.runAfterInteractions(() => {
      try {
        for (const ex of exercisesToSave || []) {
          if (ex.skipped || !ex.name) continue;
          for (const s of ex.setsLog || []) {
            if (!s || !s.completed || s.isWarmup || s.setType === 'warmup') continue;
            const w = Number(s.weight ?? (s as any).weightKg) || 0;
            const r = Number(s.reps) || 0;
            if (w > 0 && r > 0) {
              detectPR(ex.name, w, r).catch(() => {});
            }
          }
        }
      } catch {}

      try {
        const sessionDate = targetDate;
        const widgetData = buildLiveWorkoutWidgetData({
          todayStr: sessionDate,
          gymLogs: [updated, ...(gymLogsRef.current || []).filter(l => l.date !== sessionDate)],
          userGymPlan,
        });
        saveCachedLiveWorkoutData(widgetData).catch(() => {});
        updateLiveWorkoutWidget(widgetData).catch(() => {});
      } catch {}
    });

    // 5. Clean up notifications & local session caches
    cancelWorkoutAutoFinishNotification().catch(() => {});
    clearGlobalRestTimer().catch(() => {});

    const sessionDate = targetDate;
    AsyncStorage.removeItem('@zentrack_active_workout_state').catch(() => {});
    AsyncStorage.removeItem(`@gym_active_session_${sessionDate}`).catch(() => {});
    AsyncStorage.setItem('@gym_last_completed_session', JSON.stringify({
      date: sessionDate,
      completed: true,
      updatedAt: Date.now(),
    })).catch(() => {});

    // Show workout completed notification & dismiss persistent ongoing notification
    const completedSetsCount = (updated.exercises || []).reduce(
      (sum: number, ex: any) => sum + (ex.setsLog || []).filter((s: any) => s.completed).length, 0
    );
    const workoutName = planDay?.name || resolvePlanDay(userGymPlan, updated.dayPlanIndex ?? planIdx)?.name || 'Workout';
    showWorkoutCompletedNotification({
      workoutName,
      completedSets: completedSetsCount,
      durationMinutes: duration,
      dateStr: sessionDate,
    }).catch(() => {});

    // PERF FIX: Re-enable scheduling now that workout is done.
    // gym_workout_completed event in BackgroundNotificationWatcher also clears this flag,
    // but we set it here too for the rare case where the event fires before this line runs.
    clearGlobalRestTimer().catch(() => {});
    setWorkoutActiveGlobal(false);
    InteractionManager.runAfterInteractions(() => {
      cancelTodayTrainingAlerts(sessionDate).catch(() => {});
      reconcileNotificationQueue({ userGymPlan, force: true }).catch(() => {});
    });
    return updated;
  }, [user, dateStr, planIdx, saveLog, userGymPlan, revertWorkout]);

  endWorkoutRef.current = endWorkout;

  // ─── 120-MINUTE AUTO-FINISH ENGINE ─────────────────────────────────────────
  // If a workout timer reaches or exceeds 120 minutes (foreground or background),
  // automatically finish and save the session, clamping the total duration to 120 minutes.
  useEffect(() => {
    if (!log?.workoutStartTime || log?.completed) return;

    const startMs = Number(log.workoutStartTime);
    const maxDurationMs = 120 * 60 * 1000; // 120 minutes
    const elapsedMs = Date.now() - startMs;

    if (elapsedMs >= maxDurationMs) {
      endWorkout(true);
      return;
    }

    const remainingMs = maxDurationMs - elapsedMs;
    const timer = setTimeout(() => {
      endWorkout(true);
    }, remainingMs);

    return () => clearTimeout(timer);
  }, [log?.workoutStartTime, log?.completed, endWorkout]);

  const startRestTimer = useCallback(async (durationSecs: number, exerciseName?: string) => {
    setRestTimerState({
      startTime: Date.now(),
      durationSecs,
      exerciseName,
    });
    await startGlobalRestTimer(durationSecs, exerciseName);
  }, []);

  const clearRestTimer = useCallback(async () => {
    setRestTimerState({});
    await clearGlobalRestTimer();
  }, []);

  // Takes an ABSOLUTE duration in seconds (not a delta).
  // ActiveLoggingScreen already computes the absolute value (restTimerInitial ± 30)
  // so we must NOT add it on top of the current value.
  const setRestTimerDuration = useCallback(async (absoluteSecs: number) => {
    const newDuration = Math.max(0, absoluteSecs);
    setRestTimerState(prev => ({
      ...prev,
      durationSecs: newDuration,
    }));
    await setGlobalRestTimerDuration(newDuration);
  }, []);

  const swapDayRoutine = useCallback((targetDayIndex: number) => {
    const targetPlanDay = resolvePlanDay(userGymPlan, targetDayIndex) || getCustomPlanDay(userGymPlan?.customDays, targetDayIndex) || GYM_PLAN.find(d => d.dayIndex === targetDayIndex);
    if (!targetPlanDay) return;

    if (targetPlanDay.isRest) {
      setWorkoutActiveGlobal(false);
      dismissActiveWorkoutNotification().catch(() => {});
    }

    const newExercises = !targetPlanDay.isRest ? targetPlanDay.exercises.map((e: any, idx: number) => {
      const prevSession = historyIndex.get(normalizeExerciseKey(e.name));
      const lastSets = prevSession?.sets || null;
      const defaultTargetReps = parseInt(String(e.targetReps || '8-12').split(/[-–—]/)[0], 10) || 8;
      return {
        _idx: idx,
        exerciseId: e.id,
        name: e.name,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
        muscle: e.muscle,
        videoId: e.videoId,
        restTimeSecs: e.restTimeSecs,
        lastSessionSets: lastSets ?? undefined,
        setsLog: Array.from({ length: e.targetSets }, (_, i) => ({
          setNumber: i + 1,
          reps: lastSets?.[i]?.reps ?? defaultTargetReps,
          weight: lastSets?.[i]?.weight ?? null,
          completed: false,
        })),
      };
    }) : [];

    const prev = logRef.current;
    const keptCompletedCardio = (prev?.cardio || []).filter(c => Boolean(c.completed));
    const nextPlanCardio = !targetPlanDay.isRest && Array.isArray(targetPlanDay.cardio)
      ? mapPlanCardioToLogs(targetPlanDay.cardio)
      : [];
    const mergedCardio = targetPlanDay.isRest
      ? keptCompletedCardio
      : [...keptCompletedCardio, ...nextPlanCardio];

    const updated: GymDayLog = {
      ...(prev || { userId: user?.uid || '', date: dateStr, cardio: [], createdAt: Date.now() }),
      dayPlanIndex: targetDayIndex,
      exercises: newExercises,
      cardio: mergedCardio,
      updatedAt: Date.now(),
    };

    if (targetPlanDay.isRest) {
      updated.workoutStartTime = undefined;
      updated.workoutDurationMinutes = undefined;
      updated.restTimerStartTime = undefined;
      updated.restTimerDurationSecs = undefined;
      updated.restTimerExerciseName = undefined;
    }

    logRef.current = updated;
    setLog(updated);
    saveLog(updated);
  }, [userGymPlan, historyIndex, dateStr, user?.uid, saveLog]);

  const triggerDeload = useCallback(() => {
    const prev = logRef.current;
    if (!prev) return;
    const exercises = prev.exercises.map(ex => {
      const newTargetSets = Math.max(1, ex.targetSets - 1);
      const cleanedReps = ex.targetReps ? String(ex.targetReps).replace(' (RPE 7)', '') : ex.targetReps;

      const warmups = (ex.setsLog || []).filter(s => s.isWarmup);
      const working = (ex.setsLog || []).filter(s => !s.isWarmup);
      const completedWorking = working.filter(s => s.completed);
      const uncompletedWorking = working.filter(s => !s.completed);
      const targetUncompletedCount = Math.max(0, newTargetSets - completedWorking.length);
      const trimmedWorking = [...completedWorking, ...uncompletedWorking.slice(0, targetUncompletedCount)];

      const nextSets = [...warmups, ...trimmedWorking].map((s, idx) => ({ ...s, setNumber: idx + 1 }));

      return { ...ex, targetSets: newTargetSets, targetReps: cleanedReps, setsLog: nextSets };
    });
    const updated = { ...prev, exercises, updatedAt: Date.now() };
    logRef.current = updated;
    setLog(updated);
    saveLog(updated);
  }, [saveLog]);

  // ── G8: Workout Notes ────────────────────────────────────────────────────────
  const updateNotes = useCallback((text: string) => {
    const prev = logRef.current;
    if (!prev) return;
    const updated = { ...prev, notes: text, updatedAt: Date.now() };
    logRef.current = updated;
    setLog(updated);
    saveLog(updated);
  }, [saveLog]);

  // ── Force override plan layout when master template changes ────────────────
  const forceOverrideTodayPlan = useCallback((newCustomDays: Record<number, GymPlanDay>) => {
    // Issue #88: Check completed sets only
    const hasLoggedSets = (logRef.current?.exercises || []).some((ex: any) =>
      (ex.setsLog || []).some((s: any) => s.completed === true)
    );
    // Never overwrite an already started or completed session
    if (logRef.current?.completed || logRef.current?.workoutStartTime || hasLoggedSets) {
      return;
    }

    const pIdx = planDayIndexForDate(dateStr);
    const targetPlanDay = getCustomPlanDay(newCustomDays, pIdx) || GYM_PLAN.find(d => d.dayIndex === pIdx);
    if (!targetPlanDay) return;

    const isRest = targetPlanDay.isRest === true;
    const newExercises = !isRest ? targetPlanDay.exercises.map((e: any, idx: number) => {
      const prevSession = historyIndex.get(normalizeExerciseKey(e.name));
      const lastSets = prevSession?.sets || null;
      const lastValidSet = lastSets && lastSets.length > 0 ? lastSets[lastSets.length - 1] : null;
      const defaultTargetReps = parseInt(String(e.targetReps || '8-12').split(/[-–—]/)[0], 10) || 8;

      let patchedMuscle = e.muscle;
      if (!patchedMuscle || ['general', 'unknown', 'none', 'mixed', 'null', 'undefined'].includes(patchedMuscle.trim().toLowerCase())) {
        patchedMuscle = resolveExerciseTargetMuscle(e.name, e.muscle).targetMuscle;
      }

      return {
        _idx: idx,
        exerciseId: e.id,
        name: e.name,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
        muscle: patchedMuscle,
        videoId: e.videoId,
        restTimeSecs: e.restTimeSecs,
        lastSessionSets: lastSets ?? undefined,
        setsLog: Array.from({ length: e.targetSets }, (_, i) => {
          const lastSet = lastSets?.[i] || lastValidSet;
          const setWeight = (lastSet?.weight != null && Number(lastSet.weight) >= 0) ? Number(lastSet.weight) : null;
          return {
            setNumber: i + 1,
            reps: lastSet?.reps ? Number(lastSet.reps) : defaultTargetReps,
            weight: setWeight,
            completed: false,
          };
        }),
      };
    }) : [];

    const updated: GymDayLog = {
      ...(logRef.current || { userId: user?.uid || '', date: dateStr, cardio: [], createdAt: Date.now() }),
      dayPlanIndex: pIdx,
      exercises: newExercises,
      cardio: (!isRest && Array.isArray(targetPlanDay.cardio))
        ? mapPlanCardioToLogs(targetPlanDay.cardio)
        : [],
      workoutStartTime: undefined,
      workoutDurationMinutes: undefined,
      completed: false,
      updatedAt: Date.now(),
    };

    setLog(updated);
    saveLog(updated);
  }, [dateStr, user?.uid, saveLog, historyIndex]);

  return {
    log,
    updateSet,
    toggleSetComplete,
    deleteExercise,
    updateExercise,
    reorderExercise,
    reorderExercisesFull,
    addExercise,
    addSet,
    removeSet,
    addCardio,
    updateCardio,
    deleteCardio,
    startWorkout,
    endWorkout,
    resumeWorkout,
    revertWorkout,
    startRestTimer,
    clearRestTimer,
    setRestTimerDuration,
    restTimerStartTime: restTimerState.startTime ?? getGlobalRestTimer()?.startTime ?? log?.restTimerStartTime,
    restTimerDurationSecs: restTimerState.durationSecs ?? getGlobalRestTimer()?.durationSecs ?? log?.restTimerDurationSecs,
    restTimerInitial: restTimerState.durationSecs ?? getGlobalRestTimer()?.durationSecs ?? log?.restTimerDurationSecs ?? 0,
    saveLog,
    planDay,
    swapExercise,
    makeSwapPermanent,
    logSetAndStartTimer,
    reloadFromFirestore,
    swapDayRoutine,
    triggerDeload,
    updateNotes,
    forceOverrideTodayPlan,
    historyIndex,
  };
}
