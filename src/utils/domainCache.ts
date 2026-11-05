/**
 * domainCache.ts — AsyncStorage helpers for ALL domain data in ZenTrack Mobile
 *
 * Implements stale-while-revalidate for every domain context:
 *   Wellness  : gymLogs, userGymPlan, waterLogs, sleepLogs, weightLogs
 *   Academic  : attendance, attendanceLogs, assignments, semesters, semesterSubjects
 *   Planner   : customEvents, goals, weeklyReviews
 *   Creative  : storageNodes, learningTopics, jobs
 *
 * Boot flow (same pattern as coreCache.ts):
 *   1. On boot: multiGet from AsyncStorage instantly (~5ms, no network)
 *   2. Seed context state immediately — screen is usable before Firestore responds
 *   3. After each Firestore snapshot: multiSet to update the cache
 *
 * This ensures ALL screens show real data even when offline.
 *
 * Cache clear: called on logout — stale data from a previous user never bleeds.
 */
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearDomainHotCache } from './hotCacheStore';
import { clearBootManifest, updateL1Cache } from './bootManifest';

// Automatically flush any pending debounced AsyncStorage writes when app backgrounds
AppState.addEventListener('change', nextState => {
  if (nextState === 'background' || nextState === 'inactive') {
    flushDomainCache().catch(() => {});
  }
});

// ─── Cache Keys ───────────────────────────────────────────────────────────────
export const DOMAIN_CACHE_KEYS = {
  // Wellness
  GYM_LOGS:         '@zentrack_cache_gym_logs',
  USER_GYM_PLAN:    '@zentrack_cache_user_gym_plan',
  WATER_LOGS:       '@zentrack_cache_water_logs',
  SLEEP_LOGS:       '@zentrack_cache_sleep_logs',
  WEIGHT_LOGS:      '@zentrack_cache_weight_logs',
  // Academic
  ATTENDANCE:       '@zentrack_cache_attendance',
  ATTENDANCE_LOGS:  '@zentrack_cache_attendance_logs',
  ASSIGNMENTS:      '@zentrack_cache_assignments',
  SEMESTERS:        '@zentrack_cache_semesters',
  SEM_SUBJECTS:     '@zentrack_cache_sem_subjects',
  HOLIDAYS:         '@zentrack_cache_holidays',
  // Planner
  CUSTOM_EVENTS:    '@zentrack_cache_custom_events',
  GOALS:            '@zentrack_cache_goals',
  WEEKLY_REVIEWS:   '@zentrack_cache_weekly_reviews',
  // Creative
  STORAGE_NODES:    '@zentrack_cache_storage_nodes',
  LEARNING_TOPICS:  '@zentrack_cache_learning_topics',
  JOBS:             '@zentrack_cache_jobs',
  CONTENT_LOGS:     '@zentrack_cache_content_logs',
} as const;

type CacheKey = typeof DOMAIN_CACHE_KEYS[keyof typeof DOMAIN_CACHE_KEYS];

// ─── Generic read helper — reads multiple keys in one multiGet call ───────────
export async function readDomainCache<T extends Record<string, any>>(
  keyMap: Record<string, CacheKey>
): Promise<Partial<T>> {
  try {
    const keys = Object.values(keyMap) as string[];
    const pairs = await AsyncStorage.multiGet(keys);
    const result: any = {};
    for (const [key, raw] of pairs) {
      if (!raw) continue;
      try {
        const fieldName = Object.keys(keyMap).find(k => keyMap[k] === key);
        if (fieldName) result[fieldName] = JSON.parse(raw);
      } catch {
        // Shadow backup fallback for self-healing storage corruption
        try {
          const bakRaw = await AsyncStorage.getItem(`${key}_bak`);
          if (bakRaw) {
            const fieldName = Object.keys(keyMap).find(k => keyMap[k] === key);
            if (fieldName) result[fieldName] = JSON.parse(bakRaw);
          }
        } catch {}
      }
    }
    return result as Partial<T>;
  } catch {
    return {}; // Cache miss is always safe
  }
}

// Debounce state to batch disk writes and avoid JS thread blocking
const _writeTimers = new Map<string, ReturnType<typeof setTimeout>>();
const _pendingWrites = new Map<string, { data: Record<string, any>; keyMap: Record<string, CacheKey> }>();

export async function flushDomainCache(domainKey?: string): Promise<void> {
  const keysToFlush = domainKey ? [domainKey] : Array.from(_pendingWrites.keys());
  for (const key of keysToFlush) {
    const pending = _pendingWrites.get(key);
    if (!pending) continue;
    _pendingWrites.delete(key);
    const timer = _writeTimers.get(key);
    if (timer) clearTimeout(timer);
    _writeTimers.delete(key);

    try {
      const pairs: [string, string][] = [];
      for (const [field, cacheKey] of Object.entries(pending.keyMap)) {
        if (pending.data[field] !== undefined) {
          const valueToStore = pending.data[field];

          // ── CURSORWINDOW & HOT/COLD ARCHIVE PARTITIONING ──────────────────────
          // Keep primary gymLogs bounded to the most recent 90 days (<250KB).
          // Partition older workouts into archive keys so SQLite rows never exceed 2MB.
          if (field === 'gymLogs' && Array.isArray(valueToStore)) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 90);
            const y = cutoffDate.getFullYear();
            const m = String(cutoffDate.getMonth() + 1).padStart(2, '0');
            const d = String(cutoffDate.getDate()).padStart(2, '0');
            const cutoffStr = `${y}-${m}-${d}`;

            const hotLogs = valueToStore.filter((l: any) => l?.date >= cutoffStr);
            const coldLogs = valueToStore.filter((l: any) => l?.date < cutoffStr);

            const hotJson = JSON.stringify(hotLogs);
            pairs.push([cacheKey, hotJson]);
            // Shadow backup key for self-healing storage recovery
            pairs.push([`${cacheKey}_bak`, hotJson]);

            // Archive cold logs partitioned by year if any exist
            if (coldLogs.length > 0) {
              const byYear: Record<string, any[]> = {};
              for (const cl of coldLogs) {
                const yr = cl?.date ? cl.date.slice(0, 4) : 'older';
                if (!byYear[yr]) byYear[yr] = [];
                byYear[yr].push(cl);
              }
              for (const [yr, yrLogs] of Object.entries(byYear)) {
                pairs.push([`@zentrack_cache_gym_archive_${yr}`, JSON.stringify(yrLogs)]);
              }
            }
            continue;
          }

          const serialized = JSON.stringify(valueToStore);
          pairs.push([cacheKey, serialized]);
          if (cacheKey.includes('gym_logs') || cacheKey.includes('attendance_logs')) {
            pairs.push([`${cacheKey}_bak`, serialized]);
          }
        }
      }
      if (pairs.length > 0) await AsyncStorage.multiSet(pairs);
    } catch { /* silent — cache write failure never affects the user */ }
  }
}

function getCanonicalDomain(keyMap: Record<string, CacheKey>): string {
  const vals = Object.values(keyMap);
  if (vals.some(v => v.includes('gym') || v.includes('water') || v.includes('sleep') || v.includes('weight'))) return 'wellness';
  if (vals.some(v => v.includes('attendance') || v.includes('assignment') || v.includes('sem'))) return 'academic';
  if (vals.some(v => v.includes('event') || v.includes('goal') || v.includes('review'))) return 'planner';
  if (vals.some(v => v.includes('storage') || v.includes('topic') || v.includes('job') || v.includes('content'))) return 'creative';
  return vals.sort().join('|');
}

// ─── Generic write helper — immediate=true for user writes, false for snapshot writes ───
export async function writeDomainCache(
  data: Partial<Record<string, any>>,
  keyMap: Record<string, CacheKey>,
  immediate = false // Default FALSE — snapshot writes are always background
): Promise<void> {
  for (const field of Object.keys(data)) {
    if (data[field] !== undefined) {
      updateL1Cache(field as any, data[field]);
    }
  }

  const domainKey = getCanonicalDomain(keyMap);

  const existing = _pendingWrites.get(domainKey);
  _pendingWrites.set(domainKey, {
    data: { ...(existing?.data || {}), ...data },
    keyMap: { ...(existing?.keyMap || {}), ...keyMap },
  });

  if (immediate) {
    // User-triggered write — flush now for guaranteed persistence
    return flushDomainCache(domainKey);
  }

  // Background/snapshot write — debounce 1s so burst snapshots coalesce into one write.
  // JSON.stringify for large arrays (gym logs, attendance) runs once, not on every snapshot.
  const existing_timer = _writeTimers.get(domainKey);
  if (existing_timer) clearTimeout(existing_timer);
  _writeTimers.set(domainKey, setTimeout(() => {
    _writeTimers.delete(domainKey);
    flushDomainCache(domainKey).catch(() => {});
  }, 1000));
}

// ─── Domain-specific helpers — typed wrappers around the generic functions ────

// ── Wellness ─────────────────────────────────────────────────────────────────
const WELLNESS_KEY_MAP = {
  gymLogs:     DOMAIN_CACHE_KEYS.GYM_LOGS,
  userGymPlan: DOMAIN_CACHE_KEYS.USER_GYM_PLAN,
  waterLogs:   DOMAIN_CACHE_KEYS.WATER_LOGS,
  sleepLogs:   DOMAIN_CACHE_KEYS.SLEEP_LOGS,
  weightLogs:  DOMAIN_CACHE_KEYS.WEIGHT_LOGS,
} as const;

export interface WellnessCache {
  gymLogs: any[];
  userGymPlan: any | null;
  waterLogs: any[];
  sleepLogs: any[];
  weightLogs: any[];
}

export const readWellnessCache = async (): Promise<Partial<WellnessCache>> => {
  const result = await readDomainCache<WellnessCache>(WELLNESS_KEY_MAP);
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const archiveKeys = allKeys.filter(k => k.startsWith('@zentrack_cache_gym_archive_'));
    if (archiveKeys.length > 0) {
      const archivePairs = await AsyncStorage.multiGet(archiveKeys);
      const archiveLogs: any[] = [];
      for (const [, raw] of archivePairs) {
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) archiveLogs.push(...parsed);
        } catch {}
      }
      if (archiveLogs.length > 0) {
        const existingLogs = Array.isArray(result.gymLogs) ? result.gymLogs : [];
        const seenIds = new Set(existingLogs.map((l: any) => l?.id).filter(Boolean));
        const merged = [...existingLogs];
        for (const al of archiveLogs) {
          if (al?.id && !seenIds.has(al.id)) {
            seenIds.add(al.id);
            merged.push(al);
          } else if (!al?.id) {
            merged.push(al);
          }
        }
        merged.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        result.gymLogs = merged;
      }
    }
  } catch {}
  return result;
};
export const writeWellnessCache = (data: Partial<WellnessCache>, immediate = false) => writeDomainCache(data, WELLNESS_KEY_MAP, immediate);

// ── Academic ─────────────────────────────────────────────────────────────────
const ACADEMIC_KEY_MAP = {
  attendance:      DOMAIN_CACHE_KEYS.ATTENDANCE,
  attendanceLogs:  DOMAIN_CACHE_KEYS.ATTENDANCE_LOGS,
  assignments:     DOMAIN_CACHE_KEYS.ASSIGNMENTS,
  semesters:       DOMAIN_CACHE_KEYS.SEMESTERS,
  semesterSubjects: DOMAIN_CACHE_KEYS.SEM_SUBJECTS,
  holidays:         DOMAIN_CACHE_KEYS.HOLIDAYS,
} as const;

export interface AcademicCache {
  attendance: any[];
  attendanceLogs: any[];
  assignments: any[];
  semesters: any[];
  semesterSubjects: any[];
  holidays: string[];
}

export const readAcademicCache  = () => readDomainCache<AcademicCache>(ACADEMIC_KEY_MAP);
export const writeAcademicCache = (data: Partial<AcademicCache>, immediate = false) => writeDomainCache(data, ACADEMIC_KEY_MAP, immediate);

// ── Planner ───────────────────────────────────────────────────────────────────
const PLANNER_KEY_MAP = {
  customEvents:  DOMAIN_CACHE_KEYS.CUSTOM_EVENTS,
  goals:         DOMAIN_CACHE_KEYS.GOALS,
  weeklyReviews: DOMAIN_CACHE_KEYS.WEEKLY_REVIEWS,
} as const;

export interface PlannerCache {
  customEvents: any[];
  goals: any[];
  weeklyReviews: any[];
}

export const readPlannerCache  = () => readDomainCache<PlannerCache>(PLANNER_KEY_MAP);
export const writePlannerCache = (data: Partial<PlannerCache>, immediate = false) => writeDomainCache(data, PLANNER_KEY_MAP, immediate);

// ── Creative ──────────────────────────────────────────────────────────────────
const CREATIVE_KEY_MAP = {
  storageNodes:   DOMAIN_CACHE_KEYS.STORAGE_NODES,
  learningTopics: DOMAIN_CACHE_KEYS.LEARNING_TOPICS,
  jobs:           DOMAIN_CACHE_KEYS.JOBS,
  contentLogs:    DOMAIN_CACHE_KEYS.CONTENT_LOGS,
} as const;

export interface CreativeCache {
  storageNodes: any[];
  learningTopics: any[];
  jobs: any[];
  contentLogs: any[];
}

export const readCreativeCache  = () => readDomainCache<CreativeCache>(CREATIVE_KEY_MAP);
export const writeCreativeCache = (data: Partial<CreativeCache>, immediate = false) => writeDomainCache(data, CREATIVE_KEY_MAP, immediate);

export async function clearAllDomainCaches(): Promise<void> {
  for (const timer of _writeTimers.values()) {
    clearTimeout(timer);
  }
  _writeTimers.clear();
  _pendingWrites.clear();
  try {
    clearBootManifest();
    clearDomainHotCache();
    const allKeys = await AsyncStorage.getAllKeys();
    const archiveKeys = allKeys.filter(k => k.startsWith('@zentrack_cache_gym_archive_') || k.endsWith('_bak'));
    const allToRemove = Array.from(new Set([...Object.values(DOMAIN_CACHE_KEYS), ...archiveKeys]));
    await AsyncStorage.multiRemove(allToRemove);
  } catch { /* silent */ }
}

