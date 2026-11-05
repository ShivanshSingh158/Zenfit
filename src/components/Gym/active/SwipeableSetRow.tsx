import React, { useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  withSpring,
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
          backgroundColor: '#30D158',
          marginLeft: 2,
          borderRadius: 1,
        },
        animStyle,
      ]}
    />
  );
});

// Tactile Spring Stepper Button with native UI thread compression
const SpringStepperButton = React.memo(({
  onPress,
  icon,
}: {
  onPress: () => void;
  icon: 'remove' | 'add';
}) => {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withTiming(0.84, { duration: 50 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 10, stiffness: 240 });
      }}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
    >
      <Animated.View style={[rowStyles.stepperBtn, animStyle]}>
        <Ionicons name={icon} size={16} color="#E5E5EA" />
      </Animated.View>
    </Pressable>
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
  onAction?: (idx: number, action: 'textChange' | 'blur' | 'toggle' | 'delete' | 'swipe' | 'cycleType' | 'copyPrev' | 'focusField' | 'setRest', payload?: any) => void;
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

  // Bouncy Spring Pop on Checkmark Completion (OpenGym & Apple HIG feel)
  const handleToggleCompleteInternal = useCallback(() => {
    if (!isCompleted) {
      hapticSuccess();
      checkScale.value = withSequence(
        withTiming(0.82, { duration: 60, easing: Easing.out(Easing.quad) }),
        withSpring(1.28, { damping: 9, stiffness: 250, mass: 0.6 }),
        withSpring(1.0, { damping: 12, stiffness: 180 })
      );
    } else {
      hapticLight();
      checkScale.value = withSequence(
        withTiming(0.9, { duration: 50 }),
        withSpring(1.0, { damping: 12, stiffness: 200 })
      );
    }
    if (onAction) {
      onAction(idx, 'toggle');
    } else if (onToggleComplete) {
      onToggleComplete();
    }
  }, [idx, isCompleted, onAction, onToggleComplete, checkScale]);

  const onSwipeComplete = useCallback(() => {
    if (!isCompleted) {
      hapticSuccess();
      checkScale.value = withSequence(
        withTiming(0.82, { duration: 60 }),
        withSpring(1.28, { damping: 9, stiffness: 250, mass: 0.6 }),
        withSpring(1.0, { damping: 12, stiffness: 180 })
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
      if (translateX.value >= 60) {
        runOnJS(onSwipeComplete)();
      }
      translateX.value = withTiming(0, { duration: 200 });
    }
  }, [isCompleted, onSwipeComplete, translateX]);

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleDeleteInternal = useCallback(() => {
    Alert.alert(
      'Delete Set',
      `Are you sure you want to delete Set ${set.setNumber || idx + 1}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            hapticMedium();
            onAction?.(idx, 'delete');
          },
        },
      ]
    );
  }, [idx, set.setNumber, onAction]);

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

  // Compute set badge tag & color: Normal -> Warmup (W) -> Drop (D) -> Failure (F)
  let setBadgeText = `${set.setNumber || idx + 1}`;
  let setBadgeColor = '#8E8E93';
  let setBadgeBg = '#242426';

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
  } else if (isCompleted) {
    setBadgeColor = '#000000';
    setBadgeBg = '#30D158';
  } else if (isActive) {
    setBadgeColor = '#FFFFFF';
    setBadgeBg = '#2C2C2E';
  }

  const isWeightActive = !isCompleted && activeKeypadField === 'weight';
  const isRepsActive = !isCompleted && activeKeypadField === 'reps';

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
          rowAnimatedStyle,
        ]}
      >
        {/* 1. SET NUMBER BADGE (Tap to cycle type: Normal -> W -> D -> F) */}
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
            { backgroundColor: setBadgeBg }
          ]}>
            <Text
              style={[
                rowStyles.setNumberText,
                { color: setBadgeColor },
              ]}
            >
              {setBadgeText}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 2. WEIGHT STEPPER PILL: [ −  82.5  + ] */}
        <View style={rowStyles.colInput}>
          <View
            style={[
              rowStyles.stepperPill,
              isCompleted && rowStyles.stepperPillCompleted,
              isWeightActive && rowStyles.stepperPillActive,
            ]}
          >
            <SpringStepperButton
              icon="remove"
              onPress={() => {
                hapticLight();
                const curWeight = Number(displayWeight || placeholderWeight || 0);
                const newWeight = Math.max(0, Math.round((curWeight - 2.5) * 10) / 10);
                onAction?.(idx, 'textChange', { field: 'weight', text: String(newWeight) });
              }}
            />

            <TouchableOpacity
              style={rowStyles.stepperValueContainer}
              activeOpacity={0.75}
              onPress={() => {
                hapticLight();
                onAction?.(idx, 'focusField', 'weight');
              }}
            >
              <View style={rowStyles.textWithCursorContainer}>
                <Text
                  style={[
                    rowStyles.numericInputText,
                    !displayWeight && !isWeightActive && { color: IOS_DARK.labelTertiary },
                    isCompleted && rowStyles.numericInputTextCompleted,
                    isWeightActive && rowStyles.numericInputTextActive,
                    isWeightActive && isFieldSelected && { backgroundColor: 'rgba(48, 209, 88, 0.35)', borderRadius: 4, paddingHorizontal: 3 },
                  ]}
                  numberOfLines={1}
                >
                  {displayWeight || (isWeightActive ? '' : (placeholderWeight || '0'))}
                </Text>
                {isWeightActive && !isFieldSelected && <BlinkingCursor />}
              </View>
            </TouchableOpacity>

            <SpringStepperButton
              icon="add"
              onPress={() => {
                hapticLight();
                const curWeight = Number(displayWeight || placeholderWeight || 0);
                const newWeight = Math.round((curWeight + 2.5) * 10) / 10;
                onAction?.(idx, 'textChange', { field: 'weight', text: String(newWeight) });
              }}
            />
          </View>
        </View>

        {/* 3. REPS STEPPER PILL: [ −  8  + ] */}
        <View style={rowStyles.colInput}>
          <View
            style={[
              rowStyles.stepperPill,
              isCompleted && rowStyles.stepperPillCompleted,
              isRepsActive && rowStyles.stepperPillActive,
            ]}
          >
            <SpringStepperButton
              icon="remove"
              onPress={() => {
                hapticLight();
                const curReps = Number(displayReps || placeholderReps || 1);
                const newReps = Math.max(1, curReps - 1);
                onAction?.(idx, 'textChange', { field: 'reps', text: String(newReps) });
              }}
            />

            <TouchableOpacity
              style={rowStyles.stepperValueContainer}
              activeOpacity={0.75}
              onPress={() => {
                hapticLight();
                onAction?.(idx, 'focusField', 'reps');
              }}
            >
              <View style={rowStyles.textWithCursorContainer}>
                <Text
                  style={[
                    rowStyles.numericInputText,
                    !displayReps && !isRepsActive && { color: IOS_DARK.labelTertiary },
                    isCompleted && rowStyles.numericInputTextCompleted,
                    isRepsActive && rowStyles.numericInputTextActive,
                    isRepsActive && isFieldSelected && { backgroundColor: 'rgba(48, 209, 88, 0.35)', borderRadius: 4, paddingHorizontal: 3 },
                  ]}
                  numberOfLines={1}
                >
                  {displayReps || (isRepsActive ? '' : (placeholderReps || '8'))}
                </Text>
                {isRepsActive && !isFieldSelected && <BlinkingCursor />}
              </View>
            </TouchableOpacity>

            <SpringStepperButton
              icon="add"
              onPress={() => {
                hapticLight();
                const curReps = Number(displayReps || placeholderReps || 0);
                const newReps = curReps + 1;
                onAction?.(idx, 'textChange', { field: 'reps', text: String(newReps) });
              }}
            />
          </View>
        </View>

        {/* 4. CHECKMARK BUTTON COLUMN (Width: 44) */}
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
                <Ionicons name="checkmark" size={18} color="#000000" />
              ) : null}
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
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: 'transparent',
  },
  rowActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  rowCompleted: {
    opacity: 0.9,
  },
  colSet: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBadgeWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumberText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
  },
  colInput: {
    flex: 1,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperPill: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    backgroundColor: '#27272A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 2,
  },
  stepperPillCompleted: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'transparent',
  },
  stepperPillActive: {
    borderColor: '#30D158',
    backgroundColor: 'rgba(48, 209, 88, 0.08)',
  },
  stepperBtn: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueContainer: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numericInputText: {
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    textAlign: 'center',
  },
  numericInputTextCompleted: {
    color: '#8E8E93',
  },
  numericInputTextActive: {
    color: '#FFFFFF',
  },
  textWithCursorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colCheck: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkCircleCompleted: {
    backgroundColor: '#30D158',
    borderColor: '#30D158',
    borderWidth: 0,
  },
});

export default SwipeableSetRow;
