import React, { useEffect, useId, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { CheckCircle2 } from 'lucide-react-native';
import { NumericText, TactileButton } from '../../../components/ui';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  SPLIT_OPTIONS,
  SplitPreferenceId,
  getRecommendedSplitForDays,
  getTrainingDayMask,
} from '../onboardingTypes';
import { FONT_FAMILY, SPACE, ThemeTokens } from '../../../theme/tokens';

interface ScheduleSplitStepProps {
  daysPerWeek: number;
  onSelectDays: (days: number) => void;
  splitPreference: SplitPreferenceId;
  onSelectSplit: (split: SplitPreferenceId) => void;
}

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_CHOICES = [3, 4, 5, 6];

/* ── Animated Weekly Frequency Pill ────────────────────────────────────── */
const AnimatedDayChoice = React.memo(function AnimatedDayChoice({
  days,
  active,
  onPress,
  tokens,
  isDark,
}: {
  days: number;
  active: boolean;
  onPress: () => void;
  tokens: ThemeTokens;
  isDark: boolean;
}) {
  const scale = useSharedValue(active ? 1.03 : 1);

  useEffect(() => {
    scale.value = withSpring(active ? 1.03 : 1, {
      damping: 16,
      stiffness: 260,
      mass: 0.7,
    });
  }, [active, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[localStyles.freqPillWrap, animStyle]}>
      <TactileButton
        variant="custom"
        haptic="selection"
        onPress={onPress}
        style={[
          localStyles.freqPill,
          {
            backgroundColor: active
              ? tokens.accent.primaryDim
              : isDark
              ? '#0F1015'
              : tokens.bg.surface,
            borderColor: active
              ? tokens.accent.primary
              : isDark
              ? 'rgba(255,255,255,0.10)'
              : tokens.border.subtle,
          },
        ]}
      >
        <NumericText
          style={[
            localStyles.freqNum,
            { color: active ? tokens.accent.primary : tokens.text.primary },
          ]}
        >
          {days}
        </NumericText>
        <Text
          style={[
            localStyles.freqUnit,
            { color: active ? tokens.accent.primary : tokens.text.muted },
          ]}
        >
          DAYS
        </Text>
      </TactileButton>
    </Animated.View>
  );
});

/* ── Animated 7-Day Rhythm Slot ────────────────────────────────────────── */
const AnimatedRhythmDay = React.memo(function AnimatedRhythmDay({
  letter,
  isTrain,
  tokens,
  isDark,
}: {
  letter: string;
  isTrain: boolean;
  tokens: ThemeTokens;
  isDark: boolean;
}) {
  const progress = useSharedValue(isTrain ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isTrain ? 1 : 0, {
      damping: 17,
      stiffness: 240,
      mass: 0.75,
    });
  }, [isTrain, progress]);

  const pillAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.94 + progress.value * 0.08 }],
  }));

  return (
    <View style={localStyles.rhythmDay}>
      <Animated.View
        style={[
          localStyles.rhythmDot,
          pillAnimStyle,
          {
            backgroundColor: isTrain
              ? tokens.accent.primary
              : isDark
              ? 'rgba(255,255,255,0.06)'
              : tokens.bg.elevated,
            borderColor: isTrain
              ? 'rgba(90, 200, 250, 0.5)'
              : isDark
              ? 'rgba(255,255,255,0.08)'
              : tokens.border.subtle,
          },
        ]}
      >
        <Text
          style={[
            localStyles.rhythmLetter,
            { color: isTrain ? tokens.accent.onPrimary : tokens.text.muted },
          ]}
        >
          {letter}
        </Text>
      </Animated.View>
    </View>
  );
});

/* ── Bespoke Split Pattern Glyph SVG ───────────────────────────────────── */
const SplitPatternSvg = React.memo(function SplitPatternSvg({
  splitId,
  selected,
  tokens,
}: {
  splitId: SplitPreferenceId;
  selected: boolean;
  tokens: ThemeTokens;
}) {
  const uid = useId().replace(/:/g, '_');
  const gId = `split_${splitId}_${uid}`;
  const c0 = selected ? tokens.accent.onPrimary : '#5AC8FA';
  const c1 = selected ? tokens.accent.onPrimary : tokens.accent.primary;

  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Defs>
        <SvgLinearGradient id={gId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={c0} />
          <Stop offset="100%" stopColor={c1} />
        </SvgLinearGradient>
      </Defs>
      {splitId === 'full_body' ? (
        <>
          <Circle cx={7.5} cy={7.5} r={3} fill={`url(#${gId})`} />
          <Circle cx={16.5} cy={7.5} r={3} fill={`url(#${gId})`} opacity={0.75} />
          <Circle cx={7.5} cy={16.5} r={3} fill={`url(#${gId})`} opacity={0.75} />
          <Circle cx={16.5} cy={16.5} r={3} fill={`url(#${gId})`} />
        </>
      ) : splitId === 'upper_lower' || splitId === 'torso_limbs' ? (
        <>
          <Rect x={4} y={4.5} width={16} height={6.2} rx={2.2} fill={`url(#${gId})`} />
          <Rect x={4} y={13.3} width={16} height={6.2} rx={2.2} fill={`url(#${gId})`} opacity={0.62} />
        </>
      ) : splitId === 'ppl' || splitId === 'pplul' ? (
        <>
          <Path d="M4 18.5L12 4.5L20 18.5H4Z" stroke={`url(#${gId})`} strokeWidth={2.1} strokeLinejoin="round" />
          <Circle cx={12} cy={13.5} r={2.2} fill={`url(#${gId})`} />
        </>
      ) : (
        <>
          <Rect x={4} y={4.5} width={4} height={15} rx={1.6} fill={`url(#${gId})`} />
          <Rect x={10} y={7.5} width={4} height={12} rx={1.6} fill={`url(#${gId})`} opacity={0.8} />
          <Rect x={16} y={4.5} width={4} height={15} rx={1.6} fill={`url(#${gId})`} opacity={0.65} />
        </>
      )}
    </Svg>
  );
});

export const ScheduleSplitStep: React.FC<ScheduleSplitStepProps> = React.memo(
  function ScheduleSplitStep({
    daysPerWeek,
    onSelectDays,
    splitPreference,
    onSelectSplit,
  }) {
    const { tokens, isDark } = useTheme();
    const styles = useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);

    const dayMask = useMemo(() => getTrainingDayMask(daysPerWeek), [daysPerWeek]);
    const recommendedSplitId = useMemo(
      () => getRecommendedSplitForDays(daysPerWeek),
      [daysPerWeek]
    );

    const restDaysCount = 7 - daysPerWeek;

    return (
      <View style={styles.root}>
        <View>
          <View style={styles.headerBlock}>
            <Text style={styles.title}>Build your training week</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              Choose weekly days and your routine split.
            </Text>
          </View>

          {/* Days Per Week Animated Selector */}
          <View style={styles.freqRow}>
            {DAY_CHOICES.map((d) => (
              <AnimatedDayChoice
                key={d}
                days={d}
                active={daysPerWeek === d}
                onPress={() => onSelectDays(d)}
                tokens={tokens}
                isDark={isDark}
              />
            ))}
          </View>

          {/* Live Animated 7-Day Rhythm Card */}
          <View style={styles.rhythmCard}>
            <View style={styles.rhythmHeaderRow}>
              <Text style={styles.rhythmHeaderTag}>WEEKLY CADENCE</Text>
              <NumericText style={styles.rhythmSummaryText}>
                {daysPerWeek} Lifting · {restDaysCount} Recovery
              </NumericText>
            </View>
            <View style={styles.rhythmRow}>
              {DAY_LETTERS.map((letter, idx) => (
                <AnimatedRhythmDay
                  key={`${letter}-${idx}`}
                  letter={letter}
                  isTrain={Boolean(dayMask[idx])}
                  tokens={tokens}
                  isDark={isDark}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.splitSection}>
          <Text style={styles.sectionLabel}>ROUTINE SPLIT</Text>
          <View style={styles.ledgerSurface}>
            {SPLIT_OPTIONS.map((split, idx) => {
              const selected = splitPreference === split.id;
              const isRecommended = split.id === recommendedSplitId;
              return (
                <React.Fragment key={split.id}>
                  {idx > 0 ? <View style={styles.ledgerDivider} /> : null}
                  <TactileButton
                    variant="custom"
                    haptic="selection"
                    onPress={() => onSelectSplit(split.id)}
                    style={[styles.splitRow, selected && styles.splitRowActive]}
                  >
                    <View
                      style={[
                        styles.splitIconBox,
                        selected && {
                          backgroundColor: tokens.accent.primary,
                          borderColor: tokens.accent.primary,
                        },
                      ]}
                    >
                      <SplitPatternSvg
                        splitId={split.id}
                        selected={selected}
                        tokens={tokens}
                      />
                    </View>

                    <View style={styles.splitTextCol}>
                      <View style={styles.splitTitleRow}>
                        <Text
                          style={[
                            styles.splitTitle,
                            selected && { color: tokens.accent.primary },
                          ]}
                          numberOfLines={1}
                        >
                          {split.title}
                        </Text>
                        {isRecommended ? (
                          <View style={styles.recPill}>
                            <Text style={styles.recPillText}>Best fit</Text>
                          </View>
                        ) : split.badge ? (
                          <NumericText style={styles.dayTagMuted}>{split.badge}</NumericText>
                        ) : null}
                      </View>
                      <Text style={styles.splitCue} numberOfLines={1}>
                        {split.cue}
                      </Text>
                    </View>

                    {selected ? (
                      <CheckCircle2
                        size={17}
                        strokeWidth={2.2}
                        color={tokens.accent.primary}
                      />
                    ) : (
                      <View style={styles.radioEmpty} />
                    )}
                  </TactileButton>
                </React.Fragment>
              );
            })}
          </View>
        </View>
      </View>
    );
  }
);

const localStyles = StyleSheet.create({
  freqPillWrap: {
    flex: 1,
  },
  freqPill: {
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqNum: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 17,
    includeFontPadding: false,
  },
  freqUnit: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    letterSpacing: 0.6,
    marginTop: 1,
    includeFontPadding: false,
  },
  rhythmDay: {
    flex: 1,
    alignItems: 'center',
  },
  rhythmDot: {
    width: 30,
    height: 29,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rhythmLetter: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11.5,
    includeFontPadding: false,
  },
});

const makeStyles = (tokens: ThemeTokens, isDark: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    headerBlock: {
      marginBottom: SPACE.sm + 4,
    },
    title: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 25,
      letterSpacing: -0.6,
      color: tokens.text.primary,
      marginBottom: 3,
      includeFontPadding: false,
    },
    subtitle: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 14,
      lineHeight: 19,
      color: tokens.text.secondary,
    },
    freqRow: {
      flexDirection: 'row',
      gap: SPACE.xs + 3,
      marginBottom: SPACE.sm + 2,
    },
    rhythmCard: {
      borderRadius: 15,
      backgroundColor: isDark ? '#0F1015' : tokens.bg.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : tokens.border.subtle,
      paddingHorizontal: 12,
      paddingVertical: 11,
      marginBottom: SPACE.md - 2,
    },
    rhythmHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      paddingHorizontal: 2,
    },
    rhythmHeaderTag: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 10,
      letterSpacing: 0.9,
      color: tokens.text.muted,
      includeFontPadding: false,
    },
    rhythmSummaryText: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 11.5,
      color: tokens.status.success,
      includeFontPadding: false,
    },
    rhythmRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    splitSection: {
      flex: 1,
    },
    sectionLabel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 11,
      letterSpacing: 0.9,
      color: tokens.text.muted,
      marginBottom: 7,
      includeFontPadding: false,
    },
    ledgerSurface: {
      flex: 1,
      borderRadius: 18,
      backgroundColor: isDark ? '#0F1015' : tokens.bg.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : tokens.border.subtle,
      overflow: 'hidden',
      marginBottom: SPACE.xs,
    },
    ledgerDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : tokens.border.subtle,
      marginLeft: 56,
      marginRight: 13,
    },
    splitRow: {
      flex: 1,
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    splitRowActive: {
      backgroundColor: tokens.accent.primaryDim,
    },
    splitIconBox: {
      width: 32,
      height: 32,
      borderRadius: 9.5,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : tokens.bg.elevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : tokens.border.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 11,
      flexShrink: 0,
    },
    splitTextCol: {
      flex: 1,
      minWidth: 0,
      marginRight: SPACE.xs + 3,
    },
    splitTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginBottom: 2,
    },
    splitTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
      color: tokens.text.primary,
      flexShrink: 1,
      includeFontPadding: false,
    },
    recPill: {
      backgroundColor: tokens.accent.primaryDim,
      paddingHorizontal: 6.5,
      paddingVertical: 1.5,
      borderRadius: 999,
    },
    recPillText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 9.5,
      color: tokens.accent.primary,
      includeFontPadding: false,
    },
    dayTagMuted: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 10.5,
      color: tokens.text.muted,
      includeFontPadding: false,
    },
    splitCue: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 12,
      color: tokens.text.secondary,
      includeFontPadding: false,
    },
    radioEmpty: {
      width: 18,
      height: 18,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255,255,255,0.18)' : tokens.border.medium,
    },
  });
