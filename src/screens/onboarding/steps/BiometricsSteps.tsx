import React, { useId, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { IOSSegmentedControl, NumericText } from '../../../components/ui';
import { useTheme } from '../../../contexts/ThemeContext';
import { displayToKg, kgToDisplay } from '../../../utils/weightUnit';
import { PrecisionRuler } from '../components/PrecisionRuler';
import { classifyBmi } from '../onboardingTypes';
import { FONT_FAMILY, SPACE, ThemeTokens } from '../../../theme/tokens';

/* ── Bespoke Biometric SVG Emblems ─────────────────────────────────────── */
const AgeVitalitySvg = React.memo(function AgeVitalitySvg({ color }: { color: string }) {
  const uid = useId().replace(/:/g, '_');
  const gId = `ageGrad_${uid}`;
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Defs>
        <SvgLinearGradient id={gId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={color} />
          <Stop offset="100%" stopColor="#5AC8FA" />
        </SvgLinearGradient>
      </Defs>
      <Circle cx={12} cy={12} r={9.5} stroke={`url(#${gId})`} strokeWidth={1.9} />
      <Path
        d="M6.5 12.5H9.2L10.9 8.8L13.1 15.2L14.8 11.4H17.5"
        stroke={`url(#${gId})`}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});

const HeightStatureSvg = React.memo(function HeightStatureSvg({ color }: { color: string }) {
  const uid = useId().replace(/:/g, '_');
  const gId = `hGrad_${uid}`;
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Defs>
        <SvgLinearGradient id={gId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#5AC8FA" />
          <Stop offset="100%" stopColor={color} />
        </SvgLinearGradient>
      </Defs>
      <Rect x={4} y={3} width={7} height={18} rx={2.2} stroke={`url(#${gId})`} strokeWidth={1.8} />
      <Path d="M4 7.5H7.2M4 12H8.4M4 16.5H7.2" stroke={`url(#${gId})`} strokeWidth={1.7} strokeLinecap="round" />
      <Path
        d="M17 4.5V19.5M14.5 7L17 4.5L19.5 7M14.5 17L17 19.5L19.5 17"
        stroke={`url(#${gId})`}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});

const ScaleDialSvg = React.memo(function ScaleDialSvg({ color }: { color: string }) {
  const uid = useId().replace(/:/g, '_');
  const gId = `bwGrad_${uid}`;
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Defs>
        <SvgLinearGradient id={gId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#5AC8FA" />
          <Stop offset="100%" stopColor={color} />
        </SvgLinearGradient>
      </Defs>
      <Rect x={3} y={3.5} width={18} height={17} rx={4.5} stroke={`url(#${gId})`} strokeWidth={1.85} />
      <Path
        d="M7.5 12C7.5 9.5 9.5 7.5 12 7.5C14.5 7.5 16.5 9.5 16.5 12"
        stroke={`url(#${gId})`}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path d="M12 12L14.8 9.3" stroke="#30D158" strokeWidth={2} strokeLinecap="round" />
      <Circle cx={12} cy={12} r={1.4} fill={color} />
    </Svg>
  );
});

const BenchBarbellSvg = React.memo(function BenchBarbellSvg({ primary }: { primary: string }) {
  const uid = useId().replace(/:/g, '_');
  const gId = `benchGrad_${uid}`;
  return (
    <Svg width={44} height={28} viewBox="0 0 44 28" fill="none">
      <Defs>
        <SvgLinearGradient id={gId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#5AC8FA" />
          <Stop offset="100%" stopColor={primary} />
        </SvgLinearGradient>
      </Defs>
      {/* Left & right calibrated plates */}
      <Rect x={2} y={6} width={4.2} height={16} rx={1.6} fill={`url(#${gId})`} opacity={0.8} />
      <Rect x={7.5} y={3.5} width={5} height={21} rx={1.8} fill={`url(#${gId})`} />
      <Rect x={31.5} y={3.5} width={5} height={21} rx={1.8} fill={`url(#${gId})`} />
      <Rect x={37.8} y={6} width={4.2} height={16} rx={1.6} fill={`url(#${gId})`} opacity={0.8} />
      {/* Olympic barbell shaft & collar */}
      <Rect x={12.5} y={12.4} width={19} height={3.2} rx={1.6} fill="#E4E4E7" opacity={0.9} />
      {/* Bench uprights */}
      <Path
        d="M16 15.6V24.5M28 15.6V24.5M13 24.5H31"
        stroke={primary}
        strokeWidth={1.7}
        strokeLinecap="round"
        opacity={0.75}
      />
    </Svg>
  );
});

const SquatRackBarbellSvg = React.memo(function SquatRackBarbellSvg({
  emerald,
}: {
  emerald: string;
}) {
  const uid = useId().replace(/:/g, '_');
  const gId = `squatGrad_${uid}`;
  return (
    <Svg width={44} height={28} viewBox="0 0 44 28" fill="none">
      <Defs>
        <SvgLinearGradient id={gId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#4ADE80" />
          <Stop offset="100%" stopColor={emerald} />
        </SvgLinearGradient>
      </Defs>
      {/* Rack uprights */}
      <Path
        d="M14.5 6V25M29.5 6V25M11.5 25H17.5M26.5 25H32.5"
        stroke={emerald}
        strokeWidth={1.8}
        strokeLinecap="round"
        opacity={0.75}
      />
      {/* Heavy double-loaded squat plates */}
      <Rect x={2} y={4.5} width={4.4} height={15} rx={1.6} fill={`url(#${gId})`} opacity={0.82} />
      <Rect x={7.4} y={2} width={5.2} height={20} rx={2} fill={`url(#${gId})`} />
      <Rect x={31.4} y={2} width={5.2} height={20} rx={2} fill={`url(#${gId})`} />
      <Rect x={37.6} y={4.5} width={4.4} height={15} rx={1.6} fill={`url(#${gId})`} opacity={0.82} />
      {/* High-bar squat shaft */}
      <Rect x={12.6} y={10.4} width={18.8} height={3.4} rx={1.7} fill="#E4E4E7" opacity={0.92} />
    </Svg>
  );
});

function getAgeMotivation(age: number): { emoji: string; badge: string; note: string } {
  if (age <= 24) {
    return {
      emoji: '⚡',
      badge: 'Peak Recovery',
      note: 'Prime adaptation window — compound lifts stack strength fast.',
    };
  }
  if (age <= 34) {
    return {
      emoji: '🔥',
      badge: 'Strength Prime',
      note: 'Optimal muscle density & focus — push steady progressive PRs.',
    };
  }
  if (age <= 48) {
    return {
      emoji: '🛡️',
      badge: 'Built for Power',
      note: 'Smart weekly volume drives dense muscle and joint longevity.',
    };
  }
  return {
    emoji: '💎',
    badge: 'Ageless Iron',
    note: 'Structured resistance training keeps strength and mobility peaking.',
  };
}

function getBmiMotivation(segIdx: 0 | 1 | 2 | 3): string {
  switch (segIdx) {
    case 0:
      return '⚡ Lean leverage — strong bodyweight ratio for dips, pulls & conditioning.';
    case 1:
      return '🎯 Athletic equilibrium — ideal base for lean muscle & steady strength.';
    case 2:
      return '💪 Solid iron base — high pressing & squatting momentum.';
    case 3:
    default:
      return '🔥 Heavy power base — built to chase serious compound numbers.';
  }
}

/* ── Step 2: Age & Height Dual Sliders ─────────────────────────────────── */
interface AgeHeightStepProps {
  age: number;
  onChangeAge: (age: number) => void;
  heightCm: number;
  onChangeHeightCm: (cm: number) => void;
  heightUnit: 'cm' | 'ft';
  onChangeHeightUnit: (unit: 'cm' | 'ft') => void;
}

const HEIGHT_UNITS = [
  { id: 'cm' as const, label: 'CM' },
  { id: 'ft' as const, label: 'FT' },
];

export const AgeHeightStep: React.FC<AgeHeightStepProps> = React.memo(
  function AgeHeightStep({
    age,
    onChangeAge,
    heightCm,
    onChangeHeightCm,
    heightUnit,
    onChangeHeightUnit,
  }) {
    const { tokens, isDark } = useTheme();
    const styles = useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);

    const totalInches = Math.max(52, Math.min(87, Math.round(heightCm / 2.54)));
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    const ageMeta = useMemo(() => getAgeMotivation(age), [age]);

    return (
      <View style={styles.root}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Age & height</Text>
          <Text style={styles.subtitle}>
            Drag either scale to dial in your exact numbers.
          </Text>
        </View>

        <View style={styles.centerColumn}>
          <View style={styles.groupedSurface}>
            {/* Age Slider */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionLabelGroup}>
                  <AgeVitalitySvg color={tokens.accent.primary} />
                  <Text style={styles.sectionLabel}>AGE</Text>
                </View>
                <View style={styles.motivationPill}>
                  <Text style={styles.motivationPillEmoji}>{ageMeta.emoji}</Text>
                  <Text style={styles.motivationPillText}>{ageMeta.badge}</Text>
                </View>
              </View>
              <PrecisionRuler
                value={age}
                min={14}
                max={80}
                step={1}
                majorInterval={10}
                midInterval={5}
                stepPx={12}
                height={68}
                displayValue={String(age)}
                formatDisplayValue={(v) => String(Math.round(v))}
                displayUnit="yrs"
                onChange={onChangeAge}
              />
            </View>

            <View style={styles.hairline} />

            {/* Height Slider */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionLabelGroup}>
                  <HeightStatureSvg color={tokens.accent.primary} />
                  <Text style={styles.sectionLabel}>HEIGHT</Text>
                </View>
                <IOSSegmentedControl
                  segments={HEIGHT_UNITS}
                  activeId={heightUnit}
                  onSelect={onChangeHeightUnit}
                  height={32}
                  style={{ width: 100 }}
                />
              </View>

              {heightUnit === 'cm' ? (
                <PrecisionRuler
                  key="height-cm"
                  value={heightCm}
                  min={130}
                  max={220}
                  step={1}
                  majorInterval={10}
                  midInterval={5}
                  stepPx={10}
                  height={68}
                  displayValue={String(heightCm)}
                  formatDisplayValue={(v) => String(Math.round(v))}
                  displayUnit="cm"
                  onChange={onChangeHeightCm}
                />
              ) : (
                <PrecisionRuler
                  key="height-ft"
                  value={totalInches}
                  min={52}
                  max={87}
                  step={1}
                  majorInterval={12}
                  midInterval={6}
                  stepPx={12}
                  height={68}
                  displayValue={`${feet}' ${inches}"`}
                  formatDisplayValue={(inc) => {
                    const rounded = Math.round(inc);
                    return `${Math.floor(rounded / 12)}' ${rounded % 12}"`;
                  }}
                  formatTickLabel={(inc) => `${Math.floor(inc / 12)}'`}
                  onChange={(nextInc) => onChangeHeightCm(Math.round(nextInc * 2.54))}
                />
              )}
            </View>
          </View>

          {/* Motivating Frame Insight Callout */}
          <View style={styles.editorialRuleNote}>
            <View style={styles.editorialCopyCol}>
              <NumericText style={styles.editorialFrameHeadline}>
                Profile frame · {age} yrs · {heightCm} cm ({feet}&apos;{inches}&quot;)
              </NumericText>
              <Text style={styles.editorialRuleText}>{ageMeta.note}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }
);

/* ── Step 3: Bodyweight Precision Scale + Unit Sync ────────────────────── */
interface WeightStepProps {
  weightKg: number;
  onChangeWeightKg: (kg: number) => void;
  weightUnit: 'kg' | 'lbs';
  onChangeWeightUnit: (unit: 'kg' | 'lbs') => void;
  heightCm: number;
}

const WEIGHT_UNITS = [
  { id: 'kg' as const, label: 'KG' },
  { id: 'lbs' as const, label: 'LBS' },
];

export const WeightStep: React.FC<WeightStepProps> = React.memo(
  function WeightStep({
    weightKg,
    onChangeWeightKg,
    weightUnit,
    onChangeWeightUnit,
    heightCm,
  }) {
    const { tokens, isDark } = useTheme();
    const styles = useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);

    const weightLbs = Math.round(kgToDisplay(weightKg, true, 0));
    const heightM = Math.max(1.2, heightCm / 100);
    const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
    const bmiMeta = classifyBmi(bmi);
    const segmentLabels = ['Lean', 'Athletic', 'Solid', 'Heavy'];

    const bwBenchTarget = weightUnit === 'kg'
      ? `${Math.round(weightKg)} kg`
      : `${weightLbs} lbs`;
    const bwSquatTarget = weightUnit === 'kg'
      ? `${Math.round(weightKg * 1.25)} kg`
      : `${Math.round(weightLbs * 1.25)} lbs`;

    return (
      <View style={styles.root}>
        <View style={styles.weightHeaderRow}>
          <View style={{ flex: 1, minWidth: 0, paddingRight: SPACE.sm }}>
            <Text style={styles.title}>Current weight</Text>
            <Text style={styles.subtitle}>
              Sets strength ratios and your app unit.
            </Text>
          </View>
          <IOSSegmentedControl
            segments={WEIGHT_UNITS}
            activeId={weightUnit}
            onSelect={onChangeWeightUnit}
            height={34}
            style={{ width: 106 }}
          />
        </View>

        <View style={styles.centerColumn}>
          <View style={styles.groupedSurface}>
            <View style={styles.weightCardInner}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionLabelGroup}>
                  <ScaleDialSvg color={tokens.accent.primary} />
                  <Text style={styles.sectionLabel}>BODYWEIGHT</Text>
                </View>
                <Text style={styles.hintLabel}>
                  {weightUnit === 'kg' ? '0.5 kg precision' : '1 lb precision'}
                </Text>
              </View>
              <View style={{ marginTop: SPACE.xs + 2 }}>
                {weightUnit === 'kg' ? (
                  <PrecisionRuler
                    key="weight-kg"
                    value={Math.round(weightKg * 2) / 2}
                    min={35}
                    max={180}
                    step={0.5}
                    majorInterval={5}
                    midInterval={2.5}
                    stepPx={9}
                    height={76}
                    displayValue={(Math.round(weightKg * 2) / 2).toFixed(1)}
                    formatDisplayValue={(v) => (Math.round(v * 2) / 2).toFixed(1)}
                    displayUnit="kg"
                    onChange={onChangeWeightKg}
                  />
                ) : (
                  <PrecisionRuler
                    key="weight-lbs"
                    value={Math.max(77, Math.min(397, weightLbs))}
                    min={77}
                    max={397}
                    step={1}
                    majorInterval={10}
                    midInterval={5}
                    stepPx={9}
                    height={76}
                    displayValue={String(Math.max(77, Math.min(397, weightLbs)))}
                    formatDisplayValue={(v) => String(Math.round(v))}
                    displayUnit="lbs"
                    onChange={(lbs) => onChangeWeightKg(displayToKg(lbs, true))}
                  />
                )}
              </View>
            </View>
          </View>

          {/* Estimated BMI Spectrum + Motivating Note */}
          <View style={styles.bmiStrip}>
            <View style={styles.bmiTextRow}>
              <Text style={styles.bmiPrefix}>Estimated BMI</Text>
              <NumericText style={styles.bmiValue}>
                {bmi.toFixed(1)} · {bmiMeta.label}
              </NumericText>
            </View>
            <View style={styles.spectrumRow}>
              {segmentLabels.map((lbl, idx) => {
                const active = idx === bmiMeta.segmentIndex;
                return (
                  <View key={lbl} style={styles.spectrumCell}>
                    <View
                      style={[
                        styles.spectrumBar,
                        {
                          backgroundColor: active
                            ? tokens.accent.primary
                            : isDark
                            ? 'rgba(255,255,255,0.10)'
                            : tokens.border.subtle,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.spectrumLabel,
                        active && { color: tokens.text.primary, fontFamily: FONT_FAMILY.semibold },
                      ]}
                    >
                      {lbl}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.bmiMotivationText}>
              {getBmiMotivation(bmiMeta.segmentIndex)}
            </Text>
          </View>

          {/* Custom Barbell Bench & Squat Athletic Target Cards */}
          <View style={styles.benchmarksHeaderRow}>
            <Text style={styles.sectionLabel}>ATHLETIC STRENGTH BENCHMARKS</Text>
            <Text style={styles.hintLabel}>First major targets</Text>
          </View>
          <View style={styles.benchmarkPairRow}>
            <View style={styles.benchmarkCard}>
              <BenchBarbellSvg primary={tokens.accent.primary} />
              <View style={styles.benchmarkTextCol}>
                <NumericText style={styles.benchmarkValue}>{bwBenchTarget}</NumericText>
                <Text style={styles.benchmarkSub}>Bench · 1.0× BW</Text>
              </View>
            </View>
            <View style={styles.benchmarkCard}>
              <SquatRackBarbellSvg emerald={tokens.status.success} />
              <View style={styles.benchmarkTextCol}>
                <NumericText style={[styles.benchmarkValue, { color: tokens.status.success }]}>
                  {bwSquatTarget}
                </NumericText>
                <Text style={styles.benchmarkSub}>Squat · 1.25× BW</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }
);

const makeStyles = (tokens: ThemeTokens, isDark: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      paddingTop: SPACE.xs,
    },
    headerBlock: {
      marginBottom: SPACE.md,
    },
    weightHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: SPACE.md,
    },
    centerColumn: {
      justifyContent: 'flex-start',
      paddingTop: SPACE.xs,
      paddingBottom: SPACE.sm,
    },
    title: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 27,
      letterSpacing: -0.65,
      color: tokens.text.primary,
      marginBottom: 4,
      includeFontPadding: false,
    },
    subtitle: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 14.5,
      lineHeight: 20,
      color: tokens.text.secondary,
    },
    groupedSurface: {
      borderRadius: 20,
      backgroundColor: isDark ? '#0F1015' : tokens.bg.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : tokens.border.subtle,
      overflow: 'hidden',
    },
    sectionBlock: {
      paddingTop: SPACE.md,
      paddingBottom: SPACE.md,
      paddingHorizontal: SPACE.md,
    },
    weightCardInner: {
      paddingTop: SPACE.md + 2,
      paddingBottom: SPACE.md,
      paddingHorizontal: SPACE.md,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 30,
      marginBottom: SPACE.xs,
    },
    sectionLabelGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    sectionLabel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 11,
      letterSpacing: 0.9,
      color: tokens.text.muted,
      includeFontPadding: false,
    },
    motivationPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: tokens.accent.primaryDim,
    },
    motivationPillEmoji: {
      fontSize: 12,
      includeFontPadding: false,
    },
    motivationPillText: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 11.5,
      color: tokens.accent.primary,
      includeFontPadding: false,
    },
    hintLabel: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 11.5,
      color: tokens.text.muted,
      includeFontPadding: false,
    },
    hairline: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : tokens.border.subtle,
      marginHorizontal: SPACE.md,
    },
    editorialRuleNote: {
      marginTop: SPACE.md,
      paddingLeft: 12,
      borderLeftWidth: 2.5,
      borderLeftColor: tokens.accent.primary,
    },
    editorialCopyCol: {
      gap: 3,
    },
    editorialFrameHeadline: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 13.5,
      color: tokens.text.primary,
    },
    editorialRuleText: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 12.5,
      lineHeight: 17.5,
      color: tokens.text.secondary,
    },
    bmiStrip: {
      marginTop: SPACE.md + 4,
      paddingHorizontal: 2,
    },
    bmiTextRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACE.xs + 2,
    },
    bmiPrefix: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 13.5,
      color: tokens.text.secondary,
    },
    bmiValue: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
      color: tokens.accent.primary,
    },
    spectrumRow: {
      flexDirection: 'row',
      gap: 6,
    },
    spectrumCell: {
      flex: 1,
      alignItems: 'center',
      gap: 5,
    },
    spectrumBar: {
      width: '100%',
      height: 5,
      borderRadius: 999,
    },
    spectrumLabel: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 11,
      color: tokens.text.muted,
    },
    bmiMotivationText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12.5,
      lineHeight: 18,
      color: tokens.text.secondary,
      marginTop: SPACE.sm,
    },
    benchmarksHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: SPACE.md + 4,
      marginBottom: SPACE.xs + 2,
      paddingHorizontal: 2,
    },
    benchmarkPairRow: {
      flexDirection: 'row',
      gap: SPACE.sm,
    },
    benchmarkCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderRadius: 16,
      backgroundColor: isDark ? '#0F1015' : tokens.bg.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : tokens.border.subtle,
    },
    benchmarkTextCol: {
      flex: 1,
      minWidth: 0,
    },
    benchmarkValue: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
      color: tokens.accent.primary,
      includeFontPadding: false,
      marginBottom: 2,
    },
    benchmarkSub: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 11.5,
      color: tokens.text.muted,
      includeFontPadding: false,
    },
  });
