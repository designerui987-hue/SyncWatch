# SyncWatch Companion Extension (MVP)

A lightweight Manifest V3 browser extension enabling synchronized playback across web players and authorized partner platforms.

## Architecture & Security Model

1. **Scoped Handshake**:
   - The extension exchanges messages with SyncWatch web rooms using an authenticated handshake containing `roomId` and the user's ephemeral `sessionToken`.
   - Messages without matching scope are immediately discarded.

2. **Legal & DRM Compliance**:
   - **No DRM Circumvention**: The extension does not decrypt, hook into MediaKeys, or extract protected Widevine/PlayReady content.
   - **No Credential Access**: The extension does not access, store, or transmit third-party account credentials, passwords, or cookies.
   - **Standard DOM Controls**: Synchronization operates solely through standard HTML5 player control APIs (`play()`, `pause()`, `currentTime`).

## Local Development & Testing

1. Open Google Chrome or Chromium and navigate to `chrome://extensions`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked** and select the `/extension` directory in this repository.
4. Open the test harness at `http://localhost:3000/test-player.html`.
5. Join a SyncWatch room to verify synchronized play, pause, and seek events between tabs.
