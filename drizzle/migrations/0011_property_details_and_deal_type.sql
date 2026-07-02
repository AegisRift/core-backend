-- Developer/construction company match
ALTER TABLE properties ADD COLUMN IF NOT EXISTS developer_id text;
CREATE INDEX IF NOT EXISTS idx_properties_developer ON properties(developer_id);

-- Explicit availability date for availability = 'available_on_date'
ALTER TABLE properties ADD COLUMN IF NOT EXISTS available_from_date timestamptz;
UPDATE properties
SET available_from_date = (metadata->>'availableFromDate')::timestamptz
WHERE available_from_date IS NULL
  AND metadata->>'availableFromDate' ~ '^\d{4}-\d{2}-\d{2}';

-- Bathrooms support half baths (e.g. 2.5)
ALTER TABLE properties ALTER COLUMN bathrooms TYPE numeric(4,1) USING bathrooms::numeric(4,1);
ALTER TABLE properties ALTER COLUMN bathrooms SET DEFAULT 0;

-- Listing deal type: direct_owner | real_estate_agency | developer
ALTER TABLE listings ADD COLUMN IF NOT EXISTS deal_type text NOT NULL DEFAULT 'direct_owner';
CREATE INDEX IF NOT EXISTS idx_listings_deal_type ON listings(deal_type);
