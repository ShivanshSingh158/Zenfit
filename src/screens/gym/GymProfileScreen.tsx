/**
 * GymProfileScreen.tsx — ZenFit
 *
 * Settings & Athlete Profile Hub
 * Clean Apple iOS Inset Grouped Settings Table architecture.
 * - Section 1: Athlete & Body (Profile & Goals, Bodyweight & Photos)
 * - Section 2: Workout Configuration (Weight Unit, Auto-Timer, Audio Beeps, Haptics)
 * - Section 3: Cloud & Diagnostics (Firebase Sync Status)
 * - Connected to persistent AsyncStorage & useGymProfile state.
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
import { setHapticsEnabledGlobal, impactAsync, notificationAsync, selectionAsync } from '../../utils/haptics';

import { useTheme } from '../../contexts/ThemeContext';
import { useCoreData } from '../../contexts/domains/CoreDataContext';
import { useGymProfile, setAutoTimerEnabledGlobal } from '../../hooks/useGymProfile';
import { setAudioCuesEnabledGlobal } from '../../services/gymSoundSynthesizer';
import { GymProfileModal } from '../../components/Gym/GymProfileModal';
import BodyMetricsSheet from '../../components/Gym/BodyMetricsSheet';
import { FONT_FAMILY } from '../../theme/tokens';
import { checkAndApplyOTAUpdate, getOTAUpdateInfo } from '../../services/otaUpdateService';
import { useGymLogs, useGymPlan } from '../../contexts/domains/WellnessContext';
import {
  sendTestGymNotification,
  scheduleGymNotifications,
  clearScheduleCache,
  GYM_NOTIF_ENABLED_KEY,
  GYM_NOTIF_TIME_KEY,
  GYM_REST_DAY_NOTIF_KEY,
  requestNotificationPermissions,
} from '../../services/notifications';

const SETTINGS_PREFS_KEY = 'zentrack_gym_settings_prefs_v1';

export default function GymProfileScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { user, performSignOut } = useCoreData();
  const { gymProfile, saveGymProfile } = useGymProfile();

  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [bodyMetricsVisible, setBodyMetricsVisible] = useState(false);

  const handleLogout = () => {
    impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out? You will return to the welcome screen.',
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

  // Persistent Preferences State
  const [unitIsLbs, setUnitIsLbs] = useState(gymProfile?.unitIsLbs ?? false);
  const [autoTimer, setAutoTimer] = useState(gymProfile?.autoTimer ?? true);
  const [hapticsEnabled, setHapticsEnabled] = useState(gymProfile?.hapticsEnabled ?? true);
  const [audioCues, setAudioCues] = useState(gymProfile?.audioCues ?? true);

  // Gym Notification Preferences
  const { gymLogs } = useGymLogs();
  const { userGymPlan } = useGymPlan();
  const [workoutNotifs, setWorkoutNotifs] = useState(true);
  const [notifTime, setNotifTime] = useState('18:00');
  const [restDayNotifs, setRestDayNotifs] = useState(true);
  const [testingNotif, setTestingNotif] = useState(false);

  // OTA Update State
  const [otaStatus, setOtaStatus] = useState<'idle' | 'checking' | 'downloading' | 'ready'>('idle');
  const otaInfo = useMemo(() => getOTAUpdateInfo(), []);

  const handleCheckUpdate = async () => {
    impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await checkAndApplyOTAUpdate((status) => {
      setOtaStatus(status);
    });

    if (!result.updated) {
      Alert.alert('ZenFit Updates', result.message);
    }
  };

  const prefsRef = useRef<Record<string, any>>({});

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

    AsyncStorage.multiGet([GYM_NOTIF_ENABLED_KEY, GYM_NOTIF_TIME_KEY, GYM_REST_DAY_NOTIF_KEY]).then(entries => {
      const enabled = entries[0][1];
      const time = entries[1][1];
      const restDay = entries[2][1];
      if (enabled !== null) setWorkoutNotifs(enabled !== 'false');
      if (time) setNotifTime(time);
      if (restDay !== null) setRestDayNotifs(restDay !== 'false');
    }).catch(() => {});
  }, []);

  const TIME_OPTIONS = useMemo(() => [
    { value: '06:00', label: '6:00 AM' },
    { value: '07:00', label: '7:00 AM' },
    { value: '08:00', label: '8:00 AM' },
    { value: '09:00', label: '9:00 AM' },
    { value: '17:00', label: '5:00 PM' },
    { value: '18:00', label: '6:00 PM' },
    { value: '19:00', label: '7:00 PM' },
    { value: '20:00', label: '8:00 PM' },
  ], []);

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
    scheduleGymNotifications({ gymLogs, userGymPlan }).catch(() => {});
  };

  const handleToggleRestDayNotifs = async (v: boolean) => {
    selectionAsync();
    setRestDayNotifs(v);
    await AsyncStorage.setItem(GYM_REST_DAY_NOTIF_KEY, v ? 'true' : 'false');
    clearScheduleCache();
    scheduleGymNotifications({ gymLogs, userGymPlan }).catch(() => {});
  };

  const handleCycleNotifTime = async () => {
    selectionAsync();
    const currIdx = TIME_OPTIONS.findIndex(t => t.value === notifTime);
    const nextIdx = (currIdx + 1) % TIME_OPTIONS.length;
    const nextVal = TIME_OPTIONS[nextIdx].value;
    setNotifTime(nextVal);
    await AsyncStorage.setItem(GYM_NOTIF_TIME_KEY, nextVal);
    clearScheduleCache();
    scheduleGymNotifications({ gymLogs, userGymPlan }).catch(() => {});
  };

  const handleSendTestNotification = async () => {
    impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTestingNotif(true);
    try {
      const ok = await sendTestGymNotification();
      if (ok) {
        notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Test Notification Fired! 🏋️',
          'A workout reminder is scheduled for 2 seconds from now. Lock your phone or check your notification shade!'
        );
      } else {
        Alert.alert(
          'Notification Blocked',
          'Permission not granted. Please allow notifications in device Settings.'
        );
      }
    } finally {
      setTestingNotif(false);
    }
  };

  const savePref = useCallback((key: string, val: boolean | string) => {
    try {
      // 1. Update in useGymProfile & sync across app
      saveGymProfile({ [key]: val } as any);

      // 2. Persist synchronously in ref + AsyncStorage without read-modify-write race
      prefsRef.current = { ...prefsRef.current, [key]: val };
      AsyncStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(prefsRef.current)).catch(() => {});
    } catch (_) {}
  }, [saveGymProfile]);

  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const elevatedBg = isDark ? '#2C2C2E' : '#E5E5EA';
  const separatorColor = isDark ? 'rgba(84, 84, 88, 0.36)' : 'rgba(60, 60, 67, 0.18)';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000000' : colors.background }]} edges={['top']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* ── Native Apple iOS Header ── */}
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
            >
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <Text style={[styles.largeTitle, { color: colors.textPrimary }]}>Settings</Text>
        </View>
        <Text style={styles.subTitle}>Athlete profile, lifting configuration & preferences</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ── SECTION 1: ATHLETE & BODY ── */}
        <Text style={styles.sectionHeader}>ATHLETE & BODY</Text>
        <View style={[styles.iosGroupedCard, { backgroundColor: cardBg }]}>
          {/* Athlete Profile Row */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              selectionAsync();
              setProfileModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.settingIconText}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(165,153,255,0.15)' }]}>
                <Ionicons name="fitness" size={17} color="#A599FF" />
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Athlete Profile & Goals</Text>
                <Text style={styles.settingSub} numberOfLines={1}>
                  {gymProfile?.goal ? `${gymProfile.goal.toUpperCase()} · ${gymProfile.experience || 'Intermediate'}` : 'Configure GYM-GPT coaching'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={17} color="#8E8E93" />
          </TouchableOpacity>

          <View style={[styles.indentedHairline, { backgroundColor: separatorColor }]} />

          {/* Bodyweight & Photos Row */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              selectionAsync();
              setBodyMetricsVisible(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.settingIconText}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(48,209,88,0.15)' }]}>
                <Ionicons name="scale-outline" size={17} color="#30D158" />
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Bodyweight & Check-In Photos</Text>
                <Text style={styles.settingSub}>
                  {gymProfile?.weightKg ? `${gymProfile.weightKg} kg tracked` : 'Log weight & BMI'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={17} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* ── SECTION 2: WORKOUT PREFERENCES ── */}
        <Text style={styles.sectionHeader}>WORKOUT CONFIGURATION</Text>
        <View style={[styles.iosGroupedCard, { backgroundColor: cardBg }]}>
          {/* Weight Unit Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconText}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(255,159,77,0.15)' }]}>
                <Ionicons name="options-outline" size={17} color="#FF9F0A" />
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Weight Unit</Text>
                <Text style={styles.settingSub}>Kilograms (KG) vs Pounds (LBS)</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                selectionAsync();
                const next = !unitIsLbs;
                setUnitIsLbs(next);
                savePref('unitIsLbs', next);
              }}
              style={[styles.unitToggleBtn, { backgroundColor: elevatedBg }]}
              activeOpacity={0.7}
            >
              <Text style={styles.unitToggleText}>{unitIsLbs ? 'LBS' : 'KG'}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.indentedHairline, { backgroundColor: separatorColor }]} />

          {/* Auto Rest Timer Switch */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconText}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(100,210,255,0.15)' }]}>
                <Ionicons name="timer-outline" size={17} color="#64D2FF" />
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Auto-Start Rest Timer</Text>
                <Text style={styles.settingSub}>Launch timer on set checkmark</Text>
              </View>
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

          <View style={[styles.indentedHairline, { backgroundColor: separatorColor }]} />

          {/* Audio Beeps Switch */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconText}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(191,90,242,0.15)' }]}>
                <Ionicons name="volume-medium-outline" size={17} color="#BF5AF2" />
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Audio Countdown Beeps</Text>
                <Text style={styles.settingSub}>Sound cue at 3, 2, 1s rest expiry</Text>
              </View>
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

          <View style={[styles.indentedHairline, { backgroundColor: separatorColor }]} />

          {/* Haptics Switch */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconText}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(255,69,58,0.15)' }]}>
                <Ionicons name="phone-portrait-outline" size={17} color="#FF453A" />
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Tactile Haptics</Text>
                <Text style={styles.settingSub}>Vibration feedback for buttons & sets</Text>
              </View>
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
        </View>

        {/* ── SECTION: WORKOUT REMINDERS & NOTIFICATIONS ── */}
        <Text style={styles.sectionHeader}>WORKOUT REMINDERS</Text>
        <View style={[styles.iosGroupedCard, { backgroundColor: cardBg }]}>
          {/* Daily Workout Reminder Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconText}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(165,153,255,0.15)' }]}>
                <Ionicons name="notifications-outline" size={17} color="#A599FF" />
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Daily Workout Reminder</Text>
                <Text style={styles.settingSub}>Scheduled alert for today's training split</Text>
              </View>
            </View>
            <Switch
              value={workoutNotifs}
              onValueChange={handleToggleWorkoutNotifs}
              trackColor={{ false: '#3A3A3C', true: '#30D158' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {workoutNotifs && (
            <>
              <View style={[styles.indentedHairline, { backgroundColor: separatorColor }]} />
              {/* Reminder Time Selector */}
              <View style={styles.settingRow}>
                <View style={styles.settingIconText}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(255,159,10,0.15)' }]}>
                    <Ionicons name="time-outline" size={17} color="#FF9F0A" />
                  </View>
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Reminder Time</Text>
                    <Text style={styles.settingSub}>Tap to cycle daily notification time</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleCycleNotifTime}
                  style={[styles.unitToggleBtn, { backgroundColor: elevatedBg }]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.unitToggleText}>
                    {TIME_OPTIONS.find(t => t.value === notifTime)?.label || notifTime}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={[styles.indentedHairline, { backgroundColor: separatorColor }]} />

          {/* Rest Day Recovery Tips Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconText}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(100,210,255,0.15)' }]}>
                <Ionicons name="battery-charging-outline" size={17} color="#64D2FF" />
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Rest Day Reminders</Text>
                <Text style={styles.settingSub}>Recovery, hydration & rebuild alerts</Text>
              </View>
            </View>
            <Switch
              value={restDayNotifs}
              onValueChange={handleToggleRestDayNotifs}
              trackColor={{ false: '#3A3A3C', true: '#30D158' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.indentedHairline, { backgroundColor: separatorColor }]} />

          {/* Test Notification Row */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleSendTestNotification}
            disabled={testingNotif}
            activeOpacity={0.7}
          >
            <View style={styles.settingIconText}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(48,209,88,0.15)' }]}>
                <Ionicons name="paper-plane-outline" size={17} color="#30D158" />
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Send Test Notification</Text>
                <Text style={styles.settingSub}>Rings in 2s to test sound & banner</Text>
              </View>
            </View>
            {testingNotif ? (
              <ActivityIndicator size="small" color="#30D158" />
            ) : (
              <View style={styles.activePillBadge}>
                <Text style={styles.activePillText}>Test</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── SECTION 3: CLOUD & DIAGNOSTICS ── */}
        <Text style={styles.sectionHeader}>CLOUD & DIAGNOSTICS</Text>
        <View style={[styles.iosGroupedCard, { backgroundColor: cardBg }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconText}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(48,209,88,0.15)' }]}>
                <Ionicons name="cloud-done-outline" size={17} color="#30D158" />
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Firebase Sync</Text>
                <Text style={styles.settingSub}>{user?.email || 'Anonymous Cloud Sync Active'}</Text>
              </View>
            </View>
            <View style={styles.activePillBadge}>
              <Text style={styles.activePillText}>Synced</Text>
            </View>
          </View>
        </View>

        {/* ── SECTION 4: SYSTEM & OVER-THE-AIR UPDATES ── */}
        <Text style={styles.sectionHeader}>UPDATES & SYSTEM</Text>
        <View style={[styles.iosGroupedCard, { backgroundColor: cardBg }]}>
          {/* Check for Updates Row */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleCheckUpdate}
            disabled={otaStatus === 'checking' || otaStatus === 'downloading'}
            activeOpacity={0.7}
          >
            <View style={styles.settingIconText}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(56,189,248,0.15)' }]}>
                {otaStatus === 'checking' || otaStatus === 'downloading' ? (
                  <ActivityIndicator size="small" color="#38BDF8" />
                ) : (
                  <Ionicons name="cloud-download-outline" size={17} color="#38BDF8" />
                )}
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                  {otaStatus === 'checking'
                    ? 'Checking for Updates...'
                    : otaStatus === 'downloading'
                    ? 'Downloading Update...'
                    : 'Check for Updates'}
                </Text>
                <Text style={styles.settingSub}>
                  {otaStatus === 'downloading'
                    ? 'Fetching newest bundle via EAS'
                    : otaInfo.channel
                    ? `Channel: ${otaInfo.channel} • OTA Enabled`
                    : 'Over-The-Air Instant Updates'}
                </Text>
              </View>
            </View>
            <View style={[styles.activePillBadge, { backgroundColor: 'rgba(56,189,248,0.12)' }]}>
              <Text style={[styles.activePillText, { color: '#38BDF8' }]}>
                {otaStatus === 'checking' ? 'Checking' : otaStatus === 'downloading' ? 'Fetching' : 'Check'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── SECTION 5: ACCOUNT ── */}
        <Text style={styles.sectionHeader}>ACCOUNT</Text>
        <View style={[styles.iosGroupedCard, { backgroundColor: cardBg }]}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.settingIconText}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 69, 58, 0.15)' }]}>
                <Ionicons name="log-out-outline" size={17} color="#FF453A" />
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={[styles.settingLabel, { color: '#FF453A' }]}>Log Out</Text>
                <Text style={styles.settingSub}>Sign out of ZenFit & return to start</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={17} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* App Version Footer */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>ZenFit Pro • v1.0.0 (Native Build)</Text>
          <Text style={styles.poweredText}>Powered by Obsidian Cosmos & Apple HIG</Text>
        </View>
      </ScrollView>

      {/* Modals */}
      {profileModalVisible && (
        <GymProfileModal
          visible={profileModalVisible}
          onClose={() => setProfileModalVisible(false)}
        />
      )}

      {bodyMetricsVisible && (
        <BodyMetricsSheet
          visible={bodyMetricsVisible}
          onClose={() => setBodyMetricsVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    paddingRight: 4,
  },
  largeTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 32,
    letterSpacing: -0.6,
  },
  subTitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
    marginLeft: 2,
  },
  scrollContent: {
    paddingHorizontal: 6,
    paddingBottom: 110,
  },
  sectionHeader: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8E8E93',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 14,
    marginLeft: 4,
  },
  iosGroupedCard: {
    borderRadius: 16,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  settingIconText: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14.5,
    letterSpacing: -0.2,
  },
  settingSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8E8E93',
    marginTop: 1,
  },
  indentedHairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 42,
  },
  unitToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unitToggleText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#A599FF',
  },
  activePillBadge: {
    backgroundColor: 'rgba(48,209,88,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activePillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#30D158',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
    paddingBottom: 16,
  },
  versionText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#636366',
  },
  poweredText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    color: '#48484A',
    marginTop: 2,
  },
});
