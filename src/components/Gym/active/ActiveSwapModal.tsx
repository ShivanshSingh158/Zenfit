/**
 * ActiveSwapModal.tsx — ZenFit
 *
 * Biomechanical Exercise Swap Modal (OpenGym Architecture)
 * - Mode 1: Search & Filter Chips (Same muscle, Chosen, Type, Equipment, Suggested substitutes)
 * - Mode 2: Interactive 'By muscle' Front & Back Mannequin Body Map
 * - High-speed instant WebP still thumbnails + 1-tap swap action
 */

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
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { FONT_FAMILY } from '../../../theme/tokens';
import {
  resolveExerciseTargetMuscle,
  normalizeExerciseKey,
  getBiomechanicalPrescription,
  canonicalizeMuscle,
} from '../../../utils/gymUtils';
import { getExerciseCatalogue } from '../exercise/AddExerciseModal';
import { getEquipmentGlyph } from '../exercise/ExerciseCardItem';
import { hapticLight, hapticSuccess, hapticSelection } from '../../../utils/haptics';
import { resolveExercise, getExerciseStillPosterUrl } from '../../../services/exerciseMediaService';
import { BODY_PATHS, getMergedInertPath, getMergedMusclePath } from '../metrics/bodyPaths';
import { INERT } from '../../../services/muscleRecoveryService';

export interface ActiveSwapModalProps {
  visible: boolean;
  exercise: any;
  aiSwapList: any[];
  isAiSwapLoading: boolean;
  colors?: any;
  styles?: any;
  onClose: () => void;
  onSelectSwap: (alt: any) => void;
}

export function mapToMajorMuscleGroup(muscleStr?: string, nameStr?: string): string {
  const m = (muscleStr || '').toLowerCase();
  const n = (nameStr || '').toLowerCase();
  if (m.includes('trap') || n.includes('shrug')) return 'Traps';
  if (m.includes('shoulder') || m.includes('delt') || n.includes('lateral raise') || n.includes('overhead press') || n.includes('shoulder press')) return 'Shoulders';
  if (m.includes('chest') || m.includes('pec') || n.includes('bench') || n.includes('chest fly') || n.includes('push-up') || n.includes('pushup')) return 'Chest';
  if (m.includes('back') || m.includes('lat') || n.includes('pull-up') || n.includes('pulldown') || n.includes('row') || n.includes('chin-up')) return 'Back';
  if (m.includes('bicep') || m.includes('brachialis') || n.includes('bicep') || n.includes('curl')) return 'Biceps';
  if (m.includes('tricep') || n.includes('tricep') || n.includes('pushdown') || n.includes('skull crusher')) return 'Triceps';
  if (m.includes('quad') || n.includes('squat') || n.includes('leg press') || n.includes('leg extension') || n.includes('lunge')) return 'Quads';
  if (m.includes('hamstring') || n.includes('deadlift') || n.includes('leg curl') || n.includes('rdl')) return 'Hamstrings';
  if (m.includes('glute') || m.includes('abductor') || n.includes('hip thrust')) return 'Glutes';
  if (m.includes('calf') || m.includes('calves') || m.includes('gastrocnemius') || m.includes('soleus') || m.includes('tibialis')) return 'Calves';
  if (m.includes('ab') || m.includes('oblique') || m.includes('core') || n.includes('crunch') || n.includes('plank')) return 'Abs';
  if (m.includes('forearm') || m.includes('wrist') || m.includes('grip')) return 'Forearms';
  return 'Other';
}

const MUSCLE_TO_SLUGS: Record<string, string[]> = {
  Chest: ['chest'],
  Back: ['upper-back', 'lower-back', 'trapezius'],
  Shoulders: ['deltoids'],
  Biceps: ['biceps'],
  Triceps: ['triceps'],
  Quads: ['quadriceps'],
  Hamstrings: ['hamstring'],
  Calves: ['calves'],
  Abs: ['abs', 'obliques'],
  Forearms: ['forearm'],
  Glutes: ['gluteal'],
  Traps: ['trapezius'],
};

export const ActiveSwapModal: React.FC<ActiveSwapModalProps> = React.memo(({
  visible,
  exercise,
  aiSwapList = [],
  onClose,
  onSelectSwap,
}) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'muscle'>('list');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('Any type');
  const [selectedEquip, setSelectedEquip] = useState<string>('Any equipment');

  const currentKey = exercise?.name ? normalizeExerciseKey(exercise.name) : '';
  const fullCatalogue = useMemo(() => getExerciseCatalogue(), []);
  const { targetMuscle } = exercise
    ? resolveExerciseTargetMuscle(exercise.name, exercise.muscle)
    : { targetMuscle: 'Chest' };

  // Dynamically compute exact muscle exercise counts from catalogue
  const dynamicMuscleCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Traps: 0,
      Shoulders: 0,
      Chest: 0,
      Back: 0,
      Biceps: 0,
      Triceps: 0,
      Abs: 0,
      Quads: 0,
      Hamstrings: 0,
      Glutes: 0,
      Calves: 0,
      Forearms: 0,
    };
    for (const item of fullCatalogue) {
      const grp = mapToMajorMuscleGroup(item.muscle, item.name);
      if (counts[grp] !== undefined) {
        counts[grp]++;
      }
    }
    return counts;
  }, [fullCatalogue]);

  // Recommended swaps from AI / preloaded list
  const recommendedSwaps = useMemo(() => {
    return (aiSwapList || []).filter(item => {
      if (!item?.name) return false;
      return normalizeExerciseKey(item.name) !== currentKey;
    });
  }, [aiSwapList, currentKey]);

  // Combined search and filtered results
  const displayItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const seen = new Set<string>();
    if (currentKey) seen.add(currentKey);

    const matchesFilter = (item: any) => {
      const iMuscle = (item.muscle || '').toLowerCase();
      const iName = (item.name || '').toLowerCase();
      const itemGroup = mapToMajorMuscleGroup(item.muscle, item.name);

      // Muscle filter
      if (selectedMuscle) {
        if (itemGroup.toLowerCase() !== selectedMuscle.toLowerCase() && !iMuscle.includes(selectedMuscle.toLowerCase())) {
          return false;
        }
      } else if (viewMode === 'list' && targetMuscle) {
        const targetGroup = mapToMajorMuscleGroup(targetMuscle, exercise?.name);
        if (itemGroup.toLowerCase() !== targetGroup.toLowerCase() && !iMuscle.includes(targetMuscle.toLowerCase())) {
          return false;
        }
      }

      // Type filter
      if (selectedType !== 'Any type') {
        const t = selectedType.toLowerCase();
        if (!iName.includes(t) && !(item.type || '').toLowerCase().includes(t)) {
          return false;
        }
      }
      // Equipment filter
      if (selectedEquip !== 'Any equipment') {
        const eq = selectedEquip.toLowerCase();
        if (!iName.includes(eq) && !(item.equipment || '').toLowerCase().includes(eq)) {
          return false;
        }
      }
      // Text search
      if (q) {
        return iName.includes(q) || iMuscle.includes(q) || itemGroup.toLowerCase().includes(q);
      }
      return true;
    };

    const results: any[] = [];

    // 1. Recommended items first
    for (const item of recommendedSwaps) {
      const key = normalizeExerciseKey(item.name);
      if (seen.has(key)) continue;
      if (matchesFilter(item)) {
        seen.add(key);
        results.push({ ...item, isRecommended: true });
      }
    }

    // 2. Full exercise catalogue items
    for (const catEntry of fullCatalogue) {
      const key = normalizeExerciseKey(catEntry.name);
      if (seen.has(key)) continue;
      if (matchesFilter(catEntry)) {
        seen.add(key);
        const rx = getBiomechanicalPrescription(catEntry.name, catEntry.muscle);
        results.push({
          id: catEntry.id || key,
          name: catEntry.name,
          muscle: catEntry.muscle,
          targetSets: catEntry.targetSets || rx.targetSets || 3,
          targetReps: catEntry.targetReps || rx.targetReps || '8–12',
          restTimeSecs: catEntry.restTimeSecs || rx.restTimeSecs || 90,
          videoId: catEntry.videoId || '',
          isRecommended: false,
        });
      }
      if (results.length >= 60) break;
    }

    return results;
  }, [searchQuery, selectedMuscle, selectedType, selectedEquip, viewMode, targetMuscle, recommendedSwaps, fullCatalogue, currentKey]);

  const handleSelect = useCallback((item: any) => {
    hapticSuccess();
    Keyboard.dismiss();
    onSelectSwap(item);
  }, [onSelectSwap]);

  // Mannequin Path Rendering for Muscle View
  const frontGeo = BODY_PATHS.male.front;
  const backGeo = BODY_PATHS.male.back;
  const frontInertD = getMergedInertPath(frontGeo, INERT);
  const backInertD = getMergedInertPath(backGeo, INERT);

  const renderMusclePath = (geo: any, slug: string) => {
    const pathD = getMergedMusclePath(geo, slug);
    if (!pathD) return null;

    const activeSlugs = selectedMuscle ? (MUSCLE_TO_SLUGS[selectedMuscle] || []) : [];
    const isSelected = activeSlugs.includes(slug);

    return (
      <Path
        key={slug}
        d={pathD}
        fill={isSelected ? '#30D158' : '#2C2C2E'}
        stroke={isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.1)'}
        strokeWidth={isSelected ? 1.4 : 0.8}
        onPress={() => {
          hapticSelection();
          const foundGroup = Object.entries(MUSCLE_TO_SLUGS).find(([_, slugs]) => slugs.includes(slug));
          if (foundGroup) {
            setSelectedMuscle(foundGroup[0]);
          }
        }}
      />
    );
  };

  if (!visible || !exercise) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[
            styles.sheetContent,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {/* Top Drag Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Top Header Row */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Swap exercise</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                Replacing {exercise.name.toLowerCase()}
              </Text>
            </View>

            {viewMode === 'list' ? (
              <TouchableOpacity
                onPress={() => {
                  hapticSelection();
                  setViewMode('muscle');
                }}
                style={styles.byMuscleBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="body" size={14} color="#30D158" />
                <Text style={styles.byMuscleText}>By muscle</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  hapticSelection();
                  setViewMode('list');
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.allBtnText}>All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Mode 2: Interactive Anatomical Mannequin Body Map ── */}
          {viewMode === 'muscle' && (
            <View style={styles.mannequinCard}>
              <View style={styles.svgRow}>
                <View style={styles.svgBox}>
                  <Svg viewBox={frontGeo.vb} width="95" height="190">
                    <G>
                      <Path d={frontInertD} fill="#242426" stroke="rgba(255,255,255,0.08)" strokeWidth={0.8} />
                      {Object.keys(frontGeo.p).map(slug => renderMusclePath(frontGeo, slug))}
                    </G>
                  </Svg>
                </View>

                <View style={styles.svgBox}>
                  <Svg viewBox={backGeo.vb} width="95" height="190">
                    <G>
                      <Path d={backInertD} fill="#242426" stroke="rgba(255,255,255,0.08)" strokeWidth={0.8} />
                      {Object.keys(backGeo.p).map(slug => renderMusclePath(backGeo, slug))}
                    </G>
                  </Svg>
                </View>
              </View>

              {/* Muscle Counts Strip - Real Dynamic Counts (e.g. Chest: 57, Back: 76) */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.muscleCountsStrip}
              >
                {Object.entries(dynamicMuscleCounts).map(([mName, count]) => {
                  const isSel = selectedMuscle === mName;
                  return (
                    <TouchableOpacity
                      key={mName}
                      onPress={() => {
                        hapticSelection();
                        setSelectedMuscle(isSel ? null : mName);
                      }}
                      style={[styles.muscleCountPill, isSel && styles.muscleCountPillActive]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.muscleCountName, isSel && styles.muscleCountNameActive]}>
                        {mName}
                      </Text>
                      <Text style={[styles.muscleCountNum, isSel && styles.muscleCountNumActive]}>
                        {count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Muscle Filter Indicator */}
              {selectedMuscle && (
                <View style={styles.selectedMuscleHeader}>
                  <Text style={styles.selectedMuscleTitle}>Exercises for {selectedMuscle}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      hapticLight();
                      setSelectedMuscle(null);
                    }}
                  >
                    <Text style={styles.clearSelectionText}>Clear selection</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Search Bar + Result Count */}
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color="#8E8E93" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${fullCatalogue.length} exercises..`}
                placeholderTextColor="#636366"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="search"
              />
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{displayItems.length}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7}>
              <Ionicons name="grid-outline" size={17} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Filter Pills Horizontal Strip — Fixed height, never squished */}
          <View style={styles.filterPillContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsStrip}
            >
              {/* Same Muscle Pill */}
              {(() => {
                const isSameMuscleActive = !selectedMuscle || selectedMuscle.toLowerCase() === targetMuscle.toLowerCase();
                return (
                  <TouchableOpacity
                    style={[
                      styles.filterPill,
                      isSameMuscleActive && styles.filterPillActive,
                    ]}
                    onPress={() => {
                      hapticSelection();
                      setSelectedMuscle(targetMuscle);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="body"
                      size={13}
                      color={isSameMuscleActive ? '#000000' : '#8E8E93'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={isSameMuscleActive ? styles.filterPillTextActive : styles.filterPillText}>
                      Same muscle: {targetMuscle.toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })()}

              {/* Type Filter Pills */}
              {['Any type', 'Strength', 'Calisthenics', 'Plyo'].map(type => {
                const isSel = selectedType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.filterPill, isSel && styles.filterPillActive]}
                    onPress={() => {
                      hapticSelection();
                      setSelectedType(type);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={isSel ? styles.filterPillTextActive : styles.filterPillText}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Equipment Filter Pills */}
              {['Any equipment', 'Body Weight', 'Dumbbell'].map(eq => {
                const isSel = selectedEquip === eq;
                return (
                  <TouchableOpacity
                    key={eq}
                    style={[styles.filterPill, isSel && styles.filterPillActive]}
                    onPress={() => {
                      hapticSelection();
                      setSelectedEquip(eq);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={isSel ? styles.filterPillTextActive : styles.filterPillText}>
                      {eq}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Section Subheader */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>Suggested substitutes</Text>
            <Text style={styles.sectionHeaderSubtitle}>Same movement and muscle</Text>
          </View>

          {/* List of Exercises */}
          <FlatList
            data={displayItems}
            keyExtractor={(item, idx) => `${item.name}_${idx}`}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const equip = getEquipmentGlyph(item.name);
              const mName = item.muscle || targetMuscle;
              const def = resolveExercise(item.name);
              const stillUrl = def ? getExerciseStillPosterUrl(def) : '';

              return (
                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.7}
                  onPress={() => handleSelect(item)}
                >
                  {/* Thumbnail Box */}
                  <View style={styles.thumbBox}>
                    {stillUrl ? (
                      <ExpoImage
                        source={{ uri: stillUrl }}
                        style={styles.thumbImg}
                        contentFit="cover"
                        cachePolicy="disk"
                      />
                    ) : (
                      <Ionicons name="barbell-outline" size={20} color="#8E8E93" />
                    )}
                  </View>

                  {/* Exercise Info */}
                  <View style={styles.cardInfo}>
                    <Text style={styles.exerciseName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.metaSubtitle} numberOfLines={1}>
                      {mName}
                    </Text>
                  </View>

                  {/* Swap Icon Button */}
                  <View style={styles.swapIconBtn}>
                    <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              <TouchableOpacity
                style={styles.createOwnCard}
                onPress={() => {
                  hapticLight();
                  onClose();
                }}
                activeOpacity={0.75}
              >
                <View style={styles.createOwnIconBox}>
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.createOwnTitle}>Create your own exercise</Text>
                  <Text style={styles.createOwnSubtitle}>name + body part, and a photo or video if you like</Text>
                </View>
                <Ionicons name="add" size={18} color="#8E8E93" />
              </TouchableOpacity>
            }
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
});

export default ActiveSwapModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#121214',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: 10,
    paddingHorizontal: 16,
    width: '100%',
    maxHeight: '92%',
    flex: 1,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
    flexShrink: 0,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 6,
    flexShrink: 0,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  byMuscleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.3)',
  },
  byMuscleText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 13,
    color: '#30D158',
  },
  allBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: '#30D158',
  },
  mannequinCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexShrink: 0,
  },
  svgRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 4,
  },
  svgBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  muscleCountsStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    paddingBottom: 4,
  },
  muscleCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
  },
  muscleCountPillActive: {
    backgroundColor: '#30D158',
  },
  muscleCountName: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#FFFFFF',
  },
  muscleCountNameActive: {
    color: '#000000',
    fontFamily: FONT_FAMILY.bold,
  },
  muscleCountNum: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
  },
  muscleCountNumActive: {
    color: '#000000',
    fontFamily: FONT_FAMILY.bold,
  },
  selectedMuscleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  selectedMuscleTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  clearSelectionText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 13,
    color: '#30D158',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexShrink: 0,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 14,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  countBadge: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#8E8E93',
  },
  gridBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillContainer: {
    height: 38,
    maxHeight: 38,
    marginBottom: 12,
    flexShrink: 0,
  },
  filterPillsStrip: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 2,
    height: 38,
  },
  filterPill: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterPillActive: {
    backgroundColor: '#30D158',
    borderColor: '#30D158',
  },
  filterPillText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    color: '#8E8E93',
  },
  filterPillTextActive: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#000000',
  },
  sectionHeaderRow: {
    paddingVertical: 6,
    marginBottom: 4,
    flexShrink: 0,
  },
  sectionHeaderTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  sectionHeaderSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#8E8E93',
    marginTop: 1,
  },
  listContent: {
    paddingBottom: 24,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  thumbBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  exerciseName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  metaSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
  },
  swapIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createOwnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
    gap: 12,
  },
  createOwnIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createOwnTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  createOwnSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
});
