-- Furnished is a first-class property attribute (no longer an amenity)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS furnished boolean NOT NULL DEFAULT false;
UPDATE properties SET furnished = true WHERE amenities @> '["furnished"]'::jsonb;
UPDATE properties SET amenities = amenities - 'furnished' WHERE amenities @> '["furnished"]'::jsonb;

-- deal_type gains 'owner_administrator' (no schema change needed, documented here):
-- direct_owner | owner_administrator | real_estate_agency | developer
