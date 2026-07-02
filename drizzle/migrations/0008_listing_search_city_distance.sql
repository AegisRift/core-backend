ALTER TABLE listing_search_history
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS distance_range_km numeric(10,2),
  ADD COLUMN IF NOT EXISTS user_lat numeric(10,7),
  ADD COLUMN IF NOT EXISTS user_lng numeric(10,7);

CREATE INDEX IF NOT EXISTS idx_listing_search_history_city ON listing_search_history(city);
