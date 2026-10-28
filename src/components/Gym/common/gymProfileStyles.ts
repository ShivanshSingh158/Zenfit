/**
 * gymProfileStyles.ts — ZenFit
 *
 * Apple iOS Inset Grouped design tokens for GymProfileModal.
 * Pure #1C1C1E elevated card canvas, #2C2C2E inputs & chips, #A599FF primary accents.
 */

import { StyleSheet, Platform } from 'react-native';
import { FONT_FAMILY } from '../../../theme/tokens';

export const makeStyles = (colors: any, isDark: boolean = true) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.72)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 10,
      paddingHorizontal: 20,
      maxHeight: '92%',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      borderBottomWidth: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -10 },
      shadowOpacity: 0.5,
      shadowRadius: 24,
      elevation: 20,
    },
    handle: {
      width: 36,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: isDark ? '#3A3A3C' : '#D1D1D6',
      alignSelf: 'center',
      marginBottom: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 18,
      paddingBottom: 4,
    },
    headerLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginRight: 10,
    },
    iconBadge: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: 'rgba(165,153,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 20,
      color: colors.textPrimary,
      letterSpacing: -0.4,
    },
    subtitle: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 12.5,
      color: '#8E8E93',
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionLabel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 11.5,
      color: '#8E8E93',
      letterSpacing: 0.8,
      marginBottom: 8,
      marginTop: 6,
    },
    label: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 11.5,
      color: '#8E8E93',
      marginBottom: 5,
    },
    input: {
      backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 46,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    textArea: {
      height: 'auto' as any,
      minHeight: 68,
      paddingVertical: 12,
      textAlignVertical: 'top',
      fontFamily: FONT_FAMILY.medium,
      fontSize: 13.5,
    },
    goalPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 14,
      backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
      borderWidth: 1.5,
      borderColor: 'transparent',
      gap: 8,
    },
    goalPillActive: {
      borderColor: '#A599FF',
      backgroundColor: 'rgba(165,153,255,0.18)',
    },
    goalPillText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 13,
      includeFontPadding: false,
    },
    dayPill: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    },
    dayPillActive: {
      backgroundColor: '#A599FF',
      borderColor: '#A599FF',
    },
    dayPillText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
      includeFontPadding: false,
    },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#A599FF',
      borderRadius: 14,
      height: 50,
      marginBottom: Platform.OS === 'ios' ? 24 : 12,
      marginTop: 10,
    },
    saveBtnText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
      color: '#000000',
      includeFontPadding: false,
    },
  });

export const s = StyleSheet.create({
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    includeFontPadding: false,
  },
});
