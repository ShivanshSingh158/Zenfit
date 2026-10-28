/**
 * ActiveSwapModal.tsx — ZenFit
 *
 * Biomechanical Exercise Swap Modal (Apple iOS HIG Architecture)
 * - Pure OLED #000000 / #1C1C1E inset grouped cards with 0px borders.
 * - Removed noisy rainbow badges (S-Tier, A-Tier, glowing SFR match pills).
 * - Clean exercise metadata (Target muscle · Equipment · Working sets & reps).
 * - Apple capsule "Swap" action button (#FFFFFF / #000000, radius 999).
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILY } from '../../../theme/tokens';
import {
  resolveExerciseTargetMuscle,
  resolveMuscleColor,
  normalizeExerciseKey,
  getBiomechanicalPrescription,
} from '../../../utils/gymUtils';
import { getExerciseCatalogue } from '../exercise/AddExerciseModal';
import { getEquipmentGlyph } from '../exercise/ExerciseCardItem';
import { hapticLight, hapticSuccess, hapticSelection } from '../../../utils/haptics';

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

export const ActiveSwapModal: React.FC<ActiveSwapModalProps> = React.memo(({
  visible,
  exercise,
  aiSwapList = [],
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

      // A. Match in recommended swaps first (they have SFR reasons)
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

      // B. Match in global exercise catalogue
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
            targetSets: catEntry.targetSets || rx.targetSets || 3,
            targetReps: catEntry.targetReps || rx.targetReps || '8–12',
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
        targetSets: catEntry.targetSets || rx.targetSets || 3,
        targetReps: catEntry.targetReps || rx.targetReps || '8–12',
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
          {/* Top Drag Handle */}
          <View style={localStyles.handleContainer}>
            <View style={localStyles.handle} />
          </View>

          {/* Header */}
          <View style={localStyles.header}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={localStyles.title}>Swap Exercise</Text>
              <Text style={localStyles.subtitle} numberOfLines={1}>
                Swapping: {exercise.name} · {targetMuscle}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={localStyles.closeBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={localStyles.searchBar}>
            <Ionicons name="search-outline" size={16} color="#8E8E93" style={{ marginRight: 8 }} />
            <TextInput
              style={localStyles.searchInput}
              placeholder="Search exercise alternatives..."
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
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={16} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

          {/* Segmented Control Track (Clean Apple HIG) */}
          {!searchQuery.trim() && (
            <View style={localStyles.segmentedTrack}>
              <TouchableOpacity
                style={[localStyles.segmentBtn, activeTab === 'recommended' && localStyles.segmentBtnActive]}
                onPress={() => {
                  hapticSelection();
                  setActiveTab('recommended');
                }}
                activeOpacity={0.8}
              >
                <Text style={[localStyles.segmentText, activeTab === 'recommended' && localStyles.segmentTextActive]}>
                  Recommended ({recommendedSwaps.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[localStyles.segmentBtn, activeTab === 'all' && localStyles.segmentBtnActive]}
                onPress={() => {
                  hapticSelection();
                  setActiveTab('all');
                }}
                activeOpacity={0.8}
              >
                <Text style={[localStyles.segmentText, activeTab === 'all' && localStyles.segmentTextActive]}>
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
                <Ionicons name="search-outline" size={32} color="#48484A" style={{ marginBottom: 8 }} />
                <Text style={localStyles.emptyTitle}>
                  {searchQuery.trim() ? `No exercises matching "${searchQuery}"` : 'No alternatives available'}
                </Text>
                <Text style={localStyles.emptySub}>
                  {searchQuery.trim() ? 'Try checking your spelling or searching by muscle group.' : 'Browse the All Exercises tab for other movements.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const equip = getEquipmentGlyph(item.name);
              const mName = item.muscle || targetMuscle;

              return (
                <View style={localStyles.card}>
                  <View style={localStyles.cardLeft}>
                    <Text style={localStyles.exerciseName} numberOfLines={1}>
                      {item.name}
                    </Text>

                    <Text style={localStyles.metaSubtitle} numberOfLines={1}>
                      {mName} · {equip.type} · {item.targetSets || 3} sets × {item.targetReps || '8–12'}
                    </Text>

                    {item.reason ? (
                      <Text style={localStyles.reasonText} numberOfLines={2}>
                        {item.reason}
                      </Text>
                    ) : null}
                  </View>

                  {/* Clean Apple Action Button */}
                  <TouchableOpacity
                    style={localStyles.swapActionBtn}
                    activeOpacity={0.8}
                    onPress={() => handleSelect(item)}
                  >
                    <Ionicons name="swap-horizontal" size={13} color="#000000" />
                    <Text style={localStyles.swapActionText}>Swap</Text>
                  </TouchableOpacity>
                </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 0,
    paddingTop: 8,
    paddingHorizontal: 14,
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
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 8,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    borderWidth: 0,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    padding: 2.5,
    marginBottom: 10,
    gap: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#3A3A3C',
  },
  segmentText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  segmentTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 24,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 0,
    gap: 12,
  },
  cardLeft: {
    flex: 1,
    gap: 3,
  },
  exerciseName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14.5,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  metaSubtitle: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8E8E93',
  },
  reasonText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#A599FF',
    lineHeight: 16,
    marginTop: 2,
  },
  swapActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  swapActionText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#000000',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 4,
  },
  emptySub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});

export default ActiveSwapModal;
