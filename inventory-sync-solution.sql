-- ==============================================================================
-- INVENTORY SYNCHRONIZATION SOLUTION - UPDATED
-- ==============================================================================
-- This script creates complete inventory sync between main toys table and 
-- age-specific tables used in subscription flow
-- 
-- PROBLEM: EditToy updates main toys table, but subscription flow uses age tables
-- SOLUTION: Auto-sync inventory changes to all age-specific tables
-- 
-- UX APPROACH: Show out-of-stock toys with "Out of Stock" indicators
-- (DO NOT hide them - customers should know the toy exists)
-- ==============================================================================

-- Step 1: Create function to sync inventory to age-specific tables
CREATE OR REPLACE FUNCTION sync_toy_inventory_to_age_tables()
RETURNS TRIGGER AS $$
DECLARE
    age_tables TEXT[] := ARRAY['toys_1_2_years', 'toys_2_3_years', 'toys_3_4_years', 'toys_4_6_years', 'toys_6_8_years'];
    table_name TEXT;
    updated_count INTEGER := 0;
    total_updated INTEGER := 0;
BEGIN
    -- Only sync if inventory-related fields changed
    IF (TG_OP = 'UPDATE' AND 
        (OLD.available_quantity != NEW.available_quantity OR 
         OLD.total_quantity != NEW.total_quantity)) THEN
        
        RAISE NOTICE 'Syncing inventory for toy: % (ID: %)', NEW.name, NEW.id;
        RAISE NOTICE 'Inventory change: available % -> %, total % -> %', 
            OLD.available_quantity, NEW.available_quantity,
            OLD.total_quantity, NEW.total_quantity;
        
        -- Loop through each age-specific table and update
        FOREACH table_name IN ARRAY age_tables
        LOOP
            -- Update inventory in age-specific table using original_toy_id
            EXECUTE format('
                UPDATE %I 
                SET 
                    available_quantity = $1,
                    total_quantity = $2,
                    updated_at = $3
                WHERE original_toy_id = $4',
                table_name
            ) USING NEW.available_quantity, NEW.total_quantity, NEW.updated_at, NEW.id;
            
            GET DIAGNOSTICS updated_count = ROW_COUNT;
            total_updated := total_updated + updated_count;
            
            IF updated_count > 0 THEN
                RAISE NOTICE '✅ Updated % toys in %', updated_count, table_name;
            END IF;
        END LOOP;
        
        RAISE NOTICE '🎯 Total age table records updated: %', total_updated;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger on main toys table
DROP TRIGGER IF EXISTS trigger_sync_toy_inventory_to_age_tables ON toys;

CREATE TRIGGER trigger_sync_toy_inventory_to_age_tables
    AFTER UPDATE OF available_quantity, total_quantity ON toys
    FOR EACH ROW
    EXECUTE FUNCTION sync_toy_inventory_to_age_tables();

-- Step 3: Create function to sync ALL toys (for initial setup)
CREATE OR REPLACE FUNCTION sync_all_toy_inventory_to_age_tables()
RETURNS TABLE (
    toy_id UUID,
    toy_name TEXT,
    age_tables_updated INTEGER
) AS $$
DECLARE
    toy_record RECORD;
    age_tables TEXT[] := ARRAY['toys_1_2_years', 'toys_2_3_years', 'toys_3_4_years', 'toys_4_6_years', 'toys_6_8_years'];
    table_name TEXT;
    updated_count INTEGER;
    total_updated INTEGER;
BEGIN
    -- Loop through all toys
    FOR toy_record IN 
        SELECT id, name, available_quantity, total_quantity, updated_at
        FROM toys 
        ORDER BY name
    LOOP
        total_updated := 0;
        
        -- Update each age table
        FOREACH table_name IN ARRAY age_tables
        LOOP
            EXECUTE format('
                UPDATE %I 
                SET 
                    available_quantity = $1,
                    total_quantity = $2,
                    updated_at = $3
                WHERE original_toy_id = $4',
                table_name
            ) USING toy_record.available_quantity, toy_record.total_quantity, toy_record.updated_at, toy_record.id;
            
            GET DIAGNOSTICS updated_count = ROW_COUNT;
            total_updated := total_updated + updated_count;
        END LOOP;
        
        -- Return result for this toy
        RETURN QUERY SELECT toy_record.id, toy_record.name, total_updated;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create function to check sync status
CREATE OR REPLACE FUNCTION check_inventory_sync_status()
RETURNS TABLE (
    table_name TEXT,
    total_toys INTEGER,
    toys_with_original_id INTEGER,
    sync_coverage_percentage NUMERIC
) AS $$
DECLARE
    age_tables TEXT[] := ARRAY['toys_1_2_years', 'toys_2_3_years', 'toys_3_4_years', 'toys_4_6_years', 'toys_6_8_years'];
    current_table TEXT;
    total_count INTEGER;
    linked_count INTEGER;
BEGIN
    -- Check each age table
    FOREACH current_table IN ARRAY age_tables
    LOOP
        EXECUTE format('
            SELECT 
                COUNT(*) as total,
                COUNT(original_toy_id) as linked
            FROM %I',
            current_table
        ) INTO total_count, linked_count;
        
        RETURN QUERY SELECT 
            current_table,
            total_count,
            linked_count,
            CASE 
                WHEN total_count = 0 THEN 0 
                ELSE ROUND((linked_count::NUMERIC / total_count) * 100, 2) 
            END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Initial sync (run this once to sync all existing inventory)
-- Uncomment the line below to run initial sync:
-- SELECT * FROM sync_all_toy_inventory_to_age_tables();

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- Check sync status
SELECT * FROM check_inventory_sync_status();

-- Test query: Find toys that are out of stock in main table
SELECT 
    t.name,
    t.available_quantity as main_table_qty,
    t.total_quantity as main_table_total
FROM toys t
WHERE t.available_quantity = 0
ORDER BY t.name
LIMIT 10;

-- Test query: Check if out-of-stock toys are also showing 0 in age tables
-- (Replace 'toys_3_4_years' with any age table you want to test)
SELECT 
    age_table.name,
    age_table.available_quantity as age_table_qty,
    main_table.available_quantity as main_table_qty,
    CASE 
        WHEN age_table.available_quantity = main_table.available_quantity THEN '✅ SYNCED'
        ELSE '❌ OUT OF SYNC'
    END as sync_status
FROM toys_3_4_years age_table
JOIN toys main_table ON age_table.original_toy_id = main_table.id
WHERE main_table.available_quantity != age_table.available_quantity
ORDER BY age_table.name
LIMIT 10;

-- ==============================================================================
-- USAGE INSTRUCTIONS
-- ==============================================================================

/*
1. RUN THIS SCRIPT in Supabase SQL Editor

2. INITIAL SYNC: Run this to sync all existing toys:
   SELECT * FROM sync_all_toy_inventory_to_age_tables();

3. VERIFY SYNC: Check that linking is working:
   SELECT * FROM check_inventory_sync_status();

4. TEST: Edit a toy in admin and verify it syncs to age tables

5. FROM NOW ON: 
   - When you edit toys in EditToy page
   - Inventory will automatically sync to all age tables
   - Subscription flow will show correct stock levels
   - Out-of-stock items will not appear in toy selection

RESULT: Users will see real-time inventory in subscription flow! ✅
*/ 