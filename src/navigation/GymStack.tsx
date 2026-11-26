import React, { useCallback } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// ─── Frame-0 Home Screen (Eager) ─────────────────────────────────────────────
import GymDashboardScreen from '../screens/gym/GymDashboardScreen';

// ─── Lazy-Loaded Tab & Stack Screens (Prefetch-aware, 0ms cold eval) ────────
import { cacheAwareLazy } from '../utils/ModulePrefetcher';
import { withFocusFreeze } from './withFocusFreeze';
import ErrorBoundary from '../components/ErrorBoundary';

function withScreenBoundary<T extends object>(
  Component: React.ComponentType<T>,
  screenName: string
): React.ComponentType<T> {
  const BoundedScreen = (props: T) => (
    <ErrorBoundary screenName={screenName}>
      <Component {...props} />
    </ErrorBoundary>
  );
  BoundedScreen.displayName = `Bounded(${screenName})`;
  return BoundedScreen;
}

const LazyGymSplitsScreen = cacheAwareLazy('Plan', () => import('../screens/gym/GymSplitsScreen'));
const LazyGymHomeScreen = cacheAwareLazy('Today', () => import('../screens/gym/GymHomeScreen'));
const LazyGymHistoryScreen = cacheAwareLazy('Analytics', () => import('../screens/gym/GymHistoryScreen'));
const LazyGymProgressScreen = cacheAwareLazy('Body', () => import('../screens/gym/GymProgressScreen'));

const SafeDashboard = withFocusFreeze(GymDashboardScreen, 'Dashboard');
const SafePlan = withFocusFreeze(LazyGymSplitsScreen, 'Plan');
const SafeToday = withFocusFreeze(LazyGymHomeScreen, 'Today');
const SafeAnalytics = withFocusFreeze(LazyGymHistoryScreen, 'Analytics');
const SafeBody = withFocusFreeze(LazyGymProgressScreen, 'Body');

const LazyActiveLoggingScreen = withScreenBoundary(
  cacheAwareLazy('ActiveLogging', () => import('../screens/gym/ActiveLoggingScreen')),
  'Workout Logger'
);
const LazyWorkoutSummaryScreen = withScreenBoundary(
  cacheAwareLazy('WorkoutSummary', () => import('../screens/gym/WorkoutSummaryScreen')),
  'Workout Summary'
);
const LazyExerciseSwapScreen = withScreenBoundary(
  cacheAwareLazy('ExerciseSwap', () => import('../screens/gym/ExerciseSwapScreen')),
  'Exercise Swap'
);
const LazyExerciseDetailScreen = withScreenBoundary(
  cacheAwareLazy('ExerciseDetail', () => import('../screens/gym/ExerciseDetailScreen')),
  'Exercise Detail'
);
const LazyExerciseLibraryScreen = withScreenBoundary(
  cacheAwareLazy('ExerciseLibrary', () => import('../screens/gym/ExerciseLibraryScreen')),
  'Exercise Library'
);
const LazyGymProfileScreen = withScreenBoundary(
  cacheAwareLazy('GymProfile', () => import('../screens/gym/GymProfileScreen')),
  'Profile'
);

import { TelegramTabBar } from '../components/Navigation/TelegramTabBar';
import { MainTabsFocusProvider } from './MainTabsFocusContext';
import { useTheme } from '../contexts/ThemeContext';

const Tab = createBottomTabNavigator<any>();
const Stack = createNativeStackNavigator<any>();

/**
 * MainTabs: 5-Tab Instagram-style zero-latency switching powered by native containers,
 * focus-frozen tabs, cache-aware lazy screens, and Telegram-style gliding pill navigation.
 */
function MainTabs() {
  const { colors } = useTheme();
  const isMainTabsFocused = useIsFocused();
  const renderTabBar = useCallback((props: any) => <TelegramTabBar {...props} />, []);

  return (
    <MainTabsFocusProvider focused={isMainTabsFocused}>
      <Tab.Navigator
        id="ZenFitMainTabs"
        initialRouteName="Home"
        tabBar={renderTabBar}
        detachInactiveScreens={false}
        screenOptions={{
          headerShown: false,
          animation: 'none',
          sceneStyle: { backgroundColor: colors.background },
          freezeOnBlur: true,
          lazy: true,
        }}
        backBehavior="history"
      >
        <Tab.Screen name="Home" component={SafeDashboard} options={{ lazy: false }} />
        <Tab.Screen name="Plan" component={SafePlan} />
        <Tab.Screen name="Today" component={SafeToday} options={{ title: 'Train', tabBarLabel: 'Train' }} />
        <Tab.Screen name="Analytics" component={SafeAnalytics} />
        <Tab.Screen name="Body" component={SafeBody} />
      </Tab.Navigator>
    </MainTabsFocusProvider>
  );
}

export default function GymStack() {
  const { colors } = useTheme();

  return (
    <ErrorBoundary screenName="Gym Navigator">
      <Stack.Navigator
        id="GymStack"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 220,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="ActiveLogging"
          component={LazyActiveLoggingScreen}
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
            animationDuration: 280,
            gestureDirection: 'vertical',
            gestureEnabled: true,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
        <Stack.Screen
          name="WorkoutSummary"
          component={LazyWorkoutSummaryScreen}
          options={{
            animation: 'fade',
            animationDuration: 180,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="ExerciseDetail" component={LazyExerciseDetailScreen} />
        <Stack.Screen name="ExerciseLibrary" component={LazyExerciseLibraryScreen} />
        <Stack.Screen name="GymProfile" component={LazyGymProfileScreen} />
        <Stack.Screen
          name="ExerciseSwap"
          component={LazyExerciseSwapScreen}
          options={{
            animation: 'slide_from_bottom',
            animationDuration: 200,
            gestureDirection: 'vertical',
            gestureEnabled: true,
          }}
        />
      </Stack.Navigator>
    </ErrorBoundary>
  );
}

