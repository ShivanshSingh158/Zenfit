/**
 * notificationChannels.ts — ZenFit Mobile
 *
 * Dedicated Android Notification Channels and Interactive Categories for Gym Workouts.
 * Configures high-priority channels for workout alerts, rest timer completions,
 * and recovery day reminders.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const PRIORITY = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 } as const;
export const ALARM_CAP = Platform.OS === 'ios' ? 64 : 450;

// ── Notification Handler ──────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Android Notification Channels ─────────────────────────────────────────────

export async function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    // 1. Daily Workout Reminders (High Priority)
    await Notifications.setNotificationChannelAsync('gym_reminders', {
      name: 'Workout Reminders',
      description: 'Scheduled reminders for your daily lifting sessions and split plans',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      lightColor: '#A599FF',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // 2. Active Workout & Rest Timer (Max Priority for Audible Rest Expiry)
    await Notifications.setNotificationChannelAsync('active_workout', {
      name: 'Active Workout & Rest Timer',
      description: 'Rest timer expiry alarms and live workout HUD status',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#30D158',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
      showBadge: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage?.ALARM ?? 4,
        contentType: Notifications.AndroidAudioContentType?.SONIFICATION ?? 4,
        flags: {
          enforceAudibility: true,
          requestHardwareAudioVideoSynchronization: false,
        },
      },
    });

    // 3. Rest & Recovery Days (Normal Priority)
    await Notifications.setNotificationChannelAsync('gym_recovery', {
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

    // 4. Default fallback channel
    await Notifications.setNotificationChannelAsync('default', {
      name: 'ZenFit Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
    });
  } catch (e) {
    console.warn('[NotificationChannels] Channel creation warning:', e);
  }
}

// ── Interactive Categories & Permission Setup ────────────────────────────────

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

    // Configure interactive quick actions for Gym
    await Notifications.setNotificationCategoryAsync('gym_reminder', [
      { identifier: 'START_WORKOUT', buttonTitle: '🏋️ Start Workout', options: { opensAppToForeground: true } },
      { identifier: 'SNOOZE_15M', buttonTitle: '⏰ Snooze 15m', options: { opensAppToForeground: false } },
    ]);

    await Notifications.setNotificationCategoryAsync('active_rest_timer', [
      { identifier: 'REST_SKIP', buttonTitle: '⏩ Skip Rest', options: { opensAppToForeground: false } },
      { identifier: 'REST_ADD_30S', buttonTitle: '+30s Rest', options: { opensAppToForeground: false } },
      { identifier: 'OPEN_WORKOUT', buttonTitle: '🏋️ Open HUD', options: { opensAppToForeground: true } },
    ]);

    await Notifications.setNotificationCategoryAsync('active_workout_ongoing', [
      { identifier: 'WORKOUT_DONE_SET', buttonTitle: '✓ Done Set', options: { opensAppToForeground: false } },
      { identifier: 'WORKOUT_ADD_WEIGHT', buttonTitle: '+2.5kg', options: { opensAppToForeground: false } },
      { identifier: 'WORKOUT_NEXT_EXERCISE', buttonTitle: '⏭ Next', options: { opensAppToForeground: false } },
    ]);

    if (final !== 'granted') {
      console.warn('[Notifications] Notification permission not granted:', final);
      return false;
    }

    return true;
  } catch (err: any) {
    console.warn('[Notifications] Setup warning:', err?.message);
    return false;
  }
}

export function getSoundChannelId(baseChannel: 'gym_reminders' | 'active_workout', _soundPref?: string | null): string {
  return baseChannel;
}
