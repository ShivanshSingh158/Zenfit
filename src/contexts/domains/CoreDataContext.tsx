import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../../services/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

interface CoreDataContextType {
  user: User | null;
  loading: boolean;
  performSignOut: () => Promise<void>;
}

const CoreDataContext = createContext<CoreDataContextType>({
  user: null,
  loading: true,
  performSignOut: async () => {},
});

export function CoreDataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        try {
          const { signInAnonymously } = await import('firebase/auth');
          const cred = await signInAnonymously(auth);
          setUser(cred.user);
        } catch (e) {
          console.warn('[CoreData] Anonymous auth fallback error:', e);
          setUser(null);
        }
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const performSignOut = async () => {
    await signOut(auth);
  };

  return (
    <CoreDataContext.Provider value={{ user, loading, performSignOut }}>
      {children}
    </CoreDataContext.Provider>
  );
}

export function useCoreData() {
  return useContext(CoreDataContext);
}
