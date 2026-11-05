# Security Policy

ZenFit is an offline-first native lifter platform. You run the app directly on your physical hardware, and you retain complete ownership of your workout logs and biometric metrics.

This document outlines supported versions, vulnerability disclosure procedures, and the scope of ZenFit's security model.

---

## Supported Versions

Only the **latest release** receives security patches.

| Release Channel | Supported | Notes |
| :--- | :--- | :--- |
| **Latest Release Tag** (`v1.x.x`) | ✅ Yes | Active patches and hotfix builds |
| **`main` Branch (HEAD)** | ✅ Yes | Latest developer snapshot |
| **Older Releases** | ❌ No | Users are expected to update to the latest release |

---

## Reporting a Vulnerability

If you discover a security vulnerability in ZenFit, please report it privately:

👉 **[Submit a Private Vulnerability Report on GitHub](https://github.com/ShivanshSingh158/Zenfit/security/advisories/new)**

This keeps the discussion confidential between you and the maintainers until an official advisory and fix are released.

### What to Include in Your Report
To help us triage and resolve the issue quickly, please provide:
1. **Target Version / Commit SHA** you evaluated.
2. **Device Environment**: Android version, OEM (e.g. Pixel, Samsung), or iOS version.
3. **Step-by-Step Reproduction Guide**: Clear, reproducible instructions (or PoC script/intent payload).
4. **Potential Impact**: What an attacker gains if the vulnerability is exploited.

### Response Time & Expectations
ZenFit is maintained by active open-source engineers. We aim to acknowledge vulnerability reports within **48–72 hours** and provide timeline estimates for patch releases. Please allow reasonable time for a fix before engaging in coordinated public disclosure.

---

## Scope

### In Scope
- **Cryptographic / Keystore Security**: Accidental leakage of auth tokens or credentials in local persistent stores (`AsyncStorage`, SQLite, or native SharedPreferences).
- **Native Bridge & IPC Vulnerabilities**: Malicious intent interception or exported Android Activities/Services allowing unauthorized external apps to inject malicious state.
- **Android Home Screen Widget Security**: Unauthorized inspection or manipulation of `LiveWorkoutWidget` intent handlers and pending intent broadcasts.
- **Biometric & Health Data Exposure**: Unauthorized cross-app exfiltration of personal workout history, body measurements, or GPS geofence locations without explicit user permission.
- **Supply Chain Vulnerabilities**: Exploitable security flaws introduced by direct third-party npm packages or native CocoaPods/Gradle dependencies.

### Out of Scope
- Attacks requiring physical device access or full root/jailbreak privileges where an attacker already controls the operating system sandbox.
- Self-inflicted client modifications (e.g., modifying local code or debugging tools).
- Missing certificate pinning when configuring custom user-provided API endpoints.
- Denial-of-Service (DoS) attacks on local device memory buffers caused by intentionally malformed custom exercise files.

---

## Security Architecture Principles

1. **Local-First Isolation:** All workout logs, weight measurements, and routine configurations reside inside the application's private sandbox directory (`AsyncStorage`). No unauthenticated local network ports are opened by default.
2. **Minimal Native Permissions:** ZenFit only requests runtime permissions strictly necessary for user-opted features (e.g., notifications for the rest timer, coarse location for optional gym geofencing).
3. **Zero Telemetry:** The app does not include third-party advertising SDKs, tracking pixels, or background telemetry agents.
