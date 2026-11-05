/**
 * GymSplitsScreen.tsx — ZenFit
 *
 * Tab 2: Plan Hub (Zero-Clutter Apple iOS HIG Architecture)
 * 3-Part Architecture:
 * - Sub-Tab 1: 📅 Schedule (7-Day Program with Focused Day Inspector & Weekly Volume)
 * - Sub-Tab 2: 📋 Routines (Custom Workout Library with Direct Start & Assignment)
 * - Sub-Tab 3: 🗂️ Explore (Browse Pre-Built Splits & Programs, One-Tap Apply)
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../../contexts/ThemeContext';
import { useGymPlan, useGymLogs } from '../../contexts/domains/WellnessContext';
import { getRotationNextDayIndex, getWorkoutDaysInRotation, getRotationLetterForDay } from '../../services/gymRotationService';
import { GYM_PLAN, GYM_PLAN_ARNOLD, WEEKDAY_TO_PLAN } from '../../data/gymPlan';
import { CURATED_SPLITS, CuratedSplit, REST_DAY_TEMPLATE } from '../../data/curatedSplits';
import { GymPlanDay, GymPlanExercise, GymRoutine, UserGymProgramme } from '../../types/gym.types';
import { hapticLight, hapticMedium, hapticSuccess, hapticSelection } from '../../utils/haptics';
import { getCanonicalExerciseName, resolveExerciseTargetMuscle } from '../../utils/gymUtils';
import { FONT_FAMILY, IOS_DARK } from '../../theme/tokens';
import { todayStr } from '../../hooks/useGymLog';
import { CURATED_PROGRAMMES } from '../../data/curatedProgrammes';
import { generatePersonalizedGymPlan } from '../../services/personalizedPlanService';
import { useGymProfile } from '../../hooks/useGymProfile';
import { useCoreData } from '../../contexts/domains/CoreDataContext';

import { RoutineEditorModal } from '../../components/Gym/schedule/RoutineEditorModal';
import GymScheduleSettingsModal from '../../components/Gym/schedule/GymScheduleSettingsModal';
import { AddExerciseModal } from '../../components/Gym/exercise/AddExerciseModal';
import { PreSessionMuscleHitMap } from '../../components/Gym/schedule/PreSessionMuscleHitMap';

type PlanSubTab = 'schedule' | 'routines' | 'programmes' | 'explore';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const QUICK_TIME_PRESETS = [
  { label: 'Morning', icon: 'sunny-outline', time: '05:30', end: '07:00' },
  { label: 'Afternoon', icon: 'partly-sunny-outline', time: '15:30', end: '17:00' },
  { label: 'Evening', icon: 'sunset-outline', time: '17:30', end: '19:00' },
  { label: 'Night', icon: 'moon-outline', time: '19:30', end: '21:00' },
];

const getPhaseColor = (phaseType?: string) => {
  switch (phaseType) {
    case 'accumulation':
      return { bg: 'rgba(10, 132, 255, 0.15)', text: '#0A84FF', dot: '#0A84FF' };
    case 'intensification':
      return { bg: 'rgba(255, 159, 10, 0.15)', text: '#FF9F0A', dot: '#FF9F0A' };
    case 'peak':
      return { bg: 'rgba(255, 69, 58, 0.15)', text: '#FF453A', dot: '#FF453A' };
    case 'deload':
      return { bg: 'rgba(48, 209, 88, 0.15)', text: '#30D158', dot: '#30D158' };
    default:
      return { bg: 'rgba(142, 142, 147, 0.15)', text: '#8E8E93', dot: '#8E8E93' };
  }
};

export default function GymSplitsScreen({ route }: any) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const {
    userGymPlan,
    applyMasterTemplate,
    updateMasterPlan,
    updateFullMasterPlan,
    saveCustomRoutine,
    deleteCustomRoutine,
    assignRoutineToDay,
    setScheduleMode,
    setActiveProgramme,
  } = useGymPlan();
  const { gymLogs } = useGymLogs();
  const { gymProfile } = useGymProfile();
  const { user } = useCoreData();

  const handleGeneratePersonalizedPlan = useCallback(() => {
    hapticMedium();
    const athleteName = gymProfile?.displayName || user?.displayName || 'Athlete';
    const weight = gymProfile?.weightKg || gymProfile?.bodyweightKg || 94;
    const height = gymProfile?.heightCm || 187;
    const goal = (gymProfile?.goal || gymProfile?.primaryGoal || 'hypertrophy') as any;

    Alert.alert(
      `Generate Custom Plan for ${athleteName}?`,
      `Creates an evidence-based ${String(goal).toUpperCase()} plan calibrated to your biometrics (${weight} kg, ${height} cm). Includes optimal volume landmarks, science-backed movement patterns, and video guides.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate & Apply',
          style: 'default',
          onPress: async () => {
            const generated = generatePersonalizedGymPlan({
              displayName: athleteName,
              weightKg: weight,
              heightCm: height,
              goal,
              daysPerWeek: 5,
              level: 'intermediate',
            });
            await updateFullMasterPlan(generated.days);
            hapticSuccess();
            Alert.alert(
              'Plan Applied! 🎉',
              `Your new "${generated.planName}" is now active in your weekly schedule.`
            );
          },
        },
      ]
    );
  }, [gymProfile, user, updateFullMasterPlan]);

  // ── Sub-Tab State ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<PlanSubTab>(route?.params?.initialTab || 'schedule');
  const [isEditPlanMode, setIsEditPlanMode] = useState(false);

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  // Defer heavy list/card mounts by 1 frame so shell/header paint in Frame 0 (<16ms)
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

  // ── Modals & Sheets ────────────────────────────────────────────────────────
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


  // Add Exercise to Plan Modal State
  const [showPlanAddModal, setShowPlanAddModal] = useState(false);

  // Assign Routine to Day Picker State
  const [assignRoutineTarget, setAssignRoutineTarget] = useState<GymRoutine | null>(null);

  // Swap Routine for Day Picker State
  const [swapTargetDayIndex, setSwapTargetDayIndex] = useState<number | null>(null);

  // Custom Apple-Style Action Sheet State
  interface ActionSheetOption {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    subtitle?: string;
    isDestructive?: boolean;
    onPress: () => void;
  }
  interface ActionSheetConfig {
    title: string;
    subtitle?: string;
    options: ActionSheetOption[];
  }
  const [actionSheetConfig, setActionSheetConfig] = useState<ActionSheetConfig | null>(null);

  // Explore Filter
  const [exploreFilter, setExploreFilter] = useState('All');

  // Split Deep-Dive Inspector Modal State
  const [inspectSplitTarget, setInspectSplitTarget] = useState<CuratedSplit | null>(null);
  const [inspectWorkoutIndex, setInspectWorkoutIndex] = useState<number>(0);

  // Mesocycle Curriculum & Roadmap Sheet State
  const [inspectProgrammeTarget, setInspectProgrammeTarget] = useState<UserGymProgramme | null>(null);

  const activeTemplate = userGymPlan?.templateId || 'ppl';

  const splitTitle = useMemo(() => {
    const customName = (userGymPlan as any)?.name;
    if (customName) return customName;
    if (activeTemplate === 'arnold' || activeTemplate === 'arnold_6day') return 'Arnold Split';
    if (activeTemplate === 'ppl' || activeTemplate === 'ppl_6day') return 'Push / Pull / Legs';
    if (activeTemplate === 'upper_lower' || activeTemplate === 'upper_lower_4day') return 'Upper / Lower';
    if (activeTemplate === 'full_body' || activeTemplate === 'full_body_3day') return 'Full Body';
    if (activeTemplate === 'bro_split_5day') return '5-Day Bro Split';
    return 'Weekly Split';
  }, [(userGymPlan as any)?.name, activeTemplate]);

  // Build resolved 7-day schedule
  const resolvedDays = useMemo(() => {
    const days: { dayIndex: number; dayName: string; planDay: GymPlanDay }[] = [];
    const basePlan = (activeTemplate === 'arnold' || activeTemplate === 'arnold_6day') ? GYM_PLAN_ARNOLD : GYM_PLAN;

    for (let i = 1; i <= 7; i++) {
      const custom = userGymPlan?.customDays?.[i];
      if (custom) {
        const canonicalCustom: GymPlanDay = {
          ...custom,
          exercises: (custom.exercises || []).map(ex => {
            const canonicalName = getCanonicalExerciseName(ex.name);
            return {
              ...ex,
              name: canonicalName,
              muscle: resolveExerciseTargetMuscle(canonicalName, ex.muscle).targetMuscle,
            };
          }),
        };
        days.push({ dayIndex: i, dayName: DAY_NAMES[i - 1], planDay: canonicalCustom });
      } else {
        const defaultDayId = WEEKDAY_TO_PLAN[i] || 1;
        const defaultDay =
          basePlan.find(d => d.dayIndex === defaultDayId) ||
          GYM_PLAN.find(d => d.dayIndex === defaultDayId) || {
            dayIndex: i,
            name: i === 7 ? 'Rest & Recovery' : `Workout Day ${i}`,
            focus: i === 7 ? 'Rest & Recovery' : 'Full Body',
            isRest: i === 7,
            exercises: [],
          };
        const canonicalDefault: GymPlanDay = {
          ...defaultDay,
          exercises: (defaultDay.exercises || []).map(ex => {
            const canonicalName = getCanonicalExerciseName(ex.name);
            return {
              ...ex,
              name: canonicalName,
              muscle: resolveExerciseTargetMuscle(canonicalName, ex.muscle).targetMuscle,
            };
          }),
        };
        days.push({ dayIndex: i, dayName: DAY_NAMES[i - 1], planDay: canonicalDefault });
      }
    }
    return days;
  }, [userGymPlan, activeTemplate]);

  // Currently Selected Day in Schedule
  const activeDay = useMemo(() => {
    return resolvedDays.find(d => d.dayIndex === selectedDayIndex) || resolvedDays[0];
  }, [resolvedDays, selectedDayIndex]);

  const defaultDayForActive = useMemo(() => {
    const defaultDayId = WEEKDAY_TO_PLAN[activeDay.dayIndex] || 1;
    const basePlan = activeTemplate === 'arnold' ? GYM_PLAN_ARNOLD : GYM_PLAN;
    return basePlan.find(d => d.dayIndex === defaultDayId) || GYM_PLAN.find(d => d.dayIndex === defaultDayId);
  }, [activeDay.dayIndex, activeTemplate]);

  const isDayModifiedFromDefault = useMemo(() => {
    if (Boolean(userGymPlan?.customDays?.[activeDay.dayIndex])) return true;
    if (!defaultDayForActive) return false;
    if (activeDay.planDay.name !== defaultDayForActive.name) return true;
    if ((activeDay.planDay.exercises || []).length !== (defaultDayForActive.exercises || []).length) return true;
    return false;
  }, [userGymPlan?.customDays, activeDay, defaultDayForActive]);

  const trainingDaysCount = useMemo(() => {
    return resolvedDays.filter(d => !d.planDay.isRest && (d.planDay.exercises?.length || 0) > 0).length;
  }, [resolvedDays]);

  // User Custom Routines list (Ordered by custom position, fallback to updatedAt)
  const customRoutinesList = useMemo<GymRoutine[]>(() => {
    if (!userGymPlan?.routines) return [];
    return Object.values(userGymPlan.routines).sort((a, b) => {
      if (typeof a.order === 'number' && typeof b.order === 'number') {
        return a.order - b.order;
      }
      if (typeof a.order === 'number') return -1;
      if (typeof b.order === 'number') return 1;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }, [userGymPlan?.routines]);

  // Reorder custom routines (openGym v1.2.14 !45 & v1.3.8 #142)
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
      updateMasterPlan(dayIndex, updatedPlanDay);
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

  const handleEditRoutine = (routine: GymRoutine) => {
    hapticLight();
    setEditingRoutine(routine);
    setEditingDayIndex(null);
    setRoutineEditorVisible(true);
  };

  const handleDeleteRoutine = (routineId: string) => {
    Alert.alert('Delete Routine', 'Are you sure you want to delete this custom workout routine?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteCustomRoutine(routineId);
          hapticSuccess();
        },
      },
    ]);
  };

  const handleDuplicateRoutine = (routine: GymRoutine) => {
    hapticLight();
    const duplicated: GymRoutine = {
      ...routine,
      id: `rt_${Date.now()}`,
      name: `${routine.name} (Copy)`,
      updatedAt: Date.now(),
    };
    saveCustomRoutine(duplicated);
    hapticSuccess();
  };

  const handleStartWorkout = useCallback(async (routine?: GymRoutine | GymPlanDay) => {
    hapticMedium();
    const todayDayIndex = currentDayOfWeek === 0 ? 7 : currentDayOfWeek;
    const todayDateStr = todayStr();

    if (routine && 'exercises' in routine && Array.isArray(routine.exercises) && routine.exercises.length > 0) {
      const routineId = 'id' in routine ? (routine as GymRoutine).id : (routine as GymPlanDay).routineId;
      await assignRoutineToDay(todayDayIndex, routineId, routine as any);
    }
    navigation.navigate('ActiveLogging', { date: todayDateStr });
  }, [currentDayOfWeek, assignRoutineToDay, navigation]);

  const handleOpenRoutineOptionsMenu = useCallback((rt: GymRoutine, rtIdx: number) => {
    hapticLight();
    const options: ActionSheetOption[] = [
      {
        icon: 'create-outline',
        label: 'Edit Routine',
        subtitle: 'Modify name, target muscles & exercises',
        onPress: () => handleEditRoutine(rt),
      },
      {
        icon: 'copy-outline',
        label: 'Duplicate Routine',
        subtitle: 'Create a copy of this routine template',
        onPress: () => handleDuplicateRoutine(rt),
      },
    ];

    if (rtIdx > 0) {
      options.push({
        icon: 'arrow-up-outline',
        label: 'Move Up',
        subtitle: 'Shift routine higher in library',
        onPress: () => handleMoveRoutine(rtIdx, 'up'),
      });
    }
    if (rtIdx < customRoutinesList.length - 1) {
      options.push({
        icon: 'arrow-down-outline',
        label: 'Move Down',
        subtitle: 'Shift routine lower in library',
        onPress: () => handleMoveRoutine(rtIdx, 'down'),
      });
    }

    options.push({
      icon: 'trash-outline',
      label: 'Delete Routine',
      subtitle: 'Permanently remove from library',
      isDestructive: true,
      onPress: () => handleDeleteRoutine(rt.id),
    });

    setActionSheetConfig({
      title: rt.name,
      subtitle: `${rt.exercises?.length || 0} exercises · ${(rt.exercises || []).reduce((acc, ex) => acc + (Number(ex.targetSets) || 3), 0)} sets`,
      options,
    });
  }, [customRoutinesList.length, handleEditRoutine, handleDuplicateRoutine, handleMoveRoutine, handleDeleteRoutine]);

  const handleApplySplit = (split: CuratedSplit) => {
    Alert.alert(
      `Apply ${split.name}?`,
      `This will update your 7-day schedule with the ${split.daysPerWeek}-day ${split.name} program.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply Program',
          style: 'default',
          onPress: () => {
            const customDays: Record<number, GymPlanDay> = {};
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
                    name: workout.name,
                    subtitle: workout.subtitle,
                    focus: workout.focus,
                    isRest: false,
                    exercises: workout.exercises,
                  };
                } else {
                  customDays[dayIndex] = {
                    ...REST_DAY_TEMPLATE,
                    dayIndex,
                  };
                }
              }
            }
            updateFullMasterPlan(customDays);
            hapticSuccess();
            setActiveTab('schedule');
          },
        },
      ]
    );
  };

  const handleDeleteExerciseFromPlan = useCallback((dayIndex: number, exIndex: number, exName: string) => {
    hapticLight();
    Alert.alert(
      'Remove from Weekly Plan',
      `Remove "${exName}" from ${activeDay.dayName} (${activeDay.planDay.name}) for all future weeks?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove for All Weeks',
          style: 'destructive',
          onPress: async () => {
            const currentExercises = activeDay.planDay.exercises || [];
            const updatedExercises = currentExercises.filter((_, idx) => idx !== exIndex);
            const updatedPlanDay: GymPlanDay = {
              ...activeDay.planDay,
              exercises: updatedExercises,
            };
            await updateMasterPlan(dayIndex, updatedPlanDay);
            hapticSuccess();
          },
        },
      ]
    );
  }, [activeDay, updateMasterPlan]);

  const handleRestoreDefaultDay = useCallback((dayIndex: number) => {
    hapticMedium();
    const defaultDayId = WEEKDAY_TO_PLAN[dayIndex] || 1;
    const basePlan = activeTemplate === 'arnold' ? GYM_PLAN_ARNOLD : GYM_PLAN;
    const defaultDay = basePlan.find(d => d.dayIndex === defaultDayId) || GYM_PLAN.find(d => d.dayIndex === defaultDayId);
    const exCount = defaultDay?.exercises?.length || 0;

    Alert.alert(
      `Restore Default ${activeDay.dayName}`,
      `Restore ${activeDay.dayName} (${defaultDay?.name || 'Default'}) with all ${exCount} original exercises from your ${splitTitle}?\n\nThis will permanently update your weekly plan.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Restore All ${exCount} Exercises`,
          style: 'default',
          onPress: async () => {
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
              });
            } else {
              const newCustomDays = { ...(userGymPlan?.customDays || {}) };
              delete newCustomDays[dayIndex];
              await updateFullMasterPlan(newCustomDays);
            }
            hapticSuccess();
          },
        },
      ]
    );
  }, [activeDay, activeTemplate, splitTitle, updateMasterPlan, updateFullMasterPlan, userGymPlan?.customDays]);

  const handleOpenDayOptionsMenu = useCallback((dayObj: typeof activeDay) => {
    hapticLight();
    const dayName = dayObj.dayName;
    const isRest = dayObj.planDay.isRest;
    const exCount = (dayObj.planDay.exercises || []).length;
    const options: ActionSheetOption[] = [];

    if (!isRest) {
      options.push({
        icon: 'create-outline',
        label: 'Edit Workout & Focus',
        subtitle: 'Customize exercises, sets & reps',
        onPress: () => {
          const routineObj: GymRoutine = {
            id: dayObj.planDay.routineId || `rt_day_${dayObj.dayIndex}`,
            name: dayObj.planDay.name,
            subtitle: dayObj.planDay.subtitle,
            focus: dayObj.planDay.focus,
            exercises: dayObj.planDay.exercises || [],
            updatedAt: Date.now(),
          };
          setEditingRoutine(routineObj);
          setEditingDayIndex(dayObj.dayIndex);
          setRoutineEditorVisible(true);
        },
      });

      if (exCount > 0) {
        options.push({
          icon: isEditPlanMode ? 'checkmark-circle-outline' : 'trash-outline',
          label: isEditPlanMode ? 'Done Deleting Exercises' : 'Delete Exercises Mode',
          subtitle: isEditPlanMode ? 'Hide delete trash cans' : 'Show delete trash cans next to exercises',
          onPress: () => {
            hapticLight();
            setIsEditPlanMode(prev => !prev);
          },
        });
      }
    }

    options.push({
      icon: 'time-outline',
      label: 'Set Training Time',
      subtitle: dayObj.planDay.startTime ? `Currently set to ${formatTimeSlot(dayObj.planDay.startTime)}` : 'Schedule training hour & reminder',
      onPress: () => setTimePickerDayIndex(dayObj.dayIndex),
    });

    if (isDayModifiedFromDefault) {
      options.push({
        icon: 'refresh-outline',
        label: 'Restore Split Default',
        subtitle: `Reset ${dayName} back to original ${splitTitle} workout`,
        isDestructive: true,
        onPress: () => handleRestoreDefaultDay(dayObj.dayIndex),
      });
    }

    setActionSheetConfig({
      title: `${dayName} Options`,
      subtitle: dayObj.planDay.name || 'Workout Day',
      options,
    });
  }, [isEditPlanMode, isDayModifiedFromDefault, handleRestoreDefaultDay, splitTitle]);

  // ── Programme Handlers (openGym v1.4.4 #159, #679) ───────────────────────────
  const handleEnrollProgramme = useCallback((prog: UserGymProgramme) => {
    Alert.alert(
      `Enroll in ${prog.name}?`,
      `This will activate this ${prog.totalWeeks}-week periodized mesocycle. Your workouts will feature targeted RIR, progressive volume ramps, and programmed deloads.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enroll',
          style: 'default',
          onPress: async () => {
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
        },
      ]
    );
  }, [setActiveProgramme]);

  const handleAdvanceWeek = useCallback(async () => {
    const prog = userGymPlan?.activeProgramme;
    if (!prog) return;
    if (prog.currentWeek < prog.totalWeeks) {
      await setActiveProgramme({
        ...prog,
        currentWeek: prog.currentWeek + 1,
        updatedAt: Date.now(),
      });
      hapticSuccess();
    } else {
      Alert.alert(
        'Mesocycle Completed! 🎉',
        `You have successfully finished all ${prog.totalWeeks} weeks of ${prog.name}! Would you like to graduate or restart?`,
        [
          { text: 'Keep Active', style: 'cancel' },
          {
            text: 'Finish Mesocycle',
            style: 'default',
            onPress: async () => {
              await setActiveProgramme(null);
              hapticSuccess();
            },
          },
          {
            text: 'Restart at Week 1',
            style: 'default',
            onPress: async () => {
              await setActiveProgramme({
                ...prog,
                currentWeek: 1,
                startDate: new Date().toISOString(),
                updatedAt: Date.now(),
              });
              hapticSuccess();
            },
          },
        ]
      );
    }
  }, [userGymPlan?.activeProgramme, setActiveProgramme]);

  const handlePreviousWeek = useCallback(async () => {
    const prog = userGymPlan?.activeProgramme;
    if (!prog || prog.currentWeek <= 1) return;
    await setActiveProgramme({
      ...prog,
      currentWeek: prog.currentWeek - 1,
      updatedAt: Date.now(),
    });
    hapticLight();
  }, [userGymPlan?.activeProgramme, setActiveProgramme]);

  const handleEndProgramme = useCallback(() => {
    Alert.alert(
      'Exit Active Programme?',
      'You will leave this structured mesocycle. Your schedule and custom routines will remain unchanged.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit Programme',
          style: 'destructive',
          onPress: async () => {
            await setActiveProgramme(null);
            hapticMedium();
          },
        },
      ]
    );
  }, [setActiveProgramme]);

  const formatTimeSlot = (timeStr?: string) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const hour = parseInt(parts[0], 10);
    const mins = parts[1];
    if (isNaN(hour)) return timeStr;
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${mins} ${period}`;
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: '#000000' }]} edges={['top']}>
      <StatusBar style="light" />

      {/* ── Screen Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.headerTitle}>Plan</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {trainingDaysCount} Training Days · {isRotation ? 'Rotation Queue' : 'Fixed Schedule'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              setShowScheduleSettings(true);
            }}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="alarm-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Apple iOS Segmented Control (Minimalist, Zero Pills) ───────────── */}
      <View style={styles.segmentedTrack}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'schedule' && styles.segmentBtnActive]}
          onPress={() => {
            hapticSelection();
            setActiveTab('schedule');
          }}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === 'schedule' ? styles.segmentTextActive : styles.segmentTextInactive,
            ]}
          >
            Schedule
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'routines' && styles.segmentBtnActive]}
          onPress={() => {
            hapticSelection();
            setActiveTab('routines');
          }}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === 'routines' ? styles.segmentTextActive : styles.segmentTextInactive,
            ]}
          >
            Routines
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'programmes' && styles.segmentBtnActive]}
          onPress={() => {
            hapticSelection();
            setActiveTab('programmes');
          }}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === 'programmes' ? styles.segmentTextActive : styles.segmentTextInactive,
            ]}
            numberOfLines={1}
          >
            Mesocycles
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'explore' && styles.segmentBtnActive]}
          onPress={() => {
            hapticSelection();
            setActiveTab('explore');
          }}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === 'explore' ? styles.segmentTextActive : styles.segmentTextInactive,
            ]}
          >
            Explore
          </Text>
        </TouchableOpacity>
      </View>

      {/* ════════════════════════════════════════════════════════════════════════
          SUB-TAB 1: 📅 SCHEDULE (Focused 7-Day Program with Zero Clutter)
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'schedule' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Unified Program & Schedule Control Center Card */}
          <View style={styles.unifiedControlCard}>
            {/* Top row: Active Split Title & Switch Button */}
            <View style={styles.controlHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.controlPreTitle}>ACTIVE PROGRAM</Text>
                <Text style={styles.controlTitle} numberOfLines={1}>{splitTitle}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  hapticSelection();
                  setActiveTab('explore');
                }}
                style={styles.switchSplitBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="swap-horizontal" size={13} color="#FFFFFF" />
                <Text style={styles.switchSplitBtnText}>Switch</Text>
              </TouchableOpacity>
            </View>

            {/* Middle row: Mode Switcher (Fixed vs Rotation) */}
            <View style={styles.modeSwitcherRow}>
              <TouchableOpacity
                onPress={() => {
                  hapticSelection();
                  if (setScheduleMode) setScheduleMode('calendar');
                }}
                style={[
                  styles.modeSwitcherBtn,
                  !isRotation && styles.modeSwitcherBtnActive,
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="calendar-outline"
                  size={12}
                  color={!isRotation ? colors.textPrimary : '#8E8E93'}
                />
                <Text style={[
                  styles.modeSwitcherBtnText,
                  !isRotation && styles.modeSwitcherBtnTextActive,
                ]}>
                  Fixed Weekdays
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  hapticSelection();
                  if (setScheduleMode) setScheduleMode('rotation');
                }}
                style={[
                  styles.modeSwitcherBtn,
                  isRotation && styles.modeSwitcherBtnActive,
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="sync-outline"
                  size={12}
                  color={isRotation ? '#30D158' : '#8E8E93'}
                />
                <Text style={[
                  styles.modeSwitcherBtnText,
                  isRotation && { color: '#30D158', fontFamily: FONT_FAMILY.bold },
                ]}>
                  Rotation Queue
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bottom row: Integrated 7-Day Day Selector Strip */}
            <View style={styles.dayStripRow}>
              {resolvedDays.map(d => {
                const isSel = d.dayIndex === selectedDayIndex;
                const isRest = Boolean(d.planDay.isRest);
                const isToday = d.dayIndex === (currentDayOfWeek === 0 ? 7 : currentDayOfWeek);

                return (
                  <TouchableOpacity
                    key={`day-strip-${d.dayIndex}`}
                    onPress={() => {
                      hapticLight();
                      setSelectedDayIndex(d.dayIndex);
                    }}
                    style={[styles.dayColBtn, isSel && styles.dayColBtnActive]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.dayColShort, isSel && styles.dayColShortActive]}>
                      {isRotation ? (getRotationLetterForDay(d.dayIndex, rotationDays) || d.dayIndex) : DAY_SHORT[d.dayIndex - 1]}
                    </Text>

                    {/* Status Dot */}
                    <View
                      style={[
                        styles.dayColDot,
                        {
                          backgroundColor: isRest ? '#48484A' : '#30D158',
                        },
                      ]}
                    />

                    {isToday && (
                      <View style={styles.todayIndicatorDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Focused Day Card for Selected Day (NO CLUTTER!) */}
          <View style={styles.focusedDayCard}>
            {/* Card Header */}
            <View style={styles.focusedDayHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={styles.focusedDayWeekday}>
                    {isRotation && !activeDay.planDay.isRest
                      ? `Workout ${getRotationLetterForDay(activeDay.dayIndex, rotationDays)} (Queue)`
                      : activeDay.dayName}
                  </Text>
                  {isRotation && activeDay.dayIndex === nextUpDayIndex && (
                    <View style={[styles.todayPill, { backgroundColor: 'rgba(48, 209, 88, 0.18)' }]}>
                      <Text style={[styles.todayPillText, { color: '#30D158' }]}>UP NEXT</Text>
                    </View>
                  )}
                  {!isRotation && activeDay.dayIndex === (currentDayOfWeek === 0 ? 7 : currentDayOfWeek) && (
                    <View style={styles.todayPill}>
                      <Text style={styles.todayPillText}>TODAY</Text>
                    </View>
                  )}
                  {formatTimeSlot(activeDay.planDay.startTime) ? (
                    <View style={styles.timeSlotPill}>
                      <Ionicons name="time-outline" size={10} color="#8E8E93" />
                      <Text style={styles.timeSlotText}>
                        {formatTimeSlot(activeDay.planDay.startTime)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.focusedDayTitle}>{activeDay.planDay.name}</Text>
                {activeDay.planDay.focus ? (
                  <Text style={styles.focusedDayFocus}>{activeDay.planDay.focus}</Text>
                ) : null}
              </View>

              {/* Action Cluster: Rest Toggle & More Options */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  onPress={() => {
                    hapticSelection();
                    handleToggleRest(activeDay.dayIndex);
                  }}
                  style={[
                    styles.headerRestToggleBtn,
                    activeDay.planDay.isRest && styles.headerRestToggleBtnActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={activeDay.planDay.isRest ? "barbell-outline" : "moon-outline"}
                    size={12}
                    color={activeDay.planDay.isRest ? "#30D158" : "#8E8E93"}
                  />
                  <Text style={[
                    styles.headerRestToggleBtnText,
                    activeDay.planDay.isRest && { color: "#30D158" },
                  ]}>
                    {activeDay.planDay.isRest ? 'Train' : 'Rest'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleOpenDayOptionsMenu(activeDay)}
                  style={styles.moreOptionsIconBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="ellipsis-horizontal" size={16} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.hairline} />

            {/* Rest Day Presentation */}
            {activeDay.planDay.isRest ? (
              <View style={styles.restDayContainer}>
                <Ionicons name="moon" size={32} color="#8E8E93" style={{ marginBottom: 6 }} />
                <Text style={styles.restDayTitle}>Rest & Active Recovery</Text>
                <Text style={styles.restDaySub}>
                  Rest days allow muscle tissue supercompensation, central nervous system restoration, and glycogen replenishment.
                </Text>

                <TouchableOpacity
                  onPress={() => handleToggleRest(activeDay.dayIndex)}
                  style={styles.switchWorkoutBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="barbell-outline" size={13} color="#FFFFFF" />
                  <Text style={styles.switchWorkoutBtnText}>Switch to Workout Day</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Workout Day Presentation */
              <View style={{ gap: 8 }}>
                {/* Exercises List */}
                {!isHeavyReady ? (
                  <View style={{ height: 160, backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 10, marginVertical: 6 }} />
                ) : (
                  <View style={styles.exercisesListWrap}>
                    {(activeDay.planDay.exercises || []).map((ex, idx) => (
                      <View key={`${ex.name}-${idx}`} style={styles.exerciseItemRow}>
                        <Text style={styles.exIndexNum}>{idx + 1}</Text>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.exNameText} numberOfLines={1}>{ex.name}</Text>
                          <Text style={styles.exTargetText}>
                            {ex.targetSets} sets · {ex.targetReps || '8–12'} reps
                            {ex.muscle ? ` · ${ex.muscle}` : ''}
                          </Text>
                        </View>
                        {isEditPlanMode && (
                          <TouchableOpacity
                            onPress={() => handleDeleteExerciseFromPlan(activeDay.dayIndex, idx, ex.name)}
                            style={styles.planExDeleteBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={15} color="#FF453A" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}

                    {(!activeDay.planDay.exercises || activeDay.planDay.exercises.length === 0) && (
                      <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                        <Text style={styles.emptyNote}>No exercises assigned to this day yet.</Text>
                      </View>
                    )}

                    {/* Primary Day Actions: Add Exercise & Swap Routine */}
                    <View style={styles.dayPrimaryActionsRow}>
                      <TouchableOpacity
                        onPress={() => {
                          hapticLight();
                          setShowPlanAddModal(true);
                        }}
                        style={styles.planAddExBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={15} color="#0A84FF" />
                        <Text style={styles.planAddExBtnText}>Add Exercise</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          hapticLight();
                          setSwapTargetDayIndex(activeDay.dayIndex);
                        }}
                        style={styles.planSwapRoutineBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="swap-horizontal" size={14} color="#8E8E93" />
                        <Text style={styles.planSwapRoutineBtnText}>Swap Routine</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Weekly Volume Planned Overview Card */}
          <View style={styles.volumeOverviewCard}>
            <Text style={styles.cardSectionLabel}>WEEKLY PLANNED VOLUME</Text>
            <Text style={styles.volumeOverviewTotal}>
              {weeklyPlannedAudit.totalSets} working sets across {trainingDaysCount} training days
            </Text>
            {weeklyPlannedAudit.topMuscles.length > 0 && (
              <Text style={styles.volumeOverviewMuscles}>
                {weeklyPlannedAudit.topMuscles.join('  ·  ')}
              </Text>
            )}
          </View>

        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          SUB-TAB 2: 📋 ROUTINES (Dedicated Custom Routine Library)
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'routines' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <View style={styles.routinesHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardSectionLabel}>SAVED ROUTINES ({customRoutinesList.length})</Text>
              <Text style={styles.cardSubLabel}>Your custom workout templates</Text>
            </View>

            <TouchableOpacity
              onPress={handleCreateRoutine}
              style={styles.primaryActionBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={14} color="#000000" />
              <Text style={styles.primaryActionText}>New Routine</Text>
            </TouchableOpacity>
          </View>

          {customRoutinesList.length === 0 ? (
            <View style={styles.emptyRoutinesCard}>
              <Ionicons name="barbell-outline" size={32} color="#8E8E93" />
              <Text style={styles.emptyTitle}>No Custom Routines Yet</Text>
              <Text style={styles.emptyNote}>
                Build your own workout routines with custom sets, reps, and target muscles.
              </Text>
              <TouchableOpacity
                onPress={handleCreateRoutine}
                style={[styles.primaryActionBtn, { marginTop: 12 }]}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={14} color="#000000" />
                <Text style={styles.primaryActionText}>Create First Routine</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10, marginTop: 4 }}>
              {customRoutinesList.map((rt, rtIdx) => {
                const totalSets = (rt.exercises || []).reduce((acc, ex) => acc + (Number(ex.targetSets) || 3), 0);
                const estMins = Math.round(totalSets * 2.5);

                return (
                  <View key={rt.id} style={styles.routineCard}>
                    {/* Routine Header */}
                    <View style={styles.routineCardHeader}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.routineName}>{rt.name}</Text>
                        <Text style={styles.routineSubtitle}>
                          {rt.exercises?.length || 0} exercises · {totalSets} sets · ~{estMins}m
                        </Text>
                      </View>

                      {/* Options (···) Menu Button */}
                      <TouchableOpacity
                        onPress={() => handleOpenRoutineOptionsMenu(rt, rtIdx)}
                        style={styles.moreOptionsIconBtn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="ellipsis-horizontal" size={16} color="#8E8E93" />
                      </TouchableOpacity>
                    </View>

                    {/* Exercises List Preview */}
                    <View style={styles.routineExList}>
                      {(rt.exercises || []).slice(0, 4).map((ex, i) => (
                        <View key={`${ex.name}-${i}`} style={styles.routineExRow}>
                          <Text style={styles.routineExDot}>•</Text>
                          <Text style={styles.routineExName} numberOfLines={1}>
                            {ex.name}:{' '}
                            <Text style={styles.routineExSets}>
                              {ex.targetSets} sets × {ex.targetReps || '8–12'}
                            </Text>
                          </Text>
                        </View>
                      ))}

                      {(rt.exercises?.length || 0) > 4 && (
                        <Text style={styles.routineMoreExText}>
                          + {(rt.exercises?.length || 0) - 4} more exercise
                          {(rt.exercises?.length || 0) - 4 === 1 ? '' : 's'}
                        </Text>
                      )}
                    </View>

                    {/* Pre-Session Muscle Hit Map Preview (openGym v1.4.3) */}
                    <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
                      <PreSessionMuscleHitMap
                        exercises={rt.exercises || []}
                        isRest={false}
                        compact={false}
                        showMiniAvatar={true}
                        title={rt.name}
                      />
                    </View>

                    <View style={styles.hairline} />

                    {/* Footer Actions: Assign to Day & Start Workout */}
                    <View style={styles.routineFooterRow}>
                      <TouchableOpacity
                        onPress={() => setAssignRoutineTarget(rt)}
                        style={styles.routineAssignBtn}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="calendar-outline" size={13} color="#FFFFFF" />
                        <Text style={styles.routineAssignBtnText}>Assign to Day</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleStartWorkout(rt)}
                        style={styles.routineStartBtn}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="play" size={13} color="#000000" />
                        <Text style={styles.routineStartBtnText}>Start Workout</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          SUB-TAB 4: 📊 PROGRAMMES (Multi-Week Periodized Mesocycles)
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'programmes' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Active Programme Card OR Compact Discovery Hero */}
          {userGymPlan?.activeProgramme ? (
            (() => {
              const activeProg = userGymPlan.activeProgramme;
              const curWeekConfig = activeProg.weeks?.[activeProg.currentWeek];
              const phaseCol = getPhaseColor(curWeekConfig?.phaseType);
              const progressPct = Math.min(100, Math.round((activeProg.currentWeek / activeProg.totalWeeks) * 100));

              return (
                <View style={styles.programmeActiveCard}>
                  {/* Top Badge & Progress Row */}
                  <View style={styles.programmeActiveHeader}>
                    <View style={[styles.programmePhasePill, { backgroundColor: phaseCol.bg }]}>
                      <View style={[styles.programmeActiveBadgeDot, { backgroundColor: phaseCol.dot }]} />
                      <Text style={[styles.programmePhasePillText, { color: phaseCol.text }]}>
                        {curWeekConfig?.phaseType ? `PHASE: ${curWeekConfig.phaseType.toUpperCase()}` : 'ACTIVE MESOCYCLE'}
                      </Text>
                    </View>
                    <Text style={styles.programmeWeekProgressText}>
                      Week {activeProg.currentWeek} of {activeProg.totalWeeks} ({progressPct}%)
                    </Text>
                  </View>

                  <Text style={styles.programmeActiveTitle}>{activeProg.name}</Text>
                  {Boolean(activeProg.subtitle) && (
                    <Text style={styles.programmeActiveSubtitle}>{activeProg.subtitle}</Text>
                  )}

                  {/* Smooth Continuous Progress Bar */}
                  <View style={styles.continuousProgressBarTrack}>
                    <View
                      style={[
                        styles.continuousProgressBarFill,
                        { width: `${progressPct}%`, backgroundColor: phaseCol.text },
                      ]}
                    />
                  </View>

                  {/* Live Active Week Prescriptions Strip */}
                  {curWeekConfig && (
                    <View style={styles.activePrescriptionRow}>
                      <View style={styles.activePrescriptionChip}>
                        <Text style={styles.activePrescriptionLabel}>TARGET RIR</Text>
                        <Text style={[styles.activePrescriptionValue, { color: phaseCol.text }]}>
                          {curWeekConfig.targetRir != null ? `${curWeekConfig.targetRir} RIR` : 'Optimal'}
                        </Text>
                      </View>
                      <View style={styles.activePrescriptionChip}>
                        <Text style={styles.activePrescriptionLabel}>INTENSITY</Text>
                        <Text style={styles.activePrescriptionValue}>
                          ~{curWeekConfig.intensityPercentage1RM || 70}% 1RM
                        </Text>
                      </View>
                      <View style={styles.activePrescriptionChip}>
                        <Text style={styles.activePrescriptionLabel}>VOLUME</Text>
                        <Text style={styles.activePrescriptionValue}>
                          {curWeekConfig.volumeModifierSets >= 0 ? `+${curWeekConfig.volumeModifierSets}` : curWeekConfig.volumeModifierSets} Sets/ex
                        </Text>
                      </View>
                    </View>
                  )}

                  {Boolean(curWeekConfig?.notes) && (
                    <Text style={styles.activePrescriptionNotes} numberOfLines={2}>
                      💡 {curWeekConfig?.notes}
                    </Text>
                  )}

                  {/* Action Controls Row */}
                  <View style={styles.activeProgActionsRow}>
                    <TouchableOpacity
                      onPress={handleAdvanceWeek}
                      style={styles.activeAdvanceBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.activeAdvanceBtnText}>
                        {activeProg.currentWeek < activeProg.totalWeeks ? `Complete Week ${activeProg.currentWeek} →` : 'Complete Mesocycle'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        hapticLight();
                        setInspectProgrammeTarget(activeProg);
                      }}
                      style={styles.activeRoadmapBtn}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="map-outline" size={14} color="#FFFFFF" />
                      <Text style={styles.activeRoadmapBtnText}>Roadmap</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleEndProgramme}
                      style={styles.activeEndBtn}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="stop-circle-outline" size={15} color="#FF453A" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()
          ) : (
            /* Sleek Compact Discovery Hero (Replaces sluggish 250px blank hero) */
            <View style={styles.compactDiscoveryHero}>
              <View style={styles.compactHeroIconWrap}>
                <Ionicons name="layers" size={20} color="#A599FF" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.compactHeroTitle}>Periodized Mesocycles</Text>
                <Text style={styles.compactHeroSub} numberOfLines={2}>
                  Automate volume ramps, RIR targets & scheduled deloads across 4–12 weeks.
                </Text>
              </View>
            </View>
          )}

          {/* Library Section Header */}
          <View style={styles.programmeSectionHeader}>
            <Text style={styles.programmeSectionHeaderTitle}>STRUCTURED MESOCYCLES</Text>
          </View>

          {/* Curated Mesocycle Cards */}
          <View style={{ gap: 12, marginTop: 4 }}>
            {CURATED_PROGRAMMES.map(prog => {
              const isActive = userGymPlan?.activeProgramme?.id === prog.id;

              return (
                <TouchableOpacity
                  key={prog.id}
                  style={styles.programmeLibraryCard}
                  activeOpacity={0.85}
                  onPress={() => {
                    hapticLight();
                    setInspectProgrammeTarget(prog);
                  }}
                >
                  {/* Header Row */}
                  <View style={styles.programmeLibraryHeader}>
                    <Text style={styles.programmeLibraryTag}>
                      {prog.goal ? prog.goal.toUpperCase() : 'PROGRAMME'}
                    </Text>
                    <Text style={styles.programmeLibraryWeeks}>{prog.totalWeeks} WEEKS</Text>
                  </View>

                  <Text style={styles.programmeLibraryTitle}>{prog.name}</Text>
                  {Boolean(prog.subtitle) && (
                    <Text style={styles.programmeLibrarySubtitle}>{prog.subtitle}</Text>
                  )}
                  <Text style={styles.programmeLibraryDesc}>{prog.description}</Text>

                  {/* Structured Phase Bar & Horizontally Scrollable Weeks Track */}
                  <View style={{ marginBottom: 6 }}>
                    <View style={styles.programmePhasesBar}>
                      {Object.values(prog.weeks).map(w => {
                        const col = getPhaseColor(w.phaseType);
                        return (
                          <View
                            key={`pbar-${prog.id}-${w.weekNumber}`}
                            style={[styles.programmePhaseBarSegment, { backgroundColor: col.text }]}
                          />
                        );
                      })}
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.programmeWeeksScrollTrack}
                    >
                      {Object.values(prog.weeks).map(w => {
                        const col = getPhaseColor(w.phaseType);
                        const phaseShort =
                          w.phaseType === 'accumulation'
                            ? 'Acc'
                            : w.phaseType === 'intensification'
                            ? 'Int'
                            : w.phaseType === 'peak'
                            ? 'Peak'
                            : 'Deload';

                        return (
                          <View key={`prog-${prog.id}-w${w.weekNumber}`} style={styles.programmeWeekScrollPill}>
                            <Text style={styles.programmeTimelineWeekLabel}>W{w.weekNumber}</Text>
                            <Text style={[styles.programmeTimelinePhaseLabel, { color: col.text }]}>
                              {phaseShort}
                            </Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Symmetrical 50/50 Action Buttons Row (Curriculum | Enroll) */}
                  <View style={styles.programmeCardActionRow}>
                    <TouchableOpacity
                      onPress={() => {
                        hapticLight();
                        setInspectProgrammeTarget(prog);
                      }}
                      style={styles.programmeViewCurriculumBtn}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="list-outline" size={15} color="#FFFFFF" />
                      <Text style={styles.programmeViewCurriculumBtnText}>Curriculum</Text>
                    </TouchableOpacity>

                    {isActive ? (
                      <View style={styles.programmeEnrolledBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#30D158" />
                        <Text style={styles.programmeEnrolledBadgeText}>Active Plan</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleEnrollProgramme(prog)}
                        style={styles.programmeEnrollBtn}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="play" size={14} color="#FFFFFF" />
                        <Text style={styles.programmeEnrollBtnText}>Enroll</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          SUB-TAB 3: 🗂️ EXPLORE (Browse Pre-Built Splits with One-Tap Apply)
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'explore' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Bespoke Plan Generator Hero Banner */}
          <TouchableOpacity
            onPress={handleGeneratePersonalizedPlan}
            style={[styles.aiPlanBanner, { marginHorizontal: 0, marginTop: 4, marginBottom: 10 }]}
            activeOpacity={0.8}
          >
            <View style={styles.aiPlanLeft}>
              <View style={styles.aiPlanIconWrap}>
                <Ionicons name="sparkles" size={16} color="#00F0FF" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.aiPlanTitle}>Generate Bespoke Plan</Text>
                <Text style={styles.aiPlanSubtitle} numberOfLines={1}>
                  Calibrated to your biometrics ({gymProfile?.weightKg || 94} kg) & Hypertrophy
                </Text>
              </View>
            </View>

            <View style={styles.aiPlanBtn}>
              <Text style={styles.aiPlanBtnText}>Generate</Text>
              <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Filter Chips Bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
            {['All', '3-Day', '4-Day', '5-Day', '6-Day'].map(f => {
              const isSel = exploreFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => {
                    hapticLight();
                    setExploreFilter(f);
                  }}
                  style={[styles.filterChipBtn, isSel && styles.filterChipBtnActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, isSel && styles.filterChipTextActive]}>{f}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Master Split Programs List */}
          <View style={{ gap: 12, marginTop: 6 }}>
            {filteredCuratedSplits.map(split => {
              const isActive =
                activeTemplate === split.id ||
                (split.id === 'ppl_6day' && activeTemplate === 'ppl') ||
                (split.id === 'arnold_6day' && activeTemplate === 'arnold');

              return (
                <TouchableOpacity
                  key={split.id}
                  style={styles.splitCard}
                  activeOpacity={0.85}
                  onPress={() => {
                    hapticLight();
                    setInspectSplitTarget(split);
                    setInspectWorkoutIndex(0);
                  }}
                >
                  {/* Split Header */}
                  <View style={styles.splitHeaderRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.splitDaysBadge}>{split.daysPerWeek} DAYS / WK</Text>
                        <Text style={styles.splitLevelBadge}>{split.level.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.splitProgramTitle}>{split.name}</Text>
                    </View>

                    {isActive ? (
                      <View style={styles.activeProgramBadge}>
                        <Ionicons name="checkmark" size={12} color="#30D158" />
                        <Text style={styles.activeProgramBadgeText}>Active</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleApplySplit(split)}
                        style={styles.applySplitBtn}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.applySplitBtnText}>Apply</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.splitDescription}>{split.description}</Text>

                  {/* 7-Day Microcycle Preview */}
                  <View style={styles.splitSchedulePreview}>
                    <Text style={styles.splitScheduleLabel}>WEEKLY SCHEDULE</Text>
                    <View style={styles.splitWorkoutsList}>
                      {split.workouts.map(w => (
                        <View key={w.id} style={styles.splitWorkoutTag}>
                          <Text style={styles.splitWorkoutTagName}>{w.name}:</Text>
                          <Text style={styles.splitWorkoutTagFocus} numberOfLines={1}>{w.subtitle}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Tap to Inspect Banner */}
                  <View style={styles.splitInspectTapHint}>
                    <Ionicons name="search" size={12} color="#0A84FF" />
                    <Text style={styles.splitInspectTapHintText}>Tap to inspect exercises & muscle breakdown</Text>
                    <Ionicons name="chevron-forward" size={13} color="#0A84FF" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

        </ScrollView>
      )}

      {/* ── MODAL: ROUTINE BUILDER / EDITOR ── */}
      <RoutineEditorModal
        visible={routineEditorVisible}
        routineToEdit={editingRoutine}
        initialDayIndex={editingDayIndex}
        onClose={() => {
          setRoutineEditorVisible(false);
          setEditingDayIndex(null);
        }}
        onSave={async (savedRt, targetDayIndex) => {
          await saveCustomRoutine(savedRt, targetDayIndex);
          hapticSuccess();
          setRoutineEditorVisible(false);
          setEditingRoutine(null);
          setEditingDayIndex(null);
          if (targetDayIndex != null && targetDayIndex >= 1 && targetDayIndex <= 7) {
            setSelectedDayIndex(targetDayIndex);
          }
        }}
      />

      {/* ── MODAL: ASSIGN ROUTINE TO DAY ── */}
      <Modal
        visible={assignRoutineTarget !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAssignRoutineTarget(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAssignRoutineTarget(null)}>
          <Pressable style={styles.sheetCard} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Assign to Day</Text>
                <Text style={styles.sheetSubtitle}>
                  Choose which day to schedule "{assignRoutineTarget?.name}"
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAssignRoutineTarget(null)}>
                <Ionicons name="close" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.dayPickList}>
              {DAY_NAMES.map((dName, idx) => (
                <TouchableOpacity
                  key={`day-pick-${idx + 1}`}
                  style={styles.dayPickRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (assignRoutineTarget) {
                      handleAssignRoutineToDay(idx + 1, assignRoutineTarget.id, assignRoutineTarget);
                    }
                  }}
                >
                  <Text style={styles.dayPickName}>{dName}</Text>
                  <Text style={styles.dayPickCurrent}>
                    {resolvedDays[idx]?.planDay.name || 'Rest'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── MODAL: SWAP ROUTINE FOR DAY ── */}
      <Modal
        visible={swapTargetDayIndex !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSwapTargetDayIndex(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSwapTargetDayIndex(null)}>
          <Pressable style={styles.sheetCard} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Swap Routine</Text>
                <Text style={styles.sheetSubtitle}>
                  {swapTargetDayIndex !== null ? `Select routine for ${DAY_NAMES[swapTargetDayIndex - 1]}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSwapTargetDayIndex(null)}>
                <Ionicons name="close" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.dayPickList}>
              {customRoutinesList.length === 0 ? (
                <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={styles.emptyNote}>No custom routines saved yet.</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSwapTargetDayIndex(null);
                      handleCreateRoutine();
                    }}
                    style={[styles.primaryActionBtn, { marginTop: 10 }]}
                  >
                    <Ionicons name="add" size={14} color="#000000" />
                    <Text style={styles.primaryActionText}>Create New Routine</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                customRoutinesList.map(rt => (
                  <TouchableOpacity
                    key={`swap-rt-${rt.id}`}
                    style={styles.dayPickRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (swapTargetDayIndex !== null) {
                        handleAssignRoutineToDay(swapTargetDayIndex, rt.id, rt);
                        setSwapTargetDayIndex(null);
                      }
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dayPickName}>{rt.name}</Text>
                      <Text style={styles.sheetSubtitle}>
                        {rt.exercises?.length || 0} exercises · {(rt.exercises || []).reduce((acc, ex) => acc + (Number(ex.targetSets) || 3), 0)} sets
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── MODAL: TIME PRESET PICKER ── */}
      <Modal
        visible={timePickerDayIndex !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setTimePickerDayIndex(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setTimePickerDayIndex(null)}>
          <Pressable style={styles.sheetCard} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Training Time Slot</Text>
                <Text style={styles.sheetSubtitle}>
                  {timePickerDayIndex !== null ? DAY_NAMES[timePickerDayIndex - 1] : ''} Routine Schedule
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTimePickerDayIndex(null)}>
                <Ionicons name="close" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.timePresetsList}>
              {QUICK_TIME_PRESETS.map(preset => (
                <TouchableOpacity
                  key={`preset-${preset.time}`}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (timePickerDayIndex === null) return;
                    const targetDay = resolvedDays.find(d => d.dayIndex === timePickerDayIndex);
                    if (!targetDay) return;
                    hapticLight();
                    const updatedPlanDay: GymPlanDay = {
                      ...targetDay.planDay,
                      startTime: preset.time,
                      endTime: preset.end,
                    };
                    updateMasterPlan(timePickerDayIndex, updatedPlanDay);
                    hapticSuccess();
                    setTimePickerDayIndex(null);
                  }}
                  style={styles.timePresetRow}
                >
                  <View style={styles.timePresetLeft}>
                    <Ionicons name={preset.icon as any} size={16} color="#FFFFFF" />
                    <Text style={styles.timePresetLabel}>{preset.label}</Text>
                  </View>
                  <Text style={styles.timePresetValue}>
                    {preset.time} – {preset.end}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── MODAL: SCHEDULE SETTINGS & ALARMS ── */}
      <GymScheduleSettingsModal
        visible={showScheduleSettings}
        onClose={() => setShowScheduleSettings(false)}
        userGymPlan={userGymPlan}
        onSaveWeekly={updateFullMasterPlan}
      />

      {/* ── CUSTOM APPLE-STYLE ACTION SHEET MODAL ── */}
      <Modal
        visible={actionSheetConfig !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setActionSheetConfig(null)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setActionSheetConfig(null)}
        >
          <Pressable
            style={styles.sheetContainer}
            onPress={e => e.stopPropagation()}
          >
            {/* Top Drag Handle */}
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.sheetTitleBlock}>
              <Text style={styles.sheetActionTitle} numberOfLines={1}>
                {actionSheetConfig?.title}
              </Text>
              {actionSheetConfig?.subtitle ? (
                <Text style={styles.sheetActionSubtitle} numberOfLines={1}>
                  {actionSheetConfig.subtitle}
                </Text>
              ) : null}
            </View>

            {/* Options List */}
            <View style={styles.sheetOptionsGroup}>
              {actionSheetConfig?.options.map((opt, idx) => {
                const isLast = idx === actionSheetConfig.options.length - 1;
                return (
                  <React.Fragment key={`sheet-opt-${opt.label}-${idx}`}>
                    <TouchableOpacity
                      style={styles.sheetOptionRow}
                      activeOpacity={0.7}
                      onPress={() => {
                        const run = opt.onPress;
                        setActionSheetConfig(null);
                        setTimeout(() => run(), 120);
                      }}
                    >
                      <View
                        style={[
                          styles.sheetOptionIconWrap,
                          opt.isDestructive && styles.sheetOptionIconWrapDestructive,
                        ]}
                      >
                        <Ionicons
                          name={opt.icon}
                          size={18}
                          color={opt.isDestructive ? '#FF453A' : '#FFFFFF'}
                        />
                      </View>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text
                          style={[
                            styles.sheetOptionLabel,
                            opt.isDestructive && { color: '#FF453A' },
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {opt.subtitle ? (
                          <Text style={styles.sheetOptionSublabel} numberOfLines={1}>
                            {opt.subtitle}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#636366" />
                    </TouchableOpacity>
                    {!isLast && <View style={styles.sheetDivider} />}
                  </React.Fragment>
                );
              })}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.sheetCancelBtn}
              activeOpacity={0.8}
              onPress={() => setActionSheetConfig(null)}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── MODAL: ADD EXERCISE TO PLAN (ALL WEEKS) ── */}
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
          const updatedPlanDay: GymPlanDay = {
            ...activeDay.planDay,
            exercises: updatedExercises,
            isRest: false,
          };
          await updateMasterPlan(activeDay.dayIndex, updatedPlanDay);
          hapticSuccess();
          setShowPlanAddModal(false);
        }}
        existingExerciseIds={(activeDay.planDay.exercises || []).map(e => e.id || e.name)}
      />

      {/* ── MODAL: SPLIT DEEP-DIVE & EXERCISE INSPECTOR ── */}
      <Modal
        visible={inspectSplitTarget !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setInspectSplitTarget(null)}
      >
        <SafeAreaView style={styles.modalSheetSafeArea} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.inspectorHeader}>
            <TouchableOpacity
              onPress={() => setInspectSplitTarget(null)}
              style={styles.inspectorCloseBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
              <Text style={styles.inspectorHeaderTitle} numberOfLines={1}>
                {inspectSplitTarget?.name}
              </Text>
              <Text style={styles.inspectorHeaderSubtitle}>
                {inspectSplitTarget?.daysPerWeek} Days / Wk · {inspectSplitTarget?.level}
              </Text>
            </View>

            <View style={{ width: 32 }} />
          </View>

          {inspectSplitTarget && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.inspectorScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Program Description */}
              <View style={styles.inspectorDescBox}>
                <Text style={styles.inspectorDescText}>{inspectSplitTarget.description}</Text>
              </View>

              {/* Workout Day Switcher Tabs */}
              <View style={{ marginTop: 8 }}>
                <Text style={styles.inspectorSectionLabel}>SELECT WORKOUT TO INSPECT</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.inspectorWorkoutTabsRow}
                >
                  {inspectSplitTarget.workouts.map((w, wIdx) => {
                    const isSelected = inspectWorkoutIndex === wIdx;
                    return (
                      <TouchableOpacity
                        key={w.id}
                        onPress={() => {
                          hapticLight();
                          setInspectWorkoutIndex(wIdx);
                        }}
                        style={[
                          styles.inspectorWorkoutTab,
                          isSelected && styles.inspectorWorkoutTabActive,
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.inspectorWorkoutTabText,
                            isSelected && styles.inspectorWorkoutTabTextActive,
                          ]}
                        >
                          {w.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Selected Workout Content */}
              {(() => {
                const selectedWorkout =
                  inspectSplitTarget.workouts[inspectWorkoutIndex] ||
                  inspectSplitTarget.workouts[0];
                if (!selectedWorkout) return null;

                const totalSets = (selectedWorkout.exercises || []).reduce(
                  (acc, ex) => acc + (Number(ex.targetSets) || 3),
                  0
                );
                const estMins = Math.round(totalSets * 2.5);

                return (
                  <View style={{ gap: 12, marginTop: 10 }}>
                    {/* Workout Overview Header Card */}
                    <View style={styles.inspectorWorkoutHeaderCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inspectorWorkoutName}>{selectedWorkout.name}</Text>
                        <Text style={styles.inspectorWorkoutSub}>{selectedWorkout.subtitle}</Text>
                        {Boolean(selectedWorkout.focus) && (
                          <Text style={styles.inspectorWorkoutFocusNotes}>{selectedWorkout.focus}</Text>
                        )}
                      </View>
                      <View style={styles.inspectorWorkoutMetaPill}>
                        <Text style={styles.inspectorWorkoutMetaText}>
                          {selectedWorkout.exercises?.length || 0} Ex · {totalSets} Sets · ~{estMins}m
                        </Text>
                      </View>
                    </View>

                    {/* Pre-Session Muscle Hit Map */}
                    <View style={{ paddingHorizontal: 2 }}>
                      <PreSessionMuscleHitMap
                        exercises={selectedWorkout.exercises || []}
                        isRest={false}
                        compact={false}
                        showMiniAvatar={true}
                        title={selectedWorkout.name}
                      />
                    </View>

                    {/* Exercises List */}
                    <View style={styles.inspectorExercisesBox}>
                      <Text style={styles.inspectorSectionLabel}>
                        EXERCISES IN THIS SESSION ({selectedWorkout.exercises?.length || 0})
                      </Text>
                      <View style={{ gap: 8, marginTop: 6 }}>
                        {(selectedWorkout.exercises || []).map((ex, exIdx) => {
                          const { targetMuscle } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
                          return (
                            <View key={`ex-${ex.id || exIdx}`} style={styles.inspectorExItem}>
                              <View style={styles.inspectorExIndexBadge}>
                                <Text style={styles.inspectorExIndexText}>#{exIdx + 1}</Text>
                              </View>
                              <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text style={styles.inspectorExName} numberOfLines={1}>
                                  {ex.name}
                                </Text>
                                <Text style={styles.inspectorExMeta}>
                                  {ex.targetSets} sets × {ex.targetReps || '8–12'} reps
                                  {targetMuscle ? ` · ${targetMuscle}` : ''}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                );
              })()}
            </ScrollView>
          )}

          {/* Sticky Bottom Apply Button */}
          {inspectSplitTarget && (
            <View style={styles.inspectorBottomBar}>
              <TouchableOpacity
                onPress={() => {
                  handleApplySplit(inspectSplitTarget);
                  setInspectSplitTarget(null);
                }}
                style={styles.inspectorApplyCtaBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.inspectorApplyCtaBtnText} numberOfLines={1}>
                  Apply Split to Schedule
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* ── MODAL: MESOCYCLE CURRICULUM & ROADMAP SHEET ── */}
      <Modal
        visible={inspectProgrammeTarget !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setInspectProgrammeTarget(null)}
      >
        <SafeAreaView style={styles.modalSheetSafeArea} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.inspectorHeader}>
            <TouchableOpacity
              onPress={() => setInspectProgrammeTarget(null)}
              style={styles.inspectorCloseBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
              <Text style={styles.inspectorHeaderTitle} numberOfLines={1}>
                {inspectProgrammeTarget?.name}
              </Text>
              <Text style={styles.inspectorHeaderSubtitle}>
                {inspectProgrammeTarget?.totalWeeks}-Week Scientific Mesocycle
              </Text>
            </View>

            <View style={{ width: 32 }} />
          </View>

          {inspectProgrammeTarget && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.inspectorScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Program Overview & RP Landmark Methodology */}
              <View style={styles.inspectorDescBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="bulb-outline" size={15} color="#A599FF" />
                  <Text style={styles.curriculumScienceTitle}>
                    {inspectProgrammeTarget.subtitle || 'Periodization Roadmap'}
                  </Text>
                </View>
                <Text style={styles.inspectorDescText}>{inspectProgrammeTarget.description}</Text>
              </View>

              {/* Week-by-Week Curriculum Cards */}
              <View style={{ marginTop: 10 }}>
                <Text style={styles.inspectorSectionLabel}>
                  WEEK-BY-WEEK PERIODIZATION CURRICULUM
                </Text>
                <View style={{ gap: 10, marginTop: 8 }}>
                  {Object.values(inspectProgrammeTarget.weeks).map(w => {
                    const col = getPhaseColor(w.phaseType);
                    const isEnrolledCurrent =
                      userGymPlan?.activeProgramme?.id === inspectProgrammeTarget.id &&
                      userGymPlan?.activeProgramme?.currentWeek === w.weekNumber;

                    return (
                      <View
                        key={`curric-w-${w.weekNumber}`}
                        style={[
                          styles.curriculumWeekCard,
                          isEnrolledCurrent && styles.curriculumWeekCardCurrent,
                        ]}
                      >
                        {/* Week Card Header */}
                        <View style={styles.curriculumWeekHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.curriculumWeekNum}>WEEK {w.weekNumber}</Text>
                            <View style={[styles.curriculumPhaseTag, { backgroundColor: col.bg }]}>
                              <Text style={[styles.curriculumPhaseTagText, { color: col.text }]}>
                                {w.phaseType.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                          {isEnrolledCurrent && (
                            <View style={styles.curriculumCurrentBadge}>
                              <Text style={styles.curriculumCurrentBadgeText}>CURRENT</Text>
                            </View>
                          )}
                        </View>

                        <Text style={styles.curriculumPhaseName}>{w.phaseName}</Text>

                        {/* Prescription Badges Row */}
                        <View style={styles.curriculumStatsRow}>
                          <View style={styles.curriculumStatItem}>
                            <Text style={styles.curriculumStatLabel}>TARGET RIR</Text>
                            <Text style={[styles.curriculumStatVal, { color: col.text }]}>
                              {w.targetRir != null ? `${w.targetRir} RIR` : 'Optimal'}
                            </Text>
                          </View>

                          <View style={styles.curriculumStatItem}>
                            <Text style={styles.curriculumStatLabel}>INTENSITY</Text>
                            <Text style={styles.curriculumStatVal}>
                              ~{w.intensityPercentage1RM || 70}% 1RM
                            </Text>
                          </View>

                          <View style={styles.curriculumStatItem}>
                            <Text style={styles.curriculumStatLabel}>VOLUME DELTA</Text>
                            <Text style={styles.curriculumStatVal}>
                              {w.volumeModifierSets >= 0 ? `+${w.volumeModifierSets}` : w.volumeModifierSets} Sets/ex
                            </Text>
                          </View>
                        </View>

                        {Boolean(w.notes) && (
                          <Text style={styles.curriculumNotesText}>💡 {w.notes}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          )}

          {/* Sticky Bottom Enroll Action */}
          {inspectProgrammeTarget && (
            <View style={styles.inspectorBottomBar}>
              {userGymPlan?.activeProgramme?.id === inspectProgrammeTarget.id ? (
                <View style={styles.curriculumAlreadyActiveRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#30D158" />
                  <Text style={styles.curriculumAlreadyActiveText}>
                    Enrolled · Currently on Week {userGymPlan.activeProgramme.currentWeek} of {inspectProgrammeTarget.totalWeeks}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    handleEnrollProgramme(inspectProgrammeTarget);
                    setInspectProgrammeTarget(null);
                  }}
                  style={styles.inspectorApplyCtaBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play" size={16} color="#FFFFFF" />
                  <Text style={styles.inspectorApplyCtaBtnText} numberOfLines={1}>
                    Enroll in {inspectProgrammeTarget.totalWeeks}-Week Mesocycle
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Unified Apple iOS HIG Stylesheet ──────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingHorizontal: 6,
    paddingBottom: 110,
    gap: 10,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 999,
  },
  primaryActionText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },

  // Segmented Control (Minimal, Subtle, No Pills)
  // Bespoke Plan Generator Banner Styles
  aiPlanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
  },
  aiPlanLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    minWidth: 0,
  },
  aiPlanIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  aiPlanTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  aiPlanSubtitle: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
  aiPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0A84FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexShrink: 0,
  },
  aiPlanBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },

  segmentedTrack: {
    flexDirection: 'row',
    marginHorizontal: 6,
    marginBottom: 8,
    padding: 3,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    gap: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: '#2C2C2E',
  },
  segmentText: {
    fontSize: 13,
  },
  segmentTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  segmentTextInactive: {
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },

  // Unified Control Center Card
  unifiedControlCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  controlHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlPreTitle: {
    fontSize: 10.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.6,
  },
  controlTitle: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    marginTop: 1,
  },
  switchSplitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  switchSplitBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  modeSwitcherRow: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  modeSwitcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modeSwitcherBtnActive: {
    backgroundColor: '#3A3A3C',
  },
  modeSwitcherBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  modeSwitcherBtnTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  editPlanToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  editPlanToggleBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },

  // Program Banner in Schedule
  programBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
  },
  programPreTitle: {
    fontSize: 10.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.6,
  },
  programTitle: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    marginTop: 2,
  },
  changeSplitBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  changeSplitBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },

  // 7-Day Day Selector Strip
  weekStripCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 10,
  },
  dayStripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayColBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  dayColBtnActive: {
    backgroundColor: '#2C2C2E',
  },
  dayColShort: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  dayColShortActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  dayColDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  todayIndicatorDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },

  // Focused Day Card
  focusedDayCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  focusedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  focusedDayWeekday: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  todayPill: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  todayPillText: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  restoreDefaultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,159,10,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,159,10,0.35)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  restoreDefaultPillText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    color: '#FF9F0A',
  },
  focusedDayTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    marginTop: 2,
  },
  focusedDayFocus: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    marginTop: 2,
  },
  timeSlotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeSlotText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#FFFFFF',
  },
  headerRestToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  headerRestToggleBtnActive: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.35)',
  },
  headerRestToggleBtnText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
  },
  moreOptionsIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(84, 84, 88, 0.36)',
  },

  // Rest Day Display
  restDayContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  restDayTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  restDaySub: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 12,
  },
  switchWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  switchWorkoutBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },

  // Exercises List in Focused Day
  exercisesListWrap: {
    gap: 8,
  },
  exerciseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exIndexNum: {
    width: 18,
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    textAlign: 'center',
  },
  exNameText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  exTargetText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    marginTop: 1,
  },
  emptyNote: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
  },
  planExDeleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,69,58,0.1)',
  },
  dayPrimaryActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  planAddExBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    paddingVertical: 9,
    borderRadius: 10,
  },
  planAddExBtnText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#0A84FF',
  },
  planSwapRoutineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#2C2C2E',
    paddingVertical: 9,
    borderRadius: 10,
  },
  planSwapRoutineBtnText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  planAddExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(10,132,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.25)',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 4,
  },
  planAddExerciseBtnText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#0A84FF',
  },

  // Day Actions Row
  actionDayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionDayBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
  },
  dayActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  startWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  startWorkoutBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  secondaryDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  secondaryDayBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#FFFFFF',
  },

  // Weekly Volume Overview Card
  volumeOverviewCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  cardSectionLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cardSubLabel: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#636366',
    marginTop: 2,
  },
  volumeOverviewTotal: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    marginTop: 2,
  },
  volumeOverviewMuscles: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    marginTop: 2,
  },

  // Routines Sub-Tab
  routinesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  emptyRoutinesCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    marginTop: 4,
  },
  routineCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  routineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  routineName: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  routineSubtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    marginTop: 2,
  },
  assignPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  assignPillText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  routineExList: {
    gap: 4,
  },
  routineExRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routineExDot: {
    fontSize: 11,
    color: '#8E8E93',
  },
  routineExName: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    flex: 1,
  },
  routineExSets: {
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
  },
  routineMoreExText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    paddingLeft: 10,
    marginTop: 2,
  },
  routineFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  routineAssignBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#2C2C2E',
    paddingVertical: 9,
    borderRadius: 10,
  },
  routineAssignBtnText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  routineStartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    borderRadius: 10,
  },
  routineStartBtnText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  iconSquareBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Explore Sub-Tab
  filterChipsRow: {
    gap: 6,
    paddingVertical: 4,
  },
  filterChipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#1C1C1E',
  },
  filterChipBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  filterChipTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  splitCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  splitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  splitDaysBadge: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  splitLevelBadge: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  splitProgramTitle: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    marginTop: 2,
  },
  activeProgramBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeProgramBadgeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: '#30D158',
  },
  applySplitBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 5.5,
    borderRadius: 999,
  },
  applySplitBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  splitDescription: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    lineHeight: 16,
  },
  splitSchedulePreview: {
    backgroundColor: '#26262A',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    gap: 4,
  },
  splitScheduleLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  splitWorkoutsList: {
    gap: 3,
  },
  splitWorkoutTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  splitWorkoutTagName: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  splitWorkoutTagFocus: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    flex: 1,
  },

  // Modal Sheets
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 36,
    gap: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  sheetSubtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    marginTop: 2,
  },
  dayPickList: {
    gap: 6,
    marginTop: 6,
  },
  dayPickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  dayPickName: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  dayPickCurrent: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  timePresetsList: {
    gap: 8,
    marginTop: 6,
  },
  timePresetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  timePresetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timePresetLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  timePresetValue: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  // Programmes Sub-Tab Styles
  programmeActiveCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    marginBottom: 20,
  },
  programmeActiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  programmeActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  programmeActiveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#30D158',
  },
  programmeActiveBadgeText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    color: '#30D158',
    letterSpacing: 0.5,
  },
  programmeGoalBadge: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  programmeActiveTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  programmeActiveSubtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    marginBottom: 12,
  },
  programmeWeekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  programmeWeekText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  programmePhasePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  programmePhasePillText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.3,
  },
  programmeSegmentsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 14,
  },
  programmeSegmentDash: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  programmePhaseBox: {
    backgroundColor: '#242426',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  programmePhaseBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  programmePhaseBoxTitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  programmePhaseStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  programmePhaseStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  programmePhaseStatText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  programmePhaseNotes: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.regular,
    color: '#AEAEB2',
    lineHeight: 16,
  },
  programmeActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  programmeStepBtn: {
    backgroundColor: '#2C2C2E',
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  programmeAdvanceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0A84FF',
    paddingVertical: 9,
    borderRadius: 10,
  },
  programmeAdvanceBtnText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  programmeEndBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
  },
  programmeEndBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#FF453A',
  },
  programmeEmptyHero: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  programmeEmptyTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    marginTop: 10,
    marginBottom: 6,
  },
  programmeEmptySub: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  programmeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  programmeSectionHeaderTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.8,
  },
  programmeLibraryCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    marginBottom: 12,
  },
  programmeLibraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  programmeLibraryTag: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    color: '#0A84FF',
    letterSpacing: 0.5,
  },
  programmeLibraryWeeks: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
  },
  programmeLibraryTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  programmeLibrarySubtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    marginBottom: 8,
  },
  programmeLibraryDesc: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.regular,
    color: '#C7C7CC',
    lineHeight: 17,
    marginBottom: 12,
  },
  programmeTimelineRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 14,
  },
  programmeTimelinePill: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  programmeTimelineWeekLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
  },
  programmeTimelinePhaseLabel: {
    fontSize: 10.5,
    fontFamily: FONT_FAMILY.bold,
    marginTop: 2,
  },
  programmePhasesBar: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: '#2C2C2E',
    marginBottom: 8,
    gap: 2,
  },
  programmePhaseBarSegment: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
  },
  programmeWeeksScrollTrack: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  programmeWeekScrollPill: {
    width: 48,
    height: 42,
    backgroundColor: '#26262A',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  programmeEnrollBtn: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0A84FF',
    borderRadius: 12,
  },
  programmeEnrollBtnText: {
    fontSize: 13.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  programmeEnrolledBadge: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    borderRadius: 12,
  },
  programmeEnrolledBadgeText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: '#30D158',
  },

  // Apple-Style Bottom Sheet Action Menu
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 16,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitleBlock: {
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  sheetActionTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  sheetActionSubtitle: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 2,
  },
  sheetOptionsGroup: {
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    overflow: 'hidden',
  },
  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  sheetOptionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionIconWrapDestructive: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
  },
  sheetOptionLabel: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  sheetOptionSublabel: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    marginTop: 1,
  },
  sheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(84, 84, 88, 0.4)',
    marginLeft: 58,
  },
  sheetCancelBtn: {
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  sheetCancelText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },

  // ── Executive Mesocycles & Continuous Progress Bar ──
  programmeWeekProgressText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
  },
  continuousProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2C2C2E',
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 12,
  },
  continuousProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  activePrescriptionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  activePrescriptionChip: {
    flex: 1,
    backgroundColor: '#26262A',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePrescriptionLabel: {
    fontSize: 9.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  activePrescriptionValue: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  activePrescriptionNotes: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: '#A599FF',
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  activeProgActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  activeAdvanceBtn: {
    flex: 1,
    backgroundColor: '#30D158',
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeAdvanceBtnText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  activeRoadmapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2C2C2E',
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  activeRoadmapBtnText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  activeEndBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Compact Discovery Hero (Replaces sluggish blank card)
  compactDiscoveryHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(165, 153, 255, 0.2)',
  },
  compactHeroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(165, 153, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactHeroTitle: {
    fontSize: 14.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  compactHeroSub: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    lineHeight: 16,
    marginTop: 2,
  },

  // Curated Mesocycle Card Actions
  programmeCardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  programmeViewCurriculumBtn: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
  },
  programmeViewCurriculumBtnText: {
    fontSize: 13.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },

  // Explore Tap Hint Pill
  splitInspectTapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.2)',
  },
  splitInspectTapHintText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#0A84FF',
    flex: 1,
    marginLeft: 6,
  },

  // ── Bottom Sheet Modals (Apple iOS HIG) ──
  modalSheetSafeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  inspectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  inspectorCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectorHeaderTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  inspectorHeaderSubtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    marginTop: 1,
  },
  inspectorScrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  inspectorDescBox: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
  },
  inspectorDescText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    lineHeight: 18,
  },
  inspectorSectionLabel: {
    fontSize: 10.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inspectorWorkoutTabsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  inspectorWorkoutTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#1C1C1E',
  },
  inspectorWorkoutTabActive: {
    backgroundColor: '#FFFFFF',
  },
  inspectorWorkoutTabText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  inspectorWorkoutTabTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  inspectorWorkoutHeaderCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  inspectorWorkoutName: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  inspectorWorkoutSub: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.medium,
    color: '#30D158',
  },
  inspectorWorkoutFocusNotes: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    lineHeight: 16,
    marginTop: 4,
  },
  inspectorWorkoutMetaPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#2C2C2E',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  inspectorWorkoutMetaText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
  },
  inspectorExercisesBox: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
  },
  inspectorExItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26262A',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  inspectorExIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectorExIndexText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
  },
  inspectorExName: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  inspectorExMeta: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    marginTop: 1,
  },
  inspectorBottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2C2C2E',
    backgroundColor: '#000000',
  },
  inspectorApplyCtaBtn: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6C5CE7',
    borderRadius: 14,
    paddingHorizontal: 20,
  },
  inspectorApplyCtaBtnText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  // ── Curriculum Roadmap Sheet ──
  curriculumScienceTitle: {
    fontSize: 13.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#A599FF',
  },
  curriculumWeekCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  curriculumWeekCardCurrent: {
    borderColor: '#30D158',
    backgroundColor: 'rgba(48, 209, 88, 0.05)',
  },
  curriculumWeekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  curriculumWeekNum: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  curriculumPhaseTag: {
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  curriculumPhaseTagText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.5,
  },
  curriculumCurrentBadge: {
    backgroundColor: '#30D158',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  curriculumCurrentBadgeText: {
    fontSize: 9.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  curriculumPhaseName: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  curriculumStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  curriculumStatItem: {
    flex: 1,
    backgroundColor: '#26262A',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  curriculumStatLabel: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  curriculumStatVal: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  curriculumNotesText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    lineHeight: 16,
    marginTop: 2,
  },
  curriculumAlreadyActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  curriculumAlreadyActiveText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: '#30D158',
  },
});
