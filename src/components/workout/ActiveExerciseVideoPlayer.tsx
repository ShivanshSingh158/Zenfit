import React from 'react';
import { StyleProp } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

interface ActiveExerciseVideoPlayerProps {
  uri: string;
  isPlaying: boolean;
  rate?: number;
  style?: StyleProp<any>;
  onLoad?: () => void;
  onError?: (err: any) => void;
}

/**
 * Lazy-loaded looping MP4 demonstration player.
 * Keeps expo-av Video out of ActiveLoggingScreen and ExerciseAnimationCard Frame-0 evaluation.
 */
export default function ActiveExerciseVideoPlayer({
  uri,
  isPlaying,
  rate = 1.0,
  style,
  onLoad,
  onError,
}: ActiveExerciseVideoPlayerProps) {
  return (
    <Video
      source={{ uri }}
      style={style}
      rate={rate}
      volume={0}
      resizeMode={ResizeMode.CONTAIN}
      isLooping
      isMuted
      shouldPlay={isPlaying}
      useNativeControls={false}
      onLoad={onLoad}
      onError={onError}
    />
  );
}
