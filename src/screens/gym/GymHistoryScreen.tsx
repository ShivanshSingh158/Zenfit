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
  Alert,
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
import { GymNavigationParamList, GymPlanDay } from '../../types/gym.types';
import { GYM_PLAN } from '../../data/gymPlan';
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

type AnalyticsSubTab = 'weekly' | 'consistency' | 'exercises';
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

  // Defer heavy SVG charts and heatmap mounts by 1 frame so shell/header paint in Frame 0 (<16ms)
  const [isHeavyReady, setIsHeavyReady] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setIsHeavyReady(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  // ── Navigation & Tab State ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<AnalyticsSubTab>(() => {
    const param = route?.params?.tab;
    if (param === 'consistency' || param === 'trends') return 'consistency';
    if (param === 'exercises' || param === 'trophy') return 'exercises';
    return 'weekly';
  });

  useEffect(() => {
    const param = route?.params?.tab;
    if (param === 'consistency' || param === 'trends') setActiveTab('consistency');
    else if (param === 'exercises' || param === 'trophy') setActiveTab('exercises');
    else if (param === 'weekly' || param === 'logs') setActiveTab('weekly');
  }, [route?.params?.tab]);

  useEffect(() => {
    if (route?.params?.openWeeklyReport) {
      setActiveTab('weekly');
    }
  }, [route?.params?.openWeeklyReport]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('open_weekly_report', () => {
      setActiveTab('weekly');
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

  // ── Sub-Tab: Weekly Report State & Navigation ──────────────────────────────
  const [reportAnchorDate, setReportAnchorDate] = useState<string>(() => todayStr());

  const weekRangeInfo = useMemo(() => {
    const parts = reportAnchorDate.split('-').map(Number);
    const y = parts[0] || new Date().getFullYear();
    const m = (parts[1] || 1) - 1;
    const day = parts[2] || new Date().getDate();
    const d = new Date(y, m, day);
    const dow = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dow + 6) % 7));

    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + i);
      const yStr = dt.getFullYear();
      const mStr = String(dt.getMonth() + 1).padStart(2, '0');
      const dStr = String(dt.getDate()).padStart(2, '0');
      weekDates.push(`${yStr}-${mStr}-${dStr}`);
    }

    const now = new Date();
    const curDow = now.getDay();
    const currentMonday = new Date(now);
    currentMonday.setDate(now.getDate() - ((curDow + 6) % 7));
    const curMondayStr = `${currentMonday.getFullYear()}-${String(currentMonday.getMonth() + 1).padStart(2, '0')}-${String(currentMonday.getDate()).padStart(2, '0')}`;

    const isCurrentWeek = weekDates[0] === curMondayStr;

    const monDate = new Date(monday);
    const sunDate = new Date(monday);
    sunDate.setDate(monday.getDate() + 6);
    const monMonth = monDate.toLocaleString('en-US', { month: 'short' });
    const sunMonth = sunDate.toLocaleString('en-US', { month: 'short' });
    const label =
      monMonth === sunMonth
        ? `${monMonth} ${monDate.getDate()} – ${sunDate.getDate()}`
        : `${monMonth} ${monDate.getDate()} – ${sunMonth} ${sunDate.getDate()}`;

    const canGoForward = !isCurrentWeek;

    return {
      mondayStr: weekDates[0],
      sundayStr: weekDates[6],
      weekDates,
      label,
      isCurrentWeek,
      canGoForward,
    };
  }, [reportAnchorDate]);

  const shiftReportAnchor = useCallback((deltaWeeks: number) => {
    hapticLight();
    setReportAnchorDate(prev => {
      const parts = prev.split('-').map(Number);
      const y = parts[0] || new Date().getFullYear();
      const m = (parts[1] || 1) - 1;
      const day = parts[2] || new Date().getDate();
      const d = new Date(y, m, day);
      d.setDate(d.getDate() + deltaWeeks * 7);
      const yStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const dStr = String(d.getDate()).padStart(2, '0');
      return `${yStr}-${mStr}-${dStr}`;
    });
  }, []);

  const resetToCurrentWeek = useCallback(() => {
    hapticLight();
    setReportAnchorDate(todayStr());
  }, []);

  const selectedWeekSessions = useMemo(() => {
    return analyticsData.detailedLogs.filter(s =>
      weekRangeInfo.weekDates.includes(s.date.slice(0, 10))
    );
  }, [analyticsData.detailedLogs, weekRangeInfo.weekDates]);

  const hasSelectedWeekSessions = selectedWeekSessions.length > 0;

  const selectedWeekStats = useMemo(() => {
    const sessionsCount = selectedWeekSessions.length;
    const volumeKg = selectedWeekSessions.reduce((acc, s) => acc + s.totalVolumeKg, 0);
    const setsCount = selectedWeekSessions.reduce((acc, s) => acc + s.totalSets, 0);
    const durationMins = selectedWeekSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    return { sessionsCount, volumeKg, setsCount, durationMins };
  }, [selectedWeekSessions]);

  const plannedWeeklyBlueprint = useMemo(() => {
    const rawDays = userGymPlan?.customDays
      ? Object.values(userGymPlan.customDays)
      : (Array.isArray(GYM_PLAN) ? GYM_PLAN : Object.values(GYM_PLAN || {}));
    const trainingDays = (rawDays || []).filter((d: any) => d && !d.isRest && (d.exercises?.length > 0));
    const plannedSessions = trainingDays.length || 5;

    let totalPlannedSets = 0;
    const muscleSetMap: Record<string, number> = {};

    trainingDays.forEach((day: any) => {
      (day.exercises || []).forEach((ex: any) => {
        const sets = Number(ex.sets) || 3;
        totalPlannedSets += sets;
        const targetMuscle = ex.targetMuscle || ex.muscle || 'Compound';
        muscleSetMap[targetMuscle] = (muscleSetMap[targetMuscle] || 0) + sets;
      });
    });

    const topMuscles = Object.entries(muscleSetMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([muscle, sets]) => ({ muscle, sets }));

    const now = new Date();
    const dow = now.getDay();
    const dayIdx = dow === 0 ? 7 : dow;
    const todayDay =
      (userGymPlan?.customDays ? userGymPlan.customDays[dayIdx] : null) ||
      (Array.isArray(GYM_PLAN) ? (GYM_PLAN as GymPlanDay[]).find(d => d.dayIndex === dayIdx) : null);

    const isRest =
      !todayDay ||
      Boolean(todayDay.isRest) ||
      (todayDay.name || '').toLowerCase().includes('rest') ||
      (todayDay.focus || '').toLowerCase().includes('rest') ||
      (todayDay.subtitle || '').toLowerCase().includes('rest') ||
      (todayDay.exercises || []).length === 0;

    return {
      plannedSessions,
      totalPlannedSets: totalPlannedSets || 75,
      topMuscles,
      todayDay: todayDay || null,
      isTodayRest: isRest,
    };
  }, [userGymPlan]);

  // ── Sub-Tab 1: Consistency State & Adherence Engine ────────────────────────
  const consistencyStats = useMemo(() => {
    const plannedTargetPerWeek = plannedWeeklyBlueprint.plannedSessions || 5;
    const totalPlannedIn8Weeks = plannedTargetPerWeek * 8;
    const totalActualWorkouts = analyticsData.weeklyTrends.reduce((acc, w) => acc + w.workoutCount, 0);
    const adherenceRatePct =
      totalPlannedIn8Weeks > 0
        ? Math.min(100, Math.round((totalActualWorkouts / totalPlannedIn8Weeks) * 100))
        : 0;

    const weeksOnTargetCount = analyticsData.weeklyTrends.filter(
      w => w.workoutCount >= plannedTargetPerWeek
    ).length;

    return {
      streakDays: streak,
      adherenceRatePct,
      weeksOnTargetCount,
      avgWorkoutsPerWeek: analyticsData.weeklySummary.avgWorkoutsPerWeek,
    };
  }, [
    analyticsData.weeklyTrends,
    analyticsData.weeklySummary.avgWorkoutsPerWeek,
    plannedWeeklyBlueprint.plannedSessions,
    streak,
  ]);

  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);

  const selectedWeekItem: WeeklyTrendItem | null = useMemo(() => {
    if (selectedWeekIndex != null && analyticsData.weeklyTrends[selectedWeekIndex]) {
      return analyticsData.weeklyTrends[selectedWeekIndex];
    }
    return analyticsData.weeklyTrends[analyticsData.weeklyTrends.length - 1] || null;
  }, [analyticsData.weeklyTrends, selectedWeekIndex]);

  // ── Sub-Tab 2: Exercises State ─────────────────────────────────────────────
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [exCategoryFilter, setExCategoryFilter] = useState<'All' | 'Push' | 'Pull' | 'Legs' | 'Arms' | 'Core'>('All');
  const [selectedExName, setSelectedExName] = useState<string | null>(null);
  const [exerciseChartMetric, setExerciseChartMetric] = useState<ExerciseChartMetric>('weight');
  const [selectedDataPointIdx, setSelectedDataPointIdx] = useState<number | null>(null);

  const filteredExerciseProfiles = useMemo(() => {
    let list = analyticsData.exerciseProfiles;
    if (exCategoryFilter !== 'All') {
      const target = exCategoryFilter.toLowerCase();
      list = list.filter(p => {
        const cat = (p.category || '').toLowerCase();
        const muscle = (p.muscle || '').toLowerCase();
        return cat.includes(target) || muscle.includes(target);
      });
    }
    if (exerciseSearchQuery.trim()) {
      const q = exerciseSearchQuery.toLowerCase().trim();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.muscle.toLowerCase().includes(q));
    }
    return list;
  }, [analyticsData.exerciseProfiles, exCategoryFilter, exerciseSearchQuery]);

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

      {/* ── Screen Header (Clean iOS Header without floating modal button) ── */}
      <View style={styles.headerContainer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {streak}d streak · {analyticsData.detailedLogs.length} workouts · {formatVol(totalLifetimeVolumeKg)} moved
          </Text>
        </View>
      </View>

      {/* ── Native Apple iOS Segmented Control: Weekly Report | Consistency | Exercises ── */}
      <View style={[styles.segmentedTrack, { backgroundColor: cardBg }]}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'weekly' && { backgroundColor: elevatedBg }]}
          onPress={() => {
            hapticSelection();
            setActiveTab('weekly');
          }}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === 'weekly' ? styles.segmentTextActive : styles.segmentTextInactive,
            ]}
          >
            Weekly Report
          </Text>
        </TouchableOpacity>

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
      </View>

      {/* ════════════════════════════════════════════════════════════════════════
          PART 1: 📊 WEEKLY REPORT (Executive Synthesis & Overload Engine)
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'weekly' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── 1. Interactive Week Navigator ── */}
          <View style={[styles.weekNavigatorCard, { backgroundColor: cardBg }]}>
            <TouchableOpacity
              style={styles.weekNavArrowBtn}
              onPress={() => shiftReportAnchor(-1)}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.weekNavCenterBlock}
              onPress={!weekRangeInfo.isCurrentWeek ? resetToCurrentWeek : undefined}
              activeOpacity={weekRangeInfo.isCurrentWeek ? 1 : 0.7}
            >
              <View style={styles.weekNavTitleRow}>
                <Ionicons name="calendar-outline" size={14} color="#A599FF" style={{ marginRight: 6 }} />
                <Text style={styles.weekNavTitleText}>
                  {weekRangeInfo.label}
                </Text>
                {weekRangeInfo.isCurrentWeek && (
                  <View style={styles.currentWeekTag}>
                    <Text style={styles.currentWeekTagText}>THIS WEEK</Text>
                  </View>
                )}
              </View>
              {!weekRangeInfo.isCurrentWeek && (
                <Text style={styles.weekNavJumpTodayText}>Tap to return to current week</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.weekNavArrowBtn, !weekRangeInfo.canGoForward && { opacity: 0.3 }]}
              onPress={() => weekRangeInfo.canGoForward && shiftReportAnchor(1)}
              disabled={!weekRangeInfo.canGoForward}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-forward" size={18} color={weekRangeInfo.canGoForward ? '#FFFFFF' : '#545458'} />
            </TouchableOpacity>
          </View>

          {/* ── 2. Executive Weekly KPIs Card (Live or Blueprint Baseline) ── */}
          <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCol}>
                <Text style={styles.kpiValue}>
                  {selectedWeekStats.sessionsCount}/{plannedWeeklyBlueprint.plannedSessions}
                </Text>
                <Text style={styles.kpiLabel}>SESSIONS</Text>
              </View>

              <View style={styles.kpiCol}>
                <Text style={styles.kpiValue}>
                  {formatVol(selectedWeekStats.volumeKg)}
                </Text>
                <Text style={styles.kpiLabel}>VOLUME</Text>
              </View>

              <View style={styles.kpiCol}>
                <Text style={styles.kpiValue}>{selectedWeekStats.setsCount}</Text>
                <Text style={styles.kpiLabel}>SETS</Text>
              </View>

              <View style={styles.kpiCol}>
                <Text style={styles.kpiValue}>
                  {formatDuration(selectedWeekStats.durationMins)}
                </Text>
                <Text style={styles.kpiLabel}>TRAINED</Text>
              </View>
            </View>
          </View>

          {/* ── 3. This Week's Plan Blueprint (Only on Current Week) ── */}
          {weekRangeInfo.isCurrentWeek && (
            <View style={[styles.blueprintCard, { backgroundColor: cardBg }]}>
              <View style={styles.blueprintHeaderRow}>
                <View style={styles.blueprintIconWrap}>
                  <Ionicons name="clipboard-outline" size={20} color="#0A84FF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.blueprintTitle}>THIS WEEK'S BLUEPRINT</Text>
                  <Text style={styles.blueprintSubtitle}>
                    Target: {plannedWeeklyBlueprint.plannedSessions} Sessions · ~{plannedWeeklyBlueprint.totalPlannedSets} Working Sets
                  </Text>
                </View>
                <View style={styles.blueprintStatusTag}>
                  <Text style={styles.blueprintStatusTagText}>READY</Text>
                </View>
              </View>

              {/* Target Muscle Allocation */}
              {plannedWeeklyBlueprint.topMuscles.length > 0 && (
                <View style={styles.blueprintMusclesSection}>
                  <Text style={styles.blueprintSectionLabel}>PLANNED TARGET MUSCLE VOLUME</Text>
                  <View style={styles.blueprintMusclesRow}>
                    {plannedWeeklyBlueprint.topMuscles.map(item => (
                      <View key={item.muscle} style={[styles.blueprintMusclePill, { backgroundColor: elevatedBg }]}>
                        <Text style={styles.blueprintMusclePillName}>{item.muscle}</Text>
                        <Text style={styles.blueprintMusclePillSets}>{item.sets}s</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.blueprintDivider} />

              {/* Today's Scheduled Routine Spotlight: Rest Day Awareness */}
              {plannedWeeklyBlueprint.isTodayRest ? (
                <View style={styles.blueprintTodaySpotlight}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.blueprintTodaySub, { color: '#30D158' }]}>TODAY'S SCHEDULE</Text>
                    <Text style={styles.blueprintTodayName} numberOfLines={1}>
                      {plannedWeeklyBlueprint.todayDay?.name || 'Rest & Recovery'}
                    </Text>
                    <Text style={styles.blueprintTodayFocus} numberOfLines={1}>
                      Scheduled Recovery Day · Mobility, tissue repair & hydration
                    </Text>
                  </View>
                  <View style={styles.blueprintRestBadge}>
                    <Ionicons name="bed-outline" size={15} color="#30D158" style={{ marginRight: 5 }} />
                    <Text style={styles.blueprintRestBadgeText}>Rest Day</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.blueprintTodaySpotlight}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.blueprintTodaySub}>TODAY'S SCHEDULED ROUTINE</Text>
                    <Text style={styles.blueprintTodayName} numberOfLines={1}>
                      {plannedWeeklyBlueprint.todayDay?.name || 'Scheduled Workout'}
                    </Text>
                    <Text style={styles.blueprintTodayFocus} numberOfLines={1}>
                      {plannedWeeklyBlueprint.todayDay?.focus || `${plannedWeeklyBlueprint.todayDay?.exercises?.length || 0} exercises`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.startTodayWorkoutBtn}
                    onPress={() => {
                      hapticMedium();
                      navigation.navigate('Today');
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="play" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.startTodayWorkoutBtnText}>Start</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* ── 4. Progressive Overload Scorecard (Double Progression Audit) ── */}
          <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.cardSectionLabel}>PROGRESSIVE OVERLOAD SCORECARD</Text>
                <Text style={styles.cardSubLabel}>Double progression audit & strength adaptation</Text>
              </View>
              <View style={styles.overloadRateBadge}>
                <Ionicons name="trending-up" size={13} color="#30D158" />
                <Text style={styles.overloadRateBadgeText}>
                  {analyticsData.weeklyScorecard.overloadRatePct}% Progressing
                </Text>
              </View>
            </View>

            <View style={styles.scorecardGrid}>
              <View style={styles.scorecardItem}>
                <Text style={[styles.scorecardVal, { color: '#30D158' }]}>
                  +{analyticsData.weeklyScorecard.weightUnlocks}
                </Text>
                <Text style={styles.scorecardLabel}>WEIGHT UNLOCKS</Text>
              </View>
              <View style={styles.scorecardItem}>
                <Text style={[styles.scorecardVal, { color: '#0A84FF' }]}>
                  +{analyticsData.weeklyScorecard.repBuilds}
                </Text>
                <Text style={styles.scorecardLabel}>REP BUILDS</Text>
              </View>
              <View style={styles.scorecardItem}>
                <Text
                  style={[
                    styles.scorecardVal,
                    { color: analyticsData.weeklyScorecard.plateaus > 0 ? '#FF9F0A' : '#8E8E93' },
                  ]}
                >
                  {analyticsData.weeklyScorecard.plateaus}
                </Text>
                <Text style={styles.scorecardLabel}>PLATEAUS</Text>
              </View>
              <View style={styles.scorecardItem}>
                <Text style={[styles.scorecardVal, { color: '#A599FF' }]}>
                  {analyticsData.weeklyScorecard.evaluatedCount}
                </Text>
                <Text style={styles.scorecardLabel}>TRACKED LIFTS</Text>
              </View>
            </View>
          </View>

          {/* ── 5. Anchor Compound Lifts Big-3 (Push, Pull, Legs e1RM) ── */}
          {analyticsData.anchorLifts.totalAnchorE1RM > 0 && (
            <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardSectionLabel}>BIG-3 COMPOUND ANCHORS</Text>
                  <Text style={styles.cardSubLabel}>
                    Total Anchor e1RM: {Math.round(analyticsData.anchorLifts.totalAnchorE1RM)} kg
                  </Text>
                </View>
              </View>

              <View style={styles.anchorLiftsRow}>
                {analyticsData.anchorLifts.push && (
                  <View style={[styles.anchorLiftCard, { backgroundColor: elevatedBg }]}>
                    <Text style={styles.anchorLiftCategory}>PUSH</Text>
                    <Text style={styles.anchorLiftName} numberOfLines={1}>
                      {analyticsData.anchorLifts.push.exerciseName}
                    </Text>
                    <Text style={styles.anchorLiftStat}>
                      {analyticsData.anchorLifts.push.bestWeight}kg × {analyticsData.anchorLifts.push.bestReps}
                    </Text>
                    <Text style={styles.anchorLiftE1RM}>
                      e1RM: {Math.round(analyticsData.anchorLifts.push.bestE1RM)} kg
                    </Text>
                  </View>
                )}

                {analyticsData.anchorLifts.pull && (
                  <View style={[styles.anchorLiftCard, { backgroundColor: elevatedBg }]}>
                    <Text style={styles.anchorLiftCategory}>PULL</Text>
                    <Text style={styles.anchorLiftName} numberOfLines={1}>
                      {analyticsData.anchorLifts.pull.exerciseName}
                    </Text>
                    <Text style={styles.anchorLiftStat}>
                      {analyticsData.anchorLifts.pull.bestWeight}kg × {analyticsData.anchorLifts.pull.bestReps}
                    </Text>
                    <Text style={styles.anchorLiftE1RM}>
                      e1RM: {Math.round(analyticsData.anchorLifts.pull.bestE1RM)} kg
                    </Text>
                  </View>
                )}

                {analyticsData.anchorLifts.legs && (
                  <View style={[styles.anchorLiftCard, { backgroundColor: elevatedBg }]}>
                    <Text style={styles.anchorLiftCategory}>LEGS</Text>
                    <Text style={styles.anchorLiftName} numberOfLines={1}>
                      {analyticsData.anchorLifts.legs.exerciseName}
                    </Text>
                    <Text style={styles.anchorLiftStat}>
                      {analyticsData.anchorLifts.legs.bestWeight}kg × {analyticsData.anchorLifts.legs.bestReps}
                    </Text>
                    <Text style={styles.anchorLiftE1RM}>
                      e1RM: {Math.round(analyticsData.anchorLifts.legs.bestE1RM)} kg
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ── 6. Scientific Weekly Gym Report (Muscle Volume Landmarks & Highlights) ── */}
          <WeeklyGymReport
            gymLogs={gymLogs || []}
            weekAnchorDate={reportAnchorDate}
            userGymPlan={userGymPlan}
            scrollable={false}
            hideHeader={true}
            hideEmptyCard={true}
          />

          {/* ── 7. Sessions Logged In This Selected Week (If Any) ── */}
          {hasSelectedWeekSessions ? (
            <View style={[styles.weekSessionsCard, { backgroundColor: cardBg }]}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardSectionLabel}>SESSIONS LOGGED THIS WEEK</Text>
                  <Text style={styles.cardSubLabel}>
                    {selectedWeekSessions.length} {selectedWeekSessions.length === 1 ? 'workout' : 'workouts'} completed
                  </Text>
                </View>
              </View>

              {selectedWeekSessions.map(session => {
                const parts = session.date.slice(0, 10).split('-').map(Number);
                const y = parts[0] || new Date().getFullYear();
                const m = (parts[1] || 1) - 1;
                const d = parts[2] || 1;
                const dt = new Date(y, m, d);
                const dayName = dt.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                const dayNum = String(d).padStart(2, '0');

                return (
                  <TouchableOpacity
                    key={session.id || session.date}
                    style={styles.weekSessionRow}
                    onPress={() => {
                      hapticLight();
                      handleOpenWorkoutSummary(session.date);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.weekSessionDateBadge, { backgroundColor: elevatedBg }]}>
                      <Text style={styles.weekSessionDateDay}>{dayName}</Text>
                      <Text style={styles.weekSessionDateNum}>{dayNum}</Text>
                    </View>

                    <View style={styles.weekSessionMain}>
                      <Text style={styles.weekSessionTitle} numberOfLines={1}>
                        {session.splitTag || 'Workout Session'}
                      </Text>
                      <Text style={styles.weekSessionSub} numberOfLines={1}>
                        {session.exercises.length} exercises · {session.totalSets} sets
                        {session.durationMinutes ? ` · ${session.durationMinutes}m` : ''}
                      </Text>
                    </View>

                    <View style={styles.weekSessionRight}>
                      <Text style={styles.weekSessionVol}>{formatVol(session.totalVolumeKg)}</Text>
                      <View style={styles.weekSessionDetailsRow}>
                        <Text style={styles.weekSessionDetailsText}>Details</Text>
                        <Ionicons name="chevron-forward" size={13} color="#0A84FF" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            !weekRangeInfo.isCurrentWeek && (
              <View style={[styles.emptyPastWeekCard, { backgroundColor: cardBg }]}>
                <Ionicons name="calendar-clear-outline" size={36} color="#545458" />
                <Text style={styles.emptyPastWeekTitle}>No Workouts Recorded</Text>
                <Text style={styles.emptyPastWeekSub}>
                  No training sessions were logged for the week of {weekRangeInfo.label}.
                </Text>
                <TouchableOpacity
                  style={styles.returnCurrentWeekBtn}
                  onPress={resetToCurrentWeek}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={15} color="#0A84FF" style={{ marginRight: 6 }} />
                  <Text style={styles.returnCurrentWeekBtnText}>Return to Current Week</Text>
                </TouchableOpacity>
              </View>
            )
          )}

        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          PART 2: 📅 CONSISTENCY & WORKLOAD WAVE (The Habit & Streak Engine)
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'consistency' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* 1. Habit Discipline & Adherence KPIs Strip */}
          <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardSectionLabel}>HABIT & ADHERENCE DISCIPLINE</Text>
                <Text style={styles.cardSubLabel}>Long-term routine consistency & schedule fidelity</Text>
              </View>
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={13} color="#FF9F0A" />
                <Text style={styles.streakBadgeText}>{consistencyStats.streakDays}d Streak</Text>
              </View>
            </View>

            <View style={styles.kpiGrid}>
              <View style={styles.kpiCol}>
                <Text style={[styles.kpiValue, { color: '#FF9F0A' }]}>{consistencyStats.streakDays}d</Text>
                <Text style={styles.kpiLabel}>STREAK</Text>
              </View>

              <View style={styles.kpiCol}>
                <Text style={[styles.kpiValue, { color: '#30D158' }]}>{consistencyStats.adherenceRatePct}%</Text>
                <Text style={styles.kpiLabel}>ADHERENCE</Text>
              </View>

              <View style={styles.kpiCol}>
                <Text style={[styles.kpiValue, { color: '#0A84FF' }]}>
                  {consistencyStats.weeksOnTargetCount}/8
                </Text>
                <Text style={styles.kpiLabel}>WKS MET</Text>
              </View>

              <View style={styles.kpiCol}>
                <Text style={styles.kpiValue}>{consistencyStats.avgWorkoutsPerWeek}</Text>
                <Text style={styles.kpiLabel}>AVG / WK</Text>
              </View>
            </View>
          </View>

          {/* 2. 18-Week Consistency Grid (Daily Athlete Calendar Matrix) */}
          <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardSectionLabel}>18-WEEK CONSISTENCY GRID</Text>
                <Text style={styles.cardSubLabel}>Daily workout attendance & volume intensity</Text>
              </View>
            </View>

            {!isHeavyReady ? (
              <View
                style={{
                  height: 140,
                  backgroundColor: elevatedBg,
                  borderRadius: 8,
                  opacity: 0.25,
                  marginTop: 8,
                }}
              />
            ) : (
              <ConsistencyHeatmap data={heatmapData} />
            )}
          </View>

          {/* 3. 8-Week Workload Wave & Fatigue Trend */}
          <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.cardSectionLabel}>8-WEEK WORKLOAD & FREQUENCY</Text>
                <Text style={styles.cardSubLabel}>Weekly volume trend and training frequency</Text>
              </View>
            </View>

            {/* Selected Week Inspection Capsule */}
            {selectedWeekItem && (
              <View style={[styles.weekInspectBox, { backgroundColor: elevatedBg }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.weekInspectTitle}>
                    {selectedWeekItem.isCurrentWeek ? 'Current Week' : `Week of ${selectedWeekItem.weekLabel}`}
                  </Text>
                  <Text style={styles.weekInspectDetails}>
                    {formatVol(selectedWeekItem.totalVolumeKg)} · {selectedWeekItem.workoutCount} of {plannedWeeklyBlueprint.plannedSessions} sessions
                    {selectedWeekItem.cardioMinutes > 0 ? ` · ${selectedWeekItem.cardioMinutes}m cardio` : ''}
                  </Text>
                </View>
                <View
                  style={[
                    styles.workloadBadge,
                    {
                      backgroundColor:
                        selectedWeekItem.workoutCount >= (plannedWeeklyBlueprint.plannedSessions || 5)
                          ? 'rgba(48, 209, 88, 0.15)'
                          : selectedWeekItem.workoutCount === 0
                          ? 'rgba(142, 142, 147, 0.12)'
                          : 'rgba(10, 132, 255, 0.15)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.workloadBadgeText,
                      {
                        color:
                          selectedWeekItem.workoutCount >= (plannedWeeklyBlueprint.plannedSessions || 5)
                            ? '#30D158'
                            : selectedWeekItem.workoutCount === 0
                            ? '#8E8E93'
                            : '#0A84FF',
                      },
                    ]}
                  >
                    {selectedWeekItem.workoutCount >= (plannedWeeklyBlueprint.plannedSessions || 5)
                      ? 'Target Met'
                      : selectedWeekItem.workoutCount === 0
                      ? 'Rest'
                      : 'In Progress'}
                  </Text>
                </View>
              </View>
            )}

            {/* 8-Week SVG Bar Chart */}
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              {!isHeavyReady ? (
                <View
                  style={{
                    width: safeChartWidth,
                    height: 90 + 24,
                    backgroundColor: elevatedBg,
                    borderRadius: 8,
                    opacity: 0.25,
                  }}
                />
              ) : (() => {
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

          {/* 4. Cardio & Conditioning Adherence (Conditional) */}
          {analyticsData.weeklySummary.cardioMinutes > 0 && (
            <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
              <Text style={styles.cardSectionLabel}>CARDIO & CONDITIONING ADHERENCE</Text>

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

          {/* Category Filter Pills: All | Push | Pull | Legs | Arms | Core */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.horizontalChipsScroll, { marginBottom: 4 }]}
          >
            {(['All', 'Push', 'Pull', 'Legs', 'Arms', 'Core'] as const).map(cat => {
              const isSel = exCategoryFilter === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => {
                    hapticLight();
                    setExCategoryFilter(cat);
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
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

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
              {/* Selected Exercise Benchmark Hero */}
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
                    <Text style={[styles.kpiValue, { color: '#30D158' }]}>
                      {activeExerciseProfile.allTimeBestWeight > 0
                        ? `${activeExerciseProfile.allTimeBestWeight} kg`
                        : 'BW'}
                    </Text>
                    <Text style={styles.kpiLabel}>ALL-TIME PR</Text>
                  </View>

                  <View style={styles.kpiCol}>
                    <Text style={[styles.kpiValue, { color: '#A599FF' }]}>
                      {Math.round(
                        activeExerciseProfile.allTimeBestWeight *
                          (1 + (activeExerciseProfile.allTimeBestReps || 1) / 30)
                      )} kg
                    </Text>
                    <Text style={styles.kpiLabel}>EST. 1RM</Text>
                  </View>

                  <View style={styles.kpiCol}>
                    <Text style={styles.kpiValue}>
                      {activeExerciseProfile.sessions.length > 0
                        ? `${activeExerciseProfile.sessions[activeExerciseProfile.sessions.length - 1].topWeight}kg`
                        : '—'}
                    </Text>
                    <Text style={styles.kpiLabel}>LAST LOAD</Text>
                  </View>

                  <View style={styles.kpiCol}>
                    <Text style={styles.kpiValue}>{activeExerciseProfile.totalSessions}</Text>
                    <Text style={styles.kpiLabel}>SESSIONS</Text>
                  </View>
                </View>
              </View>

              {/* Progression / Plateau Status Box */}
              <View style={[styles.insetCard, { backgroundColor: cardBg }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardSectionLabel}>PROGRESSION AUDIT</Text>
                    <Text style={styles.cardSubLabel}>Double progression audit & overload adaptation</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          activeExerciseProfile.progressionStatus.status === 'progressing'
                            ? 'rgba(48, 209, 88, 0.15)'
                            : activeExerciseProfile.progressionStatus.status === 'stalled'
                            ? 'rgba(255, 159, 10, 0.15)'
                            : 'rgba(142, 142, 147, 0.12)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color:
                            activeExerciseProfile.progressionStatus.status === 'progressing'
                              ? '#30D158'
                              : activeExerciseProfile.progressionStatus.status === 'stalled'
                              ? '#FF9F0A'
                              : '#8E8E93',
                        },
                      ]}
                    >
                      {activeExerciseProfile.progressionStatus.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

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
                {!isHeavyReady ? (
                  <View
                    style={{
                      width: safeChartWidth,
                      height: CHART_H,
                      backgroundColor: elevatedBg,
                      borderRadius: 8,
                      opacity: 0.25,
                      alignSelf: 'center',
                      marginTop: 10,
                    }}
                  />
                ) : curveCoords.length >= 2 ? (
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
            <View style={[styles.insetCard, { backgroundColor: cardBg, alignItems: 'center', paddingVertical: 32 }]}>
              <Ionicons name="barbell-outline" size={36} color="#8E8E93" />
              <Text style={styles.emptyTitle}>No Exercises Found</Text>
              <Text style={styles.emptyNote}>
                Log your working sets in the Today tab to automatically unlock strength curves, personal records (PRs), and estimated 1RMs.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  hapticMedium();
                  navigation.navigate('Today');
                }}
                activeOpacity={0.8}
                style={[styles.startTodayWorkoutBtn, { marginTop: 14 }]}
              >
                <Ionicons name="play" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.startTodayWorkoutBtnText}>Go to Today's Workout</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
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
  modalSubtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },

  // ── Consistency & Status Badges ──
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
  },
  streakBadgeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: '#FF9F0A',
  },
  workloadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'center',
  },
  workloadBadgeText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.3,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.5,
  },

  // ── Progressive Overload Scorecard ──
  overloadRateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  overloadRateBadgeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: '#30D158',
  },
  scorecardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 6,
  },
  scorecardItem: {
    alignItems: 'center',
    flex: 1,
  },
  scorecardVal: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.3,
  },
  scorecardLabel: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginTop: 3,
    textAlign: 'center',
  },

  // ── Anchor Lifts Big-3 Cards ──
  anchorLiftsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  anchorLiftCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    gap: 2,
  },
  anchorLiftCategory: {
    fontSize: 9.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  anchorLiftName: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  anchorLiftStat: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#30D158',
    marginTop: 2,
  },
  anchorLiftE1RM: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },

  // ── Week Navigator Styles ──
  weekNavigatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  weekNavArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNavCenterBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  weekNavTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekNavTitleText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  currentWeekTag: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(165, 153, 255, 0.16)',
  },
  currentWeekTagText: {
    fontSize: 9.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#A599FF',
    letterSpacing: 0.5,
  },
  weekNavJumpTodayText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.medium,
    color: '#0A84FF',
    marginTop: 2,
  },

  // ── Blueprint Zero-State Styles ──
  blueprintCard: {
    padding: 16,
    borderRadius: 18,
    gap: 12,
  },
  blueprintHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  blueprintIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueprintTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  blueprintSubtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    marginTop: 2,
  },
  blueprintStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
  },
  blueprintStatusTagText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    color: '#30D158',
    letterSpacing: 0.5,
  },
  blueprintMusclesSection: {
    gap: 6,
  },
  blueprintSectionLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.6,
  },
  blueprintMusclesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  blueprintMusclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  blueprintMusclePillName: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#FFFFFF',
  },
  blueprintMusclePillSets: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#A599FF',
  },
  blueprintDivider: {
    height: 1,
    backgroundColor: 'rgba(84, 84, 88, 0.25)',
    marginVertical: 2,
  },
  blueprintTodaySpotlight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blueprintTodaySub: {
    fontSize: 9.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#0A84FF',
    letterSpacing: 0.5,
  },
  blueprintTodayName: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    marginTop: 2,
  },
  blueprintTodayFocus: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    marginTop: 1,
  },
  blueprintRestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
  },
  blueprintRestBadgeText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#30D158',
  },
  startTodayWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0A84FF',
  },
  startTodayWorkoutBtnText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  startGeneralWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0A84FF',
  },
  startGeneralWorkoutBtnText: {
    fontSize: 13.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  emptyPastWeekCard: {
    padding: 28,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyPastWeekTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  emptyPastWeekSub: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    textAlign: 'center',
    maxWidth: 260,
  },
  returnCurrentWeekBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    marginTop: 6,
  },
  returnCurrentWeekBtnText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#0A84FF',
  },

  // ── Weekly Sessions List Styles ──
  weekSessionsCard: {
    padding: 14,
    borderRadius: 18,
    gap: 10,
  },
  weekSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(84, 84, 88, 0.2)',
  },
  weekSessionDateBadge: {
    width: 44,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  weekSessionDateDay: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
  },
  weekSessionDateNum: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  weekSessionMain: {
    flex: 1,
    paddingRight: 8,
  },
  weekSessionTitle: {
    fontSize: 13.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  weekSessionSub: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    marginTop: 2,
  },
  weekSessionRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  weekSessionVol: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#30D158',
  },
  weekSessionDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 2,
  },
  weekSessionDetailsText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.medium,
    color: '#0A84FF',
  },
});
