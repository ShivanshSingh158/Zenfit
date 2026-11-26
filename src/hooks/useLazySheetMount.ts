import React, { useEffect, useState } from 'react';

/**
 * Delays unmounting a controlled modal/sheet until its exit animation settles,
 * while preventing closed sheets from mounting hooks, styles, or catalog lookups
 * before first open.
 */
export function useLazySheetMount(visible: boolean, holdMs = 380): boolean {
  const [keepAlive, setKeepAlive] = useState(visible);

  useEffect(() => {
    if (visible) {
      setKeepAlive(true);
      return undefined;
    }
    const timer = setTimeout(() => {
      setKeepAlive(false);
    }, holdMs);
    return () => clearTimeout(timer);
  }, [visible, holdMs]);

  return visible || keepAlive;
}

export function LazySheet({
  visible,
  holdMs = 380,
  render,
}: {
  visible: boolean;
  holdMs?: number;
  render: () => React.ReactNode;
}) {
  const shouldMount = useLazySheetMount(visible, holdMs);
  if (!shouldMount) return null;
  return React.createElement(
    React.Suspense,
    { fallback: null },
    render()
  );
}

