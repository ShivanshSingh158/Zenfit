import { StyleSheet } from 'react-native';
import { DARK_TOKENS, LIGHT_TOKENS, ThemeTokens, FONT_FAMILY, SPACE, RADIUS, TOUCH } from '../../theme/tokens';

const stylesCache = new Map<string, any>();

export const makeExerciseDetailStyles = (
  colors: any,
  isDark: boolean = true,
  tokens?: ThemeTokens,
) => {
  const t = tokens || (isDark ? DARK_TOKENS : LIGHT_TOKENS);
  const cacheKey = `${isDark ? 'dark' : 'light'}_${t.bg.canvas}_${t.accent.primary}_${t.border.subtle}_${t.text.primary}`;
  const cached = stylesCache.get(cacheKey);
  if (cached) return cached;

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg.canvas },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACE[16],
      paddingVertical: SPACE[8],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border.subtle,
    },
    backBtn: {
      width: TOUCH.minTarget,
      height: TOUCH.minTarget,
      borderRadius: RADIUS.inner,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { fontFamily: FONT_FAMILY.bold, fontSize: 16, color: t.text.primary },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE[8],
    },
    iconActionBtn: {
      width: TOUCH.minTarget,
      height: TOUCH.minTarget,
      borderRadius: RADIUS.inner,
      backgroundColor: t.status.dangerDim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtn: {
      minHeight: TOUCH.minTarget,
      paddingHorizontal: SPACE[16],
      backgroundColor: t.accent.primary,
      borderRadius: RADIUS.inner,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnText: { fontFamily: FONT_FAMILY.bold, fontSize: 14, color: t.accent.onPrimary },

    scrollContent: { padding: SPACE[16], paddingBottom: 96 },

    previewHeader: { alignItems: 'center', marginBottom: SPACE[16] },
    musclePill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACE[12],
      paddingVertical: SPACE[8],
      borderRadius: RADIUS.full,
      backgroundColor: t.accent.primaryDim,
    },
    muscleDot: { width: 6, height: 6, borderRadius: 3, marginRight: SPACE[8], backgroundColor: t.accent.primary },
    muscleText: { fontFamily: FONT_FAMILY.bold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: t.accent.primary },
    formGroup: { marginBottom: SPACE[16] },
    dropdown: {
      position: 'absolute',
      top: 76,
      left: 0,
      right: 0,
      backgroundColor: t.bg.elevated,
      borderRadius: RADIUS.inner,
      borderWidth: 1,
      borderColor: t.border.medium,
      zIndex: 999,
      elevation: 6,
      maxHeight: 200,
    },
    dropdownItem: {
      minHeight: TOUCH.minTarget,
      paddingHorizontal: SPACE[12],
      justifyContent: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border.subtle,
    },
    dropdownText: {
      color: t.text.primary,
      fontSize: 14,
      fontFamily: FONT_FAMILY.medium,
    },
    inputGroup: { marginBottom: SPACE[16] },
    rowForm: { flexDirection: 'row', justifyContent: 'space-between' },
    label: { fontFamily: FONT_FAMILY.bold, fontSize: 12, color: t.text.secondary, marginBottom: SPACE[8], letterSpacing: 0.5 },
    input: {
      backgroundColor: t.bg.elevated,
      borderRadius: RADIUS.inner,
      paddingHorizontal: SPACE[16],
      height: TOUCH.minTarget,
      fontFamily: FONT_FAMILY.body,
      fontSize: 15,
      color: t.text.primary,
      borderWidth: 1,
      borderColor: t.border.subtle,
    },
    numericInput: {
      fontVariant: ['tabular-nums'],
    },

    videoInputRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE[12] },
    previewVideoBtn: {
      width: TOUCH.minTarget,
      height: TOUCH.minTarget,
      borderRadius: RADIUS.inner,
      backgroundColor: t.accent.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    videoContainer: {
      width: '100%',
      borderRadius: RADIUS.card,
      overflow: 'hidden',
      marginBottom: SPACE[24],
      marginTop: SPACE[8],
      padding: SPACE[12],
      backgroundColor: t.bg.surface,
      borderWidth: 1,
      borderColor: t.border.subtle,
    },
    videoHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACE[8],
    },
    videoHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE[8],
    },
    videoHeaderTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 12,
      color: t.text.primary,
    },
    refreshVideoBtn: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE[4],
      backgroundColor: t.bg.elevated,
      borderWidth: 1,
      borderColor: t.border.subtle,
      paddingHorizontal: SPACE[12],
      borderRadius: RADIUS.full,
    },
    refreshVideoText: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.bold,
      color: t.accent.primary,
    },

    masterSplitContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: SPACE[12],
      gap: SPACE[12],
    },
    masterSplitTitle: { fontFamily: FONT_FAMILY.bold, fontSize: 16, color: t.text.primary, marginBottom: SPACE[4] },
    masterSplitDesc: { fontFamily: FONT_FAMILY.body, fontSize: 12, color: t.text.secondary },

    divider: { height: StyleSheet.hairlineWidth, backgroundColor: t.border.subtle, marginVertical: SPACE[24] },
    sectionTitle: { fontFamily: FONT_FAMILY.bold, fontSize: 18, color: t.text.primary, marginBottom: SPACE[12] },

    historyItem: {
      backgroundColor: t.bg.surface,
      borderRadius: RADIUS.card,
      padding: SPACE[12],
      marginBottom: SPACE[12],
      borderWidth: 1,
      borderColor: t.border.subtle,
    },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACE[12] },
    historyDate: { fontFamily: FONT_FAMILY.bold, fontSize: 14, color: t.text.primary },
    historySummary: { fontFamily: FONT_FAMILY.medium, fontSize: 12, color: t.accent.primary, fontVariant: ['tabular-nums'] },

    setsList: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE[8] },
    setBubble: { backgroundColor: t.bg.elevated, paddingHorizontal: SPACE[12], paddingVertical: SPACE[8], borderRadius: RADIUS.inner },
    setBubbleCompleted: { backgroundColor: t.accent.primaryDim },
    setBubbleMissed: { backgroundColor: t.bg.elevated, opacity: 0.6 },
    setBubbleText: { fontFamily: FONT_FAMILY.bold, fontSize: 12, color: t.text.primary, fontVariant: ['tabular-nums'] },

    emptyState: { alignItems: 'center', marginTop: SPACE[24], gap: SPACE[12] },
    emptyText: { fontFamily: FONT_FAMILY.body, fontSize: 14, color: t.text.muted },

    deleteBtn: {
      minHeight: TOUCH.minTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACE[8],
      padding: SPACE[16],
      backgroundColor: t.status.dangerDim,
      borderRadius: RADIUS.inner,
    },
    deleteBtnText: { fontFamily: FONT_FAMILY.bold, fontSize: 15, color: t.status.danger },
  });

  stylesCache.set(cacheKey, styles);
  return styles;
};
