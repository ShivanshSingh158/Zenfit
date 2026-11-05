import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Platform,
  Keyboard,
  DeviceEventEmitter,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight, hapticMedium } from '../../../utils/haptics';
import { useTheme } from '../../../contexts/ThemeContext';
import { makeAnimatedRestTimerStyles } from './animatedRestTimerStyles';
import {
  playCountdownTick,
  playTimerFinishChime,
  isAudioCuesEnabledGlobal,
  startRestTimerBackgroundAudioSession,
  stopRestTimerBackgroundAudioSession,
} from '../../../services/gymSoundSynthesizer';

interface AnimatedRestTimerProps {
  startTime: number;
  durationSecs: number;
  onAdd: () => void;
  onSubtract: () => void;
  onSkip: () => void;
  onEditDuration?: (currentRemainingSecs?: number) => void;
}

function formatTime(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const AnimatedRestTimer: React.FC<AnimatedRestTimerProps> = React.memo(
  function AnimatedRestTimer({
    startTime,
    durationSecs,
    onAdd,
    onSubtract,
    onSkip,
    onEditDuration,
  }: AnimatedRestTimerProps) {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => makeAnimatedRestTimerStyles(colors, isDark), [colors, isDark]);

    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [pausedAt, setPausedAt] = useState<number | null>(null);
    const [accumulatedPauseMs, setAccumulatedPauseMs] = useState(0);

    const lastBeepSecRef = useRef<number | null>(null);

    // Hide or adjust when keyboard shows
    useEffect(() => {
      const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
      const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
      const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
      const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));
      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, []);

    // ── 1. Native Spring Entrance Animation (0 -> 100 with damping & stiffness) ──
    const translateY = useSharedValue(90);
    useEffect(() => {
      translateY.value = withSpring(0, {
        damping: 14,
        stiffness: 120,
        mass: 0.8,
      });
    }, [translateY]);

    const dockAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    // ── 2. Continuous 60FPS/120FPS Liquid Progress Bar on UI Thread ──
    const progressWidth = useSharedValue(0);

    const restartProgressAnimation = useCallback((currentElapsedMs: number, totalDurationMs: number) => {
      const initialPct = totalDurationMs > 0
        ? Math.min(100, Math.max(0, (currentElapsedMs / totalDurationMs) * 100))
        : 0;
      progressWidth.value = initialPct;

      const remainingMs = Math.max(0, totalDurationMs - currentElapsedMs);
      if (remainingMs > 0) {
        progressWidth.value = withTiming(100, {
          duration: remainingMs,
          easing: Easing.linear,
        });
      } else {
        progressWidth.value = 100;
      }
    }, [progressWidth]);

    const animatedProgressStyle = useAnimatedStyle(() => ({
      width: `${progressWidth.value}%`,
    }));

    const [remSecs, setRemSecs] = useState(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      return Math.max(0, durationSecs - elapsed);
    });

    const onSkipRef = useRef(onSkip);
    useEffect(() => {
      onSkipRef.current = onSkip;
    }, [onSkip]);

    useEffect(() => {
      lastBeepSecRef.current = null;
      startRestTimerBackgroundAudioSession().catch(() => {});
      return () => {
        stopRestTimerBackgroundAudioSession().catch(() => {});
      };
    }, [startTime, durationSecs]);

    // Initialize or update liquid progress bar when timer starts or duration changes
    useEffect(() => {
      if (!isPaused) {
        const elapsedMs = Math.max(0, Date.now() - startTime - accumulatedPauseMs);
        const totalDurationMs = durationSecs * 1000;
        restartProgressAnimation(elapsedMs, totalDurationMs);
      }
    }, [startTime, durationSecs, isPaused, accumulatedPauseMs, restartProgressAnimation]);

    const togglePause = useCallback(() => {
      hapticMedium();
      if (isPaused) {
        // Resuming
        const newAccum = pausedAt ? accumulatedPauseMs + (Date.now() - pausedAt) : accumulatedPauseMs;
        setAccumulatedPauseMs(newAccum);
        setPausedAt(null);
        setIsPaused(false);
      } else {
        // Pausing
        cancelAnimation(progressWidth);
        setPausedAt(Date.now());
        setIsPaused(true);
      }
    }, [isPaused, pausedAt, accumulatedPauseMs, progressWidth]);

    // Precision numerical countdown clock for text
    useEffect(() => {
      if (isPaused) return;

      let skipped = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const updateTimer = () => {
        if (skipped) return;
        const now = Date.now();
        const effectiveStartTime = startTime + accumulatedPauseMs;
        const elapsed = Math.floor((now - effectiveStartTime) / 1000);
        const remaining = Math.max(0, durationSecs - elapsed);

        setRemSecs(remaining);

        // 3-2-1 Audio Countdown Beeps (OpenGym / ZenFit Audio Synthesizer)
        if (isAudioCuesEnabledGlobal()) {
          if (remaining > 0 && remaining <= 3 && lastBeepSecRef.current !== remaining) {
            lastBeepSecRef.current = remaining;
            playCountdownTick();
          }
        }

        if (remaining <= 0) {
          playTimerFinishChime();
          DeviceEventEmitter.emit('gym_rest_timer_flash');
          onSkipRef.current();
          return;
        }

        const elapsedExact = (now - effectiveStartTime) / 1000;
        const msUntilNextSec = Math.max(50, Math.round((Math.ceil(elapsedExact) - elapsedExact) * 1000));
        timeoutId = setTimeout(updateTimer, msUntilNextSec);
      };

      updateTimer();

      return () => {
        skipped = true;
        if (timeoutId) clearTimeout(timeoutId);
      };
    }, [startTime, durationSecs, isPaused, accumulatedPauseMs]);

    // ── Button Tactile Scale Springs (0.92 on press-in, spring return on release) ──
    const skipScale = useSharedValue(1);
    const subScale = useSharedValue(1);
    const addScale = useSharedValue(1);
    const pauseScale = useSharedValue(1);

    const skipAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: skipScale.value }] }));
    const subAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: subScale.value }] }));
    const addAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: addScale.value }] }));
    const pauseAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: pauseScale.value }] }));

    if (isKeyboardVisible) return null;

    return (
      <Animated.View style={[styles.wrapper, dockAnimatedStyle]}>
        <View style={styles.dockCard}>
          {/* Top 60FPS continuous liquid progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, animatedProgressStyle]} />
          </View>

          {/* Main content row */}
          <View style={styles.contentRow}>
            {/* Left: Huge bold countdown + Rest duration link */}
            <TouchableOpacity
              style={styles.leftCol}
              onPress={() => {
                hapticLight();
                onEditDuration?.(remSecs);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.timeText}>{formatTime(remSecs)}</Text>
              <View style={styles.restSubRow}>
                <Text style={styles.restSubText}>Rest</Text>
                <Ionicons name="chevron-down" size={11} color="#8E8E93" />
              </View>
            </TouchableOpacity>

            {/* Center: -15s, +15s, and Pause/Resume with Spring Touch */}
            <View style={styles.centerControls}>
              <Pressable
                onPressIn={() => { subScale.value = withTiming(0.9, { duration: 60 }); }}
                onPressOut={() => { subScale.value = withSpring(1, { damping: 12, stiffness: 220 }); }}
                onPress={() => {
                  hapticLight();
                  onSubtract();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Animated.View style={[styles.deltaPill, subAnimStyle]}>
                  <Text style={styles.deltaText}>− 15s</Text>
                </Animated.View>
              </Pressable>

              <Pressable
                onPressIn={() => { addScale.value = withTiming(0.9, { duration: 60 }); }}
                onPressOut={() => { addScale.value = withSpring(1, { damping: 12, stiffness: 220 }); }}
                onPress={() => {
                  hapticLight();
                  onAdd();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Animated.View style={[styles.deltaPill, addAnimStyle]}>
                  <Text style={styles.deltaText}>+ 15s</Text>
                </Animated.View>
              </Pressable>

              <Pressable
                onPressIn={() => { pauseScale.value = withTiming(0.9, { duration: 60 }); }}
                onPressOut={() => { pauseScale.value = withSpring(1, { damping: 12, stiffness: 220 }); }}
                onPress={togglePause}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Animated.View style={[styles.pauseBtn, pauseAnimStyle]}>
                  <Ionicons
                    name={isPaused ? 'play' : 'pause'}
                    size={14}
                    color="#FFFFFF"
                  />
                </Animated.View>
              </Pressable>
            </View>

            {/* Right: Vibrant Green Skip Button with Tactile Spring */}
            <Pressable
              onPressIn={() => { skipScale.value = withTiming(0.92, { duration: 60 }); }}
              onPressOut={() => { skipScale.value = withSpring(1, { damping: 12, stiffness: 220 }); }}
              onPress={() => {
                hapticMedium();
                onSkip();
              }}
            >
              <Animated.View style={[styles.skipBtn, skipAnimStyle]}>
                <Text style={styles.skipText}>Skip</Text>
              </Animated.View>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  }
);

export default AnimatedRestTimer;
