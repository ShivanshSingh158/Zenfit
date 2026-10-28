import * as Notifications from 'expo-notifications';
import { Platform, DeviceEventEmitter } from 'react-native';
import { requestNotificationPermissions } from './notificationChannels';

export const WORKOUT_NOTIFICATION_ID = 'zentrack_active_workout_hud';
export const WORKOUT_IN_PROGRESS_NOTIF_ID = 'zenfit_workout_in_progress';
export const WORKOUT_COMPLETED_NOTIF_ID = 'zenfit_workout_completed';

export interface ActiveWorkoutNotificationPayload {
  exerciseName: string;
  currentSet: number;
  totalSets: number;
  weight: number;
  reps: number;
  isResting?: boolean;
  restSecondsRemaining?: number;
  nextExerciseName?: string;
}

let lastNotificationState: ActiveWorkoutNotificationPayload | null = null;
let isNotificationActive = false;

// ── 1.5-second debounce for HUD / sets updates ─────────────────────────────
let _hudUpdateDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingHudPayload: ActiveWorkoutNotificationPayload | null = null;

function formatRestTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Shows or updates the ongoing, persistent "Workout in Progress" notification.
 * This stays pinned on Android (like Hevy / Strava) with sticky: true until the workout ends.
 */
export const WORKOUT_IN_PROGRESS_CHANNEL_ID = 'workout_in_progress_v2';

export async function showWorkoutInProgressNotification(params: {
  workoutName?: string;
  completedSets?: number;
  totalSets?: number;
  dateStr?: string;
}): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const ok = await requestNotificationPermissions();
      if (!ok) return;
    }

    const name = params.workoutName || 'Workout';
    const completedCount = params.completedSets ?? 0;
    const body = `${name} · ${completedCount} set${completedCount === 1 ? "" : "s"} logged · Tap to return or end session`;

    await Notifications.scheduleNotificationAsync({
      identifier: WORKOUT_IN_PROGRESS_NOTIF_ID,
      content: {
        title: '🏋️ Workout in Progress',
        body,
        sound: undefined,
        sticky: true,       // Persistent ongoing notification on Android (cannot be dismissed by swipe or Clear All)
        autoDismiss: false, // CRITICAL: Do NOT auto-dismiss when tapped
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: 'active_workout_ongoing',
        color: '#30D158',
        data: {
          type: 'ACTIVE_WORKOUT_IN_PROGRESS',
          date: params.dateStr,
        },
      },
      trigger: Platform.OS === 'android' ? ({ channelId: WORKOUT_IN_PROGRESS_CHANNEL_ID } as any) : null,
    });
    isNotificationActive = true;
  } catch (err) {
    console.warn('[Notification] Failed to present workout in progress notification:', err);
  }
}

/**
 * Shows the "Workout Completed" notification and removes the ongoing persistent notification.
 * The completion notification is a standard notification that the user can dismiss.
 */
export async function showWorkoutCompletedNotification(params: {
  workoutName?: string;
  completedSets?: number;
  durationMinutes?: number;
  dateStr?: string;
}): Promise<void> {
  try {
    // 1. Dismiss persistent ongoing notification
    await dismissActiveWorkoutNotification();

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const name = params.workoutName || 'Workout';
    const completedCount = params.completedSets ?? 0;
    const duration = params.durationMinutes ? ` in ${params.durationMinutes}m` : '';
    const body = `${name} · ${completedCount} sets finished${duration}`;

    // 2. Post clean, normal completion notification (can be swiped away)
    await Notifications.scheduleNotificationAsync({
      identifier: WORKOUT_COMPLETED_NOTIF_ID,
      content: {
        title: 'Workout Completed',
        body,
        sound: 'default',
        sticky: false, // Standard notification, removable
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        data: {
          type: 'WORKOUT_COMPLETED',
          date: params.dateStr,
        },
      },
      trigger: Platform.OS === 'android' ? ({ channelId: 'gym_reminders' } as any) : null,
    });
  } catch (err) {
    console.warn('[Notification] Failed to present workout completed notification:', err);
  }
}

/**
 * Updates or presents the lock screen active workout notification
 */
export async function updateActiveWorkoutNotification(
  payload: ActiveWorkoutNotificationPayload
): Promise<void> {
  if (_hudUpdateDebounceTimer) {
    clearTimeout(_hudUpdateDebounceTimer);
  }
  _pendingHudPayload = payload;
  _hudUpdateDebounceTimer = setTimeout(() => {
    _hudUpdateDebounceTimer = null;
    if (_pendingHudPayload) {
      showWorkoutInProgressNotification({
        workoutName: _pendingHudPayload.exerciseName,
        completedSets: _pendingHudPayload.currentSet,
      });
    }
  }, 1200);
}

/**
 * Dismisses the persistent lock screen workout notification
 */
export async function dismissActiveWorkoutNotification(): Promise<void> {
  isNotificationActive = false;
  lastNotificationState = null;
  if (_hudUpdateDebounceTimer) {
    clearTimeout(_hudUpdateDebounceTimer);
    _hudUpdateDebounceTimer = null;
    _pendingHudPayload = null;
  }
  try {
    await Notifications.dismissNotificationAsync(WORKOUT_IN_PROGRESS_NOTIF_ID);
    await Notifications.dismissNotificationAsync(WORKOUT_NOTIFICATION_ID);
  } catch {}
}

export function isWorkoutNotificationActive(): boolean {
  return isNotificationActive;
}

/**
 * Cancels and dismisses any pending weekly report primary or follow-up notifications for this date
 */
export async function dismissWeeklyReportFollowUp(dateStr: string): Promise<void> {
  if (!dateStr) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`gym_weekly_report_reminder_${dateStr}`);
    await Notifications.dismissNotificationAsync(`gym_weekly_report_reminder_${dateStr}`);
    await Notifications.cancelScheduledNotificationAsync(`gym_weekly_report_${dateStr}`);
    await Notifications.dismissNotificationAsync(`gym_weekly_report_${dateStr}`);
  } catch {}
}

// ─── Notification Action Handler Listener ────────────────────────────────────
export function registerActiveWorkoutNotificationListeners() {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const actionId = response.actionIdentifier;
    const notificationData = response.notification.request.content.data as any;

    // 1. Weekly Report Notification Click
    if (notificationData?.type === 'weekly_report' || actionId === 'VIEW_REPORT') {
      const restDateStr = typeof notificationData?.dateStr === 'string' ? notificationData.dateStr : undefined;
      if (restDateStr) {
        dismissWeeklyReportFollowUp(restDateStr).catch(() => {});
      }
      try {
        const { openWeeklyReportScreen } = require('../navigation/navigationService');
        openWeeklyReportScreen(restDateStr);
      } catch (e) {
        DeviceEventEmitter.emit('open_weekly_report', { date: restDateStr });
      }
      return;
    }

    // 2. Active Workout In-Progress Notification Click or Quick Action
    const isWorkoutInProgressNotif =
      notificationData?.type === 'ACTIVE_WORKOUT_IN_PROGRESS' ||
      response.notification.request.identifier === WORKOUT_IN_PROGRESS_NOTIF_ID;

    if (isWorkoutInProgressNotif) {
      const workoutDate = notificationData?.date;
      try {
        const { openActiveLoggingScreen } = require('../navigation/navigationService');
        if (actionId === 'WORKOUT_END') {
          openActiveLoggingScreen(workoutDate, true);
          DeviceEventEmitter.emit('ACTIVE_WORKOUT_ACTION', { action: 'END_WORKOUT' });
        } else {
          // Tapped notification body or 'OPEN_WORKOUT' button
          openActiveLoggingScreen(workoutDate, false);
        }
      } catch (e) {
        DeviceEventEmitter.emit('OPEN_ACTIVE_WORKOUT', { date: workoutDate, action: actionId });
      }
      return;
    }

    if (notificationData?.type !== 'ACTIVE_WORKOUT_HUD' && !actionId.startsWith('WORKOUT_') && !actionId.startsWith('REST_')) {
      return;
    }

    switch (actionId) {
      case 'WORKOUT_DONE_SET':
        DeviceEventEmitter.emit('ACTIVE_WORKOUT_ACTION', { action: 'DONE_SET' });
        break;
      case 'WORKOUT_ADD_WEIGHT':
        DeviceEventEmitter.emit('ACTIVE_WORKOUT_ACTION', { action: 'ADD_WEIGHT', delta: 2.5 });
        break;
      case 'WORKOUT_NEXT_EXERCISE':
        DeviceEventEmitter.emit('ACTIVE_WORKOUT_ACTION', { action: 'NEXT_EXERCISE' });
        break;
      case 'REST_SKIP':
        DeviceEventEmitter.emit('ACTIVE_WORKOUT_ACTION', { action: 'SKIP_REST' });
        break;
      case 'REST_ADD_30S':
        DeviceEventEmitter.emit('ACTIVE_WORKOUT_ACTION', { action: 'ADD_REST_SECONDS', seconds: 30 });
        break;
      default:
        break;
    }
  });

  return () => subscription.remove();
}

