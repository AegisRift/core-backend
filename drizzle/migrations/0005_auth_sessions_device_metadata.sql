ALTER TABLE auth_sessions
  ADD COLUMN IF NOT EXISTS device_name text,
  ADD COLUMN IF NOT EXISTS device_location text;

CREATE INDEX IF NOT EXISTS idx_auth_sessions_device_name ON auth_sessions(device_name);
