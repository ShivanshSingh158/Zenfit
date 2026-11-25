import { useMemo } from 'react';
import { PixelRatio, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ResponsiveMetrics {
  width: number;
  height: number;
  effectiveWidth: number;
  fontScale: number;
  isNarrow: boolean;
  isCompactW: boolean;
  isCompactH: boolean;
  isLarge: boolean;
  isTablet: boolean;
  maxContentWidth: number;
  dockMaxWidth: number;
  orbitSize: number;
  sliderHeight: number;
  bodyMapHeight: number;
  keypadButtonHeight: number;
  keypadLogHeight: number;
  keypadAccessoryHeight: number;
  sheetMaxHeightRatio: number;
  maxFontMultiplier: number;
  scaleW: (base: number) => number;
  scaleH: (base: number) => number;
  clampChartWidth: (horizontalPadding?: number) => number;
  clampSheetListHeight: (ratio?: number, min?: number, max?: number) => number;
}

/**
 * Pure computation of cross-device responsive layout metrics.
 * Handles compact/narrow screens (320-359dp x 568-667dp), standard phones (~390x844),
 * large flagship displays (428-440dp+), and tablets/foldables (>=600dp).
 */
export function computeResponsiveMetrics(
  width: number,
  height: number,
  fontScale: number = 1,
  topInset: number = 0,
  bottomInset: number = 0
): ResponsiveMetrics {
  const safeW = width > 0 ? width : 390;
  const safeH = height > 0 ? height : 844;
  const isNarrow = safeW < 360;
  const isCompactW = safeW < 380;
  const isCompactH = safeH < 690;
  const isLarge = safeW >= 428;
  const isTablet = safeW >= 600;

  const maxContentWidth = isTablet ? 560 : safeW;
  const effectiveWidth = Math.min(safeW, maxContentWidth);
  const wRatio = Math.min(1.14, Math.max(0.82, effectiveWidth / 390));
  const hRatio = Math.min(1.12, Math.max(0.78, safeH / 844));

  const scaleW = (base: number) => Math.round(base * wRatio);
  const scaleH = (base: number) => Math.round(base * hRatio);

  const clampChartWidth = (horizontalPadding: number = 32) =>
    Math.max(200, Math.min(effectiveWidth - horizontalPadding, 520));

  const clampSheetListHeight = (ratio: number = 0.5, min: number = 220, max: number = 520) => {
    const usableH = Math.max(320, safeH - topInset - bottomInset);
    return Math.round(Math.min(max, Math.max(min, usableH * ratio)));
  };

  const orbitSize = isNarrow || isCompactH ? 156 : isLarge ? 204 : 184;
  const sliderHeight = Math.round(Math.min(Math.max(safeH * 0.42, 240), 420));
  const bodyMapHeight = Math.round(Math.min(Math.max(safeH * 0.29, 210), 290));
  const keypadButtonHeight = isCompactH ? 38 : isLarge ? 48 : 44;
  const keypadLogHeight = keypadButtonHeight * 2 + 6;
  const keypadAccessoryHeight = isCompactH ? 38 : 42;
  const dockMaxWidth = Math.min(safeW - 28, 480);

  return {
    width: safeW,
    height: safeH,
    effectiveWidth,
    fontScale: Math.max(1, fontScale),
    isNarrow,
    isCompactW,
    isCompactH,
    isLarge,
    isTablet,
    maxContentWidth,
    dockMaxWidth,
    orbitSize,
    sliderHeight,
    bodyMapHeight,
    keypadButtonHeight,
    keypadLogHeight,
    keypadAccessoryHeight,
    sheetMaxHeightRatio: isCompactH ? 0.92 : 0.88,
    maxFontMultiplier: 1.25,
    scaleW,
    scaleH,
    clampChartWidth,
    clampSheetListHeight,
  };
}

export function useResponsiveMetrics(): ResponsiveMetrics {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const resolvedFontScale = fontScale || PixelRatio.getFontScale() || 1;

  return useMemo(
    () =>
      computeResponsiveMetrics(
        width,
        height,
        resolvedFontScale,
        insets.top,
        insets.bottom
      ),
    [width, height, resolvedFontScale, insets.top, insets.bottom]
  );
}
