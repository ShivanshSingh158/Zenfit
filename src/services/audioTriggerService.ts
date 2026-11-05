/**
 * audioTriggerService.ts — ZenFit
 *
 * Bluetooth Headphone Trigger Engine (openGym v1.4.3):
 * Automatically detects when the athlete puts on Bluetooth headphones / earbuds
 * (AirPods, Galaxy Buds, Beats, Sony WH/WF, Bose, or any BT device).
 *
 * Zero-Location & Battery-Friendly:
 * - Requires 0% location permissions.
 * - Anti-spam guards:
 *   1. Active Workout Guard (silences if workout is already running).
 *   2. Daily Completion Guard (silences if user already finished today's session).
 *   3. 4-Hour Cooldown Guard (prevents spam when repeatedly taking earbuds out).
 *   4. Active Workout Hours Filter (e.g. only between 05:00 and 21:00).
 *   5. Optional Device Name Filter (target specific gym headphones).
 */

import { AppState, AppStateStatus, DeviceEventEmitter } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/constants';
import { BluetoothTriggerConfig } from '../types/gym.types';
import { formatLocalDateStr } from '../utils/dateUtils';
import { getWorkoutActiveGlobal } from '../contexts/domains/WellnessContext';

export const DEFAULT_BLUETOOTH_CONFIG: BluetoothTriggerConfig = {
  enabled: false,
  targetDeviceName: '',
  filterWorkoutHours: true,
  startHour: '05:00',
  endHour: '21:00',
  autoLaunchWorkout: false,
};

const BLUETOOTH_COOLDOWN_HOURS = 4;

// ── 1. Configuration Storage ────────────────────────────────────────────────

export async function getBluetoothTriggerConfig(): Promise<BluetoothTriggerConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BLUETOOTH_TRIGGER_CONFIG);
    if (!raw) return DEFAULT_BLUETOOTH_CONFIG;
    return { ...DEFAULT_BLUETOOTH_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BLUETOOTH_CONFIG;
  }
}

export async function saveBluetoothTriggerConfig(config: BluetoothTriggerConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.BLUETOOTH_TRIGGER_CONFIG, JSON.stringify(config));
  } catch (err) {
    console.warn('[AudioTrigger] Failed to save config:', err);
  }
}

// ── 1b. Auto-Detection of Connected Audio Device ────────────────────────────

/**
 * Detects currently connected Bluetooth audio device or earbuds.
 * Queries ExponentAV native audio inputs without requiring recording permissions.
 */
export async function detectConnectedAudioDevice(): Promise<{ name: string; type: string } | null> {
  try {
    const ExponentAV = require('expo-av/build/ExponentAV').default;
    if (ExponentAV?.getAvailableInputs) {
      const inputs = await ExponentAV.getAvailableInputs();
      if (Array.isArray(inputs) && inputs.length > 0) {
        // 1. Look for bluetooth or headset/headphones inputs first
        const bt = inputs.find(
          (i: any) =>
            i.type?.toLowerCase().includes('bluetooth') ||
            i.name?.toLowerCase().includes('bluetooth') ||
            i.type?.toLowerCase().includes('headset') ||
            i.type?.toLowerCase().includes('headphone')
        );
        if (bt && bt.name) {
          const cleanName = bt.name
            .replace(/^Bluetooth\s*[-:]?\s*/i, '')
            .replace(/\s*\(Bluetooth\)$/i, '')
            .trim();
          return { name: cleanName || bt.name, type: bt.type };
        }

        // 2. Check currently selected input if not built-in mic
        if (ExponentAV?.getCurrentInput) {
          const current = await ExponentAV.getCurrentInput();
          if (
            current &&
            current.name &&
            !current.name.toLowerCase().includes('built-in') &&
            !current.name.toLowerCase().includes('microphone')
          ) {
            const cleanName = current.name
              .replace(/^Bluetooth\s*[-:]?\s*/i, '')
              .replace(/\s*\(Bluetooth\)$/i, '')
              .trim();
            return { name: cleanName || current.name, type: current.type };
          }
        }
      }
    }
  } catch (err) {
    console.warn('[AudioTrigger] Could not query audio inputs:', err);
  }
  return null;
}

// ── 2. Time & Guard Validation ──────────────────────────────────────────────

function isWithinWorkoutHours(startHour: string, endHour: string): boolean {
  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [sh, sm] = startHour.split(':').map(Number);
    const [eh, em] = endHour.split(':').map(Number);

    const startMinutes = (sh || 5) * 60 + (sm || 0);
    const endMinutes = (eh || 21) * 60 + (em || 0);

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } catch {
    return true;
  }
}

/**
 * Checks all guards before firing:
 * 1. Is Bluetooth trigger enabled?
 * 2. Is workout active right now?
 * 3. Was a workout already completed today?
 * 4. Is the cooldown period elapsed (4 hours)?
 * 5. Are we within the configured workout hours?
 */
export async function canFireBluetoothTrigger(targetDeviceName?: string): Promise<{ canFire: boolean; reason?: string }> {
  const config = await getBluetoothTriggerConfig();
  if (!config.enabled) {
    return { canFire: false, reason: 'Bluetooth trigger disabled' };
  }

  // Guard 1: Active workout running
  if (getWorkoutActiveGlobal()) {
    return { canFire: false, reason: 'Workout already active' };
  }

  // Guard 2: Workout already completed today
  const todayTag = formatLocalDateStr(new Date());
  const completedFlag = await AsyncStorage.getItem(`gym_completed_${todayTag}`);
  if (completedFlag === 'true') {
    return { canFire: false, reason: 'Workout already completed today' };
  }

  // Guard 3: Cooldown guard (4 hours)
  const lastTriggerRaw = await AsyncStorage.getItem(STORAGE_KEYS.BLUETOOTH_TRIGGER_LAST);
  const now = Date.now();
  if (lastTriggerRaw) {
    const lastTrigger = Number(lastTriggerRaw);
    const hoursSince = (now - lastTrigger) / (1000 * 60 * 60);
    if (hoursSince < BLUETOOTH_COOLDOWN_HOURS) {
      return { canFire: false, reason: `In cooldown (${Math.round(hoursSince * 10) / 10}h / ${BLUETOOTH_COOLDOWN_HOURS}h)` };
    }
  }

  // Guard 4: Workout hours filter
  if (config.filterWorkoutHours) {
    if (!isWithinWorkoutHours(config.startHour, config.endHour)) {
      return { canFire: false, reason: 'Outside of configured workout hours' };
    }
  }

  // Guard 5: Target device name match (if configured)
  if (config.targetDeviceName && config.targetDeviceName.trim().length > 0) {
    const filter = config.targetDeviceName.trim().toLowerCase();
    if (targetDeviceName) {
      const actual = targetDeviceName.toLowerCase();
      if (!actual.includes(filter)) {
        return { canFire: false, reason: `Connected device '${targetDeviceName}' does not match '${config.targetDeviceName}'` };
      }
    }
  }

  return { canFire: true };
}

// ── 3. Trigger Execution ────────────────────────────────────────────────────

/**
 * Handles detection of headphone connection:
 * Validates guards, updates last trigger timestamp, sends push notification,
 * or launches workout directly if configured.
 */
export async function handleHeadphonesConnected(deviceName?: string): Promise<boolean> {
  const check = await canFireBluetoothTrigger(deviceName);
  if (!check.canFire) {
    return false;
  }

  const config = await getBluetoothTriggerConfig();
  const now = Date.now();
  await AsyncStorage.setItem(STORAGE_KEYS.BLUETOOTH_TRIGGER_LAST, String(now));

  const deviceLabel = deviceName?.trim() || config.targetDeviceName?.trim() || 'Headphones';

  // If user enabled direct auto-launch and app is currently in foreground:
  if (config.autoLaunchWorkout && AppState.currentState === 'active') {
    try {
      const { openActiveLoggingScreen } = require('../navigation/navigationService');
      openActiveLoggingScreen(undefined, false);
      return true;
    } catch {
      DeviceEventEmitter.emit('OPEN_ACTIVE_WORKOUT', {});
    }
  }

  // Otherwise schedule / display high-priority local notification
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🎧 ${deviceLabel} Connected!`,
        body: `Time to crush today's training session! Tap to start workout.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'START_WORKOUT',
          source: 'bluetooth_headphones',
        },
      },
      trigger: null,
    });
    return true;
  } catch (err) {
    console.warn('[AudioTrigger] Error sending notification:', err);
    return false;
  }
}

/**
 * Test button in settings to preview the notification experience.
 */
export async function testBluetoothTriggerNotification(deviceName?: string): Promise<void> {
  const deviceLabel = deviceName?.trim() || 'AirPods Pro';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🎧 ${deviceLabel} Connected!`,
      body: `Time to crush today's training session! Tap to start workout.`,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: {
        type: 'START_WORKOUT',
        source: 'test_bluetooth',
      },
    },
    trigger: null,
  });
}

// ── 4. App State & Route Listener ───────────────────────────────────────────

/**
 * Initializes foreground listener that checks when app resumes.
 * Returns unsubscribe cleanup function.
 */
export function initBluetoothTriggerListener(): () => void {
  let lastState: AppStateStatus = AppState.currentState;

  const appStateSub = AppState.addEventListener('change', async (nextState) => {
    if (lastState.match(/inactive|background/) && nextState === 'active') {
      const config = await getBluetoothTriggerConfig();
      if (config.enabled) {
        // Can inspect route or connected devices here
      }
    }
    lastState = nextState;
  });

  return () => {
    appStateSub.remove();
  };
}

