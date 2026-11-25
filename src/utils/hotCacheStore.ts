// src/utils/hotCacheStore.ts

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const MAX_CACHE_ENTRIES = 80;
const _HOT_CACHE = new Map<string, CacheEntry<any>>();
const _fingerprintCache = new WeakMap<any[], string>();

function extractEpochMs(val: any): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (!val || typeof val !== 'object') return 0;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.seconds === 'number') return val.seconds * 1000;
  return 0;
}

/**
 * Fast, ORDER-STABLE 32-bit FNV-1a + Murmur3 commutative dataset fingerprint.
 * Sensitive to any weight (down to 0.1kg), rep, RIR, completion flag, or timestamp change.
 * Memoized via WeakMap for 0ms instant retrieval on identical array references.
 */
export function generateDatasetFingerprint(items: Array<any> | null | undefined, extraTag: string = ''): string {
  if (!items || items.length === 0) return `empty_${extraTag}`;

  let baseHash = _fingerprintCache.get(items);
  if (!baseHash) {
    const len = items.length;
    let xorHash = len >>> 0;
    let sumHash = 0;

    for (let i = 0; i < len; i++) {
      const it = items[i];
      if (!it) continue;

      const rev = extractEpochMs(it.updatedAt) || extractEpochMs(it.lastUpdated) || extractEpochMs(it.timestamp);
      const exLen = Array.isArray(it.exercises) ? it.exercises.length : 0;
      let setsCount = 0;
      let completedSets = 0;
      let setFnv = 2166136261;

      if (Array.isArray(it.exercises)) {
        for (let e = 0; e < exLen; e++) {
          const ex = it.exercises[e];
          if (!ex) continue;
          const exSkippedBit = ex.skipped ? 1 : 0;
          const sLog = ex.setsLog;
          if (Array.isArray(sLog)) {
            setsCount += sLog.length;
            for (let s = 0; s < sLog.length; s++) {
              const sl = sLog[s];
              if (!sl) continue;
              if (sl.completed) completedSets++;
              const w = Math.round((Number(sl.weight ?? sl.weightKg) || 0) * 100);
              const r = Number(sl.reps) || 0;
              const rir = sl.rir != null ? Number(sl.rir) : 2;
              const warmBit = sl.isWarmup ? 1 : 0;
              setFnv ^= w ^ (r << 14) ^ (rir << 24) ^ (warmBit << 28) ^ (sl.completed ? 0x5bd1e995 : 0) ^ (exSkippedBit << 31);
              setFnv = Math.imul(setFnv, 16777619) >>> 0;
            }
          }
        }
      }

      const cardioLen = Array.isArray(it.cardio) ? it.cardio.length : 0;
      let cardioFnv = 2166136261;
      if (Array.isArray(it.cardio)) {
        for (let c = 0; c < cardioLen; c++) {
          const cd = it.cardio[c];
          if (!cd) continue;
          const cCompleted = cd.completed ? 1 : 0;
          const cDur = Math.round((Number(cd.durationMinutes) || 0) * 10);
          const cCal = Number(cd.calories) || 0;
          const cDist = Math.round((Number(cd.distanceKm) || 0) * 100);
          cardioFnv ^= (cCompleted << 1) ^ (cDur << 4) ^ (cCal << 12) ^ (cDist << 20);
          cardioFnv = Math.imul(cardioFnv, 16777619) >>> 0;
        }
      }
      const wStartTime = it.workoutStartTime ? extractEpochMs(it.workoutStartTime) : 0;
      const wDuration = Number(it.workoutDurationMinutes) || 0;
      const notesLen = typeof it.notes === 'string' ? it.notes.length : 0;

      let itemMix = (rev & 0xffffffff) ^ Math.imul(exLen + 1, 374761393) ^ Math.imul(setsCount + 1, 668265263);
      itemMix = (itemMix ^ Math.imul(completedSets + 1, 2147483647) ^ setFnv ^ (cardioLen << 19) ^ cardioFnv ^ (it.completed ? 0x9e3779b9 : 0) ^ (wStartTime & 0xffffffff) ^ (wDuration << 8) ^ (notesLen << 16)) >>> 0;

      xorHash = (xorHash ^ itemMix) >>> 0;
      sumHash = (sumHash + itemMix) >>> 0;
    }

    baseHash = `${len}_${xorHash}_${sumHash}`;
    _fingerprintCache.set(items, baseHash);
  }

  return extraTag ? `${baseHash}_${extraTag}` : baseHash;
}

export function getCachedAnalytics<T>(cacheKey: string): T | null {
  const entry = _HOT_CACHE.get(cacheKey);
  if (!entry) return null;
  _HOT_CACHE.delete(cacheKey);
  _HOT_CACHE.set(cacheKey, entry);
  return entry.data as T;
}

export function setCachedAnalytics<T>(cacheKey: string, data: T): void {
  if (_HOT_CACHE.has(cacheKey)) {
    _HOT_CACHE.delete(cacheKey);
  } else if (_HOT_CACHE.size >= MAX_CACHE_ENTRIES) {
    const lruKey = _HOT_CACHE.keys().next().value;
    if (lruKey !== undefined) _HOT_CACHE.delete(lruKey);
  }
  _HOT_CACHE.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
}

export function computeOrGetHotCache<T>(cacheKey: string, computation: () => T): T {
  const cached = getCachedAnalytics<T>(cacheKey);
  if (cached !== null && cached !== undefined) {
    return cached;
  }
  const result = computation();
  setCachedAnalytics<T>(cacheKey, result);
  return result;
}

export function invalidateDomainHotCache(prefix?: string): void {
  if (!prefix) {
    _HOT_CACHE.clear();
    return;
  }
  for (const key of _HOT_CACHE.keys()) {
    if (key.startsWith(prefix)) {
      _HOT_CACHE.delete(key);
    }
  }
}

export function clearDomainHotCache(): void {
  _HOT_CACHE.clear();
}
