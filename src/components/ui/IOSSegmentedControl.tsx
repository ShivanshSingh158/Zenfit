import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { springs } from '../../theme/motion';
import { hapticSelection } from '../../utils/haptics';

export interface SegmentOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface IOSSegmentedControlProps<T extends string = string> {
  segments: (SegmentOption<T> | T)[];
  activeId: T;
  onSelect: (id: T) => void;
  style?: StyleProp<ViewStyle>;
  height?: number;
  activeTextColor?: string;
  inactiveTextColor?: string;
}

/**
 * IOSSegmentedControl — Native UI-thread sliding pill segmented control.
 */
export function IOSSegmentedControl<T extends string = string>({
  segments,
  activeId,
  onSelect,
  style,
  height = 36,
  activeTextColor,
  inactiveTextColor,
}: IOSSegmentedControlProps<T>) {
  const { tokens } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const count = Math.max(1, segments.length);
  const activeIndex = Math.max(
    0,
    segments.findIndex((seg) => (typeof seg === 'string' ? seg : seg.id) === activeId)
  );

  const padding = 3;
  const innerWidth = Math.max(0, trackWidth - padding * 2);
  const pillWidth = innerWidth / count;
  const pillRadius = height <= 32 ? tokens.radius.sm : tokens.radius.inner;
  const trackRadius = pillRadius + padding;
  const labelFontSize = height <= 32 ? 11.5 : height <= 35 ? 12 : 12.5;

  const translateX = useSharedValue(0);
  const pillWidthSV = useSharedValue(0);

  useEffect(() => {
    pillWidthSV.value = pillWidth;
    if (pillWidth > 0) {
      translateX.value = withSpring(activeIndex * pillWidth, springs.snappy);
    }
  }, [activeIndex, pillWidth, pillWidthSV, translateX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: pillWidthSV.value,
    transform: [{ translateX: translateX.value }],
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - trackWidth) > 0.5) {
      setTrackWidth(w);
      const nextPillW = Math.max(0, w - padding * 2) / count;
      pillWidthSV.value = nextPillW;
      translateX.value = activeIndex * nextPillW;
    }
  };

  const activeText = activeTextColor ?? tokens.text.primary;
  const inactiveText = inactiveTextColor ?? tokens.text.secondary;

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.track,
        {
          height,
          padding,
          borderRadius: trackRadius,
          backgroundColor: tokens.bg.surface,
          borderWidth: tokens.border.hairlineWidth,
          borderColor: tokens.border.subtle,
        },
        style,
      ]}
    >
      {pillWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activeIndicator,
            {
              top: padding,
              bottom: padding,
              left: padding,
              borderRadius: pillRadius,
              backgroundColor: tokens.bg.elevated,
              borderWidth: tokens.border.hairlineWidth,
              borderColor: tokens.border.subtle,
            },
            indicatorStyle,
          ]}
        />
      )}

      {segments.map((seg) => {
        const id = typeof seg === 'string' ? seg : seg.id;
        const label = typeof seg === 'string' ? seg : seg.label;
        const icon = typeof seg === 'object' ? seg.icon : undefined;
        const badge = typeof seg === 'object' ? seg.badge : undefined;
        const isActive = activeId === id;

        return (
          <Pressable
            key={`seg-${id}`}
            onPress={() => {
              if (!isActive) {
                hapticSelection();
                onSelect(id);
              }
            }}
            style={styles.pill}
            hitSlop={tokens.touch.hitSlop}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <View style={styles.pillContent}>
              {icon}
              <Text
                maxFontSizeMultiplier={1.2}
                style={[
                  styles.label,
                  {
                    fontSize: labelFontSize,
                    color: isActive ? activeText : inactiveText,
                    fontFamily: isActive ? tokens.font.bold : tokens.font.medium,
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
              {badge !== undefined && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: isActive
                        ? tokens.accent.primary
                        : tokens.bg.elevated,
                      borderRadius: tokens.radius.sm,
                    },
                  ]}
                >
                  <Text
                    maxFontSizeMultiplier={1.2}
                    style={[
                      tokens.typography.badge,
                      styles.badgeText,
                      {
                        color: isActive ? tokens.accent.onPrimary : inactiveText,
                      },
                    ]}
                  >
                    {badge}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
  },
  pill: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    letterSpacing: -0.1,
    includeFontPadding: false,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
  },
});

export default IOSSegmentedControl;
