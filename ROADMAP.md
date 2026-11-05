# ZenFit Roadmap

Where **ZenFit** is heading, in the order it is planned to land.

ZenFit follows a pragmatic, lifter-first engineering schedule: **a stable release every one to two weeks**, ensuring optimizations, recovery formula refinements, and hardware enhancements reach athletes quickly without long branch drift.

---

## 🎯 Release Pipeline & Milestones

```
┌────────────────────────────────────────────────────────────────────────┐
│ ZENFIT MILESTONE PIPELINE                                              │
├──────────┬──────────┬─────────────────────────────────┬────────────────┤
│ Version  │ Date     │ Focus Theme                     │ Status         │
├──────────┼──────────┼─────────────────────────────────┼────────────────┤
│ v1.0.0   │ Oct 2026 │ Native Lifter Engine & PPL      │ ✅ Shipped     │
│ v1.1.0   │ Oct 2026 │ Closed-Loop CNS & Fast Keypad   │ ✅ Shipped     │
│ v1.2.0   │ Oct 2026 │ 525 Movement GIFs & Alias Search│ ✅ Shipped     │
│ v1.3.0   │ Nov 2026 │ 18-Muscle Vector Mannequin      │ ✅ Shipped     │
│ v1.4.0   │ Nov 2026 │ Live Android Widget & 72h Queue │ ✅ Shipped     │
│ v1.5.0   │ Dec 2026 │ Wear OS Companion & Rest Bezel  │ 🔄 In Progress │
│ v1.6.0   │ Jan 2027 │ Health Connect & Offline Export │ 📋 Planned     │
│ v2.0.0   │ Q2 2027  │ Barbell Velocity Tracking (VBT) │ 💡 Research    │
└──────────┴──────────┴─────────────────────────────────┴────────────────┘
```

---

## 🔄 Currently in Progress: v1.5.0 (December 2026)

### Theme: The Wrist Companion (Wear OS & Apple Watch)

Lifters shouldn't have to keep picking up a heavy smartphone while holding dumbbells or adjusting plates.

**Planned Deliverables:**
- **Wear OS Standalone App:** Built for Galaxy Watch, Pixel Watch, and Wear OS 4+ devices.
  - Start today's split from the wrist tile.
  - Tap or rotate the digital crown to adjust reps and weight.
  - Haptic vibration countdown on rest timer expiry.
  - Real-time heart rate recording stamped onto set completion logs.
- **Bi-Directional Local Sync:** Local socket/Bluetooth sync between phone and watch without requiring internet or third-party cloud accounts.
- **Apple Watch Companion:** Standalone watchOS client mirroring the active workout session state.

---

## 📋 Planned: v1.6.0 (January 2027)

### Theme: Data Sovereignty & Ecosystem Integration

- **Android Health Connect Integration:** Read and write active energy burned, resting heart rate, and strength workout sessions directly into Google Health Connect.
- **Apple HealthKit Sync:** Full two-way sync for iOS devices.
- **Peer-to-Peer Local Encrypted Backup:** Export entire workout history, split templates, and body weight logs as an encrypted JSON archive. Transfer between devices via local Wi-Fi or QR code without a server.
- **CSV & Excel Raw Data Exporter:** One-click spreadsheet export for powerlifters and strength coaches who maintain external analytics sheets.

---

## 💡 Future Research: v2.0.0 (2027)

### Theme: Computer Vision & Advanced Science

- **Barbell Velocity Tracker (VBT):** On-device camera tracking using TensorFlow Lite / MediaPipe to calculate mean concentric velocity ($m/s$) and real-time velocity loss percentage on compound lifts.
- **Automatic RPE Calibration:** Compare estimated RIR against concentric bar speed drop-off to automatically eliminate lifter self-assessment bias.
- **1RM Percentage Programming (5/3/1, Smolov, Sheiko):** Built-in percentage-based programming templates calculated automatically from verified 1RMs.

---

## 🤝 How Features are Prioritized

1. **Zero Latency First:** A feature will not be merged if it adds more than 16ms of frame time or introduces UI stutter during set logging.
2. **Offline-First Non-Negotiable:** Every feature must work in an underground basement gym with zero cellular connectivity.
3. **Scientifically Grounded:** Training metrics must be anchored in validated biomechanical literature (e.g. Dr. Mike Israetel, Schoenfeld, Helms) rather than fitness marketing fads.

