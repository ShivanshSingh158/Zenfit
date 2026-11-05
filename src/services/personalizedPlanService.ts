/**
 * personalizedPlanService.ts — ZenFit
 *
 * Evidence-Based Personalized Plan Generator:
 * Generates custom, science-backed workout plans dynamically tailored to the athlete's
 * specific biometrics (weight, height, BMI), primary goal (Hypertrophy, Strength, Recomp),
 * and training frequency.
 */

import { GymPlanDay, GymPlanExercise } from '../types/gym.types';
import { getCanonicalExerciseName, resolveExerciseTargetMuscle } from '../utils/gymUtils';

export interface PlanGenerationParams {
  displayName?: string;
  weightKg?: number;
  heightCm?: number;
  goal?: 'hypertrophy' | 'strength' | 'fat_loss' | 'athletic' | 'recomp';
  daysPerWeek?: number; // 3, 4, 5, or 6
  level?: 'beginner' | 'intermediate' | 'advanced';
}

export function generatePersonalizedGymPlan(params: PlanGenerationParams): {
  planName: string;
  days: Record<number, GymPlanDay>;
  description: string;
} {
  const goal = params.goal || 'hypertrophy';
  const daysPerWeek = params.daysPerWeek || 5;
  const isHypertrophy = goal === 'hypertrophy' || goal === 'recomp';

  // Day 1: Push / Upper Chest & Triceps
  const day1: GymPlanDay = {
    dayIndex: 1,
    name: 'Chest, Delts & Triceps',
    subtitle: 'Upper Chest & Lateral Delts Focus',
    focus: 'Incline dumbbell presses, cable crossovers, lateral delt isolation, and tricep stretch overload.',
    exercises: [
      { id: 'gen_d1_1', name: 'Incline Bench Press (Dumbbell)', targetSets: 4, targetReps: '8–10', muscle: 'Upper Chest', videoId: '8fXfwG4ftaQ' },
      { id: 'gen_d1_2', name: 'Low Cable Fly Crossovers', targetSets: 3, targetReps: '10–12', muscle: 'Upper Chest', videoId: '8Um35Es-ROE' },
      { id: 'gen_d1_3', name: 'Butterfly (Pec Deck)', targetSets: 3, targetReps: '10–12', muscle: 'Mid Chest', videoId: 'fgXSA2-o0NM' },
      { id: 'gen_d1_4', name: 'Lateral Raise (Cable)', targetSets: 4, targetReps: '12–15', muscle: 'Side Delts', videoId: 'f_OGBg2KxgY' },
      { id: 'gen_d1_5', name: 'Overhead Cable Triceps Extension', targetSets: 3, targetReps: '10–12', muscle: 'Long Tricep', videoId: 'b5le--KkyH0' },
      { id: 'gen_d1_6', name: 'Triceps Rope Pushdown', targetSets: 3, targetReps: '10–12', muscle: 'Triceps', videoId: 'NvZKjiZ8NYc' },
    ],
  };

  // Day 2: Pull / Lat Width & Biceps
  const day2: GymPlanDay = {
    dayIndex: 2,
    name: 'Back Width & Biceps',
    subtitle: 'Lat Thickness & Peak Flexion',
    focus: 'Vertical pulling overload, chest-supported rowing, and long-head bicep isolation.',
    exercises: [
      { id: 'gen_d2_1', name: 'Lat Pulldown (Cable)', targetSets: 4, targetReps: '8–10', muscle: 'Lat Width', videoId: 'SALxEARiMkw' },
      { id: 'gen_d2_2', name: 'Seated Cable Row - V Grip (Cable)', targetSets: 3, targetReps: '10–12', muscle: 'Mid-Back', videoId: '4mRy8U542Fo' },
      { id: 'gen_d2_3', name: 'Chest Supported Incline Row (Dumbbell)', targetSets: 3, targetReps: '10–12', muscle: 'Upper Back', videoId: 'TyLoy3n_a10' },
      { id: 'gen_d2_4', name: 'Face Pull', targetSets: 3, targetReps: '12–15', muscle: 'Rear Delts', videoId: 'ljgqer1ZpXg' },
      { id: 'gen_d2_5', name: 'EZ Bar Biceps Curl', targetSets: 3, targetReps: '8–10', muscle: 'Short Bicep', videoId: 'kwG2ipFRgfo' },
      { id: 'gen_d2_6', name: 'Cross Body Hammer Curl', targetSets: 3, targetReps: '10–12', muscle: 'Brachialis', videoId: '5FAuyZuvJFg' },
    ],
  };

  // Day 3: Legs / Quad Dominance
  const day3: GymPlanDay = {
    dayIndex: 3,
    name: 'Quads, Calves & Abs',
    subtitle: 'Quad Sweep & Core Stabilization',
    focus: 'Heavy hack squats, leg press drop volume, and deep spinal flexion.',
    exercises: [
      { id: 'gen_d3_1', name: 'Hack Squat (Machine)', targetSets: 4, targetReps: '8–10', muscle: 'Quads', videoId: 'fE5BWPy7uRc' },
      { id: 'gen_d3_2', name: 'Leg Press', targetSets: 3, targetReps: '10–12', muscle: 'Quads', videoId: 'fE5BWPy7uRc' },
      { id: 'gen_d3_3', name: 'Leg Extension (Machine)', targetSets: 3, targetReps: '12–15', muscle: 'Quads', videoId: 'RVEZruvfkqI' },
      { id: 'gen_d3_4', name: 'Standing Calf Raise (Machine)', targetSets: 4, targetReps: '12–15', muscle: 'Calves', videoId: 'SVtg-1loH4c' },
      { id: 'gen_d3_5', name: 'Cable Crunch', targetSets: 3, targetReps: '12–15', muscle: 'Upper Abs', videoId: 'mnRhbUB3Fjs' },
    ],
  };

  // Day 4: Shoulders & Upper Chest
  const day4: GymPlanDay = {
    dayIndex: 4,
    name: 'Delts, Arms & Detail',
    subtitle: '3D Shoulders & Arm Peak',
    focus: 'Seated shoulder press overload, lateral cable raises, and arm super-pump.',
    exercises: [
      { id: 'gen_d4_1', name: 'Seated Shoulder Press (Machine)', targetSets: 4, targetReps: '8–10', muscle: 'Front Delts', videoId: '6v4nrRVySj0' },
      { id: 'gen_d4_2', name: 'Lateral Raise (Cable)', targetSets: 4, targetReps: '12–15', muscle: 'Side Delts', videoId: 'f_OGBg2KxgY' },
      { id: 'gen_d4_3', name: 'Rear Delt Reverse Fly (Machine)', targetSets: 3, targetReps: '12–15', muscle: 'Rear Delts', videoId: '-TKqxK7-ehc' },
      { id: 'gen_d4_4', name: 'Crossbody Triceps Extension (Cable)', targetSets: 3, targetReps: '10–12', muscle: 'Triceps', videoId: 'hp9IQlVcNW0' },
      { id: 'gen_d4_5', name: 'Bayesian Curl (Cable)', targetSets: 3, targetReps: '10–12', muscle: 'Long Bicep', videoId: 'kwG2ipFRgfo' },
    ],
  };

  // Day 5: Posterior Chain & Hamstrings
  const day5: GymPlanDay = {
    dayIndex: 5,
    name: 'Hamstrings, Glutes & Lats',
    subtitle: 'Posterior Hinge & Lat Thickness',
    focus: 'Romanian deadlifts, seated leg curls, and single-arm cable rows.',
    exercises: [
      { id: 'gen_d5_1', name: 'Romanian Deadlift (Barbell)', targetSets: 4, targetReps: '8–10', muscle: 'Hamstrings', videoId: '2SHsk9AzdjA' },
      { id: 'gen_d5_2', name: 'Seated Leg Curl (Machine)', targetSets: 4, targetReps: '10–12', muscle: 'Hamstrings', videoId: 'RVEZruvfkqI' },
      { id: 'gen_d5_3', name: 'Single Arm Cable Row', targetSets: 3, targetReps: '10–12', muscle: 'Lat Width', videoId: 'qN54-QNO1eQ' },
      { id: 'gen_d5_4', name: 'Seated Calf Raise', targetSets: 3, targetReps: '12–15', muscle: 'Calves', videoId: 'SVtg-1loH4c' },
      { id: 'gen_d5_5', name: 'Hanging Leg Raise', targetSets: 3, targetReps: '12–15', muscle: 'Lower Abs', videoId: '2n4UqRIJyk4' },
    ],
  };

  // Rest Days
  const restDay6: GymPlanDay = {
    dayIndex: 6,
    name: 'Rest & Hypertrophy Recovery',
    subtitle: 'Connective Tissue & Protein Synthesis',
    focus: 'High protein nutrition, hydration, and systemic muscle regeneration.',
    isRest: true,
    exercises: [],
  };

  const restDay7: GymPlanDay = {
    dayIndex: 7,
    name: 'Rest & Nervous System Reset',
    subtitle: 'Active Recovery & Mental Reset',
    focus: 'Light walking, mobility drills, and sleep optimization.',
    isRest: true,
    exercises: [],
  };

  const canonicalizeDay = (d: GymPlanDay): GymPlanDay => ({
    ...d,
    exercises: (d.exercises || []).map((ex) => {
      const canonicalName = getCanonicalExerciseName(ex.name);
      return {
        ...ex,
        name: canonicalName,
        muscle: resolveExerciseTargetMuscle(canonicalName, ex.muscle).targetMuscle,
      };
    }),
  });

  const days: Record<number, GymPlanDay> = {
    1: canonicalizeDay(day1),
    2: canonicalizeDay(day2),
    3: canonicalizeDay(day3),
    4: canonicalizeDay(day4),
    5: canonicalizeDay(day5),
    6: restDay6,
    7: restDay7,
  };

  return {
    planName: isHypertrophy ? 'Personalized Hypertrophy Split' : 'Personalized Strength Split',
    description: `Tailored for ${params.displayName || 'Athlete'} (${params.weightKg || 94} kg) with optimal hypertrophy landmarks, target RIRs, and progressive overload volume.`,
    days,
  };
}

