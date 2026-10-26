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
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILY, RADIUS, SPACE, IOS_DARK, COLORS } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { hapticLight, hapticSelection } from '../../utils/haptics';
import { resolveMuscleColor } from '../../utils/gymUtils';

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
  const { isDark, colors } = useTheme();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  // Card dimensions: Full width minus padding with generous margins
  const cardWidth = Math.max(280, width - 28);

  const handleScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / (cardWidth + 12));
    if (index !== activeIndex && index >= 0 && index <= 2) {
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

        {/* 3 Story Dots */}
        <View style={s.dotsContainer}>
          {[0, 1, 2].map(idx => (
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
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + 12}
        snapToAlignment="center"
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 2, gap: 12 }}
      >
        {/* ══════════════════════════════════════════════════════════════════
            CARD 1: Overall Volume & Overload Rate
           ══════════════════════════════════════════════════════════════════ */}
        <View style={[s.storyCard, { width: cardWidth, backgroundColor: isDark ? '#18181B' : colors.surface }]}>
          {/* Card Top Label */}
          <View style={s.cardTopRow}>
            <Text style={s.cardCategoryText}>OVERLOAD PROGRESS</Text>
            <Text style={s.storyCardIndex}>1 OF 3</Text>
          </View>

          {/* Hero Numbers */}
          <View style={s.heroMetricRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroVolumeNum}>
                {stats.thisWeekVolume >= 1000
                  ? `${(stats.thisWeekVolume / 1000).toFixed(1)}k`
                  : stats.thisWeekVolume}
                <Text style={s.heroUnit}> kg</Text>
              </Text>
              <View style={s.deltaRow}>
                <Ionicons
                  name={stats.volumeDeltaPct >= 0 ? 'arrow-up' : 'arrow-down'}
                  size={12}
                  color={stats.volumeDeltaPct >= 0 ? '#30D158' : '#8E8E93'}
                />
                <Text
                  style={[
                    s.deltaText,
                    { color: stats.volumeDeltaPct >= 0 ? '#30D158' : '#8E8E93' },
                  ]}
                >
                  {volumeDeltaText}
                </Text>
              </View>
            </View>

            {/* Overload Success Rate Clean Stat */}
            <View style={s.overloadBadgeContainer}>
              <Text style={s.overloadRateNum}>{stats.overloadRatePct}%</Text>
              <Text style={s.overloadRateSub}>Overload Success</Text>
            </View>
          </View>

          {/* Sub-KPI Pods */}
          <View style={s.subKpiGrid}>
            <View style={[s.subKpiPod, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F2F2F7' }]}>
              <Text style={s.subKpiVal}>{stats.sessionCount}</Text>
              <Text style={s.subKpiLabel}>Workouts</Text>
            </View>

            <View style={[s.subKpiPod, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F2F2F7' }]}>
              <Text style={s.subKpiVal}>{stats.thisWeekSets}</Text>
              <Text style={s.subKpiLabel}>Total Sets</Text>
            </View>

            <View style={[s.subKpiPod, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F2F2F7' }]}>
              <Text style={s.subKpiVal}>{stats.weightUnlocksCount}</Text>
              <Text style={s.subKpiLabel}>Weight PRs</Text>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            CARD 2: Top 3 PRs (Clean Apple Fitness Style)
           ══════════════════════════════════════════════════════════════════ */}
        <View style={[s.storyCard, { width: cardWidth, backgroundColor: isDark ? '#18181B' : colors.surface }]}>
          <View style={s.cardTopRow}>
            <Text style={s.cardCategoryText}>TOP PERSONAL RECORDS</Text>
            <Text style={s.storyCardIndex}>2 OF 3</Text>
          </View>

          {/* Top 3 PR Podium / Badges */}
          <View style={s.podiumContainer}>
            {stats.topPRs && stats.topPRs.length > 0 ? (
              stats.topPRs.slice(0, 3).map((pr, index) => {
                return (
                  <TouchableOpacity
                    key={`${pr.exerciseName}-${index}`}
                    style={[
                      s.podiumRow,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F2F2F7',
                        borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border,
                      },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => {
                      hapticLight();
                      if (onSelectExercise) onSelectExercise(pr.exerciseName);
                    }}
                  >
                    {/* Minimal Rank Circle */}
                    <View style={s.podiumRankCircle}>
                      <Text style={s.podiumRankText}>{index + 1}</Text>
                    </View>

                    {/* Exercise Info */}
                    <View style={{ flex: 1, marginHorizontal: 8 }}>
                      <Text style={[s.podiumExName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {pr.exerciseName}
                      </Text>
                      <Text style={s.podiumSetText}>
                        {pr.weight > 0 ? `${pr.weight} kg` : 'Bodyweight'} × {pr.reps} reps
                        {pr.diffText ? ` · ${pr.diffText}` : ''}
                      </Text>
                    </View>

                    {/* E1RM Milestone Badge */}
                    <View style={s.podiumE1rmBox}>
                      <Text style={s.podiumE1rmVal}>{pr.e1rm || pr.weight} kg</Text>
                      <Text style={s.podiumE1rmLabel}>est. 1RM</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={s.emptyPrBox}>
                <Ionicons name="barbell-outline" size={24} color={colors.textTertiary} />
                <Text style={s.emptyPrText}>Log working sets to track personal records</Text>
              </View>
            )}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            CARD 3: Anatomical Muscle Heatmap & Balanced vs Lagging Indicators
           ══════════════════════════════════════════════════════════════════ */}
        <View style={[s.storyCard, { width: cardWidth, backgroundColor: isDark ? '#18181B' : colors.surface }]}>
          <View style={s.cardTopRow}>
            <Text style={s.cardCategoryText}>ANATOMICAL BALANCE</Text>
            <Text style={s.adherenceText}>
              {stats.overallAdherencePct >= 100 ? '100% Plan Hit' : `${stats.overallAdherencePct}% Plan Hit`}
            </Text>
          </View>

          {/* Balanced vs Lagging Grid */}
          <View style={s.muscleBalanceGrid}>
            {stats.muscleAdherence.slice(0, 6).map((item) => {
              const muscleColor = resolveMuscleColor(item.muscle);
              const isBalanced = item.status === 'balanced';
              const isFatigue = item.status === 'fatigue';

              const statusColor = isBalanced ? '#30D158' : isFatigue ? '#FF453A' : colors.textTertiary;
              const statusTag = isBalanced ? 'Optimal' : isFatigue ? 'Fatigue' : 'Lagging';

              return (
                <View
                  key={item.muscle}
                  style={[
                    s.muscleBalanceCard,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F2F2F7' },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, paddingRight: 4 }}>
                      <View style={[s.muscleDot, { backgroundColor: muscleColor }]} />
                      <Text style={[s.muscleItemName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.muscle}
                      </Text>
                    </View>
                    <Text style={[s.statusTextSmall, { color: statusColor }]}>{statusTag}</Text>
                  </View>

                  <View style={s.muscleProgressRow}>
                    <Text style={s.muscleSetCount}>
                      {item.sets} <Text style={{ color: colors.textTertiary, fontSize: 10 }}>/ {item.target} sets</Text>
                    </Text>
                    <View style={s.progressBarTrack}>
                      <View
                        style={[
                          s.progressBarFill,
                          {
                            width: `${Math.min(100, Math.round((item.sets / Math.max(1, item.target)) * 100))}%`,
                            backgroundColor: isBalanced ? '#30D158' : 'rgba(255,255,255,0.3)',
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
});

export default WeeklyHighlightsCarousel;

const s = StyleSheet.create({
  container: {
    marginBottom: SPACE.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    letterSpacing: 0.8,
    color: '#8E8E93',
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
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    width: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  storyCard: {
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
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
    color: '#8E8E93',
    letterSpacing: 0.8,
  },
  storyCardIndex: {
    fontFamily: FONT_FAMILY.mono,
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
  },

  // Hero metric row
  heroMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heroVolumeNum: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: -0.8,
  },
  heroUnit: {
    fontSize: 16,
    color: '#8E8E93',
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
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  overloadRateSub: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10.5,
    color: '#8E8E93',
    marginTop: 1,
  },

  // Sub KPI Grid
  subKpiGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  subKpiPod: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  subKpiVal: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  subKpiLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
  },

  // Podium (Card 2)
  podiumContainer: {
    gap: 8,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  podiumRankCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRankText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    color: '#FFFFFF',
  },
  podiumExName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
  },
  podiumSetText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
  podiumE1rmBox: {
    alignItems: 'flex-end',
  },
  podiumE1rmVal: {
    fontFamily: FONT_FAMILY.mono,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  podiumE1rmLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 9,
    color: '#8E8E93',
  },
  emptyPrBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyPrText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8E8E93',
  },

  // Muscle Balance (Card 3)
  adherenceText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    color: '#8E8E93',
  },
  muscleBalanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleBalanceCard: {
    width: '48.5%',
    borderRadius: RADIUS.md,
    padding: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
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
    gap: 4,
  },
  muscleSetCount: {
    fontFamily: FONT_FAMILY.mono,
    fontSize: 11,
    color: '#FFFFFF',
  },
  progressBarTrack: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
});
