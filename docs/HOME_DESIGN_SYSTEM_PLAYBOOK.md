# ZenFit Design System & App-Wide Obsidian Architecture Guide

> **Canonical UI Specification:** Read this document before designing, modifying, or reviewing any screen, sheet, widget, animation, or typography token in ZenFit. All five primary navigation tabs (**Home, Plan, Today, Analytics, Body**), **Settings**, **Active Workout**, and **Modals/BottomSheets** share this single unified design grammar.

---

## 1. Visual Layer Model & Strict Depth Ladder

ZenFit conveys hierarchy through **deep tonal canvas separation, atmospheric edge-to-edge lighting gradients, and crisp `StyleSheet.hairlineWidth` dividers** — never through stacked grey boxes or heavy opaque borders.

| Layer | Role | Exact Tokens / Styling | Where Applied |
|---|---|---|---|
| **Layer 0 — Root Canvas** | Pure OLED backdrop so glows & focal surfaces lift cleanly | **Dark:** `#050507` (`DARK_TOKENS.bg.canvas`)<br>**Light:** `#F4F4F5` (`LIGHT_TOKENS.bg.canvas`) | `ScreenWrapper` root canvas across every tab & Settings |
| **Layer 0.5 — Atmospheric Top Aura** | Edge-to-edge physiological status wash extending behind translucent `StatusBar` | `ScreenWrapper topAura`: SVG `RadialGradient` (`cx="50%" cy="6%" rx="78%" ry="76%"`), height `320 + topPad`, **`0.16 -> 0`** dark (`0.08` light) Cobalt `#0A84FF` at rest; switches automatically across **all tabs** to Emerald `#30D158` (`0.19 -> 0` dark, `0.10` light) when `activeWorkout.active === true` | Enabled via `topAura` on Home, Plan, Today, Analytics, Body, and Settings |
| **Layer 1 — Hairline Ledger / Canvas Groups** | High-density lists, telemetry strips, weekly volume rows, anatomy metrics | Background: `'transparent'` or `StyleSheet.hairlineWidth` separators (`rgba(255,255,255,0.08)` Dark / `rgba(9,9,11,0.08)` Light) | Home Telemetry Bar, Plan Weekly Schedule & Volume Targets, Body Muscle Coverage & Symmetry |
| **Layer 2 — Tonal Focal Surface** | Primary hero cards & grouped setting/list containers (1–2 focal cards max per fold) | `#0F1015` (Dark) / `tokens.bg.surface` (Light) · `borderRadius: 18–20` · `borderWidth: StyleSheet.hairlineWidth` · `borderColor: rgba(255,255,255,0.10)` · subtle top highlight sheen | `OrbitalChronometerHero`, `MonthlyGoalsCard`, `GymWorkoutBanner`, `GymProfileScreen` sections, `AthleteProfileCard` |
| **Layer 3 — Unified Bottom Sheet Surface** | Every modal, sheet, picker & confirmation dialog | **Sheet Backdrop:** `#0B0C10` (Dark) / `#F8F8FA` (Light)<br>**Inner Group / Row / Input Surface:** `#14161D` (Dark) / `#FFFFFF` (Light) with `rgba(255,255,255,0.08)` hairline | All `BottomSheet` components (`SwapRoutineModal`, `PreSessionMuscleHitMap`, `FullAthleteProfileModal`, `SetupAthleteStatsModal`, confirmation & time sheets) |
| **Layer 4 — Floating Liquid Glass Chrome** | Floating bottom dock & detached active session status capsule | **iOS:** `BlurView` (`intensity: 78`) + specular gradient<br>**Android:** Frosted obsidian `LinearGradient` (`rgba(20,22,29,0.96)` -> `rgba(11,12,17,0.98)`) + `1px` top specular rim (`rgba(255,255,255,0.24)`) + `SHADOW` | `TelegramTabBar` & `FloatingLiveWorkoutIsland` |

---

## 2. Anti-Box & Hairline-Ledger Layout Rules

1. **Max 1 Card Depth Level:** Never nest a bordered rounded grey card inside another bordered rounded card.
   - Inside focal Layer 2 cards or Layer 3 sheets, divide rows using `StyleSheet.hairlineWidth` horizontal/vertical hairlines rather than wrapping every item in its own card.
   - Multi-option lists inside sheets (`SwapRoutineModal`, `FullAthleteProfileModal` Strength Profile, `GymProfileScreen` sections) belong inside **ONE** grouped `#14161D` / `#0F1015` container with `overflow: 'hidden'` and internal `StyleSheet.hairlineWidth` dividers (`marginLeft: 60` when aligned past 34dp leading icons, or `marginHorizontal: 15` on full rows).
2. **Floating SVGs Over Soft Backlight:** Never lock vector body silhouettes (`MiniDualBodyMap`) inside clunky grey inner boxes. Render silhouettes with transparent canvas backing or a gentle `RadialGradient` ambient highlight.
3. **Editorial Vertical Accent Rules:** Coach / readiness callouts use a clean `2.5px` left colored bar (`borderLeftWidth`) and crisp plain text rather than boxed alert banners.
4. **Compact Hero Action Placement (`GymWorkoutBanner` Pattern):** Use wide top-right empty space cleanly. For unstarted workouts (`Push B`), align the primary compact **`Start Workout`** button (`minHeight: 40`, `borderRadius: 12`, `hitSlop={4}`) directly opposite the workout title + subtitle row instead of burning 60dp on a redundant bottom full-width button.

---

## 3. Unified Safe Area & Tab Header Geometry (`ScreenWrapper`, `TabScreenHeader`)

Every top-level tab and Settings screen uses consistent top spacing so switching tabs never causes header jump:

- **`ScreenWrapper` (`src/components/ui/ScreenWrapper.tsx`):**
  - Always pass `edges={['top']} compactTop topAura keyboardAvoiding={false}` on top-level tabs and Settings.
  - `resolveScreenTopInset(insets.top, compactTop = true)`: trims oversized Android punch-hole top insets (`> 34dp`) by `4dp` (`Math.max(30, insets.top - 4)`) so titles sit with breathing room directly below the translucent status bar without wasted dead black space.
- **`TabScreenHeader` (`src/components/ui/TabScreenHeader.tsx`) — `TAB_HEADER_METRICS`:**
  - `paddingHorizontal: 14`, `paddingTop: 6`, `paddingBottom: 10`, `minHeight: 54`
  - `titleFontSize: 26`, `titleLineHeight: 30`, `titleLetterSpacing: -0.6` (`FONT_FAMILY.bold`, `includeFontPadding: false`)
  - `subtitleFontSize: 12.5`, `subtitleLineHeight: 16` (`FONT_FAMILY.medium`, `includeFontPadding: false`)
  - Left column: `flex: 1, minWidth: 0`; Right action group: `flexShrink: 0, gap: 8`.
- **Android Sticky Scroll Header Anti-Bleed:**
  - Never use semi-transparent dark overlays alone over high-contrast green/blue content (causes ghost bleed-through).
  - On **Home** (`GymDashboardScreen`), cover scrolled content with a solid Layer 0 `#050507` `stickySolidScrim` (`50dp`), `stickyBottomHairline`, and a `14dp` downward feather `LinearGradient` (`rgba(5,5,7,0.92)` -> `rgba(5,5,7,0)`), fading via Reanimated `useAnimatedScrollHandler`.
  - Do **NOT** attach pull-to-refresh `RefreshControl` on **Home**.
- **Top-Right Header Restraint:** Never cluster mismatched pills/squares + thick rings. Use borderless icon + tabular counters spaced `14dp` beside a clean `30×30` `1px`-rimmed `UserAvatar`, or a single clean action button (`Swap Today`, `Weigh In`, `Notifications`).

---

## 4. Floating Navigation Dock, Live Island & Chronometer Dial

### Floating Dock (`src/components/Navigation/TelegramTabBar.tsx`)
- **Capsule Dimensions:** `FLOATING_DOCK_HEIGHT = 58`, `FLOATING_DOCK_RADIUS = 28`, `FLOATING_DOCK_MARGIN_H = 14`, `bottom: Math.max(insets.bottom, 10)`
- **Gliding Liquid Lens:** `FLOATING_DOCK_PADDING_H = 5` -> concentric lens `FLOATING_LENS_RADIUS = 23`. Horizontal travel uses `withSpring(..., springs.snappy)` while inner lens applies center-origin `scaleX` bounce (`withSequence`, typed `as const`). Zero hard top underline bars.
- **Detached Live Workout Island (`FloatingLiveWorkoutIsland`):** Hovers `8dp` above the dock (`LIVE_ISLAND_HEIGHT = 40`, `LIVE_ISLAND_RADIUS = 20`) whenever a workout is active, showing pulsing live indicator, workout title, ticking timer, bottom set progress bar, and `Resume` chip. `AnimatedRestTimer` receives dynamic bottom offsets so all floating layers stack cleanly.
- **Bottom Scroll Clearance:** Scroll containers must pad bottom by `insets.bottom + 90` to `insets.bottom + 110` so final rows glide cleanly past the floating dock.

### Orbital Chronometer Dial (`src/screens/gym/dashboard/OrbitalChronometerHero.tsx`)
- **Boxless Watch Face (`192×192`):** Floats directly on the Layer 0 canvas under the emerald `topAura` with zero outer box/border (`ORBIT_RADIUS = 88`, `DIAL_RADIUS = 80`, `SWEEP_RADIUS = 74.5`, `CHRONO_TICKS`: 60 inset ticks from `rInner` `59.5–65` to `rOuter` `67.5`).
- Outer completion arc stays hidden until `doneSets > 0`; displays `ELAPSED` (zero `"LIVE"` badge), active exercise + set below without split/pill clutter, and isolates per-second clock updates inside memoized `OrbitalClockDigits`.

---

## 5. Modals, BottomSheets & Non-Overlapping Transitions

1. **Single Sheet Component (`src/components/ui/BottomSheet.tsx`):**
   - Always use `<BottomSheet>` — **never** use `Alert.alert`, native OS confirm boxes, or legacy `FadeModal`.
   - For scrollable lists inside a sheet (`PreSessionMuscleHitMap`, `SwapRoutineModal`, etc.), pass `scrollable={true}` instead of manually nesting an unconstrained `<ScrollView>` inside `fullHeight` (unless using a fixed sticky nav bar as in `FullAthleteProfileModal`, which passes `fullHeight={true} noPadding={true} sheetBackgroundColor={isDark ? '#0B0C10' : '#F8F8FA'}`).
   - Do **NOT** override `sheetBackgroundColor={tokens.bg.elevated}` on dark-mode sheets — keep `#0B0C10` (Dark) / `#F8F8FA` (Light) outer sheet + `#14161D` / `#FFFFFF` inner cards.
2. **Smooth Modal Handoffs (`src/utils/sheetCoordinator.ts`):**
   - Never mount/open two React Native `<Modal>` sheets simultaneously (causes background flicker, frozen touches, or dimmed overlays on Android/iOS).
   - Always close the current sheet first and launch the follow-up inside **`afterSheetDismiss(() => setNextSheet(true))`** (`sheetCoordinator.ts`).
   - Use **`useLatestNonNull`** when sheet payload props become `null` on close so closing slide/fade animations never flash empty content.
3. **Instant Sub-Tab Switching (`IOSSegmentedControl` + `AnimatedSubTabPane`):**
   - Analytics (`Weekly`, `Exercises`, `History`) and Plan (`Schedule`, `Routines`, `Programs`) keep sub-tab data memoized/pre-warmed and crossfade panes smoothly without multi-hundred-millisecond blocking recomputations on tab tap.

---

## 6. Module Architecture Standards

- **Analytics (`GymHistoryScreen`, `WeeklyGymReport`, `ExercisesSubTab`):**
  - Strictly computed from real completed workout logs — zero hardcoded fallback insights or inflated mock numbers. Concise plain-English summaries, scrollable day breakdowns, instant sub-tab switches, unit-aware tonnage (`kg` / `lbs`).
- **Body (`GymProgressScreen`, `AnatomicalBodyMapCard`, `BodyMetricsSheet`):**
  - Clear recovery, muscle coverage, and symmetry indicators in straightforward plain language without noisy flashing lights or cryptic labels like push/pull plan jargon. Keyboard-safe weight entry (`BodyMetricsSheet`) with stepper & photo logging.
- **Performance Card (`FullAthleteProfileModal`, `AthleteProfileCard`, `SetupAthleteStatsModal`, `athleteCardService`):**
  - **Zero fake defaults:** Never display hardcoded `'Barbell Bench Press'` or `'Active Plan'` placeholders when 0 workouts are logged; show real logged signature lifts, real top muscle distribution, rank ladder progress (`Bronze -> Silver -> Gold -> Platinum -> Diamond -> Elite`) without emojis, `CONSISTENCY & OUTPUT` dual streak + 4-metric lifetime strip (`Sessions`, `Per Week`, `Sets`, `Volume`), and a unified Obsidian `SetupAthleteStatsModal` shared across Home and Settings.
- **Settings (`GymProfileScreen`):**
  - Clean 4-section layout (`TRAINING & TIMERS`, `APPEARANCE & ANATOMY`, `REMINDERS`, `ACCOUNT & DATA`).
  - **Every control must be wired:** `KG/LBS`, `Default Rest Timer (1:00 / 1:30 / 2:00 / 3:00)`, `Auto-Start Rest Timer`, `Audio Countdown Cues`, `Tactile Haptics`, `Keep Screen Awake`, `Appearance (Dark / Auto / Light)`, `Body Silhouette (Male / Female)`, interactive BottomSheet `Usual Training Time` picker, real `clearDomainHotCache() + clearScheduleCache()` cache reset, honest `Cloud Backup` status, and Obsidian confirm sheets.
  - **Never expose OS scheduled notification/alarm inspector UIs (`ScheduledNotificationsModal`) to end users** — keep background notification scheduling completely invisible.

---

## 7. Global Units, Preferences & State Contracts

1. **Weight Unit Single Source of Truth (`src/utils/weightUnit.ts`):**
   - All weights in `GymDayLog`, `setsLog`, `BodyMetrics`, and `GymProfile` (`weightKg`) are stored canonically in **kilograms (`kg`)**.
   - Display components read **`useWeightUnit()`** (`true` = `lbs`, `false` = `kg`) and format via **`formatWeight(kg, unitIsLbs)`**, **`formatVolumeParts(volKg, unitIsLbs)`**, **`kgToDisplay(kg, unitIsLbs)`**, **`unitLabel(unitIsLbs)`**, and convert user inputs back via **`displayToKg(val, unitIsLbs)`**.
2. **Global Preference Broadcasts (`src/hooks/useGymProfile.ts` + `DeviceEventEmitter`):**
   - Changes in Settings or Active Workout sync immediately via `saveGymProfile(...)`, L1 `bootManifest`, and `DeviceEventEmitter` events: `'weight_unit_changed'`, `'auto_timer_setting_changed'`, `'audio_cues_setting_changed'`, `'keep_awake_setting_changed'`, `'default_rest_setting_changed'`.
   - `MiniDualBodyMap`, `PreSessionMuscleHitMap`, and `AnatomicalBodyMapCard` all read `gymProfile?.gender === 'female' ? 'female' : 'male'` reactively so switching silhouette updates every mannequin app-wide.

---

## 8. Typography, Copy & Performance Discipline (`tokens.ts`, `motion.ts`)

1. **Typography Hygiene:**
   - **Never pass `fontWeight` with Inter `FONT_FAMILY.*` fonts** on Android (causes system fallback). Use `FONT_FAMILY.regular`, `.medium`, `.semibold`, `.bold`, `.heavy` with **`includeFontPadding: false`**.
   - **Tabular Numerals:** Wrap all numbers, timers, dates, and weights in **`NumericText`** or **`RollingNumber`** (`fontVariant: ['tabular-nums']`).
   - **Zero Emojis in Chrome/Cards:** Use crisp monochrome or tinted **Lucide Icons** (`lucide-react-native`, `ICON.strokeWidth`) instead of Unicode emojis (`👋`, `👑`, `💎`) in headers, tier ranks, and rows.
   - **No Clipped Section Headers:** Always give flexible titles `flex: 1, minWidth: 0` and trailing badges `flexShrink: 0` so titles (`CONSISTENCY & OUTPUT`) never ellipse on narrow screens.
2. **Motion & 60–120fps Discipline:**
   - **UI Thread Only:** Animations (`useAnimatedScrollHandler`, `AnimatedSvgCircle`, `withTiming`, `withSpring`, `withRepeat`) execute on the Reanimated UI thread cleanly and call `cancelAnimation()` in cleanup.
   - **Leaf Timer Isolation:** Isolate `setInterval(..., 1000)` live session clocks inside memoized leaf text components (`OrbitalClockDigits`, `LiveSessionTimerText`) so parent cards and SVGs never re-render every second.
   - **No First-Frame Tab Flicker:** Drive replay animations through `TabSceneTransition` (`useTabReplayContext`) rather than root React state timers (`useScreenReplayTrigger`).
