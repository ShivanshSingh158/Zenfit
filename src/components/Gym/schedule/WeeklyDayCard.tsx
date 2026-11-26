import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Activity, ChevronRight, Moon } from 'lucide-react-native';
import { DARK_TOKENS, FONT_FAMILY, ICON, LIGHT_TOKENS, RADIUS, SPACE } from '../../../theme/tokens';
import { TactileButton } from '../../ui/TactileButton';
import { NumericText } from '../../ui/NumericText';
import MiniDualBodyMap from './MiniDualBodyMap';

export interface WeeklyDayCardProps {
  dayShort: string;
  dayName: string;
  routineTitle: string;
  subtitle?: string;
  exerciseCount?: number;
  exercises?: Array<{ name: string; muscle?: string; targetSets?: number | string }>;
  cardioCount?: number;
  cardio?: Array<{ type: string; durationMinutes?: number | null }>;
  isRest?: boolean;
  isToday?: boolean;
  isLast?: boolean;
  onPress: () => void;
  onEdit?: () => void;
  isDark?: boolean;
}

export const WeeklyDayCard: React.FC<WeeklyDayCardProps> = React.memo(({
  dayShort,
  routineTitle,
  exerciseCount = 0,
  exercises = [],
  cardioCount = 0,
  cardio = [],
  isRest = false,
  isToday = false,
  isLast = false,
  onPress,
  isDark = true,
}) => {
  const tokens = isDark ? DARK_TOKENS : LIGHT_TOKENS;
  const subtleHairline = isDark
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(9, 9, 11, 0.08)';
  const todayWash = isDark
    ? 'rgba(10, 132, 255, 0.09)'
    : 'rgba(10, 132, 255, 0.06)';
  const neutralBadgeBg = isDark
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(9, 9, 11, 0.05)';

  const totalSets = useMemo(() => {
    if (isRest || !exercises) return 0;
    return exercises.reduce((acc, ex) => acc + (Number(ex.targetSets) || 3), 0);
  }, [exercises, isRest]);

  const effectiveCardioCount = cardioCount || cardio.length;
  const cardioMinutes = useMemo(() => {
    if (isRest || !cardio?.length) return 0;
    return cardio.reduce((acc, c) => acc + (Number(c.durationMinutes) || 0), 0);
  }, [cardio, isRest]);

  const statsLabel = useMemo(() => {
    if (isRest) return 'Rest & recovery';
    const parts: string[] = [];
    if (exerciseCount > 0) {
      parts.push(`${exerciseCount} exercises · ${totalSets} sets`);
    }
    if (effectiveCardioCount > 0) {
      parts.push(
        cardioMinutes > 0 && exerciseCount === 0
          ? `${effectiveCardioCount} cardio · ~${cardioMinutes}m`
          : `${effectiveCardioCount} cardio`
      );
    }
    return parts.length > 0 ? parts.join(' · ') : '0 exercises · 0 sets';
  }, [isRest, exerciseCount, totalSets, effectiveCardioCount, cardioMinutes]);

  return (
    <TactileButton
      variant="custom"
      haptic="light"
      scaleTo={0.985}
      style={[
        styles.row,
        !isLast && !isToday && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: subtleHairline,
        },
        isToday && [
          styles.rowToday,
          {
            backgroundColor: todayWash,
            borderLeftColor: tokens.accent.primary,
          },
        ],
      ]}
      onPress={onPress}
    >
      {/* Day Badge */}
      <View
        style={[
          styles.dayBox,
          isToday
            ? { backgroundColor: tokens.accent.primary }
            : { backgroundColor: neutralBadgeBg },
        ]}
      >
        <Text
          style={[
            styles.dayShortText,
            { color: isToday ? tokens.accent.onPrimary : tokens.text.secondary },
          ]}
          numberOfLines={1}
        >
          {dayShort}
        </Text>
      </View>

      {/* Center Column */}
      <View style={styles.infoCol}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.routineTitle,
              { color: isRest ? tokens.text.secondary : tokens.text.primary },
            ]}
            numberOfLines={1}
          >
            {routineTitle}
          </Text>
          {isToday && (
            <View style={[styles.todayDot, { backgroundColor: tokens.accent.primary }]} />
          )}
        </View>

        <NumericText
          style={[
            styles.statsText,
            { color: isRest ? tokens.text.muted : tokens.text.secondary },
          ]}
          numberOfLines={1}
        >
          {statsLabel}
        </NumericText>
      </View>

      {/* Floating Body Silhouettes & Chevron */}
      <View style={styles.rightCol}>
        {!isRest && exercises.length > 0 ? (
          <MiniDualBodyMap
            exercises={exercises}
            activeColor={tokens.accent.primary}
            avatarHeight={48}
            avatarWidth={22}
            isDark={isDark}
          />
        ) : !isRest && effectiveCardioCount > 0 ? (
          <View style={styles.restIconBox}>
            <Activity
              size={18}
              color={tokens.accent.primary}
              strokeWidth={ICON.strokeWidth}
            />
          </View>
        ) : isRest ? (
          <View style={styles.restIconBox}>
            <Moon
              size={16}
              color={tokens.text.muted}
              strokeWidth={ICON.strokeWidth}
            />
          </View>
        ) : null}

        <ChevronRight
          size={14}
          color={tokens.text.muted}
          strokeWidth={ICON.strokeWidth}
          style={styles.chevron}
        />
      </View>
    </TactileButton>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACE.xs,
    minHeight: 66,
  },
  rowToday: {
    borderRadius: 16,
    borderLeftWidth: 3,
    paddingHorizontal: SPACE.md,
    marginVertical: 3,
  },
  dayBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.inner,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACE.md,
    flexShrink: 0,
  },
  dayShortText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.2,
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingRight: SPACE.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routineTitle: {
    fontSize: 15.5,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  statsText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  restIconBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    marginLeft: 2,
  },
});

export default WeeklyDayCard;
