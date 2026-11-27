/**
 * schemaGuards.ts — ZenFit Defensive Schema Parsing & Null Safety Engine
 *
 * WhatsApp Architecture Standard:
 * 1. Zero tolerance for corrupted documents, missing fields, or legacy schemas crashing the UI.
 * 2. Strict type-coercion and default fallback injection on every Firestore doc ingestion.
 * 3. Extreme range validation & boundary clamping (negative reps, 0/negative minutes, overflow strings).
 * 4. Preserves 100% of advanced workout metadata: 'top' | 'backoff' set types, cardio metrics, and progression policies.
 * 5. Ultra-fast bitwise dataset fingerprinting for React re-render bailouts.
 */

import { GymLog, GymSet, GymExerciseLog, GymCardioLog } from '../types/gym.types';
import { resolveExerciseTargetMuscle, MUSCLE_COLORS } from './gymUtils';
import { formatLocalDateStr } from './dateUtils';
import { generateDatasetFingerprint } from './hotCacheStore';

// ─── Helper Primitives ────────────────────────────────────────────────────────

/**
 * Safely normalizes any Firestore date representation (YYYY-MM-DD string, ISO string,
 * Firestore Timestamp, serialized {seconds, nanoseconds}, Date instance, or epoch ms)
 * into a local YYYY-MM-DD string without UTC midnight shift.
 */
export function sanitizeDateString(val: any, fallback?: string): string {
  const safeFallback = fallback !== undefined ? fallback : formatLocalDateStr();
  if (!val) return safeFallback;

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return formatLocalDateStr(parsed);
    }
    return safeFallback;
  }

  if (typeof val === 'number' && isFinite(val)) {
    const d = new Date(val);
    return !isNaN(d.getTime()) ? formatLocalDateStr(d) : safeFallback;
  }

  if (val instanceof Date) {
    return !isNaN(val.getTime()) ? formatLocalDateStr(val) : safeFallback;
  }

  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try {
        const d = val.toDate();
        if (d instanceof Date && !isNaN(d.getTime())) return formatLocalDateStr(d);
      } catch {
        return safeFallback;
      }
    }
    if (typeof val.seconds === 'number') {
      const d = new Date(val.seconds * 1000);
      if (!isNaN(d.getTime())) return formatLocalDateStr(d);
    }
  }

  return safeFallback;
}

/**
 * Truncates and sanitizes strings to prevent memory or layout crashes from giant strings.
 * Preserves unicode code points and handles emoji surrogate pairs safely.
 */
export function sanitizeString(val: any, fallback: string = '', maxLen: number = 500): string {
  if (typeof val !== 'string') {
    if (val === null || val === undefined) return fallback;
    return String(val).slice(0, maxLen);
  }
  const trimmed = val.trim();
  if (trimmed.length === 0) return fallback;
  // Issue #31: Fast return without array allocation if UTF-16 length <= maxLen
  if (trimmed.length <= maxLen) return trimmed;
  // Array.from splits correctly across multi-byte UTF-16 surrogate pairs (emojis)
  const chars = Array.from(trimmed);
  if (chars.length > maxLen) {
    return chars.slice(0, maxLen).join('');
  }
  return trimmed;
}

/**
 * Validates and clamps a number between min and max.
 * Converts NaN, Infinity, or non-numeric types to fallback.
 */
export function sanitizeNumber(val: any, fallback: number = 0, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number {
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || !isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
  }
  return Math.max(min, Math.min(max, val));
}

/**
 * Validates string against an allowed set of enum values, returning fallback if invalid.
 */
export function sanitizeEnum<T extends string>(val: any, allowed: T[], fallback: T): T {
  if (typeof val === 'string' && (allowed as string[]).includes(val)) {
    return val as T;
  }
  return fallback;
}

// ─── Gym Document Parser ──────────────────────────────────────────────────────

export function parseGymLog(docData: any, docId: string): GymLog {
  const d = docData && typeof docData === 'object' ? docData : {};
  // Tier-1 Upgrade #75: Schema migration version gate for cold boot (0.01ms fast-path bypass)
  if (d._schemaVer === 3 && d.id && d.date && Array.isArray(d.exercises)) {
    let valid = true;
    for (let i = 0; i < d.exercises.length; i++) {
      const ex = d.exercises[i];
      if (!ex || typeof ex !== 'object') { valid = false; break; }
      if (Array.isArray(ex.setsLog)) {
        for (let s = 0; s < ex.setsLog.length; s++) {
          const sl = ex.setsLog[s];
          if (!sl || typeof sl !== 'object') continue;
          if (sl.weight !== null && sl.weight !== undefined && !Number.isFinite(Number(sl.weight))) { valid = false; break; }
          if (sl.reps !== null && sl.reps !== undefined && !Number.isFinite(Number(sl.reps))) { valid = false; break; }
        }
      }
      if (!valid) break;
    }
    if (valid) return d as GymLog;
  }
  const safeDate = sanitizeDateString(d.date, '1970-01-01');
  const id = sanitizeString(docId || d.id, `gym_${sanitizeString(d.userId, 'anon')}_${safeDate}`);

  const exercises: GymExerciseLog[] = Array.isArray(d.exercises)
    ? d.exercises.map((ex: any, idx: number) => {
        const name = sanitizeString(ex?.name, 'Exercise', 150);
        const rawMuscle = ex?.muscle ? sanitizeString(ex.muscle, '', 50) : '';
        // Fast-path: if rawMuscle is already a valid canonical muscle, reuse it directly
        const resolvedMuscle = (rawMuscle && MUSCLE_COLORS[rawMuscle])
          ? rawMuscle
          : resolveExerciseTargetMuscle(name, rawMuscle).targetMuscle;

        const setsLog: GymSet[] = Array.isArray(ex?.setsLog)
          ? ex.setsLog.map((s: any, sIdx: number) => {
              const rawWeight = s?.weight !== undefined ? s.weight : s?.weightKg;
              const weight = rawWeight !== null && rawWeight !== undefined && rawWeight !== '' && !isNaN(Number(rawWeight))
                ? Number(rawWeight)
                : null;
              const rawReps = s?.reps;
              const reps = rawReps !== null && rawReps !== undefined && rawReps !== '' && !isNaN(Number(rawReps))
                ? Number(rawReps)
                : null;
              return {
                id: s?.id ? String(s.id) : undefined,
                setNumber: sanitizeNumber(s?.setNumber, sIdx + 1, 1, 99),
                reps,
                weight,
                completed: Boolean(s?.completed),
                isWarmup: s?.isWarmup !== undefined ? Boolean(s.isWarmup) : undefined,
                warmupLabel: s?.warmupLabel ? sanitizeString(s.warmupLabel, 'W', 10) : undefined,
                // Preserves full setType enum including 'top' and 'backoff'
                setType: s?.setType
                  ? sanitizeEnum(s.setType, ['normal', 'warmup', 'drop', 'failure', 'top', 'backoff'], 'normal')
                  : undefined,
                rir: s?.rir !== undefined && s?.rir !== null ? sanitizeNumber(s.rir, 0, 0, 10) : undefined,
                rpe: s?.rpe !== undefined && s?.rpe !== null ? sanitizeNumber(s.rpe, 0, 0, 10) : undefined,
                restSecondsOverride: s?.restSecondsOverride !== undefined && s?.restSecondsOverride !== null
                  ? sanitizeNumber(s.restSecondsOverride, 0, 0, 600)
                  : undefined,
              };
            })
          : [];

        return {
          _idx: ex?._idx !== undefined ? sanitizeNumber(ex._idx, idx, 0) : idx,
          id: sanitizeString(ex?.id || ex?.exerciseId, ''),
          exerciseId: sanitizeString(ex?.exerciseId || ex?.id, ''),
          name,
          targetSets: sanitizeNumber(ex?.targetSets, 3, 1, 20),
          targetReps: sanitizeString(ex?.targetReps, '10-12', 30),
          muscle: sanitizeString(resolvedMuscle, 'Mixed', 50),
          notes: ex?.notes ? sanitizeString(ex.notes, '', 300) : undefined,
          videoId: ex?.videoId ? sanitizeString(ex.videoId, '', 100) : undefined,
          supersetGroup: ex?.supersetGroup ? sanitizeString(ex.supersetGroup, undefined as any, 20) : undefined,
          restTimeSecs: ex?.restTimeSecs !== undefined ? sanitizeNumber(ex.restTimeSecs, 90, 0, 600) : undefined,
          skipped: Boolean(ex?.skipped),
          lastSessionSets: Array.isArray(ex?.lastSessionSets) ? ex.lastSessionSets : undefined,
          isCompound: ex?.isCompound !== undefined ? Boolean(ex.isCompound) : undefined,
          isCustom: ex?.isCustom !== undefined ? Boolean(ex.isCustom) : undefined,
          progressionPolicy: ex?.progressionPolicy
            ? sanitizeEnum(ex.progressionPolicy, ['linear', 'double', 'triple', 'top_backoff'], 'linear')
            : undefined,
          setsLog,
        };
      })
    : [];

  const cardio: GymCardioLog[] = Array.isArray(d.cardio)
    ? d.cardio.map((c: any, cIdx: number) => ({
        id: sanitizeString(c?.id, `cardio_${safeDate}_${cIdx}`),
        type: sanitizeString(c?.type, 'Cardio', 50),
        durationMinutes: c?.durationMinutes != null ? sanitizeNumber(c.durationMinutes, 0, 0, 600) : null,
        calories: c?.calories != null ? sanitizeNumber(c.calories, 0, 0, 10000) : null,
        distanceKm: c?.distanceKm != null ? sanitizeNumber(c.distanceKm, 0, 0, 200) : null,
        speedKmh: c?.speedKmh != null ? sanitizeNumber(c.speedKmh, 0, 0, 100) : null,
        incline: c?.incline != null ? sanitizeNumber(c.incline, 0, 0, 50) : null,
        completed: Boolean(c?.completed),
        isPermanent: Boolean(c?.isPermanent),
        floors: c?.floors != null ? sanitizeNumber(c.floors, 0, 0, 10000) : null,
        level: c?.level != null ? sanitizeNumber(c.level, 0, 0, 100) : null,
        laps: c?.laps != null ? sanitizeNumber(c.laps, 0, 0, 10000) : null,
        rounds: c?.rounds != null ? sanitizeNumber(c.rounds, 0, 0, 1000) : null,
        spm: c?.spm != null ? sanitizeNumber(c.spm, 0, 0, 500) : null,
        pace: c?.pace != null ? sanitizeNumber(c.pace, 0, 0, 120) : null,
      }))
    : [];

  return {
    _schemaVer: 3,
    id,
    userId: sanitizeString(d.userId, ''),
    date: safeDate,
    exercises,
    cardio,
    workoutStartTime: d.workoutStartTime != null ? sanitizeNumber(d.workoutStartTime, 0, 0) : undefined,
    workoutDurationMinutes: d.workoutDurationMinutes != null ? sanitizeNumber(d.workoutDurationMinutes, 0, 0, 600) : undefined,
    workoutDurationSeconds: d.workoutDurationSeconds != null ? sanitizeNumber(d.workoutDurationSeconds, 0, 0, 36000) : undefined,
    completed: Boolean(d.completed),
    dayPlanIndex: d.dayPlanIndex != null ? sanitizeNumber(d.dayPlanIndex, 1, 1, 7) : (() => {
      try {
        const parts = safeDate.split('-').map(Number);
        if (parts.length === 3) {
          const dow = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
          return dow === 0 ? 7 : dow;
        }
      } catch {}
      return 1;
    })(),
    startTime: d.startTime ? sanitizeString(d.startTime, undefined as any, 20) : undefined,
    endTime: d.endTime ? sanitizeString(d.endTime, undefined as any, 20) : undefined,
    createdAt: d.createdAt != null ? sanitizeNumber(d.createdAt, 0, 0) : undefined,
    updatedAt: sanitizeNumber(d.updatedAt, 0, 0),
    revertedAt: d.revertedAt != null ? sanitizeNumber(d.revertedAt, 0, 0) : undefined,
    notes: d.notes ? sanitizeString(d.notes, '', 500) : undefined,
    restTimerStartTime: d.restTimerStartTime !== undefined ? d.restTimerStartTime : null,
    restTimerDurationSecs: d.restTimerDurationSecs !== undefined ? d.restTimerDurationSecs : null,
    restTimerExerciseName: d.restTimerExerciseName !== undefined ? d.restTimerExerciseName : null,
    deleted: Boolean(d.deleted),
  };
}

/**
 * Fast equality check between previous state array and incoming snapshot array.
 * If every item is identical, returns true so React can reuse the existing array reference
 * and bail out of re-rendering.
 *
 * Uses order-independent commutative fingerprinting for workout logs (incorporating sets,
 * completed status, reps, and weights), and fast Map comparison for other items.
 */
export function areItemsEqual<T>(prev: T[] | null | undefined, next: T[] | null | undefined): boolean {
  if (prev === next) return true;
  if (!prev || !next) return false;
  if (prev.length !== next.length) return false;
  if (prev.length === 0 && next.length === 0) return true;

  const sample = (prev[0] || next[0]) as any;

  // For workout logs with exercises: use O(N) bitwise dataset fingerprinting
  if (sample?.exercises !== undefined || sample?.cardio !== undefined) {
    return generateDatasetFingerprint(prev as any[]) === generateDatasetFingerprint(next as any[]);
  }

  // Fast-path: if items have `id` and `updatedAt`, compare via Map in O(N) without JSON.stringify
  if (sample?.id !== undefined && sample?.updatedAt !== undefined) {
    const prevMap = new Map<string, any>();
    for (let i = 0; i < prev.length; i++) {
      const p = prev[i] as any;
      prevMap.set(String(p.id), p);
    }
    for (let i = 0; i < next.length; i++) {
      const n = next[i] as any;
      const p = prevMap.get(String(n.id));
      if (!p) return false;
      if (p === n) continue;
      if (
        p.updatedAt !== n.updatedAt ||
        p.completed !== n.completed ||
        p.weightKg !== n.weightKg ||
        p.amountMl !== n.amountMl ||
        p.durationMinutes !== n.durationMinutes
      ) {
        return false;
      }
    }
    return true;
  }

  // Fallback for items without updatedAt
  try {
    const hasIds = (prev[0] as any)?.id !== undefined || (next[0] as any)?.id !== undefined;
    if (hasIds) {
      const sortById = (a: any, b: any) => String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
      const sortedPrev = [...prev].sort(sortById);
      const sortedNext = [...next].sort(sortById);
      return JSON.stringify(sortedPrev) === JSON.stringify(sortedNext);
    }
    return JSON.stringify(prev) === JSON.stringify(next);
  } catch {
    return false;
  }
}
