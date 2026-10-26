import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WorkoutTimer from './WorkoutTimer';
import { IOS_DARK, FONT_FAMILY } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';

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
              style={[styles.outlineBtn, { borderColor: isDark ? 'rgba(255,159,10,0.3)' : 'rgba(255,159,10,0.4)' }]}
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
              style={[styles.outlineBtn, { borderColor: isDark ? 'rgba(48,209,88,0.35)' : 'rgba(48,209,88,0.4)' }]}
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
            style={[styles.primarySolidBtn, { flex: 1, backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.primarySolidBtnText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
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
              onEndWorkout(true);
              navigation.navigate('WorkoutSummary', { date: selectedDate });
            }}
            style={[styles.outlineBtn, { borderColor: isDark ? 'rgba(255,69,58,0.3)' : 'rgba(255,69,58,0.4)' }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.outlineBtnText, { color: IOS_DARK.red }]}>Finish</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onResumeWorkout}
            style={[styles.primarySolidBtn, { flex: 1, backgroundColor: IOS_DARK.accent }]}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={16} color="#000000" style={{ marginRight: 6 }} />
            <Text style={[styles.primarySolidBtnText, { color: '#000000' }]}>
              Resume Workout
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── 3. NOT STARTED: UNIFIED HERO WORKOUT SURFACE ──────────────────────────
  // Clean up the title: strip parenthetical suffixes like "(Thickness)" from name display
  const cleanTitle = routineTitle.replace(/\s*\(.*?\)\s*/g, '').trim() || 'Workout Day';
  // Focus is shown as-is (not screaming caps)
  const cleanFocus = routineFocus || '';

  return (
    <View style={[styles.heroCard, { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface }]}>
      {/* Top row: Focus label + streak */}
      <View style={styles.topRow}>
        {cleanFocus ? (
          <View style={styles.focusPill}>
            <Ionicons name="barbell-outline" size={10} color={isDark ? IOS_DARK.labelSecondary : colors.textMuted} />
            <Text style={[styles.focusPillText, { color: isDark ? IOS_DARK.labelSecondary : colors.textMuted }]}>
              {cleanFocus}
            </Text>
          </View>
        ) : <View />}

        {currentStreak > 0 && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={14} color={IOS_DARK.orange} />
            <Text style={styles.streakText}>{currentStreak}d</Text>
          </View>
        )}
      </View>

      {/* Main workout title */}
      <Text
        numberOfLines={1}
        style={[styles.heroTitle, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}
      >
        {cleanTitle}
      </Text>

      {/* 3-Stat chip row */}
      <View style={styles.statChipRow}>
        <View style={styles.statChip}>
          <Ionicons name="layers-outline" size={12} color={isDark ? IOS_DARK.labelSecondary : colors.textMuted} />
          <Text style={[styles.statChipText, { color: isDark ? IOS_DARK.labelSecondary : colors.textMuted }]}>
            {exerciseCount} exercises
          </Text>
        </View>
        <View style={styles.statChipDot} />
        <View style={styles.statChip}>
          <Ionicons name="repeat-outline" size={12} color={isDark ? IOS_DARK.labelSecondary : colors.textMuted} />
          <Text style={[styles.statChipText, { color: isDark ? IOS_DARK.labelSecondary : colors.textMuted }]}>
            {setsCount} sets
          </Text>
        </View>
        <View style={styles.statChipDot} />
        <View style={styles.statChip}>
          <Ionicons name="time-outline" size={12} color={isDark ? IOS_DARK.labelSecondary : colors.textMuted} />
          <Text style={[styles.statChipText, { color: isDark ? IOS_DARK.labelSecondary : colors.textMuted }]}>
            ~{estimatedMinutes} min
          </Text>
        </View>
      </View>

      {/* Solid Apple iOS Action Button */}
      <TouchableOpacity
        style={[styles.primarySolidBtn, { backgroundColor: isDark ? IOS_DARK.accent : '#6C5CE7' }]}
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
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 0, // Apple HIG: Zero outer border on OLED canvas
    gap: 8,
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
    fontSize: 17,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.3,
  },
  heroMeta: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.body,
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
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
  },
  streakText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: IOS_DARK.orange,
  },
  primarySolidBtn: {
    height: 38,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primarySolidBtnText: {
    fontSize: 14,
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
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    fontSize: 13,
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
