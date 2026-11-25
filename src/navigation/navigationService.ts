import { createNavigationContainerRef } from '@react-navigation/native';
import { DeviceEventEmitter } from 'react-native';
import { todayStr } from '../utils/dateCore';

export const navigationRef = createNavigationContainerRef<any>();

type PendingNavAction =
  | { type: 'weekly_report'; dateStr?: string }
  | { type: 'active_logging'; dateStr?: string; autoPromptEnd?: boolean };

let _pendingNavAction: PendingNavAction | null = null;

/**
 * Global navigation helper to open the Weekly Report directly from notifications.
 * Queues cleanly if invoked on cold start before NavigationContainer mounts.
 */
export function openWeeklyReportScreen(dateStr?: string) {
  DeviceEventEmitter.emit('open_weekly_report', { date: dateStr });
  if (navigationRef.isReady()) {
    try {
      navigationRef.navigate('MainTabs', {
        screen: 'Analytics',
        params: { openWeeklyReport: true, date: dateStr },
      });
    } catch (e) {
      console.warn('[NavigationService] Failed to navigate to Analytics:', e);
    }
  } else {
    _pendingNavAction = { type: 'weekly_report', dateStr };
  }
}

/**
 * Global navigation helper to open the Active Workout Logging screen directly from notifications.
 * Queues cleanly if invoked on cold start before NavigationContainer mounts.
 */
export function openActiveLoggingScreen(dateStr?: string, autoPromptEnd?: boolean) {
  const targetDate = dateStr || todayStr();
  DeviceEventEmitter.emit('OPEN_ACTIVE_WORKOUT', { date: targetDate, autoPromptEnd });
  if (navigationRef.isReady()) {
    try {
      navigationRef.navigate('ActiveLogging', { date: targetDate, autoPromptEnd });
    } catch (e) {
      console.warn('[NavigationService] Failed to navigate to ActiveLogging:', e);
    }
  } else {
    _pendingNavAction = { type: 'active_logging', dateStr: targetDate, autoPromptEnd };
  }
}

/**
 * Drains any cold-start notification navigation queued prior to NavigationContainer.onReady().
 */
export function flushPendingNavigation(): void {
  if (!_pendingNavAction || !navigationRef.isReady()) return;
  const action = _pendingNavAction;
  _pendingNavAction = null;
  if (action.type === 'weekly_report') {
    openWeeklyReportScreen(action.dateStr);
  } else {
    openActiveLoggingScreen(action.dateStr, action.autoPromptEnd);
  }
}
