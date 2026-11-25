import React from 'react';
import {
  View,
  Text,
  ScrollView,
} from 'react-native';
import { GymPlanDay } from '../../../../types/gym.types';
import { SPACE } from '../../../../theme/tokens';
import { useTheme } from '../../../../contexts/ThemeContext';
import { NumericText } from '../../../../components/ui';
import { IOSSegmentedControl } from '../../../../components/ui/IOSSegmentedControl';
import { RollingNumber } from '../../../../components/ui/RollingNumber';
import { hapticLight } from '../../../../utils/haptics';
import { getRotationLetterForDay } from '../../../../services/gymRotationService';
import WeeklyDayCard from '../../../../components/Gym/schedule/WeeklyDayCard';
import { useSplitsStyles } from '../styles/gymSplitsStyles';

export interface ScheduleTabProps {
  isRotation: boolean;
  setScheduleMode: (mode: 'calendar' | 'rotation') => void;
  trainingDaysCount: number;
  resolvedDays: { dayIndex: number; dayName: string; planDay: GymPlanDay }[];
  currentDayOfWeek: number;
  rotationDays: any[];
  dayShortNames: string[];
  isDark: boolean;
  onSelectDay: (dayIndex: number) => void;
  onEditDay?: (dayObj: any) => void;
  weeklyPlannedAudit: { totalSets: number; topMuscles: string[] };
  replayKey?: number | string;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = React.memo(({
  isRotation,
  setScheduleMode,
  trainingDaysCount,
  resolvedDays,
  currentDayOfWeek,
  rotationDays,
  dayShortNames,
  isDark,
  onSelectDay,
  weeklyPlannedAudit,
  replayKey = 0,
}) => {
  const { tokens } = useTheme();
  const styles = useSplitsStyles();

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* ── Borderless Mode Control Strip ── */}
      <View style={styles.scheduleModeStrip}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.howYouTrainTitle}>Weekly schedule</Text>
          <Text style={styles.howYouTrainSubtitle}>
            {!isRotation ? 'Fixed weekdays every week' : 'Rolling workout order'}
          </Text>
        </View>

        <View style={{ minWidth: 138, width: '44%', maxWidth: 184 }}>
          <IOSSegmentedControl
            segments={[
              { id: 'calendar', label: 'Fixed' },
              { id: 'rotation', label: 'Rotation' },
            ]}
            activeId={isRotation ? 'rotation' : 'calendar'}
            onSelect={(id) => {
              if (setScheduleMode) setScheduleMode(id as 'calendar' | 'rotation');
            }}
            height={36}
            activeTextColor={tokens.accent.onPrimary}
            style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : tokens.bg.elevated,
            }}
          />
        </View>
      </View>

      {/* ── "This Week" Borderless Hairline 7-Day Ledger ── */}
      <View>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>THIS WEEK</Text>
          <NumericText style={styles.sectionHeaderSub}>
            {trainingDaysCount} workouts · {weeklyPlannedAudit.totalSets} sets
          </NumericText>
        </View>

        <View style={{ marginTop: SPACE[4] }}>
          {resolvedDays.map((d, idx) => {
            const isToday = d.dayIndex === (currentDayOfWeek === 0 ? 7 : currentDayOfWeek);
            const isRest = Boolean(d.planDay.isRest);
            const dayShort = dayShortNames[d.dayIndex - 1] || `D${d.dayIndex}`;
            const title = isRotation && !isRest
              ? `${getRotationLetterForDay(d.dayIndex, rotationDays)} · ${d.planDay.name}`
              : (isRest ? 'Rest & Recover' : d.planDay.name);

            return (
              <WeeklyDayCard
                key={`stacked-day-${d.dayIndex}`}
                dayShort={dayShort}
                dayName={d.dayName}
                routineTitle={title}
                subtitle={d.planDay.focus || d.planDay.subtitle}
                exerciseCount={d.planDay.exercises?.length || 0}
                exercises={d.planDay.exercises || []}
                isRest={isRest}
                isToday={isToday}
                isLast={idx === resolvedDays.length - 1}
                isDark={isDark}
                onPress={() => {
                  hapticLight();
                  onSelectDay(d.dayIndex);
                }}
              />
            );
          })}
        </View>
      </View>

      {/* ── Open Borderless Weekly Summary Strip ── */}
      <View style={styles.volumeOverviewStrip}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardSectionLabel}>WEEKLY TOTAL</Text>
          {weeklyPlannedAudit.topMuscles.length > 0 ? (
            <NumericText style={styles.volumeOverviewMuscles} numberOfLines={1}>
              Top focus: {weeklyPlannedAudit.topMuscles.slice(0, 3).join(' · ')}
            </NumericText>
          ) : null}
        </View>

        <RollingNumber
          value={weeklyPlannedAudit.totalSets}
          suffix=" sets"
          replayKey={replayKey}
          cycles={1}
          durationMs={520}
          style={styles.volumeOverviewTotal}
        />
      </View>
    </ScrollView>
  );
});

export default ScheduleTab;
