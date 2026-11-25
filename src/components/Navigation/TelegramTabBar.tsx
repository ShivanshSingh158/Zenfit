import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View, Text, StyleSheet, Pressable, Platform, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  cancelAnimation,
  FadeIn,
  FadeOut,
  Easing,
} from 'react-native-reanimated';
import { springs, iosEasing } from '../../theme/motion';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  Dumbbell,
  Calendar,
  BarChart3,
  User,
  ChevronRight,
  ClipboardList,
  Flame,
  Circle,
  LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SHADOW, TAB_BAR_HEIGHT } from '../../theme/tokens';
import {
  useActiveWorkoutState,
  useGymLogs,
  useGymPlan,
} from '../../contexts/domains/WellnessContext';
import { planDayIndexForDate, resolvePlanDay } from '../../data/gymPlan';
import { useGlobalRestTimer } from '../../services/restTimerService';
import { RestTimerBar as AnimatedRestTimer } from '../workout/RestTimerBar';
import { SetRestPickerSheet } from '../modals/SetRestPickerSheet';
import { todayStr } from '../../data/gymPlan';
import { hapticLight, hapticMedium, hapticSelection } from '../../utils/haptics';
import { getDefaultRestSecsSync } from '../../hooks/useGymProfile';
import { TactileButton } from '../ui/TactileButton';
import { NumericText } from '../ui/NumericText';
import { AppIcon } from '../ui/AppIcon';
import { useMainTabsFocused } from '../../navigation/MainTabsFocusContext';

export const TAB_CONFIG: Record<
  string,
  {
    name: string;
    icon: LucideIcon;
  }
> = {
  Home: { name: 'Home', icon: Home },
  Today: { name: 'Train', icon: Dumbbell },
  Train: { name: 'Train', icon: Dumbbell },
  Plan: { name: 'Plan', icon: Calendar },
  Analytics: { name: 'Analytics', icon: BarChart3 },
  Body: { name: 'Body', icon: User },
  Splits: { name: 'Plan', icon: ClipboardList },
  History: { name: 'Analytics', icon: BarChart3 },
  Workout: { name: 'Train', icon: Flame },
  Progress: { name: 'Body', icon: User },
};

const DEFAULT_TAB_CONFIG = {
  name: '',
  icon: Circle,
};

const FLOATING_DOCK_HEIGHT = 58;
const FLOATING_DOCK_RADIUS = 28;
const FLOATING_DOCK_PADDING_H = 5;
const FLOATING_LENS_RADIUS = FLOATING_DOCK_RADIUS - FLOATING_DOCK_PADDING_H; // 23px concentric
const FLOATING_DOCK_MARGIN_H = 14;
const LIVE_ISLAND_HEIGHT = 40;
const LIVE_ISLAND_RADIUS = 20;
const LIVE_ISLAND_GAP = 8;

interface TabItemProps {
  route: any;
  isFocused: boolean;
  navigation: any;
  badge?: number;
  showLiveDot?: boolean;
  isActuallyFocused: boolean;
}

const TabItem = React.memo(function TabItem({
  route,
  isFocused,
  navigation,
  badge,
  showLiveDot = false,
  isActuallyFocused,
}: TabItemProps) {
  const { tokens } = useTheme();
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
      hapticSelection();
      navigation.navigate(route.name, { merge: true } as any);
    }
  }, [route.key, route.name, isActuallyFocused, navigation]);

  const activeColor = tokens.accent.primary;
  const inactiveColor = tokens.text.secondary;

  const iconScale = useSharedValue(isFocused ? 1.06 : 1);
  const iconTranslateY = useSharedValue(isFocused ? -1.5 : 0);
  const prevFocusedRef = useRef(isFocused);

  useEffect(() => {
    const becameFocused = isFocused && !prevFocusedRef.current;
    prevFocusedRef.current = isFocused;

    if (becameFocused) {
      iconScale.value = withSequence(
        withSpring(1.16, springs.bouncy),
        withSpring(1.04, springs.snappy)
      );
      iconTranslateY.value = withSpring(-1.5, springs.snappy);
    } else if (isFocused) {
      iconScale.value = withSpring(1.04, springs.snappy);
      iconTranslateY.value = withSpring(-1.5, springs.snappy);
    } else {
      iconScale.value = withSpring(1, springs.snappy);
      iconTranslateY.value = withSpring(0, springs.snappy);
    }
  }, [isFocused, iconScale, iconTranslateY]);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: iconTranslateY.value },
      { scale: iconScale.value },
    ] as const,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={handlePress}
      hitSlop={tokens.touch.hitSlop}
      unstable_pressDelay={0}
      style={styles.tabButton}
      android_ripple={null}
    >
      <View style={styles.tabContent}>
        <Animated.View style={[styles.iconBox, iconAnimStyle]}>
          <AppIcon
            icon={config.icon}
            size={20}
            color={isFocused ? activeColor : inactiveColor}
          />

          {badge !== undefined && badge > 0 ? (
            <Animated.View
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(120)}
              style={[
                styles.badge,
                {
                  backgroundColor: tokens.accent.crimson,
                  borderColor: tokens.bg.canvas,
                },
              ]}
            >
              <NumericText style={[styles.badgeText, { color: tokens.accent.onCrimson }]}>
                {badge > 99 ? '99+' : badge}
              </NumericText>
            </Animated.View>
          ) : showLiveDot ? (
            <View
              style={[
                styles.liveTabDot,
                {
                  backgroundColor: tokens.status.success,
                  borderColor: tokens.bg.canvas,
                },
              ]}
            />
          ) : null}
        </Animated.View>

        <Text
          maxFontSizeMultiplier={1.15}
          numberOfLines={1}
          style={[
            styles.tabLabel,
            {
              color: isFocused ? activeColor : inactiveColor,
              fontFamily: isFocused ? tokens.font.bold : tokens.font.medium,
            },
          ]}
        >
          {config.name}
        </Text>
      </View>
    </Pressable>
  );
});

interface FloatingLiveWorkoutIslandProps {
  startTime: number | null;
  workoutDate: string | null;
  isVisible: boolean;
  onPress: () => void;
}

const FloatingLiveWorkoutIsland = React.memo(function FloatingLiveWorkoutIsland({
  startTime,
  workoutDate,
  isVisible,
  onPress,
}: FloatingLiveWorkoutIslandProps) {
  const { tokens, isDark } = useTheme();
  const { logsByDateMap } = useGymLogs();
  const { userGymPlan } = useGymPlan();
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      setIsAppActive(nextState === 'active');
    });
    return () => sub.remove();
  }, []);

  const shouldAnimate = isVisible && isAppActive;

  const targetDate = workoutDate || todayStr();
  const activeLog = logsByDateMap?.get(targetDate);

  const workoutTitle = useMemo(() => {
    const planIdx = activeLog?.dayPlanIndex ?? planDayIndexForDate(targetDate);
    const resolved = resolvePlanDay(userGymPlan, planIdx);
    if (resolved && !resolved.isRest && resolved.name) {
      return resolved.name;
    }
    return 'Active Session';
  }, [activeLog?.dayPlanIndex, targetDate, userGymPlan]);

  const progressRatio = useMemo(() => {
    const exs = activeLog?.exercises || [];
    let done = 0;
    let total = 0;
    for (const ex of exs) {
      const sets = Array.isArray(ex.setsLog) ? ex.setsLog : [];
      total += sets.length || Number(ex.targetSets) || 0;
      for (const s of sets) {
        if (s?.completed) done += 1;
      }
    }
    if (total <= 0) return 0;
    return Math.min(1, done / total);
  }, [activeLog?.exercises]);

  const [elapsedSecs, setElapsedSecs] = useState(() => {
    if (!startTime) return 0;
    return Math.max(0, Math.floor((Date.now() - startTime) / 1000));
  });

  useEffect(() => {
    if (!startTime) {
      setElapsedSecs(0);
      return;
    }
    const update = () => {
      setElapsedSecs(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    };
    update();
    if (!shouldAnimate) return;
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime, shouldAnimate]);

  const elapsedText = useMemo(() => {
    const mins = Math.floor(elapsedSecs / 60);
    const secs = elapsedSecs % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}:${remMins < 10 ? '0' : ''}${remMins}:${
        secs < 10 ? '0' : ''
      }${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, [elapsedSecs]);

  const haloPulse = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(haloPulse);
    if (!shouldAnimate) {
      haloPulse.value = 0;
      return;
    }
    haloPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(haloPulse);
    };
  }, [haloPulse, shouldAnimate]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.65 * (1 - haloPulse.value),
    transform: [{ scale: 1 + haloPulse.value * 0.9 }],
  }));

  return (
    <TactileButton
      variant="custom"
      haptic="medium"
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={`Resume ${workoutTitle}, elapsed ${elapsedText}`}
      onPress={onPress}
      style={[styles.liveIslandShadow, SHADOW.md]}
    >
      <View
        style={[
          styles.liveIslandSurface,
          {
            borderColor: isDark
              ? 'rgba(48, 209, 88, 0.34)'
              : 'rgba(22, 163, 74, 0.28)',
          },
        ]}
      >
        <LinearGradient
          colors={
            isDark
              ? ['rgba(20, 28, 25, 0.94)', 'rgba(13, 15, 20, 0.96)']
              : ['rgba(255, 255, 255, 0.95)', 'rgba(242, 248, 244, 0.96)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        <View style={styles.liveIslandContent}>
          <View style={styles.liveIslandDotWrap}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.liveIslandDotHalo,
                { backgroundColor: tokens.status.success },
                haloStyle,
              ]}
            />
            <View
              style={[
                styles.liveIslandDotCore,
                { backgroundColor: tokens.status.success },
              ]}
            />
          </View>

          <Text
            numberOfLines={1}
            style={[styles.liveIslandTitle, { color: tokens.text.primary }]}
          >
            {workoutTitle}
          </Text>

          <Text style={[styles.liveIslandSep, { color: tokens.text.muted }]}>·</Text>

          <NumericText style={[styles.liveIslandTimer, { color: tokens.status.success }]}>
            {elapsedText}
          </NumericText>

          <View
            style={[
              styles.liveIslandResumePill,
              { backgroundColor: tokens.status.successDim },
            ]}
          >
            <Text style={[styles.liveIslandResumeText, { color: tokens.status.success }]}>
              Resume
            </Text>
            <AppIcon
              icon={ChevronRight}
              size={12}
              color={tokens.status.success}
            />
          </View>
        </View>

        {progressRatio > 0 && (
          <View
            pointerEvents="none"
            style={[
              styles.liveIslandProgressTrack,
              { backgroundColor: 'rgba(48, 209, 88, 0.14)' },
            ]}
          >
            <View
              style={[
                styles.liveIslandProgressFill,
                {
                  width: `${Math.max(4, Math.round(progressRatio * 100))}%`,
                  backgroundColor: tokens.status.success,
                },
              ]}
            />
          </View>
        )}
      </View>
    </TactileButton>
  );
});

const TabBarRestOverlay = React.memo(function TabBarRestOverlay({
  isMainTabsFocused,
  bottomOffset,
  activeWorkoutDate,
  navigation,
}: {
  isMainTabsFocused: boolean;
  bottomOffset: number;
  activeWorkoutDate?: string;
  navigation: any;
}) {
  const {
    timer: globalRestTimer,
    isActive: isRestTimerActive,
    skip: skipRestTimer,
    add15,
    subtract15,
    setDuration: setRestDuration,
  } = useGlobalRestTimer();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerInitialSecs, setPickerInitialSecs] = useState<number>(90);

  return (
    <>
      {isMainTabsFocused &&
        isRestTimerActive &&
        !pickerVisible &&
        globalRestTimer &&
        globalRestTimer.startTime &&
        globalRestTimer.durationSecs > 0 && (
          <View pointerEvents="box-none" style={styles.restOverlayWrap}>
            <AnimatedRestTimer
              startTime={globalRestTimer.startTime}
              durationSecs={globalRestTimer.durationSecs}
              exerciseName={globalRestTimer.exerciseName}
              bottomOffset={bottomOffset}
              onPressCard={() => {
                hapticLight();
                navigation.navigate('ActiveLogging', {
                  date: activeWorkoutDate || todayStr(),
                });
              }}
              onSkip={skipRestTimer}
              onAdd={add15}
              onSubtract={subtract15}
              onEditDuration={(currRem) => {
                setPickerInitialSecs(currRem || 90);
                setPickerVisible(true);
              }}
            />
          </View>
        )}

      {isMainTabsFocused && pickerVisible && (
        <SetRestPickerSheet
          visible={pickerVisible}
          initialRestSecs={pickerInitialSecs}
          defaultRestSecs={getDefaultRestSecsSync()}
          onSelectRestSecs={(secs) => {
            setRestDuration(secs);
            setPickerVisible(false);
          }}
          onSkip={() => {
            skipRestTimer();
            setPickerVisible(false);
          }}
          onClose={() => setPickerVisible(false)}
        />
      )}
    </>
  );
});

export const TelegramTabBar = React.memo(function TelegramTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { tokens, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const isMainTabsFocused = useMainTabsFocused();

  const activeWorkout = useActiveWorkoutState();

  const visibleRoutes = useMemo(() => {
    return state.routes.filter((route) => {
      const { options } = descriptors[route.key];
      if (
        options.tabBarItemStyle &&
        (options.tabBarItemStyle as any).display === 'none'
      ) {
        return false;
      }
      return true;
    });
  }, [state.routes, descriptors]);

  const activeIndex = visibleRoutes.findIndex(
    (route) => route.key === state.routes[state.index].key
  );

  const [tabsRowWidth, setTabsRowWidth] = useState(0);
  const slotWidth = tabsRowWidth > 0 ? tabsRowWidth / Math.max(1, visibleRoutes.length) : 0;
  const pillX = useSharedValue(0);

  useEffect(() => {
    if (slotWidth > 0 && activeIndex >= 0) {
      pillX.value = withSpring(activeIndex * slotWidth, springs.snappy);
    }
  }, [activeIndex, slotWidth, pillX]);

  const handleTabsRowLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      if (w > 0 && Math.abs(w - tabsRowWidth) > 0.5) {
        setTabsRowWidth(w);
        const nextSlotW = w / Math.max(1, visibleRoutes.length);
        pillX.value = Math.max(0, activeIndex) * nextSlotW;
      }
    },
    [tabsRowWidth, visibleRoutes.length, activeIndex, pillX]
  );

  const glidingPillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }] as const,
  }));

  const focusedOptions = descriptors[state.routes[state.index].key]?.options || {};
  const isScreenOptionsHidden =
    focusedOptions.tabBarStyle &&
    (focusedOptions.tabBarStyle as any).display === 'none';

  const shouldHide = Boolean(isScreenOptionsHidden);
  const translateY = useSharedValue(shouldHide ? 200 : 0);
  const tabOpacity = useSharedValue(shouldHide ? 0 : 1);
  const prevShouldHideRef = useRef(shouldHide);

  useEffect(() => {
    if (prevShouldHideRef.current === shouldHide) return;
    prevShouldHideRef.current = shouldHide;
    translateY.value = withTiming(shouldHide ? 200 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
    tabOpacity.value = withTiming(shouldHide ? 0 : 1, {
      duration: 200,
      easing: Easing.out(Easing.quad),
    });
  }, [shouldHide, translateY, tabOpacity]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: tabOpacity.value,
  }));

  const dockBottomMargin = insets.bottom > 0 ? insets.bottom : 10;
  const dockFootprint = FLOATING_DOCK_HEIGHT + dockBottomMargin;
  const liveIslandFootprint = activeWorkout.active
    ? LIVE_ISLAND_HEIGHT + LIVE_ISLAND_GAP
    : 0;
  const outerWrapperHeight = dockFootprint + liveIslandFootprint + 6;

  const handleActiveWorkoutPress = useCallback(() => {
    hapticMedium();
    navigation.navigate('ActiveLogging', {
      date: activeWorkout.date || todayStr(),
    });
  }, [navigation, activeWorkout.date]);

  return (
    <>
      <Animated.View
        pointerEvents={shouldHide ? 'none' : 'box-none'}
        style={[
          styles.outerWrapper,
          { height: outerWrapperHeight },
          containerAnimatedStyle,
        ]}
      >
        <TabBarRestOverlay
          isMainTabsFocused={isMainTabsFocused && !shouldHide}
          bottomOffset={dockFootprint + liveIslandFootprint + 8}
          activeWorkoutDate={activeWorkout.date}
          navigation={navigation}
        />

        {activeWorkout.active && (
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(140)}
            pointerEvents="box-none"
            style={[
              styles.liveIslandFloatingSlot,
              { bottom: dockFootprint + LIVE_ISLAND_GAP },
            ]}
          >
            <FloatingLiveWorkoutIsland
              startTime={activeWorkout.startTime}
              workoutDate={activeWorkout.date}
              isVisible={isMainTabsFocused && !shouldHide}
              onPress={handleActiveWorkoutPress}
            />
          </Animated.View>
        )}

        <View pointerEvents="box-none" style={[styles.floatingDockSlot, { bottom: dockBottomMargin }]}>
          <View
            style={[
              styles.floatingDockShadow,
              {
                shadowColor: isDark ? '#000000' : '#09090B',
                shadowOpacity: isDark ? 0.62 : 0.14,
                elevation: isDark ? 12 : 8,
              },
            ]}
          >
            <View
              style={[
                styles.floatingDockSurface,
                {
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.14)'
                    : 'rgba(9, 9, 11, 0.08)',
                },
              ]}
            >
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(20, 22, 29, 0.96)', 'rgba(11, 12, 17, 0.98)']
                    : ['rgba(255, 255, 255, 0.96)', 'rgba(244, 245, 249, 0.98)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />

              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(255, 255, 255, 0.0)', 'rgba(255, 255, 255, 0.24)', 'rgba(255, 255, 255, 0.0)']
                    : ['rgba(255, 255, 255, 0.0)', 'rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.0)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.specularRim}
                pointerEvents="none"
              />

              <View style={styles.tabsRowOuter}>
                <View style={styles.tabsRow} onLayout={handleTabsRowLayout}>
                  {slotWidth > 0 && (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.glidingSlot,
                        { width: slotWidth },
                        glidingPillStyle,
                      ]}
                    >
                      <View
                        style={[
                          styles.glidingPill,
                          {
                            borderColor: isDark
                              ? 'rgba(10, 132, 255, 0.36)'
                              : 'rgba(10, 132, 255, 0.24)',
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={
                            isDark
                              ? ['rgba(10, 132, 255, 0.24)', 'rgba(10, 132, 255, 0.11)']
                              : ['rgba(10, 132, 255, 0.16)', 'rgba(10, 132, 255, 0.07)']
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={StyleSheet.absoluteFillObject}
                        />
                      </View>
                    </Animated.View>
                  )}

                  {visibleRoutes.map((route, index) => {
                    const isVisuallyFocused = activeIndex === index;
                    const isActuallyFocused =
                      state.routes[state.index].key === route.key;
                    const isCenterWorkoutTab =
                      route.name === 'Today' || route.name === 'Train';

                    return (
                      <TabItem
                        key={route.key}
                        route={route}
                        isFocused={isVisuallyFocused}
                        isActuallyFocused={isActuallyFocused}
                        showLiveDot={isCenterWorkoutTab && activeWorkout.active}
                        navigation={navigation}
                      />
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </>
  );
});

const styles = StyleSheet.create({
  restOverlayWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1002,
  },
  outerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    overflow: 'visible',
  },
  liveIslandFloatingSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    zIndex: 1001,
  },
  liveIslandShadow: {
    borderRadius: LIVE_ISLAND_RADIUS,
    maxWidth: '94%',
  },
  liveIslandSurface: {
    height: LIVE_ISLAND_HEIGHT,
    minWidth: 210,
    borderRadius: LIVE_ISLAND_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  liveIslandContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 13,
    paddingRight: 8,
    gap: 6,
  },
  liveIslandDotWrap: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveIslandDotHalo: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveIslandDotCore: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  liveIslandTitle: {
    fontSize: 12.5,
    fontFamily: 'Inter_600SemiBold',
    flexShrink: 1,
    maxWidth: 132,
  },
  liveIslandSep: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  liveIslandTimer: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.2,
  },
  liveIslandResumePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    marginLeft: 2,
  },
  liveIslandResumeText: {
    fontSize: 11.5,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.1,
  },
  liveIslandProgressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  liveIslandProgressFill: {
    height: '100%',
  },
  floatingDockSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: FLOATING_DOCK_MARGIN_H,
    alignItems: 'center',
  },
  floatingDockShadow: {
    width: '100%',
    maxWidth: 480,
    height: FLOATING_DOCK_HEIGHT,
    borderRadius: FLOATING_DOCK_RADIUS,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
  },
  floatingDockSurface: {
    flex: 1,
    borderRadius: FLOATING_DOCK_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  specularRim: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    zIndex: 4,
  },
  tabsRowOuter: {
    flex: 1,
    paddingHorizontal: FLOATING_DOCK_PADDING_H,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
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
    minHeight: 46,
  },
  iconBox: {
    width: 32,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: -0.2,
    textAlign: 'center',
    includeFontPadding: false,
  },
  liveTabDot: {
    position: 'absolute',
    top: 0,
    right: 2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1.5,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  badgeText: {
    fontSize: 9,
    lineHeight: 11,
  },
  glidingSlot: {
    position: 'absolute',
    left: 0,
    top: FLOATING_DOCK_PADDING_H,
    bottom: FLOATING_DOCK_PADDING_H,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glidingPill: {
    width: '100%',
    height: '100%',
    borderRadius: FLOATING_LENS_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});

export default TelegramTabBar;
