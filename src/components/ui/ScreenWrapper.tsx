import React, { useMemo } from 'react';
import {
  View,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets, Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useActiveWorkoutState } from '../../contexts/domains/WellnessContext';

export interface ScreenWrapperProps {
  children: React.ReactNode;
  edges?: readonly Edge[];
  keyboardAvoiding?: boolean;
  keyboardVerticalOffset?: number;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  statusBarTranslucent?: boolean;
  /** Optional top atmospheric gradient extending edge-to-edge behind StatusBar (true = default cobalt blue, string = custom hex tint) */
  topAura?: boolean | string;
  /** Trims oversized punch-hole Android window top insets so top-level headers sit tightly under the status bar */
  compactTop?: boolean;
}

export function resolveScreenTopInset(
  insetsTop: number,
  compactTop: boolean = false
): number {
  if (!compactTop || insetsTop <= 0) return insetsTop;
  if (Platform.OS === 'android' && insetsTop <= 34) {
    return Math.max(24, insetsTop - 4);
  }
  return insetsTop;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return `rgba(10, 132, 255, ${alpha})`;
}

/**
 * Isolated memoized GPU backdrop so non-aura screens never subscribe to activeWorkout broadcasts,
 * and active screens use native LinearGradient instead of heavy per-tab <Svg><RadialGradient> trees.
 */
const TopAuraBackdrop = React.memo(function TopAuraBackdrop({
  topAura,
  auraHeight,
}: {
  topAura: boolean | string;
  auraHeight: number;
}) {
  const { tokens } = useTheme();
  const activeWorkout = useActiveWorkoutState();

  const colors = useMemo(() => {
    const auraHex = activeWorkout.active
      ? tokens.status.success
      : typeof topAura === 'string' && topAura.length > 0
      ? topAura
      : tokens.accent.primary;
    const isEmerald = auraHex === tokens.status.success || auraHex === '#30D158';
    const topAlpha = tokens.isDark ? (isEmerald ? 0.19 : 0.16) : (isEmerald ? 0.10 : 0.08);
    const midAlpha = tokens.isDark ? (isEmerald ? 0.05 : 0.04) : 0.02;

    return [
      hexToRgba(auraHex, topAlpha),
      hexToRgba(auraHex, midAlpha),
      hexToRgba(auraHex, 0),
    ] as const;
  }, [activeWorkout.active, topAura, tokens.status.success, tokens.accent.primary, tokens.isDark]);

  return (
    <LinearGradient
      colors={colors}
      locations={[0, 0.55, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      pointerEvents="none"
      style={[styles.auraBackdrop, { height: auraHeight }]}
    />
  );
});

/**
 * ScreenWrapper — Standardized safe-area, OLED canvas, edge-to-edge atmospheric glow, StatusBar, and keyboard shell.
 */
export function ScreenWrapper({
  children,
  edges = ['top', 'left', 'right'],
  keyboardAvoiding = true,
  keyboardVerticalOffset = 0,
  style,
  contentContainerStyle,
  statusBarTranslucent = true,
  topAura = false,
  compactTop = false,
}: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();

  const topPad = edges.includes('top')
    ? resolveScreenTopInset(insets.top, compactTop)
    : 0;
  const insetStyle: ViewStyle = {
    paddingTop: topPad,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  const auraHeight = 320 + topPad;

  const innerContent = (
    <View style={[styles.inner, insetStyle, contentContainerStyle]}>{children}</View>
  );

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: tokens.bg.canvas },
        style,
      ]}
    >
      <StatusBar
        barStyle={tokens.isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={statusBarTranslucent}
      />

      {topAura ? (
        <TopAuraBackdrop topAura={topAura} auraHeight={auraHeight} />
      ) : null}

      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          {innerContent}
        </KeyboardAvoidingView>
      ) : (
        innerContent
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  auraBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  keyboardView: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
});

export default ScreenWrapper;
