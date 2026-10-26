import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { FONT_FAMILY, IOS_DARK } from '../../theme/tokens';
import { hapticLight } from '../../utils/haptics';

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

export function IOSSegmentedControl<T extends string = string>({
  segments,
  activeId,
  onSelect,
  style,
  height = 34,
  activeTextColor,
  inactiveTextColor,
}: IOSSegmentedControlProps<T>) {
  const { isDark } = useTheme();

  const trackBg = isDark ? IOS_DARK.bgGroupedCard : '#E5E5EA'; // #1C1C1E in dark
  const activePillBg = isDark ? IOS_DARK.bgElevatedInput : '#FFFFFF'; // #2C2C2E in dark
  const activeText = activeTextColor || (isDark ? '#FFFFFF' : '#000000');
  const inactiveText = inactiveTextColor || (isDark ? '#8E8E93' : '#636366');

  return (
    <View
      style={[
        styles.track,
        {
          height,
          backgroundColor: trackBg,
        },
        style,
      ]}
    >
      {segments.map(seg => {
        const id = typeof seg === 'string' ? seg : seg.id;
        const label = typeof seg === 'string' ? seg : seg.label;
        const icon = typeof seg === 'object' ? seg.icon : undefined;
        const badge = typeof seg === 'object' ? seg.badge : undefined;
        const isActive = activeId === id;

        return (
          <TouchableOpacity
            key={`seg-${id}`}
            activeOpacity={0.8}
            onPress={() => {
              if (!isActive) {
                hapticLight();
                onSelect(id);
              }
            }}
            style={[
              styles.pill,
              {
                backgroundColor: isActive ? activePillBg : 'transparent',
              },
              isActive && styles.activePillShadow,
            ]}
          >
            <View style={styles.pillContent}>
              {icon}
              <Text
                style={[
                  styles.label,
                  {
                    color: isActive ? activeText : inactiveText,
                    fontFamily: isActive ? FONT_FAMILY.bold : FONT_FAMILY.medium,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
              {badge !== undefined && (
                <View style={[styles.badge, { backgroundColor: isActive ? '#A599FF' : 'rgba(142, 142, 147, 0.2)' }]}>
                  <Text style={[styles.badgeText, { color: isActive ? '#000000' : inactiveText }]}>
                    {badge}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: 9,
    padding: 2,
    alignItems: 'center',
  },
  pill: {
    flex: 1,
    height: '100%',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePillShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.2,
    shadowRadius: 2.5,
    elevation: 2,
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
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.bold,
  },
});
