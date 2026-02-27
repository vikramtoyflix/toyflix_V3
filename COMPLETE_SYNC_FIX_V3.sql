-- COMPLETE_SYNC_FIX_V3.sql - FINAL FIX with UPSERT logic
-- This fixes the issue where toys already exist in age tables

-- Step 1: Drop existing problematic triggers and functions
DROP TRIGGER IF EXISTS trigger_sync_toy_inventory_to_age_tables ON toys;
DROP TRIGGER IF EXISTS trigger_auto_insert_toy_to_age_tables ON toys;
DROP TRIGGER IF EXISTS trigger_sync_toys_to_age_tables ON toys;
DROP FUNCTION IF EXISTS sync_toy_inventory_to_age_tables() CASCADE;
DROP FUNCTION IF EXISTS auto_insert_toy_to_age_tables() CASCADE;
DROP FUNCTION IF EXISTS sync_toys_to_age_tables() CASCADE;
DROP FUNCTION IF EXISTS sync_all_toys_to_age_tables() CASCADE;
DROP FUNCTION IF EXISTS get_applicable_age_tables() CASCADE;

-- Step 2: Create helper function to parse age ranges and return applicable tables
CREATE OR REPLACE FUNCTION get_applicable_age_tables(age_range_input TEXT)
RETURNS TEXT[] AS $$
DECLARE
    v_age_range TEXT;
    v_age_tables TEXT[] := ARRAY[]::TEXT[];
    age_elements TEXT[];
    age_element TEXT;
    cleaned_element TEXT;
BEGIN
    v_age_range := COALESCE(age_range_input, '');
    
    -- Skip if no age range or ride-on toys
    IF v_age_range IS NULL OR v_age_range = '' OR v_age_range ILIKE '%ride on no age%' THEN
        RETURN v_age_tables;
    END IF;
    
    -- Handle JSON arrays like ["1-2 years","2-3 years"]
    IF v_age_range LIKE '[%]' THEN
        v_age_range := TRIM(v_age_range, '[]');
        v_age_range := REPLACE(v_age_range, '"', '');
        age_elements := string_to_array(v_age_range, ',');
    ELSE
        -- Handle comma-separated or simple strings
        age_elements := string_to_array(v_age_range, ',');
    END IF;
    
    -- Parse each age element
    FOREACH age_element IN ARRAY age_elements
    LOOP
        cleaned_element := LOWER(TRIM(age_element));
        cleaned_element := REPLACE(cleaned_element, ' years', '');
        cleaned_element := REPLACE(cleaned_element, ' year', '');
        
        -- Map age ranges to table names
        IF cleaned_element LIKE '%1-2%' OR cleaned_element LIKE '%1 to 2%' THEN
            IF NOT ('toys_1_2_years' = ANY(v_age_tables)) THEN
                v_age_tables := v_age_tables || ARRAY['toys_1_2_years'];
            END IF;
        END IF;
        
        IF cleaned_element LIKE '%2-3%' OR cleaned_element LIKE '%2 to 3%' THEN
            IF NOT ('toys_2_3_years' = ANY(v_age_tables)) THEN
                v_age_tables := v_age_tables || ARRAY['toys_2_3_years'];
            END IF;
        END IF;
        
        IF cleaned_element LIKE '%3-4%' OR cleaned_element LIKE '%3 to 4%' THEN
            IF NOT ('toys_3_4_years' = ANY(v_age_tables)) THEN
                v_age_tables := v_age_tables || ARRAY['toys_3_4_years'];
            END IF;
        END IF;
        
        IF cleaned_element LIKE '%4-6%' OR cleaned_element LIKE '%4 to 6%' OR cleaned_element LIKE '%5%' THEN
            IF NOT ('toys_4_6_years' = ANY(v_age_tables)) THEN
                v_age_tables := v_age_tables || ARRAY['toys_4_6_years'];
            END IF;
        END IF;
        
        IF cleaned_element LIKE '%6-8%' OR cleaned_element LIKE '%6 to 8%' OR cleaned_element LIKE '%7%' OR cleaned_element LIKE '%8%' THEN
            IF NOT ('toys_6_8_years' = ANY(v_age_tables)) THEN
                v_age_tables := v_age_tables || ARRAY['toys_6_8_years'];
            END IF;
        END IF;
    END LOOP;
    
    RETURN v_age_tables;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create UPSERT sync function that handles existing toys
CREATE OR REPLACE FUNCTION sync_toys_to_age_tables()
RETURNS TRIGGER AS $$
DECLARE
    v_age_tables TEXT[];
    v_age_table TEXT;
    v_toy_record RECORD;
    v_operation TEXT;
BEGIN
    -- Determine the operation and record to work with
    IF TG_OP = 'DELETE' THEN
        v_toy_record := OLD;
        v_operation := 'DELETE';
    ELSE
        v_toy_record := NEW;
        v_operation := TG_OP;
    END IF;
    
    -- Get applicable age tables
    v_age_tables := get_applicable_age_tables(v_toy_record.age_range);
    
    -- Process each applicable age table
    FOREACH v_age_table IN ARRAY v_age_tables
    LOOP
        IF v_operation = 'DELETE' THEN
            -- Remove from age table
            EXECUTE format('DELETE FROM %I WHERE original_toy_id = $1', v_age_table)
            USING v_toy_record.id;
            
        ELSIF v_operation = 'INSERT' OR v_operation = 'UPDATE' THEN
            -- UPSERT into age table (INSERT with ON CONFLICT UPDATE)
            EXECUTE format('
                INSERT INTO %I (
                    original_toy_id, name, brand, category, age_range, 
                    retail_price, rental_price, image_url, description,
                    available_quantity, total_quantity, is_featured, 
                    display_order, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
                )
                ON CONFLICT (original_toy_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    brand = EXCLUDED.brand,
                    category = EXCLUDED.category,
                    age_range = EXCLUDED.age_range,
                    retail_price = EXCLUDED.retail_price,
                    rental_price = EXCLUDED.rental_price,
                    image_url = EXCLUDED.image_url,
                    description = EXCLUDED.description,
                    available_quantity = EXCLUDED.available_quantity,
                    total_quantity = EXCLUDED.total_quantity,
                    is_featured = EXCLUDED.is_featured,
                    display_order = EXCLUDED.display_order,
                    updated_at = EXCLUDED.updated_at
            ', v_age_table)
            USING 
                v_toy_record.id,
                v_toy_record.name,
                v_toy_record.brand,
                v_toy_record.category,
                v_toy_record.age_range,
                v_toy_record.retail_price,
                v_toy_record.rental_price,
                v_toy_record.image_url,
                v_toy_record.description,
                v_toy_record.available_quantity,
                v_toy_record.total_quantity,
                v_toy_record.is_featured,
                v_toy_record.display_order,
                v_toy_record.created_at,
                v_toy_record.updated_at;
        END IF;
    END LOOP;
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create comprehensive trigger for ALL operations
CREATE TRIGGER trigger_sync_toys_to_age_tables
    AFTER INSERT OR UPDATE OR DELETE ON toys
    FOR EACH ROW
    EXECUTE FUNCTION sync_toys_to_age_tables();

-- Step 5: Create improved function to manually sync ALL existing toys with UPSERT
CREATE OR REPLACE FUNCTION sync_all_toys_to_age_tables()
RETURNS TABLE (
    toy_id UUID,
    toy_name TEXT,
    action TEXT,
    age_tables_updated INTEGER
) AS $$
DECLARE
    toy_record RECORD;
    v_age_tables TEXT[];
    v_age_table TEXT;
    v_tables_updated INTEGER;
    v_affected_rows INTEGER;
BEGIN
    -- Loop through all toys in the main table
    FOR toy_record IN 
        SELECT id, name, brand, category, age_range, retail_price, rental_price,
               image_url, description, available_quantity, total_quantity,
               is_featured, display_order, created_at, updated_at
        FROM toys
        ORDER BY name
    LOOP
        v_tables_updated := 0;
        
        -- Get applicable age tables for this toy
        v_age_tables := get_applicable_age_tables(toy_record.age_range);
        
        -- Skip if no applicable tables (e.g., ride-on toys)
        IF array_length(v_age_tables, 1) IS NULL THEN
            toy_id := toy_record.id;
            toy_name := toy_record.name;
            action := 'SKIPPED';
            age_tables_updated := 0;
            RETURN NEXT;
            CONTINUE;
        END IF;
        
        -- UPSERT into each applicable age table
        FOREACH v_age_table IN ARRAY v_age_tables
        LOOP
            EXECUTE format('
                INSERT INTO %I (
                    original_toy_id, name, brand, category, age_range, 
                    retail_price, rental_price, image_url, description,
                    available_quantity, total_quantity, is_featured, 
                    display_order, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
                )
                ON CONFLICT (original_toy_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    brand = EXCLUDED.brand,
                    category = EXCLUDED.category,
                    age_range = EXCLUDED.age_range,
                    retail_price = EXCLUDED.retail_price,
                    rental_price = EXCLUDED.rental_price,
                    image_url = EXCLUDED.image_url,
                    description = EXCLUDED.description,
                    available_quantity = EXCLUDED.available_quantity,
                    total_quantity = EXCLUDED.total_quantity,
                    is_featured = EXCLUDED.is_featured,
                    display_order = EXCLUDED.display_order,
                    updated_at = EXCLUDED.updated_at
            ', v_age_table)
            USING 
                toy_record.id,
                toy_record.name,
                toy_record.brand,
                toy_record.category,
                toy_record.age_range,
                toy_record.retail_price,
                toy_record.rental_price,
                toy_record.image_url,
                toy_record.description,
                toy_record.available_quantity,
                toy_record.total_quantity,
                toy_record.is_featured,
                toy_record.display_order,
                toy_record.created_at,
                toy_record.updated_at;
            
            -- Check if the operation actually affected a row
            GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
            IF v_affected_rows > 0 THEN
                v_tables_updated := v_tables_updated + 1;
            END IF;
        END LOOP;
        
        -- Return the result for this toy
        toy_id := toy_record.id;
        toy_name := toy_record.name;
        action := 'SYNCED';
        age_tables_updated := v_tables_updated;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Add unique constraint on original_toy_id in age tables (if not exists)
DO $$
BEGIN
    -- Add unique constraint to prevent duplicates
    ALTER TABLE toys_1_2_years ADD CONSTRAINT toys_1_2_years_original_toy_id_unique UNIQUE (original_toy_id);
EXCEPTION 
    WHEN duplicate_table THEN NULL;  -- Ignore if constraint already exists
END $$;

DO $$
BEGIN
    ALTER TABLE toys_2_3_years ADD CONSTRAINT toys_2_3_years_original_toy_id_unique UNIQUE (original_toy_id);
EXCEPTION 
    WHEN duplicate_table THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE toys_3_4_years ADD CONSTRAINT toys_3_4_years_original_toy_id_unique UNIQUE (original_toy_id);
EXCEPTION 
    WHEN duplicate_table THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE toys_4_6_years ADD CONSTRAINT toys_4_6_years_original_toy_id_unique UNIQUE (original_toy_id);
EXCEPTION 
    WHEN duplicate_table THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE toys_6_8_years ADD CONSTRAINT toys_6_8_years_original_toy_id_unique UNIQUE (original_toy_id);
EXCEPTION 
    WHEN duplicate_table THEN NULL;
END $$; 