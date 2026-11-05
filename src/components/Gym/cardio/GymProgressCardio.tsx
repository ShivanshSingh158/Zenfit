import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  if (totalCardioMins === 0) {
    return (
      <View style={styles.emptyBox}>
        <Ionicons name="walk-outline" size={24} color="#8E8E93" />
        <Text style={styles.emptyText}>No cardio logged in this period.</Text>
      </View>
    );
  }

  return (
    <View style={styles.cardioMetricsGrid}>
      <View style={styles.cardioMetricBox}>
        <Ionicons name="time-outline" size={20} color="#FF9F0A" />
        <Text style={styles.cardioMetricValue}>{totalCardioMins}</Text>
        <Text style={styles.cardioMetricLabel}>Minutes</Text>
      </View>
      <View style={styles.cardioMetricBox}>
        <Ionicons name="flame-outline" size={20} color="#FF453A" />
        <Text style={styles.cardioMetricValue}>{Math.round(calories)}</Text>
        <Text style={styles.cardioMetricLabel}>Calories</Text>
      </View>
      <View style={styles.cardioMetricBox}>
        <Ionicons name="location-outline" size={20} color="#38BDF8" />
        <Text style={styles.cardioMetricValue}>{distance.toFixed(1)}</Text>
        <Text style={styles.cardioMetricLabel}>Distance (km)</Text>
      </View>
    </View>
  );
});

export default GymProgressCardio;
