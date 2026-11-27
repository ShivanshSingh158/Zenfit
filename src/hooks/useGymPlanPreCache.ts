/**
 * useGymPlanPreCache.ts — ZenTrack Mobile
 *
 * Background Exercise Media Pre-Caching:
 * - Listens for changes to the active User Gym Plan.
 * - Extracts all scheduled exercises across all training days.
 * - Silently downloads their animated GIFs into local FileSystem cache.
 * - Guarantees 100% offline animated form demonstrations in gym basements.
 */
import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { useGymPlan, getWorkoutActiveGlobal } from '../contexts/domains/WellnessContext';
import { GYM_PLAN } from '../data/gymPlan';
import { preCacheExercises, preCacheAllCuratedExercises } from '../services/exerciseMediaService';
import { getUnifiedExerciseCatalogue, getUnifiedCategoryMap } from '../services/exerciseCatalogService';

export function useGymPlanPreCache() {
  const { userGymPlan } = useGymPlan();
  const lastPlanHashRef = useRef<string>('');
  const warmedUpRef = useRef(false);

  // Cold-boot background warming of 1,600+ exercise catalogue & category maps
  useEffect(() => {
    if (warmedUpRef.current || getWorkoutActiveGlobal()) return;
    warmedUpRef.current = true;
    const task = InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        try {
          if (getWorkoutActiveGlobal()) return;
          getUnifiedExerciseCatalogue();
          getUnifiedCategoryMap();
        } catch (_) {}
      }, 2000);
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    // Never run media downloads during an active workout
    if (getWorkoutActiveGlobal()) return;
    const nameSet = new Set<string>();

    // Collect from userGymPlan.customDays
    if (userGymPlan?.customDays) {
      Object.values(userGymPlan.customDays).forEach((day: any) => {
        if (day?.exercises && Array.isArray(day.exercises)) {
          day.exercises.forEach((ex: any) => {
            if (ex?.name) {
              nameSet.add(ex.name);
            }
          });
        }
      });
    }

    // Include default GYM_PLAN exercises if customDays is empty
    if (nameSet.size === 0) {
      GYM_PLAN.forEach(day => {
        if (day?.exercises && Array.isArray(day.exercises)) {
          day.exercises.forEach(ex => {
            if (ex?.name) {
              nameSet.add(ex.name);
            }
          });
        }
      });
    }

    const names = Array.from(nameSet).sort();
    const planHash = names.join('|');
    if (planHash === lastPlanHashRef.current || names.length === 0) return;
    lastPlanHashRef.current = planHash;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        if (getWorkoutActiveGlobal()) return;
        preCacheExercises(names).then(count => {
          if (count > 0) {
            console.log(`[GymPlanPreCache] Pre-cached ${count} active routine exercises.`);
          }
          // Progressively pre-cache all remaining curated exercises (total ~9 MB) for 100% offline coverage
          if (!getWorkoutActiveGlobal()) {
            preCacheAllCuratedExercises().then(total => {
              if (total > 0) {
                console.log(`[GymPlanPreCache] Successfully cached all curated exercises (${total} downloaded) for instant offline access.`);
              }
            }).catch(() => {});
          }
        }).catch(err => {
          console.warn('[GymPlanPreCache] Pre-cache error:', err);
        });
      }, 3500);
    });

    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [userGymPlan?.updatedAt, userGymPlan?.templateId, userGymPlan?.customDays]);
}
