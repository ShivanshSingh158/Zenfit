import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
} from 'react-native';
import {
  Plus,
  Search,
  X,
  MoreHorizontal,
  Calendar,
  Play,
} from 'lucide-react-native';
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

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* ── Filter Chips Bar ── */}
      <View style={{ marginBottom: SPACE[4] }}>
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
          SECTION 1: MY ROUTINES (Custom Workout Templates)
         ════════════════════════════════════════════════════════════════════ */}
      {showCustomSection && (
        <View style={{ marginBottom: SPACE[8] }}>
          <View style={styles.routinesHeaderRow}>
            <NumericText style={styles.cardSectionLabel}>
              MY WORKOUTS ({customRoutinesList.length})
            </NumericText>

            {customRoutinesList.length > 0 && (
              <TactileButton
                variant="primary"
                size="xs"
                onPress={onCreateRoutine}
                style={tabStyles.newRoutinePillBtn}
              >
                <Plus size={12} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} />
                <Text style={tabStyles.newRoutinePillText} numberOfLines={1}>New Routine</Text>
              </TactileButton>
            )}
          </View>

          {customRoutinesList.length > 2 && (
            <View style={tabStyles.searchBox}>
              <Search size={15} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
              <TextInput
                style={tabStyles.searchInput}
                placeholder="Search workouts or exercises..."
                placeholderTextColor={tokens.text.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={TOUCH.hitSlop}>
                  <X size={16} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
                </Pressable>
              )}
            </View>
          )}

          {customRoutinesList.length === 0 ? (
            <TactileButton
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
                <Plus size={12} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} />
                <Text style={tabStyles.newRoutinePillText}>New Routine</Text>
              </View>
            </TactileButton>
          ) : (
            <View style={{ gap: SPACE[12], marginTop: SPACE[8] }}>
              {displayedCustomRoutines.map((rt, rtIdx) => {
                const totalSets = (rt.exercises || []).reduce((acc, ex) => acc + (Number(ex.targetSets) || 3), 0);
                const estMins = Math.round(totalSets * 2.5);

                return (
                  <View
                    key={rt.id}
                    style={tabStyles.routineCard}
                  >
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
                            {rt.exercises?.length || 0} exercises · {totalSets} sets · ~{estMins}m
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
                        <MoreHorizontal size={16} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={() => onOpenRoutineOptions(rt, rtIdx)}
                      style={({ pressed }) => [tabStyles.exercisePreviewRow, pressed && { opacity: 0.78 }]}
                    >
                      {(rt.exercises || []).slice(0, 2).map((ex, i) => (
                        <View key={`${ex.name}-${i}`} style={tabStyles.previewChip}>
                          <Text style={tabStyles.previewChipText} numberOfLines={1}>
                            {ex.name}
                          </Text>
                        </View>
                      ))}
                      {(rt.exercises?.length || 0) > 2 && (
                        <View style={[tabStyles.previewChip, tabStyles.previewChipMore]}>
                          <NumericText style={tabStyles.previewChipMoreText}>
                            +{(rt.exercises?.length || 0) - 2}
                          </NumericText>
                        </View>
                      )}
                    </Pressable>

                    <View style={tabStyles.footerActionsRow}>
                      <TactileButton
                        variant="custom"
                        size="md"
                        onPress={() => onAssignRoutineTarget(rt)}
                        style={tabStyles.assignPillBtn}
                      >
                        <Calendar size={13} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
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
                        variant="primary"
                        size="md"
                        onPress={() => onStartWorkout(rt)}
                        style={tabStyles.startPillBtn}
                      >
                        <Play size={13} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} />
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
              })}
            </View>
          )}
        </View>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2: CURATED WORKOUT PROGRAMS
         ════════════════════════════════════════════════════════════════════ */}
      {showSplitsSection && (
        <View style={{ marginBottom: SPACE[16] }}>
          <View style={styles.routinesHeaderRow}>
            <Text style={styles.cardSectionLabel}>WORKOUT SPLITS</Text>
          </View>

          <View style={{ gap: SPACE[12], marginTop: SPACE[8] }}>
            {filteredCuratedSplits.map(split => {
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
                  key={split.id}
                  style={[
                    tabStyles.splitCard,
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

                  {/* Uniform Horizontal Workout Sequence Strip */}
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
            })}
          </View>
        </View>
      )}
    </ScrollView>
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
