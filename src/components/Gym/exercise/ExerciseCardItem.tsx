import React, { memo, useMemo } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import {
  Activity,
  Check,
  Cpu,
  Disc,
  Dumbbell,
  GitFork,
  Plus,
  Repeat,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { Image as ExpoImage } from 'expo-image';
import { resolveMuscleColor, getPreviousExerciseSession, normalizeExerciseKey } from '../../../utils/gymUtils';
import { formatWeight, useWeightUnit } from '../../../utils/weightUnit';
import { hapticSelection, hapticSuccess } from '../../../utils/haptics';
import { DARK_TOKENS, ICON, RADIUS, SPACE, ThemeTokens } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { NumericText } from '../../ui';
import type { ExerciseCatalogEntry } from '../../../types/gym.types';
import { resolveExercise, getExerciseStillPosterUrl, getExerciseThumbnailUrl } from '../../../services/exerciseMediaService';

export interface ExerciseCardItemProps {
  item: ExerciseCatalogEntry;
  onSelect: (item: ExerciseCatalogEntry) => void;
  onQuickAdd: (item: ExerciseCatalogEntry) => void;
  gymLogs?: any[];
  historyMap?: Map<string, any> | null;
  colors: any;
  styles: any;
  isDark?: boolean;
  isSelected?: boolean;
  multiSelectMode?: boolean;
  isMultiSelected?: boolean;
}

export function getEquipmentGlyph(
  name: string,
  aliases: string[] = [],
  t: ThemeTokens = DARK_TOKENS
): {
  type: string;
  glyph: string;
  Icon: LucideIcon;
  color: string;
} {
  const n = (name + ' ' + (aliases || []).join(' ')).toLowerCase();
  if (n.includes('dumbbell') || n.includes('db ') || n.includes('(db)')) {
    return { type: 'Dumbbell', glyph: 'DB', Icon: Activity, color: t.status.info };
  }
  if (
    n.includes('barbell') ||
    n.includes('bb ') ||
    n.includes('(bb)') ||
    n.includes('bench press') ||
    n.includes('deadlift') ||
    n.includes('squat') ||
    n.includes('overhead press')
  ) {
    return { type: 'Barbell', glyph: 'BB', Icon: Dumbbell, color: t.status.warning };
  }
  if (
    n.includes('cable') ||
    n.includes('pulley') ||
    n.includes('pushdown') ||
    n.includes('pulldown') ||
    n.includes('crossover') ||
    n.includes('face pull')
  ) {
    return { type: 'Cable', glyph: 'CB', Icon: GitFork, color: t.accent.secondary };
  }
  if (
    n.includes('machine') ||
    n.includes('smith') ||
    n.includes('leg press') ||
    n.includes('hack') ||
    n.includes('pec deck') ||
    n.includes('extension') ||
    n.includes('seated row')
  ) {
    return { type: 'Machine', glyph: 'MC', Icon: Cpu, color: t.status.success };
  }
  if (n.includes('kettlebell') || n.includes('kb ')) {
    return { type: 'Kettlebell', glyph: 'KB', Icon: Activity, color: t.status.warning };
  }
  if (n.includes('band')) {
    return { type: 'Band', glyph: 'RB', Icon: Repeat, color: t.accent.secondary };
  }
  if (n.includes('plate')) {
    return { type: 'Plate', glyph: 'PL', Icon: Disc, color: t.text.secondary };
  }
  return { type: 'Bodyweight', glyph: 'BW', Icon: User, color: t.status.info };
}

export function getSecondaryMuscles(exerciseName: string, primaryMuscle: string): string {
  const n = (exerciseName || '').toLowerCase();
  const m = (primaryMuscle || '').toLowerCase();

  if (m.includes('chest')) {
    if (n.includes('incline')) return '· Front Delts, Triceps';
    if (n.includes('fly') || n.includes('cable')) return '· Anterior Deltoids';
    return '· Triceps, Front Delts';
  }
  if (m.includes('back') || m.includes('lat')) {
    if (n.includes('row')) return '· Rhomboids, Biceps, Traps';
    if (n.includes('pulldown') || n.includes('pull-up') || n.includes('chin')) return '· Biceps, Rear Delts';
    if (n.includes('deadlift')) return '· Glutes, Hamstrings, Traps';
    return '· Biceps, Rear Delts';
  }
  if (m.includes('quad') || m.includes('leg')) {
    if (n.includes('squat')) return '· Glutes, Adductors';
    if (n.includes('leg press')) return '· Glutes, Hamstrings';
    if (n.includes('lunge') || n.includes('split')) return '· Glutes, Core';
    return '· Glutes, Calves';
  }
  if (m.includes('hamstring') || m.includes('glute')) {
    if (n.includes('rdl') || n.includes('romanian')) return '· Glutes, Lower Back';
    return '· Lower Back, Calves';
  }
  if (m.includes('shoulder') || m.includes('delt')) {
    if (n.includes('lateral')) return '· Traps, Forearms';
    if (n.includes('rear') || n.includes('face pull')) return '· Rotator Cuff, Traps';
    return '· Triceps, Upper Chest';
  }
  if (m.includes('bicep')) {
    return '· Brachialis, Forearms';
  }
  if (m.includes('tricep')) {
    return '· Forearms, Anconeus';
  }
  if (m.includes('ab') || m.includes('core')) {
    return '· Hip Flexors, Obliques';
  }
  if (m.includes('calf') || m.includes('calves')) {
    return '· Soleus, Tibialis';
  }
  if (m.includes('cardio')) {
    return '· Cardiovascular System';
  }
  return '· Stabilizers';
}

export function getPastPerformanceSnippet(
  exerciseName: string,
  gymLogs?: any[],
  historyMap?: Map<string, any> | null,
  unitIsLbs = false
): {
  snippet: string;
  hasHistory: boolean;
} {
  if (!exerciseName) {
    return { snippet: '3 sets × 8–12 reps', hasHistory: false };
  }

  let session: any = null;
  if (historyMap) {
    const key = normalizeExerciseKey(exerciseName);
    session = key ? historyMap.get(key) : null;
  } else if (gymLogs && gymLogs.length > 0) {
    session = getPreviousExerciseSession(exerciseName, gymLogs);
  }

  if (!session || !session.sets || session.sets.length === 0) {
    return { snippet: '3 sets × 8–12 reps', hasHistory: false };
  }

  const validSets = session.sets.filter((s: any) => (s.weight != null && s.weight > 0) || (s.reps != null && s.reps > 0));
  if (validSets.length === 0) {
    return { snippet: '3 sets × 8–12 reps', hasHistory: false };
  }

  const bestSet = [...validSets].sort((a: any, b: any) => (b.weight || 0) - (a.weight || 0))[0];
  const w =
    bestSet?.weight != null && bestSet.weight > 0
      ? formatWeight(Number(bestSet.weight), unitIsLbs, 1)
      : null;
  const r = bestSet?.reps != null && bestSet.reps > 0 ? `${bestSet.reps}` : null;

  let dateStr = '';
  if (session.sessionDate) {
    try {
      const parts = String(session.sessionDate).split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    } catch (_) {}
  }

  if (w && r) {
    return { snippet: `Last: ${w} × ${r}${dateStr ? ` · ${dateStr}` : ''}`, hasHistory: true };
  }
  if (w) {
    return { snippet: `Last: ${w}${dateStr ? ` · ${dateStr}` : ''}`, hasHistory: true };
  }
  if (r) {
    return { snippet: `Last: ${r} reps${dateStr ? ` · ${dateStr}` : ''}`, hasHistory: true };
  }

  return { snippet: '3 sets × 8–12 reps', hasHistory: false };
}

export function getTierConfig(t: ThemeTokens = DARK_TOKENS): Record<string, { bg: string; text: string; border: string }> {
  return {
    'S Tier': { bg: t.status.goldDim, text: t.status.gold, border: t.status.gold },
    'A+ Tier': { bg: t.accent.primaryDim, text: t.accent.primary, border: t.accent.primary },
    'A Tier': { bg: t.status.infoDim, text: t.status.info, border: t.status.info },
    'B Tier': { bg: t.accent.secondaryDim, text: t.accent.secondary, border: t.accent.secondary },
    'C Tier': { bg: t.bg.surface, text: t.text.secondary, border: t.border.subtle },
  };
}

export const TIER_CONFIG: Record<string, { bg: string; text: string; border: string }> = getTierConfig(DARK_TOKENS);

export const ExerciseCardItem: React.FC<ExerciseCardItemProps> = memo(({
  item,
  onSelect,
  onQuickAdd,
  gymLogs,
  historyMap,
  styles,
  isSelected,
  multiSelectMode = false,
  isMultiSelected = false,
}) => {
  const { tokens } = useTheme();
  const unitIsLbs = useWeightUnit();
  const cardStyles = useMemo(() => makeCardStyles(tokens), [tokens]);

  const primaryMuscle = item.muscle || 'Mixed';
  const muscleColor = resolveMuscleColor(primaryMuscle);
  const { snippet } = getPastPerformanceSnippet(item.name, gymLogs, historyMap, unitIsLbs);

  const def = useMemo(() => resolveExercise(item.id || item.name), [item.id, item.name]);
  const stillUrl = useMemo(() => (def ? getExerciseStillPosterUrl(def) : ''), [def]);
  const fallbackThumbUrl = useMemo(() => (def ? getExerciseThumbnailUrl(def) : ''), [def]);

  const activeHighlight = multiSelectMode ? isMultiSelected : isSelected;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.exerciseCard,
        activeHighlight && styles.exerciseCardSelected,
        pressed && { opacity: 0.78 },
      ]}
      onPress={() => onSelect(item)}
    >
      <View style={styles.exerciseCardInner}>
        <View style={cardStyles.thumbBox}>
          {stillUrl || fallbackThumbUrl ? (
            <ExpoImage
              source={{ uri: stillUrl || fallbackThumbUrl }}
              placeholder={fallbackThumbUrl ? { uri: fallbackThumbUrl } : undefined}
              style={cardStyles.thumbImg}
              contentFit="contain"
              recyclingKey={item.id || item.name}
              cachePolicy="memory-disk"
              priority="high"
            />
          ) : (
            <Dumbbell size={ICON.md} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0, paddingHorizontal: SPACE.sm + 2 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={styles.cardMuscleRow}>
            <View style={[styles.muscleDot, { backgroundColor: muscleColor }]} />
            <Text style={styles.cardMuscleText} numberOfLines={1}>
              {primaryMuscle}
              {snippet ? <NumericText style={styles.cardSnippetInline}> · {snippet}</NumericText> : null}
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.quickAddBtn,
            multiSelectMode && !isMultiSelected && {
              backgroundColor: tokens.bg.elevated,
              borderWidth: tokens.border.hairlineWidth,
              borderColor: tokens.border.subtle,
            },
            pressed && { opacity: 0.72 },
          ]}
          onPress={() => {
            if (multiSelectMode) {
              hapticSelection();
            } else {
              hapticSuccess();
            }
            onQuickAdd(item);
          }}
          hitSlop={tokens.touch.hitSlop}
        >
          {multiSelectMode ? (
            isMultiSelected ? (
              <>
                <Check size={11} strokeWidth={ICON.strokeWidth} color={tokens.accent.onPrimary} />
                <Text style={styles.quickAddBtnText}>Added</Text>
              </>
            ) : (
              <>
                <Plus size={11} strokeWidth={ICON.strokeWidth} color={tokens.text.primary} />
                <Text style={[styles.quickAddBtnText, { color: tokens.text.primary }]}>Select</Text>
              </>
            )
          ) : (
            <>
              <Plus size={11} strokeWidth={ICON.strokeWidth} color={tokens.accent.onPrimary} />
              <Text style={styles.quickAddBtnText}>Add</Text>
            </>
          )}
        </Pressable>
      </View>
    </Pressable>
  );
});

export default ExerciseCardItem;

const makeCardStyles = (tokens: ThemeTokens) => StyleSheet.create({
  thumbBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: tokens.bg.mediaLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbImg: {
    width: 38,
    height: 38,
  },
});
