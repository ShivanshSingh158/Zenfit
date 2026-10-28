/**
 * exerciseVideoResolver.ts — ZenFit Mobile
 * Fast offline Exercise Video Form Resolver using the local 400+ Exercise Video Database.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { KNOWN_EXERCISE_VIDEOS, sanitizeName } from './exerciseVideoDatabase';

const VIDEO_CACHE_PREFIX = '@zenfit_video_id_';

export async function autoResolveExerciseVideoId(exerciseName: string, forceRefresh = false): Promise<string | null> {
  if (!exerciseName || !exerciseName.trim()) return null;

  const sanitized = sanitizeName(exerciseName);
  const cacheKey = `${VIDEO_CACHE_PREFIX}${sanitized}`;

  if (forceRefresh) {
    try {
      await AsyncStorage.removeItem(cacheKey);
    } catch (_) {}
  } else {
    // 1. Direct exact match in dictionary (400+ Exercises)
    if (KNOWN_EXERCISE_VIDEOS[sanitized]) {
      return KNOWN_EXERCISE_VIDEOS[sanitized];
    }

    // 2. Smart Modifier-Aware Partial Match
    const sortedKeys = Object.keys(KNOWN_EXERCISE_VIDEOS).sort((a, b) => b.length - a.length);
    const keyMatch = sortedKeys.find(k => {
      const hasReverseInName = sanitized.includes('reverse') || sanitized.includes('rear');
      const hasReverseInKey = k.includes('reverse') || k.includes('rear');
      if (hasReverseInName !== hasReverseInKey) return false;

      const hasInclineInName = sanitized.includes('incline');
      const hasInclineInKey = k.includes('incline');
      if (hasInclineInName !== hasInclineInKey) return false;

      const hasDeclineInName = sanitized.includes('decline');
      const hasDeclineInKey = k.includes('decline');
      if (hasDeclineInName !== hasDeclineInKey) return false;

      return sanitized.includes(k) || k.includes(sanitized);
    });

    if (keyMatch) {
      return KNOWN_EXERCISE_VIDEOS[keyMatch];
    }

    // 3. Local AsyncStorage Cache
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached && cached !== 'NONE') return cached;
    } catch (_) { /* ignore */ }
  }

  return null;
}
