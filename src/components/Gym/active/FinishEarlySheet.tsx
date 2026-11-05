/**
 * FinishEarlySheet.tsx — ZenFit
 *
 * Finish Workout Early Confirmation Sheet (OpenGym Pattern):
 * Prompts the athlete when completing a workout session with unlogged sets,
 * offering explicit 'Finish and save' and 'Discard workout' actions.
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
import { hapticMedium, hapticError, hapticLight } from '../../../utils/haptics';

export interface FinishEarlySheetProps {
  visible: boolean;
  uncheckedSetsCount: number;
  onFinishAndSave: () => void;
  onDiscard: () => void;
  onClose: () => void;
}

export const FinishEarlySheet: React.FC<FinishEarlySheetProps> = ({
  visible,
  uncheckedSetsCount,
  onFinishAndSave,
  onDiscard,
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
          {/* Sheet Handle */}
          <View style={styles.sheetHandle} />

          <Text style={styles.title}>
            {uncheckedSetsCount > 0 ? 'Finish early?' : 'Finish workout?'}
          </Text>

          <Text style={styles.subtitle}>
            {uncheckedSetsCount > 0
              ? `${uncheckedSetsCount} ${
                  uncheckedSetsCount === 1 ? 'set' : 'sets'
                } still unchecked. Finish the workout now?`
              : 'All scheduled sets complete. Ready to record your session?'}
          </Text>

          {/* Action 1: Finish and save (Green) */}
          <TouchableOpacity
            style={styles.finishBtn}
            onPress={() => {
              hapticMedium();
              onFinishAndSave();
            }}
            activeOpacity={0.8}
          >
            <View style={styles.iconBoxGreen}>
              <Ionicons name="flag" size={16} color="#30D158" />
            </View>
            <Text style={styles.finishBtnText}>Finish and save</Text>
          </TouchableOpacity>

          {/* Action 2: Discard workout (Red) */}
          <TouchableOpacity
            style={styles.discardBtn}
            onPress={() => {
              hapticError();
              onDiscard();
            }}
            activeOpacity={0.8}
          >
            <View style={styles.iconBoxRed}>
              <Ionicons name="trash-outline" size={16} color="#FF453A" />
            </View>
            <Text style={styles.discardBtnText}>Discard workout</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default FinishEarlySheet;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
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
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13.5,
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 20,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.25)',
  },
  iconBoxGreen: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: '#30D158',
  },
  discardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.25)',
  },
  iconBoxRed: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: '#FF453A',
  },
});
