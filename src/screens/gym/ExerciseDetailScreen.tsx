import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView,
  Switch, ActivityIndicator, AppState, Platform,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronDown, Trash2, Play, EyeOff, Video, RefreshCw } from 'lucide-react-native';

import { FONT_FAMILY, ICON, RADIUS, SPACE } from '../../theme/tokens';
import { ScreenWrapper, TactileButton } from '../../components/ui';
import BottomSheet from '../../components/ui/BottomSheet';

const LazyYoutubeIframe = React.lazy(() =>
  import('react-native-youtube-iframe').then((mod: any) => ({
    default: (mod?.default || mod) as React.ComponentType<any>,
  }))
);
import { useGymLogs, useGymPlan } from '../../contexts/domains/WellnessContext';
import { useGymLog, planDayIndexForDate, getCustomPlanDay } from '../../hooks/useGymLog';
import { resolvePlanDay } from '../../data/gymPlan';
import { EXERCISE_DATABASE } from '../../data/exerciseDatabase';
import { MUSCLE_CANONICAL, resolveExerciseTargetMuscle, computeOrGetHotCache, normalizeExerciseKey, getCanonicalExerciseName } from '../../utils/gymUtils';
import { generateDatasetFingerprint } from '../../utils/hotCacheStore';
import { GymExerciseLog, GymNavigationParamList, GymSet } from '../../types/gym.types';
import { hapticMedium, hapticLight, hapticSuccess } from '../../utils/haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { autoResolveExerciseVideoId } from '../../services/exerciseVideoResolver';

// Extracted Sub-Components & Styles
import { makeExerciseDetailStyles } from './exerciseDetailStyles';
import ExercisePastSessions from '../../components/Gym/exercise/ExercisePastSessions';
import ExerciseAnimationCard from '../../components/Gym/exercise/ExerciseAnimationCard';

const ALL_CANONICAL_KEYS = Object.keys(MUSCLE_CANONICAL);

const extractVideoId = (urlOrId: string) => {
  if (!urlOrId) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = urlOrId.match(regExp);
  return (match && match[2].length === 11) ? match[2] : urlOrId;
};

export default function ExerciseDetailScreen() {
  const { colors, isDark, tokens } = useTheme();
  const styles = useMemo(() => makeExerciseDetailStyles(colors, isDark, tokens), [colors, isDark, tokens]);
  const navigation = useNavigation<NativeStackNavigationProp<GymNavigationParamList>>();
  const route = useRoute<RouteProp<GymNavigationParamList, 'ExerciseDetail'>>();
  const exerciseId = route.params?.exerciseId;
  const date = route.params?.date || '';
  const dayIndex = route.params?.dayIndex;
  const paramName = route.params?.exerciseName;
  const paramMuscle = route.params?.muscle;
  const paramSets = route.params?.targetSets;
  const paramReps = route.params?.targetReps;
  const paramRest = route.params?.restTimeSecs;

  const { gymLogs } = useGymLogs();
  const { userGymPlan, updateMasterPlan } = useGymPlan();
  const { log, updateExercise, deleteExercise } = useGymLog(date);

  const currentExercise = useMemo(() => {
    const targetParamKey = paramName ? normalizeExerciseKey(paramName) : '';
    if (log?.exercises) {
      const found = log.exercises.find(e => e.exerciseId === exerciseId || (paramName && (e.name === paramName || (targetParamKey && normalizeExerciseKey(e.name) === targetParamKey))));
      if (found) return found;
    }
    if (dayIndex && userGymPlan?.customDays?.[dayIndex]?.exercises) {
      const found = userGymPlan.customDays[dayIndex].exercises.find((e: any) => e.id === exerciseId || (paramName && (e.name === paramName || (targetParamKey && normalizeExerciseKey(e.name) === targetParamKey))));
      if (found) return found;
    }
    if (userGymPlan?.customDays) {
      for (const d of Object.values(userGymPlan.customDays)) {
        const found = d?.exercises?.find((e: any) => e.id === exerciseId || (paramName && (e.name === paramName || (targetParamKey && normalizeExerciseKey(e.name) === targetParamKey))));
        if (found) return found;
      }
    }
    for (let dIdx = 1; dIdx <= 7; dIdx++) {
      const day = resolvePlanDay(userGymPlan, dIdx);
      const found = day?.exercises?.find(e => e.id === exerciseId || (paramName && (e.name === paramName || (targetParamKey && normalizeExerciseKey(e.name) === targetParamKey))));
      if (found) return found;
    }
    const dbFound = EXERCISE_DATABASE.find(
      e => e.id === exerciseId || (paramName && (e.name === paramName || (targetParamKey && normalizeExerciseKey(e.name) === targetParamKey) || e.aliases?.includes(paramName)))
    );
    if (dbFound) {
      return {
        id: dbFound.id,
        exerciseId: dbFound.id,
        name: dbFound.name,
        muscle: dbFound.muscle,
        targetSets: 3,
        targetReps: '8–12',
        restTimeSecs: 90,
        videoId: (dbFound as any).videoId && (dbFound as any).videoId !== '1' ? (dbFound as any).videoId : '',
      };
    }
    if (paramName || exerciseId) {
      return {
        id: exerciseId || 'custom_ex',
        exerciseId: exerciseId || 'custom_ex',
        name: paramName || '',
        muscle: paramMuscle || 'General',
        targetSets: paramSets ? Number(paramSets) : 3,
        targetReps: paramReps || '10',
        restTimeSecs: paramRest ? Number(paramRest) : 90,
        videoId: '',
      };
    }
    return null;
  }, [log?.exercises, exerciseId, paramName, paramMuscle, paramSets, paramReps, paramRest, dayIndex, userGymPlan]);

  const initialFormState = useMemo(() => {
    if (currentExercise) {
      const resolved = resolveExerciseTargetMuscle(currentExercise.name, currentExercise.muscle).targetMuscle;
      return {
        name: currentExercise.name || paramName || '',
        muscle: resolved || currentExercise.muscle || paramMuscle || 'General',
        targetSets: currentExercise.targetSets?.toString() || paramSets?.toString() || '3',
        targetReps: currentExercise.targetReps || paramReps || '10',
        restTimeSecs: currentExercise.restTimeSecs?.toString() || paramRest?.toString() || '90',
        videoLink: currentExercise.videoId ? `https://youtube.com/watch?v=${currentExercise.videoId}` : '',
      };
    }
    return {
      name: paramName || '',
      muscle: paramMuscle || 'General',
      targetSets: paramSets?.toString() || '3',
      targetReps: paramReps || '10',
      restTimeSecs: paramRest?.toString() || '90',
      videoLink: '',
    };
  }, [currentExercise, paramName, paramMuscle, paramSets, paramReps, paramRest]);

  // Form state
  const [name, setName] = useState(initialFormState.name);
  const [muscle, setMuscle] = useState(initialFormState.muscle);
  const [targetSets, setTargetSets] = useState(initialFormState.targetSets);
  const [targetReps, setTargetReps] = useState(initialFormState.targetReps);
  const [restTimeSecs, setRestTimeSecs] = useState(initialFormState.restTimeSecs);
  const [videoLink, setVideoLink] = useState(initialFormState.videoLink);
  const [showVideo, setShowVideo] = useState(false);
  const [showMuscleDropdown, setShowMuscleDropdown] = useState(false);
  const [saveGlobal, setSaveGlobal] = useState(true);
  const [isRefreshingVideo, setIsRefreshingVideo] = useState(false);
  const [isTransitionSettled, setIsTransitionSettled] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRetryCountRef = useRef(0);

  useEffect(() => {
    const settleTimer = setTimeout(() => {
      setIsTransitionSettled(true);
    }, 210);
    return () => {
      clearTimeout(settleTimer);
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => setAppState(nextState));
    return () => sub.remove();
  }, []);

  const muscleSuggestions = useMemo(() => {
    if (!muscle || !showMuscleDropdown) return [];
    const txt = muscle.toLowerCase();
    const suggestions: string[] = [];
    ALL_CANONICAL_KEYS.forEach(k => {
      if (k.includes(txt) || MUSCLE_CANONICAL[k].toLowerCase().includes(txt)) {
        if (!suggestions.includes(k)) suggestions.push(k);
      }
    });
    return suggestions.map(s => s.replace(/\b\w/g, c => c.toUpperCase()));
  }, [muscle, showMuscleDropdown]);

  // Sync form when route params change or exercise loads asynchronously
  const routeFormKey = `${exerciseId || ''}_${date || ''}_${paramName || ''}`;
  const loadedFormKeyRef = useRef(routeFormKey);
  useEffect(() => {
    const routeChanged = loadedFormKeyRef.current !== routeFormKey;
    if (routeChanged || (initialFormState.name && !name)) {
      loadedFormKeyRef.current = routeFormKey;
      setName(initialFormState.name);
      setMuscle(initialFormState.muscle);
      setTargetSets(initialFormState.targetSets);
      setTargetReps(initialFormState.targetReps);
      setRestTimeSecs(initialFormState.restTimeSecs);
      setVideoLink(initialFormState.videoLink);
    }
  }, [routeFormKey, initialFormState, name]);

  // Auto-resolve video link if missing with 600ms debounce
  useEffect(() => {
    if (!name || videoLink) return;
    let isCancelled = false;

    const timer = setTimeout(() => {
      autoResolveExerciseVideoId(name).then(resolvedId => {
        if (isCancelled || !resolvedId) return;
        setVideoLink(`https://youtube.com/watch?v=${resolvedId}`);
      });
    }, 600);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [name, videoLink]);

  // Past 5 sessions history (deferred until after navigation transition settles)
  const history = useMemo(() => {
    if (!isTransitionSettled || (!currentExercise?.name && !exerciseId)) return [];
    const targetKey = currentExercise?.name ? normalizeExerciseKey(currentExercise.name) : '';
    const fingerprint = generateDatasetFingerprint(gymLogs);
    const cacheKey = `ex_history_5_${exerciseId || ''}_${targetKey}_${fingerprint}`;

    return computeOrGetHotCache(cacheKey, () => {
      return gymLogs
        .map(l => ({
          date: l.date,
          ex: l.exercises?.find(e => {
            if (exerciseId && (e.exerciseId === exerciseId || (e as any).id === exerciseId)) return true;
            if (targetKey && normalizeExerciseKey(e.name) === targetKey) return true;
            return false;
          }) as GymExerciseLog | undefined
        }))
        .filter(item => item.ex && (item.ex.setsLog || []).some(s => s.completed || (s.weight != null && Number(s.weight) > 0)))
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .slice(0, 5);
    });
  }, [isTransitionSettled, gymLogs, exerciseId, currentExercise?.name]);

  const handleConfirmDelete = useCallback(() => {
    setShowDeleteSheet(false);
    if (!log) return;
    const targetKey = paramName ? normalizeExerciseKey(paramName) : '';
    const found = log.exercises.find(e =>
      (exerciseId && (e.exerciseId === exerciseId || (e as any).id === exerciseId)) ||
      (paramName && (e.name === paramName || (targetKey && normalizeExerciseKey(e.name) === targetKey)))
    );
    if (found) {
      hapticMedium();
      deleteExercise(found.exerciseId || found.id);
      navigation.goBack();
    }
  }, [log, exerciseId, paramName, deleteExercise, navigation]);

  const handleDelete = useCallback(() => {
    hapticMedium();
    setShowDeleteSheet(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!currentExercise) {
      navigation.goBack();
      return;
    }

    hapticMedium();
    const parsedTargetSets = parseInt(targetSets, 10) || 1;
    const resolvedMuscle = resolveExerciseTargetMuscle(name, muscle).targetMuscle;

    const currentSets: GymSet[] = ('setsLog' in currentExercise && Array.isArray(currentExercise.setsLog))
      ? currentExercise.setsLog
      : [];
    let nextSets: GymSet[] = currentSets.map((s: any) => ({ ...s }));

    if (parsedTargetSets > nextSets.length) {
      for (let i = nextSets.length; i < parsedTargetSets; i++) {
        nextSets.push({ setNumber: i + 1, reps: null, weight: null, completed: false });
      }
    } else if (parsedTargetSets < nextSets.length) {
      const completedCount = nextSets.filter(s => s.completed).length;
      nextSets = nextSets.slice(0, Math.max(parsedTargetSets, completedCount));
    }

    const resolvedExerciseId = ('exerciseId' in currentExercise && currentExercise.exerciseId)
      ? (currentExercise.exerciseId as string)
      : (exerciseId || currentExercise.id || `ex_${Date.now()}`);

    const canonicalName = getCanonicalExerciseName(name || 'Custom Exercise');
    const updated: GymExerciseLog = {
      ...currentExercise,
      id: currentExercise.id || resolvedExerciseId,
      exerciseId: resolvedExerciseId,
      name: canonicalName,
      muscle: resolvedMuscle || muscle || 'General',
      targetSets: parsedTargetSets,
      targetReps: targetReps || '10',
      restTimeSecs: parseInt(restTimeSecs, 10) || 90,
      videoId: extractVideoId(videoLink),
      setsLog: nextSets,
    };

    // 1. If today's active log exists and contains this exercise, update it
    if (log && log.exercises) {
      const index = log.exercises.findIndex(e => e.exerciseId === exerciseId || (currentExercise.name && e.name === currentExercise.name));
      if (index !== -1) {
        updateExercise(index, updated);
      }
    }

    // 2. If saveGlobal is enabled or dayIndex is provided (e.g. from GymSplitsScreen)
    if (saveGlobal || dayIndex) {
      const planIdx = dayIndex || (date ? planDayIndexForDate(date) : null);
      if (planIdx) {
        const currentMasterDay = resolvePlanDay(userGymPlan, planIdx);
        if (currentMasterDay && !currentMasterDay.isRest) {
          const exists = (currentMasterDay.exercises || []).some((e: any) =>
            e.id === exerciseId ||
            (currentExercise.name && e.name === currentExercise.name) ||
            normalizeExerciseKey(e.name) === normalizeExerciseKey(canonicalName)
          );
          let updatedExercises = [...(currentMasterDay.exercises || [])];
          if (exists) {
            updatedExercises = updatedExercises.map(e =>
              (e.id === exerciseId || (currentExercise.name && e.name === currentExercise.name) || normalizeExerciseKey(e.name) === normalizeExerciseKey(canonicalName))
                ? {
                    ...e,
                    name: updated.name,
                    muscle: updated.muscle,
                    targetSets: updated.targetSets,
                    targetReps: updated.targetReps,
                    restTimeSecs: updated.restTimeSecs,
                    videoId: updated.videoId,
                  }
                : e
            );
          } else {
            updatedExercises.push({
              id: exerciseId || `ex_${Date.now()}`,
              name: updated.name,
              muscle: updated.muscle,
              targetSets: updated.targetSets,
              targetReps: updated.targetReps,
              restTimeSecs: updated.restTimeSecs,
              videoId: updated.videoId,
            });
          }
          await updateMasterPlan(planIdx, { ...currentMasterDay, exercises: updatedExercises }, true);
        }
      }
    }

    navigation.goBack();
  }, [currentExercise, name, muscle, targetSets, targetReps, restTimeSecs, videoLink, log, exerciseId, saveGlobal, dayIndex, date, userGymPlan, updateMasterPlan, updateExercise, navigation]);

  return (
    <ScreenWrapper edges={['top', 'bottom']} keyboardAvoiding>
      {/* Header */}
      <View style={styles.header}>
        <TactileButton
          variant="custom"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityLabel="Close exercise editor"
        >
          <ChevronDown size={ICON.lg} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
        </TactileButton>
        <Text style={styles.headerTitle}>Edit Exercise</Text>
        <View style={styles.headerActions}>
          <TactileButton
            variant="custom"
            onPress={handleDelete}
            style={styles.iconActionBtn}
            haptic="medium"
            accessibilityLabel="Delete exercise"
          >
            <Trash2 size={ICON.md} color={tokens.status.danger} strokeWidth={ICON.strokeWidth} />
          </TactileButton>
          <TactileButton
            variant="primary"
            onPress={handleSave}
            style={styles.saveBtn}
            haptic="medium"
          >
            <Text style={styles.saveBtnText}>Save</Text>
          </TactileButton>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Preview */}
        <View style={styles.previewHeader}>
          <View style={styles.musclePill}>
            <View style={styles.muscleDot} />
            <Text style={styles.muscleText}>{muscle || 'General'}</Text>
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Exercise Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Bulgarian Split Squats"
            placeholderTextColor={tokens.text.muted}
          />
        </View>

        <View style={styles.rowForm}>
          <View style={[styles.formGroup, { flex: 1, zIndex: 10 }]}>
            <Text style={styles.label}>Muscle Focus</Text>
            <TextInput
              style={styles.input}
              value={muscle}
              onChangeText={(t) => { setMuscle(t); setShowMuscleDropdown(true); }}
              onFocus={() => setShowMuscleDropdown(true)}
              onBlur={() => {
                if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                blurTimerRef.current = setTimeout(() => setShowMuscleDropdown(false), 200);
              }}
              placeholder="e.g. Quads"
              placeholderTextColor={tokens.text.muted}
            />
            {showMuscleDropdown && muscleSuggestions.length > 0 && (
              <View style={styles.dropdown}>
                {muscleSuggestions.slice(0, 5).map(sug => (
                  <Pressable
                    key={sug}
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      pressed && { backgroundColor: tokens.bg.surface },
                    ]}
                    onPressIn={() => {
                      hapticLight();
                      setMuscle(sug);
                      setShowMuscleDropdown(false);
                    }}
                    onPress={() => {
                      setMuscle(sug);
                      setShowMuscleDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownText}>{sug}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
          <View style={{ width: SPACE[16] }} />
          <View style={[styles.formGroup, { flex: 1, zIndex: 1 }]}>
            <Text style={styles.label}>Rest Time (sec)</Text>
            <TextInput
              style={[styles.input, styles.numericInput]}
              value={restTimeSecs}
              onChangeText={setRestTimeSecs}
              keyboardType="numeric"
              maxFontSizeMultiplier={1.25}
              placeholder="e.g. 90"
              placeholderTextColor={tokens.text.muted}
            />
          </View>
        </View>

        <View style={styles.rowForm}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Target Sets</Text>
            <TextInput
              style={[styles.input, styles.numericInput]}
              value={targetSets}
              onChangeText={setTargetSets}
              keyboardType="numeric"
              maxFontSizeMultiplier={1.25}
              placeholder="e.g. 3"
              placeholderTextColor={tokens.text.muted}
            />
          </View>
          <View style={{ width: SPACE[16] }} />
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Target Reps</Text>
            <TextInput
              style={[styles.input, styles.numericInput]}
              value={targetReps}
              onChangeText={setTargetReps}
              maxFontSizeMultiplier={1.25}
              placeholder="e.g. 8-10"
              placeholderTextColor={tokens.text.muted}
            />
          </View>
        </View>

        {/* YouTube Video Link & Preview */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>YouTube Video Link</Text>
          <View style={styles.videoInputRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={videoLink}
              onChangeText={setVideoLink}
              placeholder="https://youtube.com/..."
              placeholderTextColor={tokens.text.muted}
              autoCapitalize="none"
            />
            {!!videoLink && (
              <TactileButton
                variant="custom"
                style={styles.previewVideoBtn}
                onPress={() => { hapticLight(); setShowVideo(!showVideo); }}
                accessibilityLabel={showVideo ? 'Hide form video' : 'Play form video'}
              >
                {showVideo ? (
                  <EyeOff size={ICON.md} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} />
                ) : (
                  <Play size={ICON.md} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} />
                )}
              </TactileButton>
            )}
          </View>
        </View>

        {/* Instant Looping Form Animation & Execution Cues */}
        {name ? (
          <ExerciseAnimationCard
            exerciseName={name}
            showInstructions={true}
          />
        ) : null}

        {showVideo && extractVideoId(videoLink) && (
          <View style={styles.videoContainer}>
            <View style={styles.videoHeaderRow}>
              <View style={styles.videoHeaderLeft}>
                <Video size={ICON.sm} color={tokens.accent.crimson} strokeWidth={ICON.strokeWidth} />
                <Text style={styles.videoHeaderTitle}>Form Guide Demonstration</Text>
              </View>

              <TactileButton
                variant="custom"
                onPress={async () => {
                  if (isRefreshingVideo || !name) return;
                  hapticMedium();
                  setIsRefreshingVideo(true);
                  try {
                    const freshId = await autoResolveExerciseVideoId(name, true);
                    if (freshId) {
                      setVideoLink(`https://youtube.com/watch?v=${freshId}`);
                      hapticSuccess();
                    }
                  } catch (e) {
                    console.warn('[Refresh Video Detail] Error:', e);
                  } finally {
                    setIsRefreshingVideo(false);
                  }
                }}
                disabled={isRefreshingVideo}
                style={styles.refreshVideoBtn}
              >
                {isRefreshingVideo ? (
                  <ActivityIndicator size="small" color={tokens.accent.primary} />
                ) : (
                  <RefreshCw size={ICON.xs} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                )}
                <Text style={styles.refreshVideoText}>
                  {isRefreshingVideo ? 'Refreshing...' : 'Refresh'}
                </Text>
              </TactileButton>
            </View>

            <React.Suspense
              fallback={
                <ActivityIndicator
                  size="small"
                  color={tokens.accent.primary}
                  style={{ height: 200 }}
                />
              }
            >
              <LazyYoutubeIframe
                play={true}
                height={200}
                videoId={extractVideoId(videoLink)}
                onError={async (err: any) => {
                  console.warn('[ExerciseDetail Error] Video unavailable:', name, err);
                  if (videoRetryCountRef.current >= 1) {
                    setShowVideo(false);
                    return;
                  }
                  videoRetryCountRef.current += 1;
                  const freshId = await autoResolveExerciseVideoId(name, true);
                  const currentId = extractVideoId(videoLink);
                  if (freshId && freshId !== currentId) {
                    setVideoLink(`https://youtube.com/watch?v=${freshId}`);
                  } else {
                    setShowVideo(false);
                  }
                }}
                initialPlayerParams={{ modestbranding: true, rel: false }}
                webViewProps={{
                  androidLayerType: appState === 'active' ? 'hardware' : 'software',
                  domStorageEnabled: true,
                  javaScriptEnabled: true,
                }}
              />
            </React.Suspense>
          </View>
        )}

        <View style={styles.divider} />

        {/* Master Split Toggle */}
        <View style={styles.masterSplitContainer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.masterSplitTitle}>Save to Master Split</Text>
            <Text style={styles.masterSplitDesc}>Update this exercise for all future workouts on this day.</Text>
          </View>
          <Switch
            value={saveGlobal}
            onValueChange={setSaveGlobal}
            trackColor={{ false: tokens.border.medium, true: tokens.accent.primary }}
            thumbColor={Platform.OS === 'ios' ? undefined : (saveGlobal ? tokens.accent.onPrimary : tokens.text.primary)}
          />
        </View>

        <View style={styles.divider} />

        {/* History */}
        <Text style={styles.sectionTitle}>Past 5 Sessions</Text>
        {isTransitionSettled ? (
          <ExercisePastSessions history={history} colors={colors} styles={styles} />
        ) : (
          <ActivityIndicator size="small" color={tokens.accent.primary} style={{ marginVertical: SPACE[24] }} />
        )}
      </ScrollView>

      <BottomSheet
        visible={showDeleteSheet}
        onClose={() => setShowDeleteSheet(false)}
        avoidKeyboard={false}
        noPadding={true}
        sheetBackgroundColor={tokens.bg.elevated}
      >
        <View style={{ paddingHorizontal: SPACE[16], paddingTop: SPACE[8], paddingBottom: SPACE[16], gap: SPACE[12] }}>
          <View
            style={{
              backgroundColor: tokens.bg.surface,
              borderRadius: RADIUS.card,
              padding: SPACE[16],
              borderWidth: tokens.border.hairlineWidth,
              borderColor: tokens.border.subtle,
              gap: SPACE[6],
            }}
          >
            <Text style={{ fontSize: 17, fontFamily: FONT_FAMILY.bold, color: tokens.text.primary }}>
              Remove Exercise
            </Text>
            <Text style={{ fontSize: 13.5, lineHeight: 19, fontFamily: FONT_FAMILY.regular, color: tokens.text.secondary }}>
              Remove "{name || currentExercise?.name || 'this exercise'}" from today's workout? This keeps your weekly plan unchanged.
            </Text>
          </View>

          <View style={{ gap: SPACE[8] }}>
            <TactileButton
              variant="danger"
              size="lg"
              label="Remove from Today"
              onPress={handleConfirmDelete}
            />
            <TactileButton
              variant="secondary"
              size="lg"
              label="Cancel"
              onPress={() => setShowDeleteSheet(false)}
            />
          </View>
        </View>
      </BottomSheet>
    </ScreenWrapper>
  );
}
