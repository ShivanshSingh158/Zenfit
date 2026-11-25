import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AppState, View, Text, Pressable, Platform, StyleSheet, DeviceEventEmitter, InteractionManager, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import {
  Flame,
  Play,
  ShieldCheck,
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
import { dateStrOffset, parseLocalDate, toYMD } from '../../utils/dateCore';
import { getRotationNextDayIndex } from '../../services/gymRotationService';
import {
  calculateGymStreak,
  resolveExerciseTargetMuscle,
} from '../../utils/gymUtils';
import { planDayIndexForDate, resolvePlanDay, getCustomPlanDay } from '../../data/gymPlan';
import {
  calculateMuscleFatigue,
  MUSCLES,
  MuscleSlug,
} from '../../services/muscleRecoveryService';
import { getAllPRs, PRRecord } from '../../utils/progressiveOverload';
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/haptics';

import MiniDualBodyMap from '../../components/Gym/schedule/MiniDualBodyMap';
import PRHallOfFameSheet from '../../components/Gym/metrics/PRHallOfFameSheet';
import { FullAthleteProfileModal } from '../../components/Gym/profile/FullAthleteProfileModal';
import { SetupAthleteStatsModal } from '../../components/Gym/profile/SetupAthleteStatsModal';
import ExerciseDeepDiveModal from '../../components/Gym/exercise/ExerciseDeepDiveModal';
import { afterSheetDismiss } from '../../utils/sheetCoordinator';
import { computeAthleteCardStats } from '../../services/athleteCardService';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { auth } from '../../services/firebase';
import { getL1Sync } from '../../utils/bootManifest';
import { makeDashboardStyles } from './dashboard/gymDashboardStyles';
import GoalSetterModal from './dashboard/GoalSetterModal';
import TelemetryBarCard from './dashboard/TelemetryBarCard';
import MonthlyGoalsCard from './dashboard/MonthlyGoalsCard';
import OrbitalChronometerHero from './dashboard/OrbitalChronometerHero';

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
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [capsuleWidth, setCapsuleWidth] = useState(108);

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
    startWorkout,
    endWorkout,
    resumeWorkout,
    revertWorkout,
    planDay: hookPlanDay,
  } = useGymLog(selectedDate);

  // ─── Scroll Choreography & Navigation Anchors ─────────────────────────────
  const scrollRef = useRef<any>(null);
  const muscleSectionYRef = useRef(0);
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
  const [showGoalModal, setShowGoalModal] = useState(false);
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

  // ─── Streak & Weekly Sessions Dot Rail ──────────────────────────────────────
  const streakDays = useMemo(() => {
    return calculateGymStreak(gymLogs || [], userGymPlan);
  }, [gymLogs, userGymPlan]);

  const { sessionsThisWeek, weekDots, todayDotIdx } = useMemo(() => {
    const now = parseLocalDate(today);
    const dayOfWeek = (now.getDay() + 6) % 7; // Monday = 0 ... Sunday = 6
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);

    const dots: boolean[] = [];
    let sessions = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const log = logsByDateMap?.get(dateStr) ||
        (effectiveLog && effectiveLog.date === dateStr ? effectiveLog : null);
      const isDone = Boolean(
        log?.completed ||
        (log?.exercises && log.exercises.some((e: any) => e.setsLog?.some((s: any) => s.completed)))
      );
      if (isDone) sessions++;
      dots.push(isDone);
    }

    return { sessionsThisWeek: sessions, weekDots: dots, todayDotIdx: dayOfWeek };
  }, [logsByDateMap, gymLogs, effectiveLog, today]);

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

  // ─── Weekly 7-Day Volume (Tonnage) & Trend ─────────────────────────────────
  const { weeklyTotalVolumeKg, volumeTrendDiffKg } = useMemo(() => {
    const current7Start = dateStrOffset(today, -6);
    const prev7Start = dateStrOffset(today, -13);
    let current7d = 0;
    let prev7d = 0;

    for (const log of gymLogs || []) {
      if (!log.date || typeof log.date !== 'string') continue;
      if (!/^\d{4}-\d{1,2}-\d{1,2}/.test(log.date)) continue;
      const logDateKey = toYMD(parseLocalDate(log.date));
      if (logDateKey > today || logDateKey < prev7Start) continue;

      let logVol = 0;
      for (const ex of log.exercises || []) {
        for (const s of ex.setsLog || []) {
          if (s.completed && s.weight && s.reps) {
            logVol += Number(s.weight) * Number(s.reps);
          }
        }
      }
      if (logDateKey >= current7Start) {
        current7d += logVol;
      } else {
        prev7d += logVol;
      }
    }
    const diff = Math.round(current7d - prev7d);
    return {
      weeklyTotalVolumeKg: Math.round(current7d),
      volumeTrendDiffKg: diff,
    };
  }, [gymLogs, today]);

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

  // ─── Clean, Non-Redundant Workout Subtitle ─────────────────────────────────
  const heroWorkoutSubtitle = useMemo(() => {
    if (!activePlanDay || activePlanDay.isRest) return 'Rest & Recovery';
    if (!exercises || exercises.length === 0) return 'No exercises scheduled';

    const title = (activePlanDay?.name || '').toLowerCase();
    const titleWords = title.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);

    // Filter out muscle groups that are already explicitly mentioned in the title (e.g. "Chest", "Back")
    const nonRedundantMuscles = todayTargetGroups.filter(group => {
      const gLower = group.toLowerCase();
      return !titleWords.some(w => gLower.includes(w) || w.includes(gLower));
    });

    const parts: string[] = [];
    if (nonRedundantMuscles.length > 0) {
      parts.push(nonRedundantMuscles.slice(0, 3).join(' · '));
    } else if (exercises.length > 0) {
      parts.push(`${exercises.length} exercises`);
    }

    if (totalSets > 0) {
      parts.push(`${totalSets} sets`);
      parts.push(`~${Math.round(totalSets * 2.8)} min`);
    }

    return parts.length > 0 ? parts.join(' · ') : 'Rest & Recovery';
  }, [activePlanDay, exercises, todayTargetGroups, totalSets]);

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

    const muscleNames = todayTargetGroups.slice(0, 3).join(', ');
    let desc = '';
    if (todayTargetReadinessPct >= 90) {
      desc = `${muscleNames || 'Target muscles'} are fully primed (${todayTargetReadinessPct}%). High neural drive—optimal window to push overload on primary compound lifts today.`;
    } else if (todayTargetReadinessPct >= 75) {
      desc = `${muscleNames || 'Target muscles'} show solid readiness (${todayTargetReadinessPct}%). Good systemic capacity—execute working sets with strict tempo and clean form.`;
    } else if (todayTargetReadinessPct >= 50) {
      desc = `${muscleNames || 'Target muscles'} are restoring (${todayTargetReadinessPct}%). Take thorough warmup sets and leave 1–2 reps in reserve on compounds.`;
    } else {
      desc = `Accumulated fatigue detected (${todayTargetReadinessPct}%). Prioritize controlled pump volume and form precision rather than chasing maximum load today.`;
    }

    return { customRecoveryColors: colorMap, statusDescription: desc };
  }, [allTodayTargetSlugs, todayTargetGroups, todayTargetReadinessPct, fatigueData, tokens]);

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

  // ─── Monthly Goals & Targets ───────────────────────────────────────────────
  const [monthlyTarget, setMonthlyTarget] = useState(16);
  const [tempGoal, setTempGoal] = useState(16);

  useEffect(() => {
    AsyncStorage.getItem('@gym_monthly_target_sessions').then((val) => {
      if (val) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed > 0) {
          setMonthlyTarget(parsed);
          setTempGoal(parsed);
        }
      }
    });
  }, []);

  const updateMonthlyTarget = useCallback(async (newTarget: number) => {
    setMonthlyTarget(newTarget);
    await AsyncStorage.setItem('@gym_monthly_target_sessions', String(newTarget));
    setShowGoalModal(false);
  }, []);

  const { currentMonthName, sessionsThisMonth, monthVolumeKg, daysLeftInMonth, isOnPace } =
    useMemo(() => {
      const now = parseLocalDate(today);
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const monthPrefix = `${yyyy}-${mm}`;

      let sessions = 0;
      let vol = 0;
      for (const log of gymLogs || []) {
        if (log.date && log.date.startsWith(monthPrefix)) {
          const isDone = Boolean(
            log.completed ||
            (log.exercises && log.exercises.some((e: any) => e.setsLog?.some((s: any) => s.completed)))
          );
          if (isDone) sessions++;

          for (const ex of log.exercises || []) {
            for (const s of ex.setsLog || []) {
              if (s.completed && s.weight && s.reps) {
                vol += Number(s.weight) * Number(s.reps);
              }
            }
          }
        }
      }

      const daysInCurrentMonth = new Date(yyyy, now.getMonth() + 1, 0).getDate();
      const currentDay = now.getDate();
      const daysLeft = Math.max(0, daysInCurrentMonth - currentDay);
      const expectedPace = Math.round((currentDay / daysInCurrentMonth) * monthlyTarget);

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];

      return {
        currentMonthName: monthNames[now.getMonth()],
        sessionsThisMonth: sessions,
        monthVolumeKg: Math.round(vol),
        daysLeftInMonth: daysLeft,
        isOnPace: sessions >= expectedPace,
      };
    }, [gymLogs, monthlyTarget, today]);

  const monthProgressPct = useMemo(() => {
    return Math.min(100, Math.round((sessionsThisMonth / monthlyTarget) * 100));
  }, [sessionsThisMonth, monthlyTarget]);

  const handleScrollToReadiness = useCallback(() => {
    const targetY = Math.max(0, muscleSectionYRef.current - 58);
    (scrollRef.current as any)?.scrollTo?.({ y: targetY, animated: true });
  }, []);

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
            if (w > 0 && Math.abs(w - capsuleWidth) > 2) {
              setCapsuleWidth(w);
            }
          }}
        >
          <TactileButton
            variant="custom"
            onPress={() => {
              hapticLight();
              navigation.navigate('Analytics', { tab: 'consistency' });
            }}
            style={styles.headerCapsuleStreakGroup}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel={`${streakDays} day streak, view consistency`}
          >
            <Flame
              size={14.5}
              color={streakDays > 0 ? tokens.status.warning : tokens.text.muted}
              strokeWidth={ICON.strokeWidth}
            />
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

        {/* ── SECTION 2: HERO WORKOUT STAGE & KINETIC ORBITAL CHRONOMETER ── */}
        <OrbitalChronometerHero
          isScreenFocused={isScreenFocused}
          isInProgress={isInProgress}
          isCompleted={isCompleted}
          isRestDay={isRestDay}
          activeStartMs={activeStartMs}
          workoutName={workoutTitle}
          exercises={exercises}
          totalSets={totalSets}
          heroWorkoutSubtitle={heroWorkoutSubtitle}
          effectiveLog={effectiveLog}
          sessionReceipt={sessionReceipt}
          onStartWorkout={() => {
            startWorkout();
            navigation.navigate('ActiveLogging', { date: selectedDate });
          }}
          onResumeWorkout={() => {
            resumeWorkout();
            navigation.navigate('ActiveLogging', { date: selectedDate });
          }}
          onFinishWorkout={handleQuickFinishWorkout}
          onBrowseWorkouts={() => navigation.navigate('Today')}
          onOpenPreview={() => setShowPreviewSheet(true)}
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

        {/* ── SECTION 3: OPEN BORDERLESS TELEMETRY RIBBON ── */}
        <TelemetryBarCard
          sessionsThisWeek={sessionsThisWeek}
          weeklyPlannedSessions={weeklyPlannedSessions}
          weekDots={weekDots}
          todayDotIdx={todayDotIdx}
          todayTargetReadinessPct={todayTargetReadinessPct}
          weeklyTotalVolumeKg={weeklyTotalVolumeKg}
          volumeTrendDiffKg={volumeTrendDiffKg}
          replayKey={replayKey}
          onPressSessions={() =>
            navigation.navigate('Plan', { initialTab: 'schedule' })
          }
          onPressReadiness={handleScrollToReadiness}
          onPressVolume={() => navigation.navigate('Analytics')}
          tokens={tokens}
          styles={styles}
        />

        {/* ── SECTION 4: BORDERLESS MUSCLE PRIMING & COACH DIRECTIVE ── */}
        <View
          onLayout={(e) => {
            muscleSectionYRef.current = e.nativeEvent.layout.y;
          }}
          style={styles.recoverySection}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderLabel} numberOfLines={1}>MUSCLE READINESS & DIRECTIVE</Text>
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
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: eyebrowStatusColor,
                  opacity: isDark ? 0.09 : 0.06,
                }}
              />
              <MiniDualBodyMap
                customMuscleColors={customRecoveryColors}
                avatarHeight={120}
                avatarWidth={52}
                gap={14}
                isDark={isDark}
              />
            </Pressable>

            <Pressable
              onPress={() => {
                hapticLight();
                navigation.navigate('Body');
              }}
              style={({ pressed }) => [
                styles.muscleBarsColumn,
                pressed && { opacity: 0.85 },
              ]}
            >
              {todayMuscleItems.slice(0, 4).map((item, mIdx) => {
                const color =
                  item.readiness >= 85
                    ? tokens.status.success
                    : item.readiness >= 50
                    ? tokens.status.warning
                    : tokens.status.danger;
                return (
                  <View key={item.group} style={styles.muscleBarRow}>
                    <View style={styles.muscleBarHeader}>
                      <Text style={styles.muscleBarName} numberOfLines={1}>
                        {item.group}
                      </Text>
                      <NumericText style={[styles.muscleBarPct, { color }]}>
                        {item.readiness}%
                      </NumericText>
                    </View>
                    <AnimatedProgressBar
                      progress={Math.min(1, item.readiness / 100)}
                      minVisualRatio={0.08}
                      height={4}
                      borderRadius={2}
                      delayMs={mIdx * 45}
                      durationMs={520}
                      replayKey={replayKey}
                      color={color}
                      trackColor={
                        isDark ? 'rgba(255, 255, 255, 0.08)' : tokens.bg.elevated
                      }
                    />
                  </View>
                );
              })}
            </Pressable>
          </View>

          {/* Editorial Accent-Rule Coach Directive (Zero Inner Box) */}
          <View
            style={[
              styles.editorialDirectiveQuote,
              { borderLeftColor: tokens.accent.primary },
            ]}
          >
            <View style={styles.readoutIconRow}>
              <ShieldCheck
                size={12.5}
                color={tokens.accent.primary}
                strokeWidth={ICON.strokeWidth}
              />
              <Text style={styles.readoutCardTitle}>COACH DIRECTIVE</Text>
            </View>
            <Text style={styles.readoutText} numberOfLines={3} ellipsizeMode="tail">
              {statusDescription}
            </Text>
          </View>
        </View>

        {/* ── SECTION 5: BORDERLESS WEEKLY VOLUME TARGETS LEDGER ── */}
        <View style={styles.stimulusLedger}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderLabel} numberOfLines={1}>WEEKLY VOLUME TARGETS</Text>
            <TactileButton
              variant="custom"
              hitSlop={TOUCH.hitSlop}
              style={{ flexShrink: 0 }}
              onPress={() => navigation.navigate('Plan', { initialTab: 'schedule' })}
            >
              <Text style={styles.sectionBadgeLink} numberOfLines={1}>Schedule ›</Text>
            </TactileButton>
          </View>

          {weeklyStimulusRows.map((row, idx) => {
            const pct = Math.min(100, Math.round((row.doneSets / row.targetSets) * 100));
            const remaining = Math.max(0, row.targetSets - row.doneSets);
            const isGoalMet = row.doneSets >= row.targetSets;
            return (
              <Pressable
                key={row.muscle}
                onPress={() => {
                  hapticLight();
                  navigation.navigate('Plan', { initialTab: 'schedule' });
                }}
                style={({ pressed }) => [
                  styles.stimulusRow,
                  idx > 0 && styles.stimulusRowBorder,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={styles.stimulusHeader}>
                  <Text style={styles.stimulusMuscleName} numberOfLines={1} ellipsizeMode="tail">
                    {row.muscle}
                  </Text>
                  <View style={styles.stimulusRightRow}>
                    <NumericText style={styles.stimulusSetFraction}>
                      <Text style={styles.stimulusDoneBold}>{row.doneSets}</Text>
                      <Text style={styles.stimulusTargetMuted}>
                        {' '}/ {row.targetSets} sets
                      </Text>
                    </NumericText>
                    <View
                      style={[
                        styles.stimulusStatusChip,
                        {
                          backgroundColor: isGoalMet
                            ? tokens.status.successDim
                            : tokens.accent.primaryDim,
                        },
                      ]}
                    >
                      <NumericText
                        style={[
                          styles.stimulusStatusChipText,
                          {
                            color: isGoalMet
                              ? tokens.status.success
                              : tokens.accent.primary,
                          },
                        ]}
                      >
                        {isGoalMet ? 'Goal Hit' : `${remaining} left`}
                      </NumericText>
                    </View>
                  </View>
                </View>
                <AnimatedProgressBar
                  progress={pct / 100}
                  minVisualRatio={0.06}
                  height={4}
                  borderRadius={2}
                  delayMs={idx * 45}
                  durationMs={520}
                  replayKey={replayKey}
                  color={isGoalMet ? tokens.status.success : tokens.accent.primary}
                  trackColor={
                    isDark ? 'rgba(255, 255, 255, 0.08)' : tokens.bg.elevated
                  }
                />
              </Pressable>
            );
          })}
        </View>

        {/* ── SECTION 6: PERFORMANCE HORIZON & MONTHLY TARGETS ── */}
        <MonthlyGoalsCard
          currentMonthName={currentMonthName}
          sessionsThisMonth={sessionsThisMonth}
          monthlyTarget={monthlyTarget}
          monthProgressPct={monthProgressPct}
          monthVolumeKg={monthVolumeKg}
          isOnPace={isOnPace}
          daysLeftInMonth={daysLeftInMonth}
          latestPR={latestPR}
          replayKey={replayKey}
          onOpenPRVault={() => setShowPRSheet(true)}
          onEditGoal={() => {
            setTempGoal(monthlyTarget);
            setShowGoalModal(true);
          }}
          tokens={tokens}
          styles={styles}
        />
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
                startWorkout();
                navigation.navigate('ActiveLogging', { date: selectedDate });
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
      <PRHallOfFameSheet
        visible={showPRSheet}
        onClose={() => setShowPRSheet(false)}
        gymLogs={gymLogs}
      />

      {/* ── Official Athlete Dossier / Performance Card ── */}
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

      {/* ── Unified Physical Stats & Goal Setup Sheet ── */}
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

      {/* ── Exercise Deep Dive (e.g. Athlete Record Drilldown) ── */}
      <ExerciseDeepDiveModal
        visible={!!deepDiveExercise}
        exerciseName={deepDiveExercise}
        gymLogs={gymLogs}
        initialTab="analytics"
        onClose={() => setDeepDiveExercise(null)}
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

      {/* ── GOAL SETTER MODAL ── */}
      <GoalSetterModal
        visible={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        tempGoal={tempGoal}
        setTempGoal={setTempGoal}
        onSaveGoal={updateMonthlyTarget}
        tokens={tokens}
        styles={styles}
      />
    </ScreenWrapper>
  );
});


export default GymDashboardScreen;
