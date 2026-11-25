import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { iosEasing } from '../../theme/motion';

export interface AnimatedSubTabPaneProps {
  /** Tab index for this pane */
  index: number;
  /** Currently active tab index */
  activeIndex: number;
  /** Keep inactive tab mounted after first visit (preserves scroll/chart state) */
  lazy?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * AnimatedSubTabPane — GPU UI-thread directional slide + cross-dissolve for sub-tabs.
 * Syncs smoothly with IOSSegmentedControl's gliding indicator and eliminates static pop cuts.
 */
export function AnimatedSubTabPane({
  index,
  activeIndex,
  lazy = true,
  style,
  children,
}: AnimatedSubTabPaneProps) {
  const isActive = index === activeIndex;
  const [hasActivated, setHasActivated] = useState(!lazy || isActive);
  const prevActiveIndexRef = useRef(activeIndex);

  const opacity = useSharedValue(isActive ? 1 : 0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (isActive && !hasActivated) {
      setHasActivated(true);
    }
  }, [isActive, hasActivated]);

  useEffect(() => {
    const prevIdx = prevActiveIndexRef.current;
    prevActiveIndexRef.current = activeIndex;

    if (!hasActivated && !isActive) return;

    cancelAnimation(opacity);
    cancelAnimation(translateX);

    const movingForward = activeIndex >= prevIdx;

    if (isActive) {
      if (prevIdx === activeIndex) {
        opacity.value = 1;
        translateX.value = 0;
        return;
      }
      const startOffset = movingForward ? 12 : -12;
      translateX.value = startOffset;
      opacity.value = 0;
      opacity.value = withTiming(1, { duration: 140, easing: iosEasing.decel });
      translateX.value = withTiming(0, { duration: 160, easing: iosEasing.decel });
    } else {
      const exitOffset = movingForward ? -10 : 10;
      opacity.value = withTiming(0, { duration: 100, easing: iosEasing.standard });
      translateX.value = withTiming(exitOffset, { duration: 120, easing: iosEasing.standard });
    }
  }, [isActive, activeIndex, hasActivated, opacity, translateX]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  if (!hasActivated) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents={isActive ? 'auto' : 'none'}
      accessibilityElementsHidden={!isActive}
      importantForAccessibility={isActive ? 'auto' : 'no-hide-descendants'}
      style={[
        styles.pane,
        !isActive && styles.inactivePane,
        style,
        animStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pane: {
    flex: 1,
    minHeight: 0,
  },
  inactivePane: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
});

export default AnimatedSubTabPane;
