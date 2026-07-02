ALTER TABLE auth_users
  ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT 'Keuwo',
  ADD COLUMN IF NOT EXISTS last_name text NOT NULL DEFAULT 'User',
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'MX',
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'buyer',
  ADD COLUMN IF NOT EXISTS preferred_contact_method text NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS is_phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_auth_users_phone ON auth_users(phone);
CREATE INDEX IF NOT EXISTS idx_auth_users_country ON auth_users(country);
CREATE INDEX IF NOT EXISTS idx_auth_users_user_type ON auth_users(user_type);
