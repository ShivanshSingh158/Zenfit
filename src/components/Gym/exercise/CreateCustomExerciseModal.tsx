import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EQUIPMENT_OPTIONS, MUSCLE_GROUP_OPTIONS, EquipmentCategory } from '../../../utils/equipmentResolver';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONT_FAMILY } from '../../../theme/tokens';
import { hapticLight, hapticSuccess } from '../../../utils/haptics';

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
  const { colors, isDark } = useTheme();
  const [name, setName] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('Chest');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentCategory>('Dumbbell');

  const handleSave = () => {
    if (!name.trim()) return;
    hapticSuccess();
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <Pressable
            style={[
              styles.sheetContainer,
              { backgroundColor: isDark ? '#121217' : '#FFFFFF' },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Grab handle */}
            <View style={styles.handleBar} />

            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose}>
                <Text style={[styles.cancelText, { color: isDark ? '#8E8E93' : '#636366' }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}>
                New Custom Exercise
              </Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={!name.trim()}
                style={{ opacity: name.trim() ? 1 : 0.4 }}
              >
                <Text style={[styles.saveText, { color: colors.accentPrimary || '#A599FF' }]}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              {/* Exercise Name Input */}
              <Text style={[styles.inputLabel, { color: isDark ? '#8E8E93' : '#636366' }]}>
                EXERCISE TITLE
              </Text>
              <View
                style={[
                  styles.inputBox,
                  {
                    backgroundColor: isDark ? '#1C1B24' : '#F2F2F7',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  },
                ]}
              >
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Pendulum Squat, Prime Chest Press"
                  placeholderTextColor={isDark ? '#636366' : '#8E8E93'}
                  style={[styles.textInput, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}
                  autoFocus
                />
              </View>

              {/* Equipment Picker */}
              <Text style={[styles.inputLabel, { color: isDark ? '#8E8E93' : '#636366', marginTop: 18 }]}>
                EQUIPMENT TYPE
              </Text>
              <View style={styles.chipsRow}>
                {EQUIPMENT_OPTIONS.map((eq) => {
                  const isSelected = selectedEquipment === eq.id;
                  return (
                    <TouchableOpacity
                      key={eq.id}
                      onPress={() => {
                        hapticLight();
                        setSelectedEquipment(eq.id);
                      }}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isDark
                            ? (isSelected ? 'rgba(165, 153, 255, 0.16)' : '#1C1B24')
                            : (isSelected ? 'rgba(165, 153, 255, 0.12)' : '#F2F2F7'),
                          borderColor: isSelected
                            ? (colors.accentPrimary || '#A599FF')
                            : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'transparent'),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected ? (colors.accentPrimary || '#A599FF') : (isDark ? '#D1D1D6' : '#3A3A3C'),
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {eq.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Muscle Group Picker */}
              <Text style={[styles.inputLabel, { color: isDark ? '#8E8E93' : '#636366', marginTop: 18 }]}>
                PRIMARY TARGET MUSCLE
              </Text>
              <View style={styles.chipsRow}>
                {MUSCLE_GROUP_OPTIONS.map((m) => {
                  const isSelected = selectedMuscle === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => {
                        hapticLight();
                        setSelectedMuscle(m.id);
                      }}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isDark
                            ? (isSelected ? 'rgba(165, 153, 255, 0.16)' : '#1C1B24')
                            : (isSelected ? 'rgba(165, 153, 255, 0.12)' : '#F2F2F7'),
                          borderColor: isSelected
                            ? (colors.accentPrimary || '#A599FF')
                            : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'transparent'),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected ? (colors.accentPrimary || '#A599FF') : (isDark ? '#D1D1D6' : '#3A3A3C'),
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
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
  keyboardAvoid: {
    width: '100%',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 28,
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
  cancelText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.medium,
  },
  saveText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 2,
  },
  inputBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.medium,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.2,
  },
  chipText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.medium,
  },
});
