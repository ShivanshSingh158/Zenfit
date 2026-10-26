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
import { planDayIndexForDate, resolvePlanDay } from '../data/gymPlan';
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
      return id.startsWith('gym_workout_') || id.startsWith('gym_rest_') || id.startsWith('gym_inactivity_');
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
      const triggerTime = dateAtHM(targetDate, hours, minutes);

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
        // Rest & Recovery Day Notification
        const title = getRandomMessage(GYM_REST_DAY_TITLES);
        const body = getRandomMessage(GYM_REST_DAY_POOLS());

        await Notifications.scheduleNotificationAsync({
          identifier: `gym_rest_${dateStr}`,
          content: {
            title,
            body,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
            data: {
              type: 'gym_rest',
              dateStr,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerTime,
            channelId: 'gym_recovery',
          },
        }).catch(err => {
          console.warn(`[Notifications] Failed to schedule rest day reminder for ${dateStr}:`, err);
        });

        scheduledCount++;
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
