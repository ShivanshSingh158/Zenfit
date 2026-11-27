import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Plus, X } from 'lucide-react-native';
import BottomSheet from '../../ui/BottomSheet';
import { TactileButton } from '../../ui/TactileButton';
import { NumericText } from '../../ui/NumericText';
import { useGymPlan } from '../../../contexts/domains/WellnessContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { DARK_TOKENS, FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH } from '../../../theme/tokens';
import { hapticLight, hapticSuccess } from '../../../utils/haptics';
import { resolvePlanDay } from '../../../data/gymPlan';
import { GymPlanExercise, GymPlanDay } from '../../../types/gym.types';
import { useLatestNonNull } from '../../../hooks/useLatestNonNull';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface AddToDaySheetProps {
  visible: boolean;
  exercise: {
    id: string;
    name: string;
    muscle: string;
  } | null;
  initialDayIndex?: number;
  initialSets?: number;
  onClose: () => void;
  onSuccess: (dayName: string) => void;
}

const COMMON_SETS = [2, 3, 4, 5];
const COMMON_REPS = ['6–8', '8–12', '10–15', '12–20'];

export const AddToDaySheet: React.FC<AddToDaySheetProps> = ({
  visible,
  exercise,
  initialDayIndex,
  initialSets,
  onClose,
  onSuccess,
}) => {
  const { isDark, tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { userGymPlan, updateMasterPlan } = useGymPlan();

  const [targetDayIndex, setTargetDayIndex] = useState<number>(initialDayIndex || 1);
  const [sets, setSets] = useState<number>(initialSets || 3);
  const [reps, setReps] = useState<string>('8–12');
  const [restSecs] = useState<number>(90);

  React.useEffect(() => {
    if (visible) {
      if (initialDayIndex && initialDayIndex >= 1 && initialDayIndex <= 7) {
        setTargetDayIndex(initialDayIndex);
      }
      if (initialSets && initialSets > 0) {
        setSets(initialSets);
      }
    }
  }, [visible, initialDayIndex, initialSets]);

  // Resolve active plan days (1 to 7) across all templates
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dayIndex = i + 1;
      const resolvedDay: GymPlanDay = resolvePlanDay(userGymPlan, dayIndex);
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

  const activeExercise = useLatestNonNull(exercise);

  const handleAdd = async () => {
    if (!activeExercise) return;
    hapticSuccess();

    const selectedDayObj = days.find((d) => d.dayIndex === targetDayIndex);
    if (!selectedDayObj) return;

    const currentPlanDay = selectedDayObj.planDay;
    const newExercise: GymPlanExercise = {
      id: activeExercise.id || `ex_${Date.now()}`,
      name: activeExercise.name,
      targetSets: sets,
      targetReps: reps,
      muscle: activeExercise.muscle,
      restTimeSecs: restSecs,
    };

    const updatedPlanDay: GymPlanDay = {
      ...currentPlanDay,
      isRest: false, // adding an exercise turns it into an active day
      exercises: [...(currentPlanDay.exercises || []), newExercise],
    };

    await updateMasterPlan(targetDayIndex, updatedPlanDay, true);
    onSuccess(`${selectedDayObj.dayName} (${selectedDayObj.routineTitle})`);
    onClose();
  };

  if (!activeExercise) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      avoidKeyboard={true}
      noPadding={true}
    >
      <View
        style={[
          styles.sheetContainer,
          { width: '100%', borderRadius: 0, borderWidth: 0, backgroundColor: 'transparent' },
        ]}
      >
        {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: SPACE.sm }}>
              <Text style={[styles.headerTitle, { color: tokens.text.primary }]} numberOfLines={1}>
                Add to Weekly Split
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {activeExercise.name} · {activeExercise.muscle}
              </Text>
            </View>
            <TactileButton
              variant="icon"
              haptic="light"
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={TOUCH.hitSlop}
              accessibilityLabel="Close add to weekly split"
            >
              <X size={16} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
            </TactileButton>
          </View>

          <ScrollView
            style={{ flexShrink: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            nestedScrollEnabled
          >
            {/* Target Day Selector */}
            <Text style={[styles.sectionLabel, { color: tokens.text.secondary }]}>
              SELECT WORKOUT DAY
            </Text>
            <View
              style={{
                backgroundColor: isDark ? '#14161D' : tokens.bg.surface,
                borderRadius: RADIUS.lg,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: tokens.border.subtle,
                overflow: 'hidden',
              }}
            >
              {days.map((d, dIdx) => {
                const isSelected = targetDayIndex === d.dayIndex;
                const isLast = dIdx === days.length - 1;
                return (
                  <TactileButton
                    key={`day-opt-${d.dayIndex}`}
                    variant="custom"
                    haptic="none"
                    onPress={() => {
                      hapticLight();
                      setTargetDayIndex(d.dayIndex);
                    }}
                    style={[
                      styles.dayRow,
                      {
                        backgroundColor: isSelected ? tokens.accent.primaryDim : 'transparent',
                        borderWidth: 0,
                        borderRadius: 0,
                        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                        borderBottomColor: tokens.border.subtle,
                      },
                    ]}
                  >
                    <View style={styles.dayInfoLeft}>
                      <Text
                        style={[
                          styles.dayNameText,
                          {
                            color: isSelected ? tokens.accent.primary : tokens.text.primary,
                            fontFamily: isSelected ? FONT_FAMILY.bold : FONT_FAMILY.medium,
                          },
                        ]}
                      >
                        {d.dayName}
                      </Text>
                      <Text style={[styles.routineTitleText, { color: tokens.text.secondary }]}>
                        {d.routineTitle} {d.isRest ? '(Rest)' : ''}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected ? tokens.accent.primary : tokens.text.muted,
                          backgroundColor: isSelected ? tokens.accent.primary : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && <Check size={13} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} />}
                    </View>
                  </TactileButton>
                );
              })}
            </View>

            {/* Target Sets Picker */}
            <Text style={[styles.sectionLabel, { color: tokens.text.secondary, marginTop: 18 }]}>
              TARGET SETS
            </Text>
            <View style={styles.chipsRow}>
              {COMMON_SETS.map((sNum) => {
                const isSelected = sets === sNum;
                return (
                  <TactileButton
                    key={`set-${sNum}`}
                    variant="custom"
                    haptic="none"
                    onPress={() => {
                      hapticLight();
                      setSets(sNum);
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected
                          ? tokens.accent.primaryDim
                          : tokens.bg.elevated,
                        borderColor: isSelected ? tokens.accent.primary : 'transparent',
                      },
                    ]}
                  >
                    <NumericText
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? tokens.accent.primary : tokens.text.secondary,
                          fontFamily: isSelected ? FONT_FAMILY.bold : FONT_FAMILY.medium,
                        },
                      ]}
                    >
                      {sNum} Sets
                    </NumericText>
                  </TactileButton>
                );
              })}
            </View>

            {/* Target Reps Picker */}
            <Text style={[styles.sectionLabel, { color: tokens.text.secondary, marginTop: 18 }]}>
              TARGET REPS
            </Text>
            <View style={styles.chipsRow}>
              {COMMON_REPS.map((rStr) => {
                const isSelected = reps === rStr;
                return (
                  <TactileButton
                    key={`rep-${rStr}`}
                    variant="custom"
                    haptic="none"
                    onPress={() => {
                      hapticLight();
                      setReps(rStr);
                    }}
                    style={[
                      styles.repChip,
                      {
                        backgroundColor: isSelected
                          ? tokens.accent.primaryDim
                          : tokens.bg.elevated,
                        borderColor: isSelected ? tokens.accent.primary : 'transparent',
                      },
                    ]}
                  >
                    <NumericText
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? tokens.accent.primary : tokens.text.secondary,
                          fontFamily: isSelected ? FONT_FAMILY.bold : FONT_FAMILY.medium,
                        },
                      ]}
                    >
                      {rStr} Reps
                    </NumericText>
                  </TactileButton>
                );
              })}
            </View>
          </ScrollView>

          {/* Confirm Button */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACE.lg) }]}>
            <TactileButton
              variant="custom"
              haptic="none"
              onPress={handleAdd}
              style={styles.confirmBtn}
            >
              <Plus size={16} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} style={{ marginRight: 6 }} />
              <Text
                style={styles.confirmBtnText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                Add to {days.find((d) => d.dayIndex === targetDayIndex)?.dayName}
              </Text>
            </TactileButton>
          </View>
      </View>
    </BottomSheet>
  );
};

const makeStyles = (tokens: typeof DARK_TOKENS) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: tokens.bg.backdrop,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    maxHeight: '100%',
    flexShrink: 1,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.border.subtle,
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
    borderBottomColor: tokens.border.subtle,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.bold,
  },
  headerSubtitle: {
    fontSize: 13,
    color: tokens.text.secondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.lg,
    paddingBottom: SPACE.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.8,
    marginBottom: SPACE.sm,
    marginLeft: 2,
  },
  daysList: {
    gap: SPACE.sm,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: SPACE.md,
    borderRadius: RADIUS.lg,
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
    flexWrap: 'wrap',
    gap: SPACE.sm,
  },
  chip: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 0,
    minHeight: 36,
    paddingHorizontal: SPACE.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repChip: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 0,
    minHeight: 36,
    paddingHorizontal: SPACE.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.medium,
  },
  footer: {
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.md,
  },
  confirmBtn: {
    minHeight: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: tokens.accent.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: tokens.accent.onPrimary,
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
  },
});
