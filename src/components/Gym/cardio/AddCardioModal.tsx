/**
 * AddCardioModal — ZenFit
 * Minimalist cardio activity selector with native-thread tactile spring physics.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { ICON, SPACE, TOUCH } from '../../../theme/tokens';
import { TactileButton } from '../../ui';
import BottomSheet from '../../ui/BottomSheet';

import { makeCardioModalStyles } from './cardioModalStyles';
import CardioTypeSelector from './CardioTypeSelector';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (type: string) => void;
}

export function AddCardioModal({ visible, onClose, onAdd }: Props) {
  const { tokens } = useTheme();
  const s = useMemo(() => makeCardioModalStyles(tokens), [tokens]);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSelectedType(null);
    }
  }, [visible]);

  const handleAdd = () => {
    if (!selectedType) return;
    const chosen = selectedType;
    setSelectedType(null);
    onAdd(chosen);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      noPadding={true}
      sheetBackgroundColor={tokens.bg.elevated}
    >
      <View style={{ paddingHorizontal: SPACE.lg, paddingBottom: SPACE.xl }}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerSpacer} />
          <Text style={s.title}>Add Cardio</Text>
          <TactileButton
            variant="custom"
            style={s.closeBtn}
            onPress={onClose}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel="Close cardio modal"
          >
            <X size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.text.primary} />
          </TactileButton>
        </View>

        {/* Cardio Type Grid */}
        <CardioTypeSelector
          selectedType={selectedType}
          onSelect={setSelectedType}
          styles={s}
          tokens={tokens}
        />

        {/* Add Button */}
        <TactileButton
          variant="custom"
          haptic="success"
          style={[s.addBtn, !selectedType && s.addBtnDisabled]}
          onPress={handleAdd}
          disabled={!selectedType}
        >
          <Text style={[s.addBtnText, !selectedType && s.addBtnTextDisabled]}>
            {selectedType ? `Add ${selectedType}` : 'Select an activity'}
          </Text>
        </TactileButton>
      </View>
    </BottomSheet>
  );
}

export default AddCardioModal;
