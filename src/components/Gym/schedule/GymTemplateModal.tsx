import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { hapticMedium, hapticLight, hapticSuccess } from '../../../utils/haptics';
import { FONT_FAMILY, IOS_DARK, SPACE } from '../../../theme/tokens';
import { GymPlanDay } from '../../../types/gym.types';
import { CURATED_SPLITS, CuratedSplit, REST_DAY_TEMPLATE } from '../../../data/curatedSplits';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FILTER_TABS = ['All', '3-Day', '4-Day', '5-Day', '6-Day'];

interface GymTemplateModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (
    customDays: Record<number, GymPlanDay>,
    templateId: string,
    templateName: string
  ) => void;
}

export const GymTemplateModal: React.FC<GymTemplateModalProps> = ({
  visible,
  onClose,
  onApply,
}) => {
  const { colors, isDark } = useTheme();

  // Two-Step Flow: 'select_split' | 'customize_schedule'
  const [currentStep, setCurrentStep] = useState<'select_split' | 'customize_schedule'>('select_split');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedSplit, setSelectedSplit] = useState<CuratedSplit>(CURATED_SPLITS[0]);

  // Step 2: Custom day mapping (1..7 -> workout.id or 'rest')
  const [dayMapping, setDayMapping] = useState<Record<number, string>>(CURATED_SPLITS[0].defaultDayMap);

  // Day picker modal to select workout for a day
  const [activePickerDayIndex, setActivePickerDayIndex] = useState<number | null>(null);

  // Reset to step 1 on modal open
  useEffect(() => {
    if (visible) {
      setCurrentStep('select_split');
      setSelectedFilter('All');
      setSelectedSplit(CURATED_SPLITS[0]);
      setDayMapping(CURATED_SPLITS[0].defaultDayMap);
      setActivePickerDayIndex(null);
    }
  }, [visible]);

  // Filtered splits list
  const filteredSplits = useMemo(() => {
    if (selectedFilter === 'All') return CURATED_SPLITS;
    const daysNum = parseInt(selectedFilter, 10);
    return CURATED_SPLITS.filter(s => s.daysPerWeek === daysNum);
  }, [selectedFilter]);

  // Handle selecting a split in Step 1
  const handleSelectSplit = (split: CuratedSplit) => {
    hapticLight();
    setSelectedSplit(split);
    setDayMapping(split.defaultDayMap);
    setCurrentStep('customize_schedule');
  };

  // Quick preset apply
  const handleApplyPreset = (presetDayMap: Record<number, string>) => {
    hapticLight();
    setDayMapping(presetDayMap);
  };

  // Change a single day's assignment
  const handleAssignDay = (dayIndex: number, workoutIdOrRest: string) => {
    hapticLight();
    setDayMapping(prev => ({
      ...prev,
      [dayIndex]: workoutIdOrRest,
    }));
    setActivePickerDayIndex(null);
  };

  // Compute active training days count in Step 2
  const activeTrainingDaysCount = useMemo(() => {
    return Object.values(dayMapping).filter(id => id !== 'rest').length;
  }, [dayMapping]);

  // Final apply
  const handleFinalApply = () => {
    hapticSuccess();
    const newCustomDays: Record<number, GymPlanDay> = {};

    for (let dayIdx = 1; dayIdx <= 7; dayIdx++) {
      const workoutId = dayMapping[dayIdx] || 'rest';

      if (workoutId === 'rest') {
        newCustomDays[dayIdx] = {
          ...REST_DAY_TEMPLATE,
          dayIndex: dayIdx,
        };
      } else {
        const foundWorkout = selectedSplit.workouts.find(w => w.id === workoutId);
        if (foundWorkout) {
          newCustomDays[dayIdx] = {
            dayIndex: dayIdx,
            routineId: foundWorkout.id,
            name: foundWorkout.name,
            subtitle: foundWorkout.subtitle,
            focus: foundWorkout.focus,
            exercises: foundWorkout.exercises,
            isRest: false,
          };
        } else {
          newCustomDays[dayIdx] = {
            ...REST_DAY_TEMPLATE,
            dayIndex: dayIdx,
          };
        }
      }
    }

    onApply(newCustomDays, selectedSplit.id, selectedSplit.name);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: isDark ? IOS_DARK.bgCanvas : colors.background }]}
        edges={['top']}
      >
        {currentStep === 'select_split' ? (
          // ── STEP 1: BROWSE & CHOOSE SPLIT PROGRAM (Hevy Style) ──────────────
          <View style={{ flex: 1 }}>
            {/* Top Navigation Bar */}
            <View style={styles.navBar}>
              <TouchableOpacity onPress={onClose} style={styles.navCloseBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
              <View style={styles.navTitleCenter}>
                <Text style={[styles.navTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  Workout Programs
                </Text>
                <Text style={styles.navSubtitle}>Choose a curated split program</Text>
              </View>
              <View style={{ width: 36 }} />
            </View>

            {/* Filter Tabs Strip */}
            <View style={styles.filterTabsWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsScroll}>
                {FILTER_TABS.map(tab => {
                  const isSelected = selectedFilter === tab;
                  return (
                    <TouchableOpacity
                      key={`tab-${tab}`}
                      activeOpacity={0.7}
                      onPress={() => {
                        hapticLight();
                        setSelectedFilter(tab);
                      }}
                      style={[
                        styles.filterTabPill,
                        isSelected && styles.filterTabPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterTabText,
                          isSelected && styles.filterTabTextActive,
                        ]}
                      >
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Curated Splits List */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.splitsListContent}
              showsVerticalScrollIndicator={false}
            >
              {filteredSplits.map(split => (
                <TouchableOpacity
                  key={`split-${split.id}`}
                  activeOpacity={0.8}
                  onPress={() => handleSelectSplit(split)}
                  style={[
                    styles.splitCard,
                    { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface },
                  ]}
                >
                  {/* Top Row: Title + Badges + Arrow */}
                  <View style={styles.splitCardHeader}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={[styles.splitCardTitle, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}>
                        {split.name}
                      </Text>
                      <View style={styles.badgesRow}>
                        <View style={styles.badgePill}>
                          <Text style={styles.badgePillText}>{split.daysPerWeek} Days/Wk</Text>
                        </View>
                        <View style={styles.badgePillSubtle}>
                          <Text style={styles.badgePillSubtleText}>{split.level}</Text>
                        </View>
                        <View style={styles.badgePillSubtle}>
                          <Text style={styles.badgePillSubtleText}>{split.focus}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.chevronBox}>
                      <Ionicons name="chevron-forward" size={18} color="#A599FF" />
                    </View>
                  </View>

                  <Text style={styles.splitCardDesc}>{split.description}</Text>

                  {/* Workout Routines Preview Strip */}
                  <View style={styles.workoutPillsWrap}>
                    {split.workouts.map((w, wIdx) => (
                      <View key={`w-${wIdx}-${w.id}`} style={styles.workoutPreviewPill}>
                        <Text style={styles.workoutPreviewPillText}>{w.name}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          // ── STEP 2: CUSTOMIZE WEEKLY SCHEDULE (Own Days Selection) ─────────
          <View style={{ flex: 1 }}>
            {/* Top Navigation Bar */}
            <View style={styles.navBar}>
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  setCurrentStep('select_split');
                }}
                style={styles.navBackBtn}
              >
                <Ionicons name="chevron-back" size={20} color="#A599FF" />
                <Text style={styles.navBackText}>Splits</Text>
              </TouchableOpacity>

              <View style={styles.navTitleCenter}>
                <Text style={[styles.navTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  Weekly Schedule
                </Text>
                <Text style={styles.navSubtitle}>{selectedSplit.name}</Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  onClose();
                }}
                style={styles.navCloseBtn}
              >
                <Ionicons name="close" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scheduleContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Preset Schedule Templates */}
              {selectedSplit.presets && selectedSplit.presets.length > 0 && (
                <View style={styles.presetsSection}>
                  <Text style={styles.sectionHeading}>QUICK SCHEDULE PRESETS</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
                    {selectedSplit.presets.map(preset => {
                      const isPresetActive = Object.entries(preset.dayMap).every(
                        ([d, wId]) => dayMapping[Number(d)] === wId
                      );

                      return (
                        <TouchableOpacity
                          key={`preset-${preset.id}`}
                          activeOpacity={0.75}
                          onPress={() => handleApplyPreset(preset.dayMap)}
                          style={[
                            styles.presetChip,
                            isPresetActive && styles.presetChipActive,
                            { backgroundColor: isPresetActive ? (isDark ? 'rgba(108, 92, 231, 0.15)' : 'rgba(108, 92, 231, 0.08)') : (isDark ? IOS_DARK.bgGroupedCard : colors.surface) },
                          ]}
                        >
                          <Text style={[styles.presetChipTitle, isPresetActive && { color: '#A599FF' }]}>
                            {preset.name}
                          </Text>
                          <Text style={styles.presetChipSub}>{preset.description}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Day-by-Day Customization (Select by their own days) */}
              <View style={styles.daysSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeading}>CUSTOMIZE BY DAY</Text>
                  <Text style={styles.sectionSubHeading}>Tap any day to change or rest</Text>
                </View>

                {DAY_NAMES.map((dayName, dIdx) => {
                  const dayNum = dIdx + 1;
                  const assignedWorkoutId = dayMapping[dayNum] || 'rest';
                  const isRest = assignedWorkoutId === 'rest';
                  const workout = selectedSplit.workouts.find(w => w.id === assignedWorkoutId);

                  return (
                    <TouchableOpacity
                      key={`schedule-day-${dayNum}`}
                      activeOpacity={0.75}
                      onPress={() => {
                        hapticLight();
                        setActivePickerDayIndex(dayNum);
                      }}
                      style={[
                        styles.dayRowCard,
                        { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface },
                      ]}
                    >
                      {/* Left Day Label */}
                      <View style={styles.dayColLeft}>
                        <View style={[styles.dayShortBadge, { backgroundColor: isRest ? 'rgba(142, 142, 147, 0.12)' : 'rgba(108, 92, 231, 0.14)' }]}>
                          <Text style={[styles.dayShortName, { color: isRest ? '#8E8E93' : '#A599FF' }]}>
                            {DAY_SHORT[dIdx]}
                          </Text>
                        </View>
                        <Text style={[styles.dayFullName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                          {dayName}
                        </Text>
                      </View>

                      {/* Right Workout Assignment Button */}
                      <View style={styles.dayColRight}>
                        {isRest ? (
                          <View style={styles.restBadgeBox}>
                            <Ionicons name="moon-outline" size={13} color="#8E8E93" style={{ marginRight: 5 }} />
                            <Text style={styles.restBadgeText}>Rest & Recovery</Text>
                          </View>
                        ) : (
                          <View style={styles.workoutBadgeBox}>
                            <Ionicons name="barbell-outline" size={13} color="#A599FF" style={{ marginRight: 5 }} />
                            <Text style={styles.workoutBadgeText} numberOfLines={1}>
                              {workout?.name || 'Workout'}
                            </Text>
                          </View>
                        )}
                        <Ionicons name="chevron-forward" size={14} color="#636366" style={{ marginLeft: 6 }} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Sticky Bottom Apply Bar */}
            <View style={[styles.stickyBottomBar, { backgroundColor: isDark ? '#141418' : '#FFFFFF' }]}>
              <View style={styles.bottomBarSummary}>
                <Text style={styles.bottomBarCount}>
                  {activeTrainingDaysCount} Training Days · {7 - activeTrainingDaysCount} Rest
                </Text>
                <Text style={styles.bottomBarSplitName}>{selectedSplit.name}</Text>
              </View>

              <TouchableOpacity activeOpacity={0.85} onPress={handleFinalApply} style={styles.applyFullBtn}>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.applyFullBtnText}>Apply to Weekly Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── WORKOUT SELECTOR SHEET (When user taps a day in Step 2) ── */}
        <Modal
          visible={activePickerDayIndex !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setActivePickerDayIndex(null)}
        >
          <Pressable style={styles.pickerBackdrop} onPress={() => setActivePickerDayIndex(null)}>
            <Pressable
              style={[
                styles.pickerContainer,
                {
                  backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  paddingBottom: Platform.OS === 'android' ? 48 : 34,
                },
              ]}
              onPress={e => e.stopPropagation()}
            >
              <View style={styles.pickerIndicator} />

              <View style={styles.pickerHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    {activePickerDayIndex ? DAY_NAMES[activePickerDayIndex - 1] : ''} Assignment
                  </Text>
                  <Text style={styles.pickerSub}>
                    Choose which workout or rest day to schedule
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setActivePickerDayIndex(null)}
                  style={styles.pickerCloseBtn}
                >
                  <Ionicons name="close" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ maxHeight: 440 }}
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={true}
              >
                {/* Rest Option */}
                {(() => {
                  const isCurrent = activePickerDayIndex ? dayMapping[activePickerDayIndex] === 'rest' : false;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => activePickerDayIndex && handleAssignDay(activePickerDayIndex, 'rest')}
                      style={[
                        styles.pickerCardOption,
                        isCurrent && styles.pickerCardOptionActive,
                        {
                          backgroundColor: isCurrent
                            ? (isDark ? 'rgba(108, 92, 231, 0.12)' : 'rgba(108, 92, 231, 0.08)')
                            : (isDark ? 'rgba(255, 255, 255, 0.04)' : '#F2F2F7'),
                        },
                      ]}
                    >
                      <View style={[styles.pickerIconBox, { backgroundColor: 'rgba(142, 142, 147, 0.15)' }]}>
                        <Ionicons name="moon" size={17} color="#8E8E93" />
                      </View>
                      <View style={styles.pickerTextCol}>
                        <Text style={[styles.pickerOptionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                          Rest & Recovery
                        </Text>
                        <Text style={styles.pickerOptionSub}>Complete recovery & active restoration</Text>
                      </View>
                      {isCurrent && (
                        <View style={styles.pickerCheckmarkCircle}>
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })()}

                {/* Split's Workouts */}
                {selectedSplit.workouts.map(w => {
                  const isCurrent = activePickerDayIndex ? dayMapping[activePickerDayIndex] === w.id : false;
                  return (
                    <TouchableOpacity
                      key={`pick-w-${w.id}`}
                      activeOpacity={0.7}
                      onPress={() => activePickerDayIndex && handleAssignDay(activePickerDayIndex, w.id)}
                      style={[
                        styles.pickerCardOption,
                        isCurrent && styles.pickerCardOptionActive,
                        {
                          backgroundColor: isCurrent
                            ? (isDark ? 'rgba(108, 92, 231, 0.12)' : 'rgba(108, 92, 231, 0.08)')
                            : (isDark ? 'rgba(255, 255, 255, 0.04)' : '#F2F2F7'),
                        },
                      ]}
                    >
                      <View style={[styles.pickerIconBox, { backgroundColor: 'rgba(165, 153, 255, 0.15)' }]}>
                        <Ionicons name="barbell" size={17} color="#A599FF" />
                      </View>
                      <View style={styles.pickerTextCol}>
                        <Text style={[styles.pickerOptionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                          {w.name}
                        </Text>
                        <Text style={styles.pickerOptionSub}>
                          {w.exercises?.length || 0} exercises · {w.subtitle || w.focus}
                        </Text>
                      </View>
                      {isCurrent && (
                        <View style={styles.pickerCheckmarkCircle}>
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

export default GymTemplateModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(84, 84, 88, 0.2)',
  },
  navCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  navBackText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 15,
    color: '#A599FF',
  },
  navTitleCenter: {
    alignItems: 'center',
  },
  navTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
  },
  navSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
  },
  navApplyBtn: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  navApplyBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  filterTabsWrap: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  filterTabsScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  filterTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterTabPillActive: {
    backgroundColor: '#FFFFFF',
  },
  filterTabText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8E8E93',
  },
  filterTabTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  splitsListContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  splitCard: {
    borderRadius: 14,
    padding: 14,
  },
  splitCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  splitCardTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 17,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  badgePill: {
    backgroundColor: 'rgba(165, 153, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#A599FF',
  },
  badgePillSubtle: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePillSubtleText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10,
    color: '#8E8E93',
  },
  chevronBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitCardDesc: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    lineHeight: 16,
  },
  workoutPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  workoutPreviewPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  workoutPreviewPillText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#E0E0E6',
  },
  scheduleContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 16,
  },
  presetsSection: {},
  sectionHeading: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#8E8E93',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  sectionSubHeading: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
  },
  presetsScroll: {
    gap: 8,
  },
  presetChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  presetChipActive: {
    borderColor: '#6C5CE7',
  },
  presetChipTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  presetChipSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  daysSection: {
    gap: 8,
  },
  dayRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  dayColLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayShortBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayShortName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
  },
  dayFullName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
  },
  dayColRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
  },
  restBadgeText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11.5,
    color: '#8E8E93',
  },
  workoutBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 92, 231, 0.14)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    maxWidth: 180,
  },
  workoutBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11.5,
    color: '#A599FF',
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(84, 84, 88, 0.2)',
    gap: 10,
  },
  bottomBarSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomBarCount: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12.5,
    color: '#A599FF',
  },
  bottomBarSplitName: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8E8E93',
  },
  applyFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C5CE7',
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  applyFullBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pickerIndicator: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8E8E93',
    alignSelf: 'center',
    marginBottom: 12,
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  pickerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 17,
  },
  pickerSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  pickerCardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  pickerCardOptionActive: {
    borderColor: '#6C5CE7',
  },
  pickerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pickerTextCol: {
    flex: 1,
  },
  pickerOptionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14.5,
  },
  pickerOptionSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8E8E93',
    marginTop: 2,
  },
  pickerCheckmarkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
