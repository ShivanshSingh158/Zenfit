/**
 * gymRotationService.ts — ZenFit
 *
 * Rotation Mode (A, B, C, A...) vs Calendar Mode Engine:
 * - In Calendar Mode (Fixed Mon-Sun): Routines are pinned to days of the week.
 * - In Rotation Mode (Dynamic Playlist): Weekdays are ignored. The plan is a cyclical queue:
 *   Workout A -> Workout B -> Workout C -> Workout D -> repeat...
 *
 * Whichever day the lifter opens ZenFit, the app checks completed history and automatically
 * serves the next workout in line. Missed days never derail progression or break the schedule.
 */

import { GymDayLog, GymPlanDay, UserGymPlanDoc } from '../types/gym.types';
import { GYM_PLAN, GYM_PLAN_ARNOLD, getCuratedSplitById, resolvePlanDay, todayStr } from '../data/gymPlan';
import { CURATED_SPLITS_BY_ID } from '../data/curatedSplits';

export const ROTATION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

/**
 * Returns all active workout days in the rotation (excluding pure rest days with no exercises).
 */
export function getWorkoutDaysInRotation(userGymPlan: UserGymPlanDoc | null): GymPlanDay[] {
  const split =
    getCuratedSplitById(userGymPlan?.templateId) ||
    (userGymPlan?.templateId ? CURATED_SPLITS_BY_ID[userGymPlan.templateId] : null);
  const basePlan = userGymPlan?.templateId === 'arnold' ? GYM_PLAN_ARNOLD : GYM_PLAN;

  const baseSlots = split?.defaultDayMap
    ? Object.keys(split.defaultDayMap).map(Number).filter(n => Number.isFinite(n) && n >= 1)
    : [1, 2, 3, 4, 5, 6, 7];
  const slotSet = new Set<number>(baseSlots);

  if (userGymPlan?.customDays) {
    if (Array.isArray(userGymPlan.customDays)) {
      for (const d of userGymPlan.customDays) {
        const n = Number(d?.dayIndex);
        if (Number.isFinite(n) && n >= 1) slotSet.add(n);
      }
    } else {
      for (const k of Object.keys(userGymPlan.customDays)) {
        const n = Number(k);
        if (Number.isFinite(n) && n >= 1) slotSet.add(n);
      }
    }
  }

  const slots = Array.from(slotSet).sort((a, b) => a - b);
  const workoutDays: GymPlanDay[] = [];
  for (const idx of slots) {
    const day = resolvePlanDay(userGymPlan, idx);
    const hasExercises = Boolean(day && Array.isArray(day.exercises) && day.exercises.length > 0);
    const hasCardio = Boolean(day && Array.isArray(day.cardio) && day.cardio.length > 0);
    if (day && !day.isRest && (hasExercises || hasCardio)) {
      workoutDays.push(day);
    }
  }

  // Fallback: if all days are marked rest or empty, derive dynamically from curated split or base plan
  if (workoutDays.length === 0) {
    if (split && Array.isArray(split.workouts) && split.workouts.length > 0) {
      return split.workouts
        .filter(w => Array.isArray(w.exercises) && w.exercises.length > 0)
        .map((w, i) => ({
          dayIndex: i + 1,
          routineId: w.id,
          name: w.name,
          subtitle: w.subtitle,
          focus: w.focus,
          isRest: false,
          exercises: w.exercises,
        }));
    }
    return basePlan.filter(d => !d.isRest && d.exercises?.length > 0);
  }

  return workoutDays;
}

/**
 * Determines the next routine dayIndex (1-7) in the rotation queue based on completed workout logs.
 * Standardized between GymSplitsScreen (Up Next) and useGymLog (active session generation):
 * - Defaulting targetDateStr to todayStr() ensures deterministic queue state across all views.
 * - Completed sessions up to and including effectiveDateStr advance the cyclical pointer.
 */
export function getRotationNextDayIndex(
  userGymPlan: UserGymPlanDoc | null,
  gymLogs: GymDayLog[],
  targetDateStr?: string
): number {
  const rotationDays = getWorkoutDaysInRotation(userGymPlan);
  if (rotationDays.length === 0) return 1;

  // Standardize: if targetDateStr is omitted, anchor to today's local date
  const effectiveDateStr = targetDateStr || todayStr();

  // Consider all logs up to and including effectiveDateStr, sorted descending by date
  const filteredLogs = (gymLogs || []).filter(l => (l.date ? l.date <= effectiveDateStr : true));
  const sortedLogs = filteredLogs.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Find the last completed workout session that has a valid dayPlanIndex and actual working sets completed
  const lastCompleted = sortedLogs.find(log => {
    const hasWorkingSet = (log.exercises || []).some((e: any) =>
      (e.setsLog || []).some((s: any) => s.completed && !s.isWarmup)
    );
    if (!hasWorkingSet) return false;
    return log.dayPlanIndex != null && rotationDays.some(d => d.dayIndex === log.dayPlanIndex);
  });

  if (!lastCompleted || lastCompleted.dayPlanIndex == null) {
    // No completed history found: start at Workout 1 (A)
    return rotationDays[0].dayIndex;
  }

  const lastPos = rotationDays.findIndex(d => d.dayIndex === lastCompleted.dayPlanIndex);
  if (lastPos === -1) {
    return rotationDays[0].dayIndex;
  }

  // Cyclical pointer advance: (lastPos + 1) % N
  const nextPos = (lastPos + 1) % rotationDays.length;
  return rotationDays[nextPos].dayIndex;
}

/**
 * Returns letter A, B, C, D... corresponding to the routine's position in rotation.
 */
export function getRotationLetterForDay(dayIndex: number, rotationDays: GymPlanDay[]): string {
  const pos = rotationDays.findIndex(d => d.dayIndex === dayIndex);
  if (pos === -1) return `${dayIndex}`;
  return ROTATION_LETTERS[pos % ROTATION_LETTERS.length] || `${pos + 1}`;
}
