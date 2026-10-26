import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GymPlanExercise, GymRoutine } from '../../types/gym.types';
import { EXERCISE_DATABASE } from '../../data/exerciseDatabase';
import {
  normalizeExerciseKey,
  getExerciseSwapAlternatives,
  resolveMuscleColor,
  resolveExerciseTargetMuscle,
  canonicalizeMuscle,
} from '../../utils/gymUtils';
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/haptics';
import { FONT_FAMILY, IOS_DARK, SPACE } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';

const COMMON_REPS = ['6–8', '8–10', '8–12', '10–12', '12–15', '15–20'];
const COMMON_REST = [45, 60, 90, 120, 180];
const MUSCLE_FILTERS = ['All', 'Chest', 'Back', 'Shoulders', 'Triceps', 'Biceps', 'Quads', 'Hamstrings', 'Calves', 'Abs'];

const DAY_OPTIONS = [
  { label: 'Mon', index: 1 },
  { label: 'Tue', index: 2 },
  { label: 'Wed', index: 3 },
  { label: 'Thu', index: 4 },
  { label: 'Fri', index: 5 },
  { label: 'Sat', index: 6 },
  { label: 'Sun', index: 7 },
  { label: 'Library Only', index: null },
];

/**
 * Intelligent Permutation & Combination Generator
 * Analyzes selected muscles, volume proportion, and biomechanical pairs
 * to automatically generate professional workout names and focus subtitles.
 */
export function generateSmartRoutineMeta(exercises: GymPlanExercise[]): {
  suggestedName: string;
  suggestedFocus: string;
  nameOptions: string[];
} {
  if (!exercises || exercises.length === 0) {
    return {
      suggestedName: 'Custom Routine',
      suggestedFocus: 'Targeted strength & hypertrophy',
      nameOptions: ['Custom Routine', 'Full Body Power', 'Hypertrophy Day'],
    };
  }

  const muscleScores: Record<string, number> = {};
  for (const ex of exercises) {
    const rawMuscle = ex.muscle || '';
    const m = rawMuscle.toLowerCase();
    const sets = Number(ex.targetSets) || 3;

    if (m.includes('chest')) muscleScores['Chest'] = (muscleScores['Chest'] || 0) + sets;
    else if (m.includes('back') || m.includes('lat')) muscleScores['Back'] = (muscleScores['Back'] || 0) + sets;
    else if (m.includes('shoulder') || m.includes('delt')) muscleScores['Shoulders'] = (muscleScores['Shoulders'] || 0) + sets;
    else if (m.includes('bicep')) muscleScores['Biceps'] = (muscleScores['Biceps'] || 0) + sets;
    else if (m.includes('tricep')) muscleScores['Triceps'] = (muscleScores['Triceps'] || 0) + sets;
    else if (m.includes('quad')) muscleScores['Quads'] = (muscleScores['Quads'] || 0) + sets;
    else if (m.includes('hamstring') || m.includes('hams') || m.includes('glute')) muscleScores['Hamstrings'] = (muscleScores['Hamstrings'] || 0) + sets;
    else if (m.includes('calf') || m.includes('calves')) muscleScores['Calves'] = (muscleScores['Calves'] || 0) + sets;
    else if (m.includes('ab') || m.includes('core')) muscleScores['Abs'] = (muscleScores['Abs'] || 0) + sets;
    else muscleScores['Other'] = (muscleScores['Other'] || 0) + sets;
  }

  const sortedMuscles = Object.entries(muscleScores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([m]) => m);

  const has = (name: string) => sortedMuscles.includes(name);

  // 1. Chest & Back
  if (has('Chest') && has('Back') && !has('Quads') && !has('Hamstrings')) {
    if (has('Biceps') || has('Triceps')) {
      return {
        suggestedName: 'Chest & Back',
        suggestedFocus: 'Antagonist push/pull supersets with arms finisher',
        nameOptions: ['Chest & Back', 'Torso & Arms'],
      };
    }
    return {
      suggestedName: 'Chest & Back',
      suggestedFocus: 'Antagonist supersets focusing on chest thickness and lat width',
      nameOptions: ['Chest & Back', 'Upper Push/Pull'],
    };
  }

  // 2. Push: Chest + Shoulders + Triceps
  if (has('Chest') && (has('Shoulders') || has('Triceps')) && !has('Back') && !has('Quads')) {
    const hasDelt = has('Shoulders');
    const hasTri = has('Triceps');
    return {
      suggestedName: hasDelt && hasTri ? 'Push Day' : hasDelt ? 'Chest & Delts' : 'Chest & Triceps',
      suggestedFocus: 'Horizontal and overhead pressing with triceps lockout overload',
      nameOptions: ['Push (Chest & Delts)', 'Chest & Triceps'],
    };
  }

  // 3. Pull: Back + Biceps (+ Delts/Traps)
  if (has('Back') && (has('Biceps') || has('Shoulders')) && !has('Chest') && !has('Quads')) {
    return {
      suggestedName: 'Pull Day',
      suggestedFocus: 'Vertical & horizontal pulling with elbow flexion overload',
      nameOptions: ['Pull (Back & Biceps)', 'Back & Lats Power'],
    };
  }

  // 4. Legs: Quads + Hamstrings (+ Calves)
  if (has('Quads') || has('Hamstrings')) {
    if (has('Quads') && has('Hamstrings')) {
      return {
        suggestedName: 'Leg Day',
        suggestedFocus: 'Compound knee extension and hip hinge mechanics',
        nameOptions: ['Leg Day (Quads & Hams)', 'Lower Body Power'],
      };
    }
    if (has('Quads')) {
      return {
        suggestedName: 'Quad Hypertrophy',
        suggestedFocus: 'Knee extension overload and VMO quad development',
        nameOptions: ['Quad Hypertrophy', 'Quad Power'],
      };
    }
    return {
      suggestedName: 'Hamstrings & Glutes',
      suggestedFocus: 'Hip hinge mechanics and hamstring stretch stimulus',
      nameOptions: ['Hamstrings & Glutes', 'Posterior Chain'],
    };
  }

  // 5. Arms & Shoulders (The Gunsmith)
  if ((has('Biceps') || has('Triceps')) && has('Shoulders') && !has('Chest') && !has('Back')) {
    return {
      suggestedName: 'Shoulders & Arms',
      suggestedFocus: '3D deltoid capping and bicep/tricep antagonistic pump',
      nameOptions: ['Shoulders & Arms', 'Delts & Arms Pump'],
    };
  }

  // 6. Chest + Biceps
  if (has('Chest') && has('Biceps') && !has('Back')) {
    return {
      suggestedName: 'Chest & Biceps',
      suggestedFocus: 'Pressing volume with elbow flexion supersets',
      nameOptions: ['Chest & Biceps', 'Chest & Arm Pump'],
    };
  }

  // 7. Back + Triceps
  if (has('Back') && has('Triceps') && !has('Chest')) {
    return {
      suggestedName: 'Back & Triceps',
      suggestedFocus: 'Lat width compound movements with tricep isolation',
      nameOptions: ['Back & Triceps', 'Back & Arm Power'],
    };
  }

  // 8. General permutation of top muscles
  if (sortedMuscles.length >= 2) {
    const m1 = sortedMuscles[0];
    const m2 = sortedMuscles[1];
    return {
      suggestedName: `${m1} & ${m2}`,
      suggestedFocus: `Targeting ${m1} and ${m2} with progressive overload`,
      nameOptions: [`${m1} & ${m2}`, `${m1} & ${m2} Power`],
    };
  }

  if (sortedMuscles.length === 1) {
    const m = sortedMuscles[0];
    return {
      suggestedName: `${m} Focus`,
      suggestedFocus: `High volume targeted stimulus for ${m}`,
      nameOptions: [`${m} Hypertrophy`, `${m} Power`],
    };
  }

  return {
    suggestedName: 'Custom Routine',
    suggestedFocus: 'Targeted strength & hypertrophy',
    nameOptions: ['Custom Routine', 'Full Body Power'],
  };
}

export interface RoutineEditorModalProps {
  visible: boolean;
  routineToEdit?: GymRoutine | null;
  initialDayIndex?: number | null;
  onClose: () => void;
  onSave: (routine: GymRoutine, assignedDayIndex?: number | null) => void;
}

export const RoutineEditorModal: React.FC<RoutineEditorModalProps> = ({
  visible,
  routineToEdit,
  initialDayIndex,
  onClose,
  onSave,
}) => {
  const { colors, isDark } = useTheme();

  // Internal view switcher: 'builder' | 'vault_picker'
  const [currentView, setCurrentView] = useState<'builder' | 'vault_picker'>('vault_picker');
  const [isNewRoutine, setIsNewRoutine] = useState(true);

  // Routine Form Fields
  const [routineName, setRoutineName] = useState('');
  const [routineSubtitle, setRoutineSubtitle] = useState('');
  const [exercises, setExercises] = useState<GymPlanExercise[]>([]);
  const [nameOptions, setNameOptions] = useState<string[]>([]);
  const [assignedDay, setAssignedDay] = useState<number | null>(initialDayIndex ?? null);

  // Vault Picker Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState('All');
  const [selectedVaultExerciseIds, setSelectedVaultExerciseIds] = useState<Set<string>>(new Set());

  // Quick Swap Modal State
  const [swapTargetIndex, setSwapTargetIndex] = useState<number | null>(null);

  // Initialize form on open
  useEffect(() => {
    if (visible) {
      if (routineToEdit && routineToEdit.exercises && routineToEdit.exercises.length > 0) {
        setRoutineName(routineToEdit.name || '');
        setRoutineSubtitle(routineToEdit.subtitle || routineToEdit.focus || '');
        setExercises([...routineToEdit.exercises]);
        const smart = generateSmartRoutineMeta(routineToEdit.exercises);
        setNameOptions(smart.nameOptions);
        setCurrentView('builder');
        setIsNewRoutine(false);
      } else {
        setRoutineName('');
        setRoutineSubtitle('');
        setExercises([]);
        setNameOptions([]);
        // Flow: Land DIRECTLY on exercise selector so user doesn't face empty screens!
        setCurrentView('vault_picker');
        setIsNewRoutine(true);
      }
      setAssignedDay(initialDayIndex ?? null);
      setSelectedVaultExerciseIds(new Set());
      setSearchQuery('');
      setSelectedMuscleFilter('All');
    }
  }, [visible, routineToEdit, initialDayIndex]);

  // Session Volume Summary Calculations
  const sessionSummary = useMemo(() => {
    let totalSets = 0;
    const muscleVolume: Record<string, number> = {};

    for (const ex of exercises) {
      const sets = Number(ex.targetSets) || 3;
      totalSets += sets;
      const m = ex.muscle || 'Other';
      muscleVolume[m] = (muscleVolume[m] || 0) + sets;
    }

    const estimatedMins = Math.round(totalSets * 2.5);
    return { totalSets, estimatedMins, muscleVolume };
  }, [exercises]);

  // Handle Save Routine
  const handleSave = () => {
    const finalName = routineName.trim() || 'Custom Routine';
    if (exercises.length === 0) {
      Alert.alert('Add Exercises', 'Please add at least 1 exercise to this workout routine.');
      return;
    }

    hapticSuccess();
    const finalRoutine: GymRoutine = {
      id: routineToEdit?.id || `rt_${Date.now()}`,
      folderId: routineToEdit?.folderId,
      name: finalName,
      subtitle: routineSubtitle.trim() || undefined,
      focus: routineSubtitle.trim() || undefined,
      exercises,
      estimatedDurationMins: sessionSummary.estimatedMins,
      updatedAt: Date.now(),
    };

    onSave(finalRoutine, assignedDay);
    onClose();
  };

  // Reorder exercises
  const handleMoveExercise = (fromIdx: number, direction: 'up' | 'down') => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= exercises.length) return;
    hapticLight();
    const updated = [...exercises];
    const temp = updated[fromIdx];
    updated[fromIdx] = updated[toIdx];
    updated[toIdx] = temp;
    setExercises(updated);
  };

  // Delete exercise
  const handleDeleteExercise = (idx: number) => {
    hapticLight();
    const updated = exercises.filter((_, i) => i !== idx);
    setExercises(updated);
    if (updated.length > 0 && isNewRoutine) {
      const smart = generateSmartRoutineMeta(updated);
      setRoutineName(smart.suggestedName);
      setRoutineSubtitle(smart.suggestedFocus);
      setNameOptions(smart.nameOptions);
    }
  };

  // Update target sets inline
  const handleAdjustSets = (idx: number, delta: number) => {
    hapticMedium();
    setExercises(prev =>
      prev.map((ex, i) => {
        if (i !== idx) return ex;
        const current = Number(ex.targetSets) || 3;
        const nextSets = Math.min(10, Math.max(1, current + delta));
        return { ...ex, targetSets: nextSets };
      })
    );
  };

  // Update target reps inline
  const handleSelectReps = (idx: number, reps: string) => {
    hapticLight();
    setExercises(prev =>
      prev.map((ex, i) => (i === idx ? { ...ex, targetReps: reps } : ex))
    );
  };

  // Update rest time inline
  const handleSelectRest = (idx: number, restSecs: number) => {
    hapticLight();
    setExercises(prev =>
      prev.map((ex, i) => (i === idx ? { ...ex, restTimeSecs: restSecs } : ex))
    );
  };

  // ── Exercise Vault Filtering ─────────────────────────────────────────────────
  const filteredVaultExercises = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filter = selectedMuscleFilter.toLowerCase();

    return EXERCISE_DATABASE.filter(ex => {
      if (selectedMuscleFilter !== 'All') {
        const rawMuscle = (ex.muscle || '').toLowerCase();
        const canonical = canonicalizeMuscle(ex.muscle).toLowerCase();
        const targetCanonical = resolveExerciseTargetMuscle(ex.name, ex.muscle).canonicalGroup.toLowerCase();

        let matchesMuscle = (
          canonical === filter ||
          targetCanonical === filter ||
          rawMuscle.includes(filter)
        );

        // Comprehensive group coverage for sub-muscles (e.g. Delts -> Shoulders, Lats -> Back)
        if (!matchesMuscle) {
          if (filter === 'shoulders') {
            matchesMuscle = rawMuscle.includes('delt') || rawMuscle.includes('shoulder') || rawMuscle.includes('overhead');
          } else if (filter === 'back') {
            matchesMuscle = rawMuscle.includes('lat') || rawMuscle.includes('back') || rawMuscle.includes('trap') || rawMuscle.includes('rhomboid') || rawMuscle.includes('row');
          } else if (filter === 'chest') {
            matchesMuscle = rawMuscle.includes('chest') || rawMuscle.includes('pec');
          } else if (filter === 'biceps') {
            matchesMuscle = rawMuscle.includes('bicep') || rawMuscle.includes('brachio') || rawMuscle.includes('curl');
          } else if (filter === 'triceps') {
            matchesMuscle = rawMuscle.includes('tricep') || rawMuscle.includes('pushdown') || rawMuscle.includes('dip');
          } else if (filter === 'quads') {
            matchesMuscle = rawMuscle.includes('quad') || rawMuscle.includes('squat') || rawMuscle.includes('leg ext');
          } else if (filter === 'hamstrings') {
            matchesMuscle = rawMuscle.includes('ham') || rawMuscle.includes('hinge') || rawMuscle.includes('ghr') || rawMuscle.includes('rdl') || rawMuscle.includes('deadlift');
          } else if (filter === 'calves') {
            matchesMuscle = rawMuscle.includes('calv') || rawMuscle.includes('soleus') || rawMuscle.includes('gastro');
          } else if (filter === 'abs') {
            matchesMuscle = rawMuscle.includes('ab') || rawMuscle.includes('core') || rawMuscle.includes('oblique') || rawMuscle.includes('crunch') || rawMuscle.includes('plank');
          }
        }

        if (!matchesMuscle) return false;
      }

      if (query) {
        const nameMatch = ex.name.toLowerCase().includes(query);
        const aliasMatch = ex.aliases?.some(a => a.toLowerCase().includes(query));
        const muscleMatch = ex.muscle.toLowerCase().includes(query);
        if (!nameMatch && !aliasMatch && !muscleMatch) return false;
      }
      return true;
    });
  }, [searchQuery, selectedMuscleFilter]);

  // Toggle selection in Vault Picker
  const handleToggleVaultExercise = (id: string) => {
    hapticLight();
    setSelectedVaultExerciseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Add selected exercises from Vault to Routine
  const handleConfirmVaultExercises = () => {
    if (selectedVaultExerciseIds.size === 0) return;
    hapticSuccess();

    const newAdditions: GymPlanExercise[] = [];
    for (const exId of selectedVaultExerciseIds) {
      const dbEx = EXERCISE_DATABASE.find(e => e.id === exId);
      if (dbEx) {
        newAdditions.push({
          id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: dbEx.name,
          targetSets: 3,
          targetReps: '8–12',
          muscle: dbEx.muscle || 'Full Body',
          restTimeSecs: 90,
        });
      }
    }

    const merged = [...exercises, ...newAdditions];
    setExercises(merged);

    // Auto-generate smart permutation name & focus
    const smart = generateSmartRoutineMeta(merged);
    setNameOptions(smart.nameOptions);
    if (!routineName || isNewRoutine) {
      setRoutineName(smart.suggestedName);
      setRoutineSubtitle(smart.suggestedFocus);
    }

    setSelectedVaultExerciseIds(new Set());
    setCurrentView('builder');
  };

  // Swap exercise alternatives
  const swapAlternatives = useMemo(() => {
    if (swapTargetIndex === null || !exercises[swapTargetIndex]) return [];
    const currentEx = exercises[swapTargetIndex];
    return getExerciseSwapAlternatives(currentEx.name, currentEx.muscle);
  }, [swapTargetIndex, exercises]);

  const handleApplySwap = (newExName: string, newMuscle?: string) => {
    if (swapTargetIndex === null) return;
    hapticSuccess();
    setExercises(prev =>
      prev.map((ex, i) =>
        i === swapTargetIndex
          ? {
              ...ex,
              name: newExName,
              muscle: newMuscle || ex.muscle,
            }
          : ex
      )
    );
    setSwapTargetIndex(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.modalContainer, { backgroundColor: isDark ? IOS_DARK.bgCanvas : colors.background }]}
        edges={['top']}
      >
        {currentView === 'builder' ? (
          // ── BUILDER VIEW ───────────────────────────────────────────────────
          <View style={{ flex: 1 }}>
            {/* Top Navigation Bar */}
            <View style={styles.navBar}>
              <TouchableOpacity onPress={onClose} style={styles.navCancelBtn}>
                <Text style={styles.navCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.navTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                {routineToEdit ? 'Customize Routine' : 'New Routine'}
              </Text>
              <TouchableOpacity onPress={handleSave} style={styles.navSaveBtn}>
                <Text style={styles.navSaveText}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.builderContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* 1. Schedule to Day Selector */}
              <View
                style={[
                  styles.dayScheduleCard,
                  { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardSectionLabel}>SCHEDULE TO DAY</Text>
                  {assignedDay != null ? (
                    <Text style={styles.dayAssignedTag}>
                      Day {assignedDay} Selected
                    </Text>
                  ) : (
                    <Text style={styles.dayLibraryTag}>Library Only</Text>
                  )}
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dayPillsScroll}
                >
                  {DAY_OPTIONS.map(opt => {
                    const isSelected = assignedDay === opt.index;
                    return (
                      <TouchableOpacity
                        key={`day-opt-${opt.label}`}
                        activeOpacity={0.7}
                        onPress={() => {
                          hapticLight();
                          setAssignedDay(opt.index);
                        }}
                        style={[
                          styles.dayPillBtn,
                          isSelected && styles.dayPillBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayPillBtnText,
                            isSelected && styles.dayPillBtnTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 2. System-Suggested Name & Focus Card */}
              <View
                style={[
                  styles.inputCard,
                  { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardSectionLabel}>ROUTINE NAME & FOCUS</Text>
                  <View style={styles.autoGeneratedBadge}>
                    <Ionicons name="sparkles" size={10} color="#A599FF" />
                    <Text style={styles.autoGeneratedBadgeText}>Auto-Suggested</Text>
                  </View>
                </View>

                <TextInput
                  style={[styles.titleInput, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}
                  placeholder="Routine Name (e.g. Chest & Back Power)"
                  placeholderTextColor="#636366"
                  value={routineName}
                  onChangeText={setRoutineName}
                  returnKeyType="next"
                />

                <TextInput
                  style={[styles.subtitleInput, { color: isDark ? '#A599FF' : colors.textPrimary }]}
                  placeholder="Focus / Subtitle"
                  placeholderTextColor="#636366"
                  value={routineSubtitle}
                  onChangeText={setRoutineSubtitle}
                  returnKeyType="done"
                />

                {/* Quick Permutation Name Chips (Strictly 2 Suggestions on 1 Line) */}
                {nameOptions.length > 0 && (
                  <View style={styles.suggestionChipsWrap}>
                    {nameOptions.slice(0, 2).map(optName => (
                      <TouchableOpacity
                        key={`name-opt-${optName}`}
                        activeOpacity={0.7}
                        onPress={() => {
                          hapticLight();
                          setRoutineName(optName);
                        }}
                        style={[
                          styles.nameOptionChip,
                          routineName === optName && styles.nameOptionChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.nameOptionChipText,
                            routineName === optName && styles.nameOptionChipTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {optName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* 3. Session Volume Breakdown */}
              {exercises.length > 0 && (
                <View
                  style={[
                    styles.sessionVolumeBanner,
                    { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface },
                  ]}
                >
                  <View style={styles.sessionVolumeTop}>
                    <Text style={styles.sessionVolumeTitle}>SESSION VOLUME</Text>
                    <Text style={styles.sessionVolumeMeta}>
                      {sessionSummary.totalSets} Sets · ~{sessionSummary.estimatedMins} Mins
                    </Text>
                  </View>
                  <View style={styles.sessionMusclePillsRow}>
                    {Object.entries(sessionSummary.muscleVolume).map(([muscle, sets]) => (
                      <View key={`vol-${muscle}`} style={styles.sessionMusclePill}>
                        <Text style={styles.sessionMusclePillText}>
                          {muscle}: {sets}s
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* 4. Action Button: + Add More Exercises */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  hapticLight();
                  setCurrentView('vault_picker');
                }}
                style={styles.addMoreExercisesBtn}
              >
                <Ionicons name="add-circle" size={17} color="#FFFFFF" />
                <Text style={styles.addMoreExercisesBtnText}>Add More Exercises</Text>
              </TouchableOpacity>

              {/* 5. Exercises List with Precision Interactive Steppers */}
              {exercises.map((ex, exIdx) => {
                const currentSets = Number(ex.targetSets) || 3;
                const currentReps = ex.targetReps || '8–12';
                const currentRest = ex.restTimeSecs || 90;
                const { targetMuscle } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
                const muscleColor = resolveMuscleColor(targetMuscle);

                return (
                  <View
                    key={`builder-ex-${ex.id || exIdx}`}
                    style={[
                      styles.exerciseBuilderCard,
                      { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface },
                    ]}
                  >
                    {/* Header Row: Index Badge, Name, Reorder, Swap & Delete */}
                    <View style={styles.exHeaderRow}>
                      <View style={styles.exIndexBadge}>
                        <Text style={styles.exIndexText}>#{exIdx + 1}</Text>
                      </View>

                      <View style={styles.exTitleCol}>
                        <Text
                          style={[styles.exName, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {ex.name}
                        </Text>
                        <View style={styles.exMetaRow}>
                          <View style={[styles.muscleDot, { backgroundColor: muscleColor }]} />
                          <Text style={styles.exMuscle}>{targetMuscle}</Text>
                        </View>
                      </View>

                      {/* Top Right Action Icons */}
                      <View style={styles.exActionsRow}>
                        <TouchableOpacity
                          onPress={() => handleMoveExercise(exIdx, 'up')}
                          disabled={exIdx === 0}
                          style={[styles.iconActionBtn, exIdx === 0 && { opacity: 0.25 }]}
                        >
                          <Ionicons name="chevron-up" size={17} color="#8E8E93" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleMoveExercise(exIdx, 'down')}
                          disabled={exIdx === exercises.length - 1}
                          style={[styles.iconActionBtn, exIdx === exercises.length - 1 && { opacity: 0.25 }]}
                        >
                          <Ionicons name="chevron-down" size={17} color="#8E8E93" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            hapticLight();
                            setSwapTargetIndex(exIdx);
                          }}
                          style={styles.swapActionBtn}
                        >
                          <Ionicons name="swap-horizontal" size={15} color="#A599FF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDeleteExercise(exIdx)}
                          style={styles.deleteActionBtn}
                        >
                          <Ionicons name="trash-outline" size={15} color="#FF453A" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Sets Stepper */}
                    <View style={styles.controlRow}>
                      <Text style={styles.controlLabel}>SETS</Text>
                      <View style={styles.setsStepperContainer}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleAdjustSets(exIdx, -1)}
                          style={styles.stepperMinusBtn}
                        >
                          <Text style={styles.stepperBtnSymbol}>−</Text>
                        </TouchableOpacity>
                        <View style={styles.setsValueBadge}>
                          <Text style={styles.setsValueNumber}>{currentSets}</Text>
                          <Text style={styles.setsValueSub}>SETS</Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleAdjustSets(exIdx, 1)}
                          style={styles.stepperPlusBtn}
                        >
                          <Text style={styles.stepperBtnSymbol}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Reps Selector Strip */}
                    <View style={styles.controlRow}>
                      <Text style={styles.controlLabel}>REPS</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.pillsScroll}
                      >
                        {COMMON_REPS.map(repOption => {
                          const isSelected = currentReps === repOption;
                          return (
                            <TouchableOpacity
                              key={`rep-${repOption}`}
                              activeOpacity={0.7}
                              onPress={() => handleSelectReps(exIdx, repOption)}
                              style={[
                                styles.pillItem,
                                isSelected && styles.pillItemSelected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.pillItemText,
                                  isSelected && styles.pillItemTextSelected,
                                ]}
                              >
                                {repOption}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>

                    {/* Rest Timer Selector Strip */}
                    <View style={styles.controlRow}>
                      <Text style={styles.controlLabel}>REST</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.pillsScroll}
                      >
                        {COMMON_REST.map(restOption => {
                          const isSelected = currentRest === restOption;
                          return (
                            <TouchableOpacity
                              key={`rest-${restOption}`}
                              activeOpacity={0.7}
                              onPress={() => handleSelectRest(exIdx, restOption)}
                              style={[
                                styles.pillItem,
                                isSelected && styles.pillItemRestSelected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.pillItemText,
                                  isSelected && styles.pillItemTextSelected,
                                ]}
                              >
                                {restOption}s
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          // ── VAULT MULTI-SELECT PICKER VIEW (Instant First Screen) ───────────
          <View style={{ flex: 1 }}>
            {/* Vault Picker Nav */}
            <View style={styles.navBar}>
              {exercises.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setCurrentView('builder')}
                  style={styles.navCancelBtn}
                >
                  <Ionicons name="chevron-back" size={18} color="#A599FF" />
                  <Text style={styles.navCancelText}>Builder</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={onClose} style={styles.navCancelBtn}>
                  <Text style={styles.navCancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
              <Text style={[styles.navTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Select Exercises
              </Text>
              <View style={{ width: 60 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={16} color="#8E8E93" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
                placeholder="Search 361 exercises..."
                placeholderTextColor="#8E8E93"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
            </View>

            {/* Muscle Filter Strip */}
            <View style={styles.filterStripContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterStrip}
              >
                {MUSCLE_FILTERS.map(m => {
                  const isSelected = selectedMuscleFilter === m;
                  return (
                    <TouchableOpacity
                      key={`m-filter-${m}`}
                      onPress={() => {
                        hapticLight();
                        setSelectedMuscleFilter(m);
                      }}
                      style={[
                        styles.filterChip,
                        isSelected && styles.filterChipSelected,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isSelected && styles.filterChipTextSelected,
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Exercises List with Multi-Select Checkboxes */}
            <FlatList
              data={filteredVaultExercises}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 110 }}
              renderItem={({ item }) => {
                const isSelected = selectedVaultExerciseIds.has(item.id);
                const muscleColor = resolveMuscleColor(item.muscle);

                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleToggleVaultExercise(item.id)}
                    style={[
                      styles.vaultExerciseRow,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(108, 92, 231, 0.12)' : 'rgba(108, 92, 231, 0.08)')
                          : (isDark ? IOS_DARK.bgGroupedCard : colors.surface),
                        borderColor: isSelected
                          ? '#6C5CE7'
                          : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'),
                      },
                    ]}
                  >
                    {/* Checkbox */}
                    <View
                      style={[
                        styles.checkboxCircle,
                        isSelected && styles.checkboxCircleSelected,
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                    </View>

                    {/* Exercise Details */}
                    <View style={styles.vaultExDetailsCol}>
                      <Text
                        style={[styles.vaultExName, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <View style={styles.vaultExMetaRow}>
                        <View style={[styles.muscleDot, { backgroundColor: muscleColor }]} />
                        <Text style={styles.vaultExSub}>{item.muscle}</Text>
                      </View>
                    </View>

                    {item.tier && (
                      <View
                        style={[
                          styles.vaultTierBadge,
                          item.tier === 'S Tier'
                            ? styles.sTierBadge
                            : item.tier === 'A+ Tier'
                            ? styles.aPlusTierBadge
                            : styles.aTierBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.vaultTierText,
                            item.tier === 'S Tier'
                              ? styles.sTierText
                              : item.tier === 'A+ Tier'
                              ? styles.aPlusTierText
                              : styles.aTierText,
                          ]}
                        >
                          {item.tier}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            {/* Sticky Bottom Multi-Select Confirm Bar */}
            <View style={[styles.stickyBottomBar, { backgroundColor: isDark ? '#141418' : '#FFFFFF' }]}>
              <TouchableOpacity
                activeOpacity={selectedVaultExerciseIds.size > 0 ? 0.85 : 1}
                disabled={selectedVaultExerciseIds.size === 0}
                onPress={handleConfirmVaultExercises}
                style={[
                  styles.confirmAddBtnFull,
                  selectedVaultExerciseIds.size > 0 ? styles.confirmAddBtnActive : styles.confirmAddBtnDisabled,
                ]}
              >
                {selectedVaultExerciseIds.size > 0 ? (
                  <>
                    <View style={styles.confirmBadgeBubble}>
                      <Text style={styles.confirmBadgeBubbleText}>
                        {selectedVaultExerciseIds.size}
                      </Text>
                    </View>
                    <Text style={styles.confirmAddBtnText}>
                      Add {selectedVaultExerciseIds.size === 1 ? 'Movement' : 'Movements'} to Routine
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  </>
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={18} color="#8E8E93" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmAddBtnDisabledText}>
                      Select Exercises to Add
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── QUICK SWAP ALTERNATIVES MODAL ─────────────────────────────────── */}
        <Modal
          visible={swapTargetIndex !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSwapTargetIndex(null)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setSwapTargetIndex(null)}
          >
            <Pressable
              style={[
                styles.swapSheetContainer,
                { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
              ]}
              onPress={e => e.stopPropagation()}
            >
              <Text style={[styles.swapSheetTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Swap Alternative Movement
              </Text>
              <Text style={styles.swapSheetSub}>
                Science-backed biomechanical alternatives
              </Text>

              <ScrollView style={{ maxHeight: 300 }}>
                {swapAlternatives.map((alt, i) => (
                  <TouchableOpacity
                    key={`alt-${i}`}
                    style={styles.swapAltRow}
                    onPress={() => handleApplySwap(alt.name, alt.muscle)}
                  >
                    <View style={styles.swapAltCol}>
                      <Text style={[styles.swapAltName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        {alt.name}
                      </Text>
                      <Text style={styles.swapAltMuscle}>{alt.muscle}</Text>
                    </View>
                    <View style={styles.swapPickBadge}>
                      <Text style={styles.swapPickBadgeText}>Swap</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  navBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(84, 84, 88, 0.2)',
  },
  navCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navCancelText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 15,
    color: '#A599FF',
  },
  navTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
  },
  navSaveBtn: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  navSaveText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  builderContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  dayScheduleCard: {
    borderRadius: 14,
    padding: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardSectionLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#8E8E93',
    letterSpacing: 0.8,
  },
  dayAssignedTag: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    color: '#30D158',
  },
  dayLibraryTag: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10.5,
    color: '#8E8E93',
  },
  dayPillsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  dayPillBtn: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  dayPillBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  dayPillBtnText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8E8E93',
  },
  dayPillBtnTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  inputCard: {
    borderRadius: 14,
    padding: 14,
  },
  autoGeneratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  autoGeneratedBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    color: '#A599FF',
  },
  titleInput: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 17,
    paddingVertical: 4,
  },
  subtitleInput: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12.5,
    paddingVertical: 2,
    marginTop: 2,
  },
  suggestionChipsWrap: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  nameOptionChip: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameOptionChipActive: {
    backgroundColor: 'rgba(165, 153, 255, 0.15)',
    borderColor: '#A599FF',
  },
  nameOptionChipText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11.5,
    color: '#8E8E93',
    textAlign: 'center',
  },
  nameOptionChipTextActive: {
    color: '#A599FF',
    fontFamily: FONT_FAMILY.bold,
  },
  sessionVolumeBanner: {
    borderRadius: 12,
    padding: 10,
  },
  sessionVolumeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sessionVolumeTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#8E8E93',
    letterSpacing: 0.6,
  },
  sessionVolumeMeta: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#A599FF',
  },
  sessionMusclePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  sessionMusclePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  sessionMusclePillText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10.5,
    color: '#E0E0E6',
  },
  addMoreExercisesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6C5CE7',
    paddingVertical: 11,
    borderRadius: 12,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  addMoreExercisesBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  exerciseBuilderCard: {
    borderRadius: 14,
    padding: 12,
  },
  exHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  exIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exIndexText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#A599FF',
  },
  exTitleCol: {
    flex: 1,
  },
  exName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 18,
  },
  exMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  muscleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  exMuscle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
  },
  exActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconActionBtn: {
    padding: 4,
  },
  swapActionBtn: {
    padding: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(165, 153, 255, 0.1)',
  },
  deleteActionBtn: {
    padding: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    marginLeft: 3,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  controlLabel: {
    width: 44,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  setsStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperMinusBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperPlusBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnSymbol: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  setsValueBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  setsValueNumber: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  setsValueSub: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    color: '#8E8E93',
  },
  pillsScroll: {
    flexDirection: 'row',
    gap: 5,
  },
  pillItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  pillItemSelected: {
    backgroundColor: '#6C5CE7',
  },
  pillItemRestSelected: {
    backgroundColor: '#A599FF',
  },
  pillItemText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11.5,
    color: '#8E8E93',
  },
  pillItemTextSelected: {
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
  },
  filterStripContainer: {
    height: 42,
    marginBottom: 8,
  },
  filterStrip: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  filterChip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  filterChipSelected: {
    backgroundColor: '#FFFFFF',
  },
  filterChipText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12.5,
    color: '#8E8E93',
  },
  filterChipTextSelected: {
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  vaultExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#48484A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleSelected: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  vaultExDetailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  vaultExName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14.5,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  vaultExMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  vaultExSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
  },
  vaultTierBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'center',
  },
  sTierBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
  },
  sTierText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#FFD700',
    letterSpacing: 0.2,
  },
  aTierBadge: {
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
  },
  aTierText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#A599FF',
    letterSpacing: 0.2,
  },
  aPlusTierBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
  },
  aPlusTierText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#00E5FF',
    letterSpacing: 0.2,
  },
  vaultTierText: {},
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  confirmAddBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  confirmAddBtnActive: {
    backgroundColor: '#6C5CE7',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmAddBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  confirmBadgeBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBadgeBubbleText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  confirmAddBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  confirmAddBtnDisabledText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 14,
    color: '#8E8E93',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  swapSheetContainer: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    paddingBottom: 32,
  },
  swapSheetTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
  },
  swapSheetSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 12,
    marginTop: 2,
  },
  swapAltRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(84, 84, 88, 0.15)',
  },
  swapAltCol: {
    flex: 1,
  },
  swapAltName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
  },
  swapAltMuscle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
  swapPickBadge: {
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  swapPickBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#A599FF',
  },
});
