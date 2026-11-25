/**
 * GymScheduleSettingsModal • ZenTrack Mobile
 *
 * Custom 7-day schedule pattern editor (e.g. Tue–Sun with Mon Rest)
 * Pure OLED black Obsidian Cosmos theme with direct time configuration.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Dumbbell, Moon, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import BottomSheet from '../../ui/BottomSheet';
import { TactileButton } from '../../ui/TactileButton';
import { NumericText } from '../../ui/NumericText';
import { IOSSegmentedControl } from '../../ui/IOSSegmentedControl';

import { COLORS, FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH } from '../../../theme/tokens';
import { hapticMedium, hapticLight } from '../../../utils/haptics';
import { useTheme } from '../../../contexts/ThemeContext';
import { UserGymPlanDoc, GymPlanDay } from '../../../types/gym.types';
import { resolvePlanDay } from '../../../data/gymPlan';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GYM_NOTIF_ENABLED_KEY,
  GYM_NOTIF_TIME_KEY,
  scheduleGymNotifications,
  clearScheduleCache,
  requestNotificationPermissions,
} from '../../../services/notifications';

import { SHEET_BG_DARK, SHEET_BG_LIGHT, makeGymScheduleStyles } from './gymScheduleStyles';
import GymScheduleDayCard from './GymScheduleDayCard';
import GymScheduleReminderTab from './GymScheduleReminderTab';

interface Props {
  visible: boolean;
  onClose: () => void;
  userGymPlan: UserGymPlanDoc | null;
  onSaveWeekly: (newCustomDays: Record<number, GymPlanDay>) => Promise<void>;
  currentStartTime?: string;
  currentEndTime?: string;
  onSaveOverride?: (start: string, end: string) => void;
  onNotifSaved?: () => void;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const QUICK_PRESETS = [
  { label: 'Morning', time: '05:30', end: '07:00' },
  { label: 'Afternoon', time: '15:30', end: '17:00' },
  { label: 'Evening', time: '16:30', end: '18:00' },
  { label: 'Night', time: '19:30', end: '21:00' },
];

export function GymScheduleSettingsModal({
  visible,
  onClose,
  userGymPlan,
  onSaveWeekly,
  onNotifSaved,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark, tokens } = useTheme();
  const s = useMemo(() => makeGymScheduleStyles(colors, isDark), [colors, isDark]);

  // --- WEEKLY SCHEDULE STATE ---
  const [localDays, setLocalDays] = useState<Record<number, GymPlanDay>>({});
  const [editingDayIdx, setEditingDayIdx] = useState<number | null>(null);
  const [showPickerWeekly, setShowPickerWeekly] = useState<'start' | 'end' | null>(null);
  const [tempStartTimeWeekly, setTempStartTimeWeekly] = useState<Date>(new Date());
  const [tempEndTimeWeekly, setTempEndTimeWeekly] = useState<Date>(new Date());
  const [modalTab, setModalTab] = useState<'schedule' | 'reminders'>('schedule');
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifTime, setNotifTime] = useState<Date>(new Date());
  const [showPickerNotif, setShowPickerNotif] = useState(false);

  useEffect(() => {
    if (visible) {
      // Init Weekly across all supported split templates (immutable shallow copy)
      const initDays: Record<number, GymPlanDay> = {};
      for (let i = 1; i <= 7; i++) {
        const resolved = resolvePlanDay(userGymPlan, i);
        initDays[i] = { ...resolved, exercises: [...(resolved.exercises || [])] };
      }
      setLocalDays(initDays);
      setEditingDayIdx(null);

      // Load saved notification preferences
      AsyncStorage.getItem(GYM_NOTIF_ENABLED_KEY).then(val => {
        setNotifEnabled(val !== 'false');
      });
      AsyncStorage.getItem(GYM_NOTIF_TIME_KEY).then(timeVal => {
        if (timeVal) {
          const [h, m] = timeVal.split(':').map(Number);
          if (!isNaN(h) && !isNaN(m)) {
            const d = new Date();
            d.setHours(h, m, 0, 0);
            setNotifTime(d);
          }
        }
      });
    }
  }, [visible, userGymPlan]);

  // --- WEEKLY LOGIC ---
  const handleSaveWeekly = async () => {
    hapticMedium();
    await onSaveWeekly(localDays);
    clearScheduleCache();
    if (notifEnabled) {
      await scheduleGymNotifications({
        userGymPlan: { ...(userGymPlan || {}), customDays: localDays } as any,
      });
    }
    onNotifSaved?.();
    onClose();
  };

  const handleSaveReminders = async () => {
    hapticMedium();
    let effectiveEnabled = notifEnabled;
    if (effectiveEnabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        effectiveEnabled = false;
        setNotifEnabled(false);
      }
    }
    await AsyncStorage.setItem(GYM_NOTIF_ENABLED_KEY, effectiveEnabled ? 'true' : 'false');
    const timeStr = `${notifTime.getHours().toString().padStart(2, '0')}:${notifTime.getMinutes().toString().padStart(2, '0')}`;
    await AsyncStorage.setItem(GYM_NOTIF_TIME_KEY, timeStr);
    clearScheduleCache();
    await scheduleGymNotifications({
      userGymPlan,
    });
    onNotifSaved?.();
    onClose();
  };

  const handleDayPressWeekly = (dayIndex: number) => {
    hapticLight();
    setEditingDayIdx(dayIndex);
    const day = localDays[dayIndex];
    const startD = new Date();
    startD.setHours(17, 0, 0, 0);
    if (day?.startTime) {
      const [h, m] = day.startTime.split(':').map(Number);
      if (!isNaN(h)) startD.setHours(h, m, 0, 0);
    }
    const endD = new Date();
    endD.setHours(18, 0, 0, 0);
    if (day?.endTime) {
      const [h, m] = day.endTime.split(':').map(Number);
      if (!isNaN(h)) endD.setHours(h, m, 0, 0);
    } else {
      endD.setHours(startD.getHours() + 1, startD.getMinutes(), 0, 0);
    }
    setTempStartTimeWeekly(startD);
    setTempEndTimeWeekly(endD);
  };

  const saveEditedDayWeekly = () => {
    if (editingDayIdx === null) return;
    hapticLight();
    const startMins = tempStartTimeWeekly.getHours() * 60 + tempStartTimeWeekly.getMinutes();
    let endMins = tempEndTimeWeekly.getHours() * 60 + tempEndTimeWeekly.getMinutes();
    let effectiveEnd = new Date(tempEndTimeWeekly.getTime());
    if (endMins <= startMins) {
      endMins = Math.min(23 * 60 + 59, startMins + 60);
      effectiveEnd = new Date(tempStartTimeWeekly.getTime());
      effectiveEnd.setHours(Math.floor(endMins / 60), endMins % 60, 0, 0);
      setTempEndTimeWeekly(effectiveEnd);
    }
    const startStr = `${tempStartTimeWeekly.getHours().toString().padStart(2, '0')}:${tempStartTimeWeekly.getMinutes().toString().padStart(2, '0')}`;
    const endStr = `${effectiveEnd.getHours().toString().padStart(2, '0')}:${effectiveEnd.getMinutes().toString().padStart(2, '0')}`;
    setLocalDays(prev => ({
      ...prev,
      [editingDayIdx]: { ...prev[editingDayIdx], startTime: startStr, endTime: endStr },
    }));
    setEditingDayIdx(null);
  };

  const clearEditedDayWeekly = () => {
    if (editingDayIdx === null) return;
    hapticLight();
    setLocalDays(prev => {
      const updated = { ...prev[editingDayIdx] };
      delete updated.startTime;
      delete updated.endTime;
      return { ...prev, [editingDayIdx]: updated };
    });
    setEditingDayIdx(null);
  };

  // --- HELPERS ---
  const formatTime = (d: Date | string | undefined) => {
    if (!d) return 'Not Set';
    if (typeof d === 'string') {
      const [hStr, mStr] = d.split(':');
      let h = parseInt(hStr, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${mStr} ${ampm}`;
    }
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      fullHeight={true}
      noPadding={true}
      avoidKeyboard={true}
      sheetBackgroundColor={isDark ? SHEET_BG_DARK : SHEET_BG_LIGHT}
    >
      <View style={[s.card, { height: '100%', maxHeight: '100%', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderWidth: 0, backgroundColor: 'transparent' }]}>
        <View style={{ flex: 1, paddingBottom: Math.max(insets.bottom, 16) }}>
          {/* Header */}
            <View style={s.header}>
              <View style={{ flex: 1, minWidth: 0, paddingRight: SPACE.sm }}>
                <Text style={s.title} numberOfLines={1}>Schedule & Reminders</Text>
                <Text style={{ fontSize: 12, color: tokens.text.secondary, marginTop: 2, fontFamily: FONT_FAMILY.regular }}>
                  Training times and daily workout alerts
                </Text>
              </View>
              <TactileButton
                variant="icon"
                haptic="light"
                onPress={onClose}
                style={s.closeBtn}
                hitSlop={TOUCH.hitSlop}
                accessibilityLabel="Close schedule modal"
              >
                <X size={16} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
              </TactileButton>
            </View>

            {/* Tab Selector */}
            <View style={{ paddingHorizontal: 20, marginTop: SPACE.sm, marginBottom: SPACE.sm }}>
              <IOSSegmentedControl
                segments={[
                  { id: 'schedule', label: 'Training Times' },
                  { id: 'reminders', label: 'Daily Alerts' },
                ]}
                activeId={modalTab}
                onSelect={(id) => setModalTab(id as 'schedule' | 'reminders')}
                height={34}
              />
            </View>

            {/* Content Container */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={s.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {modalTab === 'reminders' ? (
                <GymScheduleReminderTab
                  notifEnabled={notifEnabled}
                  setNotifEnabled={setNotifEnabled}
                  notifTime={notifTime}
                  setNotifTime={setNotifTime}
                  showPickerNotif={showPickerNotif}
                  setShowPickerNotif={setShowPickerNotif}
                  onSave={handleSaveReminders}
                  formatTime={formatTime}
                  styles={s}
                  colors={colors}
                />
              ) : editingDayIdx === null ? (
                <>
                  <Text style={s.description}>
                    Tap any training day to set your preferred workout time.
                  </Text>

                  {DAY_NAMES.map((dayName, idx) => {
                    const dayIndex = idx + 1;
                    const planDay = localDays[dayIndex];
                    if (!planDay) return null;

                    return (
                      <GymScheduleDayCard
                        key={dayIndex}
                        dayName={dayName}
                        dayIndex={dayIndex}
                        planDay={planDay}
                        onPress={handleDayPressWeekly}
                        formatTime={formatTime}
                        styles={s}
                        colors={colors}
                        isDark={isDark}
                      />
                    );
                  })}

                  <View style={{ height: 10 }} />
                  <TactileButton variant="custom" haptic="none" style={s.saveBtn} onPress={handleSaveWeekly}>
                    <Text style={s.saveBtnText}>Save Schedule</Text>
                  </TactileButton>
                </>
              ) : (
                <View style={s.editContainer}>
                  {/* Edit Header */}
                  <View style={s.editHeader}>
                    <TactileButton
                      variant="icon"
                      haptic="light"
                      onPress={() => setEditingDayIdx(null)}
                      style={s.closeBtn}
                      hitSlop={TOUCH.hitSlop}
                      accessibilityLabel="Back to schedule list"
                    >
                      <ChevronLeft size={18} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
                    </TactileButton>
                    <Text style={[s.title, { fontSize: 17, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
                      {DAY_NAMES[editingDayIdx - 1]} Routine
                    </Text>
                    <View style={{ width: 32 }} />
                  </View>

                  {/* Day Type Selector: Workout vs Rest */}
                  <View
                    style={{
                      flexDirection: 'row',
                      backgroundColor: isDark ? '#14161D' : tokens.bg.elevated,
                      borderRadius: RADIUS.lg,
                      padding: SPACE.xs,
                      marginBottom: SPACE.lg,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : tokens.border.subtle,
                    }}
                  >
                    <TactileButton
                      variant="custom"
                      haptic="none"
                      style={{
                        flex: 1,
                        minHeight: 34,
                        flexDirection: 'row',
                        gap: 6,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderRadius: RADIUS.inner,
                        backgroundColor: !localDays[editingDayIdx]?.isRest
                          ? tokens.accent.primary
                          : 'transparent',
                      }}
                      onPress={() => {
                        hapticLight();
                        setLocalDays(prev => {
                          const currentDay = prev[editingDayIdx];
                          let defaultExercises = currentDay?.exercises || [];
                          if (!defaultExercises || defaultExercises.length === 0) {
                            const baseTemplatePlan = userGymPlan ? { ...userGymPlan, customDays: undefined } : null;
                            const templateDay = resolvePlanDay(baseTemplatePlan, editingDayIdx);
                            if (templateDay && !templateDay.isRest && templateDay.exercises?.length > 0) {
                              defaultExercises = [...templateDay.exercises];
                            } else {
                              for (let dIdx = 1; dIdx <= 7; dIdx++) {
                                const sampleDay = resolvePlanDay(baseTemplatePlan, dIdx);
                                if (!sampleDay.isRest && sampleDay.exercises?.length > 0) {
                                  defaultExercises = [...sampleDay.exercises];
                                  break;
                                }
                              }
                            }
                          }
                          return {
                            ...prev,
                            [editingDayIdx]: {
                              ...currentDay,
                              isRest: false,
                              name: (!currentDay?.name || currentDay?.name === 'Rest & Recovery' || currentDay?.name === 'Rest Day') ? 'Workout' : currentDay.name,
                              focus: (!currentDay?.focus || currentDay?.focus === 'Rest & Recovery' || currentDay?.focus.includes('recovery')) ? 'Chest & Back' : currentDay.focus,
                              exercises: defaultExercises,
                            },
                          };
                        });
                      }}
                    >
                      <Dumbbell
                        size={14}
                        color={!localDays[editingDayIdx]?.isRest ? tokens.accent.onPrimary : tokens.text.secondary}
                        strokeWidth={ICON.strokeWidth}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: FONT_FAMILY.bold,
                          color: !localDays[editingDayIdx]?.isRest ? tokens.accent.onPrimary : tokens.text.secondary,
                        }}
                      >
                        Workout Day
                      </Text>
                    </TactileButton>

                    <TactileButton
                      variant="custom"
                      haptic="none"
                      style={{
                        flex: 1,
                        minHeight: 34,
                        flexDirection: 'row',
                        gap: 6,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderRadius: RADIUS.inner,
                        backgroundColor: localDays[editingDayIdx]?.isRest ? tokens.status.warning : 'transparent',
                      }}
                      onPress={() => {
                        hapticLight();
                        setLocalDays(prev => ({
                          ...prev,
                          [editingDayIdx]: {
                            ...prev[editingDayIdx],
                            isRest: true,
                            name: 'Rest & Recovery',
                            focus: 'Rest & Recovery',
                            exercises: [],
                          },
                        }));
                      }}
                    >
                      <Moon
                        size={14}
                        color={localDays[editingDayIdx]?.isRest ? tokens.accent.onPrimary : tokens.text.secondary}
                        strokeWidth={ICON.strokeWidth}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: FONT_FAMILY.bold,
                          color: localDays[editingDayIdx]?.isRest ? tokens.accent.onPrimary : tokens.text.secondary,
                        }}
                      >
                        Rest Day
                      </Text>
                    </TactileButton>
                  </View>

                  {!localDays[editingDayIdx]?.isRest && (
                    <>
                      {/* Quick Presets */}
                      <Text
                        style={{
                          fontSize: 11,
                          fontFamily: FONT_FAMILY.bold,
                          color: tokens.text.muted,
                          letterSpacing: 0.8,
                          marginBottom: SPACE.sm,
                          marginLeft: 2,
                        }}
                      >
                        QUICK TIME PRESETS
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginBottom: SPACE.lg }}>
                        {QUICK_PRESETS.map(p => (
                          <TactileButton
                            key={p.label}
                            variant="custom"
                            haptic="none"
                            style={{
                              flexGrow: 1,
                              flexBasis: '46%',
                              minWidth: 0,
                              minHeight: TOUCH.minTarget,
                              paddingVertical: SPACE.sm,
                              paddingHorizontal: SPACE.sm,
                              borderRadius: RADIUS.inner,
                              backgroundColor: isDark ? '#14161D' : tokens.bg.surface,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: StyleSheet.hairlineWidth,
                              borderColor: isDark ? 'rgba(255,255,255,0.08)' : tokens.border.subtle,
                            }}
                            onPress={() => {
                              hapticLight();
                              const [sh, sm] = p.time.split(':').map(Number);
                              const [eh, em] = p.end.split(':').map(Number);
                              const sD = new Date();
                              sD.setHours(sh, sm, 0, 0);
                              const eD = new Date();
                              eD.setHours(eh, em, 0, 0);
                              setTempStartTimeWeekly(sD);
                              setTempEndTimeWeekly(eD);
                            }}
                          >
                            <Text numberOfLines={1} style={{ fontSize: 10.5, color: tokens.text.secondary, fontFamily: FONT_FAMILY.medium }}>
                              {p.label}
                            </Text>
                            <NumericText numberOfLines={1} style={{ fontSize: 11.5, color: tokens.accent.secondary, fontFamily: FONT_FAMILY.bold, marginTop: 2 }}>
                              {formatTime(p.time)}
                            </NumericText>
                            <NumericText numberOfLines={1} style={{ fontSize: 10, color: tokens.text.muted, marginTop: 1 }}>
                              to {formatTime(p.end)}
                            </NumericText>
                          </TactileButton>
                        ))}
                      </View>

                      {/* Start Time Row */}
                      <View style={s.settingRow}>
                        <View style={{ flex: 1, minWidth: 0, paddingRight: SPACE.sm }}>
                          <Text style={s.settingLabel}>Workout Start Time</Text>
                          <Text style={s.settingSub}>When you enter the gym</Text>
                        </View>
                        <TactileButton
                          variant="custom"
                          haptic="light"
                          onPress={() => setShowPickerWeekly('start')}
                          style={{
                            backgroundColor: tokens.accent.primaryDim,
                            minHeight: 32,
                            paddingHorizontal: 12,
                            justifyContent: 'center',
                            borderRadius: RADIUS.sm,
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(10, 132, 255, 0.28)' : 'rgba(10, 132, 255, 0.22)',
                          }}
                        >
                          <NumericText style={{ color: tokens.accent.primary, fontFamily: FONT_FAMILY.bold, fontSize: 13 }}>
                            {formatTime(tempStartTimeWeekly)}
                          </NumericText>
                        </TactileButton>
                      </View>

                      {/* End Time Row */}
                      <View style={s.settingRow}>
                        <View style={{ flex: 1, minWidth: 0, paddingRight: SPACE.sm }}>
                          <Text style={s.settingLabel}>Workout End Time</Text>
                          <Text style={s.settingSub}>Estimated finish time</Text>
                        </View>
                        <TactileButton
                          variant="custom"
                          haptic="light"
                          onPress={() => setShowPickerWeekly('end')}
                          style={{
                            backgroundColor: tokens.accent.primaryDim,
                            minHeight: 32,
                            paddingHorizontal: 12,
                            justifyContent: 'center',
                            borderRadius: RADIUS.sm,
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(10, 132, 255, 0.28)' : 'rgba(10, 132, 255, 0.22)',
                          }}
                        >
                          <NumericText style={{ color: tokens.accent.primary, fontFamily: FONT_FAMILY.bold, fontSize: 13 }}>
                            {formatTime(tempEndTimeWeekly)}
                          </NumericText>
                        </TactileButton>
                      </View>

                      {showPickerWeekly && (
                        <>
                          <DateTimePicker
                            value={showPickerWeekly === 'start' ? tempStartTimeWeekly : tempEndTimeWeekly}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, selectedDate) => {
                              if (Platform.OS === 'android') {
                                setShowPickerWeekly(null);
                              }
                              if (event.type === 'dismissed' || !selectedDate) return;

                              if (showPickerWeekly === 'start') {
                                setTempStartTimeWeekly(selectedDate);
                                const newEnd = new Date(selectedDate.getTime() + 60 * 60 * 1000);
                                setTempEndTimeWeekly(newEnd);
                              } else {
                                setTempEndTimeWeekly(selectedDate);
                              }
                            }}
                          />
                          {Platform.OS === 'ios' && (
                            <TactileButton
                              variant="custom"
                              haptic="light"
                              onPress={() => setShowPickerWeekly(null)}
                              style={{ alignSelf: 'flex-end', minHeight: 32, justifyContent: 'center', paddingHorizontal: SPACE.md }}
                            >
                              <Text style={{ color: tokens.accent.secondary, fontFamily: FONT_FAMILY.bold, fontSize: 13 }}>Done</Text>
                            </TactileButton>
                          )}
                        </>
                      )}
                    </>
                  )}

                  <View style={{ height: 16 }} />
                  <TactileButton variant="custom" haptic="none" style={s.saveBtn} onPress={saveEditedDayWeekly}>
                    <Text style={s.saveBtnText}>Save Time</Text>
                  </TactileButton>

                  <TactileButton
                    variant="custom"
                    haptic="light"
                    style={{
                      minHeight: 38,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 8,
                    }}
                    onPress={clearEditedDayWeekly}
                  >
                    <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 13.5, color: tokens.text.secondary }}>
                      Remove Time
                    </Text>
                  </TactileButton>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
    </BottomSheet>
  );
}

export default GymScheduleSettingsModal;
