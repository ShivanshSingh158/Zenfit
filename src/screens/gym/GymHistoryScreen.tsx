import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop, Path, Line, G } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';

import { GymNavigationParamList } from '../../types/gym.types';
import { springs } from '../../theme/motion';
import { useWellnessData } from '../../contexts/domains/WellnessContext';
import { calculateGymStreak, resolveExerciseTargetMuscle, normalizeExerciseKey } from '../../utils/gymUtils';
import { computeOrGetHotCache, generateDatasetFingerprint } from '../../utils/hotCacheStore';
import { useTheme } from '../../contexts/ThemeContext';
import { FONT_FAMILY, SPACE, RADIUS } from '../../theme/tokens';
import { hapticLight } from '../../utils/haptics';
import { todayStr, dateStrOffset } from '../../hooks/useGymLog';
import { estimate1RM, calculateRepMaxTable } from '../../services/oneRepMaxEngine';
import { calculateEffortSummary } from '../../services/effortEngine';

import { makeGymHistoryStyles } from './gymHistoryStyles';
import { makeGymProgressStyles } from './gymProgressStyles';
import GymHeatmapCard, { HeatmapDay } from '../../components/Gym/GymHeatmapCard';
import PRHallOfFameSheet from '../../components/Gym/PRHallOfFameSheet';
import { VolumeBarChart } from '../../components/Gym/Charts/VolumeBarChart';
import { PRFeed } from '../../components/Gym/Charts/PRFeed';
import MuscleDonutChart from '../../components/Gym/Charts/MuscleDonutChart';
import EffortDistributionCard from '../../components/Gym/Charts/EffortDistributionCard';
import WeeklyGymReport from '../../components/Gym/WeeklyGymReport';

const WEEKS = 13;
const DAYS_PER_WEEK = 7;
const CHART_HEIGHT = 160;
const PADDING = 18;

type AnalyticsSegment = 'logs' | 'strength' | 'recap';
type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';
type ExCurveMode = '1rm' | 'top' | 'effort';

function generateSmoothSvgPath(coords: Array<{ x: number; y: number }>): string {
  if (coords.length === 0) return '';
  let path = `M ${coords[0].x},${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const xMid = (coords[i].x + coords[i + 1].x) / 2;
    path += ` C ${xMid},${coords[i].y} ${xMid},${coords[i + 1].y} ${coords[i + 1].x},${coords[i + 1].y}`;
  }
  return path;
}

export default function GymHistoryScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeGymHistoryStyles(colors, isDark), [colors, isDark]);
  const progStyles = useMemo(() => makeGymProgressStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<NativeStackNavigationProp<GymNavigationParamList>>();
  const { width } = useWindowDimensions();
  const CHART_WIDTH = width - 48;

  const { gymLogs, userGymPlan } = useWellnessData();

  // ── Top-Level Segment Controller ───────────────────────────────────────────
  const [activeSegment, setActiveSegment] = useState<AnalyticsSegment>('logs');

  // Streak
  const streak = useMemo(() => calculateGymStreak(gymLogs, userGymPlan), [gymLogs, userGymPlan]);
  const streakScale = useSharedValue(0.7);
  const streakOpacity = useSharedValue(0);

  useEffect(() => {
    streakOpacity.value = withDelay(100, withSpring(1, springs.gentle));
    streakScale.value = withDelay(100, withSequence(
      withSpring(1.08, springs.bouncy),
      withSpring(1, springs.snappy)
    ));
  }, []);

  const streakStyle = useAnimatedStyle(() => ({
    transform: [{ scale: streakScale.value }],
    opacity: streakOpacity.value,
  }));

  // Heatmap generation
  const heatmapData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const cacheKey = `history_heatmap_${dateKey}_${generateDatasetFingerprint(gymLogs)}`;

    return computeOrGetHotCache(cacheKey, () => {
      const logMap = new Map<string, any>();
      gymLogs.forEach(log => {
        const key = log.date.slice(0, 10);
        let totalSets = 0;
        log.exercises?.forEach(ex => {
          if (ex.skipped) return;
          totalSets += ex.setsLog?.filter((s: any) => s.completed).length || 0;
        });
        logMap.set(key, { totalSets, log });
      });

      const grid: HeatmapDay[][] = [];
      const startDay = new Date(today);
      startDay.setDate(today.getDate() - today.getDay() - (WEEKS - 1) * 7);

      for (let w = 0; w < WEEKS; w++) {
        const weekCol: HeatmapDay[] = [];
        for (let d = 0; d < DAYS_PER_WEEK; d++) {
          const currentDate = new Date(startDay);
          currentDate.setDate(startDay.getDate() + (w * 7) + d);

          const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
          const data = logMap.get(key);

          weekCol.push({
            date: currentDate,
            dateStr: key,
            isFuture: currentDate > today,
            intensity: data ? Math.max(0.3, Math.min(1.0, data.totalSets / 20)) : 0,
            log: data?.log || null,
          });
        }
        grid.push(weekCol);
      }
      return grid;
    });
  }, [gymLogs]);

  // Past Sessions list (sorted newest first)
  const pastSessions = useMemo(() => {
    return (gymLogs || [])
      .filter(l => {
        const hasSets = (l.exercises || []).some(ex => (ex.setsLog || []).some((s: any) => s.completed));
        const hasCardio = (l.cardio || []).some((c: any) => c.completed);
        return l.completed || hasSets || hasCardio;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [gymLogs]);

  const [showPRHallOfFame, setShowPRHallOfFame] = useState(false);

  // PR Feed calculation
  const prFeedData = useMemo(() => {
    const list: { date: Date; dateStr: string; rawWeight: number; rawReps: number; volume: number }[] = [];
    (gymLogs || []).forEach(log => {
      if (!log.date) return;
      let maxW = 0;
      let maxR = 0;
      let vol = 0;
      log.exercises?.forEach(ex => {
        ex.setsLog?.forEach(s => {
          if (s.completed && s.weight && s.reps) {
            const w = Number(s.weight);
            const r = Number(s.reps);
            if (w > maxW) { maxW = w; maxR = r; }
            vol += w * r;
          }
        });
      });
      if (maxW > 0) {
        list.push({
          date: new Date(log.date),
          dateStr: log.date.slice(5),
          rawWeight: maxW,
          rawReps: maxR,
          volume: vol,
        });
      }
    });
    return list;
  }, [gymLogs]);

  const handleSelectDay = useCallback((dateStr: string) => {
    navigation.navigate('WorkoutSummary', { date: dateStr, readOnly: true });
  }, [navigation]);

  // ── Segment 2: Strength & Volume State & Computations ───────────────────────
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [exCurveMode, setExCurveMode] = useState<ExCurveMode>('1rm');

  const { filteredLogs, kpi, volumeTimeline, allCompletedSets } = useMemo(() => {
    const cacheKey = `history_strength_${timeRange}_${generateDatasetFingerprint(gymLogs)}`;
    return computeOrGetHotCache(cacheKey, () => {
      const daysToSubtract =
        timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : timeRange === '1y' ? 365 : 0;

      let fLogs = (gymLogs || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      if (daysToSubtract > 0) {
        const cutoffStr = dateStrOffset(-daysToSubtract, todayStr());
        fLogs = fLogs.filter(l => l.date >= cutoffStr);
      }

      let totalWorkouts = 0;
      let totalVolumeKg = 0;
      let totalCardioMins = 0;
      const completedSetsList: any[] = [];
      const dailyVolumeMap = new Map<string, number>();

      fLogs.forEach(log => {
        let isWorkout = false;
        let sessionVol = 0;

        log.exercises?.forEach(ex => {
          if (ex.skipped) return;
          ex.setsLog?.forEach((s: any) => {
            if (s.completed) {
              completedSetsList.push(s);
              const w = Number(s.weight) || 0;
              const r = Number(s.reps) || 0;
              if (w > 0 && r > 0) {
                sessionVol += w * r;
                isWorkout = true;
              }
            }
          });
        });

        totalVolumeKg += sessionVol;
        if (sessionVol > 0) {
          dailyVolumeMap.set(log.date, (dailyVolumeMap.get(log.date) || 0) + sessionVol);
        }

        log.cardio?.forEach(c => {
          if (c.completed) {
            if (c.durationMinutes) totalCardioMins += c.durationMinutes;
            isWorkout = true;
          }
        });

        if (isWorkout) totalWorkouts++;
      });

      const vTimeline = Array.from(dailyVolumeMap.entries()).map(([dateStr, vol]) => {
        const parts = dateStr.split('-');
        const shortDate = `${parts[1]}/${parts[2]}`;
        return { dateStr, shortDate, volume: vol };
      });

      return {
        filteredLogs: fLogs,
        kpi: { totalWorkouts, totalVolumeKg, totalCardioMins },
        volumeTimeline: vTimeline,
        allCompletedSets: completedSetsList,
      };
    });
  }, [gymLogs, timeRange]);

  const effortSummary = useMemo(() => calculateEffortSummary(allCompletedSets), [allCompletedSets]);

  const macroMuscleStats = useMemo(() => {
    const cacheKey = `history_macro_stats_${generateDatasetFingerprint(filteredLogs)}`;
    return computeOrGetHotCache(cacheKey, () => {
      const map: Record<string, { name: string; sets: number; volumeKg: number; color: string }> = {
        Back: { name: 'Back & Lats', sets: 0, volumeKg: 0, color: '#89dceb' },
        Chest: { name: 'Chest & Pecs', sets: 0, volumeKg: 0, color: '#a599ff' },
        Quads: { name: 'Quads & Squats', sets: 0, volumeKg: 0, color: '#5eda9e' },
        GlutesHams: { name: 'Glutes & Hamstrings', sets: 0, volumeKg: 0, color: '#ff9f4d' },
        Shoulders: { name: 'Shoulders & Delts', sets: 0, volumeKg: 0, color: '#ffd32a' },
        Arms: { name: 'Arms (Biceps / Triceps)', sets: 0, volumeKg: 0, color: '#b8afff' },
        Core: { name: 'Core & Calves', sets: 0, volumeKg: 0, color: '#8e8e93' },
        Other: { name: 'Other / Mixed', sets: 0, volumeKg: 0, color: '#a0a0a0' },
      };

      let totalSetsCount = 0;
      let totalKgSum = 0;

      (filteredLogs || []).forEach(log => {
        (log.exercises || []).forEach(ex => {
          if (ex.skipped) return;
          const { canonicalGroup } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
          let targetKey = 'Other';
          if (canonicalGroup === 'Chest') targetKey = 'Chest';
          else if (canonicalGroup === 'Back' || canonicalGroup === 'Lats' || canonicalGroup === 'Traps') targetKey = 'Back';
          else if (canonicalGroup === 'Quads') targetKey = 'Quads';
          else if (canonicalGroup === 'Hamstrings' || canonicalGroup === 'Glutes' || canonicalGroup === 'Glutes/Abductors') targetKey = 'GlutesHams';
          else if (canonicalGroup === 'Shoulders') targetKey = 'Shoulders';
          else if (canonicalGroup === 'Biceps' || canonicalGroup === 'Triceps' || canonicalGroup === 'Forearms') targetKey = 'Arms';
          else if (canonicalGroup === 'Core' || canonicalGroup === 'Calves') targetKey = 'Core';

          (ex.setsLog || []).forEach((s: any) => {
            if (s.completed) {
              const w = Number(s.weight) || 0;
              const r = Number(s.reps) || 0;
              const vol = w * r;
              map[targetKey].sets += 1;
              map[targetKey].volumeKg += vol;
              totalSetsCount += 1;
              totalKgSum += vol;
            }
          });
        });
      });

      const list = Object.values(map)
        .filter(item => item.sets > 0)
        .sort((a, b) => b.volumeKg - a.volumeKg)
        .map(item => ({
          ...item,
          percentage: totalKgSum > 0 ? Math.round((item.volumeKg / totalKgSum) * 100) : 0,
        }));

      return { list, totalSetsCount, totalKgSum };
    });
  }, [filteredLogs]);

  const { volCoords, maxVol } = useMemo(() => {
    if (volumeTimeline.length === 0) return { volCoords: [], maxVol: 0 };
    const maxV = Math.max(...volumeTimeline.map(d => d.volume), 100);

    const coords = volumeTimeline.map((d, i) => {
      const x = PADDING + (i / Math.max(1, volumeTimeline.length - 1)) * (CHART_WIDTH - PADDING * 2);
      const y = CHART_HEIGHT - PADDING - (d.volume / maxV) * (CHART_HEIGHT - PADDING * 2);
      return { x, y, data: d };
    });
    return { volCoords: coords, maxVol: maxV };
  }, [volumeTimeline, CHART_WIDTH]);

  const volSmoothPath = useMemo(() => generateSmoothSvgPath(volCoords), [volCoords]);

  // Exercise Deep-Dive List
  const { allExerciseNames } = useMemo(() => {
    const keyToDisplay = new Map<string, string>();
    const keySet = new Set<string>();

    (gymLogs || []).forEach(log => {
      log.exercises?.forEach(ex => {
        if (!ex.name) return;
        const key = normalizeExerciseKey(ex.name);
        if (!key) return;
        keySet.add(key);
        if (!keyToDisplay.has(key) || ex.name.length > (keyToDisplay.get(key)?.length || 0)) {
          keyToDisplay.set(key, ex.name);
        }
      });
    });

    const displayNames = Array.from(keySet)
      .map(k => keyToDisplay.get(k) || k)
      .sort();

    return { allExerciseNames: displayNames };
  }, [gymLogs]);

  useEffect(() => {
    if (allExerciseNames.length > 0 && (!selectedExercise || !allExerciseNames.includes(selectedExercise))) {
      setSelectedExercise(allExerciseNames[0]);
    }
  }, [allExerciseNames, selectedExercise]);

  const allExerciseSessionsMap = useMemo(() => {
    const cacheKey = `history_ex_map_${generateDatasetFingerprint(gymLogs)}`;
    return computeOrGetHotCache(cacheKey, () => {
      const map = new Map<string, any[]>();
      const sorted = (gymLogs || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      for (const log of sorted) {
        for (const ex of log.exercises || []) {
          if (ex.skipped || !ex.name) continue;
          const completedSets = (ex.setsLog || []).filter((s: any) => s.completed && !s.isWarmup);
          if (completedSets.length === 0) continue;

          const topWeight = Math.max(0, ...completedSets.map((s: any) => Number(s.weight) || 0));
          const maxRepsAtMax = Math.max(...completedSets.filter((s: any) => Number(s.weight) === topWeight).map((s: any) => Number(s.reps) || 0));
          const allOneRMs = completedSets.map((s: any) => estimate1RM(Number(s.weight) || 0, Number(s.reps) || 0, 'epley'));
          const oneRM = Math.max(0, ...allOneRMs);
          const maxReps = maxRepsAtMax > 0 ? maxRepsAtMax : (Number(completedSets[0]?.reps) || 0);

          let rirSum = 0;
          let rirCount = 0;
          for (const s of completedSets) {
            if (s.rir !== undefined && s.rir !== null) {
              rirSum += Number(s.rir);
              rirCount++;
            } else if (s.rpe !== undefined && s.rpe !== null) {
              rirSum += 10 - Number(s.rpe);
              rirCount++;
            }
          }
          const avgRIR = rirCount > 0 ? Number((rirSum / rirCount).toFixed(1)) : 2.0;

          const normK = normalizeExerciseKey(ex.name);
          const session = {
            date: log.date,
            topWeight,
            maxReps,
            oneRM,
            avgRIR,
            completedSetsCount: completedSets.length,
          };

          const existing = map.get(normK) || [];
          existing.push(session);
          map.set(normK, existing);
        }
      }
      return map;
    });
  }, [gymLogs]);

  const exerciseSessions = useMemo(() => {
    if (!selectedExercise) return [];
    const normK = normalizeExerciseKey(selectedExercise);
    return allExerciseSessionsMap.get(normK) || [];
  }, [selectedExercise, allExerciseSessionsMap]);

  const exerciseBest = useMemo(() => {
    let best1RM = 0;
    let bestWeight = 0;
    for (const s of exerciseSessions) {
      if (s.oneRM > best1RM) best1RM = s.oneRM;
      if (s.topWeight > bestWeight) bestWeight = s.topWeight;
    }
    return { best1RM, bestWeight };
  }, [exerciseSessions]);

  const repMaxTable = useMemo(() => calculateRepMaxTable(exerciseBest.best1RM), [exerciseBest.best1RM]);
  const recent5Sessions = useMemo(() => exerciseSessions.slice(-5).reverse(), [exerciseSessions]);

  const { exCoords } = useMemo(() => {
    if (exerciseSessions.length === 0) return { exCoords: [] };
    const pts = exerciseSessions.slice(-8);
    const values = pts.map(p =>
      exCurveMode === 'top' ? p.topWeight : exCurveMode === '1rm' ? p.oneRM : p.avgRIR
    );
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const coords = pts.map((p, idx) => {
      const val = exCurveMode === 'top' ? p.topWeight : exCurveMode === '1rm' ? p.oneRM : p.avgRIR;
      const x = PADDING + (idx / Math.max(1, pts.length - 1)) * (CHART_WIDTH - PADDING * 2);
      const y = CHART_HEIGHT - PADDING - ((val - minVal) / range) * (CHART_HEIGHT - PADDING * 2);
      return { x, y, data: p, val };
    });
    return { exCoords: coords };
  }, [exerciseSessions, exCurveMode, CHART_WIDTH]);

  const exSmoothPath = useMemo(() => generateSmoothSvgPath(exCoords), [exCoords]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <Text style={styles.headerTitle}>Analytics & History</Text>
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            setShowPRHallOfFame(true);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor: isDark ? 'rgba(255, 209, 102, 0.12)' : 'rgba(217, 119, 6, 0.1)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 209, 102, 0.28)' : 'rgba(217, 119, 6, 0.22)',
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="trophy" size={14} color="#FFD166" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#FFD166' : '#D97706' }}>
            PR Hall of Fame
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Segment Controller: Logs & PRs | Strength & Volume | Weekly Recap ── */}
      <View style={{
        flexDirection: 'row',
        marginHorizontal: 6,
        marginBottom: 12,
        padding: 3,
        borderRadius: 12,
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      }}>
        {[
          { key: 'logs', label: '📜 Logs & PRs' },
          { key: 'strength', label: '📈 Strength & Vol' },
          { key: 'recap', label: '🏆 Weekly Recap' },
        ].map(item => {
          const isSelected = activeSegment === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 9,
                alignItems: 'center',
                backgroundColor: isSelected ? (isDark ? '#23222a' : '#ffffff') : 'transparent',
                shadowColor: '#000',
                shadowOpacity: isSelected ? 0.2 : 0,
                shadowRadius: 4,
                elevation: isSelected ? 2 : 0,
              }}
              onPress={() => {
                hapticLight();
                setActiveSegment(item.key as AnalyticsSegment);
              }}
            >
              <Text style={{
                fontSize: 12,
                fontFamily: FONT_FAMILY.bold,
                color: isSelected ? (colors.accentPrimary || '#a599ff') : colors.textMuted,
              }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Segment 3: Weekly Recap (On-Demand Weekly Intelligence) ── */}
      {activeSegment === 'recap' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          <WeeklyGymReport
            gymLogs={gymLogs as any}
            weekAnchorDate={todayStr()}
            userGymPlan={userGymPlan}
          />
        </ScrollView>
      ) : activeSegment === 'strength' ? (
        /* ── Segment 2: Strength & Volume Analytics ── */
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 110 }]} showsVerticalScrollIndicator={false}>
          {/* Time Filter */}
          <View style={progStyles.filterTabs}>
            {(['7d', '30d', '90d', '1y', 'all'] as TimeRange[]).map(r => (
              <TouchableOpacity
                key={r}
                style={[progStyles.tab, timeRange === r && progStyles.tabActive]}
                onPress={() => {
                  hapticLight();
                  setTimeRange(r);
                }}
                activeOpacity={0.7}
              >
                <Text style={[progStyles.tabText, timeRange === r && progStyles.tabTextActive]}>
                  {r === '7d' ? '7D' : r === '30d' ? '30D' : r === '90d' ? '90D' : r === '1y' ? '1Y' : 'All'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Top 4 KPI Tiles */}
          <View style={progStyles.kpiRow}>
            <View style={progStyles.kpiCard}>
              <View style={[progStyles.kpiIconBox, { backgroundColor: isDark ? 'rgba(165,153,255,0.1)' : 'rgba(108,92,231,0.1)' }]}>
                <Ionicons name="fitness-outline" size={14} color={colors.accentPrimary} />
              </View>
              <Text style={progStyles.kpiValue}>{kpi.totalWorkouts}</Text>
              <Text style={progStyles.kpiLabel}>Workouts</Text>
            </View>

            <View style={progStyles.kpiCard}>
              <View style={[progStyles.kpiIconBox, { backgroundColor: isDark ? 'rgba(94,218,158,0.1)' : 'rgba(0,184,148,0.1)' }]}>
                <Ionicons name="barbell-outline" size={14} color={colors.accentGreen} />
              </View>
              <View style={progStyles.kpiValueRow}>
                <Text style={progStyles.kpiValue}>
                  {kpi.totalVolumeKg >= 1000 ? `${(kpi.totalVolumeKg / 1000).toFixed(1)}k` : kpi.totalVolumeKg}
                </Text>
                <Text style={progStyles.kpiUnit}>kg</Text>
              </View>
              <Text style={progStyles.kpiLabel}>Total Volume</Text>
            </View>

            <View style={progStyles.kpiCard}>
              <View style={[progStyles.kpiIconBox, { backgroundColor: isDark ? 'rgba(255,159,77,0.1)' : 'rgba(255,121,63,0.1)' }]}>
                <Ionicons name="flame-outline" size={14} color="#ff9f4d" />
              </View>
              <View style={progStyles.kpiValueRow}>
                <Text style={progStyles.kpiValue}>{kpi.totalCardioMins}</Text>
                <Text style={progStyles.kpiUnit}>m</Text>
              </View>
              <Text style={progStyles.kpiLabel}>Cardio</Text>
            </View>

            <View style={progStyles.kpiCard}>
              <View style={[progStyles.kpiIconBox, { backgroundColor: isDark ? 'rgba(255,211,42,0.1)' : 'rgba(250,177,160,0.1)' }]}>
                <Ionicons name="speedometer-outline" size={14} color="#ffd32a" />
              </View>
              <View style={progStyles.kpiValueRow}>
                <Text style={progStyles.kpiValue}>{effortSummary.averageRIR.toFixed(1)}</Text>
                <Text style={progStyles.kpiUnit}>RIR</Text>
              </View>
              <Text style={progStyles.kpiLabel}>Avg Effort</Text>
            </View>
          </View>

          {/* Volume Tonnage Curve */}
          <View style={progStyles.glassCard}>
            <View style={progStyles.cardHeaderRow}>
              <View>
                <Text style={progStyles.cardTitle}>Total Volume Tonnage</Text>
                <Text style={progStyles.cardSubtitle}>Total weight shifted across workouts</Text>
              </View>
              <View style={progStyles.cardHeaderBadge}>
                <Text style={progStyles.cardHeaderBadgeText}>PEAK {Math.round(maxVol)} KG</Text>
              </View>
            </View>

            {volumeTimeline.length > 1 ? (
              <View style={progStyles.svgWrapper}>
                <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                  <Defs>
                    <LinearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor={colors.accentPrimary} stopOpacity={0.25} />
                      <Stop offset="100%" stopColor={colors.accentPrimary} stopOpacity={0.0} />
                    </LinearGradient>
                  </Defs>
                  <Path
                    d={`${volSmoothPath} L ${volCoords[volCoords.length - 1].x},${CHART_HEIGHT - PADDING} L ${volCoords[0].x},${CHART_HEIGHT - PADDING} Z`}
                    fill="url(#volGrad)"
                  />
                  <Path d={volSmoothPath} fill="none" stroke={colors.accentPrimary} strokeWidth={2.5} />
                  {volCoords.map((c, i) => (
                    <Circle key={i} cx={c.x} cy={c.y} r={3} fill="#ffffff" stroke={colors.accentPrimary} strokeWidth={2} />
                  ))}
                </Svg>
              </View>
            ) : (
              <View style={progStyles.emptyBox}>
                <Ionicons name="analytics-outline" size={24} color={colors.textTertiary} />
                <Text style={progStyles.emptyText}>Need at least 2 sessions to plot volume curve.</Text>
              </View>
            )}
          </View>

          {/* Muscle Distribution Donut */}
          {macroMuscleStats.list.length > 0 && (
            <MuscleDonutChart
              data={macroMuscleStats.list.map(m => ({ muscle: m.name, sets: m.sets, color: m.color }))}
            />
          )}

          {/* Effort & Hypertrophy Stimulus Card */}
          <EffortDistributionCard weekLogs={filteredLogs as any} />

          {/* 3-in-1 Exercise Deep-Dive Hub */}
          <View style={progStyles.glassCard}>
            <Text style={progStyles.cardTitle}>Exercise Performance Hub</Text>
            <Text style={progStyles.cardSubtitle}>Multi-curve 1RM, top loads, and set audit</Text>

            {allExerciseNames.length > 0 ? (
              <View style={{ marginTop: SPACE.md }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={progStyles.pillScroll}>
                  {allExerciseNames.map(ex => (
                    <TouchableOpacity
                      key={ex}
                      style={[progStyles.pill, selectedExercise === ex && progStyles.pillActive]}
                      onPress={() => {
                        hapticLight();
                        setSelectedExercise(ex);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[progStyles.pillText, selectedExercise === ex && progStyles.pillTextActive]}>
                        {ex}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Sub-toggle: 1RM | Top Set | Effort */}
                <View style={{ flexDirection: 'row', gap: 6, marginVertical: SPACE.sm }}>
                  {[
                    { key: '1rm', label: 'Est. 1RM' },
                    { key: 'top', label: 'Top Set' },
                    { key: 'effort', label: 'Avg RIR' },
                  ].map(m => (
                    <TouchableOpacity
                      key={m.key}
                      onPress={() => {
                        hapticLight();
                        setExCurveMode(m.key as ExCurveMode);
                      }}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: RADIUS.md,
                        backgroundColor: exCurveMode === m.key ? (isDark ? '#2C2C2E' : colors.surface2) : 'transparent',
                        borderWidth: 1,
                        borderColor: exCurveMode === m.key ? colors.border : 'transparent',
                      }}
                    >
                      <Text style={{
                        fontSize: 11,
                        fontFamily: FONT_FAMILY.bold,
                        color: exCurveMode === m.key ? colors.textPrimary : colors.textMuted,
                      }}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {exCoords.length > 1 ? (
                  <View style={progStyles.svgWrapper}>
                    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                      <Path d={exSmoothPath} fill="none" stroke={colors.accentGreen} strokeWidth={2.5} />
                      {exCoords.map((c, i) => (
                        <Circle key={i} cx={c.x} cy={c.y} r={3.5} fill="#ffffff" stroke={colors.accentGreen} strokeWidth={2} />
                      ))}
                    </Svg>
                  </View>
                ) : null}

                {/* Rep-Max Table */}
                {exerciseBest.best1RM > 0 && (
                  <View style={{ marginTop: SPACE.md, padding: 10, borderRadius: 12, backgroundColor: isDark ? '#141418' : colors.surface2 }}>
                    <Text style={{ fontSize: 12, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary, marginBottom: 6 }}>
                      Scientific Rep-Max Potential (Est. 1RM {exerciseBest.best1RM} kg)
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      {repMaxTable.slice(0, 5).map(rm => (
                        <View key={rm.reps} style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 10, color: colors.textMuted, fontFamily: FONT_FAMILY.medium }}>{rm.reps}RM</Text>
                          <Text style={{ fontSize: 12, color: colors.textPrimary, fontFamily: FONT_FAMILY.bold }}>{rm.weight}kg</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={progStyles.emptyBox}>
                <Ionicons name="barbell-outline" size={24} color={colors.textTertiary} />
                <Text style={progStyles.emptyText}>No exercise telemetry recorded yet.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        /* ── Segment 1: Logs & PRs ── */
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 110 }]} showsVerticalScrollIndicator={false}>
          {/* Streak Counter */}
          <Reanimated.View style={[styles.streakCard, streakStyle]}>
            <View style={styles.streakLeft}>
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={20} color={isDark ? '#FFD166' : '#D97706'} style={{ marginRight: 6 }} />
                <Text style={[styles.streakBadgeText, { color: isDark ? '#FFD166' : '#D97706' }]}>{streak}</Text>
              </View>
              <View>
                <Text style={styles.streakTitle}>Day Streak</Text>
                <Text style={styles.streakSubtitle}>Keep the momentum going!</Text>
              </View>
            </View>
          </Reanimated.View>

          {/* 13-Week Activity Heatmap */}
          <GymHeatmapCard
            heatmapData={heatmapData}
            onSelectDay={handleSelectDay}
            styles={styles}
            isDark={isDark}
          />

          {/* PR Feed Highlights */}
          {prFeedData.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <PRFeed data={prFeedData} />
            </View>
          )}

          {/* Past Sessions Section */}
          <View style={{ marginTop: 20 }}>
            <Text style={{
              fontSize: 13,
              fontWeight: '700',
              letterSpacing: 1.5,
              color: colors.textTertiary,
              marginBottom: 12,
              marginLeft: 4,
              textTransform: 'uppercase',
            }}>
              PAST SESSIONS ({pastSessions.length})
            </Text>

            {pastSessions.length === 0 ? (
              <View style={{
                backgroundColor: isDark ? '#1C1C1E' : colors.surface,
                borderRadius: 16,
                padding: 24,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border,
              }}>
                <Ionicons name="fitness-outline" size={32} color={colors.textTertiary} style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                  No Past Workouts Logged Yet
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 18, marginBottom: 14 }}>
                  Your completed workout logs, tonnage, and exercise history will appear here.
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: isDark ? 'rgba(165,153,255,0.15)' : 'rgba(108,92,231,0.1)',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(165,153,255,0.3)' : 'rgba(108,92,231,0.25)',
                  }}
                  onPress={() => (navigation as any).navigate('Today')}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#A599FF' : '#6C5CE7' }}>
                    Start Today's Workout
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              pastSessions.map((session: any) => {
                const completedExercises = (session.exercises || []).filter((e: any) =>
                  (e.setsLog || []).some((s: any) => s.completed)
                );
                const totalVolume = (session.exercises || []).reduce((acc: number, ex: any) => {
                  return acc + (ex.setsLog || []).reduce((sAcc: number, s: any) => {
                    return sAcc + (s.completed ? (Number(s.weight) || 0) * (Number(s.reps) || 0) : 0);
                  }, 0);
                }, 0);

                return (
                  <TouchableOpacity
                    key={session.id || session.date}
                    style={{
                      backgroundColor: isDark ? '#1C1C1E' : colors.surface,
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    activeOpacity={0.7}
                    onPress={() => handleSelectDay(session.date)}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>
                        {session.date}
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.textMuted }}>
                        {completedExercises.length} exercises
                        {session.workoutDurationMinutes ? ` • ${session.workoutDurationMinutes} min` : ''}
                        {totalVolume > 0 ? ` • ${Math.round(totalVolume)} kg total` : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* PR Hall of Fame Sheet */}
      <PRHallOfFameSheet
        visible={showPRHallOfFame}
        onClose={() => setShowPRHallOfFame(false)}
      />
    </SafeAreaView>
  );
}
