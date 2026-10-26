/**
 * AnatomicalBodyMapCard.tsx — ZenTrack Mobile
 *
 * Full-Featured Dual-View (Front & Back) SVG Anatomical Muscle Heatmap & Recovery Map:
 * - 3 Interactive Modes: [ Muscle balance | Fatigue | Strength ]
 * - High-precision vector paths for all 18 muscle groups + anatomical silhouettes.
 * - Interactive muscle touch selection with detail stats breakdown.
 * - Exponential fatigue recovery decay and strength retention modeling.
 * - Integrated with real workout history & active gym logs.
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, useWindowDimensions } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONT_FAMILY, FONT_SIZE } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { feedback } from '../../utils/haptics';
import { generateDatasetFingerprint } from '../../utils/hotCacheStore';
import { BODY_PATHS, ViewGeometry, getMergedMusclePath, getMergedInertPath } from './bodyPaths';
import {
  MUSCLES,
  INERT,
  MUSCLE_NAME,
  MuscleSlug,
  calculateMuscleLoad,
  calculateMuscleLevels,
  calculateMuscleFatigue,
  calculateMacroVolumeLoad,
  calculateMuscleGrowthProgression,
  calculateSymmetryAndBalance,
} from '../../services/muscleRecoveryService';
import { GymDayLog } from '../../types/gym.types';

const MUSCLE_SELECTION_ORDER: MuscleSlug[] = [
  'chest',
  'deltoids',
  'biceps',
  'triceps',
  'upper-back',
  'abs',
  'quadriceps',
  'hamstring',
  'gluteal',
  'calves',
  'trapezius',
  'forearm',
  'lower-back',
  'obliques',
  'adductors',
  'serratus',
  'tibialis',
  'hip-flexors',
];

// Pre-join path arrays ONCE at module load time (38 total SVG Path components, zero allocations)
const JOINED_BODY_PATHS = (() => {
  const result: Record<'male' | 'female', {
    front: { vb: string; inertJoined: string; muscles: Record<string, string> };
    back:  { vb: string; inertJoined: string; muscles: Record<string, string> };
  }> = {} as any;

  for (const gender of ['male', 'female'] as const) {
    result[gender] = {} as any;
    for (const side of ['front', 'back'] as const) {
      const geo = BODY_PATHS[gender][side];
      const inertArr: string[] = [];
      INERT.forEach(slug => {
        if (geo.p[slug]) inertArr.push(...geo.p[slug]);
      });
      const muscles: Record<string, string> = {};
      MUSCLES.forEach(slug => {
        if (geo.p[slug]?.length) {
          muscles[slug] = geo.p[slug].join(' ');
        }
      });
      result[gender][side] = {
        vb: geo.vb,
        inertJoined: inertArr.join(' '),
        muscles,
      };
    }
  }
  return result;
})();

interface Props {
  gymLogs: GymDayLog[];
  weekAnchorDate?: string;
  bodyGender?: 'male' | 'female';
  variant?: 'analytics' | 'weekly';
  timeWindowDays?: TimeWindow;
  defaultMode?: string;
  style?: any;
}

export type TimeWindow = 7 | 30 | 90 | 365 | 0;

export const AnatomicalBodyMapCard: React.FC<Props> = React.memo(({
  gymLogs,
  weekAnchorDate,
  bodyGender = 'male',
  variant = 'analytics',
  timeWindowDays,
  defaultMode,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const colWidth = Math.min((screenWidth - 70) / 2, 175);
  const initialMode = defaultMode || (variant === 'weekly' ? 'volume' : 'fatigue');
  const [mode, setMode] = useState<string>(initialMode);
  const [windowDays, setWindowDays] = useState<TimeWindow>(timeWindowDays ?? (variant === 'weekly' ? 7 : 30));
  const [onlyHardSets, setOnlyHardSets] = useState<boolean>(false);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleSlug | null>(null);

  // Sync mode when defaultMode changes
  React.useEffect(() => {
    if (defaultMode) setMode(defaultMode);
  }, [defaultMode]);

  // Sync with external timeWindowDays prop if passed
  React.useEffect(() => {
    if (timeWindowDays !== undefined) {
      setWindowDays(timeWindowDays);
    }
  }, [timeWindowDays]);

  // ── Macro Analytics Models (Strictly gated by active mode) ──
  const needVolume = mode === 'volume';
  const volumeModel = useMemo(
    () => needVolume ? calculateMacroVolumeLoad(gymLogs, windowDays as any, weekAnchorDate) : ({} as Record<string, any>),
    [gymLogs, windowDays, weekAnchorDate, needVolume]
  );

  const needGrowth = mode === 'growth';
  const growthModel = useMemo(
    () => needGrowth ? calculateMuscleGrowthProgression(gymLogs, windowDays as any, weekAnchorDate) : ({} as Record<string, any>),
    [gymLogs, windowDays, weekAnchorDate, needGrowth]
  );

  const needBalance = mode === 'balance';
  const balanceModel = useMemo(
    () => needBalance ? calculateSymmetryAndBalance(gymLogs, windowDays as any, weekAnchorDate) : ({} as Record<string, any>),
    [gymLogs, windowDays, weekAnchorDate, needBalance]
  );

  // ── Weekly & Fatigue Models ─────────────────────────────────────────────────
  const weeklyMuscleLoad = useMemo(
    () => calculateMuscleLoad(gymLogs, variant === 'weekly' ? 0 : 7, weekAnchorDate, onlyHardSets),
    [gymLogs, weekAnchorDate, onlyHardSets, variant]
  );

  const weeklyMuscleLevels = useMemo(
    () => calculateMuscleLevels(weeklyMuscleLoad as any),
    [weeklyMuscleLoad]
  );

  const needFatigue = mode === 'fatigue' || mode === 'strength';
  const weeklyFatigue = useMemo(
    () => needFatigue ? calculateMuscleFatigue(gymLogs, weekAnchorDate) : ({} as Record<string, any>),
    [gymLogs, weekAnchorDate, needFatigue]
  );

  const genderGeometry = JOINED_BODY_PATHS[bodyGender] || JOINED_BODY_PATHS.male;

  // ── Memoized Color Map (O(1) lookup: eliminates 36 function recalculations on every tap) ──
  const muscleColorMap = useMemo<Record<MuscleSlug, string>>(() => {
    const map = {} as Record<MuscleSlug, string>;
    const baseColor = isDark ? '#232128' : '#e4e4e9';

    for (const slug of MUSCLES) {
      if (mode === 'fatigue') {
        const r = weeklyFatigue[slug];
        const level = r ? r.fatigueLevel : 0;
        if (level === 4) map[slug] = '#ff4757'; // 🔴 Fatigued
        else if (level === 3) map[slug] = '#ff7f50'; // 🟠 High
        else if (level === 2) map[slug] = '#ffd32a'; // 🟡 Recovering
        else if (level === 1) map[slug] = '#d4ac0d'; // 🟡 Light
        else map[slug] = baseColor;
      } else if (variant === 'weekly') {
        if (mode === 'volume') {
          const level = weeklyMuscleLevels[slug] || 0;
          if (level === 4) map[slug] = '#5eda9e'; // 🟢 Peak volume / Target Hit
          else if (level === 3) map[slug] = '#89dceb'; // 🔹 Optimal volume
          else if (level === 2) map[slug] = '#a599ff'; // 🟣 Moderate volume
          else if (level === 1) map[slug] = '#6d5fe0'; // 🟣 Base volume
          else map[slug] = baseColor;
        } else if (mode === 'balance') {
          const b = balanceModel[slug];
          if (b && b.status !== 'untrained') map[slug] = b.color;
          else {
            const level = weeklyMuscleLevels[slug] || 0;
            if (level === 4) map[slug] = '#5eda9e';
            else if (level === 3) map[slug] = '#89dceb';
            else if (level === 2) map[slug] = '#a599ff';
            else if (level === 1) map[slug] = '#6d5fe0';
            else map[slug] = baseColor;
          }
        } else if (mode === 'strength') {
          const r = weeklyFatigue[slug];
          const score = r ? r.strengthScore : 0.7;
          if (score >= 0.95) map[slug] = '#ffd32a';
          else if (score >= 0.88) map[slug] = '#cca00b';
          else if (score >= 0.80) map[slug] = '#a6820a';
          else if (score >= 0.73) map[slug] = '#6b5406';
          else map[slug] = baseColor;
        } else {
          map[slug] = baseColor;
        }
      } else {
        // Long-Term Analytics Variant
        if (mode === 'volume') {
          const v = volumeModel[slug];
          if (!v || v.level === 0) map[slug] = baseColor;
          else if (v.level === 4) map[slug] = '#5eda9e';
          else if (v.level === 3) map[slug] = '#89dceb';
          else if (v.level === 2) map[slug] = '#a599ff';
          else if (v.level === 1) map[slug] = '#6d5fe0';
          else map[slug] = baseColor;
        } else if (mode === 'growth') {
          const g = growthModel[slug];
          map[slug] = (g && g.status !== 'untrained') ? g.color : baseColor;
        } else if (mode === 'balance') {
          const b = balanceModel[slug];
          map[slug] = (b && b.status !== 'untrained') ? b.color : baseColor;
        } else {
          map[slug] = baseColor;
        }
      }
    }
    return map;
  }, [mode, variant, isDark, weeklyFatigue, weeklyMuscleLevels, balanceModel, volumeModel, growthModel]);

  const handleMusclePress = (slug: MuscleSlug) => {
    feedback.selectionChange();
    setSelectedMuscle(prev => (prev === slug ? null : slug));
  };

const InertSilhouetteLayer = React.memo(function InertSilhouetteLayer({
  inertD,
  isDark,
}: {
  inertD: string;
  isDark: boolean;
}) {
  const inertColor = isDark ? '#18171c' : '#d1d1d6';
  if (!inertD) return null;
  return <Path d={inertD} fill={inertColor} />;
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
        {/* Visible Single Combined Muscle Path */}
        <Path
          key={`muscle-${slug}`}
          d={d}
          fill={fill}
          stroke={isSelected ? '#ffffff' : isDark ? '#111016' : '#ffffff'}
          strokeWidth={isSelected ? 5 : 1.2}
          strokeLinejoin="round"
        />
      </G>
    );
  },
  (prev, next) =>
    prev.fill === next.fill &&
    prev.isSelected === next.isSelected &&
    prev.isDark === next.isDark &&
    prev.d === next.d
);

  // ── Render Single SVG View (Front or Back) ──────────────────────────────────
  const renderBodySvg = (
    viewData: { vb: string; inertJoined: string; muscles: Record<string, string> },
    label: string
  ) => {
    return (
      <View
        style={[styles.bodyViewCol, { width: colWidth }]}
        renderToHardwareTextureAndroid={true}
        shouldRasterizeIOS={true}
      >
        <Svg viewBox={viewData.vb} style={styles.svgCanvas}>
          {/* Inert Silhouette (Head, Neck, Hands, Feet, Knees, Joints) */}
          <InertSilhouetteLayer inertD={viewData.inertJoined} isDark={isDark} />

          {/* Interactive Muscle Layers with Expanded Hit Boxes */}
          <G>
            {MUSCLES.map(slug => {
              const d = viewData.muscles[slug];
              if (!d) return null;

              const isSelected = selectedMuscle === slug;
              const fill = muscleColorMap[slug] || (isDark ? '#232128' : '#e4e4e9');

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
          </G>
        </Svg>
        <Text style={styles.bodyViewLabel}>{label}</Text>
      </View>
    );
  };

  const selectedData = selectedMuscle
    ? {
        name: MUSCLE_NAME[selectedMuscle],
        vol: volumeModel[selectedMuscle],
        growth: growthModel[selectedMuscle],
        balance: balanceModel[selectedMuscle],
        weeklySets: Math.round((weeklyMuscleLoad[selectedMuscle] || 0) * 10) / 10,
        weeklyRecovery: weeklyFatigue[selectedMuscle],
      }
    : null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1C1C1E' : '#ffffff',
          borderColor: 'transparent',
        },
        style,
      ]}
    >
      {/* ── Segmented Control Tabs [ Fatigue | Volume | Symmetry ] ────────────────────── */}
      <View style={styles.segControl}>
        <TouchableOpacity
          style={[styles.segBtn, mode === 'fatigue' && styles.segBtnActive]}
          onPress={() => {
            feedback.selectionChange();
            setMode('fatigue');
          }}
          activeOpacity={0.75}
        >
          <Text style={[styles.segBtnText, mode === 'fatigue' && styles.segBtnTextActive]} numberOfLines={1}>
            Fatigue
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segBtn, mode === 'volume' && styles.segBtnActive]}
          onPress={() => {
            feedback.selectionChange();
            setMode('volume');
          }}
          activeOpacity={0.75}
        >
          <Text style={[styles.segBtnText, mode === 'volume' && styles.segBtnTextActive]} numberOfLines={1}>
            Volume
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segBtn, mode === 'balance' && styles.segBtnActive]}
          onPress={() => {
            feedback.selectionChange();
            setMode('balance');
          }}
          activeOpacity={0.75}
        >
          <Text style={[styles.segBtnText, mode === 'balance' && styles.segBtnTextActive]} numberOfLines={1}>
            Symmetry
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Main Dual-View BodyMap (Front & Back) ────────────────────────────── */}
      <View
        style={styles.bodyDualContainer}
        renderToHardwareTextureAndroid={true}
        shouldRasterizeIOS={true}
      >
        {renderBodySvg(genderGeometry.front, 'FRONT')}
        {renderBodySvg(genderGeometry.back, 'BACK')}
      </View>

      {/* ── Interactive Muscle Detail Inspector ─────────────────────────────── */}
      {selectedData ? (
        <View style={styles.inspectorCard}>
          <View style={styles.inspectorTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.inspectorDot, { backgroundColor: muscleColorMap[selectedMuscle!] || colors.accentPrimary }]} />
              <Text style={[styles.inspectorTitle, { color: colors.textPrimary }]}>{selectedData.name}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedMuscle(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#8e8e93" />
            </TouchableOpacity>
          </View>

          <View style={styles.inspectorStatsRow}>
            {variant === 'weekly' ? (
              <>
                {mode === 'fatigue' && selectedData.weeklyRecovery && (
                  <View style={{ gap: 3 }}>
                    <Text style={styles.inspectorStatText}>
                      Status:{' '}
                      <Text
                        style={{
                          fontFamily: FONT_FAMILY.bold,
                          color:
                            selectedData.weeklyRecovery.state === 'fatigued'
                              ? '#ff4757'
                              : selectedData.weeklyRecovery.state === 'recovering'
                              ? '#ffd32a'
                              : '#5eda9e',
                        }}
                      >
                        {selectedData.weeklyRecovery.state === 'fatigued'
                          ? '🔴 Fatigued (Rest Recommended)'
                          : selectedData.weeklyRecovery.state === 'recovering'
                          ? '🟡 Recovering (Active Adaptation)'
                          : '🟢 Ready for Heavy Stimulus'}
                      </Text>
                    </Text>
                    {selectedData.weeklyRecovery.lastTrainedDaysAgo !== null ? (
                      <Text style={styles.inspectorSubText}>
                        Last trained: {selectedData.weeklyRecovery.lastTrainedDaysAgo === 0 ? 'Today' : `${selectedData.weeklyRecovery.lastTrainedDaysAgo} days ago`} ({selectedData.weeklyRecovery.totalSets} sets)
                      </Text>
                    ) : (
                      <Text style={styles.inspectorSubText}>Not trained this week</Text>
                    )}
                  </View>
                )}

                {(mode === 'volume' || mode === 'balance') && (
                  <View style={{ gap: 2 }}>
                    <Text style={styles.inspectorStatText}>
                      🎯 Weekly Volume:{' '}
                      <Text style={{ color: '#5eda9e', fontFamily: FONT_FAMILY.bold }}>
                        {selectedData.weeklySets} sets
                      </Text>{' '}
                      <Text style={{ color: muscleColorMap[selectedMuscle!] || '#5eda9e', fontFamily: FONT_FAMILY.bold }}>
                        ({weeklyMuscleLevels[selectedMuscle!] === 4
                          ? '🟢 Target Hit (12+ sets)'
                          : weeklyMuscleLevels[selectedMuscle!] === 3
                          ? '🔹 Optimal Volume (8–11 sets)'
                          : weeklyMuscleLevels[selectedMuscle!] === 2
                          ? '🟣 Moderate (4–7 sets)'
                          : weeklyMuscleLevels[selectedMuscle!] === 1
                          ? '🔮 Base (1–3 sets)'
                          : '⚫ Untrained'})
                      </Text>
                    </Text>
                  </View>
                )}

                {mode === 'strength' && selectedData.weeklyRecovery && (
                  <Text style={styles.inspectorStatText}>
                    ⚡ Retained Capacity:{' '}
                    <Text style={{ color: '#ffd32a', fontFamily: FONT_FAMILY.bold }}>
                      {Math.round(selectedData.weeklyRecovery.strengthScore * 100)}%
                    </Text>
                  </Text>
                )}
              </>
            ) : (
              <>
                {mode === 'volume' && selectedData.vol && (
                  <Text style={styles.inspectorStatText}>
                    🎯 Volume:{' '}
                    <Text style={{ color: '#5eda9e', fontFamily: FONT_FAMILY.bold }}>
                      {selectedData.vol.sets} sets
                    </Text>{' '}
                    ({selectedData.vol.volumeKg >= 1000 ? `${(selectedData.vol.volumeKg / 1000).toFixed(1)}k` : selectedData.vol.volumeKg} kg ·{' '}
                    <Text style={{ color: '#89dceb', fontFamily: FONT_FAMILY.bold }}>
                      {selectedData.vol.percentage}% of total
                    </Text>)
                  </Text>
                )}

                {mode === 'growth' && selectedData.growth && (
                  <View style={{ gap: 3 }}>
                    <Text style={styles.inspectorStatText}>
                      📈 Overload Gain:{' '}
                      <Text
                        style={{
                          fontFamily: FONT_FAMILY.bold,
                          color: selectedData.growth.color,
                        }}
                      >
                        {selectedData.growth.gainPct > 0 ? `+${selectedData.growth.gainPct}%` : `${selectedData.growth.gainPct}%`} Load Progression
                      </Text>
                    </Text>
                    {selectedData.growth.bestExercise ? (
                      <Text style={styles.inspectorSubText}>
                        Top Progressing Movement: {selectedData.growth.bestExercise} (+{selectedData.growth.loadDeltaKg}kg)
                      </Text>
                    ) : (
                      <Text style={styles.inspectorSubText}>Initial training baseline established</Text>
                    )}
                  </View>
                )}

                {mode === 'balance' && selectedData.balance && (
                  <View style={{ gap: 3 }}>
                    <Text style={styles.inspectorStatText}>
                      ⚖️ Symmetry Status:{' '}
                      <Text
                        style={{
                          fontFamily: FONT_FAMILY.bold,
                          color: selectedData.balance.color,
                        }}
                      >
                        {selectedData.balance.status === 'optimal'
                          ? '🟢 Optimal Balance'
                          : selectedData.balance.status === 'dominant'
                          ? '🟠 High Dominance'
                          : selectedData.balance.status === 'lagging'
                          ? '🔴 Lagging Volume'
                          : 'Untrained'}
                      </Text>
                    </Text>
                    <Text style={styles.inspectorSubText}>
                      {selectedData.balance.recommendation}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      ) : (
        <Text style={styles.tapPromptText}>
          {variant === 'weekly'
            ? mode === 'fatigue'
              ? 'Tap any muscle to inspect recovery status and soreness recency.'
              : (mode === 'volume' || mode === 'balance')
              ? 'Tap any muscle to inspect weekly set volume and target adherence.'
              : 'Tap any muscle to inspect retained strength capacity.'
            : mode === 'volume'
            ? 'Tap any muscle to inspect cumulative density and total tonnage.'
            : mode === 'growth'
            ? 'Tap any muscle to inspect progressive overload gains.'
            : 'Tap any muscle to inspect Push/Pull and structural symmetry.'}
        </Text>
      )}

      {/* ── Dynamic Legend Bar (Structured & Responsive) ────────────────────── */}
      <View style={styles.legendRow}>
        {variant === 'weekly' ? (
          <>
            {mode === 'fatigue' && (
              <View style={styles.legendItemsWrap}>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: '#ff4757' }]} />
                  <Text style={styles.legendLabel}>Fatigued</Text>
                </View>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: '#ffd32a' }]} />
                  <Text style={styles.legendLabel}>Recovering</Text>
                </View>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: '#34d399' }]} />
                  <Text style={styles.legendLabel}>Ready</Text>
                </View>
              </View>
            )}

            {(mode === 'volume' || mode === 'balance') && (
              <View style={styles.legendItemsWrap}>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: '#5eda9e' }]} />
                  <Text style={styles.legendLabel}>12+ Sets (Target)</Text>
                </View>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: '#89dceb' }]} />
                  <Text style={styles.legendLabel}>8–11 Sets</Text>
                </View>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: '#a599ff' }]} />
                  <Text style={styles.legendLabel}>4–7 Sets</Text>
                </View>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: '#6d5fe0' }]} />
                  <Text style={styles.legendLabel}>1–3 Sets</Text>
                </View>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: isDark ? '#232128' : '#e4e4e9' }]} />
                  <Text style={styles.legendLabel}>0</Text>
                </View>
              </View>
            )}

            {mode === 'strength' && (
              <View style={styles.legendItemsWrap}>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: '#ffd32a' }]} />
                  <Text style={styles.legendLabel}>100% Full</Text>
                </View>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: '#cca00b' }]} />
                  <Text style={styles.legendLabel}>88%</Text>
                </View>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: '#a6820a' }]} />
                  <Text style={styles.legendLabel}>80%</Text>
                </View>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: isDark ? '#232128' : '#e4e4e9' }]} />
                  <Text style={styles.legendLabel}>Floor</Text>
                </View>
              </View>
            )}
          </>
        ) : (
          <>
            {mode === 'volume' && (
              <View style={styles.legendItemsWrap}>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: '#5eda9e' }]} />
                  <Text style={styles.legendLabel}>High Vol</Text>
                </View>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: '#89dceb' }]} />
                  <Text style={styles.legendLabel}>Moderate</Text>
                </View>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: '#6d5fe0' }]} />
                  <Text style={styles.legendLabel}>Base</Text>
                </View>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: isDark ? '#232128' : '#e4e4e9' }]} />
                  <Text style={styles.legendLabel}>Untrained</Text>
                </View>
              </View>
            )}

            {mode === 'growth' && (
              <View style={styles.legendItemsWrap}>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: '#ffd32a' }]} />
                  <Text style={styles.legendLabel}>🔥 +8%+ Gain</Text>
                </View>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: '#5eda9e' }]} />
                  <Text style={styles.legendLabel}>🟢 +3% Steady</Text>
                </View>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: '#89dceb' }]} />
                  <Text style={styles.legendLabel}>🔹 Maintained</Text>
                </View>
              </View>
            )}

            {mode === 'balance' && (
              <View style={styles.legendItemsWrap}>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: '#5eda9e' }]} />
                  <Text style={styles.legendLabel}>🟢 Balanced</Text>
                </View>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: '#ff9f4d' }]} />
                  <Text style={styles.legendLabel}>🟠 Dominant</Text>
                </View>
                <View style={styles.legendPill}>
                  <View style={[styles.legendDot, { backgroundColor: '#ff6961' }]} />
                  <Text style={styles.legendLabel}>🔴 Lagging</Text>
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}, (prev, next) => {
  return (
    prev.bodyGender === next.bodyGender &&
    prev.variant === next.variant &&
    prev.timeWindowDays === next.timeWindowDays &&
    prev.defaultMode === next.defaultMode &&
    prev.weekAnchorDate === next.weekAnchorDate &&
    generateDatasetFingerprint(prev.gymLogs) === generateDatasetFingerprint(next.gymLogs)
  );
});

export default AnatomicalBodyMapCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 0,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  segControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
    height: 40,
  },
  segBtn: {
    flex: 1,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    paddingHorizontal: 4,
  },
  segBtnActive: {
    backgroundColor: '#2C2C2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  segBtnText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8e8e93',
    textAlign: 'center',
  },
  segBtnTextActive: {
    color: '#ffffff',
    fontFamily: FONT_FAMILY.bold,
  },
  headerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modeTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  timeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  timeChipActive: {
    backgroundColor: 'rgba(165, 153, 255, 0.2)',
  },
  timeChipText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#8e8e93',
  },
  timeChipTextActive: {
    color: '#a599ff',
    fontFamily: FONT_FAMILY.bold,
  },
  bodyDualContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 6,
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
    color: '#8e8e93',
    letterSpacing: 1,
    marginTop: 4,
  },
  quickPillsWrapper: {
    marginVertical: 8,
  },
  quickPillsScroll: {
    paddingHorizontal: 2,
    gap: 6,
    alignItems: 'center',
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 5,
  },
  quickPillSelected: {
    backgroundColor: 'rgba(165, 153, 255, 0.22)',
    borderColor: '#a599ff',
  },
  quickPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  quickPillText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#8e8e93',
  },
  quickPillTextSelected: {
    color: '#ffffff',
    fontFamily: FONT_FAMILY.bold,
  },
  inspectorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    marginTop: 6,
    marginBottom: 6,
  },
  inspectorTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inspectorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#a599ff',
  },
  inspectorTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  inspectorStatsRow: {
    paddingLeft: 13,
  },
  inspectorStatText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    color: '#d1d1d6',
  },
  inspectorSubText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8e8e93',
    marginTop: 2,
  },
  tapPromptText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8e8e93',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  legendRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  legendItemsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 6,
    columnGap: 8,
  },
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
  },
  legendLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10.5,
    color: '#8e8e93',
  },
});
