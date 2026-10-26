import * as Updates from 'expo-updates';
import { Alert, AppState, AppStateStatus, InteractionManager } from 'react-native';
import * as Haptics from 'expo-haptics';

export interface UpdateInfo {
  isEnabled: boolean;
  isEmbeddedLaunch: boolean;
  updateId: string | null;
  channel: string | null;
  runtimeVersion: string | null;
}

let _isChecking = false;
let _lastCheckTimestamp = 0;
const CHECK_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes between background checks

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

  if (_isChecking) return false;
  _isChecking = true;
  _lastCheckTimestamp = Date.now();

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
  } catch (err: any) {
    // Network timeouts or offline mode are gracefully handled with zero UI disruption
    if (!silent) console.log('[OTA] Background update check skipped (offline or network timeout):', err?.message);
  } finally {
    _isChecking = false;
  }

  return false;
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
  onStatusChange?: (status: 'idle' | 'checking' | 'downloading' | 'ready') => void
): Promise<{ success: boolean; updated: boolean; message: string }> {
  try {
    if (__DEV__ || !Updates.isEnabled) {
      return {
        success: true,
        updated: false,
        message: 'OTA updates are active only in standalone/release APK builds.',
      };
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

    return new Promise((resolve) => {
      Alert.alert(
        'Update Ready',
        'A new version of ZenFit has been downloaded. Restart the app now to apply changes?',
        [
          {
            text: 'Later',
            style: 'cancel',
            onPress: () => resolve({ success: true, updated: true, message: 'Update will apply on next app restart.' }),
          },
          {
            text: 'Restart Now',
            style: 'default',
            onPress: async () => {
              try {
                await Updates.reloadAsync();
              } catch (_) {}
              resolve({ success: true, updated: true, message: 'App restarted.' });
            },
          },
        ]
      );
    });
  } catch (error: any) {
    onStatusChange?.('idle');
    console.warn('[OTA] Check failed:', error?.message);
    return {
      success: false,
      updated: false,
      message: error?.message || 'Could not reach update server. Check your internet connection.',
    };
  }
}
