import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  InteractionManager,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  withSpring,
  cancelAnimation,
  interpolate,
  Extrapolation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GymSet } from '../../types/gym.types';
import { useTheme } from '../../contexts/ThemeContext';
import { springs, durations } from '../../theme/motion';
import {
  hapticLight,
  hapticMedium,
  hapticSelection,
  hapticSuccess,
} from '../../utils/haptics';
import { NumericText } from '../ui/NumericText';

const SWIPE_THRESHOLD = 60;
const MAX_SWIPE = 88;

const BlinkingCursor: React.FC = React.memo(() => {
  const { tokens } = useTheme();
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 450, easing: Easing.linear }),
        withTiming(1, { duration: 450, easing: Easing.linear })
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(opacity);
      opacity.value = 1;
    };
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 2,
          height: 16,
          backgroundColor: tokens.accent.primary,
          marginLeft: 2,
          borderRadius: 1,
        },
        animStyle,
      ]}
    />
  );
});

const cleanDisplayNumber = (val?: string | number): string => {
  if (val === undefined || val === null || val === '') return '';
  const str = String(val).trim();
  if (!str) return '';
  if (str.endsWith('.')) return str;
  const num = Number(str);
  if (!isNaN(num) && str.includes('.')) {
    return String(Math.round(num * 100) / 100);
  }
  return str;
};

export interface WorkoutSetRowProps {
  set: GymSet;
  idx: number;
  isActive: boolean;
  isCompleted: boolean;
  isNarrow?: boolean;
  displayWeight: string;
  displayReps: string;
  colors?: any;
  isDark?: boolean;
  styles?: any;
  placeholderWeight?: string;
  placeholderReps?: string;
  activeKeypadField?: 'weight' | 'reps' | null;
  isFieldSelected?: boolean;
  onTextChange?: (field: 'weight' | 'reps', text: string) => void;
  onBlur?: () => void;
  onToggleComplete?: () => void;
  onLongPress?: () => void;
  onAction?: (
    idx: number,
    action:
      | 'textChange'
      | 'blur'
      | 'toggle'
      | 'delete'
      | 'swipe'
      | 'cycleType'
      | 'copyPrev'
      | 'focusField'
      | 'requestDelete'
      | 'setRest',
    payload?: any
  ) => void;
}

export const WorkoutSetRow: React.FC<WorkoutSetRowProps> = React.memo(
  ({
    set,
    idx,
    isActive,
    isCompleted,
    isNarrow = false,
    displayWeight,
    displayReps,
    placeholderWeight,
    placeholderReps,
    activeKeypadField,
    isFieldSelected = false,
    onAction,
    onToggleComplete,
    onLongPress,
  }) => {
    const { tokens, isDark } = useTheme();
    const checkScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const isCompletedSV = useSharedValue(isCompleted ? 1 : 0);
    const isCompletedRef = React.useRef(isCompleted);
    isCompletedRef.current = isCompleted;

    React.useEffect(() => {
      isCompletedSV.value = isCompleted ? 1 : 0;
    }, [isCompleted, isCompletedSV]);

    const animatedCheckStyle = useAnimatedStyle(() => ({
      transform: [{ scale: checkScale.value }],
    }));

    const completeRailStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateX.value,
        [0, SWIPE_THRESHOLD],
        [0, 1],
        Extrapolation.CLAMP
      ),
      transform: [
        {
          scale: interpolate(
            translateX.value,
            [0, SWIPE_THRESHOLD],
            [0.75, 1],
            Extrapolation.CLAMP
          ),
        },
      ],
    }));

    const deleteRailStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateX.value,
        [-SWIPE_THRESHOLD, 0],
        [1, 0],
        Extrapolation.CLAMP
      ),
      transform: [
        {
          scale: interpolate(
            translateX.value,
            [-SWIPE_THRESHOLD, 0],
            [1, 0.75],
            Extrapolation.CLAMP
          ),
        },
      ],
    }));

    const rowAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
    }));

    const handleToggleCompleteInternal = useCallback(() => {
      if (!isCompletedRef.current) {
        hapticSuccess();
        checkScale.value = withSequence(
          withTiming(0.84, { duration: durations.tactilePressIn }),
          withSpring(1.18, springs.bouncy),
          withSpring(1.0, springs.tactile)
        );
      } else {
        hapticLight();
        checkScale.value = withSequence(
          withTiming(0.9, { duration: 60 }),
          withSpring(1.0, springs.tactile)
        );
      }
      if (onAction) {
        onAction(idx, 'toggle');
      } else if (onToggleComplete) {
        onToggleComplete();
      }
    }, [idx, onAction, onToggleComplete, checkScale]);

    const onSwipeComplete = useCallback(() => {
      if (!isCompletedRef.current) {
        hapticSuccess();
        checkScale.value = withSequence(
          withTiming(0.84, { duration: 60 }),
          withSpring(1.18, springs.bouncy),
          withSpring(1.0, springs.tactile)
        );
        InteractionManager.runAfterInteractions(() => {
          if (onAction) {
            onAction(idx, 'swipe');
          } else if (onToggleComplete) {
            onToggleComplete();
          }
        });
      }
    }, [idx, onAction, onToggleComplete, checkScale]);

    const handleDeleteInternal = useCallback(() => {
      hapticMedium();
      if (onAction) {
        onAction(idx, 'requestDelete');
      }
    }, [idx, onAction]);

    const triggerHapticLight = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }, []);

    // Native UI-thread RNGH v2 Pan Gesture (memoized to prevent per-render object churn)
    const panGesture = useMemo(
      () =>
        Gesture.Pan()
          .activeOffsetX([-12, 12])
          .failOffsetY([-22, 22])
          .onStart(() => {
            'worklet';
            runOnJS(triggerHapticLight)();
          })
          .onUpdate((event) => {
            'worklet';
            translateX.value = isCompletedSV.value === 1
              ? Math.max(-MAX_SWIPE, Math.min(0, event.translationX))
              : Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, event.translationX));
          })
          .onEnd(() => {
            'worklet';
            const completedNow = isCompletedSV.value === 1;
            if (!completedNow && translateX.value >= SWIPE_THRESHOLD) {
              runOnJS(onSwipeComplete)();
            } else if (translateX.value <= -SWIPE_THRESHOLD) {
              runOnJS(handleDeleteInternal)();
            }
            translateX.value = withSpring(0, springs.tactile);
          }),
      [triggerHapticLight, translateX, isCompletedSV, onSwipeComplete, handleDeleteInternal]
    );

    const handleLongPressInternal = useCallback(() => {
      if (onLongPress) {
        onLongPress();
      } else {
        handleDeleteInternal();
      }
    }, [onLongPress, handleDeleteInternal]);

    const handleCycleTypeInternal = useCallback(() => {
      hapticSelection();
      onAction?.(idx, 'cycleType');
    }, [idx, onAction]);

    // Badge Styling
    let setBadgeText = `${set.setNumber || idx + 1}`;
    let setBadgeColor = tokens.text.secondary;
    let setBadgeBg = isDark ? '#181B24' : tokens.bg.elevated;

    if (set.setType === 'drop') {
      setBadgeText = 'D';
      setBadgeColor = tokens.status.info;
      setBadgeBg = tokens.status.infoDim;
    } else if (set.setType === 'failure') {
      setBadgeText = 'F';
      setBadgeColor = tokens.status.danger;
      setBadgeBg = tokens.status.dangerDim;
    } else if (set.isWarmup || set.setType === 'warmup') {
      setBadgeText = set.warmupLabel || 'W';
      setBadgeColor = tokens.status.warning;
      setBadgeBg = tokens.status.warningDim;
    } else if (isCompleted) {
      setBadgeColor = tokens.status.onSuccess;
      setBadgeBg = tokens.status.success;
    } else if (isActive) {
      setBadgeColor = tokens.accent.onPrimary;
      setBadgeBg = tokens.accent.primary;
    }

    const isWeightActive = !isCompleted && activeKeypadField === 'weight';
    const isRepsActive = !isCompleted && activeKeypadField === 'reps';

    const weightFormatted = displayWeight
      ? cleanDisplayNumber(displayWeight)
      : placeholderWeight || '0';
    const repsFormatted = displayReps
      ? cleanDisplayNumber(displayReps)
      : placeholderReps || '8';

    return (
      <View style={rowStyles.swipeContainer}>
        {/* Underlay Swipe Action Tracks */}
        <View style={rowStyles.underlay} pointerEvents="none">
          <Animated.View
            style={[
              rowStyles.swipeBadge,
              { backgroundColor: tokens.status.successDim },
              completeRailStyle,
            ]}
          >
            <Ionicons
              name="checkmark"
              size={16}
              color={tokens.status.success}
            />
          </Animated.View>
          <Animated.View
            style={[
              rowStyles.swipeBadge,
              { backgroundColor: tokens.status.dangerDim },
              deleteRailStyle,
            ]}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color={tokens.status.danger}
            />
          </Animated.View>
        </View>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              rowStyles.rowContainer,
              {
                backgroundColor: isCompleted
                  ? tokens.status.successDim
                  : isActive
                  ? (isDark ? '#14161D' : tokens.bg.elevated)
                  : (isDark ? '#0F1015' : tokens.bg.surface),
                borderRadius: tokens.radius.inner,
              },
              isActive &&
                !isCompleted && {
                  borderWidth: tokens.border.hairlineWidth,
                  borderColor: tokens.border.subtle,
                },
              rowAnimatedStyle,
            ]}
          >
            {/* 1. SET # BADGE (44x48dp touch target) */}
            <Pressable
              onPress={isCompleted ? undefined : handleCycleTypeInternal}
              onLongPress={handleLongPressInternal}
              style={[rowStyles.colSet, isNarrow && { width: 38 }]}
              hitSlop={tokens.touch.hitSlop}
              accessibilityRole="button"
              accessibilityLabel={
                isCompleted
                  ? `Set ${setBadgeText}, long press to delete`
                  : `Set ${setBadgeText}, tap to change set type`
              }
            >
              <View
                style={[
                  rowStyles.setBadgeWrap,
                  {
                    backgroundColor: setBadgeBg,
                    borderRadius: tokens.radius.inner,
                  },
                ]}
              >
                <NumericText
                  style={[rowStyles.setNumberText, { color: setBadgeColor }]}
                >
                  {setBadgeText}
                </NumericText>
              </View>
            </Pressable>

            {/* 2. WEIGHT INPUT TILE (48dp minHeight, concentric 10px radius) */}
            <View style={rowStyles.colWeight}>
              <Pressable
                onPress={() => {
                  hapticLight();
                  onAction?.(idx, 'focusField', 'weight');
                }}
                style={[
                  rowStyles.inputTile,
                  {
                    borderRadius: tokens.radius.inner,
                    backgroundColor: isCompleted
                      ? 'transparent'
                      : isWeightActive
                      ? tokens.accent.primaryDim
                      : (isDark ? '#181B24' : tokens.bg.elevated),
                    borderWidth: isWeightActive ? 1.5 : tokens.border.hairlineWidth,
                    borderColor: isWeightActive
                      ? tokens.accent.primary
                      : isCompleted
                      ? 'transparent'
                      : tokens.border.subtle,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Weight ${weightFormatted}`}
              >
                <View style={rowStyles.textWithCursorContainer}>
                  <NumericText
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    style={[
                      rowStyles.numericInputText,
                      {
                        color: !displayWeight && !isWeightActive
                          ? tokens.text.muted
                          : isCompleted
                          ? tokens.text.secondary
                          : tokens.text.primary,
                      },
                      isWeightActive &&
                        isFieldSelected && {
                          backgroundColor: tokens.accent.primaryDim,
                          borderRadius: tokens.radius.xs,
                          paddingHorizontal: 4,
                        },
                    ]}
                  >
                    {weightFormatted}
                  </NumericText>
                  {isWeightActive && !isFieldSelected && <BlinkingCursor />}
                </View>
              </Pressable>
            </View>

            {/* 4. REPS INPUT TILE (48dp minHeight, concentric 10px radius) */}
            <View style={rowStyles.colReps}>
              <Pressable
                onPress={() => {
                  hapticLight();
                  onAction?.(idx, 'focusField', 'reps');
                }}
                style={[
                  rowStyles.inputTile,
                  {
                    borderRadius: tokens.radius.inner,
                    backgroundColor: isCompleted
                      ? 'transparent'
                      : isRepsActive
                      ? tokens.accent.primaryDim
                      : (isDark ? '#181B24' : tokens.bg.elevated),
                    borderWidth: isRepsActive ? 1.5 : tokens.border.hairlineWidth,
                    borderColor: isRepsActive
                      ? tokens.accent.primary
                      : isCompleted
                      ? 'transparent'
                      : tokens.border.subtle,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Reps ${repsFormatted}`}
              >
                <View style={rowStyles.textWithCursorContainer}>
                  <NumericText
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    style={[
                      rowStyles.numericInputText,
                      {
                        color: !displayReps && !isRepsActive
                          ? tokens.text.muted
                          : isCompleted
                          ? tokens.text.secondary
                          : tokens.text.primary,
                      },
                      isRepsActive &&
                        isFieldSelected && {
                          backgroundColor: tokens.accent.primaryDim,
                          borderRadius: tokens.radius.xs,
                          paddingHorizontal: 4,
                        },
                    ]}
                  >
                    {repsFormatted}
                  </NumericText>
                  {isRepsActive && !isFieldSelected && <BlinkingCursor />}
                </View>
              </Pressable>
            </View>

            {/* 5. COMPLETION CHECKBOX (Strict 48x48dp touch target, zero hitSlop bleed) */}
            <Pressable
              onPress={handleToggleCompleteInternal}
              style={[rowStyles.colCheck, isNarrow && { width: 42 }]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isCompleted }}
              accessibilityLabel={`Mark set ${setBadgeText} complete`}
            >
              <Animated.View
                style={[
                  rowStyles.checkBoxVisual,
                  {
                    borderRadius: tokens.radius.inner,
                    backgroundColor: isCompleted
                      ? set.isWarmup
                        ? tokens.status.warning
                        : tokens.status.success
                      : (isDark ? '#181B24' : tokens.bg.elevated),
                    borderWidth: isCompleted ? 0 : 1.5,
                    borderColor: isActive
                      ? tokens.accent.primary
                      : tokens.border.medium,
                  },
                  animatedCheckStyle,
                ]}
              >
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={
                    isCompleted
                      ? tokens.status.onSuccess
                      : tokens.text.muted
                  }
                />
              </Animated.View>
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </View>
    );
  },
  (prev, next) =>
    prev.idx === next.idx &&
    prev.isActive === next.isActive &&
    prev.isCompleted === next.isCompleted &&
    prev.isNarrow === next.isNarrow &&
    prev.activeKeypadField === next.activeKeypadField &&
    prev.isFieldSelected === next.isFieldSelected &&
    prev.displayWeight === next.displayWeight &&
    prev.displayReps === next.displayReps &&
    prev.placeholderWeight === next.placeholderWeight &&
    prev.placeholderReps === next.placeholderReps &&
    prev.isDark === next.isDark &&
    prev.onAction === next.onAction &&
    prev.onToggleComplete === next.onToggleComplete &&
    prev.onLongPress === next.onLongPress &&
    prev.set?.id === next.set?.id &&
    prev.set?.setNumber === next.set?.setNumber &&
    prev.set?.setType === next.set?.setType &&
    prev.set?.isWarmup === next.set?.isWarmup &&
    prev.set?.warmupLabel === next.set?.warmupLabel &&
    prev.set?.rir === next.set?.rir &&
    prev.set?.weight === next.set?.weight &&
    prev.set?.reps === next.set?.reps &&
    prev.set?.completed === next.set?.completed
);

const rowStyles = StyleSheet.create({
  swipeContainer: {
    position: 'relative',
    marginVertical: 2,
    overflow: 'hidden',
  },
  underlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  swipeBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  colSet: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBadgeWrap: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumberText: {
    fontSize: 13,
  },
  colWeight: {
    flex: 1.25,
    paddingHorizontal: 4,
  },
  colReps: {
    flex: 1.0,
    paddingHorizontal: 4,
  },
  inputTile: {
    width: '100%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  numericInputText: {
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  textWithCursorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colCheck: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxVisual: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default WorkoutSetRow;
