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

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { FONT_FAMILY, IOS_DARK } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { hapticSelection, hapticLight } from '../../../utils/haptics';
import { canonicalizeMuscle, resolveMuscleColor, resolveExerciseTargetMuscle } from '../../../utils/gymUtils';
import { BODY_PATHS, getMergedInertPath, getMergedMusclePath } from '../metrics/bodyPaths';
import { MuscleSlug, INERT } from '../../../services/muscleRecoveryService';

export interface PreSessionMuscleHitMapProps {
  exercises: Array<{ name: string; muscle?: string; targetSets?: number | string }>;
  isRest?: boolean;
  compact?: boolean;
  showMiniAvatar?: boolean;
  title?: string;
  exerciseCount?: number;
  totalSets?: number;
  estimatedMinutes?: number;
}

// Mapping from canonical muscle group name to MuscleSlug in bodyPaths
const GROUP_TO_SLUGS: Record<string, MuscleSlug[]> = {
  Chest: ['chest'],
  Back: ['upper-back', 'lower-back', 'trapezius'],
  Shoulders: ['deltoids'],
  Biceps: ['biceps'],
  Triceps: ['triceps'],
  Quads: ['quadriceps'],
  Hamstrings: ['hamstring'],
  Calves: ['calves'],
  Abs: ['abs', 'obliques'],
  Forearms: ['forearm'],
  Glutes: ['gluteal'],
  Traps: ['trapezius'],
  Lats: ['upper-back'],
};

const SLUG_TO_GROUP: Record<string, string> = {
  chest: 'Chest',
  'upper-back': 'Back',
  'lower-back': 'Back',
  deltoids: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quadriceps: 'Quads',
  hamstring: 'Hamstrings',
  calves: 'Calves',
  abs: 'Abs',
  obliques: 'Abs',
  forearm: 'Forearms',
  gluteal: 'Glutes',
  trapezius: 'Traps',
};

export const PreSessionMuscleHitMap: React.FC<PreSessionMuscleHitMapProps> = React.memo(({
  exercises,
  isRest = false,
  compact = false,
  showMiniAvatar = true,
  title,
  exerciseCount,
  totalSets,
  estimatedMinutes,
}) => {
  const { colors, isDark } = useTheme();
  const [detailModalVisible, setDetailModalVisible] = useState(false);

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

      // Map to body slugs for SVG rendering
      const slugs = GROUP_TO_SLUGS[group] || [];
      for (const s of slugs) {
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

  if (isRest) {
    return (
      <View style={styles.restWrap}>
        <Ionicons name="moon" size={12} color="#30D158" />
        <Text style={[styles.restText, { color: isDark ? IOS_DARK.labelSecondary : colors.textMuted }]}>
          Muscle recovery & systemic rest day
        </Text>
      </View>
    );
  }

  if (analysis.topMuscles.length === 0) return null;

  // Mini SVGs setup
  const frontGeo = BODY_PATHS.male.front;
  const backGeo = BODY_PATHS.male.back;
  const frontInertD = getMergedInertPath(frontGeo, INERT);
  const backInertD = getMergedInertPath(backGeo, INERT);

  const inertFill = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const inertStroke = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.09)';

  const renderMusclePath = (
    geo: any,
    slug: string,
    isActive: boolean,
    canonicalGroup: string,
    isDarkTheme: boolean
  ) => {
    const pathD = getMergedMusclePath(geo, slug);
    if (!pathD) return null;
    const activeColor = analysis.muscleMap[canonicalGroup]?.color || resolveMuscleColor(canonicalGroup);

    return (
      <Path
        key={slug}
        d={pathD}
        fill={isActive ? activeColor : (isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)')}
        stroke={isActive ? 'rgba(255, 255, 255, 0.4)' : (isDarkTheme ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.09)')}
        strokeWidth={isActive ? 1.5 : 0.8}
      />
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.hitMapRow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)' }]}
        activeOpacity={0.7}
        onPress={() => {
          hapticSelection();
          setDetailModalVisible(true);
        }}
      >
        {/* Visual Anatomy Silhouette Showcase (Front & Back) */}
        {showMiniAvatar && (
          <View style={styles.avatarWrap}>
            {/* Front silhouette */}
            <View style={styles.svgSilhouetteBox}>
              <Svg viewBox={frontGeo.vb} width="32" height="68">
                <G>
                  <Path d={frontInertD} fill={inertFill} stroke={inertStroke} strokeWidth={0.8} />
                  {Object.keys(frontGeo.p).map(slug => {
                    const isActive = analysis.activeSlugs.has(slug);
                    const group = SLUG_TO_GROUP[slug] || 'Other';
                    return renderMusclePath(frontGeo, slug, isActive, group, isDark);
                  })}
                </G>
              </Svg>
            </View>

            {/* Back silhouette */}
            <View style={styles.svgSilhouetteBox}>
              <Svg viewBox={backGeo.vb} width="32" height="68">
                <G>
                  <Path d={backInertD} fill={inertFill} stroke={inertStroke} strokeWidth={0.8} />
                  {Object.keys(backGeo.p).map(slug => {
                    const isActive = analysis.activeSlugs.has(slug);
                    const group = SLUG_TO_GROUP[slug] || 'Other';
                    return renderMusclePath(backGeo, slug, isActive, group, isDark);
                  })}
                </G>
              </Svg>
            </View>
          </View>
        )}

        {/* Right side: Session Metrics + Proportional Volume Load Bar */}
        <View style={styles.dataWrap}>
          {/* Row 1: Session Metrics (Clean, shown ONCE) */}
          <View style={styles.metricsRow}>
            <Text style={[styles.metricsText, { color: isDark ? IOS_DARK.labelSecondary : colors.textMuted }]}>
              {effectiveExerciseCount} exercises  ·  {effectiveTotalSets} sets  ·  ~{effectiveMinutes} min
            </Text>
            <Ionicons
              name="chevron-forward"
              size={13}
              color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
            />
          </View>

          {/* Row 2: Proportional Load Distribution Bar */}
          <View style={styles.proportionalBarContainer}>
            {analysis.topMuscles.map((item, idx) => {
              const pct = analysis.totalSets > 0 ? (item.sets / analysis.totalSets) * 100 : 0;
              return (
                <View
                  key={item.name}
                  style={[
                    styles.proportionalBarSegment,
                    {
                      width: `${pct}%`,
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
          </View>

          {/* Row 3: Clean Muscle Legend (No bulky pill soup) */}
          <View style={styles.legendRow}>
            {analysis.topMuscles.slice(0, 3).map(item => (
              <View key={item.name} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={[styles.legendName, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}>
                  {item.name}
                </Text>
                <Text style={[styles.legendSets, { color: isDark ? IOS_DARK.labelSecondary : colors.textMuted }]}>
                  {item.sets}s
                </Text>
              </View>
            ))}
            {analysis.topMuscles.length > 3 && (
              <Text style={[styles.legendMore, { color: isDark ? IOS_DARK.labelTertiary : colors.textTertiary }]}>
                +{analysis.topMuscles.length - 3}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Interactive Muscle Hit Map Modal Sheet ── */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setDetailModalVisible(false)}
        >
          <TouchableOpacity
            style={[
              styles.modalSheet,
              { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface },
            ]}
            activeOpacity={1}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  Target Muscle Load
                </Text>
                <Text style={[styles.sheetSubtitle, { color: isDark ? IOS_DARK.labelSecondary : colors.textMuted }]}>
                  {title || 'Session Analysis'} · {analysis.totalSets} total planned sets
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDetailModalVisible(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={isDark ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
            </View>

            {/* Large SVG Body Silhouette Showcase */}
            <View style={styles.modalAvatarRow}>
              <View style={styles.modalAvatarBox}>
                <Svg viewBox={frontGeo.vb} width="72" height="148">
                  <G>
                    <Path d={frontInertD} fill={inertFill} stroke={inertStroke} strokeWidth={0.8} />
                    {Object.keys(frontGeo.p).map(slug => {
                      const isActive = analysis.activeSlugs.has(slug);
                      const group = SLUG_TO_GROUP[slug] || 'Other';
                      return renderMusclePath(frontGeo, slug, isActive, group, isDark);
                    })}
                  </G>
                </Svg>
                <View style={styles.viewAnglePill}>
                  <Text style={styles.viewAngleLabel}>FRONT VIEW</Text>
                </View>
              </View>

              <View style={styles.modalAvatarBox}>
                <Svg viewBox={backGeo.vb} width="72" height="148">
                  <G>
                    <Path d={backInertD} fill={inertFill} stroke={inertStroke} strokeWidth={0.8} />
                    {Object.keys(backGeo.p).map(slug => {
                      const isActive = analysis.activeSlugs.has(slug);
                      const group = SLUG_TO_GROUP[slug] || 'Other';
                      return renderMusclePath(backGeo, slug, isActive, group, isDark);
                    })}
                  </G>
                </Svg>
                <View style={styles.viewAnglePill}>
                  <Text style={styles.viewAngleLabel}>BACK VIEW</Text>
                </View>
              </View>
            </View>

            {/* Muscle Breakdown Rows */}
            <View style={styles.breakdownList}>
              {analysis.topMuscles.map(item => {
                const data = analysis.muscleMap[item.name];
                return (
                  <View
                    key={item.name}
                    style={[
                      styles.breakdownRow,
                      {
                        borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      },
                    ]}
                  >
                    <View style={styles.breakdownLeft}>
                      <View style={[styles.breakdownDot, { backgroundColor: item.color }]} />
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.breakdownName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                          {item.name}
                        </Text>
                        <Text
                          style={[styles.breakdownExercises, { color: isDark ? IOS_DARK.labelSecondary : '#636366' }]}
                          numberOfLines={1}
                        >
                          {data?.exercises.join(', ')}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.breakdownBadge, { backgroundColor: `${item.color}22` }]}>
                      <Text style={[styles.breakdownSets, { color: item.color }]}>
                        {item.sets} sets
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => {
                hapticLight();
                setDetailModalVisible(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.doneBtnText}>Close Preview</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

export default PreSessionMuscleHitMap;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 6,
  },
  restWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  restText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
  },
  hitMapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    gap: 12,
  },
  avatarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.1)',
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
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    paddingVertical: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 18,
  },
  modalAvatarBox: {
    alignItems: 'center',
    gap: 8,
  },
  viewAnglePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  viewAngleLabel: {
    fontSize: 9.5,
    fontFamily: FONT_FAMILY.bold,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.8,
  },
  breakdownList: {
    gap: 2,
    marginBottom: 20,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownName: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
  },
  breakdownExercises: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  breakdownBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  breakdownSets: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
  },
  doneBtn: {
    backgroundColor: '#30D158',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
});
