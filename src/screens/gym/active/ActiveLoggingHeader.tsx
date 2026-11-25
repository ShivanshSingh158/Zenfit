import React from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { ChevronDown, MoreHorizontal } from 'lucide-react-native';

import { useTheme } from '../../../contexts/ThemeContext';
import { TactileButton, NumericText, RollingNumber, AppIcon } from '../../../components/ui';
import { WorkoutTimer } from '../../../components/workout';
import { KG_TO_LBS } from '../../../utils/weightUnit';

export interface ActiveLoggingHeaderProps {
  routineTitle: string;
  workoutStartTime?: any;
  totalCompletedSets: number;
  totalSessionSets: number;
  liveTotalVolume: number;
  unitIsLbs: boolean;
  panGesture: any;
  sessionProgressStyle: any;
  onTrackLayout: (e: LayoutChangeEvent) => void;
  onBack: () => void;
  onOpenMenu: () => void;
  onPromptFinish: () => void;
  styles: any;
}

export const ActiveLoggingHeader: React.FC<ActiveLoggingHeaderProps> = React.memo(
  function ActiveLoggingHeader({
    routineTitle,
    workoutStartTime,
    totalCompletedSets,
    totalSessionSets,
    liveTotalVolume,
    unitIsLbs,
    panGesture,
    sessionProgressStyle,
    onTrackLayout,
    onBack,
    onOpenMenu,
    onPromptFinish,
    styles,
  }) {
    const { tokens, isDark } = useTheme();
    const displayVolume = unitIsLbs
      ? Math.round(liveTotalVolume * KG_TO_LBS)
      : Math.round(liveTotalVolume);
    const unitText = unitIsLbs ? 'lbs' : 'kg';

    return (
      <>
        <GestureDetector gesture={panGesture}>
          <View>
            {/* Subtle interactive sheet drag indicator */}
            <View style={localStyles.grabberWrap}>
              <View
                style={[
                  localStyles.grabberPill,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.16)'
                      : 'rgba(9, 9, 11, 0.14)',
                  },
                ]}
              />
            </View>

            <View style={[styles.header, { paddingTop: 2 }]}>
              <TactileButton
                variant="icon"
                size="sm"
                onPress={onBack}
                hitSlop={tokens.touch.hitSlop}
                style={{ backgroundColor: 'transparent', borderWidth: 0 }}
                accessibilityLabel="Minimize workout"
              >
                <AppIcon icon={ChevronDown} size={22} color={tokens.text.primary} />
              </TactileButton>

              <View style={{ alignItems: 'center', flex: 1, paddingHorizontal: tokens.space.sm }}>
                <Text
                  style={[tokens.typography.title, { color: tokens.text.primary }]}
                  numberOfLines={1}
                >
                  {routineTitle}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  {workoutStartTime ? (
                    <>
                      <View
                        style={{
                          width: 5.5,
                          height: 5.5,
                          borderRadius: 2.75,
                          backgroundColor: tokens.status.success,
                        }}
                      />
                      <WorkoutTimer
                        startTime={workoutStartTime}
                        style={{ color: tokens.status.success, fontSize: 12.5 }}
                      />
                    </>
                  ) : null}
                  <NumericText
                    style={{
                      fontSize: 12.5,
                      fontFamily: tokens.font.medium,
                      color: tokens.text.secondary,
                    }}
                  >
                    {workoutStartTime ? '· ' : ''}
                    {totalCompletedSets}/{totalSessionSets} sets
                  </NumericText>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm }}>
                <TactileButton
                  variant="icon"
                  size="sm"
                  haptic="selection"
                  onPress={onOpenMenu}
                  accessibilityLabel="Workout menu"
                >
                  <AppIcon icon={MoreHorizontal} size={16} color={tokens.text.primary} />
                </TactileButton>

                <TactileButton
                  variant="primary"
                  size="sm"
                  haptic="medium"
                  onPress={onPromptFinish}
                  style={{
                    minHeight: 32,
                    paddingHorizontal: 14,
                  }}
                >
                  <Text
                    maxFontSizeMultiplier={1.2}
                    style={[
                      tokens.typography.label,
                      { fontFamily: tokens.font.bold, color: tokens.accent.onPrimary },
                    ]}
                  >
                    Finish
                  </Text>
                </TactileButton>
              </View>
            </View>
          </View>
        </GestureDetector>

        {/* GPU-Composited Session Progress & Tabular Volume Bar */}
        <View
          style={{
            paddingHorizontal: tokens.space.lg,
            paddingTop: 6,
            paddingBottom: tokens.space.xs,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View
              onLayout={onTrackLayout}
              style={[
                styles.progressBarTrack,
                { flex: 1, borderRadius: tokens.radius.full, marginRight: tokens.space.md },
              ]}
            >
              <Animated.View
                style={[
                  styles.progressBarFill,
                  { borderRadius: tokens.radius.full },
                  sessionProgressStyle,
                ]}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: tokens.font.medium,
                  color: tokens.text.muted,
                }}
              >
                Vol
              </Text>
              <RollingNumber
                value={displayVolume}
                suffix={` ${unitText}`}
                cycles={0}
                durationMs={260}
                staggerMs={20}
                style={{ fontSize: 12.5, fontFamily: tokens.font.semibold, color: tokens.text.secondary }}
              />
            </View>
          </View>
        </View>
      </>
    );
  }
);

const localStyles = StyleSheet.create({
  grabberWrap: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 2,
  },
  grabberPill: {
    width: 34,
    height: 4,
    borderRadius: 2,
  },
});

export default ActiveLoggingHeader;
