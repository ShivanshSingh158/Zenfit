import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface NumericTextProps extends TextProps {
  children: React.ReactNode;
}

/**
 * NumericText — Enforces `fontVariant: ['tabular-nums']` and bounded `maxFontSizeMultiplier={1.25}`
 * so timers, weights, reps, set badges, and volume counters stay accessible without breaking HUD alignment.
 */
export const NumericText: React.FC<NumericTextProps> = ({
  style,
  children,
  maxFontSizeMultiplier = 1.25,
  ...rest
}) => {
  const { tokens } = useTheme();

  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        {
          fontFamily: tokens.font.bold,
          color: tokens.text.primary,
          fontVariant: ['tabular-nums'],
          includeFontPadding: false,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};

export default NumericText;
