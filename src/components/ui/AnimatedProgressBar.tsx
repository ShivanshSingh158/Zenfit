import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { iosEasing } from '../../theme/motion';

export interface AnimatedProgressBarProps {
  /** Normalized progress ratio from 0 to 1 (pass pct / 100 if using percentage) */
  progress: number;
  /** Minimum visual ratio when progress > 0 (e.g. 0.04 so small non-zero tracks stay visible) */
  minVisualRatio?: number;
  /** Fill color (defaults to tokens.accent.primary) */
  color?: string;
  /** Track color (defaults to tokens.bg.elevated) */
  trackColor?: string;
  height?: number;
  borderRadius?: number;
  delayMs?: number;
  durationMs?: number;
  /** Trigger key to replay 0 -> target sweep on in-screen data/mode changes */
  replayKey?: number | string;
  style?: StyleProp<ViewStyle>;
  trackStyle?: StyleProp<ViewStyle>;
  fillStyle?: StyleProp<ViewStyle>;
  backgroundChildren?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * AnimatedProgressBar — 100% GPU UI-thread horizontal bar reveal.
 * Replays cleanly via TabReplayContext SharedValues without React root re-renders or 100% blink.
 */
export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = React.memo(
  function AnimatedProgressBar({
    progress,
    minVisualRatio = 0,
    color,
    trackColor,
    height = 6,
    borderRadius = 999,
    delayMs = 0,
    durationMs = 520,
    replayKey = 0,
    style,
    trackStyle,
    fillStyle,
    backgroundChildren,
    children,
  }) {
    const { tokens } = useTheme();

    const safeRatio = Number.isFinite(progress)
      ? Math.max(0, Math.min(1, progress))
      : 0;
    const target =
      safeRatio > 0 && minVisualRatio > 0
        ? Math.max(minVisualRatio, safeRatio)
        : safeRatio;

    const scaleX = useSharedValue(target);
    const prevReplayRef = useRef<number | string>(replayKey);

    useEffect(() => {
      cancelAnimation(scaleX);
      if (prevReplayRef.current !== replayKey) {
        prevReplayRef.current = replayKey;
        scaleX.value = 0;
      }

      if (target <= 0) {
        scaleX.value = withTiming(0, { duration: 240, easing: iosEasing.decel });
        return;
      }

      scaleX.value = withDelay(
        delayMs,
        withTiming(target, {
          duration: durationMs,
          easing: iosEasing.decel,
        })
      );
    }, [target, delayMs, durationMs, replayKey, scaleX]);

    const fillAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scaleX: scaleX.value }],
    }));

    return (
      <View
        style={[
          styles.track,
          {
            height,
            borderRadius,
            backgroundColor: trackColor ?? tokens.bg.elevated,
          },
          trackStyle,
          style,
        ]}
      >
        {backgroundChildren}
        <Animated.View
          style={[
            styles.fill,
            {
              height: '100%',
              borderRadius,
              backgroundColor: color ?? tokens.accent.primary,
              transformOrigin: 'left',
            },
            fillStyle,
            fillAnimatedStyle,
          ]}
        />
        {children}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    width: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
});

export default AnimatedProgressBar;
