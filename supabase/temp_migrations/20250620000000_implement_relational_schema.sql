-- Migration: Implement relational schema for toys with proper age bands and categories
-- This replaces string-based age ranges with PostgreSQL int4range and bridge tables

-- Step 1: Create age_bands table with PostgreSQL ranges
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

-- Step 2: Populate age_bands with standard ranges (stored as months for precision)
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

-- Step 3: Create enhanced categories table (replace enum approach)
CREATE TABLE IF NOT EXISTS toy_categories (
  category_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  parent_id INTEGER REFERENCES toy_categories(category_id),
  icon VARCHAR(100),
  color VARCHAR(7), -- hex color code
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS toy_categories_parent_idx ON toy_categories(parent_id);
CREATE INDEX IF NOT EXISTS toy_categories_active_idx ON toy_categories(is_active);

-- Populate categories based on current enum values plus expansions
INSERT INTO toy_categories (name, slug, description, display_order) VALUES
  ('Big Toys', 'big-toys', 'Large play equipment and ride-on toys', 1),
  ('STEM Toys', 'stem-toys', 'Science, Technology, Engineering, Math toys', 2),
  ('Educational Toys', 'educational-toys', 'Learning and development focused toys', 3),
  ('Books', 'books', 'Educational books and reading materials', 4),
  ('Developmental Toys', 'developmental-toys', 'Toys for skill development', 5),
  ('Ride-On Toys', 'ride-on-toys', 'Bikes, scooters, and riding toys', 6),
  ('Creative Arts', 'creative-arts', 'Art supplies and creative play', 7),
  ('Building & Construction', 'building-construction', 'LEGO, blocks, building sets', 8),
  ('Puzzles & Games', 'puzzles-games', 'Brain teasers and board games', 9),
  ('Outdoor Play', 'outdoor-play', 'Sports and outdoor activities', 10),
  ('Musical Instruments', 'musical-instruments', 'Music toys and instruments', 11),
  ('Action Figures', 'action-figures', 'Character toys and collectibles', 12)
ON CONFLICT (name) DO NOTHING;

-- Step 4: Create bridge tables for many-to-many relationships
CREATE TABLE IF NOT EXISTS toy_age_band (
  toy_id UUID NOT NULL REFERENCES toys(id) ON DELETE CASCADE,
  age_band_id INTEGER NOT NULL REFERENCES age_bands(age_band_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (toy_id, age_band_id)
);

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

-- Step 5: Migrate existing data from string-based age_range to bridge table
-- Parse existing age_range strings and map to age_bands
INSERT INTO toy_age_band (toy_id, age_band_id)
SELECT DISTINCT 
  t.id as toy_id,
  ab.age_band_id
FROM toys t
CROSS JOIN age_bands ab
WHERE t.age_range IS NOT NULL
  AND (
    -- Map common age range patterns
    (t.age_range ILIKE '%0-1%' AND ab.label = '0-1 years') OR
    (t.age_range ILIKE '%1-2%' AND ab.label = '1-2 years') OR
    (t.age_range ILIKE '%2-3%' AND ab.label = '2-3 years') OR
    (t.age_range ILIKE '%3-4%' AND ab.label = '3-4 years') OR
    (t.age_range ILIKE '%4-5%' AND ab.label = '4-5 years') OR
    (t.age_range ILIKE '%5-6%' AND ab.label = '5-6 years') OR
    (t.age_range ILIKE '%6-7%' AND ab.label = '6-7 years') OR
    (t.age_range ILIKE '%7-8%' AND ab.label = '7-8 years') OR
    (t.age_range ILIKE '%8%' AND ab.label = '8+ years')
  )
ON CONFLICT (toy_id, age_band_id) DO NOTHING;

-- Step 6: Migrate existing categories to bridge table
INSERT INTO toy_category_bridge (toy_id, category_id)
SELECT 
  t.id as toy_id,
  tc.category_id
FROM toys t
JOIN toy_categories tc ON (
  (t.category::text = 'big_toys' AND tc.slug = 'big-toys') OR
  (t.category::text = 'stem_toys' AND tc.slug = 'stem-toys') OR
  (t.category::text = 'educational_toys' AND tc.slug = 'educational-toys') OR
  (t.category::text = 'books' AND tc.slug = 'books') OR
  (t.category::text = 'developmental_toys' AND tc.slug = 'developmental-toys') OR
  (t.category::text = 'ride_on_toys' AND tc.slug = 'ride-on-toys')
)
ON CONFLICT (toy_id, category_id) DO NOTHING;

-- Step 7: Create helper functions for efficient querying
CREATE OR REPLACE FUNCTION get_toys_for_age_months(target_age_months INTEGER)
RETURNS TABLE(
  toy_id UUID,
  toy_name TEXT,
  age_labels TEXT[],
  category_names TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    t.id as toy_id,
    t.name as toy_name,
    ARRAY_AGG(DISTINCT ab.label) as age_labels,
    ARRAY_AGG(DISTINCT tc.name) as category_names
  FROM toys t
  JOIN toy_age_band tab ON t.id = tab.toy_id
  JOIN age_bands ab ON ab.age_band_id = tab.age_band_id
  LEFT JOIN toy_category_bridge tcb ON t.id = tcb.toy_id
  LEFT JOIN toy_categories tc ON tc.category_id = tcb.category_id
  WHERE t.available_quantity > 0
    AND target_age_months BETWEEN lower(ab.age_range) AND upper(ab.age_range) - 1
    AND ab.is_active = TRUE
    AND (tc.is_active = TRUE OR tc.is_active IS NULL)
  GROUP BY t.id, t.name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_toys_for_age_and_category(
  target_age_months INTEGER,
  category_slug TEXT
)
RETURNS TABLE(
  toy_id UUID,
  toy_name TEXT,
  age_labels TEXT[],
  category_names TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    t.id as toy_id,
    t.name as toy_name,
    ARRAY_AGG(DISTINCT ab.label) as age_labels,
    ARRAY_AGG(DISTINCT tc.name) as category_names
  FROM toys t
  JOIN toy_age_band tab ON t.id = tab.toy_id
  JOIN age_bands ab ON ab.age_band_id = tab.age_band_id
  JOIN toy_category_bridge tcb ON t.id = tcb.toy_id
  JOIN toy_categories tc ON tc.category_id = tcb.category_id
  WHERE t.available_quantity > 0
    AND target_age_months BETWEEN lower(ab.age_range) AND upper(ab.age_range) - 1
    AND tc.slug = category_slug
    AND ab.is_active = TRUE
    AND tc.is_active = TRUE
  GROUP BY t.id, t.name;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create view for easy toy querying with all relationships
CREATE OR REPLACE VIEW toys_with_details AS
SELECT 
  t.*,
  ARRAY_AGG(DISTINCT ab.label ORDER BY ab.display_order) as age_band_labels,
  ARRAY_AGG(DISTINCT ab.age_range) as age_ranges,
  ARRAY_AGG(DISTINCT tc.name ORDER BY tc.display_order) as category_names,
  ARRAY_AGG(DISTINCT tc.slug ORDER BY tc.display_order) as category_slugs
FROM toys t
LEFT JOIN toy_age_band tab ON t.id = tab.toy_id
LEFT JOIN age_bands ab ON ab.age_band_id = tab.age_band_id AND ab.is_active = TRUE
LEFT JOIN toy_category_bridge tcb ON t.id = tcb.toy_id
LEFT JOIN toy_categories tc ON tc.category_id = tcb.category_id AND tc.is_active = TRUE
GROUP BY t.id;

-- Step 9: Add RLS policies for new tables
ALTER TABLE age_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE toy_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE toy_age_band ENABLE ROW LEVEL SECURITY;
ALTER TABLE toy_category_bridge ENABLE ROW LEVEL SECURITY;

-- Public read access for age bands and categories
CREATE POLICY "Age bands are publicly readable" ON age_bands FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Categories are publicly readable" ON toy_categories FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Toy age bands are publicly readable" ON toy_age_band FOR SELECT USING (TRUE);
CREATE POLICY "Toy categories are publicly readable" ON toy_category_bridge FOR SELECT USING (TRUE);

-- Admin-only write access
CREATE POLICY "Admins can manage age bands" ON age_bands FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admins can manage categories" ON toy_categories FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admins can manage toy age bands" ON toy_age_band FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admins can manage toy categories" ON toy_category_bridge FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Step 10: Add comments for documentation
COMMENT ON TABLE age_bands IS 'Canonical age ranges using PostgreSQL int4range for efficient querying';
COMMENT ON TABLE toy_categories IS 'Hierarchical category system supporting multiple categories per toy';
COMMENT ON TABLE toy_age_band IS 'Many-to-many bridge table: toys can belong to multiple age bands';
COMMENT ON TABLE toy_category_bridge IS 'Many-to-many bridge table: toys can belong to multiple categories';
COMMENT ON FUNCTION get_toys_for_age_months IS 'Fast function to get toys suitable for a specific age in months';
COMMENT ON VIEW toys_with_details IS 'Denormalized view for easy toy querying with all age bands and categories'; 