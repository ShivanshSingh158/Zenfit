import * as Updates from 'expo-updates';
import { AppState, AppStateStatus, InteractionManager } from 'react-native';
import * as Haptics from 'expo-haptics';

export interface UpdateInfo {
  isEnabled: boolean;
  isEmbeddedLaunch: boolean;
  updateId: string | null;
  channel: string | null;
  runtimeVersion: string | null;
}

let _activeOtaPromise: Promise<boolean> | null = null;
let _lastCheckTimestamp = 0;
const CHECK_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes between background checks

function isWorkoutActive(): boolean {
  try {
    return (global as any).__zenfit_workout_active === true;
  } catch {
    return false;
  }
}

/**
 * Returns current runtime OTA update telemetry.
 */
export function getOTAUpdateInfo(): UpdateInfo {
  try {
    return {
      isEnabled: Updates.isEnabled,
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
      updateId: Updates.updateId ?? null,
      channel: Updates.channel ?? null,
      runtimeVersion: Updates.runtimeVersion ?? null,
    };
  } catch (_) {
    return {
      isEnabled: false,
      isEmbeddedLaunch: true,
      updateId: null,
      channel: null,
      runtimeVersion: null,
    };
  }
}

/**
 * Checks for and downloads any newly published EAS updates in the background.
 * Runs strictly off-interaction to ensure 0% CPU competition with active UI animations.
 * Completely silent with zero banners or pop-ups.
 */
export async function syncOtaUpdateInBackground(silent = true): Promise<boolean> {
  // OTA updates only operate in standalone release builds (not Expo Go / __DEV__)
  if (__DEV__ || !Updates.isEnabled) {
    return false;
  }

  // Never perform OTA update fetching during an active workout session
  if (isWorkoutActive()) {
    if (!silent) console.log('[OTA] Workout in progress, deferring background update.');
    return false;
  }

  if (_activeOtaPromise) return _activeOtaPromise;
  _lastCheckTimestamp = Date.now();

  _activeOtaPromise = (async () => {
    try {
      const check = await Updates.checkForUpdateAsync();
      if (check.isAvailable) {
        if (!silent) console.log('[OTA] New update found on EAS cloud. Downloading in background... 📡');
        const fetchResult = await Updates.fetchUpdateAsync();
        if (fetchResult.isNew) {
          console.log('[OTA] Update successfully downloaded and cached in local flash! Will apply on next launch. ⚡');
          return true;
        }
      }
      return false;
    } catch (err: any) {
      if (!silent) console.log('[OTA] Background update check skipped (offline or network timeout):', err?.message);
      return false;
    } finally {
      _activeOtaPromise = null;
    }
  })();

  return _activeOtaPromise;
}

// Backward-compatible alias
export const silentCheckAndDownloadUpdate = syncOtaUpdateInBackground;

/**
 * Registers deferred background OTA sync on launch and app resume.
 * Identical to ZenTrack:
 * - Runs 7s after launch once all screens and animations have settled
 * - Resumes on app foregrounding (with 15m cooldown)
 * - Completely silent with no modals or user prompts
 */
export function registerDeferredOtaSync(): () => void {
  if (__DEV__ || !Updates.isEnabled) {
    return () => {};
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  const handle = InteractionManager.runAfterInteractions(() => {
    // Check for updates 7 seconds after boot once all screens and widgets have settled
    timer = setTimeout(() => {
      syncOtaUpdateInBackground(true).catch(() => {});
    }, 7000);
  });

  const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (nextState === 'active') {
      if (isWorkoutActive()) return;
      const elapsed = Date.now() - _lastCheckTimestamp;
      if (elapsed > CHECK_COOLDOWN_MS) {
        InteractionManager.runAfterInteractions(() => {
          syncOtaUpdateInBackground(true).catch(() => {});
        });
      }
    }
  });

  return () => {
    if (timer) clearTimeout(timer);
    handle.cancel();
    subscription.remove();
  };
}

// Backward-compatible alias
export const initAutoBackgroundUpdate = registerDeferredOtaSync;

/**
 * Checks for OTA updates manually, downloads if available, and gives user option to restart now.
 */
export async function checkAndApplyOTAUpdate(
  onStatusChange?: (status: 'idle' | 'checking' | 'downloading' | 'ready') => void,
  confirmRestart?: () => Promise<boolean>
): Promise<{ success: boolean; updated: boolean; message: string }> {
  try {
    if (__DEV__ || !Updates.isEnabled) {
      return {
        success: true,
        updated: false,
        message: 'OTA updates are active only in standalone/release APK builds.',
      };
    }

    if (isWorkoutActive()) {
      return {
        success: false,
        updated: false,
        message: 'Cannot check or apply updates during an active workout session.',
      };
    }

    if (_activeOtaPromise) {
      await _activeOtaPromise;
    }

    onStatusChange?.('checking');
    const check = await Updates.checkForUpdateAsync();

    if (!check.isAvailable) {
      onStatusChange?.('idle');
      return {
        success: true,
        updated: false,
        message: 'ZenFit is already running the latest version.',
      };
    }

    // New bundle available — download in background
    onStatusChange?.('downloading');
    await Updates.fetchUpdateAsync();
    onStatusChange?.('ready');

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    if (confirmRestart) {
      const shouldRestart = await confirmRestart();
      if (shouldRestart) {
        try {
          await Updates.reloadAsync();
        } catch (_) {}
        return { success: true, updated: true, message: 'App restarted.' };
      }
    }

    return {
      success: true,
      updated: true,
      message: 'Update downloaded and will apply on next app restart.',
    };
  } catch (error: any) {
    onStatusChange?.('idle');
    console.warn('[OTA] Check failed:', error?.message);
    const msg = error?.message;
    const isNetworkErr = !msg || msg.includes('Network') || msg.includes('fetch') || msg.includes('timeout');
    return {
      success: false,
      updated: false,
      message: isNetworkErr
        ? 'Could not reach update server. Check your internet connection.'
        : (msg || 'An error occurred while checking for updates.'),
    };
  }
}
