/**
 * Zero-dependency, lightweight date utilities for high-performance telemetry and analytics.
 * Avoids loading the full NL Task Parser into the Gym and Analytics dependency graph.
 */

export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getLocalDateString(date: Date = new Date()): string {
  return toYMD(date);
}

export const formatLocalDateStr = getLocalDateString;

export function getTodayLocalDateStr(): string {
  return getLocalDateString(new Date());
}

export const todayStr = getTodayLocalDateStr;

/**
 * Parse a YYYY-MM-DD string safely as a LOCAL date (avoids UTC midnight shift).
 * Supports ISO strings with timestamps (e.g. 2026-11-07T12:00:00Z) without NaN failure.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Safely adds/subtracts days to a local "YYYY-MM-DD" string without UTC shifts.
 */
export function offsetDateStr(dateStr: string, offsetDays: number): string {
  try {
    const dt = parseLocalDate(dateStr);
    dt.setDate(dt.getDate() + offsetDays);
    return toYMD(dt);
  } catch {
    const dt = new Date();
    dt.setDate(dt.getDate() + offsetDays);
    return toYMD(dt);
  }
}

export const dateStrOffset = offsetDateStr;

export function nextWeekday(targetDayIndex: number, forceNext = false): Date {
  const d = new Date();
  const currentDay = d.getDay();
  let diff = targetDayIndex - currentDay;
  if (diff < 0 || (diff === 0 && forceNext)) {
    diff += 7;
  }
  d.setDate(d.getDate() + diff);
  return d;
}

