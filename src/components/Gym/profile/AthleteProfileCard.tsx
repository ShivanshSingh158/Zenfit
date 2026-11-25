/**
 * AthleteProfileCard.tsx — ZenFit
 *
 * Clean Athlete Settings Profile Row with Obsidian surface alignment & unit sync.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { CheckCircle2, ChevronRight, Flame } from 'lucide-react-native';
import { UserAvatar } from '../../ui/UserAvatar';
import { NumericText, TactileButton } from '../../ui';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { AthleteCardStats, LifterTier } from '../../../services/athleteCardService';
import { useWeightUnit, formatWeight } from '../../../utils/weightUnit';

interface AthleteProfileCardProps {
  stats: AthleteCardStats;
  uid?: string | null;
  onOpenCard: () => void;
  onOpenSetup: () => void;
}

function getTierBorderColor(tier: LifterTier | undefined, tokens: ThemeTokens): string {
  switch (tier) {
    case 'elite':
      return tokens.accent.primary;
    case 'diamond':
      return tokens.status.info;
    case 'platinum':
      return tokens.accent.secondary;
    case 'gold':
      return tokens.status.gold;
    case 'silver':
      return tokens.text.secondary;
    case 'bronze':
    default:
      return tokens.status.warning;
  }
}

export const AthleteProfileCard: React.FC<AthleteProfileCardProps> = React.memo(({
  stats,
  uid,
  onOpenCard,
  onOpenSetup,
}) => {
  const { tokens, isDark } = useTheme();
  const unitIsLbs = useWeightUnit();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);

  const handlePress = () => {
    if (stats.hasPhysicalStats) {
      onOpenCard();
    } else {
      onOpenSetup();
    }
  };

  const tierBorderColor = useMemo(() => {
    if (stats.hasPhysicalStats && stats.tier) {
      return getTierBorderColor(stats.tier, tokens);
    }
    return tokens.accent.primary;
  }, [stats.hasPhysicalStats, stats.tier, tokens]);

  const formattedTier = useMemo(() => {
    if (!stats.tier) return '';
    return stats.tier.charAt(0).toUpperCase() + stats.tier.slice(1);
  }, [stats.tier]);

  const subtitleText = useMemo(() => {
    if (!stats.hasPhysicalStats) {
      return 'Add height & weight to unlock Performance Card';
    }
    const parts: string[] = [];
    if (stats.weightKg) parts.push(formatWeight(stats.weightKg, unitIsLbs, 1));
    if (stats.heightCm) parts.push(`${Math.round(stats.heightCm)} cm`);
    if (formattedTier) parts.push(`${formattedTier} Tier`);
    return parts.join(' · ');
  }, [stats.hasPhysicalStats, stats.weightKg, stats.heightCm, formattedTier, unitIsLbs]);

  const actionLabel = stats.hasPhysicalStats
    ? (width < 360 ? 'Card' : 'Performance Card')
    : 'Set Up';

  return (
    <TactileButton
      variant="custom"
      onPress={handlePress}
      style={styles.profileRow}
    >
      <View style={[styles.avatarWrap, { borderColor: tierBorderColor }]}>
        <UserAvatar
          size={46}
          uid={uid ?? (stats as any)?.uid}
          photoURL={stats.photoURL}
          fallbackLetter={stats.displayName ? stats.displayName.slice(0, 1).toUpperCase() : 'A'}
        />
      </View>

      <View style={styles.infoCol}>
        <View style={styles.nameRow}>
          <Text
            style={styles.nameText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {stats.displayName || 'Athlete'}
          </Text>
          <CheckCircle2
            size={ICON.sm - 1}
            strokeWidth={ICON.strokeWidth}
            color={tokens.status.success}
            style={styles.checkIcon}
          />
        </View>

        <View style={styles.subRow}>
          <NumericText
            style={styles.subText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {subtitleText}
          </NumericText>
          {stats.hasPhysicalStats && stats.streakDays > 0 && (
            <View style={styles.streakInline}>
              <Flame size={ICON.xs - 2} strokeWidth={ICON.strokeWidth} color={tokens.status.warning} />
              <NumericText style={styles.streakInlineText}>{stats.streakDays}d</NumericText>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actionRow}>
        <Text style={styles.actionText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {actionLabel}
        </Text>
        <ChevronRight size={15} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
      </View>
    </TactileButton>
  );
});

const makeStyles = (tokens: ThemeTokens, isDark: boolean) => StyleSheet.create({
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACE.sm,
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.md + 2,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : tokens.border.subtle,
    backgroundColor: isDark ? '#0F1015' : tokens.bg.surface,
    minHeight: TOUCH.minTarget,
  },
  avatarWrap: {
    padding: 1.5,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    flexShrink: 0,
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
    marginLeft: SPACE.md,
    marginRight: SPACE.sm,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs + 1,
    minWidth: 0,
  },
  nameText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.base,
    color: tokens.text.primary,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  checkIcon: {
    flexShrink: 0,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs + 2,
    marginTop: 2.5,
  },
  subText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: tokens.fontSize.xs,
    color: tokens.text.secondary,
    flexShrink: 1,
  },
  streakInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  streakInlineText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.xs,
    color: tokens.status.warning,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  actionText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12.5,
    color: tokens.accent.primary,
  },
});
