import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { hapticSelection, hapticMedium, hapticLight } from '../../utils/haptics';
import { AppBottomSheet } from '../ui/AppBottomSheet';
import { TactileButton } from '../ui/TactileButton';
import { NumericText } from '../ui/NumericText';

interface SetRestPickerSheetProps {
  visible: boolean;
  initialRestSecs?: number | null;
  defaultRestSecs?: number;
  isDefaultMode?: boolean;
  onSelectRestSecs: (secs: number, saveAsDefault?: boolean) => void;
  onSkip?: () => void;
  onClose: () => void;
}

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING_OFFSET = ITEM_HEIGHT * 2;

const MINUTES_DATA = Array.from({ length: 21 }, (_, i) => i);
const SECONDS_DATA = Array.from({ length: 60 }, (_, i) => i);
const REST_PRESETS = [
  { secs: 45, label: '0:45' },
  { secs: 60, label: '1:00' },
  { secs: 90, label: '1:30' },
  { secs: 120, label: '2:00' },
  { secs: 180, label: '3:00' },
];

const PickerWheelItem = React.memo(function PickerWheelItem({
  value,
  suffix,
  isSelected,
  distance,
  textColor,
  fontFamily,
  onSelect,
}: {
  value: number;
  suffix: string;
  isSelected: boolean;
  distance: number;
  textColor: string;
  fontFamily: string;
  onSelect: (v: number) => void;
}) {
  const handlePress = useCallback(() => {
    onSelect(value);
  }, [value, onSelect]);

  return (
    <Pressable style={styles.itemRow} onPress={handlePress}>
      <NumericText
        style={{
          fontSize: isSelected ? 21 : distance === 1 ? 17 : 15,
          fontFamily,
          color: textColor,
        }}
      >
        {value}
        {isSelected ? suffix : ''}
      </NumericText>
    </Pressable>
  );
});

export const SetRestPickerSheet: React.FC<SetRestPickerSheetProps> = ({
  visible,
  initialRestSecs,
  defaultRestSecs = 90,
  isDefaultMode = false,
  onSelectRestSecs,
  onSkip,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const cardBg = isDark ? '#14161D' : '#FFFFFF';
  const pillBg = isDark ? '#181B24' : tokens.bg.elevated;

  const effectiveInitialSecs = useMemo(() => {
    if (initialRestSecs != null && initialRestSecs >= 0) return initialRestSecs;
    return defaultRestSecs;
  }, [initialRestSecs, defaultRestSecs]);

  const [selectedMin, setSelectedMin] = useState<number>(() =>
    Math.floor(effectiveInitialSecs / 60)
  );
  const [selectedSec, setSelectedSec] = useState<number>(
    () => effectiveInitialSecs % 60
  );
  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(isDefaultMode);

  const minScrollRef = useRef<ScrollView>(null);
  const secScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      const m = Math.floor(effectiveInitialSecs / 60);
      const s = effectiveInitialSecs % 60;
      setSelectedMin(m);
      setSelectedSec(s);
      setSaveAsDefault(Boolean(isDefaultMode));

      const task = InteractionManager.runAfterInteractions(() => {
        minScrollRef.current?.scrollTo({ y: m * ITEM_HEIGHT, animated: false });
        secScrollRef.current?.scrollTo({ y: s * ITEM_HEIGHT, animated: false });
      });
      return () => task?.cancel?.();
    }
  }, [visible, effectiveInitialSecs, isDefaultMode]);

  const handleMinScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const idx = Math.max(
        0,
        Math.min(MINUTES_DATA.length - 1, Math.round(y / ITEM_HEIGHT))
      );
      setSelectedMin((prev) => {
        if (prev !== idx) {
          hapticSelection();
          return idx;
        }
        return prev;
      });
    },
    []
  );

  const handleSecScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const idx = Math.max(
        0,
        Math.min(SECONDS_DATA.length - 1, Math.round(y / ITEM_HEIGHT))
      );
      setSelectedSec((prev) => {
        if (prev !== idx) {
          hapticSelection();
          return idx;
        }
        return prev;
      });
    },
    []
  );

  const handleSelectMin = useCallback((m: number) => {
    hapticSelection();
    setSelectedMin(m);
    minScrollRef.current?.scrollTo({ y: m * ITEM_HEIGHT, animated: true });
  }, []);

  const handleSelectSec = useCallback((s: number) => {
    hapticSelection();
    setSelectedSec(s);
    secScrollRef.current?.scrollTo({ y: s * ITEM_HEIGHT, animated: true });
  }, []);

  const handleSelectPreset = useCallback((secs: number) => {
    hapticSelection();
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    setSelectedMin(m);
    setSelectedSec(s);
    minScrollRef.current?.scrollTo({ y: m * ITEM_HEIGHT, animated: true });
    secScrollRef.current?.scrollTo({ y: s * ITEM_HEIGHT, animated: true });
  }, []);

  const currentTotalSecs = selectedMin * 60 + selectedSec;

  const handleDone = () => {
    hapticMedium();
    if (currentTotalSecs === 0 && onSkip) {
      onSkip();
    } else {
      onSelectRestSecs(currentTotalSecs, saveAsDefault);
    }
    onClose();
  };

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      noPadding
      enableContentPanningGesture={false}
    >
      <View
        style={{
          paddingHorizontal: tokens.space.lg,
          paddingBottom: Math.max(insets.bottom, tokens.space.xl),
          paddingTop: tokens.space.sm,
        }}
      >
        <Text
          style={[
            tokens.typography.h2,
            { color: tokens.text.primary, marginBottom: tokens.space.sm },
          ]}
        >
          {isDefaultMode ? 'Default rest timer' : 'Rest timer'}
        </Text>

        <View style={styles.countdownCenter}>
          <NumericText style={[tokens.typography.numericHero, { color: tokens.accent.primary }]}>
            {selectedMin}:{selectedSec < 10 ? `0${selectedSec}` : selectedSec}
          </NumericText>
        </View>

        <View style={styles.presetsRow}>
          {REST_PRESETS.map((preset) => {
            const active = currentTotalSecs === preset.secs;
            return (
              <TactileButton
                key={preset.secs}
                variant="custom"
                haptic="selection"
                onPress={() => handleSelectPreset(preset.secs)}
                style={[
                  styles.presetChip,
                  {
                    borderRadius: tokens.radius.inner,
                    backgroundColor: active ? tokens.accent.primaryDim : cardBg,
                    borderColor: active ? tokens.accent.primary : tokens.border.subtle,
                  },
                ]}
              >
                <NumericText
                  style={{
                    fontSize: 13,
                    fontFamily: active ? tokens.font.bold : tokens.font.medium,
                    color: active ? tokens.accent.primary : tokens.text.primary,
                  }}
                >
                  {preset.label}
                </NumericText>
              </TactileButton>
            );
          })}
        </View>

        <View style={styles.pickerContainer}>
          <View
            style={[
              styles.selectionPill,
              {
                backgroundColor: cardBg,
                borderRadius: tokens.radius.inner,
                borderColor: tokens.border.subtle,
              },
            ]}
            pointerEvents="none"
          />

          <View style={styles.columnWrapper}>
            <ScrollView
              ref={minScrollRef}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              nestedScrollEnabled
              contentContainerStyle={{
                paddingTop: PADDING_OFFSET,
                paddingBottom: PADDING_OFFSET,
              }}
              onMomentumScrollEnd={handleMinScrollEnd}
              onScrollEndDrag={handleMinScrollEnd}
            >
              {MINUTES_DATA.map((min) => {
                const isSelected = min === selectedMin;
                const distance = Math.abs(min - selectedMin);
                return (
                  <PickerWheelItem
                    key={`min-${min}`}
                    value={min}
                    suffix=" min"
                    isSelected={isSelected}
                    distance={distance}
                    fontFamily={isSelected ? tokens.font.bold : tokens.font.medium}
                    textColor={
                      isSelected
                        ? tokens.text.primary
                        : distance === 1
                        ? tokens.text.secondary
                        : tokens.text.muted
                    }
                    onSelect={handleSelectMin}
                  />
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.columnWrapper}>
            <ScrollView
              ref={secScrollRef}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              nestedScrollEnabled
              contentContainerStyle={{
                paddingTop: PADDING_OFFSET,
                paddingBottom: PADDING_OFFSET,
              }}
              onMomentumScrollEnd={handleSecScrollEnd}
              onScrollEndDrag={handleSecScrollEnd}
            >
              {SECONDS_DATA.map((sec) => {
                const isSelected = sec === selectedSec;
                const distance = Math.abs(sec - selectedSec);
                return (
                  <PickerWheelItem
                    key={`sec-${sec}`}
                    value={sec}
                    suffix=" sec"
                    isSelected={isSelected}
                    distance={distance}
                    fontFamily={isSelected ? tokens.font.bold : tokens.font.medium}
                    textColor={
                      isSelected
                        ? tokens.text.primary
                        : distance === 1
                        ? tokens.text.secondary
                        : tokens.text.muted
                    }
                    onSelect={handleSelectSec}
                  />
                );
              })}
            </ScrollView>
          </View>
        </View>

        <View
          style={[
            styles.defaultToggleCard,
            {
              backgroundColor: cardBg,
              borderColor: tokens.border.subtle,
              borderRadius: tokens.radius.card,
            },
          ]}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[tokens.typography.label, { color: tokens.text.primary }]}>
              Save as default for this exercise
            </Text>
          </View>
          <Switch
            value={saveAsDefault}
            onValueChange={(val) => {
              hapticLight();
              setSaveAsDefault(val);
            }}
            trackColor={{ false: pillBg, true: tokens.accent.primary }}
            thumbColor={tokens.text.primary}
            accessibilityLabel="Save as default rest duration for this exercise"
          />
        </View>

        <View style={styles.ctaRow}>
          {Boolean(onSkip) && !isDefaultMode && (
            <TactileButton
              variant="secondary"
              size="lg"
              haptic="medium"
              onPress={() => {
                onSkip?.();
                onClose();
              }}
              style={{ flex: 1, backgroundColor: cardBg, borderColor: tokens.border.subtle }}
            >
              <Text
                style={[
                  tokens.typography.label,
                  { fontFamily: tokens.font.semibold, color: tokens.text.primary },
                ]}
              >
                End Rest
              </Text>
            </TactileButton>
          )}
          <TactileButton
            variant="primary"
            size="lg"
            haptic="medium"
            onPress={handleDone}
            style={{ flex: 1 }}
          >
            <Text
              style={[
                tokens.typography.label,
                { fontFamily: tokens.font.bold, color: tokens.accent.onPrimary },
              ]}
            >
              {isDefaultMode ? 'Save Default' : 'Apply Timer'}
            </Text>
          </TactileButton>
        </View>
      </View>
    </AppBottomSheet>
  );
};

const styles = StyleSheet.create({
  countdownCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    marginBottom: 10,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  pickerContainer: {
    height: CONTAINER_HEIGHT,
    flexDirection: 'row',
    position: 'relative',
    marginHorizontal: 8,
    marginBottom: 12,
  },
  selectionPill: {
    position: 'absolute',
    top: PADDING_OFFSET,
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 0,
  },
  columnWrapper: {
    flex: 1,
    height: CONTAINER_HEIGHT,
    zIndex: 1,
  },
  itemRow: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
  },
});

export default SetRestPickerSheet;
