-- Step 3: Create Update Inventory Function
-- Run this AFTER Step 2 completes successfully

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