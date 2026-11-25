import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import { AppBottomSheet } from '../../../components/ui/AppBottomSheet';
import { TactileButton } from '../../../components/ui/TactileButton';
import { useLazySheetMount } from '../../../hooks/useLazySheetMount';
import { useLatestNonNull } from '../../../hooks/useLatestNonNull';

export interface PendingSwapPermanent {
  oldName: string;
  newName: string;
  videoId?: string;
  muscle: string;
  targetSets?: number;
  targetReps?: string;
  restTimeSecs?: number;
}

export interface ActiveConfirmSheetsProps {
  showDiscardConfirmSheet: boolean;
  onCloseDiscard: () => void;
  onConfirmDiscard: () => void;
  deleteSetConfirmIdx: number | null;
  exerciseName?: string;
  deleteSetNumber?: number | string;
  onCloseDeleteSet: () => void;
  onConfirmDeleteSet: (idx: number) => void;
  pendingSwapPermanent: PendingSwapPermanent | null;
  onCloseSwapPermanent: () => void;
  onConfirmSwapPermanent: (p: PendingSwapPermanent) => void;
}

export const ActiveConfirmSheets: React.FC<ActiveConfirmSheetsProps> = React.memo(
  function ActiveConfirmSheets({
    showDiscardConfirmSheet,
    onCloseDiscard,
    onConfirmDiscard,
    deleteSetConfirmIdx,
    exerciseName,
    deleteSetNumber,
    onCloseDeleteSet,
    onConfirmDeleteSet,
    pendingSwapPermanent,
    onCloseSwapPermanent,
    onConfirmSwapPermanent,
  }) {
    const { tokens, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const secondaryCardBg = isDark ? '#14161D' : '#FFFFFF';

    const isDeleteSetVisible = deleteSetConfirmIdx !== null;
    const isSwapPermanentVisible = !!pendingSwapPermanent;

    const shouldMountDiscard = useLazySheetMount(showDiscardConfirmSheet, 380);
    const shouldMountDeleteSet = useLazySheetMount(isDeleteSetVisible, 380);
    const shouldMountSwapPermanent = useLazySheetMount(isSwapPermanentVisible, 380);

    const latestDeleteSetIdx = useLatestNonNull(deleteSetConfirmIdx);
    const latestDeleteSetNumber = useLatestNonNull(deleteSetNumber);
    const latestPendingSwap = useLatestNonNull(pendingSwapPermanent);

    return (
      <>
        {shouldMountDiscard && (
          <AppBottomSheet
            visible={showDiscardConfirmSheet}
            onClose={onCloseDiscard}
            noPadding
          >
            <View
              style={{
                paddingHorizontal: tokens.space.lg,
                paddingBottom: Math.max(insets.bottom, tokens.space.xl),
                paddingTop: tokens.space.sm,
                gap: 12,
              }}
            >
              <Text style={[tokens.typography.h2, { color: tokens.text.primary }]}>
                Discard workout?
              </Text>
              <Text style={[tokens.typography.body, { color: tokens.text.secondary, lineHeight: 20 }]}>
                Are you sure you want to discard this workout? No sets will be saved.
              </Text>
              <View style={{ gap: 10, marginTop: 4 }}>
                <TactileButton
                  variant="custom"
                  haptic="medium"
                  style={{
                    minHeight: 48,
                    borderRadius: tokens.radius.card,
                    backgroundColor: tokens.accent.crimson,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={onConfirmDiscard}
                >
                  <Text style={[tokens.typography.label, { fontFamily: tokens.font.bold, color: '#FFFFFF' }]}>
                    Discard workout
                  </Text>
                </TactileButton>
                <TactileButton
                  variant="secondary"
                  size="lg"
                  style={{
                    backgroundColor: secondaryCardBg,
                    borderColor: tokens.border.subtle,
                    borderRadius: tokens.radius.card,
                  }}
                  onPress={onCloseDiscard}
                >
                  <Text style={[tokens.typography.label, { color: tokens.text.primary }]}>
                    Keep training
                  </Text>
                </TactileButton>
              </View>
            </View>
          </AppBottomSheet>
        )}

        {shouldMountDeleteSet && (
          <AppBottomSheet
            visible={isDeleteSetVisible}
            onClose={onCloseDeleteSet}
            noPadding
          >
            <View
              style={{
                paddingHorizontal: tokens.space.lg,
                paddingBottom: Math.max(insets.bottom, tokens.space.xl),
                paddingTop: tokens.space.sm,
                gap: 12,
              }}
            >
              <Text style={[tokens.typography.h2, { color: tokens.text.primary }]}>
                Delete set?
              </Text>
              <Text style={[tokens.typography.body, { color: tokens.text.secondary, lineHeight: 20 }]}>
                Remove Set {latestDeleteSetNumber ?? ''} from {exerciseName}?
              </Text>
              <View style={{ gap: 10, marginTop: 4 }}>
                <TactileButton
                  variant="custom"
                  haptic="medium"
                  style={{
                    minHeight: 48,
                    borderRadius: tokens.radius.card,
                    backgroundColor: tokens.accent.crimson,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => {
                    const idxToRemove = latestDeleteSetIdx;
                    onCloseDeleteSet();
                    if (idxToRemove !== null) onConfirmDeleteSet(idxToRemove);
                  }}
                >
                  <Text style={[tokens.typography.label, { fontFamily: tokens.font.bold, color: '#FFFFFF' }]}>
                    Delete set
                  </Text>
                </TactileButton>
                <TactileButton
                  variant="secondary"
                  size="lg"
                  style={{
                    backgroundColor: secondaryCardBg,
                    borderColor: tokens.border.subtle,
                    borderRadius: tokens.radius.card,
                  }}
                  onPress={onCloseDeleteSet}
                >
                  <Text style={[tokens.typography.label, { color: tokens.text.primary }]}>
                    Cancel
                  </Text>
                </TactileButton>
              </View>
            </View>
          </AppBottomSheet>
        )}

        {shouldMountSwapPermanent && (
          <AppBottomSheet
            visible={isSwapPermanentVisible}
            onClose={onCloseSwapPermanent}
            noPadding
          >
            <View
              style={{
                paddingHorizontal: tokens.space.lg,
                paddingBottom: Math.max(insets.bottom, tokens.space.xl),
                paddingTop: tokens.space.sm,
                gap: 12,
              }}
            >
              <Text style={[tokens.typography.h2, { color: tokens.text.primary }]}>
                Update weekly plan?
              </Text>
              <Text style={[tokens.typography.body, { color: tokens.text.secondary, lineHeight: 20 }]}>
                Use {latestPendingSwap?.newName} for future workouts on this day too, or just for today?
              </Text>
              <View style={{ gap: 10, marginTop: 4 }}>
                <TactileButton
                  variant="primary"
                  size="lg"
                  haptic="medium"
                  onPress={() => {
                    const p = latestPendingSwap;
                    onCloseSwapPermanent();
                    if (p) onConfirmSwapPermanent(p);
                  }}
                >
                  <Text style={[tokens.typography.label, { fontFamily: tokens.font.bold, color: tokens.accent.onPrimary }]}>
                    Save for Future Days
                  </Text>
                </TactileButton>
                <TactileButton
                  variant="secondary"
                  size="lg"
                  style={{
                    backgroundColor: secondaryCardBg,
                    borderColor: tokens.border.subtle,
                    borderRadius: tokens.radius.card,
                  }}
                  onPress={onCloseSwapPermanent}
                >
                  <Text style={[tokens.typography.label, { color: tokens.text.primary }]}>
                    Today Only
                  </Text>
                </TactileButton>
              </View>
            </View>
          </AppBottomSheet>
        )}
      </>
    );
  }
);

export default ActiveConfirmSheets;
