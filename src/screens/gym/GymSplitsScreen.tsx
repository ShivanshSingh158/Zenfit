/**
 * GymSplitsScreen.tsx — ZenFit
 *
 * Tab 2: Plan Hub (Zero-Clutter Apple iOS HIG Architecture)
 * Modular Orchestrator Shell (<350 lines):
 * - ScheduleTab: "How you train", 7 stacked day cards, weekly volume
 * - RoutinesTab: Saved custom routines library + Curated splits explore
 * - ProgrammesTab: Multi-week periodized mesocycles
 * - Lazy-Mounted Modals & Action Sheets
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  DeviceEventEmitter,
  InteractionManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../../contexts/ThemeContext';
import { DARK_TOKENS, FONT_FAMILY, ICON, RADIUS, SPACE, ThemeTokens } from '../../theme/tokens';
import {
  AnimatedSubTabPane,
  ScreenWrapper,
  TabScreenHeader,
  TactileButton,
} from '../../components/ui';
import BottomSheet from '../../components/ui/BottomSheet';
import { LazySheet } from '../../hooks/useLazySheetMount';
import { afterSheetDismiss, cancelScheduledSheetHandoff } from '../../utils/sheetCoordinator';
import { IOSSegmentedControl } from '../../components/ui/IOSSegmentedControl';
import { useScreenReplayTrigger } from '../../hooks/useScreenReplayTrigger';
import { useGymPlan, useGymLogs, setWorkoutActiveGlobal } from '../../contexts/domains/WellnessContext';
import { getRotationNextDayIndex, getWorkoutDaysInRotation } from '../../services/gymRotationService';
import { GYM_PLAN, GYM_PLAN_ARNOLD, WEEKDAY_TO_PLAN, getCustomPlanDay, resolvePlanDay, getCuratedSplitById } from '../../data/gymPlan';
import { CURATED_SPLITS, CuratedSplit, REST_DAY_TEMPLATE } from '../../data/curatedSplits';
import { GymDayLog, GymExerciseLog, GymPlanCardio, GymPlanDay, GymPlanExercise, GymRoutine, UserGymProgramme } from '../../types/gym.types';
import { hapticLight, hapticMedium, hapticSuccess, hapticSelection } from '../../utils/haptics';
import {
  buildExerciseHistoryIndex,
  getCanonicalExerciseName,
  normalizeExerciseKey,
  resolveExerciseTargetMuscle,
} from '../../utils/gymUtils';
import { setL1Sync, deleteL1Sync } from '../../utils/bootManifest';
import { executeFirestoreLogWrite, mapPlanCardioToLogs, todayStr } from '../../hooks/useGymLog';
import { useGymProfile } from '../../hooks/useGymProfile';
import { useCoreData } from '../../contexts/domains/CoreDataContext';

// Styles
import { getSplitsPalette, useSplitsStyles } from './splits/styles/gymSplitsStyles';

// Modular Tabs
import ScheduleTab from './splits/tabs/ScheduleTab';
const RoutinesTab = React.lazy(() => import('./splits/tabs/RoutinesTab'));
const ProgrammesTab = React.lazy(() => import('./splits/tabs/ProgrammesTab'));

// Modular Modals & Sheets (Lazy Evaluated + Lazy Mounted)
import type { ActionSheetConfig, ActionSheetOption } from './splits/modals/GymActionSheet';
import type { EditExerciseUpdates } from '../../components/Gym/exercise/EditExerciseSheet';

const DayDetailModal = React.lazy(() => import('./splits/modals/DayDetailModal'));
const AssignRoutineModal = React.lazy(() => import('./splits/modals/AssignRoutineModal'));
const SwapRoutineModal = React.lazy(() => import('./splits/modals/SwapRoutineModal'));
const TimePresetModal = React.lazy(() => import('./splits/modals/TimePresetModal'));
const GymActionSheet = React.lazy(() => import('./splits/modals/GymActionSheet'));
const SplitInspectorModal = React.lazy(() => import('./splits/modals/SplitInspectorModal'));
const MesocycleModal = React.lazy(() => import('./splits/modals/MesocycleModal'));
const RoutineEditorModal = React.lazy(() => import('../../components/Gym/schedule/RoutineEditorModal'));
const GymScheduleSettingsModal = React.lazy(() => import('../../components/Gym/schedule/GymScheduleSettingsModal'));
const AddExerciseModal = React.lazy(() => import('../../components/Gym/exercise/AddExerciseModal'));
const EditExerciseSheet = React.lazy(() => import('../../components/Gym/exercise/EditExerciseSheet'));
const AddCardioModal = React.lazy(() => import('../../components/Gym/cardio/AddCardioModal'));
const LogCardioModal = React.lazy(() => import('../../components/Gym/cardio/LogCardioModal'));

type PlanSubTab = 'schedule' | 'routines' | 'programmes' | 'explore';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT_TWO = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const QUICK_TIME_PRESETS = [
  { label: 'Morning', icon: 'sunny' as const, time: '05:30', end: '07:00' },
  { label: 'Afternoon', icon: 'partly-sunny' as const, time: '15:30', end: '17:00' },
  { label: 'Evening', icon: 'sunset' as const, time: '17:30', end: '19:00' },
  { label: 'Night', icon: 'moon' as const, time: '19:30', end: '21:00' },
];

const getPhaseColor = (phaseType?: string, tokens: ThemeTokens = DARK_TOKENS) => {
  switch (phaseType) {
    case 'accumulation':
      return { bg: tokens.status.infoDim, text: tokens.status.info, dot: tokens.status.info };
    case 'intensification':
      return { bg: tokens.status.warningDim, text: tokens.status.warning, dot: tokens.status.warning };
    case 'peak':
      return { bg: tokens.status.dangerDim, text: tokens.status.danger, dot: tokens.status.danger };
    case 'deload':
      return { bg: tokens.status.successDim, text: tokens.status.success, dot: tokens.status.success };
    default:
      return { bg: tokens.bg.elevated, text: tokens.text.secondary, dot: tokens.text.muted };
  }
};

export default function GymSplitsScreen({ route }: any) {
  const { isDark, tokens } = useTheme();
  const styles = useSplitsStyles();
  const palette = getSplitsPalette(tokens, isDark);
  const navigation = useNavigation<any>();
  const {
    userGymPlan,
    updateMasterPlan,
    updateFullMasterPlan,
    saveCustomRoutine,
    deleteCustomRoutine,
    assignRoutineToDay,
    setScheduleMode,
    setActiveProgramme,
  } = useGymPlan();
  const { gymLogs, optimisticUpdateGymLog, optimisticAddGymLog } = useGymLogs();
  const { gymProfile } = useGymProfile();
  const { user } = useCoreData();

  // ── Sub-Tab State ──────────────────────────────────────────────────────────
  const resolveTabName = (tab?: string): PlanSubTab => {
    if (!tab) return 'schedule';
    if (tab === 'mesocycles' || tab === 'mesocycle' || tab === 'programmes' || tab === 'programme' || tab === 'programs' || tab === 'program') {
      return 'programmes';
    }
    if (tab === 'routines' || tab === 'explore') {
      return tab as PlanSubTab;
    }
    return 'schedule';
  };

  const [activeTab, setActiveTab] = useState<PlanSubTab>(resolveTabName(route?.params?.initialTab));
  const [isEditPlanMode, setIsEditPlanMode] = useState(false);
  const [dayDetailModalVisible, setDayDetailModalVisible] = useState(false);
  const { replayKey } = useScreenReplayTrigger();

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(resolveTabName(route.params.initialTab));
    }
  }, [route?.params?.initialTab]);

  const scheduleMode = userGymPlan?.scheduleMode || 'calendar';
  const isRotation = scheduleMode === 'rotation';
  const rotationDays = useMemo(() => isRotation ? getWorkoutDaysInRotation(userGymPlan) : [], [isRotation, userGymPlan]);
  const nextUpDayIndex = useMemo(() => isRotation ? getRotationNextDayIndex(userGymPlan, gymLogs) : null, [isRotation, userGymPlan, gymLogs]);

  const [isHeavyReady, setIsHeavyReady] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setIsHeavyReady(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  // ── Modals & Sheets State ──────────────────────────────────────────────────
  const [showScheduleSettings, setShowScheduleSettings] = useState(false);
  const [routineEditorVisible, setRoutineEditorVisible] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<GymRoutine | null>(null);
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);

  // Day Selector (1 = Monday, 7 = Sunday)
  const currentDayOfWeek = new Date().getDay();
  const defaultDayIndex = currentDayOfWeek === 0 ? 7 : currentDayOfWeek;
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(defaultDayIndex);

  // Quick Time Picker Modal State
  const [timePickerDayIndex, setTimePickerDayIndex] = useState<number | null>(null);

  // Add Exercise / Cardio to Plan Modal State
  const [showPlanAddModal, setShowPlanAddModal] = useState(false);
  const [showPlanCardioModal, setShowPlanCardioModal] = useState(false);

  // Assign Routine to Day Picker State
  const [assignRoutineTarget, setAssignRoutineTarget] = useState<GymRoutine | null>(null);

  // Swap Routine for Day Picker State
  const [swapTargetDayIndex, setSwapTargetDayIndex] = useState<number | null>(null);

  // Custom Apple-Style Action Sheet State
  const [actionSheetConfig, setActionSheetConfig] = useState<ActionSheetConfig | null>(null);

  // Explore Filter
  const [exploreFilter, setExploreFilter] = useState('All');

  // Split Deep-Dive Inspector Modal State
  const [inspectSplitTarget, setInspectSplitTarget] = useState<CuratedSplit | null>(null);

  // Mesocycle Curriculum & Roadmap Sheet State
  const [inspectProgrammeTarget, setInspectProgrammeTarget] = useState<UserGymProgramme | null>(null);

  // Plan Exercise / Cardio Quick-Edit Sheet State
  const [planEditExercise, setPlanEditExercise] = useState<{ dayIndex: number; exIndex: number; ex: any } | null>(null);
  const [planEditCardio, setPlanEditCardio] = useState<{ dayIndex: number; cardioIndex: number; cardio: GymPlanCardio } | null>(null);

  // Unified In-App Confirmation Sheet State (replaces native Alert dialogs)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    primaryLabel: string;
    primaryDestructive?: boolean;
    onPrimary: () => void | Promise<void>;
    secondaryLabel?: string;
    onSecondary?: () => void | Promise<void>;
    cancelLabel?: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      cancelScheduledSheetHandoff();
    };
  }, []);

  const activeTemplate = userGymPlan?.templateId || 'ppl';

  const splitTitle = useMemo(() => {
    const customName = (userGymPlan as any)?.name;
    if (customName) return customName;
    if (activeTemplate === 'arnold' || activeTemplate === 'arnold_6day') return 'Arnold Split';
    if (activeTemplate === 'ppl' || activeTemplate === 'ppl_6day') return 'Push / Pull / Legs';
    if (activeTemplate === 'upper_lower' || activeTemplate === 'upper_lower_4day') return 'Upper / Lower';
    if (activeTemplate === 'full_body' || activeTemplate === 'full_body_3day') return 'Full Body';
    if (activeTemplate === 'bro_split' || activeTemplate === 'bro_split_5day') return '5-Day Bro Split';
    if (activeTemplate === 'pplul') return 'PPL + Upper / Lower';
    if (activeTemplate === 'torso_limbs') return 'Torso / Limbs';
    return 'Weekly Split';
  }, [(userGymPlan as any)?.name, activeTemplate]);

  // Build resolved 7-day schedule
  const resolvedDays = useMemo(() => {
    const days: { dayIndex: number; dayName: string; planDay: GymPlanDay }[] = [];
    for (let i = 1; i <= 7; i++) {
      days.push({ dayIndex: i, dayName: DAY_NAMES[i - 1], planDay: resolvePlanDay(userGymPlan, i) });
    }
    return days;
  }, [userGymPlan, activeTemplate]);

  // Currently Selected Day in Schedule
  const activeDay = useMemo(() => {
    return resolvedDays.find(d => d.dayIndex === selectedDayIndex) || resolvedDays[0];
  }, [resolvedDays, selectedDayIndex]);

  const defaultDayForActive = useMemo(() => {
    const curatedSplit = getCuratedSplitById(activeTemplate);
    if (curatedSplit) {
      const workoutId = curatedSplit.defaultDayMap?.[activeDay.dayIndex];
      if (workoutId && workoutId !== 'rest') {
        const workout = curatedSplit.workouts.find(w => w.id === workoutId);
        if (workout) {
          return {
            dayIndex: activeDay.dayIndex,
            routineId: workout.id,
            name: workout.name,
            subtitle: workout.subtitle,
            focus: workout.focus,
            isRest: false,
            exercises: workout.exercises,
          } as GymPlanDay;
        }
      } else if (workoutId === 'rest' || !workoutId) {
        return {
          ...REST_DAY_TEMPLATE,
          dayIndex: activeDay.dayIndex,
        } as GymPlanDay;
      }
    }
    const defaultDayId = WEEKDAY_TO_PLAN[activeDay.dayIndex] || 1;
    const basePlan = activeTemplate === 'arnold' ? GYM_PLAN_ARNOLD : GYM_PLAN;
    return basePlan.find(d => d.dayIndex === defaultDayId) || GYM_PLAN.find(d => d.dayIndex === defaultDayId);
  }, [activeDay.dayIndex, activeTemplate]);

  const isDayModifiedFromDefault = useMemo(() => {
    if (Boolean(userGymPlan?.customDays?.[activeDay.dayIndex])) return true;
    if (!defaultDayForActive) return false;
    if (activeDay.planDay.name !== defaultDayForActive.name) return true;
    if ((activeDay.planDay.exercises || []).length !== (defaultDayForActive.exercises || []).length) return true;
    if ((activeDay.planDay.cardio || []).length !== (defaultDayForActive.cardio || []).length) return true;
    return false;
  }, [userGymPlan?.customDays, activeDay, defaultDayForActive]);

  const trainingDaysCount = useMemo(() => {
    return resolvedDays.filter(
      d => !d.planDay.isRest && ((d.planDay.exercises?.length || 0) > 0 || (d.planDay.cardio?.length || 0) > 0)
    ).length;
  }, [resolvedDays]);

  // User Custom Routines list (strictly manual/custom user routines, excluding curated split workouts)
  const customRoutinesList = useMemo<GymRoutine[]>(() => {
    if (!userGymPlan?.routines) return [];
    const curatedWorkoutIds = new Set(
      CURATED_SPLITS.flatMap(s => s.workouts.map(w => w.id))
    );
    return Object.values(userGymPlan.routines)
      .filter(rt => !curatedWorkoutIds.has(rt.id) && !(rt as any).isCuratedSplit)
      .sort((a, b) => {
        if (typeof a.order === 'number' && typeof b.order === 'number') {
          return a.order - b.order;
        }
        if (typeof a.order === 'number') return -1;
        if (typeof b.order === 'number') return 1;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
  }, [userGymPlan?.routines]);

  // Reorder custom routines
  const handleMoveRoutine = useCallback(async (fromIdx: number, direction: 'up' | 'down') => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= customRoutinesList.length) return;
    hapticSelection();

    const rtA = customRoutinesList[fromIdx];
    const rtB = customRoutinesList[toIdx];

    const orderA = typeof rtB.order === 'number' ? rtB.order : toIdx;
    const orderB = typeof rtA.order === 'number' ? rtA.order : fromIdx;

    await Promise.all([
      saveCustomRoutine({ ...rtA, order: orderA }),
      saveCustomRoutine({ ...rtB, order: orderB }),
    ]);
  }, [customRoutinesList, saveCustomRoutine]);

  // Weekly Planned Volume Audit
  const weeklyPlannedAudit = useMemo(() => {
    let totalSets = 0;
    const muscleMap: Record<string, number> = {};

    for (const d of resolvedDays) {
      if (d.planDay.isRest) continue;
      for (const ex of d.planDay.exercises || []) {
        const sets = Number(ex.targetSets) || 3;
        totalSets += sets;
        const m = ex.muscle?.split('/')[0]?.trim() || 'Other';
        muscleMap[m] = (muscleMap[m] || 0) + sets;
      }
    }

    const topMuscles = Object.entries(muscleMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([m, s]) => `${m}: ${s}s`);

    return { totalSets, topMuscles };
  }, [resolvedDays]);

  // Filtered Curated Splits for Explore
  const filteredCuratedSplits = useMemo(() => {
    if (exploreFilter === 'All') return CURATED_SPLITS;
    const daysNum = parseInt(exploreFilter, 10);
    return CURATED_SPLITS.filter(s => s.daysPerWeek === daysNum);
  }, [exploreFilter]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAssignRoutineToDay = useCallback(
    async (dayIndex: number, routineId?: string, routine?: GymRoutine) => {
      await assignRoutineToDay(dayIndex, routineId, routine);
      hapticSuccess();
      setAssignRoutineTarget(null);
      setSelectedDayIndex(dayIndex);
    },
    [assignRoutineToDay]
  );

  const handleToggleRest = useCallback(
    (dayIndex: number) => {
      const targetDay = resolvedDays.find(d => d.dayIndex === dayIndex);
      if (!targetDay) return;
      hapticLight();
      const currentlyRest = Boolean(targetDay.planDay.isRest);
      const updatedPlanDay: GymPlanDay = {
        ...targetDay.planDay,
        isRest: !currentlyRest,
        name: !currentlyRest
          ? 'Rest & Recovery'
          : targetDay.planDay.name === 'Rest & Recovery'
          ? `Workout Day ${dayIndex}`
          : targetDay.planDay.name,
        focus: !currentlyRest ? 'Rest & Recovery' : targetDay.planDay.focus || 'Strength & Hypertrophy',
      };
      updateMasterPlan(dayIndex, updatedPlanDay, true);
      hapticSuccess();
    },
    [resolvedDays, updateMasterPlan]
  );

  const handleCreateRoutine = useCallback(() => {
    hapticMedium();
    setEditingRoutine(null);
    setEditingDayIndex(activeTab === 'schedule' ? (selectedDayIndex || null) : null);
    setRoutineEditorVisible(true);
  }, [activeTab, selectedDayIndex]);

  const handleEditRoutine = useCallback((routine: GymRoutine) => {
    hapticLight();
    setEditingRoutine(routine);
    setEditingDayIndex(null);
    setRoutineEditorVisible(true);
  }, []);

  const handleDeleteRoutine = useCallback((routineId: string) => {
    setConfirmDialog({
      title: 'Delete Routine',
      message: 'Are you sure you want to delete this custom workout routine?',
      primaryLabel: 'Delete',
      primaryDestructive: true,
      onPrimary: () => {
        deleteCustomRoutine(routineId);
        hapticSuccess();
      },
    });
  }, [deleteCustomRoutine]);

  const handleDuplicateRoutine = useCallback((routine: GymRoutine) => {
    hapticLight();
    const duplicated: GymRoutine = {
      ...routine,
      id: `rt_${Date.now()}`,
      name: `${routine.name} (Copy)`,
      updatedAt: Date.now(),
    };
    saveCustomRoutine(duplicated);
    hapticSuccess();
  }, [saveCustomRoutine]);

  const launchAdHocRoutine = useCallback((routine?: GymRoutine | GymPlanDay) => {
    const todayDateStr = todayStr();
    const routineExercises = (routine && 'exercises' in routine && Array.isArray(routine.exercises)) ? routine.exercises : [];
    const routineCardio = (routine && 'cardio' in routine && Array.isArray(routine.cardio)) ? routine.cardio : [];
    if (!routine || (routineExercises.length === 0 && routineCardio.length === 0)) {
      navigation.navigate('ActiveLogging', { date: todayDateStr });
      return;
    }

    const todayDayIdx = currentDayOfWeek === 0 ? 7 : currentDayOfWeek;
    const seedIdx = buildExerciseHistoryIndex(gymLogs || [], todayDateStr);
    const seededExercises: GymExerciseLog[] = routineExercises.map((e, idx) => {
      const canonicalName = getCanonicalExerciseName(e.name);
      const prevSession = seedIdx.get(normalizeExerciseKey(canonicalName));
      const lastSets = prevSession?.sets || null;
      const lastValidSet = lastSets && lastSets.length > 0 ? lastSets[lastSets.length - 1] : null;
      const targetSetsNum = Number(e.targetSets) || 3;
      const defaultTargetReps = parseInt(String(e.targetReps || '8-12').split(/[-–—]/)[0], 10) || 8;
      return {
        _idx: idx,
        exerciseId: e.id || `ex_${normalizeExerciseKey(canonicalName)}`,
        name: canonicalName,
        targetSets: targetSetsNum,
        targetReps: e.targetReps || '8-12',
        muscle: resolveExerciseTargetMuscle(canonicalName, e.muscle).targetMuscle,
        videoId: e.videoId || '',
        restTimeSecs: e.restTimeSecs || 90,
        lastSessionSets: lastSets ?? undefined,
        setsLog: Array.from({ length: targetSetsNum }, (_, i) => {
          const lastSet = lastSets?.[i] || lastValidSet;
          const setWeight = (lastSet?.weight != null && Number(lastSet.weight) >= 0) ? Number(lastSet.weight) : null;
          return {
            setNumber: i + 1,
            reps: lastSet?.reps ? Number(lastSet.reps) : defaultTargetReps,
            weight: setWeight,
            completed: false,
          };
        }),
      };
    });

    const effectiveUid = user?.uid || 'local_user';
    const existingToday = (gymLogs || []).find(l => l.date === todayDateStr);
    const logId = existingToday?.id || `${effectiveUid}_${todayDateStr}`;
    const now = Date.now();
    const keptCompletedCardio = (existingToday?.cardio || []).filter(c => Boolean(c.completed));
    const seededCardio = routineCardio.length > 0
      ? [...keptCompletedCardio, ...mapPlanCardioToLogs(routineCardio)]
      : (existingToday?.cardio || []);
    const isCardioOnly = seededExercises.length === 0 && seededCardio.length > 0;
    const isReplacingCompleted = Boolean(existingToday?.completed);
    const adHocLog: GymDayLog = {
      ...(existingToday || {}),
      id: logId,
      userId: existingToday?.userId || user?.uid || effectiveUid,
      date: todayDateStr,
      dayPlanIndex: existingToday?.dayPlanIndex ?? todayDayIdx,
      exercises: seededExercises,
      cardio: seededCardio,
      completed: false,
      workoutStartTime: isCardioOnly ? undefined : now,
      createdAt: (existingToday as any)?.createdAt || now,
      updatedAt: now,
    };
    delete (adHocLog as any).revertedAt;
    delete (adHocLog as any).workoutDurationMinutes;
    delete (adHocLog as any).workoutDurationSeconds;
    delete (adHocLog as any).startTime;
    delete (adHocLog as any).endTime;
    delete (adHocLog as any).restTimerStartTime;
    delete (adHocLog as any).restTimerDurationSecs;
    delete (adHocLog as any).restTimerExerciseName;
    if (isCardioOnly) {
      delete (adHocLog as any).workoutStartTime;
    }

    if (isReplacingCompleted || isCardioOnly) {
      deleteL1Sync(`@zenfit_hot_log_${todayDateStr}`);
      AsyncStorage.multiRemove(['@gym_last_completed_session', `@zenfit_hot_log_${todayDateStr}`]).catch(() => {});
    }

    // Seed ad-hoc session into daily draft + optimistic gymLogs only (master weekly split untouched)
    setL1Sync(`gym_active_draft_${logId}`, adHocLog);
    if (user?.uid) {
      setL1Sync(`gym_active_draft_${user.uid}_${todayDateStr}`, adHocLog);
    }
    setL1Sync(`gym_active_draft_${todayDateStr}`, adHocLog);
    try {
      const serialized = JSON.stringify(adHocLog);
      AsyncStorage.setItem(`gym_active_draft_${logId}`, serialized).catch(() => {});
      if (user?.uid) {
        AsyncStorage.setItem(`gym_active_draft_${user.uid}_${todayDateStr}`, serialized).catch(() => {});
      }
      AsyncStorage.setItem(`gym_active_draft_${todayDateStr}`, serialized).catch(() => {});
    } catch {}

    InteractionManager.runAfterInteractions(() => {
      if (existingToday) {
        optimisticUpdateGymLog(logId, adHocLog as any);
      } else {
        optimisticAddGymLog(adHocLog as any);
      }
      if (!isCardioOnly) {
        setWorkoutActiveGlobal(true, now, todayDateStr);
      } else if (isReplacingCompleted || existingToday?.workoutStartTime) {
        setWorkoutActiveGlobal(false);
      }
      DeviceEventEmitter.emit('gym_log_local_mutation', {
        date: todayDateStr,
        log: adHocLog,
        isSwap: true,
        isRevert: isReplacingCompleted && isCardioOnly,
        senderId: 'gym_splits_adhoc_start',
      });
      if (user?.uid || isReplacingCompleted) {
        executeFirestoreLogWrite(logId, adHocLog, [
          'revertedAt',
          'workoutDurationMinutes',
          'workoutDurationSeconds',
          'startTime',
          'endTime',
          'restTimerStartTime',
          'restTimerDurationSecs',
          'restTimerExerciseName',
          ...(isCardioOnly ? ['workoutStartTime'] : []),
        ]).catch(() => {});
      }
    });
    if (isCardioOnly) {
      navigation.navigate('Today');
    } else {
      navigation.navigate('ActiveLogging', { date: todayDateStr });
    }
  }, [currentDayOfWeek, gymLogs, user?.uid, optimisticUpdateGymLog, optimisticAddGymLog, navigation]);

  const handleStartWorkout = useCallback((routine?: GymRoutine | GymPlanDay) => {
    hapticMedium();
    const todayDateStr = todayStr();
    const existingToday = (gymLogs || []).find(l => l.date === todayDateStr);
    const hasProgress = Boolean(
      existingToday &&
      (existingToday.completed ||
        existingToday.workoutStartTime ||
        (existingToday.exercises || []).some(ex => (ex.setsLog || []).some(s => s.completed)))
    );

    const hasRoutineItems = Boolean(
      routine &&
      (('exercises' in routine && Array.isArray(routine.exercises) && routine.exercises.length > 0) ||
        ('cardio' in routine && Array.isArray(routine.cardio) && routine.cardio.length > 0))
    );

    if (hasProgress && routine && hasRoutineItems) {
      const rName = routine.name || 'this routine';
      setConfirmDialog({
        title: existingToday?.completed ? "Replace Today's Workout?" : 'Workout In Progress',
        message: existingToday?.completed
          ? `Start "${rName}" for today's session? Your weekly split will stay unchanged.`
          : `You have an active session today. Switch today's workout to "${rName}" or resume your current session? Your weekly split will stay unchanged.`,
        primaryLabel: `Start ${rName}`,
        primaryDestructive: true,
        onPrimary: () => launchAdHocRoutine(routine),
        secondaryLabel: existingToday?.completed ? undefined : 'Resume Current',
        onSecondary: existingToday?.completed
          ? undefined
          : () => navigation.navigate('ActiveLogging', { date: todayDateStr }),
      });
      return;
    }

    launchAdHocRoutine(routine);
  }, [gymLogs, launchAdHocRoutine, navigation]);

  const handleOpenRoutineOptionsMenu = useCallback((rt: GymRoutine, rtIdx: number) => {
    hapticLight();
    const options: ActionSheetOption[] = [
      {
        icon: 'edit',
        label: 'Edit Routine',
        subtitle: 'Modify name, target muscles & exercises',
        onPress: () => handleEditRoutine(rt),
      },
      {
        icon: 'copy',
        label: 'Duplicate Routine',
        subtitle: 'Create a copy of this routine template',
        onPress: () => handleDuplicateRoutine(rt),
      },
    ];

    if (rtIdx > 0) {
      options.push({
        icon: 'up',
        label: 'Move Up',
        subtitle: 'Shift routine higher in library',
        onPress: () => handleMoveRoutine(rtIdx, 'up'),
      });
    }
    if (rtIdx < customRoutinesList.length - 1) {
      options.push({
        icon: 'down',
        label: 'Move Down',
        subtitle: 'Shift routine lower in library',
        onPress: () => handleMoveRoutine(rtIdx, 'down'),
      });
    }

    options.push({
      icon: 'trash',
      label: 'Delete Routine',
      subtitle: 'Permanently remove from library',
      isDestructive: true,
      onPress: () => handleDeleteRoutine(rt.id),
    });

    setActionSheetConfig({
      title: rt.name,
      subtitle: `${rt.exercises?.length || 0} exercises · ${(rt.exercises || []).reduce((acc, ex) => acc + (Number(ex.targetSets) || 3), 0)} sets${(rt.cardio?.length || 0) > 0 ? ` · ${rt.cardio?.length} cardio` : ''}`,
      options,
    });
  }, [customRoutinesList.length, handleMoveRoutine, handleEditRoutine, handleDuplicateRoutine, handleDeleteRoutine]);

  const handleApplySplit = useCallback(async (split: CuratedSplit) => {
    const openConfirm = () =>
      setConfirmDialog({
        title: `Apply ${split.name}?`,
        message: `This will replace your current 7-day schedule with ${split.name} (${split.daysPerWeek} days/week). Your saved custom routines will stay intact.`,
        primaryLabel: `Apply ${split.name}`,
        primaryDestructive: true,
        onPrimary: async () => {
          hapticSuccess();
          const customDays: Record<number, GymPlanDay> = {};

          // 1. Map the 7 days of the schedule directly from the curated split
          for (let dayIndex = 1; dayIndex <= 7; dayIndex++) {
            const workoutId = split.defaultDayMap[dayIndex];
            if (!workoutId || workoutId === 'rest') {
              customDays[dayIndex] = {
                ...REST_DAY_TEMPLATE,
                dayIndex,
              };
            } else {
              const workout = split.workouts.find(w => w.id === workoutId);
              if (workout) {
                customDays[dayIndex] = {
                  dayIndex,
                  routineId: workout.id,
                  name: workout.name,
                  subtitle: workout.subtitle,
                  focus: workout.focus,
                  isRest: false,
                  exercises: workout.exercises.map(ex => ({
                    ...ex,
                    id: ex.id || `ex_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                  })),
                };
              } else {
                customDays[dayIndex] = {
                  ...REST_DAY_TEMPLATE,
                  dayIndex,
                };
              }
            }
          }

          // 2. Preserve strictly user's custom/manual routines (clean out any curated split workouts)
          const curatedWorkoutIds = new Set(
            CURATED_SPLITS.flatMap(s => s.workouts.map(w => w.id))
          );
          const existingRoutines = userGymPlan?.routines || {};
          const cleanCustomRoutines: Record<string, GymRoutine> = {};
          for (const [id, rt] of Object.entries(existingRoutines)) {
            if (!curatedWorkoutIds.has(id) && !(rt as any).isCuratedSplit) {
              cleanCustomRoutines[id] = rt;
            }
          }

          await updateFullMasterPlan(customDays, split.id, split.name, cleanCustomRoutines);
          setActiveTab('schedule');
        },
      });

    if (inspectSplitTarget) {
      setInspectSplitTarget(null);
      afterSheetDismiss(openConfirm);
    } else {
      openConfirm();
    }
  }, [inspectSplitTarget, userGymPlan?.routines, updateFullMasterPlan]);

  const handleDeleteExerciseFromPlan = useCallback((dayIndex: number, exIndex: number, exName: string) => {
    hapticLight();
    setDayDetailModalVisible(false);
    afterSheetDismiss(() => {
      setConfirmDialog({
        title: 'Remove from Weekly Plan',
        message: `Remove "${exName}" from ${activeDay.dayName} (${activeDay.planDay.name}) for all future weeks?`,
        primaryLabel: 'Remove for All Weeks',
        primaryDestructive: true,
        onPrimary: async () => {
          const currentExercises = activeDay.planDay.exercises || [];
          const updatedExercises = currentExercises.filter((_, idx) => idx !== exIndex);
          const updatedPlanDay: GymPlanDay = {
            ...activeDay.planDay,
            exercises: updatedExercises,
          };
          await updateMasterPlan(dayIndex, updatedPlanDay, true);
          hapticSuccess();
        },
      });
    });
  }, [activeDay, updateMasterPlan]);

  const handleReorderExercisesInPlan = useCallback(async (dayIndex: number, reorderedExercises: any[]) => {
    const targetDay = activeDay?.dayIndex === dayIndex
      ? activeDay.planDay
      : resolvePlanDay(userGymPlan, dayIndex);
    if (!targetDay) return;
    const updatedPlanDay: GymPlanDay = {
      ...targetDay,
      exercises: reorderedExercises,
    };
    await updateMasterPlan(dayIndex, updatedPlanDay, true);
    const routineId = targetDay.routineId;
    const customRoutine = routineId ? userGymPlan?.routines?.[routineId] : undefined;
    if (customRoutine) {
      await saveCustomRoutine(
        {
          ...customRoutine,
          exercises: reorderedExercises,
          updatedAt: Date.now(),
        },
        null
      );
    }
  }, [activeDay, userGymPlan, updateMasterPlan, saveCustomRoutine]);

  const handleDeleteCardioFromPlan = useCallback((dayIndex: number, cardioIndex: number, cardioName: string) => {
    hapticLight();
    setDayDetailModalVisible(false);
    afterSheetDismiss(() => {
      setConfirmDialog({
        title: 'Remove Cardio from Plan',
        message: `Remove "${cardioName}" from ${activeDay.dayName} (${activeDay.planDay.name}) for all future weeks?`,
        primaryLabel: 'Remove for All Weeks',
        primaryDestructive: true,
        onPrimary: async () => {
          const currentCardio = activeDay.planDay.cardio || [];
          const updatedCardio = currentCardio.filter((_, idx) => idx !== cardioIndex);
          const updatedPlanDay: GymPlanDay = {
            ...activeDay.planDay,
            cardio: updatedCardio,
          };
          await updateMasterPlan(dayIndex, updatedPlanDay, true);
          hapticSuccess();
        },
      });
    });
  }, [activeDay, updateMasterPlan]);

  const handleRestoreDefaultDay = useCallback((dayIndex: number) => {
    hapticMedium();
    const defaultDay = defaultDayForActive;
    const exCount = defaultDay?.exercises?.length || 0;

    setConfirmDialog({
      title: `Restore Default ${activeDay.dayName}`,
      message: `Restore ${activeDay.dayName} (${defaultDay?.name || 'Default'}) with all ${exCount} original exercises from your ${splitTitle}? This updates your weekly plan.`,
      primaryLabel: `Restore All ${exCount} Exercises`,
      onPrimary: async () => {
        if (defaultDay) {
          await updateMasterPlan(dayIndex, {
            ...defaultDay,
            exercises: (defaultDay.exercises || []).map(ex => {
              const canonicalName = getCanonicalExerciseName(ex.name);
              return {
                ...ex,
                name: canonicalName,
                muscle: resolveExerciseTargetMuscle(canonicalName, ex.muscle).targetMuscle,
              };
            }),
            cardio: defaultDay.cardio || [],
          }, true);
        } else {
          const newCustomDays = { ...(userGymPlan?.customDays || {}) };
          delete newCustomDays[dayIndex];
          await updateFullMasterPlan(newCustomDays);
        }
        hapticSuccess();
      },
    });
  }, [activeDay, splitTitle, updateMasterPlan, updateFullMasterPlan, userGymPlan?.customDays, defaultDayForActive]);

  const handleOpenDayOptionsMenu = useCallback((dayObj: typeof activeDay) => {
    hapticLight();
    setDayDetailModalVisible(false);
    const dayName = dayObj.dayName;
    const isRest = dayObj.planDay.isRest;
    const exCount = (dayObj.planDay.exercises || []).length;
    const cardioCount = (dayObj.planDay.cardio || []).length;
    const options: ActionSheetOption[] = [];

    if (!isRest) {
      options.push({
        icon: 'edit',
        label: 'Edit Workout',
        subtitle: 'Customize exercises, cardio, sets & reps',
        onPress: () => {
          const routineObj: GymRoutine = {
            id: dayObj.planDay.routineId || `rt_day_${dayObj.dayIndex}`,
            name: dayObj.planDay.name,
            subtitle: dayObj.planDay.subtitle,
            focus: dayObj.planDay.focus,
            exercises: dayObj.planDay.exercises || [],
            cardio: dayObj.planDay.cardio || [],
            updatedAt: Date.now(),
          };
          setEditingRoutine(routineObj);
          setEditingDayIndex(dayObj.dayIndex);
          setRoutineEditorVisible(true);
        },
      });

      if (exCount > 0 || cardioCount > 0) {
        options.push({
          icon: isEditPlanMode ? 'check' : 'trash',
          label: isEditPlanMode ? 'Done Removing' : 'Remove Items',
          subtitle: isEditPlanMode ? 'Hide remove buttons' : 'Tap to remove exercises or cardio from this day',
          onPress: () => {
            hapticLight();
            setIsEditPlanMode(prev => !prev);
            setDayDetailModalVisible(true);
          },
        });
      }
    }

    options.push({
      icon: 'time',
      label: 'Set Training Time',
      subtitle: dayObj.planDay.startTime ? `Scheduled for ${formatTimeSlot(dayObj.planDay.startTime)}` : 'Set workout time & reminder',
      onPress: () => setTimePickerDayIndex(dayObj.dayIndex),
    });

    if (isDayModifiedFromDefault) {
      options.push({
        icon: 'refresh',
        label: 'Reset to Default',
        subtitle: `Reset ${dayName} back to ${splitTitle}`,
        isDestructive: true,
        onPress: () => handleRestoreDefaultDay(dayObj.dayIndex),
      });
    }

    afterSheetDismiss(() => {
      setActionSheetConfig({
        title: `${dayName} Options`,
        subtitle: dayObj.planDay.name || 'Workout Day',
        options,
      });
    });
  }, [isEditPlanMode, isDayModifiedFromDefault, handleRestoreDefaultDay, splitTitle]);

  const handleEnrollProgramme = useCallback((prog: UserGymProgramme) => {
    const openConfirm = () =>
      setConfirmDialog({
        title: `Start ${prog.name}?`,
        message: `Runs for ${prog.totalWeeks} weeks with weekly weight, effort, and recovery targets layered onto your workouts.`,
        primaryLabel: 'Start Plan',
        onPrimary: async () => {
          await setActiveProgramme({
            ...prog,
            currentWeek: 1,
            status: 'active',
            startDate: new Date().toISOString(),
            enrolledAt: Date.now(),
            updatedAt: Date.now(),
          });
          hapticSuccess();
        },
      });

    if (inspectProgrammeTarget) {
      setInspectProgrammeTarget(null);
      afterSheetDismiss(openConfirm);
    } else {
      openConfirm();
    }
  }, [setActiveProgramme, inspectProgrammeTarget]);

  const handleAdvanceWeek = useCallback(async () => {
    const prog = userGymPlan?.activeProgramme;
    if (!prog) return;
    if (prog.currentWeek < prog.totalWeeks) {
      setConfirmDialog({
        title: `Move to Week ${prog.currentWeek + 1}?`,
        message: `Mark Week ${prog.currentWeek} complete and start Week ${prog.currentWeek + 1}?`,
        primaryLabel: `Start Week ${prog.currentWeek + 1}`,
        onPrimary: async () => {
          await setActiveProgramme({
            ...prog,
            currentWeek: prog.currentWeek + 1,
            updatedAt: Date.now(),
          });
          hapticSuccess();
        },
      });
    } else {
      setConfirmDialog({
        title: 'Program Complete!',
        message: `You finished all ${prog.totalWeeks} weeks of ${prog.name}. Restart from Week 1 or finish this program?`,
        primaryLabel: 'Restart Week 1',
        secondaryLabel: 'Finish Plan',
        cancelLabel: 'Keep Active',
        onPrimary: async () => {
          await setActiveProgramme({
            ...prog,
            currentWeek: 1,
            startDate: new Date().toISOString(),
            updatedAt: Date.now(),
          });
          hapticSuccess();
        },
        onSecondary: async () => {
          await setActiveProgramme(null);
          hapticSuccess();
        },
      });
    }
  }, [userGymPlan?.activeProgramme, setActiveProgramme]);

  const handleEndProgramme = useCallback(() => {
    setConfirmDialog({
      title: 'End Active Program?',
      message: 'Your weekly schedule and saved workouts will stay as they are.',
      primaryLabel: 'End Program',
      primaryDestructive: true,
      onPrimary: async () => {
        await setActiveProgramme(null);
        hapticMedium();
      },
    });
  }, [setActiveProgramme]);

  const formatTimeSlot = useCallback((timeStr?: string) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const hour = parseInt(parts[0], 10);
    const mins = parts[1];
    if (isNaN(hour)) return timeStr;
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${mins} ${period}`;
  }, []);

  const handleSelectDay = useCallback((dayIndex: number) => {
    setSelectedDayIndex(dayIndex);
    setDayDetailModalVisible(true);
  }, []);

  const handleAssignRoutineTarget = useCallback((rt: GymRoutine) => {
    setAssignRoutineTarget(rt);
  }, []);

  const handleInspectSplit = useCallback((split: CuratedSplit) => {
    setInspectSplitTarget(split);
  }, []);

  const handleInspectProgramme = useCallback((prog: UserGymProgramme) => {
    setInspectProgrammeTarget(prog);
  }, []);

  const handleCloseDayDetail = useCallback(() => {
    setDayDetailModalVisible(false);
  }, []);

  const handleExitDeleteMode = useCallback(() => {
    setIsEditPlanMode(false);
  }, []);

  const handleAddExerciseFromDetail = useCallback(() => {
    hapticLight();
    setDayDetailModalVisible(false);
    afterSheetDismiss(() => setShowPlanAddModal(true));
  }, []);

  const handleAddCardioFromDetail = useCallback(() => {
    hapticLight();
    setDayDetailModalVisible(false);
    afterSheetDismiss(() => setShowPlanCardioModal(true));
  }, []);

  const handleSwapRoutineFromDetail = useCallback((dIndex: number) => {
    hapticLight();
    setDayDetailModalVisible(false);
    afterSheetDismiss(() => setSwapTargetDayIndex(dIndex));
  }, []);

  const handleEditWorkoutFromDetail = useCallback((dayObj: typeof activeDay) => {
    hapticLight();
    const routineObj: GymRoutine = {
      id: dayObj.planDay.routineId || `rt_day_${dayObj.dayIndex}`,
      name: dayObj.planDay.name,
      subtitle: dayObj.planDay.subtitle,
      focus: dayObj.planDay.focus,
      exercises: dayObj.planDay.exercises || [],
      cardio: dayObj.planDay.cardio || [],
      updatedAt: Date.now(),
    };
    setDayDetailModalVisible(false);
    afterSheetDismiss(() => {
      setEditingRoutine(routineObj);
      setEditingDayIndex(dayObj.dayIndex);
      setRoutineEditorVisible(true);
    });
  }, []);

  const handleEditExerciseFromDetail = useCallback((dayIndex: number, exIndex: number, ex: any) => {
    hapticLight();
    setDayDetailModalVisible(false);
    afterSheetDismiss(() => setPlanEditExercise({ dayIndex, exIndex, ex }));
  }, []);

  const handleEditCardioFromDetail = useCallback((dayIndex: number, cardioIndex: number, cardioItem: GymPlanCardio) => {
    hapticLight();
    setDayDetailModalVisible(false);
    afterSheetDismiss(() => setPlanEditCardio({ dayIndex, cardioIndex, cardio: cardioItem }));
  }, []);

  return (
    <ScreenWrapper edges={['top']} compactTop topAura keyboardAvoiding={false} style={styles.root}>
      {/* ── Unified Screen Header ──────────────────────────────────────── */}
      <TabScreenHeader
        title="Plan"
        subtitle={splitTitle || 'Your weekly routine'}
        rightActions={
          <TactileButton
            variant="custom"
            style={styles.iconBtn}
            onPress={() => setShowScheduleSettings(true)}
            accessibilityLabel="Schedule Reminders"
          >
            <Bell size={16} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
          </TactileButton>
        }
      />

      {/* ── Gliding Segmented Control: [ Schedule | Routines | Programs ] ── */}
      <View style={{ paddingHorizontal: 12, marginBottom: 10 }}>
        <IOSSegmentedControl
          segments={[
            { id: 'schedule', label: 'Schedule' },
            { id: 'routines', label: 'Routines' },
            { id: 'programmes', label: 'Programs' },
          ]}
          activeId={activeTab === 'explore' ? 'routines' : activeTab}
          onSelect={(id) => setActiveTab(id as PlanSubTab)}
          height={36}
        />
      </View>

      {/* ── Gliding Sub-Tabs: [ Schedule | Routines | Programmes ] ── */}
      {(() => {
        const activeSubTabIdx =
          activeTab === 'schedule' ? 0 : activeTab === 'programmes' ? 2 : 1;
        return (
          <View style={{ flex: 1 }}>
            <AnimatedSubTabPane index={0} activeIndex={activeSubTabIdx}>
              <ScheduleTab
                isRotation={isRotation}
                setScheduleMode={setScheduleMode}
                trainingDaysCount={trainingDaysCount}
                resolvedDays={resolvedDays}
                currentDayOfWeek={currentDayOfWeek}
                rotationDays={rotationDays}
                dayShortNames={DAY_SHORT_TWO}
                isDark={isDark}
                replayKey={`${replayKey}-${activeTab}-${isRotation}`}
                onSelectDay={handleSelectDay}
                weeklyPlannedAudit={weeklyPlannedAudit}
              />
            </AnimatedSubTabPane>

            <AnimatedSubTabPane index={1} activeIndex={activeSubTabIdx}>
              <React.Suspense fallback={null}>
                <RoutinesTab
                  customRoutinesList={customRoutinesList}
                  onCreateRoutine={handleCreateRoutine}
                  onOpenRoutineOptions={handleOpenRoutineOptionsMenu}
                  onAssignRoutineTarget={handleAssignRoutineTarget}
                  onStartWorkout={handleStartWorkout}
                  exploreFilter={exploreFilter}
                  onSetExploreFilter={setExploreFilter}
                  filteredCuratedSplits={filteredCuratedSplits}
                  activeTemplate={activeTemplate}
                  onInspectSplit={handleInspectSplit}
                  onApplySplit={handleApplySplit}
                  isDark={isDark}
                />
              </React.Suspense>
            </AnimatedSubTabPane>

            <AnimatedSubTabPane index={2} activeIndex={activeSubTabIdx}>
              <React.Suspense fallback={null}>
                <ProgrammesTab
                  userGymPlan={userGymPlan}
                  getPhaseColor={getPhaseColor}
                  handleAdvanceWeek={handleAdvanceWeek}
                  handleEndProgramme={handleEndProgramme}
                  handleEnrollProgramme={handleEnrollProgramme}
                  onInspectProgramme={handleInspectProgramme}
                  replayKey={`${replayKey}-${activeTab}`}
                />
              </React.Suspense>
            </AnimatedSubTabPane>
          </View>
        );
      })()}

      {/* ── MODALS & SHEETS (Lazy-mounted shells keep closed modals zero-cost while preserving exit springs) ── */}

      {/* 1. Day Detail / Exercise Inspector Modal Sheet */}
      <LazySheet
        visible={dayDetailModalVisible}
        render={() => (
          <DayDetailModal
            visible={dayDetailModalVisible}
            onClose={handleCloseDayDetail}
            activeDay={activeDay}
            isRotation={isRotation}
            rotationDays={rotationDays}
            nextUpDayIndex={nextUpDayIndex}
            currentDayOfWeek={currentDayOfWeek}
            formatTimeSlot={formatTimeSlot}
            handleToggleRest={handleToggleRest}
            handleOpenDayOptionsMenu={handleOpenDayOptionsMenu}
            isHeavyReady={isHeavyReady}
            isEditPlanMode={isEditPlanMode}
            onExitDeleteMode={handleExitDeleteMode}
            handleDeleteExerciseFromPlan={handleDeleteExerciseFromPlan}
            handleDeleteCardioFromPlan={handleDeleteCardioFromPlan}
            onAddExercise={handleAddExerciseFromDetail}
            onAddCardio={handleAddCardioFromDetail}
            onSwapRoutine={handleSwapRoutineFromDetail}
            onEditWorkout={handleEditWorkoutFromDetail}
            onEditExercise={handleEditExerciseFromDetail}
            onEditCardio={handleEditCardioFromDetail}
            onReorderExercises={handleReorderExercisesInPlan}
          />
        )}
      />

      {/* 2. Routine Builder / Editor Modal */}
      <LazySheet
        visible={routineEditorVisible}
        render={() => (
          <RoutineEditorModal
            visible={routineEditorVisible}
            routineToEdit={editingRoutine}
            initialDayIndex={editingDayIndex}
            onClose={() => {
              setRoutineEditorVisible(false);
              afterSheetDismiss(() => {
                setEditingRoutine(null);
                setEditingDayIndex(null);
              });
            }}
            onSave={async (savedRt, targetDayIndex) => {
              await saveCustomRoutine(savedRt, targetDayIndex);
              hapticSuccess();
              setRoutineEditorVisible(false);
              afterSheetDismiss(() => {
                setEditingRoutine(null);
                setEditingDayIndex(null);
              });
              if (targetDayIndex != null && targetDayIndex >= 1 && targetDayIndex <= 7) {
                setSelectedDayIndex(targetDayIndex);
              }
            }}
          />
        )}
      />

      {/* 3. Assign Routine to Day Sheet */}
      <LazySheet
        visible={Boolean(assignRoutineTarget)}
        render={() => (
          <AssignRoutineModal
            target={assignRoutineTarget}
            onClose={() => setAssignRoutineTarget(null)}
            dayNames={DAY_NAMES}
            resolvedDays={resolvedDays}
            onAssign={handleAssignRoutineToDay}
          />
        )}
      />

      {/* 4. Swap Routine for Day Sheet */}
      <LazySheet
        visible={Boolean(swapTargetDayIndex)}
        render={() => (
          <SwapRoutineModal
            dayIndex={swapTargetDayIndex}
            onClose={() => setSwapTargetDayIndex(null)}
            dayNames={DAY_NAMES}
            customRoutinesList={customRoutinesList}
            onSelectRoutine={(dIndex, rId, rt) => {
              handleAssignRoutineToDay(dIndex, rId, rt);
              setSwapTargetDayIndex(null);
              afterSheetDismiss(() => setDayDetailModalVisible(true));
            }}
            onCreateRoutine={() => {
              setSwapTargetDayIndex(null);
              afterSheetDismiss(handleCreateRoutine);
            }}
          />
        )}
      />

      {/* 5. Time Preset Picker Sheet */}
      <LazySheet
        visible={Boolean(timePickerDayIndex)}
        render={() => (
          <TimePresetModal
            dayIndex={timePickerDayIndex}
            onClose={() => setTimePickerDayIndex(null)}
            dayNames={DAY_NAMES}
            resolvedDays={resolvedDays}
            presets={QUICK_TIME_PRESETS}
            onSelectTime={(dIndex, startTime, endTime) => {
              const targetDay = resolvedDays.find(d => d.dayIndex === dIndex);
              if (!targetDay) return;
              const updatedPlanDay: GymPlanDay = {
                ...targetDay.planDay,
                startTime,
                endTime,
              };
              updateMasterPlan(dIndex, updatedPlanDay);
              setTimePickerDayIndex(null);
              afterSheetDismiss(() => setDayDetailModalVisible(true));
            }}
          />
        )}
      />

      {/* 6. Contextual Action Sheet */}
      <LazySheet
        visible={Boolean(actionSheetConfig)}
        render={() => (
          <GymActionSheet
            config={actionSheetConfig}
            onClose={() => setActionSheetConfig(null)}
          />
        )}
      />

      {/* 7. Split Deep-Dive Inspector Modal */}
      <LazySheet
        visible={Boolean(inspectSplitTarget)}
        render={() => (
          <SplitInspectorModal
            split={inspectSplitTarget}
            onClose={() => setInspectSplitTarget(null)}
            onApply={handleApplySplit}
          />
        )}
      />

      {/* 8. Mesocycle Curriculum & Roadmap Sheet */}
      <LazySheet
        visible={Boolean(inspectProgrammeTarget)}
        render={() => (
          <MesocycleModal
            programme={inspectProgrammeTarget}
            onClose={() => setInspectProgrammeTarget(null)}
            activeProgrammeId={userGymPlan?.activeProgramme?.id}
            activeCurrentWeek={userGymPlan?.activeProgramme?.currentWeek}
            onEnroll={handleEnrollProgramme}
            getPhaseColor={getPhaseColor}
          />
        )}
      />

      {/* 9. Schedule Settings & Alarms Modal */}
      <LazySheet
        visible={showScheduleSettings}
        render={() => (
          <GymScheduleSettingsModal
            visible={showScheduleSettings}
            onClose={() => setShowScheduleSettings(false)}
            userGymPlan={userGymPlan}
            onSaveWeekly={updateFullMasterPlan}
          />
        )}
      />

      {/* 10. Add Exercise to Plan Modal */}
      <LazySheet
        visible={showPlanAddModal}
        render={() => (
          <AddExerciseModal
            visible={showPlanAddModal}
            onClose={() => setShowPlanAddModal(false)}
            onAdd={async (newEx: any) => {
              const canonicalName = getCanonicalExerciseName(newEx.name);
              const updatedExercises: GymPlanExercise[] = [
                ...(activeDay.planDay.exercises || []),
                {
                  id: newEx.exerciseId || `ex_plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  name: canonicalName,
                  muscle: resolveExerciseTargetMuscle(canonicalName, newEx.muscle).targetMuscle,
                  targetSets: Number(newEx.targetSets) || 3,
                  targetReps: newEx.targetReps || '8–12',
                  videoId: newEx.videoId,
                  restTimeSecs: newEx.restTimeSecs,
                },
              ];
              const wasRest = Boolean(activeDay.planDay.isRest);
              const updatedPlanDay: GymPlanDay = {
                ...activeDay.planDay,
                name: wasRest && activeDay.planDay.name === 'Rest & Recovery'
                  ? `Workout Day ${activeDay.dayIndex}`
                  : activeDay.planDay.name,
                focus: wasRest ? 'Strength & Hypertrophy' : activeDay.planDay.focus,
                exercises: updatedExercises,
                isRest: false,
              };
              await updateMasterPlan(activeDay.dayIndex, updatedPlanDay, true);
              hapticSuccess();
              setShowPlanAddModal(false);
              afterSheetDismiss(() => setDayDetailModalVisible(true));
            }}
            existingExerciseIds={(activeDay.planDay.exercises || []).map(e => e.id || e.name)}
          />
        )}
      />

      {/* 10b. Add Cardio to Plan Modal */}
      <LazySheet
        visible={showPlanCardioModal}
        render={() => (
          <AddCardioModal
            visible={showPlanCardioModal}
            title={`Add Cardio · ${activeDay.dayName}`}
            showDurationPresets={true}
            onClose={() => {
              setShowPlanCardioModal(false);
              afterSheetDismiss(() => setDayDetailModalVisible(true));
            }}
            onAdd={async (type: string, preset?: { durationMinutes?: number | null }) => {
              const newCardioItem: GymPlanCardio = {
                id: `cardio_plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                type,
                durationMinutes: preset?.durationMinutes ?? null,
              };
              const wasRest = Boolean(activeDay.planDay.isRest);
              const hasExistingExercises = (activeDay.planDay.exercises || []).length > 0;
              const updatedPlanDay: GymPlanDay = {
                ...activeDay.planDay,
                name: wasRest && activeDay.planDay.name === 'Rest & Recovery'
                  ? (hasExistingExercises ? `Workout Day ${activeDay.dayIndex}` : 'Cardio & Conditioning')
                  : activeDay.planDay.name,
                focus: wasRest ? 'Cardio & Recovery' : activeDay.planDay.focus,
                cardio: [...(activeDay.planDay.cardio || []), newCardioItem],
                isRest: false,
              };
              await updateMasterPlan(activeDay.dayIndex, updatedPlanDay, true);
              hapticSuccess();
              setShowPlanCardioModal(false);
              afterSheetDismiss(() => setDayDetailModalVisible(true));
            }}
          />
        )}
      />

      {/* 11. Plan Exercise Quick-Edit Sheet */}
      <LazySheet
        visible={Boolean(planEditExercise)}
        render={() => (
          <EditExerciseSheet
            visible={!!planEditExercise}
            exercise={planEditExercise?.ex || null}
            subtitle={
              planEditExercise
                ? `${DAY_NAMES[planEditExercise.dayIndex - 1] || 'Day'} · ${resolvedDays.find(d => d.dayIndex === planEditExercise.dayIndex)?.planDay?.name || ''}`
                : undefined
            }
            showSaveToPlanToggle={false}
            onClose={() => setPlanEditExercise(null)}
            onSave={async (updates: EditExerciseUpdates) => {
              if (!planEditExercise) return;
              const targetDayObj = resolvedDays.find(d => d.dayIndex === planEditExercise.dayIndex);
              if (targetDayObj) {
                const nextExercises = [...(targetDayObj.planDay.exercises || [])];
                if (nextExercises[planEditExercise.exIndex]) {
                  nextExercises[planEditExercise.exIndex] = {
                    ...nextExercises[planEditExercise.exIndex],
                    name: updates.name,
                    muscle: updates.muscle,
                    targetSets: updates.targetSets,
                    targetReps: updates.targetReps,
                    restTimeSecs: updates.restTimeSecs,
                  };
                  await updateMasterPlan(planEditExercise.dayIndex, {
                    ...targetDayObj.planDay,
                    exercises: nextExercises,
                  }, true);
                  hapticSuccess();
                }
              }
              setPlanEditExercise(null);
              afterSheetDismiss(() => setDayDetailModalVisible(true));
            }}
          />
        )}
      />

      {/* 11b. Plan Cardio Target Edit Sheet */}
      <LazySheet
        visible={Boolean(planEditCardio)}
        render={() => (
          <LogCardioModal
            mode="plan"
            visible={Boolean(planEditCardio)}
            cardio={
              planEditCardio
                ? {
                    id: planEditCardio.cardio.id,
                    type: planEditCardio.cardio.type,
                    durationMinutes: planEditCardio.cardio.durationMinutes ?? null,
                    distanceKm: planEditCardio.cardio.distanceKm ?? null,
                    speedKmh: planEditCardio.cardio.speedKmh ?? null,
                    incline: planEditCardio.cardio.incline ?? null,
                    calories: planEditCardio.cardio.calories ?? null,
                    floors: planEditCardio.cardio.floors ?? null,
                    level: planEditCardio.cardio.level ?? null,
                    laps: planEditCardio.cardio.laps ?? null,
                    rounds: planEditCardio.cardio.rounds ?? null,
                    spm: planEditCardio.cardio.spm ?? null,
                    pace: planEditCardio.cardio.pace ?? null,
                    completed: false,
                  }
                : null
            }
            onClose={() => {
              setPlanEditCardio(null);
              afterSheetDismiss(() => setDayDetailModalVisible(true));
            }}
            onSave={async (updates) => {
              if (!planEditCardio) return;
              const targetDayObj = resolvedDays.find(d => d.dayIndex === planEditCardio.dayIndex);
              if (targetDayObj) {
                const nextCardio = [...(targetDayObj.planDay.cardio || [])];
                if (nextCardio[planEditCardio.cardioIndex]) {
                  nextCardio[planEditCardio.cardioIndex] = {
                    ...nextCardio[planEditCardio.cardioIndex],
                    ...updates,
                  };
                  await updateMasterPlan(planEditCardio.dayIndex, {
                    ...targetDayObj.planDay,
                    cardio: nextCardio,
                  }, true);
                  hapticSuccess();
                }
              }
              setPlanEditCardio(null);
              afterSheetDismiss(() => setDayDetailModalVisible(true));
            }}
          />
        )}
      />

      {/* 12. Unified In-App Confirmation Sheet (Replaces Native Alert Popups) */}
      <LazySheet
        visible={confirmDialog !== null}
        render={() => (
          <BottomSheet
            visible={confirmDialog !== null}
            onClose={() => setConfirmDialog(null)}
            avoidKeyboard={false}
            noPadding={true}
            sheetBackgroundColor={palette.sheetCanvas}
          >
            {confirmDialog ? (
              <View style={{ paddingHorizontal: SPACE[16], paddingTop: SPACE[8], paddingBottom: SPACE[12], gap: SPACE[12] }}>
                <View
                  style={{
                    backgroundColor: palette.sheetSurface,
                    borderRadius: RADIUS.card,
                    padding: SPACE[16],
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: tokens.border.subtle,
                    gap: SPACE[6],
                  }}
                >
                  <Text style={{ fontSize: 17, fontFamily: FONT_FAMILY.bold, color: tokens.text.primary }}>
                    {confirmDialog.title}
                  </Text>
                  <Text style={{ fontSize: 13.5, lineHeight: 19, fontFamily: FONT_FAMILY.regular, color: tokens.text.secondary }}>
                    {confirmDialog.message}
                  </Text>
                </View>

                <View style={{ gap: SPACE[8] }}>
                  <TactileButton
                    variant={confirmDialog.primaryDestructive ? 'danger' : 'primary'}
                    size="lg"
                    label={confirmDialog.primaryLabel}
                    onPress={() => {
                      const action = confirmDialog.onPrimary;
                      setConfirmDialog(null);
                      afterSheetDismiss(() => {
                        void action();
                      });
                    }}
                  />
                  {confirmDialog.secondaryLabel && confirmDialog.onSecondary ? (
                    <TactileButton
                      variant="secondary"
                      size="lg"
                      label={confirmDialog.secondaryLabel}
                      onPress={() => {
                        const action = confirmDialog.onSecondary!;
                        setConfirmDialog(null);
                        afterSheetDismiss(() => {
                          void action();
                        });
                      }}
                    />
                  ) : null}
                  <TactileButton
                    variant="secondary"
                    size="lg"
                    label={confirmDialog.cancelLabel || 'Cancel'}
                    onPress={() => setConfirmDialog(null)}
                  />
                </View>
              </View>
            ) : null}
          </BottomSheet>
        )}
      />
      {/* ── Tab Bar / Body Closing Wrapper ── */}
    </ScreenWrapper>
  );
}
