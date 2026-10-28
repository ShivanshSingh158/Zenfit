/**
 * weeklyGymAnalysisEngine.ts — ZenFit Mobile
 *
 * Deterministic Weekly Training Analysis Engine.
 * 100% Offline, Instant, and Accurate.
 * Generates comprehensive weekly reports, volume deltas, score grades, and directives
 * purely from authoritative workout history and mathematical models.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { canonicalizeMuscle, isValidWorkoutSession, normalizeExerciseKey } from '../utils/gymUtils';
import { formatLocalDateStr } from '../utils/dateUtils';

export interface WeeklyGymAnalysis {
  headline: string;
  verdict: string;
  score: number;       // 0–100 overall week execution score
  scoreGrade: string;  // "A+" | "A" | "B+" | "B" | "C"
  comparisonVsLastWeek: {
    volumeDeltaText: string;
    keyOverloads: string[];
    summary: string;
  };
  thirtyDayTrend: {
    trajectory: string;
    laggingMuscles: string[];
    fatigueIndicator: string;
  };
  nextWeekDirectives: string[];
  generatedAt: number;
}

/** Pre-computed stats passed by the UI */
export interface PrecomputedGymStats {
  thisWeekVolume: number;
  prevWeekVolume: number;
  volumeDeltaKg: number;
  volumeDeltaPct: number;
  thisWeekSets: number;
  prevWeekSets: number;
  sessionCount: number;
  plannedSessions: number;
  topLift: { name: string; weight: number; reps: number } | null;
  muscleCompletion: Record<string, { done: number; planned: number; pct: number }>;
  untrainedMuscles: string[];
  estimatedOneRMs: Record<string, number>;
}

const CACHE_PREFIX = 'zenfit_weekly_gym_analysis_v4_';

export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return Math.round(weight * (1 + reps / 30));
}

export function computeMondayOfCurrentWeek(now = new Date()): Date {
  const d = new Date(now);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function computeMondayOfPreviousWeek(now = new Date()): Date {
  const m = computeMondayOfCurrentWeek(now);
  m.setDate(m.getDate() - 7);
  return m;
}

export function computeMondayOfTwoWeeksAgo(now = new Date()): Date {
  const m = computeMondayOfCurrentWeek(now);
  m.setDate(m.getDate() - 14);
  return m;
}

export function computeWeekFingerprint(sessions: any[], monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 7);
  const mTime = monday.getTime();
  const sTime = sunday.getTime();

  return sessions
    .filter(s => {
      const t = new Date(s.date || s.startTime || 0).getTime();
      return t >= mTime && t < sTime;
    })
    .map(s => `${s.id || s.date}:${(s.exercises || []).length}:${(s.exercises || []).reduce((acc: number, e: any) => acc + (e.sets || []).length, 0)}`)
    .sort()
    .join('|');
}

/**
 * Generate a 100% deterministic analysis report based on real training science.
 */
export async function generateWeeklyGymAnalysis(
  precomputed: PrecomputedGymStats,
  thisWeekSessions: any[],
  prevWeekSessions: any[],
  allSessions: any[] = [],
  forceRefresh = false
): Promise<{ analysis: WeeklyGymAnalysis | null; fromCache: boolean; error?: string }> {
  const monday = computeMondayOfCurrentWeek();
  const mondayStr = formatLocalDateStr(monday);
  const currentFingerprint = computeWeekFingerprint(thisWeekSessions, monday);
  const cacheKey = `${CACHE_PREFIX}${mondayStr}`;

  if (!forceRefresh) {
    try {
      const cachedRaw = await AsyncStorage.getItem(cacheKey);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached.fingerprint === currentFingerprint && cached.analysis) {
          return { analysis: cached.analysis, fromCache: true };
        }
      }
    } catch (_) {}
  }

  // 1. Calculate Score
  let score = 70; // baseline
  const adherence = precomputed.plannedSessions > 0
    ? Math.min(1.2, precomputed.sessionCount / precomputed.plannedSessions)
    : 1;
  score += Math.round((adherence - 1) * 20);

  if (precomputed.volumeDeltaPct > 0) {
    score += Math.min(10, Math.round(precomputed.volumeDeltaPct / 2));
  } else if (precomputed.volumeDeltaPct < -15) {
    score -= 10;
  }

  if (precomputed.untrainedMuscles.length === 0) {
    score += 5;
  } else {
    score -= Math.min(15, precomputed.untrainedMuscles.length * 3);
  }

  score = Math.max(45, Math.min(99, score));

  let scoreGrade = 'B';
  if (score >= 93) scoreGrade = 'A+';
  else if (score >= 85) scoreGrade = 'A';
  else if (score >= 75) scoreGrade = 'B+';
  else if (score >= 65) scoreGrade = 'B';
  else scoreGrade = 'C';

  // 2. Headline & Verdict
  const deltaSign = precomputed.volumeDeltaKg >= 0 ? '+' : '';
  const volumeDeltaText = `${deltaSign}${Math.round(precomputed.volumeDeltaKg).toLocaleString()} kg (${deltaSign}${precomputed.volumeDeltaPct.toFixed(1)}%) vs last week`;

  let headline = 'Steady Volume & Muscle Stimulus';
  if (precomputed.volumeDeltaPct > 8) {
    headline = 'Progressive Overload Achieved';
  } else if (precomputed.volumeDeltaPct < -10) {
    headline = 'Active Recovery & Consolidation Week';
  }

  const verdict = `Completed ${precomputed.sessionCount} sessions (${precomputed.thisWeekSets} total working sets) with a total volume tonnage of ${Math.round(precomputed.thisWeekVolume).toLocaleString()} kg. Progressive overload trend remains ${precomputed.volumeDeltaPct >= 0 ? 'positive' : 'consolidated'}.`;

  // 3. Key Overloads & Progression
  const keyOverloads: string[] = [];
  if (precomputed.topLift && precomputed.topLift.weight > 0) {
    keyOverloads.push(`Top Lift: ${precomputed.topLift.name} @ ${precomputed.topLift.weight} kg × ${precomputed.topLift.reps} reps`);
  }
  keyOverloads.push(`Working Volume: ${precomputed.thisWeekSets} completed sets across ${precomputed.sessionCount} workouts`);
  if (precomputed.volumeDeltaKg !== 0) {
    keyOverloads.push(`Tonnage Progression: ${volumeDeltaText}`);
  }

  // 4. Thirty-day Trend
  const trajectory = precomputed.volumeDeltaPct >= 0
    ? 'Volume and strength curves are trending upward with consistent overload.'
    : 'Volume is currently stabilized; focus on intensity and form refinement.';

  const laggingMuscles = precomputed.untrainedMuscles.length > 0
    ? precomputed.untrainedMuscles.slice(0, 3)
    : ['All primary muscle groups engaged'];

  const fatigueIndicator = precomputed.thisWeekSets > 65
    ? 'High systemic fatigue detected. Prioritize sleep and hydration.'
    : 'Fatigue levels within optimal recoverable volume range (MAV).';

  // 5. Next Week Directives
  const nextWeekDirectives: string[] = [];
  if (precomputed.topLift) {
    nextWeekDirectives.push(`Attempt double progression on ${precomputed.topLift.name} (+1-2 reps before load increment).`);
  }
  if (precomputed.untrainedMuscles.length > 0) {
    nextWeekDirectives.push(`Allocate 3-4 working sets to neglected areas: ${precomputed.untrainedMuscles.slice(0, 2).join(', ')}.`);
  } else {
    nextWeekDirectives.push(`Maintain target frequency and push for 1 extra rep on primary compound movements.`);
  }
  nextWeekDirectives.push(`Keep rest intervals strict (90s for accessories, 2-3m for primary compound lifts).`);

  const analysis: WeeklyGymAnalysis = {
    headline,
    verdict,
    score,
    scoreGrade,
    comparisonVsLastWeek: {
      volumeDeltaText,
      keyOverloads,
      summary: `Completed ${precomputed.sessionCount} workouts (${precomputed.thisWeekSets} working sets) compared to ${precomputed.prevWeekSets} sets last week.`
    },
    thirtyDayTrend: {
      trajectory,
      laggingMuscles,
      fatigueIndicator
    },
    nextWeekDirectives,
    generatedAt: Date.now()
  };

  try {
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({
        analysis,
        timestamp: Date.now(),
        weekMonday: mondayStr,
        fingerprint: currentFingerprint
      })
    );
  } catch (_) {}

  return { analysis, fromCache: false };
}


export function getWeekMondayStr(anchorDate: string): string {
  const d = new Date(anchorDate || Date.now());
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return formatLocalDateStr(d);
}

export function computeWeeklyDataFingerprint(sessions: any[], anchorDate: string): string {
  return computeWeekFingerprint(sessions, new Date(anchorDate || Date.now()));
}

export async function getCachedWeeklyGymAnalysis(weekAnchorDate: string): Promise<WeeklyGymAnalysis | null> {
  const mondayStr = getWeekMondayStr(weekAnchorDate);
  const cacheKey = `${CACHE_PREFIX}${mondayStr}`;
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.analysis || null;
  } catch (_) {
    return null;
  }
}

export async function getOrGenerateWeeklyGymAnalysis(
  gymLogs: any[],
  weekAnchorDate: string,
  userGymPlan?: any,
  gymProfile?: any,
  forceRefresh: boolean = false,
  precomputedStats?: PrecomputedGymStats,
): Promise<{ analysis: WeeklyGymAnalysis | null; fromCache: boolean; error?: string }> {
  if (!gymLogs || gymLogs.length === 0) {
    return { analysis: null, fromCache: false };
  }

  const mondayStr = getWeekMondayStr(weekAnchorDate);
  const anchorTime = new Date(mondayStr).getTime();
  const nextMondayTime = anchorTime + 7 * 86400000;
  const prevMondayTime = anchorTime - 7 * 86400000;

  const thisWeekSessions = gymLogs.filter(s => {
    const t = new Date(s.date || 0).getTime();
    return t >= anchorTime && t < nextMondayTime;
  });

  const prevWeekSessions = gymLogs.filter(s => {
    const t = new Date(s.date || 0).getTime();
    return t >= prevMondayTime && t < anchorTime;
  });

  const stats: PrecomputedGymStats = precomputedStats || {
    thisWeekVolume: thisWeekSessions.reduce((acc, s) => acc + (s.totalVolume || 0), 0),
    prevWeekVolume: prevWeekSessions.reduce((acc, s) => acc + (s.totalVolume || 0), 0),
    volumeDeltaKg: 0,
    volumeDeltaPct: 0,
    thisWeekSets: thisWeekSessions.reduce((acc, s) => acc + (s.exercises || []).reduce((ea: number, e: any) => ea + (e.sets || []).length, 0), 0),
    prevWeekSets: prevWeekSessions.reduce((acc, s) => acc + (s.exercises || []).reduce((ea: number, e: any) => ea + (e.sets || []).length, 0), 0),
    sessionCount: thisWeekSessions.length,
    plannedSessions: 4,
    topLift: null,
    muscleCompletion: {},
    untrainedMuscles: [],
    estimatedOneRMs: {},
  };

  if (!precomputedStats) {
    stats.volumeDeltaKg = stats.thisWeekVolume - stats.prevWeekVolume;
    stats.volumeDeltaPct = stats.prevWeekVolume > 0 ? (stats.volumeDeltaKg / stats.prevWeekVolume) * 100 : 0;
  }

  return generateWeeklyGymAnalysis(stats, thisWeekSessions, prevWeekSessions, gymLogs, forceRefresh);
}
