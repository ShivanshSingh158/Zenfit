import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Flame, Play } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { hapticMedium } from '../../utils/haptics';
import { resolveExerciseTargetMuscle } from '../../utils/gymUtils';
import PreSessionMuscleHitMap from '../Gym/schedule/PreSessionMuscleHitMap';
import WorkoutTimer from './WorkoutTimer';
import { TactileButton } from '../ui/TactileButton';
import { NumericText } from '../ui/NumericText';
import { RollingNumber } from '../ui/RollingNumber';
import { AppIcon } from '../ui/AppIcon';

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
  resumeWorkout: () => void;
  onRevertWorkout?: () => void;
  routineTitle?: string;
  routineFocus?: string;
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
    resumeWorkout,
    onRevertWorkout,
    routineTitle = 'Workout Day',
    routineFocus = 'Hypertrophy Training',
    exerciseCount = 0,
    setsCount = 0,
    estimatedMinutes = 45,
    replayKey = 0,
  }) => {
    const { tokens, isDark } = useTheme();
    const [pendingAction, setPendingAction] = useState<'revert' | 'finish' | null>(null);

    const isCompleted = Boolean(
      !log?.workoutStartTime &&
        ((log as any)?.completed ||
          (typeof log?.workoutDurationMinutes === 'number' &&
            log.workoutDurationMinutes > 0))
    );

    const { hasLoggedAnyWork, completedSetsTotal, completedExercisesTotal } = useMemo(() => {
      let setsTotal = 0;
      let exTotal = 0;
      (log?.exercises || []).forEach((ex: any) => {
        const doneSets = (ex?.setsLog || []).filter((s: any) => Boolean(s?.completed)).length;
        if (doneSets > 0) {
          setsTotal += doneSets;
          exTotal++;
        }
      });
      const hasCardio = (log?.cardio || []).some((c: any) => Boolean(c?.completed));
      return {
        hasLoggedAnyWork: setsTotal > 0 || hasCardio,
        completedSetsTotal: setsTotal,
        completedExercisesTotal: exTotal,
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
      const exercisesList = log?.exercises || [];
      if (exercisesList.length > 0) {
        const counts: Record<string, number> = {};
        exercisesList.forEach((ex: any) => {
          const { canonicalGroup } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
          if (canonicalGroup && canonicalGroup !== 'Mixed' && canonicalGroup !== 'Other') {
            counts[canonicalGroup] =
              (counts[canonicalGroup] || 0) + (ex.setsLog?.length || 3);
          }
        });
        const top = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([m]) => m);
        if (top.length >= 2) return `${top[0]} & ${top[1]}`;
        if (top.length === 1) return `${top[0]} Focus`;
      }
      return routineFocus || 'Workout Session';
    }, [routineFocus, log?.exercises]);

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
      const completedSummarySub = hasLoggedAnyWork
        ? `${log?.workoutDurationMinutes || 1}m · ${completedExercisesTotal} ex · ${completedSetsTotal} sets`
        : `${log?.workoutDurationMinutes ? `${log.workoutDurationMinutes}m quick check-in` : 'Session marked complete'}`;

      return (
        <View style={cardStyle}>
          {sheenGradient}
          <View style={styles.topRow}>
            <View style={styles.completedHeader}>
              <View
                style={[
                  styles.completedIconWrap,
                  { backgroundColor: tokens.status.success },
                ]}
              >
                <AppIcon icon={Check} size={15} color={tokens.status.onSuccess} />
              </View>
              <View>
                <Text style={[tokens.typography.title, { color: tokens.text.primary }]}>
                  Workout Completed
                </Text>
                <NumericText
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
              <Text style={[tokens.typography.caption, { color: tokens.text.secondary, flex: 1 }]}>
                Reset status back to Start Workout?
              </Text>
              <TactileButton
                variant="secondary"
                size="sm"
                onPress={() => setPendingAction(null)}
                style={{ minHeight: 34, paddingHorizontal: 12 }}
              >
                <Text style={[tokens.typography.caption, { color: tokens.text.primary }]}>Cancel</Text>
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
                style={{
                  minHeight: 34,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: tokens.status.warningDim,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={[tokens.typography.caption, { fontFamily: tokens.font.bold, color: tokens.status.warning }]}>
                  Revert
                </Text>
              </TactileButton>
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
                <TactileButton
                  variant="secondary"
                  size="md"
                  haptic="medium"
                  onPress={() => {
                    resumeWorkout();
                    navigation.navigate('ActiveLogging', { date: selectedDate });
                  }}
                >
                  <Text style={[tokens.typography.label, { color: tokens.status.success }]}>
                    Resume
                  </Text>
                </TactileButton>
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
                },
              ]}
            >
              <WorkoutTimer startTime={log.workoutStartTime} />
            </View>
          </View>

          {pendingAction === 'finish' ? (
            <View
              style={[
                styles.inlineConfirmBar,
                { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : tokens.border.subtle },
              ]}
            >
              <Text style={[tokens.typography.caption, { color: tokens.text.secondary, flex: 1 }]}>
                {incompleteCount > 0 ? `${incompleteCount} exercises unfinished. End now?` : 'Save and finish session?'}
              </Text>
              <TactileButton
                variant="secondary"
                size="sm"
                onPress={() => setPendingAction(null)}
                style={{ minHeight: 34, paddingHorizontal: 10 }}
              >
                <Text style={[tokens.typography.caption, { color: tokens.text.primary }]}>Back</Text>
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
                style={{
                  minHeight: 34,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: tokens.accent.crimsonDim,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={[tokens.typography.caption, { fontFamily: tokens.font.bold, color: tokens.accent.crimson }]}>
                  End & Save
                </Text>
              </TactileButton>
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
          <View style={[styles.flexOne, { minWidth: 0, paddingRight: 8 }]}>
            <Text
              numberOfLines={1}
              style={[tokens.typography.title, { color: tokens.text.primary }]}
            >
              {cleanTitle}
            </Text>
            {(Boolean(displayedFocus) || currentStreak > 0) && (
              <View style={styles.focusMetaRow}>
                {Boolean(displayedFocus) && (
                  <Text
                    numberOfLines={1}
                    style={[
                      tokens.typography.caption,
                      { color: tokens.text.secondary, flexShrink: 1 },
                    ]}
                  >
                    {displayedFocus}
                  </Text>
                )}
                {currentStreak > 0 && (
                  <View style={styles.streakInlineCompact}>
                    {Boolean(displayedFocus) && (
                      <Text style={[tokens.typography.caption, { color: tokens.text.muted }]}>
                        ·
                      </Text>
                    )}
                    <AppIcon icon={Flame} size={12} color={tokens.status.warning} />
                    <RollingNumber
                      value={currentStreak}
                      suffix="d"
                      replayKey={replayKey}
                      cycles={0}
                      durationMs={420}
                      style={[styles.streakCompactText, { color: tokens.status.warning }]}
                    />
                  </View>
                )}
              </View>
            )}
          </View>

          <TactileButton
            variant="primary"
            size="md"
            haptic="heavy"
            onPress={onStartWorkout}
            hitSlop={4}
            style={styles.topStartBtn}
          >
            <AppIcon icon={Play} size={14} color={tokens.accent.onPrimary} />
            <Text
              style={[
                tokens.typography.label,
                { fontFamily: tokens.font.bold, fontSize: 13, color: tokens.accent.onPrimary },
              ]}
              numberOfLines={1}
            >
              Start Workout
            </Text>
          </TactileButton>
        </View>

        {log?.exercises && log.exercises.length > 0 && (
          <PreSessionMuscleHitMap
            exercises={log.exercises}
            isRest={false}
            compact={false}
            showMiniAvatar={true}
            title={cleanTitle}
            exerciseCount={exerciseCount}
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
  },
  heroCard: {
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  streakInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    fontSize: 13,
  },
  focusMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
    minWidth: 0,
  },
  streakInlineCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  streakCompactText: {
    fontSize: 12,
  },
  topStartBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    flexShrink: 0,
  },
  inlineConfirmBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
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
  timerWrap: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});

export default GymWorkoutBanner;
