export interface ReplayTriggerOptions {
  /** Legacy option preserved for API compatibility */
  cooldownMs?: number;
  /** Legacy option preserved for API compatibility */
  settleDelayMs?: number;
}

/**
 * useScreenReplayTrigger
 *
 * Intentionally avoids `useIsFocused()` so switching between bottom tabs
 * never triggers spurious full-screen React re-renders on mounted tabs.
 */
export function useScreenReplayTrigger(_options: ReplayTriggerOptions = {}): {
  replayKey: number;
  isFocused: boolean;
} {
  return { replayKey: 1, isFocused: true };
}

export default useScreenReplayTrigger;
