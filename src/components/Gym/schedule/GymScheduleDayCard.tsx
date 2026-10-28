import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  colors,
  isDark = true,
}) => {
  const isRest = planDay.isRest;
  const hasTime = Boolean(planDay.startTime);

  return (
    <TouchableOpacity
      style={[styles.dayRow, isRest && styles.dayRowRest]}
      onPress={() => onPress(dayIndex)}
      activeOpacity={0.7}
    >
      {/* Icon Badge */}
      <View
        style={[
          styles.dayIconBox,
          {
            backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA',
          },
        ]}
      >
        <Ionicons
          name={isRest ? 'moon-outline' : 'barbell-outline'}
          size={17}
          color={isRest ? colors.textTertiary : (isDark ? '#FFFFFF' : '#000000')}
        />
      </View>

      {/* Info Column */}
      <View style={styles.dayInfo}>
        <Text style={[styles.dayName, isRest && styles.dayNameRest]}>{dayName}</Text>
        <Text style={[styles.planFocus, isRest && styles.planFocusRest]} numberOfLines={1}>
          {isRest ? 'Rest & Recovery' : planDay.name || planDay.focus || 'Workout'}
        </Text>
      </View>

      {/* Right Time / Status Badge */}
      {isRest ? (
        <View
          style={{
            backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA',
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: 6,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.textTertiary, letterSpacing: 0.5 }}>
            REST
          </Text>
        </View>
      ) : (
        <View style={styles.timeBlock}>
          {hasTime ? (
            <View
              style={{
                backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA',
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderRadius: 8,
                alignItems: 'flex-end',
              }}
            >
              <Text style={styles.timeText}>{formatTime(planDay.startTime)}</Text>
              <Text style={styles.timeSubText}>to {formatTime(planDay.endTime)}</Text>
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA',
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderRadius: 8,
              }}
            >
              <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
              <Text style={styles.notSetText}>Tap to set time</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={15} color={colors.textTertiary} style={{ marginLeft: 6 }} />
        </View>
      )}
    </TouchableOpacity>
  );
});

export default GymScheduleDayCard;
