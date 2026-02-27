-- Step 1: Create age_bands table with PostgreSQL ranges
-- Run this in Supabase SQL Editor

-- Create age_bands table
CREATE TABLE IF NOT EXISTS age_bands (
  age_band_id SERIAL PRIMARY KEY,
  label VARCHAR(50) NOT NULL UNIQUE,
  age_range int4range NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create GiST index for efficient range queries
CREATE INDEX IF NOT EXISTS age_bands_range_gist ON age_bands USING gist (age_range);
CREATE INDEX IF NOT EXISTS age_bands_active_idx ON age_bands(is_active);

-- Populate age_bands with standard ranges (stored as months for precision)
INSERT INTO age_bands (label, age_range, description, display_order) VALUES
  ('0-1 years', '[0,12)', 'Babies and infants', 1),
  ('1-2 years', '[12,24)', 'Toddlers beginning to walk', 2),
  ('2-3 years', '[24,36)', 'Active toddlers', 3),
  ('3-4 years', '[36,48)', 'Preschoolers', 4),
  ('4-5 years', '[48,60)', 'Advanced preschoolers', 5),
  ('5-6 years', '[60,72)', 'Early school age', 6),
  ('6-7 years', '[72,84)', 'School age children', 7),
  ('7-8 years', '[84,96)', 'Elementary students', 8),
  ('8+ years', '[96,240)', 'Older children and teens', 9)
ON CONFLICT (label) DO NOTHING;

-- Add RLS policies
ALTER TABLE age_bands ENABLE ROW LEVEL SECURITY;

-- Public read access for age bands
CREATE POLICY "Age bands are publicly readable" ON age_bands FOR SELECT USING (is_active = TRUE);

-- Admin-only write access
CREATE POLICY "Admins can manage age bands" ON age_bands FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin' OR 
  auth.jwt() ->> 'user_role' = 'admin'
);

-- Add comment for documentation
COMMENT ON TABLE age_bands IS 'Canonical age ranges using PostgreSQL int4range for efficient querying'; 