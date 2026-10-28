import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resolveMuscleColor } from '../../../utils/gymUtils';
import { FONT_FAMILY } from '../../../theme/tokens';

export interface ExerciseCatalogEntry {
  id: string;
  name: string;
  muscle: string;
  targetSets: number;
  targetReps: string;
  aliases?: string[];
  restTimeSecs: number;
  videoId: string;
  tier?: 'S Tier' | 'A+ Tier' | 'A Tier' | 'B Tier' | 'C Tier';
  isCurated?: boolean;
}

export interface ExerciseSearchDropdownProps {
  showDropdown: boolean;
  suggestions: ExerciseCatalogEntry[];
  aiLoading?: boolean;
  aiSuggestion?: any;
  onSelectSuggestion: (entry: ExerciseCatalogEntry) => void;
  onSelectAiSuggestion?: (ai: any) => void;
  onTriggerAiSearch?: () => void;
  searchQuery?: string;
  colors: any;
  styles: any;
}

const TIER_PILL_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  'S Tier': { bg: 'rgba(255, 215, 0, 0.14)', text: '#FFD700', border: 'rgba(255, 215, 0, 0.35)' },
  'A+ Tier': { bg: 'rgba(0, 229, 255, 0.14)', text: '#00E5FF', border: 'rgba(0, 229, 255, 0.35)' },
  'A Tier': { bg: 'rgba(94, 218, 158, 0.14)', text: '#5eda9e', border: 'rgba(94, 218, 158, 0.35)' },
  'B Tier': { bg: 'rgba(137, 220, 235, 0.14)', text: '#89dceb', border: 'rgba(137, 220, 235, 0.35)' },
  'C Tier': { bg: 'rgba(142, 142, 147, 0.12)', text: '#8e8e93', border: 'rgba(142, 142, 147, 0.25)' },
};

// Memoized single row for 0ms rendering & maximum frame rate
const SuggestionRow = memo(({
  item,
  index,
  onPress,
  colors,
  styles,
}: {
  item: ExerciseCatalogEntry;
  index: number;
  onPress: () => void;
  colors: any;
  styles: any;
}) => {
  const muscleCol = resolveMuscleColor(item.muscle);
  const tierCfg = item.tier ? TIER_PILL_CONFIG[item.tier] : undefined;

  return (
    <TouchableOpacity
      style={styles.suggestionRow}
      onPress={onPress}
      activeOpacity={0.65}
    >
      <View style={styles.suggestionLeft}>
        <View
          style={[
            styles.muscleIndicatorDot,
            { backgroundColor: muscleCol },
          ]}
        />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.suggestionName} numberOfLines={1}>
              {item.name}
            </Text>
            {tierCfg && (
              <View
                style={{
                  paddingHorizontal: 5,
                  paddingVertical: 1.5,
                  borderRadius: 4,
                  backgroundColor: tierCfg.bg,
                  borderWidth: 0.5,
                  borderColor: tierCfg.border,
                }}
              >
                <Text
                  style={{
                    fontFamily: FONT_FAMILY.bold,
                    fontSize: 9,
                    color: tierCfg.text,
                    letterSpacing: 0.3,
                  }}
                >
                  {item.tier}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.suggestionMeta, { color: muscleCol }]}>
            {item.muscle} · {item.targetSets}x {item.targetReps} · {item.restTimeSecs}s rest
          </Text>
        </View>
      </View>
      <Ionicons
        name="arrow-forward-circle-outline"
        size={18}
        color={colors.textTertiary}
      />
    </TouchableOpacity>
  );
});

export const ExerciseSearchDropdown: React.FC<ExerciseSearchDropdownProps> = memo(({
  showDropdown,
  suggestions,
  onSelectSuggestion,
  searchQuery,
  colors,
  styles,
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);

  const hasSuggestions = suggestions.length > 0;
  const hasQuery = Boolean(searchQuery && searchQuery.trim().length > 0);
  const queryTrimmed = searchQuery ? searchQuery.trim() : '';

  if (!showDropdown || (!hasSuggestions && !hasQuery)) {
    return null;
  }

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const maxScroll = contentSize.height - layoutMeasurement.height;
    if (maxScroll <= 0) {
      setScrollProgress(0);
      return;
    }
    const current = Math.max(0, Math.min(contentOffset.y, maxScroll));
    setScrollProgress(current / maxScroll);
  };

  return (
    <View style={styles.suggestionsContainer}>
      {hasSuggestions && (
        <>
          <ScrollView
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {suggestions.map((item, index) => (
              <SuggestionRow
                key={item.id || `${item.name}-${index}`}
                item={item}
                index={index}
                onPress={() => onSelectSuggestion(item)}
                colors={colors}
                styles={styles}
              />
            ))}
          </ScrollView>

          {suggestions.length > 3 && (
            <View style={styles.scrollbarTrack}>
              <View
                style={[
                  styles.scrollbarThumb,
                  {
                    top: `${scrollProgress * 75}%` as any,
                  },
                ]}
              />
            </View>
          )}
        </>
      )}

      {!hasSuggestions && hasQuery && queryTrimmed.length >= 2 && (
        <View style={{ padding: 14, alignItems: 'center' }}>
          <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 12.5, color: colors.textTertiary, textAlign: 'center' }}>
            No matching exercise found in catalogue.
          </Text>
        </View>
      )}
    </View>
  );
});

export default ExerciseSearchDropdown;
