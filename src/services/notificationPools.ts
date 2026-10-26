/**
 * notificationPools.ts — ZenFit Mobile
 *
 * Dedicated Gym & Athletic Workout Notification Pools.
 * Clean, high-impact motivational copy for workout reminders,
 * rest day recovery, and training streak protection.
 */

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getRandomMessage(pool: string[]): string {
  if (!pool || pool.length === 0) return '';
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── 1. Daily Gym Workout Reminder Pools ───────────────────────────────────────

export const GYM_WORKOUT_TITLES = (planName: string) => [
  `Workout Ready: ${planName}`,
  `Time to Train: ${planName}`,
  `Session Scheduled: ${planName}`,
  `Iron Calling: ${planName}`,
];

export const GYM_WORKOUT_POOLS = (planName: string, exercisePreview?: string, totalExercises?: number): string[] => {
  const previewClause = exercisePreview
    ? ` (${exercisePreview}${totalExercises && totalExercises > 3 ? ` +${totalExercises - 3} more` : ''})`
    : '';

  return [
    `Today's session: ${planName}${previewClause}. Lock in and crush your sets.`,
    `${planName} is on the schedule${previewClause}. No excuses — step up and train.`,
    `Time to lift: ${planName}${previewClause}. Tap to start your workout HUD.`,
    `Your training session is ready: ${planName}. Progress is earned one rep at a time.`,
    `Iron therapy awaits: ${planName}${previewClause}. Move some heavy weight today.`,
    `Consistency compounds. Tap to view today's ${planName} workout.`,
  ];
};

// ── 2. Rest & Recovery Day Pools ──────────────────────────────────────────────

export const GYM_REST_DAY_TITLES = [
  'Rest & Recovery Day 🧘',
  'Recovery Mode Activated 💤',
  'Muscle Rebuild Day 🥩',
  'Active Recovery 🔋',
];

export const GYM_REST_DAY_POOLS = (): string[] => [
  'Scheduled rest day. Muscles grow during recovery, not in the gym — rest up.',
  'Recovery is part of the program. Hydrate, eat high protein, and recharge.',
  'Active recovery today: take a walk, do light mobility, and let your body heal.',
  'Rest is training too. Protect today\'s recovery for maximum power tomorrow.',
  'Take today off from the weights. Get 8 hours of sleep and come back stronger.',
];

// ── 3. Gym Inactivity / Streak Protection Pools ───────────────────────────────

export const GYM_INACTIVITY_TITLES = [
  'Missing Your Gym Rhythm? 🏋️',
  'Time to Get Back on Track 🔥',
  'The Iron Misses You 💪',
];

export const GYM_INACTIVITY_POOLS = (daysSinceLastWorkout: number): string[] => [
  `It's been ${daysSinceLastWorkout} days since your last session. Don't let momentum slip!`,
  'Consistency is the secret to real gains. Tap to pick up your workout plan today.',
  `Rest is good, but ${daysSinceLastWorkout} days is plenty. Step back up to the barbell.`,
  'Even a quick 30-minute session keeps the lifting habit alive. Let\'s train today.',
];

// ── 4. Rest Timer Complete Pools ──────────────────────────────────────────────

export const GYM_REST_TIMER_POOLS = (exerciseName?: string): { title: string; body: string } => {
  return {
    title: 'Rest Timer Complete ⏱️',
    body: exerciseName
      ? `Time for your next set of ${exerciseName}! Lock in.`
      : 'Rest is over! Time for your next set.',
  };
};
