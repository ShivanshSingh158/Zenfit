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
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GymPlanExercise, GymRoutine } from '../../types/gym.types';
import { EXERCISE_DATABASE } from '../../data/exerciseDatabase';
import { normalizeExerciseKey, getExerciseSwapAlternatives, MUSCLE_COLORS } from '../../utils/gymUtils';
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/haptics';
import { FONT_FAMILY, IOS_DARK, SPACE } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';

const COMMON_SETS = [1, 2, 3, 4, 5, 6, 7, 8];
const COMMON_REPS = ['6–8', '8–10', '8–12', '10–12', '12–15', '15–20', '5 × 5'];
const COMMON_REST = [60, 90, 120, 180];

const MUSCLE_FILTERS = ['All', 'Chest', 'Back', 'Shoulders', 'Triceps', 'Biceps', 'Quads', 'Hamstrings', 'Calves', 'Abs'];

export interface RoutineEditorModalProps {
  visible: boolean;
  routineToEdit?: GymRoutine | null;
  onClose: () => void;
  onSave: (routine: GymRoutine) => void;
  onOpenAiAutoFill?: () => void;
}

export const RoutineEditorModal: React.FC<RoutineEditorModalProps> = ({
  visible,
  routineToEdit,
  onClose,
  onSave,
  onOpenAiAutoFill,
}) => {
  const { colors, isDark } = useTheme();

  // Internal view switcher: 'builder' | 'vault_picker'
  const [currentView, setCurrentView] = useState<'builder' | 'vault_picker'>('builder');

  // Routine Form Fields
  const [routineName, setRoutineName] = useState('');
  const [routineSubtitle, setRoutineSubtitle] = useState('');
  const [exercises, setExercises] = useState<GymPlanExercise[]>([]);

  // Vault Picker Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState('All');
  const [selectedVaultExerciseIds, setSelectedVaultExerciseIds] = useState<Set<string>>(new Set());

  // Quick Swap Modal State
  const [swapTargetIndex, setSwapTargetIndex] = useState<number | null>(null);

  // Initialize or Reset form on open
  useEffect(() => {
    if (visible) {
      if (routineToEdit) {
        setRoutineName(routineToEdit.name || '');
        setRoutineSubtitle(routineToEdit.subtitle || routineToEdit.focus || '');
        setExercises([...(routineToEdit.exercises || [])]);
      } else {
        setRoutineName('');
        setRoutineSubtitle('');
        setExercises([]);
      }
      setCurrentView('builder');
      setSelectedVaultExerciseIds(new Set());
      setSearchQuery('');
    }
  }, [visible, routineToEdit]);

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
    const trimmedName = routineName.trim();
    if (!trimmedName) {
      Alert.alert('Routine Name Required', 'Please provide a name for this workout routine.');
      return;
    }

    if (exercises.length === 0) {
      Alert.alert('Add Exercises', 'Please add at least 1 exercise to this workout routine.');
      return;
    }

    hapticSuccess();
    const finalRoutine: GymRoutine = {
      id: routineToEdit?.id || `rt_${Date.now()}`,
      folderId: routineToEdit?.folderId,
      name: trimmedName,
      subtitle: routineSubtitle.trim() || undefined,
      focus: routineSubtitle.trim() || undefined,
      exercises,
      estimatedDurationMins: sessionSummary.estimatedMins,
      updatedAt: Date.now(),
    };

    onSave(finalRoutine);
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
    setExercises(prev => prev.filter((_, i) => i !== idx));
  };

  // Update target sets inline
  const handleAdjustSets = (idx: number, delta: number) => {
    hapticLight();
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
    return EXERCISE_DATABASE.filter(ex => {
      // Muscle filter
      if (selectedMuscleFilter !== 'All') {
        const m = (ex.muscle || '').toLowerCase();
        if (!m.includes(selectedMuscleFilter.toLowerCase())) return false;
      }

      // Search query
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

    setExercises(prev => [...prev, ...newAdditions]);
    setSelectedVaultExerciseIds(new Set());
    setCurrentView('builder');
  };

  // Swap exercise alternatives
  const swapAlternatives = useMemo(() => {
    if (swapTargetIndex === null || !exercises[swapTargetIndex]) return [];
    const currentEx = exercises[swapTargetIndex];
    const alts = getExerciseSwapAlternatives(currentEx.name, currentEx.muscle);
    return alts;
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
                {routineToEdit ? 'Edit Routine' : 'New Routine'}
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
              {/* Routine Name & Subtitle Inputs */}
              <View
                style={[
                  styles.inputCard,
                  { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface },
                ]}
              >
                <TextInput
                  style={[styles.titleInput, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}
                  placeholder="Routine Name (e.g., Heavy Chest & Delts)"
                  placeholderTextColor="#636366"
                  value={routineName}
                  onChangeText={setRoutineName}
                  returnKeyType="next"
                />
                <View style={styles.inputDivider} />
                <TextInput
                  style={[styles.subtitleInput, { color: isDark ? '#EBEBF5' : colors.textPrimary }]}
                  placeholder="Focus / Subtitle (e.g., Upper Chest & Side Delt Focus)"
                  placeholderTextColor="#636366"
                  value={routineSubtitle}
                  onChangeText={setRoutineSubtitle}
                  returnKeyType="done"
                />
              </View>

              {/* Action Buttons: Add Exercises + Auto-Fill with AI */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    hapticLight();
                    setCurrentView('vault_picker');
                  }}
                  style={styles.addExerciseBtn}
                >
                  <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.addExerciseBtnText}>Add Exercises</Text>
                </TouchableOpacity>

                {onOpenAiAutoFill && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      hapticLight();
                      onOpenAiAutoFill();
                    }}
                    style={styles.aiAutoFillBtn}
                  >
                    <Ionicons name="sparkles" size={16} color="#EC4899" />
                    <Text style={styles.aiAutoFillBtnText}>✨ AI Auto-Fill</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Session Volume Heatmap Summary Pill */}
              {exercises.length > 0 && (
                <View style={styles.sessionVolumeBanner}>
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

              {/* Exercises List with 1-Tap Pill Steppers */}
              {exercises.length === 0 ? (
                <View style={styles.emptyExercisesCard}>
                  <Ionicons name="barbell-outline" size={40} color="#8E8E93" style={{ marginBottom: 10 }} />
                  <Text style={styles.emptyTitle}>No Exercises Added</Text>
                  <Text style={styles.emptySubtitle}>
                    Tap "+ Add Exercises" or "✨ AI Auto-Fill" to build this workout.
                  </Text>
                </View>
              ) : (
                exercises.map((ex, exIdx) => {
                  const currentSets = Number(ex.targetSets) || 3;
                  const currentReps = ex.targetReps || '8–12';
                  const currentRest = ex.restTimeSecs || 90;

                  return (
                    <View
                      key={`builder-ex-${ex.id || exIdx}`}
                      style={[
                        styles.exerciseBuilderCard,
                        { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface },
                      ]}
                    >
                      {/* Exercise Header */}
                      <View style={styles.exHeaderRow}>
                        <View style={styles.exIndexBadge}>
                          <Text style={styles.exIndexText}>{exIdx + 1}</Text>
                        </View>

                        <View style={styles.exTitleCol}>
                          <Text
                            style={[styles.exName, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {ex.name}
                          </Text>
                          <Text style={styles.exMuscle}>{ex.muscle || 'Full Body'}</Text>
                        </View>

                        {/* Top Right Actions: Reorder, Swap & Delete */}
                        <View style={styles.exActionsRow}>
                          <TouchableOpacity
                            onPress={() => handleMoveExercise(exIdx, 'up')}
                            disabled={exIdx === 0}
                            style={[styles.iconActionBtn, exIdx === 0 && { opacity: 0.3 }]}
                          >
                            <Ionicons name="chevron-up" size={18} color="#8E8E93" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleMoveExercise(exIdx, 'down')}
                            disabled={exIdx === exercises.length - 1}
                            style={[styles.iconActionBtn, exIdx === exercises.length - 1 && { opacity: 0.3 }]}
                          >
                            <Ionicons name="chevron-down" size={18} color="#8E8E93" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => {
                              hapticLight();
                              setSwapTargetIndex(exIdx);
                            }}
                            style={styles.swapActionBtn}
                          >
                            <Ionicons name="swap-horizontal" size={16} color="#A599FF" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleDeleteExercise(exIdx)}
                            style={styles.deleteActionBtn}
                          >
                            <Ionicons name="trash-outline" size={16} color="#FF453A" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* 1-Tap Sets Stepper */}
                      <View style={styles.stepperRow}>
                        <Text style={styles.stepperLabel}>SETS</Text>
                        <View style={styles.setsStepperContainer}>
                          <TouchableOpacity
                            onPress={() => handleAdjustSets(exIdx, -1)}
                            style={styles.stepperMinusBtn}
                          >
                            <Text style={styles.stepperBtnSymbol}>−</Text>
                          </TouchableOpacity>
                          <View style={styles.setsValueBadge}>
                            <Text style={styles.setsValueText}>{currentSets} Sets</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleAdjustSets(exIdx, 1)}
                            style={styles.stepperPlusBtn}
                          >
                            <Text style={styles.stepperBtnSymbol}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* 1-Tap Reps Pill Strip */}
                      <View style={styles.stepperRow}>
                        <Text style={styles.stepperLabel}>REPS</Text>
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

                      {/* 1-Tap Rest Timer Pill Strip */}
                      <View style={styles.stepperRow}>
                        <Text style={styles.stepperLabel}>REST</Text>
                        <View style={styles.pillsScroll}>
                          {COMMON_REST.map(restOption => {
                            const isSelected = currentRest === restOption;
                            return (
                              <TouchableOpacity
                                key={`rest-${restOption}`}
                                onPress={() => handleSelectRest(exIdx, restOption)}
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
                                  {restOption}s
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        ) : (
          // ── VAULT MULTI-SELECT PICKER VIEW ─────────────────────────────────
          <View style={{ flex: 1 }}>
            {/* Vault Picker Nav */}
            <View style={styles.navBar}>
              <TouchableOpacity
                onPress={() => setCurrentView('builder')}
                style={styles.navCancelBtn}
              >
                <Ionicons name="chevron-back" size={20} color="#A599FF" />
                <Text style={styles.navCancelText}>Builder</Text>
              </TouchableOpacity>
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

            {/* Muscle Filter Strip (Single Clean Row) */}
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

            {/* Exercises List with Multi-Select Checkboxes */}
            <FlatList
              data={filteredVaultExercises}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 110 }}
              renderItem={({ item }) => {
                const isSelected = selectedVaultExerciseIds.has(item.id);
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleToggleVaultExercise(item.id)}
                    style={[
                      styles.vaultExerciseRow,
                      { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface },
                    ]}
                  >
                    {/* Checkbox */}
                    <View
                      style={[
                        styles.checkboxCircle,
                        isSelected && styles.checkboxCircleSelected,
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={13} color="#000000" />}
                    </View>

                    <View style={styles.vaultExDetailsCol}>
                      <Text
                        style={[styles.vaultExName, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text style={styles.vaultExSub}>{item.muscle}</Text>
                    </View>

                    {item.tier && (
                      <View style={styles.vaultTierBadge}>
                        <Text style={styles.vaultTierText}>{item.tier}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            {/* Sticky Bottom Multi-Select Confirm Bar */}
            <View style={[styles.stickyBottomBar, { backgroundColor: isDark ? '#141418' : '#FFFFFF' }]}>
              <View style={styles.selectedCountWrap}>
                <Text style={styles.selectedCountText}>
                  {selectedVaultExerciseIds.size} Selected
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={selectedVaultExerciseIds.size === 0}
                onPress={handleConfirmVaultExercises}
                style={[
                  styles.confirmAddBtn,
                  selectedVaultExerciseIds.size === 0 && styles.confirmAddBtnDisabled,
                ]}
              >
                <Ionicons name="add" size={18} color="#000000" style={{ marginRight: 2 }} />
                <Text style={styles.confirmAddBtnText}>
                  Add to Routine ({selectedVaultExerciseIds.size})
                </Text>
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
                Swap Alternative Movements
              </Text>
              <Text style={styles.swapSheetSub}>
                S-Tier & science-backed biomechanic swaps
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
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  navSaveText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  builderContent: {
    padding: 16,
    paddingBottom: 40,
  },
  inputCard: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  titleInput: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    paddingVertical: 6,
  },
  inputDivider: {
    height: 1,
    backgroundColor: 'rgba(84, 84, 88, 0.2)',
    marginVertical: 4,
  },
  subtitleInput: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    paddingVertical: 6,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  addExerciseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6C5CE7',
    paddingVertical: 12,
    borderRadius: 12,
  },
  addExerciseBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  aiAutoFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },
  aiAutoFillBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#EC4899',
  },
  sessionVolumeBanner: {
    backgroundColor: 'rgba(165, 153, 255, 0.08)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(165, 153, 255, 0.18)',
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
    gap: 6,
  },
  sessionMusclePill: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sessionMusclePillText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#E5E5EA',
  },
  emptyExercisesCard: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: '#636366',
    textAlign: 'center',
  },
  exerciseBuilderCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  exHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  exIndexBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  exIndexText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#8E8E93',
  },
  exTitleCol: {
    flex: 1,
  },
  exName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
  },
  exMuscle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
  exActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconActionBtn: {
    padding: 4,
  },
  swapActionBtn: {
    padding: 5,
    backgroundColor: 'rgba(165, 153, 255, 0.15)',
    borderRadius: 6,
  },
  deleteActionBtn: {
    padding: 5,
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    borderRadius: 6,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  stepperLabel: {
    width: 44,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#8E8E93',
    letterSpacing: 0.6,
  },
  setsStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  stepperMinusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  stepperPlusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  stepperBtnSymbol: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  setsValueBadge: {
    paddingHorizontal: 10,
  },
  setsValueText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  pillsScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  pillItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pillItemSelected: {
    backgroundColor: '#6C5CE7',
  },
  pillItemText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
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
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 14,
  },
  filterStrip: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  filterChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterChipSelected: {
    backgroundColor: '#A599FF',
    borderColor: '#A599FF',
  },
  filterChipText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8E8E93',
  },
  filterChipTextSelected: {
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  vaultExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 12,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#636366',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxCircleSelected: {
    backgroundColor: '#A599FF',
    borderColor: '#A599FF',
  },
  vaultExDetailsCol: {
    flex: 1,
  },
  vaultExName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
  },
  vaultExSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  vaultTierBadge: {
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(165, 153, 255, 0.25)',
  },
  vaultTierText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    color: '#A599FF',
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  selectedCountWrap: {},
  selectedCountText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#8E8E93',
  },
  confirmAddBtn: {
    backgroundColor: '#A599FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 14,
    shadowColor: '#A599FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmAddBtnDisabled: {
    opacity: 0.35,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmAddBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13.5,
    color: '#000000',
    letterSpacing: 0.2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  swapSheetContainer: {
    borderRadius: 18,
    padding: 16,
  },
  swapSheetTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    marginBottom: 2,
  },
  swapSheetSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 12,
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
    backgroundColor: 'rgba(165, 153, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  swapPickBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#A599FF',
  },
});
