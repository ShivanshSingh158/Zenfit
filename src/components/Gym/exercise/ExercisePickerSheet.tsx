import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronRight, Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet from '../../ui/BottomSheet';
import { NumericText, TactileButton } from '../../ui';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';
import { ExerciseHistoryProfile } from '../../../services/gymAnalyticsEngine';
import { formatWeight, useWeightUnit } from '../../../utils/weightUnit';
import { hapticLight, hapticSelection } from '../../../utils/haptics';

type SortMode = 'sessions' | 'recent' | 'weight';

interface ExercisePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  profiles: ExerciseHistoryProfile[];
  selectedName: string | null;
  onSelectExercise: (name: string) => void;
}

export const ExercisePickerSheet: React.FC<ExercisePickerSheetProps> = React.memo(
  function ExercisePickerSheet({
    visible,
    onClose,
    profiles,
    selectedName,
    onSelectExercise,
  }) {
    const { tokens, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const unitIsLbs = useWeightUnit();
    const styles = useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);

    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<'All' | 'Push' | 'Pull' | 'Legs' | 'Arms' | 'Core'>('All');
    const [sortBy, setSortBy] = useState<SortMode>('sessions');

    const filtered = useMemo(() => {
      let list = profiles || [];
      if (category !== 'All') {
        const t = category.toLowerCase();
        list = list.filter(p => {
          const cat = (p.category || '').toLowerCase();
          const mus = (p.muscle || '').toLowerCase();
          if (t === 'core') return cat.includes('core') || cat.includes('ab') || /\b(abs?|core|obliques?)\b/i.test(mus);
          return cat.includes(t) || mus.includes(t);
        });
      }
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        list = list.filter(p => p.name.toLowerCase().includes(q) || p.muscle.toLowerCase().includes(q));
      }
      const sorted = [...list];
      if (sortBy === 'recent') {
        sorted.sort((a, b) => b.lastLoggedDate.localeCompare(a.lastLoggedDate));
      } else if (sortBy === 'weight') {
        sorted.sort((a, b) => b.allTimeBestWeight - a.allTimeBestWeight);
      } else {
        sorted.sort((a, b) => b.totalSessions - a.totalSessions);
      }
      return sorted;
    }, [profiles, category, query, sortBy]);

    return (
      <BottomSheet
        visible={visible}
        onClose={onClose}
        fullHeight={true}
        noPadding={true}
        avoidKeyboard={true}
        sheetBackgroundColor={isDark ? '#0B0C10' : '#F8F8FA'}
      >
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, SPACE.md) }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Select Exercise</Text>
              <NumericText style={styles.subtitle}>
                {filtered.length} logged {filtered.length === 1 ? 'movement' : 'movements'}
              </NumericText>
            </View>
            <TactileButton
              variant="custom"
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={TOUCH.hitSlop}
              accessibilityLabel="Close exercise picker"
            >
              <X size={16} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
            </TactileButton>
          </View>

          <View style={styles.controlsWrap}>
            <View style={styles.searchBox}>
              <Search size={16} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search lift or muscle..."
                placeholderTextColor={tokens.text.muted}
                style={styles.searchInput}
                autoCorrect={false}
              />
              {query.length > 0 && (
                <TactileButton variant="custom" onPress={() => setQuery('')} hitSlop={TOUCH.hitSlop}>
                  <X size={15} color={tokens.text.muted} />
                </TactileButton>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {(['All', 'Push', 'Pull', 'Legs', 'Arms', 'Core'] as const).map(c => {
                const active = category === c;
                return (
                  <TactileButton
                    key={c}
                    lightweight
                    variant="custom"
                    onPress={() => {
                      hapticSelection();
                      setCategory(c);
                    }}
                    style={[styles.catChip, active && styles.catChipActive]}
                  >
                    <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                      {c}
                    </Text>
                  </TactileButton>
                );
              })}
            </ScrollView>

            <View style={styles.sortRow}>
              <Text style={styles.sortLabel}>SORT BY</Text>
              <View style={styles.sortPills}>
                {([
                  { id: 'sessions', label: 'Most Logged' },
                  { id: 'recent', label: 'Recent' },
                  { id: 'weight', label: 'Heaviest' },
                ] as const).map(opt => {
                  const active = sortBy === opt.id;
                  return (
                    <TactileButton
                      key={opt.id}
                      lightweight
                      variant="custom"
                      onPress={() => {
                        hapticSelection();
                        setSortBy(opt.id);
                      }}
                      style={[styles.sortPill, active && styles.sortPillActive]}
                    >
                      <Text style={[styles.sortPillText, active && styles.sortPillTextActive]}>
                        {opt.label}
                      </Text>
                    </TactileButton>
                  );
                })}
              </View>
            </View>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={item => item.name}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSel = item.name === selectedName;
              const statusColor =
                item.progressionStatus.status === 'progressing'
                  ? tokens.status.success
                  : item.progressionStatus.status === 'stalled'
                  ? tokens.status.warning
                  : tokens.text.muted;
              const statusLabel =
                item.progressionStatus.status === 'progressing'
                  ? 'UP'
                  : item.progressionStatus.status === 'stalled'
                  ? 'FLAT'
                  : item.progressionStatus.status === 'baseline'
                  ? 'NEW'
                  : 'STEADY';

              return (
                <Pressable
                  onPress={() => {
                    hapticLight();
                    onSelectExercise(item.name);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.rowCard,
                    isSel && styles.rowCardSelected,
                    pressed && { opacity: 0.78 },
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <Text style={styles.exName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <NumericText style={styles.exSub} numberOfLines={1}>
                      {item.muscle} · {item.totalSessions} sess · Best{' '}
                      {item.allTimeBestWeight > 0
                        ? formatWeight(item.allTimeBestWeight, unitIsLbs, 1)
                        : 'BW'}
                    </NumericText>
                  </View>

                  <View style={styles.rowRight}>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1F` }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {statusLabel}
                      </Text>
                    </View>
                    <ChevronRight size={15} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      </BottomSheet>
    );
  }
);

const makeStyles = (tokens: ThemeTokens, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACE.lg,
      paddingTop: SPACE.xs,
      paddingBottom: SPACE.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: tokens.border.subtle,
    },
    title: {
      fontSize: 17,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.primary,
    },
    subtitle: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.secondary,
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.inner,
      backgroundColor: isDark ? '#14161D' : tokens.bg.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlsWrap: {
      paddingHorizontal: SPACE.lg,
      paddingTop: SPACE.md,
      gap: 10,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 40,
      borderRadius: RADIUS.inner,
      paddingHorizontal: 12,
      backgroundColor: isDark ? '#14161D' : tokens.bg.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.border.subtle,
    },
    searchInput: {
      flex: 1,
      fontSize: 13.5,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.primary,
      paddingVertical: 0,
    },
    chipsRow: {
      gap: 6,
      paddingVertical: 2,
    },
    catChip: {
      minHeight: 28,
      paddingHorizontal: 12,
      borderRadius: RADIUS.sm,
      backgroundColor: isDark ? '#14161D' : tokens.bg.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catChipActive: {
      backgroundColor: tokens.accent.primary,
    },
    catChipText: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.secondary,
    },
    catChipTextActive: {
      fontFamily: FONT_FAMILY.bold,
      color: tokens.accent.onPrimary,
    },
    sortRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 4,
    },
    sortLabel: {
      fontSize: 10,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.muted,
      letterSpacing: 0.6,
    },
    sortPills: {
      flexDirection: 'row',
      gap: 6,
    },
    sortPill: {
      minHeight: 26,
      paddingHorizontal: 10,
      borderRadius: 6,
      backgroundColor: isDark ? '#14161D' : tokens.bg.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sortPillActive: {
      backgroundColor: tokens.accent.primaryDim,
    },
    sortPillText: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.secondary,
    },
    sortPillTextActive: {
      fontFamily: FONT_FAMILY.bold,
      color: tokens.accent.primary,
    },
    listContent: {
      paddingHorizontal: SPACE.lg,
      paddingTop: SPACE.sm,
      paddingBottom: SPACE.xl,
      gap: 6,
    },
    rowCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: RADIUS.md,
      backgroundColor: isDark ? '#14161D' : tokens.bg.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.border.subtle,
    },
    rowCardSelected: {
      backgroundColor: tokens.accent.primaryDim,
      borderColor: tokens.accent.primary,
    },
    exName: {
      fontSize: 14,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.primary,
    },
    exSub: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.secondary,
      marginTop: 2,
    },
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 5,
    },
    statusText: {
      fontSize: 9.5,
      fontFamily: FONT_FAMILY.bold,
      letterSpacing: 0.4,
    },
  });

export default ExercisePickerSheet;
