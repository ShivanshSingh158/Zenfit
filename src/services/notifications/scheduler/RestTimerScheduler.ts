/**
 * RestTimerScheduler.ts — ZenFit Omnichannel Notification Engine (ZONE)
 * High-Precision Single-Alarm Rest Timer Dispatcher.
 * Guarantees zero duplicate rest alarms by enforcing a single deterministic identifier.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { restTimerMutex } from '../core/AsyncMutex';
import { REST_TIMER_CHANNEL_ID } from '../core/NotificationChannels';

export const REST_TIMER_NOTIFICATION_ID = 'zenfit:rest_timer:active';

export class RestTimerScheduler {
  /**
   * Sweeps and purges any legacy timestamped rest timer alarms from the OS alarm manager
   * (e.g. rest_timer_17324...) created by earlier versions.
   */
  public static async purgeLegacyRestTimers(): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
      const legacyAlarms = scheduled.filter(a => {
        const id = a.identifier || '';
        return id.startsWith('rest_timer_') && id !== REST_TIMER_NOTIFICATION_ID;
      });

      if (legacyAlarms.length > 0) {
        await Promise.all(
          legacyAlarms.map(a =>
            Notifications.cancelScheduledNotificationAsync(a.identifier).catch(() => {})
          )
        );
      }
    } catch {
      // Continue silently
    }
  }

  /**
   * Schedules or updates the active rest timer alarm.
   * Atomically replaces any existing rest timer in the OS without creating duplicates.
   */
  public static async schedule(durationSecs: number, exerciseName?: string): Promise<string | null> {
    if (!durationSecs || durationSecs <= 0) {
      await this.cancel();
      return null;
    }

    return restTimerMutex.runExclusive(async () => {
      try {
        // Step 1: Cancel any existing rest timer notification (including legacy)
        await Notifications.cancelScheduledNotificationAsync(REST_TIMER_NOTIFICATION_ID).catch(() => {});
        await this.purgeLegacyRestTimers();

        const title = 'Rest Timer Complete';
        const body = exerciseName
          ? `Time for your next set of ${exerciseName}!`
          : 'Time for your next set!';

        // Step 2: Schedule with exact deterministic identifier
        await Notifications.scheduleNotificationAsync({
          identifier: REST_TIMER_NOTIFICATION_ID,
          content: {
            title,
            body,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            categoryIdentifier: 'active_rest_timer',
            data: {
              type: 'active_rest_timer',
              exerciseName,
            },
            ...(Platform.OS === 'android' ? { channelId: REST_TIMER_CHANNEL_ID } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.max(1, Math.round(durationSecs)),
            channelId: REST_TIMER_CHANNEL_ID,
          },
        });

        return REST_TIMER_NOTIFICATION_ID;
      } catch (err) {
        console.warn('[RestTimerScheduler] Scheduling error:', err);
        return null;
      }
    });
  }

  /**
   * Cancels the active rest timer notification
   */
  public static async cancel(): Promise<void> {
    return restTimerMutex.runExclusive(async () => {
      try {
        await Notifications.cancelScheduledNotificationAsync(REST_TIMER_NOTIFICATION_ID).catch(() => {});
        await Notifications.dismissNotificationAsync(REST_TIMER_NOTIFICATION_ID).catch(() => {});
        await this.purgeLegacyRestTimers();
      } catch {}
    });
  }
}
