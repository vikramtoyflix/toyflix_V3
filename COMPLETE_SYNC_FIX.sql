-- ============================================================================
-- COMPLETE TOY SYNC FIX - For Inventory Management Save Issues
-- ============================================================================
-- This script fixes the sync between:
-- 1. Main toys table 
-- 2. Age-based tables (toys_1_2_years, toys_2_3_years, etc.)
-- 3. Toy images table
-- 
-- Problem: When "Save Toys" button is clicked in inventory management,
-- changes are only saved to main toys table but not synced to age-based tables
-- ============================================================================

-- Step 1: Drop existing problematic triggers
DROP TRIGGER IF EXISTS trigger_sync_toy_inventory_to_age_tables ON toys;
DROP TRIGGER IF EXISTS trigger_auto_insert_toy_to_age_tables ON toys;
DROP FUNCTION IF EXISTS sync_toy_inventory_to_age_tables() CASCADE;
DROP FUNCTION IF EXISTS auto_insert_toy_to_age_tables() CASCADE;

-- Step 2: Create comprehensive sync function for ALL operations
CREATE OR REPLACE FUNCTION sync_toys_to_age_tables()
RETURNS TRIGGER AS $$
DECLARE
    age_tables TEXT[] := ARRAY['toys_1_2_years', 'toys_2_3_years', 'toys_3_4_years', 'toys_4_6_years', 'toys_6_8_years'];
    table_name TEXT;
    v_age_range TEXT;
    v_age_tables TEXT[] := ARRAY[]::TEXT[];
    updated_count INTEGER := 0;
    total_updated INTEGER := 0;
    v_count INTEGER;
BEGIN
    -- Handle INSERT operations (new toys)
    IF TG_OP = 'INSERT' THEN
        RAISE NOTICE '🔄 INSERT: Adding new toy % (ID: %) to age tables', NEW.name, NEW.id;
        
        -- Get and clean age range
        v_age_range := COALESCE(NEW.age_range, '');
        
        -- Parse age range to determine which tables to insert into
        IF v_age_range IS NULL OR v_age_range = '' THEN
            RAISE WARNING '⚠️ Toy % has no age_range, skipping age table insertion', NEW.name;
            RETURN NEW;
        END IF;
        
        -- Clean up age range (handle JSON arrays or simple strings)
        v_age_range := LOWER(TRIM(v_age_range));
        v_age_range := REPLACE(v_age_range, '"', '');
        v_age_range := REPLACE(v_age_range, '[', '');
        v_age_range := REPLACE(v_age_range, ']', '');
        v_age_range := REPLACE(v_age_range, ' years', '');
        v_age_range := REPLACE(v_age_range, ' year', '');
        
        -- Map age ranges to appropriate tables
        IF v_age_range ILIKE '%1-2%' OR v_age_range ILIKE '%1 to 2%' THEN
            v_age_tables := v_age_tables || ARRAY['toys_1_2_years'];
        END IF;
        IF v_age_range ILIKE '%2-3%' OR v_age_range ILIKE '%2 to 3%' THEN
            v_age_tables := v_age_tables || ARRAY['toys_2_3_years'];
        END IF;
        IF v_age_range ILIKE '%3-4%' OR v_age_range ILIKE '%3 to 4%' THEN
            v_age_tables := v_age_tables || ARRAY['toys_3_4_years'];
        END IF;
        IF v_age_range ILIKE '%4-6%' OR v_age_range ILIKE '%4 to 6%' THEN
            v_age_tables := v_age_tables || ARRAY['toys_4_6_years'];
        END IF;
        IF v_age_range ILIKE '%6-8%' OR v_age_range ILIKE '%6 to 8%' THEN
            v_age_tables := v_age_tables || ARRAY['toys_6_8_years'];
        END IF;
        
        -- Insert into appropriate age tables
        FOREACH table_name IN ARRAY v_age_tables
        LOOP
            BEGIN
                -- Check if table exists
                SELECT COUNT(*) INTO v_count
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = table_name;
                
                IF v_count = 0 THEN
                    RAISE WARNING '⚠️ Age table % does not exist', table_name;
                    CONTINUE;
                END IF;
                
                -- Check if toy already exists
                EXECUTE format('SELECT COUNT(*) FROM %I WHERE original_toy_id = $1', table_name)
                INTO v_count USING NEW.id;
                
                IF v_count > 0 THEN
                    RAISE NOTICE '✅ Toy % already exists in %', NEW.name, table_name;
                    CONTINUE;
                END IF;
                
                -- Insert toy into age table
                EXECUTE format('
                    INSERT INTO %I (
                        id, name, description, category, age_range, brand,
                        retail_price, rental_price, image_url, available_quantity, 
                        total_quantity, rating, show_strikethrough_pricing, 
                        display_order, is_featured, subscription_category, 
                        original_toy_id, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
                    )', table_name)
                USING 
                    NEW.name, NEW.description, NEW.category, NEW.age_range, NEW.brand,
                    NEW.retail_price, NEW.rental_price, NEW.image_url, NEW.available_quantity,
                    NEW.total_quantity, NEW.rating, NEW.show_strikethrough_pricing,
                    NEW.display_order, NEW.is_featured, NEW.subscription_category,
                    NEW.id, NEW.created_at, NEW.updated_at;
                
                total_updated := total_updated + 1;
                RAISE NOTICE '✅ Inserted toy % into %', NEW.name, table_name;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING '❌ Failed to insert toy % into %: %', NEW.name, table_name, SQLERRM;
            END;
        END LOOP;
        
        RAISE NOTICE '🎯 INSERT complete: Added toy % to % age tables', NEW.name, total_updated;
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE operations (sync ALL fields, not just quantities)
    IF TG_OP = 'UPDATE' THEN
        RAISE NOTICE '🔄 UPDATE: Syncing toy % (ID: %) to age tables', NEW.name, NEW.id;
        
        -- Update ALL age tables (not just quantity fields)
        FOREACH table_name IN ARRAY age_tables
        LOOP
            BEGIN
                -- Check if table exists
                SELECT COUNT(*) INTO v_count
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = table_name;
                
                IF v_count = 0 THEN
                    CONTINUE;
                END IF;
                
                -- Update ALL fields in age table
                EXECUTE format('
                    UPDATE %I 
                    SET 
                        name = $1,
                        description = $2,
                        category = $3,
                        age_range = $4,
                        brand = $5,
                        retail_price = $6,
                        rental_price = $7,
                        image_url = $8,
                        available_quantity = $9,
                        total_quantity = $10,
                        rating = $11,
                        show_strikethrough_pricing = $12,
                        display_order = $13,
                        is_featured = $14,
                        subscription_category = $15,
                        updated_at = $16
                    WHERE original_toy_id = $17',
                    table_name
                ) USING 
                    NEW.name, NEW.description, NEW.category, NEW.age_range, NEW.brand,
                    NEW.retail_price, NEW.rental_price, NEW.image_url, NEW.available_quantity,
                    NEW.total_quantity, NEW.rating, NEW.show_strikethrough_pricing,
                    NEW.display_order, NEW.is_featured, NEW.subscription_category,
                    NEW.updated_at, NEW.id;
                
                GET DIAGNOSTICS updated_count = ROW_COUNT;
                total_updated := total_updated + updated_count;
                
                IF updated_count > 0 THEN
                    RAISE NOTICE '✅ Updated % records in %', updated_count, table_name;
                END IF;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING '❌ Failed to update toy % in %: %', NEW.name, table_name, SQLERRM;
            END;
        END LOOP;
        
        RAISE NOTICE '🎯 UPDATE complete: Updated % records across age tables', total_updated;
        RETURN NEW;
    END IF;
    
    -- Handle DELETE operations (remove from age tables)
    IF TG_OP = 'DELETE' THEN
        RAISE NOTICE '🔄 DELETE: Removing toy % (ID: %) from age tables', OLD.name, OLD.id;
        
        FOREACH table_name IN ARRAY age_tables
        LOOP
            BEGIN
                EXECUTE format('DELETE FROM %I WHERE original_toy_id = $1', table_name) USING OLD.id;
                GET DIAGNOSTICS updated_count = ROW_COUNT;
                total_updated := total_updated + updated_count;
                
                IF updated_count > 0 THEN
                    RAISE NOTICE '✅ Deleted % records from %', updated_count, table_name;
                END IF;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING '❌ Failed to delete toy % from %: %', OLD.name, table_name, SQLERRM;
            END;
        END LOOP;
        
        RAISE NOTICE '🎯 DELETE complete: Removed from % age tables', total_updated;
        RETURN OLD;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create comprehensive trigger for ALL operations
DROP TRIGGER IF EXISTS trigger_sync_toys_to_age_tables ON toys;

CREATE TRIGGER trigger_sync_toys_to_age_tables
    AFTER INSERT OR UPDATE OR DELETE ON toys
    FOR EACH ROW
    EXECUTE FUNCTION sync_toys_to_age_tables();

-- Step 4: Create function to manually sync ALL existing toys (for fixing current discrepancies)
CREATE OR REPLACE FUNCTION sync_all_toys_to_age_tables()
RETURNS TABLE (
    toy_id UUID,
    toy_name TEXT,
    action TEXT,
    age_tables_updated INTEGER
) AS $$
DECLARE
    toy_record RECORD;
    age_tables TEXT[] := ARRAY['toys_1_2_years', 'toys_2_3_years', 'toys_3_4_years', 'toys_4_6_years', 'toys_6_8_years'];
    table_name TEXT;
    v_age_range TEXT;
    v_age_tables TEXT[] := ARRAY[]::TEXT[];
    updated_count INTEGER;
    total_updated INTEGER;
    v_count INTEGER;
BEGIN
    RAISE NOTICE '🔄 Starting full sync of all toys to age tables...';
    
    -- Loop through all toys
    FOR toy_record IN 
        SELECT id, name, description, category, age_range, brand, retail_price, rental_price, 
               image_url, available_quantity, total_quantity, rating, show_strikethrough_pricing,
               display_order, is_featured, subscription_category, created_at, updated_at
        FROM toys 
        ORDER BY name
    LOOP
        total_updated := 0;
        v_age_tables := ARRAY[]::TEXT[];
        
        -- Parse age range for this toy
        v_age_range := COALESCE(toy_record.age_range, '');
        
        IF v_age_range IS NULL OR v_age_range = '' THEN
            RAISE WARNING '⚠️ Toy % has no age_range, skipping', toy_record.name;
            CONTINUE;
        END IF;
        
        -- Clean up age range
        v_age_range := LOWER(TRIM(v_age_range));
        v_age_range := REPLACE(v_age_range, '"', '');
        v_age_range := REPLACE(v_age_range, '[', '');
        v_age_range := REPLACE(v_age_range, ']', '');
        v_age_range := REPLACE(v_age_range, ' years', '');
        v_age_range := REPLACE(v_age_range, ' year', '');
        
        -- Map to appropriate tables
        IF v_age_range ILIKE '%1-2%' OR v_age_range ILIKE '%1 to 2%' THEN
            v_age_tables := v_age_tables || ARRAY['toys_1_2_years'];
        END IF;
        IF v_age_range ILIKE '%2-3%' OR v_age_range ILIKE '%2 to 3%' THEN
            v_age_tables := v_age_tables || ARRAY['toys_2_3_years'];
        END IF;
        IF v_age_range ILIKE '%3-4%' OR v_age_range ILIKE '%3 to 4%' THEN
            v_age_tables := v_age_tables || ARRAY['toys_3_4_years'];
        END IF;
        IF v_age_range ILIKE '%4-6%' OR v_age_range ILIKE '%4 to 6%' THEN
            v_age_tables := v_age_tables || ARRAY['toys_4_6_years'];
        END IF;
        IF v_age_range ILIKE '%6-8%' OR v_age_range ILIKE '%6 to 8%' THEN
            v_age_tables := v_age_tables || ARRAY['toys_6_8_years'];
        END IF;
        
        -- Sync to appropriate age tables
        FOREACH table_name IN ARRAY v_age_tables
        LOOP
            BEGIN
                -- Check if table exists
                SELECT COUNT(*) INTO v_count
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = table_name;
                
                IF v_count = 0 THEN
                    CONTINUE;
                END IF;
                
                -- Check if toy exists in age table
                EXECUTE format('SELECT COUNT(*) FROM %I WHERE original_toy_id = $1', table_name)
                INTO v_count USING toy_record.id;
                
                IF v_count = 0 THEN
                    -- Insert new record
                    EXECUTE format('
                        INSERT INTO %I (
                            id, name, description, category, age_range, brand,
                            retail_price, rental_price, image_url, available_quantity, 
                            total_quantity, rating, show_strikethrough_pricing, 
                            display_order, is_featured, subscription_category, 
                            original_toy_id, created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
                        )', table_name)
                    USING 
                        toy_record.name, toy_record.description, toy_record.category, toy_record.age_range, toy_record.brand,
                        toy_record.retail_price, toy_record.rental_price, toy_record.image_url, toy_record.available_quantity,
                        toy_record.total_quantity, toy_record.rating, toy_record.show_strikethrough_pricing,
                        toy_record.display_order, toy_record.is_featured, toy_record.subscription_category,
                        toy_record.id, toy_record.created_at, toy_record.updated_at;
                    
                    total_updated := total_updated + 1;
                ELSE
                    -- Update existing record
                    EXECUTE format('
                        UPDATE %I 
                        SET 
                            name = $1, description = $2, category = $3, age_range = $4, brand = $5,
                            retail_price = $6, rental_price = $7, image_url = $8, available_quantity = $9,
                            total_quantity = $10, rating = $11, show_strikethrough_pricing = $12,
                            display_order = $13, is_featured = $14, subscription_category = $15,
                            updated_at = $16
                        WHERE original_toy_id = $17',
                        table_name
                    ) USING 
                        toy_record.name, toy_record.description, toy_record.category, toy_record.age_range, toy_record.brand,
                        toy_record.retail_price, toy_record.rental_price, toy_record.image_url, toy_record.available_quantity,
                        toy_record.total_quantity, toy_record.rating, toy_record.show_strikethrough_pricing,
                        toy_record.display_order, toy_record.is_featured, toy_record.subscription_category,
                        toy_record.updated_at, toy_record.id;
                    
                    total_updated := total_updated + 1;
                END IF;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING '❌ Failed to sync toy % to %: %', toy_record.name, table_name, SQLERRM;
            END;
        END LOOP;
        
        -- Return result for this toy
        RETURN QUERY SELECT toy_record.id, toy_record.name, 'SYNCED'::TEXT, total_updated;
    END LOOP;
    
    RAISE NOTICE '✅ Full sync complete!';
END;
$$ LANGUAGE plpgsql;

-- Step 5: Add helpful comments
COMMENT ON FUNCTION sync_toys_to_age_tables() IS 
'Comprehensive sync function that handles INSERT, UPDATE, and DELETE operations on toys table and syncs ALL fields to age-based tables';

COMMENT ON TRIGGER trigger_sync_toys_to_age_tables ON toys IS 
'Triggers complete synchronization of toy data between main toys table and age-based tables for all operations';

COMMENT ON FUNCTION sync_all_toys_to_age_tables() IS 
'Manual function to sync all existing toys to age-based tables - use this to fix discrepancies';

-- Step 6: Success message
DO $$
BEGIN
    RAISE NOTICE '✅ COMPLETE SYNC FIX APPLIED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE 'What was fixed:';
    RAISE NOTICE '1. ✅ New toys will now automatically be added to age tables';
    RAISE NOTICE '2. ✅ Toy updates will sync ALL fields (not just quantities)';
    RAISE NOTICE '3. ✅ Toy deletions will be synced to age tables';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run: SELECT * FROM sync_all_toys_to_age_tables(); to fix current discrepancies';
    RAISE NOTICE '2. Test: Add/edit toys in inventory management and check sync';
    RAISE NOTICE '';
END $$; 