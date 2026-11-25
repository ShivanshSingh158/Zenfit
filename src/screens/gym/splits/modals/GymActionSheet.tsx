import React from 'react';
import {
  View,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Pencil,
  Copy,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckCircle2,
  Clock,
  RotateCcw,
  ChevronRight,
} from 'lucide-react-native';
import BottomSheet from '../../../../components/ui/BottomSheet';
import { TactileButton } from '../../../../components/ui';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ICON, SPACE } from '../../../../theme/tokens';
import { useLatestNonNull } from '../../../../hooks/useLatestNonNull';
import { afterSheetDismiss } from '../../../../utils/sheetCoordinator';
import { getSplitsPalette, useSplitsStyles } from '../styles/gymSplitsStyles';

export type ActionSheetIconKey =
  | 'edit'
  | 'copy'
  | 'up'
  | 'down'
  | 'trash'
  | 'check'
  | 'time'
  | 'refresh';

export interface ActionSheetOption {
  icon: ActionSheetIconKey;
  label: string;
  subtitle?: string;
  isDestructive?: boolean;
  onPress: () => void;
}

export interface ActionSheetConfig {
  title: string;
  subtitle?: string;
  options: ActionSheetOption[];
  onCancel?: () => void;
}

export interface GymActionSheetProps {
  config: ActionSheetConfig | null;
  onClose: () => void;
}

const renderOptionIcon = (key: ActionSheetIconKey, color: string) => {
  const props = { size: 18, color, strokeWidth: ICON.strokeWidth };
  switch (key) {
    case 'edit':
      return <Pencil {...props} />;
    case 'copy':
      return <Copy {...props} />;
    case 'up':
      return <ArrowUp {...props} />;
    case 'down':
      return <ArrowDown {...props} />;
    case 'trash':
      return <Trash2 {...props} />;
    case 'check':
      return <CheckCircle2 {...props} />;
    case 'time':
      return <Clock {...props} />;
    case 'refresh':
      return <RotateCcw {...props} />;
  }
};

export const GymActionSheet: React.FC<GymActionSheetProps> = React.memo(({
  config,
  onClose,
}) => {
  const { tokens, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useSplitsStyles();
  const palette = getSplitsPalette(tokens, isDark);
  const activeConfig = useLatestNonNull(config);
  if (!activeConfig) return null;

  const handleDismiss = () => {
    onClose();
  };

  const handleCancel = () => {
    onClose();
    if (activeConfig?.onCancel) {
      const runCancel = activeConfig.onCancel;
      afterSheetDismiss(runCancel);
    }
  };

  return (
    <BottomSheet
      visible={config !== null}
      onClose={handleCancel}
      avoidKeyboard={false}
      noPadding={true}
      sheetBackgroundColor={palette.sheetCanvas}
    >
      <View
        style={[
          styles.sheetContainer,
          {
            backgroundColor: 'transparent',
            width: '100%',
            borderRadius: 0,
            borderWidth: 0,
            paddingHorizontal: SPACE[16],
            paddingBottom: Math.max(insets.bottom, SPACE[16]),
          },
        ]}
      >
        {/* Header */}
        <View style={styles.sheetTitleBlock}>
          <Text style={styles.sheetActionTitle} numberOfLines={1}>
            {activeConfig.title}
          </Text>
          {activeConfig.subtitle ? (
            <Text style={styles.sheetActionSubtitle} numberOfLines={1}>
              {activeConfig.subtitle}
            </Text>
          ) : null}
        </View>

        {/* Options List */}
        <View style={styles.sheetOptionsGroup}>
          {activeConfig.options.map((opt, idx) => {
            const isLast = idx === activeConfig.options.length - 1;
            const iconColor = opt.isDestructive ? tokens.status.danger : tokens.text.primary;
            return (
              <React.Fragment key={`sheet-opt-${opt.label}-${idx}`}>
                <TactileButton
                  variant="custom"
                  scaleTo={0.985}
                  style={styles.sheetOptionRow}
                  onPress={() => {
                    const run = opt.onPress;
                    handleDismiss();
                    afterSheetDismiss(run);
                  }}
                >
                  <View
                    style={[
                      styles.sheetOptionIconWrap,
                      opt.isDestructive && styles.sheetOptionIconWrapDestructive,
                    ]}
                  >
                    {renderOptionIcon(opt.icon, iconColor)}
                  </View>
                  <View style={{ flex: 1, paddingRight: SPACE[8] }}>
                    <Text
                      style={[
                        styles.sheetOptionLabel,
                        opt.isDestructive && { color: tokens.status.danger },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {opt.subtitle ? (
                      <Text style={styles.sheetOptionSublabel} numberOfLines={1}>
                        {opt.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={ICON.sm} color={tokens.text.muted} strokeWidth={ICON.strokeWidth} />
                </TactileButton>
                {!isLast && <View style={styles.sheetDivider} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* Cancel Button */}
        <TactileButton
          variant="custom"
          style={styles.sheetCancelBtn}
          onPress={handleCancel}
        >
          <Text style={styles.sheetCancelText}>Cancel</Text>
        </TactileButton>
      </View>
    </BottomSheet>
  );
});

export default GymActionSheet;
