/**
 * BodyMetricsSheet.tsx — ZenFit
 *
 * Dedicated modal with separated tabs for Weigh In and Physique Check-In Photo.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  InteractionManager,
  Keyboard,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Camera, Image as ImageIcon, Minus, Plus, Scale, Trash2, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useCoreData } from '../../../contexts/domains/CoreDataContext';
import { useBodyMetrics } from '../../../contexts/domains/WellnessContext';
import { useGymProfile } from '../../../hooks/useGymProfile';
import { COLLECTION } from '../../../config/constants';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { NumericText, TactileButton } from '../../ui';
import BottomSheet from '../../ui/BottomSheet';
import { queueWrite } from '../../../services/offlineSync';
import { uploadFileToCloudinary } from '../../../services/cloudinary';
import { formatLocalDateStr } from '../../../utils/dateUtils';
import { BOOT_KEYS, updateL1Cache } from '../../../utils/bootManifest';
import { DOMAIN_CACHE_KEYS, writeWellnessCache } from '../../../utils/domainCache';
import { displayToKg, formatWeight, kgToDisplay, unitLabel, useWeightUnit } from '../../../utils/weightUnit';

const WEIGHT_LOGS_KEY = BOOT_KEYS.WEIGHT_LOGS;

function classifyBMI(bmi: number, tokens: ThemeTokens): { label: string; color: string; bg: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: tokens.status.info, bg: tokens.status.infoDim };
  if (bmi < 25) return { label: 'Normal', color: tokens.status.success, bg: tokens.status.successDim };
  if (bmi < 30) return { label: 'Overweight', color: tokens.status.warning, bg: tokens.status.warningDim };
  return { label: 'Obese', color: tokens.status.danger, bg: tokens.status.dangerDim };
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
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { user } = useCoreData();
  const { weightLogs: contextWeightLogs } = useBodyMetrics();
  const { gymProfile, saveGymProfile } = useGymProfile();
  const unitIsLbs = useWeightUnit();
  const weightUnitStr = unitLabel(unitIsLbs);

  const [activeTab, setActiveTab] = useState<'weight' | 'photo'>(initialTab);
  const [weightInput, setWeightInput] = useState(
    gymProfile?.weightKg ? String(kgToDisplay(gymProfile.weightKg, unitIsLbs, 1)) : ''
  );
  const [targetInput, setTargetInput] = useState(
    gymProfile?.targetBodyweightKg ? String(kgToDisplay(gymProfile.targetBodyweightKg, unitIsLbs, 1)) : ''
  );
  const [selectedPose, setSelectedPose] = useState<'front' | 'back' | 'side'>('front');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [localLogs, setLocalLogs] = useState<WeightEntry[]>([]);

  useEffect(() => {
    setActiveTab(initialTab);
    setStatusError(null);
    if (visible) {
      setWeightInput(
        gymProfile?.weightKg ? String(kgToDisplay(gymProfile.weightKg, unitIsLbs, 1)) : ''
      );
      setTargetInput(
        gymProfile?.targetBodyweightKg ? String(kgToDisplay(gymProfile.targetBodyweightKg, unitIsLbs, 1)) : ''
      );
    }
  }, [initialTab, visible, unitIsLbs, gymProfile?.weightKg, gymProfile?.targetBodyweightKg]);

  useEffect(() => {
    if (visible) {
      if (contextWeightLogs && contextWeightLogs.length > 0) {
        setLocalLogs(contextWeightLogs as any);
      } else {
        const task = InteractionManager.runAfterInteractions(() => {
          AsyncStorage.getItem(WEIGHT_LOGS_KEY).then(raw => {
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) setLocalLogs(parsed);
              } catch (_) {}
            }
          });
        });
        return () => {
          task?.cancel?.();
        };
      }
    }
  }, [visible, contextWeightLogs]);

  const heightCm = gymProfile?.heightCm || 180;
  const parsedDisplayWeight = parseFloat(weightInput);
  const parsedWeightKg =
    Number.isFinite(parsedDisplayWeight) && parsedDisplayWeight > 0
      ? displayToKg(parsedDisplayWeight, unitIsLbs)
      : 0;
  const previewBmi =
    parsedWeightKg > 0 && heightCm > 0
      ? Math.round((parsedWeightKg / Math.pow(heightCm / 100, 2)) * 10) / 10
      : null;
  const previewBmiClass = previewBmi ? classifyBMI(previewBmi, tokens) : null;

  const handleTakePhoto = async () => {
    setStatusError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setStatusError('Enable camera access in device settings to take a check-in photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handlePickPhoto = async () => {
    setStatusError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatusError('Allow photo library access in device settings to choose a photo.');
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
    }
  };

  const handleSaveWeight = async () => {
    if (savingRef.current) return;
    setStatusError(null);
    const rawVal = parseFloat(weightInput);
    const maxDisplay = unitIsLbs ? 660 : 300;
    const minDisplay = unitIsLbs ? 44 : 20;
    if (!rawVal || rawVal < minDisplay || rawVal > maxDisplay) {
      setStatusError(`Enter a valid body weight between ${minDisplay} and ${maxDisplay} ${weightUnitStr}.`);
      return;
    }
    const w = displayToKg(rawVal, unitIsLbs);

    savingRef.current = true;
    setSaving(true);
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

      await AsyncStorage.setItem(WEIGHT_LOGS_KEY, JSON.stringify(updatedLocal));
      await AsyncStorage.setItem(DOMAIN_CACHE_KEYS.WEIGHT_LOGS, JSON.stringify(updatedLocal));
      updateL1Cache('weightLogs', updatedLocal);
      writeWellnessCache({ weightLogs: updatedLocal as any }, true);

      const rawTarget = targetInput ? parseFloat(targetInput) : null;
      const targetVal = rawTarget && rawTarget > 0 ? displayToKg(rawTarget, unitIsLbs) : gymProfile.targetBodyweightKg;
      await saveGymProfile({
        weightKg: w,
        ...(targetVal ? { targetBodyweightKg: targetVal } : {}),
      });

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

      onClose();
    } catch (err: any) {
      setStatusError(err?.message || 'Failed to save weight.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleSavePhoto = async () => {
    if (savingRef.current) return;
    setStatusError(null);
    if (!photoUri) {
      setStatusError('Take or choose a photo first.');
      return;
    }

    savingRef.current = true;
    setSaving(true);
    const today = formatLocalDateStr(new Date());

    try {
      let finalPhotoUrl = photoUri;
      try {
        const uploadRes = await uploadFileToCloudinary(photoUri, 'image/jpeg', `checkin_${today}.jpg`, () => {});
        if (uploadRes?.url) {
          finalPhotoUrl = uploadRes.url;
        }
      } catch {
        finalPhotoUrl = photoUri;
      }

      const parsedInput = parseFloat(weightInput);
      const existingToday = localLogs.find(l => l.date === today);
      const currentWeight =
        Number.isFinite(parsedInput) && parsedInput > 0
          ? displayToKg(parsedInput, unitIsLbs)
          : (existingToday?.weightKg ?? existingToday?.weight ?? gymProfile.weightKg ?? 0);

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

      onClose();
    } catch (err: any) {
      setStatusError(err?.message || 'Failed to save photo check-in.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const weightStep = unitIsLbs ? 1 : 0.5;

  const handleNudgeWeight = (deltaDisplay: number) => {
    setStatusError(null);
    const base = parseFloat(weightInput);
    const fallbackDisp = kgToDisplay(gymProfile?.weightKg || 70, unitIsLbs, 1);
    const current = Number.isFinite(base) && base > 0 ? base : fallbackDisp;
    const minDisp = unitIsLbs ? 44 : 20;
    const maxDisp = unitIsLbs ? 660 : 300;
    const next = Math.max(minDisp, Math.min(maxDisp, Math.round((current + deltaDisplay) * 10) / 10));
    setWeightInput(String(next));
  };

  const handleDeleteWeightEntry = async (dateToRemove: string) => {
    const updatedLocal = localLogs.filter(l => l.date !== dateToRemove);
    setLocalLogs(updatedLocal);
    await AsyncStorage.setItem(WEIGHT_LOGS_KEY, JSON.stringify(updatedLocal));
    await AsyncStorage.setItem(DOMAIN_CACHE_KEYS.WEIGHT_LOGS, JSON.stringify(updatedLocal));
    updateL1Cache('weightLogs', updatedLocal);
    writeWellnessCache({ weightLogs: updatedLocal as any }, true);
  };

  const recentLogs = useMemo(
    () =>
      [...localLogs]
        .filter(l => l?.date && Number(l.weightKg ?? l.weight) > 0)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3),
    [localLogs]
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        Keyboard.dismiss();
        onClose();
      }}
      avoidKeyboard={true}
    >
      <ScrollView
        style={{ flexShrink: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        contentContainerStyle={styles.container}
      >
        <View style={styles.headerRow}>
          <Text style={styles.sheetTitle}>
            {activeTab === 'weight' ? 'Log Body Weight' : 'Physique Check-In'}
          </Text>
          <TactileButton
            variant="custom"
            onPress={() => {
              Keyboard.dismiss();
              onClose();
            }}
            style={styles.closeBtn}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel="Close body metrics modal"
          >
            <X size={16} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
          </TactileButton>
        </View>

        {statusError ? (
          <View
            style={{
              backgroundColor: tokens.status.dangerDim,
              borderRadius: RADIUS.inner,
              paddingHorizontal: SPACE.md,
              paddingVertical: SPACE.sm,
              marginBottom: SPACE.sm,
            }}
          >
            <Text style={{ fontSize: 12.5, fontFamily: FONT_FAMILY.medium, color: tokens.status.danger }}>
              {statusError}
            </Text>
          </View>
        ) : null}

        <View style={styles.tabBar}>
          <TactileButton
            variant="custom"
            haptic="selection"
            style={[styles.tabBtn, activeTab === 'weight' && styles.tabBtnActive]}
            onPress={() => setActiveTab('weight')}
          >
            <Scale
              size={ICON.xs}
              strokeWidth={ICON.strokeWidth}
              color={activeTab === 'weight' ? tokens.accent.onPrimary : tokens.text.secondary}
            />
            <Text style={[styles.tabBtnText, activeTab === 'weight' && styles.tabBtnTextActive]}>
              Weigh In
            </Text>
          </TactileButton>

          <TactileButton
            variant="custom"
            haptic="selection"
            style={[styles.tabBtn, activeTab === 'photo' && styles.tabBtnActive]}
            onPress={() => {
              Keyboard.dismiss();
              setActiveTab('photo');
            }}
          >
            <Camera
              size={ICON.xs}
              strokeWidth={ICON.strokeWidth}
              color={activeTab === 'photo' ? tokens.accent.onPrimary : tokens.text.secondary}
            />
            <Text style={[styles.tabBtnText, activeTab === 'photo' && styles.tabBtnTextActive]}>
              Add Photo
            </Text>
          </TactileButton>
        </View>

        {activeTab === 'weight' && (
          <View style={styles.contentSection}>
            <View style={styles.weightInputCard}>
              <Text style={styles.inputCardLabel}>CURRENT WEIGHT</Text>
              <View style={styles.weightStepperRow}>
                <TactileButton
                  variant="icon"
                  haptic="light"
                  onPress={() => handleNudgeWeight(-weightStep)}
                  style={styles.nudgeBtn}
                  hitSlop={TOUCH.hitSlop}
                  accessibilityLabel={`Decrease weight by ${weightStep} ${weightUnitStr}`}
                >
                  <Minus size={16} strokeWidth={ICON.strokeWidth} color={tokens.text.primary} />
                </TactileButton>

                <View style={styles.weightInputRow}>
                  <TextInput
                    style={styles.largeWeightInput}
                    maxFontSizeMultiplier={1.25}
                    value={weightInput}
                    onChangeText={setWeightInput}
                    keyboardType="decimal-pad"
                    placeholder="0.0"
                    placeholderTextColor={tokens.text.muted}
                    maxLength={5}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  <Text style={styles.largeUnitText}>{weightUnitStr}</Text>
                </View>

                <TactileButton
                  variant="icon"
                  haptic="light"
                  onPress={() => handleNudgeWeight(weightStep)}
                  style={styles.nudgeBtn}
                  hitSlop={TOUCH.hitSlop}
                  accessibilityLabel={`Increase weight by ${weightStep} ${weightUnitStr}`}
                >
                  <Plus size={16} strokeWidth={ICON.strokeWidth} color={tokens.text.primary} />
                </TactileButton>
              </View>

              {previewBmi && previewBmiClass ? (
                <View style={styles.bmiPreviewRow}>
                  <NumericText style={styles.bmiPreviewText}>BMI {previewBmi}</NumericText>
                  <View style={[styles.bmiBadge, { backgroundColor: previewBmiClass.bg }]}>
                    <Text style={[styles.bmiBadgeText, { color: previewBmiClass.color }]}>
                      {previewBmiClass.label}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.fieldCard}>
              <View style={styles.fieldRow}>
                <View style={{ flex: 1, paddingRight: SPACE.sm }}>
                  <Text style={styles.fieldTitle}>Target Weight</Text>
                  <Text style={styles.fieldSubtitle}>Your goal weight</Text>
                </View>
                <View style={styles.miniInputWrap}>
                  <TextInput
                    style={styles.miniInput}
                    maxFontSizeMultiplier={1.25}
                    value={targetInput}
                    onChangeText={setTargetInput}
                    keyboardType="decimal-pad"
                    placeholder={unitIsLbs ? '175' : '80.0'}
                    placeholderTextColor={tokens.text.muted}
                    maxLength={5}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  <Text style={styles.miniUnit}>{weightUnitStr}</Text>
                </View>
              </View>
            </View>

            <TactileButton
              variant="custom"
              haptic="success"
              loading={saving}
              spinnerColor={tokens.accent.onPrimary}
              style={[styles.primaryActionBtn, saving && { opacity: 0.7 }]}
              onPress={handleSaveWeight}
              disabled={saving}
            >
              <Text style={styles.primaryActionBtnText}>Save Weigh-In</Text>
            </TactileButton>

            {recentLogs.length > 0 && (
              <View style={[styles.fieldCard, { paddingVertical: SPACE.sm }]}>
                <Text style={[styles.inputCardLabel, { marginBottom: 4 }]}>RECENT LOGS</Text>
                {recentLogs.map((item, idx) => {
                  const val = Number(item.weightKg ?? item.weight);
                  const isLast = idx === recentLogs.length - 1;
                  return (
                    <View
                      key={item.date}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 8,
                        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                        borderBottomColor: tokens.border.subtle,
                      }}
                    >
                      <NumericText style={{ fontFamily: FONT_FAMILY.medium, fontSize: 13, color: tokens.text.secondary }}>
                        {item.date}
                      </NumericText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <NumericText style={{ fontFamily: FONT_FAMILY.bold, fontSize: 13.5, color: tokens.text.primary }}>
                          {formatWeight(val, unitIsLbs, 1)}
                        </NumericText>
                        <TactileButton
                          variant="icon"
                          haptic="light"
                          onPress={() => handleDeleteWeightEntry(item.date)}
                          hitSlop={TOUCH.hitSlop}
                          accessibilityLabel={`Delete weigh-in from ${item.date}`}
                        >
                          <Trash2 size={14} strokeWidth={ICON.strokeWidth} color={tokens.text.muted} />
                        </TactileButton>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {activeTab === 'photo' && (
          <View style={styles.contentSection}>
            {photoUri ? (
              <View style={styles.imagePreviewCard}>
                <ExpoImage
                  source={{ uri: photoUri }}
                  style={styles.previewImage}
                  contentFit="cover"
                  transition={120}
                  cachePolicy="memory-disk"
                />
                <TactileButton
                  variant="custom"
                  style={styles.removeImageBtn}
                  onPress={() => setPhotoUri(null)}
                  hitSlop={TOUCH.hitSlop}
                  accessibilityLabel="Remove selected photo"
                >
                  <Trash2 size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.status.danger} />
                </TactileButton>
              </View>
            ) : (
              <View style={styles.photoPickerOptions}>
                <TactileButton
                  variant="custom"
                  style={styles.pickerOptionCard}
                  onPress={handleTakePhoto}
                >
                  <View style={styles.pickerIconWrap}>
                    <Camera size={ICON.lg} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
                  </View>
                  <Text style={styles.pickerOptionTitle}>Take Photo</Text>
                  <Text style={styles.pickerOptionSub}>Open Camera</Text>
                </TactileButton>

                <TactileButton
                  variant="custom"
                  style={styles.pickerOptionCard}
                  onPress={handlePickPhoto}
                >
                  <View style={styles.pickerIconWrap}>
                    <ImageIcon size={ICON.lg} strokeWidth={ICON.strokeWidth} color={tokens.status.info} />
                  </View>
                  <Text style={styles.pickerOptionTitle}>Choose Library</Text>
                  <Text style={styles.pickerOptionSub}>From Photos</Text>
                </TactileButton>
              </View>
            )}

            <View style={styles.fieldCard}>
              <Text style={styles.fieldTitle}>Check-In Pose Angle</Text>
              <View style={styles.posePillsRow}>
                {(['front', 'side', 'back'] as const).map(p => {
                  const isSel = selectedPose === p;
                  return (
                    <TactileButton
                      key={p}
                      variant="custom"
                      haptic="selection"
                      style={[styles.posePill, isSel && styles.posePillActive]}
                      onPress={() => setSelectedPose(p)}
                    >
                      <Text style={[styles.posePillText, isSel && styles.posePillTextActive]}>
                        {p.toUpperCase()}
                      </Text>
                    </TactileButton>
                  );
                })}
              </View>
            </View>

            <TactileButton
              variant="custom"
              haptic="success"
              loading={saving}
              spinnerColor={tokens.accent.onPrimary}
              style={[
                styles.primaryActionBtn,
                (!photoUri || saving) && { opacity: 0.5 },
              ]}
              onPress={handleSavePhoto}
              disabled={!photoUri || saving}
            >
              <Text style={styles.primaryActionBtnText}>Save Check-In Photo</Text>
            </TactileButton>
          </View>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const makeStyles = (tokens: ThemeTokens) => StyleSheet.create({
  container: {
    paddingBottom: SPACE.xxl + SPACE.xs,
    gap: SPACE.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACE.xs,
  },
  sheetTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.lg,
    color: tokens.text.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.inner,
    backgroundColor: tokens.bg.surface,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: tokens.bg.surface,
    borderRadius: RADIUS.inner,
    padding: 3,
    gap: SPACE.xs,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs + 2,
    minHeight: TOUCH.minTarget - 10,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.sm,
  },
  tabBtnActive: {
    backgroundColor: tokens.accent.primary,
  },
  tabBtnText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: tokens.fontSize.sm,
    color: tokens.text.secondary,
  },
  tabBtnTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.onPrimary,
  },
  contentSection: {
    gap: SPACE.md + 2,
  },
  weightInputCard: {
    backgroundColor: tokens.bg.surface,
    borderRadius: RADIUS.card,
    padding: SPACE.lg + 4,
    alignItems: 'center',
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  inputCardLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.xs,
    color: tokens.text.secondary,
    letterSpacing: 0.5,
    marginBottom: SPACE.sm,
  },
  weightStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: SPACE.sm,
  },
  nudgeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: tokens.isDark ? 'rgba(255,255,255,0.07)' : tokens.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACE.xs + 2,
  },
  largeWeightInput: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 40,
    color: tokens.text.primary,
    minWidth: 100,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  largeUnitText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: tokens.fontSize.xl,
    color: tokens.text.secondary,
  },
  bmiPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginTop: SPACE.sm + 2,
  },
  bmiPreviewText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: tokens.fontSize.xs,
    color: tokens.text.secondary,
  },
  bmiBadge: {
    paddingHorizontal: SPACE.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm - 2,
  },
  bmiBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.xs,
  },
  fieldCard: {
    backgroundColor: tokens.bg.surface,
    borderRadius: RADIUS.card,
    padding: SPACE.md + 2,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.md,
    color: tokens.text.primary,
  },
  fieldSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: tokens.fontSize.xs,
    color: tokens.text.secondary,
    marginTop: 2,
  },
  miniInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.bg.elevated,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACE.sm + 2,
    paddingVertical: SPACE.xs + 2,
    gap: SPACE.xs,
  },
  miniInput: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.md,
    color: tokens.text.primary,
    width: 48,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  miniUnit: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: tokens.fontSize.xs,
    color: tokens.text.secondary,
  },
  photoPickerOptions: {
    flexDirection: 'row',
    gap: SPACE.md,
  },
  pickerOptionCard: {
    flex: 1,
    backgroundColor: tokens.bg.surface,
    borderRadius: RADIUS.card,
    padding: SPACE.lg + 4,
    alignItems: 'center',
    gap: SPACE.xs + 2,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  pickerIconWrap: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.full,
    backgroundColor: tokens.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.xs,
  },
  pickerOptionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.md,
    color: tokens.text.primary,
  },
  pickerOptionSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: tokens.fontSize.xs,
    color: tokens.text.secondary,
  },
  imagePreviewCard: {
    height: 190,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: tokens.bg.surface,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: SPACE.sm + 2,
    right: SPACE.sm + 2,
    backgroundColor: tokens.bg.overlay,
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posePillsRow: {
    flexDirection: 'row',
    gap: SPACE.sm,
    marginTop: SPACE.sm + 2,
  },
  posePill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    paddingVertical: SPACE.xs + 2,
    backgroundColor: tokens.bg.elevated,
    borderRadius: RADIUS.sm,
  },
  posePillActive: {
    backgroundColor: tokens.accent.primary,
  },
  posePillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.xs,
    color: tokens.text.secondary,
  },
  posePillTextActive: {
    color: tokens.accent.onPrimary,
  },
  primaryActionBtn: {
    backgroundColor: tokens.accent.primary,
    minHeight: 44,
    paddingVertical: SPACE.sm + 2,
    borderRadius: RADIUS.inner,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACE.xs + 2,
  },
  primaryActionBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.base,
    color: tokens.accent.onPrimary,
  },
});
