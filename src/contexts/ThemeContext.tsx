/**
 * ThemeContext — ZenFit Mobile
 *
 * Provides: isDark, mode, colors, tokens, toggleTheme(), setTheme()
 * Defaults synchronously on Frame 0 to OLED High-Contrast Dark Mode (#09090B).
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Appearance, ColorSchemeName, Platform, StatusBar as RNStatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DARK_COLORS,
  LIGHT_COLORS,
  DARK_TOKENS,
  LIGHT_TOKENS,
  ThemeTokens,
} from '../theme/tokens';
import {
  getAuthBootSync,
  getBootManifestSync,
  getL1Sync,
  isAuthBootHydrated,
  isL1BootHydrated,
  loadAuthBootSlice,
  updateL1Cache,
} from '../utils/bootManifest';

export type ThemeMode = 'dark' | 'light' | 'system';

export type AppColors = typeof DARK_COLORS;

export interface ThemeContextType {
  isDark: boolean;
  mode: ThemeMode;
  colors: AppColors;
  tokens: ThemeTokens;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_STORAGE_KEY = '@zentrack_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const _authSync = getAuthBootSync();
  const _sync = getBootManifestSync();
  const l1Mode = getL1Sync<ThemeMode | null>(THEME_STORAGE_KEY, null);
  const syncMode: ThemeMode | null = _authSync?.themeMode ?? _sync?.themeMode ?? l1Mode ?? null;

  const [mode, setMode] = useState<ThemeMode>(syncMode ?? 'dark');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme() || 'dark'
  );
  const userChangedRef = React.useRef(false);

  useEffect(() => {
    if (isAuthBootHydrated() || isL1BootHydrated()) return;
    let active = true;
    (async () => {
      try {
        const slice = await loadAuthBootSlice();
        const savedTheme = slice.themeMode ?? (await AsyncStorage.getItem(THEME_STORAGE_KEY));
        if (
          active &&
          !userChangedRef.current &&
          (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')
        ) {
          updateL1Cache('themeMode', savedTheme as ThemeMode);
          setMode(savedTheme as ThemeMode);
        }
      } catch {
        // Default OLED dark stays active
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  const applyMode = useCallback(async (next: ThemeMode) => {
    userChangedRef.current = true;
    setMode(next);
    updateL1Cache('themeMode', next);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore persistence write error
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    applyMode(next);
  }, [mode, applyMode]);

  const setTheme = useCallback(
    (next: ThemeMode) => {
      applyMode(next);
    },
    [applyMode]
  );

  const isDark = useMemo(() => {
    if (mode === 'system') {
      return systemScheme === 'dark';
    }
    return mode === 'dark';
  }, [mode, systemScheme]);

  useEffect(() => {
    RNStatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
    if (Platform.OS === 'android') {
      RNStatusBar.setTranslucent(true);
      RNStatusBar.setBackgroundColor('transparent', true);
    }
  }, [isDark]);

  const value: ThemeContextType = useMemo(
    () => ({
      isDark,
      mode,
      colors: isDark ? DARK_COLORS : LIGHT_COLORS,
      tokens: isDark ? DARK_TOKENS : LIGHT_TOKENS,
      toggleTheme,
      setTheme,
    }),
    [isDark, mode, toggleTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      isDark: true,
      mode: 'dark',
      colors: DARK_COLORS,
      tokens: DARK_TOKENS,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return ctx;
}
