import React, { useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler, PanGestureHandlerGestureEvent, PanGestureHandlerStateChangeEvent, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { GymSet } from '../../../types/gym.types';
import { IOS_DARK, FONT_FAMILY } from '../../../theme/tokens';
import { hapticLight, hapticMedium, hapticSelection, hapticSuccess } from '../../../utils/haptics';

const BlinkingCursor: React.FC = React.memo(() => {
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
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 2,
          height: 18,
          backgroundColor: '#a599ff',
          marginLeft: 2,
          borderRadius: 1,
        },
        animStyle,
      ]}
    />
  );
});

export interface SwipeableSetRowProps {
  set: GymSet;
  idx: number;
  isActive: boolean;
  isCompleted: boolean;
  displayWeight: string;
  displayReps: string;
  colors?: any;
  isDark?: boolean;
  styles?: any;
  prevPerformance?: string;
  placeholderWeight?: string;
  placeholderReps?: string;
  activeKeypadField?: 'weight' | 'reps' | null;
  isFieldSelected?: boolean;
  onTextChange?: (field: 'weight' | 'reps', text: string) => void;
  onBlur?: () => void;
  onToggleComplete?: () => void;
  onLongPress?: () => void;
  onAction?: (idx: number, action: 'textChange' | 'blur' | 'toggle' | 'delete' | 'swipe' | 'cycleType' | 'copyPrev' | 'focusField', payload?: any) => void;
}

export const SwipeableSetRow: React.FC<SwipeableSetRowProps> = React.memo(({
  set,
  idx,
  isActive,
  isCompleted,
  displayWeight,
  displayReps,
  prevPerformance,
  placeholderWeight,
  placeholderReps,
  activeKeypadField,
  isFieldSelected = false,
  onAction,
  onToggleComplete,
  onLongPress,
}) => {
  const checkScale = useSharedValue(1);
  const translateX = useSharedValue(0);

  const animatedCheckStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const handleToggleCompleteInternal = useCallback(() => {
    if (!isCompleted) {
      hapticMedium();
      checkScale.value = withSequence(
        withTiming(0.85, { duration: 60, easing: Easing.out(Easing.quad) }),
        withTiming(1.15, { duration: 80, easing: Easing.out(Easing.cubic) }),
        withTiming(1.0, { duration: 60, easing: Easing.out(Easing.cubic) })
      );
    } else {
      hapticLight();
    }
    if (onAction) {
      onAction(idx, 'toggle');
    } else if (onToggleComplete) {
      onToggleComplete();
    }
  }, [idx, isCompleted, onAction, onToggleComplete, checkScale]);

  // Swipe-to-Complete handler (Swipe right locks in ghost values and triggers rest timer)
  const onSwipeComplete = useCallback(() => {
    if (!isCompleted) {
      hapticSuccess();
      checkScale.value = withSequence(
        withTiming(0.8, { duration: 50 }),
        withTiming(1.2, { duration: 90 }),
        withTiming(1.0, { duration: 50 })
      );
      if (onAction) {
        onAction(idx, 'swipe');
      } else if (onToggleComplete) {
        onToggleComplete();
      }
    }
  }, [idx, isCompleted, onAction, onToggleComplete, checkScale]);

  const onGestureEvent = useCallback((event: PanGestureHandlerGestureEvent) => {
    if (isCompleted) return;
    const { translationX } = event.nativeEvent;
    if (translationX > 0) {
      translateX.value = Math.min(translationX, 80);
    }
  }, [isCompleted, translateX]);

  const onHandlerStateChange = useCallback((event: PanGestureHandlerStateChangeEvent) => {
    if (isCompleted) return;
    if (event.nativeEvent.state === State.END || event.nativeEvent.state === State.CANCELLED) {
      const { translationX } = event.nativeEvent;
      if (translationX > 55) {
        runOnJS(onSwipeComplete)();
      }
      translateX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });
    }
  }, [isCompleted, onSwipeComplete, translateX]);

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleLongPressInternal = useCallback(() => {
    Alert.alert(
      'Delete Set',
      `Are you sure you want to delete Set ${set.setNumber || idx + 1}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onAction) {
              onAction(idx, 'delete');
            } else if (onLongPress) {
              onLongPress();
            }
          },
        },
      ]
    );
  }, [idx, set.setNumber, onAction, onLongPress]);

  const handleCycleTypeInternal = useCallback(() => {
    hapticSelection();
    if (onAction) {
      onAction(idx, 'cycleType');
    }
  }, [idx, onAction]);

  const handleCopyPrevInternal = useCallback(() => {
    if (prevPerformance && prevPerformance !== '—' && prevPerformance !== 'Warmup') {
      hapticSelection();
      if (onAction) {
        onAction(idx, 'copyPrev', prevPerformance);
      }
    }
  }, [idx, onAction, prevPerformance]);

  const prevText = prevPerformance || (set.isWarmup ? 'Warmup' : '—');

  // Compute set badge tag & color: Normal -> Warmup (W) -> Drop (D) -> Failure (F)
  let setBadgeText = `${set.setNumber || idx + 1}`;
  let setBadgeColor = IOS_DARK.labelPrimary;
  let setBadgeBg = 'transparent';

  if (set.setType === 'drop') {
    setBadgeText = 'D';
    setBadgeColor = '#38BDF8';
    setBadgeBg = 'rgba(56, 189, 248, 0.16)';
  } else if (set.setType === 'failure') {
    setBadgeText = 'F';
    setBadgeColor = '#FF453A';
    setBadgeBg = 'rgba(255, 69, 58, 0.16)';
  } else if (set.isWarmup || set.setType === 'warmup') {
    setBadgeText = set.warmupLabel || 'W';
    setBadgeColor = IOS_DARK.orange;
    setBadgeBg = 'rgba(255, 159, 10, 0.16)';
  } else if (isActive) {
    setBadgeColor = '#a599ff';
  } else if (isCompleted) {
    setBadgeColor = IOS_DARK.labelSecondary;
  }

  const isWeightActive = !isCompleted && activeKeypadField === 'weight';
  const isRepsActive = !isCompleted && activeKeypadField === 'reps';
  const isFutureSet = !isCompleted && !isActive;

  return (
    <PanGestureHandler
      activeOffsetX={[-15, 15]}
      failOffsetY={[-10, 10]}
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      enabled={!isCompleted}
    >
      <Animated.View
        style={[
          rowStyles.rowContainer,
          isActive && rowStyles.rowActive,
          isCompleted && rowStyles.rowCompleted,
          isFutureSet && rowStyles.rowFuture,
          rowAnimatedStyle,
        ]}
      >
        {/* 1. SET NUMBER COLUMN (Tap to cycle: Normal -> W -> D -> F) */}
        <TouchableOpacity
          onPress={isCompleted ? undefined : handleCycleTypeInternal}
          onLongPress={handleLongPressInternal}
          disabled={isCompleted}
          style={rowStyles.colSet}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={isCompleted ? 1 : 0.7}
        >
          <View style={[
            rowStyles.setBadgeWrap,
            setBadgeBg !== 'transparent' && { backgroundColor: setBadgeBg }
          ]}>
            <Text
              style={[
                rowStyles.setNumberText,
                { color: setBadgeColor },
                (isActive || set.setType) && { fontFamily: FONT_FAMILY.bold },
              ]}
            >
              {setBadgeText}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 2. PREVIOUS PERFORMANCE COLUMN (Tap to copy) */}
        <TouchableOpacity
          onPress={isCompleted ? undefined : handleCopyPrevInternal}
          disabled={isCompleted}
          style={rowStyles.colPrev}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          activeOpacity={isCompleted ? 1 : 0.7}
        >
          <Text style={rowStyles.prevText} numberOfLines={1}>
            {prevText}
          </Text>
          {set.rir !== undefined && set.rir !== null && (
            <Text style={rowStyles.rirBadge}>
              {set.rir === 0 ? 'FAIL' : `${set.rir}RIR`}
            </Text>
          )}
        </TouchableOpacity>

        {/* 3. WEIGHT INPUT COLUMN (Auto highlight-on-focus) */}
        <TouchableOpacity
          style={rowStyles.colInput}
          activeOpacity={isCompleted ? 1 : 0.75}
          disabled={isCompleted}
          onPress={() => {
            if (isCompleted) return;
            hapticLight();
            onAction?.(idx, 'focusField', 'weight');
          }}
        >
          <View
            style={[
              rowStyles.numericInput,
              isCompleted && rowStyles.numericInputCompleted,
              isActive && rowStyles.numericInputActive,
              isWeightActive && rowStyles.numericInputActiveKeypad,
              isWeightActive && isFieldSelected && rowStyles.numericInputSelected,
            ]}
          >
            <View style={rowStyles.textWithCursorContainer}>
              <Text
                style={[
                  rowStyles.numericInputText,
                  !displayWeight && !isWeightActive && { color: IOS_DARK.labelTertiary },
                  isCompleted && rowStyles.numericInputTextCompleted,
                  isWeightActive && rowStyles.numericInputTextActive,
                  isWeightActive && isFieldSelected && { backgroundColor: 'rgba(165, 153, 255, 0.35)', borderRadius: 4, paddingHorizontal: 3 },
                ]}
                numberOfLines={1}
              >
                {displayWeight || (isWeightActive ? '' : (placeholderWeight || '0'))}
              </Text>
              {isWeightActive && !isFieldSelected && <BlinkingCursor />}
            </View>
          </View>
        </TouchableOpacity>

        {/* 4. REPS INPUT COLUMN (Auto highlight-on-focus) */}
        <TouchableOpacity
          style={rowStyles.colInput}
          activeOpacity={isCompleted ? 1 : 0.75}
          disabled={isCompleted}
          onPress={() => {
            if (isCompleted) return;
            hapticLight();
            onAction?.(idx, 'focusField', 'reps');
          }}
        >
          <View
            style={[
              rowStyles.numericInput,
              isCompleted && rowStyles.numericInputCompleted,
              isActive && rowStyles.numericInputActive,
              isRepsActive && rowStyles.numericInputActiveKeypad,
              isRepsActive && isFieldSelected && rowStyles.numericInputSelected,
            ]}
          >
            <View style={rowStyles.textWithCursorContainer}>
              <Text
                style={[
                  rowStyles.numericInputText,
                  !displayReps && !isRepsActive && { color: IOS_DARK.labelTertiary },
                  isCompleted && rowStyles.numericInputTextCompleted,
                  isRepsActive && rowStyles.numericInputTextActive,
                  isRepsActive && isFieldSelected && { backgroundColor: 'rgba(165, 153, 255, 0.35)', borderRadius: 4, paddingHorizontal: 3 },
                ]}
                numberOfLines={1}
              >
                {displayReps || (isRepsActive ? '' : (placeholderReps || '10'))}
              </Text>
              {isRepsActive && !isFieldSelected && <BlinkingCursor />}
            </View>
          </View>
        </TouchableOpacity>

        {/* 5. CHECKMARK BUTTON COLUMN (Width: 42) */}
        <View style={rowStyles.colCheck}>
          <Animated.View style={animatedCheckStyle}>
            <TouchableOpacity
              onPress={handleToggleCompleteInternal}
              style={[
                rowStyles.checkCircle,
                isCompleted && rowStyles.checkCircleCompleted,
                isCompleted && set.isWarmup && { backgroundColor: IOS_DARK.orange, borderColor: IOS_DARK.orange },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              {isCompleted ? (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={isActive ? '#a599ff' : 'rgba(255, 255, 255, 0.15)'}
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
}, (prev, next) =>
  prev.idx === next.idx &&
  prev.isActive === next.isActive &&
  prev.isCompleted === next.isCompleted &&
  prev.activeKeypadField === next.activeKeypadField &&
  prev.isFieldSelected === next.isFieldSelected &&
  prev.displayWeight === next.displayWeight &&
  prev.displayReps === next.displayReps &&
  prev.prevPerformance === next.prevPerformance &&
  prev.isDark === next.isDark &&
  prev.colors === next.colors &&
  prev.styles === next.styles &&
  prev.onAction === next.onAction &&
  prev.onTextChange === next.onTextChange &&
  prev.onBlur === next.onBlur &&
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
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    minHeight: 48,
  },
  rowActive: {
    backgroundColor: 'rgba(165, 153, 255, 0.05)',
    borderLeftWidth: 3,
    borderLeftColor: '#a599ff',
  },
  rowCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    opacity: 0.9,
  },
  rowFuture: {
    opacity: 0.72,
  },
  colSet: {
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBadgeWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumberText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: IOS_DARK.labelPrimary,
  },
  colPrev: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  prevText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: IOS_DARK.labelSecondary,
  },
  rirBadge: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.bold,
    color: IOS_DARK.orange,
    marginTop: 1,
  },
  colInput: {
    flex: 1,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numericInput: {
    width: '100%',
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  numericInputText: {
    color: IOS_DARK.labelPrimary,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    textAlign: 'center',
  },
  numericInputTextCompleted: {
    color: IOS_DARK.labelSecondary,
  },
  numericInputTextActive: {
    color: '#FFFFFF',
  },
  numericInputActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  numericInputActiveKeypad: {
    borderColor: '#a599ff',
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
  },
  numericInputSelected: {
    borderColor: '#a599ff',
    backgroundColor: 'rgba(165, 153, 255, 0.25)',
  },
  textWithCursorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numericInputCompleted: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  colCheck: {
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkCircleCompleted: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
});

export default SwipeableSetRow;
