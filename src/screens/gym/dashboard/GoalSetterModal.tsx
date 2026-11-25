import React from 'react';
import { View, Text } from 'react-native';
import { Minus, Plus, X } from 'lucide-react-native';
import { CONTROL_ICON, ICON, TOUCH, ThemeTokens } from '../../../theme/tokens';
import BottomSheet from '../../../components/ui/BottomSheet';
import { TactileButton } from '../../../components/ui/TactileButton';
import { NumericText } from '../../../components/ui/NumericText';
import { makeDashboardStyles } from './gymDashboardStyles';

export interface GoalSetterModalProps {
  visible: boolean;
  onClose: () => void;
  tempGoal: number;
  setTempGoal: React.Dispatch<React.SetStateAction<number>>;
  onSaveGoal: (goal: number) => void;
  tokens: ThemeTokens;
  styles: ReturnType<typeof makeDashboardStyles>;
}

export const GoalSetterModal: React.FC<GoalSetterModalProps> = React.memo(
  function GoalSetterModal({
    visible,
    onClose,
    tempGoal,
    setTempGoal,
    onSaveGoal,
    tokens,
    styles,
  }) {
    return (
      <BottomSheet
        visible={visible}
        onClose={onClose}
        avoidKeyboard={false}
        sheetBackgroundColor={tokens.isDark ? '#0B0C10' : '#F8F8FA'}
      >
        <View style={styles.goalModalHeader}>
          <View style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
            <Text style={styles.goalModalTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              Monthly Workout Goal
            </Text>
            <Text style={styles.goalModalSubtitle} numberOfLines={2}>
              Set your target sessions for this month
            </Text>
          </View>
          <TactileButton
            variant="custom"
            onPress={onClose}
            style={styles.goalModalCloseBtn}
            hitSlop={TOUCH.hitSlop}
            accessibilityLabel="Close monthly goal dialog"
          >
            <X size={CONTROL_ICON.lg} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
          </TactileButton>
        </View>

        <View style={styles.goalStepperRow}>
          <TactileButton
            variant="custom"
            onPress={() => setTempGoal((prev) => Math.max(1, prev - 1))}
            hitSlop={TOUCH.hitSlop}
            style={styles.stepperBtn}
            accessibilityLabel="Decrease workout goal"
          >
            <Minus size={16} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
          </TactileButton>

          <View style={styles.stepperDisplay}>
            <NumericText style={styles.stepperValue}>{tempGoal}</NumericText>
            <Text style={styles.stepperUnit}>Workouts</Text>
          </View>

          <TactileButton
            variant="custom"
            onPress={() => setTempGoal((prev) => Math.min(31, prev + 1))}
            hitSlop={TOUCH.hitSlop}
            style={styles.stepperBtn}
            accessibilityLabel="Increase workout goal"
          >
            <Plus size={16} color={tokens.text.primary} strokeWidth={ICON.strokeWidth} />
          </TactileButton>
        </View>

        {/* Quick preset chips */}
        <View style={styles.presetsRow}>
          {[12, 16, 20, 24].map((preset) => (
            <TactileButton
              key={preset}
              variant="custom"
              onPress={() => setTempGoal(preset)}
              style={[
                styles.presetChip,
                tempGoal === preset && styles.presetChipActive,
              ]}
            >
              <NumericText
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={[
                  styles.presetChipText,
                  tempGoal === preset && styles.presetChipTextActive,
                ]}
              >
                {preset}
              </NumericText>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
                style={[
                  styles.presetChipSub,
                  tempGoal === preset && styles.presetChipSubActive,
                ]}
              >
                {preset === 12
                  ? '3x/wk'
                  : preset === 16
                  ? '4x/wk'
                  : preset === 20
                  ? '5x/wk'
                  : '6x/wk'}
              </Text>
            </TactileButton>
          ))}
        </View>

        <TactileButton
          variant="primary"
          haptic="success"
          onPress={() => onSaveGoal(tempGoal)}
          size="lg"
          style={styles.goalSaveBtn}
        >
          <Text style={styles.goalSaveBtnText}>Save Target</Text>
        </TactileButton>
      </BottomSheet>
    );
  }
);

export default GoalSetterModal;
