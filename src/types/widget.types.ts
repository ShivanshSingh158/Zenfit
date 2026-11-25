/**
 * widget.types.ts — ZenFit Live Workout Widget Types
 */

// ── Live Workout Widget Click Actions ────────────────────────────────────────
export type WidgetClickActionType =
  | 'open_app'
  | 'log_workout_set'
  | 'adjust_workout_weight'
  | 'next_workout_exercise'
  | 'start_workout_session'
  | 'finish_workout_session';

export interface WidgetClickActionPayload {
  action: WidgetClickActionType;
  dateStr?: string;
  exerciseId?: string;
  setIndex?: number;
  weightDelta?: number;
  weight?: number;
  reps?: number;
}

// ── Live Workout Widget Types ────────────────────────────────────────────────
export interface WidgetExerciseSet {
  setNumber: number;
  weight: number;
  reps: number;
  completed: boolean;
}

export interface WidgetActiveExercise {
  id: string;
  name: string;
  targetSets: number;
  currentSetIndex: number;
  sets: WidgetExerciseSet[];
  targetReps?: number;
  targetWeight?: number;
  notes?: string;
}

export interface LiveWorkoutWidgetData {
  dateStr?: string;                     // "YYYY-MM-DD"
  unit?: 'kg' | 'lbs';                  // Display unit synced with profile
  dayName?: string;                    // "Monday", "Tuesday", etc.
  displayDate?: string;                // "Mon, Sep 4"
  isActive: boolean;                   // true if session in progress
  isCompleted?: boolean;               // true if workout finished today
  isRestDay?: boolean;                 // true if today is rest day
  splitTitle: string;                  // e.g. "Push Day A", "Rest & Recovery"
  splitSubtitle?: string;              // e.g. "Chest · Shoulders · Triceps"
  workoutDurationMinutes?: number;     // e.g. 45
  currentExerciseIndex: number;
  totalExercises: number;
  currentExercise?: WidgetActiveExercise;
  nextExerciseName?: string;
  restTimerSecondsRemaining?: number;
  completedSetsCount: number;
  totalSetsCount: number;
  plannedExercisesPreview?: string[];  // names of first few exercises
  allExercises?: {
    id: string;
    name: string;
    targetSets: number;
    targetWeight?: number;
    targetReps?: number;
    completed: boolean;
    sets?: WidgetExerciseSet[];
  }[];
  lastUpdated: number;
}
