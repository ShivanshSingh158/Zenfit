import React from 'react';
import {
  View,
  Text,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, CheckCircle2, Play } from 'lucide-react-native';
import BottomSheet from '../../../../components/ui/BottomSheet';
import { TactileButton, NumericText } from '../../../../components/ui';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ICON, SPACE, TOUCH } from '../../../../theme/tokens';
import { UserGymProgramme } from '../../../../types/gym.types';
import { useLatestNonNull } from '../../../../hooks/useLatestNonNull';
import { getSplitsPalette, useSplitsStyles } from '../styles/gymSplitsStyles';
import {
  formatPlainEffortLabel,
  formatPlainPhaseWord,
  formatPlainVolumeLabel,
} from '../tabs/ProgrammesTab';

export interface MesocycleModalProps {
  programme: UserGymProgramme | null;
  onClose: () => void;
  activeProgrammeId?: string;
  activeCurrentWeek?: number;
  onEnroll: (programme: UserGymProgramme) => void;
  getPhaseColor: (phaseType?: string) => { bg: string; text: string; dot: string };
}

export const MesocycleModal: React.FC<MesocycleModalProps> = React.memo(({
  programme,
  onClose,
  activeProgrammeId,
  activeCurrentWeek,
  onEnroll,
  getPhaseColor,
}) => {
  const { tokens, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useSplitsStyles();
  const palette = getSplitsPalette(tokens, isDark);
  const activeProgramme = useLatestNonNull(programme);
  if (!activeProgramme) return null;

  return (
    <BottomSheet
      visible={programme !== null}
      onClose={onClose}
      fullHeight={true}
      noPadding={true}
      avoidKeyboard={false}
      sheetBackgroundColor={palette.sheetCanvas}
    >
      <View style={[styles.modalSheetSafeArea, { flex: 1, backgroundColor: 'transparent' }]}>
        {/* Header */}
        <View style={styles.inspectorHeader}>
          <TactileButton
            variant="custom"
            onPress={onClose}
            style={styles.inspectorCloseBtn}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel="Close"
          >
            <X size={16} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
          </TactileButton>

          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: SPACE[8] }}>
            <Text
              style={styles.inspectorHeaderTitle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              {activeProgramme.name}
            </Text>
            <NumericText style={styles.inspectorHeaderSubtitle}>
              {activeProgramme.totalWeeks}-Week Guided Plan
            </NumericText>
          </View>

          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.inspectorScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Plain-English Program Overview */}
          <View style={styles.inspectorDescBox}>
            <Text style={styles.curriculumScienceTitle}>
              {activeProgramme.subtitle || 'Weekly Progression Overview'}
            </Text>
            <Text style={[styles.inspectorDescText, { marginTop: 4 }]}>
              {activeProgramme.description}
            </Text>
          </View>

          {/* Week-by-Week Breakdown */}
          <View>
            <Text style={styles.inspectorSectionLabel}>WEEK-BY-WEEK PLAN</Text>
            <View style={{ gap: SPACE[12], marginTop: SPACE[4] }}>
              {Object.values(activeProgramme.weeks).map(w => {
                const col = getPhaseColor(w.phaseType);
                const phaseWord = formatPlainPhaseWord(w.phaseType, w.weekNumber);
                const isEnrolledCurrent =
                  activeProgrammeId === activeProgramme.id &&
                  activeCurrentWeek === w.weekNumber;

                return (
                  <View
                    key={`curric-w-${w.weekNumber}`}
                    style={[
                      styles.curriculumWeekCard,
                      isEnrolledCurrent && styles.curriculumWeekCardCurrent,
                    ]}
                  >
                    <View style={styles.curriculumWeekHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE[8] }}>
                        <NumericText style={styles.curriculumWeekNum}>WEEK {w.weekNumber}</NumericText>
                        <View style={[styles.curriculumPhaseTag, { backgroundColor: col.bg }]}>
                          <Text style={[styles.curriculumPhaseTagText, { color: col.text }]}>
                            {phaseWord.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      {isEnrolledCurrent && (
                        <View style={styles.curriculumCurrentBadge}>
                          <Text style={styles.curriculumCurrentBadgeText}>CURRENT</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.curriculumPhaseName}>{w.phaseName}</Text>

                    {/* Open Hairline-Divided 3-Metric Row (Zero Inner Boxes) */}
                    <View style={styles.curriculumStatsStrip}>
                      <View style={styles.curriculumStatItem}>
                        <Text style={styles.curriculumStatLabel}>EFFORT</Text>
                        <NumericText style={[styles.curriculumStatVal, { color: col.text }]}>
                          {formatPlainEffortLabel(w.targetRir)}
                        </NumericText>
                      </View>

                      <View style={styles.curriculumStatDivider} />

                      <View style={styles.curriculumStatItem}>
                        <Text style={styles.curriculumStatLabel}>LOAD</Text>
                        <NumericText style={styles.curriculumStatVal}>
                          ~{w.intensityPercentage1RM || 70}% Max
                        </NumericText>
                      </View>

                      <View style={styles.curriculumStatDivider} />

                      <View style={styles.curriculumStatItem}>
                        <Text style={styles.curriculumStatLabel}>VOLUME</Text>
                        <NumericText style={styles.curriculumStatVal}>
                          {formatPlainVolumeLabel(w.volumeModifierSets)}
                        </NumericText>
                      </View>
                    </View>

                    {Boolean(w.notes) && (
                      <Text style={styles.curriculumNotesText}>{w.notes}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Bottom Enroll Action */}
        <View style={[styles.inspectorBottomBar, { paddingBottom: Math.max(insets.bottom, SPACE[16]) }]}>
          {activeProgrammeId === activeProgramme.id ? (
            <View style={styles.curriculumAlreadyActiveRow}>
              <CheckCircle2 size={18} color={tokens.status.success} strokeWidth={ICON.strokeWidth} />
              <NumericText style={styles.curriculumAlreadyActiveText}>
                Active · Week {activeCurrentWeek || 1} of {activeProgramme.totalWeeks}
              </NumericText>
            </View>
          ) : (
            <TactileButton
              variant="primary"
              size="lg"
              onPress={() => {
                onEnroll(activeProgramme);
                onClose();
              }}
              style={styles.inspectorApplyCtaBtn}
            >
              <Play size={16} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} />
              <Text style={styles.inspectorApplyCtaBtnText} numberOfLines={1}>
                Start {activeProgramme.totalWeeks}-Week Plan
              </Text>
            </TactileButton>
          )}
        </View>
      </View>
    </BottomSheet>
  );
});

export default MesocycleModal;
