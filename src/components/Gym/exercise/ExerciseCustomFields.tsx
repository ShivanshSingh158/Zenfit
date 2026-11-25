import React from 'react';
import { View, Text, TextInput, Switch, Platform } from 'react-native';
import { Video, X } from 'lucide-react-native';
import { ICON, TOUCH } from '../../../theme/tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { TactileButton } from '../../ui';
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
  styles,
}) => {
  const { tokens } = useTheme();

  return (
    <>
      <View style={styles.metaRow}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>SETS</Text>
          <TextInput
            style={styles.inputCompact}
            maxFontSizeMultiplier={1.25}
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
            maxFontSizeMultiplier={1.25}
            value={reps}
            onChangeText={setReps}
            textAlign="center"
          />
        </View>

        <View style={[styles.inputGroup, { flex: 1.5 }]}>
          <Text style={styles.inputLabel}>REST (SEC)</Text>
          <TextInput
            style={styles.inputCompact}
            maxFontSizeMultiplier={1.25}
            keyboardType="numeric"
            value={restTime}
            onChangeText={setRestTime}
            textAlign="center"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>VIDEO REFERENCE LINK (OPTIONAL)</Text>
        <View style={styles.searchRow}>
          <Video
            size={ICON.sm + 1}
            strokeWidth={ICON.strokeWidth}
            color={tokens.text.secondary}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="e.g. https://youtu.be/..."
            placeholderTextColor={tokens.text.muted}
            value={videoLink}
            onChangeText={setVideoLink}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {videoLink.length > 0 && (
            <TactileButton
              variant="custom"
              onPress={() => setVideoLink('')}
              style={styles.clearBtn}
              hitSlop={TOUCH.hitSlop}
              accessibilityLabel="Clear video link"
            >
              <X size={ICON.sm + 1} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
            </TactileButton>
          )}
        </View>
      </View>

      {planDay && (
        <View style={styles.masterSplitContainer}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.masterSplitTitle}>Save to Master Split</Text>
            <Text style={styles.masterSplitDesc}>Add to all future {planDay.name} days.</Text>
          </View>
          <Switch
            value={savePermanently}
            onValueChange={setSavePermanently}
            trackColor={{ false: tokens.border.subtle, true: tokens.accent.primary }}
            thumbColor={
              Platform.OS === 'ios'
                ? tokens.text.primary
                : savePermanently
                ? tokens.accent.onPrimary
                : tokens.text.secondary
            }
          />
        </View>
      )}
    </>
  );
});

export default ExerciseCustomFields;
