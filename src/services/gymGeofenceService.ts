/**
 * gymGeofenceService.ts — ZenFit
 *
 * OS-Native Geofenced Gym Arrival Reminder Engine (openGym v1.4.3):
 * Uses hardware region monitoring (<0.5% battery per day, using cell tower / Wi-Fi beacons).
 * GPS chip stays OFF until crossing the 150m gym boundary.
 *
 * When the athlete arrives at the gym door:
 * - Checks daily completion guard (silences if workout already finished today).
 * - Checks active session guard (silences if workout already in progress).
 * - Checks 16h cooldown guard (prevents repeated triggers).
 * - Sends: "Arrived at Gold's Gym! Ready for Workout B: Pull? [Start Workout]".
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/constants';
import { GymGeofenceConfig } from '../types/gym.types';
import { formatLocalDateStr } from '../utils/dateUtils';
import { getWorkoutActiveGlobal } from '../contexts/domains/WellnessContext';

export const GYM_GEOFENCE_TASK = 'ZENFIT_GYM_GEOFENCE_TASK';
const COOLDOWN_HOURS = 16;

export const DEFAULT_GEOFENCE_CONFIG: GymGeofenceConfig = {
  enabled: false,
  gymName: 'Gym',
  latitude: 0,
  longitude: 0,
  radiusMeters: 150,
};

// ── 1. Register Background Geofencing Task ──────────────────────────────────
try {
  if (!TaskManager.isTaskDefined(GYM_GEOFENCE_TASK)) {
    TaskManager.defineTask(GYM_GEOFENCE_TASK, async ({ data, error }: any) => {
      if (error) {
        console.warn('[GeofenceTask] Error:', error.message);
        return;
      }

      if (data) {
        const { eventType, region } = data;
        if (eventType === Location.GeofencingEventType.Enter) {
          await handleGeofenceArrival(region?.identifier);
        }
      }
    });
  }
} catch (e) {
  console.warn('[GeofenceTask] Definition failed:', e);
}

/**
 * Handles gym arrival with anti-spam and daily completion guards.
 */
async function handleGeofenceArrival(regionId?: string) {
  try {
    // 1. Active workout guard: don't alert if workout is already running
    if (getWorkoutActiveGlobal()) return;

    // 2. Cooldown guard: must be at least 16h since last arrival alert
    const lastTriggerRaw = await AsyncStorage.getItem(STORAGE_KEYS.GYM_GEOFENCE_LAST_TRIGGER);
    const now = Date.now();
    if (lastTriggerRaw) {
      const lastTrigger = Number(lastTriggerRaw);
      const hoursSince = (now - lastTrigger) / (1000 * 60 * 60);
      if (hoursSince < COOLDOWN_HOURS) return;
    }

    // 3. Completed today guard: check if workout was already finished today
    const todayTag = formatLocalDateStr(new Date());
    const completedTodayKey = `gym_completed_${todayTag}`;
    const completedFlag = await AsyncStorage.getItem(completedTodayKey);
    if (completedFlag === 'true') return;

    // Load config for gym name
    const config = await getGymGeofenceConfig();
    const gymLabel = config.gymName?.trim() || 'Gym';

    // Update cooldown timestamp
    await AsyncStorage.setItem(STORAGE_KEYS.GYM_GEOFENCE_LAST_TRIGGER, String(now));

    // Send local push notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📍 Arrived at ${gymLabel}!`,
        body: `Ready to crush today's session? Tap to start workout.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'START_WORKOUT',
          source: 'geofence',
        },
      },
      trigger: null, // deliver immediately
    });
  } catch (err) {
    console.warn('[GeofenceArrival] Error handling arrival:', err);
  }
}

// ── 2. Configuration & Permission Management ────────────────────────────────

export async function getGymGeofenceConfig(): Promise<GymGeofenceConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.GYM_GEOFENCE_CONFIG);
    if (!raw) return DEFAULT_GEOFENCE_CONFIG;
    return { ...DEFAULT_GEOFENCE_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_GEOFENCE_CONFIG;
  }
}

export async function saveGymGeofenceConfig(config: GymGeofenceConfig): Promise<{ success: boolean; error?: string }> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.GYM_GEOFENCE_CONFIG, JSON.stringify(config));

    if (config.enabled && config.latitude !== 0 && config.longitude !== 0) {
      // 1. Check permissions
      const fg = await Location.requestForegroundPermissionsAsync();
      if (fg.status !== 'granted') {
        return { success: false, error: 'Location permission while using the app is required to save your gym location.' };
      }

      const bg = await Location.requestBackgroundPermissionsAsync();
      if (bg.status !== 'granted') {
        return { success: false, error: 'Background location permission is required for the OS to monitor gym arrival while your phone is locked.' };
      }

      // 2. Start region monitoring
      const hasStarted = await Location.hasStartedGeofencingAsync(GYM_GEOFENCE_TASK);
      if (hasStarted) {
        await Location.stopGeofencingAsync(GYM_GEOFENCE_TASK);
      }

      await Location.startGeofencingAsync(GYM_GEOFENCE_TASK, [
        {
          identifier: 'zenfit_gym_location',
          latitude: config.latitude,
          longitude: config.longitude,
          radius: config.radiusMeters || 150,
          notifyOnEnter: true,
          notifyOnExit: false,
        },
      ]);

      return { success: true };
    } else {
      // Disabled: stop monitoring
      const hasStarted = await Location.hasStartedGeofencingAsync(GYM_GEOFENCE_TASK).catch(() => false);
      if (hasStarted) {
        await Location.stopGeofencingAsync(GYM_GEOFENCE_TASK);
      }
      return { success: true };
    }
  } catch (err: any) {
    console.warn('[GeofenceConfig] Error saving config:', err);
    return { success: false, error: err?.message || 'Failed to configure geofencing' };
  }
}

export async function getCurrentUserCoordinates(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') return null;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };
  } catch (err) {
    console.warn('[GeofenceCoord] Error getting position:', err);
    return null;
  }
}

export async function testGymArrivalNotification(gymName: string): Promise<void> {
  const gymLabel = gymName?.trim() || 'Gym';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `📍 Arrived at ${gymLabel}!`,
      body: `Ready to crush today's session? Tap to start workout.`,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: {
        type: 'START_WORKOUT',
        source: 'test_geofence',
      },
    },
    trigger: null,
  });
}

