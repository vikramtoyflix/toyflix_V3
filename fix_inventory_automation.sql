-- ========================================
-- COMPLETE INVENTORY AUTOMATION FIX
-- ========================================
-- This fixes the inventory not decreasing issue by:
-- 1. Updating the automation to handle 'active' status orders
-- 2. Using the correct inventory_movements table schema
-- 3. Handling multiple toys_data formats (toy_id, id, category-only)
-- 4. Providing a script to fix existing orders

-- ========================================
-- 1. CREATE MISSING record_inventory_movement FUNCTION
-- ========================================
-- Since your existing function expects columns that don't exist, we'll create a compatible one

CREATE OR REPLACE FUNCTION record_inventory_movement(
    p_toy_id UUID,
    p_movement_type TEXT,
    p_quantity_change INTEGER,
    p_rental_order_id UUID DEFAULT NULL,
    p_movement_reason TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_previous_available INTEGER;
    v_new_available INTEGER;
    v_movement_id UUID;
BEGIN
    -- Get current available quantity
    SELECT available_quantity INTO v_previous_available
    FROM toys WHERE id = p_toy_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Toy with ID % not found', p_toy_id;
    END IF;
    
    -- Calculate new available quantity
    v_new_available := v_previous_available + p_quantity_change;
    
    -- Validate the movement
    IF v_new_available < 0 THEN
        RAISE EXCEPTION 'Insufficient inventory. Available: %, Requested: %', 
            v_previous_available, ABS(p_quantity_change);
    END IF;
    
    -- Update toy inventory
    UPDATE toys 
    SET available_quantity = v_new_available,
        updated_at = now()
    WHERE id = p_toy_id;
    
    -- Record the movement using actual table schema
    INSERT INTO inventory_movements (
        toy_id, 
        movement_type, 
        quantity_change, 
        reference_type,
        reference_id,
        notes,
        created_by,
        created_at
    ) VALUES (
        p_toy_id, 
        p_movement_type, 
        p_quantity_change,
        'rental_order',
        p_rental_order_id,
        COALESCE(p_movement_reason, '') || CASE 
            WHEN p_notes IS NOT NULL THEN ' - ' || p_notes 
            ELSE '' 
        END,
        'system',
        NOW()
    ) RETURNING id INTO v_movement_id;
    
    RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 2. UPDATE INVENTORY AUTOMATION TO HANDLE 'ACTIVE' STATUS AND MULTIPLE DATA FORMATS
-- ========================================

CREATE OR REPLACE FUNCTION handle_rental_order_inventory_automation()
RETURNS TRIGGER AS $$
DECLARE
    v_movement_type TEXT;
    v_movement_reason TEXT;
    toy_item JSONB;
    v_toy_id UUID;
    v_toy_id_text TEXT;
    v_quantity INTEGER;
    v_toy_name TEXT;
    v_category TEXT;
BEGIN
    -- Only process status changes or new orders
    IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Log the operation for debugging
    RAISE NOTICE 'Processing rental order: % with status: %', 
        COALESCE(NEW.order_number, NEW.id::TEXT), NEW.status;

    -- Determine movement type based on status change or creation
    CASE 
        WHEN TG_OP = 'INSERT' AND NEW.status IN ('pending', 'confirmed', 'active') THEN
            v_movement_type := 'RENTAL_OUT';
            v_movement_reason := 'New rental order created - toys reserved';
        WHEN NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
            v_movement_type := 'RENTAL_OUT';
            v_movement_reason := 'Order confirmed - toys reserved';
        WHEN NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status IN ('pending', 'confirmed', 'delivered')) THEN
            v_movement_type := 'RENTAL_OUT';
            v_movement_reason := 'Order activated - toys reserved for customer';
        WHEN NEW.status = 'shipped' AND OLD.status IN ('confirmed', 'active') THEN
            -- Already reserved, no inventory change but log movement
            v_movement_type := 'RENTAL_OUT';
            v_movement_reason := 'Order shipped - toys dispatched to customer';
        WHEN NEW.status = 'delivered' AND OLD.status IN ('shipped', 'active') THEN
            -- Already reserved, no inventory change but log movement
            v_movement_type := 'RENTAL_OUT';
            v_movement_reason := 'Order delivered - toys with customer';
        WHEN NEW.status = 'returned' AND OLD.status IN ('delivered', 'active', 'shipped') THEN
            v_movement_type := 'RENTAL_RETURN';
            v_movement_reason := 'Order returned - toys back in inventory';
        WHEN NEW.status = 'cancelled' AND OLD.status IN ('pending', 'confirmed', 'active') THEN
            v_movement_type := 'RENTAL_RETURN';
            v_movement_reason := 'Order cancelled - toys released back to inventory';
        ELSE
            -- No inventory impact for other status changes
            RAISE NOTICE 'No inventory impact for status change: % -> %', OLD.status, NEW.status;
            RETURN NEW;
    END CASE;

    -- Process toys_data if it exists
    IF NEW.toys_data IS NOT NULL AND jsonb_array_length(NEW.toys_data) > 0 THEN
        FOR toy_item IN SELECT * FROM jsonb_array_elements(NEW.toys_data)
        LOOP
            -- Initialize variables
            v_toy_id := NULL;
            v_toy_id_text := NULL;
            v_quantity := COALESCE((toy_item->>'quantity')::INTEGER, 1);
            v_toy_name := toy_item->>'name';
            v_category := toy_item->>'category';

            -- Try different ways to extract toy_id
            -- Method 1: Check for toy_id field (modern format)
            IF toy_item ? 'toy_id' AND toy_item->>'toy_id' IS NOT NULL AND toy_item->>'toy_id' != '' THEN
                BEGIN
                    v_toy_id := (toy_item->>'toy_id')::UUID;
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING 'Invalid toy_id format in order %: %', NEW.id, toy_item->>'toy_id';
                END;
            END IF;

            -- Method 2: Check for id field (legacy format)
            IF v_toy_id IS NULL AND toy_item ? 'id' AND toy_item->>'id' IS NOT NULL AND toy_item->>'id' != '' THEN
                v_toy_id_text := toy_item->>'id';
                
                -- Try to find toy by legacy id or by name
                BEGIN
                    -- First try to convert id to UUID
                    v_toy_id := v_toy_id_text::UUID;
                EXCEPTION WHEN OTHERS THEN
                    -- If not UUID, try to find by name or legacy_id
                    SELECT id INTO v_toy_id 
                    FROM toys 
                    WHERE name ILIKE v_toy_name
                       OR legacy_id = v_toy_id_text
                    LIMIT 1;
                END;
            END IF;

            -- Method 3: Try to find by name if still no ID
            IF v_toy_id IS NULL AND v_toy_name IS NOT NULL AND v_toy_name != '' THEN
                SELECT id INTO v_toy_id 
                FROM toys 
                WHERE name ILIKE v_toy_name
                LIMIT 1;
            END IF;

            -- Skip if we still can't find a valid toy_id
            IF v_toy_id IS NULL THEN
                RAISE WARNING 'Skipping toy item in order % - no valid toy_id found. Data: %', 
                    NEW.id, toy_item;
                CONTINUE;
            END IF;

            -- Record inventory movement using our fixed function
            BEGIN
                PERFORM record_inventory_movement(
                    v_toy_id,
                    v_movement_type,
                    CASE 
                        WHEN v_movement_type = 'RENTAL_OUT' THEN -v_quantity
                        WHEN v_movement_type = 'RENTAL_RETURN' THEN v_quantity
                        ELSE 0
                    END,
                    NEW.id,  -- rental_order_id
                    v_movement_reason,  -- movement_reason
                    'Automated via order status change - Order: ' || COALESCE(NEW.order_number, NEW.id::TEXT)  -- notes
                );
                
                RAISE NOTICE 'Successfully processed toy % (%) for order %', 
                    v_toy_id, COALESCE(v_toy_name, 'Unknown'), NEW.id;
                    
            EXCEPTION WHEN OTHERS THEN
                -- Log error but don't fail the order update
                RAISE WARNING 'Failed to update inventory for toy % in order %: %', 
                    v_toy_id, NEW.id, SQLERRM;
            END;
        END LOOP;

        -- Sync age table inventory if function exists
        BEGIN
            PERFORM sync_age_table_inventory();
        EXCEPTION WHEN undefined_function THEN
            RAISE NOTICE 'sync_age_table_inventory function not found, skipping';
        END;

        RAISE NOTICE 'Successfully processed % toys for order %', 
            jsonb_array_length(NEW.toys_data), NEW.id;
    ELSE
        RAISE WARNING 'Order % has empty or null toys_data - no inventory updates performed', NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. CREATE OR UPDATE THE TRIGGER
-- ========================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_rental_order_inventory_automation ON rental_orders;

-- Create the new trigger for both INSERT and UPDATE
CREATE TRIGGER trigger_rental_order_inventory_automation
    AFTER INSERT OR UPDATE OF status ON rental_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_rental_order_inventory_automation();

-- ========================================
-- 4. FIX EXISTING ACTIVE ORDERS (ALL FORMATS)
-- ========================================

-- This section fixes inventory for existing active orders with populated toys_data
-- Handles multiple data formats: toy_id, id, and name-based lookup

DO $$
DECLARE
    order_record RECORD;
    toy_item JSONB;
    v_toy_id UUID;
    v_toy_id_text TEXT;
    v_quantity INTEGER;
    v_toy_name TEXT;
    v_category TEXT;
    fixed_count INTEGER := 0;
    processed_toys INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting retroactive fix for existing active orders...';
    
    -- Process existing active orders with non-empty toys_data
    FOR order_record IN 
        SELECT id, order_number, toys_data 
        FROM rental_orders 
        WHERE status = 'active' 
        AND toys_data IS NOT NULL 
        AND jsonb_array_length(toys_data) > 0
    LOOP
        RAISE NOTICE 'Processing existing active order: %', order_record.order_number;
        
        FOR toy_item IN SELECT * FROM jsonb_array_elements(order_record.toys_data)
        LOOP
            -- Initialize variables
            v_toy_id := NULL;
            v_toy_id_text := NULL;
            v_quantity := COALESCE((toy_item->>'quantity')::INTEGER, 1);
            v_toy_name := toy_item->>'name';
            v_category := toy_item->>'category';

            -- Try different ways to extract toy_id (same logic as above)
            -- Method 1: Check for toy_id field (modern format)
            IF toy_item ? 'toy_id' AND toy_item->>'toy_id' IS NOT NULL AND toy_item->>'toy_id' != '' THEN
                BEGIN
                    v_toy_id := (toy_item->>'toy_id')::UUID;
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING 'Invalid toy_id format in order %: %', order_record.id, toy_item->>'toy_id';
                END;
            END IF;

            -- Method 2: Check for id field (legacy format)
            IF v_toy_id IS NULL AND toy_item ? 'id' AND toy_item->>'id' IS NOT NULL AND toy_item->>'id' != '' THEN
                v_toy_id_text := toy_item->>'id';
                
                -- Try to find toy by legacy id or by name
                BEGIN
                    -- First try to convert id to UUID
                    v_toy_id := v_toy_id_text::UUID;
                EXCEPTION WHEN OTHERS THEN
                    -- If not UUID, try to find by name or legacy_id
                    SELECT id INTO v_toy_id 
                    FROM toys 
                    WHERE name ILIKE v_toy_name
                       OR legacy_id = v_toy_id_text
                    LIMIT 1;
                END;
            END IF;

            -- Method 3: Try to find by name if still no ID
            IF v_toy_id IS NULL AND v_toy_name IS NOT NULL AND v_toy_name != '' THEN
                SELECT id INTO v_toy_id 
                FROM toys 
                WHERE name ILIKE v_toy_name
                LIMIT 1;
            END IF;

            -- Process if we found a valid toy_id
            IF v_toy_id IS NOT NULL THEN
                BEGIN
                    -- Check if already processed (avoid double-processing)
                    IF NOT EXISTS (
                        SELECT 1 FROM inventory_movements 
                        WHERE toy_id = v_toy_id 
                        AND reference_id = order_record.id 
                        AND movement_type = 'RENTAL_OUT'
                    ) THEN
                        -- Record inventory movement using our fixed function
                        PERFORM record_inventory_movement(
                            v_toy_id,
                            'RENTAL_OUT',
                            -v_quantity,
                            order_record.id,  -- rental_order_id
                            'Retroactive inventory fix for existing active order',  -- movement_reason
                            'Retroactive fix applied - Order: ' || order_record.order_number  -- notes
                        );
                        
                        processed_toys := processed_toys + 1;
                        RAISE NOTICE 'Fixed inventory for toy % (%) in order %', 
                            v_toy_id, COALESCE(v_toy_name, 'Unknown'), order_record.order_number;
                    ELSE
                        RAISE NOTICE 'Skipping toy % in order % - already processed', 
                            v_toy_id, order_record.order_number;
                    END IF;
                    
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING 'Failed to fix inventory for toy % in order %: %', 
                        v_toy_id, order_record.order_number, SQLERRM;
                END;
            ELSE
                RAISE WARNING 'Could not find toy for item in order %: %', 
                    order_record.order_number, toy_item;
            END IF;
        END LOOP;
        
        fixed_count := fixed_count + 1;
    END LOOP;
    
    -- Sync age table inventory if function exists
    BEGIN
        PERFORM sync_age_table_inventory();
    EXCEPTION WHEN undefined_function THEN
        RAISE NOTICE 'sync_age_table_inventory function not found, skipping';
    END;
    
    RAISE NOTICE 'Retroactive fix completed. Processed % orders and % toys.', fixed_count, processed_toys;
END $$;

-- ========================================
-- 5. VERIFICATION QUERIES
-- ========================================

-- Query to check if the fix worked
-- Run these after applying the fix to verify everything is working

/*
-- 1. Check recent inventory movements
SELECT 
    im.created_at,
    im.movement_type,
    im.quantity_change,
    im.reference_type,
    im.notes,
    t.name as toy_name,
    ro.order_number
FROM inventory_movements im
JOIN toys t ON im.toy_id = t.id
LEFT JOIN rental_orders ro ON im.reference_id = ro.id
WHERE im.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY im.created_at DESC;

-- 2. Check active orders with toys_data
SELECT 
    id,
    order_number,
    status,
    jsonb_array_length(toys_data) as toy_count,
    toys_data
FROM rental_orders 
WHERE status = 'active' 
AND toys_data IS NOT NULL 
AND jsonb_array_length(toys_data) > 0
LIMIT 10;

-- 3. Check current toy inventory levels
SELECT 
    name,
    available_quantity,
    total_quantity,
    (available_quantity::float / NULLIF(total_quantity, 0) * 100)::int as availability_percentage
FROM toys 
WHERE total_quantity > 0
ORDER BY availability_percentage ASC
LIMIT 20;

-- 4. Check for orders that might still need fixing
SELECT 
    COUNT(*) as active_orders_with_toys,
    COUNT(CASE WHEN NOT EXISTS (
        SELECT 1 FROM inventory_movements im 
        WHERE im.reference_id = ro.id 
        AND im.movement_type = 'RENTAL_OUT'
    ) THEN 1 END) as orders_without_inventory_movements
FROM rental_orders ro
WHERE ro.status = 'active' 
AND ro.toys_data IS NOT NULL 
AND jsonb_array_length(ro.toys_data) > 0;

-- 5. Check which toys need restocking
SELECT 
    t.name,
    t.available_quantity,
    t.total_quantity,
    COUNT(DISTINCT ro.id) as active_orders_using_toy
FROM toys t
JOIN rental_orders ro ON ro.status = 'active'
WHERE t.available_quantity = 0 
AND t.total_quantity > 0
AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(ro.toys_data) AS toy_item
    WHERE toy_item->>'toy_id' = t.id::text 
    OR toy_item->>'name' ILIKE t.name
)
GROUP BY t.id, t.name, t.available_quantity, t.total_quantity
ORDER BY active_orders_using_toy DESC;
*/ 