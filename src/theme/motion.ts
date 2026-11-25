/**
 * motion.ts — ZenFit Native UI-Thread Motion Physics
 *
 * Single source of truth for Reanimated v4 spring configs, easing curves,
 * and micro-interaction durations. Every animation runs on the native UI thread.
 */

import { Easing, WithSpringConfig } from 'react-native-reanimated';

export const springs = {
  /** Tactile button release recovery — zero rubber-band oscillation */
  tactile: { damping: 20, stiffness: 350, mass: 0.7 } satisfies WithSpringConfig,

  /** Snappy checkboxes, small toggles, segmented pills */
  snappy: { damping: 28, stiffness: 320, mass: 0.7 } satisfies WithSpringConfig,

  /** Card transitions, sheet settles, directional exercise glide */
  standard: { damping: 30, stiffness: 260, mass: 0.8 } satisfies WithSpringConfig,

  /** Bottom sheets & full-height overlays */
  gentle: { damping: 34, stiffness: 220, mass: 0.9 } satisfies WithSpringConfig,

  /** Apple iOS sheet presentation & dismissal spring (crisp deceleration, zero overshoot) */
  sheet: { damping: 32, stiffness: 380, mass: 0.72 } satisfies WithSpringConfig,

  /** Continuous media/layout morphing (GIF expand/collapse, row glide) */
  morph: { damping: 28, stiffness: 310, mass: 0.8 } satisfies WithSpringConfig,

  /** Controlled completion pop (checkmarks, PR celebration badges) */
  bouncy: { damping: 14, stiffness: 280, mass: 0.65 } satisfies WithSpringConfig,
} as const;

export const iosEasing = {
  decel: Easing.bezier(0.16, 1, 0.3, 1),
  standard: Easing.bezier(0.25, 0.1, 0.25, 1),
  accel: Easing.bezier(0.32, 0, 0.67, 0),
} as const;

export const durations = {
  tactilePressIn: 90,
  microTap: 70,
  microRelease: 140,
  stagger: 30,
  sheetOpen: 205,
  sheetClose: 165,
  crossFade: 155,
  checkFade: 120,
  checkDraw: 160,
  poof: 140,
  roulette: 580,
  chartDraw: 650,
  barFill: 540,
} as const;
