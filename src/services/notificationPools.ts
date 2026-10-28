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
  planName || 'Workout Session',
  `${planName || 'Workout'}`,
];

export const GYM_WORKOUT_POOLS = (planName: string, exercisePreview?: string, totalExercises?: number): string[] => {
  const countStr = totalExercises ? `${totalExercises} exercises` : 'Scheduled session';
  return [
    `${countStr} · Ready when you are`,
    `${countStr} · Time to train`,
    `Your training session is prepared`,
    `Consistency compounds · Tap to begin`,
  ];
};

// ── 2. Rest & Recovery Day Pools ──────────────────────────────────────────────

export const GYM_REST_DAY_TITLES = [
  'Rest & Recovery',
  'Recovery Day',
];

export const GYM_REST_DAY_POOLS = (): string[] => [
  'Active recovery · Hydrate, rest, and rebuild.',
  'Scheduled rest day · Prioritize nutrition and sleep.',
  'Recovery is part of the program.',
];

// ── 3. Gym Inactivity / Streak Protection Pools ───────────────────────────────

export const GYM_INACTIVITY_TITLES = [
  'Training Reminder',
  'Ready to Train',
];

export const GYM_INACTIVITY_POOLS = (daysSinceLastWorkout: number): string[] => [
  `Last session was ${daysSinceLastWorkout} days ago · Keep the momentum going`,
  'Your routine is ready whenever you are',
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

// ── 5. Weekly Gym Report Notification Pools (Rest Day Delivery) ───────────────

export type WeeklyPerformanceTier = 'hard' | 'good' | 'light';

export function getWeeklyPerformanceTier(
  completedSessions: number,
  totalSets: number,
  totalVolumeKg: number,
  plannedWorkoutDays: number = 4
): WeeklyPerformanceTier {
  if (completedSessions >= plannedWorkoutDays && (completedSessions >= 3 || totalSets >= 35 || totalVolumeKg >= 8000)) {
    return 'hard';
  }
  if (completedSessions >= 3 || (plannedWorkoutDays > 0 && completedSessions / plannedWorkoutDays >= 0.6)) {
    return 'good';
  }
  return 'light';
}

export interface WeeklyReportNotificationCopy {
  title: string;
  body: string;
}

export function getWeeklyReportNotificationCopy(params: {
  tier: WeeklyPerformanceTier;
  completedSessions: number;
  totalSets: number;
  totalVolumeKg: number;
  isFollowUp?: boolean;
}): WeeklyReportNotificationCopy {
  const { tier, completedSessions, totalSets, totalVolumeKg, isFollowUp } = params;
  const volRounded = Math.round(totalVolumeKg);
  const volFormatted = volRounded > 0 ? (volRounded > 1000 ? `${(volRounded / 1000).toFixed(1)}k` : `${volRounded}`) : null;

  if (isFollowUp) {
    // Follow-up reminder (4-5 hours later, different message)
    switch (tier) {
      case 'hard': {
        const pool = [
          {
            title: 'Weekly Training Digest',
            body: volFormatted
              ? `Outstanding volume this week (${volFormatted} kg). Your muscle recovery breakdown is ready.`
              : 'Your high-performance 7-day breakdown is ready. Tap to view your full report.',
          },
          {
            title: 'Weekly Performance Review',
            body: '7-day training recap · Check muscle recovery, heaviest lifts, and volume distribution.',
          },
        ];
        return pool[Math.floor(Math.random() * pool.length)];
      }
      case 'good': {
        const pool = [
          {
            title: 'Weekly Training Digest',
            body: 'Your 7-day training recap is waiting. Review your consistency and recovery stats.',
          },
          {
            title: 'Weekly Performance Review',
            body: 'Muscle group analytics & recovery balance are ready. Tap to view full report.',
          },
        ];
        return pool[Math.floor(Math.random() * pool.length)];
      }
      case 'light':
      default: {
        const pool = [
          {
            title: 'Weekly Training Digest',
            body: 'Take 60 seconds to review your 7-day recap before your next training block begins.',
          },
          {
            title: 'Weekly Performance Review',
            body: 'Rest day check-in · Review your weekly activity and upcoming schedule.',
          },
        ];
        return pool[Math.floor(Math.random() * pool.length)];
      }
    }
  }

  // Primary notification (delivered on rest day morning / daytime)
  switch (tier) {
    case 'hard': {
      const pool = [
        {
          title: 'Weekly Report Ready',
          body: `High-intensity week · ${completedSessions} workouts & ${totalSets} sets completed. Tap to view full report.`,
        },
        {
          title: 'Weekly Performance',
          body: `Exceptional effort this week · ${completedSessions} sessions locked in. Tap to review your progress.`,
        },
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    case 'good': {
      const pool = [
        {
          title: 'Weekly Report Ready',
          body: `Solid consistency · ${completedSessions} workouts logged this week. Tap to explore your recovery & volume.`,
        },
        {
          title: 'Weekly Performance',
          body: `Weekly report generated · Target achieved across ${completedSessions} sessions. Tap to inspect.`,
        },
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    case 'light':
    default: {
      const pool = [
        {
          title: 'Weekly Report Ready',
          body: `Lighter week logged · ${completedSessions} session${completedSessions === 1 ? '' : 's'} recorded. Tap to review and plan ahead.`,
        },
        {
          title: 'Weekly Performance',
          body: 'Recovery week summary · Check your 7-day activity and set your next target.',
        },
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }
}

