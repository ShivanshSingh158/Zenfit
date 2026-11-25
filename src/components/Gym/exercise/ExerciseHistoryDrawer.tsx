/**
 * ExerciseHistoryDrawer — ZenTrack Mobile
 */

import React from 'react';
import { formatDateShort } from '../../../utils/dateUtils';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { X } from 'lucide-react-native';
import { FONT_FAMILY, FONT_SIZE, ICON, SPACE, RADIUS, TOUCH, ThemeTokens } from '../../../theme/tokens';
import { useGymLogs } from '../../../contexts/domains/WellnessContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { formatWeight, useWeightUnit } from '../../../utils/weightUnit';
import { NumericText, TactileButton } from '../../ui';
import BottomSheet from '../../ui/BottomSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { normalizeExerciseKey } from '../../../utils/gymUtils';
import { estimate1RM } from '../../../services/oneRepMaxEngine';
import { useLatestNonNull } from '../../../hooks/useLatestNonNull';

interface Props {
  visible: boolean;
  exerciseName: string | null;
  exerciseId: string | null;
  onClose: () => void;
}

type HistoryItem = { date: string; logItem?: any; ex?: any };

export function ExerciseHistoryDrawer({ visible, exerciseName, exerciseId, onClose }: Props) {
  const { tokens } = useTheme();
  const unitIsLbs = useWeightUnit();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => makeStyles(tokens), [tokens]);
  const { gymLogs } = useGymLogs();

  const activeName = useLatestNonNull(exerciseName);
  const activeId = useLatestNonNull(exerciseId);

  const history = React.useMemo<HistoryItem[]>(() => {
    if (!visible || !gymLogs) return [];
    const currentId = activeId ?? exerciseId;
    const currentName = activeName ?? exerciseName;
    const targetKey = currentName ? normalizeExerciseKey(currentName) : '';

    if (currentId === 'all') {
      return gymLogs
        .filter(log => log.exercises && log.exercises.length > 0)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .map(log => ({ date: log.date, logItem: log }));
    }
    return gymLogs
      .map(log => ({
        date: log.date,
        ex: log.exercises?.find((e: any) =>
          (currentId && (e.exerciseId === currentId || e.id === currentId)) ||
          (targetKey && normalizeExerciseKey(e.name) === targetKey)
        ),
      }))
      .filter(item => Boolean(item.ex))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 20);
  }, [visible, gymLogs, exerciseId, exerciseName, activeId, activeName]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      sheetHeight="70%"
      noPadding={true}
    >
      <View style={{ flex: 1, padding: SPACE.xl, paddingTop: SPACE.xs, paddingBottom: Math.max(insets.bottom, SPACE.xl) }}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{activeName || exerciseName} History</Text>
          <TactileButton
            variant="custom"
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel="Close exercise history"
          >
            <X size={ICON.md} strokeWidth={ICON.strokeWidth} color={tokens.text.primary} />
          </TactileButton>
        </View>

        <FlatList
          data={history}
          keyExtractor={(item, idx) => `${item.date}_${idx}`}
          renderItem={({ item }) => {
            if (exerciseId === 'all') {
              const log = (item as any).logItem;
              const totalExercises = log.exercises?.length || 0;
              const duration = log.workoutDurationMinutes ? `${log.workoutDurationMinutes} mins` : 'Completed';
              return (
                <View style={styles.item}>
                  <NumericText style={styles.dateText}>{formatDateShort(item.date)}</NumericText>
                  <View style={styles.statsRow}>
                    <NumericText style={styles.stat}>{totalExercises} Exercises</NumericText>
                    <NumericText style={styles.stat}>{duration}</NumericText>
                  </View>
                </View>
              );
            }

            const ex = (item as any).ex!;
            const completedSets = (ex.setsLog || []).filter((s: any) => s.completed && !s.isWarmup);
            const maxWeight = Math.max(0, ...completedSets.filter((s: any) => Number(s.weight) > 0).map((s: any) => Number(s.weight)));
            const setsStr = completedSets
              .map((s: any) => `${Number(s.reps) || 0}×${formatWeight(Number(s.weight) || 0, unitIsLbs, 1)}`)
              .join(', ');

            const best1RMSet = completedSets.reduce((best: any, s: any) => {
              const w = Number(s.weight) || 0;
              const r = Number(s.reps) || 0;
              const rm = w && r ? estimate1RM(w, r, 'epley') : 0;
              const bw = Number(best?.weight) || 0;
              const br = Number(best?.reps) || 0;
              const bestRm = bw && br ? estimate1RM(bw, br, 'epley') : 0;
              return rm > bestRm ? s : best;
            }, null);
            const bw = Number(best1RMSet?.weight) || 0;
            const br = Number(best1RMSet?.reps) || 0;
            const est1RM = bw && br ? Math.round(estimate1RM(bw, br, 'epley')) : null;

            return (
              <View style={styles.item}>
                <NumericText style={styles.dateText}>{formatDateShort(item.date)}</NumericText>
                <View style={styles.statsRow}>
                  <NumericText style={styles.stat}>
                    Max: {maxWeight > 0 ? formatWeight(maxWeight, unitIsLbs, 1) : '-'}
                  </NumericText>
                  {est1RM && (
                    <View style={styles.oneRMBadge}>
                      <NumericText style={styles.oneRMText}>~{formatWeight(est1RM, unitIsLbs, 0)} 1RM</NumericText>
                    </View>
                  )}
                  <NumericText style={styles.stat}>
                    Sets: {setsStr || 'None'}
                  </NumericText>
                </View>
              </View>
            );
          }}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={5}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No history found.</Text>
          }
        />
      </View>
    </BottomSheet>
  );
}

const makeStyles = (tokens: ThemeTokens) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACE.lg,
  },
  title: {
    flex: 1,
    fontFamily: FONT_FAMILY.bold,
    fontSize: FONT_SIZE.lg,
    color: tokens.text.primary,
  },
  closeBtn: {
    width: TOUCH.minTarget,
    height: TOUCH.minTarget,
    backgroundColor: tokens.bg.surface,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    paddingVertical: SPACE.md,
    borderBottomWidth: tokens.border.hairlineWidth,
    borderBottomColor: tokens.border.subtle,
  },
  dateText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: FONT_SIZE.base,
    color: tokens.text.primary,
    marginBottom: SPACE.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACE.sm,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  stat: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: FONT_SIZE.sm,
    color: tokens.text.secondary,
  },
  oneRMBadge: {
    backgroundColor: tokens.status.warningDim,
    paddingHorizontal: SPACE.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  oneRMText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.xs,
    color: tokens.status.warning,
  },
  emptyText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: FONT_SIZE.md,
    color: tokens.text.muted,
    textAlign: 'center',
    marginTop: SPACE.xxl,
  },
});
