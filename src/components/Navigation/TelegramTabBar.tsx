import React, { useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { IOS_DARK, FONT_FAMILY, TAB_BAR_HEIGHT } from '../../theme/tokens';

// ─── Module Icons Configuration ───────────────────────────────────────────────
export const TAB_CONFIG: Record<string, {
  name: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
}> = {
  Today: {
    name: 'Today',
    activeIcon: 'barbell',
    inactiveIcon: 'barbell-outline',
  },
  Plan: {
    name: 'Plan',
    activeIcon: 'clipboard',
    inactiveIcon: 'clipboard-outline',
  },
  Analytics: {
    name: 'Analytics',
    activeIcon: 'bar-chart',
    inactiveIcon: 'bar-chart-outline',
  },
  Body: {
    name: 'Body',
    activeIcon: 'body',
    inactiveIcon: 'body-outline',
  },
  // Backward-compatibility aliases
  Splits: {
    name: 'Plan',
    activeIcon: 'clipboard',
    inactiveIcon: 'clipboard-outline',
  },
  History: {
    name: 'Analytics',
    activeIcon: 'bar-chart',
    inactiveIcon: 'bar-chart-outline',
  },
  Workout: {
    name: 'Today',
    activeIcon: 'flame',
    inactiveIcon: 'flame-outline',
  },
  Progress: {
    name: 'Body',
    activeIcon: 'body',
    inactiveIcon: 'body-outline',
  },
};

const DEFAULT_TAB_CONFIG = {
  name: '',
  activeIcon: 'ellipse' as keyof typeof Ionicons.glyphMap,
  inactiveIcon: 'ellipse-outline' as keyof typeof Ionicons.glyphMap,
};

// ─── Individual Tab Item ──────────────────────────────────────────────────────
interface TabItemProps {
  route: any;
  isFocused: boolean;
  navigation: any;
  badge?: number;
  isDark: boolean;
  colors: any;
  isActuallyFocused: boolean;
}

const TabItem = React.memo(function TabItem({
  route,
  isFocused,
  navigation,
  badge,
  isDark,
  colors,
  isActuallyFocused,
}: TabItemProps) {
  const config = TAB_CONFIG[route.name] || {
    ...DEFAULT_TAB_CONFIG,
    name: route.name,
  };

  const handlePress = useCallback(() => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isActuallyFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, { merge: true } as any);
    }
  }, [route.key, route.name, isActuallyFocused, navigation]);

  // Apple iOS HIG: Crisp color switching (#A599FF active, #8E8E93 inactive)
  const activeColor = IOS_DARK.accent;
  const inactiveColor = isDark ? IOS_DARK.labelSecondary : '#8E8E93';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={handlePress}
      unstable_pressDelay={0}
      style={styles.tabButton}
      android_ripple={null}
    >
      <View style={styles.tabContent}>
        {/* Crisp Icon */}
        <View style={styles.iconBox}>
          <Ionicons
            name={isFocused ? config.activeIcon : config.inactiveIcon}
            size={23}
            color={isFocused ? activeColor : inactiveColor}
          />

          {badge !== undefined && badge > 0 && (
            <Animated.View
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(120)}
              style={[
                styles.badge,
                {
                  backgroundColor: colors.error || IOS_DARK.red,
                  borderColor: isDark ? '#000000' : '#FFFFFF',
                },
              ]}
            >
              <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
            </Animated.View>
          )}
        </View>

        {/* Tab Label */}
        <Text
          numberOfLines={1}
          style={[
            styles.tabLabel,
            {
              color: isFocused ? activeColor : inactiveColor,
              fontWeight: isFocused ? '600' : '500',
            },
          ]}
        >
          {config.name}
        </Text>
      </View>
    </Pressable>
  );
});

// ─── Main Apple iOS Hairline Tab Bar ──────────────────────────────────────────
export const TelegramTabBar = React.memo(function TelegramTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const visibleRoutes = useMemo(() => {
    return state.routes.filter((route) => {
      const { options } = descriptors[route.key];
      if (
        options.tabBarItemStyle &&
        (options.tabBarItemStyle as any).display === 'none'
      ) return false;
      return true;
    });
  }, [state.routes, descriptors]);

  const activeIndex = visibleRoutes.findIndex(
    (route) => route.key === state.routes[state.index].key,
  );

  // Auto-hide handling when child screen requests tabBarStyle: { display: 'none' }
  const focusedOptions = descriptors[state.routes[state.index].key]?.options || {};
  const isScreenOptionsHidden =
    focusedOptions.tabBarStyle &&
    (focusedOptions.tabBarStyle as any).display === 'none';

  const shouldHide = Boolean(isScreenOptionsHidden);
  const translateY = useSharedValue(shouldHide ? 120 : 0);
  const tabOpacity = useSharedValue(shouldHide ? 0 : 1);

  useEffect(() => {
    translateY.value = withTiming(shouldHide ? 120 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
    tabOpacity.value = withTiming(shouldHide ? 0 : 1, {
      duration: 200,
      easing: Easing.out(Easing.quad),
    });
  }, [shouldHide]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: tabOpacity.value,
  }));

  const bottomInset = insets.bottom > 0 ? insets.bottom : 8;
  const barHeight = TAB_BAR_HEIGHT + bottomInset;

  return (
    <Animated.View
      pointerEvents={shouldHide ? 'none' : 'box-none'}
      style={[
        styles.outerWrapper,
        { height: barHeight },
        containerAnimatedStyle,
      ]}
    >
      {/* Apple iOS Translucent Hairline Tab Bar Surface */}
      <View
        style={[
          styles.barContainer,
          {
            height: barHeight,
            paddingBottom: bottomInset,
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
            backgroundColor: isDark ? 'rgba(10, 10, 12, 0.88)' : 'rgba(248, 248, 250, 0.88)',
          },
        ]}
      >
        <BlurView
          intensity={85}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        <View style={styles.tabsRow}>
          {visibleRoutes.map((route, index) => {
            const isVisuallyFocused = activeIndex === index;
            const isActuallyFocused = state.routes[state.index].key === route.key;

            return (
              <TabItem
                key={route.key}
                route={route}
                isFocused={isVisuallyFocused}
                isActuallyFocused={isActuallyFocused}
                navigation={navigation}
                isDark={isDark}
                colors={colors}
              />
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 99,
  },
  barContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth, // Apple iOS 0.5px hairline divider
    overflow: 'hidden',
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 49,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    backgroundColor: 'transparent',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  iconBox: {
    width: 32,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: -0.2,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.medium,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -8,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 11,
  },
});

export default TelegramTabBar;
