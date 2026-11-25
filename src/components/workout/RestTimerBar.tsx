import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Platform,
  Keyboard,
  DeviceEventEmitter,
  StyleSheet,
  LayoutChangeEvent,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Play, Pause, Timer, ChevronUp, ChevronDown, Pencil } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { springs } from '../../theme/motion';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import {
  playCountdownTick,
  isAudioCuesEnabledGlobal,
} from '../../services/gymSoundSynthesizer';
import { useGlobalRestTimer } from '../../services/restTimerService';
import { TactileButton } from '../ui/TactileButton';
import { NumericText } from '../ui/NumericText';
import { AppIcon } from '../ui/AppIcon';

export interface RestTimerBarProps {
  startTime: number;
  durationSecs: number;
  onAdd: () => void;
  onSubtract: () => void;
  onSkip: () => void;
  onEditDuration?: (currentRemainingSecs?: number) => void;
  exerciseName?: string;
  bottomOffset?: number;
  onPressCard?: () => void;
}

function formatTime(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * RestTimerBar — GPU-composited rest countdown dock.
 * Animates progress via `translateX` on the native UI thread (zero width layout reflows).
 */
export const RestTimerBar: React.FC<RestTimerBarProps> = React.memo(
  function RestTimerBar({
    startTime,
    durationSecs,
    onAdd,
    onSubtract,
    onSkip,
    onEditDuration,
    bottomOffset,
    onPressCard,
  }) {
    const { tokens, isDark } = useTheme();
    const { width: windowWidth } = useWindowDimensions();
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const { togglePause: toggleGlobalPause, timer: globalTimer } = useGlobalRestTimer();
    const isPaused = globalTimer?.isPaused ?? false;
    const [trackWidth, setTrackWidth] = useState(() => Math.max(0, windowWidth - 26 * 2));
    const [isMinimized, setIsMinimized] = useState(false);

    const lastBeepSecRef = useRef<number | null>(null);

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

    const translateY = useSharedValue(90);
    useEffect(() => {
      translateY.value = withSpring(0, springs.standard);
    }, [translateY]);

    const dockAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    // 0 -> 1 progress mapped onto GPU translateX (0 layout width updates)
    const progress = useSharedValue(0);

    const restartProgressAnimation = useCallback(
      (currentElapsedMs: number, totalDurationMs: number) => {
        const initialRatio =
          totalDurationMs > 0
            ? Math.min(1, Math.max(0, currentElapsedMs / totalDurationMs))
            : 0;
        progress.value = initialRatio;

        const remainingMs = Math.max(0, totalDurationMs - currentElapsedMs);
        if (remainingMs > 0) {
          progress.value = withTiming(1, {
            duration: remainingMs,
            easing: Easing.linear,
          });
        } else {
          progress.value = 1;
        }
      },
      [progress]
    );

    const animatedProgressStyle = useAnimatedStyle(() => ({
      transform: [
        {
          translateX:
            trackWidth > 0 ? -(1 - progress.value) * trackWidth : -trackWidth,
        },
      ],
    }));

    const [remSecs, setRemSecs] = useState(() => {
      if (isPaused && globalTimer?.pausedRemainingSecs != null) {
        return Math.max(0, Math.round(globalTimer.pausedRemainingSecs));
      }
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      return Math.max(0, durationSecs - elapsed);
    });

    const onSkipRef = useRef(onSkip);
    useEffect(() => {
      onSkipRef.current = onSkip;
    }, [onSkip]);

    useEffect(() => {
      lastBeepSecRef.current = null;
    }, [startTime, durationSecs]);

    useEffect(() => {
      if (!isPaused) {
        const elapsedMs = Math.max(0, Date.now() - startTime);
        const totalDurationMs = durationSecs * 1000;
        restartProgressAnimation(elapsedMs, totalDurationMs);
      }
    }, [startTime, durationSecs, isPaused, restartProgressAnimation]);

    const togglePause = useCallback(() => {
      hapticMedium();
      if (isPaused) {
        cancelAnimation(progress);
      }
      toggleGlobalPause();
    }, [isPaused, toggleGlobalPause, progress]);

    useEffect(() => {
      if (isPaused) return;
      let skipped = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const updateTimer = () => {
        if (skipped) return;
        const now = Date.now();
        const effectiveStartTime = startTime;
        const elapsed = Math.floor((now - effectiveStartTime) / 1000);
        const remaining = Math.max(0, durationSecs - elapsed);

        setRemSecs(remaining);

        if (isAudioCuesEnabledGlobal()) {
          if (remaining > 0 && remaining <= 3 && lastBeepSecRef.current !== remaining) {
            lastBeepSecRef.current = remaining;
            playCountdownTick();
          }
        }

        if (remaining <= 0) {
          DeviceEventEmitter.emit('gym_rest_timer_flash');
          onSkipRef.current();
          return;
        }

        const elapsedExact = (now - effectiveStartTime) / 1000;
        const msUntilNextSec = Math.max(
          50,
          Math.round((Math.ceil(elapsedExact) - elapsedExact) * 1000)
        );
        timeoutId = setTimeout(updateTimer, msUntilNextSec);
      };

      updateTimer();

      return () => {
        skipped = true;
        if (timeoutId) clearTimeout(timeoutId);
      };
    }, [startTime, durationSecs, isPaused]);

    const handleTrackLayout = (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      if (w > 0 && Math.abs(w - trackWidth) > 0.5) {
        setTrackWidth(w);
      }
    };

    if (isKeyboardVisible) return null;

    if (isMinimized) {
      return (
        <Animated.View
          style={[
            styles.wrapper,
            bottomOffset != null ? { bottom: bottomOffset } : null,
            dockAnimatedStyle,
          ]}
        >
          <View
            style={[
              styles.minimizedPill,
              {
                backgroundColor: isDark ? '#14161D' : '#FFFFFF',
                borderRadius: tokens.radius.card,
                borderColor: isDark ? 'rgba(255,255,255,0.14)' : tokens.border.subtle,
              },
            ]}
          >
            <TactileButton
              variant="custom"
              style={styles.minimizedContent}
              onPress={() => setIsMinimized(false)}
            >
              <AppIcon icon={Timer} size={15} color={tokens.accent.primary} />
              <NumericText style={[styles.minimizedTimeText, { color: tokens.text.primary }]}>
                {formatTime(remSecs)}
              </NumericText>
              <Text style={[tokens.typography.caption, { color: tokens.text.secondary }]}>
                Rest
              </Text>
              <AppIcon icon={ChevronUp} size={14} color={tokens.text.secondary} />
            </TactileButton>

            <TactileButton
              variant="primary"
              haptic="medium"
              onPress={onSkip}
              style={{
                minHeight: 36,
                paddingHorizontal: 14,
                borderRadius: tokens.radius.inner,
              }}
            >
              <Text style={[tokens.typography.label, { color: tokens.accent.onPrimary }]}>
                Skip
              </Text>
            </TactileButton>
          </View>
        </Animated.View>
      );
    }

    return (
      <Animated.View
        style={[
          styles.wrapper,
          bottomOffset != null ? { bottom: bottomOffset } : null,
          dockAnimatedStyle,
        ]}
      >
        <TactileButton
          variant="custom"
          scaleTo={0.99}
          haptic="none"
          onPress={() => onPressCard?.()}
          style={[
            styles.dockCard,
            {
              backgroundColor: isDark ? '#14161D' : '#FFFFFF',
              borderRadius: tokens.radius.card,
              borderColor: isDark ? 'rgba(255,255,255,0.14)' : tokens.border.subtle,
            },
          ]}
        >
          {Platform.OS === 'ios' && (
            <BlurView
              intensity={30}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          )}

          {/* GPU-Accelerated Progress Track */}
          <View
            onLayout={handleTrackLayout}
            style={[styles.progressTrack, { backgroundColor: tokens.border.subtle }]}
          >
            <Animated.View
              style={[
                styles.progressFill,
                { backgroundColor: tokens.accent.primary },
                animatedProgressStyle,
              ]}
            />
          </View>

          <View style={styles.contentRow}>
            {/* Countdown & Editable Time + Minimize */}
            <View style={styles.leftCol}>
              <TactileButton
                variant="custom"
                onPress={() => onEditDuration?.(remSecs)}
                style={{ alignItems: 'flex-start' }}
              >
                <NumericText style={[styles.timeText, { color: tokens.text.primary }]}>
                  {formatTime(remSecs)}
                </NumericText>
              </TactileButton>
              <View style={styles.restSubRow}>
                <TactileButton
                  variant="custom"
                  onPress={() => onEditDuration?.(remSecs)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Text style={[tokens.typography.caption, { color: tokens.text.secondary }]}>
                    Rest
                  </Text>
                  <AppIcon icon={Pencil} size={10} color={tokens.text.muted} />
                </TactileButton>
                <TactileButton
                  variant="custom"
                  hitSlop={tokens.touch.hitSlop}
                  onPress={() => setIsMinimized(true)}
                  style={styles.minimizeBtn}
                >
                  <AppIcon icon={ChevronDown} size={14} color={tokens.text.secondary} />
                </TactileButton>
              </View>
            </View>

            {/* Controls: -15s / +15s / Pause */}
            <View style={styles.centerControls}>
              <TactileButton
                variant="surface"
                onPress={onSubtract}
                style={[
                  styles.deltaPill,
                  { borderRadius: tokens.radius.inner },
                ]}
              >
                <NumericText style={[styles.deltaText, { color: tokens.text.primary }]}>
                  −15s
                </NumericText>
              </TactileButton>

              <TactileButton
                variant="surface"
                onPress={onAdd}
                style={[
                  styles.deltaPill,
                  { borderRadius: tokens.radius.inner },
                ]}
              >
                <NumericText style={[styles.deltaText, { color: tokens.text.primary }]}>
                  +15s
                </NumericText>
              </TactileButton>

              <TactileButton
                variant="surface"
                haptic="medium"
                onPress={togglePause}
                style={[
                  styles.pauseBtn,
                  { borderRadius: tokens.radius.inner },
                ]}
              >
                <AppIcon
                  icon={isPaused ? Play : Pause}
                  size={16}
                  color={tokens.text.primary}
                />
              </TactileButton>
            </View>

            {/* Primary Skip CTA */}
            <TactileButton
              variant="primary"
              haptic="medium"
              onPress={onSkip}
              style={[
                styles.skipBtn,
                { borderRadius: tokens.radius.inner },
              ]}
            >
              <Text
                maxFontSizeMultiplier={1.2}
                style={[
                  tokens.typography.label,
                  { fontFamily: tokens.font.bold, color: tokens.accent.onPrimary },
                ]}
              >
                Skip
              </Text>
            </TactileButton>
          </View>
        </TactileButton>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  dockCard: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  minimizedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 5,
    minHeight: 46,
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 38,
  },
  minimizedTimeText: {
    fontSize: 15,
  },
  progressTrack: {
    height: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  leftCol: {
    flexDirection: 'column',
    justifyContent: 'center',
    minWidth: 64,
  },
  timeText: {
    fontSize: 22,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  restSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  minimizeBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deltaPill: {
    minWidth: 44,
    minHeight: 38,
    paddingHorizontal: 8,
  },
  deltaText: {
    fontSize: 12,
  },
  pauseBtn: {
    width: 38,
    height: 38,
    paddingHorizontal: 0,
  },
  skipBtn: {
    minHeight: 38,
    paddingHorizontal: 14,
  },
});

export default RestTimerBar;
