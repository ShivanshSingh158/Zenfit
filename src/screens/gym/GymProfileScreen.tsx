import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '../../contexts/ThemeContext';
import { useCoreData } from '../../contexts/domains/CoreDataContext';
import { useGymProfile } from '../../hooks/useGymProfile';
import { GymProfileModal } from '../../components/Gym/GymProfileModal';
import { hapticLight, hapticSuccess } from '../../utils/haptics';

export default function GymProfileScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useCoreData();
  const { gymProfile } = useGymProfile();

  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [unitIsLbs, setUnitIsLbs] = useState(false);
  const [autoTimer, setAutoTimer] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [audioCues, setAudioCues] = useState(true);

  const cardBg = isDark ? '#0f0e13' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background || '#060509' }]} edges={['top']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary || '#ffffff' }]}>
            Profile & Settings
          </Text>
          <Text style={styles.subTitle}>
            Manage lifting preferences, hardware cues & athlete data
          </Text>
        </View>

        {/* Athlete Overview Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => { hapticLight(); setProfileModalVisible(true); }}
          style={[styles.athleteCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
        >
          <View style={styles.avatarRow}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.accentPrimary || '#a599ff' }]}>
              <Ionicons name="barbell" size={24} color="#000000" />
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={[styles.athleteName, { color: colors.textPrimary || '#ffffff' }]}>
                {gymProfile?.goal ? `${gymProfile.goal.toUpperCase()} ATHLETE` : 'ZENFIT ATHLETE'}
              </Text>
              <Text style={styles.athleteEmail}>
                {user?.email || 'Offline Guest Lifter'}
              </Text>
            </View>
            <View style={styles.editBadge}>
              <Text style={[styles.editBadgeText, { color: colors.accentPrimary || '#a599ff' }]}>
                Edit
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.accentPrimary || '#a599ff'} />
            </View>
          </View>

          {/* Key Stat Chips */}
          <View style={styles.chipsRow}>
            <View style={[styles.statChip, { backgroundColor: isDark ? '#191820' : '#f2f2f7' }]}>
              <Text style={styles.chipLabel}>Experience</Text>
              <Text style={[styles.chipValue, { color: colors.textPrimary || '#ffffff' }]}>
                {gymProfile?.experience || 'Intermediate'}
              </Text>
            </View>

            <View style={[styles.statChip, { backgroundColor: isDark ? '#191820' : '#f2f2f7' }]}>
              <Text style={styles.chipLabel}>Frequency</Text>
              <Text style={[styles.chipValue, { color: colors.textPrimary || '#ffffff' }]}>
                {gymProfile?.daysPerWeek ? `${gymProfile.daysPerWeek} Days/Wk` : '5 Days/Wk'}
              </Text>
            </View>

            <View style={[styles.statChip, { backgroundColor: isDark ? '#191820' : '#f2f2f7' }]}>
              <Text style={styles.chipLabel}>Bodyweight</Text>
              <Text style={[styles.chipValue, { color: colors.textPrimary || '#ffffff' }]}>
                {gymProfile?.weightKg ? `${gymProfile.weightKg} kg` : '75 kg'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Section: Workout Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>WORKOUT CONFIGURATION</Text>

          <View style={[styles.settingsGroup, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            {/* Weight Unit */}
            <View style={styles.settingRow}>
              <View style={styles.settingIconText}>
                <Ionicons name="scale-outline" size={20} color={colors.accentPrimary || '#a599ff'} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary || '#ffffff' }]}>
                    Weight Unit
                  </Text>
                  <Text style={styles.settingSub}>
                    Toggle between Kilograms (KG) and Pounds (LBS)
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => { hapticLight(); setUnitIsLbs(!unitIsLbs); }}
                style={[styles.unitToggle, { backgroundColor: isDark ? '#23222a' : '#e5e5ea' }]}
              >
                <Text style={[styles.unitText, { color: colors.accentPrimary || '#a599ff' }]}>
                  {unitIsLbs ? 'LBS' : 'KG'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.rowDivider} />

            {/* Auto Rest Timer */}
            <View style={styles.settingRow}>
              <View style={styles.settingIconText}>
                <Ionicons name="timer-outline" size={20} color={colors.accentPrimary || '#a599ff'} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary || '#ffffff' }]}>
                    Auto-Start Rest Timer
                  </Text>
                  <Text style={styles.settingSub}>
                    Start countdown immediately upon set checkmark
                  </Text>
                </View>
              </View>
              <Switch
                value={autoTimer}
                onValueChange={v => { hapticLight(); setAutoTimer(v); }}
                thumbColor="#ffffff"
                trackColor={{ false: '#3a3a3c', true: colors.accentPrimary || '#a599ff' }}
              />
            </View>

            <View style={styles.rowDivider} />

            {/* Audio & Beeps */}
            <View style={styles.settingRow}>
              <View style={styles.settingIconText}>
                <Ionicons name="volume-medium-outline" size={20} color={colors.accentPrimary || '#a599ff'} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary || '#ffffff' }]}>
                    Audio Countdown Beeps
                  </Text>
                  <Text style={styles.settingSub}>
                    Sound cue at 3, 2, 1s rest expiry
                  </Text>
                </View>
              </View>
              <Switch
                value={audioCues}
                onValueChange={v => { hapticLight(); setAudioCues(v); }}
                thumbColor="#ffffff"
                trackColor={{ false: '#3a3a3c', true: colors.accentPrimary || '#a599ff' }}
              />
            </View>

            <View style={styles.rowDivider} />

            {/* Haptics */}
            <View style={styles.settingRow}>
              <View style={styles.settingIconText}>
                <Ionicons name="phone-portrait-outline" size={20} color={colors.accentPrimary || '#a599ff'} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary || '#ffffff' }]}>
                    Tactile Haptics
                  </Text>
                  <Text style={styles.settingSub}>
                    Tactile clicks for buttons and completed sets
                  </Text>
                </View>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={v => { hapticLight(); setHapticsEnabled(v); }}
                thumbColor="#ffffff"
                trackColor={{ false: '#3a3a3c', true: colors.accentPrimary || '#a599ff' }}
              />
            </View>
          </View>
        </View>

        {/* Section: Cloud & Diagnostics */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>CLOUD SYNC & BACKUP</Text>

          <View style={[styles.settingsGroup, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingIconText}>
                <Ionicons name="cloud-done-outline" size={20} color="#5eda9e" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary || '#ffffff' }]}>
                    Cloud Connection
                  </Text>
                  <Text style={styles.settingSub}>
                    Syncing workouts with Firebase
                  </Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(94, 218, 158, 0.15)' }]}>
                <Text style={[styles.statusText, { color: '#5eda9e' }]}>Active</Text>
              </View>
            </View>
          </View>
        </View>

        {/* App Version Info */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>ZenFit Pro • v1.0.0 (Expo Go Build)</Text>
          <Text style={styles.poweredText}>Powered by Obsidian Cosmos & GYM-GPT</Text>
        </View>
      </ScrollView>

      {/* Athlete Profile Edit Modal */}
      {profileModalVisible && (
        <GymProfileModal
          visible={profileModalVisible}
          onClose={() => setProfileModalVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 2,
  },
  athleteCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  athleteName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  athleteEmail: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 1,
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
  },
  editBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  statChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  chipLabel: {
    fontSize: 10,
    color: '#8e8e93',
    marginBottom: 2,
  },
  chipValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8e8e93',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingsGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  settingIconText: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingSub: {
    fontSize: 11,
    color: '#8e8e93',
    marginTop: 1,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginLeft: 46,
  },
  unitToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unitText: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
    paddingBottom: 16,
  },
  versionText: {
    fontSize: 12,
    color: '#636366',
    fontWeight: '600',
  },
  poweredText: {
    fontSize: 10,
    color: '#48484a',
    marginTop: 2,
  },
});
