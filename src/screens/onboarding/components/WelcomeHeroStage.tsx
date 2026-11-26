import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  SharedValue,
  cancelAnimation,
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  ArrowRight,
  Flame,
  Timer,
  TrendingUp,
  X,
} from 'lucide-react-native';
import {
  AnimatedSvgCircle,
  AnimatedSvgPath,
  NumericText,
  TactileButton,
} from '../../../components/ui';
import BottomSheet from '../../../components/ui/BottomSheet';
import { STATIC_BODY_SVG } from '../../../components/Gym/metrics/muscleMapSvgCache';
import { useTheme } from '../../../contexts/ThemeContext';
import { hapticLight, hapticSelection } from '../../../utils/haptics';
import { iosEasing } from '../../../theme/motion';
import { FONT_FAMILY, ICON, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';

interface WelcomeSlide {
  id: 'overload' | 'anatomy' | 'workout';
  eyebrow: string;
  title: string;
  subtitle: string;
}

const SLIDES: WelcomeSlide[] = [
  {
    id: 'overload',
    eyebrow: 'PROGRESSIVE OVERLOAD',
    title: 'Lift heavier every week.',
    subtitle: 'Smart weight targets and 1RM tracking calculated automatically.',
  },
  {
    id: 'anatomy',
    eyebrow: 'MUSCLE RECOVERY',
    title: 'See which muscles are ready.',
    subtitle: 'Live fatigue status and weekly set balance across every group.',
  },
  {
    id: 'workout',
    eyebrow: 'LIVE WORKOUT & TIMERS',
    title: 'Stay locked in every set.',
    subtitle: 'Active session dial, rest countdowns, and seamless machine swaps.',
  },
];

/* ── Slide 1 Artwork: Seamless Ramping Progressive Overload Graph ─────────── */
const OverloadCurveArtwork = React.memo(function OverloadCurveArtwork({
  active,
  slideWidth,
  stageHeight,
  tokens,
}: {
  active: boolean;
  slideWidth: number;
  stageHeight: number;
  tokens: ThemeTokens;
}) {
  const uid = useId().replace(/:/g, '_');
  const strokeGradId = `onbCurve_${uid}`;
  const areaGradId = `onbArea_${uid}`;
  const haloId = `onbHalo1_${uid}`;

  const lineProgress = useSharedValue(0);
  const seg1Opacity = useSharedValue(0);
  const seg2Opacity = useSharedValue(0);
  const seg3Opacity = useSharedValue(0);
  const dot1R = useSharedValue(0);
  const dot2R = useSharedValue(0);
  const dot3R = useSharedValue(0);
  const dot4R = useSharedValue(0);
  const pulse = useSharedValue(1);
  const chipOpacity = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(lineProgress);
    cancelAnimation(seg1Opacity);
    cancelAnimation(seg2Opacity);
    cancelAnimation(seg3Opacity);
    cancelAnimation(dot1R);
    cancelAnimation(dot2R);
    cancelAnimation(dot3R);
    cancelAnimation(dot4R);
    cancelAnimation(pulse);
    cancelAnimation(chipOpacity);

    if (!active) {
      lineProgress.value = 0;
      seg1Opacity.value = 0;
      seg2Opacity.value = 0;
      seg3Opacity.value = 0;
      dot1R.value = 0;
      dot2R.value = 0;
      dot3R.value = 0;
      dot4R.value = 0;
      chipOpacity.value = 0;
      return;
    }

    lineProgress.value = 0;
    seg1Opacity.value = 0;
    seg2Opacity.value = 0;
    seg3Opacity.value = 0;
    dot1R.value = 0;
    dot2R.value = 0;
    dot3R.value = 0;
    dot4R.value = 0;
    chipOpacity.value = 0;

    // Coordinated left-to-right curve + ramp-up area + staggered node pops
    lineProgress.value = withTiming(1, { duration: 1050, easing: iosEasing.decel });
    dot1R.value = withTiming(4.2, { duration: 220 });
    seg1Opacity.value = withDelay(140, withTiming(1, { duration: 320 }));
    dot2R.value = withDelay(300, withTiming(4.2, { duration: 220 }));
    seg2Opacity.value = withDelay(380, withTiming(1, { duration: 340 }));
    dot3R.value = withDelay(560, withTiming(4.5, { duration: 220 }));
    seg3Opacity.value = withDelay(640, withTiming(1, { duration: 380 }));
    dot4R.value = withDelay(820, withTiming(6.8, { duration: 260, easing: iosEasing.decel }));
    chipOpacity.value = withDelay(420, withTiming(1, { duration: 380 }));

    pulse.value = withRepeat(
      withSequence(
        withTiming(1.36, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    return () => {
      cancelAnimation(lineProgress);
      cancelAnimation(seg1Opacity);
      cancelAnimation(seg2Opacity);
      cancelAnimation(seg3Opacity);
      cancelAnimation(dot1R);
      cancelAnimation(dot2R);
      cancelAnimation(dot3R);
      cancelAnimation(dot4R);
      cancelAnimation(pulse);
      cancelAnimation(chipOpacity);
    };
  }, [
    active,
    lineProgress,
    seg1Opacity,
    seg2Opacity,
    seg3Opacity,
    dot1R,
    dot2R,
    dot3R,
    dot4R,
    pulse,
    chipOpacity,
  ]);

  const pathLen = 355;
  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLen * (1 - lineProgress.value),
  }));

  const seg1Props = useAnimatedProps(() => ({ opacity: seg1Opacity.value }));
  const seg2Props = useAnimatedProps(() => ({ opacity: seg2Opacity.value }));
  const seg3Props = useAnimatedProps(() => ({ opacity: seg3Opacity.value }));

  const dot1Props = useAnimatedProps(() => ({ r: dot1R.value }));
  const dot2Props = useAnimatedProps(() => ({ r: dot2R.value }));
  const dot3Props = useAnimatedProps(() => ({ r: dot3R.value }));
  const dot4Props = useAnimatedProps(() => ({ r: dot4R.value }));

  const glowCircleProps = useAnimatedProps(() => ({
    r: 13 * pulse.value,
    opacity: active ? 0.26 : 0,
  }));

  const chipStyle = useAnimatedStyle(() => ({
    opacity: chipOpacity.value,
    transform: [{ translateY: (1 - chipOpacity.value) * 6 }],
  }));

  const gridStroke = tokens.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(9,9,11,0.06)';
  const labelFill = tokens.text.muted;
  const svgH = Math.min(230, Math.max(180, stageHeight - 62));

  return (
    <View style={[artStyles.overloadWrap, { width: slideWidth, height: stageHeight }]}>
      {/* Top Unobstructed Telemetry Strip (Zero collision with chart or W1-W4) */}
      <Animated.View style={[artStyles.overloadTopStrip, chipStyle]}>
        <View
          style={[
            artStyles.prPill,
            {
              backgroundColor: tokens.isDark ? 'rgba(15, 16, 21, 0.92)' : tokens.bg.surface,
              borderColor: tokens.isDark ? 'rgba(255,255,255,0.10)' : tokens.border.subtle,
            },
          ]}
        >
          <TrendingUp size={13} strokeWidth={2.2} color={tokens.status.success} />
          <NumericText style={[artStyles.floatingChipText, { color: tokens.text.primary }]}>
            +2.5 kg PR
          </NumericText>
        </View>

        <View
          style={[
            artStyles.benchPill,
            {
              backgroundColor: tokens.isDark ? 'rgba(15, 16, 21, 0.92)' : tokens.bg.surface,
              borderColor: tokens.isDark ? 'rgba(255,255,255,0.10)' : tokens.border.subtle,
            },
          ]}
        >
          <NumericText style={[artStyles.telemetryMain, { color: tokens.text.primary }]}>
            85 kg × 8
          </NumericText>
          <View style={artStyles.telemetrySep} />
          <NumericText style={[artStyles.telemetryAccent, { color: tokens.accent.primary }]}>
            1RM 108
          </NumericText>
        </View>
      </Animated.View>

      {/* Full-Width Graph Melting Smoothly Into Canvas */}
      <View style={{ width: slideWidth, height: svgH, position: 'relative' }}>
        <Svg width={slideWidth} height={svgH} viewBox="0 0 360 220">
          <Defs>
            {/* Soft radial highlight well within viewBox bounds */}
            <RadialGradient id={haloId} cx="76%" cy="32%" rx="26%" ry="28%">
              <Stop offset="0%" stopColor={tokens.accent.primary} stopOpacity={tokens.isDark ? 0.22 : 0.12} />
              <Stop offset="60%" stopColor={tokens.accent.primary} stopOpacity={tokens.isDark ? 0.06 : 0.03} />
              <Stop offset="100%" stopColor={tokens.accent.primary} stopOpacity={0} />
            </RadialGradient>

            {/* Horizontal edge-integrated stroke gradient */}
            <SvgLinearGradient id={strokeGradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={tokens.accent.secondary} stopOpacity={0.25} />
              <Stop offset="18%" stopColor={tokens.accent.secondary} stopOpacity={0.9} />
              <Stop offset="85%" stopColor={tokens.accent.primary} stopOpacity={1} />
              <Stop offset="100%" stopColor={tokens.accent.primary} stopOpacity={0.65} />
            </SvgLinearGradient>

            {/* Area fill fading seamlessly at edges & bottom (zero hard box edge!) */}
            <SvgLinearGradient id={areaGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={tokens.accent.primary} stopOpacity={0} />
              <Stop offset="35%" stopColor={tokens.accent.secondary} stopOpacity={tokens.isDark ? 0.12 : 0.07} />
              <Stop offset="76%" stopColor={tokens.accent.primary} stopOpacity={tokens.isDark ? 0.22 : 0.12} />
              <Stop offset="100%" stopColor={tokens.accent.primary} stopOpacity={0} />
            </SvgLinearGradient>
          </Defs>

          <Circle cx={274} cy={70} r={90} fill={`url(#${haloId})`} />

          {/* Clean faint horizontal grid lines */}
          <Line x1={20} y1={56} x2={340} y2={56} stroke={gridStroke} strokeWidth={1} strokeDasharray="3 6" />
          <Line x1={20} y1={106} x2={340} y2={106} stroke={gridStroke} strokeWidth={1} strokeDasharray="3 6" />
          <Line x1={20} y1={156} x2={340} y2={156} stroke={gridStroke} strokeWidth={1} strokeDasharray="3 6" />

          {/* Ramping Gradient Area Segments (1 -> 2 -> 3) with soft curved baseline */}
          <AnimatedSvgPath
            d="M 42 162 C 84 156, 110 132, 140 124 L 140 182 L 42 182 Z"
            fill={`url(#${areaGradId})`}
            animatedProps={seg1Props}
          />
          <AnimatedSvgPath
            d="M 140 124 C 172 114, 194 92, 224 80 L 224 182 L 140 182 Z"
            fill={`url(#${areaGradId})`}
            animatedProps={seg2Props}
          />
          <AnimatedSvgPath
            d="M 224 80 C 254 68, 282 50, 314 44 C 330 42, 342 44, 348 47 L 348 182 L 224 182 Z"
            fill={`url(#${areaGradId})`}
            animatedProps={seg3Props}
          />

          {/* Progressive Overload Bezier Trajectory (with gentle fade-in lead-in & lead-out) */}
          <AnimatedSvgPath
            d="M 16 164 C 28 164, 34 163, 42 162 C 84 156, 110 132, 140 124 C 172 114, 194 92, 224 80 C 254 68, 282 50, 314 44 C 328 42, 338 43, 346 46"
            fill="none"
            stroke={`url(#${strokeGradId})`}
            strokeWidth={3.6}
            strokeLinecap="round"
            strokeDasharray={pathLen}
            animatedProps={lineProps}
          />

          {/* Staggered Weekly Progression Nodes */}
          <AnimatedSvgCircle cx={42} cy={162} fill={tokens.accent.secondary} animatedProps={dot1Props} />
          <AnimatedSvgCircle cx={140} cy={124} fill={tokens.accent.secondary} animatedProps={dot2Props} />
          <AnimatedSvgCircle cx={224} cy={80} fill={tokens.accent.primary} animatedProps={dot3Props} />

          {/* Pulsing Peak PR Node */}
          <AnimatedSvgCircle
            cx={314}
            cy={44}
            fill={tokens.accent.primary}
            animatedProps={glowCircleProps}
          />
          <AnimatedSvgCircle
            cx={314}
            cy={44}
            fill={tokens.accent.primary}
            stroke={tokens.bg.canvas}
            strokeWidth={2.2}
            animatedProps={dot4Props}
          />

          {/* Unobstructed Week Labels */}
          <SvgText x={42} y={205} fill={labelFill} fontSize="11.5" fontFamily={FONT_FAMILY.semibold} textAnchor="middle">W1</SvgText>
          <SvgText x={140} y={205} fill={labelFill} fontSize="11.5" fontFamily={FONT_FAMILY.semibold} textAnchor="middle">W2</SvgText>
          <SvgText x={224} y={205} fill={labelFill} fontSize="11.5" fontFamily={FONT_FAMILY.semibold} textAnchor="middle">W3</SvgText>
          <SvgText x={314} y={205} fill={tokens.accent.primary} fontSize="11.5" fontFamily={FONT_FAMILY.bold} textAnchor="middle">W4</SvgText>
        </Svg>
      </View>
    </View>
  );
});

/* ── Slide 2 Artwork: Enlarged Dual Anatomy Recovery Map ─────────────────── */
const MUSCLE_HIGHLIGHT_PHASES: Array<{
  slugs: Set<string>;
  label: string;
  readiness: string;
  bars: [number, number, number];
}> = [
  {
    slugs: new Set(['chest', 'deltoids', 'triceps']),
    label: 'Push · Chest & Delts',
    readiness: '96% Fresh',
    bars: [0.96, 0.72, 0.88],
  },
  {
    slugs: new Set(['upper-back', 'biceps', 'trapezius']),
    label: 'Pull · Lats & Biceps',
    readiness: '92% Primed',
    bars: [0.64, 0.94, 0.85],
  },
  {
    slugs: new Set(['quadriceps', 'hamstring', 'calves', 'gluteal']),
    label: 'Legs · Quads & Hams',
    readiness: '98% Ready',
    bars: [0.84, 0.76, 0.98],
  },
];

const MuscleMapArtwork = React.memo(function MuscleMapArtwork({
  active,
  slideWidth,
  stageHeight,
  tokens,
}: {
  active: boolean;
  slideWidth: number;
  stageHeight: number;
  tokens: ThemeTokens;
}) {
  const uid = useId().replace(/:/g, '_');
  const haloId = `onbBodyHalo_${uid}`;
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setPhaseIdx((prev) => (prev + 1) % MUSCLE_HIGHLIGHT_PHASES.length);
    }, 1550);
    return () => clearInterval(id);
  }, [active]);

  const phase = MUSCLE_HIGHLIGHT_PHASES[phaseIdx];
  const { front, back } = STATIC_BODY_SVG.male;
  const inertFill = tokens.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(9,9,11,0.08)';
  const baseMuscleFill = tokens.isDark ? 'rgba(255,255,255,0.13)' : 'rgba(9,9,11,0.12)';
  const strokeCol = tokens.bg.canvas;

  const bodyH = Math.min(182, Math.max(146, stageHeight - 102));
  const bodyW = Math.round(bodyH * 0.56);

  return (
    <View style={[artStyles.columnStage, { width: slideWidth, height: stageHeight }]}>
      <Svg width={slideWidth} height={stageHeight} viewBox="0 0 360 250" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={haloId} cx="50%" cy="48%" rx="34%" ry="36%">
            <Stop offset="0%" stopColor={tokens.accent.secondary} stopOpacity={tokens.isDark ? 0.22 : 0.12} />
            <Stop offset="100%" stopColor={tokens.accent.secondary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={180} cy={120} r={105} fill={`url(#${haloId})`} />
      </Svg>

      {/* Top Recovery Status Pill */}
      <View
        style={[
          artStyles.recoveryBadgeTop,
          {
            backgroundColor: tokens.isDark ? 'rgba(20, 22, 29, 0.92)' : tokens.bg.surface,
            borderColor: tokens.isDark ? 'rgba(56, 189, 248, 0.35)' : tokens.border.medium,
          },
        ]}
      >
        <View style={[artStyles.liveDot, { backgroundColor: tokens.accent.secondary }]} />
        <Text style={[artStyles.floatingChipText, { color: tokens.text.primary }]}>
          {phase.label}
        </Text>
        <NumericText style={[artStyles.readinessHighlight, { color: tokens.accent.secondary }]}>
          {phase.readiness}
        </NumericText>
      </View>

      {/* Dual Silhouettes (Zero overlap with pills) */}
      <View style={artStyles.bodyDualRow} pointerEvents="none">
        <Svg viewBox={front.vb} width={bodyW} height={bodyH}>
          <G>
            <Path d={front.inertD} fill={inertFill} />
            {front.slugs.map((slug) => {
              const d = front.paths[slug];
              if (!d) return null;
              const lit = phase.slugs.has(slug);
              return (
                <Path
                  key={`w-front-${slug}`}
                  d={d}
                  fill={lit ? tokens.accent.secondary : baseMuscleFill}
                  stroke={strokeCol}
                  strokeWidth={1.2}
                />
              );
            })}
          </G>
        </Svg>

        <Svg viewBox={back.vb} width={bodyW} height={bodyH}>
          <G>
            <Path d={back.inertD} fill={inertFill} />
            {back.slugs.map((slug) => {
              const d = back.paths[slug];
              if (!d) return null;
              const lit = phase.slugs.has(slug);
              return (
                <Path
                  key={`w-back-${slug}`}
                  d={d}
                  fill={lit ? tokens.accent.primary : baseMuscleFill}
                  stroke={strokeCol}
                  strokeWidth={1.2}
                />
              );
            })}
          </G>
        </Svg>
      </View>

      {/* Bottom Mini Muscle Recovery Bars */}
      <View
        style={[
          artStyles.recoveryBarsStrip,
          {
            backgroundColor: tokens.isDark ? 'rgba(15, 16, 21, 0.92)' : tokens.bg.surface,
            borderColor: tokens.isDark ? 'rgba(255,255,255,0.10)' : tokens.border.subtle,
          },
        ]}
      >
        {[
          { name: 'Push', ratio: phase.bars[0], color: tokens.accent.secondary },
          { name: 'Pull', ratio: phase.bars[1], color: tokens.accent.primary },
          { name: 'Legs', ratio: phase.bars[2], color: tokens.status.success },
        ].map((item) => (
          <View key={item.name} style={artStyles.recoveryBarCol}>
            <Text style={[artStyles.recoveryBarName, { color: tokens.text.secondary }]}>
              {item.name}
            </Text>
            <View
              style={[
                artStyles.recoveryBarTrack,
                { backgroundColor: tokens.isDark ? 'rgba(255,255,255,0.10)' : tokens.border.subtle },
              ]}
            >
              <View
                style={[
                  artStyles.recoveryBarFill,
                  { width: `${Math.round(item.ratio * 100)}%`, backgroundColor: item.color },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

/* ── Slide 3 Artwork: Emerald Workout Chronometer & Rest Timer ─────────── */
const DIAL_SIZE = 186;
const DIAL_CENTER = DIAL_SIZE / 2;
const OUTER_R = 80;
const OUTER_C = 2 * Math.PI * OUTER_R;
const INNER_DIAL_R = 71;
const SWEEP_R = 65;
const SWEEP_C = 2 * Math.PI * SWEEP_R;
const SWEEP_TRAIL_LEN = (SWEEP_C * 32) / 360;

const MINOR_R = 58.5;
const MINOR_C = 2 * Math.PI * MINOR_R;
const MAJOR_R = 57;
const MAJOR_C = 2 * Math.PI * MAJOR_R;
const CARDINAL_R = 55.5;
const CARDINAL_C = 2 * Math.PI * CARDINAL_R;

const WorkoutTimerOrbitArtwork = React.memo(function WorkoutTimerOrbitArtwork({
  active,
  slideWidth,
  stageHeight,
  tokens,
}: {
  active: boolean;
  slideWidth: number;
  stageHeight: number;
  tokens: ThemeTokens;
}) {
  const uid = useId().replace(/:/g, '_');
  const haloId = `onbGreenHalo_${uid}`;
  const arcGradId = `onbGreenArc_${uid}`;

  const arcProgress = useSharedValue(0);
  const sweepDeg = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(arcProgress);
    cancelAnimation(sweepDeg);

    if (!active) {
      arcProgress.value = 0;
      sweepDeg.value = 0;
      return;
    }

    arcProgress.value = 0;
    arcProgress.value = withTiming(0.76, { duration: 950, easing: iosEasing.decel });
    sweepDeg.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1,
      false
    );

    return () => {
      cancelAnimation(arcProgress);
      cancelAnimation(sweepDeg);
    };
  }, [active, arcProgress, sweepDeg]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: OUTER_C * (1 - arcProgress.value),
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sweepDeg.value}deg` }],
  }));

  const green = tokens.status.success;
  const dialBg = tokens.isDark ? '#07090D' : '#FFFFFF';
  const trackStroke = tokens.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(9,9,11,0.08)';
  const minorStroke = tokens.isDark ? 'rgba(255,255,255,0.13)' : 'rgba(9,9,11,0.11)';
  const majorStroke = tokens.isDark ? 'rgba(255,255,255,0.30)' : 'rgba(9,9,11,0.25)';

  return (
    <View style={[artStyles.columnStage, { width: slideWidth, height: stageHeight }]}>
      <View
        style={[
          artStyles.workoutPillTop,
          {
            backgroundColor: tokens.isDark ? 'rgba(48, 209, 88, 0.14)' : tokens.status.successDim,
            borderColor: 'rgba(48, 209, 88, 0.35)',
          },
        ]}
      >
        <Flame size={12} strokeWidth={2.2} color={green} />
        <Text style={[artStyles.workoutPillText, { color: green }]}>
          ACTIVE SESSION · PUSH A
        </Text>
      </View>

      <View style={artStyles.chronometerWrap}>
        <Svg width={DIAL_SIZE} height={DIAL_SIZE} viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}>
          <Defs>
            <RadialGradient id={haloId} cx="50%" cy="50%" rx="48%" ry="48%">
              <Stop offset="0%" stopColor={green} stopOpacity={tokens.isDark ? 0.25 : 0.14} />
              <Stop offset="70%" stopColor={green} stopOpacity={tokens.isDark ? 0.08 : 0.04} />
              <Stop offset="100%" stopColor={green} stopOpacity={0} />
            </RadialGradient>
            <SvgLinearGradient id={arcGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#4ADE80" />
              <Stop offset="100%" stopColor={green} />
            </SvgLinearGradient>
          </Defs>

          <Circle cx={DIAL_CENTER} cy={DIAL_CENTER} r={90} fill={`url(#${haloId})`} />

          <G rotation={-90} origin={`${DIAL_CENTER},${DIAL_CENTER}`}>
            <Circle
              cx={DIAL_CENTER}
              cy={DIAL_CENTER}
              r={OUTER_R}
              stroke={trackStroke}
              strokeWidth={4.5}
              fill="none"
            />
            <AnimatedSvgCircle
              cx={DIAL_CENTER}
              cy={DIAL_CENTER}
              r={OUTER_R}
              stroke={`url(#${arcGradId})`}
              strokeWidth={4.5}
              strokeLinecap="round"
              strokeDasharray={OUTER_C}
              animatedProps={arcProps}
              fill="none"
            />
          </G>

          <Circle
            cx={DIAL_CENTER}
            cy={DIAL_CENTER}
            r={INNER_DIAL_R}
            fill={dialBg}
            stroke={tokens.isDark ? 'rgba(255,255,255,0.08)' : tokens.border.subtle}
            strokeWidth={1}
          />

          <Circle
            cx={DIAL_CENTER}
            cy={DIAL_CENTER}
            r={MINOR_R}
            stroke={minorStroke}
            strokeWidth={2.5}
            strokeDasharray={[0.85, MINOR_C / 60 - 0.85]}
            strokeLinecap="butt"
            rotation={-90}
            origin={`${DIAL_CENTER},${DIAL_CENTER}`}
            fill="none"
          />
          <Circle
            cx={DIAL_CENTER}
            cy={DIAL_CENTER}
            r={MAJOR_R}
            stroke={majorStroke}
            strokeWidth={5.5}
            strokeDasharray={[1.25, MAJOR_C / 12 - 1.25]}
            strokeLinecap="butt"
            rotation={-90}
            origin={`${DIAL_CENTER},${DIAL_CENTER}`}
            fill="none"
          />
          <Circle
            cx={DIAL_CENTER}
            cy={DIAL_CENTER}
            r={CARDINAL_R}
            stroke={green}
            strokeOpacity={0.7}
            strokeWidth={8}
            strokeDasharray={[1.6, CARDINAL_C / 4 - 1.6]}
            strokeLinecap="butt"
            rotation={-90}
            origin={`${DIAL_CENTER},${DIAL_CENTER}`}
            fill="none"
          />
        </Svg>

        <Animated.View style={[StyleSheet.absoluteFillObject, sweepStyle]} pointerEvents="none">
          <Svg width={DIAL_SIZE} height={DIAL_SIZE} viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}>
            <G rotation={-122} origin={`${DIAL_CENTER},${DIAL_CENTER}`}>
              <Circle
                cx={DIAL_CENTER}
                cy={DIAL_CENTER}
                r={SWEEP_R}
                stroke={green}
                strokeOpacity={0.4}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeDasharray={`${SWEEP_TRAIL_LEN} ${SWEEP_C}`}
                fill="none"
              />
            </G>
            <Circle cx={DIAL_CENTER} cy={DIAL_CENTER - SWEEP_R} r={4} fill={green} />
          </Svg>
        </Animated.View>

        <View style={artStyles.orbitCenterLabel} pointerEvents="none">
          <Text style={[artStyles.dialOverline, { color: green }]}>ELAPSED</Text>
          <NumericText style={[artStyles.dialClockText, { color: tokens.text.primary }]}>
            32:18
          </NumericText>
          <NumericText style={[artStyles.dialSubText, { color: tokens.text.secondary }]}>
            14 / 18 sets
          </NumericText>
        </View>
      </View>

      {/* Clean Separated Green Gradient Rest Timer Pill */}
      <View
        style={[
          artStyles.restCardWrap,
          { borderColor: 'rgba(48, 209, 88, 0.35)' },
        ]}
      >
        <LinearGradient
          colors={
            tokens.isDark
              ? ['rgba(20, 40, 27, 0.94)', 'rgba(13, 21, 16, 0.96)']
              : ['#ECFDF5', '#D1FAE5']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={artStyles.restCardGrad}
        >
          <Timer size={14} strokeWidth={2.2} color={green} />
          <View>
            <NumericText style={[artStyles.restTitle, { color: tokens.text.primary }]}>
              01:30 Rest Timer · Next Set
            </NumericText>
            <View style={artStyles.restMiniBarTrack}>
              <LinearGradient
                colors={['#4ADE80', green]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={artStyles.restMiniBarFill}
              />
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
});

const AnimatedScrollView = Animated.ScrollView;

export interface WelcomeHeroStageProps {
  scrollProgressSV: SharedValue<number>;
  onGetStarted: () => void;
  onGoogleSignIn: () => Promise<boolean>;
  authLoading: boolean;
  authError: string;
  onClearAuthError: () => void;
}

export const WelcomeHeroStage: React.FC<WelcomeHeroStageProps> = React.memo(
  function WelcomeHeroStage({
    scrollProgressSV,
    onGetStarted,
    onGoogleSignIn,
    authLoading,
    authError,
    onClearAuthError,
  }) {
    const { tokens, isDark } = useTheme();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const styles = useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);

    const scrollRef = useRef<any>(null);
    const [activeSlide, setActiveSlide] = useState(0);
    const [userInteracted, setUserInteracted] = useState(false);
    const [showSignInSheet, setShowSignInSheet] = useState(false);

    const slideWidth = Math.min(windowWidth, 480);
    const stageHeight = Math.min(315, Math.max(245, Math.round(windowHeight * 0.37)));

    useEffect(() => {
      if (userInteracted || showSignInSheet) return;
      const timer = setInterval(() => {
        setActiveSlide((prev) => {
          const next = (prev + 1) % SLIDES.length;
          scrollRef.current?.scrollTo({ x: next * slideWidth, animated: true });
          return next;
        });
      }, 4200);
      return () => clearInterval(timer);
    }, [userInteracted, showSignInSheet, slideWidth]);

    const handleScroll = useAnimatedScrollHandler({
      onScroll: (e) => {
        if (slideWidth > 0) {
          scrollProgressSV.value = Math.max(0, Math.min(2, e.contentOffset.x / slideWidth));
        }
      },
    });

    const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, slideWidth));
      if (idx >= 0 && idx < SLIDES.length && idx !== activeSlide) {
        hapticSelection();
        setActiveSlide(idx);
      }
    };

    const eyebrowColorStyle = useAnimatedStyle(() => ({
      color: interpolateColor(
        scrollProgressSV.value,
        [0, 1, 2],
        [tokens.accent.primary, tokens.accent.secondary, tokens.status.success]
      ),
    }));

    const ctaBgStyle = useAnimatedStyle(() => ({
      backgroundColor: interpolateColor(
        scrollProgressSV.value,
        [0, 1, 2],
        [tokens.accent.primary, '#0284C7', tokens.status.success]
      ),
    }));

    const ctaTextStyle = useAnimatedStyle(() => ({
      color: interpolateColor(
        scrollProgressSV.value,
        [0, 1, 2],
        [tokens.accent.onPrimary, tokens.accent.onPrimary, tokens.status.onSuccess]
      ),
    }));

    const dot0Style = useAnimatedStyle(() => ({
      width: interpolate(scrollProgressSV.value, [0, 1, 2], [22, 6, 6]),
      backgroundColor: interpolateColor(
        scrollProgressSV.value,
        [0, 0.7, 2],
        [
          tokens.accent.primary,
          isDark ? 'rgba(255,255,255,0.20)' : tokens.border.medium,
          isDark ? 'rgba(255,255,255,0.20)' : tokens.border.medium,
        ]
      ),
    }));

    const dot1Style = useAnimatedStyle(() => ({
      width: interpolate(scrollProgressSV.value, [0, 1, 2], [6, 22, 6]),
      backgroundColor: interpolateColor(
        scrollProgressSV.value,
        [0, 0.3, 1, 1.7, 2],
        [
          isDark ? 'rgba(255,255,255,0.20)' : tokens.border.medium,
          isDark ? 'rgba(255,255,255,0.20)' : tokens.border.medium,
          tokens.accent.secondary,
          isDark ? 'rgba(255,255,255,0.20)' : tokens.border.medium,
          isDark ? 'rgba(255,255,255,0.20)' : tokens.border.medium,
        ]
      ),
    }));

    const dot2Style = useAnimatedStyle(() => ({
      width: interpolate(scrollProgressSV.value, [0, 1, 2], [6, 6, 22]),
      backgroundColor: interpolateColor(
        scrollProgressSV.value,
        [0, 1.3, 2],
        [
          isDark ? 'rgba(255,255,255,0.20)' : tokens.border.medium,
          isDark ? 'rgba(255,255,255,0.20)' : tokens.border.medium,
          tokens.status.success,
        ]
      ),
    }));

    const dotStyles = [dot0Style, dot1Style, dot2Style];
    const currentCopy = SLIDES[activeSlide] || SLIDES[0];

    return (
      <View style={styles.root}>
        {/* Main Centered Visual Stage */}
        <View style={styles.heroStageContainer}>
          <AnimatedScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => setUserInteracted(true)}
            onScroll={handleScroll}
            onMomentumScrollEnd={handleMomentumEnd}
            style={{ width: slideWidth, alignSelf: 'center', flexGrow: 0 }}
          >
            {SLIDES.map((s, idx) => (
              <View key={s.id} style={[styles.slideFrame, { width: slideWidth, height: stageHeight }]}>
                {s.id === 'overload' && (
                  <OverloadCurveArtwork
                    active={activeSlide === idx}
                    slideWidth={slideWidth}
                    stageHeight={stageHeight}
                    tokens={tokens}
                  />
                )}
                {s.id === 'anatomy' && (
                  <MuscleMapArtwork
                    active={activeSlide === idx}
                    slideWidth={slideWidth}
                    stageHeight={stageHeight}
                    tokens={tokens}
                  />
                )}
                {s.id === 'workout' && (
                  <WorkoutTimerOrbitArtwork
                    active={activeSlide === idx}
                    slideWidth={slideWidth}
                    stageHeight={stageHeight}
                    tokens={tokens}
                  />
                )}
              </View>
            ))}
          </AnimatedScrollView>

          <Animated.View key={currentCopy.id} entering={FadeIn.duration(220)} style={styles.copyBlock}>
            <Animated.Text style={[styles.eyebrow, eyebrowColorStyle]}>
              {currentCopy.eyebrow}
            </Animated.Text>
            <Text style={styles.heroTitle}>{currentCopy.title}</Text>
            <Text style={styles.heroSubtitle}>{currentCopy.subtitle}</Text>
          </Animated.View>

          <View style={styles.dotsRow}>
            {SLIDES.map((s, idx) => (
              <TactileButton
                key={s.id}
                variant="custom"
                onPress={() => {
                  hapticSelection();
                  setUserInteracted(true);
                  setActiveSlide(idx);
                  scrollRef.current?.scrollTo({ x: idx * slideWidth, animated: true });
                }}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                accessibilityLabel={`Slide ${idx + 1}`}
              >
                <Animated.View style={[styles.dotPill, dotStyles[idx]]} />
              </TactileButton>
            ))}
          </View>
        </View>

        {/* Pinned Bottom Action Dock */}
        <View style={styles.actionDock}>
          <TactileButton
            variant="custom"
            haptic="medium"
            onPress={onGetStarted}
            style={styles.primaryCtaWrap}
          >
            <Animated.View style={[styles.primaryCtaInner, ctaBgStyle]}>
              <Animated.Text style={[styles.primaryCtaText, ctaTextStyle]}>
                Get Started
              </Animated.Text>
              <ArrowRight
                size={ICON.sm + 1}
                strokeWidth={2.2}
                color={activeSlide === 2 ? tokens.status.onSuccess : tokens.accent.onPrimary}
              />
            </Animated.View>
          </TactileButton>

          <TactileButton
            variant="ghost"
            onPress={() => {
              hapticLight();
              onClearAuthError();
              setShowSignInSheet(true);
            }}
            style={styles.signInLinkRow}
          >
            <Text style={styles.signInPrefix}>
              Already have an account? <Text style={styles.signInAccent}>Sign In</Text>
            </Text>
          </TactileButton>
        </View>

        {/* Clean, Crisp Obsidian Returning Sign-In Sheet (Zero sparkles, zero clutter) */}
        <BottomSheet
          visible={showSignInSheet}
          onClose={() => setShowSignInSheet(false)}
          avoidKeyboard={false}
        >
          <View style={styles.sheetWrap}>
            <View style={styles.sheetTopRow}>
              <View style={{ flex: 1, minWidth: 0, paddingRight: SPACE.md }}>
                <Text style={styles.sheetTitle}>Welcome back</Text>
                <Text style={styles.sheetSubtitle}>
                  Sign in to sync your workouts and saved routines.
                </Text>
              </View>
              <TactileButton
                variant="custom"
                onPress={() => setShowSignInSheet(false)}
                style={styles.sheetCloseBtn}
                hitSlop={TOUCH.hitSlop}
                accessibilityLabel="Close sign in"
              >
                <X size={16} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
              </TactileButton>
            </View>

            {authError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            ) : null}

            <TactileButton
              variant="custom"
              haptic="medium"
              loading={authLoading}
              disabled={authLoading}
              onPress={async () => {
                const ok = await onGoogleSignIn();
                if (ok) setShowSignInSheet(false);
              }}
              style={styles.googleSheetBtn}
            >
              <View style={styles.googleBtnInner}>
                {/* Crisp Official Multi-Tone Google G Mark */}
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-8.97z"
                  />
                  <Path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                  />
                  <Path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                  />
                  <Path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                  />
                </Svg>
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </View>
            </TactileButton>
          </View>
        </BottomSheet>
      </View>
    );
  }
);

const artStyles = StyleSheet.create({
  overloadWrap: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  },
  overloadTopStrip: {
    width: '100%',
    paddingHorizontal: SPACE.lg + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  prPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  benchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  telemetrySep: {
    width: 1,
    height: 11,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  columnStage: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    position: 'relative',
  },
  floatingChipText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    includeFontPadding: false,
  },
  telemetryMain: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    includeFontPadding: false,
  },
  telemetryAccent: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    includeFontPadding: false,
  },
  recoveryBadgeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  readinessHighlight: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    includeFontPadding: false,
  },
  bodyDualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  recoveryBarsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  recoveryBarCol: {
    width: 66,
    gap: 4,
  },
  recoveryBarName: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 10.5,
    includeFontPadding: false,
  },
  recoveryBarTrack: {
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  recoveryBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  workoutPillTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  workoutPillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    letterSpacing: 0.7,
    includeFontPadding: false,
  },
  chronometerWrap: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitCenterLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialOverline: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    letterSpacing: 1.2,
    marginBottom: 2,
    includeFontPadding: false,
  },
  dialClockText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 28,
    letterSpacing: -0.8,
    includeFontPadding: false,
  },
  dialSubText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    marginTop: 2,
    includeFontPadding: false,
  },
  restCardWrap: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  restCardGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  restTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11.5,
    marginBottom: 4,
    includeFontPadding: false,
  },
  restMiniBarTrack: {
    width: 132,
    height: 3.5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  restMiniBarFill: {
    width: '72%',
    height: '100%',
    borderRadius: 999,
  },
});

const makeStyles = (tokens: ThemeTokens, isDark: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'space-between',
      paddingBottom: SPACE.xs,
    },
    heroStageContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    slideFrame: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    copyBlock: {
      paddingHorizontal: SPACE.lg + 4,
      alignItems: 'center',
      marginTop: SPACE.sm,
      marginBottom: SPACE.md,
    },
    eyebrow: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 11,
      letterSpacing: 1.4,
      marginBottom: 6,
      includeFontPadding: false,
    },
    heroTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 27,
      lineHeight: 32,
      letterSpacing: -0.7,
      color: tokens.text.primary,
      textAlign: 'center',
      marginBottom: 6,
      includeFontPadding: false,
    },
    heroSubtitle: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 14,
      lineHeight: 20,
      color: tokens.text.secondary,
      textAlign: 'center',
      maxWidth: 315,
    },
    dotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginBottom: SPACE.sm,
    },
    dotPill: {
      height: 6,
      borderRadius: 999,
    },
    actionDock: {
      paddingHorizontal: SPACE.lg + 4,
      gap: 2,
    },
    primaryCtaWrap: {
      borderRadius: 14,
      overflow: 'hidden',
    },
    primaryCtaInner: {
      height: 48,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    primaryCtaText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
      includeFontPadding: false,
    },
    signInLinkRow: {
      minHeight: 42,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signInPrefix: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 13.5,
      color: tokens.text.secondary,
      includeFontPadding: false,
    },
    signInAccent: {
      fontFamily: FONT_FAMILY.bold,
      color: tokens.accent.primary,
    },
    /* ── Clean Obsidian Returning Sign-In Sheet ── */
    sheetWrap: {
      paddingTop: SPACE.xs,
      paddingBottom: SPACE.md,
    },
    sheetTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: SPACE.lg + 2,
    },
    sheetTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 20,
      color: tokens.text.primary,
      letterSpacing: -0.4,
      includeFontPadding: false,
    },
    sheetSubtitle: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 13.5,
      lineHeight: 19,
      color: tokens.text.secondary,
      marginTop: 4,
    },
    sheetCloseBtn: {
      width: 34,
      height: 34,
      borderRadius: 999,
      backgroundColor: isDark ? '#14161D' : tokens.bg.elevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.border.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorBanner: {
      backgroundColor: tokens.status.dangerDim,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: SPACE.md,
    },
    errorText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12.5,
      color: tokens.status.danger,
    },
    googleSheetBtn: {
      height: 50,
      borderRadius: 14,
      backgroundColor: isDark ? '#14161D' : tokens.bg.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255,255,255,0.14)' : tokens.border.medium,
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleBtnInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 11,
    },
    googleBtnText: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 15,
      color: tokens.text.primary,
      includeFontPadding: false,
    },
  });
