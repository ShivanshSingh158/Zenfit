# Contributing to ZenFit

Thanks for taking an interest in contributing to **ZenFit**! 

ZenFit is designed as a focused, high-performance native lifter platform. Our engineering principles prioritize zero-latency UX, 100% strict type safety, deterministic lifter science, and absolute user privacy.

---

## Project Layout

```
src/
├── components/
│   ├── Gym/
│   │   ├── active/      # Workout logging HUD, keypad, set rows, swap modal, rest timer
│   │   ├── cardio/      # Cardio tracking modals, speed/distance/time calculations
│   │   ├── exercise/    # Exercise catalogue, deep dives, video/GIF animations
│   │   ├── metrics/     # 18-muscle vector mannequin, weekly recap, structural balance
│   │   ├── profile/     # Athlete card dossier, physical stat configuration
│   │   ├── schedule/    # Routine split cards, multi-day template wizard
│   │   ├── settings/    # Hardware triggers (Bluetooth, Geofence, Audio)
│   │   └── common/      # Shared skeletons, OS notification registry modal
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

## Running for Development

### Prerequisites
- Node.js (v18.x or v20.x LTS)
- Android Studio with Android SDK (API 34+) or an attached Android physical device with USB debugging enabled.

```bash
# 1. Install dependencies
npm install

# 2. Type-check all files
npx tsc --noEmit

# 3. Start Metro bundler with cache reset
npx expo start -c

# 4. Run on an Android device or emulator
npx expo run:android
```

---

## Engineering Guidelines

### 1. 100% Strict TypeScript
- ZenFit enforces `strict: true`.
- Zero `any` types in core lifter domains (`types/gym.types.ts`).
- Always run `npx tsc --noEmit` before opening a pull request. A PR with TypeScript errors will not be merged.

### 2. 60–120 FPS Native Performance
- Lifters frequently log sets in sweaty environments with chalk on their hands. UI latency is unacceptable.
- Keep the JS thread free: complex animations must execute on the UI thread via **Reanimated 3**.
- Do not instantiate new objects or closures inside `renderItem` of lists; memoize row components (`React.memo`) with dedicated row equality comparators.
- Never block the UI thread during set logging. Dispatch optimistic updates to the L1 in-memory hot store first, and push persistent AsyncStorage writes asynchronously.

### 3. Biomechanical Integrity
- Exercise volume calculations, 1RM estimations (Brzycki/Epley/Wathan formulas), and recovery decay curves live in pure deterministic helper functions within:
  - [`src/services/muscleRecoveryService.ts`](src/services/muscleRecoveryService.ts)
  - [`src/utils/activeLoggingMath.ts`](src/utils/activeLoggingMath.ts)
  - [`src/services/progressionEngine.ts`](src/services/progressionEngine.ts)
- Any modification to recovery kinetics or volume landmark thresholds (MEV/MAV/MRV) must be supported by sports science literature or clear user preference opt-ins.

### 4. Offline-First Privacy Rule
- **Rule:** A lifter in an underground gym without reception must have 100% functionality.
- Never add blocking network requests to workout flows, set completions, timer launches, or split edits.
- Cloud sync (Firebase) is strictly asynchronous and opt-in.

---

## Pull Request Workflow

1. **Fork the repo** and create your branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. **Follow Conventional Commits**:
   - `feat(active)`: Add RPE percentage picker
   - `fix(timer)`: Resolve audio cue background pausing
   - `perf(body)`: Memoize SVG muscle path geometry
   - `docs(readme)`: Update setup instructions
3. **Verify compile integrity**:
   ```bash
   npx tsc --noEmit
   ```
4. **Push your branch** and open a Pull Request against `main`.
5. Provide a clear description and attach screenshots or screen recordings for any visual changes.

---

## Good First Issues

- Adding new curated training split templates (`src/data/curatedSplits.ts`).
- Expanding exercise aliases in the catalogue search index (`src/data/exerciseAliasMap.ts`).
- Accessibility enhancements (screen reader labels and high contrast color adjustments).
- Enhancing cardio metrics and calculation models.

---

## Community & Questions

- **[GitHub Discussions](https://github.com/ShivanshSingh158/Zenfit/discussions)**: Architectural questions, feature ideas, and training theory proposals.
- **[GitHub Issues](https://github.com/ShivanshSingh158/Zenfit/issues)**: Reproducible bug reports and confirmed feature tasks.
- **[Security](SECURITY.md)**: For private vulnerability reports, follow the guidelines in [SECURITY.md](SECURITY.md).
