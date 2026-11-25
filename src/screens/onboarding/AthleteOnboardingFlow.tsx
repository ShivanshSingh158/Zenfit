/**
 * AthleteOnboardingFlow.tsx — ZenFit
 *
 * Flagship First-Time Athlete Onboarding Experience:
 * - Pitch-black OLED dark canvas (#09090B) with Volt athletic accents
 * - 100% offline-first, fast, clean human language
 * - Intelligent Athlete Calibration across Welcome, Identity, Biometrics, Goals, Split, Alerts & Card Reveal
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import {
  Activity,
  ArrowLeftRight,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Dumbbell,
  Flame,
  Gauge,
  RefreshCw,
  Rocket,
  Ruler,
  ShieldCheck,
  TrendingUp,
  Trophy,
  User,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { COLLECTION } from '../../config/constants';
import { useCoreData } from '../../contexts/domains/CoreDataContext';
import { useGymProfile, GymProfile, PROFILE_STORAGE_KEY } from '../../hooks/useGymProfile';
import { setL1Sync, ONBOARDING_FLOW_KEY } from '../../utils/bootManifest';
import { requestNotificationPermissions } from '../../services/notifications';
import { computeAthleteCardStats } from '../../services/athleteCardService';
import { ScreenWrapper, TactileButton, NumericText, AnimatedProgressBar } from '../../components/ui';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { useTheme } from '../../contexts/ThemeContext';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../theme/tokens';

interface AthleteOnboardingFlowProps {
  onComplete: () => void;
}

type OnboardingStep =
  | 'welcome'
  | 'identity'
  | 'biometrics'
  | 'goals'
  | 'split'
  | 'notifications'
  | 'reveal';

const STEPS_ORDER: OnboardingStep[] = [
  'welcome',
  'identity',
  'biometrics',
  'goals',
  'split',
  'notifications',
  'reveal',
];

const GOAL_OPTIONS: {
  id: 'hypertrophy' | 'strength' | 'fat_loss' | 'athletic' | 'recomp';
  label: string;
  desc: string;
  Icon: LucideIcon;
}[] = [
  { id: 'hypertrophy', label: 'Hypertrophy & Growth', desc: 'Build muscle size and shape (8-12 reps)', Icon: Dumbbell },
  { id: 'strength', label: 'Maximum Strength', desc: 'Lift heavier on compound lifts (3-6 reps)', Icon: Trophy },
  { id: 'fat_loss', label: 'Fat Loss & Conditioning', desc: 'Burn fat while keeping muscle (12-15 reps)', Icon: Flame },
  { id: 'athletic', label: 'Athletic Performance', desc: 'Build speed, power, and movement capacity', Icon: Zap },
  { id: 'recomp', label: 'Body Recomposition', desc: 'Build muscle and lose fat at the same time', Icon: RefreshCw },
];

export default function AthleteOnboardingFlow({ onComplete }: AthleteOnboardingFlowProps) {
  const { tokens } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isNarrow = windowWidth < 360;
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { user, performGoogleSignIn, continueAsGuest } = useCoreData();
  const { gymProfile, saveGymProfile } = useGymProfile();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = STEPS_ORDER[currentStepIndex];

  // ─── Step 1: Identity & Name ──────────────────────────────────────────────
  const [athleteName, setAthleteName] = useState(
    gymProfile?.displayName || user?.displayName || ''
  );
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  React.useEffect(() => {
    if (user?.displayName && !athleteName) {
      setAthleteName(user.displayName);
    }
  }, [user]);

  // ─── Step 2: Biometrics ───────────────────────────────────────────────────
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [heightCm, setHeightCm] = useState(
    gymProfile?.heightCm ? String(gymProfile.heightCm) : '178'
  );
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('10');

  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [weightKg, setWeightKg] = useState(
    gymProfile?.weightKg || gymProfile?.bodyweightKg
      ? String(gymProfile.weightKg || gymProfile.bodyweightKg)
      : '75'
  );
  const [weightLbs, setWeightLbs] = useState('165');

  const [gender, setGender] = useState<'male' | 'female'>(
    gymProfile?.gender === 'female' ? 'female' : 'male'
  );

  const numericHeightCm = useMemo(() => {
    if (heightUnit === 'cm') {
      return parseFloat(heightCm) || 178;
    }
    const ft = parseFloat(heightFt) || 0;
    const inc = parseFloat(heightIn) || 0;
    return Math.round((ft * 12 + inc) * 2.54) || 178;
  }, [heightUnit, heightCm, heightFt, heightIn]);

  const numericWeightKg = useMemo(() => {
    if (weightUnit === 'kg') {
      return parseFloat(weightKg) || 75;
    }
    const lbs = parseFloat(weightLbs) || 165;
    return Math.round((lbs / 2.20462) * 10) / 10 || 75;
  }, [weightUnit, weightKg, weightLbs]);

  const bmi = useMemo(() => {
    const hM = numericHeightCm / 100;
    if (hM <= 0 || numericWeightKg <= 0) return 22.5;
    return Math.round((numericWeightKg / (hM * hM)) * 10) / 10;
  }, [numericHeightCm, numericWeightKg]);

  const bmiClassification = useMemo(() => {
    if (bmi < 18.5) return 'Lean';
    if (bmi < 24.9) return 'Athletic';
    if (bmi < 29.9) return 'Solid Mass';
    return 'Heavy Mass';
  }, [bmi]);

  // ─── Step 3: Goals & Experience ───────────────────────────────────────────
  const [trainingGoal, setTrainingGoal] = useState<'hypertrophy' | 'strength' | 'fat_loss' | 'athletic' | 'recomp'>('hypertrophy');
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');

  // ─── Step 4: Schedule & Split ─────────────────────────────────────────────
  const [daysPerWeek, setDaysPerWeek] = useState<number>(4);
  const [splitPreference, setSplitPreference] = useState<'ppl' | 'arnold' | 'upper_lower' | 'full_body'>('ppl');

  // ─── Step 5: Notifications State ──────────────────────────────────────────
  const [requestingNotifs, setRequestingNotifs] = useState(false);

  // ─── Finalizing & Persisting ──────────────────────────────────────────────
  const [savingProfile, setSavingProfile] = useState(false);

  const goToNextStep = () => {
    if (currentStepIndex < STEPS_ORDER.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await performGoogleSignIn();
      if (res.success && res.user) {
        const uid = res.user.uid;

        try {
          const profileDoc = await getDoc(doc(db, COLLECTION.USER_PROFILES, uid));
          if (profileDoc.exists()) {
            const data = profileDoc.data();
            const existingProf = data?.gymProfile || data;
            if (
              existingProf?.onboardingCompleted ||
              (existingProf?.heightCm && existingProf?.weightKg) ||
              existingProf?.goal
            ) {
              await AsyncStorage.setItem('zenfit_onboarding_flow_done_v3', 'true');
              await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(existingProf));
              setL1Sync(ONBOARDING_FLOW_KEY, true);
              setL1Sync(PROFILE_STORAGE_KEY, existingProf);
              onComplete();
              return;
            }
          }
        } catch (cloudErr) {
          console.warn('[Onboarding] Error checking returning profile:', cloudErr);
        }

        try {
          const logsQuery = query(
            collection(db, COLLECTION.GYM_LOGS),
            where('userId', '==', uid),
            limit(1)
          );
          const logsSnap = await getDocs(logsQuery);
          if (!logsSnap.empty) {
            await AsyncStorage.setItem('zenfit_onboarding_flow_done_v3', 'true');
            setL1Sync(ONBOARDING_FLOW_KEY, true);
            onComplete();
            return;
          }
        } catch (logsErr) {
          console.warn('[Onboarding] Error checking existing logs:', logsErr);
        }

        if (res.user.displayName) {
          setAthleteName(res.user.displayName);
        }
        goToNextStep();
      } else if (!res.cancelled) {
        setAuthError(res.error || 'Google Sign-in could not be completed.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication error occurred.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGuestContinue = () => {
    continueAsGuest().catch(() => {});
    goToNextStep();
  };

  const handleEnableNotifications = async () => {
    setRequestingNotifs(true);
    try {
      await requestNotificationPermissions();
    } catch (_) {
      // Graceful fallback
    } finally {
      setRequestingNotifs(false);
      goToNextStep();
    }
  };

  const handleFinalizeOnboarding = async () => {
    setSavingProfile(true);
    try {
      const finalName = athleteName.trim() || user?.displayName || 'Athlete';
      const updatedProfile: Partial<GymProfile> = {
        displayName: finalName,
        heightCm: numericHeightCm,
        weightKg: numericWeightKg,
        bodyweightKg: numericWeightKg,
        gender,
        goal: trainingGoal,
        primaryGoal: trainingGoal,
        experience: experienceLevel,
        daysPerWeek,
        splitPreference,
        autoTimer: true,
        hapticsEnabled: true,
        audioCues: true,
        onboardingCompleted: true,
      };

      await saveGymProfile(updatedProfile);

      const todayDate = new Date().toISOString().slice(0, 10);
      const initialWeightEntry = {
        id: `weight_onboarding_${todayDate}`,
        weight: numericWeightKg,
        weightKg: numericWeightKg,
        date: todayDate,
      };
      await AsyncStorage.setItem('zenfit_onboarding_flow_done_v3', 'true');
      await AsyncStorage.setItem('zenfit_initial_weight_seeded_v1', JSON.stringify(initialWeightEntry));

      onComplete();
    } catch (e) {
      console.warn('[Onboarding] Error saving profile:', e);
      onComplete();
    } finally {
      setSavingProfile(false);
    }
  };

  const previewStats = useMemo(() => {
    if (currentStep !== 'reveal') {
      return {
        tierLabel: 'Tier I Athlete',
        archetype: 'Strength',
        photoURL: user?.photoURL || null,
        displayName: athleteName.trim() || user?.displayName || 'Athlete',
        weightFormatted: `${numericWeightKg} kg`,
        heightFormatted: `${numericHeightCm} cm`,
        bmi: 22.5,
        goalLabel: 'Hypertrophy & Growth',
        benchmarks: [],
      } as any;
    }
    try {
      const mockProfile: GymProfile = {
        displayName: athleteName.trim() || user?.displayName || 'Athlete',
        photoURL: user?.photoURL || null,
        heightCm: numericHeightCm,
        weightKg: numericWeightKg,
        gender,
        goal: trainingGoal,
        experience: experienceLevel,
      };
      return computeAthleteCardStats(mockProfile, [], user);
    } catch (e) {
      console.warn('[Onboarding] Error computing preview stats:', e);
      return {
        tierLabel: 'Tier I Athlete',
        archetype: 'Strength',
        photoURL: user?.photoURL || null,
        displayName: athleteName.trim() || user?.displayName || 'Athlete',
        weightFormatted: `${numericWeightKg} kg`,
        heightFormatted: `${numericHeightCm} cm`,
        bmi: 22.5,
        goalLabel: 'Hypertrophy & Growth',
        benchmarks: [],
      } as any;
    }
  }, [currentStep, athleteName, user, numericHeightCm, numericWeightKg, gender, trainingGoal, experienceLevel]);

  const progressPercent = Math.round((currentStepIndex / (STEPS_ORDER.length - 1)) * 100);

  return (
    <ScreenWrapper edges={['top', 'bottom', 'left', 'right']} style={styles.root}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerTopRow}>
          {currentStepIndex > 0 ? (
            <TactileButton
              variant="custom"
              onPress={goToPrevStep}
              style={styles.backButton}
              hitSlop={TOUCH.hitSlop}
              accessibilityLabel="Previous step"
            >
              <ChevronLeft size={ICON.md} strokeWidth={ICON.strokeWidth} color={tokens.text.primary} />
            </TactileButton>
          ) : (
            <View style={{ width: TOUCH.minTarget, height: TOUCH.minTarget }} />
          )}

          <View style={styles.brandRow}>
            <Text style={styles.brandText}>ZENFIT </Text>
            <View style={styles.brandDot} />
          </View>

          <View style={{ width: TOUCH.minTarget }} />
        </View>

        {currentStepIndex > 0 && (
          <AnimatedProgressBar
            progress={progressPercent / 100}
            height={4}
            borderRadius={4}
            durationMs={320}
            color={tokens.accent.primary}
            trackColor={tokens.bg.elevated}
            trackStyle={styles.progressTrack}
          />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ══ STEP 0: WELCOME ══ */}
        {currentStep === 'welcome' && (
          <View style={styles.stepContainer}>
            <Text style={styles.heroTitle}>
              TRACK YOUR LIFTS.{'\n'}BUILD REAL STRENGTH.
            </Text>

            <Text style={styles.heroSubtitle}>
              Log workouts instantly, break personal records, and see your muscle recovery — with zero distractions.
            </Text>

            <View style={styles.pillarsContainer}>
              <View style={styles.pillarCard}>
                <View style={[styles.pillarIconWrap, { backgroundColor: tokens.accent.primaryDim }]}>
                  <TrendingUp size={ICON.md} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
                </View>
                <View style={styles.pillarTextCol}>
                  <Text style={styles.pillarTitle}>Progressive Overload & PRs</Text>
                  <Text style={styles.pillarDesc}>
                    Know what weight to lift next. Track your personal records and 1RM progression automatically.
                  </Text>
                </View>
              </View>

              <View style={styles.pillarCard}>
                <View style={[styles.pillarIconWrap, { backgroundColor: tokens.accent.secondaryDim }]}>
                  <Activity size={ICON.md} strokeWidth={ICON.strokeWidth} color={tokens.accent.secondary} />
                </View>
                <View style={styles.pillarTextCol}>
                  <Text style={styles.pillarTitle}>Muscle Recovery Map</Text>
                  <Text style={styles.pillarDesc}>
                    Visual breakdown of your weekly sets. See which muscles are fresh and which need rest.
                  </Text>
                </View>
              </View>

              <View style={styles.pillarCard}>
                <View style={[styles.pillarIconWrap, { backgroundColor: tokens.status.warningDim }]}>
                  <ArrowLeftRight size={ICON.md} strokeWidth={ICON.strokeWidth} color={tokens.status.warning} />
                </View>
                <View style={styles.pillarTextCol}>
                  <Text style={styles.pillarTitle}>Smart Routines & Easy Swaps</Text>
                  <Text style={styles.pillarDesc}>
                    Follow proven splits (PPL, Arnold, Upper/Lower) and swap busy gym machines with one tap.
                  </Text>
                </View>
              </View>

              <View style={styles.pillarCard}>
                <View style={[styles.pillarIconWrap, { backgroundColor: tokens.status.successDim }]}>
                  <Zap size={ICON.md} strokeWidth={ICON.strokeWidth} color={tokens.status.success} />
                </View>
                <View style={styles.pillarTextCol}>
                  <Text style={styles.pillarTitle}>Fast & 100% Offline</Text>
                  <Text style={styles.pillarDesc}>
                    Instant logging with zero lag. Works in basement gym floors with no signal.
                  </Text>
                </View>
              </View>
            </View>

            <TactileButton variant="custom" onPress={goToNextStep} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText} numberOfLines={1}>Get Started</Text>
              <ArrowRight size={ICON.md - 2} strokeWidth={ICON.strokeWidth} color={tokens.accent.onPrimary} style={{ marginLeft: SPACE.sm }} />
            </TactileButton>

            <TactileButton
              variant="ghost"
              onPress={() => setCurrentStepIndex(1)}
              style={styles.alreadyHaveAccountBtn}
            >
              <Text style={styles.alreadyHaveAccountText}>
                Already have an account? <Text style={styles.signInLinkText}>Sign In</Text>
              </Text>
            </TactileButton>

            <Text style={styles.footerGuaranteesText}>
              Fast · Private · Works Offline
            </Text>
          </View>
        )}

        {/* ══ STEP 1: ATHLETE IDENTITY & AUTH ══ */}
        {currentStep === 'identity' && (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionHeaderTitle}>YOUR PROFILE</Text>
            <Text style={styles.sectionHeaderSubtitle}>
              Sign in with Google to sync workouts, or continue as a private guest.
            </Text>

            <TactileButton
              variant="custom"
              haptic="medium"
              loading={authLoading}
              onPress={handleGoogleSignIn}
              style={[styles.googleAuthBtn, authLoading && { opacity: 0.7 }]}
              disabled={authLoading}
            >
              <View style={styles.googleAuthInner}>
                <Svg width={17} height={17} viewBox="0 0 24 24" style={{ marginRight: SPACE.sm + 2 }}>
                  <Path
                    fill={tokens.text.primary}
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  />
                </Svg>
                <Text style={styles.googleAuthBtnText}>
                  {user
                    ? `Signed in as ${user.displayName || user.email}`
                    : 'Continue with Google'}
                </Text>
              </View>
            </TactileButton>

            {authError ? (
              <Text style={styles.authErrorText}>{authError}</Text>
            ) : null}

            <View style={styles.orDividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.orText}>OR CONTINUE AS GUEST</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.inputCard}>
              <Text style={styles.inputFieldLabel}>ATHLETE NAME</Text>
              <View style={styles.inputFieldRow}>
                <User size={ICON.md - 2} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} style={{ marginRight: SPACE.sm + 2 }} />
                <TextInput
                  style={styles.textInputField}
                  value={athleteName}
                  onChangeText={setAthleteName}
                  placeholder="Enter your name (e.g. Alex)"
                  placeholderTextColor={tokens.text.muted}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
              </View>
            </View>

            <TactileButton
              variant="custom"
              haptic="medium"
              onPress={user ? goToNextStep : handleGuestContinue}
              style={[styles.primaryBtn, { marginTop: SPACE.lg }]}
            >
              <Text style={styles.primaryBtnText}>
                {user ? 'Continue' : 'Continue as Guest'}
              </Text>
              <ArrowRight size={ICON.md - 2} strokeWidth={ICON.strokeWidth} color={tokens.accent.onPrimary} style={{ marginLeft: SPACE.sm }} />
            </TactileButton>
          </View>
        )}

        {/* ══ STEP 2: PHYSICAL BASELINES ══ */}
        {currentStep === 'biometrics' && (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionHeaderTitle}>YOUR STATS</Text>
            <Text style={styles.sectionHeaderSubtitle}>
              Used to calculate your strength standards and bodyweight ratios.
            </Text>

            {/* Height Card */}
            <View style={styles.metricInputCard}>
              <View style={styles.metricCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.xs + 2 }}>
                  <Ruler size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.status.info} />
                  <Text style={styles.metricCardTitle}>HEIGHT</Text>
                </View>
                <View style={styles.unitToggleGroup}>
                  <TactileButton
                    variant="custom"
                    onPress={() => setHeightUnit('cm')}
                    style={[styles.unitToggleBtn, heightUnit === 'cm' && styles.unitToggleBtnActive]}
                    hitSlop={TOUCH.hitSlop}
                  >
                    <Text style={[styles.unitToggleBtnText, heightUnit === 'cm' && styles.unitToggleBtnTextActive]}>
                      CM
                    </Text>
                  </TactileButton>
                  <TactileButton
                    variant="custom"
                    onPress={() => setHeightUnit('ft')}
                    style={[styles.unitToggleBtn, heightUnit === 'ft' && styles.unitToggleBtnActive]}
                    hitSlop={TOUCH.hitSlop}
                  >
                    <Text style={[styles.unitToggleBtnText, heightUnit === 'ft' && styles.unitToggleBtnTextActive]}>
                      FT / IN
                    </Text>
                  </TactileButton>
                </View>
              </View>

              {heightUnit === 'cm' ? (
                <View style={styles.numberInputWrap}>
                  <TextInput
                    style={styles.largeNumberInput}
                    maxFontSizeMultiplier={1.25}
                    value={heightCm}
                    onChangeText={setHeightCm}
                    keyboardType="numeric"
                    maxLength={3}
                    placeholder="178"
                    placeholderTextColor={tokens.text.muted}
                  />
                  <Text style={styles.unitSuffix}>cm</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: SPACE.md }}>
                  <View style={[styles.numberInputWrap, { flex: 1 }]}>
                    <TextInput
                      style={styles.largeNumberInput}
                      maxFontSizeMultiplier={1.25}
                      value={heightFt}
                      onChangeText={setHeightFt}
                      keyboardType="numeric"
                      maxLength={1}
                      placeholder="5"
                      placeholderTextColor={tokens.text.muted}
                    />
                    <Text style={styles.unitSuffix}>ft</Text>
                  </View>
                  <View style={[styles.numberInputWrap, { flex: 1 }]}>
                    <TextInput
                      style={styles.largeNumberInput}
                      maxFontSizeMultiplier={1.25}
                      value={heightIn}
                      onChangeText={setHeightIn}
                      keyboardType="numeric"
                      maxLength={2}
                      placeholder="10"
                      placeholderTextColor={tokens.text.muted}
                    />
                    <Text style={styles.unitSuffix}>in</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Bodyweight Card */}
            <View style={styles.metricInputCard}>
              <View style={styles.metricCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.xs + 2 }}>
                  <Gauge size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.status.success} />
                  <Text style={styles.metricCardTitle}>BODYWEIGHT</Text>
                </View>
                <View style={styles.unitToggleGroup}>
                  <TactileButton
                    variant="custom"
                    onPress={() => setWeightUnit('kg')}
                    style={[styles.unitToggleBtn, weightUnit === 'kg' && styles.unitToggleBtnActive]}
                    hitSlop={TOUCH.hitSlop}
                  >
                    <Text style={[styles.unitToggleBtnText, weightUnit === 'kg' && styles.unitToggleBtnTextActive]}>
                      KG
                    </Text>
                  </TactileButton>
                  <TactileButton
                    variant="custom"
                    onPress={() => setWeightUnit('lbs')}
                    style={[styles.unitToggleBtn, weightUnit === 'lbs' && styles.unitToggleBtnActive]}
                    hitSlop={TOUCH.hitSlop}
                  >
                    <Text style={[styles.unitToggleBtnText, weightUnit === 'lbs' && styles.unitToggleBtnTextActive]}>
                      LBS
                    </Text>
                  </TactileButton>
                </View>
              </View>

              {weightUnit === 'kg' ? (
                <View style={styles.numberInputWrap}>
                  <TextInput
                    style={styles.largeNumberInput}
                    maxFontSizeMultiplier={1.25}
                    value={weightKg}
                    onChangeText={setWeightKg}
                    keyboardType="numeric"
                    maxLength={4}
                    placeholder="75"
                    placeholderTextColor={tokens.text.muted}
                  />
                  <Text style={styles.unitSuffix}>kg</Text>
                </View>
              ) : (
                <View style={styles.numberInputWrap}>
                  <TextInput
                    style={styles.largeNumberInput}
                    maxFontSizeMultiplier={1.25}
                    value={weightLbs}
                    onChangeText={setWeightLbs}
                    keyboardType="numeric"
                    maxLength={4}
                    placeholder="165"
                    placeholderTextColor={tokens.text.muted}
                  />
                  <Text style={styles.unitSuffix}>lbs</Text>
                </View>
              )}
            </View>

            {/* Gender Selector */}
            <View style={styles.metricInputCard}>
              <Text style={styles.metricCardTitle}>PROFILE BASELINE</Text>
              <View style={{ flexDirection: 'row', gap: SPACE.sm + 2, marginTop: SPACE.sm + 2 }}>
                <TactileButton
                  variant="custom"
                  onPress={() => setGender('male')}
                  style={[styles.genderCard, gender === 'male' && styles.genderCardActive]}
                >
                  <Text style={styles.genderGlyph}>♂</Text>
                  <Text style={[styles.genderCardText, gender === 'male' && styles.genderCardTextActive]}>
                    Male
                  </Text>
                </TactileButton>

                <TactileButton
                  variant="custom"
                  onPress={() => setGender('female')}
                  style={[styles.genderCard, gender === 'female' && styles.genderCardActive]}
                >
                  <Text style={styles.genderGlyph}>♀</Text>
                  <Text style={[styles.genderCardText, gender === 'female' && styles.genderCardTextActive]}>
                    Female
                  </Text>
                </TactileButton>
              </View>
            </View>

            {/* Live BMI Preview Badge */}
            <View style={styles.liveBmiBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.xs + 2 }}>
                <Activity size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
                <Text style={styles.liveBmiLabel}>CALCULATED BMI:</Text>
                <NumericText style={styles.liveBmiValue}>
                  {bmi} ({bmiClassification})
                </NumericText>
              </View>
            </View>

            <TactileButton
              variant="custom"
              onPress={goToNextStep}
              style={[styles.primaryBtn, { marginTop: SPACE.lg - 4 }]}
            >
              <Text style={styles.primaryBtnText}>Next: Training Goal</Text>
              <ArrowRight size={ICON.md - 2} strokeWidth={ICON.strokeWidth} color={tokens.accent.onPrimary} style={{ marginLeft: SPACE.sm }} />
            </TactileButton>
          </View>
        )}

        {/* ══ STEP 3: TRAINING GOAL & EXPERIENCE LEVEL ══ */}
        {currentStep === 'goals' && (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionHeaderTitle}>TRAINING GOAL</Text>
            <Text style={styles.sectionHeaderSubtitle}>
              Shapes your rep ranges, rest recommendations, and target milestones.
            </Text>

            <Text style={styles.groupHeaderLabel}>PRIMARY FOCUS</Text>
            <View style={styles.optionsList}>
              {GOAL_OPTIONS.map((g) => {
                const GoalIcon = g.Icon;
                const isSelected = trainingGoal === g.id;
                return (
                  <TactileButton
                    key={g.id}
                    variant="custom"
                    haptic="selection"
                    onPress={() => setTrainingGoal(g.id)}
                    style={[styles.optionCard, isSelected && styles.optionCardActive]}
                  >
                    <View style={[styles.optionIconWrap, isSelected && styles.optionIconWrapActive]}>
                      <GoalIcon
                        size={ICON.md - 2}
                        strokeWidth={ICON.strokeWidth}
                        color={isSelected ? tokens.accent.onPrimary : tokens.text.primary}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.optionTitle, isSelected && { color: tokens.accent.primary }]}>
                        {g.label}
                      </Text>
                      <Text style={styles.optionDesc} numberOfLines={2}>
                        {g.desc}
                      </Text>
                    </View>
                    {isSelected && (
                      <CheckCircle2 size={ICON.md - 2} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} style={{ marginLeft: SPACE.sm }} />
                    )}
                  </TactileButton>
                );
              })}
            </View>

            <Text style={[styles.groupHeaderLabel, { marginTop: SPACE.md + 6 }]}>EXPERIENCE LEVEL</Text>
            <View style={{ flexDirection: 'row', gap: SPACE.sm, flexWrap: isNarrow ? 'wrap' : 'nowrap' }}>
              {[
                { id: 'beginner', label: 'Rookie', sub: '< 1 Year' },
                { id: 'intermediate', label: 'Intermediate', sub: '1 - 3 Years' },
                { id: 'advanced', label: 'Advanced', sub: '3+ Years' },
              ].map((exp) => {
                const active = experienceLevel === exp.id;
                return (
                  <TactileButton
                    key={exp.id}
                    variant="custom"
                    haptic="selection"
                    onPress={() => setExperienceLevel(exp.id as any)}
                    style={[styles.experienceCard, active && styles.experienceCardActive, isNarrow && { minWidth: '47%', flexGrow: 1 }]}
                  >
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit={isNarrow}
                      style={[styles.experienceCardTitle, active && styles.experienceCardTitleActive]}
                    >
                      {exp.label}
                    </Text>
                    <Text style={styles.experienceCardSub}>{exp.sub}</Text>
                  </TactileButton>
                );
              })}
            </View>

            <TactileButton
              variant="custom"
              onPress={goToNextStep}
              style={[styles.primaryBtn, { marginTop: SPACE.lg }]}
            >
              <Text style={styles.primaryBtnText}>Next: Weekly Schedule</Text>
              <ArrowRight size={ICON.md - 2} strokeWidth={ICON.strokeWidth} color={tokens.accent.onPrimary} style={{ marginLeft: SPACE.sm }} />
            </TactileButton>
          </View>
        )}

        {/* ══ STEP 4: SCHEDULE & ROUTINE SPLIT ══ */}
        {currentStep === 'split' && (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionHeaderTitle}>WEEKLY SCHEDULE</Text>
            <Text style={styles.sectionHeaderSubtitle}>
              How many days do you train and which routine do you prefer?
            </Text>

            <Text style={styles.groupHeaderLabel}>DAYS PER WEEK</Text>
            <View style={{ flexDirection: 'row', gap: SPACE.sm, flexWrap: isNarrow ? 'wrap' : 'nowrap' }}>
              {[3, 4, 5, 6].map((days) => {
                const active = daysPerWeek === days;
                return (
                  <TactileButton
                    key={days}
                    variant="custom"
                    haptic="selection"
                    onPress={() => setDaysPerWeek(days)}
                    style={[styles.freqCard, active && styles.freqCardActive, isNarrow && { minWidth: '22%', flexGrow: 1 }]}
                  >
                    <NumericText style={[styles.freqNumber, active && styles.freqNumberActive]}>
                      {days}
                    </NumericText>
                    <Text style={styles.freqLabel}>DAYS</Text>
                  </TactileButton>
                );
              })}
            </View>

            <Text style={[styles.groupHeaderLabel, { marginTop: SPACE.lg - 4 }]}>PREFERRED WORKOUT SPLIT</Text>
            <View style={styles.optionsList}>
              {[
                { id: 'ppl', title: 'Push / Pull / Legs (PPL)', desc: 'Chest/Shoulders/Triceps, Back/Biceps, Legs.' },
                { id: 'arnold', title: 'Arnold Split', desc: 'Chest & Back, Shoulders & Arms, Legs.' },
                { id: 'upper_lower', title: 'Upper / Lower Power', desc: 'Upper body and lower body alternated across 4 days.' },
                { id: 'full_body', title: 'Full Body', desc: 'Hit all major muscle groups each session 3-4x a week.' },
              ].map((s) => {
                const active = splitPreference === s.id;
                return (
                  <TactileButton
                    key={s.id}
                    variant="custom"
                    haptic="selection"
                    onPress={() => setSplitPreference(s.id as any)}
                    style={[styles.optionCard, active && styles.optionCardActive]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.optionTitle, active && { color: tokens.accent.primary }]}>
                        {s.title}
                      </Text>
                      <Text style={styles.optionDesc} numberOfLines={2}>
                        {s.desc}
                      </Text>
                    </View>
                    {active && (
                      <CheckCircle2 size={ICON.md - 2} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} style={{ marginLeft: SPACE.sm }} />
                    )}
                  </TactileButton>
                );
              })}
            </View>

            <TactileButton
              variant="custom"
              onPress={goToNextStep}
              style={[styles.primaryBtn, { marginTop: SPACE.lg }]}
            >
              <Text style={styles.primaryBtnText}>Next: Workout Alerts</Text>
              <ArrowRight size={ICON.md - 2} strokeWidth={ICON.strokeWidth} color={tokens.accent.onPrimary} style={{ marginLeft: SPACE.sm }} />
            </TactileButton>
          </View>
        )}

        {/* ══ STEP 5: NOTIFICATIONS & REST ALERTS ══ */}
        {currentStep === 'notifications' && (
          <View style={styles.stepContainer}>
            <View style={styles.notifHeroIconWrap}>
              <Bell size={ICON.xl} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
            </View>

            <Text style={styles.sectionHeaderTitle}>WORKOUT ALERTS & TIMERS</Text>
            <Text style={styles.sectionHeaderSubtitle}>
              Here is what ZenFit alerts you on — zero spam guaranteed:
            </Text>

            <View style={styles.pillarsContainer}>
              <View style={styles.pillarCard}>
                <View style={[styles.pillarIconWrap, { backgroundColor: tokens.accent.primaryDim }]}>
                  <Clock size={ICON.md - 2} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
                </View>
                <View style={styles.pillarTextCol}>
                  <Text style={styles.pillarTitle}>Rest Timer Alerts</Text>
                  <Text style={styles.pillarDesc}>
                    Alerts you in your earphones when your rest is over so you don't stare at your phone.
                  </Text>
                </View>
              </View>

              <View style={styles.pillarCard}>
                <View style={[styles.pillarIconWrap, { backgroundColor: tokens.status.warningDim }]}>
                  <Calendar size={ICON.md - 2} strokeWidth={ICON.strokeWidth} color={tokens.status.warning} />
                </View>
                <View style={styles.pillarTextCol}>
                  <Text style={styles.pillarTitle}>Gym Day Reminders</Text>
                  <Text style={styles.pillarDesc}>
                    A single quiet reminder on your workout days at your chosen time. Never on rest days.
                  </Text>
                </View>
              </View>

              <View style={styles.pillarCard}>
                <View style={[styles.pillarIconWrap, { backgroundColor: tokens.status.successDim }]}>
                  <ShieldCheck size={ICON.md - 2} strokeWidth={ICON.strokeWidth} color={tokens.status.success} />
                </View>
                <View style={styles.pillarTextCol}>
                  <Text style={styles.pillarTitle}>Zero Spam Promise</Text>
                  <Text style={styles.pillarDesc}>
                    No ads, no marketing promos. 100% private lifting utility.
                  </Text>
                </View>
              </View>
            </View>

            <TactileButton
              variant="custom"
              haptic="medium"
              loading={requestingNotifs}
              onPress={handleEnableNotifications}
              style={styles.primaryBtn}
            >
              <View style={styles.primaryBtnInner}>
                <Bell size={ICON.md - 2} strokeWidth={ICON.strokeWidth} color={tokens.accent.onPrimary} style={{ marginRight: SPACE.sm }} />
                <Text style={styles.primaryBtnText}>Enable Workout Alerts</Text>
              </View>
            </TactileButton>

            <TactileButton
              variant="ghost"
              onPress={goToNextStep}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>Maybe Later</Text>
            </TactileButton>
          </View>
        )}

        {/* ══ STEP 6: REVEAL OFFICIAL ATHLETE CARD ══ */}
        {currentStep === 'reveal' && (
          <View style={styles.stepContainer}>
            <View style={styles.revealHeroBadge}>
              <CheckCircle2 size={ICON.xs + 1} strokeWidth={ICON.strokeWidth} color={tokens.status.success} />
              <Text style={styles.revealHeroBadgeText}>SETUP COMPLETE</Text>
            </View>

            <Text style={styles.sectionHeaderTitle}>YOU'RE ALL SET!</Text>
            <Text style={styles.sectionHeaderSubtitle}>
              Your official ZenFit athlete card is ready.
            </Text>

            <LinearGradient
              colors={[tokens.accent.primary, tokens.accent.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.previewCardBorder}
            >
              <View style={styles.previewCardSurface}>
                <View style={styles.previewCardTopRow}>
                  <View style={styles.previewTierPill}>
                    <Text style={styles.previewTierText}>{previewStats.tierLabel}</Text>
                  </View>
                  <View style={styles.previewArchetypePill}>
                    <Text style={styles.previewArchetypeText}>{previewStats.archetype.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.previewIdentityRow}>
                  <View style={styles.previewAvatarWrap}>
                    <UserAvatar
                      size={56}
                      photoURL={previewStats.photoURL}
                      fallbackLetter={previewStats.displayName.slice(0, 1).toUpperCase()}
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: SPACE.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.xs + 2 }}>
                      <Text style={styles.previewNameText} numberOfLines={1}>
                        {previewStats.displayName}
                      </Text>
                      <CheckCircle2 size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.status.success} />
                    </View>
                    <NumericText style={styles.previewStatsText}>
                      {previewStats.weightFormatted} · {previewStats.heightFormatted}
                    </NumericText>
                    <View style={{ flexDirection: 'row', gap: SPACE.xs + 2, marginTop: SPACE.xs }}>
                      <View style={styles.previewPillSmall}>
                        <NumericText style={styles.previewPillSmallText}>BMI {previewStats.bmi}</NumericText>
                      </View>
                      <View style={styles.previewPillSmall}>
                        <Text style={styles.previewPillSmallText}>{previewStats.goalLabel}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.previewDivider} />

                <View style={styles.previewBenchmarksPreview}>
                  <Text style={styles.previewBmLabel}>STARTING STRENGTH STANDARDS</Text>
                  <View style={styles.previewBmGrid}>
                    {(previewStats?.benchmarks || []).map((b: any) => (
                      <View key={b.category} style={styles.previewBmItem}>
                        <Text style={styles.previewBmCat}>{b.category.toUpperCase()}</Text>
                        <Text style={styles.previewBmLevel}>{b.level}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </LinearGradient>

            <TactileButton
              variant="custom"
              haptic="medium"
              loading={savingProfile}
              onPress={handleFinalizeOnboarding}
              style={[styles.primaryBtn, { marginTop: SPACE.lg }]}
              disabled={savingProfile}
            >
              <View style={styles.primaryBtnInner}>
                <Rocket size={ICON.md - 2} strokeWidth={ICON.strokeWidth} color={tokens.accent.onPrimary} style={{ marginRight: SPACE.sm }} />
                <Text style={styles.primaryBtnText}>Enter ZenFit Gym</Text>
              </View>
            </TactileButton>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const makeStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: tokens.bg.canvas,
    },
    headerBar: {
      paddingHorizontal: SPACE.lg + 4,
      paddingTop: SPACE.sm,
      paddingBottom: SPACE.sm + 2,
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACE.sm,
    },
    backButton: {
      width: TOUCH.minTarget,
      height: TOUCH.minTarget,
      borderRadius: RADIUS.full,
      backgroundColor: tokens.bg.elevated,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: tokens.border.hairlineWidth,
      borderColor: tokens.border.subtle,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.xs + 2,
    },
    brandText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.lg,
      color: tokens.text.primary,
      letterSpacing: 1.5,
      includeFontPadding: false,
    },
    brandDot: {
      width: 6,
      height: 6,
      borderRadius: RADIUS.xs,
      backgroundColor: tokens.accent.primary,
    },
    progressTrack: {
      height: 3,
      borderRadius: RADIUS.xs,
      backgroundColor: tokens.border.subtle,
      overflow: 'hidden',
      marginTop: SPACE.xs,
    },
    progressBar: {
      height: '100%',
      backgroundColor: tokens.accent.primary,
      borderRadius: RADIUS.xs,
    },
    scrollContent: {
      paddingHorizontal: SPACE.lg + 4,
      paddingBottom: SPACE.xxl + 4,
    },
    stepContainer: {
      paddingTop: SPACE.sm + 2,
    },

    /* ── Welcome Screen ── */
    heroTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xxl,
      color: tokens.text.primary,
      letterSpacing: -0.4,
      lineHeight: 33,
      marginBottom: SPACE.sm,
      includeFontPadding: false,
    },
    heroSubtitle: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: tokens.fontSize.base,
      color: tokens.text.secondary,
      lineHeight: 20,
      marginBottom: SPACE.lg,
    },
    pillarsContainer: {
      gap: SPACE.sm + 2,
      marginBottom: SPACE.lg,
    },
    pillarCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tokens.bg.surface,
      borderRadius: RADIUS.card,
      padding: SPACE.md,
      borderWidth: tokens.border.hairlineWidth,
      borderColor: tokens.border.subtle,
    },
    pillarIconWrap: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.inner,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACE.md,
      flexShrink: 0,
    },
    pillarTextCol: {
      flex: 1,
      minWidth: 0,
    },
    pillarTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.md,
      color: tokens.text.primary,
      marginBottom: 2,
    },
    pillarDesc: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: tokens.fontSize.sm,
      color: tokens.text.secondary,
      lineHeight: 16,
    },

    /* ── Common Section Headers ── */
    sectionHeaderTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xxl - 2,
      color: tokens.text.primary,
      letterSpacing: -0.5,
      marginBottom: SPACE.xs,
    },
    sectionHeaderSubtitle: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: tokens.fontSize.md,
      color: tokens.text.secondary,
      lineHeight: 18,
      marginBottom: SPACE.lg,
    },
    groupHeaderLabel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xs,
      color: tokens.text.muted,
      letterSpacing: 0.8,
      marginBottom: SPACE.sm,
      textTransform: 'uppercase',
    },

    /* ── Step 1: Auth ── */
    googleAuthBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.bg.elevated,
      borderRadius: RADIUS.card,
      minHeight: TOUCH.minTarget + 4,
      paddingVertical: SPACE.md,
      borderWidth: tokens.border.hairlineWidth,
      borderColor: tokens.border.medium,
    },
    googleAuthInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleAuthBtnText: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: tokens.fontSize.base,
      color: tokens.text.primary,
    },
    authErrorText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: tokens.fontSize.sm,
      color: tokens.status.danger,
      textAlign: 'center',
      marginTop: SPACE.sm,
    },
    orDividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: SPACE.lg,
      gap: SPACE.sm + 2,
    },
    dividerLine: {
      flex: 1,
      height: tokens.border.hairlineWidth,
      backgroundColor: tokens.border.subtle,
    },
    orText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xs,
      color: tokens.text.muted,
      letterSpacing: 1,
    },
    inputCard: {
      backgroundColor: tokens.bg.surface,
      borderRadius: RADIUS.card,
      padding: SPACE.md + 2,
      borderWidth: tokens.border.hairlineWidth,
      borderColor: tokens.border.subtle,
    },
    inputFieldLabel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xs,
      color: tokens.text.muted,
      letterSpacing: 0.6,
      marginBottom: SPACE.sm,
    },
    inputFieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    textInputField: {
      flex: 1,
      fontFamily: FONT_FAMILY.semibold,
      fontSize: tokens.fontSize.base,
      color: tokens.text.primary,
      paddingVertical: 2,
    },

    /* ── Step 2: Biometrics ── */
    metricInputCard: {
      backgroundColor: tokens.bg.surface,
      borderRadius: RADIUS.card,
      padding: SPACE.md + 2,
      marginBottom: SPACE.md,
      borderWidth: tokens.border.hairlineWidth,
      borderColor: tokens.border.subtle,
    },
    metricCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACE.sm + 2,
    },
    metricCardTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.sm,
      color: tokens.text.primary,
      letterSpacing: 0.6,
    },
    unitToggleGroup: {
      flexDirection: 'row',
      backgroundColor: tokens.bg.elevated,
      borderRadius: RADIUS.inner,
      padding: 2,
    },
    unitToggleBtn: {
      paddingHorizontal: SPACE.sm + 2,
      paddingVertical: SPACE.xs + 2,
      minHeight: 34,
      minWidth: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: RADIUS.sm,
    },
    unitToggleBtnActive: {
      backgroundColor: tokens.accent.primary,
    },
    unitToggleBtnText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xs,
      color: tokens.text.secondary,
    },
    unitToggleBtnTextActive: {
      color: tokens.accent.onPrimary,
    },
    numberInputWrap: {
      flexDirection: 'row',
      alignItems: 'baseline',
      backgroundColor: tokens.bg.elevated,
      borderRadius: RADIUS.inner,
      paddingHorizontal: SPACE.lg,
      paddingVertical: SPACE.sm,
      borderWidth: tokens.border.hairlineWidth,
      borderColor: tokens.border.subtle,
    },
    largeNumberInput: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xxl,
      color: tokens.text.primary,
      flex: 1,
      padding: 0,
      fontVariant: ['tabular-nums'],
    },
    unitSuffix: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.md,
      color: tokens.text.secondary,
      marginLeft: SPACE.xs + 2,
    },
    genderCard: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.bg.elevated,
      paddingVertical: SPACE.md,
      borderRadius: RADIUS.inner,
      borderWidth: tokens.border.hairlineWidth,
      borderColor: tokens.border.subtle,
      minHeight: TOUCH.minTarget,
    },
    genderCardActive: {
      borderColor: tokens.accent.primary,
      backgroundColor: tokens.accent.primaryDim,
    },
    genderGlyph: {
      fontSize: 18,
      color: tokens.text.primary,
      marginBottom: SPACE.xs,
    },
    genderCardText: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: tokens.fontSize.md,
      color: tokens.text.secondary,
    },
    genderCardTextActive: {
      color: tokens.accent.primary,
      fontFamily: FONT_FAMILY.bold,
    },
    liveBmiBox: {
      backgroundColor: tokens.accent.primaryDim,
      borderRadius: RADIUS.inner,
      padding: SPACE.sm + 2,
      borderWidth: tokens.border.hairlineWidth,
      borderColor: tokens.accent.primary,
    },
    liveBmiLabel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xs,
      color: tokens.text.secondary,
    },
    liveBmiValue: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.sm,
      color: tokens.accent.primary,
    },

    /* ── Step 3 & 4 Options ── */
    optionsList: {
      gap: SPACE.sm + 1,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tokens.bg.surface,
      borderRadius: RADIUS.card,
      padding: SPACE.md,
      borderWidth: tokens.border.hairlineWidth,
      borderColor: tokens.border.subtle,
      minHeight: TOUCH.minTarget + 8,
    },
    optionCardActive: {
      borderColor: tokens.accent.primary,
      backgroundColor: tokens.accent.primaryDim,
    },
    optionIconWrap: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.inner,
      backgroundColor: tokens.bg.elevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACE.md,
      flexShrink: 0,
    },
    optionIconWrapActive: {
      backgroundColor: tokens.accent.primary,
    },
    optionTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.md,
      color: tokens.text.primary,
      marginBottom: 2,
    },
    optionDesc: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: tokens.fontSize.xs,
      color: tokens.text.secondary,
      lineHeight: 15,
    },
    experienceCard: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.bg.surface,
      paddingVertical: SPACE.md,
      borderRadius: RADIUS.inner,
      borderWidth: tokens.border.hairlineWidth,
      borderColor: tokens.border.subtle,
      minHeight: TOUCH.minTarget + 6,
    },
    experienceCardActive: {
      borderColor: tokens.accent.primary,
      backgroundColor: tokens.accent.primaryDim,
    },
    experienceCardTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.sm,
      color: tokens.text.secondary,
    },
    experienceCardTitleActive: {
      color: tokens.accent.primary,
    },
    experienceCardSub: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: tokens.fontSize.xs,
      color: tokens.text.muted,
      marginTop: 2,
    },
    freqCard: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.bg.surface,
      paddingVertical: SPACE.md,
      borderRadius: RADIUS.inner,
      borderWidth: tokens.border.hairlineWidth,
      borderColor: tokens.border.subtle,
      minHeight: TOUCH.minTarget + 8,
    },
    freqCardActive: {
      borderColor: tokens.accent.primary,
      backgroundColor: tokens.accent.primaryDim,
    },
    freqNumber: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xl,
      color: tokens.text.secondary,
    },
    freqNumberActive: {
      color: tokens.accent.primary,
    },
    freqLabel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xs,
      color: tokens.text.muted,
      letterSpacing: 0.5,
    },

    /* ── Step 5: Notifications ── */
    notifHeroIconWrap: {
      width: 64,
      height: 64,
      borderRadius: RADIUS.full,
      backgroundColor: tokens.accent.primaryDim,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACE.md + 2,
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: tokens.accent.primary,
    },
    secondaryBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: TOUCH.minTarget,
      paddingVertical: SPACE.md,
      marginTop: SPACE.sm,
    },
    secondaryBtnText: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: tokens.fontSize.base,
      color: tokens.text.secondary,
    },

    /* ── Step 6: Reveal ── */
    revealHeroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.xs + 2,
      backgroundColor: tokens.status.successDim,
      paddingHorizontal: SPACE.sm + 2,
      paddingVertical: SPACE.xs,
      borderRadius: RADIUS.sm,
      alignSelf: 'flex-start',
      marginBottom: SPACE.sm + 2,
    },
    revealHeroBadgeText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xs,
      color: tokens.status.success,
      letterSpacing: 0.8,
    },
    previewCardBorder: {
      borderRadius: RADIUS.xxl - 2,
      padding: 1.5,
      marginVertical: SPACE.md + 2,
    },
    previewCardSurface: {
      backgroundColor: tokens.bg.surface,
      borderRadius: RADIUS.xxl - 4,
      padding: SPACE.lg,
    },
    previewCardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACE.md + 2,
    },
    previewTierPill: {
      backgroundColor: tokens.status.goldDim,
      paddingHorizontal: SPACE.sm,
      paddingVertical: SPACE.xs,
      borderRadius: RADIUS.sm,
    },
    previewTierText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xs,
      color: tokens.status.gold,
    },
    previewArchetypePill: {
      backgroundColor: tokens.accent.secondaryDim,
      paddingHorizontal: SPACE.sm,
      paddingVertical: SPACE.xs,
      borderRadius: RADIUS.sm,
    },
    previewArchetypeText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xs,
      color: tokens.accent.secondary,
    },
    previewIdentityRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    previewAvatarWrap: {
      width: 60,
      height: 60,
      borderRadius: RADIUS.full,
      borderWidth: 2,
      borderColor: tokens.accent.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewNameText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xl,
      color: tokens.text.primary,
    },
    previewStatsText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: tokens.fontSize.sm,
      color: tokens.text.secondary,
      marginTop: 2,
    },
    previewPillSmall: {
      backgroundColor: tokens.bg.elevated,
      paddingHorizontal: SPACE.xs + 2,
      paddingVertical: 2,
      borderRadius: RADIUS.sm - 2,
    },
    previewPillSmallText: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: tokens.fontSize.xs,
      color: tokens.text.primary,
    },
    previewDivider: {
      height: tokens.border.hairlineWidth,
      backgroundColor: tokens.border.subtle,
      marginVertical: SPACE.md + 2,
    },
    previewBenchmarksPreview: {
      gap: SPACE.sm,
    },
    previewBmLabel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xs,
      color: tokens.text.muted,
      letterSpacing: 0.6,
    },
    previewBmGrid: {
      flexDirection: 'row',
      gap: SPACE.xs + 2,
    },
    previewBmItem: {
      flex: 1,
      backgroundColor: tokens.bg.elevated,
      borderRadius: RADIUS.sm,
      padding: SPACE.xs + 2,
      alignItems: 'center',
    },
    previewBmCat: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xs,
      color: tokens.text.muted,
    },
    previewBmLevel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xs,
      color: tokens.accent.primary,
      marginTop: 2,
    },

    /* ── Bottom Primary Button ── */
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.accent.primary,
      borderRadius: RADIUS.card,
      minHeight: TOUCH.minTarget + 4,
      paddingVertical: SPACE.md + 2,
      paddingHorizontal: SPACE.lg + 4,
      width: '100%',
    },
    primaryBtnInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.base,
      color: tokens.accent.onPrimary,
      includeFontPadding: false,
    },
    alreadyHaveAccountBtn: {
      minHeight: TOUCH.minTarget,
      paddingVertical: SPACE.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: SPACE.xs,
    },
    alreadyHaveAccountText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: tokens.fontSize.md,
      color: tokens.text.secondary,
      includeFontPadding: false,
    },
    signInLinkText: {
      fontFamily: FONT_FAMILY.bold,
      color: tokens.accent.primary,
    },
    footerGuaranteesText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: tokens.fontSize.xs,
      color: tokens.text.muted,
      textAlign: 'center',
      marginTop: SPACE.xs + 2,
      includeFontPadding: false,
    },
  });
