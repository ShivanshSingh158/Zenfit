import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { TactileButton } from './TactileButton';

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
 * IOSCard — Concentric OLED Card (16px radius, 12px padding, subtle 1px border).
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
  const { tokens } = useTheme();
  const hasHeader = Boolean(title || subtitle || headerRight);

  const cardContent = (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: tokens.bg.surface,
          borderRadius: tokens.radius.card,
          padding: noPadding ? 0 : tokens.space.md,
          borderWidth: tokens.border.hairlineWidth,
          borderColor: tokens.border.subtle,
        },
        style,
      ]}
    >
      {hasHeader && (
        <View
          style={[
            styles.header,
            { marginBottom: tokens.space.md },
            noPadding && {
              paddingHorizontal: tokens.space.md,
              paddingTop: tokens.space.md,
              paddingBottom: tokens.space.xs,
              marginBottom: tokens.space.sm,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            {Boolean(title) && (
              <Text
                style={[
                  tokens.typography.overline,
                  { color: tokens.text.secondary },
                ]}
              >
                {title}
              </Text>
            )}
            {Boolean(subtitle) && (
              <Text
                style={[
                  tokens.typography.caption,
                  { color: tokens.text.muted, marginTop: 2 },
                ]}
              >
                {subtitle}
              </Text>
            )}
          </View>
          {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
        </View>
      )}

      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );

  if (onPress) {
    return (
      <TactileButton
        variant="custom"
        scaleTo={0.98}
        onPress={onPress}
        style={styles.touchableWrapper}
      >
        {cardContent}
      </TactileButton>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  touchableWrapper: {
    width: '100%',
  },
  card: {
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  headerRight: {
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flexShrink: 0,
  },
});

export default IOSCard;
