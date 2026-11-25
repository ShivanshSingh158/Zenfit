import React from 'react';
import { View, Text } from 'react-native';
import { Activity, Clock, Flame, MapPin } from 'lucide-react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { ICON } from '../../../theme/tokens';
import { NumericText } from '../../ui';

export interface GymProgressCardioProps {
  totalCardioMins: number;
  calories: number;
  distance: number;
  styles: any;
}

export const GymProgressCardio: React.FC<GymProgressCardioProps> = React.memo(({
  totalCardioMins,
  calories,
  distance,
  styles,
}) => {
  const { tokens } = useTheme();

  if (totalCardioMins === 0) {
    return (
      <View style={styles.emptyBox}>
        <Activity size={ICON.lg} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
        <Text style={styles.emptyText}>No cardio logged in this period.</Text>
      </View>
    );
  }

  return (
    <View style={styles.cardioMetricsGrid}>
      <View style={styles.cardioMetricBox}>
        <Clock size={ICON.md} strokeWidth={ICON.strokeWidth} color={tokens.status.warning} />
        <NumericText style={styles.cardioMetricValue}>{totalCardioMins}</NumericText>
        <Text
          style={styles.cardioMetricLabel}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          maxFontSizeMultiplier={1.2}
        >
          Minutes
        </Text>
      </View>
      <View style={styles.cardioMetricBox}>
        <Flame size={ICON.md} strokeWidth={ICON.strokeWidth} color={tokens.status.danger} />
        <NumericText style={styles.cardioMetricValue}>{Math.round(calories)}</NumericText>
        <Text
          style={styles.cardioMetricLabel}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          maxFontSizeMultiplier={1.2}
        >
          Calories
        </Text>
      </View>
      <View style={styles.cardioMetricBox}>
        <MapPin size={ICON.md} strokeWidth={ICON.strokeWidth} color={tokens.status.info} />
        <NumericText style={styles.cardioMetricValue}>{distance.toFixed(1)}</NumericText>
        <Text
          style={styles.cardioMetricLabel}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          maxFontSizeMultiplier={1.2}
        >
          Distance (km)
        </Text>
      </View>
    </View>
  );
});

export default GymProgressCardio;
