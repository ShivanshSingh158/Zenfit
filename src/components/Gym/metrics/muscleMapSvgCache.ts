import { INERT, MuscleSlug } from '../../../services/muscleRecoveryService';
import { BODY_PATHS, getMergedInertPath, getMergedMusclePath } from './bodyPaths';

/**
 * Canonical Muscle Group -> Anatomical SVG Slug Registry
 * Shared identically across MiniDualBodyMap, PreSessionMuscleHitMap,
 * MiniMannequinButton, WhatThisSessionHitsSheet, and AnatomicalBodyMapCard.
 */
export const MUSCLE_GROUP_TO_SLUGS: Record<string, MuscleSlug[]> = {
  Chest: ['chest'],
  'Upper Chest': ['chest'],
  'Mid Chest': ['chest'],
  'Lower Chest': ['chest'],
  Back: ['upper-back', 'lower-back', 'trapezius'],
  Lats: ['upper-back'],
  'Lat Width': ['upper-back'],
  'Mid-Back': ['upper-back'],
  'Lower Back': ['lower-back'],
  Shoulders: ['deltoids'],
  'Front Delts': ['deltoids'],
  'Side Delts': ['deltoids'],
  'Rear Delts': ['deltoids'],
  Biceps: ['biceps'],
  'Short Bicep': ['biceps'],
  'Long Bicep': ['biceps'],
  Brachialis: ['biceps'],
  Triceps: ['triceps'],
  'Long Tricep': ['triceps'],
  'Lat/Med Tricep': ['triceps'],
  Forearms: ['forearm'],
  'Forearm Flexors': ['forearm'],
  'Forearm Extensors': ['forearm'],
  Brachioradialis: ['forearm'],
  Quads: ['quadriceps'],
  'Quad Teardrop': ['quadriceps'],
  Hamstrings: ['hamstring'],
  Calves: ['calves', 'tibialis'],
  Gastrocnemius: ['calves'],
  Soleus: ['calves'],
  'Tibialis Anterior': ['tibialis'],
  Abs: ['abs', 'obliques'],
  Core: ['abs', 'obliques'],
  'Upper Abs': ['abs'],
  'Lower Abs': ['abs'],
  Obliques: ['obliques', 'abs'],
  'Transverse Abs': ['abs', 'obliques'],
  Glutes: ['gluteal'],
  'Glutes/Abductors': ['gluteal'],
  Adductors: ['adductors'],
  Traps: ['trapezius'],
  'Upper Traps': ['trapezius'],
  'Full Body': ['chest', 'upper-back', 'deltoids', 'quadriceps', 'abs'],
};

export const SVG_SLUG_TO_GROUP: Record<string, string> = {
  chest: 'Chest',
  'upper-back': 'Back',
  'lower-back': 'Back',
  deltoids: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quadriceps: 'Quads',
  hamstring: 'Hamstrings',
  adductors: 'Quads',
  calves: 'Calves',
  tibialis: 'Calves',
  abs: 'Abs',
  obliques: 'Abs',
  forearm: 'Forearms',
  gluteal: 'Glutes',
  trapezius: 'Traps',
  serratus: 'Chest',
  'hip-flexors': 'Quads',
};

export interface CachedBodyView {
  vb: string;
  inertD: string;
  slugs: string[];
  paths: Record<string, string>;
}

const INERT_SET = new Set<string>(INERT as readonly string[]);

function buildViewCache(viewGeo: { vb: string; p: Record<string, string[]> }): CachedBodyView {
  // Exclude inert silhouette keys (head, hair, hands, knees, ankles, feet) so
  // they are only drawn once as the inertD path, not duplicated in slugs/paths.
  const allSlugs = Object.keys(viewGeo.p);
  const slugs = allSlugs.filter(slug => !INERT_SET.has(slug));
  const paths: Record<string, string> = {};
  for (const slug of slugs) {
    const merged = getMergedMusclePath(viewGeo, slug);
    if (merged) paths[slug] = merged;
  }
  return {
    vb: viewGeo.vb,
    inertD: getMergedInertPath(viewGeo, INERT),
    slugs,
    paths,
  };
}

/**
 * Lazy module-level cache per gender — zero work for the unused silhouette,
 * zero runtime path joins in render().
 */
const _cachedBodySvg: Partial<Record<'male' | 'female', { front: CachedBodyView; back: CachedBodyView }>> = {};

function getCachedGenderSvg(gender: 'male' | 'female') {
  if (!_cachedBodySvg[gender]) {
    _cachedBodySvg[gender] = {
      front: buildViewCache(BODY_PATHS[gender].front),
      back: buildViewCache(BODY_PATHS[gender].back),
    };
  }
  return _cachedBodySvg[gender]!;
}

export const STATIC_BODY_SVG: Record<'male' | 'female', { front: CachedBodyView; back: CachedBodyView }> = {
  get male() {
    return getCachedGenderSvg('male');
  },
  get female() {
    return getCachedGenderSvg('female');
  },
};

export function resolveMuscleSlugsForGroup(groupOrRaw?: string): MuscleSlug[] {
  if (!groupOrRaw) return [];
  if (MUSCLE_GROUP_TO_SLUGS[groupOrRaw]) return MUSCLE_GROUP_TO_SLUGS[groupOrRaw];
  const lower = groupOrRaw.trim().toLowerCase();
  for (const [key, slugs] of Object.entries(MUSCLE_GROUP_TO_SLUGS)) {
    if (key.toLowerCase() === lower) return slugs;
  }
  if (lower.includes('core') || lower.includes('abs') || lower.includes('oblique') || lower.includes('vacuum')) {
    return ['abs', 'obliques'];
  }
  return [];
}
