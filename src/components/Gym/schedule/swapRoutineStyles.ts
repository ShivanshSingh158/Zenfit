import { StyleSheet } from 'react-native';
import { DARK_TOKENS, FONT_FAMILY, LIGHT_TOKENS, RADIUS, SPACE, TOUCH } from '../../../theme/tokens';

export const makeSwapRoutineStyles = (_colors: any, isDark: boolean = true) => {
  const tokens = isDark ? DARK_TOKENS : LIGHT_TOKENS;
  const cardBg = isDark ? '#14161D' : '#FFFFFF';
  const hairline = isDark ? 'rgba(255, 255, 255, 0.08)' : tokens.border.subtle;

  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: SPACE.md,
    },
    headerTextCol: {
      flex: 1,
      minWidth: 0,
      paddingRight: SPACE.md,
    },
    title: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 18,
      color: tokens.text.primary,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 12.5,
      color: tokens.text.secondary,
      marginTop: 2,
      lineHeight: 17,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: RADIUS.full,
      backgroundColor: cardBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    ledgerCard: {
      backgroundColor: cardBg,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      overflow: 'hidden',
      marginBottom: SPACE.sm,
    },
    dayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 13,
      paddingHorizontal: 15,
      minHeight: TOUCH.minTarget + 14,
      gap: 12,
    },
    dayRowActive: {
      backgroundColor: isDark ? 'rgba(10, 132, 255, 0.10)' : tokens.accent.primaryDim,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: hairline,
      marginHorizontal: 15,
    },
    rowMain: {
      flex: 1,
      minWidth: 0,
    },
    rowMetaTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
    },
    dayLabelPlain: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 10.5,
      color: tokens.accent.primary,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    upNextPlain: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 10.5,
      color: tokens.status.success,
    },
    activeDotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    activeGreenDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: tokens.status.success,
    },
    activeBadgeText: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 11,
      color: tokens.status.success,
    },
    dayTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15.5,
      color: tokens.text.primary,
      letterSpacing: -0.2,
    },
    daySubLine: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 12,
      color: tokens.text.secondary,
      marginTop: 2,
    },
    checkCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: tokens.accent.primaryDim,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
  });
};
