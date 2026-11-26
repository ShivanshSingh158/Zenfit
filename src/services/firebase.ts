import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, initializeAuth } from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import {
  initializeFirestore,
  memoryLocalCache,
  memoryLruGarbageCollector
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY            || '',
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN        || '',
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID         || '',
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET     || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID             || '',
};

const app = initializeApp(firebaseConfig);

// Enable React Native Persistence for Auth
// @ts-ignore
export const auth = initializeAuth(app, {
  // @ts-ignore
  persistence: getReactNativePersistence ? getReactNativePersistence(AsyncStorage) : undefined
});

// React Native (Hermes) does not have browser IndexedDB.
// ZenTrack manages its own full offline persistence via AsyncStorage & domain caches.
// Using memoryLocalCache prevents Firebase from attempting and failing an IndexedDB initialization.
const localCacheSetting = memoryLocalCache({ garbageCollector: memoryLruGarbageCollector() });

export const db = initializeFirestore(app, {
  localCache: localCacheSetting,
  experimentalAutoDetectLongPolling: true,
});

export const googleProvider = new GoogleAuthProvider();

