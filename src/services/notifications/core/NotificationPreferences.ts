/**
 * NotificationPreferences.ts — ZenFit Omnichannel Notification Engine (ZONE)
 * Centralized User Notification Preferences Store with Backward Compatibility.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationPreferences } from '../types';

export const GYM_NOTIF_ENABLED_KEY = '@gym_notification_enabled';
export const GYM_NOTIF_TIME_KEY = '@gym_notification_time';
export const GYM_REST_DAY_NOTIF_KEY = '@gym_rest_day_notif_enabled';
export const GYM_RECOVERY_COACHING_KEY = '@gym_recovery_coaching_enabled';
export const GYM_SUNDAY_BRIEFING_KEY = '@gym_sunday_briefing_enabled';

export const PREF_QUIET_HOURS_ENABLED_KEY = '@zenfit_pref_quiet_hours_enabled';
export const PREF_QUIET_START_KEY = '@zenfit_pref_quiet_start';
export const PREF_QUIET_END_KEY = '@zenfit_pref_quiet_end';
export const PREF_MAX_DAILY_KEY = '@zenfit_pref_max_daily_notifs';
export const PREF_MIN_GAP_KEY = '@zenfit_pref_min_gap_mins';

export class PreferenceManager {
  public static async getPreferences(): Promise<NotificationPreferences> {
    try {
      const pairs = await AsyncStorage.multiGet([
        GYM_NOTIF_ENABLED_KEY,
        GYM_NOTIF_TIME_KEY,
        GYM_RECOVERY_COACHING_KEY,
        GYM_REST_DAY_NOTIF_KEY,
        GYM_SUNDAY_BRIEFING_KEY,
        PREF_QUIET_HOURS_ENABLED_KEY,
        PREF_QUIET_START_KEY,
        PREF_QUIET_END_KEY,
        PREF_MAX_DAILY_KEY,
        PREF_MIN_GAP_KEY,
      ]);

      const byKey = new Map<string, string | null>(pairs);
      const trainingEnabled = byKey.get(GYM_NOTIF_ENABLED_KEY) ?? null;
      const timePref = byKey.get(GYM_NOTIF_TIME_KEY) ?? null;
      const recoveryPrimary = byKey.get(GYM_RECOVERY_COACHING_KEY) ?? null;
      const recoveryLegacy = byKey.get(GYM_REST_DAY_NOTIF_KEY) ?? null;
      const sundayPref = byKey.get(GYM_SUNDAY_BRIEFING_KEY) ?? null;
      const quietEnabled = byKey.get(PREF_QUIET_HOURS_ENABLED_KEY) ?? null;
      const quietStart = byKey.get(PREF_QUIET_START_KEY) ?? null;
      const quietEnd = byKey.get(PREF_QUIET_END_KEY) ?? null;
      const maxDaily = byKey.get(PREF_MAX_DAILY_KEY) ?? null;
      const minGap = byKey.get(PREF_MIN_GAP_KEY) ?? null;

      const recoveryVal = recoveryPrimary ?? recoveryLegacy;

      return {
        trainingRemindersEnabled: trainingEnabled !== 'false',
        preferredWorkoutTime: timePref || '18:00',
        recoveryCoachingEnabled: recoveryVal !== 'false',
        sundayBriefingEnabled: sundayPref !== 'false',
        quietHoursEnabled: quietEnabled !== 'false',
        quietHoursStart: quietStart || '22:00',
        quietHoursEnd: quietEnd || '07:30',
        maxDailyNotifications: maxDaily ? parseInt(maxDaily, 10) : 2,
        minGapMinutes: minGap ? parseInt(minGap, 10) : 180,
        soundEnabled: true,
        vibrationEnabled: true,
      };
    } catch {
      return {
        trainingRemindersEnabled: true,
        preferredWorkoutTime: '18:00',
        recoveryCoachingEnabled: true,
        sundayBriefingEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:30',
        maxDailyNotifications: 2,
        minGapMinutes: 180,
        soundEnabled: true,
        vibrationEnabled: true,
      };
    }
  }

  public static async setPreference<K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ): Promise<void> {
    switch (key) {
      case 'trainingRemindersEnabled':
        await AsyncStorage.setItem(GYM_NOTIF_ENABLED_KEY, String(value));
        break;
      case 'preferredWorkoutTime':
        await AsyncStorage.setItem(GYM_NOTIF_TIME_KEY, String(value));
        break;
      case 'recoveryCoachingEnabled':
        await AsyncStorage.setItem(GYM_RECOVERY_COACHING_KEY, String(value));
        await AsyncStorage.setItem(GYM_REST_DAY_NOTIF_KEY, String(value));
        break;
      case 'sundayBriefingEnabled':
        await AsyncStorage.setItem(GYM_SUNDAY_BRIEFING_KEY, String(value));
        break;
      case 'quietHoursEnabled':
        await AsyncStorage.setItem(PREF_QUIET_HOURS_ENABLED_KEY, String(value));
        break;
      case 'quietHoursStart':
        await AsyncStorage.setItem(PREF_QUIET_START_KEY, String(value));
        break;
      case 'quietHoursEnd':
        await AsyncStorage.setItem(PREF_QUIET_END_KEY, String(value));
        break;
      case 'maxDailyNotifications':
        await AsyncStorage.setItem(PREF_MAX_DAILY_KEY, String(value));
        break;
      case 'minGapMinutes':
        await AsyncStorage.setItem(PREF_MIN_GAP_KEY, String(value));
        break;
    }
  }
}
