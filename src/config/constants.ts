/**
 * constants.ts — ZenFit Mobile
 *
 * Central location for all app-wide constants.
 * Purely tailored for ZenFit athlete & gym tracking.
 */

// ── App Metadata ──────────────────────────────────────────────────────────────
export const APP_NAME = 'ZenFit';
export const APP_VERSION = '1.0.0';

// ── API Endpoints ─────────────────────────────────────────────────────────────
/** Vercel Gemini proxy — used for all AI inference on mobile */
export const GEMINI_PROXY_BASE = 'https://myzentrack.vercel.app';
export const GEMINI_PROXY_URL = `${GEMINI_PROXY_BASE}/api/gemini-proxy`;
export const VOICE_PROXY_URL = `${GEMINI_PROXY_BASE}/api/voice-proxy`;

/** Direct Gemini API base — used by geminiProxy.ts with key rotation */
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// ── Gemini Models ─────────────────────────────────────────────────────────────
export const AVAILABLE_GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', tag: 'Fast & Balanced', icon: '⚡' },
] as const;
export type GeminiModelId = typeof AVAILABLE_GEMINI_MODELS[number]['id'];

export const GEMINI_MODEL_DEFAULT = 'gemini-2.5-flash';
export const GEMINI_MODEL_TRANSCRIPTION = 'gemini-2.5-flash';

// ── Voice & TTS ───────────────────────────────────────────────────────────────
/** Maximum characters per Sarvam TTS chunk (API hard limit) */
export const SARVAM_MAX_CHARS = 500;
/** Voice orb idle timeout before auto-close (30 seconds) */
export const VOICE_IDLE_TIMEOUT_MS = 30_000;
/** Minimum audio recording duration for valid transcription (ms) */
export const MIN_RECORDING_MS = 500;

// ── Notifications ─────────────────────────────────────────────────────────────
/** Default daily briefing notification time */
export const DEFAULT_NOTIF_TIME = '08:00';
/** Gym reminder default time */
export const GYM_REMINDER_TIME = '18:00';

// ── AsyncStorage Keys ─────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  DEFAULT_NOTIF_TIME: 'zenfit_default_notif_time',
  GYM_NOTIF_TIME: 'zenfit_gym_notif_time',
  XP_DATA: 'zenfit_xp_v1',
  XP_STREAK: 'zenfit_xp_streak',
  ONBOARDED: 'zenfit_onboarded_v2',
  GOOGLE_TOKEN: 'google_workspace_token',
  THEME: '@zentrack_theme',
} as const;

// ── Firestore Collections ─────────────────────────────────────────────────────
export const COLLECTION = {
  GYM_LOGS: 'gym_logs',
  USER_GYM_PLANS: 'user_gym_plans',
  WATER_LOGS: 'water_logs',
  SLEEP_LOGS: 'sleep_logs',
  WEIGHT_LOGS: 'weight_logs',
  USER_PROFILES: 'user_profiles',
} as const;

// ── Navigation Screen Names ───────────────────────────────────────────────────
export const SCREENS = {
  LANDING: 'Landing',
  AUTH: 'Auth',
  HOME: 'Home',
  PLAN: 'Plan',
  TRAIN: 'Today',
  ANALYTICS: 'Analytics',
  BODY: 'Body',
  ACTIVE_LOGGING: 'ActiveLogging',
  WORKOUT_SUMMARY: 'WorkoutSummary',
  GYM_PROGRESS: 'GymProgress',
  GYM_HISTORY: 'GymHistory',
  EXERCISE_DETAIL: 'ExerciseDetail',
  EXERCISE_SWAP: 'ExerciseSwap',
  SETTINGS: 'Settings',
} as const;

// ── XP Levels ─────────────────────────────────────────────────────────────────
export const XP_LEVELS = [
  { xp: 0,       label: 'Novice' },
  { xp: 1000,    label: 'Rookie' },
  { xp: 3000,    label: 'Consistent' },
  { xp: 7000,    label: 'Intermediate' },
  { xp: 14000,   label: 'Advanced' },
  { xp: 27000,   label: 'Elite' },
  { xp: 59500,   label: 'Pro' },
  { xp: 110000,  label: 'Master' },
  { xp: 180000,  label: 'Champion' },
  { xp: 270000,  label: 'Titan' },
  { xp: 390000,  label: 'Olympian' },
  { xp: 550000,  label: 'Apex Athlete' },
  { xp: 760000,  label: 'Sovereign' },
  { xp: 1030000, label: 'Archon' },
  { xp: 1380000, label: 'Celestial' },
  { xp: 1820000, label: 'Ethereal' },
  { xp: 2380000, label: 'Empyrean' },
  { xp: 3080000, label: 'Astral' },
  { xp: 3950000, label: 'Zenith' },
  { xp: 5000000, label: 'Apex' },
] as const;
