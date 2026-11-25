import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Settings,
  ChevronRight,
  PlusCircle,
  FileText,
  Trash2,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { hapticSelection, hapticLight, hapticError } from '../../utils/haptics';
import { AppBottomSheet } from '../ui/AppBottomSheet';
import { TactileButton } from '../ui/TactileButton';
import { AppIcon } from '../ui/AppIcon';

export interface WorkoutMenuSheetProps {
  visible: boolean;
  restDurationText?: string;
  sessionNote?: string;
  onOpenWorkoutSettings: () => void;
  onAddExercise: () => void;
  onAddSessionNote?: () => void;
  onDiscardWorkout: () => void;
  onClose: () => void;
}

export const WorkoutMenuSheet: React.FC<WorkoutMenuSheetProps> = ({
  visible,
  restDurationText = '1:30 rest · Sound',
  sessionNote = '',
  onOpenWorkoutSettings,
  onAddExercise,
  onAddSessionNote,
  onDiscardWorkout,
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
        {/* Option 1: Workout Settings */}
        <TactileButton
          variant="custom"
          haptic="selection"
          onPress={() => {
            onOpenWorkoutSettings();
          }}
          style={[
            styles.settingsCard,
            {
              backgroundColor: cardBg,
              borderRadius: tokens.radius.card,
              padding: tokens.space.md,
              borderColor: tokens.border.subtle,
            },
          ]}
        >
          <View
            style={[
              styles.settingsIconBox,
              {
                backgroundColor: tokens.accent.primary,
                borderRadius: tokens.radius.inner,
              },
            ]}
          >
            <AppIcon icon={Settings} size={18} color={tokens.accent.onPrimary} />
          </View>
          <View style={[styles.flexOne, { minWidth: 0 }]}>
            <Text style={[tokens.typography.title, { color: tokens.accent.primary }]}>
              Workout settings
            </Text>
            <Text
              style={[
                tokens.typography.caption,
                { color: tokens.text.secondary, marginTop: 2 },
              ]}
            >
              {restDurationText}
            </Text>
          </View>
          <AppIcon icon={ChevronRight} size={18} color={tokens.text.secondary} />
        </TactileButton>

        {/* Option 2: Grouped Primary Actions */}
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
          <TactileButton
            variant="custom"
            onPress={() => {
              onAddExercise();
            }}
            style={[styles.menuRow, { paddingHorizontal: tokens.space.md }]}
          >
            <View style={styles.rowIcon}>
              <AppIcon icon={PlusCircle} size={20} color={tokens.text.primary} />
            </View>
            <Text style={[tokens.typography.body, { fontFamily: tokens.font.medium, color: tokens.text.primary }]}>
              Add exercise
            </Text>
          </TactileButton>

          <View style={[styles.divider, { backgroundColor: tokens.border.subtle }]} />

          <TactileButton
            variant="custom"
            onPress={() => {
              onAddSessionNote?.();
            }}
            style={[styles.menuRow, { paddingHorizontal: tokens.space.md }]}
          >
            <View style={styles.rowIcon}>
              <AppIcon icon={FileText} size={20} color={tokens.text.primary} />
            </View>
            <View style={[styles.flexOne, { minWidth: 0 }]}>
              <Text style={[tokens.typography.body, { fontFamily: tokens.font.medium, color: tokens.text.primary }]}>
                {sessionNote ? 'Edit session note' : 'Add session note'}
              </Text>
              {sessionNote ? (
                <Text
                  style={[
                    tokens.typography.caption,
                    { color: tokens.text.secondary, marginTop: 2 },
                  ]}
                  numberOfLines={1}
                >
                  {sessionNote}
                </Text>
              ) : null}
            </View>
          </TactileButton>
        </View>

        {/* Option 3: Discard workout (directly visible, zero folded accordion) */}
        <TactileButton
          variant="custom"
          onPress={() => {
            onDiscardWorkout();
          }}
          style={[
            styles.groupedCard,
            styles.menuRow,
            {
              backgroundColor: cardBg,
              borderRadius: tokens.radius.card,
              paddingHorizontal: tokens.space.md,
              borderColor: tokens.accent.crimsonDim,
              marginBottom: 0,
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
            Discard workout
          </Text>
        </TactileButton>
      </View>
    </AppBottomSheet>
  );
};

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth,
  },
  settingsIconBox: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
});

export default WorkoutMenuSheet;
