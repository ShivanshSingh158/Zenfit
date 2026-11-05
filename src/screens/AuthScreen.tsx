import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
let AppleAuthentication: any = null;
try {
  AppleAuthentication = require('expo-apple-authentication');
} catch (_) {}
import { OAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../services/firebase';
import { hapticLight, hapticMedium } from '../utils/haptics';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { PlayfairDisplay_600SemiBold, PlayfairDisplay_600SemiBold_Italic } from '@expo-google-fonts/playfair-display';
import { RADIUS, FONT_FAMILY, SHADOW } from '../theme/tokens';
import { useTheme } from '../contexts/ThemeContext';
import { useCoreData } from '../contexts/domains/CoreDataContext';
import TermsScreen from './TermsScreen';

const GUARANTEES = [
  {
    icon: 'shield-checkmark-outline' as const,
    title: '100% Local-First',
    desc: 'Works offline with instant startup and encrypted storage',
    colorDark: '#5EDA9E',
    colorLight: '#059669',
    bgDark: 'rgba(94,218,158,0.12)',
    bgLight: 'rgba(5,150,105,0.08)',
    borderDark: 'rgba(94,218,158,0.22)',
    borderLight: 'rgba(5,150,105,0.16)',
  },
  {
    icon: 'eye-off-outline' as const,
    title: 'Zero Telemetry',
    desc: 'Zero ad tracking, zero telemetry, your logs are private',
    colorDark: '#A599FF',
    colorLight: '#6C5CE7',
    bgDark: 'rgba(165,153,255,0.12)',
    bgLight: 'rgba(108,92,231,0.08)',
    borderDark: 'rgba(165,153,255,0.22)',
    borderLight: 'rgba(108,92,231,0.16)',
  },
  {
    icon: 'cloud-done-outline' as const,
    title: 'Seamless Sync',
    desc: 'Automatic backup across all your devices seamlessly',
    colorDark: '#38BDF8',
    colorLight: '#0284C7',
    bgDark: 'rgba(56,189,248,0.12)',
    bgLight: 'rgba(2,132,199,0.08)',
    borderDark: 'rgba(56,189,248,0.22)',
    borderLight: 'rgba(2,132,199,0.16)',
  },
];

const HORIZONTAL_MARGIN = 20;

interface AuthScreenProps {
  onBack?: () => void;
}

export default function AuthScreen({ onBack }: AuthScreenProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const { performGoogleSignIn, continueAsGuest } = useCoreData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTerms, setShowTerms] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const skipBtnScale = useRef(new Animated.Value(1)).current;

  useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_600SemiBold_Italic,
  });

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSignIn = async () => {
    hapticLight();
    setError('');
    setLoading(true);
    try {
      const result = await performGoogleSignIn();
      if (!result.success && !result.cancelled) {
        setError(result.error || 'Google sign-in was blocked or misconfigured.');
      }
    } catch (e: any) {
      console.warn('[AuthScreen] Sign-in error:', e);
      setError(e?.message || 'An unexpected error occurred during Google sign-in.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipNow = async () => {
    hapticMedium();
    setError('');
    setLoading(true);
    try {
      await continueAsGuest();
    } catch (e: any) {
      setError('Could not skip sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pressIn = () => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true, tension: 100, friction: 8 }).start();
  const pressOut = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }).start();

  const skipPressIn = () => Animated.spring(skipBtnScale, { toValue: 0.97, useNativeDriver: true, tension: 100, friction: 8 }).start();
  const skipPressOut = () => Animated.spring(skipBtnScale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }).start();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Subtle Ambient Cosmic Violet Aura */}
      <LinearGradient
        colors={isDark ? ['rgba(165,153,255,0.07)', 'rgba(0,0,0,0)'] : ['rgba(108,92,231,0.05)', 'rgba(255,255,255,0)']}
        style={StyleSheet.absoluteFillObject}
        locations={[0, 0.45]}
        pointerEvents="none"
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        {/* ── Top Header (Matching Step 02 in ZenTrack) ─────────── */}
        <View style={styles.topHeader}>
          {onBack ? (
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                onBack();
              }}
              style={styles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
              <Text style={[styles.brand, { color: colors.textPrimary, marginLeft: 6 }]}>ZENFIT</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.brand, { color: colors.textPrimary }]}>ZENFIT</Text>
          )}
          <Text style={[styles.step, { color: colors.textMuted }]}>02 / sign in</Text>
        </View>

        {/* ── Main Editorial Hero Block ───────────────────────────────── */}
        <View style={styles.mainBlock}>
          <View style={styles.heroTextContainer}>
            <Text style={[styles.heroTitleItalic, { color: colors.accentPrimary }]}>Let's get you</Text>
            <Text style={[styles.heroTitleBold, { color: colors.textPrimary }]}>set up.</Text>
          </View>

          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            Connect your account to enable encrypted cross-device continuity, offline persistence, and seamless sync.
          </Text>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.error} style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Clean Apple-Style Feature Highlight Card */}
          <View
            style={[
              styles.specCard,
              {
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                backgroundColor: isDark ? '#10121A' : '#FFFFFF',
              },
            ]}
          >
            {GUARANTEES.map((item, index) => {
              const iconColor = isDark ? item.colorDark : item.colorLight;
              const iconBg = isDark ? item.bgDark : item.bgLight;

              return (
                <View key={item.title}>
                  <View style={styles.specRow}>
                    <View style={[styles.specIconBox, { backgroundColor: iconBg, borderColor: isDark ? item.borderDark : item.borderLight }]}>
                      <Ionicons name={item.icon} size={18} color={iconColor} />
                    </View>
                    <View style={styles.specTextCol}>
                      <Text style={[styles.specLabel, { color: colors.textPrimary }]}>{item.title}</Text>
                      <Text style={[styles.specValue, { color: colors.textSecondary }]}>{item.desc}</Text>
                    </View>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={iconColor}
                      style={styles.checkIcon}
                    />
                  </View>
                  {index < GUARANTEES.length - 1 && (
                    <View
                      style={[
                        styles.specDivider,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Bottom Actions (Matching ZenTrack Primary Layout) ──── */}
        <View style={styles.bottomBlock}>
          
          {/* Primary Google Auth Button */}
          <TouchableOpacity
            onPressIn={pressIn}
            onPressOut={pressOut}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.9}
            style={styles.btnContainer}
          >
            <Animated.View style={[
              styles.googleBtn,
              {
                backgroundColor: isDark ? '#FFFFFF' : '#0A0A0E',
                borderColor: isDark ? '#FFFFFF' : '#0A0A0E',
                transform: [{ scale: btnScale }]
              },
              loading && { opacity: 0.6 }
            ]}>
              {loading ? (
                <ActivityIndicator color={isDark ? '#0A0A0E' : '#FFFFFF'} />
              ) : (
                <View style={styles.btnInnerRow}>
                  <Ionicons name="logo-google" size={17} color={isDark ? '#0A0A0E' : '#FFFFFF'} style={{ marginRight: 8 }} />
                  <Text style={[styles.googleBtnText, { color: isDark ? '#0A0A0E' : '#FFFFFF' }]}>Continue with Google</Text>
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>

          {/* Apple Sign-In (iOS only) */}
          {Platform.OS === 'ios' && AppleAuthentication && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={isDark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={22}
              style={styles.appleBtn}
              onPress={async () => {
                setError('');
                setLoading(true);
                try {
                  const appleCredential = await AppleAuthentication.signInAsync({
                    requestedScopes: [
                      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                      AppleAuthentication.AppleAuthenticationScope.EMAIL,
                    ],
                  });
                  if (!appleCredential.identityToken) {
                    setError('Apple Sign-In did not return an identity token.');
                    setLoading(false);
                    return;
                  }
                  const provider = new OAuthProvider('apple.com');
                  const oauthCredential = provider.credential({
                    idToken: appleCredential.identityToken,
                  });
                  await signInWithCredential(auth, oauthCredential);
                } catch (e: any) {
                  if (e?.code !== 'ERR_REQUEST_CANCELED') {
                    setError('Apple sign-in failed. Please try again.');
                  }
                  setLoading(false);
                }
              }}
            />
          )}

          {/* Skip for Now Button */}
          <TouchableOpacity
            onPressIn={skipPressIn}
            onPressOut={skipPressOut}
            style={styles.skipBtnContainer}
            onPress={handleSkipNow}
            disabled={loading}
            activeOpacity={0.88}
          >
            <Animated.View
              style={[
                styles.skipBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.08)',
                  transform: [{ scale: skipBtnScale }],
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <View style={styles.skipBtnInner}>
                  <Text style={[styles.skipBtnText, { color: colors.textPrimary }]}>
                    Skip for now
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={colors.textSecondary}
                    style={{ marginLeft: 6 }}
                  />
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>

          {/* Terms & Privacy Footnote */}
          <Text style={[styles.legalText, { color: colors.textMuted }]}>
            By continuing, you agree to our{' '}
            <Text style={[styles.linkText, { color: colors.textPrimary }]} onPress={() => setShowTerms(true)}>
              Terms of Service & Privacy Policy
            </Text>
          </Text>

        </View>

      </Animated.View>

      <TermsScreen visible={showTerms} onClose={() => setShowTerms(false)} />
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean = true) => StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: HORIZONTAL_MARGIN,
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 20,
  },
  topHeader: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brand: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    letterSpacing: 2,
  },
  step: {
    fontFamily: FONT_FAMILY.body,
    fontSize: 11,
    letterSpacing: 1,
  },
  mainBlock: {
    justifyContent: 'center',
    marginVertical: 4,
  },
  heroTextContainer: {
    marginBottom: 6,
    overflow: 'visible',
  },
  heroTitleItalic: {
    fontFamily: 'PlayfairDisplay_600SemiBold_Italic',
    fontSize: 44,
    lineHeight: 52,
  },
  heroTitleBold: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  sub: {
    fontFamily: FONT_FAMILY.body,
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 20,
    opacity: 0.85,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderColor: 'rgba(255, 69, 58, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#ff6961',
    flex: 1,
  },
  specCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    ...SHADOW.sm,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  specIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 14,
  },
  specTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  specLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    marginBottom: 2,
  },
  specValue: {
    fontFamily: FONT_FAMILY.body,
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.8,
  },
  checkIcon: {
    marginLeft: 8,
  },
  specDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  bottomBlock: {
    width: '100%',
    alignItems: 'center',
  },
  btnContainer: {
    width: '100%',
    marginBottom: 10,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    height: 52,
    width: '100%',
    borderWidth: 1,
    ...SHADOW.sm,
  },
  btnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  appleBtn: {
    width: '100%',
    height: 50,
    marginBottom: 10,
  },
  skipBtnContainer: {
    width: '100%',
    marginBottom: 14,
  },
  skipBtn: {
    height: 48,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 14,
  },
  legalText: {
    fontFamily: FONT_FAMILY.body,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    opacity: 0.7,
  },
  linkText: {
    fontFamily: FONT_FAMILY.bold,
    textDecorationLine: 'underline',
  },
});
