import { StyleSheet, Platform } from 'react-native';
import { FONT_FAMILY, SPACE, RADIUS, IOS_DARK } from '../../theme/tokens';

export const makeAddExerciseStyles = (colors: any, isDark: boolean = true) =>
  StyleSheet.create({
    modalBg: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.72)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: isDark ? '#121214' : colors.surface,
      borderTopLeftRadius: RADIUS.xxl,
      borderTopRightRadius: RADIUS.xxl,
      paddingTop: SPACE.sm,
      paddingHorizontal: SPACE.md,
      paddingBottom: Platform.OS === 'ios' ? 36 : SPACE.lg,
      maxHeight: '92%',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 20,
    },
    dragHandle: {
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)',
      alignSelf: 'center',
      marginBottom: SPACE.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: SPACE.xs,
      marginBottom: SPACE.sm,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 18,
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Search Row
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1C1C20' : colors.surface2 || colors.surface,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
      borderRadius: RADIUS.lg,
      paddingHorizontal: SPACE.md,
      height: 44,
      marginBottom: SPACE.sm,
    },
    searchInput: {
      flex: 1,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 14,
      color: colors.textPrimary,
      paddingVertical: 0,
    },
    clearBtn: {
      padding: 4,
    },

    // Muscle Filter Bar
    filterBarContainer: {
      marginBottom: SPACE.sm,
    },
    filterChipsRow: {
      gap: 6,
      paddingVertical: 2,
      paddingRight: SPACE.md,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
    },
    filterChipActive: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : '#1C1C1E',
      borderColor: isDark ? 'rgba(255,255,255,0.22)' : '#1C1C1E',
    },
    filterChipText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      fontFamily: FONT_FAMILY.bold,
      color: isDark ? '#FFFFFF' : '#FFFFFF',
    },

    // Database Status Indicator
    statusNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      marginBottom: 6,
    },
    statusNoticeText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 11,
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },

    // Exercise Card List
    cardList: {
      paddingBottom: 24,
    },
    exerciseCard: {
      backgroundColor: isDark ? '#17171A' : colors.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 8,
    },
    exerciseCardSelected: {
      borderColor: isDark ? 'rgba(255,255,255,0.25)' : colors.textPrimary,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    cardNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
      paddingRight: 8,
    },
    cardTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14.5,
      color: colors.textPrimary,
      flex: 1,
      letterSpacing: -0.2,
    },

    // Tier Badge
    tierBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
    },
    tierBadgeText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 9.5,
    },

    // Muscles Row
    cardMuscleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    muscleDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    cardMuscleText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 11.5,
      color: colors.textTertiary,
      flex: 1,
    },
    primaryMuscleText: {
      fontFamily: FONT_FAMILY.bold,
      color: colors.textSecondary,
    },
    secondaryMuscleText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 11.5,
      color: colors.textTertiary,
    },

    // Card Bottom Row (Snippet + Action)
    cardBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border,
    },
    snippetContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      paddingRight: 8,
    },
    snippetText: {
      fontFamily: FONT_FAMILY.mono,
      fontSize: 11,
      color: colors.textTertiary,
    },
    snippetHistoryText: {
      color: colors.textSecondary,
      fontWeight: '600',
    },
    quickAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: RADIUS.full,
    },
    quickAddBtnText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 11.5,
      color: colors.textPrimary,
    },

    // Instant Create Custom Exercise Card
    createCustomCard: {
      backgroundColor: isDark ? '#1C1C20' : colors.surface,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
      borderRadius: RADIUS.lg,
      padding: 16,
      marginTop: 8,
      marginBottom: 16,
    },
    createCustomHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    createCustomIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(165,153,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    createCustomTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 16,
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    createCustomSubtitle: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    createCustomCtaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#A599FF',
      paddingVertical: 12,
      borderRadius: RADIUS.lg,
      shadowColor: '#A599FF',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    createCustomCtaText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
      color: '#000000',
    },
    createCustomSecondaryLink: {
      alignItems: 'center',
      paddingTop: 10,
    },
    createCustomSecondaryText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 11.5,
      color: '#A599FF',
      textDecorationLine: 'underline',
    },

    // Quick Tuning Form
    tuningContainer: {
      backgroundColor: isDark ? '#1C1C20' : colors.surface2 || colors.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
      padding: SPACE.md,
      marginTop: SPACE.sm,
      marginBottom: SPACE.md,
    },
    tuningTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 12,
      color: '#A599FF',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: SPACE.sm,
    },
    metaRow: {
      flexDirection: 'row',
      gap: SPACE.sm,
      marginBottom: SPACE.sm,
    },
    inputGroup: {
      marginBottom: SPACE.sm,
    },
    inputLabel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 10.5,
      color: colors.textTertiary,
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    inputCompact: {
      backgroundColor: isDark ? '#26262B' : colors.surface,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACE.sm,
      height: 42,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    input: {
      backgroundColor: isDark ? '#26262B' : colors.surface,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACE.md,
      height: 42,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 13,
      color: colors.textPrimary,
    },
    masterSplitContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: SPACE.xs,
    },
    masterSplitTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    masterSplitDesc: {
      fontFamily: FONT_FAMILY.body,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 1,
    },
    submitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#ffffff' : colors.accentPrimary,
      paddingVertical: 12,
      borderRadius: RADIUS.lg,
      marginTop: SPACE.xs,
    },
    submitBtnDisabled: {
      opacity: 0.4,
    },
    submitBtnText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14.5,
      color: isDark ? '#000000' : '#ffffff',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 16,
    },
    emptyStateText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 13,
      color: colors.textTertiary,
      textAlign: 'center',
      marginTop: 8,
    },
  });
