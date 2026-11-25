/**
 * ExerciseAnimationCard.tsx — ZenTrack Mobile
 *
 * High-Quality Exercise Form & Looping Animation Card.
 */
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import {
  ChevronDown,
  ChevronUp,
  Dumbbell,
  FileText,
  Gauge,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Video,
} from 'lucide-react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  getExerciseMediaUri,
  resolveExercise,
  getExerciseStillPosterUrl,
  getExerciseThumbnailUrl,
  ExerciseMediaResult,
} from '../../../services/exerciseMediaService';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../../../theme/tokens';
import { NumericText, TactileButton } from '../../ui';

interface ExerciseAnimationCardProps {
  exerciseName: string;
  onOpenYoutube?: () => void;
  showInstructions?: boolean;
  showBadges?: boolean;
  isEmbedded?: boolean;
  animationHeight?: number;
  allowMinimize?: boolean;
  /** Delay before mounting native ExoVideo decoder so sheet/screen transitions stay 120fps. */
  deferVideoMs?: number;
  style?: any;
}

export const ExerciseAnimationCard: React.FC<ExerciseAnimationCardProps> = React.memo(({
  exerciseName,
  onOpenYoutube,
  showInstructions = true,
  showBadges = false,
  isEmbedded = false,
  animationHeight,
  allowMinimize = true,
  deferVideoMs = 260,
  style,
}) => {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const initialResolved = useMemo(() => {
    const def = resolveExercise(exerciseName);
    if (!def) return null;
    return {
      def,
      stillUri: getExerciseStillPosterUrl(def) || null,
      thumbUri: getExerciseThumbnailUrl(def) || null,
    };
  }, [exerciseName]);
  const [media, setMedia] = useState<ExerciseMediaResult | null>(null);
  const [loading, setLoading] = useState(!initialResolved?.stillUri);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoMountReady, setVideoMountReady] = useState(deferVideoMs <= 0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1.0>(1.0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [failedUris, setFailedUris] = useState<Record<string, boolean>>({});
  const [showCues, setShowCues] = useState(false);
  const videoRef = useRef<ExpoVideo>(null);

  useEffect(() => {
    let isMounted = true;
    setMedia(null);
    setLoading(!initialResolved?.stillUri);
    setIsVideoLoaded(false);
    setVideoFailed(false);
    setVideoMountReady(deferVideoMs <= 0);
    setIsPlaying(true);
    setPlaybackSpeed(1.0);
    setFailedUris({});
    setShowCues(false);

    let videoTimer: ReturnType<typeof setTimeout> | null = null;
    if (deferVideoMs > 0) {
      videoTimer = setTimeout(() => {
        if (isMounted) setVideoMountReady(true);
      }, deferVideoMs);
    }

    getExerciseMediaUri(exerciseName).then(result => {
      if (isMounted) {
        setMedia(result);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      if (videoTimer) clearTimeout(videoTimer);
    };
  }, [exerciseName, deferVideoMs, initialResolved]);

  const def = media?.definition ?? initialResolved?.def ?? null;
  const isVideoAvailable = !!(media?.clipUri && !videoFailed);
  const rawStill = media?.stillUri || initialResolved?.stillUri || null;
  const stillUri = rawStill && !failedUris[rawStill] ? rawStill : null;
  const rawImage = media?.imageUri || initialResolved?.thumbUri || null;
  const activeFallbackUri = (media?.gifUri && !failedUris[media.gifUri])
    ? media.gifUri
    : (rawImage && !failedUris[rawImage])
    ? rawImage
    : null;

  const resolvedHeight = animationHeight
    ? (isMinimized ? Math.max(animationHeight * 0.55, 120) : animationHeight)
    : (isMinimized ? 130 : 250);

  const handleTogglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const handleToggleMinimize = (e?: any) => {
    e?.stopPropagation?.();
    setIsMinimized(prev => !prev);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isEmbedded ? 'transparent' : tokens.bg.surface,
          borderColor: isEmbedded ? 'transparent' : tokens.border.subtle,
          borderWidth: isEmbedded ? 0 : tokens.border.hairlineWidth,
          marginBottom: isEmbedded ? 0 : SPACE.lg,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.animationContainer,
          { height: resolvedHeight },
        ]}
      >
        {stillUri && (
          <Image
            source={{ uri: stillUri }}
            style={[styles.gifImage, StyleSheet.absoluteFill]}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            onError={() => {
              setFailedUris(prev => ({ ...prev, [stillUri]: true }));
            }}
          />
        )}

        {isVideoAvailable && videoMountReady ? (
          <ExpoVideo
            ref={videoRef}
            source={{ uri: media.clipUri! }}
            rate={playbackSpeed}
            volume={0}
            isMuted={true}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={isPlaying && !isMinimized}
            isLooping={true}
            style={[styles.gifImage, { opacity: isVideoLoaded ? 1 : 0 }]}
            onLoad={() => setIsVideoLoaded(true)}
            onError={(err) => {
              console.warn('[ExerciseAnimationCard] Video playback fallback triggered:', err);
              setVideoFailed(true);
            }}
          />
        ) : activeFallbackUri ? (
          <Image
            source={{ uri: activeFallbackUri }}
            placeholder={stillUri ? { uri: stillUri } : undefined}
            style={styles.gifImage}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={200}
            onError={() => {
              setFailedUris(prev => ({ ...prev, [activeFallbackUri]: true }));
            }}
          />
        ) : !stillUri && !loading ? (
          <View style={styles.placeholderCenter}>
            <Dumbbell size={ICON.xl + 4} strokeWidth={ICON.strokeWidth} color={tokens.text.muted} />
            <Text style={styles.placeholderText}>
              Form demo for {exerciseName}
            </Text>
          </View>
        ) : null}

        {!isPlaying && (isVideoAvailable || activeFallbackUri) && (
          <TactileButton
            variant="custom"
            style={styles.centerPlayBtn}
            onPress={() => setIsPlaying(true)}
            accessibilityLabel="Play animation"
          >
            <Play size={ICON.lg + 4} strokeWidth={ICON.strokeWidth} color={tokens.text.primary} style={{ marginLeft: 3 }} />
          </TactileButton>
        )}

        {loading && !stillUri && (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="small" color={tokens.accent.primary} />
            <Text style={styles.loadingText}>Loading Animation...</Text>
          </View>
        )}

        <View style={styles.topOverlayRow} pointerEvents="box-none">
          <View style={styles.badgeRow}>
            {showBadges && def?.target ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {def.target.toUpperCase()}
                </Text>
              </View>
            ) : null}
            {showBadges && def?.equipment ? (
              <View style={styles.badge}>
                <Text style={styles.badgeSubText}>
                  {def.equipment}
                </Text>
              </View>
            ) : null}
          </View>

          {allowMinimize && (
            <TactileButton
              variant="custom"
              onPress={handleToggleMinimize}
              style={styles.floatingPill}
              hitSlop={TOUCH.hitSlop}
            >
              {isMinimized ? (
                <Maximize2 size={ICON.xs - 2} strokeWidth={ICON.strokeWidth} color={tokens.text.primary} />
              ) : (
                <Minimize2 size={ICON.xs - 2} strokeWidth={ICON.strokeWidth} color={tokens.text.primary} />
              )}
              <Text style={styles.floatingPillText}>
                {isMinimized ? 'Expand' : 'Minimize'}
              </Text>
            </TactileButton>
          )}
        </View>

        <View style={styles.bottomOverlayRow} pointerEvents="box-none">
          {onOpenYoutube ? (
            <TactileButton
              variant="custom"
              onPress={onOpenYoutube}
              style={styles.floatingPill}
              hitSlop={TOUCH.hitSlop}
            >
              <Video size={ICON.xs} strokeWidth={ICON.strokeWidth} color={tokens.accent.crimson} />
              <Text style={styles.floatingPillText}>Video</Text>
            </TactileButton>
          ) : <View />}

          {!isMinimized && (
            <View style={styles.controlsGroup}>
              {isVideoAvailable && (
                <TactileButton
                  variant="custom"
                  onPress={() => setPlaybackSpeed(s => (s === 1.0 ? 0.5 : 1.0))}
                  style={[styles.floatingPill, playbackSpeed === 0.5 && styles.activeSpeedPill]}
                  hitSlop={TOUCH.hitSlop}
                >
                  <Gauge
                    size={ICON.xs - 2}
                    strokeWidth={ICON.strokeWidth}
                    color={playbackSpeed === 0.5 ? tokens.status.success : tokens.text.primary}
                  />
                  <NumericText
                    style={[
                      styles.floatingPillText,
                      playbackSpeed === 0.5 && { color: tokens.status.success },
                    ]}
                  >
                    {playbackSpeed === 0.5 ? '0.5x' : '1.0x'}
                  </NumericText>
                </TactileButton>
              )}

              {(isVideoAvailable || activeFallbackUri) && (
                <TactileButton
                  variant="custom"
                  onPress={handleTogglePlay}
                  style={styles.floatingPill}
                  hitSlop={TOUCH.hitSlop}
                >
                  {isPlaying ? (
                    <Pause size={ICON.xs - 2} strokeWidth={ICON.strokeWidth} color={tokens.text.primary} />
                  ) : (
                    <Play size={ICON.xs - 2} strokeWidth={ICON.strokeWidth} color={tokens.text.primary} />
                  )}
                  <Text style={styles.floatingPillText}>{isPlaying ? 'Pause' : 'Play'}</Text>
                </TactileButton>
              )}
            </View>
          )}
        </View>
      </View>

      {showInstructions && def && (def.instruction || (def.steps && def.steps.length > 0)) ? (
        <View
          style={[
            styles.instructionsSection,
            isEmbedded && { paddingHorizontal: 0, paddingBottom: 0, borderTopWidth: 0 },
          ]}
        >
          <TactileButton
            variant="custom"
            haptic="selection"
            style={styles.cuesToggleBtn}
            onPress={() => setShowCues(prev => !prev)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.xs + 2 }}>
              <FileText size={ICON.xs} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
              <Text style={styles.instructionHeaderTitle}>
                Execution Cues {def.steps && def.steps.length > 0 ? `(${def.steps.length} Steps)` : ''}
              </Text>
            </View>
            {showCues ? (
              <ChevronUp size={ICON.xs + 1} strokeWidth={ICON.strokeWidth} color={tokens.text.muted} />
            ) : (
              <ChevronDown size={ICON.xs + 1} strokeWidth={ICON.strokeWidth} color={tokens.text.muted} />
            )}
          </TactileButton>

          {showCues && (
            <View style={styles.cuesContent}>
              {def.steps && def.steps.length > 0 ? (
                <View style={styles.stepsList}>
                  {def.steps.map((step, index) => (
                    <View key={index} style={styles.stepRow}>
                      <NumericText style={styles.stepNumber}>{index + 1}.</NumericText>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.instructionParagraph}>{def.instruction}</Text>
              )}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
});

export default ExerciseAnimationCard;

const makeStyles = (tokens: ThemeTokens) => StyleSheet.create({
  container: {
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    padding: 0,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs + 2,
  },
  badge: {
    backgroundColor: tokens.bg.overlay,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm - 2,
  },
  badgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.xs,
    color: tokens.text.primary,
    letterSpacing: 0.4,
  },
  badgeSubText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.xs,
    color: tokens.text.secondary,
    letterSpacing: 0.4,
  },
  animationContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: tokens.bg.mediaLight,
    borderRadius: RADIUS.card,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  gifImage: {
    width: '100%',
    height: '100%',
    backgroundColor: tokens.bg.mediaLight,
  },
  centerPlayBtn: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: tokens.bg.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
    borderWidth: 1.5,
    borderColor: tokens.border.medium,
  },
  topOverlayRow: {
    position: 'absolute',
    top: SPACE.sm + 2,
    left: SPACE.sm + 2,
    right: SPACE.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  bottomOverlayRow: {
    position: 'absolute',
    bottom: SPACE.sm + 2,
    left: SPACE.sm + 2,
    right: SPACE.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  controlsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs + 2,
  },
  floatingPill: {
    backgroundColor: tokens.bg.overlay,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs + 1,
    paddingHorizontal: SPACE.sm + 2,
    paddingVertical: SPACE.xs + 1,
    borderRadius: RADIUS.full,
  },
  activeSpeedPill: {
    borderColor: tokens.status.success,
    borderWidth: tokens.border.hairlineWidth,
    backgroundColor: tokens.bg.overlay,
  },
  floatingPillText: {
    color: tokens.text.primary,
    fontFamily: FONT_FAMILY.medium,
    fontSize: tokens.fontSize.xs,
    letterSpacing: 0.2,
  },
  loaderCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
  },
  loadingText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: tokens.fontSize.sm,
    color: tokens.text.muted,
  },
  placeholderCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs + 2,
  },
  placeholderText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: tokens.fontSize.sm,
    color: tokens.text.muted,
  },
  instructionsSection: {
    paddingTop: SPACE.xs + 2,
  },
  cuesToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.sm + 2,
    paddingVertical: SPACE.sm,
    minHeight: TOUCH.minTarget - 6,
    borderRadius: RADIUS.inner,
    backgroundColor: tokens.bg.surface,
    borderWidth: tokens.border.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  instructionHeaderTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: tokens.fontSize.xs,
    color: tokens.text.primary,
    letterSpacing: 0.2,
  },
  cuesContent: {
    paddingHorizontal: SPACE.xs,
    paddingTop: SPACE.sm,
    paddingBottom: SPACE.xs,
  },
  instructionParagraph: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: tokens.fontSize.sm,
    color: tokens.text.secondary,
    lineHeight: 18,
  },
  stepsList: {
    gap: SPACE.xs + 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.xs + 2,
  },
  stepNumber: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: tokens.fontSize.sm,
    color: tokens.accent.primary,
    lineHeight: 17,
    width: 18,
  },
  stepText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: tokens.fontSize.sm,
    color: tokens.text.secondary,
    lineHeight: 17,
    flex: 1,
  },
});
