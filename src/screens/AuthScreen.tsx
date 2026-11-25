import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet,
  Platform, ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import {
  ShieldCheck,
  EyeOff,
  Cloud,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenWrapper, TactileButton } from '../components/ui';
let AppleAuthentication: any = null;
try {
  AppleAuthentication = require('expo-apple-authentication');
} catch (_) {}
import { OAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../services/firebase';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { RADIUS, FONT_FAMILY, SHADOW, ICON } from '../theme/tokens';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsiveMetrics } from '../theme/responsive';
import { useCoreData } from '../contexts/domains/CoreDataContext';
import TermsScreen from './TermsScreen';

const GUARANTEES = [
  {
    icon: ShieldCheck,
    title: '100% Local-First',
    desc: 'Works offline with instant startup and encrypted storage',
    tone: 'success' as const,
  },
  {
    icon: EyeOff,
    title: 'Zero Telemetry',
    desc: 'Zero ad tracking, zero telemetry, your logs are private',
    tone: 'primary' as const,
  },
  {
    icon: Cloud,
    title: 'Seamless Sync',
    desc: 'Automatic backup across all your devices seamlessly',
    tone: 'info' as const,
  },
];

const HORIZONTAL_MARGIN = 20;

interface AuthScreenProps {
  onBack?: () => void;
}

export default function AuthScreen({ onBack }: AuthScreenProps) {
  const { colors, isDark, tokens } = useTheme();
  const { isCompactH, isNarrow, maxContentWidth } = useResponsiveMetrics();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const { performGoogleSignIn, completeExternalSignIn, continueAsGuest } = useCoreData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTerms, setShowTerms] = useState(false);

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

  return (
    <ScreenWrapper edges={['top', 'bottom', 'left', 'right']} keyboardAvoiding={false}>
      {/* Subtle Ambient Aura */}
      <LinearGradient
        colors={tokens.gradients.canvasGlow}
        style={StyleSheet.absoluteFillObject}
        locations={[0, 0.35, 1]}
        pointerEvents="none"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'space-between',
          maxWidth: maxContentWidth,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <Animated.View entering={FadeInDown.duration(360)} style={styles.content}>

          {/* Top Header */}
          <View style={styles.topHeader}>
            {onBack ? (
              <TactileButton
                variant="ghost"
                onPress={onBack}
                style={styles.backBtn}
                hitSlop={tokens.touch.hitSlop}
              >
                <ArrowLeft size={18} strokeWidth={ICON.strokeWidth} color={colors.textPrimary} />
                <Text style={[styles.brand, { color: colors.textPrimary, marginLeft: 6 }]}>ZENFIT</Text>
              </TactileButton>
            ) : (
              <Text style={[styles.brand, { color: colors.textPrimary }]}>ZENFIT</Text>
            )}
            <Text style={[styles.step, { color: colors.textMuted }]}>02 / sign in</Text>
          </View>

          {/* ── Main Editorial Hero Block ───────────────────────────────── */}
          <View style={styles.mainBlock}>
            <View style={styles.heroTextContainer}>
              <Text
                style={[
                  styles.heroTitleItalic,
                  {
                    color: colors.accentPrimary,
                    fontSize: isCompactH || isNarrow ? 34 : 44,
                    lineHeight: isCompactH || isNarrow ? 40 : 52,
                  },
                ]}
              >
                Let's get you
              </Text>
              <Text
                style={[
                  styles.heroTitleBold,
                  {
                    color: colors.textPrimary,
                    fontSize: isCompactH || isNarrow ? 27 : 34,
                    lineHeight: isCompactH || isNarrow ? 31 : 38,
                  },
                ]}
              >
                set up.
              </Text>
            </View>

          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            Connect your account to enable encrypted cross-device continuity, offline persistence, and seamless sync.
          </Text>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBox}>
              <AlertCircle size={16} strokeWidth={ICON.strokeWidth} color={colors.error} style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Clean OLED Feature Highlight Card */}
          <View
            style={[
              styles.specCard,
              {
                borderColor: tokens.border.subtle,
                backgroundColor: tokens.bg.surface,
              },
            ]}
          >
            {GUARANTEES.map((item, index) => {
              const IconComp = item.icon;
              const iconColor =
                item.tone === 'success'
                  ? tokens.status.success
                  : item.tone === 'info'
                  ? tokens.status.info
                  : tokens.accent.primary;
              const iconBg =
                item.tone === 'success'
                  ? tokens.status.successDim
                  : item.tone === 'info'
                  ? tokens.status.infoDim
                  : tokens.accent.primaryDim;

              return (
                <View key={item.title}>
                  <View style={styles.specRow}>
                    <View style={[styles.specIconBox, { backgroundColor: iconBg, borderColor: tokens.border.subtle }]}>
                      <IconComp size={18} strokeWidth={ICON.strokeWidth} color={iconColor} />
                    </View>
                    <View style={styles.specTextCol}>
                      <Text style={[styles.specLabel, { color: colors.textPrimary }]}>{item.title}</Text>
                      <Text style={[styles.specValue, { color: colors.textSecondary }]}>{item.desc}</Text>
                    </View>
                    <CheckCircle2
                      size={18}
                      strokeWidth={ICON.strokeWidth}
                      color={iconColor}
                      style={styles.checkIcon}
                    />
                  </View>
                  {index < GUARANTEES.length - 1 && (
                    <View
                      style={[
                        styles.specDivider,
                        { backgroundColor: tokens.border.subtle },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomBlock}>
          <TactileButton
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleSignIn}
            style={styles.btnContainer}
          >
            <View style={styles.btnInnerRow}>
              <Svg width={16} height={16} viewBox="0 0 24 24" style={{ marginRight: 8 }}>
                <Path
                  fill={tokens.accent.onPrimary}
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                />
              </Svg>
              <Text style={[styles.googleBtnText, { color: tokens.accent.onPrimary }]}>Continue with Google</Text>
            </View>
          </TactileButton>

          {/* Apple Sign-In (iOS only) */}
          {Platform.OS === 'ios' && AppleAuthentication && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={isDark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
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
                  const userCred = await signInWithCredential(auth, oauthCredential);
                  if (userCred.user) {
                    await completeExternalSignIn(userCred.user);
                  }
                  setLoading(false);
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
          <TactileButton
            variant="secondary"
            size="lg"
            haptic="medium"
            loading={loading}
            style={styles.skipBtnContainer}
            onPress={handleSkipNow}
          >
            <View style={styles.skipBtnInner}>
              <Text style={[styles.skipBtnText, { color: colors.textPrimary }]}>
                Skip for now
              </Text>
              <ArrowRight
                size={14}
                strokeWidth={ICON.strokeWidth}
                color={colors.textSecondary}
                style={{ marginLeft: 6 }}
              />
            </View>
          </TactileButton>

          {/* Terms & Privacy Footnote */}
          <Text style={[styles.legalText, { color: colors.textMuted }]}>
            By continuing, you agree to our{' '}
            <Text style={[styles.linkText, { color: colors.textPrimary }]} onPress={() => setShowTerms(true)}>
              Terms of Service & Privacy Policy
            </Text>
          </Text>

        </View>

        </Animated.View>
      </ScrollView>

      <TermsScreen visible={showTerms} onClose={() => setShowTerms(false)} />
    </ScreenWrapper>
  );
}

const makeStyles = (colors: any, isDark: boolean = true) => StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: HORIZONTAL_MARGIN,
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 20,
    gap: 16,
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
    color: colors.error,
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
