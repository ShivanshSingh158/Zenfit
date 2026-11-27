/**
 * AnatomicalBodyMapCard.tsx — ZenFit
 *
 * Full-Featured Dual-View (Front & Back) SVG Anatomical Muscle Heatmap & Recovery Map:
 * - 3 Interactive Modes: [ ⚡ Recovery | 📊 Volume | ⚖️ Symmetry ]
 * - High-precision vector paths for all 18 muscle groups + anatomical silhouettes.
 * - Interactive muscle touch selection with detailed biomechanical diagnostic breakdown.
 * - Educational "What this measures & Good vs Bad" intelligence card.
 * - Subtle, Apple iOS HIG aesthetics (no chunky pills, 0 outer borders).
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  Minus,
  Plus,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react-native';
import BottomSheet from '../../ui/BottomSheet';
import { LazySheet } from '../../../hooks/useLazySheetMount';
import { TactileButton } from '../../ui/TactileButton';
import { NumericText } from '../../ui/NumericText';
import { IOSSegmentedControl } from '../../ui/IOSSegmentedControl';
import { AnimatedProgressBar } from '../../ui/AnimatedProgressBar';
import { DARK_TOKENS, FONT_FAMILY, ICON, LIGHT_TOKENS, RADIUS, SPACE, TOUCH } from '../../../theme/tokens';
import { useResponsiveMetrics } from '../../../theme/responsive';
import { useTheme } from '../../../contexts/ThemeContext';
import { feedback } from '../../../utils/haptics';
import { generateDatasetFingerprint } from '../../../utils/hotCacheStore';
import { useGymPlan } from '../../../contexts/domains/WellnessContext';
const LazyAddToDaySheet = React.lazy(() =>
  import('../schedule/AddToDaySheet').then(m => ({ default: m.AddToDaySheet }))
);
import { resolvePlanDay } from '../../../data/gymPlan';
import { STATIC_BODY_SVG, CachedBodyView } from './muscleMapSvgCache';
import {
  MUSCLES,
  MUSCLE_NAME,
  MuscleSlug,
  calculateMuscleLoad,
  calculateMuscleFatigue,
  calculateSymmetryAndBalance,
  getDailyRecoveryRecommendations,
  getHypertrophyLandmarkInfo,
  calculateAntagonisticPairs,
  AntagonisticPairAnalysis,
  getTrainingWeekBounds,
} from '../../../services/muscleRecoveryService';
import { GymDayLog } from '../../../types/gym.types';

const IS_TINY_MUSCLE = new Set<MuscleSlug>([
  'serratus',
  'hip-flexors',
  'tibialis',
  'forearm',
  'calves',
  'obliques',
]);

const AnatomicalHeatmapPalette = {
  inertDark: '#18181B',
  inertLight: '#D1D1D6',
  strokeDark: '#09090B',
  untrainedBaseDark: '#27272A',
  untrainedBaseLight: '#E5E5EA',
  untrainedRecoveryDark: '#1C2E24',
  untrainedRecoveryLight: '#D1F2D9',
  volumeMrvRisk: '#FF9F0A',
  volumeMav: '#38BDF8',
  volumeMev: '#0A84FF',
  volumeBelowMev: '#0055D4',
} as const;

const InertSilhouetteLayer = React.memo(function InertSilhouetteLayer({
  inertD,
  isDark,
}: {
  inertD: string;
  isDark: boolean;
}) {
  const inertColor = isDark ? AnatomicalHeatmapPalette.inertDark : AnatomicalHeatmapPalette.inertLight;
  if (!inertD) return null;
  return <Path d={inertD} fill={inertColor} pointerEvents="none" />;
});

const MemoizedMuscleGroup = React.memo<{
  slug: MuscleSlug;
  d: string;
  fill: string;
  isSelected: boolean;
  isDark: boolean;
  onPress: (slug: MuscleSlug) => void;
}>(
  function MemoizedMuscleGroup({ slug, d, fill, isSelected, isDark, onPress }) {
    const selectedStroke = isDark ? DARK_TOKENS.text.primary : LIGHT_TOKENS.bg.surface;
    const baseStroke = isDark ? AnatomicalHeatmapPalette.strokeDark : LIGHT_TOKENS.bg.surface;
    return (
      <G onPress={() => onPress(slug)}>
        <Path
          key={`muscle-${slug}`}
          d={d}
          fill={fill}
          stroke={isSelected ? selectedStroke : baseStroke}
          strokeWidth={isSelected ? 4 : 1.2}
          strokeLinejoin="round"
        />
      </G>
    );
  },
  (prev, next) =>
    prev.slug === next.slug &&
    prev.fill === next.fill &&
    prev.isSelected === next.isSelected &&
    prev.isDark === next.isDark &&
    prev.d === next.d &&
    prev.onPress === next.onPress
);

interface Props {
  gymLogs: GymDayLog[];
  weekAnchorDate?: string;
  bodyGender?: 'male' | 'female';
  variant?: 'analytics' | 'weekly';
  timeWindowDays?: TimeWindow;
  defaultMode?: string;
  onAddCorrectiveExercise?: (exerciseName: string) => void;
  style?: any;
}

export type TimeWindow = 7 | 30 | 90 | 365 | 0;

export const AnatomicalBodyMapCard: React.FC<Props> = React.memo(({
  gymLogs,
  weekAnchorDate,
  bodyGender = 'male',
  variant = 'weekly',
  timeWindowDays,
  defaultMode,
  onAddCorrectiveExercise,
  style,
}) => {
  const { colors, isDark, tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { width: screenWidth, effectiveWidth, bodyMapHeight } = useResponsiveMetrics();
  const colWidth = Math.max(116, Math.floor((effectiveWidth - 64) / 2));
  const { userGymPlan, updateMasterPlan } = useGymPlan();

  const initialMode = defaultMode || 'fatigue';
  const [mode, setMode] = useState<string>(initialMode === 'growth' || initialMode === 'strength' ? 'fatigue' : initialMode);
  const [windowDays, setWindowDays] = useState<TimeWindow>(timeWindowDays ?? 30);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleSlug | null>(null);

  useEffect(() => {
    if (timeWindowDays !== undefined) {
      setWindowDays(timeWindowDays);
    }
  }, [timeWindowDays]);

  // ── Plan-Aware Add/Remove Modal & Toast States ────────────────────────────
  const [addToDayTarget, setAddToDayTarget] = useState<{ id: string; name: string; muscle: string } | null>(null);
  const [initialDayIndex, setInitialDayIndex] = useState<number>(1);
  const [removeTarget, setRemoveTarget] = useState<{ exerciseName: string; exerciseId?: string; dayIndex: number; dayName: string } | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showTimedToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setActionToast(msg);
    toastTimerRef.current = setTimeout(() => {
      setActionToast(null);
      toastTimerRef.current = null;
    }, 3000);
  };

  React.useEffect(() => {
    if (defaultMode) {
      setMode(defaultMode === 'growth' || defaultMode === 'strength' ? 'fatigue' : defaultMode);
    }
  }, [defaultMode]);

  // ── Current Training Week Anchoring (Starts after rest day e.g. Sunday -> Monday) ──
  const weekBounds = useMemo(
    () => getTrainingWeekBounds(weekAnchorDate, userGymPlan),
    [weekAnchorDate, userGymPlan]
  );

  const thisWeekLogs = useMemo(() => {
    return (gymLogs || []).filter(log => {
      if (!log.date) return false;
      const d = String(log.date).slice(0, 10);
      return d >= weekBounds.startDateIso && d <= weekBounds.endDateIso;
    });
  }, [gymLogs, weekBounds.startDateIso, weekBounds.endDateIso]);

  const targetLogs = variant === 'weekly' ? thisWeekLogs : gymLogs;
  const effectiveWindowDays = variant === 'weekly' ? 0 : windowDays;
  // CRITICAL FIX: Do NOT fallback to weekBounds.endDateIso (Sunday 23:59:59) so intra-day decay uses Date.now()!
  const effectiveAnchorDate = weekAnchorDate;

  // ── Biomechanical Models (Always anchored to this week's data, strictly gated by active mode) ──
  const needBalance = mode === 'balance';
  const balanceModel = useMemo(
    () => needBalance ? calculateSymmetryAndBalance(targetLogs, effectiveWindowDays as any, effectiveAnchorDate, userGymPlan) : ({} as Record<string, any>),
    [targetLogs, effectiveWindowDays, effectiveAnchorDate, needBalance, userGymPlan]
  );

  const antagonisticPairs = useMemo(
    () => needBalance ? calculateAntagonisticPairs(targetLogs, effectiveWindowDays as any, effectiveAnchorDate, userGymPlan) : [],
    [targetLogs, effectiveWindowDays, effectiveAnchorDate, needBalance, userGymPlan]
  );

  const needVolume = mode === 'volume';
  const weeklyMuscleLoad = useMemo(
    () => needVolume ? calculateMuscleLoad(targetLogs, effectiveWindowDays, effectiveAnchorDate, false) : ({} as Record<MuscleSlug, number>),
    [targetLogs, effectiveWindowDays, effectiveAnchorDate, needVolume]
  );

  // CRITICAL FIX: Fatigue must evaluate rolling recent logs (not just Monday+),
  // otherwise Sunday workouts vanish on Monday morning!
  const needFatigue = mode === 'fatigue';
  const weeklyFatigue = useMemo(
    () => needFatigue ? calculateMuscleFatigue(gymLogs, weekAnchorDate) : ({} as Record<string, any>),
    [gymLogs, weekAnchorDate, needFatigue]
  );

  const recoveryRecs = useMemo(
    () => needFatigue ? getDailyRecoveryRecommendations(weeklyFatigue) : { primeToTrain: [], restPriority: [] },
    [weeklyFatigue, needFatigue]
  );

  const currentGenderSvg = STATIC_BODY_SVG[bodyGender] || STATIC_BODY_SVG.male;

  // ── Status Counts & Metrics ───────────────────────────────────────────────
  const fatigueSummary = useMemo(() => {
    let ready = 0;
    let recovering = 0;
    let fatigued = 0;
    for (const slug of MUSCLES) {
      const r = weeklyFatigue[slug];
      if (r) {
        if (r.state === 'fatigued') fatigued++;
        else if (r.state === 'recovering') recovering++;
        else ready++;
      }
    }
    return { ready, recovering, fatigued };
  }, [weeklyFatigue]);

  const volumeSummary = useMemo(() => {
    let actualWorkingSets = 0;
    for (const log of targetLogs || []) {
      for (const ex of log.exercises || []) {
        if (ex.skipped) continue;
        for (const s of ex.setsLog || []) {
          if (s.completed && !s.isWarmup && s.setType !== 'warmup') {
            actualWorkingSets += 1;
          }
        }
      }
    }
    let optimalCount = 0;
    for (const slug of MUSCLES) {
      const lm = getHypertrophyLandmarkInfo(weeklyMuscleLoad[slug] || 0, weekBounds.restDayName, slug);
      if (lm.tier === 'mav') optimalCount++;
    }
    return { optimalCount, totalSetsSum: actualWorkingSets };
  }, [weeklyMuscleLoad, targetLogs, weekBounds.restDayName]);

  const balanceSummary = useMemo(() => {
    let optimalCount = 0;
    let laggingCount = 0;
    let dominantCount = 0;

    for (const slug of MUSCLES) {
      const b = balanceModel[slug];
      if (b && b.status !== 'untrained') {
        if (b.status === 'optimal') optimalCount++;
        else if (b.status === 'lagging') laggingCount++;
        else if (b.status === 'dominant') dominantCount++;
      }
    }

    // Read ratio from antagonisticPairs (which is computed in balance mode!)
    const upperPair = antagonisticPairs.find(p => p.id === 'upper');
    const pushPullRatio = upperPair ? upperPair.ratio : 1.0;

    return { optimalCount, laggingCount, dominantCount, pushPullRatio };
  }, [balanceModel, antagonisticPairs]);

  // ── Color Map (O(1) lookup) ────────────────────────────────────────────────
  const muscleColorMap = useMemo<Record<MuscleSlug, string>>(() => {
    const map = {} as Record<MuscleSlug, string>;
    const baseColor = isDark
      ? AnatomicalHeatmapPalette.untrainedBaseDark
      : AnatomicalHeatmapPalette.untrainedBaseLight;

    for (const slug of MUSCLES) {
      if (mode === 'fatigue') {
        const r = weeklyFatigue[slug];
        if (!r || r.totalSets === 0) {
          map[slug] = isDark
            ? AnatomicalHeatmapPalette.untrainedRecoveryDark
            : AnatomicalHeatmapPalette.untrainedRecoveryLight;
        } else if (r.state === 'fatigued') {
          map[slug] = tokens.accent.crimson;
        } else if (r.state === 'recovering') {
          map[slug] = tokens.status.warning;
        } else {
          map[slug] = tokens.status.success;
        }
      } else if (mode === 'volume') {
        const sets = weeklyMuscleLoad[slug] || 0;
        if (sets <= 0) {
          map[slug] = baseColor;
        } else {
          const lm = getHypertrophyLandmarkInfo(sets, weekBounds.restDayName, slug);
          // Cohesive Apple Blue depth ramp
          if (lm.tier === 'mrv_risk') {
            map[slug] = AnatomicalHeatmapPalette.volumeMrvRisk;
          } else if (lm.tier === 'mav') {
            map[slug] = AnatomicalHeatmapPalette.volumeMav;
          } else if (lm.tier === 'mev') {
            map[slug] = AnatomicalHeatmapPalette.volumeMev;
          } else if (lm.tier === 'below_mev') {
            map[slug] = AnatomicalHeatmapPalette.volumeBelowMev;
          } else {
            map[slug] = baseColor;
          }
        }
      } else if (mode === 'balance') {
        const b = balanceModel[slug];
        if (b && b.status !== 'untrained') {
          if (b.status === 'optimal') map[slug] = tokens.status.success;
          else if (b.status === 'dominant') map[slug] = tokens.status.warning;
          else if (b.status === 'lagging') map[slug] = tokens.accent.crimson;
          else map[slug] = baseColor;
        } else {
          map[slug] = baseColor;
        }
      } else {
        map[slug] = baseColor;
      }
    }
    return map;
  }, [mode, isDark, tokens.accent.crimson, tokens.status.warning, tokens.status.success, weeklyFatigue, weeklyMuscleLoad, balanceModel, weekBounds.restDayName]);

  const handleMusclePress = React.useCallback((slug: MuscleSlug) => {
    feedback.selectionChange();
    setSelectedMuscle(prev => (prev === slug ? null : slug));
  }, []);

  // ── Render Single Pre-Cached SVG View (Front or Back) ──────────────────────
  const renderBodySvg = (
    viewCache: CachedBodyView,
    label: string
  ) => {
    const selectedD = selectedMuscle ? viewCache.paths[selectedMuscle] || '' : '';
    // Derive exact aspect-ratio height from viewBox to prevent Male/Female distortion
    const vbParts = viewCache.vb.split(/\s+/).map(Number);
    const vbW = vbParts[2] || 0;
    const vbH = vbParts[3] || 0;
    const aspect = vbW > 0 && vbH > 0 ? vbH / vbW : 1.76;
    const svgHeight = Math.round(colWidth * aspect);

    return (
      <View style={[styles.bodyViewCol, { width: colWidth }]}>
        <Svg viewBox={viewCache.vb} style={[styles.svgCanvas, { height: svgHeight }]}>
          <InertSilhouetteLayer inertD={viewCache.inertD} isDark={isDark} />
          <G>
            {MUSCLES.map(slug => {
              const d = viewCache.paths[slug];
              if (!d) return null;

              const isSelected = selectedMuscle === slug;
              const fill = muscleColorMap[slug] || (
                isDark ? AnatomicalHeatmapPalette.untrainedBaseDark : AnatomicalHeatmapPalette.untrainedBaseLight
              );

              return (
                <MemoizedMuscleGroup
                  key={`muscle-group-${slug}`}
                  slug={slug}
                  d={d}
                  fill={fill}
                  isSelected={isSelected}
                  isDark={isDark}
                  onPress={handleMusclePress}
                />
              );
            })}
            {/* Crisp 360-degree selection highlight ring rendered on TOP of all neighboring muscles */}
            {selectedD ? (
              <Path
                d={selectedD}
                fill="none"
                stroke={isDark ? tokens.text.primary : tokens.bg.surface}
                strokeWidth={4.5}
                strokeLinejoin="round"
                pointerEvents="none"
              />
            ) : null}
          </G>
        </Svg>
        <Text style={styles.bodyViewLabel}>{label}</Text>
      </View>
    );
  };

  const selectedData = selectedMuscle
    ? {
        name: MUSCLE_NAME[selectedMuscle] || selectedMuscle,
        balance: balanceModel[selectedMuscle],
        weeklySets: Math.round(weeklyMuscleLoad[selectedMuscle] || 0),
        weeklyRecovery: weeklyFatigue[selectedMuscle],
      }
    : null;

  return (
    <View style={[styles.card, !isDark && { borderColor: tokens.border.subtle, borderWidth: 1 }, style]}>

      {/* ── 3-Part Gliding Segmented Control ── */}
      <IOSSegmentedControl
        segments={[
          { id: 'fatigue', label: 'Recovery' },
          { id: 'volume', label: 'Coverage' },
          { id: 'balance', label: 'Symmetry' },
        ]}
        activeId={mode}
        onSelect={(id) => setMode(id)}
        height={34}
      />

      {/* ── Subtitle Status Overview Strip ─────────────────────────────────── */}
      <View style={styles.overviewStrip}>
        {mode === 'fatigue' && (
          <NumericText style={styles.overviewStripText} numberOfLines={1}>
            {fatigueSummary.ready > 0 ? `${fatigueSummary.ready} Ready` : 'Ready'} ·{' '}
            {fatigueSummary.recovering > 0 ? `${fatigueSummary.recovering} Recovering` : '0 Recovering'} ·{' '}
            {fatigueSummary.fatigued > 0 ? `${fatigueSummary.fatigued} Strained` : '0 Strained'}
          </NumericText>
        )}

        {mode === 'volume' && (
          <NumericText style={styles.overviewStripText} numberOfLines={1}>
            {volumeSummary.optimalCount} Muscles On Target · {volumeSummary.totalSetsSum} Sets This Week
          </NumericText>
        )}

        {mode === 'balance' && (
          <NumericText style={styles.overviewStripText} numberOfLines={1}>
            Weekly Muscle Balance · {balanceSummary.laggingCount > 0 ? `${balanceSummary.laggingCount} Area Behind` : 'Balanced'}
          </NumericText>
        )}
      </View>

      {/* ── Main Dual-View BodyMap (Front & Back) — Locked at Top Y-Position across all tabs ── */}
      <View style={styles.bodyDualContainer}>
        {renderBodySvg(currentGenderSvg.front, 'FRONT')}
        {renderBodySvg(currentGenderSvg.back, 'BACK')}
      </View>

      {/* ── Interactive Muscle Detail Inspector ─────────────────────────────── */}
      {selectedData ? (
        <View style={styles.inspectorCard}>
          <View style={styles.inspectorTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <View style={[styles.inspectorDot, { backgroundColor: muscleColorMap[selectedMuscle!] || tokens.text.primary }]} />
              <Text style={styles.inspectorTitle}>{selectedData.name}</Text>
            </View>
            <TactileButton
              variant="icon"
              haptic="light"
              onPress={() => setSelectedMuscle(null)}
              style={styles.inspectorCloseBtn}
              hitSlop={TOUCH.hitSlop}
              accessibilityLabel="Close muscle inspector"
            >
              <X size={15} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
            </TactileButton>
          </View>

          <View style={styles.inspectorContent}>
            {/* Mode 1: Recovery Status & Real Countdown */}
            {mode === 'fatigue' && (() => {
              const recHours = selectedData.weeklyRecovery?.estimatedRecoveryHours ?? 0;
              const readinessPct = selectedData.weeklyRecovery?.readinessPct ?? 100;
              const rawState = selectedData.weeklyRecovery?.state;
              // If state is ready or 0 hours remain or readiness is 100%, consider effectively ready
              const isEffectivelyReady = rawState === 'ready' || recHours <= 0 || readinessPct >= 100;
              const isFatigued = !isEffectivelyReady && rawState === 'fatigued';

              const statusColor = isEffectivelyReady
                ? tokens.status.success
                : isFatigued
                ? tokens.status.danger
                : tokens.status.warning;

              return (
                <View style={{ gap: 6 }}>
                  <View style={styles.inspectorMetricRow}>
                    <Text style={styles.inspectorStatusLabel}>Status:</Text>
                    <NumericText
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[
                        styles.inspectorCountdownVal,
                        { color: statusColor },
                      ]}
                    >
                      {isEffectivelyReady
                        ? 'Ready to Train'
                        : `Ready in ~${recHours}h`}
                    </NumericText>
                  </View>

                  {/* Concise Directive */}
                  <View
                    style={[
                      styles.inspectorDirectiveBox,
                      { borderColor: tokens.border.subtle },
                    ]}
                  >
                    {isEffectivelyReady ? (
                      <CheckCircle2 size={14} color={statusColor} strokeWidth={ICON.strokeWidth} />
                    ) : (
                      <AlertCircle size={14} color={statusColor} strokeWidth={ICON.strokeWidth} />
                    )}
                    <Text style={styles.inspectorDirectiveText}>
                      {isEffectivelyReady
                        ? 'Recovered and ready to lift heavy.'
                        : isFatigued
                        ? `Still recovering from ${selectedData.weeklyRecovery?.totalSets || 0} sets recently. Rest before heavy sets.`
                        : `About ${readinessPct}% recovered — light sets fine, heavy in ~${recHours}h.`}
                    </Text>
                  </View>

                  <NumericText style={styles.inspectorMetaText}>
                    {selectedData.weeklyRecovery?.lastTrainedDaysAgo != null
                      ? `Last trained: ${
                          selectedData.weeklyRecovery.lastTrainedDaysAgo === 0
                            ? 'Today'
                            : selectedData.weeklyRecovery.lastTrainedDaysAgo === 1
                            ? 'Yesterday'
                            : `${selectedData.weeklyRecovery.lastTrainedDaysAgo} days ago`
                        }${
                          (selectedData.weeklyRecovery.totalSets || 0) > 0
                            ? ` · ${selectedData.weeklyRecovery.totalSets} ${
                                selectedData.weeklyRecovery.totalSets === 1 ? 'set' : 'sets'
                              } (7d)`
                            : ''
                        }`
                      : 'Not trained this week'}
                  </NumericText>
                </View>
              );
            })()}

            {/* Mode 2: Volume Status & Consistent Landmarks */}
            {mode === 'volume' && (() => {
              const landmark = getHypertrophyLandmarkInfo(selectedData.weeklySets, weekBounds.restDayName, selectedMuscle!);
              const scaleMax = landmark.mrvLimit || 20;
              const progressPct = Math.min(100, Math.round((selectedData.weeklySets / scaleMax) * 100));

              return (
                <View style={{ gap: 6 }}>
                  <View style={styles.inspectorMetricRow}>
                    <Text style={styles.inspectorStatusLabel}>This Week:</Text>
                    <NumericText
                      style={[styles.inspectorCountdownVal, { color: landmark.tierColor }]}
                    >
                      {selectedData.weeklySets === 0
                        ? '0 sets · Not Trained'
                        : `${selectedData.weeklySets} ${selectedData.weeklySets === 1 ? 'set' : 'sets'} · ${landmark.tierLabel.replace(/\s*\(\d+\s*sets\)/i, '')}`}
                    </NumericText>
                  </View>

                  {/* Accurate Dynamic Scale Bar */}
                  <View style={styles.landmarkScaleWrap}>
                    <AnimatedProgressBar
                      progress={progressPct / 100}
                      height={6}
                      borderRadius={RADIUS.xs}
                      durationMs={360}
                      replayKey={`${mode}-${selectedMuscle}`}
                      color={landmark.tierColor}
                      trackColor={tokens.bg.elevated}
                    />
                    <View style={styles.landmarkTicksRow}>
                      <NumericText style={styles.landmarkTickText}>0</NumericText>
                      <NumericText
                        style={[
                          styles.landmarkTickText,
                          selectedData.weeklySets >= landmark.mavMinTarget &&
                            selectedData.weeklySets <= landmark.mavMaxTarget && { color: tokens.status.success },
                        ]}
                      >
                        Ideal ({landmark.mavMinTarget}–{landmark.mavMaxTarget})
                      </NumericText>
                      <NumericText
                        style={[
                          styles.landmarkTickText,
                          selectedData.weeklySets > landmark.mrvLimit && { color: tokens.status.warning },
                        ]}
                      >
                        High ({landmark.mrvLimit}+)
                      </NumericText>
                    </View>
                  </View>

                  {/* Actionable Weekly Guidance */}
                  <View
                    style={[
                      styles.inspectorDirectiveBox,
                      { borderColor: `${landmark.tierColor}44` },
                    ]}
                  >
                    <Sparkles size={14} color={landmark.tierColor} strokeWidth={ICON.strokeWidth} />
                    <Text style={styles.inspectorDirectiveText}>
                      {landmark.actionableMessage}
                    </Text>
                  </View>
                </View>
              );
            })()}

            {/* Mode 3: Symmetry Status & Prescriptive Corrective Suggestion */}
            {mode === 'balance' && (
              <View style={{ gap: 6 }}>
                <View style={styles.inspectorMetricRow}>
                  <Text style={styles.inspectorStatusLabel}>Balance:</Text>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[
                      styles.inspectorCountdownVal,
                      {
                        color:
                          selectedData.balance?.status === 'optimal'
                            ? tokens.status.success
                            : selectedData.balance?.status === 'dominant'
                            ? tokens.status.warning
                            : selectedData.balance?.status === 'lagging'
                            ? tokens.status.danger
                            : tokens.text.secondary,
                      },
                    ]}
                  >
                    {selectedData.balance?.status === 'optimal'
                      ? 'Balanced'
                      : selectedData.balance?.status === 'dominant'
                      ? 'Trained More'
                      : selectedData.balance?.status === 'lagging'
                      ? 'Behind'
                      : 'Not Tracked'}
                  </Text>
                </View>

                {/* Prescriptive Corrective Callout */}
                <View
                  style={[
                    styles.inspectorDirectiveBox,
                    { borderColor: tokens.border.subtle },
                  ]}
                >
                  <Zap
                    size={14}
                    strokeWidth={ICON.strokeWidth}
                    color={
                      selectedData.balance?.status === 'lagging'
                        ? tokens.status.danger
                        : selectedData.balance?.status === 'dominant'
                        ? tokens.status.warning
                        : tokens.status.success
                    }
                  />
                  <Text style={styles.inspectorDirectiveText}>
                    {selectedData.balance?.recommendation || 'Keep your push and pull sets steady across the week.'}
                  </Text>
                </View>

                {/* 1-Tap Quick Action Buttons Right in Inspector Card */}
                {(Boolean(selectedData.balance?.addExerciseName) || Boolean(selectedData.balance?.removeExerciseName)) && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {Boolean(selectedData.balance?.addExerciseName) && (
                      <TactileButton
                        variant="custom"
                        haptic="none"
                        style={[
                          styles.correctiveActionBtn,
                          {
                            borderColor: tokens.status.success,
                            backgroundColor: tokens.status.successDim,
                            flex: 1,
                            minWidth: 130,
                          },
                        ]}
                        onPress={() => {
                          feedback.tap();
                          setAddToDayTarget({
                            id: selectedData.balance?.addExerciseId || `corr_${Date.now()}`,
                            name: selectedData.balance!.addExerciseName!,
                            muscle: selectedData.name,
                          });
                          setInitialDayIndex(selectedData.balance?.targetDayIndex || 2);
                        }}
                      >
                        <Plus size={15} color={tokens.status.success} strokeWidth={ICON.strokeWidth} />
                        <Text style={[styles.correctiveActionBtnText, { color: tokens.status.success }]} numberOfLines={2}>
                          + Add {selectedData.balance?.addExerciseName} to {selectedData.balance?.targetDayName || 'Plan'}
                        </Text>
                      </TactileButton>
                    )}

                    {Boolean(selectedData.balance?.removeExerciseName) && (
                      <TactileButton
                        variant="custom"
                        haptic="none"
                        style={[
                          styles.correctiveActionBtn,
                          {
                            borderColor: 'rgba(255, 69, 58, 0.45)',
                            backgroundColor: 'rgba(255, 69, 58, 0.12)',
                            flex: 1,
                            minWidth: 130,
                          },
                        ]}
                        onPress={() => {
                          feedback.tap();
                          setRemoveTarget({
                            exerciseName: selectedData.balance!.removeExerciseName!,
                            exerciseId: selectedData.balance?.removeExerciseId,
                            dayIndex: selectedData.balance?.removeDayIndex || 1,
                            dayName: selectedData.balance?.removeDayName || 'Plan',
                          });
                        }}
                      >
                        <Trash2 size={15} color={tokens.accent.crimson} strokeWidth={ICON.strokeWidth} />
                        <Text style={[styles.correctiveActionBtnText, { color: tokens.accent.crimson }]} numberOfLines={2}>
                          - Remove {selectedData.balance?.removeExerciseName} from {selectedData.balance?.removeDayName || 'Plan'}
                        </Text>
                      </TactileButton>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      ) : (
        <Text style={styles.tapPromptText}>
          {mode === 'fatigue'
            ? 'Tap any muscle to inspect live recovery countdown & readiness.'
            : mode === 'volume'
            ? 'Tap any muscle to see how many sets you need this week to grow.'
            : 'Tap any muscle to check muscle balance and fix weak points.'}
        </Text>
      )}

      {/* ── Mode 1 (Recovery): Clean Active Tissue Status Strip ────────── */}
      {mode === 'fatigue' && !selectedData && (
        <View style={[styles.dailyRecCard, { paddingVertical: 10, paddingHorizontal: SPACE.md }]}>
          {recoveryRecs.restPriority.length > 0 ? (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.statusDot, { backgroundColor: tokens.status.warning }]} />
                <Text style={[styles.dailyRecTitle, { fontSize: 11 }]}>CURRENTLY RECOVERING</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {recoveryRecs.restPriority.slice(0, 4).map(m => (
                  <View
                    key={m.slug}
                    style={{
                      backgroundColor: 'rgba(255, 159, 10, 0.12)',
                      paddingHorizontal: SPACE.sm,
                      paddingVertical: 3,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 159, 10, 0.25)',
                    }}
                  >
                    <NumericText style={{ fontFamily: FONT_FAMILY.medium, fontSize: 11, color: tokens.status.warning }}>
                      {m.name} · ~{m.estimatedHours}h left
                    </NumericText>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.statusDot, { backgroundColor: tokens.status.success }]} />
              <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 12, color: tokens.status.success }}>
                All muscles are recovered and ready to train.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Mode 3 (Symmetry): Core Muscle Balance Pairs ─────────────────── */}
      {mode === 'balance' && (
        <View style={styles.antagonistSection}>
          <View style={styles.antagonistHeaderRow}>
            <ArrowLeftRight size={14} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
            <Text style={styles.antagonistSectionTitle}>WEEKLY MUSCLE BALANCE</Text>
          </View>

          <View style={styles.pairGroupCard}>
            {antagonisticPairs.map((pair, idx) => {
              const loggedA = Math.round(pair.setsA);
              const loggedB = Math.round(pair.setsB);
              const totalA = Math.round(pair.totalSetsA);
              const totalB = Math.round(pair.totalSetsB);
              const plannedA = Math.round(pair.upcomingSetsA);
              const plannedB = Math.round(pair.upcomingSetsB);
              const combinedSets = totalA + totalB;
              const pctA = combinedSets > 0 ? Math.round((totalA / combinedSets) * 100) : 50;
              const pctB = 100 - pctA;

              return (
                <View key={pair.id} style={[styles.pairRowItem, idx > 0 && styles.pairRowDivider]}>
                  <View style={styles.pairTopRow}>
                    <Text style={styles.pairCategory}>{pair.category}</Text>
                    <View style={[styles.pairStatusBadge, { backgroundColor: `${pair.statusColor}22` }]}>
                      <View style={[styles.statusDot, { backgroundColor: pair.statusColor }]} />
                      <Text style={[styles.pairStatusText, { color: pair.statusColor }]}>
                        {pair.humanStatus || pair.statusLabel}
                      </Text>
                    </View>
                  </View>

                  {/* Explicit Done vs Scheduled Comparison */}
                  <View style={styles.pairMetricsRow}>
                    <View style={styles.pairSideCol}>
                      <Text style={styles.pairSideTitle} numberOfLines={1}>{pair.nameA}</Text>
                      {loggedA > 0 && plannedA > 0 ? (
                        <NumericText style={styles.pairSetsNum}>
                          {loggedA} <Text style={styles.pairSetsUnit}>done</Text>
                          <Text style={[styles.pairSetsUnit, { color: tokens.accent.secondary }]}> · {plannedA} scheduled</Text>
                        </NumericText>
                      ) : loggedA > 0 ? (
                        <NumericText style={styles.pairSetsNum}>
                          {loggedA} <Text style={styles.pairSetsUnit}>done</Text>
                        </NumericText>
                      ) : plannedA > 0 ? (
                        <NumericText style={styles.pairSetsNum}>
                          0 <Text style={styles.pairSetsUnit}>done</Text>
                          <Text style={[styles.pairSetsUnit, { color: tokens.accent.secondary }]}> · {plannedA} scheduled</Text>
                        </NumericText>
                      ) : (
                        <NumericText style={styles.pairSetsNum}>
                          0 <Text style={styles.pairSetsUnit}>sets</Text>
                        </NumericText>
                      )}
                    </View>

                    <View style={[styles.pairSideCol, { alignItems: 'flex-end' }]}>
                      <Text style={styles.pairSideTitle} numberOfLines={1}>{pair.nameB}</Text>
                      {loggedB > 0 && plannedB > 0 ? (
                        <NumericText style={styles.pairSetsNum}>
                          {loggedB} <Text style={styles.pairSetsUnit}>done</Text>
                          <Text style={[styles.pairSetsUnit, { color: tokens.accent.primary }]}> · {plannedB} scheduled</Text>
                        </NumericText>
                      ) : loggedB > 0 ? (
                        <NumericText style={styles.pairSetsNum}>
                          {loggedB} <Text style={styles.pairSetsUnit}>done</Text>
                        </NumericText>
                      ) : plannedB > 0 ? (
                        <NumericText style={styles.pairSetsNum}>
                          0 <Text style={styles.pairSetsUnit}>done</Text>
                          <Text style={[styles.pairSetsUnit, { color: tokens.accent.primary }]}> · {plannedB} scheduled</Text>
                        </NumericText>
                      ) : (
                        <NumericText style={styles.pairSetsNum}>
                          0 <Text style={styles.pairSetsUnit}>sets</Text>
                        </NumericText>
                      )}
                    </View>
                  </View>

                  {/* 50 / 50 Visual Split Bar */}
                  <View style={styles.balanceBarContainer}>
                    <View style={styles.balanceBarTrack}>
                      <View
                        style={[
                          styles.balanceBarFillLeft,
                          { width: `${pctA}%`, backgroundColor: tokens.accent.secondary },
                        ]}
                      />
                      <View style={styles.balanceCenterTick} />
                      <View
                        style={[
                          styles.balanceBarFillRight,
                          { width: `${pctB}%`, backgroundColor: tokens.accent.primary },
                        ]}
                      />
                    </View>
                    <View style={styles.balanceSubRow}>
                      <NumericText style={styles.balanceSubLeft}>{pctA}%</NumericText>
                      <NumericText style={styles.balanceSubCenter}>
                        {combinedSets > 0 ? 'Ideal 50 / 50' : 'No weekly sets yet'}
                      </NumericText>
                      <NumericText style={styles.balanceSubRight}>{pctB}%</NumericText>
                    </View>
                  </View>

                  {/* Prescriptive Guidance */}
                  <View style={styles.pairPrescriptionBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, flex: 1 }}>
                      {pair.status === 'optimal' ? (
                        <CheckCircle2
                          size={14}
                          color={pair.statusColor}
                          strokeWidth={ICON.strokeWidth}
                          style={{ marginTop: 1 }}
                        />
                      ) : (
                        <Zap
                          size={14}
                          color={pair.statusColor}
                          strokeWidth={ICON.strokeWidth}
                          style={{ marginTop: 1 }}
                        />
                      )}
                      <Text style={styles.pairPrescriptionText}>
                        {pair.correctiveRecommendation}
                      </Text>
                    </View>

                    {/* 1-Tap ADD Action: Opens AddToDaySheet targeting user's specific split day */}
                    {pair.actionType === 'add' && pair.correctiveExerciseName && (
                      <TactileButton
                        variant="custom"
                        haptic="none"
                        style={[styles.correctiveActionBtn, { borderColor: `${pair.statusColor}55`, backgroundColor: `${pair.statusColor}18` }]}
                        onPress={() => {
                          feedback.tap();
                          const laggingSlugs = pair.status === 'lagging_a' ? pair.musclesA : pair.musclesB;
                          const targetMuscleSlug = laggingSlugs[0] || 'upper-back';
                          setAddToDayTarget({
                            id: pair.correctiveExerciseId || `corr_${Date.now()}`,
                            name: pair.correctiveExerciseName!,
                            muscle: MUSCLE_NAME[targetMuscleSlug] || targetMuscleSlug,
                          });
                          setInitialDayIndex(pair.targetDayIndex || 1);
                        }}
                      >
                        <Plus size={15} color={pair.statusColor} strokeWidth={ICON.strokeWidth} />
                        <Text style={[styles.correctiveActionBtnText, { color: pair.statusColor }]} numberOfLines={2}>
                          Add {pair.correctiveExerciseName} to Routine
                        </Text>
                      </TactileButton>
                    )}

                    {/* 1-Tap REMOVE Action: Confirms and removes actual scheduled exercise from routine */}
                    {pair.actionType === 'remove' && pair.removeExerciseName && (
                      <TactileButton
                        variant="custom"
                        haptic="none"
                        style={[styles.correctiveActionBtn, { borderColor: 'rgba(255, 69, 58, 0.45)', backgroundColor: 'rgba(255, 69, 58, 0.12)' }]}
                        onPress={() => {
                          feedback.tap();
                          setRemoveTarget({
                            exerciseName: pair.removeExerciseName!,
                            exerciseId: pair.removeExerciseId,
                            dayIndex: pair.removeDayIndex || 1,
                            dayName: pair.removeDayName || 'Plan',
                          });
                        }}
                      >
                        <Minus size={15} color={tokens.accent.crimson} strokeWidth={ICON.strokeWidth} />
                        <Text style={[styles.correctiveActionBtnText, { color: tokens.accent.crimson }]} numberOfLines={2}>
                          Remove {pair.removeExerciseName} from {pair.removeDayName || 'Plan'}
                        </Text>
                      </TactileButton>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Dynamic Legend Bar ──────────────────────────────────────────── */}
      <View style={styles.legendRow}>
        {mode === 'fatigue' && (
          <View style={styles.legendItemsWrap}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: tokens.status.success }]} />
              <Text style={styles.legendLabel}>Ready</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: tokens.status.warning }]} />
              <Text style={styles.legendLabel}>Recovering</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: tokens.accent.crimson }]} />
              <Text style={styles.legendLabel}>Strained</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  {
                    backgroundColor: isDark
                      ? AnatomicalHeatmapPalette.untrainedRecoveryDark
                      : AnatomicalHeatmapPalette.untrainedRecoveryLight,
                  },
                ]}
              />
              <Text style={styles.legendLabel}>Not Trained</Text>
            </View>
          </View>
        )}

        {mode === 'volume' && (
          <View style={styles.legendItemsWrap}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: AnatomicalHeatmapPalette.volumeMav }]} />
              <Text style={styles.legendLabel}>Ideal</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: AnatomicalHeatmapPalette.volumeMev }]} />
              <Text style={styles.legendLabel}>Moderate</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: AnatomicalHeatmapPalette.volumeBelowMev }]} />
              <Text style={styles.legendLabel}>Light</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: AnatomicalHeatmapPalette.volumeMrvRisk }]} />
              <Text style={styles.legendLabel}>Very High</Text>
            </View>
          </View>
        )}

        {mode === 'balance' && (
          <View style={styles.legendItemsWrap}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: tokens.status.success }]} />
              <Text style={styles.legendLabel}>Balanced</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: tokens.status.warning }]} />
              <Text style={styles.legendLabel}>More Load</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: tokens.accent.crimson }]} />
              <Text style={styles.legendLabel}>Needs Catch-Up</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Add to Split Day Sheet ── */}
      <LazySheet
        visible={addToDayTarget !== null}
        render={() => (
          <LazyAddToDaySheet
            visible={addToDayTarget !== null}
            exercise={addToDayTarget}
            initialDayIndex={initialDayIndex}
            initialSets={3}
            onClose={() => setAddToDayTarget(null)}
            onSuccess={(dayName) => {
              const addedName = addToDayTarget?.name || 'Exercise';
              feedback.success();
              showTimedToast(`Added ${addedName} to ${dayName}`);
              // Don't call setAddToDayTarget(null) here — onClose handles dismissal
            }}
          />
        )}
      />

      {/* ── Remove Exercise from Plan Obsidian Sheet ── */}
      <LazySheet
        visible={removeTarget !== null}
        render={() => (
          <BottomSheet
            visible={removeTarget !== null}
            onClose={() => setRemoveTarget(null)}
          >
        <View style={styles.confirmSheetBody}>
          <View style={styles.confirmIconWrap}>
            <Trash2 size={22} color={tokens.accent.crimson} strokeWidth={ICON.strokeWidth} />
          </View>
          <Text style={[styles.confirmTitle, { color: tokens.text.primary }]}>
            Remove from {removeTarget?.dayName}?
          </Text>
          <Text style={[styles.confirmDesc, { color: tokens.text.secondary }]}>
            Remove <Text style={{ color: tokens.text.primary, fontFamily: FONT_FAMILY.bold }}>{removeTarget?.exerciseName}</Text> from this split day to keep push and pull volume balanced.
          </Text>
          <View style={styles.confirmBtnRow}>
            <TactileButton
              variant="secondary"
              label="Cancel"
              style={{ flex: 1 }}
              onPress={() => setRemoveTarget(null)}
            />
            <TactileButton
              variant="danger"
              label="Remove"
              haptic="none"
              style={{ flex: 1 }}
              onPress={async () => {
                if (!removeTarget) return;
                feedback.success();
                const currentDay = resolvePlanDay(userGymPlan, removeTarget.dayIndex);

                if (currentDay) {
                  const targetNameLower = removeTarget.exerciseName.trim().toLowerCase();
                  const targetWords = targetNameLower.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 2);
                  const updatedExercises = (currentDay.exercises || []).filter(e => {
                    if (removeTarget.exerciseId && e.id && e.id === removeTarget.exerciseId) return false;
                    const exName = (e.name || '').trim().toLowerCase();
                    if (exName === targetNameLower) return false;
                    if (exName.includes(targetNameLower) || targetNameLower.includes(exName)) return false;
                    if (targetWords.length > 0 && targetWords.every(w => exName.includes(w))) return false;
                    return true;
                  });
                  await updateMasterPlan(removeTarget.dayIndex, {
                    ...currentDay,
                    exercises: updatedExercises,
                  }, true);
                  showTimedToast(`Removed ${removeTarget.exerciseName} from ${removeTarget.dayName}`);
                }
                setRemoveTarget(null);
              }}
            />
          </View>
        </View>
          </BottomSheet>
        )}
      />

      {/* ── Action Success Toast ── */}
      {actionToast && (
        <View style={styles.toastContainer}>
          <CheckCircle2 size={15} color={tokens.status.success} strokeWidth={ICON.strokeWidth} />
          <Text style={styles.toastText}>{actionToast}</Text>
        </View>
      )}

    </View>
  );
}, (prev, next) => {
  return (
    prev.bodyGender === next.bodyGender &&
    prev.variant === next.variant &&
    prev.timeWindowDays === next.timeWindowDays &&
    prev.defaultMode === next.defaultMode &&
    prev.weekAnchorDate === next.weekAnchorDate &&
    prev.style === next.style &&
    prev.onAddCorrectiveExercise === next.onAddCorrectiveExercise &&
    (prev.gymLogs === next.gymLogs || generateDatasetFingerprint(prev.gymLogs) === generateDatasetFingerprint(next.gymLogs))
  );
});

// ── Minimalist Apple iOS HIG Stylesheet ──────────────────────────────────────
const makeStyles = (tokens: typeof DARK_TOKENS) => StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.border.subtle,
    padding: SPACE.md,
    marginBottom: 10,
    backgroundColor: tokens.isDark ? '#0F1015' : tokens.bg.surface,
  },

  // Segmented Control (Minimal, Subtle, No Pills)
  segControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.bg.elevated,
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: SPACE.sm,
    minHeight: TOUCH.minTarget,
    gap: 2,
  },
  segBtn: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.inner,
    paddingHorizontal: SPACE.xs,
  },
  segBtnActive: {
    backgroundColor: tokens.bg.surface,
  },
  segBtnText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12.5,
    color: tokens.text.secondary,
  },
  segBtnTextActive: {
    color: tokens.text.primary,
    fontFamily: FONT_FAMILY.bold,
  },

  // Overview Strip
  overviewStrip: {
    alignItems: 'center',
    paddingVertical: 2,
    marginBottom: 6,
  },
  overviewStripText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },

  // Dual Body Map
  bodyDualContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.md,
    paddingVertical: SPACE.xs,
  },
  bodyViewCol: {
    alignItems: 'center',
  },
  svgCanvas: {
    width: '100%',
    height: 255,
  },
  bodyViewLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: tokens.text.muted,
    letterSpacing: 1,
    marginTop: SPACE.xs,
  },

  // Interactive Inspector Card
  inspectorCard: {
    backgroundColor: tokens.bg.elevated,
    borderRadius: RADIUS.md,
    padding: SPACE.md,
    marginTop: SPACE.sm,
    marginBottom: SPACE.xs,
  },
  inspectorTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inspectorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inspectorTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: tokens.text.primary,
  },
  inspectorCloseBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectorContent: {
    paddingLeft: 15,
  },
  inspectorStatusText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12.5,
    color: tokens.text.primary,
  },
  inspectorBodyText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: tokens.text.secondary,
    lineHeight: 16,
    marginTop: 2,
  },
  tapPromptText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: tokens.text.muted,
    textAlign: 'center',
    marginTop: SPACE.sm,
    marginBottom: 2,
  },

  // Educational Guide Card
  guideCard: {
    backgroundColor: tokens.bg.elevated,
    borderRadius: RADIUS.md,
    padding: SPACE.md,
    marginTop: 10,
  },
  guideHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  guideHeaderTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    color: tokens.text.secondary,
    letterSpacing: 0.5,
  },
  guideBullets: {
    gap: SPACE.xs,
  },
  guideBulletText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
    lineHeight: 16,
  },
  guideBold: {
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },

  // Legend Bar (Minimal, No Pills)
  legendRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingTop: SPACE.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.border.subtle,
  },
  legendItemsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: tokens.text.secondary,
  },

  // Mode 1: Daily Recovery Recommendation Card
  dailyRecCard: {
    backgroundColor: tokens.bg.elevated,
    borderRadius: RADIUS.md,
    padding: 10,
    marginBottom: SPACE.sm,
  },
  dailyRecSection: {
    gap: 5,
  },
  dailyRecHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dailyRecTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: tokens.text.secondary,
    letterSpacing: 0.6,
  },
  recChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  primeChip: {
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.3)',
  },
  primeChipSelected: {
    backgroundColor: tokens.status.success,
    borderColor: tokens.status.success,
  },
  primeChipText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: tokens.status.success,
  },
  restChip: {
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  restChipSelected: {
    backgroundColor: tokens.accent.crimson,
    borderColor: tokens.accent.crimson,
  },
  restChipText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: tokens.accent.crimson,
  },
  chipTextSelected: {
    color: tokens.accent.onPrimary,
    fontFamily: FONT_FAMILY.bold,
  },
  dailyRecEmpty: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: tokens.text.secondary,
    fontStyle: 'italic',
  },

  // Inspector Elevated Metrics
  inspectorMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.sm,
    paddingBottom: SPACE.xs,
  },
  inspectorStatusLabel: {
    flexShrink: 0,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: tokens.text.secondary,
  },
  inspectorCountdownVal: {
    flex: 1,
    flexShrink: 1,
    textAlign: 'right',
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
  },
  inspectorDirectiveBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: tokens.bg.canvas,
    borderRadius: RADIUS.sm,
    padding: SPACE.sm,
    borderWidth: 1,
    marginTop: 2,
  },
  inspectorDirectiveText: {
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: tokens.text.primary,
    lineHeight: 16,
  },
  inspectorMetaText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: tokens.text.secondary,
    marginTop: SPACE.xs,
    lineHeight: 15,
  },

  // Hypertrophy Landmark Gauge
  landmarkScaleWrap: {
    marginTop: 2,
    marginBottom: SPACE.xs,
  },
  landmarkTrackBg: {
    height: 6,
    backgroundColor: tokens.bg.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  landmarkTrackFill: {
    height: '100%',
    borderRadius: 3,
  },
  landmarkTicksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACE.xs,
  },
  landmarkTickText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 9.5,
    color: tokens.text.muted,
  },

  // Mode 3: 3 Core Antagonistic Pair Cards
  antagonistSection: {
    marginTop: 10,
    gap: SPACE.sm,
  },
  antagonistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  antagonistSectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    color: tokens.text.secondary,
    letterSpacing: 0.6,
  },
  pairGroupCard: {
    backgroundColor: tokens.isDark ? '#14161D' : tokens.bg.elevated,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.border.subtle,
    overflow: 'hidden',
  },
  pairRowItem: {
    padding: 12,
    gap: 8,
  },
  pairRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.border.subtle,
  },
  pairTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.sm,
  },
  pairCategory: {
    flex: 1,
    flexShrink: 1,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: tokens.text.primary,
  },
  pairStatusBadge: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pairStatusText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
  },
  pairMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACE.sm,
    paddingVertical: 3,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  pairSideCol: {
    flex: 1,
    minWidth: 0,
  },
  pairSideTitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: tokens.text.secondary,
    marginBottom: 1,
  },
  pairSetsNum: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: tokens.text.primary,
  },
  pairSetsUnit: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    color: tokens.text.secondary,
  },
  pairPlannedUnit: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10.5,
    color: tokens.accent.secondary,
  },
  balanceBarContainer: {
    paddingVertical: SPACE.xs,
    gap: 3,
  },
  balanceBarTrack: {
    height: 6,
    backgroundColor: tokens.border.subtle,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  },
  balanceBarFillLeft: {
    height: '100%',
  },
  balanceCenterTick: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: tokens.text.muted,
    zIndex: 2,
  },
  balanceBarFillRight: {
    height: '100%',
  },
  balanceSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceSubLeft: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    color: tokens.accent.secondary,
  },
  balanceSubCenter: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10,
    color: tokens.text.secondary,
  },
  balanceSubRight: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    color: tokens.accent.primary,
  },
  pairPrescriptionBox: {
    backgroundColor: tokens.bg.canvas,
    borderRadius: RADIUS.sm,
    padding: SPACE.sm,
    gap: 6,
  },
  pairPrescriptionText: {
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: tokens.text.secondary,
    lineHeight: 15,
  },
  correctiveActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    minHeight: 38,
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.inner,
    borderWidth: 1,
    marginTop: 3,
  },
  correctiveActionBtnText: {
    flex: 1,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11.5,
    lineHeight: 16,
  },
  // Modal & Toast Styles
  confirmSheetBody: {
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.xs,
    paddingBottom: SPACE.lg,
    alignItems: 'center',
    gap: SPACE.md,
  },
  confirmIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.inner,
    backgroundColor: 'rgba(255, 69, 58, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 17,
    textAlign: 'center',
  },
  confirmDesc: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: SPACE.xs,
  },
  toastContainer: {
    position: 'absolute',
    bottom: SPACE.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tokens.bg.elevated,
    paddingHorizontal: 14,
    paddingVertical: SPACE.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.35)',
    zIndex: 999,
  },
  toastText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: tokens.status.success,
  },
});

export default AnatomicalBodyMapCard;
