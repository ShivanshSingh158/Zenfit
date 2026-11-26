import React, { useId, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { CheckCircle2 } from 'lucide-react-native';
import { NumericText, TactileButton } from '../../../components/ui';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  EXPERIENCE_OPTIONS,
  ExperienceLevelId,
  GOAL_OPTIONS,
  TrainingGoalId,
} from '../onboardingTypes';
import { FONT_FAMILY, SPACE, ThemeTokens } from '../../../theme/tokens';

const GOAL_PALETTE: Record<
  TrainingGoalId,
  { start: string; end: string; bgDark: string; bgLight: string; border: string }
> = {
  hypertrophy: {
    start: '#5AC8FA',
    end: '#0A84FF',
    bgDark: 'rgba(10, 132, 255, 0.14)',
    bgLight: 'rgba(10, 132, 255, 0.10)',
    border: 'rgba(90, 200, 250, 0.28)',
  },
  strength: {
    start: '#FFD60A',
    end: '#FF9F0A',
    bgDark: 'rgba(255, 159, 10, 0.14)',
    bgLight: 'rgba(255, 159, 10, 0.10)',
    border: 'rgba(255, 214, 10, 0.28)',
  },
  fat_loss: {
    start: '#FF9F0A',
    end: '#FF453A',
    bgDark: 'rgba(255, 69, 58, 0.14)',
    bgLight: 'rgba(255, 69, 58, 0.10)',
    border: 'rgba(255, 159, 10, 0.28)',
  },
  athletic: {
    start: '#30D158',
    end: '#5AC8FA',
    bgDark: 'rgba(48, 209, 88, 0.14)',
    bgLight: 'rgba(48, 209, 88, 0.10)',
    border: 'rgba(90, 200, 250, 0.28)',
  },
  recomp: {
    start: '#4ADE80',
    end: '#0A84FF',
    bgDark: 'rgba(48, 209, 88, 0.14)',
    bgLight: 'rgba(10, 132, 255, 0.10)',
    border: 'rgba(74, 222, 128, 0.28)',
  },
};

const GoalEmblemSvg = React.memo(function GoalEmblemSvg({
  goalId,
  selected,
  onPrimary,
}: {
  goalId: TrainingGoalId;
  selected: boolean;
  onPrimary: string;
}) {
  const uid = useId().replace(/:/g, '_');
  const gId = `goal_${goalId}_${uid}`;
  const pal = GOAL_PALETTE[goalId];
  const s0 = selected ? onPrimary : pal.start;
  const s1 = selected ? onPrimary : pal.end;

  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Defs>
        <SvgLinearGradient id={gId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={s0} />
          <Stop offset="100%" stopColor={s1} />
        </SvgLinearGradient>
      </Defs>
      {goalId === 'hypertrophy' ? (
        <>
          <Rect x={2.5} y={7.5} width={2.8} height={9} rx={1.1} fill={`url(#${gId})`} opacity={0.82} />
          <Rect x={6} y={5.2} width={3.2} height={13.6} rx={1.2} fill={`url(#${gId})`} />
          <Rect x={9.2} y={10.5} width={5.6} height={3} rx={1} fill={`url(#${gId})`} opacity={0.95} />
          <Rect x={14.8} y={5.2} width={3.2} height={13.6} rx={1.2} fill={`url(#${gId})`} />
          <Rect x={18.7} y={7.5} width={2.8} height={9} rx={1.1} fill={`url(#${gId})`} opacity={0.82} />
        </>
      ) : goalId === 'strength' ? (
        <>
          <Path
            d="M4 11V13M7 6V18M17 6V18M20 11V13"
            stroke={`url(#${gId})`}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
          <Path d="M4.5 12H19.5" stroke={`url(#${gId})`} strokeWidth={2.2} strokeLinecap="round" />
          <Path
            d="M12 4.5L14 7.5L12 10L10 7.5L12 4.5Z"
            fill={`url(#${gId})`}
            opacity={0.95}
          />
        </>
      ) : goalId === 'fat_loss' ? (
        <>
          <Path
            d="M12.6 2.8C12.8 6.4 9.5 8.1 9.5 11.4C9.5 12.6 10.2 13.7 11.2 14.3C10.9 12.9 11.8 11.5 13 10.6C13.6 12.1 15.1 12.9 15.1 14.9C15.1 17 13.6 18.8 11.6 19.2C15.6 19.4 18.5 16.4 18.5 12.5C18.5 8.6 15.8 5.2 12.6 2.8Z"
            fill={`url(#${gId})`}
          />
          <Path
            d="M10.8 19.2C7.8 18.9 5.5 16.4 5.5 13.2C5.5 10.6 7.1 8.5 8.9 6.8C8.3 9.2 9.4 10.9 10.6 12.2"
            stroke={`url(#${gId})`}
            strokeWidth={1.9}
            strokeLinecap="round"
          />
        </>
      ) : goalId === 'athletic' ? (
        <>
          <Path
            d="M13.5 2.8L5.8 13H11.6L10.4 21.2L18.2 11H12.4L13.5 2.8Z"
            fill={`url(#${gId})`}
          />
          <Path
            d="M3.5 9.2H6.5M17.5 15.2H20.5"
            stroke={s0}
            strokeWidth={1.8}
            strokeLinecap="round"
            opacity={0.75}
          />
        </>
      ) : (
        <>
          <Path
            d="M19 8.5A7.5 7.5 0 0 0 6.8 6.2L5.5 7.8"
            stroke={s0}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <Path
            d="M5 15.5A7.5 7.5 0 0 0 17.2 17.8L18.5 16.2"
            stroke={s1}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <Path d="M4.8 4.8L5.3 8.2L8.7 7.6" stroke={s0} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M19.2 19.2L18.7 15.8L15.3 16.4" stroke={s1} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={12} cy={12} r={2.3} fill={`url(#${gId})`} />
        </>
      )}
    </Svg>
  );
});

const ExperienceEmblemSvg = React.memo(function ExperienceEmblemSvg({
  bars,
  selected,
  onPrimary,
  accent,
}: {
  bars: 1 | 2 | 3;
  selected: boolean;
  onPrimary: string;
  accent: string;
}) {
  const uid = useId().replace(/:/g, '_');
  const gId = `exp_${bars}_${uid}`;
  const startCol = selected
    ? onPrimary
    : bars === 1
    ? '#5AC8FA'
    : bars === 2
    ? accent
    : '#30D158';
  const endCol = selected
    ? onPrimary
    : bars === 1
    ? accent
    : bars === 2
    ? '#5AC8FA'
    : '#5AC8FA';

  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Defs>
        <SvgLinearGradient id={gId} x1="0%" y1="100%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={startCol} />
          <Stop offset="100%" stopColor={endCol} />
        </SvgLinearGradient>
      </Defs>
      <Rect
        x={3.5}
        y={13.5}
        width={4.2}
        height={6.5}
        rx={1.5}
        fill={`url(#${gId})`}
      />
      <Rect
        x={9.9}
        y={9}
        width={4.2}
        height={11}
        rx={1.5}
        fill={bars >= 2 ? `url(#${gId})` : 'rgba(255,255,255,0.16)'}
      />
      <Rect
        x={16.3}
        y={4.5}
        width={4.2}
        height={15.5}
        rx={1.5}
        fill={bars >= 3 ? `url(#${gId})` : 'rgba(255,255,255,0.16)'}
      />
    </Svg>
  );
});

const EXP_VOLUME_TAGS: Record<ExperienceLevelId, string> = {
  beginner: '10–12 sets/wk · Base technique',
  intermediate: '14–16 sets/wk · Progressive build',
  advanced: '18+ sets/wk · High intensity',
};

/* ── Step 4: Training Goal (Auto-Advances on Selection) ────────────────── */
interface GoalStepProps {
  selectedGoal: TrainingGoalId | null;
  onSelectGoal: (goal: TrainingGoalId) => void;
}

export const GoalStep: React.FC<GoalStepProps> = React.memo(function GoalStep({
  selectedGoal,
  onSelectGoal,
}) {
  const { tokens, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);

  return (
    <View style={styles.root}>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>What are you training for?</Text>
        <Text style={styles.subtitle}>
          Tunes your rep ranges and progression pace.
        </Text>
      </View>

      <View style={styles.centerContent}>
        <View style={styles.ledgerSurface}>
          {GOAL_OPTIONS.map((g, idx) => {
            const selected = selectedGoal === g.id;
            const pal = GOAL_PALETTE[g.id];
            return (
              <React.Fragment key={g.id}>
                {idx > 0 ? <View style={styles.ledgerDivider} /> : null}
                <TactileButton
                  variant="custom"
                  haptic="selection"
                  onPress={() => onSelectGoal(g.id)}
                  style={[styles.ledgerRow, selected && styles.ledgerRowActive]}
                >
                  <View
                    style={[
                      styles.iconBox,
                      {
                        backgroundColor: selected
                          ? tokens.accent.primary
                          : isDark
                          ? pal.bgDark
                          : pal.bgLight,
                        borderColor: selected ? tokens.accent.primary : pal.border,
                      },
                    ]}
                  >
                    <GoalEmblemSvg
                      goalId={g.id}
                      selected={selected}
                      onPrimary={tokens.accent.onPrimary}
                    />
                  </View>

                  <View style={styles.rowTextCol}>
                    <Text
                      style={[
                        styles.rowTitle,
                        selected && { color: tokens.accent.primary },
                      ]}
                    >
                      {g.title}
                    </Text>
                    <Text style={styles.rowCue} numberOfLines={1}>
                      {g.cue}
                    </Text>
                  </View>

                  {selected ? (
                    <CheckCircle2
                      size={19}
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
});

/* ── Step 5: Lifting Experience (Auto-Advances on Selection) ───────────── */
interface ExperienceStepProps {
  selectedExperience: ExperienceLevelId | null;
  onSelectExperience: (exp: ExperienceLevelId) => void;
}

export const ExperienceStep: React.FC<ExperienceStepProps> = React.memo(
  function ExperienceStep({ selectedExperience, onSelectExperience }) {
    const { tokens, isDark } = useTheme();
    const styles = useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);

    return (
      <View style={styles.root}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>How long have you lifted?</Text>
          <Text style={styles.subtitle}>
            Calibrates starting weekly sets and recovery load.
          </Text>
        </View>

        <View style={styles.centerContent}>
          <View style={styles.expStack}>
            {EXPERIENCE_OPTIONS.map((exp) => {
              const selected = selectedExperience === exp.id;
              return (
                <TactileButton
                  key={exp.id}
                  variant="custom"
                  haptic="selection"
                  onPress={() => onSelectExperience(exp.id)}
                  style={[styles.expCard, selected && styles.expCardActive]}
                >
                  <View
                    style={[
                      styles.expIconBox,
                      selected && {
                        backgroundColor: tokens.accent.primary,
                        borderColor: tokens.accent.primary,
                      },
                    ]}
                  >
                    <ExperienceEmblemSvg
                      bars={exp.bars}
                      selected={selected}
                      onPrimary={tokens.accent.onPrimary}
                      accent={tokens.accent.primary}
                    />
                  </View>

                  <View style={styles.rowTextCol}>
                    <View style={styles.expTitleRow}>
                      <Text
                        style={[
                          styles.rowTitle,
                          selected && { color: tokens.accent.primary },
                        ]}
                      >
                        {exp.title}
                      </Text>
                      <NumericText style={styles.expYearsPill}>{exp.cue}</NumericText>
                    </View>
                    <NumericText style={styles.rowCue}>
                      {EXP_VOLUME_TAGS[exp.id]}
                    </NumericText>
                  </View>

                  {selected ? (
                    <CheckCircle2
                      size={19}
                      strokeWidth={2.2}
                      color={tokens.accent.primary}
                    />
                  ) : (
                    <View style={styles.radioEmpty} />
                  )}
                </TactileButton>
              );
            })}
          </View>
        </View>
      </View>
    );
  }
);

const makeStyles = (tokens: ThemeTokens, isDark: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      paddingTop: SPACE.xs,
    },
    headerBlock: {
      marginBottom: SPACE.md,
    },
    centerContent: {
      justifyContent: 'flex-start',
      paddingTop: SPACE.xs,
      paddingBottom: SPACE.sm,
    },
    title: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 27,
      letterSpacing: -0.65,
      color: tokens.text.primary,
      marginBottom: 4,
      includeFontPadding: false,
    },
    subtitle: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 14.5,
      lineHeight: 20,
      color: tokens.text.secondary,
    },
    ledgerSurface: {
      borderRadius: 20,
      backgroundColor: isDark ? '#0F1015' : tokens.bg.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : tokens.border.subtle,
      overflow: 'hidden',
    },
    ledgerDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : tokens.border.subtle,
      marginLeft: 70,
    },
    ledgerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 15,
      minHeight: 70,
    },
    ledgerRowActive: {
      backgroundColor: tokens.accent.primaryDim,
    },
    iconBox: {
      width: 42,
      height: 42,
      borderRadius: 13,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
      flexShrink: 0,
    },
    expIconBox: {
      width: 44,
      height: 44,
      borderRadius: 13,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : tokens.bg.elevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : tokens.border.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
      flexShrink: 0,
    },
    rowTextCol: {
      flex: 1,
      minWidth: 0,
      marginRight: SPACE.sm,
    },
    rowTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15.5,
      color: tokens.text.primary,
      marginBottom: 3,
      includeFontPadding: false,
    },
    rowCue: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 13,
      color: tokens.text.secondary,
      includeFontPadding: false,
    },
    radioEmpty: {
      width: 19,
      height: 19,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255,255,255,0.18)' : tokens.border.medium,
    },
    expStack: {
      gap: SPACE.md,
    },
    expCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#0F1015' : tokens.bg.surface,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : tokens.border.subtle,
      minHeight: 86,
    },
    expCardActive: {
      borderColor: tokens.accent.primary,
      backgroundColor: tokens.accent.primaryDim,
    },
    expTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    expYearsPill: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 11.5,
      color: tokens.text.muted,
      includeFontPadding: false,
    },
  });
