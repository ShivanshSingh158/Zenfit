/**
 * GymProgressScreen.tsx — ZenFit
 *
 * Tab 4: 🧬 Body (Physical Body & Recovery Hub)
 * Clean Apple iOS Inset Grouped Card Architecture on pure #000000 canvas.
 * - Section 1: Muscle Recovery & Fatigue Map (AnatomicalBodyMapCard default to fatigue)
 * - Section 2: Weight & Body Composition (Inline Start / Current / Change, BMI, Target Progress & Trend Curve)
 * - Section 3: Physique Transformation (Interactive Before/After Photo Slider)
 * - Header Actions: [⚖️ Weigh-In] & [⚙️ Settings/GymProfile]
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { hapticLight } from '../../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useGymLogs, useBodyMetrics } from '../../contexts/domains/WellnessContext';
import { useGymProfile } from '../../hooks/useGymProfile';
import { BOOT_KEYS, getL1Sync } from '../../utils/bootManifest';
import { useTheme } from '../../contexts/ThemeContext';
import { FONT_FAMILY } from '../../theme/tokens';
import { GymNavigationParamList } from '../../types/gym.types';

import AnatomicalBodyMapCard from '../../components/Gym/metrics/AnatomicalBodyMapCard';
import VolumeZoneRadarBar, { MuscleVolumeEntry } from '../../components/Gym/metrics/VolumeZoneRadarBar';
import StructuralBalanceCard from '../../components/Gym/metrics/StructuralBalanceCard';
import { calculateMacroVolumeLoad, MuscleSlug } from '../../services/muscleRecoveryService';
import BodyMetricsHistoryChart, { WeightChartEntry } from '../../components/Gym/metrics/BodyMetricsHistoryChart';
import BodyMetricsSheet from '../../components/Gym/metrics/BodyMetricsSheet';
import BeforeAfterSlider from '../../components/Gym/metrics/BeforeAfterSlider';

const WEIGHT_LOGS_KEY = BOOT_KEYS.WEIGHT_LOGS;
const LEGACY_WEIGHT_LOGS_KEY = 'zentrack_weight_logs_v1';

function classifyBMI(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: '#60A5FA' };
  if (bmi < 25) return { label: 'Normal', color: '#30D158' };
  if (bmi < 30) return { label: 'Overweight', color: '#FF9F0A' };
  return { label: 'Obese', color: '#FF453A' };
}

export default function GymProgressScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<GymNavigationParamList>>();
  const { gymLogs } = useGymLogs();
  const { weightLogs: contextWeightLogs } = useBodyMetrics();
  const { gymProfile } = useGymProfile();

  const [showWeighInSheet, setShowWeighInSheet] = useState(false);
  const [metricsSheetTab, setMetricsSheetTab] = useState<'weight' | 'photo'>('weight');
  const [localWeightLogs, setLocalWeightLogs] = useState<any[]>(() =>
    getL1Sync<any[]>(WEIGHT_LOGS_KEY, null) || getL1Sync<any[]>(LEGACY_WEIGHT_LOGS_KEY, [])
  );

  const prevSheetOpenRef = React.useRef(false);

  useEffect(() => {
    // Only re-read storage on initial mount or when sheet transitions from open -> closed
    const shouldRead = !prevSheetOpenRef.current || (prevSheetOpenRef.current && !showWeighInSheet);
    if (shouldRead) {
      AsyncStorage.getItem(WEIGHT_LOGS_KEY).then(raw => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) setLocalWeightLogs(parsed);
          } catch (_) {}
        } else {
          AsyncStorage.getItem(LEGACY_WEIGHT_LOGS_KEY).then(legacyRaw => {
            if (!legacyRaw) return;
            try {
              const parsed = JSON.parse(legacyRaw);
              if (Array.isArray(parsed)) setLocalWeightLogs(parsed);
            } catch (_) {}
          });
        }
      });
    }
    prevSheetOpenRef.current = showWeighInSheet;
  }, [showWeighInSheet]);

  // Unified chronological weight & photo history (contextWeightLogs first, localWeightLogs second so fresh edits win)
  const { combinedLogs, chartEntries, photoEntries } = useMemo(() => {
    const map = new Map<string, { date: string; weight: number; photoUrl?: string | null }>();
    (contextWeightLogs || []).forEach((l: any) => {
      const w = Number(l.weightKg ?? l.weight);
      if (l.date && w > 0) map.set(l.date, { date: l.date, weight: w, photoUrl: l.photoUrl });
    });
    localWeightLogs.forEach(l => {
      const w = Number(l.weightKg ?? l.weight);
      const existing = map.get(l.date);
      if (l.date && w > 0) {
        map.set(l.date, { date: l.date, weight: w, photoUrl: l.photoUrl || existing?.photoUrl });
      }
    });

    // Oldest -> Newest
    const chrono = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    const last10: WeightChartEntry[] = chrono.slice(-10).map(l => ({ weight: l.weight, date: l.date }));
    const photos = chrono.filter(l => Boolean(l.photoUrl)) as { date: string; weight: number; photoUrl: string }[];

    return {
      combinedLogs: chrono,
      chartEntries: last10,
      photoEntries: photos,
    };
  }, [localWeightLogs, contextWeightLogs]);

  const startWeight = combinedLogs[0]?.weight ?? gymProfile.weightKg ?? null;
  const currentWeight = combinedLogs[combinedLogs.length - 1]?.weight ?? gymProfile.weightKg ?? null;
  const weightDelta =
    currentWeight && startWeight ? parseFloat((currentWeight - startWeight).toFixed(1)) : 0;

  const heightCm = gymProfile.heightCm ?? null;
  const bmi =
    currentWeight && heightCm && heightCm > 0
      ? Math.round((currentWeight / Math.pow(heightCm / 100, 2)) * 10) / 10
      : null;
  const bmiClass = bmi ? classifyBMI(bmi) : null;

  // Fixed field name matching gym.types.ts (supports both targetBodyweightKg and legacy targetWeightKg)
  const targetWeight =
    gymProfile.targetBodyweightKg ?? (gymProfile as any).targetWeightKg ?? null;
  const targetProgress =
    currentWeight && targetWeight && startWeight && startWeight !== targetWeight
      ? Math.min(Math.max((currentWeight - startWeight) / (targetWeight - startWeight), 0), 1)
      : null;

  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const separatorColor = isDark ? 'rgba(84, 84, 88, 0.36)' : 'rgba(60, 60, 67, 0.18)';

  const weeklyMuscleVolumes = useMemo<MuscleVolumeEntry[]>(() => {
    const macro = calculateMacroVolumeLoad(gymLogs, 7);
    const groups: { name: string; slugs: MuscleSlug[] }[] = [
      { name: 'Chest', slugs: ['chest'] },
      { name: 'Back', slugs: ['upper-back', 'serratus'] },
      { name: 'Shoulders', slugs: ['deltoids'] },
      { name: 'Quads', slugs: ['quadriceps'] },
      { name: 'Hamstrings', slugs: ['hamstring'] },
      { name: 'Glutes', slugs: ['gluteal'] },
      { name: 'Biceps', slugs: ['biceps'] },
      { name: 'Triceps', slugs: ['triceps'] },
      { name: 'Calves', slugs: ['calves', 'tibialis'] },
      { name: 'Abs', slugs: ['abs', 'obliques'] },
      { name: 'Traps', slugs: ['trapezius'] },
      { name: 'Forearms', slugs: ['forearm'] },
    ];

    return groups.map(g => {
      let sets = 0;
      for (const slug of g.slugs) {
        if (macro[slug]) sets += macro[slug].sets;
      }
      const direct = Math.round(sets * 0.7);
      const synergist = Math.round(sets * 0.3);
      return {
        muscleGroup: g.name,
        directSets: direct,
        synergistSets: synergist,
        effectiveSets: sets,
      };
    });
  }, [gymLogs]);

  const bodyMapStyle = useMemo(
    () => [styles.iosCard, { backgroundColor: cardBg, borderWidth: 0 }],
    [styles.iosCard, cardBg]
  );

  const historyChartStyles = useMemo(
    () => ({
      sectionCard: [styles.iosCard, { backgroundColor: cardBg }],
      cardHeaderRow: styles.chartHeaderRow,
      sectionTitle: [styles.chartTitle, { color: colors.textPrimary }],
      badgeText: styles.chartBadge,
      chartContainer: { alignItems: 'center' as const, marginVertical: 4 },
      metricLabel: { color: '#8E8E93' },
    }),
    [styles, cardBg, colors.textPrimary]
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: isDark ? '#000000' : colors.background }]} edges={['top']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* ── Native Apple iOS Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.largeTitle, { color: colors.textPrimary }]}>Body</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {currentWeight ? `${currentWeight} kg` : 'Body Hub'}
            {bmi ? ` · BMI ${bmi} (${bmiClass?.label})` : ''}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              setMetricsSheetTab('weight');
              setShowWeighInSheet(true);
            }}
            style={[styles.weighInBtn, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}
            activeOpacity={0.8}
          >
            <Ionicons name="scale-outline" size={13} color={isDark ? '#000000' : '#FFFFFF'} />
            <Text style={[styles.weighInBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>+ Weigh In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              hapticLight();
              navigation.navigate('GymProfile');
            }}
            style={[styles.settingsIconBtn, { backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA' }]}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={18} color={isDark ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── SECTION 1: MUSCLE STATUS & RECOVERY ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderLabel}>MUSCLE STATUS & RECOVERY</Text>
          <Text style={styles.sectionBadgeText}>THIS WEEK</Text>
        </View>

        <AnatomicalBodyMapCard
          gymLogs={gymLogs}
          bodyGender={gymProfile.gender === 'female' ? 'female' : 'male'}
          variant="weekly"
          defaultMode="fatigue"
          style={bodyMapStyle}
          onAddCorrectiveExercise={(exerciseName) => {
            navigation.navigate('Today' as any);
          }}
        />

        {/* ── SECTION 2: WEIGHT & BODY COMPOSITION ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderLabel}>WEIGHT & COMPOSITION</Text>
        </View>

        <View style={[styles.iosCard, { backgroundColor: cardBg }]}>
          {/* 3-Column KPI Strip */}
          <View style={styles.weightKpiRow}>
            <View style={styles.weightKpiCol}>
              <Text style={styles.kpiLabel}>START</Text>
              <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>
                {startWeight ? `${startWeight}` : '—'}
                <Text style={styles.kpiUnit}> kg</Text>
              </Text>
            </View>

            <View style={[styles.verticalHairline, { backgroundColor: separatorColor }]} />

            <View style={styles.weightKpiCol}>
              <Text style={styles.kpiLabel}>CURRENT</Text>
              <Text style={[styles.kpiValue, { color: '#A599FF' }]}>
                {currentWeight ? `${currentWeight}` : '—'}
                <Text style={styles.kpiUnit}> kg</Text>
              </Text>
            </View>

            <View style={[styles.verticalHairline, { backgroundColor: separatorColor }]} />

            <View style={styles.weightKpiCol}>
              <Text style={styles.kpiLabel}>CHANGE</Text>
              <Text
                style={[
                  styles.kpiValue,
                  {
                    color:
                      weightDelta === 0
                        ? colors.textPrimary
                        : weightDelta < 0
                        ? '#30D158'
                        : '#FF9F0A',
                  },
                ]}
              >
                {currentWeight && startWeight
                  ? `${weightDelta > 0 ? `+${weightDelta}` : weightDelta}`
                  : '—'}
                <Text style={styles.kpiUnit}> kg</Text>
              </Text>
            </View>
          </View>

          {/* Hairline Divider + BMI & Height Row */}
          {bmi && bmiClass ? (
            <>
              <View style={[styles.horizontalHairline, { backgroundColor: separatorColor }]} />
              <View style={styles.bmiInlineRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.bmiTitle, { color: colors.textPrimary }]}>BMI {bmi}</Text>
                  <View style={[styles.bmiTag, { backgroundColor: `${bmiClass.color}20` }]}>
                    <Text style={[styles.bmiTagText, { color: bmiClass.color }]}>{bmiClass.label}</Text>
                  </View>
                </View>
                <Text style={styles.bmiMetaText}>
                  {heightCm ? `${heightCm} cm` : ''}
                  {targetWeight ? ` · Goal: ${targetWeight} kg` : ''}
                </Text>
              </View>
            </>
          ) : null}

          {/* Target Weight Progress Bar */}
          {targetProgress !== null && (
            <View style={{ marginTop: 12 }}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressLabel}>Goal Progress</Text>
                <Text style={styles.progressPercent}>{Math.round(targetProgress * 100)}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round(targetProgress * 100)}%` },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* Inline Weight Trend SVG Chart (if 2+ entries exist) */}
        {chartEntries.length >= 2 && (
          <View style={{ marginTop: 2, marginBottom: 12 }}>
            <BodyMetricsHistoryChart
              entries={chartEntries}
              styles={historyChartStyles}
              colors={colors}
              isDark={isDark}
            />
          </View>
        )}

        {/* ── SECTION 3: PHYSIQUE TRANSFORMATION (BEFORE / AFTER) ── */}
        <View style={[styles.sectionHeaderRow, { marginTop: 8 }]}>
          <Text style={styles.sectionHeaderLabel}>PHYSIQUE TRANSFORMATION</Text>
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              setMetricsSheetTab('photo');
              setShowWeighInSheet(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionActionText}>+ Add Photo</Text>
          </TouchableOpacity>
        </View>

        {photoEntries.length >= 2 ? (
          <View style={[styles.iosCard, { backgroundColor: cardBg, padding: 12 }]}>
            <BeforeAfterSlider
              beforeImage={photoEntries[0].photoUrl}
              afterImage={photoEntries[photoEntries.length - 1].photoUrl}
            />
            <View style={styles.photoDatesRow}>
              <Text style={styles.photoDateLabel}>
                Before: {photoEntries[0].date} ({photoEntries[0].weight} kg)
              </Text>
              <Text style={styles.photoDateLabel}>
                Latest: {photoEntries[photoEntries.length - 1].date} ({photoEntries[photoEntries.length - 1].weight} kg)
              </Text>
            </View>
          </View>
        ) : photoEntries.length === 1 ? (
          <View style={[styles.iosCard, { backgroundColor: cardBg, padding: 12 }]}>
            <View style={{ height: 260, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1C1C1E' }}>
              <Image source={{ uri: photoEntries[0].photoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <Text style={styles.photoDateLabel}>
                Baseline Photo · {photoEntries[0].date} ({photoEntries[0].weight} kg)
              </Text>
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  setMetricsSheetTab('photo');
                  setShowWeighInSheet(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 12, color: '#A599FF' }}>+ Add Comparison</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              hapticLight();
              setMetricsSheetTab('photo');
              setShowWeighInSheet(true);
            }}
            style={[styles.iosCard, styles.emptyPhotoCard, { backgroundColor: cardBg }]}
          >
            <Ionicons name="camera-outline" size={26} color="#8E8E93" />
            <Text style={[styles.emptyPhotoTitle, { color: colors.textPrimary }]}>
              Log Check-In Photos
            </Text>
            <Text style={styles.emptyPhotoSub}>
              Attach front, side, or back photos over time to unlock the interactive Before & After slider.
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Weigh-In & Photo Input Bottom Sheet */}
      {showWeighInSheet && (
        <BodyMetricsSheet
          visible={showWeighInSheet}
          initialTab={metricsSheetTab}
          onClose={() => setShowWeighInSheet(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  largeTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 22,
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weighInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 999,
  },
  weighInBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  settingsIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 6,
    paddingBottom: 110,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
    marginTop: 6,
  },
  sectionHeaderLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8E8E93',
    letterSpacing: 0.6,
  },
  sectionActionText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#A599FF',
  },
  sectionBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#30D158',
    letterSpacing: 0.5,
  },
  iosCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  weightKpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weightKpiCol: {
    flex: 1,
    alignItems: 'center',
  },
  verticalHairline: {
    width: StyleSheet.hairlineWidth,
    height: 34,
  },
  horizontalHairline: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    marginVertical: 12,
  },
  kpiLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    letterSpacing: -0.4,
  },
  kpiUnit: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: '#8E8E93',
  },
  bmiInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bmiTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
  },
  bmiTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bmiTagText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
  },
  bmiMetaText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12.5,
    color: '#8E8E93',
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11.5,
    color: '#8E8E93',
  },
  progressPercent: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#30D158',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2C2C2E',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#30D158',
    borderRadius: 3,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
  },
  chartBadge: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#A599FF',
  },
  photoDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  photoDateLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8E8E93',
  },
  emptyPhotoCard: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  emptyPhotoTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    marginTop: 4,
  },
  emptyPhotoSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12.5,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});
