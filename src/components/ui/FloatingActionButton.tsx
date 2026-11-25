import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Plus, LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SHADOW } from '../../theme/tokens';
import { TactileButton } from './TactileButton';
import { AppIcon } from './AppIcon';

interface FABProps {
  icon?: LucideIcon;
  onPress: () => void;
  color?: string;
  style?: ViewStyle;
  size?: number;
  accessibilityLabel?: string;
}

/**
 * FloatingActionButton — Reanimated UI-thread tactile FAB with Lucide strokeWidth=2.
 */
export default function FloatingActionButton({
  icon = Plus,
  onPress,
  color,
  style,
  size = 56,
  accessibilityLabel = 'Action button',
}: FABProps) {
  const { tokens } = useTheme();
  const resolvedSize = Math.max(tokens.touch.minTarget, size);
  const resolvedBg = color ?? tokens.accent.primary;
  const resolvedIconColor =
    resolvedBg === tokens.accent.primary
      ? tokens.accent.onPrimary
      : tokens.text.primary;

  return (
    <TactileButton
      variant="custom"
      onPress={onPress}
      haptic="medium"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.container,
        {
          width: resolvedSize,
          height: resolvedSize,
          borderRadius: resolvedSize / 2,
          backgroundColor: resolvedBg,
          borderColor: tokens.border.subtle,
        },
        SHADOW.accent(resolvedBg),
        style,
      ]}
    >
      <AppIcon
        icon={icon}
        size={Math.round(resolvedSize * 0.44)}
        color={resolvedIconColor}
      />
    </TactileButton>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
