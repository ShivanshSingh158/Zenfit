import React, { useEffect, useRef, useState, useMemo, memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  InteractionManager,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useGymLogs, useGymPlan } from '../../contexts/domains/WellnessContext';
import {
  useGymLog,
  todayStr,
  dateStrOffset,
} from '../../hooks/useGymLog';
import { GymCardioLog } from '../../types/gym.types';
import { useTheme } from '../../contexts/ThemeContext';
import { IOS_DARK, FONT_FAMILY } from '../../theme/tokens';
import { hapticLight, hapticMedium, hapticSuccess, hapticHeavy } from '../../utils/haptics';
import {
  calculateGymStreak,
  resolveExerciseTargetMuscle,
  normalizeExerciseKey,
  getPreviousExerciseSession,
  getExerciseSwapAlternatives,
} from '../../utils/gymUtils';
import { awardXP } from '../../services/xpSystem';
import { GYM_PLAN, resolvePlanDay } from '../../data/gymPlan';
import { makeStyles } from './gymHomeStyles';

// ─── Core Frame-0 Components (Rendered directly on Today's active workout surface) ───
import GymWorkoutBanner from '../../components/Gym/GymWorkoutBanner';
import GymExerciseDraggableRow from '../../components/Gym/GymExerciseDraggableRow';

function getMuscleWeight(m: string): number {
  const ml = m.toLowerCase();
  if (ml.includes('chest') || ml.includes('pec')) return 1;
  if (ml.includes('delt') || ml.includes('shoulder')) return 2;
  if (ml.includes('back') || ml.includes('lat') || ml.includes('trap')) return 3;
  if (ml.includes('bicep') || ml.includes('tricep') || ml.includes('brach') || ml.includes('forearm')) return 4;
  if (ml.includes('abs') || ml.includes('oblique') || ml.includes('core')) return 5;
  if (ml.includes('quad') || ml.includes('glute') || ml.includes('ham') || ml.includes('calf') || ml.includes('soleus')) return 6;
  return 7;
}

export const GymHomeScreen = memo(function GymHomeScreen() {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const today = useMemo(() => todayStr(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekOffset, setWeekOffset] = useState(0);

  const { gymLogs } = useGymLogs();
  const { userGymPlan, updateMasterPlan } = useGymPlan();

  const {
    log,
    startWorkout,
    resumeWorkout,
    endWorkout,
    revertWorkout,
    addExercise,
    updateExercise,
    deleteExercise,
    addCardio,
    updateCardio,
    deleteCardio,
    planDay,
    swapDayRoutine,
    reorderExercisesFull,
  } = useGymLog(selectedDate);

  // ─── Modal States ──────────────────────────────────────────────────────────
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showCardioModal, setShowCardioModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deepDiveExercise, setDeepDiveExercise] = useState<string | null>(null);
  const [exerciseMenuFor, setExerciseMenuFor] = useState<any | null>(null);
  const [cardioMenuFor, setCardioMenuFor] = useState<GymCardioLog | null>(null);
  const [logCardioFor, setLogCardioFor] = useState<GymCardioLog | null>(null);
  const [swapModalFor, setSwapModalFor] = useState<any | null>(null);
  const [showBodyMetrics, setShowBodyMetrics] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showPRSheet, setShowPRSheet] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [historyDrawerEx, setHistoryDrawerEx] = useState<{ name: string; id: string } | null>(null);
  const [detailModalEx, setDetailModalEx] = useState<string | null>(null);

  const animBanner = useRef(new Animated.Value(1)).current;

  // ─── Streak & Week Computations ────────────────────────────────────────────
  const streak = useMemo(() => calculateGymStreak(gymLogs || []), [gymLogs]);

  const weekDates = useMemo(() => {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);
    const dayOfWeek = baseDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    // Offset to previous or current Monday (Mon=0, Tue=1, ..., Sun=6)
    const mondayOffset = (dayOfWeek + 6) % 7;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - mondayOffset);

    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    return dates;
  }, [weekOffset, today]);

  // Formatted date strings for Compact Structural Header (e.g. "Today" + "Fri, Oct 23")
  const { headerTitleText, headerDateText } = useMemo(() => {
    try {
      const [yyyy, mm, dd] = selectedDate.split('-');
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      const isToday = selectedDate === todayStr();
      if (isToday) {
        return {
          headerTitleText: 'Today',
          headerDateText: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        };
      }
      return {
        headerTitleText: d.toLocaleDateString('en-US', { weekday: 'long' }),
        headerDateText: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };
    } catch {
      return { headerTitleText: 'Today', headerDateText: selectedDate };
    }
  }, [selectedDate]);

  const activePlanDay = useMemo(() => {
    return planDay;
  }, [planDay]);

  const activeExercises = useMemo(() => {
    if (log?.exercises && log.exercises.length > 0) {
      return log.exercises;
    }
    return activePlanDay?.exercises || [];
  }, [log?.exercises, activePlanDay?.exercises]);

  const draggableItemParamsList = useMemo(() => {
    return activeExercises.map((ex: any, idx: number) => ({
      item: { ...ex, originalIndex: idx },
      drag: () => {},
      isActive: false,
      getIndex: () => idx,
    }));
  }, [activeExercises]);

  const existingExerciseIds = useMemo(() => {
    return activeExercises.map((e: any) => e.exerciseId || e.id);
  }, [activeExercises]);

  const totalWorkingSets = useMemo(() => {
    return activeExercises.reduce((sum: number, ex: any) => sum + (ex.setsLog?.length || 3), 0);
  }, [activeExercises]);

  const estimatedMinutes = useMemo(() => {
    return Math.max(20, Math.round(totalWorkingSets * 2.5));
  }, [totalWorkingSets]);

  const muscleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    activeExercises.forEach((ex: any) => {
      const { canonicalGroup } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
      if (canonicalGroup && canonicalGroup !== 'Mixed' && canonicalGroup !== 'Other') {
        counts[canonicalGroup] = (counts[canonicalGroup] || 0) + (ex.setsLog?.length || 3);
      }
    });
    return counts;
  }, [activeExercises]);

  const sortedMuscles = useMemo(() => {
    return Object.entries(muscleCounts).sort((a, b) => {
      const weightDiff = getMuscleWeight(a[0]) - getMuscleWeight(b[0]);
      if (weightDiff !== 0) return weightDiff;
      return b[1] - a[1];
    });
  }, [muscleCounts]);

  const isWorkoutCompleted = Boolean(log?.completed);

  const isEffectiveRest = Boolean(
    (activePlanDay?.isRest || planDay?.isRest) &&
    (!log?.exercises || log.exercises.length === 0) &&
    (!log?.workoutStartTime) &&
    (!log?.completed)
  );

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleStartWorkout = useCallback(() => {
    hapticHeavy();
    if (activeExercises.length === 0) {
      Alert.alert('No Exercises', 'Please add exercises to start the workout.');
      return;
    }
    navigation.navigate('ActiveLogging', { date: selectedDate });
    InteractionManager.runAfterInteractions(() => {
      startWorkout();
    });
  }, [activeExercises.length, startWorkout, navigation, selectedDate]);

  // Navigate to ActiveLogging without starting the workout — used by exercise rows.
  // Tapping an exercise should ONLY open the logger to view/log sets, never auto-start.
  const handleExercisePress = useCallback((index?: number) => {
    hapticLight();
    const targetIdx = typeof index === 'number' ? index : 0;
    navigation.navigate('ActiveLogging', {
      date: selectedDate,
      initialIndex: targetIdx,
      exerciseIndex: targetIdx,
    });
  }, [navigation, selectedDate]);

  // Explicitly resume an in-progress workout — used ONLY by the banner's Resume button.
  const handleResumeWorkout = useCallback(() => {
    hapticLight();
    resumeWorkout();
    navigation.navigate('ActiveLogging', { date: selectedDate });
  }, [resumeWorkout, navigation, selectedDate]);

  const handleShowHistory = useCallback((exItem: { id: string; name: string }) => {
    setDeepDiveExercise(exItem.name);
  }, []);

  // Direct toggle on GymHome list: allows user to mark an exercise done/undone without opening active logger
  const handleToggleExerciseComplete = useCallback((ex: any, idx: number) => {
    hapticMedium();
    const setsLog = ex.setsLog || [];
    const isCurrentlyDone = setsLog.length > 0 && setsLog.every((s: any) => s.completed);
    const targetCompleted = !isCurrentlyDone;

    const targetDateStr = selectedDate || todayStr();
    const prevSession = getPreviousExerciseSession(ex.name, gymLogs, targetDateStr);
    const lastSets = prevSession?.sets || [];
    const lastValidSet = lastSets.length > 0 ? lastSets[lastSets.length - 1] : null;

    const baseSetsCount = setsLog.length > 0 ? setsLog.length : (ex.targetSets || 3);
    const defaultReps = parseInt(String(ex.targetReps || '10').split(/[-–—]/)[0], 10) || 10;

    const updatedSets = Array.from({ length: baseSetsCount }, (_, sIdx) => {
      const existingSet = setsLog[sIdx];
      const lastSet = lastSets[sIdx] || lastValidSet;
      const weight = (existingSet?.weight != null && Number(existingSet.weight) > 0)
        ? Number(existingSet.weight)
        : (lastSet?.weight != null && Number(lastSet.weight) > 0 ? Number(lastSet.weight) : (ex.targetWeight || 20));
      const reps = (existingSet?.reps != null && Number(existingSet.reps) > 0)
        ? Number(existingSet.reps)
        : (lastSet?.reps ? Number(lastSet.reps) : defaultReps);

      return {
        setNumber: sIdx + 1,
        weight,
        reps,
        completed: targetCompleted,
      };
    });

    const updatedEx = {
      ...ex,
      setsLog: updatedSets,
    };

    updateExercise(idx, updatedEx);
    if (targetCompleted) {
      awardXP('GYM_SET').catch(() => {});
    }
  }, [selectedDate, gymLogs, updateExercise]);

  // Whenever returning to GymHomeScreen, reload any fresh active draft via fast direct key check.
  // CRITICAL: Only re-hydrate if the draft has actual logged sets — never on a ghost workoutStartTime alone.
  useFocusEffect(
    useCallback(() => {
      const checkDraft = async () => {
        try {
          if (isWorkoutCompleted || log?.completed) return;
          const draftKey = log?.id ? `gym_active_draft_${log.id}` : null;
          if (draftKey) {
            const raw = await AsyncStorage.getItem(draftKey);
            if (raw) {
              const draft = JSON.parse(raw);
              const hasLoggedSets = (draft?.exercises || []).some((ex: any) =>
                (ex.setsLog || []).some((s: any) => s.completed)
              );
              // Only re-hydrate if: newer AND has real logged sets.
              // A bare workoutStartTime with no sets is a ghost — ignore it.
              if (
                draft &&
                draft.date === selectedDate &&
                !draft.completed &&
                hasLoggedSets &&
                (draft.updatedAt || 0) > (log?.updatedAt || 0)
              ) {
                DeviceEventEmitter.emit('gym_log_local_mutation', { date: selectedDate, log: draft });
              }
            }
          }
        } catch {}
      };
      checkDraft();
    }, [isWorkoutCompleted, log?.completed, log?.id, log?.updatedAt, selectedDate])
  );

  const routineTitle = activePlanDay?.name || 'Workout Day';
  const routineFocus = activePlanDay?.focus || (activePlanDay?.isRest ? 'Rest & CNS Recovery' : 'Hypertrophy Training');

  return (
    <View style={s.root}>
      {/* ─── 1. COMPACT STRUCTURAL HEADER (Zero wasted vertical space) ─────────── */}
      <View style={[s.headerContainer, { paddingTop: insets.top + 4 }]}>
        <View style={s.headerRow}>
          <View style={s.headerTitleGroup}>
            <Text style={s.headerTitle}>{headerTitleText}</Text>
            <Text style={s.headerDateBadge}>{headerDateText}</Text>
          </View>

          {/* Plain Icon Buttons (20px, no pill wrappers) */}
          <View style={s.headerActions}>
            <TouchableOpacity
              style={s.plainIconBtn}
              onPress={() => {
                hapticLight();
                setShowAddModal(true);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="add"
                size={22}
                color={isDark ? IOS_DARK.accent : colors.accentPrimary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={s.plainIconBtn}
              onPress={() => {
                setShowSwapModal(true);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="swap-horizontal-outline"
                size={20}
                color={isDark ? IOS_DARK.labelSecondary : colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={s.plainIconBtn}
              onPress={() => {
                setShowAiModal(true);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Ionicons name="sparkles" size={20} color={IOS_DARK.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ─── 2. SCROLLABLE CONTENT (Universal 6px horizontal margin & 10px gap) ─── */}
      <ScrollView
        contentContainerStyle={[
          s.scrollContent,
          {
            paddingTop: 2,
            paddingBottom: insets.bottom + 90,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* WEEK CALENDAR STRIP: Pure typography, no border boxes around days */}
        <View style={s.weekStrip}>
          <TouchableOpacity
            onPress={() => {
              setWeekOffset(prev => prev - 1);
              setSelectedDate(prev => dateStrOffset(-7, prev));
            }}
            style={s.weekNavBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={17} color={isDark ? IOS_DARK.labelSecondary : colors.textTertiary} />
          </TouchableOpacity>

          <View style={s.weekDaysContainer}>
            {weekDates.map(date => {
              const isSelected = date === selectedDate;
              const [yyyy, mm, dd] = date.split('-');
              const dateObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
              const dateNum = dateObj.getDate();
              const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
              const dateDay = days[dateObj.getDay()];

              return (
                <TouchableOpacity
                  key={date}
                  style={s.dayCol}
                  onPress={() => {
                    setSelectedDate(date);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.dayLetter, isSelected && s.dayLetterActive]}>{dateDay}</Text>
                  <View style={[s.dayPill, isSelected && s.dayPillActive]}>
                    <Text style={[s.dayNum, isSelected && s.dayNumActive]}>{dateNum}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={() => {
              setWeekOffset(prev => prev + 1);
              setSelectedDate(prev => dateStrOffset(7, prev));
            }}
            style={s.weekNavBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-forward" size={17} color={isDark ? IOS_DARK.labelSecondary : colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {isEffectiveRest ? (
          <View style={{ width: '100%', gap: 14 }}>
            {/* ── Compact Rest & Recovery Banner ── */}
            <View
              style={{
                backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface,
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 8 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(48,209,88,0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="leaf-outline" size={20} color={IOS_DARK.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontFamily: FONT_FAMILY.bold, color: isDark ? IOS_DARK.labelPrimary : colors.textPrimary }}>
                    Rest & Recovery Day
                  </Text>
                  <Text style={{ fontSize: 11.5, fontFamily: FONT_FAMILY.body, color: isDark ? IOS_DARK.labelSecondary : colors.textMuted, marginTop: 2 }}>
                    Muscles repair and grow during sleep & rest.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  setShowAddModal(true);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: isDark ? IOS_DARK.bgElevatedInput : '#F2F2F7',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={14} color={isDark ? IOS_DARK.labelPrimary : colors.textPrimary} />
                <Text style={{ fontSize: 12, fontFamily: FONT_FAMILY.bold, color: isDark ? IOS_DARK.labelPrimary : colors.textPrimary }}>
                  Log
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── In-Place Full Weekly Training Recap (Deferred dynamically on Sunday) ── */}
            {(() => {
              const WeeklyGymReportComponent = require('../../components/Gym/WeeklyGymReport').default;
              return (
                <WeeklyGymReportComponent
                  gymLogs={gymLogs}
                  weekAnchorDate={selectedDate}
                  userGymPlan={userGymPlan}
                />
              );
            })()}
          </View>
        ) : (
          <>
            {/* ─── 3. SINGLE HERO WORKOUT SURFACE (#1C1C1E, 0px border) ─────── */}
            <GymWorkoutBanner
              log={log}
              s={s}
              currentStreak={streak}
              selectedDate={selectedDate}
              animBanner={animBanner}
              navigation={navigation}
              onStartWorkout={handleStartWorkout}
              onResumeWorkout={() => handleResumeWorkout()}
              onEndWorkout={endWorkout}
              resumeWorkout={resumeWorkout}
              onRevertWorkout={revertWorkout}
              routineTitle={routineTitle}
              routineFocus={routineFocus}
              exerciseCount={activeExercises.length}
              setsCount={totalWorkingSets}
              estimatedMinutes={estimatedMinutes}
            />

            {/* ─── 4. INSET GROUPED EXERCISE LIST ───────────────────────────── */}
            <View style={s.section}>
              <View style={s.sectionHeaderRow}>
                <Text style={s.sectionLabel}>WORKOUT PLAN</Text>
                <TouchableOpacity
                  style={s.sectionActionBtn}
                  onPress={() => {
                    hapticLight();
                    setShowAddModal(true);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={14} color={isDark ? IOS_DARK.accent : colors.accentPrimary} />
                  <Text style={s.sectionActionText}>Add</Text>
                </TouchableOpacity>
              </View>

              {activeExercises.length === 0 ? (
                <View style={[s.insetGroupedCard, { padding: 24, alignItems: 'center' }]}>
                  <Ionicons name="barbell-outline" size={28} color={isDark ? IOS_DARK.labelTertiary : colors.textTertiary} style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 15, fontFamily: FONT_FAMILY.bold, color: isDark ? IOS_DARK.labelPrimary : colors.textPrimary, marginBottom: 4 }}>
                    {activePlanDay?.isRest ? 'Rest Day Scheduled' : 'No Exercises for Today'}
                  </Text>
                  <Text style={{ fontSize: 13, fontFamily: FONT_FAMILY.body, color: isDark ? IOS_DARK.labelSecondary : colors.textMuted, textAlign: 'center', lineHeight: 18 }}>
                    {activePlanDay?.isRest
                      ? 'Take time to recover, hydrate, and prepare for your next lifting session.'
                      : 'Tap + Add to insert movements or swap your routine day.'}
                  </Text>
                </View>
              ) : (
                <View style={s.insetGroupedCard}>
                  {activeExercises.map((ex: any, idx: number) => {
                    const itemParams = draggableItemParamsList[idx];

                    return (
                      <React.Fragment key={ex.exerciseId || ex.name || idx}>
                        {idx > 0 && <View style={s.hairlineDivider} />}
                        <GymExerciseDraggableRow
                          itemParams={itemParams as any}
                          logCompleted={isWorkoutCompleted}
                          logWorkoutStartTime={log?.workoutStartTime || null}
                          logExercises={log?.exercises}
                          s={s}
                          selectedDate={selectedDate}
                          navigation={navigation}
                          onResumeWorkout={handleExercisePress}
                          onShowHistory={handleShowHistory}
                          onShowMenu={setExerciseMenuFor}
                          onToggleComplete={handleToggleExerciseComplete}
                        />
                      </React.Fragment>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ─── 5. CARDIO SECTION (Inset Grouped Container) ───────────────── */}
            <View style={s.section}>
              <View style={s.sectionHeaderRow}>
                <Text style={s.sectionLabel}>CARDIO</Text>
                <TouchableOpacity
                  style={s.sectionActionBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                  onPress={() => {
                    hapticLight();
                    setShowCardioModal(true);
                  }}
                >
                  <Ionicons name="add" size={14} color={isDark ? IOS_DARK.accent : colors.accentPrimary} />
                  <Text style={s.sectionActionText}>Add</Text>
                </TouchableOpacity>
              </View>

              {(log?.cardio || []).length > 0 && (
                <View style={s.insetGroupedCard}>
                  {(log?.cardio || []).map((c, idx) => {
                    const isDone = c.completed;
                    return (
                      <React.Fragment key={c.id}>
                        {idx > 0 && <View style={s.hairlineDivider} />}
                        <TouchableOpacity
                          style={s.row}
                          activeOpacity={0.7}
                          onPress={() => setLogCardioFor(c)}
                        >
                          <View style={[s.cardioIconWrap, isDone && s.cardioIconWrapDone]}>
                            <Ionicons
                              name={isDone ? 'checkmark' : 'fitness-outline'}
                              size={14}
                              color={isDone ? '#FFFFFF' : (isDark ? IOS_DARK.labelSecondary : colors.textMuted)}
                            />
                          </View>
                          <View style={s.rowTextCol}>
                            <Text style={[s.rowTitle, isDone && s.textStrikethrough]}>
                              {c.type || 'Cardio'}
                            </Text>
                            <Text style={s.rowSubtitle}>
                              {c.durationMinutes ? `${c.durationMinutes} min` : '0 min'}
                              {c.distanceKm ? ` · ${c.distanceKm} km` : ''}
                              {c.speedKmh ? ` · ${c.speedKmh} km/h` : ''}
                              {c.incline ? ` · ${c.incline}% incline` : ''}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={s.actionBtn}
                            onPress={() => {
                              hapticMedium();
                              setCardioMenuFor(c);
                            }}
                          >
                            <Ionicons name="ellipsis-horizontal" size={18} color={isDark ? IOS_DARK.labelSecondary : colors.textTertiary} />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      </React.Fragment>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ─── 6. SESSION TARGET MUSCLES (Clean iOS Metadata) ───────────── */}
            {sortedMuscles.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeaderRow}>
                  <Text style={s.sectionLabel}>TARGET MUSCLES</Text>
                </View>
                <View style={[s.insetGroupedCard, { paddingVertical: 12, paddingHorizontal: 16 }]}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: FONT_FAMILY.body,
                      color: isDark ? IOS_DARK.labelSecondary : colors.textMuted,
                      lineHeight: 20,
                    }}
                  >
                    {sortedMuscles.map(([muscle, count]) => `${muscle} (${count} sets)`).join('  ·  ')}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ─── MODALS (Loaded strictly on-demand via dynamic require; 0ms Frame-0 impact) ─── */}
      {showSwapModal && (() => {
        const { SwapRoutineModal } = require('../../components/Gym/SwapRoutineModal');
        return (
          <SwapRoutineModal
            visible={showSwapModal}
            selectedDate={selectedDate}
            currentPlanDayIndex={activePlanDay?.dayIndex}
            onClose={() => setShowSwapModal(false)}
            onSelectDay={(idx: number) => {
              swapDayRoutine(idx);
              setShowSwapModal(false);
            }}
          />
        );
      })()}

      {showBodyMetrics && (() => {
        const BodyMetricsSheet = require('../../components/Gym/BodyMetricsSheet').default;
        return (
          <BodyMetricsSheet
            visible={showBodyMetrics}
            onClose={() => setShowBodyMetrics(false)}
          />
        );
      })()}

      {showCardioModal && (() => {
        const { AddCardioModal } = require('../../components/Gym/AddCardioModal');
        return (
          <AddCardioModal
            visible={showCardioModal}
            onClose={() => setShowCardioModal(false)}
            onAdd={(type: any) => {
              addCardio(type);
              setShowCardioModal(false);
            }}
          />
        );
      })()}

      {!!logCardioFor && (() => {
        const { LogCardioModal } = require('../../components/Gym/LogCardioModal');
        return (
          <LogCardioModal
            visible={Boolean(logCardioFor)}
            cardio={logCardioFor}
            onClose={() => setLogCardioFor(null)}
            onSave={(updates: any) => {
              if (logCardioFor) {
                updateCardio(logCardioFor.id, updates);
              }
              setLogCardioFor(null);
            }}
          />
        );
      })()}

      {showAddModal && (() => {
        const { AddExerciseModal } = require('../../components/Gym/AddExerciseModal');
        return (
          <AddExerciseModal
            visible={showAddModal}
            onClose={() => setShowAddModal(false)}
            onAdd={(newEx: any) => {
              addExercise(newEx);
              setShowAddModal(false);
            }}
            planDay={activePlanDay}
            existingExerciseIds={existingExerciseIds}
          />
        );
      })()}

      {deepDiveExercise && (() => {
        const ExerciseDeepDiveModal = require('../../components/Gym/ExerciseDeepDiveModal').default;
        return (
          <ExerciseDeepDiveModal
            visible={Boolean(deepDiveExercise)}
            exerciseName={deepDiveExercise}
            gymLogs={gymLogs || []}
            onClose={() => setDeepDiveExercise(null)}
          />
        );
      })()}

      {Boolean(exerciseMenuFor || cardioMenuFor) && (() => {
        const { GymExerciseOptionsSheet } = require('../../components/Gym/GymExerciseOptionsSheet');
        return (
          <GymExerciseOptionsSheet
            exerciseMenuFor={exerciseMenuFor}
            setExerciseMenuFor={setExerciseMenuFor}
            supersetPickerFor={null}
            setSupersetPickerFor={() => {}}
            cardioMenuFor={cardioMenuFor}
            setCardioMenuFor={setCardioMenuFor}
            setLogCardioFor={setLogCardioFor}
            deleteCardio={deleteCardio}
            deleteExercise={deleteExercise}
            reorderExercisesFull={reorderExercisesFull}
            log={log}
            selectedDate={selectedDate}
            userGymPlan={userGymPlan}
            updateMasterPlan={updateMasterPlan}
            navigation={navigation}
            colors={colors}
            isDark={isDark}
            s={s}
            onOpenDeepDive={(ex: any) => setDeepDiveExercise(ex.name)}
            onOpenSwapModal={(ex: any) => setSwapModalFor(ex)}
          />
        );
      })()}

      {!!swapModalFor && (() => {
        const { ActiveSwapModal } = require('../../components/Gym/ActiveSwapModal');
        return (
          <ActiveSwapModal
            visible={Boolean(swapModalFor)}
            exercise={swapModalFor}
            aiSwapList={getExerciseSwapAlternatives(swapModalFor.name, swapModalFor.muscle)}
            isAiSwapLoading={false}
            colors={colors}
            styles={s}
            onClose={() => setSwapModalFor(null)}
            onSelectSwap={(alt: any) => {
              const updated = (log?.exercises || []).map((e: any) =>
                e.exerciseId === swapModalFor.exerciseId
                  ? {
                      ...e,
                      name: alt.name,
                      muscle: alt.targetMuscle || alt.muscle || e.muscle,
                      notes: `Swapped from ${swapModalFor.name}`,
                    }
                  : e
              );
              reorderExercisesFull(updated);
              setSwapModalFor(null);
              hapticSuccess();
            }}
          />
        );
      })()}

      {showPRSheet && (() => {
        const PRHallOfFameSheet = require('../../components/Gym/PRHallOfFameSheet').default;
        return (
          <PRHallOfFameSheet
            visible={showPRSheet}
            onClose={() => setShowPRSheet(false)}
          />
        );
      })()}

      {showProfileModal && (() => {
        const { GymProfileModal } = require('../../components/Gym/GymProfileModal');
        return (
          <GymProfileModal
            visible={showProfileModal}
            onClose={() => setShowProfileModal(false)}
          />
        );
      })()}

      {Boolean(historyDrawerEx) && (() => {
        const { ExerciseHistoryDrawer } = require('../../components/Gym/ExerciseHistoryDrawer');
        return (
          <ExerciseHistoryDrawer
            visible={Boolean(historyDrawerEx)}
            exerciseName={historyDrawerEx?.name || null}
            exerciseId={historyDrawerEx?.id || null}
            onClose={() => setHistoryDrawerEx(null)}
          />
        );
      })()}

      {detailModalEx && (() => {
        const { ExerciseDetailModal } = require('../../components/Gym/ExerciseDetailModal');
        return (
          <ExerciseDetailModal
            visible={Boolean(detailModalEx)}
            exerciseName={detailModalEx}
            onClose={() => setDetailModalEx(null)}
          />
        );
      })()}

      {showAiModal && (() => {
        const { ZenGymAiModal } = require('../../components/Gym/ZenGymAiModal');
        return (
          <ZenGymAiModal
            visible={showAiModal}
            onClose={() => setShowAiModal(false)}
            workoutData={{
              activeMuscles: activePlanDay?.focus || activePlanDay?.name || 'Workout',
            }}
          />
        );
      })()}
    </View>
  );
});

export default GymHomeScreen;
