import { Platform, StyleSheet, TextStyle, ViewStyle } from 'react-native';

/**
 * ZenFit — Centralized OLED Design System & Token Contracts
 *
 * Strictly enforces:
 * - OLED High-Contrast Dark Mode: Canvas (#09090B) -> Surface (#121215) -> Elevated (#1C1C21)
 * - 4pt/8pt Spacing Grid: 4, 8, 12, 16, 24, 32
 * - Concentric Radii: Card (16) with padding (12) -> Inner control/tile (10)
 * - Sweaty-Hand Touch Ergonomics: 48x48dp min targets, 10dp hitSlop
 * - Zero `fontWeight` on Inter fonts (prevents Android faux-bold & fallback bugs)
 * - Tabular figures (`tabular-nums`) on every timer, weight, rep, and volume stat
 */

// ─── Font Family Tokens ───────────────────────────────────────────────────────
// Keys strictly match useFonts() keys loaded in App.tsx.
export const FONT_FAMILY = {
  title: 'Inter_700Bold',
  heading: 'Inter_700Bold',
  serif: 'PlayfairDisplay_600SemiBold',
  body: 'Inter_400Regular',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: 'Inter_600SemiBold',
} as const;

export const FONT_SIZE = {
  xs: 11,
  sm: 12,
  md: 14,
  base: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  hero: 40,
} as const;

// ─── Spacing Tokens (4pt / 8pt Grid) ──────────────────────────────────────────
export const SPACE = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  24: 24,
  32: 32,
  xxs: 4,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  '2xl': 24,
  '3xl': 32,
} as const;

// ─── Concentric Corner Radii ──────────────────────────────────────────────────
export const RADIUS = {
  xs: 4,
  sm: 8,
  inner: 10, // Inner button / tile inside a 16px card with 12px padding
  md: 12,
  lg: 12,
  card: 16,
  xl: 16,
  xxl: 24,
  sheet: 24,
  full: 999,
} as const;

// ─── Sweaty-Hand Touch Ergonomics ─────────────────────────────────────────────
export const TOUCH = {
  minTarget: 48,
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 } as const,
  hitSlopCompact: { top: 12, bottom: 12, left: 12, right: 12 } as const,
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 999,
  } as const,
} as const;

export const ICON = {
  strokeWidth: 2,
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

// ─── Option A Balanced Compact Visual Control Tiers (Paired with hitSlop) ───
export const CONTROL_HEIGHT = {
  xs: 28,
  sm: 32,
  md: 38,
  lg: 44,
} as const;

export const ICON_BTN_SIZE = {
  xs: 28,
  sm: 32,
  header: 32,
  md: 38,
  lg: 44,
} as const;

export const SEGMENT_HEIGHT = {
  compact: 30,
  card: 34,
  top: 36,
} as const;

export const SEARCH_BAR_HEIGHT = 40;

export const CONTROL_ICON = {
  xs: 12,
  sm: 14,
  header: 16,
  md: 16,
  lg: 16,
} as const;

export const TAB_BAR_HEIGHT = 54;

// ─── Strongly-Typed Theme Token Contract ──────────────────────────────────────
export interface ThemeTokens {
  isDark: boolean;
  bg: {
    canvas: string;
    surface: string;
    elevated: string;
    glass: string;
    backdrop: string;
    overlay: string;
    mediaLight: string;
  };
  border: {
    subtle: string;
    medium: string;
    focus: string;
    danger: string;
    hairlineWidth: number;
  };
  accent: {
    primary: string;
    primaryDim: string;
    primaryGlow: string;
    onPrimary: string;
    crimson: string;
    crimsonDim: string;
    onCrimson: string;
    secondary: string;
    secondaryDim: string;
  };
  status: {
    success: string;
    successDim: string;
    onSuccess: string;
    warning: string;
    warningDim: string;
    info: string;
    infoDim: string;
    danger: string;
    dangerDim: string;
    onDanger: string;
    gold: string;
    goldDim: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
  space: typeof SPACE;
  radius: typeof RADIUS;
  touch: typeof TOUCH;
  icon: typeof ICON;
  font: typeof FONT_FAMILY;
  fontSize: typeof FONT_SIZE;
  typography: {
    hero: TextStyle;
    h1: TextStyle;
    h2: TextStyle;
    title: TextStyle;
    body: TextStyle;
    label: TextStyle;
    caption: TextStyle;
    overline: TextStyle;
    numericHero: TextStyle;
    numericLg: TextStyle;
    numericMd: TextStyle;
    numericSm: TextStyle;
    badge: TextStyle;
  };
  charts: {
    gridLine: string;
    primarySeries: string;
    secondarySeries: string;
    tertiarySeries: string;
    quaternarySeries: string;
    gradientTop: string;
    gradientBottom: string;
  };
  plates: {
    kg25: string;
    kg20: string;
    kg15: string;
    kg10: string;
    kg5: string;
    kg2_5: string;
    kg1_25: string;
    labelLight: string;
    labelDark: string;
  };
  gradients: {
    canvasGlow: readonly [string, string, string];
    surfaceSheen: readonly [string, string];
    voltSheen: readonly [string, string];
    crimsonSheen: readonly [string, string];
  };
}

const BASE_TYPOGRAPHY = {
  hero: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: FONT_SIZE.hero,
    letterSpacing: -1,
    includeFontPadding: false,
  } as TextStyle,
  h1: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: FONT_SIZE.xxl,
    letterSpacing: -0.6,
    includeFontPadding: false,
  } as TextStyle,
  h2: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: FONT_SIZE.xl,
    letterSpacing: -0.4,
    includeFontPadding: false,
  } as TextStyle,
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: FONT_SIZE.lg,
    letterSpacing: -0.3,
    includeFontPadding: false,
  } as TextStyle,
  body: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: FONT_SIZE.base,
    lineHeight: 21,
  } as TextStyle,
  label: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: FONT_SIZE.md,
    letterSpacing: -0.1,
  } as TextStyle,
  caption: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: FONT_SIZE.sm,
  } as TextStyle,
  overline: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: FONT_SIZE.xs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,
  numericHero: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 44,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
    includeFontPadding: false,
  } as TextStyle,
  numericLg: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
    includeFontPadding: false,
  } as TextStyle,
  numericMd: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
    includeFontPadding: false,
  } as TextStyle,
  numericSm: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
    includeFontPadding: false,
  } as TextStyle,
  badge: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  } as TextStyle,
};

// ─── OLED High-Contrast Dark Mode Tokens ──────────────────────────────────────
export const DARK_TOKENS: ThemeTokens = {
  isDark: true,
  bg: {
    canvas: '#09090B',
    surface: '#121215',
    elevated: '#1C1C21',
    glass: 'rgba(18, 18, 21, 0.72)',
    backdrop: 'rgba(9, 9, 11, 0.56)',
    overlay: 'rgba(9, 9, 11, 0.90)',
    mediaLight: '#FAFAFA',
  },
  border: {
    subtle: 'rgba(255, 255, 255, 0.08)',
    medium: 'rgba(255, 255, 255, 0.14)',
    focus: '#0A84FF',
    danger: '#FF3B30',
    hairlineWidth: StyleSheet.hairlineWidth,
  },
  accent: {
    primary: '#0A84FF',
    primaryDim: 'rgba(10, 132, 255, 0.14)',
    primaryGlow: 'rgba(10, 132, 255, 0.28)',
    onPrimary: '#FFFFFF',
    crimson: '#FF3B30',
    crimsonDim: 'rgba(255, 59, 48, 0.14)',
    onCrimson: '#FAFAFA',
    secondary: '#38BDF8',
    secondaryDim: 'rgba(56, 189, 248, 0.14)',
  },
  status: {
    success: '#30D158',
    successDim: 'rgba(48, 209, 88, 0.14)',
    onSuccess: '#09090B',
    warning: '#FF9F0A',
    warningDim: 'rgba(255, 159, 10, 0.16)',
    info: '#38BDF8',
    infoDim: 'rgba(56, 189, 248, 0.16)',
    danger: '#FF3B30',
    dangerDim: 'rgba(255, 59, 48, 0.16)',
    onDanger: '#FAFAFA',
    gold: '#FFD700',
    goldDim: 'rgba(255, 215, 0, 0.16)',
  },
  text: {
    primary: '#FAFAFA',
    secondary: '#A1A1AA',
    muted: '#52525B',
    inverse: '#09090B',
  },
  space: SPACE,
  radius: RADIUS,
  touch: TOUCH,
  icon: ICON,
  font: FONT_FAMILY,
  fontSize: FONT_SIZE,
  typography: BASE_TYPOGRAPHY,
  charts: {
    gridLine: 'rgba(255, 255, 255, 0.08)',
    primarySeries: '#0A84FF',
    secondarySeries: '#30D158',
    tertiarySeries: '#38BDF8',
    quaternarySeries: '#60A5FA',
    gradientTop: 'rgba(10, 132, 255, 0.24)',
    gradientBottom: 'rgba(10, 132, 255, 0.0)',
  },
  plates: {
    kg25: '#FF3B30',
    kg20: '#3B82F6',
    kg15: '#EAB308',
    kg10: '#22C55E',
    kg5: '#E4E4E7',
    kg2_5: '#3F3F46',
    kg1_25: '#71717A',
    labelLight: '#FAFAFA',
    labelDark: '#09090B',
  },
  gradients: {
    canvasGlow: ['rgba(10, 132, 255, 0.10)', 'rgba(18, 18, 21, 0.40)', '#09090B'] as const,
    surfaceSheen: ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.01)'] as const,
    voltSheen: ['#0A84FF', '#0066CC'] as const,
    crimsonSheen: ['#FF3B30', '#DC2626'] as const,
  },
};

// ─── Light Mode Token Parity ──────────────────────────────────────────────────
export const LIGHT_TOKENS: ThemeTokens = {
  isDark: false,
  bg: {
    canvas: '#F4F4F5',
    surface: '#FFFFFF',
    elevated: '#E4E4E7',
    glass: 'rgba(255, 255, 255, 0.84)',
    backdrop: 'rgba(9, 9, 11, 0.36)',
    overlay: 'rgba(255, 255, 255, 0.94)',
    mediaLight: '#FFFFFF',
  },
  border: {
    subtle: 'rgba(9, 9, 11, 0.08)',
    medium: 'rgba(9, 9, 11, 0.16)',
    focus: '#0A84FF',
    danger: '#DC2626',
    hairlineWidth: StyleSheet.hairlineWidth,
  },
  accent: {
    primary: '#0A84FF',
    primaryDim: 'rgba(10, 132, 255, 0.14)',
    primaryGlow: 'rgba(10, 132, 255, 0.28)',
    onPrimary: '#FFFFFF',
    crimson: '#DC2626',
    crimsonDim: 'rgba(220, 38, 38, 0.12)',
    onCrimson: '#FAFAFA',
    secondary: '#0284C7',
    secondaryDim: 'rgba(2, 132, 199, 0.12)',
  },
  status: {
    success: '#16A34A',
    successDim: 'rgba(22, 163, 74, 0.12)',
    onSuccess: '#FAFAFA',
    warning: '#D97706',
    warningDim: 'rgba(217, 119, 6, 0.12)',
    info: '#0284C7',
    infoDim: 'rgba(2, 132, 199, 0.12)',
    danger: '#DC2626',
    dangerDim: 'rgba(220, 38, 38, 0.12)',
    onDanger: '#FAFAFA',
    gold: '#CA8A04',
    goldDim: 'rgba(202, 138, 4, 0.14)',
  },
  text: {
    primary: '#09090B',
    secondary: '#52525B',
    muted: '#71717A',
    inverse: '#FAFAFA',
  },
  space: SPACE,
  radius: RADIUS,
  touch: TOUCH,
  icon: ICON,
  font: FONT_FAMILY,
  fontSize: FONT_SIZE,
  typography: BASE_TYPOGRAPHY,
  charts: {
    gridLine: 'rgba(9, 9, 11, 0.08)',
    primarySeries: '#0A84FF',
    secondarySeries: '#16A34A',
    tertiarySeries: '#0284C7',
    quaternarySeries: '#38BDF8',
    gradientTop: 'rgba(10, 132, 255, 0.16)',
    gradientBottom: 'rgba(10, 132, 255, 0.0)',
  },
  plates: {
    kg25: '#DC2626',
    kg20: '#2563EB',
    kg15: '#CA8A04',
    kg10: '#16A34A',
    kg5: '#E4E4E7',
    kg2_5: '#3F3F46',
    kg1_25: '#71717A',
    labelLight: '#FAFAFA',
    labelDark: '#09090B',
  },
  gradients: {
    canvasGlow: ['rgba(10, 132, 255, 0.06)', 'rgba(255, 255, 255, 0.40)', '#F4F4F5'] as const,
    surfaceSheen: ['rgba(9, 9, 11, 0.03)', 'rgba(9, 9, 11, 0.0)'] as const,
    voltSheen: ['#0A84FF', '#0066CC'] as const,
    crimsonSheen: ['#DC2626', '#B91C1C'] as const,
  },
};

export const TOKENS = DARK_TOKENS;

// ─── Backwards-Compatible Token Adapters ──────────────────────────────────────
// Preserves legacy imports while routing every value to the unified OLED spec.
export const IOS_DARK = {
  bgCanvas: DARK_TOKENS.bg.canvas,
  bgGroupedCard: DARK_TOKENS.bg.surface,
  bgElevatedInput: DARK_TOKENS.bg.elevated,
  SURFACE_BASE: DARK_TOKENS.bg.canvas,
  SURFACE_ELEVATED: DARK_TOKENS.bg.surface,
  SURFACE_OVERLAY: DARK_TOKENS.bg.elevated,
  separator: DARK_TOKENS.border.subtle,
  labelPrimary: DARK_TOKENS.text.primary,
  labelSecondary: DARK_TOKENS.text.secondary,
  labelTertiary: DARK_TOKENS.text.muted,
  accent: DARK_TOKENS.accent.primary,
  green: DARK_TOKENS.status.success,
  orange: DARK_TOKENS.status.warning,
  red: DARK_TOKENS.status.danger,
} as const;

export const DARK_COLORS = {
  background: DARK_TOKENS.bg.canvas,
  surface: DARK_TOKENS.bg.surface,
  surface2: DARK_TOKENS.bg.elevated,
  surfaceRaised: DARK_TOKENS.bg.elevated,
  border: DARK_TOKENS.border.subtle,
  borderHover: DARK_TOKENS.border.medium,
  borderGlow: DARK_TOKENS.accent.primaryGlow,
  textPrimary: DARK_TOKENS.text.primary,
  textSecondary: DARK_TOKENS.text.secondary,
  textMuted: DARK_TOKENS.text.secondary,
  textTertiary: DARK_TOKENS.text.muted,
  accentPrimary: DARK_TOKENS.accent.primary,
  accentLight: DARK_TOKENS.accent.primary,
  accentDim: DARK_TOKENS.accent.primaryDim,
  accentGlow: DARK_TOKENS.accent.primaryGlow,
  onAccent: DARK_TOKENS.accent.onPrimary,
  accentGreen: DARK_TOKENS.status.success,
  accentGreenDim: DARK_TOKENS.status.successDim,
  accentGreenGlow: 'rgba(48, 209, 88, 0.28)',
  accentAmber: DARK_TOKENS.status.warning,
  accentAmberDim: DARK_TOKENS.status.warningDim,
  accentBlue: DARK_TOKENS.status.info,
  accentBlueDim: DARK_TOKENS.status.infoDim,
  accentSecondary: DARK_TOKENS.accent.secondary,
  error: DARK_TOKENS.status.danger,
  errorBg: DARK_TOKENS.status.dangerDim,
  priorityHigh: DARK_TOKENS.status.danger,
  priorityMed: DARK_TOKENS.status.warning,
  priorityLow: DARK_TOKENS.status.success,
  success: DARK_TOKENS.status.success,
};

export const LIGHT_COLORS: typeof DARK_COLORS = {
  background: LIGHT_TOKENS.bg.canvas,
  surface: LIGHT_TOKENS.bg.surface,
  surface2: LIGHT_TOKENS.bg.elevated,
  surfaceRaised: LIGHT_TOKENS.bg.surface,
  border: LIGHT_TOKENS.border.subtle,
  borderHover: LIGHT_TOKENS.border.medium,
  borderGlow: LIGHT_TOKENS.accent.primaryGlow,
  textPrimary: LIGHT_TOKENS.text.primary,
  textSecondary: LIGHT_TOKENS.text.secondary,
  textMuted: LIGHT_TOKENS.text.secondary,
  textTertiary: LIGHT_TOKENS.text.muted,
  accentPrimary: LIGHT_TOKENS.accent.primary,
  accentLight: LIGHT_TOKENS.accent.primary,
  accentDim: LIGHT_TOKENS.accent.primaryDim,
  accentGlow: LIGHT_TOKENS.accent.primaryGlow,
  onAccent: LIGHT_TOKENS.accent.onPrimary,
  accentGreen: LIGHT_TOKENS.status.success,
  accentGreenDim: LIGHT_TOKENS.status.successDim,
  accentGreenGlow: 'rgba(22, 163, 74, 0.24)',
  accentAmber: LIGHT_TOKENS.status.warning,
  accentAmberDim: LIGHT_TOKENS.status.warningDim,
  accentBlue: LIGHT_TOKENS.status.info,
  accentBlueDim: LIGHT_TOKENS.status.infoDim,
  accentSecondary: LIGHT_TOKENS.accent.secondary,
  error: LIGHT_TOKENS.status.danger,
  errorBg: LIGHT_TOKENS.status.dangerDim,
  priorityHigh: LIGHT_TOKENS.status.danger,
  priorityMed: LIGHT_TOKENS.status.warning,
  priorityLow: LIGHT_TOKENS.status.success,
  success: LIGHT_TOKENS.status.success,
};

export const COLORS = DARK_COLORS;

// ─── Shadows ──────────────────────────────────────────────────────────────────
const IS_ANDROID = Platform.OS === 'android';

export const SHADOW = {
  sm: {
    shadowColor: DARK_TOKENS.bg.canvas,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: IS_ANDROID ? 1 : 3,
  } as ViewStyle,
  md: {
    shadowColor: DARK_TOKENS.bg.canvas,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: IS_ANDROID ? 2 : 6,
  } as ViewStyle,
  lg: {
    shadowColor: DARK_TOKENS.bg.canvas,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: IS_ANDROID ? 3 : 14,
  } as ViewStyle,
  accent: (color: string = DARK_TOKENS.accent.primary): ViewStyle => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: IS_ANDROID ? 4 : 10,
  }),
};
