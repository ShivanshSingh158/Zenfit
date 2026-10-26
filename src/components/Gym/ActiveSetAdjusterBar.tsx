import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FONT_FAMILY } from '../../theme/tokens';

interface ActiveSetAdjusterBarProps {
  exercise: any;
  colors: any;
  isDark: boolean;
  styles: any;
  onSetRIR: (rir: number) => void;
  onAdjustWeight: (delta: number) => void;
  onAdjustReps: (delta: number) => void;
}

const RIR_OPTIONS = [
  { val: 0, label: '0 (Max)' },
  { val: 1, label: '1' },
  { val: 2, label: '2' },
  { val: 3, label: '3+' },
];

/**
 * 1-Tap RIR Effort Quick Selector + Micro-Stepper Adjuster Bar (-2.5kg, +2.5kg, -1 rep, +1 rep).
 * Memoized to prevent re-rendering during unrelated parent state changes.
 */
export const ActiveSetAdjusterBar: React.FC<ActiveSetAdjusterBarProps> = React.memo(({
  exercise,
  colors,
  isDark,
  styles,
  onSetRIR,
  onAdjustWeight,
  onAdjustReps,
}) => {
  if (!exercise || !exercise.setsLog || exercise.setsLog.length === 0) return null;

  const curActiveSet = exercise.setsLog.find((s: any) => !s.completed) || exercise.setsLog[exercise.setsLog.length - 1];

  return (
    <View>
      {/* RIR (Effort) Quick Selector */}
      <View style={styles.rirContainer}>
        <Text style={styles.rirLabel}>RIR:</Text>
        {RIR_OPTIONS.map(item => {
          const isSelected = curActiveSet?.rir === item.val;
          return (
            <TouchableOpacity
              key={`rir-${item.val}`}
              onPress={() => onSetRIR(item.val)}
              style={[styles.rirPill, isSelected && styles.rirPillActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.rirPillText, isSelected && styles.rirPillTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 1-Tap Micro-Stepper Strip for Active Set */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA',
          borderRadius: 12,
          padding: 6,
          marginTop: 12,
          marginBottom: 6,
          gap: 6,
        }}
      >
        <TouchableOpacity
          onPress={() => onAdjustWeight(-2.5)}
          style={{
            flex: 1,
            paddingVertical: 9,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
          }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 12, fontFamily: FONT_FAMILY.bold, color: isDark ? '#FFFFFF' : '#000000' }}>
            -2.5 kg
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onAdjustWeight(+2.5)}
          style={{
            flex: 1,
            paddingVertical: 9,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(165, 153, 255, 0.16)',
          }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 12, fontFamily: FONT_FAMILY.bold, color: colors.accentPrimary || '#A599FF' }}>
            +2.5 kg
          </Text>
        </TouchableOpacity>

        <View style={{ width: 1, height: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />

        <TouchableOpacity
          onPress={() => onAdjustReps(-1)}
          style={{
            flex: 1,
            paddingVertical: 9,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
          }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 12, fontFamily: FONT_FAMILY.bold, color: isDark ? '#FFFFFF' : '#000000' }}>
            -1 rep
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onAdjustReps(+1)}
          style={{
            flex: 1,
            paddingVertical: 9,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(48, 209, 88, 0.16)',
          }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 12, fontFamily: FONT_FAMILY.bold, color: '#30D158' }}>
            +1 rep
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default ActiveSetAdjusterBar;
