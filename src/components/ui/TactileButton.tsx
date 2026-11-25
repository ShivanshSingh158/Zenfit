import React, { useMemo } from 'react';
import {
  Pressable,
  PressableProps,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { durations, springs } from '../../theme/motion';
import { CONTROL_HEIGHT, ICON_BTN_SIZE } from '../../theme/tokens';
import { impactAsync, notificationAsync, selectionAsync } from '../../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type TactileButtonVariant =
  | 'primary'
  | 'secondary'
  | 'surface'
  | 'danger'
  | 'success'
  | 'ghost'
  | 'icon'
  | 'custom';

export type TactileButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_SPECS: Record<
  TactileButtonSize,
  {
    height: number;
    iconBox: number;
    paddingHorizontal: number;
    fontSize: number;
    gap: number;
    hitSlop: { top: number; bottom: number; left: number; right: number };
  }
> = {
  xs: {
    height: CONTROL_HEIGHT.xs,
    iconBox: ICON_BTN_SIZE.xs,
    paddingHorizontal: 12,
    fontSize: 11.5,
    gap: 5,
    hitSlop: { top: 10, bottom: 10, left: 8, right: 8 },
  },
  sm: {
    height: CONTROL_HEIGHT.sm,
    iconBox: ICON_BTN_SIZE.sm,
    paddingHorizontal: 14,
    fontSize: 12,
    gap: 6,
    hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
  },
  md: {
    height: CONTROL_HEIGHT.md,
    iconBox: ICON_BTN_SIZE.md,
    paddingHorizontal: 16,
    fontSize: 13,
    gap: 6,
    hitSlop: { top: 5, bottom: 5, left: 4, right: 4 },
  },
  lg: {
    height: CONTROL_HEIGHT.lg,
    iconBox: ICON_BTN_SIZE.lg,
    paddingHorizontal: 20,
    fontSize: 14.5,
    gap: 7,
    hitSlop: { top: 4, bottom: 4, left: 0, right: 0 },
  },
};

export interface TactileButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: React.ReactNode;
  label?: string;
  variant?: TactileButtonVariant;
  /** Option A compact visual size tier (auto-applies hitSlop to maintain >=44-48dp tap area) */
  size?: TactileButtonSize;
  loading?: boolean;
  haptic?: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'none';
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  spinnerColor?: string;
  pill?: boolean;
  allowFontScaling?: boolean;
}

/**
 * TactileButton — UI-thread 120fps Pressable with calibrated Haptics, compact visual sizes,
 * automatic accessible hitSlop, and fixed-geometry loading.
 */
export function TactileButton({
  children,
  label,
  variant = 'custom',
  size,
  loading = false,
  haptic = 'light',
  scaleTo = 0.96,
  style,
  contentStyle,
  textStyle,
  spinnerColor,
  pill = false,
  allowFontScaling = true,
  disabled,
  hitSlop,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: TactileButtonProps) {
  const { tokens } = useTheme();
  const scale = useSharedValue(1);
  const isDisabled = Boolean(disabled || loading);

  const resolvedSize: TactileButtonSize = size ?? (variant === 'icon' ? 'sm' : 'md');
  const spec = SIZE_SPECS[resolvedSize];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const variantPalette = useMemo(() => {
    const borderRadius = pill
      ? tokens.radius.full
      : resolvedSize === 'xs'
      ? tokens.radius.sm
      : resolvedSize === 'sm'
      ? tokens.radius.inner
      : tokens.radius.md;

    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: tokens.accent.primary,
            minHeight: spec.height,
            paddingHorizontal: spec.paddingHorizontal,
            borderRadius,
          } as ViewStyle,
          textColor: tokens.accent.onPrimary,
        };
      case 'danger':
        return {
          container: {
            backgroundColor: tokens.accent.crimson,
            minHeight: spec.height,
            paddingHorizontal: spec.paddingHorizontal,
            borderRadius,
          } as ViewStyle,
          textColor: tokens.accent.onCrimson,
        };
      case 'success':
        return {
          container: {
            backgroundColor: tokens.status.success,
            minHeight: spec.height,
            paddingHorizontal: spec.paddingHorizontal,
            borderRadius,
          } as ViewStyle,
          textColor: tokens.status.onSuccess,
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: tokens.bg.elevated,
            borderWidth: tokens.border.hairlineWidth,
            borderColor: tokens.border.subtle,
            minHeight: spec.height,
            paddingHorizontal: spec.paddingHorizontal,
            borderRadius,
          } as ViewStyle,
          textColor: tokens.text.primary,
        };
      case 'surface':
        return {
          container: {
            backgroundColor: tokens.bg.surface,
            borderWidth: tokens.border.hairlineWidth,
            borderColor: tokens.border.subtle,
            minHeight: spec.height,
            paddingHorizontal: spec.paddingHorizontal,
            borderRadius,
          } as ViewStyle,
          textColor: tokens.text.primary,
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
            minHeight: spec.height,
            paddingHorizontal: Math.max(8, spec.paddingHorizontal - 2),
            borderRadius,
          } as ViewStyle,
          textColor: tokens.text.primary,
        };
      case 'icon':
        return {
          container: {
            backgroundColor: tokens.bg.elevated,
            borderWidth: tokens.border.hairlineWidth,
            borderColor: tokens.border.subtle,
            width: spec.iconBox,
            height: spec.iconBox,
            borderRadius: pill
              ? tokens.radius.full
              : resolvedSize === 'xs'
              ? tokens.radius.sm
              : tokens.radius.inner,
          } as ViewStyle,
          textColor: tokens.text.primary,
        };
      default:
        return {
          container: {} as ViewStyle,
          textColor: tokens.text.primary,
        };
    }
  }, [variant, pill, tokens, resolvedSize, spec]);

  const handlePressIn = (e: any) => {
    if (!isDisabled) {
      if (haptic === 'light') {
        impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (haptic === 'medium') {
        impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (haptic === 'heavy') {
        impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else if (haptic === 'selection') {
        selectionAsync();
      } else if (haptic === 'success') {
        notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      scale.value = withTiming(scaleTo, { duration: durations.tactilePressIn });
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    if (!isDisabled) {
      scale.value = withSpring(1, springs.tactile);
    }
    onPressOut?.(e);
  };

  const resolvedSpinnerColor = spinnerColor || variantPalette.textColor;
  const resolvedHitSlop = hitSlop ?? (variant === 'custom' ? tokens.touch.hitSlop : spec.hitSlop);

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={resolvedHitSlop}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      unstable_pressDelay={0}
      android_ripple={null}
      style={[
        variant !== 'custom' && styles.baseVariant,
        variantPalette.container,
        disabled && !loading && styles.disabled,
        style,
        animatedStyle,
      ]}
      {...rest}
    >
      {variant === 'custom' ? (
        <>
          <View
            style={[loading && styles.hiddenForLoader, contentStyle]}
            pointerEvents={loading ? 'none' : 'auto'}
          >
            {children}
          </View>
          {loading && (
            <View style={styles.loaderOverlay} pointerEvents="none">
              <ActivityIndicator size="small" color={resolvedSpinnerColor} />
            </View>
          )}
        </>
      ) : (
        <View style={[styles.labelShell, contentStyle]}>
          <View
            style={[
              styles.labelRow,
              { gap: spec.gap },
              loading && styles.hiddenForLoader,
            ]}
            pointerEvents={loading ? 'none' : 'auto'}
          >
            {children ?? (
              <Text
                allowFontScaling={allowFontScaling}
                style={[
                  tokens.typography.label,
                  styles.defaultText,
                  {
                    color: variantPalette.textColor,
                    fontSize: spec.fontSize,
                    fontFamily: tokens.font.bold,
                  },
                  textStyle,
                ]}
              >
                {label}
              </Text>
            )}
          </View>
          {loading && (
            <View style={styles.loaderOverlay} pointerEvents="none">
              <ActivityIndicator size="small" color={resolvedSpinnerColor} />
            </View>
          )}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  baseVariant: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
  labelShell: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenForLoader: {
    opacity: 0,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultText: {
    textAlign: 'center',
  },
});

export default TactileButton;
