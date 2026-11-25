/**
 * restTimerService.ts — ZenFit
 *
 * Global synchronous and background rest timer engine.
 * Ensures the rest timer and active workout timer persist across the entire app
 * (Home, Plan, Train, Analytics, Body, ExerciseDetail, etc.)
 */

import { DeviceEventEmitter } from 'react-native';
import { getL1Sync, setL1Sync, deleteL1Sync } from '../utils/bootManifest';
import {
  playTimerFinishChime,
  playCountdownTick,
  startRestTimerBackgroundAudioSession,
  stopRestTimerBackgroundAudioSession,
} from './gymSoundSynthesizer';
import { hapticMedium, hapticSuccess } from '../utils/haptics';
import { useState, useEffect, useCallback } from 'react';
import { RestTimerScheduler } from './notifications/scheduler/RestTimerScheduler';

export interface GlobalRestTimer {
  startTime: number;
  durationSecs: number;
  exerciseName?: string;
  isPaused?: boolean;
  pausedRemainingSecs?: number;
}

let _currentTimer: GlobalRestTimer | null = null;

export const REST_TIMER_EVENT = 'gym_global_rest_timer_changed';

// Read initial timer from L1 RAM cache on startup
try {
  const cached = getL1Sync<GlobalRestTimer | null>('@zenfit_global_rest_timer', null);
  if (cached && cached.startTime && cached.durationSecs) {
    if (cached.isPaused) {
      _currentTimer = cached;
    } else {
      const elapsed = (Date.now() - cached.startTime) / 1000;
      if (elapsed < cached.durationSecs) {
        _currentTimer = cached;
      } else {
        deleteL1Sync('@zenfit_global_rest_timer');
      }
    }
  }
} catch {}

let _expiryTimeout: ReturnType<typeof setTimeout> | null = null;
let _activeTimerId = 0;
let _lastFinishedTimerId = 0;
let _lastFinishedAt = 0;

export function wasRestTimerRecentlyFinished(): boolean {
  return Date.now() - _lastFinishedAt < 5000;
}

function scheduleExpiryTimeout(remainingSecs: number, timerId: number): void {
  if (_expiryTimeout) clearTimeout(_expiryTimeout);
  const delayMs = Math.max(100, Math.round(remainingSecs * 1000));
  _expiryTimeout = setTimeout(() => {
    handleTimerExpiry(timerId);
  }, delayMs);
}

function handleTimerExpiry(timerId: number): void {
  if (_lastFinishedTimerId === timerId) return;
  _lastFinishedTimerId = timerId;
  _lastFinishedAt = Date.now();
  try {
    playTimerFinishChime();
    hapticSuccess();
    DeviceEventEmitter.emit('gym_rest_timer_flash');
  } catch (_) {}
  clearGlobalRestTimer();
}

export function getGlobalRestTimer(): GlobalRestTimer | null {
  if (!_currentTimer) {
    const cached = getL1Sync<GlobalRestTimer | null>('@zenfit_global_rest_timer', null);
    if (cached && cached.startTime && cached.durationSecs) {
      if (cached.isPaused) {
        _currentTimer = cached;
      } else {
        const elapsed = (Date.now() - cached.startTime) / 1000;
        if (elapsed < cached.durationSecs) {
          _currentTimer = cached;
        }
      }
    }
  }
  if (_currentTimer && !_currentTimer.isPaused) {
    const elapsed = (Date.now() - _currentTimer.startTime) / 1000;
    if (elapsed >= _currentTimer.durationSecs) {
      return null;
    }
  }
  return _currentTimer;
}

export async function startGlobalRestTimer(durationSecs: number, exerciseName?: string): Promise<void> {
  if (!durationSecs || durationSecs <= 0) {
    clearGlobalRestTimer();
    return;
  }

  const now = Date.now();
  _activeTimerId++;
  const thisTimerId = _activeTimerId;
  _currentTimer = {
    startTime: now,
    durationSecs,
    exerciseName,
    isPaused: false,
  };

  setL1Sync('@zenfit_global_rest_timer', _currentTimer);
  DeviceEventEmitter.emit(REST_TIMER_EVENT, _currentTimer);
  scheduleExpiryTimeout(durationSecs, thisTimerId);

  // Keep background audio pipeline alive so earphones / audio devices stay awake
  startRestTimerBackgroundAudioSession().catch(() => {});

  // Schedule native background push notification via ZONE single-deterministic scheduler
  RestTimerScheduler.schedule(durationSecs, exerciseName).catch(() => {});
}

export async function clearGlobalRestTimer(): Promise<void> {
  if (_expiryTimeout) { clearTimeout(_expiryTimeout); _expiryTimeout = null; }
  _currentTimer = null;
  deleteL1Sync('@zenfit_global_rest_timer');
  DeviceEventEmitter.emit(REST_TIMER_EVENT, null);

  stopRestTimerBackgroundAudioSession().catch(() => {});
  RestTimerScheduler.cancel().catch(() => {});
}

export async function adjustGlobalRestTimer(deltaSecs: number): Promise<void> {
  if (!_currentTimer) return;

  const now = Date.now();
  const elapsed = _currentTimer.isPaused
    ? _currentTimer.durationSecs - (_currentTimer.pausedRemainingSecs || 0)
    : (now - _currentTimer.startTime) / 1000;

  const currentRemaining = Math.max(0, _currentTimer.durationSecs - elapsed);
  const newRemaining = Math.max(5, currentRemaining + deltaSecs);
  const newTotalDuration = Math.round(elapsed + newRemaining);

  _currentTimer = {
    ..._currentTimer,
    durationSecs: newTotalDuration,
    pausedRemainingSecs: _currentTimer.isPaused ? newRemaining : undefined,
  };

  setL1Sync('@zenfit_global_rest_timer', _currentTimer);
  DeviceEventEmitter.emit(REST_TIMER_EVENT, _currentTimer);

  if (!_currentTimer.isPaused && newRemaining > 0) {
    RestTimerScheduler.schedule(newRemaining, _currentTimer.exerciseName).catch(() => {});
  } else {
    RestTimerScheduler.cancel().catch(() => {});
  }
}

export async function setGlobalRestTimerDuration(newDurationSecs: number): Promise<void> {
  if (!_currentTimer) return;
  const elapsed = _currentTimer.isPaused
    ? _currentTimer.durationSecs - (_currentTimer.pausedRemainingSecs || 0)
    : (Date.now() - _currentTimer.startTime) / 1000;

  const remaining = Math.max(1, newDurationSecs - elapsed);
  _currentTimer = {
    ..._currentTimer,
    durationSecs: Math.max(1, Math.round(newDurationSecs)),
    pausedRemainingSecs: _currentTimer.isPaused ? remaining : undefined,
  };

  setL1Sync('@zenfit_global_rest_timer', _currentTimer);
  DeviceEventEmitter.emit(REST_TIMER_EVENT, _currentTimer);

  if (!_currentTimer.isPaused && remaining > 0) {
    RestTimerScheduler.schedule(remaining, _currentTimer.exerciseName).catch(() => {});
  } else {
    RestTimerScheduler.cancel().catch(() => {});
  }
}

export function pauseGlobalRestTimer(): void {
  if (!_currentTimer || _currentTimer.isPaused) return;
  if (_expiryTimeout) { clearTimeout(_expiryTimeout); _expiryTimeout = null; }
  const elapsed = (Date.now() - _currentTimer.startTime) / 1000;
  const remaining = Math.max(0, _currentTimer.durationSecs - elapsed);
  _currentTimer = {
    ..._currentTimer,
    isPaused: true,
    pausedRemainingSecs: remaining,
  };
  setL1Sync('@zenfit_global_rest_timer', _currentTimer);
  DeviceEventEmitter.emit(REST_TIMER_EVENT, _currentTimer);

  RestTimerScheduler.cancel().catch(() => {});
}

export function resumeGlobalRestTimer(): void {
  if (!_currentTimer || !_currentTimer.isPaused) return;
  const remaining = _currentTimer.pausedRemainingSecs || _currentTimer.durationSecs;
  const now = Date.now();
  _currentTimer = {
    ..._currentTimer,
    startTime: now - (_currentTimer.durationSecs - remaining) * 1000,
    isPaused: false,
    pausedRemainingSecs: undefined,
  };
  setL1Sync('@zenfit_global_rest_timer', _currentTimer);
  DeviceEventEmitter.emit(REST_TIMER_EVENT, _currentTimer);

  _activeTimerId++;
  const thisTimerId = _activeTimerId;
  if (remaining > 0) {
    scheduleExpiryTimeout(remaining, thisTimerId);
    RestTimerScheduler.schedule(remaining, _currentTimer.exerciseName).catch(() => {});
  }
}

export function useGlobalRestTimer() {
  const [timer, setTimer] = useState<GlobalRestTimer | null>(() => getGlobalRestTimer());

  useEffect(() => {
    setTimer(getGlobalRestTimer());

    const sub = DeviceEventEmitter.addListener(REST_TIMER_EVENT, (newTimer: GlobalRestTimer | null) => {
      setTimer(newTimer ? { ...newTimer } : null);
    });

    return () => sub.remove();
  }, []);

  // Synced with REST_TIMER_EVENT
  useEffect(() => {
    if (!timer || timer.isPaused) return;
  }, [timer]);

  const skip = useCallback(() => {
    hapticMedium();
    clearGlobalRestTimer();
  }, []);

  const add15 = useCallback(() => {
    hapticMedium();
    adjustGlobalRestTimer(15);
  }, []);

  const subtract15 = useCallback(() => {
    hapticMedium();
    adjustGlobalRestTimer(-15);
  }, []);

  const togglePause = useCallback(() => {
    hapticMedium();
    if (timer?.isPaused) {
      resumeGlobalRestTimer();
    } else {
      pauseGlobalRestTimer();
    }
  }, [timer?.isPaused]);

  const setDuration = useCallback((secs: number) => {
    setGlobalRestTimerDuration(secs);
  }, []);

  return {
    timer,
    isActive: Boolean(timer && timer.startTime && timer.durationSecs > 0),
    skip,
    add15,
    subtract15,
    togglePause,
    setDuration,
  };
}
