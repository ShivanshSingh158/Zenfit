import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IOS_DARK, FONT_FAMILY } from '../../../theme/tokens';
import { resolveExerciseTargetMuscle } from '../../../utils/gymUtils';
import { resolveExerciseEquipment } from '../../../utils/equipmentResolver';
import { resolveExercise, getExerciseThumbnailUrl } from '../../../services/exerciseMediaService';
import { hapticLight, hapticMedium, hapticSelection } from '../../../utils/haptics';
import { OverloadSuggestion } from '../../../utils/progressiveOverload';

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
  styles?: any;
  gymLogs?: any[];
  onSwapPress: () => void;
  onSupersetPress: () => void;
  onVideoToggle: () => void;
  onSwitchToPartner: () => void;
  onNoteChange?: (note: string) => void;
  onOpenExerciseMenu?: () => void;
}

export const ActiveExerciseHeader: React.FC<ActiveExerciseHeaderProps> = React.memo(({
  exercise,
  partnerExercise,
  overloadSuggestion,
  showVideo,
  colors,
  onVideoToggle,
  onSwitchToPartner,
  onOpenExerciseMenu,
}) => {
  const rawMuscle = exercise.muscle;
  const resolved = resolveExerciseTargetMuscle(exercise.name, rawMuscle).targetMuscle;
  const muscleName = resolved || rawMuscle || 'Mixed';
  const equipmentName = useMemo(() => resolveExerciseEquipment(exercise.name), [exercise.name]);

  // Exercise thumbnail
  const thumbUrl = useMemo(() => {
    const def = resolveExercise(exercise.name);
    return def ? getExerciseThumbnailUrl(def) : '';
  }, [exercise.name]);

  // Progressive Overload or Baseline Note
  const progressionText = useMemo(() => {
    if (overloadSuggestion && overloadSuggestion.state !== 'BASELINE') {
      const targetWeight = overloadSuggestion.recommended || overloadSuggestion.suggestedWeight || 0;
      if (targetWeight > 0) {
        const repsText = overloadSuggestion.suggestedReps || overloadSuggestion.reps || '8-12';
        const delta = (overloadSuggestion.isWeightIncrease || overloadSuggestion.type === 'increase') && overloadSuggestion.weightDelta
          ? ` (+${overloadSuggestion.weightDelta} kg)`
          : '';
        return `🌱 Progressive Overload: ${targetWeight} kg × ${repsText}${delta}`;
      }
    }
    return '🌱 Linear progression · Nothing logged yet, so this session sets the baseline.';
  }, [overloadSuggestion]);

  return (
    <View style={headerStyles.cardHeader}>
      {/* ── Top Row: Thumbnail + Details (Title, Tags, Plan, Menu) ── */}
      <View style={headerStyles.heroRow}>
        {/* Square Thumbnail */}
        <TouchableOpacity
          style={headerStyles.thumbnailBox}
          onPress={() => {
            hapticLight();
            onVideoToggle();
          }}
          activeOpacity={0.8}
        >
          {thumbUrl ? (
            <Image
              source={{ uri: thumbUrl }}
              style={headerStyles.thumbImg}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="barbell-outline" size={26} color="#8E8E93" />
          )}
          <View style={headerStyles.expandOverlay}>
            <Ionicons name={showVideo ? 'close' : 'expand'} size={12} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Details Column */}
        <View style={headerStyles.detailsCol}>
          <View style={headerStyles.titleRow}>
            <Text
              style={headerStyles.exerciseTitle}
              numberOfLines={2}
            >
              {exercise.name}
            </Text>
            <TouchableOpacity
              style={headerStyles.dotsBtn}
              onPress={() => {
                hapticSelection();
                onOpenExerciseMenu?.();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="ellipsis-horizontal" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Muscle & Equipment Tags */}
          <View style={headerStyles.tagsRow}>
            <View style={headerStyles.tagBadge}>
              <Text style={headerStyles.tagText}>{muscleName}</Text>
            </View>
            <View style={headerStyles.tagBadge}>
              <Text style={headerStyles.tagText}>{equipmentName}</Text>
            </View>
          </View>

          {/* Target Plan */}
          <Text style={headerStyles.planText}>
            Plan: {exercise.targetSets || 4} × {exercise.targetReps || '8'}
          </Text>
        </View>
      </View>

      {/* ── Progression Baseline / Overload Note ── */}
      <View style={headerStyles.progressionRow}>
        <Text style={headerStyles.progressionText} numberOfLines={2}>
          {progressionText}
        </Text>
      </View>

      {/* ── Superset Partner Switcher (if applicable) ── */}
      {exercise.supersetGroup && partnerExercise && (
        <TouchableOpacity
          onPress={onSwitchToPartner}
          style={headerStyles.supersetBanner}
          activeOpacity={0.7}
        >
          <View style={headerStyles.supersetDot} />
          <Text style={headerStyles.supersetText}>
            SUPER-{exercise.supersetGroup} · Switch to {partnerExercise.name} →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const headerStyles = StyleSheet.create({
  cardHeader: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 6,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  thumbnailBox: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  expandOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseTitle: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    flex: 1,
    marginRight: 8,
  },
  dotsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  tagBadge: {
    backgroundColor: '#2C2C2E',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  planText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    marginTop: 2,
  },
  progressionRow: {
    marginTop: 10,
    paddingVertical: 2,
  },
  progressionText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: '#30D158',
    lineHeight: 16,
  },
  supersetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    width: '100%',
    marginTop: 8,
  },
  supersetDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: IOS_DARK.orange,
  },
  supersetText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: IOS_DARK.orange,
    textAlign: 'center',
  },
});

export default ActiveExerciseHeader;
