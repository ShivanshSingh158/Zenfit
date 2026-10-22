import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { FONT_FAMILY } from '../../theme/tokens';

// ─── Module Icons Configuration ───────────────────────────────────────────────
export const TAB_CONFIG: Record<string, {
  name: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
}> = {
  Today: {
    name: 'Today',
    activeIcon: 'flame',
    inactiveIcon: 'flame-outline',
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

  const activeColor = colors.accentPrimary || '#a599ff';
  // Highlighted white for inactive tabs as requested by user
  const inactiveColor = isDark ? '#FFFFFF' : 'rgba(0, 0, 0, 0.75)';

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
        {/* Icon */}
        <View style={styles.iconBox}>
          <Ionicons
            name={isFocused ? config.activeIcon : config.inactiveIcon}
            size={24}
            color={isFocused ? activeColor : inactiveColor}
          />

          {badge !== undefined && badge > 0 && (
            <Animated.View
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(120)}
              style={[
                styles.badge,
                {
                  backgroundColor: colors.error || '#FF453A',
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
              fontWeight: isFocused ? '700' : '600',
            },
          ]}
        >
          {config.name}
        </Text>
      </View>
    </Pressable>
  );
});

// ─── Sliding Pill Indicator ───────────────────────────────────────────────────
interface PillIndicatorProps {
  activeIndex: number;
  tabCount: number;
  tabWidth: number;
  colors: any;
}

function PillIndicator({ activeIndex, tabCount, tabWidth, colors }: PillIndicatorProps) {
  const PILL_W_RATIO = 0.68;
  const pillWidth = tabWidth * PILL_W_RATIO;
  const centerOffset = (tabWidth - pillWidth) / 2;

  const pillX = useSharedValue(activeIndex * tabWidth + centerOffset);

  useEffect(() => {
    pillX.value = withTiming(activeIndex * tabWidth + centerOffset, {
      duration: 180,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
  }, [activeIndex, tabWidth, centerOffset]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
  }));

  const accent = colors.accentPrimary || '#a599ff';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pillContainer,
        { width: pillWidth },
        pillStyle,
      ]}
    >
      <LinearGradient
        colors={[accent + '40', accent + '18']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.pill}
      />
    </Animated.View>
  );
}

// ─── Main Telegram Tab Bar ───────────────────────────────────────────────────
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

  const [tabsRowWidth, setTabsRowWidth] = useState(0);
  const onTabsRowLayout = useCallback((e: LayoutChangeEvent) => {
    setTabsRowWidth(e.nativeEvent.layout.width);
  }, []);

  const tabWidth = tabsRowWidth > 0
    ? tabsRowWidth / Math.max(visibleRoutes.length, 1)
    : 0;

  // Auto-hide handling when child screen requests tabBarStyle: { display: 'none' }
  const focusedOptions = descriptors[state.routes[state.index].key]?.options || {};
  const isScreenOptionsHidden =
    focusedOptions.tabBarStyle &&
    (focusedOptions.tabBarStyle as any).display === 'none';

  const shouldHide = Boolean(isScreenOptionsHidden);
  const translateY = useSharedValue(shouldHide ? 110 : 0);
  const tabOpacity = useSharedValue(shouldHide ? 0 : 1);

  useEffect(() => {
    translateY.value = withTiming(shouldHide ? 110 : 0, {
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

  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;
  const tabBarHeight = 48 + 6 + bottomPadding;
  const gradientHeight = tabBarHeight + 64;

  const gradientColors = isDark
    ? [
        'rgba(0,0,0,0)',
        'rgba(0,0,0,0.30)',
        'rgba(0,0,0,0.68)',
        'rgba(0,0,0,0.90)',
        'rgba(0,0,0,0.98)',
      ] as const
    : [
        'rgba(244,243,248,0)',
        'rgba(244,243,248,0.35)',
        'rgba(244,243,248,0.72)',
        'rgba(244,243,248,0.92)',
        'rgba(244,243,248,0.99)',
      ] as const;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.outerWrapper,
        { height: gradientHeight },
        containerAnimatedStyle,
      ]}
    >
      {/* Spotify/ZenTrack-style black blurry gradient fade */}
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.38, 0.65, 0.84, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Tab bar row docked to bottom */}
      <View style={[styles.dockedWrapper, { paddingBottom: bottomPadding }]}>
        {tabWidth > 0 && activeIndex >= 0 && (
          <PillIndicator
            activeIndex={activeIndex}
            tabCount={visibleRoutes.length}
            tabWidth={tabWidth}
            colors={colors}
          />
        )}

        <View style={styles.tabsRow} onLayout={onTabsRowLayout}>
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
    backgroundColor: 'transparent',
  },
  dockedWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 6,
    backgroundColor: 'transparent',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    backgroundColor: 'transparent',
  },
  tabButton: {
    flex: 1,
    flexBasis: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  iconBox: {
    width: 38,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.2,
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
    color: '#ffffff',
    fontSize: 8.5,
    fontFamily: FONT_FAMILY.bold,
  },
  // ── Sliding pill indicator (matching ZenTrack squircle) ──
  pillContainer: {
    position: 'absolute',
    top: 8,
    left: 0,
    height: 44,
    zIndex: 0,
    overflow: 'hidden',
    borderRadius: 12,
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
});
