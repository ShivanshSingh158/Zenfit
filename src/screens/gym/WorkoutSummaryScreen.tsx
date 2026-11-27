import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, useWindowDimensions, ScrollView, InteractionManager, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Trophy, Flame, X, Share2, ChevronDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { ScreenWrapper, TactileButton, NumericText, AppIcon, RollingNumber } from '../../components/ui';

import { GymNavigationParamList } from '../../types/gym.types';
import { calculateExerciseMaxWeight, formatIndianDatePretty, normalizeExerciseKey, getVolumeMultiplier } from '../../utils/gymUtils';
import { formatVolumeParts, formatWeight, unitLabel, useWeightUnit } from '../../utils/weightUnit';
import { dateStrOffset, todayStr } from '../../hooks/useGymLog';
import { LazySheet } from '../../hooks/useLazySheetMount';
import { springs } from '../../theme/motion';
import { feedback } from '../../utils/haptics';
import { useGymLogs, useGymPlan } from '../../contexts/domains/WellnessContext';
import { resolvePlanDay } from '../../hooks/useGymLog';
import { getWorkoutDaysInRotation } from '../../services/gymRotationService';
import { useTheme } from '../../contexts/ThemeContext';
import { awardXP } from '../../services/xpSystem';
import { estimate1RM } from '../../services/oneRepMaxEngine';
import { computeOrGetHotCache, generateDatasetFingerprint } from '../../utils/hotCacheStore';
import { getL1Sync } from '../../utils/bootManifest';
import { CheckCircle2 } from 'lucide-react-native';

// Extracted Sub-Components & Styles
import { makeWorkoutSummaryStyles } from './workoutSummaryStyles';
import WorkoutSummaryProgressionChart from '../../components/Gym/metrics/WorkoutSummaryProgressionChart';
const ExerciseDeepDiveModal = React.lazy(() => import('../../components/Gym/exercise/ExerciseDeepDiveModal'));

export default function WorkoutSummaryScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, tokens } = useTheme();
  const unitIsLbs = useWeightUnit();
  const styles = useMemo(() => makeWorkoutSummaryStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<NativeStackNavigationProp<GymNavigationParamList>>();
  const route = useRoute<RouteProp<GymNavigationParamList, 'WorkoutSummary'>>();

  const readOnly = route.params?.readOnly || false;
  const targetDate = route.params?.date;
  const passedLog = (route.params as any)?.log;
  const { gymLogs } = useGymLogs();
  const { userGymPlan, setActiveProgramme } = useGymPlan();
  const [advancingProgrammeWeek, setAdvancingProgrammeWeek] = useState(false);

  const [showConfetti, setShowConfetti] = useState(!readOnly);
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [deepDiveEx, setDeepDiveEx] = useState<string | null>(null);
  const [isTransitionComplete, setIsTransitionComplete] = useState(false);
  const hasAwardedPrRef = useRef(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsTransitionComplete(true);
    });
    return () => task.cancel();
  }, []);

  // Pre-find the target log once so gymLogs is only searched / sorted a single time
  const targetLog = useMemo(() => {
    if (passedLog && (!targetDate || passedLog.date === targetDate)) {
      return passedLog;
    }
    let logDate = targetDate;
    if (!logDate && gymLogs && gymLogs.length > 0) {
      const sortedLogs = [...gymLogs].sort((a, b) => b.date.localeCompare(a.date));
      logDate = sortedLogs[0]?.date;
    }
    if (!logDate) return null;
    const found = (gymLogs || []).find(l => l.date === logDate);
    if (found) return found;

    // Fast fallback: Check L1 RAM cache
    const l1Logs = getL1Sync<any[]>('gymLogs', []);
    const l1Found = (l1Logs || []).find(l => l.date === logDate);
    if (l1Found) return l1Found;

    return null;
  }, [passedLog, gymLogs, targetDate]);

  const detectedPR = useMemo(() => {
    if (readOnly || !targetLog?.exercises || !gymLogs || gymLogs.length === 0) return null;
    const logDate = targetLog.date;
    const pastLogs = gymLogs.filter(l => l.date < logDate);

    // Pre-indexed Map of past max weight and e1RM keyed strictly by normalized exercise name
    const pastMaxByKey = new Map<string, { weight: number; e1RM: number }>();
    for (const pl of pastLogs) {
      for (const ex of (pl.exercises || [])) {
        const key = normalizeExerciseKey(ex.name);
        if (!key) continue;
        let maxW = 0;
        let maxE1RM = 0;
        for (const s of (ex.setsLog || [])) {
          if (!s.completed) continue;
          const w = Number(s.weight) || 0;
          const r = Number(s.reps) || 0;
          if (w > maxW) maxW = w;
          if (w > 0 && r > 0) {
            const e1rm = estimate1RM(w, r);
            if (e1rm > maxE1RM) maxE1RM = e1rm;
          }
        }
        const existing = pastMaxByKey.get(key) || { weight: 0, e1RM: 0 };
        if (maxW > existing.weight || maxE1RM > existing.e1RM) {
          pastMaxByKey.set(key, {
            weight: Math.max(maxW, existing.weight),
            e1RM: Math.max(maxE1RM, existing.e1RM),
          });
        }
      }
    }

    const prs: Array<{ name: string; weight: number; type: 'weight' | '1RM'; prev: number }> = [];
    for (const ex of targetLog.exercises) {
      if (!ex.setsLog) continue;
      const key = normalizeExerciseKey(ex.name);
      if (!key) continue;
      const past = pastMaxByKey.get(key);
      if (!past) continue; // Require past record so first-time exercises never trigger false PR

      let todayMaxW = 0;
      let todayMaxE1RM = 0;
      for (const s of ex.setsLog) {
        if (!s.completed) continue;
        const w = Number(s.weight) || 0;
        const r = Number(s.reps) || 0;
        if (w > todayMaxW) todayMaxW = w;
        if (w > 0 && r > 0) {
          const e1rm = estimate1RM(w, r);
          if (e1rm > todayMaxE1RM) todayMaxE1RM = e1rm;
        }
      }

      if (past.weight > 0 && todayMaxW > past.weight) {
        prs.push({ name: ex.name, weight: todayMaxW, type: 'weight', prev: past.weight });
      } else if (past.e1RM > 0 && todayMaxE1RM > past.e1RM && todayMaxW > 0) {
        prs.push({ name: ex.name, weight: todayMaxE1RM, type: '1RM', prev: past.e1RM });
      }
    }
    return prs.length > 0 ? prs : null;
  }, [gymLogs, targetLog, readOnly]);

  const detectedPRList = detectedPR;
  const newPR = Array.isArray(detectedPRList) ? detectedPRList[0] : detectedPRList;
  const isPR = !!newPR;

  useEffect(() => {
    if (detectedPR && targetLog?.date && !hasAwardedPrRef.current) {
      hasAwardedPrRef.current = true;
      awardXP('GYM_PR', `pr_${targetLog.date}`).catch(() => {});
    }
  }, [detectedPR, targetLog?.date]);

  const sessionData = useMemo(() => {
    const todayLog = targetLog;

    let totalSets = 0;
    let totalVolume = 0;
    let totalExercises = 0;
    const exercises: Array<{ name: string; sets: number; maxWeight: number; reps: number; plannedOnly?: boolean }> = [];
    const plannedExercises: Array<{ name: string; sets: number; maxWeight: number; reps: number; plannedOnly?: boolean }> = [];

    todayLog?.exercises?.forEach((ex: any) => {
      if (ex.skipped) return;
      let exSets = 0;
      let exMaxWeight = 0;
      let exTotalReps = 0;
      const mult = getVolumeMultiplier(ex.name);

      ex.setsLog?.forEach((set: any) => {
        const w = (set?.weight !== null && set?.weight !== undefined && !isNaN(Number(set.weight))) ? Number(set.weight) : (set?.weightKg ? Number(set.weightKg) : 0);
        const r = (set?.reps !== null && set?.reps !== undefined && !isNaN(Number(set.reps))) ? Number(set.reps) : 0;
        if (set.completed === true) {
          exSets++;
          if (w > 0 && r > 0) {
            totalVolume += w * r * mult;
            if (w > exMaxWeight) exMaxWeight = w;
            exTotalReps += r;
          } else if (r > 0) {
            exTotalReps += r;
          }
        }
      });

      if (exSets > 0) {
        totalSets += exSets;
        totalExercises++;
        exercises.push({
          name: ex.name,
          sets: exSets,
          maxWeight: exMaxWeight,
          reps: exTotalReps,
        });
      } else if (ex.name) {
        plannedExercises.push({
          name: ex.name,
          sets: ex.setsLog?.length || Number(ex.targetSets) || 3,
          maxWeight: 0,
          reps: 0,
          plannedOnly: true,
        });
      }
    });

    const duration = todayLog?.workoutDurationMinutes || 0;
    const notes = todayLog?.notes;
    const listToDisplay = exercises.length > 0 ? exercises : plannedExercises;
    const isQuickCheckIn = exercises.length === 0 && plannedExercises.length > 0;

    return {
      totalSets,
      totalVolume,
      totalExercises,
      duration,
      exercises: listToDisplay,
      performedCount: exercises.length,
      isQuickCheckIn,
      notes,
    };
  }, [targetLog]);

  const displayedExercises = showAllExercises
    ? sessionData.exercises
    : sessionData.exercises.slice(0, 3);
  const remainingCount = sessionData.exercises.length - 3;

  const availableLifts = useMemo(() => {
    const sessionLiftNames = sessionData.exercises
      .filter(e => !e.plannedOnly)
      .map(e => e.name);
    return Array.from(new Set(sessionLiftNames)).slice(0, 5);
  }, [sessionData.exercises]);

  const [selectedLift, setSelectedLift] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<'1RM' | 'Volume'>('1RM');

  useEffect(() => {
    if (availableLifts.length > 0) {
      setSelectedLift(prev => (prev && availableLifts.includes(prev) ? prev : availableLifts[0]));
    } else {
      setSelectedLift('');
    }
  }, [availableLifts]);

  const prScale = useSharedValue(0.6);
  const streakScale = useSharedValue(0.6);
  const prOpacity = useSharedValue(0);
  const streakOpacity = useSharedValue(0);

  useEffect(() => {
    if (!readOnly) {
      feedback.success();
      prOpacity.value = withDelay(200, withSpring(1, springs.gentle));
      prScale.value = withDelay(200, withSequence(withSpring(1.15, springs.bouncy), withSpring(1, springs.snappy)));
      streakOpacity.value = withDelay(400, withSpring(1, springs.gentle));
      streakScale.value = withDelay(400, withSequence(withSpring(1.08, springs.bouncy), withSpring(1, springs.snappy)));
    } else {
      prOpacity.value = 1; prScale.value = 1; streakOpacity.value = 1; streakScale.value = 1;
    }
  }, [readOnly]);

  const prStyle = useAnimatedStyle(() => ({ transform: [{ scale: prScale.value }], opacity: prOpacity.value }));
  const streakStyle = useAnimatedStyle(() => ({ transform: [{ scale: streakScale.value }], opacity: streakOpacity.value }));

  const { width: screenWidth } = useWindowDimensions();

  const programmeWeekPrompt = useMemo(() => {
    const prog = userGymPlan?.activeProgramme;
    if (readOnly || !prog || prog.status !== 'active') return null;

    let plannedPerWeek = 0;
    if (userGymPlan?.scheduleMode === 'rotation') {
      plannedPerWeek = getWorkoutDaysInRotation(userGymPlan).length;
    } else {
      for (let d = 1; d <= 7; d++) {
        const pd = resolvePlanDay(userGymPlan, d);
        if (pd && !pd.isRest && (pd.exercises?.length ?? 0) > 0) {
          plannedPerWeek++;
        }
      }
    }
    if (plannedPerWeek <= 0) plannedPerWeek = 3;

    const startDateStr = prog.startDate
      ? String(prog.startDate).slice(0, 10)
      : dateStrOffset(-((prog.currentWeek - 1) * 7 + 7), todayStr());

    const completedDates = new Set<string>();
    const considerLog = (l: any) => {
      if (!l || !l.completed || !l.date || l.date < startDateStr) return;
      const hasCompletedSets = (l.exercises || []).some((ex: any) =>
        (ex.setsLog || []).some((s: any) => s.completed === true)
      );
      if (hasCompletedSets) {
        completedDates.add(l.date);
      }
    };
    (gymLogs || []).forEach(considerLog);
    considerLog(targetLog);

    const targetCumulative = prog.currentWeek * plannedPerWeek;
    if (completedDates.size < targetCumulative) return null;

    const currentWeekCfg = prog.weeks?.[prog.currentWeek];
    const nextWeekCfg = prog.weeks?.[prog.currentWeek + 1];
    return {
      programme: prog,
      plannedPerWeek,
      completedSinceStart: completedDates.size,
      isFinalWeek: prog.currentWeek >= prog.totalWeeks,
      currentWeekName: currentWeekCfg?.phaseName || `Week ${prog.currentWeek}`,
      nextWeekName: nextWeekCfg?.phaseName || (prog.currentWeek < prog.totalWeeks ? `Week ${prog.currentWeek + 1}` : null),
    };
  }, [readOnly, userGymPlan, gymLogs, targetLog]);

  const handleAdvanceProgrammeWeek = useCallback(async (action: 'advance' | 'restart' | 'finish') => {
    const prog = userGymPlan?.activeProgramme;
    if (!prog || advancingProgrammeWeek) return;
    setAdvancingProgrammeWeek(true);
    try {
      feedback.success();
      if (action === 'finish') {
        await setActiveProgramme(null);
      } else if (action === 'restart') {
        await setActiveProgramme({
          ...prog,
          currentWeek: 1,
          startDate: new Date().toISOString(),
          updatedAt: Date.now(),
        });
      } else if (prog.currentWeek < prog.totalWeeks) {
        await setActiveProgramme({
          ...prog,
          currentWeek: prog.currentWeek + 1,
          updatedAt: Date.now(),
        });
      } else {
        await setActiveProgramme(null);
      }
    } finally {
      setAdvancingProgrammeWeek(false);
    }
  }, [userGymPlan?.activeProgramme, advancingProgrammeWeek, setActiveProgramme]);

  const chartData = useMemo(() => {
    if (!gymLogs || gymLogs.length === 0) return null;
    const cacheKey = `summary_chart_${selectedLift}_${selectedMetric}_${isDark ? 'd' : 'l'}_${generateDatasetFingerprint(gymLogs)}`;
    return computeOrGetHotCache(cacheKey, () => {
      const ninetyDaysAgoStr = dateStrOffset(-90, todayStr());
      const logsInRange = gymLogs.filter(l => l.date >= ninetyDaysAgoStr).sort((a, b) => a.date.localeCompare(b.date));

      const labels: string[] = [];
      const dataPoints: number[] = [];

      const targetLiftKey = normalizeExerciseKey(selectedLift);

      logsInRange.forEach(log => {
        if (!log.exercises) return;
        const liftEx = log.exercises.find(e => e?.name && !e.skipped && normalizeExerciseKey(e.name) === targetLiftKey);
        if (liftEx && liftEx.setsLog) {
          let max1RM = 0;
          let totalVolume = 0;
          liftEx.setsLog.forEach((set: any) => {
            if (set.completed === true && set.weight && set.reps) {
              const est1RM = set.weight * (1 + set.reps / 30);
              if (est1RM > max1RM) max1RM = est1RM;
              totalVolume += set.weight * set.reps;
            }
          });
          const value = selectedMetric === '1RM' ? max1RM : totalVolume;
          if (value > 0) {
            const parts = (log.date || '').split('-');
            const formattedDate = parts.length === 3 ? `${Number(parts[1])}/${Number(parts[2])}` : log.date;
            labels.push(formattedDate);
            dataPoints.push(Math.round(value));
          }
        }
      });

      if (dataPoints.length === 0) return null;
      const step = Math.max(1, Math.floor(labels.length / 5));
      return {
        labels: labels.map((l, i) => i % step === 0 ? l : ''),
        datasets: [{ data: dataPoints, color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity * 0.95})` : `rgba(10, 132, 255, ${opacity * 0.95})`, strokeWidth: 2 }],
      };
    });
  }, [gymLogs, selectedLift, selectedMetric, isDark]);

  const handleShareWorkout = useCallback(async () => {
    try {
      feedback.tap();
      const dateFormatted = targetLog?.date ? formatIndianDatePretty(targetLog.date) : 'Today';
      const volFull = formatVolumeParts(sessionData.totalVolume, unitIsLbs).full;
      const prText = detectedPR && detectedPR.length > 0
        ? `🏆 Personal Records: ${detectedPR.map(p => `${p.name} (${formatWeight(p.weight, unitIsLbs, 1)}${p.type === '1RM' ? ' e1RM' : ''})`).join(', ')}\n`
        : '';
      const topLifts = sessionData.exercises
        .slice(0, 5)
        .map(e => `• ${e.name}: ${e.sets} sets${e.maxWeight > 0 ? ` · ${formatWeight(e.maxWeight, unitIsLbs, 1)}` : ''}`)
        .join('\n');

      const message =
        `⚡ ZenFit Workout Summary\n` +
        `📅 ${dateFormatted}\n\n` +
        `⏱️ Duration: ${sessionData.duration > 0 ? `${sessionData.duration} min` : '--'}\n` +
        `📊 Volume: ${volFull} · ${sessionData.totalSets} sets · ${sessionData.totalExercises} exercises\n` +
        (prText ? `\n${prText}` : '') +
        (topLifts ? `\nTop Exercises:\n${topLifts}\n` : '') +
        `\nCrushed with ZenFit 🔥`;

      await Share.share({
        message,
        title: 'ZenFit Workout Summary',
      });
    } catch {
      // User dismissed or cancelled
    }
  }, [targetLog, sessionData, isPR, newPR, unitIsLbs]);

  return (
    <ScreenWrapper edges={['top', 'left', 'right']} keyboardAvoiding={false}>
      {!readOnly && showConfetti && isTransitionComplete && (
        <ConfettiCannon
          count={isPR ? 50 : 25}
          origin={{ x: screenWidth / 2, y: -10 }}
          autoStart={true}
          fallSpeed={2500}
          fadeOut={true}
          onAnimationEnd={() => setShowConfetti(false)}
        />
      )}

      <View style={styles.header}>
        {readOnly ? (
          <TactileButton
            variant="icon"
            size="sm"
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Close summary"
          >
            <AppIcon icon={X} size={16} color={tokens.text.primary} />
          </TactileButton>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <TactileButton
          variant="icon"
          size="sm"
          style={styles.shareHeaderBtn}
          onPress={handleShareWorkout}
          accessibilityLabel="Share workout summary"
        >
          <AppIcon icon={Share2} size={16} color={tokens.text.primary} />
        </TactileButton>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, readOnly && { paddingBottom: Math.max(tokens.space.xl, insets.bottom + 24) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.badgeHalo}>
            <LinearGradient
              colors={tokens.gradients.canvasGlow}
              style={styles.haloGradient}
            >
              <LinearGradient colors={tokens.gradients.surfaceSheen} style={styles.badgeWrapper}>
                <AppIcon icon={Trophy} size={26} color={tokens.accent.primary} />
              </LinearGradient>
            </LinearGradient>
          </View>
          <View style={styles.sessionPill}>
            <View style={styles.pulseDot} />
            <Text style={styles.sessionPillText}>
              {sessionData.isQuickCheckIn ? 'QUICK CHECK-IN' : 'SESSION LOGGED'}
            </Text>
          </View>
          <Text style={styles.heroTitle}>{readOnly ? (targetDate ? formatIndianDatePretty(targetDate) : 'Session Summary') : 'Workout Complete'}</Text>
          <Text style={styles.heroSubtitle}>
            {sessionData.isQuickCheckIn
              ? 'Session marked complete — no working weights recorded.'
              : readOnly
              ? 'Recorded workout overview'
              : 'All completed sets and records saved.'}
          </Text>
        </View>

        {/* PR Card */}
        {isPR && newPR && (
          <Animated.View style={prStyle}>
            <View style={styles.prCard}>
              <View style={styles.prIconBox}>
                <AppIcon icon={Flame} size={20} color={tokens.status.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.prTag}>
                  {detectedPR && detectedPR.length > 1 ? `NEW PERSONAL RECORDS (${detectedPR.length})` : 'NEW PERSONAL RECORD'}
                </Text>
                <Text style={styles.prText}>
                  {detectedPR && detectedPR.length > 1
                    ? detectedPR.map(p => `${p.name} — ${formatWeight(p.weight, unitIsLbs, 1)}${p.type === '1RM' ? ' e1RM' : ''}`).join(' · ')
                    : `${newPR.name} — ${formatWeight(newPR.weight, unitIsLbs, 1)}`}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Unified 4-Column Hairline KPI Strip (Zero separate grey stat boxes) */}
        <View style={styles.statsStripCard}>
          <View style={styles.statCol}>
            {sessionData.duration > 0 ? (
              <RollingNumber
                value={sessionData.duration}
                suffix="m"
                replayKey={isTransitionComplete ? 1 : 0}
                cycles={1}
                durationMs={520}
                style={styles.statNumber}
              />
            ) : (
              <NumericText style={styles.statNumber}>--</NumericText>
            )}
            <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.15}>TIME</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <RollingNumber
              value={sessionData.performedCount || sessionData.exercises.length}
              replayKey={isTransitionComplete ? 1 : 0}
              cycles={0}
              durationMs={440}
              style={styles.statNumber}
            />
            <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.15}>{sessionData.isQuickCheckIn ? 'PLANNED' : 'LIFTS'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <RollingNumber
              value={sessionData.totalSets}
              replayKey={isTransitionComplete ? 1 : 0}
              cycles={1}
              durationMs={540}
              style={styles.statNumber}
            />
            <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.15}>SETS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <RollingNumber
              value={formatVolumeParts(sessionData.totalVolume, unitIsLbs).numStr}
              replayKey={isTransitionComplete ? 1 : 0}
              cycles={1}
              durationMs={620}
              style={styles.statNumber}
            />
            <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.15}>{unitLabel(unitIsLbs).toUpperCase()} VOL</Text>
          </View>
        </View>

        {/* Session Exercises Ledger */}
        {sessionData.exercises.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {sessionData.isQuickCheckIn ? 'SESSION MOVEMENTS' : 'PERFORMED EXERCISES'} · {sessionData.exercises.length}
              </Text>
            </View>
            <View style={styles.exercisesList}>
              {displayedExercises.map((ex, index) => (
                <TactileButton
                  variant="custom"
                  key={index}
                  style={[
                    styles.exerciseCard,
                    index === displayedExercises.length - 1 && !(!showAllExercises && remainingCount > 0)
                      ? { borderBottomWidth: 0 }
                      : null,
                  ]}
                  onPress={() => {
                    feedback.tap();
                    setDeepDiveEx(ex.name);
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <Text style={styles.exerciseName} numberOfLines={1}>{ex.name}</Text>
                    <NumericText style={styles.exerciseMetaBadge}>
                      {ex.plannedOnly
                        ? `${ex.sets} planned sets`
                        : `${ex.sets} sets${ex.maxWeight > 0 ? ` · Top ${formatWeight(ex.maxWeight, unitIsLbs, 1)}` : ` · ${ex.reps} reps`}`}
                    </NumericText>
                  </View>
                  {ex.maxWeight > 0 && (
                    <NumericText style={styles.exerciseMetaWeight}>{formatWeight(ex.maxWeight, unitIsLbs, 1)}</NumericText>
                  )}
                </TactileButton>
              ))}
              {!showAllExercises && remainingCount > 0 && (
                <TactileButton variant="custom" style={styles.expandBtn} onPress={() => setShowAllExercises(true)}>
                  <Text style={styles.expandBtnText}>Show {remainingCount} more exercises</Text>
                  <AppIcon icon={ChevronDown} size={14} color={tokens.accent.primary} />
                </TactileButton>
              )}
            </View>
          </View>
        )}

        {isTransitionComplete && availableLifts.length > 0 && (chartData?.datasets?.[0]?.data?.length || 0) >= 2 && (
          <WorkoutSummaryProgressionChart
            availableLifts={availableLifts}
            selectedLift={selectedLift}
            setSelectedLift={setSelectedLift}
            selectedMetric={selectedMetric}
            setSelectedMetric={setSelectedMetric}
            chartData={chartData}
            streakStyle={streakStyle}
            styles={styles}
            isDark={isDark}
            replayKey={isTransitionComplete ? 1 : 0}
          />
        )}

        {sessionData.notes ? (
          <View style={styles.notesContainer}>
            <View style={styles.sectionHeaderRow}><Text style={styles.sectionTitle}>NOTES</Text></View>
            <Text style={styles.notesText}>{sessionData.notes}</Text>
          </View>
        ) : null}

        {programmeWeekPrompt && (
          <View
            style={[
              styles.prCard,
              {
                borderColor: tokens.accent.primary,
                flexDirection: 'column',
                alignItems: 'stretch',
                marginTop: 12,
                gap: 10,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.prIconBox, { backgroundColor: tokens.accent.primaryDim }]}>
                <AppIcon icon={CheckCircle2} size={18} color={tokens.accent.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.prTag, { color: tokens.accent.primary }]}>
                  MESOCYCLE WEEK {programmeWeekPrompt.programme.currentWeek}/{programmeWeekPrompt.programme.totalWeeks} COMPLETE
                </Text>
                <Text style={styles.prText}>
                  {programmeWeekPrompt.isFinalWeek
                    ? `Finished all ${programmeWeekPrompt.programme.totalWeeks} weeks of ${programmeWeekPrompt.programme.name}`
                    : `Ready for Week ${programmeWeekPrompt.programme.currentWeek + 1}: ${programmeWeekPrompt.nextWeekName}`}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {programmeWeekPrompt.isFinalWeek ? (
                <>
                  <TactileButton
                    variant="secondary"
                    size="sm"
                    disabled={advancingProgrammeWeek}
                    style={{ flex: 1, height: 38, borderRadius: 10 }}
                    onPress={() => handleAdvanceProgrammeWeek('restart')}
                  >
                    <Text style={[styles.shareBtnText, { fontSize: 13 }]}>Restart W1</Text>
                  </TactileButton>
                  <TactileButton
                    variant="primary"
                    size="sm"
                    disabled={advancingProgrammeWeek}
                    style={{ flex: 1.4, height: 38, borderRadius: 10 }}
                    onPress={() => handleAdvanceProgrammeWeek('finish')}
                  >
                    <Text style={[styles.doneBtnText, { fontSize: 13 }]}>
                      {advancingProgrammeWeek ? 'Saving...' : 'Finish Plan'}
                    </Text>
                  </TactileButton>
                </>
              ) : (
                <TactileButton
                  variant="primary"
                  size="sm"
                  disabled={advancingProgrammeWeek}
                  style={{ flex: 1, height: 38, borderRadius: 10 }}
                  onPress={() => handleAdvanceProgrammeWeek('advance')}
                >
                  <Text style={[styles.doneBtnText, { fontSize: 13 }]}>
                    {advancingProgrammeWeek
                      ? 'Advancing...'
                      : `Start Week ${programmeWeekPrompt.programme.currentWeek + 1} →`}
                  </Text>
                </TactileButton>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {!readOnly && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
          <View style={styles.footerRow}>
            <TactileButton
              variant="secondary"
              size="lg"
              style={styles.shareBtn}
              onPress={handleShareWorkout}
            >
              <AppIcon icon={Share2} size={16} color={tokens.text.primary} />
              <Text style={styles.shareBtnText}>Share</Text>
            </TactileButton>

            <TactileButton
              variant="primary"
              size="lg"
              haptic="success"
              style={styles.doneBtn}
              onPress={() => {
                feedback.success();
                if (navigation.canGoBack()) {
                  (navigation as any).popToTop();
                } else {
                  (navigation as any).navigate('MainTabs', { screen: 'Today' });
                }
              }}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TactileButton>
          </View>
        </View>
      )}
      <LazySheet
        visible={Boolean(deepDiveEx)}
        render={() => (
          <ExerciseDeepDiveModal
            visible={Boolean(deepDiveEx)}
            exerciseName={deepDiveEx}
            gymLogs={gymLogs || []}
            initialTab="analytics"
            onClose={() => setDeepDiveEx(null)}
          />
        )}
      />
    </ScreenWrapper>
  );
}
