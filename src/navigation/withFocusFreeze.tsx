import React from 'react';
import { useIsFocused } from '@react-navigation/native';
import ErrorBoundary from '../components/ErrorBoundary';

function shallowTabPropsEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.route !== undefined && b.route !== undefined && a.route !== b.route) return false;
  if (a.navigation !== undefined && b.navigation !== undefined && a.navigation !== b.navigation) return false;
  return true;
}

/**
 * Freezes JS re-renders on unfocused bottom tabs while keeping their native
 * views warm in memory (0ms tab switch without background render churn), and
 * wraps each tab in an ErrorBoundary so a crash isolates to that tab alone.
 */
export function withFocusFreeze<T extends object>(
  Component: React.ComponentType<T>,
  screenName: string
): React.ComponentType<T> {
  const MemoizedInner = React.memo(
    ({ passthroughProps }: { isFocused: boolean; passthroughProps: T }) => (
      <ErrorBoundary screenName={screenName}>
        <Component {...passthroughProps} />
      </ErrorBoundary>
    ),
    (prev, next) => {
      if (!next.isFocused) {
        const prevParams = (prev.passthroughProps as any)?.route?.params;
        const nextParams = (next.passthroughProps as any)?.route?.params;
        if (prevParams !== nextParams) return false;
        return true;
      }
      return (
        shallowTabPropsEqual(prev.passthroughProps, next.passthroughProps) &&
        prev.isFocused === next.isFocused
      );
    }
  );

  const FocusGate = (props: T) => {
    const isFocused = useIsFocused();
    return <MemoizedInner isFocused={isFocused} passthroughProps={props} />;
  };

  FocusGate.displayName = `FocusFrozen(${screenName})`;
  return FocusGate;
}
