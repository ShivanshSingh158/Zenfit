/**
 * WorkoutMenuSheet.tsx — ZenFit
 *
 * Top-Level Active Workout Session Options Sheet (OpenGym v1.4 Pattern):
 * Triggered by the top-right '⋯' three-dots menu during an active workout.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILY } from '../../../theme/tokens';
import { hapticSelection, hapticLight } from '../../../utils/haptics';

export interface WorkoutMenuSheetProps {
  visible: boolean;
  restDurationText?: string;
  onOpenWorkoutSettings: () => void;
  onAddExercise: () => void;
  onAddSessionNote: () => void;
  onDiscardWorkout: () => void;
  onClose: () => void;
}

export const WorkoutMenuSheet: React.FC<WorkoutMenuSheetProps> = ({
  visible,
  restDurationText = '1:30 rest · Sound cues on',
  onOpenWorkoutSettings,
  onAddExercise,
  onAddSessionNote,
  onDiscardWorkout,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.sheetHandle} />

          {/* Option 1: Workout Settings Card (Green Highlight) */}
          <TouchableOpacity
            style={styles.settingsCard}
            onPress={() => {
              hapticSelection();
              onClose();
              onOpenWorkoutSettings();
            }}
            activeOpacity={0.8}
          >
            <View style={styles.settingsIconBox}>
              <Ionicons name="settings-sharp" size={17} color="#30D158" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingsTitle}>Workout settings</Text>
              <Text style={styles.settingsSubtitle}>{restDurationText}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </TouchableOpacity>

          {/* Grouped Actions Box */}
          <View style={styles.groupedCard}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                hapticLight();
                onClose();
                onAddExercise();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.rowText}>Add exercise</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                hapticLight();
                onClose();
                onAddSessionNote();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.rowText}>Add session note</Text>
            </TouchableOpacity>
          </View>

          {/* Discard Workout */}
          <TouchableOpacity
            style={styles.discardRow}
            onPress={() => {
              onClose();
              onDiscardWorkout();
            }}
            activeOpacity={0.7}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="trash-outline" size={18} color="#FF453A" />
            </View>
            <Text style={styles.discardText}>Discard workout</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default WorkoutMenuSheet;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#121214',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.25)',
  },
  settingsIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14.5,
    color: '#30D158',
  },
  settingsSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8E8E93',
    marginTop: 1,
  },
  groupedCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowIcon: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginLeft: 50,
  },
  discardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.2)',
  },
  discardText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14.5,
    color: '#FF453A',
  },
});
