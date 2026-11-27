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
  isValidWorkoutSession,
} from '../utils/gymUtils';
import { computeOrGetHotCache, generateDatasetFingerprint } from '../utils/hotCacheStore';
import { dateStrOffset, todayStr, resolvePlanDay, WEEKDAY_TO_PLAN } from '../data/gymPlan';
import { parseLocalDate, toYMD } from '../utils/dateCore';
import { getWorkoutDaysInRotation } from './gymRotationService';
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
  const datasetKey = `unified_analytics_v3_${today}_${unitIsLbs ? 'lbs' : 'kg'}_${generateDatasetFingerprint(gymLogs)}`;

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

        const completedNonWarmup = rawSets.filter(s => s.completed && !s.isWarmup);
        if (completedNonWarmup.length === 0) continue;

        const exName = ex.name.trim();
        const normKey = normalizeExerciseKey(exName);
        const { canonicalGroup } = resolveExerciseTargetMuscle(exName, ex.muscle);
        const category = categorizeMuscleGroup(canonicalGroup);
        const volMultiplier = getVolumeMultiplier(exName);

        // Populate Detailed Session Diary & Exercise History Profiles in the same O(N) pass
        const detailedWorkingSets = completedNonWarmup.map((s, idx) => ({
          setNumber: s.setNumber || idx + 1,
          weight: s.weight,
          reps: s.reps,
          completed: Boolean(s.completed),
          rir: s.rir,
        }));
        let exProfileVol = 0;
        let exTopWeight = 0;
        let exTopReps = 0;
        const profileSets = detailedWorkingSets.map(ws => {
          exProfileVol += ws.weight * ws.reps * volMultiplier;
          if (ws.weight > exTopWeight || (ws.weight === exTopWeight && ws.reps > exTopReps)) {
            exTopWeight = ws.weight;
            exTopReps = ws.reps;
          }
          return {
            setNumber: ws.setNumber,
            weight: ws.weight,
            reps: ws.reps,
            rir: ws.rir,
          };
        });

        sessSets += detailedWorkingSets.length;
        sessVolume += exProfileVol;

        const setsPreview = detailedWorkingSets
          .slice(0, 3)
          .map(s => `${s.weight > 0 ? formatWeight(s.weight, unitIsLbs, 1) : 'BW'} × ${s.reps}`)
          .join(', ');
        const summaryText = `${detailedWorkingSets.length} set${detailedWorkingSets.length > 1 ? 's' : ''} (${setsPreview}${detailedWorkingSets.length > 3 ? '...' : ''})`;

        exList.push({
          name: exName,
          muscle: canonicalGroup,
          workingSets: detailedWorkingSets,
          summaryText,
        });

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
        prof.totalSessions += 1;
        prof.lastLoggedDate = log.date;
        if (exTopWeight > prof.allTimeBestWeight || (exTopWeight === prof.allTimeBestWeight && exTopReps > prof.allTimeBestReps)) {
          prof.allTimeBestWeight = exTopWeight;
          prof.allTimeBestReps = exTopReps;
        }
        if (exProfileVol > prof.allTimeBestVolume) {
          prof.allTimeBestVolume = Math.round(exProfileVol);
        }
        prof.sessions.push({
          date: log.date,
          shortDate: log.date.slice(5).replace('-', '/'),
          topWeight: exTopWeight,
          topReps: exTopReps,
          sessionVolume: Math.round(exProfileVol),
          workingSetsCount: profileSets.length,
          sets: profileSets,
        });

        const completedWorkingSets = extractWorkingSets(completedNonWarmup);
        if (completedWorkingSets.length === 0) continue;

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

      // Record daily volume and cardio for O(1) weekly trends & detailed logs
      let sessCardioMins = 0;
      let hasCardio = false;
      const cardioList: DetailedSessionLog['cardio'] = [];
      for (const c of log.cardio || []) {
        if (c && c.completed) {
          hasCardio = true;
          sessCardioMins += Number(c.durationMinutes) || 0;
          cardioList.push({
            type: c.type || 'Cardio',
            durationMinutes: c.durationMinutes ?? null,
            distanceKm: c.distanceKm ?? null,
            calories: c.calories ?? null,
          });
        }
      }
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
      const existingDateData = sessionVolumeByDate.get(log.date) || { volumeKg: 0, cardioMinutes: 0, workoutCount: 0 };
      sessionVolumeByDate.set(log.date, {
        volumeKg: existingDateData.volumeKg + sessionVolumeKg,
        cardioMinutes: existingDateData.cardioMinutes + sessCardioMins,
        workoutCount: existingDateData.workoutCount + (sessionTotalWorkingSets > 0 || hasCardio ? 1 : 0),
      });

      // Build SessionCardItem for Workout Logs
      if (sessionTotalWorkingSets > 0 || hasCardio) {
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

// ── Scoped Timeframes, Donuts, Muscle Zone Targets & Multi-Range Analytics ───

export type AnalyticsRangePreset =
  | '1w'
  | 'cycle'
  | '4w'
  | 'meso'
  | '8w'
  | '12w'
  | '6m'
  | '1y'
  | 'all'
  | 'custom';

export interface AnalyticsDateRange {
  preset: AnalyticsRangePreset;
  startDate: string;
  endDate: string;
  compareStartDate: string;
  compareEndDate: string;
  label: string;
  daySpan: number;
  isCurrentWeek?: boolean;
  canGoForward?: boolean;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatShortDateRange(startDate: string, endDate: string): string {
  const s = parseLocalDate(startDate);
  const e = parseLocalDate(endDate);
  const sMon = SHORT_MONTHS[s.getMonth()] || '';
  const eMon = SHORT_MONTHS[e.getMonth()] || '';
  if (startDate === endDate) return `${sMon} ${s.getDate()}`;
  if (s.getFullYear() !== e.getFullYear()) {
    return `${sMon} ${s.getDate()} '${String(s.getFullYear()).slice(-2)} – ${eMon} ${e.getDate()} '${String(e.getFullYear()).slice(-2)}`;
  }
  return sMon === eMon
    ? `${sMon} ${s.getDate()} – ${e.getDate()}`
    : `${sMon} ${s.getDate()} – ${eMon} ${e.getDate()}`;
}

export function diffDaysInclusive(startDate: string, endDate: string): number {
  const s = parseLocalDate(startDate);
  const e = parseLocalDate(endDate);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  return Math.max(1, diff);
}

export function getPlannedWeeklySessionCount(userGymPlan?: any | null): number {
  if (userGymPlan?.scheduleMode === 'rotation') {
    const rotCount = getWorkoutDaysInRotation(userGymPlan).length;
    return rotCount > 0 ? Math.min(7, rotCount) : 5;
  }
  let count = 0;
  for (let dayIdx = 1; dayIdx <= 7; dayIdx++) {
    const day = resolvePlanDay(userGymPlan, dayIdx);
    if (day && !day.isRest && ((day.exercises?.length ?? 0) > 0 || (day.cardio?.length ?? 0) > 0)) {
      count++;
    }
  }
  return count > 0 ? count : 5;
}

/**
 * Counts how many planned training sessions fall inside [startDate..endDate]
 * respecting exact weekday vs rest days in calendar mode and rotation cycles in rotation mode.
 */
export function countPlannedSessionsInRange(
  startDate: string,
  endDate: string,
  userGymPlan?: any | null
): number {
  const span = diffDaysInclusive(startDate, endDate);
  const weeklyCount = getPlannedWeeklySessionCount(userGymPlan);
  if (userGymPlan?.scheduleMode === 'rotation') {
    return Math.max(1, Math.round((weeklyCount * span) / 7));
  }

  let hasConfiguredTrainingDays = false;
  const plannedByDow = [0, 1, 2, 3, 4, 5, 6].map(dow => {
    const planIdx = WEEKDAY_TO_PLAN[dow] ?? 7;
    const day = resolvePlanDay(userGymPlan, planIdx);
    const active = Boolean(
      day && !day.isRest && ((day.exercises?.length ?? 0) > 0 || (day.cardio?.length ?? 0) > 0)
    );
    if (active) hasConfiguredTrainingDays = true;
    return active;
  });

  if (!hasConfiguredTrainingDays) {
    return Math.max(1, Math.round((weeklyCount * span) / 7));
  }

  const fullWeeks = Math.floor(span / 7);
  const rem = span % 7;
  let total = fullWeeks * weeklyCount;
  if (rem > 0) {
    const startDt = parseLocalDate(startDate);
    for (let i = 0; i < rem; i++) {
      const dow = (startDt.getDay() + i) % 7;
      if (plannedByDow[dow]) total++;
    }
  }
  return Math.max(1, total);
}

function getMondayForDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const dow = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((dow + 6) % 7));
  return toYMD(monday);
}

export function buildAnalyticsDateRange(
  preset: AnalyticsRangePreset,
  options?: {
    anchorDate?: string;
    cycleOffset?: number;
    customStart?: string;
    customEnd?: string;
    userGymPlan?: any | null;
    gymLogs?: GymDayLog[];
  }
): AnalyticsDateRange {
  const today = todayStr();
  const anchor = options?.anchorDate || today;
  const currentMonday = getMondayForDate(today);
  const clampEnd = (dStr: string) => (dStr > today ? today : dStr);

  let startDate = currentMonday;
  let endDate = dateStrOffset(6, currentMonday);
  let label = formatShortDateRange(startDate, endDate);
  let isCurrentWeek = false;
  let canGoForward = false;

  if (preset === '1w') {
    startDate = getMondayForDate(anchor);
    endDate = dateStrOffset(6, startDate);
    isCurrentWeek = startDate === currentMonday;
    canGoForward = !isCurrentWeek;
    label = formatShortDateRange(startDate, endDate);
  } else if (preset === 'cycle') {
    const rotationDays = getWorkoutDaysInRotation(options?.userGymPlan || null);
    const cycleWorkoutsCount = Math.max(2, rotationDays.length || 4);
    const offset = Math.max(0, options?.cycleOffset ?? 0);
    const sortedWorkoutDates = Array.from(
      new Set(
        (options?.gymLogs || [])
          .filter(isValidWorkoutSession)
          .map(l => String(l.date).slice(0, 10))
          .filter(Boolean)
      )
    ).sort((a, b) => b.localeCompare(a));

    const endIdx = offset * cycleWorkoutsCount;
    const startIdx = endIdx + cycleWorkoutsCount - 1;
    if (sortedWorkoutDates[startIdx]) {
      endDate = offset === 0 ? today : sortedWorkoutDates[endIdx];
      startDate = sortedWorkoutDates[startIdx];
    } else {
      const approxDays = Math.max(6, cycleWorkoutsCount + 2);
      endDate = offset === 0 ? today : dateStrOffset(-(offset * approxDays), today);
      startDate = dateStrOffset(-(approxDays - 1), endDate);
    }
    if (startDate > endDate) {
      const tmp = startDate;
      startDate = endDate;
      endDate = tmp;
    }
    isCurrentWeek = offset === 0;
    canGoForward = offset > 0;
    label = `Cycle · ${formatShortDateRange(startDate, endDate)}`;
  } else if (preset === '4w') {
    endDate = today;
    startDate = dateStrOffset(-27, endDate);
    label = `Last 4 Weeks`;
  } else if (preset === 'meso') {
    const prog = options?.userGymPlan?.activeProgramme;
    const rawStart = prog?.startDate ? String(prog.startDate).slice(0, 10) : dateStrOffset(-27, today);
    startDate = rawStart > today ? dateStrOffset(-27, today) : rawStart;
    endDate = today;
    label = prog?.name ? `${prog.name} (W${prog.currentWeek}/${prog.totalWeeks})` : 'Mesocycle';
  } else if (preset === '8w' || preset === '12w' || preset === '6m' || preset === '1y') {
    const weeks = preset === '8w' ? 8 : preset === '12w' ? 12 : preset === '6m' ? 26 : 52;
    endDate = today;
    startDate = dateStrOffset(-((weeks - 1) * 7), currentMonday);
    label =
      preset === '8w'
        ? 'Last 8 Weeks'
        : preset === '12w'
        ? 'Last 12 Weeks'
        : preset === '6m'
        ? 'Last 6 Months'
        : 'Last 12 Months';
  } else if (preset === 'all') {
    const dates = (options?.gymLogs || [])
      .map(l => String(l?.date || '').slice(0, 10))
      .filter(Boolean)
      .sort();
    endDate = today;
    startDate = dates[0] && dates[0] <= today ? dates[0] : dateStrOffset(-89, today);
    label = 'All Time';
  } else {
    const rawS = options?.customStart ? clampEnd(options.customStart.slice(0, 10)) : dateStrOffset(-13, today);
    const rawE = options?.customEnd ? clampEnd(options.customEnd.slice(0, 10)) : today;
    startDate = rawS <= rawE ? rawS : rawE;
    endDate = rawS <= rawE ? rawE : rawS;
    label = formatShortDateRange(startDate, endDate);
  }

  const daySpan = diffDaysInclusive(startDate, endDate);
  const compareEndDate = dateStrOffset(-1, startDate);
  const compareStartDate = dateStrOffset(-(daySpan - 1), compareEndDate);

  return {
    preset,
    startDate,
    endDate,
    compareStartDate,
    compareEndDate,
    label,
    daySpan,
    isCurrentWeek,
    canGoForward,
  };
}

export interface MuscleTargetZoneRow {
  muscle: string;
  directSets: number;
  synergistSets: number;
  effectiveSets: number;
  weeklyAvgEffective: number;
  mev: number;
  mrv: number;
  weeklyTarget: number;
  status: 'low' | 'optimal' | 'high';
  pctOfTotal: number;
}

export interface PeriodTrendBucket {
  label: string;
  fullLabel: string;
  startDate: string;
  endDate: string;
  volumeKg: number;
  prevVolumeKg: number;
  setsCount: number;
  prevSetsCount: number;
}

export interface PeriodScopedSummary {
  range: AnalyticsDateRange;
  sessionsCount: number;
  plannedSessionsInPeriod: number;
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
  plateauedLifts: Array<{
    exerciseName: string;
    muscle: string;
    lastWeight: number;
    lastReps: number;
  }>;
  splitDistribution: {
    pushSets: number;
    pullSets: number;
    legSets: number;
    armCoreSets: number;
    totalSets: number;
    pushPullRatio: number | null;
    slices: Array<{
      id: 'push' | 'pull' | 'legs' | 'core';
      label: string;
      value: number;
      pct: number;
    }>;
  };
  effortDistribution: {
    hardSets01: number;
    growthSets23: number;
    lightSets4Plus: number;
    unloggedSets: number;
    optimalPct: number | null;
    loggedSets: number;
  };
  repZoneDistribution: {
    strength1to5: number;
    hypertrophy6to12: number;
    endurance13Plus: number;
    totalSets: number;
  };
  muscleVolumes: MuscleTargetZoneRow[];
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
    avgPaceMinKm: number;
    avgSpeedKmh: number;
    modalities: Array<{ type: string; minutes: number; sessions: number; pct: number }>;
  };
  dailyVolume: number[];
  prevDailyVolume: number[];
  bucketSeries: PeriodTrendBucket[];
  sessionsWithDelta: Array<{
    session: DetailedSessionLog;
    vsPrevSameSplitPct: number | null;
  }>;
}

const MUSCLE_MEV_MRV: Record<string, { mev: number; mrv: number; target: number }> = {
  Chest: { mev: 8, mrv: 20, target: 14 },
  Back: { mev: 8, mrv: 22, target: 16 },
  Shoulders: { mev: 6, mrv: 20, target: 14 },
  Quads: { mev: 6, mrv: 18, target: 12 },
  'Glutes & Hams': { mev: 6, mrv: 18, target: 12 },
  Arms: { mev: 6, mrv: 20, target: 14 },
  Core: { mev: 4, mrv: 16, target: 8 },
};

function mapCanonicalToZoneMuscle(canonical: string): string {
  if (canonical === 'Chest') return 'Chest';
  if (['Back', 'Lats', 'Traps'].includes(canonical)) return 'Back';
  if (canonical === 'Shoulders') return 'Shoulders';
  if (canonical === 'Quads') return 'Quads';
  if (['Hamstrings', 'Glutes', 'Glutes/Abductors'].includes(canonical)) return 'Glutes & Hams';
  if (['Arms', 'Biceps', 'Triceps', 'Forearms'].includes(canonical)) return 'Arms';
  if (canonical === 'Abs' || canonical === 'Calves') return canonical === 'Abs' ? 'Core' : 'Glutes & Hams';
  return 'Other';
}

export function computePeriodScopedSummary(
  gymLogs: GymDayLog[],
  analyticsData: UnifiedAnalyticsData,
  range: AnalyticsDateRange,
  userGymPlan?: any | null
): PeriodScopedSummary {
  const planSig = userGymPlan ? `${userGymPlan.scheduleMode || 'c'}_${userGymPlan.updatedAt || 0}` : 'def';
  const cacheKey = `period_scoped_v2_${range.preset}_${range.startDate}_${range.endDate}_${planSig}_${generateDatasetFingerprint(gymLogs)}`;

  return computeOrGetHotCache(cacheKey, () => {
    const safeLogs = gymLogs || [];
    const { startDate, endDate, compareStartDate, compareEndDate, daySpan } = range;

    const inPeriod = (d?: string) => {
      const ds = d ? String(d).slice(0, 10) : '';
      return Boolean(ds && ds >= startDate && ds <= endDate);
    };
    const inCompare = (d?: string) => {
      const ds = d ? String(d).slice(0, 10) : '';
      return Boolean(ds && ds >= compareStartDate && ds <= compareEndDate);
    };

    const periodLogs = safeLogs.filter(l => inPeriod(l?.date));
    const compareLogs = safeLogs.filter(l => inCompare(l?.date));
    const periodDetailed = analyticsData.detailedLogs.filter(s => inPeriod(s.date));
    const compareDetailed = analyticsData.detailedLogs.filter(s => inCompare(s.date));

    const sessionsCount = periodDetailed.length;
    const weeklyTargetSessions = getPlannedWeeklySessionCount(userGymPlan);
    const periodWeeks = Math.max(1, daySpan / 7);
    const plannedSessionsInPeriod =
      daySpan <= 8 && (range.preset === '1w' || range.preset === 'cycle')
        ? weeklyTargetSessions
        : countPlannedSessionsInRange(startDate, endDate, userGymPlan);

    const volumeKg = periodDetailed.reduce((sum, s) => sum + s.totalVolumeKg, 0);
    const prevVolumeKg = compareDetailed.reduce((sum, s) => sum + s.totalVolumeKg, 0);
    const setsCount = periodDetailed.reduce((sum, s) => sum + s.totalSets, 0);
    const prevSetsCount = compareDetailed.reduce((sum, s) => sum + s.totalSets, 0);
    const volumeDeltaPct =
      prevVolumeKg > 0 ? Math.round(((volumeKg - prevVolumeKg) / prevVolumeKg) * 1000) / 10 : null;

    const durationMins = periodDetailed.reduce((sum, s) => {
      const raw = s.durationMinutes || 0;
      const sane = raw > 180 ? Math.min(Math.max((s.totalSets || 0) * 3.5, 20), 90) : raw;
      return sum + Math.round(sane);
    }, 0);

    // Build daily map across period and comparison period
    const dailyVolMap = new Map<string, number>();
    const dailySetsMap = new Map<string, number>();
    for (const d of periodDetailed) {
      const k = d.date.slice(0, 10);
      dailyVolMap.set(k, (dailyVolMap.get(k) || 0) + d.totalVolumeKg);
      dailySetsMap.set(k, (dailySetsMap.get(k) || 0) + d.totalSets);
    }
    const compDailyVolMap = new Map<string, number>();
    const compDailySetsMap = new Map<string, number>();
    for (const d of compareDetailed) {
      const k = d.date.slice(0, 10);
      compDailyVolMap.set(k, (compDailyVolMap.get(k) || 0) + d.totalVolumeKg);
      compDailySetsMap.set(k, (compDailySetsMap.get(k) || 0) + d.totalSets);
    }

    const dailyVolume: number[] = [];
    const prevDailyVolume: number[] = [];
    for (let i = 0; i < Math.min(daySpan, 7); i++) {
      dailyVolume.push(dailyVolMap.get(dateStrOffset(i, startDate)) || 0);
      prevDailyVolume.push(compDailyVolMap.get(dateStrOffset(i, compareStartDate)) || 0);
    }

    // Dynamic Trend Buckets for multi-day or multi-week charts
    const bucketSize = daySpan <= 10 ? 1 : daySpan <= 28 ? 3 : 7;
    const bucketSeries: PeriodTrendBucket[] = [];
    const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let offset = 0; offset < daySpan; offset += bucketSize) {
      const bStart = dateStrOffset(offset, startDate);
      const bLen = Math.min(bucketSize, daySpan - offset);
      const bEnd = dateStrOffset(bLen - 1, bStart);
      const cStart = dateStrOffset(offset, compareStartDate);

      let bVol = 0;
      let bPrevVol = 0;
      let bSets = 0;
      let bPrevSets = 0;
      for (let d = 0; d < bLen; d++) {
        const curKey = dateStrOffset(d, bStart);
        const cmpKey = dateStrOffset(d, cStart);
        bVol += dailyVolMap.get(curKey) || 0;
        bPrevVol += compDailyVolMap.get(cmpKey) || 0;
        bSets += dailySetsMap.get(curKey) || 0;
        bPrevSets += compDailySetsMap.get(cmpKey) || 0;
      }

      const dt = parseLocalDate(bStart);
      const label =
        bucketSize === 1
          ? SHORT_DAYS[dt.getDay()] || bStart.slice(5)
          : `${SHORT_MONTHS[dt.getMonth()]} ${dt.getDate()}`;
      const fullLabel = bucketSize === 1 ? formatIndianDatePretty(bStart) : formatShortDateRange(bStart, bEnd);
      bucketSeries.push({
        label,
        fullLabel,
        startDate: bStart,
        endDate: bEnd,
        volumeKg: Math.round(bVol),
        prevVolumeKg: Math.round(bPrevVol),
        setsCount: bSets,
        prevSetsCount: bPrevSets,
      });
    }

    // Split balance, Effort RIR, Rep-Zone Stimulus, & Direct/Synergist Muscle Sets
    let pushSets = 0;
    let pullSets = 0;
    let legSets = 0;
    let armCoreSets = 0;

    let hardSets01 = 0;
    let growthSets23 = 0;
    let lightSets4Plus = 0;
    let unloggedSets = 0;

    let strength1to5 = 0;
    let hypertrophy6to12 = 0;
    let endurance13Plus = 0;

    const directByZone: Record<string, number> = {};
    const synByZone: Record<string, number> = {};
    const legacyMuscleSets: Record<string, number> = {};

    for (const log of periodLogs) {
      for (const ex of log.exercises || []) {
        if (ex.skipped) continue;
        const completed = (ex.setsLog || []).filter(
          s => s && s.completed && !s.isWarmup && s.setType !== 'warmup'
        );
        if (completed.length === 0) continue;

        const resolved = resolveExerciseTargetMuscle(ex.name, ex.muscle);
        const canonical =
          resolved.canonicalGroup && resolved.canonicalGroup !== 'Mixed'
            ? resolved.canonicalGroup
            : 'Other';
        legacyMuscleSets[canonical] = (legacyMuscleSets[canonical] || 0) + completed.length;

        const zoneMuscle = mapCanonicalToZoneMuscle(canonical);
        directByZone[zoneMuscle] = (directByZone[zoneMuscle] || 0) + completed.length;

        const isCompoundPress = /\b(press|bench|push-?up|dip)\b/i.test(ex.name);
        const isCompoundPull = /\b(row|pull-?up|chin-?up|pulldown|deadlift)\b/i.test(ex.name);
        const isCompoundLeg = /\b(squat|press|lunge|split squat|hack|thrust|deadlift)\b/i.test(ex.name);

        if (canonical === 'Chest' && isCompoundPress) {
          synByZone.Shoulders = (synByZone.Shoulders || 0) + completed.length * 0.5;
          synByZone.Arms = (synByZone.Arms || 0) + completed.length * 0.5;
        } else if (['Back', 'Lats', 'Traps'].includes(canonical) && isCompoundPull) {
          synByZone.Arms = (synByZone.Arms || 0) + completed.length * 0.5;
        } else if (canonical === 'Quads' && isCompoundLeg) {
          synByZone['Glutes & Hams'] = (synByZone['Glutes & Hams'] || 0) + completed.length * 0.3;
        } else if (canonical === 'Shoulders' && isCompoundPress) {
          synByZone.Arms = (synByZone.Arms || 0) + completed.length * 0.3;
        }

        const cat = categorizeMuscleGroup(canonical);
        if (cat === 'Push') pushSets += completed.length;
        else if (cat === 'Pull') pullSets += completed.length;
        else if (cat === 'Legs') legSets += completed.length;
        else armCoreSets += completed.length;

        for (const st of completed) {
          const rirVal = (st as any).rir;
          if (typeof rirVal === 'number' && Number.isFinite(rirVal)) {
            if (rirVal <= 1) hardSets01++;
            else if (rirVal <= 3) growthSets23++;
            else lightSets4Plus++;
          } else {
            unloggedSets++;
          }

          const reps = Number(st.reps) || 0;
          if (reps > 0) {
            if (reps <= 5) strength1to5++;
            else if (reps <= 12) hypertrophy6to12++;
            else endurance13Plus++;
          }
        }
      }
    }

    const totalSplitSets = pushSets + pullSets + legSets + armCoreSets;
    const splitSlices: PeriodScopedSummary['splitDistribution']['slices'] = [
      {
        id: 'push',
        label: 'Push',
        value: pushSets,
        pct: totalSplitSets > 0 ? Math.round((pushSets / totalSplitSets) * 100) : 0,
      },
      {
        id: 'pull',
        label: 'Pull',
        value: pullSets,
        pct: totalSplitSets > 0 ? Math.round((pullSets / totalSplitSets) * 100) : 0,
      },
      {
        id: 'legs',
        label: 'Legs',
        value: legSets,
        pct: totalSplitSets > 0 ? Math.round((legSets / totalSplitSets) * 100) : 0,
      },
      {
        id: 'core',
        label: 'Arms & Core',
        value: armCoreSets,
        pct: totalSplitSets > 0 ? Math.round((armCoreSets / totalSplitSets) * 100) : 0,
      },
    ];
    const pushPullRatio =
      pullSets > 0 ? Math.round((pushSets / pullSets) * 10) / 10 : pushSets > 0 ? 9.9 : null;

    const loggedRirSets = hardSets01 + growthSets23 + lightSets4Plus;
    const optimalRirSets = hardSets01 + growthSets23; // 0-3 RIR stimulating
    const optimalPct = loggedRirSets > 0 ? Math.round((optimalRirSets / loggedRirSets) * 100) : null;

    const zoneKeys = Array.from(
      new Set([...Object.keys(MUSCLE_MEV_MRV), ...Object.keys(directByZone)])
    ).filter(k => k !== 'Other');
    const totalEffectiveSum = zoneKeys.reduce(
      (sum, m) => sum + (directByZone[m] || 0) + (synByZone[m] || 0),
      0
    );

    const muscleVolumes: MuscleTargetZoneRow[] = zoneKeys
      .map(m => {
        const directSets = directByZone[m] || 0;
        const synergistSets = Math.round((synByZone[m] || 0) * 10) / 10;
        const effectiveSets = Math.round((directSets + synergistSets) * 10) / 10;
        const weeklyAvgEffective = Math.round((effectiveSets / periodWeeks) * 10) / 10;
        const cfg = MUSCLE_MEV_MRV[m] || { mev: 6, mrv: 18, target: 12 };
        let status: 'low' | 'optimal' | 'high' = 'optimal';
        if (weeklyAvgEffective < cfg.mev) status = 'low';
        else if (weeklyAvgEffective > cfg.mrv) status = 'high';
        return {
          muscle: m,
          directSets,
          synergistSets,
          effectiveSets,
          weeklyAvgEffective,
          mev: cfg.mev,
          mrv: cfg.mrv,
          weeklyTarget: cfg.target,
          status,
          pctOfTotal: totalEffectiveSum > 0 ? Math.round((effectiveSets / totalEffectiveSum) * 100) : 0,
        };
      })
      .filter(row => row.effectiveSets > 0)
      .sort((a, b) => b.effectiveSets - a.effectiveSets);

    const totalLegacySets = Object.values(legacyMuscleSets).reduce((a, b) => a + b, 0);
    const trainedMuscles = Object.entries(legacyMuscleSets)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([muscle, sets]) => ({
        muscle,
        sets,
        pctOfTotal: totalLegacySets > 0 ? Math.round((sets / totalLegacySets) * 100) : 0,
      }));

    // Scoped Overload Progression & PR Unlocks + Plateaued Lifts
    let evaluatedCount = 0;
    let progressedCount = 0;
    let weightUnlocks = 0;
    let repBuilds = 0;
    let plateaus = 0;
    const periodLiftsPool: WeekScopedTopLift[] = [];
    const plateauedLifts: PeriodScopedSummary['plateauedLifts'] = [];

    for (const prof of analyticsData.exerciseProfiles) {
      const thisPeriodSess = prof.sessions.filter(s => inPeriod(s.date));
      if (thisPeriodSess.length === 0) continue;

      const priorSessAll = prof.sessions.filter(s => s.date.slice(0, 10) < startDate);

      let bestW = 0;
      let bestR = 0;
      let bestE1rm = 0;
      for (const sess of thisPeriodSess) {
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

        const lastPrior = priorSessAll[priorSessAll.length - 1];
        const lastPriorE1rm =
          lastPrior.topWeight > 0 && lastPrior.topReps > 0
            ? estimate1RM(lastPrior.topWeight, lastPrior.topReps, 'hybrid')
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
            if (prof.progressionStatus.status === 'stalled') {
              plateauedLifts.push({
                exerciseName: prof.name,
                muscle: prof.muscle,
                lastWeight: bestW,
                lastReps: bestR,
              });
            }
          }
        }
      } else if (thisPeriodSess.length >= 2) {
        // Inside multi-week or All-Time ranges where the baseline started in-range,
        // compare latest in-range session against the earliest baseline session in range.
        const firstInPeriod = thisPeriodSess[0];
        const latestInPeriod = thisPeriodSess[thisPeriodSess.length - 1];
        const firstE1rm =
          firstInPeriod.topWeight > 0 && firstInPeriod.topReps > 0
            ? estimate1RM(firstInPeriod.topWeight, firstInPeriod.topReps, 'hybrid')
            : 0;
        const latestE1rm =
          latestInPeriod.topWeight > 0 && latestInPeriod.topReps > 0
            ? estimate1RM(latestInPeriod.topWeight, latestInPeriod.topReps, 'hybrid')
            : 0;
        if (firstE1rm > 0 && latestE1rm > 0) {
          evaluatedCount++;
          const pctDelta = ((latestE1rm - firstE1rm) / firstE1rm) * 100;
          if (latestInPeriod.topWeight > firstInPeriod.topWeight || pctDelta >= 1.5) {
            progressedCount++;
            weightUnlocks++;
          } else if (
            pctDelta > 0 ||
            (latestInPeriod.topWeight === firstInPeriod.topWeight &&
              latestInPeriod.topReps > firstInPeriod.topReps)
          ) {
            progressedCount++;
            repBuilds++;
          } else {
            plateaus++;
          }
        }
      }

      if (bestR > 0 || bestW > 0) {
        periodLiftsPool.push({
          exerciseName: prof.name,
          muscle: prof.muscle,
          weight: bestW,
          reps: bestR,
          e1rm: bestE1rm,
          prLabel,
        });
      }
    }

    periodLiftsPool.sort((a, b) => {
      const aPr = a.prLabel ? 1 : 0;
      const bPr = b.prLabel ? 1 : 0;
      if (aPr !== bPr) return bPr - aPr;
      return b.e1rm - a.e1rm;
    });

    const overloadRatePct =
      evaluatedCount > 0 ? Math.round((progressedCount / evaluatedCount) * 100) : null;

    // Cardio breakdown & modality percentages
    let cardioSessions = 0;
    let totalMinutes = 0;
    let totalKm = 0;
    let loggedCals = 0;
    const modalityMap = new Map<string, { minutes: number; sessions: number }>();

    for (const log of periodLogs) {
      for (const c of log.cardio || []) {
        if (c && c.completed) {
          cardioSessions++;
          const mins = Number(c.durationMinutes) || 0;
          totalMinutes += mins;
          totalKm += Number(c.distanceKm) || 0;
          loggedCals += Number((c as any).calories) || 0;
          const mName = (c.type || 'Cardio').trim() || 'Cardio';
          const prevMod = modalityMap.get(mName) || { minutes: 0, sessions: 0 };
          modalityMap.set(mName, { minutes: prevMod.minutes + mins, sessions: prevMod.sessions + 1 });
        }
      }
    }
    const roundedKm = Math.round(totalKm * 10) / 10;
    const avgPaceMinKm = roundedKm > 0 && totalMinutes > 0 ? Math.round((totalMinutes / roundedKm) * 10) / 10 : 0;
    const avgSpeedKmh = totalMinutes > 0 && roundedKm > 0 ? Math.round((roundedKm / (totalMinutes / 60)) * 10) / 10 : 0;
    const modalities = Array.from(modalityMap.entries())
      .map(([type, v]) => ({
        type,
        minutes: Math.round(v.minutes),
        sessions: v.sessions,
        pct: totalMinutes > 0 ? Math.round((v.minutes / totalMinutes) * 100) : Math.round((v.sessions / Math.max(1, cardioSessions)) * 100),
      }))
      .sort((a, b) => b.minutes - a.minutes);

    // Session-over-Session Split Delta (compares each completed session vs the most recent prior session of same splitTag)
    const sessionsWithDelta = periodDetailed.map(sess => {
      const priorSameSplit = analyticsData.detailedLogs.find(
        cand => cand.date < sess.date && cand.splitTag === sess.splitTag && cand.totalVolumeKg > 0
      );
      const vsPrevSameSplitPct =
        priorSameSplit && priorSameSplit.totalVolumeKg > 0
          ? Math.round(((sess.totalVolumeKg - priorSameSplit.totalVolumeKg) / priorSameSplit.totalVolumeKg) * 1000) / 10
          : null;
      return { session: sess, vsPrevSameSplitPct };
    });

    return {
      range,
      sessionsCount,
      plannedSessionsInPeriod,
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
      topLifts: periodLiftsPool.slice(0, 6),
      plateauedLifts: plateauedLifts.slice(0, 4),
      splitDistribution: {
        pushSets,
        pullSets,
        legSets,
        armCoreSets,
        totalSets: totalSplitSets,
        pushPullRatio,
        slices: splitSlices,
      },
      effortDistribution: {
        hardSets01,
        growthSets23,
        lightSets4Plus,
        unloggedSets,
        optimalPct,
        loggedSets: loggedRirSets,
      },
      repZoneDistribution: {
        strength1to5,
        hypertrophy6to12,
        endurance13Plus,
        totalSets: strength1to5 + hypertrophy6to12 + endurance13Plus,
      },
      muscleVolumes,
      trainedMuscles,
      cardio: {
        sessions: cardioSessions,
        totalMinutes: Math.round(totalMinutes),
        totalKm: roundedKm,
        estCalories: loggedCals > 0 ? Math.round(loggedCals) : Math.round(totalMinutes * 8.5),
        avgDuration: cardioSessions > 0 ? Math.round(totalMinutes / cardioSessions) : 0,
        avgPaceMinKm,
        avgSpeedKmh,
        modalities,
      },
      dailyVolume,
      prevDailyVolume,
      bucketSeries,
      sessionsWithDelta,
    };
  });
}

export interface ConsistencyWeekBucket extends WeeklyTrendItem {
  movingAvgVolKg: number;
  setsCount: number;
  cardioDistanceKm: number;
}

export interface ScopedConsistencySummary {
  range: AnalyticsDateRange;
  sessionsInRange: number;
  plannedSessionsInRange: number;
  streakDays: number;
  longestStreakDays: number;
  adherenceRatePct: number;
  plannedWeeklySessions: number;
  weeksOnTargetCount: number;
  totalWeeksCount: number;
  avgWorkoutsPerWeek: number;
  weeklyBuckets: ConsistencyWeekBucket[];
  weekdayFrequency: Array<{
    dayIndex: number;
    shortLabel: string;
    count: number;
    pctOfMax: number;
    planned: boolean;
  }>;
  cardioPeriod: {
    totalMinutes: number;
    totalKm: number;
    sessions: number;
    avgMinsPerWeek: number;
  };
}

/**
 * Computes BOTH the ending/active streak and longest streak strictly within [startDate..endDate],
 * respecting planned rest days (calendar or rotation mode) and 1 grace day per 7 days.
 */
export function computeRangeStreakMetrics(
  gymLogs: GymDayLog[],
  startDate: string,
  endDate: string,
  userGymPlan?: any | null
): { streakDays: number; longestStreakDays: number } {
  const today = todayStr();
  const effectiveEnd = endDate > today ? today : endDate;
  if (effectiveEnd < startDate) return { streakDays: 0, longestStreakDays: 0 };

  const validDates = Array.from(
    new Set(
      (gymLogs || [])
        .filter(isValidWorkoutSession)
        .map(l => String(l?.date || '').slice(0, 10))
        .filter(ds => Boolean(ds && ds >= startDate && ds <= effectiveEnd))
    )
  ).sort();
  if (validDates.length === 0) return { streakDays: 0, longestStreakDays: 0 };

  const dateSet = new Set(validDates);
  const isRotation = userGymPlan?.scheduleMode === 'rotation';
  const restByDow = [0, 1, 2, 3, 4, 5, 6].map(dow => {
    const planIdx = WEEKDAY_TO_PLAN[dow] ?? 7;
    return resolvePlanDay(userGymPlan, planIdx)?.isRest === true;
  });

  // 1. Longest consecutive training streak within [startDate..effectiveEnd]
  const first = parseLocalDate(validDates[0]);
  const last = parseLocalDate(validDates[validDates.length - 1]);
  const walkDays = Math.min(1825, diffDaysInclusive(toYMD(first), toYMD(last)));

  let best = 1;
  let cur = 0;
  let gapRest = 0;
  let graceUsed = 0;
  let daysSinceGrace = 0;

  for (let i = 0; i < walkDays; i++) {
    const d = new Date(first);
    d.setDate(first.getDate() + i);
    const dStr = toYMD(d);
    daysSinceGrace++;
    if (daysSinceGrace >= 7) graceUsed = 0;

    if (dateSet.has(dStr)) {
      cur++;
      gapRest = 0;
      if (cur > best) best = cur;
    } else if (isRotation) {
      gapRest++;
      if (gapRest > 2) cur = 0;
    } else if (restByDow[d.getDay()]) {
      gapRest = 0;
    } else if (graceUsed < 1 && cur > 0) {
      graceUsed++;
      daysSinceGrace = 0;
    } else {
      cur = 0;
      graceUsed = 0;
    }
  }

  // 2. Ending / active streak inside [startDate..effectiveEnd] walking backwards from effectiveEnd
  let activeStreak = 0;
  let backRestGap = 0;
  let backGraceUsed = 0;
  const maxBackDays = Math.min(1825, diffDaysInclusive(startDate, effectiveEnd));
  const endDt = parseLocalDate(effectiveEnd);

  for (let i = 0; i < maxBackDays; i++) {
    const d = new Date(endDt);
    d.setDate(endDt.getDate() - i);
    const dStr = toYMD(d);
    if (dStr < startDate) break;

    if (dateSet.has(dStr)) {
      activeStreak++;
      backRestGap = 0;
    } else if (i === 0 && effectiveEnd === today) {
      // Today is still in progress: don't reset streak yet if user hasn't finished today's session
      continue;
    } else if (isRotation) {
      backRestGap++;
      if (backRestGap > 2) break;
    } else if (restByDow[d.getDay()]) {
      continue;
    } else if (backGraceUsed < 1) {
      backGraceUsed++;
    } else {
      break;
    }
  }

  return {
    streakDays: activeStreak,
    longestStreakDays: Math.max(activeStreak, best),
  };
}

export function computeLongestStreakDays(gymLogs: GymDayLog[], userGymPlan?: any | null): number {
  const validDates = Array.from(
    new Set(
      (gymLogs || [])
        .filter(isValidWorkoutSession)
        .map(l => String(l?.date || '').slice(0, 10))
        .filter(Boolean)
    )
  ).sort();
  if (validDates.length === 0) return 0;
  return computeRangeStreakMetrics(gymLogs, validDates[0], validDates[validDates.length - 1], userGymPlan)
    .longestStreakDays;
}

export function computeScopedConsistency(
  analyticsData: UnifiedAnalyticsData,
  gymLogs: GymDayLog[],
  range: AnalyticsDateRange,
  userGymPlan?: any | null
): ScopedConsistencySummary {
  const planSig = userGymPlan ? `${userGymPlan.scheduleMode || 'c'}_${userGymPlan.updatedAt || 0}` : 'def';
  const cacheKey = `consistency_v2_${range.preset}_${range.startDate}_${range.endDate}_${planSig}_${generateDatasetFingerprint(gymLogs)}`;

  return computeOrGetHotCache(cacheKey, () => {
    const safeLogs = gymLogs || [];
    const plannedWeeklySessions = getPlannedWeeklySessionCount(userGymPlan);
    const isRotation = userGymPlan?.scheduleMode === 'rotation';

    const dayVolumeMap = new Map<string, { volumeKg: number; sets: number; workout: number; cardioMins: number; cardioDist: number; cardioSess: number }>();
    for (const s of analyticsData.detailedLogs) {
      const dKey = s.date.slice(0, 10);
      if (dKey < range.startDate || dKey > range.endDate) continue;
      const prev = dayVolumeMap.get(dKey) || { volumeKg: 0, sets: 0, workout: 0, cardioMins: 0, cardioDist: 0, cardioSess: 0 };
      let cDist = 0;
      let cMins = 0;
      let cSess = 0;
      for (const c of s.cardio || []) {
        cSess++;
        cMins += Number(c.durationMinutes) || 0;
        cDist += Number(c.distanceKm) || 0;
      }
      dayVolumeMap.set(dKey, {
        volumeKg: prev.volumeKg + s.totalVolumeKg,
        sets: prev.sets + s.totalSets,
        workout: 1,
        cardioMins: prev.cardioMins + cMins,
        cardioDist: prev.cardioDist + cDist,
        cardioSess: prev.cardioSess + cSess,
      });
    }

    // Build Mon-Sun week buckets clamped strictly inside [range.startDate..range.endDate]
    const startMon = getMondayForDate(range.startDate);
    const endMon = getMondayForDate(range.endDate);
    const curMon = getMondayForDate(todayStr());

    const rawBuckets: Array<WeeklyTrendItem & { setsCount: number; cardioDistanceKm: number; weekTarget: number }> = [];
    let cursor = startMon;
    let guard = 0;
    while (cursor <= endMon && guard < 520) {
      guard++;
      const sun = dateStrOffset(6, cursor);
      const effStart = cursor > range.startDate ? cursor : range.startDate;
      const effEnd = sun < range.endDate ? sun : range.endDate;
      const weekTarget =
        effStart === cursor && effEnd === sun
          ? plannedWeeklySessions
          : countPlannedSessionsInRange(effStart, effEnd, userGymPlan);

      let workoutCount = 0;
      let totalVolumeKg = 0;
      let cardioMinutes = 0;
      let setsCount = 0;
      let cardioDistanceKm = 0;

      for (let i = 0; i < 7; i++) {
        const dStr = dateStrOffset(i, cursor);
        if (dStr < range.startDate || dStr > range.endDate) continue;
        const rec = dayVolumeMap.get(dStr);
        if (rec) {
          workoutCount += rec.workout;
          totalVolumeKg += rec.volumeKg;
          cardioMinutes += rec.cardioMins;
          setsCount += rec.sets;
          cardioDistanceKm += rec.cardioDist;
        }
      }
      const dt = parseLocalDate(cursor);
      const isCurrentWeek = cursor === curMon;
      rawBuckets.push({
        startMonday: cursor,
        endSunday: sun,
        weekLabel: isCurrentWeek ? 'This Wk' : `${SHORT_MONTHS[dt.getMonth()]} ${dt.getDate()}`,
        workoutCount,
        totalVolumeKg: Math.round(totalVolumeKg),
        cardioMinutes: Math.round(cardioMinutes),
        setsCount,
        cardioDistanceKm: Math.round(cardioDistanceKm * 10) / 10,
        isCurrentWeek,
        weekTarget,
      });
      cursor = dateStrOffset(7, cursor);
    }

    // 4-week trailing moving average for smooth trend overlay
    const weeklyBuckets: ConsistencyWeekBucket[] = rawBuckets.map((b, idx) => {
      const from = Math.max(0, idx - 3);
      const slice = rawBuckets.slice(from, idx + 1);
      const avg = slice.reduce((sum, x) => sum + x.totalVolumeKg, 0) / slice.length;
      const { weekTarget: _wt, ...rest } = b;
      return { ...rest, movingAvgVolKg: Math.round(avg) };
    });

    const totalWeeksCount = Math.max(1, weeklyBuckets.length);
    const sessionsInRange = rawBuckets.reduce((s, w) => s + w.workoutCount, 0);
    const plannedSessionsInRange = countPlannedSessionsInRange(range.startDate, range.endDate, userGymPlan);
    const adherenceRatePct =
      plannedSessionsInRange > 0
        ? Math.min(100, Math.round((sessionsInRange / plannedSessionsInRange) * 100))
        : 0;
    const weeksOnTargetCount = rawBuckets.filter(
      w => w.workoutCount >= Math.max(1, w.weekTarget)
    ).length;
    const elapsedWeeks = Math.max(1, range.daySpan / 7);
    const avgWorkoutsPerWeek = Math.round((sessionsInRange / elapsedWeeks) * 10) / 10;

    // Mon..Sun weekday frequency in range
    const monToSunCounts = [0, 0, 0, 0, 0, 0, 0];
    const MON_SUN_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    for (const s of analyticsData.detailedLogs) {
      const ds = s.date.slice(0, 10);
      if (ds < range.startDate || ds > range.endDate) continue;
      const dow = parseLocalDate(ds).getDay();
      const monIdx = (dow + 6) % 7;
      monToSunCounts[monIdx] += 1;
    }
    const maxWd = Math.max(1, ...monToSunCounts);
    const weekdayFrequency = MON_SUN_LABELS.map((shortLabel, idx) => {
      const planDayIdx = idx + 1; // 1=Mon..7=Sun
      const planned = isRotation ? true : resolvePlanDay(userGymPlan, planDayIdx)?.isRest !== true;
      return {
        dayIndex: planDayIdx,
        shortLabel,
        count: monToSunCounts[idx],
        pctOfMax: Math.round((monToSunCounts[idx] / maxWd) * 100),
        planned,
      };
    });

    // Scoped Cardio Period Summary
    let cMins = 0;
    let cDist = 0;
    let cSess = 0;
    for (const log of safeLogs) {
      const ds = log?.date ? String(log.date).slice(0, 10) : '';
      if (!ds || ds < range.startDate || ds > range.endDate) continue;
      for (const c of log.cardio || []) {
        if (c && c.completed) {
          cSess++;
          cMins += Number(c.durationMinutes) || 0;
          cDist += Number(c.distanceKm) || 0;
        }
      }
    }

    const { streakDays, longestStreakDays } = computeRangeStreakMetrics(
      safeLogs,
      range.startDate,
      range.endDate,
      userGymPlan
    );

    return {
      range,
      sessionsInRange,
      plannedSessionsInRange,
      streakDays,
      longestStreakDays,
      adherenceRatePct,
      plannedWeeklySessions,
      weeksOnTargetCount,
      totalWeeksCount,
      avgWorkoutsPerWeek,
      weeklyBuckets,
      weekdayFrequency,
      cardioPeriod: {
        totalMinutes: Math.round(cMins),
        totalKm: Math.round(cDist * 10) / 10,
        sessions: cSess,
        avgMinsPerWeek: Math.round(cMins / elapsedWeeks),
      },
    };
  });
}
