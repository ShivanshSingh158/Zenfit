/**
 * ExerciseDetailModal.tsx — ZenTrack Mobile
 *
 * Full Screen / Sheet Inspection Modal for any Exercise.
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TactileButton } from '../../ui';
import BottomSheet from '../../ui/BottomSheet';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';
import { useLatestNonNull } from '../../../hooks/useLatestNonNull';
import ExerciseAnimationCard from './ExerciseAnimationCard';

interface ExerciseDetailModalProps {
  visible: boolean;
  onClose: () => void;
  exerciseName: string;
  onOpenYoutube?: () => void;
}

export function ExerciseDetailModal({
  visible,
  onClose,
  exerciseName,
  onOpenYoutube,
}: ExerciseDetailModalProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const insets = useSafeAreaInsets();
  const displayName = useLatestNonNull(exerciseName || null) || '';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      avoidKeyboard={false}
      noPadding={true}
    >
      <View
        style={[
          styles.sheet,
          {
            paddingBottom: Math.max(insets.bottom, SPACE.lg),
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {displayName}
          </Text>
          <TactileButton
            variant="custom"
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel="Close exercise details"
          >
            <X size={16} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
          </TactileButton>
        </View>

        <ScrollView
          style={{ flexShrink: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <ExerciseAnimationCard
            exerciseName={displayName}
            onOpenYoutube={onOpenYoutube}
            showInstructions={true}
          />
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

export default ExerciseDetailModal;

const makeStyles = (tokens: ThemeTokens) => StyleSheet.create({
  sheet: {
    width: '100%',
    maxHeight: '100%',
    flexShrink: 1,
    paddingTop: SPACE.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.lg + 4,
    paddingBottom: SPACE.md,
    borderBottomWidth: tokens.border.hairlineWidth,
    borderBottomColor: tokens.border.subtle,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.lg,
    color: tokens.text.primary,
    flex: 1,
    textTransform: 'capitalize',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.inner,
    backgroundColor: tokens.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACE.md,
  },
  scrollContent: {
    padding: SPACE.lg,
  },
});
