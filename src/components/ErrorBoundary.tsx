/**
 * ErrorBoundary — ZenFit 3-Tier Crash Isolation
 *
 * Three tiers of protection:
 *   1. Screen/Tab-level (via withFocusFreeze & GymStack): crash isolates to a single
 *      tab or stack route while the rest of the app stays interactive.
 *   2. Navigator-level (GymStack): catches crashes inside the navigator tree.
 *   3. Root-level (App.tsx): last line of defense with crash-loop-guarded OTA reboot.
 *
 * All colors are hardcoded (never from ThemeContext) so this boundary can render
 * safely even if ThemeProvider itself throws.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  children: React.ReactNode;
  screenName?: string;
  /** Attempt one production OTA reload (with 10s crash-loop guard) on root crashes */
  autoRestartOnProd?: boolean;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
  isRestarting: boolean;
}

const BG = '#09090B';
const BORDER = '#27272A';
const ACCENT = '#FAFAFA';
const RED = '#EF4444';
const WHITE = '#FAFAFA';
const MUTED = '#A1A1AA';
const LAST_CRASH_KEY = '@zentrack_last_crash';

export default class ErrorBoundary extends React.Component<Props, State> {
  private _restartTimer: ReturnType<typeof setTimeout> | null = null;
  private _isMounted = true;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0, isRestarting: false };
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this._restartTimer) {
      clearTimeout(this._restartTimer);
      this._restartTimer = null;
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[ErrorBoundary] Crash caught in ${this.props.screenName ?? 'unknown'}: ${error.message}\n` +
      `${error.stack ?? ''}\n${info.componentStack ?? ''}`
    );

    this.setState({ errorInfo: info });

    try {
      this.props.onError?.(error, info);
    } catch {
      // Never let external reporting break recovery
    }

    if (!__DEV__ && this.props.autoRestartOnProd) {
      this.setState({ isRestarting: true });
      this._restartTimer = setTimeout(async () => {
        try {
          const lastCrashStr = await AsyncStorage.getItem(LAST_CRASH_KEY);
          const lastCrash = lastCrashStr ? parseInt(lastCrashStr, 10) : 0;

          if (Date.now() - lastCrash > 10000) {
            await AsyncStorage.setItem(LAST_CRASH_KEY, String(Date.now()));
            await Promise.race([
              Updates.reloadAsync(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
            ]);
            return;
          }
        } catch {
          // Fall back to interactive recovery UI below
        }

        if (this._isMounted) {
          this.setState({ isRestarting: false });
        }
      }, 0);
    }
  }

  handleRetry = () => {
    this.setState(prev => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prev.retryCount + 1,
      isRestarting: false,
    }));
  };

  render() {
    if (!this.state.hasError) {
      return (
        <React.Fragment key={`eb-${this.state.retryCount}`}>
          {this.props.children}
        </React.Fragment>
      );
    }

    if (this.state.isRestarting) {
      return <View style={styles.root} />;
    }

    const { screenName } = this.props;
    const { error, errorInfo, retryCount } = this.state;
    const screenLabel = screenName ?? 'This screen';

    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.iconCircle}>
            <Ionicons name="warning-outline" size={34} color={RED} />
          </View>

          <Text style={styles.title}>Something went wrong</Text>

          <Text style={styles.subtitle}>
            {screenLabel} hit an unexpected error.{'\n'}
            Your workout data is safe. Tap below to recover.
          </Text>

          {__DEV__ && error && (
            <View style={styles.devCard}>
              <Text style={styles.devLabel}>DEV ERROR DETAIL</Text>
              <Text style={styles.devError} selectable>
                {error.message}
              </Text>
              {errorInfo?.componentStack && (
                <Text style={styles.devStack} selectable numberOfLines={8}>
                  {errorInfo.componentStack.trim()}
                </Text>
              )}
            </View>
          )}

          {retryCount > 0 && (
            <Text style={styles.retryHint}>Retry attempt {retryCount}</Text>
          )}

          <TouchableOpacity
            style={styles.retryBtn}
            onPress={this.handleRetry}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh-outline" size={16} color={BG} style={{ marginRight: 6 }} />
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>

          {retryCount >= 2 && (
            <Text style={styles.restartHint}>
              Still interrupted? Close and reopen ZenFit.
            </Text>
          )}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: WHITE,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  devCard: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.22)',
    padding: 14,
    marginBottom: 20,
    gap: 6,
  },
  devLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: RED,
    letterSpacing: 1,
    marginBottom: 4,
  },
  devError: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: RED,
    lineHeight: 18,
  },
  devStack: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: MUTED,
    lineHeight: 16,
    marginTop: 4,
  },
  retryHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: MUTED,
    marginBottom: 12,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  retryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: BG,
  },
  restartHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
});
