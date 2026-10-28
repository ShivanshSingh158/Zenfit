/**
 * gymAnalyticsEngine.ts — ZenFit Mobile
 *
 * Unified High-Performance Analytics, Trends, Recap & Trophy Intelligence Engine.
 * Precomputes sports-science metrics in O(N) over historical gym logs:
 * - Top 3 Auto-Detected Anchor Lifts (Push, Pull, Legs) + Combined e1RM Total
 * - Recent PR Feed (Weight PRs, Rep PRs, e1RM PRs in last 30d)
 * - 4-Bracket Rep-Max Matrix (1-3RM, 4-6RM, 7-10RM, 11-15RM)
 * - Weekly Overload Scorecard (Adherence, Progression States, Net Strength %)
 * - Effective Weekly Muscle Volume (Direct = 1.0, Synergist = 0.5; Optimal = 6-16 sets)
 * - Effort Quality Breakdown (0-2 RIR Hypertrophy Tension vs 3+ RIR Submaximal)
 * - Pinned Core Lifts Matrix (Sparklines, Delta %, 3-Curve Telemetry)
 * - Upgraded Workout Log Cards (Top 3 Working Sets preview, Split tags, PR badges)
 */

import { GymDayLog, GymExerciseLog, GymSet } from '../types/gym.types';
import {
  extractWorkingSets,
  calculateSetE1RM,
  inferExerciseMeta,
  LoggedSetInput,
} from './progressionEngine';
import {
  resolveExerciseTargetMuscle,
  normalizeExerciseKey,
  getVolumeMultiplier,
  formatIndianDatePretty,
} from '../utils/gymUtils';
import { computeOrGetHotCache, generateDatasetFingerprint } from '../utils/hotCacheStore';
import { dateStrOffset, todayStr } from '../data/gymPlan';

// ── Types ────────────────────────────────────────────────────────────────────

export interface RepBracketRecord {
  weight: number;
  reps: number;
  date: string;
  e1rm: number;
}

export interface ExercisePRSummary {
  exerciseName: string;
  canonicalMuscle: string;
  canonicalCategory: 'Push' | 'Pull' | 'Legs' | 'Arms' | 'Core' | 'Other';
  heaviestWeight: number;
  heaviestWeightReps: number;
  heaviestWeightDate: string;
  bestE1RM: number;
  bestE1RMSetLabel: string;
  bestE1RMDate: string;
  repBrackets: {
    '1-3RM': RepBracketRecord | null;
    '4-6RM': RepBracketRecord | null;
    '7-10RM': RepBracketRecord | null;
    '11-15RM': RepBracketRecord | null;
  };
  recent30dDeltaPct: number;
  sessionCount: number;
  historyTimeline: Array<{ date: string; shortDate: string; weight: number; reps: number; e1rm: number; rir: number }>;
}

export interface PREvent {
  id: string;
  date: string;
  exerciseName: string;
  type: 'weight' | 'rep' | '1rm';
  badgeTitle: string;
  currentValueText: string;
  previousValueText: string;
  diffText: string;
}

export interface AnchorLift {
  category: 'Push' | 'Pull' | 'Legs';
  exerciseName: string;
  bestWeight: number;
  bestReps: number;
  bestE1RM: number;
  sessionCount: number;
  formattedSet: string;
}

export interface WeeklyScorecard {
  evaluatedCount: number;
  progressedCount: number;
  overloadRatePct: number;
  netStrengthDeltaPct: number;
  weightUnlocks: number;
  repBuilds: number;
  plateaus: number;
  deloads: number;
}

export interface MuscleEffectiveVolume {
  muscleGroup: string;
  directSets: number;
  synergistSets: number;
  effectiveSets: number;
  status: 'low' | 'optimal' | 'high';
  color: string;
  dynamicMev?: number;
  dynamicMrv?: number;
  progressionRatePct?: number;
}

export interface PinnedLiftSummary {
  exerciseName: string;
  category: string;
  currentBestWeight: number;
  currentBestReps: number;
  currentBestE1RM: number;
  delta30dPct: number;
  sparklinePoints: Array<{ x: number; y: number }>;
  history: Array<{ date: string; shortDate: string; weight: number; reps: number; e1rm: number; rir: number }>;
}

export interface SessionCardItem {
  id: string;
  date: string;
  duration?: number;
  exerciseCount: number;
  totalSets: number;
  volumeKg: number;
  splitTag: 'Push' | 'Pull' | 'Legs' | 'Upper' | 'Lower' | 'Full Body' | 'Cardio' | 'Session';
  prCount: number;
  topAnchorSets: Array<{ exerciseName: string; weight: number; reps: number; label: string }>;
}

export interface WeeklyTrendItem {
  weekLabel: string;
  startMonday: string;
  endSunday: string;
  workoutCount: number;
  totalVolumeKg: number;
  cardioMinutes: number;
  isCurrentWeek: boolean;
}

export interface DetailedSessionExercise {
  name: string;
  muscle?: string;
  workingSets: Array<{ setNumber: number; weight: number; reps: number; completed: boolean; rir?: number }>;
  summaryText: string;
}

export interface DetailedSessionLog {
  id: string;
  date: string;
  formattedDate: string;
  splitTag: 'Push' | 'Pull' | 'Legs' | 'Upper' | 'Lower' | 'Full Body' | 'Cardio' | 'Session';
  durationMinutes: number;
  totalVolumeKg: number;
  totalSets: number;
  exerciseCount: number;
  exercises: DetailedSessionExercise[];
  cardio: Array<{ type: string; durationMinutes: number | null; distanceKm: number | null; calories: number | null }>;
  notes?: string;
}

export interface ExerciseTimelineSession {
  date: string;
  shortDate: string;
  topWeight: number;
  topReps: number;
  sessionVolume: number;
  workingSetsCount: number;
  sets: Array<{ setNumber: number; weight: number; reps: number; rir?: number }>;
}

export interface ExerciseHistoryProfile {
  name: string;
  category: string;
  muscle: string;
  totalSessions: number;
  firstLoggedDate: string;
  lastLoggedDate: string;
  allTimeBestWeight: number;
  allTimeBestReps: number;
  allTimeBestVolume: number;
  sessions: ExerciseTimelineSession[];
  progressionStatus: {
    status: 'progressing' | 'consolidating' | 'stalled' | 'baseline';
    message: string;
    deltaWeight: number;
    deltaReps: number;
  };
}

export interface WeeklyMuscleVolumeRow {
  muscle: string;
  directSets: number;
  targetSets: number;
  color: string;
}

export interface WeeklySummaryKPIs {
  workoutsThisWeek: number;
  volumeThisWeekKg: number;
  trainingDurationMins: number;
  cardioMinutes: number;
  cardioDistanceKm: number;
  avgWorkoutsPerWeek: number;
  currentStreak: number;
}

export interface UnifiedAnalyticsData {
  allExercisePRs: ExercisePRSummary[];
  anchorLifts: {
    push: AnchorLift | null;
    pull: AnchorLift | null;
    legs: AnchorLift | null;
    totalAnchorE1RM: number;
  };
  recentPRs: PREvent[];
  weeklyScorecard: WeeklyScorecard;
  effectiveMuscleVolumes: MuscleEffectiveVolume[];
  effortQuality: {
    effectiveHypertrophySets: number;
    submaximalSets: number;
    hypertrophySweetSpotPct: number;
  };
  pinnedLifts: PinnedLiftSummary[];
  sessionCards: SessionCardItem[];
  weeklyTrends: WeeklyTrendItem[];
  exerciseProfiles: ExerciseHistoryProfile[];
  detailedLogs: DetailedSessionLog[];
  muscleWeeklySets: WeeklyMuscleVolumeRow[];
  weeklySummary: WeeklySummaryKPIs;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function categorizeMuscleGroup(canonical: string): 'Push' | 'Pull' | 'Legs' | 'Arms' | 'Core' | 'Other' {
  if (canonical === 'Chest' || canonical === 'Shoulders') return 'Push';
  if (canonical === 'Back' || canonical === 'Traps') return 'Pull';
  if (['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Glutes/Abductors'].includes(canonical)) return 'Legs';
  if (['Arms', 'Biceps', 'Triceps', 'Forearms'].includes(canonical)) return 'Arms';
  if (canonical === 'Abs') return 'Core';
  return 'Other';
}

function determineWorkoutSplit(exercises: GymExerciseLog[]): 'Push' | 'Pull' | 'Legs' | 'Upper' | 'Lower' | 'Full Body' | 'Cardio' | 'Session' {
  if (!exercises || exercises.length === 0) return 'Session';

  let pushSets = 0;
  let pullSets = 0;
  let legSets = 0;

  for (const ex of exercises) {
    if (ex.skipped) continue;
    const { canonicalGroup } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
    const cat = categorizeMuscleGroup(canonicalGroup);
    const count = (ex.setsLog || []).filter(s => s.completed && !s.isWarmup).length;
    if (cat === 'Push') pushSets += count;
    else if (cat === 'Pull') pullSets += count;
    else if (cat === 'Legs') legSets += count;
  }

  const total = pushSets + pullSets + legSets;
  if (total === 0) return 'Session';

  if (legSets / total >= 0.6) return 'Legs';
  if (pushSets / total >= 0.6) return 'Push';
  if (pullSets / total >= 0.6) return 'Pull';
  if ((pushSets + pullSets) / total >= 0.8) return 'Upper';
  if (pushSets > 0 && pullSets > 0 && legSets > 0) return 'Full Body';

  return 'Session';
}

// ── Master Precompute Engine ─────────────────────────────────────────────────

export function computeUnifiedAnalytics(gymLogs: GymDayLog[]): UnifiedAnalyticsData {
  const datasetKey = `unified_analytics_v2_${generateDatasetFingerprint(gymLogs)}`;

  return computeOrGetHotCache(datasetKey, () => {
    const validLogs = (gymLogs || []).filter(l => l && l.date);
    // Chronological order (oldest to newest) to detect record breaks
    const chronoLogs = [...validLogs].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    const prMap = new Map<string, ExercisePRSummary>();
    const prEvents: PREvent[] = [];
    const today = todayStr();
    const thirtyDaysAgoStr = dateStrOffset(-30, today);
    const sevenDaysAgoStr = dateStrOffset(-7, today);
    const fourteenDaysAgoStr = dateStrOffset(-14, today);

    // Track running bests per exercise to detect PRs chronologically
    const runningBestWeight = new Map<string, number>();
    const runningRepsAtWeight = new Map<string, Map<number, number>>();
    const runningBestE1RM = new Map<string, number>();

    // Synergist & weekly muscle volume trackers
    const weeklyDirectSets: Record<string, number> = {
      Chest: 0,
      Back: 0,
      Quads: 0,
      'Glutes & Hams': 0,
      Delts: 0,
      Arms: 0,
    };
    const weeklySynergistSets: Record<string, number> = {
      Chest: 0,
      Back: 0,
      Quads: 0,
      'Glutes & Hams': 0,
      Delts: 0,
      Arms: 0,
    };

    let weeklyEffectiveHypertrophySets = 0;
    let weeklySubmaximalSets = 0;

    // Track exercises performed this week vs prior week for overload scorecard
    const thisWeekExE1RM = new Map<string, number>();
    const priorWeekExE1RM = new Map<string, number>();

    // Session cards data
    const sessionCards: SessionCardItem[] = [];

    // ── Loop 1: Chronological pass over all sessions ─────────────────────────
    for (const log of chronoLogs) {
      const isLast7d = log.date >= sevenDaysAgoStr;
      const isPrior7d = log.date >= fourteenDaysAgoStr && log.date < sevenDaysAgoStr;
      let sessionPrCount = 0;
      let sessionVolumeKg = 0;
      let sessionTotalWorkingSets = 0;
      const sessionWorkingSetsByEx: Array<{
        exerciseName: string;
        weight: number;
        reps: number;
        e1rm: number;
      }> = [];

      for (const ex of log.exercises || []) {
        if (ex.skipped || !ex.name) continue;

        const rawSets: LoggedSetInput[] = (ex.setsLog || []).map((s, idx) => ({
          setNumber: s.setNumber || idx + 1,
          weight: Number(s.weight ?? (s as any).weightKg) || 0,
          reps: Number(s.reps) || 0,
          rir: s.rir != null ? Number(s.rir) : (s.setType === 'failure' ? 0 : 2),
          isWarmup: s.isWarmup || s.setType === 'warmup',
          completed: s.completed,
        }));

        const completedWorkingSets = extractWorkingSets(rawSets.filter(s => s.completed));
        if (completedWorkingSets.length === 0) continue;

        const exName = ex.name.trim();
        const normKey = normalizeExerciseKey(exName);
        const { canonicalGroup } = resolveExerciseTargetMuscle(exName, ex.muscle);
        const category = categorizeMuscleGroup(canonicalGroup);
        const volMultiplier = getVolumeMultiplier(exName);

        let summary = prMap.get(normKey);
        if (!summary) {
          summary = {
            exerciseName: exName,
            canonicalMuscle: canonicalGroup,
            canonicalCategory: category,
            heaviestWeight: 0,
            heaviestWeightReps: 0,
            heaviestWeightDate: log.date,
            bestE1RM: 0,
            bestE1RMSetLabel: '',
            bestE1RMDate: log.date,
            repBrackets: {
              '1-3RM': null,
              '4-6RM': null,
              '7-10RM': null,
              '11-15RM': null,
            },
            recent30dDeltaPct: 0,
            sessionCount: 0,
            historyTimeline: [],
          };
          prMap.set(normKey, summary);
        }

        summary.sessionCount += 1;

        let sessionTopE1RMForEx = 0;
        let sessionTopWeightForEx = 0;
        let sessionTopRepsForEx = 0;

        for (const s of completedWorkingSets) {
          const w = s.weight;
          const r = s.reps;
          const rir = s.rir ?? 2;
          const e1rm = calculateSetE1RM(w, r, rir);

          sessionTotalWorkingSets++;
          sessionVolumeKg += w * r * volMultiplier;

          if (e1rm > sessionTopE1RMForEx) {
            sessionTopE1RMForEx = e1rm;
            sessionTopWeightForEx = w;
            sessionTopRepsForEx = r;
          }

          // ── Synergist Volume & RIR Tracking ──
          if (isLast7d) {
            if (rir <= 2) {
              weeklyEffectiveHypertrophySets++;
            } else {
              weeklySubmaximalSets++;
            }

            // Assign Primary Muscle Sets
            if (canonicalGroup === 'Chest') {
              weeklyDirectSets.Chest += 1;
              weeklySynergistSets.Delts += 0.5;
              weeklySynergistSets.Arms += 0.5; // Triceps
            } else if (['Back', 'Lats', 'Traps'].includes(canonicalGroup)) {
              weeklyDirectSets.Back += 1;
              weeklySynergistSets.Arms += 0.5; // Biceps
            } else if (canonicalGroup === 'Quads') {
              weeklyDirectSets.Quads += 1;
              weeklySynergistSets['Glutes & Hams'] += 0.3;
            } else if (['Hamstrings', 'Glutes', 'Glutes/Abductors'].includes(canonicalGroup)) {
              weeklyDirectSets['Glutes & Hams'] += 1;
            } else if (canonicalGroup === 'Shoulders') {
              weeklyDirectSets.Delts += 1;
              weeklySynergistSets.Arms += 0.3; // Triceps
            } else if (['Arms', 'Biceps', 'Triceps', 'Forearms'].includes(canonicalGroup)) {
              weeklyDirectSets.Arms += 1;
            }
          }

          // ── Rep Bracket Population ──
          const bracketKey =
            r <= 3 ? '1-3RM' : r <= 6 ? '4-6RM' : r <= 10 ? '7-10RM' : '11-15RM';
          const curBracket = summary.repBrackets[bracketKey];
          if (!curBracket || w > curBracket.weight || (w === curBracket.weight && r > curBracket.reps)) {
            summary.repBrackets[bracketKey] = {
              weight: w,
              reps: r,
              date: log.date,
              e1rm,
            };
          }

          // ── PR Detection (Chronological) ──
          const prevWeight = runningBestWeight.get(normKey) || 0;
          let weightRepsMap = runningRepsAtWeight.get(normKey);
          if (!weightRepsMap) {
            weightRepsMap = new Map<number, number>();
            runningRepsAtWeight.set(normKey, weightRepsMap);
          }
          const prevRepsAtWeight = weightRepsMap.get(w) || 0;
          const prevE1RM = runningBestE1RM.get(normKey) || 0;

          // 1. Heaviest Weight PR
          if (w > prevWeight && prevWeight > 0) {
            sessionPrCount++;
            runningBestWeight.set(normKey, w);
            if (log.date >= thirtyDaysAgoStr) {
              prEvents.push({
                id: `pr_w_${normKey}_${log.date}`,
                date: log.date,
                exerciseName: exName,
                type: 'weight',
                badgeTitle: 'Heaviest Weight PR',
                currentValueText: `${w} kg`,
                previousValueText: `${prevWeight} kg`,
                diffText: `+${(w - prevWeight).toFixed(1)} kg`,
              });
            }
          } else if (w > prevWeight) {
            runningBestWeight.set(normKey, w);
          }

          // 2. Rep PR at Same Weight
          if (w > 0 && r > prevRepsAtWeight && prevRepsAtWeight > 0) {
            sessionPrCount++;
            weightRepsMap.set(w, r);
            if (log.date >= thirtyDaysAgoStr) {
              prEvents.push({
                id: `pr_r_${normKey}_${w}_${log.date}`,
                date: log.date,
                exerciseName: exName,
                type: 'rep',
                badgeTitle: 'Rep PR at Load',
                currentValueText: `${w} kg × ${r} reps`,
                previousValueText: `${w} kg × ${prevRepsAtWeight} reps`,
                diffText: `+${r - prevRepsAtWeight} reps`,
              });
            }
          } else if (w > 0 && r > prevRepsAtWeight) {
            weightRepsMap.set(w, r);
          }

          // 3. All-time e1RM PR
          if (e1rm > prevE1RM && prevE1RM > 0) {
            sessionPrCount++;
            runningBestE1RM.set(normKey, e1rm);
            if (log.date >= thirtyDaysAgoStr) {
              prEvents.push({
                id: `pr_e1rm_${normKey}_${log.date}`,
                date: log.date,
                exerciseName: exName,
                type: '1rm',
                badgeTitle: 'All-Time e1RM PR',
                currentValueText: `${e1rm} kg (Est. 1RM)`,
                previousValueText: `${prevE1RM} kg`,
                diffText: `+${(e1rm - prevE1RM).toFixed(1)} kg`,
              });
            }
          } else if (e1rm > prevE1RM) {
            runningBestE1RM.set(normKey, e1rm);
          }

          // Update Summary Overall Bests
          if (w > summary.heaviestWeight || (w === summary.heaviestWeight && r > summary.heaviestWeightReps)) {
            summary.heaviestWeight = w;
            summary.heaviestWeightReps = r;
            summary.heaviestWeightDate = log.date;
          }
          if (e1rm > summary.bestE1RM) {
            summary.bestE1RM = e1rm;
            summary.bestE1RMSetLabel = `${w} kg × ${r}`;
            summary.bestE1RMDate = log.date;
          }
        }

        // Timeline entry for this session
        if (sessionTopWeightForEx > 0 && sessionTopRepsForEx > 0) {
          summary.historyTimeline.push({
            date: log.date,
            shortDate: log.date.slice(5).replace('-', '/'),
            weight: sessionTopWeightForEx,
            reps: sessionTopRepsForEx,
            e1rm: sessionTopE1RMForEx,
            rir: 2,
          });

          sessionWorkingSetsByEx.push({
            exerciseName: exName,
            weight: sessionTopWeightForEx,
            reps: sessionTopRepsForEx,
            e1rm: sessionTopE1RMForEx,
          });

          if (isLast7d) {
            const cur = thisWeekExE1RM.get(normKey) || 0;
            if (sessionTopE1RMForEx > cur) thisWeekExE1RM.set(normKey, sessionTopE1RMForEx);
          } else if (isPrior7d) {
            const cur = priorWeekExE1RM.get(normKey) || 0;
            if (sessionTopE1RMForEx > cur) priorWeekExE1RM.set(normKey, sessionTopE1RMForEx);
          }
        }
      }

      // Build SessionCardItem for Workout Logs
      if (sessionTotalWorkingSets > 0 || (log.cardio || []).some(c => c.completed)) {
        // Sort top anchor sets by e1RM desc
        sessionWorkingSetsByEx.sort((a, b) => b.e1rm - a.e1rm);
        const top3Sets = sessionWorkingSetsByEx.slice(0, 3).map(s => ({
          exerciseName: s.exerciseName,
          weight: s.weight,
          reps: s.reps,
          label: `${s.weight > 0 ? `${s.weight} kg` : 'BW'} × ${s.reps}`,
        }));

        sessionCards.push({
          id: log.id || log.date,
          date: log.date,
          duration: log.workoutDurationMinutes || 0,
          exerciseCount: log.exercises?.filter(e => !e.skipped).length || 0,
          totalSets: sessionTotalWorkingSets,
          volumeKg: Math.round(sessionVolumeKg),
          splitTag: determineWorkoutSplit(log.exercises || []),
          prCount: sessionPrCount,
          topAnchorSets: top3Sets,
        });
      }
    }

    // ── Calculate 30-Day Delta % on each summary ──
    for (const s of prMap.values()) {
      if (s.historyTimeline.length >= 2) {
        const oldest30d = s.historyTimeline.find(h => h.date >= thirtyDaysAgoStr) || s.historyTimeline[0];
        const newest = s.historyTimeline[s.historyTimeline.length - 1];
        if (oldest30d && newest && oldest30d.e1rm > 0) {
          s.recent30dDeltaPct = Math.round(((newest.e1rm - oldest30d.e1rm) / oldest30d.e1rm) * 1000) / 10;
        }
      }
    }

    // Sort all PR summaries by total session count desc
    const allSummaries = Array.from(prMap.values()).sort((a, b) => b.sessionCount - a.sessionCount);

    // ── Auto-Detected Top 3 Anchor Lifts ──────────────────────────────────────
    let pushAnchor: AnchorLift | null = null;
    let pullAnchor: AnchorLift | null = null;
    let legsAnchor: AnchorLift | null = null;

    for (const item of allSummaries) {
      if (!pushAnchor && item.canonicalCategory === 'Push' && item.bestE1RM > 0) {
        pushAnchor = {
          category: 'Push',
          exerciseName: item.exerciseName,
          bestWeight: item.heaviestWeight,
          bestReps: item.heaviestWeightReps,
          bestE1RM: item.bestE1RM,
          sessionCount: item.sessionCount,
          formattedSet: `${item.heaviestWeight > 0 ? `${item.heaviestWeight} kg` : 'BW'} × ${item.heaviestWeightReps}`,
        };
      }
      if (!pullAnchor && item.canonicalCategory === 'Pull' && item.bestE1RM > 0) {
        pullAnchor = {
          category: 'Pull',
          exerciseName: item.exerciseName,
          bestWeight: item.heaviestWeight,
          bestReps: item.heaviestWeightReps,
          bestE1RM: item.bestE1RM,
          sessionCount: item.sessionCount,
          formattedSet: `${item.heaviestWeight > 0 ? `${item.heaviestWeight} kg` : 'BW'} × ${item.heaviestWeightReps}`,
        };
      }
      if (!legsAnchor && item.canonicalCategory === 'Legs' && item.bestE1RM > 0) {
        legsAnchor = {
          category: 'Legs',
          exerciseName: item.exerciseName,
          bestWeight: item.heaviestWeight,
          bestReps: item.heaviestWeightReps,
          bestE1RM: item.bestE1RM,
          sessionCount: item.sessionCount,
          formattedSet: `${item.heaviestWeight > 0 ? `${item.heaviestWeight} kg` : 'BW'} × ${item.heaviestWeightReps}`,
        };
      }
      if (pushAnchor && pullAnchor && legsAnchor) break;
    }

    const totalAnchorE1RM = Math.round(
      (pushAnchor?.bestE1RM || 0) + (pullAnchor?.bestE1RM || 0) + (legsAnchor?.bestE1RM || 0)
    );

    // ── Weekly Overload Scorecard ─────────────────────────────────────────────
    let evaluatedCount = 0;
    let progressedCount = 0;
    let weightUnlocks = 0;
    let repBuilds = 0;
    let plateaus = 0;
    let deloads = 0;
    let sumDeltaPct = 0;

    for (const [key, curE1RM] of thisWeekExE1RM.entries()) {
      evaluatedCount++;
      const prevE1RM = priorWeekExE1RM.get(key);
      if (prevE1RM && prevE1RM > 0) {
        const delta = ((curE1RM - prevE1RM) / prevE1RM) * 100;
        sumDeltaPct += delta;
        if (delta >= 1.5) {
          progressedCount++;
          weightUnlocks++;
        } else if (delta > 0) {
          progressedCount++;
          repBuilds++;
        } else if (delta >= -3) {
          plateaus++;
        } else {
          deloads++;
        }
      } else {
        // First week performing it — counted as rep build progression
        progressedCount++;
        repBuilds++;
      }
    }

    const overloadRatePct = evaluatedCount > 0 ? Math.round((progressedCount / evaluatedCount) * 100) : 0;
    const netStrengthDeltaPct = evaluatedCount > 0 ? Math.round((sumDeltaPct / evaluatedCount) * 10) / 10 : 0;

    // ── Effective Weekly Muscle Volumes (Zone Bars) ───────────────────────────
    const MUSCLE_PALETTE: Record<string, string> = {
      Chest: '#FF6B6B',
      Back: '#4DABF7',
      Quads: '#FF922B',
      'Glutes & Hams': '#FF7849',
      Delts: '#9775FA',
      Arms: '#38D9A9',
    };

    const effectiveMuscleVolumes: MuscleEffectiveVolume[] = Object.keys(weeklyDirectSets).map(m => {
      const d = weeklyDirectSets[m] || 0;
      const s = weeklySynergistSets[m] || 0;
      const eff = Math.round((d + s) * 10) / 10;

      // Dynamic Individualized MEV / MRV Calibration:
      // If user is progressing (slope >= +0.5%), dynamic MEV is calibrated to their current volume
      const dynamicMev = netStrengthDeltaPct >= 0.5 ? Math.min(6, Math.max(4, eff - 1)) : 8;
      const dynamicMrv = netStrengthDeltaPct < -1.0 ? Math.max(12, eff - 2) : 20;

      let status: 'low' | 'optimal' | 'high' = 'optimal';
      if (eff < dynamicMev && netStrengthDeltaPct <= 0) {
        status = 'low';
      } else if (eff > dynamicMrv && netStrengthDeltaPct < 0) {
        status = 'high';
      } else {
        // Progressing or within personalized adaptive recovery capacity
        status = 'optimal';
      }

      return {
        muscleGroup: m,
        directSets: d,
        synergistSets: s,
        effectiveSets: eff,
        status,
        color: MUSCLE_PALETTE[m] || '#A599FF',
        dynamicMev,
        dynamicMrv,
        progressionRatePct: netStrengthDeltaPct,
      };
    });

    // ── Effort Quality ────────────────────────────────────────────────────────
    const totalWeeklySets = weeklyEffectiveHypertrophySets + weeklySubmaximalSets;
    const hypertrophySweetSpotPct =
      totalWeeklySets > 0 ? Math.round((weeklyEffectiveHypertrophySets / totalWeeklySets) * 100) : 0;

    // ── Pinned Core Lifts Matrix (Top 4 most frequent compound lifts) ──────────
    const pinnedCandidates = allSummaries.slice(0, 4);
    const pinnedLifts: PinnedLiftSummary[] = pinnedCandidates.map(c => {
      const pts = c.historyTimeline.length > 8 ? c.historyTimeline.slice(-8) : c.historyTimeline;
      const maxE = Math.max(...pts.map(p => p.e1rm), 1);
      const minE = Math.min(...pts.map(p => p.e1rm), 0);
      const range = maxE - minE || 1;

      const sparklinePoints = pts.map((p, idx) => {
        const x = (idx / Math.max(1, pts.length - 1)) * 70;
        const y = 26 - ((p.e1rm - minE) / range) * 22;
        return { x: Math.round(x), y: Math.round(y) };
      });

      return {
        exerciseName: c.exerciseName,
        category: c.canonicalCategory,
        currentBestWeight: c.heaviestWeight,
        currentBestReps: c.heaviestWeightReps,
        currentBestE1RM: c.bestE1RM,
        delta30dPct: c.recent30dDeltaPct,
        sparklinePoints,
        history: c.historyTimeline,
      };
    });

    // Sort recent PR feed by date descending (newest first)
    prEvents.sort((a, b) => b.date.localeCompare(a.date));

    // Reverse sessionCards so newest workouts appear at the top of Workout Logs
    sessionCards.reverse();

    // ── Detailed Session Logs (Comprehensive Workout Diary) ──
    const detailedLogs: DetailedSessionLog[] = [];
    for (const log of chronoLogs) {
      const splitTag = determineWorkoutSplit(log.exercises || []);
      const exList: DetailedSessionExercise[] = [];
      let sessVolume = 0;
      let sessSets = 0;

      for (const ex of log.exercises || []) {
        if (ex.skipped || !ex.name) continue;
        const validSets = (ex.setsLog || []).filter(s => s && s.completed && !s.isWarmup && s.setType !== 'warmup');
        if (validSets.length === 0) continue;

        const workingSets = validSets.map((s, idx) => ({
          setNumber: s.setNumber || idx + 1,
          weight: Number(s.weight ?? (s as any).weightKg) || 0,
          reps: Number(s.reps) || 0,
          completed: s.completed,
          rir: s.rir,
        }));

        sessSets += workingSets.length;
        const mult = getVolumeMultiplier(ex.name);
        for (const ws of workingSets) {
          sessVolume += ws.weight * ws.reps * mult;
        }

        const setsPreview = workingSets.slice(0, 3).map(s => `${s.weight > 0 ? `${s.weight}kg` : 'BW'} × ${s.reps}`).join(', ');
        const summaryText = `${workingSets.length} set${workingSets.length > 1 ? 's' : ''} (${setsPreview}${workingSets.length > 3 ? '...' : ''})`;

        const { canonicalGroup } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
        exList.push({
          name: ex.name.trim(),
          muscle: canonicalGroup,
          workingSets,
          summaryText,
        });
      }

      const cardioList = (log.cardio || []).filter(c => c && c.completed).map(c => ({
        type: c.type || 'Cardio',
        durationMinutes: c.durationMinutes ?? null,
        distanceKm: c.distanceKm ?? null,
        calories: c.calories ?? null,
      }));

      if (exList.length > 0 || cardioList.length > 0) {
        detailedLogs.push({
          id: log.id || log.date,
          date: log.date,
          formattedDate: formatIndianDatePretty(log.date),
          splitTag,
          durationMinutes: log.workoutDurationMinutes || 0,
          totalVolumeKg: Math.round(sessVolume),
          totalSets: sessSets,
          exerciseCount: exList.length,
          exercises: exList,
          cardio: cardioList,
          notes: log.notes?.trim() || undefined,
        });
      }
    }
    detailedLogs.reverse(); // Newest first

    // ── Exercise History Profiles (Trajectories Over Time) ──
    const exerciseProfileMap = new Map<string, ExerciseHistoryProfile>();

    for (const log of chronoLogs) {
      for (const ex of log.exercises || []) {
        if (ex.skipped || !ex.name) continue;
        const validSets = (ex.setsLog || []).filter(s => s && s.completed && !s.isWarmup && s.setType !== 'warmup');
        if (validSets.length === 0) continue;

        const exName = ex.name.trim();
        const normKey = normalizeExerciseKey(exName);
        const { canonicalGroup } = resolveExerciseTargetMuscle(exName, ex.muscle);
        const category = categorizeMuscleGroup(canonicalGroup);
        const mult = getVolumeMultiplier(exName);

        let prof = exerciseProfileMap.get(normKey);
        if (!prof) {
          prof = {
            name: exName,
            category,
            muscle: canonicalGroup,
            totalSessions: 0,
            firstLoggedDate: log.date,
            lastLoggedDate: log.date,
            allTimeBestWeight: 0,
            allTimeBestReps: 0,
            allTimeBestVolume: 0,
            sessions: [],
            progressionStatus: {
              status: 'baseline',
              message: 'Baseline session logged',
              deltaWeight: 0,
              deltaReps: 0,
            },
          };
          exerciseProfileMap.set(normKey, prof);
        }

        let sessTopWeight = 0;
        let sessTopReps = 0;
        let sessVol = 0;

        const sessionSets = validSets.map((s, idx) => {
          const w = Number(s.weight ?? (s as any).weightKg) || 0;
          const r = Number(s.reps) || 0;
          sessVol += w * r * mult;
          if (w > sessTopWeight || (w === sessTopWeight && r > sessTopReps)) {
            sessTopWeight = w;
            sessTopReps = r;
          }
          return {
            setNumber: s.setNumber || idx + 1,
            weight: w,
            reps: r,
            rir: s.rir,
          };
        });

        prof.totalSessions += 1;
        prof.lastLoggedDate = log.date;
        if (sessTopWeight > prof.allTimeBestWeight) {
          prof.allTimeBestWeight = sessTopWeight;
          prof.allTimeBestReps = sessTopReps;
        }
        if (sessVol > prof.allTimeBestVolume) {
          prof.allTimeBestVolume = Math.round(sessVol);
        }

        prof.sessions.push({
          date: log.date,
          shortDate: log.date.slice(5).replace('-', '/'),
          topWeight: sessTopWeight,
          topReps: sessTopReps,
          sessionVolume: Math.round(sessVol),
          workingSetsCount: sessionSets.length,
          sets: sessionSets,
        });
      }
    }

    // Compute Progression / Plateau Status for each profile
    for (const prof of exerciseProfileMap.values()) {
      const sessLen = prof.sessions.length;
      if (sessLen <= 1) {
        prof.progressionStatus = {
          status: 'baseline',
          message: 'Baseline session logged',
          deltaWeight: 0,
          deltaReps: 0,
        };
      } else {
        const last = prof.sessions[sessLen - 1];
        const prev = prof.sessions[sessLen - 2];
        const deltaW = Math.round((last.topWeight - prev.topWeight) * 10) / 10;
        const deltaR = last.topReps - prev.topReps;

        if (deltaW > 0) {
          prof.progressionStatus = {
            status: 'progressing',
            message: `+${deltaW} kg load added vs last session`,
            deltaWeight: deltaW,
            deltaReps: deltaR,
          };
        } else if (deltaW === 0 && deltaR > 0) {
          prof.progressionStatus = {
            status: 'progressing',
            message: `+${deltaR} reps added at same weight`,
            deltaWeight: 0,
            deltaReps: deltaR,
          };
        } else if (sessLen >= 3) {
          const s1 = prof.sessions[sessLen - 3];
          const s2 = prof.sessions[sessLen - 2];
          const s3 = prof.sessions[sessLen - 1];
          if (s3.topWeight <= s2.topWeight && s2.topWeight <= s1.topWeight && s3.topReps <= s2.topReps) {
            prof.progressionStatus = {
              status: 'stalled',
              message: '3 sessions without weight or rep increase',
              deltaWeight: deltaW,
              deltaReps: deltaR,
            };
          } else {
            prof.progressionStatus = {
              status: 'consolidating',
              message: 'Volume consolidation at current working load',
              deltaWeight: deltaW,
              deltaReps: deltaR,
            };
          }
        } else {
          prof.progressionStatus = {
            status: 'consolidating',
            message: 'Building volume at working load',
            deltaWeight: deltaW,
            deltaReps: deltaR,
          };
        }
      }
    }

    const exerciseProfiles = Array.from(exerciseProfileMap.values()).sort((a, b) => b.totalSessions - a.totalSessions);

    // ── Weekly Trends (Last 8 Weeks) ──
    const weeklyTrends: WeeklyTrendItem[] = [];
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // 0=Mon, 6=Sun
    const currMonday = new Date(now);
    currMonday.setDate(now.getDate() - dayOfWeek);
    currMonday.setHours(0, 0, 0, 0);

    const fmtDateIso = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    for (let i = 7; i >= 0; i--) {
      const mon = new Date(currMonday);
      mon.setDate(currMonday.getDate() - i * 7);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);

      const startMonday = fmtDateIso(mon);
      const endSunday = fmtDateIso(sun);
      const isCurrentWeek = i === 0;

      const weekLabel = isCurrentWeek
        ? 'This Wk'
        : `${MONTH_NAMES[mon.getMonth()]} ${mon.getDate()}`;

      let workoutCount = 0;
      let totalVolumeKg = 0;
      let cardioMinutes = 0;

      for (const log of chronoLogs) {
        if (log.date >= startMonday && log.date <= endSunday) {
          let hasWork = false;
          let sessVol = 0;
          for (const ex of log.exercises || []) {
            if (ex.skipped) continue;
            const valid = (ex.setsLog || []).filter(s => s && s.completed && !s.isWarmup);
            if (valid.length > 0) {
              hasWork = true;
              const mult = getVolumeMultiplier(ex.name);
              for (const ws of valid) {
                sessVol += (Number(ws.weight) || 0) * (Number(ws.reps) || 0) * mult;
              }
            }
          }

          let sessCardioMins = 0;
          for (const c of log.cardio || []) {
            if (c && c.completed) {
              hasWork = true;
              sessCardioMins += Number(c.durationMinutes) || 0;
            }
          }

          if (hasWork) {
            workoutCount++;
            totalVolumeKg += sessVol;
            cardioMinutes += sessCardioMins;
          }
        }
      }

      weeklyTrends.push({
        weekLabel,
        startMonday,
        endSunday,
        workoutCount,
        totalVolumeKg: Math.round(totalVolumeKg),
        cardioMinutes,
        isCurrentWeek,
      });
    }

    // ── Muscle Weekly Sets Breakdown (Direct Working Sets in Last 7 Days) ──
    const targetMap: Record<string, number> = {
      Chest: 14,
      Back: 16,
      Shoulders: 14,
      Quads: 12,
      'Glutes & Hams': 12,
      Arms: 14,
      Core: 8,
    };

    const muscleWeeklySets: WeeklyMuscleVolumeRow[] = [
      { muscle: 'Chest', directSets: weeklyDirectSets.Chest || 0, targetSets: targetMap.Chest, color: '#FF6B6B' },
      { muscle: 'Back', directSets: weeklyDirectSets.Back || 0, targetSets: targetMap.Back, color: '#4DABF7' },
      { muscle: 'Shoulders', directSets: weeklyDirectSets.Delts || 0, targetSets: targetMap.Shoulders, color: '#9775FA' },
      { muscle: 'Quads', directSets: weeklyDirectSets.Quads || 0, targetSets: targetMap.Quads, color: '#FF922B' },
      { muscle: 'Glutes & Hams', directSets: weeklyDirectSets['Glutes & Hams'] || 0, targetSets: targetMap['Glutes & Hams'], color: '#FF7849' },
      { muscle: 'Arms', directSets: weeklyDirectSets.Arms || 0, targetSets: targetMap.Arms, color: '#38D9A9' },
    ];

    // Weekly Summary KPIs
    const currWeekData = weeklyTrends[weeklyTrends.length - 1];
    const avgWorkoutsPerWeek = weeklyTrends.length > 0
      ? Math.round((weeklyTrends.reduce((acc, w) => acc + w.workoutCount, 0) / weeklyTrends.length) * 10) / 10
      : 0;

    let weeklyTrainingDurationMins = 0;
    let weeklyCardioDistKm = 0;
    for (const log of chronoLogs) {
      if (log.date >= sevenDaysAgoStr) {
        weeklyTrainingDurationMins += Number(log.workoutDurationMinutes) || 0;
        for (const c of log.cardio || []) {
          if (c && c.completed) {
            weeklyCardioDistKm += Number(c.distanceKm) || 0;
          }
        }
      }
    }

    const weeklySummary: WeeklySummaryKPIs = {
      workoutsThisWeek: currWeekData?.workoutCount || 0,
      volumeThisWeekKg: currWeekData?.totalVolumeKg || 0,
      trainingDurationMins: weeklyTrainingDurationMins,
      cardioMinutes: currWeekData?.cardioMinutes || 0,
      cardioDistanceKm: Math.round(weeklyCardioDistKm * 10) / 10,
      avgWorkoutsPerWeek,
      currentStreak: 0,
    };

    return {
      allExercisePRs: allSummaries,
      anchorLifts: {
        push: pushAnchor,
        pull: pullAnchor,
        legs: legsAnchor,
        totalAnchorE1RM,
      },
      recentPRs: prEvents.slice(0, 20),
      weeklyScorecard: {
        evaluatedCount,
        progressedCount,
        overloadRatePct: evaluatedCount > 0 ? overloadRatePct : 0,
        netStrengthDeltaPct: evaluatedCount > 0 ? netStrengthDeltaPct : 0,
        weightUnlocks,
        repBuilds,
        plateaus,
        deloads,
      },
      effectiveMuscleVolumes,
      effortQuality: {
        effectiveHypertrophySets: weeklyEffectiveHypertrophySets,
        submaximalSets: weeklySubmaximalSets,
        hypertrophySweetSpotPct,
      },
      pinnedLifts,
      sessionCards,
      weeklyTrends,
      exerciseProfiles,
      detailedLogs,
      muscleWeeklySets,
      weeklySummary,
    };
  });
}
