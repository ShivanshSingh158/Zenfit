import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
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
import { TactileButton, NumericText } from '../../../../components/ui';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ICON, SPACE, TOUCH } from '../../../../theme/tokens';
import { GymPlanDay } from '../../../../types/gym.types';
import { hapticLight, hapticSelection } from '../../../../utils/haptics';
import { getSplitsPalette, useSplitsStyles } from '../styles/gymSplitsStyles';
import { getRotationLetterForDay } from '../../../../services/gymRotationService';
import { resolveMuscleColor } from '../../../../utils/gymUtils';
import { useLatestNonNull } from '../../../../hooks/useLatestNonNull';

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
  onAddExercise: () => void;
  onSwapRoutine: (dayIndex: number) => void;
  onEditWorkout?: (activeDay: any) => void;
  onEditExercise?: (dayIndex: number, exIndex: number, ex: any) => void;
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
  onAddExercise,
  onSwapRoutine,
  onEditWorkout,
  onEditExercise,
}) => {
  const { tokens, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useSplitsStyles();
  const palette = getSplitsPalette(tokens, isDark);
  const currentDay = useLatestNonNull(activeDay);
  const isRest = Boolean(currentDay?.planDay?.isRest);
  const isToday = currentDay?.dayIndex === (currentDayOfWeek === 0 ? 7 : currentDayOfWeek);
  const exercises = currentDay?.planDay?.exercises || [];

  const displaySubtitle = useMemo(() => {
    if (!currentDay?.planDay) return '';
    if (isRest) return 'Scheduled rest & recovery';
    const totalSets = exercises.reduce((acc, ex) => acc + (Number(ex.targetSets) || 3), 0);
    const estMins = Math.round(totalSets * 2.5);
    return `${exercises.length} exercises · ${totalSets} sets · ~${estMins}m`;
  }, [isRest, currentDay?.planDay, exercises]);

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

        {isEditPlanMode && !isRest && exercises.length > 0 ? (
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

        {/* Modal Content: Scrollable Borderless Exercise Ledger OR Rest Presentation */}
        <ScrollView
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
            </View>
          ) : (
            <View>
              {!isHeavyReady ? (
                <View style={{ height: 140, backgroundColor: tokens.bg.surface, borderRadius: 12, marginVertical: SPACE[8] }} />
              ) : (
                <View style={styles.exercisesListWrap}>
                  {exercises.map((ex, idx) => (
                    <View
                      key={`${ex.name}-${idx}`}
                      style={[
                        styles.exerciseItemRow,
                        idx === exercises.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <Pressable
                        disabled={isEditPlanMode || !onEditExercise}
                        onPress={() => {
                          if (!isEditPlanMode && onEditExercise) {
                            hapticSelection();
                            onEditExercise(currentDay.dayIndex, idx, ex);
                          }
                        }}
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
                  ))}

                  {exercises.length === 0 && (
                    <View style={{ alignItems: 'center', paddingVertical: SPACE[24] }}>
                      <Dumbbell size={26} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} style={{ marginBottom: SPACE[8] }} />
                      <Text style={styles.emptyNote}>No exercises assigned to this day yet.</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </ScrollView>

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
                onAddExercise();
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
      </View>
    </BottomSheet>
  );
});

export default DayDetailModal;
