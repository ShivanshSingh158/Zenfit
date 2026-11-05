/**
 * StructuralBalanceCard.tsx — ZenFit
 *
 * Charles Poliquin & ATG (Athletic Truth Group) Structural Balance Engine:
 * Evaluates antagonistic muscular balance to prevent rotator cuff impingement,
 * knee valgus, and anterior pelvic tilt.
 *
 * Upper Body (Push / Pull):
 * - Flat Bench Press: 100% (Baseline)
 * - Incline Dumbbell Press: 78% (39% per hand)
 * - Barbell Bent-Over Row: 82%
 * - Overhead Press: 65%
 *
 * Lower Body (Squat / Hinge):
 * - Back Squat: 100% (Baseline)
 * - Romanian Deadlift (RDL): 75%
 * - Front Squat: 82%
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILY, RADIUS } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { hapticSelection, hapticLight } from '../../../utils/haptics';
import { GymDayLog } from '../../../types/gym.types';
import { normalizeExerciseKey } from '../../../utils/gymUtils';
import { calculateSetE1RM } from '../../../utils/progressionEngine';

interface LiftSpec {
  id: string;
  name: string;
  aliases: string[];
  targetRatio: number; // percentage of baseline (e.g. 78 for 78%)
  tolerancePct: number; // ± tolerance before flagged
  isBaseline?: boolean;
}

const UPPER_LIFTS: LiftSpec[] = [
  {
    id: 'bench',
    name: 'Flat Bench Press',
    aliases: ['barbell bench press', 'flat bench press', 'bench press', 'flat barbell bench press', 'dumbbell bench press'],
    targetRatio: 100,
    tolerancePct: 0,
    isBaseline: true,
  },
  {
    id: 'incline',
    name: 'Incline DB Press',
    aliases: ['incline dumbbell press', 'incline db press', 'incline dumbbell bench press', 'incline bench press', 'incline barbell bench press'],
    targetRatio: 78,
    tolerancePct: 7,
  },
  {
    id: 'row',
    name: 'Bent-Over Row',
    aliases: ['barbell row', 'bent over row', 'barbell bent over row', 'pendlay row', 'chest supported row', 't-bar row'],
    targetRatio: 82,
    tolerancePct: 8,
  },
  {
    id: 'ohp',
    name: 'Overhead Press',
    aliases: ['overhead press', 'military press', 'standing overhead press', 'barbell shoulder press', 'dumbbell shoulder press'],
    targetRatio: 65,
    tolerancePct: 7,
  },
];

const LOWER_LIFTS: LiftSpec[] = [
  {
    id: 'squat',
    name: 'Back Squat',
    aliases: ['barbell back squat', 'back squat', 'barbell squat', 'squat'],
    targetRatio: 100,
    tolerancePct: 0,
    isBaseline: true,
  },
  {
    id: 'rdl',
    name: 'Romanian Deadlift',
    aliases: ['romanian deadlift', 'rdl', 'barbell romanian deadlift', 'dumbbell romanian deadlift', 'stiff leg deadlift'],
    targetRatio: 75,
    tolerancePct: 8,
  },
  {
    id: 'front_squat',
    name: 'Front Squat',
    aliases: ['front squat', 'barbell front squat', 'goblet squat'],
    targetRatio: 82,
    tolerancePct: 8,
  },
];

interface LiftResult {
  spec: LiftSpec;
  e1rm: number;
  actualRatio: number; // e.g. 80 (%)
  status: 'optimal' | 'lagging' | 'dominant' | 'untested';
  statusLabel: string;
  statusColor: string;
}

interface StructuralBalanceCardProps {
  gymLogs: GymDayLog[];
  style?: any;
}

function findBestE1RMForAliases(logs: GymDayLog[], aliases: string[]): number {
  let best = 0;
  const aliasKeys = new Set(aliases.map(a => normalizeExerciseKey(a)));

  for (const log of logs || []) {
    for (const ex of log.exercises || []) {
      if (!ex.name) continue;
      const key = normalizeExerciseKey(ex.name);
      const isMatch = aliasKeys.has(key) || aliases.some(a => key.includes(normalizeExerciseKey(a)));
      if (!isMatch) continue;

      for (const s of ex.setsLog || []) {
        if (!s.completed || s.isWarmup) continue;
        const w = Number(s.weight) || 0;
        const r = Number(s.reps) || 0;
        if (w <= 0 || r <= 0) continue;
        const e1rm = calculateSetE1RM(w, r, s.rir ?? 0);
        if (e1rm > best) {
          best = Math.round(e1rm * 10) / 10;
        }
      }
    }
  }

  return best;
}

export const StructuralBalanceCard: React.FC<StructuralBalanceCardProps> = ({
  gymLogs,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const [section, setSection] = useState<'upper' | 'lower'>('upper');

  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const hairline = isDark ? 'rgba(84, 84, 88, 0.36)' : 'rgba(60, 60, 67, 0.18)';

  const activeSpecs = section === 'upper' ? UPPER_LIFTS : LOWER_LIFTS;

  const analysis = useMemo(() => {
    // 1. Calculate best e1RM for each lift in this section
    const rawResults = activeSpecs.map(spec => {
      const e1rm = findBestE1RMForAliases(gymLogs, spec.aliases);
      return { spec, e1rm };
    });

    const baselineLift = rawResults.find(r => r.spec.isBaseline);
    const baselineE1RM = baselineLift?.e1rm || 0;

    const list: LiftResult[] = rawResults.map(r => {
      if (r.spec.isBaseline) {
        return {
          spec: r.spec,
          e1rm: r.e1rm,
          actualRatio: r.e1rm > 0 ? 100 : 0,
          status: r.e1rm > 0 ? 'optimal' : 'untested',
          statusLabel: r.e1rm > 0 ? 'Baseline (100%)' : 'Untested',
          statusColor: r.e1rm > 0 ? '#30D158' : '#8E8E93',
        };
      }

      if (r.e1rm <= 0) {
        return {
          spec: r.spec,
          e1rm: 0,
          actualRatio: 0,
          status: 'untested',
          statusLabel: 'Not logged',
          statusColor: '#8E8E93',
        };
      }

      if (baselineE1RM <= 0) {
        return {
          spec: r.spec,
          e1rm: r.e1rm,
          actualRatio: 0,
          status: 'untested',
          statusLabel: 'Needs baseline',
          statusColor: '#8E8E93',
        };
      }

      const ratio = Math.round((r.e1rm / baselineE1RM) * 100);
      const minAcceptable = r.spec.targetRatio - r.spec.tolerancePct;
      const maxAcceptable = r.spec.targetRatio + r.spec.tolerancePct;

      let status: 'optimal' | 'lagging' | 'dominant' = 'optimal';
      let statusLabel = 'Balanced';
      let statusColor = '#30D158'; // Green

      if (ratio < minAcceptable) {
        status = 'lagging';
        statusLabel = `Lagging (${ratio}% vs ${r.spec.targetRatio}%)`;
        statusColor = '#FF9F0A'; // Amber
      } else if (ratio > maxAcceptable) {
        status = 'dominant';
        statusLabel = `Dominant (${ratio}% vs ${r.spec.targetRatio}%)`;
        statusColor = '#60A5FA'; // Ice Blue
      } else {
        statusLabel = `Balanced (${ratio}%)`;
      }

      return {
        spec: r.spec,
        e1rm: r.e1rm,
        actualRatio: ratio,
        status,
        statusLabel,
        statusColor,
      };
    });

    // Coaching recommendation text
    const laggingLifts = list.filter(r => r.status === 'lagging');
    let advice = '';

    if (baselineE1RM <= 0) {
      advice = section === 'upper'
        ? '💡 Log a Flat Bench Press working set to calibrate your Upper Body Poliquin ratios.'
        : '💡 Log a Back Squat working set to calibrate your Lower Body ATG structural ratios.';
    } else if (laggingLifts.length > 0) {
      const names = laggingLifts.map(l => l.spec.name).join(' & ');
      advice = section === 'upper'
        ? `⚠️ ${names} lagging behind pressing strength. Increasing rowing and vertical pressing volume protects your rotator cuff and anterior shoulder capsule.`
        : `⚠️ ${names} lagging behind your squat. Increasing Romanian Deadlifts reinforces your posterior chain and protects your knees/ACL from sheer stress.`;
    } else {
      advice = '🛡️ Excellent structural balance! Your pulling and antagonistic strength matches your prime movers, minimizing joint injury risk.';
    }

    return { list, baselineE1RM, advice };
  }, [gymLogs, activeSpecs, section]);

  return (
    <View style={[styles.card, { backgroundColor: cardBg }, style]}>
      {/* Header with Title and Segmented Switcher */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#A599FF" />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              STRUCTURAL BALANCE (POLIQUIN / ATG)
            </Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Antagonistic 1RM ratios to prevent muscle tears & postural imbalance
          </Text>
        </View>
      </View>

      {/* Segmented Control: Upper vs Lower */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            section === 'upper' && styles.segmentBtnActive,
            section === 'upper' && { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' },
          ]}
          onPress={() => {
            hapticSelection();
            setSection('upper');
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.segmentText,
              { color: section === 'upper' ? colors.textPrimary : '#8E8E93' },
              section === 'upper' && styles.segmentTextActive,
            ]}
          >
            Upper Push / Pull
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            section === 'lower' && styles.segmentBtnActive,
            section === 'lower' && { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' },
          ]}
          onPress={() => {
            hapticSelection();
            setSection('lower');
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.segmentText,
              { color: section === 'lower' ? colors.textPrimary : '#8E8E93' },
              section === 'lower' && styles.segmentTextActive,
            ]}
          >
            Lower Squat / Hinge
          </Text>
        </TouchableOpacity>
      </View>

      {/* Ratios Breakdown List */}
      <View style={{ gap: 14, marginTop: 14 }}>
        {analysis.list.map(item => {
          const isBaseline = item.spec.isBaseline;
          const targetPct = item.spec.targetRatio;
          const actualPct = Math.min(100, item.actualRatio);
          const has1RM = item.e1rm > 0;

          return (
            <View key={item.spec.id} style={styles.liftRow}>
              {/* Lift Top Line */}
              <View style={styles.liftTopLine}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.liftName, { color: colors.textPrimary }]}>
                    {item.spec.name}
                  </Text>
                  {isBaseline && (
                    <View style={styles.baselineBadge}>
                      <Text style={styles.baselineBadgeText}>100% BASE</Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {has1RM ? (
                    <Text style={[styles.e1rmText, { color: colors.textPrimary }]}>
                      {item.e1rm} kg
                    </Text>
                  ) : (
                    <Text style={[styles.e1rmText, { color: '#8E8E93' }]}>—</Text>
                  )}
                  <Text style={[styles.statusText, { color: item.statusColor }]}>
                    · {item.statusLabel}
                  </Text>
                </View>
              </View>

              {/* Progress Visual Bar comparing Actual vs Target */}
              <View style={styles.trackContainer}>
                {/* Target Marker Pin */}
                {!isBaseline && (
                  <View
                    style={[
                      styles.targetMarker,
                      { left: `${targetPct}%` },
                    ]}
                  >
                    <View style={styles.targetMarkerLine} />
                    <Text style={styles.targetMarkerLabel}>{targetPct}%</Text>
                  </View>
                )}

                {/* Actual Ratio Fill */}
                {has1RM && (
                  <View
                    style={[
                      styles.actualFill,
                      {
                        width: isBaseline ? '100%' : `${actualPct}%`,
                        backgroundColor: isBaseline ? '#A599FF' : item.statusColor,
                      },
                    ]}
                  />
                )}
              </View>

              {/* Sub-label */}
              <View style={styles.liftBottomLine}>
                <Text style={styles.liftSubtext}>
                  {isBaseline
                    ? 'Reference lift for all antagonist balance calculations'
                    : `Poliquin Target: ${targetPct}% of ${analysis.baselineE1RM > 0 ? `${analysis.baselineE1RM} kg` : 'baseline'} (${Math.round((analysis.baselineE1RM * targetPct) / 100)} kg)`}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Advice / Injury Prevention Card */}
      <View style={[styles.adviceBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F2F2F7' }]}>
        <Ionicons name="information-circle-outline" size={15} color="#A599FF" style={{ marginTop: 1 }} />
        <Text style={[styles.adviceText, { color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#3C3C43' }]}>
          {analysis.advice}
        </Text>
      </View>
    </View>
  );
};

export default StructuralBalanceCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    padding: 14,
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    marginTop: 2,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(142, 142, 147, 0.16)',
    borderRadius: RADIUS.sm,
    padding: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: RADIUS.sm - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
  },
  segmentTextActive: {
    fontFamily: FONT_FAMILY.bold,
  },
  liftRow: {
    gap: 4,
  },
  liftTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liftName: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semibold,
  },
  baselineBadge: {
    backgroundColor: 'rgba(165, 153, 255, 0.16)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  baselineBadgeText: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.bold,
    color: '#A599FF',
    letterSpacing: 0.4,
  },
  e1rmText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
  },
  statusText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.medium,
  },
  trackContainer: {
    height: 7,
    backgroundColor: 'rgba(142, 142, 147, 0.2)',
    borderRadius: 999,
    overflow: 'visible',
    position: 'relative',
    marginVertical: 4,
  },
  actualFill: {
    height: '100%',
    borderRadius: 999,
  },
  targetMarker: {
    position: 'absolute',
    top: -5,
    bottom: -5,
    width: 2,
    alignItems: 'center',
    zIndex: 2,
  },
  targetMarkerLine: {
    width: 2,
    height: 17,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  targetMarkerLabel: {
    position: 'absolute',
    top: 17,
    fontSize: 8.5,
    fontFamily: FONT_FAMILY.bold,
    color: '#8E8E93',
  },
  liftBottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  liftSubtext: {
    fontSize: 10.5,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
  },
  adviceBox: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: RADIUS.md,
    padding: 10,
    marginTop: 14,
  },
  adviceText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.medium,
  },
});
