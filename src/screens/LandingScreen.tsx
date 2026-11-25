import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  ScrollView, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import {
  Dumbbell, GitBranch, Activity, Timer, ShieldCheck, ArrowRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticLight, hapticSelection } from '../utils/haptics';
import Reanimated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { ScreenWrapper, TactileButton } from '../components/ui';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsiveMetrics } from '../theme/responsive';
import { FONT_FAMILY, ICON, RADIUS, SPACE, TOUCH, ThemeTokens } from '../theme/tokens';
import { useWeightUnit, unitLabel, kgToDisplay } from '../utils/weightUnit';

const HORIZONTAL_MARGIN = SPACE[16];
const CARD_SPACING = SPACE[12];

type PillarTone = 'primary' | 'success' | 'info' | 'warning' | 'secondary';

interface ModulePillar {
  id: string;
  category: string;
  iconKey: 'overload' | 'splits' | 'body' | 'timer' | 'offline';
  title: string;
  desc: string;
  preview: string;
  tone: PillarTone;
}

const MODULE_PILLARS: ModulePillar[] = [
  {
    id: 'overload',
    category: 'PROGRESSIVE OVERLOAD',
    iconKey: 'overload',
    title: 'Overload, tracked automatically.',
    desc: 'Dynamic targets, 1RM progression formulas, and auto-warmup suggestions calculated on every set.',
    preview: 'Bench Press · 85kg × 8 reps (+5kg Overload)',
    tone: 'primary',
  },
  {
    id: 'splits',
    category: 'SMART SPLITS',
    iconKey: 'splits',
    title: 'Switch routines with one tap.',
    desc: 'Seamlessly glide between Arnold, Push / Pull / Legs, and custom splits with in-workout smart swaps.',
    preview: 'Push Day · 6 Exercises · Arnold Split',
    tone: 'success',
  },
  {
    id: 'body',
    category: 'BODY HEATMAP',
    iconKey: 'body',
    title: 'Visual muscle recovery map.',
    desc: 'Full 12-muscle anatomical volume tracking with real-time fatigue and symmetry diagnostics.',
    preview: 'Chest: 18 Sets · Back: 16 Sets · Legs: 20 Sets',
    tone: 'info',
  },
  {
    id: 'timer',
    category: 'REST TIMER',
    iconKey: 'timer',
    title: 'Rest intervals that breathe.',
    desc: 'Floating countdown ring with automated warm-up ramp calculations and audio-haptic pulses.',
    preview: '90s Rest · Warm-up Ramp Generated',
    tone: 'warning',
  },
  {
    id: 'offline',
    category: 'ZERO FRICTION',
    iconKey: 'offline',
    title: '100% offline gym logging.',
    desc: 'Local-first persistence with seamless Google Cloud sync. Never lose a set in basement gym floors.',
    preview: '0ms Lag · Encrypted Local Cache',
    tone: 'secondary',
  },
];

const resolvePillarColors = (tone: PillarTone, tokens: ThemeTokens) => {
  switch (tone) {
    case 'primary':
      return { color: tokens.accent.primary, bg: tokens.accent.primaryDim };
    case 'success':
      return { color: tokens.status.success, bg: tokens.status.successDim };
    case 'info':
      return { color: tokens.status.info, bg: tokens.status.infoDim };
    case 'warning':
      return { color: tokens.status.warning, bg: tokens.status.warningDim };
    case 'secondary':
    default:
      return { color: tokens.accent.secondary, bg: tokens.accent.secondaryDim };
  }
};

const renderPillarIcon = (key: ModulePillar['iconKey'], color: string) => {
  const props = { size: ICON.md, color, strokeWidth: ICON.strokeWidth };
  switch (key) {
    case 'overload':
      return <Dumbbell {...props} />;
    case 'splits':
      return <GitBranch {...props} />;
    case 'body':
      return <Activity {...props} />;
    case 'timer':
      return <Timer {...props} />;
    case 'offline':
      return <ShieldCheck {...props} />;
  }
};

interface LandingScreenProps {
  onGetStarted: () => void;
}

export default function LandingScreen({ onGetStarted }: LandingScreenProps) {
  const { tokens } = useTheme();
  const unitIsLbs = useWeightUnit();
  const uLabel = unitLabel(unitIsLbs);
  const { isNarrow, isCompactH, clampChartWidth, maxContentWidth, maxFontMultiplier } = useResponsiveMetrics();
  const cardWidth = clampChartWidth(HORIZONTAL_MARGIN * 2);

  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const activeCardIndexRef = useRef(0);
  activeCardIndexRef.current = activeCardIndex;
  const scrollRef = useRef<ScrollView>(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const userInteractTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const overloadPreviewText = `Bench Press · ${kgToDisplay(85, unitIsLbs)} ${uLabel} × 8 reps (+${kgToDisplay(5, unitIsLbs)} ${uLabel} Overload)`;

  // Smooth Auto-Scroll Carousel
  useEffect(() => {
    if (isUserInteracting) return;

    const timer = setInterval(() => {
      const nextIndex = (activeCardIndexRef.current + 1) % MODULE_PILLARS.length;
      activeCardIndexRef.current = nextIndex;
      setActiveCardIndex(nextIndex);
      scrollRef.current?.scrollTo({
        x: nextIndex * (cardWidth + CARD_SPACING),
        animated: true,
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [isUserInteracting, cardWidth]);

  useEffect(() => {
    return () => {
      if (userInteractTimeoutRef.current) {
        clearTimeout(userInteractTimeoutRef.current);
        userInteractTimeoutRef.current = null;
      }
    };
  }, []);

  const handleGetStarted = () => {
    hapticLight();
    onGetStarted();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (cardWidth + CARD_SPACING));
    if (index !== activeCardIndex && index >= 0 && index < MODULE_PILLARS.length) {
      setActiveCardIndex(index);
      hapticSelection();
    }
  };

  const handleScrollBeginDrag = () => {
    setIsUserInteracting(true);
    if (userInteractTimeoutRef.current) clearTimeout(userInteractTimeoutRef.current);
  };

  const handleScrollEndDrag = () => {
    if (userInteractTimeoutRef.current) clearTimeout(userInteractTimeoutRef.current);
    userInteractTimeoutRef.current = setTimeout(() => {
      setIsUserInteracting(false);
    }, 5000);
  };

  const handleDotPress = (index: number) => {
    hapticSelection();
    setActiveCardIndex(index);
    scrollRef.current?.scrollTo({
      x: index * (cardWidth + CARD_SPACING),
      animated: true,
    });
    setIsUserInteracting(true);
    if (userInteractTimeoutRef.current) clearTimeout(userInteractTimeoutRef.current);
    userInteractTimeoutRef.current = setTimeout(() => setIsUserInteracting(false), 5000);
  };

  const titleItalicSize = isCompactH || isNarrow ? 34 : 44;
  const titleBoldSize = isCompactH || isNarrow ? 27 : 34;

  return (
    <ScreenWrapper edges={['top', 'bottom']} keyboardAvoiding={false}>
      {/* Subtle Ambient Aura */}
      <LinearGradient
        colors={[tokens.accent.primaryDim, 'transparent']}
        style={StyleSheet.absoluteFillObject}
        locations={[0, 0.45]}
        pointerEvents="none"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          { maxWidth: maxContentWidth, width: '100%', alignSelf: 'center' },
        ]}
      >
        {/* Top Header */}
        <Reanimated.View entering={FadeInDown.duration(500)} style={styles.topHeader}>
          <Text style={[styles.brand, { color: tokens.text.primary }]}>ZENFIT</Text>
          <Text style={[styles.step, { color: tokens.text.muted }]} maxFontSizeMultiplier={maxFontMultiplier}>01 / welcome</Text>
        </Reanimated.View>

        {/* Main Editorial Hero Block */}
        <Reanimated.View entering={FadeInDown.delay(100).duration(600)} style={styles.mainBlock}>
          <View style={styles.heroTextContainer}>
            <Text
              style={[
                styles.heroTitleItalic,
                {
                  color: tokens.accent.primary,
                  fontSize: titleItalicSize,
                  lineHeight: Math.round(titleItalicSize * 1.18),
                },
              ]}
            >
              Quietly
            </Text>
            <Text
              style={[
                styles.heroTitleBold,
                {
                  color: tokens.text.primary,
                  fontSize: titleBoldSize,
                  lineHeight: Math.round(titleBoldSize * 1.12),
                },
              ]}
            >
              orchestrated.
            </Text>
          </View>

          <Text style={[styles.sub, { color: tokens.text.secondary }]}>
            Workouts, progressive overload, routines, and anatomical volume handled alongside you. Zero friction.
          </Text>

          {/* Minimalist Showcase Cards Carousel */}
          <View style={styles.carouselWrapper}>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled={false}
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              onScrollBeginDrag={handleScrollBeginDrag}
              onScrollEndDrag={handleScrollEndDrag}
              onMomentumScrollEnd={handleScrollEndDrag}
              scrollEventThrottle={16}
              decelerationRate="fast"
              snapToInterval={cardWidth + CARD_SPACING}
              snapToAlignment="start"
              contentContainerStyle={styles.carouselContent}
            >
              {MODULE_PILLARS.map((item, index) => {
                const isSelected = activeCardIndex === index;
                const { color: toneColor, bg: toneBg } = resolvePillarColors(item.tone, tokens);
                const previewLabel = item.id === 'overload' ? overloadPreviewText : item.preview;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.showcaseCard,
                      {
                        width: cardWidth,
                        borderColor: isSelected ? tokens.border.focus : tokens.border.subtle,
                        backgroundColor: tokens.bg.surface,
                      },
                    ]}
                  >
                    {/* Header Row: Icon Badge + Category Pill */}
                    <View style={styles.cardHeaderRow}>
                      <View
                        style={[
                          styles.iconBadge,
                          {
                            backgroundColor: toneBg,
                            borderColor: toneColor,
                          },
                        ]}
                      >
                        {renderPillarIcon(item.iconKey, toneColor)}
                      </View>
                      <View
                        style={[
                          styles.categoryPill,
                          {
                            backgroundColor: tokens.bg.elevated,
                          },
                        ]}
                      >
                        <View style={[styles.dotIndicator, { backgroundColor: toneColor }]} />
                        <Text style={[styles.categoryPillText, { color: tokens.text.secondary }]}>
                          {item.category}
                        </Text>
                      </View>
                    </View>

                    {/* Bold Punchy Title */}
                    <Text style={[styles.cardTitle, { color: tokens.text.primary }]}>
                      {item.title}
                    </Text>

                    {/* Friendly Description */}
                    <Text style={[styles.cardDesc, { color: tokens.text.secondary }]}>
                      {item.desc}
                    </Text>

                    {/* Clean Interactive Preview Capsule */}
                    <View
                      style={[
                        styles.previewCapsule,
                        {
                          backgroundColor: tokens.bg.elevated,
                          borderColor: tokens.border.subtle,
                        },
                      ]}
                    >
                      <Text style={[styles.previewText, { color: tokens.text.primary }]} numberOfLines={1}>
                        {previewLabel}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Pagination Indicators */}
            <View style={styles.paginationRow}>
              {MODULE_PILLARS.map((_, idx) => {
                const isActive = activeCardIndex === idx;
                return (
                  <Pressable
                    key={idx}
                    onPress={() => handleDotPress(idx)}
                    hitSlop={TOUCH.hitSlop}
                    style={{ minHeight: 36, minWidth: 24, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <View
                      style={[
                        styles.paginationDot,
                        {
                          backgroundColor: isActive ? tokens.accent.primary : tokens.border.medium,
                          width: isActive ? 20 : 6,
                        },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Reanimated.View>

        {/* Bottom CTA Block */}
        <Reanimated.View entering={FadeInUp.delay(180).duration(600)} style={styles.bottomBlock}>
          <TactileButton
            variant="primary"
            size="lg"
            onPress={handleGetStarted}
            style={styles.btnWrapper}
          >
            <Text style={[styles.primaryBtnText, { color: tokens.accent.onPrimary }]}>
              Get Started
            </Text>
            <ArrowRight
              size={ICON.sm}
              color={tokens.accent.onPrimary}
              strokeWidth={ICON.strokeWidth}
              style={{ marginLeft: SPACE[8] }}
            />
          </TactileButton>

          <Text style={[styles.trustText, { color: tokens.text.muted }]}>
            Private · 100% Local-First · Encrypted
          </Text>
        </Reanimated.View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: HORIZONTAL_MARGIN,
    justifyContent: 'space-between',
    paddingTop: SPACE[8],
    paddingBottom: SPACE[16],
    gap: SPACE[12],
  },
  topHeader: {
    marginTop: SPACE[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    letterSpacing: 1.2,
    paddingRight: SPACE[8],
  },
  step: {
    fontFamily: FONT_FAMILY.body,
    fontSize: 11,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  mainBlock: {
    justifyContent: 'center',
    marginVertical: SPACE[4],
  },
  heroTextContainer: {
    marginBottom: SPACE[8],
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
    marginBottom: SPACE[16],
    opacity: 0.9,
  },

  // Showcase Cards
  carouselWrapper: {
    width: '100%',
  },
  carouselContent: {
    gap: CARD_SPACING,
    paddingVertical: SPACE[4],
  },
  showcaseCard: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    padding: SPACE[16],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACE[12],
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.inner,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACE[10],
    paddingVertical: SPACE[4],
    borderRadius: RADIUS.sm,
    gap: 5,
  },
  dotIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  categoryPillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    letterSpacing: 0.8,
  },
  cardTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
    marginBottom: SPACE[8],
  },
  cardDesc: {
    fontFamily: FONT_FAMILY.body,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: SPACE[16],
  },
  previewCapsule: {
    paddingHorizontal: SPACE[12],
    paddingVertical: SPACE[12],
    borderRadius: RADIUS.inner,
    borderWidth: 1,
  },
  previewText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12.5,
    fontVariant: ['tabular-nums'],
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACE[8],
    marginTop: SPACE[8],
  },
  paginationDot: {
    height: 4,
    borderRadius: 2,
  },

  // Footer & Button
  bottomBlock: {
    width: '100%',
    alignItems: 'center',
  },
  btnWrapper: {
    width: '100%',
    marginBottom: SPACE[12],
  },
  primaryBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15.5,
    letterSpacing: 0.2,
  },
  trustText: {
    fontFamily: FONT_FAMILY.body,
    fontSize: 11,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
