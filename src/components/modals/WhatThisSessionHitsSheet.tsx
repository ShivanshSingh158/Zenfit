import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, G } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { resolveExerciseTargetMuscle, canonicalizeMuscle } from '../../utils/gymUtils';
import { STATIC_BODY_SVG, resolveMuscleSlugsForGroup } from '../Gym/metrics/muscleMapSvgCache';
import { MuscleSlug } from '../../services/muscleRecoveryService';
import { AppBottomSheet } from '../ui/AppBottomSheet';
import { TactileButton } from '../ui/TactileButton';
import { NumericText } from '../ui/NumericText';
import { useGymProfile } from '../../hooks/useGymProfile';

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

export const WhatThisSessionHitsSheet: React.FC<WhatThisSessionHitsSheetProps> = ({
  visible,
  exercises,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const { gymProfile } = useGymProfile();

  const sessionStats = useMemo(() => {
    const muscleMap: Record<
      string,
      { completed: number; total: number; slugs: MuscleSlug[] }
    > = {};
    const workedSlugs = new Set<string>();
    const pendingSlugs = new Set<string>();

    for (const ex of exercises || []) {
      const { targetMuscle } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
      const group = canonicalizeMuscle(targetMuscle) || 'Chest';
      const resolved = resolveMuscleSlugsForGroup(group || targetMuscle);
      const slugs: MuscleSlug[] = resolved.length > 0 ? resolved : ['chest'];

      const sets = ex.setsLog || [];
      const completedSets = sets.filter((s) => s.completed).length;
      const totalSets = Math.max(sets.length, Number(ex.targetSets) || 3);

      if (!muscleMap[group]) {
        muscleMap[group] = { completed: 0, total: 0, slugs };
      }
      muscleMap[group].completed += completedSets;
      muscleMap[group].total += totalSets;

      if (completedSets > 0) {
        slugs.forEach((s) => workedSlugs.add(s));
      } else {
        slugs.forEach((s) => pendingSlugs.add(s));
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

  const gender = (gymProfile?.gender === 'female') ? 'female' : 'male';
  const frontView = STATIC_BODY_SVG[gender]?.front ?? STATIC_BODY_SVG.male.front;
  const backView = STATIC_BODY_SVG[gender]?.back ?? STATIC_BODY_SVG.male.back;

  const inertFill = isDark ? '#14161D' : tokens.bg.surface;
  const inertStroke = tokens.border.medium;

  const renderMusclePath = (view: typeof frontView, slug: string) => {
    const pathD = view.paths[slug];
    if (!pathD) return null;

    const isWorked = sessionStats.workedSlugs.has(slug);
    const isPending = !isWorked && sessionStats.pendingSlugs.has(slug);

    let fillColor = inertFill;
    let strokeColor = inertStroke;
    let strokeWidth = 0.8;

    if (isWorked) {
      fillColor = tokens.status.success;
      strokeColor = tokens.border.medium;
      strokeWidth = 1.2;
    } else if (isPending) {
      fillColor = tokens.status.successDim;
      strokeColor = tokens.status.success;
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
    <AppBottomSheet visible={visible} onClose={onClose} noPadding sheetHeight="85%">
      <View
        style={{
          flex: 1,
          paddingHorizontal: tokens.space.lg,
          paddingBottom: Math.max(insets.bottom, tokens.space.lg),
          paddingTop: tokens.space.sm,
        }}
      >
        <View style={styles.headerRow}>
          <Text style={[tokens.typography.h2, { color: tokens.text.primary }]}>
            What this session hits
          </Text>
          <TactileButton
            variant="ghost"
            onPress={onClose}
            style={{ paddingHorizontal: tokens.space.md }}
          >
            <Text style={[tokens.typography.label, { fontFamily: tokens.font.bold, color: tokens.accent.primary }]}>
              Done
            </Text>
          </TactileButton>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          contentContainerStyle={{ paddingBottom: tokens.space.xl }}
        >
          <View style={styles.mannequinContainer}>
            <View style={styles.svgBox}>
              <Svg viewBox={frontView.vb} width="110" height="230">
                <G>
                  <Path d={frontView.inertD} fill={inertFill} stroke={inertStroke} strokeWidth={0.8} />
                  {frontView.slugs.map((slug) => renderMusclePath(frontView, slug))}
                </G>
              </Svg>
            </View>

            <View style={styles.svgBox}>
              <Svg viewBox={backView.vb} width="110" height="230">
                <G>
                  <Path d={backView.inertD} fill={inertFill} stroke={inertStroke} strokeWidth={0.8} />
                  {backView.slugs.map((slug) => renderMusclePath(backView, slug))}
                </G>
              </Svg>
            </View>
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: tokens.status.success }]} />
              <Text style={[tokens.typography.caption, { color: tokens.text.secondary }]}>
                Already worked
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  {
                    backgroundColor: tokens.status.successDim,
                    borderWidth: 1,
                    borderColor: tokens.status.success,
                  },
                ]}
              />
              <Text style={[tokens.typography.caption, { color: tokens.text.secondary }]}>
                Still to come
              </Text>
            </View>
          </View>

          <View style={styles.muscleList}>
            {sessionStats.muscleList.map((m) => (
              <View key={m.name} style={styles.muscleRow}>
                <Text
                  style={[
                    tokens.typography.label,
                    { color: tokens.text.primary, minWidth: 80, flexShrink: 0 },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {m.name}
                </Text>
                <View
                  style={[
                    styles.progressTrack,
                    { backgroundColor: isDark ? '#14161D' : tokens.bg.surface },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: tokens.status.success,
                        width: `${Math.max(2, Math.round(m.ratio * 100))}%`,
                      },
                    ]}
                  />
                </View>
                <NumericText style={[styles.muscleSetsText, { color: tokens.text.secondary }]}>
                  {m.completed}/{m.total}
                </NumericText>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </AppBottomSheet>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    gap: 24,
    marginTop: 8,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  muscleSetsText: {
    fontSize: 13,
    width: 48,
    textAlign: 'right',
  },
});

export default WhatThisSessionHitsSheet;
