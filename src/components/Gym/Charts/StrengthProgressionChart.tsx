/**
 * StrengthProgressionChart.tsx — ZenTrack Mobile
 *
 * Visualizes 1RM progression over 4 weeks using smooth cubic Bezier curves,
 * gradient aura fills, and muscle-coded telemetry pods.
 */

import React, { useEffect, useMemo, useId } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  cancelAnimation,
} from 'react-native-reanimated';
import { Dumbbell, Sparkles, TrendingDown, TrendingUp } from 'lucide-react-native';
import { FONT_FAMILY, ICON, RADIUS, SPACE, ThemeTokens } from '../../../theme/tokens';
import { iosEasing } from '../../../theme/motion';
import { useTheme } from '../../../contexts/ThemeContext';
import { NumericText, TactileButton } from '../../ui';
import { RollingNumber } from '../../ui/RollingNumber';
import { AnimatedSvgPath, AnimatedSvgCircle } from '../../ui/AnimatedSvgCharts';
import { buildSmoothBezierCurve } from './chartMath';
import { useWeightUnit, kgToDisplay, unitLabel } from '../../../utils/weightUnit';

interface ExerciseSpark {
  name: string;
  muscle: string;
  /** Array of { label: string; est1RM: number } — oldest first */
  weeks: { label: string; est1RM: number }[];
  currentRM: number;
  prevRM: number;
  color: string;
}

interface StrengthProgressionChartProps {
  exercises: ExerciseSpark[];
  onSelectExercise?: (name: string) => void;
  replayKey?: number | string;
}

export type { ExerciseSpark };

const SPARK_W = 110;
const SPARK_H = 46;

function generateSmoothSparkline(values: number[], w: number, h: number): {
  linePath: string;
  areaPath: string;
  pathLength: number;
  points: Array<{ x: number; y: number }>;
} {
  if (values.length === 0) return { linePath: '', areaPath: '', pathLength: 0, points: [] };

  const maxV = Math.max(...values, 1);
  const minV = Math.min(...values, 0);
  const range = maxV - minV || 1;
  const padTop = 6;
  const padBottom = 6;
  const chartH = h - padTop - padBottom;
  const stepX = w / Math.max(1, values.length - 1);

  const points = values.map((v, i) => {
    const x = Number((i * stepX).toFixed(1));
    const y = Number((padTop + chartH - ((v - minV) / range) * chartH).toFixed(1));
    return { x, y };
  });

  const { linePath, areaPath, pathLength } = buildSmoothBezierCurve(points, h);
  return { linePath, areaPath, pathLength: Math.max(1, pathLength), points };
}

const SparkCard = React.memo(function SparkCard({
  ex,
  index,
  replayKey,
  onPress,
  tokens,
  styles,
}: {
  ex: ExerciseSpark;
  index: number;
  replayKey: number | string;
  onPress?: () => void;
  tokens: ThemeTokens;
  styles: ReturnType<typeof makeStyles>;
}) {
  const { plotValues, isFirstTimeBaseline } = useMemo(() => {
    const rawValues = ex.weeks.map(w => w.est1RM);
    const nonZeroValues = rawValues.filter(v => v > 0);
    const isBaseline = nonZeroValues.length <= 1;
    if (isBaseline) {
      return {
        plotValues: [ex.currentRM, ex.currentRM, ex.currentRM, ex.currentRM],
        isFirstTimeBaseline: true,
      };
    }
    const firstValid = nonZeroValues[0] || ex.currentRM;
    return {
      plotValues: rawValues.map(v => (v > 0 ? v : firstValid)),
      isFirstTimeBaseline: false,
    };
  }, [ex.weeks, ex.currentRM]);

  const { linePath, areaPath, pathLength, points } = useMemo(
    () => generateSmoothSparkline(plotValues, SPARK_W, SPARK_H),
    [plotValues]
  );

  const drawProgress = useSharedValue(0);
  const areaOpacity = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(drawProgress);
    cancelAnimation(areaOpacity);
    drawProgress.value = 0;
    areaOpacity.value = 0;
    const cardDelay = Math.min(index, 5) * 60;

    drawProgress.value = withDelay(
      cardDelay,
      withTiming(1, { duration: 540, easing: iosEasing.decel })
    );
    areaOpacity.value = withDelay(
      cardDelay + 120,
      withTiming(1, { duration: 400, easing: iosEasing.decel })
    );
  }, [replayKey, linePath, index, drawProgress, areaOpacity]);

  const animatedLineProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLength * (1 - drawProgress.value),
  }));

  const animatedAreaProps = useAnimatedProps(() => ({
    opacity: areaOpacity.value,
  }));

  const animatedPointProps = useAnimatedProps(() => ({
    opacity: drawProgress.value > 0.7 ? (drawProgress.value - 0.7) / 0.3 : 0,
  }));

  const unitIsLbs = useWeightUnit();
  const uLabel = unitLabel(unitIsLbs);
  const shownCurrentRM = kgToDisplay(ex.currentRM, unitIsLbs);
  const shownPrevRM = kgToDisplay(ex.prevRM, unitIsLbs);
  const delta =
    ex.prevRM > 0 && ex.prevRM !== ex.currentRM
      ? Math.round((shownCurrentRM - shownPrevRM) * 10) / 10
      : 0;
  const isUp = delta > 0;
  const isDown = delta < 0;

  const reactId = useId().replace(/[^a-zA-Z0-9_]/g, '');
  const gradId = `spark_grad_${reactId}`;
  const lastPoint = points.length > 0 ? points[points.length - 1] : null;

  return (
    <TactileButton
      variant="custom"
      onPress={onPress}
      disabled={!onPress}
      style={styles.card}
    >
      {/* Card Top Row */}
      <View style={styles.cardTopRow}>
        <View style={styles.nameContainer}>
          <View style={[styles.musclePill, { backgroundColor: `${ex.color}15`, borderColor: `${ex.color}35` }]}>
            <Text style={[styles.musclePillText, { color: ex.color }]}>
              {ex.muscle}
            </Text>
          </View>
          <Text style={styles.exerciseTitle} numberOfLines={1}>
            {ex.name}
          </Text>
        </View>

        {isFirstTimeBaseline ? (
          <View style={styles.baselineBadge}>
            <Sparkles size={ICON.xs - 3} strokeWidth={ICON.strokeWidth} color={tokens.accent.secondary} />
            <Text style={styles.baselineBadgeText}>New Baseline</Text>
          </View>
        ) : isUp ? (
          <View style={[styles.deltaBadge, styles.deltaUp]}>
            <TrendingUp size={ICON.xs - 2} strokeWidth={ICON.strokeWidth} color={tokens.status.success} />
            <NumericText style={[styles.deltaText, { color: tokens.status.success }]}>
              +{delta} {uLabel}
            </NumericText>
          </View>
        ) : isDown ? (
          <View style={[styles.deltaBadge, styles.deltaDown]}>
            <TrendingDown size={ICON.xs - 2} strokeWidth={ICON.strokeWidth} color={tokens.status.danger} />
            <NumericText style={[styles.deltaText, { color: tokens.status.danger }]}>
              {delta} {uLabel}
            </NumericText>
          </View>
        ) : (
          <View style={[styles.deltaBadge, styles.deltaFlat]}>
            <Text style={[styles.deltaText, { color: tokens.text.secondary }]}>Solid</Text>
          </View>
        )}
      </View>

      {/* Card Bottom Row */}
      <View style={styles.cardBottomRow}>
        <View style={styles.statColumn}>
          <View style={styles.weightRow}>
            <RollingNumber
              value={shownCurrentRM}
              replayKey={replayKey}
              cycles={0}
              durationMs={480}
              style={styles.weightValue}
            />
            <Text style={styles.weightUnit}>{uLabel}</Text>
          </View>
          <View style={styles.subLabelRow}>
            <Dumbbell size={ICON.xs - 2} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
            <Text style={styles.subLabelText}>Est. 1RM</Text>
          </View>
        </View>

        <View style={styles.chartColumn}>
          <Svg width={SPARK_W} height={SPARK_H} style={{ overflow: 'visible' }}>
            <Defs>
              <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={ex.color} stopOpacity="0.28" />
                <Stop offset="1" stopColor={ex.color} stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            <AnimatedSvgPath d={areaPath} fill={`url(#${gradId})`} animatedProps={animatedAreaProps} />
            <AnimatedSvgPath
              d={linePath}
              fill="none"
              stroke={ex.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${pathLength}, ${pathLength}`}
              animatedProps={animatedLineProps}
            />
            <Line
              x1={0}
              y1={SPARK_H - 6}
              x2={SPARK_W}
              y2={SPARK_H - 6}
              stroke={tokens.charts.gridLine}
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {lastPoint && (
              <AnimatedSvgCircle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={4}
                fill={tokens.bg.surface}
                stroke={ex.color}
                strokeWidth={2.5}
                animatedProps={animatedPointProps}
              />
            )}
          </Svg>

          <View style={styles.axisRow}>
            {ex.weeks.map((w, i) => (
              <NumericText
                key={i}
                style={[styles.axisText, i === ex.weeks.length - 1 && styles.axisTextActive]}
              >
                {w.label}
              </NumericText>
            ))}
          </View>
        </View>
      </View>
    </TactileButton>
  );
});

export const StrengthProgressionChart: React.FC<StrengthProgressionChartProps> = React.memo(function StrengthProgressionChart({ exercises, onSelectExercise, replayKey = 0 }: StrengthProgressionChartProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  if (!exercises || exercises.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <TrendingUp size={ICON.xs} strokeWidth={ICON.strokeWidth} color={tokens.status.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionLabel}>STRENGTH TELEMETRY</Text>
          <Text style={styles.sectionSub}>4-week estimated 1RM trajectory & progressive overload</Text>
        </View>
      </View>

      <View style={styles.list}>
        {exercises.map((ex, idx) => (
          <SparkCard
            key={ex.name}
            ex={ex}
            index={idx}
            replayKey={replayKey}
            tokens={tokens}
            styles={styles}
            onPress={onSelectExercise ? () => onSelectExercise(ex.name) : undefined}
          />
        ))}
      </View>
    </View>
  );
});

export default StrengthProgressionChart;

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
    gap: SPACE.sm + 2,
    marginBottom: SPACE.md,
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
  sectionLabel: {
    fontSize: tokens.fontSize.xs,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
    letterSpacing: 0.8,
  },
  sectionSub: {
    fontSize: tokens.fontSize.xs,
    color: tokens.text.secondary,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 1,
  },
  list: {
    gap: SPACE.sm + 2,
  },
  card: {
    backgroundColor: tokens.bg.elevated,
    borderRadius: RADIUS.inner,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
    padding: SPACE.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE.sm + 2,
    gap: SPACE.sm,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    flex: 1,
  },
  musclePill: {
    paddingHorizontal: SPACE.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.sm - 2,
    borderWidth: tokens.border.hairlineWidth,
  },
  musclePillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.xs - 1,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  exerciseTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.md,
    color: tokens.text.primary,
    letterSpacing: -0.2,
    flex: 1,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: SPACE.sm - 1,
    paddingVertical: 2.5,
    borderRadius: RADIUS.sm - 2,
    borderWidth: tokens.border.hairlineWidth,
  },
  deltaUp: {
    backgroundColor: tokens.status.successDim,
    borderColor: tokens.status.success,
  },
  deltaDown: {
    backgroundColor: tokens.status.dangerDim,
    borderColor: tokens.status.danger,
  },
  deltaFlat: {
    backgroundColor: tokens.bg.surface,
    borderColor: tokens.border.subtle,
  },
  deltaText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.xs,
  },
  baselineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    backgroundColor: tokens.accent.secondaryDim,
    borderColor: tokens.accent.secondary,
    borderWidth: tokens.border.hairlineWidth,
    paddingHorizontal: SPACE.sm - 1,
    paddingVertical: 2.5,
    borderRadius: RADIUS.sm - 2,
  },
  baselineBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.xs,
    color: tokens.accent.secondary,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  statColumn: {
    justifyContent: 'flex-end',
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  weightValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.xl,
    color: tokens.text.primary,
    letterSpacing: -0.5,
  },
  weightUnit: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: tokens.fontSize.sm,
    color: tokens.text.secondary,
  },
  subLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    marginTop: 2,
  },
  subLabelText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: tokens.fontSize.xs,
    color: tokens.text.secondary,
  },
  chartColumn: {
    alignItems: 'flex-end',
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: SPARK_W,
    marginTop: SPACE.xs,
    paddingHorizontal: 2,
  },
  axisText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: tokens.fontSize.xs - 2,
    color: tokens.text.muted,
  },
  axisTextActive: {
    color: tokens.accent.secondary,
    fontFamily: FONT_FAMILY.bold,
  },
});
