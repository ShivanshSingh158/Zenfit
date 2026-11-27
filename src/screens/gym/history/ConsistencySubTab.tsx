import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';
import { hapticLight, hapticSelection } from '../../../utils/haptics';
import { NumericText } from '../../../components/ui/NumericText';
import { RollingNumber } from '../../../components/ui/RollingNumber';
import { TactileButton } from '../../../components/ui/TactileButton';
import { AdherenceRingGauge } from '../../../components/ui/AnimatedSvgDonutChart';
import ConsistencyHeatmap, { HeatmapDayDetail } from '../../../components/Gym/Charts/ConsistencyHeatmap';
import AnalyticsRangeStrip, { RangeStripOption } from '../../../components/Gym/metrics/AnalyticsRangeStrip';
import {
  AnalyticsDateRange,
  AnalyticsRangePreset,
  ScopedConsistencySummary,
} from '../../../services/gymAnalyticsEngine';
import { makeHistoryStyles } from './gymHistoryStyles';

type ConsistencyChartMetric = 'load' | 'freq' | 'cardio';

const CONSISTENCY_PRESETS: RangeStripOption[] = [
  { id: '8w', label: '8W' },
  { id: '12w', label: '12W' },
  { id: '6m', label: '6M' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'All' },
];

const WeekTrendBar = React.memo(function WeekTrendBar({
  index,
  x,
  barWidth,
  chartHeight,
  barH,
  barColor,
  opacity,
  elevatedFill,
  topLabel,
  labelFill,
  onSelectIndex,
}: {
  index: number;
  x: number;
  barWidth: number;
  chartHeight: number;
  barH: number;
  barColor: string;
  opacity: number;
  elevatedFill: string;
  topLabel: string;
  labelFill: string;
  onSelectIndex: (idx: number) => void;
}) {
  return (
    <G
      onPress={() => {
        hapticLight();
        onSelectIndex(index);
      }}
    >
      <Rect
        x={x}
        y={0}
        width={barWidth}
        height={chartHeight}
        rx={4}
        fill={elevatedFill}
        opacity={0.45}
      />
      <Rect
        x={x}
        y={chartHeight - barH}
        width={barWidth}
        height={barH}
        rx={4}
        fill={barColor}
        opacity={opacity}
      />
      <SvgText
        x={x + barWidth / 2}
        y={chartHeight + 15}
        fill={labelFill}
        fontSize={9.5}
        fontFamily={FONT_FAMILY.medium}
        textAnchor="middle"
      >
        {topLabel}
      </SvgText>
    </G>
  );
});

export interface ConsistencySubTabProps {
  styles: ReturnType<typeof makeHistoryStyles>;
  tokens: ThemeTokens;
  cardBg: string;
  elevatedBg: string;
  isHeavyReady: boolean;
  safeChartWidth: number;
  replayKey: number | string;
  range: AnalyticsDateRange;
  onSelectRangePreset: (preset: AnalyticsRangePreset) => void;
  onOpenCustomSheet: () => void;
  consistency: ScopedConsistencySummary;
  heatmapData: Array<{ date: string; volume: number }>;
  detailedLogsMap: Map<string, HeatmapDayDetail>;
  selectedWeekIndex: number | null;
  onSelectWeekIndex: (idx: number) => void;
  onInspectWeekInReport: (weekMonday: string) => void;
  onOpenDateSummary: (dateStr: string) => void;
  formatVol: (kg: number) => string;
}

export const ConsistencySubTab: React.FC<ConsistencySubTabProps> = React.memo(
  function ConsistencySubTab({
    styles,
    tokens,
    cardBg,
    elevatedBg,
    isHeavyReady,
    safeChartWidth,
    replayKey,
    range,
    onSelectRangePreset,
    onOpenCustomSheet,
    consistency,
    heatmapData,
    detailedLogsMap,
    selectedWeekIndex,
    onSelectWeekIndex,
    onInspectWeekInReport,
    onOpenDateSummary,
    formatVol,
  }) {
    const [chartMetric, setChartMetric] = useState<ConsistencyChartMetric>('load');
    const localStyles = useMemo(() => makeLocalStyles(tokens), [tokens]);

    const buckets = consistency.weeklyBuckets;
    const activeWeekIdx =
      selectedWeekIndex != null && buckets[selectedWeekIndex]
        ? selectedWeekIndex
        : Math.max(0, buckets.length - 1);
    const selectedWeekItem = buckets[activeWeekIdx] || null;

    const heatmapWeeks = useMemo(() => {
      if (range.preset === '8w') return 8;
      if (range.preset === '12w') return 12;
      if (range.preset === '6m') return 26;
      if (range.preset === '1y') return 52;
      return Math.max(8, Math.min(52, Math.ceil(range.daySpan / 7)));
    }, [range.preset, range.daySpan]);

    const strongestWeekday = useMemo(() => {
      const sorted = [...consistency.weekdayFrequency].sort((a, b) => b.count - a.count);
      return sorted[0]?.count > 0 ? sorted[0] : null;
    }, [consistency.weekdayFrequency]);

    const chartGeometry = useMemo(() => {
      const chartHeight = 96;
      const count = Math.max(1, buckets.length);
      const minSlotW = count > 10 ? 32 : Math.floor((safeChartWidth - 8) / count);
      const svgW = Math.max(safeChartWidth, count * minSlotW);
      const barWidth = Math.max(12, Math.min(24, Math.floor(minSlotW * 0.62)));
      const gap = count > 1 ? (svgW - count * barWidth) / (count - 1) : 0;

      const values = buckets.map(w =>
        chartMetric === 'freq'
          ? w.workoutCount
          : chartMetric === 'cardio'
          ? w.cardioMinutes
          : w.totalVolumeKg
      );
      const maxMetric = Math.max(
        1,
        ...values,
        chartMetric === 'freq' ? consistency.plannedWeeklySessions + 1 : 1
      );

      let maPath = '';
      if (chartMetric === 'load' && count >= 2) {
        const maCoords = buckets.map((w, i) => {
          const x = (count === 1 ? svgW / 2 : i * (barWidth + gap)) + barWidth / 2;
          const y = chartHeight - (w.movingAvgVolKg / maxMetric) * chartHeight;
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${Math.max(4, y).toFixed(1)}`;
        });
        maPath = maCoords.join(' ');
      }

      const goalLineY =
        chartMetric === 'freq'
          ? Math.max(4, chartHeight - (consistency.plannedWeeklySessions / maxMetric) * chartHeight)
          : null;

      return { chartHeight, count, svgW, barWidth, gap, values, maxMetric, maPath, goalLineY };
    }, [buckets, chartMetric, safeChartWidth, consistency.plannedWeeklySessions]);

    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Timeframe Switcher Strip */}
        <View style={{ paddingHorizontal: 2 }}>
          <AnalyticsRangeStrip
            options={CONSISTENCY_PRESETS}
            range={range}
            onSelectPreset={onSelectRangePreset}
            onOpenCustomSheet={onOpenCustomSheet}
          />
        </View>

        {/* 1. Discipline & Adherence Scorecard + Ring */}
        <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
          <View style={localStyles.scoreHeroRow}>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
              <Text style={styles.cardSectionLabel}>CONSISTENCY SCORECARD</Text>
              <NumericText style={styles.cardSubLabel} numberOfLines={2}>
                {range.label} · {consistency.sessionsInRange} {consistency.sessionsInRange === 1 ? 'session' : 'sessions'} · Target {consistency.plannedWeeklySessions}/wk
              </NumericText>
            </View>
            <AdherenceRingGauge
              pct={consistency.adherenceRatePct}
              size={64}
              strokeWidth={6}
              label="ADHERENCE"
              replayKey={replayKey}
            />
          </View>

          <View style={[styles.kpiGrid, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.border.subtle, paddingTop: 12 }]}>
            <View style={styles.kpiCol}>
              <RollingNumber
                value={consistency.streakDays}
                suffix="d"
                replayKey={replayKey}
                cycles={1}
                durationMs={320}
                style={[styles.kpiValue, { color: tokens.status.warning }]}
              />
              <Text style={styles.kpiLabel}>STREAK</Text>
            </View>

            <View style={styles.kpiCol}>
              <NumericText style={[styles.kpiValue, { color: tokens.status.success }]}>
                {consistency.longestStreakDays}d
              </NumericText>
              <Text style={styles.kpiLabel}>BEST STREAK</Text>
            </View>

            <View style={styles.kpiCol}>
              <NumericText style={styles.kpiValue}>{consistency.avgWorkoutsPerWeek}</NumericText>
              <Text style={styles.kpiLabel}>AVG / WK</Text>
            </View>

            <View style={styles.kpiCol}>
              <NumericText style={[styles.kpiValue, { color: tokens.accent.secondary }]}>
                {consistency.weeksOnTargetCount}/{consistency.totalWeeksCount}
              </NumericText>
              <Text style={styles.kpiLabel}>WKS MET</Text>
            </View>
          </View>
        </View>

        {/* 2. Range-Scoped Interactive Consistency Heatmap */}
        <View style={{ marginBottom: -4 }}>
          {!isHeavyReady ? (
            <View
              style={[
                styles.insetCard,
                {
                  backgroundColor: cardBg,
                  height: 220,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}
            >
              <Text style={styles.cardSubLabel}>Loading activity grid...</Text>
            </View>
          ) : (
            <ConsistencyHeatmap
              data={heatmapData}
              numWeeks={heatmapWeeks}
              startDate={range.startDate}
              endDate={range.endDate}
              detailedLogsMap={detailedLogsMap}
              onOpenDateSummary={onOpenDateSummary}
              replayKey={replayKey}
            />
          )}
        </View>

        {/* 3. Multi-Week Workload, Frequency & Cardio Trend Chart */}
        <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
          <View style={[styles.cardHeaderRow, { alignItems: 'center' }]}>
            <View style={{ flex: 1, paddingRight: SPACE.sm }}>
              <Text style={styles.cardSectionLabel}>WORKLOAD & ADHERENCE TREND</Text>
              <NumericText style={styles.cardSubLabel}>
                {buckets.length} weeks · Tap bar to inspect or open week report
              </NumericText>
            </View>

            <View style={localStyles.modeTrack}>
              {([
                { id: 'load' as const, label: 'Load' },
                { id: 'freq' as const, label: 'Freq' },
                { id: 'cardio' as const, label: 'Cardio' },
              ]).map(opt => {
                const active = chartMetric === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      hapticSelection();
                      setChartMetric(opt.id);
                    }}
                    style={[localStyles.modePill, active && localStyles.modePillActive]}
                  >
                    <Text style={[localStyles.modeText, active && localStyles.modeTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {selectedWeekItem && (
            <View style={[styles.weekInspectBox, { backgroundColor: elevatedBg }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.weekInspectTitle}>
                  {selectedWeekItem.isCurrentWeek
                    ? 'Current Week'
                    : `Week of ${selectedWeekItem.weekLabel}`}
                </Text>
                <NumericText style={styles.weekInspectDetails} numberOfLines={1}>
                  {formatVol(selectedWeekItem.totalVolumeKg)} · {selectedWeekItem.workoutCount}/
                  {consistency.plannedWeeklySessions} sess
                  {selectedWeekItem.cardioMinutes > 0
                    ? ` · ${selectedWeekItem.cardioMinutes}m cardio`
                    : ''}
                </NumericText>
              </View>

              <TactileButton
                variant="custom"
                haptic="light"
                onPress={() => onInspectWeekInReport(selectedWeekItem.startMonday)}
                hitSlop={TOUCH.hitSlop}
                style={[styles.workloadBadge, { backgroundColor: tokens.accent.primaryDim, flexDirection: 'row', alignItems: 'center', gap: 2 }]}
              >
                <Text style={[styles.workloadBadgeText, { color: tokens.accent.primary }]}>
                  Report
                </Text>
                <ChevronRight size={11} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
              </TactileButton>
            </View>
          )}

          <View style={{ alignItems: 'center', marginTop: SPACE.md }}>
            {!isHeavyReady ? (
              <View
                style={{
                  width: safeChartWidth,
                  height: 120,
                  backgroundColor: elevatedBg,
                  borderRadius: RADIUS.inner,
                  opacity: 0.25,
                }}
              />
            ) : (
              <ScrollView
                horizontal
                nestedScrollEnabled={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 2 }}
              >
                <Svg width={chartGeometry.svgW} height={chartGeometry.chartHeight + 22}>
                  {chartGeometry.goalLineY !== null && (
                    <Line
                      x1={0}
                      y1={chartGeometry.goalLineY}
                      x2={chartGeometry.svgW}
                      y2={chartGeometry.goalLineY}
                      stroke={tokens.status.success}
                      strokeWidth={1.2}
                      strokeDasharray="4 4"
                      opacity={0.75}
                    />
                  )}

                  {buckets.map((w, idx) => {
                    const val = chartGeometry.values[idx] || 0;
                    const isSel = activeWeekIdx === idx;
                    const barH =
                      val > 0
                        ? Math.max(8, (val / chartGeometry.maxMetric) * chartGeometry.chartHeight)
                        : 4;
                    const x =
                      chartGeometry.count === 1
                        ? (chartGeometry.svgW - chartGeometry.barWidth) / 2
                        : idx * (chartGeometry.barWidth + chartGeometry.gap);

                    let barColor = tokens.text.secondary;
                    if (chartMetric === 'freq') {
                      barColor =
                        w.workoutCount >= consistency.plannedWeeklySessions
                          ? tokens.status.success
                          : w.isCurrentWeek
                          ? tokens.accent.primary
                          : tokens.text.secondary;
                    } else if (chartMetric === 'cardio') {
                      barColor = w.cardioMinutes > 0 ? tokens.status.warning : tokens.bg.elevated;
                    } else {
                      barColor = w.isCurrentWeek
                        ? tokens.accent.primary
                        : isSel
                        ? tokens.text.primary
                        : tokens.text.secondary;
                    }

                    const topLabel =
                      chartMetric === 'freq'
                        ? `${w.workoutCount}x`
                        : chartMetric === 'cardio'
                        ? w.cardioMinutes > 0
                          ? `${w.cardioMinutes}m`
                          : '—'
                        : w.workoutCount > 0
                        ? `${w.workoutCount}x`
                        : '—';

                    return (
                      <WeekTrendBar
                        key={w.startMonday}
                        index={idx}
                        x={x}
                        barWidth={chartGeometry.barWidth}
                        chartHeight={chartGeometry.chartHeight}
                        barH={barH}
                        barColor={barColor}
                        opacity={isSel ? 1 : 0.65}
                        elevatedFill={tokens.bg.elevated}
                        topLabel={topLabel}
                        labelFill={isSel ? tokens.text.primary : tokens.text.secondary}
                        onSelectIndex={onSelectWeekIndex}
                      />
                    );
                  })}

                  {chartGeometry.maPath ? (
                    <Path
                      d={chartGeometry.maPath}
                      fill="none"
                      stroke={tokens.accent.secondary}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                </Svg>
              </ScrollView>
            )}
          </View>

          <View style={styles.chartFootnoteRow}>
            <Text style={styles.chartFootnote}>
              {chartMetric === 'load'
                ? 'Cyan line = 4-week rolling avg'
                : chartMetric === 'freq'
                ? `Dashed line = ${consistency.plannedWeeklySessions}x target/wk`
                : 'Weekly conditioning minutes'}
            </Text>
            <NumericText style={styles.chartFootnote}>{range.label}</NumericText>
          </View>
        </View>

        {/* 4. Weekday Attendance Rhythm */}
        <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardSectionLabel}>WEEKDAY RHYTHM</Text>
              <Text style={styles.cardSubLabel}>
                {strongestWeekday
                  ? `Most consistent on ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][strongestWeekday.dayIndex - 1]} (${strongestWeekday.count} sessions)`
                  : 'Attendance frequency by day of week'}
              </Text>
            </View>
          </View>

          <View style={localStyles.weekdayBarsRow}>
            {consistency.weekdayFrequency.map(d => (
              <View key={d.dayIndex} style={localStyles.weekdayCol}>
                <NumericText style={localStyles.weekdayCount}>
                  {d.count > 0 ? d.count : '—'}
                </NumericText>
                <View style={localStyles.weekdayTrack}>
                  <View
                    style={[
                      localStyles.weekdayFill,
                      {
                        height: `${d.count > 0 ? Math.max(12, d.pctOfMax) : 0}%`,
                        backgroundColor:
                          d.pctOfMax >= 80
                            ? tokens.status.success
                            : d.planned
                            ? tokens.accent.primary
                            : tokens.text.muted,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    localStyles.weekdayLbl,
                    d.planned && { color: tokens.text.primary },
                  ]}
                >
                  {d.shortLabel}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 5. Period-Scoped Conditioning & Cardio Adherence */}
        {consistency.cardioPeriod.sessions > 0 && (
          <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardSectionLabel}>CONDITIONING ({range.label.toUpperCase()})</Text>
                <Text style={styles.cardSubLabel}>Total cardio across selected timeframe</Text>
              </View>
            </View>

            <View style={styles.kpiGrid}>
              <View style={styles.kpiCol}>
                <NumericText style={styles.kpiValue}>{consistency.cardioPeriod.totalMinutes}m</NumericText>
                <Text style={styles.kpiLabel}>TOTAL TIME</Text>
              </View>

              <View style={styles.kpiCol}>
                <NumericText style={styles.kpiValue}>{consistency.cardioPeriod.avgMinsPerWeek}m</NumericText>
                <Text style={styles.kpiLabel}>AVG / WK</Text>
              </View>

              <View style={styles.kpiCol}>
                <NumericText style={styles.kpiValue}>{consistency.cardioPeriod.totalKm} km</NumericText>
                <Text style={styles.kpiLabel}>DISTANCE</Text>
              </View>

              <View style={styles.kpiCol}>
                <NumericText style={styles.kpiValue}>{consistency.cardioPeriod.sessions}</NumericText>
                <Text style={styles.kpiLabel}>SESSIONS</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    );
  }
);

const makeLocalStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    scoreHeroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    bestStreakHint: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.semibold,
      color: tokens.status.warning,
      marginTop: 4,
    },
    modeTrack: {
      flexDirection: 'row',
      backgroundColor: tokens.bg.elevated,
      padding: 2,
      borderRadius: RADIUS.sm,
      gap: 2,
    },
    modePill: {
      paddingHorizontal: 9,
      paddingVertical: 4,
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
    weekdayBarsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 4,
      height: 84,
    },
    weekdayCol: {
      flex: 1,
      alignItems: 'center',
      gap: 5,
    },
    weekdayCount: {
      fontSize: 10,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.secondary,
    },
    weekdayTrack: {
      width: '58%',
      maxWidth: 22,
      height: 46,
      borderRadius: 5,
      backgroundColor: tokens.bg.elevated,
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    weekdayFill: {
      width: '100%',
      borderRadius: 5,
    },
    weekdayLbl: {
      fontSize: 10.5,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.muted,
    },
  });

export default ConsistencySubTab;
