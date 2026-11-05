/**
 * FullAthleteProfileModal.tsx — ZenFit
 *
 * Flagship Athlete Performance Dossier & Interactive Showcase:
 * - High-craft Cyber-Athletic & Apple Fitness+ aesthetics
 * - Dual-Streak Engine (Active Streak & All-Time Best Highest Streak)
 * - Interactive Big 3 & OHP Strength Benchmarks with touch affordance
 *   (Tapping opens ExerciseDeepDiveModal with interactive 1RM & trajectory charts)
 * - Biometric & Anthropometric profile with verified Gmail identity
 * - Clean, spacious layout with flawless alignment and zero overflow
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '../../ui/UserAvatar';
import { FONT_FAMILY } from '../../../theme/tokens';
import { AthleteCardStats, LifterTier, StrengthBenchmark } from '../../../services/athleteCardService';
import { ExerciseDeepDiveModal } from '../exercise/ExerciseDeepDiveModal';
import { GymDayLog } from '../../../types/gym.types';
import { hapticLight, hapticSelection } from '../../../utils/haptics';

interface FullAthleteProfileModalProps {
  visible: boolean;
  onClose: () => void;
  stats: AthleteCardStats;
  onOpenSetup: () => void;
  gymLogs?: GymDayLog[];
}

interface TierTheme {
  primary: string;
  secondary: string;
  gradient: [string, string];
  pillBg: string;
  pillBorder: string;
  glowColor: string;
  icon: string;
}

const TIER_THEMES: Record<LifterTier, TierTheme> = {
  elite: {
    primary: '#00F0FF',
    secondary: '#7000FF',
    gradient: ['#00F0FF', '#7000FF'],
    pillBg: 'rgba(0, 240, 255, 0.12)',
    pillBorder: 'rgba(0, 240, 255, 0.35)',
    glowColor: 'rgba(0, 240, 255, 0.25)',
    icon: '👑',
  },
  diamond: {
    primary: '#0A84FF',
    secondary: '#5AC8FA',
    gradient: ['#0A84FF', '#5AC8FA'],
    pillBg: 'rgba(10, 132, 255, 0.12)',
    pillBorder: 'rgba(10, 132, 255, 0.35)',
    glowColor: 'rgba(10, 132, 255, 0.25)',
    icon: '💎',
  },
  platinum: {
    primary: '#BF5AF2',
    secondary: '#5E5CE6',
    gradient: ['#BF5AF2', '#5E5CE6'],
    pillBg: 'rgba(191, 90, 242, 0.12)',
    pillBorder: 'rgba(191, 90, 242, 0.35)',
    glowColor: 'rgba(191, 90, 242, 0.25)',
    icon: '⚡',
  },
  gold: {
    primary: '#FFD700',
    secondary: '#FF9F0A',
    gradient: ['#FFD700', '#FF9F0A'],
    pillBg: 'rgba(255, 215, 0, 0.12)',
    pillBorder: 'rgba(255, 215, 0, 0.35)',
    glowColor: 'rgba(255, 215, 0, 0.25)',
    icon: '🥇',
  },
  silver: {
    primary: '#E5E5EA',
    secondary: '#8E8E93',
    gradient: ['#E5E5EA', '#8E8E93'],
    pillBg: 'rgba(229, 229, 234, 0.12)',
    pillBorder: 'rgba(229, 229, 234, 0.35)',
    glowColor: 'rgba(229, 229, 234, 0.20)',
    icon: '🥈',
  },
  bronze: {
    primary: '#F59E0B',
    secondary: '#D97706',
    gradient: ['#F59E0B', '#D97706'],
    pillBg: 'rgba(245, 158, 11, 0.12)',
    pillBorder: 'rgba(245, 158, 11, 0.35)',
    glowColor: 'rgba(245, 158, 11, 0.20)',
    icon: '🥉',
  },
};

const BENCHMARK_COLORS: Record<string, { accent: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Bench: { accent: '#00F0FF', bg: 'rgba(0, 240, 255, 0.12)', icon: 'barbell' },
  Squat: { accent: '#BF5AF2', bg: 'rgba(191, 90, 242, 0.12)', icon: 'body' },
  Deadlift: { accent: '#FF9F0A', bg: 'rgba(255, 159, 10, 0.12)', icon: 'fitness' },
  OHP: { accent: '#30D158', bg: 'rgba(48, 209, 88, 0.12)', icon: 'trending-up' },
};

export const FullAthleteProfileModal: React.FC<FullAthleteProfileModalProps> = ({
  visible,
  onClose,
  stats,
  onOpenSetup,
  gymLogs = [],
}) => {
  const insets = useSafeAreaInsets();
  const theme = TIER_THEMES[stats.tier] || TIER_THEMES.bronze;

  // Selected benchmark exercise to deep dive
  const [selectedExerciseName, setSelectedExerciseName] = useState<string | null>(null);

  const handleBenchmarkPress = (benchmark: StrengthBenchmark) => {
    hapticSelection();
    setSelectedExerciseName(benchmark.exerciseName);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* Top Header Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              onClose();
            }}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.navTitlesCol}>
            <Text style={styles.navPreTitle}>ATHLETE DOSSIER</Text>
            <Text style={styles.navTitle}>Performance Card</Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              hapticLight();
              onOpenSetup();
            }}
            style={styles.editBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil" size={13} color="#0A84FF" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 28, 48) },
          ]}
        >
          {/* ══════════════════════════════════════════════════════════
              1. HERO ATHLETE DOSSIER CARD (Spacious Apple OLED, Zero Truncation)
          ══════════════════════════════════════════════════════════ */}
          <View style={styles.heroCard}>
            {/* Identity Row */}
            <View style={styles.heroIdentityRow}>
              <View style={[styles.avatarGlowRing, { borderColor: theme.primary }]}>
                <UserAvatar
                  size={64}
                  photoURL={stats.photoURL}
                  fallbackLetter={stats.displayName ? stats.displayName.slice(0, 1).toUpperCase() : 'A'}
                />
              </View>

              <View style={styles.identityTextCol}>
                <View style={styles.nameRow}>
                  <Text style={styles.athleteName} numberOfLines={1} ellipsizeMode="tail">
                    {stats.displayName}
                  </Text>
                  <Ionicons name="checkmark-circle" size={17} color="#30D158" style={{ flexShrink: 0 }} />
                </View>

                {/* Line 2: Weight & Height (Spacious, Never Truncates) */}
                <Text style={styles.physicalStatsText} numberOfLines={1}>
                  {stats.weightKg ? (stats.weightKg + ' kg  ·  ') : ''}{stats.heightFormatted}
                </Text>

                {/* Line 3: Rank, BMI & Archetype */}
                <View style={styles.rankSubRow}>
                  <View style={[styles.tierDot, { backgroundColor: theme.primary }]} />
                  <Text style={[styles.tierRankText, { color: theme.primary }]}>
                    {stats.tierLabel.replace(' TIER', '')} Tier
                  </Text>
                  <Text style={styles.rankDotDivider}>·</Text>
                  <Text style={styles.archetypeText} numberOfLines={1}>
                    BMI {stats.bmi}
                  </Text>
                </View>
              </View>
            </View>

            {/* Vital Performance Metrics (Spacious 2-Row Layout, No Truncation) */}
            <View style={styles.heroMetricsCard}>
              <View style={styles.heroMetricsTopRow}>
                <View style={styles.heroMetricBox}>
                  <Text style={styles.heroMetricLabel}>TRAINING FOCUS</Text>
                  <Text style={styles.heroMetricValue} numberOfLines={1}>
                    {stats.goalLabel.replace(' & Growth', '').replace(' Training', '')}
                  </Text>
                </View>

                <View style={styles.heroMetricDivider} />

                <View style={styles.heroMetricBox}>
                  <Text style={styles.heroMetricLabel}>TOP TARGET</Text>
                  <Text style={styles.heroMetricValue} numberOfLines={1}>
                    {stats.topMuscleGroup}
                  </Text>
                </View>
              </View>

              <View style={styles.heroSignatureRow}>
                <View style={styles.heroSignatureIconWrap}>
                  <Ionicons name="trophy-outline" size={13} color="#FFD700" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.heroSignatureLabel}>TOP RECORDED LIFT</Text>
                  <Text style={styles.heroSignatureValue} numberOfLines={1} ellipsizeMode="tail">
                    {stats.signatureExercise}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════════
              2. CONSISTENCY & DUAL-STREAK ARENA
          ══════════════════════════════════════════════════════════ */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleCol}>
                <View style={styles.sectionTitleRow}>
                  <Text style={{ fontSize: 14 }}>🔥</Text>
                  <Text style={styles.sectionTitle} numberOfLines={1} ellipsizeMode="tail">
                    CONSISTENCY & STREAKS
                  </Text>
                </View>
                <Text style={styles.sectionSubtitle} numberOfLines={1} ellipsizeMode="tail">
                  Active momentum & records
                </Text>
              </View>
              <View style={styles.adherenceScorePill}>
                <Text style={styles.adherenceScoreText}>
                  {stats.consistencyScorePct}% Consistency
                </Text>
              </View>
            </View>

            {/* Dual-Streak Showcase Cards (Current vs All-Time Highest) */}
            <View style={styles.dualStreakGrid}>
              {/* CURRENT ACTIVE STREAK */}
              <View style={styles.streakHeroCard}>
                <LinearGradient
                  colors={['rgba(255, 107, 0, 0.12)', 'rgba(255, 107, 0, 0.02)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.streakCardGradient}
                >
                  <View style={styles.streakCardTop}>
                    <Text style={{ fontSize: 20 }}>🔥</Text>
                    <View style={styles.activeStreakTag}>
                      <Text style={styles.activeStreakTagText}>ACTIVE</Text>
                    </View>
                  </View>

                  <View style={styles.streakNumberRow}>
                    <Text style={styles.streakNumberText}>{stats.streakDays}</Text>
                    <Text style={styles.streakUnitText}>DAYS</Text>
                  </View>

                  <Text style={styles.streakCaption}>Current Streak</Text>
                  <Text style={styles.streakSubcaption}>
                    {stats.streakDays > 0 ? 'Momentum running strong' : 'Log a session to ignite'}
                  </Text>
                </LinearGradient>
              </View>

              {/* ALL-TIME HIGHEST STREAK */}
              <View style={styles.streakHeroCard}>
                <LinearGradient
                  colors={['rgba(255, 215, 0, 0.12)', 'rgba(255, 215, 0, 0.02)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.streakCardGradient}
                >
                  <View style={styles.streakCardTop}>
                    <Text style={{ fontSize: 20 }}>🏆</Text>
                    <View style={styles.recordStreakTag}>
                      <Text style={styles.recordStreakTagText}>RECORD</Text>
                    </View>
                  </View>

                  <View style={styles.streakNumberRow}>
                    <Text style={styles.highestStreakNumberText}>{stats.highestStreakDays}</Text>
                    <Text style={styles.streakUnitText}>DAYS</Text>
                  </View>

                  <Text style={styles.streakCaption}>All-Time Highest</Text>
                  <Text style={styles.streakSubcaption}>
                    Peak historical dedication
                  </Text>
                </LinearGradient>
              </View>
            </View>

            {/* Performance KPI Pills (Sessions, Weekly, Tonnage) */}
            <View style={styles.kpiRow}>
              <View style={styles.kpiItem}>
                <Ionicons name="barbell-outline" size={15} color="#0A84FF" />
                <View style={{ marginLeft: 8, flex: 1, minWidth: 0 }}>
                  <Text style={styles.kpiValueText} numberOfLines={1}>{stats.totalWorkouts}</Text>
                  <Text style={styles.kpiLabelText}>SESSIONS</Text>
                </View>
              </View>

              <View style={styles.kpiDivider} />

              <View style={styles.kpiItem}>
                <Ionicons name="speedometer-outline" size={15} color="#30D158" />
                <View style={{ marginLeft: 8, flex: 1, minWidth: 0 }}>
                  <Text style={styles.kpiValueText} numberOfLines={1}>{stats.weeklyFrequency}x</Text>
                  <Text style={styles.kpiLabelText}>PER WEEK</Text>
                </View>
              </View>

              <View style={styles.kpiDivider} />

              <View style={styles.kpiItem}>
                <Ionicons name="cube-outline" size={15} color="#BF5AF2" />
                <View style={{ marginLeft: 8, flex: 1, minWidth: 0 }}>
                  <Text style={styles.kpiValueText} numberOfLines={1}>{stats.totalLifetimeVolumeFormatted}</Text>
                  <Text style={styles.kpiLabelText}>TONNAGE</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════════
              3. INTERACTIVE STRENGTH BENCHMARKS (TAP FOR GRAPH)
          ══════════════════════════════════════════════════════════ */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleCol}>
                <Text style={styles.sectionTitle} numberOfLines={1} ellipsizeMode="tail">
                  STRENGTH BENCHMARKS
                </Text>
                <Text style={styles.sectionSubtitle} numberOfLines={1} ellipsizeMode="tail">
                  Tap any lift to view progression charts ↗
                </Text>
              </View>
              <View style={styles.strengthScorePill}>
                <Text style={styles.strengthScoreText}>
                  Score {stats.overallStrengthScore}/100
                </Text>
              </View>
            </View>

            {/* 4 Interactive Benchmark Cards */}
            <View style={styles.benchmarksList}>
              {stats.benchmarks.map((b) => {
                const conf = BENCHMARK_COLORS[b.category] || BENCHMARK_COLORS.Bench;
                return (
                  <TouchableOpacity
                    key={b.category}
                    style={styles.benchmarkCard}
                    onPress={() => handleBenchmarkPress(b)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.bmCardHeader}>
                      <View style={[styles.bmIconWrap, { backgroundColor: conf.bg }]}>
                        <Ionicons name={conf.icon} size={17} color={conf.accent} />
                      </View>

                      <View style={styles.bmTitleCol}>
                        <Text style={styles.bmExerciseName} numberOfLines={1} ellipsizeMode="tail">
                          {b.exerciseName}
                        </Text>
                        <Text style={styles.bmSubtitle}>
                          {b.categoryLabel} {b.bwRatio > 0 ? `· ${b.bwRatio}x BW` : '· Active Plan'}
                        </Text>
                      </View>

                      {b.est1RMKg > 0 ? (
                        <View style={styles.bmScoreCol}>
                          <Text style={styles.bmScoreValue}>
                            {b.est1RMKg} <Text style={styles.bmScoreUnit}>kg</Text>
                          </Text>
                          <Text style={[styles.bmScoreLevel, { color: conf.accent }]}>{b.level}</Text>
                        </View>
                      ) : (
                        <View style={styles.bmUntrackedCol}>
                          <Text style={styles.bmUntrackedText}>View</Text>
                          <Ionicons name="chevron-forward" size={14} color="#8E8E93" />
                        </View>
                      )}
                    </View>

                    {b.est1RMKg > 0 ? (
                      <View style={styles.bmProgressSection}>
                        <View style={styles.bmProgressTrack}>
                          <View
                            style={[
                              styles.bmProgressBar,
                              {
                                width: `${Math.min(100, Math.max(10, b.progressPct))}%`,
                                backgroundColor: conf.accent,
                              },
                            ]}
                          />
                        </View>
                        <View style={styles.bmMilestoneRow}>
                          <Text style={styles.bmMilestoneText} numberOfLines={1} ellipsizeMode="tail">
                            {b.nextTierName === 'Mastery'
                              ? '👑 Elite Tier Achieved · Peak Load'
                              : `Next: ${b.nextTierName} at ${b.nextMilestoneKg} kg (+${b.kgToNextTier} kg)`}
                          </Text>
                          <Ionicons name="trending-up" size={12} color={conf.accent} />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.bmUntrackedFooter}>
                        <Text style={styles.bmUntrackedFooterText} numberOfLines={1}>
                          Tap to view technique guide, load trajectories & personal records ↗
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════════
              4. AUTHENTICITY SEAL & ACTIONS
          ══════════════════════════════════════════════════════════ */}
          <View style={styles.authenticityBox}>
            <View style={styles.authHeader}>
              <Ionicons name="shield-checkmark" size={17} color="#30D158" />
              <Text style={styles.authTitle}>ZENFIT ATHLETE ID · VERIFIED PERFORMANCE</Text>
            </View>
            <Text style={styles.authSubtitle}>
              Benchmarked dynamically against bodyweight, progressive overload volume, and verified set logs.
            </Text>

            <TouchableOpacity
              onPress={() => {
                hapticLight();
                onOpenSetup();
              }}
              style={styles.updateStatsBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="options-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.updateStatsBtnText}>Update Physical Stats & Focus</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* ══════════════════════════════════════════════════════════
            5. EXERCISE DEEP DIVE MODAL (INTERACTIVE TRAJECTORY GRAPH)
        ══════════════════════════════════════════════════════════ */}
        {selectedExerciseName && (
          <ExerciseDeepDiveModal
            visible={!!selectedExerciseName}
            exerciseName={selectedExerciseName}
            gymLogs={gymLogs}
            initialTab="analytics"
            onClose={() => setSelectedExerciseName(null)}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  navTitlesCol: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  navPreTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#8E8E93',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  navTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexShrink: 0,
  },
  editBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#0A84FF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  /* ── Hero Dossier Card (Spacious Apple OLED, Zero Truncation) ── */
  heroCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  heroIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarGlowRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181B',
    flexShrink: 0,
  },
  identityTextCol: {
    flex: 1,
    marginLeft: 14,
    minWidth: 0,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    minWidth: 0,
  },
  athleteName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  physicalStatsText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    color: '#D1D1D6',
    marginBottom: 4,
  },
  rankSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tierDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tierRankText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  rankDotDivider: {
    fontSize: 12,
    color: '#636366',
  },
  archetypeText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#AEAEB2',
  },

  /* ── Hero Metrics (2-Row Spacious Grid, Zero Truncation) ── */
  heroMetricsCard: {
    backgroundColor: '#242426',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    gap: 10,
  },
  heroMetricsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroMetricBox: {
    flex: 1,
    paddingHorizontal: 4,
  },
  heroMetricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 8,
  },
  heroMetricLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    color: '#8E8E93',
    letterSpacing: 0.8,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  heroMetricValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  heroSignatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroSignatureIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroSignatureLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9,
    color: '#8E8E93',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroSignatureValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#FFFFFF',
    marginTop: 1,
  },

  /* ── Section Header ── */
  sectionContainer: {
    marginBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleCol: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
    justifyContent: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#E4E4E7',
    letterSpacing: 0.5,
    flexShrink: 1,
    minWidth: 0,
  },
  sectionSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#71717A',
    marginTop: 2,
  },
  adherenceScorePill: {
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    flexShrink: 0,
    alignSelf: 'center',
  },
  adherenceScoreText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#FF9F0A',
    letterSpacing: 0.3,
  },

  /* ── Dual-Streak Grid ── */
  dualStreakGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  streakHeroCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#151518',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  streakCardGradient: {
    padding: 14,
  },
  streakCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeStreakTag: {
    backgroundColor: 'rgba(255, 107, 0, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeStreakTagText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9,
    color: '#FF6B00',
    letterSpacing: 0.6,
  },
  recordStreakTag: {
    backgroundColor: 'rgba(255, 215, 0, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recordStreakTagText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9,
    color: '#FFD700',
    letterSpacing: 0.6,
  },
  streakNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 2,
  },
  streakNumberText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 30,
    color: '#FF6B00',
    lineHeight: 36,
    flexShrink: 1,
  },
  highestStreakNumberText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 30,
    color: '#FFD700',
    lineHeight: 36,
    flexShrink: 1,
  },
  streakUnitText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#71717A',
    letterSpacing: 0.5,
  },
  streakCaption: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 13,
    color: '#FFFFFF',
    marginTop: 2,
  },
  streakSubcaption: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    color: '#71717A',
    marginTop: 2,
  },

  /* ── KPI Row ── */
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#151518',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  kpiItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  kpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 6,
  },
  kpiValueText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  kpiLabelText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 9,
    color: '#71717A',
    letterSpacing: 0.5,
  },

  /* ── Benchmarks ── */
  strengthScorePill: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    flexShrink: 0,
    alignSelf: 'center',
  },
  strengthScoreText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#00F0FF',
    letterSpacing: 0.3,
  },
  benchmarksList: {
    gap: 10,
  },
  benchmarkCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  bmCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bmIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  bmTitleCol: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  bmExerciseName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  bmSubtitle: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11.5,
    color: '#8E8E93',
    marginTop: 2,
  },
  bmScoreCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  bmScoreValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  bmScoreUnit: {
    fontSize: 11,
    color: '#8E8E93',
    fontFamily: FONT_FAMILY.regular,
  },
  bmScoreLevel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    letterSpacing: 0.3,
    marginTop: 1,
  },
  bmUntrackedCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  bmUntrackedText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    color: '#8E8E93',
  },
  bmProgressSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  bmProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  bmProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  bmMilestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bmMilestoneText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#8E8E93',
    flex: 1,
    marginRight: 6,
  },
  bmUntrackedFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  bmUntrackedFooterText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#636366',
  },

  /* ── Authenticity Box ── */
  authenticityBox: {
    backgroundColor: '#121215',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  authHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  authTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#30D158',
    letterSpacing: 0.8,
  },
  authSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#71717A',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 16,
  },
  updateStatsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: '#1F1F24',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  updateStatsBtnText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
