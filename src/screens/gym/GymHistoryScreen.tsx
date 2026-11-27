/**
 * GymHistoryScreen.tsx — ZenFit
 *
 * Tab 3: Analytics Hub (Overhauled Executive Report, Long-Term Consistency & Strength Lab)
 * - Report: Selectable [ Week | Cycle* | 4W | Meso | Custom ] windows, Overload Ring,
 *           Split/Effort/Reps SVG Donuts, Scrubbable Load Trend, MEV-MRV Muscle Target Zones,
 *           In-Context Body Map Sheet, Plateau Alerts & Session-vs-Split Comparison Ledger.
 * - Consistency: [ 8W | 12W | 6M | 1Y | Custom ], Discipline Scorecard + Ring, Interactive
 *           Vol/Sets/Time Heatmap with Open Log action, Workload/Freq/Cardio Trends, Weekday Rhythm.
 * - Exercises: Anchor Big-3 & Recent PR Drawer, Searchable Exercise Picker Sheet,
 *           Scoped Curves + PR Milestone Stars + Trendline, Rep-Max PR Matrix + Stimulus Donut,
 *           and Range-Filtered Interactive Set Diary.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  DeviceEventEmitter,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Dumbbell,
  Play,
  Share2,
  TrendingUp,
  X,
} from 'lucide-react-native';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { AnimatedSubTabPane } from '../../components/ui/AnimatedSubTabPane';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { TabScreenHeader } from '../../components/ui/TabScreenHeader';
import { TactileButton } from '../../components/ui/TactileButton';
import { NumericText } from '../../components/ui/NumericText';
import { IOSSegmentedControl } from '../../components/ui/IOSSegmentedControl';
import { AdherenceRingGauge } from '../../components/ui/AnimatedSvgDonutChart';
import BottomSheet from '../../components/ui/BottomSheet';
import { LazySheet } from '../../hooks/useLazySheetMount';
import { useScreenReplayTrigger } from '../../hooks/useScreenReplayTrigger';

import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH } from '../../theme/tokens';
import { useResponsiveMetrics } from '../../theme/responsive';
import { useGymLogs, useGymPlan } from '../../contexts/domains/WellnessContext';
import { useTheme } from '../../contexts/ThemeContext';
import { GymNavigationParamList } from '../../types/gym.types';
import { dateStrOffset, todayStr } from '../../hooks/useGymLog';
import { calculateGymStreak, isValidWorkoutSession } from '../../utils/gymUtils';
import { formatVolumeParts, useWeightUnit } from '../../utils/weightUnit';
import {
  AnalyticsDateRange,
  AnalyticsRangePreset,
  UnifiedAnalyticsData,
  buildAnalyticsDateRange,
  computePeriodScopedSummary,
  computeScopedConsistency,
  computeUnifiedAnalytics,
} from '../../services/gymAnalyticsEngine';

import WeeklyGymReport from '../../components/Gym/metrics/WeeklyGymReport';
import AnalyticsRangeSheet from '../../components/Gym/metrics/AnalyticsRangeSheet';
import AnalyticsRangeStrip, { RangeStripOption } from '../../components/Gym/metrics/AnalyticsRangeStrip';
import AnatomicalBodyMapCard from '../../components/Gym/metrics/AnatomicalBodyMapCard';
import { HeatmapDayDetail } from '../../components/Gym/Charts/ConsistencyHeatmap';
import { makeHistoryStyles } from './history/gymHistoryStyles';
import ConsistencySubTab from './history/ConsistencySubTab';
import ExercisesSubTab, { ExerciseChartMetric, ExerciseHorizon } from './history/ExercisesSubTab';

const ExerciseDeepDiveModal = React.lazy(
  () => import('../../components/Gym/exercise/ExerciseDeepDiveModal')
);

type AnalyticsSubTab = 'weekly' | 'consistency' | 'exercises';

export default function GymHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
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

  // Defer heavy SVG charts and heatmap mounts by 1 frame so shell/header paint in Frame 0
  const [isHeavyReady, setIsHeavyReady] = useState(false);
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setIsHeavyReady(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  // ── Navigation & Sub-Tab State ─────────────────────────────────────────────
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

  // ── Master Analytics Engine Data ───────────────────────────────────────────
  const analyticsData: UnifiedAnalyticsData = useMemo(() => {
    return computeUnifiedAnalytics(gymLogs || [], userGymPlan);
  }, [gymLogs, userGymPlan, unitIsLbs]);

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

  const workoutDatesSet = useMemo(() => {
    const set = new Set<string>();
    (gymLogs || []).forEach(l => {
      if (l?.date && isValidWorkoutSession(l)) {
        set.add(String(l.date).slice(0, 10));
      }
    });
    return set;
  }, [gymLogs]);

  const detailedLogsMap = useMemo(() => {
    const map = new Map<string, HeatmapDayDetail>();
    analyticsData.detailedLogs.forEach(s => {
      const ds = s.date.slice(0, 10);
      map.set(ds, {
        splitTag: s.splitTag,
        durationMins: s.durationMinutes,
        setsCount: s.totalSets,
        volumeKg: s.totalVolumeKg,
      });
    });
    return map;
  }, [analyticsData.detailedLogs]);

  // ── Time Range State across Sub-Tabs ───────────────────────────────────────
  const isRotationPlan = userGymPlan?.scheduleMode === 'rotation';
  const hasActiveProgramme = Boolean(userGymPlan?.activeProgramme?.status === 'active');

  const [reportPreset, setReportPreset] = useState<AnalyticsRangePreset>('1w');
  const [reportAnchorDate, setReportAnchorDate] = useState<string>(() => todayStr());
  const [cycleOffset, setCycleOffset] = useState(0);
  const [reportCustomDates, setReportCustomDates] = useState<{ start: string; end: string } | null>(null);

  const [consistencyPreset, setConsistencyPreset] = useState<AnalyticsRangePreset>('8w');
  const [consistencyCustomDates, setConsistencyCustomDates] = useState<{ start: string; end: string } | null>(null);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);

  const [exerciseHorizon, setExerciseHorizon] = useState<ExerciseHorizon>('8s');
  const [customExerciseRange, setCustomExerciseRange] = useState<AnalyticsDateRange | null>(null);

  const [rangeSheetTarget, setRangeSheetTarget] = useState<'report' | 'consistency' | 'exercises' | null>(null);
  const [bodyMapSheetVisible, setBodyMapSheetVisible] = useState(false);
  const [deepDiveModal, setDeepDiveModal] = useState<{ name: string; tab: 'guide' | 'analytics' } | null>(null);

  const reportRange = useMemo(
    () =>
      buildAnalyticsDateRange(reportPreset, {
        anchorDate: reportAnchorDate,
        cycleOffset,
        customStart: reportCustomDates?.start,
        customEnd: reportCustomDates?.end,
        userGymPlan,
        gymLogs: gymLogs || [],
      }),
    [reportPreset, reportAnchorDate, cycleOffset, reportCustomDates, userGymPlan, gymLogs]
  );

  const reportOptions = useMemo<RangeStripOption[]>(() => {
    const opts: RangeStripOption[] = [{ id: '1w', label: 'Week' }];
    if (isRotationPlan) opts.push({ id: 'cycle', label: 'Cycle' });
    opts.push({ id: '4w', label: '4W' });
    if (hasActiveProgramme) opts.push({ id: 'meso', label: 'Meso' });
    return opts;
  }, [isRotationPlan, hasActiveProgramme]);

  // ── Stable Navigation & Filter Callbacks (Preserve React.memo across panes) ─
  const handleSelectReportPreset = useCallback((preset: AnalyticsRangePreset) => {
    setReportPreset(preset);
    if (preset === '1w') setReportAnchorDate(todayStr());
    if (preset === 'cycle') setCycleOffset(0);
  }, []);

  const handleOpenReportRangeSheet = useCallback(() => setRangeSheetTarget('report'), []);
  const handleOpenConsistencyRangeSheet = useCallback(() => setRangeSheetTarget('consistency'), []);
  const handleOpenExerciseRangeSheet = useCallback(() => setRangeSheetTarget('exercises'), []);
  const handleOpenBodyMap = useCallback(() => setBodyMapSheetVisible(true), []);
  const handleCloseBodyMap = useCallback(() => setBodyMapSheetVisible(false), []);
  const handleCloseRangeSheet = useCallback(() => setRangeSheetTarget(null), []);
  const handleCloseDeepDive = useCallback(() => setDeepDiveModal(null), []);

  const handleSelectConsistencyPreset = useCallback((p: AnalyticsRangePreset) => {
    setConsistencyPreset(p);
    setSelectedWeekIndex(null);
  }, []);

  const handleOpenDeepDive = useCallback((name: string, tab: 'guide' | 'analytics') => {
    setDeepDiveModal({ name, tab });
  }, []);

  const handleGoToToday = useCallback(() => {
    navigation.navigate('Today');
  }, [navigation]);

  const handleSelectSegment = useCallback((id: string) => {
    setActiveTab(id as AnalyticsSubTab);
  }, []);

  const handleApplySheetPreset = useCallback(
    (preset: AnalyticsRangePreset) => {
      if (rangeSheetTarget === 'consistency') {
        setConsistencyPreset(preset);
        setSelectedWeekIndex(null);
      } else if (rangeSheetTarget === 'exercises') {
        if (preset === '4w' || preset === '1w') setExerciseHorizon('1m');
        else if (preset === '12w' || preset === '8w') setExerciseHorizon('3m');
        else if (preset === '6m') setExerciseHorizon('6m');
        else setExerciseHorizon('all');
        setSelectedDataPointIdx(null);
      } else {
        setReportPreset(preset);
        if (preset === '1w') setReportAnchorDate(todayStr());
        if (preset === 'cycle') setCycleOffset(0);
      }
    },
    [rangeSheetTarget]
  );

  const handleApplySheetCustomRange = useCallback(
    (start: string, end: string) => {
      if (rangeSheetTarget === 'consistency') {
        setConsistencyCustomDates({ start, end });
        setConsistencyPreset('custom');
        setSelectedWeekIndex(null);
      } else if (rangeSheetTarget === 'exercises') {
        const custom = buildAnalyticsDateRange('custom', { customStart: start, customEnd: end });
        setCustomExerciseRange(custom);
        setExerciseHorizon('custom');
        setSelectedDataPointIdx(null);
      } else {
        setReportCustomDates({ start, end });
        setReportPreset('custom');
      }
    },
    [rangeSheetTarget]
  );

  const handleStepReportPeriod = useCallback(
    (delta: -1 | 1) => {
      if (reportPreset === 'cycle') {
        setCycleOffset(prev => Math.max(0, prev - delta));
        return;
      }
      setReportAnchorDate(prev => dateStrOffset(delta * 7, prev));
    },
    [reportPreset]
  );

  const resetReportCurrent = useCallback(() => {
    hapticLight();
    setCycleOffset(0);
    setReportAnchorDate(todayStr());
  }, []);

  const reportSummary = useMemo(
    () => computePeriodScopedSummary(gymLogs || [], analyticsData, reportRange, userGymPlan),
    [gymLogs, analyticsData, reportRange, userGymPlan]
  );

  const reportPeriodLogs = useMemo(
    () =>
      (gymLogs || []).filter(l => {
        const ds = l?.date ? String(l.date).slice(0, 10) : '';
        return Boolean(ds && ds >= reportRange.startDate && ds <= reportRange.endDate);
      }),
    [gymLogs, reportRange.startDate, reportRange.endDate]
  );

  const hasReportSessions =
    reportSummary.sessionsCount > 0 || reportSummary.cardio.sessions > 0;

  // Consistency summary scoped cleanly
  const consistencyRange = useMemo(
    () =>
      buildAnalyticsDateRange(consistencyPreset, {
        customStart: consistencyCustomDates?.start,
        customEnd: consistencyCustomDates?.end,
        userGymPlan,
        gymLogs: gymLogs || [],
      }),
    [consistencyPreset, consistencyCustomDates, userGymPlan, gymLogs]
  );

  const consistencySummary = useMemo(
    () => computeScopedConsistency(analyticsData, gymLogs || [], consistencyRange, userGymPlan),
    [analyticsData, gymLogs, consistencyRange, userGymPlan]
  );

  // Exercises filters & active selection
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [exCategoryFilter, setExCategoryFilter] = useState<'All' | 'Push' | 'Pull' | 'Legs' | 'Arms' | 'Core'>('All');
  const [selectedExName, setSelectedExName] = useState<string | null>(null);
  const [exerciseChartMetric, setExerciseChartMetric] = useState<ExerciseChartMetric>('1rm');
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

  const activeExerciseProfile = useMemo(() => {
    if (selectedExName) {
      const found = analyticsData.exerciseProfiles.find(p => p.name === selectedExName);
      if (found) return found;
    }
    return filteredExerciseProfiles[0] || null;
  }, [analyticsData.exerciseProfiles, filteredExerciseProfiles, selectedExName]);

  // ── Actions & Sharing ──────────────────────────────────────────────────────
  const handleOpenWorkoutSummary = useCallback(
    (dateStr: string) => {
      navigation.navigate('WorkoutSummary', { date: dateStr, readOnly: true });
    },
    [navigation]
  );

  const handleInspectWeekInReport = useCallback((mondayStr: string) => {
    hapticLight();
    setReportPreset('1w');
    setReportAnchorDate(mondayStr);
    setActiveTab('weekly');
  }, []);

  const formatVol = useCallback(
    (kg: number) => formatVolumeParts(kg, unitIsLbs).full,
    [unitIsLbs]
  );
  const lifetimeVolFmt = formatVolumeParts(totalLifetimeVolumeKg, unitIsLbs);
  const reportVolFmt = formatVolumeParts(reportSummary.volumeKg, unitIsLbs);

  const formatDuration = (mins: number) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${mins}m`;
  };

  const handleShareAnalytics = useCallback(async () => {
    try {
      hapticLight();
      if (activeTab === 'consistency') {
        const msg =
          `⚡ ZenFit Consistency (${consistencyRange.label})\n` +
          `🔥 Streak: ${consistencySummary.streakDays}d (Best: ${consistencySummary.longestStreakDays}d)\n` +
          `✅ Adherence: ${consistencySummary.adherenceRatePct}% · ${consistencySummary.avgWorkoutsPerWeek} workouts/wk\n` +
          `🗓 Weeks On Target: ${consistencySummary.weeksOnTargetCount}/${consistencySummary.totalWeeksCount}`;
        await Share.share({ message: msg, title: 'ZenFit Consistency' });
      } else {
        const prLine = reportSummary.topLifts
          .slice(0, 3)
          .map(l => `• ${l.exerciseName}${l.prLabel ? ` (${l.prLabel})` : ''}`)
          .join('\n');
        const msg =
          `📊 ZenFit Report — ${reportRange.label}\n` +
          `🏋️ Volume: ${reportVolFmt.full}${reportSummary.volumeDeltaPct !== null ? ` (${reportSummary.volumeDeltaPct >= 0 ? '+' : ''}${reportSummary.volumeDeltaPct}%)` : ''}\n` +
          `⏱ Sessions: ${reportSummary.sessionsCount}/${reportSummary.plannedSessionsInPeriod} · ${reportSummary.setsCount} sets · ${formatDuration(reportSummary.durationMins)}\n` +
          (prLine ? `\nTop Lifts:\n${prLine}` : '');
        await Share.share({ message: msg, title: 'ZenFit Training Report' });
      }
    } catch {}
  }, [activeTab, consistencyRange.label, consistencySummary, reportRange.label, reportVolFmt.full, reportSummary]);

  const cardBg = isDark ? '#0F1015' : tokens.bg.surface;
  const elevatedBg = tokens.bg.elevated;
  const hairlineColor = tokens.border.subtle;

  const activeRangeSheetData = useMemo(() => {
    if (rangeSheetTarget === 'consistency') {
      return {
        preset: consistencyRange.preset,
        start: consistencyRange.startDate,
        end: consistencyRange.endDate,
      };
    }
    if (rangeSheetTarget === 'exercises') {
      const presetMap =
        exerciseHorizon === '1m'
          ? '4w'
          : exerciseHorizon === '3m'
          ? '12w'
          : exerciseHorizon === '6m'
          ? '6m'
          : exerciseHorizon === 'custom'
          ? 'custom'
          : 'all';
      const r =
        exerciseHorizon === 'custom' && customExerciseRange
          ? customExerciseRange
          : buildAnalyticsDateRange(presetMap, { userGymPlan, gymLogs: gymLogs || [] });
      return {
        preset: presetMap as AnalyticsRangePreset,
        start: r.startDate,
        end: r.endDate,
      };
    }
    return {
      preset: reportRange.preset,
      start: reportRange.startDate,
      end: reportRange.endDate,
    };
  }, [rangeSheetTarget, consistencyRange, customExerciseRange, exerciseHorizon, reportRange, userGymPlan, gymLogs]);

  const headerSubtitle = useMemo(() => {
    if (activeTab === 'consistency') {
      return `${consistencyRange.label} · ${consistencySummary.streakDays}d streak (Best ${consistencySummary.longestStreakDays}d) · ${consistencySummary.avgWorkoutsPerWeek}/wk`;
    }
    if (activeTab === 'exercises') {
      const horizonTitle =
        exerciseHorizon === '8s'
          ? 'Last 8 sessions'
          : exerciseHorizon === '1m'
          ? 'Last 1 month'
          : exerciseHorizon === '3m'
          ? 'Last 3 months'
          : exerciseHorizon === '6m'
          ? 'Last 6 months'
          : exerciseHorizon === 'custom' && customExerciseRange
          ? customExerciseRange.label
          : 'All time';
      return `${horizonTitle} · ${analyticsData.exerciseProfiles.length} tracked lifts · ${streak}d streak`;
    }
    return `${reportRange.label} · ${reportSummary.sessionsCount} workouts · ${reportVolFmt.full} lifted`;
  }, [
    activeTab,
    consistencyRange.label,
    consistencySummary.streakDays,
    consistencySummary.longestStreakDays,
    consistencySummary.avgWorkoutsPerWeek,
    exerciseHorizon,
    customExerciseRange,
    analyticsData.exerciseProfiles.length,
    streak,
    reportRange.label,
    reportSummary.sessionsCount,
    reportVolFmt.full,
  ]);

  return (
    <ScreenWrapper edges={['top']} compactTop topAura>
      {/* ── Unified Header with Share/Export Action ── */}
      <TabScreenHeader
        title="Analytics"
        subtitle={headerSubtitle}
        rightActions={
          <TactileButton
            variant="icon"
            haptic="light"
            onPress={handleShareAnalytics}
            hitSlop={TOUCH.hitSlop}
            style={{
              width: 32,
              height: 32,
              borderRadius: RADIUS.inner,
              backgroundColor: cardBg,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: hairlineColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityLabel="Share analytics summary"
          >
            <Share2 size={15} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
          </TactileButton>
        }
      />

      {/* ── Sub-Tab Segmented Control: Report | Consistency | Exercises ── */}
      <View style={{ paddingHorizontal: 12, marginBottom: 10 }}>
        <IOSSegmentedControl
          segments={[
            { id: 'weekly', label: 'Report' },
            { id: 'consistency', label: 'Consistency' },
            { id: 'exercises', label: 'Exercises' },
          ]}
          activeId={activeTab}
          onSelect={handleSelectSegment}
          height={36}
        />
      </View>

      {(() => {
        const activeSubTabIdx =
          activeTab === 'weekly' ? 0 : activeTab === 'consistency' ? 1 : 2;
        return (
          <View style={{ flex: 1 }}>
            {/* PART 1: REPORT (Flexible Range Executive Synthesis, Donuts, Muscle Zones & Session Diff) */}
            <AnimatedSubTabPane index={0} activeIndex={activeSubTabIdx}>
              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* ── 1. Multi-Preset & Custom Range Strip ── */}
                <View style={{ paddingHorizontal: 2 }}>
                  <AnalyticsRangeStrip
                    options={reportOptions}
                    range={reportRange}
                    onSelectPreset={handleSelectReportPreset}
                    onOpenCustomSheet={handleOpenReportRangeSheet}
                    onStepPeriod={handleStepReportPeriod}
                    onResetCurrent={resetReportCurrent}
                  />
                </View>

                {/* ── 2. Executive Hero Card (With Radial Overload Ring & Progression Pulse) ── */}
                {hasReportSessions && (
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
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.heroLabel}>
                          {reportRange.daySpan <= 8 ? 'WEEKLY VOLUME' : `VOLUME · ${reportRange.label.toUpperCase()}`}
                        </Text>
                        <View style={styles.heroValueRow}>
                          <NumericText style={styles.heroVolNum}>{reportVolFmt.numStr}</NumericText>
                          <Text style={styles.heroVolUnit}>{reportVolFmt.suffix}</Text>
                        </View>
                        {reportSummary.volumeKg === 0 && reportSummary.setsCount > 0 ? (
                          <Text style={styles.heroVolSub}>Bodyweight sets logged</Text>
                        ) : (
                          <View
                            style={[
                              styles.heroBadge,
                              {
                                alignSelf: 'flex-start',
                                marginTop: 6,
                                backgroundColor:
                                  reportSummary.volumeDeltaPct !== null && reportSummary.volumeDeltaPct >= 0
                                    ? tokens.status.successDim
                                    : tokens.accent.primaryDim,
                              },
                            ]}
                          >
                            <TrendingUp
                              size={12}
                              color={
                                reportSummary.volumeDeltaPct !== null && reportSummary.volumeDeltaPct >= 0
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
                                    reportSummary.volumeDeltaPct !== null && reportSummary.volumeDeltaPct >= 0
                                      ? tokens.status.success
                                      : tokens.accent.primary,
                                },
                              ]}
                            >
                              {reportSummary.volumeDeltaPct !== null
                                ? `${reportSummary.volumeDeltaPct >= 0 ? '+' : ''}${reportSummary.volumeDeltaPct}% vs ${
                                    reportRange.daySpan <= 8 ? 'prior wk' : 'prior'
                                  }`
                                : 'First tracked window'}
                            </NumericText>
                          </View>
                        )}
                      </View>

                      <AdherenceRingGauge
                        pct={
                          reportSummary.overloadRatePct !== null
                            ? reportSummary.overloadRatePct
                            : Math.min(
                                100,
                                Math.round(
                                  (reportSummary.sessionsCount / Math.max(1, reportSummary.plannedSessionsInPeriod)) *
                                    100
                                )
                              )
                        }
                        size={64}
                        strokeWidth={6}
                        label={reportSummary.overloadRatePct !== null ? 'OVERLOAD' : 'GOAL'}
                        replayKey={replayKey}
                      />
                    </View>

                    <View style={styles.heroDivider} />

                    <View style={styles.heroStatsGrid}>
                      <View style={styles.heroStatCol}>
                        <NumericText style={styles.heroStatVal}>
                          {reportSummary.sessionsCount}/{reportSummary.plannedSessionsInPeriod}
                        </NumericText>
                        <Text style={styles.heroStatLbl}>SESSIONS</Text>
                      </View>
                      <View style={styles.heroStatDivider} />
                      <View style={styles.heroStatCol}>
                        <NumericText style={styles.heroStatVal}>{reportSummary.setsCount}</NumericText>
                        <Text style={styles.heroStatLbl}>SETS</Text>
                      </View>
                      <View style={styles.heroStatDivider} />
                      <View style={styles.heroStatCol}>
                        <NumericText style={styles.heroStatVal}>
                          {formatDuration(reportSummary.durationMins)}
                        </NumericText>
                        <Text style={styles.heroStatLbl}>TIME</Text>
                      </View>
                      <View style={styles.heroStatDivider} />
                      <View style={styles.heroStatCol}>
                        <NumericText
                          style={[
                            styles.heroStatVal,
                            reportSummary.overloadRatePct !== null && { color: tokens.status.success },
                          ]}
                        >
                          {reportSummary.overloadRatePct !== null ? `${reportSummary.overloadRatePct}%` : '—'}
                        </NumericText>
                        <Text style={styles.heroStatLbl}>PROGRESSED</Text>
                      </View>
                    </View>

                    {/* Progression Pulse Strip (Real Weight Unlocks, Rep Gains & Plateaus) */}
                    {(reportSummary.weightUnlocks > 0 ||
                      reportSummary.repBuilds > 0 ||
                      reportSummary.plateaus > 0) && (
                      <View style={localStyles.pulseRow}>
                        {reportSummary.weightUnlocks > 0 && (
                          <View style={[localStyles.pulseChip, { backgroundColor: tokens.status.goldDim }]}>
                            <NumericText style={[localStyles.pulseText, { color: tokens.status.gold }]}>
                              {reportSummary.weightUnlocks} Load {reportSummary.weightUnlocks === 1 ? 'Jump' : 'Jumps'}
                            </NumericText>
                          </View>
                        )}
                        {reportSummary.repBuilds > 0 && (
                          <View style={[localStyles.pulseChip, { backgroundColor: tokens.status.successDim }]}>
                            <NumericText style={[localStyles.pulseText, { color: tokens.status.success }]}>
                              {reportSummary.repBuilds} Rep {reportSummary.repBuilds === 1 ? 'Gain' : 'Gains'}
                            </NumericText>
                          </View>
                        )}
                        {reportSummary.plateaus > 0 && (
                          <View style={[localStyles.pulseChip, { backgroundColor: tokens.status.warningDim }]}>
                            <NumericText style={[localStyles.pulseText, { color: tokens.status.warning }]}>
                              {reportSummary.plateaus} Flat
                            </NumericText>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* ── 3. Split/Effort Donuts, Scrubbable Load Trend, MEV-MRV Muscles, Top Lifts & Cardio ── */}
                {hasReportSessions && (
                  <WeeklyGymReport
                    gymLogs={gymLogs || []}
                    weekAnchorDate={reportRange.endDate}
                    userGymPlan={userGymPlan}
                    scrollable={false}
                    hideHeader={true}
                    hideEmptyCard={true}
                    hideKpiRow={true}
                    replayKey={replayKey}
                    periodSummary={reportSummary}
                    onPressBodyMap={handleOpenBodyMap}
                  />
                )}

                {/* ── 4. Completed Workouts Ledger (With Split Comparison Delta) ── */}
                {hasReportSessions ? (
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
                        <Text style={styles.cardSectionLabel}>
                          {reportRange.daySpan <= 8 ? 'WORKOUTS THIS WEEK' : 'SESSIONS IN RANGE'}
                        </Text>
                        <NumericText style={styles.cardSubLabel}>
                          {reportSummary.sessionsWithDelta.length}{' '}
                          {reportSummary.sessionsWithDelta.length === 1 ? 'workout' : 'workouts'} · compared vs previous same split
                        </NumericText>
                      </View>
                    </View>

                    {reportSummary.sessionsWithDelta.map(({ session, vsPrevSameSplitPct }, sIdx) => {
                      const parts = session.date.slice(0, 10).split('-').map(Number);
                      const dt = new Date(parts[0] || 2026, (parts[1] || 1) - 1, parts[2] || 1);
                      const dayName = dt.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                      const dayNum = String(parts[2] || 1).padStart(2, '0');

                      const volText = formatVolumeParts(session.totalVolumeKg, unitIsLbs).full;
                      const rawMins = session.durationMinutes || 0;
                      const saneDuration =
                        rawMins > 180
                          ? Math.min(Math.max((session.totalSets || 0) * 3.5, 20), 90)
                          : rawMins;
                      const durationText = saneDuration > 0 ? ` · ${formatDuration(Math.round(saneDuration))}` : '';
                      const isLastRow = sIdx === reportSummary.sessionsWithDelta.length - 1;

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
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.weekSessionTitle} numberOfLines={1}>
                                {session.splitTag || 'Workout Session'}
                              </Text>
                              {vsPrevSameSplitPct !== null && (
                                <NumericText
                                  style={{
                                    fontSize: 10,
                                    fontFamily: FONT_FAMILY.bold,
                                    color:
                                      vsPrevSameSplitPct >= 0
                                        ? tokens.status.success
                                        : tokens.status.warning,
                                  }}
                                >
                                  {vsPrevSameSplitPct >= 0 ? '+' : ''}
                                  {vsPrevSameSplitPct}%
                                </NumericText>
                              )}
                            </View>
                            <NumericText style={styles.weekSessionSub} numberOfLines={1}>
                              {session.exercises.length} {session.exercises.length === 1 ? 'ex' : 'ex'} · {session.totalSets} sets
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
                ) : reportRange.isCurrentWeek ? (
                  <View style={[styles.emptyWeekCard, { backgroundColor: cardBg }]}>
                    <View style={styles.emptyIconCircle}>
                      <Dumbbell size={24} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                    </View>
                    <Text style={styles.emptyWeekTitle}>No Workouts Logged Yet</Text>
                    <Text style={styles.emptyWeekSub}>
                      Complete a workout this week to unlock split donuts, MEV–MRV muscle zones, and progressive overload tracking.
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
                      No training sessions were logged between {reportRange.label}.
                    </Text>
                    <TactileButton
                      variant="custom"
                      haptic="none"
                      style={styles.returnCurrentWeekBtn}
                      onPress={() => {
                        setReportPreset('1w');
                        resetReportCurrent();
                      }}
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
                )}
              </ScrollView>
            </AnimatedSubTabPane>

            {/* PART 2: CONSISTENCY & DISCIPLINE */}
            <AnimatedSubTabPane index={1} activeIndex={activeSubTabIdx} lazy={!isHeavyReady}>
              <ConsistencySubTab
                styles={styles}
                tokens={tokens}
                cardBg={cardBg}
                elevatedBg={elevatedBg}
                isHeavyReady={isHeavyReady}
                safeChartWidth={safeChartWidth}
                replayKey={replayKey}
                range={consistencyRange}
                onSelectRangePreset={handleSelectConsistencyPreset}
                onOpenCustomSheet={handleOpenConsistencyRangeSheet}
                consistency={consistencySummary}
                heatmapData={heatmapData}
                detailedLogsMap={detailedLogsMap}
                selectedWeekIndex={selectedWeekIndex}
                onSelectWeekIndex={setSelectedWeekIndex}
                onInspectWeekInReport={handleInspectWeekInReport}
                onOpenDateSummary={handleOpenWorkoutSummary}
                formatVol={formatVol}
              />
            </AnimatedSubTabPane>

            {/* PART 3: EXERCISES STRENGTH LAB */}
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
                allExerciseProfiles={analyticsData.exerciseProfiles}
                allExercisePRs={analyticsData.allExercisePRs}
                anchorLifts={analyticsData.anchorLifts}
                recentPRs={analyticsData.recentPRs}
                activeExerciseProfile={activeExerciseProfile}
                onSelectExerciseName={setSelectedExName}
                exerciseChartMetric={exerciseChartMetric}
                onChangeMetric={setExerciseChartMetric}
                selectedDataPointIdx={selectedDataPointIdx}
                onSelectDataPointIdx={setSelectedDataPointIdx}
                horizon={exerciseHorizon}
                customExerciseRange={customExerciseRange}
                onSelectHorizon={setExerciseHorizon}
                onOpenCustomSheet={handleOpenExerciseRangeSheet}
                onOpenDeepDive={handleOpenDeepDive}
                onOpenWorkoutSummary={handleOpenWorkoutSummary}
                formatVol={formatVol}
                onGoToToday={handleGoToToday}
              />
            </AnimatedSubTabPane>
          </View>
        );
      })()}

      {/* ── Unified Custom Date Range BottomSheet (Lazy-mounted when opened) ── */}
      <LazySheet
        visible={Boolean(rangeSheetTarget)}
        render={() => (
          <AnalyticsRangeSheet
            visible={Boolean(rangeSheetTarget)}
            onClose={handleCloseRangeSheet}
            activePreset={activeRangeSheetData.preset}
            startDate={activeRangeSheetData.start}
            endDate={activeRangeSheetData.end}
            workoutDates={workoutDatesSet}
            showCycleOption={isRotationPlan}
            hasActiveProgramme={hasActiveProgramme}
            mode={rangeSheetTarget || 'report'}
            onApplyPreset={handleApplySheetPreset}
            onApplyCustomRange={handleApplySheetCustomRange}
          />
        )}
      />

      {/* ── In-Context Anatomical Body Map Modal (Scoped & Lazy-mounted) ── */}
      <LazySheet
        visible={bodyMapSheetVisible}
        render={() => (
          <BottomSheet
            visible={bodyMapSheetVisible}
            onClose={handleCloseBodyMap}
            fullHeight={true}
            noPadding={true}
            sheetBackgroundColor={isDark ? '#0B0C10' : '#F8F8FA'}
          >
            <View style={{ flex: 1, paddingBottom: Math.max(insets.bottom, SPACE.lg) }}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Anatomical Muscle Map</Text>
                  <NumericText style={styles.modalSubtitle}>
                    {reportRange.label} · {reportPeriodLogs.length} workouts
                  </NumericText>
                </View>
                <TactileButton
                  variant="custom"
                  onPress={handleCloseBodyMap}
                  style={styles.modalCloseBtn}
                  hitSlop={TOUCH.hitSlop}
                  accessibilityLabel="Close anatomical body map"
                >
                  <X size={18} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
                </TactileButton>
              </View>
              <ScrollView contentContainerStyle={{ padding: SPACE.md, paddingBottom: SPACE.xl }} showsVerticalScrollIndicator={false}>
                <AnatomicalBodyMapCard
                  gymLogs={gymLogs || []}
                  weekAnchorDate={reportRange.endDate}
                  timeWindowDays={
                    reportRange.daySpan <= 10
                      ? 7
                      : reportRange.daySpan <= 35
                      ? 30
                      : reportRange.daySpan <= 100
                      ? 90
                      : 365
                  }
                  variant="analytics"
                  defaultMode="volume"
                />
              </ScrollView>
            </View>
          </BottomSheet>
        )}
      />

      {/* ── Exercise Deep Dive Modal (Guide / Plateau Inspection) ── */}
      <LazySheet
        visible={Boolean(deepDiveModal)}
        render={() => (
          <ExerciseDeepDiveModal
            visible={Boolean(deepDiveModal)}
            exerciseName={deepDiveModal?.name || null}
            gymLogs={gymLogs || []}
            initialTab={deepDiveModal?.tab || 'analytics'}
            onClose={handleCloseDeepDive}
          />
        )}
      />
    </ScreenWrapper>
  );
}

const localStyles = StyleSheet.create({
  pulseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  pulseChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pulseText: {
    fontSize: 10.5,
    fontFamily: FONT_FAMILY.bold,
  },
});
