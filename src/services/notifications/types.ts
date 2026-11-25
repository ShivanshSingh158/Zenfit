/**
 * types.ts — ZenFit Omnichannel Notification Engine (ZONE)
 * Enterprise-grade Type Definitions & Schemas
 */

import * as Notifications from 'expo-notifications';

export enum NotificationPriority {
  CRITICAL = 1, // Rest timer alerts, auto-finish safety nets (bypasses caps & quiet hours)
  HIGH = 2,     // Primary workout reminders, weekly performance briefings
  NORMAL = 3,   // Missed workout recovery checks, rest-day insights
  LOW = 4,      // Tomorrow blueprint previews, ongoing background HUDs
}

export enum NotificationCategory {
  GYM_WORKOUT = 'gym_reminder',
  MISSED_WORKOUT = 'missed_workout_catch',
  TOMORROW_BLUEPRINT = 'tomorrow_blueprint',
  REST_DAY_RECOVERY = 'rest_day_insight',
  REST_TIMER = 'active_rest_timer',
  WORKOUT_HUD = 'active_workout_ongoing',
  WEEKLY_REPORT = 'gym_weekly_report',
  CHURN_REENGAGEMENT = 'churn_reengagement',
  SYSTEM = 'system_alert',
}

export type ChannelId =
  | 'gym_reminders'
  | 'zenfit_rest_timer_v3'
  | 'gym_recovery'
  | 'workout_in_progress_v2'
  | 'default';

export interface InAppNotificationRecord {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  timestamp: number;
  read: boolean;
  actionType?: string;
  actionPayload?: Record<string, any>;
  data?: Record<string, any>;
}

export interface CandidateAlarm {
  identifier: string;
  triggerDate: Date;
  content: {
    title: string;
    body: string;
    sound?: string | null;
    priority?: Notifications.AndroidNotificationPriority;
    data?: Record<string, any>;
    categoryIdentifier?: string;
    color?: string;
    sticky?: boolean;
    autoDismiss?: boolean;
  };
  channelId: ChannelId;
  priorityTier: NotificationPriority;
  bypassQuietHours?: boolean;
  bypassRateLimit?: boolean;
}

export interface NotificationPreferences {
  trainingRemindersEnabled: boolean;
  preferredWorkoutTime: string; // e.g. '18:00'
  recoveryCoachingEnabled: boolean;
  sundayBriefingEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // e.g. '22:00'
  quietHoursEnd: string;   // e.g. '07:30'
  maxDailyNotifications: number; // default: 2
  minGapMinutes: number; // default: 180
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface DeliveryLedgerEntry {
  identifier: string;
  category: NotificationCategory;
  scheduledTime: number;
  deliveredTime?: number;
  hash: string;
}

export interface NotificationScheduleStatus {
  lastFingerprint: string | null;
  scheduledCount: number;
  lastScheduleTime: number | null;
  lastError: string | null;
  activeAlarmsCount: number;
}
