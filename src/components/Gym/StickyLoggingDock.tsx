/**
 * StickyLoggingDock.tsx — ZenFit Mobile
 *
 * Fixed Bottom Action Dock for Mode 1 (Browsing / 1-Tap Logging).
 * Anchored above the safe-area bottom:
 * - Effort (RIR) Selector with large tactile touch targets.
 * - Quick ±1 Rep micro-adjuster (handles 90% of variance without opening keypad).
 * - High-contrast Log Set & Start Rest button with prescription echo.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT_FAMILY } from '../../theme/tokens';
import { hapticLight, hapticMedium, hapticSelection } from '../../utils/haptics';

export interface StickyLoggingDockProps {
  activeSetNumber: number;
  activeWeight: number;
  activeReps: number;
  selectedRir: number;
  isAllComplete: boolean;
  isLastExercise: boolean;
  onSelectRir: (rir: number) => void;
  onQuickAdjustRep: (delta: number) => void;
  onLogSetAndRest: () => void;
}

const RIR_OPTIONS = [
  { val: 0, label: '0 Max' },
  { val: 1, label: '1' },
  { val: 2, label: '2' },
  { val: 3, label: '3+' },
];

export const StickyLoggingDock: React.FC<StickyLoggingDockProps> = React.memo(({
  activeSetNumber,
  activeWeight,
  activeReps,
  selectedRir,
  isAllComplete,
  isLastExercise,
  onSelectRir,
  onQuickAdjustRep,
  onLogSetAndRest,
}) => {
  const insets = useSafeAreaInsets();

  const handleRirTap = (rir: number) => {
    hapticSelection();
    onSelectRir(rir);
  };

  const handleRepStep = (delta: number) => {
    hapticLight();
    onQuickAdjustRep(delta);
  };

  const handleLogTap = () => {
    hapticMedium();
    onLogSetAndRest();
  };

  return (
    <View style={[dockStyles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {!isAllComplete ? (
        <>
          {/* Row 1: RIR Effort Quick-Selector */}
          <View style={dockStyles.rirRow}>
            <Text style={dockStyles.rirLabel}>
              Set {activeSetNumber} Effort:
            </Text>

            <View style={dockStyles.rirPillsContainer}>
              {RIR_OPTIONS.map((item) => {
                const isSelected = selectedRir === item.val;
                return (
                  <TouchableOpacity
                    key={`rir-${item.val}`}
                    onPress={() => handleRirTap(item.val)}
                    style={[
                      dockStyles.rirPill,
                      isSelected && dockStyles.rirPillActive,
                    ]}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  >
                    <Text
                      style={[
                        dockStyles.rirPillText,
                        isSelected && dockStyles.rirPillTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Row 2: Action Row (Quick Rep Steppers + Primary Log Button) */}
          <View style={dockStyles.actionRow}>
            {/* Quick Rep Stepper (-1 / +1) */}
            <View style={dockStyles.stepperBox}>
              <TouchableOpacity
                onPress={() => handleRepStep(-1)}
                style={dockStyles.stepperBtn}
                activeOpacity={0.65}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 2 }}
              >
                <Text style={dockStyles.stepperBtnText}>−1</Text>
              </TouchableOpacity>

              <View style={dockStyles.stepperDivider} />

              <TouchableOpacity
                onPress={() => handleRepStep(+1)}
                style={dockStyles.stepperBtn}
                activeOpacity={0.65}
                hitSlop={{ top: 6, bottom: 6, left: 2, right: 6 }}
              >
                <Text style={[dockStyles.stepperBtnText, { color: '#30D158' }]}>+1</Text>
              </TouchableOpacity>
            </View>

            {/* Main Log Button with Prescription Echo */}
            <TouchableOpacity
              onPress={handleLogTap}
              style={dockStyles.logBtn}
              activeOpacity={0.8}
            >
              <View style={dockStyles.logBtnInner}>
                <View style={dockStyles.logBtnTextWrap}>
                  <Text style={dockStyles.logBtnTitle}>
                    ✓ Log Set {activeSetNumber} & Start Rest
                  </Text>
                  <Text style={dockStyles.logBtnSubtitle}>
                    {activeWeight > 0 ? `${activeWeight} kg` : 'BW'} × {activeReps} reps · RIR {selectedRir}
                  </Text>
                </View>
                <Ionicons name="stopwatch-outline" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* All Complete State: Next Exercise / Finish Workout */
        <TouchableOpacity
          onPress={handleLogTap}
          style={[dockStyles.logBtn, dockStyles.allCompleteBtn]}
          activeOpacity={0.8}
        >
          <View style={dockStyles.logBtnInner}>
            <Text style={dockStyles.allCompleteBtnText}>
              {isLastExercise ? 'Finish Workout 🏁' : "Next Exercise →"}
            </Text>
            <Ionicons
              name={isLastExercise ? 'checkmark-circle' : 'arrow-forward'}
              size={20}
              color="#000000"
            />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
});

const dockStyles = StyleSheet.create({
  container: {
    backgroundColor: '#121216',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
  },
  rirRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rirLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: 0.2,
  },
  rirPillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rirPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#24242A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  rirPillActive: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  rirPillText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#D1D1D6',
  },
  rirPillTextActive: {
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#24242A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 2,
  },
  stepperBtn: {
    width: 38,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  stepperDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  logBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0A84FF',
    justifyContent: 'center',
    paddingHorizontal: 14,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  logBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logBtnTextWrap: {
    justifyContent: 'center',
  },
  logBtnTitle: {
    fontSize: 13.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  logBtnSubtitle: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.body,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },
  allCompleteBtn: {
    backgroundColor: '#30D158',
    shadowColor: '#30D158',
  },
  allCompleteBtnText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
    letterSpacing: -0.2,
  },
});

export default StickyLoggingDock;
