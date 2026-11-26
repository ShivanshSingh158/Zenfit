// src/services/offlineSync.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, updateDoc, deleteDoc, collection, serverTimestamp, writeBatch, increment, deleteField } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';
import NetInfo from '@react-native-community/netinfo';
import { COLLECTION } from '../config/constants';

function isPlainRecord(val: any): boolean {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
  const proto = Object.getPrototypeOf(val);
  return proto === null || proto === Object.prototype;
}

export function unflattenDotNotation(obj: any): any {
  if (!isPlainRecord(obj)) return obj;
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key.includes('.')) {
      const parts = key.split('.');
      let curr = result;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!isPlainRecord(curr[part])) {
          curr[part] = {};
        }
        curr = curr[part];
      }
      const leaf = parts[parts.length - 1];
      const expandedVal = unflattenDotNotation(val);
      if (isPlainRecord(curr[leaf]) && isPlainRecord(expandedVal)) {
        curr[leaf] = { ...curr[leaf], ...expandedVal };
      } else {
        curr[leaf] = expandedVal;
      }
    } else {
      const expandedVal = isPlainRecord(val) ? unflattenDotNotation(val) : val;
      if (isPlainRecord(result[key]) && isPlainRecord(expandedVal)) {
        result[key] = { ...result[key], ...expandedVal };
      } else {
        result[key] = expandedVal;
      }
    }
  }
  return result;
}

function restoreFirestoreSentinels(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const expanded = unflattenDotNotation(obj);
  if (Array.isArray(expanded)) {
    return expanded.map(restoreFirestoreSentinels);
  }
  const clone: Record<string, any> = { ...expanded };
  for (const key of Object.keys(clone)) {
    const val = clone[key];
    if (val && typeof val === 'object') {
      if (typeof val.__zentrackIncrement === 'number') {
        clone[key] = increment(val.__zentrackIncrement);
      } else if (val._methodName === 'increment' && typeof val._operand === 'number') {
        clone[key] = increment(val._operand);
      } else if (val._methodName === 'deleteField' || val.__zentrackDeleteField === true) {
        clone[key] = deleteField();
      } else if (val._methodName === 'serverTimestamp' || val.__zentrackServerTimestamp === true) {
        clone[key] = serverTimestamp();
      } else if (isPlainRecord(val)) {
        clone[key] = restoreFirestoreSentinels(val);
      }
    }
  }
  return clone;
}

function mergeOfflinePayloads(prevData: any, nextData: any, now: number): any {
  if (!isPlainRecord(prevData) || !isPlainRecord(nextData)) return nextData;
  const merged: Record<string, any> = { ...prevData, ...nextData, clientUpdatedAt: now, updatedAt: now };
  for (const key of Object.keys(nextData)) {
    const prevVal = prevData[key];
    const nextVal = nextData[key];
    const prevInc = prevVal?.__zentrackIncrement ?? (prevVal?._methodName === 'increment' ? prevVal._operand : undefined);
    const nextInc = nextVal?.__zentrackIncrement ?? (nextVal?._methodName === 'increment' ? nextVal._operand : undefined);
    if (typeof prevInc === 'number' && typeof nextInc === 'number') {
      const totalInc = prevInc + nextInc;
      if (totalInc === 0) {
        delete merged[key];
      } else {
        merged[key] = { __zentrackIncrement: totalInc };
      }
    }
  }
  return merged;
}

export interface OfflineQueueItem {
  id: string;
  collection: string;
  operation: 'add' | 'update' | 'delete' | 'set';
  data: any;
  docId?: string;
  createdAt: number;
  clientUpdatedAt: number;
  retryCount: number;
  lastAttemptAt?: number;
  inFlightUntil?: number;
  isLocalGenesis?: boolean;
}

export type QueueItem = OfflineQueueItem;

const OFFLINE_QUEUE_KEY = '@zentrack_offline_write_queue';

let _memoryQueue: OfflineQueueItem[] | null = null;
let _queueDiskFlushTimer: ReturnType<typeof setTimeout> | null = null;
let _diskFlushChain: Promise<void> = Promise.resolve();
let _retryWakeupTimer: ReturnType<typeof setTimeout> | null = null;

export function flushOfflineQueueDisk(): Promise<void> {
  if (_queueDiskFlushTimer || (_memoryQueue && _memoryQueue.length > 0)) {
    return persistMemoryQueueToDisk().catch(() => {});
  }
  return Promise.resolve();
}

export async function clearOfflineQueue(): Promise<void> {
  if (_queueDiskFlushTimer) {
    clearTimeout(_queueDiskFlushTimer);
    _queueDiskFlushTimer = null;
  }
  if (_retryWakeupTimer) {
    clearTimeout(_retryWakeupTimer);
    _retryWakeupTimer = null;
  }
  _memoryQueue = [];
  try {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch {}
  await notifyQueueChange();
}

async function persistMemoryQueueToDisk(): Promise<void> {
  if (_queueDiskFlushTimer) {
    clearTimeout(_queueDiskFlushTimer);
    _queueDiskFlushTimer = null;
  }
  const snapshot = _memoryQueue ? [..._memoryQueue] : [];
  _diskFlushChain = _diskFlushChain.then(async () => {
    try {
      if (snapshot.length > 0) {
        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(snapshot));
      } else {
        await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
      }
    } catch {}
  });
  return _diskFlushChain;
}

function scheduleQueueDiskFlush(): void {
  if (_queueDiskFlushTimer) clearTimeout(_queueDiskFlushTimer);
  _queueDiskFlushTimer = setTimeout(() => {
    persistMemoryQueueToDisk().catch(() => {});
  }, 200);
}

export async function initMemoryQueue(): Promise<OfflineQueueItem[]> {
  if (_memoryQueue !== null) return _memoryQueue;
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    _memoryQueue = raw ? JSON.parse(raw) : [];
  } catch {
    _memoryQueue = [];
  }
  return _memoryQueue ?? [];
}

initMemoryQueue().catch(() => {});

export function getMemoryQueueSync(): OfflineQueueItem[] {
  return _memoryQueue || [];
}

export function applyPendingQueueOverlay<T extends { id?: string }>(
  collectionName: string,
  serverDocs: T[]
): T[] {
  const queue = _memoryQueue;
  if (!queue || queue.length === 0) return serverDocs;

  const pendingItems = queue.filter(q => q.collection === collectionName);
  if (pendingItems.length === 0) return serverDocs;

  const result = [...serverDocs];
  const indexById = new Map<string, number>();
  for (let i = 0; i < result.length; i++) {
    const id = result[i]?.id;
    if (id) indexById.set(id, i);
  }

  const applyFieldsToDoc = (baseDoc: Record<string, any>, patch: Record<string, any>): Record<string, any> => {
    const expandedPatch = unflattenDotNotation(patch || {});
    const merged = { ...baseDoc };
    for (const [k, v] of Object.entries(expandedPatch)) {
      if (v && typeof v === 'object') {
        const anyV = v as any;
        if (anyV._methodName === 'deleteField' || anyV.__zentrackDeleteField === true) {
          delete merged[k];
          continue;
        }
        const incVal = anyV.__zentrackIncrement ?? (anyV._methodName === 'increment' ? anyV._operand : undefined);
        if (typeof incVal === 'number') {
          merged[k] = (Number(merged[k]) || 0) + incVal;
          continue;
        }
        if (isPlainRecord(v) && isPlainRecord(merged[k])) {
          merged[k] = applyFieldsToDoc(merged[k], v);
          continue;
        }
      }
      merged[k] = v;
    }
    return merged;
  };

  for (const item of pendingItems) {
    if (!item.docId) continue;
    const idx = indexById.get(item.docId) ?? -1;

    if (item.operation === 'delete') {
      if (idx !== -1) {
        result.splice(idx, 1);
        indexById.clear();
        for (let i = 0; i < result.length; i++) {
          const id = result[i]?.id;
          if (id) indexById.set(id, i);
        }
      }
    } else if (item.operation === 'update') {
      if (idx !== -1) {
        result[idx] = applyFieldsToDoc(result[idx] as any, item.data) as T;
      }
    } else if (item.operation === 'set' || item.operation === 'add') {
      const itemData = { id: item.docId, ...(item.data || {}) };
      if (idx !== -1) {
        result[idx] = applyFieldsToDoc(result[idx] as any, itemData) as T;
      } else {
        result.unshift(applyFieldsToDoc({ id: item.docId }, itemData) as T);
        indexById.clear();
        for (let i = 0; i < result.length; i++) {
          const id = result[i]?.id;
          if (id) indexById.set(id, i);
        }
      }
    }
  }

  return result;
}

let isSyncing = false;
let wasOfflineInSession = false;

type QueueChangeListener = (count: number) => void;
type SyncCompleteListener = (syncedCount: number) => void;

const queueChangeListeners = new Set<QueueChangeListener>();
const syncCompleteListeners = new Set<SyncCompleteListener>();

export function subscribeToQueueChanges(cb: QueueChangeListener): () => void {
  let active = true;
  queueChangeListeners.add(cb);
  getQueueCount().then(c => {
    if (active) cb(c);
  });
  return () => {
    active = false;
    queueChangeListeners.delete(cb);
  };
}

export function subscribeToSyncComplete(cb: SyncCompleteListener): () => void {
  syncCompleteListeners.add(cb);
  return () => syncCompleteListeners.delete(cb);
}

async function notifyQueueChange() {
  const count = await getQueueCount();
  queueChangeListeners.forEach(cb => cb(count));
}

function notifySyncComplete(syncedCount: number) {
  syncCompleteListeners.forEach(cb => cb(syncedCount));
}

export async function getQueueCount(): Promise<number> {
  if (_memoryQueue !== null) return _memoryQueue.length;
  const q = await initMemoryQueue();
  return q.length;
}

function clonePlainPayload<T>(val: T): T {
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(clonePlainPayload) as unknown as T;
  const proto = Object.getPrototypeOf(val);
  if (proto !== Object.prototype && proto !== null) return val;
  const out: Record<string, any> = {};
  for (const k of Object.keys(val)) {
    const v = (val as any)[k];
    if (v !== undefined) out[k] = clonePlainPayload(v);
  }
  return out as T;
}

export async function queueWrite(
  collectionName: string,
  operation: 'add' | 'update' | 'delete' | 'set',
  data: any,
  docId?: string,
  triggerImmediateSync: boolean = false,
  inFlightUntil: number = 0
) {
  try {
    const queue = _memoryQueue ?? (await initMemoryQueue());
    const now = typeof data?.updatedAt === 'number' && data.updatedAt > 0 ? data.updatedAt : Date.now();
    const currentUser = auth.currentUser;

    // Mint a deterministic docId for 'add' so network retries are 100% idempotent (#37)
    const resolvedDocId = docId || (operation === 'add' ? doc(collection(db, collectionName)).id : undefined);

    const payload = data && typeof data === 'object' ? clonePlainPayload(data) : data;
    if (currentUser && payload && typeof payload === 'object' && !payload.userId && operation !== 'delete') {
      payload.userId = currentUser.uid;
    }
    if (payload && typeof payload === 'object' && operation !== 'delete') {
      payload.clientUpdatedAt = now;
      payload.updatedAt = now;
    }

    const deterministicId = resolvedDocId
      ? `${collectionName}_${resolvedDocId}_${operation}`
      : `${collectionName}_auto_${now}_${Math.random().toString(36).slice(2, 9)}`;

    // ── Delete coalescing (#1) ──
    if (resolvedDocId && operation === 'delete') {
      const existingIndex = queue.findIndex(
        q => q.collection === collectionName && q.docId === resolvedDocId
      );
      if (existingIndex !== -1) {
        const prev = queue[existingIndex];
        if (prev.operation === 'add' && prev.isLocalGenesis && !prev.inFlightUntil) {
          queue.splice(existingIndex, 1);
          _memoryQueue = queue;
          scheduleQueueDiskFlush();
          await notifyQueueChange();
          return;
        }
        queue[existingIndex] = {
          ...prev,
          id: deterministicId,
          operation: 'delete',
          data: null,
          createdAt: now,
          clientUpdatedAt: now,
          retryCount: 0,
          inFlightUntil,
        };
        _memoryQueue = queue;
        scheduleQueueDiskFlush();
        await notifyQueueChange();
        if (triggerImmediateSync && auth.currentUser) syncOfflineQueue(true);
        return;
      }
    }

    // ── Rapid update/set coalescing with increment sentinel summing (#2) ──
    if (resolvedDocId && (operation === 'update' || operation === 'set')) {
      const existingIndex = queue.findIndex(
        q => q.collection === collectionName && q.docId === resolvedDocId && (q.operation === 'update' || q.operation === 'set' || q.operation === 'add')
      );

      if (existingIndex !== -1) {
        const prev = queue[existingIndex];
        if (
          typeof prev.data?.updatedAt === 'number' &&
          typeof payload?.updatedAt === 'number' &&
          payload.updatedAt < prev.data.updatedAt
        ) {
          return;
        }

        const mergedData = mergeOfflinePayloads(prev.data, payload, now);
        queue[existingIndex] = {
          ...prev,
          data: mergedData,
          operation: operation === 'set' || prev.operation === 'add' ? 'set' : prev.operation,
          createdAt: now,
          clientUpdatedAt: now,
          retryCount: 0,
          inFlightUntil: Math.max(prev.inFlightUntil || 0, inFlightUntil),
        };

        _memoryQueue = queue;
        scheduleQueueDiskFlush();
        await notifyQueueChange();
        if (triggerImmediateSync && auth.currentUser) syncOfflineQueue(true);
        return;
      }
    }

    queue.push({
      id: deterministicId,
      collection: collectionName,
      operation,
      data: payload,
      docId: resolvedDocId,
      createdAt: now,
      clientUpdatedAt: now,
      retryCount: 0,
      inFlightUntil,
      isLocalGenesis: operation === 'add' && !inFlightUntil,
    });

    _memoryQueue = queue;
    scheduleQueueDiskFlush();
    await notifyQueueChange();

    if (triggerImmediateSync && auth.currentUser) {
      syncOfflineQueue(true);
    }
  } catch (e) {
    console.warn('[OfflineSync] Failed to queue operation', e);
  }
}

export async function queueBatchWrites(
  items: Array<{
    collectionName: string;
    operation: 'add' | 'update' | 'delete' | 'set';
    data: any;
    docId?: string;
  }>,
  triggerImmediateSync: boolean = false
): Promise<void> {
  if (!items || items.length === 0) return;
  try {
    const queue = _memoryQueue ?? (await initMemoryQueue());
    const now = Date.now();
    const currentUser = auth.currentUser;

    for (const item of items) {
      const { collectionName, operation } = item;
      const resolvedDocId = item.docId || (operation === 'add' ? doc(collection(db, collectionName)).id : undefined);
      const payload = item.data && typeof item.data === 'object' ? clonePlainPayload(item.data) : item.data;
      if (currentUser && payload && typeof payload === 'object' && !payload.userId && operation !== 'delete') {
        payload.userId = currentUser.uid;
      }
      if (payload && typeof payload === 'object' && operation !== 'delete') {
        payload.clientUpdatedAt = now;
        payload.updatedAt = now;
      }

      const deterministicId = resolvedDocId
        ? `${collectionName}_${resolvedDocId}_${operation}`
        : `${collectionName}_auto_${now}_${Math.random().toString(36).slice(2, 9)}`;

      if (resolvedDocId && (operation === 'update' || operation === 'set')) {
        const existingIndex = queue.findIndex(
          q => q.collection === collectionName && q.docId === resolvedDocId && (q.operation === 'update' || q.operation === 'set')
        );
        if (existingIndex !== -1) {
          const prev = queue[existingIndex];
          queue[existingIndex] = {
            ...prev,
            data: mergeOfflinePayloads(prev.data, payload, now),
            operation: operation === 'set' ? 'set' : prev.operation,
            createdAt: now,
            clientUpdatedAt: now,
            retryCount: 0,
          };
          continue;
        }
      }

      queue.push({
        id: deterministicId,
        collection: collectionName,
        operation,
        data: payload,
        docId: resolvedDocId,
        createdAt: now,
        clientUpdatedAt: now,
        retryCount: 0,
      });
    }

    _memoryQueue = queue;
    await persistMemoryQueueToDisk();
    await notifyQueueChange();
    if (triggerImmediateSync && auth.currentUser) {
      syncOfflineQueue(true).catch(() => {});
    }
  } catch (err) {
    console.warn('[OfflineSync] Batch enqueue error:', err);
  }
}

export async function queueGymLogOffline(log: any) {
  await queueWrite(COLLECTION.GYM_LOGS, 'set', log, log.id || `${log.userId}_${log.date}`);
}

export async function markQueueItemRetryable(collectionName: string, docId?: string): Promise<void> {
  if (!_memoryQueue || !docId) return;
  const item = _memoryQueue.find(q => q.collection === collectionName && q.docId === docId);
  if (item) {
    item.inFlightUntil = 0;
    scheduleQueueDiskFlush();
  }
}

export async function removeQueuedFallback(
  collectionName: string,
  operation: string,
  docId?: string,
  maxClientUpdatedAt?: number
): Promise<boolean> {
  const queue = _memoryQueue;
  if (!queue || queue.length === 0 || !docId) return false;

  const idx = queue.findIndex(
    q =>
      q.collection === collectionName &&
      q.docId === docId &&
      (q.operation === operation || q.operation === 'set') &&
      (!maxClientUpdatedAt || q.clientUpdatedAt <= maxClientUpdatedAt)
  );

  if (idx !== -1) {
    queue.splice(idx, 1);
    _memoryQueue = queue;
    await persistMemoryQueueToDisk();
    await notifyQueueChange();
    return true;
  }
  return false;
}

export async function syncOfflineQueue(silent = false): Promise<number> {
  if (isSyncing) return 0;
  isSyncing = true;

  let syncedCount = 0;

  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      isSyncing = false;
      return 0;
    }

    let uid = auth.currentUser?.uid;
    if (!uid) {
      try {
        const rawUser = await AsyncStorage.getItem('@zentrack_optimistic_user');
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (parsed?.uid) uid = parsed.uid;
        }
      } catch {}
    }

    if (!uid) {
      isSyncing = false;
      return 0;
    }

    // Always drain from _memoryQueue first so recent debounced writes are never missed (#5)
    const fullQueue = _memoryQueue !== null ? [..._memoryQueue] : await initMemoryQueue();
    if (fullQueue.length === 0) {
      isSyncing = false;
      return 0;
    }

    // Filter out items currently in-flight via safeWrite online fast-path (#77)
    const nowTs = Date.now();
    const queue = fullQueue.filter(q => !q.inFlightUntil || nowTs >= q.inFlightUntil);
    if (queue.length === 0) {
      isSyncing = false;
      return 0;
    }

    // Auto-promote guest_* users atomically in _memoryQueue and disk (#4)
    if ((!auth.currentUser || (uid && uid.startsWith('guest_'))) && state.isConnected) {
      try {
        const { signInAnonymously } = await import('firebase/auth');
        const cred = await signInAnonymously(auth);
        const realUid = cred.user.uid;
        const oldGuestUid = uid;
        uid = realUid;

        const updatedOptimistic = {
          uid: realUid,
          isAnonymous: true,
          email: null,
          displayName: 'Guest User',
        };
        await AsyncStorage.setItem('@zentrack_optimistic_user', JSON.stringify(updatedOptimistic));
        const { updateL1Cache } = await import('../utils/bootManifest');
        updateL1Cache('optimisticUser', cred.user);

        if (oldGuestUid && oldGuestUid.startsWith('guest_') && _memoryQueue) {
          for (const qItem of _memoryQueue) {
            if (qItem.data && typeof qItem.data === 'object' && qItem.data.userId === oldGuestUid) {
              qItem.data.userId = realUid;
            }
            if (qItem.docId && qItem.docId.includes(oldGuestUid)) {
              qItem.docId = qItem.docId.replace(oldGuestUid, realUid);
            }
            if (qItem.id && qItem.id.includes(oldGuestUid)) {
              qItem.id = qItem.id.replace(oldGuestUid, realUid);
            }
          }
          await persistMemoryQueueToDisk();
        }
      } catch (promoErr) {
        console.warn('[OfflineSync] Could not promote guest user to Firebase session:', promoErr);
      }
    }

    const BATCH_LIMIT = 400;
    try {
      const dedupedMap = new Map<string, OfflineQueueItem>();
      const nonDedupeQueue: OfflineQueueItem[] = [];

      const remainingQueueForFallback = _memoryQueue ? [..._memoryQueue] : queue;
    for (const item of remainingQueueForFallback) {
        if (item.docId && (item.operation === 'set' || item.operation === 'update' || item.operation === 'delete' || item.operation === 'add')) {
          const key = `${item.collection}/${item.docId}`;
          const existing = dedupedMap.get(key);
          if (!existing || (item.clientUpdatedAt || item.createdAt) >= (existing.clientUpdatedAt || existing.createdAt)) {
            if (existing && item.operation !== 'delete' && existing.operation !== 'delete') {
              const mergedData = mergeOfflinePayloads(existing.data, item.data, item.clientUpdatedAt || Date.now());
              dedupedMap.set(key, {
                ...item,
                operation: existing.operation === 'set' || existing.operation === 'add' ? 'set' : item.operation,
                data: mergedData,
              });
            } else {
              dedupedMap.set(key, item);
            }
          }
        } else {
          nonDedupeQueue.push(item);
        }
      }

      const queueToProcess = [...Array.from(dedupedMap.values()), ...nonDedupeQueue];
      const syncedItemSignatures = new Set<string>();

      for (const orig of queue) {
        if (orig.docId && dedupedMap.has(`${orig.collection}/${orig.docId}`)) {
          syncedItemSignatures.add(`${orig.id}_${orig.clientUpdatedAt}`);
        }
      }

      for (let i = 0; i < queueToProcess.length; i += BATCH_LIMIT) {
        const chunk = queueToProcess.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);
        const chunkSignatures = new Set<string>();
        for (const item of chunk) {
          let dataToWrite = item.data && typeof item.data === 'object' ? { ...item.data } : item.data;
          if (uid && dataToWrite && typeof dataToWrite === 'object' && !dataToWrite.userId && item.operation !== 'delete') {
            dataToWrite.userId = uid;
          }
          dataToWrite = restoreFirestoreSentinels(dataToWrite);

          if (item.operation === 'add') {
            const newDocRef = item.docId ? doc(db, item.collection, item.docId) : doc(collection(db, item.collection));
            batch.set(newDocRef, dataToWrite, { merge: true });
          } else if ((item.operation === 'set' || item.operation === 'update') && item.docId) {
            batch.set(doc(db, item.collection, item.docId), dataToWrite, { merge: true });
          } else if (item.operation === 'delete' && item.docId) {
            batch.delete(doc(db, item.collection, item.docId));
          }
          const sig = `${item.id}_${item.clientUpdatedAt}`;
          chunkSignatures.add(sig);
          syncedItemSignatures.add(sig);
        }
        await batch.commit();
        syncedCount += chunk.length;

        // Prune committed chunk items from _memoryQueue immediately AFTER EACH successful commit
        if (_memoryQueue) {
          _memoryQueue = _memoryQueue.filter(q => !chunkSignatures.has(`${q.id}_${q.clientUpdatedAt}`));
          await persistMemoryQueueToDisk();
          await notifyQueueChange();
        }
      }

      const currentMem = _memoryQueue || [];
      const remaining = currentMem.filter(q => !syncedItemSignatures.has(`${q.id}_${q.clientUpdatedAt}`));
      _memoryQueue = remaining;
      await persistMemoryQueueToDisk();
      if (remaining.length === 0) wasOfflineInSession = false;
      await notifyQueueChange();
      if (syncedCount > 0 && !silent) notifySyncComplete(syncedCount);
      return syncedCount;
    } catch (batchErr) {
      console.warn('[OfflineSync] Batch commit failed, falling back to sequential item drain:', batchErr);
    }

    const failedQueue: OfflineQueueItem[] = [];
    const seqSyncedSignatures = new Set<string>();
    const deadLetters: any[] = [];
    const now = Date.now();
    let minNextBackoffMs = Infinity;

    const remainingQueueForFallback = _memoryQueue ? [..._memoryQueue] : queue;
    for (const item of remainingQueueForFallback) {
      try {
        if (item.retryCount > 0 && item.lastAttemptAt) {
          const backoffDelay = Math.min(30000, 1500 * Math.pow(2, item.retryCount - 1));
          const elapsed = now - item.lastAttemptAt;
          if (elapsed < backoffDelay) {
            minNextBackoffMs = Math.min(minNextBackoffMs, backoffDelay - elapsed);
            failedQueue.push(item);
            continue;
          }
        }

        let dataToWrite = item.data && typeof item.data === 'object' ? { ...item.data } : item.data;
        if (uid && dataToWrite && typeof dataToWrite === 'object' && !dataToWrite.userId && item.operation !== 'delete') {
          dataToWrite.userId = uid;
        }
        dataToWrite = restoreFirestoreSentinels(dataToWrite);

        if (item.operation === 'add') {
          const targetRef = item.docId ? doc(db, item.collection, item.docId) : doc(collection(db, item.collection));
          await setDoc(targetRef, dataToWrite, { merge: true });
        } else if (item.operation === 'set' && item.docId) {
          await setDoc(doc(db, item.collection, item.docId), dataToWrite, { merge: true });
        } else if (item.operation === 'update' && item.docId) {
          const docRef = doc(db, item.collection, item.docId);
          try {
            await updateDoc(docRef, dataToWrite);
          } catch (updateErr: any) {
            if (updateErr?.code === 'not-found' || updateErr?.message?.includes('No document to update')) {
              await setDoc(docRef, dataToWrite, { merge: true });
            } else {
              throw updateErr;
            }
          }
        } else if (item.operation === 'delete' && item.docId) {
          await deleteDoc(doc(db, item.collection, item.docId));
        }
        syncedCount++;
        seqSyncedSignatures.add(`${item.id}_${item.clientUpdatedAt}`);
      } catch (e: any) {
        const code = String(e?.code || e?.message || '').toLowerCase();
        const isPermanentFailure = code.includes('permission-denied') || code.includes('invalid-argument') || code.includes('permission');
        const retryCount = (item.retryCount || 0) + 1;

        if (!isPermanentFailure) {
          const nextDelay = Math.min(30000, 1500 * Math.pow(2, retryCount - 1));
          minNextBackoffMs = Math.min(minNextBackoffMs, nextDelay);
          failedQueue.push({ ...item, retryCount, lastAttemptAt: Date.now() });
        } else {
          deadLetters.push({ ...item, failedAt: Date.now(), error: code });
          seqSyncedSignatures.add(`${item.id}_${item.clientUpdatedAt}`);
        }
      }
    }

    if (deadLetters.length > 0) {
      try {
        const rawVault = await AsyncStorage.getItem('@zentrack_dead_letter_vault');
        const vault = rawVault ? JSON.parse(rawVault) : [];
        vault.push(...deadLetters);
        await AsyncStorage.setItem('@zentrack_dead_letter_vault', JSON.stringify(vault.slice(-100)));
      } catch {}
    }

    // Preserve any newer mutations in _memoryQueue that arrived while sequential drain was running (#84)
    const currentMem = _memoryQueue || [];
    const failedByKey = new Map<string, OfflineQueueItem>();
    for (const f of failedQueue) {
      failedByKey.set(`${f.collection}/${f.docId || f.id}`, f);
    }

    const remaining: OfflineQueueItem[] = [];
    for (const q of currentMem) {
      if (seqSyncedSignatures.has(`${q.id}_${q.clientUpdatedAt}`)) continue;
      const key = `${q.collection}/${q.docId || q.id}`;
      const failedMatch = failedByKey.get(key);
      if (failedMatch) {
        if (q.clientUpdatedAt > failedMatch.clientUpdatedAt) {
          remaining.push(q); // Newer mutation arrived during drain — keep newer!
        } else {
          remaining.push(failedMatch);
        }
        failedByKey.delete(key);
      } else {
        remaining.push(q);
      }
    }
    for (const leftover of failedByKey.values()) {
      remaining.push(leftover);
    }

    _memoryQueue = remaining;
    await persistMemoryQueueToDisk();
    if (remaining.length === 0) {
      wasOfflineInSession = false;
    } else if (Number.isFinite(minNextBackoffMs)) {
      // Schedule automatic wakeup timer for backoff items (#83)
      if (_retryWakeupTimer) clearTimeout(_retryWakeupTimer);
      _retryWakeupTimer = setTimeout(() => {
        _retryWakeupTimer = null;
        syncOfflineQueue(true).catch(() => {});
      }, minNextBackoffMs + 50);
    }

    await notifyQueueChange();
    if (syncedCount > 0 && !silent) notifySyncComplete(syncedCount);
  } catch (e) {
    console.warn('[OfflineSync] Error during sync drain', e);
  } finally {
    isSyncing = false;
  }

  return syncedCount;
}

export function setupNetworkListener(): () => void {
  const netUnsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected === false) {
      wasOfflineInSession = true;
    } else if (state.isConnected === true && state.isInternetReachable !== false) {
      if (wasOfflineInSession || (_memoryQueue && _memoryQueue.length > 0)) {
        syncOfflineQueue(!wasOfflineInSession);
      }
    }
  });

  const authUnsubscribe = onAuthStateChanged(auth, user => {
    if (user) {
      syncOfflineQueue(true);
    }
  });

  const bootDrain = async () => {
    const state = await NetInfo.fetch();
    if (state.isConnected && auth.currentUser) {
      await syncOfflineQueue(true);
    }
  };
  bootDrain();

  return () => {
    netUnsubscribe();
    authUnsubscribe();
    if (_retryWakeupTimer) clearTimeout(_retryWakeupTimer);
  };
}
