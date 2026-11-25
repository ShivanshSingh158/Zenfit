import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native';
import BottomSheet from '../../ui/BottomSheet';
import { TactileButton } from '../../ui';
import { EQUIPMENT_OPTIONS, MUSCLE_GROUP_OPTIONS, EquipmentCategory } from '../../../utils/equipmentResolver';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONT_FAMILY, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';

export interface CustomExerciseItem {
  id: string;
  name: string;
  muscle: string;
  equipment: EquipmentCategory;
  isCustom: true;
  tier: 'A Tier';
}

interface CreateCustomExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (item: CustomExerciseItem) => void;
}

export const CreateCustomExerciseModal: React.FC<CreateCustomExerciseModalProps> = ({
  visible,
  onClose,
  onCreated,
}) => {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const [name, setName] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('Chest');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentCategory>('Dumbbell');

  const wasVisibleRef = useRef(false);
  useEffect(() => {
    const justOpened = visible && !wasVisibleRef.current;
    wasVisibleRef.current = visible;
    if (justOpened) {
      setName('');
      setSelectedMuscle('Chest');
      setSelectedEquipment('Dumbbell');
    }
  }, [visible]);

  const handleSave = () => {
    if (!name.trim()) return;
    const cleanName = name.trim();
    const newEx: CustomExerciseItem = {
      id: `custom_${Date.now()}`,
      name: cleanName,
      muscle: selectedMuscle,
      equipment: selectedEquipment,
      isCustom: true,
      tier: 'A Tier',
    };
    onCreated(newEx);
    setName('');
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      avoidKeyboard={true}
      noPadding={true}
      sheetBackgroundColor={tokens.bg.elevated}
    >
      <View style={styles.sheetContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TactileButton
            variant="custom"
            onPress={onClose}
            style={styles.headerActionBtn}
            hitSlop={TOUCH.hitSlop}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TactileButton>
          <Text style={styles.headerTitle}>New Custom Exercise</Text>
          <TactileButton
            variant="custom"
            haptic="success"
            onPress={handleSave}
            disabled={!name.trim()}
            style={[styles.headerActionBtn, !name.trim() && { opacity: 0.4 }]}
            hitSlop={TOUCH.hitSlop}
          >
            <Text style={styles.saveText}>Save</Text>
          </TactileButton>
        </View>

        <ScrollView
          style={{ flexShrink: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <Text style={styles.inputLabel}>EXERCISE TITLE</Text>
          <View style={styles.inputBox}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Pendulum Squat, Prime Chest Press"
              placeholderTextColor={tokens.text.muted}
              style={styles.textInput}
            />
          </View>

          <Text style={[styles.inputLabel, { marginTop: SPACE.lg }]}>EQUIPMENT TYPE</Text>
          <View style={styles.chipsRow}>
            {EQUIPMENT_OPTIONS.map((eq) => {
              const isSelected = selectedEquipment === eq.id;
              return (
                <TactileButton
                  key={eq.id}
                  variant="custom"
                  haptic="selection"
                  onPress={() => setSelectedEquipment(eq.id)}
                  style={[
                    styles.chip,
                    isSelected && styles.chipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}
                  >
                    {eq.label}
                  </Text>
                </TactileButton>
              );
            })}
          </View>

          <Text style={[styles.inputLabel, { marginTop: SPACE.lg }]}>PRIMARY TARGET MUSCLE</Text>
          <View style={styles.chipsRow}>
            {MUSCLE_GROUP_OPTIONS.map((m) => {
              const isSelected = selectedMuscle === m.id;
              return (
                <TactileButton
                  key={m.id}
                  variant="custom"
                  haptic="selection"
                  onPress={() => setSelectedMuscle(m.id)}
                  style={[
                    styles.chip,
                    isSelected && styles.chipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TactileButton>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </BottomSheet>
  );
};

const makeStyles = (tokens: ThemeTokens) => StyleSheet.create({
  sheetContainer: {
    maxHeight: '100%',
    flexShrink: 1,
    paddingBottom: SPACE.xl + SPACE.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.lg + 4,
    paddingVertical: SPACE.md,
    borderBottomWidth: tokens.border.hairlineWidth,
    borderBottomColor: tokens.border.subtle,
  },
  headerActionBtn: {
    minHeight: TOUCH.minTarget,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: tokens.fontSize.lg,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  cancelText: {
    fontSize: tokens.fontSize.base,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },
  saveText: {
    fontSize: tokens.fontSize.base,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.primary,
  },
  content: {
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.lg,
    paddingBottom: SPACE.lg + 4,
  },
  inputLabel: {
    fontSize: tokens.fontSize.xs,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.secondary,
    letterSpacing: 0.8,
    marginBottom: SPACE.sm,
    marginLeft: 2,
  },
  inputBox: {
    borderRadius: RADIUS.card,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
    backgroundColor: tokens.bg.surface,
    paddingHorizontal: SPACE.md + 2,
    height: TOUCH.minTarget,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: tokens.fontSize.md,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.primary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.sm,
  },
  chip: {
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.inner,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
    backgroundColor: tokens.bg.surface,
    minHeight: 38,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: tokens.accent.primaryDim,
    borderColor: tokens.accent.primary,
  },
  chipText: {
    fontSize: tokens.fontSize.sm,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },
  chipTextSelected: {
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.primary,
  },
});
