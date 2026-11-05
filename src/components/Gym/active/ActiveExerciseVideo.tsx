import React, { useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, useWindowDimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILY, IOS_DARK } from '../../../theme/tokens';
import ExerciseAnimationCard from '../exercise/ExerciseAnimationCard';
import { hapticLight } from '../../../utils/haptics';

const YoutubeIframe = React.lazy<React.ComponentType<any>>(() => import('react-native-youtube-iframe'));

export interface ActiveExerciseVideoProps {
  exercise: any;
  appState: string;
  isRefreshingVideo?: boolean;
  colors: any;
  styles?: any;
  onRefreshVideo?: () => void;
  onCloseVideo?: () => void;
  onError: (err: any) => void;
}

export const ActiveExerciseVideo: React.FC<ActiveExerciseVideoProps> = React.memo(({
  exercise,
  appState,
  colors,
  onCloseVideo,
  onError,
}) => {
  const [viewMode, setViewMode] = useState<'anim' | 'youtube'>('anim');
  const { width: windowWidth } = useWindowDimensions();

  // Responsive YouTube player dimensions
  const videoWidth = Math.max(windowWidth - 32, 280);
  const videoHeight = Math.round((videoWidth * 9) / 16);

  return (
    <View
      style={{
        backgroundColor: '#161618',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 6,
        marginBottom: 12,
        padding: 8,
      }}
    >
      {/* Sleek Minimalist Top Header (OpenGym standard) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 6,
          paddingVertical: 4,
          marginBottom: 6,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: '#30D158',
            }}
          />
          <Text
            style={{
              fontSize: 12,
              fontFamily: FONT_FAMILY.bold,
              color: '#FFFFFF',
              letterSpacing: 0.2,
            }}
          >
            Form Guide
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {exercise?.videoId && (
            <Pressable
              onPress={() => {
                hapticLight();
                setViewMode(prev => (prev === 'anim' ? 'youtube' : 'anim'));
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: viewMode === 'youtube' ? 'rgba(255, 69, 58, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={viewMode === 'youtube' ? 'barbell-outline' : 'logo-youtube'}
                size={12}
                color={viewMode === 'youtube' ? '#FF453A' : '#8E8E93'}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: FONT_FAMILY.medium,
                  color: viewMode === 'youtube' ? '#FF453A' : '#8E8E93',
                }}
              >
                {viewMode === 'youtube' ? 'Animation' : 'YouTube'}
              </Text>
            </Pressable>
          )}

          {onCloseVideo && (
            <Pressable
              onPress={() => {
                hapticLight();
                onCloseVideo();
              }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={14} color="#8E8E93" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Content Area */}
      {viewMode === 'anim' ? (
        <ExerciseAnimationCard
          exerciseName={exercise.name}
          onOpenYoutube={exercise?.videoId ? () => setViewMode('youtube') : undefined}
          showInstructions={false}
          isEmbedded={true}
          animationHeight={220}
        />
      ) : exercise.videoId ? (
        <View
          style={{
            borderRadius: 12,
            overflow: 'hidden',
            height: videoHeight,
            backgroundColor: '#000',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <React.Suspense fallback={<ActivityIndicator size="small" color="#FF453A" />}>
            <YoutubeIframe
              height={videoHeight}
              width={videoWidth}
              play={false}
              videoId={exercise.videoId}
              onError={onError}
              initialPlayerParams={{ modestbranding: true, rel: false }}
              webViewProps={{
                androidLayerType: appState === 'active' ? 'hardware' : 'software',
                domStorageEnabled: true,
                javaScriptEnabled: true,
              }}
            />
          </React.Suspense>
        </View>
      ) : (
        <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="small" color="#30D158" />
          <Text style={{ color: '#8E8E93', fontSize: 12, marginTop: 8, fontFamily: FONT_FAMILY.medium }}>
            Loading animation...
          </Text>
        </View>
      )}
    </View>
  );
});

export default ActiveExerciseVideo;
