/**
 * GymProfileScreen.tsx — ZenFit
 *
 * Settings & Preferences Hub:
 * Unified Obsidian (#050507 canvas, #0F1015 groups, #0B0C10/#14161D sheets)
 * with live preference wiring across timers, units, keep-awake, theme, anatomy & reminders.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Activity,
  ArrowUpCircle,
  BarChart2,
  BellOff,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cloud,
  Dumbbell,
  Hourglass,
  Leaf,
  LogOut,
  Moon,
  RefreshCw,
  Ruler,
  Smartphone,
  SunMoon,
  Timer,
  User,
  Volume2,
  X,
} from 'lucide-react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { COLLECTION } from '../../config/constants';
import { parseGymLog } from '../../utils/schemaGuards';
import { mergeGymLogMonotonic } from '../../utils/gymUtils';
import { applyPendingQueueOverlay } from '../../services/offlineSync';
import { writeWellnessCache } from '../../utils/domainCache';
import { updateL1Cache, setL1Sync, ONBOARDING_FLOW_KEY } from '../../utils/bootManifest';

import { useTheme, ThemeMode } from '../../contexts/ThemeContext';
import { useCoreData } from '../../contexts/domains/CoreDataContext';
import {
  useGymProfile,
  setAutoTimerEnabledGlobal,
  setKeepAwakeEnabledGlobal,
  setDefaultRestSecsGlobal,
  getDefaultRestSecsSync,
  isKeepAwakeEnabledSync,
  isAudioCuesEnabledSync,
  isAutoTimerEnabledSync,
  isHapticsEnabledSync,
} from '../../hooks/useGymProfile';
import { setAudioCuesEnabledGlobal } from '../../services/gymSoundSynthesizer';
import { setHapticsEnabledGlobal, impactAsync, notificationAsync, selectionAsync } from '../../utils/haptics';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../theme/tokens';
import { ScreenWrapper, TactileButton, NumericText } from '../../components/ui';
import BottomSheet from '../../components/ui/BottomSheet';
import { useGymLogs, useGymPlan, useBodyMetrics } from '../../contexts/domains/WellnessContext';
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
import ExerciseDeepDiveModal from '../../components/Gym/exercise/ExerciseDeepDiveModal';
import { computeAthleteCardStats } from '../../services/athleteCardService';
import { clearDomainHotCache } from '../../utils/hotCacheStore';
import { afterSheetDismiss } from '../../utils/sheetCoordinator';
import { useWeightUnit, formatWeight } from '../../utils/weightUnit';
import {
  OtaManualStatus,
  applyDownloadedOTAUpdate,
  checkAndApplyOTAUpdate,
  getOTAUpdateInfo,
} from '../../services/otaUpdateService';

const REST_PRESETS = [
  { secs: 60, label: '1:00' },
  { secs: 90, label: '1:30' },
  { secs: 120, label: '2:00' },
  { secs: 180, label: '3:00' },
];

const THEME_MODES: Array<{ id: ThemeMode; label: string }> = [
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'Auto' },
  { id: 'light', label: 'Light' },
];

const TIME_OPTIONS = [
  { value: '05:30', label: '5:30 AM', period: 'Early' },
  { value: '06:00', label: '6:00 AM', period: 'Morning' },
  { value: '07:00', label: '7:00 AM', period: 'Morning' },
  { value: '08:00', label: '8:00 AM', period: 'Morning' },
  { value: '09:00', label: '9:00 AM', period: 'Late AM' },
  { value: '16:00', label: '4:00 PM', period: 'Afternoon' },
  { value: '17:00', label: '5:00 PM', period: 'Evening' },
  { value: '18:00', label: '6:00 PM', period: 'Evening' },
  { value: '19:00', label: '7:00 PM', period: 'Night' },
  { value: '20:00', label: '8:00 PM', period: 'Night' },
];

type SettingsActionSheetState =
  | null
  | {
      kind: 'clearCache' | 'signOut' | 'permission' | 'applyUpdate';
      title: string;
      message: string;
      confirmLabel: string;
      destructive?: boolean;
    };

export default function GymProfileScreen() {
  const { tokens, isDark, mode, setTheme } = useTheme();
  const styles = useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, performSignOut, performGoogleSignIn } = useCoreData();
  const { gymProfile, saveGymProfile } = useGymProfile();
  const { gymLogs } = useGymLogs();
  const { userGymPlan } = useGymPlan();
  const { weightLogs } = useBodyMetrics();

  const unitIsLbs = useWeightUnit();
  const [defaultRestSecs, setDefaultRestSecs] = useState<number>(() => getDefaultRestSecsSync());
  const [autoTimer, setAutoTimer] = useState<boolean>(() => isAutoTimerEnabledSync());
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => isHapticsEnabledSync());
  const [audioCues, setAudioCues] = useState<boolean>(() => isAudioCuesEnabledSync());
  const [keepAwake, setKeepAwake] = useState<boolean>(() => isKeepAwakeEnabledSync());
  const [bodyGender, setBodyGender] = useState<'male' | 'female'>(
    gymProfile?.gender === 'female' ? 'female' : 'male'
  );

  // Reminders State (silent OS background scheduling — zero developer inspector UI)
  const [workoutNotifs, setWorkoutNotifs] = useState(true);
  const [notifTime, setNotifTime] = useState('18:00');
  const [recoveryCoaching, setRecoveryCoaching] = useState(true);
  const [sundayBriefing, setSundayBriefing] = useState(true);

  // Obsidian Sheets & Feedback
  const [showTimePickerSheet, setShowTimePickerSheet] = useState(false);
  const [showAthleteSetupModal, setShowAthleteSetupModal] = useState(false);
  const [showFullCardModal, setShowFullCardModal] = useState(false);
  const [deepDiveExercise, setDeepDiveExercise] = useState<string | null>(null);
  const [actionSheet, setActionSheet] = useState<SettingsActionSheetState>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [cloudSyncing, setCloudSyncing] = useState(false);

  // App Updates (Expo EAS OTA + runtime telemetry)
  const otaInfo = useMemo(() => getOTAUpdateInfo(), []);
  const updatesState = Updates.useUpdates();
  const [updateStatus, setUpdateStatus] = useState<OtaManualStatus>('idle');
  const [updateNote, setUpdateNote] = useState<string | null>(null);
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const isUpdateBusy =
    updateStatus === 'checking' ||
    updateStatus === 'downloading' ||
    updatesState.isChecking ||
    updatesState.isDownloading;
  const isUpdatePending =
    updatesState.isUpdatePending || updateStatus === 'ready';
  const downloadPct =
    typeof updatesState.downloadProgress === 'number'
      ? Math.round(updatesState.downloadProgress * 100)
      : 0;

  // Sync latest weight & athlete dossier
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

  // Keep local state mirrored if gymProfile syncs from Firestore or ActiveWorkout
  useEffect(() => {
    if (typeof gymProfile?.autoTimer === 'boolean') setAutoTimer(gymProfile.autoTimer);
    if (typeof gymProfile?.audioCues === 'boolean') setAudioCues(gymProfile.audioCues);
    if (typeof gymProfile?.hapticsEnabled === 'boolean') setHapticsEnabled(gymProfile.hapticsEnabled);
    if (typeof gymProfile?.keepAwake === 'boolean') setKeepAwake(gymProfile.keepAwake);
    if (typeof gymProfile?.defaultRestSecs === 'number') setDefaultRestSecs(gymProfile.defaultRestSecs);
    if (gymProfile?.gender === 'male' || gymProfile?.gender === 'female') {
      setBodyGender(gymProfile.gender);
    }
  }, [gymProfile]);

  // Load notification reminder toggles cleanly
  useEffect(() => {
    AsyncStorage.multiGet([
      GYM_NOTIF_ENABLED_KEY,
      GYM_NOTIF_TIME_KEY,
      GYM_RECOVERY_COACHING_KEY,
      GYM_REST_DAY_NOTIF_KEY,
      GYM_SUNDAY_BRIEFING_KEY,
    ])
      .then((entries) => {
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

  useEffect(() => {
    if (!statusToast) return;
    const t = setTimeout(() => setStatusToast(null), 2800);
    return () => clearTimeout(t);
  }, [statusToast]);

  const savePref = useCallback(
    (key: string, val: boolean | string | number) => {
      try {
        saveGymProfile({ [key]: val } as any);
      } catch (_) {}
    },
    [saveGymProfile]
  );

  const handleToggleUnit = (toLbs: boolean) => {
    selectionAsync();
    savePref('unitIsLbs', toLbs);
  };

  const handleSelectDefaultRest = (secs: number) => {
    selectionAsync();
    setDefaultRestSecs(secs);
    setDefaultRestSecsGlobal(secs);
    savePref('defaultRestSecs', secs);
  };

  const handleToggleGender = (gender: 'male' | 'female') => {
    selectionAsync();
    setBodyGender(gender);
    savePref('gender', gender);
  };

  const handleSelectTheme = (nextMode: ThemeMode) => {
    selectionAsync();
    setTheme(nextMode);
  };

  const handleToggleWorkoutNotifs = async (v: boolean) => {
    selectionAsync();
    if (v) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        setActionSheet({
          kind: 'permission',
          title: 'Notifications Disabled',
          message: 'Allow notifications in your phone system settings so ZenFit can send workout and split reminders.',
          confirmLabel: 'OK',
        });
        setWorkoutNotifs(false);
        await AsyncStorage.setItem(GYM_NOTIF_ENABLED_KEY, 'false');
        return;
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

  const handleSelectNotifTime = async (nextVal: string) => {
    selectionAsync();
    setNotifTime(nextVal);
    setShowTimePickerSheet(false);
    await AsyncStorage.setItem(GYM_NOTIF_TIME_KEY, nextVal);
    clearScheduleCache();
    scheduleGymNotifications({ gymLogs, userGymPlan, force: true }).catch(() => {});
  };

  const handleConfirmActionSheet = async () => {
    const current = actionSheet;
    setActionSheet(null);
    if (!current) return;

    if (current.kind === 'clearCache') {
      notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearDomainHotCache();
      clearScheduleCache();
      scheduleGymNotifications({ gymLogs, userGymPlan, force: true }).catch(() => {});
      setStatusToast('Temporary caches reset cleanly.');
      return;
    }

    if (current.kind === 'applyUpdate') {
      const res = await applyDownloadedOTAUpdate();
      if (!res.success) {
        setStatusToast(res.message);
      }
      return;
    }

    if (current.kind === 'signOut') {
      notificationAsync(Haptics.NotificationFeedbackType.Success);
      try {
        if (navigation?.canGoBack?.()) {
          navigation.popToTop();
        }
      } catch (_) {}
      await performSignOut();
    }
  };

  const formattedNotifTime = useMemo(() => {
    return TIME_OPTIONS.find((t) => t.value === notifTime)?.label || notifTime;
  }, [notifTime]);

  const cloudSyncInfo = useMemo(() => {
    if (user && !user.isAnonymous && user.email) {
      return {
        subtitle: `Synced to ${user.email} · Tap to refresh`,
        badge: cloudSyncing ? 'Syncing' : 'Synced',
        dotColor: tokens.status.success,
      };
    }
    return {
      subtitle: 'Tap to connect Gmail & restore cloud data',
      badge: cloudSyncing ? 'Connecting' : 'Connect',
      dotColor: tokens.status.warning,
    };
  }, [user, cloudSyncing, tokens]);

  const handleCloudBackupPress = useCallback(async () => {
    if (cloudSyncing) return;
    impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCloudSyncing(true);
    try {
      let activeUid = user && !user.isAnonymous ? user.uid : null;
      let activeEmail = user?.email || null;

      if (!activeUid) {
        const res = await performGoogleSignIn();
        if (res.cancelled) {
          return;
        }
        if (!res.success || !res.user?.uid) {
          setStatusToast(res.error || 'Google Sign-In could not be completed.');
          return;
        }
        activeUid = res.user.uid;
        activeEmail = res.user.email || null;
        await AsyncStorage.setItem('zenfit_onboarding_flow_done_v3', 'true').catch(() => {});
        setL1Sync(ONBOARDING_FLOW_KEY, true);
      }

      DeviceEventEmitter.emit('firestore_force_reconnect');

      if (!activeUid) return;
      const snap = await getDocs(
        query(collection(db, COLLECTION.GYM_LOGS), where('userId', '==', activeUid))
      );

      const byId = new Map<string, any>();
      for (const existing of gymLogs || []) {
        if (existing) {
          const key = existing.id || `${activeUid}_${existing.date}`;
          byId.set(key, existing);
        }
      }

      let cloudCount = 0;
      snap.forEach((docSnap) => {
        const parsed = parseGymLog(docSnap.data(), docSnap.id);
        if (parsed.deleted) return;
        cloudCount++;
        const key = parsed.id || `${activeUid}_${parsed.date}`;
        const existing = byId.get(key);
        byId.set(key, existing ? mergeGymLogMonotonic(existing, parsed) : parsed);
      });

      const merged = applyPendingQueueOverlay(COLLECTION.GYM_LOGS, Array.from(byId.values()));
      merged.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
      updateL1Cache('gymLogs', merged);
      writeWellnessCache({ gymLogs: merged }, false);
      DeviceEventEmitter.emit('gym_logs_changed', { gymLogs: merged });

      notificationAsync(Haptics.NotificationFeedbackType.Success);
      const label = activeEmail ? ` (${activeEmail})` : '';
      setStatusToast(
        `Synced ${cloudCount} ${cloudCount === 1 ? 'workout' : 'workouts'}${label}.`
      );
    } catch (err: any) {
      setStatusToast(err?.message || 'Unable to reach Cloud Firestore.');
    } finally {
      setCloudSyncing(false);
    }
  }, [cloudSyncing, user, gymLogs, performGoogleSignIn]);

  const handleCheckForUpdatesPress = useCallback(async () => {
    if (isUpdateBusy) return;
    impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isUpdatePending) {
      setActionSheet({
        kind: 'applyUpdate',
        title: 'Restart & Apply Update',
        message: 'A new ZenFit update has been downloaded cleanly to this device. Restart now to switch to the latest version?',
        confirmLabel: 'Restart Now',
      });
      return;
    }

    const res = await checkAndApplyOTAUpdate((next) => setUpdateStatus(next));
    setUpdateNote(res.message);
    setStatusToast(res.message);

    if (res.pendingRestart) {
      setActionSheet({
        kind: 'applyUpdate',
        title: 'Update Ready to Install',
        message: 'The latest ZenFit bundle is downloaded. Restart now to apply it immediately?',
        confirmLabel: 'Restart Now',
      });
    }
  }, [isUpdateBusy, isUpdatePending]);

  const updateRowSubtitle = useMemo(() => {
    if (updatesState.isDownloading || updateStatus === 'downloading') {
      return downloadPct > 0
        ? `Downloading update (${downloadPct}%)...`
        : 'Downloading latest update...';
    }
    if (updatesState.isChecking || updateStatus === 'checking') {
      return 'Checking update server...';
    }
    if (isUpdatePending) {
      return 'Downloaded & ready · Tap to restart ZenFit';
    }
    if (updateNote) {
      return updateNote;
    }
    const channelTag = otaInfo.channel || (__DEV__ ? 'dev' : otaInfo.isEmbeddedLaunch ? 'built-in' : 'ota');
    const shortId = otaInfo.updateId ? ` · #${otaInfo.updateId.slice(0, 7)}` : '';
    return `Version ${appVersion} (${channelTag})${shortId}`;
  }, [updatesState.isDownloading, updatesState.isChecking, updateStatus, downloadPct, isUpdatePending, updateNote, otaInfo, appVersion]);

  const statsSummarySub = useMemo(() => {
    if (!athleteStats.hasPhysicalStats) {
      return 'Add height, weight & primary training focus';
    }
    return `${formatWeight(athleteStats.weightKg, unitIsLbs, 1)} · ${Math.round(athleteStats.heightCm)} cm · ${athleteStats.goalLabel}`;
  }, [athleteStats, unitIsLbs]);

  const switchTrackOff = isDark ? 'rgba(255, 255, 255, 0.16)' : tokens.border.medium;
  const switchThumb = Platform.OS === 'ios' ? undefined : '#FFFFFF';

  return (
    <ScreenWrapper edges={['top']} compactTop topAura keyboardAvoiding={false}>
      {/* Unified Screen Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          {navigation.canGoBack() && (
            <TactileButton
              variant="custom"
              onPress={() => {
                impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.goBack();
              }}
              style={styles.backBtn}
              hitSlop={TOUCH.hitSlop}
              accessibilityLabel="Back"
            >
              <ChevronLeft size={20} color={tokens.text.primary} strokeWidth={2.2} />
            </TactileButton>
          )}
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>
              Training, timers, theme & reminders
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 90, 110) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {statusToast && (
          <View style={styles.toastBanner}>
            <CheckCircle2 size={15} color={tokens.status.success} strokeWidth={ICON.strokeWidth} />
            <Text style={styles.toastText}>{statusToast}</Text>
          </View>
        )}

        {/* HERO PERFORMANCE CARD ENTRY */}
        <AthleteProfileCard
          stats={athleteStats}
          uid={user?.uid}
          onOpenCard={() => {
            impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFullCardModal(true);
          }}
          onOpenSetup={() => {
            impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAthleteSetupModal(true);
          }}
        />

        {/* SECTION 1: TRAINING & TIMERS */}
        <Text style={styles.sectionHeader}>TRAINING & TIMERS</Text>
        <View style={styles.card}>
          {/* Weight Unit */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Dumbbell size={ICON.sm} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Weight Unit</Text>
              <Text style={styles.settingSub}>Display loads in kilograms or pounds</Text>
            </View>
            <View style={styles.segmentedToggle}>
              <TactileButton
                variant="custom"
                onPress={() => handleToggleUnit(false)}
                style={[styles.segmentOption, !unitIsLbs && styles.segmentOptionActive]}
                hitSlop={TOUCH.hitSlop}
              >
                <Text style={[styles.segmentOptionText, !unitIsLbs && styles.segmentOptionTextActive]}>
                  KG
                </Text>
              </TactileButton>
              <TactileButton
                variant="custom"
                onPress={() => handleToggleUnit(true)}
                style={[styles.segmentOption, unitIsLbs && styles.segmentOptionActive]}
                hitSlop={TOUCH.hitSlop}
              >
                <Text style={[styles.segmentOptionText, unitIsLbs && styles.segmentOptionTextActive]}>
                  LBS
                </Text>
              </TactileButton>
            </View>
          </View>

          <View style={styles.hairline} />

          {/* Default Rest Duration */}
          <View style={styles.settingRowColumn}>
            <View style={styles.settingRowTop}>
              <View style={styles.iconBox}>
                <Hourglass size={ICON.sm} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
              </View>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingLabel}>Default Rest Timer</Text>
                <Text style={styles.settingSub}>Applied automatically when adding or timing sets</Text>
              </View>
            </View>
            <View style={styles.fullWidthSegmented}>
              {REST_PRESETS.map((preset) => {
                const active = defaultRestSecs === preset.secs;
                return (
                  <TactileButton
                    key={preset.secs}
                    variant="custom"
                    onPress={() => handleSelectDefaultRest(preset.secs)}
                    style={[styles.fullSegItem, active && styles.segmentOptionActive]}
                  >
                    <NumericText style={[styles.segmentOptionText, active && styles.segmentOptionTextActive]}>
                      {preset.label}
                    </NumericText>
                  </TactileButton>
                );
              })}
            </View>
          </View>

          <View style={styles.hairline} />

          {/* Auto-Start Rest Timer */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Timer size={ICON.sm} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Auto-Start Rest Timer</Text>
              <Text style={styles.settingSub}>Start rest countdown on set completion</Text>
            </View>
            <Switch
              value={autoTimer}
              onValueChange={(v) => {
                selectionAsync();
                setAutoTimerEnabledGlobal(v);
                setAutoTimer(v);
                savePref('autoTimer', v);
              }}
              trackColor={{ false: switchTrackOff, true: tokens.status.success }}
              thumbColor={switchThumb}
            />
          </View>

          <View style={styles.hairline} />

          {/* Audio Countdown Cues */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Volume2 size={ICON.sm} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Audio Countdown Cues</Text>
              <Text style={styles.settingSub}>Play tone alerts at 3, 2, 1s before rest ends</Text>
            </View>
            <Switch
              value={audioCues}
              onValueChange={(v) => {
                selectionAsync();
                setAudioCues(v);
                setAudioCuesEnabledGlobal(v);
                savePref('audioCues', v);
              }}
              trackColor={{ false: switchTrackOff, true: tokens.status.success }}
              thumbColor={switchThumb}
            />
          </View>

          <View style={styles.hairline} />

          {/* Tactile Haptics */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Activity size={ICON.sm} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Tactile Haptics</Text>
              <Text style={styles.settingSub}>Vibration feedback on buttons & completed sets</Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={(v) => {
                setHapticsEnabledGlobal(v);
                if (v) notificationAsync(Haptics.NotificationFeedbackType.Success);
                setHapticsEnabled(v);
                savePref('hapticsEnabled', v);
              }}
              trackColor={{ false: switchTrackOff, true: tokens.status.success }}
              thumbColor={switchThumb}
            />
          </View>

          <View style={styles.hairline} />

          {/* Keep Screen Awake */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Smartphone size={ICON.sm} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Keep Screen Awake</Text>
              <Text style={styles.settingSub}>Prevent display sleep during active workouts</Text>
            </View>
            <Switch
              value={keepAwake}
              onValueChange={(v) => {
                selectionAsync();
                setKeepAwake(v);
                setKeepAwakeEnabledGlobal(v);
                savePref('keepAwake', v);
              }}
              trackColor={{ false: switchTrackOff, true: tokens.status.success }}
              thumbColor={switchThumb}
            />
          </View>
        </View>

        {/* SECTION 2: APPEARANCE & ANATOMY */}
        <Text style={styles.sectionHeader}>APPEARANCE & ANATOMY</Text>
        <View style={styles.card}>
          {/* Theme Mode */}
          <View style={styles.settingRowColumn}>
            <View style={styles.settingRowTop}>
              <View style={styles.iconBox}>
                {mode === 'dark' ? (
                  <Moon size={ICON.sm} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                ) : (
                  <SunMoon size={ICON.sm} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                )}
              </View>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingLabel}>Appearance</Text>
                <Text style={styles.settingSub}>Match Obsidian dark mode or system display</Text>
              </View>
            </View>
            <View style={styles.fullWidthSegmented}>
              {THEME_MODES.map((m) => {
                const active = mode === m.id;
                return (
                  <TactileButton
                    key={m.id}
                    variant="custom"
                    onPress={() => handleSelectTheme(m.id)}
                    style={[styles.fullSegItem, active && styles.segmentOptionActive]}
                  >
                    <Text style={[styles.segmentOptionText, active && styles.segmentOptionTextActive]}>
                      {m.label}
                    </Text>
                  </TactileButton>
                );
              })}
            </View>
          </View>

          <View style={styles.hairline} />

          {/* Body Silhouette */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <User size={ICON.sm} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Body Silhouette</Text>
              <Text style={styles.settingSub}>Muscle map figure on Home, Today & Body</Text>
            </View>
            <View style={styles.segmentedToggle}>
              <TactileButton
                variant="custom"
                onPress={() => handleToggleGender('male')}
                style={[styles.segmentOption, bodyGender === 'male' && styles.segmentOptionActive]}
                hitSlop={TOUCH.hitSlop}
              >
                <Text style={[styles.segmentOptionText, bodyGender === 'male' && styles.segmentOptionTextActive]}>
                  Male
                </Text>
              </TactileButton>
              <TactileButton
                variant="custom"
                onPress={() => handleToggleGender('female')}
                style={[styles.segmentOption, bodyGender === 'female' && styles.segmentOptionActive]}
                hitSlop={TOUCH.hitSlop}
              >
                <Text style={[styles.segmentOptionText, bodyGender === 'female' && styles.segmentOptionTextActive]}>
                  Female
                </Text>
              </TactileButton>
            </View>
          </View>
        </View>

        {/* SECTION 3: REMINDERS */}
        <Text style={styles.sectionHeader}>REMINDERS</Text>
        <View style={styles.card}>
          {/* Usual Training Time Picker Sheet Trigger */}
          <TactileButton
            variant="custom"
            scaleTo={0.99}
            style={styles.settingRow}
            onPress={() => {
              impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowTimePickerSheet(true);
            }}
          >
            <View style={styles.iconBox}>
              <Clock size={ICON.sm} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Usual Training Time</Text>
              <Text style={styles.settingSub}>Schedules daily workout prep reminders</Text>
            </View>
            <View style={styles.timePillRow}>
              <View style={styles.timeSelectBtn}>
                <NumericText style={styles.timeSelectBtnText}>{formattedNotifTime}</NumericText>
              </View>
              <ChevronRight size={15} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
            </View>
          </TactileButton>

          <View style={styles.hairline} />

          {/* Workout Reminders */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Dumbbell size={ICON.sm} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Workout Reminders</Text>
              <Text style={styles.settingSub}>Session alerts & missed training check-ins</Text>
            </View>
            <Switch
              value={workoutNotifs}
              onValueChange={handleToggleWorkoutNotifs}
              trackColor={{ false: switchTrackOff, true: tokens.status.success }}
              thumbColor={switchThumb}
            />
          </View>

          <View style={styles.hairline} />

          {/* Recovery Alerts */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Leaf size={ICON.sm} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Recovery Alerts</Text>
              <Text style={styles.settingSub}>Rest-day reminders & lagging muscle balance</Text>
            </View>
            <Switch
              value={recoveryCoaching}
              onValueChange={handleToggleRecoveryCoaching}
              trackColor={{ false: switchTrackOff, true: tokens.status.success }}
              thumbColor={switchThumb}
            />
          </View>

          <View style={styles.hairline} />

          {/* Weekly Recap */}
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <BarChart2 size={ICON.sm} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Weekly Recap</Text>
              <Text style={styles.settingSub}>Sunday summary of workouts, PRs & volume</Text>
            </View>
            <Switch
              value={sundayBriefing}
              onValueChange={handleToggleSundayBriefing}
              trackColor={{ false: switchTrackOff, true: tokens.status.success }}
              thumbColor={switchThumb}
            />
          </View>
        </View>

        {/* SECTION 4: ACCOUNT & DATA */}
        <Text style={styles.sectionHeader}>ACCOUNT & DATA</Text>
        <View style={styles.card}>
          {/* Edit Stats & Focus */}
          <TactileButton
            variant="custom"
            scaleTo={0.99}
            style={styles.settingRow}
            onPress={() => {
              impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAthleteSetupModal(true);
            }}
          >
            <View style={styles.iconBox}>
              <Ruler size={ICON.sm} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Physical Stats & Focus</Text>
              <NumericText style={styles.settingSub} numberOfLines={1}>
                {statsSummarySub}
              </NumericText>
            </View>
            <ChevronRight size={15} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
          </TactileButton>

          <View style={styles.hairline} />

          {/* Cloud Sync / Google Connect */}
          <TactileButton
            variant="custom"
            scaleTo={0.99}
            style={styles.settingRow}
            onPress={handleCloudBackupPress}
            disabled={cloudSyncing}
          >
            <View style={styles.iconBox}>
              <Cloud size={ICON.sm} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Cloud Backup</Text>
              <Text style={styles.settingSub} numberOfLines={1}>
                {cloudSyncInfo.subtitle}
              </Text>
            </View>
            <View style={styles.syncStatusBadge}>
              {cloudSyncing ? (
                <ActivityIndicator size="small" color={tokens.accent.primary} />
              ) : (
                <View style={[styles.syncStatusDot, { backgroundColor: cloudSyncInfo.dotColor }]} />
              )}
              <Text style={styles.syncStatusText}>{cloudSyncInfo.badge}</Text>
            </View>
          </TactileButton>

          <View style={styles.hairline} />

          {/* Check for App Updates */}
          <TactileButton
            variant="custom"
            scaleTo={0.99}
            style={styles.settingRow}
            onPress={handleCheckForUpdatesPress}
            disabled={isUpdateBusy}
          >
            <View
              style={[
                styles.iconBox,
                isUpdatePending && { backgroundColor: tokens.accent.primaryDim },
              ]}
            >
              <ArrowUpCircle
                size={ICON.sm}
                color={isUpdatePending ? tokens.accent.primary : tokens.text.primary}
                strokeWidth={ICON.strokeWidth}
              />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Check for Updates</Text>
              <Text style={styles.settingSub} numberOfLines={2}>
                {updateRowSubtitle}
              </Text>
            </View>
            <View style={styles.syncStatusBadge}>
              {isUpdateBusy ? (
                <ActivityIndicator size="small" color={tokens.accent.primary} />
              ) : isUpdatePending ? (
                <View style={[styles.syncStatusDot, { backgroundColor: tokens.status.success }]} />
              ) : null}
              <Text
                style={[
                  styles.syncStatusText,
                  isUpdatePending && { color: tokens.accent.primary },
                ]}
              >
                {isUpdateBusy
                  ? updatesState.isDownloading || updateStatus === 'downloading'
                    ? downloadPct > 0
                      ? `${downloadPct}%`
                      : 'Downloading'
                    : 'Checking'
                  : isUpdatePending
                  ? 'Restart'
                  : 'Check'}
              </Text>
            </View>
          </TactileButton>

          <View style={styles.hairline} />

          {/* Clear Temporary Cache */}
          <TactileButton
            variant="custom"
            scaleTo={0.99}
            style={styles.settingRow}
            onPress={() => {
              impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setActionSheet({
                kind: 'clearCache',
                title: 'Reset Temporary Cache',
                message: 'Clears memory computation caches and reschedules background alerts. Your workouts, PRs, plans, and body logs stay untouched.',
                confirmLabel: 'Reset Cache',
                destructive: false,
              });
            }}
          >
            <View style={styles.iconBox}>
              <RefreshCw size={ICON.sm} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Reset Temporary Cache</Text>
              <Text style={styles.settingSub}>Clear memory buffers without losing workout logs</Text>
            </View>
            <ChevronRight size={15} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
          </TactileButton>

          <View style={styles.hairline} />

          {/* Sign Out */}
          <TactileButton
            variant="custom"
            scaleTo={0.99}
            style={styles.settingRow}
            onPress={() => {
              impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setActionSheet({
                kind: 'signOut',
                title: 'Sign Out of ZenFit',
                message: 'You will return to the welcome screen. Your cloud-synced data remains safely backed up.',
                confirmLabel: 'Sign Out',
                destructive: true,
              });
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: tokens.status.dangerDim }]}>
              <LogOut size={ICON.sm} color={tokens.status.danger} strokeWidth={ICON.strokeWidth} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={[styles.settingLabel, { color: tokens.status.danger }]}>Sign Out</Text>
              <Text style={styles.settingSub}>Sign out and return to the start screen</Text>
            </View>
            <ChevronRight size={15} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
          </TactileButton>
        </View>

        <View style={styles.footer}>
          <NumericText style={styles.versionText}>
            ZenFit v{appVersion}
            {otaInfo.channel ? ` · ${otaInfo.channel}` : __DEV__ ? ' · dev' : ''}
            {otaInfo.updateId ? ` · #${otaInfo.updateId.slice(0, 7)}` : ''}
          </NumericText>
        </View>
      </ScrollView>

      {/* Usual Training Time Picker BottomSheet */}
      <BottomSheet
        visible={showTimePickerSheet}
        onClose={() => setShowTimePickerSheet(false)}
        avoidKeyboard={false}
      >
        <View style={{ paddingBottom: Math.max(insets.bottom, SPACE.sm) }}>
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, paddingRight: SPACE.md }}>
              <Text style={styles.sheetTitle}>Usual Training Time</Text>
              <Text style={styles.sheetSub}>Pick when you usually hit the gym.</Text>
            </View>
            <TactileButton
              variant="custom"
              haptic="light"
              onPress={() => setShowTimePickerSheet(false)}
              style={styles.sheetCloseBtn}
            >
              <X size={16} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
            </TactileButton>
          </View>

          <View style={styles.timeGrid}>
            {TIME_OPTIONS.map((opt) => {
              const selected = opt.value === notifTime;
              return (
                <TactileButton
                  key={opt.value}
                  variant="custom"
                  onPress={() => handleSelectNotifTime(opt.value)}
                  style={[styles.timeGridCell, selected && styles.timeGridCellActive]}
                >
                  <View style={styles.timeGridTop}>
                    <NumericText style={[styles.timeGridLabel, selected && { color: tokens.accent.primary }]}>
                      {opt.label}
                    </NumericText>
                    {selected && <Check size={14} color={tokens.accent.primary} strokeWidth={2.5} />}
                  </View>
                  <Text style={styles.timeGridPeriod}>{opt.period}</Text>
                </TactileButton>
              );
            })}
          </View>
        </View>
      </BottomSheet>

      {/* Unified Confirmation & Notice Sheet (Replaces Native Alert) */}
      <BottomSheet
        visible={actionSheet !== null}
        onClose={() => setActionSheet(null)}
        avoidKeyboard={false}
      >
        {actionSheet ? (
          <View style={{ paddingBottom: Math.max(insets.bottom, SPACE.sm), gap: SPACE.md }}>
            <View style={styles.confirmCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {actionSheet.kind === 'permission' && (
                  <BellOff size={18} color={tokens.status.warning} strokeWidth={ICON.strokeWidth} />
                )}
                <Text style={styles.confirmTitle}>{actionSheet.title}</Text>
              </View>
              <Text style={styles.confirmMessage}>{actionSheet.message}</Text>
            </View>

            <View style={styles.confirmActionsRow}>
              {actionSheet.kind !== 'permission' && (
                <TactileButton
                  variant="custom"
                  onPress={() => setActionSheet(null)}
                  style={styles.confirmCancelBtn}
                >
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </TactileButton>
              )}
              <TactileButton
                variant="custom"
                onPress={handleConfirmActionSheet}
                style={[
                  styles.confirmPrimaryBtn,
                  actionSheet.destructive && { backgroundColor: tokens.status.danger },
                ]}
              >
                <Text style={styles.confirmPrimaryText}>{actionSheet.confirmLabel}</Text>
              </TactileButton>
            </View>
          </View>
        ) : null}
      </BottomSheet>

      {/* Performance Card Dossier Modal */}
      <FullAthleteProfileModal
        visible={showFullCardModal}
        onClose={() => setShowFullCardModal(false)}
        stats={athleteStats}
        onOpenSetup={() => {
          setShowFullCardModal(false);
          afterSheetDismiss(() => setShowAthleteSetupModal(true));
        }}
        onOpenExerciseDeepDive={(exName) => {
          setShowFullCardModal(false);
          afterSheetDismiss(() => setDeepDiveExercise(exName));
        }}
        gymLogs={gymLogs}
      />

      {/* Unified Physical Stats & Focus Setup Sheet */}
      <SetupAthleteStatsModal
        visible={showAthleteSetupModal}
        onClose={() => setShowAthleteSetupModal(false)}
        currentProfile={gymProfile}
        latestWeight={latestTrackedWeightKg}
        userAuth={user}
        onSaveSuccess={(updated) => {
          saveGymProfile({
            ...(updated.displayName ? { displayName: updated.displayName } : {}),
            heightCm: updated.heightCm,
            weightKg: updated.weightKg,
            bodyweightKg: updated.weightKg,
            goal: updated.goal as any,
          });
          setStatusToast('Athlete stats updated.');
        }}
      />

      {/* Exercise Deep Dive (Handed off cleanly from Performance Card) */}
      <ExerciseDeepDiveModal
        visible={!!deepDiveExercise}
        exerciseName={deepDiveExercise}
        gymLogs={gymLogs}
        initialTab="analytics"
        onClose={() => setDeepDiveExercise(null)}
      />
    </ScreenWrapper>
  );
}

const makeStyles = (tokens: ThemeTokens, isDark: boolean) => {
  const layer2Bg = isDark ? '#0F1015' : tokens.bg.surface;
  const sheetCardBg = isDark ? '#14161D' : '#FFFFFF';
  const hairline = isDark ? 'rgba(255, 255, 255, 0.09)' : tokens.border.subtle;
  const innerHairline = isDark ? 'rgba(255, 255, 255, 0.07)' : tokens.border.subtle;

  return StyleSheet.create({
    header: {
      paddingHorizontal: SPACE.lg,
      paddingTop: SPACE.xs,
      paddingBottom: SPACE.sm + 2,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.sm + 2,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.full,
      backgroundColor: layer2Bg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitleCol: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 26,
      fontFamily: FONT_FAMILY.bold,
      letterSpacing: -0.5,
      color: tokens.text.primary,
    },
    headerSubtitle: {
      fontSize: 12.5,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.secondary,
      marginTop: 1,
    },
    scrollContent: {
      paddingHorizontal: SPACE.lg,
      paddingTop: SPACE.xs,
    },

    toastBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: tokens.status.successDim,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: SPACE.md,
    },
    toastText: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 12.5,
      color: tokens.status.success,
    },

    sectionHeader: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 11,
      color: tokens.text.secondary,
      letterSpacing: 0.7,
      marginTop: SPACE.lg,
      marginBottom: SPACE.sm,
      marginLeft: 2,
    },
    card: {
      backgroundColor: layer2Bg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      borderRadius: 18,
      overflow: 'hidden',
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: TOUCH.minTarget + 10,
      paddingVertical: 11,
      paddingHorizontal: 14,
      gap: 12,
    },
    settingRowColumn: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 10,
    },
    settingRowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconBox: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : tokens.bg.elevated,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    settingTextCol: {
      flex: 1,
      minWidth: 0,
      paddingRight: 4,
    },
    settingLabel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14.5,
      color: tokens.text.primary,
      letterSpacing: -0.2,
    },
    settingSub: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 12,
      color: tokens.text.secondary,
      marginTop: 1.5,
      lineHeight: 16,
    },
    hairline: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: innerHairline,
      marginLeft: 60,
    },

    segmentedToggle: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#181B24' : tokens.bg.elevated,
      borderRadius: 10,
      padding: 3,
      gap: 2,
      flexShrink: 0,
    },
    segmentOption: {
      minHeight: 32,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullWidthSegmented: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      backgroundColor: isDark ? '#181B24' : tokens.bg.elevated,
      borderRadius: 11,
      padding: 3,
      gap: 3,
      marginTop: SPACE.xs,
    },
    fullSegItem: {
      flex: 1,
      minHeight: 33,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentOptionActive: {
      backgroundColor: tokens.accent.primary,
    },
    segmentOptionText: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.secondary,
    },
    segmentOptionTextActive: {
      fontFamily: FONT_FAMILY.bold,
      color: tokens.accent.onPrimary,
    },

    timePillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0,
    },
    timeSelectBtn: {
      minHeight: 32,
      backgroundColor: isDark ? '#181B24' : tokens.bg.elevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      paddingHorizontal: 11,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeSelectBtnText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 12,
      color: tokens.text.primary,
    },

    syncStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? '#181B24' : tokens.bg.elevated,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      flexShrink: 0,
    },
    syncStatusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    syncStatusText: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 11,
      color: tokens.text.primary,
    },

    footer: {
      alignItems: 'center',
      marginTop: SPACE.xl,
      paddingBottom: SPACE.md,
    },
    versionText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 11.5,
      color: tokens.text.muted,
    },

    // Time Picker & Confirmation Sheets
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: SPACE.md,
    },
    sheetTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 18,
      color: tokens.text.primary,
      letterSpacing: -0.3,
    },
    sheetSub: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 12.5,
      color: tokens.text.secondary,
      marginTop: 2,
    },
    sheetCloseBtn: {
      width: 34,
      height: 34,
      borderRadius: RADIUS.full,
      backgroundColor: sheetCardBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    timeGridCell: {
      flexBasis: '47%',
      flexGrow: 1,
      minHeight: 44,
      backgroundColor: sheetCardBg,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      gap: 2,
    },
    timeGridCellActive: {
      borderColor: tokens.accent.primary,
      backgroundColor: isDark ? 'rgba(10, 132, 255, 0.12)' : tokens.accent.primaryDim,
    },
    timeGridTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    timeGridLabel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
      color: tokens.text.primary,
    },
    timeGridPeriod: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 11.5,
      color: tokens.text.secondary,
    },

    confirmCard: {
      backgroundColor: sheetCardBg,
      borderRadius: 16,
      padding: SPACE.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      gap: 6,
    },
    confirmTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 17,
      color: tokens.text.primary,
    },
    confirmMessage: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 13.5,
      color: tokens.text.secondary,
      lineHeight: 19,
    },
    confirmActionsRow: {
      flexDirection: 'row',
      gap: SPACE.sm + 2,
    },
    confirmCancelBtn: {
      flex: 1,
      minHeight: TOUCH.minTarget,
      borderRadius: 12,
      backgroundColor: sheetCardBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmCancelText: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 14,
      color: tokens.text.primary,
    },
    confirmPrimaryBtn: {
      flex: 1.4,
      minHeight: TOUCH.minTarget,
      borderRadius: 12,
      backgroundColor: tokens.accent.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmPrimaryText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
      color: tokens.accent.onPrimary,
    },
  });
};
