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
import { getL1Sync, setL1Sync } from '../utils/bootManifest';
import { COLLECTION } from '../config/constants';
import { safeWrite } from '../utils/safeWrite';

export { GymProfile };

export const PROFILE_STORAGE_KEY = 'gym_profile_v1';
const PROFILE_KEY = PROFILE_STORAGE_KEY;

let memoryProfile: GymProfile | null = null;

export function clearGymProfileMemory() {
  memoryProfile = null;
}

export function normalizeGymProfileAliases(p: Partial<GymProfile>): Partial<GymProfile> {
  const norm = { ...p };
  // Issue #69: Bidirectional mirroring of ambiguous/alias fields
  if (norm.weightKg != null && norm.bodyweightKg == null) norm.bodyweightKg = norm.weightKg;
  if (norm.bodyweightKg != null && norm.weightKg == null) norm.weightKg = norm.bodyweightKg;
  if (norm.age != null && norm.ageYears == null) norm.ageYears = norm.age;
  if (norm.ageYears != null && norm.age == null) norm.age = norm.ageYears;
  if (norm.goal != null && norm.primaryGoal == null) norm.primaryGoal = norm.goal;
  if (norm.primaryGoal != null && norm.goal == null) norm.goal = norm.primaryGoal as any;
  return norm;
}

export function setAutoTimerEnabledGlobal(enabled: boolean) {
  if (memoryProfile) {
    memoryProfile = { ...memoryProfile, autoTimer: enabled };
  }
  const l1 = getL1Sync<GymProfile>(PROFILE_KEY, DEFAULT_PROFILE);
  if (l1) {
    setL1Sync(PROFILE_KEY, { ...l1, autoTimer: enabled });
  }
  DeviceEventEmitter.emit('auto_timer_setting_changed', enabled);
}

export function isHapticsEnabledSync(): boolean {
  if (memoryProfile && typeof memoryProfile.hapticsEnabled === 'boolean') {
    return memoryProfile.hapticsEnabled;
  }
  const l1 = getL1Sync<GymProfile>(PROFILE_KEY, DEFAULT_PROFILE);
  return l1?.hapticsEnabled ?? true;
}

export function isAutoTimerEnabledSync(): boolean {
  // Issue #67: Read memoryProfile and L1 directly as single source of truth (no desync override)
  if (memoryProfile && typeof memoryProfile.autoTimer === 'boolean') {
    return memoryProfile.autoTimer;
  }
  const l1 = getL1Sync<GymProfile>(PROFILE_KEY, DEFAULT_PROFILE);
  if (l1 && typeof l1.autoTimer === 'boolean') {
    return l1.autoTimer;
  }
  return true;
}

export function isAudioCuesEnabledSync(): boolean {
  if (memoryProfile && typeof memoryProfile.audioCues === 'boolean') {
    return memoryProfile.audioCues;
  }
  const l1 = getL1Sync<GymProfile>(PROFILE_KEY, DEFAULT_PROFILE);
  return l1?.audioCues ?? true;
}

export function isKeepAwakeEnabledSync(): boolean {
  if (memoryProfile && typeof memoryProfile.keepAwake === 'boolean') {
    return memoryProfile.keepAwake;
  }
  const l1 = getL1Sync<GymProfile>(PROFILE_KEY, DEFAULT_PROFILE);
  return l1?.keepAwake ?? true;
}

export function getDefaultRestSecsSync(): number {
  const val = memoryProfile?.defaultRestSecs ?? getL1Sync<GymProfile>(PROFILE_KEY, DEFAULT_PROFILE)?.defaultRestSecs;
  return typeof val === 'number' && val >= 15 ? val : 90;
}

export function setKeepAwakeEnabledGlobal(enabled: boolean) {
  if (memoryProfile) {
    memoryProfile = { ...memoryProfile, keepAwake: enabled };
  }
  const l1 = getL1Sync<GymProfile>(PROFILE_KEY, DEFAULT_PROFILE);
  if (l1) {
    setL1Sync(PROFILE_KEY, { ...l1, keepAwake: enabled });
  }
  DeviceEventEmitter.emit('keep_awake_setting_changed', enabled);
}

export function setDefaultRestSecsGlobal(secs: number) {
  const clamped = Math.max(15, Math.min(600, Math.round(secs)));
  if (memoryProfile) {
    memoryProfile = { ...memoryProfile, defaultRestSecs: clamped };
  }
  const l1 = getL1Sync<GymProfile>(PROFILE_KEY, DEFAULT_PROFILE);
  if (l1) {
    setL1Sync(PROFILE_KEY, { ...l1, defaultRestSecs: clamped });
  }
  DeviceEventEmitter.emit('default_rest_setting_changed', clamped);
}

export function getGymProfileSync(): GymProfile {
  return memoryProfile || getL1Sync<GymProfile>(PROFILE_KEY, DEFAULT_PROFILE) || DEFAULT_PROFILE;
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
  defaultRestSecs: 90,
  keepAwake: true,
};

let _activeProfileUid: string | null = null;
let _profileUnsub: (() => void) | null = null;

function ensureProfileSubscription(uid?: string | null) {
  if (!uid || uid === 'guest_local_user') return;
  if (uid === _activeProfileUid) return;
  if (_profileUnsub) {
    _profileUnsub();
    _profileUnsub = null;
  }
  _activeProfileUid = uid;
  const docRef = doc(db, COLLECTION.USER_PROFILES, uid);
  _profileUnsub = onSnapshot(docRef, snap => {
    if (snap.exists()) {
      const cloudData = (snap.data()?.gymProfile || snap.data()) as Partial<GymProfile> & { updatedAt?: number };
      const current = memoryProfile || getL1Sync<GymProfile>(PROFILE_KEY, DEFAULT_PROFILE);
      const currentTs = (current as any)?.updatedAt || 0;
      const cloudTs = cloudData?.updatedAt || 0;

      // Issue #23: Let cloud win when its timestamp is newer/equal, or when hydrating completed onboarding profile over uncompleted defaults
      if (cloudTs >= currentTs || (!current?.onboardingCompleted && Boolean(cloudData?.onboardingCompleted))) {
        const merged = normalizeGymProfileAliases({
          ...DEFAULT_PROFILE,
          ...(current || {}),
          ...cloudData,
        }) as GymProfile;
        memoryProfile = merged;
        setL1Sync(PROFILE_KEY, merged);
        AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(merged)).catch(() => {});
        DeviceEventEmitter.emit('gym_profile_updated', merged);
      }
    }
  }, () => {
    _activeProfileUid = null;
  });
}

export function useGymProfile() {
  const { user } = useCoreData();
  const initial = memoryProfile || getL1Sync<GymProfile>(PROFILE_KEY, DEFAULT_PROFILE);
  const [gymProfile, setGymProfile] = useState<GymProfile>(initial);
  const [profileLoaded, setProfileLoaded] = useState(true);
  const profileRef = useRef<GymProfile>(initial);

  // 1. Singleton Cloud Firestore real-time synchronization (Issue #36)
  useEffect(() => {
    if (user?.uid && !(user as any).isAnonymous) {
      ensureProfileSubscription(user.uid);
    }
  }, [user?.uid]);

  // Cross-component synchronisation via DeviceEventEmitter
  useEffect(() => {
    profileRef.current = memoryProfile || gymProfile;
    const sub = DeviceEventEmitter.addListener('gym_profile_updated', (updated: GymProfile) => {
      memoryProfile = updated;
      profileRef.current = updated;
      setGymProfile(updated);
    });
    const subLogout = DeviceEventEmitter.addListener('auth_state_changed', () => {
      if (_profileUnsub) {
        _profileUnsub();
        _profileUnsub = null;
      }
      _activeProfileUid = null;
      memoryProfile = null;
      setGymProfile(DEFAULT_PROFILE);
    });
    return () => {
      sub.remove();
      subLogout.remove();
    };
  }, []);

  const saveGymProfile = useCallback(async (profile: Partial<GymProfile>) => {
    const now = Date.now();
    const normalizedPatch = normalizeGymProfileAliases(profile);
    const next = normalizeGymProfileAliases({ ...profileRef.current, ...normalizedPatch, updatedAt: now }) as GymProfile;
    memoryProfile = next;
    profileRef.current = next;
    setGymProfile(next);
    setL1Sync(PROFILE_KEY, next);
    DeviceEventEmitter.emit('gym_profile_updated', next);
    if (next.hapticsEnabled !== undefined) {
      DeviceEventEmitter.emit('haptics_setting_changed', next.hapticsEnabled);
    }
    if (next.autoTimer !== undefined) {
      DeviceEventEmitter.emit('auto_timer_setting_changed', next.autoTimer);
    }
    if (next.audioCues !== undefined) {
      DeviceEventEmitter.emit('audio_cues_setting_changed', next.audioCues);
    }
    if (next.keepAwake !== undefined) {
      DeviceEventEmitter.emit('keep_awake_setting_changed', next.keepAwake);
    }
    if (next.defaultRestSecs !== undefined) {
      DeviceEventEmitter.emit('default_rest_setting_changed', next.defaultRestSecs);
    }
    if (next.unitIsLbs !== undefined) {
      DeviceEventEmitter.emit('weight_unit_changed', next.unitIsLbs);
    }
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));

    // Also persist to Cloud Firestore if user is authenticated and not anonymous
    if (user?.uid && !(user as any).isAnonymous) {
      const docRef = doc(db, COLLECTION.USER_PROFILES, user.uid);
      const payload = { gymProfile: next };
      safeWrite(
        () => setDoc(docRef, payload, { merge: true }),
        COLLECTION.USER_PROFILES,
        'set',
        payload,
        user.uid
      ).catch(() => {});
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
