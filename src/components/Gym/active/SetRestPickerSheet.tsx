/**
 * SetRestPickerSheet.tsx — ZenFit
 *
 * Exact OpenGym Parity "Time left" Bottom Sheet Modal.
 * Replaces the old preset targets sheet with OpenGym's authentic 2-column wheel picker
 * showing live countdown, scrollable minutes/seconds, "Scroll to 0:00 to end the rest now",
 * and a full-width neon green "Done" button.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT_FAMILY } from '../../../theme/tokens';
import { hapticSelection, hapticMedium, hapticLight } from '../../../utils/haptics';

interface SetRestPickerSheetProps {
  visible: boolean;
  initialRestSecs?: number | null;
  defaultRestSecs?: number;
  onSelectRestSecs: (secs: number) => void;
  onSkip?: () => void;
  onClose: () => void;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 220px
const PADDING_OFFSET = ITEM_HEIGHT * 2; // 88px so 1st item centers at offset 0

// Minutes: 0 to 20
const MINUTES_DATA = Array.from({ length: 21 }, (_, i) => i);
// Seconds: 0 to 59
const SECONDS_DATA = Array.from({ length: 60 }, (_, i) => i);

export const SetRestPickerSheet: React.FC<SetRestPickerSheetProps> = ({
  visible,
  initialRestSecs,
  defaultRestSecs = 90,
  onSelectRestSecs,
  onSkip,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const effectiveInitialSecs = useMemo(() => {
    if (initialRestSecs != null && initialRestSecs >= 0) return initialRestSecs;
    return defaultRestSecs;
  }, [initialRestSecs, defaultRestSecs]);

  const [selectedMin, setSelectedMin] = useState<number>(() => Math.floor(effectiveInitialSecs / 60));
  const [selectedSec, setSelectedSec] = useState<number>(() => effectiveInitialSecs % 60);

  const minScrollRef = useRef<ScrollView>(null);
  const secScrollRef = useRef<ScrollView>(null);
  const isUserScrollingRef = useRef(false);

  // Sync state whenever sheet opens
  useEffect(() => {
    if (visible) {
      const m = Math.floor(effectiveInitialSecs / 60);
      const s = effectiveInitialSecs % 60;
      setSelectedMin(m);
      setSelectedSec(s);

      // Scroll wheels to center on the selected initial value
      setTimeout(() => {
        minScrollRef.current?.scrollTo({ y: m * ITEM_HEIGHT, animated: false });
        secScrollRef.current?.scrollTo({ y: s * ITEM_HEIGHT, animated: false });
      }, 50);
    }
  }, [visible, effectiveInitialSecs]);

  const handleMinScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(MINUTES_DATA.length - 1, Math.round(y / ITEM_HEIGHT)));
    setSelectedMin(prev => {
      if (prev !== idx) {
        hapticSelection();
        return idx;
      }
      return prev;
    });
  }, []);

  const handleSecScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(SECONDS_DATA.length - 1, Math.round(y / ITEM_HEIGHT)));
    setSelectedSec(prev => {
      if (prev !== idx) {
        hapticSelection();
        return idx;
      }
      return prev;
    });
  }, []);

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

  const handleDone = () => {
    hapticMedium();
    const totalSecs = selectedMin * 60 + selectedSec;
    if (totalSecs === 0 && onSkip) {
      onSkip();
    } else {
      onSelectRestSecs(totalSecs);
    }
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissOverlay} onPress={onClose} />

        <View
          style={[
            styles.sheetCard,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
        >
          {/* 1. Drag Handle Bar */}
          <View style={styles.handleBar} />

          {/* 2. Top Header Title: "Time left" */}
          <Text style={styles.title}>Time left</Text>

          {/* 3. Big Centered Live Countdown: e.g. "1:14" */}
          <View style={styles.countdownCenter}>
            <Text style={styles.countdownText}>
              {selectedMin}:{selectedSec < 10 ? `0${selectedSec}` : selectedSec}
            </Text>
          </View>

          {/* 4. OpenGym Dual Wheel Picker (Minutes & Seconds) */}
          <View style={styles.pickerContainer}>
            {/* Center Selection Highlight Bar */}
            <View style={styles.selectionPill} pointerEvents="none" />

            {/* Column 1: Minutes */}
            <View style={styles.columnWrapper}>
              <ScrollView
                ref={minScrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
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
                    <TouchableOpacity
                      key={`min-${min}`}
                      style={styles.itemRow}
                      activeOpacity={0.7}
                      onPress={() => handleSelectMin(min)}
                    >
                      <Text
                        style={[
                          styles.itemText,
                          isSelected && styles.itemTextSelected,
                          distance === 1 && styles.itemTextDistance1,
                          distance >= 2 && styles.itemTextDistance2,
                        ]}
                      >
                        {min}
                        {isSelected ? <Text style={styles.unitText}> min</Text> : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Column 2: Seconds */}
            <View style={styles.columnWrapper}>
              <ScrollView
                ref={secScrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
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
                    <TouchableOpacity
                      key={`sec-${sec}`}
                      style={styles.itemRow}
                      activeOpacity={0.7}
                      onPress={() => handleSelectSec(sec)}
                    >
                      <Text
                        style={[
                          styles.itemText,
                          isSelected && styles.itemTextSelected,
                          distance === 1 && styles.itemTextDistance1,
                          distance >= 2 && styles.itemTextDistance2,
                        ]}
                      >
                        {sec}
                        {isSelected ? <Text style={styles.unitText}> sec</Text> : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {/* 5. Subtitle Instruction */}
          <Text style={styles.instructionText}>
            Scroll to 0:00 to end the rest now.
          </Text>

          {/* 6. Neon Green Full-Width "Done" Button */}
          <TouchableOpacity
            style={styles.doneBtn}
            activeOpacity={0.82}
            onPress={handleDone}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default SetRestPickerSheet;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheetCard: {
    backgroundColor: '#161618',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    width: '100%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handleBar: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#3A3A3C',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  countdownCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    marginBottom: 10,
  },
  countdownText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 44,
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  pickerContainer: {
    height: CONTAINER_HEIGHT,
    flexDirection: 'row',
    position: 'relative',
    marginHorizontal: 10,
  },
  selectionPill: {
    position: 'absolute',
    top: PADDING_OFFSET,
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
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
  itemText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 18,
    color: '#8E8E93',
  },
  itemTextSelected: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 21,
    color: '#FFFFFF',
  },
  unitText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  itemTextDistance1: {
    color: '#71717A',
    fontSize: 17,
  },
  itemTextDistance2: {
    color: '#3F3F46',
    fontSize: 15,
  },
  instructionText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 18,
  },
  doneBtn: {
    backgroundColor: '#30D158',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 17,
    color: '#000000',
  },
});
