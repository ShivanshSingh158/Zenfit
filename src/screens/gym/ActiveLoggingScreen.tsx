import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Alert,
  Platform, KeyboardAvoidingView, ScrollView, ActivityIndicator,
  Keyboard, DeviceEventEmitter, InteractionManager, BackHandler, StyleSheet,
  useWindowDimensions, Animated
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONT_FAMILY, SPACE } from '../../theme/tokens';
import { useGymLog, todayStr } from '../../hooks/useGymLog';
import { useGymLogs, setWorkoutActiveGlobal } from '../../contexts/domains/WellnessContext';
import { useTheme } from '../../contexts/ThemeContext';
import { calculateExerciseMaxWeight, getPreviousExerciseSession, getExerciseSwapAlternatives, normalizeExerciseKey } from '../../utils/gymUtils';
import { hapticLight, hapticMedium, hapticSuccess, hapticSelection, hapticError } from '../../utils/haptics';
import { autoResolveExerciseVideoId } from '../../services/exerciseVideoResolver';
import { getOverloadSuggestion, getRestDuration } from '../../services/progressiveOverload';
import { playSetCompleteTone } from '../../services/gymSoundSynthesizer';
import { GymNavigationParamList } from '../../types/gym.types';

import { makeActiveLoggingStyles } from './activeLoggingStyles';
import WorkoutTimer from '../../components/Gym/WorkoutTimer';
import SetList from '../../components/Gym/SetList';
import ActiveExerciseHeader from '../../components/Gym/ActiveExerciseHeader';
import ActiveExerciseVideo from '../../components/Gym/ActiveExerciseVideo';
import { StickyLoggingDock } from '../../components/Gym/StickyLoggingDock';
import SupersetPickerModal from '../../components/Gym/SupersetPickerModal';
import ActiveSwapModal from '../../components/Gym/ActiveSwapModal';
import AnimatedRestTimer from '../../components/Gym/AnimatedRestTimer';
import ExerciseDeepDiveModal from '../../components/Gym/ExerciseDeepDiveModal';
import PlateCalculatorModal from '../../components/Gym/PlateCalculatorModal';
import { WorkoutKeypad } from '../../components/Gym/WorkoutKeypad';
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

export { parseUpperTargetReps };

export default function ActiveLoggingScreen() {
  const { colors, isDark } = useTheme();
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

  const {
    log,
    updateExercise,
    startRestTimer,
    clearRestTimer,
    setRestTimerDuration,
    restTimerStartTime,
    restTimerDurationSecs,
    restTimerInitial,
    swapExercise,
    makeSwapPermanent,
    logSetAndStartTimer,
    endWorkout,
    startWorkout,
  } = useGymLog(date);

  if (log?.date && lockedSessionDateRef.current !== log.date) {
    lockedSessionDateRef.current = log.date;
  }

  const insets = useSafeAreaInsets();

  // Prevent phone screen from locking or sleeping during active workout
  useKeepAwake();

  const isLoggingSetRef = useRef(false);
  const supersetJumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef<any>({});

  // PERF: Freeze notification reschedules and shield WellnessContext snapshot cascades while active workout screen is mounted
  useEffect(() => {
    const { setActiveWorkoutFlag } = require('../../components/BackgroundNotificationWatcher');
    setActiveWorkoutFlag(true);
    setWorkoutActiveGlobal(true);
    return () => {
      setActiveWorkoutFlag(false);
      setWorkoutActiveGlobal(false);
    };
  }, []);

  // ── High-Contrast Screen Flash Rest Alert (OpenGym Pattern) ───────────────
  const flashAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('gym_rest_timer_flash', () => {
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.28, duration: 90, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0.28, duration: 90, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    });
    return () => sub.remove();
  }, [flashAnim]);


  const [showSupersetPicker, setShowSupersetPicker] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const targetParamIndex = route.params?.initialIndex ?? (route.params as any)?.exerciseIndex ?? 0;
  const [activeExIndex, setActiveExIndex] = useState(targetParamIndex);
  // ── Track initialIndex consumption via ref only — no navigation.setParams() on mount.
  const consumedInitialIndexRef = useRef<number | null>(targetParamIndex);

  const restTimerInitialRef = useRef(restTimerInitial);
  useEffect(() => {
    restTimerInitialRef.current = restTimerInitial;
  }, [restTimerInitial]);

  const videoRetryCountMapRef = useRef<Record<string, number>>({});

  const carouselScrollRef = useRef<ScrollView>(null);
  const pillLayoutsRef = useRef<{ [key: number]: { x: number; width: number } }>({});

  const scrollToActivePill = useCallback((index: number) => {
    const layout = pillLayoutsRef.current[index];
    if (layout && carouselScrollRef.current) {
      const targetX = Math.max(0, layout.x - (screenWidth / 2) + (layout.width / 2));
      carouselScrollRef.current.scrollTo({ x: targetX, animated: true });
    }
  }, [screenWidth]);

  useEffect(() => {
    if (pillLayoutsRef.current[activeExIndex]) {
      scrollToActivePill(activeExIndex);
    } else {
      const timer = setTimeout(() => {
        scrollToActivePill(activeExIndex);
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [activeExIndex, scrollToActivePill]);

  useEffect(() => {
    const target = route.params?.initialIndex ?? (route.params as any)?.exerciseIndex;
    if (target !== undefined && consumedInitialIndexRef.current !== target) {
      consumedInitialIndexRef.current = target;
      setActiveExIndex(target);
    }
  }, [route.params?.initialIndex, (route.params as any)?.exerciseIndex]);

  const [showVideo, setShowVideo] = useState(false);
  // ── FIX 4: Lazy-mount modals — don't track 'ever shown' as the same flag as 'currently visible'.
  // SupersetPickerModal and ActiveSwapModal are only inserted into the React tree
  // once the user has opened them for the first time — saving initial module evaluation.
  const [swapModalEverShown, setSwapModalEverShown] = useState(false);
  const [supersetPickerEverShown, setSupersetPickerEverShown] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [aiSwapList, setAiSwapList] = useState<any[]>([]);
  const [isAiSwapLoading, setIsAiSwapLoading] = useState(false);
  const [isRefreshingVideo, setIsRefreshingVideo] = useState(false);
  const [showCompletedWarmups, setShowCompletedWarmups] = useState(false);
  const [deepDiveVisible, setDeepDiveVisible] = useState(false);

  useEffect(() => {
    setShowCompletedWarmups(false);
  }, [activeExIndex]);

  const { gymLogs } = useGymLogs();

  const activeExercises = useMemo(() => log?.exercises?.filter(ex => !ex.skipped) || [], [log?.exercises]);
  const safeIdx = Math.min(activeExIndex, Math.max(0, activeExercises.length - 1));
  const exercise = activeExercises[safeIdx];

  const resolvedLastSessionSets = useMemo(() => {
    if (!exercise) return [];
    if (Array.isArray(exercise.lastSessionSets) && exercise.lastSessionSets.length > 0) {
      return exercise.lastSessionSets;
    }
    const prev = getPreviousExerciseSession(exercise.name, gymLogs, date || todayStr());
    return prev?.sets || [];
  }, [exercise?.lastSessionSets, exercise?.name, gymLogs, date]);

  // ── FIX 1: Lazy-initialize setInputs synchronously in the useState initializer.
  // This eliminates the double-render that previously happened on every mount:
  //   Frame 0: render with empty [] → Frame 1: useEffect fires setSetInputs() → re-render
  // Now Frame 0 already has the correct inputs; no forced second render needed.
  const userEditedFieldsRef = useRef<{ [idx: number]: { weight?: boolean; reps?: boolean } }>({});
  const lastExerciseKeyRef = useRef<string>('');
  const liveInputsRef = useRef<{ [idx: number]: { weight?: string; reps?: string } }>({});
  // ── FIX 4: Track the previous setsLog length to detect actual add/remove events.
  // handleLogSet already patches setInputs directly when completing a set, so the
  // setsLog sync useEffect must not re-run setSetInputs() just because `completed`
  // flags changed — the count hasn't changed and the data is already correct.
  const prevSetsLengthRef = useRef<number>(-1);
  const [setInputs, setSetInputs] = useState<SetInputState[]>(() =>
    computeInitialSetInputs(exercise, gymLogs, date)
  );

  // ── FIX 2: Defer heavy historical computation after the slide animation completes.
  // overloadSuggestion and lastTimeData both walk the entire gymLogs history.
  // Running them synchronously on mount blocks the JS thread during the push animation.
  // With InteractionManager they execute only after all pending animations finish.
  const [overloadSuggestion, setOverloadSuggestion] = useState<any | null>(null);
  const [lastTimeData, setLastTimeData] = useState<string | null>(null);
  const [showPlateModal, setShowPlateModal] = useState(false);
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

  const interactionsSettledRef = useRef(false);
  const lastBannerExKeyRef = useRef<string>('');

  // ── Sync Live Workout State with Android Home Screen Widget ───────────────
  const { appState } = useActiveWidgetSync({
    activeExercises,
    safeIdx,
    date,
    log,
  });

  // Clean up lock screen notification on mount, unmount, or workout completion
  useEffect(() => {
    dismissActiveWorkoutNotification();
    return () => {
      dismissActiveWorkoutNotification();
    };
  }, []);

  const exercises = activeExercises;

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

  // Fast O(1) Pre-Indexed PR baseline lookup in RAM for the currently active exercise
  const currentExerciseBaselinePR = useMemo(() => {
    if (!exercise?.name || !pastGymLogs.length) return { maxWeight: 0, max1RM: 0 };
    const targetKey = normalizeExerciseKey(exercise.name);
    let maxWeight = 0;
    let max1RM = 0;
    for (let i = 0; i < pastGymLogs.length; i++) {
      const l = pastGymLogs[i];
      const exs = l.exercises || [];
      for (let j = 0; j < exs.length; j++) {
        const ex = exs[j];
        if (ex.skipped || normalizeExerciseKey(ex.name) !== targetKey) continue;
        const sets = ex.setsLog || [];
        for (let k = 0; k < sets.length; k++) {
          const s = sets[k];
          if (!s.completed) continue;
          const w = Number(s.weight) || 0;
          const r = Number(s.reps) || 0;
          if (w > maxWeight) maxWeight = w;
          const e1rm = w * (1 + r / 30);
          if (e1rm > max1RM) max1RM = e1rm;
        }
      }
    }
    return { maxWeight, max1RM };
  }, [exercise?.name, pastGymLogs]);

  // ── Compute overloadSuggestion + lastTimeData without layout collapse flickers.
  // 1. Only wipe banner to null if user genuinely switched to a DIFFERENT exercise.
  // 2. Evaluates against past completed sessions (before today) so logging sets today never triggers recalculations.
  // 3. Fallback baseline weight uses previous session weight so suggestion displays on set 1 without popping in late.
  useEffect(() => {
    if (!exercise) return;
    const currentExId = exercise.exerciseId || exercise.name || '';
    const currentExKey = `${currentExId}-${activeExIndex}`;
    const isDifferentExercise = currentExKey !== lastBannerExKeyRef.current;

    if (isDifferentExercise) {
      lastBannerExKeyRef.current = currentExKey;
      interactionsSettledRef.current = false;
      setOverloadSuggestion(null);
      setLastTimeData(null);
    }

    const task = InteractionManager.runAfterInteractions(() => {
      interactionsSettledRef.current = true;
      // Overload suggestion: evaluate against past completed sessions before today
      const prevSession = getPreviousExerciseSession(exercise.name, pastGymLogs, targetDateStr);
      const curWeight = calculateExerciseMaxWeight(exercise as any) ||
        prevSession?.lastWeight ||
        Number(exercise.lastSessionSets?.[0]?.weight) ||
        0;

      const suggestion = getOverloadSuggestion(
        exercise,
        curWeight,
        exercise.targetSets || 3,
        String(exercise.targetReps || '8'),
        pastGymLogs
      );
      setOverloadSuggestion(suggestion);

      // Last-session stats banner
      if (prevSession && prevSession.sets.length > 0) {
        const weightPart = prevSession.lastWeight ? `@ ${prevSession.lastWeight}kg` : '';
        const repsPart = prevSession.avgReps ? `${prevSession.avgReps} reps` : '';
        setLastTimeData(`Last: ${prevSession.sets.length} sets ${repsPart ? `× ${repsPart}` : ''} ${weightPart}`.trim());
      } else {
        setLastTimeData(null);
      }
    });

    return () => task.cancel();
  }, [exercise?.exerciseId, exercise?.name, activeExIndex, pastGymLogs, targetDateStr]);

  // ── FIX 1 (continued): Sync setInputs when exercise changes or setsLog mutates.
  // This replaces the old 'initialize from scratch' useEffect with a lightweight
  // sync that only updates inputs for changed/added sets, preserving live edits.
  useEffect(() => {
    if (!exercise || !exercise.setsLog) return;

    const currentExId = exercise.exerciseId || exercise.name || '';
    const key = `${currentExId}-${activeExIndex}`;
    const currentLen = exercise.setsLog.length;

    // Exercise switched → reset edit tracking & recompute from scratch
    if (key !== lastExerciseKeyRef.current) {
      lastExerciseKeyRef.current = key;
      prevSetsLengthRef.current = currentLen;
      userEditedFieldsRef.current = {};
      liveInputsRef.current = {};
      setSetInputs(computeInitialSetInputs(exercise, gymLogs, date));
      return;
    }

    // Check if there are unfilled incomplete set inputs that can now be populated from resolvedLastSessionSets
    const hasUnfilled = setInputs.some(
      (inp, i) => !exercise.setsLog[i]?.completed && (!inp.weight || !inp.reps) && !userEditedFieldsRef.current[i]?.weight
    );
    const shouldBackfillFromHistory = hasUnfilled && resolvedLastSessionSets.length > 0;

    // Skip the sync when set count hasn't changed and no history backfill is needed
    if (currentLen === prevSetsLengthRef.current && !shouldBackfillFromHistory) {
      return;
    }
    prevSetsLengthRef.current = currentLen;

    // Same exercise, set count changed (add/remove) or history backfill:
    setSetInputs(prev => {
      const lastValidPastSet = resolvedLastSessionSets.length > 0 ? resolvedLastSessionSets[resolvedLastSessionSets.length - 1] : null;
      return exercise.setsLog.map((s, idx) => {
        if (s.completed) {
          const savedW = (s.weight !== null && s.weight !== undefined && Number(s.weight) > 0) ? String(s.weight) : '';
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
        const fallbackWeight = lastSet?.weight != null && Number(lastSet.weight) > 0 ? String(lastSet.weight) : '';
        const setWeight = (s.weight !== null && s.weight !== undefined && Number(s.weight) > 0)
          ? String(s.weight)
          : (fallbackWeight || prev?.[idx]?.weight || '');
        const defaultTargetReps = String(parseUpperTargetReps(exercise.targetReps));
        const setReps = (s.reps !== null && s.reps !== undefined && Number(s.reps) > 0)
          ? String(parseUpperTargetReps(s.reps))
          : (lastSet?.reps ? String(parseUpperTargetReps(lastSet.reps)) : (prev?.[idx]?.reps || defaultTargetReps));

        return { weight: setWeight, reps: setReps };
      });
    });
  }, [exercise?.exerciseId, exercise?.name, activeExIndex, exercise?.setsLog?.length, date, resolvedLastSessionSets, gymLogs]);

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

  // Active uncompleted set index and metadata for Bottom Dock
  const dockActiveSetIdx = activeSetIndex;
  const dockActiveSet = dockActiveSetIdx !== -1 ? exercise?.setsLog?.[dockActiveSetIdx] : null;
  const dockInput = dockActiveSetIdx !== -1 ? setInputs[dockActiveSetIdx] : null;
  const dockPrescription = overloadSuggestion?.prescribedSets?.[dockActiveSetIdx];

  const dockActiveWeight = (() => {
    if (dockInput?.weight) return parseFloat(dockInput.weight) || 0;
    if (dockActiveSet?.weight != null && Number(dockActiveSet.weight) > 0) return Number(dockActiveSet.weight);
    if (dockPrescription?.targetWeight) return Number(dockPrescription.targetWeight);
    if (overloadSuggestion?.recommended) return Number(overloadSuggestion.recommended);
    return 0;
  })();

  const dockActiveReps = (() => {
    if (dockInput?.reps) return parseUpperTargetReps(dockInput.reps);
    if (dockActiveSet?.reps != null && Number(dockActiveSet.reps) > 0) return parseUpperTargetReps(dockActiveSet.reps);
    if (dockPrescription?.targetReps) return Number(dockPrescription.targetReps);
    if (exercise?.targetReps) return parseUpperTargetReps(exercise.targetReps);
    return 10;
  })();

  const dockSelectedRir = dockActiveSet?.rir ?? 1;
  const isKeypadOpen = !!activeKeypad && !isAllComplete && !exercise?.setsLog?.[activeKeypad.setIndex]?.completed;

  // Rest timer sits docked cleanly above whichever bottom bar is showing (keypad or sticky dock)
  const timerBottomOffset = isKeypadOpen
    ? (Platform.OS === 'android' ? 260 : 285)
    : (Math.max(insets.bottom, 12) + 115);



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

  const handleOpenPlateCalculator = useCallback(() => {
    setShowPlateModal(true);
  }, []);

  const stateRef = useRef({
    setInputs,
    exercise,
    resolvedLastSessionSets,
    overloadSuggestion,
    realExerciseIndex,
    exercises,
    activeExIndex,
    currentExerciseBaselinePR,
  });
  stateRef.current = {
    setInputs,
    exercise,
    resolvedLastSessionSets,
    overloadSuggestion,
    realExerciseIndex,
    exercises,
    activeExIndex,
    currentExerciseBaselinePR,
  };

  const handleTextChange = useCallback((setIdx: number, field: 'reps' | 'weight', text: string) => {
    let sanitized = text.trim();

    if (field === 'weight') {
      const num = parseFloat(sanitized);
      if (!isNaN(num) && num > 1000) {
        sanitized = '1000';
      }
    } else if (field === 'reps') {
      if (/[-–—]/.test(sanitized)) {
        sanitized = String(parseUpperTargetReps(sanitized));
      } else {
        const num = parseInt(sanitized, 10);
        if (!isNaN(num) && num > 50) {
          sanitized = '50';
        }
      }
    }

    if (!userEditedFieldsRef.current[setIdx]) userEditedFieldsRef.current[setIdx] = {};
    userEditedFieldsRef.current[setIdx][field] = true;
    if (!liveInputsRef.current[setIdx]) liveInputsRef.current[setIdx] = {};
    liveInputsRef.current[setIdx][field] = sanitized;

    setSetInputs(prev => {
      if (prev[setIdx] && prev[setIdx][field] === sanitized) return prev;
      const next = [...prev];
      const curSet = stateRef.current.exercise?.setsLog?.[setIdx];
      const current = next[setIdx] || {
        weight: curSet?.weight != null ? String(curSet.weight) : '',
        reps: curSet?.reps != null ? String(curSet.reps) : ''
      };
      next[setIdx] = { ...current, [field]: sanitized };
      return next;
    });
  }, []);

  const handleBlur = useCallback((setIdx: number) => {
    const { exercise, setInputs: curInputs, overloadSuggestion: curOverload, realExerciseIndex: curRealIdx, resolvedLastSessionSets: pastSets } = stateRef.current;
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
      lastSessionSet
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
    const { exercise, setInputs: curInputs, overloadSuggestion: curOverload, realExerciseIndex: curRealIdx, resolvedLastSessionSets: pastSets } = stateRef.current;
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
        lastSessionSet
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

  const handleBack = useCallback(() => {
    if (activeKeypadRef.current) {
      hapticLight();
      setActiveKeypad(null);
      return;
    }
    flushPendingInputs();
    Keyboard.dismiss();
    hapticLight();
    navigation.goBack();
  }, [flushPendingInputs, navigation]);

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
      flushPendingInputs();
    };
  }, [flushPendingInputs]);

  const handleLogSet = useCallback(() => {
    if (isLoggingSetRef.current) return;
    const { exercise, setInputs: curInputs, overloadSuggestion: curOverload, realExerciseIndex: curRealIdx, exercises: allExs, activeExIndex: curActiveIdx, resolvedLastSessionSets: pastSets } = stateRef.current;
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
      lastSessionSet
    );

    const newEx = {
      ...exercise,
      setsLog: exercise.setsLog.map((s, i) =>
        i === curActiveSetIndex ? { ...s, weight: resolved.weight, reps: resolved.reps, completed: true } : s
      ),
    };

    setSetInputs(prev => prev.map((inp, i) =>
      i === curActiveSetIndex ? { weight: resolved.weight !== null ? String(resolved.weight) : '', reps: String(resolved.reps) } : inp
    ));

    const nextJumpIdx = findNextSupersetExerciseIndex(allExs, curActiveIdx, exercise.supersetGroup);
    const restSecs = nextJumpIdx !== -1 ? 30 : getRestDuration(exercise);

    if (!log?.workoutStartTime) {
      startWorkout();
    }
    logSetAndStartTimer(curRealIdx, newEx, restSecs, exercise.name);

    if (resolved.weight && resolved.reps && resolved.weight > 0 && resolved.reps > 0) {
      InteractionManager.runAfterInteractions(() => {
        const { currentExerciseBaselinePR: baselinePR } = stateRef.current;
        const w = resolved.weight!;
        const r = resolved.reps!;
        const est1RM = Math.round(w * (1 + r / 30) * 10) / 10;
        const isPR = baselinePR && (w > baselinePR.maxWeight || est1RM > baselinePR.max1RM);

        if (isPR) {
          hapticSuccess();
          if (prToastTimerRef.current) clearTimeout(prToastTimerRef.current);
          setPrToast({
            message: `${exercise.name}: ${w} kg × ${r} (Est. 1RM: ${est1RM} kg)`,
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
      supersetJumpTimerRef.current = setTimeout(() => setActiveExIndex(nextJumpIdx), 400);
    }
  }, [logSetAndStartTimer]);

  const handleAdjustWeight = useCallback((delta: number) => {
    const { exercise, setInputs: curInputs, overloadSuggestion: curOverload } = stateRef.current;
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
      baseWeight = Number(curSet.weight);
    } else if (prevSet?.weight != null && Number(prevSet.weight) > 0) {
      baseWeight = Number(prevSet.weight);
    } else if (curOverload?.recommended) {
      baseWeight = Number(curOverload.recommended);
    }

    const newWeight = Math.min(1000, Math.max(0, Math.round((baseWeight + delta) * 10) / 10));
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

    const newReps = Math.min(50, Math.max(1, baseReps + delta));
    handleTextChange(targetIdx, 'reps', String(newReps));
  }, [handleTextChange]);

  const handleRepeatPreviousSet = useCallback(() => {
    const { exercise, setInputs: curInputs, overloadSuggestion: curOverload } = stateRef.current;
    if (!exercise) return;
    const curActiveSetIndex = exercise.setsLog.findIndex(s => !s.completed);
    const targetIdx = curActiveSetIndex !== -1 ? curActiveSetIndex : exercise.setsLog.length - 1;
    if (targetIdx < 0) return;
    hapticSelection();

    const prevSet = targetIdx > 0 ? exercise.setsLog[targetIdx - 1] : null;
    const prevInput = targetIdx > 0 ? curInputs[targetIdx - 1] : null;

    let repWeight = '';
    if (prevInput?.weight) {
      repWeight = prevInput.weight;
    } else if (prevSet?.weight != null && Number(prevSet.weight) > 0) {
      repWeight = String(prevSet.weight);
    } else if (curOverload?.recommended) {
      repWeight = String(Math.min(1000, Number(curOverload.recommended)));
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
      if (supersetJumpTimerRef.current) clearTimeout(supersetJumpTimerRef.current);
      setActiveExIndex(curIdx + 1);
    } else {
      hapticSuccess();
      clearRestTimer();
      await endWorkout(true);
      const sessionDate = date || targetDateStr;
      navigation.replace('WorkoutSummary', { date: sessionDate });
    }
  }, [flushPendingInputs, clearRestTimer, endWorkout, navigation, date, targetDateStr]);

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
  };

  // Handle interactive lock screen notification actions (Done Set, Add Weight, Next Exercise, Skip Rest)
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
      }
    });

    return () => {
      sub.remove();
      if (supersetJumpTimerRef.current) {
        clearTimeout(supersetJumpTimerRef.current);
      }
    };
  }, [navigation]);

  const warmupSets = useMemo(() => exercise?.setsLog.filter(s => s.isWarmup) || [], [exercise?.setsLog]);
  const hasWarmups = warmupSets.length > 0;
  const allWarmupsCompleted = hasWarmups && warmupSets.every(s => s.completed);
  const hasAnyWarmupCompleted = hasWarmups && warmupSets.some(s => s.completed);

  const handleAutoWarmup = useCallback(() => {
    if (!exercise) return;
    hapticMedium();

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
        weight: (s.weight !== null && s.weight !== undefined && Number(s.weight) > 0) ? String(s.weight) : '',
        reps: (s.reps !== null && s.reps !== undefined && Number(s.reps) > 0) ? String(s.reps) : '',
      })));
      userEditedFieldsRef.current = {};
      liveInputsRef.current = {};
      return;
    }

    // Determine target working weight: check liveInputsRef / setInputs first!
    let targetW = 40;
    const firstWorkingIdx = exercise.setsLog.findIndex(s => !s.isWarmup);
    const liveFirstWorkingWeight = firstWorkingIdx >= 0 ? (liveInputsRef.current[firstWorkingIdx]?.weight || setInputs[firstWorkingIdx]?.weight) : undefined;
    const parsedLiveWeight = liveFirstWorkingWeight ? parseFloat(liveFirstWorkingWeight) : null;

    const firstWorking = exercise.setsLog.find(s => !s.isWarmup && s.weight != null && Number(s.weight) > 0);
    if (parsedLiveWeight && parsedLiveWeight > 0) {
      targetW = parsedLiveWeight;
    } else if (firstWorking?.weight) {
      targetW = Number(firstWorking.weight);
    } else if (overloadSuggestion?.recommended) {
      targetW = Number(overloadSuggestion.recommended);
    } else if (exercise.lastSessionSets?.[0]?.weight) {
      targetW = Number(exercise.lastSessionSets[0].weight);
    }

    const updatedSets = insertWarmupLadder(exercise.setsLog, targetW);
    const newEx = {
      ...exercise,
      setsLog: updatedSets,
    };

    updateExercise(realExerciseIndex, newEx);
    setSetInputs(updatedSets.map(s => ({
      weight: (s.weight !== null && s.weight !== undefined && Number(s.weight) > 0) ? String(s.weight) : '',
      reps: (s.reps !== null && s.reps !== undefined && Number(s.reps) > 0) ? String(s.reps) : '',
    })));
    userEditedFieldsRef.current = {};
    liveInputsRef.current = {};
  }, [exercise, overloadSuggestion, lastTimeData, realExerciseIndex, updateExercise, setInputs]);

  const handleAddSet = useCallback(() => {
    if (!exercise) return;
    hapticLight();
    const lastIdx = exercise.setsLog.length - 1;
    const lastSet = exercise.setsLog[lastIdx];
    const liveW = liveInputsRef.current[lastIdx]?.weight ?? setInputs[lastIdx]?.weight;
    const liveR = liveInputsRef.current[lastIdx]?.reps ?? setInputs[lastIdx]?.reps;

    const weightVal = (liveW !== undefined && liveW !== '') ? parseFloat(liveW) : (lastSet?.weight ?? null);
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
        weight: weightVal != null ? String(weightVal) : '',
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
      setIdx
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
          ? { weight: resolved.weight !== null ? String(resolved.weight) : '', reps: String(resolved.reps) }
          : inp
      )
    );

    // Live Intra-Workout Recalculation (adapting remaining unlogged sets to performance on set k)
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
      pastGymLogs,
      undefined,
      completedSetsToday
    );
    if (liveSuggestion) {
      setOverloadSuggestion(liveSuggestion);
    }

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

      if (!log?.workoutStartTime) {
        startWorkout();
      }
      logSetAndStartTimer(curRealIdx, newEx, restSecs, exercise.name);

      if (resolved.weight && resolved.reps && resolved.weight > 0 && resolved.reps > 0) {
        InteractionManager.runAfterInteractions(() => {
          const { currentExerciseBaselinePR: baselinePR } = stateRef.current;
          const w = resolved.weight!;
          const r = resolved.reps!;
          const est1RM = Math.round(w * (1 + r / 30) * 10) / 10;
          const isPR = baselinePR && (w > baselinePR.maxWeight || est1RM > baselinePR.max1RM);

          if (isPR) {
            hapticSuccess();
            if (prToastTimerRef.current) clearTimeout(prToastTimerRef.current);
            setPrToast({
              message: `${exercise.name}: ${w} kg × ${r} (Est. 1RM: ${est1RM} kg)`,
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
        supersetJumpTimerRef.current = setTimeout(() => setActiveExIndex(nextJumpIdx), 400);
      }
    } else {
      hapticLight();
      updateExercise(curRealIdx, newEx);
    }
  }, [logSetAndStartTimer, updateExercise]);

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
    const { exercise, resolvedLastSessionSets: pastSets } = stateRef.current;
    const prevSessionSet = pastSets?.[idx] || exercise?.lastSessionSets?.[idx];
    if (prevSessionSet) {
      if (prevSessionSet.weight != null) handleTextChange(idx, 'weight', String(prevSessionSet.weight));
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
  const handleSetAction = useCallback((idx: number, action: 'textChange' | 'blur' | 'toggle' | 'delete' | 'swipe' | 'cycleType' | 'copyPrev' | 'focusField', payload?: any) => {
    switch (action) {
      case 'textChange': handleTextChange(idx, payload.field, payload.text); break;
      case 'blur':       handleBlur(idx); break;
      case 'toggle':     handleToggleSetComplete(idx); break;
      case 'delete':     handleDeleteSet(idx); break;
      case 'swipe':      handleToggleSetComplete(idx); break;
      case 'cycleType':  handleCycleSetType(idx); break;
      case 'copyPrev':   handleCopyPrev(idx, payload); break;
      case 'focusField': {
        const curSet = stateRef.current.exercise?.setsLog?.[idx];
        if (curSet?.completed) return;
        setActiveKeypad({ setIndex: idx, field: payload });
        break;
      }
    }
  }, [handleTextChange, handleBlur, handleToggleSetComplete, handleDeleteSet, handleCycleSetType, handleCopyPrev]);

  // Keypad Handlers (Hevy / Lyfta typing area)
  const handleKeypadPress = useCallback((key: string) => {
    if (!activeKeypad) return;
    const { setIndex, field } = activeKeypad;

    const curVal = liveInputsRef.current[setIndex]?.[field] ?? stateRef.current.setInputs[setIndex]?.[field] ?? '';
    if (key === '.') {
      if (curVal.includes('.')) return;
      if (field === 'reps') return; // Reps are whole numbers
      const nextVal = curVal === '' || curVal === '0' ? '0.' : curVal + '.';
      handleTextChange(setIndex, field, nextVal);
      return;
    }
    if (curVal.length >= 6) return;
    const nextVal = curVal === '0' ? key : curVal + key;
    handleTextChange(setIndex, field, nextVal);
  }, [activeKeypad, handleTextChange]);

  const handleKeypadBackspace = useCallback(() => {
    if (!activeKeypad) return;
    const { setIndex, field } = activeKeypad;

    const curVal = liveInputsRef.current[setIndex]?.[field] ?? stateRef.current.setInputs[setIndex]?.[field] ?? '';
    if (!curVal) return;
    const nextVal = curVal.slice(0, -1);
    handleTextChange(setIndex, field, nextVal);
  }, [activeKeypad, handleTextChange]);

  const handleKeypadClear = useCallback(() => {
    if (!activeKeypad) return;
    const { setIndex, field } = activeKeypad;
    handleTextChange(setIndex, field, '');
  }, [activeKeypad, handleTextChange]);

  const handleKeypadStepAdjust = useCallback((delta: number) => {
    if (!activeKeypad) return;
    const { setIndex, field } = activeKeypad;
    const { exercise, setInputs: curInputs, overloadSuggestion: curOverload } = stateRef.current;
    if (!exercise) return;
    hapticSelection();

    const curSet = exercise.setsLog[setIndex];
    const curInput = curInputs[setIndex];
    const prevSet = setIndex > 0 ? exercise.setsLog[setIndex - 1] : null;

    if (field === 'weight') {
      let baseWeight = 0;
      if (curInput?.weight !== '' && curInput?.weight !== undefined) {
        baseWeight = parseFloat(curInput.weight) || 0;
      } else if (curSet?.weight != null && Number(curSet.weight) > 0) {
        baseWeight = Number(curSet.weight);
      } else if (prevSet?.weight != null && Number(prevSet.weight) > 0) {
        baseWeight = Number(prevSet.weight);
      } else if (curOverload?.recommended) {
        baseWeight = Number(curOverload.recommended);
      }
      const newWeight = Math.min(1000, Math.max(0, Math.round((baseWeight + delta) * 10) / 10));
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
      const newReps = Math.min(50, Math.max(1, baseReps + delta));
      handleTextChange(setIndex, 'reps', String(newReps));
    }
  }, [activeKeypad, handleTextChange]);

  const handleKeypadNextOrComplete = useCallback(() => {
    if (!activeKeypad) return;
    const { setIndex, field } = activeKeypad;
    const curEx = stateRef.current.exercise;
    if (!curEx) return;

    if (field === 'weight') {
      // Instantly switch to reps of the current set
      hapticSelection();
      setActiveKeypad({ setIndex, field: 'reps' });
    } else {
      // Currently on reps: complete this set, and advance to next uncompleted set weight
      hapticSuccess();
      handleToggleSetComplete(setIndex);

      const sets = curEx.setsLog || [];
      // Look for the next uncompleted set after current setIndex
      let nextUnloggedIdx = -1;
      for (let i = setIndex + 1; i < sets.length; i++) {
        if (!sets[i].completed) {
          nextUnloggedIdx = i;
          break;
        }
      }
      // If none found after setIndex, check any earlier uncompleted set
      if (nextUnloggedIdx === -1) {
        for (let i = 0; i < sets.length; i++) {
          if (i !== setIndex && !sets[i].completed) {
            nextUnloggedIdx = i;
            break;
          }
        }
      }

      if (nextUnloggedIdx !== -1) {
        setActiveKeypad({ setIndex: nextUnloggedIdx, field: 'weight' });
      } else {
        // All sets completed!
        setActiveKeypad(null);
      }
    }
  }, [activeKeypad, handleToggleSetComplete]);

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
    setSwapModalEverShown(true);
    setShowSwapModal(true);
  }, []);

  const handleSupersetPress = useCallback(() => {
    hapticMedium();
    setSupersetPickerEverShown(true);
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
      if (supersetJumpTimerRef.current) clearTimeout(supersetJumpTimerRef.current);
      setActiveExIndex(partnerIdx);
    }
  }, [partnerExercise, activeExercises]);

  const handleTimerAdd = useCallback(() => {
    setRestTimerDuration(restTimerInitialRef.current + 30);
  }, [setRestTimerDuration]);

  const handleTimerSubtract = useCallback(() => {
    setRestTimerDuration(Math.max(10, restTimerInitialRef.current - 30));
  }, [setRestTimerDuration]);

  const handleTimerSkip = useCallback(() => {
    clearRestTimer();
  }, [clearRestTimer]);

  // Loading skeleton
  if (!log || !log.exercises) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ width: 120, height: 14, borderRadius: 7, backgroundColor: '#2C2C2E' }} />
          <View style={{ width: 32 }} />
        </View>
        <View style={{ alignItems: 'center', marginTop: 32, gap: 12 }}>
          <View style={{ width: 80, height: 24, borderRadius: 12, backgroundColor: '#2C2C2E' }} />
          <View style={{ width: 200, height: 28, borderRadius: 8, backgroundColor: '#2C2C2E' }} />
          <View style={{ width: 150, height: 14, borderRadius: 7, backgroundColor: '#1C1C1E' }} />
        </View>
        <View style={{ paddingHorizontal: SPACE.xl, marginTop: 32, gap: 8 }}>
          {[1, 2, 3].map(i => (
            <View key={i} style={[styles.setRow, { opacity: 1 - i * 0.2 }]}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#2C2C2E' }} />
              <View style={{ flex: 1, height: 36, borderRadius: 6, backgroundColor: '#2C2C2E', marginHorizontal: 8 }} />
              <View style={{ flex: 1, height: 36, borderRadius: 6, backgroundColor: '#2C2C2E', marginHorizontal: 8 }} />
              <View style={{ width: 32 }} />
            </View>
          ))}
        </View>
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <ActivityIndicator size="small" color={colors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!exercise) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="chevron-down" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Active Workout</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: colors.textMuted }}>No exercises found for this session.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />

      {/* ── Mid-Workout PR Celebration Toast ── */}
      {prToast && (
        <View style={[styles.prToastContainer, { top: Math.max(insets.top, 24) + 12 }]}>
          <Ionicons name="trophy" size={26} color="#FFD700" />
          <View style={{ flex: 1, paddingRight: 4 }}>
            <Text style={styles.prToastTitle}>New Personal Record!</Text>
            <Text style={styles.prToastSubtitle}>{prToast.message}</Text>
          </View>
          <TouchableOpacity
            onPress={handleDismissPrToast}
            style={styles.prToastCloseBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color="rgba(255, 255, 255, 0.7)" />
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Apple iOS HIG Header: Back Button + Live WorkoutTimer + Deep Dive Stats */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-down" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#30D158' }} />
              {log?.workoutStartTime ? (
                <WorkoutTimer startTime={log.workoutStartTime} />
              ) : (
                <Text style={styles.headerTitle}>Active Session</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              hapticSelection();
              setDeepDiveVisible(true);
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="stats-chart-outline" size={20} color={isDark ? 'rgba(255,255,255,0.85)' : colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* 1-Tap Horizontal Exercise Switcher Carousel Strip (Jump in 0ms) */}
        <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', paddingBottom: 6 }}>
          <ScrollView
            ref={carouselScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {exercises.map((ex, idx) => {
              const isCurrent = idx === activeExIndex;
              const isExDone = ex.setsLog?.length > 0 && ex.setsLog.every((s: any) => s.completed);
              return (
                <TouchableOpacity
                  key={ex.exerciseId || ex.name || idx}
                  onLayout={(e) => {
                    const { x, width } = e.nativeEvent.layout;
                    pillLayoutsRef.current[idx] = { x, width };
                    if (idx === activeExIndex) {
                      scrollToActivePill(idx);
                    }
                  }}
                  onPress={() => {
                    hapticSelection();
                    setActiveExIndex(idx);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: isCurrent
                      ? '#FFFFFF'
                      : isExDone
                      ? 'rgba(48, 209, 88, 0.12)'
                      : (isDark ? 'rgba(255,255,255,0.05)' : '#E5E5EA'),
                    borderWidth: 1,
                    borderColor: isCurrent
                      ? '#FFFFFF'
                      : isExDone
                      ? 'rgba(48, 209, 88, 0.25)'
                      : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    fontFamily: FONT_FAMILY.bold,
                    fontSize: 12,
                    color: isCurrent
                      ? '#000000'
                      : isExDone
                      ? '#30D158'
                      : (isDark ? '#8E8E93' : '#636366'),
                  }}>
                    {ex.name.split(' ')[0]}
                  </Text>
                  {isExDone && (
                    <Ionicons
                      name="checkmark-circle"
                      size={13}
                      color={isCurrent ? '#000000' : '#30D158'}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Scrollable Content */}
        <View style={styles.content}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >

            {/* Exercise Header Component */}
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
              onSwapPress={handleSwapPress}
              onSupersetPress={handleSupersetPress}
              onVideoToggle={handleVideoToggle}
              onSwitchToPartner={handleSwitchToPartner}
              onNoteChange={handleNoteChange}
              onOpenPlateCalculator={handleOpenPlateCalculator}
            />

            {/* Form Video Player Component */}
            {showVideo && (
              <ActiveExerciseVideo
                exercise={exercise}
                appState={appState}
                isRefreshingVideo={isRefreshingVideo}
                colors={colors}
                styles={styles}
                onRefreshVideo={handleRefreshVideo}
                onCloseVideo={() => setShowVideo(false)}
                onError={async (err: any) => {
                  console.warn('[YoutubeIframe Error] Video unavailable:', exercise.name, exercise.videoId, err);
                  const retries = videoRetryCountMapRef.current[exercise.name] || 0;
                  if (retries >= 1) {
                    updateExercise(realExerciseIndex, { ...exercise, videoId: '' });
                    setShowVideo(false);
                    return;
                  }
                  videoRetryCountMapRef.current[exercise.name] = retries + 1;
                  const freshId = await autoResolveExerciseVideoId(exercise.name, true);
                  if (freshId && freshId !== exercise.videoId) {
                    updateExercise(realExerciseIndex, { ...exercise, videoId: freshId });
                  } else {
                    updateExercise(realExerciseIndex, { ...exercise, videoId: '' });
                    setShowVideo(false);
                  }
                }}
              />
            )}

            {/* Set Rows with Warmup / Working Phase Dividers (Memoized) */}
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
              onToggleShowWarmups={() => setShowCompletedWarmups(prev => !prev)}
              onSetAction={handleSetAction}
              activeKeypadField={activeKeypad}
              isFieldSelected={isFieldSelected}
              onAddSet={handleAddSet}
            />

          </ScrollView>
        </View>


        {/* ── FIX 4: Lazy-mount Superset Modal — only inserted into the tree on first open.
             Before first open: zero JS evaluation, zero layout cost, zero PanResponder init. */}
        {supersetPickerEverShown && (
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

        {/* ── FIX 4: Lazy-mount Swap Modal — same pattern. Zero mount cost until user first taps Swap. */}
        {swapModalEverShown && (
          <ActiveSwapModal
            visible={showSwapModal}
            exercise={exercise}
            aiSwapList={aiSwapList}
            isAiSwapLoading={isAiSwapLoading}
            colors={colors}
            styles={styles}
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
                weight: s.weight != null ? String(s.weight) : '',
                reps: s.reps != null ? String(s.reps) : '',
              })));
              userEditedFieldsRef.current = {};
              liveInputsRef.current = {};

              setShowSwapModal(false);
              Alert.alert(
                'Keep Swap Permanent?',
                `Do you want to use ${alt.name} for future workouts?`,
                [
                  { text: 'No, just for today', style: 'cancel' },
                  {
                    text: 'Yes, update plan',
                    onPress: () => makeSwapPermanent(
                      oldName,
                      alt.name,
                      resolvedVideoId || alt.videoId,
                      alt.muscle || exercise.muscle,
                      alt.targetSets,
                      alt.targetReps,
                      alt.restTimeSecs
                    )
                  }
                ]
              );
            }}
          />
        )}

      </KeyboardAvoidingView>

      {/* ── ZONE 2: FIXED BOTTOM ACTION DOCK (Morphs between Mode 1 and Mode 2) ── */}
      {isKeypadOpen ? (
        <WorkoutKeypad
          visible={true}
          field={activeKeypad?.field ?? 'weight'}
          currentWeight={
            activeKeypad
              ? (setInputs[activeKeypad.setIndex]?.weight ?? '')
              : ''
          }
          currentReps={
            activeKeypad
              ? (setInputs[activeKeypad.setIndex]?.reps ?? '')
              : ''
          }
          setNumber={activeKeypad ? (exercise?.setsLog?.[activeKeypad.setIndex]?.setNumber || activeKeypad.setIndex + 1) : 1}
          stepSize={
            activeKeypad?.field === 'weight'
              ? 2.5
              : 1
          }
          selectedRir={
            activeKeypad
              ? (exercise?.setsLog?.[activeKeypad.setIndex]?.rir ?? 1)
              : 1
          }
          onKeyPress={handleKeypadPress}
          onBackspace={handleKeypadBackspace}
          onClear={handleKeypadClear}
          onStepAdjust={handleKeypadStepAdjust}
          onSelectField={(f) => {
            if (activeKeypad && !exercise?.setsLog?.[activeKeypad.setIndex]?.completed) {
              setActiveKeypad({ setIndex: activeKeypad.setIndex, field: f });
            }
          }}
          onSelectRir={handleSetRIR}
          onNextOrComplete={handleKeypadNextOrComplete}
          onDismiss={() => setActiveKeypad(null)}
        />
      ) : (
        <StickyLoggingDock
          activeSetNumber={dockActiveSetIdx !== -1 ? (dockActiveSet?.setNumber || dockActiveSetIdx + 1) : (exercise?.setsLog?.length || 1)}
          activeWeight={dockActiveWeight}
          activeReps={dockActiveReps}
          selectedRir={dockSelectedRir}
          isAllComplete={isAllComplete}
          isLastExercise={activeExIndex === exercises.length - 1}
          onSelectRir={handleSetRIR}
          onQuickAdjustRep={handleAdjustReps}
          onLogSetAndRest={isAllComplete ? handleNextExercise : handleLogSet}
        />
      )}

      {/* Sticky Rest Timer Overlay (Rendered outside KeyboardAvoidingView so it never jumps with keyboard) */}
      {(restTimerStartTime && restTimerDurationSecs) ? (
        <View
          style={{
            position: 'absolute',
            bottom: timerBottomOffset,
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 9999,
          }}
          pointerEvents="box-none"
        >
          <AnimatedRestTimer
            startTime={restTimerStartTime}
            durationSecs={restTimerDurationSecs}
            onAdd={handleTimerAdd}
            onSubtract={handleTimerSubtract}
            onSkip={handleTimerSkip}
          />
        </View>
      ) : null}

      {/* Deep-Dive Inspector Modal */}
      {deepDiveVisible && exercise && (
        <ExerciseDeepDiveModal
          visible={deepDiveVisible}
          exerciseName={exercise.name}
          exercise={exercise}
          overloadSuggestion={overloadSuggestion}
          gymLogs={gymLogs || []}
          onClose={() => setDeepDiveVisible(false)}
        />
      )}

      {/* Barbell Plate Calculator Modal */}
      {showPlateModal && (
        <PlateCalculatorModal
          visible={showPlateModal}
          initialWeight={(() => {
            const curSet = exercise?.setsLog?.[activeSetIndex] || exercise?.setsLog?.[0];
            const inputWeight = setInputs?.[activeSetIndex]?.weight;
            return Number(inputWeight) || Number(curSet?.weight) || 60;
          })()}
          onClose={() => setShowPlateModal(false)}
          onApplyWeight={(w) => {
            if (activeSetIndex != null && activeSetIndex >= 0) {
              handleTextChange(activeSetIndex, 'weight', String(w));
            }
          }}
        />
      )}

      {/* ── High-Contrast Screen Flash Rest Alert Overlay (pointerEvents none) ── */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: '#30D158',
            opacity: flashAnim,
            zIndex: 999999,
          },
        ]}
      />
    </SafeAreaView>
  );
}
