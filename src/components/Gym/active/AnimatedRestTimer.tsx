import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  Keyboard,
  DeviceEventEmitter,
} from 'react-native';
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
  onEditDuration?: () => void;
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

    // Entrance slide animation
    const slideAnim = useRef(new Animated.Value(80)).current;
    useEffect(() => {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    }, [slideAnim]);

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

    const togglePause = useCallback(() => {
      hapticMedium();
      if (isPaused) {
        // Resuming
        if (pausedAt) {
          setAccumulatedPauseMs(prev => prev + (Date.now() - pausedAt));
        }
        setPausedAt(null);
        setIsPaused(false);
      } else {
        // Pausing
        setPausedAt(Date.now());
        setIsPaused(true);
      }
    }, [isPaused, pausedAt]);

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
          // Trigger high-contrast screen flash
          DeviceEventEmitter.emit('gym_rest_timer_flash');
          onSkipRef.current();
          return;
        }

        // Precision tick aligned to next full second boundary
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

    if (isKeyboardVisible) return null;

    // Calculate elapsed progress percentage for top progress bar
    const progressPct = durationSecs > 0
      ? Math.min(100, Math.max(0, ((durationSecs - remSecs) / durationSecs) * 100))
      : 0;

    return (
      <Animated.View style={[styles.wrapper, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.dockCard}>
          {/* Top animated linear progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>

          {/* Main content row */}
          <View style={styles.contentRow}>
            {/* Left: Huge bold countdown + Rest duration link */}
            <TouchableOpacity
              style={styles.leftCol}
              onPress={() => {
                hapticLight();
                onEditDuration?.();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.timeText}>{formatTime(remSecs)}</Text>
              <View style={styles.restSubRow}>
                <Text style={styles.restSubText}>Rest</Text>
                <Ionicons name="chevron-down" size={11} color="#8E8E93" />
              </View>
            </TouchableOpacity>

            {/* Center: -15s, +15s, and Pause/Resume */}
            <View style={styles.centerControls}>
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  onSubtract();
                }}
                style={styles.deltaPill}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                activeOpacity={0.7}
              >
                <Text style={styles.deltaText}>− 15s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  onAdd();
                }}
                style={styles.deltaPill}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                activeOpacity={0.7}
              >
                <Text style={styles.deltaText}>+ 15s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={togglePause}
                style={styles.pauseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isPaused ? 'play' : 'pause'}
                  size={14}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            {/* Right: Vibrant Green Skip Button */}
            <TouchableOpacity
              onPress={() => {
                hapticMedium();
                onSkip();
              }}
              style={styles.skipBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  }
);

export default AnimatedRestTimer;
