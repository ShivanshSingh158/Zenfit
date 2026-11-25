import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, FlatList,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Calendar, Dumbbell, Search, X, ArrowLeftRight } from 'lucide-react-native';

import { SPACE, ICON } from '../../theme/tokens';
import { ScreenWrapper, TactileButton } from '../../components/ui';
import BottomSheet from '../../components/ui/BottomSheet';
import { useGymLog, todayStr, planDayIndexForDate, getCustomPlanDay } from '../../hooks/useGymLog';
import { useGymPlan, useGymLogs } from '../../contexts/domains/WellnessContext';
import { resolvePlanDay } from '../../data/gymPlan';
import { EXERCISE_DATABASE } from '../../data/exerciseDatabase';
import { loadMergedCustomExercises } from '../../services/exerciseCatalogService';
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
  matchPercentage?: number;
  muscleDivision?: string;
  equipment?: string;
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

  const { colors, isDark, tokens } = useTheme();
  const styles = useMemo(() => makeExerciseSwapStyles(colors, isDark, tokens), [colors, isDark, tokens]);

  const { log, updateExercise } = useGymLog(date);
  const { userGymPlan, updateMasterPlan } = useGymPlan();
  const { gymLogs } = useGymLogs();

  const [search, setSearch] = useState('');
  const [customExercises, setCustomExercises] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    loadMergedCustomExercises().then(customs => {
      if (mounted && customs?.length) {
        setCustomExercises(customs);
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const [pendingSwapConfirm, setPendingSwapConfirm] = useState<{
    oldName: string;
    newName: string;
    targetMuscleResolved: string;
    targetSets: number;
    targetReps: string;
    restTimeSecs: number;
    newVideoId?: string;
  } | null>(null);

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
      const label = userGymPlan?.name || 'Current Routine';
      for (let dIdx = 1; dIdx <= 7; dIdx++) {
        processDay(resolvePlanDay(userGymPlan, dIdx), label);
      }
    }

    return results.sort((a, b) => {
      if (a.isExactMuscleMatch && !b.isExactMuscleMatch) return -1;
      if (!a.isExactMuscleMatch && b.isExactMuscleMatch) return 1;
      return a.dayIndex - b.dayIndex;
    });
  }, [originalExercise, origMuscle, canonicalMuscle, userGymPlan]);

  // 2. Target Muscle Matches (Instant & Deterministic)
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
      matchPercentage: alt.matchPercentage,
      muscleDivision: alt.muscleDivision,
      equipment: alt.equipment,
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
    for (const cust of customExercises) {
      const key = (cust.name || '').toLowerCase().trim();
      if (!key || map.has(key)) continue;
      const muscleColor = resolveMuscleColor(cust.muscle || 'Mixed');
      map.set(key, {
        id: cust.id || `cust_${key}`,
        name: cust.name,
        muscle: cust.muscle || 'Mixed',
        targetSets: cust.targetSets || 3,
        targetReps: cust.targetReps || '8–12',
        restTimeSecs: cust.restTimeSecs || 90,
        videoId: cust.videoId,
        isFromTemplate: false,
        aliases: cust.aliases || [],
        muscleColor,
        muscleBgColor: hexToRgba(muscleColor, 0.1),
      });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [templateExercises, customExercises]);

  const filteredExercises = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();
    if (!lowerSearch) return allExercises;

    return allExercises.filter(ex =>
      ex.name.toLowerCase().includes(lowerSearch) ||
      (ex.muscle && ex.muscle.toLowerCase().includes(lowerSearch)) ||
      (ex.aliases && ex.aliases.some((a: string) => a.toLowerCase().includes(lowerSearch)))
    );
  }, [allExercises, search]);

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

    setPendingSwapConfirm({
      oldName,
      newName: newExDef.name,
      targetMuscleResolved: targetMuscleResolved || newExDef.muscle || existingLog.muscle,
      targetSets,
      targetReps,
      restTimeSecs,
      newVideoId: newExDef.videoId || undefined,
    });
  }, [log, originalExerciseId, updateExercise, gymLogs]);

  const handleConfirmTodayOnly = useCallback(() => {
    setPendingSwapConfirm(null);
    navigation.goBack();
  }, [navigation]);

  const handleConfirmSaveMasterPlan = useCallback(async () => {
    const pending = pendingSwapConfirm;
    setPendingSwapConfirm(null);
    if (!pending) {
      navigation.goBack();
      return;
    }
    try {
      const planIdx = planDayIndexForDate(date);
      const currentMasterDay = resolvePlanDay(userGymPlan, planIdx);
      if (currentMasterDay && updateMasterPlan) {
        const targetOldName = (pending.oldName || '').toLowerCase().trim();
        let updatedExercises = [...currentMasterDay.exercises];
        const matchIndex = updatedExercises.findIndex((e: any) =>
          (e.id && e.id === originalExerciseId) ||
          (e.exerciseId && e.exerciseId === originalExerciseId) ||
          (targetOldName && (e.name || '').toLowerCase().trim() === targetOldName)
        );

        if (matchIndex !== -1) {
          updatedExercises[matchIndex] = {
            ...updatedExercises[matchIndex],
            name: pending.newName,
            muscle: pending.targetMuscleResolved || updatedExercises[matchIndex].muscle,
            targetSets: pending.targetSets,
            targetReps: pending.targetReps,
            restTimeSecs: pending.restTimeSecs,
            videoId: pending.newVideoId,
          };
          await updateMasterPlan(planIdx, { ...currentMasterDay, exercises: updatedExercises });
        }
      }
    } catch (_) {}
    navigation.goBack();
  }, [pendingSwapConfirm, date, userGymPlan, updateMasterPlan, originalExerciseId, navigation]);

  const renderSwapItem = useCallback(({ item }: { item: any }) => {
    const muscleDotColor = item.muscleColor || resolveMuscleColor(item.muscle);
    const subtitleParts = [item.muscle];
    if (item.isFromTemplate && (item.templateDayName || item.dayName || item.routineName)) {
      subtitleParts.push(String(item.templateDayName || item.dayName || item.routineName).split(' ')[0]);
    }

    return (
      <TactileButton
        variant="custom"
        style={styles.exerciseCard}
        onPress={() => handleSwap(item)}
        scaleTo={0.985}
      >
        <View style={styles.exerciseInfo}>
          <View style={styles.exerciseTitleRow}>
            <View style={[styles.muscleIndicatorDot, { backgroundColor: muscleDotColor }]} />
            <Text style={styles.exerciseName} numberOfLines={1}>{item.name}</Text>
          </View>
          <Text style={styles.exerciseMetaLine} numberOfLines={1}>
            {subtitleParts.join(' · ')}
          </Text>
        </View>
        <View style={styles.swapAction}>
          <ArrowLeftRight size={13} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
          <Text style={styles.swapActionText}>Swap</Text>
        </View>
      </TactileButton>
    );
  }, [styles, handleSwap, tokens]);

  return (
    <ScreenWrapper edges={['top', 'bottom']} keyboardAvoiding>
      <View style={styles.header}>
        <TactileButton
          variant="custom"
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
        </TactileButton>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Swap Exercise</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            Replacing <Text style={styles.headerSubHighlight}>{origName}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Search size={18} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises or muscles..."
          placeholderTextColor={tokens.text.muted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TactileButton
            variant="custom"
            onPress={() => setSearch('')}
            style={styles.clearSearchBtn}
            accessibilityLabel="Clear search"
          >
            <X size={18} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
          </TactileButton>
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
              <Dumbbell size={32} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
              <Text style={styles.emptyText}>No exercises found.</Text>
            </View>
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {/* From Your Plan */}
          {templateExercises.length > 0 && (
            <View style={{ marginBottom: SPACE[20] }}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Calendar size={14} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
                  <Text style={styles.sectionHeaderTitle} maxFontSizeMultiplier={1.25}>
                    From Your Plan ({templateExercises.length})
                  </Text>
                </View>
              </View>

              <View style={styles.groupedCard}>
                {templateExercises.map((tplEx, idx) => (
                  <TactileButton
                    variant="custom"
                    key={tplEx.id || idx}
                    style={[
                      styles.groupedRow,
                      idx < templateExercises.length - 1 && styles.groupedRowDivider,
                    ]}
                    onPress={() => handleSwap(tplEx)}
                    scaleTo={0.985}
                  >
                    <View style={styles.exerciseInfo}>
                      <View style={styles.exerciseTitleRow}>
                        <View style={[styles.muscleIndicatorDot, { backgroundColor: resolveMuscleColor(tplEx.muscle) }]} />
                        <Text style={styles.exerciseName} numberOfLines={1}>{tplEx.name}</Text>
                      </View>
                      <Text style={styles.exerciseMetaLine} numberOfLines={1}>
                        {tplEx.muscle} · {tplEx.dayName.split(' ')[0]} · {tplEx.targetSets || 3} × {tplEx.targetReps || '8–12'}
                      </Text>
                    </View>
                    <View style={styles.swapAction}>
                      <ArrowLeftRight size={13} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                      <Text style={styles.swapActionText}>Swap</Text>
                    </View>
                  </TactileButton>
                ))}
              </View>
            </View>
          )}

          {/* Best Alternatives */}
          <View style={{ marginBottom: SPACE[24] }}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Dumbbell size={14} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
                <Text style={styles.sectionHeaderTitle} maxFontSizeMultiplier={1.25}>
                  Best Alternatives ({biomechanicalSwaps.length})
                </Text>
              </View>
            </View>

            <View style={styles.groupedCard}>
              {biomechanicalSwaps.map((item, idx) => {
                const division = item.muscleDivision || item.muscle;
                const equip = item.equipment && item.equipment !== 'Alternative' ? item.equipment : null;
                const metaParts = [division];
                if (equip) metaParts.push(equip);
                metaParts.push(`${item.targetSets || 3} × ${item.targetReps || '8–12'}`);

                return (
                  <TactileButton
                    variant="custom"
                    key={item.id || idx}
                    style={[
                      styles.groupedRow,
                      idx < biomechanicalSwaps.length - 1 && styles.groupedRowDivider,
                    ]}
                    onPress={() => handleSwap(item)}
                    scaleTo={0.985}
                  >
                    <View style={styles.exerciseInfo}>
                      <View style={styles.exerciseTitleRow}>
                        <View style={[styles.muscleIndicatorDot, { backgroundColor: resolveMuscleColor(division) }]} />
                        <Text style={styles.exerciseName} numberOfLines={1}>{item.name}</Text>
                      </View>
                      <Text style={styles.exerciseMetaLine} numberOfLines={1}>
                        {metaParts.join(' · ')}
                      </Text>
                    </View>
                    <View style={styles.swapAction}>
                      <ArrowLeftRight size={13} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                      <Text style={styles.swapActionText}>Swap</Text>
                    </View>
                  </TactileButton>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}

      <BottomSheet
        visible={!!pendingSwapConfirm}
        onClose={handleConfirmTodayOnly}
        sheetBackgroundColor={isDark ? '#0B0C10' : '#F8F8FA'}
      >
        <View style={styles.confirmSheetBody}>
          <Text style={styles.confirmTitle}>Exercise Swapped</Text>
          <Text style={styles.confirmDesc}>
            Replaced "{pendingSwapConfirm?.oldName}" with "{pendingSwapConfirm?.newName}" for today. Do you want to update your weekly plan for future sessions too?
          </Text>
          <View style={styles.confirmBtnStack}>
            <TactileButton
              variant="custom"
              style={styles.confirmPrimaryBtn}
              onPress={handleConfirmSaveMasterPlan}
              scaleTo={0.98}
            >
              <Text style={styles.confirmPrimaryText}>Save for Future Days</Text>
            </TactileButton>
            <TactileButton
              variant="custom"
              style={styles.confirmSecondaryBtn}
              onPress={handleConfirmTodayOnly}
              scaleTo={0.98}
            >
              <Text style={styles.confirmSecondaryText}>Today Only</Text>
            </TactileButton>
          </View>
        </View>
      </BottomSheet>
    </ScreenWrapper>
  );
}

export default ExerciseSwapScreen;
