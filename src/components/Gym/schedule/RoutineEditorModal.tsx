import React, { useState, useMemo, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  Activity,
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react-native';
import BottomSheet from '../../ui/BottomSheet';
import { TactileButton } from '../../ui/TactileButton';
import { NumericText } from '../../ui/NumericText';
import { AddExerciseModal } from '../exercise/AddExerciseModal';
import { AddCardioModal } from '../cardio/AddCardioModal';

import { DARK_TOKENS, FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { GymExerciseLog, GymPlanCardio, GymPlanExercise, GymRoutine } from '../../../types/gym.types';
import { resolveMuscleColor } from '../../../utils/gymUtils';
import { hapticLight, hapticMedium, hapticSuccess, hapticSelection } from '../../../utils/haptics';

export interface RoutineEditorModalProps {
  visible: boolean;
  routineToEdit?: GymRoutine | null;
  initialDayIndex?: number | null;
  onClose: () => void;
  onSave: (routine: GymRoutine, assignedDayIndex?: number | null) => void | Promise<void>;
}

const DAY_CHIPS: Array<{ label: string; index: number | null }> = [
  { label: 'Mo', index: 1 },
  { label: 'Tu', index: 2 },
  { label: 'We', index: 3 },
  { label: 'Th', index: 4 },
  { label: 'Fr', index: 5 },
  { label: 'Sa', index: 6 },
  { label: 'Su', index: 7 },
  { label: 'None', index: null },
];

const REP_LADDER = ['4-6', '6-8', '8-10', '8-12', '10-12', '12-15', '15-20'];
const REST_PRESETS = [60, 90, 120, 180];
const CARDIO_MIN_PRESETS = [15, 20, 30, 45];

function normalizeRepString(val?: string): string {
  return (val || '8-10').trim().replace(/[–—]/g, '-');
}

/**
 * Returns exactly 3 standard rep options (one less, current/default, one more) + Custom
 */
function getTargetRepOptions(currentRepStr?: string): {
  options: string[];
  activeValue: string;
  isCustom: boolean;
} {
  const normalized = normalizeRepString(currentRepStr);
  const idx = REP_LADDER.indexOf(normalized);

  if (idx !== -1) {
    const oneLess = idx > 0 ? REP_LADDER[idx - 1] : REP_LADDER[0];
    const defaultVal = REP_LADDER[idx];
    const oneMore =
      idx < REP_LADDER.length - 1 ? REP_LADDER[idx + 1] : REP_LADDER[REP_LADDER.length - 1];

    const standard3 = Array.from(new Set([oneLess, defaultVal, oneMore]));
    if (standard3.length < 3) {
      if (idx === 0 && REP_LADDER.length > 2) standard3.push(REP_LADDER[2]);
      else if (idx === REP_LADDER.length - 1 && REP_LADDER.length > 2)
        standard3.unshift(REP_LADDER[REP_LADDER.length - 3]);
    }

    return {
      options: [...standard3, 'Custom'],
      activeValue: defaultVal,
      isCustom: false,
    };
  }

  // Current is already custom
  return {
    options: ['6-8', '8-12', '10-12', 'Custom'],
    activeValue: normalized,
    isCustom: true,
  };
}

export const RoutineEditorModal: React.FC<RoutineEditorModalProps> = memo(function RoutineEditorModal({
  visible,
  routineToEdit,
  initialDayIndex,
  onClose,
  onSave,
}) {
  const { tokens, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);

  // ─── Routine Form State ────────────────────────────────────────────────────
  const [routineName, setRoutineName] = useState('');
  const [routineFocus, setRoutineFocus] = useState('');
  const [exercises, setExercises] = useState<GymPlanExercise[]>([]);
  const [cardioList, setCardioList] = useState<GymPlanCardio[]>([]);
  const [assignedDay, setAssignedDay] = useState<number | null>(initialDayIndex ?? null);

  // ─── Single-Sheet Subview State (Editor / Multi-Add / Single-Swap / Cardio) ─
  const [sheetView, setSheetView] = useState<'editor' | 'add' | 'swap' | 'add_cardio'>('editor');
  const [swapTargetIdx, setSwapTargetIdx] = useState<number | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);

  // ─── Inline Custom Reps State ──────────────────────────────────────────────
  const [customRepTargetExId, setCustomRepTargetExId] = useState<string | null>(null);
  const [customRepInput, setCustomRepInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  // Initialize on open
  useEffect(() => {
    if (visible) {
      if (routineToEdit) {
        setRoutineName(routineToEdit.name || '');
        setRoutineFocus(routineToEdit.focus || routineToEdit.subtitle || '');
        const list = Array.isArray(routineToEdit.exercises) ? routineToEdit.exercises : [];
        setExercises(
          list.map((ex, idx) =>
            ex.id
              ? { ...ex }
              : { ...ex, id: `ex_init_${idx}_${Math.random().toString(36).slice(2, 6)}` }
          )
        );
        const cList = Array.isArray(routineToEdit.cardio) ? routineToEdit.cardio : [];
        setCardioList(
          cList.map((c, idx) =>
            c.id
              ? { ...c }
              : { ...c, id: `cardio_init_${idx}_${Math.random().toString(36).slice(2, 6)}` }
          )
        );
      } else {
        setRoutineName('');
        setRoutineFocus('');
        setExercises([]);
        setCardioList([]);
      }
      setAssignedDay(initialDayIndex ?? null);
      setSheetView('editor');
      setSwapTargetIdx(null);
      setEditorError(null);
      setCustomRepTargetExId(null);
    }
  }, [visible, routineToEdit, initialDayIndex]);

  // ─── Volume & Time HUD ─────────────────────────────────────────────────────
  const sessionSummary = useMemo(() => {
    let totalSets = 0;
    const muscleMap: Record<string, number> = {};

    for (const ex of exercises) {
      const sets = Number(ex.targetSets) || 3;
      totalSets += sets;
      const m = ex.muscle?.split('/')[0]?.trim() || 'Other';
      muscleMap[m] = (muscleMap[m] || 0) + sets;
    }

    const cardioMins = cardioList.reduce((acc, c) => acc + (Number(c.durationMinutes) || 0), 0);
    const estimatedMins = Math.round(totalSets * 2.5) + cardioMins;
    const topMuscles = Object.keys(muscleMap).slice(0, 3).join(' · ') || (cardioList.length > 0 ? 'Cardio & Conditioning' : '');

    return { totalSets, cardioMins, estimatedMins, topMuscles };
  }, [exercises, cardioList]);

  // ─── Exercise Handlers (100% Inline) ───────────────────────────────────────
  const handleSetChange = useCallback((index: number, delta: number) => {
    hapticLight();
    setExercises((prev) => {
      const updated = [...prev];
      const curSets = Number(updated[index].targetSets) || 3;
      const nextSets = Math.max(1, Math.min(10, curSets + delta));
      updated[index] = { ...updated[index], targetSets: nextSets };
      return updated;
    });
  }, []);

  const handleRepChange = useCallback((index: number, repOption: string) => {
    hapticLight();
    if (repOption === 'Custom') {
      const targetEx = exercises[index];
      if (!targetEx?.id) return;
      const targetKey = targetEx.id;
      if (customRepTargetExId === targetKey) {
        setCustomRepTargetExId(null);
        return;
      }
      const cur = targetEx.targetReps || '8-10';
      setCustomRepInput(cur);
      setCustomRepTargetExId(targetKey);
      return;
    }
    setCustomRepTargetExId(null);
    setExercises((prev) => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      updated[index] = { ...updated[index], targetReps: repOption };
      return updated;
    });
  }, [exercises, customRepTargetExId]);

  const handleSaveCustomRep = useCallback(() => {
    if (!customRepTargetExId) return;
    hapticSuccess();
    const val = customRepInput.trim() || '8-10';
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === customRepTargetExId
          ? { ...ex, targetReps: val }
          : ex
      )
    );
    setCustomRepTargetExId(null);
  }, [customRepTargetExId, customRepInput]);

  const handleRestChange = useCallback((index: number, restSeconds: number) => {
    hapticLight();
    setExercises((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], restTimeSecs: restSeconds };
      return updated;
    });
  }, []);

  const handleDeleteExercise = useCallback((index: number) => {
    hapticMedium();
    const removedId = exercises[index]?.id;
    if (removedId && removedId === customRepTargetExId) {
      setCustomRepTargetExId(null);
    }
    setExercises((prev) => prev.filter((_, idx) => idx !== index));
  }, [exercises, customRepTargetExId]);

  const handleMoveExercise = useCallback((fromIdx: number, direction: 'up' | 'down') => {
    hapticSelection();
    setExercises((prev) => {
      const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
      if (toIdx < 0 || toIdx >= prev.length) return prev;
      const updated = [...prev];
      const temp = updated[fromIdx];
      updated[fromIdx] = updated[toIdx];
      updated[toIdx] = temp;
      return updated;
    });
  }, []);

  // ─── Batch Add from Unified 525+ Exercise Catalogue ────────────────────────
  const handleMultiExercisesAdded = useCallback((addedLogs: GymExerciseLog[]) => {
    if (!addedLogs || addedLogs.length === 0) return;
    hapticSuccess();
    const newItems: GymPlanExercise[] = addedLogs.map((ex, idx) => ({
      id: `ex_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      name: ex.name,
      muscle: ex.muscle,
      targetSets: ex.targetSets || 3,
      targetReps: (ex.targetReps || '8-10').replace('–', '-'),
      videoId: ex.videoId || '',
      restTimeSecs: ex.restTimeSecs || 90,
    }));
    setExercises((prev) => [...prev, ...newItems]);
    setEditorError(null);
    setSheetView('editor');
  }, []);

  const handleSwapExercisePicked = useCallback(
    (alt: GymExerciseLog) => {
      if (swapTargetIdx === null) return;
      hapticSuccess();
      setExercises((prev) => {
        const next = [...prev];
        const current = next[swapTargetIdx];
        if (!current) return prev;
        next[swapTargetIdx] = {
          ...current,
          id: alt.exerciseId || `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: alt.name,
          muscle: alt.muscle || current.muscle,
          videoId: alt.videoId || '',
          targetSets: current.targetSets || alt.targetSets || 3,
          targetReps: current.targetReps || (alt.targetReps || '8-10').replace('–', '-'),
          restTimeSecs: current.restTimeSecs || alt.restTimeSecs || 90,
        };
        return next;
      });
      setEditorError(null);
      setSwapTargetIdx(null);
      setSheetView('editor');
    },
    [swapTargetIdx]
  );

  const handleAddPlanCardio = useCallback((type: string, preset?: { durationMinutes?: number | null }) => {
    hapticSuccess();
    const newItem: GymPlanCardio = {
      id: `cardio_plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      durationMinutes: preset?.durationMinutes ?? null,
    };
    setCardioList((prev) => [...prev, newItem]);
    setEditorError(null);
    setSheetView('editor');
  }, []);

  const handleCardioDurationChange = useCallback((idx: number, mins: number | null) => {
    hapticLight();
    setCardioList((prev) =>
      prev.map((item, i) =>
        i === idx
          ? { ...item, durationMinutes: item.durationMinutes === mins ? null : mins }
          : item
      )
    );
  }, []);

  const handleDeleteCardioItem = useCallback((idx: number) => {
    hapticMedium();
    setCardioList((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // ─── Save Whole Routine ────────────────────────────────────────────────────
  const handleSaveRoutine = useCallback(async () => {
    if (savingRef.current) return;
    const finalName = routineName.trim() || (exercises.length === 0 && cardioList.length > 0 ? 'Cardio & Conditioning' : 'Custom Workout');
    if (exercises.length === 0 && cardioList.length === 0) {
      setEditorError('Add at least 1 exercise or cardio activity before saving.');
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    hapticSuccess();
    const finalRoutine: GymRoutine = {
      id: routineToEdit?.id || `rt_${Date.now()}`,
      folderId: routineToEdit?.folderId,
      name: finalName,
      subtitle: routineFocus.trim() || sessionSummary.topMuscles || undefined,
      focus: routineFocus.trim() || sessionSummary.topMuscles || undefined,
      exercises,
      cardio: cardioList,
      estimatedDurationMins: sessionSummary.estimatedMins,
      updatedAt: Date.now(),
    };

    try {
      await onSave(finalRoutine, assignedDay);
      onClose();
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [routineName, exercises, cardioList, routineFocus, sessionSummary, routineToEdit, assignedDay, onSave, onClose]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      fullHeight={true}
      noPadding={true}
      avoidKeyboard={true}
      sheetBackgroundColor={isDark ? '#0B0C10' : '#F8F8FA'}
    >
      <View style={[styles.root, { flex: 1 }]}>
        {sheetView === 'add_cardio' ? (
          <Animated.View entering={FadeIn.duration(170)} style={{ flex: 1 }}>
            <AddCardioModal
              embedded
              visible={visible}
              title="Add Cardio to Workout"
              showDurationPresets={true}
              onClose={() => setSheetView('editor')}
              onAdd={handleAddPlanCardio}
            />
          </Animated.View>
        ) : sheetView !== 'editor' ? (
          <Animated.View entering={FadeIn.duration(170)} style={{ flex: 1 }}>
            <AddExerciseModal
              embedded
              visible={visible}
              selectionMode={sheetView === 'swap' ? 'single' : 'multi'}
              headerTitle={
                sheetView === 'swap' && swapTargetIdx !== null
                  ? `Swap ${exercises[swapTargetIdx]?.name || 'Exercise'}`
                  : 'Select Exercises'
              }
              onClose={() => {
                setSheetView('editor');
                setSwapTargetIdx(null);
              }}
              onAdd={(single) => {
                if (sheetView === 'swap') {
                  handleSwapExercisePicked(single);
                } else {
                  handleMultiExercisesAdded([single]);
                }
              }}
              onMultiAdd={handleMultiExercisesAdded}
            />
          </Animated.View>
        ) : (
        <>
        {/* ── Top Navigation Bar ── */}
        <View style={styles.navBar}>
          <TactileButton variant="custom" haptic="light" onPress={onClose} style={styles.navCancelBtn} hitSlop={TOUCH.hitSlop}>
            <Text style={styles.navCancelText}>Cancel</Text>
          </TactileButton>

          <View style={styles.navTitleBox}>
            <Text style={styles.navTitle} numberOfLines={1}>
              {routineToEdit ? 'Edit Workout' : 'New Workout'}
            </Text>
            {assignedDay ? (
              <Text style={styles.navSubtitle}>
                {DAY_CHIPS.find((d) => d.index === assignedDay)?.label} Schedule Day
              </Text>
            ) : null}
          </View>

          <TactileButton
            variant="custom"
            haptic="none"
            onPress={handleSaveRoutine}
            disabled={isSaving}
            hitSlop={TOUCH.hitSlop}
            style={[styles.navSaveBtn, isSaving && { opacity: 0.6 }]}
          >
            <Text style={styles.navSaveText}>Save</Text>
          </TactileButton>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
            {/* ── Routine Details Card ── */}
            <View style={styles.detailsCard}>
              <Text style={styles.fieldLabel}>WORKOUT NAME</Text>
              <TextInput
                style={styles.nameInput}
                value={routineName}
                onChangeText={setRoutineName}
                placeholder="e.g. Push Hypertrophy A"
                placeholderTextColor={tokens.text.muted}
                autoCapitalize="words"
              />

              <Text style={[styles.fieldLabel, { marginTop: SPACE.md }]}>FOCUS (OPTIONAL)</Text>
              <TextInput
                style={styles.nameInput}
                value={routineFocus}
                onChangeText={setRoutineFocus}
                placeholder="Auto-filled from exercises"
                placeholderTextColor={tokens.text.muted}
                autoCapitalize="words"
              />

              <Text style={[styles.fieldLabel, { marginTop: SPACE.md }]}>ASSIGN TO SCHEDULE DAY</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayStripScroll}
              >
                {DAY_CHIPS.map((chip) => {
                  const isSelected = assignedDay === chip.index;
                  return (
                    <Pressable
                      key={chip.label}
                      onPress={() => {
                        hapticLight();
                        setAssignedDay(chip.index);
                      }}
                      style={({ pressed }) => [
                        styles.dayChip,
                        isSelected && styles.dayChipActive,
                        pressed && { opacity: 0.78 },
                      ]}
                    >
                      {isSelected ? (
                        <Check size={11} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} style={{ marginRight: 3 }} />
                      ) : null}
                      <Text style={[styles.dayChipText, isSelected && styles.dayChipTextActive]}>
                        {chip.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* ── Session Volume & Time HUD (shown once exercises or cardio exist) ── */}
            {(exercises.length > 0 || cardioList.length > 0) && (
              <View style={styles.hudCard}>
                <View style={styles.hudItem}>
                  <NumericText style={styles.hudVal}>{exercises.length}</NumericText>
                  <Text style={styles.hudLabel}>Exercises</Text>
                </View>
                <View style={styles.hudDivider} />
                <View style={styles.hudItem}>
                  <NumericText style={[styles.hudVal, { color: tokens.status.success }]}>
                    {cardioList.length > 0 && exercises.length === 0 ? cardioList.length : sessionSummary.totalSets}
                  </NumericText>
                  <Text style={styles.hudLabel}>
                    {cardioList.length > 0 && exercises.length === 0 ? 'Cardio' : 'Working Sets'}
                  </Text>
                </View>
                {cardioList.length > 0 && exercises.length > 0 && (
                  <>
                    <View style={styles.hudDivider} />
                    <View style={styles.hudItem}>
                      <NumericText style={[styles.hudVal, { color: tokens.accent.primary }]}>{cardioList.length}</NumericText>
                      <Text style={styles.hudLabel}>Cardio</Text>
                    </View>
                  </>
                )}
                <View style={styles.hudDivider} />
                <View style={styles.hudItem}>
                  <NumericText style={styles.hudVal}>~{sessionSummary.estimatedMins}m</NumericText>
                  <Text style={styles.hudLabel}>Est. Time</Text>
                </View>
              </View>
            )}

            {/* ── Exercises Section ── */}
            <View style={styles.sectionHeaderRow}>
              <NumericText style={styles.sectionHeaderLabel}>EXERCISES ({exercises.length})</NumericText>
              {exercises.length > 0 && (
                <Text style={styles.sectionHeaderHint}>Adjust sets & reps inline</Text>
              )}
            </View>

            {exercises.map((ex, idx) => {
              const repInfo = getTargetRepOptions(ex.targetReps);
              const curRest = Number(ex.restTimeSecs) || 90;

              return (
                <View
                  key={ex.id || `${ex.name}-${idx}`}
                  style={styles.exerciseCard}
                >
                  {/* Top Bar: Index + Name + Muscle + Reorder + Delete */}
                  <View style={styles.exCardTopRow}>
                    <View style={styles.exIndexBadge}>
                      <NumericText style={styles.exIndexText}>{idx + 1}</NumericText>
                    </View>

                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <Text style={styles.exNameTitle} numberOfLines={1}>
                        {ex.name}
                      </Text>
                      {ex.muscle ? (
                        <View style={styles.exMuscleRow}>
                          <View
                            style={[
                              styles.exMuscleDot,
                              { backgroundColor: resolveMuscleColor(ex.muscle) },
                            ]}
                          />
                          <Text style={styles.exMuscleText} numberOfLines={1}>
                            {ex.muscle.split('/')[0]}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Reorder Arrows */}
                    <View style={styles.reorderGroup}>
                      {idx > 0 && (
                        <TactileButton
                          variant="icon"
                          haptic="none"
                          onPress={() => handleMoveExercise(idx, 'up')}
                          style={styles.reorderBtn}
                          hitSlop={TOUCH.hitSlop}
                          accessibilityLabel="Move exercise up"
                        >
                          <ChevronUp size={16} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
                        </TactileButton>
                      )}
                      {idx < exercises.length - 1 && (
                        <TactileButton
                          variant="icon"
                          haptic="none"
                          onPress={() => handleMoveExercise(idx, 'down')}
                          style={styles.reorderBtn}
                          hitSlop={TOUCH.hitSlop}
                          accessibilityLabel="Move exercise down"
                        >
                          <ChevronDown size={16} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
                        </TactileButton>
                      )}
                    </View>

                    {/* Swap & Delete Icon Buttons */}
                    <TactileButton
                      variant="icon"
                      haptic="light"
                      onPress={() => {
                        setSwapTargetIdx(idx);
                        setSheetView('swap');
                      }}
                      style={styles.reorderBtn}
                      hitSlop={TOUCH.hitSlop}
                      accessibilityLabel={`Swap ${ex.name}`}
                    >
                      <ArrowLeftRight size={15} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                    </TactileButton>
                    <TactileButton
                      variant="icon"
                      haptic="none"
                      onPress={() => handleDeleteExercise(idx)}
                      style={styles.deleteExBtn}
                      hitSlop={TOUCH.hitSlop}
                      accessibilityLabel="Remove exercise"
                    >
                      <Trash2 size={16} color={tokens.accent.crimson} strokeWidth={ICON.strokeWidth} />
                    </TactileButton>
                  </View>

                  <View style={styles.cardInnerDivider} />

                  {/* Middle Row: Sets Stepper */}
                  <View style={styles.setsStepperRow}>
                    <Text style={styles.controlRowLabel}>Sets:</Text>
                    <View style={styles.stepperControl}>
                      <TactileButton
                        variant="icon"
                        haptic="none"
                        onPress={() => handleSetChange(idx, -1)}
                        style={styles.stepperStepBtn}
                        hitSlop={TOUCH.hitSlop}
                        accessibilityLabel="Decrease sets"
                      >
                        <Minus size={14} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
                      </TactileButton>
                      <NumericText style={styles.stepperValText}>
                        {ex.targetSets || 3} <Text style={styles.stepperUnitText}>Sets</Text>
                      </NumericText>
                      <TactileButton
                        variant="icon"
                        haptic="none"
                        onPress={() => handleSetChange(idx, 1)}
                        style={styles.stepperStepBtn}
                        hitSlop={TOUCH.hitSlop}
                        accessibilityLabel="Increase sets"
                      >
                        <Plus size={14} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
                      </TactileButton>
                    </View>
                  </View>

                  {/* Reps Row */}
                  <View style={styles.repsRow}>
                    <Text style={styles.controlRowLabel}>Target:</Text>
                    <View style={styles.chipsWrap}>
                      {repInfo.options.map((option) => {
                        const isSelected =
                          option === 'Custom'
                            ? repInfo.isCustom
                            : !repInfo.isCustom && repInfo.activeValue === option;

                        return (
                          <Pressable
                            key={option}
                            onPress={() => handleRepChange(idx, option)}
                            style={({ pressed }) => [
                              styles.repChip,
                              isSelected && styles.repChipActive,
                              pressed && { opacity: 0.78 },
                            ]}
                          >
                            {isSelected ? (
                              <Check size={11} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} style={{ marginRight: 3 }} />
                            ) : null}
                            <NumericText style={[styles.repChipText, isSelected && styles.repChipTextActive]}>
                              {option === 'Custom' && repInfo.isCustom
                                ? `Custom (${ex.targetReps})`
                                : option}
                            </NumericText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {customRepTargetExId === ex.id ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <TextInput
                        style={[styles.promptInput, { flex: 1, paddingVertical: 8, fontSize: 13.5 }]}
                        value={customRepInput}
                        onChangeText={setCustomRepInput}
                        placeholder="e.g. 5x5 or 12-15"
                        placeholderTextColor={tokens.text.muted}
                        maxFontSizeMultiplier={1.25}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={handleSaveCustomRep}
                      />
                      <TactileButton
                        variant="custom"
                        haptic="light"
                        onPress={() => setCustomRepTargetExId(null)}
                        style={styles.promptCancelBtn}
                      >
                        <Text style={styles.promptCancelText}>Cancel</Text>
                      </TactileButton>
                      <TactileButton
                        variant="custom"
                        haptic="none"
                        onPress={handleSaveCustomRep}
                        style={styles.promptSaveBtn}
                      >
                        <Text style={styles.promptSaveText}>Apply</Text>
                      </TactileButton>
                    </View>
                  ) : null}

                  {/* Rest Row */}
                  <View style={styles.restRow}>
                    <Text style={styles.controlRowLabel}>Rest:</Text>
                    <View style={styles.chipsWrap}>
                      {REST_PRESETS.map((seconds) => {
                        const isSelected = curRest === seconds;
                        return (
                          <Pressable
                            key={seconds}
                            onPress={() => handleRestChange(idx, seconds)}
                            style={({ pressed }) => [
                              styles.restChip,
                              isSelected && styles.restChipActive,
                              pressed && { opacity: 0.78 },
                            ]}
                          >
                            {isSelected ? (
                              <Check size={11} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} style={{ marginRight: 3 }} />
                            ) : null}
                            <NumericText style={[styles.restChipText, isSelected && styles.restChipTextActive]}>
                              {seconds}s
                            </NumericText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })}

            {cardioList.length > 0 && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <NumericText style={styles.sectionHeaderLabel}>CARDIO ({cardioList.length})</NumericText>
                  <Text style={styles.sectionHeaderHint}>Optional target duration</Text>
                </View>

                {cardioList.map((cItem, cIdx) => (
                  <View key={cItem.id || `${cItem.type}-${cIdx}`} style={styles.exerciseCard}>
                    <View style={styles.exCardTopRow}>
                      <View style={[styles.exIndexBadge, { backgroundColor: tokens.accent.primaryDim }]}>
                        <Activity size={12} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                      </View>
                      <View style={{ flex: 1, paddingRight: 6 }}>
                        <Text style={styles.exNameTitle} numberOfLines={1}>{cItem.type}</Text>
                        <NumericText style={styles.exMuscleText} numberOfLines={1}>
                          {cItem.durationMinutes ? `${cItem.durationMinutes} min planned` : 'Open duration'}
                        </NumericText>
                      </View>
                      <TactileButton
                        variant="icon"
                        haptic="none"
                        onPress={() => handleDeleteCardioItem(cIdx)}
                        style={styles.deleteExBtn}
                        hitSlop={TOUCH.hitSlop}
                        accessibilityLabel={`Remove ${cItem.type}`}
                      >
                        <Trash2 size={16} color={tokens.accent.crimson} strokeWidth={ICON.strokeWidth} />
                      </TactileButton>
                    </View>

                    <View style={styles.restRow}>
                      <Text style={styles.controlRowLabel}>Target:</Text>
                      <View style={styles.chipsWrap}>
                        {CARDIO_MIN_PRESETS.map((mins) => {
                          const isSel = cItem.durationMinutes === mins;
                          return (
                            <Pressable
                              key={mins}
                              onPress={() => handleCardioDurationChange(cIdx, mins)}
                              style={({ pressed }) => [
                                styles.restChip,
                                isSel && styles.restChipActive,
                                pressed && { opacity: 0.78 },
                              ]}
                            >
                              {isSel && (
                                <Check size={11} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} style={{ marginRight: 3 }} />
                              )}
                              <NumericText style={[styles.restChipText, isSel && styles.restChipTextActive]}>
                                {mins}m
                              </NumericText>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}

            {editorError ? (
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(239,68,68,0.14)' : 'rgba(239,68,68,0.08)',
                  borderRadius: RADIUS.inner,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: 'rgba(239,68,68,0.38)',
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                }}
              >
                <Text style={{ fontSize: 12.5, fontFamily: FONT_FAMILY.medium, color: tokens.status.danger }}>
                  {editorError}
                </Text>
              </View>
            ) : null}

            {exercises.length === 0 && cardioList.length === 0 ? (
              <View style={{ gap: 10 }}>
                <TactileButton
                  variant="custom"
                  haptic="none"
                  onPress={() => {
                    hapticLight();
                    setSwapTargetIdx(null);
                    setSheetView('add');
                  }}
                  style={styles.emptyAddCard}
                >
                  <View style={styles.emptyAddIconWrap}>
                    <Dumbbell size={18} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                  </View>
                  <View style={styles.emptyAddTextCol}>
                    <Text style={styles.emptyTitle}>Add Exercises</Text>
                    <Text style={styles.emptySub}>Tap to select movements from the catalogue</Text>
                  </View>
                  <View style={styles.emptyAddPlusPill}>
                    <Plus size={14} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} />
                  </View>
                </TactileButton>

                <TactileButton
                  variant="custom"
                  haptic="none"
                  onPress={() => {
                    hapticLight();
                    setSheetView('add_cardio');
                  }}
                  style={styles.emptyAddCard}
                >
                  <View style={[styles.emptyAddIconWrap, { backgroundColor: tokens.status.successDim }]}>
                    <Activity size={18} color={tokens.status.success} strokeWidth={ICON.strokeWidth} />
                  </View>
                  <View style={styles.emptyAddTextCol}>
                    <Text style={styles.emptyTitle}>Add Cardio</Text>
                    <Text style={styles.emptySub}>Treadmill, cycling, stairmaster & conditioning</Text>
                  </View>
                  <View style={styles.emptyAddPlusPill}>
                    <Plus size={14} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} />
                  </View>
                </TactileButton>
              </View>
            ) : (
              <View style={styles.bottomAddRow}>
                <TactileButton
                  variant="custom"
                  haptic="none"
                  onPress={() => {
                    hapticLight();
                    setSwapTargetIdx(null);
                    setSheetView('add');
                  }}
                  style={[styles.addExerciseMainBtn, { flex: 1, marginTop: 0 }]}
                >
                  <Plus size={15} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} />
                  <Text style={styles.addExerciseMainBtnText} numberOfLines={1}>Add Exercise</Text>
                </TactileButton>

                <TactileButton
                  variant="custom"
                  haptic="none"
                  onPress={() => {
                    hapticLight();
                    setSheetView('add_cardio');
                  }}
                  style={styles.addCardioSecondaryBtn}
                >
                  <Activity size={15} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                  <Text style={styles.addCardioSecondaryBtnText} numberOfLines={1}>Add Cardio</Text>
                </TactileButton>
              </View>
            )}
          </ScrollView>
        </>
        )}
      </View>
    </BottomSheet>
  );
});

// ─── STYLES (MATCHING HOME, PLAN, PROGRESS & BODY TABS) ────────────────────────
const makeStyles = (tokens: typeof DARK_TOKENS, isDark: boolean) => {
  const sheetBg = isDark ? '#0B0C10' : '#F8F8FA';
  const surfaceBg = isDark ? '#14161D' : '#FFFFFF';
  const controlBg = isDark ? '#0B0C10' : '#F1F2F6';
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: sheetBg,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: SPACE.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.border.subtle,
  },
  navCancelBtn: {
    minHeight: TOUCH.minTarget,
    justifyContent: 'center',
    paddingHorizontal: SPACE.xs,
  },
  navCancelText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },
  navTitleBox: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: SPACE.sm,
  },
  navTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  navSubtitle: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.accent.primary,
    marginTop: 1,
  },
  navSaveBtn: {
    backgroundColor: tokens.accent.primary,
    minHeight: 32,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: RADIUS.inner,
  },
  navSaveText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.onPrimary,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 40,
    gap: 10,
  },

  // Details Card
  detailsCard: {
    backgroundColor: surfaceBg,
    borderRadius: RADIUS.card,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: tokens.text.secondary,
    marginBottom: 6,
  },
  nameInput: {
    backgroundColor: controlBg,
    borderRadius: RADIUS.inner,
    paddingHorizontal: SPACE.md,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  dayStripScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  dayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: controlBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.border.subtle,
    minHeight: 28,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  dayChipActive: {
    backgroundColor: tokens.accent.primary,
    borderColor: tokens.accent.primary,
  },
  dayChipText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },
  dayChipTextActive: {
    color: tokens.accent.onPrimary,
    fontFamily: FONT_FAMILY.bold,
  },

  // Volume HUD
  hudCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: surfaceBg,
    borderRadius: RADIUS.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  hudItem: {
    flex: 1,
    alignItems: 'center',
  },
  hudVal: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
    fontVariant: ['tabular-nums'],
  },
  hudLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
    marginTop: 2,
  },
  hudDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: tokens.border.subtle,
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.xs,
    marginTop: SPACE.xs,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: tokens.text.secondary,
  },
  sectionHeaderHint: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.muted,
  },

  // Exercise Card
  exerciseCard: {
    backgroundColor: surfaceBg,
    borderRadius: RADIUS.card,
    padding: SPACE.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.border.subtle,
    gap: 9,
  },
  exCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  exIndexBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: tokens.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exIndexText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.secondary,
  },
  exNameTitle: {
    fontSize: 14.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
    letterSpacing: -0.2,
  },
  exMuscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    marginTop: 2,
  },
  exMuscleDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  exMuscleText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },
  reorderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
  },
  reorderBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.inner,
    backgroundColor: tokens.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteExBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.inner,
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInnerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: tokens.border.subtle,
  },

  // Sets Stepper Row
  setsStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlRowLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.secondary,
    width: 52,
  },
  stepperControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    backgroundColor: controlBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.border.subtle,
    borderRadius: RADIUS.inner,
    paddingHorizontal: SPACE.xs,
    paddingVertical: SPACE.xs,
  },
  stepperStepBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
    fontVariant: ['tabular-nums'],
  },
  stepperUnitText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },

  // Reps & Rest Rows
  repsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  chipsWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  repChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: controlBg,
    minHeight: 28,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  repChipActive: {
    backgroundColor: tokens.accent.primary,
  },
  repChipText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },
  repChipTextActive: {
    color: tokens.accent.onPrimary,
    fontFamily: FONT_FAMILY.bold,
  },
  restChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: controlBg,
    minHeight: 28,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  restChipActive: {
    backgroundColor: tokens.accent.primary,
  },
  restChipText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },
  restChipTextActive: {
    color: tokens.accent.onPrimary,
    fontFamily: FONT_FAMILY.bold,
  },

  // Unified Compact Empty Add Card
  emptyAddCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surfaceBg,
    borderRadius: RADIUS.card,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 74,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  emptyAddIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: tokens.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAddTextCol: {
    flex: 1,
    minWidth: 0,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  emptySub: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
    marginTop: 2,
  },
  emptyAddPlusPill: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.full,
    backgroundColor: tokens.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Main Add Buttons
  bottomAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACE.xs,
  },
  addExerciseMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: tokens.accent.primary,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    marginTop: SPACE.xs,
  },
  addExerciseMainBtnText: {
    fontSize: 13.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.onPrimary,
  },
  addCardioSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: surfaceBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.border.subtle,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
  },
  addCardioSecondaryBtnText: {
    fontSize: 13.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.primary,
  },

  // Custom Rep Prompt Modal
  promptBackdrop: {
    flex: 1,
    backgroundColor: tokens.bg.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  promptCard: {
    width: '100%',
    backgroundColor: surfaceBg,
    borderRadius: RADIUS.card,
    padding: 18,
    gap: SPACE.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  promptTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  promptSub: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
  },
  promptInput: {
    backgroundColor: controlBg,
    borderRadius: RADIUS.inner,
    paddingHorizontal: SPACE.md,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  promptActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: SPACE.xs,
  },
  promptCancelBtn: {
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  promptCancelText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },
  promptSaveBtn: {
    backgroundColor: tokens.accent.primary,
    minHeight: 36,
    paddingHorizontal: SPACE.lg,
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
  },
  promptSaveText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.onPrimary,
  },
});
};

export default RoutineEditorModal;
