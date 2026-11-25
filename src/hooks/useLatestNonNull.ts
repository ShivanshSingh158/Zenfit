import { useRef } from 'react';

/**
 * Caches the latest truthy value so closing bottom sheets and modals can
 * finish their UI-thread exit glide even after parent state clears the item prop.
 */
export function useLatestNonNull<T>(value: T | null | undefined): T | null {
  const ref = useRef<T | null>(value ?? null);
  if (value !== null && value !== undefined) {
    ref.current = value;
  }
  return ref.current;
}
