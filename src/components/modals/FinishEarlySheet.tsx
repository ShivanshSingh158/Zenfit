import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flag, Trash2, Dumbbell } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { hapticMedium, hapticError, hapticLight } from '../../utils/haptics';
import { AppBottomSheet } from '../ui/AppBottomSheet';
import { TactileButton } from '../ui/TactileButton';
import { AppIcon } from '../ui/AppIcon';

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
  const insets = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const submittingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      submittingRef.current = false;
    }
  }, [visible]);
  const cardBg = isDark ? '#14161D' : '#FFFFFF';
  const pillBg = isDark ? '#181B24' : tokens.bg.elevated;
  const isNothingLogged = completedSetsCount === 0 && uncheckedSetsCount > 0;
  const isAllDone = uncheckedSetsCount === 0;

  const title = isNothingLogged
    ? 'No sets checked yet'
    : isAllDone
    ? 'Finish workout?'
    : 'Finish early?';

  const subtitle = isNothingLogged
    ? 'No working sets were logged. Save a quick check-in or discard this session.'
    : isAllDone
    ? 'All scheduled sets complete. Ready to save your session?'
    : `${uncheckedSetsCount} ${
        uncheckedSetsCount === 1 ? 'set' : 'sets'
      } still unchecked. Save what you completed?`;

  return (
    <AppBottomSheet visible={visible} onClose={onClose} noPadding>
      <View
        style={{
          paddingHorizontal: tokens.space.lg,
          paddingBottom: Math.max(insets.bottom, tokens.space.xl),
          paddingTop: tokens.space.sm,
        }}
      >
        <Text
          style={[
            tokens.typography.h2,
            styles.title,
            { color: tokens.text.primary },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            tokens.typography.body,
            styles.subtitle,
            { color: tokens.text.secondary },
          ]}
        >
          {subtitle}
        </Text>

        {/* Action 1: Finish / Check-in and save */}
        <TactileButton
          variant="custom"
          haptic="medium"
          onPress={() => {
            if (submittingRef.current) return;
            submittingRef.current = true;
            onFinishAndSave();
          }}
          style={[
            styles.actionCard,
            {
              backgroundColor: cardBg,
              borderRadius: tokens.radius.card,
              padding: tokens.space.md,
              borderColor: tokens.border.subtle,
            },
          ]}
        >
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: tokens.accent.primary,
                borderRadius: tokens.radius.inner,
              },
            ]}
          >
            <AppIcon icon={Flag} size={18} color={tokens.accent.onPrimary} />
          </View>
          <Text
            style={[
              tokens.typography.title,
              { color: tokens.accent.primary },
            ]}
          >
            {isNothingLogged ? 'Save check-in' : 'Finish and save'}
          </Text>
        </TactileButton>

        {/* Action 2: Discard workout */}
        <TactileButton
          variant="custom"
          haptic="medium"
          onPress={() => {
            if (submittingRef.current) return;
            submittingRef.current = true;
            onDiscard();
          }}
          style={[
            styles.actionCard,
            {
              backgroundColor: cardBg,
              borderRadius: tokens.radius.card,
              padding: tokens.space.md,
              borderColor: tokens.border.subtle,
            },
          ]}
        >
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: tokens.accent.crimsonDim,
                borderRadius: tokens.radius.inner,
              },
            ]}
          >
            <AppIcon icon={Trash2} size={18} color={tokens.accent.crimson} />
          </View>
          <Text
            style={[
              tokens.typography.title,
              { color: tokens.accent.crimson },
            ]}
          >
            Discard workout
          </Text>
        </TactileButton>

        {/* Action 3: Continue workout */}
        <TactileButton
          variant="custom"
          onPress={() => {
            hapticLight();
            onClose();
          }}
          style={[
            styles.actionCard,
            {
              backgroundColor: cardBg,
              borderRadius: tokens.radius.card,
              padding: tokens.space.md,
              borderColor: tokens.border.subtle,
              marginBottom: 0,
            },
          ]}
        >
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: pillBg,
                borderRadius: tokens.radius.inner,
              },
            ]}
          >
            <AppIcon icon={Dumbbell} size={18} color={tokens.text.primary} />
          </View>
          <Text
            style={[
              tokens.typography.title,
              { color: tokens.text.primary },
            ]}
          >
            Continue workout
          </Text>
        </TactileButton>
      </View>
    </AppBottomSheet>
  );
};

const styles = StyleSheet.create({
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FinishEarlySheet;
