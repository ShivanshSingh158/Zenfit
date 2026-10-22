import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '../contexts/ThemeContext';
import { useCoreData } from '../contexts/domains/CoreDataContext';
import { FONT_FAMILY, RADIUS } from '../theme/tokens';
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/haptics';

const GUARANTEES = [
  {
    icon: 'shield-checkmark-outline' as const,
    title: '100% Local-First',
    desc: 'Encrypted on-device storage with instant offline startup',
    color: '#5EDA9E',
    bg: 'rgba(94, 218, 158, 0.1)',
  },
  {
    icon: 'cloud-done-outline' as const,
    title: 'Seamless Google Sync',
    desc: 'Sync workouts, PRs, bodyweight & splits across devices',
    color: '#A599FF',
    bg: 'rgba(165, 153, 255, 0.1)',
  },
  {
    icon: 'eye-off-outline' as const,
    title: 'Zero Tracking',
    desc: 'Private athlete telemetry with zero third-party ads',
    color: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.1)',
  },
];

export default function AuthScreen() {
  const { colors, isDark } = useTheme();
  const { performGoogleSignIn, continueAsGuest } = useCoreData();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleGoogleSignIn = async () => {
    hapticMedium();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await performGoogleSignIn();
      if (!res.success) {
        if (!res.cancelled) {
          setErrorMessage(res.error || 'Google sign-in could not be completed.');
        }
      } else {
        hapticSuccess();
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to authenticate with Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    hapticLight();
    setErrorMessage('');
    setLoading(true);
    try {
      await continueAsGuest();
      hapticSuccess();
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#060509' : colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Brand & Hero */}
        <View style={styles.heroSection}>
          <View style={[styles.logoBadge, { backgroundColor: isDark ? 'rgba(165,153,255,0.15)' : 'rgba(108,92,231,0.1)' }]}>
            <Ionicons name="barbell" size={38} color="#A599FF" />
          </View>

          <Text style={[styles.brandTitle, { color: colors.textPrimary || '#ffffff' }]}>
            ZenFit
          </Text>
          <Text style={styles.brandSubtitle}>
            Precision Hypertrophy, Scientific Overload & Real-Time Sync
          </Text>
        </View>

        {/* Feature Cards */}
        <View style={styles.guaranteesContainer}>
          {GUARANTEES.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.guaranteeRow,
                {
                  backgroundColor: isDark ? '#111016' : '#ffffff',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
            >
              <View style={[styles.guaranteeIconBox, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.guaranteeTitle, { color: colors.textPrimary || '#ffffff' }]}>
                  {item.title}
                </Text>
                <Text style={styles.guaranteeDesc}>
                  {item.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Error Banner */}
        {!!errorMessage && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#FF6B6B" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleGoogleSignIn}
            disabled={loading}
            style={[
              styles.googleBtn,
              { backgroundColor: isDark ? '#ffffff' : '#1c1b22' },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={isDark ? '#000000' : '#ffffff'} size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color={isDark ? '#000000' : '#ffffff'} style={{ marginRight: 10 }} />
                <Text style={[styles.googleBtnText, { color: isDark ? '#000000' : '#ffffff' }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleGuest}
            disabled={loading}
            style={styles.guestBtn}
          >
            <Text style={styles.guestBtnText}>
              Continue as Guest Lifter (Offline)
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 24,
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(165, 153, 255, 0.3)',
  },
  brandTitle: {
    fontSize: 32,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#8e8e93',
    fontFamily: FONT_FAMILY.medium,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  guaranteesContainer: {
    gap: 10,
    marginVertical: 20,
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  guaranteeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guaranteeTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
  },
  guaranteeDesc: {
    fontSize: 11.5,
    color: '#8e8e93',
    fontFamily: FONT_FAMILY.medium,
    marginTop: 2,
    lineHeight: 15,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.25)',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#FF6B6B',
    fontFamily: FONT_FAMILY.medium,
  },
  actionSection: {
    gap: 12,
    paddingBottom: 10,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  googleBtnText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.2,
  },
  guestBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  guestBtnText: {
    fontSize: 13,
    color: '#8e8e93',
    fontFamily: FONT_FAMILY.bold,
  },
});
