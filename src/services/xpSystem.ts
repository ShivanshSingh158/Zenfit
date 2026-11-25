// src/services/xpSystem.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, AppState } from 'react-native';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { db, auth } from './firebase';
import { updateL1Cache, getBootManifestSync, getL1Sync, setL1Sync } from '../utils/bootManifest';
import { safeWrite } from '../utils/safeWrite';
import { COLLECTION } from '../config/constants';

const XP_KEY            = 'zentrack_xp_v1';
const STREAK_KEY        = 'zentrack_xp_streak';
const REWARDED_KEYS_KEY = '@zentrack_xp_rewarded_keys_v1';
const MAX_REWARDED_KEYS = 500;

export const LEVEL_THRESHOLDS = [
  0,        //  0 — Seeker
  1000,     //  1 — Warden
  3000,     //  2 — Sentinel
  7000,     //  3 — Guardian
  14000,    //  4 — Vanguard
  27000,    //  5 — Luminary
  59500,    //  6 — Legend
  110000,   //  7 — Mythic
  180000,   //  8 — Paragon
  270000,   //  9 — Titan
  390000,   // 10 — Ascendant
  550000,   // 11 — Exalted
  760000,   // 12 — Sovereign
  1030000,  // 13 — Archon
  1380000,  // 14 — Celestial
  1820000,  // 15 — Ethereal
  2380000,  // 16 — Empyrean
  3080000,  // 17 — Astral
  3950000,  // 18 — Zenith
  5000000,  // 19 — Apex
];

export const LEVEL_TITLES = [
  'Seeker',
  'Warden',
  'Sentinel',
  'Guardian',
  'Vanguard',
  'Luminary',
  'Legend',
  'Mythic',
  'Paragon',
  'Titan',
  'Ascendant',
  'Exalted',
  'Sovereign',
  'Archon',
  'Celestial',
  'Ethereal',
  'Empyrean',
  'Astral',
  'Zenith',
  'Apex',
];

export const XP_SOURCES = {
  GYM_SET:          { base: 10, range: 5  },
  GYM_SESSION:      { base: 150, range: 50 },
  GYM_PR:           { base: 300, range: 200 },
  ONBOARDING:       { base: 500, range: 0 },
  STEP_GOAL_HIT:    { base: 100, range: 50 },
};

const SURPRISE_CHANCE = 0.10;
const SURPRISE_MIN    = 150;
const SURPRISE_MAX    = 400;

export interface XPResult {
  totalXP:   number;
  added:     number;
  bonus:     boolean;
  bonusXP:   number;
  leveledUp: boolean;
  newLevel:  number;
  newTitle:  string;
}

export interface XPState {
  xp:            number;
  level:         number;
  title:         string;
  nextThreshold: number;
  progress:      number;
}

let _inMemoryXP: number | null = null;
let _rewardedKeysSet: Set<string> | null = null;
let _xpFlushTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingXPToSync: { uid: string; xp: number } | null = null;
let _pendingXPDelta = 0;

function cancelPendingXPCloudFlush(): void {
  if (_xpFlushTimer) {
    clearTimeout(_xpFlushTimer);
    _xpFlushTimer = null;
  }
  _pendingXPToSync = null;
  _pendingXPDelta = 0;
}

export function clearXPMemory(): void {
  cancelPendingXPCloudFlush();
  _inMemoryXP = null;
  _rewardedKeysSet = null;
}

async function getRewardedKeysSet(): Promise<Set<string>> {
  if (_rewardedKeysSet) return _rewardedKeysSet;
  const cached = getL1Sync<string[] | null>(REWARDED_KEYS_KEY, null);
  if (Array.isArray(cached)) {
    _rewardedKeysSet = new Set(cached);
    return _rewardedKeysSet;
  }
  try {
    const raw = await AsyncStorage.getItem(REWARDED_KEYS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    _rewardedKeysSet = new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    _rewardedKeysSet = new Set();
  }
  return _rewardedKeysSet;
}

export async function syncXPWithFirestore(firestoreXP: number): Promise<void> {
  if (typeof firestoreXP !== 'number' || !Number.isFinite(firestoreXP)) return;

  if (_inMemoryXP === null) {
    const bootXp = getBootManifestSync()?.xp;
    if (typeof bootXp === 'number' && bootXp > 0) {
      _inMemoryXP = bootXp;
    } else {
      const stored = await AsyncStorage.getItem(XP_KEY).catch(() => null);
      _inMemoryXP = stored ? (parseInt(stored, 10) || 0) : 0;
    }
  }

  const currentLocal = Math.max(0, _inMemoryXP ?? 0);

  if (firestoreXP >= currentLocal) {
    // If Firestore is already ahead of or equal to local, clear any pending delta that was already folded in
    cancelPendingXPCloudFlush();
    _inMemoryXP = firestoreXP;
    updateL1Cache('xp', firestoreXP);
    AsyncStorage.setItem(XP_KEY, String(firestoreXP)).catch(() => {});
    try {
      DeviceEventEmitter.emit('zentrack_xp_updated', {
        xp: firestoreXP,
        added: 0,
        source: 'firestore_sync',
      });
    } catch {}
  } else if (currentLocal > firestoreXP && auth.currentUser?.uid) {
    // Fix #29: Cancel pending relative increment before pushing absolute currentLocal so delta is never double-counted!
    cancelPendingXPCloudFlush();
    const uid = auth.currentUser.uid;
    safeWrite(
      () => setDoc(doc(db, COLLECTION.USER_PROFILES, uid), { xp: currentLocal }, { merge: true }),
      COLLECTION.USER_PROFILES,
      'set',
      { xp: currentLocal },
      uid
    ).catch(() => {});
  }
}

export async function getXP(): Promise<number> {
  if (_inMemoryXP !== null) return Math.max(0, _inMemoryXP);

  const bootManifest = getBootManifestSync();
  if (bootManifest && typeof bootManifest.xp === 'number' && bootManifest.xp > 0) {
    _inMemoryXP = bootManifest.xp;
    return _inMemoryXP;
  }

  try {
    const stored = await AsyncStorage.getItem(XP_KEY);
    if (stored !== null) {
      _inMemoryXP = Math.max(0, parseInt(stored, 10) || 0);
      updateL1Cache('xp', _inMemoryXP);
      return _inMemoryXP;
    }

    const uid = auth.currentUser?.uid;
    if (uid) {
      const snap = await getDoc(doc(db, COLLECTION.USER_PROFILES, uid));
      if (snap.exists()) {
        const firestoreXP = Math.max(0, Number(snap.data()?.xp) || 0);
        _inMemoryXP = firestoreXP;
        updateL1Cache('xp', firestoreXP);
        await AsyncStorage.setItem(XP_KEY, String(firestoreXP));
        return firestoreXP;
      }
    }
    _inMemoryXP = 0;
    updateL1Cache('xp', 0);
    return 0;
  } catch {
    _inMemoryXP = 0;
    return 0;
  }
}

export function getLevel(rawXp: number): XPState {
  const xp = Math.max(0, Number.isFinite(rawXp) ? rawXp : 0);
  let level = 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }

  const currentThreshold = LEVEL_THRESHOLDS[level];
  const nextThreshold    = LEVEL_THRESHOLDS[level + 1] ?? LEVEL_THRESHOLDS[level] * 2;
  const rangeSize        = Math.max(1, nextThreshold - currentThreshold);
  const progress         = Math.max(0, Math.min((xp - currentThreshold) / rangeSize, 1));

  return {
    xp,
    level,
    title: LEVEL_TITLES[level] ?? 'Apex',
    nextThreshold,
    progress,
  };
}

export function flushPendingXPCloudSync(): void {
  if (!_pendingXPToSync || _pendingXPDelta <= 0) return;
  const { uid } = _pendingXPToSync;
  const deltaToFlush = _pendingXPDelta;
  cancelPendingXPCloudFlush();

  safeWrite(
    () => setDoc(doc(db, COLLECTION.USER_PROFILES, uid), {
      xp: increment(deltaToFlush),
      lastXpAwardedAt: Date.now(),
    }, { merge: true }),
    COLLECTION.USER_PROFILES,
    'set',
    {
      xp: { __zentrackIncrement: deltaToFlush },
      lastXpAwardedAt: Date.now(),
    },
    uid,
    true
  ).catch(e => console.warn('[XP] Firestore safeWrite failed:', e));
}

function scheduleXPCloudFlush(uid: string, xpToSync: number, delta: number): void {
  _pendingXPToSync = { uid, xp: xpToSync };
  _pendingXPDelta += delta;
  if (_xpFlushTimer) clearTimeout(_xpFlushTimer);
  _xpFlushTimer = setTimeout(() => {
    flushPendingXPCloudSync();
  }, 30000);
}

/**
 * Awards XP with optional deterministic `idempotencyKey` to prevent duplicate farming (#29).
 */
export async function awardXP(
  source: keyof typeof XP_SOURCES,
  idempotencyKey?: string
): Promise<XPResult> {
  const currentXP = await getXP();
  const currentState = getLevel(currentXP);

  if (idempotencyKey) {
    const rewardedSet = await getRewardedKeysSet();
    if (rewardedSet.has(idempotencyKey)) {
      return {
        totalXP: currentXP,
        added: 0,
        bonus: false,
        bonusXP: 0,
        leveledUp: false,
        newLevel: currentState.level,
        newTitle: currentState.title,
      };
    }
    rewardedSet.add(idempotencyKey);
    if (rewardedSet.size > MAX_REWARDED_KEYS) {
      const oldest = rewardedSet.values().next().value;
      if (oldest) rewardedSet.delete(oldest);
    }
    setL1Sync(REWARDED_KEYS_KEY, Array.from(rewardedSet));
  }

  const config = XP_SOURCES[source] || { base: 30, range: 10 };
  const baseAwarded = config.base + Math.floor(Math.random() * (config.range + 1));

  const surpriseTriggered = Math.random() < SURPRISE_CHANCE;
  const bonusXP = surpriseTriggered
    ? SURPRISE_MIN + Math.floor(Math.random() * (SURPRISE_MAX - SURPRISE_MIN))
    : 0;

  const totalAdded = baseAwarded + bonusXP;
  const previousLevel = currentState.level;

  const newXP = currentXP + totalAdded;
  _inMemoryXP = newXP;
  updateL1Cache('xp', newXP);

  AsyncStorage.setItem(XP_KEY, String(newXP)).catch(() => {});

  try {
    DeviceEventEmitter.emit('zentrack_xp_updated', {
      xp: newXP,
      added: totalAdded,
      source,
      surprise: surpriseTriggered,
      bonusXP,
    });
  } catch {}

  const uid = auth.currentUser?.uid;
  if (uid) {
    scheduleXPCloudFlush(uid, newXP, totalAdded);
  }

  const newState = getLevel(newXP);

  return {
    totalXP:   newXP,
    added:     totalAdded,
    bonus:     surpriseTriggered,
    bonusXP,
    leveledUp: newState.level > previousLevel,
    newLevel:  newState.level,
    newTitle:  newState.title,
  };
}

export async function getXPState(): Promise<XPState> {
  const xp = await getXP();
  return getLevel(xp);
}

export function subscribeXPChanges(callback: (data: { xp: number; added: number; source?: string }) => void): () => void {
  const sub = DeviceEventEmitter.addListener('zentrack_xp_updated', callback);
  return () => sub.remove();
}

export async function resetAllXP(clearRemote = false): Promise<void> {
  cancelPendingXPCloudFlush();
  _inMemoryXP = 0;
  _rewardedKeysSet = new Set();
  updateL1Cache('xp', 0);
  setL1Sync(REWARDED_KEYS_KEY, [], true);
  await AsyncStorage.multiSet([
    [XP_KEY, '0'],
    [STREAK_KEY, '0'],
    [REWARDED_KEYS_KEY, '[]'],
  ]);
  try {
    DeviceEventEmitter.emit('zentrack_xp_updated', {
      xp: 0,
      added: 0,
      source: 'reset',
    });
  } catch {}
  if (clearRemote) {
    const uid = auth.currentUser?.uid;
    if (uid) {
      safeWrite(
        () => setDoc(doc(db, COLLECTION.USER_PROFILES, uid), { xp: 0 }, { merge: true }),
        COLLECTION.USER_PROFILES,
        'set',
        { xp: 0 },
        uid
      ).catch(e => console.warn('[XP] Firestore reset failed:', e?.message));
    }
  }
}

export async function resetXP(): Promise<void> {
  return resetAllXP(true);
}

AppState.addEventListener('change', nextState => {
  if (nextState === 'background' || nextState === 'inactive') {
    flushPendingXPCloudSync();
  }
});
