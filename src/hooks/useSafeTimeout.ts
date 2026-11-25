import { useEffect, useRef, useCallback } from 'react';

/**
 * useSafeTimeout
 * 
 * A custom React hook that tracks timeouts and automatically clears them
 * when the component unmounts. This prevents memory leaks and the 
 * "Can't perform a React state update on an unmounted component" error.
 */
export function useSafeTimeout() {
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const safeSetTimeout = useCallback((callback: () => void, delay: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      callback();
    }, delay);
    timers.current.add(id);
    return id;
  }, []);

  // Automatically clear all pending timers when the screen unmounts
  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    };
  }, []);

  return safeSetTimeout;
}
