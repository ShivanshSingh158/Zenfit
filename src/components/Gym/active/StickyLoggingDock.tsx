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
import { FONT_FAMILY } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { hapticLight, hapticMedium, hapticSelection } from '../../../utils/haptics';

export interface StickyLoggingDockProps {
  activeSetNumber: number;
  activeWeight: number;
  activeReps: number;
  selectedRir: number;
  isAllComplete: boolean;
  isLastExercise: boolean;
  isTimerEnabled?: boolean;
  onToggleTimer?: () => void;
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
  isTimerEnabled = true,
  onToggleTimer,
  onSelectRir,
  onQuickAdjustRep,
  onLogSetAndRest,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

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
    <View style={[
      dockStyles.container,
      {
        paddingBottom: Math.max(insets.bottom, 12),
        backgroundColor: isDark ? '#000000' : colors.surface,
        borderTopColor: isDark ? '#2C2C2E' : colors.border,
      },
    ]}>
      {!isAllComplete ? (
        <>
          {/* Row 1: RIR Effort Quick-Selector */}
          <View style={dockStyles.rirRow}>
            <Text style={dockStyles.rirLabel}>
              Set {activeSetNumber} Effort:
            </Text>

            <View style={[dockStyles.rirPillsContainer, !isDark && { backgroundColor: colors.surface2 }]}>
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
            <View style={[dockStyles.stepperBox, !isDark && { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => handleRepStep(-1)}
                style={dockStyles.stepperBtn}
                activeOpacity={0.65}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 2 }}
              >
                <Text style={[dockStyles.stepperBtnText, !isDark && { color: colors.textPrimary }]}>−1</Text>
              </TouchableOpacity>

              <View style={dockStyles.stepperDivider} />

              <TouchableOpacity
                onPress={() => handleRepStep(+1)}
                style={dockStyles.stepperBtn}
                activeOpacity={0.65}
                hitSlop={{ top: 6, bottom: 6, left: 2, right: 6 }}
              >
                <Text style={[dockStyles.stepperBtnText, !isDark && { color: colors.textPrimary }]}>+1</Text>
              </TouchableOpacity>
            </View>

            {/* Main Log Button with Prescription Echo */}
            <TouchableOpacity
              onPress={handleLogTap}
              style={[dockStyles.logBtn, !isDark && { backgroundColor: "#000000" }]}
              activeOpacity={0.8}
            >
              <View style={dockStyles.logBtnInner}>
                <View style={dockStyles.logBtnTextWrap}>
                  <Text style={[dockStyles.logBtnTitle, !isDark && { color: "#FFFFFF" }]}>
                    {isTimerEnabled
                      ? `✓ Log Set ${activeSetNumber} & Start Rest`
                      : `✓ Log Set ${activeSetNumber}`}
                  </Text>
                  <Text style={[dockStyles.logBtnSubtitle, !isDark && { color: "rgba(255, 255, 255, 0.7)" }]}>
                    {activeWeight > 0 ? `${activeWeight} kg` : 'BW'} × {activeReps} reps · RIR {selectedRir}
                  </Text>
                </View>
                {onToggleTimer ? (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      hapticLight();
                      onToggleTimer();
                    }}
                    style={[
                      dockStyles.stopwatchWrap,
                      !isTimerEnabled && dockStyles.stopwatchWrapDisabled,
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.65}
                  >
                    <Ionicons
                      name={isTimerEnabled ? 'stopwatch' : 'stopwatch-outline'}
                      size={16}
                      color={isTimerEnabled ? '#000000' : 'rgba(0, 0, 0, 0.28)'}
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={[dockStyles.stopwatchWrap, !isTimerEnabled && dockStyles.stopwatchWrapDisabled]}>
                    <Ionicons
                      name={isTimerEnabled ? 'stopwatch' : 'stopwatch-outline'}
                      size={16}
                      color={isTimerEnabled ? '#000000' : 'rgba(0, 0, 0, 0.28)'}
                    />
                  </View>
                )}
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
    backgroundColor: '#000000',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2C2C2E',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  rirRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rirLabel: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
    letterSpacing: -0.2,
  },
  rirPillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 999,
    padding: 2.5,
  },
  rirPill: {
    paddingHorizontal: 12,
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 999,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 2,
  },
  stepperBtn: {
    width: 42,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  stepperDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  logBtn: {
    flex: 1,
    height: 50,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingLeft: 18,
    paddingRight: 12,
  },
  logBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logBtnTextWrap: {
    justifyContent: 'center',
    flex: 1,
    paddingRight: 8,
  },
  logBtnTitle: {
    fontSize: 13.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
    letterSpacing: -0.2,
  },
  logBtnSubtitle: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.medium,
    color: 'rgba(0, 0, 0, 0.60)',
    marginTop: 1,
  },
  stopwatchWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopwatchWrapDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  allCompleteBtn: {
    backgroundColor: '#30D158',
    paddingRight: 18,
  },
  allCompleteBtnText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
    letterSpacing: -0.2,
  },
});

export default StickyLoggingDock;
