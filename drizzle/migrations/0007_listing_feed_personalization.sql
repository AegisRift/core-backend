CREATE TABLE IF NOT EXISTS listing_search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  query_text text,
  operation_type text,
  min_price numeric(14,2),
  max_price numeric(14,2),
  country text,
  bedrooms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_search_history_user ON listing_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_search_history_created ON listing_search_history(created_at);
