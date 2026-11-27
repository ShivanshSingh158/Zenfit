/**
 * AddExerciseModal.tsx • ZenFit Mobile
 *
 * Unified exercise catalogue search, filtering & custom creation modal:
 * - Segmented Anatomical Muscle Filter Bar with Equipment Filter Modal (`VaultEquipmentModal`).
 * - Rich card-style search results (Equipment glyph, Primary & Secondary muscles,
 *   Tier badge, and Past performance snippet).
 * - Full custom exercise builder (`CreateCustomExerciseModal`) + instant 1-tap creation on 0 results.
 * - Ultra-lightweight: Database activates ONLY when searching or filtering; turns OFF when idle
 *   so modal opening, closing, and interactions feel instantaneous.
 */
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Platform,
  FlatList,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  Dumbbell,
  Plus,
  Search,
  X,
} from 'lucide-react-native';
import { NumericText, TactileButton } from '../../ui';
import BottomSheet from '../../ui/BottomSheet';

import { FONT_FAMILY, ICON, SPACE, TOUCH } from '../../../theme/tokens';
import { GymExerciseLog, GymPlanDay } from '../../../types/gym.types';
import { useGymPlan, useGymLogs } from '../../../contexts/domains/WellnessContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { getCustomPlanDay } from '../../../hooks/useGymLog';
import { KNOWN_EXERCISE_VIDEOS, sanitizeName } from '../../../services/exerciseVideoDatabase';
import { handleSyncError } from '../../../utils/errorUtils';
import { hapticSelection, hapticSuccess } from '../../../utils/haptics';
import {
  UNIFIED_MUSCLE_CHIPS,
  checkCatalogCategoryMatch,
  getUnifiedCategoryMap,
  getUnifiedExerciseCatalogue,
  loadMergedCustomExercises,
  persistUnifiedCustomExercise,
  warmUnifiedExerciseCatalogue,
} from '../../../services/exerciseCatalogService';

// Subcomponents & Styles
import { makeAddExerciseStyles } from './addExerciseStyles';
import type { ExerciseCatalogEntry } from '../../../types/gym.types';
import ExerciseCardItem from './ExerciseCardItem';
import ExerciseCustomFields from './ExerciseCustomFields';
import ExerciseAnimationCard from './ExerciseAnimationCard';
import { VaultEquipmentModal } from './VaultEquipmentModal';
import { CreateCustomExerciseModal, CustomExerciseItem } from './CreateCustomExerciseModal';
import {
  EquipmentCategory,
  resolveExerciseEquipment,
} from '../../../utils/equipmentResolver';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  getBiomechanicalPrescription,
  resolveExerciseTargetMuscle,
  getPreviousExerciseSession,
  normalizeExerciseKey,
  resolveMuscleColor,
  buildExerciseHistoryIndex,
} from '../../../utils/gymUtils';

// ── Muscle Filter Chips & Unified Catalogue Re-exports ────────────────────────
const exerciseCardKeyExtractor = (item: ExerciseCatalogEntry) =>
  `${item.id || item.name}_${item.isCustom ? 'c' : 's'}`;

export const MUSCLE_FILTER_CHIPS = UNIFIED_MUSCLE_CHIPS;
export const getExerciseCatalogue = getUnifiedExerciseCatalogue;
export const getCategoryMap = getUnifiedCategoryMap;
export const warmExerciseCatalogue = warmUnifiedExerciseCatalogue;
const checkCategoryMatch = checkCatalogCategoryMatch;
const persistCustomExercise = persistUnifiedCustomExercise;

const extractVideoId = (urlOrId: string) => {
  if (!urlOrId) return '';
  const m = urlOrId.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return m && m[2].length === 11 ? m[2] : urlOrId;
};

// ── Search & Relevance Engine ───────────────────────────────────────────────
const GYM_SYNONYMS: Record<string, string> = {
  db: 'dumbbell',
  bb: 'barbell',
  kb: 'kettlebell',
  rdl: 'romanian deadlift',
  ohp: 'overhead press',
  ghr: 'glute ham raise',
  flys: 'fly',
  flyes: 'fly',
  cables: 'cable',
  pulldowns: 'pulldown',
  pushdowns: 'pushdown',
  curls: 'curl',
  presses: 'press',
  rows: 'row',
  squats: 'squat',
  deadlifts: 'deadlift',
  raises: 'raise',
  shrugs: 'shrug',
  extensions: 'extension',
  crunches: 'crunch',
  pushups: 'pushup',
  pullups: 'pullup',
  dips: 'dip',
};

const GYM_SYNONYM_REGEXES = Object.entries(GYM_SYNONYMS).map(([abbr, full]) => ({
  regex: new RegExp(`\\b${abbr}\\b`, 'gi'),
  full,
}));

function cleanSearchString(str: string): string {
  let cleaned = str.toLowerCase();
  for (let i = 0; i < GYM_SYNONYM_REGEXES.length; i++) {
    cleaned = cleaned.replace(GYM_SYNONYM_REGEXES[i].regex, GYM_SYNONYM_REGEXES[i].full);
  }
  return cleaned.replace(/[\(\)\/\,\-\–\—\.]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getQueryTokens(str: string): string[] {
  return cleanSearchString(str)
    .split(' ')
    .filter(t => t.length > 0)
    .map(t => t.replace(/(s|es|ing)$/, ''));
}

const entryMetaCache = new WeakMap<ExerciseCatalogEntry, {
  nameLower: string;
  normName: string;
  nameTokens: string[];
  aliasesLower: string[];
  normAliases: string[];
}>();

const entryEquipmentCache = new WeakMap<ExerciseCatalogEntry, EquipmentCategory>();

function getEntryEquipment(entry: ExerciseCatalogEntry): EquipmentCategory {
  const explicit = entry.equipment as EquipmentCategory | undefined;
  if (explicit && explicit !== 'All') {
    return explicit;
  }
  let cached = entryEquipmentCache.get(entry);
  if (!cached) {
    cached = resolveExerciseEquipment(entry.name, entry.aliases || []);
    entryEquipmentCache.set(entry, cached);
  }
  return cached;
}

function getEntryMeta(entry: ExerciseCatalogEntry) {
  let meta = entryMetaCache.get(entry);
  if (!meta) {
    const nameLower = entry.name.toLowerCase();
    const normName = nameLower.replace(/[^a-z0-9]/g, '');
    const nameTokens = getQueryTokens(entry.name);
    const aliasesLower = (entry.aliases || []).map(a => a.toLowerCase());
    const normAliases = aliasesLower.map(a => a.replace(/[^a-z0-9]/g, ''));
    meta = { nameLower, normName, nameTokens, aliasesLower, normAliases };
    entryMetaCache.set(entry, meta);
  }
  return meta;
}

function scoreExerciseMatch(
  entry: ExerciseCatalogEntry,
  rawQuery: string,
  cleanedQuery: string,
  queryTokens: string[],
  normQuery: string,
  categoryFilter?: string | null
): number {
  const { nameLower, normName, nameTokens, aliasesLower: aliases, normAliases } = getEntryMeta(entry);

  let matchScore = 0;

  // 1. Exact & Substring Matches on Name or Aliases
  if (normName === normQuery || normAliases.includes(normQuery)) {
    matchScore += 5000;
  } else if (nameLower.startsWith(rawQuery) || normName.startsWith(normQuery)) {
    matchScore += 3000;
  } else if (aliases.some(a => a.startsWith(rawQuery))) {
    matchScore += 2500;
  } else if (nameLower.includes(rawQuery) || normName.includes(normQuery)) {
    matchScore += 1800;
  } else if (cleanedQuery !== rawQuery && nameLower.includes(cleanedQuery)) {
    matchScore += 1400;
  } else if (aliases.some(a => a.includes(rawQuery) || a.includes(cleanedQuery))) {
    matchScore += 1200;
  }

  // 2. Token Matching (e.g. multi-word "cable curl", "calf raise seated")
  if (queryTokens.length > 0) {
    let matchedTokenCount = 0;
    for (const qt of queryTokens) {
      if (nameTokens.includes(qt)) {
        matchedTokenCount += 1;
        matchScore += 300;
      } else if (nameTokens.some(nt => nt.includes(qt) || qt.includes(nt))) {
        matchedTokenCount += 0.8;
        matchScore += 200;
      } else if (aliases.some(a => a.includes(qt))) {
        matchedTokenCount += 0.7;
        matchScore += 150;
      }
    }
    if (matchedTokenCount >= queryTokens.length) {
      matchScore += 1500;
    } else if (matchedTokenCount > 0) {
      matchScore += (matchedTokenCount / queryTokens.length) * 500;
    }
  }

  // Muscle category match (e.g. searching "biceps" or "chest")
  const muscleLower = (entry.muscle || '').toLowerCase();
  if (rawQuery.length >= 3 && muscleLower.includes(rawQuery)) {
    matchScore += 1000;
  }

  // If there was NO actual text match, do NOT include this exercise in results!
  if (matchScore <= 0) {
    return 0;
  }

  // 3. Bonuses for matched exercises only
  let totalScore = matchScore;

  if (entry.isCurated) {
    totalScore += 200;
  }

  if (categoryFilter && categoryFilter !== 'all') {
    if (checkCategoryMatch(entry.muscle, categoryFilter)) {
      totalScore += 800;
    } else {
      // If user specifically picked a muscle filter and this doesn't match it, drop it
      return 0;
    }
  }

  const tierWeights: Record<string, number> = {
    'S Tier': 100,
    'A+ Tier': 80,
    'A Tier': 60,
    'B Tier': 40,
    'C Tier': 20,
  };
  totalScore += tierWeights[entry.tier || ''] || 0;

  return totalScore;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (ex: GymExerciseLog) => void;
  onMultiAdd?: (exercises: GymExerciseLog[]) => void;
  selectionMode?: 'single' | 'multi';
  headerTitle?: string;
  planDay?: GymPlanDay;
  existingExerciseIds?: string[];
  embedded?: boolean;
}

export function AddExerciseModal({
  visible,
  onClose,
  onAdd,
  onMultiAdd,
  selectionMode = 'single',
  headerTitle,
  planDay,
  embedded = false,
}: Props) {
  const { colors, isDark, tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeAddExerciseStyles(colors, isDark), [colors, isDark]);
  const { userGymPlan, updateMasterPlan } = useGymPlan();
  const { gymLogs } = useGymLogs();
  const [catalogTick, setCatalogTick] = useState(0);

  // Sync merged custom exercises from both storage keys whenever sheet opens
  useEffect(() => {
    if (!visible) return;
    let active = true;
    loadMergedCustomExercises()
      .then(() => {
        if (active) setCatalogTick((t) => t + 1);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [visible]);

  // Tier-1 History Index: Pre-indexes user sessions only when modal is open
  const historyIndex = useMemo(() => {
    if (!visible || !gymLogs || gymLogs.length === 0) return null;
    return buildExerciseHistoryIndex(gymLogs);
  }, [visible, gymLogs]);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentCategory>('All');
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showCreateCustomModal, setShowCreateCustomModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ExerciseCatalogEntry | null>(null);
  const [multiSelected, setMultiSelected] = useState<Record<string, ExerciseCatalogEntry>>({});
  const [showCustomTuning, setShowCustomTuning] = useState(false);

  // Form states for custom tuning
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('8-12');
  const [restTime, setRestTime] = useState('60');
  const [muscle, setMuscle] = useState('None');
  const [videoLink, setVideoLink] = useState('');
  const [savePermanently, setSavePermanently] = useState(false);

  // AI resolver state
  const [aiLoading, setAiLoading] = useState(false);

  // Debounced search query for butter-smooth 60fps typing
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toLowerCase());
    }, 40);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  // Filtered Results Calculation
  const results = useMemo(() => {
    if (!visible) return [];
    const catalogue = getExerciseCatalogue();
    const categoryMap = getCategoryMap();
    const q = debouncedQuery;
    const hasEquipmentFilter = selectedEquipment !== 'All';

    // Muscle & Equipment browse mode (no search text)
    if (!q) {
      let baseList: ExerciseCatalogEntry[];
      if (selectedMuscle && selectedMuscle !== 'all') {
        baseList =
          categoryMap[selectedMuscle] ||
          catalogue.filter((e) => checkCategoryMatch(e.muscle, selectedMuscle));
      } else {
        baseList = catalogue;
      }
      if (hasEquipmentFilter) {
        return baseList.filter((e) => getEntryEquipment(e) === selectedEquipment);
      }
      return baseList;
    }

    // Full Relevance Search
    const cleanedQuery = cleanSearchString(q);
    const queryTokens = getQueryTokens(q);
    const normQuery = q.replace(/[^a-z0-9]/g, '');

    const scored: { item: ExerciseCatalogEntry; score: number }[] = [];

    for (const entry of catalogue) {
      if (hasEquipmentFilter && getEntryEquipment(entry) !== selectedEquipment) {
        continue;
      }
      const score = scoreExerciseMatch(
        entry,
        q,
        cleanedQuery,
        queryTokens,
        normQuery,
        selectedMuscle
      );
      if (score > 0) {
        scored.push({ item: entry, score });
      }
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.item.name.length !== b.item.name.length) {
        return a.item.name.length - b.item.name.length;
      }
      return a.item.name.localeCompare(b.item.name);
    });

    return scored.map(s => s.item);
  }, [visible, debouncedQuery, selectedMuscle, selectedEquipment, catalogTick]);

  const displayedResults = results;

  // 1-Tap Auto-Categorization for Instant Custom Exercise Creation
  const autoResolvedForQuery = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const res = resolveExerciseTargetMuscle(searchQuery.trim());
    const rx = getBiomechanicalPrescription(searchQuery.trim(), res.targetMuscle);
    return {
      canonicalName: searchQuery.trim(),
      targetMuscle: res.targetMuscle,
      canonicalGroup: res.canonicalGroup,
      muscleColor: resolveMuscleColor(res.targetMuscle),
      targetSets: rx.targetSets,
      targetReps: rx.targetReps,
      restTimeSecs: rx.restTimeSecs,
    };
  }, [searchQuery]);

  // Handle Card Click (Select & Open Quick Tuner)
  const handleSelectEntry = useCallback((entry: ExerciseCatalogEntry) => {
    setSelectedEntry(entry);
    setSets(String(entry.targetSets || 3));
    setReps(entry.targetReps || '8-12');
    setRestTime(String(entry.restTimeSecs || 60));
    setMuscle(entry.muscle || 'None');
    setVideoLink(entry.videoId || '');
    setShowCustomTuning(true);
  }, []);

  const buildExerciseLogFromEntry = useCallback(
    (entry: ExerciseCatalogEntry): GymExerciseLog => {
      const lastSession =
        historyIndex?.get(normalizeExerciseKey(entry.name)) ??
        getPreviousExerciseSession(entry.name, gymLogs);
      const lastSets = lastSession?.sets ?? null;
      const parsedSets = entry.targetSets || 3;
      const parsedRest = entry.restTimeSecs || 60;
      const resolved = resolveExerciseTargetMuscle(entry.name, entry.muscle);

      let userVideoId = entry.videoId;
      if (!userVideoId) {
        const sanitized = sanitizeName(entry.name);
        if (KNOWN_EXERCISE_VIDEOS[sanitized]) {
          userVideoId = KNOWN_EXERCISE_VIDEOS[sanitized];
        }
      }

      return {
        exerciseId: entry.id || `custom_${Date.now()}`,
        name: entry.name,
        muscle: resolved.targetMuscle || entry.muscle,
        targetSets: parsedSets,
        targetReps: entry.targetReps || '8–12',
        videoId: userVideoId || '',
        restTimeSecs: parsedRest,
        lastSessionSets: lastSets ?? undefined,
        setsLog: Array.from({ length: parsedSets }, (_, i) => {
          const prev = lastSets?.[i];
          return {
            setNumber: i + 1,
            reps: prev?.reps ?? null,
            weight: prev?.weight ?? null,
            completed: false,
          };
        }),
        isCustom: Boolean(entry.id?.startsWith('custom_')),
      };
    },
    [gymLogs]
  );

  // Direct 1-Tap Add (single mode) or Multi-Select Toggle (multi mode)
  const handleDirectAdd = useCallback(
    (entry: ExerciseCatalogEntry) => {
      if (selectionMode === 'multi') {
        hapticSelection();
        const key = (entry.id || entry.name).toLowerCase();
        setMultiSelected((prev) => {
          const next = { ...prev };
          if (next[key]) {
            delete next[key];
          } else {
            next[key] = entry;
          }
          return next;
        });
        return;
      }

      onAdd(buildExerciseLogFromEntry(entry));
      resetAndClose();
    },
    [selectionMode, buildExerciseLogFromEntry, onAdd]
  );

  const handleConfirmMultiAdd = useCallback(() => {
    const picked = Object.values(multiSelected);
    if (picked.length === 0) return;
    hapticSuccess();
    const built = picked.map(buildExerciseLogFromEntry);
    if (onMultiAdd) {
      onMultiAdd(built);
    } else {
      built.forEach(onAdd);
    }
    resetAndClose();
  }, [multiSelected, buildExerciseLogFromEntry, onMultiAdd, onAdd]);

  // Instant 1-Tap Create Custom Exercise on 0 Results
  const handleInstantCreateCustom = () => {
    if (!autoResolvedForQuery) return;

    const exId = `custom_${Date.now()}`;
    const entry: ExerciseCatalogEntry = {
      id: exId,
      name: autoResolvedForQuery.canonicalName,
      muscle: autoResolvedForQuery.targetMuscle,
      targetSets: autoResolvedForQuery.targetSets,
      targetReps: autoResolvedForQuery.targetReps,
      restTimeSecs: autoResolvedForQuery.restTimeSecs,
      videoId: '',
      tier: 'B Tier',
      isCurated: false,
    };

    persistCustomExercise(entry);

    const newEx: GymExerciseLog = {
      exerciseId: exId,
      name: entry.name,
      muscle: entry.muscle,
      targetSets: entry.targetSets,
      targetReps: entry.targetReps,
      videoId: '',
      restTimeSecs: entry.restTimeSecs,
      setsLog: Array.from({ length: entry.targetSets }, (_, i) => ({
        setNumber: i + 1,
        reps: null,
        weight: null,
        completed: false,
      })),
      isCustom: true,
    };

    onAdd(newEx);
    resetAndClose();
  };

  const handleCustomModalCreated = useCallback(
    (item: CustomExerciseItem) => {
      const rx = getBiomechanicalPrescription(item.name, item.muscle);
      const entry: ExerciseCatalogEntry = {
        id: item.id,
        name: item.name,
        muscle: item.muscle,
        targetSets: rx.targetSets,
        targetReps: rx.targetReps,
        restTimeSecs: rx.restTimeSecs,
        videoId: '',
        equipment: item.equipment,
        tier: item.tier || 'A Tier',
        isCurated: false,
        isCustom: true,
      };

      persistCustomExercise(entry).catch(() => {});
      setSelectedMuscle('all');
      setSelectedEquipment('All');
      setSearchQuery(item.name);
      setDebouncedQuery(item.name.trim().toLowerCase());
      setCatalogTick((t) => t + 1);
      hapticSuccess();

      if (selectionMode === 'multi') {
        const key = (entry.id || entry.name).toLowerCase();
        setMultiSelected((prev) => ({ ...prev, [key]: entry }));
      } else {
        handleSelectEntry(entry);
      }
    },
    [selectionMode, handleSelectEntry]
  );

  // Commit from Quick Tuner
  const handleConfirmAddTuned = () => {
    const exerciseName = selectedEntry?.name || searchQuery.trim();
    if (!exerciseName) return;

    const parsedSets = parseInt(sets, 10) || 3;
    const parsedRest = parseInt(restTime, 10) || 60;
    let userVideoId = extractVideoId(videoLink.trim());

    if (!userVideoId) {
      const sanitized = sanitizeName(exerciseName);
      if (KNOWN_EXERCISE_VIDEOS[sanitized]) {
        userVideoId = KNOWN_EXERCISE_VIDEOS[sanitized];
      }
    }

    const exId = selectedEntry?.id || `custom_${Date.now()}`;
    const lastSession =
      historyIndex?.get(normalizeExerciseKey(exerciseName)) ??
      getPreviousExerciseSession(exerciseName, gymLogs);
    const lastSets = lastSession?.sets ?? null;
    const rawMuscle = muscle === 'None' ? '' : muscle.trim();
    const resolved = resolveExerciseTargetMuscle(exerciseName, rawMuscle);

    const newEx: GymExerciseLog = {
      exerciseId: exId,
      name: exerciseName,
      muscle: resolved.targetMuscle || rawMuscle,
      targetSets: parsedSets,
      targetReps: reps.trim(),
      videoId: userVideoId || '',
      restTimeSecs: parsedRest,
      lastSessionSets: lastSets ?? undefined,
      setsLog: Array.from({ length: parsedSets }, (_, i) => {
        const prev = lastSets?.[i];
        return {
          setNumber: i + 1,
          reps: prev?.reps ?? null,
          weight: prev?.weight ?? null,
          completed: false,
        };
      }),
      isCustom: !selectedEntry || exId.startsWith('custom_'),
    };

    // Save to split if requested
    if (savePermanently && planDay) {
      const currentMasterDay = getCustomPlanDay(userGymPlan?.customDays, planDay.dayIndex) || planDay;
      const updatedExercises = [...currentMasterDay.exercises];
      if (!updatedExercises.some((e: any) => e.id === newEx.exerciseId)) {
        updatedExercises.push({
          id: newEx.exerciseId,
          name: newEx.name,
          muscle: newEx.muscle,
          targetSets: newEx.targetSets,
          targetReps: newEx.targetReps,
          videoId: newEx.videoId,
          restTimeSecs: newEx.restTimeSecs,
        });
        updateMasterPlan(planDay.dayIndex, { ...currentMasterDay, exercises: updatedExercises }).catch(handleSyncError);
      }
    }

    onAdd(newEx);
    resetAndClose();
  };

  const resetAndClose = () => {
    Keyboard.dismiss();
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedMuscle('all');
    setSelectedEquipment('All');
    setShowEquipmentModal(false);
    setShowCreateCustomModal(false);
    setSelectedEntry(null);
    setMultiSelected({});
    setShowCustomTuning(false);
    setSets('3');
    setReps('8-12');
    setRestTime('60');
    setMuscle('None');
    setVideoLink('');
    setSavePermanently(false);
    setAiLoading(false);
    onClose();
  };

  const hasActiveFilters = selectedMuscle !== 'all' || selectedEquipment !== 'All';
  const clearFilters = useCallback(() => {
    hapticSelection();
    setSelectedMuscle('all');
    setSelectedEquipment('All');
  }, []);

  const multiCount = Object.keys(multiSelected).length;

  // Render individual card item
  const renderExerciseCard = useCallback(({ item }: { item: ExerciseCatalogEntry }) => {
    const itemKey = (item.id || item.name).toLowerCase();
    return (
      <ExerciseCardItem
        item={item}
        onSelect={handleSelectEntry}
        onQuickAdd={handleDirectAdd}
        historyMap={historyIndex}
        colors={colors}
        styles={styles}
        isDark={isDark}
        isSelected={selectedEntry?.id === item.id}
        multiSelectMode={selectionMode === 'multi'}
        isMultiSelected={Boolean(multiSelected[itemKey])}
      />
    );
  }, [colors, styles, isDark, selectedEntry, historyIndex, selectionMode, multiSelected, handleSelectEntry, handleDirectAdd]);

  const innerContent = (
      <View
        style={[
          styles.modalContent,
          {
            height: '100%',
            maxHeight: '100%',
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderWidth: 0,
            backgroundColor: 'transparent',
            paddingBottom: Math.max(insets.bottom, SPACE.lg),
          },
        ]}
      >
        {showCustomTuning ? (
            <Animated.View entering={FadeInDown.duration(200)} style={{ flex: 1 }}>
              {/* Header with Back to Catalogue + Close */}
              <View style={styles.header}>
                <TactileButton
                  variant="custom"
                  onPress={() => setShowCustomTuning(false)}
                  style={styles.backBtn}
                  hitSlop={TOUCH.hitSlop}
                >
                  <ChevronLeft size={ICON.md} strokeWidth={ICON.strokeWidth} color={tokens.text.primary} />
                  <Text style={styles.backBtnText}>Catalogue</Text>
                </TactileButton>

                <Text style={styles.title} numberOfLines={1}>
                  Customize
                </Text>

                <TactileButton
                  variant="custom"
                  onPress={resetAndClose}
                  style={styles.closeBtn}
                  hitSlop={TOUCH.hitSlop}
                  accessibilityLabel="Close exercise modal"
                >
                  <X size={16} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
                </TactileButton>
              </View>

              <ScrollView
                style={styles.tuningFullScroll}
                contentContainerStyle={styles.tuningFullContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                <View style={styles.customizeHeroCard}>
                  <Text style={styles.customizeHeroTitle} numberOfLines={2}>
                    {selectedEntry?.name || searchQuery}
                  </Text>
                  <View style={styles.customizeHeroMeta}>
                    <View
                      style={[
                        styles.muscleDot,
                        {
                          backgroundColor: resolveMuscleColor(
                            muscle !== 'None' ? muscle : (selectedEntry?.muscle || 'Mixed')
                          ),
                        },
                      ]}
                    />
                    <Text style={styles.customizeHeroMuscle}>
                      {muscle !== 'None' ? muscle : (selectedEntry?.muscle || 'General')}
                    </Text>
                  </View>
                </View>

                <ExerciseAnimationCard
                  exerciseName={selectedEntry?.id || selectedEntry?.name || searchQuery}
                  showInstructions={false}
                  showBadges={false}
                  isEmbedded={true}
                  animationHeight={220}
                  style={{ marginBottom: SPACE.md + 2 }}
                />

                <ExerciseCustomFields
                  sets={sets}
                  setSets={setSets}
                  reps={reps}
                  setReps={setReps}
                  restTime={restTime}
                  setRestTime={setRestTime}
                  videoLink={videoLink}
                  setVideoLink={setVideoLink}
                  savePermanently={savePermanently}
                  setSavePermanently={setSavePermanently}
                  planDay={planDay}
                  colors={colors}
                  styles={styles}
                  isDark={isDark}
                />

                <TactileButton
                  variant="custom"
                  haptic="success"
                  size="lg"
                  style={styles.submitBtn}
                  onPress={handleConfirmAddTuned}
                >
                  <Check size={16} strokeWidth={ICON.strokeWidth} color={tokens.accent.onPrimary} style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Add to Workout</Text>
                </TactileButton>
              </ScrollView>
            </Animated.View>
          ) : (
            <View style={{ flex: 1 }}>
              <View style={styles.header}>
                {embedded ? (
                  <TactileButton
                    variant="custom"
                    onPress={resetAndClose}
                    style={styles.backBtn}
                    hitSlop={TOUCH.hitSlop}
                    accessibilityLabel="Back to routine"
                  >
                    <ChevronLeft size={ICON.md} strokeWidth={ICON.strokeWidth} color={tokens.text.primary} />
                    <Text style={styles.backBtnText}>Routine</Text>
                  </TactileButton>
                ) : (
                  <View style={{ width: 32 }} />
                )}
                <Text style={styles.title}>{headerTitle || 'Add Exercise'}</Text>
                <TactileButton
                  variant="custom"
                  onPress={resetAndClose}
                  style={styles.closeBtn}
                  hitSlop={TOUCH.hitSlop}
                  accessibilityLabel="Close exercise modal"
                >
                  <X size={16} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
                </TactileButton>
              </View>

              <View style={styles.searchRow}>
                <Search size={ICON.sm + 1} strokeWidth={ICON.strokeWidth} color={tokens.text.muted} style={{ marginRight: SPACE.sm }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search exercise catalogue (e.g. Incline Bench)..."
                  placeholderTextColor={tokens.text.muted}
                  value={searchQuery}
                  onChangeText={text => {
                    setSearchQuery(text);
                    setSelectedEntry(null);
                  }}
                  autoCorrect={false}
                  autoCapitalize="words"
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TactileButton
                    variant="custom"
                    onPress={() => {
                      setSearchQuery('');
                      setSelectedEntry(null);
                    }}
                    style={styles.clearBtn}
                    hitSlop={TOUCH.hitSlop}
                    accessibilityLabel="Clear search"
                  >
                    <X size={ICON.sm + 1} strokeWidth={ICON.strokeWidth} color={tokens.text.muted} />
                  </TactileButton>
                )}
              </View>

              <View style={styles.filterBarContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterChipsRow}
                >
                  {MUSCLE_FILTER_CHIPS.map(chip => {
                    const isActive = selectedMuscle === chip.id;
                    return (
                      <TactileButton
                        key={chip.id}
                        lightweight
                        variant="custom"
                        style={[styles.filterChip, isActive && styles.filterChipActive]}
                        onPress={() => {
                          setSelectedMuscle(prev => (prev === chip.id ? 'all' : chip.id));
                        }}
                      >
                        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                          {chip.label}
                        </Text>
                      </TactileButton>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Equipment Filter Pill & Custom Exercise Creator */}
              <View style={styles.utilityFilterRow}>
                <View
                  style={[
                    styles.equipmentPill,
                    selectedEquipment !== 'All' && styles.equipmentPillActive,
                  ]}
                >
                  <TactileButton
                    lightweight
                    variant="custom"
                    haptic="selection"
                    style={styles.equipmentPillLeft}
                    onPress={() => setShowEquipmentModal(true)}
                  >
                    <Dumbbell
                      size={14}
                      strokeWidth={ICON.strokeWidth}
                      color={selectedEquipment !== 'All' ? tokens.accent.primary : tokens.text.secondary}
                    />
                    <Text
                      style={[
                        styles.equipmentPillText,
                        selectedEquipment !== 'All' && styles.equipmentPillTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {selectedEquipment === 'All' ? 'All Equipment' : selectedEquipment === 'None' ? 'Bodyweight' : selectedEquipment}
                    </Text>
                  </TactileButton>
                  {selectedEquipment !== 'All' ? (
                    <TactileButton
                      lightweight
                      variant="custom"
                      haptic="selection"
                      hitSlop={TOUCH.hitSlop}
                      onPress={() => setSelectedEquipment('All')}
                      accessibilityLabel="Clear equipment filter"
                    >
                      <X size={14} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
                    </TactileButton>
                  ) : (
                    <TactileButton
                      lightweight
                      variant="custom"
                      haptic="selection"
                      hitSlop={TOUCH.hitSlop}
                      onPress={() => setShowEquipmentModal(true)}
                      accessibilityLabel="Open equipment filter"
                    >
                      <ChevronDown size={14} strokeWidth={ICON.strokeWidth} color={tokens.text.muted} />
                    </TactileButton>
                  )}
                </View>

                <TactileButton
                  lightweight
                  variant="custom"
                  haptic="selection"
                  style={styles.customCreatePill}
                  onPress={() => setShowCreateCustomModal(true)}
                >
                  <Plus size={14} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
                  <Text style={styles.customCreatePillText}>Custom</Text>
                </TactileButton>
              </View>

              <View style={styles.statusNotice}>
                <NumericText style={styles.statusNoticeText}>
                  {[
                    selectedMuscle && selectedMuscle !== 'all' ? selectedMuscle : null,
                    selectedEquipment !== 'All' ? (selectedEquipment === 'None' ? 'Bodyweight' : selectedEquipment) : null,
                  ].filter(Boolean).join(' · ') || (searchQuery.trim() ? 'Matching' : 'All Exercises')}
                  {' · '}
                  {results.length} {results.length === 1 ? 'Exercise' : 'Exercises'}
                </NumericText>
                {hasActiveFilters && (
                  <TactileButton
                    lightweight
                    variant="custom"
                    hitSlop={TOUCH.hitSlop}
                    onPress={clearFilters}
                  >
                    <Text style={styles.resetFiltersLink}>Reset Filters</Text>
                  </TactileButton>
                )}
              </View>

              {results.length > 0 ? (
                <FlatList
                  data={displayedResults}
                  keyExtractor={exerciseCardKeyExtractor}
                  renderItem={renderExerciseCard}
                  contentContainerStyle={[
                    styles.cardList,
                    {
                      paddingBottom:
                        selectionMode === 'multi'
                          ? Math.max(insets.bottom + 84, 88)
                          : Math.max(insets.bottom + SPACE.lg, 60),
                    },
                  ]}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  nestedScrollEnabled
                  initialNumToRender={10}
                  maxToRenderPerBatch={10}
                  updateCellsBatchingPeriod={30}
                  windowSize={5}
                  removeClippedSubviews={Platform.OS === 'android'}
                  style={{ flex: 1 }}
                />
              ) : (
                <ScrollView
                  style={{ flex: 1 }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  nestedScrollEnabled
                >
                  {autoResolvedForQuery && (
                    <View style={styles.createCustomCard}>
                      <View style={styles.createCustomHeader}>
                        <View style={styles.createCustomIconWrap}>
                          <Dumbbell size={ICON.lg} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.createCustomTitle} numberOfLines={1}>
                            Create "{autoResolvedForQuery.canonicalName}"
                          </Text>
                          <Text style={styles.createCustomSubtitle}>
                            Auto-categorized as{' '}
                            <Text style={{ color: autoResolvedForQuery.muscleColor, fontFamily: FONT_FAMILY.bold }}>
                              {autoResolvedForQuery.canonicalGroup} ({autoResolvedForQuery.targetMuscle})
                            </Text>
                          </Text>
                        </View>
                      </View>

                      <TactileButton
                        variant="custom"
                        haptic="success"
                        style={styles.createCustomCtaBtn}
                        onPress={handleInstantCreateCustom}
                      >
                        <Plus size={ICON.md - 2} strokeWidth={ICON.strokeWidth} color={tokens.accent.onPrimary} />
                        <Text style={styles.createCustomCtaText}>
                          Create "{autoResolvedForQuery.canonicalName}" Exercise
                        </Text>
                      </TactileButton>

                      <TactileButton
                        variant="custom"
                        style={styles.createCustomSecondaryLink}
                        onPress={() => {
                          setMuscle(autoResolvedForQuery.targetMuscle);
                          setShowCustomTuning(true);
                        }}
                      >
                        <Text style={styles.createCustomSecondaryText}>
                          Customize sets, reps & video link
                        </Text>
                      </TactileButton>
                    </View>
                  )}

                  <View style={styles.emptyState}>
                    <Search size={ICON.lg} strokeWidth={ICON.strokeWidth} color={tokens.text.muted} />
                    <Text style={styles.emptyStateText}>
                      {hasActiveFilters
                        ? 'No exercises match the active muscle/equipment filters.'
                        : 'Not in standard catalogue? Tap create above or use the custom exercise builder.'}
                    </Text>
                    {hasActiveFilters ? (
                      <TactileButton
                        variant="custom"
                        style={{ marginTop: SPACE.sm }}
                        onPress={clearFilters}
                      >
                        <Text style={styles.resetFiltersLink}>Reset Muscle & Equipment Filters</Text>
                      </TactileButton>
                    ) : (
                      <TactileButton
                        variant="custom"
                        style={{ marginTop: SPACE.sm }}
                        onPress={() => setShowCreateCustomModal(true)}
                      >
                        <Text style={styles.resetFiltersLink}>Open Custom Exercise Builder</Text>
                      </TactileButton>
                    )}
                  </View>
                </ScrollView>
              )}
              {selectionMode === 'multi' && (
                <View style={styles.multiFooter}>
                  <TactileButton
                    variant="primary"
                    size="lg"
                    haptic="success"
                    disabled={multiCount === 0}
                    onPress={handleConfirmMultiAdd}
                    label={
                      multiCount === 0
                        ? 'Select Exercises Above'
                        : `Add ${multiCount} Exercise${multiCount === 1 ? '' : 's'}`
                    }
                  />
                </View>
              )}
            </View>
          )}

        <VaultEquipmentModal
          visible={showEquipmentModal}
          selectedEquipment={selectedEquipment}
          resultCount={results.length}
          onSelect={(eq) => setSelectedEquipment(eq)}
          onClear={() => setSelectedEquipment('All')}
          onClose={() => setShowEquipmentModal(false)}
        />

        <CreateCustomExerciseModal
          visible={showCreateCustomModal}
          onClose={() => setShowCreateCustomModal(false)}
          onCreated={handleCustomModalCreated}
        />
      </View>
  );

  if (embedded) {
    return innerContent;
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={resetAndClose}
      fullHeight={true}
      noPadding={true}
      avoidKeyboard={true}
      sheetBackgroundColor={isDark ? '#0B0C10' : '#F8F8FA'}
    >
      {innerContent}
    </BottomSheet>
  );
}

export default AddExerciseModal;
