import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { EXERCISE_DATABASE, ExerciseDBEntry } from '../../data/exerciseDatabase';
import { useTheme } from '../../contexts/ThemeContext';
import { FONT_FAMILY } from '../../theme/tokens';
import { hapticLight, hapticMedium, hapticSuccess, hapticSelection } from '../../utils/haptics';
import {
  resolveExerciseEquipment,
  resolveExerciseMuscleGroup,
  EquipmentCategory,
} from '../../utils/equipmentResolver';

import { VaultEquipmentModal } from '../../components/Gym/exercise/VaultEquipmentModal';
import { VaultMuscleModal } from '../../components/Gym/exercise/VaultMuscleModal';
import { CreateCustomExerciseModal, CustomExerciseItem } from '../../components/Gym/exercise/CreateCustomExerciseModal';
import { AddToDaySheet } from '../../components/Gym/schedule/AddToDaySheet';

const CUSTOM_EXERCISES_STORAGE_KEY = '@zenfit_custom_exercises';
const ITEM_LAYOUT_HEIGHT = 80;

interface PreparedExercise {
  id: string;
  name: string;
  muscle: string;
  tier?: string;
  aliases?: string[];
  equipment: EquipmentCategory;
  muscleGroup: string;
  isCustom?: boolean;
  _searchBlob: string;
}

// Deterministically precompute the static database once at module initialization
const BASE_PREPARED_EXERCISES: PreparedExercise[] = EXERCISE_DATABASE.map((ex) => {
  const eq = resolveExerciseEquipment(ex.name, ex.aliases || []);
  const mg = resolveExerciseMuscleGroup(ex.muscle);
  const blob = `${ex.name} ${ex.muscle} ${(ex.aliases || []).join(' ')} ${eq} ${mg}`.toLowerCase();
  return {
    ...ex,
    equipment: eq,
    muscleGroup: mg,
    _searchBlob: blob,
  };
});

interface ExerciseLibraryProps {
  isEmbedded?: boolean;
}

export default function ExerciseLibraryScreen({ isEmbedded = false }: ExerciseLibraryProps) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentCategory>('All');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('All');

  // Modals visibility
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showMuscleModal, setShowMuscleModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [addToDayTarget, setAddToDayTarget] = useState<PreparedExercise | null>(null);

  // Custom user exercises
  const [customExercises, setCustomExercises] = useState<PreparedExercise[]>([]);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  // Load custom exercises on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CUSTOM_EXERCISES_STORAGE_KEY);
        if (raw && mounted) {
          const parsed: CustomExerciseItem[] = JSON.parse(raw);
          const mapped: PreparedExercise[] = parsed.map((item) => ({
            id: item.id,
            name: item.name,
            muscle: item.muscle,
            tier: item.tier,
            equipment: item.equipment,
            muscleGroup: resolveExerciseMuscleGroup(item.muscle),
            isCustom: true,
            _searchBlob: `${item.name} ${item.muscle} ${item.equipment}`.toLowerCase(),
          }));
          setCustomExercises(mapped);
        }
      } catch (err) {
        console.warn('[ExerciseLibrary] Failed to load custom exercises:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    Animated.sequence([
      Animated.spring(toastAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.delay(2200),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastMessage(null);
    });
  }, [toastAnim]);

  const handleCustomExerciseCreated = useCallback(async (item: CustomExerciseItem) => {
    const newItem: PreparedExercise = {
      id: item.id,
      name: item.name,
      muscle: item.muscle,
      tier: item.tier,
      equipment: item.equipment,
      muscleGroup: resolveExerciseMuscleGroup(item.muscle),
      isCustom: true,
      _searchBlob: `${item.name} ${item.muscle} ${item.equipment}`.toLowerCase(),
    };

    setCustomExercises((prev) => {
      const updated = [newItem, ...prev];
      AsyncStorage.setItem(
        CUSTOM_EXERCISES_STORAGE_KEY,
        JSON.stringify(
          updated.map((u) => ({
            id: u.id,
            name: u.name,
            muscle: u.muscle,
            equipment: u.equipment,
            isCustom: true,
            tier: u.tier,
          }))
        )
      ).catch(() => {});
      return updated;
    });

    hapticSuccess();
    showToast(`✓ Created "${item.name}"`);
  }, [showToast]);

  // Combined and filtered exercise list
  const filteredExercises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const pool = [...customExercises, ...BASE_PREPARED_EXERCISES];

    return pool.filter((ex) => {
      // Equipment filter
      if (selectedEquipment !== 'All' && ex.equipment !== selectedEquipment) {
        return false;
      }

      // Muscle group filter
      if (selectedMuscle !== 'All') {
        const matchesGroup = ex.muscleGroup.toLowerCase() === selectedMuscle.toLowerCase();
        const matchesRaw = ex.muscle.toLowerCase().includes(selectedMuscle.toLowerCase());
        if (!matchesGroup && !matchesRaw) {
          return false;
        }
      }

      // Search query filter
      if (!q) return true;
      return ex._searchBlob.includes(q);
    });
  }, [searchQuery, selectedEquipment, selectedMuscle, customExercises]);

  const handleSelectExercise = useCallback(
    (item: PreparedExercise) => {
      hapticLight();
      navigation.navigate('ExerciseDetail', {
        exerciseId: item.id,
        exerciseName: item.name,
        muscle: item.muscle,
        targetSets: 3,
        targetReps: '8–12',
        restTimeSecs: 90,
      });
    },
    [navigation]
  );

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_LAYOUT_HEIGHT,
    offset: ITEM_LAYOUT_HEIGHT * index,
    index,
  }), []);

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'S Tier': return '#FFD700';
      case 'A+ Tier': return '#A599FF';
      case 'A Tier': return '#5EDA9E';
      case 'B Tier': return '#89DCEB';
      default: return '#8E8E93';
    }
  };

  const renderEquipmentIcon = (eq: EquipmentCategory) => {
    const iconColor = isDark ? '#B0A3FF' : '#6C5CE7';
    switch (eq) {
      case 'Barbell':
        return <Ionicons name="barbell-outline" size={20} color={iconColor} />;
      case 'Dumbbell':
        return <MaterialCommunityIcons name="dumbbell" size={20} color={iconColor} />;
      case 'Cable':
        return <Ionicons name="git-commit-outline" size={20} color={iconColor} />;
      case 'Machine':
        return <Ionicons name="hardware-chip-outline" size={20} color={iconColor} />;
      case 'Kettlebell':
        return <Ionicons name="fitness-outline" size={20} color={iconColor} />;
      case 'Plate':
        return <Ionicons name="disc-outline" size={20} color={iconColor} />;
      case 'Resistance Band':
        return <Ionicons name="infinite-outline" size={20} color={iconColor} />;
      case 'None':
        return <Ionicons name="body-outline" size={20} color={iconColor} />;
      default:
        return <Ionicons name="barbell-outline" size={20} color={iconColor} />;
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: PreparedExercise }) => {
      const tierColor = getTierColor(item.tier);
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleSelectExercise(item)}
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#121118' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
        >
          {/* Equipment Rounded Icon Avatar */}
          <View
            style={[
              styles.avatarContainer,
              {
                backgroundColor: isDark ? '#1C1A27' : '#F1EFFF',
                borderColor: isDark ? 'rgba(165, 153, 255, 0.16)' : 'rgba(108, 92, 231, 0.16)',
              },
            ]}
          >
            {renderEquipmentIcon(item.equipment)}
          </View>

          {/* Center Info */}
          <View style={styles.cardInfo}>
            <View style={styles.cardTitleRow}>
              <Text
                style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {item.isCustom && (
                <View style={styles.customBadge}>
                  <Text style={styles.customBadgeText}>Custom</Text>
                </View>
              )}
            </View>

            {/* Also known as (Aliases) */}
            {(() => {
              if (!item.aliases || item.aliases.length === 0) return null;
              const cleanItemName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              const distinct = item.aliases.filter(a => a.toLowerCase().replace(/[^a-z0-9]/g, '') !== cleanItemName);
              if (distinct.length === 0) return null;

              let displayAlias = distinct.slice(0, 2).join(' • ');
              if (searchQuery && searchQuery.trim().length > 1) {
                const q = searchQuery.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                const matched = distinct.find(a => a.toLowerCase().replace(/[^a-z0-9]/g, '').includes(q));
                if (matched) {
                  const others = distinct.filter(a => a !== matched).slice(0, 1);
                  displayAlias = [matched, ...others].join(' • ');
                }
              }

              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1, marginBottom: 2 }}>
                  <Text style={{ fontSize: 11, color: isDark ? '#A599FF' : '#6C5CE7', marginRight: 3, fontFamily: FONT_FAMILY.bold }}>↳</Text>
                  <Text style={{ fontSize: 10.5, color: isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.50)', fontFamily: FONT_FAMILY.medium }} numberOfLines={1}>
                    Also known as: <Text style={{ color: isDark ? '#DDD6FE' : '#4C1D95', fontFamily: FONT_FAMILY.bold }}>{displayAlias}</Text>
                  </Text>
                </View>
              );
            })()}

            <View style={styles.cardMetaRow}>
              <Text style={[styles.metaMuscleText, { color: colors.accentPrimary || '#A599FF' }]}>
                {item.muscle}
              </Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={[styles.metaEquipmentText, { color: isDark ? '#8E8E93' : '#636366' }]}>
                {item.equipment === 'None' ? 'Bodyweight' : item.equipment}
              </Text>

              {item.tier && (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <View
                    style={[
                      styles.tierBadge,
                      {
                        borderColor: tierColor + '40',
                        backgroundColor: tierColor + '12',
                      },
                    ]}
                  >
                    <Text style={[styles.tierBadgeText, { color: tierColor }]}>{item.tier}</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Right Action Icons: Info & Add */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              onPress={() => handleSelectExercise(item)}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={isDark ? '#8E8E93' : '#636366'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              onPress={() => {
                hapticMedium();
                setAddToDayTarget(item);
              }}
              style={[
                styles.addBtn,
                {
                  backgroundColor: isDark ? 'rgba(165, 153, 255, 0.16)' : 'rgba(108, 92, 231, 0.12)',
                  borderColor: isDark ? 'rgba(165, 153, 255, 0.35)' : 'rgba(108, 92, 231, 0.35)',
                },
              ]}
            >
              <Ionicons
                name="add"
                size={18}
                color={isDark ? '#B0A3FF' : '#6C5CE7'}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [isDark, colors, handleSelectExercise]
  );

  const hasActiveFilters = selectedEquipment !== 'All' || selectedMuscle !== 'All';

  const clearAllFilters = useCallback(() => {
    hapticSelection();
    setSelectedEquipment('All');
    setSelectedMuscle('All');
  }, []);

  const Container = isEmbedded ? View : SafeAreaView;
  const containerProps = isEmbedded
    ? { style: [styles.container, { backgroundColor: colors.background || '#08080A' }] }
    : {
        style: [styles.container, { backgroundColor: colors.background || '#08080A' }],
        edges: ['top' as const],
      };

  return (
    <Container {...containerProps}>
      {!isEmbedded && <StatusBar style={isDark ? 'light' : 'dark'} />}

      {/* ── Sleek Top Navigation Header ── */}
      <View style={styles.topHeader}>
        {!isEmbedded && (
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => {
              hapticLight();
              if (navigation.canGoBack()) navigation.goBack();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={isDark ? '#FFFFFF' : '#000000'}
            />
          </TouchableOpacity>
        )}

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitleText, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>
            Exercise Vault
          </Text>
          <Text style={styles.headerSubtitleText}>
            {filteredExercises.length} movement{filteredExercises.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => {
            hapticLight();
            setShowCreateModal(true);
          }}
          style={[
            styles.createBtn,
            {
              backgroundColor: isDark ? 'rgba(165, 153, 255, 0.14)' : 'rgba(108, 92, 231, 0.1)',
              borderColor: isDark ? 'rgba(165, 153, 255, 0.3)' : 'rgba(108, 92, 231, 0.25)',
            },
          ]}
        >
          <Ionicons name="add" size={16} color={isDark ? '#B0A3FF' : '#6C5CE7'} />
          <Text style={[styles.createBtnText, { color: isDark ? '#B0A3FF' : '#6C5CE7' }]}>
            Create
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Search Input Box ── */}
      <View style={styles.searchWrap}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: isDark ? '#14131B' : '#EFEFF4',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            },
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={isDark ? '#7E7E8A' : '#8E8E93'}
            style={{ marginRight: 8 }}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search exercises, variations..."
            placeholderTextColor={isDark ? '#636270' : '#8E8E93'}
            style={[styles.searchInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && Platform.OS === 'android' && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={isDark ? '#7E7E8A' : '#8E8E93'}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Hevy Side-by-Side Pill Filter Dropdowns ── */}
      <View style={styles.filterPillRow}>
        {/* Equipment Pill */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            hapticLight();
            setShowEquipmentModal(true);
          }}
          style={[
            styles.filterPill,
            selectedEquipment !== 'All'
              ? [
                  styles.filterPillActive,
                  {
                    backgroundColor: isDark ? 'rgba(165, 153, 255, 0.16)' : 'rgba(108, 92, 231, 0.12)',
                    borderColor: colors.accentPrimary || '#A599FF',
                  },
                ]
              : {
                  backgroundColor: isDark ? '#16151F' : '#F2F2F7',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                },
          ]}
        >
          <View style={styles.pillContent}>
            <Ionicons
              name="barbell-outline"
              size={15}
              color={selectedEquipment !== 'All' ? (colors.accentPrimary || '#A599FF') : (isDark ? '#8E8E93' : '#636366')}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.filterPillText,
                {
                  color: selectedEquipment !== 'All'
                    ? (isDark ? '#FFFFFF' : '#1C1C1E')
                    : (isDark ? '#8E8E93' : '#636366'),
                  fontWeight: selectedEquipment !== 'All' ? '700' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {selectedEquipment === 'All' ? 'All Equipment' : selectedEquipment}
            </Text>
          </View>

          {selectedEquipment !== 'All' ? (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                hapticLight();
                setSelectedEquipment('All');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.pillClearBtn}
            >
              <Ionicons name="close-circle" size={16} color={colors.accentPrimary || '#A599FF'} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-down" size={14} color={isDark ? '#636270' : '#8E8E93'} />
          )}
        </TouchableOpacity>

        {/* Muscles Pill */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            hapticLight();
            setShowMuscleModal(true);
          }}
          style={[
            styles.filterPill,
            selectedMuscle !== 'All'
              ? [
                  styles.filterPillActive,
                  {
                    backgroundColor: isDark ? 'rgba(165, 153, 255, 0.16)' : 'rgba(108, 92, 231, 0.12)',
                    borderColor: colors.accentPrimary || '#A599FF',
                  },
                ]
              : {
                  backgroundColor: isDark ? '#16151F' : '#F2F2F7',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                },
          ]}
        >
          <View style={styles.pillContent}>
            <Ionicons
              name="body-outline"
              size={15}
              color={selectedMuscle !== 'All' ? (colors.accentPrimary || '#A599FF') : (isDark ? '#8E8E93' : '#636366')}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.filterPillText,
                {
                  color: selectedMuscle !== 'All'
                    ? (isDark ? '#FFFFFF' : '#1C1C1E')
                    : (isDark ? '#8E8E93' : '#636366'),
                  fontWeight: selectedMuscle !== 'All' ? '700' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {selectedMuscle === 'All' ? 'All Muscles' : selectedMuscle}
            </Text>
          </View>

          {selectedMuscle !== 'All' ? (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                hapticLight();
                setSelectedMuscle('All');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.pillClearBtn}
            >
              <Ionicons name="close-circle" size={16} color={colors.accentPrimary || '#A599FF'} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-down" size={14} color={isDark ? '#636270' : '#8E8E93'} />
          )}
        </TouchableOpacity>
      </View>

      {/* Optional "Clear All Filters" indicator bar if both are active */}
      {hasActiveFilters && (
        <View style={styles.activeFiltersBar}>
          <Text style={[styles.activeFiltersText, { color: isDark ? '#8E8E93' : '#636366' }]}>
            Filtered by: {[
              selectedEquipment !== 'All' ? selectedEquipment : null,
              selectedMuscle !== 'All' ? selectedMuscle : null,
            ].filter(Boolean).join(' • ')}
          </Text>
          <TouchableOpacity onPress={clearAllFilters} hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}>
            <Text style={[styles.clearAllText, { color: colors.accentPrimary || '#A599FF' }]}>
              Clear All
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Main Exercise FlatList ── */}
      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        initialNumToRender={14}
        maxToRenderPerBatch={18}
        windowSize={8}
        getItemLayout={getItemLayout}
        removeClippedSubviews={Platform.OS === 'android' && !isEmbedded}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: isDark ? '#16151F' : '#EFEFF4' },
              ]}
            >
              <Ionicons
                name="barbell-outline"
                size={38}
                color={isDark ? '#4A485A' : '#A0A0A5'}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>
              No Movements Found
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#8E8E93' : '#636366' }]}>
              {searchQuery
                ? `No exercises match "${searchQuery}". Try adjusting your filters or create a custom one.`
                : 'Try clearing your equipment or muscle filters.'}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity
                onPress={clearAllFilters}
                style={[
                  styles.emptyResetBtn,
                  { backgroundColor: isDark ? 'rgba(165, 153, 255, 0.14)' : 'rgba(108, 92, 231, 0.1)' },
                ]}
              >
                <Text style={[styles.emptyResetBtnText, { color: colors.accentPrimary || '#A599FF' }]}>
                  Reset All Filters
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* ── Floating Notification Toast ── */}
      {toastMessage && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastContainer,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.toastBubble,
              {
                backgroundColor: isDark ? '#1C1B26' : '#2D2B3D',
                borderColor: colors.accentPrimary || '#A599FF',
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={18} color="#5EDA9E" style={{ marginRight: 8 }} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </Animated.View>
      )}

      {/* ── Hevy Equipment Filter Bottom Sheet Modal ── */}
      <VaultEquipmentModal
        visible={showEquipmentModal}
        selectedEquipment={selectedEquipment}
        resultCount={filteredExercises.length}
        onSelect={(eq) => setSelectedEquipment(eq)}
        onClear={() => setSelectedEquipment('All')}
        onClose={() => setShowEquipmentModal(false)}
      />

      {/* ── Hevy Muscle Groups Filter Bottom Sheet Modal ── */}
      <VaultMuscleModal
        visible={showMuscleModal}
        selectedMuscle={selectedMuscle}
        resultCount={filteredExercises.length}
        onSelect={(muscle) => setSelectedMuscle(muscle)}
        onClear={() => setSelectedMuscle('All')}
        onClose={() => setShowMuscleModal(false)}
      />

      {/* ── Create Custom Movement Modal ── */}
      <CreateCustomExerciseModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCustomExerciseCreated}
      />

      {/* ── Add To Workout Split Day Sheet ── */}
      <AddToDaySheet
        visible={addToDayTarget !== null}
        exercise={addToDayTarget}
        onClose={() => setAddToDayTarget(null)}
        onSuccess={(dayName) => {
          showToast(`✓ Added to ${dayName}`);
        }}
      />
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  headerBackBtn: {
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitleText: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.4,
  },
  headerSubtitleText: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: FONT_FAMILY.body,
    marginTop: 1,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.bold,
  },
  searchWrap: {
    paddingHorizontal: 12,
    marginTop: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT_FAMILY.body,
    paddingVertical: 0,
  },
  filterPillRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginTop: 10,
    gap: 8,
  },
  filterPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  filterPillActive: {
    borderWidth: 1.5,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 4,
  },
  filterPillText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.medium,
    flexShrink: 1,
  },
  pillClearBtn: {
    padding: 2,
  },
  activeFiltersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  activeFiltersText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.body,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.bold,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 110,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 6,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  customBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  customBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 0.3,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaMuscleText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.medium,
  },
  metaDot: {
    fontSize: 11,
    color: '#555460',
  },
  metaEquipmentText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.body,
  },
  tierBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  tierBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 56,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.bold,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: FONT_FAMILY.body,
  },
  emptyResetBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emptyResetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.bold,
  },
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 36,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY.bold,
  },
});
