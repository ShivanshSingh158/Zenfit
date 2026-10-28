/**
 * ExerciseDeepDiveModal.tsx — ZenTrack Mobile
 *
 * 5-Card Intelligence Progression & Analytics Inspector Modal
 * 1. Today's Progressive Overload Mission Card (Dynamic Double Progression & Unlock Progress)
 * 2. Lifetime Personal Records (4-Pill Grid: Heaviest, Best Set, Max Session Tonnage, Est. 1RM)
 * 3. Performance Trajectory Chart (Tabs: Top Weight, Volume Tonnage, Est. 1RM; Graceful 1-session baseline)
 * 4. Set-by-Set Historical Timeline (Last 5 Workouts with Delta % Tonnage & Rep Badges)
 * 5. Adaptive Reps & Load Target Calculator (Compounds: 1RM-12RM Ladder; Isolations: Hypertrophy Load Zones)
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONT_FAMILY, SPACE, FONT_SIZE, IOS_DARK } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { hapticLight, hapticSelection } from '../../../utils/haptics';
import { normalizeExerciseKey, resolveExerciseTargetMuscle, resolveMuscleColor } from '../../../utils/gymUtils';
import { estimate1RM, calculateRepMaxTable } from '../../../services/oneRepMaxEngine';
import { inferExerciseMeta } from '../../../utils/progressionEngine';
import { getOverloadSuggestion, OverloadSuggestion } from '../../../utils/progressiveOverload';
import { GymDayLog } from '../../../types/gym.types';
import { computeOrGetHotCache, generateDatasetFingerprint } from '../../../utils/hotCacheStore';
import ExerciseAnimationCard from './ExerciseAnimationCard';

interface Props {
  visible: boolean;
  exerciseName: string | null;
  exercise?: any;
  gymLogs: GymDayLog[];
  overloadSuggestion?: OverloadSuggestion | any | null;
  onClose: () => void;
}

type ChartTab = 'weight' | 'volume' | '1rm';

interface ProcessedSession {
  date: string;
  daysAgo: number;
  topWeight: number;
  totalVolume: number;
  totalReps: number;
  oneRM: number;
  bestSet: { weight: number; reps: number };
  sets: Array<{ setNumber: number; weight: number; reps: number; rir?: number }>;
}

export function ExerciseDeepDiveModal({
  visible,
  exerciseName,
  exercise,
  gymLogs,
  overloadSuggestion: passedSuggestion,
  onClose,
}: Props) {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'guide' | 'analytics'>('guide');
  const [chartTab, setChartTab] = useState<ChartTab>('weight');

  const targetKey = useMemo(() => normalizeExerciseKey(exerciseName || ''), [exerciseName]);

  // Extract all historical sessions for this exercise (chronological order)
  const historySessions = useMemo<ProcessedSession[]>(() => {
    if (!targetKey || !visible) return [];
    const cacheKey = `ex_deepdive_v2_${targetKey}_${generateDatasetFingerprint(gymLogs)}`;

    return computeOrGetHotCache(cacheKey, () => {
      const sessions: ProcessedSession[] = [];
      const sorted = (gymLogs || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      const nowMs = Date.now();

      for (const log of sorted) {
        for (const ex of log.exercises || []) {
          if (ex.skipped) continue;
          if (normalizeExerciseKey(ex.name) === targetKey) {
            const completedSets = (ex.setsLog || []).filter((s) => s.completed && !s.isWarmup && (Number(s.reps) || 0) > 0);
            if (completedSets.length > 0) {
              let totalVol = 0;
              let totalR = 0;
              let maxW = 0;
              let maxE1RM = 0;
              let bestS = { weight: 0, reps: 0 };

              const cleanSets = completedSets.map((s, idx) => {
                const w = Number(s.weight) || 0;
                const r = Number(s.reps) || 0;
                totalVol += w * r;
                totalR += r;
                if (w > maxW) maxW = w;
                const e1rm = estimate1RM(w, r, 'epley');
                if (e1rm > maxE1RM) {
                  maxE1RM = e1rm;
                  bestS = { weight: w, reps: r };
                }
                return {
                  setNumber: s.setNumber || idx + 1,
                  weight: w,
                  reps: r,
                  rir: s.rir,
                };
              });

              const sessionDateMs = new Date(log.date).getTime();
              const daysAgo = Number.isNaN(sessionDateMs)
                ? 0
                : Math.max(0, Math.round((nowMs - sessionDateMs) / (1000 * 3600 * 24)));

              sessions.push({
                date: log.date,
                daysAgo,
                topWeight: maxW,
                totalVolume: totalVol,
                totalReps: totalR,
                oneRM: Math.round(maxE1RM * 10) / 10,
                bestSet: bestS,
                sets: cleanSets,
              });
            }
          }
        }
      }
      return sessions;
    });
  }, [gymLogs, targetKey, visible]);

  // Inferred Biomechanics & Equipment
  const inferredMeta = useMemo(() => {
    return inferExerciseMeta(
      {
        name: exerciseName || '',
        primaryMuscle: exercise?.muscle || exercise?.primaryMuscle,
        isCompound: exercise?.isCompound,
        targetSets: exercise?.targetSets || 3,
      },
      historySessions[historySessions.length - 1]?.topWeight || 0
    );
  }, [exerciseName, exercise, historySessions]);

  // Progressive Overload Suggestion (use passed or calculate dynamically)
  const overloadSuggestion = useMemo(() => {
    if (passedSuggestion) return passedSuggestion;
    if (!exerciseName) return null;

    const lastW = historySessions[historySessions.length - 1]?.topWeight || 0;
    return getOverloadSuggestion(
      {
        id: exercise?.exerciseId || exercise?.id,
        name: exerciseName,
        isCompound: inferredMeta.isCompound,
        primaryMuscle: exercise?.muscle || exercise?.primaryMuscle,
        targetSets: exercise?.targetSets || 3,
        targetRepLow: 8,
        targetRepHigh: 12,
      },
      lastW,
      exercise?.targetSets || 3,
      String(exercise?.targetReps || '8-12'),
      gymLogs || []
    );
  }, [passedSuggestion, exerciseName, exercise, inferredMeta, historySessions, gymLogs]);

  // All-Time Lifetime PR Metrics
  const lifetimePRs = useMemo(() => {
    let heaviestWeight = 0;
    let bestSet = { weight: 0, reps: 0, e1RM: 0 };
    let maxSessionVolume = 0;
    let best1RM = 0;

    for (const s of historySessions) {
      if (s.topWeight > heaviestWeight) heaviestWeight = s.topWeight;
      if (s.totalVolume > maxSessionVolume) maxSessionVolume = s.totalVolume;
      if (s.oneRM > best1RM) {
        best1RM = s.oneRM;
        bestSet = { weight: s.bestSet.weight, reps: s.bestSet.reps, e1RM: s.oneRM };
      }
    }

    return {
      heaviestWeight,
      bestSet,
      maxSessionVolume,
      best1RM,
    };
  }, [historySessions]);

  // Scientific 1RM Table (for Compounds)
  const compoundRepMaxTable = useMemo(() => {
    return calculateRepMaxTable(lifetimePRs.best1RM || 0);
  }, [lifetimePRs.best1RM]);

  // Hypertrophy Load Target Table (for Isolations)
  const isolationRepTargets = useMemo(() => {
    const workingWeight = historySessions[historySessions.length - 1]?.topWeight || lifetimePRs.heaviestWeight || 20;
    const step = inferredMeta.incrementKg || 2.5;

    return [
      {
        zone: 'Strength / Heavy Hypertrophy',
        reps: '8–10 Reps',
        load: Math.round((workingWeight + step) * 10) / 10,
        desc: 'Overload stimulus (3-4 RIR buffer)',
      },
      {
        zone: 'Optimal Hypertrophy',
        reps: '10–12 Reps',
        load: workingWeight,
        desc: 'Current working anchor load',
      },
      {
        zone: 'Metabolic Stress / Burnout',
        reps: '15–20 Reps',
        load: Math.max(workingWeight < 10 ? 1 : step, Math.round((workingWeight - step) * 10) / 10),
        desc: 'High-rep sarcoplasmic volume',
      },
    ];
  }, [historySessions, lifetimePRs, inferredMeta]);

  // Last 5 Sessions (Newest first)
  const recent5Sessions = useMemo(() => {
    return historySessions.slice(-5).reverse();
  }, [historySessions]);

  // Chart Coordinates Builder
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(260, windowWidth - 72);
  const chartHeight = 135;

  const chartData = useMemo(() => {
    if (historySessions.length < 2) return null;
    const pts = historySessions.slice(-8); // Up to last 8 sessions
    const values = pts.map((p) =>
      chartTab === 'weight' ? p.topWeight : chartTab === 'volume' ? p.totalVolume : p.oneRM
    );

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const padX = 22;
    const padY = 22;
    const innerW = chartWidth - padX * 2;
    const innerH = chartHeight - padY * 2;

    const coordinates = pts.map((p, idx) => {
      const val = chartTab === 'weight' ? p.topWeight : chartTab === 'volume' ? p.totalVolume : p.oneRM;
      const x = padX + (idx / (pts.length - 1)) * innerW;
      const norm = maxVal === minVal ? 0.5 : (val - minVal) / range;
      const y = chartHeight - padY - norm * innerH;
      return { x, y, val, date: p.date.slice(5) };
    });

    let d = `M ${coordinates[0].x} ${coordinates[0].y}`;
    for (let i = 1; i < coordinates.length; i++) {
      d += ` L ${coordinates[i].x} ${coordinates[i].y}`;
    }

    return { coordinates, pathD: d, minVal, maxVal };
  }, [historySessions, chartTab, chartWidth]);

  // Mission Card Unlock Progress
  const missionProgress = useMemo(() => {
    if (!overloadSuggestion) {
      return { pct: 0, text: 'Establish baseline today' };
    }
    const totalTarget = overloadSuggestion.totalTargetReps || 36;
    const lastSession = historySessions[historySessions.length - 1];
    const lastReps = lastSession?.totalReps || 0;

    if (overloadSuggestion.state === 'WEIGHT_UNLOCK') {
      return { pct: 100, text: 'Ready to increase weight!' };
    }
    const calculatedPct = Math.min(95, Math.max(15, Math.round((lastReps / totalTarget) * 100)));
    return {
      pct: calculatedPct,
      text: `${calculatedPct}% to next weight tier`,
    };
  }, [overloadSuggestion, historySessions]);

  if (!visible || !exerciseName) return null;

  const targetMuscle = resolveExerciseTargetMuscle(exerciseName, exercise?.muscle).targetMuscle || 'Muscles';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: isDark ? '#1C1C1E' : colors.surface,
              borderWidth: 0,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {exerciseName}
              </Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                {targetMuscle} • {inferredMeta.equipment} {inferredMeta.isCompound ? 'Compound' : 'Isolation'} • Target: {exercise?.targetSets || 3} × {exercise?.targetReps || '8-12'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Top Segmented Mode Switcher (Apple HIG Capsule) ── */}
          <View style={[styles.topSegmentedControl, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
            <TouchableOpacity
              onPress={() => {
                hapticSelection();
                setActiveTab('guide');
              }}
              style={[styles.topSegmentBtn, activeTab === 'guide' && styles.topSegmentBtnActive]}
              activeOpacity={0.8}
            >
              <Ionicons
                name="play-circle-outline"
                size={15}
                color={activeTab === 'guide' ? (isDark ? '#FFFFFF' : '#000000') : '#8E8E93'}
              />
              <Text style={[styles.topSegmentText, activeTab === 'guide' && styles.topSegmentTextActive]}>
                Form & Guide
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                hapticSelection();
                setActiveTab('analytics');
              }}
              style={[styles.topSegmentBtn, activeTab === 'analytics' && styles.topSegmentBtnActive]}
              activeOpacity={0.8}
            >
              <Ionicons
                name="analytics-outline"
                size={15}
                color={activeTab === 'analytics' ? (isDark ? '#FFFFFF' : '#000000') : '#8E8E93'}
              />
              <Text style={[styles.topSegmentText, activeTab === 'analytics' && styles.topSegmentTextActive]}>
                Analytics & PRs{historySessions.length > 0 ? ` (${historySessions.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {activeTab === 'guide' ? (
              /* ══════════════════════════════════════════════════════════════════
                 TAB 1: FORM DEMO & BIOMECHANICAL EXECUTION GUIDE
                 ══════════════════════════════════════════════════════════════════ */
              <>
                {/* 1. Looping Form Animation GIF with Step-by-Step Execution Cues */}
                <ExerciseAnimationCard
                  exerciseName={exerciseName}
                  showInstructions={true}
                  showBadges={false}
                  isEmbedded={true}
                  animationHeight={220}
                  style={{ borderRadius: 16 }}
                />

                {/* 2. Biomechanical Spec Strip */}
                <View style={[styles.metaStripCard, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                  <View style={styles.metaStripItem}>
                    <Text style={styles.metaStripLabel}>TARGET</Text>
                    <Text style={[styles.metaStripValue, { color: colors.textPrimary }]}>
                      {exercise?.targetSets || 3} × {exercise?.targetReps || '8-12'}
                    </Text>
                  </View>
                  <View style={styles.metaStripDivider} />
                  <View style={styles.metaStripItem}>
                    <Text style={styles.metaStripLabel}>REST</Text>
                    <Text style={[styles.metaStripValue, { color: colors.textPrimary }]}>
                      {exercise?.restTimeSecs || 90}s
                    </Text>
                  </View>
                  <View style={styles.metaStripDivider} />
                  <View style={styles.metaStripItem}>
                    <Text style={styles.metaStripLabel}>EQUIPMENT</Text>
                    <Text style={[styles.metaStripValue, { color: colors.textPrimary }]}>
                      {inferredMeta.equipment}
                    </Text>
                  </View>
                  <View style={styles.metaStripDivider} />
                  <View style={styles.metaStripItem}>
                    <Text style={styles.metaStripLabel}>FOCUS</Text>
                    <Text style={[styles.metaStripValue, { color: resolveMuscleColor(targetMuscle) }]}>
                      {targetMuscle}
                    </Text>
                  </View>
                </View>

                {/* 3. Progressive Overload Mission Card */}
                {overloadSuggestion && (
                  <View style={styles.missionCard}>
                    <View style={styles.missionTopRow}>
                      <View style={styles.badgePill}>
                        <Ionicons
                          name={
                            overloadSuggestion.state === 'WEIGHT_UNLOCK'
                              ? 'trending-up'
                              : overloadSuggestion.state === 'PLATEAU_BREAK'
                              ? 'flash'
                              : overloadSuggestion.state === 'REACTIVE_DELOAD'
                              ? 'refresh'
                              : 'barbell-outline'
                          }
                          size={13}
                          color="#FFFFFF"
                        />
                        <Text style={styles.badgePillText}>
                          {overloadSuggestion.badgeLabel || 'DOUBLE PROGRESSION'}
                        </Text>
                      </View>

                      <Text style={styles.missionTierLabel}>
                        Δ {inferredMeta.incrementKg} kg steps
                      </Text>
                    </View>

                    <Text style={styles.missionHeadline}>
                      {overloadSuggestion.headline}
                    </Text>

                    <Text style={styles.missionSubheadline}>
                      {overloadSuggestion.subheadline}
                    </Text>

                    {/* Progress Bar toward next promotion */}
                    <View style={styles.progressBarWrapper}>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${missionProgress.pct}%`,
                              backgroundColor: '#FFFFFF',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressPercentText}>{missionProgress.text}</Text>
                    </View>
                  </View>
                )}

                {/* 4. Quick PR Snapshot Banner */}
                {historySessions.length > 0 ? (
                  <TouchableOpacity
                    style={[styles.quickPrBanner, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F2F2F7' }]}
                    onPress={() => {
                      hapticSelection();
                      setActiveTab('analytics');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.quickPrTitle}>
                        🏆 Best: {lifetimePRs.bestSet.weight > 0 ? `${lifetimePRs.bestSet.weight}kg × ${lifetimePRs.bestSet.reps}` : `${lifetimePRs.heaviestWeight} kg`} · {historySessions.length} sessions logged
                      </Text>
                      <Text style={styles.quickPrSubtitle}>
                        Tap to view trajectory curves, 1RM charts & history
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.quickPrBanner, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F2F2F7' }]}>
                    <Ionicons name="sparkles-outline" size={16} color="#8E8E93" style={{ marginRight: 6 }} />
                    <Text style={[styles.quickPrSubtitle, { flex: 1 }]}>
                      Log your first set of this exercise to generate overload curves & PR tracking.
                    </Text>
                  </View>
                )}
              </>
            ) : (
              /* ══════════════════════════════════════════════════════════════════
                 TAB 2: DEEP PERFORMANCE METRICS, TRAJECTORY & HISTORY
                 ══════════════════════════════════════════════════════════════════ */
              historySessions.length > 0 ? (
                <>
                  {/* CARD 1: PERFORMANCE SUMMARY METRICS */}
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Performance Summary</Text>
                  <View style={styles.prGrid}>
                    <View style={[styles.prGridPill, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                      <Text style={styles.prGridLabel}>HEAVIEST</Text>
                      <Text style={[styles.prGridValue, { color: '#FFFFFF' }]}>
                        {lifetimePRs.heaviestWeight > 0 ? `${lifetimePRs.heaviestWeight} kg` : 'BW'}
                      </Text>
                      <Text style={styles.prGridSub}>Top load moved</Text>
                    </View>

                    <View style={[styles.prGridPill, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                      <Text style={styles.prGridLabel}>BEST SET</Text>
                      <Text style={[styles.prGridValue, { color: '#FFFFFF' }]} numberOfLines={1}>
                        {lifetimePRs.bestSet.weight > 0
                          ? `${lifetimePRs.bestSet.weight}kg × ${lifetimePRs.bestSet.reps}`
                          : '—'}
                      </Text>
                      <Text style={styles.prGridSub}>Peak working set</Text>
                    </View>

                    <View style={[styles.prGridPill, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                      <Text style={styles.prGridLabel}>MAX VOLUME</Text>
                      <Text style={[styles.prGridValue, { color: '#FFFFFF' }]}>
                        {lifetimePRs.maxSessionVolume > 0 ? `${lifetimePRs.maxSessionVolume.toLocaleString()} kg` : '—'}
                      </Text>
                      <Text style={styles.prGridSub}>Single session tonnage</Text>
                    </View>

                    <View style={[styles.prGridPill, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                      <Text style={styles.prGridLabel}>EST. 1RM</Text>
                      <Text style={[styles.prGridValue, { color: '#FFFFFF' }]}>
                        {lifetimePRs.best1RM > 0 ? `${lifetimePRs.best1RM} kg` : '—'}
                      </Text>
                      <Text style={styles.prGridSub}>Power index</Text>
                    </View>
                  </View>

                  {/* CARD 2: PERFORMANCE TRAJECTORY CHART */}
                  <View style={styles.chartHeaderRow}>
                    <Text style={[styles.sectionHeading, { color: colors.textPrimary, marginBottom: 0 }]}>
                      Performance Trajectory
                    </Text>

                    <View style={[styles.chartTabContainer, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                      <TouchableOpacity
                        onPress={() => { hapticSelection(); setChartTab('weight'); }}
                        style={[styles.chartTabBtn, chartTab === 'weight' && styles.chartTabBtnActive]}
                      >
                        <Text style={[styles.chartTabText, chartTab === 'weight' && styles.chartTabTextActive]}>Load</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => { hapticSelection(); setChartTab('volume'); }}
                        style={[styles.chartTabBtn, chartTab === 'volume' && styles.chartTabBtnActive]}
                      >
                        <Text style={[styles.chartTabText, chartTab === 'volume' && styles.chartTabTextActive]}>Volume</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => { hapticSelection(); setChartTab('1rm'); }}
                        style={[styles.chartTabBtn, chartTab === '1rm' && styles.chartTabBtnActive]}
                      >
                        <Text style={[styles.chartTabText, chartTab === '1rm' && styles.chartTabTextActive]}>1RM</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {chartData ? (
                    <View style={[styles.chartCard, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                      <Svg width={chartWidth} height={chartHeight}>
                        <Line x1={20} y1={22} x2={chartWidth - 20} y2={22} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                        <Line x1={20} y1={chartHeight / 2} x2={chartWidth - 20} y2={chartHeight / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                        <Path
                          d={chartData.pathD}
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth={2.5}
                        />
                        {chartData.coordinates.map((pt, i) => (
                          <Circle
                            key={i}
                            cx={pt.x}
                            cy={pt.y}
                            r={4}
                            fill="#FFFFFF"
                          />
                        ))}
                      </Svg>
                      <View style={styles.chartXLabels}>
                        {chartData.coordinates.map((pt, i) => (
                          <Text key={i} style={styles.chartDateText}>{pt.date}</Text>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.baselineBenchmarkBox, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                      <Ionicons name="flag-outline" size={20} color="#FFFFFF" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.baselineTitle}>Baseline Established</Text>
                        <Text style={styles.baselineDesc}>
                          First session benchmark: {historySessions[0].topWeight} kg • Total Volume: {historySessions[0].totalVolume} kg • Est 1RM: {historySessions[0].oneRM} kg.
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* CARD 3: SET-BY-SET HISTORICAL TIMELINE */}
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Set-by-Set Historical Timeline</Text>
                  <View style={styles.timelineList}>
                    {recent5Sessions.map((session, sIdx) => {
                      const olderSession = recent5Sessions[sIdx + 1];
                      let volDeltaPct: number | null = null;
                      if (olderSession && olderSession.totalVolume > 0) {
                        volDeltaPct = Math.round(
                          ((session.totalVolume - olderSession.totalVolume) / olderSession.totalVolume) * 100
                        );
                      }

                      const relativeDate = session.daysAgo === 0 ? 'Today' : `${session.daysAgo}d ago`;

                      return (
                        <View
                          key={sIdx}
                          style={[
                            styles.timelineCard,
                            {
                              backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                            },
                          ]}
                        >
                          <View style={styles.timelineTopRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.timelineDateText}>{session.date}</Text>
                              <Text style={styles.timelineRelativeDate}>({relativeDate})</Text>
                            </View>

                            <Text style={styles.timelineVolumeText}>
                              Vol: {session.totalVolume.toLocaleString()} kg • {session.totalReps} reps
                            </Text>
                          </View>

                          <View style={styles.setChipsContainer}>
                            {session.sets.map((s, idx) => (
                              <View
                                key={idx}
                                style={[
                                  styles.setChip,
                                  { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                                ]}
                              >
                                <Text style={styles.setChipText}>
                                  Set {s.setNumber}: <Text style={{ color: '#FFFFFF', fontFamily: FONT_FAMILY.bold }}>{s.weight > 0 ? `${s.weight}kg` : 'BW'} × {s.reps}</Text>
                                </Text>
                              </View>
                            ))}
                          </View>

                          {volDeltaPct !== null && (
                            <View style={styles.volDeltaRow}>
                              <Ionicons
                                name={volDeltaPct >= 0 ? 'arrow-up-circle' : 'arrow-down-circle'}
                                size={14}
                                color={volDeltaPct >= 0 ? '#30D158' : '#FF453A'}
                              />
                              <Text
                                style={[
                                  styles.volDeltaText,
                                  { color: volDeltaPct >= 0 ? '#30D158' : '#FF453A' },
                                ]}
                              >
                                {volDeltaPct >= 0 ? `+${volDeltaPct}% Volume Increase` : `${volDeltaPct}% Volume Drop`} vs previous session
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : (
                /* Elegant Empty State Card for Exercises With No History */
                <View style={[styles.emptyStateCard, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="barbell-outline" size={26} color="#FFFFFF" />
                  </View>
                  <Text style={styles.emptyStateTitle}>First Workout Pending</Text>
                  <Text style={styles.emptyStateDesc}>
                    Log your first set of this exercise during a workout to unlock lifetime personal records, 1RM trajectory curves, and volume history.
                  </Text>
                  <View style={styles.emptyStateTargetBox}>
                    <Text style={styles.emptyStateTargetText}>
                      Recommended: {exercise?.targetSets || 3} sets × {exercise?.targetReps || '8-12'} reps (~2 RIR)
                    </Text>
                  </View>
                </View>
              )
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.body,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
    gap: 12,
  },

  // 1. Mission Card
  missionCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 6,
  },
  missionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  badgePillText: {
    fontSize: 10.5,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: '#FFFFFF',
  },
  missionTierLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.body,
    color: '#8E8E93',
  },
  missionHeadline: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  missionSubheadline: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.body,
    color: '#D1D1D6',
    lineHeight: 16,
  },
  progressBarWrapper: {
    marginTop: 4,
    gap: 4,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercentText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.body,
    color: '#8E8E93',
    textAlign: 'right',
  },

  // 2. PR Grid
  sectionHeading: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.2,
    marginTop: 6,
    marginBottom: 4,
  },
  prGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prGridPill: {
    flex: 1,
    minWidth: '46%',
    padding: 12,
    borderRadius: 12,
    gap: 2,
    borderWidth: 0,
  },
  prGridLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.3,
  },
  prGridValue: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.3,
  },
  prGridSub: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.body,
    color: '#636366',
  },

  // 3. Chart
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 4,
  },
  chartTabContainer: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 3,
  },
  chartTabBtn: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chartTabBtnActive: {
    backgroundColor: '#636366',
  },
  chartTabText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  chartTabTextActive: {
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY.bold,
  },
  chartCard: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 0,
  },
  chartXLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '92%',
    marginTop: 6,
  },
  chartDateText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.body,
    color: '#8E8E93',
  },
  baselineBenchmarkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 0,
  },
  baselineTitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  baselineDesc: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.body,
    color: '#8E8E93',
    lineHeight: 16,
    marginTop: 2,
  },

  // 4. Timeline
  timelineList: {
    gap: 8,
  },
  timelineCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 0,
    gap: 6,
  },
  timelineTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineDateText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  timelineRelativeDate: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.body,
    color: '#8E8E93',
  },
  timelineVolumeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.body,
    color: '#8E8E93',
  },
  setChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  setChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  setChipText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.body,
    color: '#A1A1A6',
  },
  volDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  volDeltaText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.medium,
  },

  // 5. Table
  tableCard: {
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 6,
  },
  tableCol: {
    flex: 1,
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  // New UI Styles for Top Segment Switcher, Meta Strip, & Empty State
  topSegmentedControl: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 3,
    marginBottom: 8,
  },
  topSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 999,
  },
  topSegmentBtnActive: {
    backgroundColor: '#3A3A3C',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  topSegmentText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  topSegmentTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  metaStripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  metaStripItem: {
    alignItems: 'center',
    gap: 2,
  },
  metaStripLabel: {
    fontSize: 9.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  metaStripValue: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  metaStripDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  quickPrBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
  },
  quickPrTitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  quickPrSubtitle: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.body,
    color: '#8E8E93',
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 10,
    marginVertical: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  emptyStateDesc: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.body,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyStateTargetBox: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  emptyStateTargetText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#D1D1D6',
  },
});

export default ExerciseDeepDiveModal;
