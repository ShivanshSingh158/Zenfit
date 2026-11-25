import React, { memo, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  Activity,
  ArrowLeftRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Link2,
  Pencil,
  Trash2,
  Unlink,
} from 'lucide-react-native';
import BottomSheet from '../../ui/BottomSheet';
import { NumericText, TactileButton } from '../../ui';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONT_FAMILY, ICON, SPACE } from '../../../theme/tokens';
import { GymCardioLog, GymPlanDay } from '../../../types/gym.types';
import { useLatestNonNull } from '../../../hooks/useLatestNonNull';
import { afterSheetDismiss } from '../../../utils/sheetCoordinator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GymExerciseOptionsSheetProps {
  exerciseMenuFor: any | null;
  setExerciseMenuFor: (val: any | null) => void;
  supersetPickerFor: any | null;
  setSupersetPickerFor: (val: any | null) => void;
  cardioMenuFor: GymCardioLog | null;
  setCardioMenuFor: (val: GymCardioLog | null) => void;
  setLogCardioFor: (val: GymCardioLog | null) => void;
  deleteCardio: (id: string) => void;
  deleteExercise: (exerciseId: string) => void;
  reorderExercisesFull: (exercises: any[]) => void;
  log: any;
  selectedDate: string;
  userGymPlan: any;
  updateMasterPlan: (dayIndex: number, plan: GymPlanDay) => Promise<void>;
  navigation: any;
  colors: any;
  isDark: boolean;
  s: any;
  onOpenDeepDive?: (ex: any, initialTab?: 'guide' | 'analytics') => void;
  onOpenSwapModal?: (ex: any) => void;
  onOpenEditExercise?: (ex: any) => void;
}

export const GymExerciseOptionsSheet = memo(function GymExerciseOptionsSheet({
  exerciseMenuFor,
  setExerciseMenuFor,
  supersetPickerFor,
  setSupersetPickerFor,
  cardioMenuFor,
  setCardioMenuFor,
  setLogCardioFor,
  deleteCardio,
  deleteExercise,
  reorderExercisesFull,
  log,
  selectedDate,
  isDark,
  navigation,
  s,
  onOpenDeepDive,
  onOpenSwapModal,
  onOpenEditExercise,
}: GymExerciseOptionsSheetProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const activeExercise = useLatestNonNull(exerciseMenuFor);
  const activeSuperset = useLatestNonNull(supersetPickerFor);
  const activeCardio = useLatestNonNull(cardioMenuFor);

  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [supersetNotice, setSupersetNotice] = useState(false);

  useEffect(() => {
    if (exerciseMenuFor) {
      setConfirmRemoveOpen(false);
      setSupersetNotice(false);
    }
  }, [exerciseMenuFor]);

  const sheetBg = isDark ? '#0B0C10' : '#F8F8FA';
  const surfaceBg = isDark ? '#14161D' : '#FFFFFF';
  const hairlineColor = isDark ? 'rgba(255, 255, 255, 0.08)' : tokens.border.subtle;

  const availablePartners = (log?.exercises || []).filter(
    (e: any) => !e.skipped && e.exerciseId !== activeExercise?.exerciseId
  );

  return (
    <>
      <BottomSheet
        visible={!!exerciseMenuFor}
        onClose={() => setExerciseMenuFor(null)}
        avoidKeyboard={false}
        sheetBackgroundColor={sheetBg}
      >
        <View style={{ paddingBottom: Math.max(insets.bottom, SPACE.lg) }}>
          <Text style={{ fontSize: 18, fontFamily: FONT_FAMILY.bold, color: tokens.text.primary }}>
            {activeExercise?.name || 'Exercise Options'}
          </Text>
          <NumericText style={{ fontSize: 12.5, color: tokens.text.secondary, marginTop: 2, marginBottom: SPACE.md, fontFamily: FONT_FAMILY.medium }}>
            {activeExercise?.muscle ? `${activeExercise.muscle} · ` : ''}
            {activeExercise?.setsLog?.length || activeExercise?.targetSets || 3} sets × {activeExercise?.targetReps || '8–12'} reps
          </NumericText>

          {confirmRemoveOpen ? (
            <View
              style={[
                localStyles.groupedCard,
                { backgroundColor: surfaceBg, borderColor: hairlineColor, padding: 14, gap: 12 },
              ]}
            >
              <Text style={{ fontSize: 15, fontFamily: FONT_FAMILY.bold, color: tokens.text.primary }}>
                Remove from today's workout?
              </Text>
              <Text style={{ fontSize: 12.5, fontFamily: FONT_FAMILY.regular, color: tokens.text.secondary, lineHeight: 18 }}>
                Removes {activeExercise?.name} for today only. Your weekly plan stays unchanged.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TactileButton
                  variant="secondary"
                  size="md"
                  style={{ flex: 1 }}
                  onPress={() => setConfirmRemoveOpen(false)}
                >
                  <Text style={{ fontSize: 13.5, fontFamily: FONT_FAMILY.bold, color: tokens.text.primary }}>
                    Keep
                  </Text>
                </TactileButton>
                <TactileButton
                  variant="custom"
                  size="md"
                  haptic="medium"
                  style={{
                    flex: 1,
                    minHeight: 38,
                    borderRadius: 12,
                    backgroundColor: tokens.status.dangerDim,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => {
                    const ex = activeExercise;
                    setConfirmRemoveOpen(false);
                    setExerciseMenuFor(null);
                    if (ex) deleteExercise(ex.exerciseId);
                  }}
                >
                  <Text style={{ fontSize: 13.5, fontFamily: FONT_FAMILY.bold, color: tokens.status.danger }}>
                    Remove
                  </Text>
                </TactileButton>
              </View>
            </View>
          ) : (
            <>
              <View style={[localStyles.groupedCard, { backgroundColor: surfaceBg, borderColor: hairlineColor }]}>
                {Boolean(onOpenEditExercise) && (
                  <>
                    <TactileButton
                      variant="custom"
                      style={localStyles.groupedRow}
                      onPress={() => {
                        const ex = activeExercise;
                        setExerciseMenuFor(null);
                        if (!ex) return;
                        afterSheetDismiss(() => onOpenEditExercise?.(ex));
                      }}
                    >
                      <View style={[localStyles.rowIcon, { backgroundColor: tokens.accent.primaryDim }]}>
                        <Pencil size={16} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.menuActionTitle}>Edit Exercise</Text>
                        <Text style={s.menuActionSub}>Sets, reps, rest time & weekly plan</Text>
                      </View>
                      <ChevronRight size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.text.muted} />
                    </TactileButton>
                    <View style={[localStyles.divider, { backgroundColor: hairlineColor }]} />
                  </>
                )}

                <TactileButton
                  variant="custom"
                  style={localStyles.groupedRow}
                  onPress={() => {
                    const ex = activeExercise;
                    setExerciseMenuFor(null);
                    if (!ex) return;
                    afterSheetDismiss(() => {
                      if (onOpenDeepDive) {
                        onOpenDeepDive(ex, 'guide');
                      } else {
                        navigation.navigate('ExerciseDetail', { exerciseId: ex.exerciseId, date: log?.date ?? selectedDate });
                      }
                    });
                  }}
                >
                  <View style={[localStyles.rowIcon, { backgroundColor: tokens.accent.primaryDim }]}>
                    <BookOpen size={16} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.menuActionTitle}>Form & Guide</Text>
                    <Text style={s.menuActionSub}>Animation, cues & target breakdown</Text>
                  </View>
                  <ChevronRight size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.text.muted} />
                </TactileButton>

                <View style={[localStyles.divider, { backgroundColor: hairlineColor }]} />

                <TactileButton
                  variant="custom"
                  style={localStyles.groupedRow}
                  onPress={() => {
                    const ex = activeExercise;
                    setExerciseMenuFor(null);
                    if (!ex) return;
                    afterSheetDismiss(() => {
                      if (onOpenDeepDive) {
                        onOpenDeepDive(ex, 'analytics');
                      } else {
                        navigation.navigate('ExerciseDetail', { exerciseId: ex.exerciseId, date: log?.date ?? selectedDate });
                      }
                    });
                  }}
                >
                  <View style={[localStyles.rowIcon, { backgroundColor: tokens.status.successDim }]}>
                    <Activity size={16} strokeWidth={ICON.strokeWidth} color={tokens.status.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.menuActionTitle}>Analytics & PRs</Text>
                    <Text style={s.menuActionSub}>Records, 1RM trend & past sessions</Text>
                  </View>
                  <ChevronRight size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.text.muted} />
                </TactileButton>

                <View style={[localStyles.divider, { backgroundColor: hairlineColor }]} />

                <TactileButton
                  variant="custom"
                  style={localStyles.groupedRow}
                  onPress={() => {
                    const ex = activeExercise;
                    setExerciseMenuFor(null);
                    if (!ex) return;
                    afterSheetDismiss(() => {
                      if (onOpenSwapModal) {
                        onOpenSwapModal(ex);
                      } else {
                        navigation.navigate('ExerciseSwap', { originalExerciseId: ex.exerciseId, date: log?.date ?? selectedDate });
                      }
                    });
                  }}
                >
                  <View style={[localStyles.rowIcon, { backgroundColor: tokens.status.infoDim }]}>
                    <ArrowLeftRight size={16} strokeWidth={ICON.strokeWidth} color={tokens.status.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.menuActionTitle}>Swap Exercise</Text>
                    <Text style={s.menuActionSub}>Choose an alternative movement</Text>
                  </View>
                  <ChevronRight size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.text.muted} />
                </TactileButton>

                <View style={[localStyles.divider, { backgroundColor: hairlineColor }]} />

                {activeExercise?.supersetGroup ? (
                  <TactileButton
                    variant="custom"
                    style={localStyles.groupedRow}
                    onPress={() => {
                      const ex = activeExercise;
                      setExerciseMenuFor(null);
                      if (!ex) return;
                      const updated = (log?.exercises || []).map((e: any) =>
                        e.exerciseId === ex.exerciseId ? { ...e, supersetGroup: undefined } : e
                      );
                      reorderExercisesFull(updated);
                    }}
                  >
                    <View style={[localStyles.rowIcon, { backgroundColor: tokens.status.dangerDim }]}>
                      <Unlink size={16} strokeWidth={ICON.strokeWidth} color={tokens.status.danger} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.menuActionTitle, { color: tokens.status.danger }]}>
                        Unlink Superset ({activeExercise.supersetGroup})
                      </Text>
                      <Text style={s.menuActionSub}>Separate paired exercises</Text>
                    </View>
                  </TactileButton>
                ) : (
                  <TactileButton
                    variant="custom"
                    style={localStyles.groupedRow}
                    onPress={() => {
                      const ex = activeExercise;
                      if (!ex) return;
                      if (availablePartners.length === 0) {
                        setSupersetNotice(true);
                        return;
                      }
                      setExerciseMenuFor(null);
                      afterSheetDismiss(() => setSupersetPickerFor(ex));
                    }}
                  >
                    <View style={[localStyles.rowIcon, { backgroundColor: tokens.status.warningDim }]}>
                      <Link2 size={16} strokeWidth={ICON.strokeWidth} color={tokens.status.warning} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.menuActionTitle}>Link as Superset</Text>
                      <Text style={[s.menuActionSub, supersetNotice && { color: tokens.status.warning }]}>
                        {supersetNotice
                          ? 'Add at least 2 exercises to link a superset'
                          : 'Pair with another movement for back-to-back sets'}
                      </Text>
                    </View>
                    <ChevronRight size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.text.muted} />
                  </TactileButton>
                )}
              </View>

              <TactileButton
                variant="custom"
                haptic="medium"
                style={[localStyles.dangerCard, { backgroundColor: surfaceBg, borderColor: hairlineColor }]}
                onPress={() => setConfirmRemoveOpen(true)}
              >
                <View style={[localStyles.rowIcon, { backgroundColor: tokens.status.dangerDim }]}>
                  <Trash2 size={16} strokeWidth={ICON.strokeWidth} color={tokens.status.danger} />
                </View>
                <Text style={[s.menuActionTitle, { color: tokens.status.danger, flex: 1 }]}>
                  Remove from Today
                </Text>
              </TactileButton>
            </>
          )}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={!!supersetPickerFor}
        onClose={() => setSupersetPickerFor(null)}
        avoidKeyboard={false}
        sheetBackgroundColor={sheetBg}
      >
        <View style={{ gap: SPACE.sm, paddingBottom: Math.max(insets.bottom, SPACE.lg) }}>
          <Text style={{ fontSize: 18, fontFamily: FONT_FAMILY.bold, color: tokens.text.primary }}>
            Link Superset
          </Text>
          <Text style={{ fontSize: 12.5, color: tokens.text.secondary, marginBottom: SPACE.xs, fontFamily: FONT_FAMILY.medium }}>
            Pair "{activeSuperset?.name}" with:
          </Text>
          <ScrollView style={{ maxHeight: Math.min(320, Math.round(windowHeight * 0.42)) }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            <View style={[localStyles.groupedCard, { backgroundColor: surfaceBg, borderColor: hairlineColor }]}>
            {(log?.exercises || [])
              .filter((e: any) => !e.skipped && e.exerciseId !== activeSuperset?.exerciseId)
              .map((partner: any, pIdx: number) => (
                <React.Fragment key={partner.exerciseId || partner.name || pIdx}>
                  {pIdx > 0 && <View style={[localStyles.divider, { backgroundColor: hairlineColor }]} />}
                  <TactileButton
                    variant="custom"
                    style={localStyles.groupedRow}
                    onPress={() => {
                      const ex = activeSuperset;
                      setSupersetPickerFor(null);
                      if (!ex) return;
                      const usedGroups = new Set(
                        (log?.exercises || []).map((e: any) => e.supersetGroup).filter(Boolean)
                      );
                      let nextCharCode = 65;
                      while (usedGroups.has(String.fromCharCode(nextCharCode)) && nextCharCode < 90) {
                        nextCharCode++;
                      }
                      const groupLetter = partner.supersetGroup || String.fromCharCode(nextCharCode);
                      const updated = (log?.exercises || []).map((e: any) => {
                        if (e.exerciseId === ex.exerciseId || e.exerciseId === partner.exerciseId) {
                          return { ...e, supersetGroup: groupLetter };
                        }
                        return e;
                      });
                      reorderExercisesFull(updated);
                    }}
                  >
                    <View style={[localStyles.rowIcon, { backgroundColor: tokens.accent.primaryDim }]}>
                      <Dumbbell size={16} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.menuActionTitle}>{partner.name}</Text>
                      <Text style={s.menuActionSub}>{partner.muscle || 'Exercise'}</Text>
                    </View>
                    <CheckCircle2 size={ICON.md - 2} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
                  </TactileButton>
                </React.Fragment>
              ))}
            </View>
          </ScrollView>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={!!cardioMenuFor}
        onClose={() => setCardioMenuFor(null)}
        avoidKeyboard={false}
        sheetBackgroundColor={sheetBg}
      >
        <View style={{ gap: SPACE.sm, paddingBottom: Math.max(insets.bottom, SPACE.lg) }}>
          <Text style={{ fontSize: 18, fontFamily: FONT_FAMILY.bold, color: tokens.text.primary, marginBottom: 4 }}>
            {activeCardio?.type || 'Cardio Options'}
          </Text>
          <View style={[localStyles.groupedCard, { backgroundColor: surfaceBg, borderColor: hairlineColor }]}>
            <TactileButton
              variant="custom"
              style={localStyles.groupedRow}
              onPress={() => {
                const c = activeCardio;
                setCardioMenuFor(null);
                if (c) afterSheetDismiss(() => setLogCardioFor(c));
              }}
            >
              <View style={[localStyles.rowIcon, { backgroundColor: tokens.status.infoDim }]}>
                <Pencil size={16} strokeWidth={ICON.strokeWidth} color={tokens.status.info} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.menuActionTitle}>Log / Edit Cardio</Text>
                <Text style={s.menuActionSub}>Update duration, distance & speed</Text>
              </View>
              <ChevronRight size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.text.muted} />
            </TactileButton>

            <View style={[localStyles.divider, { backgroundColor: hairlineColor }]} />

            <TactileButton
              variant="custom"
              style={localStyles.groupedRow}
              onPress={() => {
                const c = activeCardio;
                setCardioMenuFor(null);
                if (c) deleteCardio(c.id);
              }}
            >
              <View style={[localStyles.rowIcon, { backgroundColor: tokens.status.dangerDim }]}>
                <Trash2 size={16} strokeWidth={ICON.strokeWidth} color={tokens.status.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.menuActionTitle, { color: tokens.status.danger }]}>Remove Cardio</Text>
                <Text style={s.menuActionSub}>Remove from today's workout</Text>
              </View>
            </TactileButton>
          </View>
        </View>
      </BottomSheet>
    </>
  );
});

const localStyles = StyleSheet.create({
  groupedCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 10,
  },
  groupedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    minHeight: 52,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
  },
  dangerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default GymExerciseOptionsSheet;
