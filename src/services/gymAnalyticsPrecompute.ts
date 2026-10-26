/**
 * gymAnalyticsPrecompute.ts — ZenFit
 *
 * Background Analytical Pre-Computation & RAM Warming Engine:
 * - Warmed up via InteractionManager.runAfterInteractions after gymLogs mutate.
 * - Computes heavy analytics (Logs & PRs model, 30d trends, 18-week heatmap,
 *   streak, muscle recovery and exercise ghost sets) during idle frames.
 * - When Tab 3 (Analytics) or Tab 4 (Body) mounts or gains focus, getCachedAnalytics()
 *   returns in O(1) time (<0.01ms), achieving zero frame drops.
 */

import { InteractionManager } from 'react-native';
import { GymDayLog, UserGymPlanDoc } from '../types/gym.types';
import { todayStr, dateStrOffset } from '../data/gymPlan';
import {
  generateDatasetFingerprint,
  computeOrGetHotCache,
} from '../utils/hotCacheStore';
import {
  calculateGymStreak,
  buildExerciseHistoryIndex,
  resolveExerciseTargetMuscle,
  getVolumeMultiplier,
} from '../utils/gymUtils';
import {
  calculateMuscleFatigue,
  calculateMuscleLoad,
} from './muscleRecoveryService';

let _pendingPrecomputeTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Pre-computes hot analytics in an idle frame.
 * Debounced so rapid set logging does not trigger back-to-back heavy calculations.
 */
export function precomputeGymAnalytics(
  gymLogs: GymDayLog[] | null | undefined,
  userGymPlan: UserGymPlanDoc | null | undefined,
  immediate: boolean = false
): void {
  if (!gymLogs || gymLogs.length === 0) return;

  if (_pendingPrecomputeTimer) {
    clearTimeout(_pendingPrecomputeTimer);
    _pendingPrecomputeTimer = null;
  }

  const runCalculations = () => {
    InteractionManager.runAfterInteractions(() => {
      try {
        const today = todayStr();
        const logsFingerprint = generateDatasetFingerprint(gymLogs);

        // Sort ONCE for all analytics calculations
        const sortedLogsDesc = gymLogs
          .slice()
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        // 1. Pre-warm Exercise History Ghost Index (O(1) lookup for ActiveLoggingScreen)
        buildExerciseHistoryIndex(gymLogs, today);

        // 2. Pre-warm Gym Streak
        if (userGymPlan) {
          calculateGymStreak(gymLogs, userGymPlan);
        }

        // 3. Pre-warm View A: Logs & Heatmap snapshot
        const logsCacheKey = `analytics_logs_${logsFingerprint}`;
        computeOrGetHotCache(logsCacheKey, () => {
          const validSessions: Array<{
            id: string;
            date: string;
            duration?: number;
            exerciseCount: number;
            totalSets: number;
            volumeKg: number;
            topExercise: string;
          }> = [];
          const heatData: { date: string; volume: number }[] = [];
          let totalLifetimeVol = 0;

          for (const log of sortedLogsDesc) {
            if (!log?.date) continue;
            let sessionVol = 0;
            let sessionSets = 0;
            let completedExCount = 0;
            let firstExName = '';

            for (const ex of log.exercises || []) {
              if (ex.skipped) continue;
              const doneSets = (ex.setsLog || []).filter((s: any) => s.completed);
              if (doneSets.length > 0) {
                completedExCount++;
                if (!firstExName) firstExName = ex.name;
                const mult = getVolumeMultiplier(ex.name);
                for (const s of doneSets) {
                  sessionSets++;
                  const w = Number(s.weight ?? (s as any).weightKg) || 0;
                  const r = Number(s.reps) || 0;
                  if (w > 0 && r > 0) sessionVol += w * r * mult;
                }
              }
            }

            const hasCardio = (log.cardio || []).some((c: any) => c.completed);
            if (log.completed || completedExCount > 0 || hasCardio) {
              totalLifetimeVol += sessionVol;
              heatData.push({
                date: log.date.slice(0, 10),
                volume: Math.max(sessionVol, hasCardio ? 500 : 100),
              });
              validSessions.push({
                id: log.id || log.date,
                date: log.date,
                duration: log.workoutDurationMinutes,
                exerciseCount: completedExCount,
                totalSets: sessionSets,
                volumeKg: Math.round(sessionVol),
                topExercise: firstExName || (hasCardio ? 'Cardio Session' : 'Workout'),
              });
            }
          }

          return {
            pastSessions: validSessions,
            heatmapVolumeData: heatData,
            lifetimeVolumeKg: Math.round(totalLifetimeVol),
          };
        });

        // 4. Pre-warm View B: 30-day Trends Snapshot
        const trends30dKey = `analytics_trends_30d_${logsFingerprint}`;
        computeOrGetHotCache(trends30dKey, () => {
          const cutoff = dateStrOffset(-30, today);
          const fLogs = sortedLogsDesc
            .filter(l => l.date >= cutoff)
            .reverse();

          let totalWorkouts = 0;
          let totalVolumeKg = 0;
          let totalSets = 0;
          const completedSetsList: any[] = [];
          const dailyVol = new Map<string, number>();
          const muscleSets: Record<string, number> = {
            Chest: 0,
            Back: 0,
            Quads: 0,
            'Glutes & Hams': 0,
            Shoulders: 0,
            Arms: 0,
            'Core & Calves': 0,
          };

          for (const log of fLogs) {
            let isWorkout = false;
            let sessionVol = 0;

            for (const ex of log.exercises || []) {
              if (ex.skipped) continue;
              const { canonicalGroup } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
              let bucket = 'Core & Calves';
              if (canonicalGroup === 'Chest') bucket = 'Chest';
              else if (['Back', 'Lats', 'Traps'].includes(canonicalGroup)) bucket = 'Back';
              else if (canonicalGroup === 'Quads') bucket = 'Quads';
              else if (['Hamstrings', 'Glutes', 'Glutes/Abductors'].includes(canonicalGroup)) bucket = 'Glutes & Hams';
              else if (canonicalGroup === 'Shoulders') bucket = 'Shoulders';
              else if (['Biceps', 'Triceps', 'Forearms'].includes(canonicalGroup)) bucket = 'Arms';

              const mult = getVolumeMultiplier(ex.name);
              for (const s of ex.setsLog || []) {
                if (!s.completed) continue;
                isWorkout = true;
                totalSets++;
                muscleSets[bucket] = (muscleSets[bucket] || 0) + 1;
                const w = Number(s.weight ?? (s as any).weightKg) || 0;
                const r = Number(s.reps) || 0;
                if (r > 0) {
                  const setVol = w > 0 ? w * r * mult : 0;
                  sessionVol += setVol;
                  totalVolumeKg += setVol;
                  completedSetsList.push({
                    exerciseName: ex.name,
                    weightKg: w,
                    reps: r,
                    date: log.date,
                    rpe: s.rpe,
                    rir: s.rir,
                  });
                }
              }
            }

            if (isWorkout) {
              totalWorkouts++;
              const dKey = log.date.slice(0, 10);
              dailyVol.set(dKey, (dailyVol.get(dKey) || 0) + sessionVol);
            }
          }

          const volTimeline = Array.from(dailyVol.entries()).map(([d, v]) => ({
            date: d,
            volumeKg: Math.round(v),
          }));

          const donutData = Object.entries(muscleSets)
            .filter(([_, count]) => count > 0)
            .map(([muscle, count]) => ({ muscle, count }));

          return {
            filteredLogs: fLogs,
            kpi: {
              totalWorkouts,
              totalVolumeKg: Math.round(totalVolumeKg),
              totalSets,
            },
            volumeTimeline: volTimeline,
            donutStats: donutData,
            allCompletedSets: completedSetsList,
          };
        });

        // 5. Pre-warm Anatomical Muscle Recovery & Fatigue
        calculateMuscleFatigue(gymLogs, today);
        calculateMuscleLoad(gymLogs, 7, today, false);
      } catch (e) {
        // Silent failure in background pre-compute; render-time fallbacks remain safe
      }
    });
  };

  if (immediate) {
    runCalculations();
  } else {
    _pendingPrecomputeTimer = setTimeout(runCalculations, 100);
  }
}
