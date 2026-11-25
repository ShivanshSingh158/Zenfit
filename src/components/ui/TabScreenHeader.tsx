import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { FONT_FAMILY } from '../../theme/tokens';
import { NumericText } from './NumericText';

export const TAB_HEADER_METRICS = {
  paddingHorizontal: 14,
  paddingTop: 6,
  paddingBottom: 10,
  minHeight: 54,
  titleFontSize: 26,
  titleLineHeight: 30,
  titleLetterSpacing: -0.6,
  subtitleFontSize: 12.5,
  subtitleLineHeight: 16,
} as const;

export interface TabScreenHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  rightActions?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  allowTitleShrink?: boolean;
}

/**
 * TabScreenHeader — Shared display header locked to identical safe-area spacing,
 * typography, and action alignment across all five main navigation tabs.
 */
export function TabScreenHeader({
  title,
  subtitle,
  rightActions,
  style,
  allowTitleShrink = true,
}: TabScreenHeaderProps) {
  const { tokens } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftCol}>
        <Text
          style={[styles.title, { color: tokens.text.primary }]}
          numberOfLines={1}
          adjustsFontSizeToFit={allowTitleShrink}
          minimumFontScale={allowTitleShrink ? 0.82 : undefined}
        >
          {title}
        </Text>
        {subtitle !== undefined && subtitle !== null && subtitle !== '' ? (
          <NumericText
            style={[styles.subtitle, { color: tokens.text.secondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </NumericText>
        ) : null}
      </View>
      {rightActions ? <View style={styles.rightCol}>{rightActions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TAB_HEADER_METRICS.paddingHorizontal,
    paddingTop: TAB_HEADER_METRICS.paddingTop,
    paddingBottom: TAB_HEADER_METRICS.paddingBottom,
    minHeight: TAB_HEADER_METRICS.minHeight,
    gap: 10,
  },
  leftCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  title: {
    fontSize: TAB_HEADER_METRICS.titleFontSize,
    lineHeight: TAB_HEADER_METRICS.titleLineHeight,
    letterSpacing: TAB_HEADER_METRICS.titleLetterSpacing,
    fontFamily: FONT_FAMILY.bold,
    includeFontPadding: false,
  },
  subtitle: {
    fontSize: TAB_HEADER_METRICS.subtitleFontSize,
    lineHeight: TAB_HEADER_METRICS.subtitleLineHeight,
    fontFamily: FONT_FAMILY.medium,
    marginTop: 2,
    includeFontPadding: false,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
});

export default TabScreenHeader;
