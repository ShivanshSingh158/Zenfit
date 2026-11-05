import { StyleSheet, Platform } from 'react-native';
import { FONT_FAMILY, SPACE, RADIUS } from '../../theme/tokens';

const stylesCache = new Map<string, any>();

export const makeCardioLogStyles = (colors: any, isDark: boolean = true) => {
  const cacheKey = `${isDark ? 'dark' : 'light'}_${colors?.background || ''}_${colors?.border || ''}_${colors?.textPrimary || ''}`;
  let cached = stylesCache.get(cacheKey);
  if (cached) return cached;

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: isDark ? '#000000' : colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACE.xl,
      paddingTop: Platform.OS === 'ios' ? 10 : 20,
      paddingBottom: SPACE.md,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border,
    },
    backBtn: { padding: SPACE.xs },
    headerTitle: { fontFamily: FONT_FAMILY.bold, fontSize: 13, color: colors.textMuted, letterSpacing: 1 },

    content: { padding: SPACE.xl, alignItems: 'center' },

    iconContainer: { alignItems: 'center', marginBottom: SPACE.xl * 1.5 },
    iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: SPACE.md },
    title: { fontFamily: FONT_FAMILY.bold, fontSize: 24, color: colors.textPrimary },

    form: { width: '100%', gap: SPACE.lg },
    row: { flexDirection: 'row', gap: SPACE.md },
    inputGroup: { gap: SPACE.xs },
    label: { fontFamily: FONT_FAMILY.bold, fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
    input: {
      backgroundColor: isDark ? '#1C1C1E' : colors.surface,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACE.md,
      height: 50,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 18,
      color: colors.textPrimary,
    },

    saveBtnWrapper: { marginTop: SPACE.lg, borderRadius: RADIUS.lg, overflow: 'hidden' },
    saveBtn: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { fontFamily: FONT_FAMILY.bold, fontSize: 16, color: '#ffffff' },

    quickChipsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    quickChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: RADIUS.full,
      backgroundColor: isDark ? '#1C1C1E' : colors.surface,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
    },
    quickChipActive: {
      backgroundColor: '#FF9F0A',
      borderColor: '#FF9F0A',
    },
    quickChipText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 12,
      color: colors.textPrimary,
    },
    quickChipTextActive: {
      color: '#FFFFFF',
    },
  });

  stylesCache.set(cacheKey, styles);
  return styles;
};
