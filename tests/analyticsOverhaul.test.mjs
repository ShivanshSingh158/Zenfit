import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const Module = require('node:module');
require('./testHarness.cjs');

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request.endsWith('/hooks/useGymProfile') || request === '../hooks/useGymProfile') {
    return { getGymProfileSync: () => ({ unitIsLbs: false }) };
  }
  return origLoad.call(this, request, parent, isMain);
};

const env = globalThis.__ZENFIT_TEST_ENV__;
const {
  buildAnalyticsDateRange,
  computeUnifiedAnalytics,
  computePeriodScopedSummary,
  computeScopedConsistency,
  getPlannedWeeklySessionCount,
} = require(path.join(env.ROOT, 'src/services/gymAnalyticsEngine.ts'));
Module._load = origLoad;
const { clearDomainHotCache } = require(path.join(env.ROOT, 'src/utils/hotCacheStore.ts'));
const { toYMD } = require(path.join(env.ROOT, 'src/utils/dateCore.ts'));

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toYMD(d);
}

describe('Analytics UI Overhaul Engine (Ranges, Donuts, MEV-MRV, Consistency)', () => {
  beforeEach(() => {
    env.resetStores();
    clearDomainHotCache();
  });

  it('builds balanced split, effort, rep-zone, cardio mix, and MEV/MRV normalized metrics across 4W custom range', () => {
    const logs = [
      {
        id: 'log1',
        date: daysAgo(20),
        dayPlanIndex: 1,
        workoutDurationMinutes: 55,
        completed: true,
        exercises: [
          {
            exerciseId: 'bench',
            name: 'Bench Press (Barbell)',
            muscle: 'Chest',
            targetSets: 4,
            targetReps: '6-8',
            setsLog: [
              { setNumber: 1, weight: 80, reps: 8, completed: true, rir: 2 },
              { setNumber: 2, weight: 80, reps: 8, completed: true, rir: 2 },
              { setNumber: 3, weight: 85, reps: 5, completed: true, rir: 1 },
            ],
          },
          {
            exerciseId: 'row',
            name: 'Barbell Row',
            muscle: 'Back',
            targetSets: 3,
            targetReps: '8-10',
            setsLog: [
              { setNumber: 1, weight: 70, reps: 10, completed: true, rir: 2 },
              { setNumber: 2, weight: 70, reps: 10, completed: true, rir: 2 },
              { setNumber: 3, weight: 70, reps: 10, completed: true, rir: 1 },
            ],
          },
        ],
        cardio: [
          { id: 'c1', type: 'Running', durationMinutes: 25, distanceKm: 4.5, completed: true },
        ],
      },
      {
        id: 'log2',
        date: daysAgo(3),
        dayPlanIndex: 2,
        workoutDurationMinutes: 60,
        completed: true,
        exercises: [
          {
            exerciseId: 'bench',
            name: 'Bench Press (Barbell)',
            muscle: 'Chest',
            targetSets: 4,
            targetReps: '6-8',
            setsLog: [
              { setNumber: 1, weight: 90, reps: 6, completed: true, rir: 1 },
              { setNumber: 2, weight: 90, reps: 6, completed: true, rir: 1 },
            ],
          },
          {
            exerciseId: 'squat',
            name: 'Squat (Barbell)',
            muscle: 'Quads',
            targetSets: 3,
            targetReps: '8-10',
            setsLog: [
              { setNumber: 1, weight: 100, reps: 8, completed: true, rir: 2 },
              { setNumber: 2, weight: 100, reps: 14, completed: true, rir: 4 },
            ],
          },
        ],
        cardio: [
          { id: 'c2', type: 'Cycling', durationMinutes: 35, distanceKm: 12, completed: true },
        ],
      },
    ];

    const range = buildAnalyticsDateRange('custom', {
      customStart: daysAgo(27),
      customEnd: daysAgo(0),
      gymLogs: logs,
    });
    assert.equal(range.daySpan, 28);

    const unified = computeUnifiedAnalytics(logs);
    const summary = computePeriodScopedSummary(logs, unified, range, null);

    assert.equal(summary.sessionsCount, 2);
    assert.equal(summary.setsCount, 10);
    // Split balance: 5 Chest (Push), 3 Back (Pull), 2 Squat (Legs)
    assert.equal(summary.splitDistribution.pushSets, 5);
    assert.equal(summary.splitDistribution.pullSets, 3);
    assert.equal(summary.splitDistribution.legSets, 2);

    // Effort RIR breakdown: 4 sets @ 0-1 RIR, 5 sets @ 2-3 RIR, 1 set @ 4+ RIR
    assert.equal(summary.effortDistribution.hardSets01, 4);
    assert.equal(summary.effortDistribution.growthSets23, 5);
    assert.equal(summary.effortDistribution.lightSets4Plus, 1);
    assert.equal(summary.effortDistribution.optimalPct, 90);

    // Rep zones: 85x5 -> str=1, 80x8/70x10/90x6/100x8 -> hyp=8, 100x14 -> end=1
    assert.equal(summary.repZoneDistribution.strength1to5, 1);
    assert.equal(summary.repZoneDistribution.hypertrophy6to12, 8);
    assert.equal(summary.repZoneDistribution.endurance13Plus, 1);

    // Cardio multi-modality breakdown
    assert.equal(summary.cardio.sessions, 2);
    assert.equal(summary.cardio.totalMinutes, 60);
    assert.equal(summary.cardio.modalities.length, 2);

    // Muscle normalization across 4 weeks (28d / 7 = 4): 5 direct chest sets / 4 = 1.3/wk (< MEV 8 -> 'low')
    const chestRow = summary.muscleVolumes.find(m => m.muscle === 'Chest');
    assert.ok(chestRow);
    assert.equal(chestRow.directSets, 5);
    assert.equal(chestRow.weeklyAvgEffective, 1.3);
    assert.equal(chestRow.status, 'low');
    assert.equal(summary.sessionsWithDelta.length, 2);
  });

  it('computes rotation-mode planned sessions and scoped consistency buckets cleanly', () => {
    const rotationPlan = {
      userId: 'u1',
      scheduleMode: 'rotation',
      customDays: {
        1: { dayIndex: 1, name: 'Push', isRest: false, exercises: [{ id: 'e1', name: 'Bench', targetSets: 3, targetReps: '8' }] },
        2: { dayIndex: 2, name: 'Pull', isRest: false, exercises: [{ id: 'e2', name: 'Row', targetSets: 3, targetReps: '8' }] },
        3: { dayIndex: 3, name: 'Legs', isRest: false, exercises: [{ id: 'e3', name: 'Squat', targetSets: 3, targetReps: '8' }] },
        4: { dayIndex: 4, name: 'Rest', isRest: true, exercises: [] },
        5: { dayIndex: 5, name: 'Rest', isRest: true, exercises: [] },
        6: { dayIndex: 6, name: 'Rest', isRest: true, exercises: [] },
        7: { dayIndex: 7, name: 'Rest', isRest: true, exercises: [] },
      },
      updatedAt: 1000,
    };

    assert.equal(getPlannedWeeklySessionCount(rotationPlan), 3);

    const logs = [
      {
        id: 'r1',
        date: daysAgo(12),
        dayPlanIndex: 1,
        completed: true,
        exercises: [{ exerciseId: 'e1', name: 'Bench', muscle: 'Chest', targetSets: 3, targetReps: '8', setsLog: [{ setNumber: 1, weight: 60, reps: 8, completed: true }] }],
        cardio: [{ id: 'c1', type: 'Walk', durationMinutes: 20, distanceKm: 2, completed: true }],
      },
      {
        id: 'r2',
        date: daysAgo(9),
        dayPlanIndex: 2,
        completed: true,
        exercises: [{ exerciseId: 'e2', name: 'Row', muscle: 'Back', targetSets: 3, targetReps: '8', setsLog: [{ setNumber: 1, weight: 50, reps: 8, completed: true }] }],
      },
      {
        id: 'r3',
        date: daysAgo(2),
        dayPlanIndex: 3,
        completed: true,
        exercises: [{ exerciseId: 'e3', name: 'Squat', muscle: 'Quads', targetSets: 3, targetReps: '8', setsLog: [{ setNumber: 1, weight: 80, reps: 8, completed: true }] }],
      },
    ];

    const cycleRange = buildAnalyticsDateRange('cycle', {
      cycleOffset: 0,
      userGymPlan: rotationPlan,
      gymLogs: logs,
    });
    assert.equal(cycleRange.startDate, daysAgo(12));
    assert.equal(cycleRange.endDate, daysAgo(0));

    const consRange = buildAnalyticsDateRange('8w', { userGymPlan: rotationPlan, gymLogs: logs });
    const unified = computeUnifiedAnalytics(logs, rotationPlan);
    const consistency = computeScopedConsistency(unified, logs, consRange, rotationPlan);

    assert.equal(consistency.plannedWeeklySessions, 3);
    assert.equal(consistency.weeklyBuckets.length, 8);
    assert.equal(consistency.weekdayFrequency.length, 7);
    assert.equal(consistency.cardioPeriod.totalMinutes, 20);
    assert.ok(consistency.longestStreakDays >= 1);
  });

  it('scopes streak, best streak, avg/wk, adherence, and heatmap sessions strictly to selected custom/preset date range', () => {
    const plan = {
      userId: 'u2',
      scheduleMode: 'calendar',
      customDays: {
        1: { dayIndex: 1, name: 'Upper', isRest: false, exercises: [{ id: 'e1', name: 'Bench Press', targetSets: 3, targetReps: '8' }] },
        2: { dayIndex: 2, name: 'Lower', isRest: false, exercises: [{ id: 'e2', name: 'Squat', targetSets: 3, targetReps: '8' }] },
        3: { dayIndex: 3, name: 'Rest', isRest: true, exercises: [] },
        4: { dayIndex: 4, name: 'Push', isRest: false, exercises: [{ id: 'e3', name: 'OHP', targetSets: 3, targetReps: '8' }] },
        5: { dayIndex: 5, name: 'Pull', isRest: false, exercises: [{ id: 'e4', name: 'Row', targetSets: 3, targetReps: '8' }] },
        6: { dayIndex: 6, name: 'Rest', isRest: true, exercises: [] },
        7: { dayIndex: 7, name: 'Rest', isRest: true, exercises: [] },
      },
      updatedAt: 1000,
    };

    const mkLog = (n, weight = 80, reps = 8) => ({
      id: `log_${n}`,
      date: daysAgo(n),
      dayPlanIndex: 1,
      completed: true,
      exercises: [
        {
          exerciseId: 'e1',
          name: 'Bench Press',
          muscle: 'Chest',
          targetSets: 3,
          targetReps: '8',
          setsLog: [{ setNumber: 1, weight, reps, completed: true }],
        },
      ],
    });

    // Old 6-day streak (daysAgo 35..30) + recent 2 workouts (daysAgo 2, 1)
    const logs = [
      mkLog(35, 70, 8),
      mkLog(34, 70, 8),
      mkLog(33, 72.5, 8),
      mkLog(32, 72.5, 8),
      mkLog(31, 75, 8),
      mkLog(30, 75, 8),
      mkLog(2, 82.5, 8),
      mkLog(1, 85, 8),
    ];

    const unified = computeUnifiedAnalytics(logs, plan);

    // Recent 14-day custom window must exclude daysAgo(35..30)
    const recent14 = buildAnalyticsDateRange('custom', {
      customStart: daysAgo(13),
      customEnd: daysAgo(0),
      userGymPlan: plan,
      gymLogs: logs,
    });
    const consRecent = computeScopedConsistency(unified, logs, recent14, plan);
    assert.equal(consRecent.sessionsInRange, 2, 'Sessions in range must exclude out-of-range weeks');
    assert.equal(consRecent.avgWorkoutsPerWeek, 1);
    assert.equal(consRecent.longestStreakDays, 2, 'Best streak in 14d must not include old 35d-ago streak');

    // Wider 45-day window captures BOTH recent + old 6-day streak -> longestStreakDays >= 6
    const wide45 = buildAnalyticsDateRange('custom', {
      customStart: daysAgo(44),
      customEnd: daysAgo(0),
      userGymPlan: plan,
      gymLogs: logs,
    });
    const consWide = computeScopedConsistency(unified, logs, wide45, plan);
    assert.equal(consWide.sessionsInRange, 8);
    assert.ok(consWide.longestStreakDays >= 6, 'Wider range must reflect longer best streak');

    // All-time period summary computes real overload rate from in-range progression baseline
    const allRange = buildAnalyticsDateRange('all', { userGymPlan: plan, gymLogs: logs });
    const allReport = computePeriodScopedSummary(logs, unified, allRange, plan);
    assert.equal(allReport.sessionsCount, 8);
    assert.equal(allReport.overloadRatePct, 100);
    assert.ok(allReport.weightUnlocks >= 1);
  });
});
