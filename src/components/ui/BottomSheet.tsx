import React from 'react';
import { AppBottomSheet, AppBottomSheetProps } from './AppBottomSheet';

export type BottomSheetProps = AppBottomSheetProps & {
  keyboardOffset?: number;
};

/**
 * BottomSheet — Unified bottom sheet adapter backed by AppBottomSheet.
 * Preserves `visible` / `onClose` API while running gestures, keyboard
 * avoidance, and animations natively on the Reanimated UI thread.
 */
export default function BottomSheet({
  keyboardOffset: _keyboardOffset,
  ...props
}: BottomSheetProps) {
  return <AppBottomSheet {...props} />;
}
