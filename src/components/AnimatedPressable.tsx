import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  EntryOrExitLayoutType,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { impactAsync, notificationAsync, selectionAsync } from '../utils/haptics';
import { durations, springs } from '../theme/motion';

export type PressableVariant =
  | 'row'
  | 'card'
  | 'button'
  | 'default'
  | 'cta'
  | 'destructive'
  | 'subtle';

const SCALE_MAP: Record<PressableVariant, number> = {
  row: 0.985,
  card: 0.98,
  button: 0.96,
  default: 0.96,
  cta: 0.96,
  destructive: 0.96,
  subtle: 0.975,
};

export interface AnimatedPressableProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  activeOpacity?: number;
  haptic?: 'light' | 'selection' | 'medium' | 'heavy' | 'success' | 'none';
  variant?: PressableVariant;
  children: React.ReactNode;
  entering?: EntryOrExitLayoutType;
  exiting?: EntryOrExitLayoutType;
}

const AnimatedPressableCore = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  style,
  scaleTo,
  haptic = 'light',
  variant = 'default',
  children,
  entering,
  exiting,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...props
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const targetScale = scaleTo ?? SCALE_MAP[variant];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    if (!disabled) {
      scale.value = withTiming(targetScale, { duration: durations.tactilePressIn });
      if (haptic !== 'none') {
        if (haptic === 'selection') {
          selectionAsync();
        } else if (haptic === 'medium') {
          impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else if (haptic === 'heavy') {
          impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else if (haptic === 'success') {
          notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    if (!disabled) {
      scale.value = withSpring(1, springs.tactile);
    }
    onPressOut?.(e);
  };

  const content = (
    <AnimatedPressableCore
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      unstable_pressDelay={0}
      android_ripple={null}
      style={[style, animatedStyle]}
      {...props}
    >
      {children}
    </AnimatedPressableCore>
  );

  if (entering || exiting) {
    return (
      <Animated.View entering={entering} exiting={exiting}>
        {content}
      </Animated.View>
    );
  }

  return content;
}

export default AnimatedPressable;
