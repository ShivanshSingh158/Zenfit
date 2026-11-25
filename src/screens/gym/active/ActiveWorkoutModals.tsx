import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SetRestPickerSheet from '../../../components/Gym/active/SetRestPickerSheet';
import {
  WhatThisSessionHitsSheet,
  FinishEarlySheet,
  WorkoutMenuSheet,
  ExerciseMenuSheet,
  WorkoutNoteModal,
  WorkoutSettingsSheet,
} from '../../../components/Gym/active';
import ExerciseDeepDiveModal from '../../../components/Gym/exercise/ExerciseDeepDiveModal';
import { AppBottomSheet } from '../../../components/ui/AppBottomSheet';
import { TactileButton } from '../../../components/ui/TactileButton';
import { useTheme } from '../../../contexts/ThemeContext';
import { afterSheetDismiss, cancelScheduledSheetHandoff } from '../../../utils/sheetCoordinator';
import { getDefaultRestSecsSync } from '../../../hooks/useGymProfile';

export interface ActiveWorkoutModalsProps {
  deepDiveVisible: boolean;
  setDeepDiveVisible: (v: boolean) => void;
  deepDiveInitialTab?: 'guide' | 'analytics';
  setDeepDiveInitialTab?: (tab: 'guide' | 'analytics') => void;
  showWhatHitsSheet: boolean;
  setShowWhatHitsSheet: (v: boolean) => void;
  showWorkoutMenuSheet: boolean;
  setShowWorkoutMenuSheet: (v: boolean) => void;
  showWorkoutSettingsSheet: boolean;
  setShowWorkoutSettingsSheet: (v: boolean) => void;
  showExerciseMenuSheet: boolean;
  setShowExerciseMenuSheet: (v: boolean) => void;
  showFinishEarlySheet: boolean;
  setShowFinishEarlySheet: (v: boolean) => void;
  noteModalConfig: {
    visible: boolean;
    title: string;
    initialNote: string;
    target: 'session' | 'exercise';
  };
  setNoteModalConfig: React.Dispatch<
    React.SetStateAction<{
      visible: boolean;
      title: string;
      initialNote: string;
      target: 'session' | 'exercise';
    }>
  >;
  restPickerSetIdx: number | null;
  setRestPickerSetIdx: (idx: number | null) => void;
  sheetInitialSecs: number;
  exercise: any;
  exercises: any[];
  activeExIndex: number;
  setActiveExIndex: (idx: number) => void;
  activeSetIndex: number;
  overloadSuggestion: any;
  gymLogs: any[];
  sessionNote: string;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  autoTimerEnabled: boolean;
  setAutoTimerEnabled: (v: boolean) => void;
  keepAwakeEnabled: boolean;
  setKeepAwakeEnabled: (v: boolean) => void;
  uncheckedSetsCount: number;
  completedSetsCount: number;
  hasWarmups?: boolean;
  onSupersetPress?: () => void;
  onAddExercise: () => void;
  onSelectDefaultRest: (secs: number) => void;
  onToggleAutoTimerGlobal: (val: boolean) => void;
  onToggleAudioGlobal: (val: boolean) => void;
  onSwapPress: () => void;
  onAutoWarmup: () => void;
  onShowVideo: () => void;
  onRemoveExercise?: () => void;
  onFinishAndSave: () => void;
  onDiscardWorkout: () => void;
  onSaveNote: (note: string) => void;
  onSelectRest: (secs: number, saveAsDefault?: boolean) => void;
  onTimerSkip: () => void;
}

export const ActiveWorkoutModals: React.FC<ActiveWorkoutModalsProps> = React.memo(
  function ActiveWorkoutModals({
    deepDiveVisible,
    setDeepDiveVisible,
    deepDiveInitialTab = 'guide',
    setDeepDiveInitialTab,
    showWhatHitsSheet,
    setShowWhatHitsSheet,
    showWorkoutMenuSheet,
    setShowWorkoutMenuSheet,
    showWorkoutSettingsSheet,
    setShowWorkoutSettingsSheet,
    showExerciseMenuSheet,
    setShowExerciseMenuSheet,
    showFinishEarlySheet,
    setShowFinishEarlySheet,
    noteModalConfig,
    setNoteModalConfig,
    restPickerSetIdx,
    setRestPickerSetIdx,
    sheetInitialSecs,
    exercise,
    exercises,
    activeExIndex,
    setActiveExIndex,
    activeSetIndex,
    overloadSuggestion,
    gymLogs,
    sessionNote,
    soundEnabled,
    setSoundEnabled,
    autoTimerEnabled,
    setAutoTimerEnabled,
    keepAwakeEnabled,
    setKeepAwakeEnabled,
    uncheckedSetsCount,
    completedSetsCount,
    hasWarmups = false,
    onSupersetPress,
    onAddExercise,
    onSelectDefaultRest,
    onToggleAutoTimerGlobal,
    onToggleAudioGlobal,
    onSwapPress,
    onAutoWarmup,
    onShowVideo,
    onRemoveExercise,
    onFinishAndSave,
    onDiscardWorkout,
    onSaveNote,
    onSelectRest,
    onTimerSkip,
  }) {
    const { tokens, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [isRestDefaultMode, setIsRestDefaultMode] = useState(false);
    const [deepDiveEver, setDeepDiveEver] = useState(deepDiveVisible);
    const [whatHitsEver, setWhatHitsEver] = useState(showWhatHitsSheet);
    const [workoutMenuEver, setWorkoutMenuEver] = useState(showWorkoutMenuSheet);
    const [settingsEver, setSettingsEver] = useState(showWorkoutSettingsSheet);
    const [exerciseMenuEver, setExerciseMenuEver] = useState(showExerciseMenuSheet);
    const [finishEarlyEver, setFinishEarlyEver] = useState(showFinishEarlySheet);
    const [noteEver, setNoteEver] = useState(noteModalConfig.visible);
    const [restPickerEver, setRestPickerEver] = useState(restPickerSetIdx !== null);
    const [removeConfirmEver, setRemoveConfirmEver] = useState(false);

    useEffect(() => { if (deepDiveVisible) setDeepDiveEver(true); }, [deepDiveVisible]);
    useEffect(() => { if (showWhatHitsSheet) setWhatHitsEver(true); }, [showWhatHitsSheet]);
    useEffect(() => { if (showWorkoutMenuSheet) setWorkoutMenuEver(true); }, [showWorkoutMenuSheet]);
    useEffect(() => { if (showWorkoutSettingsSheet) setSettingsEver(true); }, [showWorkoutSettingsSheet]);
    useEffect(() => { if (showExerciseMenuSheet) setExerciseMenuEver(true); }, [showExerciseMenuSheet]);
    useEffect(() => { if (showFinishEarlySheet) setFinishEarlyEver(true); }, [showFinishEarlySheet]);
    useEffect(() => { if (noteModalConfig.visible) setNoteEver(true); }, [noteModalConfig.visible]);
    useEffect(() => { if (restPickerSetIdx !== null) setRestPickerEver(true); }, [restPickerSetIdx]);
    useEffect(() => { if (showRemoveConfirm) setRemoveConfirmEver(true); }, [showRemoveConfirm]);

    const scheduleAfterSheetClose = useCallback((fn: () => void) => {
      afterSheetDismiss(fn);
    }, []);

    useEffect(() => {
      return () => {
        cancelScheduledSheetHandoff();
      };
    }, []);

    return (
      <>
        {/* Deep-Dive Inspector Modal (only mounts on first tap; kept alive cleanly for closing glide) */}
        {deepDiveEver && (
          <ExerciseDeepDiveModal
            visible={deepDiveVisible}
            exerciseName={exercise?.name ?? null}
            exercise={exercise}
            overloadSuggestion={overloadSuggestion}
            gymLogs={gymLogs || []}
            initialTab={deepDiveInitialTab}
            onClose={() => setDeepDiveVisible(false)}
          />
        )}

        {/* What This Session Hits Sheet */}
        {whatHitsEver && (
          <WhatThisSessionHitsSheet
            visible={showWhatHitsSheet}
            exercises={exercises}
            onClose={() => setShowWhatHitsSheet(false)}
          />
        )}

        {/* Workout Menu Sheet */}
        {workoutMenuEver && (
          <WorkoutMenuSheet
            visible={showWorkoutMenuSheet}
            restDurationText={`${Math.floor((exercise?.restTimeSecs || 90) / 60)}:${String(
              (exercise?.restTimeSecs || 90) % 60
            ).padStart(2, '0')} rest · ${soundEnabled ? 'Sound' : 'Mute'}`}
            sessionNote={sessionNote}
            onOpenWorkoutSettings={() => {
              setShowWorkoutMenuSheet(false);
              scheduleAfterSheetClose(() => setShowWorkoutSettingsSheet(true));
            }}
            onAddExercise={() => {
              setShowWorkoutMenuSheet(false);
              scheduleAfterSheetClose(onAddExercise);
            }}
            onAddSessionNote={() => {
              setShowWorkoutMenuSheet(false);
              scheduleAfterSheetClose(() =>
                setNoteModalConfig({
                  visible: true,
                  title: 'Session Note',
                  initialNote: sessionNote,
                  target: 'session',
                })
              );
            }}
            onDiscardWorkout={onDiscardWorkout}
            onClose={() => setShowWorkoutMenuSheet(false)}
          />
        )}

        {/* Workout Settings Bottom Sheet */}
        {settingsEver && (
          <WorkoutSettingsSheet
            visible={showWorkoutSettingsSheet}
            defaultRestSecs={exercise?.restTimeSecs || getDefaultRestSecsSync()}
            autoTimerEnabled={autoTimerEnabled}
            soundEnabled={soundEnabled}
            keepAwakeEnabled={keepAwakeEnabled}
            onSelectDefaultRest={onSelectDefaultRest}
            onToggleAutoTimer={(val) => {
              setAutoTimerEnabled(val);
              onToggleAutoTimerGlobal(val);
            }}
            onToggleSound={(val) => {
              setSoundEnabled(val);
              onToggleAudioGlobal(val);
            }}
            onToggleKeepAwake={setKeepAwakeEnabled}
            onClose={() => setShowWorkoutSettingsSheet(false)}
          />
        )}

        {/* Exercise Menu Sheet */}
        {exerciseMenuEver && (
          <ExerciseMenuSheet
          visible={showExerciseMenuSheet}
          exerciseName={exercise?.name || ''}
          currentRestText={
            exercise?.restTimeSecs
              ? `${Math.floor(exercise.restTimeSecs / 60)}:${String(
                  exercise.restTimeSecs % 60
                ).padStart(2, '0')}`
              : '1:30'
          }
          exerciseNote={exercise?.notes || ''}
          hasWarmups={hasWarmups}
          isSupersetLinked={Boolean(exercise?.supersetGroup)}
          onAddNote={() => {
            setShowExerciseMenuSheet(false);
            scheduleAfterSheetClose(() =>
              setNoteModalConfig({
                visible: true,
                title: `Note for ${exercise?.name}`,
                initialNote: exercise?.notes || '',
                target: 'exercise',
              })
            );
          }}
          onSwapExercise={() => {
            setShowExerciseMenuSheet(false);
            scheduleAfterSheetClose(onSwapPress);
          }}
          onSupersetPress={onSupersetPress ? () => {
            setShowExerciseMenuSheet(false);
            scheduleAfterSheetClose(onSupersetPress);
          } : undefined}
          onAddWarmupSet={() => {
            setShowExerciseMenuSheet(false);
            scheduleAfterSheetClose(onAutoWarmup);
          }}
          onConfigureRestTimer={() => {
            setShowExerciseMenuSheet(false);
            scheduleAfterSheetClose(() => {
              setIsRestDefaultMode(true);
              setRestPickerSetIdx(activeSetIndex);
            });
          }}
          onViewHistory={() => {
            setShowExerciseMenuSheet(false);
            scheduleAfterSheetClose(() => {
              setDeepDiveInitialTab?.('analytics');
              setDeepDiveVisible(true);
            });
          }}
          onHowToDoIt={() => {
            setShowExerciseMenuSheet(false);
            scheduleAfterSheetClose(() => {
              setDeepDiveInitialTab?.('guide');
              setDeepDiveVisible(true);
            });
          }}
          onRemoveExercise={() => {
            setShowExerciseMenuSheet(false);
            scheduleAfterSheetClose(() => setShowRemoveConfirm(true));
          }}
          onClose={() => setShowExerciseMenuSheet(false)}
          />
        )}

        {/* In-App Dark Confirmation for Removing Exercise */}
        {removeConfirmEver && (
          <AppBottomSheet
            visible={showRemoveConfirm}
            onClose={() => setShowRemoveConfirm(false)}
            noPadding
          >
            <View
              style={{
                paddingHorizontal: tokens.space.lg,
                paddingBottom: Math.max(insets.bottom, tokens.space.xl),
                paddingTop: tokens.space.sm,
                gap: 12,
              }}
            >
              <Text style={[tokens.typography.h2, { color: tokens.text.primary }]}>
                Remove exercise?
              </Text>
              <Text style={[tokens.typography.body, { color: tokens.text.secondary, lineHeight: 20 }]}>
                Remove {exercise?.name || 'this exercise'} from today's session? Logged sets for this exercise will be cleared.
              </Text>
              <View style={{ gap: 10, marginTop: 4 }}>
                <TactileButton
                  variant="custom"
                  haptic="medium"
                  style={[
                    confirmStyles.primaryBtn,
                    {
                      backgroundColor: tokens.accent.crimson,
                      borderRadius: tokens.radius.card,
                    },
                  ]}
                  onPress={() => {
                    setShowRemoveConfirm(false);
                    if (onRemoveExercise) {
                      onRemoveExercise();
                    } else {
                      const nextExercises = exercises.filter(
                        (_: any, idx: number) => idx !== activeExIndex
                      );
                      if (nextExercises.length > 0) {
                        setActiveExIndex(Math.max(0, activeExIndex - 1));
                      }
                    }
                  }}
                >
                  <Text style={[tokens.typography.label, { fontFamily: tokens.font.bold, color: '#FFFFFF' }]}>
                    Remove exercise
                  </Text>
                </TactileButton>
                <TactileButton
                  variant="secondary"
                  size="lg"
                  onPress={() => setShowRemoveConfirm(false)}
                  style={{
                    backgroundColor: isDark ? '#14161D' : '#FFFFFF',
                    borderColor: tokens.border.subtle,
                    borderRadius: tokens.radius.card,
                  }}
                >
                  <Text style={[tokens.typography.label, { color: tokens.text.primary }]}>
                    Cancel
                  </Text>
                </TactileButton>
              </View>
            </View>
          </AppBottomSheet>
        )}

        {/* Finish Early Sheet */}
        {finishEarlyEver && (
          <FinishEarlySheet
            visible={showFinishEarlySheet}
            uncheckedSetsCount={uncheckedSetsCount}
            completedSetsCount={completedSetsCount}
            onFinishAndSave={onFinishAndSave}
            onDiscard={onDiscardWorkout}
            onClose={() => setShowFinishEarlySheet(false)}
          />
        )}

        {/* Workout / Exercise Note Modal */}
        {noteEver && (
          <WorkoutNoteModal
            visible={noteModalConfig.visible}
            title={noteModalConfig.title}
            initialNote={noteModalConfig.initialNote}
            onSave={onSaveNote}
            onClose={() => setNoteModalConfig((prev) => ({ ...prev, visible: false }))}
          />
        )}

        {/* Rest Timer Bottom Sheet */}
        {restPickerEver && (
          <SetRestPickerSheet
            visible={restPickerSetIdx !== null}
            initialRestSecs={isRestDefaultMode ? (exercise?.restTimeSecs || getDefaultRestSecsSync()) : sheetInitialSecs}
            defaultRestSecs={exercise?.restTimeSecs || getDefaultRestSecsSync()}
            isDefaultMode={isRestDefaultMode}
            onSelectRestSecs={onSelectRest}
            onSkip={onTimerSkip}
            onClose={() => {
              setIsRestDefaultMode(false);
              setRestPickerSetIdx(null);
            }}
          />
        )}
      </>
    );
  }
);

const confirmStyles = StyleSheet.create({
  primaryBtn: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});

export default ActiveWorkoutModals;
