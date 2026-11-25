/**
 * animations.ts — Reanimated UI-Thread Presets
 *
 * All legacy JS-thread `Animated` and `LayoutAnimation` helpers have been removed.
 * Every helper here uses `react-native-reanimated` worklets / shared values.
 */

import {
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  SharedValue,
  LinearTransition,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { springs, durations, iosEasing } from './motion';

export const springEnter = (
  val: SharedValue<number>,
  from = 28,
  to = 0,
  delay = 0
) => {
  val.value = from;
  val.value = withDelay(delay, withSpring(to, springs.standard));
};

export const fadeEnter = (val: SharedValue<number>, delay = 0) => {
  val.value = 0;
  val.value = withDelay(
    delay,
    withTiming(1, { duration: durations.crossFade, easing: iosEasing.decel })
  );
};

export const startPulseWorklet = (
  val: SharedValue<number>,
  min = 0.94,
  max = 1.06,
  duration = 1000
) => {
  val.value = min;
  val.value = withRepeat(
    withSequence(
      withTiming(max, { duration, easing: iosEasing.standard }),
      withTiming(min, { duration, easing: iosEasing.standard })
    ),
    -1,
    false
  );
};

export const REANIMATED_LAYOUT = LinearTransition.springify()
  .damping(springs.standard.damping)
  .stiffness(springs.standard.stiffness);

export const LIST_ENTERING = FadeIn.duration(durations.crossFade);
export const LIST_EXITING = FadeOut.duration(durations.poof);
