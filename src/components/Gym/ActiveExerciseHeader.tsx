import React from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILY, RADIUS } from '../../theme/tokens';
import { resolveExerciseTargetMuscle } from '../../utils/gymUtils';

export interface ActiveExerciseHeaderProps {
  exercise: any;
  partnerExercise: any | null;
  overloadSuggestion: any | null;
  lastTimeData: string | null;
  showVideo: boolean;
  activeSetIndex?: number;
  isAllComplete?: boolean;
  onRepeatPrevious?: () => void;
  colors: any;
  styles: any;
  onSwapPress: () => void;
  onSupersetPress: () => void;
  onVideoToggle: () => void;
  onSwitchToPartner: () => void;
}

export const ActiveExerciseHeader: React.FC<ActiveExerciseHeaderProps> = React.memo(({
  exercise,
  partnerExercise,
  overloadSuggestion,
  lastTimeData,
  showVideo,
  activeSetIndex,
  isAllComplete,
  onRepeatPrevious,
  colors,
  styles,
  onSwapPress,
  onSupersetPress,
  onVideoToggle,
  onSwitchToPartner,
}) => {
  const rawMuscle = exercise.muscle;
  const resolved = resolveExerciseTargetMuscle(exercise.name, rawMuscle).targetMuscle;
  const muscleName = (resolved || rawMuscle || 'Mixed').toUpperCase();

  return (
    <View style={[styles.titleArea, { alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }]}>
      {/* ── Row 1: Three Centered Feature Pills (• MUSCLE | ⇄ SWAP | ⚯ SUPERSET) ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 10,
        }}
      >
        {/* Muscle Pill */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(165, 153, 255, 0.12)',
            borderColor: 'rgba(165, 153, 255, 0.28)',
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: RADIUS.full,
            gap: 6,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#a599ff' }} />
          <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 11, color: '#a599ff', letterSpacing: 0.8 }}>
            {muscleName}
          </Text>
        </View>

        {/* Swap Button Pill */}
        <TouchableOpacity
          onPress={onSwapPress}
          activeOpacity={0.75}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderColor: 'rgba(255, 255, 255, 0.12)',
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: RADIUS.full,
            gap: 5,
          }}
        >
          <Ionicons name="swap-horizontal" size={13} color="#ffffff" />
          <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 11, color: '#ffffff', letterSpacing: 0.5 }}>
            SWAP
          </Text>
        </TouchableOpacity>

        {/* Superset Button Pill */}
        <TouchableOpacity
          onPress={onSupersetPress}
          activeOpacity={0.75}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: exercise.supersetGroup
              ? 'rgba(255, 159, 77, 0.18)'
              : 'rgba(255, 255, 255, 0.08)',
            borderColor: exercise.supersetGroup
              ? 'rgba(255, 159, 77, 0.4)'
              : 'rgba(255, 255, 255, 0.12)',
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: RADIUS.full,
            gap: 5,
          }}
        >
          <Ionicons
            name="git-merge-outline"
            size={13}
            color={exercise.supersetGroup ? '#ff9f4d' : '#8e8e93'}
          />
          <Text
            style={{
              fontFamily: FONT_FAMILY.bold,
              fontSize: 11,
              color: exercise.supersetGroup ? '#ff9f4d' : '#8e8e93',
              letterSpacing: 0.5,
            }}
          >
            {exercise.supersetGroup ? `SUPER-${exercise.supersetGroup}` : 'SUPERSET'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Row 2: Exercise Title (Large, Bold, Centered) + Red YouTube Play Button ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 10,
          paddingHorizontal: 12,
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontFamily: FONT_FAMILY.bold,
            color: '#ffffff',
            textAlign: 'center',
            letterSpacing: -0.3,
          }}
          numberOfLines={2}
        >
          {exercise.name}
        </Text>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onVideoToggle}
          style={{ padding: 2 }}
        >
          <Ionicons
            name={showVideo ? "close-circle" : "logo-youtube"}
            size={24}
            color={showVideo ? colors.textMuted : "#FF0000"}
          />
        </TouchableOpacity>
      </View>

      {/* ── Row 3: Last Stats (Left) + Match Target Pill (Right) ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          paddingHorizontal: 4,
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            fontSize: 12.5,
            color: '#8e8e93',
            fontFamily: FONT_FAMILY.medium,
            flexShrink: 1,
            marginRight: 8,
          }}
          numberOfLines={1}
        >
          {lastTimeData ? `Last: ${lastTimeData}` : `Goal: ${exercise.targetSets} sets × ${exercise.targetReps} reps`}
        </Text>

        {!isAllComplete && onRepeatPrevious && (
          <TouchableOpacity
            activeOpacity={0.75}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: 'rgba(165, 153, 255, 0.12)',
              borderColor: 'rgba(165, 153, 255, 0.3)',
              borderWidth: 1,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: RADIUS.full,
              flexShrink: 0,
            }}
            onPress={onRepeatPrevious}
          >
            <Ionicons
              name={activeSetIndex && activeSetIndex > 0 ? "copy-outline" : "sparkles-outline"}
              size={12}
              color="#a599ff"
            />
            <Text style={{ fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: '#a599ff' }}>
              {activeSetIndex && activeSetIndex > 0 ? `Same as Set ${activeSetIndex}` : 'Match Target'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Row 4: Target & Overload Banner (Full-Width Pill) ── */}
      {overloadSuggestion && overloadSuggestion.reason ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: overloadSuggestion.isDeload
              ? 'rgba(255, 127, 80, 0.12)'
              : 'rgba(255, 255, 255, 0.04)',
            borderColor: overloadSuggestion.isDeload
              ? 'rgba(255, 127, 80, 0.30)'
              : 'rgba(255, 255, 255, 0.08)',
            borderWidth: 1,
            borderRadius: RADIUS.full,
            paddingHorizontal: 12,
            paddingVertical: 6,
            width: '100%',
          }}
        >
          <Ionicons
            name="information-circle-outline"
            size={14}
            color={overloadSuggestion.isDeload ? '#ff7f50' : '#8e8e93'}
          />
          <Text
            style={{
              fontFamily: FONT_FAMILY.medium,
              fontSize: 11.5,
              color: overloadSuggestion.isDeload ? '#ff7f50' : '#a0a0a8',
              flex: 1,
            }}
            numberOfLines={1}
          >
            {overloadSuggestion.reason}
          </Text>
        </View>
      ) : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderWidth: 1,
            borderRadius: RADIUS.full,
            paddingHorizontal: 12,
            paddingVertical: 6,
            width: '100%',
          }}
        >
          <Ionicons name="information-circle-outline" size={14} color="#8e8e93" />
          <Text
            style={{
              fontFamily: FONT_FAMILY.medium,
              fontSize: 11.5,
              color: '#a0a0a8',
              flex: 1,
            }}
            numberOfLines={1}
          >
            Target: Aim for clean concentric tempo across all sets
          </Text>
        </View>
      )}

      {/* Superset Partner Companion Banner */}
      {exercise.supersetGroup && partnerExercise && (
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onSwitchToPartner}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255, 159, 77, 0.12)',
            borderWidth: 1,
            borderColor: 'rgba(255, 159, 77, 0.35)',
            borderRadius: RADIUS.md,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginTop: 8,
            width: '100%',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 10 }}>
            <Ionicons name="git-merge" size={14} color="#ff9f4d" />
            <Text style={{ fontSize: 12, fontFamily: FONT_FAMILY.medium, color: '#ff9f4d' }}>
              Superset: {partnerExercise.name}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="#ff9f4d" />
        </TouchableOpacity>
      )}
    </View>
  );
});

export default ActiveExerciseHeader;
