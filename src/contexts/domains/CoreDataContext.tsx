import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { auth } from '../../services/firebase';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithGoogle, signOutGoogle, GoogleAuthResult } from '../../services/googleAuth';
import { BOOT_KEYS, getBootManifestSync, updateL1Cache } from '../../utils/bootManifest';

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
  const initialUser: User | null = initialManifest?.optimisticUser ?? auth.currentUser ?? null;

  const [user, setUser] = useState<User | null>(initialUser);
  const [isGuest, setIsGuest] = useState<boolean>(Boolean(initialUser?.isAnonymous));
  // If we already have an optimistic user from L1 pre-warming, loading is false instantly on Frame 0
  const [loading, setLoading] = useState<boolean>(!initialUser);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    async function initFastAuth() {
      // 1. Ultra-fast local check (takes <5ms) to avoid waiting for Firebase's network token check
      try {
        const pairs = await AsyncStorage.multiGet([BOOT_KEYS.OPTIMISTIC_USER, GUEST_STORAGE_KEY]);
        const map = new Map<string, string | null>(pairs);
        const optimisticRaw = map.get(BOOT_KEYS.OPTIMISTIC_USER);
        const guestPref = map.get(GUEST_STORAGE_KEY);

        if (optimisticRaw) {
          try {
            const parsed = JSON.parse(optimisticRaw);
            if (parsed && parsed.uid && isMountedRef.current) {
              setUser(parsed as User);
              setIsGuest(Boolean(parsed.isAnonymous));
              setLoading(false);
            }
          } catch (_) {}
        } else if (guestPref === 'true' && isMountedRef.current) {
          setIsGuest(true);
          setLoading(false);
        } else if (isMountedRef.current) {
          // No stored session found — release loading gate immediately so AuthScreen displays in 0ms
          setLoading(false);
        }
      } catch (_) {
        if (isMountedRef.current) setLoading(false);
      }

      // 2. Background Firebase Auth listener (silent background handshake, never blocks UI)
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
          updateL1Cache('optimisticUser', currentUser as any);

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

        setLoading(false);
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
    setLoading(true);
    const result = await signInWithGoogle();
    if (result.success && result.user) {
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
      updateL1Cache('optimisticUser', result.user as any);
    }
    setLoading(false);
    return result;
  };

  const continueAsGuest = async () => {
    setLoading(true);
    try {
      await AsyncStorage.setItem(GUEST_STORAGE_KEY, 'true');
      setIsGuest(true);

      if (!auth.currentUser) {
        const cred = await signInAnonymously(auth);
        setUser(cred.user);
        const optimisticPayload = {
          uid: cred.user.uid,
          isAnonymous: true,
        };
        await AsyncStorage.setItem(BOOT_KEYS.OPTIMISTIC_USER, JSON.stringify(optimisticPayload)).catch(() => {});
        updateL1Cache('optimisticUser', cred.user as any);
      }
    } catch (e) {
      console.warn('[CoreData] Guest sign-in fallback:', e);
      setIsGuest(true);
    } finally {
      setLoading(false);
    }
  };

  const performSignOut = async () => {
    setLoading(true);
    try {
      await AsyncStorage.removeItem(BOOT_KEYS.OPTIMISTIC_USER).catch(() => {});
      await AsyncStorage.removeItem(GUEST_STORAGE_KEY).catch(() => {});
      updateL1Cache('optimisticUser', null);
      setUser(null);
      setIsGuest(false);
      await signOutGoogle();
    } catch (e) {
      console.error('[CoreData] Sign-out error:', e);
    } finally {
      setLoading(false);
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
