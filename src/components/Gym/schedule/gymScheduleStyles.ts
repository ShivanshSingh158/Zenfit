import { StyleSheet } from 'react-native';
import { DARK_TOKENS, FONT_FAMILY, LIGHT_TOKENS, RADIUS, SPACE } from '../../../theme/tokens';

export const SHEET_BG_DARK = '#0B0C10';
export const SHEET_SURFACE_DARK = '#14161D';
export const SHEET_BG_LIGHT = '#F8F8FA';
export const SHEET_SURFACE_LIGHT = '#FFFFFF';

export const makeGymScheduleStyles = (colors: any, isDark: boolean = true) => {
  const tokens = isDark ? DARK_TOKENS : LIGHT_TOKENS;
  const sheetBg = isDark ? SHEET_BG_DARK : SHEET_BG_LIGHT;
  const subtleHairline = isDark
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(9, 9, 11, 0.08)';
  const subtleControlBg = isDark
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(9, 9, 11, 0.05)';

  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: tokens.bg.backdrop,
      justifyContent: 'flex-end',
    },
    card: {
      backgroundColor: sheetBg,
      borderTopLeftRadius: RADIUS.xxl,
      borderTopRightRadius: RADIUS.xxl,
      height: '88%',
      maxHeight: '92%',
      borderTopWidth: 0,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACE.lg,
      paddingTop: SPACE.md,
      paddingBottom: SPACE.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: subtleHairline,
    },
    title: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 18,
      color: tokens.text.primary,
      letterSpacing: -0.3,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.inner,
      backgroundColor: subtleControlBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contentContainer: {
      paddingHorizontal: SPACE.lg,
      paddingTop: SPACE.md,
      paddingBottom: 36,
    },
    description: {
      fontFamily: FONT_FAMILY.body,
      fontSize: 13,
      color: tokens.text.secondary,
      lineHeight: 18,
      marginBottom: SPACE.md,
    },
    dayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: subtleHairline,
    },
    dayRowRest: {
      opacity: 0.78,
    },
    dayIconBox: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.inner,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACE.md,
    },
    dayInfo: {
      flex: 1,
      marginRight: 10,
      minWidth: 0,
    },
    dayName: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14.5,
      color: tokens.text.primary,
    },
    dayNameRest: {
      color: tokens.text.secondary,
    },
    planFocus: {
      fontFamily: FONT_FAMILY.body,
      fontSize: 12,
      color: tokens.text.secondary,
      marginTop: 1,
    },
    planFocusRest: {
      color: tokens.text.muted,
    },
    timeBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 0,
    },
    timeText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 12.5,
      color: tokens.accent.primary,
      textAlign: 'right',
    },
    timeSubText: {
      fontFamily: FONT_FAMILY.body,
      fontSize: 10.5,
      color: tokens.text.muted,
      textAlign: 'right',
      marginTop: 1,
    },
    notSetText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      color: tokens.text.muted,
    },
    saveBtn: {
      backgroundColor: tokens.accent.primary,
      borderRadius: RADIUS.md,
      minHeight: 44,
      paddingVertical: 11,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: SPACE.md,
    },
    saveBtnText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14.5,
      color: tokens.accent.onPrimary,
    },
    editContainer: {
      paddingBottom: SPACE.xl,
    },
    editHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACE.md,
      paddingBottom: SPACE.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: subtleHairline,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: subtleHairline,
      gap: 12,
    },
    settingLabel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
      color: tokens.text.primary,
    },
    settingSub: {
      fontFamily: FONT_FAMILY.body,
      fontSize: 12,
      color: tokens.text.secondary,
      marginTop: 2,
    },
  });
};
