/**
 * AddCardioModal — ZenFit
 * Minimalist cardio activity selector with spring animations.
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, Modal, TouchableOpacity, Animated, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { hapticSuccess } from '../../../utils/haptics';
import { useTheme } from '../../../contexts/ThemeContext';

// Extracted Subcomponents & Styles
import { makeCardioModalStyles } from './cardioModalStyles';
import CardioTypeSelector from './CardioTypeSelector';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (type: string) => void;
}

export function AddCardioModal({ visible, onClose, onAdd }: Props) {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => makeCardioModalStyles(colors, isDark), [colors, isDark]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      setSelectedType(null);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 240,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(500);
      backdropAnim.setValue(0);
      isClosingRef.current = false;
    }
  }, [visible]);

  const handleClose = (callback?: () => void) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isClosingRef.current = false;
      if (callback) {
        callback();
      } else {
        onClose();
      }
    });
  };

  const handleAdd = () => {
    if (!selectedType || isClosingRef.current) return;
    hapticSuccess();
    const chosen = selectedType;
    setSelectedType(null);
    handleClose(() => {
      onAdd(chosen);
    });
  };

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={() => handleClose()}>
      <Animated.View style={[s.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => handleClose()} />

        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Drag Handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View style={s.headerSpacer} />
            <Text style={s.title}>Add Cardio</Text>
            <TouchableOpacity style={s.closeBtn} onPress={() => handleClose()} activeOpacity={0.7}>
              <Ionicons name="close" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Cardio Type Grid */}
          <CardioTypeSelector
            selectedType={selectedType}
            onSelect={setSelectedType}
            styles={s}
            colors={colors}
            isDark={isDark}
          />

          {/* Add Button */}
          <TouchableOpacity
            style={[s.addBtn, !selectedType && s.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!selectedType}
            activeOpacity={0.8}
          >
            <Text style={[s.addBtnText, !selectedType && s.addBtnTextDisabled]}>
              {selectedType ? `Add ${selectedType}` : 'Select an activity'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export default AddCardioModal;
