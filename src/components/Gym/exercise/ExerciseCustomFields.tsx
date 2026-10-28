import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GymPlanDay } from '../../../types/gym.types';

export interface ExerciseCustomFieldsProps {
  sets: string;
  setSets: (val: string) => void;
  reps: string;
  setReps: (val: string) => void;
  restTime: string;
  setRestTime: (val: string) => void;
  muscle?: string;
  setMuscle?: (val: string) => void;
  videoLink: string;
  setVideoLink: (val: string) => void;
  savePermanently: boolean;
  setSavePermanently: (val: boolean) => void;
  planDay?: GymPlanDay;
  colors: any;
  styles: any;
  isDark?: boolean;
}

export const ExerciseCustomFields: React.FC<ExerciseCustomFieldsProps> = React.memo(({
  sets,
  setSets,
  reps,
  setReps,
  restTime,
  setRestTime,
  videoLink,
  setVideoLink,
  savePermanently,
  setSavePermanently,
  planDay,
  colors,
  styles,
  isDark = true,
}) => {
  return (
    <>
      {/* Sets / Reps / Rest • 3-column row */}
      <View style={styles.metaRow}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>SETS</Text>
          <TextInput
            style={styles.inputCompact}
            keyboardType="numeric"
            value={sets}
            onChangeText={setSets}
            textAlign="center"
          />
        </View>

        <View style={[styles.inputGroup, { flex: 1.6 }]}>
          <Text style={styles.inputLabel}>REPS</Text>
          <TextInput
            style={styles.inputCompact}
            value={reps}
            onChangeText={setReps}
            textAlign="center"
          />
        </View>

        <View style={[styles.inputGroup, { flex: 1.5 }]}>
          <Text style={styles.inputLabel}>REST (SEC)</Text>
          <TextInput
            style={styles.inputCompact}
            keyboardType="numeric"
            value={restTime}
            onChangeText={setRestTime}
            textAlign="center"
          />
        </View>
      </View>

      {/* YouTube Link */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>YOUTUBE LINK (OPTIONAL)</Text>
        <View style={styles.searchRow}>
          <Ionicons
            name="videocam-outline"
            size={17}
            color={colors.textTertiary}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="e.g. https://youtu.be/..."
            placeholderTextColor={colors.textTertiary}
            value={videoLink}
            onChangeText={setVideoLink}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {videoLink.length > 0 && (
            <TouchableOpacity
              onPress={() => setVideoLink('')}
              style={styles.clearBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={17} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Save to Master Split */}
      {planDay && (
        <View style={styles.masterSplitContainer}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.masterSplitTitle}>Save to Master Split</Text>
            <Text style={styles.masterSplitDesc}>Add to all future {planDay.name} days.</Text>
          </View>
          <Switch
            value={savePermanently}
            onValueChange={setSavePermanently}
            trackColor={{ false: 'rgba(255,255,255,0.12)', true: colors.accentPrimary || '#A599FF' }}
            thumbColor={Platform.OS === 'ios' ? '#fff' : savePermanently ? '#fff' : '#f4f3f4'}
          />
        </View>
      )}
    </>
  );
});

export default ExerciseCustomFields;
