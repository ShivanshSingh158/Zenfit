import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Video, ResizeMode } from 'expo-av';
import { Image as ExpoImage } from 'expo-image';
import {
  AlertCircle,
  Dumbbell,
  Minimize2,
  Maximize2,
  Play,
  Pause,
  PlayCircle,
  MoreHorizontal,
  ArrowRight,
  RotateCcw,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { FONT_FAMILY } from '../../theme/tokens';
import { useResponsiveMetrics } from '../../theme/responsive';
import { springs } from '../../theme/motion';
import { resolveExerciseTargetMuscle } from '../../utils/gymUtils';
import { resolveExerciseEquipment } from '../../utils/equipmentResolver';
import {
  resolveExercise,
  getExerciseClipVideoUrl,
  getExerciseGifCdnUrl,
  getExerciseStillPosterUrl,
} from '../../services/exerciseMediaService';
import { autoResolveExerciseVideoId } from '../../services/exerciseVideoResolver';
import { hapticLight } from '../../utils/haptics';
import { TactileButton } from '../ui/TactileButton';
import { AppIcon } from '../ui/AppIcon';
import { NumericText } from '../ui/NumericText';
import { useWeightUnit, kgToDisplay, unitLabel } from '../../utils/weightUnit';

const YoutubeIframe = React.lazy<React.ComponentType<any>>(
  () => import('react-native-youtube-iframe')
);

export interface ActiveExerciseHeaderProps {
  exercise: any;
  partnerExercise: any | null;
  overloadSuggestion: any | null;
  lastTimeData: string | null;
  showVideo: boolean;
  activeSetIndex?: number;
  isAllComplete?: boolean;
  onRepeatPrevious?: () => void;
  colors?: any;
  styles?: any;
  gymLogs?: any[];
  onSwapPress: () => void;
  onSupersetPress: () => void;
  onVideoToggle: () => void;
  onSwitchToPartner: () => void;
  onNoteChange?: (note: string) => void;
  onOpenExerciseMenu?: () => void;
}

export const ActiveExerciseHeader: React.FC<ActiveExerciseHeaderProps> = React.memo(
  ({
    exercise,
    partnerExercise,
    overloadSuggestion,
    lastTimeData,
    showVideo,
    isAllComplete,
    onRepeatPrevious,
    onVideoToggle,
    onSwitchToPartner,
    onOpenExerciseMenu,
  }) => {
    const { tokens } = useTheme();
    const { isCompactH, clampChartWidth } = useResponsiveMetrics();
    const unitIsLbs = useWeightUnit();
    const uLabel = unitLabel(unitIsLbs);
    const expandedWTarget = clampChartWidth(40);
    const expandedH = isCompactH ? 196 : 240;

    const rawMuscle = exercise.muscle;
    const resolved = resolveExerciseTargetMuscle(exercise.name, rawMuscle).targetMuscle;
    const muscleName = resolved || rawMuscle || 'Mixed';
    const equipmentName = useMemo(
      () => resolveExerciseEquipment(exercise.name),
      [exercise.name]
    );

    const [isPlaying, setIsPlaying] = useState(true);
    const [showYoutube, setShowYoutube] = useState(false);
    const [resolvedVideoId, setResolvedVideoId] = useState<string | null>(
      exercise?.videoId || null
    );
    const [isLoadingVideo, setIsLoadingVideo] = useState(false);
    const [containerWidth, setContainerWidth] = useState(expandedWTarget);
    const videoRef = useRef<Video>(null);

    const mediaRevealScale = useSharedValue(1);
    useEffect(() => {
      mediaRevealScale.value = 0.96;
      mediaRevealScale.value = withSpring(1, springs.snappy);
    }, [showVideo, mediaRevealScale]);

    const mediaMorphStyle = useAnimatedStyle(() => ({
      transform: [{ scale: mediaRevealScale.value }],
    }));

    const expandBadgeAlpha = useSharedValue(showVideo ? 0 : 1);
    useEffect(() => {
      expandBadgeAlpha.value = withTiming(showVideo ? 0 : 1, { duration: 150 });
    }, [showVideo, expandBadgeAlpha]);

    const expandBadgeAnimStyle = useAnimatedStyle(() => ({
      opacity: expandBadgeAlpha.value,
    }));

    const overlayBarAnimStyle = useAnimatedStyle(() => ({
      opacity: showVideo ? 1 : 0,
    }));

    useEffect(() => {
      setShowYoutube(false);
      setIsPlaying(true);
      setResolvedVideoId(exercise?.videoId || null);
    }, [exercise?.name, exercise?.videoId]);

    const handleTogglePlay = useCallback(() => {
      hapticLight();
      setIsPlaying((prev) => !prev);
    }, []);

    const handleToggleYoutube = useCallback(async () => {
      hapticLight();
      if (!showYoutube) {
        setShowYoutube(true);
        if (!resolvedVideoId && !exercise?.videoId) {
          setIsLoadingVideo(true);
          try {
            const freshId = await autoResolveExerciseVideoId(exercise.name);
            if (freshId) setResolvedVideoId(freshId);
          } catch (err) {
            console.warn('[ActiveExerciseHeader] Video auto-resolve failed:', err);
          } finally {
            setIsLoadingVideo(false);
          }
        }
      } else {
        setShowYoutube(false);
      }
    }, [showYoutube, resolvedVideoId, exercise?.videoId, exercise?.name]);

    const { clipUrl, gifUrl, stillUrl } = useMemo(() => {
      const def = resolveExercise(exercise.exerciseId || exercise.id) || resolveExercise(exercise.name);
      if (!def) return { clipUrl: '', gifUrl: '', stillUrl: '' };
      return {
        clipUrl: getExerciseClipVideoUrl(def),
        gifUrl: getExerciseGifCdnUrl(def),
        stillUrl: getExerciseStillPosterUrl(def),
      };
    }, [exercise.exerciseId, exercise.id, exercise.name]);

    const smartCueText = useMemo(() => {
      if (!lastTimeData && (!overloadSuggestion || overloadSuggestion.state === 'BASELINE')) {
        const policy = exercise?.progressionPolicy;
        if (policy === 'linear') return 'Baseline · Linear load progression';
        if (policy === 'double') return 'Baseline · Double progression';
        if (policy === 'triple') return 'Baseline · Triple progression';
        if (policy === 'top_backoff') return 'Baseline · Top + backoff sets';
        return 'First session · Establish working weight';
      }
      if (overloadSuggestion) {
        const state = overloadSuggestion.state;
        const rawTargetWeight =
          overloadSuggestion.recommended ?? overloadSuggestion.suggestedWeight ?? 0;
        const shownTargetWeight = kgToDisplay(rawTargetWeight, unitIsLbs);
        const repsText =
          overloadSuggestion.suggestedReps ||
          overloadSuggestion.reps ||
          exercise?.targetReps ||
          '8–12';
        const deltaShown =
          overloadSuggestion.weightDelta
            ? kgToDisplay(Math.abs(overloadSuggestion.weightDelta), unitIsLbs)
            : 0;
        const delta =
          (overloadSuggestion.isWeightIncrease || overloadSuggestion.type === 'increase') &&
          deltaShown > 0
            ? ` (+${deltaShown} ${uLabel})`
            : overloadSuggestion.weightDelta < 0 && deltaShown > 0
            ? ` (-${deltaShown} ${uLabel})`
            : '';

        if (state === 'WEIGHT_UNLOCK' || overloadSuggestion.isWeightIncrease) {
          return `Target met${delta}: ${shownTargetWeight} ${uLabel} × ${repsText}`;
        }
        if (state === 'REP_BUILD' && rawTargetWeight > 0) {
          return `Aim for ${shownTargetWeight} ${uLabel} × ${repsText}`;
        }
        if (state === 'REGROOVE_HOLD' && rawTargetWeight > 0) {
          return `Match form: ${shownTargetWeight} ${uLabel} × ${repsText}`;
        }
        if (state === 'REACTIVE_DELOAD' || overloadSuggestion.isDeload) {
          return `Recovery load: ${shownTargetWeight} ${uLabel}`;
        }
        if (rawTargetWeight > 0) {
          return `Target: ${shownTargetWeight} ${uLabel} × ${repsText}${delta}`;
        }
      }
      return lastTimeData
        ? (lastTimeData.startsWith('Last:') ? lastTimeData : `Last: ${lastTimeData}`)
        : null;
    }, [overloadSuggestion, lastTimeData, exercise?.targetReps, exercise?.progressionPolicy, unitIsLbs, uLabel]);

    const renderTitleAndMeta = () => (
      <>
        <View style={headerStyles.titleRow}>
          <Text
            style={[
              tokens.typography.h2,
              headerStyles.exerciseTitle,
              { color: tokens.text.primary },
            ]}
            numberOfLines={2}
          >
            {exercise.name}
          </Text>
          <TactileButton
            variant="icon"
            size="sm"
            haptic="selection"
            onPress={() => onOpenExerciseMenu?.()}
            accessibilityLabel="Exercise options"
          >
            <AppIcon icon={MoreHorizontal} size={16} color={tokens.text.primary} />
          </TactileButton>
        </View>

        <NumericText
          style={[headerStyles.conciseMeta, { color: tokens.text.secondary }]}
          numberOfLines={1}
        >
          {muscleName} · {equipmentName} · {exercise.targetSets || 3} × {exercise.targetReps || '8–12'}
        </NumericText>
      </>
    );

    const mediaW = showVideo ? Math.max(containerWidth, expandedWTarget) : 56;
    const mediaH = showVideo ? expandedH : 56;

    return (
      <View
        style={headerStyles.cardHeader}
        onLayout={(e) => {
          const w = Math.round(e.nativeEvent.layout.width - 8);
          if (w > 160 && Math.abs(w - containerWidth) > 2) {
            setContainerWidth(w);
          }
        }}
      >
        <Animated.View
          style={showVideo ? headerStyles.expandedContainer : headerStyles.heroRow}
        >
          {/* GPU transform media stage — discrete container sizing prevents per-frame Yoga reflow */}
          <Animated.View
            style={[
              headerStyles.mediaShell,
              mediaMorphStyle,
              {
                width: mediaW,
                height: mediaH,
                borderRadius: showVideo ? tokens.radius.card : 12,
                backgroundColor:
                  showVideo && showYoutube ? tokens.bg.canvas : tokens.bg.mediaLight,
                borderColor: tokens.border.subtle,
              },
            ]}
          >
            <Pressable
              onPress={
                !showVideo
                  ? onVideoToggle
                  : !showYoutube
                  ? handleTogglePlay
                  : undefined
              }
              style={headerStyles.mediaPressable}
              accessibilityLabel={
                showVideo
                  ? 'Toggle demonstration playback'
                  : 'Expand exercise demonstration'
              }
            >
              {showVideo && showYoutube ? (
                resolvedVideoId || exercise?.videoId ? (
                  <View
                    style={[
                      headerStyles.mediaFill,
                      { backgroundColor: tokens.bg.canvas },
                    ]}
                  >
                    <React.Suspense
                      fallback={
                        <ActivityIndicator size="small" color={tokens.accent.crimson} />
                      }
                    >
                      <YoutubeIframe
                        height={expandedH}
                        width={mediaW}
                        play={false}
                        videoId={resolvedVideoId || exercise.videoId}
                        initialPlayerParams={{ modestbranding: true, rel: false }}
                      />
                    </React.Suspense>
                  </View>
                ) : isLoadingVideo ? (
                  <View
                    style={[
                      headerStyles.mediaFill,
                      { backgroundColor: tokens.bg.surface },
                    ]}
                  >
                    <ActivityIndicator size="small" color={tokens.accent.primary} />
                    <Text
                      style={[
                        tokens.typography.caption,
                        { color: tokens.text.secondary, marginTop: tokens.space.sm },
                      ]}
                    >
                      Finding video guide...
                    </Text>
                  </View>
                ) : (
                  <View
                    style={[
                      headerStyles.mediaFill,
                      { backgroundColor: tokens.bg.surface },
                    ]}
                  >
                    <AppIcon icon={AlertCircle} size={28} color={tokens.text.secondary} />
                    <Text
                      style={[
                        tokens.typography.caption,
                        { color: tokens.text.secondary, marginTop: tokens.space.sm },
                      ]}
                    >
                      Video guide not available
                    </Text>
                  </View>
                )
              ) : clipUrl && showVideo ? (
                <Video
                  ref={videoRef}
                  source={{ uri: clipUrl }}
                  style={[
                    headerStyles.mediaFull,
                    { backgroundColor: tokens.bg.mediaLight },
                  ]}
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping
                  isMuted
                  shouldPlay={isPlaying}
                  useNativeControls={false}
                />
              ) : (gifUrl || stillUrl) ? (
                <ExpoImage
                  source={{ uri: showVideo ? (gifUrl || stillUrl) : (stillUrl || gifUrl) }}
                  placeholder={stillUrl ? { uri: stillUrl } : undefined}
                  style={[
                    headerStyles.mediaFull,
                    { backgroundColor: tokens.bg.mediaLight },
                  ]}
                  contentFit={showVideo ? 'contain' : 'cover'}
                  autoplay={showVideo && isPlaying}
                  cachePolicy="memory-disk"
                  transition={0}
                />
              ) : (
                <View style={headerStyles.mediaFill}>
                  <AppIcon
                    icon={Dumbbell}
                    size={showVideo ? 44 : 26}
                    color={tokens.text.muted}
                  />
                </View>
              )}

              {/* Collapsed corner expand affordance */}
              <Animated.View
                pointerEvents="none"
                style={[
                  headerStyles.expandOverlay,
                  expandBadgeAnimStyle,
                  { backgroundColor: tokens.bg.overlay },
                ]}
              >
                <AppIcon icon={Maximize2} size={11} color={tokens.text.primary} />
              </Animated.View>

              {/* Expanded overlay bar */}
              <Animated.View
                pointerEvents={showVideo ? 'box-none' : 'none'}
                style={[headerStyles.overlayBar, overlayBarAnimStyle]}
              >
                <View style={headerStyles.leftPillGroup}>
                  <TactileButton
                    variant="custom"
                    onPress={onVideoToggle}
                    style={[
                      headerStyles.overlayPill,
                      {
                        backgroundColor: tokens.bg.overlay,
                        borderRadius: tokens.radius.full,
                      },
                    ]}
                  >
                    <AppIcon icon={Minimize2} size={13} color={tokens.text.primary} />
                    <Text
                      style={[
                        tokens.typography.caption,
                        { fontFamily: tokens.font.bold, color: tokens.text.primary },
                      ]}
                    >
                      Minimize
                    </Text>
                  </TactileButton>

                  <TactileButton
                    variant="custom"
                    onPress={handleToggleYoutube}
                    style={[
                      headerStyles.overlayPill,
                      {
                        backgroundColor: showYoutube
                          ? tokens.accent.primaryDim
                          : tokens.bg.overlay,
                        borderRadius: tokens.radius.full,
                      },
                    ]}
                  >
                    <AppIcon
                      icon={showYoutube ? Dumbbell : PlayCircle}
                      size={13}
                      color={showYoutube ? tokens.accent.primary : tokens.accent.crimson}
                    />
                    <Text
                      style={[
                        tokens.typography.caption,
                        {
                          fontFamily: tokens.font.bold,
                          color: showYoutube ? tokens.accent.primary : tokens.text.primary,
                        },
                      ]}
                    >
                      {showYoutube ? 'Animation' : 'YouTube'}
                    </Text>
                  </TactileButton>
                </View>

                {!showYoutube && (
                  <TactileButton
                    variant="custom"
                    onPress={handleTogglePlay}
                    style={[
                      headerStyles.overlayPill,
                      {
                        backgroundColor: tokens.bg.overlay,
                        borderRadius: tokens.radius.full,
                      },
                    ]}
                  >
                    <AppIcon
                      icon={isPlaying ? Pause : Play}
                      size={12}
                      color={tokens.text.primary}
                    />
                    <Text
                      style={[
                        tokens.typography.caption,
                        { fontFamily: tokens.font.bold, color: tokens.text.primary },
                      ]}
                    >
                      {isPlaying ? 'Pause' : 'Play'}
                    </Text>
                  </TactileButton>
                )}
              </Animated.View>
            </Pressable>
          </Animated.View>

          <Animated.View
            style={showVideo ? headerStyles.detailsExpanded : headerStyles.detailsCol}
          >
            {renderTitleAndMeta()}
          </Animated.View>
        </Animated.View>

        {/* Concise History / Progression Cue + 1-tap Fill Last */}
        {(smartCueText || (lastTimeData && onRepeatPrevious && !isAllComplete)) ? (
          <View style={headerStyles.progressionRow}>
            {smartCueText ? (
              <NumericText
                style={[
                  tokens.typography.caption,
                  {
                    color: tokens.text.secondary,
                    flex: 1,
                    lineHeight: 16,
                  },
                ]}
                numberOfLines={1}
              >
                {smartCueText}
              </NumericText>
            ) : <View style={{ flex: 1 }} />}
            {lastTimeData && onRepeatPrevious && !isAllComplete && (
              <TactileButton
                variant="custom"
                haptic="selection"
                onPress={onRepeatPrevious}
                style={[
                  headerStyles.fillLastChip,
                  { backgroundColor: tokens.accent.primaryDim },
                ]}
              >
                <AppIcon icon={RotateCcw} size={11} color={tokens.accent.primary} />
                <Text style={[headerStyles.fillLastText, { color: tokens.accent.primary }]}>
                  Fill Last
                </Text>
              </TactileButton>
            )}
          </View>
        ) : null}

        {/* Superset Switcher */}
        {exercise.supersetGroup && partnerExercise && (
          <TactileButton
            variant="custom"
            haptic="selection"
            onPress={onSwitchToPartner}
            style={[
              headerStyles.supersetBanner,
              {
                backgroundColor: tokens.status.warningDim,
                borderRadius: tokens.radius.inner,
              },
            ]}
          >
            <View
              style={[
                headerStyles.supersetDot,
                { backgroundColor: tokens.status.warning },
              ]}
            />
            <Text
              style={[
                tokens.typography.caption,
                { fontFamily: tokens.font.bold, color: tokens.status.warning },
              ]}
              numberOfLines={1}
            >
              SUPER-{exercise.supersetGroup} · Switch to {partnerExercise.name}
            </Text>
            <AppIcon icon={ArrowRight} size={14} color={tokens.status.warning} />
          </TactileButton>
        )}
      </View>
    );
  }
);

const headerStyles = StyleSheet.create({
  cardHeader: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 4,
  },
  expandedContainer: {
    width: '100%',
    gap: 12,
  },
  mediaShell: {
    overflow: 'hidden',
    position: 'relative',
    borderWidth: StyleSheet.hairlineWidth,
  },
  mediaPressable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaFull: {
    width: '100%',
    height: '100%',
  },
  mediaFill: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayBar: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftPillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overlayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    minHeight: 36,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailsExpanded: {
    width: '100%',
    justifyContent: 'center',
    gap: 4,
  },
  expandOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  exerciseTitle: {
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  conciseMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  tagBadge: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaNum: {
    fontSize: 12,
  },
  progressionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 2,
  },
  fillLastChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  fillLastText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.semibold,
  },
  supersetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: '100%',
    marginTop: 8,
  },
  supersetDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default ActiveExerciseHeader;
