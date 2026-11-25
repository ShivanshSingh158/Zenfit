import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image as ExpoImage } from 'expo-image';
import { ArrowLeftRight } from 'lucide-react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useResponsiveMetrics } from '../../../theme/responsive';
import { hapticLight } from '../../../utils/haptics';
import { AppIcon } from '../../ui/AppIcon';

const AnimatedExpoImage = Animated.createAnimatedComponent(ExpoImage);

interface Props {
  beforeImage: string;
  afterImage: string;
}

/**
 * BeforeAfterSlider — 120fps RNGH v2 + Reanimated GPU-composited split slider.
 * Uses responsive viewport height, expo-image disk/memory caching, memoized PanGesture,
 * and mirrored translateX clipping instead of animating layout `width`.
 */
export default function BeforeAfterSlider({ beforeImage, afterImage }: Props) {
  const { tokens } = useTheme();
  const { width: windowWidth, sliderHeight, clampChartWidth } = useResponsiveMetrics();
  const fallbackWidth = clampChartWidth(40);
  const [containerWidth, setContainerWidth] = useState(fallbackWidth);
  const sliderWidth = containerWidth > 0 ? Math.min(containerWidth, windowWidth - 24) : fallbackWidth;

  const panX = useSharedValue(sliderWidth / 2);
  const startX = useSharedValue(sliderWidth / 2);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 50 && Math.abs(w - containerWidth) > 2) {
      setContainerWidth(w);
      panX.value = w / 2;
    }
  };

  const triggerHaptic = () => {
    hapticLight();
  };

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-3, 3])
        .failOffsetY([-8, 8])
        .onStart(() => {
          'worklet';
          startX.value = panX.value;
          runOnJS(triggerHaptic)();
        })
        .onUpdate((evt) => {
          'worklet';
          const next = Math.max(0, Math.min(sliderWidth, startX.value + evt.translationX));
          panX.value = next;
        }),
    [panX, startX, sliderWidth]
  );

  const clipStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -(sliderWidth - panX.value) }],
  }));

  const innerImageCounterStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderWidth - panX.value }],
  }));

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: panX.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <View
        style={[
          styles.container,
          {
            height: sliderHeight,
            width: sliderWidth,
            borderRadius: tokens.radius.card,
            backgroundColor: tokens.bg.surface,
          },
        ]}
        onLayout={handleLayout}
      >
        {/* Background (After Image) */}
        <ExpoImage
          source={{ uri: afterImage }}
          style={[styles.image, { width: sliderWidth, height: sliderHeight }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
        />

        {/* Foreground (Before Image) — GPU-composited clip */}
        <Animated.View
          pointerEvents="none"
          style={[styles.overlay, { width: sliderWidth, height: sliderHeight }, clipStyle]}
        >
          <AnimatedExpoImage
            source={{ uri: beforeImage }}
            style={[styles.image, { width: sliderWidth, height: sliderHeight }, innerImageCounterStyle]}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
          />
        </Animated.View>

        {/* Draggable Handle (48dp touch hit region) */}
        <Animated.View pointerEvents="none" style={[styles.handleContainer, handleStyle]}>
          <View
            style={[
              styles.handleLine,
              { backgroundColor: tokens.text.primary },
            ]}
          />
          <View
            style={[
              styles.handleKnob,
              {
                backgroundColor: tokens.accent.primary,
                shadowColor: tokens.bg.canvas,
              },
            ]}
          >
            <AppIcon
              icon={ArrowLeftRight}
              size={18}
              color={tokens.accent.onPrimary}
            />
          </View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  },
  handleContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -24,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  handleLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    opacity: 0.9,
  },
  handleKnob: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
