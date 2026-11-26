import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Keyboard,
} from 'react-native';
import {
  Activity,
  Clock,
  Flame,
  Gauge,
  Layers,
  Navigation,
  RefreshCw,
  Repeat,
  SlidersHorizontal,
  TrendingUp,
  Waves,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { GymCardioLog } from '../../../types/gym.types';
import { useTheme } from '../../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ICON, SPACE, TOUCH } from '../../../theme/tokens';
import { TactileButton } from '../../ui';
import BottomSheet from '../../ui/BottomSheet';
import { useLatestNonNull } from '../../../hooks/useLatestNonNull';

import { makeCardioModalStyles } from './cardioModalStyles';

interface Props {
  visible: boolean;
  cardio: GymCardioLog | null;
  onClose: () => void;
  onSave: (updates: Partial<GymCardioLog>) => void;
  mode?: 'log' | 'plan';
}

type FieldKey =
  | 'durationMinutes'
  | 'distanceKm'
  | 'speedKmh'
  | 'incline'
  | 'calories'
  | 'floors'
  | 'level'
  | 'laps'
  | 'rounds'
  | 'spm'
  | 'pace';

interface FieldConfig {
  key: FieldKey;
  label: string;
  placeholder: string;
  Icon: LucideIcon;
  decimal?: boolean;
  unit: string;
}

const ALL_FIELDS: Record<FieldKey, FieldConfig> = {
  durationMinutes: { key: 'durationMinutes', label: 'Duration', placeholder: 'e.g. 30', Icon: Clock, unit: 'min' },
  distanceKm:      { key: 'distanceKm',      label: 'Distance', placeholder: 'e.g. 5.5', Icon: Navigation, decimal: true, unit: 'km' },
  speedKmh:        { key: 'speedKmh',        label: 'Speed',    placeholder: 'e.g. 8.5', Icon: Gauge, decimal: true, unit: 'km/h' },
  incline:         { key: 'incline',         label: 'Incline',  placeholder: 'e.g. 5', Icon: TrendingUp, decimal: true, unit: '%' },
  calories:        { key: 'calories',        label: 'Calories', placeholder: 'e.g. 250', Icon: Flame, unit: 'kcal' },
  floors:          { key: 'floors',          label: 'Floors',   placeholder: 'e.g. 40', Icon: Layers, unit: 'floors' },
  level:           { key: 'level',           label: 'Level',    placeholder: 'e.g. 8', Icon: SlidersHorizontal, unit: '/20' },
  laps:            { key: 'laps',            label: 'Laps',     placeholder: 'e.g. 20', Icon: RefreshCw, unit: 'laps' },
  rounds:          { key: 'rounds',          label: 'Rounds',   placeholder: 'e.g. 5', Icon: Repeat, unit: 'rounds' },
  spm:             { key: 'spm',             label: 'Stroke Rate', placeholder: 'e.g. 22', Icon: Waves, unit: 'spm' },
  pace:            { key: 'pace',            label: 'Pace',     placeholder: 'e.g. 5.30', Icon: Activity, decimal: true, unit: 'min/km' },
};

const TYPE_FIELDS: Record<string, FieldKey[]> = {
  'Treadmill':     ['durationMinutes', 'distanceKm', 'speedKmh', 'incline'],
  'Cycling':       ['durationMinutes', 'distanceKm', 'speedKmh', 'calories'],
  'Rowing':        ['durationMinutes', 'distanceKm', 'spm', 'calories'],
  'Stairmaster':   ['durationMinutes', 'floors', 'level', 'calories'],
  'Stair Climber': ['durationMinutes', 'floors', 'level', 'calories'],
  'Swimming':      ['durationMinutes', 'distanceKm', 'laps', 'pace'],
  'Elliptical':    ['durationMinutes', 'distanceKm', 'level', 'calories'],
  'Jump Rope':     ['durationMinutes', 'rounds', 'calories'],
  'HIIT':          ['durationMinutes', 'rounds', 'calories'],
  'Walking':       ['durationMinutes', 'distanceKm', 'speedKmh', 'incline'],
  'Outdoor Run':   ['durationMinutes', 'distanceKm', 'speedKmh', 'pace'],
  'Running':       ['durationMinutes', 'distanceKm', 'speedKmh', 'pace'],
  'Other':         ['durationMinutes', 'distanceKm', 'calories'],
};

const DEFAULT_FIELDS: FieldKey[] = ['durationMinutes', 'distanceKm', 'calories'];

export function LogCardioModal({ visible, cardio, onClose, onSave, mode = 'log' }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeCardioModalStyles(tokens), [tokens]);
  const activeCardio = useLatestNonNull(cardio);

  const fields = useMemo(() => {
    if (!activeCardio) return [];
    const keys = TYPE_FIELDS[activeCardio.type] || DEFAULT_FIELDS;
    return keys.map(k => ALL_FIELDS[k]);
  }, [activeCardio?.type]);

  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible && cardio) {
      const initial: Record<string, string> = {};
      const keys = TYPE_FIELDS[cardio.type] || DEFAULT_FIELDS;
      keys.forEach(k => {
        const val = (cardio as any)[k];
        if (val !== undefined && val !== null) {
          initial[k] = String(val);
        }
      });
      setValues(initial);
    }
  }, [visible, cardio?.id]);

  const handleSave = () => {
    if (!activeCardio) return;
    Keyboard.dismiss();

    const updates: Partial<GymCardioLog> = mode === 'plan' ? {} : { completed: true };
    (TYPE_FIELDS[activeCardio.type] || DEFAULT_FIELDS).forEach(key => {
      const raw = values[key];
      if (raw && raw.trim()) {
        const num = parseFloat(raw);
        if (!isNaN(num)) (updates as any)[key] = num;
      } else {
        (updates as any)[key] = null;
      }
    });

    onSave(updates);
    onClose();
  };

  if (!activeCardio) return null;

  const isPlanMode = mode === 'plan';
  const canSave = isPlanMode || !!values['durationMinutes']?.trim();

  const fieldPairs: FieldConfig[][] = [];
  for (let i = 0; i < fields.length; i += 2) {
    fieldPairs.push(fields.slice(i, i + 2));
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      avoidKeyboard={true}
      noPadding={true}
      sheetBackgroundColor={tokens.bg.elevated}
    >
      <View style={{ flexShrink: 1, paddingHorizontal: SPACE.lg, paddingBottom: Math.max(SPACE.xl, insets.bottom + SPACE.md) }}>
        <View style={s.header}>
          <View style={s.headerSpacer} />
          <View style={s.headerCenter}>
            <Text style={s.title}>
              {isPlanMode ? `${activeCardio.type} Targets` : `Log ${activeCardio.type}`}
            </Text>
            <Text style={s.subtitle}>
              {(TYPE_FIELDS[activeCardio.type] || DEFAULT_FIELDS)
                .map(k => ALL_FIELDS[k].unit)
                .join(' · ')}
            </Text>
          </View>
          <TactileButton
            variant="custom"
            style={s.closeBtn}
            onPress={onClose}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel="Close log cardio modal"
          >
            <X size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.text.primary} />
          </TactileButton>
        </View>

        <ScrollView
          style={{ flexShrink: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          contentContainerStyle={{ paddingBottom: SPACE.sm }}
        >
          {fieldPairs.map((row, ri) => (
            <View key={ri} style={s.row}>
              {row.map((field, fi) => {
                const FieldIcon = field.Icon;
                return (
                  <View
                    key={field.key}
                    style={[
                      s.fieldBox,
                      fi === 0 && row.length > 1 && { marginRight: SPACE.sm },
                      row.length === 1 && { width: '100%' },
                    ]}
                  >
                    <View style={s.fieldHeader}>
                      <View style={s.fieldIconBox}>
                        <FieldIcon
                          size={ICON.xs}
                          strokeWidth={ICON.strokeWidth}
                          color={tokens.text.primary}
                        />
                      </View>
                      <Text
                        style={s.fieldLabel}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        maxFontSizeMultiplier={1.2}
                      >
                        {field.label}
                      </Text>
                      <Text style={s.fieldUnit} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                        {field.unit}
                      </Text>
                    </View>
                    <TextInput
                      style={s.input}
                      maxFontSizeMultiplier={1.25}
                      value={values[field.key] || ''}
                      onChangeText={t => setValues(prev => ({ ...prev, [field.key]: t }))}
                      placeholder="—"
                      placeholderTextColor={tokens.text.muted}
                      keyboardType={field.decimal ? 'decimal-pad' : 'number-pad'}
                      returnKeyType="done"
                    />
                  </View>
                );
              })}
            </View>
          ))}

          <TactileButton
            variant="custom"
            haptic="success"
            style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={[s.saveBtnText, !canSave && s.saveBtnTextDisabled]}>
              {isPlanMode
                ? 'Save Cardio Target'
                : canSave
                ? 'Save & Mark Complete'
                : 'Enter duration to complete'}
            </Text>
          </TactileButton>
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

export default LogCardioModal;
