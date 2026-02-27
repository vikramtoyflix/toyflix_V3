-- Step 2: Create Inventory Management Functions
-- Run this AFTER Step 1 completes successfully

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