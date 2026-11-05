/**
 * BodyMetricsSheet.tsx — ZenFit
 *
 * Dedicated modal with clean separated tabs for:
 * - Tab 1: [ ⚖️ Weigh In ] — Fast bodyweight & goal logging (takes 3 seconds)
 * - Tab 2: [ 📸 Photo Check-In ] — Camera / Library upload with pose tag & progress tracking
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useCoreData } from '../../../contexts/domains/CoreDataContext';
import { useBodyMetrics } from '../../../contexts/domains/WellnessContext';
import { useGymProfile } from '../../../hooks/useGymProfile';
import { COLLECTION } from '../../../config/constants';
import { FONT_FAMILY } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import BottomSheet from '../../ui/BottomSheet';
import { queueWrite } from '../../../services/offlineSync';
import { uploadFileToCloudinary } from '../../../services/cloudinary';
import { formatLocalDateStr } from '../../../utils/dateUtils';
import { BOOT_KEYS, updateL1Cache } from '../../../utils/bootManifest';
import { DOMAIN_CACHE_KEYS, writeWellnessCache } from '../../../utils/domainCache';
import { impactAsync, notificationAsync, selectionAsync } from '../../../utils/haptics';

const WEIGHT_LOGS_KEY = BOOT_KEYS.WEIGHT_LOGS;

function classifyBMI(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: '#60A5FA' };
  if (bmi < 25) return { label: 'Normal', color: '#30D158' };
  if (bmi < 30) return { label: 'Overweight', color: '#FF9F0A' };
  return { label: 'Obese', color: '#FF453A' };
}

interface WeightEntry {
  id?: string;
  weight: number;
  weightKg?: number;
  date: string;
  photoUrl?: string | null;
  pose?: 'front' | 'back' | 'side';
}

interface Props {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'weight' | 'photo';
}

export default function BodyMetricsSheet({ visible, onClose, initialTab = 'weight' }: Props) {
  const { isDark } = useTheme();
  const { user } = useCoreData();
  const { weightLogs: contextWeightLogs } = useBodyMetrics();
  const { gymProfile, saveGymProfile } = useGymProfile();

  const [activeTab, setActiveTab] = useState<'weight' | 'photo'>(initialTab);
  const [weightInput, setWeightInput] = useState(
    gymProfile?.weightKg ? String(gymProfile.weightKg) : ''
  );
  const [targetInput, setTargetInput] = useState(
    gymProfile?.targetBodyweightKg ? String(gymProfile.targetBodyweightKg) : ''
  );
  const [selectedPose, setSelectedPose] = useState<'front' | 'back' | 'side'>('front');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [localLogs, setLocalLogs] = useState<WeightEntry[]>([]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, visible]);

  useEffect(() => {
    if (visible) {
      AsyncStorage.getItem(WEIGHT_LOGS_KEY).then(raw => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) setLocalLogs(parsed);
          } catch (_) {}
        }
      });
    }
  }, [visible]);

  // Real-time BMI calculation based on current input
  const heightCm = gymProfile?.heightCm || 180;
  const parsedWeight = parseFloat(weightInput);
  const previewBmi =
    parsedWeight > 0 && heightCm > 0
      ? Math.round((parsedWeight / Math.pow(heightCm / 100, 2)) * 10) / 10
      : null;
  const previewBmiClass = previewBmi ? classifyBMI(previewBmi) : null;

  // Take photo with camera
  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera Permission Required', 'Please enable camera access in your device settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
      selectionAsync();
    }
  };

  // Pick photo from gallery
  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo Access Required', 'Please allow photo library access in device settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
      selectionAsync();
    }
  };

  // Save Weight Log
  const handleSaveWeight = async () => {
    const w = parseFloat(weightInput);
    if (!w || w <= 0 || w > 300) {
      Alert.alert('Invalid Weight', 'Please enter a valid body weight between 30 and 300 kg.');
      return;
    }

    setSaving(true);
    impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const today = formatLocalDateStr(new Date());

    try {
      const existingToday = localLogs.find(l => l.date === today);
      const newEntry: WeightEntry = {
        weight: w,
        weightKg: w,
        date: today,
        photoUrl: existingToday?.photoUrl || null,
        pose: existingToday?.pose,
      };

      const updatedLocal = [newEntry, ...localLogs.filter(l => l.date !== today)];
      setLocalLogs(updatedLocal);

      // Persist in all caching tiers
      await AsyncStorage.setItem(WEIGHT_LOGS_KEY, JSON.stringify(updatedLocal));
      await AsyncStorage.setItem(DOMAIN_CACHE_KEYS.WEIGHT_LOGS, JSON.stringify(updatedLocal));
      updateL1Cache('weightLogs', updatedLocal);
      writeWellnessCache({ weightLogs: updatedLocal as any }, true);

      // Update gym profile
      const targetVal = targetInput ? parseFloat(targetInput) : gymProfile.targetBodyweightKg;
      await saveGymProfile({
        weightKg: w,
        ...(targetVal ? { targetBodyweightKg: targetVal } : {}),
      });

      // Background Firestore sync
      if (user?.uid) {
        const docId = `${user.uid}_weight_${today}`;
        await queueWrite(
          COLLECTION.WEIGHT_LOGS,
          'set',
          {
            userId: user.uid,
            weightKg: w,
            weight: w,
            date: today,
            createdAt: serverTimestamp(),
          },
          docId
        );
      }

      notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save weight.');
    } finally {
      setSaving(false);
    }
  };

  // Save Photo Check-In
  const handleSavePhoto = async () => {
    if (!photoUri) {
      Alert.alert('No Photo Selected', 'Please take or choose a photo first.');
      return;
    }

    setSaving(true);
    impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const today = formatLocalDateStr(new Date());

    try {
      let finalPhotoUrl = photoUri;
      try {
        const uploadRes = await uploadFileToCloudinary(photoUri, 'image/jpeg', `checkin_${today}.jpg`, () => {});
        if (uploadRes?.url) {
          finalPhotoUrl = uploadRes.url;
        }
      } catch (uploadErr) {
        // Fallback to local URI
        finalPhotoUrl = photoUri;
      }

      const currentWeight = parseFloat(weightInput) || gymProfile.weightKg || 80;
      const existingToday = localLogs.find(l => l.date === today);

      const newEntry: WeightEntry = {
        weight: currentWeight,
        weightKg: currentWeight,
        date: today,
        photoUrl: finalPhotoUrl,
        pose: selectedPose,
      };

      const updatedLocal = [newEntry, ...localLogs.filter(l => l.date !== today)];
      setLocalLogs(updatedLocal);

      await AsyncStorage.setItem(WEIGHT_LOGS_KEY, JSON.stringify(updatedLocal));
      await AsyncStorage.setItem(DOMAIN_CACHE_KEYS.WEIGHT_LOGS, JSON.stringify(updatedLocal));
      updateL1Cache('weightLogs', updatedLocal);
      writeWellnessCache({ weightLogs: updatedLocal as any }, true);

      if (user?.uid) {
        const docId = `${user.uid}_weight_${today}`;
        await queueWrite(
          COLLECTION.WEIGHT_LOGS,
          'set',
          {
            userId: user.uid,
            weightKg: currentWeight,
            weight: currentWeight,
            photoUrl: finalPhotoUrl,
            pose: selectedPose,
            date: today,
            createdAt: serverTimestamp(),
          },
          docId
        );
      }

      notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save photo check-in.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <Text style={styles.sheetTitle}>
            {activeTab === 'weight' ? 'Log Body Weight' : 'Physique Check-In Photo'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'weight' && styles.tabBtnActive]}
            onPress={() => {
              selectionAsync();
              setActiveTab('weight');
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="scale-outline" size={14} color={activeTab === 'weight' ? '#000000' : '#8E8E93'} />
            <Text style={[styles.tabBtnText, activeTab === 'weight' && styles.tabBtnTextActive]}>
              Weigh In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'photo' && styles.tabBtnActive]}
            onPress={() => {
              selectionAsync();
              setActiveTab('photo');
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-outline" size={14} color={activeTab === 'photo' ? '#000000' : '#8E8E93'} />
            <Text style={[styles.tabBtnText, activeTab === 'photo' && styles.tabBtnTextActive]}>
              Add Photo
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── TAB 1: WEIGH IN ── */}
        {activeTab === 'weight' && (
          <View style={styles.contentSection}>
            <View style={styles.weightInputCard}>
              <Text style={styles.inputCardLabel}>CURRENT WEIGHT</Text>
              <View style={styles.weightInputRow}>
                <TextInput
                  style={styles.largeWeightInput}
                  value={weightInput}
                  onChangeText={setWeightInput}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                  placeholderTextColor="#3A3A3C"
                  maxLength={5}
                  autoFocus
                />
                <Text style={styles.largeUnitText}>kg</Text>
              </View>

              {previewBmi && previewBmiClass ? (
                <View style={styles.bmiPreviewRow}>
                  <Text style={styles.bmiPreviewText}>BMI {previewBmi}</Text>
                  <View style={[styles.bmiBadge, { backgroundColor: `${previewBmiClass.color}22` }]}>
                    <Text style={[styles.bmiBadgeText, { color: previewBmiClass.color }]}>
                      {previewBmiClass.label}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Target Weight Field */}
            <View style={styles.fieldCard}>
              <View style={styles.fieldRow}>
                <View>
                  <Text style={styles.fieldTitle}>Target Body Weight</Text>
                  <Text style={styles.fieldSubtitle}>Your long-term goal weight</Text>
                </View>
                <View style={styles.miniInputWrap}>
                  <TextInput
                    style={styles.miniInput}
                    value={targetInput}
                    onChangeText={setTargetInput}
                    keyboardType="decimal-pad"
                    placeholder="80.0"
                    placeholderTextColor="#545458"
                    maxLength={5}
                  />
                  <Text style={styles.miniUnit}>kg</Text>
                </View>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.primaryActionBtn, saving && { opacity: 0.6 }]}
              onPress={handleSaveWeight}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={styles.primaryActionBtnText}>Save Weigh-In</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── TAB 2: PHOTO CHECK-IN ── */}
        {activeTab === 'photo' && (
          <View style={styles.contentSection}>
            {/* Image Preview or Pick Buttons */}
            {photoUri ? (
              <View style={styles.imagePreviewCard}>
                <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setPhotoUri(null)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoPickerOptions}>
                <TouchableOpacity
                  style={styles.pickerOptionCard}
                  onPress={handleTakePhoto}
                  activeOpacity={0.8}
                >
                  <View style={styles.pickerIconWrap}>
                    <Ionicons name="camera" size={24} color="#A599FF" />
                  </View>
                  <Text style={styles.pickerOptionTitle}>Take Photo</Text>
                  <Text style={styles.pickerOptionSub}>Open Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pickerOptionCard}
                  onPress={handlePickPhoto}
                  activeOpacity={0.8}
                >
                  <View style={styles.pickerIconWrap}>
                    <Ionicons name="images" size={24} color="#64D2FF" />
                  </View>
                  <Text style={styles.pickerOptionTitle}>Choose Library</Text>
                  <Text style={styles.pickerOptionSub}>From Photos</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Pose Tag Selector */}
            <View style={styles.fieldCard}>
              <Text style={styles.fieldTitle}>Check-In Pose Angle</Text>
              <View style={styles.posePillsRow}>
                {(['front', 'side', 'back'] as const).map(p => {
                  const isSel = selectedPose === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.posePill, isSel && styles.posePillActive]}
                      onPress={() => {
                        selectionAsync();
                        setSelectedPose(p);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.posePillText, isSel && styles.posePillTextActive]}>
                        {p.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Save Photo Button */}
            <TouchableOpacity
              style={[
                styles.primaryActionBtn,
                (!photoUri || saving) && { opacity: 0.5 },
              ]}
              onPress={handleSavePhoto}
              disabled={!photoUri || saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={styles.primaryActionBtnText}>Save Check-In Photo</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 36,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  sheetTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  tabBtnText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    color: '#8E8E93',
  },
  tabBtnTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  contentSection: {
    gap: 14,
  },
  weightInputCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  inputCardLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  largeWeightInput: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 44,
    color: '#FFFFFF',
    minWidth: 120,
    textAlign: 'center',
  },
  largeUnitText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 20,
    color: '#8E8E93',
  },
  bmiPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  bmiPreviewText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8E8E93',
  },
  bmiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bmiBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
  },
  fieldCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  fieldSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8E8E93',
    marginTop: 2,
  },
  miniInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  miniInput: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#FFFFFF',
    width: 44,
    textAlign: 'right',
  },
  miniUnit: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8E8E93',
  },
  photoPickerOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerOptionCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  pickerIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  pickerOptionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  pickerOptionSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
  },
  imagePreviewCard: {
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1C1C1E',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posePillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  posePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
  },
  posePillActive: {
    backgroundColor: '#A599FF',
  },
  posePillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11.5,
    color: '#8E8E93',
  },
  posePillTextActive: {
    color: '#000000',
  },
  primaryActionBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryActionBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: '#000000',
  },
});
