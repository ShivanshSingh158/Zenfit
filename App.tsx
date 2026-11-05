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
import { ensureNotificationChannels } from './src/services/notifications';
import { registerActiveWorkoutNotificationListeners } from './src/services/activeWorkoutNotificationService';
import { navigationRef } from './src/navigation/navigationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getGymProfileSync } from './src/hooks/useGymProfile';

import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { PortalProvider } from './src/contexts/PortalContext';
import { CoreDataProvider, useCoreData } from './src/contexts/domains/CoreDataContext';
import { WellnessProvider } from './src/contexts/domains/WellnessContext';
import GymStack from './src/navigation/GymStack';
import AthleteOnboardingFlow from './src/screens/onboarding/AthleteOnboardingFlow';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '[expo-av]: Expo AV has been deprecated',
  '[expo-av]: Video component from',
  'Video component from `expo-av` is deprecated',
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

function MainNavigator({ navReady, fontsReady }: { navReady: boolean; fontsReady: boolean }) {
  const { user, loading, isGuest } = useCoreData();
  const { isDark, colors } = useTheme();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function checkOnboarding() {
      try {
        const flag = await AsyncStorage.getItem('zenfit_onboarding_flow_done_v3');
        if (flag === 'true') {
          if (!cancelled) setOnboardingCompleted(true);
          return;
        }
        if (!cancelled) setOnboardingCompleted(false);
      } catch (_) {
        if (!cancelled) setOnboardingCompleted(false);
      }
    }
    checkOnboarding();
    return () => {
      cancelled = true;
    };
  }, []);

  // Dismiss splash screen the exact moment real UI, fonts AND navigation are ready
  React.useEffect(() => {
    if (!loading && onboardingCompleted !== null && navReady && fontsReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading, onboardingCompleted, navReady, fontsReady]);

  // Instant 0ms transition: hold under native splash until storage & fonts ready
  if (loading || onboardingCompleted === null) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : colors.background }} />
    );
  }

  // Flagship Athlete Onboarding Flow (shown until all 7 steps are finished, or if signed out)
  if (!onboardingCompleted || (!user && !isGuest)) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <AthleteOnboardingFlow onComplete={() => setOnboardingCompleted(true)} />
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

function MainRoot({ fontsReady }: { fontsReady: boolean }) {
  const { isDark, colors } = useTheme();
  const [navReady, setNavReady] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : colors.background }}>
      <NavigationContainer
        ref={navigationRef}
        theme={isDark ? ZEN_DARK_THEME : ZEN_LIGHT_THEME}
        onReady={() => {
          setNavReady(true);
        }}
      >
        <MainNavigator navReady={navReady} fontsReady={fontsReady} />
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  // Load fonts and capture load state to prevent font swap jitter on cold start
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_600SemiBold_Italic,
  });

  const fontsReady = fontsLoaded || !!fontError;

  React.useEffect(() => {
    // Pre-warm the boot manifest (already initiated at module scope)
    loadBootManifest().catch(() => {});

    // Ensure silent Android notification channels on startup (permission prompt is deferred to onboarding end)
    InteractionManager.runAfterInteractions(() => {
      ensureNotificationChannels().catch(() => {});
    });

    // Register active workout and weekly report notification click listeners
    const unsubscribeNotif = registerActiveWorkoutNotificationListeners();

    // Tier-1 Silent Background OTA Update Sync (ZenTrack WhatsApp / Discord Pattern):
    // 0ms startup delay; silently downloads new bundles in the background, ready on next launch
    const unsubscribeOta = registerDeferredOtaSync();

    // Safety fallback: guaranteed splash dismissal under any unexpected edge case (<2500ms)
    const safetyTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 2500);

    return () => {
      clearTimeout(safetyTimer);
      unsubscribeOta?.();
      unsubscribeNotif?.();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: '#000000' }}>
        <ThemeProvider>
          <PortalProvider>
            <CoreDataProvider>
              <MainRoot fontsReady={fontsReady} />
            </CoreDataProvider>
          </PortalProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
