/**
 * SetRestPickerSheet.tsx — ZenFit
 *
 * Custom Rest Timer Picker per Individual Set (Inspired by openGym v1.4.3):
 * Allows athletes to configure bespoke rest durations for heavy top sets (e.g. 180s-240s),
 * standard hypertrophy sets (90s-120s), or quick pump sets (30s-60s).
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILY, RADIUS } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { hapticSelection, hapticLight, hapticMedium } from '../../../utils/haptics';

interface SetRestPickerSheetProps {
  visible: boolean;
  setNumber: number;
  initialRestSecs?: number | null;
  defaultRestSecs: number;
  onSelectRestSecs: (secs: number | null) => void; // null = reset to default
  onClose: () => void;
}

const PRESET_DURATIONS = [
  { secs: 30, label: '30s', desc: 'Pump / Iso' },
  { secs: 45, label: '45s', desc: 'Short rest' },
  { secs: 60, label: '1:00', desc: 'Standard' },
  { secs: 90, label: '1:30', desc: 'Hypertrophy' },
  { secs: 120, label: '2:00', desc: 'Compound' },
  { secs: 180, label: '3:00', desc: 'Heavy Top Set' },
  { secs: 240, label: '4:00', desc: 'Max Effort' },
  { secs: 300, label: '5:00', desc: 'Power / PR' },
];

function formatTime(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const SetRestPickerSheet: React.FC<SetRestPickerSheetProps> = ({
  visible,
  setNumber,
  initialRestSecs,
  defaultRestSecs,
  onSelectRestSecs,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const [selectedSecs, setSelectedSecs] = useState<number>(
    initialRestSecs || defaultRestSecs || 90
  );

  useEffect(() => {
    if (visible) {
      setSelectedSecs(initialRestSecs || defaultRestSecs || 90);
    }
  }, [visible, initialRestSecs, defaultRestSecs]);

  const handleAdjust = (delta: number) => {
    hapticLight();
    setSelectedSecs(prev => Math.max(15, Math.min(600, prev + delta)));
  };

  const handleSelectPreset = (secs: number) => {
    hapticSelection();
    setSelectedSecs(secs);
  };

  const handleSave = () => {
    hapticMedium();
    onSelectRestSecs(selectedSecs);
    onClose();
  };

  const handleResetToDefault = () => {
    hapticLight();
    onSelectRestRestDefault();
  };

  const onSelectRestRestDefault = () => {
    onSelectRestSecs(null);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissOverlay} onPress={onClose} />

        <View style={[styles.sheetCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="timer-outline" size={17} color="#FF9F0A" />
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  Set {setNumber} Rest Timer
                </Text>
              </View>
              <Text style={styles.subtitle}>
                Custom rest countdown triggered upon completing this set
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F2F2F7' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Large Time Display & Stepper Wheel Controls */}
          <View style={[styles.stepperContainer, { backgroundColor: isDark ? '#141416' : '#F2F2F7' }]}>
            <TouchableOpacity
              onPress={() => handleAdjust(-15)}
              style={styles.stepBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>−15s</Text>
            </TouchableOpacity>

            <View style={styles.timeCenterBlock}>
              <Text style={[styles.timeDigits, { color: '#FF9F0A' }]}>
                {formatTime(selectedSecs)}
              </Text>
              <Text style={styles.timeUnitLabel}>
                {selectedSecs} seconds {initialRestSecs === selectedSecs ? '• Custom' : selectedSecs === defaultRestSecs ? '• Default' : ''}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handleAdjust(15)}
              style={styles.stepBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>+15s</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Presets Grid */}
          <Text style={styles.sectionHeading}>POPULAR TARGETS</Text>
          <View style={styles.presetsGrid}>
            {PRESET_DURATIONS.map(p => {
              const isSelected = selectedSecs === p.secs;
              return (
                <TouchableOpacity
                  key={p.secs}
                  onPress={() => handleSelectPreset(p.secs)}
                  style={[
                    styles.presetTile,
                    {
                      backgroundColor: isSelected
                        ? (isDark ? 'rgba(255, 159, 10, 0.22)' : 'rgba(255, 159, 10, 0.15)')
                        : (isDark ? 'rgba(255,255,255,0.05)' : '#F2F2F7'),
                      borderColor: isSelected ? '#FF9F0A' : 'transparent',
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.presetLabel,
                      { color: isSelected ? '#FF9F0A' : colors.textPrimary },
                      isSelected && { fontFamily: FONT_FAMILY.bold },
                    ]}
                  >
                    {p.label}
                  </Text>
                  <Text style={[styles.presetDesc, isSelected && { color: '#FF9F0A' }]}>
                    {p.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Footer */}
          <View style={styles.footerRow}>
            {initialRestSecs != null && (
              <TouchableOpacity
                onPress={handleResetToDefault}
                style={[styles.resetBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E5EA' }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.resetBtnText, { color: colors.textPrimary }]}>
                  Reset ({defaultRestSecs}s)
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.saveBtn,
                { flex: initialRestSecs != null ? 1 : undefined, width: initialRestSecs == null ? '100%' : undefined },
              ]}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark" size={17} color="#000000" />
              <Text style={styles.saveBtnText}>
                Set {formatTime(selectedSecs)} for Set {setNumber}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SetRestPickerSheet;

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
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 34,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: RADIUS.lg,
    marginVertical: 4,
  },
  stepBtn: {
    backgroundColor: 'rgba(142, 142, 147, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  stepBtnText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
  },
  timeCenterBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDigits: {
    fontSize: 32,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.5,
  },
  timeUnitLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 10.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetTile: {
    width: '23%',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  presetLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semibold,
  },
  presetDesc: {
    fontSize: 8.5,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  resetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.semibold,
  },
  saveBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnText: {
    color: '#000000',
    fontSize: 13.5,
    fontFamily: FONT_FAMILY.bold,
  },
});
