import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { auth } from '../../services/firebase';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithGoogle, signOutGoogle, GoogleAuthResult } from '../../services/googleAuth';
import { BOOT_KEYS, getBootManifestSync, updateL1Cache, getL1Sync, setL1Sync } from '../../utils/bootManifest';
import { DOMAIN_CACHE_KEYS } from '../../utils/domainCache';
import { queueWrite } from '../../services/offlineSync';
import { COLLECTION } from '../../config/constants';

const GUEST_STORAGE_KEY = '@zenfit_guest_mode_v1';

interface CoreDataContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  performGoogleSignIn: () => Promise<GoogleAuthResult>;
  continueAsGuest: () => Promise<void>;
  performSignOut: () => Promise<void>;
}

const CoreDataContext = createContext<CoreDataContextType>({
  user: null,
  loading: true,
  isGuest: false,
  performGoogleSignIn: async () => ({ success: false }),
  continueAsGuest: async () => {},
  performSignOut: async () => {},
});

export function CoreDataProvider({ children }: { children: React.ReactNode }) {
  // Frame 0 synchronous cache hydration: instant 0ms startup
  const initialManifest = getBootManifestSync();
  const initialUser: User | null = initialManifest?.optimisticUser ?? getL1Sync<User | null>(BOOT_KEYS.OPTIMISTIC_USER, null) ?? auth.currentUser ?? null;
  const initialGuest: boolean = getL1Sync<boolean>(GUEST_STORAGE_KEY, false);

  const [user, setUser] = useState<User | null>(initialUser);
  const [isGuest, setIsGuest] = useState<boolean>(initialGuest);
  // Frame 0: never block UI if initial user/guest is already in RAM; otherwise hold for the 5ms storage check
  const [loading, setLoading] = useState<boolean>(!(initialUser || initialGuest));

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    async function initFastAuth() {
      try {
        const pairs = await AsyncStorage.multiGet([
          BOOT_KEYS.OPTIMISTIC_USER,
          BOOT_KEYS.FIREBASE_AUTH_USER,
          GUEST_STORAGE_KEY,
        ]);
        const map = new Map<string, string | null>(pairs);
        const optimisticRaw = map.get(BOOT_KEYS.OPTIMISTIC_USER) || map.get(BOOT_KEYS.FIREBASE_AUTH_USER);
        const guestPref = map.get(GUEST_STORAGE_KEY);

        if (optimisticRaw) {
          try {
            const parsed = JSON.parse(optimisticRaw);
            if (parsed && parsed.uid && isMountedRef.current) {
              const isAnon = Boolean(parsed.isAnonymous);
              setUser(parsed as User);
              setIsGuest(isAnon);
              setLoading(false);
              return;
            }
          } catch (_) {}
        }

        if (guestPref === 'true' && isMountedRef.current) {
          setIsGuest(true);
          setLoading(false);
          return;
        }

        // Truly fresh install or logged-out state — release loading gate immediately to show Auth/Landing
        if (isMountedRef.current) {
          setLoading(false);
        }
      } catch (_) {
        if (isMountedRef.current) setLoading(false);
      }

      // 2. Background Firebase Auth listener (always attached, never blocks UI)
      const unsub = onAuthStateChanged(auth, async (currentUser) => {
        if (!isMountedRef.current) return;

        if (currentUser) {
          const isAnon = currentUser.isAnonymous;
          setUser(currentUser);
          setIsGuest(isAnon);

          const optimisticPayload = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            isAnonymous: isAnon,
          };

          AsyncStorage.setItem(BOOT_KEYS.OPTIMISTIC_USER, JSON.stringify(optimisticPayload)).catch(() => {});
          setL1Sync(BOOT_KEYS.OPTIMISTIC_USER, optimisticPayload);
          updateL1Cache('optimisticUser', optimisticPayload as any);

          if (!isAnon) {
            await AsyncStorage.removeItem(GUEST_STORAGE_KEY).catch(() => {});
          }
        } else {
          // Only clear user if no local optimistic user exists or user explicitly signed out
          const raw = await AsyncStorage.getItem(BOOT_KEYS.OPTIMISTIC_USER).catch(() => null);
          if (!raw && isMountedRef.current) {
            setUser(null);
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

  const performGoogleSignIn = async (): Promise<GoogleAuthResult> => {
    try {
      const result = await signInWithGoogle();
      if (result.success && result.user) {
        const oldUid = user?.uid;
        const newUid = result.user.uid;
        setUser(result.user);
        setIsGuest(false);

        const optimisticPayload = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          isAnonymous: false,
        };

        await AsyncStorage.setItem(BOOT_KEYS.OPTIMISTIC_USER, JSON.stringify(optimisticPayload)).catch(() => {});
        await AsyncStorage.removeItem(GUEST_STORAGE_KEY).catch(() => {});
        updateL1Cache('optimisticUser', optimisticPayload as any);

        // Migrate local cached logs and offline queue when upgrading from guest/anon to Google account
        if (oldUid !== newUid) {
          try {
            const rawLogs = await AsyncStorage.getItem(DOMAIN_CACHE_KEYS.GYM_LOGS);
            if (rawLogs) {
              const parsed = JSON.parse(rawLogs);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const migrated = parsed.map((l: any) => {
                  if (!l.userId || l.userId === oldUid) {
                    const newId = l.date ? `${newUid}_${l.date}` : l.id;
                    return { ...l, userId: newUid, id: newId };
                  }
                  return l;
                });
                await AsyncStorage.setItem(DOMAIN_CACHE_KEYS.GYM_LOGS, JSON.stringify(migrated));
                updateL1Cache('gymLogs', migrated);

                // Enqueue to offline write queue so they are persisted to Firestore under the new user
                for (const logItem of migrated) {
                  if (logItem.id && logItem.exercises && logItem.exercises.length > 0) {
                    await queueWrite(COLLECTION.GYM_LOGS, 'set', logItem, logItem.id, false).catch(() => {});
                  }
                }
              }
            }
            const rawQueue = await AsyncStorage.getItem('@zentrack_offline_write_queue');
            if (rawQueue) {
              const queue = JSON.parse(rawQueue);
              if (Array.isArray(queue) && queue.length > 0) {
                const migratedQueue = queue.map((item: any) => {
                  if (item?.data && typeof item.data === 'object') {
                    if (!item.data.userId || item.data.userId === oldUid) {
                      const newDocId = item.docId && item.data.date ? `${newUid}_${item.data.date}` : item.docId;
                      return {
                        ...item,
                        docId: newDocId,
                        data: { ...item.data, userId: newUid, id: newDocId }
                      };
                    }
                  }
                  return item;
                });
                await AsyncStorage.setItem('@zentrack_offline_write_queue', JSON.stringify(migratedQueue));
              }
            }
          } catch (migErr) {
            console.warn('[CoreData] Account upgrade data migration error:', migErr);
          }
        }
      }
      return result;
    } catch (e: any) {
      console.error('[CoreData] Google sign-in failure:', e);
      return { success: false, error: e?.message || 'Sign in failed' };
    }
  };

  const continueAsGuest = async () => {
    try {
      await AsyncStorage.setItem(GUEST_STORAGE_KEY, 'true');
      setL1Sync(GUEST_STORAGE_KEY, true);
      setIsGuest(true);

      if (!auth.currentUser) {
        const cred = await signInAnonymously(auth);
        setUser(cred.user);
        const optimisticPayload = {
          uid: cred.user.uid,
          isAnonymous: true,
        };
        await AsyncStorage.setItem(BOOT_KEYS.OPTIMISTIC_USER, JSON.stringify(optimisticPayload)).catch(() => {});
        setL1Sync(BOOT_KEYS.OPTIMISTIC_USER, optimisticPayload);
        updateL1Cache('optimisticUser', optimisticPayload as any);
      }
    } catch (e) {
      console.warn('[CoreData] Guest sign-in fallback:', e);
      setIsGuest(true);
    }
  };

  const performSignOut = async () => {
    try {
      // Clear active workout ghost state so it doesn't bleed into the next login session.
      // Without this, crash-recovery hydration re-loads workoutStartTime on next boot.
      await AsyncStorage.multiRemove([
        BOOT_KEYS.OPTIMISTIC_USER,
        GUEST_STORAGE_KEY,
        '@zentrack_active_workout_state',
        '@gym_last_completed_session',
        'zenfit_onboarding_flow_done_v3',
      ]).catch(() => {});

      setL1Sync(BOOT_KEYS.OPTIMISTIC_USER, null);
      setL1Sync(GUEST_STORAGE_KEY, false);
      updateL1Cache('optimisticUser', null);
      // Clear L1 gym log cache so no ghost workoutStartTime survives logout
      updateL1Cache('gymLogs', []);
      DeviceEventEmitter.emit('auth_state_changed');
      await signOutGoogle().catch(() => {});
    } catch (e) {
      console.error('[CoreData] Sign-out error:', e);
    } finally {
      setUser(null);
      setIsGuest(false);
    }
  };

  return (
    <CoreDataContext.Provider
      value={{
        user,
        loading,
        isGuest,
        performGoogleSignIn,
        continueAsGuest,
        performSignOut,
      }}
    >
      {children}
    </CoreDataContext.Provider>
  );
}

export function useCoreData() {
  return useContext(CoreDataContext);
}
