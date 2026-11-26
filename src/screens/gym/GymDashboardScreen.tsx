import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AppState, View, Text, Pressable, Platform, StyleSheet, DeviceEventEmitter, InteractionManager, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import {
  AlertTriangle,
  ChevronRight,
  Play,
  X,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';

import {
  FONT_FAMILY,
  ICON,
  RADIUS,
  SPACE,
  TOUCH,
} from '../../theme/tokens';
import { useResponsiveMetrics } from '../../theme/responsive';
import { useTheme } from '../../contexts/ThemeContext';
import {
  ScreenWrapper,
  TactileButton,
  NumericText,
  resolveScreenTopInset,
} from '../../components/ui';
import BottomSheet from '../../components/ui/BottomSheet';
import { AnimatedProgressBar } from '../../components/ui/AnimatedProgressBar';
import { useScreenReplayTrigger } from '../../hooks/useScreenReplayTrigger';
import { useLatestNonNull } from '../../hooks/useLatestNonNull';
import { useCoreData } from '../../contexts/domains/CoreDataContext';
import { useGymLogs, useGymPlan, useBodyMetrics, useActiveWorkoutState } from '../../contexts/domains/WellnessContext';
import { useGymLog, todayStr } from '../../hooks/useGymLog';
import { useGymProfile } from '../../hooks/useGymProfile';
import { parseLocalDate } from '../../utils/dateCore';
import { getRotationNextDayIndex } from '../../services/gymRotationService';
import {
  buildExerciseHistoryIndex,
  calculateGymStreak,
  normalizeExerciseKey,
  resolveExerciseTargetMuscle,
} from '../../utils/gymUtils';
import { planDayIndexForDate, resolvePlanDay, getCustomPlanDay } from '../../data/gymPlan';
import {
  calculateMuscleFatigue,
  MUSCLES,
  MuscleSlug,
} from '../../services/muscleRecoveryService';
import { getAllPRs, PRRecord } from '../../utils/progressiveOverload';
import { formatWeight, useWeightUnit } from '../../utils/weightUnit';
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/haptics';

import { LazySheet } from '../../hooks/useLazySheetMount';
const MiniDualBodyMap = React.lazy(() => import('../../components/Gym/schedule/MiniDualBodyMap'));
const PRHallOfFameSheet = React.lazy(() => import('../../components/Gym/metrics/PRHallOfFameSheet'));
const BodyMetricsSheet = React.lazy(() => import('../../components/Gym/metrics/BodyMetricsSheet'));
const FullAthleteProfileModal = React.lazy(() =>
  import('../../components/Gym/profile/FullAthleteProfileModal').then(m => ({ default: m.FullAthleteProfileModal }))
);
const SetupAthleteStatsModal = React.lazy(() =>
  import('../../components/Gym/profile/SetupAthleteStatsModal').then(m => ({ default: m.SetupAthleteStatsModal }))
);
const ExerciseDeepDiveModal = React.lazy(() => import('../../components/Gym/exercise/ExerciseDeepDiveModal'));
import { afterSheetDismiss } from '../../utils/sheetCoordinator';
import { computeAthleteCardStats } from '../../services/athleteCardService';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { auth } from '../../services/firebase';
import { getL1Sync } from '../../utils/bootManifest';
import { makeDashboardStyles } from './dashboard/gymDashboardStyles';
import { SwapRoutineModal } from '../../components/Gym/schedule/SwapRoutineModal';
import WeeklySplitStrip, { WeekDaySlot } from './dashboard/TelemetryBarCard';
import OrbitalChronometerHero, { HeroLiftPreviewItem } from './dashboard/OrbitalChronometerHero';

const GENERIC_PROFILE_NAMES = new Set([
  'athlete',
  'user',
  'guest',
  'member',
  'lifter',
  'zenfit',
]);

// Anatomical Mapping from Target Muscle Groups to SVG Slugs
const GROUP_TO_SLUGS: Record<string, MuscleSlug[]> = {
  Chest: ['chest'],
  Back: ['upper-back', 'lower-back', 'trapezius'],
  Shoulders: ['deltoids'],
  Biceps: ['biceps'],
  Triceps: ['triceps'],
  Quads: ['quadriceps'],
  Hamstrings: ['hamstring'],
  Calves: ['calves'],
  Abs: ['abs', 'obliques'],
  Forearms: ['forearm'],
  Glutes: ['gluteal'],
  Traps: ['trapezius'],
  Lats: ['upper-back'],
  'Full Body': [...MUSCLES],
};

// Sports Science-Based Optimal Weekly Hypertrophy Volume Targets (Israetel / Schoenfeld)
const SCIENCE_VOLUME_TARGETS: Record<string, number> = {
  Chest: 14,
  Back: 16,
  Shoulders: 16,
  Delts: 16,
  Quads: 14,
  Hamstrings: 12,
  Glutes: 12,
  Biceps: 12,
  Triceps: 12,
  Calves: 10,
  Abs: 10,
  Core: 10,
  Forearms: 8,
};

const LiveSessionTimerText = React.memo(({ startTime, isRunning = true }: { startTime: any; isRunning?: boolean }) => {
  const [elapsed, setElapsed] = useState(() => {
    if (!startTime) return 0;
    return Math.max(0, Math.floor((Date.now() - Number(startTime)) / 1000));
  });

  useEffect(() => {
    if (!startTime) return;
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
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, [elapsed]);

  return <>{formatted}</>;
});

export const GymDashboardScreen: React.FC = React.memo(function GymDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const { isTablet, maxContentWidth, clampSheetListHeight } = useResponsiveMetrics();
  const styles = useMemo(() => makeDashboardStyles(tokens), [tokens]);
  const navigation = useNavigation<any>();
  const isScreenFocused = useIsFocused();
  const { user } = useCoreData();
  const { gymLogs, logsByDateMap } = useGymLogs();
  const { userGymPlan } = useGymPlan();
  const { gymProfile, saveGymProfile } = useGymProfile();
  const { weightLogs } = useBodyMetrics();
  const unitIsLbs = useWeightUnit();
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showBodyMetricsModal, setShowBodyMetricsModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [capsuleWidth, setCapsuleWidth] = useState(44);

  const [today, setToday] = useState(() => todayStr());
  useFocusEffect(
    useCallback(() => {
      const current = todayStr();
      setToday((prev) => (prev === current ? prev : current));
    }, [])
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const current = todayStr();
        setToday((prev) => (prev === current ? prev : current));
      }
    });
    return () => sub.remove();
  }, []);
  const selectedDate = today;

  const {
    log: activeLog,
    endWorkout,
    revertWorkout,
    swapDayRoutine,
    planDay: hookPlanDay,
  } = useGymLog(selectedDate, { skipHistoryIndex: false });

  // ─── Scroll Choreography ───────────────────────────────────────────────────
  const scrollRef = useRef<any>(null);
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const stickyGlassStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [12, 48], [0, 1], Extrapolation.CLAMP),
  }));

  const stickyTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [22, 54], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(scrollY.value, [22, 54], [8, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  const largeHeaderAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [6, 42], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(scrollY.value, [0, 48], [0, -10], Extrapolation.CLAMP),
      },
    ],
  }));

  // ─── Modal States ──────────────────────────────────────────────────────────
  const [showPRSheet, setShowPRSheet] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPreviewSheet, setShowPreviewSheet] = useState(false);
  const [deepDiveExercise, setDeepDiveExercise] = useState<string | null>(null);
  const [dashConfirm, setDashConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const activeDashConfirm = useLatestNonNull(dashConfirm);
  const { replayKey } = useScreenReplayTrigger();

  // ─── Real Google/Gmail Profile Photo & Official Athlete Stats ──────────────
  const userPhotoURL = useMemo(() => {
    return (
      user?.photoURL ||
      auth.currentUser?.photoURL ||
      auth.currentUser?.providerData?.[0]?.photoURL ||
      gymProfile?.photoURL ||
      null
    );
  }, [user?.photoURL, gymProfile?.photoURL]);

  const athleteStats = useMemo(() => {
    if (!showProfileModal) return null;
    const effectiveWeightKg =
      (weightLogs && weightLogs.length > 0 && Number(weightLogs[0].weightKg) > 0)
        ? Number(weightLogs[0].weightKg)
        : gymProfile?.weightKg || gymProfile?.bodyweightKg || 74;

    return computeAthleteCardStats(
      gymProfile,
      gymLogs || [],
      {
        uid: user?.uid || auth.currentUser?.uid,
        displayName: user?.displayName || auth.currentUser?.displayName || gymProfile?.displayName,
        photoURL: userPhotoURL,
        email: user?.email || auth.currentUser?.email,
      },
      effectiveWeightKg,
      userGymPlan
    );
  }, [showProfileModal, gymProfile, gymLogs, user, userPhotoURL, weightLogs, userGymPlan]);

  // ─── Active Workout Live Elapsed Timer & Completion Status ─────────────────
  const [liveLog, setLiveLog] = useState<any>(null);

  const todayLogInList = useMemo(() => {
    return logsByDateMap?.get(selectedDate) ?? (gymLogs || []).find((l: any) => l.date === selectedDate);
  }, [logsByDateMap, gymLogs, selectedDate]);

  const effectiveLog = useMemo(() => {
    if (liveLog && liveLog.date === selectedDate) return liveLog;
    if (todayLogInList) return todayLogInList;
    return activeLog;
  }, [liveLog, todayLogInList, activeLog, selectedDate]);

  const hasCompletedWork = useMemo(() => {
    const targetLog = effectiveLog || activeLog || todayLogInList;
    if (!targetLog) return false;
    const hasSets = Boolean(
      targetLog.exercises &&
      targetLog.exercises.some((ex: any) =>
        ex.setsLog && ex.setsLog.some((s: any) => Boolean(s.completed))
      )
    );
    const hasCardio = Boolean(
      targetLog.cardio &&
      targetLog.cardio.some((c: any) => Boolean(c.completed))
    );
    return hasSets || hasCardio;
  }, [effectiveLog, activeLog, todayLogInList]);

  const globalActiveWorkout = useActiveWorkoutState();
  const isGlobalActiveForDate = Boolean(
    globalActiveWorkout.active &&
    (!globalActiveWorkout.date || globalActiveWorkout.date === selectedDate)
  );
  const isCompleted = Boolean(
    !effectiveLog?.workoutStartTime &&
    (effectiveLog?.completed ?? todayLogInList?.completed ?? activeLog?.completed)
  );
  const isInProgress = Boolean(
    (isGlobalActiveForDate || effectiveLog?.workoutStartTime || activeLog?.workoutStartTime || todayLogInList?.workoutStartTime) && !isCompleted
  );

  const activeStartMs = (isGlobalActiveForDate ? globalActiveWorkout.startTime : null) || effectiveLog?.workoutStartTime || activeLog?.workoutStartTime || todayLogInList?.workoutStartTime;

  // Sync state on external mutations / completion / revert (zero redundant cloud round-trips)
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('gym_log_local_mutation', (event: any) => {
      if (event?.date && event.date === selectedDate && event.log) {
        setLiveLog(event.log);
      }
    });
    const sub2 = DeviceEventEmitter.addListener('gym_workout_completed', (event: any) => {
      if (event?.date && event.date === selectedDate && event.log) {
        setLiveLog(event.log);
      }
    });
    return () => {
      sub.remove();
      sub2.remove();
    };
  }, [selectedDate]);

  // ─── Quick Finish Workout from Hero Chronometer ──────────────────────────
  const handleQuickFinishWorkout = useCallback(() => {
    hapticMedium();
    setDashConfirm({
      title: 'Finish Active Workout?',
      message: 'Save all logged sets and mark today’s session complete.',
      confirmLabel: 'Finish Session',
      onConfirm: async () => {
        hapticSuccess();
        await endWorkout(true);
      },
    });
  }, [endWorkout]);

  // Handle in-screen revert workout
  const handleRevertWorkout = useCallback(() => {
    setDashConfirm({
      title: 'Revert Workout Session?',
      message: "This will mark today's workout as not completed so you can start or log it again.",
      confirmLabel: 'Revert Session',
      destructive: true,
      onConfirm: async () => {
        hapticLight();
        revertWorkout();
      },
    });
  }, [revertWorkout]);

  // ─── All-Time PRs & Latest PR (Fingerprinted — zero repeat work on tab focus) ─
  const [latestPR, setLatestPR] = useState<{
    exerciseName: string;
    heaviestWeight?: number;
    bestReps?: number;
    best1RM?: number;
    achievedAt?: string;
  } | null>(null);
  const lastPRLogsRef = useRef<any>(null);

  const fetchPRs = useCallback(async () => {
    try {
      const prs: PRRecord = await getAllPRs(gymLogs);
      const entries = Object.entries(prs)
        .map(([name, data]) => ({ exerciseName: data.exerciseName || name, ...data }))
        .filter((e) => (e.heaviestWeight && e.heaviestWeight > 0) || (e.bestReps && e.bestReps > 0));

      if (entries.length > 0) {
        entries.sort((a, b) => (b.achievedAt || '').localeCompare(a.achievedAt || ''));
        const top = entries[0];
        setLatestPR((prev) =>
          prev &&
          prev.exerciseName === top.exerciseName &&
          prev.heaviestWeight === top.heaviestWeight &&
          prev.bestReps === top.bestReps &&
          prev.achievedAt === top.achievedAt
            ? prev
            : top
        );
      } else {
        setLatestPR((prev) => (prev === null ? prev : null));
      }
    } catch {
      setLatestPR(null);
    }
  }, [gymLogs]);

  // Recompute PRs ONLY when gymLogs reference actually changes while focused
  useEffect(() => {
    if (!isScreenFocused) return;
    if (lastPRLogsRef.current === gymLogs && latestPR !== null) return;
    lastPRLogsRef.current = gymLogs;
    const handle = InteractionManager.runAfterInteractions(() => {
      fetchPRs();
    });
    return () => handle.cancel();
  }, [isScreenFocused, gymLogs, fetchPRs, latestPR]);

  const focusDraftSyncRef = useRef({
    userUid: user?.uid,
    selectedDate,
    todayLogInList,
    logsByDateMap,
  });
  focusDraftSyncRef.current = {
    userUid: user?.uid,
    selectedDate,
    todayLogInList,
    logsByDateMap,
  };

  useFocusEffect(
    useCallback(() => {
      // Fast O(1) L1 draft hydration — zero Firestore reloads or heavy scans on Train -> Home switch
      try {
        const { userUid, selectedDate: dateKey, todayLogInList: todayLog, logsByDateMap: dateMap } = focusDraftSyncRef.current;
        const effectiveUid = userUid || auth.currentUser?.uid || 'local_user';
        const hotLog = getL1Sync<any>(`@zenfit_hot_log_${dateKey}`, null);
        const draft = hotLog ||
          getL1Sync<any>(`gym_active_draft_${effectiveUid}_${dateKey}`, null) ||
          getL1Sync<any>(`gym_active_draft_${dateKey}`, null);

        const hasLoggedSets = Boolean(
          (draft?.exercises || []).some((ex: any) =>
            (ex.setsLog || []).some((s: any) => s.completed)
          )
        );

        if (
          draft &&
          draft.date === dateKey &&
          !draft.completed &&
          hasLoggedSets &&
          (draft.updatedAt || 0) > (todayLog?.updatedAt || 0)
        ) {
          setLiveLog((prev: any) =>
            prev && prev.date === draft.date && prev.updatedAt === draft.updatedAt ? prev : draft
          );
        } else {
          const completedInList = dateMap?.get(dateKey);
          if (completedInList && completedInList.completed) {
            setLiveLog((prev: any) =>
              prev === completedInList ||
              (prev && prev.date === completedInList.date && prev.completed === completedInList.completed && prev.updatedAt === completedInList.updatedAt)
                ? prev
                : completedInList
            );
          }
        }
      } catch {}
    }, [])
  );

  // ─── Personalized Header Greeting & Biometric Eyebrow ──────────────────────
  const headerGreeting = useMemo(() => {
    const rawName = (
      user?.displayName ||
      auth.currentUser?.displayName ||
      gymProfile?.displayName ||
      ''
    ).trim();
    const firstName = rawName.split(/\s+/)[0] || '';
    const hasCustomName =
      firstName.length > 0 && !GENERIC_PROFILE_NAMES.has(firstName.toLowerCase());

    const hr = new Date().getHours();
    const timeGreeting =
      hr < 12 ? 'Good Morning' : hr < 17 ? 'Good Afternoon' : 'Good Evening';

    return hasCustomName ? `${timeGreeting}, ${firstName}` : timeGreeting;
  }, [user?.displayName, gymProfile?.displayName, today]);

  const headerDateShort = useMemo(() => {
    try {
      const [yyyy, mm, dd] = today.split('-');
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      const dayNames = [
        'SUNDAY',
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
      ];
      const monthNames = [
        'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
        'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
      ];
      return `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`;
    } catch {
      return today;
    }
  }, [today]);

  // ─── Active Plan Day for Today ─────────────────────────────────────────────
  const activePlanDay = useMemo(() => {
    if (hookPlanDay && (hookPlanDay.name || hookPlanDay.isRest)) {
      return hookPlanDay;
    }
    const planIdx = userGymPlan?.scheduleMode === 'rotation'
      ? getRotationNextDayIndex(userGymPlan, gymLogs || [], today)
      : planDayIndexForDate(today);
    return resolvePlanDay(userGymPlan, planIdx);
  }, [today, hookPlanDay, userGymPlan, gymLogs]);

  // ─── Streak & Weekly Sessions Interactive 7-Day Strip ───────────────────────
  const streakDays = useMemo(() => {
    return calculateGymStreak(gymLogs || [], userGymPlan);
  }, [gymLogs, userGymPlan]);

  const weeklyPlannedSessions = useMemo(() => {
    let count = 0;
    for (let i = 1; i <= 7; i++) {
      const customDay = getCustomPlanDay(userGymPlan?.customDays, i);
      const dayObj = customDay || resolvePlanDay(userGymPlan, i);
      const isRest = dayObj ? Boolean(dayObj.isRest) : i === 7;
      if (!isRest) count++;
    }
    return count > 0 ? count : 4;
  }, [userGymPlan]);

  const { sessionsThisWeek, weekSlots } = useMemo(() => {
    const now = parseLocalDate(today);
    const dayOfWeek = (now.getDay() + 6) % 7; // Monday = 0 ... Sunday = 6
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);

    const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const slots: WeekDaySlot[] = [];
    let sessions = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const isToday = dateStr === today;

      const dayLog = logsByDateMap?.get(dateStr) ||
        (effectiveLog && effectiveLog.date === dateStr ? effectiveLog : null);
      const isDone = Boolean(
        dayLog?.completed ||
        (dayLog?.exercises && dayLog.exercises.some((e: any) => e.setsLog?.some((s: any) => s.completed)))
      );
      if (isDone) sessions++;

      const planDayIdx = i + 1;
      const customDay = getCustomPlanDay(userGymPlan?.customDays, planDayIdx);
      const resolvedDay = isToday
        ? activePlanDay
        : (customDay || resolvePlanDay(userGymPlan, planDayIdx));
      const isRest = Boolean(resolvedDay ? resolvedDay.isRest : i === 6);
      const exList = !isRest && Array.isArray(resolvedDay?.exercises) ? resolvedDay!.exercises : [];
      const totalDaySets = exList.reduce(
        (acc: number, ex: any) => acc + (Number(ex.targetSets) || 3),
        0
      );

      slots.push({
        dateStr,
        letter: LETTERS[i],
        dayName: DAY_NAMES[i],
        isToday,
        isDone,
        isRest,
        workoutName: isRest ? 'Rest & Rebuild' : (resolvedDay?.name || 'Training Day'),
        exerciseCount: exList.length,
        totalSets: totalDaySets,
      });
    }

    return { sessionsThisWeek: sessions, weekSlots: slots };
  }, [logsByDateMap, effectiveLog, today, userGymPlan, activePlanDay]);

  const exerciseHistoryIndex = useMemo(
    () => buildExerciseHistoryIndex(gymLogs, selectedDate),
    [gymLogs, selectedDate]
  );

  const exercises = useMemo(() => {
    if (effectiveLog?.exercises && effectiveLog.exercises.length > 0) {
      return effectiveLog.exercises;
    }
    return activePlanDay?.exercises || [];
  }, [effectiveLog?.exercises, activePlanDay?.exercises]);

  const totalSets = useMemo(() => {
    return exercises.reduce(
      (acc: number, ex: any) =>
        acc + (Array.isArray(ex.setsLog) && ex.setsLog.length > 0 ? ex.setsLog.length : (Number(ex.targetSets) || 3)),
      0
    );
  }, [exercises]);

  // ─── Target Muscles for Today's Workout ───────────────────────────────────
  const todayTargetGroups = useMemo(() => {
    const list = new Set<string>();
    exercises.forEach((ex) => {
      const { canonicalGroup } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
      if (canonicalGroup && canonicalGroup !== 'Mixed' && canonicalGroup !== 'Other') {
        list.add(canonicalGroup);
      }
    });
    if (list.size === 0) {
      return ['Full Body'];
    }
    return Array.from(list);
  }, [exercises]);

  // ─── Clean Muscle Target Line (Volume & Time sit cleanly beside title) ───────
  const heroWorkoutSubtitle = useMemo(() => {
    if (!activePlanDay || activePlanDay.isRest) return 'Rest & Recovery';
    if (!exercises || exercises.length === 0) return 'No exercises scheduled';

    const title = (activePlanDay?.name || '').toLowerCase();
    const titleWords = title.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);

    const nonRedundantMuscles = todayTargetGroups.filter((group) => {
      const gLower = group.toLowerCase();
      return !titleWords.some((w) => gLower.includes(w) || w.includes(gLower));
    });

    if (nonRedundantMuscles.length > 0) {
      return nonRedundantMuscles.slice(0, 3).join(' · ');
    }
    if (todayTargetGroups.length > 0) {
      return todayTargetGroups.slice(0, 3).join(' · ');
    }
    return `${exercises.length} exercises`;
  }, [activePlanDay, exercises, todayTargetGroups]);

  // ─── Biomechanical Fatigue Engine & Today's Target Recovery ────────────────
  const fatigueData = useMemo(() => {
    try {
      return calculateMuscleFatigue(gymLogs || []);
    } catch {
      return {};
    }
  }, [gymLogs]);

  const todayMuscleItems = useMemo(() => {
    return todayTargetGroups.map((group) => {
      const slugs = GROUP_TO_SLUGS[group] || [];
      let sum = 0;
      slugs.forEach((s) => {
        const item = fatigueData[s];
        sum += item ? item.readinessPct : 100;
      });
      const avg = slugs.length > 0 ? Math.round(sum / slugs.length) : 100;
      return { group, slugs, readiness: avg };
    });
  }, [todayTargetGroups, fatigueData]);

  const allTodayTargetSlugs = useMemo(() => {
    const set = new Set<MuscleSlug>();
    todayMuscleItems.forEach((item) => {
      item.slugs.forEach((s) => set.add(s));
    });
    return set;
  }, [todayMuscleItems]);

  const todayTargetReadinessPct = useMemo(() => {
    if (todayMuscleItems.length === 0) return 96;
    const total = todayMuscleItems.reduce((acc, item) => acc + item.readiness, 0);
    return Math.round(total / todayMuscleItems.length);
  }, [todayMuscleItems]);

  const { customRecoveryColors, statusDescription } = useMemo(() => {
    const colorMap: Record<string, string> = {};

    MUSCLES.forEach((slug) => {
      if (allTodayTargetSlugs.has(slug)) {
        const item = fatigueData[slug];
        const readiness = item ? item.readinessPct : 100;
        if (readiness >= 85) {
          colorMap[slug] = tokens.status.success; // Optimal / Ready
        } else if (readiness >= 50) {
          colorMap[slug] = tokens.status.warning; // Restoring
        } else {
          colorMap[slug] = tokens.status.danger; // Fatigued
        }
      }
    });

    let desc = '';
    if (todayTargetReadinessPct >= 90) {
      desc = `Peak readiness (${todayTargetReadinessPct}%) — ideal window to push overload on compounds.`;
    } else if (todayTargetReadinessPct >= 75) {
      desc = `Solid readiness (${todayTargetReadinessPct}%) — drive crisp working sets with clean tempo.`;
    } else if (todayTargetReadinessPct >= 50) {
      desc = `Restoring (${todayTargetReadinessPct}%) — extend warmups and keep 1–2 reps in reserve.`;
    } else {
      desc = `High fatigue (${todayTargetReadinessPct}%) — focus on controlled form over max load today.`;
    }

    return { customRecoveryColors: colorMap, statusDescription: desc };
  }, [allTodayTargetSlugs, todayTargetReadinessPct, fatigueData, tokens]);

  // ─── Weekly Muscle Volume Targets (Science-Based & Program-Aware) ──────────
  const weeklyStimulusRows = useMemo(() => {
    const now = parseLocalDate(today);
    const dayOfWeek = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);
    const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

    // 1. Calculate user's programmed weekly sets per muscle across their 7-day schedule
    const planSetsMap: Record<string, number> = {};
    for (let day = 1; day <= 7; day++) {
      const customDay = userGymPlan?.customDays?.[day];
      const planDay = customDay || resolvePlanDay(userGymPlan, day);
      if (planDay && !planDay.isRest && Array.isArray(planDay.exercises)) {
        for (const ex of planDay.exercises) {
          const { canonicalGroup } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
          if (canonicalGroup) {
            planSetsMap[canonicalGroup] = (planSetsMap[canonicalGroup] || 0) + (Number(ex.targetSets) || 3);
          }
        }
      }
    }

    const targetList = todayTargetGroups.slice(0, 3);
    const targetSet = new Set(targetList);
    const doneByGroup: Record<string, number> = {};
    for (const log of gymLogs || []) {
      if (!log.date || log.date < mondayStr) continue;
      for (const ex of log.exercises || []) {
        const { canonicalGroup } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
        if (canonicalGroup && targetSet.has(canonicalGroup)) {
          let completedCount = 0;
          for (const s of ex.setsLog || []) {
            if (s.completed && !s.isWarmup && s.setType !== 'warmup') {
              completedCount++;
            }
          }
          if (completedCount > 0) {
            doneByGroup[canonicalGroup] = (doneByGroup[canonicalGroup] || 0) + completedCount;
          }
        }
      }
    }

    const result: Array<{ muscle: string; doneSets: number; targetSets: number }> = [];

    targetList.forEach((group) => {
      const done = doneByGroup[group] || 0;

      // Use user's scheduled plan sets if available, otherwise sports science hypertrophy targets
      const scienceTarget = SCIENCE_VOLUME_TARGETS[group] || 14;
      const targetSets = planSetsMap[group] && planSetsMap[group] > 0
        ? planSetsMap[group]
        : scienceTarget;

      result.push({
        muscle: group,
        doneSets: done,
        targetSets,
      });
    });

    return result.length > 0 ? result : [
      { muscle: 'Full Body', doneSets: sessionsThisWeek * 4, targetSets: 16 }
    ];
  }, [todayTargetGroups, gymLogs, sessionsThisWeek, userGymPlan, today]);

  // Unified Focus & Volume Rows (Zero duplicated muscle lists across sections)
  const unifiedFocusRows = useMemo(() => {
    const readinessMap = new Map(todayMuscleItems.map((m) => [m.group, m.readiness]));
    return weeklyStimulusRows.slice(0, 3).map((row) => ({
      muscle: row.muscle,
      readiness: readinessMap.get(row.muscle) ?? todayTargetReadinessPct,
      doneSets: row.doneSets,
      targetSets: row.targetSets,
    }));
  }, [weeklyStimulusRows, todayMuscleItems, todayTargetReadinessPct]);

  // Top-3 Hero Lifts with Last-Session Context (What to beat today)
  const topLiftPreviews: HeroLiftPreviewItem[] = useMemo(() => {
    return (exercises || []).slice(0, 3).map((ex: any) => {
      const hist = ex?.name ? exerciseHistoryIndex.get(normalizeExerciseKey(ex.name)) : null;
      return {
        name: ex?.name || 'Exercise',
        targetSets:
          Array.isArray(ex?.setsLog) && ex.setsLog.length > 0
            ? ex.setsLog.length
            : Number(ex?.targetSets) || 3,
        targetReps: ex?.targetReps ? String(ex.targetReps) : '8–12',
        lastWeightKg: hist?.lastWeight ?? null,
        lastAvgReps: hist?.avgReps ?? null,
      };
    });
  }, [exercises, exerciseHistoryIndex]);

  // Show coaching note ONLY when working muscles actually show fatigue (< 65%)
  const fatigueAlertMessage = useMemo(() => {
    const fatigued = todayMuscleItems.find((m) => m.readiness < 65);
    if (!fatigued) return null;
    return `${fatigued.group} at ${fatigued.readiness}% readiness — warm up extra or consider swapping today's split.`;
  }, [todayMuscleItems]);

  // Live Bodyweight Snapshot & Strength Milestone
  const bodyweightSnapshot = useMemo(() => {
    const sorted = Array.isArray(weightLogs) ? weightLogs : [];
    const latestKg =
      (sorted[0]?.weightKg ?? gymProfile?.weightKg ?? gymProfile?.bodyweightKg) || null;
    const prevKg = sorted.length > 1 ? (sorted[1]?.weightKg ?? null) : null;
    const deltaKg = latestKg && prevKg ? Number((latestKg - prevKg).toFixed(1)) : null;

    return {
      latestKg,
      displayValue: latestKg ? formatWeight(latestKg, unitIsLbs, 1) : 'Log weight',
      subLabel:
        deltaKg !== null && Math.abs(deltaKg) >= 0.1
          ? `${deltaKg > 0 ? '+' : ''}${formatWeight(deltaKg, unitIsLbs, 1)} vs last`
          : sorted[0]?.date === today
          ? 'Logged today'
          : 'Current weight',
    };
  }, [weightLogs, gymProfile?.weightKg, gymProfile?.bodyweightKg, unitIsLbs, today]);

  const strengthMilestone = useMemo(() => {
    if (latestPR) {
      const weightTxt =
        latestPR.heaviestWeight && latestPR.heaviestWeight > 0
          ? formatWeight(latestPR.heaviestWeight, unitIsLbs, 1)
          : '';
      const metric = weightTxt
        ? `${weightTxt}${latestPR.bestReps ? ` × ${latestPR.bestReps}` : ''}`
        : latestPR.bestReps
        ? `${latestPR.bestReps} reps`
        : 'Recorded';
      return {
        isPR: true,
        overline: 'BEST PR',
        title: latestPR.exerciseName,
        sub: metric,
      };
    }

    const baseKg = bodyweightSnapshot.latestKg || 75;
    const benchTargetDisplay = formatWeight(Math.round(baseKg), unitIsLbs, 0);
    return {
      isPR: false,
      overline: 'PR VAULT',
      title: `Bench ${benchTargetDisplay}`,
      sub: '1.0× BW goal',
    };
  }, [latestPR, bodyweightSnapshot.latestKg, unitIsLbs]);

  // Session receipt when completed
  const sessionReceipt = useMemo(() => {
    let tonnage = 0;
    let setsCount = 0;

    const targetLog = effectiveLog || activeLog || todayLogInList;
    for (const ex of targetLog?.exercises || []) {
      for (const s of ex.setsLog || []) {
        if (s.completed && s.weight && s.reps) {
          tonnage += Number(s.weight) * Number(s.reps);
          setsCount++;
        }
      }
    }

    const duration = targetLog?.workoutDurationMinutes || Math.round(setsCount * 2.5);
    const xp = 100 + setsCount * 15 + Math.min(300, Math.round(tonnage / 100));

    return {
      tonnage: Math.round(tonnage),
      duration,
      setsCount,
      xp,
    };
  }, [effectiveLog, activeLog, todayLogInList]);

  const isRestDay = Boolean(
    (!activePlanDay || activePlanDay.isRest || exercises.length === 0) &&
    (!effectiveLog?.exercises || effectiveLog.exercises.length === 0) &&
    !effectiveLog?.workoutStartTime &&
    !effectiveLog?.completed
  );
  const workoutTitle = activePlanDay?.name || 'Workout Day';

  const auraColor = isInProgress || isCompleted
    ? tokens.status.success
    : todayTargetReadinessPct >= 85
    ? tokens.accent.primary
    : tokens.status.warning;

  const eyebrowStatusColor = isInProgress || isCompleted
    ? tokens.status.success
    : todayTargetReadinessPct >= 85
    ? tokens.status.success
    : todayTargetReadinessPct >= 50
    ? tokens.status.warning
    : tokens.status.danger;

  const fallbackAvatarLetter =
    (
      user?.displayName ||
      auth.currentUser?.displayName ||
      gymProfile?.displayName ||
      'A'
    )
      .trim()
      .charAt(0)
      .toUpperCase() || 'A';

  const safeTop = resolveScreenTopInset(insets.top, true);

  return (
    <ScreenWrapper edges={['top']} compactTop topAura={auraColor} keyboardAvoiding={false} style={styles.root}>
      {/* ── SECTION 1: FLOATING LIQUID GLASS STICKY HEADER BAR ── */}
      <View style={[styles.stickyBarOuter, { top: safeTop }]} pointerEvents="box-none">
        <Animated.View
          pointerEvents="none"
          style={[styles.stickyBackdrop, { top: -safeTop }, stickyGlassStyle]}
        >
          {Platform.OS === 'ios' ? (
            <>
              <BlurView
                intensity={88}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFillObject}
              />
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(5, 5, 7, 0.72)', 'rgba(5, 5, 7, 0.88)']
                    : ['rgba(244, 244, 245, 0.82)', 'rgba(244, 244, 245, 0.94)']
                }
                style={StyleSheet.absoluteFillObject}
              />
            </>
          ) : (
            <View style={styles.stickySolidScrim} />
          )}
          <View style={styles.stickyBottomHairline} />
          <LinearGradient
            colors={
              isDark
                ? ['rgba(5, 5, 7, 0.92)', 'rgba(5, 5, 7, 0.0)']
                : ['rgba(244, 244, 245, 0.92)', 'rgba(244, 244, 245, 0.0)']
            }
            style={styles.stickyFeatherSkirt}
            pointerEvents="none"
          />
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[styles.stickyLeftSlot, stickyTitleStyle]}
        >
          <View style={styles.stickyTitleRow}>
            {isInProgress ? (
              <View
                style={[
                  styles.stickyTitleDot,
                  { backgroundColor: eyebrowStatusColor },
                ]}
              />
            ) : null}
            <NumericText style={styles.stickyTitleText} numberOfLines={1}>
              {isInProgress ? (
                <>
                  <LiveSessionTimerText startTime={activeStartMs} isRunning={isScreenFocused} /> · {workoutTitle}
                </>
              ) : isRestDay ? (
                'Rest & Rebuild'
              ) : (
                workoutTitle
              )}
            </NumericText>
          </View>
        </Animated.View>

        <View
          style={styles.headerCapsuleContainer}
          onLayout={(e) => {
            const w = Math.ceil(e.nativeEvent.layout.width);
            if (w > 0 && w !== capsuleWidth) {
              setCapsuleWidth(w);
            }
          }}
        >
          <TactileButton
            lightweight
            variant="custom"
            onPress={() => {
              hapticLight();
              navigation.navigate('Analytics', { tab: 'consistency' });
            }}
            style={[
              styles.headerCapsuleStreakGroup,
              streakDays > 0 && styles.headerCapsuleStreakActive,
            ]}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel={`${streakDays} day streak, view consistency`}
          >
            <Text style={styles.headerStreakFireEmoji}>🔥</Text>
            <NumericText
              style={[
                styles.headerCapsuleStreakText,
                streakDays === 0 && { color: tokens.text.secondary },
              ]}
            >
              {streakDays}
            </NumericText>
          </TactileButton>

          <TactileButton
            lightweight
            variant="custom"
            onPress={() => {
              hapticLight();
              setShowProfileModal(true);
            }}
            style={styles.headerAvatarCircle}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel="Athlete Profile and Preferences"
          >
            <UserAvatar
              size={28}
              uid={user?.uid || auth.currentUser?.uid}
              photoURL={userPhotoURL}
              fallbackLetter={fallbackAvatarLetter}
            />
          </TactileButton>
        </View>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && { maxWidth: maxContentWidth, width: '100%', alignSelf: 'center' as const },
          { paddingBottom: insets.bottom + (isInProgress || isGlobalActiveForDate ? 156 : 116) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── COLLAPSIBLE LARGE HERO HEADER ── */}
        <Animated.View style={[styles.largeHeaderBlock, largeHeaderAnimStyle]}>
          <View style={[styles.eyebrowRow, { paddingRight: capsuleWidth + 8 }]}>
            {isInProgress ? (
              <View
                style={[
                  styles.eyebrowStatusDot,
                  { backgroundColor: tokens.status.success },
                ]}
              />
            ) : null}
            <NumericText
              style={styles.eyebrowText}
              numberOfLines={1}
              maxFontSizeMultiplier={1.25}
            >
              {isInProgress
                ? `${headerDateShort} · WORKOUT ACTIVE`
                : isCompleted
                ? `${headerDateShort} · COMPLETE`
                : headerDateShort}
            </NumericText>
          </View>

          <Text
            style={[styles.headerGreeting, { paddingRight: capsuleWidth + 8 }]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.78}
            maxFontSizeMultiplier={1.25}
          >
            {headerGreeting}
          </Text>
        </Animated.View>

        {/* ── LAYER 1: INTERACTIVE WEEKLY SPLIT STRIP ── */}
        <WeeklySplitStrip
          weekSlots={weekSlots}
          sessionsThisWeek={sessionsThisWeek}
          weeklyPlannedSessions={weeklyPlannedSessions}
          onOpenPlan={() => navigation.navigate('Plan', { initialTab: 'schedule' })}
          tokens={tokens}
          styles={styles}
        />

        {/* ── LAYER 2: HERO SESSION COCKPIT ── */}
        <OrbitalChronometerHero
          isScreenFocused={isScreenFocused}
          isInProgress={isInProgress}
          isCompleted={isCompleted}
          isRestDay={isRestDay}
          activeStartMs={activeStartMs}
          workoutName={workoutTitle}
          exercises={exercises}
          topLiftPreviews={topLiftPreviews}
          totalSets={totalSets}
          heroWorkoutSubtitle={heroWorkoutSubtitle}
          effectiveLog={effectiveLog}
          sessionReceipt={sessionReceipt}
          onStartWorkout={() => {
            navigation.navigate('ActiveLogging', { date: selectedDate, autoStart: 'start' });
          }}
          onResumeWorkout={() => {
            navigation.navigate('ActiveLogging', { date: selectedDate, autoStart: 'resume' });
          }}
          onFinishWorkout={handleQuickFinishWorkout}
          onBrowseWorkouts={() => navigation.navigate('Today')}
          onOpenPreview={() => setShowPreviewSheet(true)}
          onSwapRoutine={() => setShowSwapModal(true)}
          onPressExercise={(exName) => setDeepDiveExercise(exName)}
          onViewSummary={() =>
            navigation.navigate('WorkoutSummary', {
              date: selectedDate,
              readOnly: true,
            })
          }
          onRevertWorkout={handleRevertWorkout}
          tokens={tokens}
          styles={styles}
        />

        {/* ── LAYER 3: TARGET MUSCLES & WEEKLY VOLUME ── */}
        <View style={styles.recoverySection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderLabel} numberOfLines={1}>TARGET MUSCLES</Text>
            <TactileButton
              variant="custom"
              hitSlop={TOUCH.hitSlop}
              style={{ flexShrink: 0 }}
              onPress={() => navigation.navigate('Body')}
            >
              <Text style={styles.sectionBadgeLink} numberOfLines={1}>Full Body Map ›</Text>
            </TactileButton>
          </View>

          <View style={styles.recoveryTopSplitRow}>
            <Pressable
              onPress={() => {
                hapticLight();
                navigation.navigate('Body');
              }}
              style={({ pressed }) => [
                styles.floatingMannequinStage,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Svg
                pointerEvents="none"
                width={108}
                height={120}
                viewBox="0 0 108 120"
                style={StyleSheet.absoluteFillObject}
              >
                <Defs>
                  <RadialGradient id="homeRecoveryGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                    <Stop
                      offset="0%"
                      stopColor={eyebrowStatusColor}
                      stopOpacity={isDark ? 0.22 : 0.14}
                    />
                    <Stop
                      offset="55%"
                      stopColor={eyebrowStatusColor}
                      stopOpacity={isDark ? 0.08 : 0.04}
                    />
                    <Stop offset="100%" stopColor={eyebrowStatusColor} stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Rect x="0" y="0" width="108" height="120" fill="url(#homeRecoveryGlow)" />
              </Svg>
              <React.Suspense fallback={<View style={{ width: 108, height: 116 }} />}>
                <MiniDualBodyMap
                  customMuscleColors={customRecoveryColors}
                  avatarHeight={116}
                  avatarWidth={48}
                  gap={10}
                  isDark={isDark}
                />
              </React.Suspense>
            </Pressable>

            <Pressable
              onPress={() => {
                hapticLight();
                navigation.navigate('Plan', { initialTab: 'schedule' });
              }}
              style={({ pressed }) => [
                styles.muscleBarsColumn,
                pressed && { opacity: 0.85 },
              ]}
            >
              {unifiedFocusRows.map((row, mIdx) => {
                const readinessColor =
                  row.readiness >= 85
                    ? tokens.status.success
                    : row.readiness >= 50
                    ? tokens.status.warning
                    : tokens.status.danger;
                const isGoalMet = row.doneSets >= row.targetSets;
                const setRatio = row.targetSets > 0 ? Math.min(1, row.doneSets / row.targetSets) : 0;
                return (
                  <View key={row.muscle} style={styles.muscleBarRow}>
                    <View style={styles.muscleBarHeader}>
                      <Text style={styles.muscleBarName} numberOfLines={1}>
                        {row.muscle}
                      </Text>
                      <View style={styles.unifiedMetricRight}>
                        <NumericText style={[styles.muscleBarPct, { color: readinessColor }]}>
                          {row.readiness}%
                        </NumericText>
                        <Text style={styles.unifiedDotSep}>·</Text>
                        <NumericText style={styles.unifiedSetText}>
                          {row.doneSets}/{row.targetSets} sets
                        </NumericText>
                      </View>
                    </View>
                    <AnimatedProgressBar
                      progress={row.doneSets > 0 ? setRatio : row.readiness / 100}
                      minVisualRatio={0.08}
                      height={4.5}
                      borderRadius={2.5}
                      delayMs={mIdx * 45}
                      durationMs={520}
                      replayKey={replayKey}
                      color={
                        row.doneSets > 0
                          ? isGoalMet
                            ? tokens.status.success
                            : tokens.accent.primary
                          : readinessColor
                      }
                      trackColor={
                        isDark ? 'rgba(255, 255, 255, 0.08)' : tokens.bg.elevated
                      }
                    />
                  </View>
                );
              })}
            </Pressable>
          </View>

          {fatigueAlertMessage ? (
            <View
              style={[
                styles.editorialDirectiveQuote,
                { borderLeftColor: tokens.status.warning },
              ]}
            >
              <View style={styles.readoutIconRow}>
                <AlertTriangle
                  size={12}
                  color={tokens.status.warning}
                  strokeWidth={ICON.strokeWidth}
                />
                <Text style={[styles.readoutCardTitle, { color: tokens.status.warning }]}>
                  RECOVERY ALERT
                </Text>
              </View>
              <Text style={styles.readoutText} numberOfLines={2}>
                {fatigueAlertMessage}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── LAYER 4: COMPACT BODYWEIGHT & PR VAULT TILES ── */}
        <View style={styles.paceSection}>
          <View style={styles.footerTilesRow}>
            <TactileButton
              variant="custom"
              haptic="light"
              onPress={() => setShowBodyMetricsModal(true)}
              style={styles.footerTile}
              accessibilityLabel="Update bodyweight"
            >
              <View
                style={[
                  styles.footerIconBox,
                  { backgroundColor: tokens.accent.primaryDim },
                ]}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Defs>
                    <SvgLinearGradient id="homeBwGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#5AC8FA" />
                      <Stop offset="100%" stopColor={tokens.accent.primary} />
                    </SvgLinearGradient>
                  </Defs>
                  <Rect x={3} y={3.5} width={18} height={17} rx={4.5} stroke="url(#homeBwGrad)" strokeWidth={1.9} />
                  <Path d="M7.5 12C7.5 9.5 9.5 7.5 12 7.5C14.5 7.5 16.5 9.5 16.5 12" stroke="url(#homeBwGrad)" strokeWidth={1.8} strokeLinecap="round" />
                  <Path d="M12 12L14.8 9.2" stroke={tokens.status.success} strokeWidth={2} strokeLinecap="round" />
                  <Circle cx={12} cy={12} r={1.4} fill={tokens.accent.primary} />
                </Svg>
              </View>
              <View style={styles.footerTextCol}>
                <Text style={styles.footerOverline} numberOfLines={1}>
                  WEIGHT
                </Text>
                <NumericText style={styles.footerValueText} numberOfLines={1}>
                  {bodyweightSnapshot.displayValue}
                </NumericText>
              </View>
              <ChevronRight size={14} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
            </TactileButton>

            <TactileButton
              variant="custom"
              haptic="light"
              onPress={() => setShowPRSheet(true)}
              style={styles.footerTile}
              accessibilityLabel="Open PR Vault"
            >
              <View
                style={[
                  styles.footerIconBox,
                  { backgroundColor: 'rgba(255, 159, 10, 0.14)' },
                ]}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Defs>
                    <SvgLinearGradient id="homePrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#FFD60A" />
                      <Stop offset="100%" stopColor="#FF9F0A" />
                    </SvgLinearGradient>
                  </Defs>
                  <Path
                    d="M7 4H17V10C17 12.8 14.8 15 12 15C9.2 15 7 12.8 7 10V4Z"
                    stroke="url(#homePrGrad)"
                    strokeWidth={1.9}
                    strokeLinejoin="round"
                  />
                  <Path d="M7 6H4.5C4.5 9 5.5 10.5 7 10.5M17 6H19.5C19.5 9 18.5 10.5 17 10.5" stroke="url(#homePrGrad)" strokeWidth={1.8} strokeLinecap="round" />
                  <Path d="M12 15V19.5M8.5 19.5H15.5" stroke="url(#homePrGrad)" strokeWidth={1.9} strokeLinecap="round" />
                </Svg>
              </View>
              <View style={styles.footerTextCol}>
                <Text style={styles.footerOverline} numberOfLines={1}>
                  {strengthMilestone.overline}
                </Text>
                <Text style={styles.footerValueText} numberOfLines={1}>
                  {strengthMilestone.title}
                </Text>
              </View>
              <ChevronRight size={14} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
            </TactileButton>
          </View>
        </View>
      </Animated.ScrollView>

      {/* ── TODAY'S SESSION PREVIEW SHEET ── */}
      <BottomSheet
        visible={showPreviewSheet}
        onClose={() => setShowPreviewSheet(false)}
        avoidKeyboard={false}
      >
        <View style={{ gap: 12 }}>
          <View style={styles.goalModalHeader}>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
              <Text style={styles.goalModalTitle} numberOfLines={1}>
                {workoutTitle} Lineup
              </Text>
              <NumericText style={styles.goalModalSubtitle} numberOfLines={1}>
                {heroWorkoutSubtitle}
              </NumericText>
            </View>
            <TactileButton
              variant="custom"
              onPress={() => setShowPreviewSheet(false)}
              style={styles.goalModalCloseBtn}
              hitSlop={TOUCH.hitSlop}
              accessibilityLabel="Close workout preview"
            >
              <X size={16} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
            </TactileButton>
          </View>

          <ScrollView
            style={{ maxHeight: clampSheetListHeight(0.46, 180, 380) }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {exercises.map((ex: any, idx: number) => (
              <View
                key={`${ex.id || ex.exerciseId || ex.name}-${idx}`}
                style={[
                  styles.previewListRow,
                  idx === exercises.length - 1 && {
                    borderBottomWidth: 0,
                  },
                ]}
              >
                <View style={styles.previewIdxBadge}>
                  <NumericText style={styles.previewIdxText}>{idx + 1}</NumericText>
                </View>
                <Text style={styles.previewExName} numberOfLines={1}>
                  {ex.name}
                </Text>
                <NumericText style={styles.previewExMeta} numberOfLines={1}>
                  {Array.isArray(ex.setsLog) && ex.setsLog.length > 0 ? ex.setsLog.length : (ex.targetSets || 3)} × {ex.targetReps || '8–12'}
                </NumericText>
              </View>
            ))}
          </ScrollView>

          <View style={styles.previewActionsRow}>
            <TactileButton
              variant="surface"
              size="md"
              onPress={() => {
                setShowPreviewSheet(false);
                afterSheetDismiss(() => navigation.navigate('Today'));
              }}
              style={{ flex: 1, borderRadius: RADIUS.md }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: tokens.font.bold,
                  color: tokens.text.primary,
                }}
                numberOfLines={1}
              >
                Edit in Train
              </Text>
            </TactileButton>

            <TactileButton
              variant="primary"
              haptic="success"
              size="md"
              onPress={() => {
                setShowPreviewSheet(false);
                navigation.navigate('ActiveLogging', { date: selectedDate, autoStart: 'start' });
              }}
              style={{ flex: 1.35, borderRadius: RADIUS.md }}
            >
              <Play
                size={14}
                color={tokens.accent.onPrimary}
                strokeWidth={ICON.strokeWidth}
              />
              <Text style={styles.primaryStartBtnText} numberOfLines={1}>Start Workout</Text>
            </TactileButton>
          </View>
        </View>
      </BottomSheet>

      {/* ── EMBEDDED MODALS ── */}
      {/* ── PR VAULT MODAL SHEET ── */}
      <LazySheet
        visible={showPRSheet}
        render={() => (
          <PRHallOfFameSheet
            visible={showPRSheet}
            onClose={() => setShowPRSheet(false)}
            gymLogs={gymLogs}
          />
        )}
      />

      {/* ── Official Athlete Dossier / Performance Card ── */}
      <LazySheet
        visible={showProfileModal}
        render={() => (
          <FullAthleteProfileModal
            visible={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            stats={athleteStats}
            onOpenSetup={() => {
              setShowProfileModal(false);
              afterSheetDismiss(() => setShowEditProfileModal(true));
            }}
            onOpenSettings={() => {
              setShowProfileModal(false);
              afterSheetDismiss(() => {
                hapticLight();
                navigation.navigate('GymProfile');
              });
            }}
            onOpenExerciseDeepDive={(exerciseName) => {
              setShowProfileModal(false);
              afterSheetDismiss(() => setDeepDiveExercise(exerciseName));
            }}
            gymLogs={gymLogs}
          />
        )}
      />

      {/* ── Unified Physical Stats & Goal Setup Sheet ── */}
      <LazySheet
        visible={showEditProfileModal}
        render={() => (
          <SetupAthleteStatsModal
            visible={showEditProfileModal}
            onClose={() => setShowEditProfileModal(false)}
            currentProfile={gymProfile}
            latestWeight={weightLogs?.[0]?.weightKg ?? gymProfile?.weightKg ?? gymProfile?.bodyweightKg ?? null}
            userAuth={{
              displayName: user?.displayName || auth.currentUser?.displayName,
              photoURL: userPhotoURL,
              email: user?.email || auth.currentUser?.email,
            }}
            onSaveSuccess={(updated) => {
              saveGymProfile({
                ...(updated.displayName ? { displayName: updated.displayName } : {}),
                heightCm: updated.heightCm,
                weightKg: updated.weightKg,
                bodyweightKg: updated.weightKg,
                goal: updated.goal as any,
              });
            }}
          />
        )}
      />

      {/* ── Exercise Deep Dive (e.g. Athlete Record Drilldown) ── */}
      <LazySheet
        visible={Boolean(deepDiveExercise)}
        render={() => (
          <ExerciseDeepDiveModal
            visible={!!deepDiveExercise}
            exerciseName={deepDiveExercise}
            gymLogs={gymLogs}
            initialTab="analytics"
            onClose={() => setDeepDiveExercise(null)}
          />
        )}
      />

      {/* ── Quick Session Confirmation Sheet (Replaces Native Alert) ── */}
      <BottomSheet
        visible={dashConfirm !== null}
        onClose={() => setDashConfirm(null)}
        avoidKeyboard={false}
        noPadding={true}
      >
        {activeDashConfirm ? (
          <View style={{ paddingHorizontal: SPACE.md, paddingTop: SPACE.sm, paddingBottom: SPACE.md, gap: SPACE.md }}>
            <View
              style={{
                backgroundColor: tokens.bg.surface,
                borderRadius: RADIUS.card,
                padding: SPACE.md,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: tokens.border.subtle,
                gap: SPACE.xs,
              }}
            >
              <Text style={{ fontSize: 17, fontFamily: FONT_FAMILY.bold, color: tokens.text.primary }}>
                {activeDashConfirm.title}
              </Text>
              <Text style={{ fontSize: 13.5, lineHeight: 19, fontFamily: FONT_FAMILY.regular, color: tokens.text.secondary }}>
                {activeDashConfirm.message}
              </Text>
            </View>

            <View style={{ gap: SPACE.sm }}>
              <TactileButton
                variant={activeDashConfirm.destructive ? 'danger' : 'primary'}
                size="lg"
                label={activeDashConfirm.confirmLabel}
                onPress={async () => {
                  const action = activeDashConfirm.onConfirm;
                  setDashConfirm(null);
                  await action();
                }}
              />
              <TactileButton
                variant="secondary"
                size="lg"
                label="Cancel"
                onPress={() => setDashConfirm(null)}
              />
            </View>
          </View>
        ) : null}
      </BottomSheet>

      {/* ── SWAP TODAY ROUTINE SHEET ── */}
      <SwapRoutineModal
        visible={showSwapModal}
        selectedDate={selectedDate}
        currentPlanDayIndex={activePlanDay?.dayIndex}
        onClose={() => setShowSwapModal(false)}
        onSelectDay={(idx: number) => {
          setLiveLog(null);
          swapDayRoutine(idx);
          setShowSwapModal(false);
        }}
      />

      {/* ── BODYWEIGHT & METRICS QUICK-LOG SHEET ── */}
      <LazySheet
        visible={showBodyMetricsModal}
        render={() => (
          <BodyMetricsSheet
            visible={showBodyMetricsModal}
            onClose={() => setShowBodyMetricsModal(false)}
            initialTab="weight"
          />
        )}
      />
    </ScreenWrapper>
  );
});


export default GymDashboardScreen;
