import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { EXERCISE_DATABASE } from '../data/exerciseDatabase';
import { GYM_PLAN } from '../data/gymPlan';
import {
  getBiomechanicalPrescription,
  resolveExerciseTargetMuscle,
} from '../utils/gymUtils';
import type { ExerciseCatalogEntry } from '../types/gym.types';
export type { ExerciseCatalogEntry };

export const CUSTOM_EXERCISES_KEY = '@zentrack_custom_exercises';
export const LEGACY_CUSTOM_EXERCISES_KEY = '@zenfit_custom_exercises';

export const UNIFIED_MUSCLE_CHIPS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'Chest', label: 'Chest' },
  { id: 'Back', label: 'Back' },
  { id: 'Shoulders', label: 'Shoulders' },
  { id: 'Legs', label: 'Legs' },
  { id: 'Arms', label: 'Arms' },
  { id: 'Abs', label: 'Core & Abs' },
  { id: 'Cardio', label: 'Cardio' },
];

const STAPLE_NAMES = [
  'incline bench press (dumbbell)',
  'lat pulldown (cable)',
  'squat (barbell)',
  'lateral raise (cable)',
  'flat bench press (barbell)',
  'bench press (barbell)',
  'romanian deadlift (dumbbell)',
  'triceps pushdown (cable)',
  'incline bicep curl (dumbbell)',
  'seated cable row',
  'leg extension (machine)',
  'leg curl (seated machine)',
  'leg curl (lying machine)',
  'hamstring curl (seated machine)',
  'overhead press (barbell)',
  'shoulder press (dumbbell)',
  'cable chest fly',
  'face pull (cable)',
  'standing calf raise',
  'bulgarian split squat',
  'pull-up',
  'dips',
];

const TIER_SORT_WEIGHT: Record<string, number> = {
  'S Tier': 1,
  'A+ Tier': 2,
  'A Tier': 3,
  'B Tier': 4,
  'C Tier': 5,
};

export function sortCatalogTierWise(list: ExerciseCatalogEntry[]): ExerciseCatalogEntry[] {
  return [...list].sort((a, b) => {
    const wa = TIER_SORT_WEIGHT[a.tier || ''] || 99;
    const wb = TIER_SORT_WEIGHT[b.tier || ''] || 99;
    if (wa !== wb) return wa - wb;
    return a.name.localeCompare(b.name);
  });
}

export function checkCatalogCategoryMatch(muscleStr?: string, filterCat?: string | null): boolean {
  if (!filterCat || filterCat.toLowerCase() === 'all') return true;
  if (!muscleStr) return false;
  const l = muscleStr.toLowerCase();
  const cat = filterCat.toLowerCase();

  if (cat === 'cardio') {
    return (
      l.includes('cardio') ||
      l.includes('conditioning') ||
      l.includes('hiit') ||
      l.includes('sport') ||
      l.includes('plyometric') ||
      l.includes('mobility') ||
      l.includes('warmup') ||
      l.includes('olympic') ||
      l.includes('full body')
    );
  }
  if (cat === 'back') {
    if (l.includes('tricep') || l.includes('bicep') || l.includes('brach') || l.includes('delt')) {
      return false;
    }
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
  if (cat === 'abs' || cat === 'core') {
    return (
      l.includes('abs') ||
      l.includes('oblique') ||
      l.includes('core') ||
      l.includes('transverse') ||
      l.includes('vacuum')
    );
  }
  return l.includes(cat);
}

function buildUnifiedCatalogue(): ExerciseCatalogEntry[] {
  const existingByKey = new Map<string, ExerciseCatalogEntry>();
  const result: ExerciseCatalogEntry[] = [];

  const add = (e: ExerciseCatalogEntry, isCurated: boolean) => {
    const key = (e.name || '').toLowerCase().trim();
    if (!key) return;
    const existing = existingByKey.get(key);
    if (existing) {
      if (e.aliases && e.aliases.length > 0) {
        existing.aliases = Array.from(new Set([...(existing.aliases || []), ...e.aliases]));
      }
      return;
    }
    const entry: ExerciseCatalogEntry = { ...e, isCurated };
    existingByKey.set(key, entry);
    result.push(entry);
  };

  for (const dbEntry of EXERCISE_DATABASE) {
    const rx = getBiomechanicalPrescription(dbEntry.name, dbEntry.muscle);
    add(
      {
        id: dbEntry.id,
        name: dbEntry.name,
        muscle: dbEntry.muscle,
        tier: dbEntry.tier || 'A Tier',
        targetSets: rx.targetSets,
        targetReps: rx.targetReps,
        restTimeSecs: rx.restTimeSecs,
        videoId: (dbEntry as any).videoId || '',
        aliases: dbEntry.aliases,
      },
      true
    );
  }

  for (const day of GYM_PLAN) {
    for (const ex of day.exercises) {
      const rx = getBiomechanicalPrescription(ex.name, ex.muscle);
      add(
        {
          id: ex.id,
          name: ex.name,
          muscle: ex.muscle ?? 'Mixed',
          tier: (ex as any).tier || 'A Tier',
          targetSets: ex.targetSets ?? rx.targetSets,
          targetReps: ex.targetReps ?? rx.targetReps,
          restTimeSecs: (ex as any).restTimeSecs ?? rx.restTimeSecs,
          videoId: ex.videoId ?? '',
        },
        true
      );
    }
  }

  const stapleRankByKey = new Map<string, number>();
  for (let i = 0; i < result.length; i++) {
    const lower = result[i].name.toLowerCase();
    const rank = STAPLE_NAMES.findIndex((s) => lower.includes(s));
    if (rank !== -1) stapleRankByKey.set(result[i].id || lower, rank);
  }

  result.sort((a, b) => {
    const aIdx = stapleRankByKey.get(a.id || a.name.toLowerCase()) ?? -1;
    const bIdx = stapleRankByKey.get(b.id || b.name.toLowerCase()) ?? -1;
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  return result;
}

let _unifiedCatalogue: ExerciseCatalogEntry[] | null = null;
let _unifiedCategoryMap: Record<string, ExerciseCatalogEntry[]> | null = null;
let _customExercisesMutex: Promise<void> = Promise.resolve();

export function invalidateExerciseCatalogueCache(): void {
  _unifiedCategoryMap = null;
}

export async function loadMergedCustomExercises(): Promise<ExerciseCatalogEntry[]> {
  try {
    const [primaryRaw, legacyRaw] = await Promise.all([
      AsyncStorage.getItem(CUSTOM_EXERCISES_KEY),
      AsyncStorage.getItem(LEGACY_CUSTOM_EXERCISES_KEY),
    ]);
    const primary: ExerciseCatalogEntry[] = primaryRaw ? JSON.parse(primaryRaw) : [];
    const legacy: ExerciseCatalogEntry[] = legacyRaw ? JSON.parse(legacyRaw) : [];
    const mergedMap = new Map<string, ExerciseCatalogEntry>();

    for (const item of [...(Array.isArray(legacy) ? legacy : []), ...(Array.isArray(primary) ? primary : [])]) {
      if (!item?.name) continue;
      const key = item.name.toLowerCase().trim();
      const prev = mergedMap.get(key);
      mergedMap.set(key, {
        ...(prev || {}),
        ...item,
        muscle: item.muscle || resolveExerciseTargetMuscle(item.name).targetMuscle,
        videoId: item.videoId || prev?.videoId || '',
        isCurated: false,
      });
    }

    const merged = Array.from(mergedMap.values());
    const catalogue = getUnifiedExerciseCatalogue();
    const existingByKey = new Map<string, ExerciseCatalogEntry>();
    for (const e of catalogue) {
      existingByKey.set(e.name.toLowerCase().trim(), e);
      if (e.id) existingByKey.set(e.id, e);
    }

    for (const ex of merged) {
      const key = ex.name.toLowerCase().trim();
      const existing = existingByKey.get(key) || (ex.id ? existingByKey.get(ex.id) : undefined);
      if (!existing) {
        catalogue.unshift(ex);
        existingByKey.set(key, ex);
        if (ex.id) existingByKey.set(ex.id, ex);
      } else if (ex.videoId && !existing.videoId) {
        existing.videoId = ex.videoId;
      }
    }
    _unifiedCategoryMap = null;
    try {
      DeviceEventEmitter.emit('exercise_catalogue_updated');
    } catch (_) {}
    return merged;
  } catch {
    return [];
  }
}

export async function persistUnifiedCustomExercise(entry: ExerciseCatalogEntry): Promise<void> {
  _customExercisesMutex = _customExercisesMutex
    .then(async () => {
      try {
        const merged = await loadMergedCustomExercises();
        const key = entry.name.toLowerCase().trim();
        const idx = merged.findIndex(
          (e) => e.name.toLowerCase().trim() === key || (entry.id && e.id === entry.id)
        );
        if (idx >= 0) {
          merged[idx] = {
            ...merged[idx],
            ...entry,
            videoId: entry.videoId || merged[idx].videoId || '',
          };
        } else {
          merged.unshift(entry);
        }
        const serialized = JSON.stringify(merged);
        await AsyncStorage.setItem(CUSTOM_EXERCISES_KEY, serialized);

        const catalogue = getUnifiedExerciseCatalogue();
        const live = catalogue.find(
          (e) => e.name.toLowerCase().trim() === key || (entry.id && e.id === entry.id)
        );
        if (live) {
          if (entry.videoId) live.videoId = entry.videoId;
        } else {
          catalogue.unshift(entry);
        }
        _unifiedCategoryMap = null;
      } catch {}
    })
    .catch(() => {});
  return _customExercisesMutex;
}

export function getUnifiedExerciseCatalogue(): ExerciseCatalogEntry[] {
  if (!_unifiedCatalogue) {
    _unifiedCatalogue = buildUnifiedCatalogue();
    loadMergedCustomExercises().catch(() => {});
  }
  return _unifiedCatalogue;
}

export function getUnifiedCategoryMap(): Record<string, ExerciseCatalogEntry[]> {
  if (!_unifiedCategoryMap) {
    const cat = getUnifiedExerciseCatalogue();
    _unifiedCategoryMap = {
      Chest: sortCatalogTierWise(cat.filter((e) => checkCatalogCategoryMatch(e.muscle, 'Chest'))),
      Back: sortCatalogTierWise(cat.filter((e) => checkCatalogCategoryMatch(e.muscle, 'Back'))),
      Legs: sortCatalogTierWise(cat.filter((e) => checkCatalogCategoryMatch(e.muscle, 'Legs'))),
      Shoulders: sortCatalogTierWise(cat.filter((e) => checkCatalogCategoryMatch(e.muscle, 'Shoulders'))),
      Arms: sortCatalogTierWise(cat.filter((e) => checkCatalogCategoryMatch(e.muscle, 'Arms'))),
      Abs: sortCatalogTierWise(cat.filter((e) => checkCatalogCategoryMatch(e.muscle, 'Abs'))),
      Cardio: sortCatalogTierWise(cat.filter((e) => checkCatalogCategoryMatch(e.muscle, 'Cardio'))),
    };
  }
  return _unifiedCategoryMap;
}

export function warmUnifiedExerciseCatalogue(): void {
  try {
    getUnifiedExerciseCatalogue();
    getUnifiedCategoryMap();
  } catch {}
}
