/**
 * WeeklyHighlightsCarousel.tsx • ZenFit Mobile
 *
 * Story-Style Weekly Highlights Carousel:
 * - Card 1: Overall Volume & Overload Rate (85% Overload Success)
 * - Card 2: Top 3 PRs with golden trophy badges
 * - Card 3: Anatomical Muscle Heatmap with balanced vs lagging indicators
 *
 * Replaces dense text blocks with visual, swipeable summary cards.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import {
  Dumbbell,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import { TactileButton } from '../../ui/TactileButton';
import { NumericText } from '../../ui/NumericText';
import { COLORS, DARK_TOKENS, FONT_FAMILY, ICON, LIGHT_TOKENS, RADIUS, SPACE, TOUCH } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { hapticLight } from '../../../utils/haptics';
import { resolveMuscleColor } from '../../../utils/gymUtils';
import { useWeightUnit, kgToDisplay, unitLabel, formatVolumeParts } from '../../../utils/weightUnit';

export interface WeeklyHighlightStats {
  thisWeekVolume: number;
  prevWeekVolume: number;
  volumeDeltaPct: number;
  thisWeekSets: number;
  sessionCount: number;
  overloadRatePct: number; // e.g. 85
  weightUnlocksCount: number;
  repBuildsCount: number;
  topPRs: Array<{
    exerciseName: string;
    weight: number;
    reps: number;
    e1rm: number;
    diffText?: string;
  }>;
  muscleAdherence: Array<{
    muscle: string;
    sets: number;
    target: number;
    status: 'balanced' | 'lagging' | 'fatigue';
  }>;
  overallAdherencePct: number;
}

interface Props {
  stats: WeeklyHighlightStats;
  onSelectExercise?: (exerciseName: string) => void;
}

export const WeeklyHighlightsCarousel: React.FC<Props> = React.memo(({
  stats,
  onSelectExercise,
}) => {
  const { isDark, colors, tokens } = useTheme();
  const unitIsLbs = useWeightUnit();
  const uLabel = unitLabel(unitIsLbs);
  const volParts = formatVolumeParts(stats.thisWeekVolume, unitIsLbs);
  const s = useMemo(() => makeStyles(tokens), [tokens]);
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  // Card dimensions: Full width minus padding with generous margins
  const CARD_GAP = SPACE.md;
  const cardWidth = Math.max(240, Math.min(width - 28, 532));

  const handleScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / (cardWidth + CARD_GAP));
    if (index !== activeIndex && index >= 0 && index <= 1) {
      setActiveIndex(index);
    }
  };

  const volumeDeltaText = stats.volumeDeltaPct >= 0
    ? `+${stats.volumeDeltaPct.toFixed(1)}% vs last week`
    : `${stats.volumeDeltaPct.toFixed(1)}% vs last week`;

  return (
    <View style={s.container}>
      {/* Header with Title & Carousel Story Indicator */}
      <View style={s.headerRow}>
        <Text style={s.sectionTitle}>WEEKLY HIGHLIGHTS</Text>

        {/* 2 Story Dots */}
        <View style={s.dotsContainer}>
          {[0, 1].map(idx => (
            <View
              key={idx}
              style={[
                s.dot,
                activeIndex === idx ? s.dotActive : s.dotInactive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Swipeable Story Cards Carousel */}
      <ScrollView
        horizontal
        pagingEnabled
        nestedScrollEnabled={true}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + CARD_GAP}
        snapToAlignment="center"
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 2, gap: CARD_GAP }}
      >
        {/* ══════════════════════════════════════════════════════════════════
            CARD 1: Top 3 PRs (Clean Athletic Highlights)
           ══════════════════════════════════════════════════════════════════ */}
        <View style={[s.storyCard, { width: cardWidth, backgroundColor: tokens.bg.surface }]}>
          <View style={s.cardTopRow}>
            <Text style={s.cardCategoryText}>TOP PERSONAL RECORDS</Text>
            <NumericText style={s.storyCardIndex}>1 OF 2</NumericText>
          </View>

          {/* Top 3 PR Podium / Badges */}
          <View style={s.podiumContainer}>
            {stats.topPRs && stats.topPRs.length > 0 ? (
              stats.topPRs.slice(0, 3).map((pr, index) => {
                return (
                  <TactileButton
                    key={`${pr.exerciseName}-${index}`}
                    variant="custom"
                    haptic="none"
                    style={[
                      s.podiumRow,
                      {
                        backgroundColor: tokens.bg.elevated,
                        borderColor: tokens.border.subtle,
                      },
                    ]}
                    onPress={() => {
                      hapticLight();
                      if (onSelectExercise) onSelectExercise(pr.exerciseName);
                    }}
                  >
                    {/* Minimal Rank Circle */}
                    <View style={s.podiumRankCircle}>
                      <NumericText style={s.podiumRankText}>{index + 1}</NumericText>
                    </View>

                    {/* Exercise Info */}
                    <View style={{ flex: 1, marginHorizontal: SPACE.sm }}>
                      <Text style={[s.podiumExName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {pr.exerciseName}
                      </Text>
                      <NumericText style={s.podiumSetText}>
                        {pr.weight > 0 ? `${kgToDisplay(pr.weight, unitIsLbs)} ${uLabel}` : 'Bodyweight'} × {pr.reps} reps
                        {pr.diffText ? ` · ${pr.diffText}` : ''}
                      </NumericText>
                    </View>

                    {/* E1RM Milestone Badge */}
                    <View style={s.podiumE1rmBox}>
                      <NumericText style={s.podiumE1rmVal}>{kgToDisplay(pr.e1rm || pr.weight, unitIsLbs)} {uLabel}</NumericText>
                      <Text style={s.podiumE1rmLabel}>est. 1RM</Text>
                    </View>
                  </TactileButton>
                );
              })
            ) : (
              <View style={s.emptyPrBox}>
                <Dumbbell size={24} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
                <Text style={s.emptyPrText}>Log working sets to track personal records</Text>
              </View>
            )}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            CARD 2: Overall Volume & Overload Progress
           ══════════════════════════════════════════════════════════════════ */}
        <View style={[s.storyCard, { width: cardWidth, backgroundColor: tokens.bg.surface }]}>
          {/* Card Top Label */}
          <View style={s.cardTopRow}>
            <Text style={s.cardCategoryText}>OVERLOAD HIGHLIGHTS</Text>
            <NumericText style={s.storyCardIndex}>2 OF 2</NumericText>
          </View>

          {/* Hero Numbers */}
          <View style={s.heroMetricRow}>
            <View style={{ flex: 1 }}>
              <NumericText style={s.heroVolumeNum}>
                {volParts.numStr}
                <NumericText style={s.heroUnit}> {volParts.suffix}</NumericText>
              </NumericText>
              <View style={s.deltaRow}>
                {stats.volumeDeltaPct >= 0 ? (
                  <TrendingUp size={12} color={tokens.status.success} strokeWidth={ICON.strokeWidth} />
                ) : (
                  <TrendingDown size={12} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
                )}
                <NumericText
                  style={[
                    s.deltaText,
                    { color: stats.volumeDeltaPct >= 0 ? tokens.status.success : tokens.text.secondary },
                  ]}
                >
                  {volumeDeltaText}
                </NumericText>
              </View>
            </View>

            {/* Overload Success Rate Clean Stat */}
            <View style={s.overloadBadgeContainer}>
              <NumericText style={s.overloadRateNum}>{stats.overloadRatePct}%</NumericText>
              <Text style={s.overloadRateSub}>Overload Success</Text>
            </View>
          </View>

          {/* Sub-KPI Pods */}
          <View style={s.subKpiGrid}>
            <View style={[s.subKpiPod, { backgroundColor: tokens.bg.elevated }]}>
              <NumericText style={s.subKpiVal}>{stats.sessionCount}</NumericText>
              <Text style={s.subKpiLabel}>Workouts</Text>
            </View>

            <View style={[s.subKpiPod, { backgroundColor: tokens.bg.elevated }]}>
              <NumericText style={s.subKpiVal}>{stats.thisWeekSets}</NumericText>
              <Text style={s.subKpiLabel}>Total Sets</Text>
            </View>

            <View style={[s.subKpiPod, { backgroundColor: tokens.bg.elevated }]}>
              <NumericText style={s.subKpiVal}>{stats.weightUnlocksCount}</NumericText>
              <Text style={s.subKpiLabel}>Weight PRs</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
});

export default WeeklyHighlightsCarousel;

const makeStyles = (tokens: typeof DARK_TOKENS) => StyleSheet.create({
  container: {
    marginBottom: SPACE.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.xs,
    marginBottom: SPACE.sm,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    letterSpacing: 0.8,
    color: tokens.text.secondary,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    width: 16,
    backgroundColor: tokens.accent.primary,
  },
  dotInactive: {
    width: 4,
    backgroundColor: tokens.border.subtle,
  },
  storyCard: {
    borderRadius: RADIUS.card,
    padding: SPACE.lg,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardCategoryText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    color: tokens.text.secondary,
    letterSpacing: 0.8,
  },
  storyCardIndex: {
    fontFamily: FONT_FAMILY.mono,
    fontSize: 10,
    color: tokens.text.muted,
  },

  // Hero metric row
  heroMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE.md,
  },
  heroVolumeNum: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 28,
    color: tokens.text.primary,
    letterSpacing: -0.8,
  },
  heroUnit: {
    fontSize: 16,
    color: tokens.text.secondary,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  deltaText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
  },

  // Overload Clean Stat Block
  overloadBadgeContainer: {
    alignItems: 'flex-end',
  },
  overloadRateNum: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 22,
    color: tokens.text.primary,
    letterSpacing: -0.5,
  },
  overloadRateSub: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10.5,
    color: tokens.text.secondary,
    marginTop: 1,
  },

  // Sub KPI Grid
  subKpiGrid: {
    flexDirection: 'row',
    gap: SPACE.sm,
  },
  subKpiPod: {
    flex: 1,
    borderRadius: RADIUS.inner,
    padding: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.border.subtle,
  },
  subKpiVal: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: tokens.text.primary,
  },
  subKpiLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10,
    color: tokens.text.secondary,
    marginTop: 2,
  },

  // Podium (Card 1)
  podiumContainer: {
    gap: SPACE.sm,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOUCH.minTarget,
    padding: 10,
    borderRadius: RADIUS.inner,
    borderWidth: 1,
  },
  podiumRankCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: tokens.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRankText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    color: tokens.text.primary,
  },
  podiumExName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
  },
  podiumSetText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: tokens.text.secondary,
    marginTop: 1,
  },
  podiumE1rmBox: {
    alignItems: 'flex-end',
  },
  podiumE1rmVal: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: tokens.text.primary,
  },
  podiumE1rmLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 9,
    color: tokens.text.secondary,
  },
  emptyPrBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACE.xl,
    gap: 6,
  },
  emptyPrText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: tokens.text.secondary,
  },

  // Muscle Balance
  adherenceText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    color: tokens.text.secondary,
  },
  muscleBalanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.sm,
  },
  muscleBalanceCard: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: RADIUS.inner,
    padding: 9,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
  },
  muscleDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  muscleItemName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11.5,
  },
  statusTextSmall: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
  },
  muscleProgressRow: {
    marginTop: 6,
    gap: SPACE.xs,
  },
  muscleSetCount: {
    fontFamily: FONT_FAMILY.mono,
    fontSize: 11,
    color: tokens.text.primary,
  },
  progressBarTrack: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: tokens.border.subtle,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
});
