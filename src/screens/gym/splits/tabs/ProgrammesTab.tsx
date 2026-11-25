import React from 'react';
import {
  Pressable,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { Map, Square, List, Play } from 'lucide-react-native';
import { UserGymPlanDoc, UserGymProgramme } from '../../../../types/gym.types';
import { CURATED_PROGRAMMES } from '../../../../data/curatedProgrammes';
import { hapticLight } from '../../../../utils/haptics';
import { ICON, SPACE, TOUCH } from '../../../../theme/tokens';
import { useTheme } from '../../../../contexts/ThemeContext';
import { TactileButton, NumericText } from '../../../../components/ui';
import { AnimatedProgressBar } from '../../../../components/ui/AnimatedProgressBar';
import { useSplitsStyles } from '../styles/gymSplitsStyles';

export interface ProgrammesTabProps {
  userGymPlan: UserGymPlanDoc | null;
  getPhaseColor: (phaseType?: string) => { bg: string; text: string; dot: string };
  handleAdvanceWeek: () => void;
  handleEndProgramme: () => void;
  handleEnrollProgramme: (programme: UserGymProgramme) => void;
  onInspectProgramme: (programme: UserGymProgramme) => void;
  replayKey?: number | string;
}

export function formatPlainPhaseWord(phaseType?: string, weekNum?: number): string {
  switch (phaseType) {
    case 'accumulation':
      return weekNum === 1 ? 'Base' : 'Build';
    case 'intensification':
      return 'Push';
    case 'peak':
      return 'Peak';
    case 'deload':
      return 'Recover';
    default:
      return 'Build';
  }
}

export function formatPlainEffortLabel(targetRir?: number): string {
  if (targetRir == null) return 'Moderate';
  if (targetRir === 0) return 'Max Effort';
  if (targetRir === 1) return '1 Rep Left';
  return `${targetRir} Reps Left`;
}

export function formatPlainVolumeLabel(delta?: number): string {
  if (!delta) return 'Standard';
  if (delta > 0) return `+${delta} Set/lift`;
  return `${delta} Set/lift`;
}

export const ProgrammesTab: React.FC<ProgrammesTabProps> = React.memo(({
  userGymPlan,
  getPhaseColor,
  handleAdvanceWeek,
  handleEndProgramme,
  handleEnrollProgramme,
  onInspectProgramme,
  replayKey = 0,
}) => {
  const { tokens } = useTheme();
  const styles = useSplitsStyles();

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Active Programme Card OR Clean Borderless Intro Header */}
      {userGymPlan?.activeProgramme ? (
        (() => {
          const activeProg = userGymPlan.activeProgramme;
          const curWeekConfig = activeProg.weeks?.[activeProg.currentWeek];
          const phaseCol = getPhaseColor(curWeekConfig?.phaseType);
          const progressPct = Math.min(100, Math.round((activeProg.currentWeek / activeProg.totalWeeks) * 100));
          const phaseWord = formatPlainPhaseWord(curWeekConfig?.phaseType, activeProg.currentWeek);

          return (
            <View style={styles.programmeActiveCard}>
              <View style={styles.programmeActiveHeader}>
                <View style={[styles.programmePhasePill, { backgroundColor: phaseCol.bg }]}>
                  <View style={[styles.programmeActiveBadgeDot, { backgroundColor: phaseCol.dot }]} />
                  <Text style={[styles.programmePhasePillText, { color: phaseCol.text }]}>
                    {phaseWord.toUpperCase()} WEEK
                  </Text>
                </View>
                <NumericText style={styles.programmeWeekProgressText}>
                  Week {activeProg.currentWeek} of {activeProg.totalWeeks} · {progressPct}%
                </NumericText>
              </View>

              <Text style={styles.programmeActiveTitle}>{activeProg.name}</Text>
              {Boolean(curWeekConfig?.phaseName || activeProg.subtitle) && (
                <Text style={styles.programmeActiveSubtitle}>
                  {curWeekConfig?.phaseName || activeProg.subtitle}
                </Text>
              )}

              <AnimatedProgressBar
                progress={progressPct / 100}
                height={5}
                borderRadius={3}
                durationMs={520}
                replayKey={replayKey}
                color={phaseCol.text}
                trackColor="rgba(255, 255, 255, 0.08)"
                trackStyle={{ marginVertical: 8 }}
              />

              {curWeekConfig && (
                <View style={styles.activePrescriptionStrip}>
                  <View style={styles.activePrescriptionChip}>
                    <Text style={styles.activePrescriptionLabel}>EFFORT</Text>
                    <NumericText style={[styles.activePrescriptionValue, { color: phaseCol.text }]}>
                      {formatPlainEffortLabel(curWeekConfig.targetRir)}
                    </NumericText>
                  </View>
                  <View style={styles.activePrescriptionDivider} />
                  <View style={styles.activePrescriptionChip}>
                    <Text style={styles.activePrescriptionLabel}>WEIGHT</Text>
                    <NumericText style={styles.activePrescriptionValue}>
                      ~{curWeekConfig.intensityPercentage1RM || 70}% Max
                    </NumericText>
                  </View>
                  <View style={styles.activePrescriptionDivider} />
                  <View style={styles.activePrescriptionChip}>
                    <Text style={styles.activePrescriptionLabel}>SETS</Text>
                    <NumericText style={styles.activePrescriptionValue}>
                      {formatPlainVolumeLabel(curWeekConfig.volumeModifierSets)}
                    </NumericText>
                  </View>
                </View>
              )}

              {Boolean(curWeekConfig?.notes) && (
                <Text style={styles.activePrescriptionNotes} numberOfLines={2}>
                  {curWeekConfig?.notes}
                </Text>
              )}

              <View style={styles.activeProgActionsRow}>
                <TactileButton
                  variant="custom"
                  onPress={handleAdvanceWeek}
                  style={[styles.activeAdvanceBtn, { minWidth: 0 }]}
                >
                  <Text
                    style={styles.activeAdvanceBtnText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    {activeProg.currentWeek < activeProg.totalWeeks
                      ? `Complete Week ${activeProg.currentWeek} →`
                      : 'Finish Plan'}
                  </Text>
                </TactileButton>

                <TactileButton
                  variant="custom"
                  onPress={() => {
                    hapticLight();
                    onInspectProgramme(activeProg);
                  }}
                  style={[styles.activeRoadmapBtn, { minWidth: 0 }]}
                >
                  <Map size={14} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
                  <Text style={styles.activeRoadmapBtnText} numberOfLines={1}>Weeks</Text>
                </TactileButton>

                <TactileButton
                  variant="custom"
                  onPress={handleEndProgramme}
                  style={styles.activeEndBtn}
                  hitSlop={TOUCH.hitSlop}
                  accessibilityLabel="End active training block"
                >
                  <Square size={15} color={tokens.status.danger} strokeWidth={ICON.strokeWidth} />
                </TactileButton>
              </View>
            </View>
          );
        })()
      ) : (
        <View style={styles.introHeaderBlock}>
          <Text style={styles.introHeaderTitle}>Guided Training Blocks</Text>
          <Text style={styles.introHeaderSub}>
            Step-by-step multi-week blocks that build challenge gradually and schedule recovery weeks.
          </Text>
        </View>
      )}

      {/* Section Header */}
      <View style={styles.programmeSectionHeader}>
        <Text style={styles.programmeSectionHeaderTitle}>AVAILABLE PLANS</Text>
      </View>

      {/* Guided Plan Cards */}
      <View style={{ gap: SPACE[12] }}>
        {CURATED_PROGRAMMES.map(prog => {
          const isActive = userGymPlan?.activeProgramme?.id === prog.id;

          return (
            <View
              key={prog.id}
              style={styles.programmeLibraryCard}
            >
              <Pressable
                onPress={() => {
                  hapticLight();
                  onInspectProgramme(prog);
                }}
                style={({ pressed }) => [pressed && { opacity: 0.78 }]}
              >
                <View style={styles.programmeLibraryHeader}>
                  <Text style={styles.programmeLibraryTag}>
                    {prog.goal === 'hypertrophy'
                      ? 'MUSCLE GROWTH'
                      : prog.goal === 'strength'
                      ? 'STRENGTH'
                      : 'BODY RECOMP'}
                  </Text>
                  <NumericText style={styles.programmeLibraryWeeks}>{prog.totalWeeks} WEEKS</NumericText>
                </View>

                <Text style={styles.programmeLibraryTitle}>{prog.name}</Text>
                {Boolean(prog.subtitle) && (
                  <Text style={styles.programmeLibrarySubtitle}>{prog.subtitle}</Text>
                )}
                <Text style={styles.programmeLibraryDesc} numberOfLines={2}>
                  {prog.description}
                </Text>
              </Pressable>

              {/* Week Progress Strip & Auto-Width Readable Labels (Never Clips) */}
              <View style={{ marginBottom: SPACE[4] }}>
                <View style={styles.programmePhasesBar}>
                  {Object.values(prog.weeks).map(w => {
                    const col = getPhaseColor(w.phaseType);
                    return (
                      <View
                        key={`pbar-${prog.id}-${w.weekNumber}`}
                        style={[styles.programmePhaseBarSegment, { backgroundColor: col.text }]}
                      />
                    );
                  })}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.programmeWeeksScrollTrack}
                >
                  {Object.values(prog.weeks).map(w => {
                    const col = getPhaseColor(w.phaseType);
                    const phaseWord = formatPlainPhaseWord(w.phaseType, w.weekNumber);

                    return (
                      <View key={`prog-${prog.id}-w${w.weekNumber}`} style={styles.programmeWeekScrollPill}>
                        <NumericText style={styles.programmeTimelineWeekLabel}>
                          Week {w.weekNumber}
                        </NumericText>
                        <Text style={[styles.programmeTimelinePhaseLabel, { color: col.text }]}>
                          {phaseWord}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Clean 50/50 Buttons: View Weeks | Start Plan */}
              <View style={styles.programmeCardActionRow}>
                <TactileButton
                  variant="custom"
                  size="md"
                  onPress={() => {
                    hapticLight();
                    onInspectProgramme(prog);
                  }}
                  style={[styles.programmeViewCurriculumBtn, { minWidth: 0 }]}
                >
                  <List size={14} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
                  <Text
                    style={styles.programmeViewCurriculumBtnText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    View Weeks
                  </Text>
                </TactileButton>

                {isActive ? (
                  <View style={[styles.programmeEnrolledBadge, { minWidth: 0 }]}>
                    <View style={[styles.programmeActiveBadgeDot, { backgroundColor: tokens.status.success }]} />
                    <Text
                      style={styles.programmeEnrolledBadgeText}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                    >
                      Active Plan
                    </Text>
                  </View>
                ) : (
                  <TactileButton
                    variant="primary"
                    size="md"
                    onPress={() => handleEnrollProgramme(prog)}
                    style={[styles.programmeEnrollBtn, { minWidth: 0 }]}
                  >
                    <Play size={14} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} />
                    <Text
                      style={styles.programmeEnrollBtnText}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                    >
                      Start Plan
                    </Text>
                  </TactileButton>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
});

export default ProgrammesTab;
