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
