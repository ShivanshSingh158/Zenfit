import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, InteractionManager } from 'react-native';
import { FileText, X } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { hapticSuccess } from '../../utils/haptics';
import BottomSheet from '../ui/BottomSheet';
import { TactileButton } from '../ui/TactileButton';
import { NumericText } from '../ui/NumericText';
import { AppIcon } from '../ui/AppIcon';

export interface WorkoutNoteModalProps {
  visible: boolean;
  title: string;
  initialNote?: string;
  placeholder?: string;
  onSave: (note: string) => void;
  onClose: () => void;
}

export const WorkoutNoteModal: React.FC<WorkoutNoteModalProps> = ({
  visible,
  title,
  initialNote = '',
  placeholder = 'Add notes, cues, machine settings, or how it felt...',
  onSave,
  onClose,
}) => {
  const { tokens, isDark } = useTheme();
  const [note, setNote] = useState(initialNote);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setNote(initialNote || '');
      let interactionTask: { cancel: () => void } | null = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      interactionTask = InteractionManager.runAfterInteractions(() => {
        timeoutId = setTimeout(() => {
          inputRef.current?.focus();
        }, 140);
      });
      return () => {
        interactionTask?.cancel?.();
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
  }, [visible, initialNote]);

  const handleSave = () => {
    hapticSuccess();
    onSave(note.trim());
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      avoidKeyboard
      sheetBackgroundColor={isDark ? '#0B0C10' : '#F8F8FA'}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: tokens.accent.primaryDim,
                borderRadius: tokens.radius.inner,
              },
            ]}
          >
            <AppIcon icon={FileText} size={18} color={tokens.accent.primary} />
          </View>
          <Text
            style={[
              tokens.typography.title,
              { flex: 1, color: tokens.text.primary },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <TactileButton
            variant="icon"
            size="sm"
            onPress={onClose}
            accessibilityLabel="Close note editor"
          >
            <AppIcon icon={X} size={16} color={tokens.text.secondary} />
          </TactileButton>
        </View>

        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: isDark ? '#14161D' : '#FFFFFF',
              borderRadius: tokens.radius.inner,
              color: tokens.text.primary,
              fontFamily: tokens.font.regular,
              borderColor: tokens.border.subtle,
            },
          ]}
          value={note}
          onChangeText={setNote}
          placeholder={placeholder}
          placeholderTextColor={tokens.text.muted}
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
        />

        <View style={styles.footer}>
          <NumericText style={{ fontSize: 12, color: tokens.text.secondary }}>
            {note.length}/500
          </NumericText>
          <View style={styles.btnRow}>
            <TactileButton variant="secondary" onPress={onClose}>
              <Text style={[tokens.typography.label, { color: tokens.text.secondary }]}>
                Cancel
              </Text>
            </TactileButton>

            <TactileButton variant="primary" haptic="success" onPress={handleSave}>
              <Text style={[tokens.typography.label, { fontFamily: tokens.font.bold, color: tokens.accent.onPrimary }]}>
                Save
              </Text>
            </TactileButton>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    padding: 14,
    fontSize: 15,
    minHeight: 112,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
});

export default WorkoutNoteModal;
