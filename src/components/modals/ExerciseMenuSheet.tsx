import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FileText,
  ArrowLeftRight,
  Flame,
  Timer,
  TrendingUp,
  Link2,
  PlayCircle,
  Trash2,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { hapticLight, hapticError, hapticSelection } from '../../utils/haptics';
import { AppBottomSheet } from '../ui/AppBottomSheet';
import { TactileButton } from '../ui/TactileButton';
import { AppIcon } from '../ui/AppIcon';

export interface ExerciseMenuSheetProps {
  visible: boolean;
  exerciseName: string;
  currentRestText?: string;
  exerciseNote?: string;
  hasWarmups?: boolean;
  isSupersetLinked?: boolean;
  onAddNote: () => void;
  onSwapExercise: () => void;
  onAddWarmupSet: () => void;
  onConfigureRestTimer: () => void;
  onSupersetPress?: () => void;
  onViewHistory: () => void;
  onHowToDoIt?: () => void;
  onRemoveExercise: () => void;
  onClose: () => void;
}

export const ExerciseMenuSheet: React.FC<ExerciseMenuSheetProps> = ({
  visible,
  exerciseName,
  currentRestText = '1:30',
  exerciseNote = '',
  hasWarmups = false,
  isSupersetLinked = false,
  onAddNote,
  onSwapExercise,
  onAddWarmupSet,
  onConfigureRestTimer,
  onSupersetPress,
  onViewHistory,
  onHowToDoIt,
  onRemoveExercise,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const cardBg = isDark ? '#14161D' : '#FFFFFF';

  return (
    <AppBottomSheet visible={visible} onClose={onClose} noPadding>
      <View
        style={{
          paddingHorizontal: tokens.space.lg,
          paddingBottom: Math.max(insets.bottom, tokens.space.xl),
          paddingTop: tokens.space.sm,
        }}
      >
        <Text
          style={[
            tokens.typography.h2,
            {
              color: tokens.text.primary,
              marginBottom: tokens.space.md,
              paddingHorizontal: 4,
            },
          ]}
          numberOfLines={1}
        >
          {exerciseName}
        </Text>

        <View
          style={[
            styles.groupedCard,
            {
              backgroundColor: cardBg,
              borderRadius: tokens.radius.card,
              borderColor: tokens.border.subtle,
            },
          ]}
        >
          {/* 1. Analytics & PRs */}
          <TactileButton
            variant="custom"
            onPress={() => {
              onViewHistory();
            }}
            style={[styles.menuRow, { paddingHorizontal: tokens.space.md }]}
          >
            <View style={styles.rowIcon}>
              <AppIcon icon={TrendingUp} size={20} color={tokens.accent.primary} />
            </View>
            <Text style={[tokens.typography.body, { fontFamily: tokens.font.medium, color: tokens.text.primary }]}>
              Analytics & PRs
            </Text>
          </TactileButton>

          {/* 2. Form & Guide */}
          {Boolean(onHowToDoIt) && (
            <>
              <View style={[styles.divider, { backgroundColor: tokens.border.subtle }]} />
              <TactileButton
                variant="custom"
                onPress={() => {
                  onHowToDoIt?.();
                }}
                style={[styles.menuRow, { paddingHorizontal: tokens.space.md }]}
              >
                <View style={styles.rowIcon}>
                  <AppIcon icon={PlayCircle} size={20} color={tokens.text.primary} />
                </View>
                <Text style={[tokens.typography.body, { fontFamily: tokens.font.medium, color: tokens.text.primary }]}>
                  Form & Guide
                </Text>
              </TactileButton>
            </>
          )}

          <View style={[styles.divider, { backgroundColor: tokens.border.subtle }]} />

          {/* 3. Warm-up sets */}
          <TactileButton
            variant="custom"
            onPress={() => {
              onAddWarmupSet();
            }}
            style={[styles.menuRow, { paddingHorizontal: tokens.space.md }]}
          >
            <View style={styles.rowIcon}>
              <AppIcon icon={Flame} size={20} color={tokens.status.warning} />
            </View>
            <Text style={[tokens.typography.body, { fontFamily: tokens.font.medium, color: tokens.text.primary }]}>
              {hasWarmups ? 'Remove warm-up sets' : 'Add warm-up sets'}
            </Text>
          </TactileButton>

          <View style={[styles.divider, { backgroundColor: tokens.border.subtle }]} />

          {/* 4. Default rest timer */}
          <TactileButton
            variant="custom"
            haptic="selection"
            onPress={() => {
              onConfigureRestTimer();
            }}
            style={[styles.menuRow, { paddingHorizontal: tokens.space.md }]}
          >
            <View style={styles.rowIcon}>
              <AppIcon icon={Timer} size={20} color={tokens.text.primary} />
            </View>
            <View style={[styles.flexOne, { minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <Text style={[tokens.typography.body, { fontFamily: tokens.font.medium, color: tokens.text.primary }]}>
                Default rest timer
              </Text>
              <Text style={[tokens.typography.caption, { color: tokens.text.secondary, flexShrink: 0 }]}>
                {currentRestText}
              </Text>
            </View>
          </TactileButton>

          <View style={[styles.divider, { backgroundColor: tokens.border.subtle }]} />

          {/* 5. Swap exercise */}
          <TactileButton
            variant="custom"
            haptic="selection"
            onPress={() => {
              onSwapExercise();
            }}
            style={[styles.menuRow, { paddingHorizontal: tokens.space.md }]}
          >
            <View style={styles.rowIcon}>
              <AppIcon icon={ArrowLeftRight} size={20} color={tokens.text.primary} />
            </View>
            <Text style={[tokens.typography.body, { fontFamily: tokens.font.medium, color: tokens.text.primary }]}>
              Swap exercise
            </Text>
          </TactileButton>

          {/* 6. Link / Unlink Superset (Kept intact per design contract) */}
          {Boolean(onSupersetPress) && (
            <>
              <View style={[styles.divider, { backgroundColor: tokens.border.subtle }]} />
              <TactileButton
                variant="custom"
                haptic="selection"
                onPress={() => {
                  onSupersetPress?.();
                }}
                style={[styles.menuRow, { paddingHorizontal: tokens.space.md }]}
              >
                <View style={styles.rowIcon}>
                  <AppIcon icon={Link2} size={20} color={tokens.text.primary} />
                </View>
                <Text style={[tokens.typography.body, { fontFamily: tokens.font.medium, color: tokens.text.primary }]}>
                  {isSupersetLinked ? 'Unlink Superset' : 'Link as Superset'}
                </Text>
              </TactileButton>
            </>
          )}

          <View style={[styles.divider, { backgroundColor: tokens.border.subtle }]} />

          {/* 7. Add / Edit Note */}
          <TactileButton
            variant="custom"
            onPress={() => {
              onAddNote();
            }}
            style={[styles.menuRow, { paddingHorizontal: tokens.space.md }]}
          >
            <View style={styles.rowIcon}>
              <AppIcon icon={FileText} size={20} color={tokens.text.primary} />
            </View>
            <View style={[styles.flexOne, { minWidth: 0 }]}>
              <Text style={[tokens.typography.body, { fontFamily: tokens.font.medium, color: tokens.text.primary }]}>
                {exerciseNote ? 'Edit exercise note' : 'Add exercise note'}
              </Text>
              {exerciseNote ? (
                <Text
                  style={[
                    tokens.typography.caption,
                    { color: tokens.text.secondary, marginTop: 2 },
                  ]}
                  numberOfLines={1}
                >
                  {exerciseNote}
                </Text>
              ) : null}
            </View>
          </TactileButton>
        </View>

        <TactileButton
          variant="custom"
          onPress={() => {
            onRemoveExercise();
          }}
          style={[
            styles.removeCard,
            {
              backgroundColor: cardBg,
              borderRadius: tokens.radius.card,
              paddingHorizontal: tokens.space.md,
              borderColor: tokens.accent.crimsonDim,
            },
          ]}
        >
          <View style={styles.rowIcon}>
            <AppIcon icon={Trash2} size={20} color={tokens.accent.crimson} />
          </View>
          <Text
            style={[
              tokens.typography.body,
              { fontFamily: tokens.font.medium, color: tokens.accent.crimson },
            ]}
          >
            Remove exercise
          </Text>
        </TactileButton>
      </View>
    </AppBottomSheet>
  );
};

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  groupedCard: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 10,
    gap: 12,
  },
  rowIcon: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
  removeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 10,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default ExerciseMenuSheet;
