ALTER TABLE auth_sessions
  ADD COLUMN IF NOT EXISTS device_id text NOT NULL DEFAULT 'unknown-device';

CREATE INDEX IF NOT EXISTS idx_auth_sessions_device ON auth_sessions(device_id);

ALTER TABLE auth_users
  DROP COLUMN IF EXISTS bio;
