import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BookOpen, Calendar, ChevronDown, ChevronRight, Trophy } from 'lucide-react-native';

import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';
import { hapticLight, hapticSelection } from '../../../utils/haptics';
import { formatIndianDatePretty } from '../../../utils/gymUtils';
import { KG_TO_LBS, formatWeight, kgToDisplay, unitLabel, useWeightUnit } from '../../../utils/weightUnit';
import { estimate1RM } from '../../../services/oneRepMaxEngine';
import { TactileButton } from '../../../components/ui/TactileButton';
import { NumericText } from '../../../components/ui/NumericText';
import { IOSSegmentedControl } from '../../../components/ui/IOSSegmentedControl';
import { AnimatedSvgLineChart, ChartDataPoint } from '../../../components/ui/AnimatedSvgCharts';
import AnimatedSvgDonutChart from '../../../components/ui/AnimatedSvgDonutChart';
import ExercisePickerSheet from '../../../components/Gym/exercise/ExercisePickerSheet';
import {
  AnalyticsDateRange,
  AnchorLift,
  ExerciseHistoryProfile,
  ExercisePRSummary,
  PREvent,
} from '../../../services/gymAnalyticsEngine';
import { parseLocalDate, todayStr } from '../../../utils/dateCore';
import { makeHistoryStyles } from './gymHistoryStyles';

export type ExCategoryFilter = 'All' | 'Push' | 'Pull' | 'Legs' | 'Arms' | 'Core';
export type ExerciseChartMetric = 'weight' | '1rm' | 'volume';
export type ExerciseHorizon = '8s' | '1m' | '3m' | '6m' | 'all' | 'custom';

export interface ExercisesSubTabProps {
  styles: ReturnType<typeof makeHistoryStyles>;
  tokens: ThemeTokens;
  cardBg: string;
  elevatedBg: string;
  isHeavyReady: boolean;
  safeChartWidth: number;
  replayKey: number | string;
  exerciseSearchQuery: string;
  onChangeSearch: (q: string) => void;
  exCategoryFilter: ExCategoryFilter;
  onSelectCategory: (cat: ExCategoryFilter) => void;
  filteredExerciseProfiles: ExerciseHistoryProfile[];
  allExerciseProfiles: ExerciseHistoryProfile[];
  allExercisePRs: ExercisePRSummary[];
  anchorLifts: {
    push: AnchorLift | null;
    pull: AnchorLift | null;
    legs: AnchorLift | null;
    totalAnchorE1RM: number;
  };
  recentPRs: PREvent[];
  activeExerciseProfile: ExerciseHistoryProfile | null;
  onSelectExerciseName: (name: string) => void;
  exerciseChartMetric: ExerciseChartMetric;
  onChangeMetric: (m: ExerciseChartMetric) => void;
  selectedDataPointIdx: number | null;
  onSelectDataPointIdx: (idx: number | null) => void;
  horizon: ExerciseHorizon;
  customExerciseRange: AnalyticsDateRange | null;
  onSelectHorizon: (h: ExerciseHorizon) => void;
  onOpenCustomSheet: () => void;
  onOpenDeepDive: (name: string, tab: 'guide' | 'analytics') => void;
  onOpenWorkoutSummary: (dateStr: string) => void;
  formatVol: (kg: number) => string;
  onGoToToday: () => void;
}

export const ExercisesSubTab: React.FC<ExercisesSubTabProps> = React.memo(
  function ExercisesSubTab({
    styles,
    tokens,
    cardBg,
    elevatedBg,
    isHeavyReady,
    safeChartWidth,
    replayKey,
    exerciseSearchQuery,
    onChangeSearch,
    exCategoryFilter,
    onSelectCategory,
    filteredExerciseProfiles,
    allExerciseProfiles,
    allExercisePRs,
    anchorLifts,
    recentPRs,
    activeExerciseProfile,
    onSelectExerciseName,
    exerciseChartMetric,
    onChangeMetric,
    selectedDataPointIdx,
    onSelectDataPointIdx,
    horizon,
    customExerciseRange,
    onSelectHorizon,
    onOpenCustomSheet,
    onOpenDeepDive,
    onOpenWorkoutSummary,
    formatVol,
    onGoToToday,
  }) {
    const unitIsLbs = useWeightUnit();
    const localStyles = useMemo(() => makeLocalStyles(tokens), [tokens]);
    const profileKey = `${replayKey}-${activeExerciseProfile?.name ?? 'none'}`;
    const [showAllSessions, setShowAllSessions] = useState(false);
    const [showAnchorDrawer, setShowAnchorDrawer] = useState(false);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [selectedRepSlice, setSelectedRepSlice] = useState<string | null>(null);

    useEffect(() => {
      setShowAllSessions(false);
      setSelectedRepSlice(null);
    }, [activeExerciseProfile?.name, horizon]);

    // Filter sessions strictly according to selected horizon (`8s` | `1m` | `3m` | `6m` | `all` | `custom`)
    const scopedSessions = useMemo(() => {
      const sessions = activeExerciseProfile?.sessions || [];
      if (sessions.length === 0) return [];
      if (horizon === 'all') return sessions;
      if (horizon === '8s') return sessions.slice(-8);
      if (horizon === 'custom' && customExerciseRange) {
        return sessions.filter(s => {
          const d = s.date.slice(0, 10);
          return d >= customExerciseRange.startDate && d <= customExerciseRange.endDate;
        });
      }
      const days = horizon === '1m' ? 30 : horizon === '3m' ? 90 : 180;
      const cutoff = parseLocalDate(todayStr());
      cutoff.setDate(cutoff.getDate() - days);
      const cutStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
      return sessions.filter(s => s.date.slice(0, 10) >= cutStr);
    }, [activeExerciseProfile?.sessions, horizon, customExerciseRange]);

    // Compute ALL Hero KPIs, Rep-Max PR Brackets, and Progression Status scoped to selected horizon
    const scopedExerciseStats = useMemo(() => {
      let bestWeight = 0;
      let bestReps = 0;
      let bestE1RM = 0;
      let lastWeight = 0;
      let lastReps = 0;

      const repBrackets: {
        '1-3RM': { weight: number; reps: number; e1rm: number } | null;
        '4-6RM': { weight: number; reps: number; e1rm: number } | null;
        '7-10RM': { weight: number; reps: number; e1rm: number } | null;
        '11-15RM': { weight: number; reps: number; e1rm: number } | null;
      } = {
        '1-3RM': null,
        '4-6RM': null,
        '7-10RM': null,
        '11-15RM': null,
      };

      for (const sess of scopedSessions) {
        for (const st of sess.sets) {
          const w = Number(st.weight) || 0;
          const r = Number(st.reps) || 0;
          const rm = w > 0 && r > 0 ? Math.round(estimate1RM(w, r, 'hybrid', st.rir)) : 0;
          if (w > bestWeight || (w === bestWeight && r > bestReps)) {
            bestWeight = w;
            bestReps = r;
          }
          if (rm > bestE1RM) bestE1RM = rm;

          if (r >= 1) {
            const bKey =
              r <= 3 ? '1-3RM' : r <= 6 ? '4-6RM' : r <= 10 ? '7-10RM' : r <= 15 ? '11-15RM' : null;
            if (bKey) {
              const cur = repBrackets[bKey];
              if (!cur || w > cur.weight || (w === cur.weight && r > cur.reps)) {
                repBrackets[bKey] = { weight: w, reps: r, e1rm: rm };
              }
            }
          }
        }
      }

      if (scopedSessions.length > 0) {
        const lastSess = scopedSessions[scopedSessions.length - 1];
        lastWeight = lastSess.topWeight;
        lastReps = lastSess.topReps;
      }

      let status: 'progressing' | 'consolidating' | 'stalled' | 'baseline' = 'baseline';
      let message = 'Baseline session in range';
      if (scopedSessions.length >= 2) {
        const last = scopedSessions[scopedSessions.length - 1];
        const prev = scopedSessions[scopedSessions.length - 2];
        const deltaW = Math.round((last.topWeight - prev.topWeight) * 10) / 10;
        const deltaR = last.topReps - prev.topReps;
        const dispDeltaW = Math.round(kgToDisplay(deltaW, unitIsLbs, 1) * 10) / 10;
        if (deltaW > 0) {
          status = 'progressing';
          message = `+${dispDeltaW} ${unitLabel(unitIsLbs)} load added vs prior session`;
        } else if (deltaW === 0 && deltaR > 0) {
          status = 'progressing';
          message = `+${deltaR} reps added at working load`;
        } else if (scopedSessions.length >= 3) {
          const s1 = scopedSessions[scopedSessions.length - 3];
          const s2 = prev;
          const s3 = last;
          if (s3.topWeight <= s2.topWeight && s2.topWeight <= s1.topWeight && s3.topReps <= s2.topReps) {
            status = 'stalled';
            message = '3+ sessions without weight or rep increase';
          } else {
            status = 'consolidating';
            message = 'Volume consolidation at working load';
          }
        } else {
          status = 'consolidating';
          message = 'Building volume at working load';
        }
      } else if (scopedSessions.length === 0) {
        message = 'No sessions logged inside selected range';
      }

      return {
        bestWeight,
        bestReps,
        bestE1RM,
        lastWeight,
        lastReps,
        sessionsCount: scopedSessions.length,
        repBrackets,
        progressionStatus: { status, message },
      };
    }, [scopedSessions, unitIsLbs]);

    const horizonLabel = useMemo(() => {
      if (horizon === '8s') return '8 Sess';
      if (horizon === '1m') return '1M';
      if (horizon === '3m') return '3M';
      if (horizon === '6m') return '6M';
      if (horizon === 'custom' && customExerciseRange) return customExerciseRange.label;
      return 'All Time';
    }, [horizon, customExerciseRange]);

    // Build Curve Data + PR Milestone Markers
    const { trajectoryPoints, prMarkerIndices, windowDeltaPct } = useMemo(() => {
      if (scopedSessions.length < 2) {
        return {
          trajectoryPoints: [] as ChartDataPoint[],
          prMarkerIndices: [] as number[],
          windowDeltaPct: null as number | null,
        };
      }
      let runningMaxMetric = 0;
      const prIdxs: number[] = [];

      const pts: ChartDataPoint[] = scopedSessions.map((p, idx) => {
        const e1rm =
          p.topWeight > 0 && p.topReps > 0
            ? Math.round(p.topWeight * (1 + Math.min(p.topReps, 15) / 30))
            : 0;
        const rawMetric =
          exerciseChartMetric === 'weight'
            ? p.topWeight
            : exerciseChartMetric === '1rm'
            ? e1rm
            : p.sessionVolume;

        if (rawMetric > runningMaxMetric && idx > 0) {
          runningMaxMetric = rawMetric;
          prIdxs.push(idx);
        } else if (idx === 0) {
          runningMaxMetric = rawMetric;
        }

        const chartVal =
          exerciseChartMetric === 'volume'
            ? unitIsLbs
              ? Math.round(rawMetric * KG_TO_LBS)
              : rawMetric
            : kgToDisplay(rawMetric, unitIsLbs, 1);

        return {
          value: Number.isFinite(chartVal) ? chartVal : 0,
          xLabel: p.shortDate,
          meta: {
            fullDate: p.date,
            val: rawMetric,
            reps: p.topReps,
            isPr: prIdxs.includes(idx),
          },
        };
      });

      const firstVal = pts[0]?.value || 0;
      const lastVal = pts[pts.length - 1]?.value || 0;
      const deltaPct = firstVal > 0 ? Math.round(((lastVal - firstVal) / firstVal) * 1000) / 10 : null;

      return {
        trajectoryPoints: pts,
        prMarkerIndices: prIdxs,
        windowDeltaPct: deltaPct,
      };
    }, [scopedSessions, exerciseChartMetric, unitIsLbs]);

    // Rep-Zone Stimulus Distribution & Average RIR for active lift
    const { repZoneSlices, totalRepSets, avgRirText } = useMemo(() => {
      let strength = 0;
      let hypertrophy = 0;
      let endurance = 0;
      let rirSum = 0;
      let rirCount = 0;

      for (const sess of scopedSessions) {
        for (const st of sess.sets) {
          const reps = Number(st.reps) || 0;
          if (reps > 0) {
            if (reps <= 5) strength++;
            else if (reps <= 12) hypertrophy++;
            else endurance++;
          }
          if (typeof st.rir === 'number' && Number.isFinite(st.rir)) {
            rirSum += st.rir;
            rirCount++;
          }
        }
      }
      const total = strength + hypertrophy + endurance;
      return {
        totalRepSets: total,
        avgRirText: rirCount > 0 ? `${(rirSum / rirCount).toFixed(1)} avg RIR` : 'No RIR tagged',
        repZoneSlices: [
          {
            id: 'str',
            label: 'Strength (1–5)',
            value: strength,
            color: tokens.status.gold,
            subLabel: `${strength} sets`,
          },
          {
            id: 'hyp',
            label: 'Growth (6–12)',
            value: hypertrophy,
            color: tokens.accent.primary,
            subLabel: `${hypertrophy} sets`,
          },
          {
            id: 'end',
            label: 'Endure (13+)',
            value: endurance,
            color: tokens.status.success,
            subLabel: `${endurance} sets`,
          },
        ],
      };
    }, [scopedSessions, tokens]);

    const reversedSessions = useMemo(() => {
      return scopedSessions.slice().reverse();
    }, [scopedSessions]);

    const visibleSessions = useMemo(
      () => (showAllSessions ? reversedSessions : reversedSessions.slice(0, 12)),
      [reversedSessions, showAllSessions]
    );

    const renderProfileChip = useCallback(
      ({ item: p }: { item: ExerciseHistoryProfile }) => {
        const isSel = p.name === activeExerciseProfile?.name;
        return (
          <TactileButton
            lightweight
            variant="custom"
            haptic="none"
            onPress={() => {
              hapticLight();
              onSelectExerciseName(p.name);
              onSelectDataPointIdx(null);
            }}
            style={[styles.exChipBtn, isSel ? styles.exChipBtnActive : styles.exChipBtnInactive]}
          >
            <Text style={[styles.exChipText, isSel ? styles.exChipTextActive : styles.exChipTextInactive]}>
              {p.name}
            </Text>
            <NumericText
              style={[styles.exChipCount, isSel ? styles.exChipCountActive : styles.exChipCountInactive]}
            >
              {p.totalSessions}
            </NumericText>
          </TactileButton>
        );
      },
      [activeExerciseProfile?.name, onSelectDataPointIdx, onSelectExerciseName, styles]
    );

    const renderSessionRow = useCallback(
      ({ item: sess, index: sIdx }: { item: ExerciseHistoryProfile['sessions'][number]; index: number }) => {
        const isLast = sIdx === visibleSessions.length - 1;
        return (
          <Pressable
            onPress={() => {
              hapticLight();
              onOpenWorkoutSummary(sess.date);
            }}
            style={({ pressed }) => [
              {
                backgroundColor: cardBg,
                paddingHorizontal: 16,
                borderLeftWidth: StyleSheet.hairlineWidth,
                borderRightWidth: StyleSheet.hairlineWidth,
                borderColor: tokens.border.subtle,
              },
              pressed && { opacity: 0.78 },
            ]}
          >
            <View
              style={{
                paddingVertical: SPACE.sm + 2,
                borderBottomWidth: isLast ? 0 : 0.5,
                borderBottomColor: tokens.border.subtle,
              }}
            >
              <View style={styles.pastExSessHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <NumericText style={styles.pastExSessDate}>
                    {formatIndianDatePretty(sess.date)}
                  </NumericText>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <NumericText style={styles.pastExSessVol}>{formatVol(sess.sessionVolume)}</NumericText>
                  <ChevronRight size={13} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
                </View>
              </View>

              <View style={styles.pastExSetsWrap}>
                {sess.sets.map((st, idx) => (
                  <NumericText key={idx} style={styles.pastExSetText}>
                    <Text style={{ fontFamily: FONT_FAMILY.bold, color: tokens.text.primary }}>
                      {st.weight > 0 ? formatWeight(st.weight, unitIsLbs, 1) : 'BW'} × {st.reps}
                    </Text>
                    {idx < sess.sets.length - 1 ? '  ·  ' : ''}
                  </NumericText>
                ))}
              </View>
            </View>
          </Pressable>
        );
      },
      [cardBg, formatVol, onOpenWorkoutSummary, styles, tokens.border.subtle, tokens.text.muted, tokens.text.primary, unitIsLbs, visibleSessions.length]
    );

    const hasAnchors = Boolean(anchorLifts.push || anchorLifts.pull || anchorLifts.legs);

    const listHeader = (
      <>
        {/* Top Row: Search Input + Big-3 Anchor Summary Pill */}
        <View style={localStyles.topActionRow}>
          <View style={[styles.searchBar, { backgroundColor: cardBg, flex: 1, marginBottom: 0 }]}>
            <Ionicons
              name="search"
              size={15}
              color={tokens.text.secondary}
              style={{ marginRight: SPACE.sm }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search lift..."
              placeholderTextColor={tokens.text.secondary}
              value={exerciseSearchQuery}
              onChangeText={onChangeSearch}
            />
            {exerciseSearchQuery.length > 0 && (
              <TactileButton
                lightweight
                variant="custom"
                haptic="light"
                onPress={() => onChangeSearch('')}
                hitSlop={TOUCH.hitSlop}
                style={{ padding: SPACE.xs }}
              >
                <Ionicons name="close" size={16} color={tokens.text.secondary} />
              </TactileButton>
            )}
          </View>

          {hasAnchors && (
            <TactileButton
              lightweight
              variant="custom"
              haptic="selection"
              onPress={() => setShowAnchorDrawer(prev => !prev)}
              style={[
                localStyles.anchorPillBtn,
                {
                  backgroundColor: showAnchorDrawer ? tokens.accent.primaryDim : cardBg,
                  borderColor: showAnchorDrawer ? tokens.accent.primary : tokens.border.subtle,
                },
              ]}
            >
              <Trophy size={13} color={tokens.status.gold} strokeWidth={ICON.strokeWidth} />
              <NumericText style={localStyles.anchorPillText}>
                {anchorLifts.totalAnchorE1RM > 0
                  ? formatWeight(anchorLifts.totalAnchorE1RM, unitIsLbs, 0)
                  : 'PRs'}
              </NumericText>
              <ChevronDown size={13} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
            </TactileButton>
          )}
        </View>

        {/* Collapsible Anchor Total & Recent 30d PRs Drawer */}
        {showAnchorDrawer && (
          <View style={[styles.insetCard, { backgroundColor: cardBg, marginBottom: 10 }]}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardSectionLabel}>ANCHOR LIFTS & RECENT PRs</Text>
                <Text style={styles.cardSubLabel}>Tap any lift below to jump to its trajectory</Text>
              </View>
            </View>

            <View style={styles.anchorList}>
              {([anchorLifts.push, anchorLifts.pull, anchorLifts.legs].filter(Boolean) as AnchorLift[]).map(a => (
                <TactileButton
                  key={a.category}
                  variant="custom"
                  haptic="light"
                  onPress={() => {
                    onSelectExerciseName(a.exerciseName);
                    onSelectDataPointIdx(null);
                    setShowAnchorDrawer(false);
                  }}
                  style={[styles.anchorRow, { backgroundColor: elevatedBg }]}
                >
                  <View style={styles.anchorCatPill}>
                    <Text style={styles.anchorCatText}>{a.category.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0, paddingHorizontal: 10 }}>
                    <Text style={styles.anchorExName} numberOfLines={1}>{a.exerciseName}</Text>
                    <NumericText style={styles.anchorSetSub}>
                      Best: {a.formattedSet} · {a.sessionCount} sessions
                    </NumericText>
                  </View>
                  <View style={styles.anchorE1rmCol}>
                    <NumericText style={styles.anchorE1rmVal}>
                      {formatWeight(a.bestE1RM, unitIsLbs, 0)}
                    </NumericText>
                    <Text style={styles.anchorE1rmUnit}>e1RM</Text>
                  </View>
                </TactileButton>
              ))}
            </View>

            {recentPRs.length > 0 && (
              <View style={localStyles.prTickerWrap}>
                <Text style={[localStyles.subTag, { marginBottom: 6 }]}>
                  RECENT 30D RECORDS ({recentPRs.length})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {recentPRs.slice(0, 6).map(pr => (
                    <TactileButton
                      key={pr.id}
                      lightweight
                      variant="custom"
                      onPress={() => {
                        onSelectExerciseName(pr.exerciseName);
                        setShowAnchorDrawer(false);
                      }}
                      style={[localStyles.prChip, { backgroundColor: elevatedBg }]}
                    >
                      <Text style={localStyles.prChipTitle} numberOfLines={1}>
                        {pr.exerciseName}
                      </Text>
                      <NumericText style={localStyles.prChipDiff}>
                        {pr.diffText}
                      </NumericText>
                    </TactileButton>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.horizontalChipsScroll, { marginBottom: SPACE.xs }]}
          style={{ marginBottom: 8 }}
        >
          {(['All', 'Push', 'Pull', 'Legs', 'Arms', 'Core'] as const).map(cat => {
            const isSel = exCategoryFilter === cat;
            return (
              <TactileButton
                key={cat}
                lightweight
                variant="custom"
                haptic="none"
                onPress={() => {
                  hapticLight();
                  onSelectCategory(cat);
                }}
                style={[styles.splitFilterBtn, isSel ? styles.splitFilterBtnActive : styles.splitFilterBtnInactive]}
              >
                <Text
                  style={[
                    styles.splitFilterText,
                    isSel ? styles.splitFilterTextActive : styles.splitFilterTextInactive,
                  ]}
                >
                  {cat}
                </Text>
              </TactileButton>
            );
          })}
        </ScrollView>

        {/* Prominent Picker Button + Form Guide Shortcut */}
        {activeExerciseProfile && (
          <View style={localStyles.selectorBarRow}>
            <TactileButton
              variant="custom"
              haptic="selection"
              onPress={() => setPickerVisible(true)}
              style={[localStyles.pickerTriggerBtn, { backgroundColor: cardBg, borderColor: tokens.border.subtle }]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={localStyles.pickerTriggerName} numberOfLines={1}>
                  {activeExerciseProfile.name}
                </Text>
                <NumericText style={localStyles.pickerTriggerMeta}>
                  All logged lifts ({filteredExerciseProfiles.length}) · Tap to browse all
                </NumericText>
              </View>
              <ChevronDown size={16} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
            </TactileButton>

            <TactileButton
              variant="custom"
              haptic="light"
              onPress={() => onOpenDeepDive(activeExerciseProfile.name, 'guide')}
              style={[localStyles.guideIconBtn, { backgroundColor: cardBg, borderColor: tokens.border.subtle }]}
              hitSlop={TOUCH.hitSlop}
              accessibilityLabel="Open form guide"
            >
              <BookOpen size={16} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
            </TactileButton>
          </View>
        )}

        {/* Quick-Switch Recent/Top Chips */}
        <FlatList
          horizontal
          data={filteredExerciseProfiles.slice(0, 10)}
          keyExtractor={item => item.name}
          renderItem={renderProfileChip}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalChipsScroll}
          style={{ marginBottom: 10 }}
          initialNumToRender={6}
          extraData={activeExerciseProfile?.name}
        />

        {activeExerciseProfile ? (
          <>
            {/* 1. Selected Exercise Benchmark Hero */}
            <View style={[styles.insetCard, { backgroundColor: cardBg, marginBottom: 10 }]}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1, paddingRight: SPACE.sm }}>
                  <Text style={styles.exHeroTitle} numberOfLines={1}>
                    {activeExerciseProfile.name}
                  </Text>
                  <Text style={styles.exHeroSubtitle}>
                    {activeExerciseProfile.muscle} · {activeExerciseProfile.category} · {horizonLabel} · {avgRirText}
                  </Text>
                </View>
                {windowDeltaPct !== null && (
                  <View
                    style={[
                      localStyles.deltaBadge,
                      {
                        backgroundColor:
                          windowDeltaPct >= 0
                            ? tokens.status.successDim
                            : tokens.status.warningDim,
                      },
                    ]}
                  >
                    <NumericText
                      style={[
                        localStyles.deltaBadgeText,
                        {
                          color:
                            windowDeltaPct >= 0
                              ? tokens.status.success
                              : tokens.status.warning,
                        },
                      ]}
                    >
                      {windowDeltaPct >= 0 ? '+' : ''}
                      {windowDeltaPct}%
                    </NumericText>
                  </View>
                )}
              </View>

              <View style={styles.kpiGrid}>
                <View style={styles.kpiCol}>
                  <NumericText style={[styles.kpiValue, { color: tokens.status.success }]}>
                    {scopedExerciseStats.bestWeight > 0
                      ? formatWeight(scopedExerciseStats.bestWeight, unitIsLbs, 1)
                      : scopedExerciseStats.bestReps > 0
                      ? 'BW'
                      : '—'}
                  </NumericText>
                  <Text style={styles.kpiLabel}>{horizon === 'all' ? 'ALL-TIME PR' : 'RANGE PR'}</Text>
                </View>

                <View style={styles.kpiCol}>
                  <NumericText style={[styles.kpiValue, { color: tokens.accent.secondary }]}>
                    {scopedExerciseStats.bestE1RM > 0
                      ? formatWeight(scopedExerciseStats.bestE1RM, unitIsLbs, 0)
                      : '—'}
                  </NumericText>
                  <Text style={styles.kpiLabel}>EST. 1RM</Text>
                </View>

                <View style={styles.kpiCol}>
                  <NumericText style={styles.kpiValue}>
                    {scopedExerciseStats.lastWeight > 0
                      ? formatWeight(scopedExerciseStats.lastWeight, unitIsLbs, 1)
                      : scopedExerciseStats.lastReps > 0
                      ? `${scopedExerciseStats.lastReps}r`
                      : '—'}
                  </NumericText>
                  <Text style={styles.kpiLabel}>LAST LOAD</Text>
                </View>

                <View style={styles.kpiCol}>
                  <NumericText style={styles.kpiValue}>{scopedExerciseStats.sessionsCount}</NumericText>
                  <Text style={styles.kpiLabel}>SESSIONS</Text>
                </View>
              </View>

              {/* Inline Progression Status Footer */}
              <View style={localStyles.statusFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          scopedExerciseStats.progressionStatus.status === 'progressing'
                            ? tokens.status.success
                            : scopedExerciseStats.progressionStatus.status === 'stalled'
                            ? tokens.status.warning
                            : tokens.text.secondary,
                      },
                    ]}
                  />
                  <Text style={[styles.statusMessage, { flex: 1 }]} numberOfLines={1}>
                    {scopedExerciseStats.progressionStatus.message}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color:
                        scopedExerciseStats.progressionStatus.status === 'progressing'
                          ? tokens.status.success
                          : scopedExerciseStats.progressionStatus.status === 'stalled'
                          ? tokens.status.warning
                          : tokens.text.muted,
                    },
                  ]}
                >
                  {scopedExerciseStats.progressionStatus.status === 'progressing'
                    ? 'PROGRESSING'
                    : scopedExerciseStats.progressionStatus.status === 'stalled'
                    ? 'FLAT'
                    : scopedExerciseStats.progressionStatus.status === 'baseline'
                    ? 'FIRST LOG'
                    : 'STEADY'}
                </Text>
              </View>
            </View>

            {/* 2. Strength Trajectory Card with Horizon Pills & PR Stars */}
            <View style={[styles.insetCard, { backgroundColor: cardBg, marginBottom: 10 }]}>
              <View style={[styles.cardHeaderRow, { alignItems: 'center', gap: SPACE.sm }]}>
                <View style={{ flex: 1, minWidth: 0, paddingRight: SPACE.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.cardSectionLabel}>STRENGTH CURVE</Text>
                    {windowDeltaPct !== null && (
                      <NumericText
                        style={{
                          fontSize: 10.5,
                          fontFamily: FONT_FAMILY.bold,
                          color: windowDeltaPct >= 0 ? tokens.status.success : tokens.status.warning,
                        }}
                      >
                        {windowDeltaPct >= 0 ? '+' : ''}
                        {windowDeltaPct}%
                      </NumericText>
                    )}
                  </View>
                  <Text style={styles.cardSubLabel} numberOfLines={1}>
                    {exerciseChartMetric === '1rm'
                      ? 'Estimated 1RM · Gold dots = PRs'
                      : exerciseChartMetric === 'weight'
                      ? 'Top weight · Gold dots = PRs'
                      : 'Session tonnage lifted'}
                  </Text>
                </View>

                <View style={{ width: 152, flexShrink: 0 }}>
                  <IOSSegmentedControl
                    segments={[
                      { id: '1rm', label: '1RM' },
                      { id: 'weight', label: 'Weight' },
                      { id: 'volume', label: 'Vol' },
                    ]}
                    activeId={exerciseChartMetric}
                    onSelect={id => {
                      onChangeMetric(id as ExerciseChartMetric);
                      onSelectDataPointIdx(null);
                    }}
                    height={32}
                    style={{ backgroundColor: elevatedBg }}
                  />
                </View>
              </View>

              {/* Curve Horizon Filter Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, marginBottom: SPACE.sm }}
              >
                {([
                  { id: '8s' as const, label: '8 Sess' },
                  { id: '1m' as const, label: '1M' },
                  { id: '3m' as const, label: '3M' },
                  { id: '6m' as const, label: '6M' },
                  { id: 'all' as const, label: 'All' },
                ]).map(opt => {
                  const active = horizon === opt.id;
                  return (
                    <TactileButton
                      key={opt.id}
                      lightweight
                      variant="custom"
                      onPress={() => {
                        hapticSelection();
                        onSelectHorizon(opt.id);
                        onSelectDataPointIdx(null);
                      }}
                      style={[
                        localStyles.horizonPill,
                        { backgroundColor: active ? tokens.accent.primary : elevatedBg },
                      ]}
                    >
                      <Text
                        style={[
                          localStyles.horizonText,
                          { color: active ? tokens.accent.onPrimary : tokens.text.secondary },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TactileButton>
                  );
                })}
                <TactileButton
                  lightweight
                  variant="custom"
                  onPress={() => {
                    hapticLight();
                    onOpenCustomSheet();
                  }}
                  style={[
                    localStyles.horizonPill,
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: horizon === 'custom' ? tokens.accent.primaryDim : elevatedBg,
                    },
                  ]}
                >
                  <Calendar
                    size={11}
                    color={horizon === 'custom' ? tokens.accent.primary : tokens.text.secondary}
                    strokeWidth={ICON.strokeWidth}
                  />
                  <Text
                    style={[
                      localStyles.horizonText,
                      { color: horizon === 'custom' ? tokens.accent.primary : tokens.text.secondary },
                    ]}
                  >
                    {horizon === 'custom' && customExerciseRange ? customExerciseRange.label : 'Custom'}
                  </Text>
                </TactileButton>
              </ScrollView>

              {/* Selected Data Point Tooltip */}
              {selectedDataPointIdx != null && trajectoryPoints[selectedDataPointIdx] && (
                <View style={[styles.dataPointTooltip, { backgroundColor: elevatedBg }]}>
                  <NumericText style={styles.tooltipText}>
                    {formatIndianDatePretty(trajectoryPoints[selectedDataPointIdx].meta.fullDate)}:{' '}
                    <NumericText style={{ fontFamily: FONT_FAMILY.bold, color: tokens.text.primary }}>
                      {exerciseChartMetric === 'volume'
                        ? formatVol(trajectoryPoints[selectedDataPointIdx].meta.val)
                        : exerciseChartMetric === '1rm'
                        ? `${formatWeight(trajectoryPoints[selectedDataPointIdx].meta.val, unitIsLbs, 0)} e1RM`
                        : `${formatWeight(trajectoryPoints[selectedDataPointIdx].meta.val, unitIsLbs, 1)} × ${trajectoryPoints[selectedDataPointIdx].meta.reps}`}
                    </NumericText>
                    {trajectoryPoints[selectedDataPointIdx].meta.isPr ? '  ★ PR' : ''}
                  </NumericText>
                </View>
              )}

              {!isHeavyReady ? (
                <View
                  style={{
                    width: safeChartWidth,
                    height: 156,
                    backgroundColor: elevatedBg,
                    borderRadius: RADIUS.inner,
                    opacity: 0.25,
                    alignSelf: 'center',
                    marginTop: SPACE.sm,
                  }}
                />
              ) : trajectoryPoints.length >= 2 ? (
                <View style={{ alignItems: 'center', marginTop: SPACE.xs }}>
                  <AnimatedSvgLineChart
                    points={trajectoryPoints}
                    width={safeChartWidth}
                    height={156}
                    strokeColor={tokens.accent.primary}
                    interactiveScrub={true}
                    selectedIndex={selectedDataPointIdx}
                    onSelectIndex={onSelectDataPointIdx}
                    prMarkerIndices={prMarkerIndices}
                    showLinearTrend={trajectoryPoints.length >= 4}
                    replayKey={profileKey}
                    gradientId="history_ex_traj_grad"
                  />
                </View>
              ) : (
                <Text style={styles.emptyNote}>
                  Log at least 2 sessions inside this range to view progression.
                </Text>
              )}
            </View>

            {/* 3. Rep-Max PR Matrix & Rep-Zone Stimulus Donut (Scoped to Range) */}
            {(scopedSessions.length > 0 || totalRepSets > 0) && (
              <View style={[styles.insetCard, { backgroundColor: cardBg, marginBottom: 10, gap: 14 }]}>
                <View style={styles.cardHeaderRow}>
                  <View>
                    <Text style={styles.cardSectionLabel}>REP-MAX RECORDS & STIMULUS MIX</Text>
                    <Text style={styles.cardSubLabel}>
                      {horizonLabel} · Best lifts by rep bracket & intensity zones
                    </Text>
                  </View>
                </View>

                {scopedSessions.length > 0 && (
                  <View style={localStyles.repMatrixGrid}>
                    {(['1-3RM', '4-6RM', '7-10RM', '11-15RM'] as const).map(bracket => {
                      const rec = scopedExerciseStats.repBrackets[bracket];
                      return (
                        <View
                          key={bracket}
                          style={[localStyles.repMatrixCell, { backgroundColor: elevatedBg }]}
                        >
                          <Text style={localStyles.repMatrixTag}>{bracket}</Text>
                          <NumericText style={localStyles.repMatrixVal} numberOfLines={1}>
                            {rec
                              ? `${rec.weight > 0 ? formatWeight(rec.weight, unitIsLbs, 1) : 'BW'} × ${rec.reps}`
                              : '—'}
                          </NumericText>
                        </View>
                      );
                    })}
                  </View>
                )}

                {totalRepSets > 0 && (
                  <View style={{ paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.border.subtle }}>
                    <AnimatedSvgDonutChart
                      slices={repZoneSlices}
                      size={122}
                      strokeWidth={16}
                      centerValue={`${totalRepSets}`}
                      centerLabel="SETS"
                      selectedSliceId={selectedRepSlice}
                      onSelectSlice={setSelectedRepSlice}
                      replayKey={profileKey}
                    />
                  </View>
                )}
              </View>
            )}

            {/* 4. Historical Set Diary Header */}
            <View
              style={[
                styles.insetCard,
                {
                  backgroundColor: cardBg,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  borderBottomWidth: 0,
                  paddingBottom: SPACE.sm,
                },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.cardSectionLabel}>SESSION DIARY</Text>
                  <NumericText style={styles.cardSubLabel}>
                    {reversedSessions.length} logged {reversedSessions.length === 1 ? 'session' : 'sessions'} · Tap to view workout
                  </NumericText>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={[styles.insetCard, { backgroundColor: cardBg, alignItems: 'center', paddingVertical: SPACE.xxl }]}>
            <Ionicons name="barbell-outline" size={32} color={tokens.text.secondary} />
            <Text style={styles.emptyTitle}>No Matching Exercises</Text>
            <Text style={styles.emptyNote}>
              Complete a workout with working sets to see strength progression curves here.
            </Text>
            <TactileButton
              variant="custom"
              haptic="medium"
              style={[styles.startGeneralWorkoutBtn, { marginTop: SPACE.md }]}
              onPress={onGoToToday}
            >
              <Text style={styles.startGeneralWorkoutBtnText}>Go to Today</Text>
            </TactileButton>
          </View>
        )}
      </>
    );

    const listFooter =
      activeExerciseProfile && reversedSessions.length > 0 ? (
        <View
          style={{
            backgroundColor: cardBg,
            borderBottomLeftRadius: RADIUS.card,
            borderBottomRightRadius: RADIUS.card,
            borderLeftWidth: StyleSheet.hairlineWidth,
            borderRightWidth: StyleSheet.hairlineWidth,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderColor: tokens.border.subtle,
            paddingBottom: reversedSessions.length > 12 ? 12 : 4,
            marginBottom: SPACE.sm,
          }}
        >
          {reversedSessions.length > 12 && (
            <TactileButton
              variant="custom"
              haptic="light"
              onPress={() => setShowAllSessions(s => !s)}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: SPACE.sm,
                marginTop: SPACE.xs,
              }}
            >
              <Text style={{ fontSize: 12.5, fontFamily: FONT_FAMILY.bold, color: tokens.accent.primary }}>
                {showAllSessions ? 'Show Recent 12 Sessions' : `Show All ${reversedSessions.length} Sessions`}
              </Text>
            </TactileButton>
          )}
        </View>
      ) : null;

    return (
      <>
        <FlatList
          data={activeExerciseProfile ? visibleSessions : []}
          keyExtractor={(item, idx) => `${activeExerciseProfile?.name ?? 'ex'}-${item.date}-${idx}`}
          renderItem={renderSessionRow}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          keyboardShouldPersistTaps="handled"
        />

        <ExercisePickerSheet
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          profiles={allExerciseProfiles}
          selectedName={activeExerciseProfile?.name ?? null}
          onSelectExercise={name => {
            onSelectExerciseName(name);
            onSelectDataPointIdx(null);
          }}
        />
      </>
    );
  }
);

const makeLocalStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    topActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    anchorPillBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      height: 40,
      paddingHorizontal: 11,
      borderRadius: RADIUS.inner,
      borderWidth: StyleSheet.hairlineWidth,
      flexShrink: 0,
    },
    anchorPillText: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.primary,
    },
    prTickerWrap: {
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: tokens.border.subtle,
    },
    subTag: {
      fontSize: 10,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.muted,
      letterSpacing: 0.6,
    },
    prChip: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: RADIUS.sm,
      maxWidth: 148,
    },
    prChipTitle: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.primary,
    },
    prChipDiff: {
      fontSize: 10.5,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.status.success,
      marginTop: 1,
    },
    selectorBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    pickerTriggerBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: RADIUS.md,
      borderWidth: StyleSheet.hairlineWidth,
    },
    pickerTriggerName: {
      fontSize: 13.5,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.primary,
    },
    pickerTriggerMeta: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.muted,
      marginTop: 1,
    },
    guideIconBtn: {
      width: 46,
      height: 46,
      borderRadius: RADIUS.md,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deltaBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    deltaBadgeText: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.bold,
    },
    statusFooter: {
      borderTopWidth: 0.5,
      borderTopColor: tokens.border.subtle,
      marginTop: SPACE.md,
      paddingTop: SPACE.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACE.sm,
    },
    horizonPill: {
      minHeight: 26,
      paddingHorizontal: 10,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    horizonText: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.bold,
    },
    repMatrixGrid: {
      flexDirection: 'row',
      gap: 6,
    },
    repMatrixCell: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderRadius: RADIUS.inner,
      alignItems: 'center',
      gap: 3,
    },
    repMatrixTag: {
      fontSize: 9.5,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.muted,
      letterSpacing: 0.4,
    },
    repMatrixVal: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.primary,
    },
  });

export default ExercisesSubTab;
