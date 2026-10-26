import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILY, SPACE } from '../../theme/tokens';
import {
  resolveExerciseTargetMuscle,
  resolveMuscleColor,
  normalizeExerciseKey,
  getBiomechanicalPrescription,
} from '../../utils/gymUtils';
import { getExerciseCatalogue } from './AddExerciseModal';
import { getEquipmentGlyph, TIER_CONFIG } from './ExerciseCardItem';
import { hapticLight, hapticSuccess, hapticSelection } from '../../utils/haptics';

export interface ActiveSwapModalProps {
  visible: boolean;
  exercise: any;
  aiSwapList: any[];
  isAiSwapLoading: boolean;
  colors: any;
  styles?: any;
  onClose: () => void;
  onSelectSwap: (alt: any) => void;
}

export const ActiveSwapModal: React.FC<ActiveSwapModalProps> = React.memo(({
  visible,
  exercise,
  aiSwapList = [],
  isAiSwapLoading = false,
  onClose,
  onSelectSwap,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recommended' | 'all'>('recommended');

  const currentKey = exercise?.name ? normalizeExerciseKey(exercise.name) : '';
  const { targetMuscle } = exercise
    ? resolveExerciseTargetMuscle(exercise.name, exercise.muscle)
    : { targetMuscle: 'Chest' };
  const muscleAccentColor = resolveMuscleColor(targetMuscle);

  // Clean and filter swap alternatives
  const recommendedSwaps = useMemo(() => {
    return (aiSwapList || []).filter(item => {
      if (!item?.name) return false;
      return normalizeExerciseKey(item.name) !== currentKey;
    });
  }, [aiSwapList, currentKey]);

  // Combined search results
  const displayItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // 1. Live Search Active: search both recommended and global catalogue
    if (q) {
      const seen = new Set<string>();
      if (currentKey) seen.add(currentKey);

      const combined: any[] = [];

      // A. Match in recommended swaps first (they have SFR reasons!)
      for (const item of recommendedSwaps) {
        const key = normalizeExerciseKey(item.name);
        if (seen.has(key)) continue;

        const nameMatch = item.name.toLowerCase().includes(q);
        const muscleMatch = item.muscle?.toLowerCase().includes(q);
        const reasonMatch = item.reason?.toLowerCase().includes(q);

        if (nameMatch || muscleMatch || reasonMatch) {
          seen.add(key);
          combined.push({
            ...item,
            isRecommended: true,
          });
        }
      }

      // B. Match in global 45+ exercise catalogue
      const catalogue = getExerciseCatalogue();
      for (const catEntry of catalogue) {
        const key = normalizeExerciseKey(catEntry.name);
        if (seen.has(key)) continue;

        const nameMatch = catEntry.name.toLowerCase().includes(q);
        const muscleMatch = catEntry.muscle?.toLowerCase().includes(q);
        const aliasMatch = Array.isArray(catEntry.aliases) && catEntry.aliases.some((a: string) => a.toLowerCase().includes(q));

        if (nameMatch || muscleMatch || aliasMatch) {
          seen.add(key);
          const rx = getBiomechanicalPrescription(catEntry.name, catEntry.muscle);
          combined.push({
            id: catEntry.id || key,
            name: catEntry.name,
            muscle: catEntry.muscle,
            tier: catEntry.tier || 'A Tier',
            targetSets: catEntry.targetSets || rx.targetSets || 3,
            targetReps: catEntry.targetReps || rx.targetReps || '8-12',
            restTimeSecs: catEntry.restTimeSecs || rx.restTimeSecs || 90,
            videoId: catEntry.videoId || '',
            isRecommended: false,
          });
        }
      }

      return combined;
    }

    // 2. Idle State - Tab 1: Recommended SFR Swaps
    if (activeTab === 'recommended') {
      return recommendedSwaps.map(item => ({ ...item, isRecommended: true }));
    }

    // 3. Idle State - Tab 2: All Exercises catalogue
    const catalogue = getExerciseCatalogue();
    const catalogueItems: any[] = [];
    const sameMuscleItems: any[] = [];
    const otherItems: any[] = [];

    const normTargetMuscle = (targetMuscle || '').toLowerCase();

    for (const catEntry of catalogue) {
      const key = normalizeExerciseKey(catEntry.name);
      if (key === currentKey) continue;

      const rx = getBiomechanicalPrescription(catEntry.name, catEntry.muscle);
      const item = {
        id: catEntry.id || key,
        name: catEntry.name,
        muscle: catEntry.muscle,
        tier: catEntry.tier || 'A Tier',
        targetSets: catEntry.targetSets || rx.targetSets || 3,
        targetReps: catEntry.targetReps || rx.targetReps || '8-12',
        restTimeSecs: catEntry.restTimeSecs || rx.restTimeSecs || 90,
        videoId: catEntry.videoId || '',
        isRecommended: false,
      };

      if ((catEntry.muscle || '').toLowerCase().includes(normTargetMuscle)) {
        sameMuscleItems.push(item);
      } else {
        otherItems.push(item);
      }
    }

    return [...sameMuscleItems, ...otherItems];
  }, [searchQuery, activeTab, recommendedSwaps, currentKey, targetMuscle]);

  const handleSelect = useCallback((item: any) => {
    hapticSuccess();
    Keyboard.dismiss();
    onSelectSwap(item);
  }, [onSelectSwap]);

  if (!visible || !exercise) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={localStyles.overlay}>
        {/* Backdrop dismiss */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={localStyles.sheetContent}
        >
          {/* Top Handle */}
          <View style={localStyles.handleContainer}>
            <View style={localStyles.handle} />
          </View>

          {/* Header */}
          <View style={localStyles.header}>
            <View style={localStyles.headerLeft}>
              <View style={localStyles.headerIconBox}>
                <Ionicons name="swap-horizontal" size={20} color="#a599ff" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={localStyles.titleRow}>
                  <Text style={localStyles.title}>Exercise Swap</Text>
                  <View style={[localStyles.muscleBadge, { borderColor: `${muscleAccentColor}55`, backgroundColor: `${muscleAccentColor}18` }]}>
                    <View style={[localStyles.muscleDot, { backgroundColor: muscleAccentColor }]} />
                    <Text style={[localStyles.muscleBadgeText, { color: muscleAccentColor }]}>{targetMuscle}</Text>
                  </View>
                </View>
                <Text style={localStyles.subtitle} numberOfLines={1}>
                  Swap with biomechanical SFR alternative or search database
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={localStyles.closeBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color="#8e8e93" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={localStyles.searchBar}>
            <Ionicons name="search-outline" size={17} color="#8E8E93" style={{ marginRight: 8 }} />
            <TextInput
              style={localStyles.searchInput}
              placeholder="Search exercise to swap (e.g. Incline DB, Bench)..."
              placeholderTextColor="#636366"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={localStyles.clearSearchBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Pills (Shown when search is idle) */}
          {!searchQuery.trim() && (
            <View style={localStyles.tabRow}>
              <TouchableOpacity
                style={[localStyles.tabPill, activeTab === 'recommended' && localStyles.tabPillActive]}
                onPress={() => {
                  hapticLight();
                  setActiveTab('recommended');
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="sparkles"
                  size={13}
                  color={activeTab === 'recommended' ? '#000000' : '#A599FF'}
                />
                <Text style={[localStyles.tabText, activeTab === 'recommended' && localStyles.tabTextActive]}>
                  Recommended ({recommendedSwaps.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[localStyles.tabPill, activeTab === 'all' && localStyles.tabPillActive]}
                onPress={() => {
                  hapticLight();
                  setActiveTab('all');
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="albums-outline"
                  size={13}
                  color={activeTab === 'all' ? '#000000' : '#8E8E93'}
                />
                <Text style={[localStyles.tabText, activeTab === 'all' && localStyles.tabTextActive]}>
                  All Exercises
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* List of Swap Options */}
          <FlatList
            data={displayItems}
            keyExtractor={(item, idx) => `${item.name}_${idx}`}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={localStyles.listContent}
            ListEmptyComponent={
              <View style={localStyles.emptyContainer}>
                <Ionicons name="search-outline" size={36} color="#3A3A3C" style={{ marginBottom: 8 }} />
                <Text style={localStyles.emptyTitle}>
                  {searchQuery.trim() ? `No exercises matching "${searchQuery}"` : 'No alternatives available'}
                </Text>
                <Text style={localStyles.emptySub}>
                  {searchQuery.trim() ? 'Try checking your spelling or searching by muscle group.' : 'Try browsing the All Exercises tab.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const tierTheme = item.tier && TIER_CONFIG[item.tier] ? TIER_CONFIG[item.tier] : TIER_CONFIG['A Tier'];
              const itemMuscleColor = resolveMuscleColor(item.muscle);
              const equip = getEquipmentGlyph(item.name);

              return (
                <TouchableOpacity
                  style={localStyles.card}
                  activeOpacity={0.75}
                  onPress={() => handleSelect(item)}
                >
                  {/* Card Header: Exercise Name + Tier Badge */}
                  <View style={localStyles.cardHeader}>
                    <Text style={localStyles.exerciseName} numberOfLines={2}>
                      {item.name}
                    </Text>

                    {tierTheme && (
                      <View
                        style={[
                          localStyles.tierBadge,
                          {
                            backgroundColor: tierTheme.bg,
                            borderColor: tierTheme.border,
                          },
                        ]}
                      >
                        <Text style={[localStyles.tierBadgeText, { color: tierTheme.text }]}>
                          {item.tier}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Muscle & Equipment Tags */}
                  <View style={localStyles.tagsRow}>
                    <View style={localStyles.muscleTag}>
                      <View style={[localStyles.muscleDot, { backgroundColor: itemMuscleColor }]} />
                      <Text style={localStyles.muscleTagText}>{item.muscle || targetMuscle}</Text>
                    </View>

                    <View style={localStyles.equipmentTag}>
                      <Ionicons name={equip.icon} size={12} color={equip.color} />
                      <Text style={[localStyles.equipmentTagText, { color: equip.color }]}>{equip.type}</Text>
                    </View>

                    {item.isRecommended && (
                      <View style={localStyles.recommendedTag}>
                        <Ionicons name="flash" size={11} color="#FFD700" />
                        <Text style={localStyles.recommendedTagText}>SFR Match</Text>
                      </View>
                    )}
                  </View>

                  {/* Biomechanical Reason Highlight */}
                  {item.reason ? (
                    <View style={localStyles.reasonContainer}>
                      <Ionicons name="sparkles" size={12} color="#a599ff" style={{ marginTop: 2 }} />
                      <Text style={localStyles.reasonText} numberOfLines={2}>
                        {item.reason}
                      </Text>
                    </View>
                  ) : null}

                  {/* Card Footer: Sets / Reps / Rest + Swap Action */}
                  <View style={localStyles.cardFooter}>
                    <View style={localStyles.metaRow}>
                      <View style={localStyles.metaChip}>
                        <Ionicons name="barbell-outline" size={12} color="#8E8E93" />
                        <Text style={localStyles.metaText}>
                          {item.targetSets || 3} Sets × {item.targetReps || '8-12'}
                        </Text>
                      </View>

                      <View style={localStyles.metaChip}>
                        <Ionicons name="stopwatch-outline" size={12} color="#8E8E93" />
                        <Text style={localStyles.metaText}>
                          {item.restTimeSecs || 90}s Rest
                        </Text>
                      </View>
                    </View>

                    <View style={localStyles.actionCircle}>
                      <Ionicons name="swap-horizontal" size={15} color="#A599FF" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
});

const localStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#121214',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1F1F24',
    borderBottomWidth: 0,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '88%',
    flex: 1,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  headerIconBox: {
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(165, 153, 255, 0.25)',
    borderRadius: 12,
    padding: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  muscleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  muscleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  muscleBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
  },
  subtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13.5,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  tabText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11.5,
    color: '#8E8E93',
  },
  tabTextActive: {
    color: '#000000',
  },
  listContent: {
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  exerciseName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    flex: 1,
    lineHeight: 20,
  },
  tierBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  tierBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  muscleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  muscleTagText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#AEAEB2',
  },
  equipmentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  equipmentTagText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
  },
  recommendedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  recommendedTagText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    color: '#FFD700',
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(165, 153, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(165, 153, 255, 0.16)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
    marginBottom: 6,
  },
  reasonText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#D0C9FF',
    flex: 1,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  metaText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
  },
  actionCircle: {
    backgroundColor: 'rgba(165, 153, 255, 0.14)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(165, 153, 255, 0.3)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#636366',
    textAlign: 'center',
  },
});

export default ActiveSwapModal;
