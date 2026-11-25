// src/utils/safeWrite.ts

import NetInfo from '@react-native-community/netinfo';
import { queueWrite, removeQueuedFallback, markQueueItemRetryable } from '../services/offlineSync';
import { deepSanitize, getMonotonicTimestamp } from './firebaseUtils';

export type FirestoreOperation = 'add' | 'update' | 'delete' | 'set';

let _isOnlineSync = true;
NetInfo.fetch().then(s => {
  _isOnlineSync = s.isConnected === true && s.isInternetReachable !== false;
}).catch(() => {});
NetInfo.addEventListener(s => {
  _isOnlineSync = s.isConnected === true && s.isInternetReachable !== false;
});

const IN_FLIGHT_LEASE_MS = 12_000;

export async function safeWrite(
  firestoreFn: (sanitizedPayload?: any) => Promise<any>,
  collectionName: string,
  operation: FirestoreOperation,
  data: any,
  docId?: string,
  alreadySanitized = false,
): Promise<boolean> {
  // Always advance HLC monotonically so rapid writes in the same millisecond never collide (#155)
  const now = getMonotonicTimestamp(typeof data?.updatedAt === 'number' ? data.updatedAt : 0);
  const rawPayload = data && typeof data === 'object' ? { ...data } : data;
  if (rawPayload && typeof rawPayload === 'object' && operation !== 'delete') {
    rawPayload.updatedAt = now;
    rawPayload.clientUpdatedAt = now;
  }
  const payload = (!alreadySanitized && rawPayload && typeof rawPayload === 'object')
    ? deepSanitize(rawPayload)
    : rawPayload;

  // Offline fast-path: enqueue immediately with no lease
  if (!_isOnlineSync) {
    await queueWrite(collectionName, operation, payload, docId, false, 0);
    return false;
  }

  // Online fast-path: Write-Ahead to RAM WAL immediately with a 12s in-flight lease (#77, #119, #240)
  // Guarantees 0ms data loss if user force-closes the app while network RTT is in flight,
  // while preventing syncOfflineQueue from double-committing the item during the lease!
  await queueWrite(collectionName, operation, payload, docId, false, Date.now() + IN_FLIGHT_LEASE_MS);

  try {
    await firestoreFn(payload);
    removeQueuedFallback(collectionName, operation, docId, now).catch(() => {});
    return true;
  } catch (err: any) {
    console.warn(`[safeWrite] Online write failed for ${collectionName}/${docId ?? 'new'}, releasing WAL lease:`, err?.message);
    markQueueItemRetryable(collectionName, docId).catch(() => {});
    return false;
  }
}

export async function safeUpdate(
  docId: string,
  collectionName: string,
  data: Record<string, any>,
  firestoreFn: (sanitizedPayload?: any) => Promise<any>,
  alreadySanitized = false,
): Promise<boolean> {
  return safeWrite(firestoreFn, collectionName, 'update', data, docId, alreadySanitized);
}

export async function safeAdd(
  collectionName: string,
  data: Record<string, any>,
  firestoreFn: (sanitizedPayload?: any) => Promise<any>,
  docId?: string,
  alreadySanitized = false,
): Promise<boolean> {
  return safeWrite(firestoreFn, collectionName, 'add', data, docId, alreadySanitized);
}

export async function safeDelete(
  docId: string,
  collectionName: string,
  firestoreFn: () => Promise<any>,
): Promise<boolean> {
  return safeWrite(firestoreFn, collectionName, 'delete', null, docId);
}
