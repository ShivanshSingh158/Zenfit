import AsyncStorage from '@react-native-async-storage/async-storage';
import { InteractionManager, DeviceEventEmitter, AppState } from 'react-native';
import { User } from 'firebase/auth';
import { formatLocalDateStr } from './dateUtils';

// ─── Pure JS RAM L1 Cache (0ms synchronous reads after boot) ──────────────────
export const L1_RAM_CACHE = new Map<string, any>();
let _isBootHydrated = false;
let _bootGenerationId = 0;

export function getL1Sync<T>(key: string, fallback: T): T {
  if (!L1_RAM_CACHE.has(key)) return fallback;
  const val = L1_RAM_CACHE.get(key);
  if (val === null || val === undefined || typeof val !== 'object') {
    return val as T;
  }
  if (Array.isArray(val)) {
    return [...val] as unknown as T;
  }
  return { ...val } as T;
}

function getPartitionedGymLogs(logs: any[]): any[] {
  if (!Array.isArray(logs) || logs.length === 0) return logs;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  const y = cutoffDate.getFullYear();
  const m = String(cutoffDate.getMonth() + 1).padStart(2, '0');
  const d = String(cutoffDate.getDate()).padStart(2, '0');
  const cutoffStr = `${y}-${m}-${d}`;
  const hot = logs.filter((l: any) => l?.date && l.date >= cutoffStr);
  return hot.length > 0 ? hot : logs;
}

const _l1WriteTimers = new Map<string, ReturnType<typeof setTimeout>>();
const _pendingL1Values = new Map<string, any>();

// Automatically flush pending debounced L1 writes when app goes to background / inactive (Issue #50)
AppState.addEventListener('change', nextState => {
  if (nextState === 'background' || nextState === 'inactive') {
    flushL1WriteTimers();
  }
});

export function flushL1WriteTimers(): void {
  for (const [key, timer] of _l1WriteTimers.entries()) {
    clearTimeout(timer);
    const pendingVal = _pendingL1Values.get(key);
    _pendingL1Values.delete(key);
    if (pendingVal !== undefined) {
      const valToPersist = (key === BOOT_KEYS.GYM_LOGS && Array.isArray(pendingVal)) ? getPartitionedGymLogs(pendingVal) : pendingVal;
      const serialized = typeof valToPersist === 'string' ? valToPersist : JSON.stringify(valToPersist);
      AsyncStorage.setItem(key, serialized).catch(() => {});
    }
  }
  _l1WriteTimers.clear();
}

export function setL1Sync<T>(key: string, value: T, immediate = false): void {
  L1_RAM_CACHE.set(key, value);
  const field = BOOT_KEY_TO_FIELD[key];
  if (field && _memoryBootCache) {
    _memoryBootCache = {
      ..._memoryBootCache,
      [field]: value,
    };
  }

  // Cap gymLogs disk storage to 90-day active partition to prevent CursorWindow overflow while maintaining 3-month history
  if (immediate) {
    const existing = _l1WriteTimers.get(key);
    if (existing) clearTimeout(existing);
    _l1WriteTimers.delete(key);
    _pendingL1Values.delete(key);
    const valToPersist = (key === BOOT_KEYS.GYM_LOGS && Array.isArray(value)) ? getPartitionedGymLogs(value) : value;
    const serialized = typeof valToPersist === 'string' ? valToPersist : JSON.stringify(valToPersist);
    AsyncStorage.setItem(key, serialized).catch(() => {});
    return;
  }

  // Fix #246: Only run JSON.stringify once when the 400ms debounce timer actually fires!
  _pendingL1Values.set(key, value);
  const existingTimer = _l1WriteTimers.get(key);
  if (existingTimer) clearTimeout(existingTimer);
  _l1WriteTimers.set(
    key,
    setTimeout(() => {
      _l1WriteTimers.delete(key);
      const latestVal = _pendingL1Values.has(key) ? _pendingL1Values.get(key) : (L1_RAM_CACHE.has(key) ? L1_RAM_CACHE.get(key) : value);
      _pendingL1Values.delete(key);
      const valToPersist = (key === BOOT_KEYS.GYM_LOGS && Array.isArray(latestVal)) ? getPartitionedGymLogs(latestVal) : latestVal;
      const serialized = typeof valToPersist === 'string' ? valToPersist : JSON.stringify(valToPersist);
      AsyncStorage.setItem(key, serialized).catch(() => {});
    }, 400)
  );
}

// Issue #45: deleteL1Sync now deletes from RAM AND removes key from AsyncStorage
export function deleteL1Sync(key: string): void {
  L1_RAM_CACHE.delete(key);
  _pendingL1Values.delete(key);
  const existingTimer = _l1WriteTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
    _l1WriteTimers.delete(key);
  }
  AsyncStorage.removeItem(key).catch(() => {});
}

export function isL1BootHydrated(): boolean {
  return _isBootHydrated;
}

export const EXERCISE_LEDGER_KEY = '@zentrack_exercise_ledger_v1';
export const ONBOARDING_FLOW_KEY = 'zenfit_onboarding_flow_done_v3';
export const GYM_ARCHIVE_YEARS_KEY = '@zentrack_gym_archive_years';

// Issue #37: Dynamically construct Auth User key from environment
const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCWZ_tUzZynf60lxC3-RweGfZRGlcHBz_s';

export const BOOT_KEYS = {
  NAV_ROUTE:          '@zentrack_last_route',
  OPTIMISTIC_USER:    '@zentrack_optimistic_user',
  THEME_MODE:         '@zentrack_theme',
  GYM_LOGS:           '@zentrack_cache_gym_logs',
  USER_GYM_PLAN:      '@zentrack_cache_user_gym_plan',
  WATER_LOGS:         '@zentrack_cache_water_logs',
  SLEEP_LOGS:         '@zentrack_cache_sleep_logs',
  WEIGHT_LOGS:        '@zentrack_cache_weight_logs',
  FIREBASE_AUTH_USER: `firebase:authUser:${FIREBASE_API_KEY}:[DEFAULT]`,
} as const;

// Tier-0 keys required for Frame-0 Auth, Theme, Navigation, Profile, & Working Sets Ledger (<5ms)
const todayDateStr = formatLocalDateStr(new Date());
const TIER_0_KEYS = [
  BOOT_KEYS.OPTIMISTIC_USER,
  BOOT_KEYS.FIREBASE_AUTH_USER,
  BOOT_KEYS.THEME_MODE,
  BOOT_KEYS.GYM_LOGS,
  BOOT_KEYS.USER_GYM_PLAN,
  '@zenfit_guest_mode_v1',
  'gym_profile_v1',
  BOOT_KEYS.WATER_LOGS,
  BOOT_KEYS.NAV_ROUTE,
  EXERCISE_LEDGER_KEY,
  ONBOARDING_FLOW_KEY,
  `@zenfit_hot_log_${todayDateStr}`,
  '@zentrack_active_workout_state',
  '@zenfit_global_rest_timer',
  'zentrack_gym_settings_prefs_v1',
] as const;

// Tier-1 heavy secondary domain caches hydrated after Frame 0 settles
const TIER_1_KEYS = [
  BOOT_KEYS.SLEEP_LOGS,
  BOOT_KEYS.WEIGHT_LOGS,
] as const;

export interface BootManifest {
  lastRoute: string;
  onboarded: boolean;
  optimisticUser: User | null;
  themeMode: 'dark' | 'light' | 'system' | null;
  gymLogs: any[];
  userGymPlan: any | null;
  waterLogs: any[];
  sleepLogs: any[];
  weightLogs: any[];
  waterGoalMl?: number;
  googleAccessToken?: string | null;
  xp?: number;
  notifFingerprint?: string | null;
}

const FIELD_TO_BOOT_KEY: Partial<Record<keyof BootManifest, string>> = {
  gymLogs: BOOT_KEYS.GYM_LOGS,
  userGymPlan: BOOT_KEYS.USER_GYM_PLAN,
  waterLogs: BOOT_KEYS.WATER_LOGS,
  sleepLogs: BOOT_KEYS.SLEEP_LOGS,
  weightLogs: BOOT_KEYS.WEIGHT_LOGS,
  optimisticUser: BOOT_KEYS.OPTIMISTIC_USER,
  themeMode: BOOT_KEYS.THEME_MODE,
  lastRoute: BOOT_KEYS.NAV_ROUTE,
};

const BOOT_KEY_TO_FIELD: Record<string, keyof BootManifest> = {
  [BOOT_KEYS.GYM_LOGS]: 'gymLogs',
  [BOOT_KEYS.USER_GYM_PLAN]: 'userGymPlan',
  [BOOT_KEYS.WATER_LOGS]: 'waterLogs',
  [BOOT_KEYS.SLEEP_LOGS]: 'sleepLogs',
  [BOOT_KEYS.WEIGHT_LOGS]: 'weightLogs',
  [BOOT_KEYS.OPTIMISTIC_USER]: 'optimisticUser',
  [BOOT_KEYS.THEME_MODE]: 'themeMode',
  [BOOT_KEYS.NAV_ROUTE]: 'lastRoute',
};

let _memoryBootCache: BootManifest | null = null;
let _bootPromise: Promise<BootManifest> | null = null;

function parseJsonArray<T = any>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function loadBootManifest(): Promise<BootManifest> {
  if (_memoryBootCache) return _memoryBootCache;
  if (_bootPromise) return _bootPromise;

  const bootGen = _bootGenerationId;

  _bootPromise = (async () => {
    try {
      const pairs = await AsyncStorage.multiGet([...TIER_0_KEYS]);
      if (bootGen !== _bootGenerationId) {
        const fallback: BootManifest = {
          lastRoute: 'Today',
          onboarded: true,
          optimisticUser: null,
          themeMode: null,
          gymLogs: [],
          userGymPlan: null,
          waterLogs: [],
          sleepLogs: [],
          weightLogs: [],
        };
        return fallback;
      }
      const map = new Map<string, string | null>(pairs);

      const lastRoute = map.get(BOOT_KEYS.NAV_ROUTE) || 'Today';

      let optimisticUser: User | null = null;
      const userRaw = map.get(BOOT_KEYS.OPTIMISTIC_USER) || map.get(BOOT_KEYS.FIREBASE_AUTH_USER);
      if (userRaw) {
        try {
          const parsed = JSON.parse(userRaw);
          if (parsed && parsed.uid) optimisticUser = parsed as User;
        } catch {}
      }

      const themeRaw = map.get(BOOT_KEYS.THEME_MODE);
      const themeMode = (themeRaw === 'dark' || themeRaw === 'light' || themeRaw === 'system') ? themeRaw : null;

      let gymLogs = parseJsonArray(map.get(BOOT_KEYS.GYM_LOGS));
      if (gymLogs.length === 0) {
        try {
          const bakRaw = await AsyncStorage.getItem('@zentrack_cache_gym_logs_bak');
          if (bakRaw) {
            const bak = parseJsonArray(bakRaw);
            if (bak.length > 0) gymLogs = bak;
          }
        } catch {}
      }

      // Tier-1 Upgrade #70: Check for sharded hot active log and overlay from map
      try {
        const todayStr = formatLocalDateStr(new Date());
        const hotRaw = map.get(`@zenfit_hot_log_${todayStr}`);
        if (hotRaw) {
          const hotLog = JSON.parse(hotRaw);
          if (hotLog && hotLog.date === todayStr) {
            const currentUserId = optimisticUser?.uid;
            // Issue #51: verify hotLog.userId === optimisticUser.uid before overlaying
            const userMatches = (!hotLog.userId && !currentUserId) || (hotLog.userId && hotLog.userId === currentUserId);
            if (userMatches) {
              const idx = gymLogs.findIndex((l: any) => l.date === todayStr);
              if (idx !== -1) {
                // Issue #51: skip overlay if existing log is completed and hotLog is not completed
                const existingCompleted = gymLogs[idx].completed === true;
                if (!existingCompleted) {
                  const existingUpdatedAt = typeof gymLogs[idx].updatedAt === 'number' ? gymLogs[idx].updatedAt : 0;
                  const hotUpdatedAt = typeof hotLog.updatedAt === 'number' ? hotLog.updatedAt : 0;
                  if (hotUpdatedAt >= existingUpdatedAt) {
                    gymLogs[idx] = { ...gymLogs[idx], ...hotLog };
                  }
                }
              } else {
                gymLogs.unshift(hotLog);
              }
            }
          }
        }
      } catch {}
      const waterLogs = parseJsonArray(map.get(BOOT_KEYS.WATER_LOGS));

      let userGymPlan: any = null;
      const gymPlanRaw = map.get(BOOT_KEYS.USER_GYM_PLAN);
      if (gymPlanRaw) {
        try { userGymPlan = JSON.parse(gymPlanRaw); } catch {}
      }

      const guestRaw = map.get('@zenfit_guest_mode_v1');
      const isGuest = guestRaw === 'true';

      // Exercise Ledger Hydration (Issue #10)
      const ledgerRaw = map.get(EXERCISE_LEDGER_KEY);
      if (ledgerRaw) {
        try {
          const parsedLedger = JSON.parse(ledgerRaw);
          if (parsedLedger && typeof parsedLedger === 'object') {
            L1_RAM_CACHE.set(EXERCISE_LEDGER_KEY, parsedLedger);
          }
        } catch {}
      } else if (!L1_RAM_CACHE.has(EXERCISE_LEDGER_KEY)) {
        L1_RAM_CACHE.set(EXERCISE_LEDGER_KEY, {});
      }

      // Onboarding flag hydration (Issue #8)
      const onboardingRaw = map.get(ONBOARDING_FLOW_KEY);
      if (onboardingRaw) {
        L1_RAM_CACHE.set(ONBOARDING_FLOW_KEY, onboardingRaw === 'true');
      }

      // Direct L1 RAM hydration: 0 redundant JSON.parse calls across large arrays
      if (optimisticUser) {
        L1_RAM_CACHE.set(BOOT_KEYS.OPTIMISTIC_USER, optimisticUser);
        L1_RAM_CACHE.set(BOOT_KEYS.FIREBASE_AUTH_USER, optimisticUser);
      }
      if (themeMode) L1_RAM_CACHE.set(BOOT_KEYS.THEME_MODE, themeMode);
      L1_RAM_CACHE.set(BOOT_KEYS.GYM_LOGS, gymLogs);
      if (userGymPlan) L1_RAM_CACHE.set(BOOT_KEYS.USER_GYM_PLAN, userGymPlan);
      L1_RAM_CACHE.set(BOOT_KEYS.WATER_LOGS, waterLogs);
      L1_RAM_CACHE.set('@zenfit_guest_mode_v1', isGuest);
      L1_RAM_CACHE.set(BOOT_KEYS.NAV_ROUTE, lastRoute);

      const profileRaw = map.get('gym_profile_v1');
      if (profileRaw) {
        try { L1_RAM_CACHE.set('gym_profile_v1', JSON.parse(profileRaw)); } catch {}
      }

      const activeWorkoutRaw = map.get('@zentrack_active_workout_state');
      if (activeWorkoutRaw) {
        try { L1_RAM_CACHE.set('@zentrack_active_workout_state', JSON.parse(activeWorkoutRaw)); } catch {}
      }

      const restTimerRaw = map.get('@zenfit_global_rest_timer');
      if (restTimerRaw) {
        try { L1_RAM_CACHE.set('@zenfit_global_rest_timer', JSON.parse(restTimerRaw)); } catch {}
      }

      const gymPrefsRaw = map.get('zentrack_gym_settings_prefs_v1');
      if (gymPrefsRaw) {
        try { L1_RAM_CACHE.set('zentrack_gym_settings_prefs_v1', JSON.parse(gymPrefsRaw)); } catch {}
      }

      const manifest: BootManifest = {
        lastRoute,
        onboarded: onboardingRaw === 'true',
        optimisticUser,
        themeMode,
        gymLogs,
        userGymPlan,
        waterLogs,
        sleepLogs: [],
        weightLogs: [],
      };

      _memoryBootCache = manifest;
      _isBootHydrated = true;

// Analytics precomputation scheduled centrally by PrecomputeEngine

      // Hydrate Tier-1 secondary caches + Cold Archive Years off the critical startup path (Issue #4)
      InteractionManager.runAfterInteractions(async () => {
        try {
          const tier1Pairs = await AsyncStorage.multiGet([...TIER_1_KEYS, GYM_ARCHIVE_YEARS_KEY]);
          const t1 = new Map<string, string | null>(tier1Pairs);
          for (const [k, raw] of tier1Pairs) {
            if (raw && !L1_RAM_CACHE.has(k)) {
              try { L1_RAM_CACHE.set(k, JSON.parse(raw)); } catch { L1_RAM_CACHE.set(k, raw); }
            }
          }
          if (_memoryBootCache) {
            _memoryBootCache = {
              ..._memoryBootCache,
              sleepLogs: _liveUpdatedKeys.has('sleepLogs') ? _memoryBootCache.sleepLogs : parseJsonArray(t1.get(BOOT_KEYS.SLEEP_LOGS)),
              weightLogs: _liveUpdatedKeys.has('weightLogs') ? _memoryBootCache.weightLogs : parseJsonArray(t1.get(BOOT_KEYS.WEIGHT_LOGS)),
            };
          }

          // Hydrate Cold Archives partitioned by year
          const rawYears = t1.get(GYM_ARCHIVE_YEARS_KEY);
          let archiveYears: string[] = [];
          if (rawYears !== null && rawYears !== undefined) {
            try { archiveYears = JSON.parse(rawYears); } catch {}
          } else {
            // First time check or legacy migration: only scan getAllKeys if GYM_ARCHIVE_YEARS_KEY is completely unset
            const allKeys = await AsyncStorage.getAllKeys();
            archiveYears = allKeys
              .filter(k => k.startsWith('@zentrack_cache_gym_archive_'))
              .map(k => k.replace('@zentrack_cache_gym_archive_', ''));
            AsyncStorage.setItem(GYM_ARCHIVE_YEARS_KEY, JSON.stringify(archiveYears)).catch(() => {});
          }

          if (archiveYears.length > 0) {
            const archiveKeys = archiveYears.map(yr => `@zentrack_cache_gym_archive_${yr}`);
            const archivePairs = await AsyncStorage.multiGet(archiveKeys);
            const coldLogs: any[] = [];
            for (const [, rawVal] of archivePairs) {
              if (rawVal) {
                const parsed = parseJsonArray(rawVal);
                if (parsed.length > 0) coldLogs.push(...parsed);
              }
            }

            if (coldLogs.length > 0 && _memoryBootCache) {
              const currentGymLogs = _memoryBootCache.gymLogs || [];
              const byId = new Map<string, any>();
              const seenDates = new Set<string>();
              for (const l of currentGymLogs) {
                if (l) {
                  if (l.date) seenDates.add(l.date);
                  if (l.id) byId.set(l.id, l);
                  if (l.date) byId.set(l.date, l);
                }
              }
              let addedCount = 0;
              for (const cl of coldLogs) {
                if (!cl) continue;
                // Issue #53: Key cold archive hydration by date and id to prevent duplicate workouts
                const hasDate = cl.date && seenDates.has(cl.date);
                const hasId = cl.id && byId.has(cl.id);
                if (!hasDate && !hasId) {
                  const key = cl.id || cl.date;
                  if (key) {
                    byId.set(key, cl);
                    if (cl.date) seenDates.add(cl.date);
                    addedCount++;
                  }
                }
              }

              if (addedCount > 0) {
                const fullMerged = Array.from(byId.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                _memoryBootCache = {
                  ..._memoryBootCache,
                  gymLogs: fullMerged,
                };
                L1_RAM_CACHE.set(BOOT_KEYS.GYM_LOGS, fullMerged);
                // Notify running screens and WellnessContext that full historical archive has hydrated
                DeviceEventEmitter.emit('gym_logs_changed', { gymLogs: fullMerged });
              }
            }
          }
        } catch (t1Err) {
          console.warn('[BootManifest] Error during Tier-1 hydration:', t1Err);
        }
      });

      return manifest;
    } catch (e) {
      console.warn('[BootManifest] Failed to load boot manifest, falling back to defaults:', e);
      const fallback: BootManifest = {
        lastRoute: 'Today',
        onboarded: true,
        optimisticUser: null,
        themeMode: null,
        gymLogs: [],
        userGymPlan: null,
        waterLogs: [],
        sleepLogs: [],
        weightLogs: [],
      };
      _memoryBootCache = fallback;
      return fallback;
    } finally {
      _isBootHydrated = true;
      _bootPromise = null;
    }
  })();

  return _bootPromise;
}

export function getBootManifestSync(): BootManifest | null {
  return _memoryBootCache;
}

const _liveUpdatedKeys = new Set<keyof BootManifest>();

export function updateL1Cache<K extends keyof BootManifest>(key: K, value: BootManifest[K]): void {
  _liveUpdatedKeys.add(key);
  if (_memoryBootCache) {
    _memoryBootCache = {
      ..._memoryBootCache,
      [key]: value,
    };
  }
  const bootKey = FIELD_TO_BOOT_KEY[key];
  if (bootKey) {
    L1_RAM_CACHE.set(bootKey, value);
  }
}

export function clearBootManifest(): void {
  _bootGenerationId++;
  for (const timer of _l1WriteTimers.values()) {
    clearTimeout(timer);
  }
  _l1WriteTimers.clear();
  _pendingL1Values.clear();
  _memoryBootCache = null;
  _bootPromise = null;
  _isBootHydrated = false;
  L1_RAM_CACHE.clear();
  _liveUpdatedKeys.clear();
}
