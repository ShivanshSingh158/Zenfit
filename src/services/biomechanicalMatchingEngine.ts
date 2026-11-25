/**
 * biomechanicalMatchingEngine.ts — ZenFit
 *
 * Exercise Swap Intelligence (Section 6.1 & 6.2)
 * Biomechanical Matching Engine (Hierarchy of Substitutions)
 *
 * When an athlete taps Swap Exercise because a gym machine is occupied or broken,
 * this engine eliminates generic random 400-exercise lists and presents:
 * 1. Top 3 Biomechanically Identical Substitutes (fiber alignment, movement vector, plane of drive).
 * 2. Equipment Variants (Dumbbell, Cable, Machine, Barbell, Bodyweight alternatives).
 *
 * Each recommendation provides:
 * - Movement Name & Equipment
 * - Biomechanical Match Badge: e.g. [ 98% Match · Upper Pecs ]
 * - Science-Based Reason: e.g. "Identical 30° clavicular angle with higher mechanical stability."
 * - 1-Tap Swap CTA parameters
 */

import {
  normalizeExerciseKey,
  resolveExerciseTargetMuscle,
  canonicalizeMuscle,
  getBiomechanicalPrescription,
} from '../utils/gymUtils';
import { resolveExerciseEquipment, EquipmentCategory } from '../utils/equipmentResolver';

export interface BiomechanicalSwapRecommendation {
  id: string;
  name: string;
  equipment: EquipmentCategory;
  targetMuscle: string;
  muscleDivision: string;
  matchPercentage: number;
  reason: string;
  targetSets: number;
  targetReps: string;
  restTimeSecs: number;
  videoId?: string;
  isEquipmentVariant?: boolean;
}

export interface BiomechanicalSwapResult {
  directSubstitutes: BiomechanicalSwapRecommendation[]; // Top 3 identical substitutes
  equipmentVariants: BiomechanicalSwapRecommendation[]; // Alternatives with different equipment
  allSubstitutes: BiomechanicalSwapRecommendation[];
  originalName: string;
  originalEquipment: EquipmentCategory;
  targetDivision: string;
}

interface BiomechanicalProfile {
  division: string;
  movementVector: string;
  alternatives: {
    name: string;
    equipment: EquipmentCategory;
    matchPercentage: number;
    reason: string;
    targetSets?: number;
    targetReps?: string;
    restTimeSecs?: number;
    videoId?: string;
  }[];
}

const BIOMECHANICAL_PROFILES: Record<string, BiomechanicalProfile> = {
  // ── UPPER CHEST (Clavicular Head) ──
  upper_chest: {
    division: 'Upper Chest',
    movementVector: '30°–45° Incline Press / Low-to-High Adduction',
    alternatives: [
      {
        name: 'Incline Dumbbell Press',
        equipment: 'Dumbbell',
        matchPercentage: 98,
        reason: 'Identical 30° clavicular angle with greater humeral adduction freedom and loaded stretch.',
        targetSets: 3,
        targetReps: '8–10',
        restTimeSecs: 120,
        videoId: '8iPEnn-ltC8',
      },
      {
        name: 'Low-to-High Cable Fly',
        equipment: 'Cable',
        matchPercentage: 96,
        reason: 'Matches clavicular fiber alignment with constant peak mechanical tension at terminal contraction.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 75,
        videoId: 'M1nNA_Z1Gg0',
      },
      {
        name: 'Smith Machine Incline Press',
        equipment: 'Machine',
        matchPercentage: 95,
        reason: 'Fixed 30° clavicular track eliminates stabilizer fatigue to maximize motor unit recruitment.',
        targetSets: 3,
        targetReps: '8–10',
        restTimeSecs: 120,
        videoId: '8kX1b5s3C8U',
      },
      {
        name: 'Incline Chest Press (Machine)',
        equipment: 'Machine',
        matchPercentage: 94,
        reason: 'Converging mechanical arc safely isolates upper pec fibers with zero balance limitation.',
        targetSets: 3,
        targetReps: '8–12',
        restTimeSecs: 90,
        videoId: '8kX1b5s3C8U',
      },
      {
        name: 'Incline Barbell Bench Press',
        equipment: 'Barbell',
        matchPercentage: 91,
        reason: 'Heavy compound power variant maximizing absolute motor unit recruitment and axial loading.',
        targetSets: 4,
        targetReps: '6–8',
        restTimeSecs: 150,
        videoId: 'SrqOu55lrYU',
      },
      {
        name: 'Feet-Elevated Push-Ups',
        equipment: 'None',
        matchPercentage: 86,
        reason: 'Zero-equipment calisthenic variant mimicking 30° pressing plane with bodyweight resistance.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 60,
      },
    ],
  },

  // ── MID & LOWER CHEST (Sternal & Costal Pecs) ──
  sternal_chest: {
    division: 'Mid/Lower Chest',
    movementVector: 'Flat/Decline Horizontal Pressing & Adduction',
    alternatives: [
      {
        name: 'Flat Dumbbell Bench Press',
        equipment: 'Dumbbell',
        matchPercentage: 98,
        reason: 'Direct horizontal adduction across sternal fibers with deeper stretch and wrist freedom.',
        targetSets: 3,
        targetReps: '8–10',
        restTimeSecs: 120,
        videoId: 'VmB1G1K7v94',
      },
      {
        name: 'Chest Dip (Bodyweight / Weighted)',
        equipment: 'None',
        matchPercentage: 96,
        reason: 'Supreme lower/costal pec recruitment through high-threshold mechanical load and deep stretch.',
        targetSets: 3,
        targetReps: '8–12',
        restTimeSecs: 90,
        videoId: '2z8JmcrW-As',
      },
      {
        name: 'Standing Cable Fly / Crossover',
        equipment: 'Cable',
        matchPercentage: 95,
        reason: 'Continuous resistance curve overloading sternal pecs in the fully shortened peak position.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 75,
        videoId: 'taI4XduLpBe',
      },
      {
        name: 'Seated Chest Press (Machine)',
        equipment: 'Machine',
        matchPercentage: 94,
        reason: 'Fixed planar stability allows pushing safely to true concentric failure without a spotter.',
        targetSets: 3,
        targetReps: '8–12',
        restTimeSecs: 90,
        videoId: 'xUm0BiZCWlQ',
      },
      {
        name: 'Barbell Flat Bench Press',
        equipment: 'Barbell',
        matchPercentage: 92,
        reason: 'Heavy barbell compound delivering maximal absolute tension to the sternocostal chest.',
        targetSets: 4,
        targetReps: '6–8',
        restTimeSecs: 150,
        videoId: 'rT7DgCr-3pg',
      },
      {
        name: 'Pec Deck Fly (Machine)',
        equipment: 'Machine',
        matchPercentage: 91,
        reason: 'Pure horizontal adduction isolation removing tricep fatigue from the hypertrophy equation.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 75,
        videoId: 'O-OnM9KzDqM',
      },
    ],
  },

  // ── LATS (Vertical Pull / Width) ──
  lats_width: {
    division: 'Lats (Width)',
    movementVector: 'Frontal/Coronal Plane Vertical Pull & Extension',
    alternatives: [
      {
        name: 'Neutral-Grip Lat Pulldown',
        equipment: 'Cable',
        matchPercentage: 98,
        reason: 'Coronal plane pull matching latissimus fiber alignment with joint-friendly shoulder rotation.',
        targetSets: 3,
        targetReps: '8–10',
        restTimeSecs: 90,
        videoId: 'CAwf7n6Luuc',
      },
      {
        name: 'Weighted Pull-Up',
        equipment: 'None',
        matchPercentage: 96,
        reason: 'High-threshold vertical pull maximizing motor unit firing across lats and lower traps.',
        targetSets: 3,
        targetReps: '6–8',
        restTimeSecs: 150,
        videoId: 'eGo4IYlbE5g',
      },
      {
        name: 'Half-Kneeling Single-Arm Cable Pulldown',
        equipment: 'Cable',
        matchPercentage: 95,
        reason: 'Direct line of pull aligned with iliac lat fibers with unrestricted unilateral scapular glide.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 75,
        videoId: 'CAwf7n6Luuc',
      },
      {
        name: 'Straight-Arm Cable Pulldown',
        equipment: 'Cable',
        matchPercentage: 93,
        reason: 'Pure shoulder extension isolation hitting lats across full ROM without bicep involvement.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 60,
        videoId: 'GIZ9tU-P3q4',
      },
      {
        name: 'Machine Lat Pulldown',
        equipment: 'Machine',
        matchPercentage: 92,
        reason: 'Guided diverging motion provides exceptional stability and peak squeeze in the bottom position.',
        targetSets: 3,
        targetReps: '8–12',
        restTimeSecs: 90,
        videoId: 'CAwf7n6Luuc',
      },
      {
        name: 'Dumbbell Pullover',
        equipment: 'Dumbbell',
        matchPercentage: 88,
        reason: 'Extreme deep lat stretch under load across thoracic extension on a flat bench.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 75,
      },
    ],
  },

  // ── UPPER BACK & RHOMBOIDS (Horizontal Pull / Thickness) ──
  upper_back_thickness: {
    division: 'Upper Back & Traps',
    movementVector: 'Horizontal Pulling & Scapular Retraction',
    alternatives: [
      {
        name: 'Chest-Supported T-Bar Row',
        equipment: 'Machine',
        matchPercentage: 98,
        reason: 'Chest pad eliminates lower back fatigue, allowing rhomboids and mid-traps to reach true failure.',
        targetSets: 3,
        targetReps: '8–10',
        restTimeSecs: 120,
        videoId: 'TyLoy3n_a10',
      },
      {
        name: 'Chest-Supported Machine Row',
        equipment: 'Machine',
        matchPercentage: 97,
        reason: 'Fixed converging path delivers high stability for pure scapular retractor recruitment.',
        targetSets: 3,
        targetReps: '8–12',
        restTimeSecs: 90,
        videoId: 'TyLoy3n_a10',
      },
      {
        name: 'Seated Wide-Grip Cable Row',
        equipment: 'Cable',
        matchPercentage: 95,
        reason: 'Flared elbow path directs 100% of line of pull to rhomboids, rear delts, and middle trapezius.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 90,
        videoId: 'GZbfZ033f74',
      },
      {
        name: 'Dumbbell Seal Row',
        equipment: 'Dumbbell',
        matchPercentage: 94,
        reason: 'Zero lumbar shear with full independent elbow flare for complete upper back contraction.',
        targetSets: 3,
        targetReps: '8–10',
        restTimeSecs: 90,
        videoId: 'roCP6wCXPqo',
      },
      {
        name: 'Barbell Bent-Over Row',
        equipment: 'Barbell',
        matchPercentage: 90,
        reason: 'Dense posterior chain compound maximizing total upper body pulling power and back mass.',
        targetSets: 4,
        targetReps: '6–8',
        restTimeSecs: 150,
        videoId: 'FWJR5Ve8gkQ',
      },
      {
        name: 'Inverted Row (Bodyweight)',
        equipment: 'None',
        matchPercentage: 86,
        reason: 'Joint-friendly calisthenic horizontal pull targeting scapular retractors with zero equipment.',
        targetSets: 3,
        targetReps: '10–15',
        restTimeSecs: 60,
      },
    ],
  },

  // ── SIDE DELTS (Lateral Abduction) ──
  side_delts: {
    division: 'Side Delts',
    movementVector: 'Scapular Plane Lateral Abduction (15°–30° Forward)',
    alternatives: [
      {
        name: 'Cable Lateral Raise',
        equipment: 'Cable',
        matchPercentage: 98,
        reason: 'Provides continuous resistance from the very start of abduction where dumbbells offer zero load.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 60,
        videoId: 'PPrzBWZDOhA',
      },
      {
        name: 'Machine Lateral Raise',
        equipment: 'Machine',
        matchPercentage: 96,
        reason: 'Bypasses grip and forearm fatigue to direct 100% of mechanical tension into the medial deltoid.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 75,
        videoId: 'PPrzBWZDOhA',
      },
      {
        name: 'Dumbbell Lateral Raise',
        equipment: 'Dumbbell',
        matchPercentage: 95,
        reason: 'Gold-standard free weight abduction overloading the lateral deltoid in peak shortened position.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 60,
        videoId: '3VcKaXpzqRo',
      },
      {
        name: 'Behind-the-Back Cable Lateral Raise',
        equipment: 'Cable',
        matchPercentage: 94,
        reason: 'Places lateral deltoid under intense stretch loading right from the bottom of the movement.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 60,
        videoId: 'PPrzBWZDOhA',
      },
      {
        name: 'Lean-Away Dumbbell Lateral Raise',
        equipment: 'Dumbbell',
        matchPercentage: 90,
        reason: 'Alters gravitational torque curve to maintain tension through an extended range of motion.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 60,
      },
    ],
  },

  // ── FRONT DELTS / OVERHEAD PRESS ──
  front_delts: {
    division: 'Front Delts',
    movementVector: 'Vertical Pressing & Shoulder Flexion',
    alternatives: [
      {
        name: 'Seated Dumbbell Shoulder Press',
        equipment: 'Dumbbell',
        matchPercentage: 98,
        reason: 'Natural converging pressing arc protects the glenohumeral joint while overloading anterior delts.',
        targetSets: 3,
        targetReps: '8–10',
        restTimeSecs: 120,
        videoId: 'qEwKCR5JCog',
      },
      {
        name: 'Machine Overhead Press',
        equipment: 'Machine',
        matchPercentage: 96,
        reason: 'Fixed vertical track provides maximum mechanical stability without balance limitations.',
        targetSets: 3,
        targetReps: '8–12',
        restTimeSecs: 90,
        videoId: 'qEwKCR5JCog',
      },
      {
        name: 'Standing Barbell Overhead Press',
        equipment: 'Barbell',
        matchPercentage: 95,
        reason: 'Full-body kinetic chain compound maximizing total vertical power and anterior delt mass.',
        targetSets: 4,
        targetReps: '6–8',
        restTimeSecs: 150,
        videoId: '2yjwXTZQDDI',
      },
      {
        name: 'Arnold Press (Dumbbell)',
        equipment: 'Dumbbell',
        matchPercentage: 92,
        reason: 'Rotational trajectory recruits anterior deltoid fibers across an expanded active arc.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 90,
        videoId: 'qEwKCR5JCog',
      },
      {
        name: 'Pike Push-Ups (Elevated)',
        equipment: 'None',
        matchPercentage: 86,
        reason: 'Bodyweight overhead pressing alternative requiring zero equipment.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 60,
      },
    ],
  },

  // ── REAR DELTS (Horizontal Abduction / Extension) ──
  rear_delts: {
    division: 'Rear Delts',
    movementVector: 'Horizontal Shoulder Abduction & External Rotation',
    alternatives: [
      {
        name: 'Reverse Pec Deck (Machine)',
        equipment: 'Machine',
        matchPercentage: 98,
        reason: 'Strict isolation eliminating momentum and tricep push, locking directly onto the posterior deltoid.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 75,
        videoId: '5Ywt7tZ6b1o',
      },
      {
        name: 'Cross-Cable Rear Delt Fly',
        equipment: 'Cable',
        matchPercentage: 96,
        reason: 'Continuous resistance curve aligned precisely with posterior deltoid fiber orientation.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 60,
        videoId: '5Ywt7tZ6b1o',
      },
      {
        name: 'Incline Bench Dumbbell Reverse Fly',
        equipment: 'Dumbbell',
        matchPercentage: 95,
        reason: 'Chest support prevents torso swinging for pure horizontal abduction under dumbbell load.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 60,
        videoId: 'H530fW3kWkg',
      },
      {
        name: 'Cable Face Pull (with External Rotation)',
        equipment: 'Cable',
        matchPercentage: 93,
        reason: 'Combines horizontal abduction with external rotation to build rear delts and shoulder durability.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 60,
        videoId: 'rep-qVOkqgk',
      },
    ],
  },

  // ── QUADS (Knee Extension Dominant) ──
  quads: {
    division: 'Quads',
    movementVector: 'Knee Flexion & Extension Overload',
    alternatives: [
      {
        name: 'Hack Squat (Machine)',
        equipment: 'Machine',
        matchPercentage: 98,
        reason: 'Back pad transfers 100% of force to knee extension without lower back or balance failure.',
        targetSets: 3,
        targetReps: '8–10',
        restTimeSecs: 120,
        videoId: '0tn5K9NlCfo',
      },
      {
        name: 'Leg Press (45°)',
        equipment: 'Machine',
        matchPercentage: 97,
        reason: 'Supreme quad loading capacity with zero spinal axial compression.',
        targetSets: 3,
        targetReps: '8–12',
        restTimeSecs: 120,
        videoId: 'IZxyjW7MPJQ',
      },
      {
        name: 'Leg Extension (Machine)',
        equipment: 'Machine',
        matchPercentage: 96,
        reason: 'The only exercise overloading the rectus femoris in its fully shortened knee extension lockout.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 75,
        videoId: 'YyvSfVjQeL0',
      },
      {
        name: 'Smith Machine Squat',
        equipment: 'Machine',
        matchPercentage: 94,
        reason: 'Allows feet-forward positioning to deepen knee flexion angle and isolate vastus muscles.',
        targetSets: 3,
        targetReps: '8–10',
        restTimeSecs: 120,
        videoId: 'MVMNK0HiTMg',
      },
      {
        name: 'Barbell Back Squat',
        equipment: 'Barbell',
        matchPercentage: 93,
        reason: 'Systemic compound king for high motor unit drive and functional quad loading.',
        targetSets: 4,
        targetReps: '6–8',
        restTimeSecs: 150,
        videoId: 'bEv6CCg2BC8',
      },
      {
        name: 'Bulgarian Split Squat (Dumbbell)',
        equipment: 'Dumbbell',
        matchPercentage: 92,
        reason: 'Unilateral quad overload with deep hip flexion and extreme stretch on the working quad.',
        targetSets: 3,
        targetReps: '8–10',
        restTimeSecs: 90,
        videoId: '2C-uNgKwPLE',
      },
      {
        name: 'Goblet Squat (Dumbbell / Kettlebell)',
        equipment: 'Dumbbell',
        matchPercentage: 88,
        reason: 'Front-loaded counterbalance encourages upright torso for high knee flexion targeting quads.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 75,
      },
    ],
  },

  // ── HAMSTRINGS (Knee Flexion & Hip Hinge) ──
  hamstrings: {
    division: 'Hamstrings',
    movementVector: 'Knee Flexion / Hip Extension Hinge',
    alternatives: [
      {
        name: 'Seated Leg Curl (Machine)',
        equipment: 'Machine',
        matchPercentage: 98,
        reason: 'Flexed hip position pre-stretches the hamstrings, triggering stretch-mediated hypertrophy.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 75,
        videoId: 'ELOCsoDSmrg',
      },
      {
        name: 'Lying Leg Curl (Machine)',
        equipment: 'Machine',
        matchPercentage: 97,
        reason: 'Pure knee flexion isolation targeting all three hamstring heads without spinal loading.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 75,
        videoId: '1Tq3QdYUuHs',
      },
      {
        name: 'Romanian Deadlift (Barbell)',
        equipment: 'Barbell',
        matchPercentage: 96,
        reason: 'Supreme eccentric stretch overload for semitendinosus and semimembranosus under heavy load.',
        targetSets: 3,
        targetReps: '8–10',
        restTimeSecs: 120,
        videoId: 'JCXUYuzwNrM',
      },
      {
        name: 'Dumbbell Romanian Deadlift',
        equipment: 'Dumbbell',
        matchPercentage: 95,
        reason: 'Independent dumbbell track stays closer to hips to reduce spinal shear during the hinge stretch.',
        targetSets: 3,
        targetReps: '8–10',
        restTimeSecs: 90,
        videoId: 'JCXUYuzwNrM',
      },
      {
        name: 'Nordic Hamstring Curl',
        equipment: 'None',
        matchPercentage: 92,
        reason: 'Intense eccentric knee flexion overload with proven hypertrophy and tendon protective benefits.',
        targetSets: 3,
        targetReps: '5–8',
        restTimeSecs: 120,
      },
    ],
  },

  // ── GLUTES (Hip Thrust / Abduction) ──
  glutes: {
    division: 'Glutes',
    movementVector: 'Sagittal Hip Extension & Abduction',
    alternatives: [
      {
        name: 'Barbell Hip Thrust',
        equipment: 'Barbell',
        matchPercentage: 98,
        reason: 'Maximal horizontal hip extension force with peak mechanical tension in full glute contraction.',
        targetSets: 3,
        targetReps: '8–10',
        restTimeSecs: 120,
        videoId: 'xDmFkJxPzeM',
      },
      {
        name: 'Machine Hip Thrust',
        equipment: 'Machine',
        matchPercentage: 97,
        reason: 'Streamlined setup with constant torque and safe posterior pelvic tilt enforcement.',
        targetSets: 3,
        targetReps: '8–12',
        restTimeSecs: 90,
        videoId: 'xDmFkJxPzeM',
      },
      {
        name: 'Cable Glute Kickback',
        equipment: 'Cable',
        matchPercentage: 95,
        reason: 'Direct line of pull aligned with gluteus maximus fibers with zero lower back strain.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 60,
        videoId: 'wW_2Qx8D49E',
      },
      {
        name: '45° Hyperextension (Glute Focus)',
        equipment: 'None',
        matchPercentage: 93,
        reason: 'Rounded upper spine posture concentrates 100% of hip extension torque onto the glutes.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 75,
      },
      {
        name: 'Seated Hip Abduction (Machine)',
        equipment: 'Machine',
        matchPercentage: 92,
        reason: 'Direct isolation for gluteus medius and minimus across the coronal plane.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 60,
        videoId: 'O-OnM9KzDqM',
      },
    ],
  },

  // ── BICEPS (Elbow Flexion & Supination) ──
  biceps: {
    division: 'Biceps',
    movementVector: 'Elbow Flexion & Forearm Supination',
    alternatives: [
      {
        name: 'Incline Dumbbell Curl',
        equipment: 'Dumbbell',
        matchPercentage: 98,
        reason: 'Shoulder extension posture places the bicep long head under extreme loaded stretch.',
        targetSets: 3,
        targetReps: '8–10',
        restTimeSecs: 90,
        videoId: 'soxrZlIl35U',
      },
      {
        name: 'Preacher Curl (EZ-Bar)',
        equipment: 'Barbell',
        matchPercentage: 97,
        reason: 'Pad arm support eliminates shoulder cheating to heavily overload the first half of the curl.',
        targetSets: 3,
        targetReps: '8–10',
        restTimeSecs: 90,
        videoId: 'fIWP-FRFNU0',
      },
      {
        name: 'Bayesian Cable Curl',
        equipment: 'Cable',
        matchPercentage: 96,
        reason: 'Backward cable resistance delivers continuous tension with deep stretch throughout the rep.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 75,
        videoId: 'ykJmrZ5v0Oo',
      },
      {
        name: 'Standing Dumbbell Curl',
        equipment: 'Dumbbell',
        matchPercentage: 95,
        reason: 'Allows complete supination through the concentric phase for full bicep recruitment.',
        targetSets: 3,
        targetReps: '8–12',
        restTimeSecs: 75,
        videoId: 'sAq_ocpRh_I',
      },
      {
        name: 'Dumbbell Hammer Curl',
        equipment: 'Dumbbell',
        matchPercentage: 93,
        reason: 'Neutral grip overloads brachialis and brachioradialis for upper arm thickness.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 75,
        videoId: 'zC3Ey7qlun8',
      },
      {
        name: 'Chin-Up (Underhand Grip)',
        equipment: 'None',
        matchPercentage: 90,
        reason: 'High absolute load compound curl utilizing bodyweight and vertical lat assistance.',
        targetSets: 3,
        targetReps: '6–8',
        restTimeSecs: 120,
      },
    ],
  },

  // ── TRICEPS (Elbow Extension) ──
  triceps: {
    division: 'Triceps',
    movementVector: 'Elbow Extension Overload',
    alternatives: [
      {
        name: 'Overhead Cable Triceps Extension',
        equipment: 'Cable',
        matchPercentage: 98,
        reason: 'Shoulder flexion posture places the tricep long head under maximal stretch for superior growth.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 75,
        videoId: '1u18yJmLHQ0',
      },
      {
        name: 'Tricep Rope Pushdown',
        equipment: 'Cable',
        matchPercentage: 97,
        reason: 'Allows hand flare at lockout to achieve peak contraction of the lateral and medial heads.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 60,
        videoId: '2-LAMcpzODU',
      },
      {
        name: 'EZ-Bar Skullcrusher',
        equipment: 'Barbell',
        matchPercentage: 96,
        reason: 'Heavy eccentric load on long and lateral heads with an ergonomic, wrist-friendly bar angle.',
        targetSets: 3,
        targetReps: '8–10',
        restTimeSecs: 90,
        videoId: 'd_KZxkY_0cM',
      },
      {
        name: 'Cross-Body Cable Triceps Extension',
        equipment: 'Cable',
        matchPercentage: 95,
        reason: 'Direct mechanical alignment with tricep long head fibers with zero elbow joint shearing.',
        targetSets: 3,
        targetReps: '10–12',
        restTimeSecs: 60,
        videoId: '1u18yJmLHQ0',
      },
      {
        name: 'Close-Grip Barbell Bench Press',
        equipment: 'Barbell',
        matchPercentage: 92,
        reason: 'Compound heavy overload delivering high absolute tonnage to triceps and front delts.',
        targetSets: 3,
        targetReps: '6–8',
        restTimeSecs: 120,
        videoId: 'nEF0bv2FW94',
      },
      {
        name: 'Bench Dips / Parallel Bar Dips',
        equipment: 'None',
        matchPercentage: 88,
        reason: 'Accessible bodyweight extension overloading triceps in the bottom stretched position.',
        targetSets: 3,
        targetReps: '10–15',
        restTimeSecs: 60,
      },
    ],
  },

  // ── CALVES ──
  calves: {
    division: 'Calves',
    movementVector: 'Plantarflexion',
    alternatives: [
      {
        name: 'Standing Calf Raise (Machine)',
        equipment: 'Machine',
        matchPercentage: 98,
        reason: 'Straight-knee position fully engages the gastrocnemius under deep loaded dorsiflexion.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 60,
      },
      {
        name: 'Seated Calf Raise (Machine)',
        equipment: 'Machine',
        matchPercentage: 96,
        reason: 'Bent-knee posture slackens gastrocnemius to isolate the deeper, fatigue-resistant soleus.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 60,
      },
      {
        name: 'Leg Press Calf Raise',
        equipment: 'Machine',
        matchPercentage: 95,
        reason: 'Huge loading potential with zero spinal compression, emphasizing full ankle excursion.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 60,
      },
      {
        name: 'Single-Leg Dumbbell Calf Raise',
        equipment: 'Dumbbell',
        matchPercentage: 92,
        reason: 'Unilateral free-weight option with deep stretch on a step, correcting left/right balance.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 60,
      },
    ],
  },

  // ── ABS & CORE ──
  abs: {
    division: 'Abs & Core',
    movementVector: 'Spinal Flexion & Pelvic Posterior Tilt',
    alternatives: [
      {
        name: 'Kneeling Cable Crunch',
        equipment: 'Cable',
        matchPercentage: 98,
        reason: 'Progressive overload for rectus abdominis with constant resistance throughout spinal flexion.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 60,
      },
      {
        name: 'Hanging Leg Raise',
        equipment: 'None',
        matchPercentage: 96,
        reason: 'Overloads the lower abdominal region and hip flexors through full posterior pelvic tilt.',
        targetSets: 3,
        targetReps: '10–15',
        restTimeSecs: 60,
      },
      {
        name: 'Ab Roller Wheel',
        equipment: 'None',
        matchPercentage: 94,
        reason: 'Intense anti-extension core stability putting abdominal wall under extreme eccentric strain.',
        targetSets: 3,
        targetReps: '8–12',
        restTimeSecs: 75,
      },
      {
        name: 'Decline Weighted Crunch',
        equipment: 'Plate',
        matchPercentage: 92,
        reason: 'Extended range of spinal extension at the bottom for loaded stretch on rectus abdominis.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 60,
      },
    ],
  },

  // ── FOREARMS & GRIP ──
  forearms: {
    division: 'Forearms',
    movementVector: 'Wrist Flexion / Extension & Radial Deviation',
    alternatives: [
      {
        name: 'Behind the Back Wrist Curl (Barbell)',
        equipment: 'Barbell',
        matchPercentage: 98,
        reason: 'Heavy bilateral wrist flexor overload in anatomical hang without elbow stress.',
        targetSets: 3,
        targetReps: '12–20',
        restTimeSecs: 60,
      },
      {
        name: 'Seated Palms Up Wrist Curl',
        equipment: 'Dumbbell',
        matchPercentage: 96,
        reason: 'Isolates forearm flexors on a bench with independent wrist range of motion.',
        targetSets: 3,
        targetReps: '15–20',
        restTimeSecs: 60,
      },
      {
        name: 'Wrist Curl (Machine)',
        equipment: 'Machine',
        matchPercentage: 95,
        reason: 'Fixed resistance curve through full wrist flexion and finger-tip extension.',
        targetSets: 3,
        targetReps: '15–20',
        restTimeSecs: 60,
      },
      {
        name: 'Reverse Curl (Cable)',
        equipment: 'Cable',
        matchPercentage: 92,
        reason: 'Targets brachioradialis and forearm extensors under smooth constant cable tension.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 60,
      },
      {
        name: 'Reverse Wrist Curl (Dumbbell)',
        equipment: 'Dumbbell',
        matchPercentage: 90,
        reason: 'Balances extensor strength to stabilize the wrist during heavy pressing and pulling.',
        targetSets: 3,
        targetReps: '15–20',
        restTimeSecs: 60,
      },
      {
        name: 'Dead Hang',
        equipment: 'None',
        matchPercentage: 88,
        reason: 'Isometric crush-grip endurance and spinal decompression.',
        targetSets: 3,
        targetReps: '30–60s',
        restTimeSecs: 60,
      },
    ],
  },

  // ── LOWER BACK & SPINAL ERECTORS ──
  lower_back: {
    division: 'Lower Back',
    movementVector: 'Spinal Extension & Posterior Hip Hinge',
    alternatives: [
      {
        name: 'Back Extension (Hyperextension)',
        equipment: 'None',
        matchPercentage: 98,
        reason: 'Direct isometric and dynamic loading of the spinal erectors at 45 degrees.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 75,
      },
      {
        name: 'Back Extension (Weighted Hyperextension)',
        equipment: 'Plate',
        matchPercentage: 97,
        reason: 'Progressive plate-loaded spinal extension with controlled eccentric stretch.',
        targetSets: 3,
        targetReps: '10–15',
        restTimeSecs: 90,
      },
      {
        name: 'Back Extension (Machine)',
        equipment: 'Machine',
        matchPercentage: 94,
        reason: 'Selectorized lumbar extension with repeatable resistance profile.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 75,
      },
      {
        name: 'Romanian Deadlift (Barbell)',
        equipment: 'Barbell',
        matchPercentage: 91,
        reason: 'High-tension hip hinge building deep lower-back isometric bracing strength.',
        targetSets: 3,
        targetReps: '6–10',
        restTimeSecs: 120,
      },
      {
        name: 'Reverse Hyperextension',
        equipment: 'Machine',
        matchPercentage: 90,
        reason: 'Decompressive posterior chain extension strengthening glutes and erectors.',
        targetSets: 3,
        targetReps: '12–15',
        restTimeSecs: 75,
      },
    ],
  },

  // ── CONDITIONING & CARRIES ──
  conditioning: {
    division: 'Conditioning',
    movementVector: 'Loaded Locomotion & Metabolic Power Output',
    alternatives: [
      {
        name: 'Kettlebell Swing',
        equipment: 'Kettlebell',
        matchPercentage: 96,
        reason: 'Explosive posterior-chain hip snap driving aerobic and anaerobic work capacity.',
        targetSets: 3,
        targetReps: '15–20',
        restTimeSecs: 60,
      },
      {
        name: 'Farmers Walk',
        equipment: 'Dumbbell',
        matchPercentage: 94,
        reason: 'Loaded full-body carry taxing core bracing, traps, grip, and work capacity.',
        targetSets: 3,
        targetReps: '40m',
        restTimeSecs: 75,
      },
      {
        name: 'Sled Push',
        equipment: 'Machine',
        matchPercentage: 93,
        reason: 'Concentric-only lower-body conditioning with minimal eccentric soreness.',
        targetSets: 4,
        targetReps: '20–30m',
        restTimeSecs: 75,
      },
      {
        name: 'Battle Ropes',
        equipment: 'Other',
        matchPercentage: 90,
        reason: 'High-output upper-body metabolic interval conditioning.',
        targetSets: 3,
        targetReps: '30s',
        restTimeSecs: 60,
      },
      {
        name: 'Jump Rope',
        equipment: 'Other',
        matchPercentage: 88,
        reason: 'High-cadence cardiovascular conditioning with reactive calf elasticity.',
        targetSets: 3,
        targetReps: '60s',
        restTimeSecs: 45,
      },
    ],
  },
};

/**
 * Maps any exercise name and muscle string to its exact biomechanical profile key,
 * or null if no biomechanical profile matches safely.
 */
function resolveBiomechanicalCategory(name: string, muscle?: string): string | null {
  const n = (name || '').toLowerCase();
  const m = (muscle || '').toLowerCase();

  // 1. Incline / Upper Chest
  if (
    n.includes('incline') ||
    n.includes('low-to-high') ||
    n.includes('low to high') ||
    m.includes('upper chest') ||
    m.includes('clavicular')
  ) {
    if (!n.includes('curl') && !n.includes('reverse fly') && !n.includes('skull')) {
      return 'upper_chest';
    }
  }

  // 2. Chest (General, Flat, Decline)
  if (
    m.includes('chest') ||
    m.includes('pec') ||
    n.includes('bench press') ||
    n.includes('chest press') ||
    n.includes('push-up') ||
    n.includes('pushup') ||
    n.includes('chest fly') ||
    n.includes('pec deck') ||
    n.includes('dip')
  ) {
    return 'sternal_chest';
  }

  // 3. Lower Back / Erectors (MUST precede generic 'back' and 'curl')
  if (
    m.includes('lower back') ||
    m.includes('erector') ||
    n.includes('back extension') ||
    n.includes('hyperextension') ||
    n.includes('good morning') ||
    n.includes('rack pull') ||
    n.includes('jefferson curl') ||
    n.includes('superman')
  ) {
    return 'lower_back';
  }

  // 4. Forearms & Grip (MUST precede Biceps 'curl')
  if (
    m.includes('forearm') ||
    m.includes('wrist') ||
    m.includes('grip') ||
    m.includes('brachioradialis') ||
    n.includes('wrist curl') ||
    n.includes('reverse wrist') ||
    n.includes('wrist roller') ||
    n.includes('finger curl') ||
    n.includes('dead hang') ||
    n.includes('plate pinch') ||
    n.includes('farmer')
  ) {
    return 'forearms';
  }

  // 5. Lats (Vertical Pulls)
  if (
    n.includes('pulldown') ||
    n.includes('pull-up') ||
    n.includes('pullup') ||
    n.includes('chin-up') ||
    n.includes('chinup') ||
    (n.includes('straight-arm') && n.includes('pulldown')) ||
    n.includes('lat pulldown')
  ) {
    return 'lats_width';
  }

  // 6. Upper Back / Rows
  if (
    m.includes('back') ||
    m.includes('trap') ||
    m.includes('rhomboid') ||
    n.includes('row') ||
    n.includes('shrug')
  ) {
    return 'upper_back_thickness';
  }

  // 7. Side Delts
  if (
    n.includes('lateral raise') ||
    n.includes('side delt') ||
    n.includes('medial delt') ||
    m.includes('side delt') ||
    m.includes('lateral delt')
  ) {
    return 'side_delts';
  }

  // 8. Rear Delts
  if (
    n.includes('rear delt') ||
    n.includes('face pull') ||
    n.includes('reverse fly') ||
    n.includes('reverse pec deck') ||
    m.includes('rear delt')
  ) {
    return 'rear_delts';
  }

  // 9. Shoulders / Overhead Press (Front Delts)
  if (
    m.includes('shoulder') ||
    m.includes('delt') ||
    n.includes('overhead press') ||
    n.includes('shoulder press') ||
    n.includes('military press') ||
    n.includes('arnold press')
  ) {
    return 'front_delts';
  }

  // 10. Hamstrings (MUST precede Biceps 'curl')
  if (
    m.includes('hamstring') ||
    n.includes('leg curl') ||
    n.includes('romanian') ||
    n.includes('rdl') ||
    n.includes('stiff-leg') ||
    n.includes('nordic')
  ) {
    return 'hamstrings';
  }

  // 11. Quads
  if (
    m.includes('quad') ||
    n.includes('squat') ||
    n.includes('leg press') ||
    n.includes('leg extension') ||
    n.includes('lunge') ||
    n.includes('hack')
  ) {
    return 'quads';
  }

  // 12. Glutes
  if (
    m.includes('glute') ||
    n.includes('hip thrust') ||
    n.includes('glute bridge') ||
    n.includes('kickback') ||
    n.includes('abduction')
  ) {
    return 'glutes';
  }

  // 13. Biceps
  if (
    m.includes('bicep') ||
    n.includes('bicep') ||
    n.includes('curl') ||
    n.includes('preacher') ||
    n.includes('bayesian')
  ) {
    return 'biceps';
  }

  // 14. Triceps
  if (
    m.includes('tricep') ||
    n.includes('pushdown') ||
    n.includes('skull crusher') ||
    n.includes('skullcrusher') ||
    n.includes('overhead extension') ||
    n.includes('close-grip bench')
  ) {
    return 'triceps';
  }

  // 15. Calves
  if (m.includes('calf') || m.includes('calves') || n.includes('calf')) {
    return 'calves';
  }

  // 16. Abs & Core (word boundaries so e.g. 'abduction' never misroutes)
  if (
    /\b(abs?|abdominals?|obliques?|core)\b/i.test(m) ||
    n.includes('crunch') ||
    n.includes('plank') ||
    n.includes('leg raise') ||
    n.includes('knee raise') ||
    n.includes('woodchop') ||
    n.includes('pallof') ||
    n.includes('russian twist') ||
    n.includes('ab wheel') ||
    n.includes('rollout') ||
    n.includes('dragon')
  ) {
    return 'abs';
  }

  // 17. Conditioning / Carries / Cardio
  if (
    m.includes('cardio') ||
    m.includes('conditioning') ||
    m.includes('olympic') ||
    n.includes('kettlebell swing') ||
    n.includes('battle rope') ||
    n.includes('sled') ||
    n.includes('jump rope') ||
    n.includes('turkish get up')
  ) {
    return 'conditioning';
  }

  return null;
}

/**
 * Returns the intelligent biomechanical swap alternatives for any given exercise.
 * 
 * Hierarchy:
 * 1. Top 3 Biomechanically Identical Substitutes (ranked by exact muscle fiber match % and line of push/pull).
 * 2. Equipment Variants (ranked alternatives offering different equipment: Dumbbell, Cable, Machine, Barbell, Bodyweight).
 */
export function getBiomechanicalSwaps(
  currentExerciseName: string,
  explicitMuscle?: string | null
): BiomechanicalSwapResult {
  const originalName = currentExerciseName || 'Exercise';
  const currentKey = normalizeExerciseKey(originalName);
  const originalEquipment = resolveExerciseEquipment(originalName);
  const profileKey = resolveBiomechanicalCategory(originalName, explicitMuscle || undefined);
  const profile = profileKey ? BIOMECHANICAL_PROFILES[profileKey] : undefined;

  if (!profile) {
    const resolvedFallback = explicitMuscle || resolveExerciseTargetMuscle(originalName).targetMuscle || 'General';
    return {
      directSubstitutes: [],
      equipmentVariants: [],
      allSubstitutes: [],
      originalName,
      originalEquipment,
      targetDivision: resolvedFallback,
    };
  }

  // Filter out the current exercise being swapped
  const eligibleAlts = profile.alternatives.filter(alt => {
    return normalizeExerciseKey(alt.name) !== currentKey;
  });

  // Top 3 Biomechanically Identical Substitutes
  const directSubstitutes: BiomechanicalSwapRecommendation[] = eligibleAlts.slice(0, 3).map((alt, idx) => {
    const rx = getBiomechanicalPrescription(alt.name, profile.division);
    return {
      id: `direct_swap_${idx}_${normalizeExerciseKey(alt.name)}`,
      name: alt.name,
      equipment: alt.equipment,
      targetMuscle: profile.division,
      muscleDivision: profile.division,
      matchPercentage: alt.matchPercentage,
      reason: alt.reason,
      targetSets: alt.targetSets || rx.targetSets,
      targetReps: alt.targetReps || rx.targetReps,
      restTimeSecs: alt.restTimeSecs || rx.restTimeSecs,
      videoId: alt.videoId,
      isEquipmentVariant: false,
    };
  });

  // Equipment Variants: Pick the best alternative for each equipment category distinct from the top 3
  const directNames = new Set(directSubstitutes.map(s => normalizeExerciseKey(s.name)));
  const equipmentMap = new Map<EquipmentCategory, (typeof eligibleAlts)[0]>();

  for (const alt of eligibleAlts) {
    const key = normalizeExerciseKey(alt.name);
    if (directNames.has(key)) continue;

    // We prefer equipment different from the original exercise if possible
    if (!equipmentMap.has(alt.equipment)) {
      equipmentMap.set(alt.equipment, alt);
    }
  }

  const equipmentVariants: BiomechanicalSwapRecommendation[] = Array.from(equipmentMap.values()).map((alt, idx) => {
    const rx = getBiomechanicalPrescription(alt.name, profile.division);
    return {
      id: `equip_variant_${idx}_${normalizeExerciseKey(alt.name)}`,
      name: alt.name,
      equipment: alt.equipment,
      targetMuscle: profile.division,
      muscleDivision: profile.division,
      matchPercentage: alt.matchPercentage,
      reason: alt.reason,
      targetSets: alt.targetSets || rx.targetSets,
      targetReps: alt.targetReps || rx.targetReps,
      restTimeSecs: alt.restTimeSecs || rx.restTimeSecs,
      videoId: alt.videoId,
      isEquipmentVariant: true,
    };
  });

  const allSubstitutes = [...directSubstitutes, ...equipmentVariants];

  return {
    directSubstitutes,
    equipmentVariants,
    allSubstitutes,
    originalName,
    originalEquipment,
    targetDivision: profile.division,
  };
}
