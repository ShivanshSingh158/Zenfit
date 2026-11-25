import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  Pressable,
  ViewStyle,
  StyleProp,
  BackHandler,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Portal } from '../../contexts/PortalContext';
import { useTheme } from '../../contexts/ThemeContext';
import { springs, durations, iosEasing } from '../../theme/motion';
import {
  markSheetClosing,
  markSheetClosed,
  clearSheetClosing,
  registerModalInStack,
  isTopModalInStack,
} from '../../utils/sheetCoordinator';

interface FadeModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  dismissible?: boolean;
  avoidKeyboard?: boolean;
}

export default function FadeModal({
  visible,
  onClose,
  children,
  contentStyle,
  dismissible = true,
  avoidKeyboard = false,
}: FadeModalProps) {
  const { tokens, isDark } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const styles = React.useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!avoidKeyboard) return;
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(showEvt, (e: any) => {
      setKeyboardHeight(Math.max(0, Math.round(e?.endCoordinates?.height || 0)));
    });
    const subHide = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [avoidKeyboard]);

  const effectiveWindowHeight = Math.max(240, windowHeight - (avoidKeyboard ? keyboardHeight : 0));
  const maxCardHeight = Math.max(240, Math.round(effectiveWindowHeight * 0.88));

  const [mounted, setMounted] = useState(visible);
  const isMountedRef = useRef(visible);
  const isClosingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const backdropOpacity = useSharedValue(visible ? 1 : 0);
  const scale = useSharedValue(visible ? 1 : 0.95);
  const translateY = useSharedValue(visible ? 0 : 8);
  const opacity = useSharedValue(visible ? 1 : 0);

  const [portalId] = useState(
    () => `fade-modal-${Math.random().toString(36).substring(2, 9)}`
  );

  useEffect(() => {
    return () => {
      markSheetClosed(portalId);
    };
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
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      Keyboard.dismiss();

      cancelAnimation(backdropOpacity);
      cancelAnimation(scale);
      cancelAnimation(translateY);
      cancelAnimation(opacity);

      backdropOpacity.value = withTiming(0, {
        duration: durations.poof,
        easing: iosEasing.standard,
      });
      scale.value = withTiming(0.95, {
        duration: durations.poof,
        easing: iosEasing.accel,
      });
      translateY.value = withTiming(6, {
        duration: durations.poof,
        easing: iosEasing.accel,
      });
      opacity.value = withTiming(
        0,
        { duration: durations.poof, easing: iosEasing.standard },
        (finished) => {
          if (finished) {
            runOnJS(finalizeClose)(notifyParent);
          } else {
            runOnJS(clearSheetClosing)(portalId);
          }
        }
      );
    },
    [backdropOpacity, scale, translateY, opacity, finalizeClose, portalId]
  );

  useEffect(() => {
    if (visible) {
      clearSheetClosing(portalId);
      registerModalInStack(portalId);
      isClosingRef.current = false;
      const needsMount = !isMountedRef.current;
      if (needsMount) {
        isMountedRef.current = true;
        setMounted(true);
        backdropOpacity.value = 0;
        scale.value = 0.95;
        translateY.value = 8;
        opacity.value = 0;
      }

      const startEnter = () => {
        cancelAnimation(backdropOpacity);
        cancelAnimation(scale);
        cancelAnimation(translateY);
        cancelAnimation(opacity);
        backdropOpacity.value = withTiming(1, {
          duration: durations.crossFade,
          easing: iosEasing.decel,
        });
        scale.value = withSpring(1, springs.sheet);
        translateY.value = withSpring(0, springs.sheet);
        opacity.value = withTiming(1, {
          duration: 170,
          easing: iosEasing.decel,
        });
      };

      if (needsMount) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          startEnter();
        });
      } else {
        startEnter();
      }
    } else if (isMountedRef.current && !isClosingRef.current) {
      animateClose(false);
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [visible, backdropOpacity, scale, translateY, opacity, animateClose, portalId]);

  useEffect(() => {
    if (!visible) return;
    const onBackPress = () => {
      if (!isTopModalInStack(portalId)) return false;
      if (dismissible) {
        animateClose(true);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible, dismissible, animateClose, portalId]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }] as const,
  }));

  if (!mounted) return null;

  const scrimTint =
    Platform.OS === 'ios'
      ? isDark
        ? 'rgba(9, 9, 11, 0.34)'
        : 'rgba(9, 9, 11, 0.20)'
      : tokens.bg.backdrop;

  return (
    <Portal name={portalId}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.backdropContainer,
          { backgroundColor: scrimTint },
          backdropStyle,
        ]}
      >
        {dismissible && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => animateClose(true)}
          />
        )}
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.centerWrapper}
        pointerEvents="box-none"
        enabled={avoidKeyboard}
      >
        <Animated.View
          style={[
            styles.container,
            { maxHeight: maxCardHeight, flexShrink: 1 },
            contentStyle,
            cardStyle,
          ]}
        >
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Portal>
  );
}

const makeStyles = (tokens: ReturnType<typeof useTheme>['tokens'], isDark: boolean) =>
  StyleSheet.create({
    backdropContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    centerWrapper: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: tokens.space.lg,
    },
    container: {
      backgroundColor: isDark ? '#0B0C10' : '#F8F8FA',
      borderRadius: tokens.radius.card,
      padding: tokens.space.xl,
      width: '100%',
      maxWidth: 420,
      borderWidth: tokens.border.hairlineWidth,
      borderColor: tokens.border.subtle,
      overflow: 'hidden',
    },
  });
