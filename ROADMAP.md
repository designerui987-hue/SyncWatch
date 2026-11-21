# SyncWatch Roadmap 🗺️

This document outlines the prioritized milestones and technical roadmap for SyncWatch.

---

## Phase 1: MVP Core (Current Milestone) ✅
- [x] Next.js 14 App Router foundation with TypeScript & Tailwind CSS.
- [x] Supabase Auth & PostgreSQL schema with Row-Level Security (RLS).
- [x] Express + Socket.IO custom server with token-based socket authentication.
- [x] Server-authoritative playback engine with drift calculation and correction.
- [x] Private room creation and cryptographic invitation links.
- [x] Real-time group chat with token-bucket rate limiting.
- [x] Host / Co-host / Viewer role permissions and controls.
- [x] Support for YouTube embeds and self-hosted direct video streams.

---

## Phase 2: Browser Extension Integration Layer (Next)
A modular browser-extension layer allowing users to synchronize authorized web players across devices without DRM circumvention.

### Milestones:
1. **Manifest V3 Architecture (Chrome, Edge, Brave)**:
   - Content script bridge communicating with SyncWatch room state via `postMessage`.
   - Dedicated extension popup displaying active room, current watchers, and sync latency.
   - Observer pattern for HTML5 `<video>` elements on authorized sites.
2. **Safari Web Extension**:
   - Xcode macOS / iOS Safari Web Extension packaging.
   - Safari declarativeNetRequest and background service worker compatibility.
3. **Security & Content Policy**:
   - Explicit domain allowlists for user-authorized domains.
   - Strictly no DRM decryption, stream ripping, or credential sharing.

---

## Phase 3: WebRTC & Spatial Audio
- [ ] Direct peer-to-peer audio/video mesh for small watch parties (up to 8 peers).
- [ ] WebRTC voice chat with spatial audio positioning.
- [ ] Noise suppression and echo cancellation using Web Audio API.

---

## Phase 4: Mobile & Apple Ecosystem Support
- [ ] **Progressive Web App (PWA)** enhancements: Web Share API, offline room shell caching, install banners.
- [ ] **Native iOS / iPadOS App (SwiftUI & SwiftData)**:
   - Native AVPlayer sync coordinator.
   - Picture-in-Picture (PiP) background sync.
   - SharePlay integration for native Apple ecosystem watch parties.
- [ ] **Android Companion**: Jetpack Compose and Media3 synchronization layer.

---

## Phase 5: Production Scale & Resilience
- [ ] Redis Adapter for Socket.IO horizontal cluster scaling.
- [ ] Ephemeral presence state via Supabase Realtime Channels.
- [ ] End-to-end telemetry and sync jitter analytics.
