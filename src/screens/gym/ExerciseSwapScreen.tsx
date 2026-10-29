import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Platform,
  KeyboardAvoidingView, Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { SPACE, FONT_FAMILY } from '../../theme/tokens';
import { useGymLog, todayStr, planDayIndexForDate, getCustomPlanDay } from '../../hooks/useGymLog';
import { useGymPlan, useGymLogs } from '../../contexts/domains/WellnessContext';
import { GYM_PLAN, GYM_PLAN_PPL, GYM_PLAN_ARNOLD } from '../../data/gymPlan';
import { EXERCISE_DATABASE } from '../../data/exerciseDatabase';
import {
  resolveMuscleColor, hexToRgba, canonicalizeMuscle,
  resolveExerciseTargetMuscle, getExerciseSwapAlternatives, getPreviousExerciseSession
} from '../../utils/gymUtils';
import { hapticMedium, hapticSuccess, hapticLight } from '../../utils/haptics';
import { autoResolveExerciseVideoId } from '../../services/exerciseVideoResolver';
import { GymNavigationParamList } from '../../types/gym.types';
import { useTheme } from '../../contexts/ThemeContext';
import { makeExerciseSwapStyles } from './exerciseSwapStyles';

export interface SwapRecommendation {
  id: string;
  name: string;
  muscle: string;
  targetSets: number;
  targetReps: string;
  restTimeSecs: number;
  reason: string;
  videoId?: string;
}

export interface TemplateExerciseSwapItem {
  id: string;
  name: string;
  muscle: string;
  targetSets: number;
  targetReps: string;
  restTimeSecs: number;
  videoId?: string;
  dayIndex: number;
  dayName: string;
  routineName: string;
  isExactMuscleMatch: boolean;
  isFromTemplate: boolean;
}

type ExerciseSwapRouteProp = RouteProp<GymNavigationParamList, 'ExerciseSwap'>;

const SUB_MUSCLE_SYNONYMS: Record<string, string[]> = {
  'upper chest': ['upper chest', 'clavicular head', 'incline'],
  'middle chest': ['middle chest', 'sternal head', 'flat bench'],
  'lower chest': ['lower chest', 'abdominal head', 'decline', 'dip'],
  'lats': ['lats', 'latissimus', 'vertical pull', 'pulldown', 'pull up'],
  'upper back': ['upper back', 'traps', 'rhomboids', 'rear delts', 'horizontal row'],
  'lower back': ['lower back', 'erectors', 'spinal erectors', 'deadlift', 'hyperextension'],
  'front delts': ['front delts', 'anterior deltoid', 'overhead press', 'shoulder press'],
  'side delts': ['side delts', 'lateral deltoid', 'lateral raise'],
  'rear delts': ['rear delts', 'posterior deltoid', 'reverse fly', 'face pull'],
  'quads': ['quads', 'quadriceps', 'squat', 'leg press', 'leg extension', 'lunge'],
  'hamstrings': ['hamstrings', 'leg curl', 'rdl', 'romanian deadlift'],
  'glutes': ['glutes', 'hip thrust', 'glute bridge', 'kickback'],
  'biceps': ['biceps', 'biceps brachii', 'curl'],
  'triceps': ['triceps', 'triceps brachii', 'pushdown', 'skull crusher', 'extension'],
  'calves': ['calves', 'gastrocnemius', 'soleus', 'calf raise'],
  'abs': ['abs', 'abdominals', 'core', 'crunch', 'leg raise', 'plank'],
};

function isSubMuscleMatch(muscleA: string, muscleB: string): boolean {
  if (!muscleA || !muscleB) return false;
  const a = muscleA.toLowerCase().trim();
  const b = muscleB.toLowerCase().trim();
  if (a === b) return true;
  for (const syns of Object.values(SUB_MUSCLE_SYNONYMS)) {
    const hasA = syns.some(s => a.includes(s));
    const hasB = syns.some(s => b.includes(s));
    if (hasA && hasB) return true;
  }
  return false;
}

export function ExerciseSwapScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GymNavigationParamList>>();
  const route = useRoute<ExerciseSwapRouteProp>();
  const originalExerciseId = route.params?.originalExerciseId;
  const date = route.params?.date || todayStr();

  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeExerciseSwapStyles(colors, isDark), [colors, isDark]);

  const { log, updateExercise } = useGymLog(date);
  const { userGymPlan, updateMasterPlan } = useGymPlan();
  const { gymLogs } = useGymLogs();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'template' | 'exact' | 'category'>('all');

  const originalExercise = useMemo(() => {
    if (!log || !originalExerciseId) return null;
    return log.exercises.find(e => e.exerciseId === originalExerciseId || e.id === originalExerciseId);
  }, [log, originalExerciseId]);

  const origName = originalExercise?.name || 'Exercise';
  const rawMuscle = originalExercise?.muscle || '';
  const { targetMuscle: origMuscle, canonicalGroup: canonicalMuscle } = useMemo(
    () => resolveExerciseTargetMuscle(origName, rawMuscle),
    [origName, rawMuscle]
  );

  // 1. Template Exercises
  const templateExercises = useMemo(() => {
    if (!originalExercise) return [];

    const origNameLower = (originalExercise.name || '').toLowerCase().trim();
    const exactMuscleLower = origMuscle.toLowerCase();
    const canonicalMuscleLower = canonicalMuscle.toLowerCase();

    const results: TemplateExerciseSwapItem[] = [];
    const seenNames = new Set<string>();
    seenNames.add(origNameLower);

    const DAY_NAMES: Record<number, string> = {
      1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday'
    };

    const processDay = (day: any, routineLabel: string) => {
      if (!day || !day.exercises || day.isRest) return;
      const dayNameFormatted = DAY_NAMES[day.dayIndex]
        ? `${DAY_NAMES[day.dayIndex]} (${day.name || day.subtitle || ''})`
        : (day.name || 'Routine Day');

      for (const ex of day.exercises) {
        const exName = (ex.name || '').trim();
        const exNameLower = exName.toLowerCase();
        if (!exName || seenNames.has(exNameLower)) continue;

        const exMuscle = ex.muscle || '';
        const exExactLower = exMuscle.toLowerCase();
        const exCanonicalLower = canonicalizeMuscle(exMuscle).toLowerCase();

        const isExact = isSubMuscleMatch(exactMuscleLower, exExactLower);
        const isCategory = isExact || exCanonicalLower === canonicalMuscleLower;

        if (isCategory) {
          seenNames.add(exNameLower);
          results.push({
            id: ex.id || `tpl_${day.dayIndex}_${Date.now()}_${results.length}`,
            name: exName,
            muscle: exMuscle || origMuscle,
            targetSets: ex.targetSets || 3,
            targetReps: ex.targetReps || '8–12',
            restTimeSecs: ex.restTimeSecs || (ex.targetSets && ex.targetSets >= 4 ? 120 : 90),
            videoId: ex.videoId,
            dayIndex: day.dayIndex,
            dayName: dayNameFormatted,
            routineName: routineLabel,
            isExactMuscleMatch: isExact,
            isFromTemplate: true,
          });
        }
      }
    };

    if (userGymPlan?.customDays && Object.keys(userGymPlan.customDays).length > 0) {
      Object.values(userGymPlan.customDays).forEach((day: any) => processDay(day, 'My Routine'));
    } else {
      const templateId = userGymPlan?.templateId;
      const activePlan = templateId === 'arnold' ? GYM_PLAN_ARNOLD : (templateId === 'ppl' ? GYM_PLAN_PPL : GYM_PLAN);
      const label = templateId === 'arnold' ? 'Arnold Routine' : (templateId === 'ppl' ? 'PPL Routine' : 'Standard Routine');
      activePlan.forEach(day => processDay(day, label));
    }

    return results.sort((a, b) => {
      if (a.isExactMuscleMatch && !b.isExactMuscleMatch) return -1;
      if (!a.isExactMuscleMatch && b.isExactMuscleMatch) return 1;
      return a.dayIndex - b.dayIndex;
    });
  }, [originalExercise, origMuscle, canonicalMuscle, userGymPlan]);

  // 2. Scientific Biomechanical Alternatives (Instant & Deterministic)
  const biomechanicalSwaps = useMemo<SwapRecommendation[]>(() => {
    const instantSwaps = getExerciseSwapAlternatives(origName, rawMuscle);
    return instantSwaps.map((alt, idx) => ({
      id: alt.id || `curated_${idx}_${Date.now()}`,
      name: alt.name,
      muscle: alt.muscle,
      targetSets: alt.targetSets,
      targetReps: alt.targetReps,
      restTimeSecs: alt.restTimeSecs,
      reason: alt.reason || `Biomechanical alternative matching ${alt.muscle}`,
      videoId: alt.videoId,
    }));
  }, [origName, rawMuscle]);

  // 3. Searchable catalogue
  const allExercises = useMemo(() => {
    const map = new Map<string, any>();
    for (const tpl of templateExercises) {
      map.set(tpl.name.toLowerCase().trim(), {
        ...tpl,
        muscleColor: resolveMuscleColor(tpl.muscle),
        muscleBgColor: hexToRgba(resolveMuscleColor(tpl.muscle), 0.1),
      });
    }
    for (const db of EXERCISE_DATABASE) {
      const key = (db.name || '').toLowerCase().trim();
      if (!key || map.has(key)) continue;
      const muscleColor = resolveMuscleColor(db.muscle || 'Mixed');
      map.set(key, {
        id: db.id || `db_${key}`,
        name: db.name,
        muscle: db.muscle || 'Mixed',
        targetSets: 3,
        targetReps: '8–12',
        restTimeSecs: 90,
        videoId: (db as any).videoId && (db as any).videoId !== '1' ? (db as any).videoId : undefined,
        isFromTemplate: false,
        aliases: db.aliases || [],
        muscleColor,
        muscleBgColor: hexToRgba(muscleColor, 0.1),
      });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [templateExercises]);

  const filteredExercises = useMemo(() => {
    let list = allExercises;
    const lowerSearch = search.trim().toLowerCase();

    if (filterType === 'template') {
      list = list.filter(ex => ex.isFromTemplate);
    } else if (filterType === 'exact' && origMuscle) {
      const targetLower = origMuscle.toLowerCase();
      list = list.filter(ex => (ex.muscle || '').toLowerCase().includes(targetLower) || targetLower.includes((ex.muscle || '').toLowerCase()));
    } else if (filterType === 'category' && canonicalMuscle) {
      list = list.filter(ex => canonicalizeMuscle(ex.muscle).toLowerCase() === canonicalMuscle.toLowerCase());
    }

    if (!lowerSearch) return list;

    return list.filter(ex =>
      ex.name.toLowerCase().includes(lowerSearch) ||
      (ex.muscle && ex.muscle.toLowerCase().includes(lowerSearch)) ||
      (ex.aliases && ex.aliases.some((a: string) => a.toLowerCase().includes(lowerSearch)))
    );
  }, [allExercises, search, filterType, origMuscle, canonicalMuscle]);

  const handleSwap = useCallback((newExDef: any) => {
    if (!log || !originalExerciseId) return;

    const index = log.exercises.findIndex(e => e.exerciseId === originalExerciseId || e.id === originalExerciseId);
    if (index === -1) return;

    hapticSuccess();

    const existingLog = log.exercises[index];
    const oldName = existingLog.name;
    const targetSets = newExDef.targetSets || existingLog.targetSets || 3;
    const targetReps = newExDef.targetReps || existingLog.targetReps || '8-12';
    const restTimeSecs = newExDef.restTimeSecs || existingLog.restTimeSecs || 90;

    const lastSession = getPreviousExerciseSession(newExDef.name, gymLogs);
    const lastSets = lastSession?.sets;
    const lastValidSet = lastSets && lastSets.length > 0 ? lastSets[lastSets.length - 1] : undefined;
    const defaultReps = parseInt(String(targetReps).split(/[-–—]/)[0], 10) || 10;

    const targetMuscleResolved = resolveExerciseTargetMuscle(newExDef.name, newExDef.muscle || existingLog.muscle).targetMuscle;

    const updatedExercise = {
      ...existingLog,
      exerciseId: newExDef.id || `swap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: newExDef.name,
      muscle: targetMuscleResolved || newExDef.muscle || existingLog.muscle,
      videoId: newExDef.videoId || '',
      targetSets,
      targetReps,
      restTimeSecs,
      lastSessionSets: lastSets ?? undefined,
      setsLog: Array.from({ length: targetSets }, (_, i) => {
        const prev = lastSets?.[i] || lastValidSet;
        return {
          setNumber: i + 1,
          reps: prev?.reps ?? defaultReps,
          weight: prev?.weight ?? null,
          completed: false,
        };
      }),
      isCustom: false,
    };

    updateExercise(index, updatedExercise);

    if (!newExDef.videoId) {
      autoResolveExerciseVideoId(newExDef.name).then(resolvedVid => {
        if (resolvedVid) {
          updateExercise(index, { ...updatedExercise, videoId: resolvedVid });
        }
      }).catch(() => {});
    }

    Alert.alert(
      'Exercise Swapped!',
      `Replaced "${oldName}" with "${newExDef.name}".\n\nDo you want to save "${newExDef.name}" permanently for all future workouts on this day?`,
      [
        { text: 'Today Only', style: 'cancel', onPress: () => navigation.goBack() },
        {
          text: 'Save for Future Days',
          onPress: async () => {
            try {
              const planIdx = planDayIndexForDate(date);
              const currentMasterDay = getCustomPlanDay(userGymPlan?.customDays, planIdx) || GYM_PLAN.find(d => d.dayIndex === planIdx);
              if (currentMasterDay && updateMasterPlan) {
                const targetOldName = (oldName || '').toLowerCase().trim();
                let updatedExercises = [...currentMasterDay.exercises];
                const matchIndex = updatedExercises.findIndex((e: any) =>
                  (e.id && e.id === originalExerciseId) ||
                  (e.exerciseId && e.exerciseId === originalExerciseId) ||
                  (targetOldName && (e.name || '').toLowerCase().trim() === targetOldName)
                );

                if (matchIndex !== -1) {
                  updatedExercises[matchIndex] = {
                    ...updatedExercises[matchIndex],
                    name: newExDef.name,
                    muscle: targetMuscleResolved || newExDef.muscle || updatedExercises[matchIndex].muscle,
                    targetSets,
                    targetReps,
                    restTimeSecs,
                    videoId: newExDef.videoId || undefined,
                  };
                }
                await updateMasterPlan(planIdx, { ...currentMasterDay, exercises: updatedExercises });
              }
            } catch (_) {}
            navigation.goBack();
          },
        },
      ]
    );
  }, [log, originalExerciseId, updateExercise, gymLogs, date, userGymPlan, updateMasterPlan, navigation]);

  const renderSwapItem = useCallback(({ item }: { item: any }) => {
    const aliasDisplay = (() => {
      if (!item.aliases || item.aliases.length === 0) return null;
      const cleanItemName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const distinct = item.aliases.filter((a: string) => a.toLowerCase().replace(/[^a-z0-9]/g, '') !== cleanItemName);
      if (distinct.length === 0) return null;

      if (search && search.trim().length > 1) {
        const q = search.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const matched = distinct.find((a: string) => a.toLowerCase().replace(/[^a-z0-9]/g, '').includes(q));
        if (matched) {
          const others = distinct.filter((a: string) => a !== matched).slice(0, 1);
          return [matched, ...others].join(' • ');
        }
      }
      return distinct.slice(0, 2).join(' • ');
    })();

    return (
      <TouchableOpacity
        style={styles.exerciseCard}
        onPress={() => handleSwap(item)}
        activeOpacity={0.7}
      >
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          {aliasDisplay ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1, marginBottom: 2 }}>
              <Text style={{ fontSize: 11, color: '#A599FF', marginRight: 3, fontFamily: FONT_FAMILY.bold }}>↳</Text>
              <Text style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.45)', fontFamily: FONT_FAMILY.medium }} numberOfLines={1}>
                Also known as: <Text style={{ color: '#DDD6FE', fontFamily: FONT_FAMILY.bold }}>{aliasDisplay}</Text>
              </Text>
            </View>
          ) : null}
          <View style={styles.badgeRow}>
            <View style={[styles.muscleBadge, { backgroundColor: item.muscleBgColor }]}>
              <Text style={[styles.muscleBadgeText, { color: item.muscleColor }]}>{item.muscle}</Text>
            </View>
            {item.isFromTemplate && (
              <View style={styles.templateBadge}>
                <Ionicons name="calendar-outline" size={11} color="#a599ff" />
                <Text style={styles.templateBadgeText}>{item.templateDayName || item.routineName}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.swapAction}>
          <Ionicons name="swap-horizontal" size={18} color="#a599ff" />
          <Text style={styles.swapActionText}>Swap</Text>
        </View>
      </TouchableOpacity>
    );
  }, [styles, handleSwap, search]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Swap Exercise</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            Replacing: <Text style={{ color: colors.textPrimary, fontFamily: FONT_FAMILY.bold }}>{origName}</Text>
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises or muscles..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {search.trim().length > 0 ? (
          <FlatList
            data={filteredExercises}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={renderSwapItem}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="barbell-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyText}>No exercises found.</Text>
              </View>
            }
          />
        ) : (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {/* Template Exercises */}
            {templateExercises.length > 0 && (
              <View style={{ marginBottom: SPACE.lg }}>
                <View style={styles.sectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="calendar" size={15} color="#a599ff" />
                    <Text style={styles.sectionHeaderTitle}>From Workout Template ({templateExercises.length})</Text>
                  </View>
                  <Text style={styles.sectionHeaderSub}>Routine Matches</Text>
                </View>

                {templateExercises.map((tplEx, idx) => (
                  <TouchableOpacity
                    key={tplEx.id || idx}
                    style={styles.templateSwapCard}
                    onPress={() => handleSwap(tplEx)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exerciseName}>{tplEx.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <View style={[styles.muscleBadge, { backgroundColor: hexToRgba(resolveMuscleColor(tplEx.muscle), 0.12) }]}>
                          <Text style={[styles.muscleBadgeText, { color: resolveMuscleColor(tplEx.muscle) }]}>{tplEx.muscle}</Text>
                        </View>
                        <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 11, color: colors.textMuted }}>
                          {tplEx.dayName}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="swap-horizontal" size={18} color="#a599ff" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Scientific Biomechanical Alternatives */}
            <View style={{ marginBottom: SPACE.lg }}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="fitness-outline" size={15} color={colors.accentPrimary} />
                  <Text style={styles.sectionHeaderTitle}>Scientific Alternatives ({biomechanicalSwaps.length})</Text>
                </View>
                <Text style={styles.sectionHeaderSub}>Target Fiber Matches</Text>
              </View>

              {biomechanicalSwaps.map((item, idx) => (
                <TouchableOpacity
                  key={item.id || idx}
                  style={styles.exerciseCard}
                  onPress={() => handleSwap(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{item.name}</Text>
                    <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>
                      {item.reason}
                    </Text>
                    <View style={[styles.muscleBadge, { backgroundColor: hexToRgba(resolveMuscleColor(item.muscle), 0.12), marginTop: 6, alignSelf: 'flex-start' }]}>
                      <Text style={[styles.muscleBadgeText, { color: resolveMuscleColor(item.muscle) }]}>{item.muscle}</Text>
                    </View>
                  </View>
                  <View style={styles.swapAction}>
                    <Ionicons name="swap-horizontal" size={18} color="#a599ff" />
                    <Text style={styles.swapActionText}>Swap</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default ExerciseSwapScreen;
