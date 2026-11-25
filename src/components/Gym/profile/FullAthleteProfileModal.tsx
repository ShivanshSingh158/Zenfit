/**
 * FullAthleteProfileModal.tsx — ZenFit
 *
 * Flagship Obsidian Performance Card Dossier:
 * Zero static filler, zero emojis, unit-aware telemetry (KG/LBS),
 * tier rank ladder, muscle focus breakdown, and verified strength profile.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Activity,
  Award,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Flame,
  Pencil,
  Settings,
  ShieldCheck,
  TrendingUp,
  Trophy,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { UserAvatar } from '../../ui/UserAvatar';
import { NumericText, TactileButton, AnimatedProgressBar } from '../../ui';
import BottomSheet from '../../ui/BottomSheet';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';
import { AthleteCardStats, LifterTier, StrengthBenchmark } from '../../../services/athleteCardService';
import { ExerciseDeepDiveModal } from '../exercise/ExerciseDeepDiveModal';
import { GymDayLog } from '../../../types/gym.types';
import { useWeightUnit, formatWeight, formatVolumeParts, kgToDisplay, unitLabel } from '../../../utils/weightUnit';
import { resolveMuscleColor } from '../../../utils/gymUtils';

interface FullAthleteProfileModalProps {
  visible: boolean;
  onClose: () => void;
  stats: AthleteCardStats | null;
  onOpenSetup: () => void;
  onOpenSettings?: () => void;
  onOpenExerciseDeepDive?: (exerciseName: string) => void;
  gymLogs?: GymDayLog[];
}

function getTierAccent(tier: LifterTier, tokens: ThemeTokens): string {
  switch (tier) {
    case 'elite':
      return tokens.accent.primary;
    case 'diamond':
      return tokens.status.info;
    case 'platinum':
      return tokens.accent.secondary;
    case 'gold':
      return tokens.status.gold;
    case 'silver':
      return tokens.text.secondary;
    case 'bronze':
    default:
      return tokens.status.warning;
  }
}

function getBenchmarkStyle(
  category: string,
  tokens: ThemeTokens
): { accent: string; bg: string; Icon: LucideIcon } {
  switch (category) {
    case 'Squat':
      return { accent: tokens.accent.secondary, bg: tokens.accent.secondaryDim, Icon: Activity };
    case 'Deadlift':
      return { accent: tokens.status.warning, bg: tokens.status.warningDim, Icon: Flame };
    case 'OHP':
      return { accent: tokens.status.success, bg: tokens.status.successDim, Icon: TrendingUp };
    case 'Bench':
    default:
      return { accent: tokens.accent.primary, bg: tokens.accent.primaryDim, Icon: Dumbbell };
  }
}

export const FullAthleteProfileModal: React.FC<FullAthleteProfileModalProps> = ({
  visible,
  onClose,
  stats,
  onOpenSetup,
  onOpenSettings,
  onOpenExerciseDeepDive,
  gymLogs = [],
}) => {
  const { tokens, isDark } = useTheme();
  const unitIsLbs = useWeightUnit();
  const uLabel = unitLabel(unitIsLbs);
  const styles = useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);
  const insets = useSafeAreaInsets();
  const tierAccent = stats ? getTierAccent(stats.tier, tokens) : tokens.accent.primary;

  const [selectedExerciseName, setSelectedExerciseName] = useState<string | null>(null);

  const loggedBenchmarks = useMemo(
    () => (stats?.benchmarks || []).filter((b) => b.hasHistory && b.est1RMKg > 0),
    [stats?.benchmarks]
  );

  const volumeParts = useMemo(
    () => formatVolumeParts(stats?.totalLifetimeVolumeKg || 0, unitIsLbs),
    [stats?.totalLifetimeVolumeKg, unitIsLbs]
  );

  const handleBenchmarkPress = (benchmark: StrengthBenchmark) => {
    if (onOpenExerciseDeepDive) {
      onOpenExerciseDeepDive(benchmark.exerciseName);
      return;
    }
    setSelectedExerciseName(benchmark.exerciseName);
  };

  const formattedTierTitle = useMemo(() => {
    const clean = (stats?.tierLabel || 'BRONZE').trim();
    return clean.charAt(0) + clean.slice(1).toLowerCase() + ' Tier';
  }, [stats?.tierLabel]);

  if (!stats) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      fullHeight={true}
      noPadding={true}
      avoidKeyboard={false}
      sheetBackgroundColor={isDark ? '#0B0C10' : '#F8F8FA'}
    >
      <View style={styles.screen}>
        {/* Sticky Obsidian Nav Bar */}
        <View style={styles.navBar}>
          <TactileButton
            variant="custom"
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel="Close performance card"
          >
            <X size={16} strokeWidth={ICON.strokeWidth} color={tokens.text.primary} />
          </TactileButton>

          <View style={styles.navTitlesCol}>
            <Text style={styles.navPreTitle}>ATHLETE DOSSIER</Text>
            <Text style={styles.navTitle}>Performance Card</Text>
          </View>

          <View style={styles.navRightGroup}>
            {onOpenSettings ? (
              <TactileButton
                variant="custom"
                onPress={onOpenSettings}
                style={styles.closeBtn}
                hitSlop={TOUCH.hitSlop}
                accessibilityLabel="Open preferences"
              >
                <Settings size={15} strokeWidth={ICON.strokeWidth} color={tokens.text.primary} />
              </TactileButton>
            ) : null}
            <TactileButton
              variant="custom"
              onPress={onOpenSetup}
              style={styles.editBtn}
              hitSlop={TOUCH.hitSlop}
            >
              <Pencil size={12} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TactileButton>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + SPACE.xl, SPACE.xxl + SPACE.md) },
          ]}
        >
          {/* 1. HERO CREST & TIER PROGRESSION */}
          <View style={styles.heroCard}>
            <LinearGradient
              pointerEvents="none"
              colors={[`${tierAccent}1C`, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.heroTopGlow}
            />

            <View style={styles.heroIdentityRow}>
              <View style={styles.avatarWrap}>
                <View style={[styles.avatarRing, { borderColor: tierAccent }]}>
                  <UserAvatar
                    size={62}
                    uid={(stats as any).uid}
                    photoURL={stats.photoURL}
                    fallbackLetter={stats.displayName ? stats.displayName.slice(0, 1).toUpperCase() : 'A'}
                  />
                </View>
                <View style={[styles.crestCornerBadge, { backgroundColor: isDark ? '#0B0C10' : '#FFFFFF', borderColor: tierAccent }]}>
                  <ShieldCheck size={11} color={tierAccent} strokeWidth={2.3} />
                </View>
              </View>

              <View style={styles.identityTextCol}>
                <View style={styles.nameRow}>
                  <Text style={styles.athleteName} numberOfLines={1} ellipsizeMode="tail">
                    {stats.displayName}
                  </Text>
                  <CheckCircle2 size={15} strokeWidth={ICON.strokeWidth} color={tokens.status.success} style={{ flexShrink: 0 }} />
                </View>

                <NumericText style={styles.physicalStatsText} numberOfLines={1}>
                  {stats.weightKg > 0 ? `${formatWeight(stats.weightKg, unitIsLbs, 1)}  ·  ` : ''}
                  {stats.heightFormatted}
                </NumericText>

                <View style={styles.rankMetaRow}>
                  <View style={[styles.tierDot, { backgroundColor: tierAccent }]} />
                  <Text style={[styles.tierLabelText, { color: tierAccent }]}>
                    {formattedTierTitle}
                  </Text>
                  <Text style={styles.metaSep}>·</Text>
                  <Text style={styles.archetypeText} numberOfLines={1}>
                    {stats.archetype}
                  </Text>
                  {stats.bmi > 0 && (
                    <>
                      <Text style={styles.metaSep}>·</Text>
                      <NumericText style={styles.archetypeText}>BMI {stats.bmi}</NumericText>
                    </>
                  )}
                </View>
              </View>
            </View>

            {/* Rank Ladder Bar */}
            <View style={styles.tierProgressBox}>
              <View style={styles.tierProgressHeader}>
                <NumericText style={styles.tierProgressLeft}>
                  {stats.tierNextName ? `Progress to ${stats.tierNextName}` : 'Maximum Rank'}
                </NumericText>
                <NumericText style={[styles.tierProgressRight, { color: tierAccent }]}>
                  {stats.tierProgressPct}%
                </NumericText>
              </View>
              <AnimatedProgressBar
                progress={stats.tierProgressPct > 0 ? Math.max(4, stats.tierProgressPct) / 100 : 0}
                height={5}
                borderRadius={3}
                durationMs={520}
                replayKey={visible ? 1 : 0}
                color={tierAccent}
                trackColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
              />
              <Text style={styles.tierReqText}>{stats.tierRequirementText}</Text>
            </View>

            {/* 3-Column Real Identity Strip (Zero Nested Box Soup) */}
            <View style={styles.heroStripRow}>
              <View style={styles.heroStripCol}>
                <Text style={styles.stripLabel}>FOCUS</Text>
                <Text style={styles.stripValue} numberOfLines={1}>{stats.goalLabel}</Text>
              </View>
              <View style={styles.heroStripDivider} />
              <View style={styles.heroStripCol}>
                <Text style={styles.stripLabel}>TOP MUSCLE</Text>
                <Text style={styles.stripValue} numberOfLines={1}>{stats.topMuscleGroup}</Text>
              </View>
              <View style={styles.heroStripDivider} />
              <View style={styles.heroStripCol}>
                <Text style={styles.stripLabel}>TOP LIFT</Text>
                <Text style={styles.stripValue} numberOfLines={1}>{stats.signatureExercise}</Text>
              </View>
            </View>
          </View>

          {/* 2. CONSISTENCY & OUTPUT */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionEyebrow}>CONSISTENCY & OUTPUT</Text>
              <NumericText style={styles.sectionMetaRight}>
                {stats.consistencyScorePct}% weekly goal
              </NumericText>
            </View>

            <View style={styles.dualStreakRow}>
              <View style={styles.streakCard}>
                <View style={styles.streakTop}>
                  <View style={[styles.streakIconWrap, { backgroundColor: tokens.status.warningDim }]}>
                    <Flame size={15} strokeWidth={ICON.strokeWidth} color={tokens.status.warning} />
                  </View>
                  <Text style={styles.streakTagText}>CURRENT</Text>
                </View>
                <View style={styles.streakValRow}>
                  <NumericText style={[styles.streakNumber, { color: tokens.status.warning }]}>
                    {stats.streakDays}
                  </NumericText>
                  <Text style={styles.streakUnit}>days</Text>
                </View>
                <Text style={styles.streakHint}>
                  {stats.streakDays > 0 ? 'Active workout streak' : 'Log a workout to start'}
                </Text>
              </View>

              <View style={styles.streakCard}>
                <View style={styles.streakTop}>
                  <View style={[styles.streakIconWrap, { backgroundColor: tokens.status.goldDim }]}>
                    <Trophy size={15} strokeWidth={ICON.strokeWidth} color={tokens.status.gold} />
                  </View>
                  <Text style={styles.streakTagText}>BEST RUN</Text>
                </View>
                <View style={styles.streakValRow}>
                  <NumericText style={[styles.streakNumber, { color: tokens.status.gold }]}>
                    {stats.highestStreakDays}
                  </NumericText>
                  <Text style={styles.streakUnit}>days</Text>
                </View>
                <Text style={styles.streakHint}>All-time longest streak</Text>
              </View>
            </View>

            {/* 4-Metric Lifetime Telemetry Strip */}
            <View style={styles.lifetimeStrip}>
              <View style={styles.lifetimeCell}>
                <NumericText style={styles.lifetimeVal}>{stats.totalWorkouts}</NumericText>
                <Text style={styles.lifetimeLabel}>SESSIONS</Text>
              </View>
              <View style={styles.lifetimeDivider} />
              <View style={styles.lifetimeCell}>
                <NumericText style={styles.lifetimeVal}>{stats.weeklyFrequency}x</NumericText>
                <Text style={styles.lifetimeLabel}>PER WEEK</Text>
              </View>
              <View style={styles.lifetimeDivider} />
              <View style={styles.lifetimeCell}>
                <NumericText style={styles.lifetimeVal}>{stats.totalWorkingSets}</NumericText>
                <Text style={styles.lifetimeLabel}>SETS</Text>
              </View>
              <View style={styles.lifetimeDivider} />
              <View style={styles.lifetimeCell}>
                <NumericText style={styles.lifetimeVal} numberOfLines={1}>
                  {volumeParts.numStr} {volumeParts.suffix}
                </NumericText>
                <Text style={styles.lifetimeLabel}>VOLUME</Text>
              </View>
            </View>
          </View>

          {/* 3. TRAINING DISTRIBUTION (Only when real sets exist) */}
          {stats.muscleDistribution && stats.muscleDistribution.length > 0 && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionEyebrow}>MUSCLE FOCUS</Text>
                <NumericText style={styles.sectionMetaRight}>
                  {stats.totalWorkingSets} lifetime sets
                </NumericText>
              </View>

              <View style={styles.distCard}>
                <View style={styles.distBarTrack}>
                  {stats.muscleDistribution.map((item, idx) => (
                    <View
                      key={item.group}
                      style={[
                        styles.distBarSeg,
                        {
                          flex: Math.max(0.05, item.pct),
                          backgroundColor: resolveMuscleColor(item.group),
                          borderTopLeftRadius: idx === 0 ? 4 : 0,
                          borderBottomLeftRadius: idx === 0 ? 4 : 0,
                          borderTopRightRadius: idx === stats.muscleDistribution.length - 1 ? 4 : 0,
                          borderBottomRightRadius: idx === stats.muscleDistribution.length - 1 ? 4 : 0,
                        },
                      ]}
                    />
                  ))}
                </View>

                <View style={styles.distLegendRow}>
                  {stats.muscleDistribution.map((item) => (
                    <View key={item.group} style={styles.distLegendItem}>
                      <View
                        style={[
                          styles.distLegendDot,
                          { backgroundColor: resolveMuscleColor(item.group) },
                        ]}
                      />
                      <Text style={styles.distLegendName}>{item.group}</Text>
                      <NumericText style={styles.distLegendPct}>{item.pct}%</NumericText>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* 4. STRENGTH PROFILE (Verified Real Lifts Only — Hairline Ledger) */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionEyebrow}>STRENGTH PROFILE</Text>
              <NumericText style={styles.sectionMetaRight}>
                Score {stats.overallStrengthScore}/100
              </NumericText>
            </View>

            {loggedBenchmarks.length > 0 ? (
              <View style={styles.ledgerCard}>
                {loggedBenchmarks.map((b, idx) => {
                  const conf = getBenchmarkStyle(b.category, tokens);
                  const LiftIcon = conf.Icon;
                  const shown1RM = kgToDisplay(b.est1RMKg, unitIsLbs, 0);
                  const shownNext = kgToDisplay(b.nextMilestoneKg, unitIsLbs, 0);
                  const shownDiff = kgToDisplay(b.kgToNextTier, unitIsLbs, 0);

                  return (
                    <View key={`${b.category}-${b.exerciseName}`}>
                      <TactileButton
                        variant="custom"
                        haptic="selection"
                        style={styles.bmRow}
                        onPress={() => handleBenchmarkPress(b)}
                      >
                        <View style={styles.bmTopRow}>
                          <View style={[styles.bmIconWrap, { backgroundColor: conf.bg }]}>
                            <LiftIcon size={16} strokeWidth={ICON.strokeWidth} color={conf.accent} />
                          </View>

                          <View style={styles.bmTitleCol}>
                            <Text style={styles.bmExerciseName} numberOfLines={1} ellipsizeMode="tail">
                              {b.exerciseName}
                            </Text>
                            <NumericText style={styles.bmSubtitle}>
                              {b.categoryLabel} · {b.bwRatio}x BW
                            </NumericText>
                          </View>

                          <View style={styles.bmRightCol}>
                            <NumericText style={styles.bmScoreValue}>
                              {shown1RM} <Text style={styles.bmScoreUnit}>{uLabel}</Text>
                            </NumericText>
                            <Text style={[styles.bmLevelText, { color: conf.accent }]}>{b.level}</Text>
                          </View>

                          <ChevronRight size={15} strokeWidth={ICON.strokeWidth} color={tokens.text.muted} />
                        </View>

                        <View style={styles.bmBarWrap}>
                          <AnimatedProgressBar
                            progress={b.progressPct > 0 ? Math.min(100, Math.max(8, b.progressPct)) / 100 : 0}
                            height={4}
                            borderRadius={3}
                            durationMs={480}
                            replayKey={visible ? 1 : 0}
                            color={conf.accent}
                            trackColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
                          />
                          <View style={styles.bmMilestoneRow}>
                            {b.nextTierName === 'Mastery' ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Award size={12} strokeWidth={ICON.strokeWidth} color={tokens.status.gold} />
                                <Text style={styles.bmMilestoneText}>Elite peak standard</Text>
                              </View>
                            ) : (
                              <NumericText style={styles.bmMilestoneText}>
                                Next: {b.nextTierName} at {shownNext} {uLabel} (+{shownDiff} {uLabel})
                              </NumericText>
                            )}
                          </View>
                        </View>
                      </TactileButton>

                      {idx < loggedBenchmarks.length - 1 && <View style={styles.rowDivider} />}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyBenchmarksCard}>
                <View style={styles.emptyBenchmarksIcon}>
                  <Dumbbell size={18} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emptyBenchmarksTitle}>No strength logs recorded yet</Text>
                  <Text style={styles.emptyBenchmarksSub}>
                    Complete your first workout with sets and weights to unlock 1RM estimates and lift rankings.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

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
    </BottomSheet>
  );
};

const makeStyles = (tokens: ThemeTokens, isDark: boolean) => {
  const cardBg = isDark ? '#14161D' : '#FFFFFF';
  const heroBg = isDark ? '#11131A' : '#FFFFFF';
  const hairline = isDark ? 'rgba(255, 255, 255, 0.08)' : tokens.border.subtle;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    navBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACE.lg,
      paddingTop: SPACE.xs + 2,
      paddingBottom: SPACE.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: hairline,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: RADIUS.full,
      backgroundColor: cardBg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
    },
    navTitlesCol: {
      alignItems: 'center',
      flex: 1,
      marginHorizontal: SPACE.sm,
    },
    navPreTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 9.5,
      color: tokens.text.secondary,
      letterSpacing: 1.2,
    },
    navTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 17,
      color: tokens.text.primary,
      letterSpacing: -0.3,
    },
    navRightGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0,
    },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      height: 34,
      borderRadius: RADIUS.full,
      backgroundColor: cardBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      flexShrink: 0,
    },
    editBtnText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 12.5,
      color: tokens.accent.primary,
    },
    scrollContent: {
      paddingHorizontal: SPACE.lg,
      paddingTop: SPACE.md,
      gap: SPACE.lg,
    },

    // Hero Card
    heroCard: {
      backgroundColor: heroBg,
      borderRadius: 20,
      padding: SPACE.md + 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      overflow: 'hidden',
      gap: SPACE.md,
    },
    heroTopGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 110,
    },
    heroIdentityRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarWrap: {
      position: 'relative',
      flexShrink: 0,
    },
    avatarRing: {
      width: 68,
      height: 68,
      borderRadius: RADIUS.full,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    crestCornerBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    identityTextCol: {
      flex: 1,
      marginLeft: SPACE.md,
      minWidth: 0,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: 0,
    },
    athleteName: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 20,
      color: tokens.text.primary,
      letterSpacing: -0.35,
      flexShrink: 1,
    },
    physicalStatsText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12.5,
      color: tokens.text.secondary,
      marginTop: 2,
    },
    rankMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 5,
      marginTop: 5,
    },
    tierDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    tierLabelText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 12,
      letterSpacing: 0.15,
    },
    metaSep: {
      fontSize: 12,
      color: tokens.text.muted,
    },
    archetypeText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      color: tokens.text.secondary,
    },

    tierProgressBox: {
      gap: 6,
      paddingTop: SPACE.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: hairline,
    },
    tierProgressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    tierProgressLeft: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 11.5,
      color: tokens.text.primary,
    },
    tierProgressRight: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 11.5,
    },
    tierReqText: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 11,
      color: tokens.text.secondary,
    },

    heroStripRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: SPACE.sm + 2,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: hairline,
    },
    heroStripCol: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: 4,
    },
    heroStripDivider: {
      width: StyleSheet.hairlineWidth,
      height: 26,
      backgroundColor: hairline,
    },
    stripLabel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 9.5,
      color: tokens.text.muted,
      letterSpacing: 0.7,
      marginBottom: 2,
    },
    stripValue: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 12.5,
      color: tokens.text.primary,
    },

    // Sections
    sectionBlock: {
      gap: SPACE.sm,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 2,
    },
    sectionEyebrow: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 11,
      color: tokens.text.secondary,
      letterSpacing: 0.8,
    },
    sectionMetaRight: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 11.5,
      color: tokens.text.muted,
      flexShrink: 0,
    },

    // Streaks
    dualStreakRow: {
      flexDirection: 'row',
      gap: SPACE.sm + 2,
    },
    streakCard: {
      flex: 1,
      backgroundColor: cardBg,
      borderRadius: 16,
      padding: SPACE.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      gap: 4,
    },
    streakTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    streakIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    streakTagText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 9.5,
      color: tokens.text.muted,
      letterSpacing: 0.8,
    },
    streakValRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    streakNumber: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 28,
      letterSpacing: -0.8,
    },
    streakUnit: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      color: tokens.text.secondary,
    },
    streakHint: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 11.5,
      color: tokens.text.secondary,
    },

    // Lifetime Strip
    lifetimeStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: cardBg,
      borderRadius: 16,
      paddingVertical: 13,
      paddingHorizontal: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
    },
    lifetimeCell: {
      flex: 1,
      alignItems: 'center',
      minWidth: 0,
      paddingHorizontal: 2,
    },
    lifetimeDivider: {
      width: StyleSheet.hairlineWidth,
      height: 26,
      backgroundColor: hairline,
    },
    lifetimeVal: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
      color: tokens.text.primary,
      letterSpacing: -0.2,
    },
    lifetimeLabel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 9.5,
      color: tokens.text.muted,
      letterSpacing: 0.6,
      marginTop: 2,
    },

    // Muscle Focus Distribution
    distCard: {
      backgroundColor: cardBg,
      borderRadius: 16,
      padding: SPACE.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      gap: 10,
    },
    distBarTrack: {
      flexDirection: 'row',
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      gap: 2,
    },
    distBarSeg: {
      height: '100%',
    },
    distLegendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    distLegendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    distLegendDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    distLegendName: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      color: tokens.text.primary,
    },
    distLegendPct: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 11.5,
      color: tokens.text.secondary,
    },

    // Strength Ledger
    ledgerCard: {
      backgroundColor: cardBg,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      overflow: 'hidden',
    },
    bmRow: {
      paddingVertical: 13,
      paddingHorizontal: 15,
      gap: 9,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: hairline,
      marginHorizontal: 15,
    },
    bmTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    bmIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    bmTitleCol: {
      flex: 1,
      minWidth: 0,
    },
    bmExerciseName: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14.5,
      color: tokens.text.primary,
      letterSpacing: -0.2,
    },
    bmSubtitle: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 12,
      color: tokens.text.secondary,
      marginTop: 1,
    },
    bmRightCol: {
      alignItems: 'flex-end',
      flexShrink: 0,
    },
    bmScoreValue: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
      color: tokens.text.primary,
    },
    bmScoreUnit: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 11.5,
      color: tokens.text.secondary,
    },
    bmLevelText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 10.5,
      marginTop: 1,
    },
    bmBarWrap: {
      gap: 5,
    },
    bmMilestoneRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    bmMilestoneText: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 11.5,
      color: tokens.text.secondary,
    },

    emptyBenchmarksCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: cardBg,
      borderRadius: 16,
      padding: SPACE.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
    },
    emptyBenchmarksIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: tokens.accent.primaryDim,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    emptyBenchmarksTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
      color: tokens.text.primary,
      marginBottom: 2,
    },
    emptyBenchmarksSub: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 12,
      color: tokens.text.secondary,
      lineHeight: 17,
    },
  });
};
