-- =============================================================================
-- Migration: 00003_security_hardening.sql
-- Description: Security hardening for room creation, host membership atomicity,
--              RLS role elevation prevention, invite tokens as source of truth,
--              capacity locking, and token revocation.
-- =============================================================================

-- 1. Ensure rooms has consistent column naming and generated columns
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'rooms' and column_name = 'visibility') then
    alter table public.rooms add column visibility text check (visibility in ('public', 'private')) generated always as (case when is_private then 'private' else 'public' end) stored;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'rooms' and column_name = 'provider') then
    alter table public.rooms add column provider text check (provider in ('youtube', 'html5', 'direct')) default 'youtube';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'rooms' and column_name = 'description') then
    alter table public.rooms add column description text check (char_length(description) <= 500);
  end if;
  -- Add revoked status to invite_tokens if not present
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'invite_tokens' and column_name = 'revoked') then
    alter table public.invite_tokens add column revoked boolean not null default false;
  end if;
end $$;

-- 2. Drop insecure or conflicting policies on room_members
drop policy if exists "room_members_insert" on public.room_members;
drop policy if exists "room_members_insert_public_room" on public.room_members;
drop policy if exists "room_members_insert_host" on public.room_members;

-- 3. Secure room_members INSERT policies:
-- Policy A: Room host may insert their own host membership row (for private or public rooms)
create policy "room_members_insert_host"
  on public.room_members
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'host'
    and exists (
      select 1 from public.rooms r
      where r.id = room_id
      and r.host_id = auth.uid()
    )
  );

-- Policy B: Authenticated users may ONLY join public rooms as 'viewer' (cannot self-assign host/co-host)
create policy "room_members_insert_public_room"
  on public.room_members
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'viewer'
    and exists (
      select 1 from public.rooms r
      where r.id = room_id
      and not r.is_private
    )
  );

-- 4. Atomic trigger: Automatically insert host into room_members on room creation
create or replace function public.on_room_created_add_host()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.room_members (room_id, user_id, role)
  values (NEW.id, NEW.host_id, 'host')
  on conflict (room_id, user_id) do nothing;
  return NEW;
end;
$$;

drop trigger if exists trg_room_created_add_host on public.rooms;
create trigger trg_room_created_add_host
  after insert on public.rooms
  for each row execute function public.on_room_created_add_host();

-- 5. Secure invite token redemption function (source of truth: invite_tokens)
-- Prevents race conditions on max_uses and max_members using row-level locking
create or replace function public.redeem_invite_token(p_token text)
returns table(room_id uuid, role text, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_token_record record;
  v_existing_role text;
  v_max_members int;
  v_current_member_count int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required to redeem invite';
  end if;

  -- 1. Lock invite token row to serialize concurrent redemptions
  select * into v_token_record
  from public.invite_tokens
  where token = p_token
  for update;

  if not found then
    return query select null::uuid, null::text, 'invalid_token'::text;
    return;
  end if;

  -- Check revocation
  if v_token_record.revoked then
    return query select null::uuid, null::text, 'revoked_token'::text;
    return;
  end if;

  -- Check expiry
  if v_token_record.expires_at <= now() then
    return query select null::uuid, null::text, 'expired_token'::text;
    return;
  end if;

  -- Check max uses
  if v_token_record.max_uses is not null and v_token_record.uses >= v_token_record.max_uses then
    return query select null::uuid, null::text, 'max_uses_reached'::text;
    return;
  end if;

  -- 2. Check if user is already a member
  select rm.role into v_existing_role
  from public.room_members rm
  where rm.room_id = v_token_record.room_id and rm.user_id = v_user_id;

  if found then
    return query select v_token_record.room_id, v_existing_role, 'already_member'::text;
    return;
  end if;

  -- 3. Lock room row to serialize concurrent capacity checks
  select max_members into v_max_members
  from public.rooms
  where id = v_token_record.room_id
  for update;

  select count(*) into v_current_member_count
  from public.room_members
  where room_id = v_token_record.room_id;

  if v_current_member_count >= v_max_members then
    return query select null::uuid, null::text, 'room_full'::text;
    return;
  end if;

  -- 4. Insert new member with strict 'viewer' role (prevent elevation)
  insert into public.room_members (room_id, user_id, role)
  values (v_token_record.room_id, v_user_id, 'viewer');

  -- 5. Increment usage count
  update public.invite_tokens
  set uses = uses + 1
  where id = v_token_record.id;

  return query select v_token_record.room_id, 'viewer'::text, 'success'::text;
end;
$$;

-- 6. Secure invite revocation function
create or replace function public.revoke_invite_token(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_room_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return false;
  end if;

  select room_id into v_room_id
  from public.invite_tokens
  where token = p_token;

  if not found then
    return false;
  end if;

  -- Only host or co-host can revoke
  if not public.is_room_host_or_cohost(v_room_id) then
    raise exception 'Unauthorized to revoke invite token for this room';
  end if;

  update public.invite_tokens
  set revoked = true
  where token = p_token;

  return true;
end;
$$;
