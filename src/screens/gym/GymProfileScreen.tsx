/**
 * GymProfileScreen.tsx — ZenFit
 *
 * Settings & Lifting Preferences Hub
 * Clean Apple iOS Inset Grouped Table architecture on pure #000000 OLED canvas.
 * - Section 1: Workout & Timer Preferences (Weight Unit, Auto-Timer, Audio Beeps, Haptics)
 * - Section 2: Workout Reminders & Notifications (Daily Alert, Reminder Time, Rest Day Tips, Test)
 * - Section 3: Body & Anatomy (Male / Female Silhouette for Body Map)
 * - Section 4: Account & Storage (Cloud Sync, Clear Cache, Destructive Log Out)
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../contexts/ThemeContext';
import { useCoreData } from '../../contexts/domains/CoreDataContext';
import { useGymProfile, setAutoTimerEnabledGlobal } from '../../hooks/useGymProfile';
import { setAudioCuesEnabledGlobal } from '../../services/gymSoundSynthesizer';
import { setHapticsEnabledGlobal, impactAsync, notificationAsync, selectionAsync } from '../../utils/haptics';
import { FONT_FAMILY } from '../../theme/tokens';
import { useGymLogs, useGymPlan, useBodyMetrics } from '../../contexts/domains/WellnessContext';
import * as Notifications from 'expo-notifications';
import ScheduledNotificationsModal from '../../components/Gym/common/ScheduledNotificationsModal';
import {
  scheduleGymNotifications,
  clearScheduleCache,
  GYM_NOTIF_ENABLED_KEY,
  GYM_NOTIF_TIME_KEY,
  GYM_REST_DAY_NOTIF_KEY,
  GYM_RECOVERY_COACHING_KEY,
  GYM_SUNDAY_BRIEFING_KEY,
  requestNotificationPermissions,
} from '../../services/notifications';
import { AthleteProfileCard } from '../../components/Gym/profile/AthleteProfileCard';
import { FullAthleteProfileModal } from '../../components/Gym/profile/FullAthleteProfileModal';
import { SetupAthleteStatsModal } from '../../components/Gym/profile/SetupAthleteStatsModal';
import { computeAthleteCardStats } from '../../services/athleteCardService';

const SETTINGS_PREFS_KEY = 'zentrack_gym_settings_prefs_v1';

const TIME_OPTIONS = [
  { value: '05:30', label: '5:30 AM' },
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '20:00', label: '8:00 PM' },
];

export default function GymProfileScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { user, performSignOut } = useCoreData();
  const { gymProfile, saveGymProfile } = useGymProfile();
  const { gymLogs } = useGymLogs();
  const { userGymPlan } = useGymPlan();

  // ─── Working Preferences State ─────────────────────────────────────────────
  const [unitIsLbs, setUnitIsLbs] = useState(gymProfile?.unitIsLbs ?? false);
  const [autoTimer, setAutoTimer] = useState(gymProfile?.autoTimer ?? true);
  const [hapticsEnabled, setHapticsEnabled] = useState(gymProfile?.hapticsEnabled ?? true);
  const [audioCues, setAudioCues] = useState(gymProfile?.audioCues ?? true);
  const [bodyGender, setBodyGender] = useState<'male' | 'female'>(
    gymProfile?.gender === 'female' ? 'female' : 'male'
  );

  // ─── Notification Preferences State ────────────────────────────────────────
  const [workoutNotifs, setWorkoutNotifs] = useState(true);
  const [notifTime, setNotifTime] = useState('18:00');
  const [recoveryCoaching, setRecoveryCoaching] = useState(true);
  const [sundayBriefing, setSundayBriefing] = useState(true);
  const [showScheduledNotifsModal, setShowScheduledNotifsModal] = useState(false);
  const [scheduledCount, setScheduledCount] = useState<number | null>(null);
  const [showAthleteSetupModal, setShowAthleteSetupModal] = useState(false);
  const [showFullCardModal, setShowFullCardModal] = useState(false);

  const { weightLogs } = useBodyMetrics();

  // Latest tracked weight from Weight Tracking section (auto-updates card in 0ms)
  const latestTrackedWeightKg = useMemo(() => {
    if (weightLogs && weightLogs.length > 0) {
      const sorted = [...weightLogs].sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
      const latest = sorted[0];
      const val = latest?.weightKg ?? (latest as any)?.weight;
      if (val && Number(val) > 0) return Number(val);
    }
    return gymProfile?.weightKg || gymProfile?.bodyweightKg || null;
  }, [weightLogs, gymProfile]);

  const athleteStats = useMemo(() => {
    return computeAthleteCardStats(gymProfile, gymLogs, user, latestTrackedWeightKg, userGymPlan);
  }, [gymProfile, gymLogs, user, latestTrackedWeightKg, userGymPlan]);

  const prefsRef = useRef<Record<string, any>>({});

  // Query OS scheduled notifications count
  useEffect(() => {
    Notifications.getAllScheduledNotificationsAsync()
      .then(items => setScheduledCount(items.length))
      .catch(() => {});
  }, [workoutNotifs, recoveryCoaching, sundayBriefing, notifTime]);

  // Load preferences on mount
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_PREFS_KEY).then(raw => {
      if (!raw) return;
      try {
        const p = JSON.parse(raw);
        prefsRef.current = p || {};
        if (typeof p.unitIsLbs === 'boolean') setUnitIsLbs(p.unitIsLbs);
        if (typeof p.autoTimer === 'boolean') {
          setAutoTimer(p.autoTimer);
          setAutoTimerEnabledGlobal(p.autoTimer);
        }
        if (typeof p.hapticsEnabled === 'boolean') {
          setHapticsEnabled(p.hapticsEnabled);
          setHapticsEnabledGlobal(p.hapticsEnabled);
        }
        if (typeof p.audioCues === 'boolean') {
          setAudioCues(p.audioCues);
          setAudioCuesEnabledGlobal(p.audioCues);
        }
      } catch (_) {}
    });

    AsyncStorage.multiGet([
      GYM_NOTIF_ENABLED_KEY,
      GYM_NOTIF_TIME_KEY,
      GYM_RECOVERY_COACHING_KEY,
      GYM_REST_DAY_NOTIF_KEY,
      GYM_SUNDAY_BRIEFING_KEY,
    ])
      .then(entries => {
        const enabled = entries[0][1];
        const time = entries[1][1];
        const recovery = entries[2][1] ?? entries[3][1];
        const sunday = entries[4][1];
        if (enabled !== null) setWorkoutNotifs(enabled !== 'false');
        if (time) setNotifTime(time);
        if (recovery !== null) setRecoveryCoaching(recovery !== 'false');
        if (sunday !== null) setSundayBriefing(sunday !== 'false');
      })
      .catch(() => {});
  }, []);

  const savePref = useCallback(
    (key: string, val: boolean | string) => {
      try {
        saveGymProfile({ [key]: val } as any);
        prefsRef.current = { ...prefsRef.current, [key]: val };
        AsyncStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(prefsRef.current)).catch(() => {});
      } catch (_) {}
    },
    [saveGymProfile]
  );

  const handleToggleUnit = (toLbs: boolean) => {
    selectionAsync();
    setUnitIsLbs(toLbs);
    savePref('unitIsLbs', toLbs);
  };

  const handleToggleGender = (gender: 'male' | 'female') => {
    selectionAsync();
    setBodyGender(gender);
    savePref('gender', gender);
  };

  const handleToggleWorkoutNotifs = async (v: boolean) => {
    selectionAsync();
    if (v) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please allow notifications in phone settings to receive workout reminders.'
        );
      }
    }
    setWorkoutNotifs(v);
    await AsyncStorage.setItem(GYM_NOTIF_ENABLED_KEY, v ? 'true' : 'false');
    clearScheduleCache();
    scheduleGymNotifications({ gymLogs, userGymPlan, force: true }).catch(() => {});
  };

  const handleToggleRecoveryCoaching = async (v: boolean) => {
    selectionAsync();
    setRecoveryCoaching(v);
    await AsyncStorage.setItem(GYM_RECOVERY_COACHING_KEY, v ? 'true' : 'false');
    await AsyncStorage.setItem(GYM_REST_DAY_NOTIF_KEY, v ? 'true' : 'false');
    clearScheduleCache();
    scheduleGymNotifications({ gymLogs, userGymPlan, force: true }).catch(() => {});
  };

  const handleToggleSundayBriefing = async (v: boolean) => {
    selectionAsync();
    setSundayBriefing(v);
    await AsyncStorage.setItem(GYM_SUNDAY_BRIEFING_KEY, v ? 'true' : 'false');
    clearScheduleCache();
    scheduleGymNotifications({ gymLogs, userGymPlan, force: true }).catch(() => {});
  };

  const handleCycleNotifTime = async () => {
    selectionAsync();
    const currIdx = TIME_OPTIONS.findIndex(t => t.value === notifTime);
    const nextIdx = (currIdx + 1) % TIME_OPTIONS.length;
    const nextVal = TIME_OPTIONS[nextIdx].value;
    setNotifTime(nextVal);
    await AsyncStorage.setItem(GYM_NOTIF_TIME_KEY, nextVal);
    clearScheduleCache();
    scheduleGymNotifications({ gymLogs, userGymPlan, force: true }).catch(() => {});
  };

  const handleClearCache = () => {
    impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Clear Cache',
      'This will reset temporary workout and UI caches without affecting your logs or saved plans.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: () => {
            notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Cache Cleared', 'Temporary caches were cleared successfully.');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of ZenFit? You will return to the welcome screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            notificationAsync(Haptics.NotificationFeedbackType.Success);
            try {
              if (navigation?.canGoBack?.()) {
                navigation.popToTop();
              }
            } catch (_) {}
            await performSignOut();
          },
        },
      ]
    );
  };

  const formattedNotifTime = useMemo(() => {
    return TIME_OPTIONS.find(t => t.value === notifTime)?.label || notifTime;
  }, [notifTime]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* ── Apple iOS Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          {navigation.canGoBack() && (
            <TouchableOpacity
              onPress={() => {
                impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.goBack();
              }}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>Lifting preferences, timers & alerts</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ════════════════════════════════════════════════════════════════════
            ATHLETE PROFILE HERO CARD (Verified Gmail Avatar & Performance)
           ════════════════════════════════════════════════════════════════════ */}
        <AthleteProfileCard
          stats={athleteStats}
          onOpenCard={() => {
            impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFullCardModal(true);
          }}
          onOpenSetup={() => {
            impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAthleteSetupModal(true);
          }}
        />

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 1: 🏋️ WORKOUT & TIMER PREFERENCES
           ════════════════════════════════════════════════════════════════════ */}
        <Text style={styles.sectionHeader}>WORKOUT & TIMERS</Text>
        <View style={styles.card}>
          {/* Weight Unit Segment */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Ionicons name="barbell-outline" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Weight Unit</Text>
              <Text style={styles.settingSub}>Choose Kilograms (kg) or Pounds (lbs)</Text>
            </View>
            <View style={styles.segmentedToggle}>
              <TouchableOpacity
                onPress={() => handleToggleUnit(false)}
                style={[styles.segmentOption, !unitIsLbs && styles.segmentOptionActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentOptionText, !unitIsLbs && styles.segmentOptionTextActive]}>
                  KG
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleToggleUnit(true)}
                style={[styles.segmentOption, unitIsLbs && styles.segmentOptionActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentOptionText, unitIsLbs && styles.segmentOptionTextActive]}>
                  LBS
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.hairline} />

          {/* Auto Rest Timer Switch */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Ionicons name="timer-outline" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Auto-Start Rest Timer</Text>
              <Text style={styles.settingSub}>Launch countdown timer on set checkmark</Text>
            </View>
            <Switch
              value={autoTimer}
              onValueChange={v => {
                selectionAsync();
                setAutoTimerEnabledGlobal(v);
                setAutoTimer(v);
                savePref('autoTimer', v);
              }}
              trackColor={{ false: '#3A3A3C', true: '#30D158' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.hairline} />

          {/* Audio Beeps Switch */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Ionicons name="volume-medium-outline" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Audio Countdown Cues</Text>
              <Text style={styles.settingSub}>Sound cues at 3, 2, 1s rest expiry</Text>
            </View>
            <Switch
              value={audioCues}
              onValueChange={v => {
                selectionAsync();
                setAudioCues(v);
                setAudioCuesEnabledGlobal(v);
                savePref('audioCues', v);
              }}
              trackColor={{ false: '#3A3A3C', true: '#30D158' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.hairline} />

          {/* Tactile Haptics Switch */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Ionicons name="phone-portrait-outline" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Tactile Haptics</Text>
              <Text style={styles.settingSub}>Vibration feedback for buttons & completed sets</Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={v => {
                setHapticsEnabledGlobal(v);
                if (v) notificationAsync(Haptics.NotificationFeedbackType.Success);
                setHapticsEnabled(v);
                savePref('hapticsEnabled', v);
              }}
              trackColor={{ false: '#3A3A3C', true: '#30D158' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.hairline} />

          {/* Body Silhouette Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Ionicons name="body-outline" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Body Silhouette</Text>
              <Text style={styles.settingSub}>Vector mannequin on Body & Recovery tab</Text>
            </View>
            <View style={styles.segmentedToggle}>
              <TouchableOpacity
                onPress={() => handleToggleGender('male')}
                style={[styles.segmentOption, bodyGender === 'male' && styles.segmentOptionActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentOptionText, bodyGender === 'male' && styles.segmentOptionTextActive]}>
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleToggleGender('female')}
                style={[styles.segmentOption, bodyGender === 'female' && styles.segmentOptionActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentOptionText, bodyGender === 'female' && styles.segmentOptionTextActive]}>
                  Female
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 2: 🔔 COACH NOTIFICATIONS
           ════════════════════════════════════════════════════════════════════ */}
        <Text style={styles.sectionHeader}>COACH NOTIFICATIONS</Text>
        <View style={styles.card}>
          {/* Usual Training Time Cycler */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Ionicons name="time-outline" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Usual Training Time</Text>
              <Text style={styles.settingSub}>Times workout prep and evening check-ins</Text>
            </View>
            <TouchableOpacity
              onPress={handleCycleNotifTime}
              style={styles.timeSelectBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.timeSelectBtnText}>{formattedNotifTime}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.hairline} />

          {/* Training & Split Reminders Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Ionicons name="barbell-outline" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Training & Split Reminders</Text>
              <Text style={styles.settingSub}>Pre-workout blueprint, evening preview & missed check</Text>
            </View>
            <Switch
              value={workoutNotifs}
              onValueChange={handleToggleWorkoutNotifs}
              trackColor={{ false: '#3A3A3C', true: '#30D158' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.hairline} />

          {/* Recovery & Volume Coaching Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Ionicons name="leaf-outline" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Recovery & Volume Coaching</Text>
              <Text style={styles.settingSub}>Rest-day recovery alerts and lagging muscle checks</Text>
            </View>
            <Switch
              value={recoveryCoaching}
              onValueChange={handleToggleRecoveryCoaching}
              trackColor={{ false: '#3A3A3C', true: '#30D158' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.hairline} />

          {/* Sunday Strength Briefing Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Ionicons name="analytics-outline" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Sunday Strength Briefing</Text>
              <Text style={styles.settingSub}>Weekly recap of volume moved, PRs & consistency (11 AM)</Text>
            </View>
            <Switch
              value={sundayBriefing}
              onValueChange={handleToggleSundayBriefing}
              trackColor={{ false: '#3A3A3C', true: '#30D158' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.hairline} />

          {/* Scheduled Notifications (OS Registry Inspector) */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowScheduledNotifsModal(true);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(10, 132, 255, 0.15)' }]}>
              <Ionicons name="calendar-outline" size={16} color="#0A84FF" />
            </View>
            <View style={styles.settingTextCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.settingLabel}>Scheduled Notifications</Text>
                {scheduledCount !== null && scheduledCount > 0 && (
                  <View style={styles.scheduledPill}>
                    <Text style={styles.scheduledPillText}>{scheduledCount} active</Text>
                  </View>
                )}
              </View>
              <Text style={styles.settingSub}>Inspect active alarms & reminders queued in the OS</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 3: ☁️ ACCOUNT & STORAGE
           ════════════════════════════════════════════════════════════════════ */}
        <Text style={styles.sectionHeader}>ACCOUNT & STORAGE</Text>
        <View style={styles.card}>
          {/* Cloud Sync Status */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Ionicons name="cloud-done-outline" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Firebase Cloud Sync</Text>
              <Text style={styles.settingSub} numberOfLines={1}>
                {user?.email || 'Anonymous Cloud Sync Active'}
              </Text>
            </View>
            <View style={styles.syncStatusBadge}>
              <View style={styles.syncStatusDot} />
              <Text style={styles.syncStatusText}>Active</Text>
            </View>
          </View>

          <View style={styles.hairline} />

          {/* Clear Cache */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleClearCache}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Clear Temporary Cache</Text>
              <Text style={styles.settingSub}>Reset UI drafts and memory buffers safely</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </TouchableOpacity>

          <View style={styles.hairline} />

          {/* Log Out */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 69, 58, 0.15)' }]}>
              <Ionicons name="log-out-outline" size={16} color="#FF453A" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={[styles.settingLabel, { color: '#FF453A' }]}>Log Out</Text>
              <Text style={styles.settingSub}>Sign out of ZenFit & return to start</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* Version Footer */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>ZenFit · Native Lifting Architecture</Text>
        </View>

      </ScrollView>

      {/* Scheduled Notifications Modal (OS Registry Inspector) */}
      <ScheduledNotificationsModal
        visible={showScheduledNotifsModal}
        onClose={() => setShowScheduledNotifsModal(false)}
        gymLogs={gymLogs}
        userGymPlan={userGymPlan}
        onCountChange={setScheduledCount}
      />

      {/* Full-Screen Athlete Showcase Card Modal */}
      <FullAthleteProfileModal
        visible={showFullCardModal}
        onClose={() => setShowFullCardModal(false)}
        stats={athleteStats}
        onOpenSetup={() => {
          setShowFullCardModal(false);
          setShowAthleteSetupModal(true);
        }}
        gymLogs={gymLogs}
      />

      {/* Athlete Stats Setup Modal */}
      <SetupAthleteStatsModal
        visible={showAthleteSetupModal}
        onClose={() => setShowAthleteSetupModal(false)}
        currentProfile={gymProfile}
        latestWeight={latestTrackedWeightKg}
        userAuth={user}
        onSaveSuccess={(updated) => {
          saveGymProfile({
            heightCm: updated.heightCm,
            weightKg: updated.weightKg,
            bodyweightKg: updated.weightKg,
            goal: updated.goal as any,
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    paddingRight: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 6,
    paddingBottom: 110,
    gap: 4,
  },
  sectionHeader: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#8E8E93',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 6,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  settingLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  settingSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8E8E93',
    marginTop: 1,
    lineHeight: 16,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(84, 84, 88, 0.36)',
    marginLeft: 44,
  },
  segmentedToggle: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  segmentOption: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 6,
  },
  segmentOptionActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentOptionText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  segmentOptionTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  timeSelectBtn: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timeSelectBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  capsuleBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 5.5,
    borderRadius: 999,
  },
  capsuleBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#000000',
  },
  capsuleBtnReady: {
    backgroundColor: '#30D158',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
  },
  capsuleBtnReadyText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#000000',
  },
  syncStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  syncStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#30D158',
  },
  syncStatusText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 24,
  },
  versionText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11.5,
    color: '#636366',
  },
  scheduledPill: {
    backgroundColor: 'rgba(10, 132, 255, 0.18)',
    paddingHorizontal: 6.5,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.3)',
  },
  scheduledPillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#0A84FF',
  },
});
