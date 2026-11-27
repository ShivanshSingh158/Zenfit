import * as Updates from 'expo-updates';
import { AppState, AppStateStatus, InteractionManager } from 'react-native';
import * as Haptics from 'expo-haptics';

export interface UpdateInfo {
  isEnabled: boolean;
  isEmbeddedLaunch: boolean;
  updateId: string | null;
  channel: string | null;
  runtimeVersion: string | null;
  createdAt: Date | null;
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
      createdAt: Updates.createdAt ?? null,
    };
  } catch (_) {
    return {
      isEnabled: false,
      isEmbeddedLaunch: true,
      updateId: null,
      channel: null,
      runtimeVersion: null,
      createdAt: null,
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
 * Reloads the app cleanly to activate an already-downloaded OTA update bundle.
 */
export async function applyDownloadedOTAUpdate(): Promise<{ success: boolean; message: string }> {
  try {
    if (__DEV__ || !Updates.isEnabled) {
      return {
        success: false,
        message: 'OTA updates can only be reloaded in standalone release builds.',
      };
    }
    if (isWorkoutActive()) {
      return {
        success: false,
        message: 'Finish your active workout before restarting for an update.',
      };
    }
    await Updates.reloadAsync();
    return { success: true, message: 'Restarting ZenFit...' };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Could not restart to apply update. Reopen ZenFit manually.',
    };
  }
}

export type OtaManualStatus = 'idle' | 'checking' | 'downloading' | 'ready';

/**
 * Checks for OTA updates manually, downloads if available (including rollbacks),
 * and optionally prompts the user to restart right away.
 */
export async function checkAndApplyOTAUpdate(
  onStatusChange?: (status: OtaManualStatus) => void,
  confirmRestart?: () => Promise<boolean>
): Promise<{ success: boolean; updated: boolean; pendingRestart?: boolean; message: string }> {
  try {
    if (__DEV__ || !Updates.isEnabled) {
      return {
        success: true,
        updated: false,
        message: 'Running in dev / Expo Go mode. Install an EAS preview or production build to receive cloud updates.',
      };
    }

    if (isWorkoutActive()) {
      return {
        success: false,
        updated: false,
        message: 'Finish your active workout before checking or applying updates.',
      };
    }

    if (_activeOtaPromise) {
      onStatusChange?.('checking');
      const bgDownloaded = await _activeOtaPromise;
      if (bgDownloaded) {
        onStatusChange?.('ready');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        if (confirmRestart) {
          const shouldRestart = await confirmRestart();
          if (shouldRestart) {
            await Updates.reloadAsync().catch(() => {});
            return { success: true, updated: true, pendingRestart: false, message: 'App restarted.' };
          }
        }
        return {
          success: true,
          updated: true,
          pendingRestart: true,
          message: 'Update ready! Restart ZenFit to apply.',
        };
      }
    }

    onStatusChange?.('checking');
    const check = await Updates.checkForUpdateAsync();

    if (!check.isAvailable && !check.isRollBackToEmbedded) {
      onStatusChange?.('idle');
      return {
        success: true,
        updated: false,
        message: 'ZenFit is already up to date.',
      };
    }

    // New bundle (or rollback) available — download in background
    onStatusChange?.('downloading');
    const fetchResult = await Updates.fetchUpdateAsync();
    onStatusChange?.('ready');

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    if (confirmRestart) {
      const shouldRestart = await confirmRestart();
      if (shouldRestart) {
        try {
          await Updates.reloadAsync();
        } catch (_) {}
        return { success: true, updated: true, pendingRestart: false, message: 'App restarted.' };
      }
    }

    return {
      success: true,
      updated: Boolean(fetchResult?.isNew || check.isRollBackToEmbedded),
      pendingRestart: true,
      message: 'Update downloaded! Restart ZenFit to apply it now.',
    };
  } catch (error: any) {
    onStatusChange?.('idle');
    console.warn('[OTA] Check failed:', error?.message);
    const msg = error?.message;
    const isNetworkErr =
      !msg ||
      msg.includes('Network') ||
      msg.includes('fetch') ||
      msg.includes('timeout') ||
      msg.includes('Unable to resolve host');
    return {
      success: false,
      updated: false,
      message: isNetworkErr
        ? 'Could not reach update server. Check your internet connection.'
        : msg || 'An error occurred while checking for updates.',
    };
  }
}
