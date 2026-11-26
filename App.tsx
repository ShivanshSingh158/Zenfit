import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useState } from 'react';
import { View, LogBox, StatusBar, InteractionManager, Appearance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { PlayfairDisplay_600SemiBold, PlayfairDisplay_600SemiBold_Italic } from '@expo-google-fonts/playfair-display';
import * as SplashScreen from 'expo-splash-screen';
import { enableScreens, enableFreeze } from 'react-native-screens';
import { DARK_TOKENS, LIGHT_TOKENS } from './src/theme/tokens';

// ─── Frame 0 Module-Level Optimizations (ZenTrack Architecture) ───────────────
// Hold splash until boot manifest, NavigationContainer.onReady(), and fonts settle
SplashScreen.preventAutoHideAsync().catch(() => { });

// Enable native Android Fragment containers and tab freezing
enableScreens(true);
enableFreeze(true);

// Pre-warm L1 memory cache via atomic multiGet BEFORE React renders Frame 0
import { loadBootManifest, isL1BootHydrated, getL1Sync, setL1Sync, ONBOARDING_FLOW_KEY } from './src/utils/bootManifest';
loadBootManifest().catch(() => { });

import { registerDeferredOtaSync } from './src/services/otaUpdateService';
import { ensureNotificationChannels } from './src/services/notifications';
import { registerActiveWorkoutNotificationListeners } from './src/services/activeWorkoutNotificationService';
import { navigationRef, flushPendingNavigation } from './src/navigation/navigationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './src/services/firebase';
import { COLLECTION } from './src/config/constants';
import { getGymProfileSync, PROFILE_STORAGE_KEY } from './src/hooks/useGymProfile';

import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { PortalProvider } from './src/contexts/PortalContext';
import { CoreDataProvider, useCoreData } from './src/contexts/domains/CoreDataContext';
import { WellnessProvider } from './src/contexts/domains/WellnessContext';
import GymStack from './src/navigation/GymStack';
import { getAllPRs } from './src/utils/progressiveOverload';
import { preloadModuleNow } from './src/utils/ModulePrefetcher';
import ErrorBoundary from './src/components/ErrorBoundary';
import { setupLifecycleHygiene } from './src/services/lifecycleHygiene';

const LazyAthleteOnboardingFlow = React.lazy(
  () => import('./src/screens/onboarding/AthleteOnboardingFlow')
);

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
    background: DARK_TOKENS.bg.canvas,
    card: DARK_TOKENS.bg.surface,
    border: DARK_TOKENS.border.subtle,
    text: DARK_TOKENS.text.primary,
    primary: DARK_TOKENS.accent.primary,
  },
};

const ZEN_LIGHT_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: LIGHT_TOKENS.bg.canvas,
    card: LIGHT_TOKENS.bg.surface,
    border: LIGHT_TOKENS.border.subtle,
    text: LIGHT_TOKENS.text.primary,
    primary: LIGHT_TOKENS.accent.primary,
  },
};

function MainNavigator({ bootHydrated }: { bootHydrated: boolean }) {
  const { user, isGuest } = useCoreData();
  const { isDark, colors } = useTheme();
  const initialOnboarded = getL1Sync<boolean>(ONBOARDING_FLOW_KEY, false) ||
    Boolean(getGymProfileSync()?.onboardingCompleted || (getGymProfileSync()?.heightCm && getGymProfileSync()?.weightKg));
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(Boolean(initialOnboarded));

  // Sync onboarding flag immediately when L1 boot manifest finishes in parallel with Frame 0
  React.useEffect(() => {
    if (!bootHydrated || onboardingCompleted) return;
    const synced = getL1Sync<boolean>(ONBOARDING_FLOW_KEY, false) ||
      Boolean(getGymProfileSync()?.onboardingCompleted || (getGymProfileSync()?.heightCm && getGymProfileSync()?.weightKg));
    if (synced) setOnboardingCompleted(true);
  }, [bootHydrated, onboardingCompleted]);

  // Reset onboarding flag if user signed out and local onboarding state was wiped
  React.useEffect(() => {
    if (!bootHydrated) return;
    if (!user && !isGuest && !getL1Sync<boolean>(ONBOARDING_FLOW_KEY, false)) {
      setOnboardingCompleted(false);
    }
  }, [bootHydrated, user, isGuest]);

  React.useEffect(() => {
    if (onboardingCompleted) return;
    let cancelled = false;

    async function checkBackgroundOnboarding() {
      try {
        const flag = await AsyncStorage.getItem(ONBOARDING_FLOW_KEY);
        if (flag === 'true') {
          setL1Sync(ONBOARDING_FLOW_KEY, true);
          if (!cancelled) setOnboardingCompleted(true);
          return;
        }

        // Fast returning check: if local or L1 profile already has biometrics or was completed
        const syncProf = getGymProfileSync();
        if (syncProf?.onboardingCompleted || (syncProf?.heightCm && syncProf?.weightKg)) {
          setL1Sync(ONBOARDING_FLOW_KEY, true);
          await AsyncStorage.setItem(ONBOARDING_FLOW_KEY, 'true').catch(() => {});
          if (!cancelled) setOnboardingCompleted(true);
          return;
        }

        const rawProfile = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
        if (rawProfile) {
          try {
            const parsed = JSON.parse(rawProfile);
            if (parsed?.onboardingCompleted || (parsed?.heightCm && parsed?.weightKg)) {
              setL1Sync(ONBOARDING_FLOW_KEY, true);
              await AsyncStorage.setItem(ONBOARDING_FLOW_KEY, 'true').catch(() => {});
              if (!cancelled) setOnboardingCompleted(true);
              return;
            }
          } catch (_) { }
        }

        // Non-blocking background verification for returning cloud accounts (Zero startup delay)
        if (user && !isGuest) {
          getDoc(doc(db, COLLECTION.USER_PROFILES, user.uid))
            .then(snap => {
              if (cancelled) return;
              if (snap && typeof snap.exists === 'function' && snap.exists()) {
                const data = snap.data();
                const prof = data?.gymProfile || data;
                if (prof?.onboardingCompleted || (prof?.heightCm && prof?.weightKg) || prof?.goal) {
                  setL1Sync(ONBOARDING_FLOW_KEY, true);
                  AsyncStorage.setItem(ONBOARDING_FLOW_KEY, 'true').catch(() => {});
                  setOnboardingCompleted(true);
                }
              }
            })
            .catch(() => {});
        }
      } catch (_) {
        // Fallback silently without blocking Frame 0
      }
    }

    checkBackgroundOnboarding();
    return () => {
      cancelled = true;
    };
  }, [onboardingCompleted, user, isGuest]);

  // Hold empty canvas only if neither user/onboarding L1 nor boot hydration is known yet (native splash stays visible above)
  if (!bootHydrated && (!onboardingCompleted || (!user && !isGuest))) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  // Flagship Athlete Onboarding Flow (shown until all 7 steps are finished, or if signed out)
  if (!onboardingCompleted || (!user && !isGuest)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <React.Suspense fallback={<View style={{ flex: 1, backgroundColor: colors.background }} />}>
          <LazyAthleteOnboardingFlow onComplete={() => setOnboardingCompleted(true)} />
        </React.Suspense>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <WellnessProvider user={user}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <GymStack />
      </WellnessProvider>
    </View>
  );
}

function MainRoot({ fontsReady, bootHydrated }: { fontsReady: boolean; bootHydrated: boolean }) {
  const { isDark, colors } = useTheme();
  const [navReady, setNavReady] = useState(false);
  const warmTimersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  React.useEffect(() => {
    if (bootHydrated && navReady && fontsReady) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [bootHydrated, navReady, fontsReady]);

  React.useEffect(() => {
    return () => {
      warmTimersRef.current.forEach(clearTimeout);
      warmTimersRef.current = [];
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NavigationContainer
        ref={navigationRef}
        theme={isDark ? ZEN_DARK_THEME : ZEN_LIGHT_THEME}
        onReady={() => {
          setNavReady(true);
          flushPendingNavigation();
          InteractionManager.runAfterInteractions(() => {
            warmTimersRef.current.forEach(clearTimeout);
            warmTimersRef.current = [
              setTimeout(() => preloadModuleNow('Today'), 450),
              setTimeout(() => preloadModuleNow('ActiveLogging'), 1100),
              setTimeout(() => {
                import('./src/components/Gym/exercise/AddExerciseModal')
                  .then((m) => m.warmExerciseCatalogue?.())
                  .catch(() => {});
                getAllPRs().catch(() => {});
              }, 2000),
            ];
          });
        }}
      >
        <MainNavigator bootHydrated={bootHydrated} />
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  const [bootHydrated, setBootHydrated] = useState<boolean>(() => isL1BootHydrated());

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
    let active = true;
    const bootCapTimer = setTimeout(() => {
      if (active) setBootHydrated(true);
    }, 600);

    // Parallel L1 boot manifest hydration (never blocks ThemeProvider / NavigationContainer mounting)
    loadBootManifest()
      .catch(() => {})
      .finally(() => {
        clearTimeout(bootCapTimer);
        if (active) setBootHydrated(true);
      });

    // Safety splash fallback: only triggers if nav/fonts stall over 800ms
    const splashFallbackTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => { });
    }, 800);

    // Ensure silent Android notification channels on startup (permission prompt is deferred to onboarding end)
    InteractionManager.runAfterInteractions(() => {
      ensureNotificationChannels().catch(() => { });
    });

    // Register active workout and weekly report notification click listeners
    const unsubscribeNotif = registerActiveWorkoutNotificationListeners();

    // Tier-1 Silent Background OTA Update Sync (ZenTrack WhatsApp / Discord Pattern):
    // 0ms startup delay; silently downloads new bundles in the background, ready on next launch
    const unsubscribeOta = registerDeferredOtaSync();

    // Centralized OS background/foreground flush hygiene (1 AppState listener instead of 4)
    const unsubscribeLifecycle = setupLifecycleHygiene();

    return () => {
      active = false;
      clearTimeout(bootCapTimer);
      clearTimeout(splashFallbackTimer);
      unsubscribeOta?.();
      unsubscribeNotif?.();
      unsubscribeLifecycle?.();
    };
  }, []);

  const initialTheme = getL1Sync<string>('@zentrack_theme', Appearance.getColorScheme() || 'dark');
  const isInitialLight =
    initialTheme === 'light' ||
    (initialTheme === 'system' && Appearance.getColorScheme() === 'light');
  const appBg = isInitialLight ? LIGHT_TOKENS.bg.canvas : DARK_TOKENS.bg.canvas;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: appBg }}>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: appBg }}>
        <ErrorBoundary screenName="ZenFit Root" autoRestartOnProd>
          <ThemeProvider>
            <PortalProvider>
              <CoreDataProvider>
                <MainRoot fontsReady={fontsReady} bootHydrated={bootHydrated} />
              </CoreDataProvider>
            </PortalProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
