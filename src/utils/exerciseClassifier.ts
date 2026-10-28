/**
 * exerciseClassifier.ts — Biomechanical Exercise Classifier & Biometrics Resolver
 *
 * Maps exercises to their precise biomechanical classifications:
 * - Movement Category: HEAVY_COMPOUND | STANDARD_COMPOUND | ISOLATION
 * - Resistance Profile: LENGTHENED | MID | SHORTENED
 * - Eccentric Damage Scalar (1.35x for loaded stretch to 0.65x for cables/concentric)
 * - CNS Demand Scalar (1.5x for axial barbell deadlifts/squats to 0.3x for curls)
 * - Voluntary Activation Base (0.85 to 1.15)
 */

import { ExerciseBiometrics, MovementCategory, ResistanceProfile } from '../types/exercise';

export {
  inferExerciseMeta,
  InferredExerciseMeta,
  EquipmentType,
  HistoricalSessionInput,
} from './progressionEngine';

const HEAVY_AXIAL_COMPOUND_REGEX =
  /\b(deadlift|squat|front squat|hack squat|romanian deadlift|rdl|stiff-?leg|good morning|clean|snatch|overhead press|military press|barbell bench press)\b/i;

const STANDARD_COMPOUND_REGEX =
  /\b(bench|press|row|pull-?up|chin-?up|dip|lunge|split squat|thrust|pulldown|leg press|chest press|shoulder press|push-?up)\b/i;

const LENGTHENED_REGEX =
  /\b(romanian|rdl|stiff-?leg|incline (dumbbell|db) curl|overhead (cable|tricep|triceps)|fly|flye|crossover|bulgarian|sissy|preacher|pullover|deficit)\b/i;

const SHORTENED_REGEX =
  /\b(pec deck|hip thrust|kickback|spider curl|cable pushdown|leg extension|lying leg curl|seated leg curl|cable lateral|concentration)\b/i;

/**
 * Resolves full ExerciseBiometrics for any exercise name and equipment.
 */
export function resolveExerciseBiometrics(
  exerciseName: string,
  explicitEquipment?: string
): ExerciseBiometrics {
  const name = (exerciseName || '').toLowerCase().trim();
  const equip = (explicitEquipment || '').toLowerCase().trim();

  // 1. Resolve Movement Category
  let category: MovementCategory = 'ISOLATION';
  if (HEAVY_AXIAL_COMPOUND_REGEX.test(name) && !/extension|curl|raise|fly/i.test(name)) {
    category = 'HEAVY_COMPOUND';
  } else if (STANDARD_COMPOUND_REGEX.test(name) && !/extension|curl|raise|fly|pushdown/i.test(name)) {
    category = 'STANDARD_COMPOUND';
  } else if (equip === 'barbell' && /row|press|squat/i.test(name)) {
    category = 'HEAVY_COMPOUND';
  } else if (/pulldown|leg press|hack squat|dip|pull-?up|chin-?up/i.test(name)) {
    category = 'STANDARD_COMPOUND';
  }

  // 2. Resolve Resistance Profile (Where mechanical tension peaks)
  let resistanceProfile: ResistanceProfile = 'MID';
  if (LENGTHENED_REGEX.test(name)) {
    resistanceProfile = 'LENGTHENED';
  } else if (SHORTENED_REGEX.test(name)) {
    resistanceProfile = 'SHORTENED';
  }

  // 3. Resolve Eccentric Damage Scalar
  let eccentricDamageScalar = 1.0;
  if (resistanceProfile === 'LENGTHENED') {
    eccentricDamageScalar = 1.35; // Extreme microscopic sarcomere disruption
  } else if (resistanceProfile === 'SHORTENED' || equip === 'cable' || /cable|machine/i.test(name)) {
    eccentricDamageScalar = 0.70; // Smooth continuous tension with lower peak stretch damage
  } else if (category === 'HEAVY_COMPOUND') {
    eccentricDamageScalar = 1.10;
  }

  // 4. Resolve CNS Demand Scalar (Driven by axial spinal loading and systemic neuromuscular fatigue)
  let cnsDemandScalar = 0.3;
  if (/deadlift|clean|snatch/i.test(name) && !/cable|dumbbell|db/i.test(name)) {
    cnsDemandScalar = 1.6; // Maximum systemic/spinal fatigue
  } else if (/squat/i.test(name) && !/split|goblet/i.test(name)) {
    cnsDemandScalar = 1.45;
  } else if (category === 'HEAVY_COMPOUND') {
    cnsDemandScalar = 1.15;
  } else if (category === 'STANDARD_COMPOUND') {
    cnsDemandScalar = 0.75;
  }

  // 5. Resolve Voluntary Activation Base (Intrinsic neural recovery rate of target muscle)
  let voluntaryActivationBase = 1.0;
  if (/bicep|curl|hamstring|leg curl|rdl/i.test(name)) {
    // High voluntary activation susceptibility to sustained eccentric micro-damage
    voluntaryActivationBase = 0.85;
  } else if (/quad|squat|glute|calf|calves|abs|core/i.test(name)) {
    // Quads, Glutes, Calves, Abs exhibit high neural resilience & rapid local recovery
    voluntaryActivationBase = 1.15;
  }

  return {
    name: exerciseName,
    category,
    resistanceProfile,
    eccentricDamageScalar,
    cnsDemandScalar,
    voluntaryActivationBase,
  };
}
