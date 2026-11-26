import type { LucideIcon } from 'lucide-react-native';

export type OnboardingStep =
  | 'welcome'
  | 'identity'
  | 'ageHeight'
  | 'weight'
  | 'goals'
  | 'experience'
  | 'split'
  | 'alerts'
  | 'reveal';

export const QUIZ_STEPS_ORDER: Exclude<OnboardingStep, 'welcome'>[] = [
  'identity',
  'ageHeight',
  'weight',
  'goals',
  'experience',
  'split',
  'alerts',
  'reveal',
];

export const ALL_STEPS_ORDER: OnboardingStep[] = [
  'welcome',
  ...QUIZ_STEPS_ORDER,
];

export type TrainingGoalId = 'hypertrophy' | 'strength' | 'fat_loss' | 'athletic' | 'recomp';
export type ExperienceLevelId = 'beginner' | 'intermediate' | 'advanced';
export type SplitPreferenceId =
  | 'ppl'
  | 'upper_lower'
  | 'pplul'
  | 'arnold'
  | 'full_body'
  | 'bro_split'
  | 'torso_limbs';

export interface GoalOptionMeta {
  id: TrainingGoalId;
  title: string;
  cue: string;
  shortLabel: string;
  IconName: 'dumbbell' | 'trophy' | 'flame' | 'zap' | 'refresh';
}

export const GOAL_OPTIONS: GoalOptionMeta[] = [
  {
    id: 'hypertrophy',
    title: 'Build Muscle',
    cue: 'Hypertrophy · 8–12 reps',
    shortLabel: 'Muscle Growth',
    IconName: 'dumbbell',
  },
  {
    id: 'strength',
    title: 'Max Strength',
    cue: 'Heavy lifts · 3–6 reps',
    shortLabel: 'Strength',
    IconName: 'trophy',
  },
  {
    id: 'fat_loss',
    title: 'Lose Fat',
    cue: 'Lean conditioning · 12–15 reps',
    shortLabel: 'Fat Loss',
    IconName: 'flame',
  },
  {
    id: 'athletic',
    title: 'Athletic Power',
    cue: 'Speed & work capacity',
    shortLabel: 'Athletic',
    IconName: 'zap',
  },
  {
    id: 'recomp',
    title: 'Body Recomp',
    cue: 'Gain muscle & drop fat',
    shortLabel: 'Recomp',
    IconName: 'refresh',
  },
];

export interface ExperienceOptionMeta {
  id: ExperienceLevelId;
  title: string;
  cue: string;
  bars: 1 | 2 | 3;
}

export const EXPERIENCE_OPTIONS: ExperienceOptionMeta[] = [
  { id: 'beginner', title: 'New to Lifting', cue: 'Under 1 year', bars: 1 },
  { id: 'intermediate', title: 'Intermediate', cue: '1 – 3 years', bars: 2 },
  { id: 'advanced', title: 'Experienced', cue: '3+ years', bars: 3 },
];

export interface SplitOptionMeta {
  id: SplitPreferenceId;
  title: string;
  cue: string;
  idealDays: number[];
  badge?: string;
}

export const SPLIT_OPTIONS: SplitOptionMeta[] = [
  {
    id: 'full_body',
    title: 'Full Body',
    cue: 'Hit every muscle each session',
    idealDays: [3],
    badge: '3 Days',
  },
  {
    id: 'upper_lower',
    title: 'Upper / Lower',
    cue: 'Alternate heavy upper & lower days',
    idealDays: [4],
    badge: '4 Days',
  },
  {
    id: 'torso_limbs',
    title: 'Torso / Limbs',
    cue: 'Dedicated chest/back & arm/leg days',
    idealDays: [4],
    badge: '4 Days',
  },
  {
    id: 'pplul',
    title: 'PPL + Upper / Lower',
    cue: 'Push, pull, legs plus upper & lower',
    idealDays: [5],
    badge: '5 Days',
  },
  {
    id: 'bro_split',
    title: 'Classic Body-Part Split',
    cue: 'One focused muscle group per session',
    idealDays: [5],
    badge: '5 Days',
  },
  {
    id: 'ppl',
    title: 'Push / Pull / Legs',
    cue: 'Twice-weekly muscle frequency',
    idealDays: [6, 3, 5],
    badge: '6 Days',
  },
  {
    id: 'arnold',
    title: 'Arnold Split',
    cue: 'Chest & back, delts & arms, legs',
    idealDays: [6],
    badge: '6 Days',
  },
];

export function getRecommendedSplitForDays(days: number): SplitPreferenceId {
  if (days <= 3) return 'full_body';
  if (days === 4) return 'upper_lower';
  if (days === 5) return 'pplul';
  return 'ppl';
}

export function getTrainingDayMask(daysPerWeek: number): boolean[] {
  // 7 booleans: Monday .. Sunday
  switch (daysPerWeek) {
    case 3:
      return [true, false, true, false, true, false, false];
    case 4:
      return [true, true, false, true, true, false, false];
    case 5:
      return [true, true, true, false, true, true, false];
    case 6:
    default:
      return [true, true, true, true, true, true, false];
  }
}

export function classifyBmi(bmi: number): {
  label: string;
  segmentIndex: 0 | 1 | 2 | 3;
} {
  if (bmi < 18.5) return { label: 'Lean', segmentIndex: 0 };
  if (bmi < 25) return { label: 'Athletic', segmentIndex: 1 };
  if (bmi < 30) return { label: 'Solid Mass', segmentIndex: 2 };
  return { label: 'Heavy Mass', segmentIndex: 3 };
}

export type IconLookup = Record<GoalOptionMeta['IconName'], LucideIcon>;
