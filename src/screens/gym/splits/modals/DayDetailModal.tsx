import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Activity,
  ChevronRight,
  Clock,
  Dumbbell,
  Moon,
  MoreHorizontal,
  X,
  Trash2,
  Pencil,
  ArrowLeftRight,
  Plus,
} from 'lucide-react-native';
import BottomSheet from '../../../../components/ui/BottomSheet';
import { NestableScrollContainer, NestableDraggableFlatList, ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { TactileButton, NumericText } from '../../../../components/ui';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ICON, SPACE, TOUCH } from '../../../../theme/tokens';
import { GymPlanCardio, GymPlanDay } from '../../../../types/gym.types';
import { hapticLight, hapticMedium, hapticSelection } from '../../../../utils/haptics';
import { getSplitsPalette, useSplitsStyles } from '../styles/gymSplitsStyles';
import { getRotationLetterForDay } from '../../../../services/gymRotationService';
import { resolveMuscleColor } from '../../../../utils/gymUtils';
import { useLatestNonNull } from '../../../../hooks/useLatestNonNull';

function formatPlanCardioSummary(c: GymPlanCardio): string {
  const parts: string[] = [];
  if (c.durationMinutes) parts.push(`${c.durationMinutes} min`);
  if (c.distanceKm) parts.push(`${c.distanceKm} km`);
  if (c.speedKmh) parts.push(`${c.speedKmh} km/h`);
  if (c.incline) parts.push(`${c.incline}% incline`);
  if (c.floors) parts.push(`${c.floors} floors`);
  if (c.level) parts.push(`Lvl ${c.level}`);
  if (c.laps) parts.push(`${c.laps} laps`);
  if (c.rounds) parts.push(`${c.rounds} rounds`);
  if (c.spm) parts.push(`${c.spm} spm`);
  if (c.pace) parts.push(`${c.pace} min/km`);
  if (c.calories) parts.push(`${c.calories} kcal`);
  return parts.length > 0 ? parts.join(' · ') : 'Planned cardio · Tap to set targets';
}

export interface DayDetailModalProps {
  visible: boolean;
  onClose: () => void;
  activeDay: { dayIndex: number; dayName: string; planDay: GymPlanDay } | null;
  isRotation: boolean;
  rotationDays: any[];
  nextUpDayIndex: number | null;
  currentDayOfWeek: number;
  formatTimeSlot: (time?: string) => string | null;
  handleToggleRest: (dayIndex: number) => void;
  handleOpenDayOptionsMenu: (activeDay: any) => void;
  isHeavyReady: boolean;
  isEditPlanMode: boolean;
  onExitDeleteMode?: () => void;
  handleDeleteExerciseFromPlan: (dayIndex: number, exIndex: number, exName: string) => void;
  handleDeleteCardioFromPlan?: (dayIndex: number, cardioIndex: number, cardioName: string) => void;
  onAddExercise: () => void;
  onAddCardio?: () => void;
  onSwapRoutine: (dayIndex: number) => void;
  onEditWorkout?: (activeDay: any) => void;
  onEditExercise?: (dayIndex: number, exIndex: number, ex: any) => void;
  onEditCardio?: (dayIndex: number, cardioIndex: number, cardioItem: GymPlanCardio) => void;
  onReorderExercises?: (dayIndex: number, exercises: any[]) => void;
}

export const DayDetailModal: React.FC<DayDetailModalProps> = React.memo(({
  visible,
  onClose,
  activeDay,
  isRotation,
  rotationDays,
  nextUpDayIndex,
  currentDayOfWeek,
  formatTimeSlot,
  handleToggleRest,
  handleOpenDayOptionsMenu,
  isHeavyReady,
  isEditPlanMode,
  onExitDeleteMode,
  handleDeleteExerciseFromPlan,
  handleDeleteCardioFromPlan,
  onAddExercise,
  onAddCardio,
  onSwapRoutine,
  onEditWorkout,
  onEditExercise,
  onEditCardio,
  onReorderExercises,
}) => {
  const { tokens, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useSplitsStyles();
  const palette = getSplitsPalette(tokens, isDark);
  const currentDay = useLatestNonNull(activeDay);
  const [showAddChooser, setShowAddChooser] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShowAddChooser(false);
    }
  }, [visible]);

  const isRest = Boolean(currentDay?.planDay?.isRest);
  const isToday = currentDay?.dayIndex === (currentDayOfWeek === 0 ? 7 : currentDayOfWeek);
  const exercises = currentDay?.planDay?.exercises || [];
  const cardio = currentDay?.planDay?.cardio || [];

  const displaySubtitle = useMemo(() => {
    if (!currentDay?.planDay) return '';
    if (isRest) return 'Scheduled rest & recovery';
    const totalSets = exercises.reduce((acc, ex) => acc + (Number(ex.targetSets) || 3), 0);
    const cardioMins = cardio.reduce((acc, c) => acc + (Number(c.durationMinutes) || 0), 0);
    const estMins = Math.round(totalSets * 2.5) + cardioMins;
    const parts: string[] = [];
    if (exercises.length > 0) parts.push(`${exercises.length} exercises · ${totalSets} sets`);
    if (cardio.length > 0) parts.push(`${cardio.length} cardio`);
    if (parts.length === 0) return 'No exercises or cardio added yet';
    return `${parts.join(' · ')} · ~${estMins}m`;
  }, [isRest, currentDay?.planDay, exercises, cardio]);

  if (!currentDay) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      fullHeight={true}
      noPadding={true}
      avoidKeyboard={false}
      sheetBackgroundColor={palette.sheetCanvas}
    >
      <View
        style={[
          styles.dayModalSheet,
          {
            backgroundColor: 'transparent',
            height: '100%',
            maxHeight: '100%',
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderWidth: 0,
            paddingBottom: Math.max(insets.bottom, SPACE[16]),
          },
        ]}
      >
        {/* Modal Header */}
        <View style={{ marginBottom: SPACE[12] }}>
          {/* Row 1: Weekday tag on left, Actions cluster on right */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE[8] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE[8], flexWrap: 'wrap', flex: 1 }}>
              <Text style={styles.focusedDayWeekday}>
                {isRotation && !isRest
                  ? `Workout ${getRotationLetterForDay(currentDay.dayIndex, rotationDays)} (Queue)`
                  : currentDay.dayName}
              </Text>

              {isRotation && currentDay.dayIndex === nextUpDayIndex && (
                <View style={styles.todayPill}>
                  <Text style={styles.todayPillText}>UP NEXT</Text>
                </View>
              )}

              {!isRotation && isToday && (
                <View style={styles.todayPill}>
                  <Text style={styles.todayPillText}>TODAY</Text>
                </View>
              )}

              {formatTimeSlot(currentDay.planDay.startTime) ? (
                <View style={styles.timeSlotPill}>
                  <Clock size={11} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
                  <NumericText style={styles.timeSlotText}>
                    {formatTimeSlot(currentDay.planDay.startTime)}
                  </NumericText>
                </View>
              ) : null}
            </View>

            {/* Action Icons */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE[8] }}>
              <TactileButton
                variant="custom"
                onPress={() => {
                  hapticSelection();
                  handleToggleRest(currentDay.dayIndex);
                }}
                hitSlop={TOUCH.hitSlop}
                style={[
                  styles.headerRestToggleBtn,
                  isRest && styles.headerRestToggleBtnActive,
                ]}
              >
                {isRest ? (
                  <Dumbbell size={13} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                ) : (
                  <Moon size={13} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
                )}
                <Text
                  style={[
                    styles.headerRestToggleBtnText,
                    isRest && { color: tokens.accent.primary },
                  ]}
                >
                  {isRest ? 'Train' : 'Rest'}
                </Text>
              </TactileButton>

              <TactileButton
                variant="custom"
                onPress={() => handleOpenDayOptionsMenu(currentDay)}
                style={styles.moreOptionsIconBtn}
                hitSlop={TOUCH.hitSlop}
                accessibilityLabel="Day options"
              >
                <MoreHorizontal size={16} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
              </TactileButton>

              <TactileButton
                variant="custom"
                onPress={onClose}
                style={styles.dayModalCloseBtn}
                hitSlop={TOUCH.hitSlop}
                accessibilityLabel="Close"
              >
                <X size={16} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
              </TactileButton>
            </View>
          </View>

          {/* Row 2: Title and Clean 1-Line Subtitle */}
          <Text style={styles.focusedDayTitle} numberOfLines={1}>
            {currentDay.planDay.name}
          </Text>
          <NumericText style={styles.focusedDayFocus} numberOfLines={1}>
            {displaySubtitle}
          </NumericText>
        </View>

        <View style={styles.hairline} />

        {isEditPlanMode && !isRest && (exercises.length > 0 || cardio.length > 0) ? (
          <View style={styles.deleteModeBanner}>
            <Text style={styles.deleteModeBannerText} numberOfLines={1}>
              Tap trash to remove from weekly plan
            </Text>
            {onExitDeleteMode ? (
              <TactileButton
                variant="custom"
                onPress={onExitDeleteMode}
                style={styles.deleteModeDoneBtn}
                hitSlop={TOUCH.hitSlop}
              >
                <Text style={styles.deleteModeDoneText}>Done</Text>
              </TactileButton>
            ) : null}
          </View>
        ) : null}

        {/* Modal Content: Scrollable Borderless Exercise & Cardio Ledger OR Rest Presentation */}
        <NestableScrollContainer
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: SPACE[4] }}
          nestedScrollEnabled
        >
          {isRest ? (
            <View style={styles.restDayContainer}>
              <Moon size={30} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} style={{ marginBottom: SPACE[8] }} />
              <Text style={styles.restDayTitle}>Rest & Recover</Text>
              <Text style={styles.restDaySub}>
                Scheduled recovery day to rebuild strength and energy between sessions.
              </Text>

              <TactileButton
                variant="primary"
                size="md"
                onPress={() => handleToggleRest(currentDay.dayIndex)}
                style={styles.switchWorkoutBtn}
              >
                <Dumbbell size={14} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} />
                <Text style={styles.switchWorkoutBtnText}>Make Workout Day</Text>
              </TactileButton>

              <TactileButton
                variant="custom"
                onPress={() => {
                  hapticLight();
                  if (onAddCardio) {
                    setShowAddChooser(true);
                  } else {
                    onAddExercise();
                  }
                }}
                style={styles.restSecondaryAddBtn}
              >
                <Plus size={14} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                <Text style={styles.restSecondaryAddText}>Add Cardio or Exercise</Text>
              </TactileButton>
            </View>
          ) : (
            <View>
              {!isHeavyReady ? (
                <View style={{ height: 140, backgroundColor: tokens.bg.surface, borderRadius: 12, marginVertical: SPACE[8] }} />
              ) : (
                <View style={styles.exercisesListWrap}>
                  {exercises.length > 0 && (
                    <NestableDraggableFlatList
                      data={exercises}
                      keyExtractor={(ex, idx) => String(ex.id || `${ex.name}-${idx}`)}
                      activationDistance={14}
                      onDragBegin={() => hapticMedium()}
                      onDragEnd={({ data, from, to }) => {
                        if (from === to) return;
                        hapticLight();
                        onReorderExercises?.(currentDay.dayIndex, data);
                      }}
                      renderItem={({ item: ex, getIndex, drag, isActive }: RenderItemParams<any>) => {
                        const idx = getIndex() ?? exercises.indexOf(ex);
                        return (
                          <ScaleDecorator activeScale={1.015}>
                            <View
                              style={[
                                styles.exerciseItemRow,
                                idx === exercises.length - 1 && cardio.length === 0 && { borderBottomWidth: 0 },
                                isActive && { backgroundColor: tokens.bg.elevated, borderRadius: 12, borderBottomWidth: 0 },
                              ]}
                            >
                              <Pressable
                                disabled={!onEditExercise && !onReorderExercises}
                                onPress={() => {
                                  if (!isEditPlanMode && onEditExercise) {
                                    hapticSelection();
                                    onEditExercise(currentDay.dayIndex, idx, ex);
                                  }
                                }}
                                onLongPress={() => {
                                  if (!isEditPlanMode && onReorderExercises) {
                                    drag();
                                  }
                                }}
                                delayLongPress={220}
                                style={({ pressed }) => [
                                  { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
                                  pressed && !isEditPlanMode && onEditExercise && { opacity: 0.72 },
                                ]}
                              >
                                {/* Index Box */}
                                <View style={styles.exIndexNum}>
                                  <NumericText style={styles.exIndexNumText}>{idx + 1}</NumericText>
                                </View>

                                {/* Title & Sets */}
                                <View style={{ flex: 1, minWidth: 0, paddingRight: SPACE[8] }}>
                                  <Text style={styles.exNameText} numberOfLines={1}>{ex.name}</Text>
                                  <NumericText style={styles.exTargetText}>
                                    {ex.targetSets} sets × {ex.targetReps || '8–12'} reps
                                  </NumericText>
                                </View>

                                {/* Borderless Muscle Tag */}
                                {ex.muscle ? (
                                  <View style={styles.exMuscleInline}>
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

                                {/* Edit cue when tapping row in view mode */}
                                {!isEditPlanMode && onEditExercise ? (
                                  <Pencil size={13} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} style={{ marginLeft: SPACE[4] }} />
                                ) : null}
                              </Pressable>

                              {/* Delete trash button in edit mode */}
                              {isEditPlanMode && (
                                <TactileButton
                                  variant="custom"
                                  onPress={() => handleDeleteExerciseFromPlan(currentDay.dayIndex, idx, ex.name)}
                                  style={styles.planExDeleteBtn}
                                  hitSlop={TOUCH.hitSlop}
                                  accessibilityLabel={`Delete ${ex.name}`}
                                >
                                  <Trash2 size={15} color={tokens.status.danger} strokeWidth={ICON.strokeWidth} />
                                </TactileButton>
                              )}
                            </View>
                          </ScaleDecorator>
                        );
                      }}
                    />
                  )}

                  {cardio.length > 0 && (
                    <View>
                      {exercises.length > 0 && (
                        <View style={styles.cardioSubHeaderRow}>
                          <Text style={styles.cardioSubHeaderLabel}>CARDIO ({cardio.length})</Text>
                        </View>
                      )}
                      {cardio.map((cItem, cIdx) => (
                        <View
                          key={`${cItem.id || cItem.type}-${cIdx}`}
                          style={[
                            styles.exerciseItemRow,
                            cIdx === cardio.length - 1 && { borderBottomWidth: 0 },
                          ]}
                        >
                          <Pressable
                            disabled={isEditPlanMode || !onEditCardio}
                            onPress={() => {
                              if (!isEditPlanMode && onEditCardio) {
                                hapticSelection();
                                onEditCardio(currentDay.dayIndex, cIdx, cItem);
                              }
                            }}
                            style={({ pressed }) => [
                              { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
                              pressed && !isEditPlanMode && onEditCardio && { opacity: 0.72 },
                            ]}
                          >
                            <View style={styles.exCardioBadge}>
                              <Activity size={13} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                            </View>

                            <View style={{ flex: 1, minWidth: 0, paddingRight: SPACE[8] }}>
                              <Text style={styles.exNameText} numberOfLines={1}>{cItem.type}</Text>
                              <NumericText style={styles.exTargetText} numberOfLines={1}>
                                {formatPlanCardioSummary(cItem)}
                              </NumericText>
                            </View>

                            {!isEditPlanMode && onEditCardio ? (
                              <Pencil size={13} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} style={{ marginLeft: SPACE[4] }} />
                            ) : null}
                          </Pressable>

                          {isEditPlanMode && handleDeleteCardioFromPlan && (
                            <TactileButton
                              variant="custom"
                              onPress={() => handleDeleteCardioFromPlan(currentDay.dayIndex, cIdx, cItem.type)}
                              style={styles.planExDeleteBtn}
                              hitSlop={TOUCH.hitSlop}
                              accessibilityLabel={`Delete ${cItem.type}`}
                            >
                              <Trash2 size={15} color={tokens.status.danger} strokeWidth={ICON.strokeWidth} />
                            </TactileButton>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {exercises.length === 0 && cardio.length === 0 && (
                    <View style={{ alignItems: 'center', paddingVertical: SPACE[24] }}>
                      <Dumbbell size={26} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} style={{ marginBottom: SPACE[8] }} />
                      <Text style={styles.emptyNote}>No exercises or cardio added to this day yet.</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </NestableScrollContainer>

        {/* ── Fixed Bottom Actions Bar ── */}
        {!isRest && (
          <View style={styles.modalFixedBottomBar}>
            <TactileButton
              variant="primary"
              size="md"
              onPress={() => {
                hapticLight();
                if (onEditWorkout) onEditWorkout(currentDay);
              }}
              style={[styles.modalPrimaryEditBtn, { minWidth: 0 }]}
            >
              <Pencil size={14} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} />
              <Text
                style={[styles.modalPrimaryEditBtnText, { flexShrink: 1 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                Edit Workout
              </Text>
            </TactileButton>

            <TactileButton
              variant="custom"
              size="md"
              onPress={() => {
                hapticLight();
                onSwapRoutine(currentDay.dayIndex);
              }}
              style={[styles.modalSecondarySwapBtn, { minWidth: 0 }]}
            >
              <ArrowLeftRight size={14} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
              <Text
                style={[styles.modalSecondarySwapBtnText, { flexShrink: 1 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                Swap
              </Text>
            </TactileButton>

            <TactileButton
              variant="custom"
              size="md"
              onPress={() => {
                hapticLight();
                if (onAddCardio) {
                  setShowAddChooser(true);
                } else {
                  onAddExercise();
                }
              }}
              style={[styles.modalSecondaryAddBtn, { minWidth: 0 }]}
            >
              <Plus size={14} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
              <Text
                style={[styles.modalSecondaryAddBtnText, { flexShrink: 1 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                Add
              </Text>
            </TactileButton>
          </View>
        )}

        {/* ── Add Exercise or Cardio Chooser Overlay ── */}
        {showAddChooser && (
          <View style={styles.addChooserBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowAddChooser(false)}
              accessibilityLabel="Close add chooser"
            />
            <View
              style={[
                styles.addChooserSheet,
                { paddingBottom: Math.max(insets.bottom, SPACE[16]) + SPACE[8] },
              ]}
            >
              <View style={styles.addChooserHeader}>
                <View style={{ flex: 1, paddingRight: SPACE[8] }}>
                  <Text style={styles.addChooserTitle} numberOfLines={1}>
                    Add to {currentDay.dayName}
                  </Text>
                  <Text style={styles.addChooserSub} numberOfLines={1}>
                    Choose whether to add a lift or cardio session
                  </Text>
                </View>
                <TactileButton
                  variant="custom"
                  onPress={() => setShowAddChooser(false)}
                  style={styles.dayModalCloseBtn}
                  hitSlop={TOUCH.hitSlop}
                  accessibilityLabel="Dismiss"
                >
                  <X size={16} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
                </TactileButton>
              </View>

              <TactileButton
                variant="custom"
                haptic="light"
                style={styles.addChooserOption}
                onPress={() => {
                  setShowAddChooser(false);
                  onAddExercise();
                }}
              >
                <View style={[styles.addChooserIconWrap, { backgroundColor: tokens.accent.primaryDim }]}>
                  <Dumbbell size={18} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.addChooserOptTitle}>Exercise</Text>
                  <Text style={styles.addChooserOptSub} numberOfLines={1}>
                    Strength, hypertrophy & bodyweight movements
                  </Text>
                </View>
                <ChevronRight size={16} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
              </TactileButton>

              <TactileButton
                variant="custom"
                haptic="light"
                style={styles.addChooserOption}
                onPress={() => {
                  setShowAddChooser(false);
                  onAddCardio?.();
                }}
              >
                <View style={[styles.addChooserIconWrap, { backgroundColor: tokens.status.successDim }]}>
                  <Activity size={18} color={tokens.status.success} strokeWidth={ICON.strokeWidth} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.addChooserOptTitle}>Cardio</Text>
                  <Text style={styles.addChooserOptSub} numberOfLines={1}>
                    Treadmill, cycling, stairmaster & duration goals
                  </Text>
                </View>
                <ChevronRight size={16} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
              </TactileButton>
            </View>
          </View>
        )}
      </View>
    </BottomSheet>
  );
});

export default DayDetailModal;
