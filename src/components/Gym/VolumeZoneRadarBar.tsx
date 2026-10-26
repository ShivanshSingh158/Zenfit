/**
 * VolumeZoneRadarBar.tsx • ZenFit Mobile
 *
 * Interactive Volume Radar / Zone Bar:
 * - Color-coded bars showing MEV (Minimum Effective Volume) vs MRV (Maximum Recoverable Volume)
 *   for each muscle group.
 * - Calibrated with Dr. Mike Israetel hypertrophy volume landmarks (MEV, MAV, MRV).
 * - Interactive tap reveals direct vs synergist breakdown, zone indicators & coaching tips.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILY, RADIUS, SPACE } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { hapticLight, hapticSelection } from '../../utils/haptics';
import { resolveMuscleColor } from '../../utils/gymUtils';

// ── Hypertrophy Volume Landmarks (MEV, MAV, MRV) ────────────────────────────
export interface MuscleLandmark {
  mev: number;      // Minimum Effective Volume
  mavMin: number;   // Maximum Adaptive Volume start
  mavMax: number;   // Maximum Adaptive Volume ceiling
  mrv: number;      // Maximum Recoverable Volume
}

export const VOLUME_LANDMARKS: Record<string, MuscleLandmark> = {
  Chest:      { mev: 8,  mavMin: 12, mavMax: 18, mrv: 22 },
  Back:       { mev: 10, mavMin: 14, mavMax: 22, mrv: 25 },
  Lats:       { mev: 8,  mavMin: 12, mavMax: 20, mrv: 24 },
  Shoulders:  { mev: 8,  mavMin: 14, mavMax: 22, mrv: 26 },
  Quads:      { mev: 8,  mavMin: 12, mavMax: 18, mrv: 20 },
  Hamstrings: { mev: 6,  mavMin: 10, mavMax: 16, mrv: 18 },
  Glutes:     { mev: 4,  mavMin: 8,  mavMax: 16, mrv: 20 },
  Biceps:     { mev: 6,  mavMin: 10, mavMax: 16, mrv: 20 },
  Triceps:    { mev: 6,  mavMin: 10, mavMax: 16, mrv: 20 },
  Calves:     { mev: 6,  mavMin: 10, mavMax: 16, mrv: 20 },
  Abs:        { mev: 4,  mavMin: 8,  mavMax: 16, mrv: 20 },
  Traps:      { mev: 4,  mavMin: 8,  mavMax: 16, mrv: 20 },
  Forearms:   { mev: 4,  mavMin: 8,  mavMax: 14, mrv: 18 },
};

export interface MuscleVolumeEntry {
  muscleGroup: string;
  directSets: number;
  synergistSets: number;
  effectiveSets: number;
}

interface Props {
  volumes: MuscleVolumeEntry[];
  title?: string;
  subtitle?: string;
}

export const VolumeZoneRadarBar: React.FC<Props> = React.memo(({
  volumes,
  title = 'VOLUME LANDMARKS & ZONES',
  subtitle = 'MEV (Min Effective) vs MRV (Max Recoverable)',
}) => {
  const { colors, isDark } = useTheme();
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [filterRegion, setFilterRegion] = useState<'all' | 'lagging' | 'optimal'>('all');

  const processedData = useMemo(() => {
    return volumes.map(v => {
      const lm = VOLUME_LANDMARKS[v.muscleGroup] || { mev: 6, mavMin: 10, mavMax: 16, mrv: 20 };
      const sets = v.effectiveSets;

      let zone: 'sub_mev' | 'mev_mav' | 'optimal_mav' | 'near_mrv' | 'exceeded_mrv';
      let statusLabel: string;
      let statusColor: string;

      if (sets < lm.mev) {
        zone = 'sub_mev';
        statusLabel = 'Sub-MEV';
        statusColor = '#FF9F0A'; // Amber
      } else if (sets < lm.mavMin) {
        zone = 'mev_mav';
        statusLabel = 'Maintenance';
        statusColor = '#60A5FA'; // Blue
      } else if (sets <= lm.mavMax) {
        zone = 'optimal_mav';
        statusLabel = 'Optimal MAV';
        statusColor = '#30D158'; // Green
      } else if (sets <= lm.mrv) {
        zone = 'near_mrv';
        statusLabel = 'Near MRV';
        statusColor = '#FF9F0A'; // Amber
      } else {
        zone = 'exceeded_mrv';
        statusLabel = 'Over MRV';
        statusColor = '#FF453A'; // Red
      }

      // Percentage relative to MRV (scale ceiling is MRV * 1.15)
      const scaleCeiling = lm.mrv * 1.15;
      const mevPct = Math.round((lm.mev / scaleCeiling) * 100);
      const mavMinPct = Math.round((lm.mavMin / scaleCeiling) * 100);
      const mavMaxPct = Math.round((lm.mavMax / scaleCeiling) * 100);
      const mrvPct = Math.round((lm.mrv / scaleCeiling) * 100);
      const currentPct = Math.min(100, Math.round((sets / scaleCeiling) * 100));

      return {
        ...v,
        landmark: lm,
        zone,
        statusLabel,
        statusColor,
        scaleCeiling,
        mevPct,
        mavMinPct,
        mavMaxPct,
        mrvPct,
        currentPct,
      };
    });
  }, [volumes]);

  // Filter list by region / status
  const filteredData = useMemo(() => {
    if (filterRegion === 'lagging') {
      return processedData.filter(d => d.zone === 'sub_mev');
    }
    if (filterRegion === 'optimal') {
      return processedData.filter(d => d.zone === 'optimal_mav');
    }
    return processedData;
  }, [processedData, filterRegion]);

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#1C1C20' : colors.surface }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="speedometer-outline" size={14} color="#A599FF" />
            <Text style={styles.sectionLabel}>{title}</Text>
          </View>
          <Text style={styles.subtitleText}>{subtitle}</Text>
        </View>

        {/* Legend Pills */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#60A5FA' }]} />
            <Text style={styles.legendText}>MEV</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#30D158' }]} />
            <Text style={styles.legendText}>MAV</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF453A' }]} />
            <Text style={styles.legendText}>MRV</Text>
          </View>
        </View>
      </View>

      {/* Filter Chips Row */}
      <View style={styles.filterTabsRow}>
        {(['all', 'lagging', 'optimal'] as const).map(tab => {
          const isActive = filterRegion === tab;
          const label = tab === 'all' ? 'All Muscles' : tab === 'lagging' ? 'Sub-MEV (Lagging)' : 'Optimal Growth';
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTabBtn, isActive && styles.filterTabBtnActive]}
              onPress={() => {
                hapticSelection();
                setFilterRegion(tab);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Muscle Zone Bars List */}
      <View style={{ gap: 14, marginTop: 4 }}>
        {filteredData.map(item => {
          const isSelected = selectedMuscle === item.muscleGroup;
          const muscleColor = resolveMuscleColor(item.muscleGroup);

          return (
            <TouchableOpacity
              key={item.muscleGroup}
              style={[
                styles.muscleZoneItem,
                isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F2F2F7', borderRadius: RADIUS.md },
              ]}
              onPress={() => {
                hapticLight();
                setSelectedMuscle(prev => (prev === item.muscleGroup ? null : item.muscleGroup));
              }}
              activeOpacity={0.75}
            >
              {/* Row 1: Muscle Name + Current Sets + Status Tag */}
              <View style={styles.barTopRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.muscleDot, { backgroundColor: muscleColor }]} />
                  <Text style={[styles.muscleName, { color: colors.textPrimary }]}>
                    {item.muscleGroup}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.setsDetailText}>
                    {item.directSets}d + {item.synergistSets}s
                  </Text>
                  <Text style={[styles.effectiveSetsNum, { color: item.statusColor }]}>
                    {item.effectiveSets} sets
                  </Text>
                  <View style={[styles.statusTag, { backgroundColor: `${item.statusColor}18`, borderColor: `${item.statusColor}40` }]}>
                    <Text style={[styles.statusTagText, { color: item.statusColor }]}>
                      {item.statusLabel}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Row 2: Visual Multi-Zone Progress Track */}
              <View style={styles.zoneTrackContainer}>
                {/* Zone 1: Sub-MEV (0 to MEV) */}
                <View style={[styles.zoneSection, { flex: item.mevPct, backgroundColor: 'rgba(255,255,255,0.06)' }]} />

                {/* Zone 2: MEV to MAV min */}
                <View style={[styles.zoneSection, { flex: item.mavMinPct - item.mevPct, backgroundColor: 'rgba(96,165,250,0.15)' }]} />

                {/* Zone 3: MAV Optimal Sweet Spot (Green) */}
                <View style={[styles.zoneSection, { flex: item.mavMaxPct - item.mavMinPct, backgroundColor: 'rgba(48,209,88,0.22)' }]} />

                {/* Zone 4: MAV max to MRV (Ceiling Warning) */}
                <View style={[styles.zoneSection, { flex: item.mrvPct - item.mavMaxPct, backgroundColor: 'rgba(255,159,10,0.18)' }]} />

                {/* Zone 5: Over MRV (Red Danger) */}
                <View style={[styles.zoneSection, { flex: 100 - item.mrvPct, backgroundColor: 'rgba(255,69,58,0.18)' }]} />

                {/* Current Sets Active Fill Bar */}
                <View
                  style={[
                    styles.currentSetsFill,
                    {
                      width: `${item.currentPct}%`,
                      backgroundColor: item.statusColor,
                    },
                  ]}
                />

                {/* Landmark Pin Indicator for MEV */}
                <View style={[styles.landmarkMarker, { left: `${item.mevPct}%` }]}>
                  <View style={[styles.landmarkMarkerTick, { backgroundColor: '#60A5FA' }]} />
                </View>

                {/* Landmark Pin Indicator for MRV */}
                <View style={[styles.landmarkMarker, { left: `${item.mrvPct}%` }]}>
                  <View style={[styles.landmarkMarkerTick, { backgroundColor: '#FF453A' }]} />
                </View>
              </View>

              {/* Row 3: Subtitle Guide Labels under bar */}
              <View style={styles.landmarkLabelsRow}>
                <Text style={styles.landmarkLabelText}>0s</Text>
                <Text style={[styles.landmarkLabelText, { color: '#60A5FA' }]}>
                  MEV: {item.landmark.mev}s
                </Text>
                <Text style={[styles.landmarkLabelText, { color: '#30D158' }]}>
                  MAV: {item.landmark.mavMin}–{item.landmark.mavMax}s
                </Text>
                <Text style={[styles.landmarkLabelText, { color: '#FF453A' }]}>
                  MRV: {item.landmark.mrv}s
                </Text>
              </View>

              {/* Interactive Expanded Coaching Card */}
              {isSelected && (
                <View style={styles.expandedInfoBox}>
                  <View style={styles.expandedMetricRow}>
                    <View style={styles.expandedMetricItem}>
                      <Text style={styles.expandedMetricLabel}>DIRECT STIMULUS</Text>
                      <Text style={styles.expandedMetricVal}>{item.directSets} sets</Text>
                    </View>
                    <View style={styles.expandedMetricItem}>
                      <Text style={styles.expandedMetricLabel}>SYNERGIST LOAD</Text>
                      <Text style={styles.expandedMetricVal}>{item.synergistSets} sets (0.5x)</Text>
                    </View>
                    <View style={styles.expandedMetricItem}>
                      <Text style={styles.expandedMetricLabel}>RECOVERY CEILING</Text>
                      <Text style={[styles.expandedMetricVal, { color: '#FF453A' }]}>
                        {item.landmark.mrv} sets max
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.coachingTipText}>
                    {item.zone === 'sub_mev'
                      ? `⚡ Under-stimulated: Add ${item.landmark.mev - item.effectiveSets} more sets next cycle to enter progressive hypertrophy threshold.`
                      : item.zone === 'optimal_mav'
                      ? `🎯 Prime Hypertrophy Zone: Maintain this ${item.effectiveSets} set volume to maximize progressive overload without systemic burnout.`
                      : item.zone === 'mev_mav'
                      ? `📈 Maintenance Volume: Sufficient for muscle retention; add 2–3 sets if targeting growth acceleration.`
                      : `⚠️ Approaching Recovery Limit: High fatigue accumulation detected. Consider capping volume or taking a scheduled deload.`}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

export default VolumeZoneRadarBar;

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    padding: 16,
    marginBottom: SPACE.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#A599FF',
  },
  subtitleText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendText: {
    fontFamily: FONT_FAMILY.mono,
    fontSize: 9.5,
    color: '#8E8E93',
  },

  // Filter Tabs
  filterTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  filterTabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  filterTabBtnActive: {
    backgroundColor: 'rgba(165,153,255,0.15)',
    borderColor: 'rgba(165,153,255,0.4)',
  },
  filterTabText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#8E8E93',
  },
  filterTabTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#A599FF',
  },

  // Muscle Zone Item
  muscleZoneItem: {
    paddingVertical: 2,
  },
  barTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  muscleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  muscleName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
  },
  setsDetailText: {
    fontFamily: FONT_FAMILY.mono,
    fontSize: 10,
    color: '#8E8E93',
  },
  effectiveSetsNum: {
    fontFamily: FONT_FAMILY.mono,
    fontSize: 12,
    fontWeight: '700',
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  statusTagText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9,
    textTransform: 'uppercase',
  },

  // Multi-Zone Track
  zoneTrackContainer: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  },
  zoneSection: {
    height: '100%',
  },
  currentSetsFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  landmarkMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    zIndex: 2,
  },
  landmarkMarkerTick: {
    width: 2,
    height: '100%',
    opacity: 0.8,
  },

  // Guide Labels under track
  landmarkLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  landmarkLabelText: {
    fontFamily: FONT_FAMILY.mono,
    fontSize: 9,
    color: '#636366',
  },

  // Expanded Info Box
  expandedInfoBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  expandedMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  expandedMetricItem: {
    alignItems: 'center',
  },
  expandedMetricLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 8.5,
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  expandedMetricVal: {
    fontFamily: FONT_FAMILY.mono,
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 2,
  },
  coachingTipText: {
    fontFamily: FONT_FAMILY.body,
    fontSize: 11,
    color: '#D1D1D6',
    lineHeight: 16,
  },
});
