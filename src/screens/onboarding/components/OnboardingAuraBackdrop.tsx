import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  SharedValue,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../../contexts/ThemeContext';
import { iosEasing } from '../../../theme/motion';

export type AuraMode = 'welcome' | 'cobalt' | 'emerald' | 'amber';

interface OnboardingAuraBackdropProps {
  mode: AuraMode;
  welcomeProgressSV: SharedValue<number>;
}

/**
 * OnboardingAuraBackdrop — GPU-composited edge-to-edge top atmospheric wash
 * that cross-fades smoothly between Cobalt, Cyan, Workout Emerald, and Amber
 * on the Reanimated UI thread in exact sync with swipes and step state.
 */
export const OnboardingAuraBackdrop: React.FC<OnboardingAuraBackdropProps> = React.memo(
  function OnboardingAuraBackdrop({ mode, welcomeProgressSV }) {
    const insets = useSafeAreaInsets();
    const { tokens } = useTheme();
    const topPad = insets.top > 0 ? insets.top : 24;
    const auraHeight = 360 + topPad;

    const cobaltWeight = useSharedValue(mode === 'cobalt' ? 1 : 0);
    const emeraldWeight = useSharedValue(mode === 'emerald' ? 1 : 0);
    const amberWeight = useSharedValue(mode === 'amber' ? 1 : 0);
    const isWelcomeMode = useSharedValue(mode === 'welcome' ? 1 : 0);

    useEffect(() => {
      const cfg = { duration: 420, easing: iosEasing.decel };
      isWelcomeMode.value = withTiming(mode === 'welcome' ? 1 : 0, { duration: 280 });
      cobaltWeight.value = withTiming(mode === 'cobalt' ? 1 : 0, cfg);
      emeraldWeight.value = withTiming(mode === 'emerald' ? 1 : 0, cfg);
      amberWeight.value = withTiming(mode === 'amber' ? 1 : 0, cfg);
    }, [mode, isWelcomeMode, cobaltWeight, emeraldWeight, amberWeight]);

    const cobaltStyle = useAnimatedStyle(() => {
      const wVal = interpolate(welcomeProgressSV.value, [0, 1, 2], [1, 0, 0]);
      return {
        opacity: isWelcomeMode.value * wVal + (1 - isWelcomeMode.value) * cobaltWeight.value,
      };
    });

    const cyanStyle = useAnimatedStyle(() => {
      const wVal = interpolate(welcomeProgressSV.value, [0, 1, 2], [0, 1, 0]);
      return {
        opacity: isWelcomeMode.value * wVal,
      };
    });

    const emeraldStyle = useAnimatedStyle(() => {
      const wVal = interpolate(welcomeProgressSV.value, [0, 1, 2], [0, 0, 1]);
      return {
        opacity: isWelcomeMode.value * wVal + (1 - isWelcomeMode.value) * emeraldWeight.value,
      };
    });

    const amberStyle = useAnimatedStyle(() => ({
      opacity: (1 - isWelcomeMode.value) * amberWeight.value,
    }));

    const gradients = useMemo(() => {
      const isDark = tokens.isDark;
      return {
        cobalt: [
          isDark ? 'rgba(10, 132, 255, 0.20)' : 'rgba(10, 132, 255, 0.10)',
          isDark ? 'rgba(10, 132, 255, 0.05)' : 'rgba(10, 132, 255, 0.02)',
          'rgba(10, 132, 255, 0)',
        ] as const,
        cyan: [
          isDark ? 'rgba(56, 189, 248, 0.20)' : 'rgba(56, 189, 248, 0.10)',
          isDark ? 'rgba(56, 189, 248, 0.05)' : 'rgba(56, 189, 248, 0.02)',
          'rgba(56, 189, 248, 0)',
        ] as const,
        emerald: [
          isDark ? 'rgba(48, 209, 88, 0.22)' : 'rgba(48, 209, 88, 0.11)',
          isDark ? 'rgba(48, 209, 88, 0.06)' : 'rgba(48, 209, 88, 0.025)',
          'rgba(48, 209, 88, 0)',
        ] as const,
        amber: [
          isDark ? 'rgba(255, 159, 10, 0.20)' : 'rgba(255, 159, 10, 0.10)',
          isDark ? 'rgba(255, 159, 10, 0.05)' : 'rgba(255, 159, 10, 0.02)',
          'rgba(255, 159, 10, 0)',
        ] as const,
      };
    }, [tokens.isDark]);

    return (
      <>
        <Animated.View pointerEvents="none" style={[styles.layer, { height: auraHeight }, cobaltStyle]}>
          <LinearGradient
            colors={gradients.cobalt}
            locations={[0, 0.52, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.layer, { height: auraHeight }, cyanStyle]}>
          <LinearGradient
            colors={gradients.cyan}
            locations={[0, 0.52, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.layer, { height: auraHeight }, emeraldStyle]}>
          <LinearGradient
            colors={gradients.emerald}
            locations={[0, 0.52, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.layer, { height: auraHeight }, amberStyle]}>
          <LinearGradient
            colors={gradients.amber}
            locations={[0, 0.52, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </>
    );
  }
);

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
