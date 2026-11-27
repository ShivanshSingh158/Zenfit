import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  InteractionManager,
  BackHandler,
  ScrollView,
  DeviceEventEmitter,
  StyleSheet,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChevronDown,
  ChevronLeft,
  Trophy,
  X,
} from 'lucide-react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { springs, durations } from '../../theme/motion';
import { useGymLog, todayStr } from '../../hooks/useGymLog';
import { useGymLogs, useGymPlan, setWorkoutActiveGlobal, getWorkoutDateGlobal } from '../../contexts/domains/WellnessContext';
import { useTheme } from '../../contexts/ThemeContext';
import { calculateExerciseMaxWeight, getPreviousExerciseSession, getExerciseSwapAlternatives, normalizeExerciseKey } from '../../utils/gymUtils';
import { hapticLight, hapticMedium, hapticSuccess, hapticSelection, hapticError } from '../../utils/haptics';
import { autoResolveExerciseVideoId } from '../../services/exerciseVideoResolver';
import { getOverloadSuggestion, getRestDuration } from '../../services/progressiveOverload';
import { playSetCompleteTone, isAudioCuesEnabledGlobal, setAudioCuesEnabledGlobal, warmUpGymAudioSynthesizer } from '../../services/gymSoundSynthesizer';
import { GymNavigationParamList } from '../../types/gym.types';

import { makeActiveLoggingStyles } from './activeLoggingStyles';
import {
  TactileButton,
  NumericText,
  AppIcon,
} from '../../components/ui';
import {
  SetList,
  ActiveExerciseHeader,
  RestTimerBar as AnimatedRestTimer,
  WorkoutKeypad,
} from '../../components/workout';
import ActiveLoggingHeader from './active/ActiveLoggingHeader';
import ExerciseSelectorStrip, { ExerciseFooterNav } from './active/ExerciseSelectorStrip';
import type { PendingSwapPermanent } from './active/ActiveConfirmSheets';

// ── Lazy-loaded Heavy Active Modals & Sheets (0ms cold/entrance cost + clean 380ms unmount) ──
const AddExerciseModal = React.lazy(() => import('../../components/Gym/exercise/AddExerciseModal'));
const SupersetPickerModal = React.lazy(() => import('../../components/Gym/exercise/SupersetPickerModal'));
const ActiveSwapModal = React.lazy(() => import('../../components/Gym/active/ActiveSwapModal'));
const ActiveWorkoutModals = React.lazy(() => import('./active/ActiveWorkoutModals'));
const ActiveConfirmSheets = React.lazy(() => import('./active/ActiveConfirmSheets'));
import { LazySheet } from '../../hooks/useLazySheetMount';
import { afterSheetDismiss } from '../../utils/sheetCoordinator';
import { resolveExerciseEquipment } from '../../utils/equipmentResolver';
import { insertWarmupLadder } from '../../utils/warmupGenerator';
import { dismissActiveWorkoutNotification } from '../../services/activeWorkoutNotificationService';
import {
  SetInputState,
  parseUpperTargetReps,
  resolveSetWeightAndReps,
  findNextSupersetExerciseIndex,
  computeInitialSetInputs,
} from '../../utils/activeLoggingMath';
import { useActiveWidgetSync } from '../../hooks/useActiveWidgetSync';
import {
  useGymProfile,
  setAutoTimerEnabledGlobal,
  isAutoTimerEnabledSync,
  isKeepAwakeEnabledSync,
  setKeepAwakeEnabledGlobal,
  setDefaultRestSecsGlobal,
  getDefaultRestSecsSync,
} from '../../hooks/useGymProfile';
import { formatWeight, useWeightUnit, unitLabel, kgToDisplay, displayToKg } from '../../utils/weightUnit';

export { parseUpperTargetReps };

const computeExerciseBaselineMap = (pastLogs: any[]): Map<string, { maxWeight: number; max1RM: number }> => {
  const map = new Map<string, { maxWeight: number; max1RM: number }>();
  if (!pastLogs?.length) return map;
  for (let i = 0; i < pastLogs.length; i++) {
    const exs = pastLogs[i].exercises || [];
    for (let j = 0; j < exs.length; j++) {
      const ex = exs[j];
      if (!ex || ex.skipped) continue;
      const key = normalizeExerciseKey(ex.name);
      if (!key) continue;
      let entry = map.get(key);
      const sets = ex.setsLog || [];
      for (let k = 0; k < sets.length; k++) {
        const s = sets[k];
        if (!s.completed) continue;
        const w = Number(s.weight) || 0;
        const r = Number(s.reps) || 0;
        if (!entry) {
          entry = { maxWeight: 0, max1RM: 0 };
          map.set(key, entry);
        }
        if (w > entry.maxWeight) entry.maxWeight = w;
        const e1rm = w * (1 + r / 30);
        if (e1rm > entry.max1RM) entry.max1RM = e1rm;
      }
    }
  }
  return map;
};

export default function ActiveLoggingScreen() {
  const { colors, isDark, tokens } = useTheme();
  const styles = useMemo(() => makeActiveLoggingStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<NativeStackNavigationProp<GymNavigationParamList>>();
  const route = useRoute<RouteProp<GymNavigationParamList, 'ActiveLogging'>>();
  const lockedSessionDateRef = useRef<string>(route.params?.date || todayStr());
  const date = lockedSessionDateRef.current;

  // Custom in-app workout keypad (Hevy / Lyfta typing area)
  const [activeKeypad, setActiveKeypad] = useState<{
    setIndex: number;
    field: 'weight' | 'reps';
  } | null>(null);
  const [isFieldSelected, setIsFieldSelected] = useState(true);
  const isFieldSelectedRef = useRef(true);
  const [showWorkoutSettingsSheet, setShowWorkoutSettingsSheet] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => isAudioCuesEnabledGlobal());
  const [keepAwakeEnabled, setKeepAwakeEnabled] = useState<boolean>(() => isKeepAwakeEnabledSync());
  const [restPickerSetIdx, setRestPickerSetIdx] = useState<number | null>(null);
  const [sheetInitialSecs, setSheetInitialSecs] = useState<number>(() => getDefaultRestSecsSync());

  const {
    log,
    addExercise,
    deleteExercise,
    updateExercise,
    updateNotes,
    startRestTimer,
    clearRestTimer,
    setRestTimerDuration,
    restTimerStartTime,
    restTimerDurationSecs,
    restTimerInitial,
    swapExercise,
    makeSwapPermanent,
    logSetAndStartTimer,
    startWorkout,
    resumeWorkout,
    endWorkout,
    historyIndex,
  } = useGymLog(date);
  const historyIndexRef = useRef(historyIndex);
  historyIndexRef.current = historyIndex;

  if (log?.date && lockedSessionDateRef.current !== log.date) {
    lockedSessionDateRef.current = log.date;
  }

  const activeLogStateRef = useRef(log);
  activeLogStateRef.current = log;

  const initialPastDurationMs = log?.workoutDurationSeconds
    ? log.workoutDurationSeconds * 1000
    : (log?.workoutDurationMinutes || 0) * 60000;
  const pendingAutoStartAnchorRef = useRef<number | null>(
    route.params?.autoStart && !route.params?.previewOnly && !log?.workoutStartTime
      ? Date.now()
      : null
  );
  const displayWorkoutStartTime =
    log?.workoutStartTime ??
    (pendingAutoStartAnchorRef.current
      ? pendingAutoStartAnchorRef.current - initialPastDurationMs
      : undefined);

  const insets = useSafeAreaInsets();
  const { gymProfile, saveGymProfile } = useGymProfile();
  const unitIsLbs = useWeightUnit();
  const [autoTimerEnabled, setAutoTimerEnabled] = useState<boolean>(() => isAutoTimerEnabledSync());

  useEffect(() => {
    const subAuto = DeviceEventEmitter.addListener('auto_timer_setting_changed', (val: boolean) => {
      setAutoTimerEnabled(val);
    });
    const subAudio = DeviceEventEmitter.addListener('audio_cues_setting_changed', (val: boolean) => {
      setSoundEnabled(val);
      setAudioCuesEnabledGlobal(val);
    });
    const subAwake = DeviceEventEmitter.addListener('keep_awake_setting_changed', (val: boolean) => {
      setKeepAwakeEnabled(val);
    });
    return () => {
      subAuto.remove();
      subAudio.remove();
      subAwake.remove();
    };
  }, []);

  // Honor Keep Screen Awake preference after entrance transition settles
  useEffect(() => {
    let cancelled = false;
    const handle = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      if (keepAwakeEnabled) {
        activateKeepAwakeAsync('zenfit_active_workout').catch(() => {});
      } else {
        deactivateKeepAwake('zenfit_active_workout').catch(() => {});
      }
    });
    return () => {
      cancelled = true;
      handle.cancel();
      deactivateKeepAwake('zenfit_active_workout').catch(() => {});
    };
  }, [keepAwakeEnabled]);

  const isLoggingSetRef = useRef(false);
  const supersetJumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef<any>({});
  const autoStartHandledRef = useRef(false);

  const runPendingAutoStart = useCallback(() => {
    if (autoStartHandledRef.current) return;
    const mode = route.params?.autoStart;
    if (!mode || route.params?.previewOnly) return;
    autoStartHandledRef.current = true;
    const anchor = pendingAutoStartAnchorRef.current ?? Date.now();
    if (mode === 'resume') {
      resumeWorkout(anchor);
    } else if (mode === 'start') {
      const curLog = activeLogStateRef.current;
      const pastMs = curLog?.workoutDurationSeconds
        ? curLog.workoutDurationSeconds * 1000
        : (curLog?.workoutDurationMinutes || 0) * 60000;
      startWorkout(anchor - pastMs);
    }
  }, [route.params?.autoStart, route.params?.previewOnly, startWorkout, resumeWorkout]);

  // PERF: Defer workout activation, audio warmup, and notification dismissal until slide finishes
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      warmUpGymAudioSynthesizer().catch(() => {});
      runPendingAutoStart();
      if (activeLogStateRef.current?.workoutStartTime && !activeLogStateRef.current?.completed && !route.params?.previewOnly) {
        setWorkoutActiveGlobal(true, activeLogStateRef.current.workoutStartTime, date);
      }
    });
    return () => {
      handle.cancel();
      if (
        !route.params?.previewOnly &&
        !autoStartHandledRef.current &&
        getWorkoutDateGlobal() === date &&
        (!activeLogStateRef.current?.workoutStartTime || activeLogStateRef.current?.completed)
      ) {
        setWorkoutActiveGlobal(false);
      }
      if (supersetJumpTimerRef.current) {
        clearTimeout(supersetJumpTimerRef.current);
        supersetJumpTimerRef.current = null;
      }
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, [date, route.params?.previewOnly, runPendingAutoStart]);

  // ── High-Contrast Screen Flash Rest Alert (120fps Reanimated UI Thread) ──
  const flashOpacity = useSharedValue(0);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('gym_rest_timer_flash', () => {
      flashOpacity.value = withSequence(
        withTiming(0.28, { duration: 90 }),
        withTiming(0, { duration: 80 }),
        withTiming(0.28, { duration: 90 }),
        withTiming(0, { duration: 250 })
      );
    });
    return () => sub.remove();
  }, [flashOpacity]);

  const flashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const [showSupersetPicker, setShowSupersetPicker] = useState(false);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const targetParamIndex = route.params?.initialIndex ?? (route.params as any)?.exerciseIndex ?? 0;
  const [activeExIndex, setActiveExIndex] = useState(targetParamIndex);
  const [visualExIndex, setVisualExIndex] = useState(targetParamIndex);
  const visualExIndexRef = useRef(visualExIndex);
  visualExIndexRef.current = visualExIndex;

  // ── Native Stack Entrance + Pull-to-Dismiss Support ────────────────────────
  const fullSlideHeight = screenHeight > 0 ? screenHeight : 860;
  const sheetTranslateY = useSharedValue(0);
  const sheetBackdrop = useSharedValue(1);
  const isClosingRef = useRef(false);
  const [hasRemoveConfirmOpen, setHasRemoveConfirmOpen] = useState(false);

  const sheetModalAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  // ── Synchronized Directional Deck Roll + Staggered Sets Wave (120fps) ──
  const headerSlideX = useSharedValue(0);
  const headerOpacity = useSharedValue(1);
  const setsSlideX = useSharedValue(0);
  const setsOpacity = useSharedValue(1);
  const setsScale = useSharedValue(1);
  const switchSeqRef = useRef(0);
  const pendingEnterDirRef = useRef<1 | -1 | null>(null);
  const enterRafRef = useRef<number | null>(null);
  const bodyScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const dir = pendingEnterDirRef.current;
    if (!dir) return;
    pendingEnterDirRef.current = null;

    headerSlideX.value = dir * screenWidth * 0.22;
    headerOpacity.value = 0;
    setsSlideX.value = dir * screenWidth * 0.28;
    setsOpacity.value = 0;
    setsScale.value = 0.985;

    // Start GPU glide after React/Yoga finishes committing incoming exercise rows
    enterRafRef.current = requestAnimationFrame(() => {
      enterRafRef.current = null;
      const slideCurve = Easing.bezier(0.16, 1, 0.3, 1);
      headerSlideX.value = withTiming(0, {
        duration: 165,
        easing: slideCurve,
      });
      headerOpacity.value = withTiming(1, {
        duration: 145,
        easing: slideCurve,
      });
      setsSlideX.value = withDelay(
        12,
        withTiming(0, { duration: 180, easing: slideCurve })
      );
      setsOpacity.value = withDelay(
        12,
        withTiming(1, { duration: 155, easing: slideCurve })
      );
      setsScale.value = withDelay(
        12,
        withTiming(1, { duration: 175, easing: slideCurve })
      );
    });

    return () => {
      if (enterRafRef.current !== null) {
        cancelAnimationFrame(enterRafRef.current);
        enterRafRef.current = null;
      }
    };
  }, [activeExIndex, screenWidth, headerSlideX, headerOpacity, setsSlideX, setsOpacity, setsScale]);

  const headerRollStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateX: headerSlideX.value }],
  }));

  const setsRollStyle = useAnimatedStyle(() => ({
    opacity: setsOpacity.value,
    transform: [{ translateX: setsSlideX.value }, { scale: setsScale.value }] as const,
  }));

  // Track initialIndex consumption via ref only — no navigation.setParams() on mount.
  const consumedInitialIndexRef = useRef<number | null>(targetParamIndex);

  const restTimerInitialRef = useRef(restTimerInitial);
  useEffect(() => {
    restTimerInitialRef.current = restTimerInitial;
  }, [restTimerInitial]);

  const videoRetryCountMapRef = useRef<Record<string, number>>({});

  const carouselScrollRef = useRef<ScrollView>(null);
  const pillLayoutsRef = useRef<{ [key: number]: { x: number; width: number } }>({});
  const hasScrolledInitialPillRef = useRef(visualExIndex <= 0);
  const prevVisualExIdxRef = useRef(visualExIndex);

  const scrollToActivePill = useCallback((index: number, animated = true) => {
    const layout = pillLayoutsRef.current[index];
    if (layout && carouselScrollRef.current) {
      const targetX = Math.max(0, layout.x - (screenWidth / 2) + (layout.width / 2));
      carouselScrollRef.current.scrollTo({ x: targetX, animated });
    }
  }, [screenWidth]);

  useEffect(() => {
    if (prevVisualExIdxRef.current === visualExIndex) return;
    prevVisualExIdxRef.current = visualExIndex;
    if (pillLayoutsRef.current[visualExIndex]) {
      scrollToActivePill(visualExIndex, true);
    }
  }, [visualExIndex, scrollToActivePill]);

  useEffect(() => {
    const target = route.params?.initialIndex ?? (route.params as any)?.exerciseIndex;
    if (target !== undefined && consumedInitialIndexRef.current !== target) {
      consumedInitialIndexRef.current = target;
      setActiveExIndex(target);
      setVisualExIndex(target);
    }
  }, [route.params?.initialIndex, (route.params as any)?.exerciseIndex]);

  const [showVideo, setShowVideo] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [aiSwapList, setAiSwapList] = useState<any[]>([]);
  const [isAiSwapLoading, setIsAiSwapLoading] = useState(false);
  const [isRefreshingVideo, setIsRefreshingVideo] = useState(false);
  const [showCompletedWarmups, setShowCompletedWarmups] = useState(false);
  const [deepDiveVisible, setDeepDiveVisible] = useState(false);
  const [deepDiveTab, setDeepDiveTab] = useState<'guide' | 'analytics'>('guide');
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [showDiscardConfirmSheet, setShowDiscardConfirmSheet] = useState(false);
  const [deleteSetConfirmIdx, setDeleteSetConfirmIdx] = useState<number | null>(null);
  const [pendingSwapPermanent, setPendingSwapPermanent] = useState<PendingSwapPermanent | null>(null);
  const [showWhatHitsSheet, setShowWhatHitsSheet] = useState(false);
  const [showWorkoutMenuSheet, setShowWorkoutMenuSheet] = useState(false);
  const [showExerciseMenuSheet, setShowExerciseMenuSheet] = useState(false);
  const [showFinishEarlySheet, setShowFinishEarlySheet] = useState(false);
  const [uncheckedSetsCount, setUncheckedSetsCount] = useState(0);
  const [completedSetsCount, setCompletedSetsCount] = useState(0);
  const [sessionNote, setSessionNote] = useState(() => log?.notes || '');

  useEffect(() => {
    if (log?.notes !== undefined && log.notes !== sessionNote) {
      setSessionNote(log.notes);
    }
  }, [log?.notes]);

  const [noteModalConfig, setNoteModalConfig] = useState<{
    visible: boolean;
    title: string;
    initialNote: string;
    target: 'session' | 'exercise';
  }>({
    visible: false,
    title: '',
    initialNote: '',
    target: 'session',
  });

  

  useEffect(() => {
    setShowCompletedWarmups(false);
  }, [activeExIndex]);

  const { gymLogs } = useGymLogs();
  const { userGymPlan } = useGymPlan();
  const activeProgramme = userGymPlan?.activeProgramme?.status === 'active' ? userGymPlan.activeProgramme : null;
  const activeProgrammeWeek = activeProgramme?.weeks?.[activeProgramme.currentWeek];

  const activeExercises = useMemo(() => log?.exercises?.filter(ex => !ex.skipped) || [], [log?.exercises]);
  const safeIdx = Math.min(activeExIndex, Math.max(0, activeExercises.length - 1));
  const exercise = activeExercises[safeIdx];

  // ── Live Cumulative Session Volume (openGym Pattern: real-time tonnage counter) ──
  const liveTotalVolume = useMemo(() => {
    if (!activeExercises || activeExercises.length === 0) return 0;
    let total = 0;
    for (const ex of activeExercises) {
      if (!ex.setsLog) continue;
      for (const s of ex.setsLog) {
        if (s.completed && s.weight != null && s.reps != null) {
          const w = Number(s.weight);
          const r = Number(s.reps);
          if (!isNaN(w) && !isNaN(r) && w > 0 && r > 0) {
            total += w * r;
          }
        }
      }
    }
    return Math.round(total);
  }, [activeExercises]);

  const resolvedLastSessionSets = useMemo(() => {
    if (!exercise) return [];
    if (Array.isArray(exercise.lastSessionSets) && exercise.lastSessionSets.length > 0) {
      return exercise.lastSessionSets;
    }
    const indexed = historyIndexRef.current?.get(normalizeExerciseKey(exercise.name));
    if (indexed?.sets?.length) return indexed.sets;
    const prev = getPreviousExerciseSession(exercise.name, gymLogs, date || todayStr());
    return prev?.sets || [];
  }, [exercise?.lastSessionSets, exercise?.name, gymLogs, date]);

  // ── FIX 1: Lazy-initialize setInputs synchronously in the useState initializer.
  // Also pre-seed lastExerciseKeyRef & prevSetsLengthRef so the sync useEffect
  // skips a redundant Frame-1 recompute + setSetInputs re-render.
  const userEditedFieldsRef = useRef<{ [idx: number]: { weight?: boolean; reps?: boolean } }>({});
  const initialExKey = exercise ? `${exercise.exerciseId || exercise.name || ''}-${activeExIndex}` : '';
  const lastExerciseKeyRef = useRef<string>(initialExKey);
  const liveInputsRef = useRef<{ [idx: number]: { weight?: string; reps?: string } }>({});
  const prevSetsLengthRef = useRef<number>(exercise?.setsLog?.length ?? -1);
  const [setInputs, setSetInputs] = useState<SetInputState[]>(() =>
    computeInitialSetInputs(exercise, gymLogs, date, historyIndexRef.current, unitIsLbs)
  );

  // Synchronous Frame-0 overload & history baseline (eliminates 225ms + 80ms pop-in jump)
  const [liveOverloadOverride, setLiveOverloadOverride] = useState<{ exKey: string; suggestion: any } | null>(null);
  const [prToast, setPrToast] = useState<{ message: string } | null>(null);
  const prToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDismissPrToast = useCallback(() => {
    hapticLight();
    if (prToastTimerRef.current) {
      clearTimeout(prToastTimerRef.current);
      prToastTimerRef.current = null;
    }
    setPrToast(null);
  }, []);

  const lastBannerExKeyRef = useRef<string>(initialExKey);

  // ── Sync Live Workout State with Android Home Screen Widget ───────────────
  const { appState } = useActiveWidgetSync({
    activeExercises,
    safeIdx,
    date,
    log,
  });

  // Clean up lock screen notification after modal slide settles (and on unmount)
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      dismissActiveWorkoutNotification();
    });
    return () => {
      handle.cancel();
      dismissActiveWorkoutNotification();
    };
  }, []);

  const exercises = activeExercises;

  const totalSessionSets = useMemo(() => {
    return (exercises || []).reduce((acc: number, ex: any) => acc + (ex.setsLog?.length || 0), 0);
  }, [exercises]);

  const totalCompletedSets = useMemo(() => {
    return (exercises || []).reduce(
      (acc: number, ex: any) => acc + (ex.setsLog?.filter((s: any) => s.completed).length || 0),
      0
    );
  }, [exercises]);

  const initialProgressRatio =
    totalSessionSets > 0
      ? Math.min(1, Math.max(0, totalCompletedSets / totalSessionSets))
      : 0;
  const fallbackTrackWidth = Math.max(120, screenWidth - 110);
  const progressTrackWidthSV = useSharedValue(fallbackTrackWidth);
  const progressTrackMeasuredRef = useRef(false);
  const sessionProgress = useSharedValue(initialProgressRatio);
  const hasMountedProgressRef = useRef(false);

  useEffect(() => {
    const ratio =
      totalSessionSets > 0
        ? Math.min(1, Math.max(0, totalCompletedSets / totalSessionSets))
        : 0;
    if (!hasMountedProgressRef.current) {
      hasMountedProgressRef.current = true;
      sessionProgress.value = ratio;
      return;
    }
    sessionProgress.value = withTiming(ratio, { duration: durations.crossFade });
  }, [totalCompletedSets, totalSessionSets, sessionProgress]);

  const sessionProgressStyle = useAnimatedStyle(() => {
    'worklet';
    const w = progressTrackWidthSV.value;
    return {
      transform: [{ translateX: -(1 - sessionProgress.value) * w }],
    };
  });

  const handleSessionTrackLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && (!progressTrackMeasuredRef.current || Math.abs(w - progressTrackWidthSV.value) > 0.5)) {
      progressTrackMeasuredRef.current = true;
      progressTrackWidthSV.value = w;
    }
  }, [progressTrackWidthSV]);

  const realExerciseIndex = useMemo(() => {
    if (!log?.exercises || !exercise) return safeIdx;
    const directIdx = log.exercises.indexOf(exercise);
    if (directIdx !== -1) return directIdx;
    if (exercise.exerciseId) {
      const idIdx = log.exercises.findIndex(e => e.exerciseId === exercise.exerciseId);
      if (idIdx !== -1) return idIdx;
    }
    if (exercise._idx !== undefined) {
      const idxMatch = log.exercises.findIndex(e => e._idx === exercise._idx);
      if (idxMatch !== -1) return idxMatch;
    }
    const nameIdx = log.exercises.findIndex(e => e.name === exercise.name);
    if (nameIdx !== -1) return nameIdx;
    return safeIdx;
  }, [log?.exercises, exercise, safeIdx]);

  // Superset partner exercise lookup
  const partnerExercise = useMemo(() => {
    if (!exercise?.supersetGroup) return null;
    return activeExercises.find(
      (e, i) => e.supersetGroup === exercise.supersetGroup &&
        i !== safeIdx &&
        ((e.exerciseId && exercise.exerciseId && e.exerciseId !== exercise.exerciseId) || e.name !== exercise.name)
    );
  }, [exercise?.supersetGroup, exercise?.exerciseId, exercise?.name, activeExercises, safeIdx]);

  const targetDateStr = lockedSessionDateRef.current;
  // Filter historical gym logs strictly BEFORE targetDateStr and stabilize with fingerprinting
  // so today's live sets don't churn history or re-trigger overload calculations
  const pastGymLogsRef = useRef<any[]>([]);
  const pastLogsFingerprintRef = useRef<string>('');
  const pastGymLogs = useMemo(() => {
    if (!gymLogs || gymLogs.length === 0) return [];
    const past = gymLogs.filter(l => l.date < targetDateStr);
    const fingerprint = past.map(l => `${l.date}_${l.exercises?.length ?? 0}`).join('|');
    if (fingerprint === pastLogsFingerprintRef.current && pastGymLogsRef.current.length === past.length) {
      return pastGymLogsRef.current;
    }
    pastLogsFingerprintRef.current = fingerprint;
    pastGymLogsRef.current = past;
    return past;
  }, [gymLogs, targetDateStr]);

  const baselinePRMap = useMemo(() => computeExerciseBaselineMap(pastGymLogs), [pastGymLogs]);

  const currentExKey = exercise ? `${exercise.exerciseId || exercise.name || ''}-${activeExIndex}` : '';
  const currentExKeyRef = useRef(currentExKey);
  currentExKeyRef.current = currentExKey;

  const programmeRecoveryContext = useMemo(() => {
    if (!activeProgramme || !activeProgrammeWeek) return undefined;
    return {
      programme: {
        weekNumber: activeProgramme.currentWeek,
        phaseName: activeProgrammeWeek.phaseName,
        phaseType: activeProgrammeWeek.phaseType,
        targetRir: activeProgrammeWeek.targetRir,
        intensityPercentage1RM: activeProgrammeWeek.intensityPercentage1RM,
        volumeModifierSets: activeProgrammeWeek.volumeModifierSets,
      },
    };
  }, [activeProgramme, activeProgrammeWeek]);

  // Frame-0 synchronous overload & last-session readout (reuses historyIndex O(1) lookup)
  const computedBannerMeta = useMemo(() => {
    if (!exercise) {
      return { suggestion: null as any, lastTimeData: null as string | null };
    }
    lastBannerExKeyRef.current = currentExKey;
    const prevSession =
      historyIndexRef.current?.get(normalizeExerciseKey(exercise.name)) ||
      getPreviousExerciseSession(exercise.name, gymLogs, targetDateStr);
    const curWeight =
      calculateExerciseMaxWeight(exercise as any) ||
      prevSession?.lastWeight ||
      Number(exercise.lastSessionSets?.[0]?.weight) ||
      0;

    const suggestion = getOverloadSuggestion(
      exercise,
      curWeight,
      exercise.targetSets || 3,
      String(exercise.targetReps || '8'),
      pastGymLogs,
      programmeRecoveryContext
    );

    let lastTimeStr: string | null = null;
    if (prevSession && prevSession.sets.length > 0) {
      const weightPart = prevSession.lastWeight
        ? `@ ${formatWeight(Number(prevSession.lastWeight), unitIsLbs, 1)}`
        : '';
      const repsPart = prevSession.avgReps ? `${prevSession.avgReps} reps` : '';
      lastTimeStr = `Last: ${prevSession.sets.length} sets ${repsPart ? `× ${repsPart}` : ''} ${weightPart}`.trim();
    }
    return { suggestion, lastTimeData: lastTimeStr };
  }, [exercise?.exerciseId, exercise?.name, exercise?.targetSets, exercise?.targetReps, exercise?.progressionPolicy, currentExKey, pastGymLogs, gymLogs, targetDateStr, unitIsLbs, programmeRecoveryContext]);

  const overloadSuggestion =
    liveOverloadOverride && liveOverloadOverride.exKey === currentExKey
      ? liveOverloadOverride.suggestion
      : computedBannerMeta.suggestion;
  const lastTimeData = computedBannerMeta.lastTimeData;

  const lastUnitIsLbsRef = useRef<boolean>(unitIsLbs);

  // Sync setInputs when exercise switches, set count changes, or display unit changes.
  useEffect(() => {
    if (!exercise || !exercise.setsLog) return;

    const currentExId = exercise.exerciseId || exercise.name || '';
    const key = `${currentExId}-${activeExIndex}`;
    const currentLen = exercise.setsLog.length;
    const unitChanged = lastUnitIsLbsRef.current !== unitIsLbs;
    lastUnitIsLbsRef.current = unitIsLbs;

    // Exercise switched or display unit switched → reset edit tracking & recompute in display unit
    if (key !== lastExerciseKeyRef.current || unitChanged) {
      lastExerciseKeyRef.current = key;
      prevSetsLengthRef.current = currentLen;
      userEditedFieldsRef.current = {};
      liveInputsRef.current = {};
      setSetInputs(computeInitialSetInputs(exercise, stateRef.current.gymLogs, date, historyIndexRef.current, unitIsLbs));
      return;
    }

    // Check if there are unfilled incomplete set inputs that can now be populated from resolvedLastSessionSets
    const curInputs = stateRef.current.setInputs || [];
    const hasUnfilled = curInputs.some(
      (inp, i) => !exercise.setsLog[i]?.completed && (!inp.weight || !inp.reps) && !userEditedFieldsRef.current[i]?.weight
    );
    const shouldBackfillFromHistory = hasUnfilled && resolvedLastSessionSets.length > 0;

    // Skip the sync when set count hasn't changed and no history backfill is needed
    if (currentLen === prevSetsLengthRef.current && !shouldBackfillFromHistory) {
      return;
    }
    prevSetsLengthRef.current = currentLen;

    const toDisplayW = (kgVal: number) => String(kgToDisplay(kgVal, unitIsLbs, 1));

    // Same exercise, set count changed (add/remove) or history backfill:
    setSetInputs(prev => {
      const lastValidPastSet = resolvedLastSessionSets.length > 0 ? resolvedLastSessionSets[resolvedLastSessionSets.length - 1] : null;
      return exercise.setsLog.map((s, idx) => {
        if (s.completed) {
          const savedW = (s.weight !== null && s.weight !== undefined && Number(s.weight) > 0) ? toDisplayW(Number(s.weight)) : '';
          const savedR = (s.reps !== null && s.reps !== undefined && Number(s.reps) > 0) ? String(s.reps) : '';
          return {
            weight: savedW || prev?.[idx]?.weight || '',
            reps: savedR || prev?.[idx]?.reps || '',
          };
        }
        // Preserve live user edits for incomplete sets
        const edited = userEditedFieldsRef.current[idx];
        const liveWeight = liveInputsRef.current[idx]?.weight;
        const liveReps = liveInputsRef.current[idx]?.reps;
        if (edited?.weight || edited?.reps) {
          return {
            weight: liveWeight !== undefined ? liveWeight : (prev?.[idx]?.weight || ''),
            reps: liveReps !== undefined ? liveReps : (prev?.[idx]?.reps || ''),
          };
        }
        // Fallback to previous session set or existing set weight/reps
        const lastSet = resolvedLastSessionSets[idx] || lastValidPastSet;
        const fallbackWeight = lastSet?.weight != null && Number(lastSet.weight) > 0 ? toDisplayW(Number(lastSet.weight)) : '';
        const setWeight = (s.weight !== null && s.weight !== undefined && Number(s.weight) > 0)
          ? toDisplayW(Number(s.weight))
          : (fallbackWeight || prev?.[idx]?.weight || '');
        const defaultTargetReps = String(parseUpperTargetReps(exercise.targetReps));
        const setReps = (s.reps !== null && s.reps !== undefined && Number(s.reps) > 0)
          ? String(parseUpperTargetReps(s.reps))
          : (lastSet?.reps ? String(parseUpperTargetReps(lastSet.reps)) : (prev?.[idx]?.reps || defaultTargetReps));

        return { weight: setWeight, reps: setReps };
      });
    });
  }, [exercise?.exerciseId, exercise?.name, activeExIndex, exercise?.setsLog?.length, date, resolvedLastSessionSets, unitIsLbs]);

  // Load Instant Database Swaps on modal open
  useEffect(() => {
    if (!showSwapModal || !exercise) return;
    const swaps = getExerciseSwapAlternatives(exercise.name, exercise.muscle);
    setAiSwapList(swaps);
    setIsAiSwapLoading(false);
  }, [showSwapModal, exercise?.name, exercise?.muscle]);

  // Note: Video ID resolution is handled on-demand when user taps onVideoToggle,
  // preventing re-render stutters while typing weights & reps.

  const activeSetIndex = exercise ? exercise.setsLog.findIndex(s => !s.completed) : -1;
  const isAllComplete = activeSetIndex === -1;

  // Smart Equipment-Aware Stepper calculation
  const equipmentCategory = useMemo(() => {
    if (!exercise?.name) return 'Barbell';
    return resolveExerciseEquipment(exercise.name);
  }, [exercise?.name]);

  const smartWeightStep = useMemo(() => {
    if (unitIsLbs) {
      return equipmentCategory === 'Machine' ? 10 : 5;
    }
    switch (equipmentCategory) {
      case 'Dumbbell': return 2.0;
      case 'Cable': return 2.5;
      case 'Machine': return 5.0;
      case 'Kettlebell': return 4.0;
      default: return 2.5; // Barbell & default
    }
  }, [equipmentCategory, unitIsLbs]);

  const isKeypadOpen = !!activeKeypad && !isAllComplete && !exercise?.setsLog?.[activeKeypad.setIndex]?.completed;
  const [keypadHeight, setKeypadHeight] = useState(0);
  const handleKeypadLayout = useCallback((e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 40) {
      setKeypadHeight(prev => (Math.abs(prev - h) > 2 ? h : prev));
    }
  }, []);

  // Dynamically docks rest timer flush above measured WorkoutKeypad on every phone/safe-area/RIR height
  const timerBottomOffset = isKeypadOpen
    ? (keypadHeight > 0 ? keypadHeight + 10 : Math.max(insets.bottom, 12) + 216)
    : (Math.max(insets.bottom, 16) + 12);



  const handleRefreshVideo = useCallback(async () => {
    if (!exercise || isRefreshingVideo) return;
    hapticMedium();
    setIsRefreshingVideo(true);

    try {
      let freshVideoId = await autoResolveExerciseVideoId(exercise.name, true);
      if (!freshVideoId || freshVideoId === exercise.videoId) {
        freshVideoId = await autoResolveExerciseVideoId(`${exercise.name} exercise form tutorial`, true);
      }
      if (freshVideoId) {
        updateExercise(realExerciseIndex, { ...exercise, videoId: freshVideoId });
        hapticSuccess();
      }
    } catch (e) {
      console.warn('[Refresh Video] Error:', e);
    } finally {
      setIsRefreshingVideo(false);
    }
  }, [exercise, isRefreshingVideo, realExerciseIndex, updateExercise]);

  const exercisesLengthRef = useRef(exercises.length);
  exercisesLengthRef.current = exercises.length;

  const stateRef = useRef({
    setInputs,
    exercise,
    resolvedLastSessionSets,
    overloadSuggestion,
    realExerciseIndex,
    exercises,
    activeExIndex,
    pastGymLogs,
    gymLogs,
    baselinePRMap,
    unitIsLbs,
  });
  stateRef.current = {
    setInputs,
    exercise,
    resolvedLastSessionSets,
    overloadSuggestion,
    realExerciseIndex,
    exercises,
    activeExIndex,
    pastGymLogs,
    gymLogs,
    baselinePRMap,
    unitIsLbs,
  };

  const handleTextChange = useCallback((setIdx: number, field: 'reps' | 'weight', text: string) => {
    let sanitized = text.trim();

    if (field === 'weight') {
      const maxDisplayW = stateRef.current.unitIsLbs ? 2200 : 1000;
      const num = parseFloat(sanitized);
      if (!isNaN(num) && num > maxDisplayW) {
        sanitized = String(maxDisplayW);
      }
    } else if (field === 'reps') {
      if (/[-–—]/.test(sanitized)) {
        sanitized = String(parseUpperTargetReps(sanitized));
      } else {
        const num = parseInt(sanitized, 10);
        if (!isNaN(num) && num > 999) {
          sanitized = '999';
        }
      }
    }

    if (!userEditedFieldsRef.current[setIdx]) userEditedFieldsRef.current[setIdx] = {};
    userEditedFieldsRef.current[setIdx][field] = true;
    if (!liveInputsRef.current[setIdx]) liveInputsRef.current[setIdx] = {};
    liveInputsRef.current[setIdx][field] = sanitized;

    // High-performance single-set input update (zero cascading overhead on keystroke)
    const curSets = stateRef.current.exercise?.setsLog || [];
    const uLbs = stateRef.current.unitIsLbs;
    setSetInputs(prev => {
      const next = [...prev];
      const curSet = curSets[setIdx];
      const current = next[setIdx] || {
        weight: curSet?.weight != null ? String(kgToDisplay(Number(curSet.weight), uLbs, 1)) : '',
        reps: curSet?.reps != null ? String(curSet.reps) : ''
      };
      next[setIdx] = { ...current, [field]: sanitized };
      return next;
    });
  }, []);

  const handleBlur = useCallback((setIdx: number) => {
    const { exercise, setInputs: curInputs, overloadSuggestion: curOverload, realExerciseIndex: curRealIdx, resolvedLastSessionSets: pastSets, unitIsLbs: uLbs } = stateRef.current;
    if (!exercise) return;
    const input = curInputs[setIdx];
    const curSet = exercise.setsLog[setIdx];
    if (!curSet) return;
    const isWeightEdited = userEditedFieldsRef.current[setIdx]?.weight;
    const isRepsEdited = userEditedFieldsRef.current[setIdx]?.reps;
    const lastSessionSet = pastSets?.[setIdx];

    const resolved = resolveSetWeightAndReps(
      input,
      curSet,
      null,
      null,
      curOverload,
      exercise.targetReps,
      isWeightEdited,
      isRepsEdited,
      lastSessionSet,
      setIdx,
      uLbs
    );

    // If neither weight nor reps changed, bail out immediately with zero re-renders or updates
    if (curSet.weight === resolved.weight && curSet.reps === resolved.reps) {
      return;
    }

    const newEx = {
      ...exercise,
      setsLog: exercise.setsLog.map((s, i) =>
        i === setIdx ? { ...s, weight: resolved.weight, reps: resolved.reps } : s
      ),
    };
    updateExercise(curRealIdx, newEx);
  }, [updateExercise]);

  const flushPendingInputs = useCallback(() => {
    const { exercise, setInputs: curInputs, overloadSuggestion: curOverload, realExerciseIndex: curRealIdx, resolvedLastSessionSets: pastSets, unitIsLbs: uLbs } = stateRef.current;
    if (!exercise || !exercise.setsLog) return;
    let hasChanges = false;
    const updatedSets = exercise.setsLog.map((curSet, idx) => {
      const input = curInputs[idx];
      const isWeightEdited = userEditedFieldsRef.current[idx]?.weight;
      const isRepsEdited = userEditedFieldsRef.current[idx]?.reps;
      if (!isWeightEdited && !isRepsEdited) return curSet;
      const lastSessionSet = pastSets?.[idx];
      const resolved = resolveSetWeightAndReps(
        input,
        curSet,
        null,
        null,
        curOverload,
        exercise.targetReps,
        isWeightEdited,
        isRepsEdited,
        lastSessionSet,
        idx,
        uLbs
      );
      if (curSet.weight !== resolved.weight || curSet.reps !== resolved.reps) {
        hasChanges = true;
        return { ...curSet, weight: resolved.weight, reps: resolved.reps };
      }
      return curSet;
    });
    if (hasChanges) {
      updateExercise(curRealIdx, { ...exercise, setsLog: updatedSets });
    }
  }, [updateExercise]);

  const activeKeypadRef = useRef(activeKeypad);
  activeKeypadRef.current = activeKeypad;

  const finishCloseScreen = useCallback(() => {
    if (!isDiscardingRef.current) {
      runPendingAutoStart();
      flushPendingInputs();
    }
    navigation.goBack();
  }, [runPendingAutoStart, flushPendingInputs, navigation]);

  const handleBack = useCallback(() => {
    if (activeKeypadRef.current) {
      sheetTranslateY.value = withSpring(0, springs.snappy);
      sheetBackdrop.value = withTiming(0.64, { duration: 180 });
      hapticLight();
      setActiveKeypad(null);
      return;
    }
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (supersetJumpTimerRef.current) {
      clearTimeout(supersetJumpTimerRef.current);
      supersetJumpTimerRef.current = null;
    }
    Keyboard.dismiss();
    hapticLight();
    finishCloseScreen();
  }, [finishCloseScreen, sheetTranslateY, sheetBackdrop]);

  const commitExerciseSwitch = useCallback((nextIdx: number, dir: 1 | -1, seq: number) => {
    if (seq !== switchSeqRef.current) return;
    flushPendingInputs();
    pendingEnterDirRef.current = dir;
    bodyScrollRef.current?.scrollTo({ y: 0, animated: false });

    const nextEx = stateRef.current.exercises?.[nextIdx];
    if (nextEx) {
      const nextExId = nextEx.exerciseId || nextEx.name || '';
      lastExerciseKeyRef.current = `${nextExId}-${nextIdx}`;
      lastBannerExKeyRef.current = `${nextExId}-${nextIdx}`;
      prevSetsLengthRef.current = nextEx.setsLog?.length || 0;
      userEditedFieldsRef.current = {};
      liveInputsRef.current = {};
      setSetInputs(computeInitialSetInputs(nextEx, stateRef.current.gymLogs, date, historyIndexRef.current, stateRef.current.unitIsLbs));
    }
    setShowCompletedWarmups(false);
    setActiveKeypad(null);
    setActiveExIndex(nextIdx);
  }, [date, flushPendingInputs]);

  const switchToExercise = useCallback(
    (rawTargetIdx: number) => {
      const maxIdx = Math.max(0, (stateRef.current.exercises?.length || 1) - 1);
      const nextIdx = Math.max(0, Math.min(maxIdx, rawTargetIdx));
      const curVisualIdx = visualExIndexRef.current;
      if (nextIdx === curVisualIdx && nextIdx === stateRef.current.activeExIndex) {
        headerSlideX.value = withSpring(0, springs.snappy);
        setsSlideX.value = withSpring(0, springs.snappy);
        return;
      }
      if (supersetJumpTimerRef.current) {
        clearTimeout(supersetJumpTimerRef.current);
        supersetJumpTimerRef.current = null;
      }
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }

      const dir: 1 | -1 = nextIdx >= curVisualIdx ? 1 : -1;
      setVisualExIndex(nextIdx);
      switchSeqRef.current += 1;
      const seq = switchSeqRef.current;

      cancelAnimation(headerSlideX);
      cancelAnimation(headerOpacity);
      cancelAnimation(setsSlideX);
      cancelAnimation(setsOpacity);
      cancelAnimation(setsScale);

      headerOpacity.value = withTiming(0, { duration: 65, easing: Easing.in(Easing.quad) });
      setsOpacity.value = withTiming(0, { duration: 65, easing: Easing.in(Easing.quad) });
      setsScale.value = withTiming(0.985, { duration: 70 });
      setsSlideX.value = withTiming(-dir * screenWidth * 0.24, {
        duration: 70,
        easing: Easing.in(Easing.cubic),
      });
      headerSlideX.value = withTiming(
        -dir * screenWidth * 0.20,
        { duration: 70, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(commitExerciseSwitch)(nextIdx, dir, seq);
          }
        }
      );
    },
    [
      screenWidth,
      commitExerciseSwitch,
      headerSlideX,
      headerOpacity,
      setsSlideX,
      setsOpacity,
      setsScale,
    ]
  );

  const headerPullGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([10, 999])
        .failOffsetX([-20, 20])
        .onUpdate((e) => {
          if (e.translationY > 0) {
            sheetTranslateY.value = e.translationY;
          }
        })
        .onEnd((e) => {
          if (e.translationY > 95 || e.velocityY > 560) {
            runOnJS(handleBack)();
          } else {
            sheetTranslateY.value = withSpring(0, springs.snappy);
          }
        }),
    [handleBack, sheetTranslateY]
  );

  const headerSwipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-18, 18])
        .failOffsetY([-10, 10])
        .onUpdate((e) => {
          const total = exercisesLengthRef.current;
          const curIdx = visualExIndexRef.current;
          const atStart = curIdx === 0 && e.translationX > 0;
          const atEnd = curIdx >= total - 1 && e.translationX < 0;
          const factor = atStart || atEnd ? 0.28 : 1;
          headerSlideX.value = e.translationX * factor;
          setsSlideX.value = e.translationX * factor * 0.78;
        })
        .onEnd((e) => {
          const total = exercisesLengthRef.current;
          const curIdx = visualExIndexRef.current;
          if ((e.translationX < -52 || e.velocityX < -460) && curIdx < total - 1) {
            runOnJS(switchToExercise)(curIdx + 1);
          } else if ((e.translationX > 52 || e.velocityX > 460) && curIdx > 0) {
            runOnJS(switchToExercise)(curIdx - 1);
          } else {
            headerSlideX.value = withSpring(0, springs.snappy);
            setsSlideX.value = withSpring(0, springs.snappy);
          }
        }),
    [switchToExercise, headerSlideX, setsSlideX]
  );

  useEffect(() => {
    const onBackPress = () => {
      if (activeKeypadRef.current) {
        hapticLight();
        setActiveKeypad(null);
        return true;
      }
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [handleBack]);

  // Flush any typed inputs when the screen unmounts so background navigation never loses typed data
  useEffect(() => {
    return () => {
      if (!isDiscardingRef.current) {
        flushPendingInputs();
      }
    };
  }, [flushPendingInputs]);

  // Auto-finish watchdog: if workout reaches the 120-minute limit and autocompletes, transition to summary
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('gym_workout_completed', (event: any) => {
      if (isFinishingRef.current) return;
      const sessionDate = date || lockedSessionDateRef.current;
      if (event?.date && event.date === sessionDate) {
        isFinishingRef.current = true;
        clearRestTimer();
        navigation.replace('WorkoutSummary', { date: sessionDate, log: event?.log });
      }
    });
    return () => sub.remove();
  }, [date, clearRestTimer, navigation]);

  const isFinishingRef = useRef(false);
  const isDiscardingRef = useRef(false);
  const handleFinishAndSave = useCallback(async () => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;
    setShowFinishEarlySheet(false);
    clearRestTimer();
    flushPendingInputs();
    const { exercises: allExs } = stateRef.current;
    const sessionDate = date || lockedSessionDateRef.current;
    const completedLog = await endWorkout(true, allExs);
    navigation.replace('WorkoutSummary', { date: sessionDate, log: completedLog });
  }, [clearRestTimer, flushPendingInputs, endWorkout, date, navigation]);

  const handleDiscardWorkout = useCallback(() => {
    setShowFinishEarlySheet(false);
    setShowWorkoutMenuSheet(false);
    afterSheetDismiss(() => {
      setShowDiscardConfirmSheet(true);
    });
  }, []);

  const handleConfirmDiscardWorkout = useCallback(async () => {
    isDiscardingRef.current = true;
    setShowDiscardConfirmSheet(false);
    clearRestTimer();
    setActiveKeypad(null);
    await endWorkout(false);
    afterSheetDismiss(() => handleBack());
  }, [clearRestTimer, endWorkout, handleBack]);

  const promptFinishWorkout = useCallback(() => {
    flushPendingInputs();
    const { exercises: allExs } = stateRef.current;
    const allSets = (allExs || []).flatMap((e: any) => e.setsLog || []);
    const uncompleted = allSets.filter((s: any) => !s.completed).length;
    const completed = allSets.filter((s: any) => s.completed).length;
    setUncheckedSetsCount(uncompleted);
    setCompletedSetsCount(completed);
    setShowFinishEarlySheet(true);
  }, [flushPendingInputs]);

  const handleSaveNote = useCallback((noteText: string) => {
    if (noteModalConfig.target === 'session') {
      setSessionNote(noteText);
      updateNotes(noteText);
    } else if (noteModalConfig.target === 'exercise') {
      const curRealIdx = stateRef.current.realExerciseIndex;
      const curEx = stateRef.current.exercise;
      if (curEx && curRealIdx !== undefined) {
        updateExercise(curRealIdx, { ...curEx, notes: noteText });
      }
    }
  }, [noteModalConfig.target, updateNotes, updateExercise]);

  const handleRemoveExercise = useCallback(() => {
    const {
      realExerciseIndex: curRealIdx,
      exercise: curEx,
      activeExIndex: curActiveIdx,
    } = stateRef.current;
    if (!curEx || curRealIdx === undefined || curRealIdx < 0) return;
    deleteExercise(curEx.exerciseId || curRealIdx);
    setActiveKeypad(null);
    const nextAfterRemove = Math.max(0, curActiveIdx - 1);
    setVisualExIndex(nextAfterRemove);
    setActiveExIndex(nextAfterRemove);
  }, [deleteExercise]);

  const handleSelectRest = useCallback((secs: number, saveAsDefault?: boolean) => {
    const chosen = secs;
    if (chosen <= 0) {
      clearRestTimer();
    } else {
      if (restTimerStartTime) {
        startRestTimer(chosen, stateRef.current.exercise?.name);
      }
      if (saveAsDefault !== false) {
        const curRealIdx = stateRef.current.realExerciseIndex;
        const curEx = stateRef.current.exercise;
        if (curEx && curRealIdx !== undefined) {
          updateExercise(curRealIdx, { ...curEx, restTimeSecs: chosen });
        }
      }
    }
    setRestPickerSetIdx(null);
  }, [clearRestTimer, startRestTimer, restTimerStartTime, updateExercise]);

  const handleLogSet = useCallback(() => {
    if (isLoggingSetRef.current) return;
    const { exercise, setInputs: curInputs, overloadSuggestion: curOverload, realExerciseIndex: curRealIdx, exercises: allExs, activeExIndex: curActiveIdx, resolvedLastSessionSets: pastSets, unitIsLbs: uLbs } = stateRef.current;
    const curActiveSetIndex = exercise ? exercise.setsLog.findIndex(s => !s.completed) : -1;
    if (!exercise || curActiveSetIndex === -1) return;

    isLoggingSetRef.current = true;
    Keyboard.dismiss();
    setTimeout(() => { isLoggingSetRef.current = false; }, 300);
    hapticMedium();

    const currentSet = exercise.setsLog[curActiveSetIndex];
    const input = curInputs[curActiveSetIndex];
    const isWeightEdited = userEditedFieldsRef.current[curActiveSetIndex]?.weight;
    const isRepsEdited = userEditedFieldsRef.current[curActiveSetIndex]?.reps;
    const lastSessionSet = pastSets?.[curActiveSetIndex];

    const resolved = resolveSetWeightAndReps(
      input,
      currentSet,
      null,
      null,
      curOverload,
      exercise.targetReps,
      isWeightEdited,
      isRepsEdited,
      lastSessionSet,
      curActiveSetIndex,
      uLbs
    );

    const newEx = {
      ...exercise,
      setsLog: exercise.setsLog.map((s, i) =>
        i === curActiveSetIndex ? { ...s, weight: resolved.weight, reps: resolved.reps, completed: true } : s
      ),
    };

    setSetInputs(prev => prev.map((inp, i) =>
      i === curActiveSetIndex
        ? {
            weight: resolved.weight !== null ? String(kgToDisplay(resolved.weight, uLbs, 1)) : '',
            reps: String(resolved.reps),
          }
        : inp
    ));

    const nextJumpIdx = findNextSupersetExerciseIndex(allExs, curActiveIdx, exercise.supersetGroup);
    const restSecs = nextJumpIdx !== -1 ? 30 : getRestDuration(exercise);

    logSetAndStartTimer(curRealIdx, newEx, restSecs, exercise.name);

    if (resolved.weight && resolved.reps && resolved.weight > 0 && resolved.reps > 0) {
      InteractionManager.runAfterInteractions(() => {
        const baselinePR = stateRef.current.baselinePRMap.get(normalizeExerciseKey(exercise.name));
        const w = resolved.weight!;
        const r = resolved.reps!;
        const est1RM = Math.round(w * (1 + r / 30) * 10) / 10;
        const isPR = baselinePR && (w > baselinePR.maxWeight || est1RM > baselinePR.max1RM);

        if (isPR) {
          hapticSuccess();
          if (prToastTimerRef.current) clearTimeout(prToastTimerRef.current);
          const curULbs = stateRef.current.unitIsLbs;
          setPrToast({
            message: `${exercise.name}: ${formatWeight(w, curULbs, 1)} × ${r} (Est. 1RM: ${formatWeight(est1RM, curULbs, 1)})`,
          });
          prToastTimerRef.current = setTimeout(() => {
            setPrToast(null);
            prToastTimerRef.current = null;
          }, 4000);
        }
      });
    }

    if (nextJumpIdx !== -1) {
      if (supersetJumpTimerRef.current) clearTimeout(supersetJumpTimerRef.current);
      supersetJumpTimerRef.current = setTimeout(() => switchToExercise(nextJumpIdx), 400);
    } else {
      const isExComplete = newEx.setsLog.length > 0 && newEx.setsLog.every(s => s.completed);
      if (isExComplete) {
        if (curActiveIdx < allExs.length - 1) {
          if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
          autoAdvanceTimerRef.current = setTimeout(() => {
            switchToExercise(curActiveIdx + 1);
          }, 550);
        } else {
          if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
          autoAdvanceTimerRef.current = setTimeout(() => {
            promptFinishWorkout();
          }, 450);
        }
      }
    }
  }, [logSetAndStartTimer, promptFinishWorkout, switchToExercise]);

  const handleAdjustWeight = useCallback((delta: number) => {
    const { exercise, setInputs: curInputs, overloadSuggestion: curOverload, unitIsLbs: uLbs } = stateRef.current;
    if (!exercise) return;
    const curActiveSetIndex = exercise.setsLog.findIndex(s => !s.completed);
    const targetIdx = curActiveSetIndex !== -1 ? curActiveSetIndex : exercise.setsLog.length - 1;
    if (targetIdx < 0) return;
    hapticSelection();

    const curSet = exercise.setsLog[targetIdx];
    const curInput = curInputs[targetIdx];
    const prevSet = targetIdx > 0 ? exercise.setsLog[targetIdx - 1] : null;

    let baseWeight = 0;
    if (curInput?.weight !== '' && curInput?.weight !== undefined) {
      baseWeight = parseFloat(curInput.weight) || 0;
    } else if (curSet?.weight != null && Number(curSet.weight) > 0) {
      baseWeight = kgToDisplay(Number(curSet.weight), uLbs, 1);
    } else if (prevSet?.weight != null && Number(prevSet.weight) > 0) {
      baseWeight = kgToDisplay(Number(prevSet.weight), uLbs, 1);
    } else if (curOverload?.recommended) {
      baseWeight = kgToDisplay(Number(curOverload.recommended), uLbs, 1);
    }

    const maxDispW = uLbs ? 2200 : 1000;
    const newWeight = Math.min(maxDispW, Math.max(0, Math.round((baseWeight + delta) * 10) / 10));
    handleTextChange(targetIdx, 'weight', String(newWeight));
  }, [handleTextChange]);

  const handleAdjustReps = useCallback((delta: number) => {
    const { exercise, setInputs: curInputs } = stateRef.current;
    if (!exercise) return;
    const curActiveSetIndex = exercise.setsLog.findIndex(s => !s.completed);
    const targetIdx = curActiveSetIndex !== -1 ? curActiveSetIndex : exercise.setsLog.length - 1;
    if (targetIdx < 0) return;
    hapticSelection();

    const curSet = exercise.setsLog[targetIdx];
    const curInput = curInputs[targetIdx];
    const prevSet = targetIdx > 0 ? exercise.setsLog[targetIdx - 1] : null;

    let baseReps = 10;
    if (curInput?.reps !== '' && curInput?.reps !== undefined) {
      baseReps = parseUpperTargetReps(curInput.reps);
    } else if (curSet?.reps != null && Number(curSet.reps) > 0) {
      baseReps = parseUpperTargetReps(curSet.reps);
    } else if (prevSet?.reps != null && Number(prevSet.reps) > 0) {
      baseReps = parseUpperTargetReps(prevSet.reps);
    } else {
      baseReps = parseUpperTargetReps(exercise.targetReps);
    }

    const newReps = Math.min(999, Math.max(1, baseReps + delta));
    handleTextChange(targetIdx, 'reps', String(newReps));
  }, [handleTextChange]);

  const handleRepeatPreviousSet = useCallback(() => {
    const { exercise, setInputs: curInputs, overloadSuggestion: curOverload, unitIsLbs: uLbs } = stateRef.current;
    if (!exercise) return;
    const curActiveSetIndex = exercise.setsLog.findIndex(s => !s.completed);
    const targetIdx = curActiveSetIndex !== -1 ? curActiveSetIndex : exercise.setsLog.length - 1;
    if (targetIdx < 0) return;
    hapticSelection();

    const prevSet = targetIdx > 0 ? exercise.setsLog[targetIdx - 1] : null;
    const prevInput = targetIdx > 0 ? curInputs[targetIdx - 1] : null;

    const maxDispW = uLbs ? 2200 : 1000;
    let repWeight = '';
    if (prevInput?.weight) {
      repWeight = prevInput.weight;
    } else if (prevSet?.weight != null && Number(prevSet.weight) > 0) {
      repWeight = String(kgToDisplay(Number(prevSet.weight), uLbs, 1));
    } else if (curOverload?.recommended) {
      repWeight = String(Math.min(maxDispW, kgToDisplay(Number(curOverload.recommended), uLbs, 1)));
    }

    let repReps = '';
    if (prevInput?.reps) {
      repReps = String(parseUpperTargetReps(prevInput.reps));
    } else if (prevSet?.reps != null && Number(prevSet.reps) > 0) {
      repReps = String(parseUpperTargetReps(prevSet.reps));
    } else {
      repReps = String(parseUpperTargetReps(exercise.targetReps));
    }

    if (repWeight) handleTextChange(targetIdx, 'weight', repWeight);
    if (repReps) handleTextChange(targetIdx, 'reps', repReps);
  }, [handleTextChange]);

  const handleNextExercise = useCallback(async () => {
    flushPendingInputs();
    Keyboard.dismiss();
    const { activeExIndex: curIdx, exercises: curExs } = stateRef.current;
    if (curIdx < curExs.length - 1) {
      hapticMedium();
      switchToExercise(curIdx + 1);
    } else {
      promptFinishWorkout();
    }
  }, [flushPendingInputs, promptFinishWorkout, switchToExercise]);

  const handleDeleteSet = useCallback((idx: number) => {
    const { exercise, realExerciseIndex: curRealIdx } = stateRef.current;
    if (!exercise) return;
    hapticError();
    const newEx = {
      ...exercise,
      setsLog: exercise.setsLog.filter((_, i) => i !== idx).map((s, i) => ({ ...s, setNumber: i + 1 })),
    };
    updateExercise(curRealIdx, newEx);
    setSetInputs(prev => prev.filter((_, i) => i !== idx));

    // Re-index userEditedFieldsRef and liveInputsRef to prevent index desync
    const newUserEdited: { [idx: number]: { weight?: boolean; reps?: boolean } } = {};
    const newLiveInputs: { [idx: number]: { weight?: string; reps?: string } } = {};
    Object.keys(userEditedFieldsRef.current).forEach(k => {
      const numK = Number(k);
      if (numK < idx) {
        newUserEdited[numK] = userEditedFieldsRef.current[numK];
      } else if (numK > idx) {
        newUserEdited[numK - 1] = userEditedFieldsRef.current[numK];
      }
    });
    Object.keys(liveInputsRef.current).forEach(k => {
      const numK = Number(k);
      if (numK < idx) {
        newLiveInputs[numK] = liveInputsRef.current[numK];
      } else if (numK > idx) {
        newLiveInputs[numK - 1] = liveInputsRef.current[numK];
      }
    });
    userEditedFieldsRef.current = newUserEdited;
    liveInputsRef.current = newLiveInputs;
  }, [updateExercise]);

  // Keep handlersRef current for native DeviceEventEmitter listeners
  handlersRef.current = {
    handleLogSet,
    handleAdjustWeight,
    handleNextExercise,
    clearRestTimer,
    setRestTimerDuration,
    restTimerInitial,
    promptFinishWorkout,
  };

  // Handle interactive lock screen notification actions (Done Set, Add Weight, Next Exercise, Skip Rest, End Workout)
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('ACTIVE_WORKOUT_ACTION', (payload: any) => {
      const h = handlersRef.current;
      if (!h) return;
      if (payload.action === 'DONE_SET') {
        h.handleLogSet?.();
      } else if (payload.action === 'ADD_WEIGHT') {
        h.handleAdjustWeight?.(payload.delta || 2.5);
      } else if (payload.action === 'NEXT_EXERCISE') {
        h.handleNextExercise?.();
      } else if (payload.action === 'SKIP_REST') {
        h.clearRestTimer?.();
      } else if (payload.action === 'ADD_REST_SECONDS') {
        h.setRestTimerDuration?.(h.restTimerInitial + (payload.seconds || 30));
      } else if (payload.action === 'END_WORKOUT') {
        h.promptFinishWorkout?.();
      }
    });

    if (route.params?.autoPromptEnd) {
      setTimeout(() => {
        handlersRef.current?.promptFinishWorkout?.();
      }, 400);
    }

    return () => {
      sub.remove();
      if (supersetJumpTimerRef.current) {
        clearTimeout(supersetJumpTimerRef.current);
      }
    };
  }, [navigation, route.params?.autoPromptEnd]);

  const warmupSets = useMemo(() => exercise?.setsLog.filter(s => s.isWarmup) || [], [exercise?.setsLog]);
  const hasWarmups = warmupSets.length > 0;
  const allWarmupsCompleted = hasWarmups && warmupSets.every(s => s.completed);
  const hasAnyWarmupCompleted = hasWarmups && warmupSets.some(s => s.completed);

  const handleAutoWarmup = useCallback(() => {
    if (!exercise) return;
    hapticMedium();
    const uLbs = stateRef.current.unitIsLbs;

    const existingWarmups = exercise.setsLog.filter(s => s.isWarmup);
    if (existingWarmups.length > 0) {
      // Toggle off / remove warmups
      const workingSetsOnly = exercise.setsLog.filter(s => !s.isWarmup).map((s, i) => ({
        ...s,
        setNumber: i + 1,
        isWarmup: false,
        warmupLabel: undefined,
      }));
      const newEx = {
        ...exercise,
        setsLog: workingSetsOnly,
      };
      updateExercise(realExerciseIndex, newEx);
      setSetInputs(workingSetsOnly.map(s => ({
        weight: (s.weight !== null && s.weight !== undefined && Number(s.weight) > 0)
          ? String(kgToDisplay(Number(s.weight), uLbs, 1))
          : '',
        reps: (s.reps !== null && s.reps !== undefined && Number(s.reps) > 0) ? String(s.reps) : '',
      })));
      userEditedFieldsRef.current = {};
      liveInputsRef.current = {};
      return;
    }

    // Determine target working weight in canonical KG, converting display units if typed
    let targetWKg = 40;
    const firstWorkingIdx = exercise.setsLog.findIndex(s => !s.isWarmup);
    const liveFirstWorkingWeight = firstWorkingIdx >= 0 ? (liveInputsRef.current[firstWorkingIdx]?.weight || setInputs[firstWorkingIdx]?.weight) : undefined;
    const parsedLiveDisplay = liveFirstWorkingWeight ? parseFloat(liveFirstWorkingWeight) : null;

    const firstWorking = exercise.setsLog.find(s => !s.isWarmup && s.weight != null && Number(s.weight) > 0);
    if (parsedLiveDisplay && parsedLiveDisplay > 0) {
      targetWKg = displayToKg(parsedLiveDisplay, uLbs);
    } else if (firstWorking?.weight) {
      targetWKg = Number(firstWorking.weight);
    } else if (overloadSuggestion?.recommended) {
      targetWKg = Number(overloadSuggestion.recommended);
    } else if (exercise.lastSessionSets?.[0]?.weight) {
      targetWKg = Number(exercise.lastSessionSets[0].weight);
    }

    const updatedSetsRaw = insertWarmupLadder(
      exercise.setsLog,
      uLbs
        ? {
            workingWeight: kgToDisplay(targetWKg, true, 1),
            exerciseName: exercise.name,
            isLbs: true,
            weightStep: equipmentCategory === 'Machine' ? 10 : 5,
          }
        : {
            workingWeight: targetWKg,
            exerciseName: exercise.name,
            isLbs: false,
          }
    );

    const updatedSets = uLbs
      ? updatedSetsRaw.map(s =>
          s.isWarmup && s.weight != null && Number(s.weight) > 0
            ? { ...s, weight: displayToKg(Number(s.weight), true) }
            : s
        )
      : updatedSetsRaw;

    const newEx = {
      ...exercise,
      setsLog: updatedSets,
    };

    updateExercise(realExerciseIndex, newEx);
    setSetInputs(updatedSets.map(s => ({
      weight: (s.weight !== null && s.weight !== undefined && Number(s.weight) > 0)
        ? String(kgToDisplay(Number(s.weight), uLbs, 1))
        : '',
      reps: (s.reps !== null && s.reps !== undefined && Number(s.reps) > 0) ? String(s.reps) : '',
    })));
    userEditedFieldsRef.current = {};
    liveInputsRef.current = {};
  }, [exercise, overloadSuggestion, realExerciseIndex, updateExercise, setInputs, equipmentCategory]);

  const handleAddSet = useCallback(() => {
    if (!exercise) return;
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    hapticLight();
    const uLbs = stateRef.current.unitIsLbs;
    const lastIdx = exercise.setsLog.length - 1;
    const lastSet = exercise.setsLog[lastIdx];
    const liveW = liveInputsRef.current[lastIdx]?.weight ?? setInputs[lastIdx]?.weight;
    const liveR = liveInputsRef.current[lastIdx]?.reps ?? setInputs[lastIdx]?.reps;

    const weightVal = (liveW !== undefined && liveW !== '' && !isNaN(parseFloat(liveW)))
      ? displayToKg(parseFloat(liveW), uLbs)
      : (lastSet?.weight ?? null);
    const repsVal = (liveR !== undefined && liveR !== '') ? parseInt(liveR, 10) : (lastSet?.reps ?? parseUpperTargetReps(exercise.targetReps));

    const newEx = {
      ...exercise,
      setsLog: [
        ...exercise.setsLog,
        {
          setNumber: exercise.setsLog.filter(s => !s.isWarmup).length + 1,
          reps: repsVal,
          weight: weightVal,
          completed: false,
        },
      ],
    };
    updateExercise(realExerciseIndex, newEx);
    setSetInputs(prev => [
      ...prev,
      {
        weight: weightVal != null ? String(kgToDisplay(weightVal, uLbs, 1)) : '',
        reps: repsVal != null ? String(repsVal) : '',
      },
    ]);
  }, [exercise, setInputs, realExerciseIndex, updateExercise]);

  const handleToggleSetComplete = useCallback((setIdx: number) => {
    if (isLoggingSetRef.current) return;
    const {
      exercise,
      setInputs: curInputs,
      overloadSuggestion: curOverload,
      realExerciseIndex: curRealIdx,
      exercises: allExs,
      activeExIndex: curActiveIdx,
      resolvedLastSessionSets: pastSets,
      unitIsLbs: uLbs,
    } = stateRef.current;
    if (!exercise) return;

    isLoggingSetRef.current = true;
    setTimeout(() => { isLoggingSetRef.current = false; }, 200);

    const curSet = exercise.setsLog[setIdx];
    const targetCompleted = !curSet.completed;

    const input = curInputs[setIdx];
    const prevInput = setIdx > 0 ? curInputs[setIdx - 1] : null;
    const prevSet = setIdx > 0 ? exercise.setsLog[setIdx - 1] : null;
    const isWeightEdited = userEditedFieldsRef.current[setIdx]?.weight;
    const isRepsEdited = userEditedFieldsRef.current[setIdx]?.reps;
    const lastSessionSet = pastSets?.[setIdx];

    const resolved = resolveSetWeightAndReps(
      input,
      curSet,
      prevInput,
      prevSet,
      curOverload,
      exercise.targetReps,
      isWeightEdited,
      isRepsEdited,
      lastSessionSet,
      setIdx,
      uLbs
    );

    const newEx = {
      ...exercise,
      setsLog: exercise.setsLog.map((s, i) =>
        i === setIdx
          ? { ...s, completed: targetCompleted, weight: resolved.weight, reps: resolved.reps }
          : s
      ),
    };

    setSetInputs(prev =>
      prev.map((inp, i) =>
        i === setIdx
          ? {
              weight: resolved.weight !== null ? String(kgToDisplay(resolved.weight, uLbs, 1)) : '',
              reps: String(resolved.reps),
            }
          : inp
      )
    );

    // Defer intra-workout overload recalculation & PR check behind frame interactions so set checkmark toggles instantaneously
    const exKeyForOverride = currentExKeyRef.current;
    InteractionManager.runAfterInteractions(() => {
      const completedSetsToday = newEx.setsLog
        .filter(s => s.completed)
        .map((s, idx) => ({
          setNumber: s.setNumber || idx + 1,
          weight: Number(s.weight) || 0,
          reps: Number(s.reps) || 0,
          rir: s.rir,
          isWarmup: !!s.isWarmup,
          completed: true,
        }));

      const curWeight =
        calculateExerciseMaxWeight(exercise as any) ||
        Number(newEx.setsLog[0]?.weight) ||
        0;

      const liveSuggestion = getOverloadSuggestion(
        exercise,
        curWeight,
        exercise.targetSets || 3,
        String(exercise.targetReps || '8'),
        stateRef.current.pastGymLogs,
        programmeRecoveryContext,
        completedSetsToday
      );
      if (liveSuggestion && currentExKeyRef.current === exKeyForOverride) {
        setLiveOverloadOverride({ exKey: exKeyForOverride, suggestion: liveSuggestion });
      }
    });

    if (targetCompleted) {
      hapticMedium();
      InteractionManager.runAfterInteractions(() => {
        playSetCompleteTone();
      });

      // If active keypad was focused on this set that just completed, shift to next uncompleted set or dismiss
      if (activeKeypadRef.current?.setIndex === setIdx) {
        const nextIncompleteIdx = newEx.setsLog.findIndex((s, i) => i > setIdx && !s.completed);
        const fallbackIncomplete = nextIncompleteIdx !== -1
          ? nextIncompleteIdx
          : newEx.setsLog.findIndex((s, i) => i !== setIdx && !s.completed);
        if (fallbackIncomplete !== -1) {
          setActiveKeypad({ setIndex: fallbackIncomplete, field: 'weight' });
        } else {
          setActiveKeypad(null);
        }
      }

      const nextJumpIdx = findNextSupersetExerciseIndex(allExs, curActiveIdx, exercise.supersetGroup);
      const restSecs = curSet.setType === 'drop' ? 15 : (nextJumpIdx !== -1 ? 30 : getRestDuration(exercise));

      logSetAndStartTimer(curRealIdx, newEx, restSecs, exercise.name);

      if (resolved.weight && resolved.reps && resolved.weight > 0 && resolved.reps > 0) {
        InteractionManager.runAfterInteractions(() => {
          const baselinePR = stateRef.current.baselinePRMap.get(normalizeExerciseKey(exercise.name));
          const w = resolved.weight!;
          const r = resolved.reps!;
          const est1RM = Math.round(w * (1 + r / 30) * 10) / 10;
          const isPR = baselinePR && (w > baselinePR.maxWeight || est1RM > baselinePR.max1RM);

          if (isPR) {
            hapticSuccess();
            if (prToastTimerRef.current) clearTimeout(prToastTimerRef.current);
            const uLbs = stateRef.current.unitIsLbs;
            setPrToast({
              message: `${exercise.name}: ${formatWeight(w, uLbs, 1)} × ${r} (Est. 1RM: ${formatWeight(est1RM, uLbs, 1)})`,
            });
            prToastTimerRef.current = setTimeout(() => {
              setPrToast(null);
              prToastTimerRef.current = null;
            }, 4000);
          }
        });
      }

      if (nextJumpIdx !== -1) {
        if (supersetJumpTimerRef.current) clearTimeout(supersetJumpTimerRef.current);
        supersetJumpTimerRef.current = setTimeout(() => switchToExercise(nextJumpIdx), 400);
      } else {
        const isExComplete = targetCompleted && newEx.setsLog.length > 0 && newEx.setsLog.every(s => s.completed);
        if (isExComplete) {
          if (curActiveIdx < allExs.length - 1) {
            if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
            autoAdvanceTimerRef.current = setTimeout(() => {
              switchToExercise(curActiveIdx + 1);
            }, 550);
          } else {
            if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
            autoAdvanceTimerRef.current = setTimeout(() => {
              promptFinishWorkout();
            }, 450);
          }
        }
      }
    } else {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
      hapticLight();
      updateExercise(curRealIdx, newEx);
    }
  }, [logSetAndStartTimer, updateExercise, promptFinishWorkout, switchToExercise]);

  const handleSelectProgressionPolicy = useCallback((policy: 'linear' | 'double' | 'triple' | 'top_backoff') => {
    const { exercise, realExerciseIndex: curRealIdx } = stateRef.current;
    if (!exercise) return;

    hapticLight();
    const updatedEx = {
      ...exercise,
      progressionPolicy: policy,
    };
    updateExercise(curRealIdx, updatedEx);

    // Refresh overload suggestion with new progression policy
    const curWeight = calculateExerciseMaxWeight(updatedEx as any) || 0;
    const newSuggestion = getOverloadSuggestion(
      updatedEx,
      curWeight,
      updatedEx.targetSets || 3,
      String(updatedEx.targetReps || '8'),
      pastGymLogs,
      programmeRecoveryContext
    );
    if (newSuggestion) {
      setLiveOverloadOverride({ exKey: currentExKey, suggestion: newSuggestion });
    }
  }, [updateExercise, pastGymLogs, currentExKey, programmeRecoveryContext]);

  const handleCycleSetType = useCallback((setIdx: number) => {
    const { exercise, realExerciseIndex: curRealIdx } = stateRef.current;
    if (!exercise) return;
    const curSet = exercise.setsLog[setIdx];
    if (!curSet) return;

    let nextType: 'normal' | 'warmup' | 'drop' | 'failure' = 'normal';
    let nextIsWarmup = false;
    let nextLabel: string | undefined = undefined;

    const currentType = curSet.setType === 'warmup' || curSet.isWarmup
      ? 'warmup'
      : curSet.setType === 'drop'
      ? 'drop'
      : curSet.setType === 'failure'
      ? 'failure'
      : 'normal';

    if (currentType === 'normal') {
      nextType = 'warmup';
      nextIsWarmup = true;
      nextLabel = 'W';
    } else if (currentType === 'warmup') {
      nextType = 'drop';
      nextIsWarmup = false;
      nextLabel = 'D';
    } else if (currentType === 'drop') {
      nextType = 'failure';
      nextIsWarmup = false;
      nextLabel = 'F';
    } else {
      nextType = 'normal';
      nextIsWarmup = false;
      nextLabel = undefined;
    }

    const newEx = {
      ...exercise,
      setsLog: exercise.setsLog.map((s, i) =>
        i === setIdx
          ? {
              ...s,
              setType: nextType,
              isWarmup: nextIsWarmup,
              warmupLabel: nextLabel,
              rir: nextType === 'failure' ? 0 : undefined,
            }
          : s
      ),
    };

    updateExercise(curRealIdx, newEx);
  }, [updateExercise]);

  const handleCopyPrev = useCallback((idx: number, payload?: any) => {
    const { exercise, resolvedLastSessionSets: pastSets, unitIsLbs: uLbs } = stateRef.current;
    const prevSessionSet = pastSets?.[idx] || exercise?.lastSessionSets?.[idx];
    if (prevSessionSet) {
      if (prevSessionSet.weight != null) {
        handleTextChange(idx, 'weight', String(kgToDisplay(Number(prevSessionSet.weight), uLbs, 1)));
      }
      if (prevSessionSet.reps != null) handleTextChange(idx, 'reps', String(prevSessionSet.reps));
    } else if (payload && typeof payload === 'string' && payload.includes('×')) {
      const parts = payload.split('×');
      const w = parseFloat(parts[0].replace(/[^0-9.]/g, ''));
      const r = parseInt(parts[1].replace(/[^0-9]/g, ''), 10);
      if (!isNaN(w)) handleTextChange(idx, 'weight', String(w));
      if (!isNaN(r)) handleTextChange(idx, 'reps', String(r));
    }
  }, [handleTextChange]);

  const handleSetRIR = useCallback((rirVal: number) => {
    const { exercise, realExerciseIndex: curRealIdx } = stateRef.current;
    if (!exercise) return;
    const curActiveIdx = exercise.setsLog.findIndex(s => !s.completed);
    const targetIdx = curActiveIdx !== -1 ? curActiveIdx : exercise.setsLog.length - 1;
    if (targetIdx < 0) return;
    hapticLight();
    const newEx = {
      ...exercise,
      setsLog: exercise.setsLog.map((s, i) =>
        i === targetIdx ? { ...s, rir: rirVal } : s
      ),
    };
    updateExercise(curRealIdx, newEx);
  }, [updateExercise]);

  const handleNoteChange = useCallback((note: string) => {
    const { exercise, realExerciseIndex: curRealIdx } = stateRef.current;
    if (!exercise) return;
    const newEx = { ...exercise, notes: note };
    updateExercise(curRealIdx, newEx);
  }, [updateExercise]);

  // Stable unified set action dispatcher — passed to SwipeableSetRow instead of 5 inline
  // arrow functions, so React.memo can bail out on unrelated re-renders (timer ticks, etc.).
  // With zero reactive dependencies, it never changes reference across keystrokes!
  const handleSetAction = useCallback((idx: number, action: 'textChange' | 'blur' | 'toggle' | 'delete' | 'requestDelete' | 'swipe' | 'cycleType' | 'copyPrev' | 'focusField' | 'setRest', payload?: any) => {
    switch (action) {
      case 'textChange':    handleTextChange(idx, payload.field, payload.text); break;
      case 'blur':          handleBlur(idx); break;
      case 'toggle':        handleToggleSetComplete(idx); break;
      case 'delete':        handleDeleteSet(idx); break;
      case 'requestDelete': setDeleteSetConfirmIdx(idx); break;
      case 'swipe':         handleToggleSetComplete(idx); break;
      case 'cycleType':     handleCycleSetType(idx); break;
      case 'copyPrev':      handleCopyPrev(idx, payload); break;
      case 'focusField': {
        const curSet = stateRef.current.exercise?.setsLog?.[idx];
        if (curSet?.completed) return;
        isFieldSelectedRef.current = true;
        setIsFieldSelected(true);
        setActiveKeypad({ setIndex: idx, field: payload });
        break;
      }
    }
  }, [handleTextChange, handleBlur, handleToggleSetComplete, handleDeleteSet, handleCycleSetType, handleCopyPrev]);

  // Keypad Handlers (reads activeKeypadRef so keystrokes & field focus never break React.memo)
  const handleKeypadPress = useCallback((key: string) => {
    const curKeypad = activeKeypadRef.current;
    if (!curKeypad) return;
    const { setIndex, field } = curKeypad;

    // If field is currently selected (first keypress upon opening/focusing), overwrite immediately!
    if (isFieldSelectedRef.current) {
      isFieldSelectedRef.current = false;
      setIsFieldSelected(false);
      if (key === '.') {
        if (field === 'reps') return;
        handleTextChange(setIndex, field, '0.');
        return;
      }
      handleTextChange(setIndex, field, key);
      return;
    }

    const curVal = liveInputsRef.current[setIndex]?.[field] ?? stateRef.current.setInputs[setIndex]?.[field] ?? '';
    if (key === '.') {
      if (curVal.includes('.') || field === 'reps') {
        hapticError();
        return;
      }
      const nextVal = curVal === '' || curVal === '0' ? '0.' : curVal + '.';
      handleTextChange(setIndex, field, nextVal);
      return;
    }
    if (curVal.length >= 6) return;
    const nextVal = curVal === '0' ? key : curVal + key;
    handleTextChange(setIndex, field, nextVal);
  }, [handleTextChange]);

  const handleKeypadBackspace = useCallback(() => {
    const curKeypad = activeKeypadRef.current;
    if (!curKeypad) return;
    const { setIndex, field } = curKeypad;

    const curVal = liveInputsRef.current[setIndex]?.[field] ?? stateRef.current.setInputs[setIndex]?.[field] ?? '';
    if (!curVal) {
      // Auto-shift back to weight if backspacing on an empty reps cell
      if (field === 'reps') {
        isFieldSelectedRef.current = false;
        setIsFieldSelected(false);
        setActiveKeypad({ setIndex, field: 'weight' });
      }
      return;
    }
    const nextVal = curVal.slice(0, -1);
    handleTextChange(setIndex, field, nextVal);
  }, [handleTextChange]);

  const handleKeypadClear = useCallback(() => {
    const curKeypad = activeKeypadRef.current;
    if (!curKeypad) return;
    const { setIndex, field } = curKeypad;
    handleTextChange(setIndex, field, '');
  }, [handleTextChange]);

  const handleKeypadStepAdjust = useCallback((delta: number) => {
    const curKeypad = activeKeypadRef.current;
    if (!curKeypad) return;
    const { setIndex, field } = curKeypad;
    const { exercise, setInputs: curInputs, overloadSuggestion: curOverload } = stateRef.current;
    if (!exercise) return;
    hapticSelection();
    isFieldSelectedRef.current = false;
    setIsFieldSelected(false);

    const curSet = exercise.setsLog[setIndex];
    const curInput = curInputs[setIndex];
    const prevSet = setIndex > 0 ? exercise.setsLog[setIndex - 1] : null;

    if (field === 'weight') {
      const uLbs = stateRef.current.unitIsLbs;
      let baseWeight = 0;
      if (curInput?.weight !== '' && curInput?.weight !== undefined) {
        baseWeight = parseFloat(curInput.weight) || 0;
      } else if (curSet?.weight != null && Number(curSet.weight) > 0) {
        baseWeight = kgToDisplay(Number(curSet.weight), uLbs, 1);
      } else if (prevSet?.weight != null && Number(prevSet.weight) > 0) {
        baseWeight = kgToDisplay(Number(prevSet.weight), uLbs, 1);
      } else if (curOverload?.recommended) {
        baseWeight = kgToDisplay(Number(curOverload.recommended), uLbs, 1);
      }
      const maxDispW = uLbs ? 2200 : 1000;
      const newWeight = Math.min(maxDispW, Math.max(0, Math.round((baseWeight + delta) * 10) / 10));
      handleTextChange(setIndex, 'weight', String(newWeight));
    } else {
      let baseReps = 10;
      if (curInput?.reps !== '' && curInput?.reps !== undefined) {
        baseReps = parseUpperTargetReps(curInput.reps);
      } else if (curSet?.reps != null && Number(curSet.reps) > 0) {
        baseReps = parseUpperTargetReps(curSet.reps);
      } else if (prevSet?.reps != null && Number(prevSet.reps) > 0) {
        baseReps = parseUpperTargetReps(prevSet.reps);
      } else {
        baseReps = parseUpperTargetReps(exercise.targetReps);
      }
      const newReps = Math.min(999, Math.max(1, baseReps + delta));
      handleTextChange(setIndex, 'reps', String(newReps));
    }
  }, [handleTextChange]);

  const handleKeypadNextOrComplete = useCallback(() => {
    const curKeypad = activeKeypadRef.current;
    if (!curKeypad) return;
    const { setIndex, field } = curKeypad;
    const curEx = stateRef.current.exercise;
    if (!curEx) return;

    if (field === 'weight') {
      // Cascade entered weight once to any unedited subsequent sets
      const enteredWeight = liveInputsRef.current[setIndex]?.weight ?? '';
      if (enteredWeight !== '') {
        const curSets = curEx.setsLog || [];
        setSetInputs(prev => {
          let hasCascade = false;
          const next = [...prev];
          for (let j = setIndex + 1; j < next.length; j++) {
            const subsequentSet = curSets[j];
            const isSubsequentEdited = userEditedFieldsRef.current[j]?.weight;
            if (subsequentSet && !subsequentSet.completed && !isSubsequentEdited) {
              next[j] = {
                ...(next[j] || { weight: '', reps: '' }),
                weight: enteredWeight,
              };
              if (!liveInputsRef.current[j]) liveInputsRef.current[j] = {};
              liveInputsRef.current[j].weight = enteredWeight;
              hasCascade = true;
            }
          }
          return hasCascade ? next : prev;
        });
      }

      // Instantly switch to reps of the current set
      hapticSelection();
      setActiveKeypad({ setIndex, field: 'reps' });
    } else {
      // Currently on reps: delegate completion, keypad focus advancement & auto-finish timer to handleToggleSetComplete
      hapticSuccess();
      handleToggleSetComplete(setIndex);
    }
  }, [handleToggleSetComplete]);

  const handleKeypadQuickFillWeight = useCallback((w: number) => {
    const curKeypad = activeKeypadRef.current;
    if (!curKeypad) return;
    isFieldSelectedRef.current = false;
    setIsFieldSelected(false);
    handleTextChange(curKeypad.setIndex, 'weight', String(w));
  }, [handleTextChange]);

  const handleKeypadSelectField = useCallback((f: 'weight' | 'reps') => {
    const curKeypad = activeKeypadRef.current;
    const curEx = stateRef.current.exercise;
    if (!curKeypad || curEx?.setsLog?.[curKeypad.setIndex]?.completed) return;
    isFieldSelectedRef.current = true;
    setIsFieldSelected(true);
    setActiveKeypad({ setIndex: curKeypad.setIndex, field: f });
  }, []);

  const handleKeypadDismiss = useCallback(() => {
    setActiveKeypad(null);
  }, []);

  // Reset custom workout keypad when switching exercises so Mode 1 (Sticky Dock) is shown by default
  useEffect(() => {
    setActiveKeypad(null);
  }, [activeExIndex]);

  // Guard: Ensure activeKeypad never stays focused on an already completed set
  useEffect(() => {
    if (activeKeypad && exercise?.setsLog) {
      const curSet = exercise.setsLog[activeKeypad.setIndex];
      if (curSet?.completed) {
        const nextIncomplete = exercise.setsLog.findIndex(s => !s.completed);
        if (nextIncomplete !== -1) {
          setActiveKeypad({ setIndex: nextIncomplete, field: 'weight' });
        } else {
          setActiveKeypad(null);
        }
      }
    }
  }, [exercise?.setsLog, activeKeypad]);

  // ── All Hooks MUST be declared BEFORE any conditional early returns (React Rules of Hooks) ──
  const handleSwapPress = useCallback(() => {
    hapticMedium();
    setShowSwapModal(true);
  }, []);

  const handleSupersetPress = useCallback(() => {
    hapticMedium();
    setShowSupersetPicker(true);
  }, []);

  const handleVideoToggle = useCallback(() => {
    hapticMedium();
    const curEx = stateRef.current.exercise;
    const curRealIdx = stateRef.current.realExerciseIndex;
    if (!curEx) return;
    if (!curEx.videoId) {
      setShowVideo(true);
      autoResolveExerciseVideoId(curEx.name).then(resolvedId => {
        if (resolvedId) {
          updateExercise(curRealIdx, { ...curEx, videoId: resolvedId });
        }
      });
    } else {
      setShowVideo(prev => !prev);
    }
  }, [updateExercise]);

  const handleSwitchToPartner = useCallback(() => {
    hapticLight();
    const partner = partnerExercise;
    if (!partner) return;
    const partnerIdx = activeExercises.findIndex(e =>
      (e.exerciseId && partner.exerciseId && e.exerciseId === partner.exerciseId) || e.name === partner.name
    );
    if (partnerIdx !== -1) {
      switchToExercise(partnerIdx);
    }
  }, [partnerExercise, activeExercises, switchToExercise]);

  const handleTimerAdd = useCallback(() => {
    setRestTimerDuration(restTimerInitialRef.current + 15);
  }, [setRestTimerDuration]);

  const handleTimerSubtract = useCallback(() => {
    setRestTimerDuration(Math.max(10, restTimerInitialRef.current - 15));
  }, [setRestTimerDuration]);

  const handleTimerSkip = useCallback(() => {
    clearRestTimer();
  }, [clearRestTimer]);

  const handlePillLayout = useCallback(
    (idx: number, e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      pillLayoutsRef.current[idx] = { x, width };
      if (idx === visualExIndexRef.current && !hasScrolledInitialPillRef.current) {
        hasScrolledInitialPillRef.current = true;
        if (idx > 0) {
          scrollToActivePill(idx, false);
        }
      }
    },
    [scrollToActivePill]
  );

  const handleOpenWorkoutMenu = useCallback(() => {
    setShowWorkoutMenuSheet(true);
  }, []);

  const handleOpenWhatHits = useCallback(() => {
    setShowWhatHitsSheet(true);
  }, []);

  const handleOpenExerciseMenu = useCallback(() => {
    setShowExerciseMenuSheet(true);
  }, []);

  const handleToggleShowWarmups = useCallback(() => {
    setShowCompletedWarmups((prev) => !prev);
  }, []);

  const handleFooterPrev = useCallback(() => {
    switchToExercise(Math.max(0, visualExIndexRef.current - 1));
  }, [switchToExercise]);

  const handleFooterNextOrFinish = useCallback(() => {
    const total = stateRef.current.exercises?.length || 0;
    if (visualExIndexRef.current < total - 1) {
      switchToExercise(visualExIndexRef.current + 1);
    } else {
      promptFinishWorkout();
    }
  }, [switchToExercise, promptFinishWorkout]);

  const handleEditRestDuration = useCallback((currentRemainingSecs?: number) => {
    const rem =
      currentRemainingSecs != null && currentRemainingSecs > 0
        ? currentRemainingSecs
        : (stateRef.current.exercise?.restTimeSecs || 90);
    setSheetInitialSecs(rem);
    const ex = stateRef.current.exercise;
    const curActive = ex?.setsLog ? ex.setsLog.findIndex((s: any) => !s.completed) : -1;
    setRestPickerSetIdx(curActive !== -1 ? curActive : 0);
  }, []);

  const openAddExerciseModal = useCallback(() => {
    setShowAddExerciseModal(true);
  }, []);

  const anySecondaryModalVisible = Boolean(
    deepDiveVisible ||
      showWhatHitsSheet ||
      showWorkoutMenuSheet ||
      showWorkoutSettingsSheet ||
      showExerciseMenuSheet ||
      showFinishEarlySheet ||
      noteModalConfig.visible ||
      restPickerSetIdx !== null
  );

  const hasAnyConfirmSheetOpen = Boolean(
    showDiscardConfirmSheet || deleteSetConfirmIdx !== null || pendingSwapPermanent
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.View style={[{ flex: 1 }, sheetModalAnimStyle]}>
        <View style={[styles.root, { paddingTop: insets.top }]}>
          {!log || !log.exercises ? (
            <>
              <View style={styles.header}>
                <TactileButton
                  variant="icon"
                  size="sm"
                  onPress={handleBack}
                  accessibilityLabel="Go back"
                  style={{ backgroundColor: 'transparent', borderWidth: 0 }}
                >
                  <AppIcon icon={ChevronLeft} size={24} color={tokens.text.primary} />
                </TactileButton>
                <Text style={styles.headerTitle}>Active Workout</Text>
                <View style={{ width: tokens.touch.minTarget }} />
              </View>
              <View style={styles.root} />
            </>
          ) : !exercise ? (
            <>
              <View style={styles.header}>
                <TactileButton
                  variant="icon"
                  size="sm"
                  onPress={handleBack}
                  accessibilityLabel="Close workout"
                  style={{ backgroundColor: 'transparent', borderWidth: 0 }}
                >
                  <AppIcon icon={ChevronDown} size={24} color={tokens.text.primary} />
                </TactileButton>
                <Text style={styles.headerTitle}>Active Workout</Text>
                <View style={{ width: tokens.touch.minTarget }} />
              </View>
              <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={[tokens.typography.body, { color: tokens.text.secondary }]}>
                  No exercises found for this session.
                </Text>
              </View>
            </>
          ) : (
            <>
              {/* Mid-Workout PR Celebration Toast */}
              {prToast && (
                <View style={[styles.prToastContainer, { top: Math.max(insets.top, 24) + tokens.space.md }]}>
                  <AppIcon icon={Trophy} size={26} color={tokens.status.gold} />
                  <View style={{ flex: 1, paddingRight: tokens.space.xs }}>
                    <Text style={styles.prToastTitle}>New Personal Record!</Text>
                    <Text style={styles.prToastSubtitle}>{prToast.message}</Text>
                  </View>
                  <TactileButton
                    variant="icon"
                    onPress={handleDismissPrToast}
                    style={styles.prToastCloseBtn}
                    accessibilityLabel="Dismiss personal record alert"
                  >
                    <AppIcon icon={X} size={18} color={tokens.text.secondary} />
                  </TactileButton>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <ActiveLoggingHeader
                  routineTitle={(log as any)?.name || (log as any)?.routineName || 'Active Workout'}
                  workoutStartTime={displayWorkoutStartTime}
                  totalCompletedSets={totalCompletedSets}
                  totalSessionSets={totalSessionSets}
                  liveTotalVolume={liveTotalVolume}
                  unitIsLbs={unitIsLbs}
                  panGesture={headerPullGesture}
                  sessionProgressStyle={sessionProgressStyle}
                  onTrackLayout={handleSessionTrackLayout}
                  onBack={handleBack}
                  onOpenMenu={handleOpenWorkoutMenu}
                  onPromptFinish={promptFinishWorkout}
                  styles={styles}
                />

                <ExerciseSelectorStrip
                  exercises={exercises}
                  visualExIndex={visualExIndex}
                  totalCompletedSets={totalCompletedSets}
                  carouselScrollRef={carouselScrollRef}
                  onPillLayout={handlePillLayout}
                  onSelectIndex={switchToExercise}
                  onOpenWhatHits={handleOpenWhatHits}
                />

                {/* Scrollable Content with Dual-Layer Synchronized Rolling Transitions */}
                <View style={styles.content}>
                  <ScrollView
                    ref={bodyScrollRef}
                    contentContainerStyle={[
                      styles.scrollContent,
                      { paddingBottom: isKeypadOpen ? 250 : restTimerStartTime ? 190 : 120 },
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                  >
                    <GestureDetector gesture={headerSwipeGesture}>
                      <Animated.View style={[{ width: '100%' }, headerRollStyle]}>
                        <ActiveExerciseHeader
                          exercise={exercise}
                          partnerExercise={partnerExercise}
                          overloadSuggestion={overloadSuggestion}
                          lastTimeData={lastTimeData}
                          showVideo={showVideo}
                          activeSetIndex={activeSetIndex}
                          isAllComplete={isAllComplete}
                          onRepeatPrevious={handleRepeatPreviousSet}
                          colors={colors}
                          styles={styles}
                          gymLogs={gymLogs}
                          onSwapPress={handleSwapPress}
                          onSupersetPress={handleSupersetPress}
                          onVideoToggle={handleVideoToggle}
                          onSwitchToPartner={handleSwitchToPartner}
                          onNoteChange={handleNoteChange}
                          onOpenExerciseMenu={handleOpenExerciseMenu}
                        />
                      </Animated.View>
                    </GestureDetector>

                    <Animated.View style={[{ width: '100%' }, setsRollStyle]}>
                      <SetList
                        setsLog={exercise.setsLog}
                        activeSetIndex={activeSetIndex}
                        setInputs={setInputs}
                        lastSessionSets={resolvedLastSessionSets}
                        colors={colors}
                        isDark={isDark}
                        styles={styles}
                        hasWarmups={hasWarmups}
                        allWarmupsCompleted={allWarmupsCompleted}
                        showCompletedWarmups={showCompletedWarmups}
                        overloadSuggestion={overloadSuggestion}
                        onToggleShowWarmups={handleToggleShowWarmups}
                        onSetAction={handleSetAction}
                        activeKeypadField={activeKeypad}
                        isFieldSelected={isFieldSelected}
                        onAddSet={handleAddSet}
                        isAllComplete={isAllComplete}
                        isLastExercise={activeExIndex === exercises.length - 1}
                        onFinishWorkout={promptFinishWorkout}
                      />

                      <ExerciseFooterNav
                        visualExIndex={visualExIndex}
                        exercises={exercises}
                        onPrev={handleFooterPrev}
                        onNextOrFinish={handleFooterNextOrFinish}
                      />
                    </Animated.View>
                  </ScrollView>
                </View>


        {/* ── Lazy-mount & Auto-Unmount Superset Modal (380ms closing grace) ── */}
        <LazySheet
          visible={showSupersetPicker}
          render={() => (
            <SupersetPickerModal
              visible={showSupersetPicker}
              exercise={exercise}
              exercises={exercises}
              colors={colors}
              styles={styles}
              onClose={() => setShowSupersetPicker(false)}
              onRemoveSuperset={() => {
                updateExercise(realExerciseIndex, { ...exercise, supersetGroup: undefined });
                setShowSupersetPicker(false);
              }}
              onSelectPartner={(altEx) => {
                const groupLetter = exercise.supersetGroup || altEx.supersetGroup || String.fromCharCode(65 + Math.floor(Math.random() * 26));
                updateExercise(realExerciseIndex, { ...exercise, supersetGroup: groupLetter });
                const partnerRealIdx = log?.exercises?.findIndex((e: any) =>
                  (e.exerciseId && altEx.exerciseId && e.exerciseId === altEx.exerciseId) || e.name === altEx.name
                ) ?? -1;
                if (partnerRealIdx !== -1) {
                  updateExercise(partnerRealIdx, { ...altEx, supersetGroup: groupLetter });
                }
                setShowSupersetPicker(false);
              }}
            />
          )}
        />

        {/* ── Lazy-mount & Auto-Unmount Swap Modal (380ms closing grace) ── */}
        <LazySheet
          visible={showSwapModal}
          render={() => (
            <ActiveSwapModal
              visible={showSwapModal}
              exercise={exercise}
              aiSwapList={aiSwapList}
              isAiSwapLoading={isAiSwapLoading}
              onClose={() => setShowSwapModal(false)}
              onSelectSwap={(alt) => {
                const oldName = exercise.name;
                hapticSuccess();
                setShowSwapModal(false);

                let resolvedVideoId = alt.videoId || '';
                if (!resolvedVideoId) {
                  autoResolveExerciseVideoId(alt.name).then(vid => {
                    if (vid) {
                      const curEx = stateRef.current.exercise;
                      if (curEx && curEx.name === alt.name) {
                        updateExercise(stateRef.current.realExerciseIndex, { ...curEx, videoId: vid });
                      }
                    }
                  }).catch(() => {});
                }

                const targetDateStr = lockedSessionDateRef.current;
                const prevSession = getPreviousExerciseSession(alt.name, gymLogs, targetDateStr);
                const lastSets = prevSession?.sets || [];
                const lastValidSet = lastSets.length > 0 ? lastSets[lastSets.length - 1] : null;
                const targetSetsCount = alt.targetSets || 3;
                const defaultTargetReps = parseUpperTargetReps(alt.targetReps || '8-12');

                const initialSetsLog = Array.from({ length: targetSetsCount }, (_, i) => {
                  const lastSet = lastSets[i] || lastValidSet;
                  const setWeight = (lastSet?.weight != null && !isNaN(Number(lastSet.weight)) && Number(lastSet.weight) >= 0) ? Number(lastSet.weight) : null;
                  return {
                    setNumber: i + 1,
                    reps: lastSet?.reps ? Number(lastSet.reps) : defaultTargetReps,
                    weight: setWeight,
                    completed: false,
                  };
                });

                const updatedEx = {
                  ...exercise,
                  exerciseId: `swap_${Date.now()}`,
                  name: alt.name,
                  muscle: alt.muscle || exercise.muscle,
                  targetSets: targetSetsCount,
                  targetReps: alt.targetReps || '8-12',
                  restTimeSecs: alt.restTimeSecs || 90,
                  videoId: resolvedVideoId,
                  lastSessionSets: lastSets.length > 0 ? lastSets : undefined,
                  setsLog: initialSetsLog,
                };

                updateExercise(realExerciseIndex, updatedEx);
                setSetInputs(initialSetsLog.map(s => ({
                  weight: s.weight != null ? String(kgToDisplay(Number(s.weight), unitIsLbs, 1)) : '',
                  reps: s.reps != null ? String(s.reps) : '',
                })));
                userEditedFieldsRef.current = {};
                liveInputsRef.current = {};

                setShowSwapModal(false);
                afterSheetDismiss(() => {
                  setPendingSwapPermanent({
                    oldName,
                    newName: alt.name,
                    videoId: resolvedVideoId || alt.videoId,
                    muscle: alt.muscle || exercise.muscle,
                    targetSets: alt.targetSets,
                    targetReps: alt.targetReps,
                    restTimeSecs: alt.restTimeSecs,
                  });
                });
              }}
            />
          )}
        />

      </View>

      {/* ── ZONE 2: FIXED BOTTOM ACTION DOCK (Morphs between Mode 1 and Mode 2) ── */}
      {isKeypadOpen ? (
        <View onLayout={handleKeypadLayout}>
          <WorkoutKeypad
            visible={true}
            field={activeKeypad?.field ?? 'weight'}
            stepSize={smartWeightStep}
            unit={unitLabel(unitIsLbs)}
            selectedRir={
              activeKeypad
                ? (exercise?.setsLog?.[activeKeypad.setIndex]?.rir ?? activeProgrammeWeek?.targetRir ?? 1)
                : (activeProgrammeWeek?.targetRir ?? 1)
            }
            lastSessionWeight={
              activeKeypad
                ? (() => {
                    const rawLast =
                      resolvedLastSessionSets?.[activeKeypad.setIndex]?.weight ??
                      resolvedLastSessionSets?.[resolvedLastSessionSets.length - 1]?.weight ??
                      null;
                    return rawLast != null && Number(rawLast) > 0
                      ? kgToDisplay(Number(rawLast), unitIsLbs, 1)
                      : rawLast;
                  })()
                : null
            }
            onQuickFillWeight={handleKeypadQuickFillWeight}
            onKeyPress={handleKeypadPress}
            onBackspace={handleKeypadBackspace}
            onClear={handleKeypadClear}
            onStepAdjust={handleKeypadStepAdjust}
            onSelectField={handleKeypadSelectField}
            onSelectRir={handleSetRIR}
            onNextOrComplete={handleKeypadNextOrComplete}
            onDismiss={handleKeypadDismiss}
          />
        </View>
      ) : null}

      {/* Sticky Rest Timer Overlay */}
      {(restTimerStartTime && restTimerDurationSecs) ? (
        <AnimatedRestTimer
          startTime={restTimerStartTime}
          durationSecs={restTimerDurationSecs}
          bottomOffset={timerBottomOffset}
          onAdd={handleTimerAdd}
          onSubtract={handleTimerSubtract}
          onSkip={handleTimerSkip}
          onEditDuration={handleEditRestDuration}
        />
      ) : null}

              <LazySheet
                visible={anySecondaryModalVisible || hasRemoveConfirmOpen}
                holdMs={550}
                render={() => (
                  <ActiveWorkoutModals
                    deepDiveVisible={deepDiveVisible}
                    setDeepDiveVisible={setDeepDiveVisible}
                    deepDiveInitialTab={deepDiveTab}
                    setDeepDiveInitialTab={setDeepDiveTab}
                    showWhatHitsSheet={showWhatHitsSheet}
                    setShowWhatHitsSheet={setShowWhatHitsSheet}
                    showWorkoutMenuSheet={showWorkoutMenuSheet}
                    setShowWorkoutMenuSheet={setShowWorkoutMenuSheet}
                    showWorkoutSettingsSheet={showWorkoutSettingsSheet}
                    setShowWorkoutSettingsSheet={setShowWorkoutSettingsSheet}
                    showExerciseMenuSheet={showExerciseMenuSheet}
                    setShowExerciseMenuSheet={setShowExerciseMenuSheet}
                    showFinishEarlySheet={showFinishEarlySheet}
                    setShowFinishEarlySheet={setShowFinishEarlySheet}
                    noteModalConfig={noteModalConfig}
                    setNoteModalConfig={setNoteModalConfig}
                    restPickerSetIdx={restPickerSetIdx}
                    setRestPickerSetIdx={setRestPickerSetIdx}
                    sheetInitialSecs={sheetInitialSecs}
                    exercise={exercise}
                    exercises={exercises}
                    activeExIndex={activeExIndex}
                    setActiveExIndex={switchToExercise}
                    activeSetIndex={activeSetIndex}
                    overloadSuggestion={overloadSuggestion}
                    gymLogs={gymLogs || []}
                    sessionNote={sessionNote}
                    soundEnabled={soundEnabled}
                    setSoundEnabled={setSoundEnabled}
                    autoTimerEnabled={autoTimerEnabled}
                    setAutoTimerEnabled={setAutoTimerEnabled}
                    keepAwakeEnabled={keepAwakeEnabled}
                    setKeepAwakeEnabled={(val: boolean) => {
                      setKeepAwakeEnabled(val);
                      setKeepAwakeEnabledGlobal(val);
                      saveGymProfile({ keepAwake: val }).catch(() => {});
                    }}
                    uncheckedSetsCount={uncheckedSetsCount}
                    completedSetsCount={completedSetsCount}
                    hasWarmups={hasWarmups}
                    onSupersetPress={handleSupersetPress}
                    onAddExercise={openAddExerciseModal}
                    onSelectDefaultRest={(secs) => {
                      setDefaultRestSecsGlobal(secs);
                      saveGymProfile({ defaultRestSecs: secs }).catch(() => {});
                      const curRealIdx = stateRef.current.realExerciseIndex;
                      const curEx = stateRef.current.exercise;
                      if (curEx && curRealIdx !== undefined) {
                        updateExercise(curRealIdx, { ...curEx, restTimeSecs: secs });
                      }
                    }}
                    onToggleAutoTimerGlobal={(val) => {
                      setAutoTimerEnabledGlobal(val);
                      saveGymProfile({ autoTimer: val }).catch(() => {});
                    }}
                    onToggleAudioGlobal={(val) => {
                      setAudioCuesEnabledGlobal(val);
                      saveGymProfile({ audioCues: val }).catch(() => {});
                    }}
                    onSwapPress={handleSwapPress}
                    onAutoWarmup={handleAutoWarmup}
                    onShowVideo={() => setShowVideo(true)}
                    onRemoveExercise={handleRemoveExercise}
                    onFinishAndSave={handleFinishAndSave}
                    onDiscardWorkout={handleDiscardWorkout}
                    onSaveNote={handleSaveNote}
                    onSelectRest={handleSelectRest}
                    onTimerSkip={handleTimerSkip}
                    onRemoveConfirmVisibilityChange={setHasRemoveConfirmOpen}
                  />
                )}
              />

              <LazySheet
                visible={showAddExerciseModal}
                render={() => (
                  <AddExerciseModal
                    visible={showAddExerciseModal}
                    onClose={() => setShowAddExerciseModal(false)}
                    onAdd={(newEx: any) => {
                      addExercise(newEx);
                      setShowAddExerciseModal(false);
                    }}
                    existingExerciseIds={activeExercises.map((e: any) => e.exerciseId || e.id || e.name)}
                  />
                )}
              />

              <LazySheet
                visible={hasAnyConfirmSheetOpen}
                render={() => (
                  <ActiveConfirmSheets
                    showDiscardConfirmSheet={showDiscardConfirmSheet}
                    onCloseDiscard={() => setShowDiscardConfirmSheet(false)}
                    onConfirmDiscard={handleConfirmDiscardWorkout}
                    deleteSetConfirmIdx={deleteSetConfirmIdx}
                    exerciseName={exercise?.name}
                    deleteSetNumber={
                      deleteSetConfirmIdx !== null
                        ? exercise?.setsLog?.[deleteSetConfirmIdx]?.setNumber || deleteSetConfirmIdx + 1
                        : undefined
                    }
                    onCloseDeleteSet={() => setDeleteSetConfirmIdx(null)}
                    onConfirmDeleteSet={handleDeleteSet}
                    pendingSwapPermanent={pendingSwapPermanent}
                    onCloseSwapPermanent={() => setPendingSwapPermanent(null)}
                    onConfirmSwapPermanent={(p) =>
                      makeSwapPermanent(
                        p.oldName,
                        p.newName,
                        p.videoId,
                        p.muscle,
                        p.targetSets,
                        p.targetReps,
                        p.restTimeSecs
                      )
                    }
                  />
                )}
              />

              {/* High-Contrast Screen Flash Rest Alert Overlay */}
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor: tokens.accent.primary,
                    zIndex: 999999,
                  },
                  flashAnimatedStyle,
                ]}
              />
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
}
