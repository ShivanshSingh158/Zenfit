import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useState } from 'react';
import { View, LogBox, StatusBar, InteractionManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { PlayfairDisplay_600SemiBold, PlayfairDisplay_600SemiBold_Italic } from '@expo-google-fonts/playfair-display';
import * as SplashScreen from 'expo-splash-screen';
import { enableScreens, enableFreeze } from 'react-native-screens';

// ─── Frame 0 Module-Level Optimizations (ZenTrack Architecture) ───────────────
// Hold splash until NavigationContainer.onReady() or LandingScreen paints
SplashScreen.preventAutoHideAsync().catch(() => {});

// Enable native Android Fragment containers and tab freezing
enableScreens(true);
enableFreeze(true);

// Pre-warm L1 memory cache via atomic multiGet BEFORE React renders Frame 0
import { loadBootManifest } from './src/utils/bootManifest';
loadBootManifest().catch(() => {});

import { registerDeferredOtaSync } from './src/services/otaUpdateService';
import { ensureNotificationChannels, requestNotificationPermissions } from './src/services/notifications';

import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { PortalProvider } from './src/contexts/PortalContext';
import { CoreDataProvider, useCoreData } from './src/contexts/domains/CoreDataContext';
import { WellnessProvider } from './src/contexts/domains/WellnessContext';
import GymStack from './src/navigation/GymStack';
import LandingScreen from './src/screens/LandingScreen';
import AuthScreen from './src/screens/AuthScreen';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '[expo-av]: Expo AV has been deprecated',
  'setLayoutAnimationEnabledExperimental',
  'Could not reach Cloud Firestore backend',
  '[Reanimated] Property "opacity"',
  'Require cycle:',
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
  const [authStep, setAuthStep] = useState<'welcome' | 'signin'>('welcome');

  // Dismiss splash screen the exact moment real UI (either GymStack or AuthScreen) is ready
  React.useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  // Instant 0ms transition: if cached user or guest exists, this never renders.
  // If fresh install, this holds under the native splash for <5ms while local storage checks.
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000' }} />
    );
  }

  // 2-Step ZenTrack Authentication Flow (01 / welcome -> 02 / sign in)
  if (!user && !isGuest) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : colors.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000000' : colors.background} />
        {authStep === 'welcome' ? (
          <LandingScreen onGetStarted={() => setAuthStep('signin')} />
        ) : (
          <AuthScreen onBack={() => setAuthStep('welcome')} />
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : colors.background }}>
      <WellnessProvider user={user}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000000' : colors.background} />
        <GymStack />
      </WellnessProvider>
    </View>
  );
}

function MainRoot() {
  const { isDark } = useTheme();

  return (
    <NavigationContainer
      theme={isDark ? ZEN_DARK_THEME : ZEN_LIGHT_THEME}
      onReady={() => {
        SplashScreen.hideAsync().catch(() => {});
      }}
    >
      <MainNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  // Load fonts in background without blocking initial paint (non-blocking)
  useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_600SemiBold_Italic,
  });

  React.useEffect(() => {
    // Pre-warm the boot manifest (already initiated at module scope)
    loadBootManifest().catch(() => {});

    // Ensure notification channels & request permissions on startup
    InteractionManager.runAfterInteractions(() => {
      ensureNotificationChannels().catch(() => {});
      requestNotificationPermissions().catch(() => {});
    });

    // Tier-1 Silent Background OTA Update Sync (ZenTrack WhatsApp / Discord Pattern):
    // 0ms startup delay; silently downloads new bundles in the background, ready on next launch
    const unsubscribeOta = registerDeferredOtaSync();

    // Safety fallback: guaranteed splash dismissal under any unexpected edge case (<400ms)
    const safetyTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 400);

    return () => {
      clearTimeout(safetyTimer);
      unsubscribeOta?.();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: '#000000' }}>
        <ThemeProvider>
          <PortalProvider>
            <CoreDataProvider>
              <MainRoot />
            </CoreDataProvider>
          </PortalProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
