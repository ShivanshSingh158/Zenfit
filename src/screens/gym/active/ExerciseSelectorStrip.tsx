import React from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Text } from 'react-native';

import { useTheme } from '../../../contexts/ThemeContext';
import { TactileButton, NumericText, AppIcon } from '../../../components/ui';
import { MiniMannequinButton } from '../../../components/workout';

export interface ExerciseSelectorStripProps {
  exercises: any[];
  visualExIndex: number;
  totalCompletedSets: number;
  carouselScrollRef: React.RefObject<ScrollView | null>;
  onPillLayout: (index: number, e: LayoutChangeEvent) => void;
  onSelectIndex: (index: number) => void;
  onOpenWhatHits: () => void;
}

export const ExerciseSelectorStrip: React.FC<ExerciseSelectorStripProps> = React.memo(
  function ExerciseSelectorStrip({
    exercises,
    visualExIndex,
    totalCompletedSets,
    carouselScrollRef,
    onPillLayout,
    onSelectIndex,
    onOpenWhatHits,
  }) {
    const { tokens } = useTheme();

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: tokens.space.lg,
          paddingVertical: tokens.space.sm,
          borderBottomWidth: tokens.border.hairlineWidth,
          borderColor: tokens.border.subtle,
        }}
      >
        <ScrollView
          ref={carouselScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center', gap: tokens.space.sm }}
          style={{ flex: 1, marginRight: tokens.space.sm }}
        >
          {exercises.map((ex, idx) => {
            const isCurrent = idx === visualExIndex;
            const completedCount = ex.setsLog?.filter((s: any) => s.completed).length || 0;
            const totalCount = ex.setsLog?.length || 0;
            const isExDone = totalCount > 0 && completedCount === totalCount;
            const isExPartial = completedCount > 0 && !isExDone;

            const pillBg = isExDone
              ? tokens.status.success
              : isExPartial
              ? tokens.status.warning
              : tokens.bg.elevated;
            const pillTextColor = isExDone
              ? tokens.status.onSuccess
              : isExPartial || isCurrent
              ? tokens.text.primary
              : tokens.text.secondary;

            return (
              <TactileButton
                key={ex.exerciseId || ex.name || idx}
                variant="custom"
                haptic="selection"
                hitSlop={tokens.touch.hitSlop}
                onLayout={(e) => onPillLayout(idx, e)}
                onPress={() => onSelectIndex(idx)}
                style={{
                  width: isCurrent ? 34 : 30,
                  height: isCurrent ? 34 : 30,
                  borderRadius: isCurrent ? tokens.radius.inner : tokens.radius.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: isCurrent ? 2 : tokens.border.hairlineWidth,
                  borderColor: isCurrent ? tokens.accent.primary : tokens.border.subtle,
                  padding: isCurrent ? 2 : 0,
                  backgroundColor: !isCurrent ? pillBg : 'transparent',
                }}
              >
                <View
                  style={{
                    width: isCurrent ? 26 : 28,
                    height: isCurrent ? 26 : 28,
                    borderRadius: isCurrent ? 7 : tokens.radius.sm,
                    backgroundColor: isCurrent ? pillBg : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <NumericText style={{ fontSize: 12, color: pillTextColor }}>
                    {idx + 1}
                  </NumericText>
                </View>
              </TactileButton>
            );
          })}
        </ScrollView>

        <MiniMannequinButton
          onPress={onOpenWhatHits}
          hasWorkedMuscles={totalCompletedSets > 0}
          exercises={exercises}
        />
      </View>
    );
  }
);

export interface ExerciseFooterNavProps {
  visualExIndex: number;
  exercises: any[];
  onPrev: () => void;
  onNextOrFinish: () => void;
}

export const ExerciseFooterNav: React.FC<ExerciseFooterNavProps> = React.memo(
  function ExerciseFooterNav({ visualExIndex, exercises, onPrev, onNextOrFinish }) {
    const { tokens } = useTheme();
    const isFirst = visualExIndex <= 0;
    const isLast = visualExIndex >= exercises.length - 1;
    const nextExercise = !isLast ? exercises[visualExIndex + 1] : null;
    const nextLabel = nextExercise?.name ? nextExercise.name : 'Next';

    return (
      <View
        style={[
          footerStyles.bar,
          { borderTopColor: tokens.border.subtle },
        ]}
      >
        <TactileButton
          variant="ghost"
          haptic="selection"
          disabled={isFirst}
          onPress={onPrev}
          style={footerStyles.navBtn}
        >
          <AppIcon
            icon={ChevronLeft}
            size={16}
            color={isFirst ? tokens.text.muted : tokens.text.secondary}
          />
          <Text
            style={[
              tokens.typography.label,
              {
                fontFamily: tokens.font.semibold,
                color: isFirst ? tokens.text.muted : tokens.text.secondary,
              },
            ]}
          >
            Previous
          </Text>
        </TactileButton>

        <TactileButton
          variant="ghost"
          haptic="selection"
          onPress={onNextOrFinish}
          style={[footerStyles.navBtn, footerStyles.nextBtn]}
        >
          {!isLast ? (
            <>
              <View style={{ alignItems: 'flex-end', maxWidth: 170 }}>
                <Text style={[footerStyles.upNextOverline, { color: tokens.text.muted }]}>
                  UP NEXT
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    tokens.typography.label,
                    { fontFamily: tokens.font.bold, color: tokens.accent.primary },
                  ]}
                >
                  {nextLabel}
                </Text>
              </View>
              <AppIcon icon={ChevronRight} size={17} color={tokens.accent.primary} />
            </>
          ) : (
            <>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[footerStyles.upNextOverline, { color: tokens.text.muted }]}>
                  FINAL EXERCISE
                </Text>
                <Text
                  style={[
                    tokens.typography.label,
                    { fontFamily: tokens.font.bold, color: tokens.status.success },
                  ]}
                >
                  Finish Workout
                </Text>
              </View>
              <AppIcon icon={ChevronRight} size={17} color={tokens.status.success} />
            </>
          )}
        </TactileButton>
      </View>
    );
  }
);

const footerStyles = StyleSheet.create({
  bar: {
    marginTop: 22,
    paddingTop: 14,
    paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 10,
  },
  nextBtn: {
    paddingRight: 4,
  },
  upNextOverline: {
    fontSize: 9.5,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.7,
    marginBottom: 1,
  },
});

export default ExerciseSelectorStrip;
