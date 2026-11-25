import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  Platform,
} from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft, Plus, Search, X, ChevronDown, Dumbbell,
  GitFork, Cpu, Flame, Disc, Repeat, User, Info, CheckCircle2,
} from 'lucide-react-native';
import { EXERCISE_DATABASE } from '../../data/exerciseDatabase';
import { useTheme } from '../../contexts/ThemeContext';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../theme/tokens';
import { ScreenWrapper, TactileButton, NumericText } from '../../components/ui';
import { hapticLight, hapticMedium, hapticSuccess, hapticSelection } from '../../utils/haptics';
import {
  resolveExerciseEquipment,
  resolveExerciseMuscleGroup,
  EquipmentCategory,
} from '../../utils/equipmentResolver';
import {
  loadMergedCustomExercises,
  persistUnifiedCustomExercise,
} from '../../services/exerciseCatalogService';

import { VaultEquipmentModal } from '../../components/Gym/exercise/VaultEquipmentModal';
import { VaultMuscleModal } from '../../components/Gym/exercise/VaultMuscleModal';
import { CreateCustomExerciseModal, CustomExerciseItem } from '../../components/Gym/exercise/CreateCustomExerciseModal';
import { AddToDaySheet } from '../../components/Gym/schedule/AddToDaySheet';

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

// Lazily precompute static database on first Exercise Vault open (saves startup regex passes)
let _basePreparedCache: PreparedExercise[] | null = null;
function getBasePreparedExercises(): PreparedExercise[] {
  if (!_basePreparedCache) {
    _basePreparedCache = EXERCISE_DATABASE.map((ex) => {
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
  }
  return _basePreparedCache;
}

interface ExerciseLibraryProps {
  isEmbedded?: boolean;
}

export default function ExerciseLibraryScreen({ isEmbedded = false }: ExerciseLibraryProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const navigation = useNavigation<any>();

  // Filter & Search states
  const searchInputRef = useRef<TextInput>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentCategory>('All');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('All');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim().toLowerCase());
    }, 50);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Modals visibility
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showMuscleModal, setShowMuscleModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [addToDayTarget, setAddToDayTarget] = useState<PreparedExercise | null>(null);

  // Custom user exercises
  const [customExercises, setCustomExercises] = useState<PreparedExercise[]>([]);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load merged custom exercises across vault + quick-add on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const merged = await loadMergedCustomExercises();
        if (mounted && merged.length > 0) {
          const mapped: PreparedExercise[] = merged.map((item: any) => {
            const eq: EquipmentCategory =
              item.equipment || resolveExerciseEquipment(item.name, item.aliases || []);
            return {
              id: item.id,
              name: item.name,
              muscle: item.muscle,
              tier: item.tier,
              equipment: eq,
              muscleGroup: resolveExerciseMuscleGroup(item.muscle),
              isCustom: true,
              _searchBlob: `${item.name} ${item.muscle} ${eq}`.toLowerCase(),
            };
          });
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
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

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
      const deduped = prev.filter(
        (p) => p.name.toLowerCase().trim() !== item.name.toLowerCase().trim() && p.id !== item.id
      );
      return [newItem, ...deduped];
    });

    persistUnifiedCustomExercise({
      id: item.id,
      name: item.name,
      muscle: item.muscle,
      tier: item.tier || 'B Tier',
      targetSets: 3,
      targetReps: '8-12',
      restTimeSecs: 60,
      videoId: '',
      isCurated: false,
      equipment: item.equipment,
    } as any).catch(() => {});

    hapticSuccess();
    showToast(`✓ Created "${item.name}"`);
  }, [showToast]);

  // Combined and filtered exercise list
  const filteredExercises = useMemo(() => {
    const q = debouncedSearchQuery;
    const base = getBasePreparedExercises();
    const pool = customExercises.length > 0 ? [...customExercises, ...base] : base;

    return pool.filter((ex) => {
      // Equipment filter
      if (selectedEquipment !== 'All' && ex.equipment !== selectedEquipment) {
        return false;
      }

      // Muscle group filter
      if (selectedMuscle !== 'All') {
        const sel = selectedMuscle.toLowerCase();
        const matchesGroup = ex.muscleGroup.toLowerCase() === sel;
        const matchesRaw = ex.muscle.toLowerCase().includes(sel);
        const matchesCore =
          (sel === 'abdominals' || sel === 'core') &&
          (ex.muscleGroup === 'Abdominals' ||
            /\b(abs?|core|obliques?|transverse|vacuum)\b/i.test(ex.muscle));
        if (!matchesGroup && !matchesRaw && !matchesCore) {
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

  const getTierTone = useCallback((tier?: string) => {
    switch (tier) {
      case 'S Tier':
        return { color: tokens.status.gold, bg: tokens.status.goldDim };
      case 'A+ Tier':
        return { color: tokens.accent.primary, bg: tokens.accent.primaryDim };
      case 'A Tier':
        return { color: tokens.status.success, bg: tokens.status.successDim };
      case 'B Tier':
        return { color: tokens.status.info, bg: tokens.status.infoDim };
      default:
        return { color: tokens.text.secondary, bg: tokens.bg.elevated };
    }
  }, [tokens]);

  const renderEquipmentIcon = (eq: EquipmentCategory) => {
    const iconColor = tokens.accent.primary;
    const props = { size: ICON.md, color: iconColor, strokeWidth: ICON.strokeWidth };
    switch (eq) {
      case 'Barbell':
      case 'Dumbbell':
      case 'Kettlebell':
        return <Dumbbell {...props} />;
      case 'Cable':
        return <GitFork {...props} />;
      case 'Machine':
        return <Cpu {...props} />;
      case 'Plate':
        return <Disc {...props} />;
      case 'Resistance Band':
        return <Repeat {...props} />;
      case 'None':
        return <User {...props} />;
      default:
        return <Flame {...props} />;
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: PreparedExercise }) => {
      const tierTone = getTierTone(item.tier);
      return (
        <View style={styles.card}>
          {/* Equipment Rounded Icon Avatar */}
          <Pressable
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => handleSelectExercise(item)}
          >
            <View style={styles.avatarContainer}>
              {renderEquipmentIcon(item.equipment)}
            </View>

            {/* Center Info */}
            <View style={styles.cardInfo}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.isCustom && (
                  <View style={styles.customBadge}>
                    <Text style={styles.customBadgeText}>Custom</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardMetaRow}>
                <Text style={styles.metaMuscleText}>
                  {item.muscle}
                </Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaEquipmentText}>
                  {item.equipment === 'None' ? 'Bodyweight' : item.equipment}
                </Text>

                {item.tier && (
                  <>
                    <Text style={styles.metaDot}>•</Text>
                    <View
                      style={[
                        styles.tierBadge,
                        {
                          borderColor: tierTone.color,
                          backgroundColor: tierTone.bg,
                        },
                      ]}
                    >
                      <Text style={[styles.tierBadgeText, { color: tierTone.color }]} maxFontSizeMultiplier={1.15}>
                        {item.tier}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </Pressable>

          {/* Right Action Icons: Info & Add (lightweight Pressables inside 1,300-row FlatList) */}
          <View style={styles.cardActions}>
            <Pressable
              hitSlop={TOUCH.hitSlop}
              onPress={() => handleSelectExercise(item)}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
              accessibilityLabel={`Inspect ${item.name}`}
            >
              <Info size={18} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
            </Pressable>

            <Pressable
              hitSlop={TOUCH.hitSlop}
              onPress={() => {
                hapticMedium();
                setAddToDayTarget(item);
              }}
              style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
              accessibilityLabel={`Add ${item.name} to split`}
            >
              <Plus size={18} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
            </Pressable>
          </View>
        </View>
      );
    },
    [tokens, styles, handleSelectExercise]
  );

  const hasActiveFilters = selectedEquipment !== 'All' || selectedMuscle !== 'All';

  const clearAllFilters = useCallback(() => {
    hapticSelection();
    setSelectedEquipment('All');
    setSelectedMuscle('All');
  }, []);

  const bodyContent = (
    <>
      {/* ── Sleek Top Navigation Header ── */}
      <View style={styles.topHeader}>
        {!isEmbedded && (
          <TactileButton
            variant="custom"
            style={styles.headerBackBtn}
            onPress={() => {
              hapticLight();
              if (navigation.canGoBack()) navigation.goBack();
            }}
            accessibilityLabel="Back"
          >
            <ChevronLeft size={ICON.lg} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
          </TactileButton>
        )}

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitleText}>Exercise Vault</Text>
          <NumericText style={styles.headerSubtitleText}>
            {filteredExercises.length} movement{filteredExercises.length !== 1 ? 's' : ''}
          </NumericText>
        </View>

        <TactileButton
          variant="custom"
          onPress={() => {
            hapticLight();
            setShowCreateModal(true);
          }}
          style={styles.createBtn}
        >
          <Plus size={14} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
          <Text style={styles.createBtnText}>Create</Text>
        </TactileButton>
      </View>

      {/* ── Search Input Box ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Search
            size={18}
            color={tokens.text.muted}
            strokeWidth={ICON.strokeWidth}
            style={{ marginRight: SPACE[8] }}
          />
          <TextInput
            ref={searchInputRef}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search exercises, variations..."
            placeholderTextColor={tokens.text.muted}
            style={styles.searchInput}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && Platform.OS === 'android' && (
            <TactileButton
              variant="custom"
              onPress={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              hitSlop={TOUCH.hitSlop}
              style={styles.clearSearchBtn}
              accessibilityLabel="Clear search"
            >
              <X size={18} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
            </TactileButton>
          )}
        </View>
      </View>

      {/* ── Hevy Side-by-Side Pill Filter Dropdowns ── */}
      <View style={styles.filterPillRow}>
        {/* Equipment Pill */}
        <View
          style={[
            styles.filterPill,
            selectedEquipment !== 'All' && styles.filterPillActive,
          ]}
        >
          <Pressable
            onPress={() => {
              hapticLight();
              setShowEquipmentModal(true);
            }}
            style={({ pressed }) => [styles.pillContent, pressed && { opacity: 0.72 }]}
          >
            <Dumbbell
              size={15}
              color={selectedEquipment !== 'All' ? tokens.accent.primary : tokens.text.secondary}
              strokeWidth={ICON.strokeWidth}
              style={{ marginRight: SPACE[8] }}
            />
            <Text
              style={[
                styles.filterPillText,
                selectedEquipment !== 'All' && styles.filterPillTextActive,
              ]}
              numberOfLines={1}
            >
              {selectedEquipment === 'All' ? 'All Equipment' : selectedEquipment}
            </Text>
          </Pressable>

          {selectedEquipment !== 'All' ? (
            <Pressable
              onPress={() => {
                hapticLight();
                setSelectedEquipment('All');
              }}
              hitSlop={TOUCH.hitSlop}
              style={styles.pillClearBtn}
            >
              <X size={15} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                hapticLight();
                setShowEquipmentModal(true);
              }}
              hitSlop={TOUCH.hitSlop}
            >
              <ChevronDown size={14} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
            </Pressable>
          )}
        </View>

        {/* Muscles Pill */}
        <View
          style={[
            styles.filterPill,
            selectedMuscle !== 'All' && styles.filterPillActive,
          ]}
        >
          <Pressable
            onPress={() => {
              hapticLight();
              setShowMuscleModal(true);
            }}
            style={({ pressed }) => [styles.pillContent, pressed && { opacity: 0.72 }]}
          >
            <User
              size={15}
              color={selectedMuscle !== 'All' ? tokens.accent.primary : tokens.text.secondary}
              strokeWidth={ICON.strokeWidth}
              style={{ marginRight: SPACE[8] }}
            />
            <Text
              style={[
                styles.filterPillText,
                selectedMuscle !== 'All' && styles.filterPillTextActive,
              ]}
              numberOfLines={1}
            >
              {selectedMuscle === 'All' ? 'All Muscles' : selectedMuscle}
            </Text>
          </Pressable>

          {selectedMuscle !== 'All' ? (
            <Pressable
              onPress={() => {
                hapticLight();
                setSelectedMuscle('All');
              }}
              hitSlop={TOUCH.hitSlop}
              style={styles.pillClearBtn}
            >
              <X size={15} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                hapticLight();
                setShowMuscleModal(true);
              }}
              hitSlop={TOUCH.hitSlop}
            >
              <ChevronDown size={14} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Optional "Clear All Filters" indicator bar if both are active */}
      {hasActiveFilters && (
        <View style={styles.activeFiltersBar}>
          <Text style={styles.activeFiltersText}>
            Filtered by: {[
              selectedEquipment !== 'All' ? selectedEquipment : null,
              selectedMuscle !== 'All' ? selectedMuscle : null,
            ].filter(Boolean).join(' • ')}
          </Text>
          <Pressable onPress={clearAllFilters} hitSlop={TOUCH.hitSlop}>
            <Text style={styles.clearAllText}>
              Clear All
            </Text>
          </Pressable>
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
        removeClippedSubviews={Platform.OS === 'android' && !isEmbedded}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Dumbbell size={36} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
            </View>
            <Text style={styles.emptyTitle}>No Movements Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No exercises match "${searchQuery}". Try adjusting your filters or create a custom one.`
                : 'Try clearing your equipment or muscle filters.'}
            </Text>
            {hasActiveFilters && (
              <TactileButton
                variant="custom"
                onPress={clearAllFilters}
                style={styles.emptyResetBtn}
              >
                <Text style={styles.emptyResetBtnText}>
                  Reset All Filters
                </Text>
              </TactileButton>
            )}
          </View>
        }
      />

      {/* ── Floating Notification Toast (120fps Reanimated UI Thread) ── */}
      {toastMessage && (
        <Animated.View
          entering={FadeInUp.duration(220)}
          exiting={FadeOutUp.duration(200)}
          pointerEvents="none"
          style={styles.toastContainer}
        >
          <View style={styles.toastBubble}>
            <CheckCircle2
              size={18}
              color={tokens.status.success}
              strokeWidth={ICON.strokeWidth}
              style={{ marginRight: SPACE[8] }}
            />
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
    </>
  );

  if (isEmbedded) {
    return <View style={styles.container}>{bodyContent}</View>;
  }

  return (
    <ScreenWrapper edges={['top']} keyboardAvoiding={false} style={styles.container}>
      {bodyContent}
    </ScreenWrapper>
  );
}

const makeStyles = (tokens: ThemeTokens) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.bg.canvas,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE[12],
    paddingTop: SPACE[8],
    paddingBottom: SPACE[8],
  },
  headerBackBtn: {
    width: TOUCH.minTarget,
    height: TOUCH.minTarget,
    borderRadius: RADIUS.inner,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACE[4],
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitleText: {
    fontSize: 22,
    color: tokens.text.primary,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.4,
  },
  headerSubtitleText: {
    fontSize: 12,
    color: tokens.text.muted,
    fontFamily: FONT_FAMILY.body,
    marginTop: 1,
  },
  createBtn: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: RADIUS.inner,
    borderWidth: 1,
    backgroundColor: tokens.accent.primaryDim,
    borderColor: tokens.border.focus,
    gap: 6,
  },
  createBtnText: {
    fontSize: 12,
    color: tokens.accent.primary,
    fontFamily: FONT_FAMILY.bold,
  },
  searchWrap: {
    paddingHorizontal: SPACE[12],
    marginTop: SPACE[4],
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TOUCH.minTarget,
    borderRadius: RADIUS.inner,
    borderWidth: 1,
    backgroundColor: tokens.bg.elevated,
    borderColor: tokens.border.subtle,
    paddingHorizontal: SPACE[12],
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: tokens.text.primary,
    fontFamily: FONT_FAMILY.body,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACE[12],
    marginTop: SPACE[8],
    gap: SPACE[8],
  },
  filterPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: TOUCH.minTarget,
    borderRadius: RADIUS.inner,
    borderWidth: 1,
    backgroundColor: tokens.bg.surface,
    borderColor: tokens.border.subtle,
    paddingHorizontal: SPACE[12],
  },
  filterPillActive: {
    borderWidth: 1.5,
    backgroundColor: tokens.accent.primaryDim,
    borderColor: tokens.accent.primary,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACE[4],
  },
  filterPillText: {
    fontSize: 13,
    color: tokens.text.secondary,
    fontFamily: FONT_FAMILY.medium,
    flexShrink: 1,
  },
  filterPillTextActive: {
    color: tokens.text.primary,
    fontFamily: FONT_FAMILY.bold,
  },
  pillClearBtn: {
    padding: 4,
  },
  activeFiltersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE[16],
    paddingTop: SPACE[8],
  },
  activeFiltersText: {
    fontSize: 11,
    color: tokens.text.secondary,
    fontFamily: FONT_FAMILY.body,
  },
  clearAllText: {
    fontSize: 12,
    color: tokens.accent.primary,
    fontFamily: FONT_FAMILY.bold,
  },
  listContent: {
    paddingHorizontal: SPACE[12],
    paddingTop: SPACE[8],
    paddingBottom: 110,
    gap: SPACE[8],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACE[12],
    borderRadius: RADIUS.card,
    borderWidth: 1,
    backgroundColor: tokens.bg.surface,
    borderColor: tokens.border.subtle,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.inner,
    borderWidth: 1,
    backgroundColor: tokens.bg.elevated,
    borderColor: tokens.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACE[12],
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: SPACE[8],
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE[8],
    marginBottom: SPACE[4],
  },
  cardTitle: {
    fontSize: 15,
    color: tokens.text.primary,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  customBadge: {
    backgroundColor: tokens.status.goldDim,
    borderWidth: 1,
    borderColor: tokens.status.gold,
    paddingHorizontal: SPACE[8],
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  customBadgeText: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.status.gold,
    letterSpacing: 0.3,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACE[8],
  },
  metaMuscleText: {
    fontSize: 12,
    color: tokens.accent.primary,
    fontFamily: FONT_FAMILY.medium,
  },
  metaDot: {
    fontSize: 11,
    color: tokens.text.muted,
  },
  metaEquipmentText: {
    fontSize: 12,
    color: tokens.text.secondary,
    fontFamily: FONT_FAMILY.body,
  },
  tierBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  tierBadgeText: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE[8],
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.inner,
    backgroundColor: tokens.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.inner,
    borderWidth: 1,
    backgroundColor: tokens.accent.primaryDim,
    borderColor: tokens.border.focus,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 56,
    paddingHorizontal: SPACE[24],
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    backgroundColor: tokens.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE[16],
  },
  emptyTitle: {
    fontSize: 17,
    color: tokens.text.primary,
    fontFamily: FONT_FAMILY.bold,
    marginBottom: SPACE[8],
  },
  emptySubtitle: {
    fontSize: 13,
    color: tokens.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: FONT_FAMILY.body,
  },
  emptyResetBtn: {
    marginTop: SPACE[16],
    minHeight: TOUCH.minTarget,
    paddingHorizontal: SPACE[16],
    borderRadius: RADIUS.inner,
    backgroundColor: tokens.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyResetBtnText: {
    fontSize: 13,
    color: tokens.accent.primary,
    fontFamily: FONT_FAMILY.bold,
  },
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 36,
    left: SPACE[16],
    right: SPACE[16],
    alignItems: 'center',
    zIndex: 9999,
  },
  toastBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACE[16],
    paddingVertical: SPACE[12],
    borderRadius: RADIUS.full,
    borderWidth: 1,
    backgroundColor: tokens.bg.elevated,
    borderColor: tokens.accent.primary,
  },
  toastText: {
    fontSize: 13,
    color: tokens.text.primary,
    fontFamily: FONT_FAMILY.bold,
  },
});
