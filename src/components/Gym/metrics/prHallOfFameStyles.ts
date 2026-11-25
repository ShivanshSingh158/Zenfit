import { StyleSheet } from 'react-native';
import {
  DARK_TOKENS,
  LIGHT_TOKENS,
  FONT_FAMILY,
  RADIUS,
  SPACE,
  TOUCH,
} from '../../../theme/tokens';

export const makePRHallOfFameStyles = (_colors: any, isDark: boolean = true) => {
  const tokens = isDark ? DARK_TOKENS : LIGHT_TOKENS;
  return StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: SPACE.md,
      paddingTop: SPACE.xs,
    },
    headerLeft: {
      flex: 1,
      paddingRight: SPACE.md,
    },
    closeButton: {
      width: TOUCH.minTarget,
      height: TOUCH.minTarget,
      borderRadius: RADIUS.full,
      backgroundColor: tokens.bg.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xxl - 2,
      color: tokens.text.primary,
      letterSpacing: -0.4,
      marginBottom: 3,
    },
    subtitle: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: tokens.fontSize.sm,
      color: tokens.text.secondary,
    },
    metaBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: tokens.bg.surface,
      borderRadius: RADIUS.inner,
      paddingHorizontal: SPACE.md,
      paddingVertical: SPACE.sm,
      marginBottom: SPACE.md,
      borderWidth: tokens.border.hairlineWidth,
      borderColor: tokens.border.subtle,
    },
    metaText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xs,
      color: tokens.accent.primary,
      letterSpacing: 0.2,
    },
    metaSubText: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: tokens.fontSize.xs,
      color: tokens.text.secondary,
    },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACE.xxl + SPACE.lg,
      paddingHorizontal: SPACE.xl,
      gap: SPACE.md,
    },
    emptyIconCircle: {
      width: 68,
      height: 68,
      borderRadius: RADIUS.full,
      backgroundColor: tokens.bg.surface,
      borderWidth: tokens.border.hairlineWidth,
      borderColor: tokens.border.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACE.xs + 2,
    },
    emptyText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.lg,
      color: tokens.text.primary,
      letterSpacing: -0.2,
    },
    emptyHint: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: tokens.fontSize.sm,
      color: tokens.text.secondary,
      textAlign: 'center',
      lineHeight: 19,
    },
    row: {
      flexDirection: 'column',
      backgroundColor: tokens.bg.surface,
      borderColor: tokens.border.subtle,
      borderWidth: tokens.border.hairlineWidth,
      borderRadius: RADIUS.card,
      padding: SPACE.md,
      gap: SPACE.sm + 2,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACE.sm,
    },
    rankAndName: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.sm + 2,
      flex: 1,
    },
    rankBadge: {
      width: 26,
      height: 26,
      borderRadius: RADIUS.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankBadgeGold: {
      backgroundColor: tokens.status.goldDim,
    },
    rankBadgeSilver: {
      backgroundColor: tokens.bg.elevated,
    },
    rankBadgeBronze: {
      backgroundColor: tokens.status.warningDim,
    },
    rankBadgeDefault: {
      backgroundColor: tokens.accent.primaryDim,
    },
    rankText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xs,
    },
    rankTextGold: {
      color: tokens.status.gold,
    },
    rankTextSilver: {
      color: tokens.text.primary,
    },
    rankTextBronze: {
      color: tokens.status.warning,
    },
    rankTextDefault: {
      color: tokens.accent.primary,
    },
    exerciseName: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.md,
      color: tokens.text.primary,
      flex: 1,
    },
    dateBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.xs,
      backgroundColor: tokens.bg.elevated,
      paddingHorizontal: SPACE.sm,
      paddingVertical: SPACE.xs,
      borderRadius: RADIUS.sm,
    },
    dateText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: tokens.fontSize.xs,
      color: tokens.text.secondary,
    },
    rowBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: SPACE.xs,
      borderTopWidth: tokens.border.hairlineWidth,
      borderTopColor: tokens.border.subtle,
    },
    chipGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.sm,
      flexWrap: 'wrap',
    },
    chip1RM: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.xs,
      backgroundColor: tokens.status.goldDim,
      paddingHorizontal: SPACE.sm,
      paddingVertical: 3,
      borderRadius: RADIUS.sm - 2,
    },
    chip1RMText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xs,
      color: tokens.status.gold,
    },
    loadDetail: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.xs,
    },
    loadDetailText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: tokens.fontSize.xs,
      color: tokens.text.secondary,
    },
    latestTag: {
      backgroundColor: tokens.status.successDim,
      paddingHorizontal: SPACE.xs + 2,
      paddingVertical: 2,
      borderRadius: RADIUS.sm - 2,
    },
    latestTagText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: tokens.fontSize.xs - 2,
      color: tokens.status.success,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });
};
