import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Switch,
  StyleSheet,
} from 'react-native';
import { Check, Minus, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet from '../../ui/BottomSheet';
import { NumericText, TactileButton } from '../../ui';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';
import { resolveExerciseTargetMuscle } from '../../../utils/gymUtils';
import { hapticLight, hapticSuccess } from '../../../utils/haptics';
import { useLatestNonNull } from '../../../hooks/useLatestNonNull';

export interface EditExercisePayload {
  id?: string;
  exerciseId?: string;
  name: string;
  muscle?: string;
  targetSets?: number;
  targetReps?: string;
  restTimeSecs?: number;
}

export interface EditExerciseUpdates {
  name: string;
  muscle: string;
  targetSets: number;
  targetReps: string;
  restTimeSecs: number;
  saveToPlan?: boolean;
}

export interface EditExerciseSheetProps {
  visible: boolean;
  exercise: EditExercisePayload | null;
  subtitle?: string;
  showSaveToPlanToggle?: boolean;
  defaultSaveToPlan?: boolean;
  onSave: (updates: EditExerciseUpdates) => void;
  onClose: () => void;
}

const REP_PRESETS = ['4-6', '6-8', '8-10', '10-12', '12-15', '15-20'];
const REST_PRESETS = [45, 60, 90, 120, 180];

export const EditExerciseSheet: React.FC<EditExerciseSheetProps> = ({
  visible,
  exercise,
  subtitle,
  showSaveToPlanToggle = false,
  defaultSaveToPlan = false,
  onSave,
  onClose,
}) => {
  const { tokens, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);
  const activeEx = useLatestNonNull(exercise);

  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('');
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState('8-10');
  const [isCustomReps, setIsCustomReps] = useState(false);
  const [customRepsInput, setCustomRepsInput] = useState('');
  const [restSecs, setRestSecs] = useState(90);
  const [saveToPlan, setSaveToPlan] = useState(defaultSaveToPlan);

  useEffect(() => {
    if (visible && exercise) {
      const cleanName = exercise.name || '';
      const resolvedMuscle =
        resolveExerciseTargetMuscle(cleanName, exercise.muscle).targetMuscle ||
        exercise.muscle ||
        'General';
      const normalizedReps = (exercise.targetReps || '8-10').trim().replace('–', '-');
      const matchesPreset = REP_PRESETS.includes(normalizedReps);

      setName(cleanName);
      setMuscle(resolvedMuscle);
      setSets(Math.max(1, Math.min(12, Number(exercise.targetSets) || 3)));
      setReps(matchesPreset ? normalizedReps : 'Custom');
      setIsCustomReps(!matchesPreset);
      setCustomRepsInput(normalizedReps);
      setRestSecs(Number(exercise.restTimeSecs) || 90);
      setSaveToPlan(defaultSaveToPlan);
    }
  }, [visible, exercise, defaultSaveToPlan]);

  if (!activeEx) return null;

  const handleSavePress = () => {
    hapticSuccess();
    const finalName = name.trim() || activeEx.name || 'Exercise';
    const finalMuscle =
      resolveExerciseTargetMuscle(finalName, muscle.trim()).targetMuscle ||
      muscle.trim() ||
      activeEx.muscle ||
      'General';
    const finalReps = isCustomReps
      ? customRepsInput.trim() || '8-10'
      : reps;

    onSave({
      name: finalName,
      muscle: finalMuscle,
      targetSets: sets,
      targetReps: finalReps,
      restTimeSecs: restSecs,
      saveToPlan: showSaveToPlanToggle ? saveToPlan : undefined,
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      noPadding
      avoidKeyboard
      sheetBackgroundColor={isDark ? '#0B0C10' : '#F8F8FA'}
    >
      <View style={styles.root}>
        {/* Top Action Bar */}
        <View style={styles.navBar}>
          <TactileButton
            variant="custom"
            haptic="light"
            onPress={onClose}
            style={styles.navCancelBtn}
            hitSlop={TOUCH.hitSlop}
          >
            <Text style={styles.navCancelText}>Cancel</Text>
          </TactileButton>

          <View style={styles.navTitleCol}>
            <Text style={styles.navTitle} numberOfLines={1}>
              Edit Exercise
            </Text>
            {subtitle ? (
              <Text style={styles.navSub} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <TactileButton
            variant="custom"
            haptic="medium"
            onPress={handleSavePress}
            style={styles.navSaveBtn}
          >
            <Text style={styles.navSaveText}>Save</Text>
          </TactileButton>
        </View>

        <ScrollView
          style={{ flexShrink: 1 }}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 16, 28) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {/* Identity Card */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>EXERCISE NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Incline Dumbbell Press"
              placeholderTextColor={tokens.text.muted}
              autoCapitalize="words"
            />

            <Text style={[styles.fieldLabel, { marginTop: SPACE.md }]}>TARGET MUSCLE</Text>
            <TextInput
              style={styles.input}
              value={muscle}
              onChangeText={setMuscle}
              placeholder="e.g. Upper Chest"
              placeholderTextColor={tokens.text.muted}
              autoCapitalize="words"
            />
          </View>

          {/* Prescription Card */}
          <View style={styles.card}>
            {/* Sets Stepper */}
            <View style={styles.stepperRow}>
              <Text style={styles.rowLabel}>Working Sets</Text>
              <View style={styles.stepperControl}>
                <TactileButton
                  variant="icon"
                  haptic="selection"
                  onPress={() => setSets((s) => Math.max(1, s - 1))}
                  style={styles.stepBtn}
                  accessibilityLabel="Decrease sets"
                >
                  <Minus size={14} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
                </TactileButton>
                <NumericText style={styles.stepVal}>{sets}</NumericText>
                <TactileButton
                  variant="icon"
                  haptic="selection"
                  onPress={() => setSets((s) => Math.min(12, s + 1))}
                  style={styles.stepBtn}
                  accessibilityLabel="Increase sets"
                >
                  <Plus size={14} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
                </TactileButton>
              </View>
            </View>

            <View style={styles.hairline} />

            {/* Rep Target Chips */}
            <Text style={styles.fieldLabel}>TARGET REPS</Text>
            <View style={styles.chipsWrap}>
              {REP_PRESETS.map((opt) => {
                const selected = !isCustomReps && reps === opt;
                return (
                  <TactileButton
                    key={opt}
                    variant="custom"
                    haptic="light"
                    onPress={() => {
                      setIsCustomReps(false);
                      setReps(opt);
                    }}
                    style={[styles.chip, selected && styles.chipActive]}
                  >
                    {selected ? (
                      <Check size={11} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} />
                    ) : null}
                    <NumericText style={[styles.chipText, selected && styles.chipTextActive]}>
                      {opt}
                    </NumericText>
                  </TactileButton>
                );
              })}
              <TactileButton
                variant="custom"
                haptic="light"
                onPress={() => {
                  setIsCustomReps(true);
                  setReps('Custom');
                }}
                style={[styles.chip, isCustomReps && styles.chipActive]}
              >
                <Text style={[styles.chipText, isCustomReps && styles.chipTextActive]}>
                  Custom
                </Text>
              </TactileButton>
            </View>

            {isCustomReps && (
              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                value={customRepsInput}
                onChangeText={setCustomRepsInput}
                placeholder="e.g. 5-8 or 20+"
                placeholderTextColor={tokens.text.muted}
              />
            )}

            <View style={styles.hairline} />

            {/* Rest Presets */}
            <Text style={styles.fieldLabel}>DEFAULT REST</Text>
            <View style={styles.chipsWrap}>
              {REST_PRESETS.map((secs) => {
                const selected = restSecs === secs;
                const label = secs >= 60 && secs % 60 === 0
                  ? `${secs / 60}m`
                  : `${secs}s`;
                return (
                  <TactileButton
                    key={secs}
                    variant="custom"
                    haptic="light"
                    onPress={() => setRestSecs(secs)}
                    style={[styles.chip, selected && styles.chipActive]}
                  >
                    <NumericText style={[styles.chipText, selected && styles.chipTextActive]}>
                      {label}
                    </NumericText>
                  </TactileButton>
                );
              })}
            </View>
          </View>

          {showSaveToPlanToggle && (
            <View style={styles.toggleCard}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.toggleTitle}>Save to weekly plan</Text>
                <Text style={styles.toggleSub}>
                  Keep these targets for future sessions on this workout day
                </Text>
              </View>
              <Switch
                value={saveToPlan}
                onValueChange={(val) => {
                  hapticLight();
                  setSaveToPlan(val);
                }}
                trackColor={{
                  false: isDark ? '#181B24' : tokens.bg.elevated,
                  true: tokens.accent.primary,
                }}
                thumbColor={tokens.text.primary}
              />
            </View>
          )}
        </ScrollView>
      </View>
    </BottomSheet>
  );
};

const makeStyles = (tokens: ThemeTokens, isDark: boolean) => {
  const cardBg = isDark ? '#14161D' : '#FFFFFF';
  const inputBg = isDark ? '#0B0C10' : '#F2F3F7';

  return StyleSheet.create({
    root: {
      width: '100%',
      maxHeight: '100%',
      flexShrink: 1,
    },
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: SPACE.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: tokens.border.subtle,
    },
    navCancelBtn: {
      minHeight: TOUCH.minTarget,
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    navCancelText: {
      fontSize: 15,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.secondary,
    },
    navTitleCol: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    navTitle: {
      fontSize: 16,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.primary,
    },
    navSub: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.accent.primary,
      marginTop: 1,
    },
    navSaveBtn: {
      backgroundColor: tokens.accent.primary,
      minHeight: 32,
      paddingHorizontal: 14,
      borderRadius: RADIUS.inner,
      justifyContent: 'center',
    },
    navSaveText: {
      fontSize: 13,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.accent.onPrimary,
    },
    scrollContent: {
      padding: 14,
      gap: 12,
    },
    card: {
      backgroundColor: cardBg,
      borderRadius: RADIUS.card,
      padding: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.border.subtle,
    },
    fieldLabel: {
      fontSize: 10.5,
      fontFamily: FONT_FAMILY.bold,
      letterSpacing: 0.6,
      color: tokens.text.secondary,
      marginBottom: 6,
    },
    input: {
      backgroundColor: inputBg,
      borderRadius: RADIUS.inner,
      paddingHorizontal: SPACE.md,
      paddingVertical: 10,
      fontSize: 15,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.primary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.border.subtle,
    },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowLabel: {
      fontSize: 14,
      fontFamily: FONT_FAMILY.semibold,
      color: tokens.text.primary,
    },
    stepperControl: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: inputBg,
      borderRadius: RADIUS.inner,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.border.subtle,
      paddingHorizontal: 4,
      height: 36,
      gap: 10,
    },
    stepBtn: {
      width: 30,
      height: 30,
      borderRadius: RADIUS.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepVal: {
      fontSize: 15,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.primary,
      minWidth: 22,
      textAlign: 'center',
    },
    hairline: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: tokens.border.subtle,
      marginVertical: 14,
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: inputBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.border.subtle,
      borderRadius: RADIUS.inner,
      paddingHorizontal: 12,
      minHeight: 32,
    },
    chipActive: {
      backgroundColor: tokens.accent.primary,
      borderColor: tokens.accent.primary,
    },
    chipText: {
      fontSize: 13,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.secondary,
    },
    chipTextActive: {
      color: tokens.accent.onPrimary,
      fontFamily: FONT_FAMILY.bold,
    },
    toggleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: cardBg,
      borderRadius: RADIUS.card,
      padding: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.border.subtle,
    },
    toggleTitle: {
      fontSize: 14,
      fontFamily: FONT_FAMILY.semibold,
      color: tokens.text.primary,
    },
    toggleSub: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.body,
      color: tokens.text.secondary,
      marginTop: 2,
      lineHeight: 16,
    },
  });
};

export default EditExerciseSheet;
