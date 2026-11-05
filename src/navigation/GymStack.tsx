import React, { useCallback, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// ─── Frame-0 Screens (Statically imported for instant tab switching) ──────────────
import GymHomeScreen from '../screens/gym/GymHomeScreen';
import GymSplitsScreen from '../screens/gym/GymSplitsScreen';
import GymHistoryScreen from '../screens/gym/GymHistoryScreen';
import GymProgressScreen from '../screens/gym/GymProgressScreen';
import ActiveLoggingScreen from '../screens/gym/ActiveLoggingScreen';
import WorkoutSummaryScreen from '../screens/gym/WorkoutSummaryScreen';
import CardioLogScreen from '../screens/gym/CardioLogScreen';
import ExerciseSwapScreen from '../screens/gym/ExerciseSwapScreen';
import ExerciseDetailScreen from '../screens/gym/ExerciseDetailScreen';
import ExerciseLibraryScreen from '../screens/gym/ExerciseLibraryScreen';
import GymProfileScreen from '../screens/gym/GymProfileScreen';

import { TelegramTabBar } from '../components/Navigation/TelegramTabBar';
import { useTheme } from '../contexts/ThemeContext';

const Tab = createBottomTabNavigator<any>();
const Stack = createNativeStackNavigator<any>();

/**
 * MainTabs: 4-Tab Architecture powered by Telegram-style gliding pill bottom navigation.
 * Matches the gold standard of Hevy & Strong:
 * 1. Today     (🔥 Zero-friction active workout hub & scan zone)
 * 2. Plan      (📋 PPL vs Arnold routine switcher & 7-day pattern editor)
 * 3. Analytics (📜 18-week activity heatmap, past logs & telemetry)
 * 4. Body      (🧬 Anatomical vector muscle map, bodyweight & settings)
 */
function MainTabs() {
  const { colors } = useTheme();
  const renderTabBar = useCallback((props: any) => <TelegramTabBar {...props} />, []);

  return (
    <Tab.Navigator
      id="ZenFitMainTabs"
      initialRouteName="Today"
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
      <Tab.Screen name="Today" component={GymHomeScreen} />
      <Tab.Screen name="Plan" component={GymSplitsScreen} />
      <Tab.Screen name="Analytics" component={GymHistoryScreen} />
      <Tab.Screen name="Body" component={GymProgressScreen} />
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
          animation: 'slide_from_bottom',
          animationDuration: 200,
          gestureDirection: 'vertical',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
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
        name="CardioLog"
        component={CardioLogScreen}
        options={{
          animation: 'slide_from_bottom',
          animationDuration: 200,
          gestureDirection: 'vertical',
          gestureEnabled: true,
        }}
      />
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

