# Changelog

All notable changes to **ZenFit** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v1.4.0] - 2026-11-05

### 🚀 Live Android Home Screen Widget & GOATED 72h Notification Engine

**Android Home Screen Workout Widget:**
- Introduced native Android Glance Widget (`LiveWorkoutWidget`). Lifters can monitor active exercises, completed set counts, and live rest timer countdowns directly from their home screen without opening the app.
- Synchronized via background task dispatcher and `react-native-android-widget`.

**72-Hour Rolling Notification Architecture:**
- **Relative Time Anchoring (`T-offset`):** Workout reminders dynamically anchor to the athlete's preferred training time `T` (e.g. `T - 45m` pre-workout readiness, `T + 60m` missed session nudge) instead of static clock times, adapting seamlessly to morning, afternoon, or evening lifters.
- **Unbreachable 2-Alert Daily Ceiling:** Enforces an absolute 2-notification daily limit with mandatory 180-minute spacing to prevent notification fatigue.
- **Quiet Hours Barrier:** Hard barrier between `22:00` and `07:30` blocks all notifications during biological sleep and recovery phases.
- **Ghosting Backoff Protection:** Automatically silences habit nudges after 3 consecutive missed workouts until the app is reopened, preventing user guilt-trips.
- **Sunday Strength Briefing:** Automated Sunday 11:00 AM digest summarizing weekly tonnage, PR milestones, and recovery readiness for the upcoming split.

**Settings & UI Decluttering:**
- Replaced developer debug toggles, raw OS notification registers, and uncalibrated geofence options with a streamlined 3-master-toggle + 1-anchor-time interface.
- Resolved Android font truncation on `AnatomicalBodyMapCard` inspector labels and space-between landmark ticks.

---

## [v1.3.0] - 2026-11-04

### 🧬 18-Muscle Vector Mannequin & Hypertrophy Volume Landmarks

**Anatomical Vector Mannequin:**
- Hardware-accelerated SVG body map rendering 18 distinct muscle groups across anterior and posterior views.
- Real-time tissue recovery heatmaps (Green = 100% Ready, Amber = Rebuilding, Red = Fatigued).

**Scientific Hypertrophy Volume Landmarks:**
- Direct integration of Dr. Mike Israetel's scientific volume framework:
  - `Untrained (0 sets)`: Baseline maintenance deficit.
  - `Maintain (4–6 sets)`: Minimum Effective Volume (MEV).
  - `Growth Zone (10–16 sets)`: Maximum Adaptive Volume (MAV).
  - `Overworked (20+ sets)`: Maximum Recoverable Volume (MRV).
- Hypertrophy landmark progress bars with space-between tick indicators.

**Structural Symmetry Analysis:**
- Real-time balance calculations for push:pull, quad:hamstring, and upper:lower volume ratios to guard against joint wear and posture drift.

---

## [v1.2.0] - 2026-10-29

### 📚 525 Verified Exercise Catalogue & Canonical GIF Integration

**Verified Movement Database:**
- Replaced third-party scraped sets with a curated 525-movement exercise database featuring 1-to-1 verified canonical GIFs.
- Instant search with alias recognition (*"Incline Press"* matches *"Incline Dumbbell Bench"*).

**Interactive Rest Timer & Keypad:**
- 4-column dedicated lifter keypad with `+2.5 kg` / `+1 rep` contextual quick-steppers.
- Audio countdown cues synthesizing 3-2-1 beeps via low-latency PCM audio (`expo-av`).
- Swipe-to-complete gesture on set rows with heavy tactile vibration feedback (`expo-haptics`).

---

## [v1.1.0] - 2026-10-28

### ⚡ Closed-Loop CNS Pool & Axial Load Scaling

**Biomechanical Kinetics:**
- Closed-loop recovery engine differentiating tissue recovery speed: 48-hour recovery for small muscle groups (biceps, lateral delts) vs. 72-hour recovery for axial spinal loading (deadlifts, barbell squats).
- Metabolic load scaling driven by RPE ratings and accumulated tonnage.

**In-Session Ergonomics:**
- Persistent foreground workout alert keeping ongoing sets accessible on the Android lockscreen.
- Instant exercise swap drawer suggesting equivalent biomechanical movements with identical muscle head emphasis.

---

## [v1.0.0] - 2026-10-23

### 🏁 Initial Release: Offline Native Lifter Platform

- Initial release of the ZenFit native lifter engine.
- Pure React Native 0.76 (Expo SDK 52 Bare Workflow) architecture.
- 100% strict TypeScript typing contract (`src/types/gym.types.ts`).
- Offline-first L1 in-memory hot store and asynchronous `AsyncStorage` persistence.
- Curated workout splits: Push/Pull/Legs (PPL), Upper/Lower, Arnold Split, Full Body, and 5×5 Strength.
