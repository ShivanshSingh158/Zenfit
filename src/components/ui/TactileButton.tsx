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
  /**
   * Skips allocating Reanimated SharedValues & useAnimatedStyle for high-density
   * chips, pills, and list items, using native Pressable pressed state instead.
   */
  lightweight?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  spinnerColor?: string;
  pill?: boolean;
  allowFontScaling?: boolean;
}

function triggerTactileHaptic(haptic: TactileButtonProps['haptic']) {
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
}

function useTactileButtonLayout({
  children,
  label,
  variant = 'custom',
  size,
  loading = false,
  style,
  contentStyle,
  textStyle,
  spinnerColor,
  pill = false,
  allowFontScaling = true,
  disabled,
  hitSlop,
}: TactileButtonProps) {
  const { tokens } = useTheme();
  const isDisabled = Boolean(disabled || loading);

  const resolvedSize: TactileButtonSize = size ?? (variant === 'icon' ? 'sm' : 'md');
  const spec = SIZE_SPECS[resolvedSize];

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

  const resolvedSpinnerColor = spinnerColor || variantPalette.textColor;
  const resolvedHitSlop = hitSlop ?? (variant === 'custom' ? tokens.touch.hitSlop : spec.hitSlop);
  const needsCustomWrapper = Boolean(loading || contentStyle);
  const needsVariantWrapper = Boolean(loading || contentStyle);

  const customWrapperLayout = useMemo<ViewStyle | undefined>(() => {
    if (!needsCustomWrapper) return undefined;
    const flat = (StyleSheet.flatten(style) || {}) as ViewStyle;
    return {
      flexDirection: flat.flexDirection,
      alignItems: flat.alignItems,
      justifyContent: flat.justifyContent,
      flexWrap: flat.flexWrap,
      gap: flat.gap,
      rowGap: flat.rowGap,
      columnGap: flat.columnGap,
      width: '100%',
    };
  }, [needsCustomWrapper, style]);

  const baseContainerStyle: StyleProp<ViewStyle> = [
    variant !== 'custom' && styles.baseVariant,
    variant !== 'custom' && !needsVariantWrapper && { gap: spec.gap },
    variantPalette.container,
    disabled && !loading && styles.disabled,
    style,
  ];

  const innerContent =
    variant === 'custom' ? (
      needsCustomWrapper ? (
        <>
          <View
            style={[customWrapperLayout, loading && styles.hiddenForLoader, contentStyle]}
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
        children
      )
    ) : (
      (() => {
        const variantContent = children ?? (
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
        );
        return needsVariantWrapper ? (
          <View style={[styles.labelShell, contentStyle]}>
            <View
              style={[
                styles.labelRow,
                { gap: spec.gap },
                loading && styles.hiddenForLoader,
              ]}
              pointerEvents={loading ? 'none' : 'auto'}
            >
              {variantContent}
            </View>
            {loading && (
              <View style={styles.loaderOverlay} pointerEvents="none">
                <ActivityIndicator size="small" color={resolvedSpinnerColor} />
              </View>
            )}
          </View>
        ) : (
          variantContent
        );
      })()
    );

  return {
    isDisabled,
    resolvedHitSlop,
    baseContainerStyle,
    innerContent,
  };
}

function LightweightTactileButton(props: TactileButtonProps) {
  const {
    haptic = 'light',
    scaleTo = 0.96,
    onPressIn,
    onPressOut,
    onPress,
    // Strip custom UI props so they are never forwarded onto native Pressable
    children: _c,
    label: _l,
    variant: _v,
    size: _s,
    loading = false,
    lightweight: _lw,
    style: _st,
    contentStyle: _cs,
    textStyle: _ts,
    spinnerColor: _sc,
    pill: _p,
    allowFontScaling: _afs,
    disabled: _d,
    hitSlop: _hs,
    ...rest
  } = props;
  const layout = useTactileButtonLayout(props);

  const handlePressIn = (e: any) => {
    if (!layout.isDisabled) triggerTactileHaptic(haptic);
    onPressIn?.(e);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      disabled={layout.isDisabled}
      hitSlop={layout.resolvedHitSlop}
      accessibilityRole="button"
      accessibilityState={{ disabled: layout.isDisabled, busy: loading }}
      unstable_pressDelay={0}
      android_ripple={null}
      style={({ pressed }) => [
        layout.baseContainerStyle,
        pressed && !layout.isDisabled && {
          transform: [{ scale: scaleTo }],
          opacity: 0.88,
        },
      ]}
      {...rest}
    >
      {layout.innerContent}
    </Pressable>
  );
}

function ReanimatedTactileButton(props: TactileButtonProps) {
  const {
    haptic = 'light',
    scaleTo = 0.96,
    onPressIn,
    onPressOut,
    onPress,
    children: _c,
    label: _l,
    variant: _v,
    size: _s,
    loading = false,
    lightweight: _lw,
    style: _st,
    contentStyle: _cs,
    textStyle: _ts,
    spinnerColor: _sc,
    pill: _p,
    allowFontScaling: _afs,
    disabled: _d,
    hitSlop: _hs,
    ...rest
  } = props;
  const scale = useSharedValue(1);
  const layout = useTactileButtonLayout(props);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    if (!layout.isDisabled) {
      triggerTactileHaptic(haptic);
      scale.value = withTiming(scaleTo, { duration: durations.tactilePressIn });
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    if (!layout.isDisabled) {
      scale.value = withSpring(1, springs.tactile);
    }
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={layout.isDisabled}
      hitSlop={layout.resolvedHitSlop}
      accessibilityRole="button"
      accessibilityState={{ disabled: layout.isDisabled, busy: loading }}
      unstable_pressDelay={0}
      android_ripple={null}
      style={[layout.baseContainerStyle, animatedStyle]}
      {...rest}
    >
      {layout.innerContent}
    </AnimatedPressable>
  );
}

/**
 * TactileButton — UI-thread Pressable with calibrated Haptics, compact visual sizes,
 * automatic accessible hitSlop, and zero-overhead lightweight fallback for compact/list controls.
 */
export function TactileButton(props: TactileButtonProps) {
  const useLightweight = props.lightweight ?? (props.size === 'xs');
  if (useLightweight) {
    return <LightweightTactileButton {...props} />;
  }
  return <ReanimatedTactileButton {...props} />;
}

const styles = StyleSheet.create({
  baseVariant: {
    flexDirection: 'row',
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
