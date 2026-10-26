import { StyleSheet } from 'react-native';
import { FONT_FAMILY, RADIUS, IOS_DARK } from '../../theme/tokens';

const stylesCache = new Map<string, any>();

export const makeWorkoutSummaryStyles = (colors: any, isDark: boolean) => {
  const cacheKey = `${isDark ? 'dark' : 'light'}_${colors?.background || ''}_${colors?.card || ''}_${colors?.textPrimary || ''}`;
  let cached = stylesCache.get(cacheKey);
  if (cached) return cached;

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: isDark ? IOS_DARK.bgCanvas : colors.background,
    },
    header: {
      paddingHorizontal: 6,
      paddingTop: 8,
      paddingBottom: 4,
      alignItems: 'flex-start',
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      borderRadius: RADIUS.full,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: 6,
      paddingTop: 8,
      paddingBottom: 24,
    },
    heroSection: {
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 20,
    },
    badgeHalo: {
      marginBottom: 12,
    },
    haloGradient: {
      padding: 4,
      borderRadius: RADIUS.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeWrapper: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: isDark ? IOS_DARK.bgGroupedCard : '#FFFFFF',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(165,153,255,0.4)' : colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#A599FF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    },
    sessionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(94, 218, 158, 0.12)' : 'rgba(5, 150, 105, 0.1)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(94, 218, 158, 0.3)' : 'rgba(5, 150, 105, 0.25)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.full,
      marginBottom: 10,
    },
    pulseDot: {
      width: 6,
      height: 6,
      borderRadius: RADIUS.full,
      backgroundColor: isDark ? '#5EDA9E' : colors.accentGreen,
    },
    sessionPillText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 10,
      color: isDark ? '#5EDA9E' : colors.accentGreen,
      letterSpacing: 0.8,
      fontWeight: '700',
    },
    heroTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 28,
      color: isDark ? '#FFFFFF' : colors.textPrimary,
      textAlign: 'center',
      letterSpacing: -0.5,
      marginBottom: 4,
      fontWeight: '800',
    },
    heroSubtitle: {
      fontFamily: FONT_FAMILY.body,
      fontSize: 13.5,
      color: isDark ? '#8E8E93' : colors.textMuted,
      textAlign: 'center',
    },

    // PR Card
    prCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
      gap: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255, 107, 107, 0.3)' : colors.border,
    },
    prIconBox: {
      width: 38,
      height: 38,
      borderRadius: RADIUS.md,
      backgroundColor: 'rgba(255, 107, 107, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    prTag: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 10,
      color: '#FF6B6B',
      letterSpacing: 0.8,
      marginBottom: 2,
      fontWeight: '700',
    },
    prText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
      color: isDark ? '#FFFFFF' : colors.textPrimary,
      fontWeight: '700',
    },

    // 4 Stats Grid Box
    statsGrid: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 14,
    },
    statBox: {
      flex: 1,
      backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
    },
    statNumber: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 18,
      color: isDark ? '#FFFFFF' : colors.textPrimary,
      marginBottom: 2,
      fontWeight: '700',
    },
    statLabel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 9.5,
      color: isDark ? '#8E8E93' : colors.textMuted,
      letterSpacing: 0.6,
      fontWeight: '700',
    },

    // Section Headers
    sectionContainer: {
      marginBottom: 14,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
      paddingHorizontal: 2,
    },
    sectionTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 11,
      color: '#8E8E93',
      letterSpacing: 0.8,
      fontWeight: '700',
    },
    countBadge: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: RADIUS.full,
      marginLeft: 'auto',
    },
    countBadgeText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 10,
      color: '#8E8E93',
      fontWeight: '700',
    },

    // Exercise List
    exercisesList: {
      borderRadius: 14,
      backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
      overflow: 'hidden',
    },
    exerciseCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    exerciseName: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14.5,
      color: isDark ? '#FFFFFF' : colors.textPrimary,
      marginBottom: 3,
      fontWeight: '600',
    },
    exerciseMetaBadge: {
      fontFamily: FONT_FAMILY.body,
      fontSize: 12,
      color: '#8E8E93',
    },
    exerciseMetaWeight: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 13,
      color: '#A599FF',
      fontWeight: '700',
    },
    expandBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    expandBtnText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 12,
      color: '#A599FF',
      fontWeight: '600',
    },

    // 90-Day Progression Card
    progressionCard: {
      backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
    },
    pillRow: {
      flexDirection: 'row',
      gap: 6,
    },
    liftPill: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 9,
      backgroundColor: isDark ? IOS_DARK.bgElevatedInput : 'rgba(0, 0, 0, 0.05)',
    },
    liftPillActive: {
      backgroundColor: isDark ? 'rgba(165, 153, 255, 0.18)' : 'rgba(108, 92, 231, 0.15)',
      borderWidth: 1,
      borderColor: '#A599FF',
    },
    liftPillText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      color: '#8E8E93',
    },
    liftPillTextActive: {
      color: isDark ? '#FFFFFF' : colors.accentPrimary,
      fontFamily: FONT_FAMILY.bold,
      fontWeight: '700',
    },

    // Progression Metric Segmented Control
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#141418' : 'rgba(0, 0, 0, 0.05)',
      borderRadius: 9,
      padding: 2,
      marginBottom: 14,
      height: 34,
      alignItems: 'center',
    },
    segmentBtn: {
      flex: 1,
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 7,
    },
    segmentBtnActive: {
      backgroundColor: isDark ? IOS_DARK.bgElevatedInput : '#FFFFFF',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    segmentText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      color: '#8E8E93',
    },
    segmentTextActive: {
      fontFamily: FONT_FAMILY.bold,
      color: isDark ? '#FFFFFF' : '#000000',
      fontWeight: '700',
    },

    chartWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      overflow: 'hidden',
    },
    chartStyle: {
      marginVertical: 4,
      borderRadius: 10,
    },
    emptyChartBox: {
      paddingVertical: 28,
      paddingHorizontal: 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.03)',
      borderRadius: 10,
    },
    emptyIconBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    emptyChartTitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
      color: isDark ? '#FFFFFF' : colors.textPrimary,
      marginBottom: 4,
      fontWeight: '700',
    },
    emptyChartText: {
      fontFamily: FONT_FAMILY.body,
      fontSize: 12,
      color: '#8E8E93',
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 260,
    },

    // Session Notes
    notesContainer: {
      backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
    },
    notesText: {
      fontFamily: FONT_FAMILY.body,
      fontSize: 13.5,
      color: isDark ? '#FFFFFF' : colors.textPrimary,
      lineHeight: 20,
    },

    // Sticky Bottom Footer & Done Button
    footer: {
      paddingHorizontal: 6,
      paddingTop: 8,
      backgroundColor: isDark ? IOS_DARK.bgCanvas : colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    },
    doneBtn: {
      backgroundColor: isDark ? '#FFFFFF' : colors.accentPrimary,
      height: 50,
      width: '100%',
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    doneBtnText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 16,
      color: isDark ? '#000000' : '#FFFFFF',
      letterSpacing: -0.2,
      fontWeight: '700',
    },
  });

  stylesCache.set(cacheKey, styles);
  return styles;
};
