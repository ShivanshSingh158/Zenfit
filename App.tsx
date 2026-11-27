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

// Pre-warm L1 auth slice first (<15ms), then Tier-0 workout domain cache in parallel BEFORE Frame 0
import {
  loadAuthBootSlice,
  loadBootManifest,
  isAuthBootHydrated,
  isL1BootHydrated,
  getL1Sync,
  setL1Sync,
  ONBOARDING_FLOW_KEY,
} from './src/utils/bootManifest';
loadAuthBootSlice().catch(() => { });
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
import { WellnessProvider, getWorkoutActiveGlobal } from './src/contexts/domains/WellnessContext';
import GymStack from './src/navigation/GymStack';
import { getAllPRs } from './src/utils/progressiveOverload';
import { preloadModuleNow } from './src/utils/ModulePrefetcher';
import ErrorBoundary from './src/components/ErrorBoundary';
import { setupLifecycleHygiene } from './src/services/lifecycleHygiene';
import { setupNetworkListener } from './src/services/offlineSync';

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

function MainNavigator({
  authBootHydrated,
  onOnboardingReady,
}: {
  authBootHydrated: boolean;
  onOnboardingReady: () => void;
}) {
  const { user, isGuest, loading: authLoading } = useCoreData();
  const { isDark, colors } = useTheme();
  const profileSnapshot = getGymProfileSync();
  const l1Onboarded =
    getL1Sync<boolean>(ONBOARDING_FLOW_KEY, false) ||
    Boolean(
      profileSnapshot?.onboardingCompleted ||
      (profileSnapshot?.heightCm && profileSnapshot?.weightKg) ||
      profileSnapshot?.goal
    );
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(Boolean(l1Onboarded));
  const isOnboarded = onboardingCompleted || l1Onboarded;
  const authReady = authBootHydrated && !authLoading;

  // Keep local state synchronized once L1 auth slice resolves
  React.useEffect(() => {
    if (!authReady || onboardingCompleted) return;
    if (l1Onboarded) setOnboardingCompleted(true);
  }, [authReady, onboardingCompleted, l1Onboarded]);

  // Reset onboarding flag only after auth settles and confirms user signed out cleanly
  React.useEffect(() => {
    if (!authReady) return;
    if (!user && !isGuest && !l1Onboarded) {
      setOnboardingCompleted(false);
    }
  }, [authReady, user, isGuest, l1Onboarded]);

  React.useEffect(() => {
    if (!authReady || isOnboarded) return;
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
  }, [authReady, isOnboarded, user, isGuest]);

  // Wait on auth resolution behind SplashScreen so Get Started never flashes for returning users
  if (!authReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      </View>
    );
  }

  // Only route to Get Started / Onboarding once auth & onboarding storage have definitively settled
  if (!isOnboarded || (!user && !isGuest)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <React.Suspense fallback={<View style={{ flex: 1, backgroundColor: colors.background }} />}>
          <LazyAthleteOnboardingFlow
            onComplete={() => setOnboardingCompleted(true)}
            onReady={onOnboardingReady}
          />
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

function MainRoot({
  fontsReady,
  authBootHydrated,
  bootHydrated,
}: {
  fontsReady: boolean;
  authBootHydrated: boolean;
  bootHydrated: boolean;
}) {
  const { loading: authLoading } = useCoreData();
  const { isDark, colors } = useTheme();
  const [navReady, setNavReady] = useState(false);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const warmTimersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleOnboardingReady = React.useCallback(() => {
    setOnboardingReady(true);
  }, []);

  React.useEffect(() => {
    if (!authBootHydrated || authLoading || !fontsReady) return;
    if ((bootHydrated && navReady) || onboardingReady) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [authBootHydrated, authLoading, bootHydrated, navReady, onboardingReady, fontsReady]);

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
              setTimeout(() => preloadModuleNow('Today'), 350),
              setTimeout(() => preloadModuleNow('ActiveLogging'), 850),
              setTimeout(() => {
                if (!getWorkoutActiveGlobal()) preloadModuleNow('Plan');
              }, 1450),
              setTimeout(() => {
                if (!getWorkoutActiveGlobal()) preloadModuleNow('Analytics');
              }, 2050),
              setTimeout(() => {
                if (!getWorkoutActiveGlobal()) preloadModuleNow('Body');
              }, 2650),
              setTimeout(() => {
                if (!getWorkoutActiveGlobal()) {
                  preloadModuleNow('WorkoutSummary');
                  import('./src/services/exerciseCatalogService')
                    .then((m) => m.warmUnifiedExerciseCatalogue?.())
                    .catch(() => {});
                  getAllPRs().catch(() => {});
                }
              }, 3250),
            ];
          });
        }}
      >
        <MainNavigator authBootHydrated={authBootHydrated} onOnboardingReady={handleOnboardingReady} />
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  const [authBootHydrated, setAuthBootHydrated] = useState<boolean>(() => isAuthBootHydrated() || isL1BootHydrated());
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

    // Fast tiny auth + onboarding + theme hydration (<15ms, never blocked by heavy workout logs)
    loadAuthBootSlice()
      .catch(() => {})
      .finally(() => {
        if (active) setAuthBootHydrated(true);
      });

    const bootCapTimer = setTimeout(() => {
      if (active) setBootHydrated(true);
    }, 2200);

    // Parallel L1 boot manifest hydration (never blocks ThemeProvider / NavigationContainer mounting)
    loadBootManifest()
      .catch(() => {})
      .finally(() => {
        clearTimeout(bootCapTimer);
        if (active) {
          setAuthBootHydrated(true);
          setBootHydrated(true);
        }
      });

    // Safety splash fallback: never uncover UI prematurely at 600ms/800ms mid-auth read;
    // only force-hide after 2500ms if storage, fonts, or navigation genuinely stall.
    const splashFallbackTimer = setTimeout(() => {
      if (active) setAuthBootHydrated(true);
      SplashScreen.hideAsync().catch(() => { });
    }, 2500);

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

    // Wire NetInfo & Auth restore auto-drain for queued offline writes
    const unsubscribeNetwork = setupNetworkListener();

    return () => {
      active = false;
      clearTimeout(bootCapTimer);
      clearTimeout(splashFallbackTimer);
      unsubscribeOta?.();
      unsubscribeNotif?.();
      unsubscribeLifecycle?.();
      unsubscribeNetwork?.();
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
                <MainRoot
                  fontsReady={fontsReady}
                  authBootHydrated={authBootHydrated}
                  bootHydrated={bootHydrated}
                />
              </CoreDataProvider>
            </PortalProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
