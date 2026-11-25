let _cachedNotifPermGranted: boolean | null = null;
import * as Notifications from 'expo-notifications';
import { Platform, DeviceEventEmitter } from 'react-native';
import { requestNotificationPermissions } from './notificationChannels';
import { getGymProfileSync } from '../hooks/useGymProfile';
import { formatWeight } from '../utils/weightUnit';

export const WORKOUT_NOTIFICATION_ID = 'zentrack_active_workout_hud';
export const WORKOUT_IN_PROGRESS_NOTIF_ID = 'zenfit_workout_in_progress';
export const WORKOUT_COMPLETED_NOTIF_ID = 'zenfit_workout_completed';
export const WORKOUT_AUTO_FINISH_NOTIF_ID = 'zenfit_workout_autofinish_120m';

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
  weight?: number;
  reps?: number;
  isResting?: boolean;
  restSecondsRemaining?: number;
  nextExerciseName?: string;
}): Promise<void> {
  try {
    if (_cachedNotifPermGranted !== true) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const ok = await requestNotificationPermissions();
        _cachedNotifPermGranted = ok;
        if (!ok) return;
      } else {
        _cachedNotifPermGranted = true;
      }
    }

    const name = params.workoutName || 'Workout';
    const completedCount = params.completedSets ?? 0;
    const totalCount = params.totalSets ? `/${params.totalSets}` : '';
    const unitIsLbs = Boolean(getGymProfileSync()?.unitIsLbs);
    const weightRepStr = (params.weight !== undefined && params.reps !== undefined && params.weight > 0)
      ? ` · ${formatWeight(params.weight, unitIsLbs, 1)} × ${params.reps}`
      : (params.reps ? ` · ${params.reps} reps` : '');
    
    let restStr = '';
    if (params.isResting && params.restSecondsRemaining !== undefined && params.restSecondsRemaining > 0) {
      restStr = ` · Rest: ${formatRestTime(params.restSecondsRemaining)}`;
    }
    const nextStr = params.nextExerciseName ? ` · Up: ${params.nextExerciseName}` : '';

    const body = `${name} · Set ${completedCount}${totalCount}${weightRepStr}${restStr}${nextStr} · Tap to resume`;

    await Notifications.scheduleNotificationAsync({
      identifier: WORKOUT_IN_PROGRESS_NOTIF_ID,
      content: {
        title: 'Workout in Progress',
        body,
        sound: undefined,
        sticky: true,       // Persistent ongoing notification on Android (cannot be dismissed by swipe or Clear All)
        autoDismiss: false, // CRITICAL: Do NOT auto-dismiss when tapped
        priority: Notifications.AndroidNotificationPriority.LOW, // Silent ongoing notification in shade
        categoryIdentifier: 'active_workout_ongoing',
        color: '#30D158',
        data: {
          type: 'ACTIVE_WORKOUT_IN_PROGRESS',
          date: params.dateStr,
        },
        ...(Platform.OS === 'android' ? { channelId: WORKOUT_IN_PROGRESS_CHANNEL_ID } : {}),
      },
      trigger: null,
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

    if (_cachedNotifPermGranted !== true) {
      const { status } = await Notifications.getPermissionsAsync();
      _cachedNotifPermGranted = status === 'granted';
      if (!_cachedNotifPermGranted) return;
    }

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
        ...(Platform.OS === 'android' ? { channelId: 'gym_reminders' } : {}),
      },
      trigger: null,
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
  if (
    lastNotificationState &&
    lastNotificationState.exerciseName === payload.exerciseName &&
    lastNotificationState.currentSet === payload.currentSet &&
    lastNotificationState.totalSets === payload.totalSets &&
    lastNotificationState.weight === payload.weight &&
    lastNotificationState.reps === payload.reps &&
    lastNotificationState.isResting === payload.isResting &&
    lastNotificationState.restSecondsRemaining === payload.restSecondsRemaining &&
    lastNotificationState.nextExerciseName === payload.nextExerciseName
  ) {
    return;
  }

  if (_hudUpdateDebounceTimer) {
    clearTimeout(_hudUpdateDebounceTimer);
  }
  _pendingHudPayload = payload;
  _hudUpdateDebounceTimer = setTimeout(() => {
    _hudUpdateDebounceTimer = null;
    if (_pendingHudPayload) {
      lastNotificationState = { ..._pendingHudPayload };
      showWorkoutInProgressNotification({
        workoutName: _pendingHudPayload.exerciseName,
        completedSets: _pendingHudPayload.currentSet,
        totalSets: _pendingHudPayload.totalSets,
        weight: _pendingHudPayload.weight,
        reps: _pendingHudPayload.reps,
        isResting: _pendingHudPayload.isResting,
        restSecondsRemaining: _pendingHudPayload.restSecondsRemaining,
        nextExerciseName: _pendingHudPayload.nextExerciseName,
      }).catch(() => {});
    }
  }, 1200);
}

/**
 * Reconciles any orphaned persistent notification left over from force-kills or reboots
 */
export async function reconcileOrphanedWorkoutNotification(isWorkoutCurrentlyActive: boolean): Promise<void> {
  if (!isWorkoutCurrentlyActive) {
    await dismissActiveWorkoutNotification();
  }
}

/**
 * Schedules a notification to fire at exactly the 120-minute limit
 * if the user left the workout running in the background.
 */
export async function scheduleWorkoutAutoFinishNotification(params: {
  workoutName?: string;
  workoutStartTime: number;
  dateStr?: string;
}): Promise<void> {
  try {
    const elapsedMs = Math.max(0, Date.now() - params.workoutStartTime);
    const maxDurationMs = 120 * 60 * 1000; // 120 minutes
    const remainingMs = Math.max(0, maxDurationMs - elapsedMs);
    const remainingSecs = Math.max(1, Math.round(remainingMs / 1000));

    await Notifications.cancelScheduledNotificationAsync(WORKOUT_AUTO_FINISH_NOTIF_ID).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: WORKOUT_AUTO_FINISH_NOTIF_ID,
      content: {
        title: 'Workout Autocompleted',
        body: `${params.workoutName || 'Workout'} reached the 120-minute limit and was automatically saved.`,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'WORKOUT_COMPLETED',
          date: params.dateStr,
        },
        ...(Platform.OS === 'android' ? { channelId: 'gym_reminders' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: remainingSecs,
      } as any,
    });
  } catch (err) {
    console.warn('[Notification] Failed to schedule auto-finish notification:', err);
  }
}

export async function cancelWorkoutAutoFinishNotification(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(WORKOUT_AUTO_FINISH_NOTIF_ID).catch(() => {});
  } catch {}
}

/**
 * Dismisses the persistent lock screen workout notification
 */
export async function dismissActiveWorkoutNotification(): Promise<void> {
  isNotificationActive = false;
  lastNotificationState = null;
  cancelWorkoutAutoFinishNotification().catch(() => {});
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
let _notifResponseSub: Notifications.EventSubscription | null = null;

export function registerActiveWorkoutNotificationListeners() {
  if (_notifResponseSub) {
    _notifResponseSub.remove();
    _notifResponseSub = null;
  }

  _notifResponseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const actionId = response.actionIdentifier;
    const notificationData = response.notification.request.content.data as any;

    // 0. Completed Workout Notification Click
    if (notificationData?.type === 'WORKOUT_COMPLETED') {
      const workoutDate = notificationData?.date;
      try {
        const { openWorkoutSummaryScreen } = require('../navigation/navigationService');
        openWorkoutSummaryScreen(workoutDate);
      } catch (e) {
        DeviceEventEmitter.emit('OPEN_WORKOUT_SUMMARY', { date: workoutDate });
      }
      return;
    }

    // 0b. Daily Workout Reminder Click or START_WORKOUT action
    if (actionId === 'START_WORKOUT' || notificationData?.type === 'START_WORKOUT' || notificationData?.type === 'gym_workout') {
      const workoutDate = notificationData?.dateStr || notificationData?.date;
      try {
        const { openActiveLoggingScreen } = require('../navigation/navigationService');
        openActiveLoggingScreen(workoutDate, false);
      } catch (e) {
        DeviceEventEmitter.emit('OPEN_ACTIVE_WORKOUT', { date: workoutDate });
      }
      return;
    }

    // 0c. Snooze Action (15m or 1h)
    if (actionId === 'SNOOZE_15M' || actionId === 'SNOOZE_1H' || actionId === 'SNOOZE') {
      const snoozeSecs = actionId === 'SNOOZE_1H' ? 60 * 60 : 15 * 60;
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Workout Reminder (Snoozed)',
          body: 'Ready to train? Your session is waiting for you.',
          sound: 'default',
          data: { type: 'gym_workout', dateStr: notificationData?.dateStr },
          ...(Platform.OS === 'android' ? { channelId: 'gym_reminders' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: snoozeSecs,
        } as any,
      }).catch(() => {});
      return;
    }

    // 0d. Split Actions (PUSH_SPLIT, REST_TODAY, LOG_LATE, VIEW_BLUEPRINT, VIEW_RECOVERY)
    if (
      actionId === 'PUSH_SPLIT' ||
      actionId === 'REST_TODAY' ||
      actionId === 'LOG_LATE' ||
      actionId === 'VIEW_BLUEPRINT' ||
      actionId === 'VIEW_RECOVERY'
    ) {
      DeviceEventEmitter.emit('NOTIFICATION_SPLIT_ACTION', {
        action: actionId,
        dateStr: notificationData?.dateStr || notificationData?.date,
      });
      return;
    }

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

  return () => {
    if (_notifResponseSub) {
      _notifResponseSub.remove();
      _notifResponseSub = null;
    }
  };
}

