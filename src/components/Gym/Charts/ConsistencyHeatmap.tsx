import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Pressable, View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Calendar } from 'lucide-react-native';
import { FONT_FAMILY, ICON, RADIUS, SPACE, ThemeTokens } from '../../../theme/tokens';
import { iosEasing } from '../../../theme/motion';
import { useTheme } from '../../../contexts/ThemeContext';
import { NumericText } from '../../ui';
import { useWeightUnit, formatVolumeParts } from '../../../utils/weightUnit';

interface ConsistencyHeatmapProps {
  data: { date: string; volume: number }[];
  replayKey?: number | string;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const NUM_WEEKS = 18;

function getRecentWeeksDates(numWeeks: number = 18): string[] {
  const dates: string[] = [];
  const today = new Date();
  const todayDay = today.getDay();
  const daysFromMonday = todayDay === 0 ? 6 : todayDay - 1;

  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - daysFromMonday);

  const startMonday = new Date(currentMonday);
  startMonday.setDate(currentMonday.getDate() - (numWeeks - 1) * 7);

  const totalDays = numWeeks * 7;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startMonday);
    d.setDate(startMonday.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
  }
  return dates;
}

function formatDateShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d}`;
}

function getVolumeTier(volume: number): 0 | 1 | 2 | 3 | 4 {
  if (volume <= 0) return 0;
  if (volume < 5000) return 1;
  if (volume < 12000) return 2;
  if (volume < 22000) return 3;
  return 4;
}

export const ConsistencyHeatmap: React.FC<ConsistencyHeatmapProps> = React.memo(function ConsistencyHeatmap({ data, replayKey = 0 }: ConsistencyHeatmapProps) {
  const { tokens } = useTheme();
  const unitIsLbs = useWeightUnit();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const scrollRef = useRef<ScrollView>(null);

  const [selected, setSelected] = useState<{ date: string; volume: number } | null>(null);

  const { grid, totalWorkouts, volumeMap } = useMemo(() => {
    const dateStrings = getRecentWeeksDates(NUM_WEEKS);
    const dateSet = new Set(dateStrings);
    const map = new Map<string, number>();

    data.forEach(d => {
      if (d.volume > 0) {
        map.set(d.date, (map.get(d.date) || 0) + d.volume);
      }
    });

    let workoutCount = 0;
    dateSet.forEach(dateStr => {
      if ((map.get(dateStr) || 0) > 0) workoutCount++;
    });

    const chunks: string[][] = [];
    for (let i = 0; i < dateStrings.length; i += 7) {
      chunks.push(dateStrings.slice(i, i + 7));
    }

    return {
      grid: chunks,
      totalWorkouts: workoutCount,
      volumeMap: map,
    };
  }, [data]);

  const volumeForDate = (dateStr: string): number => {
    return volumeMap.get(dateStr) || 0;
  };

  const todayStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  const getTooltipColor = (volume: number) => {
    if (volume >= 12000) return tokens.status.success;
    if (volume > 0) return tokens.accent.primary;
    return tokens.text.secondary;
  };

  const gridOpacity = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(gridOpacity);
    gridOpacity.value = 0;
    gridOpacity.value = withTiming(1, { duration: 280, easing: iosEasing.decel });
  }, [replayKey, gridOpacity]);

  const gridAnimStyle = useAnimatedStyle(() => ({
    opacity: gridOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Calendar size={ICON.xs} strokeWidth={ICON.strokeWidth} color={tokens.status.success} />
          </View>
          <View>
            <Text style={styles.title}>CONSISTENCY GRID</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1 }}>
              <NumericText style={[styles.subtitle, { fontFamily: FONT_FAMILY.bold, color: tokens.text.primary }]}>
                {totalWorkouts}
              </NumericText>
              <Text style={styles.subtitle}>
                {' '}{totalWorkouts === 1 ? 'workout' : 'workouts'} logged across {NUM_WEEKS} weeks
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.activeTag}>
          <View style={styles.activeDot} />
          <Text style={styles.activeTagText}>Logged</Text>
        </View>
      </View>

      {/* Day labels + Full-Width Grid */}
      <View style={styles.heatmapRow}>
        <View style={styles.dayLabelsCol}>
          {DAY_LABELS.map((label, i) => (
            <Text key={i} maxFontSizeMultiplier={1.15} style={styles.dayLabelText}>{label}</Text>
          ))}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          nestedScrollEnabled={true}
          showsHorizontalScrollIndicator={false}
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <Animated.View style={[styles.grid, gridAnimStyle]}>
            {grid.map((col, colIndex) => (
              <View key={`col-${colIndex}`} style={styles.column}>
                {col.map((dateStr) => {
                  const vol = volumeForDate(dateStr);
                  const isLogged = vol > 0;
                  const tier = getVolumeTier(vol);
                  const isToday = dateStr === todayStr;
                  const isSelected = selected?.date === dateStr;

                  const tierStyle =
                    tier === 4
                      ? styles.cellTier4
                      : tier === 3
                      ? styles.cellTier3
                      : tier === 2
                      ? styles.cellTier2
                      : tier === 1
                      ? styles.cellTier1
                      : styles.cellEmpty;

                  return (
                    <Pressable
                      key={dateStr}
                      onPress={() => {
                        setSelected(prev => (prev?.date === dateStr ? null : { date: dateStr, volume: vol }));
                      }}
                      style={({ pressed }) => [styles.cellWrapper, pressed && { opacity: 0.7 }]}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    >
                      <View
                        style={[
                          styles.cell,
                          tierStyle,
                          isToday && !isLogged && styles.cellToday,
                          isSelected && styles.cellSelected,
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </Animated.View>
        </ScrollView>
      </View>

      {/* Footer: Tooltip or 4-Tier Volume Legend */}
      <View style={styles.footerRow}>
        {selected ? (
          <View style={styles.tooltip}>
            <View
              style={[
                styles.tooltipDot,
                { backgroundColor: getTooltipColor(selected.volume) },
              ]}
            />
            <NumericText style={styles.tooltipDate}>{formatDateShort(selected.date)}</NumericText>
            <NumericText style={styles.tooltipVol}>
              {selected.volume > 0
                ? `${formatVolumeParts(selected.volume, unitIsLbs).full} vol`
                : 'Rest day'}
            </NumericText>
          </View>
        ) : (
          <View />
        )}

        <View style={styles.legendRow}>
          <Text style={styles.legendLabel}>Less</Text>
          <View style={styles.legendCells}>
            <View style={[styles.legendCell, styles.cellEmpty]} />
            <View style={[styles.legendCell, styles.cellTier1]} />
            <View style={[styles.legendCell, styles.cellTier2]} />
            <View style={[styles.legendCell, styles.cellTier3]} />
            <View style={[styles.legendCell, styles.cellTier4]} />
          </View>
          <Text style={styles.legendLabel}>More</Text>
        </View>
      </View>
    </View>
  );
});

export default ConsistencyHeatmap;

const makeStyles = (tokens: ThemeTokens) => StyleSheet.create({
  container: {
    backgroundColor: tokens.bg.surface,
    borderRadius: RADIUS.card,
    padding: SPACE.lg,
    marginBottom: SPACE.md,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    backgroundColor: tokens.status.successDim,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.status.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.xs,
    color: tokens.text.primary,
    letterSpacing: 0.8,
  },
  subtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: tokens.fontSize.xs,
    color: tokens.text.secondary,
    marginTop: 1,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs + 1,
    backgroundColor: tokens.status.successDim,
    borderColor: tokens.border.subtle,
    borderWidth: tokens.border.hairlineWidth,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
    backgroundColor: tokens.status.success,
  },
  activeTagText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.xs,
    color: tokens.status.success,
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dayLabelsCol: {
    flexDirection: 'column',
    gap: SPACE.xs,
    height: 7 * 22 - 4,
    paddingRight: SPACE.sm,
  },
  dayLabelText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: tokens.fontSize.xs,
    color: tokens.text.muted,
    height: 18,
    lineHeight: 18,
    textAlign: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingRight: SPACE.xs,
  },
  grid: {
    flexDirection: 'row',
    gap: SPACE.xs,
  },
  column: {
    flexDirection: 'column',
    gap: SPACE.xs,
  },
  cellWrapper: {
    padding: 0,
  },
  cell: {
    width: 18,
    height: 18,
    borderRadius: RADIUS.xs,
  },
  cellEmpty: {
    backgroundColor: tokens.bg.elevated,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  cellTier1: {
    backgroundColor: tokens.status.successDim,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.status.success,
  },
  cellTier2: {
    backgroundColor: tokens.accent.primaryDim,
    borderWidth: 1,
    borderColor: tokens.accent.primary,
  },
  cellTier3: {
    backgroundColor: tokens.status.success,
    opacity: 0.78,
  },
  cellTier4: {
    backgroundColor: tokens.status.success,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.text.primary,
  },
  cellToday: {
    borderColor: tokens.accent.primary,
    borderWidth: 1,
  },
  cellSelected: {
    borderWidth: 2,
    borderColor: tokens.text.primary,
  },
  footerRow: {
    marginTop: SPACE.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs + 1,
    marginLeft: 'auto',
  },
  legendLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: tokens.fontSize.xs,
    color: tokens.text.secondary,
  },
  legendCells: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  tooltip: {
    backgroundColor: tokens.bg.elevated,
    borderRadius: RADIUS.inner,
    paddingHorizontal: SPACE.sm + 2,
    paddingVertical: SPACE.xs + 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs + 2,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  tooltipDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
  },
  tooltipDate: {
    fontSize: tokens.fontSize.xs,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  tooltipVol: {
    fontSize: tokens.fontSize.xs,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.status.success,
  },
});
