/**
 * domainCache.ts — AsyncStorage helpers for domain data in ZenFit
 *
 * Implements stale-while-revalidate for wellness domain contexts:
 *   Wellness: gymLogs, userGymPlan, waterLogs, sleepLogs, weightLogs
 *
 * Boot flow:
 *   1. On boot: multiGet from AsyncStorage instantly (~5ms, no network)
 *   2. Seed context state immediately — screen is usable before Firestore responds
 *   3. After each Firestore snapshot: multiSet to update the cache
 *
 * Cache clear: called on logout — stale data from a previous user never bleeds.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearDomainHotCache } from './hotCacheStore';
import { clearBootManifest, updateL1Cache, GYM_ARCHIVE_YEARS_KEY, EXERCISE_LEDGER_KEY } from './bootManifest';

// ─── Cache Keys ───────────────────────────────────────────────────────────────
export const DOMAIN_CACHE_KEYS = {
  GYM_LOGS:      '@zentrack_cache_gym_logs',
  USER_GYM_PLAN: '@zentrack_cache_user_gym_plan',
  WATER_LOGS:    '@zentrack_cache_water_logs',
  SLEEP_LOGS:    '@zentrack_cache_sleep_logs',
  WEIGHT_LOGS:   '@zentrack_cache_weight_logs',
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
            // Shadow backup for corruption recovery (Issue #122)
            pairs.push([`${cacheKey}_bak`, hotJson]);

            // Archive cold logs partitioned by year if any exist (Issue #4, #52, #55 & #160)
            let existingYears: string[] = [];
            try {
              const rawExisting = await AsyncStorage.getItem(GYM_ARCHIVE_YEARS_KEY);
              if (rawExisting) existingYears = JSON.parse(rawExisting);
            } catch {}

            if (coldLogs.length > 0) {
              const byYear: Record<string, any[]> = {};
              for (const cl of coldLogs) {
                const yr = cl?.date ? cl.date.slice(0, 4) : 'older';
                if (!byYear[yr]) byYear[yr] = [];
                byYear[yr].push(cl);
              }
              const years = Object.keys(byYear);
              const yearSet = new Set(years);
              const orphanedYears = existingYears.filter(yr => !yearSet.has(yr));
              if (orphanedYears.length > 0) {
                AsyncStorage.multiRemove(orphanedYears.map(yr => `@zentrack_cache_gym_archive_${yr}`)).catch(() => {});
              }
              pairs.push([GYM_ARCHIVE_YEARS_KEY, JSON.stringify(years)]);
              for (const [yr, yrLogs] of Object.entries(byYear)) {
                // Deduplicate cold logs by id or date to guarantee idempotency
                const dedupMap = new Map<string, any>();
                for (const cl of yrLogs) {
                  dedupMap.set(cl?.id || cl?.date, cl);
                }
                pairs.push([`@zentrack_cache_gym_archive_${yr}`, JSON.stringify(Array.from(dedupMap.values()))]);
              }
            } else {
              if (existingYears.length > 0) {
                AsyncStorage.multiRemove(existingYears.map(yr => `@zentrack_cache_gym_archive_${yr}`)).catch(() => {});
              }
              // Issue #52: Ensure GYM_ARCHIVE_YEARS_KEY is always persisted (at least []) so rawYears === null never forces getAllKeys()
              pairs.push([GYM_ARCHIVE_YEARS_KEY, JSON.stringify([])]);
            }
            continue;
          }

          const serialized = JSON.stringify(valueToStore);
          pairs.push([cacheKey, serialized]);
          // Shadow backup for corruption recovery (Issue #122)
          pairs.push([`${cacheKey}_bak`, serialized]);
        }
      }
      if (pairs.length > 0) await AsyncStorage.multiSet(pairs);
    } catch { /* silent — cache write failure never affects the user */ }
  }
}

function getCanonicalDomain(keyMap: Record<string, CacheKey>): string {
  const vals = Object.values(keyMap);
  if (vals.some(v => v.includes('gym') || v.includes('water') || v.includes('sleep') || v.includes('weight'))) {
    return 'wellness';
  }
  const keys = Object.keys(keyMap).sort().join('_');
  return keys || 'default';
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

  // Background/snapshot write — debounce 1s so burst snapshots coalesce into one write
  const existing_timer = _writeTimers.get(domainKey);
  if (existing_timer) clearTimeout(existing_timer);
  _writeTimers.set(domainKey, setTimeout(() => {
    _writeTimers.delete(domainKey);
    flushDomainCache(domainKey).catch(() => {});
  }, 1000));
}

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
    let archiveYears: string[] = [];
    const rawYears = await AsyncStorage.getItem(GYM_ARCHIVE_YEARS_KEY);
    if (rawYears !== null && rawYears !== undefined) {
      try { archiveYears = JSON.parse(rawYears); } catch {}
    } else {
      const allKeys = await AsyncStorage.getAllKeys();
      archiveYears = allKeys
        .filter(k => k.startsWith('@zentrack_cache_gym_archive_'))
        .map(k => k.replace('@zentrack_cache_gym_archive_', ''));
      AsyncStorage.setItem(GYM_ARCHIVE_YEARS_KEY, JSON.stringify(archiveYears)).catch(() => {});
    }

    if (archiveYears.length > 0) {
      const archiveKeys = archiveYears.map(yr => `@zentrack_cache_gym_archive_${yr}`);
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
        const seenDates = new Set<string>();
        const seenIds = new Set<string>();
        for (const l of existingLogs) {
          if (l?.date) seenDates.add(l.date);
          if (l?.id) seenIds.add(l.id);
        }
        const merged = [...existingLogs];
        for (const al of archiveLogs) {
          if (!al) continue;
          // Issue #56: deduplicate archive logs by date AND id
          const hasDate = al.date && seenDates.has(al.date);
          const hasId = al.id && seenIds.has(al.id);
          if (!hasDate && !hasId) {
            if (al.date) seenDates.add(al.date);
            if (al.id) seenIds.add(al.id);
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

export const writeWellnessCache = (data: Partial<WellnessCache>, immediate = false) =>
  writeDomainCache(data, WELLNESS_KEY_MAP, immediate);

export async function clearAllDomainCaches(): Promise<void> {
  for (const timer of _writeTimers.values()) {
    clearTimeout(timer);
  }
  _writeTimers.clear();
  _pendingWrites.clear();
  try {
    clearBootManifest();
    clearDomainHotCache();
    let archiveYears: string[] = [];
    try {
      const rawYears = await AsyncStorage.getItem(GYM_ARCHIVE_YEARS_KEY);
      if (rawYears) archiveYears = JSON.parse(rawYears);
    } catch {}
    const archiveKeys = archiveYears.map(yr => `@zentrack_cache_gym_archive_${yr}`);

    // Issue #57: Also scan for and remove all user-scoped dynamic caches, hot logs, drafts, sync meta, weekly analysis, video & avatar keys
    let extraDynamicKeys: string[] = [];
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      extraDynamicKeys = allKeys.filter(
        k =>
          k.startsWith('@zenfit_hot_log_') ||
          k.startsWith('gym_active_draft_') ||
          k.startsWith('@gym_active_session_') ||
          k.startsWith('@zenfit_firestore_cursor_') ||
          k.startsWith('@zentrack_last_sync_meta_v1') ||
          k.startsWith('zenfit_weekly_gym_analysis_v4_') ||
          k.startsWith('@zentrack_video_id_') ||
          k.startsWith('@zentrack_avatar_disk_path_') ||
          k.startsWith('@zentrack_avatar_source_url_') ||
          k.startsWith('@zenfit_media_cache_')
      );
    } catch {}

    const bakMirrors = Object.values(DOMAIN_CACHE_KEYS).map(k => `${k}_bak`);

    const keysToRemove = Array.from(new Set([
      ...Object.values(DOMAIN_CACHE_KEYS),
      ...bakMirrors,
      ...archiveKeys,
      ...extraDynamicKeys,
      GYM_ARCHIVE_YEARS_KEY,
      EXERCISE_LEDGER_KEY,
      'gym_profile_v1',
      '@gym_profile_v2',
      '@zenfit_guest_mode_v1',
      'zentrack_exercise_prs_v1',
      'zentrack_xp_v1',
      'zentrack_xp_streak',
      '@zentrack_xp_rewarded_keys_v1',
      'zenfit_xp_v1',
      'zenfit_xp_streak',
      '@zenfit_global_rest_timer',
      '@zenfit_widget_live_workout_data',
      '@zentrack_widget_mutation_ts',
      '@zenfit_notification_ledger_v2',
      '@zenfit_in_app_notifications_v2',
      '@zenfit_notif_fingerprint',
      '@zenfit_last_app_open_ts',
      '@zentrack_active_workout_state',
      '@zenfit_active_workout_state',
      '@gym_last_completed_session',
      'zenfit_onboarding_flow_done_v3',
      'zenfit_initial_weight_seeded_v1',
      '@zentrack_dead_letter_vault',
    ]));
    await AsyncStorage.multiRemove(keysToRemove);
  } catch { /* silent */ }
}
