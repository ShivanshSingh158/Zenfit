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
import { GYM_PLAN, GYM_PLAN_ARNOLD, resolvePlanDay } from '../data/gymPlan';

export const ROTATION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

/**
 * Returns all active workout days in the rotation (excluding pure rest days with no exercises).
 */
export function getWorkoutDaysInRotation(userGymPlan: UserGymPlanDoc | null): GymPlanDay[] {
  const isArnold = userGymPlan?.templateId === 'arnold';
  const basePlan = isArnold ? GYM_PLAN_ARNOLD : GYM_PLAN;

  const workoutDays: GymPlanDay[] = [];
  for (let idx = 1; idx <= 7; idx++) {
    const day = resolvePlanDay(userGymPlan, idx) || basePlan.find(d => d.dayIndex === idx);
    if (day && !day.isRest && Array.isArray(day.exercises) && day.exercises.length > 0) {
      workoutDays.push(day);
    }
  }

  // Fallback: if all days are marked rest or empty, return non-rest days from base plan
  if (workoutDays.length === 0) {
    return basePlan.filter(d => !d.isRest && d.exercises?.length > 0);
  }

  return workoutDays;
}

/**
 * Determines the next routine dayIndex (1-7) in the rotation queue based on completed workout logs.
 */
export function getRotationNextDayIndex(
  userGymPlan: UserGymPlanDoc | null,
  gymLogs: GymDayLog[],
  targetDateStr?: string
): number {
  const rotationDays = getWorkoutDaysInRotation(userGymPlan);
  if (rotationDays.length === 0) return 1;

  // Filter logs strictly before targetDateStr (or all logs if not provided), newest first
  const filteredLogs = targetDateStr
    ? (gymLogs || []).filter(l => (l.date || '') < targetDateStr)
    : (gymLogs || []);

  const sortedLogs = filteredLogs.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Find the last completed workout session that has a valid dayPlanIndex or completed exercises
  const lastCompleted = sortedLogs.find(log => {
    if (!log.completed && (!log.exercises || !log.exercises.some((e: any) => e.setsLog?.some((s: any) => s.completed)))) {
      return false;
    }
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

