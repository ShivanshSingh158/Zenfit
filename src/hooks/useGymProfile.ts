/**
 * useGymProfile.ts — ZenTrack Mobile
 *
 * Reads/writes the user's gym athlete profile from AsyncStorage.
 * Key: 'gym_profile_v1'
 *
 * Profile is passed into GYM-GPT to personalise every coaching response:
 * warm-up, cool-down, load advice, exercise swaps, fatigue calculation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useCoreData } from '../contexts/domains/CoreDataContext';
import { GymProfile } from '../types/gym.types';

export { GymProfile };

const PROFILE_KEY = 'gym_profile_v1';

let memoryProfile: GymProfile | null = null;

export function clearGymProfileMemory() {
  memoryProfile = null;
}

export const DEFAULT_PROFILE: GymProfile = {
  heightCm: null,
  weightKg: null,
  bodyweightKg: null,
  age: null,
  ageYears: null,
  gender: null,
  goal: null,
  primaryGoal: null,
  experience: null,
  trainingExperienceMonths: null,
  equipment: null,
  daysPerWeek: null,
  limitations: '',
  exercisesToAvoid: '',
  focusMuscles: '',
  notes: '',
  unitIsLbs: false,
  autoTimer: true,
  hapticsEnabled: true,
  audioCues: true,
};

export function useGymProfile() {
  const { user } = useCoreData();
  const [gymProfile, setGymProfile] = useState<GymProfile>(memoryProfile || DEFAULT_PROFILE);
  const [profileLoaded, setProfileLoaded] = useState(!!memoryProfile);
  const profileRef = useRef<GymProfile>(memoryProfile || DEFAULT_PROFILE);

  // 1. Initial fast local load from AsyncStorage
  useEffect(() => {
    let cancelled = false;
    if (memoryProfile) {
      setProfileLoaded(true);
      return;
    }
    AsyncStorage.getItem(PROFILE_KEY)
      .then(raw => {
        if (cancelled || !raw) return;
        try {
          const merged = { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
          memoryProfile = merged;
          profileRef.current = merged;
          setGymProfile(merged);
        } catch (_) {}
      })
      .finally(() => {
        if (!cancelled) setProfileLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Cloud Firestore real-time synchronization
  useEffect(() => {
    if (!user?.uid) return;
    const docRef = doc(db, 'gym_profiles', user.uid);
    const unsub = onSnapshot(docRef, snap => {
      if (snap.exists()) {
        const cloudData = snap.data() as Partial<GymProfile>;
        const merged: GymProfile = {
          ...DEFAULT_PROFILE,
          ...(profileRef.current || {}),
          ...cloudData,
        };
        memoryProfile = merged;
        profileRef.current = merged;
        setGymProfile(merged);
        AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(merged)).catch(() => {});
      }
    }, err => {
      console.warn('[useGymProfile] Cloud sync listener notice:', err.message);
    });
    return () => unsub();
  }, [user?.uid]);

  // Cross-component synchronisation via DeviceEventEmitter
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('gym_profile_updated', (updated: GymProfile) => {
      memoryProfile = updated;
      profileRef.current = updated;
      setGymProfile(updated);
    });
    const subLogout = DeviceEventEmitter.addListener('auth_state_changed', () => {
      memoryProfile = null;
    });
    return () => {
      sub.remove();
      subLogout.remove();
    };
  }, []);

  const saveGymProfile = useCallback(async (profile: Partial<GymProfile>) => {
    const next = { ...profileRef.current, ...profile };
    memoryProfile = next;
    profileRef.current = next;
    setGymProfile(next);
    DeviceEventEmitter.emit('gym_profile_updated', next);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));

    // Also persist to Cloud Firestore if user is authenticated
    if (user?.uid) {
      setDoc(doc(db, 'gym_profiles', user.uid), next, { merge: true }).catch(err => {
        console.warn('[useGymProfile] Firestore save notice:', err.message);
      });
    }
  }, [user?.uid]);

  const profileSummary = useCallback((profile?: GymProfile): string => {
    const p = profile || profileRef.current;
    if (!p.goal && !p.weightKg && !p.experience) return '';

    const goalMap: Record<string, string> = {
      hypertrophy: 'Muscle Hypertrophy (size)',
      strength: 'Maximal Strength',
      fat_loss: 'Fat Loss + Muscle Retention',
      athletic: 'Athletic Performance',
    };
    const expMap: Record<string, string> = {
      beginner: 'Beginner (<1 year)',
      intermediate: 'Intermediate (1-3 years)',
      advanced: 'Advanced (3+ years)',
    };
    const eqMap: Record<string, string> = {
      full_gym: 'Full commercial gym',
      home_gym: 'Home gym (dumbbells/barbell)',
      bodyweight: 'Bodyweight only',
    };

    const lines: string[] = ['=== ATHLETE PROFILE ==='];
    if (p.heightCm) lines.push(`Height: ${p.heightCm} cm`);
    if (p.weightKg) lines.push(`Bodyweight: ${p.weightKg} kg`);
    if (p.age) lines.push(`Age: ${p.age} years`);
    if (p.gender) lines.push(`Gender: ${p.gender}`);
    if (p.goal) lines.push(`Primary Goal: ${goalMap[p.goal] || p.goal}`);
    if (p.experience) lines.push(`Experience: ${expMap[p.experience] || p.experience}`);
    if (p.equipment) lines.push(`Equipment: ${eqMap[p.equipment] || p.equipment}`);
    if (p.daysPerWeek) lines.push(`Training Days/Week: ${p.daysPerWeek}`);
    if (p.limitations) lines.push(`Injuries/Limitations: ${p.limitations}`);
    if (p.focusMuscles && typeof p.focusMuscles === 'string') lines.push(`Focus Muscles: ${p.focusMuscles}`);
    if (p.exercisesToAvoid) lines.push(`Exercises to AVOID: ${p.exercisesToAvoid}`);
    if (p.notes) lines.push(`Other Preferences: ${p.notes}`);
    lines.push('======================');
    return lines.join('\n');
  }, []);

  return { gymProfile, profileLoaded, saveGymProfile, profileSummary };
}
