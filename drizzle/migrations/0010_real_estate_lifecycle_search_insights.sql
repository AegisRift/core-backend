-- Property publication lifecycle: draft | published | archived
ALTER TABLE properties ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
-- Existing rows predate the lifecycle; treat them as already published.
UPDATE properties SET status = 'published' WHERE status = 'draft';
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);

-- Listing lifecycle: draft | published | paused | closed ('available' legacy value maps to 'published')
UPDATE listings SET status = 'published' WHERE status = 'available';
ALTER TABLE listings ALTER COLUMN status SET DEFAULT 'draft';

-- Search filter indexes
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_published_at ON listings(published_at);
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON properties(bedrooms);
CREATE INDEX IF NOT EXISTS idx_properties_map_country ON properties((map_location->>'country'));
CREATE INDEX IF NOT EXISTS idx_properties_map_city ON properties((map_location->>'city'));

-- Full-text search indexes (expressions must match the ones used in queries)
CREATE INDEX IF NOT EXISTS idx_listings_fts ON listings USING GIN (
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, ''))
);
CREATE INDEX IF NOT EXISTS idx_properties_fts ON properties USING GIN (
  to_tsvector('simple', coalesce(description, ''))
);

-- Raw behavioral events per user
CREATE TABLE IF NOT EXISTS user_behavior_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_behavior_events_user ON user_behavior_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_events_type ON user_behavior_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_behavior_events_occurred ON user_behavior_events(occurred_at);

-- Aggregated per-user features for the recommendations/feed service
CREATE TABLE IF NOT EXISTS user_behavior_insights (
  user_id text PRIMARY KEY,
  preferred_operation_type text,
  min_price_observed text,
  max_price_observed text,
  avg_price_observed text,
  top_countries jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_cities jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  search_count integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  save_count integer NOT NULL DEFAULT 0,
  lead_count integer NOT NULL DEFAULT 0,
  engagement jsonb NOT NULL DEFAULT '{}'::jsonb,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_activity_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_behavior_insights_updated ON user_behavior_insights(updated_at);
