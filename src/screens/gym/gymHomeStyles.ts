/**
 * gymHomeStyles.ts — ZenTrack Gym Module
 *
 * Unified Apple iOS Human Interface Guidelines (HIG) stylesheet factory:
 * - 0px outer borders on cards
 * - Inset grouped containers (#1C1C1E)
 * - 6px universal horizontal margin
 * - Hairline dividers (0.5px) indented 52px
 * - Large title & plain icon buttons
 */
import { StyleSheet } from 'react-native';
import { IOS_DARK, FONT_FAMILY } from '../../theme/tokens';

const stylesCache = new Map<string, any>();

export const makeStyles = (colors: any, isDark: boolean = true) => {
  const cacheKey = `${isDark ? 'dark' : 'light'}_${colors?.background || ''}_${colors?.card || ''}_${colors?.textPrimary || ''}`;
  let cached = stylesCache.get(cacheKey);
  if (cached) return cached;

  const styles = StyleSheet.create({
    root: {
    flex: 1,
    backgroundColor: isDark ? IOS_DARK.bgCanvas : colors.background,
  },
  scrollContent: {
    paddingHorizontal: 6,
    paddingBottom: 110,
    gap: 10,
  },

  // ── Top Header: Compact Structural Row + Plain Icons ───────────────────────
  headerContainer: {
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.3,
    color: isDark ? IOS_DARK.labelPrimary : colors.textPrimary,
  },
  headerDateBadge: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.medium,
    color: isDark ? IOS_DARK.labelSecondary : colors.textTertiary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  plainIconBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Week Strip: Typographic with no border boxes ──────────────────────────
  weekStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
    marginBottom: 0,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  weekNavBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCol: {
    alignItems: 'center',
    gap: 3,
    width: 34,
  },
  dayLetter: {
    fontSize: 11,
    color: isDark ? IOS_DARK.labelSecondary : colors.textTertiary,
    fontFamily: FONT_FAMILY.medium,
  },
  dayLetterActive: {
    color: isDark ? IOS_DARK.labelPrimary : colors.textPrimary,
    fontFamily: FONT_FAMILY.bold,
  },
  dayPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dayPillActive: {
    backgroundColor: isDark ? IOS_DARK.accent : colors.accentPrimary,
    borderRadius: 15,
    overflow: 'hidden',
  },
  dayNum: {
    fontSize: 13,
    color: isDark ? IOS_DARK.labelPrimary : colors.textPrimary,
    fontFamily: FONT_FAMILY.bold,
    textAlign: 'center',
  },
  dayNumActive: {
    color: isDark ? '#000000' : '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },

  // ── Sections & Inset Grouped Lists ────────────────────────────────────────
  section: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: isDark ? IOS_DARK.labelSecondary : colors.textTertiary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: isDark ? 'rgba(165,153,255,0.12)' : 'rgba(108,92,231,0.08)',
  },
  sectionActionText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: isDark ? IOS_DARK.accent : colors.accentPrimary,
  },
  insetGroupedCard: {
    backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0, // Apple HIG: Zero outer border
  },
  hairlineDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: isDark ? IOS_DARK.separator : 'rgba(0,0,0,0.1)',
    marginLeft: 52, // Indented to align with text
  },

  // ── Exercise Row (Inside Inset Grouped Card) ──────────────────────────────
  rowWrapper: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: isDark ? '#38383A' : '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  checkboxCircleDone: {
    backgroundColor: IOS_DARK.green,
    borderColor: IOS_DARK.green,
  },
  checkboxHollow: {
    width: 0,
    height: 0,
  },
  rowTextCol: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
    color: isDark ? IOS_DARK.labelPrimary : colors.textPrimary,
    letterSpacing: -0.2,
  },
  rowSubtitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.body,
    color: isDark ? IOS_DARK.labelSecondary : colors.textMuted,
  },
  supersetTag: {
    backgroundColor: 'rgba(255,159,10,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  supersetTagText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    color: IOS_DARK.orange,
  },
  textStrikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.55,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    padding: 6,
  },

  // ── Cardio Row ────────────────────────────────────────────────────────────
  cardioIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: isDark ? '#2C2C2E' : 'rgba(100,210,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardioIconWrapDone: {
    backgroundColor: IOS_DARK.green,
  },

  // ── Rest Day Surface ──────────────────────────────────────────────────────
  restCard: {
    backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 0,
    gap: 12,
  },
  restIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(48,209,88,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
    color: isDark ? IOS_DARK.labelPrimary : colors.textPrimary,
  },
  restBody: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.body,
    color: isDark ? IOS_DARK.labelSecondary : colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },

  // ── Themed Action Sheet Menu Styles ──────────────────────────────────────
  menuActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: isDark ? IOS_DARK.bgElevatedInput : '#F5F4FA',
    marginBottom: 6,
    gap: 12,
    borderWidth: 0,
  },
  menuActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuActionTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
    color: isDark ? IOS_DARK.labelPrimary : colors.textPrimary,
  },
  menuActionSub: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.body,
    color: isDark ? IOS_DARK.labelSecondary : colors.textMuted,
    marginTop: 2,
  },
  menuCancelBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E1EA',
  },
  menuCancelText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
    color: isDark ? IOS_DARK.labelPrimary : colors.textPrimary,
  },
});

  stylesCache.set(cacheKey, styles);
  return styles;
};

export default makeStyles;
