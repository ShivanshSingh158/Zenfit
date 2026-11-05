import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WorkoutTimer from './WorkoutTimer';
import { IOS_DARK, FONT_FAMILY } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { hapticLight, hapticMedium } from '../../../utils/haptics';
import PreSessionMuscleHitMap from '../schedule/PreSessionMuscleHitMap';

export interface GymWorkoutBannerProps {
  log: any;
  s: any;
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
}

export const GymWorkoutBanner: React.FC<GymWorkoutBannerProps> = React.memo(({
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
}) => {
  const { colors, isDark } = useTheme();

  const isCompleted = Boolean(
    (log as any)?.completed ||
    (typeof log?.workoutDurationMinutes === 'number' && log.workoutDurationMinutes > 0 && !log?.workoutStartTime)
  );

  const hasLoggedAnyWork = useMemo(() => {
    const hasExerciseSet = (log?.exercises || []).some((ex: any) =>
      (ex?.setsLog || []).some((s: any) => Boolean(s?.completed))
    );
    const hasCardio = (log?.cardio || []).some((c: any) => Boolean(c?.completed));
    return hasExerciseSet || hasCardio;
  }, [log?.exercises, log?.cardio]);

  // ─── 1. COMPLETED WORKOUT SURFACE ──────────────────────────────────────────
  if (isCompleted) {
    return (
      <View style={[styles.heroCard, { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface }]}>
        <View style={styles.topRow}>
          <View style={styles.completedHeader}>
            <View style={styles.completedIconWrap}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
            <View>
              <Text style={[styles.heroTitle, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}>
                Workout Completed
              </Text>
              <Text style={[styles.heroMeta, { color: isDark ? IOS_DARK.labelSecondary : colors.textMuted }]}>
                {log?.workoutDurationMinutes ? `${log.workoutDurationMinutes} min session logged` : 'Session completed'}
              </Text>
            </View>
          </View>

          {currentStreak > 0 && (
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={14} color={IOS_DARK.orange} />
              <Text style={styles.streakText}>{currentStreak}d</Text>
            </View>
          )}
        </View>

        <View style={styles.completedActions}>
          {!hasLoggedAnyWork && onRevertWorkout ? (
            <TouchableOpacity
              onPress={() => {
                hapticMedium();
                Alert.alert(
                  'Revert Workout?',
                  'No sets were logged. Revert session time and return to Start Workout?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Revert',
                      style: 'destructive',
                      onPress: () => {
                        hapticMedium();
                        onRevertWorkout();
                      },
                    },
                  ]
                );
              }}
              style={[styles.outlineBtn, { backgroundColor: isDark ? '#2C2C2E' : 'rgba(0, 0, 0, 0.05)', borderColor: isDark ? 'rgba(255,159,10,0.3)' : 'rgba(255,159,10,0.4)' }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.outlineBtnText, { color: IOS_DARK.orange }]}>Revert</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                hapticMedium();
                resumeWorkout();
                navigation.navigate('ActiveLogging', { date: selectedDate });
              }}
              style={[styles.outlineBtn, { backgroundColor: isDark ? '#2C2C2E' : 'rgba(0, 0, 0, 0.05)', borderColor: isDark ? 'rgba(48,209,88,0.35)' : 'rgba(48,209,88,0.4)' }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.outlineBtnText, { color: IOS_DARK.green }]}>Resume Workout</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => {
              hapticLight();
              navigation.navigate('WorkoutSummary', { date: selectedDate });
            }}
            style={[styles.primarySolidBtn, { flex: 1, backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.primarySolidBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
              View Summary
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── 2. ACTIVE / IN-PROGRESS SURFACE ───────────────────────────────────────
  if (log?.workoutStartTime) {
    return (
      <View style={[styles.heroCard, { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface }]}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.activeLivePill}>
              <View style={styles.livePulseDot} />
              <Text style={styles.activeLiveText}>WORKOUT IN PROGRESS</Text>
            </View>
            <Text style={[styles.heroTitle, { marginTop: 2, color: isDark ? '#FFFFFF' : colors.textPrimary }]}>
              {routineTitle}
            </Text>
          </View>
          <View style={styles.timerWrap}>
            <WorkoutTimer startTime={log.workoutStartTime} />
          </View>
        </View>

        <View style={styles.completedActions}>
          <TouchableOpacity
            onPress={() => {
              hapticMedium();
              const incompleteExercises = (log?.exercises || [])
                .map((ex: any, idx: number) => {
                  const totalSets = ex.setsLog?.length || 0;
                  const completedSets = (ex.setsLog || []).filter((s: any) => s.completed).length;
                  return {
                    index: idx,
                    name: ex.name,
                    totalSets,
                    completedSets,
                  };
                })
                .filter((item: any) => item.completedSets < item.totalSets || item.totalSets === 0);

              if (incompleteExercises.length > 0) {
                const firstUnfinished = incompleteExercises[0];
                const count = incompleteExercises.length;
                const summaryList = incompleteExercises
                  .slice(0, 4)
                  .map((e: any) => `• ${e.name} (${e.completedSets}/${e.totalSets} sets done)`)
                  .join('\n');
                const extraCount = count > 4 ? `\n...and ${count - 4} more` : '';

                Alert.alert(
                  count === 1 ? '1 Exercise Still Incomplete ⚠️' : `${count} Exercises Still Incomplete ⚠️`,
                  `You have ${count} ${count === 1 ? 'exercise' : 'exercises'} left unfinished in this workout:\n\n${summaryList}${extraCount}\n\nWould you like to resume and finish ${firstUnfinished.name}, or end your workout now?`,
                  [
                    {
                      text: `Resume (${firstUnfinished.name.split(' (')[0]})`,
                      style: 'default',
                      onPress: () => {
                        hapticMedium();
                        navigation.navigate('ActiveLogging', {
                          date: selectedDate,
                          initialIndex: firstUnfinished.index,
                        });
                      },
                    },
                    {
                      text: 'Finish Workout Anyway',
                      style: 'destructive',
                      onPress: async () => {
                        onEndWorkout(true);
                        navigation.navigate('WorkoutSummary', { date: selectedDate });
                      },
                    },
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                  ]
                );
                return;
              }

              onEndWorkout(true);
              navigation.navigate('WorkoutSummary', { date: selectedDate });
            }}
            style={[styles.outlineBtn, { backgroundColor: isDark ? '#2C2C2E' : 'rgba(0, 0, 0, 0.05)', borderColor: isDark ? 'rgba(255,69,58,0.3)' : 'rgba(255,69,58,0.4)' }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.outlineBtnText, { color: IOS_DARK.red }]}>Finish</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onResumeWorkout}
            style={[styles.primarySolidBtn, { flex: 1, backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={16} color={isDark ? '#000000' : '#FFFFFF'} style={{ marginRight: 6 }} />
            <Text style={[styles.primarySolidBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
              Resume Workout
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── 3. NOT STARTED: UNIFIED HERO WORKOUT SURFACE ──────────────────────────
  // Clean up the title: format "(Thickness)" -> "Thickness" (e.g. "Chest & Back (Thickness)" -> "Chest & Back Thickness")
  const cleanTitle = routineTitle.replace(/[()]/g, '').trim() || 'Workout Day';

  return (
    <View style={[styles.heroCard, { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface }]}>
      {/* Title row with Focus and Streak Badge on right */}
      <View style={styles.topRow}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text
            numberOfLines={1}
            style={[styles.heroTitle, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}
          >
            {cleanTitle}
          </Text>
          {Boolean(routineFocus) && (
            <Text
              numberOfLines={1}
              style={[styles.heroSubtitle, { color: isDark ? IOS_DARK.labelSecondary : colors.textMuted }]}
            >
              {routineFocus}
            </Text>
          )}
        </View>

        {currentStreak > 0 && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={14} color={IOS_DARK.orange} />
            <Text style={styles.streakText}>{currentStreak}d</Text>
          </View>
        )}
      </View>

      {/* Pre-Session Muscle Hit Map Preview with Visual Anatomy, Metrics & Proportional Load Bar */}
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
        />
      )}

      {/* Solid Apple iOS Action Button */}
      <TouchableOpacity
        style={[styles.primarySolidBtn, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}
        onPress={onStartWorkout}
        activeOpacity={0.85}
      >
        <Ionicons name="play" size={16} color={isDark ? '#000000' : '#FFFFFF'} style={{ marginRight: 6 }} />
        <Text style={[styles.primarySolidBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
          Start Workout
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 0, // Apple HIG: Zero outer border on OLED canvas
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroOverline: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.medium,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  heroMeta: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.body,
    marginTop: 2,
  },
  focusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  focusPillText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  statChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statChipText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
  },
  statChipDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
  },
  streakText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: IOS_DARK.orange,
  },
  primarySolidBtn: {
    height: 38,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primarySolidBtnText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.2,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completedIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: IOS_DARK.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  outlineBtn: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
  },
  activeLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: IOS_DARK.orange,
  },
  activeLiveText: {
    fontSize: 10.5,
    fontFamily: FONT_FAMILY.bold,
    color: IOS_DARK.orange,
    letterSpacing: 0.6,
  },
  timerWrap: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 159, 10, 0.1)',
  },
});

export default GymWorkoutBanner;
