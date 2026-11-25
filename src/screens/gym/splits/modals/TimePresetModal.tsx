import React from 'react';
import {
  View,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Sun, CloudSun, Sunset, Moon } from 'lucide-react-native';
import BottomSheet from '../../../../components/ui/BottomSheet';
import { TactileButton, NumericText } from '../../../../components/ui';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ICON, SPACE, TOUCH } from '../../../../theme/tokens';
import { GymPlanDay } from '../../../../types/gym.types';
import { hapticLight, hapticSuccess } from '../../../../utils/haptics';
import { useLatestNonNull } from '../../../../hooks/useLatestNonNull';
import { getSplitsPalette, useSplitsStyles } from '../styles/gymSplitsStyles';

export interface TimePreset {
  label: string;
  icon: 'sunny' | 'partly-sunny' | 'sunset' | 'moon' | string;
  time: string;
  end: string;
}

export interface TimePresetModalProps {
  dayIndex: number | null;
  onClose: () => void;
  dayNames: string[];
  resolvedDays: { dayIndex: number; dayName: string; planDay: GymPlanDay }[];
  presets: TimePreset[];
  onSelectTime: (dayIndex: number, startTime: string, endTime: string) => void;
}

export const TimePresetModal: React.FC<TimePresetModalProps> = React.memo(({
  dayIndex,
  onClose,
  dayNames,
  presets,
  onSelectTime,
}) => {
  const { tokens, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useSplitsStyles();
  const palette = getSplitsPalette(tokens, isDark);
  const activeDayIndex = useLatestNonNull(dayIndex);
  if (activeDayIndex === null) return null;

  const renderPresetIcon = (icon: string) => {
    const props = { size: ICON.sm, color: tokens.accent.primary, strokeWidth: ICON.strokeWidth };
    if (icon.includes('sunny') && !icon.includes('partly')) return <Sun {...props} />;
    if (icon.includes('partly')) return <CloudSun {...props} />;
    if (icon.includes('sunset')) return <Sunset {...props} />;
    return <Moon {...props} />;
  };

  return (
    <BottomSheet
      visible={dayIndex !== null}
      onClose={onClose}
      avoidKeyboard={false}
      noPadding={true}
      sheetBackgroundColor={palette.sheetCanvas}
    >
      <View style={[styles.sheetCard, { backgroundColor: 'transparent', width: '100%', borderRadius: 0, borderWidth: 0, paddingHorizontal: SPACE[16], paddingBottom: Math.max(insets.bottom, SPACE[16]) }]}>
        <View style={styles.sheetHeader}>
          <View style={{ flex: 1, paddingRight: SPACE[8] }}>
            <Text style={styles.sheetTitle}>Training Time Slot</Text>
            <Text style={styles.sheetSubtitle}>
              {dayNames[activeDayIndex - 1]} Routine Schedule
            </Text>
          </View>
          <TactileButton
            variant="custom"
            onPress={onClose}
            style={styles.dayModalCloseBtn}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel="Close"
          >
            <X size={16} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
          </TactileButton>
        </View>

        <View style={styles.timePresetsList}>
          {presets.map(preset => (
            <TactileButton
              variant="custom"
              key={`preset-${preset.time}`}
              onPress={() => {
                hapticLight();
                onSelectTime(activeDayIndex, preset.time, preset.end);
                hapticSuccess();
              }}
              style={styles.timePresetRow}
            >
              <View style={styles.timePresetLeft}>
                {renderPresetIcon(preset.icon)}
                <Text style={styles.timePresetLabel}>{preset.label}</Text>
              </View>
              <NumericText style={styles.timePresetValue}>
                {preset.time} – {preset.end}
              </NumericText>
            </TactileButton>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
});

export default TimePresetModal;

