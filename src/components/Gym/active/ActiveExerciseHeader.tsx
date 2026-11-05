import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IOS_DARK, FONT_FAMILY } from '../../../theme/tokens';
import { resolveExerciseTargetMuscle } from '../../../utils/gymUtils';
import { hapticLight, hapticMedium, hapticSelection } from '../../../utils/haptics';

import { OverloadSuggestion } from '../../../utils/progressiveOverload';

export interface OverloadBannerProps {
  overloadSuggestion?: OverloadSuggestion | any | null;
}

export const OverloadBanner: React.FC<OverloadBannerProps> = ({ overloadSuggestion }) => {
  // Only display when there is a REAL progressive overload recommendation with active target weight
  // (Do NOT show when calibrating baseline or when there's no actual progressive overload data)
  if (!overloadSuggestion || overloadSuggestion.state === 'BASELINE') {
    return null;
  }

  const targetWeight = overloadSuggestion.recommended || overloadSuggestion.suggestedWeight || 0;
  if (targetWeight <= 0) {
    return null;
  }

  const repsText = overloadSuggestion.suggestedReps || overloadSuggestion.reps || '8-12';
  const delta = (overloadSuggestion.isWeightIncrease || overloadSuggestion.type === 'increase') && overloadSuggestion.weightDelta
    ? ` (+${overloadSuggestion.weightDelta} kg)`
    : '';
  const suggestionText = `Progressive Overload: ${targetWeight} kg × ${repsText}${delta}`;

  return (
    <View style={headerStyles.overloadRow}>
      <Ionicons name="trending-up" size={13} color={IOS_DARK.green} />
      <Text style={headerStyles.overloadText} numberOfLines={1} ellipsizeMode="tail">
        {suggestionText}
      </Text>
    </View>
  );
};

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
  activeSetIndex,
  isAllComplete,
  onRepeatPrevious,
  colors,
  gymLogs,
  onSwapPress,
  onSupersetPress,
  onVideoToggle,
  onSwitchToPartner,
  onNoteChange,
  onOpenExerciseMenu,
}) => {
  const rawMuscle = exercise.muscle;
  const resolved = resolveExerciseTargetMuscle(exercise.name, rawMuscle).targetMuscle;
  const muscleName = resolved || rawMuscle || 'Mixed';

  const targetSubtitle = `${muscleName} · Target: ${exercise.targetSets || 3} × ${exercise.targetReps || '8-10'}${lastTimeData ? ` · ${lastTimeData}` : ''}`;

  // Visual Volume Landmark Tracking (Integer Sets, No Bulky Pills)
  const landmarkInfo = React.useMemo(() => {
    if (!gymLogs || gymLogs.length === 0) return null;
    const { calculateMuscleLoad, getHypertrophyLandmarkInfo, canonicalizeMuscleSlug } = require('../../../services/muscleRecoveryService');
    const slug = canonicalizeMuscleSlug(muscleName);
    if (!slug) return null;
    const weeklyLoad = calculateMuscleLoad(gymLogs, 7, undefined, false);
    const sets = Math.round(weeklyLoad[slug] || 0); // Discrete integer: 2, 3, 4, 5...
    const info = getHypertrophyLandmarkInfo(sets);

    let statusText = '';
    if (sets === 0) {
      statusText = 'No sets yet this week';
    } else if (sets < 6) {
      statusText = `${6 - sets} more sets for baseline`;
    } else if (sets < 10) {
      statusText = `${10 - sets} sets to growth sweet spot`;
    } else if (sets <= 16) {
      statusText = 'Optimal Growth Sweet Spot 🟢';
    } else if (sets <= 20) {
      statusText = 'High Volume';
    } else {
      statusText = 'High Volume Alert';
    }

    return {
      sets,
      statusText,
      color: info.tierColor,
    };
  }, [gymLogs, muscleName]);

  return (
    <View style={headerStyles.container}>
      {/* ── Exercise Title & Target Subtitle Centered Above in the Middle ── */}
      <View style={headerStyles.titleContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Text
            style={[headerStyles.exerciseTitle, { flex: 1, textAlign: 'left' }, colors?.textPrimary && { color: colors.textPrimary }]}
            numberOfLines={2}
          >
            {exercise.name}
          </Text>
          <TouchableOpacity
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 8,
            }}
            onPress={() => {
              hapticSelection();
              onOpenExerciseMenu?.();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={[headerStyles.subtitle, { textAlign: 'left', alignSelf: 'flex-start' }, colors?.textSecondary && { color: colors.textSecondary }]} numberOfLines={1}>
          {targetSubtitle}
        </Text>

        {/* Sleek, Minimal Non-Pill Volume Indicator */}
        {landmarkInfo && (
          <View style={headerStyles.volumeRow}>
            <View style={[headerStyles.volumeDot, { backgroundColor: landmarkInfo.color }]} />
            <Text style={headerStyles.volumeText}>
              <Text style={headerStyles.volumeSets}>{landmarkInfo.sets}</Text>
              <Text style={headerStyles.volumeTotal}>/16 weekly sets · </Text>
              <Text style={[headerStyles.volumeStatus, { color: landmarkInfo.color }]}>
                {landmarkInfo.statusText}
              </Text>
            </Text>
          </View>
        )}
      </View>

      {/* ── Clean Circular Action Buttons Centered Below ── */}
      <View style={headerStyles.actionsRow}>
        <TouchableOpacity
          onPress={() => {
            hapticMedium();
            onSwapPress();
          }}
          style={headerStyles.circleBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="swap-horizontal" size={16} color="rgba(255, 255, 255, 0.85)" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            hapticLight();
            onVideoToggle();
          }}
          style={[
            headerStyles.circleBtn,
            showVideo && { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showVideo ? 'close' : 'play'}
            size={16}
            color={showVideo ? '#000000' : 'rgba(255, 255, 255, 0.85)'}
          />
        </TouchableOpacity>
      </View>

      {/* ── Progressive Overload Inline Card / Banner ── */}
      <OverloadBanner overloadSuggestion={overloadSuggestion} />

      {/* ── Superset Partner Switcher (if in a superset group) ── */}
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
  container: {
    marginBottom: 12,
    alignItems: 'center',
    gap: 8,
  },
  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 3,
  },
  exerciseTitle: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bold,
    color: IOS_DARK.labelPrimary,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.body,
    color: IOS_DARK.labelSecondary,
    textAlign: 'center',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  volumeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  volumeText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
  },
  volumeSets: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  volumeTotal: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
  },
  volumeStatus: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 2,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    marginTop: 4,
  },
  overloadText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: IOS_DARK.green,
    letterSpacing: 0.1,
    textAlign: 'center',
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
    marginTop: 2,
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
