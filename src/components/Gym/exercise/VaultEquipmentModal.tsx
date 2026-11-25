import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Activity,
  Cpu,
  Disc,
  Dumbbell,
  GitFork,
  MoreHorizontal,
  Repeat,
  User,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { EQUIPMENT_OPTIONS, EquipmentCategory } from '../../../utils/equipmentResolver';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';
import { NumericText, TactileButton } from '../../ui';
import BottomSheet from '../../ui/BottomSheet';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';

interface VaultEquipmentModalProps {
  visible: boolean;
  selectedEquipment: EquipmentCategory;
  resultCount: number;
  onSelect: (eq: EquipmentCategory) => void;
  onClear: () => void;
  onClose: () => void;
}

function getEquipmentIcon(id: EquipmentCategory): LucideIcon {
  switch (id) {
    case 'None':
      return User;
    case 'Barbell':
    case 'Dumbbell':
      return Dumbbell;
    case 'Cable':
      return GitFork;
    case 'Machine':
      return Cpu;
    case 'Kettlebell':
      return Activity;
    case 'Plate':
      return Disc;
    case 'Resistance Band':
      return Repeat;
    case 'Other':
    default:
      return MoreHorizontal;
  }
}

export const VaultEquipmentModal: React.FC<VaultEquipmentModalProps> = ({
  visible,
  selectedEquipment,
  resultCount,
  onSelect,
  onClear,
  onClose,
}) => {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(tokens, insets), [tokens, insets]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      noPadding={true}
      sheetBackgroundColor={tokens.bg.elevated}
    >
      <View style={styles.sheetContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Equipment</Text>
          <TactileButton
            variant="custom"
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel="Close equipment filter"
          >
            <X size={16} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
          </TactileButton>
        </View>

        <ScrollView
          style={{ flexShrink: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
          nestedScrollEnabled
        >
          <View style={styles.grid}>
            {EQUIPMENT_OPTIONS.map((item) => {
              const isSelected = selectedEquipment === item.id;
              const IconComp = getEquipmentIcon(item.id);
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
                      size={ICON.lg}
                      strokeWidth={ICON.strokeWidth}
                      color={isSelected ? tokens.accent.primary : tokens.text.primary}
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
  gridContent: {
    paddingHorizontal: SPACE.lg,
    paddingBottom: SPACE.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACE.sm + 2,
  },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACE.md + 2,
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
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACE.sm + 2,
  },
  cardText: {
    fontSize: tokens.fontSize.md,
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
    paddingBottom: Math.max(insets?.bottom || 0, SPACE.md + 2),
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
