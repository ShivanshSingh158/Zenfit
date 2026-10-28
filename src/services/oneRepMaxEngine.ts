/**
 * oneRepMaxEngine.ts — ZenFit Biomechanical 1RM Engine
 *
 * Implements a 2-Tier Hybrid Model based on neuromuscular fatigue zones:
 * - Computes Effective Reps: r_eff = Reps + RIR
 * - Tier 1 (1 <= r_eff <= 8): Brzycki Neural Strength Zone
 * - Tier 2 (9 <= r_eff <= 15): Damped Epley Metabolic Zone with category damping factor k
 * - Tier 3 (r_eff > 15): 1RM capped / returns null (tracks Work Volume and e10RM instead)
 */

import { MovementCategory } from '../types/exercise';

export type OneRMFormula = 'epley' | 'brzycki' | 'lombardi' | 'oconner' | 'mayhew' | 'wathen' | 'average' | 'hybrid';

export const FORMULA_NAMES: Record<OneRMFormula, string> = {
  hybrid: 'Biomechanical Hybrid (2-Tier)',
  epley: 'Epley (Standard)',
  brzycki: 'Brzycki (High Accuracy)',
  lombardi: 'Lombardi (Power)',
  oconner: "O'Conner (Linear)",
  mayhew: 'Mayhew (Exponential)',
  wathen: 'Wathen (Strength)',
  average: 'Scientific Composite Average',
};

export const REP_CAP = 15;

/**
 * Calculates Effective Reps accounting for Reps in Reserve.
 * A set of 8 reps @ 2 RIR represents the muscular capacity of 10 reps to failure.
 */
export function getEffectiveReps(reps: number, rir?: number | null): number {
  const safeReps = Math.max(0, reps || 0);
  const safeRir = Math.max(0, Math.min(6, Number(rir ?? 0)));
  return safeReps + safeRir;
}

/**
 * 1. Brzycki Formula: 1RM = W * (36 / (37 - r))
 */
export function brzycki1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  const r = Math.min(reps, 12);
  return weight * (36 / (37 - r));
}

/**
 * 2. Epley Formula: 1RM = W * (1 + r / 30)
 */
export function epley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  const r = Math.min(reps, REP_CAP);
  return weight * (1 + r / 30);
}

/**
 * 3. Lombardi Formula: 1RM = W * (r ^ 0.10)
 */
export function lombardi1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  const r = Math.min(reps, REP_CAP);
  return weight * Math.pow(r, 0.1);
}

/**
 * 4. O'Conner Formula: 1RM = W * (1 + r / 40)
 */
export function oconner1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  const r = Math.min(reps, REP_CAP);
  return weight * (1 + r / 40);
}

/**
 * 5. Mayhew Formula: 1RM = (100 * W) / (52.2 + 41.9 * e^(-0.055 * r))
 */
export function mayhew1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  const r = Math.min(reps, REP_CAP);
  return (100 * weight) / (52.2 + 41.9 * Math.exp(-0.055 * r));
}

/**
 * 6. Wathen Formula: 1RM = (100 * W) / (48.8 + 53.8 * e^(-0.075 * r))
 */
export function wathen1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  const r = Math.min(reps, REP_CAP);
  return (100 * weight) / (48.8 + 53.8 * Math.exp(-0.075 * r));
}

/**
 * 2-Tier Biomechanical Hybrid 1RM Calculation:
 * - 1 <= r_eff <= 8: Brzycki Strength Zone
 * - 9 <= r_eff <= 15: Damped Epley with category factor k (33 heavy, 31 standard, 35 isolation)
 * - r_eff > 15: Returns null for true 1RM (physiological cap)
 */
export function calculateHybrid1RM(
  weight: number,
  reps: number,
  rir?: number | null,
  category: MovementCategory = 'STANDARD_COMPOUND'
): number | null {
  if (weight <= 0 || reps <= 0) return 0;
  const rEff = getEffectiveReps(reps, rir);

  if (rEff <= 1) return weight;

  // Beyond 15 effective reps, anaerobic lactate & cardiovascular limits invalidate 1RM
  if (rEff > 15) {
    return null;
  }

  // Tier 1: Neural Strength Zone (1-8 reps)
  if (rEff <= 8) {
    const val = weight * (36 / (37 - rEff));
    return Math.round(val * 10) / 10;
  }

  // Tier 2: Metabolic Hypertrophy Zone (9-15 reps)
  // k damping: HEAVY_COMPOUND = 33, STANDARD_COMPOUND = 31, ISOLATION = 35
  const k = category === 'HEAVY_COMPOUND' ? 33 : category === 'ISOLATION' ? 35 : 31;
  const val = weight * (1 + rEff / k);
  return Math.round(val * 10) / 10;
}

/**
 * Primary 1RM Estimator with full backwards compatibility
 */
export function estimate1RM(
  weight: number,
  reps: number,
  formula: OneRMFormula = 'hybrid',
  rir?: number | null,
  category: MovementCategory = 'STANDARD_COMPOUND'
): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;

  if (formula === 'hybrid') {
    const hybrid = calculateHybrid1RM(weight, reps, rir, category);
    if (hybrid !== null) return hybrid;
    // Fallback for > 15 reps if caller requires a raw number: clamped damped Epley
    return Math.round(weight * (1 + 15 / 33) * 10) / 10;
  }

  let val = 0;
  switch (formula) {
    case 'brzycki':
      val = brzycki1RM(weight, reps);
      break;
    case 'lombardi':
      val = lombardi1RM(weight, reps);
      break;
    case 'oconner':
      val = oconner1RM(weight, reps);
      break;
    case 'mayhew':
      val = mayhew1RM(weight, reps);
      break;
    case 'wathen':
      val = wathen1RM(weight, reps);
      break;
    case 'average': {
      const sum =
        epley1RM(weight, reps) +
        brzycki1RM(weight, reps) +
        lombardi1RM(weight, reps) +
        oconner1RM(weight, reps) +
        mayhew1RM(weight, reps) +
        wathen1RM(weight, reps);
      val = sum / 6;
      break;
    }
    case 'epley':
    default:
      val = epley1RM(weight, reps);
      break;
  }

  return Math.round(val * 10) / 10;
}

/**
 * Calculates Set Work Volume (Tonnage)
 */
export function calculateSetWorkVolume(weight: number, reps: number): number {
  return Math.max(0, weight) * Math.max(0, reps);
}

/**
 * Estimates 10RM load (hypertrophy anchor)
 */
export function estimate10RM(oneRM: number): number {
  if (oneRM <= 0) return 0;
  return Math.round(oneRM * 0.75 * 10) / 10;
}

export interface RepMaxTier {
  reps: number;
  percentage: number;
  weight: number;
}

/**
 * Calculates full Rep Max Breakdown Table (100% down to 70% 12RM)
 */
export function calculateRepMaxTable(oneRM: number): RepMaxTier[] {
  if (oneRM <= 0) return [];
  const percentages = [
    { reps: 1, pct: 1.0 },
    { reps: 2, pct: 0.95 },
    { reps: 4, pct: 0.90 },
    { reps: 6, pct: 0.85 },
    { reps: 8, pct: 0.80 },
    { reps: 10, pct: 0.75 },
    { reps: 12, pct: 0.70 },
  ];

  return percentages.map(p => ({
    reps: p.reps,
    percentage: Math.round(p.pct * 100),
    weight: Math.round(oneRM * p.pct * 10) / 10,
  }));
}
