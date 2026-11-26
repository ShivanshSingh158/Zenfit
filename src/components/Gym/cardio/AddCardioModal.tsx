/**
 * AddCardioModal — ZenFit
 * Minimalist cardio activity selector with native-thread tactile spring physics.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ChevronLeft, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import { ICON, SPACE, TOUCH } from '../../../theme/tokens';
import { NumericText, TactileButton } from '../../ui';
import BottomSheet from '../../ui/BottomSheet';

import { makeCardioModalStyles } from './cardioModalStyles';
import CardioTypeSelector from './CardioTypeSelector';

const DURATION_PRESETS = [15, 20, 30, 45, 60];

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (type: string, preset?: { durationMinutes?: number | null }) => void;
  embedded?: boolean;
  title?: string;
  showDurationPresets?: boolean;
}

export function AddCardioModal({
  visible,
  onClose,
  onAdd,
  embedded = false,
  title = 'Add Cardio',
  showDurationPresets = true,
}: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeCardioModalStyles(tokens), [tokens]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedMins, setSelectedMins] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setSelectedType(null);
      setSelectedMins(null);
    }
  }, [visible]);

  const handleAdd = () => {
    if (!selectedType) return;
    const chosen = selectedType;
    const chosenMins = selectedMins;
    setSelectedType(null);
    setSelectedMins(null);
    onAdd(chosen, chosenMins ? { durationMinutes: chosenMins } : undefined);
    if (!embedded) {
      onClose();
    }
  };

  const innerContent = (
    <View
      style={
        embedded
          ? { flex: 1, paddingHorizontal: SPACE.lg, paddingTop: SPACE.md, paddingBottom: Math.max(SPACE.xl, insets.bottom + SPACE.md) }
          : { paddingHorizontal: SPACE.lg, paddingBottom: Math.max(SPACE.xl, insets.bottom + SPACE.md) }
      }
    >
      {/* Header */}
      <View style={s.header}>
        {embedded ? (
          <TactileButton
            variant="custom"
            style={s.closeBtn}
            onPress={onClose}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel="Back to workout editor"
          >
            <ChevronLeft size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.text.primary} />
          </TactileButton>
        ) : (
          <View style={s.headerSpacer} />
        )}
        <Text style={s.title}>{title}</Text>
        {embedded ? (
          <View style={s.headerSpacer} />
        ) : (
          <TactileButton
            variant="custom"
            style={s.closeBtn}
            onPress={onClose}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel="Close cardio modal"
          >
            <X size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.text.primary} />
          </TactileButton>
        )}
      </View>

      <ScrollView
        style={embedded ? { flex: 1 } : { flexShrink: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SPACE.sm }}
      >
        {/* Cardio Type Grid */}
        <CardioTypeSelector
          selectedType={selectedType}
          onSelect={setSelectedType}
          styles={s}
          tokens={tokens}
        />

        {/* Optional Target Duration Presets */}
        {showDurationPresets && (
          <View style={s.durationBlock}>
            <Text style={s.fieldLabel}>TARGET DURATION (OPTIONAL)</Text>
            <View style={s.durationRow}>
              {DURATION_PRESETS.map((mins) => {
                const isActive = selectedMins === mins;
                return (
                  <TactileButton
                    key={mins}
                    variant="custom"
                    haptic="selection"
                    style={[s.durationChip, isActive && s.durationChipActive]}
                    onPress={() => setSelectedMins((prev) => (prev === mins ? null : mins))}
                  >
                    <NumericText style={[s.durationChipText, isActive && s.durationChipTextActive]}>
                      {mins}m
                    </NumericText>
                  </TactileButton>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Button */}
      <TactileButton
        variant="custom"
        haptic="success"
        style={[s.addBtn, !selectedType && s.addBtnDisabled]}
        onPress={handleAdd}
        disabled={!selectedType}
      >
        <Text style={[s.addBtnText, !selectedType && s.addBtnTextDisabled]}>
          {selectedType
            ? `Add ${selectedType}${selectedMins ? ` · ${selectedMins} min` : ''}`
            : 'Select an activity'}
        </Text>
      </TactileButton>
    </View>
  );

  if (embedded) {
    return innerContent;
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      noPadding={true}
      sheetBackgroundColor={tokens.bg.elevated}
    >
      {innerContent}
    </BottomSheet>
  );
}

export default AddCardioModal;
