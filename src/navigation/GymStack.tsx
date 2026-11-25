import React, { useCallback } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// ─── Frame-0 Screens ───────────────────────────────────────────────────────────
import GymDashboardScreen from '../screens/gym/GymDashboardScreen';
import GymHomeScreen from '../screens/gym/GymHomeScreen';
import GymSplitsScreen from '../screens/gym/GymSplitsScreen';
import GymHistoryScreen from '../screens/gym/GymHistoryScreen';
import GymProgressScreen from '../screens/gym/GymProgressScreen';
import ActiveLoggingScreen from '../screens/gym/ActiveLoggingScreen';
import WorkoutSummaryScreen from '../screens/gym/WorkoutSummaryScreen';
import ExerciseSwapScreen from '../screens/gym/ExerciseSwapScreen';
import ExerciseDetailScreen from '../screens/gym/ExerciseDetailScreen';
import ExerciseLibraryScreen from '../screens/gym/ExerciseLibraryScreen';
import GymProfileScreen from '../screens/gym/GymProfileScreen';

import { TelegramTabBar } from '../components/Navigation/TelegramTabBar';
import { MainTabsFocusProvider } from './MainTabsFocusContext';
import { useTheme } from '../contexts/ThemeContext';

const Tab = createBottomTabNavigator<any>();
const Stack = createNativeStackNavigator<any>();

/**
 * MainTabs: 5-Tab Instagram-style zero-latency switching powered by native containers,
 * lazy first-visit mounting, and Telegram-style gliding pill bottom navigation.
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
        <Tab.Screen name="Home" component={GymDashboardScreen} />
        <Tab.Screen name="Plan" component={GymSplitsScreen} />
        <Tab.Screen name="Today" component={GymHomeScreen} options={{ title: 'Train', tabBarLabel: 'Train' }} />
        <Tab.Screen name="Analytics" component={GymHistoryScreen} />
        <Tab.Screen name="Body" component={GymProgressScreen} />
      </Tab.Navigator>
    </MainTabsFocusProvider>
  );
}

export default function GymStack() {
  const { colors } = useTheme();

  return (
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
        component={ActiveLoggingScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
          animationDuration: 200,
          gestureDirection: 'vertical',
          gestureEnabled: true,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      <Stack.Screen
        name="WorkoutSummary"
        component={WorkoutSummaryScreen}
        options={{
          animation: 'fade',
          animationDuration: 180,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
      <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
      <Stack.Screen name="GymProfile" component={GymProfileScreen} />
      <Stack.Screen
        name="ExerciseSwap"
        component={ExerciseSwapScreen}
        options={{
          animation: 'slide_from_bottom',
          animationDuration: 200,
          gestureDirection: 'vertical',
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
}

