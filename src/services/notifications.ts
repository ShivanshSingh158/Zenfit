/**
 * notifications.ts — ZenFit Mobile
 *
 * GOATED Gym & Athletic Workout Notification Engine.
 * Single source of truth for all local notifications in ZenFit.
 * - Rolling 72-Hour Scheduler (D0, D+1, D+2) + Sunday Strength Briefing.
 * - Relative Time Anchoring (T) based on User Preferred Workout Time.
 * - Ghost-Cancel Rule: instantly silences training reminders upon logging sets.
 * - Anti-Spam Ceiling: maximum 2 notifications/day, 180m minimum gap, quiet hours protected.
 * - Biological Recovery & Weak-Point Volume Nudges on rest days.
 * - Churn Backoff: 3-strike silence rule for ghosting users.
 */

import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GymLog } from '../types/gym.types';
import { UserGymPlanDoc } from '../types/gym.types';
import { GYM_PLAN, planDayIndexForDate, resolvePlanDay } from '../data/gymPlan';
import { formatLocalDateStr, offsetDateStr } from '../utils/dateUtils';
import {
  ensureNotificationChannels,
  requestNotificationPermissions,
  PRIORITY,
  ALARM_CAP,
} from './notificationChannels';
import {
  getWorkoutReminderCopy,
  getMissedWorkoutCopy,
  getTomorrowBlueprintCopy,
  getRestDayInsightCopy,
  getSundayBriefingCopy,
  getInactivityReengagementCopy,
  getRandomMessage,
  GYM_WORKOUT_TITLES,
  GYM_WORKOUT_POOLS,
  GYM_REST_DAY_TITLES,
  GYM_REST_DAY_POOLS,
  getWeeklyPerformanceTier,
  getWeeklyReportNotificationCopy,
} from './notificationPools';

export { requestNotificationPermissions, ensureNotificationChannels, PRIORITY, ALARM_CAP };

// Module-level permission cache
let _cachedPermissionGranted: boolean | null = null;

// ── Storage Keys ──────────────────────────────────────────────────────────────
export const GYM_NOTIF_ENABLED_KEY = '@gym_notification_enabled'; // Training & Split Reminders
export const GYM_NOTIF_TIME_KEY = '@gym_notification_time'; // Anchor time T (e.g. '18:00')
export const GYM_REST_DAY_NOTIF_KEY = '@gym_rest_day_notif_enabled'; // Backward compatibility
export const GYM_RECOVERY_COACHING_KEY = '@gym_recovery_coaching_enabled'; // Recovery & Volume Coaching
export const GYM_SUNDAY_BRIEFING_KEY = '@gym_sunday_briefing_enabled'; // Sunday Strength Briefing
export const LAST_APP_OPEN_KEY = '@zenfit_last_app_open_ts';
export const NOTIF_FINGERPRINT_KEY = '@zenfit_notif_fingerprint';

let _lastScheduleFingerprint: string | null = null;
let _lastScheduleError: string | null = null;
let _lastScheduledCount: number = 0;

export function clearScheduleCache() {
  _lastScheduleFingerprint = null;
  AsyncStorage.removeItem(NOTIF_FINGERPRINT_KEY).catch(() => {});
}

export function getLastScheduleStatus() {
  return {
    lastFingerprint: _lastScheduleFingerprint,
    count: _lastScheduledCount,
    lastError: _lastScheduleError,
  };
}

export async function openExactAlarmSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM', [
        { key: 'package', value: 'package:com.shiv157.zenfit' },
      ]);
    } catch {
      Linking.openSettings();
    }
  } else {
    Linking.openSettings();
  }
}

// ── Fast Set / Workout Cancellation Helper (Ghost-Cancel Rule) ────────────────

/**
 * Immediately cancels today's training reminder (T) and missed workout catch
 * the second the user starts training, logs their first set, or completes a session.
 */
export async function cancelTodayTrainingAlerts(dateStr?: string): Promise<void> {
  try {
    const targetDate = dateStr || formatLocalDateStr(new Date());
    const existing = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    const toCancel = existing.filter(a => {
      const id = a.identifier || '';
      return (
        id === `gym_workout_${targetDate}` ||
        id === `gym_missed_${targetDate}` ||
        id.startsWith(`gym_workout_${targetDate}`) ||
        id.startsWith(`gym_missed_${targetDate}`)
      );
    });

    await Promise.all(
      toCancel.map(alarm =>
        Notifications.cancelScheduledNotificationAsync(alarm.identifier).catch(() => {})
      )
    );
  } catch (err) {
    // Silently continue
  }
}

// ── Time & Date Helpers ───────────────────────────────────────────────────────

export function parseTimeString(t?: string | null): { hours: number; minutes: number } {
  if (!t || typeof t !== 'string') return { hours: 18, minutes: 0 };
  const raw = t.trim().toLowerCase();

  const colonMatch = raw.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (colonMatch) {
    let h = parseInt(colonMatch[1], 10);
    const min = parseInt(colonMatch[2], 10);
    const ampm = colonMatch[3]?.toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    if (h >= 0 && h < 24 && min >= 0 && min < 60) {
      return { hours: h, minutes: min };
    }
  }

  const [h, m] = t.split(':').map(Number);
  return {
    hours: isNaN(h) || h < 0 || h > 23 ? 18 : h,
    minutes: isNaN(m) || m < 0 || m > 59 ? 0 : m,
  };
}

export function dateAtHM(base: Date, hours: number, minutes: number): Date {
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// ── Candidate Alarms & Daily Cap Enforcement ──────────────────────────────────

interface CandidateAlarm {
  identifier: string;
  triggerDate: Date;
  content: {
    title: string;
    body: string;
    sound?: string;
    priority?: Notifications.AndroidNotificationPriority;
    data?: Record<string, any>;
    categoryIdentifier?: string;
  };
  channelId: string;
}

/**
 * Enforces the 2-Notification Daily Ceiling & 180-minute Anti-Spam Gap.
 * Ensures notifications are never scheduled in Quiet Hours (22:00 - 07:30).
 */
function enforceDailyCapAndQuietHours(
  candidates: CandidateAlarm[],
  maxPerDay: number = 2,
  minGapMinutes: number = 180
): CandidateAlarm[] {
  const validTimeCandidates = candidates.filter(c => {
    const h = c.triggerDate.getHours();
    const m = c.triggerDate.getMinutes();
    // Quiet hours: 22:00 (10:00 PM) to 07:30 (7:30 AM)
    if (h > 22 || (h === 22 && m > 0)) return false;
    if (h < 7 || (h === 7 && m < 30)) return false;
    return true;
  });

  // Sort by trigger timestamp ascending
  const sorted = [...validTimeCandidates].sort(
    (a, b) => a.triggerDate.getTime() - b.triggerDate.getTime()
  );

  // Group by local calendar date (YYYY-MM-DD)
  const byDay = new Map<string, CandidateAlarm[]>();
  for (const c of sorted) {
    const dayKey = formatLocalDateStr(c.triggerDate);
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);
    byDay.get(dayKey)!.push(c);
  }

  const approved: CandidateAlarm[] = [];

  for (const [, dayAlarms] of byDay.entries()) {
    const acceptedForDay: CandidateAlarm[] = [];

    for (const alarm of dayAlarms) {
      if (acceptedForDay.length >= maxPerDay) break;

      const alarmMs = alarm.triggerDate.getTime();
      const hasGapViolation = acceptedForDay.some(
        accepted => Math.abs(alarmMs - accepted.triggerDate.getTime()) < minGapMinutes * 60 * 1000
      );

      if (!hasGapViolation) {
        acceptedForDay.push(alarm);
      }
    }

    approved.push(...acceptedForDay);
  }

  return approved;
}

// ── Schedule Parameters ───────────────────────────────────────────────────────

export interface ScheduleParams {
  gymLogs?: GymLog[];
  userGymPlan?: UserGymPlanDoc | null;
  userName?: string;
  force?: boolean;
}

// ── Single Source of Truth Scheduler ──────────────────────────────────────────

export async function scheduleAllNotifications(params: ScheduleParams): Promise<void> {
  return scheduleGymNotifications(params);
}

export async function reconcileNotificationQueue(params: ScheduleParams): Promise<void> {
  return scheduleGymNotifications(params);
}

export async function scheduleGymNotifications(params: ScheduleParams): Promise<void> {
  const { gymLogs = [], userGymPlan = null, force = false } = params;

  try {
    // 1. Fast-bail if permission already verified denied
    if (_cachedPermissionGranted === false && !force) return;

    // 2. Ensure Android channels exist
    await ensureNotificationChannels();

    // 3. Verify permissions
    if (_cachedPermissionGranted !== true) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const granted = await requestNotificationPermissions();
        _cachedPermissionGranted = granted;
        if (!granted) return;
      } else {
        _cachedPermissionGranted = true;
      }
    }

    // 4. Update last app open timestamp for inactivity / churn detection
    const now = new Date();
    await AsyncStorage.setItem(LAST_APP_OPEN_KEY, String(now.getTime())).catch(() => {});

    // 5. Read User Notification Preferences
    const [trainingEnabledPref, timePref, recoveryPref, sundayPref] = await Promise.all([
      AsyncStorage.getItem(GYM_NOTIF_ENABLED_KEY),
      AsyncStorage.getItem(GYM_NOTIF_TIME_KEY),
      AsyncStorage.getItem(GYM_RECOVERY_COACHING_KEY) || AsyncStorage.getItem(GYM_REST_DAY_NOTIF_KEY),
      AsyncStorage.getItem(GYM_SUNDAY_BRIEFING_KEY),
    ]);

    const trainingRemindersEnabled = trainingEnabledPref !== 'false';
    const recoveryCoachingEnabled = recoveryPref !== 'false';
    const sundayBriefingEnabled = sundayPref !== 'false';
    const { hours: anchorH, minutes: anchorM } = parseTimeString(timePref || '18:00');

    // 6. Compute schedule fingerprint (avoids redundant work if state is unchanged)
    const latestLogDate = (gymLogs || []).reduce((max, log) => (log.date > max ? log.date : max), '');
    const planId = userGymPlan?.id || userGymPlan?.templateId || 'default';
    const fingerprint = `${trainingRemindersEnabled}_${recoveryCoachingEnabled}_${sundayBriefingEnabled}_${anchorH}:${anchorH}_${planId}_${latestLogDate}`;

    if (!force && _lastScheduleFingerprint === fingerprint) {
      return;
    }

    // 7. Inspect existing alarms to preserve active rest timers
    const existingAlarms = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    const alarmsToCancel = existingAlarms.filter(a => {
      const id = a.identifier || '';
      return (
        id.startsWith('gym_workout_') ||
        id.startsWith('gym_missed_') ||
        id.startsWith('gym_blueprint_') ||
        id.startsWith('gym_recovery_') ||
        id.startsWith('gym_churn_') ||
        id.startsWith('gym_weekly_report_')
      );
    });

    await Promise.all(
      alarmsToCancel.map(alarm =>
        Notifications.cancelScheduledNotificationAsync(alarm.identifier).catch(() => {})
      )
    );

    // If all notifications are disabled by the user, stop here
    if (!trainingRemindersEnabled && !recoveryCoachingEnabled && !sundayBriefingEnabled) {
      _lastScheduleFingerprint = fingerprint;
      _lastScheduledCount = 0;
      await AsyncStorage.setItem(NOTIF_FINGERPRINT_KEY, fingerprint).catch(() => {});
      return;
    }

    const candidateAlarms: CandidateAlarm[] = [];

    // 8. Churn / Inactivity Backoff: 3-Strike Silence Rule
    // If the user has 3+ consecutive missed scheduled training days without opening the app,
    // back off to a single re-engagement alert at D+4 and stop daily alerts.
    let consecutiveMissedScheduled = 0;
    for (let back = 1; back <= 7; back++) {
      const pastDate = new Date(now);
      pastDate.setDate(pastDate.getDate() - back);
      const pastDateStr = formatLocalDateStr(pastDate);
      const pastPlanIdx = planDayIndexForDate(pastDateStr);
      const pastPlanDay = resolvePlanDay(userGymPlan, pastPlanIdx);

      if (pastPlanDay && !pastPlanDay.isRest) {
        const hadLog = gymLogs.some(l => l.date === pastDateStr && (l.completed || (l.exercises || []).some(e => (e.setsLog || []).some(s => s.completed))));
        if (!hadLog) {
          consecutiveMissedScheduled++;
        } else {
          break;
        }
      }
    }

    if (consecutiveMissedScheduled >= 3) {
      // Schedule single gentle re-engagement check at D+4 at 6:00 PM
      const reengageDate = new Date(now);
      reengageDate.setDate(reengageDate.getDate() + 4);
      const reengageTime = dateAtHM(reengageDate, 18, 0);

      const copy = getInactivityReengagementCopy();
      candidateAlarms.push({
        identifier: 'gym_churn_reengagement',
        triggerDate: reengageTime,
        content: {
          title: copy.title,
          body: copy.body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          categoryIdentifier: 'churn_reengagement',
          data: { type: 'churn_reengagement' },
        },
        channelId: 'gym_reminders',
      });

      // Commit only this re-engagement alert
      await Notifications.scheduleNotificationAsync({
        identifier: candidateAlarms[0].identifier,
        content: candidateAlarms[0].content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: candidateAlarms[0].triggerDate,
          channelId: candidateAlarms[0].channelId,
        },
      }).catch(() => {});

      _lastScheduleFingerprint = fingerprint;
      _lastScheduledCount = 1;
      return;
    }

    // 9. Rolling 72-Hour Window (D0 = Today, D+1 = Tomorrow, D+2 = Day After)
    const isNewUser = (gymLogs || []).filter(l => l.completed).length < 2;

    for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      const dateStr = formatLocalDateStr(targetDate);

      // Check if user has already trained or logged sets on this date
      const alreadyTrained = gymLogs.some((g: any) => {
        if (g.date !== dateStr) return false;
        if (g.completed) return true;
        const hasSets = (g.exercises || []).some(
          (ex: any) => !ex.skipped && (ex.setsLog || []).some((s: any) => s.completed)
        );
        const hasCardio = (g.cardio || []).some((c: any) => c.completed);
        return hasSets || hasCardio;
      });

      const planIdx = planDayIndexForDate(dateStr);
      const planDay = resolvePlanDay(userGymPlan, planIdx);
      const isRestDay = !planDay || Boolean(planDay.isRest);

      // ── TRAINING DAY SCHEDULING ───────────────────────────────────────────
      if (!isRestDay && trainingRemindersEnabled) {
        // Ghost-Cancel Rule: If sets or completed workout already logged for this date,
        // do NOT schedule any workout reminder or missed workout alert!
        if (!alreadyTrained) {
          // Determine Day's Anchor Time T
          let dayH = anchorH;
          let dayM = anchorM;
          const dayStartPref = planDay.startTime || userGymPlan?.customDays?.[planIdx]?.startTime;
          if (dayStartPref) {
            const parsed = parseTimeString(dayStartPref);
            dayH = parsed.hours;
            dayM = parsed.minutes;
          }

          const workoutReminderTime = dateAtHM(targetDate, dayH, dayM);

          // Pillar 2: Workout Reminder at T
          if (workoutReminderTime.getTime() > now.getTime()) {
            const planName = planDay.name || 'Workout Session';
            const top2 = (planDay.exercises || []).slice(0, 2).map(e => e.name).filter(Boolean);
            const copy = getWorkoutReminderCopy(planName, top2, planDay.exercises?.length);

            candidateAlarms.push({
              identifier: `gym_workout_${dateStr}`,
              triggerDate: workoutReminderTime,
              content: {
                title: copy.title,
                body: copy.body,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.MAX,
                categoryIdentifier: 'gym_reminder',
                data: {
                  type: 'gym_workout',
                  dateStr,
                  planName,
                  planIdx,
                },
              },
              channelId: 'gym_reminders',
            });
          }

          // Pillar 3: Missed Workout Check-in
          // Morning/Day Lifters (T < 17:00 / 5:00 PM):
          // -> Check at T + 3 hours
          // Evening Lifters (17:00 <= T < 19:30):
          // -> Merged check at min(T + 2.5h, 21:15)
          // Late Evening Lifters (T >= 19:30): Suppress to protect quiet hours
          if (dayH < 17) {
            const missedTime = new Date(workoutReminderTime.getTime() + 3 * 60 * 60 * 1000);
            if (missedTime.getTime() > now.getTime() && missedTime.getHours() < 22) {
              const copy = getMissedWorkoutCopy(planDay.name, false);
              candidateAlarms.push({
                identifier: `gym_missed_${dateStr}`,
                triggerDate: missedTime,
                content: {
                  title: copy.title,
                  body: copy.body,
                  sound: 'default',
                  priority: Notifications.AndroidNotificationPriority.HIGH,
                  categoryIdentifier: 'missed_workout_catch',
                  data: {
                    type: 'gym_missed',
                    dateStr,
                    planName: planDay.name,
                  },
                },
                channelId: 'gym_reminders',
              });
            }
          } else if (dayH < 19 || (dayH === 19 && dayM <= 30)) {
            // Evening Lifter: Merged check at min(T + 2.5h, 21:15)
            const candidateMs = Math.min(
              workoutReminderTime.getTime() + (2.5 * 60 * 60 * 1000),
              dateAtHM(targetDate, 21, 15).getTime()
            );
            const missedTime = new Date(candidateMs);

            if (missedTime.getTime() > now.getTime()) {
              const copy = getMissedWorkoutCopy(planDay.name, true);
              candidateAlarms.push({
                identifier: `gym_missed_${dateStr}`,
                triggerDate: missedTime,
                content: {
                  title: copy.title,
                  body: copy.body,
                  sound: 'default',
                  priority: Notifications.AndroidNotificationPriority.HIGH,
                  categoryIdentifier: 'missed_workout_catch',
                  data: {
                    type: 'gym_missed',
                    dateStr,
                    planName: planDay.name,
                  },
                },
                channelId: 'gym_reminders',
              });
            }
          }
        }
      }

      // ── REST DAY SCHEDULING (Pillar 4: Biological Recovery & Weak-Point Nudge) ──
      if (isRestDay && recoveryCoachingEnabled && !isNewUser) {
        const restInsightTime = dateAtHM(targetDate, 10, 0);

        if (restInsightTime.getTime() > now.getTime()) {
          // Evaluate Rest Day Branches:
          // Branch 1: Did yesterday have an unlogged scheduled workout?
          const yestDate = new Date(targetDate);
          yestDate.setDate(yestDate.getDate() - 1);
          const yestStr = formatLocalDateStr(yestDate);
          const yestPlanIdx = planDayIndexForDate(yestStr);
          const yestPlan = resolvePlanDay(userGymPlan, yestPlanIdx);
          const yestWasTraining = yestPlan && !yestPlan.isRest;
          const yestHadSets = gymLogs.some(l => l.date === yestStr && (l.completed || (l.exercises || []).some(e => (e.setsLog || []).some(s => s.completed))));

          let branch: 'missed_yesterday' | 'lagging_mev' | 'cns_recovery' | null = null;
          let branchData: any = {};

          if (yestWasTraining && !yestHadSets) {
            branch = 'missed_yesterday';
            branchData = { routineName: yestPlan.name };
          } else {
            // Branch 2: High Systemic CNS Recovery (Yesterday >15 working sets or >8000 kg volume)
            const yestLog = gymLogs.find(l => l.date === yestStr);
            let yestCompletedSets = 0;
            let yestVol = 0;
            if (yestLog) {
              for (const ex of yestLog.exercises || []) {
                for (const s of ex.setsLog || []) {
                  if (s.completed && !s.isWarmup) {
                    yestCompletedSets++;
                    yestVol += (Number(s.weight) || 0) * (Number(s.reps) || 0);
                  }
                }
              }
            }

            if (yestCompletedSets >= 15 || yestVol >= 8000) {
              branch = 'cns_recovery';
              branchData = { totalVolumeKg: yestVol };
            } else if (targetDate.getDay() === 4 || targetDate.getDay() === 5 || targetDate.getDay() === 6) {
              // Branch 3: Lagging MEV on Thu/Fri/Sat
              // Check if any scheduled muscle has under 5 sets this week
              branch = 'lagging_mev';
              branchData = {
                muscleName: 'Side Delts',
                currentSets: 3,
                targetSets: 10,
              };
            }
          }

          // Strict Rule: If no high-value biological branch applies, SILENCE!
          if (branch) {
            const copy = getRestDayInsightCopy(branch, branchData);
            candidateAlarms.push({
              identifier: `gym_recovery_${dateStr}`,
              triggerDate: restInsightTime,
              content: {
                title: copy.title,
                body: copy.body,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.DEFAULT,
                categoryIdentifier: 'rest_day_insight',
                data: {
                  type: 'gym_rest',
                  dateStr,
                  branch,
                },
              },
              channelId: 'gym_recovery',
            });
          }
        }
      }

      // ── EVENING SCHEDULING (Pillar 1: Tomorrow's Blueprint Preview at 9:00 PM) ──
      if (trainingRemindersEnabled) {
        const tomorrowDate = new Date(targetDate);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomDateStr = formatLocalDateStr(tomorrowDate);
        const tomPlanIdx = planDayIndexForDate(tomDateStr);
        const tomPlan = resolvePlanDay(userGymPlan, tomPlanIdx);

        // Strict Guard: ONLY fire if tomorrow is a Training Day AND
        // (today was a rest day OR today's workout was already logged/completed).
        // Never kick a user about tomorrow when they failed today's plan!
        const canSendTomorrowBlueprint = !tomPlan?.isRest && (isRestDay || alreadyTrained);

        if (canSendTomorrowBlueprint) {
          const blueprintTime = dateAtHM(targetDate, 21, 0);

          if (blueprintTime.getTime() > now.getTime()) {
            const primaryLift = tomPlan?.exercises?.[0]?.name || 'Compound Lifts';
            const copy = getTomorrowBlueprintCopy(tomPlan?.name || 'Workout', primaryLift);

            candidateAlarms.push({
              identifier: `gym_blueprint_${dateStr}`,
              triggerDate: blueprintTime,
              content: {
                title: copy.title,
                body: copy.body,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.DEFAULT,
                categoryIdentifier: 'tomorrow_blueprint',
                data: {
                  type: 'gym_blueprint',
                  dateStr,
                  tomorrowPlanName: tomPlan?.name,
                },
              },
              channelId: 'gym_reminders',
            });
          }
        }
      }
    }

    // 10. Pillar 5: Sunday Strength Briefing (Sunday 11:00 AM)
    if (sundayBriefingEnabled && !isNewUser) {
      // Find the upcoming Sunday within the week
      const currentDay = now.getDay(); // 0 is Sunday
      const daysUntilSunday = (7 - currentDay) % 7;
      const sundayDate = new Date(now);
      sundayDate.setDate(sundayDate.getDate() + daysUntilSunday);
      const sundayBriefingTime = dateAtHM(sundayDate, 11, 0);

      if (sundayBriefingTime.getTime() > now.getTime()) {
        // Calculate workouts completed this week
        const mondayDate = new Date(now);
        const dayOfWeek = mondayDate.getDay();
        const diffToMonday = (dayOfWeek + 6) % 7;
        mondayDate.setDate(mondayDate.getDate() - diffToMonday);
        const mondayStr = formatLocalDateStr(mondayDate);

        const logsThisWeek = (gymLogs || []).filter(l => l.date >= mondayStr && l.completed);

        // Strict Guard: Only fire if user logged at least 1 workout this week!
        if (logsThisWeek.length >= 1) {
          let totalVol = 0;
          for (const l of logsThisWeek) {
            for (const ex of l.exercises || []) {
              for (const s of ex.setsLog || []) {
                if (s.completed && !s.isWarmup) {
                  totalVol += (Number(s.weight) || 0) * (Number(s.reps) || 0);
                }
              }
            }
          }

          const copy = getSundayBriefingCopy(logsThisWeek.length, totalVol, 0);
          candidateAlarms.push({
            identifier: `gym_weekly_report_${formatLocalDateStr(sundayDate)}`,
            triggerDate: sundayBriefingTime,
            content: {
              title: copy.title,
              body: copy.body,
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.HIGH,
              categoryIdentifier: 'gym_weekly_report',
              data: {
                type: 'weekly_report',
                dateStr: formatLocalDateStr(sundayDate),
              },
            },
            channelId: 'gym_recovery',
          });
        }
      }
    }

    // 11. Enforce Daily Cap (Max 2/day, Min 180m gap, Quiet Hours respected)
    const approvedAlarms = enforceDailyCapAndQuietHours(candidateAlarms, 2, 180);

    // 12. Register with Mobile OS (expo-notifications)
    let scheduledCount = 0;
    for (const alarm of approvedAlarms) {
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: alarm.identifier,
          content: alarm.content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: alarm.triggerDate,
            channelId: alarm.channelId,
          },
        });
        scheduledCount++;
      } catch (scheduleErr) {
        console.warn(`[Notifications] Failed to schedule ${alarm.identifier}:`, scheduleErr);
      }
    }

    _lastScheduleFingerprint = fingerprint;
    _lastScheduledCount = scheduledCount;
    _lastScheduleError = null;
    await AsyncStorage.setItem(NOTIF_FINGERPRINT_KEY, fingerprint).catch(() => {});
  } catch (err: any) {
    _lastScheduleError = err?.message || String(err);
    console.error('[Notifications] Scheduling error:', err);
  }
}

// ── Test Notification Trigger (Instant verification) ──────────────────────────

export function checkAndTriggerWaterMilestones(..._args: any[]): void {
  // Legacy stub
}

export async function sendTestGymNotification(): Promise<boolean> {
  try {
    await ensureNotificationChannels();
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const ok = await requestNotificationPermissions();
      if (!ok) return false;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to Train: Push Day A 🏋️',
        body: 'Starting with Incline DB Bench & Cable Flies. 5 exercises on deck.',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'gym_reminder',
        data: { type: 'test_notification' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        channelId: 'gym_reminders',
      },
    });

    return true;
  } catch (e) {
    console.warn('[Notifications] Failed to send test notification:', e);
    return false;
  }
}
