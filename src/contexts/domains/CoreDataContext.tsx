import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import * as Notifications from 'expo-notifications';
import { auth, db } from '../../services/firebase';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithGoogle, signOutGoogle, GoogleAuthResult } from '../../services/googleAuth';
import {
  BOOT_KEYS,
  GUEST_STORAGE_KEY,
  getAuthBootSync,
  getBootManifestSync,
  updateL1Cache,
  getL1Sync,
  setL1Sync,
  deleteL1Sync,
  isAuthBootHydrated,
  isL1BootHydrated,
  loadAuthBootSlice,
} from '../../utils/bootManifest';
import { DOMAIN_CACHE_KEYS, clearAllDomainCaches } from '../../utils/domainCache';
import { clearSyncMeta } from '../../utils/syncMeta';
import { queueBatchWrites, clearOfflineQueue, migrateOfflineQueueUser } from '../../services/offlineSync';
import { COLLECTION } from '../../config/constants';
import { PROFILE_STORAGE_KEY, clearGymProfileMemory, normalizeGymProfileAliases } from '../../hooks/useGymProfile';
import { clearXPMemory, resetAllXP } from '../../services/xpSystem';
import { clearWeeklyAnalysisCache } from '../../services/weeklyGymAnalysisEngine';
import { clearVideoResolverCache } from '../../services/exerciseVideoResolver';
import { clearGlobalRestTimer } from '../../services/restTimerService';
import { clearScheduleCache, IdempotencyLedger, InAppNotificationStore } from '../../services/notifications';
import { dismissActiveWorkoutNotification } from '../../services/activeWorkoutNotificationService';
import { cacheUserAvatar, initAvatarCacheOnBoot, clearAvatarCache } from '../../services/userAvatarService';
import { clearAllPRs } from '../../utils/progressiveOverload';
import { setWorkoutActiveGlobal } from './WellnessContext';

interface CoreDataContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  performGoogleSignIn: () => Promise<GoogleAuthResult>;
  completeExternalSignIn: (signedInUser: User) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  performSignOut: () => Promise<void>;
}

const CoreDataContext = createContext<CoreDataContextType>({
  user: null,
  loading: true,
  isGuest: false,
  performGoogleSignIn: async () => ({ success: false }),
  completeExternalSignIn: async () => {},
  continueAsGuest: async () => {},
  performSignOut: async () => {},
});

export function CoreDataProvider({ children }: { children: React.ReactNode }) {
  // Frame 0 synchronous cache hydration: instant 0ms startup
  const initialAuthBoot = getAuthBootSync();
  const initialManifest = getBootManifestSync();
  const initialUser: User | null =
    initialAuthBoot?.optimisticUser ??
    initialManifest?.optimisticUser ??
    getL1Sync<User | null>(BOOT_KEYS.OPTIMISTIC_USER, null) ??
    auth.currentUser ??
    null;
  const initialGuest: boolean =
    Boolean(initialAuthBoot?.isGuest) ||
    getL1Sync<boolean>(GUEST_STORAGE_KEY, false) ||
    Boolean((initialUser as any)?.isAnonymous);

  const [user, setUser] = useState<User | null>(initialUser);
  const [isGuest, setIsGuest] = useState<boolean>(initialGuest);
  // Hold loading=true until initial auth storage slice settles (never route prematurely on Frame 0)
  const [loading, setLoading] = useState<boolean>(
    !(initialUser || initialGuest || isAuthBootHydrated() || isL1BootHydrated())
  );

  const isMountedRef = useRef(true);
  const userRef = useRef<User | null>(initialUser);
  const isGuestRef = useRef<boolean>(initialGuest);
  const lastGuestUidRef = useRef<string | null>(
    (initialGuest || initialUser?.isAnonymous) ? (initialUser?.uid || 'guest_local_user') : null
  );
  userRef.current = user;
  isGuestRef.current = isGuest;

  useEffect(() => {
    isMountedRef.current = true;

    async function initFastAuth() {
      // 1. Always join the shared lightweight auth boot slice so a mid-render hydration never skips setUser/setIsGuest
      if (!(initialUser || initialGuest)) {
        try {
          const authSlice = await loadAuthBootSlice();
          if (!isMountedRef.current) return;

          const l1User = getL1Sync<User | null>(BOOT_KEYS.OPTIMISTIC_USER, null);
          const l1Guest = getL1Sync<boolean>(GUEST_STORAGE_KEY, false);
          const resolvedUser =
            userRef.current ??
            authSlice.optimisticUser ??
            l1User ??
            auth.currentUser ??
            null;
          const resolvedGuest = Boolean(
            isGuestRef.current ||
            authSlice.isGuest ||
            l1Guest ||
            (resolvedUser as any)?.isAnonymous
          );

          if (resolvedUser && !userRef.current) {
            userRef.current = resolvedUser;
            setUser(resolvedUser);
            initAvatarCacheOnBoot(resolvedUser.uid).catch(() => {});
            if (resolvedUser.photoURL) {
              cacheUserAvatar(resolvedUser.uid, resolvedUser.photoURL).catch(() => {});
            }
          }

          if (resolvedGuest) {
            if (!lastGuestUidRef.current) {
              lastGuestUidRef.current = resolvedUser?.uid || 'guest_local_user';
            }
            if (!isGuestRef.current) {
              isGuestRef.current = true;
              setIsGuest(true);
            }
          }
        } catch (_) {}
      }

      if (isMountedRef.current) {
        setLoading(false);
      }
      if (!isMountedRef.current) return;

      // 2. Background Firebase Auth listener (always attached, never blocks UI)
      const unsub = onAuthStateChanged(auth, async (currentUser) => {
        if (!isMountedRef.current) return;

        if (currentUser) {
          const isAnon = currentUser.isAnonymous;
          if (isAnon) {
            lastGuestUidRef.current = currentUser.uid;
          }
          setUser(currentUser);
          setIsGuest(isAnon);

          const resolvedPhoto = currentUser.photoURL || currentUser.providerData?.[0]?.photoURL || null;
          const optimisticPayload = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: resolvedPhoto,
            isAnonymous: isAnon,
          };

          AsyncStorage.setItem(BOOT_KEYS.OPTIMISTIC_USER, JSON.stringify(optimisticPayload)).catch(() => {});
          setL1Sync(BOOT_KEYS.OPTIMISTIC_USER, optimisticPayload, true);
          updateL1Cache('optimisticUser', optimisticPayload as any);

          if (!isAnon) {
            deleteL1Sync(GUEST_STORAGE_KEY);
          }
          initAvatarCacheOnBoot(currentUser.uid).catch(() => {});
          if (resolvedPhoto) {
            cacheUserAvatar(currentUser.uid, resolvedPhoto).catch(() => {});
          }
        } else {
          // Only clear user if no local optimistic user, persisted Firebase session, or guest flag exists
          const pairs = await AsyncStorage.multiGet([
            BOOT_KEYS.OPTIMISTIC_USER,
            BOOT_KEYS.FIREBASE_AUTH_USER,
            GUEST_STORAGE_KEY,
          ]).catch(() => []);
          const pairMap = new Map<string, string | null>(pairs);
          const hasOptimistic = Boolean(pairMap.get(BOOT_KEYS.OPTIMISTIC_USER) || pairMap.get(BOOT_KEYS.FIREBASE_AUTH_USER));
          const hasGuest = pairMap.get(GUEST_STORAGE_KEY) === 'true';
          if (!hasOptimistic && !hasGuest && isMountedRef.current) {
            setUser(null);
            setIsGuest(false);
          }
        }

        // Always release loading gate once Firebase has completed its initial handshake
        if (isMountedRef.current) {
          setLoading(false);
        }
      });

      return unsub;
    }

    const unsubPromise = initFastAuth();

    return () => {
      isMountedRef.current = false;
      unsubPromise.then(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, []);

  const finalizeAccountSignIn = useCallback(async (signedInUser: User): Promise<void> => {
    const newUid = signedInUser.uid;
    const oldUid =
      lastGuestUidRef.current ||
      ((isGuestRef.current || userRef.current?.isAnonymous) ? userRef.current?.uid : undefined);

    setUser(signedInUser);
    setIsGuest(false);

    const signedInPhoto = signedInUser.photoURL || signedInUser.providerData?.[0]?.photoURL || null;
    const optimisticPayload = {
      uid: signedInUser.uid,
      email: signedInUser.email,
      displayName: signedInUser.displayName,
      photoURL: signedInPhoto,
      isAnonymous: false,
    };

    await AsyncStorage.setItem(BOOT_KEYS.OPTIMISTIC_USER, JSON.stringify(optimisticPayload)).catch(() => {});
    setL1Sync(BOOT_KEYS.OPTIMISTIC_USER, optimisticPayload);
    deleteL1Sync(GUEST_STORAGE_KEY);
    updateL1Cache('optimisticUser', optimisticPayload as any);

    if (signedInPhoto) {
      cacheUserAvatar(newUid, signedInPhoto).catch(() => {});
    }

    // Migrate local cached data and offline queue ONLY when upgrading from guest/anon to signed-in account
    if (oldUid && oldUid !== newUid) {
      lastGuestUidRef.current = null;
      try {
        const batchQueueItems: Array<{
          collectionName: string;
          operation: 'add' | 'update' | 'delete' | 'set';
          data: any;
          docId?: string;
        }> = [];

        const hasMeaningfulGymProgress = (l: any): boolean => {
          if (!l || typeof l !== 'object') return false;
          if (l.completed || l.workoutStartTime) return true;
          if (l.notes && String(l.notes).trim()) return true;
          const hasDoneSet = Array.isArray(l.exercises) && l.exercises.some((ex: any) =>
            Array.isArray(ex?.setsLog) && ex.setsLog.some((s: any) => Boolean(s?.completed))
          );
          if (hasDoneSet) return true;
          const hasDoneCardio = Array.isArray(l.cardio) && l.cardio.some((c: any) => Boolean(c?.completed));
          return hasDoneCardio;
        };

        // Check existing cloud plan & profile first so guest defaults never overwrite an existing Gmail account
        const [cloudPlanSnap, cloudProfileSnap] = await Promise.all([
          getDoc(doc(db, COLLECTION.USER_GYM_PLANS, newUid)).catch(() => null),
          getDoc(doc(db, COLLECTION.USER_PROFILES, newUid)).catch(() => null),
        ]);

        // 1. Migrate Gym Logs ONLY if they contain real workout progress (skip empty guest drafts)
        const rawLogs = await AsyncStorage.getItem(DOMAIN_CACHE_KEYS.GYM_LOGS);
        if (rawLogs) {
          const parsed = JSON.parse(rawLogs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const meaningfulLogs = parsed.filter(hasMeaningfulGymProgress);
            if (meaningfulLogs.length > 0) {
              const migrated = meaningfulLogs.map((l: any) => {
                if (!l.userId || l.userId === oldUid) {
                  const newId = l.date ? `${newUid}_${l.date}` : l.id;
                  return { ...l, userId: newUid, id: newId };
                }
                return l;
              });
              await AsyncStorage.setItem(DOMAIN_CACHE_KEYS.GYM_LOGS, JSON.stringify(migrated));
              updateL1Cache('gymLogs', migrated);

              for (const logItem of migrated) {
                const hasExercises = Array.isArray(logItem.exercises) && logItem.exercises.length > 0;
                const hasCardio = Array.isArray(logItem.cardio) && logItem.cardio.length > 0;
                if (logItem.id && (hasExercises || hasCardio)) {
                  batchQueueItems.push({
                    collectionName: COLLECTION.GYM_LOGS,
                    operation: 'set',
                    data: logItem,
                    docId: logItem.id,
                  });
                }
              }
            } else {
              await AsyncStorage.removeItem(DOMAIN_CACHE_KEYS.GYM_LOGS).catch(() => {});
              updateL1Cache('gymLogs', []);
              DeviceEventEmitter.emit('gym_logs_changed', { gymLogs: [] });
            }
          }
        }

        // 2. Migrate User Gym Plan ONLY if cloud account has no existing plan
        const rawPlan = await AsyncStorage.getItem(DOMAIN_CACHE_KEYS.USER_GYM_PLAN);
        if (cloudPlanSnap && cloudPlanSnap.exists()) {
          await AsyncStorage.removeItem(DOMAIN_CACHE_KEYS.USER_GYM_PLAN).catch(() => {});
          updateL1Cache('userGymPlan', null);
        } else if (rawPlan && cloudPlanSnap && !cloudPlanSnap.exists()) {
          const parsedPlan = JSON.parse(rawPlan);
          if (parsedPlan && typeof parsedPlan === 'object') {
            const migratedPlan = {
              ...parsedPlan,
              id: newUid,
              userId: newUid,
              updatedAt: Date.now(),
            };
            await AsyncStorage.setItem(DOMAIN_CACHE_KEYS.USER_GYM_PLAN, JSON.stringify(migratedPlan));
            updateL1Cache('userGymPlan', migratedPlan);
            batchQueueItems.push({
              collectionName: COLLECTION.USER_GYM_PLANS,
              operation: 'set',
              data: migratedPlan,
              docId: newUid,
            });
          }
        }

        // 3. Migrate Weight Logs (Issue #55)
        const rawWeights = await AsyncStorage.getItem(DOMAIN_CACHE_KEYS.WEIGHT_LOGS);
        if (rawWeights) {
          const parsedWeights = JSON.parse(rawWeights);
          if (Array.isArray(parsedWeights) && parsedWeights.length > 0) {
            const migratedWeights = parsedWeights.map((w: any) => ({ ...w, userId: newUid }));
            await AsyncStorage.setItem(DOMAIN_CACHE_KEYS.WEIGHT_LOGS, JSON.stringify(migratedWeights));
            updateL1Cache('weightLogs', migratedWeights);
            for (const w of migratedWeights) {
              if (w.id) {
                batchQueueItems.push({
                  collectionName: COLLECTION.WEIGHT_LOGS,
                  operation: 'set',
                  data: w,
                  docId: w.id,
                });
              }
            }
          }
        }

        // 5. Migrate Gym Profile ONLY if cloud account has no existing profile; otherwise hydrate cloud profile
        const rawProfile = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
        if (cloudProfileSnap && cloudProfileSnap.exists()) {
          const cloudData = cloudProfileSnap.data();
          const cloudProf = cloudData?.gymProfile || cloudData;
          clearGymProfileMemory();
          if (cloudProf && typeof cloudProf === 'object') {
            const normalizedCloud = normalizeGymProfileAliases(cloudProf);
            await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalizedCloud)).catch(() => {});
            setL1Sync(PROFILE_STORAGE_KEY, normalizedCloud);
            DeviceEventEmitter.emit('gym_profile_updated', normalizedCloud);
          } else {
            await AsyncStorage.removeItem(PROFILE_STORAGE_KEY).catch(() => {});
            deleteL1Sync(PROFILE_STORAGE_KEY);
          }
        } else if (rawProfile && cloudProfileSnap && !cloudProfileSnap.exists()) {
          const parsedProfile = JSON.parse(rawProfile);
          if (parsedProfile && typeof parsedProfile === 'object') {
            const migratedProfile = {
              ...parsedProfile,
              userId: newUid,
              updatedAt: Date.now(),
            };
            await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(migratedProfile));
            setL1Sync(PROFILE_STORAGE_KEY, migratedProfile);
            batchQueueItems.push({
              collectionName: COLLECTION.USER_PROFILES,
              operation: 'set',
              data: { gymProfile: migratedProfile, updatedAt: migratedProfile.updatedAt },
              docId: newUid,
            });
          }
        }

        // 6. Migrate Pending Offline Write Queue in RAM + Disk cleanly (preserving collection docId rules)
        await migrateOfflineQueueUser(oldUid, newUid);

        // Batch-enqueue all migrated items in ONE atomic disk pass (Issue #56)
        if (batchQueueItems.length > 0) {
          await queueBatchWrites(batchQueueItems, true);
        }
      } catch (migErr) {
        console.warn('[CoreData] Account upgrade data migration error:', migErr);
      }
    }
  }, []);

  const performGoogleSignIn = useCallback(async (): Promise<GoogleAuthResult> => {
    try {
      const result = await signInWithGoogle();
      if (result.success && result.user) {
        await finalizeAccountSignIn(result.user);
      }
      return result;
    } catch (e: any) {
      console.error('[CoreData] Google sign-in failure:', e);
      return { success: false, error: e?.message || 'Sign in failed' };
    }
  }, [finalizeAccountSignIn]);

  const completeExternalSignIn = useCallback(async (signedInUser: User): Promise<void> => {
    await finalizeAccountSignIn(signedInUser);
  }, [finalizeAccountSignIn]);

  const continueAsGuest = useCallback(async () => {
    try {
      await AsyncStorage.setItem(GUEST_STORAGE_KEY, 'true');
      setL1Sync(GUEST_STORAGE_KEY, true);
      setIsGuest(true);

      if (!auth.currentUser) {
        try {
          const cred = await signInAnonymously(auth);
          lastGuestUidRef.current = cred.user.uid;
          setUser(cred.user);
          const optimisticPayload = {
            uid: cred.user.uid,
            isAnonymous: true,
          };
          await AsyncStorage.setItem(BOOT_KEYS.OPTIMISTIC_USER, JSON.stringify(optimisticPayload)).catch(() => {});
          setL1Sync(BOOT_KEYS.OPTIMISTIC_USER, optimisticPayload);
          updateL1Cache('optimisticUser', optimisticPayload as any);
        } catch (authErr) {
          // Offline fallback: ensure non-null guest user so WellnessContext & offline cache operate 100% offline
          lastGuestUidRef.current = 'guest_local_user';
          const offlineGuest = {
            uid: 'guest_local_user',
            isAnonymous: true,
          } as unknown as User;
          setUser(offlineGuest);
          await AsyncStorage.setItem(BOOT_KEYS.OPTIMISTIC_USER, JSON.stringify(offlineGuest)).catch(() => {});
          setL1Sync(BOOT_KEYS.OPTIMISTIC_USER, offlineGuest);
          updateL1Cache('optimisticUser', offlineGuest as any);
        }
      } else {
        lastGuestUidRef.current = auth.currentUser.uid;
      }
    } catch (e) {
      console.warn('[CoreData] Guest sign-in fallback:', e);
      lastGuestUidRef.current = 'guest_local_user';
      setIsGuest(true);
      const offlineGuest = {
        uid: 'guest_local_user',
        isAnonymous: true,
      } as unknown as User;
      setUser(offlineGuest);
      setL1Sync(BOOT_KEYS.OPTIMISTIC_USER, offlineGuest);
      updateL1Cache('optimisticUser', offlineGuest as any);
    }
  }, []);

  const performSignOut = useCallback(async () => {
    const previousUid = userRef.current?.uid;
    lastGuestUidRef.current = null;
    try {
      // Stop active workout / rest timer / notification sessions cleanly before wiping disk
      setWorkoutActiveGlobal(false);
      await clearGlobalRestTimer().catch(() => {});
      await dismissActiveWorkoutNotification().catch(() => {});

      // Wipe XP memory & local state via resetAllXP without mutating previous user's cloud XP in Firestore
      clearXPMemory();
      await resetAllXP(false).catch(() => {});
      await clearWeeklyAnalysisCache().catch(() => {});
      await clearVideoResolverCache().catch(() => {});
      DeviceEventEmitter.emit('zentrack_xp_updated', { xp: 0, added: 0, source: 'sign_out' });

      // Wipe ZONE scheduled alarms, ledgers, in-app inbox, PRs, avatar, offline queue, sync meta, and domain caches
      clearScheduleCache();
      await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
      await Notifications.dismissAllNotificationsAsync().catch(() => {});
      await IdempotencyLedger.clear().catch(() => {});
      await InAppNotificationStore.clearAll().catch(() => {});
      await clearAllPRs().catch(() => {});
      await clearAvatarCache(previousUid).catch(() => {});
      await clearOfflineQueue().catch(() => {});
      await clearSyncMeta();
      await clearAllDomainCaches().catch(() => {});

      // Clear remaining auth/session keys; DO NOT call debounced setL1Sync afterwards (prevents zombie disk re-writes)
      await AsyncStorage.multiRemove([
        BOOT_KEYS.OPTIMISTIC_USER,
        BOOT_KEYS.FIREBASE_AUTH_USER,
        GUEST_STORAGE_KEY,
        '@zentrack_active_workout_state',
        '@zenfit_active_workout_state',
        '@gym_last_completed_session',
        'zenfit_onboarding_flow_done_v3',
        PROFILE_STORAGE_KEY,
        '@gym_profile_v2',
        '@zentrack_exercise_ledger_v1',
        '@zentrack_offline_write_queue',
        'zentrack_xp_v1',
        'zentrack_xp_streak',
        '@zentrack_xp_rewarded_keys_v1',
        'zenfit_xp_v1',
        'zenfit_xp_streak',
        '@zenfit_global_rest_timer',
        '@zenfit_widget_live_workout_data',
        '@zentrack_widget_mutation_ts',
      ]).catch(() => {});

      DeviceEventEmitter.emit('gym_logs_changed', { gymLogs: [] });
      DeviceEventEmitter.emit('auth_state_changed');
      await signOutGoogle().catch(() => {});
    } catch (e) {
      console.error('[CoreData] Sign-out error:', e);
    } finally {
      setUser(null);
      setIsGuest(false);
    }
  }, []);

  const contextValue = useMemo<CoreDataContextType>(() => ({
    user,
    loading,
    isGuest,
    performGoogleSignIn,
    completeExternalSignIn,
    continueAsGuest,
    performSignOut,
  }), [user, loading, isGuest, performGoogleSignIn, completeExternalSignIn, continueAsGuest, performSignOut]);

  return (
    <CoreDataContext.Provider value={contextValue}>
      {children}
    </CoreDataContext.Provider>
  );
}

export function useCoreData() {
  return useContext(CoreDataContext);
}
