import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React from 'react';
import { View, LogBox, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { enableScreens, enableFreeze } from 'react-native-screens';

// ─── Frame 0 Module-Level Optimizations (ZenTrack Architecture) ───────────────
// Hold splash until NavigationContainer.onReady() or AuthScreen paints
SplashScreen.preventAutoHideAsync().catch(() => {});

// Enable native Android Fragment containers and tab freezing
enableScreens(true);
enableFreeze(true);

// Pre-warm L1 memory cache via atomic multiGet BEFORE React renders Frame 0
import { loadBootManifest } from './src/utils/bootManifest';
loadBootManifest().catch(() => {});

import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { PortalProvider } from './src/contexts/PortalContext';
import { CoreDataProvider, useCoreData } from './src/contexts/domains/CoreDataContext';
import { WellnessProvider } from './src/contexts/domains/WellnessContext';
import GymStack from './src/navigation/GymStack';
import AuthScreen from './src/screens/AuthScreen';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '[expo-av]: Expo AV has been deprecated',
  'setLayoutAnimationEnabledExperimental',
  'Could not reach Cloud Firestore backend',
  '[Reanimated] Property "opacity"',
]);

const ZEN_DARK_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000000',
    card: '#000000',
    border: 'transparent',
    text: '#ffffff',
  },
};

const ZEN_LIGHT_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#F4F3F8',
    card: '#ffffff',
    border: 'transparent',
    text: '#1c1c1e',
  },
};

function MainNavigator() {
  const { user, loading, isGuest } = useCoreData();
  const { isDark, colors } = useTheme();

  // Instant 0ms transition: if cached user or guest exists, this never renders.
  // If fresh install, this holds for <5ms while local storage checks.
  if (loading && !user && !isGuest) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000' }} />
    );
  }

  if (!user && !isGuest) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : colors.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000000' : colors.background} />
        <AuthScreen />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : colors.background }}>
      <WellnessProvider user={user}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000000' : colors.background} />
        <NavigationContainer
          theme={isDark ? ZEN_DARK_THEME : ZEN_LIGHT_THEME}
          onReady={() => {
            // Dismiss splash screen the exact millisecond the UI paints
            SplashScreen.hideAsync().catch(() => {});
          }}
        >
          <GymStack />
        </NavigationContainer>
      </WellnessProvider>
    </View>
  );
}

export default function App() {
  // Load fonts in background without blocking initial paint (non-blocking)
  useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: '#000000' }}>
        <ThemeProvider>
          <PortalProvider>
            <CoreDataProvider>
              <MainNavigator />
            </CoreDataProvider>
          </PortalProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
