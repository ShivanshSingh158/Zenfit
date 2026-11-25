import React from 'react';
import { Pressable, View, Text } from 'react-native';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import { Check, MoreHorizontal } from 'lucide-react-native';
import { FONT_FAMILY, ICON, TOUCH } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { NumericText } from '../../ui';
import { hapticLight, hapticMedium } from '../../../utils/haptics';
import { formatWeight, useWeightUnit } from '../../../utils/weightUnit';
import { resolveMuscleColor, canonicalizeMuscle } from '../../../utils/gymUtils';

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
  s,
  onResumeWorkout,
  onShowMenu,
  onToggleComplete,
}) => {
  const { tokens } = useTheme();
  const unitIsLbs = useWeightUnit();
  const ex = exercise || itemParams?.item;
  if (!ex) return null;

  const drag = itemParams?.drag;
  const isActive = itemParams?.isActive || false;
  const originalIndex = index ?? ex.originalIndex ?? 0;

  const setsLog: any[] = ex.setsLog || [];
  const totalSets = setsLog.length || Number(ex.targetSets) || 3;
  const isDone = setsLog.length > 0 && setsLog.every((set: any) => set.completed);

  const muscleName = canonicalizeMuscle(ex.muscle);
  const muscleColor = resolveMuscleColor(ex.muscle);

  const completedSets = setsLog.filter((set: any) => set.completed);
  const completedCount = completedSets.length;

  let progressLabel = '';
  if (completedCount === 0) {
    progressLabel = `${totalSets} sets × ${ex.targetReps || '8–12'} reps${ex.restTimeSecs ? ` · ${ex.restTimeSecs}s` : ''}`;
  } else if (completedCount < totalSets) {
    const lastDone = completedSets[completedSets.length - 1];
    const w = lastDone?.weight != null ? lastDone.weight : (lastDone?.weightKg != null ? lastDone.weightKg : null);
    const r = lastDone?.reps != null ? lastDone.reps : null;
    const detail = w ? ` · ${formatWeight(Number(w), unitIsLbs, 1)}${r ? ` × ${r}` : ''}` : (r ? ` · ${r} reps` : '');
    progressLabel = `${completedCount}/${totalSets} sets${detail}`;
  } else {
    const weights = completedSets
      .map((set: any) => Number(set.weight || set.weightKg || 0))
      .filter((n: number) => n > 0);
    const topW = weights.length > 0 ? Math.max(...weights) : null;
    progressLabel = `Completed${topW ? ` · ${formatWeight(topW, unitIsLbs, 1)}` : ''}`;
  }

  return (
    <View style={s.rowWrapper}>
      <View
        style={[
          s.row,
          isActive && { backgroundColor: tokens.bg.elevated },
        ]}
      >
        <Pressable
          style={({ pressed }) => [s.heroLeftTouchZone, pressed && { opacity: 0.72 }]}
          onPress={() => {
            if (isActive) return;
            hapticLight();
            onResumeWorkout(originalIndex);
          }}
          onLongPress={() => {
            if (drag && typeof drag === 'function') {
              drag();
            } else if (onShowMenu) {
              onShowMenu(ex);
            }
          }}
          delayLongPress={220}
        >
          <Text
            style={[
              s.rowTitle,
              isDone && s.textStrikethrough,
              isActive && { color: tokens.accent.primary, fontFamily: FONT_FAMILY.bold },
            ]}
            numberOfLines={1}
          >
            {ex.name}
          </Text>

          <View style={s.cardMuscleRow || s.heroMetaRow}>
            <View style={[s.muscleDot || s.heroMuscleDot, { backgroundColor: muscleColor }]} />
            <NumericText style={s.cardMuscleText || s.heroMuscleText} numberOfLines={1}>
              {muscleName}
              <NumericText style={s.cardSnippetInline || s.heroProgressText}> · {progressLabel}</NumericText>
            </NumericText>
            {completedCount > 0 && completedCount < totalSets && (
              <View style={s.heroSegmentsWrap}>
                {Array.from({ length: Math.min(totalSets, 6) }).map((_, sIdx) => {
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
            )}
          </View>
        </Pressable>

        <View style={s.heroRightActionZone}>
          <Pressable
            style={({ pressed }) => [s.heroKebabBtn, pressed && { opacity: 0.65 }]}
            hitSlop={TOUCH.hitSlop}
            onPress={() => {
              hapticMedium();
              onShowMenu(ex);
            }}
            accessibilityLabel={`Options for ${ex.name}`}
          >
            <MoreHorizontal size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              s.heroCheckmarkBtn,
              isDone && s.heroCheckmarkBtnCompleted,
              pressed && { opacity: 0.72 },
            ]}
            hitSlop={TOUCH.hitSlop}
            onPress={(e) => {
              e?.stopPropagation?.();
              hapticLight();
              if (onToggleComplete) {
                onToggleComplete(ex, originalIndex);
              } else {
                onResumeWorkout(originalIndex);
              }
            }}
            accessibilityLabel={`Toggle ${ex.name} complete`}
          >
            {isDone ? (
              <Check size={ICON.xs} strokeWidth={ICON.strokeWidth} color={tokens.accent.onPrimary} />
            ) : null}
          </Pressable>
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
