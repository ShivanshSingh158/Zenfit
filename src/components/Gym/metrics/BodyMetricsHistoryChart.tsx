import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, LayoutChangeEvent, StyleSheet } from 'react-native';
import Svg, {
  Polyline,
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withDelay,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { formatDateShort } from '../../../utils/dateUtils';
import { FONT_FAMILY } from '../../../theme/tokens';
import { useResponsiveMetrics } from '../../../theme/responsive';
import { iosEasing } from '../../../theme/motion';
import { useTheme } from '../../../contexts/ThemeContext';
import { hapticSelection } from '../../../utils/haptics';
import { NumericText } from '../../ui';
import { RollingNumber } from '../../ui/RollingNumber';
import { AnimatedSvgPath, AnimatedSvgCircle } from '../../ui/AnimatedSvgCharts';
import { buildSmoothBezierCurve } from '../Charts/chartMath';
import { useWeightUnit, kgToDisplay, unitLabel } from '../../../utils/weightUnit';

export interface WeightChartEntry {
  weight: number;
  date: string;
}

export interface BodyMetricsHistoryChartProps {
  entries: WeightChartEntry[];
  styles: any;
  colors: any;
  isDark: boolean;
  replayKey?: number | string;
}

export const BodyMetricsHistoryChart: React.FC<BodyMetricsHistoryChartProps> = React.memo(
  ({ entries, styles, replayKey = 0 }) => {
    const { tokens } = useTheme();
    const unitIsLbs = useWeightUnit();
    const uLabel = unitLabel(unitIsLbs);
    const { clampChartWidth } = useResponsiveMetrics();
    const [containerWidth, setContainerWidth] = useState(0);
    const [scrubIdx, setScrubIdx] = useState<number | null>(null);
    const CHART_W = containerWidth > 0 ? containerWidth : clampChartWidth(44);
    const CHART_H = 114;

    const chartData = useMemo(() => {
      const validEntries = (entries || []).filter(
        (l) => Number.isFinite(l.weight) && l.weight > 0
      );
      if (validEntries.length < 2) return null;

      const ewmaWeights: number[] = [];
      let prevEwma = validEntries[0].weight;
      for (let i = 0; i < validEntries.length; i++) {
        const w = validEntries[i].weight;
        prevEwma = i === 0 ? w : 0.25 * w + 0.75 * prevEwma;
        ewmaWeights.push(prevEwma);
      }

      const rawWeights = validEntries.map((l) => l.weight);
      const allWeights = [...rawWeights, ...ewmaWeights];
      const minW = Math.min(...allWeights) - 0.5;
      const maxW = Math.max(...allWeights) + 0.5;
      const range = maxW - minW || 1;

      const points = validEntries.map((entry, i) => {
        const x = 20 + (i / (validEntries.length - 1)) * (CHART_W - 40);
        const yRaw = CHART_H - (((entry.weight - minW) / range) * (CHART_H - 28) + 14);
        const yTrend = CHART_H - (((ewmaWeights[i] - minW) / range) * (CHART_H - 28) + 14);
        return {
          x,
          yRaw,
          yTrend,
          rawWeight: entry.weight,
          trendWeight: ewmaWeights[i],
          date: entry.date,
        };
      });

      const rawPolyline = points.map((p) => `${p.x},${p.yRaw}`).join(' ');
      const trendCoords = points.map((p) => ({ x: p.x, y: p.yTrend }));
      const { linePath: trendPath, areaPath: trendAreaPath, pathLength: trendLen } =
        buildSmoothBezierCurve(trendCoords, CHART_H);

      const latestRaw = rawWeights[rawWeights.length - 1];
      const latestTrend = ewmaWeights[ewmaWeights.length - 1];
      const diff = latestTrend - latestRaw;

      return {
        points,
        rawPolyline,
        trendPath,
        trendAreaPath,
        trendLen: Math.max(1, trendLen),
        latestRaw,
        latestTrend,
        diff,
      };
    }, [entries, CHART_W]);

    const drawProgress = useSharedValue(0);
    const areaOpacity = useSharedValue(0);
    const scrubActive = useSharedValue(0);
    const scrubX = useSharedValue(0);
    const scrubY = useSharedValue(0);
    const lastScrubIdxRef = useRef<number>(-1);

    useEffect(() => {
      if (!chartData) return;
      cancelAnimation(drawProgress);
      cancelAnimation(areaOpacity);
      drawProgress.value = 0;
      areaOpacity.value = 0;
      setScrubIdx(null);

      drawProgress.value = withTiming(1, { duration: 640, easing: iosEasing.decel });
      areaOpacity.value = withDelay(
        140,
        withTiming(1, { duration: 460, easing: iosEasing.decel })
      );
    }, [replayKey, chartData?.trendPath, drawProgress, areaOpacity]);

    const handleScrubIdx = (idx: number | null) => {
      if (idx === null) {
        lastScrubIdxRef.current = -1;
        setScrubIdx(null);
        return;
      }
      if (lastScrubIdxRef.current !== idx) {
        lastScrubIdxRef.current = idx;
        hapticSelection();
        setScrubIdx(idx);
      }
    };

    const panGesture = useMemo(() => {
      if (!chartData || chartData.points.length < 2) return Gesture.Manual();
      const pts = chartData.points;
      const firstX = pts[0].x;
      const lastX = pts[pts.length - 1].x;
      const spanX = Math.max(1, lastX - firstX);

      return Gesture.Pan()
        .activeOffsetX([-6, 6])
        .failOffsetY([-10, 10])
        .onBegin((e) => {
          scrubActive.value = 1;
          const norm = Math.max(0, Math.min(1, (e.x - firstX) / spanX));
          const idx = Math.round(norm * (pts.length - 1));
          const pt = pts[idx];
          if (pt) {
            scrubX.value = pt.x;
            scrubY.value = pt.yTrend;
            runOnJS(handleScrubIdx)(idx);
          }
        })
        .onUpdate((e) => {
          const norm = Math.max(0, Math.min(1, (e.x - firstX) / spanX));
          const idx = Math.round(norm * (pts.length - 1));
          const pt = pts[idx];
          if (pt) {
            scrubX.value = pt.x;
            scrubY.value = pt.yTrend;
            runOnJS(handleScrubIdx)(idx);
          }
        })
        .onFinalize(() => {
          scrubActive.value = 0;
          runOnJS(handleScrubIdx)(null);
        });
    }, [chartData, scrubActive, scrubX, scrubY]);

    const animatedTrendProps = useAnimatedProps(() => ({
      strokeDashoffset: (chartData?.trendLen ?? 1) * (1 - drawProgress.value),
    }));

    const animatedAreaProps = useAnimatedProps(() => ({
      opacity: areaOpacity.value,
    }));

    const animatedEndProps = useAnimatedProps(() => ({
      opacity: drawProgress.value > 0.7 ? (drawProgress.value - 0.7) / 0.3 : 0,
    }));

    const crosshairStyle = useAnimatedStyle(() => ({
      opacity: scrubActive.value,
      transform: [{ translateX: scrubX.value }],
    }));

    const crosshairDotStyle = useAnimatedStyle(() => ({
      opacity: scrubActive.value,
      transform: [
        { translateX: scrubX.value - 5.5 },
        { translateY: scrubY.value - 5.5 },
      ] as const,
    }));

    if (!chartData || chartData.points.length < 2) return null;

    const { points, rawPolyline, trendPath, trendAreaPath, trendLen, latestRaw, latestTrend, diff } =
      chartData;
    const lastPoint = points[points.length - 1];
    const inspectedPt = scrubIdx != null && points[scrubIdx] ? points[scrubIdx] : null;
    const displayRaw = inspectedPt ? inspectedPt.rawWeight : latestRaw;
    const displayTrend = inspectedPt ? inspectedPt.trendWeight : latestTrend;
    const shownRaw = kgToDisplay(displayRaw, unitIsLbs);
    const shownTrend = kgToDisplay(displayTrend, unitIsLbs);
    const shownDiff = shownTrend - shownRaw;

    const handleLayout = (e: LayoutChangeEvent) => {
      const w = Math.round(e.nativeEvent.layout.width);
      if (w > 50 && Math.abs(w - containerWidth) > 2) {
        setContainerWidth(w);
      }
    };

    const trendColor = tokens.charts.primarySeries;
    const rawColor = tokens.text.secondary;

    return (
      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>
              {inspectedPt ? formatDateShort(inspectedPt.date) : 'Weight Trend'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Text style={{ fontSize: 11, fontFamily: FONT_FAMILY.medium, color: trendColor }}>
                7D Trend:{' '}
              </Text>
              <NumericText style={{ fontSize: 11, fontFamily: FONT_FAMILY.bold, color: trendColor }}>
                {shownTrend.toFixed(1)} {uLabel}
              </NumericText>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <RollingNumber
              value={shownRaw.toFixed(1)}
              suffix={` ${uLabel}`}
              replayKey={replayKey}
              cycles={1}
              durationMs={520}
              style={styles.badgeText}
            />
            <NumericText
              style={{
                fontSize: 10,
                fontFamily: FONT_FAMILY.regular,
                color: tokens.text.secondary,
                marginTop: 1,
              }}
            >
              {Math.abs(shownDiff) < 0.05
                ? 'On trend'
                : `${shownDiff > 0 ? '+' : ''}${shownDiff.toFixed(1)} ${uLabel} trend diff`}
            </NumericText>
          </View>
        </View>

        <GestureDetector gesture={panGesture}>
          <View style={[styles.chartContainer, { position: 'relative' }]} onLayout={handleLayout}>
            <Svg width={CHART_W} height={CHART_H}>
              <Defs>
                <LinearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={trendColor} stopOpacity="0.22" />
                  <Stop offset="1" stopColor={trendColor} stopOpacity="0.0" />
                </LinearGradient>
              </Defs>

              <AnimatedSvgPath d={trendAreaPath} fill="url(#trendGrad)" animatedProps={animatedAreaProps} />

              {[0.25, 0.5, 0.75].map((f) => (
                <Line
                  key={f}
                  x1={0}
                  y1={CHART_H * (1 - f)}
                  x2={CHART_W}
                  y2={CHART_H * (1 - f)}
                  stroke={tokens.charts.gridLine}
                  strokeWidth={0.8}
                />
              ))}

              <Polyline
                points={rawPolyline}
                fill="none"
                stroke={rawColor}
                strokeWidth={1.5}
                strokeDasharray="3, 3"
              />

              <AnimatedSvgPath
                d={trendPath}
                fill="none"
                stroke={trendColor}
                strokeWidth={2.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={`${trendLen}, ${trendLen}`}
                animatedProps={animatedTrendProps}
              />

              {points.map((p, i) => (
                <Circle key={`raw-pt-${i}`} cx={p.x} cy={p.yRaw} r={2} fill={rawColor} />
              ))}

              <AnimatedSvgCircle
                cx={lastPoint.x}
                cy={lastPoint.yRaw}
                r={3}
                fill={tokens.text.primary}
                animatedProps={animatedEndProps}
              />
              <AnimatedSvgCircle
                cx={lastPoint.x}
                cy={lastPoint.yTrend}
                r={4.5}
                fill={tokens.bg.surface}
                stroke={trendColor}
                strokeWidth={2.5}
                animatedProps={animatedEndProps}
              />

              <SvgText
                x={Math.min(CHART_W - 6, Math.max(34, lastPoint.x))}
                y={Math.max(12, lastPoint.yTrend - 8)}
                fontSize={10}
                fill={trendColor}
                textAnchor="end"
                fontFamily={FONT_FAMILY.bold}
              >
                {kgToDisplay(lastPoint.trendWeight, unitIsLbs).toFixed(1)}{uLabel}
              </SvgText>
            </Svg>

            <Animated.View
              pointerEvents="none"
              style={[
                localStyles.crosshairLine,
                { backgroundColor: tokens.border.focus },
                crosshairStyle,
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                localStyles.crosshairDot,
                { backgroundColor: trendColor, borderColor: tokens.bg.surface },
                crosshairDotStyle,
              ]}
            />
          </View>
        </GestureDetector>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            marginTop: 8,
            marginBottom: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 14, height: 1.5, backgroundColor: rawColor }} />
            <Text style={{ fontSize: 10, fontFamily: FONT_FAMILY.regular, color: tokens.text.secondary }}>
              Daily Log
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 14, height: 2.5, backgroundColor: trendColor, borderRadius: 1 }} />
            <Text style={{ fontSize: 10, fontFamily: FONT_FAMILY.medium, color: trendColor }}>
              7D EWMA Trend
            </Text>
          </View>
        </View>

        <NumericText style={[styles.metricLabel, { textAlign: 'center', marginTop: 2, fontSize: 11 }]}>
          {entries.length} entries recorded ({formatDateShort(entries[0]?.date ?? '')} →{' '}
          {formatDateShort(entries[entries.length - 1]?.date ?? '')})
        </NumericText>
      </View>
    );
  }
);

const localStyles = StyleSheet.create({
  crosshairLine: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 1.5,
  },
  crosshairDot: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 2,
  },
});

export default BodyMetricsHistoryChart;
