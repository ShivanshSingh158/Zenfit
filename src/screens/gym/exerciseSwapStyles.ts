import { StyleSheet } from 'react-native';
import { DARK_TOKENS, LIGHT_TOKENS, ThemeTokens, FONT_FAMILY, SPACE, RADIUS, TOUCH } from '../../theme/tokens';

const stylesCache = new Map<string, any>();

export const makeExerciseSwapStyles = (
  colors: any,
  isDark: boolean = true,
  tokens?: ThemeTokens,
) => {
  const t = tokens || (isDark ? DARK_TOKENS : LIGHT_TOKENS);
  const canvasBg = isDark ? '#050507' : t.bg.canvas;
  const surfaceBg = isDark ? '#0F1015' : t.bg.surface;
  const elevatedBg = isDark ? '#14161D' : t.bg.elevated;
  const hairline = StyleSheet.hairlineWidth;

  const cacheKey = `${isDark ? 'dark' : 'light'}_${canvasBg}_${t.accent.primary}_${t.border.subtle}_${t.text.primary}`;
  const cached = stylesCache.get(cacheKey);
  if (cached) return cached;

  const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: canvasBg },
    backButton: {
      width: TOUCH.minTarget,
      height: TOUCH.minTarget,
      borderRadius: RADIUS.inner,
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupedCard: {
      backgroundColor: surfaceBg,
      borderRadius: RADIUS.card,
      borderWidth: hairline,
      borderColor: t.border.subtle,
      overflow: 'hidden',
    },
    groupedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACE[16],
      paddingVertical: 14,
      gap: SPACE[12],
    },
    groupedRowDivider: {
      borderBottomWidth: hairline,
      borderBottomColor: t.border.subtle,
    },
    exerciseCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: surfaceBg,
      paddingHorizontal: SPACE[16],
      paddingVertical: 14,
      borderRadius: RADIUS.card,
      marginBottom: SPACE[8],
      borderWidth: hairline,
      borderColor: t.border.subtle,
    },
    exerciseInfo: { flex: 1, gap: 4 },
    exerciseTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    muscleIndicatorDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      flexShrink: 0,
    },
    exerciseName: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
      color: t.text.primary,
      textTransform: 'capitalize',
      flexShrink: 1,
    },
    exerciseMetaLine: {
      fontFamily: FONT_FAMILY.body,
      fontSize: 12,
      color: t.text.secondary,
      paddingLeft: 15,
    },
    equipChip: {
      backgroundColor: elevatedBg,
      paddingHorizontal: SPACE[8],
      paddingVertical: 2,
      borderRadius: RADIUS.xs,
    },
    equipChipText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 10,
      color: t.text.secondary,
    },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE[8], marginTop: 2, paddingLeft: 15, flexWrap: 'wrap' },
    muscleBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE[8], paddingVertical: 3, borderRadius: RADIUS.full },
    muscleBadgeText: { fontFamily: FONT_FAMILY.bold, fontSize: 10, textTransform: 'uppercase' },
    swapAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      minHeight: 34,
      paddingHorizontal: 12,
      borderRadius: RADIUS.full,
      backgroundColor: t.accent.primaryDim,
    },
    swapActionText: { fontFamily: FONT_FAMILY.bold, fontSize: 12, color: t.accent.primary },
    root: { flex: 1, backgroundColor: canvasBg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACE[16],
      paddingVertical: SPACE[8],
      borderBottomWidth: hairline,
      borderBottomColor: t.border.subtle,
      gap: SPACE[8],
    },
    backBtn: {
      width: TOUCH.minTarget,
      height: TOUCH.minTarget,
      borderRadius: RADIUS.inner,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { fontFamily: FONT_FAMILY.bold, fontSize: 17, color: t.text.primary, letterSpacing: -0.2 },
    headerSub: { fontFamily: FONT_FAMILY.body, fontSize: 12, color: t.text.secondary, marginTop: 1 },
    headerSubHighlight: { fontFamily: FONT_FAMILY.bold, color: t.text.primary },

    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: elevatedBg,
      marginHorizontal: SPACE[16],
      marginTop: SPACE[12],
      marginBottom: SPACE[12],
      paddingLeft: SPACE[12],
      paddingRight: SPACE[4],
      height: 44,
      borderRadius: RADIUS.inner,
      borderWidth: hairline,
      borderColor: t.border.subtle,
    },
    searchIcon: { marginRight: SPACE[8] },
    searchInput: { flex: 1, fontFamily: FONT_FAMILY.body, fontSize: 14, color: t.text.primary, height: '100%' },
    clearSearchBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },

    list: { paddingHorizontal: SPACE[16], paddingBottom: 120 },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACE[8],
      paddingHorizontal: 2,
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE[8],
    },
    sectionHeaderTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 11,
      color: t.text.muted,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    templateMetaText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 11.5,
      color: t.text.secondary,
    },
    confirmSheetBody: {
      gap: 14,
      paddingTop: 6,
    },
    confirmTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 18,
      color: t.text.primary,
      letterSpacing: -0.3,
    },
    confirmDesc: {
      fontFamily: FONT_FAMILY.body,
      fontSize: 13.5,
      color: t.text.secondary,
      lineHeight: 20,
    },
    confirmBtnStack: {
      gap: 10,
      marginTop: 4,
    },
    confirmPrimaryBtn: {
      minHeight: 48,
      borderRadius: RADIUS.card,
      backgroundColor: t.accent.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    confirmPrimaryText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
      color: t.accent.onPrimary,
    },
    confirmSecondaryBtn: {
      minHeight: 46,
      borderRadius: RADIUS.card,
      backgroundColor: elevatedBg,
      borderWidth: hairline,
      borderColor: t.border.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    confirmSecondaryText: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 14,
      color: t.text.primary,
    },

    emptyState: { alignItems: 'center', marginTop: 60, gap: SPACE[12] },
    emptyText: { fontFamily: FONT_FAMILY.body, fontSize: 14, color: t.text.muted },
  });

  stylesCache.set(cacheKey, styles);
  return styles;
};
