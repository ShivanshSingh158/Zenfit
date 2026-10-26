/**
 * AddExerciseModal.tsx • ZenFit Mobile
 *
 * Fully redesigned exercise catalogue search & creation modal:
 * - Segmented Anatomical Muscle Filter Bar with visual glyphs (No equipment filter).
 * - Rich card-style search results (Equipment glyph, Primary & Secondary muscles,
 *   Tier badge, and Past performance snippet).
 * - Instant "Create Custom Exercise" card on 0 search results with one-tap auto-categorization.
 * - Ultra-lightweight: Database activates ONLY when searching or filtering; turns OFF when idle
 *   so modal opening, closing, and interactions feel instantaneous.
 */
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { FONT_FAMILY } from '../../theme/tokens';
import { GymExerciseLog, GymPlanDay } from '../../types/gym.types';
import { useGymPlan, useGymLogs } from '../../contexts/domains/WellnessContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getCustomPlanDay } from '../../hooks/useGymLog';
import { autoResolveExerciseVideoId } from '../../services/exerciseVideoResolver';
import { KNOWN_EXERCISE_VIDEOS, sanitizeName } from '../../services/exerciseVideoDatabase';
import { aiResolveExercise, AIExerciseInfo } from '../../services/geminiProxy';
import { GYM_PLAN } from '../../data/gymPlan';
import { EXERCISE_DATABASE } from '../../data/exerciseDatabase';
import { searchExercises } from '../../services/exerciseMediaService';
import { handleSyncError } from '../../utils/errorUtils';
import { hapticLight, hapticSuccess, hapticMedium } from '../../utils/haptics';

// Subcomponents & Styles
import { makeAddExerciseStyles } from './addExerciseStyles';
import { ExerciseCatalogEntry } from './ExerciseSearchDropdown';
import ExerciseCardItem, { getEquipmentGlyph, getSecondaryMuscles, TIER_CONFIG } from './ExerciseCardItem';
import ExerciseCustomFields from './ExerciseCustomFields';
import {
  getBiomechanicalPrescription,
  resolveExerciseTargetMuscle,
  getPreviousExerciseSession,
  resolveMuscleColor,
} from '../../utils/gymUtils';

// ── Visual Anatomical Muscle Filter Chips ───────────────────────────────────
export const ANATOMICAL_MUSCLE_CHIPS: {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'all', label: 'All', icon: 'apps-outline' },
  { id: 'Chest', label: 'Chest', icon: 'shield-outline' },
  { id: 'Back', label: 'Back', icon: 'layers-outline' },
  { id: 'Legs', label: 'Legs', icon: 'walk-outline' },
  { id: 'Shoulders', label: 'Shoulders', icon: 'fitness-outline' },
  { id: 'Arms', label: 'Arms', icon: 'flash-outline' },
  { id: 'Abs', label: 'Abs', icon: 'grid-outline' },
  { id: 'Cardio', label: 'Cardio', icon: 'flame-outline' },
];

// ── Ultra-Lightweight Pre-defined Staples (Rendered in 0ms when DB is idle) ──
const POPULAR_STAPLE_EXERCISES: ExerciseCatalogEntry[] = [
  { id: 'staple_inc_db_press', name: 'Incline Bench Press (Dumbbell)', muscle: 'Upper Chest', tier: 'S Tier', targetSets: 3, targetReps: '8–12', restTimeSecs: 90, videoId: '', isCurated: true },
  { id: 'staple_lat_pulldown', name: 'Lat Pulldown (Cable)', muscle: 'Lats', tier: 'S Tier', targetSets: 3, targetReps: '10–12', restTimeSecs: 75, videoId: '', isCurated: true },
  { id: 'staple_squat_bb', name: 'Squat (Barbell)', muscle: 'Quads', tier: 'S Tier', targetSets: 3, targetReps: '6–10', restTimeSecs: 120, videoId: '', isCurated: true },
  { id: 'staple_cable_lat_raise', name: 'Lateral Raise (Cable)', muscle: 'Side Delts', tier: 'S Tier', targetSets: 3, targetReps: '12–15', restTimeSecs: 60, videoId: '', isCurated: true },
  { id: 'staple_flat_bb_press', name: 'Flat Bench Press (Barbell)', muscle: 'Mid Chest', tier: 'A+ Tier', targetSets: 3, targetReps: '6–8', restTimeSecs: 120, videoId: '', isCurated: true },
  { id: 'staple_rdl_db', name: 'Romanian Deadlift (Dumbbell)', muscle: 'Hamstrings', tier: 'S Tier', targetSets: 3, targetReps: '8–12', restTimeSecs: 90, videoId: '', isCurated: true },
  { id: 'staple_tri_pushdown', name: 'Triceps Pushdown (Cable)', muscle: 'Triceps', tier: 'A+ Tier', targetSets: 3, targetReps: '10–12', restTimeSecs: 60, videoId: '', isCurated: true },
  { id: 'staple_bicep_curl_db', name: 'Incline Bicep Curl (Dumbbell)', muscle: 'Biceps', tier: 'S Tier', targetSets: 3, targetReps: '10–12', restTimeSecs: 60, videoId: '', isCurated: true },
  { id: 'staple_cable_row', name: 'Seated Cable Row', muscle: 'Upper Back', tier: 'A+ Tier', targetSets: 3, targetReps: '8–12', restTimeSecs: 75, videoId: '', isCurated: true },
  { id: 'staple_leg_ext', name: 'Leg Extension (Machine)', muscle: 'Quads', tier: 'A Tier', targetSets: 3, targetReps: '12–15', restTimeSecs: 60, videoId: '', isCurated: true },
];

/** Build a full deduplicated exercise catalogue from our database + plan + dataset. */
function buildCatalogue(): ExerciseCatalogEntry[] {
  const seen = new Set<string>();
  const result: ExerciseCatalogEntry[] = [];

  const add = (e: ExerciseCatalogEntry, isCurated: boolean) => {
    const key = (e.name || '').toLowerCase().trim();
    if (!key) return;
    if (seen.has(key)) {
      const existing = result.find(r => (r.name || '').toLowerCase().trim() === key);
      if (existing && e.aliases && e.aliases.length > 0) {
        existing.aliases = Array.from(new Set([...(existing.aliases || []), ...e.aliases]));
      }
      return;
    }
    seen.add(key);
    result.push({ ...e, isCurated });
  };

  // 1. EXERCISE_DATABASE (Curated master library with calibrated tiers)
  for (const dbEntry of EXERCISE_DATABASE) {
    const rx = getBiomechanicalPrescription(dbEntry.name, dbEntry.muscle);
    add({
      id: dbEntry.id,
      name: dbEntry.name,
      muscle: dbEntry.muscle,
      tier: dbEntry.tier || 'C Tier',
      targetSets: rx.targetSets,
      targetReps: rx.targetReps,
      restTimeSecs: rx.restTimeSecs,
      videoId: (dbEntry as any).videoId || '',
      aliases: dbEntry.aliases,
    }, true);
  }

  // 2. GYM_PLAN exercises
  for (const day of GYM_PLAN) {
    for (const ex of day.exercises) {
      const rx = getBiomechanicalPrescription(ex.name, ex.muscle);
      add({
        id: ex.id,
        name: ex.name,
        muscle: ex.muscle ?? 'Mixed',
        tier: (ex as any).tier || 'A Tier',
        targetSets: ex.targetSets ?? rx.targetSets,
        targetReps: ex.targetReps ?? rx.targetReps,
        restTimeSecs: (ex as any).restTimeSecs ?? rx.restTimeSecs,
        videoId: ex.videoId ?? '',
      }, true);
    }
  }

  // 3. 1,324 Exercises Dataset integration
  const datasetExercises = searchExercises('', 'all', 2000);
  for (const ex of datasetExercises) {
    const rawMuscle = ex.target || ex.bodyPart || 'Mixed';
    const cleanMuscle = rawMuscle.charAt(0).toUpperCase() + rawMuscle.slice(1);
    const rx = getBiomechanicalPrescription(ex.name, cleanMuscle);

    add({
      id: ex.id,
      name: ex.name,
      muscle: cleanMuscle,
      tier: 'C Tier',
      targetSets: rx.targetSets,
      targetReps: rx.targetReps,
      restTimeSecs: rx.restTimeSecs,
      videoId: '',
    }, false);
  }

  return result;
}

// Lazy singleton — built ONLY upon active user search or filter selection
let _exerciseCatalogue: ExerciseCatalogEntry[] | null = null;
let _categoryMap: Record<string, ExerciseCatalogEntry[]> | null = null;

export function getExerciseCatalogue(): ExerciseCatalogEntry[] {
  if (!_exerciseCatalogue) {
    _exerciseCatalogue = buildCatalogue();
    loadCustomExercisesToCatalogue().catch(() => {});
  }
  return _exerciseCatalogue;
}

const TIER_SORT_WEIGHT: Record<string, number> = {
  'S Tier': 1,
  'A+ Tier': 2,
  'A Tier': 3,
  'B Tier': 4,
  'C Tier': 5,
};

const sortTierWise = (list: ExerciseCatalogEntry[]) => {
  return list.sort((a, b) => {
    const weightA = a.tier ? (TIER_SORT_WEIGHT[a.tier] ?? 5) : 5;
    const weightB = b.tier ? (TIER_SORT_WEIGHT[b.tier] ?? 5) : 5;
    if (weightA !== weightB) return weightA - weightB;
    return a.name.localeCompare(b.name);
  });
};

function checkCategoryMatch(m: string, category: string): boolean {
  const l = (m || '').toLowerCase();
  const cat = category.toLowerCase();

  if (cat === 'all') return true;

  if (cat === 'cardio') {
    return (
      l.includes('cardio') ||
      l.includes('conditioning') ||
      l.includes('hiit') ||
      l.includes('sport') ||
      l.includes('plyometric') ||
      l.includes('mobility') ||
      l.includes('warmup') ||
      l.includes('olympic')
    );
  }
  if (cat === 'back') {
    if (l.includes('tricep') || l.includes('bicep') || l.includes('brach') || l.includes('delt')) return false;
    return (
      l.includes('back') ||
      l.includes('lat') ||
      l.includes('wing') ||
      l.includes('rhomboid') ||
      l.includes('trap') ||
      l.includes('erector')
    );
  }
  if (cat === 'arms') {
    return (
      l.includes('bicep') ||
      l.includes('tricep') ||
      l.includes('brach') ||
      l.includes('forearm') ||
      l.includes('wrist') ||
      l.includes('grip')
    );
  }
  if (cat === 'legs') {
    return (
      l.includes('quad') ||
      l.includes('glute') ||
      l.includes('hamstring') ||
      l.includes('calf') ||
      l.includes('calves') ||
      l.includes('soleus') ||
      l.includes('tibialis') ||
      l.includes('vmo') ||
      l.includes('adductor') ||
      l.includes('abductor') ||
      l.includes('legs')
    );
  }
  if (cat === 'chest') {
    return l.includes('chest') || l.includes('pec') || l.includes('serratus');
  }
  if (cat === 'shoulders') {
    return l.includes('delt') || l.includes('shoulder');
  }
  if (cat === 'abs') {
    return l.includes('abs') || l.includes('oblique') || l.includes('core') || l.includes('transverse') || l.includes('vacuum');
  }
  return l.includes(cat);
}

export function getCategoryMap(): Record<string, ExerciseCatalogEntry[]> {
  if (!_categoryMap) {
    const cat = getExerciseCatalogue();
    _categoryMap = {
      Chest: sortTierWise(cat.filter(e => checkCategoryMatch(e.muscle, 'Chest'))),
      Back: sortTierWise(cat.filter(e => checkCategoryMatch(e.muscle, 'Back'))),
      Legs: sortTierWise(cat.filter(e => checkCategoryMatch(e.muscle, 'Legs'))),
      Shoulders: sortTierWise(cat.filter(e => checkCategoryMatch(e.muscle, 'Shoulders'))),
      Arms: sortTierWise(cat.filter(e => checkCategoryMatch(e.muscle, 'Arms'))),
      Abs: sortTierWise(cat.filter(e => checkCategoryMatch(e.muscle, 'Abs'))),
      Cardio: sortTierWise(cat.filter(e => checkCategoryMatch(e.muscle, 'Cardio'))),
    };
  }
  return _categoryMap;
}

const CUSTOM_EXERCISES_KEY = '@zentrack_custom_exercises';
let _customExercisesMutex: Promise<void> = Promise.resolve();

async function loadCustomExercisesToCatalogue(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_EXERCISES_KEY);
    if (!raw) return;
    const customs: ExerciseCatalogEntry[] = JSON.parse(raw);
    const catalogue = getExerciseCatalogue();
    for (const ex of customs) {
      const key = ex.name.toLowerCase().trim();
      const existing = catalogue.find(e => e.name.toLowerCase().trim() === key || (ex.id && e.id === ex.id));
      if (!existing) {
        catalogue.push(ex);
      } else if (ex.videoId && !existing.videoId) {
        existing.videoId = ex.videoId;
      }
    }
  } catch (_) {}
}

async function persistCustomExercise(entry: ExerciseCatalogEntry): Promise<void> {
  _customExercisesMutex = _customExercisesMutex.then(async () => {
    try {
      const raw = await AsyncStorage.getItem(CUSTOM_EXERCISES_KEY);
      const existing: ExerciseCatalogEntry[] = raw ? JSON.parse(raw) : [];
      const key = entry.name.toLowerCase().trim();
      const idx = existing.findIndex(e => e.name.toLowerCase().trim() === key || (entry.id && e.id === entry.id));
      if (idx >= 0) {
        existing[idx] = {
          ...existing[idx],
          ...entry,
          videoId: entry.videoId || existing[idx].videoId || '',
        };
      } else {
        existing.push(entry);
      }
      await AsyncStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(existing));

      const catalogue = getExerciseCatalogue();
      const live = catalogue.find(e => e.name.toLowerCase().trim() === key || (entry.id && e.id === entry.id));
      if (live) {
        if (entry.videoId) live.videoId = entry.videoId;
      } else {
        catalogue.push(entry);
      }
    } catch (_) {}
  }).catch(() => {});
  return _customExercisesMutex;
}

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

  let score = 0;
  if (entry.isCurated) score += 1500;

  if (normName === normQuery || normAliases.includes(normQuery)) {
    score += 5000;
  } else if (nameLower.startsWith(rawQuery) || normName.startsWith(normQuery)) {
    score += 2000;
  } else if (aliases.some(a => a.startsWith(rawQuery))) {
    score += 1800;
  } else if (nameLower.includes(rawQuery) || normName.includes(normQuery)) {
    score += 1200;
  } else if (cleanedQuery !== rawQuery && nameLower.includes(cleanedQuery)) {
    score += 1000;
  } else if (aliases.some(a => a.includes(rawQuery) || a.includes(cleanedQuery))) {
    score += 900;
  }

  if (queryTokens.length > 0) {
    let matchedTokenCount = 0;
    for (const qt of queryTokens) {
      if (nameTokens.includes(qt)) {
        matchedTokenCount += 1;
        score += 250;
      } else if (nameTokens.some(nt => nt.includes(qt) || qt.includes(nt))) {
        matchedTokenCount += 0.8;
        score += 150;
      } else if (aliases.some(a => a.includes(qt))) {
        matchedTokenCount += 0.7;
        score += 120;
      }
    }
    if (matchedTokenCount >= queryTokens.length) {
      score += 1200;
    } else if (matchedTokenCount > 0) {
      score += (matchedTokenCount / queryTokens.length) * 400;
    }
  }

  if (categoryFilter && categoryFilter !== 'all') {
    if (checkCategoryMatch(entry.muscle, categoryFilter)) {
      score += 800;
    }
  }

  const tierWeights: Record<string, number> = {
    'S Tier': 500,
    'A+ Tier': 400,
    'A Tier': 300,
    'B Tier': 150,
    'C Tier': 50,
  };
  score += tierWeights[entry.tier || ''] || 0;

  return score;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (ex: GymExerciseLog) => void;
  planDay?: GymPlanDay;
  existingExerciseIds?: string[];
}

export function AddExerciseModal({ visible, onClose, onAdd, planDay }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeAddExerciseStyles(colors, isDark), [colors, isDark]);
  const { userGymPlan, updateMasterPlan } = useGymPlan();
  const { gymLogs } = useGymLogs();

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<ExerciseCatalogEntry | null>(null);
  const [showCustomTuning, setShowCustomTuning] = useState(false);

  // Form states for custom tuning
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('8-12');
  const [restTime, setRestTime] = useState('60');
  const [muscle, setMuscle] = useState('None');
  const [videoLink, setVideoLink] = useState('');
  const [savePermanently, setSavePermanently] = useState(false);

  // AI resolver state
  const [aiSuggestion, setAiSuggestion] = useState<AIExerciseInfo | null>(null);
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

  // ── Database Activation Guard ─────────────────────────────────────────────
  // The database is ONLY active when the user has typed a query or selected a specific muscle!
  // If idle, it remains completely inactive/off so closing and opening feel instant!
  const isDatabaseActive = Boolean(debouncedQuery.length > 0 || (selectedMuscle && selectedMuscle !== 'all'));

  // Filtered Results Calculation
  const results = useMemo(() => {
    if (!isDatabaseActive) {
      // Idle mode: Return static popular staples instantly with zero compute
      return POPULAR_STAPLE_EXERCISES;
    }

    const catalogue = getExerciseCatalogue();
    const categoryMap = getCategoryMap();
    const q = debouncedQuery;

    // Muscle category only (no search text)
    if (!q) {
      if (selectedMuscle && selectedMuscle !== 'all') {
        return categoryMap[selectedMuscle] || catalogue.filter(e => checkCategoryMatch(e.muscle, selectedMuscle));
      }
      return catalogue;
    }

    // Full Relevance Search
    const cleanedQuery = cleanSearchString(q);
    const queryTokens = getQueryTokens(q);
    const normQuery = q.replace(/[^a-z0-9]/g, '');

    const scored: { item: ExerciseCatalogEntry; score: number }[] = [];

    for (const entry of catalogue) {
      const score = scoreExerciseMatch(
        entry,
        q,
        cleanedQuery,
        queryTokens,
        normQuery,
        selectedMuscle
      );
      if (score > (entry.isCurated ? 1500 : 0)) {
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
  }, [debouncedQuery, selectedMuscle, isDatabaseActive]);

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
  const handleSelectEntry = (entry: ExerciseCatalogEntry) => {
    setSelectedEntry(entry);
    setSets(String(entry.targetSets || 3));
    setReps(entry.targetReps || '8-12');
    setRestTime(String(entry.restTimeSecs || 60));
    setMuscle(entry.muscle || 'None');
    setVideoLink(entry.videoId || '');
    setShowCustomTuning(true);
  };

  // Direct 1-Tap Add Action from any Exercise Card
  const handleDirectAdd = (entry: ExerciseCatalogEntry) => {
    const lastSession = getPreviousExerciseSession(entry.name, gymLogs);
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

    const newEx: GymExerciseLog = {
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

    onAdd(newEx);
    resetAndClose();
  };

  // Instant 1-Tap Create Custom Exercise on 0 Results
  const handleInstantCreateCustom = () => {
    if (!autoResolvedForQuery) return;
    hapticSuccess();

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
    const lastSession = getPreviousExerciseSession(exerciseName, gymLogs);
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
    setSelectedEntry(null);
    setShowCustomTuning(false);
    setSets('3');
    setReps('8-12');
    setRestTime('60');
    setMuscle('None');
    setVideoLink('');
    setSavePermanently(false);
    setAiSuggestion(null);
    setAiLoading(false);
    onClose();
  };

  // Render individual card item
  const renderExerciseCard = useCallback(({ item }: { item: ExerciseCatalogEntry }) => {
    return (
      <ExerciseCardItem
        item={item}
        onSelect={handleSelectEntry}
        onQuickAdd={handleDirectAdd}
        gymLogs={gymLogs}
        colors={colors}
        styles={styles}
        isDark={isDark}
        isSelected={selectedEntry?.id === item.id}
      />
    );
  }, [colors, styles, isDark, selectedEntry, gymLogs]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={resetAndClose}
    >
      <View style={styles.modalBg}>
        {/* Backdrop tap to dismiss */}
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={resetAndClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContent}
        >
          {/* Grab handle */}
          <View style={styles.dragHandle} />

          {showCustomTuning ? (
            /* ══════════════════════════════════════════════════════════════════
               DEDICATED CUSTOMIZE EXERCISE VIEW
               ══════════════════════════════════════════════════════════════════ */
            <>
              {/* Header with Back to Catalogue + Close */}
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={() => setShowCustomTuning(false)}
                  style={styles.headerLeftBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-back" size={22} color={colors.textPrimary} style={{ marginRight: 2 }} />
                  <Text style={styles.title}>Customize</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={resetAndClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={19} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.tuningFullScroll}
                contentContainerStyle={styles.tuningFullContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Hero Info Card for Exercise (Same design as catalogue ExerciseCard) */}
                <View style={styles.exerciseCard}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {selectedEntry?.name || searchQuery}
                    </Text>

                    {selectedEntry?.tier && (selectedEntry.tier === 'S Tier' || selectedEntry.tier === 'A+ Tier') && TIER_CONFIG[selectedEntry.tier] && (
                      <View
                        style={[
                          styles.tierBadge,
                          {
                            backgroundColor: TIER_CONFIG[selectedEntry.tier].bg,
                            borderColor: TIER_CONFIG[selectedEntry.tier].border,
                          },
                        ]}
                      >
                        <Text style={[styles.tierBadgeText, { color: TIER_CONFIG[selectedEntry.tier].text }]}>
                          {selectedEntry.tier}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardMuscleRow}>
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
                    <Text style={styles.cardMuscleText} numberOfLines={1}>
                      <Text style={styles.primaryMuscleText}>
                        {muscle !== 'None' ? muscle : (selectedEntry?.muscle || 'General')}
                      </Text>{' '}
                      <Text style={styles.secondaryMuscleText}>
                        {getSecondaryMuscles(
                          selectedEntry?.name || searchQuery,
                          muscle !== 'None' ? muscle : (selectedEntry?.muscle || 'General')
                        )}
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* Custom Sets / Reps / Muscle / Video Fields */}
                <ExerciseCustomFields
                  sets={sets}
                  setSets={setSets}
                  reps={reps}
                  setReps={setReps}
                  restTime={restTime}
                  setRestTime={setRestTime}
                  muscle={muscle}
                  setMuscle={setMuscle}
                  videoLink={videoLink}
                  setVideoLink={setVideoLink}
                  savePermanently={savePermanently}
                  setSavePermanently={setSavePermanently}
                  planDay={planDay}
                  colors={colors}
                  styles={styles}
                  isDark={isDark}
                />

                {/* Confirm Action Button */}
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleConfirmAddTuned}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-sharp" size={17} color={colors.textPrimary} style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Add to Workout</Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          ) : (
            /* ══════════════════════════════════════════════════════════════════
               CATALOGUE SEARCH & FILTER VIEW
               ══════════════════════════════════════════════════════════════════ */
            <>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.title}>Add Exercise</Text>
                </View>
                <TouchableOpacity onPress={resetAndClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={19} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Search Input Bar */}
              <View style={styles.searchRow}>
                <Ionicons name="search-outline" size={17} color={colors.textTertiary} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search exercise catalogue (e.g. Incline Bench)..."
                  placeholderTextColor={colors.textTertiary}
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
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      setSelectedEntry(null);
                    }}
                    style={styles.clearBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={17} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Visual Anatomical Muscle Filter Bar */}
              <View style={styles.filterBarContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterChipsRow}
                >
                  {ANATOMICAL_MUSCLE_CHIPS.map(chip => {
                    const isActive = selectedMuscle === chip.id;
                    return (
                      <TouchableOpacity
                        key={chip.id}
                        style={[styles.filterChip, isActive && styles.filterChipActive]}
                        onPress={() => {
                          hapticLight();
                          setSelectedMuscle(prev => (prev === chip.id ? 'all' : chip.id));
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={chip.icon}
                          size={13}
                          color={isActive ? (isDark ? '#FFFFFF' : '#000000') : colors.textTertiary}
                        />
                        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                          {chip.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Database Notice Header */}
              <View style={styles.statusNotice}>
                <Text style={styles.statusNoticeText}>
                  {isDatabaseActive ? 'Exercises' : 'Popular Exercises'}
                </Text>
              </View>

              {/* Card Results List or 0-Results Instant Creation */}
              {results.length > 0 ? (
                <FlatList
                  data={results}
                  keyExtractor={(item, idx) => `${item.id || item.name}_${idx}`}
                  renderItem={renderExerciseCard}
                  contentContainerStyle={styles.cardList}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  initialNumToRender={10}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  removeClippedSubviews={Platform.OS === 'android'}
                  style={{ maxHeight: 460 }}
                />
              ) : (
                /* Instant "Create Custom Exercise" Card */
                <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
                  {autoResolvedForQuery && (
                    <View style={styles.createCustomCard}>
                      <View style={styles.createCustomHeader}>
                        <View style={styles.createCustomIconWrap}>
                          <Ionicons name="barbell-outline" size={24} color="#A599FF" />
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

                      <TouchableOpacity
                        style={styles.createCustomCtaBtn}
                        activeOpacity={0.8}
                        onPress={handleInstantCreateCustom}
                      >
                        <Ionicons name="add" size={18} color="#000" />
                        <Text style={styles.createCustomCtaText}>
                          Create "{autoResolvedForQuery.canonicalName}" Exercise
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.createCustomSecondaryLink}
                        onPress={() => {
                          setMuscle(autoResolvedForQuery.targetMuscle);
                          setShowCustomTuning(true);
                        }}
                      >
                        <Text style={styles.createCustomSecondaryText}>
                          Customize sets, reps & video link ⚙
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Empty state prompt */}
                  <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={24} color={colors.textTertiary} />
                    <Text style={styles.emptyStateText}>
                      Not in standard catalogue? Tap create above or configure custom details below.
                    </Text>
                  </View>
                </ScrollView>
              )}
            </>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default AddExerciseModal;
