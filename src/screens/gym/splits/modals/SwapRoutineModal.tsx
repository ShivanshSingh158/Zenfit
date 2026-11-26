import React from 'react';
import {
  View,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus, ChevronRight } from 'lucide-react-native';
import BottomSheet from '../../../../components/ui/BottomSheet';
import { TactileButton, NumericText } from '../../../../components/ui';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ICON, SPACE, TOUCH } from '../../../../theme/tokens';
import { GymRoutine } from '../../../../types/gym.types';
import { useLatestNonNull } from '../../../../hooks/useLatestNonNull';
import { getSplitsPalette, useSplitsStyles } from '../styles/gymSplitsStyles';

export interface SwapRoutineModalProps {
  dayIndex: number | null;
  onClose: () => void;
  dayNames: string[];
  customRoutinesList: GymRoutine[];
  onSelectRoutine: (dayIndex: number, routineId: string, routine: GymRoutine) => void;
  onCreateRoutine: () => void;
}

export const SwapRoutineModal: React.FC<SwapRoutineModalProps> = React.memo(({
  dayIndex,
  onClose,
  dayNames,
  customRoutinesList,
  onSelectRoutine,
  onCreateRoutine,
}) => {
  const { tokens, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useSplitsStyles();
  const palette = getSplitsPalette(tokens, isDark);
  const activeDayIndex = useLatestNonNull(dayIndex);
  if (activeDayIndex === null) return null;

  return (
    <BottomSheet
      visible={dayIndex !== null}
      onClose={onClose}
      avoidKeyboard={false}
      noPadding={true}
      sheetBackgroundColor={palette.sheetCanvas}
    >
      <View style={[styles.sheetCard, { backgroundColor: 'transparent', width: '100%', borderRadius: 0, borderWidth: 0, paddingHorizontal: SPACE[16], paddingBottom: Math.max(insets.bottom, SPACE[16]) }]}>
        <View style={styles.sheetHeader}>
          <View style={{ flex: 1, paddingRight: SPACE[8] }}>
            <Text style={styles.sheetTitle}>Swap Routine</Text>
            <Text style={styles.sheetSubtitle}>
              Select routine for {dayNames[activeDayIndex - 1]}
            </Text>
          </View>
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

        <View style={styles.dayPickList}>
          {customRoutinesList.length === 0 ? (
            <View style={{ paddingVertical: SPACE[16], alignItems: 'center' }}>
              <Text style={styles.emptyNote}>No custom routines saved yet.</Text>
              <TactileButton
                variant="primary"
                size="md"
                onPress={onCreateRoutine}
                style={[styles.primaryActionBtn, { marginTop: SPACE[12] }]}
              >
                <Plus size={14} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} />
                <Text style={styles.primaryActionText}>Create New Routine</Text>
              </TactileButton>
            </View>
          ) : (
            customRoutinesList.map(rt => {
              const totalSets = (rt.exercises || []).reduce((acc, ex) => acc + (Number(ex.targetSets) || 3), 0);
              return (
                <TactileButton
                  variant="custom"
                  key={`swap-rt-${rt.id}`}
                  style={styles.dayPickRow}
                  onPress={() => {
                    onSelectRoutine(activeDayIndex, rt.id, rt);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dayPickName}>{rt.name}</Text>
                    <NumericText style={styles.sheetSubtitle}>
                      {rt.exercises?.length || 0} exercises · {totalSets} sets
                      {(rt.cardio?.length || 0) > 0 ? ` · ${rt.cardio?.length} cardio` : ''}
                    </NumericText>
                  </View>
                  <ChevronRight size={ICON.sm} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
                </TactileButton>
              );
            })
          )}
        </View>
      </View>
    </BottomSheet>
  );
});

export default SwapRoutineModal;

