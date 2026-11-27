import React, { useCallback, useMemo, useState, useRef } from 'react';
import { Pressable, View, Text, StyleSheet, ScrollView } from 'react-native';
import { Calendar, ChevronRight } from 'lucide-react-native';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { NumericText } from '../../ui';
import { useWeightUnit, formatVolumeParts } from '../../../utils/weightUnit';
import { hapticLight, hapticSelection } from '../../../utils/haptics';
import { parseLocalDate, toYMD } from '../../../utils/dateCore';

export type HeatmapMetricMode = 'volume' | 'sets' | 'duration';

export interface HeatmapDayDetail {
  splitTag: string;
  durationMins: number;
  setsCount: number;
  volumeKg: number;
}

interface ConsistencyHeatmapProps {
  data: { date: string; volume: number }[];
  replayKey?: number | string;
  numWeeks?: number;
  startDate?: string;
  endDate?: string;
  highlightStart?: string;
  highlightEnd?: string;
  detailedLogsMap?: Map<string, HeatmapDayDetail>;
  onOpenDateSummary?: (dateStr: string) => void;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getRangeAlignedDates(
  numWeeks: number,
  startDate?: string,
  endDate?: string
): string[] {
  const dates: string[] = [];
  const endRef = endDate ? parseLocalDate(endDate) : new Date();
  const endDow = endRef.getDay();
  const endDaysFromMon = endDow === 0 ? 6 : endDow - 1;
  const endMonday = new Date(endRef);
  endMonday.setDate(endRef.getDate() - endDaysFromMon);

  let startMonday: Date;
  if (startDate && endDate) {
    const startRef = parseLocalDate(startDate);
    const startDow = startRef.getDay();
    const startDaysFromMon = startDow === 0 ? 6 : startDow - 1;
    startMonday = new Date(startRef);
    startMonday.setDate(startRef.getDate() - startDaysFromMon);

    // Clamp overly long all-time spans to 53 weeks ending on endDate
    const totalCols = Math.ceil(
      (Math.round((endMonday.getTime() - startMonday.getTime()) / 86400000) + 7) / 7
    );
    if (totalCols > 53) {
      startMonday = new Date(endMonday);
      startMonday.setDate(endMonday.getDate() - 52 * 7);
    } else if (totalCols < 4) {
      startMonday = new Date(endMonday);
      startMonday.setDate(endMonday.getDate() - 3 * 7);
    }
  } else {
    const effective = Math.max(4, Math.min(52, numWeeks));
    startMonday = new Date(endMonday);
    startMonday.setDate(endMonday.getDate() - (effective - 1) * 7);
  }

  const endSunday = new Date(endMonday);
  endSunday.setDate(endMonday.getDate() + 6);
  const totalDays = Math.min(
    53 * 7,
    Math.max(28, Math.round((endSunday.getTime() - startMonday.getTime()) / 86400000) + 1)
  );

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startMonday);
    d.setDate(startMonday.getDate() + i);
    dates.push(toYMD(d));
  }
  return dates;
}

const HeatmapCell = React.memo(function HeatmapCell({
  dateStr,
  tier,
  isToday,
  isSelected,
  outOfRange,
  cellBaseStyle,
  tierStyle,
  todayStyle,
  selectedStyle,
  onSelectDate,
}: {
  dateStr: string;
  tier: number;
  isToday: boolean;
  isSelected: boolean;
  outOfRange: boolean;
  cellBaseStyle: any;
  tierStyle: any;
  todayStyle: any;
  selectedStyle: any;
  onSelectDate: (dateStr: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onSelectDate(dateStr)}
      hitSlop={{ top: 4, bottom: 4, left: 3, right: 3 }}
      style={({ pressed }) => [
        cellBaseStyle,
        tierStyle,
        isToday && tier === 0 && todayStyle,
        outOfRange && { opacity: 0.28 },
        isSelected && selectedStyle,
        pressed && { opacity: 0.7 },
      ]}
    />
  );
});

function formatDateShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[(m || 1) - 1] || ''} ${d || ''}`;
}

function getIntensityTier(val: number, mode: HeatmapMetricMode): 0 | 1 | 2 | 3 | 4 {
  if (val <= 0) return 0;
  if (mode === 'sets') {
    if (val < 10) return 1;
    if (val < 16) return 2;
    if (val < 24) return 3;
    return 4;
  }
  if (mode === 'duration') {
    if (val < 30) return 1;
    if (val < 50) return 2;
    if (val < 70) return 3;
    return 4;
  }
  if (val < 5000) return 1;
  if (val < 12000) return 2;
  if (val < 22000) return 3;
  return 4;
}

export const ConsistencyHeatmap: React.FC<ConsistencyHeatmapProps> = React.memo(
  function ConsistencyHeatmap({
    data,
    numWeeks = 18,
    startDate,
    endDate,
    highlightStart,
    highlightEnd,
    detailedLogsMap,
    onOpenDateSummary,
  }: ConsistencyHeatmapProps) {
    const { tokens } = useTheme();
    const unitIsLbs = useWeightUnit();
    const styles = useMemo(() => makeStyles(tokens), [tokens]);
    const scrollRef = useRef<ScrollView>(null);

    const [metricMode, setMetricMode] = useState<HeatmapMetricMode>('volume');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const effectiveBoundStart = startDate || highlightStart;
    const effectiveBoundEnd = endDate || highlightEnd;

    const { grid, totalWorkouts, valueMap } = useMemo(() => {
      const dateStrings = getRangeAlignedDates(numWeeks, startDate, endDate);
      const map = new Map<string, number>();

      data.forEach(d => {
        if (d.volume > 0) {
          map.set(d.date, (map.get(d.date) || 0) + d.volume);
        }
      });

      const hasRangeFilter = Boolean(effectiveBoundStart && effectiveBoundEnd);
      let workoutCount = 0;
      if (hasRangeFilter) {
        map.forEach((v, dStr) => {
          if (v > 0 && dStr >= effectiveBoundStart! && dStr <= effectiveBoundEnd!) {
            workoutCount++;
          }
        });
      } else {
        const seen = new Set(dateStrings);
        seen.forEach(dStr => {
          if ((map.get(dStr) || 0) > 0) workoutCount++;
        });
      }

      const chunks: string[][] = [];
      for (let i = 0; i < dateStrings.length; i += 7) {
        chunks.push(dateStrings.slice(i, i + 7));
      }

      return {
        grid: chunks,
        totalWorkouts: workoutCount,
        valueMap: map,
      };
    }, [data, numWeeks, startDate, endDate, effectiveBoundStart, effectiveBoundEnd]);

    const todayStr = useMemo(() => toYMD(new Date()), []);

    const handleSelectCell = useCallback((dateStr: string) => {
      hapticLight();
      setSelectedDate(prev => (prev === dateStr ? null : dateStr));
    }, []);

    const selectedDetail = selectedDate ? detailedLogsMap?.get(selectedDate) : undefined;
    const selectedRawVol = selectedDate ? valueMap.get(selectedDate) || selectedDetail?.volumeKg || 0 : 0;

    const getTooltipColor = (vol: number) => {
      if (vol >= 12000) return tokens.status.success;
      if (vol > 0) return tokens.accent.primary;
      return tokens.text.secondary;
    };

    const gridWeeksCount = grid.length;

    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Calendar size={ICON.xs} strokeWidth={ICON.strokeWidth} color={tokens.status.success} />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.title}>CONSISTENCY GRID</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1 }}>
                <NumericText style={[styles.subtitle, { fontFamily: FONT_FAMILY.bold, color: tokens.text.primary }]}>
                  {totalWorkouts}
                </NumericText>
                <Text style={styles.subtitle}>
                  {' '}{totalWorkouts === 1 ? 'workout' : 'workouts'} · {gridWeeksCount}w
                </Text>
              </View>
            </View>
          </View>

          {detailedLogsMap ? (
            <View style={styles.modeTrack}>
              {([
                { id: 'volume' as const, label: 'Vol' },
                { id: 'sets' as const, label: 'Sets' },
                { id: 'duration' as const, label: 'Time' },
              ]).map(m => {
                const active = metricMode === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => {
                      hapticSelection();
                      setMetricMode(m.id);
                    }}
                    style={[styles.modePill, active && styles.modePillActive]}
                  >
                    <Text style={[styles.modeText, active && styles.modeTextActive]}>
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.activeTag}>
              <View style={styles.activeDot} />
              <Text style={styles.activeTagText}>Logged</Text>
            </View>
          )}
        </View>

        {/* Day labels + Grid */}
        <View style={styles.heatmapRow}>
          <View style={styles.dayLabelsCol}>
            {DAY_LABELS.map((label, i) => (
              <Text key={i} maxFontSizeMultiplier={1.15} style={styles.dayLabelText}>
                {label}
              </Text>
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
            <View style={styles.grid}>
              {grid.map((col, colIndex) => (
                <View key={`col-${col[0] || colIndex}`} style={styles.column}>
                  {col.map(dateStr => {
                    const detail = detailedLogsMap?.get(dateStr);
                    const metricVal =
                      metricMode === 'sets' && detail
                        ? detail.setsCount
                        : metricMode === 'duration' && detail
                        ? detail.durationMins
                        : valueMap.get(dateStr) || detail?.volumeKg || 0;
                    const hasWorkout = (valueMap.get(dateStr) || 0) > 0;
                    const tier = hasWorkout ? Math.max(1, getIntensityTier(metricVal, metricMode)) : 0;
                    const isToday = dateStr === todayStr;
                    const isSelected = selectedDate === dateStr;
                    const outOfRange =
                      Boolean(effectiveBoundStart && effectiveBoundEnd) &&
                      (dateStr < effectiveBoundStart! || dateStr > effectiveBoundEnd!);

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
                      <HeatmapCell
                        key={dateStr}
                        dateStr={dateStr}
                        tier={tier}
                        isToday={isToday}
                        isSelected={isSelected}
                        outOfRange={outOfRange}
                        cellBaseStyle={styles.cell}
                        tierStyle={tierStyle}
                        todayStyle={styles.cellToday}
                        selectedStyle={styles.cellSelected}
                        onSelectDate={handleSelectCell}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Footer: Actionable Tooltip + 4-Tier Legend */}
        <View style={styles.footerRow}>
          {selectedDate ? (
            <View style={styles.tooltip}>
              <View
                style={[
                  styles.tooltipDot,
                  { backgroundColor: getTooltipColor(selectedRawVol) },
                ]}
              />
              <NumericText style={styles.tooltipDate}>{formatDateShort(selectedDate)}</NumericText>
              <NumericText style={styles.tooltipVol}>
                {selectedRawVol > 0
                  ? `${selectedDetail?.splitTag ? `${selectedDetail.splitTag} · ` : ''}${
                      metricMode === 'sets' && selectedDetail
                        ? `${selectedDetail.setsCount} sets`
                        : metricMode === 'duration' && selectedDetail
                        ? `${selectedDetail.durationMins}m`
                        : formatVolumeParts(selectedRawVol, unitIsLbs).full
                    }`
                  : 'Rest day'}
              </NumericText>
              {selectedRawVol > 0 && onOpenDateSummary && (
                <Pressable
                  onPress={() => {
                    hapticLight();
                    onOpenDateSummary(selectedDate);
                  }}
                  hitSlop={TOUCH.hitSlop}
                  style={styles.openLogPill}
                >
                  <Text style={styles.openLogText}>Open</Text>
                  <ChevronRight size={11} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                </Pressable>
              )}
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
  }
);

export default ConsistencyHeatmap;

const makeStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
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
      gap: 8,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.sm,
      flex: 1,
      minWidth: 0,
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
    modeTrack: {
      flexDirection: 'row',
      backgroundColor: tokens.bg.elevated,
      padding: 2,
      borderRadius: RADIUS.sm,
      gap: 2,
      flexShrink: 0,
    },
    modePill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    modePillActive: {
      backgroundColor: tokens.bg.surface,
    },
    modeText: {
      fontSize: 10.5,
      fontFamily: FONT_FAMILY.semibold,
      color: tokens.text.muted,
    },
    modeTextActive: {
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.primary,
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
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
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
    openLogPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingLeft: 6,
      paddingRight: 3,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: tokens.accent.primaryDim,
    },
    openLogText: {
      fontSize: 10.5,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.accent.primary,
    },
  });
