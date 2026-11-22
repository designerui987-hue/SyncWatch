-- =============================================================================
-- Migration: 00003_security_hardening.sql
-- Description: Security hardening for room membership, invite validation,
--              role elevation prevention, and token redemption.
-- =============================================================================

-- 1. Ensure rooms has consistent column naming
-- Both is_private and visibility/provider compatibility
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
end $$;

-- 2. Drop the insecure open insert policy on room_members
drop policy if exists "room_members_insert" on public.room_members;

-- 3. Replace with a secure insert policy:
-- Authenticated users can ONLY insert themselves into a room IF:
--   a) The room is explicitly public (not is_private), AND
--   b) The assigned role is strictly 'viewer' (cannot self-assign 'host' or 'co-host')
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

-- 4. Secure function to redeem an invite token (prevents race conditions and unauthorized joins)
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
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required to redeem invite';
  end if;

  -- 1. Check invite token validity
  select * into v_token_record
  from public.invite_tokens
  where token = p_token
  for update; -- Lock token row to prevent race conditions on max_uses

  if not found then
    return query select null::uuid, null::text, 'invalid_token'::text;
    return;
  end if;

  if v_token_record.expires_at <= now() then
    return query select null::uuid, null::text, 'expired_token'::text;
    return;
  end if;

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

  -- 3. Check room capacity
  if exists (
    select 1 from public.rooms r
    where r.id = v_token_record.room_id
    and (select count(*) from public.room_members where room_id = r.id) >= r.max_members
  ) then
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

-- 5. Secure function to revoke an invite token
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

  delete from public.invite_tokens where token = p_token;
  return true;
end;
$$;
