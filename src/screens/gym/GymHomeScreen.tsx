import React, { useEffect, useRef, useState, useMemo, memo, useCallback, Suspense } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  InteractionManager,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';

import { useWellnessData } from '../../contexts/domains/WellnessContext';
import {
  useGymLog,
  todayStr,
  dateStrOffset,
  planDayIndexForDate,
  getCustomPlanDay,
} from '../../hooks/useGymLog';
import { GymCardioLog, GymExerciseLog, GymPlanDay } from '../../types/gym.types';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS, FONT_FAMILY } from '../../theme/tokens';
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/haptics';
import { calculateGymStreak, resolveExerciseTargetMuscle, normalizeExerciseKey } from '../../utils/gymUtils';
import { GYM_PLAN, resolvePlanDay } from '../../data/gymPlan';
import { makeStyles } from './gymHomeStyles';

// ─── Native Authentic Components ─────────────────────────────────────────────
import GymWorkoutBanner from '../../components/Gym/GymWorkoutBanner';
import GymExerciseDraggableRow from '../../components/Gym/GymExerciseDraggableRow';
import { SwapRoutineModal } from '../../components/Gym/SwapRoutineModal';
import { AddCardioModal } from '../../components/Gym/AddCardioModal';
import { LogCardioModal } from '../../components/Gym/LogCardioModal';
import { AddExerciseModal } from '../../components/Gym/AddExerciseModal';
import ExerciseDeepDiveModal from '../../components/Gym/ExerciseDeepDiveModal';
import { GymExerciseOptionsSheet } from '../../components/Gym/GymExerciseOptionsSheet';
import { ActiveSwapModal } from '../../components/Gym/ActiveSwapModal';
import { getExerciseSwapAlternatives } from '../../utils/gymUtils';
import BodyMetricsSheet from '../../components/Gym/BodyMetricsSheet';
import PRHallOfFameSheet from '../../components/Gym/PRHallOfFameSheet';
import { GymProfileModal } from '../../components/Gym/GymProfileModal';
import { ZenGymAiModal } from '../../components/Gym/ZenGymAiModal';
import { ExerciseHistoryDrawer } from '../../components/Gym/ExerciseHistoryDrawer';
import { ExerciseDetailModal } from '../../components/Gym/ExerciseDetailModal';

const WeeklyGymReport = React.lazy(() => import('../../components/Gym/WeeklyGymReport'));
import WeeklyReportSkeleton from '../../components/Gym/WeeklyReportSkeleton';
import GymHomeSkeleton from '../../components/Gym/GymHomeSkeleton';

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
  const isFocused = useIsFocused();

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [weekOffset, setWeekOffset] = useState(0);

  const {
    gymLogs,
    userGymPlan,
    updateMasterPlan,
  } = useWellnessData();

  const {
    log,
    startWorkout,
    resumeWorkout,
    endWorkout,
    revertWorkout,
    saveLog,
    addExercise,
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
  const pillAnim = useRef(new Animated.Value(0)).current;
  const isPillVisibleRef = useRef(false);

  const handleScroll = useCallback((e: any) => {
    const offsetY = e?.nativeEvent?.contentOffset?.y ?? 0;
    const shouldShow = offsetY > 15;
    if (shouldShow !== isPillVisibleRef.current) {
      isPillVisibleRef.current = shouldShow;
      Animated.timing(pillAnim, {
        toValue: shouldShow ? 1 : 0,
        duration: shouldShow ? 140 : 100,
        useNativeDriver: true,
      }).start();
    }
  }, [pillAnim]);

  // ─── Streak Calculation ────────────────────────────────────────────────────
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    if (!isFocused) return;
    const handle = InteractionManager.runAfterInteractions(() => {
      setStreak(calculateGymStreak(gymLogs, userGymPlan));
    });
    return () => handle.cancel();
  }, [isFocused, gymLogs, userGymPlan]);

  // ─── Week Calendar Strip Calculation (Monday-anchored like ZenTrack) ───────
  const weekDates = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday + (weekOffset * 7));

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    });
  }, [weekOffset]);

  // ─── Today's Routine & Fallback Plan Resolution ────────────────────────────
  const currentPlanIdx = useMemo(() => planDayIndexForDate(selectedDate), [selectedDate]);
  const activePlanDay = useMemo(() => {
    return planDay || resolvePlanDay(userGymPlan, currentPlanIdx);
  }, [planDay, userGymPlan, currentPlanIdx]);

  const activeExercises = useMemo(() => {
    if (log?.exercises && log.exercises.length > 0) {
      return log.exercises.filter((ex: any) => !ex.skipped);
    }
    return (activePlanDay?.exercises || []).map((e: any, idx: number) => ({
      ...e,
      exerciseId: e.id || `ex_${idx}`,
      setsLog: Array.from({ length: e.targetSets || 3 }, (_, sIdx) => ({
        setNumber: sIdx + 1,
        reps: 10,
        weight: null,
        completed: false,
      })),
    }));
  }, [log?.exercises, activePlanDay?.exercises]);

  const musclesSignature = useMemo(() => {
    return activeExercises.map((e: any) => `${e.name}:${e.muscle || ''}`).join('|');
  }, [activeExercises]);

  const sortedMuscles = useMemo(() => {
    if (!activeExercises || activeExercises.length === 0) return [];
    const muscleCounts: Record<string, number> = {};
    activeExercises.forEach((ex: any) => {
      const resolved = resolveExerciseTargetMuscle(ex.name, ex.muscle).targetMuscle;
      const m = resolved || 'Mixed';
      muscleCounts[m] = (muscleCounts[m] || 0) + 1;
    });

    return Object.entries(muscleCounts).sort((a, b) => {
      const wA = getMuscleWeight(a[0]);
      const wB = getMuscleWeight(b[0]);
      if (wA !== wB) return wA - wB;
      return b[1] - a[1];
    });
  }, [musclesSignature, activeExercises]);

  const isWorkoutCompleted = Boolean(log?.completed);

  // If user hasn't logged active exercises on a scheduled rest day, display the full Weekly Recap
  const isEffectiveRest = Boolean(
    (activePlanDay?.isRest || planDay?.isRest) &&
    (!log?.exercises || log.exercises.length === 0) &&
    (!log?.workoutStartTime) &&
    (!log?.completed)
  );

  const [weeklyReportReady, setWeeklyReportReady] = useState(false);
  useEffect(() => {
    setWeeklyReportReady(false);
    const handle = InteractionManager.runAfterInteractions(() => {
      setWeeklyReportReady(true);
    });
    return () => handle.cancel();
  }, [selectedDate, isFocused]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleStartWorkout = useCallback(() => {
    hapticMedium();
    if (activeExercises.length === 0) {
      Alert.alert('No Exercises', 'Please add exercises to start the workout.');
      return;
    }
    startWorkout();
    navigation.navigate('ActiveLogging', { date: selectedDate });
  }, [activeExercises.length, startWorkout, navigation, selectedDate]);

  const handleResumeWorkout = useCallback((index?: number) => {
    hapticMedium();
    if (!log?.workoutStartTime) {
      resumeWorkout();
    }
    navigation.navigate('ActiveLogging', {
      date: selectedDate,
      initialIndex: typeof index === 'number' ? index : 0,
    });
  }, [log?.workoutStartTime, resumeWorkout, navigation, selectedDate]);

  const routineTitle = activePlanDay?.name || 'Workout Day';
  const routineFocus = activePlanDay?.focus || (activePlanDay?.isRest ? 'Rest & CNS Recovery' : 'Hypertrophy Training');

  return (
    <View style={[s.root, { backgroundColor: isDark ? '#000000' : colors.background }]}>
      {/* ─── 1. STICKY FLOATING MORPHING HEADER ───────────────────────── */}
      <View style={[s.topHeaderWrapper, { top: insets.top + 2 }]} pointerEvents="box-none">
        <View style={s.headerInner}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: isDark ? 'rgba(20,20,24,0.92)' : 'rgba(255,255,255,0.92)',
                borderRadius: 22,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              },
              { opacity: pillAnim },
            ]}
            pointerEvents="none"
          />

          <Text style={s.headerTitle}>ZenFit</Text>

          <View style={s.headerActions}>
            <TouchableOpacity
              style={s.morphBtn}
              onPress={() => {
                hapticLight();
                setShowSwapModal(true);
              }}
              activeOpacity={0.7}
            >
              <View style={s.morphBtnIconWrap}>
                <Ionicons name="swap-horizontal-outline" size={17} color={colors.textSecondary} />
              </View>
              <Text style={s.headerBtnText}>Swap</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.morphBtn, { backgroundColor: isDark ? 'rgba(165,153,255,0.12)' : 'rgba(108,92,231,0.08)', borderColor: isDark ? 'rgba(165,153,255,0.25)' : 'rgba(108,92,231,0.2)' }]}
              onPress={() => {
                hapticLight();
                setShowAiModal(true);
              }}
              activeOpacity={0.7}
            >
              <View style={s.morphBtnIconWrap}>
                <Ionicons name="sparkles" size={15} color="#a599ff" />
              </View>
              <Text style={[s.headerBtnText, { color: '#a599ff' }]}>Coach</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ─── 2. SCROLLABLE CONTENT (Flows naturally under floating pill & status bar) ─── */}
      <ScrollView
        contentContainerStyle={[
          s.scrollContent,
          {
            paddingTop: insets.top + 52,
            paddingBottom: insets.bottom + 105,
          },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* WEEK CALENDAR STRIP */}
        <View style={s.weekStrip}>
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              setWeekOffset(prev => prev - 1);
              setSelectedDate(prev => dateStrOffset(-7, prev));
            }}
            style={s.weekNavBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={16} color={colors.textTertiary} />
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
                    hapticLight();
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
              hapticLight();
              setWeekOffset(prev => prev + 1);
              setSelectedDate(prev => dateStrOffset(7, prev));
            }}
            style={s.weekNavBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {isEffectiveRest ? (
          weeklyReportReady ? (
            <Suspense fallback={<WeeklyReportSkeleton />}>
              <WeeklyGymReport gymLogs={gymLogs} weekAnchorDate={selectedDate} userGymPlan={userGymPlan} />
            </Suspense>
          ) : (
            <WeeklyReportSkeleton />
          )
        ) : (
          <>
            {/* HERO WORKOUT BANNER (Integrated Naturally in Flow) */}
            <View style={s.workoutSection}>
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
          />
        </View>

        {/* EXERCISES SECTION */}
        <View style={s.section}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}>
            <Text style={s.sectionLabel}>EXERCISES</Text>
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                setShowAddModal(true);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={15} color={isDark ? '#A599FF' : '#6C5CE7'} />
              <Text style={{ fontSize: 12, fontFamily: FONT_FAMILY.bold, color: isDark ? '#A599FF' : '#6C5CE7' }}>
                Add
              </Text>
            </TouchableOpacity>
          </View>

          {activeExercises.length === 0 ? (
            <View style={{
              backgroundColor: isDark ? '#1C1C1E' : colors.surface,
              borderRadius: 16,
              padding: 24,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border,
            }}>
              <Ionicons name="barbell-outline" size={28} color={colors.textTertiary} style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 15, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary, marginBottom: 4 }}>
                {activePlanDay?.isRest ? 'Rest Day Scheduled' : 'No Exercises for Today'}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: FONT_FAMILY.body, color: colors.textMuted, textAlign: 'center', lineHeight: 18 }}>
                {activePlanDay?.isRest
                  ? 'Take time to recover, hydrate, and prepare for your next lifting session.'
                  : 'Tap below to add movements or swap your routine day.'}
              </Text>
            </View>
          ) : (
            activeExercises.map((ex: any, idx: number) => {
              const itemParams = {
                item: { ...ex, originalIndex: idx },
                drag: () => {},
                isActive: false,
                getIndex: () => idx,
              };

              return (
                <GymExerciseDraggableRow
                  key={ex.exerciseId || ex.name || idx}
                  itemParams={itemParams as any}
                  logCompleted={isWorkoutCompleted}
                  logWorkoutStartTime={log?.workoutStartTime || null}
                  logExercises={log?.exercises}
                  s={s}
                  selectedDate={selectedDate}
                  navigation={navigation}
                  onResumeWorkout={(origIdx) => handleResumeWorkout(origIdx)}
                  onShowHistory={(exItem) => setDeepDiveExercise(exItem.name)}
                  onShowMenu={(exItem) => setExerciseMenuFor(exItem)}
                />
              );
            })
          )}
        </View>

        {/* CARDIO SECTION */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>CARDIO</Text>
          {(log?.cardio || []).map((c) => {
            const isDone = c.completed;
            return (
              <TouchableOpacity
                key={c.id}
                style={s.row}
                activeOpacity={0.7}
                onPress={() => setLogCardioFor(c)}
              >
                <View style={s.cardioSquare}>
                  <Ionicons
                    name={isDone ? 'checkmark' : 'fitness-outline'}
                    size={16}
                    color={isDone ? '#FFFFFF' : colors.textMuted}
                  />
                </View>
                <View style={s.rowTextCol}>
                  <Text style={[s.rowTitle, isDone && s.textStrikethrough]}>
                    {c.type || 'Cardio'}
                  </Text>
                  <Text style={s.rowSubtitle}>
                    {c.durationMinutes ? `${c.durationMinutes} min` : '0 min'}
                    {c.distanceKm ? ` • ${c.distanceKm} km` : ''}
                    {c.speedKmh ? ` • ${c.speedKmh} km/h` : ''}
                    {c.incline ? ` • ${c.incline}% incline` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => {
                    hapticMedium();
                    setCardioMenuFor(c);
                  }}
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              alignSelf: 'flex-start',
              paddingVertical: 7,
              paddingHorizontal: 12,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)',
              marginTop: (log?.cardio || []).length > 0 ? 6 : 2,
            }}
            activeOpacity={0.7}
            onPress={() => {
              hapticLight();
              setShowCardioModal(true);
            }}
          >
            <Ionicons name="add" size={15} color={colors.textSecondary} />
            <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 12.5, color: colors.textSecondary }}>Add Cardio</Text>
          </TouchableOpacity>
        </View>

        {/* SESSION MUSCLE TARGET SECTION */}
        {sortedMuscles.length > 0 && (
          <View style={{ paddingHorizontal: 6, paddingTop: 14, paddingBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, opacity: 0.85 }}>
              <Ionicons name="trending-up-outline" size={16} color={colors.textTertiary} />
              <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 11, color: colors.textTertiary, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Session Muscle Target
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' }}>
              {sortedMuscles.map(([muscle, count]) => (
                <View
                  key={muscle}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDark ? '#1C1C1E' : colors.surface,
                    paddingVertical: 7,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 11.5, color: colors.textMuted, fontFamily: FONT_FAMILY.medium, flexShrink: 1 }} numberOfLines={1}>
                    {muscle}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: colors.textTertiary, fontFamily: FONT_FAMILY.bold, marginLeft: 5 }}>
                    ×{count}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
          </>
        )}
      </ScrollView>

      {/* ─── MODALS ─────────────────────────────────────────────────────────── */}
      {/* 1. Swap Routine Modal */}
      {showSwapModal && (
        <SwapRoutineModal
          visible={showSwapModal}
          selectedDate={selectedDate}
          currentPlanDayIndex={activePlanDay?.dayIndex}
          onClose={() => setShowSwapModal(false)}
          onSelectDay={(idx) => {
            swapDayRoutine(idx);
            setShowSwapModal(false);
          }}
        />
      )}

      {/* 2. Add Cardio Modal (Grid: Treadmill, Cycling, Rowing, etc.) */}
      {showBodyMetrics && (
        <BodyMetricsSheet
          visible={showBodyMetrics}
          onClose={() => setShowBodyMetrics(false)}
        />
      )}
      {showCardioModal && (
        <AddCardioModal
          visible={showCardioModal}
          onClose={() => setShowCardioModal(false)}
          onAdd={(type) => {
            addCardio(type);
            setShowCardioModal(false);
          }}
        />
      )}

      {/* 2b. Log / Edit Existing Cardio Modal */}
      {!!logCardioFor && (
        <LogCardioModal
          visible={Boolean(logCardioFor)}
          cardio={logCardioFor}
          onClose={() => setLogCardioFor(null)}
          onSave={(updates) => {
            if (logCardioFor) {
              updateCardio(logCardioFor.id, updates);
            }
            setLogCardioFor(null);
          }}
        />
      )}

      {/* 3. Add Exercise Modal */}
      {showAddModal && (
        <AddExerciseModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={(newEx) => {
            addExercise(newEx);
            setShowAddModal(false);
          }}
          planDay={activePlanDay}
          existingExerciseIds={activeExercises.map((e: any) => e.exerciseId || e.id)}
        />
      )}

      {/* 4. Single Deep Dive Modal */}
      {deepDiveExercise && (
        <ExerciseDeepDiveModal
          visible={Boolean(deepDiveExercise)}
          exerciseName={deepDiveExercise}
          gymLogs={gymLogs || []}
          onClose={() => setDeepDiveExercise(null)}
        />
      )}

      {/* 5. Exercise & Cardio Options Action Sheet */}
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
        onOpenDeepDive={(ex) => setDeepDiveExercise(ex.name)}
        onOpenSwapModal={(ex) => setSwapModalFor(ex)}
      />

      {/* 6. Active Swap Modal */}
      {!!swapModalFor && (
        <ActiveSwapModal
          visible={Boolean(swapModalFor)}
          exercise={swapModalFor}
          aiSwapList={getExerciseSwapAlternatives(swapModalFor.name, swapModalFor.muscle)}
          isAiSwapLoading={false}
          colors={colors}
          styles={s}
          onClose={() => setSwapModalFor(null)}
          onSelectSwap={(alt) => {
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
      )}


      {/* 8. PR Hall of Fame Sheet */}
      <PRHallOfFameSheet
        visible={showPRSheet}
        onClose={() => setShowPRSheet(false)}
      />

      {/* 9. Gym Profile Modal */}
      <GymProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* 10. Exercise History Drawer */}
      <ExerciseHistoryDrawer
        visible={Boolean(historyDrawerEx)}
        exerciseName={historyDrawerEx?.name || null}
        exerciseId={historyDrawerEx?.id || null}
        onClose={() => setHistoryDrawerEx(null)}
      />

      {/* 11. Exercise Detail Modal */}
      {detailModalEx && (
        <ExerciseDetailModal
          visible={Boolean(detailModalEx)}
          exerciseName={detailModalEx}
          onClose={() => setDetailModalEx(null)}
        />
      )}

      {/* 12. ZenFit AI Coach Modal */}
      {showAiModal && (
        <ZenGymAiModal
          visible={showAiModal}
          onClose={() => setShowAiModal(false)}
          workoutData={{
            activeMuscles: activePlanDay?.focus || activePlanDay?.name || 'Workout',
          }}
        />
      )}
    </View>
  );
});

export default GymHomeScreen;
