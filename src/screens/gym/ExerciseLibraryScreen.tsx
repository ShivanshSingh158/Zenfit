import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { EXERCISE_DATABASE, ExerciseDBEntry } from '../../data/exerciseDatabase';
import { useTheme } from '../../contexts/ThemeContext';
import { FONT_FAMILY, SPACE, RADIUS } from '../../theme/tokens';
import { hapticLight } from '../../utils/haptics';

const MUSCLE_FILTERS = [
  'All',
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Legs',
  'Core',
];

interface ExerciseLibraryProps {
  isEmbedded?: boolean;
}

export default function ExerciseLibraryScreen({ isEmbedded = false }: ExerciseLibraryProps) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('All');

  // Filtered exercises with high-speed memoization
  const filteredExercises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return EXERCISE_DATABASE.filter(ex => {
      // Muscle filter
      if (selectedMuscle !== 'All') {
        const m = ex.muscle.toLowerCase();
        if (selectedMuscle === 'Chest' && !m.includes('chest')) return false;
        if (selectedMuscle === 'Back' && !m.includes('back') && !m.includes('lat') && !m.includes('trap')) return false;
        if (selectedMuscle === 'Shoulders' && !m.includes('shoulder') && !m.includes('delt')) return false;
        if (selectedMuscle === 'Arms' && !m.includes('bicep') && !m.includes('tricep') && !m.includes('forearm')) return false;
        if (selectedMuscle === 'Legs' && !m.includes('quad') && !m.includes('hamstring') && !m.includes('glute') && !m.includes('calf') && !m.includes('leg')) return false;
        if (selectedMuscle === 'Core' && !m.includes('core') && !m.includes('abs') && !m.includes('oblique')) return false;
      }

      // Query filter
      if (!q) return true;
      if (ex.name.toLowerCase().includes(q)) return true;
      if (ex.muscle.toLowerCase().includes(q)) return true;
      if (ex.aliases?.some(a => a.toLowerCase().includes(q))) return true;

      return false;
    });
  }, [searchQuery, selectedMuscle]);

  const handleSelectExercise = useCallback((item: ExerciseDBEntry) => {
    hapticLight();
    navigation.navigate('ExerciseDetail', {
      exerciseId: item.id,
      exerciseName: item.name,
      muscle: item.muscle,
    });
  }, [navigation]);

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'S Tier': return '#FFD700';
      case 'A+ Tier': return '#A599FF';
      case 'A Tier': return '#5EDA9E';
      case 'B Tier': return '#89DCEB';
      default: return '#8E8E93';
    }
  };

  const renderItem = useCallback(({ item }: { item: ExerciseDBEntry }) => {
    const tierColor = getTierColor(item.tier);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleSelectExercise(item)}
        style={[
          styles.exerciseCard,
          {
            backgroundColor: isDark ? '#0f0e13' : '#ffffff',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.07)',
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.exerciseTitle, { color: colors.textPrimary || '#ffffff' }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.musclePill, { backgroundColor: isDark ? 'rgba(165, 153, 255, 0.12)' : 'rgba(165, 153, 255, 0.18)' }]}>
                <Text style={[styles.muscleText, { color: colors.accentPrimary || '#a599ff' }]}>
                  {item.muscle}
                </Text>
              </View>

              {item.tier && (
                <View style={[styles.tierPill, { borderColor: tierColor + '40' }]}>
                  <Text style={[styles.tierText, { color: tierColor }]}>
                    {item.tier}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.rightArrow}>
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#48484a' : '#c7c7cc'} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [colors, isDark, handleSelectExercise]);

  const Container = isEmbedded ? View : SafeAreaView;
  const containerProps = isEmbedded
    ? { style: [styles.container, { backgroundColor: colors.background || '#060509' }] }
    : { style: [styles.container, { backgroundColor: colors.background || '#060509' }], edges: ['top' as const] };

  return (
    <Container {...containerProps}>
      {!isEmbedded && <StatusBar style={isDark ? 'light' : 'dark'} />}

      {/* Header (only when standalone) */}
      {!isEmbedded && (
        <View style={styles.header}>
          <View>
            <Text style={[styles.screenTitle, { color: colors.textPrimary || '#ffffff' }]}>
              Exercise Vault
            </Text>
            <Text style={styles.subTitle}>
              {EXERCISE_DATABASE.length} scientifically catalogued exercises
            </Text>
          </View>
        </View>
      )}

      {/* Search Input Bar */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBox, { backgroundColor: isDark ? '#141318' : '#e5e5ea', borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'transparent' }]}>
          <Ionicons name="search" size={18} color={isDark ? '#8e8e93' : '#636366'} style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search exercises, movements, aliases..."
            placeholderTextColor={isDark ? '#636366' : '#8e8e93'}
            style={[styles.searchInput, { color: colors.textPrimary || '#ffffff' }]}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && Platform.OS === 'android' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={isDark ? '#8e8e93' : '#636366'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Muscle Filter Horizontal Strip */}
      <View style={styles.filterSection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={MUSCLE_FILTERS}
          keyExtractor={item => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isSelected = selectedMuscle === item;
            return (
              <TouchableOpacity
                onPress={() => { hapticLight(); setSelectedMuscle(item); }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected
                      ? (colors.accentPrimary || '#a599ff')
                      : (isDark ? '#16151c' : '#f2f2f7'),
                    borderColor: isSelected
                      ? (colors.accentPrimary || '#a599ff')
                      : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'transparent'),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isSelected
                        ? '#000000'
                        : (isDark ? '#d1d1d6' : '#3a3a3c'),
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Exercises List */}
      <FlatList
        data={filteredExercises}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        initialNumToRender={15}
        maxToRenderPerBatch={20}
        windowSize={10}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="barbell-outline" size={48} color={isDark ? '#3a3a3c' : '#c7c7cc'} />
            <Text style={[styles.emptyText, { color: colors.textMuted || '#8e8e93' }]}>
              No exercises match "{searchQuery}"
            </Text>
          </View>
        }
      />
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 6,
    paddingTop: 12,
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: 6,
    marginTop: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterSection: {
    marginTop: 10,
    marginBottom: 6,
  },
  filterList: {
    paddingHorizontal: 6,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 96,
    gap: 8,
  },
  exerciseCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  musclePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  muscleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tierPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  rightArrow: {
    paddingLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});
