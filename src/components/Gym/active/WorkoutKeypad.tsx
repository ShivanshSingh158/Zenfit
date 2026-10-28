/**
 * WorkoutKeypad.tsx — ZenFit In-App Custom Numeric Keypad & Typing Area
 * Built for ultra-fast, zero-lag workout logging (Hevy & Lyfta style).
 * Mode 2 Precision Editing with:
 * - Accessory bar showing current Set & Field, plus quick ±step buttons.
 * - Integrated RIR quick-selector strip.
 * - Tactile 4x4 keypad grid with Backspace, +, -, and Blue Next / Complete.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT_FAMILY } from '../../../theme/tokens';
import { hapticLight, hapticMedium, hapticSelection } from '../../../utils/haptics';

export interface WorkoutKeypadProps {
  visible: boolean;
  field: 'weight' | 'reps';
  currentWeight: string;
  currentReps: string;
  setNumber?: number;
  stepSize?: number;
  selectedRir?: number;
  unit?: string;
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onStepAdjust: (delta: number) => void;
  onSelectField: (field: 'weight' | 'reps') => void;
  onSelectRir?: (rir: number) => void;
  onNextOrComplete: () => void;
  onDismiss: () => void;
}

export const WorkoutKeypad: React.FC<WorkoutKeypadProps> = React.memo(({
  visible,
  field,
  currentWeight,
  currentReps,
  setNumber = 1,
  stepSize = 2.5,
  selectedRir = 1,
  unit = 'kg',
  onKeyPress,
  onBackspace,
  onClear,
  onStepAdjust,
  onSelectField,
  onSelectRir,
  onNextOrComplete,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const isWeight = field === 'weight';
  const effectiveStep = isWeight ? stepSize : 1;

  if (!visible) return null;

  const handleKeyTap = (k: string) => {
    hapticLight();
    onKeyPress(k);
  };

  const handleBackspaceTap = () => {
    hapticMedium();
    onBackspace();
  };

  const handleClearLongPress = () => {
    hapticSelection();
    onClear();
  };

  const handlePlus = () => {
    hapticLight();
    onStepAdjust(isWeight ? 2.5 : 1);
  };

  const handleMinus = () => {
    hapticLight();
    onStepAdjust(isWeight ? -2.5 : -1);
  };

  return (
    <View style={[keypadStyles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {/* ── Accessory Bar: Set Info + Quick Step Adjustment + Done ── */}
      <View style={keypadStyles.accessoryBar}>
        <View style={keypadStyles.accessoryLeft}>
          <View style={keypadStyles.setNumberBadge}>
            <Text style={keypadStyles.setNumberBadgeText}>SET {setNumber}</Text>
          </View>

          <TouchableOpacity
            onPress={() => onSelectField(isWeight ? 'reps' : 'weight')}
            style={keypadStyles.fieldSwitchBtn}
            activeOpacity={0.7}
          >
            <Text style={keypadStyles.fieldSwitchText}>
              {isWeight ? 'Weight' : 'Reps'}
            </Text>
            <Ionicons name="swap-horizontal" size={13} color="#8E8E93" style={{ marginLeft: 3 }} />
          </TouchableOpacity>
        </View>

        {/* Quick Stepper: Unified Capsule */}
        <View style={keypadStyles.stepperBox}>
          <TouchableOpacity
            onPress={handleMinus}
            style={keypadStyles.stepBtn}
            activeOpacity={0.65}
          >
            <Text style={keypadStyles.stepBtnText}>
              {isWeight ? '−2.5 kg' : '−1'}
            </Text>
          </TouchableOpacity>

          <View style={keypadStyles.stepperDivider} />

          <TouchableOpacity
            onPress={handlePlus}
            style={keypadStyles.stepBtn}
            activeOpacity={0.65}
          >
            <Text style={keypadStyles.stepBtnText}>
              {isWeight ? '+2.5 kg' : '+1'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onDismiss} style={keypadStyles.doneBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={keypadStyles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* ── Effort (RIR) Selector Strip ── */}
      {onSelectRir && (
        <View style={keypadStyles.rirStrip}>
          <Text style={keypadStyles.rirStripLabel}>RIR</Text>
          <View style={keypadStyles.rirTrack}>
            {[0, 1, 2, 3].map((r) => {
              const isSelected = selectedRir === r;
              return (
                <TouchableOpacity
                  key={`keypad-rir-${r}`}
                  onPress={() => {
                    hapticSelection();
                    onSelectRir(r);
                  }}
                  style={[keypadStyles.rirPill, isSelected && keypadStyles.rirPillActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[keypadStyles.rirPillText, isSelected && keypadStyles.rirPillTextActive]}>
                    {r === 0 ? '0 Max' : r === 3 ? '3+' : String(r)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Tactile 4x4 Keypad Grid ── */}
      <View style={keypadStyles.keysContainer}>
        {/* Row 1: 1, 2, 3, Dismiss */}
        <View style={keypadStyles.keyRow}>
          <TouchableOpacity onPress={() => handleKeyTap('1')} style={keypadStyles.numKey} activeOpacity={0.65}>
            <Text style={keypadStyles.numKeyText}>1</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleKeyTap('2')} style={keypadStyles.numKey} activeOpacity={0.65}>
            <Text style={keypadStyles.numKeyText}>2</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleKeyTap('3')} style={keypadStyles.numKey} activeOpacity={0.65}>
            <Text style={keypadStyles.numKeyText}>3</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              hapticSelection();
              onDismiss();
            }}
            style={keypadStyles.numKey}
            activeOpacity={0.65}
          >
            <MaterialCommunityIcons name="keyboard-close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Row 2: 4, 5, 6, + */}
        <View style={keypadStyles.keyRow}>
          <TouchableOpacity onPress={() => handleKeyTap('4')} style={keypadStyles.numKey} activeOpacity={0.65}>
            <Text style={keypadStyles.numKeyText}>4</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleKeyTap('5')} style={keypadStyles.numKey} activeOpacity={0.65}>
            <Text style={keypadStyles.numKeyText}>5</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleKeyTap('6')} style={keypadStyles.numKey} activeOpacity={0.65}>
            <Text style={keypadStyles.numKeyText}>6</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePlus} style={keypadStyles.numKey} activeOpacity={0.65}>
            <Text style={keypadStyles.signKeyText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Row 3: 7, 8, 9, - */}
        <View style={keypadStyles.keyRow}>
          <TouchableOpacity onPress={() => handleKeyTap('7')} style={keypadStyles.numKey} activeOpacity={0.65}>
            <Text style={keypadStyles.numKeyText}>7</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleKeyTap('8')} style={keypadStyles.numKey} activeOpacity={0.65}>
            <Text style={keypadStyles.numKeyText}>8</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleKeyTap('9')} style={keypadStyles.numKey} activeOpacity={0.65}>
            <Text style={keypadStyles.numKeyText}>9</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMinus} style={keypadStyles.numKey} activeOpacity={0.65}>
            <Text style={keypadStyles.signKeyText}>−</Text>
          </TouchableOpacity>
        </View>

        {/* Row 4: . (decimal), 0, Backspace, Blue Next Arrow */}
        <View style={keypadStyles.keyRow}>
          <TouchableOpacity
            onPress={() => handleKeyTap('.')}
            style={keypadStyles.numKey}
            activeOpacity={0.65}
            disabled={!isWeight}
          >
            <Text style={[keypadStyles.numKeyText, !isWeight && { color: 'rgba(255,255,255,0.2)' }]}>
              {isWeight ? '.' : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleKeyTap('0')} style={keypadStyles.numKey} activeOpacity={0.65}>
            <Text style={keypadStyles.numKeyText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleBackspaceTap}
            onLongPress={handleClearLongPress}
            style={keypadStyles.numKey}
            activeOpacity={0.65}
          >
            <Ionicons name="backspace-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onNextOrComplete}
            style={keypadStyles.blueNextKey}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-forward" size={26} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const keypadStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#121216',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 16,
  },
  accessoryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  accessoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setNumberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#2C2C2E',
  },
  setNumberBadgeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.4,
  },
  fieldSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#2C2C2E',
  },
  fieldSwitchText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    borderRadius: 999,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 2,
  },
  stepBtn: {
    paddingHorizontal: 9,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  stepperDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  doneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  doneBtnText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  rirStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  rirStripLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: -0.2,
  },
  rirTrack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 999,
    padding: 2.5,
  },
  rirPill: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rirPillActive: {
    backgroundColor: '#FFFFFF',
  },
  rirPillText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  rirPillTextActive: {
    color: '#000000',
    fontFamily: FONT_FAMILY.bold,
  },
  keysContainer: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  numKey: {
    flex: 1,
    height: 50,
    backgroundColor: '#28282C',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numKeyText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 24,
    color: '#FFFFFF',
  },
  signKeyText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 26,
    color: '#FFFFFF',
  },
  blueNextKey: {
    flex: 1,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
});

export default WorkoutKeypad;
