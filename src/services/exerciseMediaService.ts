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
import { getWorkoutActiveGlobal } from '../contexts/domains/WellnessContext';

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

// Lazy-initialized lookup maps (built on first resolveExercise/searchExercises call, zero cold-boot stall)
let EXERCISE_BY_ID: Map<string, ExerciseDefinition> | null = null;
let EXERCISE_BY_NORM_NAME: Map<string, ExerciseDefinition> | null = null;
let CANONICAL_ID_OR_NAME_TO_GIF: Map<string, ExerciseDefinition> | null = null;
let NORM_SYNONYM_MAP: Map<string, string> | null = null;
let EXERCISES_WITH_NORM: Array<{ ex: ExerciseDefinition; normName: string }> | null = null;
let EXERCISE_TOKENS: Map<string, string[]> | null = null;
let ESCAPED_SYNONYM_ENTRIES: Array<{ regex: RegExp; full: string }> | null = null;
let SEARCH_CORPUS: Array<{
  ex: ExerciseDefinition;
  lowerName: string;
  lowerTarget: string;
  lowerEquip: string;
  lowerBodyPart: string;
  lowerCategory: string;
  lowerSecondary: string[];
}> | null = null;

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

function getEscapedSynonymEntries() {
  if (!ESCAPED_SYNONYM_ENTRIES) {
    ESCAPED_SYNONYM_ENTRIES = Object.entries(KNOWN_SYNONYMS)
      .sort((a, b) => b[0].length - a[0].length)
      .map(([abbr, full]) => ({
        regex: new RegExp(`(?<=^|[\\s\\(\\/\\,\\-\\–\\—\\.])${abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[\\s\\)\\/\\,\\-\\–\\—\\.])`, 'gi'),
        full,
      }));
  }
  return ESCAPED_SYNONYM_ENTRIES;
}

function cleanString(str: string): string {
  let cleaned = str.toLowerCase();
  const entries = getEscapedSynonymEntries();
  for (let i = 0; i < entries.length; i++) {
    const { regex, full } = entries[i];
    cleaned = cleaned.replace(regex, full);
  }
  return cleaned
    .replace(/[\(\)\/\,\-\–\—\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stemToken(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('es') && !word.endsWith('ses') && !word.endsWith('zes') && !word.endsWith('ches') && !word.endsWith('shes')) {
    return word.slice(0, -1); // "raises" -> "raise", "lunges" -> "lunge"
  }
  if (word.endsWith('sses')) return word.slice(0, -2); // "presses" -> "press"
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1); // "curls" -> "curl", keeps "press" intact
  return word;
}

function tokenize(str: string): string[] {
  return cleanString(str)
    .split(' ')
    .filter(t => t.length > 1)
    .map(stemToken);
}

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

function ensureLookupIndexes(): void {
  if (EXERCISE_BY_ID && EXERCISE_BY_NORM_NAME && CANONICAL_ID_OR_NAME_TO_GIF && NORM_SYNONYM_MAP) return;

  const byId = new Map<string, ExerciseDefinition>();
  const byNorm = new Map<string, ExerciseDefinition>();
  for (let i = 0; i < EXERCISES.length; i++) {
    const ex = EXERCISES[i];
    byId.set(ex.id, ex);
    byNorm.set(normalize(ex.name), ex);
  }

  const canonical = new Map<string, ExerciseDefinition>();
  for (let i = 0; i < EXERCISE_DATABASE.length; i++) {
    const curated = EXERCISE_DATABASE[i];
    const gifId = EXERCISE_GIF_MAP[curated.id];
    if (gifId && byId.has(gifId)) {
      const gifDef = byId.get(gifId)!;
      canonical.set(curated.id, gifDef);
      canonical.set(normalize(curated.id), gifDef);
      canonical.set(normalize(curated.name), gifDef);
      const aliases = curated.aliases;
      if (aliases) {
        for (let j = 0; j < aliases.length; j++) {
          canonical.set(normalize(aliases[j]), gifDef);
        }
      }
    }
  }

  for (const [nickname, gifId] of Object.entries(SPECIAL_ROUTINE_NICKNAMES)) {
    const def = byId.get(gifId);
    if (def) canonical.set(nickname, def);
  }

  const normSyn = new Map<string, string>();
  for (const [k, v] of Object.entries(KNOWN_SYNONYMS)) {
    normSyn.set(normalize(k), normalize(v));
  }

  EXERCISE_BY_ID = byId;
  EXERCISE_BY_NORM_NAME = byNorm;
  CANONICAL_ID_OR_NAME_TO_GIF = canonical;
  NORM_SYNONYM_MAP = normSyn;
}

function getExercisesWithNorm() {
  if (!EXERCISES_WITH_NORM) {
    EXERCISES_WITH_NORM = EXERCISES.map(ex => ({ ex, normName: normalize(ex.name) }));
  }
  return EXERCISES_WITH_NORM;
}

function getExerciseTokensMap(): Map<string, string[]> {
  if (!EXERCISE_TOKENS) {
    const tokensMap = new Map<string, string[]>();
    for (let i = 0; i < EXERCISES.length; i++) {
      const ex = EXERCISES[i];
      tokensMap.set(ex.id, tokenize(ex.name));
    }
    EXERCISE_TOKENS = tokensMap;
  }
  return EXERCISE_TOKENS;
}

function getSearchCorpus() {
  if (!SEARCH_CORPUS) {
    SEARCH_CORPUS = EXERCISES.map(ex => ({
      ex,
      lowerName: (ex.name || '').toLowerCase(),
      lowerTarget: (ex.target || '').toLowerCase(),
      lowerEquip: (ex.equipment || '').toLowerCase(),
      lowerBodyPart: (ex.bodyPart || '').toLowerCase(),
      lowerCategory: (ex.category || '').toLowerCase(),
      lowerSecondary: (ex.secondaryMuscles || []).map(m => m.toLowerCase()),
    }));
  }
  return SEARCH_CORPUS;
}

// CDN Base URLs
// High-Efficiency 20 KB MP4 / WebP Clip and 5 KB WebP Still Base (openGym Edge distribution)
const OPEN_GYM_MEDIA_BASE = 'https://opengym.ch/demo/exercise-media';
// Primary & Fallback CDNs (jsDelivr & GitHub)
const CDN_PRIMARY_BASE = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main';
const CDN_FALLBACK_BASE = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main';
const CACHE_DIR = `${FileSystem.cacheDirectory || ''}exercise_gifs/`;
let isCacheDirEnsured = false;

const MAX_CACHE_BYTES = 50 * 1024 * 1024; // 50 MB ceiling
const IN_FLIGHT_DOWNLOADS = new Map<string, Promise<boolean>>();
const VERIFIED_CACHED_PATHS = new Set<string>();
const FAILED_MEDIA_URLS = new Map<string, number>(); // url -> retryAfterEpochMs
const MEDIA_NOT_FOUND_TTL_MS = 60 * 60 * 1000; // 1h for 404/410
const MEDIA_TRANSIENT_FAIL_TTL_MS = 10 * 60 * 1000; // 10m for network/size errors
const MAX_FAILED_URLS = 2000;

function isMediaUrlFailed(url: string): boolean {
  if (!url) return false;
  const retryAt = FAILED_MEDIA_URLS.get(url);
  if (retryAt === undefined) return false;
  if (Date.now() < retryAt) return true;
  FAILED_MEDIA_URLS.delete(url);
  return false;
}

function markMediaUrlFailed(url: string, ttlMs: number): void {
  if (!url) return;
  if (FAILED_MEDIA_URLS.size >= MAX_FAILED_URLS && !FAILED_MEDIA_URLS.has(url)) {
    const oldest = FAILED_MEDIA_URLS.keys().next().value;
    if (oldest) FAILED_MEDIA_URLS.delete(oldest);
  }
  FAILED_MEDIA_URLS.set(url, Date.now() + ttlMs);
}

export async function enforceMediaCacheQuota(): Promise<void> {
  if (!FileSystem.cacheDirectory) return;
  await ensureCacheDir();
  const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
  const stats = await Promise.all(
    files.map(async (f) => {
      const uri = `${CACHE_DIR}${f}`;
      const info = await FileSystem.getInfoAsync(uri);
      return { uri, size: info.exists ? info.size || 0 : 0, mtime: info.exists ? (info as any).modificationTime || 0 : 0 };
    })
  );
  let totalBytes = stats.reduce((acc, s) => acc + s.size, 0);
  if (totalBytes <= MAX_CACHE_BYTES) return;

  stats.sort((a, b) => a.mtime - b.mtime); // Oldest first
  for (const file of stats) {
    if (totalBytes <= MAX_CACHE_BYTES * 0.8) break;
    await FileSystem.deleteAsync(file.uri, { idempotent: true }).catch(() => {});
    VERIFIED_CACHED_PATHS.delete(file.uri);
    totalBytes -= file.size;
  }
}

export async function atomicDownloadFile(url: string, finalPath: string, minBytes: number): Promise<boolean> {
  if (!url || !finalPath) return false;
  if (VERIFIED_CACHED_PATHS.has(finalPath)) return true;
  if (isMediaUrlFailed(url)) return false;
  if (IN_FLIGHT_DOWNLOADS.has(finalPath)) {
    return IN_FLIGHT_DOWNLOADS.get(finalPath)!;
  }
  const promise = (async () => {
    const tmpPath = `${finalPath}.${Date.now()}.tmp`;
    try {
      const existingInfo = await FileSystem.getInfoAsync(finalPath);
      if (existingInfo.exists && (existingInfo.size ?? 0) >= minBytes) {
        VERIFIED_CACHED_PATHS.add(finalPath);
        return true;
      }

      const res = await FileSystem.downloadAsync(url, tmpPath);
      if (!res || res.status < 200 || res.status >= 300) {
        await FileSystem.deleteAsync(tmpPath, { idempotent: true });
        const ttl = res && (res.status === 404 || res.status === 410)
          ? MEDIA_NOT_FOUND_TTL_MS
          : MEDIA_TRANSIENT_FAIL_TTL_MS;
        markMediaUrlFailed(url, ttl);
        return false;
      }
      const info = await FileSystem.getInfoAsync(tmpPath);
      if (!info.exists || (info.size ?? 0) < minBytes) {
        await FileSystem.deleteAsync(tmpPath, { idempotent: true });
        markMediaUrlFailed(url, MEDIA_TRANSIENT_FAIL_TTL_MS);
        return false;
      }
      await FileSystem.moveAsync({ from: tmpPath, to: finalPath });
      VERIFIED_CACHED_PATHS.add(finalPath);
      FAILED_MEDIA_URLS.delete(url);
      return true;
    } catch {
      await FileSystem.deleteAsync(tmpPath, { idempotent: true }).catch(() => {});
      markMediaUrlFailed(url, MEDIA_TRANSIENT_FAIL_TTL_MS);
      return false;
    } finally {
      IN_FLIGHT_DOWNLOADS.delete(finalPath);
    }
  })();
  IN_FLIGHT_DOWNLOADS.set(finalPath, promise);
  return promise;
}

const MAX_RESOLVED_MEMO = 1000;
const RESOLVED_MEMO_CACHE = new Map<string, ExerciseDefinition | null>();

function getResolvedMemo(key: string): ExerciseDefinition | null | undefined {
  if (!RESOLVED_MEMO_CACHE.has(key)) return undefined;
  const val = RESOLVED_MEMO_CACHE.get(key) ?? null;
  // Refresh LRU order
  RESOLVED_MEMO_CACHE.delete(key);
  RESOLVED_MEMO_CACHE.set(key, val);
  return val;
}

function setResolvedMemo(key: string, val: ExerciseDefinition | null): void {
  if (RESOLVED_MEMO_CACHE.has(key)) {
    RESOLVED_MEMO_CACHE.delete(key);
  } else if (RESOLVED_MEMO_CACHE.size >= MAX_RESOLVED_MEMO) {
    const oldest = RESOLVED_MEMO_CACHE.keys().next().value;
    if (oldest !== undefined) RESOLVED_MEMO_CACHE.delete(oldest);
  }
  RESOLVED_MEMO_CACHE.set(key, val);
}

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
  if (!trimmed) return null;

  const memoHit = getResolvedMemo(trimmed);
  if (memoHit !== undefined) {
    return memoHit;
  }

  ensureLookupIndexes();
  const canonicalMap = CANONICAL_ID_OR_NAME_TO_GIF!;
  const byId = EXERCISE_BY_ID!;
  const byNorm = EXERCISE_BY_NORM_NAME!;
  const normSynMap = NORM_SYNONYM_MAP!;

  // 0. Direct Canonical Verified Map Match (100% Precision Guarantee)
  if (canonicalMap.has(trimmed)) {
    const res = canonicalMap.get(trimmed)!;
    setResolvedMemo(trimmed, res);
    return res;
  }
  const norm = normalize(trimmed);
  if (canonicalMap.has(norm)) {
    const res = canonicalMap.get(norm)!;
    setResolvedMemo(trimmed, res);
    return res;
  }

  // Handle truncated UI strings (e.g. "Egyptian Cable Lateral Raises (Behind...")
  let cleanedUiString = trimmed.replace(/\s*\([^)]*(\.{2,}|\u2026)?$/, '').trim();
  if (!cleanedUiString) cleanedUiString = trimmed.replace(/(\.{2,}|\u2026)/g, '').trim();
  if (cleanedUiString && cleanedUiString !== trimmed) {
    if (canonicalMap.has(cleanedUiString)) {
      const res = canonicalMap.get(cleanedUiString)!;
      setResolvedMemo(trimmed, res);
      return res;
    }
    const cleanUiNorm = normalize(cleanedUiString);
    if (canonicalMap.has(cleanUiNorm)) {
      const res = canonicalMap.get(cleanUiNorm)!;
      setResolvedMemo(trimmed, res);
      return res;
    }
  }

  // 1. Direct ID match
  if (byId.has(trimmed)) {
    const res = byId.get(trimmed)!;
    setResolvedMemo(trimmed, res);
    return res;
  }

  // 2. Direct normalized match
  if (byNorm.has(norm)) {
    const res = byNorm.get(norm)!;
    setResolvedMemo(trimmed, res);
    return res;
  }

  // 3. Known direct full-phrase synonym match via O(1) map
  const synTarget = normSynMap.get(norm);
  if (synTarget && byNorm.has(synTarget)) {
    const res = byNorm.get(synTarget)!;
    setResolvedMemo(trimmed, res);
    return res;
  }

  // 4. Cleaned string normalized match (synonyms expanded lazily)
  const cleaned = cleanString(trimmed);
  const cleanNorm = normalize(cleaned);
  if (byNorm.has(cleanNorm)) {
    const res = byNorm.get(cleanNorm)!;
    setResolvedMemo(trimmed, res);
    return res;
  }

  // 5. Substring matching via lazily-computed EXERCISES_WITH_NORM with ratio ranking
  const withNorm = getExercisesWithNorm();
  let bestSubstringEx: ExerciseDefinition | null = null;
  let bestSubstringRatio = 0;
  for (let i = 0; i < withNorm.length; i++) {
    const { ex, normName: exNorm } = withNorm[i];
    if (exNorm.includes(cleanNorm) || cleanNorm.includes(exNorm)) {
      const ratio = Math.min(exNorm.length, cleanNorm.length) / Math.max(exNorm.length, cleanNorm.length);
      if (ratio > bestSubstringRatio) {
        bestSubstringRatio = ratio;
        bestSubstringEx = ex;
      }
    }
  }
  if (bestSubstringEx && bestSubstringRatio >= 0.75) {
    setResolvedMemo(trimmed, bestSubstringEx);
    return bestSubstringEx;
  }

  // 6. Token overlap scoring with stemming & length normalization (lazily builds token index)
  const queryTokens = tokenize(trimmed);
  const exerciseTokensMap = getExerciseTokensMap();
  let bestMatch: ExerciseDefinition | null = null;
  let bestScore = 0;

  for (const ex of EXERCISES) {
    const exTokens = exerciseTokensMap.get(ex.id) || [];
    if (exTokens.length === 0) continue;
    let rawScore = 0;
    for (const qt of queryTokens) {
      let bestTokenScore = 0;
      for (const et of exTokens) {
        if (qt === et) {
          bestTokenScore = Math.max(bestTokenScore, 3);
        } else if (et.includes(qt) || qt.includes(et)) {
          bestTokenScore = Math.max(bestTokenScore, 1.5);
        }
      }
      rawScore += bestTokenScore;
    }
    const normalizedScore = rawScore / Math.pow(exTokens.length, 0.25);
    if (normalizedScore > bestScore && rawScore >= 3) {
      bestScore = normalizedScore;
      bestMatch = ex;
    }
  }

  const finalMatch = (bestScore > 0 && bestMatch) ? bestMatch : null;
  setResolvedMemo(trimmed, finalMatch);
  return finalMatch;
}

/**
 * Searches the 1,324 exercise dataset by query and optional bodyPart filter
 */
export function searchExercises(query: string, bodyPartFilter?: string, limit = 40): ExerciseDefinition[] {
  const normQuery = query.trim().toLowerCase();
  const expandedQuery = normQuery ? cleanString(normQuery) : '';
  const normFilter = bodyPartFilter?.trim().toLowerCase();
  const corpus = getSearchCorpus();

  const matches: ExerciseDefinition[] = [];
  for (let i = 0; i < corpus.length; i++) {
    const item = corpus[i];
    if (normFilter && normFilter !== 'all' && item.lowerBodyPart !== normFilter && item.lowerCategory !== normFilter) {
      continue;
    }
    if (!normQuery) {
      matches.push(item.ex);
      if (matches.length >= limit) break;
      continue;
    }
    if (
      item.lowerName.includes(normQuery) ||
      (expandedQuery && item.lowerName.includes(expandedQuery)) ||
      item.lowerTarget.includes(normQuery) ||
      item.lowerEquip.includes(normQuery) ||
      item.lowerSecondary.some(m => m.includes(normQuery))
    ) {
      matches.push(item.ex);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}

const FAILED_CLIP_IDS = new Set<string>();

export function markExerciseClipFailed(exerciseId: string): void {
  if (exerciseId) {
    FAILED_CLIP_IDS.add(exerciseId);
  }
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

  const highResStillUrl = getExerciseStillPosterUrl(def);
  const highResClipCandidate = getExerciseClipVideoUrl(def);
  const isClipFailed = FAILED_CLIP_IDS.has(def.id) || isMediaUrlFailed(highResClipCandidate);
  const highResClipUrl = isClipFailed ? '' : highResClipCandidate;
  const fallbackGifUrl = getExerciseGifCdnUrl(def, isClipFailed);
  const fallbackImgUrl = getExerciseThumbnailUrl(def, isClipFailed);

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
      if (!isClipFailed) {
        if (VERIFIED_CACHED_PATHS.has(localClipPath)) {
          hasLocalClip = true;
        } else {
          const clipInfo = await FileSystem.getInfoAsync(localClipPath);
          if (clipInfo.exists && clipInfo.size > 1000) {
            hasLocalClip = true;
            VERIFIED_CACHED_PATHS.add(localClipPath);
          }
        }
      }
      if (VERIFIED_CACHED_PATHS.has(localStillPath)) {
        hasLocalStill = true;
      } else {
        const stillInfo = await FileSystem.getInfoAsync(localStillPath);
        if (stillInfo.exists && stillInfo.size > 500) {
          hasLocalStill = true;
          VERIFIED_CACHED_PATHS.add(localStillPath);
        }
      }
      if (VERIFIED_CACHED_PATHS.has(localGifPath)) {
        hasLocalGif = true;
      } else {
        const gifInfo = await FileSystem.getInfoAsync(localGifPath);
        if (gifInfo.exists && gifInfo.size > 1000) {
          hasLocalGif = true;
          VERIFIED_CACHED_PATHS.add(localGifPath);
        }
      }

      // Non-blocking opportunistic background caching via atomic temporary files
      if (!hasLocalClip && highResClipUrl && !isClipFailed) {
        atomicDownloadFile(highResClipUrl, localClipPath, 1000).catch(() => {});
      }
      if (!hasLocalStill && highResStillUrl && !isMediaUrlFailed(highResStillUrl)) {
        atomicDownloadFile(highResStillUrl, localStillPath, 500).catch(() => {});
      }
    }
  } catch (e) {
    // Ignore and fallback to remote URLs
  }

  const finalClipUri = (!isClipFailed && (hasLocalClip ? localClipPath : highResClipUrl)) || null;
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

let abortPreCacheFlag = false;

/**
 * Pre-caches an array of exercises to local disk storage for offline workouts.
 * Efficiently downloads 20 KB MP4 clips and 5 KB WebP still posters (~25 KB total
 * per exercise instead of 3.5 MB per exercise!). Aborts immediately if workout starts.
 */
export async function preCacheExercises(exerciseNames: string[]): Promise<number> {
  if (abortPreCacheFlag || getWorkoutActiveGlobal()) return 0;
  await ensureCacheDir();

  const results = await Promise.all(
    exerciseNames.map(async (name) => {
      if (abortPreCacheFlag || getWorkoutActiveGlobal()) return 0;
      const def = resolveExercise(name);
      if (!def || !FileSystem.cacheDirectory) return 0;

      const localClipPath = `${CACHE_DIR}${def.id}_clip.mp4`;
      const localStillPath = `${CACHE_DIR}${def.id}_still.webp`;
      const clipUrl = getExerciseClipVideoUrl(def);
      const stillUrl = getExerciseStillPosterUrl(def);

      const [clipOk] = await Promise.all([
        atomicDownloadFile(clipUrl, localClipPath, 1000),
        atomicDownloadFile(stillUrl, localStillPath, 500),
      ]);
      return clipOk ? 1 : 0;
    })
  );

  return results.reduce((sum, count) => sum + count, 0);
}

/**
 * Progressively pre-caches the entire curated exercise database (all 525 exercises)
 * into local FileSystem cache in low-priority background batches.
 * Total size is only ~9 MB, enabling 100% offline 60 FPS video loops and zero buffering.
 */
let isAllCuratedCachingInProgress = false;

export async function preCacheAllCuratedExercises(onProgress?: (done: number, total: number) => void): Promise<number> {
  if (isAllCuratedCachingInProgress || getWorkoutActiveGlobal()) return 0;
  isAllCuratedCachingInProgress = true;
  abortPreCacheFlag = false;
  await ensureCacheDir();

  const allNames = EXERCISE_DATABASE.map(e => e.name);
  let totalCached = 0;

  // Process in small batches of 4 with breathing intervals to protect UI 60 FPS
  const BATCH_SIZE = 4;
  for (let i = 0; i < allNames.length; i += BATCH_SIZE) {
    if (abortPreCacheFlag || getWorkoutActiveGlobal()) {
      isAllCuratedCachingInProgress = false;
      return totalCached;
    }
    await ensureCacheDir();
    const chunk = allNames.slice(i, i + BATCH_SIZE);
    const count = await preCacheExercises(chunk);
    totalCached += count;
    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, allNames.length), allNames.length);
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  isAllCuratedCachingInProgress = false;
  enforceMediaCacheQuota().catch(() => {});
  return totalCached;
}

/**
 * Clears all cached exercise media from disk
 */
export async function clearExerciseMediaCache(): Promise<void> {
  abortPreCacheFlag = true;
  VERIFIED_CACHED_PATHS.clear();
  FAILED_MEDIA_URLS.clear();
  FAILED_CLIP_IDS.clear();
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
