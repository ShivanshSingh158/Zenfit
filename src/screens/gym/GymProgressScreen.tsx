/**
 * GymProgressScreen.tsx — ZenFit
 *
 * Tab 4: 🧬 Body (Physique, Recovery & Profile)
 * - Section 1: Live Muscle Recovery & Fatigue Map (AnatomicalBodyMapCard default to fatigue)
 * - Section 2: Bodyweight, BMI & Target Progress (Inline Weight, BMI & Weight Trend Chart)
 * - Section 3: Physique Transformation (BeforeAfterSlider comparing Day 1 vs Today)
 * - Header: [ ⚙️ Settings / Profile ] navigating to GymProfileScreen
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS, FONT_FAMILY, RADIUS, SPACE } from '../../theme/tokens';
import { useWellnessData } from '../../contexts/domains/WellnessContext';
import { GymNavigationParamList } from '../../types/gym.types';
import { useTheme } from '../../contexts/ThemeContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { useGymProfile } from '../../hooks/useGymProfile';

import AnatomicalBodyMapCard from '../../components/Gym/AnatomicalBodyMapCard';
import BodyMetricsSheet from '../../components/Gym/BodyMetricsSheet';
import BodyMetricsHistoryChart, { WeightChartEntry } from '../../components/Gym/BodyMetricsHistoryChart';
import BeforeAfterSlider from '../../components/Gym/BeforeAfterSlider';
import { makeBodyMetricsStyles } from '../../components/Gym/bodyMetricsStyles';

const WEIGHT_LOGS_KEY = 'zentrack_weight_logs_v1';

function classifyBMI(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: '#60a5fa' };
  if (bmi < 25) return { label: 'Normal', color: '#34d399' };
  if (bmi < 30) return { label: 'Overweight', color: '#fb923c' };
  return { label: 'Obese', color: '#f87171' };
}

interface WeightEntry {
  id?: string;
  weight: number;
  weightKg?: number;
  date: string;
  photoUrl?: string | null;
}

export default function GymProgressScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<GymNavigationParamList>>();
  const bmStyles = useMemo(() => makeBodyMetricsStyles(colors, isDark), [colors, isDark]);

  const { gymLogs, weightLogs: contextWeightLogs } = useWellnessData();
  const { gymProfile } = useGymProfile();

  const [showBodyMetrics, setShowBodyMetrics] = useState(false);
  const [localLogs, setLocalLogs] = useState<WeightEntry[]>([]);
  const [photoEntries, setPhotoEntries] = useState<{ date: string; photoUrl: string }[]>([]);

  // Load local weight logs & photos from storage
  const loadLogs = async () => {
    try {
      const raw = await AsyncStorage.getItem(WEIGHT_LOGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setLocalLogs(parsed);
          const withPhotos = parsed
            .filter((l: any) => l.photoUrl)
            .map((l: any) => ({ date: l.date, photoUrl: l.photoUrl }))
            .sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));
          setPhotoEntries(withPhotos);
        }
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadLogs();
  }, [showBodyMetrics]);

  // Combine context and local weight logs
  const combinedLogs = useMemo(() => {
    const map = new Map<string, WeightEntry>();
    localLogs.forEach(l => {
      if (l.date && l.weight) map.set(l.date, l);
    });
    (contextWeightLogs || []).forEach((l: any) => {
      const w = l.weightKg ?? l.weight;
      if (l.date && w) map.set(l.date, { id: l.id, weight: w, date: l.date, photoUrl: l.photoUrl });
    });
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [contextWeightLogs, localLogs]);

  const chronoLogs = useMemo(() => [...combinedLogs].reverse(), [combinedLogs]);

  // Key Athlete Biology Metrics
  const latestWeight = combinedLogs[0]?.weight ?? gymProfile.weightKg ?? null;
  const heightCm = gymProfile.heightCm ?? null;

  const bmi = latestWeight && heightCm && heightCm > 0
    ? Math.round((latestWeight / ((heightCm / 100) ** 2)) * 10) / 10
    : null;
  const bmiClass = bmi ? classifyBMI(bmi) : null;

  const targetWeight = (gymProfile as any).targetWeightKg ?? null;
  const startWeight = chronoLogs[0]?.weight ?? latestWeight;
  const currentWeight = combinedLogs[0]?.weight ?? latestWeight;
  const weightDelta = (currentWeight && startWeight) ? parseFloat((currentWeight - startWeight).toFixed(1)) : 0;

  const targetProgress = (latestWeight && targetWeight && startWeight && startWeight !== targetWeight)
    ? Math.min(Math.max((latestWeight - startWeight) / (targetWeight - startWeight), 0), 1)
    : null;

  // Recent 8 logs for Weight Trend Chart
  const last8: WeightChartEntry[] = useMemo(
    () => combinedLogs.slice(0, 8).reverse().map(l => ({ weight: l.weight, date: l.date })),
    [combinedLogs]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#000000' : colors.background }} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />

      {/* Top Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 12,
      }}>
        <View>
          <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 22, color: colors.textPrimary }}>
            Body & Recovery
          </Text>
          <Text style={{ fontSize: 12, color: colors.textTertiary, fontFamily: FONT_FAMILY.medium, marginTop: 1 }}>
            {latestWeight ? `${latestWeight} kg • Muscle Readiness & Fatigue` : 'Live Recovery & Physique Hub'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            hapticLight();
            navigation.navigate('GymProfile');
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 12,
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={16} color={colors.textSecondary} />
          <Text style={{ fontSize: 12, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary }}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* ── Section 1: Live Muscle Recovery & Fatigue Map ── */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 2 }}>
            <View>
              <Text style={{ fontSize: 15, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary }}>
                Muscle Readiness & Recovery
              </Text>
              <Text style={{ fontSize: 11, fontFamily: FONT_FAMILY.medium, color: colors.textMuted }}>
                Scientific exponential recovery modeling from your workout logs
              </Text>
            </View>
          </View>

          <AnatomicalBodyMapCard
            gymLogs={gymLogs as any}
            variant="weekly"
            defaultMode="fatigue"
          />
        </View>

        {/* ── Section 2: Bodyweight, BMI & Target Progress (Inline) ── */}
        <View style={{
          backgroundColor: isDark ? '#141418' : colors.surface,
          borderRadius: 20,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.07)' : colors.border,
          gap: 14,
        }}>
          {/* Card Header & Log Weight Button */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1, paddingRight: 4 }}>
              <Text style={{ fontSize: 16, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary }} numberOfLines={1}>
                Body Composition
              </Text>
              <Text style={{ fontSize: 11, fontFamily: FONT_FAMILY.medium, color: colors.textMuted }} numberOfLines={1}>
                Weight, BMI & Milestone Progress
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                hapticLight();
                setShowBodyMetrics(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 10,
                backgroundColor: isDark ? 'rgba(165,153,255,0.15)' : 'rgba(108,92,231,0.12)',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(165,153,255,0.3)' : 'rgba(108,92,231,0.25)',
                flexShrink: 0,
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={14} color={colors.accentPrimary || '#a599ff'} />
              <Text style={{ fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: colors.accentPrimary || '#a599ff' }}>
                Log Weight
              </Text>
            </TouchableOpacity>
          </View>

          {/* 3-Card Stats Grid */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* Start Weight */}
            <View style={{
              flex: 1,
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderRadius: 14,
              padding: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border,
            }}>
              <Text style={{ fontSize: 10, fontFamily: FONT_FAMILY.bold, color: colors.textMuted, textTransform: 'uppercase' }}>
                START
              </Text>
              <Text style={{ fontSize: 18, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary, marginTop: 2 }}>
                {startWeight ? `${startWeight} kg` : '—'}
              </Text>
            </View>

            {/* Current Weight */}
            <View style={{
              flex: 1,
              backgroundColor: isDark ? 'rgba(165,153,255,0.08)' : 'rgba(108,92,231,0.06)',
              borderRadius: 14,
              padding: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(165,153,255,0.2)' : 'rgba(108,92,231,0.15)',
            }}>
              <Text style={{ fontSize: 10, fontFamily: FONT_FAMILY.bold, color: colors.accentPrimary || '#a599ff', textTransform: 'uppercase' }}>
                CURRENT
              </Text>
              <Text style={{ fontSize: 18, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary, marginTop: 2 }}>
                {currentWeight ? `${currentWeight} kg` : '—'}
              </Text>
            </View>

            {/* Change */}
            <View style={{
              flex: 1,
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderRadius: 14,
              padding: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border,
            }}>
              <Text style={{ fontSize: 10, fontFamily: FONT_FAMILY.bold, color: colors.textMuted, textTransform: 'uppercase' }}>
                CHANGE
              </Text>
              <Text style={{
                fontSize: 18,
                fontFamily: FONT_FAMILY.bold,
                marginTop: 2,
                color: (startWeight && currentWeight) ? (weightDelta < 0 ? '#34d399' : weightDelta > 0 ? '#fb923c' : colors.textPrimary) : colors.textPrimary,
              }}>
                {(startWeight && currentWeight) ? (weightDelta > 0 ? `+${weightDelta} kg` : `${weightDelta} kg`) : '—'}
              </Text>
            </View>
          </View>

          {/* BMI Pod */}
          {bmi ? (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 12,
              borderRadius: 14,
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border,
              gap: 14,
            }}>
              <View style={{
                alignItems: 'center',
                paddingRight: 14,
                borderRightWidth: 1,
                borderRightColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
              }}>
                <Text style={{ fontSize: 9, fontFamily: FONT_FAMILY.bold, color: colors.textMuted, letterSpacing: 0.5 }}>
                  BODY MASS INDEX
                </Text>
                <Text style={{ fontSize: 24, fontFamily: FONT_FAMILY.bold, color: bmiClass?.color || colors.textPrimary }}>
                  {bmi}
                </Text>
                <View style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor: (bmiClass?.color || '#a599ff') + '22',
                  marginTop: 2,
                }}>
                  <Text style={{ fontSize: 10, fontFamily: FONT_FAMILY.bold, color: bmiClass?.color || '#a599ff' }}>
                    {bmiClass?.label}
                  </Text>
                </View>
              </View>

              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 12, fontFamily: FONT_FAMILY.body, color: colors.textSecondary }}>
                  Height: <Text style={{ fontFamily: FONT_FAMILY.bold, color: colors.textPrimary }}>{heightCm} cm</Text>
                </Text>
                {targetWeight && (
                  <Text style={{ fontSize: 12, fontFamily: FONT_FAMILY.body, color: colors.textSecondary }}>
                    Target Weight: <Text style={{ fontFamily: FONT_FAMILY.bold, color: colors.accentPrimary || '#a599ff' }}>{targetWeight} kg</Text>
                  </Text>
                )}
                <Text style={{ fontSize: 11, fontFamily: FONT_FAMILY.body, color: colors.textMuted }}>
                  Healthy BMI Range: 18.5 – 24.9
                </Text>
              </View>
            </View>
          ) : null}

          {/* Weight Trend History Chart */}
          {last8.length >= 2 ? (
            <BodyMetricsHistoryChart
              entries={last8}
              styles={bmStyles}
              colors={colors}
              isDark={isDark}
            />
          ) : null}
        </View>

        {/* ── Section 3: Visual Physique Transformation ── */}
        <View style={{
          backgroundColor: isDark ? '#141418' : colors.surface,
          borderRadius: 20,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.07)' : colors.border,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 16, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary }}>
                Physique Transformation
              </Text>
              <Text style={{ fontSize: 11, fontFamily: FONT_FAMILY.medium, color: colors.textMuted }}>
                {photoEntries.length >= 2
                  ? 'Drag slider to compare Day 1 vs. Today'
                  : 'Track visual physique definition over time'}
              </Text>
            </View>

            {photoEntries.length >= 2 && (
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: isDark ? 'rgba(165,153,255,0.12)' : 'rgba(108,92,231,0.1)',
              }}>
                <Text style={{ fontSize: 11, fontFamily: FONT_FAMILY.bold, color: colors.accentPrimary || '#a599ff' }}>
                  {photoEntries[0].date} vs {photoEntries[photoEntries.length - 1].date}
                </Text>
              </View>
            )}
          </View>

          {photoEntries.length >= 2 ? (
            <BeforeAfterSlider
              beforeImage={photoEntries[0].photoUrl}
              afterImage={photoEntries[photoEntries.length - 1].photoUrl}
            />
          ) : (
            <View style={{
              alignItems: 'center',
              paddingVertical: 20,
              paddingHorizontal: 16,
              borderRadius: 14,
              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border,
              gap: 8,
            }}>
              <Ionicons name="camera-outline" size={32} color={colors.textTertiary} />
              <Text style={{ fontSize: 13, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary }}>
                No Check-In Photos Yet
              </Text>
              <Text style={{ fontSize: 12, fontFamily: FONT_FAMILY.body, color: colors.textMuted, textAlign: 'center', lineHeight: 16 }}>
                Snap or upload physique check-ins whenever you log weight. As you log 2+ photos, an interactive Before & After slider will automatically appear here!
              </Text>
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  setShowBodyMetrics(true);
                }}
                style={{
                  marginTop: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surface2,
                }}
              >
                <Text style={{ fontSize: 12, fontFamily: FONT_FAMILY.bold, color: colors.accentPrimary || '#a599ff' }}>
                  Add First Check-In Photo
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Body Metrics & Photo Logging Sheet */}
      <BodyMetricsSheet
        visible={showBodyMetrics}
        onClose={() => setShowBodyMetrics(false)}
      />
    </SafeAreaView>
  );
}
