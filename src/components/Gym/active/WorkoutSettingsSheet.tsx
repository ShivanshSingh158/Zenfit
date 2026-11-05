/**
 * WorkoutSettingsSheet.tsx — ZenFit
 *
 * OpenGym-Grade Workout Settings Bottom Sheet Modal:
 * Triggered from the top 3-dots WorkoutMenuSheet ('Workout settings').
 * Allows lifters to customize rest alerts, default rest durations,
 * auto-timer activation, and screen awake behavior during active workouts.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILY } from '../../../theme/tokens';
import { hapticSelection, hapticLight } from '../../../utils/haptics';

export interface WorkoutSettingsSheetProps {
  visible: boolean;
  defaultRestSecs: number;
  autoTimerEnabled: boolean;
  soundEnabled: boolean;
  keepAwakeEnabled: boolean;
  onSelectDefaultRest: (secs: number) => void;
  onToggleAutoTimer: (enabled: boolean) => void;
  onToggleSound: (enabled: boolean) => void;
  onToggleKeepAwake: (enabled: boolean) => void;
  onClose: () => void;
}

const PRESET_DURATIONS = [
  { secs: 60, label: '1:00' },
  { secs: 90, label: '1:30' },
  { secs: 120, label: '2:00' },
  { secs: 180, label: '3:00' },
];

export const WorkoutSettingsSheet: React.FC<WorkoutSettingsSheetProps> = ({
  visible,
  defaultRestSecs,
  autoTimerEnabled,
  soundEnabled,
  keepAwakeEnabled,
  onSelectDefaultRest,
  onToggleAutoTimer,
  onToggleSound,
  onToggleKeepAwake,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissOverlay} onPress={onClose} />

        <View
          style={[
            styles.sheetCard,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
        >
          {/* 1. Drag Handle Bar */}
          <View style={styles.handleBar} />

          {/* 2. Header Row */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.iconBox}>
                <Ionicons name="settings-sharp" size={17} color="#000000" />
              </View>
              <Text style={styles.title}>Workout settings</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {/* 3. Section: Rest Timer Defaults */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>DEFAULT REST DURATION</Text>
            <View style={styles.presetsRow}>
              {PRESET_DURATIONS.map(p => {
                const isSelected = defaultRestSecs === p.secs;
                return (
                  <TouchableOpacity
                    key={p.secs}
                    style={[
                      styles.presetPill,
                      isSelected && styles.presetPillActive,
                    ]}
                    onPress={() => {
                      hapticSelection();
                      onSelectDefaultRest(p.secs);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        isSelected && styles.presetTextActive,
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 4. Section: Automation & Alerts */}
          <View style={styles.sectionCard}>
            {/* Auto-start Rest Timer */}
            <View style={styles.settingRow}>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingLabel}>Auto-start rest timer</Text>
                <Text style={styles.settingSub}>
                  Starts countdown automatically when a set is checked off
                </Text>
              </View>
              <Switch
                value={autoTimerEnabled}
                onValueChange={(val) => {
                  hapticLight();
                  onToggleAutoTimer(val);
                }}
                trackColor={{ false: '#3A3A3C', true: '#30D158' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            {/* Rest Alerts / Sound */}
            <View style={styles.settingRow}>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingLabel}>Rest chime & countdown cues</Text>
                <Text style={styles.settingSub}>
                  Play audio tones and synthesized rest alert
                </Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={(val) => {
                  hapticLight();
                  onToggleSound(val);
                }}
                trackColor={{ false: '#3A3A3C', true: '#30D158' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            {/* Keep Screen Awake */}
            <View style={styles.settingRow}>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingLabel}>Keep screen awake</Text>
                <Text style={styles.settingSub}>
                  Prevent display from sleeping during workout
                </Text>
              </View>
              <Switch
                value={keepAwakeEnabled}
                onValueChange={(val) => {
                  hapticLight();
                  onToggleKeepAwake(val);
                }}
                trackColor={{ false: '#3A3A3C', true: '#30D158' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* 5. Done Button */}
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={onClose}
            activeOpacity={0.82}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default WorkoutSettingsSheet;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheetCard: {
    backgroundColor: '#161618',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    width: '100%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handleBar: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#3A3A3C',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#30D158',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#8E8E93',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetPillActive: {
    backgroundColor: 'rgba(48, 209, 88, 0.18)',
    borderColor: '#30D158',
  },
  presetText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 15,
    color: '#E5E5EA',
  },
  presetTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#30D158',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingTextCol: {
    flex: 1,
    paddingRight: 14,
  },
  settingLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  settingSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 12,
  },
  doneBtn: {
    backgroundColor: '#30D158',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  doneBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 17,
    color: '#000000',
  },
});

