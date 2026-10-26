import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { IOS_DARK } from '../../theme/tokens';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { resolveMuscleColor, canonicalizeMuscle } from '../../utils/gymUtils';

export interface GymExerciseDraggableRowProps {
  itemParams?: RenderItemParams<any>;
  exercise?: any;
  index?: number;
  isPartnerWithPrevious?: boolean;
  logCompleted: boolean;
  logWorkoutStartTime: number | null;
  logExercises?: any[];
  s: any;
  selectedDate: string;
  navigation: any;
  onResumeWorkout: (originalIndex?: number) => void;
  onShowHistory: (ex: { id: string; name: string }) => void;
  onShowMenu: (ex: any) => void;
  onToggleComplete?: (ex: any, originalIndex: number) => void;
}

export const GymExerciseDraggableRow: React.FC<GymExerciseDraggableRowProps> = React.memo(({
  itemParams,
  exercise,
  index,
  isPartnerWithPrevious: propIsPartner,
  logExercises,
  s,
  onResumeWorkout,
  onShowMenu,
  onToggleComplete,
}) => {
  const ex = exercise || itemParams?.item;
  if (!ex) return null;

  const drag = itemParams?.drag;
  const isActive = itemParams?.isActive || false;
  const originalIndex = index ?? ex.originalIndex ?? 0;

  const setsLog: any[] = ex.setsLog || [];
  const totalSets = setsLog.length || Number(ex.targetSets) || 3;
  const isDone = setsLog.length > 0 && setsLog.every((set: any) => set.completed);

  // Muscle metadata
  const muscleName = canonicalizeMuscle(ex.muscle);
  const muscleColor = resolveMuscleColor(ex.muscle);

  // Set progress calculation
  const completedSets = setsLog.filter((set: any) => set.completed);
  const completedCount = completedSets.length;

  let progressLabel = '';
  if (completedCount === 0) {
    progressLabel = `${totalSets} sets × ${ex.targetReps || '8–12'} reps${ex.restTimeSecs ? ` · ⏱ ${ex.restTimeSecs}s` : ''}`;
  } else if (completedCount < totalSets) {
    const lastDone = completedSets[completedSets.length - 1];
    const w = lastDone?.weight != null ? lastDone.weight : (lastDone?.weightKg != null ? lastDone.weightKg : null);
    const r = lastDone?.reps != null ? lastDone.reps : null;
    const detail = w ? ` · ${w}kg${r ? ` × ${r}` : ''}` : (r ? ` · ${r} reps` : '');
    progressLabel = `${completedCount}/${totalSets} sets${detail}`;
  } else {
    const weights = completedSets
      .map((set: any) => Number(set.weight || set.weightKg || 0))
      .filter((n: number) => n > 0);
    const topW = weights.length > 0 ? Math.max(...weights) : null;
    progressLabel = `Completed${topW ? ` · ${topW}kg` : ''}`;
  }

  return (
    <View style={s.rowWrapper}>
      <View
        style={[
          s.row,
          isActive && { backgroundColor: IOS_DARK.bgElevatedInput },
        ]}
      >
        {/* ── ZONE 1: Left 80% Touch Zone (Opens Workout / Deep Dive) ── */}
        <TouchableOpacity
          style={s.heroLeftTouchZone}
          activeOpacity={0.7}
          onPress={() => {
            if (isActive) return;
            hapticLight();
            onResumeWorkout(originalIndex);
          }}
          onLongPress={() => {
            hapticMedium();
            if (drag && typeof drag === 'function') {
              drag();
            } else if (onShowMenu) {
              onShowMenu(ex);
            }
          }}
          delayLongPress={220}
        >
          {/* Header: Subtle Muscle Indicator Dot + Name */}
          <View style={s.heroMetaRow}>
            <View style={[s.heroMuscleDot, { backgroundColor: muscleColor }]} />
            <Text style={s.heroMuscleText} numberOfLines={1}>{muscleName}</Text>
          </View>

          {/* Exercise Title */}
          <Text
            style={[
              s.rowTitle,
              isDone && s.textStrikethrough,
              isActive && { color: IOS_DARK.accent, fontWeight: '700' },
            ]}
            numberOfLines={2}
          >
            {ex.name}
          </Text>

          {/* Sleek Segmented Set Progress Bar + Live Status */}
          <View style={s.heroProgressRow}>
            <View style={s.heroSegmentsWrap}>
              {Array.from({ length: Math.min(totalSets, 8) }).map((_, sIdx) => {
                const isSetDone = Boolean(setsLog[sIdx]?.completed);
                return (
                  <View
                    key={sIdx}
                    style={[
                      s.heroSegmentBar,
                      isSetDone ? s.heroSegmentCompleted : s.heroSegmentPending,
                    ]}
                  />
                );
              })}
            </View>
            <Text style={s.heroProgressText} numberOfLines={1}>
              {progressLabel}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── ZONE 2: Right 20% Fast-Action Zone ── */}
        <View style={s.heroRightActionZone}>
          {/* Fast Kebab Menu (···) */}
          <TouchableOpacity
            style={s.heroKebabBtn}
            hitSlop={{ top: 12, bottom: 8, left: 12, right: 12 }}
            activeOpacity={0.7}
            onPress={() => {
              hapticMedium();
              onShowMenu(ex);
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={17} color={IOS_DARK.labelSecondary} />
          </TouchableOpacity>

          {/* Dedicated Checkmark Completion Button */}
          <TouchableOpacity
            style={[
              s.heroCheckmarkBtn,
              isDone && s.heroCheckmarkBtnCompleted,
            ]}
            hitSlop={{ top: 8, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation?.();
              if (onToggleComplete) {
                onToggleComplete(ex, originalIndex);
              } else {
                hapticLight();
                onResumeWorkout(originalIndex);
              }
            }}
          >
            {isDone ? (
              <Ionicons name="checkmark" size={15} color="#FFFFFF" />
            ) : (
              <View style={s.heroCheckmarkHollow} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}, (prev, next) => {
  if (prev.exercise && next.exercise) {
    return (
      prev.exercise === next.exercise &&
      prev.index === next.index &&
      prev.isPartnerWithPrevious === next.isPartnerWithPrevious &&
      prev.logCompleted === next.logCompleted &&
      prev.logWorkoutStartTime === next.logWorkoutStartTime &&
      prev.s === next.s &&
      prev.selectedDate === next.selectedDate &&
      prev.onResumeWorkout === next.onResumeWorkout &&
      prev.onShowHistory === next.onShowHistory &&
      prev.onShowMenu === next.onShowMenu &&
      prev.onToggleComplete === next.onToggleComplete
    );
  }
  return (
    prev.itemParams?.item === next.itemParams?.item &&
    prev.itemParams?.isActive === next.itemParams?.isActive &&
    prev.logCompleted === next.logCompleted &&
    prev.logWorkoutStartTime === next.logWorkoutStartTime &&
    prev.s === next.s &&
    prev.selectedDate === next.selectedDate
  );
});

export default GymExerciseDraggableRow;
