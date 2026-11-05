import AsyncStorage from '@react-native-async-storage/async-storage';
import { InteractionManager } from 'react-native';
import { User } from 'firebase/auth';

// ─── Pure JS RAM L1 Cache (0ms synchronous reads after boot) ──────────────────
export const L1_RAM_CACHE = new Map<string, any>();
let _isBootHydrated = false;

export function getL1Sync<T>(key: string, fallback: T): T {
  return L1_RAM_CACHE.has(key) ? (L1_RAM_CACHE.get(key) as T) : fallback;
}

export function setL1Sync<T>(key: string, value: T): void {
  L1_RAM_CACHE.set(key, value);
  AsyncStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)).catch(() => {});
}

export function deleteL1Sync(key: string): void {
  L1_RAM_CACHE.delete(key);
}

export function isL1BootHydrated(): boolean {
  return _isBootHydrated;
}

export const BOOT_KEYS = {
  NAV_ROUTE:          '@zentrack_last_route',
  ONBOARDING:         '@zentrack_onboarding_completed',
  ONBOARDING_V2:      'zentrack_onboarded_v2',
  OPTIMISTIC_USER:    '@zentrack_optimistic_user',
  PINNED_MODULES:     '@zentrack_pinned_modules',
  TASKS:              '@zentrack_cache_tasks',
  HABITS:             '@zentrack_cache_habits',
  HABIT_LOGS:         '@zentrack_cache_habitlogs',
  DASH_LAYOUT:        '@zentrack_dashboard_layout',
  WATER_GOAL_CANON:   'zentrack_water_goal_ml',
  WATER_GOAL_LEGACY:  '@zentrack_water_target',
  GOOGLE_TOKEN:       'google_workspace_token',
  THEME_MODE:         '@zentrack_theme',
  XP_V1:              'zentrack_xp_v1',
  ATTENDANCE:         '@zentrack_cache_attendance',
  ATTENDANCE_LOGS:    '@zentrack_cache_attendance_logs',
  ASSIGNMENTS:        '@zentrack_cache_assignments',
  SEMESTERS:          '@zentrack_cache_semesters',
  SEM_SUBJECTS:       '@zentrack_cache_sem_subjects',
  HOLIDAYS:           '@zentrack_cache_holidays',
  GYM_LOGS:           '@zentrack_cache_gym_logs',
  USER_GYM_PLAN:      '@zentrack_cache_user_gym_plan',
  WATER_LOGS:         '@zentrack_cache_water_logs',
  SLEEP_LOGS:         '@zentrack_cache_sleep_logs',
  WEIGHT_LOGS:        '@zentrack_cache_weight_logs',
  CUSTOM_EVENTS:      '@zentrack_cache_custom_events',
  GOALS:              '@zentrack_cache_goals',
  WEEKLY_REVIEWS:     '@zentrack_cache_weekly_reviews',
  STORAGE_NODES:      '@zentrack_cache_storage_nodes',
  LEARNING_TOPICS:    '@zentrack_cache_learning_topics',
  JOBS:               '@zentrack_cache_jobs',
  CONTENT_LOGS:       '@zentrack_cache_content_logs',
  NOTIF_FINGERPRINT:  '@zentrack_notif_fingerprint',
  FIREBASE_AUTH_USER: 'firebase:authUser:AIzaSyCWZ_tUzZynf60lxC3-RweGfZRGlcHBz_s:[DEFAULT]',
} as const;

// Tier-0 keys required for Frame-0 Auth, Theme, Navigation & Gym Dashboard paint (<5ms)
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
  pinnedModules: string[];
  tasks: any[];
  habits: any[];
  habitLogs: any[];
  dashboardLayout: any[] | null;
  waterGoalMl: number;
  googleAccessToken: string | null;
  themeMode: 'dark' | 'light' | 'system' | null;
  xp: number;
  attendance: any[];
  attendanceLogs: any[];
  assignments: any[];
  semesters: any[];
  semesterSubjects: any[];
  holidays: string[];
  gymLogs: any[];
  userGymPlan: any | null;
  waterLogs: any[];
  sleepLogs: any[];
  weightLogs: any[];
  customEvents: any[];
  goals: any[];
  weeklyReviews: any[];
  storageNodes: any[];
  learningTopics: any[];
  jobs: any[];
  contentLogs: any[];
  notifFingerprint: string | null;
}

const DEFAULT_PINNED = ['Tasks', 'Gym', 'Calendar', 'Attendance'];
const DEFAULT_WATER_GOAL = 3800;

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

  _bootPromise = (async () => {
    try {
      const pairs = await AsyncStorage.multiGet([...TIER_0_KEYS]);
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
      const waterLogs = parseJsonArray(map.get(BOOT_KEYS.WATER_LOGS));

      let userGymPlan: any = null;
      const gymPlanRaw = map.get(BOOT_KEYS.USER_GYM_PLAN);
      if (gymPlanRaw) {
        try { userGymPlan = JSON.parse(gymPlanRaw); } catch {}
      }

      const guestRaw = map.get('@zenfit_guest_mode_v1');
      const isGuest = guestRaw === 'true';

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

      const manifest: BootManifest = {
        lastRoute,
        onboarded: true,
        optimisticUser,
        pinnedModules: DEFAULT_PINNED,
        tasks: [],
        habits: [],
        habitLogs: [],
        dashboardLayout: null,
        waterGoalMl: DEFAULT_WATER_GOAL,
        googleAccessToken: null,
        themeMode,
        xp: 0,
        attendance: [],
        attendanceLogs: [],
        assignments: [],
        semesters: [],
        semesterSubjects: [],
        holidays: [],
        gymLogs,
        userGymPlan,
        waterLogs,
        sleepLogs: [],
        weightLogs: [],
        customEvents: [],
        goals: [],
        weeklyReviews: [],
        storageNodes: [],
        learningTopics: [],
        jobs: [],
        contentLogs: [],
        notifFingerprint: null,
      };

      _memoryBootCache = manifest;
      _isBootHydrated = true;


      // Defer analytics precomputation to idle frame off the critical startup path
      if (gymLogs && gymLogs.length > 0) {
        InteractionManager.runAfterInteractions(() => {
          try {
            const { precomputeGymAnalytics } = require('../services/gymAnalyticsPrecompute');
            precomputeGymAnalytics(gymLogs, userGymPlan, false);
          } catch (_) {}
        });
      }

      // Hydrate Tier-1 secondary caches off the critical startup path
      InteractionManager.runAfterInteractions(() => {
        AsyncStorage.multiGet([...TIER_1_KEYS])
          .then(tier1Pairs => {
            if (!_memoryBootCache) return;
            const t1 = new Map<string, string | null>(tier1Pairs);
            for (const [k, raw] of tier1Pairs) {
              if (raw && !L1_RAM_CACHE.has(k)) {
                try { L1_RAM_CACHE.set(k, JSON.parse(raw)); } catch { L1_RAM_CACHE.set(k, raw); }
              }
            }
            _memoryBootCache = {
              ..._memoryBootCache,
              assignments: _liveUpdatedKeys.has('assignments') ? _memoryBootCache.assignments : parseJsonArray(t1.get(BOOT_KEYS.ASSIGNMENTS)),
              semesters: _liveUpdatedKeys.has('semesters') ? _memoryBootCache.semesters : parseJsonArray(t1.get(BOOT_KEYS.SEMESTERS)),
              semesterSubjects: _liveUpdatedKeys.has('semesterSubjects') ? _memoryBootCache.semesterSubjects : parseJsonArray(t1.get(BOOT_KEYS.SEM_SUBJECTS)),
              sleepLogs: _liveUpdatedKeys.has('sleepLogs') ? _memoryBootCache.sleepLogs : parseJsonArray(t1.get(BOOT_KEYS.SLEEP_LOGS)),
              weightLogs: _liveUpdatedKeys.has('weightLogs') ? _memoryBootCache.weightLogs : parseJsonArray(t1.get(BOOT_KEYS.WEIGHT_LOGS)),
              customEvents: _liveUpdatedKeys.has('customEvents') ? _memoryBootCache.customEvents : parseJsonArray(t1.get(BOOT_KEYS.CUSTOM_EVENTS)),
              goals: _liveUpdatedKeys.has('goals') ? _memoryBootCache.goals : parseJsonArray(t1.get(BOOT_KEYS.GOALS)),
              weeklyReviews: _liveUpdatedKeys.has('weeklyReviews') ? _memoryBootCache.weeklyReviews : parseJsonArray(t1.get(BOOT_KEYS.WEEKLY_REVIEWS)),
              storageNodes: _liveUpdatedKeys.has('storageNodes') ? _memoryBootCache.storageNodes : parseJsonArray(t1.get(BOOT_KEYS.STORAGE_NODES)),
              learningTopics: _liveUpdatedKeys.has('learningTopics') ? _memoryBootCache.learningTopics : parseJsonArray(t1.get(BOOT_KEYS.LEARNING_TOPICS)),
              jobs: _liveUpdatedKeys.has('jobs') ? _memoryBootCache.jobs : parseJsonArray(t1.get(BOOT_KEYS.JOBS)),
              contentLogs: _liveUpdatedKeys.has('contentLogs') ? _memoryBootCache.contentLogs : parseJsonArray(t1.get(BOOT_KEYS.CONTENT_LOGS)),
            };
          })
          .catch(() => {});
      });

      return manifest;
    } catch (e) {
      console.warn('[BootManifest] Failed to load boot manifest, falling back to defaults:', e);
      const fallback: BootManifest = {
        lastRoute: 'Home',
        onboarded: true,
        optimisticUser: null,
        pinnedModules: DEFAULT_PINNED,
        tasks: [],
        habits: [],
        habitLogs: [],
        dashboardLayout: null,
        waterGoalMl: DEFAULT_WATER_GOAL,
        googleAccessToken: null,
        themeMode: null,
        xp: 0,
        attendance: [],
        attendanceLogs: [],
        assignments: [],
        semesters: [],
        semesterSubjects: [],
        holidays: [],
        gymLogs: [],
        userGymPlan: null,
        waterLogs: [],
        sleepLogs: [],
        weightLogs: [],
        customEvents: [],
        goals: [],
        weeklyReviews: [],
        storageNodes: [],
        learningTopics: [],
        jobs: [],
        contentLogs: [],
        notifFingerprint: null,
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
}

export function clearBootManifest(): void {
  _memoryBootCache = null;
  _bootPromise = null;
  _isBootHydrated = false;
  L1_RAM_CACHE.clear();
  _liveUpdatedKeys.clear();
}
