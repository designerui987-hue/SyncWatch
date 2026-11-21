-- =============================================================================
-- Migration: 00002_rls_policies.sql
-- Description: Row Level Security policies for all SyncWatch tables.
--
-- Access model summary
-- ─────────────────────────────────────────────────────────────────────────────
--  Table            | SELECT                    | INSERT          | UPDATE/DELETE
--  rooms            | member OR public invite   | authenticated   | host only
--  room_members     | members of that room      | server-side     | host or self
--  invite_tokens    | host / co-host            | host / co-host  | host / co-host
--  playback_states  | member                    | service role    | service role
--  messages         | member                    | member          | —
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Shared helper: is the calling user a member of a given room?
-- ---------------------------------------------------------------------------
create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from   public.room_members
    where  room_id = p_room_id
    and    user_id = auth.uid()
  );
$$;

comment on function public.is_room_member is
  'Returns TRUE when the calling user has a row in room_members for the given room.';

-- ---------------------------------------------------------------------------
-- Shared helper: is the calling user the host of a given room?
-- ---------------------------------------------------------------------------
create or replace function public.is_room_host(p_room_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from   public.rooms
    where  id      = p_room_id
    and    host_id = auth.uid()
  );
$$;

comment on function public.is_room_host is
  'Returns TRUE when the calling user is the host (owner) of the given room.';

-- ---------------------------------------------------------------------------
-- Shared helper: is the calling user a host OR co-host of a given room?
-- ---------------------------------------------------------------------------
create or replace function public.is_room_host_or_cohost(p_room_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from   public.room_members
    where  room_id = p_room_id
    and    user_id = auth.uid()
    and    role    in ('host', 'co-host')
  );
$$;

comment on function public.is_room_host_or_cohost is
  'Returns TRUE when the calling user is a host or co-host of the given room.';

-- =============================================================================
-- ROOMS
-- =============================================================================
alter table public.rooms enable row level security;

-- SELECT: authenticated member of the room, OR the room is public (not private)
create policy "rooms_select"
  on public.rooms
  for select
  to authenticated
  using (
    public.is_room_member(id)
    or not is_private
  );

-- INSERT: any authenticated user may create a room
create policy "rooms_insert"
  on public.rooms
  for insert
  to authenticated
  with check (host_id = auth.uid());

-- UPDATE: only the room host may change room settings
create policy "rooms_update"
  on public.rooms
  for update
  to authenticated
  using  (host_id = auth.uid())
  with check (host_id = auth.uid());

-- DELETE: only the room host may delete the room
create policy "rooms_delete"
  on public.rooms
  for delete
  to authenticated
  using (host_id = auth.uid());

-- =============================================================================
-- ROOM_MEMBERS
-- =============================================================================
alter table public.room_members enable row level security;

-- SELECT: only existing members of the room can see the member list
create policy "room_members_select"
  on public.room_members
  for select
  to authenticated
  using (public.is_room_member(room_id));

-- INSERT: performed server-side (service role) after validating an invite token.
--         Authenticated users may also insert their OWN membership row (e.g.
--         for public rooms where no token is needed).
create policy "room_members_insert"
  on public.room_members
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- UPDATE: host or co-host may update roles; members cannot change their own role
create policy "room_members_update"
  on public.room_members
  for update
  to authenticated
  using  (public.is_room_host_or_cohost(room_id))
  with check (public.is_room_host_or_cohost(room_id));

-- DELETE: host may remove anyone; a member may remove themselves (leave)
create policy "room_members_delete"
  on public.room_members
  for delete
  to authenticated
  using (
    public.is_room_host(room_id)   -- host kicks anyone
    or user_id = auth.uid()        -- member leaves voluntarily
  );

-- =============================================================================
-- INVITE_TOKENS
-- =============================================================================
alter table public.invite_tokens enable row level security;

-- SELECT: host or co-host of the room may list tokens
create policy "invite_tokens_select"
  on public.invite_tokens
  for select
  to authenticated
  using (public.is_room_host_or_cohost(room_id));

-- INSERT: host or co-host of the room may create tokens
create policy "invite_tokens_insert"
  on public.invite_tokens
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.is_room_host_or_cohost(room_id)
  );

-- UPDATE: host or co-host may revoke / modify tokens (e.g. set max_uses)
create policy "invite_tokens_update"
  on public.invite_tokens
  for update
  to authenticated
  using  (public.is_room_host_or_cohost(room_id))
  with check (public.is_room_host_or_cohost(room_id));

-- DELETE: host or co-host may revoke tokens
create policy "invite_tokens_delete"
  on public.invite_tokens
  for delete
  to authenticated
  using (public.is_room_host_or_cohost(room_id));

-- =============================================================================
-- PLAYBACK_STATES
-- =============================================================================
alter table public.playback_states enable row level security;

-- SELECT: any room member can read the current playback state
create policy "playback_states_select"
  on public.playback_states
  for select
  to authenticated
  using (public.is_room_member(room_id));

-- INSERT/UPDATE/DELETE: intentionally blocked for the authenticated role.
-- All writes are performed by the backend using the Supabase service role key,
-- which bypasses RLS entirely.  This guarantees only the server can mutate
-- playback state (preventing clients from spoofing positions).

-- =============================================================================
-- MESSAGES
-- =============================================================================
alter table public.messages enable row level security;

-- SELECT: room members can read all messages in that room
create policy "messages_select"
  on public.messages
  for select
  to authenticated
  using (public.is_room_member(room_id));

-- INSERT: room members may post messages attributed to themselves
create policy "messages_insert"
  on public.messages
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_room_member(room_id)
  );

-- UPDATE / DELETE: messages are immutable from the client side.
-- Soft-delete or moderation should be handled server-side via service role.
