/**
 * AthleteOnboardingFlow.tsx — ZenFit
 *
 * Flagship First-Time Athlete Onboarding Experience:
 * - 100% pitch-black OLED (#000000) with cyber-athletic accents
 * - Clean, natural human language (zero robotic buzzwords like "encrypted cache")
 * - Focused on the real best features: PRs, Muscle Recovery Map, Routines, and Offline speed
 * - Zero intimidating "1/7" counters on opening
 * - 6-Step Intelligent Athlete Calibration:
 *   1. Welcome: Best features showcase & quick start
 *   2. Identity: Google or Guest name
 *   3. Biometrics: Height, Weight, Gender with live BMI
 *   4. Training Goal & Experience Level
 *   5. Routine Split & Weekly Rhythm
 *   6. Transparent Notifications (rest alerts & zero spam guarantee)
 *   7. Reveal Generated Official Athlete Card & Launch!
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCoreData } from '../../contexts/domains/CoreDataContext';
import { useGymProfile, GymProfile } from '../../hooks/useGymProfile';
import { requestNotificationPermissions } from '../../services/notifications';
import { computeAthleteCardStats } from '../../services/athleteCardService';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { FONT_FAMILY } from '../../theme/tokens';
import { hapticLight, hapticMedium, hapticSelection } from '../../utils/haptics';

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

export default function AthleteOnboardingFlow({ onComplete }: AthleteOnboardingFlowProps) {
  const insets = useSafeAreaInsets();
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

  // Auto-sync Google display name if user signs in
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

  // Computed numerical baselines
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
    hapticLight();
    if (currentStepIndex < STEPS_ORDER.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const goToPrevStep = () => {
    hapticLight();
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  // Google Auth Handler
  const handleGoogleSignIn = async () => {
    hapticMedium();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await performGoogleSignIn();
      if (res.success && res.user) {
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

  // Guest Continue Handler (instant 0ms advance to Step 2 biometrics)
  const handleGuestContinue = () => {
    hapticMedium();
    continueAsGuest().catch(() => {});
    goToNextStep();
  };

  // Notification Permission Request (Only on Step 5!)
  const handleEnableNotifications = async () => {
    hapticMedium();
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

  // Complete Onboarding & Enter Gym
  const handleFinalizeOnboarding = async () => {
    hapticMedium();
    setSavingProfile(true);
    try {
      const finalName = athleteName.trim() || user?.displayName || 'Athlete';
      const updatedProfile: Partial<GymProfile> = {
        displayName: finalName,
        heightCm: numericHeightCm,
        weightKg: numericWeightKg,
        bodyweightKg: numericWeightKg,
        gender: gender,
        goal: trainingGoal,
        primaryGoal: trainingGoal,
        experience: experienceLevel,
        daysPerWeek: daysPerWeek,
        splitPreference: splitPreference,
        autoTimer: true,
        hapticsEnabled: true,
        audioCues: true,
        onboardingCompleted: true,
      };

      await saveGymProfile(updatedProfile);

      // Save initial weight log for the Weight Tracking section
      const todayStr = new Date().toISOString().slice(0, 10);
      const initialWeightEntry = {
        id: `weight_onboarding_${todayStr}`,
        weight: numericWeightKg,
        weightKg: numericWeightKg,
        date: todayStr,
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

  // Compute preview Athlete Card Stats for Step 6
  const previewStats = useMemo(() => {
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
  }, [athleteName, user, numericHeightCm, numericWeightKg, gender, trainingGoal, experienceLevel]);

  // Subtle progress line (only active after Welcome step)
  const progressPercent = Math.round((currentStepIndex / (STEPS_ORDER.length - 1)) * 100);

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 14), paddingBottom: Math.max(insets.bottom, 14) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerTopRow}>
          {currentStepIndex > 0 ? (
            <TouchableOpacity
              onPress={goToPrevStep}
              style={styles.backButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}

          <View style={styles.brandRow}>
            <Text style={styles.brandText}>ZENFIT</Text>
            <View style={styles.brandDot} />
          </View>

          <View style={{ width: 36 }} />
        </View>

        {/* Subtle, non-intrusive progress line (only shown during questionnaire) */}
        {currentStepIndex > 0 && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ═════════════════════════════════════════════════════════════════════
              STEP 0: WELCOME & FLAGSHIP FEATURES
          ═════════════════════════════════════════════════════════════════════ */}
          {currentStep === 'welcome' && (
            <View style={styles.stepContainer}>
              <Text style={styles.heroTitle}>
                TRACK YOUR LIFTS.{'\n'}BUILD REAL STRENGTH.
              </Text>

              <Text style={styles.heroSubtitle}>
                Log workouts instantly, break personal records, and see your muscle recovery — with zero distractions.
              </Text>

              {/* 4 Real Flagship Features */}
              <View style={styles.pillarsContainer}>
                {/* Feature 1: Progressive Overload & PRs */}
                <View style={styles.pillarCard}>
                  <View style={[styles.pillarIconWrap, { backgroundColor: 'rgba(0, 240, 255, 0.12)' }]}>
                    <Ionicons name="trending-up" size={20} color="#00F0FF" />
                  </View>
                  <View style={styles.pillarTextCol}>
                    <Text style={styles.pillarTitle}>Progressive Overload & PRs</Text>
                    <Text style={styles.pillarDesc}>
                      Know what weight to lift next. Track your personal records and 1RM progression automatically.
                    </Text>
                  </View>
                </View>

                {/* Feature 2: Full Body Muscle Recovery Map */}
                <View style={styles.pillarCard}>
                  <View style={[styles.pillarIconWrap, { backgroundColor: 'rgba(191, 90, 242, 0.12)' }]}>
                    <Ionicons name="body" size={20} color="#BF5AF2" />
                  </View>
                  <View style={styles.pillarTextCol}>
                    <Text style={styles.pillarTitle}>Muscle Recovery Map</Text>
                    <Text style={styles.pillarDesc}>
                      Visual breakdown of your weekly sets. See which muscles are fresh and which need rest.
                    </Text>
                  </View>
                </View>

                {/* Feature 3: Smart Splits & Equipment Swaps */}
                <View style={styles.pillarCard}>
                  <View style={[styles.pillarIconWrap, { backgroundColor: 'rgba(255, 159, 10, 0.12)' }]}>
                    <Ionicons name="swap-horizontal" size={20} color="#FF9F0A" />
                  </View>
                  <View style={styles.pillarTextCol}>
                    <Text style={styles.pillarTitle}>Smart Routines & Easy Swaps</Text>
                    <Text style={styles.pillarDesc}>
                      Follow proven splits (PPL, Arnold, Upper/Lower) and swap busy gym machines with one tap.
                    </Text>
                  </View>
                </View>

                {/* Feature 4: Fast & 100% Offline */}
                <View style={styles.pillarCard}>
                  <View style={[styles.pillarIconWrap, { backgroundColor: 'rgba(48, 209, 88, 0.12)' }]}>
                    <Ionicons name="flash" size={20} color="#30D158" />
                  </View>
                  <View style={styles.pillarTextCol}>
                    <Text style={styles.pillarTitle}>Fast & 100% Offline</Text>
                    <Text style={styles.pillarDesc}>
                      Instant logging with zero lag. Works in basement gym floors with no signal.
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={goToNextStep}
                style={styles.primaryBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={18} color="#000000" style={{ marginLeft: 8 }} />
              </TouchableOpacity>

              <Text style={styles.footerGuaranteesText}>
                Fast · Private · Works Offline
              </Text>
            </View>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              STEP 1: ATHLETE IDENTITY & AUTH
          ═════════════════════════════════════════════════════════════════════ */}
          {currentStep === 'identity' && (
            <View style={styles.stepContainer}>
              <Text style={styles.sectionHeaderTitle}>YOUR PROFILE</Text>
              <Text style={styles.sectionHeaderSubtitle}>
                Sign in with Google to sync workouts, or continue as a private guest.
              </Text>

              {/* Google One-Tap Card */}
              <TouchableOpacity
                onPress={handleGoogleSignIn}
                style={styles.googleAuthBtn}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-google" size={18} color="#FFFFFF" style={{ marginRight: 10 }} />
                <Text style={styles.googleAuthBtnText}>
                  {user ? `Signed in as ${user.displayName || user.email}` : 'Continue with Google'}
                </Text>
              </TouchableOpacity>

              {authError ? (
                <Text style={styles.authErrorText}>{authError}</Text>
              ) : null}

              {/* Divider */}
              <View style={styles.orDividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.orText}>OR CONTINUE AS GUEST</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Name Input Field */}
              <View style={styles.inputCard}>
                <Text style={styles.inputFieldLabel}>ATHLETE NAME</Text>
                <View style={styles.inputFieldRow}>
                  <Ionicons name="person-outline" size={18} color="#8E8E93" style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.textInputField}
                    value={athleteName}
                    onChangeText={setAthleteName}
                    placeholder="Enter your name (e.g. Alex)"
                    placeholderTextColor="#71717A"
                    autoCapitalize="words"
                    returnKeyType="done"
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={user ? goToNextStep : handleGuestContinue}
                style={[styles.primaryBtn, { marginTop: 24 }]}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>
                  {user ? 'Continue' : 'Continue as Guest'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#000000" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              STEP 2: PHYSICAL BASELINES (HEIGHT, WEIGHT, GENDER)
          ═════════════════════════════════════════════════════════════════════ */}
          {currentStep === 'biometrics' && (
            <View style={styles.stepContainer}>
              <Text style={styles.sectionHeaderTitle}>YOUR STATS</Text>
              <Text style={styles.sectionHeaderSubtitle}>
                Used to calculate your strength standards and bodyweight ratios.
              </Text>

              {/* Height Input Card */}
              <View style={styles.metricInputCard}>
                <View style={styles.metricCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="resize-outline" size={16} color="#0A84FF" />
                    <Text style={styles.metricCardTitle}>HEIGHT</Text>
                  </View>
                  <View style={styles.unitToggleGroup}>
                    <TouchableOpacity
                      onPress={() => {
                        hapticLight();
                        setHeightUnit('cm');
                      }}
                      style={[styles.unitToggleBtn, heightUnit === 'cm' && styles.unitToggleBtnActive]}
                    >
                      <Text style={[styles.unitToggleBtnText, heightUnit === 'cm' && styles.unitToggleBtnTextActive]}>
                        CM
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        hapticLight();
                        setHeightUnit('ft');
                      }}
                      style={[styles.unitToggleBtn, heightUnit === 'ft' && styles.unitToggleBtnActive]}
                    >
                      <Text style={[styles.unitToggleBtnText, heightUnit === 'ft' && styles.unitToggleBtnTextActive]}>
                        FT / IN
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {heightUnit === 'cm' ? (
                  <View style={styles.numberInputWrap}>
                    <TextInput
                      style={styles.largeNumberInput}
                      value={heightCm}
                      onChangeText={setHeightCm}
                      keyboardType="numeric"
                      maxLength={3}
                      placeholder="178"
                      placeholderTextColor="#71717A"
                    />
                    <Text style={styles.unitSuffix}>cm</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={[styles.numberInputWrap, { flex: 1 }]}>
                      <TextInput
                        style={styles.largeNumberInput}
                        value={heightFt}
                        onChangeText={setHeightFt}
                        keyboardType="numeric"
                        maxLength={1}
                        placeholder="5"
                        placeholderTextColor="#71717A"
                      />
                      <Text style={styles.unitSuffix}>ft</Text>
                    </View>
                    <View style={[styles.numberInputWrap, { flex: 1 }]}>
                      <TextInput
                        style={styles.largeNumberInput}
                        value={heightIn}
                        onChangeText={setHeightIn}
                        keyboardType="numeric"
                        maxLength={2}
                        placeholder="10"
                        placeholderTextColor="#71717A"
                      />
                      <Text style={styles.unitSuffix}>in</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Bodyweight Input Card */}
              <View style={styles.metricInputCard}>
                <View style={styles.metricCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="speedometer-outline" size={16} color="#30D158" />
                    <Text style={styles.metricCardTitle}>BODYWEIGHT</Text>
                  </View>
                  <View style={styles.unitToggleGroup}>
                    <TouchableOpacity
                      onPress={() => {
                        hapticLight();
                        setWeightUnit('kg');
                      }}
                      style={[styles.unitToggleBtn, weightUnit === 'kg' && styles.unitToggleBtnActive]}
                    >
                      <Text style={[styles.unitToggleBtnText, weightUnit === 'kg' && styles.unitToggleBtnTextActive]}>
                        KG
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        hapticLight();
                        setWeightUnit('lbs');
                      }}
                      style={[styles.unitToggleBtn, weightUnit === 'lbs' && styles.unitToggleBtnActive]}
                    >
                      <Text style={[styles.unitToggleBtnText, weightUnit === 'lbs' && styles.unitToggleBtnTextActive]}>
                        LBS
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {weightUnit === 'kg' ? (
                  <View style={styles.numberInputWrap}>
                    <TextInput
                      style={styles.largeNumberInput}
                      value={weightKg}
                      onChangeText={setWeightKg}
                      keyboardType="numeric"
                      maxLength={4}
                      placeholder="75"
                      placeholderTextColor="#71717A"
                    />
                    <Text style={styles.unitSuffix}>kg</Text>
                  </View>
                ) : (
                  <View style={styles.numberInputWrap}>
                    <TextInput
                      style={styles.largeNumberInput}
                      value={weightLbs}
                      onChangeText={setWeightLbs}
                      keyboardType="numeric"
                      maxLength={4}
                      placeholder="165"
                      placeholderTextColor="#71717A"
                    />
                    <Text style={styles.unitSuffix}>lbs</Text>
                  </View>
                )}
              </View>

              {/* Gender Selector */}
              <View style={styles.metricInputCard}>
                <Text style={styles.metricCardTitle}>PROFILE BASELINE</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={() => {
                      hapticLight();
                      setGender('male');
                    }}
                    style={[styles.genderCard, gender === 'male' && styles.genderCardActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 18, marginBottom: 4 }}>♂</Text>
                    <Text style={[styles.genderCardText, gender === 'male' && styles.genderCardTextActive]}>
                      Male
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      hapticLight();
                      setGender('female');
                    }}
                    style={[styles.genderCard, gender === 'female' && styles.genderCardActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 18, marginBottom: 4 }}>♀</Text>
                    <Text style={[styles.genderCardText, gender === 'female' && styles.genderCardTextActive]}>
                      Female
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Live BMI Preview Badge */}
              <View style={styles.liveBmiBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="analytics" size={16} color="#00F0FF" />
                  <Text style={styles.liveBmiLabel}>CALCULATED BMI:</Text>
                  <Text style={styles.liveBmiValue}>{bmi} ({bmiClassification})</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={goToNextStep}
                style={[styles.primaryBtn, { marginTop: 20 }]}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>Next: Training Goal</Text>
                <Ionicons name="arrow-forward" size={18} color="#000000" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              STEP 3: TRAINING GOAL & EXPERIENCE LEVEL
          ═════════════════════════════════════════════════════════════════════ */}
          {currentStep === 'goals' && (
            <View style={styles.stepContainer}>
              <Text style={styles.sectionHeaderTitle}>TRAINING GOAL</Text>
              <Text style={styles.sectionHeaderSubtitle}>
                Shapes your rep ranges, rest recommendations, and target milestones.
              </Text>

              {/* Goals List */}
              <Text style={styles.groupHeaderLabel}>PRIMARY FOCUS</Text>
              <View style={styles.optionsList}>
                {[
                  { id: 'hypertrophy', label: 'Hypertrophy & Growth', desc: 'Build muscle size and shape (8-12 reps)', icon: 'barbell-outline' },
                  { id: 'strength', label: 'Maximum Strength', desc: 'Lift heavier on compound lifts (3-6 reps)', icon: 'trophy-outline' },
                  { id: 'fat_loss', label: 'Fat Loss & Conditioning', desc: 'Burn fat while keeping muscle (12-15 reps)', icon: 'flame-outline' },
                  { id: 'athletic', label: 'Athletic Performance', desc: 'Build speed, power, and movement capacity', icon: 'flash-outline' },
                  { id: 'recomp', label: 'Body Recomposition', desc: 'Build muscle and lose fat at the same time', icon: 'refresh-outline' },
                ].map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => {
                      hapticSelection();
                      setTrainingGoal(g.id as any);
                    }}
                    style={[styles.optionCard, trainingGoal === g.id && styles.optionCardActive]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.optionIconWrap, trainingGoal === g.id && styles.optionIconWrapActive]}>
                      <Ionicons name={g.icon as any} size={18} color={trainingGoal === g.id ? '#000000' : '#FFFFFF'} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.optionTitle, trainingGoal === g.id && { color: '#00F0FF' }]}>
                        {g.label}
                      </Text>
                      <Text style={styles.optionDesc} numberOfLines={2}>
                        {g.desc}
                      </Text>
                    </View>
                    {trainingGoal === g.id && (
                      <Ionicons name="checkmark-circle" size={18} color="#00F0FF" style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Experience Level */}
              <Text style={[styles.groupHeaderLabel, { marginTop: 18 }]}>EXPERIENCE LEVEL</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { id: 'beginner', label: 'Rookie', sub: '< 1 Year' },
                  { id: 'intermediate', label: 'Intermediate', sub: '1 - 3 Years' },
                  { id: 'advanced', label: 'Advanced', sub: '3+ Years' },
                ].map((exp) => (
                  <TouchableOpacity
                    key={exp.id}
                    onPress={() => {
                      hapticSelection();
                      setExperienceLevel(exp.id as any);
                    }}
                    style={[styles.experienceCard, experienceLevel === exp.id && styles.experienceCardActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.experienceCardTitle, experienceLevel === exp.id && styles.experienceCardTitleActive]}>
                      {exp.label}
                    </Text>
                    <Text style={styles.experienceCardSub}>{exp.sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={goToNextStep}
                style={[styles.primaryBtn, { marginTop: 24 }]}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>Next: Weekly Schedule</Text>
                <Ionicons name="arrow-forward" size={18} color="#000000" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              STEP 4: SCHEDULE & ROUTINE SPLIT
          ═════════════════════════════════════════════════════════════════════ */}
          {currentStep === 'split' && (
            <View style={styles.stepContainer}>
              <Text style={styles.sectionHeaderTitle}>WEEKLY SCHEDULE</Text>
              <Text style={styles.sectionHeaderSubtitle}>
                How many days do you train and which routine do you prefer?
              </Text>

              {/* Days per week */}
              <Text style={styles.groupHeaderLabel}>DAYS PER WEEK</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[3, 4, 5, 6].map((days) => (
                  <TouchableOpacity
                    key={days}
                    onPress={() => {
                      hapticSelection();
                      setDaysPerWeek(days);
                    }}
                    style={[styles.freqCard, daysPerWeek === days && styles.freqCardActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.freqNumber, daysPerWeek === days && styles.freqNumberActive]}>
                      {days}
                    </Text>
                    <Text style={styles.freqLabel}>DAYS</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Routine Split Selector */}
              <Text style={[styles.groupHeaderLabel, { marginTop: 20 }]}>PREFERRED WORKOUT SPLIT</Text>
              <View style={styles.optionsList}>
                {[
                  { id: 'ppl', title: 'Push / Pull / Legs (PPL)', desc: 'Chest/Shoulders/Triceps, Back/Biceps, Legs.' },
                  { id: 'arnold', title: 'Arnold Split', desc: 'Chest & Back, Shoulders & Arms, Legs.' },
                  { id: 'upper_lower', title: 'Upper / Lower Power', desc: 'Upper body and lower body alternated across 4 days.' },
                  { id: 'full_body', title: 'Full Body', desc: 'Hit all major muscle groups each session 3-4x a week.' },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => {
                      hapticSelection();
                      setSplitPreference(s.id as any);
                    }}
                    style={[styles.optionCard, splitPreference === s.id && styles.optionCardActive]}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.optionTitle, splitPreference === s.id && { color: '#00F0FF' }]}>
                        {s.title}
                      </Text>
                      <Text style={styles.optionDesc} numberOfLines={2}>
                        {s.desc}
                      </Text>
                    </View>
                    {splitPreference === s.id && (
                      <Ionicons name="checkmark-circle" size={18} color="#00F0FF" style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={goToNextStep}
                style={[styles.primaryBtn, { marginTop: 24 }]}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>Next: Workout Alerts</Text>
                <Ionicons name="arrow-forward" size={18} color="#000000" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              STEP 5: NOTIFICATIONS & REST ALERTS (ZERO SPAM GUARANTEE)
          ═════════════════════════════════════════════════════════════════════ */}
          {currentStep === 'notifications' && (
            <View style={styles.stepContainer}>
              <View style={styles.notifHeroIconWrap}>
                <Ionicons name="notifications" size={30} color="#00F0FF" />
              </View>

              <Text style={styles.sectionHeaderTitle}>WORKOUT ALERTS & TIMERS</Text>
              <Text style={styles.sectionHeaderSubtitle}>
                Here is what ZenFit alerts you on — zero spam guaranteed:
              </Text>

              {/* 3 Clear, honest cards */}
              <View style={styles.pillarsContainer}>
                <View style={styles.pillarCard}>
                  <View style={[styles.pillarIconWrap, { backgroundColor: 'rgba(0, 240, 255, 0.12)' }]}>
                    <Ionicons name="timer-outline" size={18} color="#00F0FF" />
                  </View>
                  <View style={styles.pillarTextCol}>
                    <Text style={styles.pillarTitle}>Rest Timer Alerts</Text>
                    <Text style={styles.pillarDesc}>
                      Alerts you in your earphones when your rest is over so you don't stare at your phone.
                    </Text>
                  </View>
                </View>

                <View style={styles.pillarCard}>
                  <View style={[styles.pillarIconWrap, { backgroundColor: 'rgba(255, 159, 10, 0.12)' }]}>
                    <Ionicons name="calendar-outline" size={18} color="#FF9F0A" />
                  </View>
                  <View style={styles.pillarTextCol}>
                    <Text style={styles.pillarTitle}>Gym Day Reminders</Text>
                    <Text style={styles.pillarDesc}>
                      A single quiet reminder on your workout days at your chosen time. Never on rest days.
                    </Text>
                  </View>
                </View>

                <View style={styles.pillarCard}>
                  <View style={[styles.pillarIconWrap, { backgroundColor: 'rgba(48, 209, 88, 0.12)' }]}>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#30D158" />
                  </View>
                  <View style={styles.pillarTextCol}>
                    <Text style={styles.pillarTitle}>Zero Spam Promise</Text>
                    <Text style={styles.pillarDesc}>
                      No ads, no marketing promos. 100% private lifting utility.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                onPress={handleEnableNotifications}
                style={styles.primaryBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="notifications-outline" size={18} color="#000000" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>
                  {requestingNotifs ? 'Requesting...' : 'Enable Workout Alerts'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={goToNextStep}
                style={styles.secondaryBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryBtnText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              STEP 6: REVEAL OFFICIAL ATHLETE CARD & ENTER GYM!
          ═════════════════════════════════════════════════════════════════════ */}
          {currentStep === 'reveal' && (
            <View style={styles.stepContainer}>
              <View style={styles.revealHeroBadge}>
                <Ionicons name="checkmark-circle" size={15} color="#30D158" />
                <Text style={styles.revealHeroBadgeText}>SETUP COMPLETE</Text>
              </View>

              <Text style={styles.sectionHeaderTitle}>YOU'RE ALL SET!</Text>
              <Text style={styles.sectionHeaderSubtitle}>
                Your official ZenFit athlete card is ready.
              </Text>

              {/* Live Preview Card */}
              <LinearGradient
                colors={['#00F0FF', '#7000FF']}
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

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.previewNameText} numberOfLines={1}>
                          {previewStats.displayName}
                        </Text>
                        <Ionicons name="checkmark-circle" size={16} color="#30D158" />
                      </View>
                      <Text style={styles.previewStatsText}>
                        {previewStats.weightFormatted} · {previewStats.heightFormatted}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                        <View style={styles.previewPillSmall}>
                          <Text style={styles.previewPillSmallText}>BMI {previewStats.bmi}</Text>
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
                      {previewStats.benchmarks.map((b) => (
                        <View key={b.category} style={styles.previewBmItem}>
                          <Text style={styles.previewBmCat}>{b.category.toUpperCase()}</Text>
                          <Text style={styles.previewBmLevel}>{b.level}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </LinearGradient>

              {/* Enter Gym CTA */}
              <TouchableOpacity
                onPress={handleFinalizeOnboarding}
                style={[styles.primaryBtn, { marginTop: 24 }]}
                activeOpacity={0.8}
                disabled={savingProfile}
              >
                <Text style={styles.primaryBtnText}>
                  {savingProfile ? 'Saving...' : '🚀 Enter ZenFit Gym'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 2,
    paddingRight: 6,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F0FF',
  },
  progressTrack: {
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00F0FF',
    borderRadius: 1.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  stepContainer: {
    paddingTop: 10,
  },

  /* ── Welcome Screen ── */
  heroTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: -0.6,
    lineHeight: 34,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: '#A1A1AA',
    lineHeight: 20,
    marginBottom: 20,
  },
  pillarsContainer: {
    gap: 10,
    marginBottom: 24,
  },
  pillarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121215',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  pillarIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  pillarTextCol: {
    flex: 1,
    minWidth: 0,
  },
  pillarTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  pillarDesc: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8E8E93',
    lineHeight: 16,
  },

  /* ── Common Section Headers ── */
  sectionHeaderTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  sectionHeaderSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 18,
  },
  groupHeaderLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    color: '#71717A',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  /* ── Step 1: Auth ── */
  googleAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  googleAuthBtnText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  authErrorText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#FF453A',
    textAlign: 'center',
    marginTop: 8,
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  orText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    color: '#71717A',
    letterSpacing: 1,
  },
  inputCard: {
    backgroundColor: '#121215',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  inputFieldLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#71717A',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  inputFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInputField: {
    flex: 1,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 2,
  },

  /* ── Step 2: Biometrics ── */
  metricInputCard: {
    backgroundColor: '#121215',
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricCardTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11.5,
    color: '#E4E4E7',
    letterSpacing: 0.6,
  },
  unitToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    padding: 2,
  },
  unitToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unitToggleBtnActive: {
    backgroundColor: '#2C2C2E',
  },
  unitToggleBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#71717A',
  },
  unitToggleBtnTextActive: {
    color: '#FFFFFF',
  },
  numberInputWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#18181B',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  largeNumberInput: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 24,
    color: '#FFFFFF',
    flex: 1,
    padding: 0,
  },
  unitSuffix: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 6,
  },
  genderCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181B',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  genderCardActive: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
  },
  genderCardText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 13,
    color: '#8E8E93',
  },
  genderCardTextActive: {
    color: '#00F0FF',
    fontFamily: FONT_FAMILY.bold,
  },
  liveBmiBox: {
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
  },
  liveBmiLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    color: '#71717A',
  },
  liveBmiValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11.5,
    color: '#00F0FF',
  },

  /* ── Step 3 & 4 Options ── */
  optionsList: {
    gap: 9,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121215',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  optionCardActive: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.06)',
  },
  optionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  optionIconWrapActive: {
    backgroundColor: '#00F0FF',
  },
  optionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  optionDesc: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
    lineHeight: 15,
  },
  experienceCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#121215',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  experienceCardActive: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
  },
  experienceCardTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#8E8E93',
  },
  experienceCardTitleActive: {
    color: '#00F0FF',
  },
  experienceCardSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    color: '#71717A',
    marginTop: 2,
  },
  freqCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#121215',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  freqCardActive: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
  },
  freqNumber: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 18,
    color: '#8E8E93',
  },
  freqNumberActive: {
    color: '#00F0FF',
  },
  freqLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9,
    color: '#71717A',
    letterSpacing: 0.5,
  },

  /* ── Step 5: Notifications ── */
  notifHeroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  secondaryBtnText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    color: '#8E8E93',
  },

  /* ── Step 6: Reveal ── */
  revealHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  revealHeroBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#30D158',
    letterSpacing: 0.8,
  },
  previewCardBorder: {
    borderRadius: 22,
    padding: 1.5,
    marginVertical: 14,
  },
  previewCardSurface: {
    backgroundColor: '#121215',
    borderRadius: 20.5,
    padding: 16,
  },
  previewCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  previewTierPill: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  previewTierText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#FFD700',
  },
  previewArchetypePill: {
    backgroundColor: 'rgba(165, 153, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  previewArchetypeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#A599FF',
  },
  previewIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewAvatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#00F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewNameText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  previewStatsText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#A1A1AA',
    marginTop: 2,
  },
  previewPillSmall: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  previewPillSmallText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 10,
    color: '#E4E4E7',
  },
  previewDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 14,
  },
  previewBenchmarksPreview: {
    gap: 8,
  },
  previewBmLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9,
    color: '#71717A',
    letterSpacing: 0.6,
  },
  previewBmGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  previewBmItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
  },
  previewBmCat: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9,
    color: '#71717A',
  },
  previewBmLevel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#00F0FF',
    marginTop: 2,
  },

  /* ── Bottom Primary Button ── */
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: '#000000',
  },
  footerGuaranteesText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#71717A',
    textAlign: 'center',
    marginTop: 14,
  },
});
