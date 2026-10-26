/**
 * GymHistoryScreen.tsx — ZenFit
 *
 * Tab 3: 📊 Performance & Analytics Hub
 * 3-Pill Unified Architecture with Generous Spacing & Zero Overflow:
 * - Sub-Tab 1: [ 📈 Trends ] (Overload Scorecard, Pinned Core Lifts, Effective Volume Zone Bars, Effort Quality)
 * - Sub-Tab 2: [ 📜 Logs ] (18w Consistency Heatmap, Split Filters, Upgraded Session Cards with Top Sets & PR Badges)
 * - Sub-Tab 3: [ 🏆 Trophy ] (Auto-Personalized Top 3 Anchor Lifts, Recent PR Feed, 4-Bracket Rep-Max Matrix)
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop, Path, Line } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import { hapticSelection, hapticLight, hapticMedium } from '../../utils/haptics';

import { FONT_FAMILY } from '../../theme/tokens';
import { useGymLogs, useGymPlan } from '../../contexts/domains/WellnessContext';
import { useTheme } from '../../contexts/ThemeContext';
import { GymNavigationParamList } from '../../types/gym.types';
import { todayStr, dateStrOffset } from '../../hooks/useGymLog';
import {
  calculateGymStreak,
  formatIndianDatePretty,
} from '../../utils/gymUtils';
import {
  computeUnifiedAnalytics,
  UnifiedAnalyticsData,
  ExercisePRSummary,
  PinnedLiftSummary,
} from '../../services/gymAnalyticsEngine';

// Existing Charts & Sheets
import ConsistencyHeatmap from '../../components/Gym/Charts/ConsistencyHeatmap';
import WeeklyGymReport from '../../components/Gym/WeeklyGymReport';

type AnalyticsSubTab = 'trends' | 'logs' | 'trophy';
type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';
type ExCurveMode = '1rm' | 'top' | 'effort';
type SplitFilter = 'All' | 'Push' | 'Pull' | 'Legs' | 'PRs';

const CHART_HEIGHT = 130;
const PAD = 14;
const INITIAL_LOGS_PAGE_SIZE = 20;

function generateSmoothSvgPath(coords: Array<{ x: number; y: number }>): string {
  const valid = (coords || []).filter(
    c => c && typeof c.x === 'number' && typeof c.y === 'number' && Number.isFinite(c.x) && Number.isFinite(c.y)
  );
  if (valid.length === 0) return '';
  if (valid.length === 1) return `M ${valid[0].x.toFixed(1)},${valid[0].y.toFixed(1)}`;
  let path = `M ${valid[0].x.toFixed(1)},${valid[0].y.toFixed(1)}`;
  for (let i = 0; i < valid.length - 1; i++) {
    const xMid = ((valid[i].x + valid[i + 1].x) / 2).toFixed(1);
    path += ` C ${xMid},${valid[i].y.toFixed(1)} ${xMid},${valid[i + 1].y.toFixed(1)} ${valid[i + 1].x.toFixed(1)},${valid[i + 1].y.toFixed(1)}`;
  }
  return path;
}

export default function GymHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<GymNavigationParamList>>();
  const { width } = useWindowDimensions();
  const safeChartWidth = Math.max(260, (width || 360) - 52);

  const { gymLogs } = useGymLogs();
  const { userGymPlan } = useGymPlan();

  const route = useRoute<any>();

  // Navigation State (defaults to trends or route.params?.tab)
  const [activeTab, setActiveTab] = useState<AnalyticsSubTab>(route?.params?.tab || 'trends');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [showWeeklyReportModal, setShowWeeklyReportModal] = useState(false);

  useEffect(() => {
    if (route?.params?.tab && ['trends', 'logs', 'trophy'].includes(route.params.tab)) {
      setActiveTab(route.params.tab);
    }
  }, [route?.params?.tab]);

  // Logs Sub-Tab State
  const [logsSearchQuery, setLogsSearchQuery] = useState('');
  const [splitFilter, setSplitFilter] = useState<SplitFilter>('All');
  const [visibleLogsCount, setVisibleLogsCount] = useState(INITIAL_LOGS_PAGE_SIZE);

  // Trophy Sub-Tab State
  const [selectedMatrixEx, setSelectedMatrixEx] = useState<string | null>(null);

  // Trends Expanded Lift Curve State (defaults to null so rows stay compact)
  const [expandedPinnedEx, setExpandedPinnedEx] = useState<string | null>(null);
  const [pinnedCurveMode, setPinnedCurveMode] = useState<ExCurveMode>('1rm');

  // Colors & Card Tokens
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const elevatedBg = isDark ? '#26262A' : '#EAEAEF';
  const separatorColor = isDark ? 'rgba(84, 84, 88, 0.3)' : 'rgba(60, 60, 67, 0.15)';

  // Master Analytics Precompute
  const analyticsData: UnifiedAnalyticsData = useMemo(() => {
    return computeUnifiedAnalytics(gymLogs || []);
  }, [gymLogs]);

  // Streak & Heatmap data
  const streak = useMemo(() => calculateGymStreak(gymLogs, userGymPlan), [gymLogs, userGymPlan]);
  const heatmapData = useMemo(() => {
    return analyticsData.sessionCards.map(s => ({
      date: s.date.slice(0, 10),
      volume: Math.max(s.volumeKg, 100),
    }));
  }, [analyticsData.sessionCards]);

  const totalLifetimeVolumeKg = useMemo(() => {
    return analyticsData.sessionCards.reduce((acc, s) => acc + s.volumeKg, 0);
  }, [analyticsData.sessionCards]);

  // Filtered Session Cards for Logs Sub-Tab
  const filteredSessions = useMemo(() => {
    let list = analyticsData.sessionCards;

    if (splitFilter === 'PRs') {
      list = list.filter(s => s.prCount > 0);
    } else if (splitFilter !== 'All') {
      list = list.filter(s => s.splitTag.toLowerCase() === splitFilter.toLowerCase());
    }

    if (logsSearchQuery.trim()) {
      const q = logsSearchQuery.toLowerCase().trim();
      list = list.filter(s =>
        s.date.includes(q) ||
        s.splitTag.toLowerCase().includes(q) ||
        s.topAnchorSets.some(t => t.exerciseName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [analyticsData.sessionCards, splitFilter, logsSearchQuery]);

  const displayedSessions = useMemo(() => {
    return filteredSessions.slice(0, visibleLogsCount);
  }, [filteredSessions, visibleLogsCount]);

  // Active matrix exercise in Trophy Room
  const activeMatrixSummary: ExercisePRSummary | null = useMemo(() => {
    if (selectedMatrixEx) {
      const found = analyticsData.allExercisePRs.find(p => p.exerciseName === selectedMatrixEx);
      if (found) return found;
    }
    return analyticsData.allExercisePRs[0] || null;
  }, [analyticsData.allExercisePRs, selectedMatrixEx]);

  // Active expanded pinned lift in Trends
  const activeExpandedLift: PinnedLiftSummary | null = useMemo(() => {
    if (expandedPinnedEx) {
      const found = analyticsData.pinnedLifts.find(l => l.exerciseName === expandedPinnedEx);
      if (found) return found;
    }
    return null;
  }, [analyticsData.pinnedLifts, expandedPinnedEx]);

  // Pinned Lift Curve SVG Coordinates
  const { expCoords, expLinePath, expAreaPath } = useMemo(() => {
    if (!activeExpandedLift || activeExpandedLift.history.length === 0) {
      return { expCoords: [], expLinePath: '', expAreaPath: '' };
    }
    const pts = activeExpandedLift.history.length > 8 ? activeExpandedLift.history.slice(-8) : activeExpandedLift.history;
    const vals = pts.map(p =>
      pinnedCurveMode === 'top' ? p.weight : pinnedCurveMode === '1rm' ? p.e1rm : p.rir
    );
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = (maxV - minV) || 1;

    const coords = pts.map((p, i) => {
      const v = pinnedCurveMode === 'top' ? p.weight : pinnedCurveMode === '1rm' ? p.e1rm : p.rir;
      const x = PAD + (i / Math.max(1, pts.length - 1)) * (safeChartWidth - PAD * 2);
      const y = CHART_HEIGHT - PAD - ((v - minV) / range) * (CHART_HEIGHT - PAD * 2);
      return {
        x: Number.isFinite(x) ? x : PAD,
        y: Number.isFinite(y) ? y : CHART_HEIGHT - PAD,
        val: v,
        date: p.shortDate,
      };
    });

    const linePath = generateSmoothSvgPath(coords);
    const areaPath = coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)},${CHART_HEIGHT - PAD} L ${coords[0].x.toFixed(1)},${CHART_HEIGHT - PAD} Z`
      : '';

    return { expCoords: coords, expLinePath: linePath, expAreaPath: areaPath };
  }, [activeExpandedLift, pinnedCurveMode, safeChartWidth]);

  // Handlers
  const handleOpenWorkoutSummary = useCallback((dateStr: string) => {
    navigation.navigate('WorkoutSummary', { date: dateStr, readOnly: true });
  }, [navigation]);

  const handleRepeatWorkout = useCallback((dateStr: string) => {
    hapticMedium();
    navigation.navigate('ActiveLogging', { date: todayStr() });
  }, [navigation]);

  return (
    <SafeAreaView
      style={[
        styles.root,
        {
          backgroundColor: isDark ? '#000000' : colors.background,
        },
      ]}
      edges={['top']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* ── Screen Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.largeTitle, { color: colors.textPrimary }]}>Analytics</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {streak}d streak · {analyticsData.sessionCards.length} workouts · {totalLifetimeVolumeKg >= 1000 ? `${(totalLifetimeVolumeKg / 1000).toFixed(1)}k` : totalLifetimeVolumeKg} kg moved
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            hapticSelection();
            setShowWeeklyReportModal(true);
          }}
          style={[styles.coachReportPill, { backgroundColor: cardBg }]}
          activeOpacity={0.75}
        >
          <Ionicons name="sparkles" size={13} color="#A599FF" />
          <Text style={[styles.coachReportPillText, { color: colors.textPrimary }]}>Coach Report</Text>
        </TouchableOpacity>
      </View>

      {/* ── 3-Pill Unified Segmented Control (Concise & Zero Wrapping) ── */}
      <View style={[styles.segmentedTrack, { backgroundColor: cardBg }]}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'trends' && { backgroundColor: elevatedBg }]}
          onPress={() => {
            hapticSelection();
            setActiveTab('trends');
          }}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              { color: activeTab === 'trends' ? colors.textPrimary : '#8E8E93' },
              activeTab === 'trends' && styles.segmentTextActive,
            ]}
          >
            📈 Trends
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'logs' && { backgroundColor: elevatedBg }]}
          onPress={() => {
            hapticSelection();
            setActiveTab('logs');
          }}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              { color: activeTab === 'logs' ? colors.textPrimary : '#8E8E93' },
              activeTab === 'logs' && styles.segmentTextActive,
            ]}
          >
            📜 Logs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'trophy' && { backgroundColor: elevatedBg }]}
          onPress={() => {
            hapticSelection();
            setActiveTab('trophy');
          }}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              { color: activeTab === 'trophy' ? colors.textPrimary : '#8E8E93' },
              activeTab === 'trophy' && styles.segmentTextActive,
            ]}
          >
            🏆 Trophy
          </Text>
        </TouchableOpacity>
      </View>

      {/* ════════════════════════════════════════════════════════════════════════
          SUB-TAB 1: 📈 OVERVIEW & TRENDS (The Brain)
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'trends' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Time Range Filter Pills */}
          <View style={[styles.timeRangeBar, { backgroundColor: cardBg }]}>
            {(['7d', '30d', '90d', '1y', 'all'] as TimeRange[]).map(r => {
              const isSelected = timeRange === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.timePill, isSelected && { backgroundColor: elevatedBg }]}
                  onPress={() => {
                    hapticSelection();
                    setTimeRange(r);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.timePillText, { color: isSelected ? colors.textPrimary : '#8E8E93' }]}>
                    {r.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Card 1: Weekly Overload Scorecard (Integrated Recap) */}
          <View style={[styles.iosCard, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.cardSectionLabel}>WEEKLY OVERLOAD SCORECARD</Text>
                <Text style={styles.cardSubLabel}>
                  {analyticsData.weeklyScorecard.progressedCount} of {analyticsData.weeklyScorecard.evaluatedCount} exercises progressed this week
                </Text>
              </View>
              <View style={styles.greenDeltaBadge}>
                <Text style={styles.greenDeltaText}>
                  +{analyticsData.weeklyScorecard.netStrengthDeltaPct}% Strength
                </Text>
              </View>
            </View>

            {/* Progression State Breakdown Pills */}
            <View style={styles.statePillsRow}>
              <View style={[styles.statePill, { backgroundColor: 'rgba(48, 209, 88, 0.12)' }]}>
                <View style={[styles.stateDot, { backgroundColor: '#30D158' }]} />
                <Text style={[styles.stateText, { color: '#30D158' }]}>
                  {analyticsData.weeklyScorecard.weightUnlocks} Weight Unlocks
                </Text>
              </View>

              <View style={[styles.statePill, { backgroundColor: 'rgba(10, 132, 255, 0.12)' }]}>
                <View style={[styles.stateDot, { backgroundColor: '#0A84FF' }]} />
                <Text style={[styles.stateText, { color: '#0A84FF' }]}>
                  {analyticsData.weeklyScorecard.repBuilds} Rep Builds
                </Text>
              </View>

              <View style={[styles.statePill, { backgroundColor: 'rgba(255, 159, 10, 0.12)' }]}>
                <View style={[styles.stateDot, { backgroundColor: '#FF9F0A' }]} />
                <Text style={[styles.stateText, { color: '#FF9F0A' }]}>
                  {analyticsData.weeklyScorecard.plateaus} Plateau
                </Text>
              </View>

              {analyticsData.weeklyScorecard.deloads > 0 && (
                <View style={[styles.statePill, { backgroundColor: 'rgba(191, 90, 242, 0.12)' }]}>
                  <View style={[styles.stateDot, { backgroundColor: '#BF5AF2' }]} />
                  <Text style={[styles.stateText, { color: '#BF5AF2' }]}>
                    {analyticsData.weeklyScorecard.deloads} Deload
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setShowWeeklyReportModal(true)}
              style={styles.coachReportInlineBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.coachReportInlineBtnText}>View Full Coach Report & Volume Landmarks →</Text>
            </TouchableOpacity>
          </View>

          {/* Card 2: Pinned Core Lifts Matrix */}
          <View style={[styles.iosCard, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardSectionLabel}>CORE LIFTS PROGRESSION</Text>
                <Text style={styles.cardSubLabel}>Top tracked compound lifts & 30-day delta</Text>
              </View>
            </View>

            <View style={styles.pinnedLiftsContainer}>
              {analyticsData.pinnedLifts.map(lift => {
                const isExpanded = expandedPinnedEx === lift.exerciseName;
                return (
                  <View key={lift.exerciseName} style={styles.pinnedLiftItem}>
                    <TouchableOpacity
                      onPress={() => {
                        hapticLight();
                        setExpandedPinnedEx(prev => prev === lift.exerciseName ? null : lift.exerciseName);
                      }}
                      style={[styles.pinnedLiftHeaderRow, isExpanded && { backgroundColor: elevatedBg }]}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.pinnedLiftName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {lift.exerciseName}
                          </Text>
                          <Text style={styles.pinnedLiftCategoryBadge}>{lift.category}</Text>
                        </View>
                        <Text style={styles.pinnedLiftBestSet}>
                          Best: {lift.currentBestWeight > 0 ? `${lift.currentBestWeight} kg` : 'BW'} × {lift.currentBestReps} · {lift.currentBestE1RM} kg e1RM
                        </Text>
                      </View>

                      {/* Sparkline & Delta Badge */}
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={[styles.deltaBadgeSmall, lift.delta30dPct >= 0 ? styles.deltaGreen : styles.deltaGray]}>
                          <Text style={lift.delta30dPct >= 0 ? styles.deltaGreenText : styles.deltaGrayText}>
                            {lift.delta30dPct >= 0 ? `+${lift.delta30dPct}%` : `${lift.delta30dPct}%`}
                          </Text>
                        </View>

                        {lift.sparklinePoints.length >= 2 && (
                          <Svg width={64} height={22}>
                            <Path
                              d={generateSmoothSvgPath(lift.sparklinePoints)}
                              fill="none"
                              stroke="#30D158"
                              strokeWidth={2}
                            />
                          </Svg>
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Interactive 3-Curve Expansion */}
                    {isExpanded && (
                      <View style={styles.expandedCurveBox}>
                        <View style={[styles.miniSegRow, { backgroundColor: isDark ? '#141418' : '#E5E5EA' }]}>
                          {(['1rm', 'top', 'effort'] as ExCurveMode[]).map(m => (
                            <TouchableOpacity
                              key={m}
                              onPress={() => {
                                hapticLight();
                                setPinnedCurveMode(m);
                              }}
                              style={[styles.miniSegBtn, pinnedCurveMode === m && { backgroundColor: elevatedBg }]}
                            >
                              <Text style={[styles.miniSegText, { color: pinnedCurveMode === m ? colors.textPrimary : '#8E8E93' }]}>
                                {m === '1rm' ? 'Est. 1RM' : m === 'top' ? 'Top Weight' : 'Effort (RIR)'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {expCoords.length >= 2 ? (
                          <View style={{ alignItems: 'center', marginTop: 10 }}>
                            <Svg width={safeChartWidth} height={CHART_HEIGHT}>
                              <Defs>
                                <LinearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                                  <Stop offset="0" stopColor="#30D158" stopOpacity={0.25} />
                                  <Stop offset="1" stopColor="#30D158" stopOpacity={0.0} />
                                </LinearGradient>
                              </Defs>
                              <Line
                                x1={PAD}
                                y1={CHART_HEIGHT / 2}
                                x2={safeChartWidth - PAD}
                                y2={CHART_HEIGHT / 2}
                                stroke={separatorColor}
                                strokeDasharray="3 3"
                              />
                              <Path d={expAreaPath} fill="url(#expGrad)" />
                              <Path d={expLinePath} fill="none" stroke="#30D158" strokeWidth={2.5} />
                              {expCoords.map((pt, i) => (
                                <Circle key={i} cx={pt.x} cy={pt.y} r={3.5} fill="#30D158" />
                              ))}
                            </Svg>
                          </View>
                        ) : (
                          <Text style={styles.emptyHintText}>Log more sessions to generate telemetry curve.</Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Card 3: Effective Weekly Muscle Volume Zone Bars */}
          <View style={[styles.iosCard, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.cardSectionLabel}>EFFECTIVE HYPERTROPHY VOLUME</Text>
                <Text style={styles.cardSubLabel}>Direct (1.0) + Synergist (0.5) sets per week</Text>
              </View>
              <Text style={styles.volumeLandmarkGuide}>Target: 6–16 sets</Text>
            </View>

            <View style={{ gap: 11, marginTop: 6 }}>
              {analyticsData.effectiveMuscleVolumes.map(mv => {
                const percent = Math.min(100, Math.round((mv.effectiveSets / 18) * 100));
                const isOptimal = mv.status === 'optimal';
                const isLow = mv.status === 'low';
                return (
                  <View key={mv.muscleGroup}>
                    <View style={styles.muscleBarHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.muscleDot, { backgroundColor: mv.color }]} />
                        <Text style={[styles.muscleNameText, { color: colors.textPrimary }]}>
                          {mv.muscleGroup}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.muscleDetailSub}>
                          {mv.directSets}d + {mv.synergistSets}s
                        </Text>
                        <Text style={[styles.muscleSetCount, isOptimal && { color: '#30D158' }]}>
                          {mv.effectiveSets} sets
                        </Text>
                        <View style={[styles.statusTag, isOptimal ? styles.statusOptimal : isLow ? styles.statusLow : styles.statusHigh]}>
                          <Text style={[styles.statusTagText, isOptimal ? { color: '#30D158' } : isLow ? { color: '#FF9F0A' } : { color: '#FF453A' }]}>
                            {isOptimal ? 'Optimal' : isLow ? 'Low' : 'Fatigue'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Zone Progress Bar */}
                    <View style={styles.zoneTrack}>
                      <View
                        style={[
                          styles.zoneFill,
                          {
                            width: `${Math.max(6, percent)}%`,
                            backgroundColor: isOptimal ? '#30D158' : isLow ? '#FF9F0A' : '#FF453A',
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Card 4: Effort Quality (Hypertrophy Tension vs Submaximal) */}
          <View style={[styles.iosCard, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.cardSectionLabel}>EFFORT QUALITY & INTENSITY</Text>
                <Text style={styles.cardSubLabel}>Hypertrophy tension sets vs feeler sets</Text>
              </View>
              <Text style={[styles.cardHighlightValue, { color: '#30D158' }]}>
                {analyticsData.effortQuality.hypertrophySweetSpotPct}% Stimulus
              </Text>
            </View>

            {/* Split Progress Track */}
            <View style={styles.effortBarTrack}>
              <View
                style={[
                  styles.effortBarFillSweet,
                  { width: `${analyticsData.effortQuality.hypertrophySweetSpotPct}%` },
                ]}
              />
              <View
                style={[
                  styles.effortBarFillSub,
                  { width: `${100 - analyticsData.effortQuality.hypertrophySweetSpotPct}%` },
                ]}
              />
            </View>

            <View style={styles.effortLegendRow}>
              <View style={styles.effortLegendItem}>
                <View style={[styles.stateDot, { backgroundColor: '#30D158' }]} />
                <Text style={styles.effortLegendText}>0–2 RIR (Hypertrophy Tension)</Text>
              </View>
              <View style={styles.effortLegendItem}>
                <View style={[styles.stateDot, { backgroundColor: '#8E8E93' }]} />
                <Text style={styles.effortLegendText}>3+ RIR (Feeler / Warmup)</Text>
              </View>
            </View>
          </View>

        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          SUB-TAB 2: 📜 WORKOUT LOGS (The Audit Trail)
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'logs' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* 18-Week Consistency Heatmap */}
          <ConsistencyHeatmap data={heatmapData} />

          {/* Search Input Bar */}
          <View style={[styles.searchBarWrap, { backgroundColor: cardBg }]}>
            <Ionicons name="search" size={16} color="#8E8E93" style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search by split or exercise name..."
              placeholderTextColor="#8E8E93"
              value={logsSearchQuery}
              onChangeText={setLogsSearchQuery}
            />
            {logsSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setLogsSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

          {/* Split Filter Pills */}
          <View style={[styles.splitFilterBar, { backgroundColor: cardBg }]}>
            {(['All', 'Push', 'Pull', 'Legs', 'PRs'] as SplitFilter[]).map(f => {
              const isSelected = splitFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.splitPill, isSelected && { backgroundColor: elevatedBg }]}
                  onPress={() => {
                    hapticSelection();
                    setSplitFilter(f);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.splitPillText, { color: isSelected ? colors.textPrimary : '#8E8E93' }]}>
                    {f === 'PRs' ? '⭐ PRs' : f}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Session Cards List */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderLabel}>
              PAST SESSIONS ({filteredSessions.length})
            </Text>
          </View>

          {displayedSessions.length === 0 ? (
            <View style={[styles.iosCard, { backgroundColor: cardBg, alignItems: 'center', paddingVertical: 32 }]}>
              <Ionicons name="barbell-outline" size={32} color="#8E8E93" />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Sessions Match Filter</Text>
              <Text style={styles.emptySub}>Try adjusting search query or split filters.</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {displayedSessions.map(session => (
                <View key={session.id} style={[styles.sessionCard, { backgroundColor: cardBg }]}>
                  {/* Card Header */}
                  <View style={styles.sessionCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.sessionSplitTag, { color: '#0A84FF' }]}>
                        {session.splitTag.toUpperCase()}
                      </Text>
                      <Text style={[styles.sessionDateText, { color: colors.textPrimary }]}>
                        {formatIndianDatePretty(session.date)}
                      </Text>
                    </View>

                    {session.prCount > 0 && (
                      <View style={styles.prGoldBadge}>
                        <Ionicons name="trophy" size={11} color="#FFD700" />
                        <Text style={styles.prGoldBadgeText}>{session.prCount} PR{session.prCount > 1 ? 's' : ''}</Text>
                      </View>
                    )}
                  </View>

                  {/* Session Metrics Bar */}
                  <Text style={styles.sessionMetricsSummary}>
                    {session.totalSets} working sets · {session.exerciseCount} exercises
                    {session.duration ? ` · ${session.duration}m` : ''}
                    {session.volumeKg > 0 ? ` · ${session.volumeKg.toLocaleString()} kg` : ''}
                  </Text>

                  {/* Top 3 Anchor Working Sets Preview */}
                  {session.topAnchorSets.length > 0 && (
                    <View style={styles.topSetsContainer}>
                      {session.topAnchorSets.map((ts, i) => (
                        <View key={`${ts.exerciseName}-${i}`} style={styles.topSetRow}>
                          <View style={styles.topSetDot} />
                          <Text style={[styles.topSetExerciseName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {ts.exerciseName}:
                          </Text>
                          <Text style={styles.topSetLabel}>{ts.label}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={[styles.cardDivider, { backgroundColor: separatorColor }]} />

                  {/* Card Footer Actions */}
                  <View style={styles.sessionCardFooter}>
                    <TouchableOpacity
                      onPress={() => handleRepeatWorkout(session.date)}
                      style={styles.repeatBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="repeat" size={14} color="#A599FF" />
                      <Text style={styles.repeatBtnText}>Repeat Workout</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleOpenWorkoutSummary(session.date)}
                      style={styles.detailsBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.detailsBtnText, { color: colors.textPrimary }]}>Details</Text>
                      <Ionicons name="chevron-forward" size={14} color="#8E8E93" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {filteredSessions.length > visibleLogsCount && (
                <TouchableOpacity
                  onPress={() => {
                    hapticSelection();
                    setVisibleLogsCount(prev => prev + 25);
                  }}
                  style={[styles.loadMoreBtn, { backgroundColor: cardBg }]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.loadMoreBtnText}>
                    Show More ({filteredSessions.length - visibleLogsCount} remaining)
                  </Text>
                  <Ionicons name="chevron-down" size={15} color="#A599FF" />
                </TouchableOpacity>
              )}
            </View>
          )}

        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          SUB-TAB 3: 🏆 TROPHY ROOM (PRs & Milestones)
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'trophy' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Hero Card: Auto-Personalized "Top 3 Anchor Lifts" (Spacious Row List) */}
          <View style={[styles.iosCard, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.cardSectionLabel}>TOP 3 ANCHOR LIFTS SHOWCASE</Text>
                <Text style={styles.cardSubLabel}>Auto-detected #1 Push, Pull, and Leg anchors</Text>
              </View>
              <View style={styles.anchorTotalBadge}>
                <Ionicons name="trophy" size={13} color="#FFD700" />
                <Text style={styles.anchorTotalText}>
                  {analyticsData.anchorLifts.totalAnchorE1RM} kg Score
                </Text>
              </View>
            </View>

            {/* 3 Spacious Full-Width Rows (No More Cramped Columns!) */}
            <View style={styles.anchorListContainer}>
              {/* Push Anchor */}
              <View style={[styles.anchorRowItem, { backgroundColor: elevatedBg }]}>
                <View style={[styles.anchorCategoryPill, { backgroundColor: 'rgba(10, 132, 255, 0.15)' }]}>
                  <Text style={[styles.anchorCategoryPillText, { color: '#0A84FF' }]}>PUSH</Text>
                </View>
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={[styles.anchorRowExName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {analyticsData.anchorLifts.push?.exerciseName || 'Bench / Push Press'}
                  </Text>
                  <Text style={styles.anchorRowSubText}>
                    {analyticsData.anchorLifts.push?.bestE1RM ? `Best e1RM: ${analyticsData.anchorLifts.push.bestE1RM} kg` : 'Log a push exercise'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.anchorRowSetText}>
                    {analyticsData.anchorLifts.push?.formattedSet || '—'}
                  </Text>
                </View>
              </View>

              {/* Pull Anchor */}
              <View style={[styles.anchorRowItem, { backgroundColor: elevatedBg }]}>
                <View style={[styles.anchorCategoryPill, { backgroundColor: 'rgba(165, 153, 255, 0.15)' }]}>
                  <Text style={[styles.anchorCategoryPillText, { color: '#A599FF' }]}>PULL</Text>
                </View>
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={[styles.anchorRowExName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {analyticsData.anchorLifts.pull?.exerciseName || 'Row / Pulldown'}
                  </Text>
                  <Text style={styles.anchorRowSubText}>
                    {analyticsData.anchorLifts.pull?.bestE1RM ? `Best e1RM: ${analyticsData.anchorLifts.pull.bestE1RM} kg` : 'Log a pull exercise'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.anchorRowSetText}>
                    {analyticsData.anchorLifts.pull?.formattedSet || '—'}
                  </Text>
                </View>
              </View>

              {/* Legs Anchor */}
              <View style={[styles.anchorRowItem, { backgroundColor: elevatedBg }]}>
                <View style={[styles.anchorCategoryPill, { backgroundColor: 'rgba(255, 159, 10, 0.15)' }]}>
                  <Text style={[styles.anchorCategoryPillText, { color: '#FF9F0A' }]}>LEGS</Text>
                </View>
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={[styles.anchorRowExName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {analyticsData.anchorLifts.legs?.exerciseName || 'Squat / Leg Press'}
                  </Text>
                  <Text style={styles.anchorRowSubText}>
                    {analyticsData.anchorLifts.legs?.bestE1RM ? `Best e1RM: ${analyticsData.anchorLifts.legs.bestE1RM} kg` : 'Log a leg exercise'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.anchorRowSetText}>
                    {analyticsData.anchorLifts.legs?.formattedSet || '—'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Recent PR Feed (Last 30 Days) */}
          <View style={[styles.iosCard, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.cardSectionLabel}>RECENT PR FEED (LAST 30 DAYS)</Text>
                <Text style={styles.cardSubLabel}>Heaviest loads, rep records, and e1RM milestones</Text>
              </View>
              <Text style={styles.prCountHeaderBadge}>{analyticsData.recentPRs.length} Records</Text>
            </View>

            {analyticsData.recentPRs.length === 0 ? (
              <Text style={styles.emptyHintText}>Log sets in your workouts to trigger personal record unlocks!</Text>
            ) : (
              <View style={{ gap: 8, marginTop: 4 }}>
                {analyticsData.recentPRs.slice(0, 8).map(pr => (
                  <View key={pr.id} style={[styles.prFeedRow, { backgroundColor: elevatedBg }]}>
                    <View style={styles.prFeedIconBox}>
                      <Ionicons
                        name={pr.type === 'weight' ? 'flame' : pr.type === 'rep' ? 'repeat' : 'flash'}
                        size={16}
                        color={pr.type === 'weight' ? '#FF9F0A' : pr.type === 'rep' ? '#30D158' : '#A599FF'}
                      />
                    </View>

                    <View style={{ flex: 1, marginHorizontal: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={[styles.prFeedExercise, { color: colors.textPrimary }]} numberOfLines={1}>
                          {pr.exerciseName}
                        </Text>
                        <Text style={styles.prFeedDate}>{formatIndianDatePretty(pr.date)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Text style={styles.prFeedValText}>{pr.currentValueText}</Text>
                        <View style={styles.prDiffPill}>
                          <Text style={styles.prDiffPillText}>{pr.diffText}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Exercise 4-Bracket Rep-Max Matrix */}
          <View style={[styles.iosCard, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.cardSectionLabel}>REP-MAX MATRIX (1RM / 5RM / 8RM / 12RM)</Text>
                <Text style={styles.cardSubLabel}>Honoring hypertrophy lifters across all rep brackets</Text>
              </View>
            </View>

            {/* Exercise Selector Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
              {analyticsData.allExercisePRs.slice(0, 15).map(ex => {
                const isSel = ex.exerciseName === activeMatrixSummary?.exerciseName;
                return (
                  <TouchableOpacity
                    key={ex.exerciseName}
                    onPress={() => {
                      hapticLight();
                      setSelectedMatrixEx(ex.exerciseName);
                    }}
                    style={[styles.exPillChip, isSel ? { backgroundColor: '#A599FF' } : { backgroundColor: elevatedBg }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.exPillChipText, { color: isSel ? '#000000' : colors.textPrimary }]}>
                      {ex.exerciseName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 4 Brackets Grid (Generous 2-Column with 48% Width) */}
            {activeMatrixSummary && (
              <View style={styles.bracketGrid}>
                {/* 1-3RM Max Power */}
                <View style={[styles.bracketCard, { backgroundColor: elevatedBg }]}>
                  <Text style={styles.bracketTitle}>1–3 RM (POWER)</Text>
                  <Text style={[styles.bracketWeightText, { color: colors.textPrimary }]}>
                    {activeMatrixSummary.repBrackets['1-3RM'] ? `${activeMatrixSummary.repBrackets['1-3RM'].weight} kg` : '—'}
                  </Text>
                  <Text style={styles.bracketSubText}>
                    {activeMatrixSummary.repBrackets['1-3RM'] ? `× ${activeMatrixSummary.repBrackets['1-3RM'].reps} reps` : 'No lift yet'}
                  </Text>
                </View>

                {/* 4-6RM Strength */}
                <View style={[styles.bracketCard, { backgroundColor: elevatedBg }]}>
                  <Text style={styles.bracketTitle}>4–6 RM (STRENGTH)</Text>
                  <Text style={[styles.bracketWeightText, { color: colors.textPrimary }]}>
                    {activeMatrixSummary.repBrackets['4-6RM'] ? `${activeMatrixSummary.repBrackets['4-6RM'].weight} kg` : '—'}
                  </Text>
                  <Text style={styles.bracketSubText}>
                    {activeMatrixSummary.repBrackets['4-6RM'] ? `× ${activeMatrixSummary.repBrackets['4-6RM'].reps} reps` : 'No lift yet'}
                  </Text>
                </View>

                {/* 7-10RM Hypertrophy */}
                <View style={[styles.bracketCard, { backgroundColor: elevatedBg }]}>
                  <Text style={styles.bracketTitle}>7–10 RM (GROWTH)</Text>
                  <Text style={[styles.bracketWeightText, { color: '#30D158' }]}>
                    {activeMatrixSummary.repBrackets['7-10RM'] ? `${activeMatrixSummary.repBrackets['7-10RM'].weight} kg` : '—'}
                  </Text>
                  <Text style={styles.bracketSubText}>
                    {activeMatrixSummary.repBrackets['7-10RM'] ? `× ${activeMatrixSummary.repBrackets['7-10RM'].reps} reps` : 'No lift yet'}
                  </Text>
                </View>

                {/* 11-15RM Endurance / Pump */}
                <View style={[styles.bracketCard, { backgroundColor: elevatedBg }]}>
                  <Text style={styles.bracketTitle}>11–15 RM (PUMP)</Text>
                  <Text style={[styles.bracketWeightText, { color: colors.textPrimary }]}>
                    {activeMatrixSummary.repBrackets['11-15RM'] ? `${activeMatrixSummary.repBrackets['11-15RM'].weight} kg` : '—'}
                  </Text>
                  <Text style={styles.bracketSubText}>
                    {activeMatrixSummary.repBrackets['11-15RM'] ? `× ${activeMatrixSummary.repBrackets['11-15RM'].reps} reps` : 'No lift yet'}
                  </Text>
                </View>
              </View>
            )}
          </View>

        </ScrollView>
      )}

      {/* ── Weekly Training Report Modal ── */}
      {showWeeklyReportModal && (
        <Modal
          visible={showWeeklyReportModal}
          animationType="slide"
          onRequestClose={() => setShowWeeklyReportModal(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#000000' : colors.background }}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Weekly Training Report</Text>
              <TouchableOpacity
                onPress={() => setShowWeeklyReportModal(false)}
                style={[styles.modalCloseBtn, { backgroundColor: cardBg }]}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 40 }}>
              <WeeklyGymReport
                gymLogs={gymLogs}
                weekAnchorDate={todayStr()}
                userGymPlan={userGymPlan}
              />
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  largeTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 27,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11.5,
    color: '#8E8E93',
    marginTop: 2,
  },
  coachReportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  coachReportPillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
  },
  segmentedTrack: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 3,
    borderRadius: 10,
    height: 38,
  },
  segmentBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12.5,
  },
  segmentTextActive: {
    fontFamily: FONT_FAMILY.bold,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 150,
  },
  iosCard: {
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardSectionLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  cardSubLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8E8E93',
    marginTop: 2,
  },
  cardHighlightValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13.5,
  },
  greenDeltaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(48, 209, 88, 0.14)',
  },
  greenDeltaText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11.5,
    color: '#30D158',
  },
  statePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stateText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
  },
  coachReportInlineBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 4,
  },
  coachReportInlineBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#A599FF',
  },
  timeRangeBar: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 10,
    marginBottom: 10,
  },
  timePill: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  timePillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11.5,
  },
  pinnedLiftsContainer: {
    marginTop: 4,
  },
  pinnedLiftItem: {
    marginBottom: 3,
  },
  pinnedLiftHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pinnedLiftName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13.5,
    maxWidth: 155,
  },
  pinnedLiftCategoryBadge: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10,
    color: '#8E8E93',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pinnedLiftBestSet: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8E8E93',
    marginTop: 2,
  },
  deltaBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deltaGreen: {
    backgroundColor: 'rgba(48, 209, 88, 0.14)',
  },
  deltaGray: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  deltaGreenText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    color: '#30D158',
  },
  deltaGrayText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    color: '#8E8E93',
  },
  expandedCurveBox: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  miniSegRow: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    alignSelf: 'center',
  },
  miniSegBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  miniSegText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
  },
  emptyHintText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8E8E93',
    textAlign: 'center',
    marginVertical: 12,
  },
  volumeLandmarkGuide: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#30D158',
  },
  muscleBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  muscleDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  muscleNameText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12.5,
  },
  muscleDetailSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10.5,
    color: '#8E8E93',
  },
  muscleSetCount: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#8E8E93',
  },
  statusTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statusOptimal: { backgroundColor: 'rgba(48, 209, 88, 0.12)' },
  statusLow: { backgroundColor: 'rgba(255, 159, 10, 0.12)' },
  statusHigh: { backgroundColor: 'rgba(255, 69, 58, 0.12)' },
  statusTagText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
  },
  zoneTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  zoneFill: {
    height: '100%',
    borderRadius: 3,
  },
  effortBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 6,
    marginBottom: 8,
  },
  effortBarFillSweet: {
    backgroundColor: '#30D158',
    height: '100%',
  },
  effortBarFillSub: {
    backgroundColor: '#8E8E93',
    height: '100%',
  },
  effortLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 4,
  },
  effortLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  effortLegendText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#8E8E93',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    padding: 0,
  },
  splitFilterBar: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 10,
    marginBottom: 10,
  },
  splitPill: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  splitPillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11.5,
  },
  sectionHeaderRow: {
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  sectionHeaderLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11.5,
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  sessionCard: {
    borderRadius: 14,
    padding: 13,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionSplitTag: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  sessionDateText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13.5,
  },
  prGoldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  prGoldBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#FFD700',
  },
  sessionMetricsSummary: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8E8E93',
    marginTop: 2,
    marginBottom: 6,
  },
  topSetsContainer: {
    gap: 3,
    paddingVertical: 4,
  },
  topSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topSetDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0A84FF',
  },
  topSetExerciseName: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    maxWidth: 160,
  },
  topSetLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#8E8E93',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  sessionCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  repeatBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#A599FF',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  detailsBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  loadMoreBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12.5,
    color: '#A599FF',
  },
  emptyTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    marginTop: 8,
  },
  emptySub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 3,
  },
  anchorTotalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  anchorTotalText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#FFD700',
  },
  anchorListContainer: {
    gap: 7,
    marginTop: 6,
  },
  anchorRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  anchorCategoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  anchorCategoryPillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  anchorRowExName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
  },
  anchorRowSubText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
  anchorRowSetText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#FFD700',
  },
  prCountHeaderBadge: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#FF9F0A',
  },
  prFeedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 11,
  },
  prFeedIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prFeedExercise: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    maxWidth: 160,
  },
  prFeedDate: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
  },
  prFeedValText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#30D158',
  },
  prDiffPill: {
    backgroundColor: 'rgba(48, 209, 88, 0.14)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  prDiffPillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#30D158',
  },
  exPillChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exPillChipText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
  },
  bracketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  bracketCard: {
    width: '48.5%',
    padding: 11,
    borderRadius: 12,
  },
  bracketTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  bracketWeightText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    marginTop: 3,
  },
  bracketSubText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 17,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
