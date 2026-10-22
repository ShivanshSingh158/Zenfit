import React from 'react';
import type { GymLog, GymSet, GymExercise, UserGymPlanDoc, GymPlanDay } from '../types/gym.types';
import { useWellnessData } from './domains/WellnessContext';
import { useCoreData } from './domains/CoreDataContext';

export type { GymLog, GymSet, GymExercise, UserGymPlanDoc, GymPlanDay };

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

// Compatibility types for residual legacy services
export type Task = any;
export type Habit = any;
export type HabitLog = any;
export type StorageNode = any;
export type Note = any;
export type Goal = any;
export type CustomEvent = any;
export type AttendanceSubject = any;
export type AttendanceLog = any;
export type Assignment = any;
export type Semester = any;
export type SemesterSubject = any;
export type LearningTopic = any;
export type LearningSubTask = any;
export type JobApplication = any;
export type WeeklyReview = any;
export type ContentLog = any;

export function useMobileData() {
  const wellness = useWellnessData();
  const core = useCoreData();
  return {
    ...wellness,
    ...core,
  };
}
