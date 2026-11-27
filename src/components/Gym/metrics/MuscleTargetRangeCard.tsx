import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { NumericText, TactileButton } from '../../ui';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';
import { MuscleTargetZoneRow } from '../../../services/gymAnalyticsEngine';
import { hapticLight } from '../../../utils/haptics';

interface MuscleTargetRangeCardProps {
  rows: MuscleTargetZoneRow[];
  daySpan: number;
  totalSets: number;
  cardBg: string;
  onPressBodyMap?: () => void;
}

export const MuscleTargetRangeCard: React.FC<MuscleTargetRangeCardProps> = React.memo(
  function MuscleTargetRangeCard({
    rows,
    daySpan,
    totalSets,
    cardBg,
    onPressBodyMap,
  }) {
    const { tokens } = useTheme();
    const styles = useMemo(() => makeStyles(tokens), [tokens]);
    const [showAll, setShowAll] = useState(false);

    if (!rows || rows.length === 0) return null;

    const isMultiWeek = daySpan > 8;
    const visibleRows = showAll ? rows : rows.slice(0, 6);

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor: tokens.border.subtle,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.sectionLabel}>
              {isMultiWeek ? 'WEEKLY MUSCLE VOLUME AVG (MEV–MRV)' : 'MUSCLE TARGET ZONES (MEV–MRV)'}
            </Text>
            <NumericText style={styles.subLabel}>
              {rows.length} groups · {totalSets} direct sets
              {isMultiWeek ? ' · normalized per week' : ' · solid direct + faded syn'}
            </NumericText>
          </View>

          {onPressBodyMap ? (
            <TactileButton
              variant="custom"
              haptic="light"
              onPress={() => {
                hapticLight();
                onPressBodyMap();
              }}
              hitSlop={TOUCH.hitSlop}
              style={styles.bodyMapBtn}
            >
              <Text style={styles.bodyMapText}>Body Map</Text>
              <ChevronRight size={13} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
            </TactileButton>
          ) : null}
        </View>

        <View style={styles.list}>
          {visibleRows.map(item => {
            const scaleMax = Math.max(item.mrv + 3, item.weeklyAvgEffective + 1, 20);
            const mevLeftPct = Math.min(100, (item.mev / scaleMax) * 100);
            const mrvLeftPct = Math.min(100, (item.mrv / scaleMax) * 100);
            const zoneWidthPct = Math.max(4, mrvLeftPct - mevLeftPct);

            const weekFactor = isMultiWeek ? Math.max(1, daySpan / 7) : 1;
            const directWk = item.directSets / weekFactor;
            const synWk = item.synergistSets / weekFactor;
            const directPct = Math.min(100, (directWk / scaleMax) * 100);
            const synPct = Math.min(100 - directPct, (synWk / scaleMax) * 100);

            const statusColor =
              item.status === 'low'
                ? tokens.accent.secondary
                : item.status === 'high'
                ? tokens.status.warning
                : tokens.status.success;
            const statusText =
              item.status === 'low'
                ? 'Under MEV'
                : item.status === 'high'
                ? 'Near MRV'
                : 'Optimal';

            return (
              <View key={item.muscle} style={styles.row}>
                <View style={styles.labelRow}>
                  <View style={styles.nameGroup}>
                    <Text style={styles.muscleName}>{item.muscle}</Text>
                    <View
                      style={[
                        styles.statusChip,
                        { backgroundColor: `${statusColor}20` },
                      ]}
                    >
                      <Text style={[styles.statusChipText, { color: statusColor }]}>
                        {statusText}
                      </Text>
                    </View>
                  </View>

                  <NumericText style={styles.statText}>
                    {isMultiWeek ? `${item.weeklyAvgEffective}/wk` : `${item.effectiveSets}`}
                    <Text style={styles.targetHint}>
                      {' '}· target {item.mev}–{item.mrv}
                    </Text>
                  </NumericText>
                </View>

                <View style={styles.track}>
                  {/* Shaded MEV -> MRV optimal band */}
                  <View
                    style={[
                      styles.optimalBand,
                      {
                        left: `${mevLeftPct}%`,
                        width: `${zoneWidthPct}%`,
                      },
                    ]}
                  />
                  {/* Direct + Synergist fill */}
                  <View style={styles.fillRow}>
                    {directPct > 0 && (
                      <View
                        style={{
                          width: `${directPct}%`,
                          height: '100%',
                          backgroundColor: statusColor,
                          borderTopLeftRadius: 4,
                          borderBottomLeftRadius: 4,
                          borderTopRightRadius: synPct <= 0 ? 4 : 0,
                          borderBottomRightRadius: synPct <= 0 ? 4 : 0,
                        }}
                      />
                    )}
                    {synPct > 0 && (
                      <View
                        style={{
                          width: `${synPct}%`,
                          height: '100%',
                          backgroundColor: statusColor,
                          opacity: 0.38,
                          borderTopRightRadius: 4,
                          borderBottomRightRadius: 4,
                        }}
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {rows.length > 6 && (
          <TactileButton
            variant="custom"
            haptic="light"
            style={styles.expandBtn}
            onPress={() => setShowAll(prev => !prev)}
          >
            <Text style={styles.expandText}>
              {showAll ? 'Show top 6' : `Show all ${rows.length} muscle groups`}
            </Text>
          </TactileButton>
        )}
      </View>
    );
  }
);

const makeStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    card: {
      borderRadius: RADIUS.card,
      padding: SPACE.lg,
      borderWidth: StyleSheet.hairlineWidth,
      marginBottom: 10,
      gap: 12,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    sectionLabel: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.secondary,
      letterSpacing: 0.6,
    },
    subLabel: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.muted,
      marginTop: 2,
    },
    bodyMapBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 2,
    },
    bodyMapText: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.accent.primary,
    },
    list: {
      gap: 11,
    },
    row: {
      gap: 5,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    nameGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 1,
    },
    muscleName: {
      fontSize: 13,
      fontFamily: FONT_FAMILY.semibold,
      color: tokens.text.primary,
    },
    statusChip: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 5,
    },
    statusChipText: {
      fontSize: 9.5,
      fontFamily: FONT_FAMILY.bold,
    },
    statText: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.text.primary,
    },
    targetHint: {
      fontSize: 10.5,
      fontFamily: FONT_FAMILY.medium,
      color: tokens.text.muted,
    },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: tokens.bg.elevated,
      overflow: 'hidden',
      position: 'relative',
    },
    optimalBand: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      backgroundColor: tokens.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(9,9,11,0.07)',
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: tokens.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(9,9,11,0.16)',
    },
    fillRow: {
      flexDirection: 'row',
      height: '100%',
      width: '100%',
    },
    expandBtn: {
      alignItems: 'center',
      paddingTop: 4,
    },
    expandText: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.bold,
      color: tokens.accent.primary,
    },
  });

export default MuscleTargetRangeCard;
