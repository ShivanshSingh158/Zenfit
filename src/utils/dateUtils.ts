/**
 * dateUtils.ts — ZenFit Date & Display Utilities
 *
 * Lightweight, zero-dependency date formatting and display helpers for ZenFit.
 * Re-exports core date primitives from dateCore.ts to avoid duplication.
 */

export * from './dateCore';
import { parseLocalDate } from './dateCore';

// ─── Constants ───────────────────────────────────────────────────────────────

export const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
export const DAY_SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const MONTH_SHORT = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export const MONTH_LONG = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

export const MONTHS_SHORT_CAP = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG_CAP = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DAYS_SHORT_CAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAYS_LONG_CAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Date Display Formatting ──────────────────────────────────────────────────

export function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const parts = dateStr.trim().slice(0, 10).split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    const monthName = MONTHS_LONG_CAP[parseInt(m, 10) - 1];
    if (monthName) return `${d} ${monthName} ${y}`;
  }
  return dateStr;
}

export function formatDateLong(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${d.getDate().toString().padStart(2, '0')} ${MONTHS_LONG_CAP[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateShort(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${d.getDate().toString().padStart(2, '0')} ${MONTHS_SHORT_CAP[d.getMonth()]}`;
}

export function formatDateWithDay(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${DAYS_SHORT_CAP[d.getDay()]}, ${d.getDate().toString().padStart(2, '0')} ${MONTHS_SHORT_CAP[d.getMonth()]}`;
}

export function formatDateFull(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${DAYS_LONG_CAP[d.getDay()]}, ${d.getDate().toString().padStart(2, '0')} ${MONTHS_LONG_CAP[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateNumeric(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
}

export function formatDateObjShort(date: Date): string {
  return `${date.getDate().toString().padStart(2, '0')} ${MONTHS_SHORT_CAP[date.getMonth()]}`;
}

export function formatHoursDisplay(val: string | number | undefined): string {
  if (val === undefined || val === null || val === '') return '';
  const numVal = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(numVal)) return String(val);
  const totalMinutes = Math.round(numVal * 60);
  if (totalMinutes === 0) return '0 min';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
}

export function formatTimeRangeDisplay(timeStr?: string | null): string {
  if (!timeStr) return '';
  const clean = timeStr.trim();
  if (!clean) return '';

  const parts = clean.split(/[-–—]|(?:\s+to\s+)/i).map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return clean;

  const formatSingle = (str: string) => {
    const lower = str.toLowerCase().trim();
    if (lower.includes('am') || lower.includes('pm')) {
      return str.replace(/\s+/g, ' ').toUpperCase();
    }
    const timeParts = lower.split(':');
    let h = parseInt(timeParts[0], 10);
    const m = timeParts.length > 1 ? parseInt(timeParts[1], 10) : 0;
    if (isNaN(h)) return str;
    const ampm = (h >= 12 && h < 24) ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    if (m === 0) {
      return `${hour12} ${ampm}`;
    }
    return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  if (parts.length === 1) {
    return formatSingle(parts[0]);
  }
  return `${formatSingle(parts[0])} – ${formatSingle(parts[1])}`;
}

export function timeAgo(dateInput: any): string {
  if (!dateInput) return '';
  let date: Date;
  if (typeof dateInput.toDate === 'function') date = dateInput.toDate();
  else if (typeof dateInput.toMillis === 'function') date = new Date(dateInput.toMillis());
  else if (typeof dateInput === 'number' || typeof dateInput === 'string') date = new Date(dateInput);
  else if (dateInput instanceof Date) date = dateInput;
  else return '';
  if (isNaN(date.getTime())) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}
