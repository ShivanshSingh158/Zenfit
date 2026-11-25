# ZenFit Design System & Apple HIG Consistency Audit
**Exhaustive Visual, Ergonomic & Design Uniformity Forensic Report**  
*Auditor: Design System & Apple HIG Consistency Auditor (`analyst-benchmark`)*  
*Target Standards: Apple Human Interface Guidelines (iOS HIG), OLED 3-Layer Hierarchy, WCAG 2.1 AA Contrast, 44x44pt Touch Target Standard*

---

## Executive Summary & Architectural Diagnosis

ZenFit claims an *"Obsidian Cosmos"* Apple HIG dark theme anchored on a strict 3-layer OLED hierarchy (`#000000` canvas $\rightarrow$ `#1C1C1E` grouped cards $\rightarrow$ `#2C2C2E` elevated inputs).

However, an exhaustive forensic inspection of the codebase reveals **severe design system entropy**:
1. **Color Drift**: Over **14 distinct arbitrary dark greys** (`#0A0A0C`, `#121214`, `#141416`, `#161618`, `#1E1E22`, `#1E1E24`, `#242426`, `#242428`, `#26262A`, `#27272A`, `#2C2C32`, etc.) and a rogue purple accent (`#7C5CFC`) are hardcoded directly into component styles, destroying visual unity.
2. **Border Radius Chaos**: The design tokens specify a clean scale (`RADIUS = { sm: 4, md: 8, lg: 12, xl: 16, xxl: 24, full: 999 }`), but components use **12 un-tokenized radii** (including fractional values like `2.25px`, `2.5px`, `3px`, `6px`, `7px`, `9px`, `10px`, `11px`, `13px`, `14px`, `18px`, `20px`).
3. **Typography Tokens & Android Faux-Bold Bugs**: Developers frequently use `fontWeight: '700'` or `'bold'` instead of `fontFamily: FONT_FAMILY.bold`. In React Native, applying `fontWeight: '700'` to custom Expo fonts triggers faux-bold double strokes on Android and font fallback to system fonts.
4. **Sub-44px Touch Targets & HitSlop Collisions**: Primary and interactive buttons across the workout banner, split tabs, and set rows have heights of 32px, 36px, 38px, and 42px—violating the Apple HIG 44x44pt requirement. Furthermore, hitSlop on set checkboxes collides with adjacent numeric steppers.
5. **Modal & Sheet Anarchy**: Bottom sheets vary wildly in drag handle dimensions (`38x4 r:2` vs `38x4.5 r:3` vs `36x4.5 r:2.5`), backdrop opacity (`0.65` vs `0.70` vs `0.72` vs `0.75` vs `0.78`), and close button placements. In `TelegramTabBar.tsx`, a `BlurView` with intensity 85 is placed over an opaque `#0A0A0C` background, completely disabling the blur effect!

Below is the exhaustive catalog of **50 concrete, file-and-line-grounded design system violations**.

---

## Catalog of 50 Concrete Design System Violations

### Category 1: Color Drift & Dark Theme Surface Incoherence

#### 1. Rogue Off-Black Tab Bar Surface Nullifying BlurView
- **File & Line**: `src/components/Navigation/TelegramTabBar.tsx:371`
- **Violation**: `backgroundColor: isDark ? '#0A0A0C' : '#FFFFFF'`
- **HIG Impact**: Apple HIG specifies pure black `#000000` for OLED backgrounds and translucent materials (`systemThinMaterialDark`) for tab bars. Overlaying a `<BlurView intensity={85}>` on top of an opaque `#0A0A0C` view completely blocks light transmission, creating a flat, muddy bar instead of an authentic frosted glass surface.

#### 2. Rogue Dark Grey in Active Exercise Header
- **File & Line**: `src/components/Gym/active/ActiveExerciseHeader.tsx:210, 217`
- **Violation**: `backgroundColor: '#141416'`
- **HIG Impact**: Introduces `#141416`, which is neither the OLED canvas (`#000000`) nor the secondary surface (`#1C1C1E`). This creates an awkward, low-contrast washed-out boundary behind exercise media.

#### 3. Video Player Container Uses Arbitrary Zinc Surface
- **File & Line**: `src/components/Gym/active/ActiveExerciseVideo.tsx:38`
- **Violation**: `backgroundColor: '#161618'`
- **HIG Impact**: A third unique dark shade `#161618` appears in the video player thumbnail, clashing with the parent sheet's background.

#### 4. Active Swap Modal Bottom Sheet Background Divergence
- **File & Line**: `src/components/Gym/active/ActiveSwapModal.tsx:441`
- **Violation**: `sheetBackgroundColor="#121214"`
- **HIG Impact**: The token system defines sheet surfaces as `DARK_COLORS.surfaceRaised` (`#242426`) or `IOS_DARK.bgGroupedCard` (`#1C1C1E`). `#121214` is an arbitrary tone that breaks the 3-layer surface hierarchy.

#### 5. Exercise Menu Sheet Background Divergence
- **File & Line**: `src/components/Gym/active/ExerciseMenuSheet.tsx:59, 243`
- **Violation**: `sheetBackgroundColor="#121214"`
- **HIG Impact**: Duplicates the rogue `#121214` sheet background, making sheets noticeably darker than modal cards (`#1C1C1E`), inverting Apple HIG's elevation elevation rule (higher elevation = lighter surface).

#### 6. Finish Early Sheet Background Divergence
- **File & Line**: `src/components/Gym/active/FinishEarlySheet.tsx:63, 112`
- **Violation**: `sheetBackgroundColor="#121214"`
- **HIG Impact**: Yet another modal sheet hardcoding `#121214` instead of consuming theme tokens or inheriting from `BottomSheet`.

#### 7. Workout Settings Sheet Introduces a Fourth Sheet Background
- **File & Line**: `src/components/Gym/active/WorkoutSettingsSheet.tsx:65`
- **Violation**: `sheetBackgroundColor="#161618"`
- **HIG Impact**: In the same active workout session, tapping "Exercise Menu" opens a `#121214` sheet, but tapping "Workout Settings" opens a `#161618` sheet! This produces jarring visual inconsistency between adjacent modal interactions.

#### 8. Rogue Tailwind Zinc 800 in Set Stepper Pills
- **File & Line**: `src/components/Gym/active/SwipeableSetRow.tsx:508`
- **Violation**: `backgroundColor: '#27272A'`
- **HIG Impact**: `#27272A` is Tailwind Zinc 800. In Apple HIG, tertiary input controls use `IOS_DARK.bgElevatedInput` (`#2C2C2E`). Mixing Tailwind greys with Apple system greys gives the rows a dirty, greenish-grey tint.

#### 9. Keypad Container Introduces Two Un-Tokenized Dark Greys
- **File & Line**: `src/components/Gym/active/WorkoutKeypad.tsx:406, 436, 448, 487`
- **Violation**: `backgroundColor: '#242428'` (number keys), `#2C2C32` (action keys), `#1E1E24` (RIR sheet)
- **HIG Impact**: Three un-tokenized greys in a single file! Keys appear mismatched with the rest of the app's elevated input surfaces.

#### 10. Rogue Purple Accent in History & Weekly Reports
- **File & Line**: `src/screens/gym/GymHistoryScreen.tsx:585` & `src/components/Gym/metrics/weeklyGymReportStyles.ts:892`
- **Violation**: `backgroundColor: '#7C5CFC'`
- **HIG Impact**: The brand primary accent is defined in `tokens.ts` as `#A599FF` (dark) and `#6C5CE7` (light). `#7C5CFC` is an uncoordinated rogue violet that degrades brand coherence across charts and scorecard dots.

---

### Category 2: Border Radius Chaos & Non-Token Corner Scaling

#### 11. Fractional Border Radius in Active Swap Modal Handle
- **File & Line**: `src/components/Gym/active/ActiveSwapModal.tsx:649`
- **Violation**: `borderRadius: 2.25`
- **HIG Impact**: Fractional pixel radii cause subpixel antialiasing blur on non-3x displays. In `tokens.ts`, `RADIUS.sm = 4`.

#### 12. Non-Token Border Radius 2px in Sheet Handles
- **File & Line**: `src/components/Gym/active/ActiveSwapModal.tsx:462`, `FinishEarlySheet.tsx:129`, `WhatThisSessionHitsSheet.tsx:271`
- **Violation**: `borderRadius: 2`
- **HIG Impact**: Arbitrary 2px radius creates sharp, blocky drag indicators rather than authentic Apple HIG pill indicators (which always use full capsule curvature: `borderRadius: 999` or $height / 2$).

#### 13. Non-Token Border Radius 3px in Rest Timer & History Progress Bars
- **File & Line**: `src/screens/gym/GymProgressScreen.tsx:602, 609`, `weeklyGymReportStyles.ts:885, 891`
- **Violation**: `borderRadius: 3`
- **HIG Impact**: Progress bar caps use 3px instead of `RADIUS.sm` (4px) or capsule `full` (999), producing visual tension against 8px and 12px parent containers.

#### 14. Non-Token Border Radius 6px in Exercise Menu & Badges
- **File & Line**: `src/components/Gym/active/ActiveSwapModal.tsx:529, 643`, `ActiveExerciseHeader.tsx:588`, `GymProgressScreen.tsx:573`
- **Violation**: `borderRadius: 6`
- **HIG Impact**: 6px sits in an uncanny valley between `RADIUS.sm = 4` and `RADIUS.md = 8`.

#### 15. Non-Token Border Radius 7px in Skeleton Loaders
- **File & Line**: `src/screens/gym/ActiveLoggingScreen.tsx:1916, 1922`
- **Violation**: `borderRadius: 7`
- **HIG Impact**: Skeleton placeholders use 7px corners while the actual hydrated set rows use 10px or 12px, resulting in an obvious layout snap upon data load.

#### 16. Stepper Pill Non-Token 10px Radius
- **File & Line**: `src/components/Gym/active/SwipeableSetRow.tsx:507`
- **Violation**: `borderRadius: 10`
- **HIG Impact**: The central interactive element in active logging uses 10px radius, clashing with the outer set card's 14px or 16px radius.

#### 17. Routines Tab Card Radius Divergence (14px vs 16px)
- **File & Line**: `src/screens/gym/splits/tabs/RoutinesTab.tsx:337, 360, 456`
- **Violation**: `borderRadius: 14`
- **HIG Impact**: Cards in `RoutinesTab.tsx` use 14px, while cards in `GymHomeScreen.tsx` use 16px (`RADIUS.xl`), and cards in `GymDashboardScreen.tsx` use 12px (`RADIUS.lg`). There is zero consistency in card corner radius across the four core tabs!

#### 18. Weekly Day Card Non-Token 14px Radius
- **File & Line**: `src/components/Gym/schedule/WeeklyDayCard.tsx:140`
- **Violation**: `borderRadius: 14`
- **HIG Impact**: Schedule cards use 14px, diverging from `GymScheduleDayCard.tsx` which uses 16px.

#### 19. History Screen Metric Card Non-Token 18px Radius
- **File & Line**: `src/screens/gym/GymHistoryScreen.tsx:1570`
- **Violation**: `borderRadius: 18`
- **HIG Impact**: Sits awkwardly between `RADIUS.xl = 16` and `RADIUS.xxl = 24`.

#### 20. Notification Center Rogue 24px and 14px Radii
- **File & Line**: `src/components/Notifications/InAppNotificationCenterModal.tsx:271, 332`
- **Violation**: `borderRadius: 24`, `borderRadius: 14`, `borderRadius: 3`
- **HIG Impact**: Mixes three incompatible radius steps within a single sheet.

---

### Category 3: Typography Drift & Android Faux-Bold Hazards

#### 21. Android Faux-Bold Bug in Notification Modal
- **File & Line**: `src/components/Notifications/InAppNotificationCenterModal.tsx:312, 316, 388`
- **Violation**: `fontWeight: '700'` applied without `fontFamily: FONT_FAMILY.bold`
- **HIG Impact**: On Android, omitting `fontFamily` defaults to Roboto rather than Inter. On iOS, mixing `fontWeight: '700'` with custom font weights can cause blurred text rendering.

#### 22. Workout Timer Hardcoded `fontWeight: 'bold'`
- **File & Line**: `src/components/Gym/active/WorkoutTimer.tsx:33`
- **Violation**: `fontWeight: 'bold'`
- **HIG Impact**: Bypasses `FONT_FAMILY.bold` (`Inter_700Bold`) and misses tabular figures (`fontVariant: ['tabular-nums']`), causing active timer digits to jitter horizontally as seconds tick.

#### 23. Draggable Exercise Row Inline Bold Override
- **File & Line**: `src/components/Gym/exercise/GymExerciseDraggableRow.tsx:105`
- **Violation**: `isActive && { color: IOS_DARK.accent, fontWeight: '700' }`
- **HIG Impact**: Mutating `fontWeight` dynamically during drag interactions causes text measurement reflows in the Yoga layout engine, dropping animation frames.

#### 24. Weekly Gym Report Stylesheet Hardcodes 15+ Font Weights
- **File & Line**: `src/components/Gym/metrics/weeklyGymReportStyles.ts:21, 61, 75, 115, 132, 173, 218, 238, 292, 383, 434, 486, 545, 624`
- **Violation**: Repeated `fontWeight: '700'` and `fontWeight: '600'`
- **HIG Impact**: Bypasses the tokenized font system (`FONT_FAMILY.bold`, `FONT_FAMILY.semibold`), rendering standard system fonts instead of the imported Inter font family.

#### 25. Schedule Day Card Fractional Font Size & Hardcoded Weight
- **File & Line**: `src/components/Gym/schedule/GymScheduleDayCard.tsx:70`
- **Violation**: `fontSize: 10.5, fontWeight: '700'`
- **HIG Impact**: Fractional font size (`10.5`) causes font rasterization blur on 2x display scales.

#### 26. Schedule Settings Modal Inline Font Weights
- **File & Line**: `src/components/Gym/schedule/GymScheduleSettingsModal.tsx:256, 270`
- **Violation**: `fontSize: 13, fontWeight: '700', color: modalTab === 'schedule' ? '#FFFFFF' : colors.textTertiary`
- **HIG Impact**: Inlines font styling and hardcodes `#FFFFFF` directly in render components instead of defining structured style objects.

#### 27. Orphaned Editorial Serif Token in Gym Core
- **File & Line**: `src/theme/tokens.ts:194` (`FONT_FAMILY.serif = 'PlayfairDisplay_600SemiBold'`)
- **Violation**: Never utilized across any of the 4 gym modules (Home, Plan, Train, Analytics).
- **HIG Impact**: Inconsistency between design token claims and production application reality.

#### 28. Missing Tabular Figures on Set Steppers
- **File & Line**: `src/components/Gym/active/SwipeableSetRow.tsx:537–544`
- **Violation**: `numericInputText` lacks `fontVariant: ['tabular-nums']`
- **HIG Impact**: When lifters increment reps from 9 to 10 or 19 to 20, the text jumps horizontally due to proportional character spacing.

#### 29. WCAG AA Contrast Violation on Keypad Checkmark
- **File & Line**: `src/components/Gym/active/WorkoutKeypad.tsx:470–476`
- **Violation**: `color: '#FFFFFF'` on `backgroundColor: '#30D158'`
- **HIG Impact**: White text on Apple system neon green (`#30D158`) has a contrast ratio of only **1.87:1**, severely failing WCAG 2.1 AA requirements (minimum 4.5:1). Dark charcoal text (`#000000`) is mandatory on `#30D158`.

#### 30. Inconsistent Text Letter Spacing Across Card Headers
- **File & Line**: `src/screens/gym/gymHomeStyles.ts:50` (`letterSpacing: -0.3`) vs `GymWorkoutBanner.tsx:358` (`letterSpacing: 0.5`) vs `WorkoutKeypad.tsx:474` (`letterSpacing: 0.5`)
- **HIG Impact**: Semantically identical uppercase overlines and card headers display contradictory tracking (some tightly condensed, others widely spaced).

---

### Category 4: Button Standards, Sub-44px Touch Targets & HitSlop Collisions

#### 31. Sub-44px Touch Target in Routine Header Primary Action
- **File & Line**: `src/screens/gym/splits/styles/gymSplitsStyles.ts:60`
- **Violation**: `height: 32, borderRadius: 16`
- **HIG Impact**: Apple HIG Section *"Buttons and Touch Targets"* mandates a minimum interactive size of 44x44pt. A 32px button without hitSlop produces frequent missed taps.

#### 32. Sub-44px Touch Target in Weekly Day Card Actions
- **File & Line**: `src/components/Gym/schedule/WeeklyDayCard.tsx:152, 193`
- **Violation**: `height: 36` and `height: 32`
- **HIG Impact**: Interactive schedule buttons fail touch target standards for sweaty gym fingers.

#### 33. Sub-44px Outline Button in Workout Banner
- **File & Line**: `src/components/Gym/active/GymWorkoutBanner.tsx:460`
- **Violation**: `height: 38, borderRadius: 999`
- **HIG Impact**: The secondary banner button ("Edit Workout") is only 38px tall, falling 6pt below Apple's touch threshold.

#### 34. Primary Solid Button Sub-44px Height
- **File & Line**: `src/components/Gym/active/GymWorkoutBanner.tsx:426`
- **Violation**: `minHeight: 40`
- **HIG Impact**: The single most prominent call-to-action on the Home screen ("Start Workout") is styled with `minHeight: 40`, failing the 44pt standard.

#### 35. Sub-44px Pill Buttons in Routines Tab
- **File & Line**: `src/screens/gym/splits/tabs/RoutinesTab.tsx:426, 441`
- **Violation**: `height: 38, borderRadius: 999`
- **HIG Impact**: Folder filter buttons are 38px tall, leading to touch ambiguity on small screens.

#### 36. Primary Action Button Height Drift in gymSplitsStyles (42px vs 44px)
- **File & Line**: `src/screens/gym/splits/styles/gymSplitsStyles.ts:226, 241, 258, 273`
- **Violation**: `height: 42` for accent buttons, `height: 44` for primary white buttons
- **HIG Impact**: Adjacent primary buttons in the same modal sheet differ by 2px in height without any visual justification.

#### 37. Dead Style Code with Sub-44px Icon Buttons
- **File & Line**: `src/screens/gym/gymHomeStyles.ts:71–78`
- **Violation**: `plainIconBtn: { width: 32, height: 32, borderRadius: 16 }`
- **HIG Impact**: Unused style definition providing an unsafe 32x32 button template.

#### 38. Touch Target Bleed & HitSlop Collision in SwipeableSetRow
- **File & Line**: `src/components/Gym/active/SwipeableSetRow.tsx:419, 428, 557`
- **Violation**: `colCheck: { width: 38 }`, `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}`
- **HIG Impact**: The column width is 38px, but the checkbox with 8px horizontal hitSlop expands to **46px**. The left hitSlop bleeds directly into the reps increment stepper button, causing accidental set completions when athletes attempt to increment reps!

#### 39. Missing HitSlop on Modal Close Buttons
- **File & Line**: `src/screens/gym/splits/modals/AssignRoutineModal.tsx:45`
- **Violation**: `<TouchableOpacity onPress={onClose}><Ionicons name="close" size={20} color="#8E8E93" />`
- **HIG Impact**: Raw 20px close icon with zero padding and zero hitSlop, forcing users to tap a tiny 20x20 pixel area to dismiss the modal.

#### 40. Chaotic `activeOpacity` Drift Across Buttons
- **File & Line**: Across `ActiveExerciseHeader.tsx:264, 364`, `ActiveSwapModal.tsx:183, 416`, `FinishEarlySheet.tsx:76`, `GymWorkoutBanner.tsx:330`
- **Violation**: Randomly fluctuates between `0.70`, `0.75`, `0.80`, `0.85`, and un-styled default `0.20`.
- **HIG Impact**: Button press feedback feels erratic: some buttons barely dim, while others flash nearly transparent (default 0.20), breaking visual fluidity.

---

### Category 5: Modal & Sheet Inconsistency, Drag Pill Drift & Backdrop Anarchy

#### 41. Sheet Handle Dimension Drift: 38x4 vs 38x4.5 vs 36x4
- **File & Line**: `ActiveSwapModal.tsx:459` (`38x4 r:2`) vs `SetRestPickerSheet.tsx:287` (`38x4.5 r:3`) vs `WhatThisSessionHitsSheet.tsx:268` (`36x4 r:2`) vs `BottomSheet.tsx:309` (`36x4.5 r:2.5`)
- **HIG Impact**: Four distinct geometry specifications for the standard modal grab handle pill across bottom sheets!

#### 42. Sheet Handle Color & Transparency Drift
- **File & Line**: `SetRestPickerSheet.tsx:290` (`#3A3A3C`) vs `ActiveSwapModal.tsx:463` (`rgba(255,255,255,0.25)`) vs `WhatThisSessionHitsSheet.tsx:272` (`rgba(255,255,255,0.20)`)
- **HIG Impact**: Some sheets display solid grey handles, while others display translucent white pills at differing opacities.

#### 43. Missing Sheet Grab Handles in Key Modals
- **File & Line**: `src/screens/gym/splits/modals/AssignRoutineModal.tsx`, `SwapRoutineModal.tsx`, `TimePresetModal.tsx`
- **HIG Impact**: Several modal sheets completely omit the drag handle pill, confusing users as to whether the sheet can be swiped down to dismiss.

#### 44. Modal Backdrop Blur Intensity Inconsistency
- **File & Line**: `TelegramTabBar.tsx:376` (`intensity={85}`) vs `BottomSheet.tsx:225` (`intensity={isDark ? 30 : 20}`) vs `FadeModal.tsx:130` (`intensity={isDark ? 30 : 20}`)
- **HIG Impact**: Tab bar blurs at intensity 85, while modal overlays blur at intensity 30, creating inconsistent depth perception.

#### 45. Modal Backdrop Alpha Roulette (65% to 78%)
- **File & Line**: `SetRestPickerSheet.tsx:266` (`0.65`) vs `WhatThisSessionHitsSheet.tsx:249` (`0.70`) vs `ActiveSwapModal.tsx:437` (`0.72`) vs `WorkoutNoteModal.tsx:130` (`0.75`) vs `ScheduledNotificationsModal.tsx:531` (`0.78`)
- **HIG Impact**: Five arbitrary background dimming opacities! Modal dismissals produce flashing overlay brightness shifts when chaining sheets.

#### 46. Close Button Placement Asymmetry: Top-Right vs Top-Left vs None
- **File & Line**: `DayDetailModal.tsx:154` (top-right inside action cluster) vs `WorkoutSettingsSheet.tsx:82` (top-right plain) vs `ExerciseMenuSheet.tsx` (NO close button) vs `FinishEarlySheet.tsx` (NO close button)
- **HIG Impact**: Users must guess where the close button is—or whether a close button exists at all—depending on which sheet they open.

#### 47. Close Button Icon Color Drift (`#8E8E93` vs `#FFFFFF`)
- **File & Line**: `DayDetailModal.tsx:159` (`#8E8E93`) vs `MesocycleModal.tsx:49` (`#FFFFFF`)
- **HIG Impact**: Identical 20px close icons display contrasting colors (dimmed secondary grey vs high-contrast solid white).

#### 48. Missing "Cancel" Safe Dismiss Action in FinishEarlySheet
- **File & Line**: `src/components/Gym/active/FinishEarlySheet.tsx:70–97`
- **Violation**: Only provides "Finish and save" and "Discard workout" actions.
- **HIG Impact**: Fails Apple HIG guidelines for destructive confirmation sheets, which require an explicit, easily tapped "Cancel" action button to prevent accidental workout termination.

#### 49. Inconsistent Modal Corner Radii (24px vs 16px vs Unconstrained)
- **File & Line**: `InAppNotificationCenterModal.tsx:271` (`borderRadius: 24`) vs `WorkoutKeypad.tsx:488` (`borderRadius: 16`) vs `DayDetailModal.tsx:82` (`borderTopLeftRadius: 0`)
- **HIG Impact**: Sheet headers and modal containers jump between curved floating modals, flat full-height sheets, and tight 16px cards without a unified structural logic.

#### 50. Bottom Sheet Margin & Safe Inset Padding Discrepancies
- **File & Line**: `ExerciseMenuSheet.tsx:61` (`paddingHorizontal: 16`) vs `WorkoutSettingsSheet.tsx:69` (`paddingHorizontal: 20`) vs `WorkoutKeypad.tsx:416` (`paddingHorizontal: 6`)
- **HIG Impact**: Interactive content margins shift horizontally between 6px, 16px, and 20px as different sheets open, creating visual misalignment with the navigation bar and header.

---

## Concrete Design System Remedy Blueprint

To eliminate this entropy and establish an uncompromising Apple HIG interface, the team must implement the following architectural fixes:

### 1. Enforce the Strict 3-Surface Palette
```typescript
// Replace all rogue greys with the unified 3-layer tokens:
export const SURFACE_TOKENS = {
  CANVAS:   '#000000', // Root screen background only
  CARD:     '#1C1C1E', // Grouped cards, rows, bottom sheets
  ELEVATED: '#2C2C2E', // Inputs, steppers, segmented controls
  BORDER:   'rgba(84, 84, 88, 0.36)', // 0.5px hairline separator
} as const;
```

### 2. Standardize Interactive Button Heights & Radii
- **Primary Hero CTA**: `height: 50`, `borderRadius: 999` (Pill), `activeOpacity: 0.8`
- **Standard Button**: `height: 44`, `borderRadius: 12`, `activeOpacity: 0.75`
- **Compact Chip / Tag**: `height: 32`, `borderRadius: 8`, `hitSlop: { top: 8, bottom: 8, left: 6, right: 6 }`

### 3. Normalize Bottom Sheet Grab Handles
```typescript
export const SHEET_HANDLE_STYLE = {
  width: 36,
  height: 5,
  borderRadius: 999, // Perfect capsule
  backgroundColor: 'rgba(255, 255, 255, 0.28)',
  alignSelf: 'center',
  marginTop: 8,
  marginBottom: 16,
} as const;
```

### 4. Typography Rules for Custom Fonts in React Native
- **Rule**: Never use `fontWeight: '700'` or `'600'` directly. Always apply the loaded font family token:
  ```typescript
  // CORRECT:
  fontFamily: FONT_FAMILY.bold, // 'Inter_700Bold'
  
  // FORBIDDEN (Triggers Android faux-bold & font fallback):
  fontWeight: '700',
  ```
- Always apply `fontVariant: ['tabular-nums']` to all workout timers, rest clocks, set numbers, and weight/reps counters.
