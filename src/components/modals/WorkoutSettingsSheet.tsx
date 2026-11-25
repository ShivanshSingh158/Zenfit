import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, X } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { hapticSelection, hapticLight } from '../../utils/haptics';
import { AppBottomSheet } from '../ui/AppBottomSheet';
import { TactileButton } from '../ui/TactileButton';
import { NumericText } from '../ui/NumericText';
import { AppIcon } from '../ui/AppIcon';

export interface WorkoutSettingsSheetProps {
  visible: boolean;
  defaultRestSecs: number;
  autoTimerEnabled: boolean;
  soundEnabled: boolean;
  keepAwakeEnabled: boolean;
  onSelectDefaultRest: (secs: number) => void;
  onToggleAutoTimer: (enabled: boolean) => void;
  onToggleSound: (enabled: boolean) => void;
  onToggleKeepAwake: (enabled: boolean) => void;
  onClose: () => void;
}

const PRESET_DURATIONS = [
  { secs: 60, label: '1:00' },
  { secs: 90, label: '1:30' },
  { secs: 120, label: '2:00' },
  { secs: 180, label: '3:00' },
];

export const WorkoutSettingsSheet: React.FC<WorkoutSettingsSheetProps> = ({
  visible,
  defaultRestSecs,
  autoTimerEnabled,
  soundEnabled,
  keepAwakeEnabled,
  onSelectDefaultRest,
  onToggleAutoTimer,
  onToggleSound,
  onToggleKeepAwake,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const cardBg = isDark ? '#14161D' : '#FFFFFF';
  const pillBg = isDark ? '#181B24' : tokens.bg.elevated;

  return (
    <AppBottomSheet visible={visible} onClose={onClose} noPadding>
      <View
        style={{
          paddingHorizontal: tokens.space.lg,
          paddingBottom: Math.max(insets.bottom, tokens.space.xl),
          paddingTop: tokens.space.sm,
        }}
      >
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: tokens.accent.primary,
                  borderRadius: tokens.radius.inner,
                },
              ]}
            >
              <AppIcon icon={Settings} size={18} color={tokens.accent.onPrimary} />
            </View>
            <Text style={[tokens.typography.h2, { color: tokens.text.primary }]}>
              Workout settings
            </Text>
          </View>
          <TactileButton
            variant="icon"
            size="sm"
            onPress={onClose}
            accessibilityLabel="Close workout settings"
          >
            <AppIcon icon={X} size={16} color={tokens.text.secondary} />
          </TactileButton>
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: cardBg,
              borderRadius: tokens.radius.card,
              padding: tokens.space.md,
              borderColor: tokens.border.subtle,
            },
          ]}
        >
          <Text
            style={[
              tokens.typography.overline,
              { color: tokens.text.secondary, marginBottom: tokens.space.md },
            ]}
          >
            DEFAULT REST DURATION
          </Text>
          <View style={styles.presetsRow}>
            {PRESET_DURATIONS.map((p) => {
              const isSelected = defaultRestSecs === p.secs;
              return (
                <TactileButton
                  key={p.secs}
                  variant="custom"
                  haptic="selection"
                  onPress={() => {
                    onSelectDefaultRest(p.secs);
                  }}
                  style={[
                    styles.presetPill,
                    {
                      borderRadius: tokens.radius.inner,
                      backgroundColor: isSelected
                        ? tokens.accent.primaryDim
                        : pillBg,
                      borderColor: isSelected
                        ? tokens.accent.primary
                        : tokens.border.subtle,
                    },
                  ]}
                >
                  <NumericText
                    style={{
                      fontSize: 15,
                      fontFamily: isSelected ? tokens.font.bold : tokens.font.medium,
                      color: isSelected ? tokens.accent.primary : tokens.text.primary,
                    }}
                  >
                    {p.label}
                  </NumericText>
                </TactileButton>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: cardBg,
              borderRadius: tokens.radius.card,
              padding: tokens.space.md,
              borderColor: tokens.border.subtle,
            },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={[tokens.typography.label, { color: tokens.text.primary }]}>
                Auto-start rest timer
              </Text>
              <Text style={[tokens.typography.caption, { color: tokens.text.secondary, marginTop: 2 }]}>
                Starts countdown automatically when a set is checked off
              </Text>
            </View>
            <Switch
              value={autoTimerEnabled}
              onValueChange={(val) => {
                hapticLight();
                onToggleAutoTimer(val);
              }}
              trackColor={{ false: pillBg, true: tokens.accent.primary }}
              thumbColor={tokens.text.primary}
              accessibilityLabel="Auto-start rest timer toggle"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: tokens.border.subtle }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={[tokens.typography.label, { color: tokens.text.primary }]}>
                Rest chime & countdown cues
              </Text>
              <Text style={[tokens.typography.caption, { color: tokens.text.secondary, marginTop: 2 }]}>
                Play audio tones and synthesized rest alert
              </Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={(val) => {
                hapticLight();
                onToggleSound(val);
              }}
              trackColor={{ false: pillBg, true: tokens.accent.primary }}
              thumbColor={tokens.text.primary}
              accessibilityLabel="Rest chime and countdown cues toggle"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: tokens.border.subtle }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={[tokens.typography.label, { color: tokens.text.primary }]}>
                Keep screen awake
              </Text>
              <Text style={[tokens.typography.caption, { color: tokens.text.secondary, marginTop: 2 }]}>
                Prevent display from sleeping during workout
              </Text>
            </View>
            <Switch
              value={keepAwakeEnabled}
              onValueChange={(val) => {
                hapticLight();
                onToggleKeepAwake(val);
              }}
              trackColor={{ false: pillBg, true: tokens.accent.primary }}
              thumbColor={tokens.text.primary}
              accessibilityLabel="Keep screen awake during workout toggle"
            />
          </View>
        </View>

        <TactileButton variant="primary" size="lg" onPress={onClose}>
          <Text style={[tokens.typography.label, { fontFamily: tokens.font.bold, color: tokens.accent.onPrimary }]}>
            Done
          </Text>
        </TactileButton>
      </View>
    </AppBottomSheet>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetPill: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
});

export default WorkoutSettingsSheet;
