import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { EQUIPMENT_OPTIONS, EquipmentCategory } from '../../utils/equipmentResolver';
import { useTheme } from '../../contexts/ThemeContext';
import { FONT_FAMILY } from '../../theme/tokens';
import { hapticLight, hapticSelection } from '../../utils/haptics';

interface VaultEquipmentModalProps {
  visible: boolean;
  selectedEquipment: EquipmentCategory;
  resultCount: number;
  onSelect: (eq: EquipmentCategory) => void;
  onClear: () => void;
  onClose: () => void;
}

export const VaultEquipmentModal: React.FC<VaultEquipmentModalProps> = ({
  visible,
  selectedEquipment,
  resultCount,
  onSelect,
  onClear,
  onClose,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheetContainer,
            { backgroundColor: isDark ? '#121217' : '#FFFFFF' },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Top Grab Handle */}
          <View style={styles.handleBar} />

          {/* Title Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}>
              Equipment
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={isDark ? '#8E8E93' : '#636366'} />
            </TouchableOpacity>
          </View>

          {/* 2-Column Grid */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.gridContent}>
            <View style={styles.grid}>
              {EQUIPMENT_OPTIONS.map((item) => {
                const isSelected = selectedEquipment === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      hapticSelection();
                      onSelect(item.id);
                    }}
                    style={[
                      styles.card,
                      {
                        backgroundColor: isDark
                          ? (isSelected ? 'rgba(165, 153, 255, 0.14)' : '#1B1A22')
                          : (isSelected ? 'rgba(165, 153, 255, 0.12)' : '#F2F2F7'),
                        borderColor: isSelected
                          ? (colors.accentPrimary || '#A599FF')
                          : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'transparent'),
                      },
                    ]}
                  >
                    <View style={styles.iconCircle}>
                      {item.iconType === 'material' ? (
                        <MaterialCommunityIcons
                          name={item.iconName as any}
                          size={24}
                          color={isSelected ? (colors.accentPrimary || '#A599FF') : (isDark ? '#FFFFFF' : '#1C1C1E')}
                        />
                      ) : (
                        <Ionicons
                          name={item.iconName as any}
                          size={24}
                          color={isSelected ? (colors.accentPrimary || '#A599FF') : (isDark ? '#FFFFFF' : '#1C1C1E')}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.cardText,
                        {
                          color: isSelected ? (colors.accentPrimary || '#A599FF') : (isDark ? '#FFFFFF' : '#1C1C1E'),
                          fontWeight: isSelected ? '700' : '600',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Bottom Action Footer */}
          <View
            style={[
              styles.footer,
              {
                backgroundColor: isDark ? '#121217' : '#FFFFFF',
                borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                hapticLight();
                onClear();
              }}
              style={[
                styles.clearBtn,
                { backgroundColor: isDark ? '#1E1D27' : '#E5E5EA' },
              ]}
            >
              <Text style={[styles.clearBtnText, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>
                Clear Filters
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                hapticLight();
                onClose();
              }}
              style={[
                styles.applyBtn,
                { backgroundColor: colors.accentPrimary || '#A599FF' },
              ]}
            >
              <Text style={styles.applyBtnText}>
                Show {resultCount} results
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A3A3C',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
  },
  closeBtn: {
    padding: 4,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  card: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  iconCircle: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.medium,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  clearBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
  },
  applyBtn: {
    flex: 1.6,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#000000',
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
  },
});
