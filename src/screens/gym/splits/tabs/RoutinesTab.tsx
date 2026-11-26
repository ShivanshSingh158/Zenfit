import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Platform,
  StyleSheet,
  TextInput,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GymRoutine } from '../../../../types/gym.types';
import { CuratedSplit } from '../../../../data/curatedSplits';
import { hapticLight } from '../../../../utils/haptics';
import MiniDualBodyMap from '../../../../components/Gym/schedule/MiniDualBodyMap';
import {
  getSplitsPalette,
  useSplitsStyles,
} from '../styles/gymSplitsStyles';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../../../theme/tokens';
import { useTheme } from '../../../../contexts/ThemeContext';
import { TactileButton, NumericText } from '../../../../components/ui';

export interface RoutinesTabProps {
  customRoutinesList: GymRoutine[];
  onCreateRoutine: () => void;
  onOpenRoutineOptions: (routine: GymRoutine, index: number) => void;
  onAssignRoutineTarget: (routine: GymRoutine) => void;
  onStartWorkout: (routine: GymRoutine) => void;
  exploreFilter: string;
  onSetExploreFilter: (filter: string) => void;
  filteredCuratedSplits: CuratedSplit[];
  activeTemplate: string;
  onInspectSplit: (split: CuratedSplit) => void;
  onApplySplit: (split: CuratedSplit) => void;
  isDark: boolean;
}

const FILTER_TABS = ['All', 'My Routines', '3-Day', '4-Day', '5-Day', '6-Day'];

function formatSplitWorkoutChip(rawName: string): string {
  return rawName
    .replace(/\s*\(Thickness\)/i, ' A')
    .replace(/\s*\(Width\)/i, ' B')
    .replace(/\s*\(Detail\)/i, ' B')
    .replace(/\s*\([^)]+\)/g, '')
    .trim();
}

export const RoutinesTab: React.FC<RoutinesTabProps> = React.memo(({
  customRoutinesList,
  onCreateRoutine,
  onOpenRoutineOptions,
  onAssignRoutineTarget,
  onStartWorkout,
  exploreFilter,
  onSetExploreFilter,
  filteredCuratedSplits,
  activeTemplate,
  onInspectSplit,
  onApplySplit,
  isDark,
}) => {
  const { tokens } = useTheme();
  const styles = useSplitsStyles();
  const tabStyles = useMemo(() => makeTabStyles(tokens), [tokens]);
  const [searchQuery, setSearchQuery] = useState('');
  const showCustomSection = exploreFilter === 'All' || exploreFilter === 'My Routines';
  const showSplitsSection = exploreFilter !== 'My Routines';

  const displayedCustomRoutines = useMemo(() => {
    if (!searchQuery.trim()) return customRoutinesList;
    const q = searchQuery.toLowerCase().trim();
    return customRoutinesList.filter(rt =>
      rt.name?.toLowerCase().includes(q) ||
      (rt.exercises || []).some(ex => ex.name?.toLowerCase().includes(q))
    );
  }, [customRoutinesList, searchQuery]);

  type RoutineFeedRow =
    | { key: string; type: 'custom_routine'; routine: GymRoutine; index: number }
    | { key: string; type: 'splits_header' }
    | { key: string; type: 'split_card'; split: CuratedSplit };

  const feedRows = useMemo<RoutineFeedRow[]>(() => {
    const rows: RoutineFeedRow[] = [];
    if (showCustomSection && customRoutinesList.length > 0) {
      displayedCustomRoutines.forEach((rt, rtIdx) => {
        rows.push({
          key: `rt_${rt.id || rtIdx}`,
          type: 'custom_routine',
          routine: rt,
          index: rtIdx,
        });
      });
    }
    if (showSplitsSection) {
      rows.push({ key: 'splits_header', type: 'splits_header' });
      filteredCuratedSplits.forEach(split => {
        rows.push({
          key: `split_${split.id}`,
          type: 'split_card',
          split,
        });
      });
    }
    return rows;
  }, [showCustomSection, customRoutinesList.length, displayedCustomRoutines, showSplitsSection, filteredCuratedSplits]);

  const listHeader = (
    <View>
      {/* ── Filter Chips Bar ── */}
      <View style={{ marginBottom: SPACE[12] }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}
        >
          {FILTER_TABS.map(f => {
            const isSel = exploreFilter === f;
            return (
              <TactileButton
                key={f}
                lightweight
                variant="custom"
                onPress={() => {
                  hapticLight();
                  onSetExploreFilter(f);
                }}
                style={[
                  tabStyles.filterChip,
                  isSel && tabStyles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    tabStyles.filterChipText,
                    isSel && tabStyles.filterChipTextActive,
                  ]}
                >
                  {f}
                </Text>
              </TactileButton>
            );
          })}
        </ScrollView>
      </View>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 1 HEADER: MY ROUTINES
         ════════════════════════════════════════════════════════════════════ */}
      {showCustomSection && (
        <View style={{ marginBottom: SPACE[8] }}>
          <View style={styles.routinesHeaderRow}>
            <NumericText style={styles.cardSectionLabel}>
              MY WORKOUTS ({customRoutinesList.length})
            </NumericText>

            {customRoutinesList.length > 0 && (
              <TactileButton
                lightweight
                variant="primary"
                size="xs"
                onPress={onCreateRoutine}
                style={tabStyles.newRoutinePillBtn}
              >
                <Ionicons name="add" size={13} color={tokens.accent.onPrimary} />
                <Text style={tabStyles.newRoutinePillText} numberOfLines={1}>New Routine</Text>
              </TactileButton>
            )}
          </View>

          {customRoutinesList.length > 2 && (
            <View style={tabStyles.searchBox}>
              <Ionicons name="search" size={15} color={tokens.text.muted} />
              <TextInput
                style={tabStyles.searchInput}
                placeholder="Search workouts or exercises..."
                placeholderTextColor={tokens.text.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={TOUCH.hitSlop}>
                  <Ionicons name="close" size={16} color={tokens.text.muted} />
                </Pressable>
              )}
            </View>
          )}

          {customRoutinesList.length === 0 && (
            <TactileButton
              lightweight
              variant="custom"
              onPress={onCreateRoutine}
              style={tabStyles.compactEmptyCard}
            >
              <View style={{ flex: 1, paddingRight: SPACE[8] }}>
                <Text style={tabStyles.emptyBoxTitle}>Create your own workout</Text>
                <Text style={tabStyles.emptyBoxSub} numberOfLines={1}>
                  Save custom exercises, sets & reps
                </Text>
              </View>
              <View style={tabStyles.compactCreateBtn}>
                <Ionicons name="add" size={13} color={tokens.accent.onPrimary} />
                <Text style={tabStyles.newRoutinePillText}>New Routine</Text>
              </View>
            </TactileButton>
          )}
        </View>
      )}
    </View>
  );

  const renderFeedRow = useCallback(
    ({ item }: { item: RoutineFeedRow }) => {
      if (item.type === 'splits_header') {
        return (
          <View style={[styles.routinesHeaderRow, { marginTop: showCustomSection ? SPACE[8] : 0 }]}>
            <Text style={styles.cardSectionLabel}>WORKOUT SPLITS</Text>
          </View>
        );
      }

      if (item.type === 'custom_routine') {
        const { routine: rt, index: rtIdx } = item;
        const exCount = rt.exercises?.length || 0;
        const cardioCount = rt.cardio?.length || 0;
        const totalSets = (rt.exercises || []).reduce((acc, ex) => acc + (Number(ex.targetSets) || 3), 0);
        const cardioMins = (rt.cardio || []).reduce((acc, c) => acc + (Number(c.durationMinutes) || 0), 0);
        const estMins = Math.round(totalSets * 2.5) + cardioMins;
        const previewLabels = [
          ...(rt.exercises || []).map(ex => ex.name),
          ...(rt.cardio || []).map(c => c.type),
        ];

        return (
          <View style={[tabStyles.routineCard, { marginBottom: SPACE[12] }]}>
            <View style={tabStyles.routineCardHeader}>
              <Pressable
                onPress={() => onOpenRoutineOptions(rt, rtIdx)}
                style={({ pressed }) => [
                  { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
                  pressed && { opacity: 0.78 },
                ]}
              >
                <View style={{ flex: 1, minWidth: 0, paddingRight: SPACE[8] }}>
                  <Text style={tabStyles.routineName} numberOfLines={1}>{rt.name}</Text>
                  <NumericText style={tabStyles.routineSubtitle}>
                    {exCount > 0 ? `${exCount} exercises · ${totalSets} sets` : ''}
                    {cardioCount > 0 ? `${exCount > 0 ? ' · ' : ''}${cardioCount} cardio` : ''}
                    {estMins > 0 ? ` · ~${estMins}m` : ''}
                  </NumericText>
                </View>

                <View style={{ marginRight: SPACE[8] }}>
                  <MiniDualBodyMap
                    exercises={rt.exercises || []}
                    activeColor={tokens.accent.primary}
                    avatarHeight={42}
                    avatarWidth={19}
                    isDark={isDark}
                  />
                </View>
              </Pressable>

              <Pressable
                onPress={() => onOpenRoutineOptions(rt, rtIdx)}
                style={tabStyles.kebabBtn}
                hitSlop={TOUCH.hitSlop}
                accessibilityLabel={`Options for ${rt.name}`}
              >
                <Ionicons name="ellipsis-horizontal" size={16} color={tokens.text.secondary} />
              </Pressable>
            </View>

            <Pressable
              onPress={() => onOpenRoutineOptions(rt, rtIdx)}
              style={({ pressed }) => [tabStyles.exercisePreviewRow, pressed && { opacity: 0.78 }]}
            >
              {previewLabels.slice(0, 2).map((label, i) => (
                <View key={`${label}-${i}`} style={tabStyles.previewChip}>
                  <Text style={tabStyles.previewChipText} numberOfLines={1}>
                    {label}
                  </Text>
                </View>
              ))}
              {previewLabels.length > 2 && (
                <View style={[tabStyles.previewChip, tabStyles.previewChipMore]}>
                  <NumericText style={tabStyles.previewChipMoreText}>
                    +{previewLabels.length - 2}
                  </NumericText>
                </View>
              )}
            </Pressable>

            <View style={tabStyles.footerActionsRow}>
              <TactileButton
                lightweight
                variant="custom"
                size="md"
                onPress={() => onAssignRoutineTarget(rt)}
                style={tabStyles.assignPillBtn}
              >
                <Ionicons name="calendar-outline" size={13} color={tokens.text.primary} />
                <Text
                  style={tabStyles.assignPillBtnText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                >
                  Schedule
                </Text>
              </TactileButton>

              <TactileButton
                lightweight
                variant="primary"
                size="md"
                onPress={() => onStartWorkout(rt)}
                style={tabStyles.startPillBtn}
              >
                <Ionicons name="play" size={12} color={tokens.accent.onPrimary} />
                <Text
                  style={tabStyles.startPillBtnText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                >
                  Start
                </Text>
              </TactileButton>
            </View>
          </View>
        );
      }

      const { split } = item;
      const isActive =
        activeTemplate === split.id ||
        (split.id === 'ppl' && (activeTemplate === 'ppl' || activeTemplate === 'ppl_6day')) ||
        (split.id === 'arnold' && (activeTemplate === 'arnold' || activeTemplate === 'arnold_6day')) ||
        (split.id === 'upper_lower' && (activeTemplate === 'upper_lower' || activeTemplate === 'upper_lower_4day')) ||
        (split.id === 'full_body' && (activeTemplate === 'full_body' || activeTemplate === 'full_body_3day')) ||
        (split.id === 'bro_split' && (activeTemplate === 'bro_split' || activeTemplate === 'bro_split_5day')) ||
        (split.id === 'pplul' && activeTemplate === 'pplul') ||
        (split.id === 'torso_limbs' && activeTemplate === 'torso_limbs');

      return (
        <View
          style={[
            tabStyles.splitCard,
            { marginBottom: SPACE[12] },
            isActive && tabStyles.splitCardActive,
          ]}
        >
          <View style={tabStyles.splitHeaderRow}>
            <Pressable
              onPress={() => onInspectSplit(split)}
              style={({ pressed }) => [
                { flex: 1, minWidth: 0, paddingRight: SPACE[8] },
                pressed && { opacity: 0.78 },
              ]}
            >
              <NumericText style={tabStyles.splitMetaBadge}>
                {split.daysPerWeek} DAYS / WK · {split.level.toUpperCase()}
              </NumericText>
              <Text style={tabStyles.splitTitle} numberOfLines={1}>
                {split.name}
              </Text>
            </Pressable>

            {isActive ? (
              <View style={tabStyles.activeStatusRow}>
                <View style={[tabStyles.activeStatusDot, { backgroundColor: tokens.status.success }]} />
                <Text style={[tabStyles.activeStatusText, { color: tokens.status.success }]}>
                  Active
                </Text>
              </View>
            ) : (
              <TactileButton
                lightweight
                variant="primary"
                size="xs"
                onPress={() => onApplySplit(split)}
                style={tabStyles.applyPillBtn}
              >
                <Text style={tabStyles.applyPillBtnText} numberOfLines={1}>Apply</Text>
              </TactileButton>
            )}
          </View>

          <Pressable
            onPress={() => onInspectSplit(split)}
            style={({ pressed }) => [pressed && { opacity: 0.78 }]}
          >
            <Text style={tabStyles.splitDesc} numberOfLines={2}>
              {split.description}
            </Text>
          </Pressable>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tabStyles.workoutsTagTrack}
          >
            {split.workouts.map(w => (
              <Pressable
                key={w.id}
                onPress={() => onInspectSplit(split)}
                style={({ pressed }) => [tabStyles.workoutTagPill, pressed && { opacity: 0.78 }]}
              >
                <Text style={tabStyles.workoutTagPillText} numberOfLines={1}>
                  {formatSplitWorkoutChip(w.name)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      );
    },
    [
      activeTemplate,
      isDark,
      onApplySplit,
      onAssignRoutineTarget,
      onInspectSplit,
      onOpenRoutineOptions,
      onStartWorkout,
      showCustomSection,
      styles.cardSectionLabel,
      styles.routinesHeaderRow,
      tabStyles,
      tokens.accent.onPrimary,
      tokens.accent.primary,
      tokens.status.success,
      tokens.text.primary,
      tokens.text.secondary,
    ]
  );

  return (
    <FlatList
      data={feedRows}
      keyExtractor={(item) => item.key}
      renderItem={renderFeedRow}
      ListHeaderComponent={listHeader}
      contentContainerStyle={[styles.scrollContent, { gap: 0, paddingBottom: 110 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={5}
      removeClippedSubviews={Platform.OS === 'android'}
    />
  );
});

const makeTabStyles = (tokens: ThemeTokens) => {
  const palette = getSplitsPalette(tokens, tokens.isDark);
  const cardBg = palette.tonalCard;
  const innerChipBg = palette.sheetSurface;
  const faintBorder = tokens.isDark
    ? 'rgba(255, 255, 255, 0.10)'
    : tokens.border.subtle;
  const subtleHairline = tokens.isDark
    ? 'rgba(255, 255, 255, 0.08)'
    : tokens.border.subtle;

  return StyleSheet.create({
    filterChip: {
      paddingHorizontal: 11,
      minHeight: 28,
      justifyContent: 'center',
      borderRadius: RADIUS.sm,
      backgroundColor: tokens.isDark ? 'rgba(255, 255, 255, 0.05)' : tokens.bg.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: faintBorder,
    },
    filterChipActive: {
      backgroundColor: tokens.accent.primary,
      borderColor: tokens.accent.primary,
    },
    filterChipText: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.secondary,
      includeFontPadding: false,
    },
    filterChipTextActive: {
      fontFamily: FONT_FAMILY.bold,
      color: tokens.accent.onPrimary,
      includeFontPadding: false,
    },
    newRoutinePillBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      minHeight: 28,
    },
    newRoutinePillText: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.accent.onPrimary,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: innerChipBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: subtleHairline,
      borderRadius: RADIUS.inner,
      paddingHorizontal: SPACE[12],
      height: 38,
      marginTop: SPACE[8],
      marginBottom: SPACE[4],
      gap: SPACE[8],
    },
    searchInput: {
      flex: 1,
      color: tokens.text.primary,
      fontSize: 14,
      fontFamily: FONT_FAMILY.body,
      paddingVertical: 0,
    },
    compactEmptyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: cardBg,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginTop: SPACE[8],
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: faintBorder,
    },
    compactCreateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: tokens.accent.primary,
      paddingHorizontal: 11,
      minHeight: 30,
      borderRadius: RADIUS.sm,
      flexShrink: 0,
    },
    emptyBoxTitle: {
      fontSize: 14,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.primary,
    },
    emptyBoxSub: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.regular,
      color: tokens.text.secondary,
      marginTop: 1,
    },
    routineCard: {
      backgroundColor: cardBg,
      borderRadius: 18,
      padding: SPACE[12],
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: faintBorder,
    },
    routineCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    routineName: {
      fontSize: 16,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.primary,
      letterSpacing: -0.2,
    },
    routineSubtitle: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.regular,
      color: tokens.text.secondary,
      marginTop: 2,
    },
    kebabBtn: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.inner,
      backgroundColor: innerChipBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    exercisePreviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
      marginBottom: 10,
    },
    previewChip: {
      backgroundColor: innerChipBg,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: RADIUS.sm,
      maxWidth: '46%',
    },
    previewChipText: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.secondary,
    },
    previewChipMore: {
      backgroundColor: tokens.accent.primaryDim,
    },
    previewChipMoreText: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.accent.primary,
    },
    footerActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE[8],
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: subtleHairline,
    },
    assignPillBtn: {
      flex: 1,
      minWidth: 0,
      minHeight: 36,
      borderRadius: RADIUS.md,
      backgroundColor: innerChipBg,
      paddingHorizontal: SPACE[12],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    assignPillBtnText: {
      fontSize: 13,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.primary,
      flexShrink: 1,
    },
    startPillBtn: {
      flex: 1,
      minWidth: 0,
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    startPillBtnText: {
      fontSize: 13,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.accent.onPrimary,
      flexShrink: 1,
    },
    splitCard: {
      backgroundColor: cardBg,
      borderRadius: 18,
      padding: SPACE[12] + 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: faintBorder,
    },
    splitCardActive: {
      borderColor: tokens.isDark
        ? 'rgba(48, 209, 88, 0.36)'
        : 'rgba(22, 163, 74, 0.32)',
      borderWidth: 1,
    },
    splitHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    splitMetaBadge: {
      fontSize: 10,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.muted,
      letterSpacing: 0.6,
      marginBottom: 2,
    },
    splitTitle: {
      fontSize: 17,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.primary,
      letterSpacing: -0.3,
    },
    applyPillBtn: {
      paddingHorizontal: 12,
      minHeight: 28,
      flexShrink: 0,
    },
    applyPillBtnText: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.accent.onPrimary,
    },
    activeStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 6,
      paddingVertical: 4,
      flexShrink: 0,
    },
    activeStatusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    activeStatusText: {
      fontSize: 12.5,
      fontFamily: FONT_FAMILY.bold,
    },
    splitDesc: {
      fontSize: 12.5,
      fontFamily: FONT_FAMILY.regular,
      color: tokens.text.secondary,
      lineHeight: 17,
      marginTop: 6,
      marginBottom: 10,
    },
    workoutsTagTrack: {
      flexDirection: 'row',
      gap: 6,
      paddingVertical: 1,
    },
    workoutTagPill: {
      backgroundColor: innerChipBg,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: RADIUS.sm,
    },
    workoutTagPillText: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.secondary,
    },
  });
};

export default RoutinesTab;
