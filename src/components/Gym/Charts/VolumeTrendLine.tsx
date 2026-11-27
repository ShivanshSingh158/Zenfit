/**
 * VolumeTrendLine.tsx — ZenTrack Mobile
 *
 * Upgraded animated SVG Load & Sets Trend Chart:
 * - Supports 7-day weekly vectors (`thisWeek`/`lastWeek`) OR arbitrary multi-bucket series (`buckets`).
 * - Mode toggle: [ Vol | Sets | Bars ]
 * - Finger-scrubbing via Gesture.Pan() + live scrub callout tooltip.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Line, Circle, Rect, Text as SvgText } from 'react-native-svg';
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
import { FONT_FAMILY, RADIUS, SPACE, ThemeTokens } from '../../../theme/tokens';
import { iosEasing } from '../../../theme/motion';
import { useResponsiveMetrics } from '../../../theme/responsive';
import { useTheme } from '../../../contexts/ThemeContext';
import { NumericText } from '../../ui/NumericText';
import { AnimatedSvgPath } from '../../ui/AnimatedSvgCharts';
import { buildSmoothBezierCurve, estimatePolylineLength } from './chartMath';
import { useWeightUnit, unitLabel, formatVolumeParts } from '../../../utils/weightUnit';
import { PeriodTrendBucket } from '../../../services/gymAnalyticsEngine';
import { hapticLight, hapticSelection } from '../../../utils/haptics';

type TrendViewMode = 'vol' | 'sets' | 'bars';

interface VolumeTrendLineProps {
  /** Mon–Sun volumes for this week (index 0 = Monday) */
  thisWeek?: number[];
  /** Mon–Sun volumes for last week */
  lastWeek?: number[];
  /** Multi-period bucket series when viewing >7d or custom ranges */
  buckets?: PeriodTrendBucket[];
  compareLabel?: string;
  height?: number;
  replayKey?: number | string;
}

const DEFAULT_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildSmoothCoords(
  values: number[],
  width: number,
  height: number,
  maxVal: number,
  padX: number,
  padY: number
) {
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const step = values.length > 1 ? chartW / (values.length - 1) : 0;

  return values.map((v, i) => ({
    x: values.length === 1 ? width / 2 : padX + i * step,
    y: padY + chartH - (maxVal > 0 ? (v / maxVal) * chartH : 0),
  }));
}

export const VolumeTrendLine: React.FC<VolumeTrendLineProps> = React.memo(function VolumeTrendLine({
  thisWeek = [],
  lastWeek = [],
  buckets,
  compareLabel = 'Last week',
  height = 148,
  replayKey = 0,
}: VolumeTrendLineProps) {
  const { tokens, isDark } = useTheme();
  const unitIsLbs = useWeightUnit();
  const uLabel = unitLabel(unitIsLbs);
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { clampChartWidth } = useResponsiveMetrics();

  const [viewMode, setViewMode] = useState<TrendViewMode>('vol');
  const [scrubIdx, setScrubIdx] = useState<number | null>(null);
  const lastScrubIdxRef = useRef<number>(-1);

  const svgWidth = clampChartWidth(64);
  const padX = 10;
  const padY = 12;

  const primaryColor = tokens.charts.primarySeries;
  const secondaryColor = tokens.charts.tertiarySeries;
  const gridColor = tokens.charts.gridLine;

  const normalizedBuckets = useMemo<PeriodTrendBucket[]>(() => {
    if (buckets && buckets.length > 0) return buckets;
    return DEFAULT_DAY_LABELS.map((lbl, idx) => ({
      label: lbl,
      fullLabel: lbl,
      startDate: '',
      endDate: '',
      volumeKg: thisWeek[idx] || 0,
      prevVolumeKg: lastWeek[idx] || 0,
      setsCount: 0,
      prevSetsCount: 0,
    }));
  }, [buckets, thisWeek, lastWeek]);

  const hasSetsData = useMemo(
    () => normalizedBuckets.some(b => b.setsCount > 0 || b.prevSetsCount > 0),
    [normalizedBuckets]
  );

  useEffect(() => {
    if (viewMode === 'sets' && !hasSetsData) {
      setViewMode('vol');
    }
  }, [viewMode, hasSetsData]);

  useEffect(() => {
    setScrubIdx(null);
    lastScrubIdxRef.current = -1;
  }, [replayKey, normalizedBuckets.length]);

  const activeSeries = useMemo(
    () =>
      normalizedBuckets.map(b =>
        viewMode === 'sets'
          ? { cur: b.setsCount, prev: b.prevSetsCount }
          : { cur: b.volumeKg, prev: b.prevVolumeKg }
      ),
    [normalizedBuckets, viewMode]
  );

  const curValues = useMemo(() => activeSeries.map(s => s.cur), [activeSeries]);
  const prevValues = useMemo(() => activeSeries.map(s => s.prev), [activeSeries]);

  const maxVal = useMemo(
    () => Math.max(1, ...curValues, ...prevValues),
    [curValues, prevValues]
  );

  const curCoords = useMemo(
    () => buildSmoothCoords(curValues, svgWidth, height, maxVal, padX, padY),
    [curValues, svgWidth, height, maxVal]
  );
  const prevCoords = useMemo(
    () => buildSmoothCoords(prevValues, svgWidth, height, maxVal, padX, padY),
    [prevValues, svgWidth, height, maxVal]
  );

  const curCurves = useMemo(
    () => buildSmoothBezierCurve(curCoords, height - padY),
    [curCoords, height]
  );
  const prevCurves = useMemo(
    () => buildSmoothBezierCurve(prevCoords, height - padY),
    [prevCoords, height]
  );

  const thisLen = useMemo(() => Math.max(1, curCurves.pathLength || estimatePolylineLength(curCoords)), [curCurves.pathLength, curCoords]);

  const drawProgress = useSharedValue(1);
  const auraOpacity = useSharedValue(1);
  const prevReplayRef = useRef<number | string | null>(null);
  const scrubActive = useSharedValue(0);
  const scrubX = useSharedValue(0);
  const scrubY = useSharedValue(0);

  useEffect(() => {
    if (prevReplayRef.current === replayKey) return;
    const isInitial = prevReplayRef.current === null;
    prevReplayRef.current = replayKey;

    cancelAnimation(drawProgress);
    cancelAnimation(auraOpacity);
    if (isInitial) {
      drawProgress.value = 0;
      auraOpacity.value = 0;
      drawProgress.value = withTiming(1, { duration: 360, easing: iosEasing.decel });
      auraOpacity.value = withDelay(
        80,
        withTiming(1, { duration: 280, easing: iosEasing.decel })
      );
    } else {
      drawProgress.value = 1;
      auraOpacity.value = 1;
    }
  }, [replayKey, drawProgress, auraOpacity]);

  useEffect(() => {
    if (scrubIdx != null && curCoords[scrubIdx]) {
      scrubX.value = curCoords[scrubIdx].x;
      scrubY.value = curCoords[scrubIdx].y;
      scrubActive.value = 1;
    } else {
      scrubActive.value = 0;
    }
  }, [scrubIdx, curCoords, scrubActive, scrubX, scrubY]);

  const animatedLineProps = useAnimatedProps(() => ({
    strokeDashoffset: thisLen * (1 - drawProgress.value),
  }));

  const animatedAuraProps = useAnimatedProps(() => ({
    opacity: auraOpacity.value,
  }));

  const dotsLayerStyle = useAnimatedStyle(() => ({
    opacity: drawProgress.value > 0.6 ? (drawProgress.value - 0.6) / 0.4 : 0,
  }));

  const crosshairStyle = useAnimatedStyle(() => ({
    opacity: scrubActive.value,
    transform: [{ translateX: scrubX.value }],
  }));

  const crosshairDotStyle = useAnimatedStyle(() => ({
    opacity: scrubActive.value,
    transform: [{ translateX: scrubX.value - 5.5 }, { translateY: scrubY.value - 5.5 }] as const,
  }));

  const handlePickScrub = (idx: number) => {
    if (lastScrubIdxRef.current !== idx) {
      lastScrubIdxRef.current = idx;
      hapticSelection();
      setScrubIdx(idx);
    }
  };

  const panGesture = useMemo(() => {
    if (curCoords.length <= 1 || viewMode === 'bars') return Gesture.Manual();
    const firstX = curCoords[0].x;
    const lastX = curCoords[curCoords.length - 1].x;
    const spanX = Math.max(1, lastX - firstX);

    return Gesture.Pan()
      .activeOffsetX([-14, 14])
      .failOffsetY([-6, 6])
      .onStart(e => {
        scrubActive.value = 1;
        const norm = Math.max(0, Math.min(1, (e.x - firstX) / spanX));
        const nearest = Math.round(norm * (curCoords.length - 1));
        const pt = curCoords[nearest];
        if (pt) {
          scrubX.value = pt.x;
          scrubY.value = pt.y;
          runOnJS(handlePickScrub)(nearest);
        }
      })
      .onUpdate(e => {
        const norm = Math.max(0, Math.min(1, (e.x - firstX) / spanX));
        const nearest = Math.round(norm * (curCoords.length - 1));
        const pt = curCoords[nearest];
        if (pt) {
          scrubX.value = pt.x;
          scrubY.value = pt.y;
          runOnJS(handlePickScrub)(nearest);
        }
      })
      .onFinalize(() => {
        lastScrubIdxRef.current = -1;
      });
  }, [curCoords, viewMode, scrubActive, scrubX, scrubY]);

  const hasData = curValues.some(v => v > 0) || prevValues.some(v => v > 0);
  const labelIndices = useMemo(() => {
    const n = normalizedBuckets.length;
    if (n <= 7) return normalizedBuckets.map((_, i) => i);
    const step = Math.ceil(n / 6);
    const idxs: number[] = [];
    for (let i = 0; i < n; i += step) idxs.push(i);
    if (idxs[idxs.length - 1] !== n - 1) idxs.push(n - 1);
    return idxs;
  }, [normalizedBuckets]);

  if (!hasData) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>LOAD TREND</Text>
        <Text style={styles.empty}>No training data in this range</Text>
      </View>
    );
  }

  const activeBucket = scrubIdx != null ? normalizedBuckets[scrubIdx] : null;
  const activePoint = scrubIdx != null ? activeSeries[scrubIdx] : null;
  const activeDeltaPct =
    activePoint && activePoint.prev > 0
      ? Math.round(((activePoint.cur - activePoint.prev) / activePoint.prev) * 100)
      : null;

  return (
    <View style={styles.container}>
      {/* Header + Mode Switcher */}
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.title}>LOAD & STIMULUS TREND</Text>
          <Text style={styles.subtitle}>
            {viewMode === 'sets' ? 'Working sets' : `Volume (${uLabel})`} vs {compareLabel.toLowerCase()}
          </Text>
        </View>

        <View style={styles.modeTrack}>
          {([
            { id: 'vol' as const, label: 'Vol' },
            ...(hasSetsData ? [{ id: 'sets' as const, label: 'Sets' }] : []),
            { id: 'bars' as const, label: 'Bars' },
          ]).map(m => {
            const active = viewMode === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => {
                  hapticSelection();
                  setViewMode(m.id);
                  setScrubIdx(null);
                }}
                style={[styles.modePill, active && styles.modePillActive]}
              >
                <Text style={[styles.modeText, active && styles.modeTextActive]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Scrub Readout Bar */}
      {activeBucket && activePoint ? (
        <View style={styles.scrubReadout}>
          <NumericText style={styles.scrubText} numberOfLines={1}>
            {activeBucket.fullLabel}:{' '}
            <Text style={{ fontFamily: FONT_FAMILY.bold, color: tokens.text.primary }}>
              {viewMode === 'sets'
                ? `${activePoint.cur} sets`
                : formatVolumeParts(activePoint.cur, unitIsLbs).full}
            </Text>
            {activePoint.prev > 0
              ? ` · Prior ${
                  viewMode === 'sets'
                    ? `${activePoint.prev}`
                    : formatVolumeParts(activePoint.prev, unitIsLbs).full
                }`
              : ''}
            {activeDeltaPct !== null ? ` (${activeDeltaPct >= 0 ? '+' : ''}${activeDeltaPct}%)` : ''}
          </NumericText>
        </View>
      ) : (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: primaryColor }]} />
            <Text style={styles.legendText}>Current</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: secondaryColor, opacity: 0.7 }]} />
            <Text style={styles.legendText}>{compareLabel}</Text>
          </View>
          {viewMode !== 'bars' && (
            <Text style={styles.scrubHint}>Slide finger to inspect</Text>
          )}
        </View>
      )}

      {/* SVG Chart Area */}
      <View style={styles.svgWrap}>
        {viewMode === 'bars' ? (
          <Svg width="100%" height={height} viewBox={`0 0 ${svgWidth} ${height}`}>
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
            {(() => {
              const n = normalizedBuckets.length;
              const chartW = svgWidth - padX * 2;
              const chartH = height - padY * 2;
              const groupW = chartW / Math.max(1, n);
              const singleW = Math.max(4, Math.min(14, Math.floor(groupW * 0.34)));

              return normalizedBuckets.map((b, i) => {
                const curV = activeSeries[i]?.cur || 0;
                const prevV = activeSeries[i]?.prev || 0;
                const curH = curV > 0 ? Math.max(4, (curV / maxVal) * chartH) : 2;
                const prevH = prevV > 0 ? Math.max(3, (prevV / maxVal) * chartH) : 0;
                const centerX = padX + i * groupW + groupW / 2;
                const isSel = scrubIdx === i;

                return (
                  <React.Fragment key={i}>
                    {prevH > 0 && (
                      <Rect
                        x={centerX - singleW - 1.5}
                        y={padY + chartH - prevH}
                        width={singleW}
                        height={prevH}
                        rx={3}
                        fill={secondaryColor}
                        opacity={0.35}
                      />
                    )}
                    <Rect
                      x={prevH > 0 ? centerX + 1.5 : centerX - singleW / 2}
                      y={padY + chartH - curH}
                      width={singleW}
                      height={curH}
                      rx={3}
                      fill={curV > 0 ? primaryColor : tokens.bg.elevated}
                      opacity={isSel || scrubIdx == null ? 1 : 0.45}
                      onPress={() => {
                        hapticLight();
                        setScrubIdx(prev => (prev === i ? null : i));
                      }}
                    />
                  </React.Fragment>
                );
              });
            })()}
          </Svg>
        ) : (
          <GestureDetector gesture={panGesture}>
            <View style={{ width: '100%', height, position: 'relative' }}>
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

                {prevValues.some(v => v > 0) && prevCurves.linePath ? (
                  <AnimatedSvgPath
                    d={prevCurves.linePath}
                    fill="none"
                    stroke={secondaryColor}
                    strokeWidth="1.5"
                    strokeOpacity={isDark ? 0.55 : 0.65}
                    strokeDasharray="4,4"
                    animatedProps={animatedAuraProps}
                  />
                ) : null}

                {curCurves.areaPath ? (
                  <AnimatedSvgPath
                    d={curCurves.areaPath}
                    fill="url(#thisWeekGrad)"
                    animatedProps={animatedAuraProps}
                  />
                ) : null}

                {curCurves.linePath ? (
                  <AnimatedSvgPath
                    d={curCurves.linePath}
                    fill="none"
                    stroke={primaryColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={`${thisLen}, ${thisLen}`}
                    animatedProps={animatedLineProps}
                  />
                ) : null}
              </Svg>

              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, dotsLayerStyle]}>
                <Svg width="100%" height={height} viewBox={`0 0 ${svgWidth} ${height}`}>
                  {curValues.map((v, i) => {
                    if (v === 0) return null;
                    const pt = curCoords[i];
                    if (!pt) return null;
                    const isSel = scrubIdx === i;
                    return (
                      <Circle
                        key={i}
                        cx={pt.x.toFixed(1)}
                        cy={pt.y.toFixed(1)}
                        r={isSel ? '5' : '3.2'}
                        fill={isSel ? tokens.text.primary : primaryColor}
                        stroke={tokens.bg.surface}
                        strokeWidth="1.5"
                      />
                    );
                  })}
                </Svg>
              </Animated.View>

              <Animated.View
                pointerEvents="none"
                style={[
                  styles.crosshairLine,
                  {
                    top: padY,
                    height: Math.max(20, height - padY * 2),
                    backgroundColor: tokens.border.focus,
                  },
                  crosshairStyle,
                ]}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.crosshairDot,
                  {
                    backgroundColor: primaryColor,
                    borderColor: tokens.bg.surface,
                  },
                  crosshairDotStyle,
                ]}
              />
            </View>
          </GestureDetector>
        )}
      </View>

      {/* X Labels */}
      <View style={styles.dayLabels}>
        {labelIndices.map(i => {
          const b = normalizedBuckets[i];
          const val = activeSeries[i]?.cur || 0;
          const isTrained = val > 0;
          const isSel = scrubIdx === i;
          return (
            <Pressable
              key={i}
              onPress={() => {
                hapticLight();
                setScrubIdx(prev => (prev === i ? null : i));
              }}
              style={styles.dayLabelCol}
            >
              <Text
                style={[
                  styles.dayLabel,
                  isTrained && styles.dayLabelActive,
                  isSel && { color: tokens.accent.primary },
                ]}
              >
                {b.label}
              </Text>
              {normalizedBuckets.length <= 7 && isTrained && (
                <NumericText style={styles.dayVolLabel}>
                  {viewMode === 'sets'
                    ? `${val}s`
                    : val >= 1000
                    ? `${(val / 1000).toFixed(1)}k`
                    : `${val}`}
                </NumericText>
              )}
            </Pressable>
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
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACE.sm,
    },
    title: {
      fontSize: 11,
      color: tokens.text.secondary,
      letterSpacing: 0.7,
      fontFamily: FONT_FAMILY.bold,
    },
    subtitle: {
      fontSize: 11.5,
      color: tokens.text.muted,
      fontFamily: FONT_FAMILY.medium,
      marginTop: 2,
    },
    modeTrack: {
      flexDirection: 'row',
      backgroundColor: tokens.bg.elevated,
      padding: 2,
      borderRadius: RADIUS.sm,
      gap: 2,
    },
    modePill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    modePillActive: {
      backgroundColor: tokens.bg.surface,
    },
    modeText: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.semibold,
      color: tokens.text.muted,
    },
    modeTextActive: {
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.primary,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: SPACE.xs,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    legendDot: {
      width: 7,
      height: 7,
      borderRadius: RADIUS.full,
    },
    legendText: {
      fontSize: 10.5,
      color: tokens.text.secondary,
      fontFamily: FONT_FAMILY.medium,
    },
    scrubHint: {
      marginLeft: 'auto',
      fontSize: 10,
      color: tokens.text.muted,
      fontFamily: FONT_FAMILY.medium,
    },
    scrubReadout: {
      backgroundColor: tokens.bg.elevated,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: RADIUS.sm,
      marginBottom: SPACE.xs,
    },
    scrubText: {
      fontSize: 11.5,
      color: tokens.text.secondary,
      fontFamily: FONT_FAMILY.medium,
    },
    svgWrap: {
      alignItems: 'center',
      marginVertical: SPACE.xs,
    },
    crosshairLine: {
      position: 'absolute',
      left: 0,
      width: 1.2,
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
    dayLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: SPACE.xs + 2,
      paddingHorizontal: 2,
    },
    dayLabelCol: {
      alignItems: 'center',
      minWidth: 30,
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
      marginTop: 18,
      textAlign: 'center',
    },
  });
