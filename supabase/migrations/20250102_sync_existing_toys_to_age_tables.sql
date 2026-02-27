-- Migration: Sync existing toys to age-based tables
-- Description: One-time sync of existing toys from main table to age-based tables
-- Date: 2025-01-02

-- Create function to sync existing toys to age tables
CREATE OR REPLACE FUNCTION sync_existing_toys_to_age_tables()
RETURNS TABLE(
    processed_count INTEGER,
    success_count INTEGER,
    error_count INTEGER,
    skipped_count INTEGER
) AS $$
DECLARE
    toy_record RECORD;
    v_processed INTEGER := 0;
    v_success INTEGER := 0;
    v_error INTEGER := 0;
    v_skipped INTEGER := 0;
    v_age_range TEXT;
    v_age_tables TEXT[] := ARRAY[]::TEXT[];
    v_table_name TEXT;
    v_sql TEXT;
    v_count INTEGER;
BEGIN
    RAISE NOTICE 'Starting sync of existing toys to age-based tables...';
    
    -- Loop through all toys that might be missing from age tables
    FOR toy_record IN 
        SELECT * FROM toys 
        WHERE age_range IS NOT NULL 
        AND age_range != ''
        ORDER BY created_at DESC
    LOOP
        BEGIN
            v_processed := v_processed + 1;
            v_age_tables := ARRAY[]::TEXT[];
            
            -- Get and clean the age range
            v_age_range := LOWER(TRIM(toy_record.age_range));
            v_age_range := REPLACE(v_age_range, ' years', '');
            v_age_range := REPLACE(v_age_range, ' year', '');
            v_age_range := REPLACE(v_age_range, 'years', '');
            v_age_range := REPLACE(v_age_range, 'year', '');
            
            -- Determine which age tables this toy belongs to
            IF v_age_range ILIKE '%1-2%' OR v_age_range ILIKE '%1 to 2%' THEN
                v_age_tables := v_age_tables || 'toys_1_2_years';
            END IF;
            
            IF v_age_range ILIKE '%2-3%' OR v_age_range ILIKE '%2 to 3%' THEN
                v_age_tables := v_age_tables || 'toys_2_3_years';
            END IF;
            
            IF v_age_range ILIKE '%3-4%' OR v_age_range ILIKE '%3 to 4%' THEN
                v_age_tables := v_age_tables || 'toys_3_4_years';
            END IF;
            
            IF v_age_range ILIKE '%4-6%' OR v_age_range ILIKE '%4 to 6%' OR v_age_range ILIKE '%4-5%' OR v_age_range ILIKE '%5-6%' THEN
                v_age_tables := v_age_tables || 'toys_4_6_years';
            END IF;
            
            IF v_age_range ILIKE '%6-8%' OR v_age_range ILIKE '%6 to 8%' OR v_age_range ILIKE '%6-7%' OR v_age_range ILIKE '%7-8%' THEN
                v_age_tables := v_age_tables || 'toys_6_8_years';
            END IF;
            
            -- If no specific age tables matched, try to infer from min_age and max_age
            IF array_length(v_age_tables, 1) IS NULL AND (toy_record.min_age IS NOT NULL OR toy_record.max_age IS NOT NULL) THEN
                DECLARE
                    min_age INTEGER := COALESCE(toy_record.min_age, 1);
                    max_age INTEGER := COALESCE(toy_record.max_age, 8);
                BEGIN
                    IF min_age <= 2 AND max_age >= 1 THEN
                        v_age_tables := v_age_tables || 'toys_1_2_years';
                    END IF;
                    IF min_age <= 3 AND max_age >= 2 THEN
                        v_age_tables := v_age_tables || 'toys_2_3_years';
                    END IF;
                    IF min_age <= 4 AND max_age >= 3 THEN
                        v_age_tables := v_age_tables || 'toys_3_4_years';
                    END IF;
                    IF min_age <= 6 AND max_age >= 4 THEN
                        v_age_tables := v_age_tables || 'toys_4_6_years';
                    END IF;
                    IF min_age <= 8 AND max_age >= 6 THEN
                        v_age_tables := v_age_tables || 'toys_6_8_years';
                    END IF;
                END;
            END IF;
            
            -- If no age tables determined, skip this toy
            IF array_length(v_age_tables, 1) IS NULL THEN
                v_skipped := v_skipped + 1;
                RAISE NOTICE 'Skipped toy % (%) - could not determine age table from age_range: %', 
                    toy_record.name, toy_record.id, toy_record.age_range;
                CONTINUE;
            END IF;
            
            -- Insert toy into each determined age table
            FOREACH v_table_name IN ARRAY v_age_tables
            LOOP
                BEGIN
                    -- Check if the age table exists
                    SELECT COUNT(*) INTO v_count
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = v_table_name;
                    
                    IF v_count = 0 THEN
                        RAISE WARNING 'Age table % does not exist, skipping toy %', v_table_name, toy_record.name;
                        CONTINUE;
                    END IF;
                    
                    -- Check if toy already exists in this age table
                    EXECUTE format('SELECT COUNT(*) FROM %I WHERE original_toy_id = $1', v_table_name)
                    INTO v_count USING toy_record.id;
                    
                    IF v_count > 0 THEN
                        -- RAISE NOTICE 'Toy % already exists in table %', toy_record.name, v_table_name;
                        CONTINUE;
                    END IF;
                    
                    -- Build dynamic INSERT statement
                    v_sql := format('
                        INSERT INTO %I (
                            id, name, description, category, age_range, brand, pack,
                            retail_price, rental_price, image_url, available_quantity, 
                            total_quantity, rating, min_age, max_age,
                            show_strikethrough_pricing, display_order, is_featured,
                            subscription_category, sku, reorder_level, reorder_quantity,
                            supplier_id, purchase_cost, last_restocked_date, inventory_status,
                            weight_kg, dimensions_cm, barcode, internal_notes,
                            seasonal_availability, condition_rating, maintenance_required,
                            last_maintenance_date, original_toy_id, created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                            $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
                            $30, $31, $32, $33, $34, $35, $36
                        )', v_table_name);
                    
                    -- Execute the INSERT
                    EXECUTE v_sql USING
                        toy_record.name, toy_record.description, toy_record.category, toy_record.age_range, 
                        toy_record.brand, toy_record.pack, toy_record.retail_price, toy_record.rental_price, 
                        toy_record.image_url, toy_record.available_quantity, toy_record.total_quantity, 
                        toy_record.rating, toy_record.min_age, toy_record.max_age,
                        toy_record.show_strikethrough_pricing, toy_record.display_order, toy_record.is_featured,
                        toy_record.subscription_category, toy_record.sku, toy_record.reorder_level, 
                        toy_record.reorder_quantity, toy_record.supplier_id, toy_record.purchase_cost, 
                        toy_record.last_restocked_date, toy_record.inventory_status, toy_record.weight_kg, 
                        toy_record.dimensions_cm, toy_record.barcode, toy_record.internal_notes,
                        toy_record.seasonal_availability, toy_record.condition_rating, 
                        toy_record.maintenance_required, toy_record.last_maintenance_date, 
                        toy_record.id, toy_record.created_at, toy_record.updated_at;
                    
                    RAISE NOTICE 'Successfully synced toy % to age table %', toy_record.name, v_table_name;
                    v_success := v_success + 1;
                    
                EXCEPTION WHEN OTHERS THEN
                    v_error := v_error + 1;
                    RAISE WARNING 'Failed to sync toy % (%) to age table %: %', 
                        toy_record.name, toy_record.id, v_table_name, SQLERRM;
                END;
            END LOOP;
            
        EXCEPTION WHEN OTHERS THEN
            v_error := v_error + 1;
            RAISE WARNING 'Failed to process toy % (%): %', toy_record.name, toy_record.id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Sync completed: % processed, % success, % errors, % skipped', 
        v_processed, v_success, v_error, v_skipped;
    
    RETURN QUERY SELECT v_processed, v_success, v_error, v_skipped;
END;
$$ LANGUAGE plpgsql;

-- Execute the sync function
DO $$
DECLARE
    sync_result RECORD;
BEGIN
    RAISE NOTICE 'Starting one-time sync of existing toys to age-based tables...';
    
    SELECT * INTO sync_result FROM sync_existing_toys_to_age_tables();
    
    RAISE NOTICE '=== SYNC RESULTS ===';
    RAISE NOTICE 'Processed: % toys', sync_result.processed_count;
    RAISE NOTICE 'Successfully synced: % insertions', sync_result.success_count;
    RAISE NOTICE 'Errors: %', sync_result.error_count;
    RAISE NOTICE 'Skipped: %', sync_result.skipped_count;
    RAISE NOTICE '==================';
    
    IF sync_result.error_count > 0 THEN
        RAISE WARNING 'Some toys failed to sync. Check the logs above for details.';
    ELSE
        RAISE NOTICE 'All toys synced successfully!';
    END IF;
END $$;

-- Clean up the temporary function (optional - comment out if you want to keep it for future use)
-- DROP FUNCTION IF EXISTS sync_existing_toys_to_age_tables();

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: Existing toys have been synced to age-based tables';
    RAISE NOTICE 'Future toys will be automatically synced via the trigger';
END $$; 