import React, { useId, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { CheckCircle2, User } from 'lucide-react-native';
import { TactileButton } from '../../../components/ui';
import { STATIC_BODY_SVG } from '../../../components/Gym/metrics/muscleMapSvgCache';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONT_FAMILY, ICON, SPACE, ThemeTokens } from '../../../theme/tokens';

interface IdentityStepProps {
  athleteName: string;
  onChangeName: (name: string) => void;
  gender: 'male' | 'female';
  onSelectGender: (g: 'male' | 'female') => void;
  signedInEmail?: string | null;
}

const HIGHLIGHT_SLUGS = new Set(['chest', 'deltoids', 'abs', 'quadriceps', 'biceps']);

const SilhouetteCard = React.memo(function SilhouetteCard({
  variant,
  selected,
  onPress,
  tokens,
  isDark,
}: {
  variant: 'male' | 'female';
  selected: boolean;
  onPress: () => void;
  tokens: ThemeTokens;
  isDark: boolean;
}) {
  const uid = useId().replace(/:/g, '_');
  const haloId = `idHalo_${variant}_${uid}`;
  const frontView = STATIC_BODY_SVG[variant].front;
  const inactiveMuscle = tokens.isDark ? 'rgba(255,255,255,0.17)' : 'rgba(9,9,11,0.13)';
  const inertFill = selected
    ? tokens.isDark
      ? 'rgba(10, 132, 255, 0.25)'
      : 'rgba(10, 132, 255, 0.18)'
    : tokens.isDark
    ? 'rgba(255, 255, 255, 0.11)'
    : 'rgba(9, 9, 11, 0.09)';

  const activeMuscle = tokens.accent.primary;
  const strokeCol = isDark ? '#0F1015' : tokens.bg.surface;

  return (
    <TactileButton
      variant="custom"
      haptic="selection"
      onPress={onPress}
      style={[
        cardStyles.genderCard,
        {
          backgroundColor: selected
            ? tokens.accent.primaryDim
            : isDark
            ? '#0F1015'
            : tokens.bg.surface,
          borderColor: selected
            ? tokens.accent.primary
            : isDark
            ? 'rgba(255,255,255,0.10)'
            : tokens.border.subtle,
        },
      ]}
    >
      <View style={cardStyles.svgWrap}>
        {selected ? (
          <Svg width={120} height={152} viewBox="0 0 120 152" style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id={haloId} cx="50%" cy="48%" rx="48%" ry="48%">
                <Stop offset="0%" stopColor={tokens.accent.primary} stopOpacity={isDark ? 0.24 : 0.12} />
                <Stop offset="100%" stopColor={tokens.accent.primary} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={60} cy={74} r={56} fill={`url(#${haloId})`} />
          </Svg>
        ) : null}

        <Svg viewBox={frontView.vb} width={88} height={148}>
          <G>
            <Path d={frontView.inertD} fill={inertFill} />
            {frontView.slugs.map((slug) => {
              const d = frontView.paths[slug];
              if (!d) return null;
              const lit = selected && HIGHLIGHT_SLUGS.has(slug);
              return (
                <Path
                  key={`${variant}-${slug}`}
                  d={d}
                  fill={lit ? activeMuscle : inactiveMuscle}
                  stroke={strokeCol}
                  strokeWidth={1.2}
                />
              );
            })}
          </G>
        </Svg>
      </View>

      <View style={cardStyles.labelRow}>
        <Text
          style={[
            cardStyles.labelText,
            { color: selected ? tokens.accent.primary : tokens.text.primary },
          ]}
        >
          {variant === 'male' ? 'Male' : 'Female'}
        </Text>
        {selected ? (
          <CheckCircle2 size={16} strokeWidth={2.2} color={tokens.accent.primary} />
        ) : null}
      </View>
      <Text style={[cardStyles.subTag, { color: tokens.text.muted }]}>
        18 Muscle Zones
      </Text>
    </TactileButton>
  );
});

export const IdentityStep: React.FC<IdentityStepProps> = React.memo(
  function IdentityStep({
    athleteName,
    onChangeName,
    gender,
    onSelectGender,
    signedInEmail,
  }) {
    const { tokens, isDark } = useTheme();
    const styles = useMemo(() => makeStyles(tokens, isDark), [tokens, isDark]);

    return (
      <View style={styles.root}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Set your baseline</Text>
          <Text style={styles.subtitle}>
            Personalizes your anatomical recovery map and strength standards.
          </Text>
          {signedInEmail ? (
            <View style={styles.signedInPill}>
              <CheckCircle2 size={12} strokeWidth={2.2} color={tokens.status.success} />
              <Text style={styles.signedInText} numberOfLines={1}>
                Signed in as {signedInEmail}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.bodyGroup}>
          <Text style={styles.fieldLabel}>ATHLETE NAME</Text>
          <View style={styles.inputWrap}>
            <User size={ICON.sm + 1} strokeWidth={ICON.strokeWidth} color={tokens.text.secondary} />
            <TextInput
              style={styles.textInput}
              value={athleteName}
              onChangeText={onChangeName}
              placeholder="First name (optional)"
              placeholderTextColor={tokens.text.muted}
              autoCapitalize="words"
              maxLength={28}
              returnKeyType="done"
            />
          </View>

          <Text style={styles.fieldLabel}>ANATOMY PROFILE</Text>
          <View style={styles.genderRow}>
            <SilhouetteCard
              variant="male"
              selected={gender === 'male'}
              onPress={() => onSelectGender('male')}
              tokens={tokens}
              isDark={isDark}
            />
            <SilhouetteCard
              variant="female"
              selected={gender === 'female'}
              onPress={() => onSelectGender('female')}
              tokens={tokens}
              isDark={isDark}
            />
          </View>
        </View>
      </View>
    );
  }
);

const cardStyles = StyleSheet.create({
  genderCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.md,
    paddingHorizontal: SPACE.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 222,
  },
  svgWrap: {
    width: 120,
    height: 152,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.xs + 2,
    position: 'relative',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  labelText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    includeFontPadding: false,
  },
  subTag: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    marginTop: 3,
    includeFontPadding: false,
  },
});

const makeStyles = (tokens: ThemeTokens, isDark: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      paddingTop: SPACE.xs,
    },
    headerBlock: {
      marginBottom: SPACE.md,
    },
    bodyGroup: {
      justifyContent: 'flex-start',
      paddingTop: SPACE.xs,
      paddingBottom: SPACE.sm,
    },
    title: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 27,
      letterSpacing: -0.65,
      color: tokens.text.primary,
      marginBottom: 5,
      includeFontPadding: false,
    },
    subtitle: {
      fontFamily: FONT_FAMILY.regular,
      fontSize: 14.5,
      lineHeight: 20,
      color: tokens.text.secondary,
    },
    signedInPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      marginTop: SPACE.sm,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: tokens.status.successDim,
    },
    signedInText: {
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 12,
      color: tokens.status.success,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 50,
      paddingHorizontal: 14,
      borderRadius: 15,
      backgroundColor: isDark ? '#0F1015' : tokens.bg.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : tokens.border.subtle,
      marginBottom: SPACE.lg,
    },
    textInput: {
      flex: 1,
      fontFamily: FONT_FAMILY.semibold,
      fontSize: 15.5,
      color: tokens.text.primary,
      paddingVertical: 0,
    },
    fieldLabel: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 11,
      letterSpacing: 0.9,
      color: tokens.text.muted,
      marginBottom: SPACE.sm,
      includeFontPadding: false,
    },
    genderRow: {
      flexDirection: 'row',
      gap: SPACE.md,
    },
  });
