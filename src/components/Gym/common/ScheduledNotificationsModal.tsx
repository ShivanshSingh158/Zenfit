/**
 * ScheduledNotificationsModal.tsx — ZenFit Mobile
 *
 * Fully transparent OS-level scheduled notification inspector.
 * Ported & enhanced from ZenTrack Mobile for ZenFit with pure OLED dark aesthetics:
 * - Lists every active local alarm/notification registered with the mobile OS (expo-notifications).
 * - Displays exact trigger time, relative countdown, category badge, and channel.
 * - Allows per-notification inspection, single-tap cancellation, and full schedule refresh.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../../contexts/ThemeContext';
import { FONT_FAMILY } from '../../../theme/tokens';
import { impactAsync, notificationAsync, selectionAsync } from '../../../utils/haptics';
import { GymLog } from '../../../contexts/MobileDataContext';
import { UserGymPlanDoc } from '../../../types/gym.types';
import {
  scheduleGymNotifications,
  clearScheduleCache,
} from '../../../services/notifications';

interface Props {
  visible: boolean;
  onClose: () => void;
  gymLogs?: GymLog[];
  userGymPlan?: UserGymPlanDoc | null;
  onCountChange?: (count: number) => void;
}

interface EnrichedAlarm {
  identifier: string;
  triggerMs: number;
  trigger: any;
  content: Notifications.NotificationContent;
  category: {
    tag: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bgColor: string;
  };
}

function getTriggerTimestamp(trigger: any, nowMs: number, item?: any): number {
  if (!trigger) {
    if (item?.content?.data?.dateStr) {
      const d = new Date(item.content.data.dateStr + 'T18:00:00');
      if (!isNaN(d.getTime())) return d.getTime();
    }
    return 0;
  }
  if (typeof trigger === 'number') return trigger;
  if (typeof trigger === 'string') {
    const t = new Date(trigger).getTime();
    if (!isNaN(t)) return t;
  }
  if (typeof trigger.timestamp === 'number') return trigger.timestamp;
  if (typeof trigger.value === 'number') return trigger.value;
  if (typeof trigger.value === 'string') {
    const t = new Date(trigger.value).getTime();
    if (!isNaN(t)) return t;
  }
  if (typeof trigger.date === 'number') return trigger.date;
  if (typeof trigger.date === 'string') {
    const t = new Date(trigger.date).getTime();
    if (!isNaN(t)) return t;
  }
  if (trigger.date instanceof Date) return trigger.date.getTime();
  if (typeof trigger.seconds === 'number') return nowMs + trigger.seconds * 1000;
  if (typeof trigger.timeInterval === 'number') return nowMs + trigger.timeInterval * 1000;
  if (typeof trigger.hour === 'number' && typeof trigger.minute === 'number') {
    const d = new Date(nowMs);
    d.setHours(trigger.hour, trigger.minute, 0, 0);
    if (d.getTime() <= nowMs) {
      d.setDate(d.getDate() + 1);
    }
    return d.getTime();
  }
  if (item?.content?.data?.dateStr) {
    const d = new Date(item.content.data.dateStr + 'T18:00:00');
    if (!isNaN(d.getTime())) return d.getTime();
  }
  return 0;
}

function formatAlarmTrigger(triggerMs: number, nowMs: number): { label: string; countdown: string; isPast: boolean } {
  if (!triggerMs) return { label: 'Immediate / Active', countdown: 'Active', isPast: false };
  const diffMs = triggerMs - nowMs;
  const diffMin = Math.round(diffMs / 60000);
  const isPast = diffMin < 0;
  const triggerDate = new Date(triggerMs);

  let countdown = '';
  if (isPast) {
    const absMin = Math.abs(diffMin);
    if (absMin < 5) countdown = 'Just now';
    else if (absMin < 60) countdown = `${absMin}m ago`;
    else countdown = 'Triggered';
  } else if (diffMin < 60) {
    countdown = `in ${Math.max(1, diffMin)}m`;
  } else if (diffMin < 24 * 60) {
    const hrs = Math.floor(diffMin / 60);
    const remMin = diffMin % 60;
    countdown = remMin > 0 ? `in ${hrs}h ${remMin}m` : `in ${hrs}h`;
  } else {
    const days = Math.round(diffMin / (24 * 60));
    countdown = days === 1 ? 'in 1 day' : `in ${days} days`;
  }

  const isToday = triggerDate.toDateString() === new Date(nowMs).toDateString();
  const tomDate = new Date(nowMs);
  tomDate.setDate(tomDate.getDate() + 1);
  const isTomorrow = triggerDate.toDateString() === tomDate.toDateString();

  const timeStr = triggerDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  let label = '';
  if (isToday) label = `Today, ${timeStr}`;
  else if (isTomorrow) label = `Tomorrow, ${timeStr}`;
  else {
    const dayStr = triggerDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    label = `${dayStr}, ${timeStr}`;
  }

  return { label, countdown, isPast };
}

function getCategoryInfo(item: any): { tag: string; icon: keyof typeof Ionicons.glyphMap; color: string; bgColor: string } {
  const type = item.content?.data?.type || '';
  const channel = item.content?.channelId || item.trigger?.channelId || '';
  const identifier = item.identifier || '';
  const categoryId = item.content?.categoryIdentifier || '';

  if (type === 'gym_workout' || categoryId === 'gym_reminder' || identifier.startsWith('gym_workout_')) {
    return { tag: 'WORKOUT', icon: 'barbell', color: '#30D158', bgColor: 'rgba(48, 209, 88, 0.15)' };
  }
  if (type === 'weekly_report' || categoryId === 'gym_weekly_report' || identifier.startsWith('gym_weekly_report')) {
    return { tag: 'REPORT', icon: 'analytics', color: '#FF9F0A', bgColor: 'rgba(255, 159, 10, 0.15)' };
  }
  if (type === 'gym_rest' || identifier.startsWith('gym_rest_')) {
    return { tag: 'REST DAY', icon: 'moon', color: '#38BDF8', bgColor: 'rgba(56, 189, 248, 0.15)' };
  }
  if (type === 'active_rest_timer' || type === 'rest_timer' || identifier.startsWith('rest_timer_')) {
    return { tag: 'REST TIMER', icon: 'stopwatch', color: '#BF5AF2', bgColor: 'rgba(191, 90, 242, 0.15)' };
  }
  if (type === 'test_notification') {
    return { tag: 'TEST', icon: 'paper-plane', color: '#0A84FF', bgColor: 'rgba(10, 132, 255, 0.15)' };
  }
  return { tag: 'REMINDER', icon: 'notifications', color: '#A599FF', bgColor: 'rgba(165, 153, 255, 0.15)' };
}

export default function ScheduledNotificationsModal({
  visible,
  onClose,
  gymLogs = [],
  userGymPlan = null,
  onCountChange,
}: Props) {
  const { colors, isDark } = useTheme();
  const [alarms, setAlarms] = useState<EnrichedAlarm[]>([]);
  const [loading, setLoading] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchScheduledAlarms = useCallback(async () => {
    setLoading(true);
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
      const nowMs = Date.now();

      const enriched: EnrichedAlarm[] = scheduled.map((item: any) => ({
        identifier: item.identifier,
        triggerMs: getTriggerTimestamp(item.trigger, nowMs, item),
        trigger: item.trigger,
        content: item.content,
        category: getCategoryInfo(item),
      }));

      // Sort chronologically (earliest to latest; 0/immediate first)
      enriched.sort((a, b) => {
        if (!a.triggerMs && !b.triggerMs) return 0;
        if (!a.triggerMs) return -1;
        if (!b.triggerMs) return 1;
        return a.triggerMs - b.triggerMs;
      });

      setAlarms(enriched);
      onCountChange?.(enriched.length);
    } catch (e) {
      console.warn('[ScheduledNotificationsModal] Error fetching alarms:', e);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    if (visible) {
      fetchScheduledAlarms();
    }
  }, [visible, fetchScheduledAlarms]);

  const handleRescheduleAll = async () => {
    impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRescheduling(true);
    try {
      clearScheduleCache();
      await scheduleGymNotifications({ gymLogs, userGymPlan });
      notificationAsync(Haptics.NotificationFeedbackType.Success);
      await fetchScheduledAlarms();
    } catch (e: any) {
      Alert.alert('Reschedule Failed', e?.message || 'Unable to reschedule gym notifications.');
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancelAlarm = (identifier: string, title?: string) => {
    impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Cancel Notification?',
      `Are you sure you want to cancel this scheduled alert: "${title || identifier}"?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Alert',
          style: 'destructive',
          onPress: async () => {
            try {
              await Notifications.cancelScheduledNotificationAsync(identifier);
              notificationAsync(Haptics.NotificationFeedbackType.Success);
              setAlarms(prev => {
                const next = prev.filter(a => a.identifier !== identifier);
                onCountChange?.(next.length);
                return next;
              });
            } catch (err) {
              Alert.alert('Error', 'Failed to cancel notification.');
            }
          },
        },
      ]
    );
  };

  const handleCancelAllGym = () => {
    impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Clear All Scheduled Alarms',
      'This will remove all upcoming workout and recovery alerts from your phone. Active rest timers will remain untouched.',
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
              const gymAlarms = scheduled.filter(a => {
                const id = a.identifier || '';
                return !id.startsWith('rest_timer_');
              });
              await Promise.all(
                gymAlarms.map(a => Notifications.cancelScheduledNotificationAsync(a.identifier).catch(() => {}))
              );
              notificationAsync(Haptics.NotificationFeedbackType.Success);
              await fetchScheduledAlarms();
            } catch (e) {
              Alert.alert('Error', 'Failed to clear scheduled alarms.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.cardContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.headerTitle}>
                  Scheduled Alarms
                </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{alarms.length}</Text>
                </View>
              </View>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                Upcoming alarms currently registered in the OS
              </Text>
            </View>

            <View style={styles.headerActionBtns}>
              <TouchableOpacity
                onPress={fetchScheduledAlarms}
                disabled={loading || rescheduling}
                style={styles.circleBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Refresh scheduled alarms"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="refresh-outline" size={17} color="#FFFFFF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                style={styles.circleBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Subheader action strip */}
          <View style={styles.actionStrip}>
            <TouchableOpacity
              onPress={handleRescheduleAll}
              disabled={rescheduling || loading}
              style={[styles.stripBtn, rescheduling && { opacity: 0.6 }]}
              activeOpacity={0.7}
            >
              {rescheduling ? (
                <ActivityIndicator size="small" color="#0A84FF" style={{ marginRight: 4 }} />
              ) : (
                <Ionicons name="sync-outline" size={13} color="#0A84FF" style={{ marginRight: 4 }} />
              )}
              <Text style={styles.stripBtnText}>Sync / Reschedule</Text>
            </TouchableOpacity>

            {alarms.length > 0 && (
              <TouchableOpacity
                onPress={handleCancelAllGym}
                style={[styles.stripBtn, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={13} color="#EF4444" style={{ marginRight: 4 }} />
                <Text style={[styles.stripBtnText, { color: '#EF4444' }]}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Alarm Content List */}
          {loading && alarms.length === 0 ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingText}>Reading registered OS alarms...</Text>
            </View>
          ) : alarms.length === 0 ? (
            <View style={styles.centerState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="checkmark-circle-outline" size={36} color="#30D158" />
              </View>
              <Text style={styles.emptyTitle}>No Active Alarms Queued</Text>
              <Text style={styles.emptySub}>
                Workout and recovery alarms are scheduled dynamically based on your active plan.
                Tap "Sync / Reschedule" above to generate this week's alerts.
              </Text>
              <TouchableOpacity
                onPress={handleRescheduleAll}
                style={styles.emptyActionBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyActionBtnText}>Schedule Alarms Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollList}
            >
              {alarms.map(item => {
                const nowMs = Date.now();
                const { label, countdown, isPast } = formatAlarmTrigger(item.triggerMs, nowMs);
                const title = item.content?.title || 'ZenFit Alert';
                const body = item.content?.body || '';
                const isExpanded = expandedId === item.identifier;
                const channelId = (item.trigger as any)?.channelId || (item.content as any)?.channelId || 'default';

                return (
                  <View key={item.identifier} style={styles.alarmCard}>
                    {/* Top Row: Category Tag, Trigger Date, Countdown Badge */}
                    <View style={styles.alarmTopRow}>
                      <View style={styles.alarmTagRow}>
                        <View style={[styles.categoryBadge, { backgroundColor: item.category.bgColor }]}>
                          <Ionicons name={item.category.icon} size={11} color={item.category.color} />
                          <Text style={[styles.categoryBadgeText, { color: item.category.color }]}>
                            {item.category.tag}
                          </Text>
                        </View>
                        <Text style={styles.triggerTimeLabel} numberOfLines={1}>
                          {label}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.countdownBadge,
                          isPast ? styles.countdownPast : styles.countdownFuture,
                        ]}
                      >
                        <Text
                          style={[
                            styles.countdownText,
                            { color: isPast ? '#EF4444' : '#30D158' },
                          ]}
                        >
                          {countdown}
                        </Text>
                      </View>
                    </View>

                    {/* Notification Title & Body */}
                    <Text style={styles.alarmTitle} numberOfLines={2}>
                      {title}
                    </Text>
                    {body ? (
                      <Text style={styles.alarmBody} numberOfLines={3}>
                        {body}
                      </Text>
                    ) : null}

                    {/* Technical Transparency Details (Expandable) */}
                    {isExpanded && (
                      <View style={styles.expandedMetaBox}>
                        <View style={styles.metaRow}>
                          <Text style={styles.metaLabel}>Identifier:</Text>
                          <Text style={styles.metaValue} numberOfLines={1} selectable>
                            {item.identifier}
                          </Text>
                        </View>
                        <View style={styles.metaRow}>
                          <Text style={styles.metaLabel}>OS Channel:</Text>
                          <Text style={styles.metaValue} numberOfLines={1}>
                            {channelId}
                          </Text>
                        </View>
                        {item.triggerMs > 0 && (
                          <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Exact Time:</Text>
                            <Text style={styles.metaValue} numberOfLines={1}>
                              {new Date(item.triggerMs).toISOString().replace('T', ' ').slice(0, 19)}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Card Footer: Details toggle & Delete button */}
                    <View style={styles.alarmFooterRow}>
                      <TouchableOpacity
                        onPress={() => {
                          selectionAsync();
                          setExpandedId(isExpanded ? null : item.identifier);
                        }}
                        style={styles.detailsToggleBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'information-circle-outline'}
                          size={13}
                          color="#8E8E93"
                        />
                        <Text style={styles.detailsToggleText}>
                          {isExpanded ? 'Hide Details' : 'OS Payload'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleCancelAlarm(item.identifier, title)}
                        style={styles.cancelAlarmBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        <Text style={styles.cancelAlarmBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Footer note */}
          <View style={styles.modalFooter}>
            <View style={styles.osIndicatorDot} />
            <Text style={styles.modalFooterText}>
              Direct OS Registry • Background Alarms Active
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  cardContainer: {
    backgroundColor: '#141416',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.58,
    shadowRadius: 24,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
  countBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8E8E93',
    marginTop: 2,
  },
  headerActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  stripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.3)',
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
  },
  stripBtnText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11.5,
    color: '#0A84FF',
  },
  centerState: {
    paddingVertical: 50,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 14,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(48, 209, 88, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  emptySub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17,
  },
  emptyActionBtn: {
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emptyActionBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#000000',
  },
  scrollList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  alarmCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  alarmTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alarmTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6.5,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 4,
  },
  categoryBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    letterSpacing: 0.4,
  },
  triggerTimeLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11.5,
    color: '#8E8E93',
    flex: 1,
  },
  countdownBadge: {
    paddingHorizontal: 7.5,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  countdownFuture: {
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
  },
  countdownPast: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  countdownText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
  },
  alarmTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  alarmBody: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
  expandedMetaBox: {
    marginTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 8,
    padding: 9,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10.5,
    color: '#636366',
  },
  metaValue: {
    fontFamily: FONT_FAMILY.mono || FONT_FAMILY.regular,
    fontSize: 10.5,
    color: '#AEAEB2',
    maxWidth: 220,
  },
  alarmFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  detailsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailsToggleText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
  },
  cancelAlarmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  cancelAlarmBtnText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#EF4444',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  osIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#30D158',
  },
  modalFooterText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#636366',
  },
});
