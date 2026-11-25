/**
 * PreSessionMuscleHitMap.tsx — ZenFit
 *
 * Pre-Session Anatomical Muscle Hit Map & Target Volume Preview (openGym v1.4.3):
 * Provides an instant visual breakdown of which muscles a planned session or routine trains
 * before the lifter starts the workout.
 *
 * Features:
 * - Dual-view (Front + Back) mini anatomical SVG silhouette with active muscles lit up.
 * - Primary mover & synergist volume rollup (sets count per target muscle).
 * - Interactive tap sheet displaying full muscle-by-exercise attribution.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Path, G } from 'react-native-svg';
import { ChevronRight, Moon, X } from 'lucide-react-native';
import BottomSheet from '../../ui/BottomSheet';
import { TactileButton } from '../../ui/TactileButton';
import { NumericText } from '../../ui/NumericText';
import { iosEasing } from '../../../theme/motion';

import { COLORS, DARK_TOKENS, FONT_FAMILY, ICON, LIGHT_TOKENS, RADIUS, SPACE, TOUCH } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { useGymProfile } from '../../../hooks/useGymProfile';
import { hapticSelection } from '../../../utils/haptics';
import { canonicalizeMuscle, resolveMuscleColor, resolveExerciseTargetMuscle } from '../../../utils/gymUtils';
import {
  STATIC_BODY_SVG,
  SVG_SLUG_TO_GROUP,
  CachedBodyView,
  resolveMuscleSlugsForGroup,
} from '../metrics/muscleMapSvgCache';

export interface PreSessionMuscleHitMapProps {
  exercises: Array<{ name: string; muscle?: string; targetSets?: number | string }>;
  isRest?: boolean;
  compact?: boolean;
  showMiniAvatar?: boolean;
  title?: string;
  exerciseCount?: number;
  totalSets?: number;
  estimatedMinutes?: number;
  disableModal?: boolean;
  replayKey?: number | string;
}

export const PreSessionMuscleHitMap: React.FC<PreSessionMuscleHitMapProps> = React.memo(({
  exercises,
  isRest = false,
  compact = false,
  showMiniAvatar = true,
  title,
  exerciseCount,
  totalSets,
  estimatedMinutes,
  disableModal = false,
  replayKey = 0,
}) => {
  const { isDark, tokens } = useTheme();
  const { gymProfile } = useGymProfile();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const barScaleX = useSharedValue(0);

  // ── Compute Muscle Volume Breakdown ────────────────────────────────────────
  const analysis = useMemo(() => {
    if (isRest || !exercises || exercises.length === 0) {
      return {
        muscleMap: {} as Record<string, { sets: number; exercises: string[]; color: string }>,
        topMuscles: [] as Array<{ name: string; sets: number; color: string }>,
        totalSets: 0,
        activeSlugs: new Set<string>(),
      };
    }

    const muscleMap: Record<string, { sets: number; exercises: string[]; color: string }> = {};
    const activeSlugs = new Set<string>();
    let computedSets = 0;

    for (const ex of exercises) {
      if (!ex.name) continue;
      const res = resolveExerciseTargetMuscle(ex.name, ex.muscle);
      const group = res.canonicalGroup || 'Other';
      const parsedSets = typeof ex.targetSets === 'number' ? ex.targetSets : parseInt(String(ex.targetSets || 3), 10) || 3;
      computedSets += parsedSets;

      if (!muscleMap[group]) {
        muscleMap[group] = {
          sets: 0,
          exercises: [],
          color: resolveMuscleColor(group),
        };
      }
      muscleMap[group].sets += parsedSets;
      if (!muscleMap[group].exercises.includes(ex.name)) {
        muscleMap[group].exercises.push(ex.name);
      }

      // Map to shared anatomical body slugs (includes Core, Abs, Lower Back, Adductors)
      const slugs = resolveMuscleSlugsForGroup(group);
      const rawSlugs = slugs.length > 0 ? slugs : resolveMuscleSlugsForGroup(res.targetMuscle);
      for (const s of rawSlugs) {
        activeSlugs.add(s);
      }
    }

    const topMuscles = Object.entries(muscleMap)
      .map(([name, data]) => ({ name, sets: data.sets, color: data.color }))
      .sort((a, b) => b.sets - a.sets);

    return {
      muscleMap,
      topMuscles,
      totalSets: computedSets,
      activeSlugs,
    };
  }, [exercises, isRest]);

  const effectiveExerciseCount = exerciseCount ?? exercises.length;
  const effectiveTotalSets = totalSets ?? analysis.totalSets;
  const effectiveMinutes = estimatedMinutes ?? Math.max(20, Math.round(effectiveTotalSets * 2.5));

  useEffect(() => {
    if (isRest || analysis.topMuscles.length === 0) return;
    cancelAnimation(barScaleX);
    barScaleX.value = 0;
    barScaleX.value = withTiming(1, { duration: 480, easing: iosEasing.decel });
  }, [isRest, replayKey, effectiveTotalSets, title, analysis.topMuscles.length, barScaleX]);

  const barRevealStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: barScaleX.value }],
  }));

  if (isRest) {
    return (
      <View style={styles.restWrap}>
        <Moon size={12} color={tokens.status.success} strokeWidth={ICON.strokeWidth} />
        <Text style={[styles.restText, { color: tokens.text.secondary }]}>
          Muscle recovery & systemic rest day
        </Text>
      </View>
    );
  }

  if (analysis.topMuscles.length === 0) return null;

  // Pre-cached static anatomical SVGs (0ms path joins in render)
  const genderSvg = STATIC_BODY_SVG[gymProfile?.gender === 'female' ? 'female' : 'male'] || STATIC_BODY_SVG.male;
  const frontView = genderSvg.front;
  const backView = genderSvg.back;

  const inertFill = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const inertStroke = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.09)';

  const renderMusclePath = (
    view: CachedBodyView,
    slug: string,
    isActive: boolean,
    isDarkTheme: boolean
  ) => {
    const pathD = view.paths[slug];
    if (!pathD) return null;

    return (
      <Path
        key={slug}
        d={pathD}
        fill={isActive ? tokens.accent.primary : (isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)')}
        stroke={isActive ? 'rgba(255, 255, 255, 0.35)' : (isDarkTheme ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.09)')}
        strokeWidth={isActive ? 1.4 : 0.8}
      />
    );
  };

  return (
    <View style={styles.container}>
      <TactileButton
        variant="custom"
        haptic="none"
        style={[styles.hitMapRow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)' }]}
        disabled={disableModal}
        onPress={() => {
          if (disableModal) return;
          hapticSelection();
          setDetailModalVisible(true);
        }}
      >
        {/* Visual Anatomy Silhouette Showcase (Front & Back) */}
        {showMiniAvatar && (
          <View style={styles.avatarWrap}>
            {/* Front silhouette */}
            <View style={styles.svgSilhouetteBox}>
              <Svg viewBox={frontView.vb} width="32" height="68">
                <G>
                  <Path d={frontView.inertD} fill={inertFill} stroke={inertStroke} strokeWidth={0.8} />
                  {frontView.slugs.map((slug) =>
                    renderMusclePath(frontView, slug, analysis.activeSlugs.has(slug), isDark)
                  )}
                </G>
              </Svg>
            </View>

            {/* Back silhouette */}
            <View style={styles.svgSilhouetteBox}>
              <Svg viewBox={backView.vb} width="32" height="68">
                <G>
                  <Path d={backView.inertD} fill={inertFill} stroke={inertStroke} strokeWidth={0.8} />
                  {backView.slugs.map((slug) =>
                    renderMusclePath(backView, slug, analysis.activeSlugs.has(slug), isDark)
                  )}
                </G>
              </Svg>
            </View>
          </View>
        )}

        {/* Right side: Session Metrics + Proportional Volume Load Bar */}
        <View style={styles.dataWrap}>
          {/* Row 1: Session Metrics (Clean, shown ONCE) */}
          <View style={styles.metricsRow}>
            <NumericText style={[styles.metricsText, { color: tokens.text.secondary }]} numberOfLines={1}>
              {effectiveExerciseCount} exercises  ·  {effectiveTotalSets} sets  ·  ~{effectiveMinutes} min
            </NumericText>
            <ChevronRight
              size={13}
              color={tokens.text.muted}
              strokeWidth={ICON.strokeWidth}
            />
          </View>

          {/* Row 2: Proportional Load Distribution Bar (GPU scaleX sweep) */}
          <View style={styles.proportionalBarContainer}>
            <Animated.View
              style={[
                {
                  flex: 1,
                  flexDirection: 'row',
                  height: '100%',
                  transformOrigin: 'left',
                },
                barRevealStyle,
              ]}
            >
              {analysis.topMuscles.map((item, idx) => {
                const pct = analysis.totalSets > 0 ? (item.sets / analysis.totalSets) * 100 : 0;
                return (
                  <View
                    key={item.name}
                    style={[
                      styles.proportionalBarSegment,
                      {
                        flex: Math.max(0.02, pct),
                        backgroundColor: item.color,
                        borderTopLeftRadius: idx === 0 ? 3 : 0,
                        borderBottomLeftRadius: idx === 0 ? 3 : 0,
                        borderTopRightRadius: idx === analysis.topMuscles.length - 1 ? 3 : 0,
                        borderBottomRightRadius: idx === analysis.topMuscles.length - 1 ? 3 : 0,
                      },
                    ]}
                  />
                );
              })}
            </Animated.View>
          </View>

          {/* Row 3: Clean Muscle Legend (No bulky pill soup) */}
          <View style={styles.legendRow}>
            {analysis.topMuscles.slice(0, 3).map(item => (
              <View key={item.name} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={[styles.legendName, { color: tokens.text.primary }]}>
                  {item.name}
                </Text>
                <NumericText style={[styles.legendSets, { color: tokens.text.secondary }]}>
                  {item.sets}s
                </NumericText>
              </View>
            ))}
            {analysis.topMuscles.length > 3 && (
              <NumericText style={[styles.legendMore, { color: tokens.text.muted }]}>
                +{analysis.topMuscles.length - 3}
              </NumericText>
            )}
          </View>
        </View>
      </TactileButton>

      {/* ── Interactive Muscle Hit Map Obsidian Sheet ── */}
      {!disableModal && (
        <BottomSheet
          visible={detailModalVisible}
          onClose={() => setDetailModalVisible(false)}
          scrollable={true}
          avoidKeyboard={false}
        >
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, paddingRight: SPACE.sm }}>
              <Text style={[styles.sheetTitle, { color: tokens.text.primary }]}>
                Target Muscle Load
              </Text>
              <NumericText style={[styles.sheetSubtitle, { color: tokens.text.secondary }]} numberOfLines={1}>
                {title || 'Session Preview'} · {analysis.topMuscles.length} muscles · {analysis.totalSets} sets
              </NumericText>
            </View>
            <TactileButton
              variant="custom"
              haptic="light"
              onPress={() => setDetailModalVisible(false)}
              style={[
                styles.closeBtn,
                {
                  backgroundColor: isDark ? '#14161D' : tokens.bg.elevated,
                  borderColor: tokens.border.subtle,
                },
              ]}
              hitSlop={TOUCH.hitSlop}
              accessibilityLabel="Close target muscle load"
            >
              <X size={16} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
            </TactileButton>
          </View>

          {/* Compact Obsidian Silhouette Showcase */}
          <View
            style={[
              styles.modalAvatarRow,
              {
                backgroundColor: isDark ? '#14161D' : tokens.bg.surface,
                borderColor: tokens.border.subtle,
              },
            ]}
          >
            <View style={styles.modalAvatarBox}>
              <Svg viewBox={frontView.vb} width="54" height="110">
                <G>
                  <Path d={frontView.inertD} fill={inertFill} stroke={inertStroke} strokeWidth={0.8} />
                  {frontView.slugs.map((slug) =>
                    renderMusclePath(frontView, slug, analysis.activeSlugs.has(slug), isDark)
                  )}
                </G>
              </Svg>
              <Text style={styles.viewAngleLabel}>FRONT</Text>
            </View>

            <View
              style={[
                styles.avatarCenterDivider,
                { backgroundColor: tokens.border.subtle },
              ]}
            />

            <View style={styles.modalAvatarBox}>
              <Svg viewBox={backView.vb} width="54" height="110">
                <G>
                  <Path d={backView.inertD} fill={inertFill} stroke={inertStroke} strokeWidth={0.8} />
                  {backView.slugs.map((slug) =>
                    renderMusclePath(backView, slug, analysis.activeSlugs.has(slug), isDark)
                  )}
                </G>
              </Svg>
              <Text style={styles.viewAngleLabel}>BACK</Text>
            </View>
          </View>

          {/* Grouped Hairline-Divided Muscle Breakdown Ledger */}
          <Text style={[styles.breakdownSectionKicker, { color: tokens.text.secondary }]}>
            MUSCLES TARGETED
          </Text>
          <View
            style={[
              styles.breakdownCard,
              {
                backgroundColor: isDark ? '#14161D' : tokens.bg.surface,
                borderColor: tokens.border.subtle,
              },
            ]}
          >
            {analysis.topMuscles.map((item, idx) => {
              const data = analysis.muscleMap[item.name];
              const pct = analysis.totalSets > 0
                ? Math.round((item.sets / analysis.totalSets) * 100)
                : 0;
              return (
                <View
                  key={item.name}
                  style={[
                    styles.breakdownRow,
                    idx > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: tokens.border.subtle,
                    },
                  ]}
                >
                  <View style={styles.breakdownLeft}>
                    <View style={[styles.breakdownDot, { backgroundColor: item.color }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.breakdownName, { color: tokens.text.primary }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {Boolean(data?.exercises?.length) && (
                        <Text
                          style={[styles.breakdownExercises, { color: tokens.text.secondary }]}
                          numberOfLines={2}
                        >
                          {data.exercises.join(' · ')}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.breakdownRightCol}>
                    <NumericText style={[styles.breakdownSets, { color: tokens.text.primary }]}>
                      {item.sets} sets
                    </NumericText>
                    <NumericText style={[styles.breakdownPct, { color: tokens.text.muted }]}>
                      {pct}%
                    </NumericText>
                  </View>
                </View>
              );
            })}
          </View>
        </BottomSheet>
      )}
    </View>
  );
});

export default PreSessionMuscleHitMap;

const makeStyles = (tokens: typeof DARK_TOKENS) => StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 6,
  },
  restWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACE.xs,
  },
  restText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
  },
  hitMapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: RADIUS.lg,
    gap: SPACE.md,
  },
  avatarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: tokens.border.subtle,
  },
  svgSilhouetteBox: {
    width: 32,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataWrap: {
    flex: 1,
    gap: 7,
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricsText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    letterSpacing: -0.2,
  },
  proportionalBarContainer: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: tokens.border.subtle,
    flexDirection: 'row',
    overflow: 'hidden',
    width: '100%',
  },
  proportionalBarSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACE.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
  },
  legendDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendName: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
  },
  legendSets: {
    fontSize: 10.5,
    fontFamily: FONT_FAMILY.medium,
  },
  legendMore: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.medium,
  },

  // Sheet Styles
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.35,
    includeFontPadding: false,
  },
  sheetSubtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    marginTop: 3,
    includeFontPadding: false,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    paddingVertical: 12,
    borderRadius: RADIUS.card,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  modalAvatarBox: {
    alignItems: 'center',
    gap: 6,
  },
  avatarCenterDivider: {
    width: StyleSheet.hairlineWidth,
    height: 92,
  },
  viewAngleLabel: {
    fontSize: 9.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.muted,
    letterSpacing: 0.9,
    includeFontPadding: false,
  },
  breakdownSectionKicker: {
    fontSize: 10.5,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.7,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  breakdownCard: {
    borderRadius: RADIUS.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  breakdownDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    flexShrink: 0,
  },
  breakdownName: {
    fontSize: 13.5,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  breakdownExercises: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
    lineHeight: 15,
  },
  breakdownRightCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  breakdownSets: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    includeFontPadding: false,
  },
  breakdownPct: {
    fontSize: 10.5,
    fontFamily: FONT_FAMILY.medium,
    marginTop: 2,
    includeFontPadding: false,
  },
});
