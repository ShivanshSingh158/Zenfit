import { wasRestTimerRecentlyFinished } from '../../restTimerService';
/**
 * NotificationChannels.ts — ZenFit Omnichannel Notification Engine (ZONE)
 * High-Priority Android Notification Channels, iOS Categories, & Global Handler.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { playTimerFinishChime } from '../../gymSoundSynthesizer';
import { InAppNotificationStore } from './InAppNotificationStore';
import { NotificationCategory, NotificationPriority } from '../types';

export const PRIORITY = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 } as const;
export const ALARM_CAP = Platform.OS === 'ios' ? 64 : 450;
export const REST_TIMER_CHANNEL_ID = 'zenfit_rest_timer_v3';
export const WORKOUT_REMINDERS_CHANNEL_ID = 'gym_reminders';
export const RECOVERY_CHANNEL_ID = 'gym_recovery';
export const ONGOING_WORKOUT_CHANNEL_ID = 'workout_in_progress_v2';

// ── Global OS Notification Presentation Handler ──────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification?.request?.content?.data;
    const isOngoingWorkout = data?.type === 'ACTIVE_WORKOUT_IN_PROGRESS';

    // Pipe into In-App Notification Store (except silent ongoing HUD updates)
    if (!isOngoingWorkout) {
      const content = notification.request.content;
      InAppNotificationStore.addNotification({
        id: notification.request.identifier,
        title: content.title || 'ZenFit Alert',
        body: content.body || '',
        category: (data?.type as NotificationCategory) || NotificationCategory.SYSTEM,
        priority: NotificationPriority.NORMAL,
        data,
      }).catch(() => {});
    }

    // Silent ongoing workout HUD in background shade
    if (isOngoingWorkout) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: true,
      };
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

let _hasRegisteredRestListener = false;
export function registerRestTimerNotificationListener() {
  if (_hasRegisteredRestListener) return;
  _hasRegisteredRestListener = true;
  try {
    Notifications.addNotificationReceivedListener((notification) => {
      const data = notification?.request?.content?.data;
      if (data?.type === 'active_rest_timer') {
        if (!wasRestTimerRecentlyFinished()) {
          playTimerFinishChime();
        }
      }
    });
  } catch (_) {}
}

let _channelsInitPromise: Promise<void> | null = null;

/**
 * Ensures all Android notification channels exist with correct importance & audio settings.
 */
export function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (_channelsInitPromise) return _channelsInitPromise;

  _channelsInitPromise = (async () => {
    try {
      // 1. Daily Workout Reminders (Max Importance)
      await Notifications.setNotificationChannelAsync(WORKOUT_REMINDERS_CHANNEL_ID, {
        name: 'Workout Reminders',
        description: 'Scheduled reminders for your daily lifting sessions and split plans',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 400, 200, 400],
        lightColor: '#0A84FF',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // Purge legacy channel artifacts
      await Notifications.deleteNotificationChannelAsync('active_workout').catch(() => {});
      await Notifications.deleteNotificationChannelAsync('zenfit_rest_timer_v2').catch(() => {});

      // 2. Rest Timer Alarm (Max Importance, Audio Alarm Stream, Bypass DND)
      await Notifications.setNotificationChannelAsync(REST_TIMER_CHANNEL_ID, {
        name: 'Rest Timer Alarm',
        description: 'Audible rest timer expiry alarms and workout alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#30D158',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: false,
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.ALARM,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          flags: {
            enforceAudibility: true,
            requestHardwareAudioVideoSynchronization: false,
          },
        },
      });

      registerRestTimerNotificationListener();

      // 3. Rest & Recovery Days (High Importance)
      await Notifications.setNotificationChannelAsync(RECOVERY_CHANNEL_ID, {
        name: 'Rest & Recovery Tips',
        description: 'Scheduled reminders and recovery tips for off-days',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#64D2FF',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // 4. Ongoing Workout in Progress (Silent Persistent HUD in Notification Shade)
      await Notifications.setNotificationChannelAsync(ONGOING_WORKOUT_CHANNEL_ID, {
        name: 'Workout in Progress',
        description: 'Persistent non-dismissible notification during an active workout session',
        importance: Notifications.AndroidImportance.LOW,
        sound: null,
        enableVibrate: false,
        showBadge: false,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // 5. Default Fallback Channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'ZenFit Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: true,
      });
    } catch (e) {
      console.warn('[NotificationChannels] Channel creation warning:', e);
    }
  })();

  return _channelsInitPromise;
}

/**
 * Requests notification permissions and registers interactive iOS/Android action categories.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    await ensureNotificationChannels();

    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      final = status;
    }

    // Configure interactive quick actions
    await Notifications.setNotificationCategoryAsync('gym_reminder', [
      { identifier: 'START_WORKOUT', buttonTitle: 'Start Workout', options: { opensAppToForeground: true } },
      { identifier: 'SNOOZE_1H', buttonTitle: 'Snooze 1h', options: { opensAppToForeground: false } },
    ]);

    await Notifications.setNotificationCategoryAsync('missed_workout_catch', [
      { identifier: 'LOG_LATE', buttonTitle: 'Log Late Session', options: { opensAppToForeground: true } },
      { identifier: 'PUSH_SPLIT', buttonTitle: 'Push Split +1 Day', options: { opensAppToForeground: false } },
      { identifier: 'REST_TODAY', buttonTitle: 'Rest Today', options: { opensAppToForeground: false } },
    ]);

    await Notifications.setNotificationCategoryAsync('tomorrow_blueprint', [
      { identifier: 'VIEW_BLUEPRINT', buttonTitle: 'View Blueprint', options: { opensAppToForeground: true } },
    ]);

    await Notifications.setNotificationCategoryAsync('rest_day_insight', [
      { identifier: 'VIEW_RECOVERY', buttonTitle: 'View Recovery', options: { opensAppToForeground: true } },
    ]);

    await Notifications.setNotificationCategoryAsync('active_rest_timer', [
      { identifier: 'REST_SKIP', buttonTitle: 'Skip Rest', options: { opensAppToForeground: false } },
      { identifier: 'REST_ADD_30S', buttonTitle: '+30s Rest', options: { opensAppToForeground: false } },
      { identifier: 'OPEN_WORKOUT', buttonTitle: 'Open HUD', options: { opensAppToForeground: true } },
    ]);

    await Notifications.setNotificationCategoryAsync('active_workout_ongoing', [
      { identifier: 'OPEN_WORKOUT', buttonTitle: 'Return to Workout', options: { opensAppToForeground: true } },
      { identifier: 'WORKOUT_END', buttonTitle: 'End Workout', options: { opensAppToForeground: true } },
    ]);

    await Notifications.setNotificationCategoryAsync('gym_weekly_report', [
      { identifier: 'VIEW_REPORT', buttonTitle: 'View Full Report', options: { opensAppToForeground: true } },
    ]);

    await Notifications.setNotificationCategoryAsync('churn_reengagement', [
      { identifier: 'OPEN_APP', buttonTitle: 'Open ZenFit', options: { opensAppToForeground: true } },
    ]);

    return final === 'granted';
  } catch (err: any) {
    return false;
  }
}

export function getSoundChannelId(
  baseChannel: 'gym_reminders' | 'active_workout',
  _soundPref?: string | null
): string {
  return baseChannel;
}
