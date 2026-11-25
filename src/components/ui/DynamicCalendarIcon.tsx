import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export const DynamicCalendarIcon = memo(function DynamicCalendarIcon({
  size = 24,
  color,
  isFilled = false,
}: {
  size?: number;
  color: string;
  isFilled?: boolean;
}) {
  const { tokens } = useTheme();
  const day = new Date().getDate();
  const radius = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.42);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        borderWidth: tokens.icon.strokeWidth,
        borderColor: color,
        overflow: 'hidden',
        backgroundColor: isFilled ? color : 'transparent',
      }}
    >
      <View
        style={{
          width: '100%',
          height: Math.round(size * 0.26),
          backgroundColor: color,
        }}
      />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text
          maxFontSizeMultiplier={1.1}
          style={{
            fontSize,
            fontFamily: tokens.font.bold,
            fontVariant: ['tabular-nums'],
            color: isFilled ? tokens.accent.onPrimary : color,
            includeFontPadding: false,
          }}
        >
          {day}
        </Text>
      </View>
    </View>
  );
});

export default DynamicCalendarIcon;
