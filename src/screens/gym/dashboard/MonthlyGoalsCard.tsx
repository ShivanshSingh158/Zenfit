import React from 'react';
import { View, Text } from 'react-native';
import { ChevronRight, Flag, Pencil, Trophy } from 'lucide-react-native';
import { ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';
import { formatPRDate } from '../../../utils/progressiveOverload';
import { formatVolumeParts, formatWeight, useWeightUnit } from '../../../utils/weightUnit';
import { TactileButton } from '../../../components/ui/TactileButton';
import { NumericText } from '../../../components/ui/NumericText';
import { RollingNumber } from '../../../components/ui/RollingNumber';
import { AnimatedProgressBar } from '../../../components/ui/AnimatedProgressBar';
import { makeDashboardStyles } from './gymDashboardStyles';

export interface LatestPRSummary {
  exerciseName: string;
  heaviestWeight?: number;
  bestReps?: number;
  best1RM?: number;
  achievedAt?: string;
}

export interface MonthlyGoalsCardProps {
  currentMonthName: string;
  sessionsThisMonth: number;
  monthlyTarget: number;
  monthProgressPct: number;
  monthVolumeKg: number;
  isOnPace: boolean;
  daysLeftInMonth: number;
  latestPR: LatestPRSummary | null;
  replayKey: number | string;
  onOpenPRVault: () => void;
  onEditGoal: () => void;
  tokens: ThemeTokens;
  styles: ReturnType<typeof makeDashboardStyles>;
}

export const MonthlyGoalsCard: React.FC<MonthlyGoalsCardProps> = React.memo(
  function MonthlyGoalsCard({
    currentMonthName,
    sessionsThisMonth,
    monthlyTarget,
    monthProgressPct,
    monthVolumeKg,
    isOnPace,
    daysLeftInMonth,
    latestPR,
    replayKey,
    onOpenPRVault,
    onEditGoal,
    tokens,
    styles,
  }) {
    const unitIsLbs = useWeightUnit();
    const monthVol = formatVolumeParts(monthVolumeKg, unitIsLbs);
    const prWeightText = formatWeight(latestPR?.heaviestWeight, unitIsLbs, 1);
    const rawPrDate = latestPR?.achievedAt ? formatPRDate(latestPR.achievedAt) : '';
    const curYearSuffix = ` ${new Date().getFullYear()}`;
    const compactPrDate = rawPrDate.endsWith(curYearSuffix)
      ? rawPrDate.slice(0, -curYearSuffix.length)
      : rawPrDate;

    return (
      <>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderLabel} numberOfLines={1}>
            {currentMonthName.toUpperCase()} GOALS & PRs
          </Text>
          <TactileButton
            variant="custom"
            hitSlop={TOUCH.hitSlop}
            onPress={onOpenPRVault}
            style={{ flexShrink: 0 }}
          >
            <Text style={styles.sectionBadgeLink} numberOfLines={1}>PR Vault ↗</Text>
          </TactileButton>
        </View>

        <View style={styles.monthlyGoalCard}>
          <View style={styles.monthlyGoalHeader}>
            <TactileButton
              variant="custom"
              style={styles.monthlyGoalTitleGroup}
              hitSlop={TOUCH.hitSlop}
              onPress={onEditGoal}
            >
              <Flag size={14} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
              <Text style={styles.monthlyGoalHeaderLabel} numberOfLines={1}>TARGET SESSIONS</Text>
              <Pencil
                size={12}
                color={tokens.text.secondary}
                strokeWidth={ICON.strokeWidth}
                style={{ marginLeft: 2 }}
              />
            </TactileButton>

            <View style={styles.goalPctBadge}>
              <RollingNumber
                value={monthProgressPct}
                suffix="%"
                replayKey={replayKey}
                cycles={1}
                durationMs={520}
                style={styles.goalPctText}
              />
            </View>
          </View>

          {/* Progress Bar & Numerical Target */}
          <View style={styles.goalTargetRow}>
            <View style={{ flex: 1, paddingRight: SPACE[8] }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <NumericText style={styles.goalTargetTitle}>{sessionsThisMonth}</NumericText>
                <NumericText style={styles.goalTargetMax}>
                  {' '}/ {monthlyTarget} Workouts
                </NumericText>
              </View>
              <NumericText style={styles.goalPaceSub} numberOfLines={1}>
                {sessionsThisMonth >= monthlyTarget
                  ? 'Monthly target achieved!'
                  : `${Math.max(0, monthlyTarget - sessionsThisMonth)} sessions remaining this month`}
              </NumericText>
            </View>
          </View>

          {/* Progress Bar Track with Milestone Tick Marks */}
          <AnimatedProgressBar
            progress={monthProgressPct / 100}
            minVisualRatio={0.04}
            height={8}
            borderRadius={RADIUS.full}
            durationMs={560}
            replayKey={replayKey}
            color={monthProgressPct >= 100 ? tokens.status.success : tokens.accent.primary}
            trackColor={tokens.bg.elevated}
            trackStyle={{ marginVertical: 4 }}
          >
            <View pointerEvents="none" style={[styles.milestoneTick, { left: '25%' }]} />
            <View pointerEvents="none" style={[styles.milestoneTick, { left: '50%' }]} />
            <View pointerEvents="none" style={[styles.milestoneTick, { left: '75%' }]} />
          </AnimatedProgressBar>

          {/* Milestone Labels Row */}
          <View style={styles.milestoneLabelsRow}>
            <NumericText style={styles.milestoneLabel}>0%</NumericText>
            <NumericText style={styles.milestoneLabel}>25%</NumericText>
            <NumericText style={styles.milestoneLabel}>50%</NumericText>
            <NumericText style={styles.milestoneLabel}>75%</NumericText>
            <NumericText
              style={[
                styles.milestoneLabel,
                monthProgressPct >= 100 && { color: tokens.status.success },
              ]}
            >
              100%
            </NumericText>
          </View>

          {/* 3-Column Micro Stats Strip */}
          <View style={styles.goalMicroStrip}>
            <View style={styles.goalMicroCol}>
              <RollingNumber
                value={monthVol.numStr}
                suffix={` ${monthVol.suffix}`}
                replayKey={replayKey}
                cycles={1}
                durationMs={580}
                numberOfLines={1}
                style={styles.goalMicroVal}
              />
              <Text
                style={styles.goalMicroLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                Monthly Tonnage
              </Text>
            </View>

            <View style={styles.goalMicroDivider} />

            <View style={styles.goalMicroCol}>
              <NumericText
                style={[styles.goalMicroVal, { color: tokens.status.success }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {isOnPace ? 'On Pace' : `${sessionsThisMonth} Logged`}
              </NumericText>
              <Text
                style={styles.goalMicroLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                Target Pace
              </Text>
            </View>

            <View style={styles.goalMicroDivider} />

            <View style={styles.goalMicroCol}>
              <NumericText
                style={styles.goalMicroVal}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {daysLeftInMonth}d
              </NumericText>
              <Text
                style={styles.goalMicroLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                Days Left
              </Text>
            </View>
          </View>

          {/* Integrated Latest Personal Record Milestone */}
          <TactileButton
            variant="custom"
            scaleTo={0.985}
            style={styles.goalPrRow}
            hitSlop={TOUCH.hitSlop}
            onPress={onOpenPRVault}
          >
            {latestPR ? (
              <>
                <View style={styles.goalPrLeft}>
                  <Trophy size={13} color={tokens.status.gold} strokeWidth={ICON.strokeWidth} />
                  <Text style={styles.goalPrBold} numberOfLines={1} ellipsizeMode="tail">
                    {latestPR.exerciseName}
                  </Text>
                </View>

                <View style={styles.goalPrRightAction}>
                  <NumericText
                    style={styles.goalPrMetric}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                  >
                    {latestPR.heaviestWeight && latestPR.heaviestWeight > 0
                      ? `${prWeightText}${latestPR.bestReps ? ` × ${latestPR.bestReps}` : ''}`
                      : latestPR.bestReps
                      ? `${latestPR.bestReps} reps`
                      : ''}
                  </NumericText>
                  {compactPrDate ? (
                    <Text
                      style={styles.goalPrDate}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.2}
                    >
                      · {compactPrDate}
                    </Text>
                  ) : null}
                  <ChevronRight
                    size={13}
                    color={tokens.text.secondary}
                    strokeWidth={ICON.strokeWidth}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.goalPrLeft}>
                  <Trophy size={13} color={tokens.text.secondary} strokeWidth={ICON.strokeWidth} />
                  <Text style={styles.goalPrLabel} numberOfLines={1} ellipsizeMode="tail">
                    Personal Records ·{' '}
                    <Text style={styles.goalPrEmpty}>No PRs logged yet</Text>
                  </Text>
                </View>
                <View style={styles.goalPrRightAction}>
                  <Text style={styles.goalPrVaultLink}>View Vault</Text>
                  <ChevronRight
                    size={13}
                    color={tokens.text.secondary}
                    strokeWidth={ICON.strokeWidth}
                  />
                </View>
              </>
            )}
          </TactileButton>
        </View>
      </>
    );
  }
);

export default MonthlyGoalsCard;
