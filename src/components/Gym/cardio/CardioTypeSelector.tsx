import React from 'react';
import { View, Text } from 'react-native';
import {
  Activity,
  Bike,
  CheckCircle2,
  Droplets,
  Dumbbell,
  Footprints,
  Repeat,
  RefreshCw,
  TrendingUp,
  Waves,
  type LucideIcon,
} from 'lucide-react-native';
import { TactileButton } from '../../ui';
import { ICON, ThemeTokens } from '../../../theme/tokens';

export interface CardioTypeOption {
  label: string;
  Icon: LucideIcon;
}

export const CARDIO_TYPES: CardioTypeOption[] = [
  { label: 'Treadmill', Icon: Footprints },
  { label: 'Cycling', Icon: Bike },
  { label: 'Rowing', Icon: Waves },
  { label: 'Stairmaster', Icon: TrendingUp },
  { label: 'Elliptical', Icon: RefreshCw },
  { label: 'Outdoor Run', Icon: Activity },
  { label: 'Jump Rope', Icon: Repeat },
  { label: 'Swimming', Icon: Droplets },
  { label: 'Other', Icon: Dumbbell },
];

export interface CardioTypeSelectorProps {
  selectedType: string | null;
  onSelect: (type: string) => void;
  styles: any;
  tokens: ThemeTokens;
}

export const CardioTypeSelector: React.FC<CardioTypeSelectorProps> = React.memo(({
  selectedType,
  onSelect,
  styles,
  tokens,
}) => {
  return (
    <View style={styles.grid}>
      {CARDIO_TYPES.map(({ label, Icon }) => {
        const isSelected = selectedType === label;

        return (
          <TactileButton
            key={label}
            variant="custom"
            haptic="selection"
            style={[
              styles.chip,
              isSelected && styles.chipSelected,
            ]}
            onPress={() => onSelect(label)}
          >
            <View style={[styles.chipIcon, isSelected && styles.chipIconSelected]}>
              <Icon
                size={ICON.md - 2}
                strokeWidth={ICON.strokeWidth}
                color={isSelected ? tokens.accent.onPrimary : tokens.text.secondary}
              />
            </View>
            <Text
              style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              maxFontSizeMultiplier={1.25}
            >
              {label}
            </Text>
            {isSelected && (
              <CheckCircle2 size={ICON.sm} strokeWidth={ICON.strokeWidth} color={tokens.accent.primary} />
            )}
          </TactileButton>
        );
      })}
    </View>
  );
});

export default CardioTypeSelector;
