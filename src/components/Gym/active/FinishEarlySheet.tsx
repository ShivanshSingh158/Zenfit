/**
 * FinishEarlySheet.tsx — ZenFit
 *
 * Finish Workout Early Confirmation Sheet (OpenGym Pattern):
 * Prompts the athlete when completing a workout session,
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
import { hapticMedium, hapticError } from '../../../utils/haptics';

export interface FinishEarlySheetProps {
  visible: boolean;
  uncheckedSetsCount: number;
  completedSetsCount?: number;
  onFinishAndSave: () => void;
  onDiscard: () => void;
  onClose: () => void;
}

export const FinishEarlySheet: React.FC<FinishEarlySheetProps> = ({
  visible,
  uncheckedSetsCount,
  completedSetsCount = 0,
  onFinishAndSave,
  onDiscard,
  onClose,
}) => {
  const isNothingLogged = completedSetsCount === 0 && uncheckedSetsCount > 0;
  const isAllDone = uncheckedSetsCount === 0;

  const title = isNothingLogged
    ? 'Nothing logged yet'
    : isAllDone
    ? 'Finish workout?'
    : 'Finish early?';

  const subtitle = isNothingLogged
    ? 'You haven’t checked off any sets. Finish the workout anyway?'
    : isAllDone
    ? 'All scheduled sets complete. Ready to record your session?'
    : `${uncheckedSetsCount} ${
        uncheckedSetsCount === 1 ? 'set' : 'sets'
      } still unchecked. Finish the workout now?`;

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

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* Action 1: Finish and save (Solid Green Badge + Green Text) */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              hapticMedium();
              onFinishAndSave();
            }}
            activeOpacity={0.8}
          >
            <View style={styles.iconBoxGreen}>
              <Ionicons name="flag-sharp" size={18} color="#000000" />
            </View>
            <Text style={styles.finishBtnText}>Finish and save</Text>
          </TouchableOpacity>

          {/* Action 2: Discard workout (Dark Red Badge + Red Text) */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              hapticError();
              onDiscard();
            }}
            activeOpacity={0.8}
          >
            <View style={styles.iconBoxRed}>
              <Ionicons name="trash-outline" size={18} color="#FF453A" />
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
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconBoxGreen: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#30D158',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxRed: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    color: '#30D158',
  },
  discardBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    color: '#FF453A',
  },
});
