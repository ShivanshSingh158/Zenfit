/**
 * Recursively cleans an object to ensure it has no undefined values.
 * Firestore will throw an error if you attempt to save an object with `undefined` properties.
 */
export function deepSanitize(obj: any): any {
  if (obj === null) return null;
  if (Array.isArray(obj)) return obj.map(deepSanitize);
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        newObj[key] = deepSanitize(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

let _lastMonotonicTs = 0;
/**
 * Hybrid Logical Clock (HLC) monotonic timestamp generator.
 * Guarantees that timestamps strictly advance forward even if the client's
 * phone clock drifts, changes timezones, or is set backwards.
 */
export function getMonotonicTimestamp(minBaselineTs = 0): number {
  const now = Date.now();
  _lastMonotonicTs = Math.max(now, _lastMonotonicTs + 1, minBaselineTs + 1);
  return _lastMonotonicTs;
}
