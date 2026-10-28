import { createNavigationContainerRef } from '@react-navigation/native';
import { DeviceEventEmitter } from 'react-native';

export const navigationRef = createNavigationContainerRef<any>();

/**
 * Global navigation helper to open the Weekly Report directly from notifications
 */
export function openWeeklyReportScreen(dateStr?: string) {
  DeviceEventEmitter.emit('open_weekly_report', { date: dateStr });
  if (navigationRef.isReady()) {
    try {
      navigationRef.navigate('Analytics', { openWeeklyReport: true, date: dateStr });
    } catch (e) {
      console.warn('[NavigationService] Failed to navigate to Analytics:', e);
    }
  }
}

/**
 * Global navigation helper to open the Active Workout Logging screen directly from notifications
 */
export function openActiveLoggingScreen(dateStr?: string, autoPromptEnd?: boolean) {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  DeviceEventEmitter.emit('OPEN_ACTIVE_WORKOUT', { date: targetDate, autoPromptEnd });
  if (navigationRef.isReady()) {
    try {
      navigationRef.navigate('ActiveLogging', { date: targetDate, autoPromptEnd });
    } catch (e) {
      console.warn('[NavigationService] Failed to navigate to ActiveLogging:', e);
    }
  }
}
