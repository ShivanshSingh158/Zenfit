import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withDelay } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

import { GymNavigationParamList } from '../../types/gym.types';
import { springs } from '../../theme/motion';
import { useWellnessData } from '../../contexts/domains/WellnessContext';
import { calculateGymStreak } from '../../utils/gymUtils';
import { computeOrGetHotCache, generateDatasetFingerprint } from '../../utils/hotCacheStore';
import { useTheme } from '../../contexts/ThemeContext';

import { makeGymHistoryStyles } from './gymHistoryStyles';
import GymHeatmapCard, { HeatmapDay } from '../../components/Gym/GymHeatmapCard';
import PRHallOfFameSheet from '../../components/Gym/PRHallOfFameSheet';
import { VolumeBarChart } from '../../components/Gym/Charts/VolumeBarChart';
import { PRFeed } from '../../components/Gym/Charts/PRFeed';
import { hapticLight } from '../../utils/haptics';

const WEEKS = 13;
const DAYS_PER_WEEK = 7;

export default function GymHistoryScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeGymHistoryStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<NativeStackNavigationProp<GymNavigationParamList>>();
  const { gymLogs, userGymPlan } = useWellnessData();

  // Streak
  const streak = useMemo(() => calculateGymStreak(gymLogs, userGymPlan), [gymLogs, userGymPlan]);

  // Entrance animation for streak card
  const streakScale = useSharedValue(0.7);
  const streakOpacity = useSharedValue(0);
  useEffect(() => {
    streakOpacity.value = withDelay(100, withSpring(1, springs.gentle));
    streakScale.value = withDelay(100, withSequence(
      withSpring(1.08, springs.bouncy),
      withSpring(1, springs.snappy)
    ));
  }, []);

  const streakStyle = useAnimatedStyle(() => ({
    transform: [{ scale: streakScale.value }],
    opacity: streakOpacity.value,
  }));

  // Heatmap generation
  const heatmapData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const cacheKey = `history_heatmap_${dateKey}_${generateDatasetFingerprint(gymLogs)}`;

    return computeOrGetHotCache(cacheKey, () => {
      const logMap = new Map<string, any>();
      gymLogs.forEach(log => {
        const key = log.date.slice(0, 10);

        let totalSets = 0;
        log.exercises?.forEach(ex => {
          if (ex.skipped) return;
          totalSets += ex.setsLog?.filter((s: any) => s.completed).length || 0;
        });

        logMap.set(key, { totalSets, log });
      });

      const grid: HeatmapDay[][] = [];
      const startDay = new Date(today);
      startDay.setDate(today.getDate() - today.getDay() - (WEEKS - 1) * 7);

      for (let w = 0; w < WEEKS; w++) {
        const weekCol: HeatmapDay[] = [];
        for (let d = 0; d < DAYS_PER_WEEK; d++) {
          const currentDate = new Date(startDay);
          currentDate.setDate(startDay.getDate() + (w * 7) + d);

          const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
          const data = logMap.get(key);

          weekCol.push({
            date: currentDate,
            dateStr: key,
            isFuture: currentDate > today,
            intensity: data ? Math.max(0.3, Math.min(1.0, data.totalSets / 20)) : 0,
            log: data?.log || null,
          });
        }
        grid.push(weekCol);
      }
      return grid;
    });
  }, [gymLogs]);

  // Past Sessions list (sorted newest first)
  const pastSessions = useMemo(() => {
    return (gymLogs || [])
      .filter(l => {
        const hasSets = (l.exercises || []).some(ex => (ex.setsLog || []).some((s: any) => s.completed));
        const hasCardio = (l.cardio || []).some((c: any) => c.completed);
        return l.completed || hasSets || hasCardio;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [gymLogs]);

  const [showPRHallOfFame, setShowPRHallOfFame] = useState(false);

  // Weekly Volume calculation
  const weeklyVolumeData = useMemo(() => {
    const weeks: { [key: string]: number } = {};
    const now = new Date();
    for (let i = 4; i >= 0; i--) {
      const label = i === 0 ? 'This Wk' : `${i}w ago`;
      weeks[label] = 0;
    }
    const weekLabels = Object.keys(weeks);
    (gymLogs || []).forEach(log => {
      if (!log.date) return;
      const logDate = new Date(log.date);
      const diffDays = Math.floor((now.getTime() - logDate.getTime()) / (1000 * 3600 * 24));
      const weekIndex = Math.floor(diffDays / 7);
      if (weekIndex >= 0 && weekIndex <= 4) {
        const label = weekIndex === 0 ? 'This Wk' : `${weekIndex}w ago`;
        let vol = 0;
        log.exercises?.forEach(ex => {
          ex.setsLog?.forEach(s => {
            if (s.completed && s.weight && s.reps) {
              vol += Number(s.weight) * Number(s.reps);
            }
          });
        });
        if (weeks[label] !== undefined) {
          weeks[label] += vol;
        }
      }
    });
    return weekLabels.map(label => ({ label, volume: Math.round(weeks[label]) }));
  }, [gymLogs]);

  // PR Feed calculation
  const prFeedData = useMemo(() => {
    const list: { date: Date; dateStr: string; rawWeight: number; rawReps: number; volume: number }[] = [];
    (gymLogs || []).forEach(log => {
      if (!log.date) return;
      let maxW = 0;
      let maxR = 0;
      let vol = 0;
      log.exercises?.forEach(ex => {
        ex.setsLog?.forEach(s => {
          if (s.completed && s.weight && s.reps) {
            const w = Number(s.weight);
            const r = Number(s.reps);
            if (w > maxW) { maxW = w; maxR = r; }
            vol += w * r;
          }
        });
      });
      if (maxW > 0) {
        list.push({
          date: new Date(log.date),
          dateStr: log.date.slice(5),
          rawWeight: maxW,
          rawReps: maxR,
          volume: vol,
        });
      }
    });
    return list;
  }, [gymLogs]);

  const handleSelectDay = useCallback((dateStr: string) => {
    navigation.navigate('WorkoutSummary', { date: dateStr, readOnly: true });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <Text style={styles.headerTitle}>Workout History</Text>
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            setShowPRHallOfFame(true);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor: isDark ? 'rgba(255, 209, 102, 0.12)' : 'rgba(217, 119, 6, 0.1)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 209, 102, 0.28)' : 'rgba(217, 119, 6, 0.22)',
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="trophy" size={14} color="#FFD166" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#FFD166' : '#D97706' }}>
            PR Hall of Fame
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 110 }]} showsVerticalScrollIndicator={false}>
        {/* Streak Counter */}
        <Animated.View style={[styles.streakCard, streakStyle]}>
          <View style={styles.streakLeft}>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={20} color={isDark ? '#FFD166' : '#D97706'} style={{ marginRight: 6 }} />
              <Text style={[styles.streakBadgeText, { color: isDark ? '#FFD166' : '#D97706' }]}>{streak}</Text>
            </View>
            <View>
              <Text style={styles.streakTitle}>Day Streak</Text>
              <Text style={styles.streakSubtitle}>Keep the momentum going!</Text>
            </View>
          </View>
        </Animated.View>

        {/* Heatmap Card */}
        <GymHeatmapCard
          heatmapData={heatmapData}
          onSelectDay={handleSelectDay}
          styles={styles}
          isDark={isDark}
        />

        {/* PR Feed Highlights */}
        {prFeedData.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <PRFeed data={prFeedData} />
          </View>
        )}

        {/* Weekly Volume Progression */}
        {weeklyVolumeData.some(d => d.volume > 0) && (
          <View style={{ marginTop: 14 }}>
            <VolumeBarChart data={weeklyVolumeData} height={140} />
          </View>
        )}

        {/* Past Sessions Section */}
        <View style={{ marginTop: 20 }}>
          <Text style={{
            fontSize: 13,
            fontWeight: '700',
            letterSpacing: 1.5,
            color: colors.textTertiary,
            marginBottom: 12,
            marginLeft: 4,
            textTransform: 'uppercase',
          }}>
            PAST SESSIONS ({pastSessions.length})
          </Text>

          {pastSessions.length === 0 ? (
            <View style={{
              backgroundColor: isDark ? '#1C1C1E' : colors.surface,
              borderRadius: 16,
              padding: 24,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border,
            }}>
              <Ionicons name="fitness-outline" size={32} color={colors.textTertiary} style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                No Past Workouts Logged Yet
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 18, marginBottom: 14 }}>
                Your completed workout logs, tonnage, and exercise history will appear here.
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: isDark ? 'rgba(165,153,255,0.15)' : 'rgba(108,92,231,0.1)',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(165,153,255,0.3)' : 'rgba(108,92,231,0.25)',
                }}
                onPress={() => (navigation as any).navigate('Today')}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#A599FF' : '#6C5CE7' }}>
                  Start Today's Workout
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            pastSessions.map((session: any) => {
              const completedExercises = (session.exercises || []).filter((e: any) =>
                (e.setsLog || []).some((s: any) => s.completed)
              );
              const totalVolume = (session.exercises || []).reduce((acc: number, ex: any) => {
                return acc + (ex.setsLog || []).reduce((sAcc: number, s: any) => {
                  return sAcc + (s.completed ? (Number(s.weight) || 0) * (Number(s.reps) || 0) : 0);
                }, 0);
              }, 0);

              return (
                <TouchableOpacity
                  key={session.id || session.date}
                  style={{
                    backgroundColor: isDark ? '#1C1C1E' : colors.surface,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  activeOpacity={0.7}
                  onPress={() => handleSelectDay(session.date)}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>
                      {session.date}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>
                      {completedExercises.length} exercises
                      {session.workoutDurationMinutes ? ` • ${session.workoutDurationMinutes} min` : ''}
                      {totalVolume > 0 ? ` • ${Math.round(totalVolume)} kg total` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* PR Hall of Fame Sheet */}
      <PRHallOfFameSheet
        visible={showPRHallOfFame}
        onClose={() => setShowPRHallOfFame(false)}
      />
    </SafeAreaView>
  );
}
