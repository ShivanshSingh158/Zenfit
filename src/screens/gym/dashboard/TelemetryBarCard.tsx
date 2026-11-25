import React from 'react';
import { View, Text } from 'react-native';
import { Activity, BarChart2, Calendar, TrendingDown, TrendingUp } from 'lucide-react-native';
import { ICON, ThemeTokens } from '../../../theme/tokens';
import { formatVolumeParts, useWeightUnit } from '../../../utils/weightUnit';
import { TactileButton } from '../../../components/ui/TactileButton';
import { NumericText } from '../../../components/ui/NumericText';
import { RollingNumber } from '../../../components/ui/RollingNumber';
import { makeDashboardStyles } from './gymDashboardStyles';

export interface TelemetryBarCardProps {
  sessionsThisWeek: number;
  weeklyPlannedSessions: number;
  weekDots?: boolean[];
  todayDotIdx?: number;
  todayTargetReadinessPct: number;
  weeklyTotalVolumeKg: number;
  volumeTrendDiffKg: number;
  replayKey: number | string;
  onPressSessions: () => void;
  onPressReadiness: () => void;
  onPressVolume: () => void;
  tokens: ThemeTokens;
  styles: ReturnType<typeof makeDashboardStyles>;
}

export const TelemetryBarCard: React.FC<TelemetryBarCardProps> = React.memo(
  function TelemetryBarCard({
    sessionsThisWeek,
    weeklyPlannedSessions,
    weekDots,
    todayDotIdx,
    todayTargetReadinessPct,
    weeklyTotalVolumeKg,
    volumeTrendDiffKg,
    replayKey,
    onPressSessions,
    onPressReadiness,
    onPressVolume,
    tokens,
    styles,
  }) {
    const readinessColor =
      todayTargetReadinessPct >= 85
        ? tokens.status.success
        : todayTargetReadinessPct >= 50
        ? tokens.status.warning
        : tokens.status.danger;

    const readinessRatio = Math.min(100, Math.max(0, todayTargetReadinessPct));
    const resolvedTodayDotIdx =
      typeof todayDotIdx === 'number' ? todayDotIdx : (new Date().getDay() + 6) % 7;
    const normalizedDots =
      weekDots && weekDots.length === 7
        ? weekDots
        : [false, false, false, false, false, false, false];
    const hasVolumeBaseline =
      weeklyTotalVolumeKg > 0 || volumeTrendDiffKg !== 0;
    const unitIsLbs = useWeightUnit();
    const volDisplay = formatVolumeParts(weeklyTotalVolumeKg, unitIsLbs);
    const diffPrefix = volumeTrendDiffKg >= 0 ? '+' : '-';
    const diffDisplay = formatVolumeParts(Math.abs(volumeTrendDiffKg), unitIsLbs);

    return (
      <View style={styles.telemetryBarCard}>
        {/* Column 1: THIS WEEK */}
        <TactileButton
          variant="custom"
          style={styles.telemetryCol}
          onPress={onPressSessions}
        >
          <View style={styles.telemetryLabelRow}>
            <Calendar size={11} color={tokens.status.success} strokeWidth={ICON.strokeWidth} />
            <Text
              style={styles.telemetryLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.76}
            >
              THIS WEEK
            </Text>
          </View>
          <View style={styles.telemetryFractionRow}>
            <RollingNumber
              value={sessionsThisWeek}
              replayKey={replayKey}
              cycles={0}
              durationMs={420}
              style={styles.telemetryVal}
            />
            <NumericText style={styles.telemetryValMuted} numberOfLines={1}>
              /{weeklyPlannedSessions}
            </NumericText>
          </View>
          <View style={styles.weekDotsRail}>
            {normalizedDots.map((isDone, idx) => {
              const isToday = idx === resolvedTodayDotIdx;
              return (
                <View
                  key={idx}
                  style={[
                    styles.weekDot,
                    isDone
                      ? { backgroundColor: tokens.status.success }
                      : isToday
                      ? {
                          backgroundColor: 'transparent',
                          borderWidth: 1.5,
                          borderColor: tokens.accent.primary,
                        }
                      : {
                          backgroundColor: tokens.isDark
                            ? 'rgba(255, 255, 255, 0.14)'
                            : 'rgba(9, 9, 11, 0.14)',
                        },
                  ]}
                />
              );
            })}
          </View>
        </TactileButton>

        <View style={styles.verticalHairline} />

        {/* Column 2: READINESS & PRIMING */}
        <TactileButton
          variant="custom"
          style={styles.telemetryCol}
          onPress={onPressReadiness}
        >
          <View style={styles.telemetryLabelRow}>
            <Activity size={11} color={readinessColor} strokeWidth={ICON.strokeWidth} />
            <Text
              style={styles.telemetryLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.76}
            >
              READINESS
            </Text>
          </View>
          <View style={styles.telemetryFractionRow}>
            <RollingNumber
              value={todayTargetReadinessPct}
              suffix="%"
              replayKey={replayKey}
              cycles={1}
              durationMs={540}
              style={[styles.telemetryVal, { color: readinessColor }]}
            />
          </View>
          <View style={styles.telemetrySubRow}>
            <View
              style={[
                styles.readinessGaugeTrack,
                {
                  backgroundColor: tokens.isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(9, 9, 11, 0.10)',
                },
              ]}
            >
              <View
                style={[
                  styles.readinessGaugeFill,
                  {
                    width: `${Math.max(8, readinessRatio)}%`,
                    backgroundColor: readinessColor,
                  },
                ]}
              />
            </View>
            <Text
              style={[styles.readinessSubLabel, { color: readinessColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.76}
            >
              {todayTargetReadinessPct >= 85
                ? 'Optimal'
                : todayTargetReadinessPct >= 50
                ? 'Restoring'
                : 'Low'}
            </Text>
          </View>
        </TactileButton>

        <View style={styles.verticalHairline} />

        {/* Column 3: 7D VOLUME */}
        <TactileButton
          variant="custom"
          style={styles.telemetryCol}
          onPress={onPressVolume}
        >
          <View style={styles.telemetryLabelRow}>
            <BarChart2 size={11} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
            <Text
              style={styles.telemetryLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.76}
            >
              7D VOLUME
            </Text>
          </View>
          <View style={styles.telemetryFractionRow}>
            <RollingNumber
              value={volDisplay.numStr}
              replayKey={replayKey}
              cycles={1}
              durationMs={600}
              style={[styles.telemetryVal, { color: tokens.accent.primary }]}
            />
            <Text style={styles.telemetryValMuted} numberOfLines={1}> {volDisplay.suffix}</Text>
          </View>
          <View style={styles.telemetrySubRow}>
            {hasVolumeBaseline ? (
              <>
                {volumeTrendDiffKg >= 0 ? (
                  <TrendingUp size={11} color={tokens.status.success} strokeWidth={ICON.strokeWidth} />
                ) : (
                  <TrendingDown size={11} color={tokens.status.warning} strokeWidth={ICON.strokeWidth} />
                )}
                <NumericText
                  style={[
                    styles.volumeTrendText,
                    {
                      color:
                        volumeTrendDiffKg >= 0 ? tokens.status.success : tokens.status.warning,
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.76}
                >
                  {diffPrefix}{diffDisplay.numStr}
                </NumericText>
                <Text
                  style={styles.telemetrySubMuted}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.76}
                >
                  vs 7d
                </Text>
              </>
            ) : (
              <Text
                style={styles.telemetrySubMuted}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.76}
              >
                Baseline week
              </Text>
            )}
          </View>
        </TactileButton>
      </View>
    );
  }
);

export default TelemetryBarCard;
