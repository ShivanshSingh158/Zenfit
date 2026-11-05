import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SwipeableSetRow from './SwipeableSetRow';
import type { SetInputState } from '../../../utils/activeLoggingMath';
import { FONT_FAMILY } from '../../../theme/tokens';

export interface SetListProps {
  setsLog: any[];
  activeSetIndex: number;
  setInputs: SetInputState[];
  lastSessionSets?: any[];
  colors: any;
  isDark: boolean;
  styles: any;
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
    action: 'textChange' | 'blur' | 'toggle' | 'delete' | 'swipe' | 'cycleType' | 'copyPrev' | 'focusField' | 'setRest',
    payload?: any
  ) => void;
  isAllComplete?: boolean;
  isLastExercise?: boolean;
  progressionPolicy?: 'linear' | 'double' | 'triple' | 'top_backoff';
  onSelectProgressionPolicy?: (policy: 'linear' | 'double' | 'triple' | 'top_backoff') => void;
  onFinishWorkout?: () => void;
}

/**
 * Extracted React.memo SetList Component
 * Prevents all set rows and phase headers from re-evaluating on unrelated parent
 * re-renders (such as the 1Hz rest-timer countdown, duration ticks, or video toggles).
 */
export const SetList: React.FC<SetListProps> = React.memo(({
  setsLog,
  activeSetIndex,
  setInputs,
  lastSessionSets,
  colors,
  isDark,
  styles,
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
  progressionPolicy = 'double',
  onSelectProgressionPolicy,
  onFinishWorkout,
}) => {
  const firstWorkingIdx = setsLog.findIndex(s => !s.isWarmup);

  return (
    <View style={styles.tableCard}>
      {/* Table Column Header: Weight (kg) | Reps */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 12,
        paddingBottom: 8,
      }}>
        <View style={{ width: 32 }} />
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: FONT_FAMILY.medium, fontSize: 13, color: '#8E8E93' }}>
          Weight (kg)
        </Text>
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: FONT_FAMILY.medium, fontSize: 13, color: '#8E8E93' }}>
          Reps
        </Text>
        <View style={{ width: 42 }} />
      </View>

      {/* Collapsible Warm-up Phase Header */}
      {hasWarmups && (
        <TouchableOpacity
          style={styles.phaseHeaderRow}
          onPress={allWarmupsCompleted ? onToggleShowWarmups : undefined}
          activeOpacity={allWarmupsCompleted ? 0.7 : 1}
        >
          <Ionicons name="flame-outline" size={13} color="#FF9F0A" />
          <Text style={styles.phaseHeaderText}>
            WARM-UP SETS{allWarmupsCompleted ? ` (${setsLog.filter(s => s.isWarmup).length} completed • ${showCompletedWarmups ? 'hide' : 'show'})` : ''}
          </Text>
          <View style={styles.phaseHeaderLine} />
          {allWarmupsCompleted && (
            <Ionicons
              name={showCompletedWarmups ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="#8e8e93"
            />
          )}
        </TouchableOpacity>
      )}

      {setsLog.map((set, idx) => {
        // If warmups are completed and user collapsed them, skip rendering warmup rows
        if (set.isWarmup && allWarmupsCompleted && !showCompletedWarmups) {
          return null;
        }

        const isActive = idx === activeSetIndex;
        const inputState = setInputs[idx] || { weight: '', reps: '' };
        const setWeightStr = (set.weight !== null && set.weight !== undefined && Number(set.weight) > 0) ? String(set.weight) : '';
        const setRepsStr = (set.reps !== null && set.reps !== undefined && Number(set.reps) > 0) ? String(set.reps) : '';

        const isInputReady = setInputs.length > idx;
        const displayWeight = set.completed
          ? (setWeightStr || inputState.weight || '')
          : (isInputReady ? inputState.weight : (setWeightStr || ''));

        const displayReps = set.completed
          ? (setRepsStr || inputState.reps || '')
          : (isInputReady ? inputState.reps : (setRepsStr || ''));

        const lastValidPastSet = (lastSessionSets && lastSessionSets.length > 0) ? lastSessionSets[lastSessionSets.length - 1] : undefined;
        const prevSessionSet = lastSessionSets?.[idx] || lastValidPastSet;
        const prevPerf = (prevSessionSet && (prevSessionSet.weight != null || prevSessionSet.reps != null))
          ? `${prevSessionSet.weight ?? 0}kg × ${prevSessionSet.reps ?? 0}`
          : (idx > 0 && setsLog[idx - 1]?.weight && setsLog[idx - 1]?.reps
            ? `${setsLog[idx - 1].weight}kg × ${setsLog[idx - 1].reps}`
            : (set.isWarmup ? 'Warmup' : '—'));

        const stableKey = set.id || `set_${set.setNumber || idx + 1}_${idx}`;
        const isFirstWorkingRow = hasWarmups && idx === firstWorkingIdx;

        return (
          <React.Fragment key={`set-frag-${stableKey}`}>
            {isFirstWorkingRow && (
              <View style={[styles.phaseHeaderRow, { marginTop: 12 }]}>
                <Ionicons name="barbell-outline" size={13} color={colors.accentPrimary || '#a599ff'} />
                <Text style={styles.phaseHeaderText}>WORKING SETS</Text>
                <View style={styles.phaseHeaderLine} />
              </View>
            )}
            {idx > 0 && !isFirstWorkingRow && <View style={styles.tableHairline} />}
            {(() => {
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
                <SwipeableSetRow
                  key={stableKey}
                  set={set}
                  idx={idx}
                  isActive={isActive}
                  isCompleted={!!set.completed}
                  displayWeight={displayWeight}
                  displayReps={displayReps}
                  placeholderWeight={placeholderWeight}
                  placeholderReps={placeholderReps}
                  prevPerformance={prevPerf}
                  activeKeypadField={(!set.completed && activeKeypadField?.setIndex === idx) ? activeKeypadField.field : null}
                  isFieldSelected={(!set.completed && activeKeypadField?.setIndex === idx) ? isFieldSelected : false}
                  colors={colors}
                  isDark={isDark}
                  styles={styles}
                  onAction={onSetAction}
                />
              );
            })()}
          </React.Fragment>
        );
      })}

      {/* OpenGym Style + Add set Button */}
      {onAddSet && (
        <TouchableOpacity
          onPress={onAddSet}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            paddingHorizontal: 16,
            gap: 6,
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={17} color="#30D158" />
          <Text style={{
            fontFamily: FONT_FAMILY.bold,
            fontSize: 14.5,
            color: '#30D158',
          }}>
            Add set
          </Text>
        </TouchableOpacity>
      )}

      {/* Prominent Finish Workout CTA when on the last exercise and all sets are completed */}
      {isAllComplete && isLastExercise && onFinishWorkout && (
        <>
          <View style={styles.tableHairline} />
          <TouchableOpacity
            onPress={onFinishWorkout}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: '#FFFFFF',
              borderRadius: 999,
              paddingVertical: 14,
              marginTop: 12,
              marginBottom: 4,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 4,
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={19} color="#000000" />
            <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 14.5, color: '#000000', letterSpacing: -0.2 }}>
              Finish Workout 🏁
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
});

export default SetList;
