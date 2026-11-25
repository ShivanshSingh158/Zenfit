import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput } from 'react-native';
import { Dumbbell, Play, Search, X } from 'lucide-react-native';

import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';
import { hapticLight, hapticMedium } from '../../../utils/haptics';
import { formatIndianDatePretty } from '../../../utils/gymUtils';
import { formatWeight, useWeightUnit } from '../../../utils/weightUnit';
import { TactileButton } from '../../../components/ui/TactileButton';
import { NumericText } from '../../../components/ui/NumericText';
import { IOSSegmentedControl } from '../../../components/ui/IOSSegmentedControl';
import { AnimatedSvgLineChart, ChartDataPoint } from '../../../components/ui/AnimatedSvgCharts';
import { ExerciseHistoryProfile } from '../../../services/gymAnalyticsEngine';
import { makeHistoryStyles } from './gymHistoryStyles';

export type ExCategoryFilter = 'All' | 'Push' | 'Pull' | 'Legs' | 'Arms' | 'Core';
export type ExerciseChartMetric = 'weight' | '1rm' | 'volume';

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
  activeExerciseProfile: ExerciseHistoryProfile | null;
  onSelectExerciseName: (name: string) => void;
  exerciseChartMetric: ExerciseChartMetric;
  onChangeMetric: (m: ExerciseChartMetric) => void;
  selectedDataPointIdx: number | null;
  onSelectDataPointIdx: (idx: number | null) => void;
  trajectoryPoints: ChartDataPoint[];
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
    activeExerciseProfile,
    onSelectExerciseName,
    exerciseChartMetric,
    onChangeMetric,
    selectedDataPointIdx,
    onSelectDataPointIdx,
    trajectoryPoints,
    formatVol,
    onGoToToday,
  }) {
    const unitIsLbs = useWeightUnit();
    const profileKey = `${replayKey}-${activeExerciseProfile?.name ?? 'none'}`;
    const [showAllSessions, setShowAllSessions] = useState(false);

    useEffect(() => {
      setShowAllSessions(false);
    }, [activeExerciseProfile?.name]);

    const reversedSessions = useMemo(() => {
      if (!activeExerciseProfile?.sessions?.length) return [];
      return activeExerciseProfile.sessions.slice().reverse();
    }, [activeExerciseProfile?.sessions]);

    const visibleSessions = useMemo(
      () => (showAllSessions ? reversedSessions : reversedSessions.slice(0, 15)),
      [reversedSessions, showAllSessions]
    );

    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Exercise Search Input */}
        <View style={[styles.searchBar, { backgroundColor: cardBg }]}>
          <Search
            size={15}
            color={tokens.text.secondary}
            strokeWidth={ICON.strokeWidth}
            style={{ marginRight: SPACE.sm }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercise in your history..."
            placeholderTextColor={tokens.text.secondary}
            value={exerciseSearchQuery}
            onChangeText={onChangeSearch}
          />
          {exerciseSearchQuery.length > 0 && (
            <TactileButton
              variant="custom"
              haptic="light"
              onPress={() => onChangeSearch('')}
              hitSlop={TOUCH.hitSlop}
              style={{ padding: SPACE.xs }}
            >
              <X size={16} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
            </TactileButton>
          )}
        </View>

        {/* Category Filter Pills: All | Push | Pull | Legs | Arms | Core */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.horizontalChipsScroll, { marginBottom: SPACE.xs }]}
        >
          {(['All', 'Push', 'Pull', 'Legs', 'Arms', 'Core'] as const).map((cat) => {
            const isSel = exCategoryFilter === cat;
            return (
              <TactileButton
                key={cat}
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

        {/* Horizontal Exercise Selector Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalChipsScroll}
        >
          {filteredExerciseProfiles.map((p) => {
            const isSel = p.name === activeExerciseProfile?.name;
            return (
              <TactileButton
                key={p.name}
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
          })}
        </ScrollView>

        {activeExerciseProfile ? (
          <>
            {/* Selected Exercise Benchmark Hero */}
            <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1, paddingRight: SPACE.sm }}>
                  <Text style={styles.exHeroTitle} numberOfLines={1}>
                    {activeExerciseProfile.name}
                  </Text>
                  <Text style={styles.exHeroSubtitle}>
                    {activeExerciseProfile.muscle} · {activeExerciseProfile.category}
                  </Text>
                </View>
              </View>

              <View style={styles.kpiGrid}>
                <View style={styles.kpiCol}>
                  <NumericText style={[styles.kpiValue, { color: tokens.status.success }]}>
                    {activeExerciseProfile.allTimeBestWeight > 0
                      ? formatWeight(activeExerciseProfile.allTimeBestWeight, unitIsLbs, 1)
                      : 'BW'}
                  </NumericText>
                  <Text style={styles.kpiLabel}>ALL-TIME PR</Text>
                </View>

                <View style={styles.kpiCol}>
                  <NumericText style={[styles.kpiValue, { color: tokens.accent.secondary }]}>
                    {activeExerciseProfile.allTimeBestWeight > 0
                      ? formatWeight(
                          Math.round(
                            activeExerciseProfile.allTimeBestWeight *
                              (1 + Math.min(activeExerciseProfile.allTimeBestReps || 1, 15) / 30)
                          ),
                          unitIsLbs,
                          0
                        )
                      : '—'}
                  </NumericText>
                  <Text style={styles.kpiLabel}>EST. 1RM</Text>
                </View>

                <View style={styles.kpiCol}>
                  <NumericText style={styles.kpiValue}>
                    {activeExerciseProfile.sessions.length > 0 &&
                    activeExerciseProfile.sessions[activeExerciseProfile.sessions.length - 1].topWeight > 0
                      ? formatWeight(
                          activeExerciseProfile.sessions[activeExerciseProfile.sessions.length - 1].topWeight,
                          unitIsLbs,
                          1
                        )
                      : '—'}
                  </NumericText>
                  <Text style={styles.kpiLabel}>LAST LOAD</Text>
                </View>

                <View style={styles.kpiCol}>
                  <NumericText style={styles.kpiValue}>
                    {activeExerciseProfile.totalSessions}
                  </NumericText>
                  <Text style={styles.kpiLabel}>SESSIONS</Text>
                </View>
              </View>

              {/* Inline Progression Status Footer (Single-Line, Zero Nested Box) */}
              <View
                style={{
                  borderTopWidth: 0.5,
                  borderTopColor: tokens.border.subtle,
                  marginTop: SPACE.md,
                  paddingTop: SPACE.sm,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: SPACE.sm,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          activeExerciseProfile.progressionStatus.status === 'progressing'
                            ? tokens.status.success
                            : activeExerciseProfile.progressionStatus.status === 'stalled'
                            ? tokens.status.warning
                            : tokens.text.secondary,
                      },
                    ]}
                  />
                  <Text style={[styles.statusMessage, { flex: 1 }]} numberOfLines={1}>
                    {activeExerciseProfile.progressionStatus.message}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color:
                        activeExerciseProfile.progressionStatus.status === 'progressing'
                          ? tokens.status.success
                          : activeExerciseProfile.progressionStatus.status === 'stalled'
                          ? tokens.status.warning
                          : tokens.text.muted,
                    },
                  ]}
                >
                  {activeExerciseProfile.progressionStatus.status === 'progressing'
                    ? 'PROGRESSING'
                    : activeExerciseProfile.progressionStatus.status === 'stalled'
                    ? 'FLAT'
                    : activeExerciseProfile.progressionStatus.status === 'baseline'
                    ? 'FIRST LOG'
                    : 'STEADY'}
                </Text>
              </View>
            </View>

            {/* Performance Trajectory Curve */}
            <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
              <View style={[styles.cardHeaderRow, { flexWrap: 'wrap', gap: SPACE.sm }]}>
                <View style={{ flex: 1, minWidth: 140, paddingRight: SPACE.sm }}>
                  <Text style={styles.cardSectionLabel}>STRENGTH CURVE</Text>
                  <Text style={styles.cardSubLabel}>
                    {exerciseChartMetric === 'weight'
                      ? 'Top working weight per session'
                      : exerciseChartMetric === '1rm'
                      ? 'Estimated 1-rep max over time'
                      : 'Total volume lifted per session'}
                  </Text>
                </View>

                <View style={{ minWidth: 148, width: '48%', maxWidth: 196 }}>
                  <IOSSegmentedControl
                    segments={[
                      { id: 'weight', label: 'Weight' },
                      { id: '1rm', label: '1RM' },
                      { id: 'volume', label: 'Vol' },
                    ]}
                    activeId={exerciseChartMetric}
                    onSelect={(id) => {
                      onChangeMetric(id as ExerciseChartMetric);
                      onSelectDataPointIdx(null);
                    }}
                    height={34}
                    style={{ backgroundColor: elevatedBg }}
                  />
                </View>
              </View>

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
                        : `${formatWeight(trajectoryPoints[selectedDataPointIdx].meta.val, unitIsLbs, 1)} × ${trajectoryPoints[selectedDataPointIdx].meta.reps} reps`}
                    </NumericText>
                  </NumericText>
                </View>
              )}

              {/* Animated SVG Bezier Curve with Interactive Scrubbing */}
              {!isHeavyReady ? (
                <View
                  style={{
                    width: safeChartWidth,
                    height: 156,
                    backgroundColor: elevatedBg,
                    borderRadius: RADIUS.inner,
                    opacity: 0.25,
                    alignSelf: 'center',
                    marginTop: SPACE.md,
                  }}
                />
              ) : trajectoryPoints.length >= 2 ? (
                <View style={{ alignItems: 'center', marginTop: SPACE.md }}>
                  <AnimatedSvgLineChart
                    points={trajectoryPoints}
                    width={safeChartWidth}
                    height={156}
                    strokeColor={tokens.accent.primary}
                    interactiveScrub={true}
                    selectedIndex={selectedDataPointIdx}
                    onSelectIndex={onSelectDataPointIdx}
                    replayKey={`${profileKey}-${exerciseChartMetric}`}
                    gradientId="history_ex_traj_grad"
                  />
                </View>
              ) : (
                <Text style={styles.emptyNote}>
                  Log at least 2 sessions to view your progression curve.
                </Text>
              )}
            </View>

            {/* Session-by-Session Historical Set Log (Single Hairline Ledger) */}
            <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
              <NumericText style={styles.cardSectionLabel}>
                PAST WORKOUTS ({activeExerciseProfile.sessions.length})
              </NumericText>

              <View style={{ marginTop: SPACE.sm }}>
                {visibleSessions.map((sess, sIdx, arr) => (
                  <View
                    key={sess.date}
                    style={{
                      paddingVertical: SPACE.sm + 2,
                      borderBottomWidth: sIdx === arr.length - 1 ? 0 : 0.5,
                      borderBottomColor: tokens.border.subtle,
                    }}
                  >
                    <View style={styles.pastExSessHeader}>
                      <NumericText style={styles.pastExSessDate}>
                        {formatIndianDatePretty(sess.date)}
                      </NumericText>
                      <NumericText style={styles.pastExSessVol}>{formatVol(sess.sessionVolume)}</NumericText>
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
                ))}
                {!showAllSessions && reversedSessions.length > 15 && (
                  <TactileButton
                    variant="secondary"
                    size="sm"
                    onPress={() => setShowAllSessions(true)}
                    style={{ marginTop: SPACE.sm }}
                    label={`Show All ${reversedSessions.length} Sessions`}
                  />
                )}
              </View>
            </View>
          </>
        ) : (
          <View style={[styles.insetCard, { backgroundColor: cardBg, alignItems: 'center', paddingVertical: SPACE.xxl }]}>
            <Dumbbell size={36} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
            <Text style={styles.emptyTitle}>No Exercises Found</Text>
            <Text style={styles.emptyNote}>
              Log your working sets in the Today tab to automatically unlock strength curves, personal records (PRs), and estimated 1RMs.
            </Text>
            <TactileButton
              variant="custom"
              haptic="none"
              onPress={() => {
                hapticMedium();
                onGoToToday();
              }}
              style={[styles.startTodayWorkoutBtn, { marginTop: SPACE.md }]}
            >
              <Play
                size={14}
                color={tokens.accent.onPrimary}
                strokeWidth={ICON.strokeWidth}
                style={{ marginRight: SPACE.xs + 2 }}
              />
              <Text style={styles.startTodayWorkoutBtnText}>Go to Today's Workout</Text>
            </TactileButton>
          </View>
        )}
      </ScrollView>
    );
  }
);

export default ExercisesSubTab;
