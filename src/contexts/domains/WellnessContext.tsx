/**
 * WellnessContext — ZenTrack Mobile
 *
 * Owns: gymLogs, userGymPlan, weightLogs, updateMasterPlan.
 *
 * Subscription strategy: DEMAND-BASED + OFFLINE-FIRST.
 * On mount: reads gymLogs/weightLogs/userGymPlan from
 * AsyncStorage instantly (~5ms). Gym screens show real data immediately,
 * even when offline. Firestore snapshots silently update the cache when online.
 */
import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from "react";
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, deleteField, limit } from "firebase/firestore";
import { InteractionManager, DeviceEventEmitter, unstable_batchedUpdates, AppState } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, auth } from "../../services/firebase";
import { COLLECTION } from "../../config/constants";
import { UserGymPlanDoc, GymPlanDay, GymRoutine, GymRoutineFolder, UserGymProgramme } from "../../types/gym.types";
import type { GymLog } from "../../types/gym.types";
import type { WeightLog } from "../../types/legacy.types";
import { GYM_PLAN_ARNOLD, GYM_PLAN_PPL, clearPlanDayCache } from "../../data/gymPlan";
import { writeWellnessCache, readWellnessCache } from "../../utils/domainCache";
import { loadBootManifest, getBootManifestSync, updateL1Cache, setL1Sync, getL1Sync, deleteL1Sync, L1_RAM_CACHE } from "../../utils/bootManifest";
import { parseGymLog, areItemsEqual } from "../../utils/schemaGuards";
import { mergeGymLogMonotonic, getCanonicalExerciseName, resolveExerciseTargetMuscle } from "../../utils/gymUtils";
import { formatLocalDateStr, offsetDateStr } from "../../utils/dateUtils";
import { scheduleGymNotifications } from "../../services/notifications";
import { applyPendingQueueOverlay, getMemoryQueueSync } from "../../services/offlineSync";
import { safeWrite, safeDelete } from "../../utils/safeWrite";
import { getMonotonicTimestamp } from "../../utils/firebaseUtils";
import { precomputeGymAnalytics } from "../../services/gymAnalyticsPrecompute";

function canonicalizeGymPlanDay(day: GymPlanDay): GymPlanDay {
  if (!day) return day;
  const nextExercises = Array.isArray(day.exercises)
    ? day.exercises.map(ex => {
        const canonicalName = getCanonicalExerciseName(ex.name);
        return {
          ...ex,
          name: canonicalName,
          muscle: resolveExerciseTargetMuscle(canonicalName, ex.muscle).targetMuscle,
        };
      })
    : [];
  const nextCardio = Array.isArray(day.cardio) ? day.cardio : [];
  return {
    ...day,
    exercises: nextExercises,
    ...(nextCardio.length > 0 || Array.isArray(day.cardio) ? { cardio: nextCardio } : {}),
  };
}

export function canonicalizeGymRoutine(routine: GymRoutine): GymRoutine {
  if (!routine) return routine;
  const nextExercises = Array.isArray(routine.exercises)
    ? routine.exercises.map(ex => {
        const canonicalName = getCanonicalExerciseName(ex.name);
        return {
          ...ex,
          name: canonicalName,
          muscle: resolveExerciseTargetMuscle(canonicalName, ex.muscle).targetMuscle,
        };
      })
    : [];
  const nextCardio = Array.isArray(routine.cardio) ? routine.cardio : [];
  return {
    ...routine,
    exercises: nextExercises,
    ...(nextCardio.length > 0 || Array.isArray(routine.cardio) ? { cardio: nextCardio } : {}),
  };
}

function canonicalizeUserGymPlan(plan: UserGymPlanDoc | null): UserGymPlanDoc | null {
  if (!plan) return null;
  if (
    plan.schemaVersion === 2 &&
    plan.customDays &&
    typeof plan.customDays === 'object' &&
    !Array.isArray(plan.customDays)
  ) {
    return plan;
  }
  const newCustomDays: Record<string, any> = {};
  if (plan.customDays && typeof plan.customDays === 'object') {
    // Issue #63: Repair array-serialized customDays using (day as any)?.dayIndex ?? Number(key)
    if (Array.isArray(plan.customDays)) {
      for (const day of plan.customDays) {
        if (!day) continue;
        const targetKey = String((day as any).dayIndex ?? '');
        if (targetKey) {
          newCustomDays[targetKey] = canonicalizeGymPlanDay(day as GymPlanDay);
        }
      }
    } else {
      for (const [key, day] of Object.entries(plan.customDays)) {
        if (!day) continue;
        const targetKey = String((day as any)?.dayIndex ?? key);
        newCustomDays[targetKey] = canonicalizeGymPlanDay(day as GymPlanDay);
      }
    }
  }

  let canonicalRoutines: Record<string, GymRoutine> = {};
  if (plan.routines && typeof plan.routines === 'object') {
    const { CURATED_SPLITS } = require("../../data/curatedSplits");
    const curatedWorkoutIds = new Set(
      CURATED_SPLITS.flatMap((s: any) => s.workouts.map((w: any) => w.id))
    );
    for (const [id, rt] of Object.entries(plan.routines)) {
      if (!curatedWorkoutIds.has(id) && !(rt as any).isCuratedSplit) {
        canonicalRoutines[id] = canonicalizeGymRoutine(rt);
      }
    }
  }

  return {
    ...plan,
    schemaVersion: 2,
    customDays: Object.keys(newCustomDays).length > 0 ? newCustomDays : (plan.customDays || {}),
    routines: Object.keys(canonicalRoutines).length > 0 ? canonicalRoutines : (plan.routines || {}),
  };
}

// ─── Sub-Context Shapes ───────────────────────────────────────────────────────
export interface GymLogsContextType {
  gymLogs: GymLog[];
  recentGymLogs: GymLog[];
  logsByDateMap: Map<string, GymLog>;
  gymLogsReady: boolean;
  ensureSubscribed: () => void;
  optimisticAddGymLog: (log: GymLog) => void;
  optimisticUpdateGymLog: (logId: string, partial: Partial<GymLog>) => void;
}

export interface GymPlanContextType {
  userGymPlan: UserGymPlanDoc | null;
  updateMasterPlan: (dayIndex: number, planDay: GymPlanDay, syncUnstartedDay?: boolean) => Promise<void>;
  updateFullMasterPlan: (
    newCustomDays: Record<number, GymPlanDay>,
    templateId?: string,
    splitName?: string,
    newRoutines?: Record<string, GymRoutine>
  ) => Promise<void>;
  applyMasterTemplate: (templateId: 'arnold' | 'ppl', schedulePattern?: 'mon_sun' | 'tue_mon' | 'wed_sun' | 'mon_fri') => Promise<Record<number, GymPlanDay> | undefined>;
  saveCustomRoutine: (routine: GymRoutine, assignedDayIndex?: number | null) => Promise<void>;
  deleteCustomRoutine: (routineId: string) => Promise<void>;
  assignRoutineToDay: (dayIndex: number, routineId?: string, routine?: GymRoutine) => Promise<void>;
  saveRoutineFolders: (folders: GymRoutineFolder[]) => Promise<void>;
  setScheduleMode?: (mode: 'calendar' | 'rotation') => Promise<void>;
  setActiveProgramme?: (programme: UserGymProgramme | null) => Promise<void>;
}

export interface BodyMetricsContextType {
  weightLogs: WeightLog[];
  optimisticUpdateWeightLogs: (logs: WeightLog[]) => void;
}

// ─── Unified Context Shape (Backward Compatible) ──────────────────────────────
export interface WellnessContextType extends GymLogsContextType, GymPlanContextType, BodyMetricsContextType {}

const DEFAULT_WELLNESS_DATA: WellnessContextType = {
  gymLogs: [],
  recentGymLogs: [],
  logsByDateMap: new Map(),
  gymLogsReady: false,
  weightLogs: [],
  optimisticUpdateWeightLogs: () => {},
  userGymPlan: null,
  updateMasterPlan: async () => {},
  updateFullMasterPlan: async () => {},
  applyMasterTemplate: async () => undefined,
  saveCustomRoutine: async () => {},
  deleteCustomRoutine: async () => {},
  assignRoutineToDay: async () => {},
  saveRoutineFolders: async () => {},
  setScheduleMode: async () => {},
  setActiveProgramme: async () => {},
  ensureSubscribed: () => {},
  optimisticAddGymLog: () => {},
  optimisticUpdateGymLog: () => {},
};

const GymLogsContext = createContext<GymLogsContextType | null>(null);
const GymPlanContext = createContext<GymPlanContextType | null>(null);
const BodyMetricsContext = createContext<BodyMetricsContextType | null>(null);

export function useGymLogs(): GymLogsContextType {
  const ctx = useContext(GymLogsContext);
  if (!ctx) {
    return {
      gymLogs: DEFAULT_WELLNESS_DATA.gymLogs,
      recentGymLogs: DEFAULT_WELLNESS_DATA.recentGymLogs,
      logsByDateMap: DEFAULT_WELLNESS_DATA.logsByDateMap,
      gymLogsReady: DEFAULT_WELLNESS_DATA.gymLogsReady,
      ensureSubscribed: DEFAULT_WELLNESS_DATA.ensureSubscribed,
      optimisticAddGymLog: DEFAULT_WELLNESS_DATA.optimisticAddGymLog,
      optimisticUpdateGymLog: DEFAULT_WELLNESS_DATA.optimisticUpdateGymLog,
    };
  }
  return ctx;
}

export function useGymPlan(): GymPlanContextType {
  const ctx = useContext(GymPlanContext);
  if (!ctx) {
    return {
      userGymPlan: DEFAULT_WELLNESS_DATA.userGymPlan,
      updateMasterPlan: DEFAULT_WELLNESS_DATA.updateMasterPlan,
      updateFullMasterPlan: DEFAULT_WELLNESS_DATA.updateFullMasterPlan,
      applyMasterTemplate: DEFAULT_WELLNESS_DATA.applyMasterTemplate,
      saveCustomRoutine: DEFAULT_WELLNESS_DATA.saveCustomRoutine,
      deleteCustomRoutine: DEFAULT_WELLNESS_DATA.deleteCustomRoutine,
      assignRoutineToDay: DEFAULT_WELLNESS_DATA.assignRoutineToDay,
      saveRoutineFolders: DEFAULT_WELLNESS_DATA.saveRoutineFolders,
      setScheduleMode: DEFAULT_WELLNESS_DATA.setScheduleMode,
      setActiveProgramme: DEFAULT_WELLNESS_DATA.setActiveProgramme,
    };
  }
  return ctx;
}

export function useBodyMetrics(): BodyMetricsContextType {
  const ctx = useContext(BodyMetricsContext);
  if (!ctx) {
    return {
      weightLogs: DEFAULT_WELLNESS_DATA.weightLogs,
      optimisticUpdateWeightLogs: DEFAULT_WELLNESS_DATA.optimisticUpdateWeightLogs,
    };
  }
  return ctx;
}

export const ACTIVE_WORKOUT_STATE_KEY = '@zentrack_active_workout_state';

let _isWorkoutActiveGlobal = false;
let _activeWorkoutStartTime: number | null = null;
let _activeWorkoutDate: string | null = null;
let _activeWorkoutMutated = false;

try {
  const cachedActive = getL1Sync<{ active: boolean; startTime?: number; date?: string } | null>(
    ACTIVE_WORKOUT_STATE_KEY,
    null
  );
  if (cachedActive && cachedActive.active) {
    if (cachedActive.startTime && Date.now() - cachedActive.startTime < 180 * 60 * 1000) {
      _isWorkoutActiveGlobal = true;
      _activeWorkoutStartTime = cachedActive.startTime;
      _activeWorkoutDate = cachedActive.date || null;
    } else {
      deleteL1Sync(ACTIVE_WORKOUT_STATE_KEY);
    }
  }
} catch {}

export function setWorkoutActiveGlobal(active: boolean, startTime?: number, date?: string) {
  _activeWorkoutMutated = true;
  const nextStartTime = active ? (startTime || _activeWorkoutStartTime || Date.now()) : null;
  const nextDate = active ? (date || _activeWorkoutDate) : null;

  if (
    _isWorkoutActiveGlobal === active &&
    _activeWorkoutStartTime === nextStartTime &&
    _activeWorkoutDate === nextDate
  ) {
    return;
  }

  _isWorkoutActiveGlobal = active;
  if (active) {
    _activeWorkoutStartTime = nextStartTime;
    _activeWorkoutDate = nextDate;
    const payload = {
      active: true,
      startTime: _activeWorkoutStartTime,
      date: _activeWorkoutDate,
    };
    setL1Sync(ACTIVE_WORKOUT_STATE_KEY, payload, true);
  } else {
    _activeWorkoutStartTime = null;
    _activeWorkoutDate = null;
    deleteL1Sync(ACTIVE_WORKOUT_STATE_KEY);
  }
  const payload = {
    active: _isWorkoutActiveGlobal,
    startTime: _activeWorkoutStartTime,
    date: _activeWorkoutDate,
  };
  queueMicrotask(() => {
    DeviceEventEmitter.emit('gym_active_workout_state_changed', payload);
  });
}

export function getWorkoutActiveGlobal(): boolean {
  return _isWorkoutActiveGlobal;
}

export function getWorkoutStartTimeGlobal(): number | null {
  return _activeWorkoutStartTime;
}

export function getWorkoutDateGlobal(): string | null {
  return _activeWorkoutDate;
}

export function useActiveWorkoutState() {
  const [state, setState] = useState<{ active: boolean; startTime: number | null; date: string | null }>(() => ({
    active: getWorkoutActiveGlobal(),
    startTime: getWorkoutStartTimeGlobal(),
    date: getWorkoutDateGlobal(),
  }));

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('gym_active_workout_state_changed', (payload) => {
      const nextActive = Boolean(payload?.active);
      const nextStart = payload?.startTime ?? null;
      const nextDate = payload?.date ?? null;
      setState((prev) => {
        if (prev.active === nextActive && prev.startTime === nextStart && prev.date === nextDate) {
          return prev;
        }
        return {
          active: nextActive,
          startTime: nextStart,
          date: nextDate,
        };
      });
    });
    return () => sub.remove();
  }, []);

  return state;
}

/**
 * Returns local YYYY-MM-DD strings for Mon..Sun of the week containing `baseDate`.
 */
function getCurrentWeekDatesFromMonday(baseDate: Date = new Date()): string[] {
  const dayOfWeek = baseDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + mondayOffset);
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(formatLocalDateStr(d));
  }
  return weekDates;
}

/**
 * Deduplicated helper to purge unstarted drafts/logs for given date strings (Issues #35 & #113).
 */
function purgeUnstartedDraftsForDates(
  dates: string[],
  userId: string | undefined,
  setGymLogs: React.Dispatch<React.SetStateAction<GymLog[]>>,
  gymLogsRef?: React.MutableRefObject<GymLog[]>
) {
  if (!dates.length) return;
  const uniqueDates = Array.from(new Set(dates));
  const keysToRemove: string[] = [];
  for (const dStr of uniqueDates) {
    keysToRemove.push(`gym_active_draft_${dStr}`, `@zenfit_hot_log_${dStr}`);
    L1_RAM_CACHE.delete(`gym_active_draft_${dStr}`);
    L1_RAM_CACHE.delete(`@zenfit_hot_log_${dStr}`);
    if (userId) {
      keysToRemove.push(`gym_active_draft_${userId}_${dStr}`);
      L1_RAM_CACHE.delete(`gym_active_draft_${userId}_${dStr}`);
    }
  }
  AsyncStorage.multiRemove(keysToRemove).catch(() => {});

  const purgedDocIds: string[] = [];
  const purgeUnstarted = (prev: GymLog[]): { changed: boolean; next: GymLog[] } => {
    let changed = false;
    const next = prev.filter(l => {
      if (!uniqueDates.includes(l.date)) return true;
      const hasCompletedSets = (l.exercises || []).some((ex: any) =>
        (ex.setsLog || []).some((s: any) => s.completed === true)
      );
      const hasCompletedCardio = Array.isArray(l.cardio) && l.cardio.some((c: any) => c.completed === true);
      const hasNotes = Boolean(l.notes && l.notes.trim());
      const keep = Boolean(l.completed || l.workoutStartTime || hasCompletedSets || hasCompletedCardio || hasNotes);
      if (!keep) {
        changed = true;
        if (l.id) purgedDocIds.push(l.id);
      }
      return keep;
    });
    return { changed, next };
  };

  setGymLogs(prev => {
    const { changed, next } = purgeUnstarted(prev);
    if (!changed) return prev;
    if (gymLogsRef) gymLogsRef.current = next;
    updateL1Cache('gymLogs', next);
    writeWellnessCache({ gymLogs: next }, true);
    return next;
  });

  if (userId && userId !== 'local_user' && purgedDocIds.length > 0) {
    for (const docId of Array.from(new Set(purgedDocIds))) {
      safeDelete(docId, COLLECTION.GYM_LOGS, () => deleteDoc(doc(db, COLLECTION.GYM_LOGS, docId))).catch(() => {});
    }
  }

  queueMicrotask(() => {
    DeviceEventEmitter.emit('gym_logs_purged', { dates: uniqueDates });
  });
}

// ─── Provider ──────────────────────────────────────────────────────────────────
export function WellnessProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { uid: string } | null;
}) {
  const initialManifest = getBootManifestSync();
  const [gymLogs, setGymLogs]           = useState<GymLog[]>(initialManifest?.gymLogs ?? []);
  // gymLogsSnapshotFired: true once the FIRST Firestore gymLogs snapshot fires (even if empty).
  // This is the correct "ready" signal — not `gymLogs.length > 0` which is always false
  // for new users and breaks the loading skeleton logic.
  const [gymLogsSnapshotFired, setGymLogsSnapshotFired] = useState(false);
  const [userGymPlan, setUserGymPlan]   = useState<UserGymPlanDoc | null>(() => (initialManifest?.userGymPlan?.schemaVersion === 2 ? initialManifest.userGymPlan : canonicalizeUserGymPlan(initialManifest?.userGymPlan ?? null)));
  const [weightLogs, setWeightLogs]     = useState<WeightLog[]>(initialManifest?.weightLogs ?? []);

  const gymLogsRef = useRef<GymLog[]>(gymLogs);
  const userGymPlanRef = useRef<UserGymPlanDoc | null>(userGymPlan);
  useEffect(() => { gymLogsRef.current = gymLogs; }, [gymLogs]);
  useEffect(() => { userGymPlanRef.current = userGymPlan; }, [userGymPlan]);

  const subscribedRef = useRef(false);
  // Issue #65: Isolate listener retry logic per collection with unsubsMapRef
  const unsubsMapRef = useRef<Map<string, () => void>>(new Map());
  const retryTimersMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const subscribeListenerMapRef = useRef<Record<string, (uid: string) => void>>({});
  const deferredInteractionRef = useRef<{ cancel: () => void } | null>(null);
  const pendingGymLogsCacheTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // OFFLINE-FIRST GUARD: tracks whether any cached data has been seeded (Issue #164).
  const hasCachedDataRef = useRef(
    (initialManifest?.gymLogs?.length ?? 0) > 0 ||
    !!initialManifest?.userGymPlan ||
    (initialManifest?.weightLogs?.length ?? 0) > 0
  );

  // ── Listener auto-restart on error (Isolated per collection, Issue #65) ───
  const scheduleListenerRestart = useCallback((context: string, uid: string) => (err: Error) => {
    const isBuilding = err.message.includes('currently building');
    if (isBuilding) {
      console.info(`[Wellness] ${context} index is currently building in Cloud Firestore. Auto-retrying in 15s...`);
    } else {
      console.warn(`[Wellness] ${context} listener error — restarting in 5s`, err.message);
    }
    if (retryTimersMapRef.current.has(context)) return;
    const delay = isBuilding ? 15000 : 5000;
    const timer = setTimeout(() => {
      retryTimersMapRef.current.delete(context);
      if (!user || user.uid !== uid) return;
      const prev = unsubsMapRef.current.get(context);
      if (prev) {
        try { prev(); } catch {}
        unsubsMapRef.current.delete(context);
      }
      subscribeListenerMapRef.current[context]?.(uid);
    }, delay);
    retryTimersMapRef.current.set(context, timer);
  }, [user?.uid]);

  const cleanupSubscriptions = useCallback(() => {
    for (const unsub of unsubsMapRef.current.values()) {
      try { unsub(); } catch {}
    }
    unsubsMapRef.current.clear();
    for (const timer of retryTimersMapRef.current.values()) {
      clearTimeout(timer);
    }
    retryTimersMapRef.current.clear();
    if (pendingGymLogsCacheTimerRef.current) {
      clearTimeout(pendingGymLogsCacheTimerRef.current);
      pendingGymLogsCacheTimerRef.current = null;
    }
    deferredInteractionRef.current?.cancel();
    subscribedRef.current = false;
  }, []);

  // Recover persisted active workout state after cold start if not yet mutated
  useEffect(() => {
    if (_isWorkoutActiveGlobal || _activeWorkoutMutated) return;
    let active = true;
    AsyncStorage.getItem(ACTIVE_WORKOUT_STATE_KEY)
      .then((raw) => {
        if (!active || !raw || _isWorkoutActiveGlobal || _activeWorkoutMutated) return;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.active && parsed.startTime && Date.now() - parsed.startTime < 180 * 60 * 1000) {
          setWorkoutActiveGlobal(true, parsed.startTime, parsed.date || undefined);
        } else if (parsed) {
          AsyncStorage.removeItem(ACTIVE_WORKOUT_STATE_KEY).catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // ── Offline-first boot: seed from boot manifest L1 cache in parallel ───────
  useEffect(() => {
    let isCancelled = false;
    loadBootManifest().then(async manifest => {
      if (isCancelled || !manifest) return;

      let incomingGymLogs = (manifest.gymLogs ?? []).filter(l => !l.isSampleData && !l.id?.startsWith('sample_'));
      let incomingWeightLogs = (manifest.weightLogs ?? []).filter(w => !(w as any).isSampleData && !w.id?.startsWith('sample_'));

      unstable_batchedUpdates(() => {
        let seeded = false;
        // Issue #116: Never unconditionally overwrite live state if already mutated
        if (incomingGymLogs.length > 0) {
          setGymLogs(prev => prev.length === 0 ? incomingGymLogs : prev);
          seeded = true;
        }
        if (manifest.userGymPlan) {
          const canonical = canonicalizeUserGymPlan(manifest.userGymPlan);
          setUserGymPlan(prev => !prev ? canonical : prev);
          seeded = true;
        }
        if (incomingWeightLogs.length > 0) {
          setWeightLogs(prev => prev.length === 0 ? incomingWeightLogs : prev);
          seeded = true;
        }
        if (seeded) hasCachedDataRef.current = true;
      });
    }).catch(() => {});
    return () => { isCancelled = true; };
  }, [user?.uid]);

  // Resynchronize when Android Widget mutates cache while backgrounded (Issue #166)
  useEffect(() => {
    let lastWidgetMutationTs = 0;
    const mergeAndApplyCache = (cachedLogs: GymLog[]) => {
      const current = gymLogsRef.current || [];
      const byId = new Map<string, GymLog>();
      for (const l of current) {
        const k = l.id || l.date;
        byId.set(k, l);
      }
      for (const cl of cachedLogs) {
        const k = cl.id || cl.date;
        const existing = byId.get(k);
        if (existing) {
          byId.set(k, mergeGymLogMonotonic(existing as any, cl as any) as any);
        } else {
          byId.set(k, cl);
        }
      }
      const merged = Array.from(byId.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      updateL1Cache('gymLogs', merged);
      gymLogsRef.current = merged;
      setGymLogs(merged);
    };

    const widgetSub = DeviceEventEmitter.addListener('widget_cache_mutated', async (event: any) => {
      if (event?.domain === 'wellness' || !event?.domain) {
        const cache = await readWellnessCache();
        if (cache && cache.gymLogs && cache.gymLogs.length > 0) {
          mergeAndApplyCache(cache.gymLogs);
        }
      }
    });

    const appStateSub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        try {
          const raw = await AsyncStorage.getItem('@zentrack_widget_mutation_ts');
          const ts = raw ? parseInt(raw, 10) || 0 : 0;
          if (ts > lastWidgetMutationTs) {
            lastWidgetMutationTs = ts;
            const cache = await readWellnessCache();
            if (cache && cache.gymLogs && cache.gymLogs.length > 0) {
              mergeAndApplyCache(cache.gymLogs);
            }
          }
        } catch {}
      }
    });

    // Direct event listener for instant sample data population, archive hydration, or clearing
    const gymLogsChangeSub = DeviceEventEmitter.addListener('gym_logs_changed', (payload?: { gymLogs?: GymLog[]; weightLogs?: WeightLog[] }) => {
      unstable_batchedUpdates(() => {
        if (payload?.gymLogs) {
          setGymLogs(payload.gymLogs);
          gymLogsRef.current = payload.gymLogs;
        }
        if (payload?.weightLogs) {
          setWeightLogs(payload.weightLogs);
        }
      });
    });

    return () => {
      widgetSub.remove();
      appStateSub.remove();
      gymLogsChangeSub.remove();
    };
  }, []);

  const completedLogsSignature = useMemo(() => {
    let completedCount = 0;
    let maxUpdatedAt = 0;
    let latestDate = '';
    for (const l of gymLogs || []) {
      if (!l) continue;
      const isDone = Boolean(
        l.completed || (Array.isArray(l.cardio) && l.cardio.some((c: any) => c.completed))
      );
      if (isDone) {
        completedCount++;
        if (l.date && l.date > latestDate) latestDate = l.date;
        if (typeof l.updatedAt === 'number' && l.updatedAt > maxUpdatedAt) {
          maxUpdatedAt = l.updatedAt;
        }
      }
    }
    return `${completedCount}:${latestDate}:${maxUpdatedAt}`;
  }, [gymLogs]);

  // Debounced notification scheduling: skips while active workout is running, gates on completed/plan changes
  useEffect(() => {
    if (_isWorkoutActiveGlobal) return;
    const timeoutId = setTimeout(() => {
      if (_isWorkoutActiveGlobal) return;
      InteractionManager.runAfterInteractions(() => {
        if (_isWorkoutActiveGlobal) return;
        if (!_isWorkoutActiveGlobal) {
          scheduleGymNotifications({
            gymLogs: gymLogsRef.current || [],
            userGymPlan: userGymPlanRef.current,
          }).catch(() => {});
        }
      });
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [userGymPlan, completedLogsSignature]);

  // AppState background flushing: registered once on mount without listener thrashing (Issue #34)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        if (pendingGymLogsCacheTimerRef.current) {
          clearTimeout(pendingGymLogsCacheTimerRef.current);
          pendingGymLogsCacheTimerRef.current = null;
          writeWellnessCache({ gymLogs: gymLogsRef.current || [] }, false);
        }
        if (!_isWorkoutActiveGlobal) {
          scheduleGymNotifications({
            gymLogs: gymLogsRef.current || [],
            userGymPlan: userGymPlanRef.current,
          }).catch(() => {});
        }
      }
    });

    return () => {
      if (pendingGymLogsCacheTimerRef.current) {
        clearTimeout(pendingGymLogsCacheTimerRef.current);
      }
      sub.remove();
    };
  }, []);

  // ── Individual collection subscribers (Issue #65: isolated retry logic) ───
  const subscribeGymLogs = useCallback((uid: string) => {
    const prev = unsubsMapRef.current.get('gymLogs');
    if (prev) { try { prev(); } catch {} }
    unsubsMapRef.current.delete('gymLogs');

    // Subscribe to all userId workout logs so older history and legacy docs
    // without numeric updatedAt never get locked out behind a stale cursor.
    const gymQuery = query(
      collection(db, COLLECTION.GYM_LOGS),
      where("userId", "==", uid)
    );

    const onGymSnapshot = (snap: any) => {
      if (snap.metadata.hasPendingWrites) return;
      if (snap.docs.length === 0 && snap.metadata.fromCache && hasCachedDataRef.current) return;

      const serverDocIds = new Set<string>();
      snap.docs?.forEach?.((d: any) => {
        if (d?.id) serverDocIds.add(d.id);
      });

      const byId = new Map<string, GymLog>();
      for (const existing of gymLogsRef.current || []) {
        const key = existing.id || `${uid}_${existing.date}`;
        byId.set(key, existing);
      }

      snap.docChanges().forEach((change: any) => {
        const parsed = parseGymLog(change.doc.data(), change.doc.id);
        const key = parsed.id || `${uid}_${parsed.date}`;
        if (change.type === 'removed' || parsed.deleted) {
          byId.delete(key);
        } else {
          const existing = byId.get(key);
          if (existing) {
            const merged = mergeGymLogMonotonic(existing as any, parsed as any);
            byId.set(key, merged as any);
          } else {
            byId.set(key, parsed);
          }
        }
      });

      // Multi-device delete reconciliation: on authoritative server snapshot (fromCache === false),
      // prune stale synced docs for `uid` missing from Firestore unless pending in offline queue or written recently.
      if (!snap.metadata.fromCache) {
        const pendingGymIds = new Set(
          getMemoryQueueSync()
            .filter(q => q.collection === COLLECTION.GYM_LOGS && q.operation !== 'delete' && q.docId)
            .map(q => q.docId!)
        );
        const graceCutoff = Date.now() - 15_000;
        for (const [key, docItem] of Array.from(byId.entries())) {
          const belongsToUid = docItem.userId === uid || key.startsWith(`${uid}_`);
          if (!belongsToUid) continue;
          if (serverDocIds.has(key)) continue;
          if (pendingGymIds.has(key)) continue;
          if (typeof docItem.updatedAt === 'number' && docItem.updatedAt >= graceCutoff) continue;
          byId.delete(key);
        }
      }

      const merged = applyPendingQueueOverlay(COLLECTION.GYM_LOGS, Array.from(byId.values()));
      merged.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      if (areItemsEqual(gymLogsRef.current, merged)) {
        setGymLogsSnapshotFired(true);
        return;
      }

      unstable_batchedUpdates(() => {
        updateL1Cache('gymLogs', merged);
        setGymLogs(merged);
        gymLogsRef.current = merged;
        setGymLogsSnapshotFired(true);
        InteractionManager.runAfterInteractions(() => writeWellnessCache({ gymLogs: merged }, false));
      });
    };

    const gymUnsub = onSnapshot(
      gymQuery,
      onGymSnapshot,
      scheduleListenerRestart("gymLogs", uid)
    );
    unsubsMapRef.current.set('gymLogs', gymUnsub);
  }, [scheduleListenerRestart]);

  const subscribeUserGymPlan = useCallback((uid: string) => {
    const prev = unsubsMapRef.current.get('userGymPlan');
    if (prev) { try { prev(); } catch {} }
    unsubsMapRef.current.delete('userGymPlan');

    const unsub = onSnapshot(
      doc(db, COLLECTION.USER_GYM_PLANS, uid),
      docSnap => {
        if ((docSnap as any)?.metadata?.hasPendingWrites) return;
        if (!docSnap.exists() && (docSnap as any)?.metadata?.fromCache && hasCachedDataRef.current) return;
        unstable_batchedUpdates(() => {
          const rawDoc = docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as unknown as UserGymPlanDoc) : null;
          const overlaidList = applyPendingQueueOverlay(COLLECTION.USER_GYM_PLANS, rawDoc ? [rawDoc] : []);
          const rawPlan = overlaidList[0] || null;
          const plan = canonicalizeUserGymPlan(rawPlan);
          updateL1Cache('userGymPlan', plan);
          userGymPlanRef.current = plan;
          setUserGymPlan(prev => {
            if (prev?.id === plan?.id && prev?.updatedAt && plan?.updatedAt && prev.updatedAt === plan.updatedAt) {
              return prev;
            }
            return plan;
          });
          InteractionManager.runAfterInteractions(() => writeWellnessCache({ userGymPlan: plan }, false));
        });
      },
      scheduleListenerRestart("userGymPlan", uid)
    );
    unsubsMapRef.current.set('userGymPlan', unsub);
  }, [scheduleListenerRestart]);

  const subscribeWeightLogs = useCallback((uid: string) => {
    const prev = unsubsMapRef.current.get('weightLogs');
    if (prev) { try { prev(); } catch {} }
    unsubsMapRef.current.delete('weightLogs');

    const unsub = onSnapshot(
      query(collection(db, COLLECTION.WEIGHT_LOGS), where("userId", "==", uid), limit(500)),
      snap => {
        if (snap.metadata.hasPendingWrites) return;
        if (snap.docs.length === 0 && snap.metadata.fromCache && hasCachedDataRef.current) return;
        unstable_batchedUpdates(() => {
          const fresh = applyPendingQueueOverlay(COLLECTION.WEIGHT_LOGS, snap.docs.map(d => ({ id: d.id, ...d.data() } as WeightLog)));
          fresh.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          setWeightLogs(prev => areItemsEqual(prev, fresh) ? prev : fresh);
          InteractionManager.runAfterInteractions(() => writeWellnessCache({ weightLogs: fresh }));
        });
      },
      scheduleListenerRestart("weightLogs", uid)
    );
    unsubsMapRef.current.set('weightLogs', unsub);
  }, [scheduleListenerRestart]);

  // Register listener methods into dispatch map
  useEffect(() => {
    subscribeListenerMapRef.current = {
      gymLogs: subscribeGymLogs,
      userGymPlan: subscribeUserGymPlan,
      weightLogs: subscribeWeightLogs,
    };
  }, [subscribeGymLogs, subscribeUserGymPlan, subscribeWeightLogs]);

  const openSubscriptions = useCallback((uid: string) => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    subscribeGymLogs(uid);
    subscribeUserGymPlan(uid);

    deferredInteractionRef.current?.cancel();
    deferredInteractionRef.current = InteractionManager.runAfterInteractions(() => {
      if (!subscribedRef.current) return;
      subscribeWeightLogs(uid);
    });
  }, [subscribeGymLogs, subscribeUserGymPlan, subscribeWeightLogs]);

  const demandRequestedRef = useRef(false);
  const deferredSubTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let interactionHandle: { cancel: () => void } | null = null;
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;
    if (user) {
      subscribedRef.current = false;
      // Defer Firestore subscription until Frame 0 paints from L1 cache & animations settle
      interactionHandle = InteractionManager.runAfterInteractions(() => {
        if (safetyTimer) {
          clearTimeout(safetyTimer);
          safetyTimer = null;
        }
        openSubscriptions(user.uid);
      });
      safetyTimer = setTimeout(() => {
        safetyTimer = null;
        openSubscriptions(user.uid);
      }, 1200);
    } else {
      cleanupSubscriptions();
      demandRequestedRef.current = false;
      hasCachedDataRef.current = false;
      unstable_batchedUpdates(() => {
        setGymLogs([]);
        setUserGymPlan(null);
        setWeightLogs([]);
        setGymLogsSnapshotFired(false);
      });
    }
    return () => {
      interactionHandle?.cancel();
      if (safetyTimer) clearTimeout(safetyTimer);
      cleanupSubscriptions();
    };
  }, [user?.uid, cleanupSubscriptions, openSubscriptions]);

  useEffect(() => () => {
    cleanupSubscriptions();
    if (deferredSubTimerRef.current) clearTimeout(deferredSubTimerRef.current);
  }, [cleanupSubscriptions]);

  const ensureSubscribed = useCallback(() => {
    demandRequestedRef.current = true;
    if (deferredSubTimerRef.current) {
      clearTimeout(deferredSubTimerRef.current);
      deferredSubTimerRef.current = null;
    }
    if (user && !subscribedRef.current) {
      openSubscriptions(user.uid);
    }
  }, [user?.uid, openSubscriptions]);

  const updateMasterPlan = useCallback(async (
    dayIndex: number,
    planDay: GymPlanDay,
    syncUnstartedDay: boolean = false
  ) => {
    clearPlanDayCache();
    const userId = user?.uid || 'local_user';
    const currentPlan = userGymPlanRef.current;
    const canonicalDay = canonicalizeGymPlanDay(planDay);
    const newCustomDays = { ...(currentPlan?.customDays || {}), [dayIndex]: canonicalDay };
    const now = getMonotonicTimestamp(currentPlan?.updatedAt || 0);
    const updatedPlan: UserGymPlanDoc = {
      ...(currentPlan || { userId }),
      id: userId,
      userId,
      schemaVersion: 2,
      templateId: currentPlan?.templateId,
      schedulePattern: currentPlan?.schedulePattern,
      scheduleMode: currentPlan?.scheduleMode,
      routines: currentPlan?.routines || {},
      customDays: newCustomDays,
      updatedAt: now,
    };
    userGymPlanRef.current = updatedPlan;
    updateL1Cache('userGymPlan', updatedPlan);
    setUserGymPlan(updatedPlan);
    InteractionManager.runAfterInteractions(() => {
      writeWellnessCache({ userGymPlan: updatedPlan }, false);
    });
    if (syncUnstartedDay && dayIndex >= 1 && dayIndex <= 7) {
      try {
        const weekDates = getCurrentWeekDatesFromMonday();
        const targetDateStr = weekDates[dayIndex - 1];
        const todayDateStr = formatLocalDateStr(new Date());
        const dates = updatedPlan.scheduleMode === 'rotation'
          ? [targetDateStr, todayDateStr].filter(Boolean)
          : [targetDateStr].filter(Boolean);
        if (dates.length > 0) {
          purgeUnstartedDraftsForDates(dates, user?.uid || 'local_user', setGymLogs, gymLogsRef);
        }
      } catch (e) {
        console.warn('[Wellness] Error clearing draft for updated plan day:', e);
      }
    }
    if (user) {
      const docRef = doc(db, COLLECTION.USER_GYM_PLANS, user.uid);
      const payload = { userId: user.uid, customDays: newCustomDays, updatedAt: now };
      await safeWrite(
        () => setDoc(docRef, payload, { merge: true }),
        COLLECTION.USER_GYM_PLANS,
        'set',
        payload,
        user.uid
      );
    }
  }, [user?.uid]);

  const setScheduleMode = useCallback(async (mode: 'calendar' | 'rotation') => {
    const userId = user?.uid || 'local_user';
    const currentPlan = userGymPlanRef.current;
    const now = getMonotonicTimestamp(currentPlan?.updatedAt || 0);
    const updatedPlan: UserGymPlanDoc = {
      ...(currentPlan || { userId, customDays: {} }),
      id: userId,
      userId,
      scheduleMode: mode,
      updatedAt: now,
    };
    userGymPlanRef.current = updatedPlan;
    updateL1Cache('userGymPlan', updatedPlan);
    setUserGymPlan(updatedPlan);
    InteractionManager.runAfterInteractions(() => {
      writeWellnessCache({ userGymPlan: updatedPlan }, false);
    });
    if (user) {
      const docRef = doc(db, COLLECTION.USER_GYM_PLANS, user.uid);
      const payload = { userId: user.uid, scheduleMode: mode, updatedAt: now };
      await safeWrite(
        () => setDoc(docRef, payload, { merge: true }),
        COLLECTION.USER_GYM_PLANS,
        'set',
        payload,
        user.uid
      );
    }
  }, [user?.uid]);

  const setActiveProgramme = useCallback(async (programme: UserGymProgramme | null) => {
    const userId = user?.uid || 'local_user';
    const currentPlan = userGymPlanRef.current;
    const now = getMonotonicTimestamp(currentPlan?.updatedAt || 0);
    const updatedPlan: UserGymPlanDoc = {
      ...(currentPlan || { userId, customDays: {} }),
      id: userId,
      userId,
      activeProgramme: programme,
      updatedAt: now,
    };
    userGymPlanRef.current = updatedPlan;
    updateL1Cache('userGymPlan', updatedPlan);
    setUserGymPlan(updatedPlan);
    InteractionManager.runAfterInteractions(() => {
      writeWellnessCache({ userGymPlan: updatedPlan }, false);
    });
    if (user) {
      const docRef = doc(db, COLLECTION.USER_GYM_PLANS, user.uid);
      const payload = { userId: user.uid, activeProgramme: programme, updatedAt: now };
      await safeWrite(
        () => setDoc(docRef, payload, { merge: true }),
        COLLECTION.USER_GYM_PLANS,
        'set',
        payload,
        user.uid
      );
    }
  }, [user?.uid]);

  const updateFullMasterPlan = useCallback(async (
    newCustomDays: Record<number, GymPlanDay>,
    templateId?: string,
    splitName?: string,
    newRoutines?: Record<string, GymRoutine>
  ) => {
    clearPlanDayCache();
    const userId = user?.uid || 'local_user';
    const currentPlan = userGymPlanRef.current;
    const canonicalCustomDays: Record<number, GymPlanDay> = {};
    for (const [k, d] of Object.entries(newCustomDays)) {
      canonicalCustomDays[Number(k)] = canonicalizeGymPlanDay(d);
    }
    const now = getMonotonicTimestamp(currentPlan?.updatedAt || 0);
    const updatedPlan: UserGymPlanDoc = {
      ...(currentPlan || { userId }),
      id: userId,
      userId,
      schemaVersion: 2,
      templateId: templateId !== undefined ? templateId : (currentPlan?.templateId || 'ppl'),
      name: splitName !== undefined ? splitName : (currentPlan as any)?.name,
      schedulePattern: currentPlan?.schedulePattern,
      routines: newRoutines || currentPlan?.routines || {},
      customDays: canonicalCustomDays,
      updatedAt: now,
    };
    userGymPlanRef.current = updatedPlan;
    updateL1Cache('userGymPlan', updatedPlan);
    setUserGymPlan(updatedPlan);
    InteractionManager.runAfterInteractions(() => {
      writeWellnessCache({ userGymPlan: updatedPlan }, false);
    });

    // Clear unstarted active drafts across the week so the new split applies instantly
    try {
      const weekDates = getCurrentWeekDatesFromMonday();
      purgeUnstartedDraftsForDates(weekDates, user?.uid, setGymLogs, gymLogsRef);
    } catch (e) {
      console.warn('[Wellness] Error clearing unstarted week logs on plan update:', e);
    }

    if (user) {
      const docRef = doc(db, COLLECTION.USER_GYM_PLANS, user.uid);
      const payload: any = {
        userId: user.uid,
        customDays: canonicalCustomDays,
        updatedAt: now,
      };
      if (templateId !== undefined) payload.templateId = templateId;
      if (splitName !== undefined) payload.name = splitName;
      if (newRoutines) payload.routines = newRoutines;

      await safeWrite(
        () => setDoc(docRef, payload, { merge: true }),
        COLLECTION.USER_GYM_PLANS,
        'set',
        payload,
        user.uid
      );
    }
  }, [user?.uid]);

  const applyMasterTemplate = useCallback(async (
    templateId: 'arnold' | 'ppl',
    schedulePattern: 'mon_sun' | 'tue_mon' | 'wed_sun' | 'mon_fri' = 'mon_sun'
  ) => {
    const effectiveUid = user?.uid || 'local_user';
    const currentPlan = userGymPlanRef.current;
    const selectedPlan = templateId === 'ppl' ? GYM_PLAN_PPL : GYM_PLAN_ARNOLD;

    const workoutDays = selectedPlan.filter(d => !d.isRest);
    const restDayTemplate: GymPlanDay = {
      dayIndex: 7,
      name: 'Rest & Recovery',
      subtitle: 'Active recovery, hydration & sleep',
      focus: 'Active recovery, hydration & sleep',
      isRest: true,
      exercises: [],
    };
    const newCustomDays: Record<number, GymPlanDay> = {};
    if (schedulePattern === 'mon_sun') {
      workoutDays.forEach((d, idx) => {
        if (idx + 1 <= 6) {
          newCustomDays[idx + 1] = { ...d, dayIndex: idx + 1, isRest: false };
        }
      });
      newCustomDays[7] = { ...restDayTemplate, dayIndex: 7, isRest: true, exercises: [] };
    } else if (schedulePattern === 'tue_mon') {
      newCustomDays[1] = { ...restDayTemplate, dayIndex: 1, isRest: true, exercises: [] };
      workoutDays.forEach((d, idx) => {
        if (idx + 2 <= 7) {
          newCustomDays[idx + 2] = { ...d, dayIndex: idx + 2, isRest: false };
        }
      });
    } else if (schedulePattern === 'wed_sun') {
      newCustomDays[1] = { ...workoutDays[0], dayIndex: 1, isRest: false };
      newCustomDays[2] = { ...workoutDays[1], dayIndex: 2, isRest: false };
      newCustomDays[3] = { ...restDayTemplate, dayIndex: 3, isRest: true, exercises: [] };
      newCustomDays[4] = { ...workoutDays[2], dayIndex: 4, isRest: false };
      newCustomDays[5] = { ...workoutDays[3], dayIndex: 5, isRest: false };
      newCustomDays[6] = { ...workoutDays[4], dayIndex: 6, isRest: false };
      // Issue #58: In 6-day splits (PPL/Arnold), preserve workoutDays[5] on day 7 instead of dropping it
      if (workoutDays[5]) {
        newCustomDays[7] = { ...workoutDays[5], dayIndex: 7, isRest: false };
      } else {
        newCustomDays[7] = { ...restDayTemplate, dayIndex: 7, isRest: true, exercises: [] };
      }
    } else if (schedulePattern === 'mon_fri') {
      workoutDays.forEach((d, idx) => {
        if (idx < 5) {
          newCustomDays[idx + 1] = { ...d, dayIndex: idx + 1, isRest: false };
        } else if (idx === 5) {
          // Keep day 6 on Saturday rather than silently deleting it
          newCustomDays[6] = { ...d, dayIndex: 6, isRest: false };
        }
      });
      if (!newCustomDays[6]) {
        newCustomDays[6] = { ...restDayTemplate, dayIndex: 6, isRest: true, exercises: [] };
      }
      newCustomDays[7] = { ...restDayTemplate, dayIndex: 7, isRest: true, exercises: [] };
    }

    const now = getMonotonicTimestamp(currentPlan?.updatedAt || 0);
    const updatedPlan: UserGymPlanDoc = {
      ...(currentPlan || { userId: effectiveUid }),
      id: effectiveUid,
      userId: effectiveUid,
      schemaVersion: 2,
      templateId,
      schedulePattern,
      routines: currentPlan?.routines || {},
      customDays: newCustomDays,
      updatedAt: now,
    };
    userGymPlanRef.current = updatedPlan;
    setUserGymPlan(updatedPlan);
    writeWellnessCache({ userGymPlan: updatedPlan }, true);

    if (user?.uid) {
      const docRef = doc(db, COLLECTION.USER_GYM_PLANS, user.uid);
      const planPayload = { userId: user.uid, templateId, schedulePattern, customDays: newCustomDays, updatedAt: now };
      await safeWrite(
        () => setDoc(docRef, planPayload, { merge: true }),
        COLLECTION.USER_GYM_PLANS,
        'set',
        planPayload,
        user.uid
      );
    }

    try {
      const weekDates = getCurrentWeekDatesFromMonday();
      purgeUnstartedDraftsForDates(weekDates, user?.uid, setGymLogs, gymLogsRef);
    } catch (e) {
      console.warn('[Wellness] Error clearing unstarted week logs on template apply:', e);
    }
    return newCustomDays;
  }, [user?.uid]);

  const saveCustomRoutine = useCallback(async (routine: GymRoutine, assignedDayIndex?: number | null) => {
    clearPlanDayCache();
    const currentPlan = userGymPlanRef.current;
    const canonical = canonicalizeGymRoutine(routine);
    const existingRoutines = { ...(currentPlan?.routines || {}) };
    existingRoutines[canonical.id] = canonical;

    // Synchronize customDays if any day links to this routineId
    const existingCustomDays = { ...(currentPlan?.customDays || {}) };
    let daysUpdated = false;
    const touchedDayIndices = new Set<number>();
    for (const [dayKey, day] of Object.entries(existingCustomDays)) {
      if (day && day.routineId === canonical.id) {
        const dNum = Number(dayKey);
        existingCustomDays[dNum] = {
          ...day,
          name: canonical.name,
          subtitle: canonical.subtitle,
          focus: canonical.focus || canonical.subtitle || day.focus,
          exercises: canonical.exercises,
          cardio: canonical.cardio || [],
          isRest: false,
        };
        touchedDayIndices.add(dNum);
        daysUpdated = true;
      }
    }

    // Schedule to target day if specified (1 = Mon ... 7 = Sun)
    if (assignedDayIndex != null && assignedDayIndex >= 1 && assignedDayIndex <= 7) {
      const existingDay = existingCustomDays[assignedDayIndex];
      existingCustomDays[assignedDayIndex] = {
        ...(existingDay || { dayIndex: assignedDayIndex }),
        dayIndex: assignedDayIndex,
        routineId: canonical.id,
        name: canonical.name,
        subtitle: canonical.subtitle,
        focus: canonical.focus || canonical.subtitle || 'Strength & Hypertrophy',
        exercises: canonical.exercises,
        cardio: canonical.cardio || [],
        isRest: false,
      };
      touchedDayIndices.add(assignedDayIndex);
      daysUpdated = true;
    }

    const now = getMonotonicTimestamp(currentPlan?.updatedAt || 0);
    const effectiveUid = user?.uid || currentPlan?.userId || 'local_user';
    const updatedPlan: UserGymPlanDoc = {
      ...(currentPlan || { userId: effectiveUid, customDays: {} }),
      id: effectiveUid,
      userId: effectiveUid,
      schemaVersion: 2,
      templateId: currentPlan?.templateId,
      schedulePattern: currentPlan?.schedulePattern,
      routines: existingRoutines,
      customDays: existingCustomDays,
      updatedAt: now,
    };

    userGymPlanRef.current = updatedPlan;
    updateL1Cache('userGymPlan', updatedPlan);
    setUserGymPlan(updatedPlan);
    InteractionManager.runAfterInteractions(() => {
      writeWellnessCache({ userGymPlan: updatedPlan }, false);
    });

    // Clear any unstarted active draft or log for modified days so they immediately display the updated routine
    if (touchedDayIndices.size > 0) {
      try {
        const weekDates = getCurrentWeekDatesFromMonday();
        const datesToPurge = Array.from(touchedDayIndices)
          .filter(dIdx => dIdx >= 1 && dIdx <= 7)
          .map(dIdx => weekDates[dIdx - 1])
          .filter(Boolean);
        if (datesToPurge.length > 0) {
          purgeUnstartedDraftsForDates(datesToPurge, effectiveUid, setGymLogs, gymLogsRef);
        }
      } catch (e) {
        console.warn('[Wellness] Error clearing draft for assigned day:', e);
      }
    }

    if (user?.uid) {
      const docRef = doc(db, COLLECTION.USER_GYM_PLANS, user.uid);
      const payload: any = {
        userId: user.uid,
        routines: existingRoutines,
        updatedAt: now,
      };
      if (daysUpdated) {
        payload.customDays = existingCustomDays;
      }

      await safeWrite(
        () => setDoc(docRef, payload, { merge: true }),
        COLLECTION.USER_GYM_PLANS,
        'set',
        payload,
        user.uid
      );
    }
  }, [user?.uid]);

  const deleteCustomRoutine = useCallback(async (routineId: string) => {
    const currentPlan = userGymPlanRef.current;
    const existingRoutines = { ...(currentPlan?.routines || {}) };
    delete existingRoutines[routineId];

    // Issue #118: Clear routineId reference cleanly by omitting the property
    const existingCustomDays = { ...(currentPlan?.customDays || {}) };
    let daysUpdated = false;
    for (const [dayKey, day] of Object.entries(existingCustomDays)) {
      if (day && day.routineId === routineId) {
        const { routineId: _omitted, ...cleanDay } = day;
        existingCustomDays[Number(dayKey)] = cleanDay;
        daysUpdated = true;
      }
    }

    const now = getMonotonicTimestamp(currentPlan?.updatedAt || 0);
    const effectiveUid = user?.uid || currentPlan?.userId || 'local_user';
    const updatedPlan: UserGymPlanDoc = {
      ...(currentPlan || { userId: effectiveUid, customDays: {} }),
      id: effectiveUid,
      userId: effectiveUid,
      schemaVersion: 2,
      templateId: currentPlan?.templateId,
      schedulePattern: currentPlan?.schedulePattern,
      routines: existingRoutines,
      customDays: existingCustomDays,
      updatedAt: now,
    };

    userGymPlanRef.current = updatedPlan;
    updateL1Cache('userGymPlan', updatedPlan);
    setUserGymPlan(updatedPlan);
    InteractionManager.runAfterInteractions(() => {
      writeWellnessCache({ userGymPlan: updatedPlan }, false);
    });

    if (user?.uid) {
      const docRef = doc(db, COLLECTION.USER_GYM_PLANS, user.uid);
      const updatePayload: Record<string, any> = {
        routines: existingRoutines,
        customDays: existingCustomDays,
        updatedAt: now,
      };

      await safeWrite(
        () => setDoc(docRef, { ...updatePayload, routines: { [routineId]: deleteField() } }, { merge: true }),
        COLLECTION.USER_GYM_PLANS,
        'set',
        { ...updatePayload, [`routines.${routineId}`]: { __zentrackDeleteField: true } },
        user.uid,
        true
      );
    }
  }, [user?.uid]);

  const assignRoutineToDay = useCallback(async (
    dayIndex: number,
    routineId?: string,
    routine?: GymRoutine
  ) => {
    const currentPlan = userGymPlanRef.current;
    const targetRoutine = routine || (routineId && currentPlan?.routines ? currentPlan.routines[routineId] : undefined);

    let updatedDay: GymPlanDay;
    const existingDay = currentPlan?.customDays?.[dayIndex];

    if (targetRoutine) {
      const canonical = canonicalizeGymRoutine(targetRoutine);
      updatedDay = {
        ...(existingDay || { dayIndex }),
        dayIndex,
        routineId: canonical.id,
        name: canonical.name,
        subtitle: canonical.subtitle,
        focus: canonical.focus || canonical.subtitle || 'Strength & Hypertrophy',
        exercises: canonical.exercises,
        cardio: canonical.cardio || [],
        isRest: false,
      };
    } else if (routineId === 'rest' || !routineId) {
      updatedDay = {
        ...(existingDay || { dayIndex }),
        dayIndex,
        routineId: undefined,
        name: 'Rest & Recovery',
        subtitle: 'Active recovery, hydration & sleep',
        focus: 'Active recovery, hydration & sleep',
        exercises: [],
        cardio: [],
        isRest: true,
      };
    } else {
      return;
    }

    const newCustomDays = { ...(currentPlan?.customDays || {}), [dayIndex]: updatedDay };
    const now = getMonotonicTimestamp(currentPlan?.updatedAt || 0);
    const effectiveUid = user?.uid || currentPlan?.userId || 'local_user';
    const updatedPlan: UserGymPlanDoc = {
      ...(currentPlan || { userId: effectiveUid, customDays: {} }),
      id: effectiveUid,
      userId: effectiveUid,
      routines: currentPlan?.routines || {},
      customDays: newCustomDays,
      updatedAt: now,
    };

    userGymPlanRef.current = updatedPlan;
    updateL1Cache('userGymPlan', updatedPlan);
    setUserGymPlan(updatedPlan);
    InteractionManager.runAfterInteractions(() => {
      writeWellnessCache({ userGymPlan: updatedPlan }, false);
    });

    // Clear any unstarted active draft or log for the assigned day so it immediately displays the updated routine
    if (dayIndex >= 1 && dayIndex <= 7) {
      try {
        const weekDates = getCurrentWeekDatesFromMonday();
        const targetDateStr = weekDates[dayIndex - 1];
        const todayDateStr = formatLocalDateStr(new Date());
        const dates = updatedPlan.scheduleMode === 'rotation'
          ? [targetDateStr, todayDateStr].filter(Boolean)
          : [targetDateStr].filter(Boolean);
        if (dates.length > 0) {
          purgeUnstartedDraftsForDates(dates, effectiveUid, setGymLogs, gymLogsRef);
        }
      } catch (e) {
        console.warn('[Wellness] Error clearing draft for assigned day:', e);
      }
    }

    if (user?.uid) {
      const docRef = doc(db, COLLECTION.USER_GYM_PLANS, user.uid);
      const payload = { userId: user.uid, customDays: newCustomDays, updatedAt: now };
      await safeWrite(
        () => setDoc(docRef, payload, { merge: true }),
        COLLECTION.USER_GYM_PLANS,
        'set',
        payload,
        user.uid
      );
    }
  }, [user?.uid]);

  const saveRoutineFolders = useCallback(async (folders: GymRoutineFolder[]) => {
    const effectiveUid = user?.uid || 'local_user';
    const currentPlan = userGymPlanRef.current;
    const now = getMonotonicTimestamp(currentPlan?.updatedAt || 0);
    const updatedPlan: UserGymPlanDoc = {
      ...(currentPlan || { userId: effectiveUid, customDays: {} }),
      id: effectiveUid,
      userId: effectiveUid,
      routineFolders: folders,
      updatedAt: now,
    };

    userGymPlanRef.current = updatedPlan;
    updateL1Cache('userGymPlan', updatedPlan);
    setUserGymPlan(updatedPlan);
    InteractionManager.runAfterInteractions(() => {
      writeWellnessCache({ userGymPlan: updatedPlan }, false);
    });

    if (user?.uid) {
      const docRef = doc(db, COLLECTION.USER_GYM_PLANS, user.uid);
      const payload = { userId: user.uid, routineFolders: folders, updatedAt: now };
      await safeWrite(
        () => setDoc(docRef, payload, { merge: true }),
        COLLECTION.USER_GYM_PLANS,
        'set',
        payload,
        user.uid
      );
    }
  }, [user?.uid]);

  const debouncePersistGymLogs = useCallback((logsToPersist: GymLog[]) => {
    if (pendingGymLogsCacheTimerRef.current) {
      clearTimeout(pendingGymLogsCacheTimerRef.current);
    }
    pendingGymLogsCacheTimerRef.current = setTimeout(() => {
      pendingGymLogsCacheTimerRef.current = null;
      InteractionManager.runAfterInteractions(() => {
        writeWellnessCache({ gymLogs: logsToPersist }, false);
      });
    }, 500);
  }, []);

  const optimisticAddGymLog = useCallback((log: GymLog) => {
    const prev = gymLogsRef.current || [];
    const exists = prev.some(l => l.id === log.id || l.date === log.date);
    const next = exists ? prev.map(l => (l.id === log.id || l.date === log.date) ? log : l) : [log, ...prev];
    gymLogsRef.current = next;
    updateL1Cache('gymLogs', next);
    setGymLogs(next);

    // Tier-1 Upgrade #70 & Issue #168: Sharded hot-log write via setL1Sync (avoids SQLite churn)
    if (log.workoutStartTime && !log.completed && log.date) {
      setL1Sync(`@zenfit_hot_log_${log.date}`, log);
    }
    debouncePersistGymLogs(next);
  }, [debouncePersistGymLogs]);

  const optimisticUpdateGymLog = useCallback((logId: string, partial: Partial<GymLog>) => {
    const prev = gymLogsRef.current || [];
    let updatedLog: GymLog | null = null;
    const exists = prev.some(l => l.id === logId || (partial.date && l.date === partial.date));
    const clearUndefinedSessionFields = (target: Record<string, any>) => {
      if (('workoutStartTime' in partial && partial.workoutStartTime === undefined) || partial.completed) {
        delete target.workoutStartTime;
      }
      for (const k of [
        'workoutDurationMinutes',
        'workoutDurationSeconds',
        'startTime',
        'endTime',
        'restTimerStartTime',
        'restTimerDurationSecs',
        'restTimerExerciseName',
        'revertedAt',
      ] as const) {
        if (k in partial && (partial as any)[k] === undefined) {
          delete target[k];
        }
      }
    };
    let next: GymLog[];
    if (exists) {
      next = prev.map(l => {
        if (l.id === logId || (partial.date && l.date === partial.date)) {
          const merged: GymLog = { ...l, ...partial };
          clearUndefinedSessionFields(merged as any);
          updatedLog = merged;
          return merged;
        }
        return l;
      });
    } else {
      const newLog: GymLog = { id: logId, ...partial } as GymLog;
      clearUndefinedSessionFields(newLog as any);
      updatedLog = newLog;
      next = [newLog, ...prev];
    }
    gymLogsRef.current = next;
    updateL1Cache('gymLogs', next);
    setGymLogs(next);

    // Tier-1 Upgrade #70 & Issue #168: If active workout, update sharded hot key via setL1Sync; on completion or revert, deleteL1Sync
    if (updatedLog) {
      const activeLog: GymLog = updatedLog;
      if ((activeLog.completed || !activeLog.workoutStartTime) && activeLog.date) {
        deleteL1Sync(`@zenfit_hot_log_${activeLog.date}`);
      } else if (activeLog.workoutStartTime && activeLog.date) {
        setL1Sync(`@zenfit_hot_log_${activeLog.date}`, activeLog);
      }
    }
    debouncePersistGymLogs(next);
  }, [debouncePersistGymLogs]);

  const weightLogsRef = useRef<WeightLog[]>(weightLogs);
  useEffect(() => {
    weightLogsRef.current = weightLogs;
  }, [weightLogs]);

  const optimisticUpdateWeightLogs = useCallback((nextLogs: WeightLog[]) => {
    weightLogsRef.current = nextLogs;
    updateL1Cache('weightLogs', nextLogs);
    setWeightLogs(nextLogs);
    writeWellnessCache({ weightLogs: nextLogs }, true);
  }, []);

  const gymLogsReady = gymLogsSnapshotFired || hasCachedDataRef.current;

  // ── 0ms Legacy-Speed: Background Idle Analytical Pre-computation ─────────────
  // Deferred strictly off the critical startup path via runAfterInteractions
  useEffect(() => {
    const hasActiveWorkout =
      _isWorkoutActiveGlobal ||
      (Array.isArray(gymLogs) && gymLogs.some((l) => Boolean(l && !l.completed && l.workoutStartTime)));
    if (hasActiveWorkout || !gymLogs?.length) return;
    const handle = InteractionManager.runAfterInteractions(() => {
      try {
        precomputeGymAnalytics(gymLogs, userGymPlan);
      } catch (_) {}
    });
    return () => handle.cancel();
  }, [gymLogs, userGymPlan]);

  // ── Partitioned gymLogs: O(1) Date Map and Hot Window (Last 126 Days) ────────
  // Issue #60 & #170: Merges duplicate date sessions via mergeGymLogMonotonic and exposes deduplicated array
  const { recentGymLogs, logsByDateMap, deduplicatedGymLogs } = useMemo(() => {
    const map = new Map<string, GymLog>();
    const cutoff = offsetDateStr(formatLocalDateStr(new Date()), -126);
    const recent: GymLog[] = [];
    for (const log of gymLogs || []) {
      if (log && log.date) {
        const existing = map.get(log.date);
        if (existing) {
          const merged = mergeGymLogMonotonic(existing as any, log as any) as GymLog;
          map.set(log.date, merged);
        } else {
          map.set(log.date, log);
        }
      }
    }
    for (const [dStr, entry] of map.entries()) {
      if (dStr >= cutoff) {
        recent.push(entry);
      }
    }
    recent.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const allDeduped = Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return { recentGymLogs: recent, logsByDateMap: map, deduplicatedGymLogs: allDeduped };
  }, [gymLogs]);

  // ── Decoupled Atomic Domain Values (Prevents cross-domain render thrashing) ──
  const gymLogsValue = useMemo<GymLogsContextType>(() => ({
    gymLogs: deduplicatedGymLogs,
    recentGymLogs,
    logsByDateMap,
    gymLogsReady,
    ensureSubscribed,
    optimisticAddGymLog,
    optimisticUpdateGymLog,
  }), [deduplicatedGymLogs, recentGymLogs, logsByDateMap, gymLogsReady, ensureSubscribed, optimisticAddGymLog, optimisticUpdateGymLog]);

  const gymPlanValue = useMemo<GymPlanContextType>(() => ({
    userGymPlan,
    updateMasterPlan,
    updateFullMasterPlan,
    applyMasterTemplate,
    saveCustomRoutine,
    deleteCustomRoutine,
    assignRoutineToDay,
    saveRoutineFolders,
    setScheduleMode,
    setActiveProgramme,
  }), [
    userGymPlan,
    updateMasterPlan,
    updateFullMasterPlan,
    applyMasterTemplate,
    saveCustomRoutine,
    deleteCustomRoutine,
    assignRoutineToDay,
    saveRoutineFolders,
    setScheduleMode,
    setActiveProgramme,
  ]);

  const bodyMetricsValue = useMemo<BodyMetricsContextType>(() => ({
    weightLogs,
    optimisticUpdateWeightLogs,
  }), [weightLogs, optimisticUpdateWeightLogs]);

  return (
    <GymLogsContext.Provider value={gymLogsValue}>
      <GymPlanContext.Provider value={gymPlanValue}>
        <BodyMetricsContext.Provider value={bodyMetricsValue}>
          {children}
        </BodyMetricsContext.Provider>
      </GymPlanContext.Provider>
    </GymLogsContext.Provider>
  );
}
