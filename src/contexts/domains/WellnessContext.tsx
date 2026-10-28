/**
 * WellnessContext — ZenTrack Mobile
 *
 * Owns: gymLogs, userGymPlan, updateMasterPlan.
 *
 * Subscription strategy: DEMAND-BASED + OFFLINE-FIRST.
 * On mount: reads gymLogs/waterLogs/sleepLogs/weightLogs/userGymPlan from
 * AsyncStorage instantly (~5ms). Gym screens show real data immediately,
 * even when offline. Firestore snapshots silently update the cache when online.
 */
import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from "react";
import { collection, query, where, onSnapshot, doc, setDoc, limit } from "firebase/firestore";
import { InteractionManager, DeviceEventEmitter, unstable_batchedUpdates, AppState } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, auth } from "../../services/firebase";
import { COLLECTION } from "../../config/constants";
import { UserGymPlanDoc, GymPlanDay, GymRoutine, GymRoutineFolder } from "../../types/gym.types";
import type { GymLog, WaterLog, SleepLog, WeightLog } from "../MobileDataContext";
import { GYM_PLAN_ARNOLD, GYM_PLAN_PPL } from "../../data/gymPlan";
import { writeWellnessCache, readWellnessCache } from "../../utils/domainCache";
import { loadBootManifest, getBootManifestSync, updateL1Cache, setL1Sync } from "../../utils/bootManifest";
import { parseGymLog, areItemsEqual } from "../../utils/schemaGuards";
import { mergeGymLogMonotonic, getCanonicalExerciseName, resolveExerciseTargetMuscle } from "../../utils/gymUtils";
import { formatLocalDateStr, offsetDateStr } from "../../utils/dateUtils";
import { clearScheduleCache, scheduleGymNotifications, checkAndTriggerWaterMilestones } from "../../services/notifications";
import { applyPendingQueueOverlay } from "../../services/offlineSync";
import { safeWrite } from "../../utils/safeWrite";
import { precomputeGymAnalytics } from "../../services/gymAnalyticsPrecompute";

function canonicalizeGymPlanDay(day: GymPlanDay): GymPlanDay {
  if (!day || !Array.isArray(day.exercises)) return day;
  return {
    ...day,
    exercises: day.exercises.map(ex => {
      const canonicalName = getCanonicalExerciseName(ex.name);
      return {
        ...ex,
        name: canonicalName,
        muscle: resolveExerciseTargetMuscle(canonicalName, ex.muscle).targetMuscle,
      };
    }),
  };
}

export function canonicalizeGymRoutine(routine: GymRoutine): GymRoutine {
  if (!routine || !Array.isArray(routine.exercises)) return routine;
  return {
    ...routine,
    exercises: routine.exercises.map(ex => {
      const canonicalName = getCanonicalExerciseName(ex.name);
      return {
        ...ex,
        name: canonicalName,
        muscle: resolveExerciseTargetMuscle(canonicalName, ex.muscle).targetMuscle,
      };
    }),
  };
}

function canonicalizeUserGymPlan(plan: UserGymPlanDoc | null): UserGymPlanDoc | null {
  if (!plan) return null;
  const newCustomDays: Record<string, any> = {};
  if (plan.customDays && typeof plan.customDays === 'object') {
    for (const [key, day] of Object.entries(plan.customDays)) {
      newCustomDays[key] = canonicalizeGymPlanDay(day as GymPlanDay);
    }
  }

  let canonicalRoutines: Record<string, GymRoutine> = {};
  if (plan.routines && typeof plan.routines === 'object') {
    for (const [id, rt] of Object.entries(plan.routines)) {
      canonicalRoutines[id] = canonicalizeGymRoutine(rt);
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
  updateMasterPlan: (dayIndex: number, planDay: GymPlanDay) => Promise<void>;
  updateFullMasterPlan: (newCustomDays: Record<number, GymPlanDay>) => Promise<void>;
  applyMasterTemplate: (templateId: 'arnold' | 'ppl', schedulePattern?: 'mon_sun' | 'tue_mon' | 'wed_sun' | 'mon_fri') => Promise<Record<number, GymPlanDay> | undefined>;
  saveCustomRoutine: (routine: GymRoutine, assignedDayIndex?: number | null) => Promise<void>;
  deleteCustomRoutine: (routineId: string) => Promise<void>;
  assignRoutineToDay: (dayIndex: number, routineId?: string, routine?: GymRoutine) => Promise<void>;
  saveRoutineFolders: (folders: GymRoutineFolder[]) => Promise<void>;
}

export interface BodyMetricsContextType {
  waterLogs: WaterLog[];
  sleepLogs: SleepLog[];
  weightLogs: WeightLog[];
  optimisticAddWaterLog: (log: WaterLog) => void;
  optimisticDeleteWaterLog: (logId: string) => void;
  logWater: (amountMl: number, explicitUserId?: string) => Promise<void>;
}

// ─── Unified Context Shape (Backward Compatible) ──────────────────────────────
export interface WellnessContextType extends GymLogsContextType, GymPlanContextType, BodyMetricsContextType {}

const DEFAULT_WELLNESS_DATA: WellnessContextType = {
  gymLogs: [],
  recentGymLogs: [],
  logsByDateMap: new Map(),
  gymLogsReady: false,
  waterLogs: [],
  sleepLogs: [],
  weightLogs: [],
  userGymPlan: null,
  updateMasterPlan: async () => {},
  updateFullMasterPlan: async () => {},
  applyMasterTemplate: async () => undefined,
  saveCustomRoutine: async () => {},
  deleteCustomRoutine: async () => {},
  assignRoutineToDay: async () => {},
  saveRoutineFolders: async () => {},
  ensureSubscribed: () => {},
  optimisticAddGymLog: () => {},
  optimisticUpdateGymLog: () => {},
  optimisticAddWaterLog: () => {},
  optimisticDeleteWaterLog: () => {},
  logWater: async () => {},
};

const WellnessContext = createContext<WellnessContextType | null>(null);
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
    };
  }
  return ctx;
}

export function useBodyMetrics(): BodyMetricsContextType {
  const ctx = useContext(BodyMetricsContext);
  if (!ctx) {
    return {
      waterLogs: DEFAULT_WELLNESS_DATA.waterLogs,
      sleepLogs: DEFAULT_WELLNESS_DATA.sleepLogs,
      weightLogs: DEFAULT_WELLNESS_DATA.weightLogs,
      optimisticAddWaterLog: DEFAULT_WELLNESS_DATA.optimisticAddWaterLog,
      optimisticDeleteWaterLog: DEFAULT_WELLNESS_DATA.optimisticDeleteWaterLog,
      logWater: DEFAULT_WELLNESS_DATA.logWater,
    };
  }
  return ctx;
}

export function useWellnessData(): WellnessContextType {
  const ctx = useContext(WellnessContext);
  if (!ctx) {
    return DEFAULT_WELLNESS_DATA;
  }
  return ctx;
}

let _isWorkoutActiveGlobal = false;
export function setWorkoutActiveGlobal(active: boolean) {
  _isWorkoutActiveGlobal = active;
}
export function getWorkoutActiveGlobal(): boolean {
  return _isWorkoutActiveGlobal;
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
  const [userGymPlan, setUserGymPlan]   = useState<UserGymPlanDoc | null>(() => canonicalizeUserGymPlan(initialManifest?.userGymPlan ?? null));
  const [waterLogs, setWaterLogs]       = useState<WaterLog[]>(initialManifest?.waterLogs ?? []);
  const [sleepLogs, setSleepLogs]       = useState<SleepLog[]>(initialManifest?.sleepLogs ?? []);
  const [weightLogs, setWeightLogs]     = useState<WeightLog[]>(initialManifest?.weightLogs ?? []);
  const subscribedRef = useRef(false);
  const unsubsRef     = useRef<(() => void)[]>([]);
  // OFFLINE-FIRST GUARD: tracks whether any cached data has been seeded.
  const hasCachedDataRef = useRef(
    (initialManifest?.gymLogs?.length ?? 0) > 0 ||
    !!initialManifest?.userGymPlan ||
    (initialManifest?.waterLogs?.length ?? 0) > 0
  );

  // ── Listener auto-restart on error ───────────────────────────────────────
  const [subscriptionVersion, setSubscriptionVersion] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleListenerRestart = useCallback((context: string) => (err: Error) => {
    const isBuilding = err.message.includes('currently building');
    if (isBuilding) {
      console.info(`[Wellness] ${context} index is currently building in Cloud Firestore. Auto-retrying in 15s...`);
    } else {
      console.warn(`[Wellness] ${context} listener error — restarting in 5s`, err.message);
    }
    if (retryTimerRef.current) return;
    const delay = isBuilding ? 15000 : 5000;
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      subscribedRef.current = false;
      unsubsRef.current.forEach(u => u());
      unsubsRef.current = [];
      setSubscriptionVersion(v => v + 1);
    }, delay);
  }, []);

  // ── Foreground reconnect: restart listeners after long background ─────────
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('firestore_force_reconnect', () => {
      if (user) {
        console.log('[Wellness] foreground reconnect — restarting Firestore listeners');
        unsubsRef.current.forEach(u => u());
        unsubsRef.current = [];
        subscribedRef.current = false;
        setSubscriptionVersion(v => v + 1);
      }
    });
    return () => sub.remove();
  }, [user?.uid]);

  // ── Offline-first boot: seed from boot manifest L1 cache in parallel ───────
  useEffect(() => {
    let isCancelled = false;
    loadBootManifest().then(manifest => {
      if (isCancelled || !manifest) return;
      unstable_batchedUpdates(() => {
        let seeded = false;
        if ((manifest.gymLogs?.length ?? 0) > 0) {
          setGymLogs(prev => prev.length === 0 ? manifest.gymLogs : prev);
          seeded = true;
        }
        if (manifest.userGymPlan) {
          const canonical = canonicalizeUserGymPlan(manifest.userGymPlan);
          setUserGymPlan(prev => !prev ? canonical : prev);
          seeded = true;
        }
        if ((manifest.waterLogs?.length ?? 0) > 0) {
          setWaterLogs(prev => prev.length === 0 ? manifest.waterLogs : prev);
          seeded = true;
        }
        if ((manifest.sleepLogs?.length ?? 0) > 0) {
          setSleepLogs(prev => prev.length === 0 ? manifest.sleepLogs : prev);
          seeded = true;
        }
        if ((manifest.weightLogs?.length ?? 0) > 0) {
          setWeightLogs(prev => prev.length === 0 ? manifest.weightLogs : prev);
          seeded = true;
        }
        if (seeded) hasCachedDataRef.current = true;
      });
    }).catch(() => {});
    return () => { isCancelled = true; };
  }, [user?.uid]);

  // Resynchronize when Android Widget mutates cache while backgrounded
  useEffect(() => {
    let lastWidgetMutationTs = 0;
    const widgetSub = DeviceEventEmitter.addListener('widget_cache_mutated', async (event: any) => {
      if (event?.domain === 'wellness' || !event?.domain) {
        const cache = await readWellnessCache();
        if (cache && cache.gymLogs && cache.gymLogs.length > 0) {
          setGymLogs(cache.gymLogs);
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
              setGymLogs(cache.gymLogs);
            }
          }
        } catch {}
      }
    });

    return () => {
      widgetSub.remove();
      appStateSub.remove();
    };
  }, []);

  const deferredInteractionRef = useRef<{ cancel: () => void } | null>(null);
  const pendingGymLogsCacheTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userGymPlanRef = useRef<UserGymPlanDoc | null>(userGymPlan);
  const gymLogsRef = useRef<GymLog[]>(gymLogs);
  useEffect(() => {
    userGymPlanRef.current = userGymPlan;
  }, [userGymPlan]);
  useEffect(() => {
    gymLogsRef.current = gymLogs;
  }, [gymLogs]);

  // Debounced notification scheduling: only triggers after 3s of idle or on app background transition
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    timeoutId = setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        scheduleGymNotifications({
          gymLogs: gymLogsRef.current || [],
          userGymPlan: userGymPlanRef.current,
        }).catch(() => {});
      });
    }, 3000);

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        if (pendingGymLogsCacheTimerRef.current) {
          clearTimeout(pendingGymLogsCacheTimerRef.current);
          pendingGymLogsCacheTimerRef.current = null;
          writeWellnessCache({ gymLogs: gymLogsRef.current || [] }, false);
        }
        if (timeoutId) clearTimeout(timeoutId);
        scheduleGymNotifications({
          gymLogs: gymLogsRef.current || [],
          userGymPlan: userGymPlanRef.current,
        }).catch(() => {});
      }
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (pendingGymLogsCacheTimerRef.current) {
        clearTimeout(pendingGymLogsCacheTimerRef.current);
      }
      sub.remove();
    };
  }, [userGymPlan, gymLogs.length]);

  const openSubscriptions = useCallback((uid: string) => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    // Compute High-Water Mark from cached gymLogs so we only read NEW or MODIFIED workouts from Firestore!
    const cachedLogs = gymLogsRef.current || [];
    const maxUpdatedAt = cachedLogs.reduce((max, log) => {
      const ts = typeof log.updatedAt === 'number' ? log.updatedAt : 0;
      return ts > max ? ts : max;
    }, 0);

    // Always subscribe by userId so missing Firestore composite indexes never crash the listener
    const gymQuery = query(collection(db, COLLECTION.GYM_LOGS), where("userId", "==", uid));

    unsubsRef.current.push(onSnapshot(
      gymQuery,
      snap => {
        if (snap.metadata.hasPendingWrites) return;
        if (snap.docs.length === 0 && snap.metadata.fromCache && hasCachedDataRef.current) return;
        if (_isWorkoutActiveGlobal) return;

        // Merge incoming delta docs over existing cached docs by ID/date
        const byId = new Map<string, GymLog>();
        for (const existing of gymLogsRef.current || []) {
          const key = existing.id || `${uid}_${existing.date}`;
          byId.set(key, existing);
        }

        snap.docChanges().forEach(change => {
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

        const merged = applyPendingQueueOverlay(COLLECTION.GYM_LOGS, Array.from(byId.values()));
        merged.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        if (areItemsEqual(gymLogsRef.current, merged)) return;

        unstable_batchedUpdates(() => {
          updateL1Cache('gymLogs', merged);
          setGymLogs(merged);
          setGymLogsSnapshotFired(true);
          InteractionManager.runAfterInteractions(() => writeWellnessCache({ gymLogs: merged }, false));
        });
      },
      scheduleListenerRestart("gymLogs")
    ));

    unsubsRef.current.push(onSnapshot(
      doc(db, COLLECTION.USER_GYM_PLANS, uid),
      docSnap => {
        if (!docSnap.exists() && (docSnap as any)?.metadata?.fromCache && hasCachedDataRef.current) return;
        unstable_batchedUpdates(() => {
          const rawPlan = docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as unknown as UserGymPlanDoc) : null;
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
      scheduleListenerRestart("userGymPlan")
    ));

    deferredInteractionRef.current?.cancel();
    deferredInteractionRef.current = InteractionManager.runAfterInteractions(() => {
      if (!subscribedRef.current) return;
      unsubsRef.current.push(onSnapshot(
        query(collection(db, 'weight_logs'), where("userId", "==", uid)),
        snap => {
          if (snap.metadata.hasPendingWrites) return;
          if (snap.docs.length === 0 && snap.metadata.fromCache && hasCachedDataRef.current) return;
          if (_isWorkoutActiveGlobal) return;
          unstable_batchedUpdates(() => {
            const fresh = applyPendingQueueOverlay('weight_logs', snap.docs.map(d => ({ id: d.id, ...d.data() } as WeightLog)));
            fresh.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            setWeightLogs(prev => areItemsEqual(prev, fresh) ? prev : fresh);
            InteractionManager.runAfterInteractions(() => writeWellnessCache({ weightLogs: fresh }));
          });
        },
        scheduleListenerRestart("weightLogs")
      ));
    });
  }, [scheduleListenerRestart]);

  const demandRequestedRef = useRef(false);
  const deferredSubTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let interactionHandle: { cancel: () => void } | null = null;
    if (user) {
      subscribedRef.current = false;
      // Defer Firestore subscription until Frame 0 paints from L1 cache & animations settle
      interactionHandle = InteractionManager.runAfterInteractions(() => {
        openSubscriptions(user.uid);
      });
    } else {
      deferredInteractionRef.current?.cancel();
      unsubsRef.current.forEach(u => u());
      unsubsRef.current = [];
      subscribedRef.current = false;
      demandRequestedRef.current = false;
      hasCachedDataRef.current = false;
      unstable_batchedUpdates(() => {
        setGymLogs([]);
        setUserGymPlan(null);
        setWaterLogs([]);
        setSleepLogs([]);
        setWeightLogs([]);
        setGymLogsSnapshotFired(false);
      });
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    }
    return () => {
      interactionHandle?.cancel();
      deferredInteractionRef.current?.cancel();
      unsubsRef.current.forEach(u => u());
      unsubsRef.current = [];
      subscribedRef.current = false;
    };
  }, [user?.uid, subscriptionVersion, openSubscriptions]);

  useEffect(() => () => {
    deferredInteractionRef.current?.cancel();
    unsubsRef.current.forEach(u => u());
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    if (deferredSubTimerRef.current) clearTimeout(deferredSubTimerRef.current);
  }, []);

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

  const updateMasterPlan = useCallback(async (dayIndex: number, planDay: GymPlanDay) => {
    const userId = user?.uid || 'local_user';
    const currentPlan = userGymPlanRef.current;
    const canonicalDay = canonicalizeGymPlanDay(planDay);
    const newCustomDays = { ...(currentPlan?.customDays || {}), [dayIndex]: canonicalDay };
    const now = Date.now();
    const updatedPlan: UserGymPlanDoc = {
      ...(currentPlan || { userId }),
      id: userId,
      userId,
      schemaVersion: 2,
      templateId: currentPlan?.templateId,
      schedulePattern: currentPlan?.schedulePattern,
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

  const updateFullMasterPlan = useCallback(async (newCustomDays: Record<number, GymPlanDay>) => {
    const userId = user?.uid || 'local_user';
    const currentPlan = userGymPlanRef.current;
    const canonicalCustomDays: Record<number, GymPlanDay> = {};
    for (const [k, d] of Object.entries(newCustomDays)) {
      canonicalCustomDays[Number(k)] = canonicalizeGymPlanDay(d);
    }
    const now = Date.now();
    const updatedPlan: UserGymPlanDoc = {
      ...(currentPlan || { userId }),
      id: userId,
      userId,
      schemaVersion: 2,
      templateId: currentPlan?.templateId,
      schedulePattern: currentPlan?.schedulePattern,
      routines: currentPlan?.routines || {},
      customDays: canonicalCustomDays,
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
      const payload = { userId: user.uid, customDays: canonicalCustomDays, updatedAt: now };
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
    if (!user) return;
    const currentPlan = userGymPlanRef.current;
    const docRef = doc(db, COLLECTION.USER_GYM_PLANS, user.uid);
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
        newCustomDays[idx + 1] = { ...d, dayIndex: idx + 1, isRest: false };
      });
      newCustomDays[7] = { ...restDayTemplate, dayIndex: 7, isRest: true, exercises: [] };
    } else if (schedulePattern === 'tue_mon') {
      newCustomDays[1] = { ...restDayTemplate, dayIndex: 1, isRest: true, exercises: [] };
      workoutDays.forEach((d, idx) => {
        newCustomDays[idx + 2] = { ...d, dayIndex: idx + 2, isRest: false };
      });
    } else if (schedulePattern === 'wed_sun') {
      newCustomDays[1] = { ...workoutDays[0], dayIndex: 1, isRest: false };
      newCustomDays[2] = { ...workoutDays[1], dayIndex: 2, isRest: false };
      newCustomDays[3] = { ...restDayTemplate, dayIndex: 3, isRest: true, exercises: [] };
      newCustomDays[4] = { ...workoutDays[2], dayIndex: 4, isRest: false };
      newCustomDays[5] = { ...workoutDays[3], dayIndex: 5, isRest: false };
      newCustomDays[6] = { ...workoutDays[4], dayIndex: 6, isRest: false };
      newCustomDays[7] = { ...restDayTemplate, dayIndex: 7, isRest: true, exercises: [] };
    } else if (schedulePattern === 'mon_fri') {
      workoutDays.slice(0, 5).forEach((d, idx) => {
        newCustomDays[idx + 1] = { ...d, dayIndex: idx + 1, isRest: false };
      });
      newCustomDays[6] = { ...restDayTemplate, dayIndex: 6, isRest: true, exercises: [] };
      newCustomDays[7] = { ...restDayTemplate, dayIndex: 7, isRest: true, exercises: [] };
    }

    const now = Date.now();
    const updatedPlan: UserGymPlanDoc = {
      ...(currentPlan || { userId: user.uid }),
      id: user.uid,
      userId: user.uid,
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
    const planPayload = { userId: user.uid, templateId, schedulePattern, customDays: newCustomDays, updatedAt: now };
    await safeWrite(
      () => setDoc(docRef, planPayload, { merge: true }),
      COLLECTION.USER_GYM_PLANS,
      'set',
      planPayload,
      user.uid
    );

    try {
      const todayObj = new Date();
      const currentDayOfWeek = todayObj.getDay();
      const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
      const monday = new Date(todayObj);
      monday.setDate(todayObj.getDate() + mondayOffset);
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekDates.push(formatLocalDateStr(d));
      }
      for (const dStr of weekDates) {
        if (user?.uid) {
          AsyncStorage.removeItem(`gym_active_draft_${user.uid}_${dStr}`).catch(() => {});
        }
      }
      setGymLogs(prev => {
        const next = prev.filter(l => {
          if (!weekDates.includes(l.date)) return true;
          const hasLoggedSets = (l.exercises || []).some((ex: any) =>
            (ex.setsLog || []).some((s: any) => s.completed || (s.weight != null && Number(s.weight) > 0) || (s.reps != null && Number(s.reps) > 0))
          );
          return l.completed || l.workoutStartTime || hasLoggedSets;
        });
        updateL1Cache('gymLogs', next);
        writeWellnessCache({ gymLogs: next }, true);
        return next;
      });
    } catch (e) {
      console.warn('[Wellness] Error clearing unstarted week logs on template apply:', e);
    }
    return newCustomDays;
  }, [user?.uid]);

  const saveCustomRoutine = useCallback(async (routine: GymRoutine, assignedDayIndex?: number | null) => {
    const currentPlan = userGymPlanRef.current;
    const canonical = canonicalizeGymRoutine(routine);
    const existingRoutines = { ...(currentPlan?.routines || {}) };
    existingRoutines[canonical.id] = canonical;

    // Synchronize customDays if any day links to this routineId
    const existingCustomDays = { ...(currentPlan?.customDays || {}) };
    let daysUpdated = false;
    for (const [dayKey, day] of Object.entries(existingCustomDays)) {
      if (day && day.routineId === canonical.id) {
        existingCustomDays[Number(dayKey)] = {
          ...day,
          name: canonical.name,
          subtitle: canonical.subtitle,
          focus: canonical.focus || canonical.subtitle || day.focus,
          exercises: canonical.exercises,
          isRest: false,
        };
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
        isRest: false,
      };
      daysUpdated = true;
    }

    const now = Date.now();
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

    // Clear any unstarted active draft or log for the assigned day so it immediately displays the updated routine
    if (assignedDayIndex != null && assignedDayIndex >= 1 && assignedDayIndex <= 7) {
      try {
        const todayObj = new Date();
        const currentDayOfWeek = todayObj.getDay();
        const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
        const monday = new Date(todayObj);
        monday.setDate(todayObj.getDate() + mondayOffset);
        const targetDate = new Date(monday);
        targetDate.setDate(monday.getDate() + (assignedDayIndex - 1));
        const targetDateStr = formatLocalDateStr(targetDate);

        if (effectiveUid) {
          AsyncStorage.removeItem(`gym_active_draft_${effectiveUid}_${targetDateStr}`).catch(() => {});
        }
        setGymLogs(prev => {
          const next = prev.filter(l => {
            if (l.date !== targetDateStr) return true;
            const hasLoggedSets = (l.exercises || []).some((ex: any) =>
              (ex.setsLog || []).some((s: any) => s.completed || (s.weight != null && Number(s.weight) > 0) || (s.reps != null && Number(s.reps) > 0))
            );
            return l.completed || l.workoutStartTime || hasLoggedSets;
          });
          updateL1Cache('gymLogs', next);
          writeWellnessCache({ gymLogs: next }, true);
          return next;
        });
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

    // Clear routineId reference from any customDays
    const existingCustomDays = { ...(currentPlan?.customDays || {}) };
    let daysUpdated = false;
    for (const [dayKey, day] of Object.entries(existingCustomDays)) {
      if (day && day.routineId === routineId) {
        existingCustomDays[Number(dayKey)] = {
          ...day,
          routineId: undefined,
        };
        daysUpdated = true;
      }
    }

    const now = Date.now();
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
        isRest: true,
      };
    } else {
      return;
    }

    const newCustomDays = { ...(currentPlan?.customDays || {}), [dayIndex]: updatedDay };
    const now = Date.now();
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
    try {
      const todayObj = new Date();
      const currentDayOfWeek = todayObj.getDay();
      const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
      const monday = new Date(todayObj);
      monday.setDate(todayObj.getDate() + mondayOffset);
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + (dayIndex - 1));
      const targetDateStr = formatLocalDateStr(targetDate);

      if (effectiveUid) {
        AsyncStorage.removeItem(`gym_active_draft_${effectiveUid}_${targetDateStr}`).catch(() => {});
      }
      setGymLogs(prev => {
        const next = prev.filter(l => {
          if (l.date !== targetDateStr) return true;
          const hasLoggedSets = (l.exercises || []).some((ex: any) =>
            (ex.setsLog || []).some((s: any) => s.completed || (s.weight != null && Number(s.weight) > 0) || (s.reps != null && Number(s.reps) > 0))
          );
          return l.completed || l.workoutStartTime || hasLoggedSets;
        });
        updateL1Cache('gymLogs', next);
        writeWellnessCache({ gymLogs: next }, true);
        return next;
      });
    } catch (e) {
      console.warn('[Wellness] Error clearing draft for assigned day:', e);
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
    if (!user) return;
    const currentPlan = userGymPlanRef.current;
    const docRef = doc(db, COLLECTION.USER_GYM_PLANS, user.uid);
    const now = Date.now();
    const updatedPlan: UserGymPlanDoc = {
      ...(currentPlan || { userId: user.uid, customDays: {} }),
      id: user.uid,
      userId: user.uid,
      routineFolders: folders,
      updatedAt: now,
    };

    userGymPlanRef.current = updatedPlan;
    updateL1Cache('userGymPlan', updatedPlan);
    setUserGymPlan(updatedPlan);
    InteractionManager.runAfterInteractions(() => {
      writeWellnessCache({ userGymPlan: updatedPlan }, false);
    });

    const payload = { userId: user.uid, routineFolders: folders, updatedAt: now };
    await safeWrite(
      () => setDoc(docRef, payload, { merge: true }),
      COLLECTION.USER_GYM_PLANS,
      'set',
      payload,
      user.uid
    );
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
    queueMicrotask(() => {
      setGymLogs(next);
    });
    debouncePersistGymLogs(next);
  }, [debouncePersistGymLogs]);

  const optimisticUpdateGymLog = useCallback((logId: string, partial: Partial<GymLog>) => {
    const prev = gymLogsRef.current || [];
    const next = prev.map(l => {
      if (l.id === logId || (partial.date && l.date === partial.date)) {
        const merged: GymLog = { ...l, ...partial };
        if (('workoutStartTime' in partial && partial.workoutStartTime === undefined) || partial.completed) {
          delete (merged as any).workoutStartTime;
        }
        return merged;
      }
      return l;
    });
    gymLogsRef.current = next;
    updateL1Cache('gymLogs', next);
    queueMicrotask(() => {
      setGymLogs(next);
    });
    debouncePersistGymLogs(next);
  }, [debouncePersistGymLogs]);

  const waterLogsRef = useRef<WaterLog[]>(waterLogs);
  useEffect(() => {
    waterLogsRef.current = waterLogs;
  }, [waterLogs]);

  const optimisticAddWaterLog = useCallback((log: WaterLog) => {
    const todayStr = formatLocalDateStr(new Date());
    const prev = waterLogsRef.current || [];
    const previousToday = prev
      .filter(w => (w.date || '').slice(0, 10) === todayStr)
      .reduce((sum, w) => sum + (w.amountMl || 0), 0);
    const newToday = previousToday + (log.amountMl || 0);

    const next = [log, ...prev.filter(w => w.id !== log.id)];
    waterLogsRef.current = next;
    setWaterLogs(next);
    writeWellnessCache({ waterLogs: next }, true);
    clearScheduleCache();

    AsyncStorage.getItem('zentrack_water_goal_ml')
      .then(savedGoal => {
        const goal = savedGoal ? parseInt(savedGoal, 10) : 3800;
        return checkAndTriggerWaterMilestones(previousToday, newToday, goal);
      })
      .catch(() => {});
  }, []);

  const optimisticDeleteWaterLog = useCallback((logId: string) => {
    const prev = waterLogsRef.current || [];
    const next = prev.filter(l => l.id !== logId);
    waterLogsRef.current = next;
    setWaterLogs(next);
    writeWellnessCache({ waterLogs: next }, true);
    clearScheduleCache();
  }, []);

  const logWater = useCallback(async (amountMl: number, explicitUserId?: string) => {
    if (amountMl <= 0) return;
    const todayStr = formatLocalDateStr(new Date());
    const now = Date.now();
    const uid = explicitUserId || auth.currentUser?.uid || '';
    const waterRef = doc(collection(db, COLLECTION.WATER_LOGS));
    const logId = waterRef.id;

    const payload: WaterLog = {
      id: logId,
      userId: uid,
      date: todayStr,
      amountMl,
      timestamp: now,
      createdAt: now,
    };

    optimisticAddWaterLog(payload);

    try {
      await safeWrite(
        () => setDoc(waterRef, payload),
        COLLECTION.WATER_LOGS,
        'set',
        payload,
        logId
      );
    } catch (e) {
      console.warn('[WellnessContext] Error persisting water log:', e);
    }
  }, [optimisticAddWaterLog]);

  const gymLogsReady = gymLogsSnapshotFired || hasCachedDataRef.current;

  // ── 0ms Legacy-Speed: Background Idle Analytical Pre-computation ─────────────
  // Deferred strictly off the critical startup path via runAfterInteractions
  useEffect(() => {
    if (_isWorkoutActiveGlobal || !gymLogs?.length) return;
    const handle = InteractionManager.runAfterInteractions(() => {
      try {
        precomputeGymAnalytics(gymLogs, userGymPlan);
      } catch (_) {}
    });
    return () => handle.cancel();
  }, [gymLogs, userGymPlan]);

  // ── Partitioned gymLogs: O(1) Date Map and Hot Window (Last 126 Days) ────────
  const { recentGymLogs, logsByDateMap } = useMemo(() => {
    const map = new Map<string, GymLog>();
    const cutoff = offsetDateStr(formatLocalDateStr(new Date()), -126);
    const recent: GymLog[] = [];
    for (const log of gymLogs || []) {
      if (log && log.date) {
        if (!map.has(log.date)) map.set(log.date, log);
        if (log.date >= cutoff) recent.push(log);
      }
    }
    return { recentGymLogs: recent, logsByDateMap: map };
  }, [gymLogs]);

  // ── Decoupled Atomic Domain Values (Prevents cross-domain render thrashing) ──
  const gymLogsValue = useMemo<GymLogsContextType>(() => ({
    gymLogs,
    recentGymLogs,
    logsByDateMap,
    gymLogsReady,
    ensureSubscribed,
    optimisticAddGymLog,
    optimisticUpdateGymLog,
  }), [gymLogs, recentGymLogs, logsByDateMap, gymLogsReady, ensureSubscribed, optimisticAddGymLog, optimisticUpdateGymLog]);

  const gymPlanValue = useMemo<GymPlanContextType>(() => ({
    userGymPlan,
    updateMasterPlan,
    updateFullMasterPlan,
    applyMasterTemplate,
    saveCustomRoutine,
    deleteCustomRoutine,
    assignRoutineToDay,
    saveRoutineFolders,
  }), [
    userGymPlan,
    updateMasterPlan,
    updateFullMasterPlan,
    applyMasterTemplate,
    saveCustomRoutine,
    deleteCustomRoutine,
    assignRoutineToDay,
    saveRoutineFolders,
  ]);

  const bodyMetricsValue = useMemo<BodyMetricsContextType>(() => ({
    waterLogs,
    sleepLogs,
    weightLogs,
    optimisticAddWaterLog,
    optimisticDeleteWaterLog,
    logWater,
  }), [waterLogs, sleepLogs, weightLogs, optimisticAddWaterLog, optimisticDeleteWaterLog, logWater]);

  const combinedValue = useMemo<WellnessContextType>(() => ({
    ...gymLogsValue,
    ...gymPlanValue,
    ...bodyMetricsValue,
  }), [gymLogsValue, gymPlanValue, bodyMetricsValue]);

  return (
    <GymLogsContext.Provider value={gymLogsValue}>
      <GymPlanContext.Provider value={gymPlanValue}>
        <BodyMetricsContext.Provider value={bodyMetricsValue}>
          <WellnessContext.Provider value={combinedValue}>
            {children}
          </WellnessContext.Provider>
        </BodyMetricsContext.Provider>
      </GymPlanContext.Provider>
    </GymLogsContext.Provider>
  );
}
