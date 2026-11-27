import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, Check, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet from '../../ui/BottomSheet';
import { NumericText, TactileButton } from '../../ui';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';
import {
  AnalyticsRangePreset,
  diffDaysInclusive,
  formatShortDateRange,
} from '../../../services/gymAnalyticsEngine';
import { parseLocalDate, todayStr, toYMD } from '../../../utils/dateCore';
import { hapticLight, hapticSelection, hapticSuccess } from '../../../utils/haptics';

interface AnalyticsRangeSheetProps {
  visible: boolean;
  onClose: () => void;
  activePreset: AnalyticsRangePreset;
  startDate: string;
  endDate: string;
  workoutDates: Set<string>;
  showCycleOption?: boolean;
  hasActiveProgramme?: boolean;
  mode: 'report' | 'consistency' | 'exercises';
  onApplyPreset: (preset: AnalyticsRangePreset) => void;
  onApplyCustomRange: (startDate: string, endDate: string) => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_HDR = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const AnalyticsRangeSheet: React.FC<AnalyticsRangeSheetProps> = React.memo(
  function AnalyticsRangeSheet({
    visible,
    onClose,
    activePreset,
    startDate,
    endDate,
    workoutDates,
    showCycleOption = false,
    hasActiveProgramme = false,
    mode,
    onApplyPreset,
    onApplyCustomRange,
  }) {
    const { tokens, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);
    const today = todayStr();

    const [draftStart, setDraftStart] = useState(startDate);
    const [draftEnd, setDraftEnd] = useState(endDate);
    const [selectingStage, setSelectingStage] = useState<'start' | 'end'>('start');
    const [viewMonthDate, setViewMonthDate] = useState(() => {
      const d = parseLocalDate(endDate || today);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    useEffect(() => {
      if (visible) {
        setDraftStart(startDate);
        setDraftEnd(endDate);
        setSelectingStage('start');
        const d = parseLocalDate(endDate || today);
        setViewMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    }, [visible, startDate, endDate, today]);

    const presets = useMemo(() => {
      if (mode === 'consistency') {
        return [
          { id: '8w' as const, label: '8 Weeks' },
          { id: '12w' as const, label: '12 Weeks' },
          { id: '6m' as const, label: '6 Months' },
          { id: '1y' as const, label: '12 Months' },
          { id: 'all' as const, label: 'All Time' },
        ];
      }
      if (mode === 'exercises') {
        return [
          { id: '4w' as const, label: '1 Month' },
          { id: '12w' as const, label: '3 Months' },
          { id: '6m' as const, label: '6 Months' },
          { id: 'all' as const, label: 'All Time' },
        ];
      }
      const list: Array<{ id: AnalyticsRangePreset; label: string }> = [
        { id: '1w', label: 'This Week' },
        ...(showCycleOption ? [{ id: 'cycle' as const, label: 'Rotation Cycle' }] : []),
        { id: '4w', label: 'Last 4 Weeks' },
        ...(hasActiveProgramme ? [{ id: 'meso' as const, label: 'Active Mesocycle' }] : []),
        { id: '12w', label: '12 Weeks' },
        { id: 'all', label: 'All Time' },
      ];
      return list;
    }, [mode, showCycleOption, hasActiveProgramme]);

    const calendarCells = useMemo(() => {
      const year = viewMonthDate.getFullYear();
      const month = viewMonthDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const leadBlanks = (firstDay.getDay() + 6) % 7;

      const cells: Array<{ dateStr: string | null; dayNum?: number }> = [];
      for (let i = 0; i < leadBlanks; i++) {
        cells.push({ dateStr: null });
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(year, month, d);
        cells.push({ dateStr: toYMD(dt), dayNum: d });
      }
      while (cells.length % 7 !== 0) {
        cells.push({ dateStr: null });
      }
      return cells;
    }, [viewMonthDate]);

    const canAdvanceMonth = useMemo(() => {
      const cur = new Date();
      return (
        viewMonthDate.getFullYear() < cur.getFullYear() ||
        (viewMonthDate.getFullYear() === cur.getFullYear() &&
          viewMonthDate.getMonth() < cur.getMonth())
      );
    }, [viewMonthDate]);

    const normStart = draftStart <= draftEnd ? draftStart : draftEnd;
    const normEnd = draftStart <= draftEnd ? draftEnd : draftStart;
    const matchedCount = useMemo(() => {
      let c = 0;
      workoutDates.forEach(d => {
        if (d >= normStart && d <= normEnd) c++;
      });
      return c;
    }, [workoutDates, normStart, normEnd]);

    const handleDayTap = (dateStr: string) => {
      if (dateStr > today) return;
      hapticSelection();
      if (selectingStage === 'start') {
        setDraftStart(dateStr);
        setDraftEnd(dateStr);
        setSelectingStage('end');
      } else {
        if (dateStr < draftStart) {
          setDraftEnd(draftStart);
          setDraftStart(dateStr);
        } else {
          setDraftEnd(dateStr);
        }
        setSelectingStage('start');
      }
    };

    const spanDays = diffDaysInclusive(normStart, normEnd);

    return (
      <BottomSheet
        visible={visible}
        onClose={onClose}
        noPadding={true}
        fullHeight={false}
        sheetHeight="86%"
        sheetBackgroundColor={isDark ? '#0B0C10' : '#F8F8FA'}
      >
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Select Time Range</Text>
              <Text style={styles.subtitle}>
                Pick a preset window or tap Start & End dates
              </Text>
            </View>
            <TactileButton
              variant="custom"
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={TOUCH.hitSlop}
              accessibilityLabel="Close range selector"
            >
              <X size={16} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
            </TactileButton>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled
          >
            {/* Quick Presets */}
            <Text style={styles.sectionLabel}>QUICK PRESETS</Text>
            <View style={styles.presetsGrid}>
              {presets.map(p => {
                const isSel = activePreset === p.id;
                return (
                  <TactileButton
                    key={p.id}
                    variant="custom"
                    haptic="selection"
                    style={[styles.presetPill, isSel && styles.presetPillActive]}
                    onPress={() => {
                      onApplyPreset(p.id);
                      onClose();
                    }}
                  >
                    <Text style={[styles.presetText, isSel && styles.presetTextActive]}>
                      {p.label}
                    </Text>
                  </TactileButton>
                );
              })}
            </View>

            {/* Custom Calendar Picker */}
            <Text style={[styles.sectionLabel, { marginTop: SPACE.md }]}>CUSTOM CALENDAR</Text>
            <View style={styles.calendarCard}>
              {/* Month Navigation */}
              <View style={styles.calHeader}>
                <TactileButton
                  variant="icon"
                  haptic="none"
                  style={styles.calArrowBtn}
                  onPress={() => {
                    hapticLight();
                    setViewMonthDate(
                      prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                    );
                  }}
                >
                  <ChevronLeft size={16} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
                </TactileButton>

                <Text style={styles.calMonthTitle}>
                  {MONTH_NAMES[viewMonthDate.getMonth()]} {viewMonthDate.getFullYear()}
                </Text>

                <TactileButton
                  variant="icon"
                  haptic="none"
                  disabled={!canAdvanceMonth}
                  style={[styles.calArrowBtn, !canAdvanceMonth && { opacity: 0.3 }]}
                  onPress={() => {
                    if (!canAdvanceMonth) return;
                    hapticLight();
                    setViewMonthDate(
                      prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                    );
                  }}
                >
                  <ChevronRight size={16} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
                </TactileButton>
              </View>

              {/* M..S Column Labels */}
              <View style={styles.weekdayRow}>
                {WEEKDAY_HDR.map((lbl, idx) => (
                  <View key={idx} style={styles.dayCellSlot}>
                    <Text style={styles.weekdayLbl}>{lbl}</Text>
                  </View>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.daysGrid}>
                {calendarCells.map((cell, idx) => {
                  if (!cell.dateStr) {
                    return <View key={`blank-${idx}`} style={styles.dayCellSlot} />;
                  }
                  const ds = cell.dateStr;
                  const isFuture = ds > today;
                  const isStart = ds === normStart;
                  const isEnd = ds === normEnd;
                  const isEndpoint = isStart || isEnd;
                  const isInRange = ds > normStart && ds < normEnd;
                  const hasWorkout = workoutDates.has(ds);
                  const isToday = ds === today;

                  return (
                    <View key={ds} style={styles.dayCellSlot}>
                      <Pressable
                        disabled={isFuture}
                        onPress={() => handleDayTap(ds)}
                        style={[
                          styles.dayCellBtn,
                          isInRange && styles.dayCellInRange,
                          isEndpoint && styles.dayCellEndpoint,
                          isToday && !isEndpoint && styles.dayCellToday,
                        ]}
                      >
                        <NumericText
                          style={[
                            styles.dayNumText,
                            isInRange && { color: tokens.accent.primary },
                            isEndpoint && { color: tokens.accent.onPrimary, fontFamily: FONT_FAMILY.bold },
                            isFuture && { color: tokens.text.muted, opacity: 0.35 },
                          ]}
                        >
                          {cell.dayNum}
                        </NumericText>
                        <View
                          style={[
                            styles.workoutDot,
                            hasWorkout
                              ? {
                                  backgroundColor: isEndpoint
                                    ? tokens.accent.onPrimary
                                    : tokens.status.success,
                                }
                              : { opacity: 0 },
                          ]}
                        />
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              <View style={styles.legendLine}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.workoutDot, { backgroundColor: tokens.status.success }]} />
                  <Text style={styles.legendNote}>Logged workout day</Text>
                </View>
                <Text style={styles.stageHint}>
                  {selectingStage === 'start' ? 'Tap start date' : 'Now tap end date'}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer Readout & Primary CTA */}
          <View style={styles.footer}>
            <View style={styles.summaryRow}>
              <Calendar size={14} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
              <NumericText style={styles.summaryText}>
                {formatShortDateRange(normStart, normEnd)} · {spanDays}d · {matchedCount}{' '}
                {matchedCount === 1 ? 'workout' : 'workouts'}
              </NumericText>
            </View>

            <TactileButton
              variant="primary"
              size="lg"
              style={styles.applyBtn}
              onPress={() => {
                hapticSuccess();
                onApplyCustomRange(normStart, normEnd);
                onClose();
              }}
            >
              <Check size={16} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} />
              <Text style={styles.applyBtnText}>Apply Custom Range</Text>
            </TactileButton>
          </View>
        </View>
      </BottomSheet>
    );
  }
);

const makeStyles = (tokens: ThemeTokens, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACE.lg,
      paddingTop: SPACE.xs,
      paddingBottom: SPACE.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: tokens.border.subtle,
    },
    title: {
      fontSize: 17,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.primary,
    },
    subtitle: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.secondary,
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.inner,
      backgroundColor: isDark ? '#14161D' : tokens.bg.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      paddingHorizontal: SPACE.lg,
      paddingTop: SPACE.md,
      paddingBottom: SPACE.md,
    },
    sectionLabel: {
      fontSize: 10.5,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.muted,
      letterSpacing: 0.7,
      marginBottom: SPACE.sm,
    },
    presetsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    presetPill: {
      minHeight: 34,
      paddingHorizontal: 14,
      borderRadius: RADIUS.sm,
      backgroundColor: isDark ? '#14161D' : tokens.bg.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.border.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    presetPillActive: {
      backgroundColor: tokens.accent.primary,
      borderColor: tokens.accent.primary,
    },
    presetText: {
      fontSize: 12.5,
      fontFamily: FONT_FAMILY.semibold,
      color: tokens.text.primary,
    },
    presetTextActive: {
      fontFamily: FONT_FAMILY.bold,
      color: tokens.accent.onPrimary,
    },
    calendarCard: {
      backgroundColor: isDark ? '#14161D' : tokens.bg.surface,
      borderRadius: RADIUS.card,
      padding: SPACE.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.border.subtle,
    },
    calHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACE.sm,
    },
    calArrowBtn: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.inner,
      backgroundColor: tokens.bg.elevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calMonthTitle: {
      fontSize: 14.5,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.primary,
    },
    weekdayRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCellSlot: {
      width: '14.2857%',
      paddingVertical: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekdayLbl: {
      fontSize: 10.5,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.muted,
    },
    dayCellBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    dayCellInRange: {
      backgroundColor: tokens.accent.primaryDim,
    },
    dayCellEndpoint: {
      backgroundColor: tokens.accent.primary,
    },
    dayCellToday: {
      borderWidth: 1,
      borderColor: tokens.accent.primary,
    },
    dayNumText: {
      fontSize: 12.5,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.primary,
    },
    workoutDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    legendLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: SPACE.sm,
      paddingTop: SPACE.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: tokens.border.subtle,
    },
    legendNote: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.secondary,
    },
    stageHint: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.accent.primary,
    },
    footer: {
      paddingHorizontal: SPACE.lg,
      paddingTop: SPACE.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: tokens.border.subtle,
      gap: 10,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    summaryText: {
      fontSize: 12.5,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.primary,
    },
    applyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      height: 44,
      borderRadius: RADIUS.md,
      backgroundColor: tokens.accent.primary,
    },
    applyBtnText: {
      fontSize: 14,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.accent.onPrimary,
    },
  });

export default AnalyticsRangeSheet;
