import { StyleSheet } from 'react-native';
import {
  DARK_TOKENS,
  LIGHT_TOKENS,
  ThemeTokens,
  FONT_FAMILY,
  SPACE,
  RADIUS,
  SHADOW,
} from '../../theme/tokens';

const stylesCache = new Map<string, any>();

export const makeActiveLoggingStyles = (_colors?: any, isDark: boolean = true) => {
  const t: ThemeTokens = isDark ? DARK_TOKENS : LIGHT_TOKENS;
  const canvasBg = isDark ? '#050507' : t.bg.canvas;
  const cardBg = isDark ? '#0F1015' : t.bg.surface;
  const elevatedBg = isDark ? '#14161D' : t.bg.elevated;
  const cacheKey = `${isDark ? 'dark' : 'light'}_${canvasBg}_${t.accent.primary}`;
  const cached = stylesCache.get(cacheKey);
  if (cached) return cached;

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: canvasBg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACE.md,
      paddingVertical: SPACE.sm,
      borderBottomWidth: t.border.hairlineWidth,
      borderBottomColor: t.border.subtle,
    },
    backBtn: {
      width: t.touch.minTarget,
      height: t.touch.minTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerFinishBtn: {
      backgroundColor: t.accent.primary,
      paddingHorizontal: 14,
      minHeight: 32,
      borderRadius: RADIUS.inner,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerFinishText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 13,
      color: t.accent.onPrimary,
    },
    headerTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
      color: t.text.secondary,
      letterSpacing: 0.8,
    },
    content: { flex: 1 },
    scrollContent: {
      paddingHorizontal: SPACE.md,
      paddingTop: SPACE.xs,
      paddingBottom: 120,
    },

    prToastContainer: {
      position: 'absolute',
      left: SPACE.md,
      right: SPACE.md,
      zIndex: 9999,
      backgroundColor: elevatedBg,
      borderRadius: RADIUS.card,
      padding: SPACE.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.md,
      borderWidth: 1,
      borderColor: t.status.gold,
      ...SHADOW.md,
    },
    prToastTitle: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.bold,
      color: t.status.gold,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    prToastSubtitle: {
      fontSize: 13,
      fontFamily: FONT_FAMILY.body,
      color: t.text.primary,
      marginTop: 2,
      lineHeight: 18,
    },
    prToastCloseBtn: {
      width: t.touch.minTarget,
      height: t.touch.minTarget,
      borderRadius: RADIUS.inner,
      backgroundColor: cardBg,
      alignItems: 'center',
      justifyContent: 'center',
    },

    progressBarTrack: {
      height: 3,
      backgroundColor: t.border.subtle,
      width: '100%',
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      width: '100%',
      backgroundColor: t.accent.primary,
    },
  });

  stylesCache.set(cacheKey, styles);
  return styles;
};
