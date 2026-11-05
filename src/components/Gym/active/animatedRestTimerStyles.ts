import { StyleSheet } from 'react-native';
import { FONT_FAMILY } from '../../../theme/tokens';

export const makeAnimatedRestTimerStyles = (colors: any, isDark: boolean = true) =>
  StyleSheet.create({
    wrapper: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 99999,
      paddingHorizontal: 12,
      paddingBottom: 10,
    },
    dockCard: {
      backgroundColor: '#161618',
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 14,
      elevation: 16,
    },
    progressTrack: {
      height: 3,
      width: '100%',
      backgroundColor: '#2C2C2E',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#30D158',
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    leftCol: {
      flexDirection: 'column',
      justifyContent: 'center',
      minWidth: 80,
    },
    timeText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 24,
      color: '#FFFFFF',
      letterSpacing: -0.5,
      lineHeight: 28,
    },
    restSubRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginTop: 1,
    },
    restSubText: {
      fontFamily: FONT_FAMILY.medium,
      fontSize: 11.5,
      color: '#8E8E93',
    },
    centerControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    deltaPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    deltaText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 12,
      color: '#E5E5EA',
    },
    pauseBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    skipBtn: {
      backgroundColor: '#30D158',
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    skipText: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 13.5,
      color: '#000000',
    },
  });
