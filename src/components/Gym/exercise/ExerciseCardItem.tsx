import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resolveMuscleColor, getPreviousExerciseSession } from '../../../utils/gymUtils';
import { FONT_FAMILY } from '../../../theme/tokens';
import { ExerciseCatalogEntry } from './ExerciseSearchDropdown';
import { hapticLight, hapticSuccess } from '../../../utils/haptics';

export interface ExerciseCardItemProps {
  item: ExerciseCatalogEntry;
  onSelect: (item: ExerciseCatalogEntry) => void;
  onQuickAdd: (item: ExerciseCatalogEntry) => void;
  gymLogs?: any[];
  colors: any;
  styles: any;
  isDark?: boolean;
  isSelected?: boolean;
}

// ── Equipment Glyph & Icon Resolver ─────────────────────────────────────────
export function getEquipmentGlyph(name: string, aliases: string[] = []): {
  type: string;
  glyph: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
} {
  const n = (name + ' ' + (aliases || []).join(' ')).toLowerCase();
  if (n.includes('dumbbell') || n.includes('db ') || n.includes('(db)')) {
    return { type: 'Dumbbell', glyph: 'DB', icon: 'fitness-outline', color: '#60a5fa' };
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
    return { type: 'Barbell', glyph: 'BB', icon: 'barbell-outline', color: '#f59e0b' };
  }
  if (
    n.includes('cable') ||
    n.includes('pulley') ||
    n.includes('pushdown') ||
    n.includes('pulldown') ||
    n.includes('crossover') ||
    n.includes('face pull')
  ) {
    return { type: 'Cable', glyph: 'CB', icon: 'git-commit-outline', color: '#a78bfa' };
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
    return { type: 'Machine', glyph: 'MC', icon: 'hardware-chip-outline', color: '#34d399' };
  }
  if (n.includes('kettlebell') || n.includes('kb ')) {
    return { type: 'Kettlebell', glyph: 'KB', icon: 'fitness-outline', color: '#fb923c' };
  }
  if (n.includes('band')) {
    return { type: 'Band', glyph: 'RB', icon: 'infinite-outline', color: '#f472b6' };
  }
  if (n.includes('plate')) {
    return { type: 'Plate', glyph: 'PL', icon: 'disc-outline', color: '#94a3b8' };
  }
  return { type: 'Bodyweight', glyph: 'BW', icon: 'body-outline', color: '#38bdf8' };
}

// ── Secondary Muscle Biomechanical Resolver ─────────────────────────────────
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

// ── Past Performance Snippet Generator ──────────────────────────────────────
export function getPastPerformanceSnippet(exerciseName: string, gymLogs?: any[]): {
  snippet: string;
  hasHistory: boolean;
} {
  if (!gymLogs || gymLogs.length === 0 || !exerciseName) {
    return { snippet: '3 sets × 8–12 reps', hasHistory: false };
  }

  const session = getPreviousExerciseSession(exerciseName, gymLogs);
  if (!session || !session.sets || session.sets.length === 0) {
    return { snippet: '3 sets × 8–12 reps', hasHistory: false };
  }

  const validSets = session.sets.filter((s: any) => (s.weight != null && s.weight > 0) || (s.reps != null && s.reps > 0));
  if (validSets.length === 0) {
    return { snippet: '3 sets × 8–12 reps', hasHistory: false };
  }

  // Find set with highest weight, or latest set
  const bestSet = [...validSets].sort((a: any, b: any) => (b.weight || 0) - (a.weight || 0))[0];
  const w = bestSet?.weight != null && bestSet.weight > 0 ? `${bestSet.weight}kg` : null;
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

// ── Tier Badges Theme ───────────────────────────────────────────────────────
export const TIER_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  'S Tier': { bg: 'rgba(255, 215, 0, 0.14)', text: '#FFD700', border: 'rgba(255, 215, 0, 0.45)' },
  'A+ Tier': { bg: 'rgba(0, 229, 255, 0.14)', text: '#00E5FF', border: 'rgba(0, 229, 255, 0.40)' },
  'A Tier': { bg: 'rgba(0, 229, 255, 0.12)', text: '#00E5FF', border: 'rgba(0, 229, 255, 0.35)' },
  'B Tier': { bg: 'rgba(137, 220, 235, 0.12)', text: '#89dceb', border: 'rgba(137, 220, 235, 0.30)' },
  'C Tier': { bg: 'rgba(142, 142, 147, 0.10)', text: '#8e8e93', border: 'rgba(142, 142, 147, 0.25)' },
};

export const ExerciseCardItem: React.FC<ExerciseCardItemProps> = memo(({
  item,
  onSelect,
  onQuickAdd,
  gymLogs,
  colors,
  styles,
  isDark = true,
  isSelected,
}) => {
  const primaryMuscle = item.muscle || 'Mixed';
  const muscleColor = resolveMuscleColor(primaryMuscle);
  const { snippet } = getPastPerformanceSnippet(item.name, gymLogs);

  return (
    <TouchableOpacity
      style={[styles.exerciseCard, isSelected && styles.exerciseCardSelected]}
      activeOpacity={0.7}
      onPress={() => {
        hapticLight();
        onSelect(item);
      }}
    >
      <View style={styles.exerciseCardInner}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.cardMuscleRow}>
            <Text style={styles.cardMuscleText} numberOfLines={1}>
              {primaryMuscle}
              {snippet ? <Text style={styles.cardSnippetInline}> · {snippet}</Text> : null}
            </Text>
          </View>
        </View>

        {/* Quick Add Button (Matching Screenshot 1's crisp white pill style) */}
        <TouchableOpacity
          style={styles.quickAddBtn}
          activeOpacity={0.75}
          onPress={() => {
            hapticSuccess();
            onQuickAdd(item);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={14} color={isDark ? '#000000' : '#FFFFFF'} />
          <Text style={styles.quickAddBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

export default ExerciseCardItem;
