/**
 * legacy.types.ts — ZenFit Mobile
 * Cleaned wellness log interfaces.
 */

import { GymLog } from './gym.types';
export type { GymLog };

export interface WaterLog {
  id: string;
  userId: string;
  date: string;
  amountMl: number;
  timestamp: number;
  createdAt?: number;
}

export interface SleepLog {
  id: string;
  userId: string;
  date: string;
  durationMinutes: number;
  hours?: number;
  quality?: 'poor' | 'fair' | 'good' | 'great';
}

export interface WeightLog {
  id: string;
  userId: string;
  date: string;
  weightKg: number;
}
