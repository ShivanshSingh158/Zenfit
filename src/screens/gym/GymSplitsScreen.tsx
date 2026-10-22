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

import { useTheme } from '../../contexts/ThemeContext';
import { useWellnessData } from '../../contexts/domains/WellnessContext';
import { GYM_PLAN, WEEKDAY_TO_PLAN } from '../../data/gymPlan';
import { GymPlanDay, GymPlanExercise } from '../../types/gym.types';
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/haptics';
import { AddExerciseModal } from '../../components/Gym/AddExerciseModal';
import { ZenGymAiModal } from '../../components/Gym/ZenGymAiModal';
import { GymTemplateModal } from '../../components/Gym/GymTemplateModal';
import GymScheduleSettingsModal from '../../components/Gym/GymScheduleSettingsModal';
import { GymAiIcon } from '../../components/Gym/GymAiIcon';
import { useNavigation } from '@react-navigation/native';
import { FONT_FAMILY } from '../../theme/tokens';
import ExerciseLibraryScreen from './ExerciseLibraryScreen';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const COMMON_REPS = ['5 × 5', '6–8', '8–10', '8–12', '10–12', '12–15', '15–20'];
const COMMON_SETS = [2, 3, 4, 5, 6];

export default function GymSplitsScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { userGymPlan, applyMasterTemplate, updateMasterPlan } = useWellnessData();

  // Top-level Segment: 'routine' (Weekly Routine Planner) vs 'vault' (361 Exercise Database)
  const [activeSegment, setActiveSegment] = useState<'routine' | 'vault'>('routine');

  // Modals
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [splitSettingsVisible, setSplitSettingsVisible] = useState(false);
  const [showScheduleSettings, setShowScheduleSettings] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [addExerciseDayIndex, setAddExerciseDayIndex] = useState<number | null>(null);

  // Day Filter: 1..7 for Monday..Sunday, 0 for All Days view
  const currentDayOfWeek = new Date().getDay(); // 0 is Sunday
  const defaultDayIndex = currentDayOfWeek === 0 ? 7 : currentDayOfWeek;
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(defaultDayIndex);

  // Exercise Action Sheet Modal State
  const [actionExercise, setActionExercise] = useState<{
    dayIndex: number;
    exerciseIndex: number;
    exercise: GymPlanExercise;
  } | null>(null);

  // Edit Sets/Reps Modal State
  const [editingExercise, setEditingExercise] = useState<{
    dayIndex: number;
    exerciseIndex: number;
    exercise: GymPlanExercise;
  } | null>(null);
  const [targetSets, setTargetSets] = useState(3);
  const [targetReps, setTargetReps] = useState('8–12');

  // Rename Day Modal State
  const [renamingDay, setRenamingDay] = useState<{
    dayIndex: number;
    dayName: string;
    currentRoutineName: string;
    currentFocus: string;
  } | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [renameFocusInput, setRenameFocusInput] = useState('');

  const activeTemplate = userGymPlan?.templateId || 'ppl';
  const activePattern = userGymPlan?.schedulePattern || 'mon_sun';

  // Build resolved 7-day schedule
  const resolvedDays = useMemo(() => {
    const days: { dayIndex: number; dayName: string; planDay: GymPlanDay }[] = [];
    for (let i = 1; i <= 7; i++) {
      const custom = userGymPlan?.customDays?.[i];
      if (custom) {
        days.push({ dayIndex: i, dayName: DAY_NAMES[i - 1], planDay: custom });
      } else {
        const defaultDayId = WEEKDAY_TO_PLAN[i] || 1;
        const defaultDay = GYM_PLAN[defaultDayId] || {
          dayIndex: i,
          name: i === 7 ? 'Rest & Recovery' : `Workout Day ${i}`,
          focus: i === 7 ? 'Rest & Recovery' : 'Full Body',
          isRest: i === 7,
          exercises: [],
        };
        days.push({ dayIndex: i, dayName: DAY_NAMES[i - 1], planDay: defaultDay });
      }
    }
    return days;
  }, [userGymPlan]);

  // Template switch confirmation
  const handleSwitchTemplate = useCallback(
    (tpl: 'ppl' | 'arnold') => {
      if (tpl === activeTemplate) return;
      hapticLight();
      Alert.alert(
        'Switch Master Template',
        `Reset your 7-day schedule to ${tpl === 'ppl' ? 'Push / Pull / Legs' : 'Arnold Split'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Apply',
            onPress: async () => {
              hapticMedium();
              try {
                await applyMasterTemplate(tpl, activePattern);
                hapticSuccess();
                setSplitSettingsVisible(false);
              } catch (e) {
                Alert.alert('Error', 'Failed to update workout split');
              }
            },
          },
        ]
      );
    },
    [activeTemplate, activePattern, applyMasterTemplate]
  );

  // Pattern switch
  const handleSwitchPattern = useCallback(
    async (pat: 'mon_sun' | 'tue_mon' | 'mon_fri') => {
      if (pat === activePattern) return;
      hapticLight();
      try {
        await applyMasterTemplate(activeTemplate, pat);
        hapticSuccess();
      } catch (e) {
        Alert.alert('Error', 'Failed to update schedule pattern');
      }
    },
    [activeTemplate, activePattern, applyMasterTemplate]
  );

  // Toggle Rest Day for a specific day
  const handleToggleRest = useCallback(
    (dayIndex: number) => {
      const targetDay = resolvedDays.find(d => d.dayIndex === dayIndex);
      if (!targetDay) return;
      hapticLight();

      const currentlyRest = Boolean(targetDay.planDay.isRest);
      const updatedPlanDay: GymPlanDay = {
        ...targetDay.planDay,
        isRest: !currentlyRest,
        name: !currentlyRest ? 'Rest & Recovery' : targetDay.planDay.name === 'Rest & Recovery' ? `Workout Day ${dayIndex}` : targetDay.planDay.name,
        focus: !currentlyRest ? 'Rest & Recovery' : targetDay.planDay.focus || 'Strength & Hypertrophy',
      };

      updateMasterPlan(dayIndex, updatedPlanDay);
      hapticSuccess();
    },
    [resolvedDays, updateMasterPlan]
  );

  // Open Rename Modal
  const openRenameModal = useCallback((dayIndex: number) => {
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
  }, [resolvedDays]);

  // Save Renamed Day
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

  // Add Exercise
  const handleAddExercise = useCallback(
    (ex: any) => {
      if (addExerciseDayIndex === null) return;
      const targetDay = resolvedDays.find(d => d.dayIndex === addExerciseDayIndex);
      if (!targetDay) return;

      const newExercise: GymPlanExercise = {
        id: ex.id || `ex_${Date.now()}`,
        name: ex.name,
        targetSets: 3,
        targetReps: '8–12',
        muscle: ex.muscle || 'Full Body',
      };

      const updatedExercises = [...(targetDay.planDay.exercises || []), newExercise];
      const updatedPlanDay: GymPlanDay = {
        ...targetDay.planDay,
        exercises: updatedExercises,
        isRest: false,
      };

      updateMasterPlan(addExerciseDayIndex, updatedPlanDay);
      hapticSuccess();
      setAddExerciseDayIndex(null);
    },
    [addExerciseDayIndex, resolvedDays, updateMasterPlan]
  );

  // Delete Exercise
  const handleDeleteExercise = useCallback(
    (dayIdx: number, exIndex: number) => {
      const targetDay = resolvedDays.find(d => d.dayIndex === dayIdx);
      if (!targetDay) return;

      hapticLight();
      const updatedExercises = (targetDay.planDay.exercises || []).filter((_, i) => i !== exIndex);
      const updatedPlanDay: GymPlanDay = {
        ...targetDay.planDay,
        exercises: updatedExercises,
      };

      updateMasterPlan(dayIdx, updatedPlanDay);
      setActionExercise(null);
    },
    [resolvedDays, updateMasterPlan]
  );

  // Move Exercise (Up / Down)
  const handleMoveExercise = useCallback(
    (dayIdx: number, fromIdx: number, direction: 'up' | 'down') => {
      const targetDay = resolvedDays.find(d => d.dayIndex === dayIdx);
      if (!targetDay) return;
      const exercises = [...(targetDay.planDay.exercises || [])];
      const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
      if (toIdx < 0 || toIdx >= exercises.length) return;

      hapticLight();
      const temp = exercises[fromIdx];
      exercises[fromIdx] = exercises[toIdx];
      exercises[toIdx] = temp;

      const updatedPlanDay: GymPlanDay = {
        ...targetDay.planDay,
        exercises,
      };
      updateMasterPlan(dayIdx, updatedPlanDay);
      setActionExercise(null);
    },
    [resolvedDays, updateMasterPlan]
  );

  // Open Edit Sets/Reps Modal
  const openEditSetsReps = useCallback((dayIdx: number, exIdx: number, ex: GymPlanExercise) => {
    hapticLight();
    setActionExercise(null);
    setEditingExercise({ dayIndex: dayIdx, exerciseIndex: exIdx, exercise: ex });
    setTargetSets(Number(ex.targetSets) || 3);
    setTargetReps(ex.targetReps || '8–12');
  }, []);

  // Save Edit Sets/Reps
  const handleSaveSetsReps = useCallback(() => {
    if (!editingExercise) return;
    const { dayIndex, exerciseIndex } = editingExercise;
    const targetDay = resolvedDays.find(d => d.dayIndex === dayIndex);
    if (!targetDay) return;

    const exercises = [...(targetDay.planDay.exercises || [])];
    if (!exercises[exerciseIndex]) return;

    exercises[exerciseIndex] = {
      ...exercises[exerciseIndex],
      targetSets,
      targetReps,
    };

    const updatedPlanDay: GymPlanDay = {
      ...targetDay.planDay,
      exercises,
    };

    updateMasterPlan(dayIndex, updatedPlanDay);
    hapticSuccess();
    setEditingExercise(null);
  }, [editingExercise, targetSets, targetReps, resolvedDays, updateMasterPlan]);

  // Days to show: either a single focused day or all 7 days
  const displayDays = useMemo(() => {
    if (selectedDayIndex === 0) return resolvedDays;
    return resolvedDays.filter(d => d.dayIndex === selectedDayIndex);
  }, [resolvedDays, selectedDayIndex]);

  const activeTemplateLabel = activeTemplate === 'ppl' ? 'Push Pull Legs' : 'Arnold Split';
  const activePatternLabel = activePattern === 'mon_sun' ? 'Mon–Sat' : activePattern === 'mon_fri' ? 'Mon–Fri' : 'Tue–Sun';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000000' : colors.background }]} edges={['top']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── 1. Clean, Spacious Header with Segment Toggle ── */}
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: 6 }}>
            <Text style={[styles.screenTitle, { color: colors.textPrimary || '#ffffff' }]}>
              Plan & Programming
            </Text>
            <Text style={styles.subTitle}>
              {activeSegment === 'routine' ? `${activeTemplateLabel} • ${activePatternLabel}` : '361 Verified Biomechanical Movements'}
            </Text>
          </View>

          {activeSegment === 'routine' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  hapticLight();
                  setShowScheduleSettings(true);
                }}
                style={styles.settingsBtn}
              >
                <Ionicons name="time-outline" size={16} color="#8e8e93" />
                <Text style={styles.settingsBtnText}>Schedule</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  hapticLight();
                  setSplitSettingsVisible(true);
                }}
                style={styles.settingsBtn}
              >
                <Ionicons name="options-outline" size={16} color="#8e8e93" />
                <Text style={styles.settingsBtnText}>Split</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Segment Toggle: My Routine vs Exercise Vault ── */}
        <View style={{
          flexDirection: 'row',
          marginHorizontal: 16,
          marginBottom: 12,
          padding: 3,
          borderRadius: 12,
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        }}>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 9,
              alignItems: 'center',
              backgroundColor: activeSegment === 'routine' ? (isDark ? '#23222a' : '#ffffff') : 'transparent',
              shadowColor: '#000',
              shadowOpacity: activeSegment === 'routine' ? 0.2 : 0,
              shadowRadius: 4,
              elevation: activeSegment === 'routine' ? 2 : 0,
            }}
            onPress={() => {
              hapticLight();
              setActiveSegment('routine');
            }}
          >
            <Text style={{
              fontSize: 13,
              fontFamily: FONT_FAMILY.bold,
              color: activeSegment === 'routine' ? (colors.accentPrimary || '#a599ff') : colors.textMuted,
            }}>
              📋 My Routine
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 9,
              alignItems: 'center',
              backgroundColor: activeSegment === 'vault' ? (isDark ? '#23222a' : '#ffffff') : 'transparent',
              shadowColor: '#000',
              shadowOpacity: activeSegment === 'vault' ? 0.2 : 0,
              shadowRadius: 4,
              elevation: activeSegment === 'vault' ? 2 : 0,
            }}
            onPress={() => {
              hapticLight();
              setActiveSegment('vault');
            }}
          >
            <Text style={{
              fontSize: 13,
              fontFamily: FONT_FAMILY.bold,
              color: activeSegment === 'vault' ? (colors.accentPrimary || '#a599ff') : colors.textMuted,
            }}>
              📚 Exercise Vault
            </Text>
          </TouchableOpacity>
        </View>

        {activeSegment === 'vault' ? (
          <View style={{ minHeight: 600 }}>
            <ExerciseLibraryScreen isEmbedded />
          </View>
        ) : (
          <>

        {/* ── 2. Minimalist Weekday Selector (Mon to Sun + All Days) ── */}
        <View style={styles.weekdayBar}>
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              setSelectedDayIndex(0);
            }}
            style={[styles.dayTab, selectedDayIndex === 0 && styles.dayTabActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayTabText, selectedDayIndex === 0 && styles.dayTabTextActive]}>
              All
            </Text>
          </TouchableOpacity>

          {resolvedDays.map(d => {
            const isSelected = selectedDayIndex === d.dayIndex;
            const isRest = Boolean(d.planDay.isRest);

            return (
              <TouchableOpacity
                key={`weekday-${d.dayIndex}`}
                onPress={() => {
                  hapticLight();
                  setSelectedDayIndex(d.dayIndex);
                }}
                style={[styles.dayTab, isSelected && styles.dayTabActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayTabText, isSelected && styles.dayTabTextActive]}>
                  {DAY_SHORT[d.dayIndex - 1]}
                </Text>
                <View
                  style={[
                    styles.dayStatusDot,
                    isRest ? styles.dayStatusDotRest : styles.dayStatusDotActive,
                    isSelected && { opacity: 1 },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── 3. Spacious, Human-Crafted Day Cards ── */}
        <View style={styles.daysContainer}>
          {displayDays.map(({ dayIndex, dayName, planDay }) => {
            const isRest = Boolean(planDay.isRest);
            const exercises = planDay.exercises || [];
            const exCount = exercises.length;

            return (
              <View
                key={`day-card-${dayIndex}`}
                style={[styles.dayCard, { backgroundColor: isDark ? '#141418' : colors.surface }]}
              >
                {/* Day Header Row */}
                <View style={styles.dayCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dayNameLabel}>{dayName.toUpperCase()}</Text>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => openRenameModal(dayIndex)}
                      style={styles.routineTitleRow}
                    >
                      <Text style={[styles.routineName, { color: colors.textPrimary || '#ffffff' }]}>
                        {planDay.name}
                      </Text>
                      <Ionicons name="pencil-outline" size={13} color="#636366" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>

                    {planDay.focus ? (
                      <Text style={styles.routineFocusText} numberOfLines={1}>
                        {planDay.focus}
                      </Text>
                    ) : null}
                  </View>

                  {/* Subtle Rest Toggle (Calm text button, NOT loud neon pill) */}
                  <TouchableOpacity
                    onPress={() => handleToggleRest(dayIndex)}
                    style={[styles.restActionBtn, isRest && styles.restActionBtnActive]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isRest ? 'moon' : 'barbell-outline'}
                      size={13}
                      color={isRest ? '#a599ff' : '#8e8e93'}
                    />
                    <Text style={[styles.restActionText, isRest && styles.restActionTextActive]}>
                      {isRest ? 'Rest Day' : 'Workout'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Day Content */}
                {isRest ? (
                  <View style={styles.restStateCard}>
                    <Text style={styles.restStateTitle}>Scheduled Rest & Recovery</Text>
                    <Text style={styles.restStateSubtitle}>
                      Take time to stretch, hydrate, and recover CNS fatigue.
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleToggleRest(dayIndex)}
                      style={styles.unRestBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.unRestBtnText}>+ Switch to Workout Day</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.exerciseSection}>
                    {exCount === 0 ? (
                      <View style={styles.emptyExercisesCard}>
                        <Text style={styles.emptyExercisesText}>No exercises scheduled yet.</Text>
                      </View>
                    ) : (
                      exercises.map((ex, exIdx) => (
                        <TouchableOpacity
                          key={`${ex.id || ex.name}_${exIdx}`}
                          style={styles.exerciseItemRow}
                          activeOpacity={0.7}
                          onPress={() => openEditSetsReps(dayIndex, exIdx, ex)}
                        >
                          {/* Left: Number & Exercise Title */}
                          <View style={styles.exerciseIndexBox}>
                            <Text style={styles.exerciseIndexNum}>{exIdx + 1}</Text>
                          </View>

                          <View style={styles.exerciseInfoCol}>
                            <Text style={[styles.exerciseTitle, { color: colors.textPrimary || '#ffffff' }]} numberOfLines={1}>
                              {ex.name}
                            </Text>

                            <View style={styles.exerciseMetaLine}>
                              <Text style={styles.setsRepsHighlight}>
                                {ex.targetSets} sets × {ex.targetReps} reps
                              </Text>
                              {ex.muscle ? (
                                <>
                                  <Text style={styles.metaDivider}>•</Text>
                                  <Text style={styles.muscleLabel}>{ex.muscle}</Text>
                                </>
                              ) : null}
                            </View>
                          </View>

                          {/* Right: Clean options icon trigger */}
                          <TouchableOpacity
                            onPress={() => {
                              hapticLight();
                              setActionExercise({ dayIndex, exerciseIndex: exIdx, exercise: ex });
                            }}
                            style={styles.optionsIconBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons name="ellipsis-horizontal" size={17} color="#636366" />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))
                    )}

                    {/* Clean + Add Exercise Button */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        hapticMedium();
                        setAddExerciseDayIndex(dayIndex);
                      }}
                      style={styles.addExerciseCardBtn}
                    >
                      <Ionicons name="add" size={16} color="#a599ff" />
                      <Text style={styles.addExerciseCardText}>Add Exercise</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </>
    )}
      </ScrollView>

      {/* ── Add Exercise Modal ── */}
      {addExerciseDayIndex !== null && (
        <AddExerciseModal
          visible={addExerciseDayIndex !== null}
          onClose={() => setAddExerciseDayIndex(null)}
          onAdd={handleAddExercise}
        />
      )}

      {/* ── AI Split & Workout Coach Modal ── */}
      {aiModalVisible && (
        <ZenGymAiModal
          visible={aiModalVisible}
          onClose={() => setAiModalVisible(false)}
        />
      )}

      {/* ── Exercise Options Sheet ── */}
      <Modal
        visible={actionExercise !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActionExercise(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setActionExercise(null)}>
          <Pressable style={[styles.sheetCard, { backgroundColor: isDark ? '#1C1C1E' : '#ffffff' }]} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle} numberOfLines={1}>{actionExercise?.exercise.name}</Text>
                <Text style={styles.sheetSubtitle}>
                  {actionExercise ? DAY_NAMES[actionExercise.dayIndex - 1] : ''} • Movement Options
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActionExercise(null)}>
                <Ionicons name="close" size={20} color="#8e8e93" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                if (!actionExercise) return;
                openEditSetsReps(actionExercise.dayIndex, actionExercise.exerciseIndex, actionExercise.exercise);
              }}
              style={styles.sheetActionRow}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={18} color="#a599ff" />
              <Text style={styles.sheetActionText}>Edit Target Sets & Reps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!actionExercise) return;
                handleMoveExercise(actionExercise.dayIndex, actionExercise.exerciseIndex, 'up');
              }}
              style={styles.sheetActionRow}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-up-outline" size={18} color="#8e8e93" />
              <Text style={styles.sheetActionText}>Move Up in Routine</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!actionExercise) return;
                handleMoveExercise(actionExercise.dayIndex, actionExercise.exerciseIndex, 'down');
              }}
              style={styles.sheetActionRow}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-down-outline" size={18} color="#8e8e93" />
              <Text style={styles.sheetActionText}>Move Down in Routine</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!actionExercise) return;
                handleDeleteExercise(actionExercise.dayIndex, actionExercise.exerciseIndex);
              }}
              style={[styles.sheetActionRow, { borderBottomWidth: 0 }]}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color="#ff6961" />
              <Text style={[styles.sheetActionText, { color: '#ff6961' }]}>Remove from Routine</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Edit Sets & Reps Modal ── */}
      <Modal
        visible={editingExercise !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingExercise(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setEditingExercise(null)}>
          <Pressable style={[styles.sheetCard, { backgroundColor: isDark ? '#1C1C1E' : '#ffffff' }]} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Target Volume</Text>
                <Text style={styles.sheetSubtitle}>{editingExercise?.exercise.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditingExercise(null)}>
                <Ionicons name="close" size={20} color="#8e8e93" />
              </TouchableOpacity>
            </View>

            {/* Sets Picker */}
            <Text style={styles.pickerSectionLabel}>TARGET SETS</Text>
            <View style={styles.chipPickerRow}>
              {COMMON_SETS.map(sNum => (
                <TouchableOpacity
                  key={`sets-${sNum}`}
                  onPress={() => {
                    hapticLight();
                    setTargetSets(sNum);
                  }}
                  style={[styles.chipItem, targetSets === sNum && styles.chipItemActive]}
                >
                  <Text style={[styles.chipText, targetSets === sNum && styles.chipTextActive]}>
                    {sNum}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Reps Picker */}
            <Text style={styles.pickerSectionLabel}>TARGET REPS</Text>
            <View style={styles.chipPickerRowWrap}>
              {COMMON_REPS.map(rStr => (
                <TouchableOpacity
                  key={`reps-${rStr}`}
                  onPress={() => {
                    hapticLight();
                    setTargetReps(rStr);
                  }}
                  style={[styles.chipItemWrap, targetReps === rStr && styles.chipItemActive]}
                >
                  <Text style={[styles.chipText, targetReps === rStr && styles.chipTextActive]}>
                    {rStr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom input */}
            <View style={styles.customInputRow}>
              <Text style={styles.customLabel}>Custom:</Text>
              <TextInput
                style={[styles.customField, { color: colors.textPrimary || '#ffffff' }]}
                value={targetReps}
                onChangeText={setTargetReps}
                placeholder="e.g. 10–12 or Failure"
                placeholderTextColor="#636366"
              />
            </View>

            <TouchableOpacity onPress={handleSaveSetsReps} style={styles.primarySaveBtn} activeOpacity={0.8}>
              <Text style={styles.primarySaveBtnText}>Save Targets</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Rename Day Routine Modal ── */}
      <Modal
        visible={renamingDay !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRenamingDay(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRenamingDay(null)}>
          <Pressable style={[styles.sheetCard, { backgroundColor: isDark ? '#1C1C1E' : '#ffffff' }]} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Rename Day Routine</Text>
                <Text style={styles.sheetSubtitle}>{renamingDay?.dayName}</Text>
              </View>
              <TouchableOpacity onPress={() => setRenamingDay(null)}>
                <Ionicons name="close" size={20} color="#8e8e93" />
              </TouchableOpacity>
            </View>

            <Text style={styles.pickerSectionLabel}>ROUTINE TITLE</Text>
            <TextInput
              style={[styles.textInputRegular, { color: colors.textPrimary || '#ffffff' }]}
              value={renameInput}
              onChangeText={setRenameInput}
              placeholder="e.g. Pull A, Push Day, Heavy Legs"
              placeholderTextColor="#636366"
              autoFocus
            />

            <Text style={styles.pickerSectionLabel}>TARGET MUSCLE FOCUS</Text>
            <TextInput
              style={[styles.textInputRegular, { color: colors.textPrimary || '#ffffff' }]}
              value={renameFocusInput}
              onChangeText={setRenameFocusInput}
              placeholder="e.g. Back, Biceps, Rear Delts"
              placeholderTextColor="#636366"
            />

            <TouchableOpacity onPress={handleSaveRename} style={styles.primarySaveBtn} activeOpacity={0.8}>
              <Text style={styles.primarySaveBtnText}>Update Routine</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Split Settings & Master Template Modal ── */}
      <Modal
        visible={splitSettingsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSplitSettingsVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSplitSettingsVisible(false)}>
          <Pressable style={[styles.sheetCard, { backgroundColor: isDark ? '#1C1C1E' : '#ffffff' }]} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Split Configuration</Text>
                <Text style={styles.sheetSubtitle}>Choose master template and schedule pattern</Text>
              </View>
              <TouchableOpacity onPress={() => setSplitSettingsVisible(false)}>
                <Ionicons name="close" size={20} color="#8e8e93" />
              </TouchableOpacity>
            </View>

            {/* Template Selection */}
            <Text style={styles.pickerSectionLabel}>MASTER SPLIT TEMPLATE</Text>
            <View style={styles.templateOptionsList}>
              <TouchableOpacity
                onPress={() => handleSwitchTemplate('ppl')}
                style={[styles.templateOptionCard, activeTemplate === 'ppl' && styles.templateOptionCardActive]}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.templateOptionTitle, activeTemplate === 'ppl' && styles.templateOptionTitleActive]}>
                    Push / Pull / Legs (PPL)
                  </Text>
                  <Text style={styles.templateOptionDesc}>
                    6 Days • Push (Chest/Delts/Tri), Pull (Back/Bi), Legs. Hits muscles 2×/week.
                  </Text>
                </View>
                {activeTemplate === 'ppl' && (
                  <Ionicons name="checkmark-circle" size={20} color="#a599ff" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSwitchTemplate('arnold')}
                style={[styles.templateOptionCard, activeTemplate === 'arnold' && styles.templateOptionCardActive]}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.templateOptionTitle, activeTemplate === 'arnold' && styles.templateOptionTitleActive]}>
                    Arnold Split
                  </Text>
                  <Text style={styles.templateOptionDesc}>
                    6 Days • Chest & Back, Shoulders & Arms, Legs & Core.
                  </Text>
                </View>
                {activeTemplate === 'arnold' && (
                  <Ionicons name="checkmark-circle" size={20} color="#a599ff" />
                )}
              </TouchableOpacity>
            </View>

            {/* Schedule Pattern */}
            <Text style={styles.pickerSectionLabel}>SCHEDULE PATTERN</Text>
            <View style={styles.patternOptionsRow}>
              {(['mon_sun', 'mon_fri', 'tue_mon'] as const).map(pat => {
                const isSelected = activePattern === pat;
                const label = pat === 'mon_sun' ? 'Mon–Sat (Sun Off)' : pat === 'mon_fri' ? 'Mon–Fri (Weekend Off)' : 'Tue–Sun (Mon Off)';
                return (
                  <TouchableOpacity
                    key={`pat-opt-${pat}`}
                    onPress={() => handleSwitchPattern(pat)}
                    style={[styles.patternSelectChip, isSelected && styles.patternSelectChipActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.patternSelectText, isSelected && styles.patternSelectTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* AI Split Coach Trigger */}
            <TouchableOpacity
              onPress={() => {
                setSplitSettingsVisible(false);
                setTimeout(() => setAiModalVisible(true), 200);
              }}
              style={styles.aiCoachLaunchBtn}
              activeOpacity={0.8}
            >
              <GymAiIcon size={18} primaryColor="#a599ff" sparkleColor="#ec4899" />
              <Text style={styles.aiCoachLaunchText}>Generate Custom Split with AI Coach</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Schedule Settings Modal ── */}
      <GymScheduleSettingsModal
        visible={showScheduleSettings}
        onClose={() => setShowScheduleSettings(false)}
        userGymPlan={userGymPlan}
        onSaveWeekly={async (newDays) => {
          Object.entries(newDays).forEach(([dIdx, planDay]) => {
            updateMasterPlan(Number(dIdx), planDay);
          });
          setShowScheduleSettings(false);
          hapticSuccess();
        }}
      />

      {/* ── Template Switcher Modal ── */}
      <GymTemplateModal
        visible={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onApply={(templateId, schedulePattern) => {
          applyMasterTemplate(templateId, schedulePattern);
          setShowTemplateModal(false);
          hapticSuccess();
        }}
      />
    </SafeAreaView>
  );
}

// ─── Refined, Spacious, Subtle Styles ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 6,
    paddingTop: 12,
    paddingBottom: 115,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.4,
  },
  subTitle: {
    fontSize: 12.5,
    color: '#8e8e93',
    fontFamily: FONT_FAMILY.body,
    marginTop: 2,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingsBtnText: {
    fontSize: 12,
    color: '#8e8e93',
    fontFamily: FONT_FAMILY.medium,
  },

  // 7-Day Clean Tab Bar
  weekdayBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121216',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  dayTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 3,
  },
  dayTabActive: {
    backgroundColor: 'rgba(165, 153, 255, 0.16)',
  },
  dayTabText: {
    fontSize: 11.5,
    color: '#8e8e93',
    fontFamily: FONT_FAMILY.medium,
  },
  dayTabTextActive: {
    color: '#a599ff',
    fontWeight: '700',
  },
  dayStatusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  dayStatusDotActive: {
    backgroundColor: '#5eda9e',
  },
  dayStatusDotRest: {
    backgroundColor: '#48484a',
  },

  // Day Cards Container
  daysContainer: {
    gap: 14,
  },
  dayCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dayNameLabel: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: FONT_FAMILY.bold,
    color: '#a599ff',
    letterSpacing: 1,
    marginBottom: 2,
  },
  routineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  routineName: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.3,
  },
  routineFocusText: {
    fontSize: 12,
    color: '#8e8e93',
    fontFamily: FONT_FAMILY.body,
    marginTop: 3,
  },
  restActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  restActionBtnActive: {
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
  },
  restActionText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8e8e93',
  },
  restActionTextActive: {
    color: '#a599ff',
    fontWeight: '600',
  },

  // Rest state within card
  restStateCard: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restStateTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.medium,
    color: '#ffffff',
    marginBottom: 4,
  },
  restStateSubtitle: {
    fontSize: 12,
    color: '#8e8e93',
    fontFamily: FONT_FAMILY.body,
    textAlign: 'center',
    marginBottom: 12,
  },
  unRestBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  unRestBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#a599ff',
  },

  // Exercises Section
  exerciseSection: {
    gap: 6,
  },
  emptyExercisesCard: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyExercisesText: {
    fontSize: 12.5,
    color: '#8e8e93',
    fontStyle: 'italic',
  },
  exerciseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  exerciseIndexBox: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  exerciseIndexNum: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.bold,
    color: '#636366',
  },
  exerciseInfoCol: {
    flex: 1,
    paddingRight: 8,
  },
  exerciseTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.medium,
    marginBottom: 3,
  },
  exerciseMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setsRepsHighlight: {
    fontSize: 12,
    color: '#a599ff',
    fontFamily: FONT_FAMILY.medium,
  },
  metaDivider: {
    fontSize: 10,
    color: '#636366',
  },
  muscleLabel: {
    fontSize: 12,
    color: '#8e8e93',
    fontFamily: FONT_FAMILY.body,
  },
  optionsIconBtn: {
    padding: 6,
  },

  // Add Exercise Card Button
  addExerciseCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  addExerciseCardText: {
    fontSize: 12.5,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.medium,
    color: '#a599ff',
  },

  // Modals & Bottom Sheets
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 16,
  },
  sheetCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: FONT_FAMILY.bold,
    color: '#ffffff',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#8e8e93',
    fontFamily: FONT_FAMILY.body,
    marginTop: 2,
  },
  sheetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  sheetActionText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.medium,
    color: '#ffffff',
  },

  // Volume Picker
  pickerSectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.bold,
    color: '#8e8e93',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
  chipPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  chipItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  chipItemActive: {
    backgroundColor: 'rgba(165, 153, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#a599ff',
  },
  chipText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8e8e93',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  chipPickerRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 12,
  },
  chipItemWrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  customLabel: {
    fontSize: 12.5,
    color: '#8e8e93',
  },
  customField: {
    flex: 1,
    height: 40,
    fontSize: 13,
  },
  primarySaveBtn: {
    backgroundColor: '#a599ff',
    paddingVertical: 12,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primarySaveBtnText: {
    color: '#000000',
    fontSize: 13.5,
    fontWeight: '800',
    fontFamily: FONT_FAMILY.bold,
  },
  textInputRegular: {
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },

  // Split Settings Sheet Styles
  templateOptionsList: {
    gap: 8,
    marginBottom: 14,
  },
  templateOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  templateOptionCardActive: {
    backgroundColor: 'rgba(165, 153, 255, 0.1)',
    borderColor: 'rgba(165, 153, 255, 0.35)',
  },
  templateOptionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.bold,
    color: '#ffffff',
    marginBottom: 2,
  },
  templateOptionTitleActive: {
    color: '#a599ff',
  },
  templateOptionDesc: {
    fontSize: 11.5,
    color: '#8e8e93',
    lineHeight: 16,
  },
  patternOptionsRow: {
    gap: 6,
    marginBottom: 18,
  },
  patternSelectChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  patternSelectChipActive: {
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
    borderColor: 'rgba(165, 153, 255, 0.3)',
  },
  patternSelectText: {
    fontSize: 12,
    color: '#8e8e93',
    fontFamily: FONT_FAMILY.medium,
  },
  patternSelectTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  aiCoachLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 11,
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(165, 153, 255, 0.25)',
  },
  aiCoachLaunchText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.bold,
    color: '#a599ff',
  },
});
