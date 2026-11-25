import Constants from 'expo-constants';
/**
 * index.ts — ZenFit Omnichannel Notification Engine (ZONE)
 * Master Public API & Backward-Compatible Facade.
 */

import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';

// Core modules
export * from './types';
export * from './core/AsyncMutex';
export * from './core/IdempotencyLedger';
export * from './core/RateLimiter';
export * from './core/InAppNotificationStore';
export * from './core/NotificationChannels';
export * from './core/NotificationPreferences';
export * from './scheduler/WorkoutScheduler';
export * from './scheduler/RestTimerScheduler';
export * from './scheduler/Watchdog';

import {
  WorkoutScheduler,
  ScheduleParams,
} from './scheduler/WorkoutScheduler';
import {
  ensureNotificationChannels,
  requestNotificationPermissions,
  WORKOUT_REMINDERS_CHANNEL_ID,
} from './core/NotificationChannels';
import { NotificationWatchdog } from './scheduler/Watchdog';

// ── Backward-Compatible Facade Functions ──────────────────────────────────────

export async function scheduleGymNotifications(params: ScheduleParams): Promise<void> {
  return WorkoutScheduler.schedule(params);
}

export async function scheduleAllNotifications(params: ScheduleParams): Promise<void> {
  return WorkoutScheduler.schedule(params);
}

export async function reconcileNotificationQueue(params: ScheduleParams): Promise<void> {
  return WorkoutScheduler.schedule(params);
}

export async function cancelTodayTrainingAlerts(dateStr?: string): Promise<void> {
  return WorkoutScheduler.cancelTodayTrainingAlerts(dateStr);
}

export function clearScheduleCache(): void {
  WorkoutScheduler.clearCache();
}

export async function getLastScheduleStatus() {
  return WorkoutScheduler.getStatus();
}

export async function auditAndCleanNotifications() {
  return NotificationWatchdog.auditAndClean();
}

export async function openExactAlarmSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM', [
        { key: 'package', value: `package:${Constants.expoConfig?.android?.package || 'com.shiv157.zenfit'}` },
      ]);
    } catch {
      Linking.openSettings();
    }
  } else {
    Linking.openSettings();
  }
}

export function checkAndTriggerWaterMilestones(..._args: any[]): void {
  // Legacy stub
}

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
        title: 'Time to Train: Push Day A',
        body: 'Starting with Incline DB Bench & Cable Flies. 5 exercises on deck.',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'gym_reminder',
        data: { type: 'test_notification' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        channelId: WORKOUT_REMINDERS_CHANNEL_ID,
      },
    });

    return true;
  } catch (e) {
    console.warn('[ZONE] Failed to send test notification:', e);
    return false;
  }
}
