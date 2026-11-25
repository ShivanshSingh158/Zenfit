import React, { useState, useMemo, useCallback } from 'react';
import { FlatList, Pressable, View, Text, TextInput, StyleSheet, Keyboard, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import {
  X,
  ArrowLeftRight,
  Search,
  Dumbbell,
  Plus,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import {
  normalizeExerciseKey,
  getBiomechanicalPrescription,
} from '../../utils/gymUtils';
import {
  getBiomechanicalSwaps,
  BiomechanicalSwapRecommendation,
} from '../../services/biomechanicalMatchingEngine';
import { resolveExerciseEquipment } from '../../utils/equipmentResolver';
import { getExerciseCatalogue } from '../Gym/exercise/AddExerciseModal';
import { CreateCustomExerciseModal, CustomExerciseItem } from '../Gym/exercise/CreateCustomExerciseModal';
import { hapticSuccess, hapticSelection } from '../../utils/haptics';
import {
  resolveExercise,
  getExerciseStillPosterUrl,
  getExerciseThumbnailUrl,
} from '../../services/exerciseMediaService';
import { AppBottomSheet } from '../ui/AppBottomSheet';
import { TactileButton } from '../ui/TactileButton';
import { NumericText } from '../ui/NumericText';
import { AppIcon } from '../ui/AppIcon';
import { useLatestNonNull } from '../../hooks/useLatestNonNull';

export interface ActiveSwapModalProps {
  visible: boolean;
  exercise: any;
  aiSwapList?: any[];
  isAiSwapLoading?: boolean;
  colors?: any;
  styles?: any;
  onClose: () => void;
  onSelectSwap: (alt: any) => void;
}

const EQUIPMENT_CHIPS = ['All', 'Dumbbell', 'Barbell', 'Cable', 'Machine', 'Bodyweight'];
const MUSCLE_PILLS = ['All Muscles', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Abs'];

export const ActiveSwapModal: React.FC<ActiveSwapModalProps> = React.memo(
  ({ visible, exercise, onClose, onSelectSwap }) => {
    const insets = useSafeAreaInsets();
    const { tokens, isDark } = useTheme();
    const sheetBg = isDark ? '#0B0C10' : '#F8F8FA';
    const cardBg = isDark ? '#14161D' : '#FFFFFF';
    const pillBg = isDark ? '#181B24' : tokens.bg.elevated;
    const hairline = isDark ? 'rgba(255, 255, 255, 0.08)' : tokens.border.subtle;
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEquip, setSelectedEquip] = useState<string>('All');
    const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
    const activeExercise = useLatestNonNull(exercise);

    const currentKey = activeExercise?.name ? normalizeExerciseKey(activeExercise.name) : '';
    const currentEquipment = useMemo(
      () =>
        activeExercise?.name ? resolveExerciseEquipment(activeExercise.name) : 'Machine',
      [activeExercise?.name]
    );

    const swapResult = useMemo(() => {
      if (!visible || !activeExercise?.name) return null;
      return getBiomechanicalSwaps(activeExercise.name, activeExercise.muscle);
    }, [visible, activeExercise?.name, activeExercise?.muscle]);

    const isSearching = searchQuery.trim().length > 0;
    const isFiltering = isSearching || selectedEquip !== 'All' || selectedMuscle !== null;

    // Defer getExerciseCatalogue() until searching or filtering
    const fullCatalogue = useMemo(
      () => (visible && isFiltering ? getExerciseCatalogue() : []),
      [visible, isFiltering]
    );

    const searchResults = useMemo(() => {
      if (!visible || !isFiltering) return [];
      const q = searchQuery.trim().toLowerCase();

      const seen = new Set<string>();
      if (currentKey) seen.add(currentKey);

      const matches: BiomechanicalSwapRecommendation[] = [];
      const targetDiv = swapResult?.targetDivision || 'Target Muscle';

      for (const item of fullCatalogue) {
        const key = normalizeExerciseKey(item.name);
        if (seen.has(key)) continue;

        const iName = (item.name || '').toLowerCase();
        const iMuscle = (item.muscle || '').toLowerCase();
        const equip = resolveExerciseEquipment(item.name);

        if (selectedEquip !== 'All' && equip.toLowerCase() !== selectedEquip.toLowerCase()) {
          continue;
        }

        if (selectedMuscle && selectedMuscle !== 'All Muscles') {
          if (!iMuscle.includes(selectedMuscle.toLowerCase()) && !iName.includes(selectedMuscle.toLowerCase())) {
            continue;
          }
        }

        if (q && !iName.includes(q) && !iMuscle.includes(q)) {
          continue;
        }

        seen.add(key);
        const rx = getBiomechanicalPrescription(item.name, item.muscle);
        const existingAlt = swapResult?.allSubstitutes.find(
          (s) => normalizeExerciseKey(s.name) === key
        );

        matches.push({
          id: `search_${key}`,
          name: item.name,
          equipment: equip,
          targetMuscle: item.muscle || targetDiv,
          muscleDivision:
            existingAlt?.muscleDivision || item.muscle || targetDiv,
          matchPercentage: existingAlt?.matchPercentage || 88,
          reason:
            existingAlt?.reason ||
            `Viable alternative movement for ${item.muscle || targetDiv}.`,
          targetSets: item.targetSets || rx.targetSets || 3,
          targetReps: item.targetReps || rx.targetReps || '8–12',
          restTimeSecs: item.restTimeSecs || rx.restTimeSecs || 90,
          videoId: item.videoId || existingAlt?.videoId,
        });

        if (matches.length >= 25) break;
      }

      return matches;
    }, [visible, isFiltering, searchQuery, selectedEquip, selectedMuscle, currentKey, fullCatalogue, swapResult]);

    const handleSelect = useCallback(
      (item: BiomechanicalSwapRecommendation) => {
        hapticSuccess();
        Keyboard.dismiss();
        onSelectSwap(item);
      },
      [onSelectSwap]
    );

    const handleCreatedCustom = useCallback(
      (item: CustomExerciseItem) => {
        setShowCreateModal(false);
        const rx = getBiomechanicalPrescription(item.name, item.muscle);
        onSelectSwap({
          id: `custom_${item.id}`,
          name: item.name,
          targetMuscle: item.muscle,
          muscleDivision: item.muscle,
          equipment: item.equipment,
          targetSets: rx.targetSets || 3,
          targetReps: rx.targetReps || '8–12',
          restTimeSecs: rx.restTimeSecs || 90,
        });
      },
      [onSelectSwap]
    );

    const directSubstitutes = swapResult?.directSubstitutes || [];
    const equipmentVariants = swapResult?.equipmentVariants || [];

    const swapRows = useMemo(() => {
      type RowItem =
        | { type: 'header'; key: string; title: string; subtitle?: string; accent?: boolean }
        | { type: 'item'; key: string; item: BiomechanicalSwapRecommendation }
        | { type: 'empty'; key: string };

      const rows: RowItem[] = [];
      if (isFiltering) {
        rows.push({
          type: 'header',
          key: 'hdr_search',
          title: 'FILTERED RESULTS',
          subtitle: `${searchResults.length} ${searchResults.length === 1 ? 'match' : 'matches'} found`,
          accent: true,
        });
        if (searchResults.length === 0) {
          rows.push({ type: 'empty', key: 'empty_search' });
        } else {
          for (const it of searchResults) {
            rows.push({ type: 'item', key: `search_${it.id}`, item: it });
          }
        }
      } else {
        rows.push({
          type: 'header',
          key: 'hdr_direct',
          title: `BEST MATCHES FOR ${String(swapResult?.targetDivision || 'MUSCLE').toUpperCase()}`,
        });
        for (const it of directSubstitutes) {
          rows.push({ type: 'item', key: `direct_${it.id}`, item: it });
        }
        if (equipmentVariants.length > 0) {
          rows.push({
            type: 'header',
            key: 'hdr_equip',
            title: 'OTHER EQUIPMENT',
          });
          for (const it of equipmentVariants) {
            rows.push({ type: 'item', key: `equip_${it.id}`, item: it });
          }
        }
      }
      return rows;
    }, [isFiltering, searchResults, directSubstitutes, equipmentVariants, swapResult?.targetDivision]);

    // Rules of Hooks: conditional return placed AFTER all hooks
    if (!activeExercise) return null;

    return (
      <AppBottomSheet
        visible={visible}
        onClose={onClose}
        fullHeight
        noPadding
        avoidKeyboard
        sheetBackgroundColor={sheetBg}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: tokens.space.lg,
            paddingBottom: Math.max(insets.bottom, tokens.space.lg),
            paddingTop: tokens.space.sm,
          }}
        >
          <View style={modalStyles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[tokens.typography.h2, { color: tokens.text.primary }]}>
                Swap Exercise
              </Text>
              <Text
                style={[
                  tokens.typography.caption,
                  { color: tokens.text.secondary, marginTop: 2 },
                ]}
                numberOfLines={1}
              >
                Replacing {activeExercise.name} · {currentEquipment}
              </Text>
            </View>

            <TactileButton
              variant="icon"
              size="sm"
              onPress={onClose}
              accessibilityLabel="Close exercise swap"
            >
              <AppIcon icon={X} size={16} color={tokens.text.secondary} />
            </TactileButton>
          </View>

          <View
            style={[
              modalStyles.searchBar,
              {
                backgroundColor: cardBg,
                borderRadius: tokens.radius.card,
                borderColor: hairline,
              },
            ]}
          >
            <AppIcon icon={Search} size={18} color={tokens.text.secondary} />
            <TextInput
              style={[
                modalStyles.searchInput,
                {
                  color: tokens.text.primary,
                  fontFamily: tokens.font.medium,
                },
              ]}
              placeholder="Search all alternatives..."
              placeholderTextColor={tokens.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TactileButton
                variant="icon"
                onPress={() => setSearchQuery('')}
                style={{ backgroundColor: 'transparent', borderWidth: 0 }}
                accessibilityLabel="Clear search"
              >
                <AppIcon icon={X} size={16} color={tokens.text.secondary} />
              </TactileButton>
            )}
          </View>

          {/* Equipment & Muscle Filter Chips */}
          <View style={{ marginBottom: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
              {EQUIPMENT_CHIPS.map((chip) => {
                const isSelected = selectedEquip === chip;
                return (
                  <Pressable
                    key={`equip-${chip}`}
                    onPress={() => {
                      hapticSelection();
                      setSelectedEquip(chip);
                    }}
                    style={[
                      modalStyles.filterChip,
                      {
                        backgroundColor: isSelected ? tokens.accent.primary : pillBg,
                        borderColor: isSelected ? tokens.accent.primary : hairline,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        tokens.typography.caption,
                        {
                          fontFamily: tokens.font.medium,
                          color: isSelected ? tokens.accent.onPrimary : tokens.text.secondary,
                        },
                      ]}
                    >
                      {chip}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 6, paddingVertical: 2 }}>
              {MUSCLE_PILLS.map((pill) => {
                const isSelected = (selectedMuscle === pill) || (pill === 'All Muscles' && selectedMuscle === null);
                return (
                  <Pressable
                    key={`muscle-${pill}`}
                    onPress={() => {
                      hapticSelection();
                      setSelectedMuscle(pill === 'All Muscles' ? null : pill);
                    }}
                    style={[
                      modalStyles.filterChip,
                      {
                        backgroundColor: isSelected ? tokens.accent.primary : pillBg,
                        borderColor: isSelected ? tokens.accent.primary : hairline,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        tokens.typography.caption,
                        {
                          fontFamily: tokens.font.medium,
                          color: isSelected ? tokens.accent.onPrimary : tokens.text.secondary,
                        },
                      ]}
                    >
                      {pill}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <FlatList
            style={{ flex: 1 }}
            data={swapRows}
            keyExtractor={(row) => row.key}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            nestedScrollEnabled
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            contentContainerStyle={modalStyles.scrollContainer}
            renderItem={({ item: row }) => {
              if (row.type === 'header') {
                return (
                  <View style={modalStyles.sectionHeaderRow}>
                    <Text
                      style={[
                        tokens.typography.overline,
                        { color: row.accent ? tokens.accent.primary : tokens.text.secondary },
                      ]}
                    >
                      {row.title}
                    </Text>
                    {row.subtitle ? (
                      <Text
                        style={[
                          tokens.typography.caption,
                          { color: tokens.text.secondary, marginTop: 2 },
                        ]}
                      >
                        {row.subtitle}
                      </Text>
                    ) : null}
                  </View>
                );
              }
              if (row.type === 'empty') {
                return (
                  <View style={modalStyles.emptySearchBox}>
                    <AppIcon icon={Search} size={28} color={tokens.text.muted} />
                    <Text
                      style={[
                        tokens.typography.title,
                        { color: tokens.text.primary, marginTop: 8 },
                      ]}
                    >
                      No matching exercises
                    </Text>
                    <Text
                      style={[
                        tokens.typography.caption,
                        { color: tokens.text.secondary, textAlign: 'center' },
                      ]}
                    >
                      Try typing a different muscle or movement pattern.
                    </Text>
                    <TactileButton
                      variant="primary"
                      size="sm"
                      haptic="selection"
                      onPress={() => setShowCreateModal(true)}
                      style={{ marginTop: 14 }}
                    >
                      <AppIcon icon={Plus} size={14} color={tokens.accent.onPrimary} />
                      <Text style={[tokens.typography.label, { color: tokens.accent.onPrimary, marginLeft: 4 }]}>
                        Create Custom Exercise
                      </Text>
                    </TactileButton>
                  </View>
                );
              }
              return (
                <SwapRecommendationCard
                  item={row.item}
                  cardBg={cardBg}
                  hairline={hairline}
                  onSelect={() => handleSelect(row.item)}
                />
              );
            }}
          />
        </View>
        <CreateCustomExerciseModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreatedCustom}
        />
      </AppBottomSheet>
    );
  }
);

const SwapRecommendationCard: React.FC<{
  item: BiomechanicalSwapRecommendation;
  cardBg?: string;
  hairline?: string;
  onSelect: () => void;
}> = React.memo(({ item, cardBg, hairline, onSelect }) => {
  const { tokens, isDark } = useTheme();
  const def = resolveExercise(item.name);
  const stillUrl = def ? getExerciseStillPosterUrl(def) : '';
  const fallbackThumb = def ? getExerciseThumbnailUrl(def) : '';
  const resolvedCardBg = cardBg || (isDark ? '#14161D' : '#FFFFFF');
  const resolvedHairline = hairline || (isDark ? 'rgba(255,255,255,0.08)' : tokens.border.subtle);

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        modalStyles.card,
        {
          backgroundColor: resolvedCardBg,
          borderRadius: 16,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderColor: resolvedHairline,
        },
        pressed && { opacity: 0.78 },
      ]}
    >
      <View style={modalStyles.cardMainRow}>
        <View
          style={[
            modalStyles.thumbBox,
            {
              backgroundColor: tokens.bg.mediaLight,
              borderRadius: 10,
              borderColor: resolvedHairline,
            },
          ]}
        >
          {stillUrl || fallbackThumb ? (
            <ExpoImage
              source={{ uri: stillUrl || fallbackThumb }}
              placeholder={fallbackThumb ? { uri: fallbackThumb } : undefined}
              style={modalStyles.thumbImg}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          ) : (
            <AppIcon icon={Dumbbell} size={18} color={tokens.text.secondary} />
          )}
        </View>

        <View style={modalStyles.cardCenterCol}>
          <Text
            style={[tokens.typography.label, { color: tokens.text.primary }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>

          <NumericText
            style={[tokens.typography.caption, { color: tokens.text.secondary }]}
            numberOfLines={1}
          >
            {item.muscleDivision || item.targetMuscle} · {item.equipment} · {item.targetSets} × {item.targetReps}
          </NumericText>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            minHeight: 28,
            paddingHorizontal: 11,
            borderRadius: 9,
            backgroundColor: tokens.accent.primary,
          }}
        >
          <AppIcon
            icon={ArrowLeftRight}
            size={11}
            color={tokens.accent.onPrimary}
          />
          <Text
            style={{
              fontSize: 11.5,
              fontFamily: tokens.font.bold,
              color: tokens.accent.onPrimary,
            }}
          >
            Swap
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

const modalStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 8,
  },
  currentMovementBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  currentMovementIconBox: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentEquipmentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 4,
    minHeight: 40,
    marginBottom: 12,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  scrollContainer: {
    paddingBottom: 28,
  },
  sectionHeaderRow: {
    paddingVertical: 6,
    marginBottom: 6,
  },
  topBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  card: {
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumbBox: {
    width: 42,
    height: 42,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  thumbImg: {
    width: 38,
    height: 38,
  },
  cardCenterCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  matchBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  equipmentTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderLeftWidth: 2,
  },
  emptySearchBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 4,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default ActiveSwapModal;
