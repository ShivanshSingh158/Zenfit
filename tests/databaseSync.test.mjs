import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
require('./testHarness.cjs');

const env = globalThis.__ZENFIT_TEST_ENV__;
const {
  queueWrite,
  queueBatchWrites,
  syncOfflineQueue,
  clearOfflineQueue,
  initMemoryQueue,
  applyPendingQueueOverlay,
  migrateOfflineQueueUser,
  setupNetworkListener,
  getQueueCount,
  getMemoryQueueSync,
} = require(path.join(env.ROOT, 'src/services/offlineSync.ts'));

const { safeWrite, safeDelete } = require(path.join(env.ROOT, 'src/utils/safeWrite.ts'));
const { getMonotonicTimestamp } = require(path.join(env.ROOT, 'src/utils/firebaseUtils.ts'));
const { mergeGymLogMonotonic } = require(path.join(env.ROOT, 'src/utils/gymUtils.ts'));
const { parseGymLog } = require(path.join(env.ROOT, 'src/utils/schemaGuards.ts'));
const {
  loadAuthBootSlice,
  getAuthBootSync,
  isAuthBootHydrated,
  loadBootManifest,
  clearBootManifest,
  setL1Sync,
  getL1Sync,
  BOOT_KEYS,
  GUEST_STORAGE_KEY,
  ONBOARDING_FLOW_KEY,
  GYM_ARCHIVE_YEARS_KEY,
} = require(path.join(env.ROOT, 'src/utils/bootManifest.ts'));
const { writeWellnessCache, readWellnessCache } = require(path.join(env.ROOT, 'src/utils/domainCache.ts'));
const { COLLECTION } = require(path.join(env.ROOT, 'src/config/constants.ts'));
const { setDoc, deleteDoc, deleteField, doc, db } = require('firebase/firestore');

const waitTick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

describe('ZenFit Offline-First & Online Sync Engine', () => {
  beforeEach(async () => {
    env.resetStores();
    clearBootManifest();
    await clearOfflineQueue();
  });

  it('1. Buffers offline workouts in WAL and auto-drains immediately on NetInfo reconnect', async () => {
    const unsubNet = setupNetworkListener();
    try {
      env.setOnline(false);

      const logDoc = {
        id: 'user_test_1_2026-11-26',
        userId: 'user_test_1',
        date: '2026-11-26',
        dayPlanIndex: 1,
        completed: true,
        exercises: [{ name: 'Bench Press', setsLog: [{ weight: 100, reps: 5, completed: true }] }],
        updatedAt: Date.now(),
      };

      const writtenOnline = await safeWrite(
        () => setDoc(doc(db, COLLECTION.GYM_LOGS, logDoc.id), logDoc, { merge: true }),
        COLLECTION.GYM_LOGS,
        'set',
        logDoc,
        logDoc.id
      );

      assert.equal(writtenOnline, false);
      assert.equal(await getQueueCount(), 1);
      assert.equal(env.firestoreStore.has('gym_logs/user_test_1_2026-11-26'), false);

      // Walk back into gym reception — NetInfo online trigger should drain queue automatically
      env.setOnline(true);
      await waitTick(35);

      assert.equal(await getQueueCount(), 0);
      const serverDoc = env.firestoreStore.get('gym_logs/user_test_1_2026-11-26');
      assert.equal(serverDoc?.completed, true);
      assert.equal(serverDoc?.exercises?.[0]?.name, 'Bench Press');
    } finally {
      unsubNet();
    }
  });

  it('2. Removes WAL entry after successful online safeDelete (no zombie delete after recreate)', async () => {
    const docId = 'user_test_1_2026-11-25';
    env.firestoreStore.set(`gym_logs/${docId}`, { id: docId, date: '2026-11-25', completed: false });

    const ok = await safeDelete(docId, COLLECTION.GYM_LOGS, () =>
      deleteDoc(doc(db, COLLECTION.GYM_LOGS, docId))
    );
    await waitTick(10);

    assert.equal(ok, true);
    assert.equal(env.firestoreStore.has(`gym_logs/${docId}`), false);
    assert.equal(await getQueueCount(), 0, 'Completed online delete must be removed from WAL immediately');

    // Recreate offline later & sync — must stay alive cleanly
    env.setOnline(false);
    await safeWrite(
      () => setDoc(doc(db, COLLECTION.GYM_LOGS, docId), { date: '2026-11-25', completed: true }, { merge: true }),
      COLLECTION.GYM_LOGS,
      'set',
      { date: '2026-11-25', completed: true, updatedAt: Date.now() + 10 },
      docId
    );
    env.setOnline(true);
    await syncOfflineQueue(true);
    assert.equal(env.firestoreStore.get(`gym_logs/${docId}`)?.completed, true);
  });

  it('3. Coalesces delete -> set sequence cleanly offline without losing recreated doc', async () => {
    env.setOnline(false);
    const docId = 'user_test_1_2026-11-24';

    await queueWrite(COLLECTION.GYM_LOGS, 'delete', null, docId, false, 0, 1000);
    await queueWrite(
      COLLECTION.GYM_LOGS,
      'set',
      { id: docId, date: '2026-11-24', completed: false, exercises: [{ name: 'Squat', setsLog: [] }], updatedAt: 2000 },
      docId
    );

    assert.equal(await getQueueCount(), 1);
    const items = getMemoryQueueSync();
    assert.equal(items[0].operation, 'set');

    const overlaid = applyPendingQueueOverlay(COLLECTION.GYM_LOGS, [{ id: docId, date: '2026-11-24', exercises: [] }]);
    assert.equal(overlaid.length, 1);
    assert.equal(overlaid[0].exercises[0].name, 'Squat');

    env.setOnline(true);
    await syncOfflineQueue(true);
    assert.equal(env.firestoreStore.get(`gym_logs/${docId}`)?.exercises?.[0]?.name, 'Squat');
  });

  it('4. Revert preserves completed=false and strips duration/start/end across Firestore merge, overlay, and mergeGymLogMonotonic', async () => {
    const docId = 'user_test_1_2026-11-26';
    env.firestoreStore.set(`gym_logs/${docId}`, {
      id: docId,
      userId: 'user_test_1',
      date: '2026-11-26',
      completed: true,
      workoutDurationMinutes: 45,
      workoutDurationSeconds: 2700,
      startTime: '09:00',
      endTime: '09:45',
      exercises: [{ name: 'Deadlift', setsLog: [{ setNumber: 1, weight: 140, reps: 5, completed: true }] }],
      updatedAt: 5000,
    });

    // Offline revert with deleteField sentinels
    env.setOnline(false);
    const revertedPayload = {
      id: docId,
      userId: 'user_test_1',
      date: '2026-11-26',
      completed: false,
      revertedAt: 6000,
      updatedAt: 6000,
      exercises: [{ name: 'Deadlift', setsLog: [{ setNumber: 1, weight: 140, reps: 5, completed: false }] }],
      workoutStartTime: { __zentrackDeleteField: true, $op: 'deleteField' },
      workoutDurationMinutes: { __zentrackDeleteField: true, $op: 'deleteField' },
      workoutDurationSeconds: { __zentrackDeleteField: true, $op: 'deleteField' },
      startTime: { __zentrackDeleteField: true, $op: 'deleteField' },
      endTime: { __zentrackDeleteField: true, $op: 'deleteField' },
    };
    await queueWrite(COLLECTION.GYM_LOGS, 'set', revertedPayload, docId);

    // Offline snapshot overlay over stale completed server doc must show reverted state
    const staleServerDoc = { ...env.firestoreStore.get(`gym_logs/${docId}`) };
    const [overlaid] = applyPendingQueueOverlay(COLLECTION.GYM_LOGS, [staleServerDoc]);
    assert.equal(overlaid.completed, false);
    assert.equal(overlaid.workoutDurationMinutes, undefined);

    // Monotonic merge even against zero-updatedAt legacy doc must keep reverted state
    const legacyZeroDoc = { ...staleServerDoc, updatedAt: 0 };
    const merged = mergeGymLogMonotonic(overlaid, legacyZeroDoc);
    assert.equal(merged.completed, false);
    assert.equal(merged.workoutDurationMinutes, undefined);
    assert.equal(merged.exercises[0].setsLog[0].completed, false);

    // Sync online -> Firestore deletes completed duration/start/end fields
    env.setOnline(true);
    await syncOfflineQueue(true);
    const serverAfter = env.firestoreStore.get(`gym_logs/${docId}`);
    assert.equal(serverAfter.completed, false);
    assert.equal(serverAfter.revertedAt, 6000);
    assert.equal('workoutDurationMinutes' in serverAfter, false);
    assert.equal('startTime' in serverAfter, false);
    assert.equal('endTime' in serverAfter, false);

    // Schema guard roundtrip preserves revertedAt
    const reparsed = parseGymLog(serverAfter, docId);
    assert.equal(reparsed.revertedAt, 6000);
    assert.equal(reparsed.completed, false);
  });

  it('5. Handles dot-notation delete followed by nested subkey recreation without deleting recreated data', async () => {
    env.firestoreStore.set('user_gym_plans/user_test_1', {
      userId: 'user_test_1',
      routines: { rt_1: { id: 'rt_1', name: 'Old Push' }, rt_keep: { id: 'rt_keep', name: 'Legs' } },
    });

    env.setOnline(false);
    await queueWrite(
      COLLECTION.USER_GYM_PLANS,
      'set',
      { 'routines.rt_1': { __zentrackDeleteField: true }, updatedAt: 1000 },
      'user_test_1'
    );
    await queueWrite(
      COLLECTION.USER_GYM_PLANS,
      'set',
      { routines: { rt_1: { id: 'rt_1', name: 'New Push' } }, updatedAt: 2000 },
      'user_test_1'
    );

    env.setOnline(true);
    await syncOfflineQueue(true);
    const planDoc = env.firestoreStore.get('user_gym_plans/user_test_1');
    assert.equal(planDoc.routines.rt_1?.name, 'New Push');
    assert.equal(planDoc.routines.rt_keep?.name, 'Legs');
  });

  it('6. Sums offline XP increments atomically without double-counting', async () => {
    env.firestoreStore.set('user_profiles/user_test_1', { xp: 100 });
    env.setOnline(false);

    await queueWrite(COLLECTION.USER_PROFILES, 'set', { xp: { __zentrackIncrement: 150 }, updatedAt: 1001 }, 'user_test_1');
    await queueWrite(COLLECTION.USER_PROFILES, 'set', { xp: { __zentrackIncrement: 300 }, updatedAt: 1002 }, 'user_test_1');
    await queueWrite(COLLECTION.USER_PROFILES, 'set', { xp: { __zentrackIncrement: -50 }, updatedAt: 1003 }, 'user_test_1');

    assert.equal(await getQueueCount(), 1);
    env.setOnline(true);
    await syncOfflineQueue(true);
    assert.equal(env.firestoreStore.get('user_profiles/user_test_1').xp, 500);
  });

  it('7. Serializes concurrent initMemoryQueue() calls cleanly on cold boot without overwrite', async () => {
    const syncModPath = path.join(env.ROOT, 'src/services/offlineSync.ts');
    delete require.cache[require.resolve(syncModPath)];

    env.asyncStore.set(
      '@zentrack_offline_write_queue',
      JSON.stringify([
        {
          id: 'gym_logs_d1_set',
          seq: 7,
          collection: 'gym_logs',
          operation: 'set',
          docId: 'd1',
          data: { date: '2026-11-26', sets: 3 },
          clientUpdatedAt: 1000,
          createdAt: 1000,
          retryCount: 0,
        },
      ])
    );

    const freshOfflineSync = require(syncModPath);
    const results = await Promise.all([
      freshOfflineSync.initMemoryQueue(),
      freshOfflineSync.initMemoryQueue(),
      freshOfflineSync.initMemoryQueue(),
    ]);
    assert.equal(results[0], results[1]);
    assert.equal(results[1], results[2]);
    assert.equal(results[0].length, 1);
    assert.equal(results[0][0].docId, 'd1');

    // Keep sequence monotonic above persisted seq=7
    const nextMeta = await freshOfflineSync.queueWrite(
      COLLECTION.GYM_LOGS,
      'set',
      { date: '2026-11-27', updatedAt: 2000 },
      'd2'
    );
    assert.ok((nextMeta?.seq ?? 0) > 7);
    await freshOfflineSync.clearOfflineQueue();
  });

  it('8. Re-drains items queued mid-sync (_resyncRequested) and never drops same-ms writes', async () => {
    await queueWrite(COLLECTION.GYM_LOGS, 'set', { id: 'doc_a', date: '2026-11-20', val: 1, updatedAt: 5000 }, 'doc_a');

    let midWriteDone = false;
    env.state.commitHook = async () => {
      if (!midWriteDone) {
        midWriteDone = true;
        // Enqueue doc_b AND doc_a newer version DURING batch.commit with triggerImmediateSync=true
        await queueWrite(COLLECTION.GYM_LOGS, 'set', { id: 'doc_b', date: '2026-11-21', val: 2, updatedAt: 5000 }, 'doc_b', true);
      }
    };

    await syncOfflineQueue(true);
    await waitTick(35);

    assert.equal(await getQueueCount(), 0);
    assert.equal(env.firestoreStore.get('gym_logs/doc_a')?.val, 1);
    assert.equal(env.firestoreStore.get('gym_logs/doc_b')?.val, 2);
  });

  it('9. Moves permanent permission-denied failures to dead-letter vault while retaining transient errors for retry', async () => {
    env.state.failureMode = 'batch-fail-then-sequential';
    env.state.failureByDoc.set('gym_logs/bad_doc', 'permission-denied');
    env.state.failureByDoc.set('gym_logs/flaky_doc', 'unavailable');

    await queueWrite(COLLECTION.GYM_LOGS, 'set', { id: 'bad_doc', date: '2026-11-22', updatedAt: 1001 }, 'bad_doc');
    await queueWrite(COLLECTION.GYM_LOGS, 'set', { id: 'flaky_doc', date: '2026-11-23', updatedAt: 1002 }, 'flaky_doc');
    env.state.failureByDoc.set('gym_logs/ok_doc', undefined);
    await queueWrite(COLLECTION.GYM_LOGS, 'set', { id: 'ok_doc', date: '2026-11-24', updatedAt: 1003 }, 'ok_doc');

    await syncOfflineQueue(true);

    // ok_doc synced, bad_doc dead-lettered, flaky_doc kept with retryCount=1
    assert.equal(env.firestoreStore.has('gym_logs/ok_doc'), true);
    const vaultRaw = await env.asyncStore.get('@zentrack_dead_letter_vault');
    const vault = JSON.parse(vaultRaw || '[]');
    assert.equal(vault.length, 1);
    assert.equal(vault[0].docId, 'bad_doc');

    const remaining = getMemoryQueueSync();
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].docId, 'flaky_doc');
    assert.equal(remaining[0].retryCount, 1);
  });

  it('10. Migrates offline queue atomically on Guest -> Google account upgrade without colliding random log IDs', async () => {
    env.state.currentUser = { uid: 'guest_local_user', isAnonymous: true };
    env.setOnline(false);

    await queueBatchWrites([
      {
        collectionName: COLLECTION.GYM_LOGS,
        operation: 'set',
        docId: 'guest_local_user_2026-11-26',
        data: { id: 'guest_local_user_2026-11-26', userId: 'guest_local_user', date: '2026-11-26', completed: true },
      },
      {
        collectionName: COLLECTION.USER_GYM_PLANS,
        operation: 'set',
        docId: 'guest_local_user',
        data: { userId: 'guest_local_user', templateId: 'ppl' },
      },
      {
        collectionName: COLLECTION.WATER_LOGS,
        operation: 'set',
        docId: 'rand_water_1',
        data: { id: 'rand_water_1', userId: 'guest_local_user', date: '2026-11-26', amountMl: 500 },
      },
      {
        collectionName: COLLECTION.WATER_LOGS,
        operation: 'set',
        docId: 'rand_water_2',
        data: { id: 'rand_water_2', userId: 'guest_local_user', date: '2026-11-26', amountMl: 300 },
      },
    ]);

    env.state.currentUser = { uid: 'google_uid_42', isAnonymous: false };
    await migrateOfflineQueueUser('guest_local_user', 'google_uid_42');

    const q = getMemoryQueueSync();
    assert.equal(q.length, 4);
    assert.equal(q[0].docId, 'google_uid_42_2026-11-26');
    assert.equal(q[1].docId, 'google_uid_42');
    assert.equal(q[2].docId, 'rand_water_1', 'Random water docId must not collapse to date');
    assert.equal(q[3].docId, 'rand_water_2', 'Second water docId must stay distinct');

    env.setOnline(true);
    await syncOfflineQueue(true);
    assert.equal(env.firestoreStore.get('gym_logs/google_uid_42_2026-11-26')?.userId, 'google_uid_42');
    assert.equal(env.firestoreStore.get('user_gym_plans/google_uid_42')?.templateId, 'ppl');
    assert.equal(env.firestoreStore.get('water_logs/rand_water_1')?.amountMl, 500);
    assert.equal(env.firestoreStore.get('water_logs/rand_water_2')?.amountMl, 300);
  });

  it('11. Caps poisoned future clock skew in HLC getMonotonicTimestamp while keeping strict monotonicity', () => {
    const now = Date.now();
    const tenDaysInFuture = now + 10 * 24 * 60 * 60 * 1000;
    const t1 = getMonotonicTimestamp(tenDaysInFuture);
    const t2 = getMonotonicTimestamp(t1);

    assert.ok(t1 <= Date.now() + 62_000, 'Future clock drift must be capped');
    assert.ok(t2 > t1, 'HLC timestamps must strictly increase');
  });

  it('12. Hydrates offline Tier-1 weight/sleep/water logs and local_user hot active workout cleanly on cold boot', async () => {
    const today = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    env.asyncStore.set(BOOT_KEYS.WEIGHT_LOGS, JSON.stringify([{ id: 'w1', date: today, weightKg: 76.4 }]));
    env.asyncStore.set(BOOT_KEYS.SLEEP_LOGS, JSON.stringify([{ id: 's1', date: today, hours: 7.5 }]));
    env.asyncStore.set(BOOT_KEYS.WATER_LOGS, JSON.stringify([{ id: 'wa1', date: today, amountMl: 1000 }]));
    env.asyncStore.set(BOOT_KEYS.GYM_LOGS, JSON.stringify([{ id: `u_${today}`, userId: 'u', date: today, completed: false, updatedAt: 1000, exercises: [] }]));
    env.asyncStore.set(
      `@zenfit_hot_log_${today}`,
      JSON.stringify({ id: `local_user_${today}`, userId: 'local_user', date: today, workoutStartTime: 1234, completed: false, updatedAt: 2000, exercises: [{ name: 'Overhead Press', setsLog: [] }] })
    );

    const emittedEvents = [];
    const sub = env.reactNative?.DeviceEventEmitter?.addListener?.('gym_logs_changed', (p) => emittedEvents.push(p));
    env.emitter.on('gym_logs_changed', (p) => emittedEvents.push(p));

    const manifest = await loadBootManifest();
    await waitTick(25);
    if (sub) sub.remove();

    assert.equal(manifest.gymLogs[0].exercises[0].name, 'Overhead Press');
    const lastTier1 = emittedEvents.find((e) => e.weightLogs || e.sleepLogs || e.waterLogs);
    assert.ok(lastTier1, 'Boot manifest must emit Tier-1 secondary wellness logs offline');
    assert.equal(lastTier1.weightLogs?.[0]?.weightKg, 76.4);
    assert.equal(lastTier1.sleepLogs?.[0]?.hours, 7.5);
    assert.equal(lastTier1.waterLogs?.[0]?.amountMl, 1000);
  });

  it('13. Partitions >90d cold archives and prunes orphaned archive year keys when deleted', async () => {
    const today = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    const hotLog = { id: `u_${today}`, date: today, completed: true, updatedAt: 1000, exercises: [] };
    const old2023 = { id: 'u_2023-05-10', date: '2023-05-10', completed: true, updatedAt: 500, exercises: [] };
    const old2024 = { id: 'u_2024-03-14', date: '2024-03-14', completed: true, updatedAt: 600, exercises: [] };

    await writeWellnessCache({ gymLogs: [hotLog, old2024, old2023] }, true);
    assert.ok(env.asyncStore.has('@zentrack_cache_gym_archive_2023'));
    assert.ok(env.asyncStore.has('@zentrack_cache_gym_archive_2024'));
    assert.deepEqual(JSON.parse(env.asyncStore.get(GYM_ARCHIVE_YEARS_KEY)).sort(), ['2023', '2024']);

    // Delete 2023 archive entry (multi-device delete or edit) -> flush must prune orphaned 2023 archive key!
    await writeWellnessCache({ gymLogs: [hotLog, old2024] }, true);
    await waitTick(10);
    assert.equal(env.asyncStore.has('@zentrack_cache_gym_archive_2023'), false, 'Orphaned 2023 archive key must be removed');
    assert.ok(env.asyncStore.has('@zentrack_cache_gym_archive_2024'));

    const restored = await readWellnessCache();
    assert.equal(restored.gymLogs?.length, 2);
    assert.equal(restored.gymLogs?.some((l) => l.date === '2023-05-10'), false);
  });

  it('14. Hydrates fast auth/onboarding/theme slice independently from heavy gymLogs without losing live mutations', async () => {
    // Seed heavy malformed/slow gymLogs alongside tiny auth keys — auth slice must not depend on GYM_LOGS
    env.asyncStore.set(BOOT_KEYS.OPTIMISTIC_USER, JSON.stringify({ uid: 'user_abc', email: 'a@b.com', isAnonymous: false }));
    env.asyncStore.set(GUEST_STORAGE_KEY, 'false');
    env.asyncStore.set('gym_profile_v1', JSON.stringify({ heightCm: 178, weightKg: 75 }));
    env.asyncStore.set(BOOT_KEYS.THEME_MODE, 'light');
    env.asyncStore.set(BOOT_KEYS.GYM_LOGS, 'not-even-read-by-auth-slice');

    assert.equal(isAuthBootHydrated(), false);
    const slice = await loadAuthBootSlice();

    assert.equal(isAuthBootHydrated(), true);
    assert.equal(getAuthBootSync(), slice);
    assert.equal(slice.optimisticUser?.uid, 'user_abc');
    assert.equal(slice.isGuest, false);
    assert.equal(slice.onboarded, true, 'Profile biometrics must resolve onboarded even if flag was missing');
    assert.equal(slice.themeMode, 'light');
    assert.equal(getL1Sync(BOOT_KEYS.OPTIMISTIC_USER, null)?.uid, 'user_abc');
    assert.equal(getL1Sync(ONBOARDING_FLOW_KEY, false), true);

    // Live mutation guard: mid-flight setL1Sync must not be overwritten by stale AsyncStorage read
    clearBootManifest();
    env.asyncStore.set(ONBOARDING_FLOW_KEY, 'false');
    setL1Sync(ONBOARDING_FLOW_KEY, true, true);
    env.asyncStore.set(ONBOARDING_FLOW_KEY, 'false'); // simulate stale disk value
    const sliceAfterLive = await loadAuthBootSlice();
    assert.equal(getL1Sync(ONBOARDING_FLOW_KEY, false), true, 'Live L1 mutation must win over stale disk snapshot');
    assert.equal(sliceAfterLive.isGuest, false);
  });
});
