import { GymPlanDay, GymPlanExercise } from '../types/gym.types';

export interface CuratedWorkout {
  id: string;
  name: string;
  subtitle: string;
  focus: string;
  exercises: GymPlanExercise[];
}

export interface CuratedSplitPreset {
  id: string;
  name: string;
  description: string;
  dayMap: Record<number, string>; // 1..7 -> workout.id or 'rest'
}

export interface CuratedSplit {
  id: string;
  name: string;
  daysPerWeek: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  focus: string;
  description: string;
  tags: string[];
  workouts: CuratedWorkout[];
  presets: CuratedSplitPreset[];
  defaultDayMap: Record<number, string>;
}

export const REST_DAY_TEMPLATE: GymPlanDay = {
  dayIndex: 7,
  name: 'Rest & Recovery',
  subtitle: 'Active recovery, muscle repair & sleep',
  focus: 'Scheduled active recovery, nervous system restoration, and mobility.',
  isRest: true,
  exercises: [],
};

// ── 1. PUSH / PULL / LEGS (6-DAY) ──────────────────────────────────────────
const PPL_WORKOUTS: CuratedWorkout[] = [
  {
    id: 'ppl_push_a',
    name: 'Push A',
    subtitle: 'Chest & Delts Focus',
    focus: 'Incline pressing, flat dumbbell flyes, lateral raises & triceps lockout.',
    exercises: [
      { id: 'ppl_pa_1', name: 'Incline Bench Press (Barbell)', targetSets: 4, targetReps: '6–8', muscle: 'Upper Chest' },
      { id: 'ppl_pa_2', name: 'Incline Bench Press (Dumbbell)', targetSets: 3, targetReps: '8–10', muscle: 'Upper Chest' },
      { id: 'ppl_pa_3', name: 'Butterfly (Pec Deck)', targetSets: 3, targetReps: '10–12', muscle: 'Mid Chest' },
      { id: 'ppl_pa_4', name: 'Lateral Raise (Dumbbell)', targetSets: 4, targetReps: '12–15', muscle: 'Side Delts' },
      { id: 'ppl_pa_5', name: 'Triceps Rope Pushdown', targetSets: 3, targetReps: '10–12', muscle: 'Triceps' },
      { id: 'ppl_pa_6', name: 'Overhead Cable Triceps Extension', targetSets: 3, targetReps: '10–12', muscle: 'Long Tricep' },
    ],
  },
  {
    id: 'ppl_pull_a',
    name: 'Pull A',
    subtitle: 'Lat Width & Biceps',
    focus: 'Vertical pulling, chest-supported rowing, and bicep flexion overload.',
    exercises: [
      { id: 'ppl_pla_1', name: 'Lat Pulldown (Cable)', targetSets: 4, targetReps: '8–10', muscle: 'Lat Width' },
      { id: 'ppl_pla_2', name: 'Seated Cable Row - V Grip (Cable)', targetSets: 3, targetReps: '10–12', muscle: 'Mid-Back' },
      { id: 'ppl_pla_3', name: 'Chest Supported Incline Row (Dumbbell)', targetSets: 3, targetReps: '10–12', muscle: 'Upper Back' },
      { id: 'ppl_pla_4', name: 'Face Pull', targetSets: 3, targetReps: '12–15', muscle: 'Rear Delts' },
      { id: 'ppl_pla_5', name: 'EZ Bar Biceps Curl', targetSets: 3, targetReps: '8–10', muscle: 'Biceps' },
      { id: 'ppl_pla_6', name: 'Cross Body Hammer Curl', targetSets: 3, targetReps: '10–12', muscle: 'Brachialis' },
    ],
  },
  {
    id: 'ppl_legs_a',
    name: 'Legs A',
    subtitle: 'Quad Dominance & Core',
    focus: 'Heavy squats, quad extensions, calf development & deep core.',
    exercises: [
      { id: 'ppl_la_1', name: 'Hack Squat (Machine)', targetSets: 4, targetReps: '8–10', muscle: 'Quads' },
      { id: 'ppl_la_2', name: 'Leg Press', targetSets: 3, targetReps: '10–12', muscle: 'Quads' },
      { id: 'ppl_la_3', name: 'Seated Leg Curl (Machine)', targetSets: 3, targetReps: '10–12', muscle: 'Hamstrings' },
      { id: 'ppl_la_4', name: 'Standing Calf Raise (Machine)', targetSets: 4, targetReps: '12–15', muscle: 'Calves' },
      { id: 'ppl_la_5', name: 'Cable Crunch', targetSets: 3, targetReps: '12–15', muscle: 'Upper Abs' },
    ],
  },
  {
    id: 'ppl_push_b',
    name: 'Push B',
    subtitle: 'Overhead Power & Triceps Detail',
    focus: 'Seated shoulder pressing, incline cable flies, and tricep stretch overload.',
    exercises: [
      { id: 'ppl_pb_1', name: 'Seated Shoulder Press (Machine)', targetSets: 4, targetReps: '8–10', muscle: 'Front Delts' },
      { id: 'ppl_pb_2', name: 'Low Cable Fly Crossovers', targetSets: 3, targetReps: '12–15', muscle: 'Upper Chest' },
      { id: 'ppl_pb_3', name: 'Lateral Raise (Cable)', targetSets: 4, targetReps: '12–15', muscle: 'Side Delts' },
      { id: 'ppl_pb_4', name: 'Crossbody Triceps Extension (Cable)', targetSets: 3, targetReps: '10–12', muscle: 'Triceps' },
      { id: 'ppl_pb_5', name: 'Incline Skullcrusher (Cable)', targetSets: 3, targetReps: '10–12', muscle: 'Long Tricep' },
    ],
  },
  {
    id: 'ppl_pull_b',
    name: 'Pull B',
    subtitle: 'Mid-Back Thickness & Biceps Peak',
    focus: 'Heavy T-bar rows, close grip pulldowns, and incline dumbbell curls.',
    exercises: [
      { id: 'ppl_plb_1', name: 'T Bar Row', targetSets: 4, targetReps: '8–10', muscle: 'Mid-Back' },
      { id: 'ppl_plb_2', name: 'Lat Pulldown - Close Grip (Cable)', targetSets: 3, targetReps: '10–12', muscle: 'Lat Width' },
      { id: 'ppl_plb_3', name: 'Rear Delt Reverse Fly (Machine)', targetSets: 3, targetReps: '12–15', muscle: 'Rear Delts' },
      { id: 'ppl_plb_4', name: 'Seated Incline Curl (Dumbbell)', targetSets: 3, targetReps: '10–12', muscle: 'Long Bicep' },
      { id: 'ppl_plb_5', name: 'Bayesian Curl (Cable)', targetSets: 3, targetReps: '10–12', muscle: 'Biceps' },
    ],
  },
  {
    id: 'ppl_legs_b',
    name: 'Legs B',
    subtitle: 'Posterior Chain & Calves',
    focus: 'Romanian deadlifts, lying hamstring curls, and glute hip abduction.',
    exercises: [
      { id: 'ppl_lb_1', name: 'Romanian Deadlift (Barbell)', targetSets: 4, targetReps: '8–10', muscle: 'Hamstrings' },
      { id: 'ppl_lb_2', name: 'Goblet Squat', targetSets: 3, targetReps: '10–12', muscle: 'Quads' },
      { id: 'ppl_lb_3', name: 'Hip Abduction (Machine)', targetSets: 3, targetReps: '15–20', muscle: 'Glutes' },
      { id: 'ppl_lb_4', name: 'Standing Calf Raise (Machine)', targetSets: 4, targetReps: '12–15', muscle: 'Calves' },
      { id: 'ppl_lb_5', name: 'Hanging Leg Raise', targetSets: 3, targetReps: '12–15', muscle: 'Lower Abs' },
    ],
  },
];

// ── 2. UPPER / LOWER (4-DAY) ──────────────────────────────────────────────
const UPPER_LOWER_WORKOUTS: CuratedWorkout[] = [
  {
    id: 'ul_upper_a',
    name: 'Upper Body A',
    subtitle: 'Heavy Push & Horizontal Pull',
    focus: 'Barbell bench, chest-supported rowing, overhead delts & arms.',
    exercises: [
      { id: 'ul_ua_1', name: 'Incline Bench Press (Barbell)', targetSets: 4, targetReps: '6–8', muscle: 'Upper Chest' },
      { id: 'ul_ua_2', name: 'T Bar Row', targetSets: 4, targetReps: '6–8', muscle: 'Mid-Back' },
      { id: 'ul_ua_3', name: 'Seated Shoulder Press (Machine)', targetSets: 3, targetReps: '8–10', muscle: 'Front Delts' },
      { id: 'ul_ua_4', name: 'Lateral Raise (Dumbbell)', targetSets: 3, targetReps: '12–15', muscle: 'Side Delts' },
      { id: 'ul_ua_5', name: 'Triceps Rope Pushdown', targetSets: 3, targetReps: '10–12', muscle: 'Triceps' },
      { id: 'ul_ua_6', name: 'EZ Bar Biceps Curl', targetSets: 3, targetReps: '10–12', muscle: 'Biceps' },
    ],
  },
  {
    id: 'ul_lower_a',
    name: 'Lower Body A',
    subtitle: 'Squat & Quad Dominance',
    focus: 'Heavy knee flexion, hamstring stretch, calf work and core.',
    exercises: [
      { id: 'ul_la_1', name: 'Hack Squat (Machine)', targetSets: 4, targetReps: '6–8', muscle: 'Quads' },
      { id: 'ul_la_2', name: 'Romanian Deadlift (Barbell)', targetSets: 3, targetReps: '8–10', muscle: 'Hamstrings' },
      { id: 'ul_la_3', name: 'Leg Extension (Machine)', targetSets: 3, targetReps: '12–15', muscle: 'Quads' },
      { id: 'ul_la_4', name: 'Standing Calf Raise (Machine)', targetSets: 4, targetReps: '12–15', muscle: 'Calves' },
      { id: 'ul_la_5', name: 'Cable Crunch', targetSets: 3, targetReps: '12–15', muscle: 'Abs' },
    ],
  },
  {
    id: 'ul_upper_b',
    name: 'Upper Body B',
    subtitle: 'Vertical Pull & Chest Detail',
    focus: 'Lat pulldowns, incline dumbbell press, cable flies & arm supersets.',
    exercises: [
      { id: 'ul_ub_1', name: 'Lat Pulldown (Cable)', targetSets: 4, targetReps: '8–10', muscle: 'Lat Width' },
      { id: 'ul_ub_2', name: 'Incline Bench Press (Dumbbell)', targetSets: 4, targetReps: '8–10', muscle: 'Upper Chest' },
      { id: 'ul_ub_3', name: 'Butterfly (Pec Deck)', targetSets: 3, targetReps: '10–12', muscle: 'Mid Chest' },
      { id: 'ul_ub_4', name: 'Face Pull', targetSets: 3, targetReps: '12–15', muscle: 'Rear Delts' },
      { id: 'ul_ub_5', name: 'Overhead Cable Triceps Extension', targetSets: 3, targetReps: '10–12', muscle: 'Triceps' },
      { id: 'ul_ub_6', name: 'Seated Incline Curl (Dumbbell)', targetSets: 3, targetReps: '10–12', muscle: 'Biceps' },
    ],
  },
  {
    id: 'ul_lower_b',
    name: 'Lower Body B',
    subtitle: 'Posterior Chain & Quad Burn',
    focus: 'Leg press volume, seated hamstring curls, abductors & abs.',
    exercises: [
      { id: 'ul_lb_1', name: 'Leg Press', targetSets: 4, targetReps: '8–10', muscle: 'Quads' },
      { id: 'ul_lb_2', name: 'Seated Leg Curl (Machine)', targetSets: 4, targetReps: '10–12', muscle: 'Hamstrings' },
      { id: 'ul_lb_3', name: 'Goblet Squat', targetSets: 3, targetReps: '10–12', muscle: 'Quads' },
      { id: 'ul_lb_4', name: 'Hip Abduction (Machine)', targetSets: 3, targetReps: '15–20', muscle: 'Glutes' },
      { id: 'ul_lb_5', name: 'Hanging Leg Raise', targetSets: 3, targetReps: '12–15', muscle: 'Lower Abs' },
    ],
  },
];

// ── 3. FULL BODY (3-DAY) ──────────────────────────────────────────────────
const FULL_BODY_WORKOUTS: CuratedWorkout[] = [
  {
    id: 'fb_a',
    name: 'Full Body A',
    subtitle: 'Squat & Chest Anchor',
    focus: 'Full body stimulus revolving around squat and incline press compounds.',
    exercises: [
      { id: 'fb_a_1', name: 'Hack Squat (Machine)', targetSets: 3, targetReps: '8–10', muscle: 'Quads' },
      { id: 'fb_a_2', name: 'Incline Bench Press (Barbell)', targetSets: 3, targetReps: '8–10', muscle: 'Upper Chest' },
      { id: 'fb_a_3', name: 'T Bar Row', targetSets: 3, targetReps: '8–10', muscle: 'Mid-Back' },
      { id: 'fb_a_4', name: 'Lateral Raise (Dumbbell)', targetSets: 3, targetReps: '12–15', muscle: 'Side Delts' },
      { id: 'fb_a_5', name: 'EZ Bar Biceps Curl', targetSets: 3, targetReps: '10–12', muscle: 'Biceps' },
      { id: 'fb_a_6', name: 'Triceps Rope Pushdown', targetSets: 3, targetReps: '10–12', muscle: 'Triceps' },
    ],
  },
  {
    id: 'fb_b',
    name: 'Full Body B',
    subtitle: 'Hinge & Overhead Power',
    focus: 'Posterior chain loading, vertical pressing & vertical pulling.',
    exercises: [
      { id: 'fb_b_1', name: 'Romanian Deadlift (Barbell)', targetSets: 3, targetReps: '8–10', muscle: 'Hamstrings' },
      { id: 'fb_b_2', name: 'Lat Pulldown (Cable)', targetSets: 3, targetReps: '8–10', muscle: 'Lat Width' },
      { id: 'fb_b_3', name: 'Seated Shoulder Press (Machine)', targetSets: 3, targetReps: '8–10', muscle: 'Front Delts' },
      { id: 'fb_b_4', name: 'Butterfly (Pec Deck)', targetSets: 3, targetReps: '10–12', muscle: 'Mid Chest' },
      { id: 'fb_b_5', name: 'Seated Leg Curl (Machine)', targetSets: 3, targetReps: '10–12', muscle: 'Hamstrings' },
      { id: 'fb_b_6', name: 'Standing Calf Raise (Machine)', targetSets: 3, targetReps: '12–15', muscle: 'Calves' },
    ],
  },
  {
    id: 'fb_c',
    name: 'Full Body C',
    subtitle: 'Hypertrophy & Pump',
    focus: 'Leg press volume, dumbbell pressing, close grip rows & arms.',
    exercises: [
      { id: 'fb_c_1', name: 'Leg Press', targetSets: 3, targetReps: '10–12', muscle: 'Quads' },
      { id: 'fb_c_2', name: 'Incline Bench Press (Dumbbell)', targetSets: 3, targetReps: '10–12', muscle: 'Upper Chest' },
      { id: 'fb_c_3', name: 'Seated Cable Row - V Grip (Cable)', targetSets: 3, targetReps: '10–12', muscle: 'Mid-Back' },
      { id: 'fb_c_4', name: 'Face Pull', targetSets: 3, targetReps: '12–15', muscle: 'Rear Delts' },
      { id: 'fb_c_5', name: 'Cross Body Hammer Curl', targetSets: 3, targetReps: '10–12', muscle: 'Brachialis' },
      { id: 'fb_c_6', name: 'Overhead Cable Triceps Extension', targetSets: 3, targetReps: '10–12', muscle: 'Triceps' },
    ],
  },
];

// ── 4. PPL + UPPER / LOWER (5-DAY HYBRID) ──────────────────────────────────
const PPLUL_WORKOUTS: CuratedWorkout[] = [
  {
    id: 'pplul_push',
    name: 'Push (Chest & Delts)',
    subtitle: 'Heavy Push Hypertrophy',
    focus: 'Barbell pressing, lateral raises and triceps overload.',
    exercises: [
      { id: 'pplul_1', name: 'Incline Bench Press (Barbell)', targetSets: 4, targetReps: '6–8', muscle: 'Upper Chest' },
      { id: 'pplul_2', name: 'Butterfly (Pec Deck)', targetSets: 3, targetReps: '10–12', muscle: 'Mid Chest' },
      { id: 'pplul_3', name: 'Lateral Raise (Dumbbell)', targetSets: 4, targetReps: '12–15', muscle: 'Side Delts' },
      { id: 'pplul_4', name: 'Triceps Rope Pushdown', targetSets: 3, targetReps: '10–12', muscle: 'Triceps' },
    ],
  },
  {
    id: 'pplul_pull',
    name: 'Pull (Back & Arms)',
    subtitle: 'Lat Width & Biceps',
    focus: 'Vertical and horizontal rows with biceps flexion.',
    exercises: [
      { id: 'pplul_5', name: 'Lat Pulldown (Cable)', targetSets: 4, targetReps: '8–10', muscle: 'Lat Width' },
      { id: 'pplul_6', name: 'T Bar Row', targetSets: 3, targetReps: '8–10', muscle: 'Mid-Back' },
      { id: 'pplul_7', name: 'Face Pull', targetSets: 3, targetReps: '12–15', muscle: 'Rear Delts' },
      { id: 'pplul_8', name: 'EZ Bar Biceps Curl', targetSets: 3, targetReps: '10–12', muscle: 'Biceps' },
    ],
  },
  {
    id: 'pplul_legs',
    name: 'Legs (Quads & Hams)',
    subtitle: 'Complete Lower Body',
    focus: 'Squats, Romanian deadlifts and calf training.',
    exercises: [
      { id: 'pplul_9', name: 'Hack Squat (Machine)', targetSets: 4, targetReps: '8–10', muscle: 'Quads' },
      { id: 'pplul_10', name: 'Romanian Deadlift (Barbell)', targetSets: 3, targetReps: '8–10', muscle: 'Hamstrings' },
      { id: 'pplul_11', name: 'Leg Extension (Machine)', targetSets: 3, targetReps: '12–15', muscle: 'Quads' },
      { id: 'pplul_12', name: 'Standing Calf Raise (Machine)', targetSets: 4, targetReps: '12–15', muscle: 'Calves' },
    ],
  },
  {
    id: 'pplul_upper',
    name: 'Upper Power',
    subtitle: 'Compound Upper Torso',
    focus: 'Incline dumbbell presses, cable rows and shoulder caps.',
    exercises: [
      { id: 'pplul_13', name: 'Incline Bench Press (Dumbbell)', targetSets: 4, targetReps: '8–10', muscle: 'Upper Chest' },
      { id: 'pplul_14', name: 'Seated Cable Row - V Grip (Cable)', targetSets: 4, targetReps: '8–10', muscle: 'Mid-Back' },
      { id: 'pplul_15', name: 'Seated Shoulder Press (Machine)', targetSets: 3, targetReps: '8–10', muscle: 'Front Delts' },
      { id: 'pplul_16', name: 'Cross Body Hammer Curl', targetSets: 3, targetReps: '10–12', muscle: 'Brachialis' },
    ],
  },
  {
    id: 'pplul_lower',
    name: 'Lower Power',
    subtitle: 'Leg Press & Hamstring Stretch',
    focus: 'High volume leg press, seated curls, calves & core.',
    exercises: [
      { id: 'pplul_17', name: 'Leg Press', targetSets: 4, targetReps: '10–12', muscle: 'Quads' },
      { id: 'pplul_18', name: 'Seated Leg Curl (Machine)', targetSets: 4, targetReps: '10–12', muscle: 'Hamstrings' },
      { id: 'pplul_19', name: 'Standing Calf Raise (Machine)', targetSets: 4, targetReps: '12–15', muscle: 'Calves' },
      { id: 'pplul_20', name: 'Cable Crunch', targetSets: 3, targetReps: '12–15', muscle: 'Abs' },
    ],
  },
];

// ── 5. BRO SPLIT (5-DAY BODYPART) ─────────────────────────────────────────
const BRO_SPLIT_WORKOUTS: CuratedWorkout[] = [
  {
    id: 'bro_chest',
    name: 'Chest Day',
    subtitle: 'Total Chest Hypertrophy',
    focus: 'Incline, flat, flyes and isolation hitting all pectoralis heads.',
    exercises: [
      { id: 'bro_c_1', name: 'Incline Bench Press (Barbell)', targetSets: 4, targetReps: '6–8', muscle: 'Upper Chest' },
      { id: 'bro_c_2', name: 'Incline Bench Press (Dumbbell)', targetSets: 3, targetReps: '8–10', muscle: 'Upper Chest' },
      { id: 'bro_c_3', name: 'Butterfly (Pec Deck)', targetSets: 3, targetReps: '10–12', muscle: 'Mid Chest' },
      { id: 'bro_c_4', name: 'Decline Cable Fly Crossovers', targetSets: 3, targetReps: '12–15', muscle: 'Lower Chest' },
    ],
  },
  {
    id: 'bro_back',
    name: 'Back Day',
    subtitle: 'Width, Thickness & Traps',
    focus: 'T-bar rows, close grip pulldowns, and shrugs.',
    exercises: [
      { id: 'bro_b_1', name: 'Lat Pulldown (Cable)', targetSets: 4, targetReps: '8–10', muscle: 'Lat Width' },
      { id: 'bro_b_2', name: 'T Bar Row', targetSets: 4, targetReps: '8–10', muscle: 'Mid-Back' },
      { id: 'bro_b_3', name: 'Seated Cable Row - V Grip (Cable)', targetSets: 3, targetReps: '10–12', muscle: 'Mid-Back' },
      { id: 'bro_b_4', name: 'Face Pull', targetSets: 3, targetReps: '12–15', muscle: 'Rear Delts' },
    ],
  },
  {
    id: 'bro_shoulders',
    name: 'Shoulder Day',
    subtitle: '3D Deltoid Dominance',
    focus: 'Seated presses, dumbbell and cable lateral raises.',
    exercises: [
      { id: 'bro_s_1', name: 'Seated Shoulder Press (Machine)', targetSets: 4, targetReps: '8–10', muscle: 'Front Delts' },
      { id: 'bro_s_2', name: 'Lateral Raise (Dumbbell)', targetSets: 4, targetReps: '12–15', muscle: 'Side Delts' },
      { id: 'bro_s_3', name: 'Lateral Raise (Cable)', targetSets: 3, targetReps: '12–15', muscle: 'Side Delts' },
      { id: 'bro_s_4', name: 'Rear Delt Reverse Fly (Machine)', targetSets: 3, targetReps: '12–15', muscle: 'Rear Delts' },
    ],
  },
  {
    id: 'bro_legs',
    name: 'Leg Day',
    subtitle: 'Quads, Hams & Calves',
    focus: 'Heavy squats, Romanian deadlifts and calf raises.',
    exercises: [
      { id: 'bro_l_1', name: 'Hack Squat (Machine)', targetSets: 4, targetReps: '8–10', muscle: 'Quads' },
      { id: 'bro_l_2', name: 'Leg Press', targetSets: 3, targetReps: '10–12', muscle: 'Quads' },
      { id: 'bro_l_3', name: 'Romanian Deadlift (Barbell)', targetSets: 3, targetReps: '8–10', muscle: 'Hamstrings' },
      { id: 'bro_l_4', name: 'Seated Leg Curl (Machine)', targetSets: 3, targetReps: '10–12', muscle: 'Hamstrings' },
      { id: 'bro_l_5', name: 'Standing Calf Raise (Machine)', targetSets: 4, targetReps: '12–15', muscle: 'Calves' },
    ],
  },
  {
    id: 'bro_arms',
    name: 'Arm Day (The Gunsmith)',
    subtitle: 'Biceps & Triceps Supersets',
    focus: 'Direct arm hypertrophy hitting long and short heads of biceps and triceps.',
    exercises: [
      { id: 'bro_a_1', name: 'EZ Bar Biceps Curl', targetSets: 4, targetReps: '8–10', muscle: 'Biceps' },
      { id: 'bro_a_2', name: 'Triceps Rope Pushdown', targetSets: 4, targetReps: '10–12', muscle: 'Triceps' },
      { id: 'bro_a_3', name: 'Seated Incline Curl (Dumbbell)', targetSets: 3, targetReps: '10–12', muscle: 'Long Bicep' },
      { id: 'bro_a_4', name: 'Overhead Cable Triceps Extension', targetSets: 3, targetReps: '10–12', muscle: 'Long Tricep' },
      { id: 'bro_a_5', name: 'Cross Body Hammer Curl', targetSets: 3, targetReps: '10–12', muscle: 'Brachialis' },
    ],
  },
];

// ── 6. TORSO / LIMBS (4-DAY) ──────────────────────────────────────────────
const TORSO_LIMBS_WORKOUTS: CuratedWorkout[] = [
  {
    id: 'tl_torso_a',
    name: 'Torso A (Chest & Back)',
    subtitle: 'Antagonist Torso Power',
    focus: 'Incline bench press, barbell rows and lateral deltoids.',
    exercises: [
      { id: 'tl_ta_1', name: 'Incline Bench Press (Barbell)', targetSets: 4, targetReps: '6–8', muscle: 'Upper Chest' },
      { id: 'tl_ta_2', name: 'T Bar Row', targetSets: 4, targetReps: '6–8', muscle: 'Mid-Back' },
      { id: 'tl_ta_3', name: 'Butterfly (Pec Deck)', targetSets: 3, targetReps: '10–12', muscle: 'Mid Chest' },
      { id: 'tl_ta_4', name: 'Lat Pulldown (Cable)', targetSets: 3, targetReps: '8–10', muscle: 'Lat Width' },
      { id: 'tl_ta_5', name: 'Lateral Raise (Dumbbell)', targetSets: 4, targetReps: '12–15', muscle: 'Side Delts' },
    ],
  },
  {
    id: 'tl_limbs_a',
    name: 'Limbs A (Legs & Arms)',
    subtitle: 'Quad Dominance & Arm Pump',
    focus: 'Squats, bicep curls and triceps extension supersets.',
    exercises: [
      { id: 'tl_la_1', name: 'Hack Squat (Machine)', targetSets: 4, targetReps: '8–10', muscle: 'Quads' },
      { id: 'tl_la_2', name: 'Leg Extension (Machine)', targetSets: 3, targetReps: '12–15', muscle: 'Quads' },
      { id: 'tl_la_3', name: 'EZ Bar Biceps Curl', targetSets: 3, targetReps: '10–12', muscle: 'Biceps' },
      { id: 'tl_la_4', name: 'Triceps Rope Pushdown', targetSets: 3, targetReps: '10–12', muscle: 'Triceps' },
      { id: 'tl_la_5', name: 'Standing Calf Raise (Machine)', targetSets: 4, targetReps: '12–15', muscle: 'Calves' },
    ],
  },
  {
    id: 'tl_torso_b',
    name: 'Torso B (Width & Shoulders)',
    subtitle: 'Overhead Power & Lat Width',
    focus: 'Seated shoulder press, close grip pulldowns, and chest flyes.',
    exercises: [
      { id: 'tl_tb_1', name: 'Seated Shoulder Press (Machine)', targetSets: 4, targetReps: '8–10', muscle: 'Front Delts' },
      { id: 'tl_tb_2', name: 'Lat Pulldown - Close Grip (Cable)', targetSets: 4, targetReps: '8–10', muscle: 'Lat Width' },
      { id: 'tl_tb_3', name: 'Incline Bench Press (Dumbbell)', targetSets: 3, targetReps: '8–10', muscle: 'Upper Chest' },
      { id: 'tl_tb_4', name: 'Face Pull', targetSets: 3, targetReps: '12–15', muscle: 'Rear Delts' },
    ],
  },
  {
    id: 'tl_limbs_b',
    name: 'Limbs B (Posterior & Arms)',
    subtitle: 'Hamstrings & Bicep Peak',
    focus: 'Romanian deadlifts, incline bicep curls and overhead triceps.',
    exercises: [
      { id: 'tl_lb_1', name: 'Romanian Deadlift (Barbell)', targetSets: 4, targetReps: '8–10', muscle: 'Hamstrings' },
      { id: 'tl_lb_2', name: 'Seated Leg Curl (Machine)', targetSets: 3, targetReps: '10–12', muscle: 'Hamstrings' },
      { id: 'tl_lb_3', name: 'Seated Incline Curl (Dumbbell)', targetSets: 3, targetReps: '10–12', muscle: 'Long Bicep' },
      { id: 'tl_lb_4', name: 'Overhead Cable Triceps Extension', targetSets: 3, targetReps: '10–12', muscle: 'Long Tricep' },
      { id: 'tl_lb_5', name: 'Standing Calf Raise (Machine)', targetSets: 4, targetReps: '12–15', muscle: 'Calves' },
    ],
  },
];

// ── 7. ARNOLD SPLIT (6-DAY) ───────────────────────────────────────────────
const ARNOLD_WORKOUTS: CuratedWorkout[] = [
  {
    id: 'arnold_chest_back_a',
    name: 'Chest & Back (Thickness)',
    subtitle: 'Antagonist Upper Torso',
    focus: 'Incline pressing paired with T-bar rowing and lat pulldowns.',
    exercises: [
      { id: 'ar_1', name: 'Incline Bench Press (Dumbbell)', targetSets: 4, targetReps: '8–10', muscle: 'Upper Chest' },
      { id: 'ar_2', name: 'Butterfly (Pec Deck)', targetSets: 3, targetReps: '10–12', muscle: 'Mid Chest' },
      { id: 'ar_3', name: 'T Bar Row', targetSets: 4, targetReps: '8–10', muscle: 'Mid-Back' },
      { id: 'ar_4', name: 'Lat Pulldown (Cable)', targetSets: 3, targetReps: '10–12', muscle: 'Lat Width' },
    ],
  },
  {
    id: 'arnold_shoulders_arms_a',
    name: 'Shoulders & Arms A',
    subtitle: '3D Delts & Heavy Arms',
    focus: 'Overhead pressing, lateral raises and heavy bicep/tricep pump.',
    exercises: [
      { id: 'ar_5', name: 'Seated Shoulder Press (Machine)', targetSets: 4, targetReps: '8–10', muscle: 'Front Delts' },
      { id: 'ar_6', name: 'Lateral Raise (Dumbbell)', targetSets: 4, targetReps: '12–15', muscle: 'Side Delts' },
      { id: 'ar_7', name: 'EZ Bar Biceps Curl', targetSets: 3, targetReps: '8–10', muscle: 'Biceps' },
      { id: 'ar_8', name: 'Triceps Rope Pushdown', targetSets: 3, targetReps: '10–12', muscle: 'Triceps' },
    ],
  },
  {
    id: 'arnold_legs_a',
    name: 'Legs & Core A',
    subtitle: 'Quad Focus & Abs',
    focus: 'Heavy hack squats, leg curls, calves and core.',
    exercises: [
      { id: 'ar_9', name: 'Hack Squat (Machine)', targetSets: 4, targetReps: '8–10', muscle: 'Quads' },
      { id: 'ar_10', name: 'Romanian Deadlift (Barbell)', targetSets: 3, targetReps: '8–10', muscle: 'Hamstrings' },
      { id: 'ar_11', name: 'Standing Calf Raise (Machine)', targetSets: 4, targetReps: '12–15', muscle: 'Calves' },
      { id: 'ar_12', name: 'Cable Crunch', targetSets: 3, targetReps: '12–15', muscle: 'Abs' },
    ],
  },
  {
    id: 'arnold_chest_back_b',
    name: 'Chest & Back (Width)',
    subtitle: 'Lat Width & Flyes',
    focus: 'Incline machine pressing, cable flyes and close grip pulldowns.',
    exercises: [
      { id: 'ar_13', name: 'Incline Chest Press (Machine)', targetSets: 4, targetReps: '8–10', muscle: 'Upper Chest' },
      { id: 'ar_14', name: 'Low Cable Fly Crossovers', targetSets: 3, targetReps: '12–15', muscle: 'Upper Chest' },
      { id: 'ar_15', name: 'Lat Pulldown - Close Grip (Cable)', targetSets: 4, targetReps: '8–10', muscle: 'Lat Width' },
      { id: 'ar_16', name: 'Seated Cable Row - V Grip (Cable)', targetSets: 3, targetReps: '10–12', muscle: 'Mid-Back' },
    ],
  },
  {
    id: 'arnold_shoulders_arms_b',
    name: 'Shoulders & Arms (Detail)',
    subtitle: 'Rear Delts & Long Head',
    focus: 'Face pulls, overhead tricep extensions and incline curls.',
    exercises: [
      { id: 'ar_17', name: 'Face Pull', targetSets: 4, targetReps: '12–15', muscle: 'Rear Delts' },
      { id: 'ar_18', name: 'Lateral Raise (Cable)', targetSets: 4, targetReps: '12–15', muscle: 'Side Delts' },
      { id: 'ar_19', name: 'Seated Incline Curl (Dumbbell)', targetSets: 3, targetReps: '10–12', muscle: 'Long Bicep' },
      { id: 'ar_20', name: 'Overhead Cable Triceps Extension', targetSets: 3, targetReps: '10–12', muscle: 'Long Tricep' },
    ],
  },
  {
    id: 'arnold_legs_b',
    name: 'Legs & Core B',
    subtitle: 'Posterior Chain & Core',
    focus: 'Leg press, seated leg curls, calves and hanging leg raises.',
    exercises: [
      { id: 'ar_21', name: 'Leg Press', targetSets: 4, targetReps: '10–12', muscle: 'Quads' },
      { id: 'ar_22', name: 'Seated Leg Curl (Machine)', targetSets: 4, targetReps: '10–12', muscle: 'Hamstrings' },
      { id: 'ar_23', name: 'Standing Calf Raise (Machine)', targetSets: 4, targetReps: '12–15', muscle: 'Calves' },
      { id: 'ar_24', name: 'Hanging Leg Raise', targetSets: 3, targetReps: '12–15', muscle: 'Lower Abs' },
    ],
  },
];

// ── MASTER SPLITS REPOSITORY ──────────────────────────────────────────────
export const CURATED_SPLITS: CuratedSplit[] = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs (PPL)',
    daysPerWeek: 6,
    level: 'Intermediate',
    focus: 'Balanced Hypertrophy',
    description: 'The gold-standard push/pull/legs split hitting each muscle group twice per week with optimal recovery.',
    tags: ['6 Days/Wk', 'Hypertrophy', 'Most Popular'],
    workouts: PPL_WORKOUTS,
    defaultDayMap: { 1: 'ppl_push_a', 2: 'ppl_pull_a', 3: 'ppl_legs_a', 4: 'ppl_push_b', 5: 'ppl_pull_b', 6: 'ppl_legs_b', 7: 'rest' },
    presets: [
      { id: 'mon_sat', name: 'Monday – Saturday', description: 'Train Mon–Sat with Sunday as complete recovery', dayMap: { 1: 'ppl_push_a', 2: 'ppl_pull_a', 3: 'ppl_legs_a', 4: 'ppl_push_b', 5: 'ppl_pull_b', 6: 'ppl_legs_b', 7: 'rest' } },
      { id: 'tue_sun', name: 'Tuesday – Sunday', description: 'Train Tue–Sun with Monday as recovery', dayMap: { 1: 'rest', 2: 'ppl_push_a', 3: 'ppl_pull_a', 4: 'ppl_legs_a', 5: 'ppl_push_b', 6: 'ppl_pull_b', 7: 'ppl_legs_b' } },
    ],
  },
  {
    id: 'arnold',
    name: 'Arnold Split',
    daysPerWeek: 6,
    level: 'Advanced',
    focus: 'Antagonist Supersets',
    description: 'Classic bodybuilding split pairing opposing muscle groups (Chest & Back, Shoulders & Arms) for massive volume and pump.',
    tags: ['6 Days/Wk', 'Volume', 'Bodybuilding'],
    workouts: ARNOLD_WORKOUTS,
    defaultDayMap: { 1: 'arnold_chest_back_a', 2: 'arnold_shoulders_arms_a', 3: 'arnold_legs_a', 4: 'arnold_chest_back_b', 5: 'arnold_shoulders_arms_b', 6: 'arnold_legs_b', 7: 'rest' },
    presets: [
      { id: 'mon_sat', name: 'Monday – Saturday', description: 'Mon–Sat training, Sunday recovery', dayMap: { 1: 'arnold_chest_back_a', 2: 'arnold_shoulders_arms_a', 3: 'arnold_legs_a', 4: 'arnold_chest_back_b', 5: 'arnold_shoulders_arms_b', 6: 'arnold_legs_b', 7: 'rest' } },
      { id: 'tue_sun', name: 'Tuesday – Sunday', description: 'Tue–Sun training, Monday recovery', dayMap: { 1: 'rest', 2: 'arnold_chest_back_a', 3: 'arnold_shoulders_arms_a', 4: 'arnold_legs_a', 5: 'arnold_chest_back_b', 6: 'arnold_shoulders_arms_b', 7: 'arnold_legs_b' } },
    ],
  },
  {
    id: 'upper_lower',
    name: 'Upper / Lower Split',
    daysPerWeek: 4,
    level: 'Intermediate',
    focus: 'Strength & Size',
    description: 'Perfect balance of heavy compound power and recovery, hitting every muscle twice per week over 4 high-yield days.',
    tags: ['4 Days/Wk', 'High Recovery', 'Strength'],
    workouts: UPPER_LOWER_WORKOUTS,
    defaultDayMap: { 1: 'ul_upper_a', 2: 'ul_lower_a', 3: 'rest', 4: 'ul_upper_b', 5: 'ul_lower_b', 6: 'rest', 7: 'rest' },
    presets: [
      { id: 'mon_tue_thu_fri', name: 'Mon, Tue, Thu, Fri', description: 'Upper/Lower, Wednesday active rest, weekends off', dayMap: { 1: 'ul_upper_a', 2: 'ul_lower_a', 3: 'rest', 4: 'ul_upper_b', 5: 'ul_lower_b', 6: 'rest', 7: 'rest' } },
      { id: 'tue_wed_fri_sat', name: 'Tue, Wed, Fri, Sat', description: 'Mid-week and weekend balance', dayMap: { 1: 'rest', 2: 'ul_upper_a', 3: 'ul_lower_a', 4: 'rest', 5: 'ul_upper_b', 6: 'ul_lower_b', 7: 'rest' } },
      { id: 'alt_days', name: 'Alternate Days (Mon, Wed, Fri, Sun)', description: 'Every other day lifting schedule', dayMap: { 1: 'ul_upper_a', 2: 'rest', 3: 'ul_lower_a', 4: 'rest', 5: 'ul_upper_b', 6: 'rest', 7: 'ul_lower_b' } },
    ],
  },
  {
    id: 'pplul',
    name: 'PPL + Upper / Lower (5-Day)',
    daysPerWeek: 5,
    level: 'Advanced',
    focus: 'Optimal Frequency',
    description: 'Combines the best of Push/Pull/Legs with a dedicated Upper and Lower power day for maximum hypertrophy without burnout.',
    tags: ['5 Days/Wk', 'Hypertrophy', 'Hybrid'],
    workouts: PPLUL_WORKOUTS,
    defaultDayMap: { 1: 'pplul_push', 2: 'pplul_pull', 3: 'pplul_legs', 4: 'rest', 5: 'pplul_upper', 6: 'pplul_lower', 7: 'rest' },
    presets: [
      { id: 'mon_fri', name: 'Monday – Friday', description: 'Push, Pull, Legs, Upper, Lower with weekends off', dayMap: { 1: 'pplul_push', 2: 'pplul_pull', 3: 'pplul_legs', 4: 'pplul_upper', 5: 'pplul_lower', 6: 'rest', 7: 'rest' } },
      { id: 'mid_rest', name: 'Mon, Tue, Wed, Fri, Sat', description: 'Thursday & Sunday active recovery days', dayMap: { 1: 'pplul_push', 2: 'pplul_pull', 3: 'pplul_legs', 4: 'rest', 5: 'pplul_upper', 6: 'pplul_lower', 7: 'rest' } },
    ],
  },
  {
    id: 'full_body',
    name: 'Full Body 3-Day',
    daysPerWeek: 3,
    level: 'Beginner',
    focus: 'High Efficiency & Recovery',
    description: 'Hits all major muscle groups 3 times a week with compound lifts. Highly recommended for busy schedules and fast recovery.',
    tags: ['3 Days/Wk', 'Beginner Friendly', 'Time Efficient'],
    workouts: FULL_BODY_WORKOUTS,
    defaultDayMap: { 1: 'fb_a', 2: 'rest', 3: 'fb_b', 4: 'rest', 5: 'fb_c', 6: 'rest', 7: 'rest' },
    presets: [
      { id: 'mon_wed_fri', name: 'Mon, Wed, Fri', description: 'Lift Monday, Wednesday, Friday with weekends completely off', dayMap: { 1: 'fb_a', 2: 'rest', 3: 'fb_b', 4: 'rest', 5: 'fb_c', 6: 'rest', 7: 'rest' } },
      { id: 'tue_thu_sat', name: 'Tue, Thu, Sat', description: 'Lift Tuesday, Thursday, Saturday', dayMap: { 1: 'rest', 2: 'fb_a', 3: 'rest', 4: 'fb_b', 5: 'rest', 6: 'fb_c', 7: 'rest' } },
    ],
  },
  {
    id: 'bro_split',
    name: 'Classic Bro Split (5-Day)',
    daysPerWeek: 5,
    level: 'Intermediate',
    focus: 'Single Muscle Isolation',
    description: 'The golden-era bodybuilding standard: dedicate an entire high-volume session to one muscle group per day.',
    tags: ['5 Days/Wk', 'Isolation', 'High Pump'],
    workouts: BRO_SPLIT_WORKOUTS,
    defaultDayMap: { 1: 'bro_chest', 2: 'bro_back', 3: 'bro_shoulders', 4: 'bro_legs', 5: 'bro_arms', 6: 'rest', 7: 'rest' },
    presets: [
      { id: 'mon_fri', name: 'Monday – Friday', description: 'Chest, Back, Shoulders, Legs, Arms with weekends off', dayMap: { 1: 'bro_chest', 2: 'bro_back', 3: 'bro_shoulders', 4: 'bro_legs', 5: 'bro_arms', 6: 'rest', 7: 'rest' } },
    ],
  },
  {
    id: 'torso_limbs',
    name: 'Torso / Limbs (4-Day)',
    daysPerWeek: 4,
    level: 'Intermediate',
    focus: 'Arm & Torso Sculpt',
    description: 'Separates upper torso (Chest, Back, Delts) from limbs (Quads, Hamstrings, Biceps, Triceps) for extreme arm and chest focus.',
    tags: ['4 Days/Wk', 'Arm Focus', 'Aesthetic'],
    workouts: TORSO_LIMBS_WORKOUTS,
    defaultDayMap: { 1: 'tl_torso_a', 2: 'tl_limbs_a', 3: 'rest', 4: 'tl_torso_b', 5: 'tl_limbs_b', 6: 'rest', 7: 'rest' },
    presets: [
      { id: 'mon_tue_thu_fri', name: 'Mon, Tue, Thu, Fri', description: 'Torso/Limbs with Wednesday and weekend recovery', dayMap: { 1: 'tl_torso_a', 2: 'tl_limbs_a', 3: 'rest', 4: 'tl_torso_b', 5: 'tl_limbs_b', 6: 'rest', 7: 'rest' } },
    ],
  },
];
