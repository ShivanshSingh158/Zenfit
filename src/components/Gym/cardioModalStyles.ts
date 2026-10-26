import { StyleSheet, Platform, Dimensions } from 'react-native';
import { FONT_FAMILY, SPACE, RADIUS } from '../../theme/tokens';

const { height: SCREEN_H } = Dimensions.get('window');

export const makeCardioModalStyles = (colors: any, isDark: boolean = true) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: isDark ? '#141416' : colors.surface,
      borderTopLeftRadius: RADIUS.xxl,
      borderTopRightRadius: RADIUS.xxl,
      paddingHorizontal: SPACE.lg,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 36 : 24,
      borderTopWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
      maxHeight: SCREEN_H * 0.82,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
      alignSelf: 'center',
      marginBottom: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 18,
    },
    headerSpacer: {
      width: 28,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerLeft: {
      flex: 1,
    },
    title: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 17,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    subtitle: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 11,
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 2,
      textAlign: 'center',
    },
    closeBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 20,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F5F5F7',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      width: '48.5%',
    },
    chipFullWidth: {
      width: '100%',
    },
    chipSelected: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      borderColor: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.25)',
    },
    chipIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipIconSelected: {
      backgroundColor: isDark ? '#FFFFFF' : '#000000',
    },
    chipLabel: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 13.5,
      color: colors.textPrimary,
      flex: 1,
    },
    chipLabelSelected: {
      fontFamily: FONT_FAMILY.bold,
      color: isDark ? '#FFFFFF' : '#000000',
    },
    row: {
      flexDirection: 'row',
      marginBottom: 10,
    },
    fieldBox: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F5F5F7',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
      padding: 12,
    },
    fieldHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    fieldIconBox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fieldLabel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 10.5,
      color: colors.textSecondary,
      flex: 1,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    fieldUnit: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 10,
      color: colors.textMuted,
    },
    input: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 22,
      color: colors.textPrimary,
      padding: 0,
      height: 30,
    },
    saveBtn: {
      backgroundColor: isDark ? '#FFFFFF' : '#000000',
      borderRadius: RADIUS.full,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 14,
    },
    saveBtnDisabled: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    },
    saveBtnText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14.5,
      color: isDark ? '#000000' : '#FFFFFF',
      letterSpacing: -0.2,
    },
    saveBtnTextDisabled: {
      color: colors.textMuted,
    },
    addBtn: {
      backgroundColor: isDark ? '#FFFFFF' : '#000000',
      borderRadius: RADIUS.full,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnDisabled: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    },
    addBtnText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14.5,
      color: isDark ? '#000000' : '#FFFFFF',
      letterSpacing: -0.2,
    },
    addBtnTextDisabled: {
      color: colors.textMuted,
    },
  });
