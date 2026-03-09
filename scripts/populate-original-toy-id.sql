-- Step 1: Populate original_toy_id in Age-Specific Tables
-- This script establishes the linking mechanism between age-specific tables and main toys table
-- Run this in Supabase SQL Editor to set up inventory management foundation

-- ========================================
-- POPULATE original_toy_id FOR ALL AGE TABLES
-- ========================================

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

-- ========================================
-- CREATE INVENTORY TRACKING FUNCTIONS
-- ========================================

-- Function to get real-time inventory from main table using original_toy_id
CREATE OR REPLACE FUNCTION get_toy_inventory(p_original_toy_id UUID)
RETURNS TABLE (
    toy_id UUID,
    toy_name TEXT,
    available_quantity INTEGER,
    total_quantity INTEGER,
    current_rentals INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.available_quantity,
        t.total_quantity,
        (t.total_quantity - t.available_quantity) as current_rentals
    FROM toys t
    WHERE t.id = p_original_toy_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update inventory atomically
CREATE OR REPLACE FUNCTION update_toy_inventory(
    p_original_toy_id UUID,
    p_quantity_change INTEGER,
    p_operation TEXT DEFAULT 'rent' -- 'rent' or 'return'
)
RETURNS BOOLEAN AS $$
DECLARE
    current_available INTEGER;
    new_available INTEGER;
BEGIN
    -- Get current inventory
    SELECT available_quantity INTO current_available
    FROM toys 
    WHERE id = p_original_toy_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Toy with ID % not found', p_original_toy_id;
    END IF;
    
    -- Calculate new availability
    IF p_operation = 'rent' THEN
        new_available := current_available - p_quantity_change;
        IF new_available < 0 THEN
            RAISE EXCEPTION 'Insufficient inventory. Available: %, Requested: %', current_available, p_quantity_change;
        END IF;
    ELSIF p_operation = 'return' THEN
        new_available := current_available + p_quantity_change;
    ELSE
        RAISE EXCEPTION 'Invalid operation: %. Use "rent" or "return"', p_operation;
    END IF;
    
    -- Update inventory atomically
    UPDATE toys 
    SET available_quantity = new_available,
        updated_at = now()
    WHERE id = p_original_toy_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get inventory status across all age tables
CREATE OR REPLACE FUNCTION get_age_table_inventory_summary()
RETURNS TABLE (
    age_table TEXT,
    total_toys INTEGER,
    linked_toys INTEGER,
    unlinked_toys INTEGER,
    total_available INTEGER,
    total_rented INTEGER
) AS $$
BEGIN
    -- toys_1_2_years
    RETURN QUERY
    SELECT 
        'toys_1_2_years'::TEXT,
        COUNT(*)::INTEGER as total_toys,
        COUNT(original_toy_id)::INTEGER as linked_toys,
        (COUNT(*) - COUNT(original_toy_id))::INTEGER as unlinked_toys,
        COALESCE(SUM(t.available_quantity), 0)::INTEGER as total_available,
        COALESCE(SUM(t.total_quantity - t.available_quantity), 0)::INTEGER as total_rented
    FROM toys_1_2_years at
    LEFT JOIN toys t ON at.original_toy_id = t.id;
    
    -- toys_2_3_years
    RETURN QUERY
    SELECT 
        'toys_2_3_years'::TEXT,
        COUNT(*)::INTEGER,
        COUNT(original_toy_id)::INTEGER,
        (COUNT(*) - COUNT(original_toy_id))::INTEGER,
        COALESCE(SUM(t.available_quantity), 0)::INTEGER,
        COALESCE(SUM(t.total_quantity - t.available_quantity), 0)::INTEGER
    FROM toys_2_3_years at
    LEFT JOIN toys t ON at.original_toy_id = t.id;
    
    -- toys_3_4_years
    RETURN QUERY
    SELECT 
        'toys_3_4_years'::TEXT,
        COUNT(*)::INTEGER,
        COUNT(original_toy_id)::INTEGER,
        (COUNT(*) - COUNT(original_toy_id))::INTEGER,
        COALESCE(SUM(t.available_quantity), 0)::INTEGER,
        COALESCE(SUM(t.total_quantity - t.available_quantity), 0)::INTEGER
    FROM toys_3_4_years at
    LEFT JOIN toys t ON at.original_toy_id = t.id;
    
    -- toys_4_6_years
    RETURN QUERY
    SELECT 
        'toys_4_6_years'::TEXT,
        COUNT(*)::INTEGER,
        COUNT(original_toy_id)::INTEGER,
        (COUNT(*) - COUNT(original_toy_id))::INTEGER,
        COALESCE(SUM(t.available_quantity), 0)::INTEGER,
        COALESCE(SUM(t.total_quantity - t.available_quantity), 0)::INTEGER
    FROM toys_4_6_years at
    LEFT JOIN toys t ON at.original_toy_id = t.id;
    
    -- toys_6_8_years
    RETURN QUERY
    SELECT 
        'toys_6_8_years'::TEXT,
        COUNT(*)::INTEGER,
        COUNT(original_toy_id)::INTEGER,
        (COUNT(*) - COUNT(original_toy_id))::INTEGER,
        COALESCE(SUM(t.available_quantity), 0)::INTEGER,
        COALESCE(SUM(t.total_quantity - t.available_quantity), 0)::INTEGER
    FROM toys_6_8_years at
    LEFT JOIN toys t ON at.original_toy_id = t.id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Add indexes on original_toy_id for all age tables
CREATE INDEX IF NOT EXISTS idx_toys_1_2_years_original_toy_id ON toys_1_2_years(original_toy_id);
CREATE INDEX IF NOT EXISTS idx_toys_2_3_years_original_toy_id ON toys_2_3_years(original_toy_id);
CREATE INDEX IF NOT EXISTS idx_toys_3_4_years_original_toy_id ON toys_3_4_years(original_toy_id);
CREATE INDEX IF NOT EXISTS idx_toys_4_6_years_original_toy_id ON toys_4_6_years(original_toy_id);
CREATE INDEX IF NOT EXISTS idx_toys_6_8_years_original_toy_id ON toys_6_8_years(original_toy_id);

-- Add index on main toys table for inventory queries
CREATE INDEX IF NOT EXISTS idx_toys_inventory ON toys(available_quantity, total_quantity);

-- ========================================
-- DOCUMENTATION
-- ========================================

COMMENT ON FUNCTION get_toy_inventory IS 'Get real-time inventory status for a toy using original_toy_id';
COMMENT ON FUNCTION update_toy_inventory IS 'Atomically update toy inventory for rent/return operations';
COMMENT ON FUNCTION get_age_table_inventory_summary IS 'Get inventory summary across all age-specific tables';

-- Final verification
SELECT 'Inventory Management Setup Complete!' as status;
SELECT * FROM get_age_table_inventory_summary(); 