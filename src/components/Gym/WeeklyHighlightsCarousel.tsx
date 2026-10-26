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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={s.sparkleBadge}>
            <Ionicons name="sparkles" size={12} color="#A599FF" />
          </View>
          <Text style={s.sectionTitle}>WEEKLY HIGHLIGHTS</Text>
        </View>

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
            CARD 1: Overall Volume & Overload Rate (85% Overload Success)
           ══════════════════════════════════════════════════════════════════ */}
        <View style={[s.storyCard, { width: cardWidth, backgroundColor: isDark ? '#18181C' : colors.surface }]}>
          {/* Card Top Label */}
          <View style={s.cardTopRow}>
            <View style={s.cardTagPill}>
              <Ionicons name="trending-up" size={11} color="#30D158" />
              <Text style={s.cardTagText}>OVERLOAD VELOCITY</Text>
            </View>
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
                  color={stats.volumeDeltaPct >= 0 ? '#30D158' : '#FF453A'}
                />
                <Text
                  style={[
                    s.deltaText,
                    { color: stats.volumeDeltaPct >= 0 ? '#30D158' : '#FF453A' },
                  ]}
                >
                  {volumeDeltaText}
                </Text>
              </View>
            </View>

            {/* Overload Success Rate Radial / Circle Badge */}
            <View style={s.overloadBadgeContainer}>
              <View style={s.overloadRingWrap}>
                <Text style={s.overloadRateNum}>{stats.overloadRatePct}%</Text>
                <Text style={s.overloadRateSub}>Overload</Text>
              </View>
              <View style={s.overloadSuccessTag}>
                <Text style={s.overloadSuccessTagText}>Success</Text>
              </View>
            </View>
          </View>

          {/* Sub-KPI Pods */}
          <View style={s.subKpiGrid}>
            <View style={[s.subKpiPod, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F2F2F7' }]}>
              <Ionicons name="barbell-outline" size={13} color="#A599FF" />
              <Text style={s.subKpiVal}>{stats.sessionCount} Workouts</Text>
              <Text style={s.subKpiLabel}>Sessions Hit</Text>
            </View>

            <View style={[s.subKpiPod, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F2F2F7' }]}>
              <Ionicons name="layers-outline" size={13} color="#60A5FA" />
              <Text style={s.subKpiVal}>{stats.thisWeekSets} Sets</Text>
              <Text style={s.subKpiLabel}>Hypertrophy Volume</Text>
            </View>

            <View style={[s.subKpiPod, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F2F2F7' }]}>
              <Ionicons name="flash-outline" size={13} color="#FFD700" />
              <Text style={s.subKpiVal}>{stats.weightUnlocksCount} Unlocks</Text>
              <Text style={s.subKpiLabel}>Weight Upgrades</Text>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            CARD 2: Top 3 PRs with Golden Trophy Badges
           ══════════════════════════════════════════════════════════════════ */}
        <View style={[s.storyCard, { width: cardWidth, backgroundColor: isDark ? '#18181C' : colors.surface }]}>
          <View style={s.cardTopRow}>
            <View style={[s.cardTagPill, { borderColor: 'rgba(255,215,0,0.3)', backgroundColor: 'rgba(255,215,0,0.1)' }]}>
              <Ionicons name="trophy" size={11} color="#FFD700" />
              <Text style={[s.cardTagText, { color: '#FFD700' }]}>PR TROPHY SHELF</Text>
            </View>
            <Text style={s.storyCardIndex}>2 OF 3</Text>
          </View>

          {/* Top 3 PR Podium / Badges */}
          <View style={s.podiumContainer}>
            {stats.topPRs && stats.topPRs.length > 0 ? (
              stats.topPRs.slice(0, 3).map((pr, index) => {
                const isGold = index === 0;
                const isSilver = index === 1;
                const rankColor = isGold ? '#FFD700' : isSilver ? '#E0E0E0' : '#CD7F32';
                const rankLabel = isGold ? '🥇 1st' : isSilver ? '🥈 2nd' : '🥉 3rd';

                return (
                  <TouchableOpacity
                    key={`${pr.exerciseName}-${index}`}
                    style={[
                      s.podiumRow,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F2F2F7',
                        borderColor: isGold ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.06)',
                      },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => {
                      hapticLight();
                      if (onSelectExercise) onSelectExercise(pr.exerciseName);
                    }}
                  >
                    {/* Rank Badge */}
                    <View style={[s.podiumRankBadge, { backgroundColor: `${rankColor}1A`, borderColor: `${rankColor}40` }]}>
                      <Text style={[s.podiumRankText, { color: rankColor }]}>{rankLabel}</Text>
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
                <Ionicons name="medal-outline" size={28} color="#FFD700" />
                <Text style={s.emptyPrText}>Log working sets to unlock personal records!</Text>
              </View>
            )}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            CARD 3: Anatomical Muscle Heatmap & Balanced vs Lagging Indicators
           ══════════════════════════════════════════════════════════════════ */}
        <View style={[s.storyCard, { width: cardWidth, backgroundColor: isDark ? '#18181C' : colors.surface }]}>
          <View style={s.cardTopRow}>
            <View style={[s.cardTagPill, { borderColor: 'rgba(165,153,255,0.3)', backgroundColor: 'rgba(165,153,255,0.1)' }]}>
              <Ionicons name="body-outline" size={11} color="#A599FF" />
              <Text style={[s.cardTagText, { color: '#A599FF' }]}>ANATOMICAL BALANCE</Text>
            </View>
            <View style={s.adherencePill}>
              <Text style={s.adherencePillText}>
                {stats.overallAdherencePct >= 100 ? '100% Plan Hit' : `${stats.overallAdherencePct}% Plan Hit`}
              </Text>
            </View>
          </View>

          {/* Balanced vs Lagging Grid */}
          <View style={s.muscleBalanceGrid}>
            {stats.muscleAdherence.slice(0, 6).map((item, i) => {
              const muscleColor = resolveMuscleColor(item.muscle);
              const isBalanced = item.status === 'balanced';
              const isFatigue = item.status === 'fatigue';

              const statusColor = isBalanced ? '#30D158' : isFatigue ? '#FF453A' : '#FF9F0A';
              const statusTag = isBalanced ? 'Optimal' : isFatigue ? 'Fatigue' : 'Lagging';

              return (
                <View
                  key={item.muscle}
                  style={[
                    s.muscleBalanceCard,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F2F2F7' },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <View style={[s.muscleDot, { backgroundColor: muscleColor }]} />
                      <Text style={[s.muscleItemName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.muscle}
                      </Text>
                    </View>
                    <View style={[s.statusBadgeSmall, { backgroundColor: `${statusColor}18` }]}>
                      <Text style={[s.statusBadgeSmallText, { color: statusColor }]}>{statusTag}</Text>
                    </View>
                  </View>

                  <View style={s.muscleProgressRow}>
                    <Text style={s.muscleSetCount}>
                      {item.sets} <Text style={{ color: '#8E8E93', fontSize: 10 }}>/ {item.target} sets</Text>
                    </Text>
                    <View style={s.progressBarTrack}>
                      <View
                        style={[
                          s.progressBarFill,
                          {
                            width: `${Math.min(100, Math.round((item.sets / Math.max(1, item.target)) * 100))}%`,
                            backgroundColor: statusColor,
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
  sparkleBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(165,153,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    letterSpacing: 1.2,
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
    width: 18,
    backgroundColor: '#A599FF',
  },
  dotInactive: {
    width: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  storyCard: {
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    minHeight: 184,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(48,209,88,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(48,209,88,0.3)',
  },
  cardTagText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    color: '#30D158',
    letterSpacing: 0.5,
  },
  storyCardIndex: {
    fontFamily: FONT_FAMILY.mono,
    fontSize: 10.5,
    color: '#8E8E93',
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

  // Overload Radial Badge
  overloadBadgeContainer: {
    alignItems: 'center',
  },
  overloadRingWrap: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(48,209,88,0.12)',
    borderWidth: 2.5,
    borderColor: '#30D158',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overloadRateNum: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 17,
    color: '#30D158',
    letterSpacing: -0.3,
  },
  overloadRateSub: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 9,
    color: '#30D158',
    marginTop: -2,
  },
  overloadSuccessTag: {
    backgroundColor: '#30D158',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
    marginTop: -8,
  },
  overloadSuccessTagText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 8.5,
    color: '#000000',
    textTransform: 'uppercase',
  },

  // Sub KPI Grid
  subKpiGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  subKpiPod: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  subKpiVal: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
  },
  subKpiLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 9.5,
    color: '#8E8E93',
    marginTop: 1,
  },

  // Podium (Card 2)
  podiumContainer: {
    gap: 8,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 9,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  podiumRankBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  podiumRankText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
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
    color: '#FFD700',
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
  adherencePill: {
    backgroundColor: 'rgba(48,209,88,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(48,209,88,0.3)',
  },
  adherencePillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#30D158',
  },
  muscleBalanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleBalanceCard: {
    width: '48.5%',
    borderRadius: RADIUS.md,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  muscleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  muscleItemName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11.5,
  },
  statusBadgeSmall: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  statusBadgeSmallText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 8.5,
    textTransform: 'uppercase',
  },
  muscleProgressRow: {
    marginTop: 6,
    gap: 4,
  },
  muscleSetCount: {
    fontFamily: FONT_FAMILY.mono,
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
