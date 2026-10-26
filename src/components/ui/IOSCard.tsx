import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { IOS_DARK, FONT_FAMILY } from '../../theme/tokens';

export interface IOSCardProps {
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  noPadding?: boolean;
  onPress?: () => void;
  testID?: string;
}

/**
 * IOSCard — Universal Apple Inset Grouped Card
 *
 * Implements Apple HIG specification:
 * - 0px outer border on OLED canvas
 * - #1C1C1E grouped surface in dark mode
 * - 16px corner radius
 * - Clean uppercase section title & subtitle hierarchy
 */
export const IOSCard: React.FC<IOSCardProps> = ({
  title,
  subtitle,
  headerRight,
  children,
  style,
  contentStyle,
  noPadding = false,
  onPress,
  testID,
}) => {
  const { colors, isDark } = useTheme();

  const cardBackground = isDark ? IOS_DARK.bgGroupedCard : colors.surface;
  const hasHeader = Boolean(title || subtitle || headerRight);

  const cardContent = (
    <View
      testID={testID}
      style={[
        styles.card,
        { backgroundColor: cardBackground },
        noPadding && styles.cardNoPadding,
        style,
      ]}
    >
      {hasHeader && (
        <View style={[styles.header, noPadding && styles.headerWithPadding]}>
          <View style={styles.headerLeft}>
            {Boolean(title) && (
              <Text
                style={[
                  styles.title,
                  { color: isDark ? IOS_DARK.labelSecondary : colors.textTertiary },
                ]}
              >
                {title}
              </Text>
            )}
            {Boolean(subtitle) && (
              <Text
                style={[
                  styles.subtitle,
                  { color: isDark ? IOS_DARK.labelTertiary : colors.textMuted },
                ]}
              >
                {subtitle}
              </Text>
            )}
          </View>
          {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
        </View>
      )}

      <View style={[styles.content, noPadding && styles.contentNoPadding, contentStyle]}>
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={styles.touchableWrapper}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  touchableWrapper: {
    width: '100%',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 0, // Apple HIG: Zero outer borders on cards
    overflow: 'hidden',
  },
  cardNoPadding: {
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerWithPadding: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 2,
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.body,
    marginTop: 1,
  },
  headerRight: {
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flexShrink: 0,
  },
  contentNoPadding: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});

export default IOSCard;
