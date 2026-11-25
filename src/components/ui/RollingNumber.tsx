import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { NumericText } from './NumericText';

export interface RollingNumberProps {
  /** Number or pre-formatted string (e.g. "6.5k kg", "+12%", "75.4") */
  value: string | number;
  /** Increment to force a fresh visual update on explicit data changes */
  replayKey?: number | string;
  /** Legacy animation prop kept for API compatibility */
  cycles?: 0 | 1;
  /** Legacy animation prop kept for API compatibility */
  staggerMs?: number;
  /** Legacy animation prop kept for API compatibility */
  durationMs?: number;
  /** Optional prefix / suffix rendered cleanly alongside number */
  prefix?: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  numberOfLines?: number;
}

/**
 * RollingNumber — Single-node tabular numeric display (replaces 11-Text per-digit reel stacks
 * and tab-switch Reanimated worklet listeners for 120fps instant tab transitions).
 */
export const RollingNumber: React.FC<RollingNumberProps> = React.memo(
  function RollingNumber({
    value,
    prefix = '',
    suffix = '',
    style,
    containerStyle,
    numberOfLines = 1,
  }) {
    const { tokens } = useTheme();
    const rawStr = `${prefix}${value ?? ''}${suffix}`;

    const resolvedTextStyle = useMemo<TextStyle>(() => {
      const flat = (StyleSheet.flatten(style) || {}) as TextStyle;
      return {
        fontFamily: tokens.font.bold,
        color: tokens.text.primary,
        ...flat,
        fontVariant: ['tabular-nums'],
        includeFontPadding: false,
      };
    }, [style, tokens.font.bold, tokens.text.primary]);

    if (containerStyle) {
      return (
        <View style={[styles.row, containerStyle]}>
          <NumericText
            accessible
            accessibilityLabel={rawStr}
            numberOfLines={numberOfLines}
            style={resolvedTextStyle}
          >
            {rawStr}
          </NumericText>
        </View>
      );
    }

    return (
      <NumericText
        accessible
        accessibilityLabel={rawStr}
        numberOfLines={numberOfLines}
        style={resolvedTextStyle}
      >
        {rawStr}
      </NumericText>
    );
  }
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default RollingNumber;
