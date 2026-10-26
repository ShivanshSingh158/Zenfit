import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { IOS_DARK, FONT_FAMILY } from '../../theme/tokens';
import { hapticLight, hapticMedium } from '../../utils/haptics';

export interface GymExerciseDraggableRowProps {
  itemParams: RenderItemParams<any>;
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
  logExercises,
  s,
  onResumeWorkout,
  onShowMenu,
  onToggleComplete,
}) => {
  const { item: ex, drag, isActive } = itemParams;
  const setsLog = ex.setsLog || [];
  const isDone = setsLog.length > 0 && setsLog.every((set: any) => set.completed);
  const totalSets = setsLog.length;
  const completedSets = setsLog.filter((s: any) => s.completed);

  let subText = '';
  if (completedSets.length > 0) {
    const avgReps = Math.round(completedSets.reduce((sum: number, s: any) => sum + (Number(s.reps) || 0), 0) / completedSets.length) || 0;
    const weights = completedSets.map((s: any) => Number(s.weight ?? s.weightKg) || 0);
    const maxWeight = weights.length > 0 ? Math.max(0, ...weights) : 0;
    subText = `${completedSets.length}/${totalSets} sets · ~${avgReps} reps${maxWeight > 0 ? ` · Last: ${maxWeight}kg` : ''}`;
  } else {
    subText = `${totalSets} sets × ${ex.targetReps || '8-10'} reps`;
  }

  const isPartnerWithPrevious = ex.isPartnerWithPrevious ?? (
    Boolean(ex.supersetGroup && logExercises && logExercises[ex.originalIndex - 1]?.supersetGroup === ex.supersetGroup)
  );

  return (
    <View style={s.rowWrapper}>
      <TouchableOpacity
        style={[
          s.row,
          ex.supersetGroup && {
            backgroundColor: 'rgba(255,159,10,0.06)',
          },
          isActive && {
            backgroundColor: IOS_DARK.bgElevatedInput,
          },
        ]}
        activeOpacity={0.7}
        onPress={() => {
          if (isActive) return;
          hapticLight();
          onResumeWorkout(ex.originalIndex);
        }}
        onLongPress={() => {
          hapticMedium();
          if (drag && typeof drag === 'function') {
            drag();
          }
          if (onShowMenu) {
            onShowMenu(ex);
          }
        }}
        delayLongPress={200}
      >
        {isPartnerWithPrevious && (
          <View
            style={{
              position: 'absolute',
              top: -6,
              left: 25,
              width: 2,
              height: 12,
              backgroundColor: IOS_DARK.orange,
              zIndex: 1,
            }}
          />
        )}

        {/* Circular Checkbox (Apple HIG style) - Now directly tappable */}
        <TouchableOpacity
          style={[s.checkboxCircle, isDone && s.checkboxCircleDone]}
          onPress={(e) => {
            e.stopPropagation?.();
            if (onToggleComplete) {
              onToggleComplete(ex, ex.originalIndex ?? 0);
            } else {
              onResumeWorkout(ex.originalIndex);
            }
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          {isDone ? (
            <Ionicons name="checkmark" size={13} color="#FFFFFF" />
          ) : (
            <View style={s.checkboxHollow} />
          )}
        </TouchableOpacity>

        {/* Exercise Info */}
        <View style={s.rowTextCol}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingRight: 4 }}>
            <Text
              style={[
                s.rowTitle,
                isDone && s.textStrikethrough,
                isActive && { color: IOS_DARK.accent, fontWeight: '700' },
              ]}
            >
              {ex.name}
            </Text>
            {ex.supersetGroup && (
              <View style={s.supersetTag}>
                <Text style={s.supersetTagText}>
                  SUPER-{ex.supersetGroup}
                </Text>
              </View>
            )}
          </View>
          <Text style={s.rowSubtitle}>{subText}</Text>
        </View>

        {/* Right Action / Chevron */}
        <View style={s.rowActions}>
          <TouchableOpacity
            style={s.actionBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => {
              hapticMedium();
              onShowMenu(ex);
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={IOS_DARK.labelSecondary} />
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={14} color={IOS_DARK.labelTertiary} style={{ marginLeft: 2 }} />
        </View>
      </TouchableOpacity>
    </View>
  );
}, (prev, next) =>
  prev.itemParams.item === next.itemParams.item &&
  prev.itemParams.isActive === next.itemParams.isActive &&
  prev.logCompleted === next.logCompleted &&
  prev.logWorkoutStartTime === next.logWorkoutStartTime &&
  prev.logExercises === next.logExercises &&
  prev.s === next.s &&
  prev.selectedDate === next.selectedDate &&
  prev.onResumeWorkout === next.onResumeWorkout &&
  prev.onShowHistory === next.onShowHistory &&
  prev.onShowMenu === next.onShowMenu &&
  prev.onToggleComplete === next.onToggleComplete
);

export default GymExerciseDraggableRow;
