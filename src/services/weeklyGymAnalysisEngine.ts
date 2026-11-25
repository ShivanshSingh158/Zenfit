import { estimate1RM } from './oneRepMaxEngine';
/**
 * weeklyGymAnalysisEngine.ts — ZenFit Mobile
 *
 * Deterministic Weekly Training Analysis Engine.
 * 100% Offline, Instant, and Accurate.
 * Generates comprehensive weekly reports, volume deltas, score grades, and directives
 * purely from authoritative workout history and mathematical models.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { canonicalizeMuscle, isValidWorkoutSession, normalizeExerciseKey, getVolumeMultiplier } from '../utils/gymUtils';
import { formatLocalDateStr, parseLocalDate } from '../utils/dateCore';
import { formatWeight, kgToDisplay, unitLabel } from '../utils/weightUnit';

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


export async function clearWeeklyAnalysisCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const weekly = keys.filter(k => k.startsWith(CACHE_PREFIX));
    if (weekly.length > 12) {
      const toRemove = weekly.sort().slice(0, weekly.length - 12);
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch (_) {}
}

const CACHE_PREFIX = 'zenfit_weekly_gym_analysis_v4_';

export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return Math.round(estimate1RM(weight, reps, 'hybrid'));
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
      const dStr = s.date || (s.startTime ? formatLocalDateStr(new Date(s.startTime)) : '');
      const t = dStr ? parseLocalDate(dStr.slice(0, 10)).getTime() : 0;
      return t >= mTime && t < sTime;
    })
    .map(s => `${s.id || s.date}:${(s.exercises || []).length}:${(s.exercises || []).reduce((acc: number, e: any) => acc + (e.setsLog || e.sets || []).length, 0)}`)
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
  forceRefresh = false,
  unitIsLbs = false,
): Promise<{ analysis: WeeklyGymAnalysis | null; fromCache: boolean; error?: string }> {
  const monday = computeMondayOfCurrentWeek();
  const mondayStr = formatLocalDateStr(monday);
  const currentFingerprint = `${computeWeekFingerprint(thisWeekSessions, monday)}|${unitIsLbs ? 'lbs' : 'kg'}`;
  const cacheKey = `${CACHE_PREFIX}${mondayStr}`;
  const uLabel = unitLabel(unitIsLbs);

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

  // 1. Calculate Score (Issue #100: Score is 0 if 0 workouts completed in the week)
  if (precomputed.sessionCount === 0) {
    return {
      analysis: {
        headline: 'No Workouts Logged',
        verdict: 'No workout sessions logged this week. Rest or de-load acknowledged.',
        score: 0,
        scoreGrade: 'C',
        comparisonVsLastWeek: {
          volumeDeltaText: `0 ${uLabel}`,
          keyOverloads: [],
          summary: '0 sessions completed.',
        },
        thirtyDayTrend: {
          trajectory: 'Paused',
          laggingMuscles: precomputed.untrainedMuscles,
          fatigueIndicator: 'Low',
        },
        nextWeekDirectives: ['Resume planned split when ready'],
        generatedAt: Date.now(),
      },
      fromCache: false,
    };
  }

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
  const dispDelta = kgToDisplay(precomputed.volumeDeltaKg, unitIsLbs);
  const deltaSign = dispDelta >= 0 ? '+' : '';
  const volumeDeltaText = `${deltaSign}${Math.round(dispDelta).toLocaleString()} ${uLabel} (${deltaSign}${precomputed.volumeDeltaPct.toFixed(1)}%) vs last week`;

  const headline =
    precomputed.volumeDeltaPct > 8
      ? 'Stronger Week'
      : precomputed.volumeDeltaPct < -10
      ? 'Lighter Recovery Week'
      : 'Steady Training Week';

  const dispWeekVol = kgToDisplay(precomputed.thisWeekVolume, unitIsLbs);
  const volFormatted =
    dispWeekVol >= 1000
      ? `${(dispWeekVol / 1000).toFixed(1)}k ${uLabel}`
      : `${Math.round(dispWeekVol).toLocaleString()} ${uLabel}`;

  const verdict = `Logged ${precomputed.sessionCount} ${precomputed.sessionCount === 1 ? 'workout' : 'workouts'} (${precomputed.thisWeekSets} working sets, ${volFormatted}). ${
    precomputed.prevWeekSets > 0
      ? precomputed.volumeDeltaPct >= 0
        ? `Total load moved up ${precomputed.volumeDeltaPct.toFixed(1)}% compared to last week.`
        : `Total load dipped ${Math.abs(precomputed.volumeDeltaPct).toFixed(1)}% vs last week.`
      : 'Good baseline set for weekly comparison.'
  }`;

  // 3. Key Overloads & Progression
  const keyOverloads: string[] = [];
  if (precomputed.topLift && precomputed.topLift.weight > 0) {
    keyOverloads.push(`Best Lift: ${precomputed.topLift.name} — ${formatWeight(precomputed.topLift.weight, unitIsLbs, 1)} × ${precomputed.topLift.reps} reps`);
  }
  keyOverloads.push(`Working Volume: ${precomputed.thisWeekSets} completed sets across ${precomputed.sessionCount} sessions`);
  if (precomputed.volumeDeltaKg !== 0) {
    keyOverloads.push(`Week-over-Week Change: ${volumeDeltaText}`);
  }

  // 4. Thirty-day Trend
  const trajectory = precomputed.volumeDeltaPct >= 0
    ? 'Training volume is trending upward with steady progress.'
    : 'Training volume stepped down slightly — keep effort high on key lifts.';

  const laggingMuscles = precomputed.untrainedMuscles.length > 0
    ? precomputed.untrainedMuscles.slice(0, 3)
    : ['All planned muscle groups trained'];

  const fatigueIndicator = precomputed.thisWeekSets > 65
    ? 'High weekly set count — prioritize sleep and recovery.'
    : 'Weekly set count sits comfortably inside a recoverable range.';

  // 5. Next Week Directives
  const nextWeekDirectives: string[] = [];
  if (precomputed.topLift) {
    const stepStr = unitIsLbs ? '+5 lbs' : '+2.5 kg';
    nextWeekDirectives.push(`Aim to add 1–2 reps or ${stepStr} on ${precomputed.topLift.name} next session.`);
  }
  if (precomputed.untrainedMuscles.length > 0) {
    nextWeekDirectives.push(`Make time for 3–4 working sets on ${precomputed.untrainedMuscles.slice(0, 2).join(' and ')}.`);
  } else {
    nextWeekDirectives.push(`Keep your current schedule and try adding 1 extra rep on your top sets.`);
  }
  nextWeekDirectives.push(`Take 2–3 minutes of rest on heavy compound lifts so every set stays strong.`);

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
  const d = anchorDate ? parseLocalDate(anchorDate) : new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return formatLocalDateStr(d);
}

export function computeWeeklyDataFingerprint(sessions: any[], anchorDate: string): string {
  return computeWeekFingerprint(sessions, anchorDate ? parseLocalDate(anchorDate) : new Date());
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
  const anchorTime = parseLocalDate(mondayStr).getTime();
  const nextMondayTime = anchorTime + 7 * 86400000;
  const prevMondayTime = anchorTime - 7 * 86400000;

  const thisWeekSessions = gymLogs.filter(s => {
    const t = s.date ? parseLocalDate(String(s.date).slice(0, 10)).getTime() : 0;
    return t >= anchorTime && t < nextMondayTime;
  });

  const prevWeekSessions = gymLogs.filter(s => {
    const t = s.date ? parseLocalDate(String(s.date).slice(0, 10)).getTime() : 0;
    return t >= prevMondayTime && t < anchorTime;
  });

  const calcSessionVol = (s: any) => {
    if (typeof s.totalVolume === 'number' && s.totalVolume > 0) return s.totalVolume;
    let vol = 0;
    for (const ex of s.exercises || []) {
      const mult = getVolumeMultiplier(ex.name);
      for (const st of ex.setsLog || ex.sets || []) {
        if (st.completed && !st.isWarmup) {
          vol += (Number(st.weight) || 0) * mult * (Number(st.reps) || 0);
        }
      }
    }
    return vol;
  };

  const calcSessionSetsCount = (s: any) => {
    let count = 0;
    for (const ex of s.exercises || []) {
      for (const st of ex.setsLog || ex.sets || []) {
        if (st.completed && !st.isWarmup) count++;
      }
    }
    return count;
  };

  const stats: PrecomputedGymStats = precomputedStats || {
    thisWeekVolume: thisWeekSessions.reduce((acc, s) => acc + calcSessionVol(s), 0),
    prevWeekVolume: prevWeekSessions.reduce((acc, s) => acc + calcSessionVol(s), 0),
    volumeDeltaKg: 0,
    volumeDeltaPct: 0,
    thisWeekSets: thisWeekSessions.reduce((acc, s) => acc + calcSessionSetsCount(s), 0),
    prevWeekSets: prevWeekSessions.reduce((acc, s) => acc + calcSessionSetsCount(s), 0),
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

  return generateWeeklyGymAnalysis(stats, thisWeekSessions, prevWeekSessions, gymLogs, forceRefresh, Boolean(gymProfile?.unitIsLbs));
}
