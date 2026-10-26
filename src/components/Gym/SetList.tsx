import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SwipeableSetRow from './SwipeableSetRow';
import type { SetInputState } from '../../utils/activeLoggingMath';

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
    action: 'textChange' | 'blur' | 'toggle' | 'delete' | 'swipe' | 'cycleType' | 'copyPrev' | 'focusField',
    payload?: any
  ) => void;
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
}) => {
  const firstWorkingIdx = setsLog.findIndex(s => !s.isWarmup);

  return (
    <View style={styles.tableCard}>
      {/* Table Column Header: SET | PREV | KG | REPS | ✓ */}
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.tableColHeader, { width: 38, textAlign: 'center' }]}>SET</Text>
        <Text style={[styles.tableColHeader, { width: 72, textAlign: 'center' }]}>PREV</Text>
        <Text style={[styles.tableColHeader, { flex: 1, textAlign: 'center' }]}>KG</Text>
        <Text style={[styles.tableColHeader, { flex: 1, textAlign: 'center' }]}>REPS</Text>
        <Text style={[styles.tableColHeader, { width: 42, textAlign: 'center' }]}>✓</Text>
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
                <Ionicons name="barbell-outline" size={13} color={colors.accentPrimary || '#0A84FF'} />
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

      {/* Seamless Add Set Button directly combined inside the table below the last set */}
      {onAddSet && (
        <>
          <View style={styles.tableHairline} />
          <TouchableOpacity
            onPress={onAddSet}
            style={styles.tableAddSetRow}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={17} color={isDark ? 'rgba(255, 255, 255, 0.85)' : '#000000'} />
            <Text style={styles.tableAddSetText}>Add Set</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
});

export default SetList;
