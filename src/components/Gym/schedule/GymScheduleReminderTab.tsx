import React from 'react';
import { View, Text, Switch, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FONT_FAMILY, RADIUS, SPACE, TOUCH } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { TactileButton } from '../../ui/TactileButton';
import { NumericText } from '../../ui/NumericText';

export interface GymScheduleReminderTabProps {
  notifEnabled: boolean;
  setNotifEnabled: (v: boolean) => void;
  notifTime: Date;
  setNotifTime: (d: Date) => void;
  showPickerNotif: boolean;
  setShowPickerNotif: (v: boolean) => void;
  onSave: () => void;
  formatTime: (d: Date) => string;
  styles: any;
  colors: any;
}

export const GymScheduleReminderTab: React.FC<GymScheduleReminderTabProps> = React.memo(({
  notifEnabled,
  setNotifEnabled,
  notifTime,
  setNotifTime,
  showPickerNotif,
  setShowPickerNotif,
  onSave,
  formatTime,
  styles,
  colors,
}) => {
  const { tokens } = useTheme();

  return (
    <>
      <Text style={styles.description}>
        Get a notification on workout days before your scheduled session.
      </Text>

      <View style={styles.settingRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.settingLabel}>Workout Alerts</Text>
          <Text style={styles.settingSub}>Send notification on active training days</Text>
        </View>
        <Switch
          value={notifEnabled}
          onValueChange={setNotifEnabled}
          trackColor={{ false: tokens.border.medium, true: tokens.accent.primary }}
          thumbColor={
            Platform.OS === 'android'
              ? notifEnabled
                ? tokens.accent.onPrimary
                : tokens.text.secondary
              : undefined
          }
          ios_backgroundColor={tokens.border.medium}
          accessibilityLabel="Toggle workout alerts"
        />
      </View>

      {notifEnabled && (
        <View style={styles.settingRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.settingLabel}>Alert Time</Text>
            <Text style={styles.settingSub}>Daily notification time</Text>
          </View>
          <TactileButton
            variant="custom"
            haptic="light"
            onPress={() => setShowPickerNotif(true)}
            hitSlop={TOUCH.hitSlop}
            style={{
              backgroundColor: 'rgba(10, 132, 255, 0.14)',
              minHeight: 34,
              paddingHorizontal: 14,
              justifyContent: 'center',
              borderRadius: RADIUS.inner,
            }}
          >
            <NumericText style={{ color: colors.accentPrimary, fontFamily: FONT_FAMILY.bold, fontSize: 13 }}>
              {formatTime(notifTime)}
            </NumericText>
          </TactileButton>
        </View>
      )}

      {showPickerNotif && (
        <>
          <DateTimePicker
            value={notifTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              if (Platform.OS === 'android') {
                setShowPickerNotif(false);
              }
              if (event.type === 'dismissed' || !selectedDate) return;
              setNotifTime(selectedDate);
            }}
          />
          {Platform.OS === 'ios' && (
            <TactileButton
              variant="custom"
              haptic="light"
              onPress={() => setShowPickerNotif(false)}
              style={{ alignSelf: 'flex-end', minHeight: 32, justifyContent: 'center', paddingHorizontal: SPACE.md }}
            >
              <Text style={{ color: tokens.accent.secondary, fontFamily: FONT_FAMILY.bold, fontSize: 13 }}>Done</Text>
            </TactileButton>
          )}
        </>
      )}

      <View style={{ height: 18 }} />
      <TactileButton variant="custom" haptic="light" style={styles.saveBtn} onPress={onSave}>
        <Text style={styles.saveBtnText}>Save Alerts</Text>
      </TactileButton>
    </>
  );
});

export default GymScheduleReminderTab;
