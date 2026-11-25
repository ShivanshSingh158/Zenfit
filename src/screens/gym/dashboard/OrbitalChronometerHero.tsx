import React, { useEffect, useId, useMemo, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  Check,
  ChevronRight,
  FastForward,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';
import { ICON, ThemeTokens } from '../../../theme/tokens';
import { useResponsiveMetrics } from '../../../theme/responsive';
import { hapticLight } from '../../../utils/haptics';
import { TactileButton } from '../../../components/ui/TactileButton';
import { NumericText } from '../../../components/ui/NumericText';
import { AnimatedSvgCircle } from '../../../components/ui/AnimatedSvgCharts';
import { makeDashboardStyles } from './gymDashboardStyles';
import { formatWeight, useWeightUnit } from '../../../utils/weightUnit';

const ORBIT_SIZE = 192;
const ORBIT_CENTER = ORBIT_SIZE / 2;
const ORBIT_STROKE = 4.5;
const ORBIT_RADIUS = 88;
const ORBIT_CIRCUMFERENCE = 2 * Math.PI * ORBIT_RADIUS;
const DIAL_RADIUS = 80;
const SWEEP_RADIUS = 74.5;
const SWEEP_CIRCUMFERENCE = 2 * Math.PI * SWEEP_RADIUS;
const SWEEP_TRAIL_DEGREES = 28;
const SWEEP_TRAIL_LENGTH = (SWEEP_CIRCUMFERENCE * SWEEP_TRAIL_DEGREES) / 360;
const SWEEP_TRAIL_ROTATION = -90 - SWEEP_TRAIL_DEGREES;

// Concentric dashed tick rings (replaces 60 individual SVG <Line> nodes per mount)
const MINOR_TICK_R = 66.25;
const MINOR_TICK_C = 2 * Math.PI * MINOR_TICK_R;
const MINOR_TICK_DASH = 0.85;
const MINOR_TICK_GAP = MINOR_TICK_C / 60 - MINOR_TICK_DASH;
const MINOR_TICK_ROT = -90 - (MINOR_TICK_DASH / MINOR_TICK_C) * 180;

const MAJOR_TICK_R = 64.75;
const MAJOR_TICK_C = 2 * Math.PI * MAJOR_TICK_R;
const MAJOR_TICK_DASH = 1.25;
const MAJOR_TICK_GAP = MAJOR_TICK_C / 12 - MAJOR_TICK_DASH;
const MAJOR_TICK_ROT = -90 - (MAJOR_TICK_DASH / MAJOR_TICK_C) * 180;

const CARDINAL_TICK_R = 63.5;
const CARDINAL_TICK_C = 2 * Math.PI * CARDINAL_TICK_R;
const CARDINAL_TICK_DASH = 1.6;
const CARDINAL_TICK_GAP = CARDINAL_TICK_C / 4 - CARDINAL_TICK_DASH;
const CARDINAL_TICK_ROT = -90 - (CARDINAL_TICK_DASH / CARDINAL_TICK_C) * 180;

export interface OrbitalChronometerHeroProps {
  isScreenFocused?: boolean;
  isInProgress: boolean;
  isCompleted: boolean;
  isRestDay: boolean;
  activeStartMs: any;
  workoutName: string;
  exercises: any[];
  totalSets: number;
  heroWorkoutSubtitle: string;
  effectiveLog: any;
  sessionReceipt: {
    tonnage: number;
    duration: number;
    setsCount: number;
    xp: number;
  };
  onStartWorkout: () => void;
  onResumeWorkout: () => void;
  onFinishWorkout: () => void;
  onBrowseWorkouts: () => void;
  onOpenPreview: () => void;
  onViewSummary: () => void;
  onRevertWorkout: () => void;
  tokens: ThemeTokens;
  styles: ReturnType<typeof makeDashboardStyles>;
}

const OrbitalClockDigits = React.memo(function OrbitalClockDigits({
  startTime,
  isRunning,
  color,
  style,
}: {
  startTime: any;
  isRunning: boolean;
  color: string;
  style: any;
}) {
  const [elapsed, setElapsed] = useState(() => {
    if (!startTime) return 0;
    return Math.max(0, Math.floor((Date.now() - Number(startTime)) / 1000));
  });

  useEffect(() => {
    if (!startTime) {
      setElapsed(0);
      return;
    }
    const update = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - Number(startTime)) / 1000)));
    };
    update();
    if (!isRunning) return;
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime, isRunning]);

  const formatted = useMemo(() => {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}:${remMins < 10 ? '0' : ''}${remMins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, [elapsed]);

  return (
    <NumericText
      style={[style, { color }]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.72}
    >
      {formatted}
    </NumericText>
  );
});

const OrbitalProgressRing = React.memo(function OrbitalProgressRing({
  activeStartMs,
  isRunning,
  doneSets,
  plannedSets,
  tokens,
  styles,
}: {
  activeStartMs: any;
  isRunning: boolean;
  doneSets: number;
  plannedSets: number;
  tokens: ThemeTokens;
  styles: ReturnType<typeof makeDashboardStyles>;
}) {
  const { orbitSize } = useResponsiveMetrics();
  const uid = useId().replace(/:/g, '_');
  const haloGradId = `chronoHalo_${uid}`;
  const arcGradId = `chronoArc_${uid}`;

  const ratio = plannedSets > 0 ? Math.min(1, doneSets / plannedSets) : 0;
  const visualRatio = doneSets > 0 ? Math.max(0.025, ratio) : 0;

  const ringProgress = useSharedValue(visualRatio);
  const initialPhaseMs = activeStartMs
    ? Math.max(0, Date.now() - Number(activeStartMs)) % 60000
    : 0;
  const sweepDeg = useSharedValue((initialPhaseMs / 60000) * 360);

  useEffect(() => {
    ringProgress.value = withTiming(visualRatio, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    });
  }, [visualRatio, ringProgress]);

  useEffect(() => {
    cancelAnimation(sweepDeg);
    const phaseMs = activeStartMs
      ? Math.max(0, Date.now() - Number(activeStartMs)) % 60000
      : 0;
    const baseDeg = (phaseMs / 60000) * 360;
    sweepDeg.value = baseDeg;
    if (!isRunning) {
      return;
    }
    sweepDeg.value = withRepeat(
      withTiming(baseDeg + 360, { duration: 60000, easing: Easing.linear }),
      -1,
      false
    );
    return () => {
      cancelAnimation(sweepDeg);
    };
  }, [activeStartMs, isRunning, sweepDeg]);

  const arcAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: ORBIT_CIRCUMFERENCE * (1 - ringProgress.value),
  }));

  const sweepRotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sweepDeg.value}deg` }],
  }));

  const dialBg = tokens.isDark ? '#07090D' : '#FFFFFF';
  const dialRimStroke = tokens.isDark
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(9, 9, 11, 0.08)';
  const trackStroke = tokens.isDark
    ? 'rgba(255, 255, 255, 0.07)'
    : 'rgba(9, 9, 11, 0.07)';
  const minorTickStroke = tokens.isDark
    ? 'rgba(255, 255, 255, 0.13)'
    : 'rgba(9, 9, 11, 0.11)';
  const majorTickStroke = tokens.isDark
    ? 'rgba(255, 255, 255, 0.30)'
    : 'rgba(9, 9, 11, 0.26)';

  return (
    <View style={[styles.orbitalWrapper, { width: orbitSize, height: orbitSize }]}>
      <Svg
        width={orbitSize}
        height={orbitSize}
        viewBox={`0 0 ${ORBIT_SIZE} ${ORBIT_SIZE}`}
      >
        <Defs>
          <RadialGradient id={haloGradId} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop
              offset="74%"
              stopColor={tokens.status.success}
              stopOpacity={tokens.isDark ? 0.22 : 0.12}
            />
            <Stop offset="100%" stopColor={tokens.status.success} stopOpacity="0" />
          </RadialGradient>
          <SvgLinearGradient id={arcGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#4ADE80" />
            <Stop offset="100%" stopColor={tokens.status.success} />
          </SvgLinearGradient>
        </Defs>

        {/* Subtle exterior bezel glow (outside the recessed dial) */}
        <Circle
          cx={ORBIT_CENTER}
          cy={ORBIT_CENTER}
          r={ORBIT_CENTER - 1}
          fill={`url(#${haloGradId})`}
        />

        {/* Outer workout completion track & active set arc */}
        <G rotation={-90} origin={`${ORBIT_CENTER},${ORBIT_CENTER}`}>
          <Circle
            cx={ORBIT_CENTER}
            cy={ORBIT_CENTER}
            r={ORBIT_RADIUS}
            stroke={trackStroke}
            strokeWidth={ORBIT_STROKE}
            fill="none"
          />
          {doneSets > 0 && (
            <AnimatedSvgCircle
              cx={ORBIT_CENTER}
              cy={ORBIT_CENTER}
              r={ORBIT_RADIUS}
              stroke={`url(#${arcGradId})`}
              strokeWidth={ORBIT_STROKE}
              strokeLinecap="round"
              strokeDasharray={ORBIT_CIRCUMFERENCE}
              animatedProps={arcAnimatedProps}
              fill="none"
            />
          )}
        </G>

        {/* Crisp Recessed Obsidian Chronograph Dial */}
        <Circle
          cx={ORBIT_CENTER}
          cy={ORBIT_CENTER}
          r={DIAL_RADIUS}
          fill={dialBg}
          stroke={dialRimStroke}
          strokeWidth={1}
        />

        {/* 60 Precision Watch Bezel Ticks (3 concentric dashed circles = 57 fewer SVG nodes) */}
        <Circle
          cx={ORBIT_CENTER}
          cy={ORBIT_CENTER}
          r={MINOR_TICK_R}
          stroke={minorTickStroke}
          strokeWidth={2.5}
          strokeDasharray={[MINOR_TICK_DASH, MINOR_TICK_GAP]}
          strokeLinecap="butt"
          rotation={MINOR_TICK_ROT}
          origin={`${ORBIT_CENTER},${ORBIT_CENTER}`}
          fill="none"
        />
        <Circle
          cx={ORBIT_CENTER}
          cy={ORBIT_CENTER}
          r={MAJOR_TICK_R}
          stroke={majorTickStroke}
          strokeWidth={5.5}
          strokeDasharray={[MAJOR_TICK_DASH, MAJOR_TICK_GAP]}
          strokeLinecap="butt"
          rotation={MAJOR_TICK_ROT}
          origin={`${ORBIT_CENTER},${ORBIT_CENTER}`}
          fill="none"
        />
        <Circle
          cx={ORBIT_CENTER}
          cy={ORBIT_CENTER}
          r={CARDINAL_TICK_R}
          stroke={tokens.status.success}
          strokeOpacity={0.62}
          strokeWidth={8}
          strokeDasharray={[CARDINAL_TICK_DASH, CARDINAL_TICK_GAP]}
          strokeLinecap="butt"
          rotation={CARDINAL_TICK_ROT}
          origin={`${ORBIT_CENTER},${ORBIT_CENTER}`}
          fill="none"
        />
      </Svg>

      {/* Continuous 60fps 60-Second Sweep Hand & Luminous Bezel Pip */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, sweepRotateStyle]}
      >
        <Svg
          width={orbitSize}
          height={orbitSize}
          viewBox={`0 0 ${ORBIT_SIZE} ${ORBIT_SIZE}`}
        >
          <G rotation={SWEEP_TRAIL_ROTATION} origin={`${ORBIT_CENTER},${ORBIT_CENTER}`}>
            <Circle
              cx={ORBIT_CENTER}
              cy={ORBIT_CENTER}
              r={SWEEP_RADIUS}
              stroke={tokens.status.success}
              strokeOpacity={0.38}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeDasharray={`${SWEEP_TRAIL_LENGTH} ${SWEEP_CIRCUMFERENCE}`}
              fill="none"
            />
          </G>
          <Circle
            cx={ORBIT_CENTER}
            cy={ORBIT_CENTER - SWEEP_RADIUS}
            r={4.2}
            fill={tokens.status.success}
            fillOpacity={0.28}
          />
          <Circle
            cx={ORBIT_CENTER}
            cy={ORBIT_CENTER - SWEEP_RADIUS}
            r={2.2}
            fill="#FFFFFF"
            stroke={tokens.status.success}
            strokeWidth={1.2}
          />
        </Svg>
      </Animated.View>

      {/* Crisp Center Digital Readout (Zero 'LIVE' label) */}
      <View style={styles.orbitalCenterContent} pointerEvents="none">
        <Text style={[styles.orbitalStatusText, { color: tokens.text.muted }]}>
          ELAPSED
        </Text>

        <OrbitalClockDigits
          startTime={activeStartMs}
          isRunning={isRunning}
          color={tokens.text.primary}
          style={styles.orbitalClockText}
        />

        <View style={styles.orbitalCenterDivider} />

        <NumericText style={styles.orbitalSetsText}>
          <Text
            style={doneSets > 0 ? { color: tokens.status.success } : { color: tokens.text.primary }}
          >
            {doneSets}
          </Text>
          /{plannedSets} sets
        </NumericText>
      </View>
    </View>
  );
});

export const OrbitalChronometerHero: React.FC<OrbitalChronometerHeroProps> =
  React.memo(function OrbitalChronometerHero({
    isScreenFocused = true,
    isInProgress,
    isCompleted,
    isRestDay,
    activeStartMs,
    workoutName,
    exercises,
    totalSets,
    heroWorkoutSubtitle,
    effectiveLog,
    sessionReceipt,
    onStartWorkout,
    onResumeWorkout,
    onFinishWorkout,
    onBrowseWorkouts,
    onOpenPreview,
    onViewSummary,
    onRevertWorkout,
    tokens,
    styles,
  }) {
    const unitIsLbs = useWeightUnit();
    const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');

    useEffect(() => {
      const sub = AppState.addEventListener('change', (nextState) => {
        setIsAppActive(nextState === 'active');
      });
      return () => sub.remove();
    }, []);

    const isOrbitalRunning = isScreenFocused && isAppActive;

    const formattedTonnage = useMemo(() => {
      return formatWeight(sessionReceipt.tonnage, unitIsLbs, 0);
    }, [sessionReceipt.tonnage, unitIsLbs]);

    const liveProgressInfo = useMemo(() => {
      if (!isInProgress) {
        return { doneSets: 0, plannedSets: 0, activeExerciseName: '', activeSetMeta: '' };
      }
      const logExs =
        Array.isArray(effectiveLog?.exercises) && effectiveLog.exercises.length > 0
          ? effectiveLog.exercises
          : exercises;

      let doneSets = 0;
      let plannedSets = 0;
      let activeExerciseName = '';
      let activeSetMeta = '';

      for (const ex of logExs) {
        const sets = Array.isArray(ex?.setsLog) ? ex.setsLog : [];
        const exTotal = sets.length || Number(ex?.targetSets) || 3;
        plannedSets += exTotal;

        let exDone = 0;
        for (const s of sets) {
          if (s?.completed) exDone += 1;
        }
        doneSets += exDone;

        if (!activeExerciseName && exDone < exTotal && ex?.name) {
          const nextSetNum = Math.min(exTotal, exDone + 1);
          activeExerciseName = ex.name;
          activeSetMeta = `Set ${nextSetNum} of ${exTotal}`;
        }
      }

      if (!plannedSets) plannedSets = Math.max(1, totalSets);
      if (!activeExerciseName) {
        if (doneSets >= plannedSets && plannedSets > 0) {
          activeExerciseName = 'All Sets Completed';
          activeSetMeta = `${doneSets} sets logged · Ready to finish`;
        } else if (logExs.length > 0 && logExs[0]?.name) {
          activeExerciseName = logExs[0].name;
          activeSetMeta = `${logExs.length} exercises queued`;
        } else {
          activeExerciseName = 'Workout In Progress';
          activeSetMeta = `${doneSets}/${plannedSets} sets`;
        }
      }

      return { doneSets, plannedSets, activeExerciseName, activeSetMeta };
    }, [isInProgress, effectiveLog?.exercises, exercises, totalSets]);

    const stageSheenColors = useMemo(() => {
      if (isCompleted) {
        return tokens.isDark
          ? (['rgba(48, 209, 88, 0.14)', 'rgba(48, 209, 88, 0.02)', 'rgba(15, 16, 21, 0.0)'] as const)
          : (['rgba(22, 163, 74, 0.10)', 'rgba(22, 163, 74, 0.02)', 'rgba(255, 255, 255, 0.0)'] as const);
      }
      return tokens.isDark
        ? (['rgba(10, 132, 255, 0.14)', 'rgba(10, 132, 255, 0.02)', 'rgba(15, 16, 21, 0.0)'] as const)
        : (['rgba(10, 132, 255, 0.09)', 'rgba(10, 132, 255, 0.01)', 'rgba(255, 255, 255, 0.0)'] as const);
    }, [isCompleted, tokens.isDark]);

    if (isInProgress) {
      return (
        <View style={styles.orbitalHeroContainer}>
          <OrbitalProgressRing
            activeStartMs={activeStartMs}
            isRunning={isOrbitalRunning}
            doneSets={liveProgressInfo.doneSets}
            plannedSets={liveProgressInfo.plannedSets}
            tokens={tokens}
            styles={styles}
          />

          <View style={styles.orbitalTextCol}>
            <View style={styles.orbitalExerciseTitleRow}>
              <View
                style={[
                  styles.orbitalNextDot,
                  { backgroundColor: tokens.status.success },
                ]}
              />
              <Text style={styles.orbitalWorkoutName} numberOfLines={1}>
                {liveProgressInfo.activeExerciseName}
              </Text>
            </View>
            <NumericText style={styles.orbitalCurrentLift} numberOfLines={1}>
              {liveProgressInfo.activeSetMeta}
            </NumericText>
          </View>

          <View style={styles.liveActionsRow}>
            <TactileButton
              variant="custom"
              haptic="success"
              onPress={onResumeWorkout}
              size="lg"
              style={[styles.primaryResumeBtn, { flex: 1, minWidth: 0 }]}
            >
              <FastForward
                size={16}
                color={tokens.status.onSuccess}
                strokeWidth={ICON.strokeWidth}
              />
              <Text
                style={styles.primaryResumeBtnText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
                maxFontSizeMultiplier={1.2}
              >
                Resume Session
              </Text>
            </TactileButton>

            <TactileButton
              variant="surface"
              haptic="medium"
              size="lg"
              onPress={onFinishWorkout}
              style={styles.quickFinishBtn}
            >
              <Check
                size={15}
                color={tokens.text.primary}
                strokeWidth={ICON.strokeWidth}
              />
              <Text
                style={styles.quickFinishBtnText}
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
              >
                Finish
              </Text>
            </TactileButton>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.missionCard}>
        <LinearGradient
          colors={stageSheenColors}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {isCompleted ? (
          <View style={styles.stateContainer}>
            <View style={styles.completedHeaderRow}>
              <View style={styles.completedCheckCircle}>
                <Check
                  size={14}
                  color={tokens.status.onSuccess}
                  strokeWidth={ICON.strokeWidth}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.completedTitle} numberOfLines={1}>
                  {workoutName} Complete
                </Text>
                <NumericText style={styles.completedSubtitle}>
                  Session banked today · +{sessionReceipt.xp} XP
                </NumericText>
              </View>
            </View>

            <View style={styles.completedMetricsStrip}>
              <View style={styles.completedMetricItem}>
                <NumericText style={styles.completedMetricVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {sessionReceipt.tonnage > 0 ? formattedTonnage : `0 ${unitIsLbs ? 'lbs' : 'kg'}`}
                </NumericText>
                <Text style={styles.completedMetricLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>Tonnage</Text>
              </View>

              <View style={styles.metricItemDivider} />

              <View style={styles.completedMetricItem}>
                <NumericText style={styles.completedMetricVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {sessionReceipt.duration}m
                </NumericText>
                <Text style={styles.completedMetricLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>Duration</Text>
              </View>

              <View style={styles.metricItemDivider} />

              <View style={styles.completedMetricItem}>
                <NumericText
                  style={[styles.completedMetricVal, { color: tokens.status.success }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {sessionReceipt.setsCount}
                </NumericText>
                <Text style={styles.completedMetricLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>Sets Logged</Text>
              </View>
            </View>

            <View style={styles.completedActionsRow}>
              <TactileButton
                variant="custom"
                onPress={onViewSummary}
                style={styles.completedBreakdownBtn}
              >
                <Text style={styles.completedBreakdownText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  View Receipt
                </Text>
                <ChevronRight
                  size={14}
                  color={tokens.text.primary}
                  strokeWidth={ICON.strokeWidth}
                />
              </TactileButton>

              <TactileButton
                variant="custom"
                onPress={onRevertWorkout}
                style={styles.completedRevertBtn}
              >
                <RotateCcw
                  size={13}
                  color={tokens.text.secondary}
                  strokeWidth={ICON.strokeWidth}
                />
                <Text style={styles.completedRevertText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  Revert
                </Text>
              </TactileButton>
            </View>
          </View>
        ) : isRestDay ? (
          <View style={styles.stateContainer}>
            <View style={styles.missionHeaderRow}>
              <View style={styles.eyebrowDotRow}>
                <View
                  style={[styles.eyebrowDot, { backgroundColor: tokens.status.success }]}
                />
                <Text style={[styles.missionCardEyebrow, { color: tokens.status.success }]}>
                  ACTIVE RECOVERY
                </Text>
              </View>
            </View>

            <Text style={styles.heroWorkoutTitle} numberOfLines={1}>
              Rest & Rebuild
            </Text>

            <Text style={styles.targetMusclesText}>
              Scheduled recovery window. Light walking, mobility, or browse custom splits anytime.
            </Text>

            <TactileButton
              variant="surface"
              size="lg"
              onPress={onBrowseWorkouts}
              style={styles.primaryStartBtn}
            >
              <Sparkles
                size={15}
                color={tokens.accent.primary}
                strokeWidth={ICON.strokeWidth}
              />
              <Text style={[styles.primaryStartBtnText, { color: tokens.text.primary }]} numberOfLines={1}>
                Browse Train Splits
              </Text>
            </TactileButton>
          </View>
        ) : (
          <View style={styles.stateContainer}>
            <Pressable
              onPress={() => {
                hapticLight();
                onOpenPreview();
              }}
              style={({ pressed }) => [
                styles.heroPressableArea,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={styles.missionHeaderRow}>
                <Text style={styles.missionCardEyebrow}>TODAY'S WORKOUT</Text>

                <View style={styles.heroPreviewLink}>
                  <Text style={styles.heroPreviewLinkText}>Lineup</Text>
                  <ChevronRight
                    size={12}
                    color={tokens.accent.primary}
                    strokeWidth={ICON.strokeWidth}
                  />
                </View>
              </View>

              <Text style={styles.heroWorkoutTitle} numberOfLines={1}>
                {workoutName}
              </Text>

              <NumericText style={styles.targetMusclesText} numberOfLines={1}>
                {heroWorkoutSubtitle}
              </NumericText>
            </Pressable>

            <TactileButton
              variant="primary"
              haptic="success"
              onPress={onStartWorkout}
              size="lg"
              style={styles.primaryStartBtn}
            >
              <Play
                size={15}
                color={tokens.accent.onPrimary}
                strokeWidth={ICON.strokeWidth}
              />
              <Text style={styles.primaryStartBtnText} numberOfLines={1}>Start Workout</Text>
            </TactileButton>
          </View>
        )}
      </View>
    );
  });

export default OrbitalChronometerHero;
