import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Delete,
  Check,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsiveMetrics } from '../../theme/responsive';
import { hapticSelection } from '../../utils/haptics';
import { TactileButton } from '../ui/TactileButton';
import { NumericText } from '../ui/NumericText';
import { AppIcon } from '../ui/AppIcon';

export interface WorkoutKeypadProps {
  visible: boolean;
  field: 'weight' | 'reps';
  currentWeight?: string;
  currentReps?: string;
  setNumber?: number;
  stepSize?: number;
  selectedRir?: number;
  lastSessionWeight?: number | null;
  unit?: string;
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onStepAdjust: (delta: number) => void;
  onQuickFillWeight?: (weight: number) => void;
  onSelectField: (field: 'weight' | 'reps') => void;
  onSelectRir?: (rir: number) => void;
  onNextOrComplete: () => void;
  onDismiss: () => void;
}

const KEYPAD_DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

const DigitKeyCell = React.memo(function DigitKeyCell({
  digit,
  onPressDigit,
  buttonHeight,
  keyBg,
  borderRadius,
  borderColor,
  textColor,
}: {
  digit: string;
  onPressDigit: (digit: string) => void;
  buttonHeight: number;
  keyBg: string;
  borderRadius: number;
  borderColor: string;
  textColor: string;
}) {
  const handlePress = useCallback(() => {
    onPressDigit(digit);
  }, [digit, onPressDigit]);

  return (
    <TactileButton
      lightweight
      variant="custom"
      onPress={handlePress}
      style={[
        styles.numKey,
        {
          minHeight: buttonHeight,
          height: buttonHeight,
          backgroundColor: keyBg,
          borderRadius,
          borderColor,
        },
      ]}
    >
      <NumericText style={[styles.numKeyText, { color: textColor }]}>
        {digit}
      </NumericText>
    </TactileButton>
  );
});

const RIR_OPTIONS = [
  { val: 0, label: '0 (Max)' },
  { val: 1, label: '1' },
  { val: 2, label: '2' },
  { val: 3, label: '3+' },
];

export const WorkoutKeypad: React.FC<WorkoutKeypadProps> = React.memo(
  ({
    visible,
    field,
    stepSize = 2.5,
    selectedRir = 1,
    lastSessionWeight,
    unit,
    onKeyPress,
    onBackspace,
    onClear,
    onStepAdjust,
    onQuickFillWeight,
    onSelectField,
    onSelectRir,
    onNextOrComplete,
    onDismiss,
  }) => {
    const insets = useSafeAreaInsets();
    const { tokens, isDark } = useTheme();
    const {
      isNarrow,
      keypadButtonHeight,
      keypadLogHeight,
      keypadAccessoryHeight,
      maxFontMultiplier,
    } = useResponsiveMetrics();
    const [showRirMenu, setShowRirMenu] = useState(false);
    const isWeight = field === 'weight';

    const handleKeyTap = useCallback(
      (k: string) => {
        onKeyPress(k);
      },
      [onKeyPress]
    );

    const handleBackspaceTap = useCallback(() => {
      onBackspace();
    }, [onBackspace]);

    const handleClearLongPress = useCallback(() => {
      hapticSelection();
      onClear();
    }, [onClear]);

    const handleLogTap = useCallback(() => {
      onNextOrComplete();
    }, [onNextOrComplete]);

    const handleToggleRirMenu = useCallback(() => {
      setShowRirMenu((prev) => !prev);
    }, []);

    const handleCloseRirMenu = useCallback(() => {
      setShowRirMenu(false);
    }, []);

    const handleSelectWeightField = useCallback(() => {
      onSelectField('weight');
    }, [onSelectField]);

    const handleSelectRepsField = useCallback(() => {
      onSelectField('reps');
    }, [onSelectField]);

    const handleToggleField = useCallback(() => {
      onSelectField(isWeight ? 'reps' : 'weight');
    }, [isWeight, onSelectField]);

    if (!visible) return null;

    const trayBg = tokens.isDark ? '#0B0C10' : tokens.bg.canvas;
    const keyBg = tokens.bg.surface;
    const pillBg = tokens.bg.elevated;
    const smallStep = stepSize;
    const largeStep = stepSize === 2.5 ? 5 : stepSize * 2;
    const stepMinW = isNarrow ? 30 : 36;
    const repsStepMinW = isNarrow ? 36 : 42;

    return (
      <View
        style={[
          styles.wrapper,
          {
            paddingBottom: Math.max(insets.bottom, 6),
            backgroundColor: trayBg,
            borderTopColor: tokens.border.subtle,
          },
        ]}
      >
        {/* Compact Fast Accessory Strip */}
        <View
          style={[
            styles.accessoryBar,
            {
              minHeight: keypadAccessoryHeight,
              paddingHorizontal: isNarrow ? 6 : 10,
              gap: isNarrow ? 4 : 8,
              borderBottomColor: tokens.border.subtle,
            },
          ]}
        >
          <View style={styles.leftAccessory}>
            {isWeight ? (
              <View
                style={[
                  styles.stepperGroup,
                  {
                    backgroundColor: pillBg,
                    borderRadius: tokens.radius.inner,
                    borderColor: tokens.border.subtle,
                  },
                ]}
              >
                <TactileButton
                  lightweight
                  variant="custom"
                  onPress={() => onStepAdjust(-largeStep)}
                  style={[styles.stepBtnCompact, { minWidth: stepMinW, paddingHorizontal: isNarrow ? 3 : 6 }]}
                  accessibilityLabel={`Decrease weight by ${largeStep}`}
                >
                  <NumericText style={[styles.stepBtnText, { color: tokens.text.secondary, fontSize: isNarrow ? 11 : 12 }]}>
                    −{largeStep}
                  </NumericText>
                </TactileButton>

                <View style={[styles.stepperDivider, { backgroundColor: tokens.border.subtle }]} />

                <TactileButton
                  lightweight
                  variant="custom"
                  onPress={() => onStepAdjust(-smallStep)}
                  style={[styles.stepBtnCompact, { minWidth: stepMinW, paddingHorizontal: isNarrow ? 3 : 6 }]}
                  accessibilityLabel={`Decrease weight by ${smallStep}`}
                >
                  <NumericText style={[styles.stepBtnText, { color: tokens.text.primary, fontSize: isNarrow ? 11 : 12 }]}>
                    −{smallStep}
                  </NumericText>
                </TactileButton>

                <View style={[styles.stepperDivider, { backgroundColor: tokens.border.subtle }]} />

                <TactileButton
                  lightweight
                  variant="custom"
                  onPress={() => onStepAdjust(smallStep)}
                  style={[styles.stepBtnCompact, { minWidth: stepMinW, paddingHorizontal: isNarrow ? 3 : 6 }]}
                  accessibilityLabel={`Increase weight by ${smallStep}`}
                >
                  <NumericText style={[styles.stepBtnText, { color: tokens.text.primary, fontSize: isNarrow ? 11 : 12 }]}>
                    +{smallStep}
                  </NumericText>
                </TactileButton>

                <View style={[styles.stepperDivider, { backgroundColor: tokens.border.subtle }]} />

                <TactileButton
                  lightweight
                  variant="custom"
                  onPress={() => onStepAdjust(largeStep)}
                  style={[styles.stepBtnCompact, { minWidth: stepMinW, paddingHorizontal: isNarrow ? 3 : 6 }]}
                  accessibilityLabel={`Increase weight by ${largeStep}`}
                >
                  <NumericText style={[styles.stepBtnText, { color: tokens.text.secondary, fontSize: isNarrow ? 11 : 12 }]}>
                    +{largeStep}
                  </NumericText>
                </TactileButton>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: isNarrow ? 4 : 6 }}>
                <View
                  style={[
                    styles.stepperGroup,
                    {
                      backgroundColor: pillBg,
                      borderRadius: tokens.radius.inner,
                      borderColor: tokens.border.subtle,
                    },
                  ]}
                >
                  <TactileButton
                    lightweight
                    variant="custom"
                    onPress={() => onStepAdjust(-1)}
                    style={[styles.stepBtn, { minWidth: repsStepMinW }]}
                    accessibilityLabel="Decrease reps by 1"
                  >
                    <NumericText style={[styles.stepBtnText, { color: tokens.text.primary }]}>
                      −1
                    </NumericText>
                  </TactileButton>

                  <View style={[styles.stepperDivider, { backgroundColor: tokens.border.subtle }]} />

                  <TactileButton
                    lightweight
                    variant="custom"
                    onPress={() => onStepAdjust(1)}
                    style={[styles.stepBtn, { minWidth: repsStepMinW }]}
                    accessibilityLabel="Increase reps by 1"
                  >
                    <NumericText style={[styles.stepBtnText, { color: tokens.text.primary }]}>
                      +1
                    </NumericText>
                  </TactileButton>
                </View>

                {Boolean(onSelectRir) && (
                  <TactileButton
                    lightweight
                    variant="custom"
                    haptic="selection"
                    onPress={handleToggleRirMenu}
                    style={[
                      styles.toolChip,
                      {
                        borderRadius: tokens.radius.inner,
                        backgroundColor: showRirMenu ? tokens.accent.primaryDim : pillBg,
                        borderColor: showRirMenu ? tokens.accent.primary : tokens.border.subtle,
                      },
                    ]}
                  >
                    <NumericText
                      style={[
                        styles.toolChipText,
                        { color: showRirMenu ? tokens.accent.primary : tokens.text.primary },
                      ]}
                    >
                      {selectedRir} RIR
                    </NumericText>
                    <AppIcon
                      icon={showRirMenu ? ChevronUp : ChevronDown}
                      size={12}
                      color={showRirMenu ? tokens.accent.primary : tokens.text.secondary}
                    />
                  </TactileButton>
                )}
              </View>
            )}

            {isWeight && !isNarrow && lastSessionWeight != null && Number(lastSessionWeight) > 0 && onQuickFillWeight && (
              <TactileButton
                lightweight
                variant="custom"
                haptic="selection"
                onPress={() => onQuickFillWeight(Number(lastSessionWeight))}
                style={[
                  styles.lastFillChip,
                  {
                    backgroundColor: tokens.accent.primaryDim,
                    borderRadius: tokens.radius.inner,
                  },
                ]}
              >
                <NumericText style={[styles.lastFillText, { color: tokens.accent.primary }]} numberOfLines={1}>
                  Last {lastSessionWeight}{unit ? ` ${unit}` : ''}
                </NumericText>
              </TactileButton>
            )}
          </View>

          {/* Segmented Weight | Reps Toggle */}
          <View
            style={[
              styles.fieldSegmentWrap,
              {
                backgroundColor: pillBg,
                borderColor: tokens.border.subtle,
                borderRadius: tokens.radius.inner,
              },
            ]}
          >
            <TactileButton
              lightweight
              variant="custom"
              haptic="selection"
              onPress={handleSelectWeightField}
              style={[
                styles.fieldSegPill,
                { borderRadius: tokens.radius.sm, paddingHorizontal: isNarrow ? 7 : 10 },
                isWeight && { backgroundColor: tokens.accent.primary },
              ]}
            >
              <Text
                maxFontSizeMultiplier={maxFontMultiplier}
                style={[
                  styles.fieldSegText,
                  {
                    fontFamily: tokens.font.bold,
                    color: isWeight ? tokens.accent.onPrimary : tokens.text.secondary,
                  },
                ]}
              >
                Weight
              </Text>
            </TactileButton>
            <TactileButton
              lightweight
              variant="custom"
              haptic="selection"
              onPress={handleSelectRepsField}
              style={[
                styles.fieldSegPill,
                { borderRadius: tokens.radius.sm, paddingHorizontal: isNarrow ? 7 : 10 },
                !isWeight && { backgroundColor: tokens.accent.primary },
              ]}
            >
              <Text
                maxFontSizeMultiplier={maxFontMultiplier}
                style={[
                  styles.fieldSegText,
                  {
                    fontFamily: tokens.font.bold,
                    color: !isWeight ? tokens.accent.onPrimary : tokens.text.secondary,
                  },
                ]}
              >
                Reps
              </Text>
            </TactileButton>
          </View>
        </View>

        {/* Inline RIR Selector Strip */}
        {showRirMenu && Boolean(onSelectRir) && (
          <View
            style={[
              styles.rirInlineStrip,
              {
                backgroundColor: pillBg,
                borderBottomColor: tokens.border.subtle,
              },
            ]}
          >
            <Text
              maxFontSizeMultiplier={maxFontMultiplier}
              style={[tokens.typography.overline, { color: tokens.accent.primary }]}
            >
              RIR
            </Text>
            <View style={styles.rirInlinePillsRow}>
              {RIR_OPTIONS.map((opt) => {
                const active = selectedRir === opt.val;
                return (
                  <TactileButton
                    key={`inline-rir-${opt.val}`}
                    lightweight
                    variant="custom"
                    haptic="selection"
                    style={[
                      styles.rirInlinePill,
                      {
                        minHeight: Math.max(38, keypadAccessoryHeight - 2),
                        borderRadius: tokens.radius.inner,
                        backgroundColor: active ? tokens.accent.primary : keyBg,
                        borderColor: active ? tokens.accent.primary : tokens.border.subtle,
                      },
                    ]}
                    onPress={() => {
                      onSelectRir!(opt.val);
                      setShowRirMenu(false);
                    }}
                  >
                    <NumericText
                      style={{
                        fontSize: 12,
                        color: active ? tokens.accent.onPrimary : tokens.text.primary,
                      }}
                    >
                      {opt.label}
                    </NumericText>
                  </TactileButton>
                );
              })}
            </View>
            <TactileButton
              lightweight
              variant="icon"
              onPress={handleCloseRirMenu}
              style={{ borderWidth: 0, backgroundColor: 'transparent' }}
              accessibilityLabel="Close RIR selector"
            >
              <AppIcon icon={X} size={18} color={tokens.text.secondary} />
            </TactileButton>
          </View>
        )}

        {/* 4-Column Responsive Numpad Grid */}
        <View style={[styles.gridContainer, { padding: isNarrow ? 6 : 8, gap: 6 }]}>
          <View style={[styles.numColumns, { gap: 6 }]}>
            {KEYPAD_DIGIT_ROWS.map((row, rIdx) => (
              <View key={`row-${rIdx}`} style={[styles.keyRow, { gap: 6 }]}>
                {row.map((digit) => (
                  <DigitKeyCell
                    key={digit}
                    digit={digit}
                    onPressDigit={handleKeyTap}
                    buttonHeight={keypadButtonHeight}
                    keyBg={keyBg}
                    borderRadius={tokens.radius.inner}
                    borderColor={tokens.border.subtle}
                    textColor={tokens.text.primary}
                  />
                ))}
              </View>
            ))}

            <View style={[styles.keyRow, { gap: 6 }]}>
              <TactileButton
                lightweight
                variant="custom"
                disabled={!isWeight}
                onPress={() => handleKeyTap('.')}
                style={[
                  styles.numKey,
                  {
                    minHeight: keypadButtonHeight,
                    height: keypadButtonHeight,
                    backgroundColor: keyBg,
                    borderRadius: tokens.radius.inner,
                    borderColor: tokens.border.subtle,
                  },
                ]}
              >
                <NumericText
                  style={[
                    styles.numKeyText,
                    { color: isWeight ? tokens.text.primary : tokens.text.muted },
                  ]}
                >
                  {isWeight ? '.' : '—'}
                </NumericText>
              </TactileButton>

              <DigitKeyCell
                digit="0"
                onPressDigit={handleKeyTap}
                buttonHeight={keypadButtonHeight}
                keyBg={keyBg}
                borderRadius={tokens.radius.inner}
                borderColor={tokens.border.subtle}
                textColor={tokens.text.primary}
              />

              <TactileButton
                lightweight
                variant="custom"
                haptic="selection"
                onPress={onDismiss}
                style={[
                  styles.numKey,
                  {
                    minHeight: keypadButtonHeight,
                    height: keypadButtonHeight,
                    backgroundColor: keyBg,
                    borderRadius: tokens.radius.inner,
                    borderColor: tokens.border.subtle,
                  },
                ]}
                accessibilityLabel="Dismiss keypad"
              >
                <AppIcon icon={ChevronDown} size={20} color={tokens.accent.primary} />
              </TactileButton>
            </View>
          </View>

          <View style={[styles.actionColumn, { gap: 6 }]}>
            <TactileButton
              lightweight
              variant="custom"
              haptic="medium"
              onPress={handleBackspaceTap}
              onLongPress={handleClearLongPress}
              style={[
                styles.actionKeyTop,
                {
                  minHeight: keypadButtonHeight,
                  height: keypadButtonHeight,
                  backgroundColor: keyBg,
                  borderRadius: tokens.radius.inner,
                  borderColor: tokens.border.subtle,
                },
              ]}
              accessibilityLabel="Backspace"
            >
              <AppIcon icon={Delete} size={20} color={tokens.text.primary} />
            </TactileButton>

            <TactileButton
              lightweight
              variant="custom"
              haptic="selection"
              onPress={handleToggleField}
              style={[
                styles.actionKeyTop,
                {
                  minHeight: keypadButtonHeight,
                  height: keypadButtonHeight,
                  backgroundColor: keyBg,
                  borderRadius: tokens.radius.inner,
                  borderColor: tokens.border.subtle,
                },
              ]}
            >
              <View style={styles.nextKeyRow}>
                <Text
                  maxFontSizeMultiplier={maxFontMultiplier}
                  style={[tokens.typography.caption, { color: tokens.accent.primary, fontFamily: tokens.font.bold }]}
                >
                  {isWeight ? 'Reps' : 'Weight'}
                </Text>
                <AppIcon icon={ArrowRight} size={13} color={tokens.accent.primary} />
              </View>
            </TactileButton>

            <TactileButton
              lightweight
              variant="primary"
              haptic="success"
              onPress={handleLogTap}
              style={[
                styles.logKeyDouble,
                { minHeight: keypadLogHeight, borderRadius: tokens.radius.inner },
              ]}
            >
              <View style={styles.logKeyInner}>
                <AppIcon icon={Check} size={22} color={tokens.accent.onPrimary} />
                <Text
                  maxFontSizeMultiplier={maxFontMultiplier}
                  style={[
                    tokens.typography.overline,
                    { color: tokens.accent.onPrimary, marginTop: 1 },
                  ]}
                >
                  LOG
                </Text>
              </View>
            </TactileButton>
          </View>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accessoryBar: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftAccessory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexShrink: 1,
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  stepBtn: {
    minWidth: 42,
    minHeight: 36,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnCompact: {
    minWidth: 34,
    minHeight: 36,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 12,
  },
  stepperDivider: {
    width: StyleSheet.hairlineWidth,
    height: 16,
  },
  lastFillChip: {
    minHeight: 36,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
  },
  lastFillText: {
    fontSize: 11.5,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toolChipText: {
    fontSize: 12,
  },
  fieldSegmentWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 36,
  },
  fieldSegPill: {
    minHeight: 32,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldSegText: {
    fontSize: 11.5,
  },
  gridContainer: {
    flexDirection: 'row',
  },
  numColumns: {
    flex: 3,
  },
  actionColumn: {
    flex: 1,
  },
  keyRow: {
    flexDirection: 'row',
  },
  numKey: {
    flex: 1,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  numKeyText: {
    fontSize: 20,
  },
  actionKeyTop: {
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  nextKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  logKeyDouble: {
    flex: 1,
    minHeight: 94,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logKeyInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rirInlineStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  rirInlinePillsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rirInlinePill: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default WorkoutKeypad;
