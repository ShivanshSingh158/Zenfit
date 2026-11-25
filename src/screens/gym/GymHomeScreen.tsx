import React, { useState, useMemo, memo, useCallback, useEffect, useRef, Suspense } from 'react';
import {
  AppState,
  View,
  Text,
  Pressable,
  ScrollView,
  DeviceEventEmitter,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeftRight,
  Flame,
  Zap,
  Trophy,
  Rocket,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Leaf,
  Plus,
  Dumbbell,
  ArrowUpDown,
  Check,
  Activity,
  MoreHorizontal,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useActiveWorkoutState, useGymLogs, useGymPlan } from '../../contexts/domains/WellnessContext';
import {
  useGymLog,
  todayStr,
  dateStrOffset,
} from '../../hooks/useGymLog';
import { parseLocalDate } from '../../utils/dateCore';
import { getL1Sync } from '../../utils/bootManifest';
import { useTheme } from '../../contexts/ThemeContext';
import { ICON, SPACE, TOUCH } from '../../theme/tokens';
import { useResponsiveMetrics } from '../../theme/responsive';
import {
  ScreenWrapper,
  TabScreenHeader,
  TactileButton,
  NumericText,
} from '../../components/ui';
import { RollingNumber } from '../../components/ui/RollingNumber';
import { useScreenReplayTrigger } from '../../hooks/useScreenReplayTrigger';
import { hapticLight, hapticMedium, hapticSuccess, hapticHeavy } from '../../utils/haptics';
import {
  resolveExerciseTargetMuscle,
  buildExerciseHistoryIndex,
  normalizeExerciseKey,
  getExerciseSwapAlternatives,
  calculateGymStreak,
} from '../../utils/gymUtils';
import type { GymCardioLog } from '../../types/gym.types';
import { awardXP } from '../../services/xpSystem';
import { getWorkoutDaysInRotation, getRotationLetterForDay } from '../../services/gymRotationService';
import { makeStyles } from './gymHomeStyles';

// ─── Core Frame-0 Components (Rendered directly on Today's active workout surface) ───
import GymWorkoutBanner from '../../components/Gym/active/GymWorkoutBanner';
import GymExerciseDraggableRow from '../../components/Gym/exercise/GymExerciseDraggableRow';
import AddExerciseModal from '../../components/Gym/exercise/AddExerciseModal';
import ExerciseDeepDiveModal from '../../components/Gym/exercise/ExerciseDeepDiveModal';
import { GymExerciseOptionsSheet } from '../../components/Gym/exercise/GymExerciseOptionsSheet';
import { EditExerciseSheet, EditExerciseUpdates } from '../../components/Gym/exercise/EditExerciseSheet';
import { ActiveSwapModal } from '../../components/Gym/active/ActiveSwapModal';
import PRHallOfFameSheet from '../../components/Gym/metrics/PRHallOfFameSheet';
import { ExerciseHistoryDrawer } from '../../components/Gym/exercise/ExerciseHistoryDrawer';
import { ExerciseDetailModal } from '../../components/Gym/exercise/ExerciseDetailModal';
import { SwapRoutineModal } from '../../components/Gym/schedule/SwapRoutineModal';
import BodyMetricsSheet from '../../components/Gym/metrics/BodyMetricsSheet';
import { AddCardioModal } from '../../components/Gym/cardio/AddCardioModal';
import { LogCardioModal } from '../../components/Gym/cardio/LogCardioModal';
import WeeklyReportSkeleton from '../../components/Gym/metrics/WeeklyReportSkeleton';
import { LazySheet } from '../../hooks/useLazySheetMount';

const LazyWeeklyGymReport = React.lazy(() => import('../../components/Gym/metrics/WeeklyGymReport'));

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function getMuscleWeight(m: string): number {
  const ml = m.toLowerCase();
  if (ml.includes('chest') || ml.includes('pec')) return 1;
  if (ml.includes('delt') || ml.includes('shoulder')) return 2;
  if (ml.includes('back') || ml.includes('lat') || ml.includes('trap')) return 3;
  if (ml.includes('bicep') || ml.includes('tricep') || ml.includes('brach') || ml.includes('forearm')) return 4;
  if (ml.includes('abs') || ml.includes('oblique') || ml.includes('core')) return 5;
  if (ml.includes('quad') || ml.includes('glute') || ml.includes('ham') || ml.includes('calf') || ml.includes('soleus')) return 6;
  return 7;
}

export const GymHomeScreen = memo(function GymHomeScreen() {
  const { colors, isDark, tokens } = useTheme();
  const { isTablet, maxContentWidth } = useResponsiveMetrics();
  const s = useMemo(() => makeStyles(colors, isDark, tokens), [colors, isDark, tokens]);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const activeWorkout = useActiveWorkoutState();

  const [today, setToday] = useState(() => todayStr());
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekOffset, setWeekOffset] = useState(0);
  const { replayKey } = useScreenReplayTrigger();

  const syncTodayDate = useCallback(() => {
    const current = todayStr();
    setToday((prev) => {
      if (prev !== current) {
        setSelectedDate((sel) => (sel === prev ? current : sel));
        return current;
      }
      return prev;
    });
  }, []);

  useFocusEffect(syncTodayDate);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') syncTodayDate();
    });
    return () => sub.remove();
  }, [syncTodayDate]);

  const { gymLogs, logsByDateMap } = useGymLogs();
  const { userGymPlan, updateMasterPlan } = useGymPlan();

  const {
    log,
    startWorkout,
    resumeWorkout,
    endWorkout,
    revertWorkout,
    addExercise,
    updateExercise,
    deleteExercise,
    addCardio,
    updateCardio,
    deleteCardio,
    planDay,
    swapDayRoutine,
    reorderExercisesFull,
  } = useGymLog(selectedDate);

  // ─── Modal States ──────────────────────────────────────────────────────────
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showCardioModal, setShowCardioModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deepDiveExercise, setDeepDiveExercise] = useState<string | null>(null);
  const [deepDiveTab, setDeepDiveTab] = useState<'guide' | 'analytics'>('guide');
  const [exerciseMenuFor, setExerciseMenuFor] = useState<any | null>(null);
  const [supersetPickerFor, setSupersetPickerFor] = useState<any | null>(null);
  const [editExerciseFor, setEditExerciseFor] = useState<any | null>(null);
  const [cardioMenuFor, setCardioMenuFor] = useState<GymCardioLog | null>(null);
  const [logCardioFor, setLogCardioFor] = useState<GymCardioLog | null>(null);
  const [swapModalFor, setSwapModalFor] = useState<any | null>(null);

  // ─── Streak & Week Computations ────────────────────────────────────────────
  const streak = useMemo(() => calculateGymStreak(gymLogs || [], userGymPlan), [gymLogs, userGymPlan]);

  const weekDates = useMemo(() => {
    const baseDate = parseLocalDate(today);
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);
    const dayOfWeek = baseDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    // Offset to previous or current Monday (Mon=0, Tue=1, ..., Sun=6)
    const mondayOffset = (dayOfWeek + 6) % 7;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - mondayOffset);

    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    return dates;
  }, [weekOffset, today]);

  const weekDateMeta = useMemo(() => {
    return weekDates.map((date) => {
      const [yyyy, mm, dd] = date.split('-');
      const dateObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      const dayOfWeek = dateObj.getDay();
      return {
        date,
        dateNum: dateObj.getDate(),
        dayOfWeek,
        dateDay: DAYS_SHORT[dayOfWeek],
        planDayIdx: dayOfWeek === 0 ? 7 : dayOfWeek,
      };
    });
  }, [weekDates]);

  const weekMonthYearText = useMemo(() => {
    if (weekDates.length === 0) return '';
    try {
      const [y1, m1] = weekDates[0].split('-');
      const [y2, m2] = weekDates[6].split('-');
      const d1 = new Date(Number(y1), Number(m1) - 1, 1);
      const mName1 = MONTHS_SHORT[d1.getMonth()];
      if (m1 === m2) {
        return `${mName1.toUpperCase()} ${y1}`;
      }
      const d2 = new Date(Number(y2), Number(m2) - 1, 1);
      const mName2 = MONTHS_SHORT[d2.getMonth()];
      if (y1 !== y2) {
        return `${mName1.toUpperCase()} – ${mName2.toUpperCase()} ${y1} - ${y2}`;
      }
      return `${mName1.toUpperCase()} – ${mName2.toUpperCase()} ${y2}`;
    } catch {
      return '';
    }
  }, [weekDates]);

  // ─── Workouts Left This Week Countdown (openGym v1.4.4 #753) ────────────────
  const weeklyCountdown = useMemo(() => {
    let plannedCount = 0;
    for (let i = 1; i <= 7; i++) {
      const customDay = userGymPlan?.customDays?.[i];
      const isRest = customDay ? Boolean(customDay.isRest) : (i === 7);
      if (!isRest) plannedCount++;
    }
    if (plannedCount === 0) plannedCount = 4;

    const completedCount = weekDates.reduce((acc, d) => {
      const logEntry = logsByDateMap?.get(d);
      return logEntry?.completed ? acc + 1 : acc;
    }, 0);

    const remainingCount = Math.max(0, plannedCount - completedCount);
    const isCurrentWeek = weekOffset === 0;

    let iconName: 'flame' | 'flash' | 'trophy' | 'rocket' | 'calendar' = 'flame';
    let label = '';
    let color = tokens.status.success;

    if (!isCurrentWeek) {
      if (weekOffset < 0) {
        iconName = 'calendar';
        label = `Recap: ${completedCount} of ${plannedCount} completed`;
        color = completedCount >= plannedCount ? tokens.status.success : tokens.text.secondary;
      } else {
        iconName = 'calendar';
        label = `Upcoming: ${plannedCount} workouts planned`;
        color = tokens.text.secondary;
      }
    } else if (completedCount >= plannedCount) {
      if (completedCount > plannedCount) {
        iconName = 'rocket';
        label = `Bonus workout! (${completedCount}/${plannedCount} completed)`;
        color = tokens.accent.primary;
      } else {
        iconName = 'trophy';
        label = `Weekly goal crushed! (${completedCount}/${plannedCount} complete)`;
        color = tokens.status.success;
      }
    } else if (remainingCount === 1) {
      iconName = 'flash';
      label = `Last workout this week! (${completedCount}/${plannedCount} done)`;
      color = tokens.status.warning;
    } else {
      iconName = 'flame';
      label = `${remainingCount} of ${plannedCount} workouts left this week`;
      color = tokens.status.success;
    }

    return {
      plannedCount,
      completedCount,
      remainingCount,
      isCurrentWeek,
      iconName,
      label,
      color,
    };
  }, [userGymPlan?.customDays, weekDates, gymLogs, weekOffset, tokens]);

  // Formatted date strings for Compact Structural Header (0ms static lookup; zero ICU bridge overhead)
  const { headerTitleText, headerDateText } = useMemo(() => {
    try {
      const [yyyy, mm, dd] = selectedDate.split('-');
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      const dayOfWeek = d.getDay();
      const monthIdx = d.getMonth();
      const dayNum = d.getDate();
      const isToday = selectedDate === today;
      if (isToday) {
        return {
          headerTitleText: 'Today',
          headerDateText: `${DAYS_SHORT[dayOfWeek]}, ${MONTHS_SHORT[monthIdx]} ${dayNum}`,
        };
      }
      return {
        headerTitleText: DAYS_FULL[dayOfWeek],
        headerDateText: `${MONTHS_SHORT[monthIdx]} ${dayNum}`,
      };
    } catch {
      return { headerTitleText: 'Today', headerDateText: selectedDate };
    }
  }, [selectedDate, today]);

  const activePlanDay = useMemo(() => {
    return planDay;
  }, [planDay]);

  const activeExercises = useMemo(() => {
    if (log?.exercises && log.exercises.length > 0) {
      return log.exercises;
    }
    return activePlanDay?.exercises || [];
  }, [log?.exercises, activePlanDay?.exercises]);

  const existingExerciseIds = useMemo(() => {
    return activeExercises.map((e: any) => e.exerciseId || e.id);
  }, [activeExercises]);

  const totalWorkingSets = useMemo(() => {
    return activeExercises.reduce((sum: number, ex: any) => sum + (ex.setsLog?.length || 3), 0);
  }, [activeExercises]);

  const estimatedMinutes = useMemo(() => {
    return Math.max(20, Math.round(totalWorkingSets * 2.5));
  }, [totalWorkingSets]);

  const muscleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    activeExercises.forEach((ex: any) => {
      const { canonicalGroup } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
      if (canonicalGroup && canonicalGroup !== 'Mixed' && canonicalGroup !== 'Other') {
        counts[canonicalGroup] = (counts[canonicalGroup] || 0) + (ex.setsLog?.length || 3);
      }
    });
    return counts;
  }, [activeExercises]);

  const sortedMuscles = useMemo(() => {
    return Object.entries(muscleCounts).sort((a, b) => {
      const weightDiff = getMuscleWeight(a[0]) - getMuscleWeight(b[0]);
      if (weightDiff !== 0) return weightDiff;
      return b[1] - a[1];
    });
  }, [muscleCounts]);

  const isWorkoutCompleted = Boolean(log?.completed && !log?.workoutStartTime);

  const isEffectiveRest = Boolean(
    (activePlanDay?.isRest || planDay?.isRest) &&
    (!log?.exercises || log.exercises.length === 0) &&
    (!log?.workoutStartTime) &&
    (!log?.completed)
  );

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleStartWorkout = useCallback(() => {
    if (activeExercises.length === 0) {
      setShowAddModal(true);
      return;
    }
    startWorkout();
    navigation.navigate('ActiveLogging', { date: selectedDate });
  }, [activeExercises.length, startWorkout, navigation, selectedDate]);

  // Navigate to ActiveLogging without starting the workout — used by exercise rows.
  // Tapping an exercise should ONLY open the logger to view/log sets, never auto-start.
  const handleExercisePress = useCallback((index?: number) => {
    hapticLight();
    const targetIdx = typeof index === 'number' ? index : 0;
    navigation.navigate('ActiveLogging', {
      date: selectedDate,
      initialIndex: targetIdx,
      exerciseIndex: targetIdx,
      previewOnly: true,
    });
  }, [navigation, selectedDate]);

  // Explicitly resume an in-progress workout — used ONLY by the banner's Resume button.
  const handleResumeWorkout = useCallback(() => {
    resumeWorkout();
    navigation.navigate('ActiveLogging', { date: selectedDate });
  }, [resumeWorkout, navigation, selectedDate]);

  const handleEndWorkoutFromBanner = useCallback(async (completed = true) => {
    const exercisesToPass = (log?.exercises && log.exercises.length > 0) ? log.exercises : undefined;
    await endWorkout(completed, exercisesToPass);
  }, [endWorkout, log?.exercises]);

  const handleShowHistory = useCallback((exItem: { id: string; name: string }) => {
    setDeepDiveTab('analytics');
    setDeepDiveExercise(exItem.name);
  }, []);

  // Pre-indexed O(1) map of previous exercise sessions (eliminates O(N) scan per exercise)
  const historyIndex = useMemo(() => {
    const targetDateStr = selectedDate || todayStr();
    return buildExerciseHistoryIndex(gymLogs, targetDateStr);
  }, [gymLogs, selectedDate]);

  const previousSessionMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const ex of activeExercises) {
      if (ex?.name && !map.has(ex.name)) {
        map.set(ex.name, historyIndex.get(normalizeExerciseKey(ex.name)) ?? null);
      }
    }
    return map;
  }, [activeExercises, historyIndex]);

  // Group adjacent exercises with matching supersetGroup into fused superset containers
  const exerciseCardGroups = useMemo(() => {
    const groups: Array<{
      id: string;
      isSuperset: boolean;
      supersetGroup?: string;
      items: Array<{ exercise: any; index: number }>;
    }> = [];
    let currentGroup: {
      id: string;
      isSuperset: boolean;
      supersetGroup?: string;
      items: Array<{ exercise: any; index: number }>;
    } | null = null;

    activeExercises.forEach((ex: any, idx: number) => {
      const sGroup = ex.supersetGroup ? String(ex.supersetGroup).trim() : null;
      if (sGroup) {
        if (currentGroup && currentGroup.isSuperset && currentGroup.supersetGroup === sGroup) {
          currentGroup.items.push({ exercise: ex, index: idx });
        } else {
          currentGroup = {
            id: `superset_${sGroup}_${idx}`,
            isSuperset: true,
            supersetGroup: sGroup,
            items: [{ exercise: ex, index: idx }],
          };
          groups.push(currentGroup);
        }
      } else {
        currentGroup = {
          id: `single_${ex.exerciseId || ex.name || idx}`,
          isSuperset: false,
          items: [{ exercise: ex, index: idx }],
        };
        groups.push(currentGroup);
      }
    });

    return groups;
  }, [activeExercises]);

  const exerciseRenderSections = useMemo(() => {
    const sections: Array<
      | { kind: 'standalone'; key: string; items: Array<{ exercise: any; index: number }> }
      | { kind: 'superset'; key: string; superLetter: string; items: Array<{ exercise: any; index: number }> }
    > = [];
    let standaloneBatch: Array<{ exercise: any; index: number }> = [];

    const flushStandalone = (key: string) => {
      if (standaloneBatch.length === 0) return;
      sections.push({ kind: 'standalone', key, items: standaloneBatch });
      standaloneBatch = [];
    };

    exerciseCardGroups.forEach((group, gIdx) => {
      if (group.isSuperset && group.items.length > 1) {
        flushStandalone(`standalone_before_${gIdx}`);
        const superLetter = group.supersetGroup
          ? group.supersetGroup.replace(/^SUPER-?/i, '')
          : 'A';
        sections.push({
          kind: 'superset',
          key: group.id,
          superLetter,
          items: group.items,
        });
      } else {
        standaloneBatch.push(...group.items);
      }
    });

    flushStandalone('standalone_tail');
    return sections;
  }, [exerciseCardGroups]);

  // Direct toggle on GymHome list: allows user to mark an exercise done/undone without opening active logger
  const handleToggleExerciseComplete = useCallback((ex: any, idx: number) => {
    const setsLog = ex.setsLog || [];
    const isCurrentlyDone = setsLog.length > 0 && setsLog.every((s: any) => s.completed);
    const targetCompleted = !isCurrentlyDone;

    if (targetCompleted) {
      hapticSuccess();
    } else {
      hapticLight();
    }

    const prevSession = previousSessionMap.get(ex.name);
    const lastSets = prevSession?.sets || [];
    const lastValidSet = lastSets.length > 0 ? lastSets[lastSets.length - 1] : null;

    const baseSetsCount = setsLog.length > 0 ? setsLog.length : (ex.targetSets || 3);
    const defaultReps = parseInt(String(ex.targetReps || '10').split(/[-–—]/)[0], 10) || 10;

    const updatedSets = Array.from({ length: baseSetsCount }, (_, sIdx) => {
      const existingSet = setsLog[sIdx];
      const lastSet = lastSets[sIdx] || lastValidSet;
      const weight = (existingSet?.weight != null && Number(existingSet.weight) > 0)
        ? Number(existingSet.weight)
        : (lastSet?.weight != null && Number(lastSet.weight) > 0 ? Number(lastSet.weight) : (ex.targetWeight || 0));
      const reps = (existingSet?.reps != null && Number(existingSet.reps) > 0)
        ? Number(existingSet.reps)
        : (lastSet?.reps ? Number(lastSet.reps) : defaultReps);

      return {
        setNumber: sIdx + 1,
        weight,
        reps,
        completed: targetCompleted,
      };
    });

    const updatedEx = {
      ...ex,
      setsLog: updatedSets,
    };

    const anyOtherCompleted = activeExercises.some(
      (e: any, eIdx: number) => eIdx !== idx && (e.setsLog || []).some((s: any) => Boolean(s.completed))
    );
    const anyCompletedCardio = (log?.cardio || []).some((c: any) => Boolean(c.completed));

    updateExercise(idx, updatedEx);
    if (targetCompleted) {
      const xpActionKey = `ex_complete_${selectedDate}_${ex.exerciseId || ex.name}`;
      awardXP('GYM_SET', xpActionKey).catch(() => {});
    } else if (!anyOtherCompleted && !anyCompletedCardio) {
      revertWorkout();
    }
  }, [previousSessionMap, updateExercise, activeExercises, log?.cardio, selectedDate, revertWorkout]);

  // Whenever returning to GymHomeScreen, hydrate only newer active L1 draft via fast ref lookup.
  const focusDraftCheckRef = useRef({
    isWorkoutCompleted,
    logCompleted: Boolean(log?.completed),
    logId: log?.id,
    logUpdatedAt: log?.updatedAt || 0,
    selectedDate,
  });
  focusDraftCheckRef.current = {
    isWorkoutCompleted,
    logCompleted: Boolean(log?.completed),
    logId: log?.id,
    logUpdatedAt: log?.updatedAt || 0,
    selectedDate,
  };

  useFocusEffect(
    useCallback(() => {
      const checkDraft = async () => {
        try {
          const { isWorkoutCompleted: done, logCompleted, logId, logUpdatedAt, selectedDate: dateStrVal } = focusDraftCheckRef.current;
          if (done || logCompleted) return;
          const draftKey = logId ? `gym_active_draft_${logId}` : `gym_active_draft_${dateStrVal}`;
          let draft = getL1Sync<any>(draftKey, null);
          if (!draft && logId) {
            const raw = await AsyncStorage.getItem(draftKey);
            if (raw) {
              try {
                draft = JSON.parse(raw);
              } catch {}
            }
          }
          if (draft) {
            const hasLoggedSets = (draft?.exercises || []).some((ex: any) =>
              (ex.setsLog || []).some((s: any) => s.completed)
            );
            if (
              draft.date === dateStrVal &&
              !draft.completed &&
              hasLoggedSets &&
              (draft.updatedAt || 0) > logUpdatedAt
            ) {
              DeviceEventEmitter.emit('gym_log_local_mutation', { date: dateStrVal, log: draft });
            }
          }
        } catch {}
      };
      checkDraft();
    }, [])
  );

  const isRotation = userGymPlan?.scheduleMode === 'rotation';
  const rotationDays = useMemo(() => isRotation ? getWorkoutDaysInRotation(userGymPlan) : [], [isRotation, userGymPlan]);
  const rotationLetter = isRotation && activePlanDay ? getRotationLetterForDay(activePlanDay.dayIndex, rotationDays) : null;
  const routineTitle = isRotation && rotationLetter && !activePlanDay?.isRest
    ? `Workout ${rotationLetter}: ${activePlanDay.name}`
    : (activePlanDay?.name || 'Workout Day');

  // Derive the 2 major target muscles from today's exercises (clean & compact, no exercise names)
  const routineFocus = useMemo(() => {
    if (activePlanDay?.isRest) return 'Rest & Recovery';

    // Count sets per canonical muscle group from the active exercises
    const counts: Record<string, number> = {};
    activeExercises.forEach((ex: any) => {
      const { canonicalGroup } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
      if (canonicalGroup && canonicalGroup !== 'Mixed' && canonicalGroup !== 'Other') {
        counts[canonicalGroup] = (counts[canonicalGroup] || 0) + (ex.setsLog?.length || 3);
      }
    });

    const topMuscles = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([muscle]) => muscle);

    if (topMuscles.length === 0) {
      return activePlanDay?.name || 'Workout Day';
    }
    if (topMuscles.length === 1) {
      return `${topMuscles[0]} Focus`;
    }
    return `${topMuscles[0]} & ${topMuscles[1]}`;
  }, [activePlanDay?.isRest, activePlanDay?.name, activeExercises]);

  const renderWeeklyIcon = (iconName: 'flame' | 'flash' | 'trophy' | 'rocket' | 'calendar', color: string) => {
    const props = { size: 12, color, strokeWidth: ICON.strokeWidth };
    switch (iconName) {
      case 'calendar':
        return <Calendar {...props} />;
      case 'rocket':
        return <Rocket {...props} />;
      case 'trophy':
        return <Trophy {...props} />;
      case 'flash':
        return <Zap {...props} />;
      case 'flame':
      default:
        return <Flame {...props} />;
    }
  };

  const auraColor = isWorkoutCompleted
    ? '#30D158'
    : tokens.accent.primary;

  return (
    <ScreenWrapper edges={['top']} compactTop topAura={auraColor} keyboardAvoiding={false} style={s.root}>
      {/* ─── 1. UNIFIED COMPACT HEADER ───────────────────────────────────── */}
      <TabScreenHeader
        title={headerTitleText}
        subtitle={headerDateText}
        rightActions={
          <TactileButton
            variant="custom"
            style={s.swapRoutineBtn}
            onPress={() => setShowSwapModal(true)}
            hitSlop={TOUCH.hitSlop}
          >
            <ArrowLeftRight
              size={13.5}
              color={tokens.text.primary}
              strokeWidth={ICON.strokeWidth}
            />
            <Text style={s.swapRoutineBtnText} numberOfLines={1}>Swap Today</Text>
          </TactileButton>
        }
      />

      {/* ─── 2. SCROLLABLE CONTENT ──────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[
          s.scrollContent,
          isTablet && { maxWidth: maxContentWidth, width: '100%', alignSelf: 'center' as const },
          {
            paddingTop: 4,
            paddingBottom: insets.bottom + (activeWorkout.active ? 156 : 116),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* WEEK CALENDAR STRIP */}
        <View style={s.weekStripCard}>
          <View style={s.weekStripHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE[8], flex: 1, minWidth: 0 }}>
              <Text
                style={s.weekStripMonthText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                {weekMonthYearText}
              </Text>
              <View style={s.weekProgressBadge}>
                {renderWeeklyIcon(weeklyCountdown.iconName, weeklyCountdown.color)}
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <RollingNumber
                    value={weeklyCountdown.completedCount}
                    replayKey={replayKey}
                    cycles={0}
                    durationMs={420}
                    style={[s.weekProgressBadgeText, { color: weeklyCountdown.color }]}
                  />
                  <NumericText style={[s.weekProgressBadgeText, { color: weeklyCountdown.color }]}>
                    /{weeklyCountdown.plannedCount} Done
                  </NumericText>
                </View>
              </View>
            </View>

            <View style={s.weekNavBtns}>
              {selectedDate !== today && (
                <TactileButton
                  variant="custom"
                  onPress={() => {
                    setWeekOffset(0);
                    setSelectedDate(today);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  style={s.weekTodayBtn}
                >
                  <Text style={s.weekTodayBtnText} numberOfLines={1}>Today</Text>
                </TactileButton>
              )}
              <TactileButton
                variant="custom"
                onPress={() => {
                  setWeekOffset(prev => prev - 1);
                  setSelectedDate(prev => dateStrOffset(-7, prev));
                }}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                style={s.weekNavBtn}
                accessibilityLabel="Previous week"
              >
                <ChevronLeft size={16} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
              </TactileButton>
              <TactileButton
                variant="custom"
                onPress={() => {
                  setWeekOffset(prev => prev + 1);
                  setSelectedDate(prev => dateStrOffset(7, prev));
                }}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                style={s.weekNavBtn}
                accessibilityLabel="Next week"
              >
                <ChevronRight size={16} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
              </TactileButton>
            </View>
          </View>

          <View style={s.weekDaysContainer}>
            {weekDateMeta.map(({ date, dateNum, dateDay, planDayIdx }) => {
              const isSelected = date === selectedDate;
              const isToday = date === today;

              // Determine workout status dot for this day (O(1) map lookup)
              const logForDay = logsByDateMap?.get(date);
              const isDone = Boolean(logForDay?.completed);
              const customDay = userGymPlan?.customDays?.[planDayIdx];
              const isRest = customDay ? Boolean(customDay.isRest) : (planDayIdx === 7);

              const dotColor = isDone
                ? tokens.status.success
                : isRest
                ? tokens.text.muted
                : (isToday ? tokens.status.warning : tokens.text.secondary);

              return (
                <Pressable
                  key={date}
                  style={[s.dayCol, isSelected && s.dayColActive]}
                  hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                  onPress={() => {
                    hapticLight();
                    setSelectedDate(date);
                  }}
                >
                  <Text
                    style={[s.dayLetter, isSelected && s.dayLetterActive]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                  >
                    {dateDay}
                  </Text>
                  <NumericText style={[s.dayNum, isSelected && s.dayNumActive]} numberOfLines={1}>
                    {dateNum}
                  </NumericText>
                  {isRest && !isDone ? (
                    <Coffee
                      size={10}
                      color={isSelected ? tokens.accent.primary : tokens.text.muted}
                      strokeWidth={ICON.strokeWidth}
                      style={{ marginTop: 1 }}
                    />
                  ) : (
                    <View style={[s.dayDot, { backgroundColor: dotColor }]} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Active Programme Mesocycle Banner (Horizon Strip) */}
        {userGymPlan?.activeProgramme && userGymPlan.activeProgramme.status === 'active' && (
          <TactileButton
            variant="custom"
            style={s.programmeHorizonStrip}
            scaleTo={0.985}
            onPress={() => navigation.navigate('Plan', { initialTab: 'programmes' })}
          >
            <View style={s.programmeHorizonLeft}>
              <View style={s.programmeHorizonDot} />
              <Text style={s.programmeHorizonPhase} numberOfLines={1} ellipsizeMode="tail">
                W{userGymPlan.activeProgramme.currentWeek}/{userGymPlan.activeProgramme.totalWeeks} · {userGymPlan.activeProgramme.weeks[userGymPlan.activeProgramme.currentWeek]?.phaseName || 'Active Phase'}
              </Text>
            </View>

            <View style={s.programmeHorizonRight}>
              {(() => {
                const wk = userGymPlan.activeProgramme.weeks[userGymPlan.activeProgramme.currentWeek];
                const metaStr = wk?.intensityPercentage1RM
                  ? `${wk.intensityPercentage1RM}% Load`
                  : wk?.volumeModifierSets
                  ? `${wk.volumeModifierSets > 0 ? `+${wk.volumeModifierSets}` : wk.volumeModifierSets} set/ex`
                  : 'Baseline';
                return <NumericText style={s.programmeHorizonMeta} numberOfLines={1}>{metaStr}</NumericText>;
              })()}
              <Text style={s.programmeHorizonLink} numberOfLines={1}>Plan</Text>
              <ChevronRight size={13} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
            </View>
          </TactileButton>
        )}

        {isEffectiveRest ? (
          <View style={{ width: '100%', gap: SPACE[12] }}>
            {/* ── Compact Rest & Recovery Banner ── */}
            <View style={s.restDayBannerContainer}>
              <View style={s.restDayLeftRow}>
                <View style={s.restDayIconCircle}>
                  <Leaf size={20} color={tokens.status.success} strokeWidth={ICON.strokeWidth} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.restDayTitle} numberOfLines={1}>Rest & Recovery Day</Text>
                  <Text style={s.restDaySubtitle} numberOfLines={2}>
                    Muscles repair and grow during sleep & rest.
                  </Text>
                </View>
              </View>

              <TactileButton
                variant="primary"
                size="sm"
                onPress={() => setShowAddModal(true)}
                style={s.primaryActionBtn}
              >
                <Plus size={14} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} />
                <Text style={s.primaryActionText} numberOfLines={1}>Log Workout</Text>
              </TactileButton>
            </View>

            {/* ── In-Place Full Weekly Training Recap (Async lazy-split with skeleton) ── */}
            <Suspense fallback={<WeeklyReportSkeleton />}>
              <LazyWeeklyGymReport
                gymLogs={gymLogs}
                weekAnchorDate={selectedDate}
                userGymPlan={userGymPlan}
                replayKey={`${replayKey}-${selectedDate}`}
              />
            </Suspense>
          </View>
        ) : (
          <>
            {/* ─── 3. SINGLE HERO WORKOUT SURFACE ─────────────────────────── */}
            <GymWorkoutBanner
              log={log}
              s={s}
              currentStreak={streak}
              selectedDate={selectedDate}
              navigation={navigation}
              onStartWorkout={handleStartWorkout}
              onResumeWorkout={handleResumeWorkout}
              onEndWorkout={handleEndWorkoutFromBanner}
              resumeWorkout={resumeWorkout}
              onRevertWorkout={revertWorkout}
              routineTitle={routineTitle}
              routineFocus={routineFocus}
              exerciseCount={activeExercises.length}
              setsCount={totalWorkingSets}
              estimatedMinutes={estimatedMinutes}
              replayKey={`${replayKey}-${selectedDate}`}
            />

            {/* ─── 4. INSET GROUPED EXERCISE LIST ─────────────────────────── */}
            <View style={s.section}>
              <View style={s.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                  <Text style={s.sectionLabel} numberOfLines={1}>
                    WORKOUT PLAN{activeExercises.length > 0 ? ` · ${activeExercises.length}` : ''}
                  </Text>
                </View>
                <TactileButton
                  variant="custom"
                  style={s.sectionActionBtn}
                  onPress={() => setShowAddModal(true)}
                  hitSlop={TOUCH.hitSlop}
                >
                  <Plus size={14} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                  <Text style={s.sectionActionText} numberOfLines={1}>Add Exercise</Text>
                </TactileButton>
              </View>

              {activeExercises.length === 0 ? (
                <View style={s.emptyPlanCard}>
                  <Dumbbell
                    size={28}
                    color={tokens.text.muted}
                    strokeWidth={ICON.strokeWidth}
                    style={{ marginBottom: SPACE[8] }}
                  />
                  <Text style={s.emptyPlanTitle}>
                    {activePlanDay?.isRest ? 'Rest Day Scheduled' : 'No Exercises for Today'}
                  </Text>
                  <Text style={s.emptyPlanSub}>
                    {activePlanDay?.isRest
                      ? 'Take time to recover, hydrate, and prepare for your next lifting session.'
                      : 'Tap + Add Exercise to insert movements or swap your routine day.'}
                  </Text>
                </View>
              ) : (
                <View style={{ gap: SPACE[8] }}>
                  {exerciseRenderSections.map((section) =>
                    section.kind === 'standalone' ? (
                      <View key={section.key} style={s.insetGroupedCard}>
                        {section.items.map((item, bIdx) => (
                          <React.Fragment key={item.exercise.exerciseId || item.exercise.name || item.index}>
                            {bIdx > 0 && <View style={s.hairlineDivider} />}
                            <GymExerciseDraggableRow
                              exercise={item.exercise}
                              index={item.index}
                              isPartnerWithPrevious={false}
                              logCompleted={isWorkoutCompleted}
                              logWorkoutStartTime={log?.workoutStartTime || null}
                              s={s}
                              selectedDate={selectedDate}
                              navigation={navigation}
                              onResumeWorkout={handleExercisePress}
                              onShowHistory={handleShowHistory}
                              onShowMenu={setExerciseMenuFor}
                              onToggleComplete={handleToggleExerciseComplete}
                            />
                          </React.Fragment>
                        ))}
                      </View>
                    ) : (
                      <View key={section.key} style={s.supersetCardContainer}>
                        <View style={s.supersetHeaderBar}>
                          <View style={s.supersetHeaderLeft}>
                            <Zap size={12} color={tokens.status.warning} strokeWidth={ICON.strokeWidth} />
                            <Text style={s.supersetHeaderTitle}>
                              SUPERSET {section.superLetter}
                            </Text>
                          </View>
                          <Text style={s.supersetHeaderSubtitle}>BACK-TO-BACK</Text>
                        </View>

                        {section.items.map((item, itemIdx) => (
                          <React.Fragment key={item.exercise.exerciseId || item.exercise.name || item.index}>
                            {itemIdx > 0 && <View style={s.hairlineDivider} />}
                            <GymExerciseDraggableRow
                              exercise={item.exercise}
                              index={item.index}
                              isPartnerWithPrevious={itemIdx > 0}
                              logCompleted={isWorkoutCompleted}
                              logWorkoutStartTime={log?.workoutStartTime || null}
                              s={s}
                              selectedDate={selectedDate}
                              navigation={navigation}
                              onResumeWorkout={handleExercisePress}
                              onShowHistory={handleShowHistory}
                              onShowMenu={setExerciseMenuFor}
                              onToggleComplete={handleToggleExerciseComplete}
                            />
                          </React.Fragment>
                        ))}
                      </View>
                    )
                  )}
                </View>
              )}
            </View>

            {/* ─── 5. CARDIO SECTION ──────────────────────────────────────── */}
            <View style={s.section}>
              <View style={s.sectionHeaderRow}>
                <Text style={s.sectionLabel} numberOfLines={1}>CARDIO</Text>
                <TactileButton
                  variant="custom"
                  style={s.sectionActionBtn}
                  hitSlop={TOUCH.hitSlop}
                  onPress={() => setShowCardioModal(true)}
                >
                  <Plus size={14} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                  <Text style={s.sectionActionText} numberOfLines={1}>Add</Text>
                </TactileButton>
              </View>

              {(log?.cardio || []).length > 0 && (
                <View style={s.insetGroupedCard}>
                  {(log?.cardio || []).map((c, idx) => {
                    const isDone = c.completed;
                    return (
                      <React.Fragment key={c.id}>
                        {idx > 0 && <View style={s.hairlineDivider} />}
                        <Pressable
                          style={s.row}
                          onPress={() => {
                            hapticLight();
                            setLogCardioFor(c);
                          }}
                        >
                          <View style={[s.cardioIconWrap, isDone && s.cardioIconWrapDone]}>
                            {isDone ? (
                              <Check size={14} color={tokens.status.onSuccess} strokeWidth={ICON.strokeWidth} />
                            ) : (
                              <Activity size={14} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
                            )}
                          </View>
                          <View style={s.rowTextCol}>
                            <Text style={[s.rowTitle, isDone && s.textStrikethrough]}>
                              {c.type || 'Cardio'}
                            </Text>
                            <NumericText style={s.rowSubtitle}>
                              {c.durationMinutes ? `${c.durationMinutes} min` : '0 min'}
                              {c.distanceKm ? ` · ${c.distanceKm} km` : ''}
                              {c.speedKmh ? ` · ${c.speedKmh} km/h` : ''}
                              {c.incline ? ` · ${c.incline}% incline` : ''}
                            </NumericText>
                          </View>
                          <TactileButton
                            variant="custom"
                            haptic="medium"
                            style={s.actionBtn}
                            hitSlop={TOUCH.hitSlop}
                            onPress={() => setCardioMenuFor(c)}
                            accessibilityLabel="Cardio options"
                          >
                            <MoreHorizontal size={16} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
                          </TactileButton>
                        </Pressable>
                      </React.Fragment>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ─── 6. SESSION TARGET MUSCLES (Borderless) ──────────────── */}
            {sortedMuscles.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeaderRow}>
                  <Text style={s.sectionLabel}>MUSCLES HIT</Text>
                </View>
                <View style={s.targetMusclesCard}>
                  <NumericText style={s.targetMusclesText}>
                    {sortedMuscles.map(([muscle, count]) => `${muscle} (${count})`).join('  ·  ')}
                  </NumericText>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ─── MODALS (Lazy-mounted shells keep closed modals zero-cost while preserving exit springs) ─── */}
      <LazySheet
        visible={showSwapModal}
        render={() => (
          <SwapRoutineModal
            visible={showSwapModal}
            selectedDate={selectedDate}
            currentPlanDayIndex={activePlanDay?.dayIndex}
            onClose={() => setShowSwapModal(false)}
            onSelectDay={(idx: number) => {
              swapDayRoutine(idx);
              setShowSwapModal(false);
            }}
          />
        )}
      />

      <LazySheet
        visible={showCardioModal}
        render={() => (
          <AddCardioModal
            visible={showCardioModal}
            onClose={() => setShowCardioModal(false)}
            onAdd={(type: any) => {
              addCardio(type);
              setShowCardioModal(false);
            }}
          />
        )}
      />

      <LazySheet
        visible={Boolean(logCardioFor)}
        render={() => (
          <LogCardioModal
            visible={Boolean(logCardioFor)}
            cardio={logCardioFor}
            onClose={() => setLogCardioFor(null)}
            onSave={(updates: any) => {
              if (logCardioFor) {
                updateCardio(logCardioFor.id, updates);
              }
              setLogCardioFor(null);
            }}
          />
        )}
      />

      <LazySheet
        visible={showAddModal}
        render={() => (
          <AddExerciseModal
            visible={showAddModal}
            onClose={() => setShowAddModal(false)}
            onAdd={(newEx: any) => {
              addExercise(newEx);
              setShowAddModal(false);
            }}
            existingExerciseIds={existingExerciseIds}
          />
        )}
      />

      <LazySheet
        visible={Boolean(deepDiveExercise)}
        render={() => (
          <ExerciseDeepDiveModal
            visible={Boolean(deepDiveExercise)}
            exerciseName={deepDiveExercise}
            gymLogs={gymLogs || []}
            initialTab={deepDiveTab}
            onClose={() => setDeepDiveExercise(null)}
          />
        )}
      />

      <LazySheet
        visible={Boolean(exerciseMenuFor || supersetPickerFor || cardioMenuFor)}
        render={() => (
          <GymExerciseOptionsSheet
            exerciseMenuFor={exerciseMenuFor}
            setExerciseMenuFor={setExerciseMenuFor}
            supersetPickerFor={supersetPickerFor}
            setSupersetPickerFor={setSupersetPickerFor}
            cardioMenuFor={cardioMenuFor}
            setCardioMenuFor={setCardioMenuFor}
            setLogCardioFor={setLogCardioFor}
            deleteCardio={deleteCardio}
            deleteExercise={deleteExercise}
            reorderExercisesFull={reorderExercisesFull}
            log={log}
            selectedDate={selectedDate}
            userGymPlan={userGymPlan}
            updateMasterPlan={updateMasterPlan}
            navigation={navigation}
            colors={colors}
            isDark={isDark}
            s={s}
            onOpenDeepDive={(ex: any, tab: 'guide' | 'analytics' = 'guide') => {
              setDeepDiveTab(tab);
              setDeepDiveExercise(ex.name);
            }}
            onOpenSwapModal={(ex: any) => setSwapModalFor(ex)}
            onOpenEditExercise={(ex: any) => setEditExerciseFor(ex)}
          />
        )}
      />

      {/* ── Edit Exercise Targets Sheet ── */}
      <LazySheet
        visible={Boolean(editExerciseFor)}
        render={() => (
          <EditExerciseSheet
            visible={!!editExerciseFor}
            exercise={editExerciseFor}
            subtitle={activePlanDay?.name ? `Today · ${activePlanDay.name}` : headerDateText}
            showSaveToPlanToggle={Boolean(activePlanDay && !activePlanDay.isRest)}
            defaultSaveToPlan={true}
            onClose={() => setEditExerciseFor(null)}
            onSave={(updates: EditExerciseUpdates) => {
              if (!editExerciseFor) return;
              const targetIdx =
                typeof editExerciseFor._idx === 'number'
                  ? editExerciseFor._idx
                  : activeExercises.findIndex(
                      (item: any) =>
                        (item.exerciseId || item.id) === (editExerciseFor.exerciseId || editExerciseFor.id) &&
                        item.name === editExerciseFor.name
                    );

              if (targetIdx >= 0) {
                const currentEx = activeExercises[targetIdx] || editExerciseFor;
                const existingSets = Array.isArray(currentEx.setsLog) ? currentEx.setsLog : [];
                const nextSetsLog = existingSets.slice(0, updates.targetSets).map((s: any, idx: number) => ({
                  ...s,
                  setNumber: idx + 1,
                }));
                if (nextSetsLog.length < updates.targetSets) {
                  const fallbackSet = nextSetsLog[nextSetsLog.length - 1] || currentEx.lastSessionSets?.[0];
                  const defaultReps = parseInt(String(updates.targetReps).split(/[-–—]/)[0], 10) || 8;
                  for (let i = nextSetsLog.length; i < updates.targetSets; i++) {
                    nextSetsLog.push({
                      setNumber: i + 1,
                      reps: fallbackSet?.reps ?? defaultReps,
                      weight: fallbackSet?.weight ?? null,
                      completed: false,
                    });
                  }
                }
                updateExercise(targetIdx, {
                  ...currentEx,
                  exerciseId: currentEx.exerciseId || currentEx.id || `ex_${Date.now()}`,
                  name: updates.name,
                  muscle: updates.muscle,
                  targetSets: updates.targetSets,
                  targetReps: updates.targetReps,
                  restTimeSecs: updates.restTimeSecs,
                  setsLog: nextSetsLog,
                });
              }

              if (updates.saveToPlan && activePlanDay && !activePlanDay.isRest && activePlanDay.dayIndex) {
                const basePlanExs = Array.isArray(activePlanDay.exercises) ? activePlanDay.exercises : [];
                let matchedInPlan = false;
                const nextPlanExs = basePlanExs.map((pEx: any) => {
                  const idMatch =
                    Boolean(pEx.id) &&
                    (pEx.id === editExerciseFor.exerciseId || pEx.id === editExerciseFor.id);
                  const nameMatch = pEx.name === editExerciseFor.name;
                  if (!matchedInPlan && (idMatch || nameMatch)) {
                    matchedInPlan = true;
                    return {
                      ...pEx,
                      name: updates.name,
                      muscle: updates.muscle,
                      targetSets: updates.targetSets,
                      targetReps: updates.targetReps,
                      restTimeSecs: updates.restTimeSecs,
                    };
                  }
                  return pEx;
                });
                if (matchedInPlan) {
                  updateMasterPlan(activePlanDay.dayIndex, {
                    ...activePlanDay,
                    exercises: nextPlanExs,
                  });
                }
              }
              setEditExerciseFor(null);
            }}
          />
        )}
      />

      <LazySheet
        visible={Boolean(swapModalFor)}
        render={() => (
          <ActiveSwapModal
            visible={Boolean(swapModalFor)}
            exercise={swapModalFor}
            aiSwapList={swapModalFor ? getExerciseSwapAlternatives(swapModalFor.name, swapModalFor.muscle) : []}
            isAiSwapLoading={false}
            colors={colors}
            styles={s}
            onClose={() => setSwapModalFor(null)}
            onSelectSwap={(alt: any) => {
              if (!swapModalFor) return;
              const baseList = (log?.exercises && log.exercises.length > 0) ? log.exercises : activeExercises;
              const targetIdx = typeof swapModalFor._idx === 'number'
                ? swapModalFor._idx
                : baseList.findIndex((e: any) =>
                    (Boolean(e.exerciseId) && Boolean(swapModalFor.exerciseId) && e.exerciseId === swapModalFor.exerciseId) ||
                    e.name === swapModalFor.name
                  );
              if (targetIdx < 0) {
                setSwapModalFor(null);
                return;
              }
              const targetEx: any = baseList[targetIdx];
              const swappedEx: any = {
                ...targetEx,
                exerciseId: alt.id || alt.exerciseId || targetEx.exerciseId,
                name: alt.name,
                muscle: alt.targetMuscle || alt.muscle || targetEx.muscle,
                notes: `Swapped from ${swapModalFor.name}`,
              };
              if (log?.exercises && log.exercises.length > 0) {
                const updated = baseList.map((e: any, idx: number) =>
                  idx === targetIdx ? swappedEx : e
                );
                reorderExercisesFull(updated as any);
              } else {
                updateExercise(targetIdx, swappedEx as any);
              }
              setSwapModalFor(null);
              hapticSuccess();
            }}
          />
        )}
      />

    </ScreenWrapper>
  );
});

export default GymHomeScreen;
