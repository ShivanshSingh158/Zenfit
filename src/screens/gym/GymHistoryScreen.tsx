/**
 * GymHistoryScreen.tsx — ZenFit
 *
 * Tab 3: Analytics Hub (Subtle, Apple iOS HIG Architecture)
 * 3-Part Athlete Analytics:
 * - Part 1: 📅 Consistency & Weekly Overview (Habit Heatmap, 8-Week Workload Bar Chart, Weekly Muscle Sets, Cardio)
 * - Part 2: 📈 Exercises (Deep-Dive Trajectory Over Time, Progression & Plateau Status, Historical Set Diary)
 * - Part 3: 📜 Logs (Full Workout Diary with Working Sets, Cardio & Notes)
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
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop, Path, Line, Rect, G, Text as SvgText } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import { hapticSelection, hapticLight, hapticMedium } from '../../utils/haptics';

import { FONT_FAMILY, IOS_DARK } from '../../theme/tokens';
import { useGymLogs, useGymPlan } from '../../contexts/domains/WellnessContext';
import { useTheme } from '../../contexts/ThemeContext';
import { GymNavigationParamList } from '../../types/gym.types';
import { todayStr } from '../../hooks/useGymLog';
import {
  calculateGymStreak,
  formatIndianDatePretty,
} from '../../utils/gymUtils';
import {
  computeUnifiedAnalytics,
  UnifiedAnalyticsData,
  ExerciseHistoryProfile,
  DetailedSessionLog,
  WeeklyTrendItem,
} from '../../services/gymAnalyticsEngine';

import ConsistencyHeatmap from '../../components/Gym/Charts/ConsistencyHeatmap';
import WeeklyGymReport from '../../components/Gym/metrics/WeeklyGymReport';

type AnalyticsSubTab = 'consistency' | 'exercises' | 'logs';
type ExerciseChartMetric = 'weight' | 'volume';
type SplitFilter = 'All' | 'Push' | 'Pull' | 'Legs' | 'Upper' | 'Lower' | 'Cardio';

const CHART_H = 140;
const CHART_PAD = 14;
const INITIAL_LOGS_PAGE_SIZE = 25;

function generateSmoothCurve(coords: Array<{ x: number; y: number }>): string {
  if (!coords || coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  let path = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const midX = ((p0.x + p1.x) / 2).toFixed(1);
    path += ` C ${midX},${p0.y.toFixed(1)} ${midX},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  }
  return path;
}

export default function GymHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<GymNavigationParamList>>();
  const { width } = useWindowDimensions();
  const safeChartWidth = Math.max(260, (width || 360) - 44);

  const { gymLogs } = useGymLogs();
  const { userGymPlan } = useGymPlan();
  const route = useRoute<any>();

  // ── Navigation & Tab State ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<AnalyticsSubTab>(() => {
    const param = route?.params?.tab;
    if (param === 'trends') return 'consistency';
    if (param === 'trophy') return 'exercises';
    if (param === 'logs') return 'logs';
    if (param === 'consistency' || param === 'exercises') return param;
    return 'consistency';
  });

  useEffect(() => {
    const param = route?.params?.tab;
    if (param === 'trends' || param === 'consistency') setActiveTab('consistency');
    else if (param === 'trophy' || param === 'exercises') setActiveTab('exercises');
    else if (param === 'logs') setActiveTab('logs');
  }, [route?.params?.tab]);

  const [showWeeklyReportModal, setShowWeeklyReportModal] = useState(false);

  useEffect(() => {
    if (route?.params?.openWeeklyReport) {
      setShowWeeklyReportModal(true);
    }
  }, [route?.params?.openWeeklyReport]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('open_weekly_report', () => {
      setShowWeeklyReportModal(true);
    });
    return () => sub.remove();
  }, []);

  // ── Master Analytics Engine Data ────────────────────────────────────────────
  const analyticsData: UnifiedAnalyticsData = useMemo(() => {
    return computeUnifiedAnalytics(gymLogs || []);
  }, [gymLogs]);

  const streak = useMemo(() => calculateGymStreak(gymLogs, userGymPlan), [gymLogs, userGymPlan]);

  const totalLifetimeVolumeKg = useMemo(() => {
    return analyticsData.detailedLogs.reduce((acc, s) => acc + s.totalVolumeKg, 0);
  }, [analyticsData.detailedLogs]);

  const heatmapData = useMemo(() => {
    return analyticsData.detailedLogs.map(s => ({
      date: s.date.slice(0, 10),
      volume: Math.max(s.totalVolumeKg, 100),
    }));
  }, [analyticsData.detailedLogs]);

  // ── Sub-Tab 1: Consistency State ───────────────────────────────────────────
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);

  const selectedWeekItem: WeeklyTrendItem | null = useMemo(() => {
    if (selectedWeekIndex != null && analyticsData.weeklyTrends[selectedWeekIndex]) {
      return analyticsData.weeklyTrends[selectedWeekIndex];
    }
    return analyticsData.weeklyTrends[analyticsData.weeklyTrends.length - 1] || null;
  }, [analyticsData.weeklyTrends, selectedWeekIndex]);

  // ── Sub-Tab 2: Exercises State ─────────────────────────────────────────────
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [selectedExName, setSelectedExName] = useState<string | null>(null);
  const [exerciseChartMetric, setExerciseChartMetric] = useState<ExerciseChartMetric>('weight');
  const [selectedDataPointIdx, setSelectedDataPointIdx] = useState<number | null>(null);

  const filteredExerciseProfiles = useMemo(() => {
    let list = analyticsData.exerciseProfiles;
    if (exerciseSearchQuery.trim()) {
      const q = exerciseSearchQuery.toLowerCase().trim();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.muscle.toLowerCase().includes(q));
    }
    return list;
  }, [analyticsData.exerciseProfiles, exerciseSearchQuery]);

  const activeExerciseProfile: ExerciseHistoryProfile | null = useMemo(() => {
    if (selectedExName) {
      const found = analyticsData.exerciseProfiles.find(p => p.name === selectedExName);
      if (found) return found;
    }
    return filteredExerciseProfiles[0] || null;
  }, [analyticsData.exerciseProfiles, filteredExerciseProfiles, selectedExName]);

  // Exercise Curve Data Coordinates
  const { curveCoords, curveLinePath, curveAreaPath } = useMemo(() => {
    if (!activeExerciseProfile || activeExerciseProfile.sessions.length === 0) {
      return { curveCoords: [], curveLinePath: '', curveAreaPath: '' };
    }
    const pts = activeExerciseProfile.sessions;
    const vals = pts.map(p => (exerciseChartMetric === 'weight' ? p.topWeight : p.sessionVolume));
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = maxV - minV || 1;

    const coords = pts.map((p, i) => {
      const v = exerciseChartMetric === 'weight' ? p.topWeight : p.sessionVolume;
      const x = CHART_PAD + (i / Math.max(1, pts.length - 1)) * (safeChartWidth - CHART_PAD * 2);
      const y = CHART_H - CHART_PAD - ((v - minV) / range) * (CHART_H - CHART_PAD * 2);
      return {
        x: Number.isFinite(x) ? x : CHART_PAD,
        y: Number.isFinite(y) ? y : CHART_H - CHART_PAD,
        val: v,
        date: p.shortDate,
        fullDate: p.date,
        reps: p.topReps,
      };
    });

    const linePath = generateSmoothCurve(coords);
    const areaPath =
      coords.length > 0
        ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)},${CHART_H - CHART_PAD} L ${coords[0].x.toFixed(1)},${CHART_H - CHART_PAD} Z`
        : '';

    return { curveCoords: coords, curveLinePath: linePath, curveAreaPath: areaPath };
  }, [activeExerciseProfile, exerciseChartMetric, safeChartWidth]);

  // ── Sub-Tab 3: Logs State ──────────────────────────────────────────────────
  const [logsSearchQuery, setLogsSearchQuery] = useState('');
  const [splitFilter, setSplitFilter] = useState<SplitFilter>('All');
  const [visibleLogsCount, setVisibleLogsCount] = useState(INITIAL_LOGS_PAGE_SIZE);

  const filteredDetailedLogs = useMemo(() => {
    let list = analyticsData.detailedLogs;

    if (splitFilter === 'Cardio') {
      list = list.filter(s => s.cardio.length > 0);
    } else if (splitFilter !== 'All') {
      list = list.filter(s => s.splitTag.toLowerCase() === splitFilter.toLowerCase());
    }

    if (logsSearchQuery.trim()) {
      const q = logsSearchQuery.toLowerCase().trim();
      list = list.filter(
        s =>
          s.date.includes(q) ||
          s.splitTag.toLowerCase().includes(q) ||
          s.exercises.some(e => e.name.toLowerCase().includes(q) || (e.muscle && e.muscle.toLowerCase().includes(q))) ||
          (s.notes && s.notes.toLowerCase().includes(q))
      );
    }

    return list;
  }, [analyticsData.detailedLogs, splitFilter, logsSearchQuery]);

  const displayedDetailedLogs = useMemo(() => {
    return filteredDetailedLogs.slice(0, visibleLogsCount);
  }, [filteredDetailedLogs, visibleLogsCount]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleOpenWorkoutSummary = useCallback(
    (dateStr: string) => {
      navigation.navigate('WorkoutSummary', { date: dateStr, readOnly: true });
    },
    [navigation]
  );

  const handleRepeatWorkout = useCallback(
    (dateStr: string) => {
      hapticMedium();
      navigation.navigate('ActiveLogging', { date: todayStr() });
    },
    [navigation]
  );

  // Surface Tokens
  const cardBg = '#1C1C1E';
  const elevatedBg = '#2C2C2E';
  const hairlineColor = 'rgba(84, 84, 88, 0.36)';

  // Format Helper for Volume
  const formatVol = (kg: number) => {
    if (kg >= 1000000) return `${(kg / 1000000).toFixed(1)}M kg`;
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
    return `${kg} kg`;
  };

  const formatDuration = (mins: number) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${mins}m`;
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: '#000000' }]} edges={['top']}>
      <StatusBar style="light" />

      {/* ── Screen Header ──────────────────────────────────────────────────── */}
      <View style={styles.headerContainer}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {streak}d streak · {analyticsData.detailedLogs.length} workouts · {formatVol(totalLifetimeVolumeKg)} moved
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            hapticSelection();
            setShowWeeklyReportModal(true);
          }}
          style={styles.coachReportBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={13} color="#FFFFFF" />
          <Text style={styles.coachReportBtnText}>Coach Report</Text>
        </TouchableOpacity>
      </View>

      {/* ── Native Apple iOS Segmented Control (Minimalist, Subtle, Zero Pills) ── */}
      <View style={[styles.segmentedTrack, { backgroundColor: cardBg }]}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'consistency' && { backgroundColor: elevatedBg }]}
          onPress={() => {
            hapticSelection();
            setActiveTab('consistency');
          }}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === 'consistency' ? styles.segmentTextActive : styles.segmentTextInactive,
            ]}
          >
            Consistency
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'exercises' && { backgroundColor: elevatedBg }]}
          onPress={() => {
            hapticSelection();
            setActiveTab('exercises');
          }}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === 'exercises' ? styles.segmentTextActive : styles.segmentTextInactive,
            ]}
          >
            Exercises
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
              activeTab === 'logs' ? styles.segmentTextActive : styles.segmentTextInactive,
            ]}
          >
            Logs
          </Text>
        </TouchableOpacity>
      </View>

      {/* ════════════════════════════════════════════════════════════════════════
          PART 1: 📅 CONSISTENCY & WEEKLY OVERVIEW (The Habit & Volume Reality)
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'consistency' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* 1. Weekly Overview KPI Card */}
          <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
            <Text style={styles.cardSectionLabel}>WEEKLY OVERVIEW</Text>

            <View style={styles.kpiGrid}>
              <View style={styles.kpiCol}>
                <Text style={styles.kpiValue}>{analyticsData.weeklySummary.workoutsThisWeek}</Text>
                <Text style={styles.kpiLabel}>SESSIONS</Text>
              </View>

              <View style={styles.kpiCol}>
                <Text style={styles.kpiValue}>
                  {analyticsData.weeklySummary.volumeThisWeekKg >= 1000
                    ? `${(analyticsData.weeklySummary.volumeThisWeekKg / 1000).toFixed(1)}k`
                    : analyticsData.weeklySummary.volumeThisWeekKg}
                </Text>
                <Text style={styles.kpiLabel}>KG MOVED</Text>
              </View>

              <View style={styles.kpiCol}>
                <Text style={styles.kpiValue}>
                  {formatDuration(analyticsData.weeklySummary.trainingDurationMins)}
                </Text>
                <Text style={styles.kpiLabel}>TRAINED</Text>
              </View>

              <View style={styles.kpiCol}>
                <Text style={styles.kpiValue}>{analyticsData.weeklySummary.avgWorkoutsPerWeek}</Text>
                <Text style={styles.kpiLabel}>AVG / WK</Text>
              </View>
            </View>
          </View>

          {/* 2. 8-Week Workload Bar Chart */}
          <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.cardSectionLabel}>WORKLOAD & SESSIONS (LAST 8 WEEKS)</Text>
                <Text style={styles.cardSubLabel}>Weekly volume trend and training frequency</Text>
              </View>
            </View>

            {/* Selected Week Inspection Box */}
            {selectedWeekItem && (
              <View style={[styles.weekInspectBox, { backgroundColor: elevatedBg }]}>
                <Text style={styles.weekInspectTitle}>
                  {selectedWeekItem.isCurrentWeek ? 'Current Week' : `Week of ${selectedWeekItem.weekLabel}`}
                </Text>
                <Text style={styles.weekInspectDetails}>
                  {formatVol(selectedWeekItem.totalVolumeKg)} · {selectedWeekItem.workoutCount} workout
                  {selectedWeekItem.workoutCount === 1 ? '' : 's'}
                  {selectedWeekItem.cardioMinutes > 0 ? ` · ${selectedWeekItem.cardioMinutes}m cardio` : ''}
                </Text>
              </View>
            )}

            {/* 8-Week SVG Bar Chart */}
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              {(() => {
                const maxVol = Math.max(...analyticsData.weeklyTrends.map(w => w.totalVolumeKg), 1);
                const chartHeight = 90;
                const barWidth = 24;
                const gap = (safeChartWidth - 8 * barWidth) / 7;

                return (
                  <Svg width={safeChartWidth} height={chartHeight + 24}>
                    {analyticsData.weeklyTrends.map((w, idx) => {
                      const isSel = selectedWeekIndex === idx || (selectedWeekIndex == null && w.isCurrentWeek);
                      const barH = Math.max(8, (w.totalVolumeKg / maxVol) * chartHeight);
                      const x = idx * (barWidth + gap);
                      const y = chartHeight - barH;
                      const barColor = w.isCurrentWeek ? '#FFFFFF' : isSel ? '#FFFFFF' : '#8E8E93';
                      const opacity = isSel ? 1 : 0.6;

                      return (
                        <G
                          key={w.startMonday}
                          onPress={() => {
                            hapticLight();
                            setSelectedWeekIndex(idx);
                          }}
                        >
                          {/* Background Track */}
                          <Rect
                            x={x}
                            y={0}
                            width={barWidth}
                            height={chartHeight}
                            rx={4}
                            fill="#2C2C2E"
                            opacity={0.5}
                          />

                          {/* Value Fill Bar */}
                          <Rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barH}
                            rx={4}
                            fill={barColor}
                            opacity={opacity}
                          />

                          {/* Workout Count Label */}
                          <SvgText
                            x={x + barWidth / 2}
                            y={chartHeight + 16}
                            fill={isSel ? '#FFFFFF' : '#8E8E93'}
                            fontSize={10}
                            fontFamily={FONT_FAMILY.medium}
                            textAnchor="middle"
                          >
                            {w.workoutCount > 0 ? `${w.workoutCount}x` : '—'}
                          </SvgText>
                        </G>
                      );
                    })}
                  </Svg>
                );
              })()}
            </View>

            <View style={styles.chartFootnoteRow}>
              <Text style={styles.chartFootnote}>Tap any week column to inspect load</Text>
              <Text style={styles.chartFootnote}>8w Trend</Text>
            </View>
          </View>

          {/* 3. 18-Week Consistency Grid */}
          <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardSectionLabel}>18-WEEK CONSISTENCY GRID</Text>
                <Text style={styles.cardSubLabel}>All recorded workout sessions & rest days</Text>
              </View>
            </View>

            <ConsistencyHeatmap data={heatmapData} />
          </View>

          {/* 4. Weekly Muscle Sets (Direct Volume Reality) */}
          <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardSectionLabel}>WEEKLY MUSCLE SETS</Text>
                <Text style={styles.cardSubLabel}>Direct working sets logged this week (10–16 benchmark)</Text>
              </View>
            </View>

            <View style={{ gap: 10, marginTop: 4 }}>
              {analyticsData.muscleWeeklySets.map(m => {
                const pct = Math.min(100, Math.round((m.directSets / m.targetSets) * 100));
                const isOptimal = m.directSets >= 8 && m.directSets <= 18;

                return (
                  <View key={m.muscle} style={styles.muscleSetRow}>
                    <View style={styles.muscleSetInfo}>
                      <Text style={styles.muscleSetName}>{m.muscle}</Text>
                      <Text style={[styles.muscleSetCount, isOptimal && { color: '#FFFFFF' }]}>
                        {m.directSets} {m.directSets === 1 ? 'set' : 'sets'}
                      </Text>
                    </View>

                    {/* Progress Bar Track */}
                    <View style={styles.muscleBarTrack}>
                      <View
                        style={[
                          styles.muscleBarFill,
                          {
                            width: `${pct}%`,
                            backgroundColor: '#FFFFFF',
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* 5. Cardio & Conditioning Summary (if present) */}
          {analyticsData.weeklySummary.cardioMinutes > 0 && (
            <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
              <Text style={styles.cardSectionLabel}>CARDIO & CONDITIONING (LAST 7 DAYS)</Text>

              <View style={styles.kpiGrid}>
                <View style={styles.kpiCol}>
                  <Text style={styles.kpiValue}>{analyticsData.weeklySummary.cardioMinutes}m</Text>
                  <Text style={styles.kpiLabel}>TIME</Text>
                </View>

                <View style={styles.kpiCol}>
                  <Text style={styles.kpiValue}>{analyticsData.weeklySummary.cardioDistanceKm} km</Text>
                  <Text style={styles.kpiLabel}>DISTANCE</Text>
                </View>

                <View style={styles.kpiCol}>
                  <Text style={styles.kpiValue}>{analyticsData.weeklySummary.workoutsThisWeek}</Text>
                  <Text style={styles.kpiLabel}>SESSIONS</Text>
                </View>
              </View>
            </View>
          )}

        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          PART 2: 📈 EXERCISES (Deep-Dive Trajectory Over Time)
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'exercises' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Exercise Search Input */}
          <View style={[styles.searchBar, { backgroundColor: cardBg }]}>
            <Ionicons name="search" size={15} color="#8E8E93" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercise in your history..."
              placeholderTextColor="#8E8E93"
              value={exerciseSearchQuery}
              onChangeText={setExerciseSearchQuery}
            />
            {exerciseSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setExerciseSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

          {/* Horizontal Exercise Selector Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalChipsScroll}
          >
            {filteredExerciseProfiles.map(p => {
              const isSel = p.name === activeExerciseProfile?.name;
              return (
                <TouchableOpacity
                  key={p.name}
                  onPress={() => {
                    hapticLight();
                    setSelectedExName(p.name);
                    setSelectedDataPointIdx(null);
                  }}
                  style={[styles.exChipBtn, isSel ? styles.exChipBtnActive : styles.exChipBtnInactive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.exChipText, isSel ? styles.exChipTextActive : styles.exChipTextInactive]}>
                    {p.name}
                  </Text>
                  <Text style={[styles.exChipCount, isSel ? styles.exChipCountActive : styles.exChipCountInactive]}>
                    {p.totalSessions}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {activeExerciseProfile ? (
            <>
              {/* Selected Exercise Overview Card */}
              <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
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
                    <Text style={styles.kpiValue}>
                      {activeExerciseProfile.allTimeBestWeight > 0
                        ? `${activeExerciseProfile.allTimeBestWeight} kg`
                        : 'BW'}
                    </Text>
                    <Text style={styles.kpiLabel}>TOP LOAD</Text>
                  </View>

                  <View style={styles.kpiCol}>
                    <Text style={styles.kpiValue}>{activeExerciseProfile.totalSessions}</Text>
                    <Text style={styles.kpiLabel}>SESSIONS</Text>
                  </View>

                  <View style={styles.kpiCol}>
                    <Text style={styles.kpiValue}>
                      {activeExerciseProfile.allTimeBestVolume >= 1000
                        ? `${(activeExerciseProfile.allTimeBestVolume / 1000).toFixed(1)}k`
                        : activeExerciseProfile.allTimeBestVolume}
                    </Text>
                    <Text style={styles.kpiLabel}>MAX VOL</Text>
                  </View>
                </View>
              </View>

              {/* Progression / Plateau Status Box */}
              <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
                <Text style={styles.cardSectionLabel}>PROGRESSION AUDIT</Text>

                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          activeExerciseProfile.progressionStatus.status === 'progressing'
                            ? '#30D158'
                            : activeExerciseProfile.progressionStatus.status === 'stalled'
                            ? '#FF9F0A'
                            : '#8E8E93',
                      },
                    ]}
                  />
                  <Text style={styles.statusMessage}>
                    {activeExerciseProfile.progressionStatus.message}
                  </Text>
                </View>
              </View>

              {/* Performance Trajectory Curve */}
              <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardSectionLabel}>TRAJECTORY OVER TIME</Text>
                    <Text style={styles.cardSubLabel}>
                      {exerciseChartMetric === 'weight'
                        ? 'Top working load lifted per session'
                        : 'Total session volume (kg) per session'}
                    </Text>
                  </View>

                  {/* Toggle Metric */}
                  <View style={[styles.metricToggleTrack, { backgroundColor: elevatedBg }]}>
                    <TouchableOpacity
                      onPress={() => {
                        hapticLight();
                        setExerciseChartMetric('weight');
                      }}
                      style={[
                        styles.metricToggleBtn,
                        exerciseChartMetric === 'weight' && { backgroundColor: '#FFFFFF' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.metricToggleText,
                          { color: exerciseChartMetric === 'weight' ? '#000000' : '#8E8E93' },
                        ]}
                      >
                        Weight
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        hapticLight();
                        setExerciseChartMetric('volume');
                      }}
                      style={[
                        styles.metricToggleBtn,
                        exerciseChartMetric === 'volume' && { backgroundColor: '#FFFFFF' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.metricToggleText,
                          { color: exerciseChartMetric === 'volume' ? '#000000' : '#8E8E93' },
                        ]}
                      >
                        Volume
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Selected Data Point Tooltip */}
                {selectedDataPointIdx != null && curveCoords[selectedDataPointIdx] && (
                  <View style={[styles.dataPointTooltip, { backgroundColor: elevatedBg }]}>
                    <Text style={styles.tooltipText}>
                      {formatIndianDatePretty(curveCoords[selectedDataPointIdx].fullDate)}: {' '}
                      <Text style={{ fontFamily: FONT_FAMILY.bold, color: '#FFFFFF' }}>
                        {exerciseChartMetric === 'weight'
                          ? `${curveCoords[selectedDataPointIdx].val} kg × ${curveCoords[selectedDataPointIdx].reps} reps`
                          : formatVol(curveCoords[selectedDataPointIdx].val)}
                      </Text>
                    </Text>
                  </View>
                )}

                {/* SVG Bezier Curve */}
                {curveCoords.length >= 2 ? (
                  <View style={{ alignItems: 'center', marginTop: 10 }}>
                    <Svg width={safeChartWidth} height={CHART_H}>
                      <Defs>
                        <LinearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.16} />
                          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.0} />
                        </LinearGradient>
                      </Defs>

                      {/* Hairline Grid Guide */}
                      <Line
                        x1={CHART_PAD}
                        y1={CHART_H / 2}
                        x2={safeChartWidth - CHART_PAD}
                        y2={CHART_H / 2}
                        stroke={hairlineColor}
                        strokeDasharray="3 3"
                      />

                      <Path d={curveAreaPath} fill="url(#curveGrad)" />
                      <Path d={curveLinePath} fill="none" stroke="#FFFFFF" strokeWidth={2.2} />

                      {curveCoords.map((pt, i) => {
                        const isPtSel = selectedDataPointIdx === i;
                        return (
                          <G
                            key={i}
                            onPress={() => {
                              hapticLight();
                              setSelectedDataPointIdx(i);
                            }}
                          >
                            <Circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isPtSel ? 6 : 3.5}
                              fill="#FFFFFF"
                            />
                            {isPtSel && (
                              <Circle
                                cx={pt.x}
                                cy={pt.y}
                                r={9}
                                fill="none"
                                stroke="#FFFFFF"
                                strokeWidth={1.5}
                              />
                            )}
                          </G>
                        );
                      })}
                    </Svg>
                  </View>
                ) : (
                  <Text style={styles.emptyNote}>
                    Log at least 2 sessions to render the progress trajectory curve.
                  </Text>
                )}
              </View>

              {/* Session-by-Session Historical Set Log */}
              <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
                <Text style={styles.cardSectionLabel}>
                  PAST WORKOUTS ({activeExerciseProfile.sessions.length})
                </Text>

                <View style={{ gap: 8, marginTop: 8 }}>
                  {activeExerciseProfile.sessions
                    .slice()
                    .reverse()
                    .map(sess => (
                      <View key={sess.date} style={[styles.pastExSessRow, { backgroundColor: elevatedBg }]}>
                        <View style={styles.pastExSessHeader}>
                          <Text style={styles.pastExSessDate}>{formatIndianDatePretty(sess.date)}</Text>
                          <Text style={styles.pastExSessVol}>{formatVol(sess.sessionVolume)}</Text>
                        </View>

                        <View style={styles.pastExSetsWrap}>
                          {sess.sets.map((st, idx) => (
                            <Text key={idx} style={styles.pastExSetText}>
                              Set {st.setNumber}:{' '}
                              <Text style={{ fontFamily: FONT_FAMILY.bold, color: '#FFFFFF' }}>
                                {st.weight > 0 ? `${st.weight} kg` : 'BW'} × {st.reps}
                              </Text>
                              {idx < sess.sets.length - 1 ? '   ·   ' : ''}
                            </Text>
                          ))}
                        </View>
                      </View>
                    ))}
                </View>
              </View>
            </>
          ) : (
            <View style={[styles.insetCard, { backgroundColor: cardBg, alignItems: 'center', paddingVertical: 28 }]}>
              <Ionicons name="barbell-outline" size={32} color="#8E8E93" />
              <Text style={styles.emptyTitle}>No Exercises Found</Text>
              <Text style={styles.emptyNote}>Log workouts in the Today tab to generate exercise history.</Text>
            </View>
          )}

        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          PART 3: 📜 LOGS (Comprehensive Workout Diary)
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'logs' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Search Input Bar */}
          <View style={[styles.searchBar, { backgroundColor: cardBg }]}>
            <Ionicons name="search" size={15} color="#8E8E93" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by split, exercise, or notes..."
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

          {/* Split Filter Horizontal Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalChipsScroll}
          >
            {(['All', 'Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Cardio'] as SplitFilter[]).map(f => {
              const isSel = splitFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => {
                    hapticLight();
                    setSplitFilter(f);
                  }}
                  style={[styles.splitFilterBtn, isSel ? styles.splitFilterBtnActive : styles.splitFilterBtnInactive]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.splitFilterText,
                      isSel ? styles.splitFilterTextActive : styles.splitFilterTextInactive,
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Past Sessions List */}
          <View style={styles.logsCountHeader}>
            <Text style={styles.cardSectionLabel}>PAST WORKOUTS ({filteredDetailedLogs.length})</Text>
          </View>

          {displayedDetailedLogs.length === 0 ? (
            <View style={[styles.insetCard, { backgroundColor: cardBg, alignItems: 'center', paddingVertical: 32 }]}>
              <Ionicons name="calendar-outline" size={32} color="#8E8E93" />
              <Text style={styles.emptyTitle}>No Workouts Match Filter</Text>
              <Text style={styles.emptyNote}>Try adjusting your split filters or search keyword.</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {displayedDetailedLogs.map(session => (
                <View key={session.id} style={[styles.sessionCard, { backgroundColor: cardBg }]}>
                  {/* Session Header */}
                  <View style={styles.sessionHeaderRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.sessionSplitTag}>{session.splitTag.toUpperCase()}</Text>
                      <Text style={styles.sessionDateText}>{session.formattedDate}</Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.sessionSummaryMetrics}>
                        {session.durationMinutes > 0 ? `${session.durationMinutes}m · ` : ''}
                        {formatVol(session.totalVolumeKg)}
                      </Text>
                      <Text style={styles.sessionSubMetrics}>
                        {session.totalSets} working sets · {session.exerciseCount} exercises
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.hairline, { backgroundColor: hairlineColor }]} />

                  {/* Exercises & Working Sets Preview */}
                  <View style={{ gap: 5, paddingVertical: 4 }}>
                    {session.exercises.slice(0, 5).map((ex, i) => (
                      <View key={`${ex.name}-${i}`} style={styles.sessExRow}>
                        <Text style={styles.sessExDot}>•</Text>
                        <Text style={styles.sessExName} numberOfLines={1}>
                          {ex.name}:{' '}
                          <Text style={styles.sessExSetsText}>{ex.summaryText}</Text>
                        </Text>
                      </View>
                    ))}

                    {session.exercises.length > 5 && (
                      <Text style={styles.sessMoreExText}>
                        + {session.exercises.length - 5} more exercise
                        {session.exercises.length - 5 === 1 ? '' : 's'}
                      </Text>
                    )}
                  </View>

                  {/* Cardio Preview (if present) */}
                  {session.cardio.length > 0 && (
                    <View style={styles.sessCardioWrap}>
                      {session.cardio.map((c, i) => (
                        <Text key={i} style={styles.sessCardioText}>
                          🏃 {c.type}: {c.durationMinutes ? `${c.durationMinutes}m` : ''}
                          {c.distanceKm ? ` · ${c.distanceKm} km` : ''}
                          {c.calories ? ` · ${c.calories} kcal` : ''}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Notes Preview (if present) */}
                  {session.notes ? (
                    <Text style={styles.sessNotesText} numberOfLines={2}>
                      📝 {session.notes}
                    </Text>
                  ) : null}

                  <View style={[styles.hairline, { backgroundColor: hairlineColor }]} />

                  {/* Footer Actions */}
                  <View style={styles.sessionFooterRow}>
                    <TouchableOpacity
                      onPress={() => handleRepeatWorkout(session.date)}
                      style={styles.repeatBtn}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="repeat" size={13} color="#000000" />
                      <Text style={styles.repeatBtnText}>Repeat Workout</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleOpenWorkoutSummary(session.date)}
                      style={styles.detailsBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.detailsBtnText}>Details</Text>
                      <Ionicons name="chevron-forward" size={13} color="#8E8E93" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {filteredDetailedLogs.length > visibleLogsCount && (
                <TouchableOpacity
                  onPress={() => {
                    hapticSelection();
                    setVisibleLogsCount(prev => prev + 25);
                  }}
                  style={[styles.loadMoreBtn, { backgroundColor: cardBg }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.loadMoreBtnText}>
                    Show More ({filteredDetailedLogs.length - visibleLogsCount} remaining)
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          )}

        </ScrollView>
      )}

      {/* ── Weekly Training Report Modal ── */}
      {showWeeklyReportModal && (
        <Modal
          visible={showWeeklyReportModal}
          animationType="slide"
          onRequestClose={() => setShowWeeklyReportModal(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Weekly Training Report</Text>
              <TouchableOpacity
                onPress={() => setShowWeeklyReportModal(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <WeeklyGymReport
              gymLogs={gymLogs || []}
              weekAnchorDate={todayStr()}
              userGymPlan={userGymPlan}
            />
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ── Unified Apple iOS HIG Stylesheet ──────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingHorizontal: 6,
    paddingBottom: 110,
    gap: 10,
  },

  // Header
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    marginTop: 2,
  },
  coachReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  coachReportBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },

  // Segmented Control (Minimal, Subtle, No Pills)
  segmentedTrack: {
    flexDirection: 'row',
    marginHorizontal: 6,
    marginBottom: 8,
    padding: 3,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    gap: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  segmentText: {
    fontSize: 13,
  },
  segmentTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  segmentTextInactive: {
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },

  // Inset Cards
  insetCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 0,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardSectionLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cardSubLabel: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#636366',
    marginTop: 2,
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 6,
  },
  kpiCol: {
    alignItems: 'center',
    flex: 1,
  },
  kpiValue: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  kpiLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginTop: 3,
  },

  // 8-Week Workload Bar Chart
  weekInspectBox: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
  },
  weekInspectTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  weekInspectDetails: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    marginTop: 2,
  },
  chartFootnoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  chartFootnote: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.medium,
    color: '#636366',
  },

  // Muscle Sets Rows
  muscleSetRow: {
    gap: 4,
  },
  muscleSetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muscleSetName: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#FFFFFF',
  },
  muscleSetCount: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  muscleBarTrack: {
    height: 4,
    backgroundColor: '#2C2C2E',
    borderRadius: 2,
    overflow: 'hidden',
  },
  muscleBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Search & Chips
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: '#1C1C1E',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT_FAMILY.medium,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  horizontalChipsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  exChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  exChipBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  exChipBtnInactive: {
    backgroundColor: '#1C1C1E',
  },
  exChipText: {
    fontSize: 12,
  },
  exChipTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  exChipTextInactive: {
    fontFamily: FONT_FAMILY.medium,
    color: '#FFFFFF',
  },
  exChipCount: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
  },
  exChipCountActive: {
    color: '#000000',
    opacity: 0.6,
  },
  exChipCountInactive: {
    color: '#8E8E93',
  },

  // Exercise Hero
  exHeroTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  exHeroSubtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    marginTop: 2,
  },

  // Progression Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusMessage: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#FFFFFF',
    flex: 1,
  },

  // Trajectory Metric Toggle
  metricToggleTrack: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  metricToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metricToggleText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
  },
  dataPointTooltip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  tooltipText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  emptyNote: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    marginTop: 6,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    marginTop: 8,
  },

  // Past Exercise Sessions
  pastExSessRow: {
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  pastExSessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pastExSessDate: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  pastExSessVol: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  pastExSetsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  pastExSetText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },

  // Split Filter Chips in Logs
  splitFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  splitFilterBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  splitFilterBtnInactive: {
    backgroundColor: '#1C1C1E',
  },
  splitFilterText: {
    fontSize: 12,
  },
  splitFilterTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  splitFilterTextInactive: {
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  logsCountHeader: {
    paddingHorizontal: 4,
    marginTop: 4,
  },

  // Session Cards (Workout Diary)
  sessionCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionSplitTag: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  sessionDateText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    marginTop: 2,
  },
  sessionSummaryMetrics: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  sessionSubMetrics: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    marginTop: 2,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  sessExRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessExDot: {
    fontSize: 12,
    color: '#8E8E93',
  },
  sessExName: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    flex: 1,
  },
  sessExSetsText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
  },
  sessMoreExText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    marginTop: 2,
    paddingLeft: 12,
  },
  sessCardioWrap: {
    paddingVertical: 2,
  },
  sessCardioText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  sessNotesText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  sessionFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  repeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 999,
  },
  repeatBtnText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  detailsBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  loadMoreBtnText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },

  // Modal
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(84, 84, 88, 0.36)',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    padding: 4,
  },
});
