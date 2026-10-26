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

  return (
    <>
      <View style={styles.container}>
        {/* ── 1. 7-Day Mon–Sun Apple HIG Segmented Strip ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>WEEKLY SCHEDULE</Text>
          <Text style={styles.todayLabel}>
            Today: {DAY_SHORT[todayDayIndex - 1]}
          </Text>
        </View>

        <View style={[styles.dayStrip, { backgroundColor: isDark ? '#141418' : 'rgba(0, 0, 0, 0.04)' }]}>
          {resolvedDays.map(d => {
            const isSelected = selectedDayIndex === d.dayIndex;
            const isToday = d.dayIndex === todayDayIndex;
            const isRest = Boolean(d.planDay.isRest);
            const exerciseCount = d.planDay.exercises?.length || 0;

            return (
              <TouchableOpacity
                key={`day-${d.dayIndex}`}
                activeOpacity={0.7}
                onPress={() => {
                  hapticLight();
                  onSelectDayIndex(d.dayIndex);
                }}
                style={[
                  styles.dayPill,
                  isSelected && styles.dayPillActive,
                ]}
              >
                {isToday && <View style={[styles.todayIndicatorDot, isSelected && styles.todayIndicatorDotActive]} />}
                <Text style={[styles.dayPillName, isSelected && styles.dayPillNameActive]}>
                  {DAY_SHORT[d.dayIndex - 1]}
                </Text>
                {isRest ? (
                  <Text
                    style={[
                      styles.dayPillTag,
                      styles.dayPillTagRest,
                      isSelected && styles.dayPillTagActive,
                    ]}
                    numberOfLines={1}
                  >
                    Rest
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.dayPillTag,
                      isSelected && styles.dayPillTagActive,
                    ]}
                    numberOfLines={1}
                  >
                    {exerciseCount > 0 ? `${exerciseCount} ex` : 'Train'}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── 2. Subtle Weekly Split Volume Bar (Apple Health Style) ── */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => {
            hapticLight();
            setAuditExpanded(!auditExpanded);
          }}
          style={[styles.auditCard, { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface }]}
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

          {/* Segmented Multi-Color Volume Bar */}
          {weeklyAudit.totalSets > 0 && (
            <View style={styles.auditProgressBar}>
              {weeklyAudit.sortedMuscles.map(([muscle, sets]) => {
                const pct = (sets / weeklyAudit.totalSets) * 100;
                const color = resolveMuscleColor(muscle);
                return (
                  <View
                    key={`bar-${muscle}`}
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      backgroundColor: color,
                    }}
                  />
                );
              })}
            </View>
          )}

          {auditExpanded && (
            <View style={styles.auditExpandedWrap}>
              <View style={styles.muscleGrid}>
                {weeklyAudit.sortedMuscles.map(([muscle, sets]) => {
                  const color = resolveMuscleColor(muscle);
                  const pct = weeklyAudit.totalSets > 0 ? Math.round((sets / weeklyAudit.totalSets) * 100) : 0;

                  return (
                    <View key={`aud-${muscle}`} style={styles.muscleGridItem}>
                      <View style={[styles.muscleDot, { backgroundColor: color }]} />
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
        <View
          style={[
            styles.dayWorkoutCard,
            { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface },
          ]}
        >
          {activeDayIsRest ? (
            <View style={styles.restCardBody}>
              <View style={styles.restIconBox}>
                <Ionicons name="moon-outline" size={24} color="#A599FF" />
              </View>
              <Text style={[styles.restTitle, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}>
                {activeDay.dayName}: Rest & Recovery
              </Text>
              <Text style={styles.restSubtitle}>
                Scheduled active recovery, muscle repair & nervous system restoration.
              </Text>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => onToggleRest(activeDay.dayIndex)}
                style={styles.switchWorkoutBtn}
              >
                <Ionicons name="fitness-outline" size={15} color="#A599FF" style={{ marginRight: 6 }} />
                <Text style={styles.switchWorkoutBtnText}>Switch to Workout Day</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.dayCardBody}>
              {/* Header: Day Name + Title + Single Primary "Customize" Action */}
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

                {/* 1-Tap Subtle Secondary Action */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    hapticLight();
                    onEditRoutineExercises(activeDay.planDay, activeDay.dayIndex);
                  }}
                  style={styles.customizeBtn}
                >
                  <Ionicons name="create-outline" size={13} color="#A599FF" style={{ marginRight: 4 }} />
                  <Text style={styles.customizeBtnText}>Customize</Text>
                </TouchableOpacity>
              </View>

              {/* Direct Exercise Cards: Visible directly with 0 extra taps */}
              <View style={styles.directExerciseList}>
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
                    const tier = EXERCISE_TIER_MAP.get(normalizeExerciseKey(ex.name));

                    return (
                      <TouchableOpacity
                        key={`ex-row-${idx}-${ex.id || ex.name}`}
                        activeOpacity={0.75}
                        onPress={() => {
                          hapticLight();
                          onEditRoutineExercises(activeDay.planDay, activeDay.dayIndex);
                        }}
                        style={[
                          styles.directExerciseRow,
                          idx !== activeDayExercises.length - 1 && styles.directExerciseRowBorder,
                        ]}
                      >
                        <View style={styles.directExLeft}>
                          {/* Exercise Name & Muscle / Tier */}
                          <View style={styles.directExTextCol}>
                            <Text
                              style={[styles.directExName, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}
                              numberOfLines={1}
                            >
                              {ex.name}
                            </Text>
                            <View style={styles.directExMetaRow}>
                              <View style={[styles.muscleDot, { backgroundColor: muscleColor }]} />
                              <Text style={styles.directExMuscle} numberOfLines={1}>
                                {targetMuscle}
                              </Text>
                              {tier ? (
                                <View style={[styles.tierTag, tier === 'S Tier' ? styles.sTierTag : styles.aTierTag]}>
                                  <Text style={[styles.tierTagText, tier === 'S Tier' ? styles.sTierText : styles.aTierText]}>
                                    {tier}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </View>
                        </View>

                        {/* Sets × Reps - Natural Subtle Typography (NO PILL) */}
                        <View style={styles.directExRight}>
                          <Text style={[styles.setsRepsNaturalText, { color: isDark ? '#E5E5EA' : colors.textPrimary }]}>
                            {ex.targetSets || 3}
                            <Text style={styles.setsRepsCross}> × </Text>
                            {ex.targetReps || '8–12'}
                          </Text>
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
    fontSize: 11,
    color: '#8E8E93',
    letterSpacing: 0.8,
  },
  todayLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#A599FF',
  },
  dayStrip: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginHorizontal: 16,
  },
  dayPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 9,
    position: 'relative',
  },
  todayIndicatorDot: {
    position: 'absolute',
    top: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#30D158',
  },
  todayIndicatorDotActive: {
    backgroundColor: '#000000',
  },
  dayPillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  dayPillName: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#8E8E93',
  },
  dayPillNameActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  dayPillTag: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#636366',
    marginTop: 2,
  },
  dayPillTagActive: {
    color: '#000000',
  },
  dayPillTagRest: {
    color: '#8E8E93',
  },
  auditCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
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
    fontSize: 12,
    color: '#8E8E93',
  },
  auditProgressBar: {
    flexDirection: 'row',
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
  dayWorkoutCard: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    padding: 14,
  },
  dayCardBody: {},
  dayCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  dayCardDayLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
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
    fontSize: 17,
    letterSpacing: -0.3,
  },
  dayCardSubCount: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  customizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 92, 231, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.25)',
  },
  customizeBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#A599FF',
  },
  directExerciseList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 4,
  },
  noExercisesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  noExercisesText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    color: '#8E8E93',
  },
  directExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  directExerciseRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  directExLeft: {
    flex: 1,
    paddingRight: 10,
  },
  directExTextCol: {
    flex: 1,
  },
  directExName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13.5,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  directExMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  muscleDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  directExMuscle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8E8E93',
  },
  tierTag: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginLeft: 3,
  },
  sTierTag: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
  },
  sTierText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    color: '#FFD700',
  },
  aTierTag: {
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
  },
  aTierText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    color: '#A599FF',
  },
  tierTagText: {},
  directExRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 8,
  },
  setsRepsNaturalText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    letterSpacing: -0.2,
  },
  setsRepsCross: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8E8E93',
  },
  footerChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  footerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  footerChipText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#8E8E93',
  },
  restIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(165, 153, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  restCardBody: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  restTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    marginBottom: 2,
  },
  restSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 17,
  },
  switchWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  switchWorkoutBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#A599FF',
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
