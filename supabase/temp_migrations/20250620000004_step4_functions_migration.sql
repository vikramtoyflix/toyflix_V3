-- Step 4: Create helper functions and migrate existing data
-- Run this in Supabase SQL Editor AFTER steps 1, 2, and 3

-- Helper function to get toys for a specific age in months
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

-- Helper function to get toys for age and category
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

-- Create view for easy toy querying with all relationships
CREATE OR REPLACE VIEW toys_with_details AS
SELECT 
  t.*,
  ARRAY_AGG(DISTINCT ab.label ORDER BY ab.display_order) FILTER (WHERE ab.label IS NOT NULL) as age_band_labels,
  ARRAY_AGG(DISTINCT ab.age_range) FILTER (WHERE ab.age_range IS NOT NULL) as age_ranges,
  ARRAY_AGG(DISTINCT tc.name ORDER BY tc.display_order) FILTER (WHERE tc.name IS NOT NULL) as category_names,
  ARRAY_AGG(DISTINCT tc.slug ORDER BY tc.display_order) FILTER (WHERE tc.slug IS NOT NULL) as category_slugs
FROM toys t
LEFT JOIN toy_age_band tab ON t.id = tab.toy_id
LEFT JOIN age_bands ab ON ab.age_band_id = tab.age_band_id AND ab.is_active = TRUE
LEFT JOIN toy_category_bridge tcb ON t.id = tcb.toy_id
LEFT JOIN toy_categories tc ON tc.category_id = tcb.category_id AND tc.is_active = TRUE
GROUP BY t.id;

-- Migrate existing data from string-based age_range to bridge table
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

-- Migrate existing categories to bridge table
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

-- Add comments for documentation
COMMENT ON FUNCTION get_toys_for_age_months IS 'Fast function to get toys suitable for a specific age in months';
COMMENT ON FUNCTION get_toys_for_age_and_category IS 'Fast function to get toys for specific age and category';
COMMENT ON VIEW toys_with_details IS 'Denormalized view for easy toy querying with all age bands and categories'; 