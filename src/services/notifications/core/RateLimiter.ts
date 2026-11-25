/**
 * RateLimiter.ts — ZenFit Omnichannel Notification Engine (ZONE)
 * Sliding Window Frequency Capper & Timezone-aware Quiet Hours Filter.
 * Prevents notification fatigue with priority-based arbitration.
 */

import { CandidateAlarm, NotificationPriority } from '../types';
import { formatLocalDateStr } from '../../../utils/dateUtils';

export class RateLimiter {
  /**
   * Checks whether a trigger time falls within configured quiet hours.
   * Default quiet hours: 22:00 (10:00 PM) to 07:30 (7:30 AM).
   */
  public static isQuietHours(
    triggerDate: Date,
    quietStartHM: { hours: number; minutes: number } = { hours: 22, minutes: 0 },
    quietEndHM: { hours: number; minutes: number } = { hours: 7, minutes: 30 }
  ): boolean {
    const h = triggerDate.getHours();
    const m = triggerDate.getMinutes();
    const currentMins = h * 60 + m;

    const startMins = quietStartHM.hours * 60 + quietStartHM.minutes;
    const endMins = quietEndHM.hours * 60 + quietEndHM.minutes;

    // Overnight range (e.g. 22:00 to 07:30)
    if (startMins > endMins) {
      return currentMins >= startMins || currentMins < endMins;
    }

    // Normal range
    return currentMins >= startMins && currentMins < endMins;
  }

  /**
   * Filters and arbitrates candidate alarms according to:
   * 1. Critical bypass (rest timers always pass).
   * 2. Quiet hours protection.
   * 3. Daily ceiling (e.g. max 2 per calendar day).
   * 4. Minimum interval gap (e.g. 180 minutes).
   * 5. Priority tiering (HIGH beats NORMAL beats LOW).
   */
  public static filterAndCap(
    candidates: CandidateAlarm[],
    options: {
      maxPerDay?: number;
      minGapMinutes?: number;
      quietHoursEnabled?: boolean;
      quietStart?: { hours: number; minutes: number };
      quietEnd?: { hours: number; minutes: number };
    } = {}
  ): CandidateAlarm[] {
    const {
      maxPerDay = 2,
      minGapMinutes = 180,
      quietHoursEnabled = true,
      quietStart = { hours: 22, minutes: 0 },
      quietEnd = { hours: 7, minutes: 30 },
    } = options;

    const minGapMs = minGapMinutes * 60 * 1000;

    // Step 1: Filter out quiet-hours violators (unless bypassed)
    const timeValidCandidates = candidates.filter(c => {
      // Critical alarms (like Rest Timers) always bypass quiet hours and daily caps
      if (c.bypassQuietHours || c.priorityTier === NotificationPriority.CRITICAL) {
        return true;
      }

      // Explicit primary workout reminders honor user's chosen workout anchor time
      if (c.priorityTier === NotificationPriority.HIGH && c.channelId === 'gym_reminders') {
        return true;
      }

      if (quietHoursEnabled && this.isQuietHours(c.triggerDate, quietStart, quietEnd)) {
        return false;
      }

      return true;
    });

    // Step 2: Separate critical alarms from standard rate-limited alarms
    const criticalAlarms: CandidateAlarm[] = [];
    const standardAlarms: CandidateAlarm[] = [];

    for (const c of timeValidCandidates) {
      if (c.bypassRateLimit || c.priorityTier === NotificationPriority.CRITICAL) {
        criticalAlarms.push(c);
      } else {
        standardAlarms.push(c);
      }
    }

    // Step 3: Sort standard alarms by priority (higher priority first) then by trigger time
    standardAlarms.sort((a, b) => {
      if (a.priorityTier !== b.priorityTier) {
        return a.priorityTier - b.priorityTier; // Lower enum value = higher priority
      }
      return a.triggerDate.getTime() - b.triggerDate.getTime();
    });

    // Step 4: Group standard alarms by calendar day
    const byDay = new Map<string, CandidateAlarm[]>();
    for (const c of standardAlarms) {
      const dayKey = formatLocalDateStr(c.triggerDate);
      if (!byDay.has(dayKey)) byDay.set(dayKey, []);
      byDay.get(dayKey)!.push(c);
    }

    // Step 5: Enforce daily ceiling and minimum gap per day
    const approvedStandard: CandidateAlarm[] = [];

    for (const [, dayAlarms] of byDay.entries()) {
      const acceptedForDay: CandidateAlarm[] = [];

      for (const alarm of dayAlarms) {
        if (acceptedForDay.length >= maxPerDay) break;

        const alarmMs = alarm.triggerDate.getTime();
        const hasGapViolation = acceptedForDay.some(
          accepted => Math.abs(alarmMs - accepted.triggerDate.getTime()) < minGapMs
        );

        if (!hasGapViolation) {
          acceptedForDay.push(alarm);
        }
      }

      approvedStandard.push(...acceptedForDay);
    }

    // Combine critical alarms and approved standard alarms, sorted chronologically
    return [...criticalAlarms, ...approvedStandard].sort(
      (a, b) => a.triggerDate.getTime() - b.triggerDate.getTime()
    );
  }
}
