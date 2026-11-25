import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Activity,
  Dumbbell,
  Flame,
  Footprints,
  GitFork,
  Grid,
  Heart,
  Layers,
  Repeat,
  Shield,
  Target,
  User,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { MUSCLE_GROUP_OPTIONS, MuscleGroupOption } from '../../../utils/equipmentResolver';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';
import { NumericText, TactileButton } from '../../ui';
import BottomSheet from '../../ui/BottomSheet';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';

interface VaultMuscleModalProps {
  visible: boolean;
  selectedMuscle: string;
  resultCount: number;
  onSelect: (muscle: string) => void;
  onClear: () => void;
  onClose: () => void;
}

function getMuscleIcon(id: string): LucideIcon {
  switch (id) {
    case 'Chest':
      return Shield;
    case 'Upper Back':
    case 'Lats':
      return Layers;
    case 'Shoulders':
      return Target;
    case 'Biceps':
      return Zap;
    case 'Triceps':
      return GitFork;
    case 'Forearms':
    case 'Olympic / Full Body':
      return Flame;
    case 'Quads':
    case 'Calves':
      return Footprints;
    case 'Hamstrings':
      return Repeat;
    case 'Glutes':
      return Activity;
    case 'Abdominals':
      return Grid;
    case 'Lower Back':
      return User;
    case 'Cardio':
      return Heart;
    default:
      return Dumbbell;
  }
}

export const VaultMuscleModal: React.FC<VaultMuscleModalProps> = ({
  visible,
  selectedMuscle,
  resultCount,
  onSelect,
  onClear,
  onClose,
}) => {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(tokens, insets), [tokens, insets]);

  const upperBody = MUSCLE_GROUP_OPTIONS.filter((m) => m.region === 'Upper Body');
  const lowerBody = MUSCLE_GROUP_OPTIONS.filter((m) => m.region === 'Lower Body');
  const core = MUSCLE_GROUP_OPTIONS.filter((m) => m.region === 'Core');
  const cardioFullBody = MUSCLE_GROUP_OPTIONS.filter((m) => m.region === 'Cardio & Full Body');

  const renderSection = (title: string, options: MuscleGroupOption[]) => (
    <View style={styles.section} key={title}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.grid}>
        {options.map((item) => {
          const isSelected = selectedMuscle === item.id;
          const IconComp = getMuscleIcon(item.id);
          return (
            <TactileButton
              key={item.id}
              variant="custom"
              haptic="selection"
              onPress={() => onSelect(item.id)}
              style={[styles.card, isSelected && styles.cardSelected]}
            >
              <View style={styles.iconCircle}>
                <IconComp
                  size={ICON.md}
                  strokeWidth={ICON.strokeWidth}
                  color={isSelected ? tokens.accent.primary : tokens.accent.secondary}
                />
              </View>
              <Text
                style={[styles.cardText, isSelected && styles.cardTextSelected]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TactileButton>
          );
        })}
      </View>
    </View>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      noPadding={true}
      sheetBackgroundColor={tokens.bg.elevated}
    >
      <View style={styles.sheetContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Muscle Group</Text>
          <TactileButton
            variant="custom"
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel="Close muscle filter"
          >
            <X size={16} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
          </TactileButton>
        </View>

        <ScrollView
          style={{ flexShrink: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          nestedScrollEnabled
        >
          {renderSection('Upper Body', upperBody)}
          {renderSection('Lower Body', lowerBody)}
          {renderSection('Core', core)}
          {renderSection('Cardio & Full Body', cardioFullBody)}
        </ScrollView>

        <View style={styles.footer}>
          <TactileButton
            variant="custom"
            onPress={onClear}
            style={styles.clearBtn}
          >
            <Text style={styles.clearBtnText}>Clear Filters</Text>
          </TactileButton>

          <TactileButton
            variant="custom"
            onPress={onClose}
            style={styles.applyBtn}
          >
            <NumericText style={styles.applyBtnText}>
              Show {resultCount} results
            </NumericText>
          </TactileButton>
        </View>
      </View>
    </BottomSheet>
  );
};

const makeStyles = (tokens: ThemeTokens, insets?: EdgeInsets) => StyleSheet.create({
  sheetContainer: {
    maxHeight: '100%',
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.lg + 4,
    paddingVertical: SPACE.md,
  },
  headerTitle: {
    fontSize: tokens.fontSize.lg,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.inner,
    backgroundColor: tokens.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: SPACE.lg,
    paddingBottom: SPACE.lg + 4,
  },
  section: {
    marginBottom: SPACE.lg,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.xs,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACE.sm + 2,
    marginLeft: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACE.sm + 2,
  },
  card: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.inner,
    borderWidth: 1.5,
    backgroundColor: tokens.bg.surface,
    borderColor: tokens.border.subtle,
    minHeight: TOUCH.minTarget,
  },
  cardSelected: {
    backgroundColor: tokens.accent.primaryDim,
    borderColor: tokens.accent.primary,
  },
  iconCircle: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACE.sm,
  },
  cardText: {
    fontSize: tokens.fontSize.sm,
    fontFamily: FONT_FAMILY.semibold,
    color: tokens.text.primary,
    flex: 1,
  },
  cardTextSelected: {
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.md + 2,
    backgroundColor: tokens.bg.surface,
    borderTopWidth: tokens.border.hairlineWidth,
    borderTopColor: tokens.border.subtle,
    gap: SPACE.md,
  },
  clearBtn: {
    flex: 1,
    minHeight: TOUCH.minTarget + 2,
    borderRadius: RADIUS.inner,
    backgroundColor: tokens.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: tokens.fontSize.md,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  applyBtn: {
    flex: 1.6,
    minHeight: TOUCH.minTarget + 2,
    borderRadius: RADIUS.inner,
    backgroundColor: tokens.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: tokens.accent.onPrimary,
    fontSize: tokens.fontSize.md,
    fontFamily: FONT_FAMILY.bold,
  },
});
