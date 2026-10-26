// src/utils/progressionEngine.ts
import { GymDayLog, GymExerciseLog, GymSet } from '../types/gym.types';
import { normalizeExerciseKey } from './gymUtils';

export type EquipmentType =
  | 'Barbell'
  | 'Dumbbell'
  | 'Machine'
  | 'Cable'
  | 'Bodyweight'
  | 'Kettlebell'
  | 'Plate'
  | 'Resistance Band'
  | 'Assisted';

export type ProgressionState =
  | 'BASELINE'         // First time logging this exercise
  | 'REP_BUILD'        // Double progression: adding reps along the fatigue curve
  | 'WEIGHT_UNLOCK'    // Hit dynamic unlock threshold -> +Weight with Iso-e1RM landing reps
  | 'PLATEAU_BREAK'    // 3 sessions stuck -> Top-Set (PAP) + Back-Off sets
  | 'ACUTE_FATIGUE'    // < 36h turnaround or heavy synergist overlap -> Maintenance hold
  | 'REGROOVE_HOLD'    // 8-14 days since last session -> Match previous session
  | 'DETRAINED_RAMP'   // > 14 days layoff -> Exponential decay ramp-back (-5% to -25%)
  | 'REACTIVE_DELOAD'; // 2 consecutive well-rested regressions -> Cut 1 set or -10% load

export interface LoggedSetInput {
  setNumber?: number;
  weight: number;
  reps: number;
  rir?: number;
  isWarmup?: boolean;
  completed?: boolean;
}

export interface HistoricalSessionInput {
  sessionId?: string;
  performedAt: string | number | Date;
  sets: LoggedSetInput[];
}

export interface ExerciseProfileInput {
  id?: string;
  name: string;
  equipment?: EquipmentType | string; // Optional! Auto-inferred if omitted
  primaryMuscle?: string;             // Optional! Auto-inferred if omitted
  isCompound?: boolean;               // Optional! Auto-inferred if omitted
  targetSets?: number;                // Defaults to 3 (or user's historical set count)
  targetRepLow?: number;              // Defaults to 8 (or auto-adapts to user habit)
  targetRepHigh?: number;             // Defaults to 12 (or auto-adapts to user habit)
  hasMicroPlates?: boolean;
}

export interface RecoveryContextInput {
  now?: number;
  hoursSincePrimaryMuscleTrained?: number;
  recentPrimaryMuscleHardSets?: number;
  alreadyLoggedSameMuscleSetsToday?: number; // Intra-workout exercise order awareness
}

export interface SetPrescription {
  setNumber: number;
  targetWeight: number;
  targetReps: number;
  targetRir: number;
  role: 'WORK' | 'TOP_SET' | 'BACK_OFF' | 'DELOAD';
  label: string;
}

export interface InferredExerciseMeta {
  equipment: EquipmentType;
  isCompound: boolean;
  isLowerBody: boolean;
  incrementKg: number;
}

export interface ProgressionRecommendation {
  state: ProgressionState;
  badgeLabel: string;
  badgeColor: '#30D158' | '#0A84FF' | '#FF9F0A' | '#BF5AF2' | '#8E8E93';
  headline: string;
  subheadline: string;
  prescribedSets: SetPrescription[];
  totalTargetReps: number;
  recommendedWeight: number;
  weightDelta: number;
  isDeload: boolean;
  lastSessionSummary: string | null;
  inferredMeta: InferredExerciseMeta;
  metrics: {
    estimated1RM: number;
    ewma1RM: number;
    fatigueDropOffRatio: number;
    relativeLoadJumpPct: number;
    daysSinceLastSession: number | null;
    effectiveRepRange: [number, number];
  };
}

// ---------------------------------------------------------------------------
// 1. ZERO-CONFIG EXERCISE CLASSIFIER & GYM INCREMENT DETECTOR
// ---------------------------------------------------------------------------

const COMPOUND_REGEX =
  /\b(squat|deadlift|bench|press|row|pull-?up|chin-?up|dip|lunge|split squat|rdl|thrust|clean|snatch|push-?up|pulldown)\b/i;

const ISOLATION_REGEX =
  /\b(curl|raise|extension|fly|flye|pushdown|kickback|shrug|calf|crunch|ab|plank|wrist|forearm|pec deck|face pull|pullover)\b/i;

const LOWER_BODY_REGEX =
  /\b(squat|deadlift|rdl|lunge|leg|calf|calves|glute|hamstring|quad|thrust|hack|adductor|abductor)\b/i;

export function inferExerciseMeta(
  profile: ExerciseProfileInput,
  currentWeight: number,
  history: HistoricalSessionInput[] = []
): InferredExerciseMeta {
  const name = (profile.name || '').toLowerCase().trim();
  const muscle = (profile.primaryMuscle || '').toLowerCase().trim();
  const explicitEquip = (profile.equipment || '').toLowerCase().trim();

  // 1. Resolve Equipment (Explicit prop -> Name Regex -> Smart Fallback)
  let equipment: EquipmentType = 'Barbell';

  if (explicitEquip === 'dumbbell' || explicitEquip === 'db') equipment = 'Dumbbell';
  else if (explicitEquip === 'barbell' || explicitEquip === 'bb') equipment = 'Barbell';
  else if (explicitEquip === 'cable') equipment = 'Cable';
  else if (explicitEquip === 'machine') equipment = 'Machine';
  else if (explicitEquip === 'bodyweight' || explicitEquip === 'bw') equipment = 'Bodyweight';
  else if (explicitEquip === 'kettlebell' || explicitEquip === 'kb') equipment = 'Kettlebell';
  else if (explicitEquip === 'plate') equipment = 'Plate';
  else if (explicitEquip === 'band' || explicitEquip === 'resistance band') equipment = 'Resistance Band';
  else if (explicitEquip === 'assisted') equipment = 'Assisted';
  else if (/\b(assisted)\b/i.test(name)) {
    equipment = 'Assisted';
  } else if (
    /\b(bodyweight|bw|push-?up|pull-?up|chin-?up|plank|crunch|hanging|sit-?up|dip)\b/i.test(name) &&
    currentWeight === 0
  ) {
    equipment = 'Bodyweight';
  } else if (
    /\b(db|dumbbell|dumbell|arnold|hammer curl|concentration|zottman|goblet)\b/i.test(name)
  ) {
    equipment = 'Dumbbell';
  } else if (
    /\b(cable|rope|pulley|pushdown|crossover|face pull|lat pulldown|straight arm)\b/i.test(name)
  ) {
    equipment = 'Cable';
  } else if (
    /\b(machine|leg press|hack squat|pec deck|smith|pendulum|leg extension|leg curl|abductor|adductor|seated row|chest press)\b/i.test(
      name
    )
  ) {
    equipment = 'Machine';
  } else if (/\b(kb|kettlebell)\b/i.test(name)) {
    equipment = 'Kettlebell';
  } else if (/\b(band|banded)\b/i.test(name)) {
    equipment = 'Resistance Band';
  } else if (/\b(lateral raise|front raise|rear delt|bicep curl|incline curl)\b/i.test(name)) {
    equipment = 'Dumbbell';
  }

  // 2. Resolve Compound vs Isolation & Lower Body
  const isIsolation = ISOLATION_REGEX.test(name);
  const isCompound =
    profile.isCompound !== undefined
      ? profile.isCompound
      : isIsolation
      ? false
      : (COMPOUND_REGEX.test(name) || true);

  const isLowerBody =
    LOWER_BODY_REGEX.test(name) ||
    /\b(quad|hamstring|glute|calf|calves|leg|lower back)\b/i.test(muscle);

  // 3. Historical Weight-Step Fingerprinting (Learn user's actual gym increments)
  const uniqueWeights = Array.from(
    new Set(
      history
        .flatMap((s) => (s.sets || []).map((set) => Number(set.weight)))
        .filter((w) => Number.isFinite(w) && w > 0)
    )
  ).sort((a, b) => a - b);

  const hasDecimalPointFive = uniqueWeights.some(
    (w) => Math.abs((w % 2.5) - 0) < 0.01 && w % 5 !== 0
  );
  const hasEvenTwoKgSteps = uniqueWeights.some(
    (w) => w >= 10 && w % 2 === 0 && w % 5 !== 0
  );

  let minObservedDelta = Infinity;
  for (let i = 1; i < uniqueWeights.length; i++) {
    const diff = Number((uniqueWeights[i] - uniqueWeights[i - 1]).toFixed(2));
    if (diff >= 1.0 && diff <= 5.0 && diff < minObservedDelta) {
      minObservedDelta = diff;
    }
  }

  // 4. Determine Final Increment (kg)
  let incrementKg = 2.5;

  if (equipment === 'Bodyweight' || equipment === 'Resistance Band') {
    incrementKg = 0;
  } else if (profile.hasMicroPlates) {
    incrementKg = 1.25;
  } else if (
    Number.isFinite(minObservedDelta) &&
    [1, 1.25, 2, 2.5, 5].includes(minObservedDelta)
  ) {
    incrementKg = minObservedDelta;
  } else if (equipment === 'Dumbbell') {
    if (currentWeight < 10) {
      incrementKg = 1.0;
    } else if (hasEvenTwoKgSteps && !hasDecimalPointFive) {
      incrementKg = 2.0; // Hex dumbbell gym (10, 12, 14, 16, 18, 20)
    } else {
      incrementKg = 2.5; // Commercial gym (10, 12.5, 15, 17.5, 20)
    }
  } else if (equipment === 'Barbell') {
    incrementKg = isLowerBody && currentWeight >= 100 ? 5.0 : 2.5;
  } else if (
    equipment === 'Machine' ||
    equipment === 'Cable' ||
    equipment === 'Plate' ||
    equipment === 'Assisted'
  ) {
    incrementKg = isLowerBody && currentWeight >= 80 ? 5.0 : 2.5;
  } else if (equipment === 'Kettlebell') {
    incrementKg = currentWeight < 16 ? 2.0 : 4.0;
  }

  return {
    equipment,
    isCompound,
    isLowerBody,
    incrementKg,
  };
}

// ---------------------------------------------------------------------------
// 2. CORE EXERCISE SCIENCE & FILTERING FUNCTIONS
// ---------------------------------------------------------------------------

export function calculateSetE1RM(weight: number, reps: number, rir = 0): number {
  if (weight <= 0 || reps <= 0) return 0;
  // Cap effective reps at 20 so ultra-high-rep sets don't artificially inflate e1RM
  const effectiveReps = Math.min(reps + Math.max(0, rir), 20);
  return Number((weight * (1 + effectiveReps / 30)).toFixed(2));
}

export function predictRepsAtWeight(
  e1RM: number,
  targetWeight: number,
  targetRir = 1
): number {
  if (targetWeight <= 0 || e1RM <= targetWeight) return 1;
  const rawMaxReps = 30 * (e1RM / targetWeight - 1);
  return Math.max(1, Math.floor(rawMaxReps - targetRir));
}

export function snapToGymWeight(rawWeight: number, step: number): number {
  if (step <= 0) return Math.max(0, Math.round(rawWeight));
  return Number((Math.round(rawWeight / step) * step).toFixed(2));
}

/**
 * Extracts true working sets, automatically stripping out untagged warmup/feeler sets
 * (e.g., when a user logs 40kg x 12 on Set 1 before jumping to 60kg x 10 on Sets 2-4).
 */
export function extractWorkingSets(sets: LoggedSetInput[]): LoggedSetInput[] {
  const candidates = (sets || []).filter(
    (s) => !s.isWarmup && (s.completed ?? true) && s.reps > 0 && s.weight >= 0
  );
  if (candidates.length <= 1) return candidates;

  const maxWeight = Math.max(...candidates.map((s) => s.weight));
  const maxE1RM = Math.max(
    ...candidates.map((s) => calculateSetE1RM(s.weight, s.reps, s.rir))
  );

  if (maxWeight <= 0) return candidates; // Bodyweight sets

  return candidates.filter((s, idx) => {
    // Only strip leading sets (Set 1 or Set 2) if they are < 75% of top weight AND < 80% of top e1RM
    const isLeadingSet = idx === 0 || idx === 1;
    const isLightFeeler =
      s.weight < maxWeight * 0.75 &&
      calculateSetE1RM(s.weight, s.reps, s.rir) < maxE1RM * 0.8;
    return !(isLeadingSet && isLightFeeler);
  });
}

/**
 * Builds the natural intra-session fatigue curve across N sets.
 * Compound lifts drop ~1 rep per set; isolations drop ~1 rep every 1-2 sets.
 */
export function buildIdealRepCurve(
  numSets: number,
  firstSetTargetReps: number,
  floorReps: number,
  isCompound = true
): number[] {
  const curve: number[] = [];
  for (let i = 0; i < numSets; i++) {
    const drop = isCompound ? i : Math.floor(i * 0.75);
    const target = Math.max(Math.max(1, floorReps - 2), firstSetTargetReps - drop);
    curve.push(target);
  }
  return curve;
}

// ---------------------------------------------------------------------------
// 3. HISTORICAL SESSION DIGEST & HABIT RE-CALIBRATION
// ---------------------------------------------------------------------------

interface SessionDigest {
  timestamp: number;
  workingSets: LoggedSetInput[];
  anchorWeight: number;
  anchorSetE1RM: number;
  totalRepsAtAnchor: number;
  rawTotalReps: number;
  fatigueDropOff: number;
  firstSetReps: number;
}

function digestSession(session: HistoricalSessionInput): SessionDigest | null {
  const workingSets = extractWorkingSets(session.sets || []);
  if (workingSets.length === 0) return null;

  let bestSet = workingSets[0];
  let bestE1RM = calculateSetE1RM(bestSet.weight, bestSet.reps, bestSet.rir);

  for (const s of workingSets) {
    const e1rm = calculateSetE1RM(s.weight, s.reps, s.rir);
    if (e1rm > bestE1RM) {
      bestE1RM = e1rm;
      bestSet = s;
    }
  }

  const anchorWeight = bestSet.weight;
  let normalizedTotalReps = 0;
  let rawTotalReps = 0;

  for (const s of workingSets) {
    rawTotalReps += s.reps;
    if (anchorWeight > 0 && s.weight !== anchorWeight) {
      const setE1RM = calculateSetE1RM(s.weight, s.reps, s.rir);
      normalizedTotalReps += predictRepsAtWeight(setE1RM, anchorWeight, 0);
    } else {
      normalizedTotalReps += s.reps;
    }
  }

  const firstReps = workingSets[0].reps;
  const lastReps = workingSets[workingSets.length - 1].reps;
  const fatigueDropOff =
    firstReps > 0 ? Math.max(0, (firstReps - lastReps) / firstReps) : 0;

  const parsedTs = new Date(session.performedAt).getTime();

  return {
    timestamp: Number.isNaN(parsedTs) ? Date.now() : parsedTs,
    workingSets,
    anchorWeight,
    anchorSetE1RM: bestE1RM,
    totalRepsAtAnchor: normalizedTotalReps,
    rawTotalReps,
    fatigueDropOff,
    firstSetReps: firstReps,
  };
}

/**
 * Adapts the target rep window [Rmin, Rmax] if the user consistently trains
 * outside the default template range (e.g., always doing 15-20 reps on Lateral Raises).
 */
function resolveEffectiveRepWindow(
  profile: ExerciseProfileInput,
  digests: SessionDigest[],
  isCompound: boolean
): [number, number] {
  const defaultLow = profile.targetRepLow ?? (isCompound ? 8 : 12);
  const defaultHigh = profile.targetRepHigh ?? (isCompound ? 12 : 15);

  if (digests.length < 2) {
    return [defaultLow, Math.max(defaultLow, defaultHigh)];
  }

  const recentFirstSetReps = digests.slice(0, 3).map((d) => d.firstSetReps);
  const avgFirstSetReps =
    recentFirstSetReps.reduce((a, b) => a + b, 0) / recentFirstSetReps.length;

  // If user consistently trains > 3 reps above template ceiling, shift window up
  if (avgFirstSetReps > defaultHigh + 3) {
    return [15, 20];
  }
  // If user consistently trains heavy low-rep (< defaultLow - 2), shift window to strength
  if (avgFirstSetReps < defaultLow - 2 && avgFirstSetReps >= 4) {
    return [5, 8];
  }

  return [defaultLow, Math.max(defaultLow, defaultHigh)];
}

// ---------------------------------------------------------------------------
// 4. MASTER PROGRESSION ENGINE (7-STATE MACHINE)
// ---------------------------------------------------------------------------

export function generateProgressionRecommendation(
  profile: ExerciseProfileInput,
  rawHistory: HistoricalSessionInput[] = [],
  recovery: RecoveryContextInput = {}
): ProgressionRecommendation {
  const now = recovery.now ?? Date.now();

  const digests = (rawHistory || [])
    .map(digestSession)
    .filter((d): d is SessionDigest => d !== null)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 6);

  const lastWeight = digests[0]?.anchorWeight ?? 0;
  const inferredMeta = inferExerciseMeta(profile, lastWeight, rawHistory);
  const [Rmin, Rmax] = resolveEffectiveRepWindow(
    profile,
    digests,
    inferredMeta.isCompound
  );

  // Infer target set count from profile or user's last session working set count
  const N = Math.max(
    1,
    profile.targetSets ?? digests[0]?.workingSets.length ?? 3
  );

  // -------------------------------------------------------------------------
  // STATE 1: BASELINE (No previous valid logs)
  // -------------------------------------------------------------------------
  if (digests.length === 0) {
    const startReps = Math.round((Rmin + Rmax) / 2);
    const prescribedSets: SetPrescription[] = Array.from({ length: N }, (_, i) => ({
      setNumber: i + 1,
      targetWeight: 0,
      targetReps: startReps,
      targetRir: 2,
      role: 'WORK',
      label: `Set ${i + 1}: ${startReps} reps @ 2 RIR`,
    }));

    return {
      state: 'BASELINE',
      badgeLabel: 'Baseline Session',
      badgeColor: '#8E8E93',
      headline: `Establish baseline: ${N} × ${Rmin}–${Rmax} reps`,
      subheadline: 'Select a controlled load where you finish Set 1 with ~2 reps in reserve.',
      prescribedSets,
      totalTargetReps: N * startReps,
      recommendedWeight: 0,
      weightDelta: 0,
      isDeload: false,
      lastSessionSummary: null,
      inferredMeta,
      metrics: {
        estimated1RM: 0,
        ewma1RM: 0,
        fatigueDropOffRatio: 0,
        relativeLoadJumpPct: 0,
        daysSinceLastSession: null,
        effectiveRepRange: [Rmin, Rmax],
      },
    };
  }

  const last = digests[0];
  const prev = digests[1];
  const prev2 = digests[2];

  const hoursSinceExercise = Math.max(0, (now - last.timestamp) / (1000 * 3600));
  const daysSinceLastSession = Number((hoursSinceExercise / 24).toFixed(1));
  const hoursSinceMuscle = Math.min(
    hoursSinceExercise,
    recovery.hoursSincePrimaryMuscleTrained ?? hoursSinceExercise
  );

  // Compute EWMA e1RM across up to 6 sessions (alpha = 0.45 smooths single bad days)
  const alpha = 0.45;
  let ewma1RM = digests[digests.length - 1].anchorSetE1RM;
  for (let i = digests.length - 2; i >= 0; i--) {
    ewma1RM = alpha * digests[i].anchorSetE1RM + (1 - alpha) * ewma1RM;
  }

  const W = last.anchorWeight;
  const deltaW = inferredMeta.incrementKg;
  const direction = inferredMeta.equipment === 'Assisted' ? -1 : 1;
  const relativeJumpPct = W > 0 ? Number(((deltaW / W) * 100).toFixed(1)) : 0;

  // Intra-workout fatigue buffer if user already did >= 4 hard sets for this muscle today
  const intraWorkoutFatiguePenalty =
    (recovery.alreadyLoggedSameMuscleSetsToday ?? 0) >= 4 ? 1 : 0;

  const lastRepsList = last.workingSets.map((s) => s.reps);
  const lastRepsStr = lastRepsList.join(', ');
  const unitLabel = W > 0 ? `${W} kg × ` : 'BW × ';
  const lastSessionSummary = `Last (${daysSinceLastSession}d ago): ${unitLabel}${lastRepsStr} (${last.rawTotalReps} reps)`;

  const baseMetrics = {
    estimated1RM: last.anchorSetE1RM,
    ewma1RM: Number(ewma1RM.toFixed(2)),
    fatigueDropOffRatio: Number(last.fatigueDropOff.toFixed(2)),
    relativeLoadJumpPct: relativeJumpPct,
    daysSinceLastSession,
    effectiveRepRange: [Rmin, Rmax] as [number, number],
  };

  // -------------------------------------------------------------------------
  // TEMPORAL GUARD A: DETRAINED RAMP-BACK (> 14 Days Layoff)
  // -------------------------------------------------------------------------
  if (daysSinceLastSession > 14) {
    const weeksOff = daysSinceLastSession / 7;
    const retentionFactor = Math.max(0.75, 1 - 0.035 * (weeksOff - 2));
    const rampWeight =
      W > 0 ? snapToGymWeight(W * retentionFactor, deltaW || 2.5) : 0;
    const dropPct = W > 0 ? Math.round((1 - rampWeight / W) * 100) : 0;

    const prescribedSets: SetPrescription[] = Array.from({ length: N }, (_, i) => ({
      setNumber: i + 1,
      targetWeight: rampWeight,
      targetReps: Rmin,
      targetRir: 2,
      role: 'WORK',
      label: rampWeight > 0 ? `${rampWeight} kg × ${Rmin}` : `BW × ${Rmin}`,
    }));

    return {
      state: 'DETRAINED_RAMP',
      badgeLabel: `Ramp-Back (${Math.round(daysSinceLastSession)}d off)`,
      badgeColor: '#BF5AF2',
      headline:
        rampWeight > 0
          ? `Ramp back at ${rampWeight} kg × ${prescribedSets.map((s) => s.targetReps).join(', ')}`
          : `Ramp back: ${N} sets × ${Rmin} reps @ 2 RIR`,
      subheadline: `-${dropPct}% load adjustment after ${Math.round(daysSinceLastSession)} days off to protect connective tissue and minimize severe DOMS.`,
      prescribedSets,
      totalTargetReps: N * Rmin,
      recommendedWeight: rampWeight,
      weightDelta: -Math.round(W * (1 - retentionFactor)),
      isDeload: true,
      lastSessionSummary,
      inferredMeta,
      metrics: baseMetrics,
    };
  }

  // -------------------------------------------------------------------------
  // TEMPORAL GUARD B: RE-GROOVE HOLD (8 to 14 Days Since Last Session)
  // -------------------------------------------------------------------------
  if (daysSinceLastSession >= 8 && daysSinceLastSession <= 14) {
    const holdReps = Array.from({ length: N }, (_, i) =>
      Math.max(
        Rmin - 1,
        (lastRepsList[i] ?? lastRepsList[lastRepsList.length - 1] ?? Rmin) -
          intraWorkoutFatiguePenalty
      )
    );
    const prescribedSets: SetPrescription[] = holdReps.map((r, i) => ({
      setNumber: i + 1,
      targetWeight: W,
      targetReps: r,
      targetRir: 1,
      role: 'WORK',
      label: W > 0 ? `${W} kg × ${r}` : `BW × ${r}`,
    }));

    return {
      state: 'REGROOVE_HOLD',
      badgeLabel: 'Motor Re-Groove',
      badgeColor: '#0A84FF',
      headline: `Match ${W > 0 ? `${W} kg` : 'BW'} × ${holdReps.join(', ')} today`,
      subheadline: `${Math.round(daysSinceLastSession)} days since last session — re-establish groove and bar speed before jumping load.`,
      prescribedSets,
      totalTargetReps: holdReps.reduce((a, b) => a + b, 0),
      recommendedWeight: W,
      weightDelta: 0,
      isDeload: false,
      lastSessionSummary,
      inferredMeta,
      metrics: baseMetrics,
    };
  }

  // -------------------------------------------------------------------------
  // TEMPORAL GUARD C: ACUTE FATIGUE (< 36 Hours Turnaround)
  // -------------------------------------------------------------------------
  if (
    hoursSinceExercise < 36 ||
    (hoursSinceMuscle < 36 && (recovery.recentPrimaryMuscleHardSets ?? 0) >= 6)
  ) {
    const maintReps = Array.from({ length: N }, (_, i) =>
      Math.max(Rmin - 2, (lastRepsList[i] ?? Rmin) - (i === N - 1 ? 1 : 0))
    );
    const prescribedSets: SetPrescription[] = maintReps.map((r, i) => ({
      setNumber: i + 1,
      targetWeight: W,
      targetReps: r,
      targetRir: 2,
      role: 'WORK',
      label: W > 0 ? `${W} kg × ${r}` : `BW × ${r}`,
    }));

    return {
      state: 'ACUTE_FATIGUE',
      badgeLabel: 'Acute Fatigue Guard',
      badgeColor: '#FF9F0A',
      headline: `Hold ${W > 0 ? `${W} kg` : 'BW'} × ${maintReps.join(', ')} (${Math.round(hoursSinceMuscle)}h recovery)`,
      subheadline: 'Under 36h recovery for this muscle group. Match volume cleanly; plateau counter is paused.',
      prescribedSets,
      totalTargetReps: maintReps.reduce((a, b) => a + b, 0),
      recommendedWeight: W,
      weightDelta: 0,
      isDeload: false,
      lastSessionSummary,
      inferredMeta,
      metrics: baseMetrics,
    };
  }

  // -------------------------------------------------------------------------
  // STATE 7: REACTIVE DELOAD (2 Consecutive Regressions While Rested)
  // -------------------------------------------------------------------------
  const regressedTwice =
    prev !== undefined &&
    prev2 !== undefined &&
    intraWorkoutFatiguePenalty === 0 &&
    last.anchorSetE1RM < prev.anchorSetE1RM * 0.97 &&
    prev.anchorSetE1RM < prev2.anchorSetE1RM * 0.97;

  const failedFloorTwice =
    prev !== undefined &&
    intraWorkoutFatiguePenalty === 0 &&
    last.workingSets[0].reps < Rmin - 1 &&
    prev.workingSets[0].reps < Rmin - 1 &&
    last.anchorWeight === prev.anchorWeight;

  if (regressedTwice || failedFloorTwice) {
    const deloadWeight =
      failedFloorTwice && W > 0
        ? snapToGymWeight(W * (1 - 0.1 * direction), deltaW || 2.5)
        : W;
    // Volume deload (cut 1 working set) preserves strength better than dropping load
    const deloadSetsCount = failedFloorTwice ? N : Math.max(2, N - 1);

    const prescribedSets: SetPrescription[] = Array.from(
      { length: deloadSetsCount },
      (_, i) => ({
        setNumber: i + 1,
        targetWeight: deloadWeight,
        targetReps: Rmin,
        targetRir: 2,
        role: 'DELOAD',
        label: `${deloadWeight} kg × ${Rmin} (2 RIR)`,
      })
    );

    return {
      state: 'REACTIVE_DELOAD',
      badgeLabel: 'Recovery Deload',
      badgeColor: '#BF5AF2',
      headline: failedFloorTwice
        ? `Reset load to ${deloadWeight} kg × ${deloadSetsCount} sets of ${Rmin}`
        : `Volume Deload: ${deloadWeight} kg × ${deloadSetsCount} sets of ${Rmin} (Cut 1 set)`,
      subheadline: 'Performance dipped across 2 consecutive sessions. Shedding local fatigue today restores progression.',
      prescribedSets,
      totalTargetReps: deloadSetsCount * Rmin,
      recommendedWeight: deloadWeight,
      weightDelta: failedFloorTwice ? -Number((W * 0.1).toFixed(1)) : 0,
      isDeload: true,
      lastSessionSummary,
      inferredMeta,
      metrics: baseMetrics,
    };
  }

  // -------------------------------------------------------------------------
  // DYNAMIC UNLOCK CEILING (With Relative Load Jump Protection)
  // -------------------------------------------------------------------------
  // Extend rep ceiling by +2 if jumping to the next dumbbell/plate is >15% heavier
  const effectiveRmax =
    relativeJumpPct > 15 ? Rmax + 2 : relativeJumpPct > 10 ? Rmax + 1 : Rmax;

  const idealUnlockCurve = buildIdealRepCurve(
    N,
    effectiveRmax,
    Rmin,
    inferredMeta.isCompound
  );
  const unlockTotalReps = idealUnlockCurve.reduce((a, b) => a + b, 0);

  const hitTopSetCeiling = last.workingSets[0].reps >= effectiveRmax;
  const hitTotalRepUnlock =
    last.workingSets.length >= N && last.totalRepsAtAnchor >= unlockTotalReps;

  // -------------------------------------------------------------------------
  // STATE 3: WEIGHT UNLOCK (Mastered Current Weight -> +DeltaW)
  // -------------------------------------------------------------------------
  if (hitTopSetCeiling && hitTotalRepUnlock && deltaW > 0) {
    const nextWeight = Number((W + direction * deltaW).toFixed(2));

    // Iso-e1RM landing rep calculation so big % jumps don't prescribe impossible reps
    const predictedFirstSetReps = predictRepsAtWeight(
      Math.max(last.anchorSetE1RM, ewma1RM),
      nextWeight,
      1 + intraWorkoutFatiguePenalty
    );
    const startingSet1Reps = Math.max(
      Rmin - 1,
      Math.min(Rmin + 1, predictedFirstSetReps)
    );

    const newRepCurve = buildIdealRepCurve(
      N,
      startingSet1Reps,
      Rmin - 1,
      inferredMeta.isCompound
    );
    const prescribedSets: SetPrescription[] = newRepCurve.map((r, i) => ({
      setNumber: i + 1,
      targetWeight: nextWeight,
      targetReps: r,
      targetRir: 1,
      role: 'WORK',
      label: `${nextWeight} kg × ${r}`,
    }));

    return {
      state: 'WEIGHT_UNLOCK',
      badgeLabel: `Weight Unlocked (${direction > 0 ? '+' : '-'}${deltaW} kg)`,
      badgeColor: '#30D158',
      headline: `Advance to ${nextWeight} kg × ${newRepCurve.join(', ')}`,
      subheadline: `Mastered ${W} kg (${lastRepsStr} reps) • Target calibrated for ${nextWeight} kg.`,
      prescribedSets,
      totalTargetReps: newRepCurve.reduce((a, b) => a + b, 0),
      recommendedWeight: nextWeight,
      weightDelta: direction * deltaW,
      isDeload: false,
      lastSessionSummary,
      inferredMeta,
      metrics: baseMetrics,
    };
  }

  // -------------------------------------------------------------------------
  // STATE 4: PLATEAU BREAK (3 Consecutive Sessions Stuck at Same Weight & Volume)
  // -------------------------------------------------------------------------
  const isStagnant3Sessions =
    prev !== undefined &&
    prev2 !== undefined &&
    last.anchorWeight === prev.anchorWeight &&
    prev.anchorWeight === prev2.anchorWeight &&
    Math.abs(last.totalRepsAtAnchor - prev.totalRepsAtAnchor) <= 1 &&
    Math.abs(prev.totalRepsAtAnchor - prev2.totalRepsAtAnchor) <= 1;

  if (isStagnant3Sessions && deltaW > 0 && W > 0) {
    const topSetWeight = Number((W + direction * deltaW).toFixed(2));
    const topSetReps = Math.max(
      Math.max(4, Rmin - 2),
      predictRepsAtWeight(last.anchorSetE1RM, topSetWeight, 1)
    );

    const prescribedSets: SetPrescription[] = [
      {
        setNumber: 1,
        targetWeight: topSetWeight,
        targetReps: topSetReps,
        targetRir: 1,
        role: 'TOP_SET',
        label: `Top Set: ${topSetWeight} kg × ${topSetReps}`,
      },
      ...Array.from({ length: Math.max(1, N - 1) }, (_, idx) => {
        const setNum = idx + 2;
        const backOffReps = Math.min(
          effectiveRmax,
          (lastRepsList[idx + 1] ?? Rmin) + 1
        );
        return {
          setNumber: setNum,
          targetWeight: W,
          targetReps: backOffReps,
          targetRir: 1,
          role: 'BACK_OFF' as const,
          label: `Back-Off: ${W} kg × ${backOffReps}`,
        };
      }),
    ];

    return {
      state: 'PLATEAU_BREAK',
      badgeLabel: 'Plateau Breaker (Wave Load)',
      badgeColor: '#FF9F0A',
      headline: `Set 1: ${topSetWeight} kg × ${topSetReps} → Back-off: ${W} kg`,
      subheadline: `Stuck at ${W} kg for 3 sessions. Heavy Top Set triggers Post-Activation Potentiation (PAP) for your ${W} kg back-off sets.`,
      prescribedSets,
      totalTargetReps: prescribedSets.reduce((a, b) => a + b.targetReps, 0),
      recommendedWeight: topSetWeight,
      weightDelta: direction * deltaW,
      isDeload: false,
      lastSessionSummary,
      inferredMeta,
      metrics: baseMetrics,
    };
  }

  // -------------------------------------------------------------------------
  // STATE 2: REP BUILD (Default Double Progression — Target Weakest Drop-Off Sets)
  // -------------------------------------------------------------------------
  const baseReps = Array.from({ length: N }, (_, i) => {
    const prevSetReps = lastRepsList[i];
    if (prevSetReps !== undefined) {
      return Math.max(1, prevSetReps - intraWorkoutFatiguePenalty);
    }
    const fallback = (lastRepsList[lastRepsList.length - 1] ?? Rmin) - 1;
    return Math.max(Rmin - 1, fallback);
  });

  const targetRepsList = [...baseReps];
  let repsAdded = 0;
  const maxRepsToAdd = 2;

  // Add +1 rep to up to 2 sets that sit below the ideal unlock fatigue curve
  for (let i = 0; i < N && repsAdded < maxRepsToAdd; i++) {
    const upperBound = i === 0 ? effectiveRmax : targetRepsList[i - 1];
    if (
      targetRepsList[i] < idealUnlockCurve[i] &&
      targetRepsList[i] < upperBound
    ) {
      targetRepsList[i] += 1;
      repsAdded += 1;
    }
  }

  // If sets were flat (e.g., 12, 12, 12), push Set 1 and Set 2 by +1 rep
  if (repsAdded === 0) {
    targetRepsList[0] = Math.min(effectiveRmax, targetRepsList[0] + 1);
    if (N > 1) {
      targetRepsList[1] = Math.min(targetRepsList[0], targetRepsList[1] + 1);
    }
  }

  const totalTargetReps = targetRepsList.reduce((a, b) => a + b, 0);
  const repDelta = Math.max(1, totalTargetReps - last.rawTotalReps);
  const repsAwayFromUnlock = Math.max(0, unlockTotalReps - totalTargetReps);
  const nextUnlockWeight = Number((W + direction * deltaW).toFixed(2));

  const prescribedSets: SetPrescription[] = targetRepsList.map((r, i) => ({
    setNumber: i + 1,
    targetWeight: W,
    targetReps: r,
    targetRir: 1,
    role: 'WORK',
    label: W > 0 ? `${W} kg × ${r}` : `BW × ${r}`,
  }));

  return {
    state: 'REP_BUILD',
    badgeLabel: `Rep Build (+${repDelta} reps)`,
    badgeColor: '#0A84FF',
    headline: `Aim for ${targetRepsList.join(', ')} @ ${W > 0 ? `${W} kg` : 'BW'}`,
    subheadline:
      deltaW === 0
        ? `Push total volume from ${last.rawTotalReps} → ${totalTargetReps} reps across ${N} sets.`
        : repsAwayFromUnlock === 0
        ? `Hit ${totalTargetReps} total reps today to unlock ${nextUnlockWeight} kg next session!`
        : `Beat ${last.rawTotalReps} → ${totalTargetReps} total reps (${repsAwayFromUnlock} reps away from unlocking ${nextUnlockWeight} kg).`,
    prescribedSets,
    totalTargetReps,
    recommendedWeight: W,
    weightDelta: 0,
    isDeload: false,
    lastSessionSummary,
    inferredMeta,
    metrics: baseMetrics,
  };
}

// ---------------------------------------------------------------------------
// 5. LIVE INTRA-SESSION RECALCULATOR (Call Immediately After Logging Set k)
// ---------------------------------------------------------------------------

export function recalculateRemainingSetsLive(
  initialRecommendation: ProgressionRecommendation,
  completedSetsToday: LoggedSetInput[]
): SetPrescription[] {
  const workingCompleted = extractWorkingSets(completedSetsToday);
  if (workingCompleted.length === 0) {
    return initialRecommendation.prescribedSets;
  }

  const latestLogged = workingCompleted[workingCompleted.length - 1];
  const latestE1RM = calculateSetE1RM(
    latestLogged.weight,
    latestLogged.reps,
    latestLogged.rir ?? 1
  );

  const [Rmin, Rmax] = initialRecommendation.metrics.effectiveRepRange;
  const isCompound = initialRecommendation.inferredMeta.isCompound;

  return initialRecommendation.prescribedSets.map((prescription, idx) => {
    // Preserve already completed sets
    if (idx < workingCompleted.length) {
      const done = workingCompleted[idx];
      return {
        ...prescription,
        targetWeight: done.weight,
        targetReps: done.reps,
        label: done.weight > 0 ? `${done.weight} kg × ${done.reps}` : `BW × ${done.reps}`,
      };
    }

    const setsAhead = idx - (workingCompleted.length - 1);
    const fatigueDrop = isCompound ? setsAhead : Math.ceil(setsAhead * 0.75);

    // If bodyweight or 0kg, scale directly from latestLogged.reps
    if (prescription.targetWeight <= 0) {
      const liveBwReps = Math.max(Rmin - 2, latestLogged.reps - fatigueDrop);
      return {
        ...prescription,
        targetReps: liveBwReps,
        label: `BW × ${liveBwReps}`,
      };
    }

    const predictedAtTargetWeight = predictRepsAtWeight(
      latestE1RM,
      prescription.targetWeight,
      1
    );
    const liveAdjustedReps = Math.max(
      Math.max(1, Rmin - 2),
      Math.min(Rmax + 3, predictedAtTargetWeight - fatigueDrop)
    );

    return {
      ...prescription,
      targetReps: liveAdjustedReps,
      label: `${prescription.targetWeight} kg × ${liveAdjustedReps}`,
    };
  });
}

// ---------------------------------------------------------------------------
// 6. ADAPTERS FOR EXISTING APP GYM LOG FORMAT
// ---------------------------------------------------------------------------

export type ProgressionPolicy = 'linear' | 'greyskull' | 'double' | 'time' | 'off';

export interface ProgressionResult {
  policy: ProgressionPolicy;
  recommendedWeight: number;
  recommendedReps: string;
  weightDelta: number;
  isDeload: boolean;
  reason: string;
  consecutiveMisses: number;
}

/**
 * Converts raw GymDayLog entries into HistoricalSessionInput format.
 */
export function convertGymLogsToHistory(
  exerciseName: string,
  gymLogs: GymDayLog[],
  targetDateStr?: string
): HistoricalSessionInput[] {
  const targetKey = normalizeExerciseKey(exerciseName);
  const sessions: HistoricalSessionInput[] = [];

  const filteredLogs = targetDateStr
    ? (gymLogs || []).filter((l) => (l.date || '') < targetDateStr)
    : (gymLogs || []);

  const sorted = filteredLogs.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  for (const log of sorted) {
    if (!Array.isArray(log.exercises)) continue;
    const match = log.exercises.find((e) => e?.name && normalizeExerciseKey(e.name) === targetKey);
    if (!match) continue;

    const completedSets = (match.setsLog || []).filter((s) => s.completed && !s.isWarmup);
    if (completedSets.length === 0) continue;

    sessions.push({
      sessionId: log.id || log.date,
      performedAt: log.date,
      sets: completedSets.map((s, idx) => ({
        setNumber: s.setNumber || idx + 1,
        weight: Number(s.weight) || 0,
        reps: Number(s.reps) || 0,
        rir: s.rir,
        isWarmup: !!s.isWarmup,
        completed: !!s.completed,
      })),
    });

    if (sessions.length >= 8) break;
  }

  return sessions;
}
