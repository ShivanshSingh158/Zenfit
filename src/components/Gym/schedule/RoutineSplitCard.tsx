import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GymPlanDay } from '../../../types/gym.types';
import { resolveExerciseTargetMuscle, resolveMuscleColor } from '../../../utils/gymUtils';

export interface RoutineSplitCardProps {
  day: GymPlanDay;
  isSelected: boolean;
  onSelect: (dayIndex: number) => void;
  styles: any;
  colors: any;
  isRotation?: boolean;
  isNextUp?: boolean;
  rotationLetter?: string;
}

export const RoutineSplitCard: React.FC<RoutineSplitCardProps> = React.memo(({
  day,
  isSelected,
  onSelect,
  styles,
  colors,
  isRotation,
  isNextUp,
  rotationLetter,
}) => {
  const isRest = day.isRest;

  // Aggregate Muscle and Exercise Info (No sets clutter)
  const stats = useMemo(() => {
    if (isRest || !day.exercises?.length) return null;

    const groupSets: Record<string, number> = {};

    for (const ex of day.exercises) {
      if (!ex.name) continue;
      const res = resolveExerciseTargetMuscle(ex.name, ex.muscle);
      const grp = res.canonicalGroup || 'Other';
      const sets = typeof ex.targetSets === 'number'
        ? ex.targetSets
        : parseInt(String(ex.targetSets || 3), 10) || 3;
      groupSets[grp] = (groupSets[grp] || 0) + sets;
    }

    const topMuscles = Object.entries(groupSets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => ({
        name,
        color: resolveMuscleColor(name),
      }));

    return {
      exerciseCount: day.exercises.length,
      topMuscles,
    };
  }, [isRest, day.exercises]);

  const routineName = useMemo(() => {
    if (isRotation && !isRest) {
      return `Workout ${rotationLetter || day.dayIndex}: ${day.name}`;
    }
    return day.name;
  }, [isRotation, isRest, rotationLetter, day.dayIndex, day.name]);

  const subtitle = useMemo(() => {
    if (day.subtitle) return day.subtitle;
    if (isRest) return 'Systemic recovery, sleep & active mobility';
    return day.focus || `${stats?.exerciseCount || 0} Exercises programmed`;
  }, [day.subtitle, day.focus, isRest, stats?.exerciseCount]);

  return (
    <TouchableOpacity
      style={[styles.dayCard, isSelected && styles.dayCardActive]}
      onPress={() => onSelect(day.dayIndex)}
      activeOpacity={0.75}
    >
      {/* ── Top Bar: Day Indicator & Action State ── */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.badgeRow}>
          <View style={[styles.dayTag, isRest && styles.restTag]}>
            <Text style={[styles.dayTagText, isRest && styles.restTagText]}>
              {isRest ? 'REST DAY' : `DAY ${day.dayIndex}`}
            </Text>
          </View>
          {isNextUp && !isRest && (
            <View style={styles.upNextTag}>
              <Text style={styles.upNextText}>UP NEXT</Text>
            </View>
          )}
        </View>

        {isSelected ? (
          <View style={styles.activeBadge}>
            <Ionicons name="checkmark-circle" size={13} color="#30D158" />
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        ) : (
          <View style={styles.actionPill}>
            <Ionicons name="swap-horizontal" size={12} color={styles.actionPillText.color} />
            <Text style={styles.actionPillText}>Select</Text>
          </View>
        )}
      </View>

      {/* ── Routine Title & Focus ── */}
      <Text style={styles.dayTitle} numberOfLines={1}>
        {routineName}
      </Text>
      <Text style={styles.daySubtitle} numberOfLines={1}>
        {subtitle}
      </Text>

      {/* ── Hairline Divider ── */}
      <View style={styles.hairlineDivider} />

      {/* ── Footer Strip: Clean Exercises Count & Target Muscles (Zero sets clutter, guaranteed no overlap) ── */}
      <View style={styles.cardFooterRow}>
        {isRest ? (
          <Text style={styles.footerStatsText}>
            Rest day • Full body recovery
          </Text>
        ) : (
          <>
            <Text style={styles.footerStatsText} numberOfLines={1}>
              {stats?.exerciseCount || 0} exercises
            </Text>

            {stats?.topMuscles && stats.topMuscles.length > 0 && (
              <View style={styles.musclesSummaryRow}>
                {stats.topMuscles.map(m => (
                  <View key={m.name} style={styles.muscleItem}>
                    <View style={[styles.muscleDot, { backgroundColor: m.color }]} />
                    <Text style={styles.muscleText} numberOfLines={1}>
                      {m.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
});

export default RoutineSplitCard;
