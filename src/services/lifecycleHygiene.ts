/**
 * lifecycleHygiene.ts — Centralized AppState Lifecycle Manager
 *
 * Consolidates OS background / foreground flushes into a single native AppState
 * subscription (replacing scattered module-level listeners) and lets the
 * Firestore SDK manage reconnects natively without listener thrashing.
 */
import { AppState, AppStateStatus } from 'react-native';
import { flushL1WriteTimers } from '../utils/bootManifest';
import { flushDomainCache } from '../utils/domainCache';
import { flushOfflineQueueDisk, syncOfflineQueue } from './offlineSync';
import { flushPendingXPCloudSync } from './xpSystem';

let _isRegistered = false;

export function setupLifecycleHygiene(): () => void {
  if (_isRegistered) {
    return () => {};
  }
  _isRegistered = true;

  let prevState: AppStateStatus = AppState.currentState || 'active';

  const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    const wasActive = prevState === 'active';
    prevState = nextState;

    if (nextState === 'background' || nextState === 'inactive') {
      flushL1WriteTimers();
      flushOfflineQueueDisk().catch(() => {});
      flushPendingXPCloudSync();
      flushDomainCache().catch(() => {});
      return;
    }

    if (nextState === 'active' && !wasActive) {
      syncOfflineQueue(true).catch(() => {});
    }
  });

  return () => {
    _isRegistered = false;
    try {
      sub.remove();
    } catch {}
  };
}
