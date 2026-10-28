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

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Modal, Pressable } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILY } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { feedback } from '../../../utils/haptics';
import { generateDatasetFingerprint } from '../../../utils/hotCacheStore';
import { useGymPlan } from '../../../contexts/domains/WellnessContext';
import { AddToDaySheet } from '../schedule/AddToDaySheet';
import { GYM_PLAN, GYM_PLAN_ARNOLD } from '../../../data/gymPlan';
import {
  BODY_PATHS,
  ViewGeometry,
  getMergedMusclePath,
  getMergedInertPath,
} from './bodyPaths';
import {
  MUSCLES,
  INERT,
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

const InertSilhouetteLayer = React.memo(function InertSilhouetteLayer({
  inertD,
  isDark,
}: {
  inertD: string;
  isDark: boolean;
}) {
  const inertColor = isDark ? '#18171C' : '#D1D1D6';
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
    return (
      <G onPress={() => onPress(slug)}>
        {/* Generous touch target cushion (26 SVG units) for ALL muscles with non-zero alpha */}
        <Path
          d={d}
          fill="none"
          stroke="rgba(0,0,0,0.02)"
          strokeWidth={26}
          strokeLinejoin="round"
          strokeLinecap="round"
          onPress={() => onPress(slug)}
        />
        {/* Visible anatomical muscle */}
        <Path
          key={`muscle-${slug}`}
          d={d}
          fill={fill}
          stroke={isSelected ? '#FFFFFF' : isDark ? '#111016' : '#FFFFFF'}
          strokeWidth={isSelected ? 4 : 1.2}
          strokeLinejoin="round"
          onPress={() => onPress(slug)}
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
  const { colors, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const colWidth = Math.min((screenWidth - 64) / 2, 175);
  const { userGymPlan, updateMasterPlan } = useGymPlan();

  const initialMode = defaultMode || 'fatigue';
  const [mode, setMode] = useState<string>(initialMode === 'growth' || initialMode === 'strength' ? 'fatigue' : initialMode);
  const [windowDays, setWindowDays] = useState<TimeWindow>(timeWindowDays ?? 30);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleSlug | null>(null);

  // ── Plan-Aware Add/Remove Modal & Toast States ────────────────────────────
  const [addToDayTarget, setAddToDayTarget] = useState<{ id: string; name: string; muscle: string } | null>(null);
  const [initialDayIndex, setInitialDayIndex] = useState<number>(1);
  const [removeTarget, setRemoveTarget] = useState<{ exerciseName: string; exerciseId?: string; dayIndex: number; dayName: string } | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

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

  const currentGenderGeo = BODY_PATHS[bodyGender] || BODY_PATHS.male;

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
    let optimalCount = 0;
    for (const slug of MUSCLES) {
      const lm = getHypertrophyLandmarkInfo(weeklyMuscleLoad[slug] || 0, weekBounds.restDayName, slug);
      if (lm.tier === 'mav') optimalCount++;
    }
    // Count actual completed working sets in targetLogs instead of summing multi-muscle fractional weights
    let actualWorkingSets = 0;
    for (const log of targetLogs || []) {
      for (const ex of log.exercises || []) {
        if (ex.skipped) continue;
        actualWorkingSets += (ex.setsLog || []).filter((s: any) => s.completed && !s.isWarmup).length;
      }
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
    const baseColor = isDark ? '#232128' : '#E5E5EA';

    for (const slug of MUSCLES) {
      if (mode === 'fatigue') {
        const r = weeklyFatigue[slug];
        if (!r || r.totalSets === 0) {
          map[slug] = isDark ? '#1E3329' : '#D1F2D9';
        } else if (r.state === 'fatigued') {
          map[slug] = '#FF453A'; // 🔴 Rest Priority
        } else if (r.state === 'recovering') {
          map[slug] = '#FF9F0A'; // 🟡 Recovering
        } else {
          map[slug] = '#30D158'; // 🟢 100% Ready (Supercompensated)
        }
      } else if (mode === 'volume') {
        const sets = weeklyMuscleLoad[slug] || 0;
        if (sets <= 0) {
          map[slug] = baseColor;
        } else {
          // Strictly synced with getHypertrophyLandmarkInfo!
          const lm = getHypertrophyLandmarkInfo(sets, weekBounds.restDayName, slug);
          map[slug] = lm.tierColor;
        }
      } else if (mode === 'balance') {
        const b = balanceModel[slug];
        if (b && b.status !== 'untrained') {
          if (b.status === 'optimal') map[slug] = '#30D158';
          else if (b.status === 'dominant') map[slug] = '#FF9F0A';
          else if (b.status === 'lagging') map[slug] = '#FF453A';
          else map[slug] = baseColor;
        } else {
          map[slug] = baseColor;
        }
      } else {
        map[slug] = baseColor;
      }
    }
    return map;
  }, [mode, isDark, weeklyFatigue, weeklyMuscleLoad, balanceModel, weekBounds.restDayName]);

  const handleMusclePress = React.useCallback((slug: MuscleSlug) => {
    feedback.selectionChange();
    setSelectedMuscle(prev => (prev === slug ? null : slug));
  }, []);

  const dynamicStyles = useMemo(() => ({
    card: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderColor: isDark ? 'transparent' : '#E5E5EA',
      borderWidth: isDark ? 0 : 1,
    },
    segControl: {
      backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA',
    },
    segBtnActive: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
    },
    segBtnTextActive: {
      color: isDark ? '#FFFFFF' : '#000000',
    },
    inspectorCard: {
      backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
    },
    inspectorTitle: {
      color: isDark ? '#FFFFFF' : '#000000',
    },
    inspectorStatusText: {
      color: isDark ? '#FFFFFF' : '#000000',
    },
    dailyRecCard: {
      backgroundColor: isDark ? '#26262A' : '#F2F2F7',
    },
    pairCard: {
      backgroundColor: isDark ? '#26262A' : '#F2F2F7',
    },
    pairSideTitle: {
      color: isDark ? '#8E8E93' : '#636366',
    },
    pairSetsNum: {
      color: isDark ? '#FFFFFF' : '#000000',
    },
    pairPrescriptionText: {
      color: isDark ? '#E5E5EA' : '#1C1C1E',
    },
    guideCard: {
      backgroundColor: isDark ? '#26262A' : '#F2F2F7',
    },
    guideBold: {
      color: isDark ? '#FFFFFF' : '#000000',
    },
    inspectorDirectiveBox: {
      backgroundColor: isDark ? '#1E1E20' : '#E5E5EA',
    },
    inspectorDirectiveText: {
      color: isDark ? '#E5E5EA' : '#1C1C1E',
    },
    landmarkTrackBg: {
      backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA',
    },
  }), [isDark]);

  // ── Render Single SVG View (Front or Back) ──────────────────────────────────
  const renderBodySvg = (
    viewGeo: ViewGeometry,
    label: string
  ) => {
    const inertD = getMergedInertPath(viewGeo, INERT);
    const selectedD = selectedMuscle ? getMergedMusclePath(viewGeo, selectedMuscle) : '';

    return (
      <View style={[styles.bodyViewCol, { width: colWidth }]}>
        <Svg viewBox={viewGeo.vb} style={styles.svgCanvas}>
          <InertSilhouetteLayer inertD={inertD} isDark={isDark} />
          <G>
            {MUSCLES.map(slug => {
              const d = getMergedMusclePath(viewGeo, slug);
              if (!d) return null;

              const isSelected = selectedMuscle === slug;
              const fill = muscleColorMap[slug] || (isDark ? '#232128' : '#E5E5EA');

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
                stroke="#FFFFFF"
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
    <View style={[styles.card, dynamicStyles.card, style]}>

      {/* ── 3-Part Apple iOS HIG Segmented Control (Minimalist, Zero Pills) ── */}
      <View style={[styles.segControl, dynamicStyles.segControl]}>
        <TouchableOpacity
          style={[styles.segBtn, mode === 'fatigue' && [styles.segBtnActive, dynamicStyles.segBtnActive]]}
          onPress={() => {
            feedback.selectionChange();
            setMode('fatigue');
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.segBtnText, mode === 'fatigue' && [styles.segBtnTextActive, dynamicStyles.segBtnTextActive]]} numberOfLines={1}>
            Recovery
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segBtn, mode === 'volume' && [styles.segBtnActive, dynamicStyles.segBtnActive]]}
          onPress={() => {
            feedback.selectionChange();
            setMode('volume');
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.segBtnText, mode === 'volume' && [styles.segBtnTextActive, dynamicStyles.segBtnTextActive]]} numberOfLines={1}>
            Volume
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segBtn, mode === 'balance' && [styles.segBtnActive, dynamicStyles.segBtnActive]]}
          onPress={() => {
            feedback.selectionChange();
            setMode('balance');
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.segBtnText, mode === 'balance' && [styles.segBtnTextActive, dynamicStyles.segBtnTextActive]]} numberOfLines={1}>
            Symmetry
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Subtitle Status Overview Strip ─────────────────────────────────── */}
      <View style={styles.overviewStrip}>
        {mode === 'fatigue' && (
          <Text style={styles.overviewStripText} numberOfLines={1}>
            {fatigueSummary.ready > 0 ? `🟢 ${fatigueSummary.ready} Ready` : '🟢 Ready'} ·{' '}
            {fatigueSummary.recovering > 0 ? `🟡 ${fatigueSummary.recovering} Recovering` : '0 Recovering'} ·{' '}
            {fatigueSummary.fatigued > 0 ? `🔴 ${fatigueSummary.fatigued} Resting` : '0 Resting'}
          </Text>
        )}

        {mode === 'volume' && (
          <Text style={styles.overviewStripText} numberOfLines={1}>
            {volumeSummary.optimalCount > 0 ? `${volumeSummary.optimalCount} muscles in Growth Zone` : '0 muscles in Growth Zone'} · {volumeSummary.totalSetsSum} total sets done this week
          </Text>
        )}

        {mode === 'balance' && (
          <Text style={styles.overviewStripText} numberOfLines={1}>
            Pull vs Push: {balanceSummary.pushPullRatio}x · {balanceSummary.laggingCount > 0 ? `🔴 ${balanceSummary.laggingCount} Falling Behind` : '🟢 Well Balanced'}
          </Text>
        )}
      </View>

      {/* ── Main Dual-View BodyMap (Front & Back) — Locked at Top Y-Position across all tabs ── */}
      <View style={styles.bodyDualContainer}>
        {renderBodySvg(currentGenderGeo.front, 'FRONT')}
        {renderBodySvg(currentGenderGeo.back, 'BACK')}
      </View>

      {/* ── Interactive Muscle Detail Inspector ─────────────────────────────── */}
      {selectedData ? (
        <View style={[styles.inspectorCard, dynamicStyles.inspectorCard]}>
          <View style={styles.inspectorTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <View style={[styles.inspectorDot, { backgroundColor: muscleColorMap[selectedMuscle!] || '#FFFFFF' }]} />
              <Text style={[styles.inspectorTitle, dynamicStyles.inspectorTitle]}>{selectedData.name}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedMuscle(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#8E8E93" />
            </TouchableOpacity>
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
                ? '#30D158'
                : isFatigued
                ? '#FF453A'
                : '#FF9F0A';

              return (
                <View style={{ gap: 6 }}>
                  <View style={styles.inspectorMetricRow}>
                    <Text style={styles.inspectorStatusLabel}>Recovery Status:</Text>
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[
                        styles.inspectorCountdownVal,
                        { color: statusColor },
                      ]}
                    >
                      {isEffectivelyReady
                        ? '⚡ 100% Fresh (Train Hard)'
                        : `⏱️ Full readiness in ~${recHours}h`}
                    </Text>
                  </View>

                  {/* Daily Directive */}
                  <View
                    style={[
                      styles.inspectorDirectiveBox,
                      dynamicStyles.inspectorDirectiveBox,
                      {
                        borderColor: isEffectivelyReady
                          ? 'rgba(48, 209, 88, 0.3)'
                          : isFatigued
                          ? 'rgba(255, 69, 58, 0.3)'
                          : 'rgba(255, 159, 10, 0.3)',
                      },
                    ]}
                  >
                    <Ionicons
                      name={isEffectivelyReady ? 'checkmark-circle' : 'alert-circle'}
                      size={14}
                      color={statusColor}
                    />
                    <Text style={[styles.inspectorDirectiveText, dynamicStyles.inspectorDirectiveText]}>
                      {isEffectivelyReady
                        ? '🟢 READY TO TRAIN: Fully recovered and at 100% strength. Great day to lift heavy or push for a personal record.'
                        : isFatigued
                        ? `🔴 NEEDS REST: Still healing from ${selectedData.weeklyRecovery?.totalSets || 0} sets this week. Skip heavy lifting on this muscle today so it can rebuild and grow.`
                        : `🟡 ALMOST RECOVERED (~${readinessPct}%): Safe for light exercises, but wait ~${recHours}h before going heavy again.`}
                    </Text>
                  </View>

                  <Text style={styles.inspectorMetaText} numberOfLines={1} ellipsizeMode="tail">
                    {selectedData.weeklyRecovery?.lastTrainedDaysAgo != null
                      ? `Last trained: ${
                          selectedData.weeklyRecovery.lastTrainedDaysAgo === 0
                            ? 'Today'
                            : `${selectedData.weeklyRecovery.lastTrainedDaysAgo} days ago`
                        } (${selectedData.weeklyRecovery.totalSets} completed ${selectedData.weeklyRecovery.totalSets === 1 ? 'set' : 'sets'} this week).`
                      : 'No sets logged for this muscle this week.'}
                  </Text>
                </View>
              );
            })()}

            {/* Mode 2: Volume Status & Adaptive Hypertrophy Landmarks */}
            {mode === 'volume' && (() => {
              const landmark = getHypertrophyLandmarkInfo(selectedData.weeklySets, weekBounds.restDayName, selectedMuscle!);
              const progressPct = Math.min(100, Math.round((selectedData.weeklySets / 20) * 100));

              return (
                <View style={{ gap: 6 }}>
                  <View style={styles.inspectorMetricRow}>
                    <Text style={styles.inspectorStatusLabel}>Weekly Volume:</Text>
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[styles.inspectorCountdownVal, { color: landmark.tierColor }]}
                    >
                      {selectedData.weeklySets === 1 ? '1 set' : `${selectedData.weeklySets} sets`} · {landmark.tierLabel}
                    </Text>
                  </View>

                  {/* Hypertrophy Landmarks Bar */}
                  <View style={styles.landmarkScaleWrap}>
                    <View style={[styles.landmarkTrackBg, dynamicStyles.landmarkTrackBg]}>
                      <View
                        style={[
                          styles.landmarkTrackFill,
                          { width: `${progressPct}%`, backgroundColor: landmark.tierColor },
                        ]}
                      />
                    </View>
                    <View style={styles.landmarkTicksRow}>
                      <Text style={styles.landmarkTickText}>0</Text>
                      <Text style={[styles.landmarkTickText, selectedData.weeklySets >= 6 && { color: '#64D2FF' }]}>
                        Maintain (6)
                      </Text>
                      <Text style={[styles.landmarkTickText, selectedData.weeklySets >= 10 && selectedData.weeklySets <= 16 && { color: '#30D158' }]}>
                        Growth Zone (10–16)
                      </Text>
                      <Text style={[styles.landmarkTickText, selectedData.weeklySets >= 20 && { color: '#FF9F0A' }]}>
                        Overworked (20+)
                      </Text>
                    </View>
                  </View>

                  {/* Actionable Weekly Deficit Banner */}
                  <View
                    style={[
                      styles.inspectorDirectiveBox,
                      dynamicStyles.inspectorDirectiveBox,
                      { borderColor: `${landmark.tierColor}44` },
                    ]}
                  >
                    <Ionicons name="sparkles" size={14} color={landmark.tierColor} />
                    <Text style={[styles.inspectorDirectiveText, dynamicStyles.inspectorDirectiveText]}>
                      <Text style={{ fontFamily: FONT_FAMILY.bold, color: landmark.tierColor }}>
                        Target Insight:{' '}
                      </Text>
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
                  <Text style={styles.inspectorStatusLabel}>Symmetry Balance:</Text>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[
                      styles.inspectorCountdownVal,
                      {
                        color:
                          selectedData.balance?.status === 'optimal'
                            ? '#30D158'
                            : selectedData.balance?.status === 'dominant'
                            ? '#FF9F0A'
                            : selectedData.balance?.status === 'lagging'
                            ? '#FF453A'
                            : '#8E8E93',
                      },
                    ]}
                  >
                    {selectedData.balance?.status === 'optimal'
                      ? '🟢 Balanced'
                      : selectedData.balance?.status === 'dominant'
                      ? '🟠 Over-Trained Side'
                      : selectedData.balance?.status === 'lagging'
                      ? '🔴 Needs Catch-Up'
                      : 'Not Trained Yet'}
                  </Text>
                </View>

                {/* Prescriptive Corrective Callout */}
                <View
                  style={[
                    styles.inspectorDirectiveBox,
                    dynamicStyles.inspectorDirectiveBox,
                    {
                      borderColor:
                        selectedData.balance?.status === 'lagging'
                          ? 'rgba(255, 69, 58, 0.4)'
                          : selectedData.balance?.status === 'dominant'
                          ? 'rgba(255, 159, 10, 0.4)'
                          : 'rgba(48, 209, 88, 0.4)',
                    },
                  ]}
                >
                  <Ionicons
                    name="bulb-outline"
                    size={14}
                    color={
                      selectedData.balance?.status === 'lagging'
                        ? '#FF453A'
                        : selectedData.balance?.status === 'dominant'
                        ? '#FF9F0A'
                        : '#30D158'
                    }
                  />
                  <Text style={[styles.inspectorDirectiveText, dynamicStyles.inspectorDirectiveText]}>
                    <Text
                      style={{
                        fontFamily: FONT_FAMILY.bold,
                        color:
                          selectedData.balance?.status === 'lagging'
                            ? '#FF453A'
                            : selectedData.balance?.status === 'dominant'
                            ? '#FF9F0A'
                            : '#30D158',
                      }}
                    >
                      How to Fix:{' '}
                    </Text>
                    {selectedData.balance?.recommendation || 'Maintain consistent antagonistic volume across sessions.'}
                  </Text>
                </View>

                {/* 1-Tap Quick Action Buttons Right in Inspector Card */}
                {(Boolean(selectedData.balance?.addExerciseName) || Boolean(selectedData.balance?.removeExerciseName)) && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {Boolean(selectedData.balance?.addExerciseName) && (
                      <TouchableOpacity
                        style={[
                          styles.correctiveActionBtn,
                          {
                            borderColor: 'rgba(48, 209, 88, 0.45)',
                            backgroundColor: 'rgba(48, 209, 88, 0.12)',
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
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add-circle" size={15} color="#30D158" />
                        <Text style={[styles.correctiveActionBtnText, { color: '#30D158' }]} numberOfLines={2}>
                          + Add {selectedData.balance?.addExerciseName} to {selectedData.balance?.targetDayName || 'Plan'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {Boolean(selectedData.balance?.removeExerciseName) && (
                      <TouchableOpacity
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
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={15} color="#FF453A" />
                        <Text style={[styles.correctiveActionBtnText, { color: '#FF453A' }]} numberOfLines={2}>
                          - Remove {selectedData.balance?.removeExerciseName} from {selectedData.balance?.removeDayName || 'Plan'}
                        </Text>
                      </TouchableOpacity>
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

      {/* ── Mode 1 (Recovery): Daily Training Recommendation Banner ────────── */}
      {mode === 'fatigue' && (
        <View style={[styles.dailyRecCard, dynamicStyles.dailyRecCard]}>
          {/* Prime for Today */}
          <View style={styles.dailyRecSection}>
            <View style={styles.dailyRecHeader}>
              <View style={[styles.statusDot, { backgroundColor: '#30D158' }]} />
              <Text style={styles.dailyRecTitle}>READY TO TRAIN TODAY</Text>
            </View>
            {recoveryRecs.primeToTrain.length > 0 ? (
              <View style={styles.recChipsWrap}>
                {recoveryRecs.primeToTrain.slice(0, 5).map(m => {
                  const isSel = selectedMuscle === m.slug;
                  return (
                    <TouchableOpacity
                      key={`prime-${m.slug}`}
                      style={[styles.primeChip, isSel && styles.primeChipSelected]}
                      onPress={() => handleMusclePress(m.slug)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.primeChipText, isSel && styles.chipTextSelected]}>
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.dailyRecEmpty}>
                Most of your muscles are still recovering. Take a rest day or do light cardio.
              </Text>
            )}
          </View>

          {/* Rest Priority */}
          {recoveryRecs.restPriority.length > 0 && (
            <View style={[styles.dailyRecSection, { marginTop: 8 }]}>
              <View style={styles.dailyRecHeader}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: recoveryRecs.restPriority.some(m => m.state === 'fatigued')
                        ? '#FF453A'
                        : '#FF9F0A',
                    },
                  ]}
                />
                <Text style={styles.dailyRecTitle}>
                  RESTING & RECOVERING
                </Text>
              </View>
              <View style={styles.recChipsWrap}>
                {recoveryRecs.restPriority.slice(0, 4).map(m => {
                  const isSel = selectedMuscle === m.slug;
                  const isFatigued = m.state === 'fatigued';
                  return (
                    <TouchableOpacity
                      key={`rest-${m.slug}`}
                      style={[
                        styles.restChip,
                        !isFatigued && {
                          backgroundColor: 'rgba(255, 159, 10, 0.12)',
                          borderColor: 'rgba(255, 159, 10, 0.3)',
                        },
                        isSel &&
                          (isFatigued
                            ? styles.restChipSelected
                            : { backgroundColor: '#FF9F0A', borderColor: '#FF9F0A' }),
                      ]}
                      onPress={() => handleMusclePress(m.slug)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.restChipText,
                          !isFatigued && { color: '#FF9F0A' },
                          isSel && styles.chipTextSelected,
                        ]}
                      >
                        {m.name} (~{m.estimatedHours}h left)
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── Mode 3 (Symmetry): Core Antagonistic Pair Cards ───────────────── */}
      {mode === 'balance' && (
        <View style={styles.antagonistSection}>
          <View style={styles.antagonistHeaderRow}>
            <Ionicons name="git-compare-outline" size={14} color="#8E8E93" />
            <Text style={styles.antagonistSectionTitle}>MUSCLE BALANCE & POSTURE</Text>
          </View>

          {antagonisticPairs.map(pair => {
            const loggedA = Math.round(pair.setsA);
            const loggedB = Math.round(pair.setsB);
            const totalA = Math.round(pair.totalSetsA);
            const totalB = Math.round(pair.totalSetsB);
            const plannedA = Math.round(pair.upcomingSetsA);
            const plannedB = Math.round(pair.upcomingSetsB);

            return (
              <View key={pair.id} style={[styles.pairCard, dynamicStyles.pairCard]}>
                <View style={styles.pairTopRow}>
                  <Text style={styles.pairCategory}>{pair.category}</Text>
                  <View style={[styles.pairStatusBadge, { backgroundColor: `${pair.statusColor}22` }]}>
                    <View style={[styles.statusDot, { backgroundColor: pair.statusColor }]} />
                    <Text style={[styles.pairStatusText, { color: pair.statusColor }]}>
                      {pair.humanStatus || pair.statusLabel}
                    </Text>
                  </View>
                </View>

                {/* Clean Plain-English Sets Comparison Row (No vague algebra or confusing percentages) */}
                <View style={styles.pairMetricsRow}>
                  <View style={styles.pairSideCol}>
                    <Text style={[styles.pairSideTitle, dynamicStyles.pairSideTitle]} numberOfLines={1}>{pair.nameA}</Text>
                    <Text style={[styles.pairSetsNum, dynamicStyles.pairSetsNum]}>
                      {totalA === 0 ? (
                        <>0 <Text style={styles.pairSetsUnit}>sets</Text></>
                      ) : loggedA === 0 && plannedA > 0 ? (
                        <>{plannedA} <Text style={[styles.pairSetsUnit, { color: '#A599FF' }]}>sets planned</Text></>
                      ) : (
                        <>{totalA} <Text style={styles.pairSetsUnit}>sets this week</Text></>
                      )}
                    </Text>
                  </View>

                  <View style={[styles.pairSideCol, { alignItems: 'flex-end' }]}>
                    <Text style={[styles.pairSideTitle, dynamicStyles.pairSideTitle]} numberOfLines={1}>{pair.nameB}</Text>
                    <Text style={[styles.pairSetsNum, dynamicStyles.pairSetsNum]}>
                      {totalB === 0 ? (
                        <>0 <Text style={styles.pairSetsUnit}>sets</Text></>
                      ) : loggedB === 0 && plannedB > 0 ? (
                        <>{plannedB} <Text style={[styles.pairSetsUnit, { color: '#64D2FF' }]}>sets planned</Text></>
                      ) : (
                        <>{totalB} <Text style={styles.pairSetsUnit}>sets this week</Text></>
                      )}
                    </Text>
                  </View>
                </View>

                {/* Prescriptive Guidance */}
                <View style={[styles.pairPrescriptionBox, dynamicStyles.inspectorDirectiveBox]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, flex: 1 }}>
                    <Ionicons
                      name={pair.status === 'optimal' ? 'checkmark-circle-outline' : 'bulb-outline'}
                      size={14}
                      color={pair.statusColor}
                      style={{ marginTop: 1 }}
                    />
                    <Text style={[styles.pairPrescriptionText, dynamicStyles.pairPrescriptionText]}>
                      {pair.correctiveRecommendation}
                    </Text>
                  </View>

                  {/* 1-Tap ADD Action: Opens AddToDaySheet targeting user's specific split day */}
                  {pair.actionType === 'add' && pair.correctiveExerciseName && (
                    <TouchableOpacity
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
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add-circle" size={15} color={pair.statusColor} />
                      <Text style={[styles.correctiveActionBtnText, { color: pair.statusColor }]} numberOfLines={2}>
                        + Add {pair.correctiveExerciseName} to Routine
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* 1-Tap REMOVE Action: Confirms and removes actual scheduled exercise from routine */}
                  {pair.actionType === 'remove' && pair.removeExerciseName && (
                    <TouchableOpacity
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
                      activeOpacity={0.7}
                    >
                      <Ionicons name="remove-circle" size={15} color="#FF453A" />
                      <Text style={[styles.correctiveActionBtnText, { color: '#FF453A' }]} numberOfLines={2}>
                        - Remove {pair.removeExerciseName} from {pair.removeDayName || 'Plan'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Educational Guide: What This Tells You & Good vs Bad ───────────── */}
      <View style={[styles.guideCard, dynamicStyles.guideCard]}>
        <View style={styles.guideHeaderRow}>
          <Ionicons name="information-circle-outline" size={15} color="#8E8E93" />
          <Text style={styles.guideHeaderTitle}>
            {mode === 'fatigue'
              ? 'HOW RECOVERY WORKS'
              : mode === 'volume'
              ? 'HOW WEEKLY SETS WORK'
              : 'WHY MUSCLE BALANCE MATTERS'}
          </Text>
        </View>

        {mode === 'fatigue' && (
          <View style={styles.guideBullets}>
            <Text style={styles.guideBulletText}>
              • <Text style={[styles.guideBold, dynamicStyles.guideBold]}>Recovery Timer:</Text> Estimates how many hours until a muscle is back at 100% strength based on how hard you trained it.
            </Text>
            <Text style={styles.guideBulletText}>
              • <Text style={[styles.guideBold, { color: '#30D158' }]}>🟢 Ready to Train:</Text> 100% fresh. Best muscles to train heavy today.
            </Text>
            <Text style={styles.guideBulletText}>
              • <Text style={[styles.guideBold, { color: '#FF453A' }]}>🔴 Needs Rest:</Text> Still repairing from a recent workout. Training it too early slows down muscle growth.
            </Text>
          </View>
        )}

        {mode === 'volume' && (
          <View style={styles.guideBullets}>
            <Text style={styles.guideBulletText}>
              • <Text style={[styles.guideBold, dynamicStyles.guideBold]}>Weekly Goal:</Text> Aim for <Text style={[styles.guideBold, { color: '#30D158' }]}>10 to 16 sets per week</Text> (the Growth Zone) on major muscles for the fastest results.
            </Text>
            <Text style={styles.guideBulletText}>
              • <Text style={[styles.guideBold, { color: '#A599FF' }]}>Maintaining (6–9 sets):</Text> Enough to keep the muscle you already have, even on a busy week.
            </Text>
            <Text style={styles.guideBulletText}>
              • <Text style={[styles.guideBold, { color: '#FF9F0A' }]}>Overworked (20+ sets):</Text> Doing more than 20 sets a week usually causes joint wear and exhaustion without extra growth.
            </Text>
          </View>
        )}

        {mode === 'balance' && (
          <View style={styles.guideBullets}>
            <Text style={styles.guideBulletText}>
              • <Text style={[styles.guideBold, dynamicStyles.guideBold]}>Opposing Muscles:</Text> Your body works in pairs—Chest vs. Back, Quads vs. Hamstrings, and Biceps vs. Triceps.
            </Text>
            <Text style={styles.guideBulletText}>
              • <Text style={[styles.guideBold, { color: '#FF453A' }]}>Injury Protection:</Text> Training one side way more than the other pulls your joints out of alignment (causing shoulder or knee pain).
            </Text>
            <Text style={styles.guideBulletText}>
              • <Text style={[styles.guideBold, { color: '#30D158' }]}>1-Tap Fixes:</Text> Use the + Add or - Remove buttons above to balance your weekly workout plan in one tap.
            </Text>
          </View>
        )}
      </View>

      {/* ── Dynamic Legend Bar (Clean Apple Typography, No Pills) ─────────── */}
      <View style={styles.legendRow}>
        {mode === 'fatigue' && (
          <View style={styles.legendItemsWrap}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#30D158' }]} />
              <Text style={styles.legendLabel}>Fresh (Train Hard)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF9F0A' }]} />
              <Text style={styles.legendLabel}>Recovering (Go Light)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF453A' }]} />
              <Text style={styles.legendLabel}>Needs Rest (Skip Today)</Text>
            </View>
          </View>
        )}

        {mode === 'volume' && (
          <View style={styles.legendItemsWrap}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#30D158' }]} />
              <Text style={styles.legendLabel}>Growth Zone (10–16)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#64D2FF' }]} />
              <Text style={styles.legendLabel}>Heavy Workload (17–20)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#A599FF' }]} />
              <Text style={styles.legendLabel}>Maintaining (6–9)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#6D5FE0' }]} />
              <Text style={styles.legendLabel}>Warming Up (1–5)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF9F0A' }]} />
              <Text style={styles.legendLabel}>Overworked (20+)</Text>
            </View>
          </View>
        )}

        {mode === 'balance' && (
          <View style={styles.legendItemsWrap}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#30D158' }]} />
              <Text style={styles.legendLabel}>Balanced</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF9F0A' }]} />
              <Text style={styles.legendLabel}>Trained More</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF453A' }]} />
              <Text style={styles.legendLabel}>Needs Catch-Up</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Add to Split Day Sheet ── */}
      <AddToDaySheet
        visible={addToDayTarget !== null}
        exercise={addToDayTarget}
        initialDayIndex={initialDayIndex}
        initialSets={3}
        onClose={() => setAddToDayTarget(null)}
        onSuccess={(dayName) => {
          feedback.success();
          setActionToast(`✓ Added ${addToDayTarget?.name} to ${dayName}`);
          setTimeout(() => setActionToast(null), 3500);
          setAddToDayTarget(null);
        }}
      />

      {/* ── Remove Exercise from Plan Confirmation Modal ── */}
      <Modal
        visible={removeTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRemoveTarget(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRemoveTarget(null)}>
          <Pressable
            style={[styles.confirmCard, { backgroundColor: isDark ? '#1C1B24' : '#FFFFFF' }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.confirmIconWrap}>
              <Ionicons name="trash-outline" size={24} color="#FF453A" />
            </View>
            <Text style={[styles.confirmTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>
              Remove from {removeTarget?.dayName}?
            </Text>
            <Text style={[styles.confirmDesc, { color: isDark ? '#8E8E93' : '#636366' }]}>
              Remove <Text style={{ color: isDark ? '#FFFFFF' : '#1C1C1E', fontFamily: FONT_FAMILY.bold }}>{removeTarget?.exerciseName}</Text> from your routine to prevent muscle overload and protect joints.
            </Text>
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmCancelBtn]}
                onPress={() => setRemoveTarget(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmRemoveBtn]}
                onPress={async () => {
                  if (!removeTarget) return;
                  feedback.success();
                  const isArnold = userGymPlan?.templateId === 'arnold';
                  const basePlan = isArnold ? GYM_PLAN_ARNOLD : GYM_PLAN;
                  const currentDay = userGymPlan?.customDays?.[removeTarget.dayIndex] || basePlan.find(d => d.dayIndex === removeTarget.dayIndex) || basePlan[removeTarget.dayIndex - 1];

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
                    });
                    setActionToast(`✓ Removed ${removeTarget.exerciseName} from ${removeTarget.dayName}`);
                    setTimeout(() => setActionToast(null), 3500);
                  }
                  setRemoveTarget(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmRemoveText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Action Success Toast ── */}
      {actionToast && (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={15} color="#30D158" />
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
    (prev.gymLogs === next.gymLogs || generateDatasetFingerprint(prev.gymLogs) === generateDatasetFingerprint(next.gymLogs))
  );
});

// ── Minimalist Apple iOS HIG Stylesheet ──────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 0,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#1C1C1E',
  },

  // Segmented Control (Minimal, Subtle, No Pills)
  segControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 3,
    marginBottom: 8,
    height: 38,
    gap: 2,
  },
  segBtn: {
    flex: 1,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    paddingHorizontal: 4,
  },
  segBtnActive: {
    backgroundColor: '#1C1C1E',
  },
  segBtnText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12.5,
    color: '#8E8E93',
  },
  segBtnTextActive: {
    color: '#FFFFFF',
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
    color: '#8E8E93',
  },

  // Dual Body Map
  bodyDualContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 4,
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
    color: '#636366',
    letterSpacing: 1,
    marginTop: 4,
  },

  // Interactive Inspector Card
  inspectorCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
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
    color: '#FFFFFF',
  },
  inspectorContent: {
    paddingLeft: 15,
  },
  inspectorStatusText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  inspectorBodyText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8E8E93',
    lineHeight: 16,
    marginTop: 2,
  },
  tapPromptText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#636366',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 2,
  },

  // Educational Guide Card
  guideCard: {
    backgroundColor: '#26262A',
    borderRadius: 12,
    padding: 12,
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
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  guideBullets: {
    gap: 4,
  },
  guideBulletText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    lineHeight: 16,
  },
  guideBold: {
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },

  // Legend Bar (Minimal, No Pills)
  legendRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(84, 84, 88, 0.36)',
  },
  legendItemsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
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
    color: '#8E8E93',
  },

  // Mode 1: Daily Recovery Recommendation Card
  dailyRecCard: {
    backgroundColor: '#26262A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
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
    color: '#8E8E93',
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.3)',
  },
  primeChipSelected: {
    backgroundColor: '#30D158',
    borderColor: '#30D158',
  },
  primeChipText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#30D158',
  },
  restChip: {
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  restChipSelected: {
    backgroundColor: '#FF453A',
    borderColor: '#FF453A',
  },
  restChipText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#FF453A',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY.bold,
  },
  dailyRecEmpty: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
    fontStyle: 'italic',
  },

  // Inspector Elevated Metrics
  inspectorMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingBottom: 4,
  },
  inspectorStatusLabel: {
    flexShrink: 0,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8E8E93',
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
    backgroundColor: '#1E1E20',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    marginTop: 2,
  },
  inspectorDirectiveText: {
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#E5E5EA',
    lineHeight: 16,
  },
  inspectorMetaText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#636366',
    marginTop: 2,
  },

  // Hypertrophy Landmark Gauge
  landmarkScaleWrap: {
    marginTop: 2,
    marginBottom: 4,
  },
  landmarkTrackBg: {
    height: 6,
    backgroundColor: '#1C1C1E',
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
    marginTop: 4,
  },
  landmarkTickText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 9.5,
    color: '#636366',
  },

  // Mode 3: 3 Core Antagonistic Pair Cards
  antagonistSection: {
    marginTop: 10,
    gap: 8,
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
    color: '#8E8E93',
    letterSpacing: 0.6,
  },
  pairCard: {
    backgroundColor: '#26262A',
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  pairTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pairCategory: {
    flex: 1,
    flexShrink: 1,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  pairStatusBadge: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    paddingVertical: 3,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(84, 84, 88, 0.25)',
  },
  pairSideCol: {
    flex: 1,
  },
  pairSideTitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 1,
  },
  pairSetsNum: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  pairSetsUnit: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    color: '#8E8E93',
  },
  pairPlannedUnit: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10.5,
    color: '#A599FF',
  },
  balanceBarContainer: {
    paddingVertical: 4,
    gap: 3,
  },
  balanceBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
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
    color: '#A599FF',
  },
  balanceSubCenter: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10,
    color: '#8E8E93',
  },
  balanceSubRight: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    color: '#64D2FF',
  },
  pairPrescriptionBox: {
    backgroundColor: '#1E1E20',
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  pairPrescriptionText: {
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#D1D1D6',
    lineHeight: 15,
  },
  correctiveActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 69, 58, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    textAlign: 'center',
  },
  confirmDesc: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  confirmBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  confirmCancelText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#8E8E93',
  },
  confirmRemoveBtn: {
    backgroundColor: '#FF453A',
  },
  confirmRemoveText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1C1B24',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  toastText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#30D158',
  },
});

export default AnatomicalBodyMapCard;
