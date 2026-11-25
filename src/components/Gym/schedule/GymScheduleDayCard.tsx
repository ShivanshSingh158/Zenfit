import React from 'react';
import { View, Text } from 'react-native';
import { ChevronRight, Dumbbell, Moon } from 'lucide-react-native';
import { DARK_TOKENS, FONT_FAMILY, ICON, LIGHT_TOKENS } from '../../../theme/tokens';
import { TactileButton } from '../../ui/TactileButton';
import { NumericText } from '../../ui/NumericText';
import { GymPlanDay } from '../../../types/gym.types';

export interface GymScheduleDayCardProps {
  dayName: string;
  dayIndex: number;
  planDay: GymPlanDay;
  onPress: (dayIndex: number) => void;
  formatTime: (timeStr?: string) => string;
  styles: any;
  colors: any;
  isDark?: boolean;
}

export const GymScheduleDayCard: React.FC<GymScheduleDayCardProps> = React.memo(({
  dayName,
  dayIndex,
  planDay,
  onPress,
  formatTime,
  styles,
  isDark = true,
}) => {
  const isRest = planDay.isRest;
  const hasTime = Boolean(planDay.startTime);
  const tokens = isDark ? DARK_TOKENS : LIGHT_TOKENS;
  const subtleChipBg = isDark
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(9, 9, 11, 0.05)';

  return (
    <TactileButton
      variant="custom"
      haptic="light"
      style={[styles.dayRow, isRest && styles.dayRowRest]}
      onPress={() => onPress(dayIndex)}
    >
      <View style={[styles.dayIconBox, { backgroundColor: subtleChipBg }]}>
        {isRest ? (
          <Moon size={16} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
        ) : (
          <Dumbbell size={16} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
        )}
      </View>

      <View style={styles.dayInfo}>
        <Text style={[styles.dayName, isRest && styles.dayNameRest]}>{dayName}</Text>
        <Text style={[styles.planFocus, isRest && styles.planFocusRest]} numberOfLines={1}>
          {isRest ? 'Rest & recover' : planDay.name || planDay.focus || 'Workout'}
        </Text>
      </View>

      {isRest ? (
        <View style={styles.timeBlock}>
          <Text style={{ fontSize: 11.5, fontFamily: FONT_FAMILY.medium, color: tokens.text.muted }}>
            Rest
          </Text>
          <ChevronRight size={14} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} style={{ marginLeft: 6 }} />
        </View>
      ) : (
        <View style={styles.timeBlock}>
          {hasTime ? (
            <View style={{ alignItems: 'flex-end' }}>
              <NumericText style={styles.timeText}>{formatTime(planDay.startTime)}</NumericText>
              <NumericText style={styles.timeSubText}>to {formatTime(planDay.endTime)}</NumericText>
            </View>
          ) : (
            <Text style={styles.notSetText}>Set time</Text>
          )}
          <ChevronRight size={14} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} style={{ marginLeft: 6 }} />
        </View>
      )}
    </TactileButton>
  );
});

export default GymScheduleDayCard;
