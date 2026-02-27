-- Test migration for relational schema concept
-- This is a minimal test to verify the approach works

-- Step 1: Create simple age_bands table
CREATE TABLE IF NOT EXISTS age_bands (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  min_age_months INTEGER NOT NULL,
  max_age_months INTEGER NOT NULL,
  age_range int4range GENERATED ALWAYS AS (int4range(min_age_months, max_age_months, '[)')) STORED,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create GiST index for fast range queries
CREATE INDEX IF NOT EXISTS idx_age_bands_range ON age_bands USING gist (age_range);

-- Step 2: Create simple toy_categories table
CREATE TABLE IF NOT EXISTS toy_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 3: Create bridge tables
CREATE TABLE IF NOT EXISTS toy_age_band (
  toy_id UUID NOT NULL,
  age_band_id INTEGER NOT NULL REFERENCES age_bands(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (toy_id, age_band_id)
);

CREATE TABLE IF NOT EXISTS toy_category_bridge (
  toy_id UUID NOT NULL,
  category_id INTEGER NOT NULL REFERENCES toy_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (toy_id, category_id)
);

-- Step 4: Insert actual ToyFlix age bands (matching production filters)
INSERT INTO age_bands (label, min_age_months, max_age_months, display_order) VALUES
  ('1-2 years', 12, 24, 1),
  ('2-3 years', 24, 36, 2),
  ('3-4 years', 36, 48, 3),
  ('4-6 years', 48, 72, 4),
  ('6-8 years', 72, 96, 5)
ON CONFLICT (label) DO NOTHING;

-- Step 5: Insert actual ToyFlix categories (matching production enum)
INSERT INTO toy_categories (name, slug, display_order) VALUES
  ('Big Toys', 'big_toys', 1),
  ('STEM Toys', 'stem_toys', 2),
  ('Educational Toys', 'educational_toys', 3),
  ('Books', 'books', 4),
  ('Developmental Toys', 'developmental_toys', 5),
  ('Ride-On Toys', 'ride_on_toys', 6)
ON CONFLICT (name) DO NOTHING;

-- Step 6: Create a simple test table to validate the concept
CREATE TABLE IF NOT EXISTS test_toys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert some test data
INSERT INTO test_toys (name, description) VALUES
  ('Building Blocks Set', 'Educational building blocks for creativity'),
  ('Musical Piano Toy', 'Child-friendly piano with colorful keys'),
  ('Puzzle Game', 'Educational puzzle for problem solving')
ON CONFLICT (id) DO NOTHING;

-- Step 7: Create a helper function to test age range queries
CREATE OR REPLACE FUNCTION get_age_bands_for_months(target_age_months INTEGER)
RETURNS TABLE (
  band_id INTEGER,
  band_label TEXT,
  age_range_text TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ab.id as band_id,
    ab.label as band_label,
    ab.age_range::text as age_range_text
  FROM age_bands ab
  WHERE ab.age_range @> target_age_months;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE age_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE toy_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE toy_age_band ENABLE ROW LEVEL SECURITY;
ALTER TABLE toy_category_bridge ENABLE ROW LEVEL SECURITY;

-- Allow public read access for now (can be restricted later)
CREATE POLICY "Public read access for age_bands" ON age_bands FOR SELECT USING (true);
CREATE POLICY "Public read access for toy_categories" ON toy_categories FOR SELECT USING (true);
CREATE POLICY "Public read access for toy_age_band" ON toy_age_band FOR SELECT USING (true);
CREATE POLICY "Public read access for toy_category_bridge" ON toy_category_bridge FOR SELECT USING (true); 