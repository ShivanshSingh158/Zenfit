/**
 * AthleteOnboardingFlow.tsx — ZenFit
 *
 * Flagship First-Time Athlete Onboarding Orchestrator:
 * - Obsidian Layer 0 canvas (#050507) with synchronized multi-color top aura
 * - Distinct Get Started (calibration) vs Sign In (returning account restore) paths
 * - Hybrid progression: tactile auto-advance on single picks + pinned compact CTAs on sliders
 * - Real persistence of age, unitIsLbs, UserGymPlanDoc, and Day-1 bodyweight log
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  DeviceEventEmitter,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
  useSharedValue,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
import { ArrowRight } from 'lucide-react-native';

import { ScreenWrapper, TactileButton } from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { useCoreData } from '../../contexts/domains/CoreDataContext';
import {
  GymProfile,
  PROFILE_STORAGE_KEY,
  normalizeGymProfileAliases,
  useGymProfile,
} from '../../hooks/useGymProfile';
import { auth, db } from '../../services/firebase';
import { COLLECTION } from '../../config/constants';
import { requestNotificationPermissions } from '../../services/notifications';
import { GYM_NOTIF_ENABLED_KEY } from '../../services/notifications/core/NotificationPreferences';
import { ONBOARDING_FLOW_KEY, setL1Sync } from '../../utils/bootManifest';
import { safeWrite } from '../../utils/safeWrite';
import { afterSheetDismiss } from '../../utils/sheetCoordinator';
import { iosEasing } from '../../theme/motion';
import { FONT_FAMILY, ICON, SPACE, ThemeTokens } from '../../theme/tokens';

import {
  ALL_STEPS_ORDER,
  ExperienceLevelId,
  GOAL_OPTIONS,
  OnboardingStep,
  QUIZ_STEPS_ORDER,
  SPLIT_OPTIONS,
  SplitPreferenceId,
  TrainingGoalId,
  getRecommendedSplitForDays,
} from './onboardingTypes';
import {
  buildOnboardingUserGymPlan,
  getFirstWorkoutPreview,
  persistOnboardingPlanAndSeedWeight,
} from './onboardingPlanBuilder';
import { AuraMode, OnboardingAuraBackdrop } from './components/OnboardingAuraBackdrop';
import { OnboardingHeader } from './components/OnboardingHeader';
import { WelcomeHeroStage } from './components/WelcomeHeroStage';
import { IdentityStep } from './steps/IdentityStep';
import { AgeHeightStep, WeightStep } from './steps/BiometricsSteps';
import { ExperienceStep, GoalStep } from './steps/ChoiceSteps';
import { ScheduleSplitStep } from './steps/ScheduleSplitStep';
import { AlertsStep, RevealStep } from './steps/AlertsAndRevealSteps';

interface AthleteOnboardingFlowProps {
  onComplete: () => void;
  onReady?: () => void;
}

const AUTO_ADVANCE_MS = 235;

export default function AthleteOnboardingFlow({ onComplete, onReady }: AthleteOnboardingFlowProps) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  const { tokens, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);
  const { user, performGoogleSignIn, continueAsGuest } = useCoreData();
  const { gymProfile, saveGymProfile } = useGymProfile();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [navDir, setNavDir] = useState<'forward' | 'back'>('forward');
  const [hasTransitioned, setHasTransitioned] = useState(false);
  const [revisitedSteps, setRevisitedSteps] = useState<Set<OnboardingStep>>(() => new Set());
  const [alertsAuraTone, setAlertsAuraTone] = useState<'emerald' | 'amber'>('emerald');
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const welcomeProgressSV = useSharedValue(0);

  const currentStep = ALL_STEPS_ORDER[currentStepIndex];

  // ─── Onboarding State ───────────────────────────────────────────────────────
  const [athleteName, setAthleteName] = useState(
    gymProfile?.displayName || user?.displayName || ''
  );
  const [gender, setGender] = useState<'male' | 'female'>(
    gymProfile?.gender === 'female' ? 'female' : 'male'
  );
  const [age, setAge] = useState<number>(
    gymProfile?.age || gymProfile?.ageYears || 24
  );
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [heightCm, setHeightCm] = useState<number>(
    gymProfile?.heightCm && gymProfile.heightCm >= 130 ? Math.round(gymProfile.heightCm) : 178
  );
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(
    gymProfile?.unitIsLbs ? 'lbs' : 'kg'
  );
  const [weightKg, setWeightKg] = useState<number>(
    gymProfile?.weightKg || gymProfile?.bodyweightKg || 75
  );
  const [trainingGoal, setTrainingGoal] = useState<TrainingGoalId | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevelId | null>(null);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(4);
  const [splitPreference, setSplitPreference] = useState<SplitPreferenceId>('upper_lower');

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [backedUpUser, setBackedUpUser] = useState<{
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
  } | null>(null);

  useEffect(() => {
    if (user?.displayName && !athleteName) {
      setAthleteName(user.displayName);
    }
  }, [user?.displayName, athleteName]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  const clearPendingAdvance = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  const goToIndex = useCallback(
    (nextIndex: number, dir: 'forward' | 'back') => {
      clearPendingAdvance();
      setHasTransitioned(true);
      setNavDir(dir);
      setCurrentStepIndex(Math.max(0, Math.min(ALL_STEPS_ORDER.length - 1, nextIndex)));
    },
    [clearPendingAdvance]
  );

  const goToNextStep = useCallback(() => {
    if (currentStepIndex < ALL_STEPS_ORDER.length - 1) {
      goToIndex(currentStepIndex + 1, 'forward');
    }
  }, [currentStepIndex, goToIndex]);

  const goToPrevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const targetStep = ALL_STEPS_ORDER[currentStepIndex - 1];
      if (targetStep === 'goals' || targetStep === 'experience') {
        setRevisitedSteps((prev) => {
          const next = new Set(prev);
          next.add(targetStep);
          return next;
        });
      }
      goToIndex(currentStepIndex - 1, 'back');
    }
  }, [currentStepIndex, goToIndex]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentStepIndex > 0) {
        goToPrevStep();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [currentStepIndex, goToPrevStep]);

  const handleSelectGoal = useCallback(
    (goal: TrainingGoalId) => {
      setTrainingGoal(goal);
      clearPendingAdvance();
      autoAdvanceTimerRef.current = setTimeout(() => {
        goToIndex(ALL_STEPS_ORDER.indexOf('experience'), 'forward');
      }, AUTO_ADVANCE_MS);
    },
    [clearPendingAdvance, goToIndex]
  );

  const handleSelectExperience = useCallback(
    (exp: ExperienceLevelId) => {
      setExperienceLevel(exp);
      clearPendingAdvance();
      autoAdvanceTimerRef.current = setTimeout(() => {
        goToIndex(ALL_STEPS_ORDER.indexOf('split'), 'forward');
      }, AUTO_ADVANCE_MS);
    },
    [clearPendingAdvance, goToIndex]
  );

  const handleSelectDays = useCallback((days: number) => {
    setDaysPerWeek(days);
    setSplitPreference(getRecommendedSplitForDays(days));
  }, []);

  const handleSelectSplit = useCallback((split: SplitPreferenceId) => {
    setSplitPreference(split);
    const meta = SPLIT_OPTIONS.find((s) => s.id === split);
    if (meta && meta.idealDays.length > 0) {
      setDaysPerWeek(meta.idealDays[0]);
    }
  }, []);

  // ─── Returning Sign-In (Welcome Sheet) ──────────────────────────────────────
  const checkAndRestoreCloudAccount = useCallback(async (uid: string): Promise<boolean> => {
    try {
      const profileDoc = await getDoc(doc(db, COLLECTION.USER_PROFILES, uid));
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        const existingProf = normalizeGymProfileAliases(data?.gymProfile || data) as GymProfile;
        if (
          existingProf?.onboardingCompleted ||
          (existingProf?.heightCm && existingProf?.weightKg) ||
          existingProf?.goal
        ) {
          await AsyncStorage.setItem(ONBOARDING_FLOW_KEY, 'true');
          await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(existingProf));
          setL1Sync(ONBOARDING_FLOW_KEY, true, true);
          setL1Sync(PROFILE_STORAGE_KEY, existingProf, true);
          DeviceEventEmitter.emit('gym_profile_updated', existingProf);
          onComplete();
          return true;
        }
      }
    } catch (_) {}

    try {
      const [logsSnap, planDoc] = await Promise.all([
        getDocs(query(collection(db, COLLECTION.GYM_LOGS), where('userId', '==', uid), limit(1))),
        getDoc(doc(db, COLLECTION.USER_GYM_PLANS, uid)),
      ]);
      if (!logsSnap.empty || planDoc.exists()) {
        await AsyncStorage.setItem(ONBOARDING_FLOW_KEY, 'true');
        setL1Sync(ONBOARDING_FLOW_KEY, true, true);
        onComplete();
        return true;
      }
    } catch (_) {}

    return false;
  }, [onComplete]);

  const handleReturningGoogleSignIn = useCallback(async (): Promise<boolean> => {
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await performGoogleSignIn();
      if (res.success && res.user) {
        const restored = await checkAndRestoreCloudAccount(res.user.uid);
        if (restored) return true;

        if (res.user.displayName) {
          setAthleteName(res.user.displayName);
        }
        afterSheetDismiss(() => {
          goToIndex(ALL_STEPS_ORDER.indexOf('identity'), 'forward');
        });
        return true;
      } else if (!res.cancelled) {
        setAuthError(res.error || 'Google sign-in could not be completed.');
      }
      return false;
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication error occurred.');
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, [performGoogleSignIn, checkAndRestoreCloudAccount, goToIndex]);

  // ─── Final Persistence & Plan Construction ──────────────────────────────────
  const persistCalibratedSetup = useCallback(
    async (opts: {
      finalUid: string;
      isCloud: boolean;
      displayName?: string | null;
      photoURL?: string | null;
    }) => {
      const { finalUid, isCloud, displayName: cloudName, photoURL: cloudPhoto } = opts;
      const finalName =
        athleteName.trim() ||
        cloudName ||
        backedUpUser?.displayName ||
        user?.displayName ||
        'Athlete';

      const isLbs = weightUnit === 'lbs';
      const effectiveGoal: TrainingGoalId = trainingGoal ?? 'hypertrophy';
      const effectiveExperience: ExperienceLevelId = experienceLevel ?? 'intermediate';
      const profilePatch: Partial<GymProfile> = {
        userId: finalUid,
        displayName: finalName,
        photoURL: cloudPhoto || backedUpUser?.photoURL || user?.photoURL || null,
        heightCm,
        weightKg,
        bodyweightKg: weightKg,
        age,
        ageYears: age,
        gender,
        goal: effectiveGoal,
        primaryGoal: effectiveGoal,
        experience: effectiveExperience,
        daysPerWeek,
        splitPreference,
        unitIsLbs: isLbs,
        autoTimer: true,
        hapticsEnabled: true,
        audioCues: true,
        onboardingCompleted: true,
      };

      await saveGymProfile(profilePatch);

      if (isCloud && finalUid && finalUid !== 'guest_local_user') {
        const fullPayload = {
          gymProfile: normalizeGymProfileAliases({
            ...profilePatch,
            updatedAt: Date.now(),
          }),
        };
        await safeWrite(
          () => setDoc(doc(db, COLLECTION.USER_PROFILES, finalUid), fullPayload, { merge: true }),
          COLLECTION.USER_PROFILES,
          'set',
          fullPayload,
          finalUid
        ).catch(() => {});
      }

      const builtPlan = buildOnboardingUserGymPlan({
        userId: finalUid,
        displayName: finalName,
        weightKg,
        heightCm,
        goal: effectiveGoal,
        experience: effectiveExperience,
        daysPerWeek,
        splitPreference,
      });

      await persistOnboardingPlanAndSeedWeight({
        plan: builtPlan,
        weightKg,
        isCloudUser: isCloud,
        uid: finalUid,
      });
    },
    [
      athleteName,
      backedUpUser,
      user,
      weightUnit,
      heightCm,
      weightKg,
      age,
      gender,
      trainingGoal,
      experienceLevel,
      daysPerWeek,
      splitPreference,
      saveGymProfile,
    ]
  );

  const finalizeAndEnter = useCallback(
    async (explicitCloudUser?: { uid: string; displayName?: string | null; photoURL?: string | null }) => {
      setSavingProfile(true);
      try {
        const resolvedCloudUid =
          explicitCloudUser?.uid ||
          backedUpUser?.uid ||
          (user && !(user as any).isAnonymous ? user.uid : '');
        let finalUid = resolvedCloudUid;
        let isCloud = Boolean(finalUid);

        if (!finalUid) {
          await continueAsGuest();
          finalUid = auth.currentUser?.uid || user?.uid || 'guest_local_user';
          isCloud = false;
        }

        await persistCalibratedSetup({
          finalUid,
          isCloud,
          displayName: explicitCloudUser?.displayName || backedUpUser?.displayName || user?.displayName,
          photoURL: explicitCloudUser?.photoURL || backedUpUser?.photoURL || user?.photoURL,
        });

        setL1Sync(ONBOARDING_FLOW_KEY, true, true);
        await AsyncStorage.setItem(ONBOARDING_FLOW_KEY, 'true');
        onComplete();
      } catch (e) {
        console.warn('[Onboarding] Finalization warning:', e);
        setL1Sync(ONBOARDING_FLOW_KEY, true, true);
        await AsyncStorage.setItem(ONBOARDING_FLOW_KEY, 'true').catch(() => {});
        onComplete();
      } finally {
        setSavingProfile(false);
      }
    },
    [backedUpUser, user, continueAsGuest, persistCalibratedSetup, onComplete]
  );

  const handleLinkGoogleAtReveal = useCallback(async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await performGoogleSignIn();
      if (res.success && res.user) {
        const linked = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName,
          photoURL: res.user.photoURL,
        };
        setBackedUpUser(linked);
        if (!athleteName.trim() && res.user.displayName) {
          setAthleteName(res.user.displayName);
        }
        // Immediately back up the newly calibrated profile, plan, and starting weight to Google
        await persistCalibratedSetup({
          finalUid: linked.uid,
          isCloud: true,
          displayName: linked.displayName,
          photoURL: linked.photoURL,
        });
      } else if (!res.cancelled) {
        setAuthError(res.error || 'Google sign-in could not be completed.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Unable to connect Google account.');
    } finally {
      setAuthLoading(false);
    }
  }, [performGoogleSignIn, athleteName, persistCalibratedSetup]);

  // ─── Derived UI Metadata ────────────────────────────────────────────────────
  const quizStepNumber = useMemo(() => {
    if (currentStep === 'welcome') return 0;
    const idx = QUIZ_STEPS_ORDER.indexOf(currentStep);
    return idx >= 0 ? idx + 1 : 1;
  }, [currentStep]);

  const splitMeta = useMemo(
    () => SPLIT_OPTIONS.find((s) => s.id === splitPreference) || SPLIT_OPTIONS[0],
    [splitPreference]
  );

  const effectiveGoal: TrainingGoalId = trainingGoal ?? 'hypertrophy';
  const effectiveExperience: ExperienceLevelId = experienceLevel ?? 'intermediate';

  const goalMeta = useMemo(
    () => GOAL_OPTIONS.find((g) => g.id === effectiveGoal) || GOAL_OPTIONS[0],
    [effectiveGoal]
  );

  const previewPlan = useMemo(
    () =>
      buildOnboardingUserGymPlan({
        userId: user?.uid || 'preview',
        displayName: athleteName.trim() || 'Athlete',
        weightKg,
        heightCm,
        goal: effectiveGoal,
        experience: effectiveExperience,
        daysPerWeek,
        splitPreference,
      }),
    [user?.uid, athleteName, weightKg, heightCm, effectiveGoal, effectiveExperience, daysPerWeek, splitPreference]
  );

  const firstWorkout = useMemo(() => getFirstWorkoutPreview(previewPlan), [previewPlan]);

  const heightDisplay = useMemo(() => {
    if (heightUnit === 'cm') return `${heightCm} cm`;
    const totalInc = Math.round(heightCm / 2.54);
    return `${Math.floor(totalInc / 12)}'${totalInc % 12}"`;
  }, [heightUnit, heightCm]);

  const weightDisplay = useMemo(() => {
    if (weightUnit === 'kg') return `${(Math.round(weightKg * 2) / 2).toFixed(1)} kg`;
    return `${Math.round(weightKg * 2.20462)} lbs`;
  }, [weightUnit, weightKg]);

  const bmi = useMemo(() => {
    const hM = Math.max(1.2, heightCm / 100);
    return Math.round((weightKg / (hM * hM)) * 10) / 10;
  }, [heightCm, weightKg]);

  const auraMode: AuraMode = useMemo(() => {
    if (currentStep === 'welcome') return 'welcome';
    if (currentStep === 'alerts') return alertsAuraTone;
    return 'cobalt';
  }, [currentStep, alertsAuraTone]);

  const progressColor = useMemo(() => {
    if (currentStep === 'alerts') {
      return alertsAuraTone === 'amber' ? tokens.status.warning : tokens.status.success;
    }
    return tokens.accent.primary;
  }, [currentStep, alertsAuraTone, tokens]);

  const showPinnedContinue =
    currentStep === 'identity' ||
    currentStep === 'ageHeight' ||
    currentStep === 'weight' ||
    currentStep === 'split' ||
    (currentStep === 'goals' && revisitedSteps.has('goals') && trainingGoal !== null) ||
    (currentStep === 'experience' && revisitedSteps.has('experience') && experienceLevel !== null);

  const enteringAnim = !hasTransitioned
    ? FadeIn.duration(240)
    : navDir === 'forward'
    ? SlideInRight.duration(220).easing(iosEasing.decel)
    : SlideInLeft.duration(220).easing(iosEasing.decel);

  const exitingAnim =
    navDir === 'forward'
      ? SlideOutLeft.duration(170)
      : SlideOutRight.duration(170);

  const isScrollStep =
    currentStep === 'identity' ||
    currentStep === 'ageHeight' ||
    currentStep === 'weight' ||
    currentStep === 'goals' ||
    currentStep === 'experience' ||
    currentStep === 'split';

  const isGoogleSignedIn = Boolean(backedUpUser || (user && !(user as any).isAnonymous));

  return (
    <ScreenWrapper
      edges={['top', 'bottom', 'left', 'right']}
      topAura={false}
      keyboardAvoiding={currentStep === 'identity'}
      style={styles.root}
    >
      <OnboardingAuraBackdrop mode={auraMode} welcomeProgressSV={welcomeProgressSV} />

      <OnboardingHeader
        quizStepIndex={quizStepNumber}
        totalQuizSteps={QUIZ_STEPS_ORDER.length}
        onBack={goToPrevStep}
        showBrandWordmark={currentStep === 'reveal'}
        welcomeProgressSV={currentStep === 'welcome' ? welcomeProgressSV : undefined}
        progressColor={progressColor}
      />

      <View style={styles.stageViewport}>
        <Animated.View
          key={currentStep}
          entering={enteringAnim}
          exiting={exitingAnim}
          style={styles.stepFrame}
        >
          {currentStep === 'welcome' ? (
            <WelcomeHeroStage
              scrollProgressSV={welcomeProgressSV}
              onGetStarted={goToNextStep}
              onGoogleSignIn={handleReturningGoogleSignIn}
              authLoading={authLoading}
              authError={authError}
              onClearAuthError={() => setAuthError('')}
            />
          ) : isScrollStep ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {currentStep === 'identity' && (
                <IdentityStep
                  athleteName={athleteName}
                  onChangeName={setAthleteName}
                  gender={gender}
                  onSelectGender={setGender}
                  signedInEmail={isGoogleSignedIn ? user?.email : null}
                />
              )}

              {currentStep === 'ageHeight' && (
                <AgeHeightStep
                  age={age}
                  onChangeAge={setAge}
                  heightCm={heightCm}
                  onChangeHeightCm={setHeightCm}
                  heightUnit={heightUnit}
                  onChangeHeightUnit={setHeightUnit}
                />
              )}

              {currentStep === 'weight' && (
                <WeightStep
                  weightKg={weightKg}
                  onChangeWeightKg={setWeightKg}
                  weightUnit={weightUnit}
                  onChangeWeightUnit={setWeightUnit}
                  heightCm={heightCm}
                />
              )}

              {currentStep === 'goals' && (
                <GoalStep
                  selectedGoal={trainingGoal}
                  onSelectGoal={handleSelectGoal}
                />
              )}

              {currentStep === 'experience' && (
                <ExperienceStep
                  selectedExperience={experienceLevel}
                  onSelectExperience={handleSelectExperience}
                />
              )}

              {currentStep === 'split' && (
                <ScheduleSplitStep
                  daysPerWeek={daysPerWeek}
                  onSelectDays={handleSelectDays}
                  splitPreference={splitPreference}
                  onSelectSplit={handleSelectSplit}
                />
              )}
            </ScrollView>
          ) : currentStep === 'alerts' ? (
            <View style={styles.paddedStage}>
              <AlertsStep
                onRequestPermission={requestNotificationPermissions}
                onAuraToneChange={setAlertsAuraTone}
                onResolved={(enabled) => {
                  AsyncStorage.setItem(GYM_NOTIF_ENABLED_KEY, enabled ? 'true' : 'false').catch(() => {});
                  goToNextStep();
                }}
              />
            </View>
          ) : (
            <View style={styles.paddedStage}>
              <RevealStep
                displayName={athleteName.trim() || backedUpUser?.displayName || user?.displayName || 'Athlete'}
                photoURL={backedUpUser?.photoURL || user?.photoURL || null}
                gender={gender}
                age={age}
                heightDisplay={heightDisplay}
                weightDisplay={weightDisplay}
                bmi={bmi}
                goalLabel={goalMeta.shortLabel}
                splitName={splitMeta.title}
                firstWorkout={firstWorkout}
                isGoogleSignedIn={isGoogleSignedIn}
                googleEmail={backedUpUser?.email || user?.email}
                savingProfile={savingProfile}
                authLoading={authLoading}
                authError={authError}
                onLinkGoogle={handleLinkGoogleAtReveal}
                onFinishGuestOrSignedIn={() => finalizeAndEnter()}
              />
            </View>
          )}
        </Animated.View>
      </View>

      {showPinnedContinue ? (
        <View style={styles.footerDock}>
          <TactileButton
            variant="custom"
            haptic="medium"
            onPress={goToNextStep}
            style={styles.continueBtn}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
            <ArrowRight size={ICON.sm + 1} strokeWidth={2.2} color={tokens.accent.onPrimary} />
          </TactileButton>
        </View>
      ) : null}
    </ScreenWrapper>
  );
}

const makeStyles = (tokens: ThemeTokens, _isDark: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: tokens.bg.canvas,
    },
    stageViewport: {
      flex: 1,
      overflow: 'hidden',
    },
    stepFrame: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: SPACE.lg + 4,
      paddingTop: SPACE.xs,
      paddingBottom: SPACE.md,
    },
    paddedStage: {
      flex: 1,
      paddingHorizontal: SPACE.lg + 4,
      paddingBottom: SPACE.sm,
    },
    footerDock: {
      paddingHorizontal: SPACE.lg + 4,
      paddingTop: SPACE.xs + 2,
      paddingBottom: SPACE.sm,
    },
    continueBtn: {
      height: 48,
      borderRadius: 14,
      backgroundColor: tokens.accent.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    continueBtnText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
      color: tokens.accent.onPrimary,
      includeFontPadding: false,
    },
  });
