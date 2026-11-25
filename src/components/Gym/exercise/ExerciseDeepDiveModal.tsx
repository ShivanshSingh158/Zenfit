/**
 * ExerciseDeepDiveModal.tsx — ZenTrack Mobile
 *
 * 5-Card Intelligence Progression & Analytics Inspector Modal
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronRight,
  Dumbbell,
  Flag,
  PlayCircle,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet from '../../ui/BottomSheet';
import { NumericText, TactileButton, AnimatedProgressBar } from '../../ui';
import { RADIUS, FONT_FAMILY, ICON, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';
import { useResponsiveMetrics } from '../../../theme/responsive';
import { useTheme } from '../../../contexts/ThemeContext';
import { normalizeExerciseKey, resolveExerciseTargetMuscle, resolveMuscleColor } from '../../../utils/gymUtils';
import { estimate1RM } from '../../../services/oneRepMaxEngine';
import { inferExerciseMeta } from '../../../utils/progressionEngine';
import { getOverloadSuggestion, OverloadSuggestion } from '../../../utils/progressiveOverload';
import { GymDayLog } from '../../../types/gym.types';
import { computeOrGetHotCache, generateDatasetFingerprint } from '../../../utils/hotCacheStore';
import { parseLocalDate } from '../../../utils/dateCore';
import { useLatestNonNull } from '../../../hooks/useLatestNonNull';
import { useWeightUnit, kgToDisplay, unitLabel } from '../../../utils/weightUnit';
import ExerciseAnimationCard from './ExerciseAnimationCard';

interface Props {
  visible: boolean;
  exerciseName: string | null;
  exercise?: any;
  gymLogs: GymDayLog[];
  overloadSuggestion?: OverloadSuggestion | any | null;
  initialTab?: 'guide' | 'analytics';
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
  initialTab = 'guide',
  onClose,
}: Props) {
  const { tokens, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);
  const insets = useSafeAreaInsets();
  const activeName = useLatestNonNull(exerciseName);
  const activeExercise = useLatestNonNull(exercise);
  const [activeTab, setActiveTab] = useState<'guide' | 'analytics'>(initialTab);
  const [isContentReady, setIsContentReady] = useState(visible);

  useEffect(() => {
    if (visible) {
      setIsContentReady(true);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && initialTab) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  const [chartTab, setChartTab] = useState<ChartTab>('weight');
  const targetKey = useMemo(() => normalizeExerciseKey(activeName || exerciseName || ''), [activeName, exerciseName]);
  const [sheetSettled, setSheetSettled] = useState(false);

  React.useEffect(() => {
    if (!visible) {
      setSheetSettled(false);
      return;
    }
    const timer = setTimeout(() => {
      setSheetSettled(true);
    }, 190);
    return () => clearTimeout(timer);
  }, [visible]);

  const historySessions = useMemo<ProcessedSession[]>(() => {
    if (!targetKey || !visible || !sheetSettled) return [];
    const cacheKey = `ex_deepdive_v3_${targetKey}_${generateDatasetFingerprint(gymLogs)}`;

    const cached = computeOrGetHotCache(cacheKey, () => {
      const rawSessions: Array<Omit<ProcessedSession, 'daysAgo'> & { sessionDateMs: number }> = [];
      const sorted = (gymLogs || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));

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

              const parsedDate = log.date ? parseLocalDate(String(log.date).slice(0, 10)) : null;
              const sessionDateMs = parsedDate ? parsedDate.getTime() : NaN;

              rawSessions.push({
                date: log.date,
                sessionDateMs,
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
      return rawSessions;
    });

    // Compute relative daysAgo outside hot cache so cached history stays accurate across calendar days
    const nowMidnight = new Date();
    nowMidnight.setHours(0, 0, 0, 0);
    const nowMs = nowMidnight.getTime();
    return cached.map((s) => ({
      date: s.date,
      daysAgo: Number.isNaN(s.sessionDateMs)
        ? 0
        : Math.max(0, Math.round((nowMs - s.sessionDateMs) / 86400000)),
      topWeight: s.topWeight,
      totalVolume: s.totalVolume,
      totalReps: s.totalReps,
      oneRM: s.oneRM,
      bestSet: s.bestSet,
      sets: s.sets,
    }));
  }, [gymLogs, targetKey, visible, sheetSettled]);

  const inferredMeta = useMemo(() => {
    const initialWeight =
      Number(exercise?.topWeight) ||
      Number(exercise?.lastSessionSets?.[0]?.weight) ||
      0;
    return inferExerciseMeta(
      {
        name: exerciseName || '',
        primaryMuscle: exercise?.muscle || exercise?.primaryMuscle,
        isCompound: exercise?.isCompound,
        targetSets: exercise?.targetSets || 3,
      },
      initialWeight
    );
  }, [exerciseName, exercise]);

  const overloadSuggestion = useMemo(() => {
    if (passedSuggestion) return passedSuggestion;
    if (!visible || !sheetSettled || !exerciseName) return null;

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
  }, [passedSuggestion, visible, sheetSettled, exerciseName, exercise, inferredMeta, historySessions, gymLogs]);

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

  const recent5Sessions = useMemo(() => {
    return historySessions.slice(-5).reverse();
  }, [historySessions]);

  const { clampChartWidth } = useResponsiveMetrics();
  const unitIsLbs = useWeightUnit();
  const uLabel = unitLabel(unitIsLbs);
  const chartWidth = clampChartWidth(72);
  const chartHeight = 135;

  const chartData = useMemo(() => {
    if (historySessions.length < 2) return null;
    const pts = historySessions.slice(-8);
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

  const missionProgress = useMemo(() => {
    if (!overloadSuggestion || historySessions.length === 0) {
      return { pct: 0, text: 'Log your first session to unlock target tracking' };
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

  if (!activeName) return null;

  const targetMuscle = resolveExerciseTargetMuscle(activeName, activeExercise?.muscle).targetMuscle || 'Muscles';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      fullHeight={true}
      noPadding={true}
      avoidKeyboard={false}
      sheetBackgroundColor={isDark ? '#0B0C10' : '#F8F8FA'}
    >
      <View
        style={[
          styles.modalCard,
          { paddingBottom: Math.max(insets.bottom + SPACE.lg, SPACE.xl + SPACE.xs) },
        ]}
      >
        <View style={styles.modalHeader}>
          <View style={{ flex: 1, paddingRight: SPACE.sm }}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {activeName}
            </Text>
            <NumericText style={styles.modalSubtitle} numberOfLines={1}>
              {targetMuscle} • {inferredMeta.equipment} {inferredMeta.isCompound ? 'Compound' : 'Isolation'} • Target: {activeExercise?.targetSets || 3} × {activeExercise?.targetReps || '8-12'}
            </NumericText>
          </View>
          <TactileButton
            variant="custom"
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel="Close exercise deep dive"
          >
            <X size={16} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
          </TactileButton>
        </View>

        <View style={styles.topSegmentedControl}>
          <TactileButton
            variant="custom"
            haptic="selection"
            onPress={() => setActiveTab('guide')}
            style={[styles.topSegmentBtn, activeTab === 'guide' && styles.topSegmentBtnActive]}
          >
            <PlayCircle
              size={ICON.sm - 1}
              strokeWidth={ICON.strokeWidth}
              color={activeTab === 'guide' ? tokens.accent.onPrimary : tokens.text.secondary}
            />
            <Text style={[styles.topSegmentText, activeTab === 'guide' && styles.topSegmentTextActive]}>
              Form & Guide
            </Text>
          </TactileButton>

          <TactileButton
            variant="custom"
            haptic="selection"
            onPress={() => setActiveTab('analytics')}
            style={[styles.topSegmentBtn, activeTab === 'analytics' && styles.topSegmentBtnActive]}
          >
            <Activity
              size={ICON.sm - 1}
              strokeWidth={ICON.strokeWidth}
              color={activeTab === 'analytics' ? tokens.accent.onPrimary : tokens.text.secondary}
            />
            <NumericText style={[styles.topSegmentText, activeTab === 'analytics' && styles.topSegmentTextActive]}>
              Analytics & PRs{historySessions.length > 0 ? ` (${historySessions.length})` : ''}
            </NumericText>
          </TactileButton>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          contentContainerStyle={styles.scrollContent}
        >
          {!isContentReady ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACE.xxl * 2 }}>
              <ActivityIndicator size="small" color={tokens.accent.primary} />
            </View>
          ) : activeTab === 'guide' ? (
            <>
              <ExerciseAnimationCard
                exerciseName={exerciseName}
                showInstructions={true}
                showBadges={false}
                isEmbedded={true}
                animationHeight={220}
                style={{ borderRadius: RADIUS.card }}
              />

              <View style={styles.metaStripCard}>
                <View style={styles.metaStripItem}>
                  <Text style={styles.metaStripLabel}>TARGET</Text>
                  <NumericText style={styles.metaStripValue}>
                    {exercise?.targetSets || 3} × {exercise?.targetReps || '8-12'}
                  </NumericText>
                </View>
                <View style={styles.metaStripDivider} />
                <View style={styles.metaStripItem}>
                  <Text style={styles.metaStripLabel}>REST</Text>
                  <NumericText style={styles.metaStripValue}>
                    {exercise?.restTimeSecs || 90}s
                  </NumericText>
                </View>
                <View style={styles.metaStripDivider} />
                <View style={styles.metaStripItem}>
                  <Text style={styles.metaStripLabel}>EQUIPMENT</Text>
                  <Text style={styles.metaStripValue}>
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

              {overloadSuggestion && historySessions.length > 0 && (
                <View style={styles.missionCard}>
                  <View style={styles.missionTopRow}>
                    <View style={styles.badgePill}>
                      {overloadSuggestion.state === 'WEIGHT_UNLOCK' ? (
                        <TrendingUp size={ICON.xs} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
                      ) : overloadSuggestion.state === 'PLATEAU_BREAK' ? (
                        <Zap size={ICON.xs} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
                      ) : overloadSuggestion.state === 'REACTIVE_DELOAD' ? (
                        <RefreshCw size={ICON.xs} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
                      ) : (
                        <Dumbbell size={ICON.xs} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
                      )}
                      <Text style={styles.badgePillText}>
                        {overloadSuggestion.badgeLabel || 'DOUBLE PROGRESSION'}
                      </Text>
                    </View>

                    <NumericText style={styles.missionTierLabel}>
                      Δ {kgToDisplay(inferredMeta.incrementKg, unitIsLbs)} {uLabel} steps
                    </NumericText>
                  </View>

                  <Text style={styles.missionHeadline}>
                    {overloadSuggestion.headline}
                  </Text>

                  <Text style={styles.missionSubheadline}>
                    {overloadSuggestion.subheadline}
                  </Text>

                  <View style={styles.progressBarWrapper}>
                    <AnimatedProgressBar
                      progress={missionProgress.pct / 100}
                      height={6}
                      borderRadius={4}
                      durationMs={480}
                      replayKey={visible ? exerciseName || '1' : '0'}
                      color={tokens.accent.primary}
                      trackColor={tokens.bg.elevated}
                      style={{ flex: 1 }}
                    />
                    <NumericText style={styles.progressPercentText}>{missionProgress.text}</NumericText>
                  </View>
                </View>
              )}

              {historySessions.length > 0 ? (
                <TactileButton
                  variant="custom"
                  haptic="selection"
                  style={styles.quickPrBanner}
                  onPress={() => setActiveTab('analytics')}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.xs + 2 }}>
                      <Trophy size={ICON.xs + 1} strokeWidth={ICON.strokeWidth} color={tokens.status.gold} />
                      <NumericText style={styles.quickPrTitle}>
                        Best: {lifetimePRs.bestSet.weight > 0 ? `${kgToDisplay(lifetimePRs.bestSet.weight, unitIsLbs)}${uLabel} × ${lifetimePRs.bestSet.reps}` : `${kgToDisplay(lifetimePRs.heaviestWeight, unitIsLbs)} ${uLabel}`} · {historySessions.length} sessions logged
                      </NumericText>
                    </View>
                    <Text style={styles.quickPrSubtitle}>
                      Tap to view trajectory curves, 1RM charts & history
                    </Text>
                  </View>
                  <ChevronRight size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
                </TactileButton>
              ) : (
                <View style={styles.quickPrBanner}>
                  <Sparkles size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} style={{ marginRight: SPACE.xs + 2 }} />
                  <Text style={[styles.quickPrSubtitle, { flex: 1 }]}>
                    Log your first set of this exercise to generate overload curves & PR tracking.
                  </Text>
                </View>
              )}
            </>
          ) : !sheetSettled ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACE.xxl * 2 }}>
              <ActivityIndicator size="small" color={tokens.accent.primary} />
            </View>
          ) : (
            historySessions.length > 0 ? (
              <>
                <Text style={styles.sectionHeading}>Performance Summary</Text>
                <View style={styles.prGrid}>
                  <View style={styles.prGridPill}>
                    <Text style={styles.prGridLabel}>HEAVIEST</Text>
                    <NumericText style={styles.prGridValue}>
                      {lifetimePRs.heaviestWeight > 0 ? `${kgToDisplay(lifetimePRs.heaviestWeight, unitIsLbs)} ${uLabel}` : 'BW'}
                    </NumericText>
                    <Text style={styles.prGridSub}>Top load moved</Text>
                  </View>

                  <View style={styles.prGridPill}>
                    <Text style={styles.prGridLabel}>BEST SET</Text>
                    <NumericText style={styles.prGridValue} numberOfLines={1}>
                      {lifetimePRs.bestSet.weight > 0
                        ? `${kgToDisplay(lifetimePRs.bestSet.weight, unitIsLbs)}${uLabel} × ${lifetimePRs.bestSet.reps}`
                        : '—'}
                    </NumericText>
                    <Text style={styles.prGridSub}>Peak working set</Text>
                  </View>

                  <View style={styles.prGridPill}>
                    <Text style={styles.prGridLabel}>MAX VOLUME</Text>
                    <NumericText style={styles.prGridValue}>
                      {lifetimePRs.maxSessionVolume > 0 ? `${kgToDisplay(lifetimePRs.maxSessionVolume, unitIsLbs, 0).toLocaleString()} ${uLabel}` : '—'}
                    </NumericText>
                    <Text style={styles.prGridSub}>Single session tonnage</Text>
                  </View>

                  <View style={styles.prGridPill}>
                    <Text style={styles.prGridLabel}>EST. 1RM</Text>
                    <NumericText style={styles.prGridValue}>
                      {lifetimePRs.best1RM > 0 ? `${kgToDisplay(lifetimePRs.best1RM, unitIsLbs)} ${uLabel}` : '—'}
                    </NumericText>
                    <Text style={styles.prGridSub}>Power index</Text>
                  </View>
                </View>

                <View style={styles.chartHeaderRow}>
                  <Text style={[styles.sectionHeading, { marginBottom: 0 }]}>
                    Performance Trajectory
                  </Text>

                  <View style={styles.chartTabContainer}>
                    <TactileButton
                      variant="custom"
                      haptic="selection"
                      onPress={() => setChartTab('weight')}
                      style={[styles.chartTabBtn, chartTab === 'weight' && styles.chartTabBtnActive]}
                    >
                      <Text style={[styles.chartTabText, chartTab === 'weight' && styles.chartTabTextActive]}>Load</Text>
                    </TactileButton>

                    <TactileButton
                      variant="custom"
                      haptic="selection"
                      onPress={() => setChartTab('volume')}
                      style={[styles.chartTabBtn, chartTab === 'volume' && styles.chartTabBtnActive]}
                    >
                      <Text style={[styles.chartTabText, chartTab === 'volume' && styles.chartTabTextActive]}>Volume</Text>
                    </TactileButton>

                    <TactileButton
                      variant="custom"
                      haptic="selection"
                      onPress={() => setChartTab('1rm')}
                      style={[styles.chartTabBtn, chartTab === '1rm' && styles.chartTabBtnActive]}
                    >
                      <Text style={[styles.chartTabText, chartTab === '1rm' && styles.chartTabTextActive]}>1RM</Text>
                    </TactileButton>
                  </View>
                </View>

                {chartData ? (
                  <View style={styles.chartCard}>
                    <Svg width={chartWidth} height={chartHeight}>
                      <Line x1={20} y1={22} x2={chartWidth - 20} y2={22} stroke={tokens.charts.gridLine} strokeDasharray="4 4" />
                      <Line x1={20} y1={chartHeight / 2} x2={chartWidth - 20} y2={chartHeight / 2} stroke={tokens.charts.gridLine} strokeDasharray="4 4" />
                      <Path
                        d={chartData.pathD}
                        fill="none"
                        stroke={tokens.charts.primarySeries}
                        strokeWidth={2.5}
                      />
                      {chartData.coordinates.map((pt, i) => (
                        <Circle
                          key={i}
                          cx={pt.x}
                          cy={pt.y}
                          r={4}
                          fill={tokens.charts.primarySeries}
                        />
                      ))}
                    </Svg>
                    <View style={styles.chartXLabels}>
                      {chartData.coordinates.map((pt, i) => (
                        <NumericText key={i} style={styles.chartDateText}>{pt.date}</NumericText>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={styles.baselineBenchmarkBox}>
                    <Flag size={ICON.md} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.baselineTitle}>Baseline Established</Text>
                      <NumericText style={styles.baselineDesc}>
                        First session benchmark: {kgToDisplay(historySessions[0].topWeight, unitIsLbs)} {uLabel} • Total Volume: {kgToDisplay(historySessions[0].totalVolume, unitIsLbs, 0)} {uLabel} • Est 1RM: {kgToDisplay(historySessions[0].oneRM, unitIsLbs)} {uLabel}.
                      </NumericText>
                    </View>
                  </View>
                )}

                <Text style={styles.sectionHeading}>Set-by-Set Historical Timeline</Text>
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
                      <View key={sIdx} style={styles.timelineCard}>
                        <View style={styles.timelineTopRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.xs + 2 }}>
                            <NumericText style={styles.timelineDateText}>{session.date}</NumericText>
                            <NumericText style={styles.timelineRelativeDate}>({relativeDate})</NumericText>
                          </View>

                          <NumericText style={styles.timelineVolumeText}>
                            Vol: {kgToDisplay(session.totalVolume, unitIsLbs, 0).toLocaleString()} {uLabel} • {session.totalReps} reps
                          </NumericText>
                        </View>

                        <View style={styles.setChipsContainer}>
                          {session.sets.map((s, idx) => (
                            <View key={idx} style={styles.setChip}>
                              <NumericText style={styles.setChipText}>
                                Set {s.setNumber}: <NumericText style={styles.setChipHighlight}>{s.weight > 0 ? `${kgToDisplay(s.weight, unitIsLbs)}${uLabel}` : 'BW'} × {s.reps}</NumericText>
                              </NumericText>
                            </View>
                          ))}
                        </View>

                        {volDeltaPct !== null && (
                          <View style={styles.volDeltaRow}>
                            {volDeltaPct >= 0 ? (
                              <ArrowUpCircle size={ICON.xs} strokeWidth={ICON.strokeWidth} color={tokens.status.success} />
                            ) : (
                              <ArrowDownCircle size={ICON.xs} strokeWidth={ICON.strokeWidth} color={tokens.status.danger} />
                            )}
                            <NumericText
                              style={[
                                styles.volDeltaText,
                                { color: volDeltaPct >= 0 ? tokens.status.success : tokens.status.danger },
                              ]}
                            >
                              {volDeltaPct >= 0 ? `+${volDeltaPct}% Volume Increase` : `${volDeltaPct}% Volume Drop`} vs previous session
                            </NumericText>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <View style={styles.emptyStateCard}>
                <View style={styles.emptyIconCircle}>
                  <Dumbbell size={ICON.lg + 2} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
                </View>
                <Text style={styles.emptyStateTitle}>First Workout Pending</Text>
                <Text style={styles.emptyStateDesc}>
                  Log your first set of this exercise during a workout to unlock lifetime personal records, 1RM trajectory curves, and volume history.
                </Text>
                <View style={styles.emptyStateTargetBox}>
                  <NumericText style={styles.emptyStateTargetText}>
                    Recommended: {exercise?.targetSets || 3} sets × {exercise?.targetReps || '8–12'} reps
                  </NumericText>
                </View>
              </View>
            )
          )}
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

const makeStyles = (tokens: ThemeTokens, isDark: boolean) => {
  const cardBg = isDark ? '#14161D' : '#FFFFFF';
  const innerBg = isDark ? '#1B1E28' : tokens.bg.elevated;

  return StyleSheet.create({
  modalCard: {
    height: '100%',
    maxHeight: '100%',
    backgroundColor: 'transparent',
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.sm + 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACE.md + 2,
    borderBottomWidth: tokens.border.hairlineWidth,
    borderBottomColor: tokens.border.subtle,
  },
  modalTitle: {
    fontSize: tokens.fontSize.lg,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: tokens.fontSize.xs,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: SPACE.md,
    paddingBottom: SPACE.xxl + SPACE.sm,
    gap: SPACE.md,
  },

  missionCard: {
    padding: SPACE.md + 2,
    borderRadius: RADIUS.card,
    backgroundColor: cardBg,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
    gap: SPACE.xs + 2,
  },
  missionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs + 1,
    paddingHorizontal: SPACE.sm + 1,
    paddingVertical: SPACE.xs,
    borderRadius: RADIUS.sm,
    backgroundColor: tokens.accent.primaryDim,
  },
  badgePillText: {
    fontSize: 10.5,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: tokens.accent.primary,
  },
  missionTierLabel: {
    fontSize: tokens.fontSize.xs,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
  },
  missionHeadline: {
    fontSize: tokens.fontSize.base,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
    letterSpacing: -0.2,
  },
  missionSubheadline: {
    fontSize: tokens.fontSize.sm,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
    lineHeight: 16,
  },
  progressBarWrapper: {
    marginTop: SPACE.xs,
    gap: SPACE.xs,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: RADIUS.xs,
    backgroundColor: innerBg,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: RADIUS.xs,
    backgroundColor: tokens.accent.primary,
  },
  progressPercentText: {
    fontSize: tokens.fontSize.xs,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
    textAlign: 'right',
  },

  sectionHeading: {
    fontSize: tokens.fontSize.md,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
    letterSpacing: -0.2,
    marginTop: SPACE.xs + 2,
    marginBottom: SPACE.xs,
  },
  prGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.sm,
  },
  prGridPill: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: cardBg,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
    padding: SPACE.md,
    borderRadius: RADIUS.inner,
    gap: 2,
  },
  prGridLabel: {
    fontSize: tokens.fontSize.xs,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.secondary,
    letterSpacing: 0.3,
  },
  prGridValue: {
    fontSize: tokens.fontSize.lg,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
    letterSpacing: -0.3,
  },
  prGridSub: {
    fontSize: tokens.fontSize.xs,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.muted,
  },

  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACE.xs + 2,
    marginBottom: SPACE.xs,
  },
  chartTabContainer: {
    flexDirection: 'row',
    borderRadius: RADIUS.inner,
    backgroundColor: cardBg,
    padding: 3,
  },
  chartTabBtn: {
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.xs + 1,
    borderRadius: RADIUS.sm,
  },
  chartTabBtnActive: {
    backgroundColor: tokens.accent.primary,
  },
  chartTabText: {
    fontSize: tokens.fontSize.xs,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },
  chartTabTextActive: {
    color: tokens.accent.onPrimary,
    fontFamily: FONT_FAMILY.bold,
  },
  chartCard: {
    backgroundColor: cardBg,
    borderRadius: RADIUS.card,
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.sm,
    alignItems: 'center',
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  chartXLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '92%',
    marginTop: SPACE.xs + 2,
  },
  chartDateText: {
    fontSize: tokens.fontSize.xs,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
  },
  baselineBenchmarkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm + 2,
    padding: SPACE.md + 2,
    borderRadius: RADIUS.card,
    backgroundColor: cardBg,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  baselineTitle: {
    fontSize: tokens.fontSize.md,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  baselineDesc: {
    fontSize: tokens.fontSize.sm,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
    lineHeight: 16,
    marginTop: 2,
  },

  timelineList: {
    gap: SPACE.sm,
  },
  timelineCard: {
    backgroundColor: cardBg,
    padding: SPACE.md,
    borderRadius: RADIUS.card,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
    gap: SPACE.xs + 2,
  },
  timelineTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineDateText: {
    fontSize: tokens.fontSize.sm,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  timelineRelativeDate: {
    fontSize: tokens.fontSize.xs,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
  },
  timelineVolumeText: {
    fontSize: tokens.fontSize.xs,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
  },
  setChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs + 2,
  },
  setChip: {
    paddingHorizontal: SPACE.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm - 2,
    backgroundColor: innerBg,
  },
  setChipText: {
    fontSize: tokens.fontSize.xs,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
  },
  setChipHighlight: {
    color: tokens.text.primary,
    fontFamily: FONT_FAMILY.bold,
  },
  volDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    marginTop: 2,
  },
  volDeltaText: {
    fontSize: tokens.fontSize.xs,
    fontFamily: FONT_FAMILY.medium,
  },

  topSegmentedControl: {
    flexDirection: 'row',
    borderRadius: RADIUS.full,
    backgroundColor: cardBg,
    padding: 3,
    marginTop: SPACE.sm,
    marginBottom: SPACE.sm,
  },
  topSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs + 2,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.full,
  },
  topSegmentBtnActive: {
    backgroundColor: tokens.accent.primary,
  },
  topSegmentText: {
    fontSize: tokens.fontSize.sm,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },
  topSegmentTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.onPrimary,
  },
  metaStripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: cardBg,
    borderRadius: RADIUS.card,
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.sm,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  metaStripItem: {
    alignItems: 'center',
    gap: 2,
  },
  metaStripLabel: {
    fontSize: 9.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.secondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  metaStripValue: {
    fontSize: tokens.fontSize.sm,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  metaStripDivider: {
    width: tokens.border.hairlineWidth,
    height: 22,
    backgroundColor: tokens.border.subtle,
  },
  quickPrBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: cardBg,
    padding: SPACE.md,
    borderRadius: RADIUS.card,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  quickPrTitle: {
    fontSize: tokens.fontSize.sm,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  quickPrSubtitle: {
    fontSize: tokens.fontSize.xs,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cardBg,
    borderRadius: RADIUS.card,
    paddingVertical: SPACE.xxl,
    paddingHorizontal: SPACE.lg + 4,
    gap: SPACE.sm + 2,
    marginVertical: SPACE.md,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: tokens.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: tokens.fontSize.base,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  emptyStateDesc: {
    fontSize: tokens.fontSize.sm,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyStateTargetBox: {
    marginTop: SPACE.xs,
    paddingHorizontal: SPACE.md + 2,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.full,
    backgroundColor: innerBg,
  },
  emptyStateTargetText: {
    fontSize: tokens.fontSize.xs,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.primary,
  },
  });
};

export default ExerciseDeepDiveModal;
