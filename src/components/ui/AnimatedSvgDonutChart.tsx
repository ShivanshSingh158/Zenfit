import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  SharedValue,
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { FONT_FAMILY, RADIUS, SPACE } from '../../theme/tokens';
import { durations, iosEasing } from '../../theme/motion';
import { hapticSelection } from '../../utils/haptics';
import { NumericText } from './NumericText';
import { AnimatedSvgCircle } from './AnimatedSvgCharts';

export interface DonutSliceItem {
  id: string;
  label: string;
  value: number;
  color: string;
  subLabel?: string;
}

export interface AnimatedSvgDonutChartProps {
  slices: DonutSliceItem[];
  size?: number;
  strokeWidth?: number;
  centerValue: string;
  centerLabel: string;
  selectedSliceId?: string | null;
  onSelectSlice?: (id: string | null) => void;
  replayKey?: number | string;
  emptyText?: string;
}

const DonutArc = React.memo(function DonutArc({
  radius,
  center,
  strokeWidth,
  color,
  arcLength,
  startAngleDeg,
  circumference,
  opacity,
  progress,
  onPress,
}: {
  radius: number;
  center: number;
  strokeWidth: number;
  color: string;
  arcLength: number;
  startAngleDeg: number;
  circumference: number;
  opacity: number;
  progress: SharedValue<number>;
  onPress?: () => void;
}) {
  const animatedProps = useAnimatedProps(() => {
    const drawn = Math.max(0, arcLength * progress.value);
    return {
      strokeDasharray: `${drawn} ${Math.max(0.01, circumference - drawn)}`,
    };
  });

  return (
    <G rotation={startAngleDeg} origin={`${center},${center}`}>
      <AnimatedSvgCircle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="butt"
        opacity={opacity}
        animatedProps={animatedProps}
        onPress={onPress}
      />
    </G>
  );
});

export const AnimatedSvgDonutChart: React.FC<AnimatedSvgDonutChartProps> = React.memo(
  function AnimatedSvgDonutChart({
    slices,
    size = 136,
    strokeWidth = 18,
    centerValue,
    centerLabel,
    selectedSliceId = null,
    onSelectSlice,
    replayKey = 0,
    emptyText = 'No logged data for this period.',
  }) {
    const { tokens } = useTheme();
    const styles = useMemo(() => makeStyles(tokens), [tokens]);
    const progress = useSharedValue(1);
    const prevReplayRef = useRef<number | string | null>(null);

    const nonZeroSlices = useMemo(
      () => (slices || []).filter(s => s.value > 0),
      [slices]
    );
    const total = useMemo(
      () => nonZeroSlices.reduce((sum, s) => sum + s.value, 0),
      [nonZeroSlices]
    );

    useEffect(() => {
      if (prevReplayRef.current === replayKey) return;
      const isInitial = prevReplayRef.current === null;
      prevReplayRef.current = replayKey;
      cancelAnimation(progress);
      if (isInitial) {
        progress.value = 0;
        progress.value = withTiming(1, {
          duration: 320,
          easing: iosEasing.decel,
        });
      } else {
        progress.value = 1;
      }
      return () => {
        cancelAnimation(progress);
      };
    }, [replayKey, progress]);

    if (total <= 0 || nonZeroSlices.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      );
    }

    const activeSlice = selectedSliceId
      ? nonZeroSlices.find(s => s.id === selectedSliceId) || null
      : null;

    const r = (size - strokeWidth - 6) / 2;
    const center = size / 2;
    const circ = 2 * Math.PI * r;
    const gapRad = nonZeroSlices.length > 1 ? 2.5 : 0;

    let runningDeg = -90;
    const geometry = nonZeroSlices.map(s => {
      const pct = s.value / total;
      const sweepDeg = pct * 360;
      const startDeg = runningDeg;
      runningDeg += sweepDeg;
      const rawArcLen = pct * circ;
      const arcLen = Math.max(2, rawArcLen - gapRad);
      return {
        ...s,
        pctRounded: Math.round(pct * 100),
        startDeg,
        arcLen,
      };
    });

    const toggleSlice = (id: string) => {
      if (!onSelectSlice) return;
      hapticSelection();
      onSelectSlice(selectedSliceId === id ? null : id);
    };

    return (
      <View style={styles.container}>
        <View style={[styles.ringWrap, { width: size, height: size }]}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Circle
              cx={center}
              cy={center}
              r={r}
              stroke={tokens.bg.elevated}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {geometry.map(arc => {
              const isSel = selectedSliceId === arc.id;
              const dimmed = Boolean(selectedSliceId && !isSel);
              return (
                <DonutArc
                  key={arc.id}
                  radius={r}
                  center={center}
                  strokeWidth={isSel ? strokeWidth + 3 : strokeWidth}
                  color={arc.color}
                  arcLength={arc.arcLen}
                  startAngleDeg={arc.startDeg}
                  circumference={circ}
                  opacity={dimmed ? 0.35 : 1}
                  progress={progress}
                  onPress={onSelectSlice ? () => toggleSlice(arc.id) : undefined}
                />
              );
            })}
          </Svg>
          <View
            pointerEvents="none"
            style={[
              styles.centerOverlay,
              { paddingHorizontal: Math.max(12, strokeWidth + 6) },
            ]}
          >
            <NumericText
              style={[styles.centerVal, size < 120 && { fontSize: 15 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {activeSlice
                ? `${Math.round((activeSlice.value / total) * 100)}%`
                : centerValue}
            </NumericText>
            <Text
              style={[styles.centerLbl, size < 120 && { fontSize: 8.5 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {activeSlice ? activeSlice.label : centerLabel}
            </Text>
          </View>
        </View>

        <View style={styles.legendCol}>
          {geometry.map(item => {
            const isSel = selectedSliceId === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => toggleSlice(item.id)}
                disabled={!onSelectSlice}
                style={({ pressed }) => [
                  styles.legendRow,
                  isSel && { backgroundColor: tokens.bg.elevated },
                  pressed && { opacity: 0.72 },
                ]}
              >
                <View style={[styles.dot, { backgroundColor: item.color }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.legendLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {item.subLabel ? (
                    <Text style={styles.legendSub} numberOfLines={1}>
                      {item.subLabel}
                    </Text>
                  ) : null}
                </View>
                <NumericText style={styles.legendValue}>
                  {item.pctRounded}%
                </NumericText>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
);

export const AdherenceRingGauge: React.FC<{
  pct: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  valueText?: string;
  replayKey?: number | string;
}> = React.memo(function AdherenceRingGauge({
  pct,
  size = 64,
  strokeWidth = 6,
  color,
  label,
  valueText,
  replayKey = 0,
}) {
  const { tokens } = useTheme();
  const fillColor = color ?? (pct >= 80 ? tokens.status.success : tokens.accent.primary);
  const progress = useSharedValue(1);
  const prevReplayRef = useRef<number | string | null>(null);
  const clamped = Math.max(0, Math.min(100, pct));

  const r = (size - strokeWidth) / 2;
  const center = size / 2;
  const circ = 2 * Math.PI * r;
  const targetLen = (clamped / 100) * circ;

  useEffect(() => {
    if (prevReplayRef.current === replayKey) return;
    const isInitial = prevReplayRef.current === null;
    prevReplayRef.current = replayKey;
    cancelAnimation(progress);
    if (isInitial) {
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: Math.min(340, durations.barFill),
        easing: iosEasing.decel,
      });
    } else {
      progress.value = 1;
    }
    return () => cancelAnimation(progress);
  }, [replayKey, progress]);

  const animatedProps = useAnimatedProps(() => {
    const drawn = Math.max(0, targetLen * progress.value);
    return {
      strokeDasharray: `${drawn} ${Math.max(0.01, circ - drawn)}`,
    };
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            cx={center}
            cy={center}
            r={r}
            stroke={tokens.bg.elevated}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {clamped > 0 && (
            <G rotation="-90" origin={`${center},${center}`}>
              <AnimatedSvgCircle
                cx={center}
                cy={center}
                r={r}
                stroke={fillColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="none"
                animatedProps={animatedProps}
              />
            </G>
          )}
        </Svg>
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: strokeWidth + 4,
            },
          ]}
        >
          <NumericText
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={{
              fontSize: size >= 68 ? 15 : 13.5,
              fontFamily: FONT_FAMILY.bold,
              color: tokens.text.primary,
            }}
          >
            {valueText ?? `${Math.round(clamped)}%`}
          </NumericText>
        </View>
      </View>

      {label ? (
        <Text
          numberOfLines={1}
          style={{
            marginTop: 5,
            fontSize: 9.5,
            fontFamily: FONT_FAMILY.bold,
            color: tokens.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
});

const makeStyles = (tokens: any) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.md,
    },
    ringWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      flexShrink: 0,
    },
    centerOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    centerVal: {
      fontSize: 18,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.primary,
      letterSpacing: -0.4,
    },
    centerLbl: {
      fontSize: 9.5,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 1,
    },
    legendCol: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: RADIUS.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      flexShrink: 0,
    },
    legendLabel: {
      fontSize: 12.5,
      fontFamily: FONT_FAMILY.semibold,
      color: tokens.text.primary,
    },
    legendSub: {
      fontSize: 10.5,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.muted,
    },
    legendValue: {
      fontSize: 12.5,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.secondary,
      flexShrink: 0,
    },
    emptyWrap: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.muted,
    },
  });

export default AnimatedSvgDonutChart;
