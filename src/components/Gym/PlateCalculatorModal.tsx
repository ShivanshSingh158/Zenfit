import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { IOS_DARK, FONT_FAMILY } from '../../theme/tokens';
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/haptics';

export interface PlateCalculatorModalProps {
  visible: boolean;
  initialWeight?: number;
  onClose: () => void;
  onApplyWeight?: (weight: number) => void;
}

interface PlateDef {
  weight: number;
  color: string;
  labelColor: string;
  height: number;
}

const AVAILABLE_PLATES: PlateDef[] = [
  { weight: 25, color: '#EF4444', labelColor: '#FFFFFF', height: 110 },
  { weight: 20, color: '#3B82F6', labelColor: '#FFFFFF', height: 100 },
  { weight: 15, color: '#EAB308', labelColor: '#000000', height: 90 },
  { weight: 10, color: '#22C55E', labelColor: '#FFFFFF', height: 80 },
  { weight: 5, color: '#F3F4F6', labelColor: '#1F2937', height: 68 },
  { weight: 2.5, color: '#374151', labelColor: '#FFFFFF', height: 56 },
  { weight: 1.25, color: '#9CA3AF', labelColor: '#111827', height: 46 },
];

export const PlateCalculatorModal: React.FC<PlateCalculatorModalProps> = ({
  visible,
  initialWeight = 60,
  onClose,
  onApplyWeight,
}) => {
  const { colors, isDark } = useTheme();
  const [totalWeight, setTotalWeight] = useState<number>(initialWeight > 0 ? initialWeight : 60);
  const [barWeight, setBarWeight] = useState<number>(20); // 20kg Olympic Bar

  // Calculate plates required on each side
  const calculation = useMemo(() => {
    const weightToLoad = Math.max(0, totalWeight - barWeight);
    const perSide = weightToLoad / 2;

    let remainder = perSide;
    const platesPerSide: PlateDef[] = [];
    const counts: Record<number, number> = {};

    for (const plate of AVAILABLE_PLATES) {
      if (remainder >= plate.weight) {
        const count = Math.floor(remainder / plate.weight);
        counts[plate.weight] = count;
        for (let i = 0; i < count; i++) {
          platesPerSide.push(plate);
        }
        remainder = Math.round((remainder - count * plate.weight) * 100) / 100;
      }
    }

    return {
      perSide,
      platesPerSide,
      counts,
      remainder,
    };
  }, [totalWeight, barWeight]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheetContainer,
            { backgroundColor: isDark ? IOS_DARK.bgGroupedCard : colors.surface },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: isDark ? IOS_DARK.labelPrimary : colors.textPrimary }]}>
                Plate Calculator
              </Text>
              <Text style={[styles.subtitle, { color: isDark ? IOS_DARK.labelSecondary : colors.textMuted }]}>
                Olympic Barbell Loading Breakdown
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                onClose();
              }}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={isDark ? IOS_DARK.labelSecondary : colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Target Weight Display & Stepper */}
            <View style={[styles.weightControlCard, { backgroundColor: isDark ? IOS_DARK.bgElevatedInput : '#F2F2F7' }]}>
              <Text style={[styles.controlLabel, { color: isDark ? IOS_DARK.labelSecondary : colors.textMuted }]}>
                TARGET WEIGHT
              </Text>
              <View style={styles.weightNumberRow}>
                <TouchableOpacity
                  onPress={() => {
                    hapticLight();
                    setTotalWeight(w => Math.max(barWeight, Math.round((w - 2.5) * 10) / 10));
                  }}
                  style={styles.stepperCircleBtn}
                >
                  <Ionicons name="remove" size={20} color={isDark ? '#FFFFFF' : '#000000'} />
                </TouchableOpacity>

                <View style={styles.weightValueBox}>
                  <Text style={[styles.weightValueText, { color: isDark ? IOS_DARK.labelPrimary : colors.textPrimary }]}>
                    {totalWeight}
                  </Text>
                  <Text style={[styles.weightUnitText, { color: isDark ? IOS_DARK.accent : colors.accentPrimary }]}>
                    KG
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    hapticLight();
                    setTotalWeight(w => Math.min(600, Math.round((w + 2.5) * 10) / 10));
                  }}
                  style={styles.stepperCircleBtn}
                >
                  <Ionicons name="add" size={20} color={isDark ? '#FFFFFF' : '#000000'} />
                </TouchableOpacity>
              </View>

              {/* Quick Stepper Pills */}
              <View style={styles.quickPillRow}>
                {[-10, -5, +5, +10].map(delta => (
                  <TouchableOpacity
                    key={delta}
                    onPress={() => {
                      hapticLight();
                      setTotalWeight(w => Math.max(barWeight, Math.round((w + delta) * 10) / 10));
                    }}
                    style={styles.quickPill}
                  >
                    <Text style={styles.quickPillText}>
                      {delta > 0 ? `+${delta}` : delta} kg
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Barbell Weight Selector */}
            <View style={styles.barSelectorContainer}>
              <Text style={[styles.sectionSubtitle, { color: isDark ? IOS_DARK.labelSecondary : colors.textMuted }]}>
                BARBELL TYPE
              </Text>
              <View style={styles.segmentedRow}>
                {[
                  { label: 'Olympic 20kg', value: 20 },
                  { label: 'Standard 15kg', value: 15 },
                  { label: 'EZ-Bar 10kg', value: 10 },
                  { label: 'Smith 0kg', value: 0 },
                ].map(opt => {
                  const isSelected = barWeight === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => {
                        hapticMedium();
                        setBarWeight(opt.value);
                      }}
                      style={[
                        styles.segmentBtn,
                        isSelected && {
                          backgroundColor: isDark ? IOS_DARK.accent : colors.accentPrimary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          isSelected && { color: isDark ? '#000000' : '#FFFFFF', fontFamily: FONT_FAMILY.bold },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Visual Barbell Loading Sleeve */}
            <View style={[styles.visualSleeveCard, { backgroundColor: isDark ? IOS_DARK.bgElevatedInput : '#F2F2F7' }]}>
              <View style={styles.sleeveHeaderRow}>
                <Text style={[styles.perSideLabel, { color: isDark ? IOS_DARK.labelSecondary : colors.textMuted }]}>
                  EACH SIDE: {calculation.perSide} KG
                </Text>
                {calculation.remainder > 0 && (
                  <Text style={{ fontSize: 11, fontFamily: FONT_FAMILY.bold, color: IOS_DARK.orange }}>
                    ({calculation.remainder}kg off)
                  </Text>
                )}
              </View>

              {/* Graphical Plate Sleeve Display */}
              <View style={styles.barGraphicWrapper}>
                {/* Collar / Shaft */}
                <View style={styles.barShaft} />
                <View style={styles.barCollar} />

                {/* Plates stacked on sleeve */}
                {calculation.platesPerSide.length === 0 ? (
                  <View style={styles.emptySleeveWrap}>
                    <Text style={styles.emptySleeveText}>No plates needed (bar weight only)</Text>
                  </View>
                ) : (
                  <View style={styles.platesRow}>
                    {calculation.platesPerSide.map((plate, index) => (
                      <View
                        key={index}
                        style={[
                          styles.plateGraphic,
                          {
                            height: plate.height,
                            backgroundColor: plate.color,
                          },
                        ]}
                      >
                        <Text style={[styles.plateGraphicText, { color: plate.labelColor }]}>
                          {plate.weight}
                        </Text>
                      </View>
                    ))}
                    {/* Sleeve End */}
                    <View style={styles.sleeveEnd} />
                  </View>
                )}
              </View>
            </View>

            {/* List breakdown of plates */}
            <View style={styles.breakdownCard}>
              <Text style={[styles.sectionSubtitle, { color: isDark ? IOS_DARK.labelSecondary : colors.textMuted }]}>
                PLATES TO SLIDE ON EACH SIDE
              </Text>
              <View style={styles.breakdownBadges}>
                {Object.entries(calculation.counts).map(([weightStr, count]) => {
                  const plateDef = AVAILABLE_PLATES.find(p => p.weight === Number(weightStr));
                  return (
                    <View
                      key={weightStr}
                      style={[
                        styles.platePill,
                        { backgroundColor: plateDef?.color || '#374151' },
                      ]}
                    >
                      <Text style={[styles.platePillText, { color: plateDef?.labelColor || '#FFFFFF' }]}>
                        {count} × {weightStr} kg
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Apply button */}
            {onApplyWeight && (
              <TouchableOpacity
                onPress={() => {
                  hapticSuccess();
                  onApplyWeight(totalWeight);
                  onClose();
                }}
                style={[styles.applyBtn, { backgroundColor: isDark ? IOS_DARK.accent : colors.accentPrimary }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.applyBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                  Apply {totalWeight} kg to Set
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.body,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    gap: 16,
    paddingBottom: 20,
  },
  weightControlCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  controlLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.8,
  },
  weightNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  stepperCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightValueBox: {
    alignItems: 'center',
  },
  weightValueText: {
    fontSize: 42,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -1,
    lineHeight: 48,
  },
  weightUnitText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 1,
  },
  quickPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  quickPillText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  barSelectorContainer: {
    gap: 8,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.6,
    marginLeft: 2,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.medium,
    color: '#8E8E93',
  },
  visualSleeveCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sleeveHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  perSideLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.5,
  },
  barGraphicWrapper: {
    height: 120,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  barShaft: {
    width: 24,
    height: 18,
    backgroundColor: '#6B7280',
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  barCollar: {
    width: 14,
    height: 44,
    backgroundColor: '#9CA3AF',
    borderRadius: 3,
    marginRight: 4,
  },
  emptySleeveWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySleeveText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.body,
    color: '#8E8E93',
  },
  platesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  plateGraphic: {
    width: 26,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.25)',
  },
  plateGraphicText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    transform: [{ rotate: '-90deg' }],
  },
  sleeveEnd: {
    width: 32,
    height: 16,
    backgroundColor: '#4B5563',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    marginLeft: 2,
  },
  breakdownCard: {
    gap: 8,
  },
  breakdownBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  platePillText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
  },
  applyBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  applyBtnText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
  },
});

export default PlateCalculatorModal;
