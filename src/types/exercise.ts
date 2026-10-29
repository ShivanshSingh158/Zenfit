/**
 * exercise.ts — Biomechanical Metadata and Exercise Classification Types
 */

export type ResistanceProfile = 'LENGTHENED' | 'MID' | 'SHORTENED';
export type MovementCategory = 'HEAVY_COMPOUND' | 'STANDARD_COMPOUND' | 'ISOLATION';

export interface ExerciseBiometrics {
  id?: string;
  name?: string;
  category: MovementCategory;
  resistanceProfile: ResistanceProfile; // Where the load / tension is heaviest
  eccentricDamageScalar: number;        // 1.35 (RDLs/Flys), 1.0 (Presses/Squats), 0.65 (Concentric/Cables)
  cnsDemandScalar: number;              // 1.5 (Deadlift/Squat), 1.0 (Bench/Row), 0.3 (Curls/Laterals)
  voluntaryActivationBase: number;      // Intrinsic neural recovery rate of primary mover (0.85 to 1.25)
}

