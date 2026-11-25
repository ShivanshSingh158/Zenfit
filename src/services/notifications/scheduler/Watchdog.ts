/**
 * Watchdog.ts — ZenFit Omnichannel Notification Engine (ZONE)
 * Self-Healing Watchdog & Orphan Notification Purger.
 * Audits OS alarms and guarantees system integrity.
 */

import * as Notifications from 'expo-notifications';
import { notificationMutex } from '../core/AsyncMutex';
import { RestTimerScheduler } from './RestTimerScheduler';

export class NotificationWatchdog {
  /**
   * Performs a comprehensive audit of all scheduled alarms in the OS.
   * Cancels orphan, past-due, or malformed notification records.
   */
  public static async auditAndClean(): Promise<{ purgedCount: number }> {
    return notificationMutex.runExclusive(async () => {
      let purgedCount = 0;

      try {
        // Purge legacy timestamped rest timers first
        await RestTimerScheduler.purgeLegacyRestTimers();

        const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
        const nowMs = Date.now();
        const seenIdentifiers = new Set<string>();

        for (const alarm of scheduled) {
          const id = alarm.identifier || '';

          // 1. Duplicate identifier in OS response
          if (seenIdentifiers.has(id)) {
            await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
            purgedCount++;
            continue;
          }
          seenIdentifiers.add(id);

          // 2. Legacy rest timer pattern
          if (id.startsWith('rest_timer_') && id !== 'zenfit:rest_timer:active') {
            await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
            purgedCount++;
            continue;
          }

          // 3. Stale alarms whose trigger time is definitively in the past
          const trigger = alarm.trigger as any;
          if (trigger?.date && typeof trigger.date === 'number') {
            if (trigger.date < nowMs - 60000) {
              await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
              purgedCount++;
              continue;
            }
          }
        }
      } catch (err) {
        console.warn('[NotificationWatchdog] Audit error:', err);
      }

      return { purgedCount };
    });
  }
}
