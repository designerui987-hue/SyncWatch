# SyncWatch 🎬

> Production-oriented, open-source, cross-device watch-party platform with server-authoritative synchronization.

---

## 🌟 Overview

SyncWatch enables friends and communities to watch self-hosted or authorized media (YouTube embeds and direct video streams) together in real-time with millisecond-grade playback synchronization, interactive group chat, and host/co-host access control.

Built with Next.js 14, React 18, TypeScript, Tailwind CSS, Supabase Auth/PostgreSQL, and Socket.IO.

---

## 🚀 Key Features

- **Server-Authoritative Synchronization**: Real-time play, pause, and seek commands enforced by a canonical server clock with automatic drift calculation and correction (>1000ms threshold).
- **Private Rooms & Invites**: Create private rooms with cryptographic invite links and customizable visibility.
- **Granular Permissions**: Role-based access control (Host, Co-Host, Viewer). Viewers enjoy synchronized viewing while hosts manage media transport.
- **Integrated Group Chat**: Real-time room chat with token-bucket rate limiting and optimistic messaging.
- **Dark-Mode-First UI**: Responsive, accessible interface built with Tailwind CSS, supporting reduced-motion preferences.
- **Security by Design**: Row-Level Security (RLS) on PostgreSQL, server-side JWT verification, input validation with Zod, and zero DRM circumvention or illegal stream extraction.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router), React 18 |
| **Language** | TypeScript (Strict mode) |
| **Styling** | Tailwind CSS, Lucide Icons |
| **Realtime** | Socket.IO (Custom Express server integration) |
| **Database & Auth** | Supabase (PostgreSQL with Row Level Security, Supabase Auth) |
| **Validation** | Zod |
| **Testing** | Vitest, Supertest, Playwright |

---

## 🏁 Quick Start

### 1. Prerequisites
- Node.js 18+ or Node 20+
- A Supabase project (or local Supabase CLI instance)

### 2. Environment Configuration
Copy the example environment file and fill in your Supabase credentials:
```bash
cp .env.example .env.local
```

### 3. Database Migrations
Apply the initial schema and RLS policies to your Supabase PostgreSQL database:
```bash
npm run db:migrate
```
*(Or execute `supabase/migrations/00001_initial_schema.sql` and `supabase/migrations/00002_rls_policies.sql` directly in your Supabase SQL Editor).*

### 4. Install Dependencies & Run
```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to create a room or join with an invitation link.

---

## 🧪 Testing

```bash
# Run unit & logic tests
npm run test

# Type check
npm run typecheck

# Production build
npm run build
```

---

## 🛡️ Security & Compliance

SyncWatch strictly adheres to streaming terms and copyright laws:
- **No DRM Circumvention**: Does not decrypt or extract copyrighted streams.
- **Supported Sources**: Self-hosted direct videos (MP4/WebM) and official YouTube embeds using standard iframes.
- **Safe State Relay**: Video URLs and playback timestamps are coordinated without re-hosting or relaying copyrighted media data through the server.

---

## 🗺️ Roadmap & Extensions

For planned browser extensions (Chrome, Safari, Edge), mobile apps, and WebRTC integration, see [ROADMAP.md](./ROADMAP.md).

For deep architectural details and synchronization algorithms, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.
