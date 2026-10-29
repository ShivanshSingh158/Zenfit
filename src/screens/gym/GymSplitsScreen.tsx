/**
 * GymSplitsScreen.tsx — ZenFit
 *
 * Tab 2: Plan Hub (Zero-Clutter Apple iOS HIG Architecture)
 * 3-Part Architecture:
 * - Sub-Tab 1: 📅 Schedule (7-Day Program with Focused Day Inspector & Weekly Volume)
 * - Sub-Tab 2: 📋 Routines (Custom Workout Library with Direct Start & Assignment)
 * - Sub-Tab 3: 🗂️ Explore (Browse Pre-Built Splits & Programs, One-Tap Apply)
 */

import React, { useState, useMemo, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../../contexts/ThemeContext';
import { useGymPlan } from '../../contexts/domains/WellnessContext';
import { GYM_PLAN, GYM_PLAN_ARNOLD, WEEKDAY_TO_PLAN } from '../../data/gymPlan';
import { CURATED_SPLITS, CuratedSplit, REST_DAY_TEMPLATE } from '../../data/curatedSplits';
import { GymPlanDay, GymPlanExercise, GymRoutine } from '../../types/gym.types';
import { hapticLight, hapticMedium, hapticSuccess, hapticSelection } from '../../utils/haptics';
import { getCanonicalExerciseName, resolveExerciseTargetMuscle } from '../../utils/gymUtils';
import { FONT_FAMILY, IOS_DARK } from '../../theme/tokens';
import { todayStr } from '../../hooks/useGymLog';

import { RoutineEditorModal } from '../../components/Gym/schedule/RoutineEditorModal';
import GymScheduleSettingsModal from '../../components/Gym/schedule/GymScheduleSettingsModal';
import { AddExerciseModal } from '../../components/Gym/exercise/AddExerciseModal';

type PlanSubTab = 'schedule' | 'routines' | 'explore';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const QUICK_TIME_PRESETS = [
  { label: 'Morning', icon: 'sunny-outline', time: '05:30', end: '07:00' },
  { label: 'Afternoon', icon: 'partly-sunny-outline', time: '15:30', end: '17:00' },
  { label: 'Evening', icon: 'sunset-outline', time: '17:30', end: '19:00' },
  { label: 'Night', icon: 'moon-outline', time: '19:30', end: '21:00' },
];

export default function GymSplitsScreen() {
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
  } = useGymPlan();

  // ── Sub-Tab State ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<PlanSubTab>('schedule');

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

  // Explore Filter
  const [exploreFilter, setExploreFilter] = useState('All');

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

  // User Custom Routines list
  const customRoutinesList = useMemo<GymRoutine[]>(() => {
    if (!userGymPlan?.routines) return [];
    return Object.values(userGymPlan.routines).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [userGymPlan?.routines]);

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
            {splitTitle} · {trainingDaysCount}d training
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

          <TouchableOpacity
            onPress={handleCreateRoutine}
            style={styles.primaryActionBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={14} color="#000000" />
            <Text style={styles.primaryActionText}>Add Routine</Text>
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

          {/* Program Overview Banner */}
          <View style={styles.programBanner}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.programPreTitle}>ACTIVE 7-DAY PROGRAM</Text>
              <Text style={styles.programTitle}>{splitTitle}</Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                hapticSelection();
                setActiveTab('explore');
              }}
              style={styles.changeSplitBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.changeSplitBtnText}>Browse Splits →</Text>
            </TouchableOpacity>
          </View>

          {/* 7-Day Apple Glide Selector Strip */}
          <View style={styles.weekStripCard}>
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
                      {DAY_SHORT[d.dayIndex - 1]}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.focusedDayWeekday}>{activeDay.dayName}</Text>
                  {activeDay.dayIndex === (currentDayOfWeek === 0 ? 7 : currentDayOfWeek) && (
                    <View style={styles.todayPill}>
                      <Text style={styles.todayPillText}>TODAY</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.focusedDayTitle}>{activeDay.planDay.name}</Text>
                {activeDay.planDay.focus ? (
                  <Text style={styles.focusedDayFocus}>{activeDay.planDay.focus}</Text>
                ) : null}
              </View>

              {/* Time Slot Pill */}
              <TouchableOpacity
                onPress={() => setTimePickerDayIndex(activeDay.dayIndex)}
                style={styles.timeSlotPill}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={12} color="#8E8E93" />
                <Text style={styles.timeSlotText}>
                  {formatTimeSlot(activeDay.planDay.startTime) || 'Set Time'}
                </Text>
              </TouchableOpacity>
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
                      <TouchableOpacity
                        onPress={() => handleDeleteExerciseFromPlan(activeDay.dayIndex, idx, ex.name)}
                        style={styles.planExDeleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={15} color="#FF453A" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {(!activeDay.planDay.exercises || activeDay.planDay.exercises.length === 0) && (
                    <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                      <Text style={styles.emptyNote}>No exercises assigned to this day yet.</Text>
                    </View>
                  )}

                  {/* Add Exercise to Plan Button (Saves for all future weeks) */}
                  <TouchableOpacity
                    onPress={() => {
                      hapticLight();
                      setShowPlanAddModal(true);
                    }}
                    style={styles.planAddExerciseBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-circle" size={16} color="#0A84FF" />
                    <Text style={styles.planAddExerciseBtnText}>Add Exercise to {activeDay.dayName} (All Weeks)</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.hairline} />

                {/* Day Action Buttons Row */}
                <View style={[styles.dayActionsRow, { gap: 8 }]}>
                  <TouchableOpacity
                    onPress={() => {
                      hapticLight();
                      const routineObj: GymRoutine = {
                        id: activeDay.planDay.routineId || `rt_day_${activeDay.dayIndex}`,
                        name: activeDay.planDay.name,
                        subtitle: activeDay.planDay.subtitle,
                        focus: activeDay.planDay.focus,
                        exercises: activeDay.planDay.exercises || [],
                        updatedAt: Date.now(),
                      };
                      setEditingRoutine(routineObj);
                      setEditingDayIndex(activeDay.dayIndex);
                      setRoutineEditorVisible(true);
                    }}
                    style={[
                      styles.actionDayBtn,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={13} color={colors.textPrimary} />
                    <Text style={[styles.actionDayBtnText, { color: colors.textPrimary }]} numberOfLines={1}>Edit</Text>
                  </TouchableOpacity>

                  {isDayModifiedFromDefault && (
                    <TouchableOpacity
                      onPress={() => handleRestoreDefaultDay(activeDay.dayIndex)}
                      style={[
                        styles.actionDayBtn,
                        {
                          backgroundColor: isDark ? 'rgba(255, 159, 10, 0.12)' : 'rgba(255, 159, 10, 0.08)',
                          borderColor: isDark ? 'rgba(255, 159, 10, 0.35)' : 'rgba(255, 159, 10, 0.25)',
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="refresh-outline" size={13} color="#FF9F0A" />
                      <Text style={[styles.actionDayBtnText, { color: '#FF9F0A' }]} numberOfLines={1}>Restore</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => handleToggleRest(activeDay.dayIndex)}
                    style={[
                      styles.actionDayBtn,
                      {
                        backgroundColor: isDark ? 'rgba(165, 153, 255, 0.10)' : 'rgba(165, 153, 255, 0.08)',
                        borderColor: isDark ? 'rgba(165, 153, 255, 0.25)' : 'rgba(165, 153, 255, 0.20)',
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="moon-outline" size={13} color="#A599FF" />
                    <Text style={[styles.actionDayBtnText, { color: '#A599FF' }]} numberOfLines={1}>Mark Rest</Text>
                  </TouchableOpacity>
                </View>
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
              {customRoutinesList.map(rt => {
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

                      {/* Assign Quick Action */}
                      <TouchableOpacity
                        onPress={() => setAssignRoutineTarget(rt)}
                        style={styles.assignPillBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="calendar-outline" size={12} color="#FFFFFF" />
                        <Text style={styles.assignPillText}>Assign to Day</Text>
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

                    <View style={styles.hairline} />

                    {/* Footer Actions */}
                    <View style={styles.routineFooterRow}>
                      <TouchableOpacity
                        onPress={() => handleStartWorkout(rt)}
                        style={styles.startWorkoutBtn}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="play" size={13} color="#000000" />
                        <Text style={styles.startWorkoutBtnText}>Start Workout</Text>
                      </TouchableOpacity>

                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => handleEditRoutine(rt)}
                          style={styles.secondaryDayBtn}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="create-outline" size={13} color="#FFFFFF" />
                          <Text style={styles.secondaryDayBtnText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDuplicateRoutine(rt)}
                          style={styles.iconSquareBtn}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="copy-outline" size={14} color="#8E8E93" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDeleteRoutine(rt.id)}
                          style={styles.iconSquareBtn}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={14} color="#FF453A" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          SUB-TAB 3: 🗂️ EXPLORE (Browse Pre-Built Splits with One-Tap Apply)
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'explore' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

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
                <View key={split.id} style={styles.splitCard}>
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
                </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
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
});
