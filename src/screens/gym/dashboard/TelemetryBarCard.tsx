import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Check, ChevronRight } from 'lucide-react-native';
import { ICON, TOUCH, ThemeTokens } from '../../../theme/tokens';
import { hapticLight } from '../../../utils/haptics';
import { NumericText } from '../../../components/ui/NumericText';
import { TactileButton } from '../../../components/ui/TactileButton';
import { makeDashboardStyles } from './gymDashboardStyles';

export interface WeekDaySlot {
  dateStr: string;
  letter: string;
  dayName: string;
  isToday: boolean;
  isDone: boolean;
  isRest: boolean;
  workoutName: string;
  exerciseCount: number;
  totalSets: number;
}

export interface WeeklySplitStripProps {
  weekSlots: WeekDaySlot[];
  sessionsThisWeek: number;
  weeklyPlannedSessions: number;
  onOpenPlan: () => void;
  tokens: ThemeTokens;
  styles: ReturnType<typeof makeDashboardStyles>;
}

export const WeeklySplitStrip: React.FC<WeeklySplitStripProps> = React.memo(
  function WeeklySplitStrip({
    weekSlots,
    sessionsThisWeek,
    weeklyPlannedSessions,
    onOpenPlan,
    tokens,
    styles,
  }) {
    const [peekDateStr, setPeekDateStr] = useState<string | null>(null);

    const peekSlot = peekDateStr
      ? weekSlots.find((s) => s.dateStr === peekDateStr) || null
      : null;

    const allDone = sessionsThisWeek >= weeklyPlannedSessions && weeklyPlannedSessions > 0;

    return (
      <View style={styles.weekStripSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderLabel} numberOfLines={1}>
            THIS WEEK
          </Text>
          <NumericText
            style={[
              styles.weekSummaryFraction,
              allDone && { color: tokens.status.success },
            ]}
          >
            {sessionsThisWeek} / {weeklyPlannedSessions} done
          </NumericText>
        </View>

        <View style={styles.weekNodesRow}>
          {weekSlots.map((slot) => {
            const isPeeked = peekSlot?.dateStr === slot.dateStr;
            return (
              <Pressable
                key={slot.dateStr}
                onPress={() => {
                  hapticLight();
                  setPeekDateStr((prev) =>
                    prev === slot.dateStr ? null : slot.dateStr
                  );
                }}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                style={styles.weekNodeCol}
                accessibilityLabel={`${slot.dayName}: ${slot.workoutName}`}
              >
                <Text
                  style={[
                    styles.weekNodeLetter,
                    (slot.isToday || isPeeked) && {
                      color: tokens.text.primary,
                    },
                  ]}
                >
                  {slot.letter}
                </Text>

                <View
                  style={[
                    styles.weekNodeCircle,
                    slot.isDone
                      ? {
                          backgroundColor: tokens.status.successDim,
                          borderColor: 'rgba(48, 209, 88, 0.45)',
                        }
                      : slot.isToday
                      ? {
                          backgroundColor: tokens.accent.primaryDim,
                          borderColor: tokens.accent.primary,
                        }
                      : slot.isRest
                      ? {
                          backgroundColor: tokens.isDark
                            ? 'rgba(255, 255, 255, 0.03)'
                            : 'rgba(9, 9, 11, 0.03)',
                          borderColor: 'transparent',
                        }
                      : {
                          backgroundColor: tokens.isDark
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(9, 9, 11, 0.05)',
                          borderColor: tokens.isDark
                            ? 'rgba(255, 255, 255, 0.12)'
                            : 'rgba(9, 9, 11, 0.12)',
                        },
                    isPeeked && {
                      borderColor: tokens.text.primary,
                    },
                  ]}
                >
                  {slot.isDone ? (
                    <Check
                      size={13}
                      color={tokens.status.success}
                      strokeWidth={2.5}
                    />
                  ) : slot.isToday ? (
                    <View
                      style={[
                        styles.weekTodayInnerDot,
                        { backgroundColor: tokens.accent.primary },
                      ]}
                    />
                  ) : slot.isRest ? (
                    <View
                      style={[
                        styles.weekRestDash,
                        {
                          backgroundColor: tokens.isDark
                            ? 'rgba(255, 255, 255, 0.20)'
                            : 'rgba(9, 9, 11, 0.20)',
                        },
                      ]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.weekUpcomingDot,
                        {
                          backgroundColor: tokens.isDark
                            ? 'rgba(255, 255, 255, 0.16)'
                            : 'rgba(9, 9, 11, 0.16)',
                        },
                      ]}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {peekSlot ? (
          <Animated.View
            entering={FadeInDown.duration(150)}
            style={styles.weekPeekRow}
          >
            <View style={styles.weekPeekTextCol}>
              <Text style={styles.weekPeekTitle} numberOfLines={1}>
                {peekSlot.isToday ? 'Today' : peekSlot.dayName} · {peekSlot.workoutName}
              </Text>
              <NumericText style={styles.weekPeekSub} numberOfLines={1}>
                {peekSlot.isRest
                  ? 'Scheduled recovery day'
                  : `${peekSlot.exerciseCount} lifts · ${peekSlot.totalSets} sets`}
              </NumericText>
            </View>
            <TactileButton
              variant="custom"
              hitSlop={TOUCH.hitSlop}
              onPress={() => {
                setPeekDateStr(null);
                onOpenPlan();
              }}
              style={styles.weekPeekAction}
            >
              <Text style={styles.sectionBadgeLink}>Plan</Text>
              <ChevronRight
                size={13}
                color={tokens.accent.primary}
                strokeWidth={ICON.strokeWidth}
              />
            </TactileButton>
          </Animated.View>
        ) : null}
      </View>
    );
  }
);

export default WeeklySplitStrip;
