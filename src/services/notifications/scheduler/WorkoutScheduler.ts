import { resolveExerciseTargetMuscle } from '../../../utils/gymUtils';
/**
 * WorkoutScheduler.ts — ZenFit Omnichannel Notification Engine (ZONE)
 * Enterprise-grade 72-Hour Rolling Workout Scheduler with Ghost-Cancel & Deduplication.
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GymLog, UserGymPlanDoc } from '../../../types/gym.types';
import { planDayIndexForDate, resolvePlanDay } from '../../../data/gymPlan';
import { formatLocalDateStr, offsetDateStr } from '../../../utils/dateUtils';
import {
  CandidateAlarm,
  NotificationCategory,
  NotificationPriority,
  NotificationScheduleStatus,
} from '../types';
import { notificationMutex } from '../core/AsyncMutex';
import { IdempotencyLedger } from '../core/IdempotencyLedger';
import { RateLimiter } from '../core/RateLimiter';
import {
  ensureNotificationChannels,
  requestNotificationPermissions,
  WORKOUT_REMINDERS_CHANNEL_ID,
  RECOVERY_CHANNEL_ID,
} from '../core/NotificationChannels';
import { PreferenceManager } from '../core/NotificationPreferences';
import {
  getWorkoutReminderCopy,
  getMissedWorkoutCopy,
  getTomorrowBlueprintCopy,
  getRestDayInsightCopy,
  getSundayBriefingCopy,
  getInactivityReengagementCopy,
} from '../../notificationPools';

export const NOTIF_FINGERPRINT_KEY = '@zenfit_notif_fingerprint';
export const LAST_APP_OPEN_KEY = '@zenfit_last_app_open_ts';

let _lastScheduleFingerprint: string | null = null;
let _lastScheduleError: string | null = null;
let _lastScheduledCount: number = 0;
let _lastScheduleTime: number | null = null;
let _cachedPermissionGranted: boolean | null = null;

export interface ScheduleParams {
  gymLogs?: GymLog[];
  userGymPlan?: UserGymPlanDoc | null;
  userName?: string;
  force?: boolean;
}

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

  const [hStr, mStr] = raw.replace(/[^0-9:]/g, '').split(':');
  const h = Number(hStr);
  const m = Number(mStr);
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

export class WorkoutScheduler {
  public static clearCache(): void {
    _lastScheduleFingerprint = null;
    AsyncStorage.removeItem(NOTIF_FINGERPRINT_KEY).catch(() => {});
  }

  public static async getStatus(): Promise<NotificationScheduleStatus> {
    const active = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    return {
      lastFingerprint: _lastScheduleFingerprint,
      scheduledCount: _lastScheduledCount,
      lastScheduleTime: _lastScheduleTime,
      lastError: _lastScheduleError,
      activeAlarmsCount: active.length,
    };
  }

  /**
   * Fast Ghost-Cancel: Instantly silences today's workout reminders upon logging sets
   */
  public static async cancelTodayTrainingAlerts(dateStr?: string): Promise<void> {
    try {
      const targetDate = dateStr || formatLocalDateStr(new Date());
      const workoutId = IdempotencyLedger.getIdentifier(NotificationCategory.GYM_WORKOUT, targetDate);
      const missedId = IdempotencyLedger.getIdentifier(NotificationCategory.MISSED_WORKOUT, targetDate);

      // Cancel deterministic IDs directly
      await Promise.all([
        Notifications.cancelScheduledNotificationAsync(workoutId).catch(() => {}),
        Notifications.cancelScheduledNotificationAsync(missedId).catch(() => {}),
        // Also cancel legacy pattern IDs if any exist
        Notifications.cancelScheduledNotificationAsync(`gym_workout_${targetDate}`).catch(() => {}),
        Notifications.cancelScheduledNotificationAsync(`gym_missed_${targetDate}`).catch(() => {}),
        IdempotencyLedger.remove(workoutId),
        IdempotencyLedger.remove(missedId),
      ]);
    } catch (err) {
      // Continue silently
    }
  }

  /**
   * Single Source of Truth Scheduler
   * Completely protected by AsyncMutex & IdempotencyLedger
   */
  public static async schedule(params: ScheduleParams): Promise<void> {
    return notificationMutex.runExclusive(async () => {
      const { gymLogs = [], userGymPlan = null, force = false } = params;

      try {
        // 1. Ensure notification channels & hydrate ledger
        await ensureNotificationChannels();
        await IdempotencyLedger.hydrate();

        // 2. Verify OS notification permissions
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

        const now = new Date();
        const todayKey = formatLocalDateStr(now);
        const todayCompleted = (gymLogs || []).some(l => l.date === todayKey && (l.completed || (l.exercises || []).some((e: any) => (e.setsLog || []).some((s: any) => s.completed && !s.isWarmup))));
        const customDaysSig = Object.keys(userGymPlan?.customDays || {}).sort().join(',');
        const preFingerprint = `${todayKey}_${userGymPlan?.updatedAt || 0}_${userGymPlan?.templateId || ''}_${customDaysSig}_${todayCompleted}_${gymLogs.length}`;

        if (!force && _lastScheduleFingerprint === preFingerprint) {
          return;
        }

        const nowMs = Date.now();
        if (nowMs - _lastScheduleTime >= 3600000) {
          await AsyncStorage.setItem(LAST_APP_OPEN_KEY, String(nowMs)).catch(() => {});
        }

        // 3. Load user preferences
        const prefs = await PreferenceManager.getPreferences();
        const {
          trainingRemindersEnabled,
          preferredWorkoutTime,
          recoveryCoachingEnabled,
          sundayBriefingEnabled,
          quietHoursEnabled,
          quietHoursStart,
          quietHoursEnd,
          maxDailyNotifications,
          minGapMinutes,
        } = prefs;

        const { hours: anchorH, minutes: anchorM } = parseTimeString(preferredWorkoutTime);
        const quietStartHM = parseTimeString(quietHoursStart);
        const quietEndHM = parseTimeString(quietHoursEnd);

        // 4. State fingerprinting (Bail fast if state is identical)
        const latestLogDate = (gymLogs || []).reduce((max, log) => (log.date > max ? log.date : max), '');
        const planId = userGymPlan?.id || userGymPlan?.templateId || 'default';
        const fingerprint = `${todayKey}_${trainingRemindersEnabled}_${recoveryCoachingEnabled}_${sundayBriefingEnabled}_${anchorH}:${anchorM}_${planId}_${latestLogDate}`;

        if (!force && _lastScheduleFingerprint === fingerprint) {
          return;
        }

        // If user disabled all notifications, purge and stop
        if (!trainingRemindersEnabled && !recoveryCoachingEnabled && !sundayBriefingEnabled) {
          await this._purgeExistingAlarms();
          _lastScheduleFingerprint = preFingerprint;
          _lastScheduledCount = 0;
          await AsyncStorage.setItem(NOTIF_FINGERPRINT_KEY, fingerprint).catch(() => {});
          return;
        }

        // 5. Pre-resolve 7-day plans once across churn check, horizon & recovery loops
        const preResolvedPlans = new Map<number, any>();
        for (let d = 1; d <= 7; d++) {
          preResolvedPlans.set(d, resolvePlanDay(userGymPlan, d));
        }

        const candidateAlarms: CandidateAlarm[] = [];

        // 5b. Churn / Inactivity Backoff: 3-Strike Rule
        let consecutiveMissed = 0;
        for (let back = 1; back <= 7; back++) {
          const pastDate = new Date(now);
          pastDate.setDate(pastDate.getDate() - back);
          const pastDateStr = formatLocalDateStr(pastDate);
          const pastPlanIdx = planDayIndexForDate(pastDateStr);
          const pastPlanDay = preResolvedPlans.get(pastPlanIdx) || resolvePlanDay(userGymPlan, pastPlanIdx);

          if (pastPlanDay && !pastPlanDay.isRest) {
            const hadLog = gymLogs.some(
              l => l.date === pastDateStr && (l.completed || (l.exercises || []).some(e => (e.setsLog || []).some(s => s.completed)))
            );
            if (!hadLog) consecutiveMissed++;
            else break;
          }
        }

        if (consecutiveMissed >= 3) {
          const reengageDate = new Date(now);
          reengageDate.setDate(reengageDate.getDate() + 4);
          const reengageTime = dateAtHM(reengageDate, 18, 0);

          const copy = getInactivityReengagementCopy();
          candidateAlarms.push({
            identifier: IdempotencyLedger.getIdentifier(NotificationCategory.CHURN_REENGAGEMENT),
            triggerDate: reengageTime,
            priorityTier: NotificationPriority.NORMAL,
            content: {
              title: copy.title,
              body: copy.body,
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.DEFAULT,
              categoryIdentifier: 'churn_reengagement',
              data: { type: 'churn_reengagement' },
            },
            channelId: WORKOUT_REMINDERS_CHANNEL_ID,
          });
        }

        // 6. Rolling 72-Hour Window (D0, D+1, D+2)
        const isNewUser = (gymLogs || []).filter(l => l.completed).length < 2;

        for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
          const targetDate = new Date(now);
          targetDate.setDate(targetDate.getDate() + dayOffset);
          const dateStr = formatLocalDateStr(targetDate);

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
          const planDay = preResolvedPlans.get(planIdx) || resolvePlanDay(userGymPlan, planIdx);
          const isRestDay = !planDay || Boolean(planDay.isRest);

          // ── TRAINING DAY Reminders ──
          if (!isRestDay && trainingRemindersEnabled) {
            if (!alreadyTrained) {
              let dayH = anchorH;
              let dayM = anchorM;
              const dayStartPref = planDay.startTime || userGymPlan?.customDays?.[planIdx]?.startTime;
              if (dayStartPref) {
                const parsed = parseTimeString(dayStartPref);
                dayH = parsed.hours;
                dayM = parsed.minutes;
              }

              const reminderTime = dateAtHM(targetDate, dayH, dayM);

              if (reminderTime.getTime() > now.getTime()) {
                const planName = planDay.name || 'Workout Session';
                const top2 = (planDay.exercises || []).slice(0, 2).map(e => e.name).filter(Boolean);
                const copy = getWorkoutReminderCopy(planName, top2, planDay.exercises?.length);

                candidateAlarms.push({
                  identifier: IdempotencyLedger.getIdentifier(NotificationCategory.GYM_WORKOUT, dateStr),
                  triggerDate: reminderTime,
                  priorityTier: NotificationPriority.HIGH,
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
                  channelId: WORKOUT_REMINDERS_CHANNEL_ID,
                });
              }

              // Missed Workout Catch
              if (dayH < 17) {
                const missedTime = new Date(reminderTime.getTime() + 3 * 60 * 60 * 1000);
                if (missedTime.getTime() > now.getTime() && missedTime.getHours() < 22) {
                  const copy = getMissedWorkoutCopy(planDay.name, false);
                  candidateAlarms.push({
                    identifier: IdempotencyLedger.getIdentifier(NotificationCategory.MISSED_WORKOUT, dateStr),
                    triggerDate: missedTime,
                    priorityTier: NotificationPriority.NORMAL,
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
                    channelId: WORKOUT_REMINDERS_CHANNEL_ID,
                  });
                }
              } else if (dayH < 19 || (dayH === 19 && dayM <= 30)) {
                const candidateMs = Math.min(
                  reminderTime.getTime() + 2.5 * 60 * 60 * 1000,
                  dateAtHM(targetDate, 21, 15).getTime()
                );
                const missedTime = new Date(candidateMs);
                if (missedTime.getTime() > now.getTime()) {
                  const copy = getMissedWorkoutCopy(planDay.name, true);
                  candidateAlarms.push({
                    identifier: IdempotencyLedger.getIdentifier(NotificationCategory.MISSED_WORKOUT, dateStr),
                    triggerDate: missedTime,
                    priorityTier: NotificationPriority.NORMAL,
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
                    channelId: WORKOUT_REMINDERS_CHANNEL_ID,
                  });
                }
              }
            }
          }

          // ── REST DAY Biological Recovery Insights ──
          if (isRestDay && recoveryCoachingEnabled && !isNewUser) {
            const restTime = dateAtHM(targetDate, 10, 0);

            if (restTime.getTime() > now.getTime()) {
              const yestDate = new Date(targetDate);
              yestDate.setDate(yestDate.getDate() - 1);
              const yestStr = formatLocalDateStr(yestDate);
              const yestPlanIdx = planDayIndexForDate(yestStr);
              const yestPlan = preResolvedPlans.get(yestPlanIdx) || resolvePlanDay(userGymPlan, yestPlanIdx);
              const yestWasTraining = yestPlan && !yestPlan.isRest;
              const yestHadSets = gymLogs.some(
                l => l.date === yestStr && (l.completed || (l.exercises || []).some(e => (e.setsLog || []).some(s => s.completed)))
              );

              let branch: 'missed_yesterday' | 'lagging_mev' | 'cns_recovery' | null = null;
              let branchData: any = {};

              if (yestWasTraining && !yestHadSets) {
                branch = 'missed_yesterday';
                branchData = { routineName: yestPlan.name };
              } else {
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
                  const sevenDaysAgoStr = offsetDateStr(dateStr, -7);
                  const past7dLogs = (gymLogs || []).filter(l => l.date >= sevenDaysAgoStr && l.date <= dateStr);
                  const muscleCounts: Record<string, number> = {
                    Chest: 0, Back: 0, Delts: 0, Quads: 0, Hamstrings: 0, Arms: 0,
                  };
                  for (const l of past7dLogs) {
                    for (const ex of l.exercises || []) {
                      const validSets = (ex.setsLog || []).filter((s: any) => s.completed && !s.isWarmup).length;
                      const { canonicalGroup } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
                      if (canonicalGroup === 'Chest') muscleCounts.Chest += validSets;
                      else if (canonicalGroup === 'Back') muscleCounts.Back += validSets;
                      else if (canonicalGroup === 'Shoulders') muscleCounts.Delts += validSets;
                      else if (canonicalGroup === 'Quads') muscleCounts.Quads += validSets;
                      else if (canonicalGroup === 'Hamstrings' || canonicalGroup === 'Glutes') muscleCounts.Hamstrings += validSets;
                      else if (canonicalGroup === 'Arms' || canonicalGroup === 'Biceps' || canonicalGroup === 'Triceps') muscleCounts.Arms += validSets;
                    }
                  }
                  const laggingEntry = Object.entries(muscleCounts).find(([_, sets]) => sets > 0 && sets < 6);
                  if (laggingEntry) {
                    branch = 'lagging_mev';
                    branchData = {
                      muscleName: laggingEntry[0],
                      currentSets: laggingEntry[1],
                      targetSets: 10,
                    };
                  }
                }
              }

              if (branch) {
                const copy = getRestDayInsightCopy(branch, branchData);
                candidateAlarms.push({
                  identifier: IdempotencyLedger.getIdentifier(NotificationCategory.REST_DAY_RECOVERY, dateStr),
                  triggerDate: restTime,
                  priorityTier: NotificationPriority.NORMAL,
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
                  channelId: RECOVERY_CHANNEL_ID,
                });
              }
            }
          }

          // ── Tomorrow's Blueprint Preview at 21:00 ──
          if (trainingRemindersEnabled) {
            const tomorrowDate = new Date(targetDate);
            tomorrowDate.setDate(tomorrowDate.getDate() + 1);
            const tomDateStr = formatLocalDateStr(tomorrowDate);
            const tomPlanIdx = planDayIndexForDate(tomDateStr);
            const tomPlan = resolvePlanDay(userGymPlan, tomPlanIdx);

            const canSendBlueprint = !tomPlan?.isRest && (isRestDay || alreadyTrained);
            if (canSendBlueprint) {
              const blueprintTime = dateAtHM(targetDate, 21, 0);

              if (blueprintTime.getTime() > now.getTime()) {
                const primaryLift = tomPlan?.exercises?.[0]?.name || 'Compound Lifts';
                const copy = getTomorrowBlueprintCopy(tomPlan?.name || 'Workout', primaryLift);

                candidateAlarms.push({
                  identifier: IdempotencyLedger.getIdentifier(NotificationCategory.TOMORROW_BLUEPRINT, dateStr),
                  triggerDate: blueprintTime,
                  priorityTier: NotificationPriority.LOW,
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
                  channelId: WORKOUT_REMINDERS_CHANNEL_ID,
                });
              }
            }
          }
        }

        // 7. Sunday Strength Briefing at 11:00 AM
        if (sundayBriefingEnabled && !isNewUser) {
          const currentDay = now.getDay();
          const daysUntilSunday = (7 - currentDay) % 7;
          const sundayDate = new Date(now);
          sundayDate.setDate(sundayDate.getDate() + daysUntilSunday);
          const briefingTime = dateAtHM(sundayDate, 11, 0);

          if (briefingTime.getTime() > now.getTime()) {
            const mondayDate = new Date(now);
            const dayOfWeek = mondayDate.getDay();
            const diffToMonday = (dayOfWeek + 6) % 7;
            mondayDate.setDate(mondayDate.getDate() - diffToMonday);
            const mondayStr = formatLocalDateStr(mondayDate);

            const logsThisWeek = (gymLogs || []).filter(l => l.date >= mondayStr && l.completed);

            if (logsThisWeek.length >= 1) {
              let totalVol = 0;
              let prCount = 0;
              for (const l of logsThisWeek) {
                for (const ex of l.exercises || []) {
                  for (const s of ex.setsLog || []) {
                    if (s.completed && !s.isWarmup) {
                      totalVol += (Number(s.weight) || 0) * (Number(s.reps) || 0);
                      if ((s as any).isPR || (ex as any).isPR) prCount++;
                    }
                  }
                }
              }

              const copy = getSundayBriefingCopy(logsThisWeek.length, totalVol, prCount);
              const sundayStr = formatLocalDateStr(sundayDate);

              candidateAlarms.push({
                identifier: IdempotencyLedger.getIdentifier(NotificationCategory.WEEKLY_REPORT, sundayStr),
                triggerDate: briefingTime,
                priorityTier: NotificationPriority.HIGH,
                content: {
                  title: copy.title,
                  body: copy.body,
                  sound: 'default',
                  priority: Notifications.AndroidNotificationPriority.HIGH,
                  categoryIdentifier: 'gym_weekly_report',
                  data: {
                    type: 'weekly_report',
                    dateStr: sundayStr,
                  },
                },
                channelId: RECOVERY_CHANNEL_ID,
              });
            }
          }
        }

        // 8. Rate Limiter & Quiet Hours Capping
        const approvedAlarms = RateLimiter.filterAndCap(candidateAlarms, {
          maxPerDay: maxDailyNotifications,
          minGapMinutes,
          quietHoursEnabled,
          quietStart: quietStartHM,
          quietEnd: quietEndHM,
        });

        // 9. Reconciliation: Prune alarms no longer in approved list (preserving active rest timer)
        const approvedIdSet = new Set(approvedAlarms.map(a => a.identifier));
        const currentOsAlarms = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);

        const toCancel = currentOsAlarms.filter(a => {
          const id = a.identifier || '';
          // NEVER touch the active rest timer or ongoing workout HUD during regular workout reconciliation
          if (id.includes('rest_timer') || id.includes('workout_in_progress') || id.includes('active_workout')) {
            return false;
          }
          const isManagedAlarm = id.startsWith('zenfit:') || id.startsWith('gym_');
          return isManagedAlarm && !approvedIdSet.has(id);
        });

        await Promise.all(
          toCancel.map(alarm => Notifications.cancelScheduledNotificationAsync(alarm.identifier).catch(() => {}))
        );

        // 10. Schedule Approved Alarms with Deduplication Check
        let scheduledCount = 0;
        for (const alarm of approvedAlarms) {
          const hash = IdempotencyLedger.computeContentHash(
            alarm.identifier,
            alarm.content.title,
            alarm.content.body,
            alarm.triggerDate.getTime()
          );

          // If content and trigger are already scheduled, skip redundant native call
          if (IdempotencyLedger.isDuplicate(alarm.identifier, hash)) {
            scheduledCount++;
            continue;
          }

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

            await IdempotencyLedger.recordScheduled(
              alarm.identifier,
              (alarm.content.categoryIdentifier as NotificationCategory) || NotificationCategory.GYM_WORKOUT,
              hash,
              alarm.triggerDate.getTime(),
              true
            );

            scheduledCount++;
          } catch (schedErr) {
            console.warn(`[WorkoutScheduler] Failed to schedule ${alarm.identifier}:`, schedErr);
          }
        }

        _lastScheduleFingerprint = fingerprint;
        await IdempotencyLedger.persist();
        _lastScheduledCount = scheduledCount;
        _lastScheduleTime = Date.now();
        _lastScheduleError = null;
        await AsyncStorage.setItem(NOTIF_FINGERPRINT_KEY, fingerprint).catch(() => {});
      } catch (err: any) {
        _lastScheduleError = err?.message || String(err);
        console.error('[WorkoutScheduler] Scheduling error:', err);
      }
    });
  }

  private static async _purgeExistingAlarms(): Promise<void> {
    try {
      const existing = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
      const toCancel = existing.filter(a => {
        const id = a.identifier || '';
        if (id.includes('rest_timer') || id.includes('workout_in_progress')) return false;
        return id.startsWith('zenfit:') || id.startsWith('gym_');
      });

      await Promise.all(
        toCancel.map(a => Notifications.cancelScheduledNotificationAsync(a.identifier).catch(() => {}))
      );
    } catch {}
  }
}
