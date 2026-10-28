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

  // ── Top Header: Compact Structural Row + Apple Actions ─────────────────────
  headerContainer: {
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleGroup: {
    flex: 1,
    paddingRight: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.3,
    color: isDark ? IOS_DARK.labelPrimary : colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.medium,
    color: isDark ? IOS_DARK.labelSecondary : colors.textTertiary,
    marginTop: 2,
  },
  headerDateBadge: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.medium,
    color: isDark ? IOS_DARK.labelSecondary : colors.textTertiary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plainIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? '#FFFFFF' : '#000000',
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 999,
  },
  primaryActionText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: isDark ? '#000000' : '#FFFFFF',
  },

  // ── Week Strip: Inset Grouped Apple Calendar Card ─────────────────────────
  weekStripCard: {
    backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface,
    borderRadius: 16,
    padding: 10,
    borderWidth: 0,
    gap: 8,
  },
  weekStripHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  weekStripMonthText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: isDark ? IOS_DARK.labelSecondary : colors.textTertiary,
  },
  weekNavBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weekNavBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekTodayBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA',
  },
  weekTodayBtnText: {
    fontSize: 10.5,
    fontFamily: FONT_FAMILY.bold,
    color: isDark ? '#FFFFFF' : '#000000',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  dayColActive: {
    backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA',
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
  dayNum: {
    fontSize: 13,
    color: isDark ? IOS_DARK.labelPrimary : colors.textPrimary,
    fontFamily: FONT_FAMILY.bold,
    textAlign: 'center',
  },
  dayNumActive: {
    color: isDark ? '#FFFFFF' : '#000000',
    fontFamily: FONT_FAMILY.bold,
    textAlign: 'center',
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dayTodayDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    marginTop: -2,
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
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: isDark ? IOS_DARK.labelSecondary : colors.textTertiary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: isDark ? '#FFFFFF' : '#000000',
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 999,
  },
  sectionActionText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: isDark ? '#000000' : '#FFFFFF',
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
    marginLeft: 14,
    marginRight: 14,
  },

  // ── Hero Exercise Card & Fused Superset Containers ────────────────────────
  exerciseCardContainer: {
    backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 0,
    overflow: 'hidden',
  },
  supersetCardContainer: {
    backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 0,
    borderLeftWidth: 3.5,
    borderLeftColor: '#FF9F0A',
    overflow: 'hidden',
  },
  supersetHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: isDark ? 'rgba(255,159,10,0.07)' : 'rgba(255,159,10,0.05)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: isDark ? 'rgba(255,159,10,0.18)' : 'rgba(217,119,6,0.15)',
  },
  supersetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  supersetHeaderTitle: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: '#FF9F0A',
    letterSpacing: 0.6,
  },
  supersetHeaderSubtitle: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.medium,
    color: isDark ? 'rgba(255,159,10,0.7)' : 'rgba(180,83,9,0.7)',
    letterSpacing: 0.3,
  },
  supersetConnectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 14,
    backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)',
  },
  supersetConnectorLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: isDark ? 'rgba(255,159,10,0.18)' : 'rgba(217,119,6,0.18)',
  },
  supersetConnectorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: isDark ? 'rgba(255,159,10,0.1)' : 'rgba(255,159,10,0.08)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,159,10,0.22)' : 'rgba(217,119,6,0.18)',
    marginHorizontal: 8,
  },
  supersetConnectorText: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.bold,
    color: '#FF9F0A',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // ── Two-Zone Hero Row ─────────────────────────────────────────────────────
  rowWrapper: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
  },
  heroLeftTouchZone: {
    flex: 1,
    paddingRight: 10,
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: isDark ? IOS_DARK.labelPrimary : colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  cardMuscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  muscleDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  cardMuscleText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: isDark ? IOS_DARK.labelSecondary : colors.textSecondary,
  },
  cardSnippetInline: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: isDark ? IOS_DARK.labelTertiary : colors.textMuted,
  },
  heroSegmentsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    marginLeft: 4,
  },
  heroSegmentBar: {
    width: 7,
    height: 2.5,
    borderRadius: 1.5,
  },
  heroSegmentCompleted: {
    backgroundColor: '#30D158',
  },
  heroSegmentPending: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)',
  },
  heroProgressText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: isDark ? IOS_DARK.labelTertiary : colors.textMuted,
  },
  rowSubtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: isDark ? IOS_DARK.labelSecondary : colors.textMuted,
    marginTop: 2,
  },

  // ── Two-Zone Right Action Area ────────────────────────────────────────────
  heroRightActionZone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroKebabBtn: {
    padding: 4,
  },
  heroCheckmarkBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.22)' : '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  heroCheckmarkBtnCompleted: {
    backgroundColor: '#30D158',
    borderColor: '#30D158',
  },
  heroCheckmarkHollow: {
    width: 0,
    height: 0,
  },

  // Legacy compatibility
  checkboxCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.22)' : '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleDone: {
    backgroundColor: '#30D158',
    borderColor: '#30D158',
  },
  checkboxHollow: {
    width: 0,
    height: 0,
  },
  rowTextCol: {
    flex: 1,
    gap: 2,
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
