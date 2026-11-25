import React, { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Platform,
  BackHandler,
  Keyboard,
  useWindowDimensions,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Portal } from '../../contexts/PortalContext';
import { useTheme } from '../../contexts/ThemeContext';
import { durations, iosEasing, springs } from '../../theme/motion';
import {
  markSheetClosing,
  markSheetClosed,
  clearSheetClosing,
  registerModalInStack,
  isTopModalInStack,
} from '../../utils/sheetCoordinator';

export interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  fullHeight?: boolean;
  avoidKeyboard?: boolean;
  hideHandle?: boolean;
  noPadding?: boolean;
  scrollable?: boolean;
  sheetHeight?: number | string;
  enableBackdropDismiss?: boolean;
  enableContentPanningGesture?: boolean;
  sheetBackgroundColor?: string;
  stackBehavior?: 'push' | 'switch' | 'replace';
}

function resolveSheetHeightPx(
  sheetHeight: number | string | undefined,
  fullHeight: boolean,
  windowHeight: number,
  maxSheetPx: number
): number | undefined {
  if (typeof sheetHeight === 'number' && Number.isFinite(sheetHeight)) {
    return Math.min(maxSheetPx, Math.max(120, Math.round(sheetHeight)));
  }
  if (typeof sheetHeight === 'string') {
    const trimmed = sheetHeight.trim();
    if (trimmed.endsWith('%')) {
      const pct = parseFloat(trimmed.slice(0, -1));
      if (!Number.isNaN(pct) && pct > 0) {
        return Math.min(maxSheetPx, Math.round((pct / 100) * windowHeight));
      }
    } else {
      const num = parseFloat(trimmed);
      if (!Number.isNaN(num) && num > 0) {
        return Math.min(maxSheetPx, Math.round(num));
      }
    }
  }
  if (fullHeight) {
    return Math.min(maxSheetPx, Math.round(windowHeight * 0.90));
  }
  return undefined;
}

/**
 * AppBottomSheet — Native UI-thread Reanimated + RNGH + Portal bottom sheet.
 * Animates exclusively via GPU transform (`translateY`) & backdrop `opacity`,
 * while keeping child ScrollViews/FlatLists 100% free of content-pan hijacking.
 */
export function AppBottomSheet({
  visible,
  onClose,
  children,
  contentStyle,
  fullHeight = false,
  avoidKeyboard = true,
  hideHandle = false,
  noPadding = false,
  scrollable = false,
  sheetHeight,
  enableBackdropDismiss = true,
  enableContentPanningGesture = true,
  sheetBackgroundColor,
  stackBehavior: _stackBehavior = 'push',
}: AppBottomSheetProps) {
  const { tokens, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [containerHeight, setContainerHeight] = useState<number>(windowHeight);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  useEffect(() => {
    if (!avoidKeyboard) {
      setKeyboardHeight(0);
      return;
    }
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: any) => {
      const h = Math.max(0, Math.round(e?.endCoordinates?.height || 0));
      setKeyboardHeight(h);
    };
    const onHide = () => setKeyboardHeight(0);
    const subShow = Keyboard.addListener(showEvt, onShow);
    const subHide = Keyboard.addListener(hideEvt, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [avoidKeyboard]);

  const effectiveViewportH = containerHeight > 0 ? containerHeight : windowHeight;
  // On Android adjustResize, the OS already shrinks containerHeight by ~keyboardHeight,
  // so avoid subtracting keyboardHeight a second time (which caused empty backdrop gaps + top cutoff).
  const osAlreadyResized = Math.max(0, windowHeight - effectiveViewportH);
  const effectiveKeyboardPad = avoidKeyboard
    ? Math.max(0, keyboardHeight - osAlreadyResized)
    : 0;
  const maxSheetPx = Math.max(
    240,
    Math.round(effectiveViewportH - effectiveKeyboardPad - Math.max(insets.top + 8, 36))
  );
  const resolvedSheetPx = resolveSheetHeightPx(
    sheetHeight,
    fullHeight,
    effectiveViewportH,
    maxSheetPx
  );
  const measuredSheetHRef = useRef<number>(0);
  const effectiveTravelPx = resolvedSheetPx
    ?? (measuredSheetHRef.current > 40
      ? Math.min(maxSheetPx, measuredSheetHRef.current + 20)
      : Math.min(maxSheetPx, 420));
  const closedOffset = effectiveTravelPx;

  const [mounted, setMounted] = useState(visible);
  const isMountedRef = useRef(visible);
  const closedOffsetRef = useRef(closedOffset);
  closedOffsetRef.current = closedOffset;
  const [portalId] = useState(
    () => `app-sheet-${Math.random().toString(36).substring(2, 9)}`
  );

  const translateY = useSharedValue(visible ? 0 : closedOffset);
  const backdropProgress = useSharedValue(visible ? 1 : 0);
  const dragStartY = useSharedValue(0);
  const isClosingRef = useRef(false);
  const openRafRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    return () => {
      markSheetClosed(portalId);
    };
  }, [portalId]);

  const handleCloseInterruptedJS = useCallback(() => {
    isClosingRef.current = false;
    clearSheetClosing(portalId);
  }, [portalId]);

  const finalizeClose = useCallback((notifyParent: boolean) => {
    isClosingRef.current = false;
    isMountedRef.current = false;
    setMounted(false);
    markSheetClosed(portalId);
    if (notifyParent) {
      onCloseRef.current?.();
    }
  }, [portalId]);

  const animateClose = useCallback(
    (notifyParent: boolean) => {
      if (!isMountedRef.current || isClosingRef.current) return;
      isClosingRef.current = true;
      markSheetClosing(portalId);
      if (openRafRef.current !== null) {
        cancelAnimationFrame(openRafRef.current);
        openRafRef.current = null;
      }
      Keyboard.dismiss();

      cancelAnimation(backdropProgress);
      cancelAnimation(translateY);

      const targetY = closedOffsetRef.current;
      backdropProgress.value = withTiming(0, {
        duration: durations.sheetClose,
        easing: iosEasing.standard,
      });
      translateY.value = withTiming(
        targetY,
        {
          duration: durations.sheetClose,
          easing: iosEasing.accel,
        },
        (finished) => {
          if (finished) {
            runOnJS(finalizeClose)(notifyParent);
          } else {
            runOnJS(handleCloseInterruptedJS)();
          }
        }
      );
    },
    [backdropProgress, translateY, finalizeClose, handleCloseInterruptedJS, portalId]
  );

  const startSpringOpen = useCallback(() => {
    cancelAnimation(backdropProgress);
    cancelAnimation(translateY);
    backdropProgress.value = withTiming(1, {
      duration: durations.crossFade,
      easing: iosEasing.decel,
    });
    translateY.value = withSpring(0, springs.sheet);
  }, [backdropProgress, translateY]);

  useEffect(() => {
    if (visible) {
      clearSheetClosing(portalId);
      registerModalInStack(portalId);
      isClosingRef.current = false;
      if (!isMountedRef.current) {
        isMountedRef.current = true;
        translateY.value = closedOffsetRef.current;
        backdropProgress.value = 0;
        setMounted(true);
        return;
      }
      startSpringOpen();
    } else if (isMountedRef.current && !isClosingRef.current) {
      animateClose(false);
    }

    return () => {
      if (openRafRef.current !== null) {
        cancelAnimationFrame(openRafRef.current);
        openRafRef.current = null;
      }
    };
  }, [visible, translateY, backdropProgress, animateClose, startSpringOpen, portalId]);

  // Trigger spring immediately once Portal (via useLayoutEffect) has attached Animated.View
  useEffect(() => {
    if (mounted && visible && !isClosingRef.current) {
      startSpringOpen();
    }
  }, [mounted, visible, startSpringOpen]);

  useEffect(() => {
    if (!visible) return;
    const onBack = () => {
      if (!isTopModalInStack(portalId)) return false;
      if (enableBackdropDismiss) {
        animateClose(true);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [visible, enableBackdropDismiss, animateClose, portalId]);

  const handleDragStartJS = useCallback(() => {
    markSheetClosing(portalId);
  }, [portalId]);

  const handleDragDismissJS = useCallback(() => {
    isClosingRef.current = false;
    isMountedRef.current = false;
    Keyboard.dismiss();
    setMounted(false);
    markSheetClosed(portalId);
    onCloseRef.current?.();
  }, [portalId]);

  const handlePanGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enableBackdropDismiss)
        .activeOffsetY(6)
        .onStart(() => {
          'worklet';
          dragStartY.value = translateY.value;
        })
        .onUpdate((e) => {
          'worklet';
          const next = dragStartY.value + e.translationY;
          translateY.value = next < 0 ? next * 0.15 : next;
          backdropProgress.value = interpolate(
            translateY.value,
            [0, closedOffset],
            [1, 0],
            Extrapolation.CLAMP
          );
        })
        .onEnd((e) => {
          'worklet';
          const shouldClose = e.translationY > 90 || e.velocityY > 650;
          if (shouldClose) {
            runOnJS(handleDragStartJS)();
            backdropProgress.value = withTiming(0, {
              duration: durations.sheetClose,
              easing: iosEasing.standard,
            });
            translateY.value = withTiming(
              closedOffset,
              {
                duration: durations.sheetClose,
                easing: iosEasing.accel,
              },
              (finished) => {
                if (finished) {
                  runOnJS(handleDragDismissJS)();
                } else {
                  runOnJS(handleCloseInterruptedJS)();
                }
              }
            );
          } else {
            backdropProgress.value = withTiming(1, { duration: 160 });
            translateY.value = withSpring(0, springs.snappy);
          }
        }),
    [
      enableBackdropDismiss,
      dragStartY,
      translateY,
      backdropProgress,
      closedOffset,
      handleDragStartJS,
      handleDragDismissJS,
    ]
  );

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropProgress.value,
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!mounted) return null;

  const resolvedSurfaceBg = sheetBackgroundColor || (isDark ? '#0B0C10' : '#F8F8FA');
  const safeBottom = Math.max(insets.bottom, tokens.space.lg);

  const bodyPaddingStyle: ViewStyle = noPadding
    ? (fullHeight || resolvedSheetPx ? { paddingBottom: insets.bottom } : {})
    : {
        paddingHorizontal: tokens.space.lg,
        paddingBottom: fullHeight || resolvedSheetPx ? Math.max(insets.bottom, tokens.space.lg) : safeBottom,
      };

  const sheetSizeStyle: ViewStyle = resolvedSheetPx
    ? {
        height: resolvedSheetPx,
        maxHeight: '100%',
      }
    : {
        maxHeight: maxSheetPx,
      };

  return (
    <Portal name={portalId}>
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
        onLayout={(e) => {
          const h = Math.round(e.nativeEvent.layout.height);
          if (h > 0 && Math.abs(h - containerHeight) > 2) {
            setContainerHeight(h);
          }
        }}
      >
        {/* Scrim / Backdrop (pure translucent scrim avoids costly UI BlurView alpha compositor drops) */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}>
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: tokens.bg.backdrop },
            ]}
            onPress={enableBackdropDismiss ? () => animateClose(true) : undefined}
          />
        </Animated.View>

        {/* Bottom Sheet Surface + Single-Pass Keyboard Clamping */}
        <View
          style={[
            styles.keyboardContainer,
            effectiveKeyboardPad > 0 ? { paddingBottom: effectiveKeyboardPad } : null,
          ]}
          pointerEvents="box-none"
        >
          <Animated.View
            onLayout={(e) => {
              const h = Math.round(e.nativeEvent.layout.height);
              if (h > 0) measuredSheetHRef.current = h;
            }}
            style={[
              styles.sheetContainer,
              sheetSizeStyle,
              {
                backgroundColor: resolvedSurfaceBg,
                borderTopLeftRadius: tokens.radius.sheet,
                borderTopRightRadius: tokens.radius.sheet,
                borderColor: tokens.border.subtle,
              },
              sheetAnimatedStyle,
            ]}
          >
            {!hideHandle && (
              <GestureDetector gesture={handlePanGesture}>
                <View style={styles.handleWrap}>
                  <View
                    style={[
                      styles.handlePill,
                      {
                        width: tokens.touch.sheetHandle.width,
                        height: tokens.touch.sheetHandle.height,
                        borderRadius: tokens.touch.sheetHandle.borderRadius,
                        backgroundColor: tokens.border.medium,
                      },
                    ]}
                  />
                </View>
              </GestureDetector>
            )}

            {scrollable ? (
              <ScrollView
                style={styles.autoBody}
                contentContainerStyle={[bodyPaddingStyle, contentStyle]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                nestedScrollEnabled
              >
                {children}
              </ScrollView>
            ) : enableContentPanningGesture ? (
              <GestureDetector gesture={handlePanGesture}>
                <View
                  style={[
                    resolvedSheetPx ? styles.flexOne : styles.autoBody,
                    bodyPaddingStyle,
                    contentStyle,
                  ]}
                >
                  {children}
                </View>
              </GestureDetector>
            ) : (
              <View
                style={[
                  resolvedSheetPx ? styles.flexOne : styles.autoBody,
                  bodyPaddingStyle,
                  contentStyle,
                ]}
              >
                {children}
              </View>
            )}
          </Animated.View>
        </View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
    minHeight: 0,
  },
  autoBody: {
    flexShrink: 1,
    minHeight: 0,
  },
  keyboardContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    flexDirection: 'column',
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  handleWrap: {
    width: '100%',
    minHeight: 36,
    paddingTop: 12,
    paddingBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  handlePill: {
    alignSelf: 'center',
  },
});

export default AppBottomSheet;
