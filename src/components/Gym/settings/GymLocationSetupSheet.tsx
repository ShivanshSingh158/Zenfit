/**
 * GymLocationSetupSheet.tsx — ZenFit
 *
 * Bottom sheet modal for configuring Geofenced Gym Arrival Reminder:
 * - Default gym name: "Gym"
 * - GPS 1-tap pin or manual Latitude & Longitude coordinate inputs (Google Maps paste support)
 * - Geofence radius selector (100m, 150m, 250m)
 * - Test notification trigger
 * - Hardware OS region monitoring setup (<0.5% battery/day)
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
  getGymGeofenceConfig,
  saveGymGeofenceConfig,
  getCurrentUserCoordinates,
  testGymArrivalNotification,
} from '../../../services/gymGeofenceService';
import { GymGeofenceConfig } from '../../../types/gym.types';

interface GymLocationSetupSheetProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (config: GymGeofenceConfig) => void;
}

const RADIUS_OPTIONS = [
  { meters: 100, label: '100m', desc: 'Dense City / Mall' },
  { meters: 150, label: '150m', desc: 'Standard (Recommended)' },
  { meters: 250, label: '250m', desc: 'Campus / Suburban' },
];

export const GymLocationSetupSheet: React.FC<GymLocationSetupSheetProps> = ({
  visible,
  onClose,
  onSaved,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [enabled, setEnabled] = useState(false);
  const [gymName, setGymName] = useState('Gym');
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);
  const [latText, setLatText] = useState('');
  const [lngText, setLngText] = useState('');
  const [radiusMeters, setRadiusMeters] = useState<number>(150);

  const [loadingCoords, setLoadingCoords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (visible) {
      getGymGeofenceConfig().then((cfg) => {
        setEnabled(cfg.enabled);
        setGymName(cfg.gymName || 'Gym');
        const lat = cfg.latitude || 0;
        const lng = cfg.longitude || 0;
        setLatitude(lat);
        setLongitude(lng);
        setLatText(lat !== 0 ? lat.toString() : '');
        setLngText(lng !== 0 ? lng.toString() : '');
        setRadiusMeters(cfg.radiusMeters || 150);
      });
    }
  }, [visible]);

  // Handle GPS Auto-Pin
  const handleGetCurrentLocation = async () => {
    hapticMedium();
    setLoadingCoords(true);
    try {
      const coords = await getCurrentUserCoordinates();
      if (coords) {
        setLatitude(coords.latitude);
        setLongitude(coords.longitude);
        setLatText(coords.latitude.toFixed(6));
        setLngText(coords.longitude.toFixed(6));
        hapticSuccess();
      } else {
        Alert.alert(
          'Location Permission Required',
          'Please allow location access while using ZenFit so we can pin your current gym coordinates.'
        );
      }
    } catch (err: any) {
      Alert.alert('Location Error', err?.message || 'Could not fetch current position.');
    } finally {
      setLoadingCoords(false);
    }
  };

  // Smart Coordinate Input (Parses "lat, lng" pasted from Google Maps)
  const handleLatChange = (text: string) => {
    if (text.includes(',')) {
      const parts = text.split(',');
      const pLat = parseFloat(parts[0].trim());
      const pLng = parseFloat(parts[1].trim());
      if (!isNaN(pLat)) {
        setLatitude(pLat);
        setLatText(parts[0].trim());
      }
      if (!isNaN(pLng)) {
        setLongitude(pLng);
        setLngText(parts[1].trim());
      }
      return;
    }
    setLatText(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed)) setLatitude(parsed);
    else if (text === '' || text === '-') setLatitude(0);
  };

  const handleLngChange = (text: string) => {
    if (text.includes(',')) {
      const parts = text.split(',');
      const pLat = parseFloat(parts[0].trim());
      const pLng = parseFloat(parts[1].trim());
      if (!isNaN(pLat)) {
        setLatitude(pLat);
        setLatText(parts[0].trim());
      }
      if (!isNaN(pLng)) {
        setLongitude(pLng);
        setLngText(parts[1].trim());
      }
      return;
    }
    setLngText(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed)) setLongitude(parsed);
    else if (text === '' || text === '-') setLongitude(0);
  };

  const handleTestNotification = async () => {
    hapticMedium();
    setTesting(true);
    try {
      await testGymArrivalNotification(gymName || 'Gym');
      hapticSuccess();
      Alert.alert(
        'Test Alert Sent 📍',
        `A simulated gym arrival reminder for "${gymName || 'Gym'}" was sent to your notifications.`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not send test notification.');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (enabled && (latitude === 0 || longitude === 0)) {
      Alert.alert(
        'Location Pin Missing',
        'Please enter gym coordinates or tap "Use Current GPS" before enabling arrival alerts.'
      );
      return;
    }

    setSaving(true);
    const newConfig: GymGeofenceConfig = {
      enabled,
      gymName: gymName.trim() || 'Gym',
      latitude,
      longitude,
      radiusMeters,
    };

    const res = await saveGymGeofenceConfig(newConfig);
    setSaving(false);

    if (res.success) {
      hapticSuccess();
      onSaved?.(newConfig);
      onClose();
    } else {
      Alert.alert('Setup Error', res.error || 'Failed to save geofence configuration.');
    }
  };

  const hasCoordinates = latitude !== 0 && longitude !== 0;

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
                  <Ionicons name="location" size={20} color="#FF9F0A" />
                  <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Gym Arrival Geofence
                  </Text>
                </View>
                <Text style={styles.headerSubtitle}>
                  Hardware OS region monitoring · &lt;0.5% battery/day
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
                    Enable Arrival Reminder
                  </Text>
                  <Text style={styles.rowSub}>
                    Reminds you to start your workout upon arrival at your gym
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

              {/* Gym Name Input */}
              <View style={styles.sectionBlock}>
                <Text style={styles.fieldLabel}>GYM NAME</Text>
                <View style={[styles.inputBox, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                  <Ionicons name="barbell-outline" size={18} color="#8E8E93" style={{ marginRight: 8 }} />
                  <TextInput
                    value={gymName}
                    onChangeText={setGymName}
                    placeholder="Gym"
                    placeholderTextColor="#8E8E93"
                    style={[styles.inputField, { color: isDark ? '#FFFFFF' : '#000000' }]}
                    maxLength={40}
                  />
                </View>
              </View>

              {/* Location Coordinates Card (GPS + Manual Inputs) */}
              <View style={styles.sectionBlock}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={styles.fieldLabel}>GYM COORDINATES</Text>
                  {hasCoordinates && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="checkmark-circle" size={13} color="#30D158" />
                      <Text style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 11, color: '#30D158' }}>
                        Pinned
                      </Text>
                    </View>
                  )}
                </View>

                {/* 1-Tap GPS Button */}
                <TouchableOpacity
                  onPress={handleGetCurrentLocation}
                  disabled={loadingCoords}
                  style={styles.gpsFullBtn}
                  activeOpacity={0.8}
                >
                  {loadingCoords ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="navigate" size={16} color="#FFFFFF" />
                      <Text style={styles.gpsFullBtnText}>Use My Current Location (GPS)</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Manual Coordinate Input Fields */}
                <View style={styles.coordsInputsRow}>
                  <View style={[styles.coordInputCol, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                    <Text style={styles.coordInputTag}>LAT</Text>
                    <TextInput
                      value={latText}
                      onChangeText={handleLatChange}
                      placeholder="e.g. 28.6139"
                      placeholderTextColor="#8E8E93"
                      keyboardType="numeric"
                      style={[styles.coordInputField, { color: isDark ? '#FFFFFF' : '#000000' }]}
                    />
                  </View>

                  <View style={[styles.coordInputCol, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                    <Text style={styles.coordInputTag}>LNG</Text>
                    <TextInput
                      value={lngText}
                      onChangeText={handleLngChange}
                      placeholder="e.g. 77.2090"
                      keyboardType="numeric"
                      placeholderTextColor="#8E8E93"
                      style={[styles.coordInputField, { color: isDark ? '#FFFFFF' : '#000000' }]}
                    />
                  </View>
                </View>
                <Text style={styles.coordsHint}>
                  Paste "Lat, Lng" directly from Google Maps into either box.
                </Text>
              </View>

              {/* Radius Selector */}
              <View style={styles.sectionBlock}>
                <Text style={styles.fieldLabel}>ARRIVAL DETECTION RADIUS</Text>
                <View style={styles.radiusRow}>
                  {RADIUS_OPTIONS.map((opt) => {
                    const isSelected = radiusMeters === opt.meters;
                    return (
                      <TouchableOpacity
                        key={opt.meters}
                        onPress={() => {
                          hapticSelection();
                          setRadiusMeters(opt.meters);
                        }}
                        style={[
                          styles.radiusCard,
                          { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
                          isSelected && styles.radiusCardSelected,
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.radiusLabel,
                            { color: isDark ? '#FFFFFF' : '#000000' },
                            isSelected && styles.radiusLabelSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        <Text
                          style={[
                            styles.radiusDesc,
                            isSelected && { color: '#000000' },
                          ]}
                          numberOfLines={1}
                        >
                          {opt.desc}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Test Notification Row */}
              <TouchableOpacity
                onPress={handleTestNotification}
                disabled={testing}
                style={[styles.testRow, { backgroundColor: isDark ? 'rgba(255, 159, 10, 0.12)' : 'rgba(255, 159, 10, 0.08)' }]}
                activeOpacity={0.8}
              >
                <Ionicons name="notifications-outline" size={16} color="#FF9F0A" />
                <Text style={styles.testRowText}>
                  {testing ? 'Sending alert...' : 'Test Arrival Notification'}
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
                    <ActivityIndicator size="small" color="#000000" />
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
  gpsFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0A84FF',
    paddingVertical: 11,
    borderRadius: 12,
    marginBottom: 8,
  },
  gpsFullBtnText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  coordsInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  coordInputCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 42,
  },
  coordInputTag: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#8E8E93',
    marginRight: 6,
  },
  coordInputField: {
    flex: 1,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
  },
  coordsHint: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 5,
  },
  radiusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  radiusCardSelected: {
    backgroundColor: '#FF9F0A',
    borderColor: '#FF9F0A',
  },
  radiusLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
  },
  radiusLabelSelected: {
    color: '#000000',
  },
  radiusDesc: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 9.5,
    color: '#8E8E93',
    marginTop: 2,
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
    color: '#FF9F0A',
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
    backgroundColor: '#FF9F0A',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#000000',
  },
});
