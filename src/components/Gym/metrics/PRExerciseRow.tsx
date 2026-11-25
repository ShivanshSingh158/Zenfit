import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Calendar, Dumbbell, Trophy } from 'lucide-react-native';
import { formatPRDate } from '../../../utils/progressiveOverload';
import { ICON } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { NumericText } from '../../ui';
import { useWeightUnit, kgToDisplay, unitLabel } from '../../../utils/weightUnit';

export interface PREntry {
  name: string;
  exerciseName?: string;
  best1RM?: number;
  heaviestWeight?: number;
  bestReps?: number;
  achievedAt?: string;
}

export interface PRExerciseRowProps {
  item: PREntry;
  index: number;
  styles: any;
  colors?: any;
}

export const PRExerciseRow: React.FC<PRExerciseRowProps> = React.memo(({
  item,
  index,
  styles,
}) => {
  const { tokens } = useTheme();
  const unitIsLbs = useWeightUnit();
  const uLabel = unitLabel(unitIsLbs);
  const displayName = (item.exerciseName || item.name || 'Exercise').trim();
  const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  const formattedDate = formatPRDate(item.achievedAt);

  const isGold = index === 0;
  const isSilver = index === 1;
  const isBronze = index === 2;

  const rankBadgeStyle = isGold
    ? styles.rankBadgeGold
    : isSilver
    ? styles.rankBadgeSilver
    : isBronze
    ? styles.rankBadgeBronze
    : styles.rankBadgeDefault;

  const rankTextStyle = isGold
    ? styles.rankTextGold
    : isSilver
    ? styles.rankTextSilver
    : isBronze
    ? styles.rankTextBronze
    : styles.rankTextDefault;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 25).duration(180)}>
      <View style={styles.row}>
        <View style={styles.rowTop}>
          <View style={styles.rankAndName}>
            <View style={[styles.rankBadge, rankBadgeStyle]}>
              <NumericText style={[styles.rankText, rankTextStyle]}>
                {index + 1}
              </NumericText>
            </View>
            <Text style={styles.exerciseName} numberOfLines={1}>
              {capitalizedName}
            </Text>
          </View>

          {formattedDate ? (
            <View style={styles.dateBadge}>
              <Calendar size={ICON.xs - 3} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
              <NumericText style={styles.dateText}>{formattedDate}</NumericText>
            </View>
          ) : null}
        </View>

        <View style={styles.rowBottom}>
          <View style={styles.chipGroup}>
            {item.best1RM && item.best1RM > 0 ? (
              <View style={styles.chip1RM}>
                <Trophy size={ICON.xs - 3} strokeWidth={ICON.strokeWidth} color={tokens.status.gold} />
                <NumericText style={styles.chip1RMText}>
                  {kgToDisplay(item.best1RM, unitIsLbs)} {uLabel} 1RM
                </NumericText>
              </View>
            ) : null}

            {item.heaviestWeight && item.heaviestWeight > 0 ? (
              <View style={styles.loadDetail}>
                <Dumbbell size={ICON.xs - 2} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
                <NumericText style={styles.loadDetailText}>
                  {kgToDisplay(item.heaviestWeight, unitIsLbs)} {uLabel} × {item.bestReps || 1} {item.bestReps === 1 ? 'rep' : 'reps'}
                </NumericText>
              </View>
            ) : null}
          </View>

          {index === 0 && (
            <View style={styles.latestTag}>
              <Text style={styles.latestTagText}>Latest</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
});

export default PRExerciseRow;
