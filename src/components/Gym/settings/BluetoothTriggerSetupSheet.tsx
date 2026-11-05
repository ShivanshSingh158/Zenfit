/**
 * BluetoothTriggerSetupSheet.tsx — ZenFit
 *
 * Bottom sheet modal for configuring Bluetooth Headphone Trigger:
 * - Toggle enabled (0% location required)
 * - Auto-detect currently connected Bluetooth buds / headphones button
 * - Target device name filter (e.g. "AirPods Pro", "Beats", or empty for any)
 * - Active workout hours filter (e.g. 05:00 - 21:00)
 * - Launch mode (Prompt Notification vs Direct Launch)
 * - Test notification trigger
 * - Full edge-to-edge layout with safe area insets (zero bottom gap)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILY } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { hapticSelection, hapticMedium, hapticSuccess } from '../../../utils/haptics';
import {
  getBluetoothTriggerConfig,
  saveBluetoothTriggerConfig,
  testBluetoothTriggerNotification,
  detectConnectedAudioDevice,
} from '../../../services/audioTriggerService';
import { BluetoothTriggerConfig } from '../../../types/gym.types';

interface BluetoothTriggerSetupSheetProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (config: BluetoothTriggerConfig) => void;
}

const POPULAR_DEVICES = ['AirPods', 'Beats', 'Sony', 'Galaxy Buds', 'Bose'];

export const BluetoothTriggerSetupSheet: React.FC<BluetoothTriggerSetupSheetProps> = ({
  visible,
  onClose,
  onSaved,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [enabled, setEnabled] = useState(false);
  const [targetDeviceName, setTargetDeviceName] = useState('');
  const [filterWorkoutHours, setFilterWorkoutHours] = useState(true);
  const [startHour, setStartHour] = useState('05:00');
  const [endHour, setEndHour] = useState('21:00');
  const [autoLaunchWorkout, setAutoLaunchWorkout] = useState(false);

  const [detecting, setDetecting] = useState(false);
  const [detectedBadge, setDetectedBadge] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (visible) {
      getBluetoothTriggerConfig().then((cfg) => {
        setEnabled(cfg.enabled);
        setTargetDeviceName(cfg.targetDeviceName || '');
        setFilterWorkoutHours(cfg.filterWorkoutHours ?? true);
        setStartHour(cfg.startHour || '05:00');
        setEndHour(cfg.endHour || '21:00');
        setAutoLaunchWorkout(cfg.autoLaunchWorkout ?? false);
      });

      // Quick passive background detection on sheet open
      detectConnectedAudioDevice().then((dev) => {
        if (dev && dev.name) {
          setDetectedBadge(dev.name);
        }
      }).catch(() => {});
    }
  }, [visible]);

  // Active Auto-Detect Button Handler
  const handleAutoDetect = async () => {
    hapticMedium();
    setDetecting(true);
    try {
      const dev = await detectConnectedAudioDevice();
      if (dev && dev.name) {
        setTargetDeviceName(dev.name);
        setDetectedBadge(dev.name);
        hapticSuccess();
        Alert.alert(
          'Buds Detected! 🎧',
          `Successfully connected to "${dev.name}". Your target device filter has been updated.`
        );
      } else {
        Alert.alert(
          'No Bluetooth Buds Detected',
          'Make sure your Bluetooth headphones or earbuds are currently connected in phone settings. You can also type their name manually.'
        );
      }
    } catch (err: any) {
      Alert.alert('Detection Error', err?.message || 'Could not query audio devices.');
    } finally {
      setDetecting(false);
    }
  };

  const handleTestNotification = async () => {
    hapticMedium();
    setTesting(true);
    try {
      await testBluetoothTriggerNotification(targetDeviceName || 'Headphones');
      hapticSuccess();
      Alert.alert(
        'Test Alert Sent 🎧',
        `A simulated headphone connection trigger for "${targetDeviceName || 'Headphones'}" was sent.`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not send test notification.');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const newConfig: BluetoothTriggerConfig = {
      enabled,
      targetDeviceName: targetDeviceName.trim(),
      filterWorkoutHours,
      startHour,
      endHour,
      autoLaunchWorkout,
    };

    await saveBluetoothTriggerConfig(newConfig);
    setSaving(false);
    hapticSuccess();
    onSaved?.(newConfig);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Absolute Backdrop Touch to Dismiss */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                paddingBottom: Math.max(insets.bottom + 16, 28),
              },
            ]}
          >
            {/* Top Grab Handle */}
            <View style={styles.handleBar} />

            {/* Header */}
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="headset" size={20} color="#0A84FF" />
                  <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Headphone Workout Trigger
                  </Text>
                </View>
                <Text style={styles.headerSubtitle}>
                  Zero location required · 0% background battery drain
                </Text>
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color={isDark ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
            </View>

            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {/* Toggle Enable Row */}
              <View style={[styles.cardRow, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[styles.rowTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Enable Headphone Trigger
                  </Text>
                  <Text style={styles.rowSub}>
                    Prompts you to start your session as soon as you put on headphones
                  </Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={(val) => {
                    hapticSelection();
                    setEnabled(val);
                  }}
                  trackColor={{ false: '#3A3A3C', true: '#30D158' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Auto-Detect Bluetooth Buds Button */}
              <View style={styles.sectionBlock}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={styles.fieldLabel}>AUTO-DETECT CONNECTED BUDS</Text>
                  {detectedBadge && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="bluetooth" size={13} color="#0A84FF" />
                      <Text style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 11, color: '#0A84FF' }}>
                        {detectedBadge}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  onPress={handleAutoDetect}
                  disabled={detecting}
                  style={styles.detectBtn}
                  activeOpacity={0.8}
                >
                  {detecting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="search" size={16} color="#FFFFFF" />
                      <Text style={styles.detectBtnText}>
                        Auto-Detect My Connected Buds
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Device Filter Input */}
              <View style={styles.sectionBlock}>
                <Text style={styles.fieldLabel}>DEVICE NAME FILTER</Text>
                <View style={[styles.inputBox, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                  <Ionicons name="bluetooth-outline" size={18} color="#8E8E93" style={{ marginRight: 8 }} />
                  <TextInput
                    value={targetDeviceName}
                    onChangeText={setTargetDeviceName}
                    placeholder="Leave blank for any headphones"
                    placeholderTextColor="#8E8E93"
                    style={[styles.inputField, { color: isDark ? '#FFFFFF' : '#000000' }]}
                    maxLength={40}
                  />
                  {targetDeviceName.length > 0 && (
                    <TouchableOpacity onPress={() => setTargetDeviceName('')}>
                      <Ionicons name="close-circle" size={16} color="#8E8E93" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Quick preset chips */}
                <View style={styles.presetsRow}>
                  {POPULAR_DEVICES.map((name) => (
                    <TouchableOpacity
                      key={name}
                      onPress={() => {
                        hapticSelection();
                        setTargetDeviceName(name);
                      }}
                      style={[
                        styles.presetChip,
                        { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' },
                        targetDeviceName === name && styles.presetChipActive,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          { color: isDark ? '#FFFFFF' : '#000000' },
                          targetDeviceName === name && { color: '#0A84FF', fontFamily: FONT_FAMILY.bold },
                        ]}
                      >
                        {name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Active Workout Hours Guard */}
              <View style={styles.sectionBlock}>
                <View style={[styles.cardRow, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', marginBottom: 0 }]}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={[styles.rowTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                      Active Gym Hours Guard
                    </Text>
                    <Text style={styles.rowSub}>
                      Only triggers between 5:00 AM – 9:00 PM (silences late night music)
                    </Text>
                  </View>
                  <Switch
                    value={filterWorkoutHours}
                    onValueChange={(val) => {
                      hapticSelection();
                      setFilterWorkoutHours(val);
                    }}
                    trackColor={{ false: '#3A3A3C', true: '#30D158' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Launch Mode Row */}
              <View style={styles.sectionBlock}>
                <Text style={styles.fieldLabel}>TRIGGER ACTION</Text>
                <View style={styles.actionModesRow}>
                  <TouchableOpacity
                    onPress={() => {
                      hapticSelection();
                      setAutoLaunchWorkout(false);
                    }}
                    style={[
                      styles.modeCard,
                      { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
                      !autoLaunchWorkout && styles.modeCardActive,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modeTitle, !autoLaunchWorkout && { color: '#0A84FF' }]}>
                      Prompt Notification
                    </Text>
                    <Text style={styles.modeSub}>
                      Shows interactive banner: "Tap to Start Workout" (Recommended)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      hapticSelection();
                      setAutoLaunchWorkout(true);
                    }}
                    style={[
                      styles.modeCard,
                      { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
                      autoLaunchWorkout && styles.modeCardActive,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modeTitle, autoLaunchWorkout && { color: '#0A84FF' }]}>
                      Direct Launch
                    </Text>
                    <Text style={styles.modeSub}>
                      Opens workout log directly when app is active
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Test Notification Row */}
              <TouchableOpacity
                onPress={handleTestNotification}
                disabled={testing}
                style={[styles.testRow, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.12)' : 'rgba(10, 132, 255, 0.08)' }]}
                activeOpacity={0.8}
              >
                <Ionicons name="notifications-outline" size={16} color="#0A84FF" />
                <Text style={styles.testRowText}>
                  {testing ? 'Sending alert...' : 'Test Headphone Notification'}
                </Text>
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.cancelBtn, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.cancelBtnText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  style={styles.saveBtn}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save & Apply</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
    justifyContent: 'flex-end',
  },
  keyboardWrap: {
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxHeight: '90%',
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8E8E93',
    alignSelf: 'center',
    marginBottom: 14,
    opacity: 0.6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
  },
  rowTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14.5,
  },
  rowSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8E8E93',
    marginTop: 2,
  },
  sectionBlock: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    color: '#8E8E93',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0A84FF',
    paddingVertical: 11,
    borderRadius: 12,
  },
  detectBtnText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  inputField: {
    flex: 1,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 14,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  presetChipActive: {
    borderWidth: 1,
    borderColor: '#0A84FF',
  },
  presetChipText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11.5,
  },
  actionModesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  modeCardActive: {
    borderColor: '#0A84FF',
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
  },
  modeTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12.5,
    marginBottom: 3,
  },
  modeSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10.5,
    color: '#8E8E93',
    lineHeight: 14,
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    marginBottom: 16,
  },
  testRowText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12.5,
    color: '#0A84FF',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#0A84FF',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
