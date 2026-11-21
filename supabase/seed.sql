-- =============================================================================
-- seed.sql – Dev-only demo data for SyncWatch
-- WARNING: Do NOT run this against a production database.
--
-- What this creates
--   • One demo user identity entry (via auth.users insert – local dev only)
--   • One public demo room owned by that user
--   • The host's room_members row
--   • A playback_state row (paused at 0 ms)
--   • An invite token that never expires
--   • Two sample chat messages
-- =============================================================================

do $$
declare
  v_user_id  uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_room_id  uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
  v_token_id uuid := 'cccccccc-0000-0000-0000-000000000001';
begin

  -- -------------------------------------------------------------------------
  -- Demo user (Supabase local dev only – auth schema is accessible)
  -- In production users are created through the Supabase Auth API.
  -- -------------------------------------------------------------------------
  insert into auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
  )
  values (
    v_user_id,
    'demo@syncwatch.local',
    crypt('demo-password-123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Demo User"}',
    false,
    'authenticated'
  )
  on conflict (id) do nothing;

  -- -------------------------------------------------------------------------
  -- Demo room
  -- -------------------------------------------------------------------------
  insert into public.rooms (id, name, host_id, video_url, video_type, is_private, max_members)
  values (
    v_room_id,
    'Demo Room 🎬',
    v_user_id,
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'youtube',
    false,   -- public so anyone can discover it in dev
    20
  )
  on conflict (id) do nothing;

  -- -------------------------------------------------------------------------
  -- Host membership row
  -- -------------------------------------------------------------------------
  insert into public.room_members (room_id, user_id, role)
  values (v_room_id, v_user_id, 'host')
  on conflict (room_id, user_id) do nothing;

  -- -------------------------------------------------------------------------
  -- Initial playback state (paused at beginning)
  -- -------------------------------------------------------------------------
  insert into public.playback_states (room_id, position_ms, is_playing, updated_by)
  values (v_room_id, 0, false, v_user_id)
  on conflict (room_id) do nothing;

  -- -------------------------------------------------------------------------
  -- Invite token (never expires in dev, unlimited uses)
  -- -------------------------------------------------------------------------
  insert into public.invite_tokens (id, room_id, token, created_by, expires_at, max_uses)
  values (
    v_token_id,
    v_room_id,
    'dev-invite-token-syncwatch',
    v_user_id,
    now() + interval '100 years',
    null
  )
  on conflict (id) do nothing;

  -- -------------------------------------------------------------------------
  -- Sample chat messages
  -- -------------------------------------------------------------------------
  insert into public.messages (room_id, user_id, content)
  values
    (v_room_id, v_user_id, 'Welcome to the demo room! 🎉'),
    (v_room_id, v_user_id, 'Press play to start watching together.')
  on conflict do nothing;

end $$;
