import { Platform } from 'react-native';

/**
 * ZenTrack Mobile — Unified Apple iOS Design System
 *
 * Strict 3-layer OLED hierarchy matching Apple iOS Human Interface Guidelines (HIG):
 * Canvas (#000000) -> GroupedCard (#1C1C1E) -> ElevatedInput (#2C2C2E)
 */

// ── Unified Apple iOS Dark Theme ──────────────────────────────────────────────
export const IOS_DARK = {
  // 1. THREE STRICT SURFACES (Never invent another grey)
  bgCanvas:        '#000000', // Pure OLED black root background everywhere
  bgGroupedCard:   '#1C1C1E', // iOS systemSecondaryBackground (All cards & grouped lists)
  bgElevatedInput: '#2C2C2E', // iOS systemTertiaryBackground (Inputs, segmented controls, active pills)

  // 2. HAIRLINE SEPARATOR (No 1px outer borders on cards!)
  separator:       'rgba(84, 84, 88, 0.36)', // iOS native hairline divider (#38383A)

  // 3. TYPOGRAPHY HIERARCHY
  labelPrimary:    '#FFFFFF',
  labelSecondary:  '#8E8E93', // iOS systemGray
  labelTertiary:   '#48484A', // iOS systemGray3

  // 4. SEMANTIC ACCENTS (Used sparingly—text & icons, not giant backgrounds)
  accent:          '#A599FF', // Brand Indigo/Violet
  green:           '#30D158', // iOS systemGreen (Completed sets, PRs, Fresh muscle)
  orange:          '#FF9F0A', // iOS systemOrange (Active workout, Warmup, Recovering)
  red:             '#FF453A', // iOS systemRed (Fatigued, Delete, Failure 0 RIR)
};

// ── Dark Theme: "Obsidian Cosmos" (Aligned with IOS_DARK) ─────────────────────
export const DARK_COLORS = {

  // ── Backgrounds ─────────────────────────────────────────────────────────────
  background:    IOS_DARK.bgCanvas,        // Pure OLED pitch black canvas
  surface:       IOS_DARK.bgGroupedCard,   // iOS systemSecondaryBackground for cards & rows (#1C1C1E)
  surface2:      IOS_DARK.bgElevatedInput, // iOS systemTertiaryBackground (#2C2C2E)
  surfaceRaised: IOS_DARK.bgGroupedCard,   // Elevated modals, sheets & action cards (#1C1C1E)

  // ── Borders ─────────────────────────────────────────────────────────────────
  border:        IOS_DARK.separator,       // iOS native hairline divider
  borderHover:   '#3A3A3C',
  borderGlow:    'rgba(165,153,255,0.40)',

  // ── Text ────────────────────────────────────────────────────────────────────
  textPrimary:   IOS_DARK.labelPrimary,    // '#FFFFFF'
  textSecondary: '#F2F2F7',                // Body text on cards
  textMuted:     IOS_DARK.labelSecondary,  // iOS systemGray (#8E8E93)
  textTertiary:  IOS_DARK.labelTertiary,   // iOS systemGray3 (#48484A)

  // ── Accent — Purple ─────────────────────────────────────────────────────────
  accentPrimary:  IOS_DARK.accent,         // #A599FF
  accentLight:    '#B8AFFF',
  accentDim:      'rgba(165,153,255,0.15)',
  accentGlow:     'rgba(165,153,255,0.24)',

  // ── Success / Present — Green ───────────────────────────────────────────────
  accentGreen:     IOS_DARK.green,         // #30D158
  accentGreenDim:  'rgba(48,209,88,0.12)',
  accentGreenGlow: 'rgba(48,209,88,0.28)',

  // ── Warning / At Risk — Orange ──────────────────────────────────────────────
  accentAmber:    IOS_DARK.orange,         // #FF9F0A
  accentAmberDim: 'rgba(255,159,10,0.12)',

  // ── Sky Blue — Calendar / Schedule ──────────────────────────────────────────
  accentBlue:      '#64D2FF',              // iOS systemTeal / sky blue
  accentBlueDim:   'rgba(100,210,255,0.14)',
  accentSecondary: '#64D2FF',

  // ── Danger / Absent — Red ───────────────────────────────────────────────────
  error:    IOS_DARK.red,                  // #FF453A
  errorBg:  'rgba(255,69,58,0.12)',

  // ── Priority Colors ─────────────────────────────────────────────────────────
  priorityHigh:   IOS_DARK.red,
  priorityMed:    IOS_DARK.orange,
  priorityLow:    IOS_DARK.green,
  success:        IOS_DARK.green,

  // ── S.A.R.A Agent Colors ────────────────────────────────────────────────────
  agents: {
    ORACLE:      '#A599FF',
    HERMES:      '#FF9F0A',
    CHRONOS:     '#64D2FF',
    TITAN:       '#30D158',
    AEGIS:       '#63E6E2',
    HEPHAESTUS:  '#FF9F0A',
    GAINS:       '#FF453A',
  },
};

// ── Light Theme: "Frost Quartz" ───────────────────────────────────────────────
// iOS-native feel: warm off-white system background (#F4F3F8), deep charcoal text, rich royal amethyst accent (#6C5CE7).
export const LIGHT_COLORS = {

  // ── Backgrounds ─────────────────────────────────────────────────────────────
  background:    '#F4F3F8',              // warm alabaster / frost lilac canvas
  surface:       '#ffffff',              // crisp pure quartz white cards
  surface2:      '#F0EFF7',              // soft cool inset surface / secondary cards
  surfaceRaised: '#ffffff',              // modals / raised cards

  // ── Borders ─────────────────────────────────────────────────────────────────
  border:        '#E2E1EA',              // muted titanium lavender hairline
  borderHover:   '#D1D0DA',              // interactive hover state
  borderGlow:    'rgba(108,92,231,0.30)', // focus / active glow

  // ── Text ────────────────────────────────────────────────────────────────────
  textPrimary:   '#1C1C1E',              // Apple dark charcoal / jet black
  textSecondary: '#4B5563',              // graphite muted body text
  textMuted:     '#636366',              // secondary labels / inactive icons
  textTertiary:  '#8E8E93',              // tertiary label / timestamps / placeholders

  // ── Accent — Purple / Royal Amethyst ────────────────────────────────────────
  accentPrimary:  '#6C5CE7',             // Rich royal amethyst for crisp daylight contrast
  accentLight:    '#8274E8',             // hover state
  accentDim:      'rgba(108,92,231,0.12)', // tinted bg
  accentGlow:     'rgba(108,92,231,0.20)', // ambient glow

  // ── Success — Green ─────────────────────────────────────────────────────────
  accentGreen:     '#059669',            // deep emerald green
  accentGreenDim:  'rgba(5,150,105,0.10)',
  accentGreenGlow: 'rgba(5,150,105,0.24)',

  // ── Warning — Orange / Amber ────────────────────────────────────────────────
  accentAmber:    '#D97706',             // warm golden amber
  accentAmberDim: 'rgba(217,119,6,0.10)',

  // ── Sky Blue ─────────────────────────────────────────────────────────────────
  accentBlue:      '#0284C7',            // crisp ocean blue
  accentBlueDim:   'rgba(2,132,199,0.10)',
  accentSecondary: '#0284C7',

  // ── Danger — Red ─────────────────────────────────────────────────────────────
  error:    '#DC2626',                   // crisp crimson red
  errorBg:  'rgba(220,38,38,0.10)',

  // ── Priority ─────────────────────────────────────────────────────────────────
  priorityHigh:   '#DC2626',
  priorityMed:    '#D97706',
  priorityLow:    '#059669',
  success:        '#059669',

  // ── S.A.R.A Agent Colors (adjusted for high-contrast light mode readability) ───
  agents: {
    ORACLE:      '#6C5CE7',
    HERMES:      '#EA580C',
    CHRONOS:     '#0284C7',
    TITAN:       '#059669',
    AEGIS:       '#0D9488',
    HEPHAESTUS:  '#EA580C',
    GAINS:       '#DC2626',
  },
};

// ── Backwards-compat default export (default light — screens not yet theme-aware use this) ──
// Theme-aware code should use `useTheme().colors` from ThemeContext instead.
export const COLORS = LIGHT_COLORS;


// ─── Radius ───────────────────────────────────────────────────────────────────

export const RADIUS = {
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  xxl:  24,
  full: 999,
};

// ─── Spacing ──────────────────────────────────────────────────────────────────
// 8px base grid. All spacing is multiples of 4. Breathing room is cognitive rest.

export const SPACE = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  '2xl': 28,
  xxxl: 40,
  '3xl': 40,
};

// ─── Font ─────────────────────────────────────────────────────────────────────
// Keys must EXACTLY match useFonts() keys in App.tsx

export const FONT_FAMILY = {
  title:   'PlayfairDisplay_600SemiBold', // Editorial — headings, names
  heading: 'PlayfairDisplay_600SemiBold', // Alias for title (back-compat)
  serif:   'PlayfairDisplay_600SemiBold', // Alias for title (back-compat)
  body:    'Inter_400Regular',            // Readable — body text, labels
  regular: 'Inter_400Regular',            // Alias for body (back-compat)
  medium:  'Inter_500Medium',             // Emphasis — subheadings, amounts
  bold:    'Inter_600SemiBold',           // Strong — CTAs, stats
  mono:    'Inter_400Regular',            // Mono alias — back-compat
};

export const FONT_SIZE = {
  xs:   10,
  sm:   12,
  md:   14,
  base: 15,
  lg:   17,
  xl:   20,
  xxl:  26,
  hero: 40,
};

// ─── Shadows ──────────────────────────────────────────────────────────────────
// Shadows use the accent color at low opacity for an ambient glow effect,
// rather than plain black — creates a sense that surfaces float.

// Android note: shadowColor / shadowOffset / shadowOpacity / shadowRadius are iOS-only.
// On Android only `elevation` has an effect — and high values trigger an expensive
// RenderThread shadow pass on every frame. Keep Android elevation values minimal.
const IS_ANDROID = Platform.OS === 'android';

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: IS_ANDROID ? 1 : 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: IS_ANDROID ? 2 : 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: IS_ANDROID ? 3 : 14,
  },
  // Coloured ambient glow — use on accent buttons, progress rings, orbs.
  // iOS: uses shadowColor tint for ambient glow. Android: elevation only (no color).
  // FIX #11: Default was #cba6f7 (wrong theme purple). Corrected to ZenTrack's actual accent.
  accent: (color: string = '#a599ff') => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: IS_ANDROID ? 4 : 10,
  }),
};

// ── Layout Metrics ────────────────────────────────────────────────────────────
export const TAB_BAR_HEIGHT = 49;
