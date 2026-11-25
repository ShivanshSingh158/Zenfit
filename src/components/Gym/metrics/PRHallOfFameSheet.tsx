/**
 * PRHallOfFameSheet — ZenTrack Mobile
 *
 * Shows all personal records sorted by date achieved (newest first).
 */
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { Dumbbell, Trophy, X } from 'lucide-react-native';
import { getAllPRs, PRRecord } from '../../../services/progressiveOverload';
import { useGymLogs } from '../../../contexts/domains/WellnessContext';
import { ICON, SPACE, TOUCH } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { NumericText, TactileButton } from '../../ui';
import BottomSheet from '../../ui/BottomSheet';
import { makePRHallOfFameStyles } from './prHallOfFameStyles';
import PRExerciseRow, { PREntry } from './PRExerciseRow';

interface Props {
  visible: boolean;
  onClose: () => void;
  gymLogs?: any[];
}

export default function PRHallOfFameSheet({ visible, onClose, gymLogs: propGymLogs }: Props) {
  const { colors, isDark, tokens } = useTheme();
  const s = useMemo(() => makePRHallOfFameStyles(colors, isDark), [colors, isDark]);

  const gymLogsContext = useGymLogs();
  const activeGymLogs = propGymLogs || gymLogsContext?.gymLogs || [];

  const [prs, setPRs] = useState<PRRecord>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (visible) {
      setLoading(true);
      getAllPRs(activeGymLogs)
        .then((data) => {
          if (!active) return;
          setPRs(data || {});
          setLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setPRs({});
          setLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [visible, activeGymLogs]);

  const entries: PREntry[] = useMemo(() => {
    if (!visible) return [];
    return Object.entries(prs)
      .map(([key, pr]) => ({
        name: key,
        exerciseName: pr.exerciseName,
        best1RM: pr.best1RM,
        heaviestWeight: pr.heaviestWeight,
        bestReps: pr.bestReps,
        achievedAt: pr.achievedAt,
      }))
      .filter((e) => (e.heaviestWeight && e.heaviestWeight > 0) || (e.best1RM && e.best1RM > 0))
      .sort((a, b) => (b.achievedAt ?? '').localeCompare(a.achievedAt ?? ''));
  }, [visible, prs]);

  const renderItem = useCallback(
    ({ item, index }: { item: PREntry; index: number }) => (
      <PRExerciseRow item={item} index={index} styles={s} colors={colors} />
    ),
    [s, colors]
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      avoidKeyboard={false}
    >
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
            <Trophy size={ICON.md} strokeWidth={ICON.strokeWidth} color={tokens.status.gold} />
            <Text style={s.title}>PR Hall of Fame</Text>
          </View>
          <Text style={s.subtitle}>Your verified all-time records</Text>
        </View>

        <TactileButton
          variant="custom"
          onPress={onClose}
          style={s.closeButton}
          hitSlop={TOUCH.hitSlop}
          accessibilityLabel="Close PR hall of fame"
        >
          <X size={ICON.md - 2} strokeWidth={ICON.strokeWidth} color={tokens.text.primary} />
        </TactileButton>
      </View>

      {!loading && entries.length > 0 && (
        <View style={s.metaBar}>
          <NumericText style={s.metaText}>
            {entries.length} {entries.length === 1 ? 'Record' : 'Records'} Set
          </NumericText>
          <Text style={s.metaSubText}>Ranked Newest First</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={tokens.accent.primary} style={{ marginVertical: SPACE.xxl }} />
      ) : entries.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIconCircle}>
            <Dumbbell size={ICON.xl + 4} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
          </View>
          <Text style={s.emptyText}>No PRs Logged Yet</Text>
          <Text style={s.emptyHint}>
            Complete working sets during your workouts to automatically calculate and record your all-time PRs.
          </Text>
        </View>
      ) : (
        <FlatList
          style={{ flexShrink: 1 }}
          data={entries}
          keyExtractor={(item) => item.name}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={5}
          contentContainerStyle={{ gap: SPACE.sm, paddingBottom: SPACE.xxl + SPACE.xs }}
          renderItem={renderItem}
        />
      )}
    </BottomSheet>
  );
}
