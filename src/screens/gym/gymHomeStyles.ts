/**
 * gymHomeStyles.ts — ZenFit Gym Module
 *
 * Centralized OLED Design Token stylesheet factory:
 * - Canvas (#09090B) -> Surface (#121215) -> Elevated (#1C1C21)
 * - Concentric radii: Card (16) -> Inner tile/pill (10)
 * - 4pt/8pt spacing grid & 48dp touch ergonomics
 * - Tabular numerals on counters, dates, and workout stats
 */
import { StyleSheet } from 'react-native';
import {
  DARK_TOKENS,
  LIGHT_TOKENS,
  ThemeTokens,
  FONT_FAMILY,
  SPACE,
  RADIUS,
  TOUCH,
} from '../../theme/tokens';

const stylesCache = new Map<string, any>();

export const makeStyles = (
  colors: any,
  isDark: boolean = true,
  tokens?: ThemeTokens,
) => {
  const t = tokens || (isDark ? DARK_TOKENS : LIGHT_TOKENS);
  const voidBg = isDark ? '#050507' : t.bg.canvas;
  const stageBg = isDark ? '#0F1015' : '#FFFFFF';
  const sheetBg = isDark ? '#0B0C10' : '#F8F8FA';
  const sheetSurface = isDark ? '#14161D' : '#FFFFFF';
  const hairline = isDark ? 'rgba(255, 255, 255, 0.08)' : t.border.subtle;
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.10)' : t.border.subtle;
  const cacheKey = `${isDark ? 'dark' : 'light'}_${voidBg}_${t.accent.primary}_${t.text.primary}_${t.status.success}_${t.border.subtle}`;
  const cached = stylesCache.get(cacheKey);
  if (cached) return cached;

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: voidBg,
    },
    scrollContent: {
      paddingHorizontal: SPACE[12],
      paddingBottom: 120,
      gap: 14,
    },

    // ── Top Header: Compact Structural Row + Actions ────────────────────────
    headerContainer: {
      paddingHorizontal: SPACE[12],
      paddingTop: SPACE[4],
      paddingBottom: SPACE[8],
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitleGroup: {
      flex: 1,
      paddingRight: SPACE[8],
    },
    headerTitle: {
      fontSize: 24,
      fontFamily: FONT_FAMILY.bold,
      letterSpacing: -0.3,
      color: t.text.primary,
    },
    headerSubtitle: {
      fontSize: 12.5,
      fontFamily: FONT_FAMILY.medium,
      color: t.text.secondary,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    headerDateBadge: {
      fontSize: 12.5,
      fontFamily: FONT_FAMILY.medium,
      color: t.text.secondary,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE[8],
      flexShrink: 0,
    },
    plainIconBtn: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.inner,
      backgroundColor: t.bg.elevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryActionBtn: {
      minHeight: 32,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: t.accent.primary,
      paddingHorizontal: 14,
      borderRadius: RADIUS.inner,
      flexShrink: 0,
    },
    primaryActionText: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.bold,
      color: t.accent.onPrimary,
      includeFontPadding: false,
    },
    swapRoutineBtn: {
      minHeight: 32,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : t.bg.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: cardBorder,
      paddingHorizontal: 12,
      borderRadius: 16,
      flexShrink: 0,
    },
    swapRoutineBtnText: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.bold,
      color: t.text.primary,
      includeFontPadding: false,
    },

    // ── Borderless Hairline Week Strip ──────────────────────────────────────
    weekStripCard: {
      backgroundColor: 'transparent',
      paddingTop: SPACE[4],
      paddingBottom: SPACE[12],
      paddingHorizontal: 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: hairline,
      gap: SPACE[8],
    },
    weekProgressBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      flexShrink: 0,
    },
    weekProgressBadgeText: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.bold,
      letterSpacing: -0.1,
      fontVariant: ['tabular-nums'],
    },
    weekStripHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACE[8],
      minWidth: 0,
      paddingHorizontal: 2,
    },
    weekStripMonthText: {
      flexShrink: 1,
      minWidth: 0,
      fontSize: 11,
      fontFamily: FONT_FAMILY.bold,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
      color: t.text.secondary,
      fontVariant: ['tabular-nums'],
    },
    weekNavBtns: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE[12],
      flexShrink: 0,
    },
    weekNavBtn: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.full,
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    },
    weekTodayBtn: {
      minHeight: 26,
      paddingHorizontal: 10,
      borderRadius: RADIUS.sm,
      backgroundColor: t.accent.primaryDim,
      justifyContent: 'center',
      alignItems: 'center',
    },
    weekTodayBtnText: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.bold,
      color: t.accent.primary,
    },
    weekDaysContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 4,
    },
    dayCol: {
      flex: 1,
      minHeight: TOUCH.minTarget,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      borderRadius: RADIUS.inner,
      gap: 4,
      minWidth: 0,
    },
    dayColActive: {
      backgroundColor: isDark ? 'rgba(10, 132, 255, 0.14)' : t.accent.primaryDim,
    },
    dayLetter: {
      fontSize: 11,
      color: t.text.muted,
      fontFamily: FONT_FAMILY.medium,
      includeFontPadding: false,
    },
    dayLetterActive: {
      color: t.accent.primary,
      fontFamily: FONT_FAMILY.bold,
      includeFontPadding: false,
    },
    dayNum: {
      fontSize: 14,
      color: t.text.primary,
      fontFamily: FONT_FAMILY.bold,
      textAlign: 'center',
      includeFontPadding: false,
      fontVariant: ['tabular-nums'],
    },
    dayNumActive: {
      color: t.text.primary,
      fontFamily: FONT_FAMILY.bold,
      textAlign: 'center',
      includeFontPadding: false,
      fontVariant: ['tabular-nums'],
    },
    dayDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    dayTodayDot: {
      width: 0,
      height: 0,
    },

    // ── Workouts Left This Week Countdown Pill ──────────────────────────────
    weekCountdownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: SPACE[8],
      marginTop: 2,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border.subtle,
      paddingHorizontal: SPACE[4],
    },
    weekCountdownLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE[8],
    },
    weekCountdownText: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.bold,
      color: t.text.primary,
      letterSpacing: -0.1,
    },
    weekSegmentsWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    weekSegmentDash: {
      width: 14,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.border.medium,
    },
    weekSegmentDashFilled: {
      backgroundColor: t.status.success,
    },

    // ── Programme Horizon Strip ─────────────────────────────────────────────
    programmeHorizonStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACE[8],
      backgroundColor: 'transparent',
      paddingHorizontal: 6,
      paddingVertical: SPACE[8],
      borderLeftWidth: 2.5,
      borderLeftColor: t.accent.primary,
    },
    programmeHorizonLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE[8],
      flex: 1,
      minWidth: 0,
      paddingRight: SPACE[8],
    },
    programmeHorizonDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: t.status.success,
      flexShrink: 0,
    },
    programmeHorizonPhase: {
      flexShrink: 1,
      minWidth: 0,
      fontSize: 12.5,
      fontFamily: FONT_FAMILY.bold,
      color: t.text.primary,
      fontVariant: ['tabular-nums'],
    },
    programmeHorizonRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE[8],
      flexShrink: 0,
    },
    programmeHorizonMeta: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.medium,
      color: t.text.secondary,
      fontVariant: ['tabular-nums'],
    },
    programmeHorizonLink: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.bold,
      color: t.accent.primary,
    },
    programmeBannerCard: {
      backgroundColor: t.bg.surface,
      borderRadius: RADIUS.card,
      padding: SPACE[16],
      gap: SPACE[8],
      borderWidth: 1,
      borderColor: t.border.subtle,
      borderLeftWidth: 3.5,
      borderLeftColor: t.accent.primary,
    },
    programmeBannerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    programmePhaseBadge: {
      paddingHorizontal: SPACE[8],
      paddingVertical: 3,
      borderRadius: RADIUS.sm,
      backgroundColor: t.accent.primaryDim,
    },
    programmePhaseBadgeText: {
      fontSize: 9.5,
      fontFamily: FONT_FAMILY.bold,
      color: t.accent.primary,
      letterSpacing: 0.5,
    },
    programmeWeekCounter: {
      fontSize: 10.5,
      fontFamily: FONT_FAMILY.bold,
      color: t.text.secondary,
      letterSpacing: 0.4,
      fontVariant: ['tabular-nums'],
    },
    programmeTitle: {
      fontSize: 15,
      fontFamily: FONT_FAMILY.bold,
      color: t.text.primary,
      letterSpacing: -0.2,
    },
    programmeSubtitle: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.regular,
      color: t.text.secondary,
      lineHeight: 16,
    },
    programmeStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: SPACE[4],
    },
    programmeStatPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: SPACE[8],
      paddingVertical: 4,
      borderRadius: RADIUS.sm,
      backgroundColor: t.bg.elevated,
    },
    programmeStatPillText: {
      fontSize: 10.5,
      fontFamily: FONT_FAMILY.bold,
      color: t.text.primary,
      fontVariant: ['tabular-nums'],
    },
    programmeManageBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: SPACE[4],
      paddingHorizontal: SPACE[8],
    },
    programmeManageBtnText: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.bold,
      color: t.accent.primary,
    },

    // ── Sections & Grouped Lists ────────────────────────────────────────────
    section: {
      gap: SPACE[8],
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
      marginBottom: 4,
    },
    sectionLabel: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.bold,
      color: t.text.secondary,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
      includeFontPadding: false,
    },
    sectionCountBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: RADIUS.sm,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : t.bg.elevated,
    },
    sectionCountText: {
      fontSize: 10.5,
      fontFamily: FONT_FAMILY.bold,
      color: t.text.secondary,
      includeFontPadding: false,
      fontVariant: ['tabular-nums'],
    },
    sectionActionBtn: {
      minHeight: 28,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'transparent',
      paddingHorizontal: 4,
      flexShrink: 0,
    },
    sectionActionText: {
      fontSize: 12.5,
      fontFamily: FONT_FAMILY.bold,
      color: t.accent.primary,
      includeFontPadding: false,
    },
    insetGroupedCard: {
      backgroundColor: stageBg,
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: cardBorder,
    },
    emptyPlanCard: {
      backgroundColor: stageBg,
      borderRadius: 20,
      padding: SPACE[24],
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: cardBorder,
    },
    emptyPlanTitle: {
      fontSize: 15,
      fontFamily: FONT_FAMILY.bold,
      color: t.text.primary,
      marginBottom: SPACE[4],
    },
    emptyPlanSub: {
      fontSize: 13,
      fontFamily: FONT_FAMILY.body,
      color: t.text.secondary,
      textAlign: 'center',
      lineHeight: 18,
    },
    hairlineDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: hairline,
      marginLeft: SPACE[12],
    },

    // ── Hero Exercise Card & Fused Superset Containers ──────────────────────
    exerciseCardContainer: {
      backgroundColor: stageBg,
      borderRadius: 20,
      marginBottom: SPACE[8],
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: cardBorder,
      overflow: 'hidden',
    },
    supersetCardContainer: {
      backgroundColor: stageBg,
      borderRadius: 20,
      marginBottom: SPACE[8],
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: cardBorder,
      borderLeftWidth: 3,
      borderLeftColor: t.status.warning,
      overflow: 'hidden',
    },
    supersetHeaderBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACE[12],
      paddingVertical: SPACE[8],
      backgroundColor: t.status.warningDim,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border.subtle,
    },
    supersetHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE[4],
    },
    supersetHeaderTitle: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.bold,
      color: t.status.warning,
      letterSpacing: 0.6,
    },
    supersetHeaderSubtitle: {
      fontSize: 10,
      fontFamily: FONT_FAMILY.medium,
      color: t.status.warning,
      opacity: 0.85,
      letterSpacing: 0.3,
    },
    supersetConnectorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACE[4],
      paddingHorizontal: SPACE[12],
      backgroundColor: t.bg.elevated,
    },
    supersetConnectorLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: t.border.subtle,
    },
    supersetConnectorBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: SPACE[8],
      paddingVertical: 2,
      borderRadius: RADIUS.sm,
      backgroundColor: t.status.warningDim,
      borderWidth: 1,
      borderColor: t.status.warning,
      marginHorizontal: SPACE[8],
    },
    supersetConnectorText: {
      fontSize: 9,
      fontFamily: FONT_FAMILY.bold,
      color: t.status.warning,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },

    // ── Two-Zone Hero Row ───────────────────────────────────────────────────
    rowWrapper: {
      width: '100%',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: SPACE[12],
      paddingHorizontal: SPACE[12],
      backgroundColor: 'transparent',
      minHeight: TOUCH.minTarget,
    },
    heroLeftTouchZone: {
      flex: 1,
      paddingRight: SPACE[12],
      justifyContent: 'center',
    },
    rowTitle: {
      fontSize: 15,
      fontFamily: FONT_FAMILY.bold,
      color: t.text.primary,
      letterSpacing: -0.2,
      marginBottom: SPACE[4],
    },
    cardMuscleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE[8],
    },
    muscleDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    cardMuscleText: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.medium,
      color: t.text.secondary,
    },
    cardSnippetInline: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.medium,
      color: t.text.muted,
      fontVariant: ['tabular-nums'],
    },
    heroSegmentsWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginLeft: SPACE[4],
    },
    heroSegmentBar: {
      width: 7,
      height: 3,
      borderRadius: 1.5,
    },
    heroSegmentCompleted: {
      backgroundColor: t.status.success,
    },
    heroSegmentPending: {
      backgroundColor: t.border.medium,
    },
    heroProgressText: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.medium,
      color: t.text.muted,
      fontVariant: ['tabular-nums'],
    },
    rowSubtitle: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.medium,
      color: t.text.secondary,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },

    // ── Two-Zone Right Action Area ──────────────────────────────────────────
    heroRightActionZone: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE[8],
    },
    heroKebabBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroCheckmarkBtn: {
      width: 28,
      height: 28,
      borderRadius: RADIUS.full,
      borderWidth: 1.5,
      borderColor: t.border.medium,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    heroCheckmarkBtnCompleted: {
      backgroundColor: t.status.success,
      borderColor: t.status.success,
    },
    heroCheckmarkHollow: {
      width: 0,
      height: 0,
    },

    // Legacy compatibility
    checkboxCircle: {
      width: 28,
      height: 28,
      borderRadius: RADIUS.full,
      borderWidth: 1.5,
      borderColor: t.border.medium,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxCircleDone: {
      backgroundColor: t.status.success,
      borderColor: t.status.success,
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
      backgroundColor: t.status.warningDim,
      paddingHorizontal: SPACE[8],
      paddingVertical: 2,
      borderRadius: RADIUS.sm,
    },
    supersetTagText: {
      fontSize: 10,
      fontFamily: FONT_FAMILY.bold,
      color: t.status.warning,
    },
    textStrikethrough: {
      textDecorationLine: 'line-through',
      opacity: 0.55,
    },
    rowActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE[4],
    },
    actionBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Cardio Row ──────────────────────────────────────────────────────────
    cardioIconWrap: {
      width: 28,
      height: 28,
      borderRadius: RADIUS.sm,
      backgroundColor: t.bg.elevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACE[12],
    },
    cardioIconWrapDone: {
      backgroundColor: t.status.success,
    },

    // ── Target Muscles Strip (Borderless on Void Canvas) ──────────────────
    targetMusclesCard: {
      paddingVertical: 2,
      paddingHorizontal: 2,
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    targetMusclesText: {
      fontSize: 13,
      fontFamily: FONT_FAMILY.medium,
      color: t.text.secondary,
      lineHeight: 20,
      fontVariant: ['tabular-nums'],
    },

    // ── Rest Day Surface ────────────────────────────────────────────────────
    restCard: {
      backgroundColor: stageBg,
      borderRadius: 20,
      padding: SPACE[24],
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: cardBorder,
      gap: SPACE[12],
    },
    restIconWrap: {
      width: 52,
      height: 52,
      borderRadius: RADIUS.full,
      backgroundColor: t.status.successDim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    restTitle: {
      fontSize: 18,
      fontFamily: FONT_FAMILY.bold,
      color: t.text.primary,
    },
    restBody: {
      fontSize: 13,
      fontFamily: FONT_FAMILY.body,
      color: t.text.secondary,
      textAlign: 'center',
      lineHeight: 19,
      paddingHorizontal: SPACE[8],
    },

    // ── Action Sheet Menu Styles (Unified #0B0C10 / #14161D Sheet Grammar) ──
    menuActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 46,
      paddingVertical: SPACE[8],
      paddingHorizontal: SPACE[12],
      borderRadius: RADIUS.inner,
      backgroundColor: sheetSurface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      marginBottom: SPACE[8],
      gap: SPACE[12],
    },
    menuActionIcon: {
      width: 30,
      height: 30,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuActionTitle: {
      fontSize: 14,
      fontFamily: FONT_FAMILY.bold,
      color: t.text.primary,
    },
    menuActionSub: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.body,
      color: t.text.secondary,
      marginTop: 2,
    },
    menuCancelBtn: {
      marginTop: SPACE[8],
      minHeight: 44,
      borderRadius: RADIUS.inner,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: sheetSurface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
    },
    menuCancelText: {
      fontSize: 14,
      fontFamily: FONT_FAMILY.bold,
      color: t.text.primary,
    },

    restDayBannerContainer: {
      backgroundColor: stageBg,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: cardBorder,
      padding: SPACE[16],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACE[12],
    },
    restDayLeftRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE[12],
      flex: 1,
      minWidth: 0,
    },
    restDayIconCircle: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.inner,
      backgroundColor: t.status.successDim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    restDayTitle: {
      fontSize: 16,
      fontFamily: FONT_FAMILY.bold,
      color: t.text.primary,
    },
    restDaySubtitle: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.body,
      color: t.text.secondary,
      marginTop: 2,
    },
  });

  stylesCache.set(cacheKey, styles);
  return styles;
};

export default makeStyles;
