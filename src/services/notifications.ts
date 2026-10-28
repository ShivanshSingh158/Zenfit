/**
 * notifications.ts — ZenFit Mobile
 *
 * Dedicated Gym & Athletic Workout Notification Engine.
 * Single source of truth for all local notifications in ZenFit.
 * - Schedules daily workout reminders based on the user's active split plan.
 * - Alerts on rest and recovery days.
 * - Manages permissions, Android notification channels, and snooze actions.
 * - Preserves active in-workout rest timers during scheduling sweeps.
 */

import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GymLog } from '../contexts/MobileDataContext';
import { UserGymPlanDoc } from '../types/gym.types';
import { GYM_PLAN, planDayIndexForDate, resolvePlanDay } from '../data/gymPlan';
import { formatLocalDateStr } from '../utils/dateUtils';
import {
  ensureNotificationChannels,
  requestNotificationPermissions,
  PRIORITY,
  ALARM_CAP,
} from './notificationChannels';
import {
  getRandomMessage,
  GYM_WORKOUT_TITLES,
  GYM_WORKOUT_POOLS,
  GYM_REST_DAY_TITLES,
  GYM_REST_DAY_POOLS,
  getWeeklyPerformanceTier,
  getWeeklyReportNotificationCopy,
} from './notificationPools';

export { requestNotificationPermissions, ensureNotificationChannels, PRIORITY, ALARM_CAP };

// Module-level permission cache — avoids calling requestPermissionsAsync on
// every scheduleGymNotifications invocation when the user has already denied.
// Reset to null on app restart automatically (module re-evaluation).
let _cachedPermissionGranted: boolean | null = null;

// ── Storage Keys ──────────────────────────────────────────────────────────────
export const GYM_NOTIF_ENABLED_KEY = '@gym_notification_enabled';
export const GYM_NOTIF_TIME_KEY = '@gym_notification_time';
export const GYM_REST_DAY_NOTIF_KEY = '@gym_rest_day_notif_enabled';
export const NOTIF_FINGERPRINT_KEY = '@zenfit_notif_fingerprint';

let _lastScheduleFingerprint: string | null = null;
let _lastScheduleError: string | null = null;
let _lastScheduledCount: number = 0;

export function clearScheduleCache() {
  _lastScheduleFingerprint = null;
  AsyncStorage.removeItem(NOTIF_FINGERPRINT_KEY).catch(() => {});
}

export function getLastScheduleStatus() {
  return {
    lastFingerprint: _lastScheduleFingerprint,
    count: _lastScheduledCount,
    lastError: _lastScheduleError,
  };
}

export async function openExactAlarmSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM', [
        { key: 'package', value: 'package:com.shiv157.zenfit' },
      ]);
    } catch {
      Linking.openSettings();
    }
  } else {
    Linking.openSettings();
  }
}

// ── Time & Date Helpers ───────────────────────────────────────────────────────

function parseTimeString(t?: string | null): { hours: number; minutes: number } {
  if (!t || typeof t !== 'string') return { hours: 18, minutes: 0 };
  const raw = t.trim().toLowerCase();

  const colonMatch = raw.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (colonMatch) {
    let h = parseInt(colonMatch[1], 10);
    const min = parseInt(colonMatch[2], 10);
    const ampm = colonMatch[3]?.toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    if (h >= 0 && h < 24 && min >= 0 && min < 60) {
      return { hours: h, minutes: min };
    }
  }

  const [h, m] = t.split(':').map(Number);
  return {
    hours: isNaN(h) || h < 0 || h > 23 ? 18 : h,
    minutes: isNaN(m) || m < 0 || m > 59 ? 0 : m,
  };
}

function dateAtHM(base: Date, hours: number, minutes: number): Date {
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// ── Schedule Parameters ───────────────────────────────────────────────────────

export interface ScheduleParams {
  gymLogs?: GymLog[];
  userGymPlan?: UserGymPlanDoc | null;
  userName?: string;
  // Backward compatibility placeholders (ignored)
  tasks?: any[];
  allHabits?: any[];
  attendance?: any[];
  assignments?: any[];
  waterLogs?: any[];
  sleepLogs?: any[];
  attendanceLogs?: any[];
  customEvents?: any[];
  habitLogs?: any[];
  flashcards?: any[];
  holidays?: any[];
}

function computeWeeklyTrainingSummary(
  gymLogs: GymLog[],
  userGymPlan: UserGymPlanDoc | null,
  restDateStr: string
) {
  const anchor = new Date(restDateStr + 'T12:00:00');
  const past7Dates = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - i);
    past7Dates.add(formatLocalDateStr(d));
  }

  const logsInWindow = (gymLogs || []).filter(l => l?.date && past7Dates.has(l.date.slice(0, 10)));
  const completedLogs = logsInWindow.filter(l => l.completed || (Array.isArray(l.exercises) && l.exercises.length > 0));
  const completedSessions = completedLogs.length;

  let totalSets = 0;
  let totalVolumeKg = 0;
  for (const log of completedLogs) {
    for (const ex of log.exercises || []) {
      if ((ex as any).skipped) continue;
      for (const s of ex.setsLog || []) {
        if (s.completed && !s.isWarmup) {
          totalSets++;
          totalVolumeKg += (Number(s.weight) || 0) * (Number(s.reps) || 0);
        }
      }
    }
  }

  let plannedWorkoutDays = 0;
  for (let i = 1; i <= 7; i++) {
    const day = userGymPlan?.customDays?.[i] || GYM_PLAN.find(p => p.dayIndex === i);
    if (day && !day.isRest) plannedWorkoutDays++;
  }
  if (plannedWorkoutDays === 0) plannedWorkoutDays = 4;

  const tier = getWeeklyPerformanceTier(completedSessions, totalSets, totalVolumeKg, plannedWorkoutDays);

  return {
    completedSessions,
    totalSets,
    totalVolumeKg,
    plannedWorkoutDays,
    tier,
  };
}

// ── Single Source of Truth Scheduler ──────────────────────────────────────────

export async function scheduleAllNotifications(params: ScheduleParams): Promise<void> {
  return scheduleGymNotifications(params);
}

export async function scheduleGymNotifications(params: ScheduleParams): Promise<void> {
  const { gymLogs = [], userGymPlan = null } = params;

  try {
    // 1. Fast-bail: if we already know permission is denied, skip entirely.
    //    This prevents repeated requestPermissionsAsync calls that cause Expo Go
    //    to flood the console with permission-denied warnings.
    if (_cachedPermissionGranted === false) return;

    // 2. Ensure notification channels exist before any scheduling
    await ensureNotificationChannels();

    // 3. Verify permissions. If not granted, attempt request once and cache result.
    if (_cachedPermissionGranted !== true) {
      let { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const granted = await requestNotificationPermissions();
        _cachedPermissionGranted = granted;
        if (!granted) return;
      } else {
        _cachedPermissionGranted = true;
      }
    }

    // 3. Read user notification preferences
    const [enabledPref, timePref, restDayPref] = await Promise.all([
      AsyncStorage.getItem(GYM_NOTIF_ENABLED_KEY),
      AsyncStorage.getItem(GYM_NOTIF_TIME_KEY),
      AsyncStorage.getItem(GYM_REST_DAY_NOTIF_KEY),
    ]);

    const notifEnabled = enabledPref !== 'false';
    const restDayEnabled = restDayPref !== 'false';
    const { hours, minutes } = parseTimeString(timePref || '18:00');

    // 4. Compute fingerprint to prevent redundant schedule passes
    const latestLogDate = (gymLogs || []).reduce((max, log) => (log.date > max ? log.date : max), '');
    const planId = userGymPlan?.id || userGymPlan?.templateId || 'default';
    const fingerprint = `${notifEnabled}_${restDayEnabled}_${hours}:${minutes}_${planId}_${latestLogDate}`;

    if (_lastScheduleFingerprint === fingerprint) {
      return;
    }

    // 5. Inspect existing alarms to preserve any active rest timers
    const existingAlarms = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    const activeRestTimers = existingAlarms.filter(a => {
      const id = a.identifier || '';
      const data = a.content?.data as any;
      return id.startsWith('rest_timer_') || data?.type === 'active_rest_timer' || data?.type === 'rest_timer';
    });

    // 6. Cancel existing scheduled gym reminders (leave active rest timers intact)
    const alarmsToCancel = existingAlarms.filter(a => {
      const id = a.identifier || '';
      return id.startsWith('gym_workout_') || id.startsWith('gym_rest_') || id.startsWith('gym_inactivity_') || id.startsWith('gym_weekly_report_');
    });

    await Promise.all(
      alarmsToCancel.map(alarm =>
        Notifications.cancelScheduledNotificationAsync(alarm.identifier).catch(() => {})
      )
    );

    // If notifications are completely disabled by user, stop here
    if (!notifEnabled) {
      _lastScheduleFingerprint = fingerprint;
      _lastScheduledCount = 0;
      await AsyncStorage.setItem(NOTIF_FINGERPRINT_KEY, fingerprint).catch(() => {});
      return;
    }

    // 7. Schedule a rolling 7-day window of workout and rest day reminders
    const now = new Date();
    let scheduledCount = 0;

    for (let dayOffset = 0; dayOffset <= 6; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      const dateStr = formatLocalDateStr(targetDate);

      // Check if user already logged/completed a workout for this date
      const alreadyLogged = gymLogs.some(
        g => g.date === dateStr && (g.completed || (Array.isArray(g.exercises) && g.exercises.length > 0))
      );

      if (alreadyLogged) {
        continue;
      }

      const planIdx = planDayIndexForDate(dateStr);
      const planDay = resolvePlanDay(userGymPlan, planIdx);

      // Extract day-specific scheduled time (e.g. from customDays[planIdx].startTime)
      let dayHours = hours;
      let dayMinutes = minutes;
      const scheduledTimeStr = planDay?.startTime || userGymPlan?.customDays?.[planIdx]?.startTime;
      if (scheduledTimeStr) {
        const parsed = parseTimeString(scheduledTimeStr);
        dayHours = parsed.hours;
        dayMinutes = parsed.minutes;
      }
      const triggerTime = dateAtHM(targetDate, dayHours, dayMinutes);

      // Only schedule if trigger time is in the future
      if (triggerTime.getTime() <= now.getTime()) {
        continue;
      }

      if (planDay && !planDay.isRest) {
        // Training Day Notification
        const planName = planDay.name || 'Workout Session';
        const exercises = planDay.exercises || [];
        const top3Names = exercises.slice(0, 3).map(e => e.name).filter(Boolean);
        const preview = top3Names.length > 0 ? top3Names.join(', ') : undefined;

        const title = getRandomMessage(GYM_WORKOUT_TITLES(planName));
        const body = getRandomMessage(GYM_WORKOUT_POOLS(planName, preview, exercises.length));

        await Notifications.scheduleNotificationAsync({
          identifier: `gym_workout_${dateStr}`,
          content: {
            title,
            body,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: {
              type: 'gym_workout',
              dateStr,
              planName,
              planIdx,
            },
            categoryIdentifier: 'gym_reminder',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerTime,
            channelId: 'gym_reminders',
          },
        }).catch(err => {
          console.warn(`[Notifications] Failed to schedule workout reminder for ${dateStr}:`, err);
        });

        scheduledCount++;
      } else if (planDay && planDay.isRest && restDayEnabled) {
        // Compute user's actual weekly performance leading into this rest day
        const summary = computeWeeklyTrainingSummary(gymLogs, userGymPlan, dateStr);

        // Pseudo-random deterministic daytime time (between 10:30 AM and 12:15 PM)
        let hash = 0;
        for (let i = 0; i < dateStr.length; i++) {
          hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
          hash |= 0;
        }
        const absHash = Math.abs(hash);
        const randHour = 10 + (absHash % 2); // 10 or 11
        const randMin = 15 + (absHash % 45); // 15 to 59 (e.g. 10:37 AM, 11:22 AM)
        const primaryTriggerTime = dateAtHM(targetDate, randHour, randMin);

        // Follow-up reminder: 4.5 hours later (between 3:00 PM and 4:45 PM on that same rest day)
        const followUpTriggerTime = new Date(primaryTriggerTime.getTime() + (4 * 60 + 30) * 60 * 1000);

        // 1. Primary Weekly Report Notification (tailored to whether user worked hard, good, or light)
        if (primaryTriggerTime.getTime() > now.getTime()) {
          const primaryCopy = getWeeklyReportNotificationCopy({
            tier: summary.tier,
            completedSessions: summary.completedSessions,
            totalSets: summary.totalSets,
            totalVolumeKg: summary.totalVolumeKg,
            isFollowUp: false,
          });

          await Notifications.scheduleNotificationAsync({
            identifier: `gym_weekly_report_${dateStr}`,
            content: {
              title: primaryCopy.title,
              body: primaryCopy.body,
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.HIGH,
              data: {
                type: 'weekly_report',
                dateStr,
                isFollowUp: false,
              },
              categoryIdentifier: 'gym_weekly_report',
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: primaryTriggerTime,
              channelId: 'gym_recovery',
            },
          }).catch(err => {
            console.warn(`[Notifications] Failed to schedule weekly report reminder for ${dateStr}:`, err);
          });

          scheduledCount++;
        }

        // 2. Follow-Up Reminder Notification (4-5 hours later, different message copy)
        if (followUpTriggerTime.getTime() > now.getTime()) {
          const followUpCopy = getWeeklyReportNotificationCopy({
            tier: summary.tier,
            completedSessions: summary.completedSessions,
            totalSets: summary.totalSets,
            totalVolumeKg: summary.totalVolumeKg,
            isFollowUp: true,
          });

          await Notifications.scheduleNotificationAsync({
            identifier: `gym_weekly_report_reminder_${dateStr}`,
            content: {
              title: followUpCopy.title,
              body: followUpCopy.body,
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.HIGH,
              data: {
                type: 'weekly_report',
                dateStr,
                isFollowUp: true,
              },
              categoryIdentifier: 'gym_weekly_report',
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: followUpTriggerTime,
              channelId: 'gym_recovery',
            },
          }).catch(err => {
            console.warn(`[Notifications] Failed to schedule weekly report follow-up for ${dateStr}:`, err);
          });

          scheduledCount++;
        }
      }
    }

    _lastScheduleFingerprint = fingerprint;
    _lastScheduledCount = scheduledCount;
    _lastScheduleError = null;
    await AsyncStorage.setItem(NOTIF_FINGERPRINT_KEY, fingerprint).catch(() => {});
    console.log(`[Notifications] Successfully scheduled ${scheduledCount} gym notifications (fingerprint: ${fingerprint})`);
  } catch (err: any) {
    _lastScheduleError = err?.message || String(err);
    console.error('[Notifications] Scheduling error:', err);
  }
}

// ── Test Notification Trigger (For immediate verification) ────────────────────

export async function sendTestGymNotification(): Promise<boolean> {
  try {
    await ensureNotificationChannels();
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const ok = await requestNotificationPermissions();
      if (!ok) return false;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'ZenFit Workout Ready! 🏋️',
        body: 'Push Day: Incline Bench, Lateral Raises & Triceps. Time to lift!',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'gym_reminder',
        data: { type: 'test_notification' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        channelId: 'gym_reminders',
      },
    });

    return true;
  } catch (e) {
    console.warn('[Notifications] Failed to send test notification:', e);
    return false;
  }
}

// ── Legacy Compatibility Stubs ────────────────────────────────────────────────

export async function scheduleTaskReminders(..._args: any[]): Promise<void> {
  // Obsolete: ZenFit only schedules gym notifications
}

export async function cancelClassNotificationsImmediately(..._args: any[]): Promise<void> {
  // Obsolete: ZenFit does not have class attendance
}

export async function cancelAllClassNotificationsForDate(..._args: any[]): Promise<void> {
  // Obsolete: ZenFit does not have class attendance
}

export function checkAndTriggerWaterMilestones(..._args: any[]): void {
  // Obsolete: ZenFit does not have water milestones
}
