/**
 * ExerciseMenuSheet.tsx — ZenFit
 *
 * Exercise Card Options Sheet (OpenGym Pattern):
 * Triggered by the '⋯' three-dots icon on the exercise card.
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
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILY } from '../../../theme/tokens';
import { hapticLight, hapticError, hapticSelection } from '../../../utils/haptics';

export interface ExerciseMenuSheetProps {
  visible: boolean;
  exerciseName: string;
  currentRestText?: string;
  exerciseNote?: string;
  onAddNote: () => void;
  onSwapExercise: () => void;
  onAddWarmupSet: () => void;
  onConfigureRestTimer: () => void;
  onViewHistory: () => void;
  onHowToDoIt?: () => void;
  onRemoveExercise: () => void;
  onClose: () => void;
}

export const ExerciseMenuSheet: React.FC<ExerciseMenuSheetProps> = ({
  visible,
  exerciseName,
  currentRestText = 'Default (1:30)',
  exerciseNote = '',
  onAddNote,
  onSwapExercise,
  onAddWarmupSet,
  onConfigureRestTimer,
  onViewHistory,
  onHowToDoIt,
  onRemoveExercise,
  onClose,
}) => {
  const [showMoreExpanded, setShowMoreExpanded] = useState(false);

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

          {/* Exercise Title Header */}
          <Text style={styles.exerciseTitle} numberOfLines={1}>
            {exerciseName}
          </Text>

          {/* Grouped Action List */}
          <View style={styles.groupedCard}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                hapticLight();
                onClose();
                onAddNote();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="document-text-outline" size={19} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>{exerciseNote ? 'Edit note' : 'Add note'}</Text>
                {exerciseNote ? (
                  <Text style={styles.subText} numberOfLines={1}>
                    {exerciseNote}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                hapticSelection();
                onClose();
                onSwapExercise();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="swap-horizontal" size={19} color="#FFFFFF" />
              </View>
              <Text style={styles.rowText}>Swap exercise</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                hapticLight();
                onClose();
                onAddWarmupSet();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="sunny-outline" size={19} color="#FFFFFF" />
              </View>
              <Text style={styles.rowText}>Add warm-up set</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                hapticSelection();
                onClose();
                onConfigureRestTimer();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="timer-outline" size={19} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>Rest timer</Text>
                <Text style={styles.subText}>{currentRestText}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                hapticLight();
                onClose();
                onViewHistory();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="time-outline" size={19} color="#FFFFFF" />
              </View>
              <Text style={styles.rowText}>History</Text>
            </TouchableOpacity>
          </View>

          {/* Grouped More Options */}
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
                  How to do it, Delete exercise...
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
                {onHowToDoIt && (
                  <>
                    <View style={styles.divider} />
                    <TouchableOpacity
                      style={styles.menuRow}
                      onPress={() => {
                        hapticLight();
                        onClose();
                        onHowToDoIt();
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.rowIcon}>
                        <Ionicons name="information-circle-outline" size={19} color="#FFFFFF" />
                      </View>
                      <Text style={styles.rowText}>How to do it</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>

          {/* Remove Exercise Row */}
          <TouchableOpacity
            style={styles.removeCard}
            onPress={() => {
              hapticError();
              onClose();
              onRemoveExercise();
            }}
            activeOpacity={0.7}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="trash-outline" size={19} color="#FF453A" />
            </View>
            <Text style={styles.removeText}>Remove exercise</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ExerciseMenuSheet;

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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
    borderWidth: 1,
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
  exerciseTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 14,
    paddingHorizontal: 4,
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
  removeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.15)',
  },
  removeText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 15.5,
    color: '#FF453A',
  },
});
