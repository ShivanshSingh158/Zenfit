/**
 * haptics.ts — ZenTrack Mobile
 *
 * Universal Haptic Controller connected to ZenFit Settings (Tactile Haptics toggle).
 * When haptics are turned OFF in Settings, ALL haptics across the entire app
 * are immediately and completely suppressed.
 */

import * as Haptics from 'expo-haptics';
import { Platform, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isHapticsEnabledSync } from '../hooks/useGymProfile';

let _isHapticsEnabled = true;

// 1. Instant sync initialization from memory
try {
  _isHapticsEnabled = isHapticsEnabledSync();
} catch (_) {}

// 2. Initial async validation from persistent storage keys
AsyncStorage.getItem('gym_profile_v1').then(raw => {
  if (raw) {
    try {
      const p = JSON.parse(raw);
      if (typeof p.hapticsEnabled === 'boolean') {
        _isHapticsEnabled = p.hapticsEnabled;
      }
    } catch (_) {}
  }
}).catch(() => {});

AsyncStorage.getItem('zentrack_gym_settings_prefs_v1').then(raw => {
  if (raw) {
    try {
      const p = JSON.parse(raw);
      if (typeof p.hapticsEnabled === 'boolean') {
        _isHapticsEnabled = p.hapticsEnabled;
      }
    } catch (_) {}
  }
}).catch(() => {});

// 3. Real-time broadcast listeners (Settings toggle updates in 0ms)
DeviceEventEmitter.addListener('gym_profile_updated', (profile: any) => {
  if (profile && typeof profile.hapticsEnabled === 'boolean') {
    _isHapticsEnabled = profile.hapticsEnabled;
  }
});

DeviceEventEmitter.addListener('haptics_setting_changed', (enabled: boolean) => {
  _isHapticsEnabled = Boolean(enabled);
});

export function setHapticsEnabledGlobal(enabled: boolean): void {
  _isHapticsEnabled = Boolean(enabled);
  DeviceEventEmitter.emit('haptics_setting_changed', enabled);
}

export function isHapticsEnabled(): boolean {
  return _isHapticsEnabled;
}

// ─── Guard wrapper: drops calls if Web or user turned OFF haptics in Settings ───
const guard = (fn: () => void) => () => {
  if (Platform.OS === 'web' || !_isHapticsEnabled) return;
  try {
    fn();
  } catch (_) {}
};

export const feedback = {
  /** Light — happens constantly, must never feel heavy */
  tap: guard(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),

  /** Medium — a real state change just happened */
  commit: guard(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),

  /** Distinct two-pulse pattern — reserve for genuine wins */
  success: guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),

  /** Different enough from success that it doesn't feel like praise */
  warning: guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),

  /** Heavy — starting workout, primary physical activation */
  heavy: guard(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),

  /** Continuous light ticks, like a physical dial */
  selectionChange: guard(() => Haptics.selectionAsync()),
};

// ─── Semantic Helper Aliases ──────────────────────────────────────────────────
export const hapticLight     = feedback.tap;
export const hapticMedium    = feedback.commit;
export const hapticHeavy     = feedback.heavy;
export const hapticSuccess   = feedback.success;
export const hapticError     = feedback.warning;
export const hapticSelection = feedback.selectionChange;

// ─── Direct Call Emulation with Settings Guard ────────────────────────────────
export const ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = Haptics.NotificationFeedbackType;

export async function impactAsync(style = Haptics.ImpactFeedbackStyle.Medium): Promise<void> {
  if (Platform.OS === 'web' || !_isHapticsEnabled) return;
  try {
    await Haptics.impactAsync(style);
  } catch (_) {}
}

export async function notificationAsync(type = Haptics.NotificationFeedbackType.Success): Promise<void> {
  if (Platform.OS === 'web' || !_isHapticsEnabled) return;
  try {
    await Haptics.notificationAsync(type);
  } catch (_) {}
}

export async function selectionAsync(): Promise<void> {
  if (Platform.OS === 'web' || !_isHapticsEnabled) return;
  try {
    await Haptics.selectionAsync();
  } catch (_) {}
}
