import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGymPlan } from '../../contexts/domains/WellnessContext';
import { useTheme } from '../../contexts/ThemeContext';
import { FONT_FAMILY } from '../../theme/tokens';
import { hapticLight, hapticSuccess } from '../../utils/haptics';
import { GYM_PLAN, GYM_PLAN_ARNOLD } from '../../data/gymPlan';
import { GymPlanExercise, GymPlanDay } from '../../types/gym.types';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface AddToDaySheetProps {
  visible: boolean;
  exercise: {
    id: string;
    name: string;
    muscle: string;
  } | null;
  onClose: () => void;
  onSuccess: (dayName: string) => void;
}

const COMMON_SETS = [2, 3, 4, 5];
const COMMON_REPS = ['6–8', '8–12', '10–15', '12–20'];
const COMMON_REST = [60, 90, 120, 180];

export const AddToDaySheet: React.FC<AddToDaySheetProps> = ({
  visible,
  exercise,
  onClose,
  onSuccess,
}) => {
  const { colors, isDark } = useTheme();
  const { userGymPlan, updateMasterPlan } = useGymPlan();

  const [targetDayIndex, setTargetDayIndex] = useState<number>(1);
  const [sets, setSets] = useState<number>(3);
  const [reps, setReps] = useState<string>('8–12');
  const [restSecs, setRestSecs] = useState<number>(90);

  // Resolve active plan days (1 to 7)
  const days = useMemo(() => {
    const isArnold = userGymPlan?.templateId === 'arnold';
    const basePlan = isArnold ? GYM_PLAN_ARNOLD : GYM_PLAN;

    return Array.from({ length: 7 }, (_, i) => {
      const dayIndex = i + 1;
      const customDay = userGymPlan?.customDays?.[dayIndex];
      const baseDay = basePlan.find((d) => d.dayIndex === dayIndex) || basePlan[i];
      const resolvedDay: GymPlanDay = customDay || baseDay;
      const dayName = DAY_NAMES[i];
      return {
        dayIndex,
        dayName,
        routineTitle: resolvedDay.name || `Day ${dayIndex}`,
        isRest: Boolean(resolvedDay.isRest),
        planDay: resolvedDay,
      };
    });
  }, [userGymPlan]);

  const handleAdd = async () => {
    if (!exercise) return;
    hapticSuccess();

    const selectedDayObj = days.find((d) => d.dayIndex === targetDayIndex);
    if (!selectedDayObj) return;

    const currentPlanDay = selectedDayObj.planDay;
    const newExercise: GymPlanExercise = {
      id: exercise.id || `ex_${Date.now()}`,
      name: exercise.name,
      targetSets: sets,
      targetReps: reps,
      muscle: exercise.muscle,
      restTimeSecs: restSecs,
    };

    const updatedPlanDay: GymPlanDay = {
      ...currentPlanDay,
      isRest: false, // adding an exercise turns it into an active day
      exercises: [...(currentPlanDay.exercises || []), newExercise],
    };

    await updateMasterPlan(targetDayIndex, updatedPlanDay);
    onSuccess(`${selectedDayObj.dayName} (${selectedDayObj.routineTitle})`);
    onClose();
  };

  if (!exercise) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheetContainer,
            { backgroundColor: isDark ? '#121217' : '#FFFFFF' },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Top Grab Handle */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : colors.textPrimary }]} numberOfLines={1}>
                Add to Weekly Split
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {exercise.name} · {exercise.muscle}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={isDark ? '#8E8E93' : '#636366'} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Target Day Selector */}
            <Text style={[styles.sectionLabel, { color: isDark ? '#8E8E93' : '#636366' }]}>
              SELECT WORKOUT DAY
            </Text>
            <View style={styles.daysList}>
              {days.map((d) => {
                const isSelected = targetDayIndex === d.dayIndex;
                return (
                  <TouchableOpacity
                    key={`day-opt-${d.dayIndex}`}
                    activeOpacity={0.7}
                    onPress={() => {
                      hapticLight();
                      setTargetDayIndex(d.dayIndex);
                    }}
                    style={[
                      styles.dayRow,
                      {
                        backgroundColor: isDark
                          ? (isSelected ? 'rgba(165, 153, 255, 0.16)' : '#1C1B24')
                          : (isSelected ? 'rgba(165, 153, 255, 0.12)' : '#F2F2F7'),
                        borderColor: isSelected
                          ? (colors.accentPrimary || '#A599FF')
                          : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'transparent'),
                      },
                    ]}
                  >
                    <View style={styles.dayInfoLeft}>
                      <Text
                        style={[
                          styles.dayNameText,
                          {
                            color: isSelected ? (colors.accentPrimary || '#A599FF') : (isDark ? '#FFFFFF' : '#1C1C1E'),
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {d.dayName}
                      </Text>
                      <Text style={[styles.routineTitleText, { color: isDark ? '#8E8E93' : '#636366' }]}>
                        {d.routineTitle} {d.isRest ? '(Rest)' : ''}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected ? (colors.accentPrimary || '#A599FF') : '#48484A',
                          backgroundColor: isSelected ? (colors.accentPrimary || '#A599FF') : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={13} color="#000000" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Target Sets Picker */}
            <Text style={[styles.sectionLabel, { color: isDark ? '#8E8E93' : '#636366', marginTop: 18 }]}>
              TARGET SETS
            </Text>
            <View style={styles.chipsRow}>
              {COMMON_SETS.map((sNum) => {
                const isSelected = sets === sNum;
                return (
                  <TouchableOpacity
                    key={`set-${sNum}`}
                    onPress={() => {
                      hapticLight();
                      setSets(sNum);
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isDark
                          ? (isSelected ? 'rgba(165, 153, 255, 0.16)' : '#1C1B24')
                          : (isSelected ? 'rgba(165, 153, 255, 0.12)' : '#F2F2F7'),
                        borderColor: isSelected ? (colors.accentPrimary || '#A599FF') : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? (colors.accentPrimary || '#A599FF') : (isDark ? '#D1D1D6' : '#3A3A3C'),
                          fontWeight: isSelected ? '700' : '600',
                        },
                      ]}
                    >
                      {sNum} Sets
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Target Reps Picker */}
            <Text style={[styles.sectionLabel, { color: isDark ? '#8E8E93' : '#636366', marginTop: 18 }]}>
              TARGET REPS
            </Text>
            <View style={styles.chipsRow}>
              {COMMON_REPS.map((rStr) => {
                const isSelected = reps === rStr;
                return (
                  <TouchableOpacity
                    key={`rep-${rStr}`}
                    onPress={() => {
                      hapticLight();
                      setReps(rStr);
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isDark
                          ? (isSelected ? 'rgba(165, 153, 255, 0.16)' : '#1C1B24')
                          : (isSelected ? 'rgba(165, 153, 255, 0.12)' : '#F2F2F7'),
                        borderColor: isSelected ? (colors.accentPrimary || '#A599FF') : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? (colors.accentPrimary || '#A599FF') : (isDark ? '#D1D1D6' : '#3A3A3C'),
                          fontWeight: isSelected ? '700' : '600',
                        },
                      ]}
                    >
                      {rStr} Reps
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Confirm Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleAdd}
              style={[
                styles.confirmBtn,
                { backgroundColor: colors.accentPrimary || '#A599FF' },
              ]}
            >
              <Ionicons name="add" size={20} color="#000000" style={{ marginRight: 6 }} />
              <Text style={styles.confirmBtnText}>
                Add to {days.find((d) => d.dayIndex === targetDayIndex)?.dayName}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A3A3C',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.bold,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 2,
  },
  daysList: {
    gap: 8,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  dayInfoLeft: {
    flex: 1,
  },
  dayNameText: {
    fontSize: 14.5,
    fontFamily: FONT_FAMILY.bold,
  },
  routineTitleText: {
    fontSize: 12.5,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.medium,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  confirmBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
  },
});
