-- =============================================================================
-- Migration: 00001_initial_schema.sql
-- Description: Initial schema for SyncWatch – rooms, members, invites,
--              playback state, and chat messages.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Rooms
-- ---------------------------------------------------------------------------
create table public.rooms (
  id            uuid        primary key default uuid_generate_v4(),
  name          text        not null check (char_length(name) between 1 and 80),
  host_id       uuid        not null references auth.users(id) on delete cascade,
  video_url     text,                          -- null = no video loaded yet
  video_type    text        check (video_type in ('youtube', 'direct')) default 'youtube',
  is_private    boolean     not null default true,
  max_members   int         not null default 20 check (max_members between 2 and 100),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table  public.rooms                is 'Watch-party rooms created by users.';
comment on column public.rooms.host_id        is 'The user who owns/created this room.';
comment on column public.rooms.video_url      is 'URL of the currently loaded video; NULL if none.';
comment on column public.rooms.video_type     is 'Source type: youtube or direct (raw video URL).';
comment on column public.rooms.is_private     is 'Private rooms require an invite token to join.';
comment on column public.rooms.max_members    is 'Hard cap on concurrent room members (2–100).';

-- ---------------------------------------------------------------------------
-- Room members
-- ---------------------------------------------------------------------------
create table public.room_members (
  id        uuid        primary key default uuid_generate_v4(),
  room_id   uuid        not null references public.rooms(id) on delete cascade,
  user_id   uuid        not null references auth.users(id) on delete cascade,
  role      text        not null default 'viewer'
                        check (role in ('host', 'co-host', 'viewer')),
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

comment on table  public.room_members          is 'Tracks which users belong to which rooms.';
comment on column public.room_members.role     is 'host | co-host | viewer.';

-- ---------------------------------------------------------------------------
-- Invite tokens
-- ---------------------------------------------------------------------------
create table public.invite_tokens (
  id          uuid        primary key default uuid_generate_v4(),
  room_id     uuid        not null references public.rooms(id) on delete cascade,
  token       text        not null unique
                          default encode(gen_random_bytes(24), 'base64url'),
  created_by  uuid        not null references auth.users(id) on delete cascade,
  expires_at  timestamptz not null default now() + interval '7 days',
  max_uses    int         default null,          -- null = unlimited
  uses        int         not null default 0,
  created_at  timestamptz not null default now()
);

comment on table  public.invite_tokens            is 'Single-use or multi-use invite links for private rooms.';
comment on column public.invite_tokens.max_uses   is 'NULL means the token can be used unlimited times.';
comment on column public.invite_tokens.uses       is 'Running count of how many times this token has been redeemed.';

-- ---------------------------------------------------------------------------
-- Playback state (server-authoritative)
-- ---------------------------------------------------------------------------
create table public.playback_states (
  room_id      uuid        primary key references public.rooms(id) on delete cascade,
  position_ms  bigint      not null default 0,
  is_playing   boolean     not null default false,
  updated_at   timestamptz not null default now(),
  updated_by   uuid        references auth.users(id)
);

comment on table  public.playback_states             is 'Server-authoritative playback position for a room.';
comment on column public.playback_states.position_ms is 'Current playback position in milliseconds.';
comment on column public.playback_states.updated_by  is 'User (host/co-host) who last changed playback state.';

-- ---------------------------------------------------------------------------
-- Chat messages
-- ---------------------------------------------------------------------------
create table public.messages (
  id         uuid        primary key default uuid_generate_v4(),
  room_id    uuid        not null references public.rooms(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  content    text        not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

comment on table public.messages is 'Chat messages sent inside a room.';

-- Composite index for fetching the most recent messages per room efficiently
create index messages_room_created on public.messages(room_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helper: auto-update updated_at columns
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at is 'Trigger function that stamps updated_at to now() on every row update.';

create trigger rooms_updated_at
  before update on public.rooms
  for each row execute procedure public.set_updated_at();

create trigger playback_updated_at
  before update on public.playback_states
  for each row execute procedure public.set_updated_at();
