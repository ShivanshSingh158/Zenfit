import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { Image as ExpoImage } from 'expo-image';
import { IOS_DARK, FONT_FAMILY } from '../../../theme/tokens';
import { resolveExerciseTargetMuscle } from '../../../utils/gymUtils';
import { resolveExerciseEquipment } from '../../../utils/equipmentResolver';
import {
  resolveExercise,
  getExerciseClipVideoUrl,
  getExerciseGifCdnUrl,
  getExerciseStillPosterUrl,
} from '../../../services/exerciseMediaService';
import { autoResolveExerciseVideoId } from '../../../services/exerciseVideoResolver';
import { hapticLight, hapticSelection } from '../../../utils/haptics';

const YoutubeIframe = React.lazy<React.ComponentType<any>>(() => import('react-native-youtube-iframe'));

export interface ActiveExerciseHeaderProps {
  exercise: any;
  partnerExercise: any | null;
  overloadSuggestion: any | null;
  lastTimeData: string | null;
  showVideo: boolean;
  activeSetIndex?: number;
  isAllComplete?: boolean;
  onRepeatPrevious?: () => void;
  colors: any;
  styles?: any;
  gymLogs?: any[];
  onSwapPress: () => void;
  onSupersetPress: () => void;
  onVideoToggle: () => void;
  onSwitchToPartner: () => void;
  onNoteChange?: (note: string) => void;
  onOpenExerciseMenu?: () => void;
}

export const ActiveExerciseHeader: React.FC<ActiveExerciseHeaderProps> = React.memo(({
  exercise,
  partnerExercise,
  overloadSuggestion,
  lastTimeData,
  showVideo,
  onVideoToggle,
  onSwitchToPartner,
  onOpenExerciseMenu,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const rawMuscle = exercise.muscle;
  const resolved = resolveExerciseTargetMuscle(exercise.name, rawMuscle).targetMuscle;
  const muscleName = resolved || rawMuscle || 'Mixed';
  const equipmentName = useMemo(() => resolveExerciseEquipment(exercise.name), [exercise.name]);

  // Animation Playback & YouTube Form Guide State
  const [isPlaying, setIsPlaying] = useState(true);
  const [showYoutube, setShowYoutube] = useState(false);
  const [resolvedVideoId, setResolvedVideoId] = useState<string | null>(exercise?.videoId || null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const videoRef = useRef<Video>(null);

  // Sync state when exercise changes
  useEffect(() => {
    setShowYoutube(false);
    setIsPlaying(true);
    setResolvedVideoId(exercise?.videoId || null);
  }, [exercise?.name, exercise?.videoId]);

  const handleTogglePlay = useCallback(() => {
    hapticLight();
    setIsPlaying(prev => !prev);
  }, []);

  const handleToggleYoutube = useCallback(async () => {
    hapticLight();
    if (!showYoutube) {
      setShowYoutube(true);
      if (!resolvedVideoId && !exercise?.videoId) {
        setIsLoadingVideo(true);
        try {
          const freshId = await autoResolveExerciseVideoId(exercise.name);
          if (freshId) {
            setResolvedVideoId(freshId);
          }
        } catch (err) {
          console.warn('[ActiveExerciseHeader] Failed to auto-resolve video:', err);
        } finally {
          setIsLoadingVideo(false);
        }
      }
    } else {
      setShowYoutube(false);
    }
  }, [showYoutube, resolvedVideoId, exercise?.videoId, exercise?.name]);

  // High-Quality Looping Video & GIF Animation Sources (OpenGym standard)
  const { clipUrl, gifUrl, stillUrl } = useMemo(() => {
    const def = resolveExercise(exercise.name);
    if (!def) return { clipUrl: '', gifUrl: '', stillUrl: '' };
    return {
      clipUrl: getExerciseClipVideoUrl(def),
      gifUrl: getExerciseGifCdnUrl(def),
      stillUrl: getExerciseStillPosterUrl(def),
    };
  }, [exercise.name]);

  // Dynamic Progression Policy Map (OpenGym / ZenFit standard)
  const POLICY_LABELS: Record<string, string> = {
    linear: 'Linear progression',
    double: 'Double progression',
    triple: 'Triple progression',
    top_backoff: 'Top + Back-off',
    greyskull: 'Greyskull LP',
    off: 'Manual load',
  };

  // Resolve Effective Policy from System, Exercise, or Biomechanical Equipment
  const effectivePolicy = useMemo(() => {
    if (exercise?.progressionPolicy) return exercise.progressionPolicy;
    if (overloadSuggestion?.policy) return overloadSuggestion.policy;
    const isCompound = exercise?.isCompound || /\b(squat|bench|deadlift|press|overhead|row)\b/i.test(exercise?.name || '');
    const isBarbell = /\b(barbell|bb)\b/i.test(exercise?.name || '') || equipmentName === 'Barbell';
    return isCompound && isBarbell ? 'linear' : 'double';
  }, [exercise?.progressionPolicy, overloadSuggestion?.policy, exercise?.name, exercise?.isCompound, equipmentName]);

  const policyLabel = POLICY_LABELS[effectivePolicy] || 'Double progression';

  // Dynamic Biomechanical Progression Guidance from our Progression Engine
  const progressionText = useMemo(() => {
    if (!overloadSuggestion) {
      return `🌱 ${policyLabel} · Analyzing performance history...`;
    }

    const state = overloadSuggestion.state;
    const targetWeight = overloadSuggestion.recommended ?? overloadSuggestion.suggestedWeight ?? 0;
    const repsText = overloadSuggestion.suggestedReps || overloadSuggestion.reps || exercise?.targetReps || '8-12';
    const delta = (overloadSuggestion.isWeightIncrease || overloadSuggestion.type === 'increase') && overloadSuggestion.weightDelta
      ? ` (+${overloadSuggestion.weightDelta} kg)`
      : overloadSuggestion.weightDelta < 0
      ? ` (${overloadSuggestion.weightDelta} kg)`
      : '';

    // 1. If baseline session (no prior logs)
    if (state === 'BASELINE' || !lastTimeData) {
      return `🌱 ${policyLabel} · Nothing logged yet, so this session sets the baseline.`;
    }

    // 2. Weight unlock (hit all target reps in previous session)
    if (state === 'WEIGHT_UNLOCK' || overloadSuggestion.isWeightIncrease) {
      return `🌱 ${policyLabel} · Target met${delta}: Aim for ${targetWeight} kg × ${repsText}`;
    }

    // 3. Rep build (building up towards rep cap at current weight)
    if (state === 'REP_BUILD') {
      return `🌱 ${policyLabel} · Build reps: Aim for ${repsText} at ${targetWeight} kg before adding weight`;
    }

    // 4. Regroove hold (consolidating form / volume)
    if (state === 'REGROOVE_HOLD') {
      return `🌱 ${policyLabel} · Consolidate form: Hold ${targetWeight} kg × ${repsText}`;
    }

    // 5. Reactive deload (accumulated fatigue / consecutive misses)
    if (state === 'REACTIVE_DELOAD' || overloadSuggestion.isDeload) {
      return `🌱 ${policyLabel} · Deload: Back off to ${targetWeight} kg to clear fatigue`;
    }

    // 6. Dynamic engine headline
    if (overloadSuggestion.headline && overloadSuggestion.headline !== 'Baseline Session') {
      return `🌱 ${policyLabel} · ${overloadSuggestion.headline}`;
    }

    // 7. Standard active target
    if (targetWeight > 0) {
      return `🌱 ${policyLabel}: ${targetWeight} kg × ${repsText}${delta}`;
    }

    return `🌱 ${policyLabel} · Target: ${repsText} reps`;
  }, [overloadSuggestion, policyLabel, lastTimeData, exercise?.targetReps]);

  return (
    <View style={headerStyles.cardHeader}>
      {/* ── STATE 1: EXPANDED HERO ANIMATION CARD (OpenGym Image 1 & 3 standard) ── */}
      {showVideo ? (
        <View style={headerStyles.expandedContainer}>
          {/* Pristine Large White Canvas Hero Card */}
          <Pressable
            onPress={!showYoutube ? handleTogglePlay : undefined}
            style={[
              headerStyles.expandedCard,
              { backgroundColor: showYoutube ? '#000000' : '#FFFFFF' },
            ]}
          >
            {showYoutube ? (
              // Embedded YouTube Player
              (resolvedVideoId || exercise?.videoId) ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' }}>
                  <React.Suspense fallback={<ActivityIndicator size="small" color="#FF0000" />}>
                    <YoutubeIframe
                      height={280}
                      width={Math.max(windowWidth - 32, 280)}
                      play={false}
                      videoId={resolvedVideoId || exercise.videoId}
                      initialPlayerParams={{ modestbranding: true, rel: false }}
                    />
                  </React.Suspense>
                </View>
              ) : isLoadingVideo ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#141416' }}>
                  <ActivityIndicator size="small" color="#30D158" />
                  <Text style={{ color: '#8E8E93', fontSize: 13, marginTop: 8, fontFamily: FONT_FAMILY.medium }}>
                    Finding video guide...
                  </Text>
                </View>
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#141416' }}>
                  <Ionicons name="alert-circle-outline" size={28} color="#8E8E93" />
                  <Text style={{ color: '#8E8E93', fontSize: 13, marginTop: 8, fontFamily: FONT_FAMILY.medium }}>
                    Video guide not available
                  </Text>
                </View>
              )
            ) : (
              // Looping Lifter Animation on Crisp White Canvas
              clipUrl ? (
                <Video
                  ref={videoRef}
                  source={{ uri: clipUrl }}
                  style={headerStyles.expandedImg}
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping
                  isMuted
                  shouldPlay={isPlaying}
                  useNativeControls={false}
                />
              ) : gifUrl ? (
                <ExpoImage
                  source={{ uri: gifUrl }}
                  placeholder={{ uri: stillUrl }}
                  style={headerStyles.expandedImg}
                  contentFit="contain"
                  autoplay={isPlaying}
                  cachePolicy="disk"
                  transition={150}
                />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="barbell-outline" size={48} color="#8E8E93" />
                </View>
              )
            )}

            {/* Bottom Overlay Controls Bar */}
            <View style={headerStyles.overlayBar} pointerEvents="box-none">
              {/* Left Group: Minimize + YouTube Beside It */}
              <View style={headerStyles.leftPillGroup}>
                <TouchableOpacity
                  onPress={() => {
                    hapticLight();
                    onVideoToggle();
                  }}
                  style={headerStyles.overlayPill}
                  activeOpacity={0.75}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Ionicons name="contract" size={13} color="#FFFFFF" />
                  <Text style={headerStyles.overlayPillText}>Minimize</Text>
                </TouchableOpacity>

                {/* YouTube Button Beside Minimize */}
                <TouchableOpacity
                  onPress={handleToggleYoutube}
                  style={[
                    headerStyles.overlayPill,
                    showYoutube && { backgroundColor: 'rgba(48, 209, 88, 0.25)' },
                  ]}
                  activeOpacity={0.75}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Ionicons
                    name={showYoutube ? 'barbell-outline' : 'logo-youtube'}
                    size={14}
                    color={showYoutube ? '#30D158' : '#FF0000'}
                  />
                  <Text style={[
                    headerStyles.overlayPillText,
                    showYoutube && { color: '#30D158' },
                  ]}>
                    {showYoutube ? 'Animation' : 'YouTube'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Right: Tap to Pause Pill (Only for animation) */}
              {!showYoutube && (
                <TouchableOpacity
                  onPress={handleTogglePlay}
                  style={headerStyles.overlayPill}
                  activeOpacity={0.75}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={11} color="#FFFFFF" />
                  <Text style={headerStyles.overlayPillText}>
                    {isPlaying ? 'tap to pause' : 'tap to play'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>

          {/* Details Row Directly Below Expanded Card */}
          <View style={headerStyles.titleRow}>
            <Text style={headerStyles.exerciseTitle} numberOfLines={2}>
              {exercise.name}
            </Text>
            <TouchableOpacity
              style={headerStyles.dotsBtn}
              onPress={() => {
                hapticSelection();
                onOpenExerciseMenu?.();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="ellipsis-horizontal" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Muscle & Equipment Tags */}
          <View style={headerStyles.tagsRow}>
            <View style={headerStyles.tagBadge}>
              <Text style={headerStyles.tagText}>{muscleName}</Text>
            </View>
            <View style={headerStyles.tagBadge}>
              <Text style={headerStyles.tagText}>{equipmentName}</Text>
            </View>
          </View>

          {/* Target Plan */}
          <Text style={headerStyles.planText}>
            Plan: {exercise.targetSets || 4} × {exercise.targetReps || '8'}
          </Text>

          {/* Last Time History Row */}
          {lastTimeData ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Text style={headerStyles.planText}>
                Last time: {lastTimeData}
              </Text>
              <Ionicons name="time-outline" size={13} color="#8E8E93" />
            </View>
          ) : null}
        </View>
      ) : (
        /* ── STATE 2: COLLAPSED ROW (Thumbnail on left, Details on right) ── */
        <View style={headerStyles.heroRow}>
          {/* Square Video Animation Box — Seamless 60FPS Looping Lifter */}
          <TouchableOpacity
            style={headerStyles.thumbnailBox}
            onPress={() => {
              hapticLight();
              onVideoToggle();
            }}
            activeOpacity={0.8}
          >
            {clipUrl ? (
              <Video
                source={{ uri: clipUrl }}
                style={headerStyles.thumbImg}
                resizeMode={ResizeMode.COVER}
                isLooping
                isMuted
                shouldPlay
                useNativeControls={false}
              />
            ) : gifUrl ? (
              <ExpoImage
                source={{ uri: gifUrl }}
                placeholder={{ uri: stillUrl }}
                style={headerStyles.thumbImg}
                contentFit="cover"
                autoplay={true}
                cachePolicy="disk"
                transition={150}
              />
            ) : (
              <Ionicons name="barbell-outline" size={26} color="#8E8E93" />
            )}

            {/* Expand Badge */}
            <View style={headerStyles.expandOverlay}>
              <Ionicons name="expand" size={11} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Details Column */}
          <View style={headerStyles.detailsCol}>
            <View style={headerStyles.titleRow}>
              <Text
                style={headerStyles.exerciseTitle}
                numberOfLines={2}
              >
                {exercise.name}
              </Text>
              <TouchableOpacity
                style={headerStyles.dotsBtn}
                onPress={() => {
                  hapticSelection();
                  onOpenExerciseMenu?.();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="ellipsis-horizontal" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Muscle & Equipment Tags */}
            <View style={headerStyles.tagsRow}>
              <View style={headerStyles.tagBadge}>
                <Text style={headerStyles.tagText}>{muscleName}</Text>
              </View>
              <View style={headerStyles.tagBadge}>
                <Text style={headerStyles.tagText}>{equipmentName}</Text>
              </View>
            </View>

            {/* Target Plan */}
            <Text style={headerStyles.planText}>
              Plan: {exercise.targetSets || 4} × {exercise.targetReps || '8'}
            </Text>

            {/* Last Time History Row (OpenGym) */}
            {lastTimeData ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Text style={headerStyles.planText}>
                  Last time: {lastTimeData}
                </Text>
                <Ionicons name="time-outline" size={13} color="#8E8E93" />
              </View>
            ) : null}
          </View>
        </View>
      )}

      {/* ── Progression Baseline / Overload Note ── */}
      <View style={headerStyles.progressionRow}>
        <Text style={headerStyles.progressionText} numberOfLines={2}>
          {progressionText}
        </Text>
      </View>

      {/* ── Superset Partner Switcher (if applicable) ── */}
      {exercise.supersetGroup && partnerExercise && (
        <TouchableOpacity
          onPress={onSwitchToPartner}
          style={headerStyles.supersetBanner}
          activeOpacity={0.7}
        >
          <View style={headerStyles.supersetDot} />
          <Text style={headerStyles.supersetText}>
            SUPER-{exercise.supersetGroup} · Switch to {partnerExercise.name} →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const headerStyles = StyleSheet.create({
  cardHeader: {
    paddingHorizontal: 2,
    paddingTop: 8,
    paddingBottom: 4,
  },
  expandedContainer: {
    width: '100%',
  },
  expandedCard: {
    width: '100%',
    height: 290,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  expandedImg: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  overlayPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  thumbnailBox: {
    width: 66,
    height: 66,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  expandOverlay: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    flex: 1,
    marginRight: 8,
  },
  dotsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  tagBadge: {
    backgroundColor: '#1C1C1E',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  planText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: '#8E8E93',
    marginTop: 2,
  },
  progressionRow: {
    marginTop: 10,
    paddingVertical: 2,
  },
  progressionText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.medium,
    color: '#30D158',
    lineHeight: 17,
  },
  supersetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    width: '100%',
    marginTop: 8,
  },
  supersetDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: IOS_DARK.orange,
  },
  supersetText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: IOS_DARK.orange,
    textAlign: 'center',
  },
});

export default ActiveExerciseHeader;
