import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Dumbbell } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { feedback } from '../../../utils/haptics';
import { ICON, SPACE } from '../../../theme/tokens';
import { useResponsiveMetrics } from '../../../theme/responsive';
import { useTheme } from '../../../contexts/ThemeContext';
import { TactileButton } from '../../ui/TactileButton';
import { IOSSegmentedControl } from '../../ui/IOSSegmentedControl';
import { AnimatedSvgLineChart, ChartDataPoint } from '../../ui/AnimatedSvgCharts';
import { NumericText } from '../../ui/NumericText';
import { useWeightUnit, kgToDisplay, unitLabel } from '../../../utils/weightUnit';

export interface WorkoutSummaryProgressionChartProps {
  availableLifts: string[];
  selectedLift: string;
  setSelectedLift: (lift: string) => void;
  selectedMetric: '1RM' | 'Volume';
  setSelectedMetric: (m: '1RM' | 'Volume') => void;
  chartData: any;
  streakStyle: any;
  styles: any;
  isDark: boolean;
  replayKey?: number | string;
}

export const WorkoutSummaryProgressionChart: React.FC<WorkoutSummaryProgressionChartProps> = React.memo(
  ({
    availableLifts,
    selectedLift,
    setSelectedLift,
    selectedMetric,
    setSelectedMetric,
    chartData,
    streakStyle,
    styles,
    replayKey = 0,
  }) => {
    const { tokens } = useTheme();
    const unitIsLbs = useWeightUnit();
    const uLabel = unitLabel(unitIsLbs);
    const { clampChartWidth } = useResponsiveMetrics();
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

    const svgPoints = useMemo<ChartDataPoint[]>(() => {
      const nums: number[] = chartData?.datasets?.[0]?.data || [];
      const labels: string[] = chartData?.labels || [];
      if (
        !Array.isArray(nums) ||
        nums.length === 0 ||
        !nums.every((n) => typeof n === 'number' && Number.isFinite(n))
      ) {
        return [];
      }
      return nums.map((val, idx) => ({
        value: kgToDisplay(val, unitIsLbs, selectedMetric === 'Volume' ? 0 : 1),
        xLabel: labels[idx] || '',
      }));
    }, [chartData, unitIsLbs, selectedMetric]);

    const chartWidth = clampChartWidth(56);
    const activePt = selectedIdx != null && svgPoints[selectedIdx] ? svgPoints[selectedIdx] : null;

    return (
      <Animated.View style={[styles.progressionCard, streakStyle]}>
        <View style={[styles.sectionHeaderRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={styles.sectionTitle}>90-DAY PROGRESSION</Text>
          {activePt && (
            <NumericText style={{ fontSize: 12, color: tokens.accent.primary }}>
              {activePt.xLabel ? `${activePt.xLabel} · ` : ''}
              {activePt.value} {uLabel}
            </NumericText>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
          style={{ marginBottom: 14 }}
        >
          {availableLifts.map((lift) => {
            const isActive = selectedLift.toLowerCase() === lift.toLowerCase();
            return (
              <TactileButton
                key={lift}
                variant="custom"
                haptic="none"
                style={[styles.liftPill, isActive && styles.liftPillActive]}
                onPress={() => {
                  feedback.tap();
                  setSelectedIdx(null);
                  setSelectedLift(lift);
                }}
              >
                <Text style={[styles.liftPillText, isActive && styles.liftPillTextActive]}>
                  {lift}
                </Text>
              </TactileButton>
            );
          })}
        </ScrollView>

        <View style={{ marginBottom: SPACE.sm }}>
          <IOSSegmentedControl
            segments={[
              { id: '1RM', label: `Est. 1RM (${uLabel})` },
              { id: 'Volume', label: `Total Volume (${uLabel})` },
            ]}
            activeId={selectedMetric}
            onSelect={(id) => {
              setSelectedIdx(null);
              setSelectedMetric(id as '1RM' | 'Volume');
            }}
            height={34}
          />
        </View>

        {svgPoints.length > 0 ? (
          <View style={styles.chartWrapper}>
            <AnimatedSvgLineChart
              points={svgPoints}
              width={chartWidth}
              height={168}
              strokeColor={tokens.accent.primary}
              interactiveScrub={true}
              selectedIndex={selectedIdx}
              onSelectIndex={setSelectedIdx}
              replayKey={`${replayKey}-${selectedLift}-${selectedMetric}`}
              gradientId="summary_90d_grad"
            />
          </View>
        ) : (
          <View style={styles.emptyChartBox}>
            <View style={styles.emptyIconBadge}>
              <Dumbbell size={18} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
            </View>
            <Text style={styles.emptyChartTitle}>No Lift History</Text>
            <Text style={styles.emptyChartText}>
              Log sets for {selectedLift} across multiple workouts to plot your 90-day strength curve.
            </Text>
          </View>
        )}
      </Animated.View>
    );
  }
);

export default WorkoutSummaryProgressionChart;
