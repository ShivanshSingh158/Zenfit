import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { hapticSelection } from '../../../utils/haptics';

interface MiniMannequinButtonProps {
  onPress: () => void;
  hasWorkedMuscles?: boolean;
}

export const MiniMannequinButton: React.FC<MiniMannequinButtonProps> = ({
  onPress,
  hasWorkedMuscles = true,
}) => {
  return (
    <TouchableOpacity
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      style={styles.pill}
      activeOpacity={0.75}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Svg width={34} height={22} viewBox="0 0 48 32">
        {/* Front Figure (Left) */}
        <Circle cx="14" cy="4" r="2.5" fill="#636366" />
        <Path d="M10 8 L18 8 L16 16 L12 16 Z" fill={hasWorkedMuscles ? '#30D158' : '#48484A'} />
        <Path d="M9 9 L7 16 L8 16 L10 10 Z" fill={hasWorkedMuscles ? '#30D158' : '#636366'} />
        <Path d="M19 9 L21 16 L20 16 L18 10 Z" fill={hasWorkedMuscles ? '#30D158' : '#636366'} />
        <Path d="M12 17 L11 28 L13 28 L13.5 17 Z" fill="#48484A" />
        <Path d="M16 17 L17 28 L15 28 L14.5 17 Z" fill="#48484A" />

        {/* Back Figure (Right) */}
        <Circle cx="34" cy="4" r="2.5" fill="#636366" />
        <Path d="M30 8 L38 8 L36 16 L32 16 Z" fill={hasWorkedMuscles ? '#24693D' : '#48484A'} />
        <Path d="M29 9 L27 16 L28 16 L30 10 Z" fill={hasWorkedMuscles ? '#24693D' : '#636366'} />
        <Path d="M39 9 L41 16 L40 16 L38 10 Z" fill={hasWorkedMuscles ? '#24693D' : '#636366'} />
        <Path d="M32 17 L31 28 L33 28 L33.5 17 Z" fill="#48484A" />
        <Path d="M36 17 L37 28 L35 28 L34.5 17 Z" fill="#48484A" />
      </Svg>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    width: 44,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MiniMannequinButton;
