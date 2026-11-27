/**
 * GymProgressScreen.tsx — ZenFit
 *
 * Tab 4: Body (Physical Body & Recovery Hub)
 * Clean OLED card architecture on Canvas (#09090B).
 * - Section 1: Muscle Recovery & Fatigue Map (AnatomicalBodyMapCard default to fatigue)
 * - Section 2: Weight & Body Composition (Inline Start / Current / Change, BMI, Target Progress & Trend Curve)
 * - Section 3: Physique Transformation (Interactive Before/After Photo Slider)
 * - Header Actions: [Weigh-In] & [Settings/GymProfile]
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Scale, Settings, Camera, Plus } from 'lucide-react-native';
import { hapticLight } from '../../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useGymLogs, useBodyMetrics } from '../../contexts/domains/WellnessContext';
import { useGymProfile } from '../../hooks/useGymProfile';
import { formatWeight, kgToDisplay, unitLabel, useWeightUnit } from '../../utils/weightUnit';
import { BOOT_KEYS, getL1Sync, isL1BootHydrated } from '../../utils/bootManifest';
import { LazySheet } from '../../hooks/useLazySheetMount';
import { useTheme } from '../../contexts/ThemeContext';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../theme/tokens';
import { useResponsiveMetrics } from '../../theme/responsive';
import {
  ScreenWrapper,
  TabScreenHeader,
  TactileButton,
  NumericText,
} from '../../components/ui';
import { RollingNumber } from '../../components/ui/RollingNumber';
import { AnimatedProgressBar } from '../../components/ui/AnimatedProgressBar';
import { useScreenReplayTrigger } from '../../hooks/useScreenReplayTrigger';
import { GymNavigationParamList } from '../../types/gym.types';

import AnatomicalBodyMapCard from '../../components/Gym/metrics/AnatomicalBodyMapCard';
import BodyMetricsHistoryChart, { WeightChartEntry } from '../../components/Gym/metrics/BodyMetricsHistoryChart';
const BodyMetricsSheet = React.lazy(() => import('../../components/Gym/metrics/BodyMetricsSheet'));
import BeforeAfterSlider from '../../components/Gym/metrics/BeforeAfterSlider';

const WEIGHT_LOGS_KEY = BOOT_KEYS.WEIGHT_LOGS;
const LEGACY_WEIGHT_LOGS_KEY = 'zentrack_weight_logs_v1';

function classifyBMI(bmi: number, tokens: ThemeTokens): { label: string; color: string; bg: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: tokens.status.info, bg: tokens.status.infoDim };
  if (bmi < 25) return { label: 'Normal', color: tokens.status.success, bg: tokens.status.successDim };
  if (bmi < 30) return { label: 'Overweight', color: tokens.status.warning, bg: tokens.status.warningDim };
  return { label: 'Obese', color: tokens.status.danger, bg: tokens.status.dangerDim };
}

export default function GymProgressScreen() {
  const { colors, isDark, tokens } = useTheme();
  const { bodyMapHeight } = useResponsiveMetrics();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const navigation = useNavigation<NativeStackNavigationProp<GymNavigationParamList>>();
  const { gymLogs } = useGymLogs();
  const { weightLogs: contextWeightLogs } = useBodyMetrics();
  const { gymProfile } = useGymProfile();
  const unitIsLbs = useWeightUnit();
  const weightUnitStr = unitLabel(unitIsLbs);
  const { replayKey } = useScreenReplayTrigger();

  const [showWeighInSheet, setShowWeighInSheet] = useState(false);
  const [metricsSheetTab, setMetricsSheetTab] = useState<'weight' | 'photo'>('weight');
  const [selectedPhotoPose, setSelectedPhotoPose] = useState<'all' | 'front' | 'side' | 'back'>('all');
  const [localWeightLogs, setLocalWeightLogs] = useState<any[]>(() =>
    getL1Sync<any[]>(WEIGHT_LOGS_KEY, null) || getL1Sync<any[]>(LEGACY_WEIGHT_LOGS_KEY, [])
  );

  const prevSheetOpenRef = React.useRef(false);

  useEffect(() => {
    const justClosedSheet = prevSheetOpenRef.current && !showWeighInSheet;
    const shouldRead = justClosedSheet || (!prevSheetOpenRef.current && !isL1BootHydrated());
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

  // Unified weight & check-in photo history:
  // - Weigh-ins deduplicated per calendar date so multiple check-in poses don't skew charts.
  // - Check-in photos keyed by id / date+pose so same-day front/side/back photos stay intact.
  const { combinedLogs, chartEntries, photoEntries } = useMemo(() => {
    const weightMap = new Map<string, { date: string; weight: number }>();
    const photoMap = new Map<string, { id: string; date: string; weight: number; photoUrl: string; pose: 'front' | 'side' | 'back' }>();

    const ingest = (list: any[]) => {
      for (const l of list || []) {
        if (!l?.date) continue;
        const w = Number(l.weightKg ?? l.weight);
        if (Number.isFinite(w) && w > 0) {
          const existingW = weightMap.get(l.date);
          if (!existingW || (l as any).entryType !== 'photo') {
            weightMap.set(l.date, { date: l.date, weight: w });
          }
        }
        const photoUri = l.photoUrl || l.localPhotoUri;
        if (photoUri) {
          const pose: 'front' | 'side' | 'back' =
            l.pose === 'side' || l.pose === 'back' ? l.pose : 'front';
          const photoKey = l.id && String(l.id).includes('_photo_')
            ? String(l.id)
            : `${l.date}_${pose}`;
          photoMap.set(photoKey, {
            id: l.id || photoKey,
            date: l.date,
            weight: Number.isFinite(w) && w > 0 ? w : 0,
            photoUrl: String(photoUri),
            pose,
          });
        }
      }
    };

    ingest(contextWeightLogs || []);
    ingest(localWeightLogs || []);

    const chrono = Array.from(weightMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    const chartData: WeightChartEntry[] = chrono.slice(-90).map(l => ({ weight: l.weight, date: l.date }));
    const photos = Array.from(photoMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date) || a.pose.localeCompare(b.pose)
    );

    return {
      combinedLogs: chrono,
      chartEntries: chartData,
      photoEntries: photos,
    };
  }, [localWeightLogs, contextWeightLogs]);

  const filteredPhotoEntries = useMemo(() => {
    if (selectedPhotoPose === 'all') return photoEntries;
    return photoEntries.filter(p => p.pose === selectedPhotoPose);
  }, [photoEntries, selectedPhotoPose]);

  const availablePhotoPoses = useMemo(() => {
    const poses = new Set(photoEntries.map(p => p.pose));
    return poses;
  }, [photoEntries]);

  const startWeight = combinedLogs[0]?.weight ?? gymProfile.weightKg ?? null;
  const currentWeight = combinedLogs[combinedLogs.length - 1]?.weight ?? gymProfile.weightKg ?? null;
  const weightDelta =
    currentWeight && startWeight ? parseFloat((currentWeight - startWeight).toFixed(1)) : 0;

  const dispStartWeight = startWeight ? kgToDisplay(startWeight, unitIsLbs, 1) : null;
  const dispCurrentWeight = currentWeight ? kgToDisplay(currentWeight, unitIsLbs, 1) : null;
  const dispWeightDelta =
    dispCurrentWeight !== null && dispStartWeight !== null
      ? Math.round((dispCurrentWeight - dispStartWeight) * 10) / 10
      : 0;

  const heightCm = gymProfile.heightCm ?? null;
  const bmi =
    currentWeight && heightCm && heightCm > 0
      ? Math.round((currentWeight / Math.pow(heightCm / 100, 2)) * 10) / 10
      : null;
  const bmiClass = bmi ? classifyBMI(bmi, tokens) : null;

  // Fixed field name matching gym.types.ts (supports both targetBodyweightKg and legacy targetWeightKg)
  const targetWeight =
    gymProfile.targetBodyweightKg ?? (gymProfile as any).targetWeightKg ?? null;
  const targetProgress =
    currentWeight && targetWeight && startWeight && startWeight !== targetWeight
      ? Math.min(Math.max((currentWeight - startWeight) / (targetWeight - startWeight), 0), 1)
      : null;

  const weightDeltaColor = useMemo(() => {
    if (dispWeightDelta === 0) return tokens.text.primary;
    if (targetWeight != null && startWeight != null && targetWeight !== startWeight) {
      const wantsGain = targetWeight > startWeight;
      const movedInGoalDir = wantsGain ? dispWeightDelta > 0 : dispWeightDelta < 0;
      return movedInGoalDir ? tokens.status.success : tokens.status.warning;
    }
    const g = String(gymProfile.goal || gymProfile.primaryGoal || '').toLowerCase();
    const isBulkGoal = g.includes('hypertrophy') || g.includes('strength') || g.includes('bulk');
    if (isBulkGoal) {
      return dispWeightDelta > 0 ? tokens.status.success : tokens.accent.primary;
    }
    return dispWeightDelta < 0 ? tokens.status.success : tokens.status.warning;
  }, [dispWeightDelta, targetWeight, startWeight, gymProfile.goal, gymProfile.primaryGoal, tokens]);

  const bodyMapStyle = useMemo(
    () => [styles.iosCard],
    [styles.iosCard]
  );

  const historyChartStyles = useMemo(
    () => ({
      sectionCard: [styles.iosCard],
      cardHeaderRow: styles.chartHeaderRow,
      sectionTitle: styles.chartTitle,
      badgeText: styles.chartBadge,
      chartContainer: { alignItems: 'center' as const, marginVertical: SPACE[4] },
      metricLabel: { color: tokens.text.secondary },
    }),
    [styles, tokens.text.secondary]
  );

  return (
    <ScreenWrapper edges={['top']} compactTop topAura keyboardAvoiding={false}>
      {/* ── Unified Screen Header ── */}
      <TabScreenHeader
        title="Body"
        subtitle={`${dispCurrentWeight ? `${dispCurrentWeight} ${weightUnitStr}` : 'Body Hub'}${bmi ? ` · BMI ${bmi} (${bmiClass?.label})` : ''}`}
        rightActions={
          <>
            <TactileButton
              variant="primary"
              size="sm"
              onPress={() => {
                hapticLight();
                setMetricsSheetTab('weight');
                setShowWeighInSheet(true);
              }}
              style={styles.weighInBtn}
            >
              <Scale size={14} color={tokens.accent.onPrimary} strokeWidth={ICON.strokeWidth} />
              <Text style={styles.weighInBtnText}>Weigh In</Text>
            </TactileButton>

            <TactileButton
              variant="icon"
              size="sm"
              onPress={() => {
                hapticLight();
                navigation.navigate('GymProfile');
              }}
              hitSlop={TOUCH.hitSlop}
              style={styles.settingsIconBtn}
              accessibilityLabel="Profile and Settings"
            >
              <Settings size={16} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
            </TactileButton>
          </>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── SECTION 1: MUSCLE STATUS & RECOVERY ── */}
        <View style={[styles.sectionHeaderRow, { marginTop: 4 }]}>
          <Text style={styles.sectionHeaderLabel}>MUSCLE STATUS & RECOVERY</Text>
          <Text style={styles.sectionBadgeText}>THIS WEEK</Text>
        </View>

        <AnatomicalBodyMapCard
          gymLogs={gymLogs}
          bodyGender={gymProfile.gender === 'female' ? 'female' : 'male'}
          variant="weekly"
          defaultMode="fatigue"
          style={bodyMapStyle}
        />

        {/* ── SECTION 2: WEIGHT & BODY COMPOSITION ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderLabel}>WEIGHT & COMPOSITION</Text>
        </View>

        <View style={styles.iosCard}>
          {/* 3-Column KPI Strip */}
          <View style={styles.weightKpiRow}>
            <View style={styles.weightKpiCol}>
              <Text style={styles.kpiLabel}>START</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                {dispStartWeight ? (
                  <RollingNumber
                    value={dispStartWeight}
                    replayKey={replayKey}
                    cycles={1}
                    durationMs={520}
                    style={[styles.kpiValue, { color: tokens.text.primary }]}
                  />
                ) : (
                  <NumericText style={[styles.kpiValue, { color: tokens.text.primary }]}>—</NumericText>
                )}
                <Text style={styles.kpiUnit}> {weightUnitStr}</Text>
              </View>
            </View>

            <View style={styles.verticalHairline} />

            <View style={styles.weightKpiCol}>
              <Text style={styles.kpiLabel}>CURRENT</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                {dispCurrentWeight ? (
                  <RollingNumber
                    value={dispCurrentWeight}
                    replayKey={replayKey}
                    cycles={1}
                    durationMs={560}
                    style={[styles.kpiValue, { color: tokens.accent.primary }]}
                  />
                ) : (
                  <NumericText style={[styles.kpiValue, { color: tokens.accent.primary }]}>—</NumericText>
                )}
                <Text style={styles.kpiUnit}> {weightUnitStr}</Text>
              </View>
            </View>

            <View style={styles.verticalHairline} />

            <View style={styles.weightKpiCol}>
              <Text style={styles.kpiLabel}>CHANGE</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                {dispCurrentWeight && dispStartWeight ? (
                  <RollingNumber
                    value={dispWeightDelta}
                    prefix={dispWeightDelta > 0 ? '+' : ''}
                    replayKey={replayKey}
                    cycles={0}
                    durationMs={480}
                    style={[
                      styles.kpiValue,
                      {
                        color: weightDeltaColor,
                      },
                    ]}
                  />
                ) : (
                  <NumericText
                    style={[
                      styles.kpiValue,
                      {
                        color: weightDeltaColor,
                      },
                    ]}
                  >
                    —
                  </NumericText>
                )}
                <Text style={styles.kpiUnit}> {weightUnitStr}</Text>
              </View>
            </View>
          </View>

          {/* Hairline Divider + BMI & Height Row */}
          {bmi && bmiClass ? (
            <>
              <View style={styles.horizontalHairline} />
              <View style={styles.bmiInlineRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE[8] }}>
                  <NumericText style={styles.bmiTitle}>BMI {bmi}</NumericText>
                  <View style={[styles.bmiTag, { backgroundColor: bmiClass.bg }]}>
                    <Text style={[styles.bmiTagText, { color: bmiClass.color }]}>{bmiClass.label}</Text>
                  </View>
                </View>
                <NumericText style={styles.bmiMetaText}>
                  {heightCm ? `${heightCm} cm` : ''}
                  {targetWeight ? ` · Goal: ${formatWeight(targetWeight, unitIsLbs, 1)}` : ''}
                </NumericText>
              </View>
            </>
          ) : null}

          {/* Target Weight Progress Bar */}
          {targetProgress !== null && (
            <View style={{ marginTop: SPACE[12] }}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressLabel}>Goal Progress</Text>
                <RollingNumber
                  value={Math.round(targetProgress * 100)}
                  suffix="%"
                  replayKey={replayKey}
                  cycles={1}
                  durationMs={520}
                  style={styles.progressPercent}
                />
              </View>
              <AnimatedProgressBar
                progress={targetProgress}
                height={7}
                borderRadius={RADIUS.full}
                durationMs={560}
                replayKey={replayKey}
                color={tokens.accent.primary}
                trackColor={tokens.bg.elevated}
              />
            </View>
          )}
        </View>

        {/* Inline Weight Trend SVG Chart (if 2+ entries exist) */}
        {chartEntries.length >= 2 && (
          <View style={{ marginTop: 2, marginBottom: SPACE[12] }}>
            <BodyMetricsHistoryChart
              entries={chartEntries}
              styles={historyChartStyles}
              colors={colors}
              isDark={isDark}
              replayKey={replayKey}
            />
          </View>
        )}

        {/* ── SECTION 3: PHYSIQUE TRANSFORMATION (BEFORE / AFTER) ── */}
        <View style={[styles.sectionHeaderRow, { marginTop: SPACE[8] }]}>
          <Text style={styles.sectionHeaderLabel}>PHYSIQUE TRANSFORMATION</Text>
          <TactileButton
            variant="secondary"
            size="xs"
            onPress={() => {
              hapticLight();
              setMetricsSheetTab('photo');
              setShowWeighInSheet(true);
            }}
            style={styles.sectionActionBtn}
          >
            <Plus size={12} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
            <Text style={styles.sectionActionText}>Add Photo</Text>
          </TactileButton>
        </View>

        {photoEntries.length > 0 && availablePhotoPoses.size > 1 && (
          <View style={{ flexDirection: 'row', gap: SPACE[8], marginBottom: SPACE[10], paddingHorizontal: SPACE[4] }}>
            {(['all', 'front', 'side', 'back'] as const)
              .filter(p => p === 'all' || availablePhotoPoses.has(p))
              .map(poseKey => {
                const isSel = selectedPhotoPose === poseKey;
                return (
                  <TactileButton
                    key={poseKey}
                    variant="custom"
                    haptic="selection"
                    onPress={() => setSelectedPhotoPose(poseKey)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: RADIUS.sm,
                      backgroundColor: isSel ? tokens.accent.primary : (tokens.isDark ? 'rgba(255,255,255,0.06)' : tokens.bg.elevated),
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: isSel ? FONT_FAMILY.bold : FONT_FAMILY.medium,
                        fontSize: 11.5,
                        color: isSel ? tokens.accent.onPrimary : tokens.text.secondary,
                      }}
                    >
                      {poseKey.toUpperCase()}
                    </Text>
                  </TactileButton>
                );
              })}
          </View>
        )}

        {filteredPhotoEntries.length >= 2 ? (
          <View style={[styles.iosCard, { padding: SPACE[12] }]}>
            <BeforeAfterSlider
              beforeImage={filteredPhotoEntries[0].photoUrl}
              afterImage={filteredPhotoEntries[filteredPhotoEntries.length - 1].photoUrl}
            />
            <View style={styles.photoDatesRow}>
              <NumericText style={styles.photoDateLabel}>
                Before: {filteredPhotoEntries[0].date} ({filteredPhotoEntries[0].pose.toUpperCase()}{filteredPhotoEntries[0].weight > 0 ? ` · ${formatWeight(filteredPhotoEntries[0].weight, unitIsLbs, 1)}` : ''})
              </NumericText>
              <NumericText style={styles.photoDateLabel}>
                Latest: {filteredPhotoEntries[filteredPhotoEntries.length - 1].date} ({filteredPhotoEntries[filteredPhotoEntries.length - 1].pose.toUpperCase()}{filteredPhotoEntries[filteredPhotoEntries.length - 1].weight > 0 ? ` · ${formatWeight(filteredPhotoEntries[filteredPhotoEntries.length - 1].weight, unitIsLbs, 1)}` : ''})
              </NumericText>
            </View>
          </View>
        ) : filteredPhotoEntries.length === 1 ? (
          <View style={[styles.iosCard, { padding: SPACE[12] }]}>
            <View style={[styles.baselinePhotoFrame, { height: bodyMapHeight }]}>
              <ExpoImage
                source={{ uri: filteredPhotoEntries[0].photoUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={120}
                cachePolicy="memory-disk"
              />
            </View>
            <View style={styles.baselineMetaRow}>
              <NumericText style={styles.photoDateLabel}>
                Baseline ({filteredPhotoEntries[0].pose.toUpperCase()}) · {filteredPhotoEntries[0].date}{filteredPhotoEntries[0].weight > 0 ? ` (${formatWeight(filteredPhotoEntries[0].weight, unitIsLbs, 1)})` : ''}
              </NumericText>
              <TactileButton
                variant="secondary"
                size="xs"
                onPress={() => {
                  hapticLight();
                  setMetricsSheetTab('photo');
                  setShowWeighInSheet(true);
                }}
                style={styles.sectionActionBtn}
              >
                <Plus size={12} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
                <Text style={styles.addComparisonText}>Add Comparison</Text>
              </TactileButton>
            </View>
          </View>
        ) : (
          <TactileButton
            variant="custom"
            scaleTo={0.985}
            onPress={() => {
              hapticLight();
              setMetricsSheetTab('photo');
              setShowWeighInSheet(true);
            }}
            style={[styles.iosCard, styles.emptyPhotoCard]}
          >
            <Camera size={26} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
            <Text style={styles.emptyPhotoTitle}>
              Log Check-In Photos
            </Text>
            <Text style={styles.emptyPhotoSub}>
              Attach front, side, or back photos over time to unlock the interactive Before & After slider.
            </Text>
          </TactileButton>
        )}
      </ScrollView>

      {/* Weigh-In & Photo Input Bottom Sheet */}
      <LazySheet
        visible={showWeighInSheet}
        render={() => (
          <BodyMetricsSheet
            visible={showWeighInSheet}
            initialTab={metricsSheetTab}
            onClose={() => setShowWeighInSheet(false)}
          />
        )}
      />
    </ScreenWrapper>
  );
}

const makeStyles = (tokens: ThemeTokens) => StyleSheet.create({
  weighInBtn: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.inner,
  },
  weighInBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.onPrimary,
  },
  settingsIconBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.inner,
    backgroundColor: tokens.isDark ? 'rgba(255,255,255,0.06)' : tokens.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: SPACE[12],
    paddingTop: 4,
    paddingBottom: 110,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE[4],
    marginBottom: SPACE[8],
    marginTop: SPACE[8],
  },
  sectionHeaderLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11.5,
    color: tokens.text.secondary,
    letterSpacing: 0.6,
  },
  sectionActionBtn: {
    minHeight: 28,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  sectionActionText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11.5,
    color: tokens.accent.primary,
  },
  addComparisonText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11.5,
    color: tokens.accent.primary,
  },
  sectionBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: tokens.status.success,
    letterSpacing: 0.5,
  },
  iosCard: {
    backgroundColor: tokens.isDark ? '#0F1015' : tokens.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.border.subtle,
    borderRadius: RADIUS.card,
    padding: SPACE[16],
    marginBottom: SPACE[12],
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
    backgroundColor: tokens.border.subtle,
  },
  horizontalHairline: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    backgroundColor: tokens.border.subtle,
    marginVertical: SPACE[12],
  },
  kpiLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: tokens.text.muted,
    letterSpacing: 0.5,
    marginBottom: SPACE[4],
  },
  kpiValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    letterSpacing: -0.4,
  },
  kpiUnit: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: tokens.text.secondary,
  },
  bmiInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACE[8],
  },
  bmiTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: tokens.text.primary,
  },
  bmiTag: {
    paddingHorizontal: SPACE[8],
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  bmiTagText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
  },
  bmiMetaText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12.5,
    color: tokens.text.secondary,
    flexShrink: 1,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACE[8],
  },
  progressLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11.5,
    color: tokens.text.secondary,
  },
  progressPercent: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: tokens.status.success,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.bg.elevated,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: tokens.status.success,
    borderRadius: 3,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACE[8],
  },
  chartTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: tokens.text.primary,
  },
  chartBadge: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: tokens.accent.primary,
  },
  baselinePhotoFrame: {
    height: 260,
    borderRadius: RADIUS.inner,
    overflow: 'hidden',
    backgroundColor: tokens.bg.elevated,
  },
  baselineMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACE[12],
  },
  photoDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACE[12],
    paddingHorizontal: SPACE[4],
  },
  photoDateLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: tokens.text.secondary,
  },
  emptyPhotoCard: {
    alignItems: 'center',
    paddingVertical: SPACE[24],
    gap: SPACE[8],
  },
  emptyPhotoTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: tokens.text.primary,
    marginTop: SPACE[4],
  },
  emptyPhotoSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12.5,
    color: tokens.text.secondary,
    textAlign: 'center',
    paddingHorizontal: SPACE[16],
    lineHeight: 18,
  },
});
