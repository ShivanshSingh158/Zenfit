import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';
import { ICON } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { TactileButton } from '../../ui/TactileButton';
import { NumericText } from '../../ui/NumericText';
import { GymPlanDay } from '../../../types/gym.types';
import { resolveExerciseTargetMuscle } from '../../../utils/gymUtils';

export interface RoutineSplitCardProps {
  day: GymPlanDay;
  isSelected: boolean;
  showDivider?: boolean;
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
  showDivider = false,
  onSelect,
  styles,
  isRotation,
  isNextUp,
  rotationLetter,
}) => {
  const { tokens } = useTheme();
  const isRest = day.isRest;

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
      .map(([name]) => name);

    return {
      exerciseCount: day.exercises.length,
      muscleLine: topMuscles.join(', '),
    };
  }, [isRest, day.exercises]);

  const routineName = useMemo(() => {
    if (isRotation && !isRest) {
      return `Workout ${rotationLetter || day.dayIndex}: ${day.name}`;
    }
    return day.name;
  }, [isRotation, isRest, rotationLetter, day.dayIndex, day.name]);

  const subtitle = useMemo(() => {
    if (isRest) return 'Full recovery & mobility day';
    const cardioCount = day.cardio?.length || 0;
    const focusPart = day.subtitle || day.focus || '';
    const countParts: string[] = [];
    if ((stats?.exerciseCount || 0) > 0) countParts.push(`${stats?.exerciseCount || 0} exercises`);
    if (cardioCount > 0) countParts.push(`${cardioCount} cardio`);
    const countPart = countParts.join(' · ') || '0 exercises';
    if (stats?.muscleLine && focusPart) {
      return `${focusPart} · ${countPart} (${stats.muscleLine})`;
    }
    return focusPart ? `${focusPart} · ${countPart}` : countPart;
  }, [day.subtitle, day.focus, day.cardio?.length, isRest, stats]);

  return (
    <View>
      <TactileButton
        variant="custom"
        haptic="light"
        style={[styles.dayRow, isSelected && styles.dayRowActive]}
        onPress={() => onSelect(day.dayIndex)}
      >
        <View style={styles.rowMain}>
          <View style={styles.rowMetaTop}>
            <NumericText style={[styles.dayLabelPlain, isRest && { color: tokens.status.warning }]}>
              {isRest ? `Day ${day.dayIndex} · Rest` : `Day ${day.dayIndex}`}
            </NumericText>
            {isNextUp && !isRest && (
              <Text style={styles.upNextPlain}>· Up Next</Text>
            )}
            {isSelected && (
              <View style={styles.activeDotRow}>
                <View style={styles.activeGreenDot} />
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>

          <Text style={styles.dayTitle} numberOfLines={1}>
            {routineName}
          </Text>

          <NumericText style={styles.daySubLine} numberOfLines={1}>
            {subtitle}
          </NumericText>
        </View>

        {isSelected ? (
          <View style={styles.checkCircle}>
            <Check size={14} color={tokens.accent.primary} strokeWidth={2.5} />
          </View>
        ) : (
          <ChevronRight size={16} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
        )}
      </TactileButton>

      {showDivider && <View style={styles.rowDivider} />}
    </View>
  );
});

export default RoutineSplitCard;
