import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X, ShieldCheck, FileText, Lock, Sparkles, Dumbbell,
  AlertTriangle, Code2, Shield, WifiOff, AlertCircle, Mail,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticLight } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../theme/tokens';
import BottomSheet from '../components/ui/BottomSheet';
import { TactileButton } from '../components/ui';

interface TermsScreenProps {
  visible: boolean;
  onClose: () => void;
}

export default function TermsScreen({ visible, onClose }: TermsScreenProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  const handleClose = () => {
    hapticLight();
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      fullHeight={true}
      noPadding={true}
      sheetBackgroundColor={tokens.bg.canvas}
    >
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        {/* ── Top Header Bar ────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 0, paddingRight: SPACE.sm }}>
            <Text style={styles.headerTitle} numberOfLines={2}>Terms of Service & Privacy</Text>
            <Text style={styles.headerSubtitle}>ZenFit · Version 1.0.0</Text>
          </View>
          <TactileButton
            variant="custom"
            onPress={handleClose}
            style={styles.closeBtn}
            accessibilityLabel="Close terms of service"
          >
            <X size={ICON.md} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
          </TactileButton>
        </View>

        {/* ── Scrollable Legal Body ─────────────────────────────────── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled
        >
          {/* Metadata Badge Row */}
          <View style={styles.metaRow}>
            <View style={styles.badgePill}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgePillText}>LEGAL AGREEMENT</Text>
            </View>
            <Text style={styles.lastUpdated}>EFFECTIVE: AUGUST 2026</Text>
          </View>

          {/* Privacy Pledge Hero Card */}
          <View style={styles.calloutBox}>
            <View style={styles.calloutIconBox}>
              <ShieldCheck size={ICON.md} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.calloutTitle}>Our Core Privacy Pledge</Text>
              <Text style={styles.calloutBody}>
                ZenFit is built on a <Text style={styles.boldText}>100% Local-First Architecture</Text>. Your gym workouts, training logs, body metrics, and personal athletic plans belong strictly to you. We do not sell your personal telemetry or monetize your training routines.
              </Text>
            </View>
          </View>

          {/* ── SECTION 1 ──────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <FileText size={ICON.sm} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
              </View>
              <Text style={styles.sectionTitle}>1. Agreement to Terms</Text>
            </View>
            <Text style={styles.paragraph}>
              These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "you", or "your") and ZenFit Inc. ("ZenFit", "we", "us", or "our"), governing your access to and use of the ZenFit mobile application, website, services, and associated offline tools (collectively, the "Platform").
            </Text>
            <Text style={styles.paragraph}>
              By downloading, installing, accessing, or using the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms in their entirety, you must immediately cease using and uninstall the Platform.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.boldText}>1.1 Eligibility:</Text> You must be at least 13 years of age (or the applicable age of digital consent in your jurisdiction) to use ZenFit. If you are under 18, you represent that you have reviewed these Terms with your parent or legal guardian.
            </Text>
          </View>

          {/* ── SECTION 2 ──────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <Lock size={ICON.sm} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
              </View>
              <Text style={styles.sectionTitle}>2. Account Registration & Data Security</Text>
            </View>
            <Text style={styles.paragraph}>
              ZenFit supports multiple authentication models, including Google Sign-In, Apple Authentication, and Anonymous Demo mode. You agree to provide accurate authentication credentials and maintain the confidentiality of your active session.
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>Device-Level Encryption:</Text> Private notes stored in the ZenFit Vault are encrypted locally using AES-256 standards before touching local SQLite / AsyncStorage repositories.</Text>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>Account Safeguards:</Text> You are solely responsible for maintaining the physical security of your biometric authentication (FaceID / Fingerprint) and PIN lock on your device.</Text>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>Breach Notification:</Text> In the improbable event of a synchronized cloud breach, ZenFit will notify affected users within 72 hours in compliance with global security regulations.</Text>
            </View>
          </View>

          {/* ── SECTION 3 ──────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <Sparkles size={ICON.sm} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
              </View>
              <Text style={styles.sectionTitle}>3. AI Exercise Intelligence & Coaching</Text>
            </View>
            <Text style={styles.paragraph}>
              ZenFit utilizes generative machine learning and biomechanical intelligence models to analyze workout volume, suggest exercise variations, compute progressive overload recommendations, and generate athletic routines.
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>AI Non-Reliance:</Text> AI workout suggestions are for general athletic guidance only and do not replace personalized coaching from licensed professionals.</Text>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>Telemetry Safety:</Text> Your biometric data and workout metrics are processed locally or through secure tokenized gateways without permanent server retention.</Text>
            </View>
          </View>

          {/* ── SECTION 4 ──────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <Dumbbell size={ICON.sm} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
              </View>
              <Text style={styles.sectionTitle}>4. Fitness, Gym & Wellness Disclaimer</Text>
            </View>
            <Text style={styles.paragraph}>
              The gym workout tracker, 1RM calculators, progressive overload matrices, hydration meters, and recovery suggestions provided by ZenFit are for educational and personal athletic organization purposes only.
            </Text>
            <View style={styles.warningBox}>
              <AlertTriangle size={18} color={tokens.status.warning} strokeWidth={ICON.strokeWidth} style={{ marginRight: SPACE[12], marginTop: 1 }} />
              <Text style={styles.warningText}>
                Consult a qualified physician or certified personal trainer before attempting high-intensity weight training or dietary changes. You assume 100% of physical risks associated with exercise routines logged in ZenFit.
              </Text>
            </View>
          </View>

          {/* ── SECTION 5 ──────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <Code2 size={ICON.sm} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
              </View>
              <Text style={styles.sectionTitle}>5. Intellectual Property & Ownership</Text>
            </View>
            <Text style={styles.paragraph}>
              <Text style={styles.boldText}>5.1 Your Content:</Text> You retain complete, unencumbered ownership of all data, tasks, notes, habits, routines, and telemetry generated by your account on the Platform. ZenFit claims no intellectual property rights over your personal life logs.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.boldText}>5.2 ZenFit IP:</Text> The ZenFit name, brand mark, visual design tokens, custom user interface components, sound design, animations, backend API algorithms, and proprietary machine learning orchestration engines are the exclusive property of ZenFit Inc. and are protected by international copyright and trademark laws.
            </Text>
          </View>

          {/* ── SECTION 6 ──────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <Shield size={ICON.sm} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
              </View>
              <Text style={styles.sectionTitle}>6. Prohibited Uses & Community Conduct</Text>
            </View>
            <Text style={styles.paragraph}>You expressly agree not to:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Reverse engineer, decompile, disassemble, or derive source code from any portion of the ZenFit binary or web bundle.</Text>
              <Text style={styles.bulletItem}>• Deploy automated scrapers, bots, crawlers, or high-frequency API flooders against ZenFit cloud services.</Text>
              <Text style={styles.bulletItem}>• Circumvent authentication barriers, tamper with encryption headers, or forge token payloads.</Text>
              <Text style={styles.bulletItem}>• Use ZenFit to coordinate unlawful, hazardous, or malicious physical activities.</Text>
            </View>
          </View>

          {/* ── SECTION 7 ──────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <WifiOff size={ICON.sm} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
              </View>
              <Text style={styles.sectionTitle}>7. Service Availability & Modifications</Text>
            </View>
            <Text style={styles.paragraph}>
              ZenFit is provided on an "AS IS" and "AS AVAILABLE" basis. While our local-first offline architecture allows full platform operation without an active internet connection, cloud backup synchronization and AI transcription services require network connectivity.
            </Text>
            <Text style={styles.paragraph}>
              We reserve the right to deploy updates, alter module configurations, or modify API endpoints at our discretion to enhance system performance, security, and user experience.
            </Text>
          </View>

          {/* ── SECTION 8 ──────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <AlertCircle size={ICON.sm} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
              </View>
              <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
            </View>
            <Text style={styles.paragraph}>
              To the maximum extent permitted by applicable law, in no event shall ZenFit Inc., its officers, directors, employees, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data corruption, academic penalties, hardware malfunctions, or personal injury resulting from your use of or inability to use the Platform.
            </Text>
          </View>

          {/* ── SECTION 9 ─────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <Mail size={ICON.sm} color={tokens.accent.primary} strokeWidth={ICON.strokeWidth} />
              </View>
              <Text style={styles.sectionTitle}>9. Contact Information & Inquiries</Text>
            </View>
            <Text style={styles.paragraph}>
              If you have questions regarding these Terms, privacy practices, data deletion requests under GDPR/CCPA, or security reports, please reach out to our legal team:
            </Text>
            <View style={styles.contactCard}>
              <Text style={styles.contactItem}><Text style={styles.boldText}>Support:</Text> support@zenfit.app</Text>
              <Text style={styles.contactItem}><Text style={styles.boldText}>Privacy:</Text> privacy@zenfit.app</Text>
            </View>
          </View>

          {/* Bottom Acknowledgment Action */}
          <View style={styles.bottomActionBlock}>
            <TactileButton
              variant="primary"
              size="lg"
              style={styles.agreeBtn}
              onPress={handleClose}
              haptic="medium"
            >
              <Text style={styles.agreeBtnText}>I Understand & Agree</Text>
            </TactileButton>
          </View>

          <View style={{ height: SPACE[32] }} />
        </ScrollView>

        {/* Bottom Fade Gradient */}
        <LinearGradient
          colors={['transparent', tokens.bg.canvas]}
          style={styles.bottomGradient}
          pointerEvents="none"
        />
      </View>
    </BottomSheet>
  );
}

const makeStyles = (tokens: ThemeTokens) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.bg.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE[16],
    paddingTop: SPACE[8],
    paddingBottom: SPACE[12],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.border.subtle,
    backgroundColor: tokens.bg.canvas,
    zIndex: 10,
  },
  headerTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 17,
    color: tokens.text.primary,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontFamily: FONT_FAMILY.body,
    fontSize: 11,
    color: tokens.text.muted,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.inner,
    backgroundColor: tokens.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: SPACE[16],
    paddingTop: SPACE[16],
    paddingBottom: 80,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE[16],
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.accent.primaryDim,
    paddingHorizontal: SPACE[10],
    paddingVertical: SPACE[4],
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: tokens.border.focus,
    gap: SPACE[8],
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: tokens.accent.primary,
  },
  badgePillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    color: tokens.accent.primary,
    letterSpacing: 0.8,
  },
  lastUpdated: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    color: tokens.text.muted,
    letterSpacing: 0.8,
  },
  calloutBox: {
    flexDirection: 'row',
    backgroundColor: tokens.accent.primaryDim,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: tokens.border.focus,
    padding: SPACE[16],
    marginBottom: SPACE[24],
    gap: SPACE[12],
  },
  calloutIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.inner,
    backgroundColor: tokens.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  calloutTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: tokens.text.primary,
    marginBottom: SPACE[4],
  },
  calloutBody: {
    fontFamily: FONT_FAMILY.body,
    fontSize: 12.5,
    color: tokens.text.secondary,
    lineHeight: 18.5,
  },
  section: {
    marginBottom: SPACE[24],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACE[8],
    gap: SPACE[12],
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    backgroundColor: tokens.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: tokens.text.primary,
    letterSpacing: -0.1,
  },
  paragraph: {
    fontFamily: FONT_FAMILY.body,
    fontSize: 13,
    color: tokens.text.secondary,
    lineHeight: 20,
    marginBottom: SPACE[8],
  },
  boldText: {
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  bulletList: {
    marginTop: SPACE[4],
    gap: SPACE[8],
  },
  bulletItem: {
    fontFamily: FONT_FAMILY.body,
    fontSize: 12.5,
    color: tokens.text.secondary,
    lineHeight: 19,
    paddingLeft: SPACE[4],
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: tokens.status.warningDim,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: tokens.status.warning,
    padding: SPACE[12],
    marginTop: SPACE[8],
  },
  warningText: {
    fontFamily: FONT_FAMILY.body,
    fontSize: 12,
    color: tokens.status.warning,
    lineHeight: 18,
    flex: 1,
  },
  contactCard: {
    backgroundColor: tokens.bg.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    padding: SPACE[12],
    marginTop: SPACE[8],
    gap: SPACE[8],
  },
  contactItem: {
    fontFamily: FONT_FAMILY.body,
    fontSize: 12.5,
    color: tokens.text.secondary,
  },
  bottomActionBlock: {
    marginTop: SPACE[16],
    alignItems: 'center',
  },
  agreeBtn: {
    width: '100%',
    minHeight: 54,
  },
  agreeBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    color: tokens.accent.onPrimary,
    letterSpacing: 0.2,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
});

