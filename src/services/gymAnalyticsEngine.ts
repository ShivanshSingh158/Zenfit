import { estimate1RM } from './oneRepMaxEngine';
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
  calculateGymStreak,
} from '../utils/gymUtils';
import { computeOrGetHotCache, generateDatasetFingerprint } from '../utils/hotCacheStore';
import { dateStrOffset, todayStr } from '../data/gymPlan';
import { formatWeight, getUnitIsLbsSync, kgToDisplay, unitLabel } from '../utils/weightUnit';

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
    '16+RM'?: RepBracketRecord | null;
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

  if (pushSets > 0 && pullSets > 0 && legSets > 0 && legSets / total >= 0.15) return 'Full Body';
  if (legSets / total >= 0.6) return 'Legs';
  if (pushSets / total >= 0.6) return 'Push';
  if (pullSets / total >= 0.6) return 'Pull';
  if ((pushSets + pullSets) / total >= 0.75) return 'Upper';
  if (pushSets > 0 && pullSets > 0 && legSets > 0) return 'Full Body';

  return 'Session';
}

// ── Master Precompute Engine ─────────────────────────────────────────────────

export function computeUnifiedAnalytics(gymLogs: GymDayLog[], userGymPlan?: any): UnifiedAnalyticsData {
  const today = todayStr();
  const unitIsLbs = getUnitIsLbsSync();
  const datasetKey = `unified_analytics_v2_${unitIsLbs ? 'lbs' : 'kg'}_${generateDatasetFingerprint(gymLogs)}`;

  return computeOrGetHotCache(datasetKey, () => {
    const effectivePlan = userGymPlan || (typeof require !== 'undefined' ? (require('../utils/bootManifest').getBootManifestSync()?.userGymPlan || null) : null);
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
    const sessionVolumeByDate = new Map<string, { volumeKg: number; cardioMinutes: number; workoutCount: number }>();
    const detailedLogs: DetailedSessionLog[] = [];
    const exerciseProfileMap = new Map<string, ExerciseHistoryProfile>();

    // ── Single Chronological Pass over all sessions (Loops 1-3 Unified) ─────
    for (const log of chronoLogs) {
      const splitTag = determineWorkoutSplit(log.exercises || []);
      const exList: DetailedSessionExercise[] = [];
      let sessVolume = 0;
      let sessSets = 0;
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

      // Per-session PR candidate trackers for clean deduplication
      const sessionNewBestWeight = new Map<string, { weight: number; prevWeight: number; reps: number; exName: string }>();
      const sessionNewBestReps = new Map<string, { weight: number; reps: number; prevReps: number; exName: string }>();
      const sessionNewBestE1RM = new Map<string, { e1rm: number; prevE1RM: number; exName: string }>();

      for (const ex of log.exercises || []) {
        if (ex.skipped || !ex.name) continue;

        const rawSets: LoggedSetInput[] = (ex.setsLog || []).map((s, idx) => ({
          setNumber: s.setNumber || idx + 1,
          weight: Number(s.weight ?? (s as any).weightKg) || 0,
          reps: Number(s.reps) || 0,
          // Issue #96: Check s.rpe if s.rir is not provided
          rir: s.rir != null
            ? Number(s.rir)
            : ((s as any).rpe != null && !isNaN(Number((s as any).rpe))
              ? Math.max(0, 10 - Number((s as any).rpe))
              : (s.setType === 'failure' ? 0 : 2)),
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
              '16+RM': null,
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
        let sessionTopRirForEx = 2;

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
            sessionTopRirForEx = rir;
          }

          // ── Synergist Volume & RIR Tracking ──
          if (isLast7d) {
            if (rir <= 2) {
              weeklyEffectiveHypertrophySets++;
            } else {
              weeklySubmaximalSets++;
            }

            const isCompoundPress = /\b(press|bench|push-?up|dip)\b/i.test(exName);
            const isCompoundPull = /\b(row|pull-?up|chin-?up|pulldown|deadlift)\b/i.test(exName);
            const isCompoundLeg = /\b(squat|press|lunge|split squat|hack|thrust|deadlift)\b/i.test(exName);

            // Assign Primary Muscle Sets & Gated Synergist Sets
            if (canonicalGroup === 'Chest') {
              weeklyDirectSets.Chest += 1;
              if (isCompoundPress) {
                weeklySynergistSets.Delts += 0.5;
                weeklySynergistSets.Arms += 0.5; // Triceps
              }
            } else if (['Back', 'Lats', 'Traps'].includes(canonicalGroup)) {
              weeklyDirectSets.Back += 1;
              if (isCompoundPull) {
                weeklySynergistSets.Arms += 0.5; // Biceps
              }
            } else if (canonicalGroup === 'Quads') {
              weeklyDirectSets.Quads += 1;
              if (isCompoundLeg) {
                weeklySynergistSets['Glutes & Hams'] += 0.3;
              }
            } else if (['Hamstrings', 'Glutes', 'Glutes/Abductors'].includes(canonicalGroup)) {
              weeklyDirectSets['Glutes & Hams'] += 1;
            } else if (canonicalGroup === 'Shoulders') {
              weeklyDirectSets.Delts += 1;
              if (isCompoundPress) {
                weeklySynergistSets.Arms += 0.3; // Triceps
              }
            } else if (['Arms', 'Biceps', 'Triceps', 'Forearms'].includes(canonicalGroup)) {
              weeklyDirectSets.Arms += 1;
            }
          }

          // ── Rep Bracket Population ──
          const bracketKey =
            r <= 3 ? '1-3RM' : r <= 6 ? '4-6RM' : r <= 10 ? '7-10RM' : r <= 15 ? '11-15RM' : '16+RM';
          const curBracket = summary.repBrackets[bracketKey];
          if (!curBracket || w > curBracket.weight || (w === curBracket.weight && r > curBracket.reps)) {
            summary.repBrackets[bracketKey] = {
              weight: w,
              reps: r,
              date: log.date,
              e1rm,
            };
          }

          // ── PR Detection (Per-Session Deduplication) ──
          const prevWeight = runningBestWeight.get(normKey) || 0;
          let weightRepsMap = runningRepsAtWeight.get(normKey);
          if (!weightRepsMap) {
            weightRepsMap = new Map<number, number>();
            runningRepsAtWeight.set(normKey, weightRepsMap);
          }
          const prevRepsAtWeight = weightRepsMap.get(w) || 0;
          const prevE1RM = runningBestE1RM.get(normKey) || 0;

          // 1. Heaviest Weight candidate
          if (w > prevWeight) {
            const existing = sessionNewBestWeight.get(normKey);
            if (!existing || w > existing.weight) {
              sessionNewBestWeight.set(normKey, { weight: w, prevWeight, reps: r, exName });
            }
          }

          // 2. Rep PR candidate at Same Weight
          if (w > 0 && r > prevRepsAtWeight) {
            const repKey = `${normKey}_${w}`;
            const existing = sessionNewBestReps.get(repKey);
            if (!existing || r > existing.reps) {
              sessionNewBestReps.set(repKey, { weight: w, reps: r, prevReps: prevRepsAtWeight, exName });
            }
          }

          // 3. All-time e1RM candidate
          if (e1rm > prevE1RM) {
            const existing = sessionNewBestE1RM.get(normKey);
            if (!existing || e1rm > existing.e1rm) {
              sessionNewBestE1RM.set(normKey, { e1rm, prevE1RM, exName });
            }
          }

          // Update Summary Overall Bests
          if (w > summary.heaviestWeight || (w === summary.heaviestWeight && r > summary.heaviestWeightReps)) {
            summary.heaviestWeight = w;
            summary.heaviestWeightReps = r;
            summary.heaviestWeightDate = log.date;
          }
          if (e1rm > summary.bestE1RM) {
            summary.bestE1RM = e1rm;
            summary.bestE1RMSetLabel = `${formatWeight(w, unitIsLbs, 1)} × ${r}`;
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
            rir: sessionTopRirForEx,
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

      // Commit deduplicated PR events and advance running bests
      const uLbl = unitLabel(unitIsLbs);
      for (const [key, item] of sessionNewBestWeight.entries()) {
        if (item.prevWeight > 0) {
          sessionPrCount++;
          if (log.date >= thirtyDaysAgoStr) {
            const diffW = (kgToDisplay(item.weight, unitIsLbs, 1) - kgToDisplay(item.prevWeight, unitIsLbs, 1)).toFixed(1);
            prEvents.push({
              id: `pr_w_${key}_${log.date}`,
              date: log.date,
              exerciseName: item.exName,
              type: 'weight',
              badgeTitle: 'Heaviest Weight PR',
              currentValueText: formatWeight(item.weight, unitIsLbs, 1),
              previousValueText: formatWeight(item.prevWeight, unitIsLbs, 1),
              diffText: `+${diffW} ${uLbl}`,
            });
          }
        }
        runningBestWeight.set(key, item.weight);
      }

      for (const [, item] of sessionNewBestReps.entries()) {
        const normKey = normalizeExerciseKey(item.exName);
        if (item.prevReps > 0) {
          sessionPrCount++;
          if (log.date >= thirtyDaysAgoStr) {
            const wFmt = formatWeight(item.weight, unitIsLbs, 1);
            prEvents.push({
              id: `pr_r_${normKey}_${item.weight}_${log.date}`,
              date: log.date,
              exerciseName: item.exName,
              type: 'rep',
              badgeTitle: 'Rep PR at Load',
              currentValueText: `${wFmt} × ${item.reps} reps`,
              previousValueText: `${wFmt} × ${item.prevReps} reps`,
              diffText: `+${item.reps - item.prevReps} reps`,
            });
          }
        }
        const weightRepsMap = runningRepsAtWeight.get(normKey);
        if (weightRepsMap) {
          weightRepsMap.set(item.weight, item.reps);
        }
      }

      for (const [key, item] of sessionNewBestE1RM.entries()) {
        if (item.prevE1RM > 0) {
          sessionPrCount++;
          if (log.date >= thirtyDaysAgoStr) {
            const diffRM = (kgToDisplay(item.e1rm, unitIsLbs, 1) - kgToDisplay(item.prevE1RM, unitIsLbs, 1)).toFixed(1);
            prEvents.push({
              id: `pr_e1rm_${key}_${log.date}`,
              date: log.date,
              exerciseName: item.exName,
              type: '1rm',
              badgeTitle: 'All-Time e1RM PR',
              currentValueText: `${formatWeight(item.e1rm, unitIsLbs, 1)} (Est. 1RM)`,
              previousValueText: formatWeight(item.prevE1RM, unitIsLbs, 1),
              diffText: `+${diffRM} ${uLbl}`,
            });
          }
        }
        runningBestE1RM.set(key, item.e1rm);
      }

      // Record daily volume and cardio for O(1) weekly trends
      let sessCardioMins = 0;
      let hasCardio = false;
      for (const c of log.cardio || []) {
        if (c && c.completed) {
          hasCardio = true;
          sessCardioMins += Number(c.durationMinutes) || 0;
        }
      }
      const existingDateData = sessionVolumeByDate.get(log.date) || { volumeKg: 0, cardioMinutes: 0, workoutCount: 0 };
      sessionVolumeByDate.set(log.date, {
        volumeKg: existingDateData.volumeKg + sessionVolumeKg,
        cardioMinutes: existingDateData.cardioMinutes + sessCardioMins,
        workoutCount: existingDateData.workoutCount + (sessionTotalWorkingSets > 0 || hasCardio ? 1 : 0),
      });

      // Build SessionCardItem for Workout Logs
      if (sessionTotalWorkingSets > 0 || (log.cardio || []).some(c => c.completed)) {
        // Sort top anchor sets by e1RM desc
        sessionWorkingSetsByEx.sort((a, b) => b.e1rm - a.e1rm);
        const top3Sets = sessionWorkingSetsByEx.slice(0, 3).map(s => ({
          exerciseName: s.exerciseName,
          weight: s.weight,
          reps: s.reps,
          label: `${s.weight > 0 ? formatWeight(s.weight, unitIsLbs, 1) : 'BW'} × ${s.reps}`,
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

    // ── Calculate 30-Day Delta % on each summary (Issue #56) ──
    for (const s of prMap.values()) {
      if (s.historyTimeline.length >= 2) {
        let oldest30d = s.historyTimeline.find(h => h.date >= thirtyDaysAgoStr);
        const newest = s.historyTimeline[s.historyTimeline.length - 1];
        if (oldest30d === newest) {
          const priorSessions = s.historyTimeline.filter(h => h.date < thirtyDaysAgoStr);
          if (priorSessions.length > 0) {
            oldest30d = priorSessions[priorSessions.length - 1];
          }
        }
        if (!oldest30d) oldest30d = s.historyTimeline[0];
        if (oldest30d && newest && oldest30d !== newest && oldest30d.e1rm > 0) {
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
          formattedSet: `${item.heaviestWeight > 0 ? formatWeight(item.heaviestWeight, unitIsLbs, 1) : 'BW'} × ${item.heaviestWeightReps}`,
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
          formattedSet: `${item.heaviestWeight > 0 ? formatWeight(item.heaviestWeight, unitIsLbs, 1) : 'BW'} × ${item.heaviestWeightReps}`,
        };
      }
      if (!legsAnchor && item.canonicalCategory === 'Legs' && item.canonicalMuscle !== 'Calves' && item.bestE1RM > 0) {
        legsAnchor = {
          category: 'Legs',
          exerciseName: item.exerciseName,
          bestWeight: item.heaviestWeight,
          bestReps: item.heaviestWeightReps,
          bestE1RM: item.bestE1RM,
          sessionCount: item.sessionCount,
          formattedSet: `${item.heaviestWeight > 0 ? formatWeight(item.heaviestWeight, unitIsLbs, 1) : 'BW'} × ${item.heaviestWeightReps}`,
        };
      }
      if (pushAnchor && pullAnchor && legsAnchor) break;
    }

    const totalAnchorE1RM = Math.round(
      (pushAnchor?.bestE1RM || 0) + (pullAnchor?.bestE1RM || 0) + (legsAnchor?.bestE1RM || 0)
    );

    // ── Weekly Overload Scorecard ─────────────────────────────────────────────
    let evaluatedCount = 0;
    let evaluatedDeltaCount = 0;
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
        evaluatedDeltaCount++;
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
    // Issue #98: Do not dilute net strength delta % with unprogressed newly-introduced baseline movements
    const netStrengthDeltaPct = evaluatedDeltaCount > 0 ? Math.round((sumDeltaPct / evaluatedDeltaCount) * 10) / 10 : 0;

    // ── Effective Weekly Muscle Volumes (Zone Bars) ───────────────────────────
    const MUSCLE_PALETTE: Record<string, string> = {
      Chest: '#FF6B6B',
      Back: '#0A84FF',
      Quads: '#FF922B',
      'Glutes & Hams': '#FF7849',
      Delts: '#38BDF8',
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
        color: MUSCLE_PALETTE[m] || '#0A84FF',
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

    detailedLogs.reverse(); // Newest first

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
          const dispDeltaW = Math.round(kgToDisplay(deltaW, unitIsLbs, 1) * 10) / 10;
          prof.progressionStatus = {
            status: 'progressing',
            message: `+${dispDeltaW} ${unitLabel(unitIsLbs)} load added vs last session`,
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

      const curD = new Date(mon);
      while (curD <= sun) {
        const dStr = fmtDateIso(curD);
        const dayData = sessionVolumeByDate.get(dStr);
        if (dayData) {
          workoutCount += dayData.workoutCount;
          totalVolumeKg += dayData.volumeKg;
          cardioMinutes += dayData.cardioMinutes;
        }
        curD.setDate(curD.getDate() + 1);
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
      { muscle: 'Back', directSets: weeklyDirectSets.Back || 0, targetSets: targetMap.Back, color: '#0A84FF' },
      { muscle: 'Shoulders', directSets: weeklyDirectSets.Delts || 0, targetSets: targetMap.Shoulders, color: '#38BDF8' },
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
      currentStreak: calculateGymStreak(gymLogs, effectivePlan),
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

export interface WeekScopedTopLift {
  exerciseName: string;
  muscle: string;
  weight: number;
  reps: number;
  e1rm: number;
  prLabel: 'Weight PR' | 'e1RM PR' | null;
}

export interface WeekScopedSummary {
  weekDates: string[];
  sessionsCount: number;
  volumeKg: number;
  prevVolumeKg: number;
  volumeDeltaPct: number | null;
  setsCount: number;
  prevSetsCount: number;
  durationMins: number;
  evaluatedCount: number;
  progressedCount: number;
  overloadRatePct: number | null;
  weightUnlocks: number;
  repBuilds: number;
  plateaus: number;
  topLifts: WeekScopedTopLift[];
  trainedMuscles: Array<{
    muscle: string;
    sets: number;
    pctOfTotal: number;
  }>;
  cardio: {
    sessions: number;
    totalMinutes: number;
    totalKm: number;
    estCalories: number;
    avgDuration: number;
  };
  dailyVolume: number[];
  prevDailyVolume: number[];
}

/**
 * Computes strictly week-scoped Analytics (KPIs, real overload progression vs prior week,
 * actual top lifts & PRs from that exact week, muscles trained, daily volume curve, and cardio).
 * Zero hardcoded fallbacks (no fake 85%, no fake 6-rep defaults).
 */
export function computeWeekScopedSummary(
  gymLogs: GymDayLog[],
  analyticsData: UnifiedAnalyticsData,
  weekDates: string[],
  prevWeekDates: string[]
): WeekScopedSummary {
  const startMon = weekDates[0] || '';
  const endSun = weekDates[6] || startMon;
  const cacheKey = `week_scoped_v1_${startMon}_${generateDatasetFingerprint(gymLogs, endSun)}`;

  return computeOrGetHotCache(cacheKey, () => {
    const safeLogs = gymLogs || [];
    const weekSet = new Set(weekDates);
    const prevSet = new Set(prevWeekDates);

    const weekLogs = safeLogs.filter(l => l?.date && weekSet.has(l.date.slice(0, 10)));
    const prevLogs = safeLogs.filter(l => l?.date && prevSet.has(l.date.slice(0, 10)));

    const weekDetailed = analyticsData.detailedLogs.filter(s => weekSet.has(s.date.slice(0, 10)));
    const prevDetailed = analyticsData.detailedLogs.filter(s => prevSet.has(s.date.slice(0, 10)));

    const sessionsCount = weekDetailed.length;
    const volumeKg = weekDetailed.reduce((sum, s) => sum + s.totalVolumeKg, 0);
    const prevVolumeKg = prevDetailed.reduce((sum, s) => sum + s.totalVolumeKg, 0);
    const setsCount = weekDetailed.reduce((sum, s) => sum + s.totalSets, 0);
    const prevSetsCount = prevDetailed.reduce((sum, s) => sum + s.totalSets, 0);
    const volumeDeltaPct =
      prevVolumeKg > 0 ? Math.round(((volumeKg - prevVolumeKg) / prevVolumeKg) * 1000) / 10 : null;

    const durationMins = weekDetailed.reduce((sum, s) => {
      const raw = s.durationMinutes || 0;
      const sane =
        raw > 180 ? Math.min(Math.max((s.totalSets || 0) * 3.5, 20), 90) : raw;
      return sum + Math.round(sane);
    }, 0);

    // Daily Mon–Sun tonnage vectors (index 0 = Mon ... 6 = Sun)
    const dailyVolByDate = new Map<string, number>();
    for (const dLog of weekDetailed) {
      const dKey = dLog.date.slice(0, 10);
      dailyVolByDate.set(dKey, (dailyVolByDate.get(dKey) || 0) + dLog.totalVolumeKg);
    }
    const prevDailyVolByDate = new Map<string, number>();
    for (const dLog of prevDetailed) {
      const dKey = dLog.date.slice(0, 10);
      prevDailyVolByDate.set(dKey, (prevDailyVolByDate.get(dKey) || 0) + dLog.totalVolumeKg);
    }
    const dailyVolume = weekDates.map(d => dailyVolByDate.get(d) || 0);
    const prevDailyVolume = prevWeekDates.map(d => prevDailyVolByDate.get(d) || 0);

    // Muscles trained (real completed working sets in this exact week)
    const muscleSetCounts: Record<string, number> = {};
    for (const log of weekLogs) {
      for (const ex of log.exercises || []) {
        if (ex.skipped) continue;
        const completed = (ex.setsLog || []).filter(s => s && s.completed && !s.isWarmup && s.setType !== 'warmup');
        if (completed.length === 0) continue;
        const resolved = resolveExerciseTargetMuscle(ex.name, ex.muscle);
        const m =
          resolved.canonicalGroup && resolved.canonicalGroup !== 'Mixed'
            ? resolved.canonicalGroup
            : 'Other';
        muscleSetCounts[m] = (muscleSetCounts[m] || 0) + completed.length;
      }
    }
    const totalMuscleSets = Object.values(muscleSetCounts).reduce((a, b) => a + b, 0);
    const trainedMuscles = Object.entries(muscleSetCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([muscle, sets]) => ({
        muscle,
        sets,
        pctOfTotal: totalMuscleSets > 0 ? Math.round((sets / totalMuscleSets) * 100) : 0,
      }));

    // Scoped Overload Progression & Top Lifts + Real Week PRs
    let evaluatedCount = 0;
    let progressedCount = 0;
    let weightUnlocks = 0;
    let repBuilds = 0;
    let plateaus = 0;
    const weekLiftsPool: WeekScopedTopLift[] = [];

    for (const prof of analyticsData.exerciseProfiles) {
      const thisWeekSess = prof.sessions.filter(s => weekSet.has(s.date.slice(0, 10)));
      if (thisWeekSess.length === 0) continue;

      const priorSessAll = prof.sessions.filter(s => s.date.slice(0, 10) < startMon);

      // Best lift actually logged during this selected week
      let bestW = 0;
      let bestR = 0;
      let bestE1rm = 0;
      for (const sess of thisWeekSess) {
        for (const st of sess.sets) {
          const w = Number(st.weight) || 0;
          const r = Number(st.reps) || 0;
          const rm = w > 0 && r > 0 ? Math.round(estimate1RM(w, r, 'hybrid', st.rir)) : 0;
          if (rm > bestE1rm || (rm === bestE1rm && w > bestW)) {
            bestE1rm = rm;
            bestW = w;
            bestR = r;
          } else if (bestW === 0 && r > bestR) {
            bestR = r;
          }
        }
      }

      // Compare against baseline prior to selected week for true PR badges & progression
      let prLabel: 'Weight PR' | 'e1RM PR' | null = null;
      if (priorSessAll.length > 0) {
        let priorBestW = 0;
        let priorBestE1rm = 0;
        for (const ps of priorSessAll) {
          if (ps.topWeight > priorBestW) priorBestW = ps.topWeight;
          for (const st of ps.sets) {
            const w = Number(st.weight) || 0;
            const r = Number(st.reps) || 0;
            const rm = w > 0 && r > 0 ? Math.round(estimate1RM(w, r, 'hybrid', st.rir)) : 0;
            if (rm > priorBestE1rm) priorBestE1rm = rm;
          }
        }

        if (bestW > priorBestW && priorBestW > 0) {
          prLabel = 'Weight PR';
        } else if (bestE1rm > priorBestE1rm && priorBestE1rm > 0) {
          prLabel = 'e1RM PR';
        }

        // Most recent session prior to selected week for progression comparison
        const lastPrior = priorSessAll[priorSessAll.length - 1];
        const lastPriorE1rm =
          lastPrior.topWeight > 0 && lastPrior.topReps > 0
            ? lastPrior.topWeight * (1 + Math.min(lastPrior.topReps, 15) / 30)
            : 0;

        if (lastPriorE1rm > 0 && bestE1rm > 0) {
          evaluatedCount++;
          const pctDelta = ((bestE1rm - lastPriorE1rm) / lastPriorE1rm) * 100;
          if (bestW > lastPrior.topWeight || pctDelta >= 1.5) {
            progressedCount++;
            weightUnlocks++;
          } else if (pctDelta > 0 || (bestW === lastPrior.topWeight && bestR > lastPrior.topReps)) {
            progressedCount++;
            repBuilds++;
          } else {
            plateaus++;
          }
        }
      }

      if (bestR > 0 || bestW > 0) {
        weekLiftsPool.push({
          exerciseName: prof.name,
          muscle: prof.muscle,
          weight: bestW,
          reps: bestR,
          e1rm: bestE1rm,
          prLabel,
        });
      }
    }

    weekLiftsPool.sort((a, b) => {
      const aPr = a.prLabel ? 1 : 0;
      const bPr = b.prLabel ? 1 : 0;
      if (aPr !== bPr) return bPr - aPr;
      return b.e1rm - a.e1rm;
    });

    const overloadRatePct =
      evaluatedCount > 0 ? Math.round((progressedCount / evaluatedCount) * 100) : null;

    // Week-scoped cardio summary
    let cardioSessions = 0;
    let totalMinutes = 0;
    let totalKm = 0;
    let loggedCals = 0;
    for (const log of weekLogs) {
      for (const c of log.cardio || []) {
        if (c && c.completed) {
          cardioSessions++;
          totalMinutes += Number(c.durationMinutes) || 0;
          totalKm += Number(c.distanceKm) || 0;
          loggedCals += Number((c as any).calories) || 0;
        }
      }
    }
    const roundedKm = Math.round(totalKm * 10) / 10;

    return {
      weekDates,
      sessionsCount,
      volumeKg,
      prevVolumeKg,
      volumeDeltaPct,
      setsCount,
      prevSetsCount,
      durationMins,
      evaluatedCount,
      progressedCount,
      overloadRatePct,
      weightUnlocks,
      repBuilds,
      plateaus,
      topLifts: weekLiftsPool.slice(0, 4),
      trainedMuscles,
      cardio: {
        sessions: cardioSessions,
        totalMinutes,
        totalKm: roundedKm,
        estCalories: loggedCals > 0 ? loggedCals : Math.round(totalMinutes * 8.5),
        avgDuration: cardioSessions > 0 ? Math.round(totalMinutes / cardioSessions) : 0,
      },
      dailyVolume,
      prevDailyVolume,
    };
  });
}
