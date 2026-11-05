/**
 * WhatThisSessionHitsSheet.tsx — ZenFit
 *
 * Active Session Muscle Hit Map & Volume Rollup (OpenGym v1.4 Pattern):
 * Displays front & back anatomical mannequin vectors showing:
 * - Bright Green: Already worked (completed sets)
 * - Dark Green: Still to come (planned sets)
 * - Gray: Not trained in this session
 * Includes muscle volume progress meters and a clean 'Done' dismissal button.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILY, IOS_DARK, RADIUS } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { hapticSelection, hapticLight } from '../../../utils/haptics';
import { resolveExerciseTargetMuscle, canonicalizeMuscle } from '../../../utils/gymUtils';
import { BODY_PATHS, getMergedInertPath, getMergedMusclePath } from '../metrics/bodyPaths';
import { MuscleSlug, INERT } from '../../../services/muscleRecoveryService';

export interface WhatThisSessionHitsSheetProps {
  visible: boolean;
  exercises: Array<{
    name: string;
    muscle?: string;
    setsLog?: Array<{ completed?: boolean; weight?: number | string; reps?: number | string }>;
    targetSets?: number | string;
  }>;
  onClose: () => void;
}

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

export const WhatThisSessionHitsSheet: React.FC<WhatThisSessionHitsSheetProps> = ({
  visible,
  exercises,
  onClose,
}) => {
  const { isDark } = useTheme();

  // Compute completed vs planned volume per muscle
  const sessionStats = useMemo(() => {
    const muscleMap: Record<string, { completed: number; total: number; slugs: MuscleSlug[] }> = {};
    const workedSlugs = new Set<string>();
    const pendingSlugs = new Set<string>();

    for (const ex of exercises || []) {
      const { targetMuscle } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
      const group = canonicalizeMuscle(targetMuscle) || 'Chest';
      const slugs = GROUP_TO_SLUGS[group] || ['chest'];

      const sets = ex.setsLog || [];
      const completedSets = sets.filter(s => s.completed).length;
      const totalSets = Math.max(sets.length, Number(ex.targetSets) || 3);

      if (!muscleMap[group]) {
        muscleMap[group] = { completed: 0, total: 0, slugs };
      }
      muscleMap[group].completed += completedSets;
      muscleMap[group].total += totalSets;

      if (completedSets > 0) {
        slugs.forEach(s => workedSlugs.add(s));
      } else {
        slugs.forEach(s => pendingSlugs.add(s));
      }
    }

    const muscleList = Object.entries(muscleMap)
      .map(([name, data]) => ({
        name,
        completed: data.completed,
        total: data.total,
        ratio: data.total > 0 ? Math.min(1, data.completed / data.total) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return { muscleList, workedSlugs, pendingSlugs };
  }, [exercises]);

  const frontGeo = BODY_PATHS.male.front;
  const backGeo = BODY_PATHS.male.back;
  const frontInertD = getMergedInertPath(frontGeo, INERT);
  const backInertD = getMergedInertPath(backGeo, INERT);

  const inertFill = '#1C1C1E';
  const inertStroke = 'rgba(255, 255, 255, 0.12)';

  const renderMusclePath = (geo: any, slug: string) => {
    const pathD = getMergedMusclePath(geo, slug);
    if (!pathD) return null;

    const isWorked = sessionStats.workedSlugs.has(slug);
    const isPending = !isWorked && sessionStats.pendingSlugs.has(slug);

    let fillColor = inertFill;
    let strokeColor = inertStroke;
    let strokeWidth = 0.8;

    if (isWorked) {
      fillColor = '#30D158'; // Bright Green (Already worked)
      strokeColor = 'rgba(255, 255, 255, 0.4)';
      strokeWidth = 1.2;
    } else if (isPending) {
      fillColor = '#1F6B38'; // Darker Green (Still to come)
      strokeColor = 'rgba(48, 209, 88, 0.4)';
      strokeWidth = 1.0;
    }

    return (
      <Path
        key={slug}
        d={pathD}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          {/* Sheet Handle */}
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.sheetTitle}>What this session hits</Text>
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                onClose();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Mannequin Showcase (Front & Back) */}
            <View style={styles.mannequinContainer}>
              <View style={styles.svgBox}>
                <Svg viewBox={frontGeo.vb} width="110" height="230">
                  <G>
                    <Path d={frontInertD} fill={inertFill} stroke={inertStroke} strokeWidth={0.8} />
                    {Object.keys(frontGeo.p).map(slug => renderMusclePath(frontGeo, slug))}
                  </G>
                </Svg>
              </View>

              <View style={styles.svgBox}>
                <Svg viewBox={backGeo.vb} width="110" height="230">
                  <G>
                    <Path d={backInertD} fill={inertFill} stroke={inertStroke} strokeWidth={0.8} />
                    {Object.keys(backGeo.p).map(slug => renderMusclePath(backGeo, slug))}
                  </G>
                </Svg>
              </View>
            </View>

            {/* Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#30D158' }]} />
                <Text style={styles.legendText}>Already worked</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#1F6B38' }]} />
                <Text style={styles.legendText}>Still to come</Text>
              </View>
            </View>

            {/* Muscle Breakdown List */}
            <View style={styles.muscleList}>
              {sessionStats.muscleList.map(m => (
                <View key={m.name} style={styles.muscleRow}>
                  <Text style={styles.muscleName}>{m.name}</Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${m.ratio * 100}%` }]} />
                  </View>
                  <Text style={styles.muscleSetsText}>
                    {m.completed}/{m.total}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default WhatThisSessionHitsSheet;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#121214',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  doneBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: '#30D158',
  },
  mannequinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingVertical: 12,
  },
  svgBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8E8E93',
  },
  muscleList: {
    gap: 12,
    marginTop: 8,
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  muscleName: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 14,
    color: '#FFFFFF',
    width: 90,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2C2C2E',
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#30D158',
    borderRadius: 2,
  },
  muscleSetsText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12.5,
    color: '#8E8E93',
    width: 45,
    textAlign: 'right',
  },
});

