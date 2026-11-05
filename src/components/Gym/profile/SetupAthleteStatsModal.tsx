/**
 * SetupAthleteStatsModal.tsx — ZenFit
 *
 * Compact, single-screen Athlete Physical Stats setup sheet:
 * - 100% visible in one view without any scrolling
 * - Auto-fetches latest bodyweight from the Weight Tracker
 * - Gmail avatar and verified display name
 * - Fully keyboard-friendly
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '../../ui/UserAvatar';
import { FONT_FAMILY } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { hapticSelection, hapticSuccess, hapticMedium } from '../../../utils/haptics';
import { GymProfile } from '../../../types/gym.types';

interface SetupAthleteStatsModalProps {
  visible: boolean;
  onClose: () => void;
  currentProfile?: GymProfile | null;
  latestWeight?: number | null;
  userAuth?: { displayName?: string | null; photoURL?: string | null; email?: string | null };
  onSaveSuccess: (updated: { heightCm: number; weightKg: number; goal: string }) => void;
}

const GOAL_OPTIONS = [
  { id: 'hypertrophy', label: 'Hypertrophy', desc: 'Growth' },
  { id: 'strength', label: 'Strength', desc: '1RM Power' },
  { id: 'fat_loss', label: 'Fat Loss', desc: 'Lean' },
  { id: 'athletic', label: 'Athletic', desc: 'Speed' },
];

export const SetupAthleteStatsModal: React.FC<SetupAthleteStatsModalProps> = ({
  visible,
  onClose,
  currentProfile,
  latestWeight,
  userAuth,
  onSaveSuccess,
}) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [heightText, setHeightText] = useState('');
  const [weightText, setWeightText] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string>('hypertrophy');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (currentProfile?.heightCm) {
        setHeightText(String(currentProfile.heightCm));
      }
      const w = latestWeight || currentProfile?.weightKg || currentProfile?.bodyweightKg;
      if (w && w > 0) {
        setWeightText(String(Math.round(w * 10) / 10));
      }
      setSelectedGoal(currentProfile?.goal || currentProfile?.primaryGoal || 'hypertrophy');
    }
  }, [visible, currentProfile, latestWeight]);

  const displayName =
    userAuth?.displayName?.trim() ||
    currentProfile?.displayName?.trim() ||
    (userAuth?.email ? userAuth.email.split('@')[0] : 'Athlete');
  const photoURL = userAuth?.photoURL || currentProfile?.photoURL || null;

  const handleGenerate = async () => {
    const h = parseFloat(heightText.trim());
    const w = parseFloat(weightText.trim());

    if (isNaN(h) || h < 100 || h > 250) {
      Alert.alert('Height Required', 'Please enter a valid height in cm (e.g. 178 cm).');
      return;
    }
    if (isNaN(w) || w < 30 || w > 300) {
      Alert.alert('Weight Required', 'Please enter your current bodyweight in kg (e.g. 75 kg).');
      return;
    }

    hapticMedium();
    setSaving(true);
    try {
      hapticSuccess();
      onSaveSuccess({
        heightCm: Math.round(h),
        weightKg: Math.round(w * 10) / 10,
        goal: selectedGoal,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const isWeightAutoFetched = Boolean(latestWeight && latestWeight > 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                paddingBottom: Math.max(insets.bottom + 12, 22),
              },
            ]}
          >
            {/* Top Handle Bar */}
            <View style={styles.handleBar} />

            {/* Inline Profile Header (Saves vertical space, zero cutoff) */}
            <View style={styles.headerRow}>
              <View style={styles.avatarHalo}>
                <UserAvatar
                  size={40}
                  photoURL={photoURL}
                  fallbackLetter={displayName.slice(0, 1).toUpperCase()}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.nameText, { color: isDark ? '#FFFFFF' : '#000000' }]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.subText}>
                  Set physical stats to unlock official Athlete Card
                </Text>
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={16} color={isDark ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
            </View>

            {/* Physical Stats Input Row */}
            <View style={styles.inputsRow}>
              {/* Height Input */}
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>HEIGHT (CM)</Text>
                <View style={[styles.inputBox, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                  <Ionicons name="resize-outline" size={15} color="#8E8E93" style={{ marginRight: 6 }} />
                  <TextInput
                    value={heightText}
                    onChangeText={setHeightText}
                    placeholder="e.g. 178"
                    placeholderTextColor="#8E8E93"
                    keyboardType="numeric"
                    style={[styles.textInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
                    maxLength={5}
                    returnKeyType="next"
                  />
                  <Text style={styles.unitTag}>cm</Text>
                </View>
              </View>

              {/* Weight Input */}
              <View style={styles.inputCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={styles.inputLabel}>BODYWEIGHT</Text>
                  {isWeightAutoFetched && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Ionicons name="checkmark-circle" size={11} color="#30D158" />
                      <Text style={{ fontFamily: FONT_FAMILY.semibold, fontSize: 9.5, color: '#30D158' }}>
                        Tracked
                      </Text>
                    </View>
                  )}
                </View>
                <View style={[styles.inputBox, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                  <Ionicons name="scale-outline" size={15} color="#8E8E93" style={{ marginRight: 6 }} />
                  <TextInput
                    value={weightText}
                    onChangeText={setWeightText}
                    placeholder="e.g. 75"
                    placeholderTextColor="#8E8E93"
                    keyboardType="numeric"
                    style={[styles.textInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
                    maxLength={5}
                    returnKeyType="done"
                    onSubmitEditing={handleGenerate}
                  />
                  <Text style={styles.unitTag}>kg</Text>
                </View>
              </View>
            </View>

            {/* Goal Selector */}
            <View style={styles.sectionBlock}>
              <Text style={styles.inputLabel}>PRIMARY TRAINING FOCUS</Text>
              <View style={styles.goalsGrid}>
                {GOAL_OPTIONS.map((g) => {
                  const isSelected = selectedGoal === g.id;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => {
                        hapticSelection();
                        setSelectedGoal(g.id);
                      }}
                      style={[
                        styles.goalCard,
                        { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
                        isSelected && styles.goalCardActive,
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.goalTitle,
                          { color: isDark ? '#FFFFFF' : '#000000' },
                          isSelected && { color: '#0A84FF' },
                        ]}
                      >
                        {g.label}
                      </Text>
                      <Text style={styles.goalDesc}>{g.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

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
                onPress={handleGenerate}
                disabled={saving}
                style={styles.saveBtn}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="sparkles" size={15} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Generate Athlete Card</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
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
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8E8E93',
    alignSelf: 'center',
    marginBottom: 10,
    opacity: 0.5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarHalo: {
    padding: 2,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#0A84FF',
  },
  nameText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15.5,
    letterSpacing: -0.2,
  },
  subText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#8E8E93',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 42,
  },
  textInput: {
    flex: 1,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
  },
  unitTag: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 11,
    color: '#8E8E93',
  },
  sectionBlock: {
    marginBottom: 14,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalCard: {
    width: '48.5%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  goalCardActive: {
    borderColor: '#0A84FF',
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
  },
  goalTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    marginBottom: 1,
  },
  goalDesc: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 9.5,
    color: '#8E8E93',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 13.5,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#0A84FF',
    paddingVertical: 12,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
});
