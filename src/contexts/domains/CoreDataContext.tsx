import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../../services/firebase';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithGoogle, signOutGoogle, GoogleAuthResult } from '../../services/googleAuth';

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
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const guestPref = await AsyncStorage.getItem(GUEST_STORAGE_KEY);
        if (guestPref === 'true') {
          if (isMounted) setIsGuest(true);
        }
      } catch (_) {}

      const unsub = onAuthStateChanged(auth, async (currentUser) => {
        if (!isMounted) return;

        if (currentUser && !currentUser.isAnonymous) {
          // Logged in with real credentials (Google)
          setUser(currentUser);
          setIsGuest(false);
          await AsyncStorage.removeItem(GUEST_STORAGE_KEY).catch(() => {});
        } else if (currentUser && currentUser.isAnonymous) {
          setUser(currentUser);
          setIsGuest(true);
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return unsub;
    }

    const unsubPromise = initAuth();

    return () => {
      isMounted = false;
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
      await AsyncStorage.removeItem(GUEST_STORAGE_KEY).catch(() => {});
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
      await AsyncStorage.removeItem(GUEST_STORAGE_KEY).catch(() => {});
      setIsGuest(false);
      await signOutGoogle();
      setUser(null);
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
