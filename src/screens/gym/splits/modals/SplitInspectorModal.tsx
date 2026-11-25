import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, CheckCircle2 } from 'lucide-react-native';
import BottomSheet from '../../../../components/ui/BottomSheet';
import { TactileButton, NumericText } from '../../../../components/ui';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ICON, SPACE, TOUCH } from '../../../../theme/tokens';
import { CuratedSplit } from '../../../../data/curatedSplits';
import { resolveExerciseTargetMuscle } from '../../../../utils/gymUtils';
import { hapticLight } from '../../../../utils/haptics';
import { useLatestNonNull } from '../../../../hooks/useLatestNonNull';
import { PreSessionMuscleHitMap } from '../../../../components/Gym/schedule/PreSessionMuscleHitMap';
import { getSplitsPalette, useSplitsStyles } from '../styles/gymSplitsStyles';

export interface SplitInspectorModalProps {
  split: CuratedSplit | null;
  onClose: () => void;
  onApply: (split: CuratedSplit) => void;
}

export const SplitInspectorModal: React.FC<SplitInspectorModalProps> = React.memo(({
  split,
  onClose,
  onApply,
}) => {
  const { tokens, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useSplitsStyles();
  const palette = getSplitsPalette(tokens, isDark);
  const [workoutIndex, setWorkoutIndex] = useState(0);
  const [svgReady, setSvgReady] = useState(false);
  const activeSplit = useLatestNonNull(split);

  useEffect(() => {
    if (split) {
      setWorkoutIndex(0);
      setSvgReady(false);
      const task = InteractionManager.runAfterInteractions(() => {
        setSvgReady(true);
      });
      const timer = setTimeout(() => setSvgReady(true), 120);
      return () => {
        task.cancel();
        clearTimeout(timer);
      };
    } else {
      setSvgReady(false);
    }
  }, [split]);

  if (!activeSplit) return null;

  const selectedWorkout = activeSplit.workouts[workoutIndex] || activeSplit.workouts[0];
  const totalSets = (selectedWorkout?.exercises || []).reduce(
    (acc, ex) => acc + (Number(ex.targetSets) || 3),
    0
  );
  const estMins = Math.round(totalSets * 2.5);

  return (
    <BottomSheet
      visible={split !== null}
      onClose={onClose}
      fullHeight={true}
      noPadding={true}
      avoidKeyboard={false}
      sheetBackgroundColor={palette.sheetCanvas}
    >
      <View style={[styles.modalSheetSafeArea, { flex: 1, backgroundColor: 'transparent' }]}>
        {/* Header */}
        <View style={styles.inspectorHeader}>
          <TactileButton
            variant="custom"
            onPress={onClose}
            style={styles.inspectorCloseBtn}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel="Close"
          >
            <X size={16} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
          </TactileButton>

          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: SPACE[8] }}>
            <Text
              style={styles.inspectorHeaderTitle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {activeSplit.name}
            </Text>
            <NumericText style={styles.inspectorHeaderSubtitle}>
              {activeSplit.daysPerWeek} Days / Wk · {activeSplit.level}
            </NumericText>
          </View>

          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.inspectorScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Borderless Description */}
          <View style={styles.inspectorDescBox}>
            <Text style={styles.inspectorDescText}>{activeSplit.description}</Text>
          </View>

          {/* Workout Day Switcher Tabs */}
          <View>
            <Text style={styles.inspectorSectionLabel}>WORKOUT DAYS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.inspectorWorkoutTabsRow}
            >
              {activeSplit.workouts.map((w, wIdx) => {
                const isSelected = workoutIndex === wIdx;
                return (
                  <TactileButton
                    key={w.id}
                    variant="custom"
                    onPress={() => {
                      hapticLight();
                      setWorkoutIndex(wIdx);
                    }}
                    style={[
                      styles.inspectorWorkoutTab,
                      isSelected && styles.inspectorWorkoutTabActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.inspectorWorkoutTabText,
                        isSelected && styles.inspectorWorkoutTabTextActive,
                      ]}
                    >
                      {w.name}
                    </Text>
                  </TactileButton>
                );
              })}
            </ScrollView>
          </View>

          {/* Selected Workout Content */}
          {selectedWorkout && (
            <View style={{ gap: SPACE[12] }}>
              <View style={styles.inspectorWorkoutHeaderBlock}>
                <Text style={styles.inspectorWorkoutName}>{selectedWorkout.name}</Text>
                <Text style={styles.inspectorWorkoutSub}>{selectedWorkout.subtitle}</Text>
                {Boolean(selectedWorkout.focus) && (
                  <Text style={styles.inspectorWorkoutFocusNotes}>{selectedWorkout.focus}</Text>
                )}
                <NumericText style={styles.inspectorWorkoutMetaText}>
                  {selectedWorkout.exercises?.length || 0} exercises · {totalSets} sets · ~{estMins} min
                </NumericText>
              </View>

              {/* Deferred Pre-Session Muscle Hit Map (Zero Open Lag) */}
              {svgReady ? (
                <PreSessionMuscleHitMap
                  exercises={selectedWorkout.exercises || []}
                  isRest={false}
                  compact={false}
                  showMiniAvatar={true}
                  title={selectedWorkout.name}
                  disableModal={true}
                />
              ) : (
                <View
                  style={{
                    height: 146,
                    borderRadius: 16,
                    backgroundColor: palette.sheetSurface,
                    opacity: 0.45,
                  }}
                />
              )}

              {/* Borderless Hairline Exercise List */}
              <View style={styles.inspectorExercisesLedger}>
                <NumericText style={styles.inspectorSectionLabel}>
                  EXERCISES ({selectedWorkout.exercises?.length || 0})
                </NumericText>
                <View>
                  {(selectedWorkout.exercises || []).map((ex, exIdx, arr) => {
                    const { targetMuscle } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
                    return (
                      <View
                        key={`ex-${ex.id || exIdx}`}
                        style={[
                          styles.inspectorExItem,
                          exIdx === arr.length - 1 && { borderBottomWidth: 0 },
                        ]}
                      >
                        <View style={styles.inspectorExIndexBadge}>
                          <NumericText style={styles.inspectorExIndexText}>{exIdx + 1}</NumericText>
                        </View>
                        <View style={{ flex: 1, minWidth: 0, paddingRight: SPACE[8] }}>
                          <Text style={styles.inspectorExName} numberOfLines={1}>
                            {ex.name}
                          </Text>
                          <NumericText style={styles.inspectorExMeta}>
                            {ex.targetSets} sets × {ex.targetReps || '8–12'} reps
                            {targetMuscle ? ` · ${targetMuscle}` : ''}
                          </NumericText>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Sticky Bottom Apply Button */}
        <View style={[styles.inspectorBottomBar, { paddingBottom: Math.max(insets.bottom, SPACE[16]) }]}>
          <TactileButton
            variant="primary"
            size="lg"
            onPress={() => {
              onApply(activeSplit);
              onClose();
            }}
            style={styles.inspectorApplyCtaBtn}
          >
            <CheckCircle2 size={16} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} />
            <Text style={styles.inspectorApplyCtaBtnText} numberOfLines={1}>
              Apply Split to Schedule
            </Text>
          </TactileButton>
        </View>
      </View>
    </BottomSheet>
  );
});

export default SplitInspectorModal;
