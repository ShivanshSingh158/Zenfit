/**
 * SwapRoutineModal.tsx — ZenTrack Mobile
 * Allows user to swap the active workout routine for the selected day.
 */
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { X } from 'lucide-react-native';
import BottomSheet from '../../ui/BottomSheet';
import { TactileButton } from '../../ui/TactileButton';
import { ICON, TOUCH } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { resolvePlanDay } from '../../../data/gymPlan';
import { useGymPlan } from '../../../contexts/domains/WellnessContext';
import { hapticSuccess } from '../../../utils/haptics';

import { makeSwapRoutineStyles } from './swapRoutineStyles';
import RoutineSplitCard from './RoutineSplitCard';

interface Props {
  visible: boolean;
  selectedDate?: string;
  currentPlanDayIndex?: number;
  onClose: () => void;
  onSelectDay: (dayIndex: number) => void;
}

export function SwapRoutineModal({
  visible,
  currentPlanDayIndex,
  onClose,
  onSelectDay,
}: Props) {
  const { colors, isDark, tokens } = useTheme();
  const styles = useMemo(() => makeSwapRoutineStyles(colors, isDark), [colors, isDark]);
  const { userGymPlan } = useGymPlan();

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => resolvePlanDay(userGymPlan, i + 1));
  }, [userGymPlan]);

  const handleSelect = (idx: number) => {
    hapticSuccess();
    onSelectDay(idx);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      scrollable={true}
      avoidKeyboard={false}
    >
      {/* Unified Sheet Header */}
      <View style={styles.header}>
        <View style={styles.headerTextCol}>
          <Text style={styles.title}>Swap Today's Workout</Text>
          <Text style={styles.subtitle}>
            Changes today only — your weekly plan stays the same.
          </Text>
        </View>
        <TactileButton
          variant="custom"
          haptic="light"
          onPress={onClose}
          style={styles.closeBtn}
          hitSlop={TOUCH.hitSlop}
          accessibilityLabel="Close swap workout sheet"
        >
          <X size={16} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
        </TactileButton>
      </View>

      {/* Single Obsidian Hairline Ledger */}
      <View style={styles.ledgerCard}>
        {days.map((d, idx) => (
          <RoutineSplitCard
            key={d.dayIndex}
            day={d}
            isSelected={currentPlanDayIndex === d.dayIndex}
            showDivider={idx < days.length - 1}
            onSelect={handleSelect}
            styles={styles}
            colors={colors}
          />
        ))}
      </View>
    </BottomSheet>
  );
}

export default SwapRoutineModal;
