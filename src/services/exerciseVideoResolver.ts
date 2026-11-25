import NetInfo from '@react-native-community/netinfo';
/**
 * exerciseVideoResolver.ts — ZenTrack Mobile
 * S.A.R.A AI Auto-Video Form Finder & YouTube Resolver.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { callProxy } from './geminiProxy';
import { KNOWN_EXERCISE_VIDEOS, sanitizeName } from './exerciseVideoDatabase';

const VIDEO_CACHE_PREFIX = '@zentrack_video_id_';

let _videoIndexesInitialized = false;
const NORMALIZED_VIDEO_MAP = new Map<string, string>();
const SORTED_NORMALIZED_VIDEO_KEYS: string[] = [];

function ensureVideoIndexes(): void {
  if (_videoIndexesInitialized) return;
  _videoIndexesInitialized = true;
  for (const [rawKey, videoId] of Object.entries(KNOWN_EXERCISE_VIDEOS)) {
    const normKey = sanitizeName(rawKey);
    NORMALIZED_VIDEO_MAP.set(normKey, videoId);
    SORTED_NORMALIZED_VIDEO_KEYS.push(normKey);
  }
  SORTED_NORMALIZED_VIDEO_KEYS.sort((a, b) => b.length - a.length);
}

const SINGLE_VIDEO_CACHE_KEY = '@zentrack_video_id_cache_v1';
let _videoCacheMap: Record<string, { videoId: string; expiresAt?: number }> | null = null;

async function getVideoCacheMap(): Promise<Record<string, { videoId: string; expiresAt?: number }>> {
  if (_videoCacheMap !== null) return _videoCacheMap;
  try {
    const raw = await AsyncStorage.getItem(SINGLE_VIDEO_CACHE_KEY);
    _videoCacheMap = raw ? JSON.parse(raw) : {};
  } catch {
    _videoCacheMap = {};
  }
  return _videoCacheMap!;
}

async function setVideoInCacheMap(key: string, videoId: string, ttlMs = 7 * 86400000): Promise<void> {
  const map = await getVideoCacheMap();
  map[key] = { videoId, expiresAt: Date.now() + ttlMs };
  try {
    await AsyncStorage.setItem(SINGLE_VIDEO_CACHE_KEY, JSON.stringify(map));
  } catch (_) {}
}

export async function clearVideoResolverCache(): Promise<void> {
  _videoCacheMap = {};
  try {
    await AsyncStorage.removeItem(SINGLE_VIDEO_CACHE_KEY);
  } catch (_) {}
}

async function isValidYoutubeVideoId(videoId: string): Promise<boolean> {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return false;
  try {
    const resp = await fetch(`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`, { method: 'HEAD' });
    return resp.ok;
  } catch {
    return false;
  }
}

const MODIFIER_GUARDS = ['reverse', 'rear', 'incline', 'decline', 'seated', 'standing', 'lying', 'single', 'cable', 'barbell', 'dumbbell'];

const IN_FLIGHT_VIDEO_RESOLVES = new Map<string, Promise<string | null>>();

export function autoResolveExerciseVideoId(exerciseName: string, forceRefresh = false): Promise<string | null> {
  const key = `${sanitizeName(exerciseName || '')}_${forceRefresh}`;
  if (IN_FLIGHT_VIDEO_RESOLVES.has(key)) return IN_FLIGHT_VIDEO_RESOLVES.get(key)!;
  const p = _autoResolveImpl(exerciseName, forceRefresh).finally(() => {
    IN_FLIGHT_VIDEO_RESOLVES.delete(key);
  });
  IN_FLIGHT_VIDEO_RESOLVES.set(key, p);
  return p;
}

async function _autoResolveImpl(exerciseName: string, forceRefresh = false): Promise<string | null> {
  ensureVideoIndexes();
  if (!exerciseName || !exerciseName.trim()) return null;

  const sanitized = sanitizeName(exerciseName);
  const legacyCacheKey = `${VIDEO_CACHE_PREFIX}${sanitized}`;

  let isRateLimited = false;

  if (forceRefresh) {
    try {
      const map = await getVideoCacheMap();
      if (map[sanitized]) {
        delete map[sanitized];
        await AsyncStorage.setItem(SINGLE_VIDEO_CACHE_KEY, JSON.stringify(map));
      }
      await AsyncStorage.removeItem(legacyCacheKey);
    } catch (_) {}
  } else {
    // 1. Direct exact match in normalized dictionary (400+ Exercises)
    if (NORMALIZED_VIDEO_MAP.has(sanitized)) {
      return NORMALIZED_VIDEO_MAP.get(sanitized)!;
    }

    // 2. Smart Modifier-Aware Partial Match via pre-sorted keys
    const keyMatch = SORTED_NORMALIZED_VIDEO_KEYS.find(k => {
      const hasModifierMismatch = MODIFIER_GUARDS.some(
        mod => sanitized.includes(mod) !== k.includes(mod)
      );
      if (hasModifierMismatch) return false;

      return sanitized.includes(k) || k.includes(sanitized);
    });

    if (keyMatch && NORMALIZED_VIDEO_MAP.has(keyMatch)) {
      return NORMALIZED_VIDEO_MAP.get(keyMatch)!;
    }

    // 3. Unified Video Cache Map (plus one-time legacy key read)
    try {
      const cacheMap = await getVideoCacheMap();
      const entry = cacheMap[sanitized];
      if (entry) {
        if (!entry.expiresAt || entry.expiresAt > Date.now()) {
          return entry.videoId && entry.videoId !== 'NONE' ? entry.videoId : null;
        }
      }
      const legacyCached = await AsyncStorage.getItem(legacyCacheKey);
      if (legacyCached) {
        if (legacyCached !== 'NONE') {
          await setVideoInCacheMap(sanitized, legacyCached);
        }
        AsyncStorage.removeItem(legacyCacheKey).catch(() => {});
        if (legacyCached !== 'NONE') return legacyCached;
      }
    } catch (_) { /* ignore */ }
  }

  // Offline fast-bail before attempting live AI web search
  try {
    const net = await NetInfo.fetch();
    if (net.isConnected === false || net.isInternetReachable === false) {
      return null;
    }
  } catch (_) {}

  // 4. S.A.R.A AI Live Search Resolution — Queries YouTube live for a fresh video
  try {
    const prompt = `Target Exercise: "${exerciseName}".
STRICT CONSTRAINTS FOR YOUTUBE VIDEO RESOLUTION:
1. EXPLICIT MATCH: The video MUST demonstrate proper form for "${exerciseName}".
2. RECENT CONTENT (2020 TO PRESENT): Must be a modern YouTube Shorts or video published between 2020 and 2026.
3. MAX DURATION (<= 1 MIN 30 SEC): YouTube Shorts or quick form demonstration under 1 minute 30 seconds max duration.
4. ACTIVE & PUBLIC: Must be a publicly available, working YouTube video ID.
${forceRefresh ? '5. FRESH REFRESH: Return a DIFFERENT active working YouTube Shorts ID for this exercise than before.' : ''}

Output ONLY the raw 11-character YouTube video ID string (e.g. vB_hT1sK2kM). If no match, return "NONE".`;

    const res = await callProxy({
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: `You are S.A.R.A, ZenTrack's AI fitness video resolver. Output ONLY an 11-character YouTube video ID string or "NONE". No spaces, no markdown codeblocks, no explanations.`,
      generationConfig: {
        temperature: forceRefresh ? 0.7 : 0.1,
        maxOutputTokens: 20,
      }
    });

    const textResult = res?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (textResult) {
      const cleanId = textResult.replace(/[^a-zA-Z0-9_-]/g, '').trim();
      if (cleanId.length === 11 && cleanId.toUpperCase() !== 'NONE') {
        const isValid = await isValidYoutubeVideoId(cleanId);
        if (isValid) {
          await setVideoInCacheMap(sanitized, cleanId);
          return cleanId;
        }
      }
    }
  } catch (e: any) {
    if (e?.message?.includes('API Error') || e?.message?.includes('429') || e?.message?.includes('401')) {
      isRateLimited = true;
    } else {
      console.warn('[VideoResolver] Primary AI live search error:', e);
    }
  }

  // 5. Tier 5 Simplified Core Movement Fallback (skip if API is rate limited to avoid spam)
  if (!isRateLimited) {
    try {
      const simplifiedName = exerciseName
        .replace(/hammer strength|machine|cable|smith machine|seated|standing|weighted|barbell|dumbbell|ez-bar|ez bar/gi, '')
        .trim() || exerciseName;

      const retryPrompt = `Target Exercise: "${simplifiedName}".
Find an ACTIVE, WORKING 11-character YouTube Shorts ID demonstrating proper form for "${simplifiedName}" (published 2020-2026, under 1:30 duration).
Return ONLY the 11-character YouTube video ID string.`;

      const res = await callProxy({
        contents: [{ parts: [{ text: retryPrompt }] }],
        systemInstruction: `Output ONLY a valid 11-character YouTube video ID string. No text.`,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 20,
        }
      });

      const textResult = res?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textResult) {
        const cleanId = textResult.replace(/[^a-zA-Z0-9_-]/g, '').trim();
        if (cleanId.length === 11 && cleanId.toUpperCase() !== 'NONE') {
          const isValid = await isValidYoutubeVideoId(cleanId);
          if (isValid) {
            await setVideoInCacheMap(sanitized, cleanId);
            return cleanId;
          }
        }
      }
    } catch (e) {
      console.warn('[VideoResolver] Tier 5 fallback error:', e);
    }
  }

  // Negative-cache unresolved results briefly so UI falls back cleanly to local GIF/still without retrying every mount
  await setVideoInCacheMap(sanitized, 'NONE', 6 * 3600000).catch(() => {});

  // Core movement fallbacks (only for safe primary compound patterns; return null otherwise)
  if (sanitized.includes('swing') || sanitized.includes('kettlebell')) return null;
  if (sanitized.includes('press') || sanitized.includes('bench')) return 'hWbUlkb5Ms4';
  if (sanitized.includes('row') || sanitized.includes('pulldown') || sanitized.includes('pullup') || sanitized.includes('chinup')) return 'G8l_8chR5BE';
  if (sanitized.includes('squat') || sanitized.includes('lunge')) return 'RVEZruvfkqI';
  if (sanitized.includes('deadlift') || sanitized.includes('rdl') || sanitized.includes('hinge')) return '2SHsk9AzdjA';
  if (sanitized.includes('curl') && !sanitized.includes('leg')) return 'kwG2ipFRgfo';
  if (sanitized.includes('extension') || sanitized.includes('pushdown') || sanitized.includes('dip')) return 'NvZKjiZ8NYc';
  if (sanitized.includes('raise') || sanitized.includes('fly')) return 'Kl3LEzQ5Zqs';
  if (sanitized.includes('crunch') || sanitized.includes('plank')) return 'mnRhbUB3Fjs';

  return null;
}
