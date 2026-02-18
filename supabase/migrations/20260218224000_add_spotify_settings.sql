-- Spotify integration settings for attendance player controls
alter table public.settings
  add column if not exists spotify_enabled boolean not null default false,
  add column if not exists spotify_playlist_url text,
  add column if not exists spotify_access_token text,
  add column if not exists spotify_refresh_token text,
  add column if not exists spotify_token_expires_at timestamptz,
  add column if not exists spotify_connected_at timestamptz,
  add column if not exists spotify_account_id text,
  add column if not exists spotify_account_name text;
