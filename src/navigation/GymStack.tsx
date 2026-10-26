import React, { useCallback, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// ─── Frame-0 Screen (Statically imported for instant boot) ──────────────────────
import GymHomeScreen from '../screens/gym/GymHomeScreen';

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
      detachInactiveScreens={true}
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        sceneStyle: { backgroundColor: colors.background },
        freezeOnBlur: true,
      }}
      backBehavior="history"
    >
      <Tab.Screen name="Today" component={GymHomeScreen} />
      <Tab.Screen
        name="Plan"
        getComponent={() => require('../screens/gym/GymSplitsScreen').default}
        options={{ lazy: true }}
      />
      <Tab.Screen
        name="Analytics"
        getComponent={() => require('../screens/gym/GymHistoryScreen').default}
        options={{ lazy: true }}
      />
      <Tab.Screen
        name="Body"
        getComponent={() => require('../screens/gym/GymProgressScreen').default}
        options={{ lazy: true }}
      />

      {/* Backward-compatibility aliases */}
      <Tab.Screen
        name="Splits"
        getComponent={() => require('../screens/gym/GymSplitsScreen').default}
        options={{ tabBarItemStyle: { display: 'none' }, tabBarButton: () => null }}
      />
      <Tab.Screen
        name="History"
        getComponent={() => require('../screens/gym/GymHistoryScreen').default}
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
        getComponent={() => require('../screens/gym/ActiveLoggingScreen').default}
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
        getComponent={() => require('../screens/gym/WorkoutSummaryScreen').default}
        options={{
          animation: 'fade',
          animationDuration: 180,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="ExerciseDetail" getComponent={() => require('../screens/gym/ExerciseDetailScreen').default} />
      <Stack.Screen name="ExerciseLibrary" getComponent={() => require('../screens/gym/ExerciseLibraryScreen').default} />
      <Stack.Screen name="GymProfile" getComponent={() => require('../screens/gym/GymProfileScreen').default} />
      <Stack.Screen
        name="CardioLog"
        getComponent={() => require('../screens/gym/CardioLogScreen').default}
        options={{
          animation: 'slide_from_bottom',
          animationDuration: 200,
          gestureDirection: 'vertical',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="ExerciseSwap"
        getComponent={() => require('../screens/gym/ExerciseSwapScreen').default}
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

