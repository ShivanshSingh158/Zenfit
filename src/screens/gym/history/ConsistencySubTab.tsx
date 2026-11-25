import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Flame } from 'lucide-react-native';
import Svg, { Rect, G, Text as SvgText } from 'react-native-svg';
import {
  Extrapolation,
  SharedValue,
  interpolate,
  useSharedValue,
  useAnimatedProps,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';

import { FONT_FAMILY, ICON, RADIUS, SPACE, ThemeTokens } from '../../../theme/tokens';
import { durations, iosEasing } from '../../../theme/motion';
import { hapticLight } from '../../../utils/haptics';
import { NumericText } from '../../../components/ui/NumericText';
import { RollingNumber } from '../../../components/ui/RollingNumber';
import { AnimatedSvgRect } from '../../../components/ui/AnimatedSvgCharts';
import ConsistencyHeatmap from '../../../components/Gym/Charts/ConsistencyHeatmap';
import { WeeklyTrendItem } from '../../../services/gymAnalyticsEngine';
import { makeHistoryStyles } from './gymHistoryStyles';

const AnimatedEightWeekBar = React.memo(function AnimatedEightWeekBar({
  index,
  x,
  barWidth,
  chartHeight,
  barH,
  barColor,
  opacity,
  elevatedFill,
  countLabel,
  labelFill,
  chartProgress,
  onPress,
}: {
  index: number;
  x: number;
  barWidth: number;
  chartHeight: number;
  barH: number;
  barColor: string;
  opacity: number;
  elevatedFill: string;
  countLabel: string;
  labelFill: string;
  chartProgress: SharedValue<number>;
  onPress: () => void;
}) {
  const animatedBarProps = useAnimatedProps(() => {
    const start = index * 0.05;
    const localProgress = interpolate(
      chartProgress.value,
      [start, start + 0.6],
      [0, 1],
      Extrapolation.CLAMP
    );
    const curH = Math.max(0, barH * localProgress);
    return {
      y: chartHeight - curH,
      height: curH,
    };
  });

  return (
    <G onPress={onPress}>
      <Rect
        x={x}
        y={0}
        width={barWidth}
        height={chartHeight}
        rx={4}
        fill={elevatedFill}
        opacity={0.5}
      />
      <AnimatedSvgRect
        x={x}
        width={barWidth}
        rx={4}
        fill={barColor}
        opacity={opacity}
        animatedProps={animatedBarProps}
      />
      <SvgText
        x={x + barWidth / 2}
        y={chartHeight + 16}
        fill={labelFill}
        fontSize={10}
        fontFamily={FONT_FAMILY.medium}
        textAnchor="middle"
      >
        {countLabel}
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
  consistencyStats: {
    streakDays: number;
    adherenceRatePct: number;
    weeksOnTargetCount: number;
    avgWorkoutsPerWeek: number;
  };
  heatmapData: Array<{ date: string; volume: number }>;
  weeklyTrends: WeeklyTrendItem[];
  selectedWeekItem: WeeklyTrendItem | null;
  selectedWeekIndex: number | null;
  onSelectWeekIndex: (idx: number) => void;
  plannedWeeklySessions: number;
  cardioSummary: {
    cardioMinutes: number;
    cardioDistanceKm: number;
    workoutsThisWeek: number;
  };
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
    consistencyStats,
    heatmapData,
    weeklyTrends,
    selectedWeekItem,
    selectedWeekIndex,
    onSelectWeekIndex,
    plannedWeeklySessions,
    cardioSummary,
    formatVol,
  }) {
    const chartProgress = useSharedValue(0);

    useEffect(() => {
      if (!isHeavyReady) return;
      cancelAnimation(chartProgress);
      chartProgress.value = 0;
      chartProgress.value = withTiming(1, {
        duration: durations.barFill,
        easing: iosEasing.decel,
      });
      return () => {
        cancelAnimation(chartProgress);
      };
    }, [isHeavyReady, replayKey, weeklyTrends.length, chartProgress]);

    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Habit Discipline & Adherence KPIs Strip */}
        <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardSectionLabel}>CONSISTENCY SUMMARY</Text>
              <Text style={styles.cardSubLabel}>
                Long-term routine adherence across the last 8 weeks
              </Text>
            </View>
          </View>

          <View style={styles.kpiGrid}>
            <View style={styles.kpiCol}>
              <RollingNumber
                value={consistencyStats.streakDays}
                suffix="d"
                replayKey={replayKey}
                cycles={1}
                durationMs={480}
                style={[styles.kpiValue, { color: tokens.status.warning }]}
              />
              <Text style={styles.kpiLabel}>STREAK</Text>
            </View>

            <View style={styles.kpiCol}>
              <RollingNumber
                value={consistencyStats.adherenceRatePct}
                suffix="%"
                replayKey={replayKey}
                cycles={1}
                durationMs={540}
                style={[styles.kpiValue, { color: tokens.status.success }]}
              />
              <Text style={styles.kpiLabel}>ADHERENCE</Text>
            </View>

            <View style={styles.kpiCol}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <NumericText style={[styles.kpiValue, { color: tokens.accent.secondary }]}>
                  {consistencyStats.weeksOnTargetCount}/8
                </NumericText>
              </View>
              <Text style={styles.kpiLabel}>WKS MET</Text>
            </View>

            <View style={styles.kpiCol}>
              <NumericText style={styles.kpiValue}>
                {consistencyStats.avgWorkoutsPerWeek}
              </NumericText>
              <Text style={styles.kpiLabel}>AVG / WK</Text>
            </View>
          </View>
        </View>

        {/* 2. 18-Week Consistency Grid */}
        <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardSectionLabel}>18-WEEK CONSISTENCY GRID</Text>
              <Text style={styles.cardSubLabel}>Daily workout attendance & volume intensity</Text>
            </View>
          </View>

          {!isHeavyReady ? (
            <View
              style={{
                height: 140,
                backgroundColor: elevatedBg,
                borderRadius: RADIUS.inner,
                opacity: 0.25,
                marginTop: SPACE.sm,
              }}
            />
          ) : (
            <ConsistencyHeatmap data={heatmapData} replayKey={replayKey} />
          )}
        </View>

        {/* 3. 8-Week Workload Wave & Fatigue Trend */}
        <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, paddingRight: SPACE.sm }}>
              <Text style={styles.cardSectionLabel}>8-WEEK WORKLOAD & FREQUENCY</Text>
              <Text style={styles.cardSubLabel}>Weekly volume trend and training frequency</Text>
            </View>
          </View>

          {selectedWeekItem && (
            <View style={[styles.weekInspectBox, { backgroundColor: elevatedBg }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.weekInspectTitle}>
                  {selectedWeekItem.isCurrentWeek
                    ? 'Current Week'
                    : `Week of ${selectedWeekItem.weekLabel}`}
                </Text>
                <NumericText style={styles.weekInspectDetails}>
                  {formatVol(selectedWeekItem.totalVolumeKg)} · {selectedWeekItem.workoutCount} of{' '}
                  {plannedWeeklySessions} sessions
                  {selectedWeekItem.cardioMinutes > 0
                    ? ` · ${selectedWeekItem.cardioMinutes}m cardio`
                    : ''}
                </NumericText>
              </View>
              <View
                style={[
                  styles.workloadBadge,
                  {
                    backgroundColor:
                      selectedWeekItem.workoutCount >= plannedWeeklySessions
                        ? tokens.status.successDim
                        : selectedWeekItem.workoutCount === 0
                        ? tokens.bg.surface
                        : tokens.accent.primaryDim,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.workloadBadgeText,
                    {
                      color:
                        selectedWeekItem.workoutCount >= plannedWeeklySessions
                          ? tokens.status.success
                          : selectedWeekItem.workoutCount === 0
                          ? tokens.text.secondary
                          : tokens.accent.primary,
                    },
                  ]}
                >
                  {selectedWeekItem.workoutCount >= plannedWeeklySessions
                    ? 'Target Met'
                    : selectedWeekItem.workoutCount === 0
                    ? 'Rest'
                    : 'In Progress'}
                </Text>
              </View>
            </View>
          )}

          {/* 8-Week SVG Bar Chart */}
          <View style={{ alignItems: 'center', marginTop: SPACE.md }}>
            {!isHeavyReady ? (
              <View
                style={{
                  width: safeChartWidth,
                  height: 90 + 24,
                  backgroundColor: elevatedBg,
                  borderRadius: RADIUS.inner,
                  opacity: 0.25,
                }}
              />
            ) : (
              (() => {
                const maxVol = Math.max(...weeklyTrends.map((w) => w.totalVolumeKg), 1);
                const chartHeight = 90;
                const barWidth = Math.max(14, Math.min(24, Math.floor((safeChartWidth - 7 * 6) / 8)));
                const gap = (safeChartWidth - 8 * barWidth) / 7;

                return (
                  <Svg width={safeChartWidth} height={chartHeight + 24}>
                    {weeklyTrends.map((w, idx) => {
                      const isSel =
                        selectedWeekIndex === idx ||
                        (selectedWeekIndex == null && w.isCurrentWeek);
                      const barH = Math.max(8, (w.totalVolumeKg / maxVol) * chartHeight);
                      const x = idx * (barWidth + gap);
                      const barColor = w.isCurrentWeek
                        ? tokens.accent.primary
                        : isSel
                        ? tokens.text.primary
                        : tokens.text.secondary;
                      const opacity = isSel ? 1 : 0.6;

                      return (
                        <AnimatedEightWeekBar
                          key={w.startMonday}
                          index={idx}
                          x={x}
                          barWidth={barWidth}
                          chartHeight={chartHeight}
                          barH={barH}
                          barColor={barColor}
                          opacity={opacity}
                          elevatedFill={tokens.bg.elevated}
                          countLabel={w.workoutCount > 0 ? `${w.workoutCount}x` : '—'}
                          labelFill={isSel ? tokens.text.primary : tokens.text.secondary}
                          chartProgress={chartProgress}
                          onPress={() => {
                            hapticLight();
                            onSelectWeekIndex(idx);
                          }}
                        />
                      );
                    })}
                  </Svg>
                );
              })()
            )}
          </View>

          <View style={styles.chartFootnoteRow}>
            <Text style={styles.chartFootnote}>Tap any week column to inspect load</Text>
            <NumericText style={styles.chartFootnote}>8w Trend</NumericText>
          </View>
        </View>

        {/* 4. Cardio & Conditioning Adherence (Conditional) */}
        {cardioSummary.cardioMinutes > 0 && (
          <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
            <Text style={styles.cardSectionLabel}>CARDIO & CONDITIONING ADHERENCE</Text>

            <View style={styles.kpiGrid}>
              <View style={styles.kpiCol}>
                <NumericText style={styles.kpiValue}>{cardioSummary.cardioMinutes}m</NumericText>
                <Text style={styles.kpiLabel}>TIME</Text>
              </View>

              <View style={styles.kpiCol}>
                <NumericText style={styles.kpiValue}>{cardioSummary.cardioDistanceKm} km</NumericText>
                <Text style={styles.kpiLabel}>DISTANCE</Text>
              </View>

              <View style={styles.kpiCol}>
                <NumericText style={styles.kpiValue}>{cardioSummary.workoutsThisWeek}</NumericText>
                <Text style={styles.kpiLabel}>SESSIONS</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    );
  }
);

export default ConsistencySubTab;
