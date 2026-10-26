import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GymPlanDay, GymPlanExercise, GymRoutine } from '../../types/gym.types';
import { EXERCISE_DATABASE } from '../../data/exerciseDatabase';
import { normalizeExerciseKey, resolveMuscleColor, resolveExerciseTargetMuscle } from '../../utils/gymUtils';
import { hapticLight, hapticSuccess } from '../../utils/haptics';
import { FONT_FAMILY, IOS_DARK, SPACE } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Precompute static tier map
const EXERCISE_TIER_MAP = (() => {
  const map = new Map<string, string>();
  for (const ex of EXERCISE_DATABASE) {
    if (ex.tier) {
      map.set(normalizeExerciseKey(ex.name), ex.tier);
      ex.aliases?.forEach(a => map.set(normalizeExerciseKey(a), ex.tier!));
    }
  }
  return map;
})();

export interface WeeklyScheduleStripProps {
  resolvedDays: { dayIndex: number; dayName: string; planDay: GymPlanDay }[];
  selectedDayIndex: number;
  onSelectDayIndex: (index: number) => void;
  onToggleRest: (dayIndex: number) => void;
  onRenameDay: (dayIndex: number) => void;
  onEditTime: (dayIndex: number) => void;
  onEditRoutineExercises: (planDay: GymPlanDay, dayIndex: number) => void;
  onAssignRoutine: (dayIndex: number, routineId?: string, routine?: GymRoutine) => void;
  customRoutines?: GymRoutine[];
}

export const WeeklyScheduleStrip: React.FC<WeeklyScheduleStripProps> = ({
  resolvedDays,
  selectedDayIndex,
  onSelectDayIndex,
  onToggleRest,
  onRenameDay,
  onEditTime,
  onEditRoutineExercises,
  onAssignRoutine,
  customRoutines = [],
}) => {
  const { colors, isDark } = useTheme();
  const [showAssignSheet, setShowAssignSheet] = useState(false);
  const [auditExpanded, setAuditExpanded] = useState(false);

  // Today's day index (1 = Monday, 7 = Sunday)
  const todayDayOfWeek = new Date().getDay();
  const todayDayIndex = todayDayOfWeek === 0 ? 7 : todayDayOfWeek;

  const activeDay = useMemo(() => {
    return resolvedDays.find(d => d.dayIndex === selectedDayIndex) || resolvedDays[0];
  }, [resolvedDays, selectedDayIndex]);

  const activeDayExercises = activeDay.planDay.exercises || [];
  const activeDayIsRest = Boolean(activeDay.planDay.isRest);

  const formatTimeSlot = (timeStr?: string) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const hour = parseInt(parts[0], 10);
    const mins = parts[1];
    if (isNaN(hour)) return timeStr;
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${mins} ${period}`;
  };

  const formattedDayTime = formatTimeSlot(activeDay.planDay.startTime);

  // Active training days count
  const trainingDaysCount = useMemo(() => {
    return resolvedDays.filter(d => !d.planDay.isRest && (d.planDay.exercises?.length || 0) > 0).length;
  }, [resolvedDays]);

  // Weekly Volume Breakdown by Canonical Muscle Group
  const weeklyAudit = useMemo(() => {
    let totalSets = 0;
    const muscleMap: Record<string, number> = {};

    for (const d of resolvedDays) {
      if (d.planDay.isRest) continue;
      for (const ex of d.planDay.exercises || []) {
        const sets = Number(ex.targetSets) || 3;
        totalSets += sets;

        const { targetMuscle, canonicalGroup } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
        const group = canonicalGroup || targetMuscle || 'Other';
        muscleMap[group] = (muscleMap[group] || 0) + sets;
      }
    }

    const sortedMuscles = Object.entries(muscleMap)
      .filter(([_, sets]) => sets > 0)
      .sort((a, b) => b[1] - a[1]);

    return { totalSets, sortedMuscles };
  }, [resolvedDays]);

  const activeDayTotalSets = useMemo(() => {
    return activeDayExercises.reduce((acc, ex) => acc + (Number(ex.targetSets) || 3), 0);
  }, [activeDayExercises]);

  // Precompute current week's calendar dates (Mon..Sun) to match Today tab
  const weekDaysInfo = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sun
    const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
    const mon = new Date(now);
    mon.setDate(now.getDate() + distanceToMon);

    const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    return resolvedDays.map((d, idx) => {
      const dayDate = new Date(mon);
      dayDate.setDate(mon.getDate() + idx);
      return {
        ...d,
        dateNum: dayDate.getDate(),
        dayLetter: letters[idx],
      };
    });
  }, [resolvedDays]);

  return (
    <>
      <View style={styles.container}>
        {/* ── 1. 7-Day Mon–Sun Apple HIG Segmented Strip (Matching Today Tab) ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>WEEKLY SCHEDULE</Text>
          <Text style={styles.todayLabel}>
            Today: {DAY_SHORT[todayDayIndex - 1]}
          </Text>
        </View>

        <View style={styles.weekStrip}>
          <View style={styles.weekDaysContainer}>
            {weekDaysInfo.map(d => {
              const isSelected = selectedDayIndex === d.dayIndex;
              const isToday = d.dayIndex === todayDayIndex;
              const isRest = Boolean(d.planDay.isRest);
              const exerciseCount = d.planDay.exercises?.length || 0;

              return (
                <TouchableOpacity
                  key={`day-${d.dayIndex}`}
                  style={styles.dayCol}
                  onPress={() => {
                    hapticLight();
                    onSelectDayIndex(d.dayIndex);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayLetter, isSelected && styles.dayLetterActive]}>
                    {d.dayLetter}
                  </Text>
                  <View style={[styles.dayPill, isSelected && styles.dayPillActive]}>
                    <Text style={[styles.dayNum, isSelected && styles.dayNumActive]}>
                      {d.dateNum}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.daySubLabel,
                      isSelected && styles.daySubLabelActive,
                      isRest && styles.daySubLabelRest,
                    ]}
                    numberOfLines={1}
                  >
                    {isRest ? 'Rest' : (exerciseCount > 0 ? `${exerciseCount} ex` : 'Train')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── 2. Subtle Weekly Split Volume Bar (Clean, Unified Apple Health Style - NO multi-color rainbow!) ── */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => {
            hapticLight();
            setAuditExpanded(!auditExpanded);
          }}
          style={[styles.auditCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : colors.surface }]}
        >
          <View style={styles.auditRow}>
            <View style={styles.auditLeft}>
              <Ionicons name="stats-chart" size={13} color="#A599FF" />
              <Text style={[styles.auditTitle, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}>
                Weekly Volume
              </Text>
            </View>
            <View style={styles.auditRight}>
              <Text style={styles.auditMeta}>
                {weeklyAudit.totalSets} Sets · {trainingDaysCount} Workouts
              </Text>
              <Ionicons
                name={auditExpanded ? 'chevron-up' : 'chevron-down'}
                size={13}
                color="#8E8E93"
                style={{ marginLeft: 5 }}
              />
            </View>
          </View>

          {/* Unified Purple Accent Progress Bar (Clean & Cohesive) */}
          {weeklyAudit.totalSets > 0 && (
            <View style={styles.auditProgressBar}>
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 2,
                  backgroundColor: '#6C5CE7',
                }}
              />
            </View>
          )}

          {auditExpanded && (
            <View style={styles.auditExpandedWrap}>
              <View style={styles.muscleGrid}>
                {weeklyAudit.sortedMuscles.map(([muscle, sets]) => {
                  const pct = weeklyAudit.totalSets > 0 ? Math.round((sets / weeklyAudit.totalSets) * 100) : 0;

                  return (
                    <View key={`aud-${muscle}`} style={styles.muscleGridItem}>
                      <View style={[styles.muscleDot, { backgroundColor: '#A599FF' }]} />
                      <Text
                        style={[styles.muscleGridName, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {muscle}
                      </Text>
                      <Text style={styles.muscleGridSets}>{sets}s</Text>
                      <Text style={styles.muscleGridPct}>{pct}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* ── 3. Selected Day Card (Schedule-First Direct Exercise View) ── */}
        <View style={styles.daySectionWrapper}>
          {activeDayIsRest ? (
            <View
              style={[
                styles.restCardBody,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : colors.surface },
              ]}
            >
              <View style={styles.restIconBox}>
                <Ionicons name="leaf-outline" size={22} color="#30D158" />
              </View>
              <Text style={[styles.restTitle, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}>
                {activeDay.dayName}: Rest & Recovery
              </Text>
              <Text style={styles.restSubtitle}>
                Muscles repair and grow during sleep & rest.
              </Text>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => onToggleRest(activeDay.dayIndex)}
                style={styles.switchWorkoutBtn}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.switchWorkoutBtnText}>Switch to Workout Day</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.dayContentBox}>
              {/* Header: Day Name + Title + Single Primary "Customize" Action (Styled like Today tab + Add button) */}
              <View style={styles.dayCardHeaderRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View style={styles.dayBadgeRow}>
                    <Text style={styles.dayCardDayLabel}>{activeDay.dayName.toUpperCase()}</Text>
                    {activeDay.dayIndex === todayDayIndex && (
                      <View style={styles.todayPillBadge}>
                        <Text style={styles.todayPillText}>TODAY</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[styles.dayCardTitle, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}
                    numberOfLines={2}
                  >
                    {activeDay.planDay.name}
                  </Text>
                  <Text style={styles.dayCardSubCount} numberOfLines={1}>
                    {activeDayExercises.length} Movements · {activeDayTotalSets} Sets
                    {activeDay.planDay.focus ? ` · ${activeDay.planDay.focus}` : ''}
                  </Text>
                </View>

                {/* Pill Action Button matching Today tab's + Add button style */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    hapticLight();
                    onEditRoutineExercises(activeDay.planDay, activeDay.dayIndex);
                  }}
                  style={styles.customizeBtn}
                >
                  <Ionicons name="pencil" size={12} color={isDark ? '#000000' : '#FFFFFF'} style={{ marginRight: 4 }} />
                  <Text style={styles.customizeBtnText}>Customize</Text>
                </TouchableOpacity>
              </View>

              {/* Standalone Exercise Cards (Matching Today Tab) */}
              <View style={styles.exerciseCardsWrapper}>
                {activeDayExercises.length === 0 ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => onEditRoutineExercises(activeDay.planDay, activeDay.dayIndex)}
                    style={styles.noExercisesBox}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#A599FF" />
                    <Text style={styles.noExercisesText}>No movements yet. Tap to add exercises.</Text>
                  </TouchableOpacity>
                ) : (
                  activeDayExercises.map((ex, idx) => {
                    const { targetMuscle } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
                    const muscleColor = resolveMuscleColor(targetMuscle);

                    return (
                      <TouchableOpacity
                        key={`ex-card-${idx}-${ex.id || ex.name}`}
                        activeOpacity={0.75}
                        onPress={() => {
                          hapticLight();
                          onEditRoutineExercises(activeDay.planDay, activeDay.dayIndex);
                        }}
                        style={[
                          styles.standaloneExerciseCard,
                          {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : colors.border,
                          },
                        ]}
                      >
                        <View style={styles.cardLeftZone}>
                          <Text
                            style={[styles.cardExerciseTitle, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {ex.name}
                          </Text>
                          <View style={styles.cardMetaRow}>
                            <View style={[styles.muscleDot, { backgroundColor: muscleColor }]} />
                            <Text style={styles.cardMuscleName} numberOfLines={1}>
                              {targetMuscle}
                              <Text style={styles.cardSetsRepsInline}>
                                {` · ${ex.targetSets || 3} sets × ${ex.targetReps || '8–12'} reps`}
                              </Text>
                            </Text>
                          </View>
                        </View>

                        <View style={styles.cardRightZone}>
                          <View style={styles.cardSetsBadge}>
                            <Text style={styles.cardSetsBadgeText}>
                              {ex.targetSets || 3}
                              <Text style={styles.cardSetsBadgeCross}> × </Text>
                              {ex.targetReps || '8–12'}
                            </Text>
                          </View>
                          <Ionicons name="ellipsis-horizontal" size={16} color="#8E8E93" style={{ marginLeft: 8 }} />
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              {/* Minimal Secondary Action Chips Row (Tucked cleanly at bottom) */}
              <View style={styles.footerChipsRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    hapticLight();
                    setShowAssignSheet(true);
                  }}
                  style={styles.footerChip}
                >
                  <Ionicons name="swap-horizontal" size={13} color="#A599FF" />
                  <Text style={styles.footerChipText}>Switch Routine</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    hapticLight();
                    onEditTime(activeDay.dayIndex);
                  }}
                  style={styles.footerChip}
                >
                  <Ionicons name="time-outline" size={13} color="#A599FF" />
                  <Text style={styles.footerChipText}>
                    {formattedDayTime || 'Set Time'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    hapticLight();
                    onRenameDay(activeDay.dayIndex);
                  }}
                  style={styles.footerChip}
                >
                  <Ionicons name="pencil-outline" size={12} color="#8E8E93" />
                  <Text style={styles.footerChipText}>Rename</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    hapticLight();
                    onToggleRest(activeDay.dayIndex);
                  }}
                  style={styles.footerChip}
                >
                  <Ionicons name="moon-outline" size={12} color="#8E8E93" />
                  <Text style={styles.footerChipText}>Rest</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ── Quick Sheet: Assign Routine to Day ── */}
      <Modal
        visible={showAssignSheet}
        transparent
        animationType="slide"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={() => setShowAssignSheet(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setShowAssignSheet(false)}>
          <Pressable
            style={[styles.sheetContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.sheetIndicator} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Assign Routine to {DAY_NAMES[activeDay.dayIndex - 1]}
              </Text>
              <TouchableOpacity onPress={() => setShowAssignSheet(false)}>
                <Ionicons name="close-circle" size={22} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {/* Rest Option */}
              <TouchableOpacity
                style={styles.sheetOptionRow}
                onPress={() => {
                  hapticSuccess();
                  onAssignRoutine(activeDay.dayIndex, 'rest');
                  setShowAssignSheet(false);
                }}
              >
                <View style={[styles.sheetIconBox, { backgroundColor: 'rgba(165, 153, 255, 0.12)' }]}>
                  <Ionicons name="moon" size={16} color="#A599FF" />
                </View>
                <View style={styles.sheetOptionTextCol}>
                  <Text style={[styles.sheetOptionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Rest & Recovery
                  </Text>
                  <Text style={styles.sheetOptionSub}>Scheduled rest, stretching & recovery</Text>
                </View>
              </TouchableOpacity>

              {/* My Custom Routines */}
              {customRoutines.length > 0 && (
                <>
                  <Text style={styles.sheetSectionHeader}>MY CUSTOM ROUTINES</Text>
                  {customRoutines.map(rt => (
                    <TouchableOpacity
                      key={`assign-rt-${rt.id}`}
                      style={styles.sheetOptionRow}
                      onPress={() => {
                        hapticSuccess();
                        onAssignRoutine(activeDay.dayIndex, rt.id, rt);
                        setShowAssignSheet(false);
                      }}
                    >
                      <View style={[styles.sheetIconBox, { backgroundColor: 'rgba(48, 209, 88, 0.12)' }]}>
                        <Ionicons name="barbell" size={16} color="#30D158" />
                      </View>
                      <View style={styles.sheetOptionTextCol}>
                        <Text style={[styles.sheetOptionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                          {rt.name}
                        </Text>
                        <Text style={styles.sheetOptionSub}>
                          {rt.exercises?.length || 0} movements · {rt.subtitle || rt.focus || 'Custom Routine'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Standard Templates */}
              <Text style={styles.sheetSectionHeader}>CURATED SPLIT ROUTINES</Text>
              {[
                { name: 'Push (Chest, Delts, Triceps)', focus: 'Chest & Triceps Focus' },
                { name: 'Pull (Back, Biceps, Rear Delts)', focus: 'Lats & Upper Back Focus' },
                { name: 'Legs (Quads, Hamstrings, Calves)', focus: 'Leg Hypertrophy Focus' },
                { name: 'Upper Body (Chest, Back, Arms)', focus: 'Full Upper Power' },
                { name: 'Lower Body (Quads, Posterior Chain)', focus: 'Lower Strength' },
              ].map((template, idx) => (
                <TouchableOpacity
                  key={`curated-${idx}`}
                  style={styles.sheetOptionRow}
                  onPress={() => {
                    hapticSuccess();
                    const dummyRoutine: GymRoutine = {
                      id: `curated_${Date.now()}_${idx}`,
                      name: template.name,
                      focus: template.focus,
                      exercises: activeDayExercises.length > 0 ? activeDayExercises : [],
                      updatedAt: Date.now(),
                    };
                    onAssignRoutine(activeDay.dayIndex, dummyRoutine.id, dummyRoutine);
                    setShowAssignSheet(false);
                  }}
                >
                  <View style={[styles.sheetIconBox, { backgroundColor: 'rgba(255, 159, 10, 0.12)' }]}>
                    <Ionicons name="flame" size={16} color="#FF9F0A" />
                  </View>
                  <View style={styles.sheetOptionTextCol}>
                    <Text style={[styles.sheetOptionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                      {template.name}
                    </Text>
                    <Text style={styles.sheetOptionSub}>{template.focus}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#8E8E93',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  todayLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#A599FF',
  },
  weekStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCol: {
    alignItems: 'center',
    gap: 3,
    width: 36,
  },
  dayLetter: {
    fontSize: 11,
    color: '#8E8E93',
    fontFamily: FONT_FAMILY.medium,
  },
  dayLetterActive: {
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY.bold,
  },
  dayPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dayPillActive: {
    backgroundColor: '#6C5CE7',
  },
  dayNum: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY.bold,
    textAlign: 'center',
  },
  dayNumActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  daySubLabel: {
    fontSize: 9.5,
    color: '#636366',
    fontFamily: FONT_FAMILY.medium,
    marginTop: 1,
  },
  daySubLabelActive: {
    color: '#A599FF',
    fontFamily: FONT_FAMILY.bold,
  },
  daySubLabelRest: {
    color: '#8E8E93',
  },
  auditCard: {
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  auditLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  auditTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
  },
  auditRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  auditMeta: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11.5,
    color: '#8E8E93',
  },
  auditProgressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  auditExpandedWrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  muscleGridItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    gap: 6,
  },
  muscleGridName: {
    flex: 1,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
  },
  muscleGridSets: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#A599FF',
  },
  muscleGridPct: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
    width: 28,
    textAlign: 'right',
  },
  daySectionWrapper: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  dayContentBox: {},
  dayCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  dayCardDayLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#A599FF',
    letterSpacing: 0.6,
  },
  todayPillBadge: {
    backgroundColor: 'rgba(165, 153, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  todayPillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9,
    color: '#A599FF',
    letterSpacing: 0.5,
  },
  dayCardTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  dayCardSubCount: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 3,
  },
  customizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 999,
  },
  customizeBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#000000',
  },
  exerciseCardsWrapper: {
    gap: 8,
    marginTop: 4,
  },
  standaloneExerciseCard: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeftZone: {
    flex: 1,
    paddingRight: 10,
  },
  cardExerciseTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  muscleDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  cardMuscleName: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8E8E93',
  },
  cardSetsRepsInline: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11.5,
    color: '#8E8E93',
  },
  cardRightZone: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardSetsBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  cardSetsBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#E0E0E6',
  },
  cardSetsBadgeCross: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
  },
  noExercisesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    gap: 8,
  },
  noExercisesText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    color: '#8E8E93',
  },
  footerChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 12,
    paddingTop: 8,
  },
  footerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  footerChipText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11.5,
    color: '#8E8E93',
  },
  restCardBody: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  restIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  restTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    marginBottom: 3,
  },
  restSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 17,
  },
  switchWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  switchWorkoutBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 28,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sheetIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8E8E93',
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
  },
  sheetSectionHeader: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#8E8E93',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },
  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(84, 84, 88, 0.15)',
  },
  sheetIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sheetOptionTextCol: {
    flex: 1,
  },
  sheetOptionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
  },
  sheetOptionSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
});
