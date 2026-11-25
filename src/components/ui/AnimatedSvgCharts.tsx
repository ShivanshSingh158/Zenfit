import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Circle,
  Rect,
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
import { useTheme } from '../../contexts/ThemeContext';
import { iosEasing } from '../../theme/motion';
import { hapticSelection, hapticLight } from '../../utils/haptics';
import { buildSmoothBezierCurve } from '../Gym/Charts/chartMath';
import { FONT_FAMILY } from '../../theme/tokens';

export const AnimatedSvgPath = Animated.createAnimatedComponent(Path);
export const AnimatedSvgCircle = Animated.createAnimatedComponent(Circle);
export const AnimatedSvgRect = Animated.createAnimatedComponent(Rect);

export interface ChartDataPoint {
  xLabel?: string;
  value: number;
  meta?: any;
}

export interface AnimatedSvgLineChartProps {
  points: ChartDataPoint[];
  width: number;
  height?: number;
  padX?: number;
  padY?: number;
  strokeColor?: string;
  gradientTopOpacity?: number;
  showDots?: boolean;
  showXLabels?: boolean;
  showGridLines?: boolean;
  interactiveScrub?: boolean;
  selectedIndex?: number | null;
  onSelectIndex?: (index: number | null) => void;
  replayKey?: number | string;
  durationMs?: number;
  gradientId?: string;
}

/**
 * AnimatedSvgLineChart — Reusable 120fps SVG Bezier chart with stroke-dashoffset draw-in,
 * area glow fade, and native Gesture.Pan() interactive scrubbing crosshair.
 */
export const AnimatedSvgLineChart: React.FC<AnimatedSvgLineChartProps> = React.memo(
  function AnimatedSvgLineChart({
    points,
    width,
    height = 156,
    padX = 16,
    padY = 16,
    strokeColor,
    gradientTopOpacity = 0.24,
    showDots = true,
    showXLabels = true,
    showGridLines = true,
    interactiveScrub = true,
    selectedIndex,
    onSelectIndex,
    replayKey = 0,
    durationMs = 650,
    gradientId,
  }) {
    const { tokens } = useTheme();
    const generatedId = React.useId();
    const resolvedGradId = gradientId || `zenfit_svg_line_grad_${generatedId.replace(/:/g, '')}`;
    const resolvedStroke = strokeColor ?? tokens.accent.primary;
    const labelReserve = showXLabels ? 20 : 4;
    const plotH = Math.max(48, height - labelReserve);
    const plotW = Math.max(40, width - padX * 2);

    const { coords, linePath, areaPath, pathLength, xTicks } = useMemo(() => {
      if (!points || points.length === 0) {
        return {
          coords: [] as Array<{ x: number; y: number; value: number; xLabel?: string }>,
          linePath: '',
          areaPath: '',
          pathLength: 0,
          xTicks: [] as number[],
        };
      }
      const vals = points.map((p) => p.value);
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      const span = maxV - minV;
      let effMin: number;
      let effMax: number;
      if (span === 0) {
        effMin = minV < 0 ? minV * 1.15 : minV * 0.85;
        effMax = maxV < 0 ? maxV * 0.85 : (maxV * 1.15 || 1);
      } else {
        effMin = minV - span * 0.12;
        effMax = maxV + span * 0.12;
      }
      if (effMin >= effMax) {
        effMax = effMin + 1;
      }
      const range = Math.max(1, effMax - effMin);

      const innerH = Math.max(20, plotH - padY * 2);
      const stepX = points.length > 1 ? plotW / (points.length - 1) : 0;

      const mapped = points.map((p, idx) => {
        const x = points.length === 1 ? width / 2 : padX + idx * stepX;
        const norm = (p.value - effMin) / range;
        const y = padY + innerH * (1 - norm);
        return { x, y, value: p.value, xLabel: p.xLabel };
      });

      const built = buildSmoothBezierCurve(mapped, plotH - 4);
      const stepLabel = Math.max(1, Math.floor(points.length / 4));
      const ticks: number[] = [];
      points.forEach((_, idx) => {
        if (idx === 0 || idx === points.length - 1 || idx % stepLabel === 0) {
          ticks.push(idx);
        }
      });

      return {
        coords: mapped,
        linePath: built.linePath,
        areaPath: built.areaPath,
        pathLength: Math.max(1, built.pathLength),
        xTicks: ticks,
      };
    }, [points, width, plotH, plotW, padX, padY]);

    const drawProgress = useSharedValue(0);
    const areaOpacity = useSharedValue(0);
    const scrubActive = useSharedValue(0);
    const scrubX = useSharedValue(0);
    const scrubY = useSharedValue(0);
    const [internalIdx, setInternalIdx] = useState<number | null>(null);
    const lastScrubIdxRef = useRef<number>(-1);
    const onSelectIndexRef = useRef(onSelectIndex);
    onSelectIndexRef.current = onSelectIndex;

    const activeIdx = selectedIndex !== undefined ? selectedIndex : internalIdx;

    useEffect(() => {
      cancelAnimation(drawProgress);
      cancelAnimation(areaOpacity);

      drawProgress.value = 0;
      areaOpacity.value = 0;

      drawProgress.value = withTiming(1, {
        duration: durationMs,
        easing: iosEasing.decel,
      });
      areaOpacity.value = withDelay(
        Math.round(durationMs * 0.2),
        withTiming(1, {
          duration: Math.round(durationMs * 0.65),
          easing: iosEasing.decel,
        })
      );
    }, [replayKey, linePath, durationMs, points.length, drawProgress, areaOpacity]);

    useEffect(() => {
      if (activeIdx != null && coords[activeIdx]) {
        scrubX.value = coords[activeIdx].x;
        scrubY.value = coords[activeIdx].y;
        scrubActive.value = 1;
      } else {
        scrubActive.value = 0;
      }
    }, [activeIdx, coords, scrubX, scrubY, scrubActive]);

    const revealClipStyle = useAnimatedStyle(() => ({
      width: Math.max(0, width * drawProgress.value),
    }));

    const animatedAreaProps = useAnimatedProps(() => ({
      opacity: areaOpacity.value,
    }));

    const handlePickIdx = (idx: number) => {
      if (lastScrubIdxRef.current !== idx) {
        lastScrubIdxRef.current = idx;
        hapticSelection();
        setInternalIdx(idx);
        onSelectIndexRef.current?.(idx);
      }
    };

    const panGesture = useMemo(() => {
      if (!interactiveScrub || coords.length === 0) return Gesture.Manual();
      const firstX = coords[0].x;
      const lastX = coords[coords.length - 1].x;
      const spanX = Math.max(1, lastX - firstX);

      return Gesture.Pan()
        .activeOffsetX([-6, 6])
        .failOffsetY([-10, 10])
        .onBegin((e) => {
          scrubActive.value = 1;
          const norm = Math.max(0, Math.min(1, (e.x - firstX) / spanX));
          const nearest = Math.round(norm * (coords.length - 1));
          const pt = coords[nearest];
          if (pt) {
            scrubX.value = pt.x;
            scrubY.value = pt.y;
            runOnJS(handlePickIdx)(nearest);
          }
        })
        .onUpdate((e) => {
          const norm = Math.max(0, Math.min(1, (e.x - firstX) / spanX));
          const nearest = Math.round(norm * (coords.length - 1));
          const pt = coords[nearest];
          if (pt) {
            scrubX.value = pt.x;
            scrubY.value = pt.y;
            runOnJS(handlePickIdx)(nearest);
          }
        })
        .onFinalize(() => {
          lastScrubIdxRef.current = -1;
        });
    }, [interactiveScrub, coords, scrubActive, scrubX, scrubY]);

    const crosshairStyle = useAnimatedStyle(() => ({
      opacity: scrubActive.value,
      transform: [{ translateX: scrubX.value }],
    }));

    const crosshairDotStyle = useAnimatedStyle(() => ({
      opacity: scrubActive.value,
      transform: [
        { translateX: scrubX.value - 6 },
        { translateY: scrubY.value - 6 },
      ] as const,
    }));

    if (coords.length === 0) return null;

    return (
      <GestureDetector gesture={panGesture}>
        <View style={{ width, height, position: 'relative' }}>
          <Animated.View style={[styles.clipReveal, { height }, revealClipStyle]}>
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id={resolvedGradId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={resolvedStroke} stopOpacity={gradientTopOpacity} />
                  <Stop offset="1" stopColor={resolvedStroke} stopOpacity={0} />
                </LinearGradient>
              </Defs>

              {showGridLines &&
                [0.25, 0.5, 0.75].map((f) => {
                  const gy = padY + (plotH - padY * 2) * (1 - f);
                  return (
                    <Line
                      key={f}
                      x1={padX}
                      y1={gy}
                      x2={width - padX}
                      y2={gy}
                      stroke={tokens.charts.gridLine}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                  );
                })}

              {areaPath ? (
                <AnimatedSvgPath
                  d={areaPath}
                  fill={`url(#${resolvedGradId})`}
                  animatedProps={animatedAreaProps}
                />
              ) : null}

              {linePath ? (
                <Path
                  d={linePath}
                  fill="none"
                  stroke={resolvedStroke}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}

              {showDots &&
                coords.map((pt, idx) => (
                  <Circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={activeIdx === idx ? 5.5 : 3.5}
                    fill={activeIdx === idx ? resolvedStroke : tokens.bg.surface}
                    stroke={resolvedStroke}
                    strokeWidth={2}
                    onPress={() => {
                      hapticLight();
                      setInternalIdx(idx);
                      onSelectIndex?.(idx);
                    }}
                  />
                ))}

              {showXLabels &&
                xTicks.map((idx) => {
                  const pt = coords[idx];
                  if (!pt?.xLabel) return null;
                  return (
                    <SvgText
                      key={`lbl-${idx}`}
                      x={pt.x}
                      y={height - 4}
                      fontSize={10}
                      fill={activeIdx === idx ? tokens.text.primary : tokens.text.muted}
                      fontFamily={FONT_FAMILY.medium}
                      textAnchor={idx === 0 ? 'start' : idx === coords.length - 1 ? 'end' : 'middle'}
                    >
                      {pt.xLabel}
                    </SvgText>
                  );
                })}
            </Svg>
          </Animated.View>

          {/* GPU Crosshair Guideline & Floating Node */}
          {interactiveScrub && (
            <>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.crosshairLine,
                  {
                    top: padY - 4,
                    height: Math.max(20, plotH - padY),
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
                    backgroundColor: resolvedStroke,
                    borderColor: tokens.bg.surface,
                  },
                  crosshairDotStyle,
                ]}
              />
            </>
          )}
        </View>
      </GestureDetector>
    );
  }
);

const styles = StyleSheet.create({
  clipReveal: {
    overflow: 'hidden',
  },
  crosshairLine: {
    position: 'absolute',
    left: 0,
    width: 1.5,
  },
  crosshairDot: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
  },
});

export default AnimatedSvgLineChart;
