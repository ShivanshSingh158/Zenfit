import React, { useCallback } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// ─── 4 Core Tabs ─────────────────────────────────────────────────────────────
import GymHomeScreen from '../screens/gym/GymHomeScreen';
import GymSplitsScreen from '../screens/gym/GymSplitsScreen';
import GymHistoryScreen from '../screens/gym/GymHistoryScreen';
import GymProgressScreen from '../screens/gym/GymProgressScreen';

// ─── Root-Level Overlay Stack Screens ────────────────────────────────────────
import ActiveLoggingScreen from '../screens/gym/ActiveLoggingScreen';
import WorkoutSummaryScreen from '../screens/gym/WorkoutSummaryScreen';
import ExerciseDetailScreen from '../screens/gym/ExerciseDetailScreen';
import ExerciseLibraryScreen from '../screens/gym/ExerciseLibraryScreen';
import GymProfileScreen from '../screens/gym/GymProfileScreen';
import CardioLogScreen from '../screens/gym/CardioLogScreen';
import ExerciseSwapScreen from '../screens/gym/ExerciseSwapScreen';

import { TelegramTabBar } from '../components/Navigation/TelegramTabBar';
import { useTheme } from '../contexts/ThemeContext';

const Tab = createBottomTabNavigator<any>();
const Stack = createNativeStackNavigator<any>();

/**
 * MainTabs: 4-Tab Architecture powered by Telegram-style gliding pill bottom navigation.
 * Matches the gold standard of Hevy & Strong:
 * 1. Today   (🔥 Zero-friction active workout hub & scan zone)
 * 2. Splits  (📋 PPL vs Arnold routine switcher & 7-day pattern editor)
 * 3. History (📜 91-day activity heatmap, past logs & PR hall of fame)
 * 4. Body    (📈 Anatomical vector muscle map, 1RM progression & analytics)
 */
function MainTabs() {
  const { colors } = useTheme();
  const renderTabBar = useCallback((props: any) => <TelegramTabBar {...props} />, []);

  return (
    <Tab.Navigator
      id="ZenFitMainTabs"
      initialRouteName="Today"
      tabBar={renderTabBar}
      detachInactiveScreens={true}
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        sceneStyle: { backgroundColor: colors.background },
        lazy: true,
        freezeOnBlur: true,
      }}
      backBehavior="history"
    >
      <Tab.Screen name="Today" component={GymHomeScreen} />
      <Tab.Screen name="Plan" component={GymSplitsScreen} />
      <Tab.Screen name="Analytics" component={GymHistoryScreen} />
      <Tab.Screen name="Body" component={GymProgressScreen} />

      {/* Backward-compatibility aliases */}
      <Tab.Screen
        name="Splits"
        component={GymSplitsScreen}
        options={{ tabBarItemStyle: { display: 'none' }, tabBarButton: () => null }}
      />
      <Tab.Screen
        name="History"
        component={GymHistoryScreen}
        options={{ tabBarItemStyle: { display: 'none' }, tabBarButton: () => null }}
      />
    </Tab.Navigator>
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
          animation: 'slide_from_right',
          animationDuration: 220,
        }}
      />
      <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
      <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
      <Stack.Screen name="GymProfile" component={GymProfileScreen} />
      <Stack.Screen
        name="CardioLog"
        component={CardioLogScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="ExerciseSwap"
        component={ExerciseSwapScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

