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
import { FONT_FAMILY } from '../../theme/tokens';
import { hapticLight, hapticMedium, hapticSelection } from '../../utils/haptics';

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
    onStepAdjust(effectiveStep);
  };

  const handleMinus = () => {
    hapticLight();
    onStepAdjust(-effectiveStep);
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

        {/* Quick Stepper Buttons */}
        <View style={keypadStyles.stepperPills}>
          <TouchableOpacity
            onPress={handleMinus}
            style={keypadStyles.stepBtn}
            activeOpacity={0.65}
          >
            <Text style={keypadStyles.stepBtnText}>
              −{effectiveStep}{isWeight ? 'k' : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePlus}
            style={[keypadStyles.stepBtn, keypadStyles.stepBtnPlus]}
            activeOpacity={0.65}
          >
            <Text style={[keypadStyles.stepBtnText, { color: '#30D158' }]}>
              +{effectiveStep}{isWeight ? 'k' : ''}
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
          <Text style={keypadStyles.rirStripLabel}>RIR:</Text>
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
            <Ionicons name="arrow-forward" size={26} color="#FFFFFF" />
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
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  accessoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setNumberBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#28282E',
  },
  setNumberBadgeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: '#0A84FF',
    letterSpacing: 0.4,
  },
  fieldSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  fieldSwitchText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  stepperPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#28282E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  stepBtnPlus: {
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    borderColor: 'rgba(48, 209, 88, 0.25)',
  },
  stepBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  doneBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  doneBtnText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: '#0A84FF',
  },
  rirStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  rirStripLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
  },
  rirPill: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: '#28282E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  rirPillActive: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  rirPillText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: '#D1D1D6',
  },
  rirPillTextActive: {
    color: '#FFFFFF',
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
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
});

export default WorkoutKeypad;
