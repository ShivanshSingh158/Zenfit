import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  SharedValue,
  interpolateColor,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { AnimatedProgressBar, NumericText, TactileButton } from '../../../components/ui';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONT_FAMILY, ICON, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';

interface OnboardingHeaderProps {
  /** 1-based current step inside the quiz (0 on Welcome) */
  quizStepIndex: number;
  /** Total quiz steps excluding Welcome */
  totalQuizSteps: number;
  onBack: () => void;
  showBrandWordmark?: boolean;
  welcomeProgressSV?: SharedValue<number>;
  progressColor?: string;
}

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = React.memo(
  function OnboardingHeader({
    quizStepIndex,
    totalQuizSteps,
    onBack,
    showBrandWordmark = false,
    welcomeProgressSV,
    progressColor,
  }) {
    const { tokens } = useTheme();
    const styles = useMemo(() => makeStyles(tokens), [tokens]);

    const animatedDotStyle = useAnimatedStyle(() => {
      if (!welcomeProgressSV) {
        return { backgroundColor: tokens.accent.primary };
      }
      return {
        backgroundColor: interpolateColor(
          welcomeProgressSV.value,
          [0, 1, 2],
          [tokens.accent.primary, tokens.accent.secondary, tokens.status.success]
        ),
      };
    });

    if (quizStepIndex <= 0) {
      return (
        <View style={styles.welcomeHeader}>
          <View style={styles.brandRow}>
            <Animated.View style={[styles.brandDot, animatedDotStyle]} />
            <Text style={styles.brandText}>ZENFIT</Text>
          </View>
        </View>
      );
    }

    const ratio = Math.min(1, Math.max(0.08, quizStepIndex / Math.max(1, totalQuizSteps)));

    return (
      <View style={styles.quizHeader}>
        <TactileButton
          variant="custom"
          haptic="light"
          onPress={onBack}
          style={styles.backBtn}
          hitSlop={TOUCH.hitSlop}
          accessibilityLabel="Previous step"
        >
          <ChevronLeft size={ICON.md} strokeWidth={2.2} color={tokens.text.primary} />
        </TactileButton>

        <View style={styles.progressWrap}>
          {showBrandWordmark ? (
            <View style={styles.brandRow}>
              <View style={styles.brandDot} />
              <Text style={styles.brandText}>ZENFIT</Text>
            </View>
          ) : (
            <AnimatedProgressBar
              progress={ratio}
              height={3.5}
              borderRadius={999}
              durationMs={260}
              color={progressColor ?? tokens.accent.primary}
              trackColor={tokens.isDark ? 'rgba(255,255,255,0.09)' : tokens.border.subtle}
            />
          )}
        </View>

        <View style={styles.counterCol}>
          {!showBrandWordmark && (
            <NumericText style={styles.stepCounterText}>
              {quizStepIndex}/{totalQuizSteps}
            </NumericText>
          )}
        </View>
      </View>
    );
  }
);

const makeStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    welcomeHeader: {
      height: 44,
      paddingHorizontal: SPACE.lg + 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    quizHeader: {
      height: 44,
      paddingHorizontal: SPACE.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.md,
    },
    backBtn: {
      width: 34,
      height: 34,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    progressWrap: {
      flex: 1,
      justifyContent: 'center',
    },
    counterCol: {
      minWidth: 34,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    stepCounterText: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 12,
      color: tokens.text.secondary,
      includeFontPadding: false,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    brandDot: {
      width: 6.5,
      height: 6.5,
      borderRadius: 999,
      backgroundColor: tokens.accent.primary,
    },
    brandText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
      color: tokens.text.primary,
      letterSpacing: 2.2,
      includeFontPadding: false,
    },
  });
