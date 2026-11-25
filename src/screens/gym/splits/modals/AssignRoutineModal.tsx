import React from 'react';
import {
  View,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import BottomSheet from '../../../../components/ui/BottomSheet';
import { TactileButton } from '../../../../components/ui';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ICON, SPACE, TOUCH } from '../../../../theme/tokens';
import { GymRoutine, GymPlanDay } from '../../../../types/gym.types';
import { useLatestNonNull } from '../../../../hooks/useLatestNonNull';
import { getSplitsPalette, useSplitsStyles } from '../styles/gymSplitsStyles';

export interface AssignRoutineModalProps {
  target: GymRoutine | null;
  onClose: () => void;
  dayNames: string[];
  resolvedDays: { dayIndex: number; dayName: string; planDay: GymPlanDay }[];
  onAssign: (dayIndex: number, routineId: string, routine: GymRoutine) => void;
}

export const AssignRoutineModal: React.FC<AssignRoutineModalProps> = React.memo(({
  target,
  onClose,
  dayNames,
  resolvedDays,
  onAssign,
}) => {
  const { tokens, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useSplitsStyles();
  const palette = getSplitsPalette(tokens, isDark);
  const activeTarget = useLatestNonNull(target);
  if (!activeTarget) return null;

  return (
    <BottomSheet
      visible={target !== null}
      onClose={onClose}
      avoidKeyboard={false}
      noPadding={true}
      sheetBackgroundColor={palette.sheetCanvas}
    >
      <View style={[styles.sheetCard, { backgroundColor: 'transparent', width: '100%', borderRadius: 0, borderWidth: 0, paddingHorizontal: SPACE[16], paddingBottom: Math.max(insets.bottom, SPACE[16]) }]}>
        <View style={styles.sheetHeader}>
          <View style={{ flex: 1, paddingRight: SPACE[8] }}>
            <Text style={styles.sheetTitle}>Assign to Day</Text>
            <Text style={styles.sheetSubtitle}>
              Choose which day to schedule "{activeTarget.name}"
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
          {dayNames.map((dName, idx) => (
            <TactileButton
              variant="custom"
              key={`day-pick-${idx + 1}`}
              style={styles.dayPickRow}
              onPress={() => onAssign(idx + 1, activeTarget.id, activeTarget)}
            >
              <Text style={styles.dayPickName}>{dName}</Text>
              <Text style={styles.dayPickCurrent}>
                {resolvedDays[idx]?.planDay.name || 'Rest'}
              </Text>
            </TactileButton>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
});

export default AssignRoutineModal;

