import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Activity } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { TactileButton } from '../ui/TactileButton';
import { AppIcon } from '../ui/AppIcon';

export interface MiniMannequinButtonProps {
  onPress: () => void;
  hasWorkedMuscles?: boolean;
  exercises?: Array<{
    name: string;
    muscle?: string;
    setsLog?: Array<{ completed?: boolean }>;
  }>;
}

/**
 * Lightweight Frame-0 muscle-summary trigger for ExerciseSelectorStrip.
 * Avoids importing 99 KB bodyPaths SVG geometry or rendering 36 inline SVG paths
 * during ActiveLogging entry; WhatThisSessionHitsSheet renders the full dual map lazily.
 */
export const MiniMannequinButton: React.FC<MiniMannequinButtonProps> = React.memo(
  ({ onPress, hasWorkedMuscles = false }) => {
    const { tokens } = useTheme();

    return (
      <TactileButton
        lightweight
        variant="custom"
        haptic="selection"
        onPress={onPress}
        style={[
          styles.pill,
          {
            borderRadius: tokens.radius.inner,
            backgroundColor: hasWorkedMuscles ? tokens.status.successDim : tokens.bg.elevated,
            borderColor: hasWorkedMuscles ? tokens.status.success : tokens.border.subtle,
          },
        ]}
        hitSlop={tokens.touch.hitSlop}
        accessibilityLabel="View muscles hit in this session"
      >
        <AppIcon
          icon={Activity}
          size={16}
          color={hasWorkedMuscles ? tokens.status.success : tokens.text.secondary}
        />
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: hasWorkedMuscles ? tokens.status.success : tokens.text.muted,
            },
          ]}
        />
      </TactileButton>
    );
  },
  (prev, next) =>
    prev.onPress === next.onPress &&
    Boolean(prev.hasWorkedMuscles) === Boolean(next.hasWorkedMuscles)
);

const styles = StyleSheet.create({
  pill: {
    width: 48,
    height: 36,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});

export default MiniMannequinButton;
