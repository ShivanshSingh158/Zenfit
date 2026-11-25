import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, GitMerge, Unlink, X } from 'lucide-react-native';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH } from '../../../theme/tokens';
import BottomSheet from '../../ui/BottomSheet';
import { NumericText, TactileButton } from '../../ui';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLatestNonNull } from '../../../hooks/useLatestNonNull';

export interface SupersetPickerModalProps {
  visible: boolean;
  exercise: any;
  exercises: any[];
  colors?: any;
  styles?: any;
  onClose: () => void;
  onRemoveSuperset: () => void;
  onSelectPartner: (altEx: any) => void;
}

export const SupersetPickerModal: React.FC<SupersetPickerModalProps> = React.memo(({
  visible,
  exercise,
  exercises,
  onClose,
  onRemoveSuperset,
  onSelectPartner,
}) => {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const displayExercise = useLatestNonNull(exercise);

  if (!displayExercise) return null;

  const partners = exercises.filter(
    e =>
      !e.skipped &&
      ((e.exerciseId && displayExercise.exerciseId && e.exerciseId !== displayExercise.exerciseId) ||
        (!displayExercise.exerciseId && e.name !== displayExercise.name))
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      noPadding={true}
      sheetBackgroundColor={tokens.bg.elevated}
    >
      <View style={{ paddingHorizontal: SPACE.lg + 4, paddingBottom: Math.max(insets.bottom, SPACE.xl), maxHeight: '100%', flexShrink: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.xs + 2, flex: 1, minWidth: 0, paddingRight: SPACE.sm }}>
            <GitMerge size={ICON.md} strokeWidth={ICON.strokeWidth} color={tokens.status.warning} />
            <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: tokens.fontSize.lg, color: tokens.text.primary }} numberOfLines={1}>
              Superset Grouping
            </Text>
          </View>
          <TactileButton
            variant="custom"
            onPress={onClose}
            style={{ width: 32, height: 32, borderRadius: RADIUS.inner, backgroundColor: tokens.bg.surface, alignItems: 'center', justifyContent: 'center' }}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel="Close superset picker"
          >
            <X size={16} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
          </TactileButton>
        </View>

        <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: tokens.fontSize.sm, color: tokens.text.secondary, lineHeight: 18 }}>
          Pair this exercise with another to use a fast 30s active rest timer.
        </Text>

        <ScrollView style={{ marginTop: SPACE.lg, flexShrink: 1 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          {displayExercise.supersetGroup && (
            <TactileButton
              variant="custom"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: tokens.status.dangerDim,
                padding: SPACE.lg,
                borderRadius: RADIUS.card,
                borderWidth: tokens.border.hairlineWidth,
                borderColor: tokens.status.danger,
                marginBottom: SPACE.md,
              }}
              onPress={onRemoveSuperset}
            >
              <Unlink size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.status.danger} style={{ marginRight: SPACE.sm }} />
              <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: tokens.fontSize.md, color: tokens.status.danger }}>
                Remove from Superset
              </Text>
            </TactileButton>
          )}

          {partners.length === 0 ? (
            <View style={{ paddingVertical: SPACE.xl, alignItems: 'center' }}>
              <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: tokens.fontSize.sm, color: tokens.text.muted, textAlign: 'center' }}>
                Add another exercise to this workout to create a superset.
              </Text>
            </View>
          ) : (
            partners.map((altEx, idx) => {
              const isPartner = !!(altEx.supersetGroup && displayExercise.supersetGroup && altEx.supersetGroup === displayExercise.supersetGroup);
              return (
                <TactileButton
                  key={altEx.exerciseId || altEx.name || idx}
                  variant="custom"
                  haptic="success"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isPartner ? tokens.status.warningDim : tokens.bg.surface,
                    borderRadius: RADIUS.card,
                    padding: SPACE.md,
                    marginBottom: SPACE.sm,
                    borderWidth: tokens.border.hairlineWidth,
                    borderColor: isPartner ? tokens.status.warning : tokens.border.subtle,
                  }}
                  onPress={() => onSelectPartner(altEx)}
                >
                  <View style={{ flex: 1, minWidth: 0, paddingRight: SPACE.sm }}>
                    <Text
                      numberOfLines={2}
                      style={{
                        fontFamily: FONT_FAMILY.bold,
                        fontSize: tokens.fontSize.base,
                        color: isPartner ? tokens.status.warning : tokens.text.primary,
                        marginBottom: SPACE.xs,
                      }}
                    >
                      {altEx.name}
                    </Text>
                    <NumericText
                      style={{
                        fontFamily: FONT_FAMILY.regular,
                        fontSize: tokens.fontSize.xs,
                        color: tokens.text.muted,
                      }}
                    >
                      {altEx.muscle}  •  {altEx.targetSets} Sets
                    </NumericText>
                  </View>
                  {isPartner && <CheckCircle2 size={ICON.lg} strokeWidth={ICON.strokeWidth} color={tokens.status.warning} />}
                </TactileButton>
              );
            })
          )}
        </ScrollView>
      </View>
    </BottomSheet>
  );
});

export default SupersetPickerModal;
