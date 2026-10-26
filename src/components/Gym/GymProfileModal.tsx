/**
 * GymProfileModal.tsx — ZenFit Mobile
 *
 * Full-Screen Guided Athlete Onboarding & Profile Customization Wizard.
 * Step-by-step progressive flow:
 * 1. Identity & Athlete Profile (avatar, email badge, name, gender, age presets)
 * 2. Body Metrics (silky-smooth interactive slider, quick presets, metric tabs)
 * 3. Primary Training Goals (clean, high-impact cards without clutter)
 * 4. Target Focus Muscles (6 core aesthetic focus muscle groups in a clean grid)
 * 5. Experience & Training Frequency (lifting level + weekly training days)
 *
 * Fluid directional step transitions, liquid animated progress bar,
 * 100% full-screen coverage with zero bottom leaks, polished Apple HIG / Obsidian design.
 * Persists to AsyncStorage ('gym_profile_v1') and Firestore cloud sync.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  StatusBar,
  LayoutChangeEvent,
  Animated,
  Easing,
  PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { FONT_FAMILY } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { useGymProfile, GymProfile } from '../../hooks/useGymProfile';
import { useCoreData } from '../../contexts/domains/CoreDataContext';
import { feedback, hapticLight, hapticMedium, hapticSuccess } from '../../utils/haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// ── Silky Smooth Interactive Metric Slider Component ──────────────────────────

interface SmoothSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  secondaryDisplay?: string;
  accentColor?: string;
  onChange: (val: number) => void;
  presets?: { label: string; value: number }[];
}

function SmoothMetricSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  secondaryDisplay,
  accentColor = '#A599FF',
  onChange,
  presets,
}: SmoothSliderProps) {
  const [isHeld, setIsHeld] = useState(false);
  const [trackWidth, setTrackWidth] = useState(280);
  const trackWidthRef = useRef(280);
  const trackRef = useRef<View>(null);
  const trackPageX = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);
  const lastHapticVal = useRef(value);

  // Keep latest props in a ref to avoid stale closure in PanResponder
  const propsRef = useRef({ min, max, step, value, onChange });
  propsRef.current = { min, max, step, value, onChange };

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      setTrackWidth(w);
      trackWidthRef.current = w;
    }
    trackRef.current?.measure((_x, _y, _w, _h, pageX) => {
      if (pageX !== undefined && !isNaN(pageX)) {
        trackPageX.current = pageX;
      }
    });
  };

  const updateFromPageX = (pageX: number) => {
    const { min: curMin, max: curMax, step: curStep, value: curVal, onChange: curOnChange } = propsRef.current;
    const width = trackWidthRef.current;
    if (width <= 0) return;

    const basePageX = trackPageX.current ?? (pageX - width / 2);
    const thumbRadius = 12;
    const usableWidth = Math.max(1, width - thumbRadius * 2);

    // Finger offset from start of usable track
    const offsetFromStart = pageX - (basePageX + thumbRadius);
    const ratio = Math.max(0, Math.min(1, offsetFromStart / usableWidth));

    const rawVal = curMin + ratio * (curMax - curMin);
    const stepped = Math.round(rawVal / curStep) * curStep;
    const clamped = Math.max(curMin, Math.min(curMax, Number(stepped.toFixed(1))));

    if (clamped !== curVal) {
      if (Math.abs(clamped - lastHapticVal.current) >= curStep * 2) {
        hapticLight();
        lastHapticVal.current = clamped;
      }
      curOnChange(clamped);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: evt => {
        isDragging.current = true;
        setIsHeld(true);
        if (evt.nativeEvent.locationX !== undefined) {
          trackPageX.current = evt.nativeEvent.pageX - evt.nativeEvent.locationX;
        }
        updateFromPageX(evt.nativeEvent.pageX);
      },
      onPanResponderMove: evt => {
        if (isDragging.current) {
          updateFromPageX(evt.nativeEvent.pageX);
        }
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
        setIsHeld(false);
        hapticMedium();
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        setIsHeld(false);
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const stepDown = () => {
    hapticLight();
    const next = Math.max(min, Number((value - step).toFixed(1)));
    onChange(next);
  };

  const stepUp = () => {
    hapticLight();
    const next = Math.min(max, Number((value + step).toFixed(1)));
    onChange(next);
  };

  const progressRatio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const usableWidth = Math.max(1, trackWidth - 24);
  const thumbLeft = progressRatio * usableWidth;

  return (
    <View style={sliderStyles.container}>
      {/* Header Row */}
      <View style={sliderStyles.headerRow}>
        <Text style={sliderStyles.label}>{label}</Text>
        {secondaryDisplay ? (
          <View style={sliderStyles.secondaryBadge}>
            <Text style={sliderStyles.secondaryText}>{secondaryDisplay}</Text>
          </View>
        ) : null}
      </View>

      {/* Big Digital Readout */}
      <View style={sliderStyles.readoutRow}>
        <TouchableOpacity
          onPress={stepDown}
          style={sliderStyles.stepperBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="remove" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={sliderStyles.valueCenter}>
          <Text style={sliderStyles.bigValue}>{value}</Text>
          <Text style={sliderStyles.unitText}>{unit}</Text>
        </View>

        <TouchableOpacity
          onPress={stepUp}
          style={sliderStyles.stepperBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Smooth Continuous Track */}
      <View
        ref={trackRef}
        style={sliderStyles.trackTouchable}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        <View pointerEvents="none" style={sliderStyles.trackBackground}>
          <View
            style={[
              sliderStyles.trackFill,
              { width: `${progressRatio * 100}%`, backgroundColor: accentColor },
            ]}
          />
        </View>
        <View
          pointerEvents="none"
          style={[
            sliderStyles.thumb,
            isHeld && sliderStyles.thumbActive,
            { left: thumbLeft },
          ]}
        >
          <View style={[sliderStyles.thumbInner, { backgroundColor: accentColor }]} />
        </View>
      </View>

      {/* Min / Max Labels */}
      <View style={sliderStyles.minMaxRow}>
        <Text style={sliderStyles.minMaxText}>
          {min} {unit}
        </Text>
        <Text style={sliderStyles.minMaxText}>
          {max} {unit}
        </Text>
      </View>

      {/* Quick Jump Presets */}
      {presets && presets.length > 0 && (
        <View style={sliderStyles.presetsWrap}>
          {presets.map(p => {
            const isMatch = Math.abs(value - p.value) < 0.5;
            return (
              <TouchableOpacity
                key={`preset-${p.value}`}
                onPress={() => {
                  feedback.tap();
                  onChange(p.value);
                }}
                style={[
                  sliderStyles.presetChip,
                  isMatch && { borderColor: accentColor, backgroundColor: `${accentColor}20` },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    sliderStyles.presetChipText,
                    isMatch && { color: accentColor, fontFamily: FONT_FAMILY.bold },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Step Next Button Metadata ─────────────────────────────────────────────────

const STEP_META: Record<number, { title: string; nextLabel: string }> = {
  1: { title: 'Athlete Profile', nextLabel: 'Continue' },
  2: { title: 'Body Stats', nextLabel: 'Continue' },
  3: { title: 'Training Goals', nextLabel: 'Continue' },
  4: { title: 'Focus Muscles', nextLabel: 'Continue' },
  5: { title: 'Experience & Schedule', nextLabel: "Let's Start to the App 🚀" },
};

// ── Main Full-Screen Wizard Component ─────────────────────────────────────────

export function GymProfileModal({ visible, onClose }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useCoreData();
  const { gymProfile, saveGymProfile } = useGymProfile();

  // View Mode: 'overview' (Profile Card) | 'wizard' (5-Step Form)
  const [viewMode, setViewMode] = useState<'overview' | 'wizard'>('overview');

  // Wizard Step: 1..5
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [name, setName] = useState('');
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [age, setAge] = useState(24);
  const [heightCm, setHeightCm] = useState(175);
  const [weightKg, setWeightKg] = useState(74);
  const [targetWeightKg, setTargetWeightKg] = useState(78);
  const [activeMetricTab, setActiveMetricTab] = useState<'height' | 'weight' | 'target'>('height');
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['hypertrophy']);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>(['Chest', 'Back', 'Arms']);
  const [experience, setExperience] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [daysPerWeek, setDaysPerWeek] = useState<number>(5);

  // Smooth Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const stepScaleAnim = useRef(new Animated.Value(1)).current;
  const btnScaleAnim = useRef(new Animated.Value(1)).current;
  const isTransitioningRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Hydrate on open
  useEffect(() => {
    if (visible) {
      const hasSavedProfile = Boolean(
        gymProfile?.updatedAt ||
        gymProfile?.heightCm ||
        gymProfile?.weightKg ||
        gymProfile?.bodyweightKg
      );
      setViewMode(hasSavedProfile ? 'overview' : 'wizard');
      setCurrentStep(1);
      setActiveMetricTab('height');
      progressAnim.setValue(1);
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      stepScaleAnim.setValue(1);
      btnScaleAnim.setValue(1);
      isTransitioningRef.current = false;

      setName(gymProfile?.displayName || user?.displayName || '');
      if (gymProfile?.gender) setGender(gymProfile.gender.toLowerCase() as any);
      if (gymProfile?.age) setAge(Number(gymProfile.age));
      if (gymProfile?.heightCm) setHeightCm(Number(gymProfile.heightCm));
      if (gymProfile?.weightKg) setWeightKg(Number(gymProfile.weightKg));
      if (gymProfile?.targetBodyweightKg) setTargetWeightKg(Number(gymProfile.targetBodyweightKg));

      // Parse goals
      const g = (gymProfile?.goal || (gymProfile as any)?.primaryGoal) as any;
      if (Array.isArray(g) && g.length > 0) {
        setSelectedGoals(g);
      } else if (typeof g === 'string' && g.trim().length > 0) {
        setSelectedGoals(g.split(',').map(s => s.trim()).filter(Boolean));
      } else {
        setSelectedGoals(['hypertrophy']);
      }

      // Parse muscles
      const fm = gymProfile?.focusMuscles;
      if (typeof fm === 'string' && fm.trim().length > 0) {
        setSelectedMuscles(fm.split(',').map(s => s.trim()).filter(Boolean));
      } else if (Array.isArray(fm) && fm.length > 0) {
        setSelectedMuscles(fm.filter(Boolean));
      } else {
        setSelectedMuscles(['Chest', 'Back', 'Arms']);
      }

      if (gymProfile?.experience) setExperience(gymProfile.experience.toLowerCase() as any);
      if (gymProfile?.daysPerWeek) setDaysPerWeek(Number(gymProfile.daysPerWeek));
    }
  }, [visible, gymProfile, user]);

  // Height Imperial conversion helper
  const heightFeetInches = useMemo(() => {
    const totalInches = Math.round(heightCm / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return `${feet}' ${inches}"`;
  }, [heightCm]);

  // Weight LBS conversion helper
  const weightLbs = useMemo(() => {
    return `${(weightKg * 2.20462).toFixed(1)} lbs`;
  }, [weightKg]);

  const targetWeightLbs = useMemo(() => {
    return `${(targetWeightKg * 2.20462).toFixed(1)} lbs`;
  }, [targetWeightKg]);

  // Estimated BMI calculation helper
  const bmiStats = useMemo(() => {
    const hMeter = heightCm / 100;
    if (hMeter <= 0) return { bmi: '22.0', label: 'Balanced Baseline' };
    const rawBmi = (weightKg / (hMeter * hMeter)).toFixed(1);
    const num = parseFloat(rawBmi);
    let label = 'Balanced Athletic';
    if (num < 18.5) label = 'Lean / Fast Metabolism';
    else if (num < 25) label = 'Athletic Optimum';
    else if (num < 30) label = 'Hypertrophy Mass Phase';
    else label = 'High Density Mass';
    return { bmi: rawBmi, label };
  }, [heightCm, weightKg]);

  const toggleGoal = (goalKey: string) => {
    feedback.tap();
    setSelectedGoals(prev => {
      if (prev.includes(goalKey)) {
        if (prev.length <= 1) return prev; // Keep at least one
        return prev.filter(g => g !== goalKey);
      }
      if (prev.length >= 2) {
        return [prev[1], goalKey];
      }
      return [...prev, goalKey];
    });
  };

  const toggleMuscle = (muscleName: string) => {
    feedback.tap();
    setSelectedMuscles(prev => {
      if (prev.includes(muscleName)) {
        if (prev.length <= 1) return prev; // Keep at least one
        return prev.filter(m => m !== muscleName);
      }
      if (prev.length >= 4) {
        // Limit to top 4 max for laser focus
        return [...prev.slice(1), muscleName];
      }
      return [...prev, muscleName];
    });
  };

  // Fluid directional step transition
  const transitionToStep = (targetStep: number, direction: 'forward' | 'back') => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    const outOffset = direction === 'forward' ? -28 : 28;
    const inOffset = direction === 'forward' ? 28 : -28;

    // Pulse step counter
    Animated.sequence([
      Animated.timing(stepScaleAnim, {
        toValue: 1.15,
        duration: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(stepScaleAnim, {
        toValue: 1,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Smoothly animate liquid progress bar
    Animated.spring(progressAnim, {
      toValue: targetStep,
      tension: 70,
      friction: 10,
      useNativeDriver: false,
    }).start();

    // Phase 1: Slide & fade out current step
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 110,
        easing: Easing.bezier(0.4, 0, 1, 1),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: outOffset,
        duration: 110,
        easing: Easing.bezier(0.4, 0, 1, 1),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Step state change while invisible
      setCurrentStep(targetStep);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });

      // Prep incoming offset
      slideAnim.setValue(inOffset);

      // Phase 2: Slide & fade in new step
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 190,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isTransitioningRef.current = false;
      });
    });
  };

  const handleNext = () => {
    if (isTransitioningRef.current) return;
    hapticMedium();

    // Tactile button bounce
    Animated.sequence([
      Animated.timing(btnScaleAnim, { toValue: 0.96, duration: 70, useNativeDriver: true }),
      Animated.timing(btnScaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();

    if (currentStep < 5) {
      transitionToStep(currentStep + 1, 'forward');
    } else {
      handleSave();
    }
  };

  const handleBack = () => {
    if (isTransitioningRef.current) return;
    hapticLight();
    if (currentStep > 1) {
      transitionToStep(currentStep - 1, 'back');
    } else {
      const hasSavedProfile = Boolean(
        gymProfile?.updatedAt ||
        gymProfile?.heightCm ||
        gymProfile?.weightKg ||
        gymProfile?.bodyweightKg
      );
      if (hasSavedProfile) {
        setViewMode('overview');
      } else {
        onClose();
      }
    }
  };

  const handleSave = async () => {
    const rawGoal = (selectedGoals[0] || 'hypertrophy') as 'hypertrophy' | 'strength' | 'fat_loss' | 'athletic';
    const updated: GymProfile = {
      ...gymProfile,
      displayName: name.trim() || user?.displayName || 'Athlete',
      gender,
      age,
      ageYears: age,
      heightCm,
      weightKg,
      bodyweightKg: weightKg,
      targetBodyweightKg: targetWeightKg,
      goal: rawGoal,
      primaryGoal: selectedGoals.join(','),
      focusMuscles: selectedMuscles.join(','),
      experience,
      daysPerWeek,
      updatedAt: Date.now(),
    };

    hapticSuccess();
    await saveGymProfile(updated);
    // After completing all 5 things, transition smoothly to the Profile Card!
    setViewMode('overview');
  };

  // ── Curated Best Options ──────────────────────────────────────────────────

  const GOALS_LIST = [
    {
      key: 'hypertrophy',
      title: 'Muscle Hypertrophy',
      sub: 'Aesthetic Size & Muscle Fullness',
      badge: '8–12 Reps',
      icon: 'barbell-outline',
      accent: '#A599FF',
    },
    {
      key: 'strength',
      title: 'Compound Strength',
      sub: 'Heavy Lifts & Max 1RM Power',
      badge: '3–6 Reps',
      icon: 'trophy-outline',
      accent: '#FF9F0A',
    },
    {
      key: 'fat_loss',
      title: 'Fat Loss & Conditioning',
      sub: 'Lean Shred & Caloric Density',
      badge: 'Metabolic',
      icon: 'flame-outline',
      accent: '#FF453A',
    },
    {
      key: 'athletic',
      title: 'Athletic Performance',
      sub: 'Power, Speed & Joint Durability',
      badge: 'Functional',
      icon: 'flash-outline',
      accent: '#30D158',
    },
  ];

  // Curated 6 Best Aesthetic Muscle Focus Groups
  const CORE_FOCUS_MUSCLES = [
    {
      name: 'Chest',
      sub: 'Upper & Lower Pecs',
      icon: 'barbell-outline',
      accent: '#FF6B6B',
    },
    {
      name: 'Back',
      sub: 'Lats & V-Taper Wings',
      icon: 'shield-checkmark-outline',
      accent: '#4D96FF',
    },
    {
      name: 'Shoulders',
      sub: 'Side & Front Delts',
      icon: 'flash-outline',
      accent: '#FFD93D',
    },
    {
      name: 'Arms',
      sub: 'Biceps & Triceps',
      icon: 'flame-outline',
      accent: '#FF9F0A',
    },
    {
      name: 'Legs',
      sub: 'Quads & Hamstrings',
      icon: 'fitness-outline',
      accent: '#6BCB77',
    },
    {
      name: 'Abs',
      sub: 'Six-Pack & Core',
      icon: 'trophy-outline',
      accent: '#BF5AF2',
    },
  ];

  const EXPERIENCE_TIERS = [
    {
      key: 'beginner' as const,
      title: 'Beginner (< 1 Year)',
      icon: 'leaf-outline',
      color: '#30D158',
      desc: 'Mastering compound mechanics and building linear strength.',
    },
    {
      key: 'intermediate' as const,
      title: 'Intermediate (1–3 Years)',
      icon: 'shield-checkmark-outline',
      color: '#FF9F0A',
      desc: 'Consistent lifting habits with progressive overload.',
    },
    {
      key: 'advanced' as const,
      title: 'Advanced (3+ Years)',
      icon: 'sparkles-outline',
      color: '#BF5AF2',
      desc: 'High volume tolerance requiring periodized training.',
    },
  ];

  const DAYS_OPTIONS = [
    { days: 3, label: '3 Days', recommend: 'Full Body' },
    { days: 4, label: '4 Days', recommend: 'Upper / Lower' },
    { days: 5, label: '5 Days', recommend: 'Hybrid PPL' },
    { days: 6, label: '6 Days', recommend: 'PPL / Arnold' },
  ];

  const AGE_PRESETS = [18, 21, 24, 28, 32, 40];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
      navigationBarTranslucent={true}
      hardwareAccelerated={true}
      transparent={true}
      onRequestClose={onClose}
    >
      {/* ── Solid Root Backdrop (Prevents Any Underlying Screen Leak) ── */}
      <View style={styles.modalBackdrop}>
        <StatusBar barStyle="light-content" backgroundColor="#08080B" translucent={true} />

        <SafeAreaView style={styles.safeContainer} edges={['top']}>
          {viewMode === 'overview' ? (
            <View style={{ flex: 1 }}>
              {/* ── Overview Top Bar ── */}
              <View style={styles.overviewTopNav}>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.navBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.overviewTitleCenter}>
                  <Text style={styles.overviewTitleText}>ATHLETE PROFILE</Text>
                  <View style={styles.overviewActiveDot} />
                </View>

                <TouchableOpacity
                  onPress={() => {
                    hapticLight();
                    setCurrentStep(1);
                    setViewMode('wizard');
                  }}
                  style={styles.overviewTopEditBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="create-outline" size={15} color="#A599FF" />
                  <Text style={styles.overviewTopEditText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* ── Scrollable Profile Card Content ── */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.overviewScroll,
                  { paddingBottom: Math.max(insets.bottom, 24) + 16 },
                ]}
              >
                {/* 1. Athlete Hero Card */}
                <View style={styles.heroPassportCard}>
                  <LinearGradient
                    colors={['rgba(165, 153, 255, 0.45)', 'rgba(110, 86, 207, 0.15)']}
                    style={styles.heroAvatarRing}
                  >
                    <View style={styles.heroAvatarInner}>
                      {user?.photoURL ? (
                        <Image source={{ uri: user.photoURL }} style={styles.avatarImg} contentFit="cover" />
                      ) : (
                        <Ionicons name="person" size={32} color="#A599FF" />
                      )}
                    </View>
                  </LinearGradient>

                  <Text style={styles.heroAthleteName}>{name.trim() || user?.displayName || 'Athlete'}</Text>
                  <Text style={styles.heroAthleteSub}>
                    {gender.toUpperCase()} • {age} YEARS OLD
                  </Text>

                  <View style={styles.heroBadgeRow}>
                    <View style={styles.heroVerifiedBadge}>
                      <View style={styles.verifiedDot} />
                      <Text style={styles.heroVerifiedText}>VERIFIED ATHLETE</Text>
                    </View>
                    <View style={styles.heroPlanBadge}>
                      <Ionicons name="flash" size={11} color="#A599FF" />
                      <Text style={styles.heroPlanText}>GYM-GPT READY</Text>
                    </View>
                  </View>
                </View>

                {/* 2. Biometrics (4 Glass Tiles) */}
                <View style={styles.overviewStatsGrid}>
                  <View style={styles.overviewStatTile}>
                    <Text style={styles.overviewStatLabel}>HEIGHT</Text>
                    <Text style={styles.overviewStatValue}>{heightCm} cm</Text>
                    <Text style={styles.overviewStatSub}>{heightFeetInches}</Text>
                  </View>

                  <View style={styles.overviewStatTile}>
                    <Text style={styles.overviewStatLabel}>WEIGHT</Text>
                    <Text style={styles.overviewStatValue}>{weightKg} kg</Text>
                    <Text style={styles.overviewStatSub}>{weightLbs}</Text>
                  </View>

                  <View style={styles.overviewStatTile}>
                    <Text style={styles.overviewStatLabel}>TARGET</Text>
                    <Text style={styles.overviewStatValue}>{targetWeightKg} kg</Text>
                    <Text style={styles.overviewStatSub}>{targetWeightLbs}</Text>
                  </View>

                  <View style={styles.overviewStatTile}>
                    <Text style={styles.overviewStatLabel}>BMI</Text>
                    <Text style={styles.overviewStatValue}>{bmiStats.bmi}</Text>
                    <Text style={styles.overviewStatSub} numberOfLines={1}>{bmiStats.label.split(' ')[0]}</Text>
                  </View>
                </View>

                {/* 3. Primary Training Goals */}
                <View style={styles.overviewSectionCard}>
                  <View style={styles.overviewSectionHeader}>
                    <Text style={styles.overviewSectionTitle}>PRIMARY GOALS</Text>
                    <TouchableOpacity
                      onPress={() => {
                        hapticLight();
                        setCurrentStep(3);
                        setViewMode('wizard');
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="create-outline" size={14} color="#A599FF" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.overviewChipsRow}>
                    {selectedGoals.map(gKey => {
                      const found = GOALS_LIST.find(x => x.key === gKey);
                      return (
                        <View key={gKey} style={styles.overviewGoalChip}>
                          <Ionicons name={(found?.icon as any) || 'barbell-outline'} size={14} color="#A599FF" />
                          <Text style={styles.overviewGoalChipText}>{found?.title || gKey}</Text>
                          {found?.badge ? (
                            <View style={styles.overviewMiniBadge}>
                              <Text style={styles.overviewMiniBadgeText}>{found.badge}</Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* 4. Target Focus Muscles */}
                <View style={styles.overviewSectionCard}>
                  <View style={styles.overviewSectionHeader}>
                    <Text style={styles.overviewSectionTitle}>FOCUS MUSCLE GROUPS</Text>
                    <TouchableOpacity
                      onPress={() => {
                        hapticLight();
                        setCurrentStep(4);
                        setViewMode('wizard');
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="create-outline" size={14} color="#A599FF" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.overviewChipsRow}>
                    {selectedMuscles.map(mName => {
                      const found = CORE_FOCUS_MUSCLES.find(x => x.name === mName);
                      return (
                        <View key={mName} style={styles.overviewMuscleChip}>
                          <Ionicons
                            name={(found?.icon as any) || 'fitness-outline'}
                            size={14}
                            color={found?.accent || '#A599FF'}
                          />
                          <Text style={styles.overviewMuscleChipText}>{mName}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* 5. Experience & Schedule */}
                <View style={styles.overviewSectionCard}>
                  <View style={styles.overviewSectionHeader}>
                    <Text style={styles.overviewSectionTitle}>EXPERIENCE & SCHEDULE</Text>
                    <TouchableOpacity
                      onPress={() => {
                        hapticLight();
                        setCurrentStep(5);
                        setViewMode('wizard');
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="create-outline" size={14} color="#A599FF" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.overviewScheduleRow}>
                    <View style={styles.overviewScheduleCol}>
                      <Text style={styles.overviewScheduleLabel}>EXPERIENCE LEVEL</Text>
                      <Text style={styles.overviewScheduleVal}>
                        {experience.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.overviewScheduleDivider} />
                    <View style={styles.overviewScheduleCol}>
                      <Text style={styles.overviewScheduleLabel}>WEEKLY FREQUENCY</Text>
                      <Text style={styles.overviewScheduleVal}>
                        {daysPerWeek} DAYS / WEEK
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 6. Primary Action Button */}
                <TouchableOpacity
                  onPress={() => {
                    hapticMedium();
                    setCurrentStep(1);
                    setViewMode('wizard');
                  }}
                  style={styles.overviewEditActionBtn}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={17} color="#000000" style={{ marginRight: 8 }} />
                  <Text style={styles.overviewEditActionBtnText}>Edit Profile</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          ) : (
            <>
              {/* ── Top Bar: Back, 5-Step Segmented Bar, Step Counter ── */}
              <View style={styles.topNav}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.navBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={currentStep > 1 ? 'arrow-back' : 'close'}
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            {/* 5-Step Animated Liquid Progress Indicators */}
            <View style={styles.progressRow}>
              {[1, 2, 3, 4, 5].map(stepNum => {
                const segmentWidth = progressAnim.interpolate({
                  inputRange: [stepNum - 1, stepNum],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                });
                const isCurrent = stepNum === currentStep;

                return (
                  <View key={`step-${stepNum}`} style={styles.progressSegmentTrack}>
                    <Animated.View
                      style={[
                        styles.progressSegmentFill,
                        { width: segmentWidth },
                        isCurrent && styles.progressSegmentGlow,
                      ]}
                    />
                  </View>
                );
              })}
            </View>

            {/* Animated Step Badge */}
            <Animated.View
              style={[
                styles.stepCounterWrap,
                { transform: [{ scale: stepScaleAnim }] },
              ]}
            >
              <Text style={styles.stepCounterText}>{currentStep}/5</Text>
            </Animated.View>
          </View>

          {/* ── Scrollable Body Step Flow with Smooth Transitions ── */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollBody}
              keyboardShouldPersistTaps="handled"
            >
              <Animated.View
                style={[
                  styles.animatedStepContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateX: slideAnim }],
                  },
                ]}
              >
                {/* ═════════ STEP 1: IDENTITY & ATHLETE PROFILE ═════════ */}
                {currentStep === 1 && (
                  <View style={styles.stepWrapper}>
                    {/* Avatar Showcase */}
                    <View style={styles.avatarHeader}>
                      <LinearGradient
                        colors={['rgba(165, 153, 255, 0.45)', 'rgba(110, 86, 207, 0.15)']}
                        style={styles.avatarRingGradient}
                      >
                        <View style={styles.avatarInner}>
                          {user?.photoURL ? (
                            <Image
                              source={{ uri: user.photoURL }}
                              style={styles.avatarImg}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={styles.avatarFallback}>
                              <Ionicons name="person" size={28} color="#A599FF" />
                            </View>
                          )}
                        </View>
                      </LinearGradient>

                      {/* Verified Athlete Badge (No Google Account Text) */}
                      <View style={styles.verifiedBadgeRow}>
                        {user?.email ? (
                          <>
                            <View style={styles.verifiedDot} />
                            <Text style={styles.verifiedBadgeText} numberOfLines={1}>
                              {user.email}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Ionicons name="sparkles" size={12} color="#A599FF" />
                            <Text style={styles.verifiedBadgeText}>ATHLETE CALIBRATION</Text>
                          </>
                        )}
                      </View>
                    </View>

                    {/* Name Input */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>YOUR NAME</Text>
                      <View
                        style={[
                          styles.textInputBox,
                          isNameFocused && styles.textInputBoxFocused,
                        ]}
                      >
                        <Ionicons
                          name="person-outline"
                          size={17}
                          color={isNameFocused ? '#A599FF' : '#8E8E93'}
                          style={{ marginRight: 10 }}
                        />
                        <TextInput
                          value={name}
                          onChangeText={setName}
                          onFocus={() => setIsNameFocused(true)}
                          onBlur={() => setIsNameFocused(false)}
                          placeholder="Enter your name"
                          placeholderTextColor="#636366"
                          style={styles.textInputField}
                          autoCapitalize="words"
                        />
                        {name.length > 0 && (
                          <TouchableOpacity
                            onPress={() => setName('')}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons name="close-circle" size={18} color="#636366" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* Gender Segmented Row */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>GENDER</Text>
                      <View style={styles.genderRow}>
                        {[
                          { key: 'male' as const, label: 'Male', icon: 'male' },
                          { key: 'female' as const, label: 'Female', icon: 'female' },
                          { key: 'other' as const, label: 'Other', icon: 'body' },
                        ].map(g => {
                          const isSel = gender === g.key;
                          return (
                            <TouchableOpacity
                              key={g.key}
                              onPress={() => {
                                feedback.tap();
                                setGender(g.key);
                              }}
                              style={[styles.genderCard, isSel && styles.genderCardActive]}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name={g.icon as any}
                                size={18}
                                color={isSel ? '#000000' : '#8E8E93'}
                                style={{ marginBottom: 4 }}
                              />
                              <Text
                                style={[
                                  styles.genderCardText,
                                  isSel && styles.genderCardTextActive,
                                ]}
                              >
                                {g.label}
                              </Text>
                              {isSel && (
                                <View style={styles.genderCheckDot}>
                                  <Ionicons name="checkmark" size={10} color="#000000" />
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {/* Age Stepper & Quick Presets */}
                    <View style={styles.inputGroup}>
                      <View style={styles.inputLabelRow}>
                        <Text style={styles.inputLabel}>AGE</Text>
                        <View style={styles.ageBadge}>
                          <Text style={styles.ageBadgeText}>Optimal Recovery Range</Text>
                        </View>
                      </View>
                      <View style={styles.ageSelectorCard}>
                        <TouchableOpacity
                          onPress={() => {
                            hapticLight();
                            setAge(prev => Math.max(14, prev - 1));
                          }}
                          style={styles.ageCircleBtn}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="remove" size={20} color="#FFFFFF" />
                        </TouchableOpacity>

                        <View style={styles.ageValueWrap}>
                          <Text style={styles.ageValueBig}>{age}</Text>
                          <Text style={styles.ageUnit}>years old</Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => {
                            hapticLight();
                            setAge(prev => Math.min(90, prev + 1));
                          }}
                          style={styles.ageCircleBtn}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>

                      {/* Quick Age Presets */}
                      <View style={styles.agePresetsRow}>
                        {AGE_PRESETS.map(preset => (
                          <TouchableOpacity
                            key={`age-${preset}`}
                            onPress={() => {
                              feedback.tap();
                              setAge(preset);
                            }}
                            style={[
                              styles.agePresetChip,
                              age === preset && styles.agePresetChipActive,
                            ]}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.agePresetChipText,
                                age === preset && styles.agePresetChipTextActive,
                              ]}
                            >
                              {preset}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                {/* ═════════ STEP 2: BODY METRICS (CLEAN TABBED SLIDERS) ═════════ */}
                {currentStep === 2 && (
                  <View style={styles.stepWrapper}>
                    <View style={styles.titleSection}>
                      <View style={styles.stepPill}>
                        <Text style={styles.stepPillText}>STEP 2 OF 5 • BIOMETRICS</Text>
                      </View>
                      <Text style={styles.stepHeading}>Body Stats</Text>
                    </View>

                    {/* Metric Quick Tabs */}
                    <View style={styles.metricTabsRow}>
                      {[
                        { key: 'height' as const, label: 'Height', valueStr: `${heightCm} cm` },
                        { key: 'weight' as const, label: 'Weight', valueStr: `${weightKg} kg` },
                        { key: 'target' as const, label: 'Goal Weight', valueStr: `${targetWeightKg} kg` },
                      ].map(tab => {
                        const isTab = activeMetricTab === tab.key;
                        return (
                          <TouchableOpacity
                            key={tab.key}
                            onPress={() => {
                              feedback.tap();
                              setActiveMetricTab(tab.key);
                            }}
                            style={[styles.metricTabBtn, isTab && styles.metricTabBtnActive]}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.metricTabLabel, isTab && styles.metricTabLabelActive]}>
                              {tab.label}
                            </Text>
                            <Text style={[styles.metricTabValue, isTab && styles.metricTabValueActive]}>
                              {tab.valueStr}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Active Metric Slider */}
                    {activeMetricTab === 'height' && (
                      <SmoothMetricSlider
                        label="HEIGHT"
                        value={heightCm}
                        min={135}
                        max={225}
                        step={1}
                        unit="cm"
                        secondaryDisplay={heightFeetInches}
                        accentColor="#64D2FF"
                        onChange={setHeightCm}
                        presets={[
                          { label: `160 cm (5'3")`, value: 160 },
                          { label: `170 cm (5'7")`, value: 170 },
                          { label: `175 cm (5'9")`, value: 175 },
                          { label: `180 cm (5'11")`, value: 180 },
                          { label: `188 cm (6'2")`, value: 188 },
                        ]}
                      />
                    )}

                    {activeMetricTab === 'weight' && (
                      <SmoothMetricSlider
                        label="CURRENT BODYWEIGHT"
                        value={weightKg}
                        min={40}
                        max={160}
                        step={0.5}
                        unit="kg"
                        secondaryDisplay={weightLbs}
                        accentColor="#30D158"
                        onChange={setWeightKg}
                        presets={[
                          { label: '60 kg (132 lbs)', value: 60 },
                          { label: '70 kg (154 lbs)', value: 70 },
                          { label: '75 kg (165 lbs)', value: 75 },
                          { label: '82 kg (180 lbs)', value: 82 },
                          { label: '90 kg (198 lbs)', value: 90 },
                        ]}
                      />
                    )}

                    {activeMetricTab === 'target' && (
                      <SmoothMetricSlider
                        label="TARGET GOAL WEIGHT"
                        value={targetWeightKg}
                        min={40}
                        max={160}
                        step={0.5}
                        unit="kg"
                        secondaryDisplay={targetWeightLbs}
                        accentColor="#A599FF"
                        onChange={setTargetWeightKg}
                        presets={[
                          { label: `Cut (-4kg)`, value: Math.max(40, Number((weightKg - 4).toFixed(1))) },
                          { label: `Maintain`, value: weightKg },
                          { label: `Lean Gain (+3kg)`, value: Math.min(160, Number((weightKg + 3).toFixed(1))) },
                          { label: `Mass Bulk (+6kg)`, value: Math.min(160, Number((weightKg + 6).toFixed(1))) },
                        ]}
                      />
                    )}

                    {/* Live Diagnostic Insight Card */}
                    <View style={styles.biometricInsightCard}>
                      <View style={styles.insightIconBox}>
                        <Ionicons name="analytics-outline" size={18} color="#A599FF" />
                      </View>
                      <View style={{ flex: 1, paddingLeft: 10 }}>
                        <Text style={styles.insightTitle}>
                          BMI: {bmiStats.bmi} • {bmiStats.label}
                        </Text>
                        <Text style={styles.insightSub}>
                          {targetWeightKg > weightKg
                            ? `Target: +${(targetWeightKg - weightKg).toFixed(1)} kg lean surplus`
                            : targetWeightKg < weightKg
                            ? `Target: -${(weightKg - targetWeightKg).toFixed(1)} kg deficit cut`
                            : 'Target: Body recomposition maintenance'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* ═════════ STEP 3: PRIMARY TRAINING GOALS (CLEAN & PUNCHY) ═════════ */}
                {currentStep === 3 && (
                  <View style={styles.stepWrapper}>
                    <View style={styles.titleSection}>
                      <View style={styles.stepPill}>
                        <Text style={styles.stepPillText}>
                          STEP 3 OF 5 • GOALS ({selectedGoals.length}/2 SELECTED)
                        </Text>
                      </View>
                      <Text style={styles.stepHeading}>Training Goals</Text>
                    </View>

                    <View style={styles.goalsContainer}>
                      {GOALS_LIST.map(g => {
                        const isSelected = selectedGoals.includes(g.key);
                        return (
                          <TouchableOpacity
                            key={g.key}
                            activeOpacity={0.8}
                            onPress={() => toggleGoal(g.key)}
                            style={[styles.goalCard, isSelected && styles.goalCardActive]}
                          >
                            <View style={styles.goalCardHeader}>
                              <View
                                style={[
                                  styles.goalIconBox,
                                  isSelected && { backgroundColor: g.accent },
                                ]}
                              >
                                <Ionicons
                                  name={g.icon as any}
                                  size={20}
                                  color={isSelected ? '#000000' : g.accent}
                                />
                              </View>

                              <View style={styles.goalTitleCol}>
                                <Text style={styles.goalCardTitle}>{g.title}</Text>
                                <Text style={styles.goalCardSub}>{g.sub}</Text>
                              </View>

                              <View style={styles.goalBadgeRight}>
                                <Text
                                  style={[
                                    styles.goalBadgeText,
                                    isSelected && { color: g.accent },
                                  ]}
                                >
                                  {g.badge}
                                </Text>
                              </View>

                              <View
                                style={[
                                  styles.checkboxCircle,
                                  isSelected && { backgroundColor: g.accent, borderColor: g.accent },
                                ]}
                              >
                                {isSelected && (
                                  <Ionicons name="checkmark" size={12} color="#000000" />
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* ═════════ STEP 4: TARGET FOCUS MUSCLES (6 CORE GROUPS) ═════════ */}
                {currentStep === 4 && (
                  <View style={styles.stepWrapper}>
                    <View style={styles.titleSection}>
                      <View style={styles.stepPill}>
                        <Text style={styles.stepPillText}>
                          STEP 4 OF 5 • {selectedMuscles.length} PRIORITIZED
                        </Text>
                      </View>
                      <Text style={styles.stepHeading}>Focus Muscles</Text>
                    </View>

                    {/* Curated 6-Grid of High-Impact Aesthetic Muscles */}
                    <View style={styles.curatedMuscleGrid}>
                      {CORE_FOCUS_MUSCLES.map(m => {
                        const isSel = selectedMuscles.includes(m.name);
                        return (
                          <TouchableOpacity
                            key={m.name}
                            onPress={() => toggleMuscle(m.name)}
                            style={[
                              styles.curatedMuscleCard,
                              isSel && styles.curatedMuscleCardActive,
                            ]}
                            activeOpacity={0.75}
                          >
                            <View style={styles.curatedCardTop}>
                              <View
                                style={[
                                  styles.curatedMuscleIconBox,
                                  isSel && { backgroundColor: m.accent },
                                ]}
                              >
                                <Ionicons
                                  name={m.icon as any}
                                  size={18}
                                  color={isSel ? '#000000' : m.accent}
                                />
                              </View>
                              <View
                                style={[
                                  styles.curatedCheckbox,
                                  isSel && { backgroundColor: '#A599FF', borderColor: '#A599FF' },
                                ]}
                              >
                                {isSel && (
                                  <Ionicons name="checkmark" size={11} color="#000000" />
                                )}
                              </View>
                            </View>

                            <Text
                              style={[
                                styles.curatedMuscleName,
                                isSel && styles.curatedMuscleNameActive,
                              ]}
                            >
                              {m.name}
                            </Text>
                            <Text style={styles.curatedMuscleSub}>{m.sub}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* ═════════ STEP 5: EXPERIENCE & SCHEDULE ═════════ */}
                {currentStep === 5 && (
                  <View style={styles.stepWrapper}>
                    <View style={styles.titleSection}>
                      <View style={styles.stepPill}>
                        <Text style={styles.stepPillText}>STEP 5 OF 5 • EXPERIENCE & SCHEDULE</Text>
                      </View>
                      <Text style={styles.stepHeading}>Experience & Schedule</Text>
                    </View>

                    {/* Experience Tiers */}
                    <Text style={styles.inputLabel}>LIFTING EXPERIENCE</Text>
                    <View style={styles.experienceContainer}>
                      {EXPERIENCE_TIERS.map(tier => {
                        const isSel = experience === tier.key;
                        return (
                          <TouchableOpacity
                            key={tier.key}
                            activeOpacity={0.75}
                            onPress={() => {
                              feedback.tap();
                              setExperience(tier.key);
                            }}
                            style={[styles.experienceCard, isSel && styles.experienceCardActive]}
                          >
                            <View style={styles.expIconRow}>
                              <View style={[styles.expIconBox, { backgroundColor: `${tier.color}25` }]}>
                                <Ionicons name={tier.icon as any} size={18} color={tier.color} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.expTitle}>{tier.title}</Text>
                                <Text style={styles.expDesc}>{tier.desc}</Text>
                              </View>
                              <View
                                style={[
                                  styles.radioCircle,
                                  isSel && { borderColor: tier.color, backgroundColor: tier.color },
                                ]}
                              >
                                {isSel ? <View style={styles.radioDot} /> : null}
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Weekly Training Frequency */}
                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>TRAINING DAYS PER WEEK</Text>
                    <View style={styles.daysRow}>
                      {DAYS_OPTIONS.map(d => {
                        const isSel = daysPerWeek === d.days;
                        return (
                          <TouchableOpacity
                            key={`days-${d.days}`}
                            activeOpacity={0.7}
                            onPress={() => {
                              feedback.tap();
                              setDaysPerWeek(d.days);
                            }}
                            style={[styles.dayChoiceCard, isSel && styles.dayChoiceCardActive]}
                          >
                            <Text style={[styles.dayChoiceNumber, isSel && styles.dayChoiceNumberActive]}>
                              {d.days}
                            </Text>
                            <Text style={[styles.dayChoiceDays, isSel && styles.dayChoiceDaysActive]}>
                              Days
                            </Text>
                            <Text style={[styles.dayChoiceRecommend, isSel && styles.dayChoiceRecommendActive]}>
                              {d.recommend}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* ── Fixed Bottom Actions Footer ── */}
          <View
            style={[
              styles.bottomFooter,
              { paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8) + 6 },
            ]}
          >
            <Animated.View style={{ transform: [{ scale: btnScaleAnim }] }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleNext}
                style={styles.primaryActionBtn}
              >
                <Text style={styles.primaryActionBtnText}>
                  {STEP_META[currentStep]?.nextLabel || "Let's Start to the App 🚀"}
                </Text>
                {currentStep < 5 && (
                  <View style={styles.actionArrowCircle}>
                    <Ionicons name="arrow-forward" size={15} color="#000000" />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </>
      )}
    </SafeAreaView>
      </View>
    </Modal>
  );
}

// ── Slider Styles ─────────────────────────────────────────────────────────────

const sliderStyles = StyleSheet.create({
  container: {
    backgroundColor: '#151518',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#8E8E93',
    letterSpacing: 0.8,
  },
  secondaryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  secondaryText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11.5,
    color: '#FFFFFF',
  },
  readoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 12,
  },
  stepperBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  valueCenter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  bigValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 38,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  unitText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 16,
    color: '#8E8E93',
  },
  trackTouchable: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBackground: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 5,
  },
  thumb: {
    position: 'absolute',
    top: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
    elevation: 5,
  },
  thumbActive: {
    transform: [{ scale: 1.18 }],
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 8,
    borderColor: '#A599FF',
    borderWidth: 1.5,
  },
  thumbInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  minMaxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 8,
  },
  minMaxText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10.5,
    color: '#636366',
  },
  presetsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  presetChipText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#8E8E93',
  },
});

// ── Screen & Wizard Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#08080B',
  },
  safeContainer: {
    flex: 1,
    backgroundColor: '#08080B',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  progressRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 14,
  },
  progressSegmentTrack: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  progressSegmentFill: {
    height: '100%',
    borderRadius: 2.5,
    backgroundColor: '#A599FF',
  },
  progressSegmentGlow: {
    shadowColor: '#A599FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 3,
  },
  stepCounterWrap: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  stepCounterText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    color: '#A599FF',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
  animatedStepContainer: {
    flex: 1,
  },
  stepWrapper: {
    flex: 1,
  },
  avatarHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarRingGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A599FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    backgroundColor: '#121215',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#08080B',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxWidth: '90%',
  },
  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#30D158',
  },
  verifiedBadgeText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#E0E0E6',
  },
  titleSection: {
    marginBottom: 12,
  },
  stepPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginBottom: 4,
  },
  stepPillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    color: '#A599FF',
    letterSpacing: 0.6,
  },
  stepHeading: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  stepSubHeading: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 17,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  inputLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    color: '#8E8E93',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  textInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151518',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  textInputBoxFocused: {
    borderColor: '#A599FF',
    backgroundColor: '#18181D',
  },
  textInputField: {
    flex: 1,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderCard: {
    flex: 1,
    backgroundColor: '#151518',
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  genderCardActive: {
    backgroundColor: '#A599FF',
    borderColor: '#A599FF',
    shadowColor: '#A599FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  genderCardText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8E8E93',
  },
  genderCardTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#000000',
  },
  genderCheckDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageBadge: {
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  ageBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    color: '#30D158',
  },
  ageSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#151518',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  ageCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  ageValueWrap: {
    alignItems: 'center',
  },
  ageValueBig: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 27,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  ageUnit: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10.5,
    color: '#8E8E93',
    marginTop: 1,
  },
  agePresetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  agePresetChip: {
    flex: 1,
    marginHorizontal: 2.5,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  agePresetChipActive: {
    backgroundColor: 'rgba(165, 153, 255, 0.18)',
    borderColor: '#A599FF',
  },
  agePresetChipText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    color: '#8E8E93',
  },
  agePresetChipTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#A599FF',
  },
  metricTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  metricTabBtn: {
    flex: 1,
    backgroundColor: '#151518',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricTabBtnActive: {
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
    borderColor: '#A599FF',
  },
  metricTabLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 2,
  },
  metricTabLabelActive: {
    color: '#A599FF',
    fontFamily: FONT_FAMILY.bold,
  },
  metricTabValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  metricTabValueActive: {
    color: '#FFFFFF',
  },
  biometricInsightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(165, 153, 255, 0.08)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(165, 153, 255, 0.2)',
    marginTop: 4,
  },
  insightIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(165, 153, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  insightSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11.5,
    color: '#A599FF',
    marginTop: 2,
  },
  goalsContainer: {
    gap: 10,
  },
  goalCard: {
    backgroundColor: '#151518',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  goalCardActive: {
    borderColor: '#A599FF',
    backgroundColor: 'rgba(165, 153, 255, 0.08)',
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(165, 153, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  goalTitleCol: {
    flex: 1,
  },
  goalCardTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  goalCardSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
  goalBadgeRight: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
    marginRight: 8,
  },
  goalBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    color: '#A599FF',
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  curatedMuscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  curatedMuscleCard: {
    width: '48.5%',
    backgroundColor: '#151518',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  curatedMuscleCardActive: {
    borderColor: '#A599FF',
    backgroundColor: 'rgba(165, 153, 255, 0.1)',
  },
  curatedCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  curatedMuscleIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  curatedCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  curatedMuscleName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
    marginBottom: 1,
  },
  curatedMuscleNameActive: {
    color: '#A599FF',
  },
  curatedMuscleSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    color: '#8E8E93',
  },
  experienceContainer: {
    gap: 7,
    marginBottom: 6,
  },
  experienceCard: {
    backgroundColor: '#151518',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  experienceCardActive: {
    borderColor: '#A599FF',
    backgroundColor: 'rgba(165, 153, 255, 0.07)',
  },
  expIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  expTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  expDesc: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10.5,
    color: '#8E8E93',
    marginTop: 1,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  radioDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000000',
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayChoiceCard: {
    flex: 1,
    backgroundColor: '#151518',
    borderRadius: 13,
    paddingVertical: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dayChoiceCardActive: {
    borderColor: '#A599FF',
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
  },
  dayChoiceNumber: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  dayChoiceNumberActive: {
    color: '#A599FF',
  },
  dayChoiceDays: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 1,
  },
  dayChoiceDaysActive: {
    color: '#FFFFFF',
  },
  dayChoiceRecommend: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 9,
    color: '#636366',
    marginTop: 4,
    textAlign: 'center',
  },
  dayChoiceRecommendActive: {
    color: '#A599FF',
  },
  bottomFooter: {
    paddingHorizontal: 20,
    paddingTop: 4,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A599FF',
    height: 44,
    borderRadius: 13,
    shadowColor: '#A599FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#000000',
    letterSpacing: 0.2,
  },
  actionArrowCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  // ── Overview Profile Card Styles ──
  overviewTopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  overviewTitleCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overviewTitleText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  overviewActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#30D158',
  },
  overviewTopEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(165, 153, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(165, 153, 255, 0.2)',
    gap: 4,
  },
  overviewTopEditText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#A599FF',
  },
  overviewScroll: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  heroPassportCard: {
    backgroundColor: '#151518',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroAvatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A599FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  heroAvatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    backgroundColor: '#121215',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#08080B',
  },
  heroAthleteName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    color: '#FFFFFF',
    marginTop: 10,
  },
  heroAthleteSub: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11,
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  heroVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(48, 209, 88, 0.1)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.2)',
  },
  heroVerifiedText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    color: '#30D158',
    letterSpacing: 0.5,
  },
  heroPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(165, 153, 255, 0.1)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(165, 153, 255, 0.2)',
  },
  heroPlanText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    color: '#A599FF',
    letterSpacing: 0.5,
  },
  overviewStatsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  overviewStatTile: {
    flex: 1,
    backgroundColor: '#151518',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  overviewStatLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  overviewStatValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  overviewStatSub: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 10,
    color: '#A599FF',
    marginTop: 2,
  },
  overviewSectionCard: {
    backgroundColor: '#151518',
    borderRadius: 16,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  overviewSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  overviewSectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10.5,
    color: '#8E8E93',
    letterSpacing: 0.8,
  },
  overviewChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  overviewGoalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(165, 153, 255, 0.09)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(165, 153, 255, 0.22)',
    gap: 6,
  },
  overviewGoalChipText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  overviewMiniBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginLeft: 2,
  },
  overviewMiniBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9,
    color: '#A599FF',
  },
  overviewMuscleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    gap: 5,
  },
  overviewMuscleChipText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11.5,
    color: '#FFFFFF',
  },
  overviewScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  overviewScheduleCol: {
    flex: 1,
  },
  overviewScheduleDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 12,
  },
  overviewScheduleLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  overviewScheduleVal: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  overviewEditActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A599FF',
    height: 46,
    borderRadius: 14,
    marginTop: 6,
    shadowColor: '#A599FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  overviewEditActionBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#000000',
    letterSpacing: 0.3,
  },
});
