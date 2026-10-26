/**
 * safeWrite.ts — ZenTrack Mobile
 *
 * The WhatsApp Offline Write Pattern:
 *
 *   ONLINE  → call Firestore directly (fast path, non-blocking with 8s fallback safety net).
 *   OFFLINE → call queueWrite() to AsyncStorage + apply optimistic UI update immediately.
 *             On reconnect, offlineSync drains the queue in an atomic batch.
 *
 * PERFORMANCE:
 *   - Uses zero-cost synchronous network state cache via NetInfo listener (no bridge lag per set).
 *   - Non-blocking execution prevents holding up the JS event loop while Firestore network RTT settles.
 *   - Supports alreadySanitized flag to preserve deleteField() field-deletion sentinels.
 */

import NetInfo from '@react-native-community/netinfo';
import { queueWrite, removeQueuedFallback } from '../services/offlineSync';
import { deepSanitize, getMonotonicTimestamp } from './firebaseUtils';
import { touchServerSyncMeta } from './syncMeta';

export type FirestoreOperation = 'add' | 'update' | 'delete' | 'set';

// Zero-cost synchronous network state cache (eliminates bridge lag on every set log)
let _isOnlineSync = true;
NetInfo.fetch().then(s => {
  _isOnlineSync = s.isConnected === true && s.isInternetReachable !== false;
}).catch(() => {});
NetInfo.addEventListener(s => {
  _isOnlineSync = s.isConnected === true && s.isInternetReachable !== false;
});

/**
 * Executes a Firestore write safely:
 * - Online: calls firestoreFn() directly with fire-and-forget non-blocking dispatch
 * - Offline: enqueues via queueWrite() for reliable AsyncStorage-backed deferred sync
 *
 * @returns true if dispatched online, false if queued offline
 */
export async function safeWrite(
  firestoreFn: (sanitizedPayload?: any) => Promise<any>,
  collectionName: string,
  operation: FirestoreOperation,
  data: any,
  docId?: string,
  alreadySanitized = false,
): Promise<boolean> {
  const now = getMonotonicTimestamp(data?.updatedAt || 0);
  const rawPayload = data && typeof data === 'object' ? { ...data } : data;
  if (rawPayload && typeof rawPayload === 'object' && operation !== 'delete') {
    if (!rawPayload.updatedAt) rawPayload.updatedAt = now;
    rawPayload.clientUpdatedAt = now;
  }
  const payload = (!alreadySanitized && rawPayload && typeof rawPayload === 'object')
    ? deepSanitize(rawPayload)
    : rawPayload;

  // Offline fast-path: 0ms check, no bridge round-trip
  if (!_isOnlineSync) {
    await queueWrite(collectionName, operation, payload, docId, false);
    return false;
  }

  // Online fast-path: fire-and-forget to Firestore SDK with 8s crash-protection fallback
  let settled = false;
  let enqueuedFallback = false;

  const fallbackTimer = setTimeout(() => {
    if (!settled) {
      enqueuedFallback = true;
      queueWrite(collectionName, operation, payload, docId, false).catch(() => {});
    }
  }, 8000);

  firestoreFn(payload)
    .then(() => {
      settled = true;
      clearTimeout(fallbackTimer);
      // If the request took >8s and triggered the fallback queue, remove it now so it doesn't double-write!
      if (enqueuedFallback) {
        removeQueuedFallback(collectionName, operation, docId).catch(() => {});
      }
      touchServerSyncMeta();
    })
    .catch((err) => {
      settled = true;
      clearTimeout(fallbackTimer);
      if (!enqueuedFallback) {
        console.warn(`[safeWrite] Online write failed for ${collectionName}/${docId ?? 'new'}, queueing fallback:`, err?.message);
        queueWrite(collectionName, operation, payload, docId, false).catch(() => {});
      }
    });

  // Return immediately so callers NEVER block the JS thread waiting on network RTT!
  return true;
}

/** Convenience: UPDATE */
export async function safeUpdate(
  docId: string,
  collectionName: string,
  data: Record<string, any>,
  firestoreFn: (sanitizedPayload?: any) => Promise<any>,
  alreadySanitized = false,
): Promise<boolean> {
  return safeWrite(firestoreFn, collectionName, 'update', data, docId, alreadySanitized);
}

/** Convenience: ADD (supports optional deterministic docId to prevent duplicate creation on drain) */
export async function safeAdd(
  collectionName: string,
  data: Record<string, any>,
  firestoreFn: (sanitizedPayload?: any) => Promise<any>,
  docId?: string,
  alreadySanitized = false,
): Promise<boolean> {
  return safeWrite(firestoreFn, collectionName, 'add', data, docId, alreadySanitized);
}

/** Convenience: DELETE */
export async function safeDelete(
  docId: string,
  collectionName: string,
  firestoreFn: () => Promise<any>,
): Promise<boolean> {
  return safeWrite(firestoreFn, collectionName, 'delete', null, docId);
}
