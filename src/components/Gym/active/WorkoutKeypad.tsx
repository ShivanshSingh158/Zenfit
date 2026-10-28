/**
 * WorkoutKeypad.tsx — ZenFit Modern 4-Column Smart Lifter Keypad
 *
 * Implements the World-Class Lifter Ergonomics:
 * 1. 36px Dynamic Contextual Strip:
 *    - Weight mode: Equipment-aware steppers (±step), Plate Calculator trigger, and Next ->
 *    - Reps mode: ±1 Rep steppers, Compact RIR selector pill, and ✓ LOG
 * 2. 4-Column Compact Grid (~216px total height):
 *    Row 1: [ 1 ] [ 2 ] [ 3 ] [ ⌫ ]
 *    Row 2: [ 4 ] [ 5 ] [ 6 ] [ Next → ]
 *    Row 3: [ 7 ] [ 8 ] [ 9 ] [          ]
 *    Row 4: [ . ] [ 0 ] [ ⌨️↓ ] [  ✓ LOG   ] (spans 2 rows)
 * 3. Tactile haptic feedback, safe area handling, and zero lag.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT_FAMILY } from '../../../theme/tokens';
import { hapticLight, hapticMedium, hapticSelection, hapticSuccess } from '../../../utils/haptics';

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
  onOpenPlateCalculator?: () => void;
  onDismiss: () => void;
}

const RIR_OPTIONS = [
  { val: 0, label: '0 RIR (Max)' },
  { val: 1, label: '1 RIR' },
  { val: 2, label: '2 RIR' },
  { val: 3, label: '3+ RIR' },
];

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
  onOpenPlateCalculator,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const [showRirMenu, setShowRirMenu] = useState(false);
  const isWeight = field === 'weight';

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

  const handleStepPlus = () => {
    hapticLight();
    onStepAdjust(isWeight ? stepSize : 1);
  };

  const handleStepMinus = () => {
    hapticLight();
    onStepAdjust(isWeight ? -stepSize : -1);
  };

  const handleLogTap = () => {
    hapticSuccess();
    onNextOrComplete();
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {/* ── 1. 36px DYNAMIC CONTEXTUAL ACCESSORY STRIP ── */}
      <View style={styles.accessoryBar}>
        {/* Left: Quick Steppers adapted to focused field */}
        <View style={styles.stepperGroup}>
          <TouchableOpacity
            onPress={handleStepMinus}
            style={styles.stepBtn}
            activeOpacity={0.65}
          >
            <Text style={styles.stepBtnText}>
              {isWeight ? `−${stepSize}` : '−1'}
            </Text>
          </TouchableOpacity>

          <View style={styles.stepperDivider} />

          <TouchableOpacity
            onPress={handleStepPlus}
            style={styles.stepBtn}
            activeOpacity={0.65}
          >
            <Text style={styles.stepBtnText}>
              {isWeight ? `+${stepSize}` : '+1'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Center: Contextual Tool (Plate Calculator in Weight, RIR Pill in Reps) */}
        {isWeight ? (
          onOpenPlateCalculator && (
            <TouchableOpacity
              onPress={() => {
                hapticSelection();
                onOpenPlateCalculator();
              }}
              style={styles.toolChip}
              activeOpacity={0.7}
            >
              <Ionicons name="disc-outline" size={13} color="#a599ff" />
              <Text style={styles.toolChipText}>Plates</Text>
            </TouchableOpacity>
          )
        ) : (
          onSelectRir && (
            <TouchableOpacity
              onPress={() => {
                hapticSelection();
                setShowRirMenu(true);
              }}
              style={styles.toolChip}
              activeOpacity={0.7}
            >
              <Text style={styles.toolChipText}>
                {selectedRir === 0 ? '0 RIR (Max)' : `${selectedRir} RIR`}
              </Text>
              <Ionicons name="chevron-down" size={11} color="#a599ff" />
            </TouchableOpacity>
          )
        )}

        {/* Right: Field Switcher Indicator */}
        <TouchableOpacity
          onPress={() => {
            hapticSelection();
            onSelectField(isWeight ? 'reps' : 'weight');
          }}
          style={styles.fieldToggleBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.fieldToggleLabel}>
            {isWeight ? 'KG' : 'REPS'}
          </Text>
          <Ionicons name="swap-horizontal" size={12} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      {/* ── 2. 4-COLUMN COMPACT NUMPAD GRID (~216px height) ── */}
      <View style={styles.gridContainer}>
        {/* Main 3x4 Number Columns */}
        <View style={styles.numColumns}>
          {/* Row 1: 1, 2, 3 */}
          <View style={styles.keyRow}>
            <TouchableOpacity onPress={() => handleKeyTap('1')} style={styles.numKey} activeOpacity={0.65}>
              <Text style={styles.numKeyText}>1</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleKeyTap('2')} style={styles.numKey} activeOpacity={0.65}>
              <Text style={styles.numKeyText}>2</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleKeyTap('3')} style={styles.numKey} activeOpacity={0.65}>
              <Text style={styles.numKeyText}>3</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2: 4, 5, 6 */}
          <View style={styles.keyRow}>
            <TouchableOpacity onPress={() => handleKeyTap('4')} style={styles.numKey} activeOpacity={0.65}>
              <Text style={styles.numKeyText}>4</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleKeyTap('5')} style={styles.numKey} activeOpacity={0.65}>
              <Text style={styles.numKeyText}>5</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleKeyTap('6')} style={styles.numKey} activeOpacity={0.65}>
              <Text style={styles.numKeyText}>6</Text>
            </TouchableOpacity>
          </View>

          {/* Row 3: 7, 8, 9 */}
          <View style={styles.keyRow}>
            <TouchableOpacity onPress={() => handleKeyTap('7')} style={styles.numKey} activeOpacity={0.65}>
              <Text style={styles.numKeyText}>7</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleKeyTap('8')} style={styles.numKey} activeOpacity={0.65}>
              <Text style={styles.numKeyText}>8</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleKeyTap('9')} style={styles.numKey} activeOpacity={0.65}>
              <Text style={styles.numKeyText}>9</Text>
            </TouchableOpacity>
          </View>

          {/* Row 4: . (decimal), 0, Dismiss */}
          <View style={styles.keyRow}>
            <TouchableOpacity
              onPress={() => handleKeyTap('.')}
              style={styles.numKey}
              activeOpacity={0.65}
              disabled={!isWeight}
            >
              <Text style={[styles.numKeyText, !isWeight && { color: 'rgba(255,255,255,0.15)' }]}>
                {isWeight ? '.' : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleKeyTap('0')} style={styles.numKey} activeOpacity={0.65}>
              <Text style={styles.numKeyText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                hapticSelection();
                onDismiss();
              }}
              style={styles.numKey}
              activeOpacity={0.65}
            >
              <MaterialCommunityIcons name="keyboard-close" size={22} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 4th Column: Action Keys [ ⌫ ] [ Next → ] [ ✓ LOG (spans 2 rows) ] */}
        <View style={styles.actionColumn}>
          {/* Row 1 Action: Backspace */}
          <TouchableOpacity
            onPress={handleBackspaceTap}
            onLongPress={handleClearLongPress}
            style={styles.actionKeyTop}
            activeOpacity={0.65}
          >
            <Ionicons name="backspace-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Row 2 Action: Next -> (advances from kg to reps or next field) */}
          <TouchableOpacity
            onPress={() => {
              hapticSelection();
              if (isWeight) {
                onSelectField('reps');
              } else {
                onSelectField('weight');
              }
            }}
            style={styles.actionKeyTop}
            activeOpacity={0.65}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text style={styles.nextKeyText}>{isWeight ? 'Reps' : 'Next'}</Text>
              <Ionicons name="arrow-forward" size={14} color="#a599ff" />
            </View>
          </TouchableOpacity>

          {/* Rows 3 & 4 Action: Giant 2-Row [ ✓ LOG ] Target */}
          <TouchableOpacity
            onPress={handleLogTap}
            style={styles.logKeyDouble}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={26} color="#FFFFFF" />
            <Text style={styles.logKeyText}>LOG</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* RIR Selection Modal Bottom Sheet */}
      {showRirMenu && onSelectRir && (
        <Modal
          visible={showRirMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowRirMenu(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowRirMenu(false)}
          >
            <View style={styles.rirMenuSheet}>
              <Text style={styles.rirMenuTitle}>Reps in Reserve (Fatigue Level)</Text>
              {RIR_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={`menu-rir-${opt.val}`}
                  style={[
                    styles.rirMenuItem,
                    selectedRir === opt.val && styles.rirMenuItemActive,
                  ]}
                  onPress={() => {
                    hapticSelection();
                    onSelectRir(opt.val);
                    setShowRirMenu(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.rirMenuItemText,
                      selectedRir === opt.val && styles.rirMenuItemTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {selectedRir === opt.val && (
                    <Ionicons name="checkmark" size={16} color="#a599ff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
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
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    borderRadius: 8,
    backgroundColor: '#242428',
    paddingHorizontal: 2,
  },
  stepBtn: {
    paddingHorizontal: 10,
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
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(165, 153, 255, 0.25)',
  },
  toolChipText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#a599ff',
  },
  fieldToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#242428',
  },
  fieldToggleLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  gridContainer: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 6,
  },
  numColumns: {
    flex: 3,
    gap: 6,
  },
  actionColumn: {
    flex: 1,
    gap: 6,
  },
  keyRow: {
    flexDirection: 'row',
    gap: 6,
  },
  numKey: {
    flex: 1,
    height: 48,
    backgroundColor: '#242428',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numKeyText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 22,
    color: '#FFFFFF',
  },
  actionKeyTop: {
    height: 48,
    backgroundColor: '#2C2C32',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextKeyText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#a599ff',
  },
  logKeyDouble: {
    flex: 1,
    backgroundColor: '#22C55E',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  logKeyText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  rirMenuSheet: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1E1E24',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  rirMenuTitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    marginBottom: 4,
    textAlign: 'center',
  },
  rirMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  rirMenuItemActive: {
    backgroundColor: 'rgba(165, 153, 255, 0.14)',
  },
  rirMenuItemText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.medium,
    color: '#FFFFFF',
  },
  rirMenuItemTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#a599ff',
  },
});

export default WorkoutKeypad;
