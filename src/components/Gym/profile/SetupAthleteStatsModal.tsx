/**
 * SetupAthleteStatsModal.tsx — ZenFit
 *
 * Unified Obsidian Physical Stats & Goal setup sheet (unit-aware KG/LBS, zero Alert.alert).
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, CheckCircle2, Ruler, Scale, Sparkles, User, X } from 'lucide-react-native';
import { UserAvatar } from '../../ui/UserAvatar';
import { NumericText, TactileButton } from '../../ui';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { GymProfile } from '../../../types/gym.types';
import BottomSheet from '../../ui/BottomSheet';
import { useWeightUnit, kgToDisplay, displayToKg, unitLabel } from '../../../utils/weightUnit';

interface SetupAthleteStatsModalProps {
  visible: boolean;
  onClose: () => void;
  currentProfile?: GymProfile | null;
  latestWeight?: number | null;
  userAuth?: { uid?: string | null; displayName?: string | null; photoURL?: string | null; email?: string | null };
  onSaveSuccess: (updated: { displayName?: string; heightCm: number; weightKg: number; goal: string }) => void;
}

const GOAL_OPTIONS = [
  { id: 'hypertrophy', label: 'Hypertrophy', desc: 'Muscle growth' },
  { id: 'strength', label: 'Strength', desc: 'Heavy compounds' },
  { id: 'fat_loss', label: 'Fat Loss', desc: 'Lean cut' },
  { id: 'athletic', label: 'Athletic', desc: 'Power & speed' },
];

export const SetupAthleteStatsModal: React.FC<SetupAthleteStatsModalProps> = ({
  visible,
  onClose,
  currentProfile,
  latestWeight,
  userAuth,
  onSaveSuccess,
}) => {
  const { tokens, isDark } = useTheme();
  const unitIsLbs = useWeightUnit();
  const uLabel = unitLabel(unitIsLbs);
  const styles = useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);
  const insets = useSafeAreaInsets();

  const [nameText, setNameText] = useState('');
  const [heightText, setHeightText] = useState('');
  const [weightText, setWeightText] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string>('hypertrophy');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initialName =
    currentProfile?.displayName?.trim() ||
    userAuth?.displayName?.trim() ||
    (userAuth?.email ? userAuth.email.split('@')[0] : 'Athlete');

  const wasVisibleRef = useRef(false);
  useEffect(() => {
    const justOpened = visible && !wasVisibleRef.current;
    wasVisibleRef.current = visible;
    if (!justOpened) return;

    setErrorMsg(null);
    setNameText(initialName);
    setHeightText(currentProfile?.heightCm ? String(Math.round(currentProfile.heightCm)) : '');
    const wKg = latestWeight || currentProfile?.weightKg || currentProfile?.bodyweightKg;
    setWeightText(wKg && wKg > 0 ? String(kgToDisplay(wKg, unitIsLbs, 1)) : '');
    const rawGoal = String(currentProfile?.goal || currentProfile?.primaryGoal || 'hypertrophy')
      .split(',')[0]
      .trim();
    const matchedGoal = GOAL_OPTIONS.some((g) => g.id === rawGoal) ? rawGoal : 'hypertrophy';
    setSelectedGoal(matchedGoal);
  }, [visible, currentProfile, latestWeight, unitIsLbs, initialName]);

  const photoURL = userAuth?.photoURL || currentProfile?.photoURL || null;

  const handleSave = async () => {
    setErrorMsg(null);
    const h = parseFloat(heightText.trim());
    const wDisplay = parseFloat(weightText.trim());

    if (isNaN(h) || h < 100 || h > 250) {
      setErrorMsg('Enter a valid height between 100 and 250 cm.');
      return;
    }

    const minW = unitIsLbs ? 66 : 30;
    const maxW = unitIsLbs ? 660 : 300;
    if (isNaN(wDisplay) || wDisplay < minW || wDisplay > maxW) {
      setErrorMsg(`Enter a valid weight between ${minW} and ${maxW} ${uLabel}.`);
      return;
    }

    const canonicalKg = Math.round(displayToKg(wDisplay, unitIsLbs) * 10) / 10;
    const cleanedName = nameText.trim();

    setSaving(true);
    try {
      onSaveSuccess({
        ...(cleanedName ? { displayName: cleanedName } : {}),
        heightCm: Math.round(h),
        weightKg: canonicalKg,
        goal: selectedGoal,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const isWeightAutoFetched = Boolean(latestWeight && latestWeight > 0);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      avoidKeyboard={true}
      scrollable={true}
    >
      <View style={{ paddingBottom: Math.max(insets.bottom, SPACE.sm) }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.avatarHalo}>
            <UserAvatar
              size={40}
              uid={userAuth?.uid || currentProfile?.userId}
              photoURL={photoURL}
              fallbackLetter={(nameText || initialName).slice(0, 1).toUpperCase()}
            />
          </View>

          <View style={{ flex: 1, marginLeft: SPACE.sm + 2 }}>
            <Text style={styles.titleText}>Athlete Profile & Stats</Text>
            <Text style={styles.subText}>Used for strength ratios, BMI & tier rank</Text>
          </View>

          <TactileButton
            variant="custom"
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel="Close stats setup"
          >
            <X size={16} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
          </TactileButton>
        </View>

        {/* Inline Validation Feedback */}
        {errorMsg && (
          <View style={styles.errorBanner}>
            <AlertCircle size={15} color={tokens.status.danger} strokeWidth={ICON.strokeWidth} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Display Name Input */}
        <View style={styles.nameSection}>
          <Text style={styles.inputLabel}>ATHLETE NAME</Text>
          <View style={styles.inputBox}>
            <User size={15} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} style={{ marginRight: 8 }} />
            <TextInput
              value={nameText}
              onChangeText={(t) => {
                setNameText(t);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Your name"
              placeholderTextColor={tokens.text.muted}
              maxFontSizeMultiplier={1.25}
              style={styles.textInput}
              maxLength={32}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Height & Weight */}
        <View style={styles.inputsRow}>
          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>HEIGHT (CM)</Text>
            <View style={styles.inputBox}>
              <Ruler size={15} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} style={{ marginRight: 8 }} />
              <TextInput
                value={heightText}
                onChangeText={(t) => {
                  setHeightText(t);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="178"
                placeholderTextColor={tokens.text.muted}
                keyboardType="numeric"
                maxFontSizeMultiplier={1.25}
                style={styles.textInput}
                maxLength={5}
                returnKeyType="next"
              />
              <Text style={styles.unitTag}>cm</Text>
            </View>
          </View>

          <View style={styles.inputCol}>
            <View style={styles.weightLabelRow}>
              <Text style={[styles.inputLabel, { marginBottom: 0 }]}>WEIGHT ({uLabel.toUpperCase()})</Text>
              {isWeightAutoFetched && (
                <View style={styles.trackedWrap}>
                  <CheckCircle2 size={11} strokeWidth={ICON.strokeWidth} color={tokens.status.success} />
                  <Text style={styles.trackedBadgeText}>Synced</Text>
                </View>
              )}
            </View>
            <View style={styles.inputBox}>
              <Scale size={15} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} style={{ marginRight: 8 }} />
              <TextInput
                value={weightText}
                onChangeText={(t) => {
                  setWeightText(t);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder={unitIsLbs ? '165' : '75'}
                placeholderTextColor={tokens.text.muted}
                keyboardType="numeric"
                maxFontSizeMultiplier={1.25}
                style={styles.textInput}
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
              <Text style={styles.unitTag}>{uLabel}</Text>
            </View>
          </View>
        </View>

        {/* Training Goal */}
        <View style={styles.sectionBlock}>
          <Text style={styles.inputLabel}>PRIMARY TRAINING FOCUS</Text>
          <View style={styles.goalsGrid}>
            {GOAL_OPTIONS.map((g) => {
              const isSelected = selectedGoal === g.id;
              return (
                <TactileButton
                  key={g.id}
                  variant="custom"
                  haptic="selection"
                  onPress={() => setSelectedGoal(g.id)}
                  style={[styles.goalCard, isSelected && styles.goalCardActive]}
                >
                  <Text style={[styles.goalTitle, isSelected && { color: tokens.accent.primary }]}>
                    {g.label}
                  </Text>
                  <Text style={styles.goalDesc}>{g.desc}</Text>
                </TactileButton>
              );
            })}
          </View>
        </View>

        {/* Footer Actions */}
        <View style={styles.actionsRow}>
          <TactileButton
            variant="custom"
            onPress={onClose}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TactileButton>

          <TactileButton
            variant="custom"
            haptic="success"
            loading={saving}
            onPress={handleSave}
            disabled={saving}
            style={styles.saveBtn}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={15} strokeWidth={ICON.strokeWidth} color={tokens.accent.onPrimary} />
              <Text style={styles.saveBtnText}>Save Profile</Text>
            </View>
          </TactileButton>
        </View>
      </View>
    </BottomSheet>
  );
};

const makeStyles = (tokens: ThemeTokens, isDark: boolean) => {
  const cardBg = isDark ? '#14161D' : '#FFFFFF';
  const hairline = isDark ? 'rgba(255, 255, 255, 0.08)' : tokens.border.subtle;

  return StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACE.md,
    },
    avatarHalo: {
      padding: 2,
      borderRadius: RADIUS.full,
      borderWidth: 1.5,
      borderColor: tokens.accent.primary,
    },
    titleText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 16.5,
      color: tokens.text.primary,
      letterSpacing: -0.25,
    },
    subText: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 12,
      color: tokens.text.secondary,
      marginTop: 1,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: RADIUS.full,
      backgroundColor: cardBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: tokens.status.dangerDim,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: SPACE.md,
    },
    errorText: {
      flex: 1,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12.5,
      color: tokens.status.danger,
    },
    nameSection: {
      marginBottom: SPACE.md,
    },
    inputsRow: {
      flexDirection: 'row',
      gap: SPACE.sm + 2,
      marginBottom: SPACE.md,
    },
    inputCol: {
      flex: 1,
      minWidth: 0,
    },
    weightLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 5,
    },
    trackedWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    inputLabel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 10.5,
      color: tokens.text.secondary,
      letterSpacing: 0.7,
      marginBottom: 5,
    },
    trackedBadgeText: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 10,
      color: tokens.status.success,
    },
    inputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: cardBg,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
    },
    textInput: {
      flex: 1,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
      color: tokens.text.primary,
      fontVariant: ['tabular-nums'],
    },
    unitTag: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 12,
      color: tokens.text.secondary,
    },
    sectionBlock: {
      marginBottom: SPACE.md + 4,
    },
    goalsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACE.sm,
    },
    goalCard: {
      width: '48%',
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      backgroundColor: cardBg,
      minHeight: TOUCH.minTarget,
      justifyContent: 'center',
    },
    goalCardActive: {
      borderColor: tokens.accent.primary,
      backgroundColor: isDark ? 'rgba(10, 132, 255, 0.12)' : tokens.accent.primaryDim,
    },
    goalTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 13.5,
      color: tokens.text.primary,
      marginBottom: 1,
    },
    goalDesc: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 11.5,
      color: tokens.text.secondary,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: SPACE.sm + 2,
    },
    cancelBtn: {
      flex: 1,
      minHeight: TOUCH.minTarget,
      borderRadius: 12,
      backgroundColor: cardBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnText: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 14,
      color: tokens.text.primary,
    },
    saveBtn: {
      flex: 2,
      backgroundColor: tokens.accent.primary,
      minHeight: TOUCH.minTarget,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
      color: tokens.accent.onPrimary,
    },
  });
};
