-- Step 1: Populate original_toy_id in Age-Specific Tables
-- Run this FIRST in Supabase SQL Editor

DO $$
DECLARE
    table_name TEXT;
    age_tables TEXT[] := ARRAY['toys_1_2_years', 'toys_2_3_years', 'toys_3_4_years', 'toys_4_6_years', 'toys_6_8_years'];
    update_count INTEGER;
    total_updated INTEGER := 0;
    total_toys INTEGER;
    linked_toys INTEGER;
    unlinked_toys INTEGER;
BEGIN
    RAISE NOTICE 'Starting original_toy_id population for inventory management...';
    
    -- Loop through each age-specific table
    FOREACH table_name IN ARRAY age_tables
    LOOP
        RAISE NOTICE 'Processing table: %', table_name;
        
        -- Update original_toy_id by matching toy names
        EXECUTE format('
            UPDATE %I SET original_toy_id = toys.id 
            FROM toys 
            WHERE %I.name = toys.name 
            AND %I.original_toy_id IS NULL',
            table_name, table_name, table_name
        );
        
        GET DIAGNOSTICS update_count = ROW_COUNT;
        total_updated := total_updated + update_count;
        
        RAISE NOTICE '  ✅ Updated % toys in %', update_count, table_name;
    END LOOP;
    
    RAISE NOTICE 'Completed! Total toys linked: %', total_updated;
    
    -- Verify the linking
    RAISE NOTICE 'Verification results:';
    FOREACH table_name IN ARRAY age_tables
    LOOP
        EXECUTE format('
            SELECT 
                COUNT(*) as total_toys,
                COUNT(original_toy_id) as linked_toys,
                COUNT(*) - COUNT(original_toy_id) as unlinked_toys
            FROM %I',
            table_name
        ) INTO total_toys, linked_toys, unlinked_toys;
        
        RAISE NOTICE '  % - Total: %, Linked: %, Unlinked: %', 
            table_name, total_toys, linked_toys, unlinked_toys;
    END LOOP;
END $$; 