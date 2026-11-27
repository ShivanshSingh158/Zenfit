import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { NumericText, TactileButton } from '../../ui';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH } from '../../../theme/tokens';
import { AnalyticsDateRange, AnalyticsRangePreset } from '../../../services/gymAnalyticsEngine';
import { hapticLight, hapticSelection } from '../../../utils/haptics';

export interface RangeStripOption {
  id: AnalyticsRangePreset;
  label: string;
}

interface AnalyticsRangeStripProps {
  options: RangeStripOption[];
  range: AnalyticsDateRange;
  onSelectPreset: (preset: AnalyticsRangePreset) => void;
  onOpenCustomSheet: () => void;
  onStepPeriod?: (delta: -1 | 1) => void;
  onResetCurrent?: () => void;
}

export const AnalyticsRangeStrip: React.FC<AnalyticsRangeStripProps> = React.memo(
  function AnalyticsRangeStrip({
    options,
    range,
    onSelectPreset,
    onOpenCustomSheet,
    onStepPeriod,
    onResetCurrent,
  }) {
    const { tokens } = useTheme();
    const showStepper = (range.preset === '1w' || range.preset === 'cycle') && Boolean(onStepPeriod);
    const isCustom = range.preset === 'custom' || !options.some(o => o.id === range.preset);

    return (
      <View style={styles.wrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {options.map(opt => {
            const active = range.preset === opt.id;
            return (
              <TactileButton
                key={opt.id}
                lightweight
                variant="custom"
                haptic="none"
                onPress={() => {
                  hapticSelection();
                  onSelectPreset(opt.id);
                }}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active ? tokens.accent.primary : tokens.bg.surface,
                    borderColor: active ? tokens.accent.primary : tokens.border.subtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: active ? tokens.accent.onPrimary : tokens.text.secondary },
                    active && { fontFamily: FONT_FAMILY.bold },
                  ]}
                >
                  {opt.label}
                </Text>
              </TactileButton>
            );
          })}

          <TactileButton
            lightweight
            variant="custom"
            haptic="none"
            onPress={() => {
              hapticLight();
              onOpenCustomSheet();
            }}
            style={[
              styles.pill,
              styles.customPill,
              {
                backgroundColor: isCustom ? tokens.accent.primaryDim : tokens.bg.surface,
                borderColor: isCustom ? tokens.accent.primary : tokens.border.subtle,
              },
            ]}
          >
            <Calendar
              size={12}
              color={isCustom ? tokens.accent.primary : tokens.text.secondary}
              strokeWidth={ICON.strokeWidth}
            />
            <Text
              style={[
                styles.pillText,
                {
                  color: isCustom ? tokens.accent.primary : tokens.text.secondary,
                  fontFamily: isCustom ? FONT_FAMILY.bold : FONT_FAMILY.medium,
                },
              ]}
            >
              {isCustom ? range.label : 'Custom'}
            </Text>
            <ChevronDown
              size={12}
              color={isCustom ? tokens.accent.primary : tokens.text.muted}
              strokeWidth={ICON.strokeWidth}
            />
          </TactileButton>
        </ScrollView>

        {showStepper && (
          <View style={[styles.stepperRow, { borderBottomColor: tokens.border.subtle }]}>
            <TactileButton
              variant="icon"
              haptic="none"
              style={[styles.arrowBtn, { backgroundColor: tokens.bg.surface }]}
              onPress={() => {
                hapticLight();
                onStepPeriod?.(-1);
              }}
              hitSlop={TOUCH.hitSlop}
              accessibilityLabel="Previous period"
            >
              <ChevronLeft size={16} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
            </TactileButton>

            <TactileButton
              variant="custom"
              haptic="none"
              disabled={range.isCurrentWeek}
              onPress={!range.isCurrentWeek ? onResetCurrent : undefined}
              style={styles.centerBtn}
            >
              <View style={styles.centerTitleRow}>
                <NumericText style={[styles.dateText, { color: tokens.text.primary }]}>
                  {range.label}
                </NumericText>
                {range.isCurrentWeek && (
                  <View style={[styles.badge, { backgroundColor: tokens.accent.primaryDim }]}>
                    <Text style={[styles.badgeText, { color: tokens.accent.primary }]}>
                      {range.preset === 'cycle' ? 'CURRENT' : 'THIS WEEK'}
                    </Text>
                  </View>
                )}
              </View>
              {!range.isCurrentWeek && (
                <Text style={[styles.jumpText, { color: tokens.accent.primary }]}>
                  Tap to jump to current
                </Text>
              )}
            </TactileButton>

            <TactileButton
              variant="icon"
              haptic="none"
              disabled={!range.canGoForward}
              style={[
                styles.arrowBtn,
                { backgroundColor: tokens.bg.surface },
                !range.canGoForward && { opacity: 0.3 },
              ]}
              onPress={() => {
                if (!range.canGoForward) return;
                hapticLight();
                onStepPeriod?.(1);
              }}
              hitSlop={TOUCH.hitSlop}
              accessibilityLabel="Next period"
            >
              <ChevronRight
                size={16}
                color={range.canGoForward ? tokens.text.primary : tokens.text.muted}
                strokeWidth={ICON.strokeWidth}
              />
            </TactileButton>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  chipsScroll: {
    gap: 6,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  customPill: {
    paddingHorizontal: 10,
  },
  pillText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACE.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.inner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.sm,
    minHeight: 32,
  },
  centerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13.5,
    fontFamily: FONT_FAMILY.bold,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9.5,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.4,
  },
  jumpText: {
    fontSize: 10.5,
    fontFamily: FONT_FAMILY.medium,
    marginTop: 1,
  },
});

export default AnalyticsRangeStrip;
