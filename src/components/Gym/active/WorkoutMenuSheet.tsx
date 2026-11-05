/**
 * WorkoutMenuSheet.tsx — ZenFit
 *
 * Top-Level Active Workout Session Options Sheet (OpenGym Pattern):
 * Triggered by the top-right '⋯' three-dots menu during an active workout.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILY } from '../../../theme/tokens';
import { hapticSelection, hapticLight } from '../../../utils/haptics';

export interface WorkoutMenuSheetProps {
  visible: boolean;
  restDurationText?: string;
  sessionNote?: string;
  onOpenWorkoutSettings: () => void;
  onAddExercise: () => void;
  onAddSessionNote?: () => void;
  onDiscardWorkout: () => void;
  onClose: () => void;
}

export const WorkoutMenuSheet: React.FC<WorkoutMenuSheetProps> = ({
  visible,
  restDurationText = '1:30 rest · Sound',
  sessionNote = '',
  onOpenWorkoutSettings,
  onAddExercise,
  onAddSessionNote,
  onDiscardWorkout,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [showMoreExpanded, setShowMoreExpanded] = useState(false);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          onPress={e => e.stopPropagation()}
        >
          <View style={styles.sheetHandle} />

          {/* Option 1: Workout Settings Card (Solid Green Icon Badge) */}
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
              <Ionicons name="settings-sharp" size={19} color="#000000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingsTitle}>Workout settings</Text>
              <Text style={styles.settingsSubtitle}>{restDurationText}</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color="#8E8E93" />
          </TouchableOpacity>

          {/* Option 2: Grouped Primary Actions */}
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
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.rowText}>Add exercise</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                hapticLight();
                onClose();
                onAddSessionNote?.();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="document-text-outline" size={19} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>
                  {sessionNote ? 'Edit session note' : 'Add session note'}
                </Text>
                {sessionNote ? (
                  <Text style={styles.subText} numberOfLines={1}>
                    {sessionNote}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          </View>

          {/* Option 3: More (Expandable Group) */}
          <View style={styles.groupedCard}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                hapticLight();
                setShowMoreExpanded(prev => !prev);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="ellipsis-horizontal" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>More</Text>
                <Text style={styles.subText} numberOfLines={1}>
                  Discard workout, Session options...
                </Text>
              </View>
              <Ionicons
                name={showMoreExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#8E8E93"
              />
            </TouchableOpacity>

            {showMoreExpanded && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.menuRow}
                  onPress={() => {
                    onClose();
                    onDiscardWorkout();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowIcon}>
                    <Ionicons name="trash-outline" size={18} color="#FF453A" />
                  </View>
                  <Text style={[styles.rowText, { color: '#FF453A' }]}>Discard workout</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default WorkoutMenuSheet;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#121214',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    width: '100%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  settingsIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#30D158',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    color: '#30D158',
  },
  settingsSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  groupedCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
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
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 15.5,
    color: '#FFFFFF',
  },
  subText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12.5,
    color: '#8E8E93',
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginLeft: 54,
  },
});
