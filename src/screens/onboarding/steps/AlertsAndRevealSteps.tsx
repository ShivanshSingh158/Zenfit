import React, { useEffect, useId, useMemo, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Bell, CheckCircle2, Clock, Rocket, Settings, ShieldCheck } from 'lucide-react-native';
import {
  AnimatedSvgCircle,
  NumericText,
  TactileButton,
} from '../../../components/ui';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { STATIC_BODY_SVG } from '../../../components/Gym/metrics/muscleMapSvgCache';
import { PlanSynthesisLoader } from '../components/PlanSynthesisLoader';
import { FirstWorkoutPreviewData } from '../onboardingPlanBuilder';
import { useTheme } from '../../../contexts/ThemeContext';
import { hapticMedium, hapticSuccess } from '../../../utils/haptics';
import { FONT_FAMILY, SPACE, ThemeTokens } from '../../../theme/tokens';

/* ── Sculpted Animated Ringing Bell + Workout-Green Timer Capsule ──────── */
const ActiveBellHero = React.memo(function ActiveBellHero({ tokens }: { tokens: ThemeTokens }) {
  const uid = useId().replace(/:/g, '_');
  const haloId = `bellGreenHalo_${uid}`;
  const bellFillGradId = `bellFillGrad_${uid}`;
  const ringStrokeGradId = `bellRingGrad_${uid}`;

  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const bellSwing = useSharedValue(0);
  const waveOpacity = useSharedValue(0.3);
  const barScale = useSharedValue(0.35);

  useEffect(() => {
    ring1.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease) }), -1, false);
    ring2.value = withDelay(1200, withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease) }), -1, false));

    // Gentle chime pendulum swing every ~2.6s
    bellSwing.value = withRepeat(
      withSequence(
        withTiming(11, { duration: 110, easing: Easing.out(Easing.quad) }),
        withTiming(-10, { duration: 130, easing: Easing.inOut(Easing.quad) }),
        withTiming(7, { duration: 130, easing: Easing.inOut(Easing.quad) }),
        withTiming(-5, { duration: 130, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 160, easing: Easing.out(Easing.quad) }),
        withDelay(1800, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );

    waveOpacity.value = withRepeat(
      withSequence(
        withTiming(0.95, { duration: 350 }),
        withTiming(0.25, { duration: 550 }),
        withDelay(1560, withTiming(0.25, { duration: 0 }))
      ),
      -1,
      false
    );

    barScale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) }),
        withDelay(600, withTiming(0.35, { duration: 500 }))
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(ring1);
      cancelAnimation(ring2);
      cancelAnimation(bellSwing);
      cancelAnimation(waveOpacity);
      cancelAnimation(barScale);
    };
  }, [ring1, ring2, bellSwing, waveOpacity, barScale]);

  const ring1Props = useAnimatedProps(() => ({
    r: 42 + ring1.value * 44,
    opacity: (1 - ring1.value) * 0.45,
  }));

  const ring2Props = useAnimatedProps(() => ({
    r: 42 + ring2.value * 44,
    opacity: (1 - ring2.value) * 0.45,
  }));

  const bellSwingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bellSwing.value}deg` }],
  }));

  const waveStyle = useAnimatedStyle(() => ({
    opacity: waveOpacity.value,
  }));

  const timerFillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -156 * (1 - barScale.value) }],
  }));

  const green = tokens.status.success;

  return (
    <View style={bellStyles.heroColumn}>
      {/* Upper Visual: Pulsing Radar + Sculpted Ringing Bell SVG */}
      <View style={bellStyles.radarStage}>
        <Svg width={200} height={184} viewBox="0 0 200 184">
          <Defs>
            <RadialGradient id={haloId} cx="50%" cy="50%" rx="46%" ry="46%">
              <Stop offset="0%" stopColor={green} stopOpacity={tokens.isDark ? 0.28 : 0.14} />
              <Stop offset="68%" stopColor={green} stopOpacity={tokens.isDark ? 0.08 : 0.04} />
              <Stop offset="100%" stopColor={green} stopOpacity={0} />
            </RadialGradient>
            <SvgLinearGradient id={ringStrokeGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#4ADE80" />
              <Stop offset="100%" stopColor={green} />
            </SvgLinearGradient>
          </Defs>

          <Circle cx={100} cy={92} r={86} fill={`url(#${haloId})`} />

          <AnimatedSvgCircle
            cx={100}
            cy={92}
            fill="none"
            stroke="#4ADE80"
            strokeWidth={1.6}
            animatedProps={ring1Props}
          />
          <AnimatedSvgCircle
            cx={100}
            cy={92}
            fill="none"
            stroke={green}
            strokeWidth={1.6}
            animatedProps={ring2Props}
          />

          <Circle
            cx={100}
            cy={92}
            r={42}
            fill={tokens.isDark ? 'rgba(13, 28, 19, 0.85)' : tokens.status.successDim}
            stroke={`url(#${ringStrokeGradId})`}
            strokeWidth={1.8}
          />
        </Svg>

        {/* Animated Sound Wave Arcs */}
        <Animated.View style={[StyleSheet.absoluteFillObject, bellStyles.centerWrap, waveStyle]} pointerEvents="none">
          <Svg width={120} height={120} viewBox="0 0 120 120">
            <Path
              d="M27 42 C20 50, 20 64, 27 72"
              fill="none"
              stroke="#4ADE80"
              strokeWidth={2.2}
              strokeLinecap="round"
            />
            <Path
              d="M93 42 C100 50, 100 64, 93 72"
              fill="none"
              stroke="#4ADE80"
              strokeWidth={2.2}
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>

        {/* Sculpted Gradient Bell SVG */}
        <Animated.View style={[bellStyles.bellPivot, bellSwingStyle]} pointerEvents="none">
          <Svg width={46} height={46} viewBox="0 0 48 48">
            <Defs>
              <SvgLinearGradient id={bellFillGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#86EFAC" />
                <Stop offset="55%" stopColor="#4ADE80" />
                <Stop offset="100%" stopColor={green} />
              </SvgLinearGradient>
            </Defs>
            {/* Top Finial */}
            <Circle cx={24} cy={7.5} r={2.5} fill="#86EFAC" />
            {/* Sculpted Bell Dome */}
            <Path
              d="M24 10 C16.5 10, 12 15.6, 12 23.2 L12 29.5 C12 31.6, 10.6 33.4, 8.8 34.4 C8.2 34.8, 8.4 35.8, 9.2 35.8 L38.8 35.8 C39.6 35.8, 39.8 34.8, 39.2 34.4 C37.4 33.4, 36 31.6, 36 29.5 L36 23.2 C36 15.6, 31.5 10, 24 10 Z"
              fill={`url(#${bellFillGradId})`}
            />
            {/* Gloss Highlight */}
            <Path
              d="M17.2 17 C16 19, 15.6 21.5, 15.6 24.5"
              fill="none"
              stroke="rgba(255,255,255,0.48)"
              strokeWidth={2}
              strokeLinecap="round"
            />
            {/* Clapper */}
            <Path
              d="M20.5 36.8 C20.9 39.1, 22.3 40.4, 24 40.4 C25.7 40.4, 27.1 39.1, 27.5 36.8"
              fill="#4ADE80"
            />
          </Svg>
        </Animated.View>
      </View>

      {/* Cleanly Separated Emerald Gradient Rest Timer Capsule (Zero Collision!) */}
      <View style={[bellStyles.previewChipWrap, { borderColor: 'rgba(48, 209, 88, 0.36)' }]}>
        <LinearGradient
          colors={
            tokens.isDark
              ? ['rgba(20, 42, 28, 0.94)', 'rgba(13, 21, 16, 0.96)']
              : ['#ECFDF5', '#D1FAE5']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={bellStyles.previewChipGrad}
        >
          <Clock size={15} strokeWidth={2.2} color={green} />
          <View>
            <NumericText style={[bellStyles.previewChipText, { color: tokens.text.primary }]}>
              01:30 · Rest over — Next set
            </NumericText>
            <View style={bellStyles.miniGreenTrack}>
              <Animated.View style={[bellStyles.miniGreenFillWrap, timerFillStyle]}>
                <LinearGradient
                  colors={['#4ADE80', green]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
});

/* ── Real Expressive Sad Emoji Hero (Triggered on Notification Denial) ─── */
const SadEmojiHero = React.memo(function SadEmojiHero({ tokens }: { tokens: ThemeTokens }) {
  const uid = useId().replace(/:/g, '_');
  const sadHaloId = `sadHalo_${uid}`;

  const wobble = useSharedValue(0);
  const breathe = useSharedValue(1);
  const floatY = useSharedValue(0);

  useEffect(() => {
    wobble.value = withSequence(
      withTiming(-9, { duration: 100 }),
      withTiming(8, { duration: 110 }),
      withTiming(-6, { duration: 110 }),
      withTiming(3, { duration: 120 }),
      withTiming(0, { duration: 140 }),
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 1700, easing: Easing.inOut(Easing.ease) }),
          withTiming(4, { duration: 1700, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    breathe.value = withRepeat(
      withSequence(
        withTiming(1.07, { duration: 1450, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.97, { duration: 1450, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    floatY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(4, { duration: 1600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    return () => {
      cancelAnimation(wobble);
      cancelAnimation(breathe);
      cancelAnimation(floatY);
    };
  }, [wobble, breathe, floatY]);

  const emojiAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value },
      { rotate: `${wobble.value}deg` },
      { scale: breathe.value },
    ] as const,
  }));

  const amber = tokens.status.warning;

  return (
    <View style={bellStyles.sadStage}>
      <Svg width={240} height={200} viewBox="0 0 240 200">
        <Defs>
          <RadialGradient id={sadHaloId} cx="50%" cy="50%" rx="48%" ry="48%">
            <Stop offset="0%" stopColor={amber} stopOpacity={tokens.isDark ? 0.24 : 0.12} />
            <Stop offset="58%" stopColor={amber} stopOpacity={tokens.isDark ? 0.08 : 0.04} />
            <Stop offset="100%" stopColor={amber} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={120} cy={100} r={96} fill={`url(#${sadHaloId})`} />
      </Svg>

      <Animated.View style={[bellStyles.emojiCenterWrap, emojiAnimStyle]} pointerEvents="none">
        <Text style={bellStyles.realSadEmoji}>🥺</Text>
      </Animated.View>
    </View>
  );
});

/* ── Step 7: Alerts & Sad Denial Recovery Flow ─────────────────────────── */
interface AlertsStepProps {
  onRequestPermission: () => Promise<boolean>;
  onResolved: (enabled: boolean) => void;
  onAuraToneChange?: (tone: 'emerald' | 'amber') => void;
}

export const AlertsStep: React.FC<AlertsStepProps> = React.memo(
  function AlertsStep({ onRequestPermission, onResolved, onAuraToneChange }) {
    const { tokens, isDark } = useTheme();
    const styles = useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);

    const [phase, setPhase] = useState<'prompt' | 'denied_nudge' | 'granted'>('prompt');
    const [canAskAgain, setCanAskAgain] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      onAuraToneChange?.(phase === 'denied_nudge' ? 'amber' : 'emerald');
    }, [phase, onAuraToneChange]);

    useEffect(() => {
      if (phase !== 'denied_nudge') return;
      const sub = AppState.addEventListener('change', async (nextState) => {
        if (nextState === 'active') {
          try {
            const perm = await Notifications.getPermissionsAsync();
            if (perm.status === 'granted') {
              hapticSuccess();
              setPhase('granted');
              setTimeout(() => onResolved(true), 650);
            } else {
              setCanAskAgain(perm.canAskAgain ?? false);
            }
          } catch (_) {}
        }
      });
      return () => sub.remove();
    }, [phase, onResolved]);

    const handleEnablePress = async () => {
      if (loading) return;
      setLoading(true);
      try {
        if (phase === 'denied_nudge' && !canAskAgain) {
          await Linking.openSettings().catch(() => {});
          return;
        }

        const granted = await onRequestPermission();
        if (granted) {
          hapticSuccess();
          setPhase('granted');
          setTimeout(() => onResolved(true), 550);
          return;
        }

        try {
          const perm = await Notifications.getPermissionsAsync();
          setCanAskAgain(perm.canAskAgain ?? false);
        } catch {
          setCanAskAgain(false);
        }
        hapticMedium();
        setPhase('denied_nudge');
      } finally {
        setLoading(false);
      }
    };

    const handleSoftDecline = async () => {
      try {
        const perm = await Notifications.getPermissionsAsync();
        setCanAskAgain(perm.canAskAgain ?? true);
      } catch {
        setCanAskAgain(true);
      }
      hapticMedium();
      setPhase('denied_nudge');
    };

    if (phase === 'granted') {
      return (
        <Animated.View entering={FadeIn.duration(220)} style={styles.centerStage}>
          <View style={styles.grantedCircle}>
            <CheckCircle2 size={38} strokeWidth={2.2} color={tokens.status.success} />
          </View>
          <Text style={styles.grantedTitle}>Workout alerts active</Text>
          <Text style={styles.grantedSub}>Rest cues and training reminders locked in.</Text>
        </Animated.View>
      );
    }

    if (phase === 'denied_nudge') {
      return (
        <Animated.View entering={FadeInDown.duration(260)} style={styles.root}>
          <View style={styles.heroWrap}>
            <SadEmojiHero tokens={tokens} />
          </View>

          <View style={styles.copyCenter}>
            <Text style={styles.sadEyebrow}>REST ALERTS OFF</Text>
            <Text style={styles.titleCenter}>
              {canAskAgain
                ? "Don't leave your gains in silence."
                : 'Training without a rest cue?'}
            </Text>
            <Text style={styles.subtitleCenter}>
              {canAskAgain
                ? 'One quiet ping when rest ends stops accidental 6-minute scrolling between sets. Turn alerts back on?'
                : 'Open Settings to unlock rest countdowns and training-day nudges—your future PRs will feel the difference.'}
            </Text>
          </View>

          <View style={styles.actionsBottom}>
            <TactileButton
              variant="custom"
              haptic="medium"
              loading={loading}
              disabled={loading}
              onPress={handleEnablePress}
              style={[styles.primaryCta, { backgroundColor: tokens.status.warning }]}
            >
              <View style={styles.btnInner}>
                {canAskAgain ? (
                  <Bell size={16} strokeWidth={2.2} color="#09090B" />
                ) : (
                  <Settings size={16} strokeWidth={2.2} color="#09090B" />
                )}
                <Text style={[styles.primaryCtaText, { color: '#09090B' }]}>
                  {canAskAgain ? 'Turn Alerts On' : 'Open Settings to Enable'}
                </Text>
              </View>
            </TactileButton>

            <TactileButton
              variant="ghost"
              onPress={() => onResolved(false)}
              style={styles.ghostLinkBtn}
            >
              <Text style={styles.ghostLinkText}>Skip anyway, I'll risk it</Text>
            </TactileButton>
          </View>
        </Animated.View>
      );
    }

    return (
      <View style={styles.root}>
        <View style={styles.heroWrap}>
          <ActiveBellHero tokens={tokens} />
        </View>

        <View style={styles.copyCenter}>
          <Text style={styles.emeraldEyebrow}>REST & WORKOUT CUES</Text>
          <Text style={styles.titleCenter}>Stay locked in between sets</Text>
          <Text style={styles.subtitleCenter}>
            Audible rest countdowns in your earphones and one quiet reminder on training days.
          </Text>
        </View>

        <View style={styles.actionsBottom}>
          <TactileButton
            variant="custom"
            haptic="medium"
            loading={loading}
            disabled={loading}
            onPress={handleEnablePress}
            style={styles.emeraldCtaWrap}
          >
            <LinearGradient
              colors={['#4ADE80', tokens.status.success]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emeraldCtaGrad}
            >
              <Bell size={16} strokeWidth={2.2} color={tokens.status.onSuccess} />
              <Text style={[styles.primaryCtaText, { color: tokens.status.onSuccess }]}>
                Enable Workout Alerts
              </Text>
            </LinearGradient>
          </TactileButton>

          <TactileButton
            variant="ghost"
            onPress={handleSoftDecline}
            style={styles.ghostLinkBtn}
          >
            <Text style={styles.ghostLinkText}>Not now</Text>
          </TactileButton>
        </View>
      </View>
    );
  }
);

/* ── Step 8: Synthesis Loader -> Flagship Athlete Card + Cloud Backup ─── */
const PASS_HIGHLIGHT_MUSCLES = new Set(['chest', 'deltoids', 'abs', 'quadriceps', 'biceps']);
const PASS_DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const HeroPassAnatomy = React.memo(function HeroPassAnatomy({
  gender,
  tokens,
}: {
  gender: 'male' | 'female';
  tokens: ThemeTokens;
}) {
  const uid = useId().replace(/:/g, '_');
  const haloId = `passBodyHalo_${uid}`;
  const frontView = STATIC_BODY_SVG[gender].front;
  const inertFill = tokens.isDark ? 'rgba(255,255,255,0.13)' : 'rgba(9,9,11,0.11)';
  const baseMuscle = tokens.isDark ? 'rgba(255,255,255,0.17)' : 'rgba(9,9,11,0.14)';

  const breath = useSharedValue(1);
  useEffect(() => {
    breath.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    return () => cancelAnimation(breath);
  }, [breath]);

  const bodyScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }],
  }));

  return (
    <View style={heroAnatomyStyles.stage}>
      <Svg width={116} height={190} viewBox="0 0 116 190" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={haloId} cx="50%" cy="46%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={tokens.accent.primary} stopOpacity={tokens.isDark ? 0.24 : 0.14} />
            <Stop offset="65%" stopColor="#5AC8FA" stopOpacity={tokens.isDark ? 0.06 : 0.03} />
            <Stop offset="100%" stopColor={tokens.accent.primary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={58} cy={88} r={56} fill={`url(#${haloId})`} />
      </Svg>

      <Animated.View style={bodyScaleStyle}>
        <Svg viewBox={frontView.vb} width={96} height={172}>
          <G>
            <Path d={frontView.inertD} fill={inertFill} />
            {frontView.slugs.map((slug) => {
              const d = frontView.paths[slug];
              if (!d) return null;
              const lit = PASS_HIGHLIGHT_MUSCLES.has(slug);
              return (
                <Path
                  key={`hero-${gender}-${slug}`}
                  d={d}
                  fill={lit ? tokens.accent.primary : baseMuscle}
                />
              );
            })}
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
});

const heroAnatomyStyles = StyleSheet.create({
  stage: {
    width: 112,
    height: 186,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});

interface RevealStepProps {
  displayName: string;
  photoURL: string | null;
  gender: 'male' | 'female';
  age: number;
  heightDisplay: string;
  weightDisplay: string;
  bmi: number;
  goalLabel: string;
  splitName: string;
  firstWorkout: FirstWorkoutPreviewData;
  isGoogleSignedIn: boolean;
  googleEmail?: string | null;
  savingProfile: boolean;
  authLoading: boolean;
  authError: string;
  onLinkGoogle: () => void;
  onFinishGuestOrSignedIn: () => void;
}

export const RevealStep: React.FC<RevealStepProps> = React.memo(
  function RevealStep({
    displayName,
    photoURL,
    gender,
    age,
    heightDisplay,
    weightDisplay,
    bmi,
    goalLabel,
    splitName,
    firstWorkout,
    isGoogleSignedIn,
    googleEmail,
    savingProfile,
    authLoading,
    authError,
    onLinkGoogle,
    onFinishGuestOrSignedIn,
  }) {
    const { tokens, isDark } = useTheme();
    const styles = useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);
    const [synthesizing, setSynthesizing] = useState(true);

    const sheenX = useSharedValue(-160);
    const cardFloat = useSharedValue(0);

    useEffect(() => {
      if (synthesizing) return;

      sheenX.value = withRepeat(
        withSequence(
          withTiming(-160, { duration: 0 }),
          withDelay(450, withTiming(440, { duration: 1700, easing: Easing.inOut(Easing.ease) })),
          withDelay(3600, withTiming(440, { duration: 10 }))
        ),
        -1,
        false
      );

      cardFloat.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
          withTiming(2, { duration: 2400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      return () => {
        cancelAnimation(sheenX);
        cancelAnimation(cardFloat);
      };
    }, [synthesizing, sheenX, cardFloat]);

    const sheenAnimStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: sheenX.value }, { rotate: '18deg' }] as const,
    }));

    const cardFloatStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: cardFloat.value }],
    }));

    if (synthesizing) {
      return (
        <PlanSynthesisLoader
          splitTitle={splitName}
          onComplete={() => {
            hapticSuccess();
            setSynthesizing(false);
          }}
        />
      );
    }

    return (
      <Animated.View entering={FadeInDown.duration(320)} style={styles.revealRoot}>
        {/* Clean Borderless Hero Header */}
        <View style={styles.revealHeader}>
          <View style={styles.readyEyebrowRow}>
            <View style={styles.liveBeaconDot} />
            <Text style={styles.readyBadgeText}>READY TO LIFT</Text>
          </View>

          <Text style={styles.revealTitle}>Your plan is ready</Text>
          <Text style={styles.revealSub} numberOfLines={1}>
            Built for {goalLabel.toLowerCase()} · {splitName}
          </Text>
        </View>

        {/* Signature Clean Obsidian Athlete Membership Card */}
        <Animated.View style={[styles.cardCenterStage, cardFloatStyle]}>
          <LinearGradient
            colors={[
              'rgba(90, 200, 250, 0.42)',
              'rgba(10, 132, 255, 0.24)',
              'rgba(255, 255, 255, 0.08)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.passBorder}
          >
            <View style={styles.passSurface}>
              <Animated.View style={[styles.passSheenWrap, sheenAnimStyle]} pointerEvents="none">
                <LinearGradient
                  colors={['rgba(255,255,255,0)', 'rgba(90,200,250,0.06)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.passSheenGrad}
                />
              </Animated.View>

              <View style={styles.cardSplitRow}>
                {/* Left Column: Clean Athlete Bio & Program Specs */}
                <View style={styles.cardLeftCol}>
                  <View style={styles.passIdentityRow}>
                    <UserAvatar
                      size={44}
                      photoURL={photoURL}
                      fallbackLetter={(displayName || 'A').slice(0, 1).toUpperCase()}
                    />
                    <View style={styles.passNameCol}>
                      <Text style={styles.passName} numberOfLines={1}>
                        {displayName || 'Athlete'}
                      </Text>
                      <NumericText style={styles.passStats} numberOfLines={1}>
                        {age}y · {heightDisplay} · {weightDisplay}
                      </NumericText>
                    </View>
                  </View>

                  <View style={styles.metricBlock}>
                    <Text style={styles.metricOverline}>PROGRAM</Text>
                    <Text style={styles.metricHeadline} numberOfLines={1}>
                      {splitName}
                    </Text>
                    <NumericText style={styles.metricSub} numberOfLines={1}>
                      {firstWorkout.trainingDaysCount} days/wk · BMI {bmi.toFixed(1)}
                    </NumericText>
                  </View>

                  <View style={styles.cardHairline} />

                  <View>
                    <Text style={styles.dayOneOverline}>DAY 1 · UP NEXT</Text>
                    <Text style={styles.dayOneTitle} numberOfLines={1}>
                      {firstWorkout.workoutName}
                    </Text>
                    <NumericText style={styles.dayOneMeta} numberOfLines={1}>
                      {firstWorkout.exerciseCount} exercises · ~{firstWorkout.estimatedMinutes} min
                    </NumericText>
                  </View>
                </View>

                {/* Right Column: Floating Illuminated Anatomy Silhouette */}
                <HeroPassAnatomy gender={gender} tokens={tokens} />
              </View>

              {/* Calm Pill-Free 7-Day Schedule Dots */}
              <View style={styles.weekDotsFooter}>
                <Text style={styles.weekDotsOverline}>SCHEDULE</Text>
                <View style={styles.weekDotsRow}>
                  {PASS_DAY_LETTERS.map((ltr, idx) => {
                    const active = firstWorkout.trainingMask[idx];
                    return (
                      <View key={`${ltr}-${idx}`} style={styles.weekDayCol}>
                        <Text
                          style={[
                            styles.weekDayLetter,
                            { color: active ? tokens.text.primary : tokens.text.muted },
                          ]}
                        >
                          {ltr}
                        </Text>
                        <View
                          style={[
                            styles.weekDayIndicator,
                            {
                              backgroundColor: active
                                ? tokens.accent.primary
                                : isDark
                                ? 'rgba(255,255,255,0.10)'
                                : tokens.border.subtle,
                            },
                          ]}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <View>
          {authError ? <Text style={styles.authErrorText}>{authError}</Text> : null}

          <View style={styles.actionsBottom}>
            <TactileButton
              variant="custom"
              haptic="medium"
              loading={savingProfile}
              disabled={savingProfile || authLoading}
              onPress={onFinishGuestOrSignedIn}
              style={styles.startCtaWrap}
            >
              <LinearGradient
                colors={['#2589FF', tokens.accent.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startCtaGrad}
              >
                <Rocket size={16} strokeWidth={2.2} color={tokens.accent.onPrimary} />
                <Text style={styles.primaryCtaText}>Start Lifting</Text>
              </LinearGradient>
            </TactileButton>

            {isGoogleSignedIn ? (
              <View style={styles.syncedFooterRow}>
                <ShieldCheck size={14} strokeWidth={2.2} color={tokens.status.success} />
                <Text style={styles.syncedFooterText} numberOfLines={1}>
                  Backed up to {googleEmail || 'Google'}
                </Text>
              </View>
            ) : (
              <TactileButton
                variant="custom"
                haptic="light"
                loading={authLoading}
                disabled={savingProfile || authLoading}
                onPress={onLinkGoogle}
                style={styles.googleBackupBtn}
              >
                <View style={styles.btnInner}>
                  <Svg width={16} height={16} viewBox="0 0 24 24">
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
                  <Text style={styles.googleBackupText}>Back up with Google</Text>
                </View>
              </TactileButton>
            )}
          </View>
        </View>
      </Animated.View>
    );
  }
);

const bellStyles = StyleSheet.create({
  heroColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  radarStage: {
    width: 200,
    height: 184,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellPivot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewChipWrap: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  previewChipGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  previewChipText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12.5,
    marginBottom: 5,
    includeFontPadding: false,
  },
  miniGreenTrack: {
    width: 156,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  miniGreenFillWrap: {
    width: 156,
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  sadStage: {
    width: 240,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emojiCenterWrap: {
    position: 'absolute',
    minWidth: 140,
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  realSadEmoji: {
    fontSize: 96,
    lineHeight: 112,
    textAlign: 'center',
    includeFontPadding: false,
  },
});

const makeStyles = (tokens: ThemeTokens, isDark: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'space-between',
      paddingTop: SPACE.xs,
    },
    heroWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copyCenter: {
      alignItems: 'center',
      paddingHorizontal: SPACE.sm,
      marginBottom: SPACE.lg,
    },
    emeraldEyebrow: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 11,
      letterSpacing: 1.2,
      color: tokens.status.success,
      marginBottom: 6,
      includeFontPadding: false,
    },
    sadEyebrow: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 11,
      letterSpacing: 1.2,
      color: tokens.status.warning,
      marginBottom: 6,
      includeFontPadding: false,
    },
    titleCenter: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 25,
      lineHeight: 30,
      letterSpacing: -0.55,
      color: tokens.text.primary,
      textAlign: 'center',
      marginBottom: 8,
      includeFontPadding: false,
    },
    subtitleCenter: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 14.5,
      lineHeight: 20.5,
      color: tokens.text.secondary,
      textAlign: 'center',
      maxWidth: 320,
    },
    actionsBottom: {
      gap: SPACE.xs + 2,
      paddingBottom: SPACE.xs,
    },
    primaryCta: {
      height: 48,
      borderRadius: 14,
      backgroundColor: tokens.accent.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emeraldCtaWrap: {
      borderRadius: 14,
      overflow: 'hidden',
    },
    emeraldCtaGrad: {
      height: 48,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    btnInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    primaryCtaText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
      color: tokens.accent.onPrimary,
      includeFontPadding: false,
    },
    ghostLinkBtn: {
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghostLinkText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 13.5,
      color: tokens.text.secondary,
    },
    centerStage: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: SPACE.xxl,
    },
    grantedCircle: {
      width: 72,
      height: 72,
      borderRadius: 999,
      backgroundColor: tokens.status.successDim,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACE.md,
    },
    grantedTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 22,
      color: tokens.text.primary,
      marginBottom: 4,
    },
    grantedSub: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 14,
      color: tokens.text.secondary,
    },

    /* ── Athlete Pass Reveal ── */
    revealRoot: {
      flex: 1,
      justifyContent: 'space-between',
      paddingTop: SPACE.xs,
    },
    revealHeader: {
      marginBottom: SPACE.sm,
    },
    readyEyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginBottom: 6,
    },
    liveBeaconDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: tokens.status.success,
    },
    readyBadgeText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 11,
      letterSpacing: 1.1,
      color: tokens.status.success,
      includeFontPadding: false,
    },
    revealTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 28,
      letterSpacing: -0.7,
      color: tokens.text.primary,
      marginBottom: 4,
      includeFontPadding: false,
    },
    revealSub: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 14.5,
      color: tokens.text.secondary,
    },
    cardCenterStage: {
      flex: 1,
      justifyContent: 'center',
      paddingVertical: SPACE.sm,
    },
    passBorder: {
      borderRadius: 24,
      padding: 1.2,
    },
    passSurface: {
      backgroundColor: isDark ? '#0B0D13' : tokens.bg.surface,
      borderRadius: 23,
      paddingHorizontal: SPACE.lg,
      paddingTop: SPACE.lg,
      paddingBottom: SPACE.md + 2,
      overflow: 'hidden',
      position: 'relative',
    },
    passSheenWrap: {
      position: 'absolute',
      top: -60,
      bottom: -60,
      width: 110,
    },
    passSheenGrad: {
      flex: 1,
    },
    cardSplitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.sm,
    },
    cardLeftCol: {
      flex: 1,
      minWidth: 0,
      gap: SPACE.md + 2,
    },
    passIdentityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
    passNameCol: {
      flex: 1,
      minWidth: 0,
    },
    passName: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 19,
      color: tokens.text.primary,
      letterSpacing: -0.35,
      includeFontPadding: false,
    },
    passStats: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12.5,
      color: tokens.text.secondary,
      marginTop: 3,
    },
    metricBlock: {
      gap: 3,
    },
    metricOverline: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 9.5,
      letterSpacing: 0.9,
      color: tokens.text.muted,
      includeFontPadding: false,
    },
    metricHeadline: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 17.5,
      color: tokens.text.primary,
      letterSpacing: -0.25,
      includeFontPadding: false,
    },
    metricSub: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12.5,
      color: tokens.accent.primary,
    },
    cardHairline: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : tokens.border.subtle,
    },
    dayOneOverline: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 9.5,
      letterSpacing: 0.9,
      color: tokens.status.success,
      marginBottom: 3,
      includeFontPadding: false,
    },
    dayOneTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 16.5,
      color: tokens.text.primary,
      includeFontPadding: false,
    },
    dayOneMeta: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12.5,
      color: tokens.text.secondary,
      marginTop: 3,
    },
    weekDotsFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: SPACE.lg,
      paddingTop: SPACE.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : tokens.border.subtle,
    },
    weekDotsOverline: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 9.5,
      letterSpacing: 0.9,
      color: tokens.text.muted,
      includeFontPadding: false,
    },
    weekDotsRow: {
      flexDirection: 'row',
      gap: 13,
    },
    weekDayCol: {
      alignItems: 'center',
      gap: 5,
    },
    weekDayLetter: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 11,
      includeFontPadding: false,
    },
    weekDayIndicator: {
      width: 14,
      height: 3.5,
      borderRadius: 999,
    },
    startCtaWrap: {
      borderRadius: 14,
      overflow: 'hidden',
    },
    startCtaGrad: {
      height: 49,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    googleBackupBtn: {
      height: 46,
      borderRadius: 14,
      backgroundColor: isDark ? '#0F1015' : tokens.bg.surface,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.14)' : tokens.border.medium,
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleBackupText: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 14,
      color: tokens.text.primary,
      includeFontPadding: false,
    },
    syncedFooterRow: {
      minHeight: 42,
      borderRadius: 14,
      backgroundColor: tokens.status.successDim,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 14,
    },
    syncedFooterText: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 13,
      color: tokens.status.success,
    },
    authErrorText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12.5,
      color: tokens.status.danger,
      textAlign: 'center',
      marginBottom: SPACE.xs,
    },
  });
