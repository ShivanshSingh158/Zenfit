import React, { useEffect, useId, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import {
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AnimatedSvgCircle, NumericText } from '../../../components/ui';
import { useTheme } from '../../../contexts/ThemeContext';
import { iosEasing } from '../../../theme/motion';
import { FONT_FAMILY, SPACE, ThemeTokens } from '../../../theme/tokens';

interface PlanSynthesisLoaderProps {
  splitTitle: string;
  onComplete: () => void;
}

const SIZE = 168;
const CENTER = SIZE / 2;
const RADIUS = 68;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const PlanSynthesisLoader: React.FC<PlanSynthesisLoaderProps> = React.memo(
  function PlanSynthesisLoader({ splitTitle, onComplete }) {
    const { tokens } = useTheme();
    const styles = useMemo(() => makeStyles(tokens), [tokens]);
    const uid = useId().replace(/:/g, '_');
    const haloId = `synthHalo_${uid}`;

    const [pctDisplay, setPctDisplay] = useState(0);
    const [phaseIndex, setPhaseIndex] = useState(0);

    const progress = useSharedValue(0);

    const phases = useMemo(
      () => [
        'Setting strength standards…',
        'Balancing weekly muscle volume…',
        `Building ${splitTitle}…`,
      ],
      [splitTitle]
    );

    useEffect(() => {
      progress.value = 0;
      progress.value = withTiming(1, { duration: 1550, easing: iosEasing.decel });

      const start = Date.now();
      const totalMs = 1550;
      const tickId = setInterval(() => {
        const elapsed = Date.now() - start;
        const ratio = Math.min(1, elapsed / totalMs);
        setPctDisplay(Math.round(ratio * 100));
        if (ratio >= 0.68) {
          setPhaseIndex(2);
        } else if (ratio >= 0.34) {
          setPhaseIndex(1);
        }
      }, 45);

      const doneId = setTimeout(() => {
        setPctDisplay(100);
        onComplete();
      }, 1700);

      return () => {
        cancelAnimation(progress);
        clearInterval(tickId);
        clearTimeout(doneId);
      };
    }, [progress, onComplete]);

    const arcProps = useAnimatedProps(() => ({
      strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
    }));

    return (
      <View style={styles.root}>
        <View style={styles.dialBox}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <Defs>
              <RadialGradient id={haloId} cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor={tokens.accent.primary} stopOpacity={tokens.isDark ? 0.26 : 0.14} />
                <Stop offset="100%" stopColor={tokens.accent.primary} stopOpacity={0} />
              </RadialGradient>
            </Defs>

            <Circle cx={CENTER} cy={CENTER} r={78} fill={`url(#${haloId})`} />

            <Circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={tokens.isDark ? 'rgba(255,255,255,0.08)' : tokens.border.subtle}
              strokeWidth={5.5}
            />

            <AnimatedSvgCircle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={tokens.accent.primary}
              strokeWidth={5.5}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
              animatedProps={arcProps}
            />
          </Svg>

          <View style={styles.centerReadout}>
            <NumericText style={styles.pctText}>{pctDisplay}%</NumericText>
          </View>
        </View>

        <Text style={styles.title}>Personalizing your plan</Text>
        <Text style={styles.phaseText}>{phases[phaseIndex]}</Text>
      </View>
    );
  }
);

const makeStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SPACE.xl,
      paddingBottom: SPACE.xxl,
    },
    dialBox: {
      width: SIZE,
      height: SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACE.xl,
    },
    centerReadout: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pctText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 32,
      color: tokens.text.primary,
      letterSpacing: -0.8,
      includeFontPadding: false,
    },
    title: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 22,
      color: tokens.text.primary,
      letterSpacing: -0.4,
      textAlign: 'center',
      marginBottom: SPACE.xs + 2,
      includeFontPadding: false,
    },
    phaseText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 14,
      color: tokens.text.secondary,
      textAlign: 'center',
    },
  });
