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
  ScrollView,
  TextInput,
  StyleSheet,
  DeviceEventEmitter,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Play,
  TrendingUp,
  ArrowLeft,
} from 'lucide-react-native';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { AnimatedSubTabPane } from '../../components/ui/AnimatedSubTabPane';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { TabScreenHeader } from '../../components/ui/TabScreenHeader';
import { TactileButton } from '../../components/ui/TactileButton';
import { NumericText } from '../../components/ui/NumericText';
import { RollingNumber } from '../../components/ui/RollingNumber';
import { IOSSegmentedControl } from '../../components/ui/IOSSegmentedControl';
import { ChartDataPoint } from '../../components/ui/AnimatedSvgCharts';
import { useScreenReplayTrigger } from '../../hooks/useScreenReplayTrigger';

import { ICON, SPACE, TOUCH } from '../../theme/tokens';
import { useResponsiveMetrics } from '../../theme/responsive';
import { useGymLogs, useGymPlan } from '../../contexts/domains/WellnessContext';
import { useTheme } from '../../contexts/ThemeContext';
import { GymNavigationParamList } from '../../types/gym.types';
import { GYM_PLAN } from '../../data/gymPlan';
import { todayStr } from '../../hooks/useGymLog';
import {
  calculateGymStreak,
  formatIndianDatePretty,
} from '../../utils/gymUtils';
import {
  KG_TO_LBS,
  formatVolumeParts,
  kgToDisplay,
  useWeightUnit,
} from '../../utils/weightUnit';
import {
  computeUnifiedAnalytics,
  computeWeekScopedSummary,
  UnifiedAnalyticsData,
  ExerciseHistoryProfile,
  WeeklyTrendItem,
} from '../../services/gymAnalyticsEngine';

import WeeklyGymReport from '../../components/Gym/metrics/WeeklyGymReport';
import { makeHistoryStyles } from './history/gymHistoryStyles';
import ConsistencySubTab from './history/ConsistencySubTab';
import ExercisesSubTab, { ExerciseChartMetric } from './history/ExercisesSubTab';

type AnalyticsSubTab = 'weekly' | 'consistency' | 'exercises';

export default function GymHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, tokens } = useTheme();
  const styles = useMemo(() => makeHistoryStyles(tokens), [tokens]);
  const navigation = useNavigation<NativeStackNavigationProp<GymNavigationParamList>>();
  const { clampChartWidth } = useResponsiveMetrics();
  const safeChartWidth = clampChartWidth(44);
  const { replayKey } = useScreenReplayTrigger();

  const { gymLogs, ensureSubscribed } = useGymLogs();
  const { userGymPlan } = useGymPlan();
  const unitIsLbs = useWeightUnit();
  const route = useRoute<any>();

  useEffect(() => {
    ensureSubscribed?.();
  }, [ensureSubscribed]);

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
  }, [gymLogs, unitIsLbs]);

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

    const prevMonday = new Date(monday);
    prevMonday.setDate(monday.getDate() - 7);
    const prevWeekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(prevMonday);
      dt.setDate(prevMonday.getDate() + i);
      const yStr = dt.getFullYear();
      const mStr = String(dt.getMonth() + 1).padStart(2, '0');
      const dStr = String(dt.getDate()).padStart(2, '0');
      prevWeekDates.push(`${yStr}-${mStr}-${dStr}`);
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
      prevWeekDates,
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

  const weekScopedSummary = useMemo(
    () =>
      computeWeekScopedSummary(
        gymLogs || [],
        analyticsData,
        weekRangeInfo.weekDates,
        weekRangeInfo.prevWeekDates
      ),
    [gymLogs, analyticsData, weekRangeInfo.weekDates, weekRangeInfo.prevWeekDates]
  );

  const selectedWeekStats = useMemo(() => {
    return {
      sessionsCount: weekScopedSummary.sessionsCount,
      volumeKg: weekScopedSummary.volumeKg,
      setsCount: weekScopedSummary.setsCount,
      durationMins: weekScopedSummary.durationMins,
    };
  }, [weekScopedSummary]);

  const plannedWeeklySessions = useMemo(() => {
    const rawDays = userGymPlan?.customDays
      ? Object.values(userGymPlan.customDays)
      : (Array.isArray(GYM_PLAN) ? GYM_PLAN : Object.values(GYM_PLAN || {}));
    const trainingDays = (rawDays || []).filter((d: any) => d && !d.isRest && (d.exercises?.length > 0));
    return trainingDays.length || 5;
  }, [userGymPlan]);

  // ── Sub-Tab 1: Consistency State & Adherence Engine ────────────────────────
  const consistencyStats = useMemo(() => {
    const plannedTargetPerWeek = plannedWeeklySessions || 5;
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
    plannedWeeklySessions,
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
        if (target === 'core') {
          return (
            cat.includes('core') ||
            cat.includes('ab') ||
            /\b(abs?|core|obliques?|transverse|vacuum)\b/i.test(muscle)
          );
        }
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

  // Exercise Curve Data Points
  const { trajectoryPoints } = useMemo(() => {
    if (!activeExerciseProfile || activeExerciseProfile.sessions.length < 2) {
      return { trajectoryPoints: [] as ChartDataPoint[] };
    }
    const pts = activeExerciseProfile.sessions;
    const mapped: ChartDataPoint[] = pts.map((p) => {
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
        },
      };
    });
    return { trajectoryPoints: mapped };
  }, [activeExerciseProfile, exerciseChartMetric, unitIsLbs]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleOpenWorkoutSummary = useCallback(
    (dateStr: string) => {
      navigation.navigate('WorkoutSummary', { date: dateStr, readOnly: true });
    },
    [navigation]
  );

  // Surface Tokens (Unified Layer 2 #0F1015 OLED surface)
  const cardBg = isDark ? '#0F1015' : tokens.bg.surface;
  const elevatedBg = tokens.bg.elevated;
  const hairlineColor = tokens.border.subtle;

  // Format Helper for Volume (unit-aware KG / LBS)
  const formatVol = useCallback(
    (kg: number) => formatVolumeParts(kg, unitIsLbs).full,
    [unitIsLbs]
  );
  const lifetimeVolFmt = formatVolumeParts(totalLifetimeVolumeKg, unitIsLbs);
  const weeklyVolFmt = formatVolumeParts(selectedWeekStats.volumeKg, unitIsLbs);

  const formatDuration = (mins: number) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${mins}m`;
  };

  return (
    <ScreenWrapper edges={['top']} compactTop topAura>

      {/* ── Unified Screen Header ── */}
      <TabScreenHeader
        title="Analytics"
        subtitle={`${streak}d streak · ${analyticsData.detailedLogs.length} workouts · ${lifetimeVolFmt.full} lifted`}
      />

      {/* ── Native Gliding Segmented Control: Weekly Report | Consistency | Exercises ── */}
      <View style={{ paddingHorizontal: 12, marginBottom: 10 }}>
        <IOSSegmentedControl
          segments={[
            { id: 'weekly', label: 'Weekly Report' },
            { id: 'consistency', label: 'Consistency' },
            { id: 'exercises', label: 'Exercises' },
          ]}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as AnalyticsSubTab)}
          height={36}
        />
      </View>

      {(() => {
        const activeSubTabIdx =
          activeTab === 'weekly' ? 0 : activeTab === 'consistency' ? 1 : 2;
        return (
          <View style={{ flex: 1 }}>
            {/* PART 1: WEEKLY REPORT (Executive Synthesis & Overload Engine) */}
            <AnimatedSubTabPane index={0} activeIndex={activeSubTabIdx}>
              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── 1. Interactive Week Navigator (Clean Borderless Header Row) ── */}
          <View style={styles.weekNavigatorCard}>
            <TactileButton
              variant="icon"
              haptic="none"
              style={styles.weekNavArrowBtn}
              onPress={() => shiftReportAnchor(-1)}
              hitSlop={TOUCH.hitSlop}
              accessibilityLabel="Previous week"
            >
              <ChevronLeft size={16} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
            </TactileButton>

            <TactileButton
              variant="custom"
              haptic="none"
              style={styles.weekNavCenterBlock}
              disabled={weekRangeInfo.isCurrentWeek}
              onPress={!weekRangeInfo.isCurrentWeek ? resetToCurrentWeek : undefined}
            >
              <View style={styles.weekNavTitleRow}>
                <Calendar size={14} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} style={{ marginRight: SPACE.xs + 2 }} />
                <NumericText style={styles.weekNavTitleText}>
                  {weekRangeInfo.label}
                </NumericText>
                {weekRangeInfo.isCurrentWeek && (
                  <View style={styles.currentWeekTag}>
                    <Text style={styles.currentWeekTagText}>THIS WEEK</Text>
                  </View>
                )}
              </View>
              {!weekRangeInfo.isCurrentWeek && (
                <Text style={styles.weekNavJumpTodayText}>Tap to return to current week</Text>
              )}
            </TactileButton>

            <TactileButton
              variant="icon"
              haptic="none"
              style={[styles.weekNavArrowBtn, !weekRangeInfo.canGoForward && { opacity: 0.3 }]}
              onPress={() => weekRangeInfo.canGoForward && shiftReportAnchor(1)}
              disabled={!weekRangeInfo.canGoForward}
              hitSlop={TOUCH.hitSlop}
              accessibilityLabel="Next week"
            >
              <ChevronRight size={16} color={weekRangeInfo.canGoForward ? tokens.text.primary : tokens.text.muted} strokeWidth={ICON.strokeWidth} />
            </TactileButton>
          </View>

          {/* ── 2. Unified Weekly Executive Card (100% Week-Scoped, Zero Duplication) ── */}
          {hasSelectedWeekSessions && (
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: cardBg,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: hairlineColor,
                },
              ]}
            >
              <View style={styles.heroTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroLabel}>TOTAL VOLUME</Text>
                  <View style={styles.heroValueRow}>
                    <NumericText style={styles.heroVolNum}>
                      {weeklyVolFmt.numStr}
                    </NumericText>
                    <Text style={styles.heroVolUnit}>
                      {weeklyVolFmt.suffix}
                    </Text>
                  </View>
                  {selectedWeekStats.volumeKg === 0 && selectedWeekStats.setsCount > 0 && (
                    <Text style={styles.heroVolSub}>
                      Bodyweight sets logged
                    </Text>
                  )}
                </View>

                <View
                  style={[
                    styles.heroBadge,
                    {
                      backgroundColor:
                        weekScopedSummary.volumeDeltaPct !== null && weekScopedSummary.volumeDeltaPct >= 0
                          ? tokens.status.successDim
                          : tokens.accent.primaryDim,
                    },
                  ]}
                >
                  <TrendingUp
                    size={13}
                    color={
                      weekScopedSummary.volumeDeltaPct !== null && weekScopedSummary.volumeDeltaPct >= 0
                        ? tokens.status.success
                        : tokens.accent.primary
                    }
                    strokeWidth={ICON.strokeWidth}
                  />
                  <NumericText
                    style={[
                      styles.heroBadgeText,
                      {
                        color:
                          weekScopedSummary.volumeDeltaPct !== null && weekScopedSummary.volumeDeltaPct >= 0
                            ? tokens.status.success
                            : tokens.accent.primary,
                      },
                    ]}
                  >
                    {weekScopedSummary.volumeDeltaPct !== null
                      ? `${weekScopedSummary.volumeDeltaPct >= 0 ? '+' : ''}${weekScopedSummary.volumeDeltaPct}% vs last wk`
                      : 'First tracked week'}
                  </NumericText>
                </View>
              </View>

              <View style={styles.heroDivider} />

              <View style={styles.heroStatsGrid}>
                <View style={styles.heroStatCol}>
                  <NumericText style={styles.heroStatVal}>
                    {selectedWeekStats.sessionsCount}/{plannedWeeklySessions}
                  </NumericText>
                  <Text style={styles.heroStatLbl}>SESSIONS</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatCol}>
                  <NumericText style={styles.heroStatVal}>
                    {selectedWeekStats.setsCount}
                  </NumericText>
                  <Text style={styles.heroStatLbl}>SETS</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatCol}>
                  <NumericText style={styles.heroStatVal}>
                    {formatDuration(selectedWeekStats.durationMins)}
                  </NumericText>
                  <Text style={styles.heroStatLbl}>TIME</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatCol}>
                  <NumericText
                    style={[
                      styles.heroStatVal,
                      weekScopedSummary.overloadRatePct !== null && { color: tokens.status.success },
                    ]}
                  >
                    {weekScopedSummary.overloadRatePct !== null
                      ? `${weekScopedSummary.overloadRatePct}%`
                      : '—'}
                  </NumericText>
                  <Text style={styles.heroStatLbl}>PROGRESSED</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── 3. Weekly Load Curve, Muscles Trained, Real Top Lifts, Summary & Cardio ── */}
          {hasSelectedWeekSessions && (
            <WeeklyGymReport
              gymLogs={gymLogs || []}
              weekAnchorDate={reportAnchorDate}
              userGymPlan={userGymPlan}
              scrollable={false}
              hideHeader={true}
              hideEmptyCard={true}
              hideKpiRow={true}
              replayKey={replayKey}
              weekScopedSummary={weekScopedSummary}
              onPressBodyMap={() => navigation.navigate('Body' as any)}
            />
          )}

          {/* ── 4. Workouts Completed This Week (Single Hairline Ledger) ── */}
          {hasSelectedWeekSessions ? (
            <View
              style={[
                styles.weekSessionsCard,
                {
                  backgroundColor: cardBg,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: hairlineColor,
                },
              ]}
            >
              <View style={[styles.cardHeaderRow, { marginBottom: 4 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardSectionLabel}>WORKOUTS THIS WEEK</Text>
                  <NumericText style={styles.cardSubLabel}>
                    {selectedWeekSessions.length} {selectedWeekSessions.length === 1 ? 'workout' : 'workouts'} completed
                  </NumericText>
                </View>
              </View>

              {selectedWeekSessions.map((session, sIdx) => {
                const parts = session.date.slice(0, 10).split('-').map(Number);
                const y = parts[0] || new Date().getFullYear();
                const m = (parts[1] || 1) - 1;
                const d = parts[2] || 1;
                const dt = new Date(y, m, d);
                const dayName = dt.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                const dayNum = String(d).padStart(2, '0');

                const volText = formatVolumeParts(session.totalVolumeKg, unitIsLbs).full;

                const rawMins = session.durationMinutes || 0;
                const saneDuration = rawMins > 180
                  ? Math.min(Math.max((session.totalSets || 0) * 3.5, 20), 90)
                  : rawMins;
                const durationText = saneDuration > 0 ? ` · ${formatDuration(Math.round(saneDuration))}` : '';
                const isLastRow = sIdx === selectedWeekSessions.length - 1;

                return (
                  <TactileButton
                    key={session.id || session.date}
                    variant="custom"
                    haptic="none"
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: TOUCH.minTarget,
                      paddingVertical: 10,
                      borderBottomWidth: isLastRow ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: hairlineColor,
                    }}
                    onPress={() => {
                      hapticLight();
                      handleOpenWorkoutSummary(session.date);
                    }}
                  >
                    <View style={styles.weekSessionDateBadge}>
                      <Text style={styles.weekSessionDateDay}>{dayName}</Text>
                      <NumericText style={styles.weekSessionDateNum}>{dayNum}</NumericText>
                    </View>

                    <View style={[styles.weekSessionMain, { minWidth: 0 }]}>
                      <Text style={styles.weekSessionTitle} numberOfLines={1}>
                        {session.splitTag || 'Workout Session'}
                      </Text>
                      <NumericText style={styles.weekSessionSub} numberOfLines={1}>
                        {session.exercises.length} {session.exercises.length === 1 ? 'exercise' : 'exercises'} · {session.totalSets} sets
                        {durationText}
                      </NumericText>
                    </View>

                    <View style={[styles.weekSessionRight, { flexShrink: 0 }]}>
                      <NumericText style={styles.weekSessionVol}>{volText}</NumericText>
                      <View style={styles.weekSessionDetailsRow}>
                        <Text style={styles.weekSessionDetailsText}>Summary</Text>
                        <ChevronRight size={13} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                      </View>
                    </View>
                  </TactileButton>
                );
              })}
            </View>
          ) : (
            weekRangeInfo.isCurrentWeek ? (
              <View style={[styles.emptyWeekCard, { backgroundColor: cardBg }]}>
                <View style={styles.emptyIconCircle}>
                  <Dumbbell size={24} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                </View>
                <Text style={styles.emptyWeekTitle}>No Workouts Logged Yet</Text>
                <Text style={styles.emptyWeekSub}>
                  Complete and log your training sessions this week to unlock your progressive overload scorecard, muscle heatmap, and weekly volume distribution.
                </Text>
                <TactileButton
                  variant="custom"
                  haptic="none"
                  style={styles.startTodayWorkoutBtn}
                  onPress={() => {
                    hapticMedium();
                    navigation.navigate('Today');
                  }}
                >
                  <Play
                    size={14}
                    color={tokens.accent.onPrimary}
                    strokeWidth={ICON.strokeWidth}
                    style={{ marginRight: SPACE.xs + 2 }}
                  />
                  <Text style={styles.startTodayWorkoutBtnText}>Start Workout</Text>
                </TactileButton>
              </View>
            ) : (
              <View style={[styles.emptyPastWeekCard, { backgroundColor: cardBg }]}>
                <Calendar size={36} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
                <Text style={styles.emptyPastWeekTitle}>No Workouts Recorded</Text>
                <Text style={styles.emptyPastWeekSub}>
                  No training sessions were logged for the week of {weekRangeInfo.label}.
                </Text>
                <TactileButton
                  variant="custom"
                  haptic="none"
                  style={styles.returnCurrentWeekBtn}
                  onPress={resetToCurrentWeek}
                >
                  <ArrowLeft
                    size={14}
                    color={tokens.accent.primary}
                    strokeWidth={ICON.strokeWidth}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.returnCurrentWeekBtnText}>Return to Current Week</Text>
                </TactileButton>
              </View>
            )
          )}

        </ScrollView>
            </AnimatedSubTabPane>

            {/* PART 2: CONSISTENCY & WORKLOAD WAVE */}
            <AnimatedSubTabPane index={1} activeIndex={activeSubTabIdx} lazy={!isHeavyReady}>
              <ConsistencySubTab
                styles={styles}
                tokens={tokens}
                cardBg={cardBg}
                elevatedBg={elevatedBg}
                isHeavyReady={isHeavyReady}
                safeChartWidth={safeChartWidth}
                replayKey={replayKey}
                consistencyStats={consistencyStats}
                heatmapData={heatmapData}
                weeklyTrends={analyticsData.weeklyTrends}
                selectedWeekItem={selectedWeekItem}
                selectedWeekIndex={selectedWeekIndex}
                onSelectWeekIndex={setSelectedWeekIndex}
                plannedWeeklySessions={plannedWeeklySessions}
                cardioSummary={analyticsData.weeklySummary}
                formatVol={formatVol}
              />
            </AnimatedSubTabPane>

            {/* PART 3: EXERCISES TRAJECTORY */}
            <AnimatedSubTabPane index={2} activeIndex={activeSubTabIdx} lazy={!isHeavyReady}>
              <ExercisesSubTab
                styles={styles}
                tokens={tokens}
                cardBg={cardBg}
                elevatedBg={elevatedBg}
                isHeavyReady={isHeavyReady}
                safeChartWidth={safeChartWidth}
                replayKey={replayKey}
                exerciseSearchQuery={exerciseSearchQuery}
                onChangeSearch={setExerciseSearchQuery}
                exCategoryFilter={exCategoryFilter}
                onSelectCategory={setExCategoryFilter}
                filteredExerciseProfiles={filteredExerciseProfiles}
                activeExerciseProfile={activeExerciseProfile}
                onSelectExerciseName={setSelectedExName}
                exerciseChartMetric={exerciseChartMetric}
                onChangeMetric={setExerciseChartMetric}
                selectedDataPointIdx={selectedDataPointIdx}
                onSelectDataPointIdx={setSelectedDataPointIdx}
                trajectoryPoints={trajectoryPoints}
                formatVol={formatVol}
                onGoToToday={() => navigation.navigate('Today')}
              />
            </AnimatedSubTabPane>
          </View>
        );
      })()}
    </ScreenWrapper>
  );
}

