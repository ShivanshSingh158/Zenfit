import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, Dumbbell, ChevronUp, ChevronDown, Plus, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsiveMetrics } from '../../theme/responsive';
import { unitLabel, useWeightUnit } from '../../utils/weightUnit';
import type { SetInputState } from '../../utils/activeLoggingMath';
import { WorkoutSetRow } from './WorkoutSetRow';
import { TactileButton } from '../ui/TactileButton';
import { AppIcon } from '../ui/AppIcon';

export interface SetListProps {
  setsLog: any[];
  activeSetIndex: number;
  setInputs: SetInputState[];
  lastSessionSets?: any[];
  colors?: any;
  isDark?: boolean;
  styles?: any;
  hasWarmups?: boolean;
  allWarmupsCompleted?: boolean;
  showCompletedWarmups?: boolean;
  overloadSuggestion?: any | null;
  activeKeypadField?: { setIndex: number; field: 'weight' | 'reps' } | null;
  isFieldSelected?: boolean;
  onAddSet?: () => void;
  onToggleShowWarmups?: () => void;
  onSetAction: (
    idx: number,
    action:
      | 'textChange'
      | 'blur'
      | 'toggle'
      | 'delete'
      | 'requestDelete'
      | 'swipe'
      | 'cycleType'
      | 'copyPrev'
      | 'focusField'
      | 'setRest',
    payload?: any
  ) => void;
  isAllComplete?: boolean;
  isLastExercise?: boolean;
  progressionPolicy?: 'linear' | 'double' | 'triple' | 'top_backoff';
  onSelectProgressionPolicy?: (policy: 'linear' | 'double' | 'triple' | 'top_backoff') => void;
  onFinishWorkout?: () => void;
}

/**
 * SetList — Concentric OLED set card (16px radius, 12px padding) with 4-column
 * alignment matching WorkoutSetRow 1:1 (Set | Weight | Reps | Check).
 */
export const SetList: React.FC<SetListProps> = React.memo(
  ({
    setsLog,
    activeSetIndex,
    setInputs,
    hasWarmups = false,
    allWarmupsCompleted = false,
    showCompletedWarmups = false,
    overloadSuggestion,
    activeKeypadField,
    isFieldSelected = false,
    onAddSet,
    onToggleShowWarmups,
    onSetAction,
    isAllComplete,
    isLastExercise,
    onFinishWorkout,
  }) => {
    const { tokens } = useTheme();
    const { isNarrow } = useResponsiveMetrics();
    const unitIsLbs = useWeightUnit();
    const weightColLabel = unitLabel(unitIsLbs).toUpperCase();
    const firstWorkingIdx = setsLog.findIndex((s) => !s.isWarmup);

    return (
      <View
        style={[
          localStyles.tableCard,
          {
            backgroundColor: tokens.bg.surface,
            borderRadius: tokens.radius.card,
            padding: tokens.space.md,
            borderWidth: tokens.border.hairlineWidth,
            borderColor: tokens.border.subtle,
          },
        ]}
      >
        {/* Aligned 4-Column Header */}
        <View style={localStyles.headerRow}>
          <View style={[localStyles.colSetHeader, isNarrow && { width: 38 }]}>
            <Text
              maxFontSizeMultiplier={1.2}
              style={[tokens.typography.overline, { color: tokens.text.muted }]}
            >
              SET
            </Text>
          </View>
          <View style={localStyles.colWeightHeader}>
            <Text
              maxFontSizeMultiplier={1.2}
              style={[tokens.typography.overline, { color: tokens.text.muted }]}
            >
              {weightColLabel}
            </Text>
          </View>
          <View style={localStyles.colRepsHeader}>
            <Text
              maxFontSizeMultiplier={1.2}
              style={[tokens.typography.overline, { color: tokens.text.muted }]}
            >
              REPS
            </Text>
          </View>
          <View style={[localStyles.colCheckHeader, isNarrow && { width: 42 }]}>
            <Text
              maxFontSizeMultiplier={1.2}
              style={[tokens.typography.overline, { color: tokens.text.muted }]}
            >
              ✓
            </Text>
          </View>
        </View>

        {/* Collapsible Warm-up Phase Header */}
        {hasWarmups && (
          <TactileButton
            variant="custom"
            disabled={!allWarmupsCompleted}
            onPress={allWarmupsCompleted ? onToggleShowWarmups : undefined}
            style={localStyles.phaseHeaderRow}
          >
            <AppIcon icon={Flame} size={14} color={tokens.status.warning} />
            <Text
              style={[
                tokens.typography.overline,
                { color: tokens.text.secondary },
              ]}
            >
              WARM-UP SETS
              {allWarmupsCompleted
                ? ` (${setsLog.filter((s) => s.isWarmup).length} done · ${
                    showCompletedWarmups ? 'hide' : 'show'
                  })`
                : ''}
            </Text>
            <View
              style={[
                localStyles.phaseHeaderLine,
                { backgroundColor: tokens.border.subtle },
              ]}
            />
            {allWarmupsCompleted && (
              <AppIcon
                icon={showCompletedWarmups ? ChevronUp : ChevronDown}
                size={14}
                color={tokens.text.secondary}
              />
            )}
          </TactileButton>
        )}

        {setsLog.map((set, idx) => {
          if (set.isWarmup && allWarmupsCompleted && !showCompletedWarmups) {
            return null;
          }

          const isActive = idx === activeSetIndex;
          const inputState = setInputs[idx] || { weight: '', reps: '' };
          const setWeightStr =
            set.weight !== null &&
            set.weight !== undefined &&
            !isNaN(Number(set.weight)) &&
            Number(set.weight) >= 0
              ? String(set.weight)
              : '';
          const setRepsStr =
            set.reps !== null &&
            set.reps !== undefined &&
            !isNaN(Number(set.reps)) &&
            Number(set.reps) >= 0
              ? String(set.reps)
              : '';

          const isInputReady = setInputs.length > idx;
          const displayWeight = set.completed
            ? setWeightStr || inputState.weight || ''
            : isInputReady
            ? inputState.weight
            : setWeightStr || '';

          const displayReps = set.completed
            ? setRepsStr || inputState.reps || ''
            : isInputReady
            ? inputState.reps
            : setRepsStr || '';

          const stableKey = set.id ?? `set-${idx}`;
          const isFirstWorkingRow = hasWarmups && idx === firstWorkingIdx;

          const prescription = overloadSuggestion?.prescribedSets?.[idx];
          const placeholderWeight =
            prescription && prescription.targetWeight > 0
              ? String(prescription.targetWeight)
              : undefined;
          const placeholderReps =
            prescription && prescription.targetReps > 0
              ? String(prescription.targetReps)
              : undefined;

          return (
            <React.Fragment key={stableKey}>
              {isFirstWorkingRow && (
                <View style={[localStyles.phaseHeaderRow, { marginTop: tokens.space.md }]}>
                  <AppIcon
                    icon={Dumbbell}
                    size={14}
                    color={tokens.accent.primary}
                  />
                  <Text
                    style={[
                      tokens.typography.overline,
                      { color: tokens.text.secondary },
                    ]}
                  >
                    WORKING SETS
                  </Text>
                  <View
                    style={[
                      localStyles.phaseHeaderLine,
                      { backgroundColor: tokens.border.subtle },
                    ]}
                  />
                </View>
              )}

              <WorkoutSetRow
                set={set}
                idx={idx}
                isActive={isActive}
                isCompleted={!!set.completed}
                displayWeight={displayWeight}
                displayReps={displayReps}
                placeholderWeight={placeholderWeight}
                placeholderReps={placeholderReps}
                activeKeypadField={
                  !set.completed && activeKeypadField?.setIndex === idx
                    ? activeKeypadField.field
                    : null
                }
                isFieldSelected={
                  !set.completed && activeKeypadField?.setIndex === idx
                    ? isFieldSelected
                    : false
                }
                onAction={onSetAction}
              />
            </React.Fragment>
          );
        })}

        {/* Add Set CTA (48dp touch height, concentric 10px inner radius) */}
        {onAddSet && (
          <TactileButton
            variant="secondary"
            onPress={onAddSet}
            style={[
              localStyles.addSetBtn,
              {
                marginTop: tokens.space.sm,
                borderRadius: tokens.radius.inner,
              },
            ]}
          >
            <AppIcon icon={Plus} size={18} color={tokens.accent.primary} />
            <Text
              style={[
                tokens.typography.label,
                { color: tokens.accent.primary },
              ]}
            >
              Add Set
            </Text>
          </TactileButton>
        )}

        {/* Finish Workout CTA on last exercise */}
        {isAllComplete && isLastExercise && onFinishWorkout && (
          <TactileButton
            variant="primary"
            size="lg"
            haptic="success"
            onPress={onFinishWorkout}
            style={{ marginTop: tokens.space.md }}
          >
            <AppIcon
              icon={CheckCircle2}
              size={16}
              color={tokens.accent.onPrimary}
            />
            <Text
              style={[
                tokens.typography.label,
                {
                  fontFamily: tokens.font.bold,
                  color: tokens.accent.onPrimary,
                },
              ]}
            >
              Finish Workout
            </Text>
          </TactileButton>
        )}
      </View>
    );
  }
);

const localStyles = StyleSheet.create({
  tableCard: {
    marginTop: 12,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  colSetHeader: {
    width: 44,
    alignItems: 'center',
  },
  colWeightHeader: {
    flex: 1.25,
    alignItems: 'center',
  },
  colRepsHeader: {
    flex: 1.0,
    alignItems: 'center',
  },
  colCheckHeader: {
    width: 48,
    alignItems: 'center',
  },
  phaseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  phaseHeaderLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  addSetBtn: {
    minHeight: 48,
  },
});

export default SetList;
