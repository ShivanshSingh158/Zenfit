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
  const previewStr = exercisePreview ? ` (${exercisePreview})` : '';
  return [
    `${countStr}${previewStr} · Ready when you are`,
    `${countStr}${previewStr} · Time to train`,
    `${planName} session ready${previewStr} · Tap to begin`,
    `Consistency compounds · ${countStr} prepared`,
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

// ── 6. Advanced 5-Pillar Coach Notification Copy Generators ──────────────────

export interface NotificationCopy {
  title: string;
  body: string;
}

/**
 * Pillar 2: Pre-Workout Reminder at anchor time T
 */
export function getWorkoutReminderCopy(
  planName: string,
  topExercises?: string[],
  totalExercises?: number
): NotificationCopy {
  const name = planName || 'Workout Session';
  const preview = topExercises && topExercises.length > 0
    ? `Starting with ${topExercises.slice(0, 2).join(' & ')}.`
    : '';
  const countStr = totalExercises && totalExercises > 0 ? ` ${totalExercises} exercises on deck.` : '';

  return {
    title: `Time to Train: ${name} 🏋️`,
    body: `${preview}${countStr} Ready when you are.`.trim(),
  };
}

/**
 * Pillar 3: Missed Workout Check-in
 */
export function getMissedWorkoutCopy(
  planName: string,
  isLateEvening: boolean = false
): NotificationCopy {
  const name = planName || 'Your workout';
  if (isLateEvening) {
    return {
      title: `${name} unlogged today ⏳`,
      body: 'Push your split +1 day or hit a quick session? Tap to adjust.',
    };
  }
  return {
    title: `${name} unlogged today ⏳`,
    body: 'Still hitting it tonight, or shifting to an active recovery day? Tap to update.',
  };
}

/**
 * Pillar 1: Tomorrow Blueprint Preview (Evening at 9:00 PM)
 */
export function getTomorrowBlueprintCopy(
  tomorrowPlanName: string,
  primaryLift?: string,
  targetMusclesSummary?: string
): NotificationCopy {
  const name = tomorrowPlanName || 'Upcoming Session';
  const liftPart = primaryLift ? `Starting with ${primaryLift}. ` : '';
  const musclePart = targetMusclesSummary ? `${targetMusclesSummary}. ` : '';

  return {
    title: `Tomorrow: ${name} 📋`,
    body: `${liftPart}${musclePart}Blueprint ready for tomorrow.`.trim(),
  };
}

/**
 * Pillar 4: Rest Day Biological Insights
 */
export function getRestDayInsightCopy(
  branch: 'missed_yesterday' | 'lagging_mev' | 'cns_recovery' | 'general',
  data: {
    routineName?: string;
    muscleName?: string;
    currentSets?: number;
    targetSets?: number;
    totalVolumeKg?: number;
  }
): NotificationCopy {
  switch (branch) {
    case 'missed_yesterday':
      return {
        title: 'Yesterday\'s Routine Unlogged ⏳',
        body: `Yesterday\'s ${data.routineName || 'session'} went unlogged. Shift it to today or keep today as Rest?`,
      };
    case 'lagging_mev':
      return {
        title: `Weekly Volume Check: ${data.muscleName || 'Key Muscle'} 🎯`,
        body: `${data.muscleName || 'This muscle'} is at ${data.currentSets ?? 0}/${data.targetSets ?? 10} sets this week. Add 3 sets on your next session.`,
      };
    case 'cns_recovery': {
      const volText = data.totalVolumeKg && data.totalVolumeKg > 0
        ? `${Math.round(data.totalVolumeKg)} kg `
        : '';
      return {
        title: 'Active Recovery Protocol 🔋',
        body: `CNS & tissue recovering from yesterday\'s ${volText}volume. Prioritize protein, hydration and 8,000 steps today.`,
      };
    }
    case 'general':
    default:
      return {
        title: 'Rest & Rebuild 🔋',
        body: 'Muscles grow outside the gym. Prioritize sleep, nutrition, and active recovery today.',
      };
  }
}

/**
 * Pillar 5: Sunday Strength Briefing
 */
export function getSundayBriefingCopy(
  completedSessions: number,
  totalVolumeKg: number,
  prCount: number = 0
): NotificationCopy {
  const volRounded = Math.round(totalVolumeKg);
  const volFormatted = volRounded > 1000 ? `${(volRounded / 1000).toFixed(1)}k kg` : `${volRounded} kg`;
  const prText = prCount > 0 ? ` · ${prCount} PR${prCount > 1 ? 's' : ''} unlocked` : '';

  return {
    title: 'Sunday Strength Briefing 📊',
    body: `${completedSessions} workouts completed · ${volFormatted} moved${prText}. Tap for your weekly breakdown.`,
  };
}

/**
 * Churn / Inactivity Safety Net: 3-Strike Backoff
 */
export function getInactivityReengagementCopy(): NotificationCopy {
  return {
    title: 'Life gets busy · ZenFit',
    body: 'Want to pause reminders for a week or reset your split? Tap whenever you\'re ready to lift.',
  };
}


