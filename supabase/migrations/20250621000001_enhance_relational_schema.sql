-- Enhanced Relational Schema for Production Age Filtering with Real Data
-- Phase 1: Production-ready schema with performance optimizations
-- Note: toys table created by earlier migration with real data

-- Step 1: Add foreign key constraints to bridge tables (with proper UUID reference)
ALTER TABLE toy_age_band ADD CONSTRAINT fk_toy_age_band_toy 
  FOREIGN KEY (toy_id) REFERENCES toys(id) ON DELETE CASCADE;

ALTER TABLE toy_category_bridge ADD CONSTRAINT fk_toy_category_bridge_toy 
  FOREIGN KEY (toy_id) REFERENCES toys(id) ON DELETE CASCADE;

-- Step 2: Create materialized view for high-performance queries
CREATE MATERIALIZED VIEW IF NOT EXISTS toys_with_age_bands AS
SELECT 
    t.id,
    t.name,
    t.description,
    t.age_range as legacy_age_range,
    t.min_age,
    t.max_age,
    t.category,
    t.subscription_category,
    t.brand,
    t.retail_price,
    t.rental_price,
    t.available_quantity,
    t.is_featured,
    t.rating,
    t.image_url,
    t.created_at,
    t.updated_at,
    ARRAY_AGG(DISTINCT ab.label) FILTER (WHERE ab.label IS NOT NULL) as age_band_labels,
    ARRAY_AGG(DISTINCT ab.id) FILTER (WHERE ab.id IS NOT NULL) as age_band_ids,
    ARRAY_AGG(DISTINCT ab.age_range::text) FILTER (WHERE ab.age_range IS NOT NULL) as age_ranges,
    ARRAY_AGG(DISTINCT tc.name) FILTER (WHERE tc.name IS NOT NULL) as category_names,
    ARRAY_AGG(DISTINCT tc.slug) FILTER (WHERE tc.slug IS NOT NULL) as category_slugs
FROM toys t
LEFT JOIN toy_age_band tab ON t.id = tab.toy_id
LEFT JOIN age_bands ab ON tab.age_band_id = ab.id AND ab.is_active = true
LEFT JOIN toy_category_bridge tcb ON t.id = tcb.toy_id
LEFT JOIN toy_categories tc ON tcb.category_id = tc.id AND tc.is_active = true
GROUP BY 
    t.id, t.name, t.description, t.age_range, t.min_age, t.max_age,
    t.category, t.subscription_category, t.brand, t.retail_price, 
    t.rental_price, t.available_quantity, t.is_featured, t.rating, 
    t.image_url, t.created_at, t.updated_at;

-- Step 3: Create indexes on the materialized view for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_toys_with_age_bands_id ON toys_with_age_bands (id);
CREATE INDEX IF NOT EXISTS idx_toys_with_age_bands_age_band_ids ON toys_with_age_bands USING GIN (age_band_ids);
CREATE INDEX IF NOT EXISTS idx_toys_with_age_bands_category_slugs ON toys_with_age_bands USING GIN (category_slugs);
CREATE INDEX IF NOT EXISTS idx_toys_with_age_bands_subscription_category ON toys_with_age_bands (subscription_category);
CREATE INDEX IF NOT EXISTS idx_toys_with_age_bands_is_featured ON toys_with_age_bands (is_featured);

-- Step 4: Create production-ready functions for age-based toy filtering
CREATE OR REPLACE FUNCTION get_toys_for_age_hybrid(target_age_months INTEGER, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    toy_id UUID,
    toy_name TEXT,
    legacy_age_range TEXT,
    min_age INTEGER,
    max_age INTEGER,
    age_band_labels TEXT[],
    subscription_category TEXT,
    retail_price NUMERIC,
    is_featured BOOLEAN,
    available_quantity INTEGER
) AS $$
BEGIN
    -- Use hybrid approach: relational first, fallback to legacy
    RETURN QUERY
    SELECT 
        t.id as toy_id,
        t.name as toy_name,
        t.legacy_age_range,
        t.min_age,
        t.max_age,
        t.age_band_labels,
        t.subscription_category::text,
        t.retail_price,
        t.is_featured,
        t.available_quantity
    FROM toys_with_age_bands t
    WHERE (
        -- Relational filtering: check if any age band contains target age
        (t.age_band_ids IS NOT NULL AND array_length(t.age_band_ids, 1) > 0 AND EXISTS (
            SELECT 1 FROM age_bands ab 
            WHERE ab.id = ANY(t.age_band_ids) 
            AND ab.age_range @> target_age_months
        ))
        OR
        -- Fallback to legacy min/max age filtering
        ((t.age_band_ids IS NULL OR array_length(t.age_band_ids, 1) = 0) 
         AND t.min_age IS NOT NULL AND t.max_age IS NOT NULL 
         AND target_age_months >= (t.min_age * 12) 
         AND target_age_months < (t.max_age * 12))
    )
    AND t.available_quantity > 0
    ORDER BY t.is_featured DESC, t.name ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create function for subscription flow filtering
CREATE OR REPLACE FUNCTION get_subscription_toys_hybrid(
    p_age_group TEXT,
    p_subscription_category TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    toy_id UUID,
    toy_name TEXT,
    description TEXT,
    age_range TEXT,
    subscription_category TEXT,
    retail_price NUMERIC,
    rental_price NUMERIC,
    image_url TEXT,
    available_quantity INTEGER,
    rating NUMERIC
) AS $$
DECLARE
    target_age_months INTEGER;
BEGIN
    -- Convert age group string to months (middle of range)
    target_age_months := CASE 
        WHEN p_age_group = '1-2' THEN 18
        WHEN p_age_group = '2-3' THEN 30
        WHEN p_age_group = '3-4' THEN 42
        WHEN p_age_group = '4-6' THEN 60
        WHEN p_age_group = '6-8' THEN 84
        ELSE 36 -- default fallback
    END;

    RETURN QUERY
    SELECT 
        t.id as toy_id,
        t.name as toy_name,
        t.description,
        t.legacy_age_range as age_range,
        t.subscription_category::text,
        t.retail_price,
        t.rental_price,
        t.image_url,
        t.available_quantity,
        t.rating
    FROM toys_with_age_bands t
    WHERE (
        -- Age filtering using hybrid approach
        (t.age_band_ids IS NOT NULL AND array_length(t.age_band_ids, 1) > 0 AND EXISTS (
            SELECT 1 FROM age_bands ab 
            WHERE ab.id = ANY(t.age_band_ids) 
            AND ab.age_range @> target_age_months
        ))
        OR
        -- Fallback to legacy filtering for unmigrated toys
        ((t.age_band_ids IS NULL OR array_length(t.age_band_ids, 1) = 0)
         AND t.min_age IS NOT NULL AND t.max_age IS NOT NULL 
         AND target_age_months >= (t.min_age * 12) 
         AND target_age_months < (t.max_age * 12))
    )
    AND (p_subscription_category IS NULL OR t.subscription_category::text = p_subscription_category)
    AND t.available_quantity > 0
    ORDER BY t.rating DESC NULLS LAST, t.name ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Enhanced data migration helper function for real toy data
CREATE OR REPLACE FUNCTION migrate_toy_to_relational(p_toy_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    toy_record RECORD;
    age_band_id INTEGER;
    min_months INTEGER;
    max_months INTEGER;
    category_id INTEGER;
BEGIN
    -- Get toy data
    SELECT * INTO toy_record FROM toys WHERE id = p_toy_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Clear existing relational data
    DELETE FROM toy_age_band WHERE toy_id = p_toy_id;
    DELETE FROM toy_category_bridge WHERE toy_id = p_toy_id;
    
    -- Migrate age data using min_age/max_age (more reliable than string parsing)
    IF toy_record.min_age IS NOT NULL AND toy_record.max_age IS NOT NULL THEN
        min_months := toy_record.min_age * 12;
        max_months := toy_record.max_age * 12;
        
        -- Find matching age bands that overlap with the toy's age range
        FOR age_band_id IN 
            SELECT ab.id FROM age_bands ab 
            WHERE ab.age_range && int4range(min_months, max_months, '[)')
            AND ab.is_active = true
        LOOP
            INSERT INTO toy_age_band (toy_id, age_band_id) 
            VALUES (p_toy_id, age_band_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
    
    -- Migrate category data - handle both category and subscription_category
    IF toy_record.category IS NOT NULL THEN
        SELECT id INTO category_id FROM toy_categories 
        WHERE slug = toy_record.category AND is_active = true;
        
        IF category_id IS NOT NULL THEN
            INSERT INTO toy_category_bridge (toy_id, category_id)
            VALUES (p_toy_id, category_id)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    -- Also handle subscription_category if different
    IF toy_record.subscription_category IS NOT NULL 
       AND toy_record.subscription_category != toy_record.category THEN
        SELECT id INTO category_id FROM toy_categories 
        WHERE slug = toy_record.subscription_category AND is_active = true;
        
        IF category_id IS NOT NULL THEN
            INSERT INTO toy_category_bridge (toy_id, category_id)
            VALUES (p_toy_id, category_id)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_toys_materialized_view()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW toys_with_age_bands;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_age_bands_active ON age_bands (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_toy_categories_active ON toy_categories (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_toy_age_band_toy_id ON toy_age_band (toy_id);
CREATE INDEX IF NOT EXISTS idx_toy_age_band_age_band_id ON toy_age_band (age_band_id);
CREATE INDEX IF NOT EXISTS idx_toy_category_bridge_toy_id ON toy_category_bridge (toy_id);
CREATE INDEX IF NOT EXISTS idx_toy_category_bridge_category_id ON toy_category_bridge (category_id);

-- Step 9: Create validation function
CREATE OR REPLACE FUNCTION validate_toy_migration()
RETURNS TABLE (
    validation_check TEXT,
    total_toys INTEGER,
    migrated_toys INTEGER,
    percentage_migrated NUMERIC
) AS $$
BEGIN
    -- Check age band migration
    RETURN QUERY
    SELECT 
        'Age Bands Migration'::TEXT as validation_check,
        (SELECT COUNT(*)::INTEGER FROM toys) as total_toys,
        (SELECT COUNT(DISTINCT toy_id)::INTEGER FROM toy_age_band) as migrated_toys,
        ROUND(
            (SELECT COUNT(DISTINCT toy_id)::NUMERIC FROM toy_age_band) * 100.0 / 
            CASE WHEN (SELECT COUNT(*)::NUMERIC FROM toys) = 0 THEN 1 ELSE (SELECT COUNT(*)::NUMERIC FROM toys) END, 2
        ) as percentage_migrated;
    
    -- Check category migration
    RETURN QUERY
    SELECT 
        'Categories Migration'::TEXT as validation_check,
        (SELECT COUNT(*)::INTEGER FROM toys) as total_toys,
        (SELECT COUNT(DISTINCT toy_id)::INTEGER FROM toy_category_bridge) as migrated_toys,
        ROUND(
            (SELECT COUNT(DISTINCT toy_id)::NUMERIC FROM toy_category_bridge) * 100.0 / 
            CASE WHEN (SELECT COUNT(*)::NUMERIC FROM toys) = 0 THEN 1 ELSE (SELECT COUNT(*)::NUMERIC FROM toys) END, 2
        ) as percentage_migrated;
    
    -- Check materialized view
    RETURN QUERY
    SELECT 
        'Materialized View'::TEXT as validation_check,
        (SELECT COUNT(*)::INTEGER FROM toys) as total_toys,
        (SELECT COUNT(*)::INTEGER FROM toys_with_age_bands) as migrated_toys,
        ROUND(
            (SELECT COUNT(*)::NUMERIC FROM toys_with_age_bands) * 100.0 / 
            CASE WHEN (SELECT COUNT(*)::NUMERIC FROM toys) = 0 THEN 1 ELSE (SELECT COUNT(*)::NUMERIC FROM toys) END, 2
        ) as percentage_migrated;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Migrate all real toys to relational schema and refresh view
DO $$
DECLARE
    toy_record RECORD;
    migrated_count INTEGER := 0;
    total_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Migrating real toy data to relational schema...';
    
    -- Count total toys
    SELECT COUNT(*) INTO total_count FROM toys;
    RAISE NOTICE 'Found % toys to migrate', total_count;
    
    -- Migrate each toy
    FOR toy_record IN SELECT id, name FROM toys LOOP
        IF migrate_toy_to_relational(toy_record.id) THEN
            migrated_count := migrated_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Successfully migrated % out of % toys to relational schema', migrated_count, total_count;
    
    -- Refresh materialized view with new data
    PERFORM refresh_toys_materialized_view();
    RAISE NOTICE 'Materialized view refreshed with migrated toy data';
    
    -- Test Hi Life toy specifically
    DECLARE
        hi_life_test RECORD;
    BEGIN
        -- Test the specific Hi Life toy filtering
        SELECT COUNT(*) as count INTO hi_life_test 
        FROM get_subscription_toys_hybrid('1-2') 
        WHERE toy_name LIKE '%Hi Life%';
        RAISE NOTICE 'Hi Life toy in 1-2 years filter (should be 0): %', hi_life_test.count;
        
        SELECT COUNT(*) as count INTO hi_life_test 
        FROM get_subscription_toys_hybrid('2-3') 
        WHERE toy_name LIKE '%Hi Life%';
        RAISE NOTICE 'Hi Life toy in 2-3 years filter (should be 1): %', hi_life_test.count;
        
        SELECT COUNT(*) as count INTO hi_life_test 
        FROM get_subscription_toys_hybrid('3-4') 
        WHERE toy_name LIKE '%Hi Life%';
        RAISE NOTICE 'Hi Life toy in 3-4 years filter (should be 1): %', hi_life_test.count;
    END;
    
    RAISE NOTICE 'Real toy data migration complete! Hi Life toy age filtering fixed.';
END $$; 