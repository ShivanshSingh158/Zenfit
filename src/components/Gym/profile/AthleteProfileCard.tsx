/**
 * AthleteProfileCard.tsx — ZenFit
 *
 * Ultra-clean Apple iOS Settings Profile Row:
 * - Flawless flexbox layout with guaranteed zero-overlap
 * - Auto-truncating name and checkmark with protected action pill
 * - Clean physical stats (weight, height, lifter tier) with no awkward cutoffs
 * - 1-tap opens the Full-Screen Official Athlete Card
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '../../ui/UserAvatar';
import { FONT_FAMILY } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { AthleteCardStats, LifterTier } from '../../../services/athleteCardService';
import { hapticLight } from '../../../utils/haptics';

interface AthleteProfileCardProps {
  stats: AthleteCardStats;
  onOpenCard: () => void;
  onOpenSetup: () => void;
}

const TIER_BORDER_COLORS: Record<LifterTier, string> = {
  elite: '#00F0FF',
  diamond: '#0A84FF',
  platinum: '#BF5AF2',
  gold: '#FFD700',
  silver: '#E5E5EA',
  bronze: '#F59E0B',
};

export const AthleteProfileCard: React.FC<AthleteProfileCardProps> = ({
  stats,
  onOpenCard,
  onOpenSetup,
}) => {
  const { isDark } = useTheme();

  const handlePress = () => {
    hapticLight();
    if (stats.hasPhysicalStats) {
      onOpenCard();
    } else {
      onOpenSetup();
    }
  };

  const tierBorderColor = useMemo(() => {
    if (stats.hasPhysicalStats && stats.tier && TIER_BORDER_COLORS[stats.tier]) {
      return TIER_BORDER_COLORS[stats.tier];
    }
    return '#0A84FF';
  }, [stats.hasPhysicalStats, stats.tier]);

  const formattedTier = useMemo(() => {
    if (!stats.tier) return '';
    return stats.tier.charAt(0).toUpperCase() + stats.tier.slice(1);
  }, [stats.tier]);

  const subtitleText = useMemo(() => {
    if (!stats.hasPhysicalStats) {
      return 'Tap to complete physical stats & unlock card';
    }
    const parts: string[] = [];
    if (stats.weightKg) parts.push(`${stats.weightKg} kg`);
    if (stats.heightCm) parts.push(`${stats.heightCm} cm`);
    if (formattedTier) parts.push(formattedTier);
    if (stats.streakDays > 0) parts.push(`🔥 ${stats.streakDays}d`);
    return parts.join(' · ');
  }, [stats.hasPhysicalStats, stats.weightKg, stats.heightCm, formattedTier, stats.streakDays]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.profileRow,
        {
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          borderColor: isDark ? '#2C2C2E' : '#E5E5EA',
        },
      ]}
      activeOpacity={0.8}
    >
      {/* Gmail Profile Picture with Lifter Tier Ring */}
      <View style={[styles.avatarWrap, { borderColor: tierBorderColor }]}>
        <UserAvatar
          size={46}
          photoURL={stats.photoURL}
          fallbackLetter={stats.displayName ? stats.displayName.slice(0, 1).toUpperCase() : 'A'}
        />
      </View>

      {/* Name & Basic Info (Guaranteed Zero Overlap) */}
      <View style={styles.infoCol}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.nameText, { color: isDark ? '#FFFFFF' : '#000000' }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {stats.displayName || 'Athlete'}
          </Text>
          <Ionicons
            name="checkmark-circle"
            size={15}
            color="#30D158"
            style={styles.checkIcon}
          />
        </View>

        <Text
          style={styles.subText}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {subtitleText}
        </Text>
      </View>

      {/* View Card Action Badge (Protected Width, No Overlap) */}
      <View style={styles.actionBadge}>
        <Text style={styles.actionText} numberOfLines={1}>
          {stats.hasPhysicalStats ? 'View Card' : 'Unlock'}
        </Text>
        <Ionicons name="chevron-forward" size={12} color="#0A84FF" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 0,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatarWrap: {
    padding: 1.5,
    borderRadius: 26,
    borderWidth: 1.5,
    flexShrink: 0,
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 10,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
  },
  nameText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  checkIcon: {
    flexShrink: 0,
  },
  subText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2.5,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    flexShrink: 0,
  },
  actionText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11.5,
    color: '#0A84FF',
  },
});
