/**
 * sheetCoordinator.ts — ZenFit Deterministic Modal & Sheet Transition Coordinator
 *
 * Eliminates arbitrary 120–140ms setTimeout race conditions when closing one modal
 * and opening another, and tracks the active Portal modal stack so hardware Back
 * only dismisses the top-most modal.
 */

type Listener = () => void;

const closingIds = new Set<string>();
const dismissListeners = new Set<Listener>();
const portalStack: string[] = [];

let activeHandoffToken = 0;
let activeFallbackTimer: ReturnType<typeof setTimeout> | null = null;
let activeSafetyTimer: ReturnType<typeof setTimeout> | null = null;
let activeListener: Listener | null = null;

function flushDismissListeners() {
  if (closingIds.size > 0) return;
  const listeners = Array.from(dismissListeners);
  dismissListeners.clear();
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore listener errors
    }
  });
}

export function registerModalInStack(id: string): void {
  const existingIdx = portalStack.indexOf(id);
  if (existingIdx !== -1) {
    portalStack.splice(existingIdx, 1);
  }
  portalStack.push(id);
}

export function unregisterModalFromStack(id: string): void {
  const idx = portalStack.indexOf(id);
  if (idx !== -1) {
    portalStack.splice(idx, 1);
  }
}

export function isTopModalInStack(id: string): boolean {
  if (portalStack.length === 0) return true;
  return portalStack[portalStack.length - 1] === id;
}

export function markSheetClosing(id: string): void {
  closingIds.add(id);
}

export function clearSheetClosing(id: string): void {
  closingIds.delete(id);
}

export function markSheetClosed(id: string): void {
  const removed = closingIds.delete(id);
  unregisterModalFromStack(id);
  if (removed || closingIds.size === 0) {
    flushDismissListeners();
  }
}

export function cancelScheduledSheetHandoff(): void {
  activeHandoffToken += 1;
  if (activeFallbackTimer !== null) {
    clearTimeout(activeFallbackTimer);
    activeFallbackTimer = null;
  }
  if (activeSafetyTimer !== null) {
    clearTimeout(activeSafetyTimer);
    activeSafetyTimer = null;
  }
  if (activeListener !== null) {
    dismissListeners.delete(activeListener);
    activeListener = null;
  }
}

/**
 * Runs `fn` on the exact frame all currently-dismissing sheets/modals finish
 * animating out (with a safe fallback timer so callers never stall).
 */
export function afterSheetDismiss(fn: () => void, fallbackMs: number = 250): () => void {
  cancelScheduledSheetHandoff();
  const token = ++activeHandoffToken;

  const execute = () => {
    if (token !== activeHandoffToken) return;
    cancelScheduledSheetHandoff();
    requestAnimationFrame(() => {
      try {
        fn();
      } catch {
        // ignore callback errors
      }
    });
  };

  const listener: Listener = () => execute();
  activeListener = listener;
  dismissListeners.add(listener);

  if (closingIds.size === 0) {
    // Allow React commit for a simultaneous setVisible(false) call on this tick.
    activeFallbackTimer = setTimeout(() => {
      if (closingIds.size === 0) {
        execute();
      }
    }, 32);
  }

  activeSafetyTimer = setTimeout(() => {
    execute();
  }, fallbackMs);

  return () => {
    if (token === activeHandoffToken) {
      cancelScheduledSheetHandoff();
    } else {
      dismissListeners.delete(listener);
    }
  };
}
