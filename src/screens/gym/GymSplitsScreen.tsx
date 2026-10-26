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
import { GymPlanDay, GymPlanExercise, GymRoutine } from '../../types/gym.types';
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/haptics';
import { getCanonicalExerciseName, resolveExerciseTargetMuscle } from '../../utils/gymUtils';
import { FONT_FAMILY, IOS_DARK, SPACE } from '../../theme/tokens';

import { WeeklyScheduleStrip } from '../../components/Gym/WeeklyScheduleStrip';
import { RoutineEditorModal } from '../../components/Gym/RoutineEditorModal';
import { ZenGymAiModal } from '../../components/Gym/ZenGymAiModal';
import { GymTemplateModal } from '../../components/Gym/GymTemplateModal';
import GymScheduleSettingsModal from '../../components/Gym/GymScheduleSettingsModal';
import { GymAiIcon } from '../../components/Gym/GymAiIcon';

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

  // Modals
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [showScheduleSettings, setShowScheduleSettings] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [routineEditorVisible, setRoutineEditorVisible] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<GymRoutine | null>(null);
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);

  // Day Selector: 1..7 for Monday..Sunday
  const currentDayOfWeek = new Date().getDay();
  const defaultDayIndex = currentDayOfWeek === 0 ? 7 : currentDayOfWeek;
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(defaultDayIndex);

  // Quick Time Picker Modal State
  const [timePickerDayIndex, setTimePickerDayIndex] = useState<number | null>(null);

  // Rename Day Modal State
  const [renamingDay, setRenamingDay] = useState<{
    dayIndex: number;
    dayName: string;
    currentRoutineName: string;
    currentFocus: string;
  } | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [renameFocusInput, setRenameFocusInput] = useState('');

  // Assign Routine to Day Picker State
  const [assignRoutineTarget, setAssignRoutineTarget] = useState<GymRoutine | null>(null);

  const activeTemplate = userGymPlan?.templateId || 'ppl';

  const splitTitle = useMemo(() => {
    const customName = (userGymPlan as any)?.name;
    if (customName) return customName;
    if (activeTemplate === 'arnold') return 'Arnold Split';
    if (activeTemplate === 'ppl') return 'Push / Pull / Legs';
    if (activeTemplate === 'upper_lower') return 'Upper / Lower';
    if (activeTemplate === 'full_body') return 'Full Body';
    return 'Weekly Split';
  }, [(userGymPlan as any)?.name, activeTemplate]);

  // Build resolved 7-day schedule
  const resolvedDays = useMemo(() => {
    const days: { dayIndex: number; dayName: string; planDay: GymPlanDay }[] = [];
    const basePlan = activeTemplate === 'arnold' ? GYM_PLAN_ARNOLD : GYM_PLAN;

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

  // User Custom Routines list
  const customRoutinesList = useMemo<GymRoutine[]>(() => {
    if (!userGymPlan?.routines) return [];
    return Object.values(userGymPlan.routines).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [userGymPlan?.routines]);

  // Assign routine to specific day
  const handleAssignRoutineToDay = useCallback(
    async (dayIndex: number, routineId?: string, routine?: GymRoutine) => {
      await assignRoutineToDay(dayIndex, routineId, routine);
      hapticSuccess();
    },
    [assignRoutineToDay]
  );

  // Toggle Rest Day
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

  // Rename Day
  const openRenameModal = useCallback(
    (dayIndex: number) => {
      const targetDay = resolvedDays.find(d => d.dayIndex === dayIndex);
      if (!targetDay) return;
      hapticLight();
      setRenamingDay({
        dayIndex,
        dayName: targetDay.dayName,
        currentRoutineName: targetDay.planDay.name,
        currentFocus: targetDay.planDay.focus || '',
      });
      setRenameInput(targetDay.planDay.name);
      setRenameFocusInput(targetDay.planDay.focus || '');
    },
    [resolvedDays]
  );

  const handleSaveRename = useCallback(() => {
    if (!renamingDay) return;
    const targetDay = resolvedDays.find(d => d.dayIndex === renamingDay.dayIndex);
    if (!targetDay) return;
    const trimmedName = renameInput.trim() || `Workout Day ${renamingDay.dayIndex}`;
    const trimmedFocus = renameFocusInput.trim();
    const updatedPlanDay: GymPlanDay = {
      ...targetDay.planDay,
      name: trimmedName,
      focus: trimmedFocus,
    };
    updateMasterPlan(renamingDay.dayIndex, updatedPlanDay);
    hapticSuccess();
    setRenamingDay(null);
  }, [renamingDay, renameInput, renameFocusInput, resolvedDays, updateMasterPlan]);

  // Edit Time Presets
  const handleSelectTimePreset = useCallback(
    (timePreset: { time: string; end: string }) => {
      if (timePickerDayIndex === null) return;
      const targetDay = resolvedDays.find(d => d.dayIndex === timePickerDayIndex);
      if (!targetDay) return;
      hapticLight();
      const updatedPlanDay: GymPlanDay = {
        ...targetDay.planDay,
        startTime: timePreset.time,
        endTime: timePreset.end,
      };
      updateMasterPlan(timePickerDayIndex, updatedPlanDay);
      hapticSuccess();
      setTimePickerDayIndex(null);
    },
    [timePickerDayIndex, resolvedDays, updateMasterPlan]
  );

  // Edit Routine from Day Card
  const handleEditRoutineFromDay = useCallback((planDay: GymPlanDay, dayIndex: number) => {
    hapticLight();
    const routineObj: GymRoutine = {
      id: planDay.routineId || `rt_day_${dayIndex}`,
      name: planDay.name,
      subtitle: planDay.subtitle,
      focus: planDay.focus,
      exercises: planDay.exercises || [],
      updatedAt: Date.now(),
    };
    setEditingRoutine(routineObj);
    setEditingDayIndex(dayIndex);
    setRoutineEditorVisible(true);
  }, []);

  // Routine Management Actions
  const handleCreateRoutine = useCallback((dayIndex?: number | any) => {
    hapticMedium();
    setEditingRoutine(null);
    const targetIdx = typeof dayIndex === 'number' ? dayIndex : (selectedDayIndex || null);
    setEditingDayIndex(targetIdx);
    setRoutineEditorVisible(true);
  }, [selectedDayIndex]);

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

  // Compute Muscle Set Volume Breakdown for Routine Card
  const getRoutineMuscleVolume = (routineExercises: GymPlanExercise[]) => {
    const vol: Record<string, number> = {};
    let totalSets = 0;
    for (const ex of routineExercises || []) {
      const sets = Number(ex.targetSets) || 3;
      totalSets += sets;
      const m = ex.muscle?.split('/')[0]?.trim() || 'Other';
      vol[m] = (vol[m] || 0) + sets;
    }
    const topMuscles = Object.entries(vol)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([m, s]) => `${m}: ${s}s`)
      .join(' · ');
    return { topMuscles, totalSets, mins: Math.round(totalSets * 2.5) };
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDark ? IOS_DARK.bgCanvas : colors.background }]}
      edges={['top']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* ── Top Header Bar (Apple HIG Large Title with Subtle Action Pills) ── */}
      <View style={styles.header}>
        <View style={styles.headerTitleCol}>
          <Text style={[styles.screenTitle, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}>
            Plan
          </Text>
          <Text style={styles.screenSubtitle}>
            {splitTitle} · 7-Day Schedule
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              hapticLight();
              setShowScheduleSettings(true);
            }}
            style={styles.headerIconBtn}
            accessibilityLabel="Alarms and Schedule"
          >
            <Ionicons name="alarm-outline" size={18} color={isDark ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              hapticLight();
              setAiModalVisible(true);
            }}
            style={styles.headerIconBtn}
            accessibilityLabel="AI Coach"
          >
            <GymAiIcon size={18} primaryColor="#A599FF" sparkleColor="#EC4899" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Main Scrollable Plan Content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Subtle Weekly Schedule Strip + Balance Pill + Direct Exercise Cards */}
        <WeeklyScheduleStrip
          resolvedDays={resolvedDays}
          selectedDayIndex={selectedDayIndex}
          onSelectDayIndex={setSelectedDayIndex}
          onToggleRest={handleToggleRest}
          onRenameDay={openRenameModal}
          onEditTime={dayIdx => setTimePickerDayIndex(dayIdx)}
          onEditRoutineExercises={handleEditRoutineFromDay}
          onAssignRoutine={handleAssignRoutineToDay}
          customRoutines={customRoutinesList}
        />

        {/* 2. Master Split Program */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>MASTER SPLIT PROGRAM</Text>
          <TouchableOpacity onPress={() => setShowTemplateModal(true)} style={styles.createInlineBtn}>
            <Text style={styles.createInlineText}>Explore Splits</Text>
            <Ionicons name="chevron-forward" size={12} color="#A599FF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            hapticLight();
            setShowTemplateModal(true);
          }}
          style={[
            styles.activeSplitCard,
            { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface },
          ]}
        >
          <View style={styles.splitIconBox}>
            <Ionicons name="layers-outline" size={20} color="#A599FF" />
          </View>
          <View style={styles.splitTextCol}>
            <View style={styles.splitBadgeRow}>
              <Text style={styles.splitPreTitle}>CURRENT PROGRAM</Text>
              <View style={styles.splitActiveBadge}>
                <Text style={styles.splitActiveBadgeText}>Active</Text>
              </View>
            </View>
            <Text style={[styles.splitTitleText, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}>
              {splitTitle}
            </Text>
            <Text style={styles.splitSubText}>
              Tap to browse Arnold, PPL, Upper/Lower, or custom splits
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#636366" />
        </TouchableOpacity>

        {/* 3. Custom Routines */}
        <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
          <Text style={styles.sectionTitle}>MY ROUTINES</Text>
          <TouchableOpacity onPress={handleCreateRoutine} style={styles.createInlineBtn}>
            <Ionicons name="add" size={14} color="#A599FF" />
            <Text style={styles.createInlineText}>New</Text>
          </TouchableOpacity>
        </View>

        {customRoutinesList.length === 0 ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCreateRoutine}
            style={[
              styles.emptyRoutinesSlimCard,
              { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface },
            ]}
          >
            <Ionicons name="add-circle-outline" size={18} color="#A599FF" style={{ marginRight: 8 }} />
            <Text style={[styles.emptyRoutinesSlimText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Create a custom routine for quick assignment
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#636366" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        ) : (
          customRoutinesList.map(rt => {
            const { topMuscles, totalSets, mins } = getRoutineMuscleVolume(rt.exercises || []);

            return (
              <TouchableOpacity
                key={`custom-rt-${rt.id}`}
                activeOpacity={0.75}
                onPress={() => handleEditRoutine(rt)}
                style={[
                  styles.routineCard,
                  { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface },
                ]}
              >
                <View style={styles.routineCardMain}>
                  <View style={styles.routineTitleCol}>
                    <Text
                      style={[styles.routineName, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {rt.name}
                    </Text>
                    <Text style={styles.routineSubtitle} numberOfLines={1}>
                      {rt.exercises?.length || 0} Movements · {totalSets} Sets · ~{mins} Mins
                    </Text>
                    {topMuscles ? (
                      <Text style={styles.routineMuscles} numberOfLines={1}>
                        {topMuscles}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.routineRightActions}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={e => {
                        e.stopPropagation();
                        setAssignRoutineTarget(rt);
                      }}
                      style={styles.cardAssignBtn}
                    >
                      <Ionicons name="calendar-outline" size={13} color="#A599FF" />
                      <Text style={styles.cardAssignText}>Assign</Text>
                    </TouchableOpacity>
                    <Ionicons name="chevron-forward" size={16} color="#636366" style={{ marginLeft: 6 }} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ── MODAL: ROUTINE BUILDER / EDITOR ── */}
      <RoutineEditorModal
        visible={routineEditorVisible}
        routineToEdit={editingRoutine}
        initialDayIndex={editingDayIndex}
        onClose={() => {
          setRoutineEditorVisible(false);
          setEditingDayIndex(null);
        }}
        onSave={(savedRt, targetDayIndex) => {
          saveCustomRoutine(savedRt);
          if (targetDayIndex != null && targetDayIndex >= 1 && targetDayIndex <= 7) {
            const targetDay = resolvedDays.find(d => d.dayIndex === targetDayIndex);
            if (targetDay) {
              const updatedPlanDay: GymPlanDay = {
                ...targetDay.planDay,
                routineId: savedRt.id,
                name: savedRt.name,
                subtitle: savedRt.subtitle,
                focus: savedRt.focus,
                exercises: savedRt.exercises,
                isRest: false,
              };
              updateMasterPlan(targetDayIndex, updatedPlanDay);
            }
          }
          setRoutineEditorVisible(false);
          setEditingDayIndex(null);
        }}
      />

      {/* ── MODAL: ASSIGN ROUTINE TO DAY ── */}
      <Modal
        visible={assignRoutineTarget !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={() => setAssignRoutineTarget(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAssignRoutineTarget(null)}>
          <Pressable
            style={[styles.sheetCard, { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : '#FFFFFF' }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Assign to Day</Text>
                <Text style={styles.sheetSubtitle}>
                  Choose which day to schedule "{assignRoutineTarget?.name}"
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAssignRoutineTarget(null)}>
                <Ionicons name="close" size={22} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.dayPickList}>
              {DAY_NAMES.map((dName, idx) => (
                <TouchableOpacity
                  key={`day-pick-${idx + 1}`}
                  style={styles.dayPickRow}
                  onPress={() => {
                    if (assignRoutineTarget) {
                      assignRoutineToDay(idx + 1, assignRoutineTarget.id, assignRoutineTarget);
                      setAssignRoutineTarget(null);
                      hapticSuccess();
                    }
                  }}
                >
                  <Text style={[styles.dayPickName, { color: isDark ? '#FFFFFF' : '#000000' }]}>{dName}</Text>
                  <Ionicons name="chevron-forward" size={15} color="#A599FF" />
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── MODAL: TIME SLOT PICKER ── */}
      <Modal
        visible={timePickerDayIndex !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={() => setTimePickerDayIndex(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setTimePickerDayIndex(null)}>
          <Pressable
            style={[styles.sheetCard, { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : '#FFFFFF' }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Gym Time Slot</Text>
                <Text style={styles.sheetSubtitle}>
                  {timePickerDayIndex !== null ? DAY_NAMES[timePickerDayIndex - 1] : ''} Routine Schedule
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTimePickerDayIndex(null)}>
                <Ionicons name="close" size={22} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.timePresetsList}>
              {QUICK_TIME_PRESETS.map(preset => (
                <TouchableOpacity
                  key={`preset-${preset.time}`}
                  activeOpacity={0.7}
                  onPress={() => handleSelectTimePreset(preset)}
                  style={[styles.timePresetRow, { backgroundColor: isDark ? IOS_DARK.bgElevatedInput : '#F2F2F7' }]}
                >
                  <View style={styles.timePresetLeft}>
                    <Ionicons name={preset.icon as any} size={16} color="#A599FF" />
                    <Text style={[styles.timePresetLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                      {preset.label}
                    </Text>
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

      {/* ── MODAL: RENAME DAY ── */}
      <Modal
        visible={renamingDay !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={() => setRenamingDay(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRenamingDay(null)}>
          <Pressable
            style={[styles.sheetCard, { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : '#FFFFFF' }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Rename {renamingDay?.dayName}</Text>
              <TouchableOpacity onPress={() => setRenamingDay(null)}>
                <Ionicons name="close" size={22} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.renameInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
              value={renameInput}
              onChangeText={setRenameInput}
              placeholder="Routine Title (e.g., Heavy Chest & Delts)"
              placeholderTextColor="#8E8E93"
            />

            <TextInput
              style={[styles.renameInput, { color: isDark ? '#FFFFFF' : '#000000', marginTop: 10 }]}
              value={renameFocusInput}
              onChangeText={setRenameFocusInput}
              placeholder="Focus / Muscle Target"
              placeholderTextColor="#8E8E93"
            />

            <TouchableOpacity onPress={handleSaveRename} style={styles.saveRenameBtn}>
              <Text style={styles.saveRenameBtnText}>Save</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── MODAL: AI COACH S.A.R.A ── */}
      <ZenGymAiModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        userGymPlan={userGymPlan}
        onGenerateWorkoutPlan={(planName, exList) => {
          const newRt: GymRoutine = {
            id: `rt_${Date.now()}`,
            name: planName || 'AI Workout',
            focus: 'AI Optimized Split',
            subtitle: 'AI Optimized Split',
            exercises: exList.map(e => ({
              id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              name: e.name,
              targetSets: e.sets || 3,
              targetReps: e.reps || '8–12',
              muscle: resolveExerciseTargetMuscle(e.name).targetMuscle,
              restTimeSecs: 90,
            })),
            estimatedDurationMins: Math.round(exList.length * 3 * 2.5),
            updatedAt: Date.now(),
          };
          saveCustomRoutine(newRt);
          Alert.alert('AI Routine Created', `"${planName}" added to your custom routines!`);
        }}
      />

      {/* ── MODAL: SCHEDULE SETTINGS & ALARMS ── */}
      <GymScheduleSettingsModal
        visible={showScheduleSettings}
        onClose={() => setShowScheduleSettings(false)}
        userGymPlan={userGymPlan}
        onSaveWeekly={updateFullMasterPlan}
      />

      {/* ── MODAL: CURATED TEMPLATES ── */}
      <GymTemplateModal
        visible={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onApply={(customDays, templateId, templateName) => {
          updateFullMasterPlan(customDays);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  headerTitleCol: {
    flex: 1,
  },
  screenTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newRoutinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  newRoutinePillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 130,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#8E8E93',
    letterSpacing: 0.8,
  },
  createInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  createInlineText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#A599FF',
  },
  activeSplitCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  splitIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitTextCol: {
    flex: 1,
  },
  splitBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  splitPreTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#8E8E93',
    letterSpacing: 0.6,
  },
  splitActiveBadge: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  splitActiveBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9,
    color: '#30D158',
  },
  splitTitleText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
  },
  splitSubText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8E8E93',
    marginTop: 2,
  },
  emptyRoutinesSlimCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyRoutinesSlimText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
  },
  routineCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 12,
  },
  routineCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routineTitleCol: {
    flex: 1,
  },
  routineName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
  },
  routineSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  routineMuscles: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#A599FF',
    marginTop: 3,
  },
  routineRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAssignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  cardAssignText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#A599FF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sheetCard: {
    borderRadius: 18,
    padding: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
  },
  sheetSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  dayPickList: {
    gap: 2,
  },
  dayPickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(84, 84, 88, 0.15)',
  },
  dayPickName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
  },
  timePresetsList: {
    gap: 8,
  },
  timePresetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
  },
  timePresetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timePresetLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
  },
  timePresetValue: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8E8E93',
  },
  renameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 14,
  },
  saveRenameBtn: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  saveRenameBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
