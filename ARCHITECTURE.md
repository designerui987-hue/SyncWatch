# SyncWatch System Architecture 🏗️

This document describes the core architecture, data contracts, and synchronization algorithms powering the SyncWatch platform.

---

## 1. System Overview

SyncWatch combines standard HTTP request handling with low-latency bidirectional WebSockets and an ACID-compliant relational persistence layer.

```
+-------------------------------------------------------------------------+
|                              SyncWatch Client                           |
|  (Next.js React 18, Tailwind CSS, Media Players, usePlayback, useSocket)|
+------------------------------------+------------------------------------+
                                     |
               HTTPS (REST / SSR)    |    WebSocket (Socket.IO)
                                     |
+------------------------------------v------------------------------------+
|                         Next.js & Custom Server                         |
|  - App Router API Routes (/api/rooms, /api/invite, /auth)              |
|  - Socket.IO Server Engine                                             |
|  - Token Bucket Rate Limiters (server/rateLimit.ts)                     |
|  - Ephemeral Server Room Store (server/rooms.ts)                        |
|  - Playback Drift Assessment Engine (server/playback.ts)                |
+------------------+----------------------------------+-------------------+
                   |                                  |
                   v                                  v
+----------------------------------+  +-----------------------------------+
|      Supabase Auth & JWT         |  |   PostgreSQL Database (Supabase)  |
|  - User session tokens           |  |   - rooms, room_members           |
|  - Role-based claims             |  |   - invite_tokens, messages       |
+----------------------------------+  |   - Row-Level Security (RLS)      |
                                      +-----------------------------------+
```

---

## 2. Server-Authoritative Playback & Drift Correction

### Clock Model
When a room host initiates playback:
1. The client sends a `playback:update` socket payload containing the target timestamp `T_target` and status `playing`.
2. The server records:
   - `positionMs = T_target * 1000`
   - `isPlaying = true`
   - `lastUpdatedAt = Date.now()`
   - `lastUpdatedBy = userId`
3. The server computes canonical current position dynamically:
   $$\text{CurrentPosition}(t) = \text{positionMs} + (t - \text{lastUpdatedAt})$$
4. When any client reports their local timestamp $T_{\text{client}}$:
   $$\text{Drift} = |\text{CurrentPosition}(\text{now}) - T_{\text{client}}|$$
5. If $\text{Drift} > 1000\text{ ms}$, the server sends a correction event (`corrected: true`), commanding the client player to perform a hard seek to align with the authoritative room clock.

---

## 3. Data & Security Architecture

### Role-Based Access Model
- **Host**: The room creator. Can change media streams, grant/revoke co-host status, configure room privacy, and adjust playback.
- **Co-Host**: Designated participants granted permission to play, pause, and seek.
- **Viewer**: Read-only watcher. Media playback and stream switching controls are locked to maintain synchronization with the host.

### Database Row-Level Security (RLS)
- Public rooms are discoverable; private rooms are restricted to members and token holders.
- Chat messages are isolated to verified room members.
- Cryptographic invite tokens are generated with 24-byte secure random values (`gen_random_bytes(24)`).

---

## 4. Rate Limiting Strategy

To prevent denial of service and event flooding over WebSockets:
- **Chat Messages**: Limited to 3 messages per second per connected socket.
- **Playback Updates**: Limited to 5 updates per second per controller socket.
- Violations trigger a `room:error` event with code `RATE_LIMITED`.
