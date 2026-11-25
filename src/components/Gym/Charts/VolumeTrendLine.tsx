/**
 * VolumeTrendLine.tsx — ZenTrack Mobile
 *
 * Animated SVG multi-line chart showing daily training volume for this week vs last week.
 * Draws left -> right via UI-thread strokeDashoffset with gradient reveal.
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withDelay,
  cancelAnimation,
} from 'react-native-reanimated';
import { FONT_FAMILY, RADIUS, SPACE, ThemeTokens } from '../../../theme/tokens';
import { iosEasing } from '../../../theme/motion';
import { useResponsiveMetrics } from '../../../theme/responsive';
import { useTheme } from '../../../contexts/ThemeContext';
import { NumericText } from '../../ui/NumericText';
import { AnimatedSvgPath } from '../../ui/AnimatedSvgCharts';
import { buildSvgLinePath, estimatePolylineLength } from './chartMath';
import { useWeightUnit, unitLabel } from '../../../utils/weightUnit';

interface VolumeTrendLineProps {
  /** Mon–Sun volumes for this week (index 0 = Monday) */
  thisWeek: number[];
  /** Mon–Sun volumes for last week */
  lastWeek: number[];
  height?: number;
  replayKey?: number | string;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildCoords(values: number[], width: number, height: number, maxVal: number, padX: number, padY: number) {
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const step = chartW / Math.max(values.length - 1, 1);

  return values.map((v, i) => ({
    x: padX + i * step,
    y: padY + chartH - (maxVal > 0 ? (v / maxVal) * chartH : 0),
  }));
}

function buildAreaPath(values: number[], width: number, height: number, maxVal: number, padX: number, padY: number): string {
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const step = chartW / Math.max(values.length - 1, 1);
  const baseY = padY + chartH;

  const lineParts = values.map((v, i) => {
    const x = padX + i * step;
    const y = padY + chartH - (maxVal > 0 ? (v / maxVal) * chartH : 0);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const lastX = padX + (values.length - 1) * step;
  return `${lineParts.join(' ')} L${lastX.toFixed(1)},${baseY.toFixed(1)} L${padX.toFixed(1)},${baseY.toFixed(1)} Z`;
}

export const VolumeTrendLine: React.FC<VolumeTrendLineProps> = React.memo(function VolumeTrendLine({
  thisWeek,
  lastWeek,
  height = 160,
  replayKey = 0,
}: VolumeTrendLineProps) {
  const { tokens, isDark } = useTheme();
  const unitIsLbs = useWeightUnit();
  const uLabel = unitLabel(unitIsLbs);
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { clampChartWidth } = useResponsiveMetrics();

  const svgWidth = clampChartWidth(64);
  const padX = 8;
  const padY = 12;

  const primaryColor = tokens.charts.primarySeries;
  const secondaryColor = tokens.charts.tertiarySeries;
  const gridColor = tokens.charts.gridLine;

  const safeThisWeek = useMemo(() => {
    const arr = [...(thisWeek || [])];
    while (arr.length < 7) arr.push(0);
    return arr.slice(0, 7);
  }, [thisWeek]);

  const safeLastWeek = useMemo(() => {
    const arr = [...(lastWeek || [])];
    while (arr.length < 7) arr.push(0);
    return arr.slice(0, 7);
  }, [lastWeek]);

  const maxVal = useMemo(
    () => Math.max(1, ...safeThisWeek, ...safeLastWeek),
    [safeThisWeek, safeLastWeek]
  );

  const thisCoords = useMemo(
    () => buildCoords(safeThisWeek, svgWidth, height, maxVal, padX, padY),
    [safeThisWeek, svgWidth, height, maxVal]
  );

  const thisLinePath = useMemo(
    () => buildSvgLinePath(safeThisWeek, svgWidth, height, maxVal, padX, padY),
    [safeThisWeek, svgWidth, height, maxVal]
  );
  const thisAreaPath = useMemo(
    () => buildAreaPath(safeThisWeek, svgWidth, height, maxVal, padX, padY),
    [safeThisWeek, svgWidth, height, maxVal]
  );
  const lastLinePath = useMemo(
    () => buildSvgLinePath(safeLastWeek, svgWidth, height, maxVal, padX, padY),
    [safeLastWeek, svgWidth, height, maxVal]
  );

  const thisLen = useMemo(() => Math.max(1, estimatePolylineLength(thisCoords)), [thisCoords]);

  const drawProgress = useSharedValue(0);
  const auraOpacity = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(drawProgress);
    cancelAnimation(auraOpacity);
    drawProgress.value = 0;
    auraOpacity.value = 0;

    drawProgress.value = withTiming(1, { duration: 640, easing: iosEasing.decel });
    auraOpacity.value = withDelay(
      140,
      withTiming(1, { duration: 480, easing: iosEasing.decel })
    );
  }, [replayKey, thisLinePath, drawProgress, auraOpacity]);

  const animatedLineProps = useAnimatedProps(() => ({
    strokeDashoffset: thisLen * (1 - drawProgress.value),
  }));

  const animatedAuraProps = useAnimatedProps(() => ({
    opacity: auraOpacity.value,
  }));

  const dotsLayerStyle = useAnimatedStyle(() => ({
    opacity: drawProgress.value > 0.65 ? (drawProgress.value - 0.65) / 0.35 : 0,
  }));

  const hasData = safeThisWeek.some((v) => v > 0) || safeLastWeek.some((v) => v > 0);

  if (!hasData) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.title}>VOLUME TREND</Text>
        <Text style={styles.empty}>No training data this week</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>VOLUME TREND</Text>
          <Text style={styles.subtitle}>This week vs last week ({uLabel})</Text>
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: primaryColor }]} />
            <Text style={styles.legendText}>This week</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: secondaryColor, opacity: 0.7 }]} />
            <Text style={styles.legendText}>Last week</Text>
          </View>
        </View>
      </View>

      {/* SVG Chart */}
      <View style={styles.svgWrap}>
        <Svg width="100%" height={height} viewBox={`0 0 ${svgWidth} ${height}`}>
          <Defs>
            <LinearGradient id="thisWeekGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={primaryColor} stopOpacity={isDark ? 0.28 : 0.2} />
              <Stop offset="1" stopColor={primaryColor} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>

          {[0.25, 0.5, 0.75, 1].map((f, i) => (
            <Line
              key={i}
              x1={padX}
              y1={padY + (height - padY * 2) * (1 - f)}
              x2={svgWidth - padX}
              y2={padY + (height - padY * 2) * (1 - f)}
              stroke={gridColor}
              strokeWidth="1"
            />
          ))}

          {lastWeek.some((v) => v > 0) && (
            <AnimatedSvgPath
              d={lastLinePath}
              fill="none"
              stroke={secondaryColor}
              strokeWidth="1.5"
              strokeOpacity={isDark ? 0.55 : 0.65}
              strokeDasharray="4,4"
              animatedProps={animatedAuraProps}
            />
          )}

          <AnimatedSvgPath d={thisAreaPath} fill="url(#thisWeekGrad)" animatedProps={animatedAuraProps} />
          <AnimatedSvgPath
            d={thisLinePath}
            fill="none"
            stroke={primaryColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${thisLen}, ${thisLen}`}
            animatedProps={animatedLineProps}
          />
        </Svg>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, dotsLayerStyle]}>
          <Svg width="100%" height={height} viewBox={`0 0 ${svgWidth} ${height}`}>
            {safeThisWeek.map((v, i) => {
              if (v === 0) return null;
              const pt = thisCoords[i];
              if (!pt) return null;
              return (
                <Circle
                  key={i}
                  cx={pt.x.toFixed(1)}
                  cy={pt.y.toFixed(1)}
                  r="3.5"
                  fill={primaryColor}
                  stroke={tokens.bg.surface}
                  strokeWidth="1.5"
                />
              );
            })}
          </Svg>
        </Animated.View>
      </View>

      {/* Day labels */}
      <View style={styles.dayLabels}>
        {DAY_LABELS.map((label, i) => {
          const vol = safeThisWeek[i] || 0;
          const isTrained = vol > 0;
          return (
            <View key={i} style={styles.dayLabelCol}>
              <Text style={[styles.dayLabel, isTrained && styles.dayLabelActive]}>
                {label}
              </Text>
              {isTrained && (
                <NumericText style={styles.dayVolLabel}>
                  {vol >= 1000 ? `${(vol / 1000).toFixed(1)}k` : `${vol}`}
                </NumericText>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
});

export default VolumeTrendLine;

const makeStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      backgroundColor: tokens.isDark ? '#0F1015' : tokens.bg.surface,
      borderRadius: RADIUS.card,
      padding: SPACE.lg,
      marginBottom: 10,
      borderWidth: tokens.border.hairlineWidth,
      borderColor: tokens.border.subtle,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: SPACE.md,
    },
    title: {
      fontSize: tokens.fontSize.xs,
      color: tokens.text.secondary,
      letterSpacing: 1.2,
      fontFamily: FONT_FAMILY.bold,
    },
    subtitle: {
      fontSize: tokens.fontSize.xs,
      color: tokens.text.secondary,
      fontFamily: FONT_FAMILY.regular,
      marginTop: 2,
    },
    legend: {
      gap: SPACE.xs + 2,
      alignItems: 'flex-end',
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.xs + 1,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: RADIUS.full,
    },
    legendText: {
      fontSize: 10,
      color: tokens.text.secondary,
      fontFamily: FONT_FAMILY.medium,
    },
    svgWrap: {
      alignItems: 'center',
      marginVertical: SPACE.xs,
    },
    dayLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: SPACE.xs + 2,
      paddingHorizontal: 2,
    },
    dayLabelCol: {
      alignItems: 'center',
      minWidth: 32,
    },
    dayLabel: {
      fontSize: 10,
      color: tokens.text.muted,
      fontFamily: FONT_FAMILY.medium,
    },
    dayLabelActive: {
      color: tokens.text.primary,
      fontFamily: FONT_FAMILY.bold,
    },
    dayVolLabel: {
      fontSize: 9,
      color: tokens.accent.primary,
      fontFamily: FONT_FAMILY.semibold,
      marginTop: 2,
    },
    empty: {
      color: tokens.text.muted,
      fontSize: 13,
      marginTop: 24,
      textAlign: 'center',
    },
  });
