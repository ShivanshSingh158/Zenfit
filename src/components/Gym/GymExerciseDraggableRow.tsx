import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { IOS_DARK, FONT_FAMILY } from '../../theme/tokens';
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/haptics';
import { resolveMuscleColor, canonicalizeMuscle, resolveExerciseEquipment } from '../../utils/gymUtils';

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

  // Muscle and Equipment metadata
  const muscleName = canonicalizeMuscle(ex.muscle);
  const muscleColor = resolveMuscleColor(ex.muscle);
  const equipment = resolveExerciseEquipment(ex.name);

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
          {/* Header Meta Row: Muscle Micro-Indicator + Equipment */}
          <View style={s.heroMetaRow}>
            <View style={[s.heroMuscleDot, { backgroundColor: muscleColor }]} />
            <Text style={s.heroMuscleText} numberOfLines={1}>{muscleName}</Text>
            <Text style={s.heroMetaDivider}>•</Text>
            <View style={s.heroEquipmentWrap}>
              <Ionicons name={equipment.iconName as any} size={11} color={IOS_DARK.labelSecondary} />
              <Text style={s.heroEquipmentText}>{equipment.label}</Text>
            </View>
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

          {/* Set Completion Micro-Pills / Ticks */}
          {setsLog.length > 0 ? (
            <View style={s.heroSetPillsRow}>
              {setsLog.map((set: any, sIdx: number) => {
                const isSetDone = set.completed;
                const weightVal = set.weight != null ? set.weight : (set.weightKg != null ? set.weightKg : null);
                const repsVal = set.reps != null ? set.reps : null;

                return (
                  <View
                    key={sIdx}
                    style={[
                      s.heroSetPill,
                      isSetDone ? s.heroSetPillCompleted : s.heroSetPillPending,
                    ]}
                  >
                    <Text
                      style={
                        isSetDone ? s.heroSetPillTextCompleted : s.heroSetPillTextPending
                      }
                      numberOfLines={1}
                    >
                      {weightVal !== null ? `${weightVal}k` : '—'} × {repsVal !== null ? repsVal : (ex.targetReps || '10')}
                    </Text>
                    {isSetDone ? (
                      <Ionicons name="checkmark" size={10} color="#30D158" />
                    ) : (
                      <Text style={s.heroSetPillTextPending}>·</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={s.rowSubtitle}>
              {totalSets} sets × {ex.targetReps || '8–12'} reps
              {ex.restTimeSecs ? ` · ⏱ ${ex.restTimeSecs}s` : ''}
            </Text>
          )}
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
