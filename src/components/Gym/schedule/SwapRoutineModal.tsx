/**
 * SwapRoutineModal.tsx — ZenTrack Mobile
 * Allows user to swap the active workout routine for the selected day.
 */
import React, { useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import { GYM_PLAN } from '../../../data/gymPlan';
import { useGymPlan } from '../../../contexts/domains/WellnessContext';
import { getCustomPlanDay } from '../../../hooks/useGymLog';
import { hapticSuccess } from '../../../utils/haptics';
import { formatIndianDate } from '../../../utils/gymUtils';

// Extracted Subcomponents & Styles
import { makeSwapRoutineStyles } from './swapRoutineStyles';
import RoutineSplitCard from './RoutineSplitCard';

interface Props {
  visible: boolean;
  selectedDate: string;
  currentPlanDayIndex?: number;
  onClose: () => void;
  onSelectDay: (dayIndex: number) => void;
}

export function SwapRoutineModal({
  visible,
  selectedDate,
  currentPlanDayIndex,
  onClose,
  onSelectDay,
}: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeSwapRoutineStyles(colors, isDark), [colors, isDark]);
  const { userGymPlan } = useGymPlan();

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => i + 1).map(idx => {
      const custom = getCustomPlanDay(userGymPlan?.customDays, idx);
      const fallback = GYM_PLAN.find(p => p.dayIndex === idx);
      return custom || fallback || { dayIndex: idx, name: `Day ${idx}`, subtitle: '', focus: '', exercises: [], isRest: false };
    });
  }, [userGymPlan]);

  const handleSelect = (idx: number) => {
    hapticSuccess();
    onSelectDay(idx);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalBg}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom + 16, 28) },
          ]}
        >
          {/* Top Sheet Drag Handle */}
          <View style={styles.sheetHandleWrap}>
            <View style={styles.sheetHandle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextCol}>
              <Text style={styles.title}>Swap Day Routine</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                Select a workout program for {formatIndianDate(selectedDate)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Routine List */}
          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {days.map(d => (
              <RoutineSplitCard
                key={d.dayIndex}
                day={d}
                isSelected={currentPlanDayIndex === d.dayIndex}
                onSelect={handleSelect}
                styles={styles}
                colors={colors}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default SwapRoutineModal;
