import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '../../contexts/ThemeContext';
import {
  getLocalAvatarUriSync,
  getCachedAvatarUri,
  cacheUserAvatar,
  clearAvatarCache,
  subscribeAvatarChanges,
} from '../../services/userAvatarService';

export interface UserAvatarProps {
  size?: number;
  uid?: string | null;
  photoURL?: string | null;
  fallbackLetter?: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  textStyle?: StyleProp<TextStyle>;
  showOnlineRing?: boolean;
  accessibilityLabel?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = React.memo(({
  size = 32,
  uid,
  photoURL,
  fallbackLetter = 'A',
  style,
  imageStyle,
  textStyle,
  showOnlineRing = false,
  accessibilityLabel = 'User Profile Avatar',
}) => {
  const { tokens } = useTheme();
  const [localUri, setLocalUri] = useState<string | null>(() => getLocalAvatarUriSync(uid));
  const [loadError, setLoadError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(() => Boolean(getLocalAvatarUriSync(uid)));

  // Synchronously pick up pre-seeded memory cache if uid arrives after mount
  useEffect(() => {
    const syncMem = getLocalAvatarUriSync(uid);
    setLocalUri(syncMem);
    setImageLoaded(Boolean(syncMem));
    setLoadError(false);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    let isMounted = true;

    getCachedAvatarUri(uid).then((cached) => {
      if (isMounted && cached) {
        setLocalUri(cached);
        setLoadError(false);
      }
    });

    const unsubscribe = subscribeAvatarChanges((updatedUid, newUri) => {
      if (isMounted && updatedUid === uid) {
        setLocalUri(newUri);
        setLoadError(false);
      }
    });

    if (photoURL) {
      cacheUserAvatar(uid, photoURL).catch(() => {});
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [uid, photoURL]);

  useEffect(() => {
    setLoadError(false);
  }, [photoURL, localUri]);

  const activeUri = localUri || (photoURL && !loadError ? photoURL : null);
  const borderRadius = Math.round(size / 2);
  const fontSize = Math.max(11, Math.round(size * 0.4));
  const onlineRingSize = Math.max(10, Math.round(size * 0.22));
  const onlineRingBorder = Math.max(1.5, Math.round(size * 0.035));

  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        width: size,
        height: size,
        borderRadius,
        backgroundColor: tokens.bg.elevated,
      },
      style,
    ],
    [size, borderRadius, tokens.bg.elevated, style]
  );

  const letterStyle = useMemo(
    () => [
      styles.letter,
      {
        fontFamily: tokens.font.bold,
        fontSize,
        color: tokens.text.primary,
      },
      textStyle,
    ],
    [fontSize, tokens.font.bold, tokens.text.primary, textStyle]
  );

  return (
    <View style={containerStyle} accessibilityLabel={accessibilityLabel} accessibilityRole="image">
      {/* Keep crisp initial visible until ExpoImage paints so an empty dark circle never flashes */}
      {(!activeUri || loadError || !imageLoaded) && (
        <Text maxFontSizeMultiplier={1.15} style={letterStyle}>
          {fallbackLetter || 'A'}
        </Text>
      )}
      {activeUri && !loadError && (
        <ExpoImage
          key={activeUri}
          source={{ uri: activeUri }}
          style={[
            StyleSheet.absoluteFillObject,
            { width: size, height: size, borderRadius },
            imageStyle,
          ]}
          contentFit="cover"
          transition={localUri ? 0 : 120}
          cachePolicy="memory-disk"
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageLoaded(false);
            if (localUri) {
              setLocalUri(null);
              if (uid) {
                clearAvatarCache(uid)
                  .then(() => {
                    if (photoURL) return cacheUserAvatar(uid, photoURL);
                  })
                  .catch(() => {});
              }
            } else {
              setLoadError(true);
            }
          }}
        />
      )}

      {showOnlineRing && (
        <View
          style={[
            styles.onlineRing,
            {
              width: onlineRingSize,
              height: onlineRingSize,
              borderRadius: onlineRingSize / 2,
              borderWidth: onlineRingBorder,
              borderColor: tokens.bg.surface,
              backgroundColor: tokens.status.success,
            },
          ]}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  letter: {
    includeFontPadding: false,
    textAlign: 'center',
  },
  onlineRing: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
});

export default UserAvatar;
