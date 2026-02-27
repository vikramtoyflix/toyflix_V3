-- Step 3: Create bridge tables for many-to-many relationships
-- Run this in Supabase SQL Editor AFTER steps 1 and 2

-- Create bridge table for toys and age bands (many-to-many)
CREATE TABLE IF NOT EXISTS toy_age_band (
  toy_id UUID NOT NULL REFERENCES toys(id) ON DELETE CASCADE,
  age_band_id INTEGER NOT NULL REFERENCES age_bands(age_band_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (toy_id, age_band_id)
);

-- Create bridge table for toys and categories (many-to-many)
CREATE TABLE IF NOT EXISTS toy_category_bridge (
  toy_id UUID NOT NULL REFERENCES toys(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES toy_categories(category_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (toy_id, category_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS toy_age_band_age_idx ON toy_age_band(age_band_id);
CREATE INDEX IF NOT EXISTS toy_age_band_toy_idx ON toy_age_band(toy_id);
CREATE INDEX IF NOT EXISTS toy_category_bridge_category_idx ON toy_category_bridge(category_id);
CREATE INDEX IF NOT EXISTS toy_category_bridge_toy_idx ON toy_category_bridge(toy_id);

-- Add RLS policies for bridge tables
ALTER TABLE toy_age_band ENABLE ROW LEVEL SECURITY;
ALTER TABLE toy_category_bridge ENABLE ROW LEVEL SECURITY;

-- Public read access for bridge tables
CREATE POLICY "Toy age bands are publicly readable" ON toy_age_band FOR SELECT USING (TRUE);
CREATE POLICY "Toy categories are publicly readable" ON toy_category_bridge FOR SELECT USING (TRUE);

-- Admin-only write access for bridge tables
CREATE POLICY "Admins can manage toy age bands" ON toy_age_band FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin' OR 
  auth.jwt() ->> 'user_role' = 'admin'
);

CREATE POLICY "Admins can manage toy categories" ON toy_category_bridge FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin' OR 
  auth.jwt() ->> 'user_role' = 'admin'
);

-- Add comments for documentation
COMMENT ON TABLE toy_age_band IS 'Many-to-many bridge table: toys can belong to multiple age bands';
COMMENT ON TABLE toy_category_bridge IS 'Many-to-many bridge table: toys can belong to multiple categories'; 