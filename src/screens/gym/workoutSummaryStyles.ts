import { StyleSheet } from 'react-native';
import {
  DARK_TOKENS,
  LIGHT_TOKENS,
  ThemeTokens,
  FONT_FAMILY,
  RADIUS,
  SPACE,
} from '../../theme/tokens';

const stylesCache = new Map<string, any>();

export const makeWorkoutSummaryStyles = (_colors: any, isDark: boolean) => {
  const t: ThemeTokens = isDark ? DARK_TOKENS : LIGHT_TOKENS;
  const voidBg = isDark ? '#050507' : t.bg.canvas;
  const stageBg = isDark ? '#0F1015' : '#FFFFFF';
  const hairline = isDark ? 'rgba(255, 255, 255, 0.08)' : t.border.subtle;
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.10)' : t.border.subtle;
  const cacheKey = `${isDark ? 'dark' : 'light'}_${voidBg}`;
  const cached = stylesCache.get(cacheKey);
  if (cached) return cached;

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: voidBg,
    },
    header: {
      paddingHorizontal: SPACE.md,
      paddingTop: SPACE.sm,
      paddingBottom: SPACE.xs,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.bg.elevated,
      borderRadius: RADIUS.inner,
    },
    shareHeaderBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.bg.elevated,
      borderRadius: RADIUS.inner,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: SPACE.md,
      paddingTop: SPACE.sm,
      paddingBottom: SPACE.xl,
    },
    heroSection: {
      alignItems: 'center',
      marginTop: SPACE.sm,
      marginBottom: SPACE.xl,
    },
    badgeHalo: {
      marginBottom: SPACE.md,
    },
    haloGradient: {
      padding: 4,
      borderRadius: RADIUS.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeWrapper: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: t.bg.surface,
      borderWidth: t.border.hairlineWidth,
      borderColor: t.border.medium,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sessionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: t.accent.primaryDim,
      borderWidth: t.border.hairlineWidth,
      borderColor: t.border.subtle,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: RADIUS.sm,
      marginBottom: SPACE.sm,
    },
    pulseDot: {
      width: 6,
      height: 6,
      borderRadius: RADIUS.full,
      backgroundColor: t.accent.primary,
    },
    sessionPillText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 10,
      color: t.accent.primary,
      letterSpacing: 0.8,
    },
    heroTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 28,
      color: t.text.primary,
      textAlign: 'center',
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    heroSubtitle: {
      fontFamily: FONT_FAMILY.body,
      fontSize: 14,
      color: t.text.secondary,
      textAlign: 'center',
    },

    prCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.bg.surface,
      borderRadius: RADIUS.card,
      padding: SPACE.md,
      marginBottom: SPACE.md,
      gap: SPACE.md,
      borderWidth: t.border.hairlineWidth,
      borderColor: t.status.gold,
    },
    prIconBox: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.inner,
      backgroundColor: t.status.goldDim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    prTag: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 10,
      color: t.status.gold,
      letterSpacing: 0.8,
      marginBottom: 2,
    },
    prText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
      color: t.text.primary,
    },

    statsStripCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: stageBg,
      borderRadius: 20,
      paddingVertical: 14,
      marginBottom: SPACE.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: cardBorder,
    },
    statCol: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      height: 26,
      backgroundColor: hairline,
    },
    statNumber: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 18,
      fontVariant: ['tabular-nums'],
      color: t.text.primary,
      marginBottom: 2,
      includeFontPadding: false,
    },
    statLabel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 10,
      color: t.text.secondary,
      letterSpacing: 0.6,
    },

    sectionContainer: {
      marginBottom: SPACE.md,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: SPACE.sm,
      paddingHorizontal: 2,
    },
    sectionTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 11,
      color: t.text.secondary,
      letterSpacing: 0.8,
    },
    countBadge: {
      backgroundColor: t.bg.elevated,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: RADIUS.full,
      marginLeft: 'auto',
    },
    countBadgeText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 11,
      fontVariant: ['tabular-nums'],
      color: t.text.secondary,
    },

    exercisesList: {
      borderRadius: 20,
      backgroundColor: stageBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: cardBorder,
      overflow: 'hidden',
    },
    exerciseCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: SPACE.md,
      paddingHorizontal: SPACE.md,
      borderBottomWidth: t.border.hairlineWidth,
      borderBottomColor: t.border.subtle,
    },
    exerciseName: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
      color: t.text.primary,
      marginBottom: 3,
    },
    exerciseMetaBadge: {
      fontFamily: FONT_FAMILY.body,
      fontSize: 12,
      fontVariant: ['tabular-nums'],
      color: t.text.secondary,
    },
    exerciseMetaWeight: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 13,
      fontVariant: ['tabular-nums'],
      color: t.accent.primary,
    },
    expandBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      minHeight: 38,
      backgroundColor: t.bg.elevated,
    },
    expandBtnText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 13,
      color: t.accent.primary,
    },

    progressionCard: {
      backgroundColor: stageBg,
      borderRadius: 20,
      padding: SPACE.md,
      marginBottom: SPACE.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: cardBorder,
    },
    pillRow: {
      flexDirection: 'row',
      gap: 6,
    },
    liftPill: {
      paddingHorizontal: SPACE.md,
      paddingVertical: 8,
      borderRadius: RADIUS.inner,
      backgroundColor: t.bg.elevated,
    },
    liftPillActive: {
      backgroundColor: t.accent.primaryDim,
      borderWidth: 1,
      borderColor: t.accent.primary,
    },
    liftPillText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      color: t.text.secondary,
    },
    liftPillTextActive: {
      color: t.accent.primary,
      fontFamily: FONT_FAMILY.bold,
    },

    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: t.bg.canvas,
      borderRadius: RADIUS.inner,
      padding: 4,
      marginBottom: SPACE.md,
      height: 40,
      alignItems: 'center',
    },
    segmentBtn: {
      flex: 1,
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: RADIUS.sm,
    },
    segmentBtnActive: {
      backgroundColor: t.bg.elevated,
    },
    segmentText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      color: t.text.secondary,
    },
    segmentTextActive: {
      fontFamily: FONT_FAMILY.bold,
      color: t.text.primary,
    },

    chartWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      overflow: 'hidden',
    },
    chartStyle: {
      marginVertical: 4,
      borderRadius: RADIUS.inner,
    },
    emptyChartBox: {
      paddingVertical: 28,
      paddingHorizontal: SPACE.lg,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: t.bg.elevated,
      borderRadius: RADIUS.inner,
    },
    emptyIconBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.bg.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACE.sm,
    },
    emptyChartTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
      color: t.text.primary,
      marginBottom: 4,
    },
    emptyChartText: {
      fontFamily: FONT_FAMILY.body,
      fontSize: 12,
      color: t.text.secondary,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 260,
    },

    notesContainer: {
      backgroundColor: t.bg.surface,
      borderRadius: RADIUS.card,
      padding: SPACE.md,
      marginBottom: SPACE.md,
      borderWidth: t.border.hairlineWidth,
      borderColor: t.border.subtle,
    },
    notesText: {
      fontFamily: FONT_FAMILY.body,
      fontSize: 14,
      color: t.text.primary,
      lineHeight: 20,
    },

    footer: {
      paddingHorizontal: SPACE.md,
      paddingTop: SPACE.sm,
      backgroundColor: t.bg.canvas,
      borderTopWidth: t.border.hairlineWidth,
      borderTopColor: t.border.subtle,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.md,
      width: '100%',
    },
    shareBtn: {
      flex: 1,
      height: 42,
      borderRadius: RADIUS.md,
      borderWidth: t.border.hairlineWidth,
      borderColor: t.border.subtle,
      backgroundColor: t.bg.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    shareBtnText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14.5,
      color: t.text.primary,
      letterSpacing: -0.2,
    },
    doneBtn: {
      flex: 1.5,
      backgroundColor: t.accent.primary,
      height: 44,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneBtnText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14.5,
      color: t.accent.onPrimary,
      letterSpacing: -0.2,
    },
    deltaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: RADIUS.sm,
      backgroundColor: t.status.successDim,
      marginTop: 4,
    },
    deltaBadgeText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 10,
      color: t.status.success,
    },
    baselineCard: {
      padding: SPACE.lg,
      borderRadius: RADIUS.inner,
      backgroundColor: t.bg.elevated,
      alignItems: 'center',
      gap: 6,
      marginTop: SPACE.sm,
    },
    baselineTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 13,
      color: t.text.primary,
    },
    baselineSub: {
      fontFamily: FONT_FAMILY.body,
      fontSize: 11,
      color: t.text.secondary,
      textAlign: 'center',
    },
  });

  stylesCache.set(cacheKey, styles);
  return styles;
};
