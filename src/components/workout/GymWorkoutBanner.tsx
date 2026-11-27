import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Flame, Play, RotateCcw } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { hapticMedium } from '../../utils/haptics';
import { resolveExerciseTargetMuscle } from '../../utils/gymUtils';
import PreSessionMuscleHitMap from '../Gym/schedule/PreSessionMuscleHitMap';
import WorkoutTimer from './WorkoutTimer';
import { TactileButton } from '../ui/TactileButton';
import { NumericText } from '../ui/NumericText';
import { AppIcon } from '../ui/AppIcon';
import { formatVolumeParts, useWeightUnit } from '../../utils/weightUnit';

export interface GymWorkoutBannerProps {
  log: any;
  s?: any;
  currentStreak: number;
  selectedDate: string;
  animBanner?: any;
  navigation: any;
  onStartWorkout: () => void;
  onResumeWorkout: () => void;
  onEndWorkout: (completed: boolean) => void;
  resumeWorkout?: () => void;
  onRevertWorkout?: () => void;
  routineTitle?: string;
  routineFocus?: string;
  exercises?: any[];
  lastTrainedDaysAgo?: number | null;
  exerciseCount?: number;
  setsCount?: number;
  estimatedMinutes?: number;
  replayKey?: number | string;
}

export const GymWorkoutBanner: React.FC<GymWorkoutBannerProps> = React.memo(
  ({
    log,
    currentStreak,
    selectedDate,
    navigation,
    onStartWorkout,
    onResumeWorkout,
    onEndWorkout,
    onRevertWorkout,
    routineTitle = 'Workout Day',
    routineFocus = 'Hypertrophy Training',
    exercises,
    lastTrainedDaysAgo = null,
    exerciseCount = 0,
    setsCount = 0,
    estimatedMinutes = 45,
    replayKey = 0,
  }) => {
    const { tokens, isDark } = useTheme();
    const unitIsLbs = useWeightUnit();
    const [pendingAction, setPendingAction] = useState<'revert' | 'finish' | null>(null);

    const effectiveExercises = useMemo(() => {
      if (log?.exercises && log.exercises.length > 0) return log.exercises;
      return exercises || [];
    }, [log?.exercises, exercises]);

    const isCompleted = Boolean(
      !log?.workoutStartTime &&
        ((log as any)?.completed ||
          (typeof log?.workoutDurationMinutes === 'number' &&
            log.workoutDurationMinutes > 0))
    );

    const {
      hasLoggedAnyWork,
      completedSetsTotal,
      completedExercisesTotal,
      completedVolumeKg,
    } = useMemo(() => {
      let setsTotal = 0;
      let exTotal = 0;
      let volKg = 0;
      (log?.exercises || []).forEach((ex: any) => {
        let exDone = 0;
        (ex?.setsLog || []).forEach((s: any) => {
          if (!s?.completed) return;
          exDone++;
          setsTotal++;
          const w = Number(s.weight ?? s.weightKg ?? 0);
          const r = Number(s.reps ?? 0);
          if (w > 0 && r > 0) volKg += w * r;
        });
        if (exDone > 0) exTotal++;
      });
      const hasCardio = (log?.cardio || []).some((c: any) => Boolean(c?.completed));
      return {
        hasLoggedAnyWork: setsTotal > 0 || hasCardio,
        completedSetsTotal: setsTotal,
        completedExercisesTotal: exTotal,
        completedVolumeKg: volKg,
      };
    }, [log?.exercises, log?.cardio]);

    const cleanTitle = useMemo(
      () => routineTitle.replace(/[()]/g, '').trim() || 'Workout Day',
      [routineTitle]
    );

    const displayedFocus = useMemo(() => {
      if (
        routineFocus &&
        !routineFocus.includes(',') &&
        routineFocus !== 'Hypertrophy Training' &&
        routineFocus !== 'Daily Workout'
      ) {
        return routineFocus;
      }
      if (effectiveExercises.length > 0) {
        const counts: Record<string, number> = {};
        effectiveExercises.forEach((ex: any) => {
          const { canonicalGroup } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
          if (canonicalGroup && canonicalGroup !== 'Mixed' && canonicalGroup !== 'Other') {
            counts[canonicalGroup] =
              (counts[canonicalGroup] || 0) + (ex.setsLog?.length || 3);
          }
        });
        const top = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([m]) => m);
        if (top.length >= 2) return top.slice(0, 3).join(' · ');
        if (top.length === 1) return `${top[0]} Focus`;
      }
      return routineFocus || 'Workout Session';
    }, [routineFocus, effectiveExercises]);

    const headerSubtitle = useMemo(() => {
      if (lastTrainedDaysAgo !== null && lastTrainedDaysAgo !== undefined) {
        if (lastTrainedDaysAgo === 0) return 'Trained earlier · Ready again';
        if (lastTrainedDaysAgo === 1) return 'Last trained yesterday';
        return `Last trained ${lastTrainedDaysAgo}d ago`;
      }
      return displayedFocus;
    }, [lastTrainedDaysAgo, displayedFocus]);

    const cardStyle = [
      styles.heroCard,
      {
        backgroundColor: isDark ? '#0F1015' : tokens.bg.surface,
        borderRadius: 20,
        padding: tokens.space.md,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : tokens.border.subtle,
      },
    ];

    const sheenGradient = (
      <LinearGradient
        pointerEvents="none"
        colors={isDark ? ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0.6)', 'rgba(255,255,255,0)']}
        style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
      />
    );

    const incompleteCount = useMemo(() => {
      return (log?.exercises || []).filter((ex: any) => {
        const total = ex.setsLog?.length || 0;
        const done = (ex.setsLog || []).filter((s: any) => s.completed).length;
        return total === 0 || done < total;
      }).length;
    }, [log?.exercises]);

    // 1. Completed Workout Surface
    if (isCompleted) {
      const volumeSuffix =
        completedVolumeKg > 0 ? ` · ${formatVolumeParts(completedVolumeKg, unitIsLbs).full}` : '';
      const completedSummarySub = hasLoggedAnyWork
        ? `${log?.workoutDurationMinutes || 1}m · ${completedExercisesTotal} ex · ${completedSetsTotal} sets${volumeSuffix}`
        : `${log?.workoutDurationMinutes ? `${log.workoutDurationMinutes}m quick check-in` : 'Session marked complete'}`;

      return (
        <View style={cardStyle}>
          {sheenGradient}
          <View style={styles.topRow}>
            <View style={[styles.completedHeader, styles.flexOne]}>
              <View
                style={[
                  styles.completedIconWrap,
                  { backgroundColor: tokens.status.success },
                ]}
              >
                <AppIcon icon={Check} size={15} color={tokens.status.onSuccess} />
              </View>
              <View style={styles.flexOne}>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[tokens.typography.title, { color: tokens.text.primary }]}
                >
                  Workout Completed
                </Text>
                <NumericText
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[
                    tokens.typography.caption,
                    { color: tokens.text.secondary, marginTop: 2 },
                  ]}
                >
                  {completedSummarySub}
                </NumericText>
              </View>
            </View>

            {currentStreak > 0 && (
              <View style={styles.streakInline}>
                <AppIcon icon={Flame} size={14} color={tokens.status.warning} />
                <NumericText style={[styles.streakText, { color: tokens.status.warning }]}>
                  {currentStreak}d
                </NumericText>
              </View>
            )}
          </View>

          {pendingAction === 'revert' ? (
            <View
              style={[
                styles.inlineConfirmBar,
                { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : tokens.border.subtle },
              ]}
            >
              <Text style={[tokens.typography.caption, { color: tokens.text.secondary }]}>
                Reset status back to Start Workout?
              </Text>
              <View style={styles.confirmActionsRow}>
                <TactileButton
                  variant="secondary"
                  size="sm"
                  onPress={() => setPendingAction(null)}
                  style={[styles.flexOne, { minHeight: 36 }]}
                >
                  <Text style={[tokens.typography.caption, { color: tokens.text.primary }]} numberOfLines={1}>
                    Cancel
                  </Text>
                </TactileButton>
                <TactileButton
                  variant="custom"
                  size="sm"
                  haptic="medium"
                  onPress={() => {
                    hapticMedium();
                    setPendingAction(null);
                    onRevertWorkout?.();
                  }}
                  style={[
                    styles.flexOne,
                    {
                      minHeight: 36,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: tokens.status.warningDim,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                  ]}
                >
                  <Text
                    style={[tokens.typography.caption, { fontFamily: tokens.font.bold, color: tokens.status.warning }]}
                    numberOfLines={1}
                  >
                    Revert
                  </Text>
                </TactileButton>
              </View>
            </View>
          ) : (
            <View style={styles.completedActions}>
              {!hasLoggedAnyWork && onRevertWorkout ? (
                <TactileButton
                  variant="secondary"
                  size="md"
                  haptic="medium"
                  onPress={() => setPendingAction('revert')}
                >
                  <Text style={[tokens.typography.label, { color: tokens.status.warning }]}>
                    Revert
                  </Text>
                </TactileButton>
              ) : (
                <>
                  {onRevertWorkout && (
                    <TactileButton
                      variant="secondary"
                      size="md"
                      haptic="medium"
                      onPress={() => setPendingAction('revert')}
                      accessibilityLabel="Revert workout session"
                      style={{ paddingHorizontal: 12 }}
                    >
                      <AppIcon icon={RotateCcw} size={15} color={tokens.status.warning} />
                    </TactileButton>
                  )}
                  <TactileButton
                    variant="secondary"
                    size="md"
                    haptic="medium"
                    onPress={() => {
                      navigation.navigate('ActiveLogging', { date: selectedDate, autoStart: 'resume' });
                    }}
                  >
                    <Text style={[tokens.typography.label, { color: tokens.status.success }]}>
                      Resume
                    </Text>
                  </TactileButton>
                </>
              )}

              <TactileButton
                variant="primary"
                size="md"
                style={styles.flexOne}
                onPress={() => navigation.navigate('WorkoutSummary', { date: selectedDate, readOnly: true, log })}
              >
                <Text
                  style={[
                    tokens.typography.label,
                    { fontFamily: tokens.font.bold, color: tokens.accent.onPrimary },
                  ]}
                  numberOfLines={1}
                >
                  View Summary
                </Text>
              </TactileButton>
            </View>
          )}
        </View>
      );
    }

    // 2. Active / In-Progress Surface
    if (log?.workoutStartTime) {
      const effectiveTotalSets =
        setsCount > 0
          ? setsCount
          : effectiveExercises.reduce((sum: number, ex: any) => sum + (ex?.setsLog?.length || 3), 0);
      const livePct =
        effectiveTotalSets > 0 ? Math.min(100, Math.round((completedSetsTotal / effectiveTotalSets) * 100)) : 0;
      const liveVolumeText =
        completedVolumeKg > 0 ? ` · ${formatVolumeParts(completedVolumeKg, unitIsLbs).full}` : '';

      return (
        <View style={cardStyle}>
          {sheenGradient}
          <View style={styles.topRow}>
            <View style={styles.flexOne}>
              <View style={styles.activeLivePill}>
                <View
                  style={[
                    styles.livePulseDot,
                    { backgroundColor: tokens.accent.primary },
                  ]}
                />
                <Text
                  style={[
                    tokens.typography.overline,
                    { color: tokens.accent.primary },
                  ]}
                >
                  LIVE SESSION
                </Text>
              </View>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  tokens.typography.title,
                  { color: tokens.text.primary, marginTop: 4 },
                ]}
              >
                {cleanTitle}
              </Text>
            </View>
            <View
              style={[
                styles.timerWrap,
                {
                  backgroundColor: tokens.accent.primaryDim,
                  borderRadius: tokens.radius.sm,
                  flexShrink: 0,
                },
              ]}
            >
              <WorkoutTimer startTime={log.workoutStartTime} />
            </View>
          </View>

          {effectiveTotalSets > 0 && pendingAction !== 'finish' && (
            <View style={styles.liveProgressRow}>
              <View
                style={[
                  styles.liveProgressTrack,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : tokens.border.subtle },
                ]}
              >
                <View
                  style={[
                    styles.liveProgressFill,
                    {
                      width: `${livePct}%`,
                      backgroundColor: tokens.accent.primary,
                    },
                  ]}
                />
              </View>
              <NumericText
                numberOfLines={1}
                style={[styles.liveProgressText, { color: tokens.text.secondary }]}
              >
                {completedSetsTotal}/{effectiveTotalSets} sets{liveVolumeText}
              </NumericText>
            </View>
          )}

          {pendingAction === 'finish' ? (
            <View
              style={[
                styles.inlineConfirmBar,
                { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : tokens.border.subtle },
              ]}
            >
              <Text style={[tokens.typography.caption, { color: tokens.text.secondary }]}>
                {incompleteCount > 0 ? `${incompleteCount} exercises unfinished. End now?` : 'Save and finish session?'}
              </Text>
              <View style={styles.confirmActionsRow}>
                <TactileButton
                  variant="secondary"
                  size="sm"
                  onPress={() => setPendingAction(null)}
                  style={[styles.flexOne, { minHeight: 36 }]}
                >
                  <Text style={[tokens.typography.caption, { color: tokens.text.primary }]} numberOfLines={1}>
                    Back
                  </Text>
                </TactileButton>
                <TactileButton
                  variant="custom"
                  size="sm"
                  haptic="medium"
                  onPress={() => {
                    hapticMedium();
                    setPendingAction(null);
                    onEndWorkout(true);
                    navigation.navigate('WorkoutSummary', { date: selectedDate, log });
                  }}
                  style={[
                    styles.flexOne,
                    {
                      minHeight: 36,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: tokens.accent.crimsonDim,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                  ]}
                >
                  <Text
                    style={[tokens.typography.caption, { fontFamily: tokens.font.bold, color: tokens.accent.crimson }]}
                    numberOfLines={1}
                  >
                    End & Save
                  </Text>
                </TactileButton>
              </View>
            </View>
          ) : (
            <View style={styles.completedActions}>
              <TactileButton
                variant="secondary"
                size="md"
                haptic="medium"
                onPress={() => {
                  if (incompleteCount > 0) {
                    setPendingAction('finish');
                  } else {
                    onEndWorkout(true);
                    navigation.navigate('WorkoutSummary', { date: selectedDate, log });
                  }
                }}
              >
                <Text style={[tokens.typography.label, { color: tokens.accent.crimson }]}>
                  Finish
                </Text>
              </TactileButton>

              <TactileButton
                variant="primary"
                size="md"
                haptic="medium"
                style={styles.flexOne}
                onPress={onResumeWorkout}
              >
                <AppIcon icon={Play} size={15} color={tokens.accent.onPrimary} />
                <Text
                  style={[
                    tokens.typography.label,
                    { fontFamily: tokens.font.bold, color: tokens.accent.onPrimary },
                  ]}
                  numberOfLines={1}
                >
                  Resume Workout
                </Text>
              </TactileButton>
            </View>
          )}
        </View>
      );
    }

    // 3. Not Started Surface
    return (
      <View style={cardStyle}>
        {sheenGradient}
        <View style={styles.topRow}>
          <View style={[styles.flexOne, { paddingRight: 6 }]}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[tokens.typography.title, { color: tokens.text.primary }]}
            >
              {cleanTitle}
            </Text>
            {Boolean(headerSubtitle) && (
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  tokens.typography.caption,
                  { color: tokens.text.secondary, marginTop: 2 },
                ]}
              >
                {headerSubtitle}
              </Text>
            )}
          </View>

          <TactileButton
            lightweight
            variant="primary"
            size="sm"
            haptic="heavy"
            onPress={onStartWorkout}
            style={styles.headerStartBtn}
          >
            <AppIcon icon={Play} size={13} color={tokens.accent.onPrimary} />
            <Text
              style={[
                tokens.typography.label,
                {
                  fontFamily: tokens.font.bold,
                  fontSize: 13.5,
                  color: tokens.accent.onPrimary,
                  includeFontPadding: false,
                },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
            >
              Start Workout
            </Text>
          </TactileButton>
        </View>

        {effectiveExercises.length > 0 && (
          <PreSessionMuscleHitMap
            exercises={effectiveExercises}
            isRest={false}
            compact={false}
            showMiniAvatar={true}
            title={cleanTitle}
            exerciseCount={exerciseCount > 0 ? exerciseCount : effectiveExercises.length}
            totalSets={setsCount}
            estimatedMinutes={estimatedMinutes}
            replayKey={replayKey}
          />
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
    minWidth: 0,
  },
  heroCard: {
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    alignSelf: 'stretch',
  },
  streakInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  streakText: {
    fontSize: 13,
  },
  headerStartBtn: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexShrink: 0,
  },
  inlineConfirmBar: {
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completedIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  liveProgressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  liveProgressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  liveProgressText: {
    fontSize: 11.5,
    flexShrink: 0,
  },
  timerWrap: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});

export default GymWorkoutBanner;
