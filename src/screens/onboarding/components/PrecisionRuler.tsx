import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Minus, Plus } from 'lucide-react-native';
import { NumericText, TactileButton } from '../../../components/ui';
import { useTheme } from '../../../contexts/ThemeContext';
import { hapticLight, hapticSelection } from '../../../utils/haptics';
import { springs } from '../../../theme/motion';
import { FONT_FAMILY, RADIUS, SPACE, ThemeTokens } from '../../../theme/tokens';

export interface PrecisionRulerProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  majorInterval?: number;
  midInterval?: number;
  stepPx?: number;
  height?: number;
  accentColor?: string;
  onChange: (nextVal: number) => void;
  formatTickLabel?: (val: number) => string;
  formatDisplayValue?: (val: number) => string;
  displayValue: string;
  displayUnit?: string;
  compact?: boolean;
}

const STRIP_PAD = 28;

interface RulerTickStripProps {
  totalSteps: number;
  min: number;
  step: number;
  majorInterval: number;
  midInterval: number;
  stepPx: number;
  height: number;
  minorColor: string;
  midColor: string;
  majorColor: string;
  labelColor: string;
  formatTickLabel?: (val: number) => string;
}

/**
 * Single-pass batched SVG tick strip — 3 <Path> nodes + major labels,
 * completely memoized so dragging/holding causes zero SVG or View reconciliation.
 */
const RulerTickStrip = React.memo(function RulerTickStrip({
  totalSteps,
  min,
  step,
  majorInterval,
  midInterval,
  stepPx,
  height,
  minorColor,
  midColor,
  majorColor,
  labelColor,
  formatTickLabel,
}: RulerTickStripProps) {
  const stripWidth = STRIP_PAD * 2 + totalSteps * stepPx;

  const { minorPath, midPath, majorPath, labels } = useMemo(() => {
    const minorSegs: string[] = [];
    const midSegs: string[] = [];
    const majorSegs: string[] = [];
    const majorLabels: Array<{ x: number; text: string }> = [];

    const majorUnits = Math.max(1, Math.round(majorInterval / step));
    const midUnits = Math.max(1, Math.round(midInterval / step));
    const topY = 8;

    for (let i = 0; i <= totalSteps; i++) {
      const x = Number((STRIP_PAD + i * stepPx).toFixed(1));
      const v = Number((min + i * step).toFixed(2));
      const unitsFromZero = Math.round(v / step);
      const isMajor = Math.abs(unitsFromZero % majorUnits) === 0;
      const isMid = !isMajor && Math.abs(unitsFromZero % midUnits) === 0;

      if (isMajor) {
        majorSegs.push(`M${x} ${topY}V${topY + 28}`);
        majorLabels.push({
          x,
          text: formatTickLabel ? formatTickLabel(v) : String(Math.round(v)),
        });
      } else if (isMid) {
        midSegs.push(`M${x} ${topY}V${topY + 19}`);
      } else {
        minorSegs.push(`M${x} ${topY}V${topY + 11}`);
      }
    }

    return {
      minorPath: minorSegs.join(''),
      midPath: midSegs.join(''),
      majorPath: majorSegs.join(''),
      labels: majorLabels,
    };
  }, [totalSteps, min, step, majorInterval, midInterval, stepPx, formatTickLabel]);

  return (
    <Svg width={stripWidth} height={height} pointerEvents="none">
      {minorPath ? (
        <Path d={minorPath} stroke={minorColor} strokeWidth={1.25} strokeLinecap="round" />
      ) : null}
      {midPath ? (
        <Path d={midPath} stroke={midColor} strokeWidth={1.5} strokeLinecap="round" />
      ) : null}
      {majorPath ? (
        <Path d={majorPath} stroke={majorColor} strokeWidth={2} strokeLinecap="round" />
      ) : null}
      {labels.map((lbl, i) => (
        <SvgText
          key={i}
          x={lbl.x}
          y={54}
          fill={labelColor}
          fontSize={10.5}
          fontFamily={FONT_FAMILY.medium}
          textAnchor="middle"
        >
          {lbl.text}
        </SvgText>
      ))}
    </Svg>
  );
});

/**
 * Isolated leaf text readout so updating the displayed number during drag
 * never triggers re-renders in PrecisionRuler, GestureDetector, or parent steps.
 */
const RulerLeafReadout = React.memo(function RulerLeafReadout({
  initialText,
  displayUnit,
  compact,
  bindSetter,
  styles,
}: {
  initialText: string;
  displayUnit?: string;
  compact: boolean;
  bindSetter: (setter: (text: string) => void) => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    bindSetter(setText);
  }, [bindSetter]);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  return (
    <View style={styles.readoutCenter}>
      <NumericText style={[styles.readoutText, compact && styles.readoutTextCompact]}>
        {text}
      </NumericText>
      {displayUnit ? <Text style={styles.unitText}>{displayUnit}</Text> : null}
    </View>
  );
});

/**
 * PrecisionRuler — 120fps native UI-thread RNGH Pan + Reanimated Decay/Spring ruler slider.
 * Zero parent re-render storms while dragging or holding; commits value cleanly on release.
 */
export const PrecisionRuler: React.FC<PrecisionRulerProps> = React.memo(
  function PrecisionRuler({
    value,
    min,
    max,
    step = 1,
    majorInterval = 10,
    midInterval = 5,
    stepPx = 11,
    height = 68,
    accentColor,
    onChange,
    formatTickLabel,
    formatDisplayValue,
    displayValue,
    displayUnit,
    compact = false,
  }) {
    const { tokens } = useTheme();
    const styles = useMemo(() => makeStyles(tokens), [tokens]);
    const resolvedAccent = accentColor ?? tokens.accent.primary;

    const totalSteps = useMemo(
      () => Math.max(1, Math.round((max - min) / step)),
      [max, min, step]
    );

    const clampValue = useCallback(
      (raw: number) => {
        const clamped = Math.max(min, Math.min(max, raw));
        const snapped = min + Math.round((clamped - min) / step) * step;
        return Number(snapped.toFixed(2));
      },
      [min, max, step]
    );

    const valueToIndex = useCallback(
      (v: number) => Math.max(0, Math.min(totalSteps, Math.round((v - min) / step))),
      [min, step, totalSteps]
    );

    const initialIdx = valueToIndex(value);
    const [trackWidth, setTrackWidth] = useState(300);

    const centerXSV = useSharedValue(150);
    const translateXSV = useSharedValue(150 - STRIP_PAD - initialIdx * stepPx);
    const startXSV = useSharedValue(0);
    const isDraggingOrAnimatingSV = useSharedValue(false);

    const currentIdxRef = useRef(initialIdx);
    const committedIdxRef = useRef(initialIdx);
    const readoutSetterRef = useRef<((t: string) => void) | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const bindReadoutSetter = useCallback((setter: (t: string) => void) => {
      readoutSetterRef.current = setter;
    }, []);

    const formatIndexText = useCallback(
      (idx: number) => {
        const val = clampValue(min + idx * step);
        return formatDisplayValue ? formatDisplayValue(val) : String(val);
      },
      [clampValue, min, step, formatDisplayValue]
    );

    const txForIndex = useCallback(
      (idx: number, width: number) => width / 2 - STRIP_PAD - idx * stepPx,
      [stepPx]
    );

    // Sync external value updates only when idle
    useEffect(() => {
      const targetIdx = valueToIndex(value);
      if (!isDraggingOrAnimatingSV.value && targetIdx !== currentIdxRef.current) {
        currentIdxRef.current = targetIdx;
        committedIdxRef.current = targetIdx;
        translateXSV.value = txForIndex(targetIdx, trackWidth);
        readoutSetterRef.current?.(formatIndexText(targetIdx));
      }
    }, [value, valueToIndex, trackWidth, txForIndex, translateXSV, isDraggingOrAnimatingSV, formatIndexText]);

    useEffect(() => {
      return () => {
        cancelAnimation(translateXSV);
        if (currentIdxRef.current !== committedIdxRef.current) {
          onChangeRef.current(clampValue(min + currentIdxRef.current * step));
        }
      };
    }, [translateXSV, clampValue, min, step]);

    const handleLayout = (e: LayoutChangeEvent) => {
      const w = Math.round(e.nativeEvent.layout.width);
      if (w > 40 && Math.abs(w - trackWidth) > 1) {
        setTrackWidth(w);
        centerXSV.value = w / 2;
        if (!isDraggingOrAnimatingSV.value) {
          translateXSV.value = txForIndex(currentIdxRef.current, w);
        }
      }
    };

    const handleTickVisualJS = useCallback(
      (idx: number) => {
        if (idx === currentIdxRef.current) return;
        currentIdxRef.current = idx;
        readoutSetterRef.current?.(formatIndexText(idx));
        hapticSelection();
      },
      [formatIndexText]
    );

    const commitIndexJS = useCallback(
      (idx: number) => {
        currentIdxRef.current = idx;
        readoutSetterRef.current?.(formatIndexText(idx));
        if (idx !== committedIdxRef.current) {
          committedIdxRef.current = idx;
          onChangeRef.current(clampValue(min + idx * step));
        }
      },
      [formatIndexText, clampValue, min, step]
    );

    useAnimatedReaction(
      () => {
        const rawIdx = (centerXSV.value - STRIP_PAD - translateXSV.value) / stepPx;
        return Math.max(0, Math.min(totalSteps, Math.round(rawIdx)));
      },
      (currIdx, prevIdx) => {
        if (prevIdx !== null && currIdx !== prevIdx && isDraggingOrAnimatingSV.value) {
          runOnJS(handleTickVisualJS)(currIdx);
        }
      },
      [stepPx, totalSteps, handleTickVisualJS]
    );

    const panGesture = useMemo(
      () =>
        Gesture.Pan()
          .activeOffsetX([-2, 2])
          .failOffsetY([-16, 16])
          .onStart(() => {
            'worklet';
            cancelAnimation(translateXSV);
            isDraggingOrAnimatingSV.value = true;
            startXSV.value = translateXSV.value;
          })
          .onUpdate((e) => {
            'worklet';
            const maxTx = centerXSV.value - STRIP_PAD;
            const minTx = maxTx - totalSteps * stepPx;
            const rawNext = startXSV.value + e.translationX;

            if (rawNext > maxTx) {
              translateXSV.value = maxTx + (rawNext - maxTx) * 0.25;
            } else if (rawNext < minTx) {
              translateXSV.value = minTx + (rawNext - minTx) * 0.25;
            } else {
              translateXSV.value = rawNext;
            }
          })
          .onEnd((e) => {
            'worklet';
            const maxTx = centerXSV.value - STRIP_PAD;
            const minTx = maxTx - totalSteps * stepPx;
            const vx = e.velocityX;

            const currentIdxNow = Math.max(
              0,
              Math.min(totalSteps, Math.round((centerXSV.value - STRIP_PAD - translateXSV.value) / stepPx))
            );
            runOnJS(commitIndexJS)(currentIdxNow);

            const snapToNearest = () => {
              'worklet';
              const rawIdx = (centerXSV.value - STRIP_PAD - translateXSV.value) / stepPx;
              const targetIdx = Math.max(0, Math.min(totalSteps, Math.round(rawIdx)));
              const targetTx = centerXSV.value - STRIP_PAD - targetIdx * stepPx;
              translateXSV.value = withSpring(targetTx, springs.snappy, (finished) => {
                if (finished) {
                  isDraggingOrAnimatingSV.value = false;
                  runOnJS(commitIndexJS)(targetIdx);
                }
              });
            };

            if (Math.abs(vx) > 160 && translateXSV.value <= maxTx && translateXSV.value >= minTx) {
              translateXSV.value = withDecay(
                {
                  velocity: vx,
                  deceleration: 0.996,
                  clamp: [minTx, maxTx],
                },
                (finished) => {
                  if (finished) {
                    snapToNearest();
                  }
                }
              );
            } else {
              snapToNearest();
            }
          })
          .onFinalize((_e, success) => {
            'worklet';
            if (!success) {
              isDraggingOrAnimatingSV.value = false;
            }
          }),
      [centerXSV, translateXSV, startXSV, isDraggingOrAnimatingSV, totalSteps, stepPx, commitIndexJS]
    );

    const handleStepDelta = useCallback(
      (deltaSteps: number) => {
        hapticLight();
        cancelAnimation(translateXSV);
        const nextIdx = Math.max(0, Math.min(totalSteps, currentIdxRef.current + deltaSteps));
        isDraggingOrAnimatingSV.value = true;
        commitIndexJS(nextIdx);
        const targetTx = txForIndex(nextIdx, trackWidth);
        translateXSV.value = withSpring(targetTx, springs.snappy, (finished) => {
          if (finished) {
            isDraggingOrAnimatingSV.value = false;
          }
        });
      },
      [translateXSV, totalSteps, isDraggingOrAnimatingSV, commitIndexJS, txForIndex, trackWidth]
    );

    const stripAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateXSV.value }],
    }));

    const fadeColor = tokens.isDark ? '#0F1015' : tokens.bg.surface;
    const fadeTransparent = tokens.isDark ? 'rgba(15, 16, 21, 0)' : 'rgba(255, 255, 255, 0)';

    return (
      <View style={styles.wrapper}>
        {/* Value Display + Micro Steppers */}
        <View style={[styles.valueRow, compact && styles.valueRowCompact]}>
          <TactileButton
            variant="custom"
            onPress={() => handleStepDelta(-1)}
            style={styles.stepBtn}
            hitSlop={tokens.touch.hitSlop}
            accessibilityLabel="Decrease value"
          >
            <Minus size={15} strokeWidth={2.2} color={tokens.text.secondary} />
          </TactileButton>

          <RulerLeafReadout
            initialText={displayValue}
            displayUnit={displayUnit}
            compact={compact}
            bindSetter={bindReadoutSetter}
            styles={styles}
          />

          <TactileButton
            variant="custom"
            onPress={() => handleStepDelta(1)}
            style={styles.stepBtn}
            hitSlop={tokens.touch.hitSlop}
            accessibilityLabel="Increase value"
          >
            <Plus size={15} strokeWidth={2.2} color={tokens.text.secondary} />
          </TactileButton>
        </View>

        {/* Native 120fps Gesture-Driven Tick Strip */}
        <GestureDetector gesture={panGesture}>
          <View style={[styles.rulerBox, { height }]} onLayout={handleLayout}>
            <Animated.View style={[styles.stripContainer, stripAnimatedStyle]}>
              <RulerTickStrip
                totalSteps={totalSteps}
                min={min}
                step={step}
                majorInterval={majorInterval}
                midInterval={midInterval}
                stepPx={stepPx}
                height={height}
                minorColor={tokens.border.subtle}
                midColor={tokens.border.medium}
                majorColor={tokens.text.secondary}
                labelColor={tokens.text.muted}
                formatTickLabel={formatTickLabel}
              />
            </Animated.View>

            {/* Center Indicator Needle */}
            <View pointerEvents="none" style={styles.centerNeedleWrap}>
              <View style={[styles.needleDot, { backgroundColor: resolvedAccent }]} />
              <View style={[styles.needleStem, { backgroundColor: resolvedAccent }]} />
            </View>

            {/* Left & Right Atmospheric Edge Fades */}
            <LinearGradient
              pointerEvents="none"
              colors={[fadeColor, fadeTransparent]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.edgeFadeLeft}
            />
            <LinearGradient
              pointerEvents="none"
              colors={[fadeTransparent, fadeColor]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.edgeFadeRight}
            />
          </View>
        </GestureDetector>
      </View>
    );
  }
);

const makeStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    wrapper: {
      width: '100%',
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACE.sm,
      marginBottom: SPACE.sm + 2,
    },
    valueRowCompact: {
      marginBottom: SPACE.xs + 2,
    },
    stepBtn: {
      width: 34,
      height: 34,
      borderRadius: RADIUS.full,
      backgroundColor: tokens.isDark ? 'rgba(255,255,255,0.06)' : tokens.bg.elevated,
      borderWidth: tokens.border.hairlineWidth,
      borderColor: tokens.border.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    readoutCenter: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 5,
    },
    readoutText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 34,
      color: tokens.text.primary,
      letterSpacing: -0.9,
      includeFontPadding: false,
    },
    readoutTextCompact: {
      fontSize: 30,
    },
    unitText: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 14,
      color: tokens.text.secondary,
      includeFontPadding: false,
    },
    rulerBox: {
      position: 'relative',
      width: '100%',
      justifyContent: 'flex-start',
      overflow: 'hidden',
    },
    stripContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
    },
    centerNeedleWrap: {
      position: 'absolute',
      top: 0,
      left: '50%',
      marginLeft: -4,
      alignItems: 'center',
    },
    needleDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      marginBottom: 1,
    },
    needleStem: {
      width: 2.5,
      height: 34,
      borderRadius: 999,
    },
    edgeFadeLeft: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 48,
    },
    edgeFadeRight: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 48,
    },
  });
