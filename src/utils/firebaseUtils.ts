// src/utils/firebaseUtils.ts

function isPlainObject(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const proto = Object.getPrototypeOf(obj);
  return proto === null || proto === Object.prototype;
}

/**
 * Recursively cleans an object to ensure it has no `undefined`, `NaN`, or `Infinity` values,
 * while strictly preserving Firestore SDK class instances (`FieldValue`, `Timestamp`, `DocumentReference`)
 * and custom offline queue sentinels.
 */
export function deepSanitize(obj: any, seen: WeakSet<object> = new WeakSet()): any {
  if (obj === undefined || obj === null) return null;
  if (typeof obj === 'number') return Number.isFinite(obj) ? obj : null;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return Number.isFinite(obj.getTime()) ? obj.getTime() : Date.now();

  // Preserve custom offline sentinels & Firebase SDK class instances (FieldValue, Timestamp, DocumentReference)
  if (
    obj._methodName ||
    obj.__zentrackDeleteField === true ||
    typeof obj.__zentrackIncrement === 'number' ||
    obj.__zentrackServerTimestamp === true ||
    (!isPlainObject(obj) && !Array.isArray(obj))
  ) {
    return obj;
  }

  if (seen.has(obj)) return null;
  seen.add(obj);

  if (Array.isArray(obj)) {
    const outArr: any[] = [];
    for (let i = 0; i < obj.length; i++) {
      if (obj[i] !== undefined) {
        outArr.push(deepSanitize(obj[i], seen));
      }
    }
    return outArr;
  }

  const newObj: Record<string, any> = {};
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const val = obj[key];
    if (val === undefined) continue;
    if (typeof val === 'number' && !Number.isFinite(val)) continue;
    newObj[key] = deepSanitize(val, seen);
  }
  return newObj;
}

let _lastMonotonicTs = 0;
const MAX_CLOCK_DRIFT_MS = 60_000; // Cap forward drift at 60s so temporary future clock settings don't poison LWW

/**
 * Hybrid Logical Clock (HLC) monotonic timestamp generator.
 * Guarantees that timestamps strictly advance forward within realistic bounds.
 */
export function getMonotonicTimestamp(minBaselineTs = 0): number {
  const now = Date.now();
  const safeBaseline =
    typeof minBaselineTs === 'number' && Number.isFinite(minBaselineTs) && minBaselineTs <= now + MAX_CLOCK_DRIFT_MS
      ? minBaselineTs
      : 0;
  const safeLast = _lastMonotonicTs <= now + MAX_CLOCK_DRIFT_MS ? _lastMonotonicTs : now;
  _lastMonotonicTs = Math.max(now, safeLast + 1, safeBaseline + 1);
  return _lastMonotonicTs;
}
