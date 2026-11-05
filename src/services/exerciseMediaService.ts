/**
 * exerciseMediaService.ts — ZenTrack Mobile
 *
 * 1,324 Exercise Dataset & Offline Media Engine:
 * - Powered by the curated hasaneyldrm/exercises-dataset (MIT + GymVisual).
 * - Instant in-memory search and fuzzy matching with synonym expansion & stemming.
 * - Disk-caching engine using Expo FileSystem for 100% offline gym workouts.
 * - Auto pre-caching for scheduled weekly gym plans.
 */
import * as FileSystem from 'expo-file-system/legacy';
import rawExercises from '../data/exercises.json';
import { EXERCISE_GIF_MAP } from '../data/exerciseGifMap';
import { EXERCISE_DATABASE } from '../data/exerciseDatabase';

export interface ExerciseDefinition {
  id: string;
  name: string;
  category: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaryMuscles: string[];
  instruction?: string;
  instructionHi?: string;
  steps?: string[];
  image: string;
  gifUrl: string;
  mediaId: string;
}

const EXERCISES: ExerciseDefinition[] = rawExercises as ExerciseDefinition[];

// Fast normalized lookup maps
const EXERCISE_BY_ID = new Map<string, ExerciseDefinition>();
const EXERCISE_BY_NORM_NAME = new Map<string, ExerciseDefinition>();

const KNOWN_SYNONYMS: Record<string, string> = {
  // Routine Specific Aliases (100% Match Guarantees)
  'chest supported incline dumbbell row': 'dumbbell incline row',
  'chest-supported incline dumbbell row': 'dumbbell incline row',
  'chest supported row': 'dumbbell incline row',
  'chest-supported t-bar row': 'lever reverse t-bar row',
  'chest supported t-bar row': 'lever reverse t-bar row',
  't-bar row': 'lever reverse t-bar row',
  't bar row': 'lever reverse t-bar row',
  'pec deck fly': 'lever seated fly',
  'pec deck': 'lever seated fly',
  'reverse pec deck': 'lever seated reverse fly',
  'reverse pec deck back focus': 'lever seated reverse fly',
  'reverse pec deck (back focus)': 'lever seated reverse fly',
  'lat pulldowns standard': 'cable pulldown',
  'lat pulldowns (standard)': 'cable pulldown',
  'neutral-grip lat pulldowns': 'cable pulldown',
  'neutral grip lat pulldowns': 'cable pulldown',
  'neutral grip lat pulldown': 'cable pulldown',
  'lat pulldowns': 'cable pulldown',
  'lat pulldown': 'cable pulldown',
  'seated cable rows': 'cable seated row',
  'seated cable row': 'cable seated row',
  'cable lateral raises': 'cable lateral raise',
  'cable lateral raise': 'cable lateral raise',
  'machine overhead press': 'barbell seated overhead press',
  'ez-bar skullcrushers': 'barbell lying triceps extension skull crusher',
  'ez bar skullcrushers': 'barbell lying triceps extension skull crusher',
  'skullcrushers': 'barbell lying triceps extension skull crusher',
  'dual-rope tricep pushdowns': 'cable pushdown (with rope attachment)',
  'dual rope tricep pushdowns': 'cable pushdown (with rope attachment)',
  'rope tricep pushdowns': 'cable pushdown (with rope attachment)',
  'tricep pushdowns': 'cable pushdown',
  'tricep pushdown': 'cable pushdown',
  'standing ez-bar curls': 'ez barbell curl',
  'standing ez bar curls': 'ez barbell curl',
  'incline dumbbell curls': 'dumbbell incline biceps curl',
  'incline db curls': 'dumbbell incline biceps curl',
  'hack squats or leg press': 'sled hack squat',
  'hack squats': 'sled hack squat',
  'hack squat': 'sled hack squat',
  'leg extensions': 'lever leg extension',
  'leg extension': 'lever leg extension',
  'leg curls': 'lever seated leg curl',
  'leg curl': 'lever seated leg curl',
  'standing machine calf raises': 'standing calf raise',
  'standing calf raises': 'standing calf raise',
  'kneeling cable crunches': 'cable kneeling crunch',
  'hanging knee raises': 'hanging knee raise',
  'cable woodchoppers': 'cable standing up woodchop',
  'high-to-low cable crossovers': 'cable standing cross-over high reverse fly',
  'high to low cable crossovers': 'cable standing cross-over high reverse fly',
  'incline dumbbell press': 'dumbbell incline bench press',
  'incline db press': 'dumbbell incline bench press',
  'dumbbell incline press': 'dumbbell incline bench press',
  'flat dumbbell press': 'dumbbell bench press',
  'dumbbell bench press': 'dumbbell bench press',
  'barbell bench press': 'barbell bench press',
  'incline barbell bench press': 'barbell incline bench press',
  'incline barbell press': 'barbell incline bench press',
  'romanian deadlifts rdls': 'barbell romanian deadlift',
  'romanian deadlifts (rdls)': 'barbell romanian deadlift',
  'romanian deadlifts': 'barbell romanian deadlift',
  'romanian deadlift': 'barbell romanian deadlift',

  // Common Shorthands & Abbreviations
  rdl: 'romanian deadlift',
  rdls: 'romanian deadlift',
  ghr: 'glute ham raise',
  db: 'dumbbell',
  bb: 'barbell',
  ohp: 'overhead press',
  dips: 'dip',
  'pull ups': 'pull up',
  'chin ups': 'chin up',
  'skull crushers': 'barbell lying triceps extension skull crusher',
  pushdowns: 'pushdown',
  pulldowns: 'cable pulldown',
  deadlifts: 'deadlift',
  squats: 'squat',
  curls: 'curl',
  raises: 'raise',
  extensions: 'extension',
  presses: 'press',
  shrugs: 'shrug',
  crunches: 'crunch',
  twists: 'twist',
  rows: 'row',
  swings: 'swing',
  thrusts: 'glute bridge',
  bridges: 'bridge',
  flys: 'fly',
  flyes: 'fly',
  woodchopper: 'cable standing up woodchop',
  woodchoppers: 'cable standing up woodchop',
  woodchop: 'cable standing up woodchop',
  'plate pinch': 'farmers walk',
  'plate pinches': 'farmers walk',
  'pinch hold': 'farmers walk',
  'stomach vacuum': 'alternate heel touchers',
  'hammer strength': 'lever',
  preacher: 'preacher curl',
};

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function cleanString(str: string): string {
  let cleaned = str.toLowerCase();
  for (const [abbr, full] of Object.entries(KNOWN_SYNONYMS)) {
    const reg = new RegExp(`\\b${abbr}\\b`, 'gi');
    cleaned = cleaned.replace(reg, full);
  }
  return cleaned
    .replace(/[\(\)\/\,\-\–\—\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(str: string): string[] {
  return cleanString(str)
    .split(' ')
    .filter(t => t.length > 1)
    .map(t => t.replace(/(s|es|ing)$/, '')); // stem
}

const EXERCISE_TOKENS = new Map<string, string[]>();
const CANONICAL_ID_OR_NAME_TO_GIF = new Map<string, ExerciseDefinition>();

EXERCISES.forEach(ex => {
  EXERCISE_BY_ID.set(ex.id, ex);
  EXERCISE_BY_NORM_NAME.set(normalize(ex.name), ex);
  EXERCISE_TOKENS.set(ex.id, tokenize(ex.name));
});

// Seed canonical 1-to-1 verified map from EXERCISE_DATABASE
EXERCISE_DATABASE.forEach(curated => {
  const gifId = EXERCISE_GIF_MAP[curated.id];
  if (gifId && EXERCISE_BY_ID.has(gifId)) {
    const gifDef = EXERCISE_BY_ID.get(gifId)!;
    CANONICAL_ID_OR_NAME_TO_GIF.set(curated.id, gifDef);
    CANONICAL_ID_OR_NAME_TO_GIF.set(normalize(curated.id), gifDef);
    CANONICAL_ID_OR_NAME_TO_GIF.set(normalize(curated.name), gifDef);
    (curated.aliases || []).forEach(alias => {
      CANONICAL_ID_OR_NAME_TO_GIF.set(normalize(alias), gifDef);
    });
  }
});

// Seed custom gym routine nicknames
const SPECIAL_ROUTINE_NICKNAMES: Record<string, string> = {
  'cablefrontshoulderraises': '0162', // cable front raise
  'cableskullcrusher': '0061', // barbell skull crusher
  'cableskullcrushers': '0061',
  'egyptiancablelateralraises': '0192', // cable one arm lateral raise
  'crossbodytricepsextensioncable': '0241', // cable pushdown
  'lateralraisemachine': '0584', // lever lateral raise
  'chestflymachine': '0596', // lever seated fly
  'inclinechestpressmachine': '1299', // lever incline chest press
  'seatedshoulderpressmachine': '0603', // lever shoulder press
  'legpressmachine': '0740', // sled 45 degree leg press
  'hacksquatmachine': '0744', // sled hack squat
  'legextensionmachine': '0585', // lever leg extension
  'legcurlmachine': '0599', // lever seated leg curl
};

for (const [nickname, gifId] of Object.entries(SPECIAL_ROUTINE_NICKNAMES)) {
  if (EXERCISE_BY_ID.has(gifId)) {
    CANONICAL_ID_OR_NAME_TO_GIF.set(nickname, EXERCISE_BY_ID.get(gifId)!);
  }
}

// CDN Base URLs
// High-Efficiency 20 KB MP4 / WebP Clip and 5 KB WebP Still Base (openGym Edge distribution)
const OPEN_GYM_MEDIA_BASE = 'https://opengym.ch/demo/exercise-media';
// Primary & Fallback CDNs (jsDelivr & GitHub)
const CDN_PRIMARY_BASE = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main';
const CDN_FALLBACK_BASE = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main';
const CACHE_DIR = `${FileSystem.cacheDirectory || ''}exercise_gifs/`;

let isCacheDirEnsured = false;
async function ensureCacheDir() {
  if (isCacheDirEnsured || !FileSystem.cacheDirectory) return;
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
    isCacheDirEnsured = true;
  } catch (e) {
    console.warn('[ExerciseMediaService] Failed to create cache directory:', e);
  }
}

/**
 * Resolves full Exercise Definition from name or ID with advanced fuzzy matching,
 * synonym expansion, and token scoring.
 */
export function resolveExercise(nameOrId: string): ExerciseDefinition | null {
  if (!nameOrId) return null;
  const trimmed = nameOrId.trim();

  // 0. Direct Canonical Verified Map Match (100% Precision Guarantee)
  if (CANONICAL_ID_OR_NAME_TO_GIF.has(trimmed)) {
    return CANONICAL_ID_OR_NAME_TO_GIF.get(trimmed)!;
  }
  const norm = normalize(trimmed);
  if (CANONICAL_ID_OR_NAME_TO_GIF.has(norm)) {
    return CANONICAL_ID_OR_NAME_TO_GIF.get(norm)!;
  }

  // Handle truncated UI strings (e.g. "Egyptian Cable Lateral Raises (Behind...")
  let cleanedUiString = trimmed.replace(/\s*\([^)]*(\.{2,}|\u2026)?$/, '').trim();
  if (!cleanedUiString) cleanedUiString = trimmed.replace(/(\.{2,}|\u2026)/g, '').trim();
  if (cleanedUiString && cleanedUiString !== trimmed) {
    if (CANONICAL_ID_OR_NAME_TO_GIF.has(cleanedUiString)) {
      return CANONICAL_ID_OR_NAME_TO_GIF.get(cleanedUiString)!;
    }
    const cleanNorm = normalize(cleanedUiString);
    if (CANONICAL_ID_OR_NAME_TO_GIF.has(cleanNorm)) {
      return CANONICAL_ID_OR_NAME_TO_GIF.get(cleanNorm)!;
    }
  }

  // 1. Direct ID match
  if (EXERCISE_BY_ID.has(trimmed)) {
    return EXERCISE_BY_ID.get(trimmed)!;
  }

  // 2. Direct normalized match
  if (EXERCISE_BY_NORM_NAME.has(norm)) {
    return EXERCISE_BY_NORM_NAME.get(norm)!;
  }

  // 3. Known direct full-phrase synonym match
  const lowerTrimmed = trimmed.toLowerCase();
  for (const [key, target] of Object.entries(KNOWN_SYNONYMS)) {
    if (lowerTrimmed === key || normalize(lowerTrimmed) === normalize(key)) {
      const match = EXERCISE_BY_NORM_NAME.get(normalize(target));
      if (match) return match;
    }
  }

  // 4. Cleaned string normalized match (synonyms expanded)
  const cleaned = cleanString(trimmed);
  const cleanNorm = normalize(cleaned);
  if (EXERCISE_BY_NORM_NAME.has(cleanNorm)) {
    return EXERCISE_BY_NORM_NAME.get(cleanNorm)!;
  }

  // 5. Substring matching
  for (const ex of EXERCISES) {
    const exNorm = normalize(ex.name);
    if (exNorm.includes(cleanNorm) || cleanNorm.includes(exNorm)) {
      return ex;
    }
  }

  // 6. Token overlap scoring with stemming
  const queryTokens = tokenize(trimmed);
  let bestMatch: ExerciseDefinition | null = null;
  let bestScore = 0;

  for (const ex of EXERCISES) {
    const exTokens = EXERCISE_TOKENS.get(ex.id) || [];
    let score = 0;
    for (const qt of queryTokens) {
      for (const et of exTokens) {
        if (qt === et) {
          score += 3; // exact token match
        } else if (et.includes(qt) || qt.includes(et)) {
          score += 1.5; // partial token match
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = ex;
    }
  }

  if (bestScore >= 3 && bestMatch) {
    return bestMatch;
  }

  return null;
}

/**
 * Searches the 1,324 exercise dataset by query and optional bodyPart filter
 */
export function searchExercises(query: string, bodyPartFilter?: string, limit = 40): ExerciseDefinition[] {
  const normQuery = query.trim().toLowerCase();
  const normFilter = bodyPartFilter?.trim().toLowerCase();

  return EXERCISES.filter(ex => {
    if (normFilter && normFilter !== 'all' && ex.bodyPart.toLowerCase() !== normFilter && ex.category.toLowerCase() !== normFilter) {
      return false;
    }
    if (!normQuery) return true;
    return (
      ex.name.toLowerCase().includes(normQuery) ||
      ex.target.toLowerCase().includes(normQuery) ||
      ex.equipment.toLowerCase().includes(normQuery) ||
      (ex.secondaryMuscles && ex.secondaryMuscles.some(m => m.toLowerCase().includes(normQuery)))
    );
  }).slice(0, limit);
}

/**
 * Returns high-efficiency 5 KB WebP still poster URL (0ms visual preview)
 */
export function getExerciseStillPosterUrl(ex: ExerciseDefinition): string {
  if (!ex?.id) return '';
  return `${OPEN_GYM_MEDIA_BASE}/still/${ex.id}.webp`;
}

/**
 * Returns high-efficiency 20 KB MP4 video clip URL (60fps truecolor loop)
 */
export function getExerciseClipVideoUrl(ex: ExerciseDefinition): string {
  if (!ex?.id) return '';
  return `${OPEN_GYM_MEDIA_BASE}/clip/${ex.id}.mp4`;
}

/**
 * Returns remote CDN URL for an exercise's animation GIF (legacy fallback)
 */
export function getExerciseGifCdnUrl(ex: ExerciseDefinition, useFallback = false): string {
  if (!ex.gifUrl) return '';
  const base = useFallback ? CDN_FALLBACK_BASE : CDN_PRIMARY_BASE;
  if (ex.gifUrl.startsWith('http')) return ex.gifUrl;
  return `${base}/${ex.gifUrl}`;
}

/**
 * Returns remote CDN URL for an exercise's thumbnail image
 */
export function getExerciseThumbnailUrl(ex: ExerciseDefinition, useFallback = false): string {
  if (!ex.image) return '';
  const base = useFallback ? CDN_FALLBACK_BASE : CDN_PRIMARY_BASE;
  if (ex.image.startsWith('http')) return ex.image;
  return `${base}/${ex.image}`;
}

export interface ExerciseMediaResult {
  definition: ExerciseDefinition | null;
  /** High-efficiency 20 KB MP4 video loop URL or local disk URI */
  clipUri: string | null;
  /** Ultra-lightweight 5 KB WebP still poster URL or local disk URI for instant 0ms placeholder */
  stillUri: string | null;
  /** Legacy / fallback GIF URI */
  gifUri: string | null;
  /** Standard thumbnail image URI */
  imageUri: string | null;
  /** Primary recommended media type: 'video' (20KB MP4) | 'gif' (2MB GIF) | 'image' */
  mediaType: 'video' | 'gif' | 'image';
  /** Whether the media is available fully offline from local device storage */
  isOffline: boolean;
}

/**
 * Returns local file URI if cached on disk, otherwise remote CDN URL.
 * Automatically resolves both high-efficiency 20 KB MP4 video loops,
 * 5 KB instant WebP still posters, and legacy GIF fallbacks.
 */
export async function getExerciseMediaUri(nameOrId: string): Promise<ExerciseMediaResult> {
  const def = resolveExercise(nameOrId);
  if (!def) {
    return {
      definition: null,
      clipUri: null,
      stillUri: null,
      gifUri: null,
      imageUri: null,
      mediaType: 'image',
      isOffline: false,
    };
  }

  await ensureCacheDir();

  const highResClipUrl = getExerciseClipVideoUrl(def);
  const highResStillUrl = getExerciseStillPosterUrl(def);
  const fallbackGifUrl = getExerciseGifCdnUrl(def);
  const fallbackImgUrl = getExerciseThumbnailUrl(def);

  const localClipName = `${def.id}_clip.mp4`;
  const localClipPath = `${CACHE_DIR}${localClipName}`;

  const localStillName = `${def.id}_still.webp`;
  const localStillPath = `${CACHE_DIR}${localStillName}`;

  const localGifName = `${def.id}_${def.mediaId || 'anim'}.gif`;
  const localGifPath = `${CACHE_DIR}${localGifName}`;

  let hasLocalClip = false;
  let hasLocalStill = false;
  let hasLocalGif = false;

  try {
    if (FileSystem.cacheDirectory) {
      const clipInfo = await FileSystem.getInfoAsync(localClipPath);
      if (clipInfo.exists && clipInfo.size > 1000) {
        hasLocalClip = true;
      }
      const stillInfo = await FileSystem.getInfoAsync(localStillPath);
      if (stillInfo.exists && stillInfo.size > 500) {
        hasLocalStill = true;
      }
      const gifInfo = await FileSystem.getInfoAsync(localGifPath);
      if (gifInfo.exists && gifInfo.size > 1000) {
        hasLocalGif = true;
      }
    }
  } catch (e) {
    // Ignore and fallback to remote URLs
  }

  const finalClipUri = hasLocalClip ? localClipPath : highResClipUrl;
  const finalStillUri = hasLocalStill ? localStillPath : highResStillUrl;
  const finalGifUri = hasLocalGif ? localGifPath : fallbackGifUrl;
  const isOfflineAvailable = hasLocalClip || hasLocalGif;

  return {
    definition: def,
    clipUri: finalClipUri,
    stillUri: finalStillUri,
    gifUri: finalGifUri,
    imageUri: fallbackImgUrl,
    mediaType: finalClipUri ? 'video' : 'gif',
    isOffline: isOfflineAvailable,
  };
}

/**
 * Pre-caches an array of exercises to local disk storage for offline workouts.
 * Efficiently downloads 20 KB MP4 clips and 5 KB WebP still posters (~25 KB total
 * per exercise instead of 3.5 MB per exercise!).
 */
export async function preCacheExercises(exerciseNames: string[]): Promise<number> {
  await ensureCacheDir();
  let cachedCount = 0;

  for (const name of exerciseNames) {
    const def = resolveExercise(name);
    if (!def) continue;

    const localClipPath = `${CACHE_DIR}${def.id}_clip.mp4`;
    const localStillPath = `${CACHE_DIR}${def.id}_still.webp`;

    try {
      if (FileSystem.cacheDirectory) {
        const clipInfo = await FileSystem.getInfoAsync(localClipPath);
        if (!clipInfo.exists || clipInfo.size < 1000) {
          const clipUrl = getExerciseClipVideoUrl(def);
          const res = await FileSystem.downloadAsync(clipUrl, localClipPath);
          if (!res || res.status < 200 || res.status >= 300) {
            await FileSystem.deleteAsync(localClipPath, { idempotent: true });
          } else {
            cachedCount++;
          }
        }

        const stillInfo = await FileSystem.getInfoAsync(localStillPath);
        if (!stillInfo.exists || stillInfo.size < 500) {
          const stillUrl = getExerciseStillPosterUrl(def);
          const res = await FileSystem.downloadAsync(stillUrl, localStillPath);
          if (!res || res.status < 200 || res.status >= 300) {
            await FileSystem.deleteAsync(localStillPath, { idempotent: true });
          }
        }
      }
    } catch (e) {
      console.warn(`[ExerciseMediaService] Failed to pre-cache ${def.name}:`, e);
    }
  }

  return cachedCount;
}

/**
 * Clears all cached exercise media from disk
 */
export async function clearExerciseMediaCache(): Promise<void> {
  try {
    if (FileSystem.cacheDirectory) {
      const info = await FileSystem.getInfoAsync(CACHE_DIR);
      if (info.exists) {
        await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
        isCacheDirEnsured = false;
      }
    }
  } catch (e) {
    console.warn('[ExerciseMediaService] Failed to clear media cache:', e);
  }
}
