# CLAUDE.md

This file provides architectural context and operational guidelines for AI coding assistants (Claude Code, Cursor, Antigravity) working in this repository.

---

## 🏛️ Project Architecture at a Glance

**ZenFit** is a pure native, offline-first mobile lifter application targeting Android and iOS.

- **Framework:** React Native 0.76 (Expo SDK 52 Bare Workflow) with the Fabric C++ core and Yoga Flexbox engine.
- **Language:** 100% strict TypeScript (`strict: true`). Zero `any` in core domains.
- **State Management:** 3-tier memory model:
  1. L1 In-Memory Hot Store (`src/utils/hotCacheStore.ts`) for synchronous O(1) set logging.
  2. Domain Context Layer (`src/contexts/domains/CoreDataContext.tsx`).
  3. Persistent Native Disk (`AsyncStorage`) + optional asynchronous Firebase sync.
- **Animations & Gestures:** Reanimated 3 on the native UI thread.
- **Notification Engine:** 72-hour rolling queue reconciler with relative time anchoring (`T-offset`), quiet hours barrier (`22:00–07:30`), and 2-alert daily ceiling.
- **Home Screen Widget:** Android Glance widget (`src/widgets/LiveWorkoutWidget.tsx`).

---

## 📁 Source Directory Map

```
src/
├── components/
│   ├── Gym/
│   │   ├── active/      # Active session HUD, keypad, set rows, rest timer
│   │   ├── cardio/      # Cardio tracking modals, calculations
│   │   ├── exercise/    # Exercise catalogue, deep dives, video/GIF animations
│   │   ├── metrics/     # 18-muscle vector mannequin, hypertrophy landmarks
│   │   ├── profile/     # Athlete card dossier, physical stats
│   │   ├── schedule/    # Routine split cards, multi-day wizard
│   │   ├── settings/    # Hardware triggers (Bluetooth, Geofence, Audio)
│   │   └── common/      # Shared skeletons, OS notification modal
│   ├── Navigation/      # Telegram-style fluid tab bar & header navigation
│   └── ui/              # Apple HIG design system (GlassCard, SegmentedControl)
├── config/              # Constants, tokens, and build configurations
├── contexts/domains/    # CoreDataContext, WellnessContext
├── data/                # Curated splits, 525 verified exercises, canonical GIFs
├── hooks/               # useGymLog, useActiveWidgetSync, useGymProfile
├── navigation/          # React Navigation stacks and type-safe route descriptors
├── screens/             # Dedicated Screen Containers (GymHome, ActiveLogging, Progress)
├── services/            # Biomechanical engines, 72h notifications, sound synthesizer
├── theme/               # Tokens, dark palette, animations, typography
├── types/               # gym.types.ts (Single source of truth type contracts)
├── utils/               # High-speed math, hot caches, schema guards, warmup engines
└── widgets/             # Native Android home screen live workout widget
```

---

## ⚡ Non-Negotiable Engineering Rules

1. **Type Safety:** Always run `npx tsc --noEmit`. Every PR, commit, or edit must pass with **0 errors**.
2. **60–120 FPS Native Fluidity:**
   - Do not pass un-memoized anonymous arrow functions to `FlatList` `renderItem`.
   - Never run blocking calculations on the JavaScript thread during active set logging.
   - Use `react-native-reanimated` worklets for gesture animations.
3. **Biomechanical Determinism:** Volume formulas (tonnage), 1RM equations, and recovery kinetics live in pure, testable functions in `src/services/` and `src/utils/`. Do not scatter random math across JSX components.
4. **Offline-First:** All workout tracking must work without internet. Do not introduce mandatory cloud or network calls to the active logging path.
5. **No File Monoliths:** Maintain the domain-driven subfolder structure (`active/`, `metrics/`, `schedule/`). Avoid sprawling monolithic files.

---

## 🛠️ Common Terminal Commands

```bash
# Type check all files
npx tsc --noEmit

# Start Metro bundler with cache reset
npx expo start -c

# Run on Android emulator / physical device
npx expo run:android

# Build standalone preview APK (ARM64)
npx eas build -p android --profile preview --local
```

