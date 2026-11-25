/**
 * WeeklyGymReport • ZenTrack Mobile
 * Shown on rest days (e.g. Sunday) as the full-week workout analytics dashboard.
 * Displays:
 *  - Dynamic muscle target completion rings (done / planned sets)
 *  - Global weekly KPIs (Sessions, Total Sets, Volume) with WoW deltas
 *  - Volume Trend Line (this week vs last week SVG overlay)
 *  - Strength Progression sparklines (est. 1RM for top 4 lifts, 4-week trend)
 *  - Muscle Distribution donut chart
 *  - Weekly Highlights & Top Lifts
 *  - Cardio & Conditioning recap
 *  - 90-day Consistency Heatmap (4-level intensity gradient)
 *  - Untrained muscle balance alert
 *  - GYM-GPT Weekly Intelligence (fixed: robust JSON, pre-computed stats, retry)
 *
 * Theme: Obsidian Cosmos • COLORS tokens only.
 */

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import {
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Dumbbell,
  Flag,
  Flame,
  Gauge,
  Navigation,
  RefreshCw,
  Sparkles,
} from 'lucide-react-native';
import {
  COLORS,
  DARK_TOKENS,
  LIGHT_TOKENS,
  RADIUS,
  FONT_FAMILY,
  FONT_SIZE,
  ICON,
  TOUCH,
  ThemeTokens,
} from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { TactileButton } from '../../ui/TactileButton';
import { NumericText } from '../../ui/NumericText';
import { RollingNumber } from '../../ui/RollingNumber';
import { AnimatedProgressBar } from '../../ui/AnimatedProgressBar';
import { canonicalizeMuscle, isValidWorkoutSession, resolveExerciseTargetMuscle } from '../../../utils/gymUtils';
import { formatVolumeParts, formatWeight, useWeightUnit } from '../../../utils/weightUnit';
import { hapticLight, hapticMedium } from '../../../utils/haptics';
import { resolvePlanDay } from '../../../data/gymPlan';
import VolumeTrendLine from '../Charts/VolumeTrendLine';
import StrengthProgressionChart from '../Charts/StrengthProgressionChart';
import type { ExerciseSpark } from '../Charts/StrengthProgressionChart';
import ExerciseDeepDiveModal from '../exercise/ExerciseDeepDiveModal';
import AnatomicalBodyMapCard from './AnatomicalBodyMapCard';
import {
  getOrGenerateWeeklyGymAnalysis,
  getCachedWeeklyGymAnalysis,
  getWeekMondayStr,
  WeeklyGymAnalysis,
  PrecomputedGymStats,
  epley1RM,
} from '../../../services/weeklyGymAnalysisEngine';
import type { GymDayLog, GymPlanDay, UserGymPlanDoc } from '../../../types/gym.types';
import { makeStyles } from './weeklyGymReportStyles';
import { computeOrGetHotCache, generateDatasetFingerprint } from '../../../utils/hotCacheStore';
import WeeklyHighlightsCarousel, { WeeklyHighlightStats } from './WeeklyHighlightsCarousel';
import {
  computeUnifiedAnalytics,
  WeekScopedSummary,
} from '../../../services/gymAnalyticsEngine';



// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
  gymLogs: Array<GymDayLog | any>;
  /** ISO date string of the week being viewed (any day in that week, YYYY-MM-DD) */
  weekAnchorDate: string;
  userGymPlan?: UserGymPlanDoc | any | null;
  scrollable?: boolean;
  hideHeader?: boolean;
  hideEmptyCard?: boolean;
  hideKpiRow?: boolean;
  replayKey?: number | string;
  /** Pre-computed week-scoped stats from Analytics hub (avoids duplicate full scans & redundant cards) */
  weekScopedSummary?: WeekScopedSummary;
  onPressBodyMap?: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns all 7 YYYY-MM-DD strings for the week containing anchorDate (Mon–Sun). */
function getWeekRange(anchor: string): string[] {
  const [y, m, day] = anchor.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  const dow = d.getDay(); // 0=Sun
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return localDateStr(dt);
  });
}

/** Returns the previous week's date range. */
function getPrevWeekRange(anchor: string): string[] {
  const [y, m, day] = anchor.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  d.setDate(d.getDate() - 7);
  return getWeekRange(localDateStr(d));
}

function getMuscleColors(tokens: ThemeTokens): Record<string, string> {
  return {
    Chest: tokens.accent.secondary,
    Back: tokens.accent.primary,
    Shoulders: tokens.status.warning,
    Triceps: tokens.status.success,
    Biceps: tokens.accent.secondary,
    Quads: tokens.status.warning,
    Hamstrings: tokens.accent.primary,
    Calves: tokens.status.success,
    Abs: tokens.accent.secondary,
    Forearms: tokens.status.warning,
    Glutes: tokens.accent.secondary,
    Traps: tokens.accent.primary,
    Mixed: tokens.text.secondary,
  };
}

// ── Formatted Text Component (Parses **bold** into native bold font) ─────────

function FormattedText({
  text,
  style,
  boldColor,
}: {
  text?: string;
  style?: any;
  boldColor?: string;
}) {
  const { isDark } = useTheme();
  const tokens = isDark ? DARK_TOKENS : LIGHT_TOKENS;
  if (!text) return null;
  // Splits by **...** markers
  const segments = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <Text style={style}>
      {segments.map((seg, idx) => {
        if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4) {
          const inner = seg.slice(2, -2);
          return (
            <Text
              key={idx}
              style={{
                fontFamily: FONT_FAMILY.bold,
                color: boldColor || tokens.text.primary,
              }}
            >
              {inner}
            </Text>
          );
        }
        return <Text key={idx}>{seg}</Text>;
      })}
    </Text>
  );
}

// ── Donut Ring Component ─────────────────────────────────────────────────────

// FIX: Wrapped in React.memo — stops SVG re-creation on every parent re-render.
// With 10+ muscles each rendering an SVG, un-memoised DonutRings were the
// main source of frame drops when the parent state changed.
const DonutRing = React.memo(function DonutRing({
  pct,
  color,
  size = 66,
  strokeWidth = 6.5,
}: {
  pct: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const { isDark } = useTheme();
  const tokens = isDark ? DARK_TOKENS : LIGHT_TOKENS;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const clampedPct = Math.min(100, Math.max(0, pct));
  const filled = (clampedPct / 100) * circ;
  const center = size / 2;
  const isComplete = clampedPct >= 100;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background Track */}
      <Circle
        cx={center}
        cy={center}
        r={r}
        stroke={tokens.border.subtle}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Filled Arc */}
      {filled > 0 && (
        <G rotation="-90" origin={`${center},${center}`}>
          <Circle
            cx={center}
            cy={center}
            r={r}
            stroke={isComplete ? (color === DARK_TOKENS.text.secondary ? tokens.status.success : color) : color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeLinecap="round"
          />
        </G>
      )}
    </Svg>
  );
});

// ── Change Delta Badge ───────────────────────────────────────────────────────

const ChangeBadge = React.memo(function ChangeBadge({ delta, unit = '', st, tokens }: { delta: number; unit?: string; st?: any; tokens?: any }) {
  const theme = useTheme();
  const activeTokens = tokens ?? (theme.isDark ? DARK_TOKENS : LIGHT_TOKENS);
  const activeSt = st ?? makeStyles(theme.colors, theme.isDark);
  if (delta === 0) return <NumericText style={activeSt.changeBadgeNeutral}>• no change</NumericText>;
  const isPositive = delta > 0;
  return (
    <NumericText style={[activeSt.changeBadge, { color: isPositive ? activeTokens.status.success : activeTokens.accent.crimson }]}>
      {isPositive ? '▲ +' : '▼ -'}{Math.abs(delta)}{unit}
    </NumericText>
  );
});

export const WeeklyGymReport = React.memo(function WeeklyGymReport({
  gymLogs,
  weekAnchorDate,
  userGymPlan,
  scrollable = false,
  hideHeader = false,
  hideEmptyCard = false,
  hideKpiRow = false,
  replayKey = 0,
  weekScopedSummary,
  onPressBodyMap,
}: Props) {
  const { colors, isDark, tokens } = useTheme();
  const unitIsLbs = useWeightUnit();
  const muscleColors = useMemo(() => getMuscleColors(tokens), [tokens]);
  const st = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const weekDates = useMemo(() => getWeekRange(weekAnchorDate), [weekAnchorDate]);
  const prevDates = useMemo(() => getPrevWeekRange(weekAnchorDate), [weekAnchorDate]);

  const weekLogs = useMemo(
    () => (gymLogs || []).filter(l => l?.date && weekDates.includes(l.date.slice(0, 10))),
    [gymLogs, weekDates],
  );
  const prevLogs = useMemo(
    () => (gymLogs || []).filter(l => l?.date && prevDates.includes(l.date.slice(0, 10))),
    [gymLogs, prevDates],
  );

  // If user views the weekly report in-app, cancel pending follow-up notifications for this week
  useEffect(() => {
    if (weekAnchorDate) {
      try {
        const { dismissWeeklyReportFollowUp } = require('../../../services/activeWorkoutNotificationService');
        dismissWeeklyReportFollowUp(weekAnchorDate).catch(() => {});
      } catch {}
    }
  }, [weekAnchorDate]);

  const dateRangeStr = useMemo(() => {
    if (!weekDates.length) return '';
    try {
      const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const [, m1, d1] = weekDates[0].split('-').map(Number);
      const [, m2, d2] = weekDates[6].split('-').map(Number);
      const month1 = MONTHS_SHORT[m1 - 1] || '';
      const month2 = MONTHS_SHORT[m2 - 1] || '';
      if (month1 === month2) {
        return `${month1} ${d1} – ${d2}`;
      }
      return `${month1} ${d1} – ${month2} ${d2}`;
    } catch {
      return `${weekDates[0]} – ${weekDates[6]}`;
    }
  }, [weekDates]);

  // ── Compute Weekly Target Sets from Active Routine ─────────────────────────
  const plannedMuscleTargets = useMemo(() => {
    const targets: Record<string, number> = {};
    const daysIndices = [1, 2, 3, 4, 5, 6, 7];

    daysIndices.forEach(dayIdx => {
      const planDay: GymPlanDay | undefined = resolvePlanDay(userGymPlan, dayIdx);

      if (planDay && !planDay.isRest && planDay.exercises) {
        planDay.exercises.forEach(ex => {
          const resolved = resolveExerciseTargetMuscle(ex.name, ex.muscle);
        const m = (resolved.canonicalGroup && resolved.canonicalGroup !== 'Mixed')
          ? resolved.canonicalGroup
          : canonicalizeMuscle(ex.muscle);
          const sets = ex.targetSets || 3;
          targets[m] = (targets[m] || 0) + sets;
        });
      }
    });

    return targets;
  }, [userGymPlan]);

  // Total planned workout days in weekly routine
  const plannedWorkoutDaysCount = useMemo(() => {
    const daysIndices = [1, 2, 3, 4, 5, 6, 7];
    let count = 0;
    daysIndices.forEach(dayIdx => {
      const planDay: GymPlanDay | undefined = resolvePlanDay(userGymPlan, dayIdx);
      if (planDay && !planDay.isRest) count++;
    });
    return Math.max(1, count);
  }, [userGymPlan]);

  // ── Compute Actual Logged Muscle Stats ─────────────────────────────────────
  interface MuscleStats {
    sets: number;
    totalKg: number;
    sessions: number;
  }

  function computeMuscleStats(logs: GymDayLog[]): Record<string, MuscleStats> {
    const map: Record<string, MuscleStats> = {};
    for (const log of logs) {
      for (const ex of log.exercises ?? []) {
        if (ex.skipped) continue;
        const resolved = resolveExerciseTargetMuscle(ex.name, ex.muscle);
        const m = (resolved.canonicalGroup && resolved.canonicalGroup !== 'Mixed')
          ? resolved.canonicalGroup
          : canonicalizeMuscle(ex.muscle);
        if (!map[m]) map[m] = { sets: 0, totalKg: 0, sessions: 0 };
        const completedSets = (ex.setsLog ?? []).filter(s => s.completed && !s.isWarmup);
        map[m].sets += completedSets.length;
        map[m].totalKg += completedSets.reduce(
          (sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0),
          0,
        );
        if (completedSets.length > 0) map[m].sessions += 1;
      }
    }
    return map;
  }

  const thisWeekMuscle = useMemo(() => {
    const cacheKey = `weekly_muscle_cur_${weekAnchorDate}_${generateDatasetFingerprint(weekLogs)}`;
    return computeOrGetHotCache(cacheKey, () => computeMuscleStats(weekLogs));
  }, [weekLogs, weekAnchorDate]);

  const prevWeekMuscle = useMemo(() => {
    const cacheKey = `weekly_muscle_prev_${weekAnchorDate}_${generateDatasetFingerprint(prevLogs)}`;
    return computeOrGetHotCache(cacheKey, () => computeMuscleStats(prevLogs));
  }, [prevLogs, weekAnchorDate]);

  // ── Global KPI Totals ──────────────────────────────────────────────────────
  const totalSets = useMemo(
    () => Object.values(thisWeekMuscle).reduce((s, m) => s + m.sets, 0),
    [thisWeekMuscle],
  );
  const prevTotalSets = useMemo(
    () => Object.values(prevWeekMuscle).reduce((s, m) => s + m.sets, 0),
    [prevWeekMuscle],
  );

  const totalVolume = useMemo(
    () => Object.values(thisWeekMuscle).reduce((s, m) => s + m.totalKg, 0),
    [thisWeekMuscle],
  );
  const prevTotalVolume = useMemo(
    () => Object.values(prevWeekMuscle).reduce((s, m) => s + m.totalKg, 0),
    [prevWeekMuscle],
  );

  const workoutDays = useMemo(
    () => weekLogs.filter(isValidWorkoutSession).length,
    [weekLogs],
  );

  const prevWorkoutDays = useMemo(
    () => prevLogs.filter(isValidWorkoutSession).length,
    [prevLogs],
  );

  // ── Weekly Highlights: Heaviest Lift & Top Volume Exercise ─────────────────
  const weeklyHighlights = useMemo(() => {
    const cacheKey = `weekly_highlights_${weekAnchorDate}_${generateDatasetFingerprint(weekLogs)}`;
    return computeOrGetHotCache(cacheKey, () => {
      let topLift = { name: '', weight: 0, reps: 0 };
      const exerciseVolMap: Record<string, { volume: number; name: string }> = {};

      for (const log of weekLogs) {
        for (const ex of log.exercises ?? []) {
          if (ex.skipped) continue;
          for (const s of ex.setsLog ?? []) {
            if (s.completed && s.weight && s.weight > 0) {
              if (s.weight > topLift.weight) {
                topLift = { name: ex.name, weight: s.weight, reps: s.reps || 0 };
              }
              const vol = s.weight * (s.reps || 1);
              if (!exerciseVolMap[ex.name]) {
                exerciseVolMap[ex.name] = { name: ex.name, volume: 0 };
              }
              exerciseVolMap[ex.name].volume += vol;
            }
          }
        }
      }

      const topVolumeExercise = Object.values(exerciseVolMap).sort(
        (a, b) => b.volume - a.volume,
      )[0] || null;

      return { topLift: topLift.weight > 0 ? topLift : null, topVolumeExercise };
    });
  }, [weekLogs, weekAnchorDate]);

  // ── Cardio Recap ───────────────────────────────────────────────────────────
  const cardioSummary = useMemo(() => {
    const cacheKey = `weekly_cardio_${weekAnchorDate}_${generateDatasetFingerprint(weekLogs)}`;
    return computeOrGetHotCache(cacheKey, () => {
      let totalMinutes = 0;
      let totalKm = 0;
      let sessions = 0;
      let loggedCalories = 0;

      for (const log of weekLogs) {
        for (const c of log.cardio ?? []) {
          if (c.completed) {
            sessions++;
            totalMinutes += Number(c.durationMinutes) || 0;
            totalKm += Number(c.distanceKm) || 0;
            loggedCalories += Number((c as any).calories ?? c.caloriesBurned) || 0;
          }
        }
      }

      const roundedKm = Math.round(totalKm * 10) / 10;
      const estCalories = loggedCalories > 0 ? loggedCalories : Math.round(totalMinutes * 8.5);
      const avgDuration = sessions > 0 ? Math.round(totalMinutes / sessions) : 0;
      const avgSpeedKmh = totalMinutes > 0 && roundedKm > 0 ? Math.round((roundedKm / (totalMinutes / 60)) * 10) / 10 : 0;
      const avgPaceMinKm = roundedKm > 0 && totalMinutes > 0 ? Math.round((totalMinutes / roundedKm) * 10) / 10 : 0;

      return {
        totalMinutes,
        totalKm: roundedKm,
        sessions,
        estCalories,
        avgDuration,
        avgSpeedKmh,
        avgPaceMinKm,
      };
    });
  }, [weekLogs, weekAnchorDate]);

  // ── Muscle List for Display ────────────────────────────────────────────────
  const displayMuscles = useMemo(() => {
    const allRelevant = Array.from(
      new Set([
        ...Object.keys(plannedMuscleTargets),
        ...Object.keys(thisWeekMuscle),
      ]),
    );

    return allRelevant
      .filter(m => (thisWeekMuscle[m]?.sets ?? 0) > 0 || (plannedMuscleTargets[m] ?? 0) > 0)
      .sort((a, b) => {
        const setsA = thisWeekMuscle[a]?.sets ?? 0;
        const setsB = thisWeekMuscle[b]?.sets ?? 0;
        return setsB - setsA;
      });
  }, [plannedMuscleTargets, thisWeekMuscle]);

  const trainedMuscles = useMemo(() => {
    return Object.keys(thisWeekMuscle)
      .filter(m => (thisWeekMuscle[m]?.sets ?? 0) > 0)
      .map(m => ({
        muscle: m,
        sets: thisWeekMuscle[m]?.sets ?? 0,
        pctOfTotal: totalSets > 0 ? Math.round(((thisWeekMuscle[m]?.sets ?? 0) / totalSets) * 100) : 0,
      }))
      .sort((a, b) => b.sets - a.sets);
  }, [thisWeekMuscle, totalSets]);

  const untrainedMuscles = useMemo(() => {
    return Object.keys(plannedMuscleTargets).filter(
      m => !(thisWeekMuscle[m]?.sets ?? 0) && (plannedMuscleTargets[m] ?? 0) > 0,
    );
  }, [plannedMuscleTargets, thisWeekMuscle]);

  // ── Daily Volume Bar Chart Data (Mon–Sun) ──────────────────────────────────
  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dailyVolume = useMemo(() => {
    const cacheKey = `weekly_cur_daily_vol_${weekAnchorDate}_${generateDatasetFingerprint(weekLogs)}`;
    return computeOrGetHotCache(cacheKey, () => {
      return weekDates.map(date => {
        const log = weekLogs.find(l => l.date?.slice(0, 10) === date);
        if (!log) return 0;
        return (log.exercises ?? []).reduce((sum: number, ex: any) => {
          if (ex.skipped) return sum;
          return (
            sum +
            (ex.setsLog ?? [])
              .filter((s: any) => s.completed && !s.isWarmup)
              .reduce((s2: number, s: any) => s2 + (s.weight ?? 0) * (s.reps ?? 0), 0)
          );
        }, 0);
      });
    });
  }, [weekLogs, weekDates, weekAnchorDate]);

  const maxDailyVol = useMemo(() => Math.max(1, ...dailyVolume), [dailyVolume]);

  const totalPlannedSets = useMemo(
    () => Object.values(plannedMuscleTargets).reduce((a, b) => a + b, 0),
    [plannedMuscleTargets],
  );
  const adherenceRate = totalPlannedSets > 0 ? Math.round((totalSets / totalPlannedSets) * 100) : 100;
  const hasData =
    workoutDays > 0 ||
    cardioSummary.sessions > 0 ||
    weekLogs.some(l => (l.exercises?.length ?? 0) > 0 || (l.cardio?.length ?? 0) > 0);

  // ── Estimated 1RM per exercise (Epley) ───────────────────────────────────
  const exerciseEstRMs = useMemo(() => {
    const rmMap: Record<string, number> = {};
    for (const log of weekLogs) {
      for (const ex of log.exercises ?? []) {
        if (ex.skipped) continue;
        const completed = (ex.setsLog ?? []).filter((s: any) => s.completed && Number(s.weight) > 0);
        const rm = Math.max(0, ...completed.map((s: any) => epley1RM(Number(s.weight) || 0, Number(s.reps) || 0)));
        if (rm > 0 && rm > (rmMap[ex.name] || 0)) rmMap[ex.name] = rm;
      }
    }
    return rmMap;
  }, [weekLogs]);

  // ── Muscle completion map for precomputed stats ───────────────────────────
  const muscleCompletionMap = useMemo(() => {
    const map: Record<string, { done: number; planned: number; pct: number }> = {};
    for (const muscle of displayMuscles) {
      const done = thisWeekMuscle[muscle]?.sets ?? 0;
      const planned = plannedMuscleTargets[muscle] ?? done;
      map[muscle] = { done, planned, pct: planned > 0 ? Math.round((done / planned) * 100) : 100 };
    }
    return map;
  }, [displayMuscles, thisWeekMuscle, plannedMuscleTargets]);

  // ── PrecomputedGymStats for AI prompt ────────────────────────────────────
  const precomputedStats = useMemo((): PrecomputedGymStats => {
    const volumeDeltaKg = Math.round(totalVolume - prevTotalVolume);
    const volumeDeltaPct = prevTotalVolume > 0
      ? Math.round(((totalVolume - prevTotalVolume) / prevTotalVolume) * 1000) / 10
      : 0;
    return {
      thisWeekVolume: Math.round(totalVolume),
      prevWeekVolume: Math.round(prevTotalVolume),
      volumeDeltaKg,
      volumeDeltaPct,
      thisWeekSets: totalSets,
      prevWeekSets: prevTotalSets,
      sessionCount: workoutDays,
      plannedSessions: plannedWorkoutDaysCount,
      topLift: weeklyHighlights.topLift,
      muscleCompletion: muscleCompletionMap,
      untrainedMuscles,
      estimatedOneRMs: exerciseEstRMs,
    };
  }, [totalVolume, prevTotalVolume, totalSets, prevTotalSets, workoutDays, plannedWorkoutDaysCount, weeklyHighlights, muscleCompletionMap, untrainedMuscles, exerciseEstRMs]);

  // ── Strength Progression Data (top 4 exercises, 4-week 1RM history) ───────
  //
  // FIX 1: Pre-slice gymLogs to last 28 days only — no need to scan 90-day history.
  // FIX 2: Build a date→weekIndex Map (O(1) lookup) instead of
  //         findIndex(r => r.dates.includes(date)) which is O(weeks × 7) per log.
  // FIX 3: Guard the entire computation with computeOrGetHotCache so subsequent
  //         Firestore snapshots with identical data are free (0ms re-run).
  const strengthProgressionData = useMemo((): ExerciseSpark[] => {
    const cacheKey = `strength_prog_${weekAnchorDate}_${generateDatasetFingerprint(gymLogs)}`;
    return computeOrGetHotCache(cacheKey, () => {
      // Build 4-week date ranges (current + 3 previous)
      const ranges: { label: string; dates: string[] }[] = [];
      // O(1) date → weekIndex lookup map
      const dateToWeekIdx = new Map<string, number>();

      for (let w = 3; w >= 0; w--) {
        const [y, m, dayN] = weekAnchorDate.split('-').map(Number);
        const anchor = new Date(y, m - 1, dayN);
        anchor.setDate(anchor.getDate() - w * 7);
        const mon = new Date(anchor);
        mon.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
        const weekDates: string[] = [];
        for (let i = 0; i < 7; i++) {
          const dt = new Date(mon);
          dt.setDate(mon.getDate() + i);
          const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
          weekDates.push(dateStr);
          // Populate O(1) lookup — rangeIndex 0..3, but queue order is w=3→0, so flip
          dateToWeekIdx.set(dateStr, 3 - w);
        }
        const label = w === 0 ? 'Now' : w === 1 ? '-1w' : w === 2 ? '-2w' : '-3w';
        ranges.push({ label, dates: weekDates });
      }

      // Earliest date we care about (start of week w=3 ago)
      const earliestDate = ranges[0].dates[0];

      // FIX: Only scan logs within the 4-week window — skip older history entirely
      const relevantLogs = gymLogs.filter(log => log.date >= earliestDate);

      // For each exercise, compute max est1RM per week
      const exWeeklyRMs: Record<string, { muscle: string; weeks: number[] }> = {};
      for (const log of relevantLogs) {
        const weekIdx = dateToWeekIdx.get(log.date); // O(1) ← was O(weeks×7)
        if (weekIdx === undefined) continue;
        for (const ex of log.exercises ?? []) {
          if (ex.skipped) continue;
          const completed = (ex.setsLog ?? []).filter((s: any) => s.completed && Number(s.weight) > 0);
          if (!completed.length) continue;
          const rm = Math.max(0, ...completed.map((s: any) => epley1RM(Number(s.weight) || 0, Number(s.reps) || 0)));
          if (!exWeeklyRMs[ex.name]) {
            exWeeklyRMs[ex.name] = { muscle: canonicalizeMuscle(ex.muscle), weeks: [0, 0, 0, 0] };
          }
          if (rm > exWeeklyRMs[ex.name].weeks[weekIdx]) {
            exWeeklyRMs[ex.name].weeks[weekIdx] = rm;
          }
        }
      }

      return Object.entries(exWeeklyRMs)
        .filter(([, v]) => v.weeks[3] > 0) // must have current-week data
        .sort(([, a], [, b]) => b.weeks[3] - a.weeks[3])
        .slice(0, 4)
        .map(([name, v]) => ({
          name,
          muscle: v.muscle,
          weeks: ranges.map((r, i) => ({ label: r.label, est1RM: v.weeks[i] })),
          currentRM: v.weeks[3],
          prevRM: v.weeks[2] || v.weeks[1] || v.weeks[0] || 0,
          color: muscleColors[v.muscle] ?? tokens.accent.secondary,
        }));
    });
  }, [gymLogs, weekAnchorDate, muscleColors, tokens.accent.secondary]);

  // ── Heatmap data (90 days of volume) ─────────────────────────────────────
  // FIX 2: Wrapped in computeOrGetHotCache — previously the only heavy memo
  // NOT protected by the hot cache. Every Firestore snapshot (which replaces
  // gymLogs by reference) caused a full re-scan of all 90+ historical sessions.
  const heatmapData = useMemo(() => {
    const cacheKey = `weekly_report_heatmap_${generateDatasetFingerprint(gymLogs)}`;
    return computeOrGetHotCache(cacheKey, () => {
      return gymLogs.map(log => {
        const vol = (log.exercises ?? []).reduce((sum: number, ex: any) => {
          if (ex.skipped) return sum;
          return sum + (ex.setsLog ?? [])
            .filter((s: any) => s.completed && !s.isWarmup)
            .reduce((s2: number, s: any) => s2 + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
        }, 0);
        return { date: log.date, volume: vol };
      });
    });
  }, [gymLogs]);

  // ── Muscle distribution data for donut chart ─────────────────────────────
  const muscleDonutData = useMemo(() => {
    return Object.entries(thisWeekMuscle).map(([muscle, stats]) => ({
      muscle,
      sets: stats.sets,
      color: muscleColors[muscle] ?? tokens.accent.secondary,
    }));
  }, [thisWeekMuscle, muscleColors, tokens.accent.secondary]);

  // ── Last week daily volume for trend overlay ──────────────────────────────
  const prevDailyVolume = useMemo(() => {
    const cacheKey = `weekly_prev_daily_vol_${weekAnchorDate}_${generateDatasetFingerprint(prevLogs)}`;
    return computeOrGetHotCache(cacheKey, () => {
      return prevDates.map(date => {
        const log = prevLogs.find(l => l.date?.slice(0, 10) === date);
        if (!log) return 0;
        return (log.exercises ?? []).reduce((sum: number, ex: any) => {
          if (ex.skipped) return sum;
          return sum + (ex.setsLog ?? [])
            .filter((s: any) => s.completed && !s.isWarmup)
            .reduce((s2: number, s: any) => s2 + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
        }, 0);
      });
    });
  }, [prevLogs, prevDates, weekAnchorDate]);

  // ── Story-Style Carousel Stats (Standalone fallback only; omitted in Analytics Hub) ──
  const carouselStats: WeeklyHighlightStats = useMemo(() => {
    if (weekScopedSummary) {
      return {
        thisWeekVolume: Math.round(weekScopedSummary.volumeKg),
        prevWeekVolume: Math.round(weekScopedSummary.prevVolumeKg),
        volumeDeltaPct: weekScopedSummary.volumeDeltaPct ?? 0,
        thisWeekSets: weekScopedSummary.setsCount,
        sessionCount: weekScopedSummary.sessionsCount,
        overloadRatePct: weekScopedSummary.overloadRatePct ?? 0,
        weightUnlocksCount: weekScopedSummary.weightUnlocks,
        repBuildsCount: weekScopedSummary.repBuilds,
        topPRs: weekScopedSummary.topLifts.slice(0, 3).map((l) => ({
          exerciseName: l.exerciseName,
          weight: l.weight,
          reps: l.reps,
          e1rm: l.e1rm,
          diffText: l.prLabel || undefined,
        })),
        muscleAdherence: [],
        overallAdherencePct: adherenceRate,
      };
    }

    const analytics = computeUnifiedAnalytics(gymLogs || []);
    const sc = analytics.weeklyScorecard;

    const weekPRs: Array<{ exerciseName: string; weight: number; reps: number; e1rm: number; diffText?: string }> = [];
    const weekPRMatches = analytics.recentPRs.filter(p => weekDates.includes(p.date));
    for (const pr of weekPRMatches) {
      const summary = analytics.allExercisePRs.find(e => e.exerciseName === pr.exerciseName);
      if (summary) {
        weekPRs.push({
          exerciseName: pr.exerciseName,
          weight: summary.heaviestWeight,
          reps: summary.heaviestWeightReps,
          e1rm: summary.bestE1RM,
          diffText: pr.diffText,
        });
      }
    }

    const muscleAdherence = displayMuscles.map(m => {
      const done = thisWeekMuscle[m]?.sets || 0;
      const target = plannedMuscleTargets[m] || 10;
      let status: 'balanced' | 'lagging' | 'fatigue' = 'balanced';
      if (done < 6) status = 'lagging';
      else if (done > 20) status = 'fatigue';
      return {
        muscle: m,
        sets: done,
        target,
        status,
      };
    });

    return {
      thisWeekVolume: Math.round(totalVolume),
      prevWeekVolume: Math.round(prevTotalVolume),
      volumeDeltaPct: precomputedStats.volumeDeltaPct,
      thisWeekSets: totalSets,
      sessionCount: workoutDays,
      overloadRatePct: sc.evaluatedCount > 0 ? sc.overloadRatePct : 0,
      weightUnlocksCount: sc.weightUnlocks,
      repBuildsCount: sc.repBuilds,
      topPRs: weekPRs.slice(0, 3),
      muscleAdherence,
      overallAdherencePct: adherenceRate,
    };
  }, [
    weekScopedSummary,
    gymLogs,
    weekDates,
    displayMuscles,
    thisWeekMuscle,
    plannedMuscleTargets,
    totalVolume,
    prevTotalVolume,
    precomputedStats.volumeDeltaPct,
    totalSets,
    workoutDays,
    adherenceRate,
  ]);

  // ── GYM-GPT Weekly Intelligence Hook & State ──────────────────────────────
  const [aiAnalysis, setAiAnalysis] = useState<WeeklyGymAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAiCollapsed, setIsAiCollapsed] = useState(true);
  const [selectedDeepDiveEx, setSelectedDeepDiveEx] = useState<string | null>(null);

  const toggleAiCard = useCallback((collapsed: boolean) => {
    setIsAiCollapsed(collapsed);
  }, []);

  const loadWeeklyAnalysis = useCallback(async (force = false) => {
    if (!hasData) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await getOrGenerateWeeklyGymAnalysis(
        gymLogs,
        weekAnchorDate,
        userGymPlan,
        undefined,
        force,
        precomputedStats,
      );
      if (res.analysis) {
        setAiAnalysis(res.analysis);
      } else if (res.error) {
        setAiError(res.error);
      }
    } catch (e: any) {
      setAiError(e?.message || 'Failed to generate analysis');
      console.warn('[WeeklyGymReport] AI load error:', e);
    } finally {
      setAiLoading(false);
    }
  }, [gymLogs, weekAnchorDate, userGymPlan, hasData, precomputedStats]);

  // Load from cache only (instant, 0ms).
  // NEVER auto-start Gemini generation automatically on view/render.
  // Generation only runs when the user explicitly taps 'Generate Weekly Scientific Report' or 'Retry'.
  useEffect(() => {
    let isCurrent = true;
    setAiLoading(false);
    setAiError(null);
    setIsAiCollapsed(true);

    getCachedWeeklyGymAnalysis(weekAnchorDate).then((cached: WeeklyGymAnalysis | null) => {
      if (!isCurrent) return;
      if (cached) {
        setAiAnalysis(cached);
      } else {
        setAiAnalysis(null);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [weekAnchorDate]);

  const reportBody = (
    <View style={st.container}>
      {/* ── Title Header ──────────────────────────────────────────────────── */}
      {!hideHeader && (
        <View style={st.titleRow}>
          <View>
            <Text style={st.title}>Weekly Recap</Text>
            <Text style={st.subtitle}>
              {dateRangeStr ? `${dateRangeStr} • ` : ''}{workoutDays}/{plannedWorkoutDaysCount} Days Trained
            </Text>
          </View>
        </View>
      )}

      {!hasData ? (
        hideEmptyCard ? null : (
          <View style={st.emptyCard}>
            <Dumbbell size={42} color={(isDark ? DARK_TOKENS : LIGHT_TOKENS).text.muted} strokeWidth={ICON.strokeWidth} />
            <Text style={st.emptyText}>No workouts logged this week yet.</Text>
            <Text style={st.emptySubtext}>
              Log your workouts during the week and your full analytics and progress rings will populate here.
            </Text>
          </View>
        )
      ) : (
        <>
          {/* 1. ── Global KPI Stats (Sessions, Total Sets, Total Volume) ────── */}
          {!hideKpiRow && (
            <View style={st.statsRow}>
              <View style={st.statCard}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <RollingNumber
                    value={workoutDays}
                    replayKey={replayKey}
                    cycles={0}
                    durationMs={420}
                    style={st.statValue}
                  />
                  <NumericText style={st.statSuffix}>/{plannedWorkoutDaysCount}</NumericText>
                </View>
                <Text style={st.statLabel}>Sessions</Text>
                <ChangeBadge delta={workoutDays - prevWorkoutDays} unit="d" />
              </View>

              <View style={st.statCard}>
                <RollingNumber
                  value={totalSets}
                  replayKey={replayKey}
                  cycles={1}
                  durationMs={480}
                  style={st.statValue}
                />
                <Text style={st.statLabel}>Total Sets</Text>
                <ChangeBadge delta={totalSets - prevTotalSets} unit="s" />
              </View>

              <View style={st.statCard}>
                {(() => {
                  const volFmt = formatVolumeParts(totalVolume, unitIsLbs);
                  const diffFmt = formatVolumeParts(Math.abs(totalVolume - prevTotalVolume), unitIsLbs);
                  const deltaNum = parseFloat(diffFmt.numStr.replace(/[^0-9.]/g, '')) || 0;
                  const signedDelta = totalVolume >= prevTotalVolume ? deltaNum : -deltaNum;
                  return (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <RollingNumber
                          value={volFmt.numStr}
                          replayKey={replayKey}
                          cycles={1}
                          durationMs={580}
                          style={st.statValue}
                        />
                        <NumericText style={st.statSuffix}> {volFmt.suffix}</NumericText>
                      </View>
                      <Text style={st.statLabel}>Volume</Text>
                      <ChangeBadge
                        delta={signedDelta}
                        unit={volFmt.numStr.endsWith('k') ? 'k' : ''}
                      />
                    </>
                  );
                })()}
              </View>
            </View>
          )}

          {/* Standalone Highlights Carousel & Body Map ONLY when rendered outside Analytics Hub */}
          {!weekScopedSummary ? (
            <>
              <WeeklyHighlightsCarousel
                stats={carouselStats}
                onSelectExercise={name => setSelectedDeepDiveEx(name)}
              />
              <AnatomicalBodyMapCard
                gymLogs={weekLogs}
                weekAnchorDate={weekAnchorDate}
                variant="weekly"
                defaultMode="volume"
              />
            </>
          ) : null}

          {/* Volume Trend (Mon–Sun vs last week) */}
          <VolumeTrendLine
            thisWeek={weekScopedSummary ? weekScopedSummary.dailyVolume : dailyVolume}
            lastWeek={weekScopedSummary ? weekScopedSummary.prevDailyVolume : prevDailyVolume}
            height={138}
            replayKey={replayKey}
          />

          {/* Muscles Trained (Compact Bars + Direct Deep Link to Body Map) */}
          {((weekScopedSummary ? weekScopedSummary.trainedMuscles : trainedMuscles).length > 0) && (() => {
            const muscleRows = weekScopedSummary ? weekScopedSummary.trainedMuscles : trainedMuscles;
            const totalS = weekScopedSummary ? weekScopedSummary.setsCount : totalSets;
            const activeTokens = isDark ? DARK_TOKENS : LIGHT_TOKENS;
            const layer2Card = isDark ? '#0F1015' : activeTokens.bg.surface;
            return (
              <View
                style={[
                  st.muscleDistributionCard,
                  {
                    backgroundColor: layer2Card,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: activeTokens.border.subtle,
                    marginTop: 0,
                    marginBottom: 10,
                  },
                ]}
              >
                <View style={st.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.cardSectionLabel}>MUSCLES TRAINED</Text>
                    <NumericText style={st.cardSubLabel}>
                      {muscleRows.length} muscle groups · {totalS} working sets
                    </NumericText>
                  </View>
                  {onPressBodyMap ? (
                    <TactileButton
                      variant="custom"
                      haptic="light"
                      onPress={onPressBodyMap}
                      hitSlop={TOUCH.hitSlop}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 2 }}
                    >
                      <Text style={{ fontSize: 12, fontFamily: FONT_FAMILY.bold, color: activeTokens.accent.primary }}>
                        Body Map
                      </Text>
                      <ChevronRight size={13} color={activeTokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                    </TactileButton>
                  ) : null}
                </View>

                <View style={st.muscleProgressList}>
                  {muscleRows.slice(0, 6).map((item, mIdx) => {
                    const maxSets = muscleRows[0]?.sets || 1;
                    const ratio = Math.min(1, item.sets / maxSets);
                    return (
                      <View key={item.muscle} style={st.muscleProgressItem}>
                        <View style={st.muscleProgressLabelRow}>
                          <Text style={st.muscleProgressName}>{item.muscle}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <NumericText style={st.muscleProgressStat}>
                              {item.sets} {item.sets === 1 ? 'set' : 'sets'} ·{' '}
                            </NumericText>
                            <NumericText style={[st.muscleProgressStat, { color: activeTokens.text.muted }]}>
                              {item.pctOfTotal}%
                            </NumericText>
                          </View>
                        </View>
                        <AnimatedProgressBar
                          progress={ratio}
                          height={6}
                          borderRadius={RADIUS.xs}
                          delayMs={mIdx * 25}
                          durationMs={380}
                          replayKey={replayKey}
                          color={activeTokens.accent.primary}
                          trackColor={activeTokens.bg.elevated}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })()}

          {/* Top Lifts & Real PRs (Selected Week Only — Zero Fake Fallbacks) */}
          {weekScopedSummary && weekScopedSummary.topLifts.length > 0 && (() => {
            const activeTokens = isDark ? DARK_TOKENS : LIGHT_TOKENS;
            const layer2Card = isDark ? '#0F1015' : activeTokens.bg.surface;
            return (
              <View
                style={[
                  st.muscleDistributionCard,
                  {
                    backgroundColor: layer2Card,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: activeTokens.border.subtle,
                    marginTop: 0,
                    marginBottom: 10,
                    gap: 4,
                  },
                ]}
              >
                <View style={[st.cardHeaderRow, { marginBottom: 6 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.cardSectionLabel}>TOP LIFTS THIS WEEK</Text>
                    <Text style={st.cardSubLabel}>Tap any lift for full history & PRs</Text>
                  </View>
                </View>

                {weekScopedSummary.topLifts.map((lift, lIdx) => {
                  const isLast = lIdx === weekScopedSummary.topLifts.length - 1;
                  return (
                    <TactileButton
                      key={lift.exerciseName}
                      variant="custom"
                      haptic="light"
                      onPress={() => setSelectedDeepDiveEx(lift.exerciseName)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 10,
                        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                        borderBottomColor: activeTokens.border.subtle,
                        gap: 10,
                      }}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{ fontSize: 13.5, fontFamily: FONT_FAMILY.bold, color: activeTokens.text.primary }}
                          numberOfLines={1}
                        >
                          {lift.exerciseName}
                        </Text>
                        <NumericText style={{ fontSize: 12, fontFamily: FONT_FAMILY.medium, color: activeTokens.text.secondary, marginTop: 2 }}>
                          {lift.weight > 0 ? `${formatWeight(lift.weight, unitIsLbs, 1)} × ${lift.reps}` : `BW × ${lift.reps} reps`}
                          {lift.muscle ? ` · ${lift.muscle}` : ''}
                        </NumericText>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {lift.prLabel ? (
                          <View
                            style={{
                              paddingHorizontal: 7,
                              paddingVertical: 3,
                              borderRadius: 6,
                              backgroundColor: activeTokens.status.successDim,
                            }}
                          >
                            <Text style={{ fontSize: 10.5, fontFamily: FONT_FAMILY.bold, color: activeTokens.status.success }}>
                              {lift.prLabel}
                            </Text>
                          </View>
                        ) : lift.e1rm > 0 ? (
                          <NumericText style={{ fontSize: 11.5, fontFamily: FONT_FAMILY.medium, color: activeTokens.text.muted }}>
                            ~{formatWeight(lift.e1rm, unitIsLbs, 0)} 1RM
                          </NumericText>
                        ) : null}
                        <ChevronRight size={14} color={activeTokens.text.muted} strokeWidth={ICON.strokeWidth} />
                      </View>
                    </TactileButton>
                  );
                })}
              </View>
            );
          })()}

          {/* Standalone Strength Progression Sparklines (Outside Analytics Hub) */}
          {!weekScopedSummary && strengthProgressionData.length > 0 && (
            <StrengthProgressionChart
              exercises={strengthProgressionData}
              replayKey={replayKey}
              onSelectExercise={name => {
                hapticLight();
                setSelectedDeepDiveEx(name);
              }}
            />
          )}

          {/* Weekly Summary Insights (Clean Plain Language) */}
          {(() => {
            const activeTokens = isDark ? DARK_TOKENS : LIGHT_TOKENS;
            const layer2Card = isDark ? '#0F1015' : activeTokens.bg.surface;
            return (
              <View
                style={[
                  st.aiCard,
                  isAiCollapsed && st.aiCardCollapsed,
                  {
                    backgroundColor: layer2Card,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: activeTokens.border.subtle,
                    marginBottom: 10,
                  },
                ]}
              >
                <TactileButton
                  variant="custom"
                  haptic="none"
                  style={[st.aiCardHeader, isAiCollapsed && st.aiCardHeaderCollapsed]}
                  onPress={() => {
                    hapticLight();
                    toggleAiCard(!isAiCollapsed);
                  }}
                  hitSlop={TOUCH.hitSlop}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                    <View style={st.aiSparkleBadge}>
                      <Sparkles size={15} color={activeTokens.accent.secondary} strokeWidth={ICON.strokeWidth} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={st.aiSectionTitle} numberOfLines={1}>WEEKLY INSIGHTS</Text>
                      <Text style={st.aiSectionSubtitle} numberOfLines={1}>
                        {aiAnalysis?.headline || 'Takeaways & next-week focus'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {aiAnalysis && (
                      <View style={st.aiScoreBadge}>
                        <NumericText style={st.aiScoreBadgeText}>
                          {aiAnalysis.scoreGrade} · {aiAnalysis.score}%
                        </NumericText>
                      </View>
                    )}
                    <View style={st.aiFoldBtn}>
                      {isAiCollapsed ? (
                        <ChevronDown size={14} color={activeTokens.text.muted} strokeWidth={ICON.strokeWidth} />
                      ) : (
                        <ChevronUp size={14} color={activeTokens.text.muted} strokeWidth={ICON.strokeWidth} />
                      )}
                    </View>
                  </View>
                </TactileButton>

                {!isAiCollapsed && (
                  aiLoading ? (
                    <View style={st.aiLoadingState}>
                      <ActivityIndicator size="small" color={activeTokens.accent.secondary} />
                      <Text style={st.aiLoadingText}>Building weekly summary...</Text>
                    </View>
                  ) : aiError ? (
                    <View style={st.aiErrorState}>
                      <AlertCircle size={18} color={activeTokens.status.danger} strokeWidth={ICON.strokeWidth} />
                      <Text style={st.aiErrorText}>Could not load summary. Try again.</Text>
                      <TactileButton
                        variant="custom"
                        haptic="none"
                        style={st.aiErrorRetryBtn}
                        onPress={() => { hapticLight(); loadWeeklyAnalysis(true); }}
                        hitSlop={TOUCH.hitSlop}
                      >
                        <RefreshCw size={13} color={activeTokens.accent.secondary} strokeWidth={ICON.strokeWidth} />
                        <Text style={st.aiErrorRetryText}>Retry</Text>
                      </TactileButton>
                    </View>
                  ) : aiAnalysis ? (
                    <View style={st.aiContent}>
                      <View style={st.aiHeroBlock}>
                        <FormattedText
                          text={aiAnalysis.verdict || aiAnalysis.headline}
                          style={st.aiVerdict}
                          boldColor={activeTokens.text.primary}
                        />
                      </View>

                      {aiAnalysis.nextWeekDirectives && aiAnalysis.nextWeekDirectives.length > 0 && (
                        <View style={st.aiBlock}>
                          <View style={st.aiBlockHeader}>
                            <Flag size={13} color={activeTokens.accent.secondary} strokeWidth={ICON.strokeWidth} />
                            <Text style={[st.aiBlockTitle, { color: activeTokens.accent.secondary }]}>
                              NEXT WEEK FOCUS
                            </Text>
                          </View>

                          <View style={{ gap: 8, marginTop: 4 }}>
                            {aiAnalysis.nextWeekDirectives.slice(0, 2).map((directive, idx) => (
                              <View key={idx} style={st.aiDirectiveCard}>
                                <View style={st.aiDirectiveNumPill}>
                                  <NumericText style={st.aiDirectiveNumText}>0{idx + 1}</NumericText>
                                </View>
                                <FormattedText
                                  text={directive}
                                  style={st.aiDirectiveText}
                                  boldColor={activeTokens.text.primary}
                                />
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={st.aiPromptState}>
                      <Text style={st.aiPromptTitle}>Weekly Training Summary</Text>
                      <Text style={st.aiPromptSub}>
                        Get clear targets for your next week based on this week's logged sets.
                      </Text>
                      <TactileButton
                        variant="custom"
                        haptic="none"
                        style={st.aiGenerateBtn}
                        onPress={() => {
                          hapticMedium();
                          loadWeeklyAnalysis(false);
                        }}
                      >
                        <Sparkles size={16} color={colors.accentPrimary} strokeWidth={ICON.strokeWidth} />
                        <Text style={st.aiGenerateBtnText}>Build Weekly Summary</Text>
                      </TactileButton>
                    </View>
                  )
                )}
              </View>
            );
          })()}

          {/* Compact Cardio Strip (Only when cardio > 0) */}
          {(() => {
            const cardio = weekScopedSummary ? weekScopedSummary.cardio : cardioSummary;
            if (!cardio || cardio.sessions <= 0) return null;
            const activeTokens = isDark ? DARK_TOKENS : LIGHT_TOKENS;
            const layer2Card = isDark ? '#0F1015' : activeTokens.bg.surface;
            return (
              <View
                style={[
                  st.cardioCard,
                  {
                    backgroundColor: layer2Card,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: activeTokens.border.subtle,
                    marginBottom: 10,
                    paddingVertical: 14,
                  },
                ]}
              >
                <View style={[st.cardioHeaderRow, { marginBottom: 10 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Flame size={14} color={activeTokens.status.warning} strokeWidth={ICON.strokeWidth} />
                    <Text style={st.cardioSectionTitle}>CARDIO</Text>
                  </View>
                  <NumericText style={{ fontSize: 11.5, fontFamily: FONT_FAMILY.medium, color: activeTokens.text.secondary }}>
                    {cardio.sessions} {cardio.sessions === 1 ? 'session' : 'sessions'} · ~{cardio.estCalories} kcal
                  </NumericText>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <NumericText style={st.cardioPodValue}>{cardio.totalMinutes}m</NumericText>
                    <Text style={st.cardioPodLabel}>Time</Text>
                  </View>
                  <View style={{ width: StyleSheet.hairlineWidth, height: 26, backgroundColor: activeTokens.border.subtle }} />
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <NumericText style={st.cardioPodValue}>{cardio.totalKm} km</NumericText>
                    <Text style={st.cardioPodLabel}>Distance</Text>
                  </View>
                  <View style={{ width: StyleSheet.hairlineWidth, height: 26, backgroundColor: activeTokens.border.subtle }} />
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <NumericText style={st.cardioPodValue}>{cardio.avgDuration > 0 ? `${cardio.avgDuration}m` : '—'}</NumericText>
                    <Text style={st.cardioPodLabel}>Avg / Session</Text>
                  </View>
                </View>
              </View>
            );
          })()}


          {/* ── Single-Exercise Deep-Dive Inspector Modal ────────────────────── */}
          <ExerciseDeepDiveModal
            visible={!!selectedDeepDiveEx}
            exerciseName={selectedDeepDiveEx}
            gymLogs={gymLogs}
            initialTab="analytics"
            onClose={() => setSelectedDeepDiveEx(null)}
          />
        </>
      )}

      <View style={{ height: 40 }} />
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        bounces={true}
      >
        {reportBody}
      </ScrollView>
    );
  }

  return reportBody;
});

export default WeeklyGymReport;

// ── Styles ───────────────────────────────────────────────────────────────────
