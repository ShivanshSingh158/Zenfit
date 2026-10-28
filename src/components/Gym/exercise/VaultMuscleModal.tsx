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
import { Ionicons } from '@expo/vector-icons';
import { MUSCLE_GROUP_OPTIONS, MuscleGroupOption } from '../../../utils/equipmentResolver';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONT_FAMILY } from '../../../theme/tokens';
import { hapticLight, hapticSelection } from '../../../utils/haptics';

interface VaultMuscleModalProps {
  visible: boolean;
  selectedMuscle: string;
  resultCount: number;
  onSelect: (muscle: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export const VaultMuscleModal: React.FC<VaultMuscleModalProps> = ({
  visible,
  selectedMuscle,
  resultCount,
  onSelect,
  onClear,
  onClose,
}) => {
  const { colors, isDark } = useTheme();

  const upperBody = MUSCLE_GROUP_OPTIONS.filter((m) => m.region === 'Upper Body');
  const lowerBody = MUSCLE_GROUP_OPTIONS.filter((m) => m.region === 'Lower Body');
  const core = MUSCLE_GROUP_OPTIONS.filter((m) => m.region === 'Core');
  const cardioFullBody = MUSCLE_GROUP_OPTIONS.filter((m) => m.region === 'Cardio & Full Body');

  const renderSection = (title: string, options: MuscleGroupOption[]) => (
    <View style={styles.section} key={title}>
      <Text style={[styles.sectionTitle, { color: isDark ? '#8E8E93' : '#636366' }]}>
        {title}
      </Text>
      <View style={styles.grid}>
        {options.map((item) => {
          const isSelected = selectedMuscle === item.id;
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
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={isSelected ? (colors.accentPrimary || '#A599FF') : (isDark ? '#A599FF' : '#5E5CE6')}
                />
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
    </View>
  );

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
              Muscle Group
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={isDark ? '#8E8E93' : '#636366'} />
            </TouchableOpacity>
          </View>

          {/* Categorized 2-Column Grid */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {renderSection('Upper Body', upperBody)}
            {renderSection('Lower Body', lowerBody)}
            {renderSection('Core', core)}
            {renderSection('Cardio & Full Body', cardioFullBody)}
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
    maxHeight: '85%',
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
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
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  iconCircle: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cardText: {
    fontSize: 13.5,
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
