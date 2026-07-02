CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_user_id text NOT NULL,
  developer_name text,
  complex_name text,
  operation_type text NOT NULL,
  rent_period text,
  area_m2 numeric(10,2) NOT NULL,
  bedrooms integer NOT NULL DEFAULT 0,
  bathrooms integer NOT NULL DEFAULT 0,
  amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text NOT NULL,
  cost numeric(14,2) NOT NULL,
  requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  availability text NOT NULL DEFAULT 'available',
  published_at timestamptz,
  nearby_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  map_location jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_properties_advertiser ON properties(advertiser_user_id);
CREATE INDEX IF NOT EXISTS idx_properties_availability ON properties(availability);
CREATE INDEX IF NOT EXISTS idx_properties_operation ON properties(operation_type);

CREATE TABLE IF NOT EXISTS property_availability_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  changed_by_user_id text NOT NULL,
  from_status text NOT NULL,
  to_status text NOT NULL,
  reason text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_property_availability_audit_property ON property_availability_audit(property_id);

CREATE TABLE IF NOT EXISTS property_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  user_id text NOT NULL,
  visited_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_property_visits_property ON property_visits(property_id);
CREATE INDEX IF NOT EXISTS idx_property_visits_user ON property_visits(user_id);

CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  title text NOT NULL,
  summary text,
  status text NOT NULL DEFAULT 'available',
  price numeric(14,2) NOT NULL,
  published_at timestamptz,
  deactivated_at timestamptz,
  views_count integer NOT NULL DEFAULT 0,
  saves_count integer NOT NULL DEFAULT 0,
  leads_count integer NOT NULL DEFAULT 0,
  visits_scheduled_count integer NOT NULL DEFAULT 0,
  applications_count integer NOT NULL DEFAULT 0,
  chat_messages_count integer NOT NULL DEFAULT 0,
  last_interaction_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_listings_property ON listings(property_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);

CREATE TABLE IF NOT EXISTS listing_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  event_type text NOT NULL,
  value integer NOT NULL DEFAULT 1,
  actor_user_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_listing_analytics_events_listing ON listing_analytics_events(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_analytics_events_type ON listing_analytics_events(event_type);
