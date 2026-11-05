/**
 * WorkoutNoteModal.tsx — ZenFit
 *
 * Glassmorphic Modal for adding or editing session notes and exercise notes
 * during an active workout session (OpenGym Pattern).
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILY } from '../../../theme/tokens';
import { hapticLight, hapticSuccess } from '../../../utils/haptics';

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
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    if (visible) {
      setNote(initialNote || '');
    }
  }, [visible, initialNote]);

  const handleSave = () => {
    hapticSuccess();
    onSave(note.trim());
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropPressable} onPress={onClose}>
          <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconBox}>
                <Ionicons name="document-text" size={18} color="#30D158" />
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Multiline Input */}
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder={placeholder}
              placeholderTextColor="#636366"
              multiline
              numberOfLines={4}
              maxLength={500}
              autoFocus
              textAlignVertical="top"
            />

            {/* Footer Actions */}
            <View style={styles.footer}>
              <Text style={styles.charCount}>{note.length}/500</Text>
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    hapticLight();
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default WorkoutNoteModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  backdropPressable: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  input: {
    backgroundColor: '#121214',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY.regular,
    fontSize: 15,
    minHeight: 110,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  charCount: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#636366',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelBtnText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 14,
    color: '#8E8E93',
  },
  saveBtn: {
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#30D158',
  },
  saveBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#000000',
  },
});

