import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { Image as ExpoImage } from 'expo-image';
import { IOS_DARK, FONT_FAMILY } from '../../../theme/tokens';
import { resolveExerciseTargetMuscle } from '../../../utils/gymUtils';
import { resolveExerciseEquipment } from '../../../utils/equipmentResolver';
import {
  resolveExercise,
  getExerciseClipVideoUrl,
  getExerciseGifCdnUrl,
  getExerciseStillPosterUrl,
} from '../../../services/exerciseMediaService';
import { hapticLight, hapticSelection } from '../../../utils/haptics';

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
  lastTimeData,
  showVideo,
  onVideoToggle,
  onSwitchToPartner,
  onOpenExerciseMenu,
}) => {
  const rawMuscle = exercise.muscle;
  const resolved = resolveExerciseTargetMuscle(exercise.name, rawMuscle).targetMuscle;
  const muscleName = resolved || rawMuscle || 'Mixed';
  const equipmentName = useMemo(() => resolveExerciseEquipment(exercise.name), [exercise.name]);

  // High-Quality Looping Video & GIF Animation Sources (OpenGym standard)
  const { clipUrl, gifUrl, stillUrl } = useMemo(() => {
    const def = resolveExercise(exercise.name);
    if (!def) return { clipUrl: '', gifUrl: '', stillUrl: '' };
    return {
      clipUrl: getExerciseClipVideoUrl(def),
      gifUrl: getExerciseGifCdnUrl(def),
      stillUrl: getExerciseStillPosterUrl(def),
    };
  }, [exercise.name]);

  // Dynamic Progression Policy Map (OpenGym / ZenFit standard)
  const POLICY_LABELS: Record<string, string> = {
    linear: 'Linear progression',
    double: 'Double progression',
    triple: 'Triple progression',
    top_backoff: 'Top + Back-off',
    greyskull: 'Greyskull LP',
    off: 'Manual load',
  };

  // Resolve Effective Policy from System, Exercise, or Biomechanical Equipment
  const effectivePolicy = useMemo(() => {
    if (exercise?.progressionPolicy) return exercise.progressionPolicy;
    if (overloadSuggestion?.policy) return overloadSuggestion.policy;
    const isCompound = exercise?.isCompound || /\b(squat|bench|deadlift|press|overhead|row)\b/i.test(exercise?.name || '');
    const isBarbell = /\b(barbell|bb)\b/i.test(exercise?.name || '') || equipmentName === 'Barbell';
    return isCompound && isBarbell ? 'linear' : 'double';
  }, [exercise?.progressionPolicy, overloadSuggestion?.policy, exercise?.name, exercise?.isCompound, equipmentName]);

  const policyLabel = POLICY_LABELS[effectivePolicy] || 'Double progression';

  // Dynamic Biomechanical Progression Guidance from our Progression Engine
  const progressionText = useMemo(() => {
    if (!overloadSuggestion) {
      return `🌱 ${policyLabel} · Analyzing performance history...`;
    }

    const state = overloadSuggestion.state;
    const targetWeight = overloadSuggestion.recommended ?? overloadSuggestion.suggestedWeight ?? 0;
    const repsText = overloadSuggestion.suggestedReps || overloadSuggestion.reps || exercise?.targetReps || '8-12';
    const delta = (overloadSuggestion.isWeightIncrease || overloadSuggestion.type === 'increase') && overloadSuggestion.weightDelta
      ? ` (+${overloadSuggestion.weightDelta} kg)`
      : overloadSuggestion.weightDelta < 0
      ? ` (${overloadSuggestion.weightDelta} kg)`
      : '';

    // 1. If baseline session (no prior logs)
    if (state === 'BASELINE' || !lastTimeData) {
      return `🌱 ${policyLabel} · Nothing logged yet, so this session sets the baseline.`;
    }

    // 2. Weight unlock (hit all target reps in previous session)
    if (state === 'WEIGHT_UNLOCK' || overloadSuggestion.isWeightIncrease) {
      return `🌱 ${policyLabel} · Target met${delta}: Aim for ${targetWeight} kg × ${repsText}`;
    }

    // 3. Rep build (building up towards rep cap at current weight)
    if (state === 'REP_BUILD') {
      return `🌱 ${policyLabel} · Build reps: Aim for ${repsText} at ${targetWeight} kg before adding weight`;
    }

    // 4. Regroove hold (consolidating form / volume)
    if (state === 'REGROOVE_HOLD') {
      return `🌱 ${policyLabel} · Consolidate form: Hold ${targetWeight} kg × ${repsText}`;
    }

    // 5. Reactive deload (accumulated fatigue / consecutive misses)
    if (state === 'REACTIVE_DELOAD' || overloadSuggestion.isDeload) {
      return `🌱 ${policyLabel} · Deload: Back off to ${targetWeight} kg to clear fatigue`;
    }

    // 6. Dynamic engine headline
    if (overloadSuggestion.headline && overloadSuggestion.headline !== 'Baseline Session') {
      return `🌱 ${policyLabel} · ${overloadSuggestion.headline}`;
    }

    // 7. Standard active target
    if (targetWeight > 0) {
      return `🌱 ${policyLabel}: ${targetWeight} kg × ${repsText}${delta}`;
    }

    return `🌱 ${policyLabel} · Target: ${repsText} reps`;
  }, [overloadSuggestion, policyLabel, lastTimeData, exercise?.targetReps]);

  return (
    <View style={headerStyles.cardHeader}>
      {/* ── Top Row: Looping Video Animation Thumbnail + Details ── */}
      <View style={headerStyles.heroRow}>
        {/* Square Video Animation Box — Seamless 60FPS Looping Lifter */}
        <TouchableOpacity
          style={headerStyles.thumbnailBox}
          onPress={() => {
            hapticLight();
            onVideoToggle();
          }}
          activeOpacity={0.8}
        >
          {clipUrl ? (
            <Video
              source={{ uri: clipUrl }}
              style={headerStyles.thumbImg}
              resizeMode={ResizeMode.COVER}
              isLooping
              isMuted
              shouldPlay
              useNativeControls={false}
            />
          ) : gifUrl ? (
            <ExpoImage
              source={{ uri: gifUrl }}
              placeholder={{ uri: stillUrl }}
              style={headerStyles.thumbImg}
              contentFit="cover"
              autoplay={true}
              cachePolicy="disk"
              transition={150}
            />
          ) : (
            <Ionicons name="barbell-outline" size={26} color="#8E8E93" />
          )}

          {/* Expand Badge */}
          <View style={headerStyles.expandOverlay}>
            <Ionicons name={showVideo ? 'contract' : 'expand'} size={11} color="#FFFFFF" />
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
    backgroundColor: '#1E2026',
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
    bottom: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
