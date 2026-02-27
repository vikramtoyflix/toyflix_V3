-- ========================================
-- SIMPLE INVENTORY AUTOMATION FIX 
-- ========================================
-- This fixes the inventory not decreasing issue using only existing table columns:
-- - Uses toys.id, toys.name, toys.sku (no legacy_id)
-- - Handles different toys_data formats simply
-- - Focuses on the core problem: active orders not processed

-- ========================================
-- 1. CREATE SIMPLE record_inventory_movement FUNCTION
-- ========================================

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
    
    -- Validate the movement (allow negative for insufficient inventory warnings)
    IF v_new_available < 0 THEN
        RAISE WARNING 'Inventory going negative for toy %. Available: %, Change: %', 
            p_toy_id, v_previous_available, p_quantity_change;
        v_new_available := 0; -- Set to 0 instead of negative
    END IF;
    
    -- Update toy inventory
    UPDATE toys 
    SET available_quantity = v_new_available,
        updated_at = now()
    WHERE id = p_toy_id;
    
    -- Record the movement
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
-- 2. SIMPLE FUNCTION TO FIND TOY BY DIFFERENT METHODS
-- ========================================

CREATE OR REPLACE FUNCTION find_toy_id_from_item(toy_item JSONB) 
RETURNS UUID AS $$
DECLARE
    v_toy_id UUID;
    v_toy_name TEXT;
    v_item_id TEXT;
BEGIN
    -- Method 1: Direct toy_id (modern format)
    IF toy_item ? 'toy_id' AND toy_item->>'toy_id' IS NOT NULL AND toy_item->>'toy_id' != '' THEN
        BEGIN
            v_toy_id := (toy_item->>'toy_id')::UUID;
            -- Verify toy exists
            IF EXISTS (SELECT 1 FROM toys WHERE id = v_toy_id) THEN
                RETURN v_toy_id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Invalid UUID, continue to other methods
        END;
    END IF;

    -- Method 2: Legacy 'id' field -> try by name
    v_toy_name := toy_item->>'name';
    IF v_toy_name IS NOT NULL AND v_toy_name != '' THEN
        SELECT id INTO v_toy_id 
        FROM toys 
        WHERE name ILIKE v_toy_name
        LIMIT 1;
        
        IF v_toy_id IS NOT NULL THEN
            RETURN v_toy_id;
        END IF;
    END IF;

    -- Method 3: Try SKU matching with legacy id
    v_item_id := toy_item->>'id';
    IF v_item_id IS NOT NULL AND v_item_id != '' THEN
        SELECT id INTO v_toy_id 
        FROM toys 
        WHERE sku = v_item_id
        LIMIT 1;
        
        IF v_toy_id IS NOT NULL THEN
            RETURN v_toy_id;
        END IF;
    END IF;

    -- Not found
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. UPDATE INVENTORY AUTOMATION FOR 'ACTIVE' STATUS
-- ========================================

CREATE OR REPLACE FUNCTION handle_rental_order_inventory_automation()
RETURNS TRIGGER AS $$
DECLARE
    v_movement_type TEXT;
    v_movement_reason TEXT;
    toy_item JSONB;
    v_toy_id UUID;
    v_quantity INTEGER;
    v_toy_name TEXT;
    processed_count INTEGER := 0;
BEGIN
    -- Only process status changes or new orders
    IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Log the operation
    RAISE NOTICE 'Processing rental order: % with status: %', 
        COALESCE(NEW.order_number, NEW.id::TEXT), NEW.status;

    -- Determine movement type based on status
    CASE 
        WHEN TG_OP = 'INSERT' AND NEW.status IN ('pending', 'confirmed', 'active') THEN
            v_movement_type := 'RENTAL_OUT';
            v_movement_reason := 'New rental order - toys reserved';
        WHEN NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
            v_movement_type := 'RENTAL_OUT';
            v_movement_reason := 'Order confirmed - toys reserved';
        WHEN NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status IN ('pending', 'confirmed', 'delivered')) THEN
            v_movement_type := 'RENTAL_OUT';
            v_movement_reason := 'Order activated - toys reserved';
        WHEN NEW.status = 'returned' AND OLD.status IN ('delivered', 'active', 'shipped') THEN
            v_movement_type := 'RENTAL_RETURN';
            v_movement_reason := 'Order returned - toys back in inventory';
        WHEN NEW.status = 'cancelled' AND OLD.status IN ('pending', 'confirmed', 'active') THEN
            v_movement_type := 'RENTAL_RETURN';
            v_movement_reason := 'Order cancelled - toys released';
        ELSE
            -- No inventory impact
            RAISE NOTICE 'No inventory impact for status change: % -> %', OLD.status, NEW.status;
            RETURN NEW;
    END CASE;

    -- Process toys_data if it exists
    IF NEW.toys_data IS NOT NULL AND jsonb_array_length(NEW.toys_data) > 0 THEN
        FOR toy_item IN SELECT * FROM jsonb_array_elements(NEW.toys_data)
        LOOP
            -- Find toy ID using our helper function
            v_toy_id := find_toy_id_from_item(toy_item);
            v_quantity := COALESCE((toy_item->>'quantity')::INTEGER, 1);
            v_toy_name := toy_item->>'name';

            -- Process if toy found
            IF v_toy_id IS NOT NULL THEN
                BEGIN
                    PERFORM record_inventory_movement(
                        v_toy_id,
                        v_movement_type,
                        CASE 
                            WHEN v_movement_type = 'RENTAL_OUT' THEN -v_quantity
                            WHEN v_movement_type = 'RENTAL_RETURN' THEN v_quantity
                            ELSE 0
                        END,
                        NEW.id,
                        v_movement_reason,
                        'Auto processed - Order: ' || COALESCE(NEW.order_number, NEW.id::TEXT)
                    );
                    
                    processed_count := processed_count + 1;
                    RAISE NOTICE 'Processed toy: % (%) for order %', 
                        v_toy_id, COALESCE(v_toy_name, 'Unknown'), NEW.id;
                        
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING 'Failed to process toy % in order %: %', 
                        v_toy_id, NEW.id, SQLERRM;
                END;
            ELSE
                RAISE WARNING 'Could not find toy for item in order %: %', 
                    NEW.id, toy_item;
            END IF;
        END LOOP;

        RAISE NOTICE 'Successfully processed % out of % toys for order %', 
            processed_count, jsonb_array_length(NEW.toys_data), NEW.id;
    ELSE
        RAISE WARNING 'Order % has empty toys_data', NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. CREATE THE TRIGGER
-- ========================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_rental_order_inventory_automation ON rental_orders;

-- Create the trigger
CREATE TRIGGER trigger_rental_order_inventory_automation
    AFTER INSERT OR UPDATE OF status ON rental_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_rental_order_inventory_automation();

-- ========================================
-- 5. FIX EXISTING ACTIVE ORDERS
-- ========================================

DO $$
DECLARE
    order_record RECORD;
    toy_item JSONB;
    v_toy_id UUID;
    v_quantity INTEGER;
    v_toy_name TEXT;
    fixed_orders INTEGER := 0;
    processed_toys INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting simple retroactive fix for active orders...';
    
    FOR order_record IN 
        SELECT id, order_number, toys_data 
        FROM rental_orders 
        WHERE status = 'active' 
        AND toys_data IS NOT NULL 
        AND jsonb_array_length(toys_data) > 0
    LOOP
        RAISE NOTICE 'Processing order: %', order_record.order_number;
        
        FOR toy_item IN SELECT * FROM jsonb_array_elements(order_record.toys_data)
        LOOP
            -- Use our helper function to find toy
            v_toy_id := find_toy_id_from_item(toy_item);
            v_quantity := COALESCE((toy_item->>'quantity')::INTEGER, 1);
            v_toy_name := toy_item->>'name';
            
            IF v_toy_id IS NOT NULL THEN
                -- Check if already processed
                IF NOT EXISTS (
                    SELECT 1 FROM inventory_movements 
                    WHERE toy_id = v_toy_id 
                    AND reference_id = order_record.id 
                    AND movement_type = 'RENTAL_OUT'
                ) THEN
                    BEGIN
                        PERFORM record_inventory_movement(
                            v_toy_id,
                            'RENTAL_OUT',
                            -v_quantity,
                            order_record.id,
                            'Retroactive fix for existing active order',
                            'Fix applied - Order: ' || order_record.order_number
                        );
                        
                        processed_toys := processed_toys + 1;
                        RAISE NOTICE 'Fixed toy: % (%) in order %', 
                            v_toy_id, COALESCE(v_toy_name, 'Unknown'), order_record.order_number;
                            
                    EXCEPTION WHEN OTHERS THEN
                        RAISE WARNING 'Failed to fix toy % in order %: %', 
                            v_toy_id, order_record.order_number, SQLERRM;
                    END;
                ELSE
                    RAISE NOTICE 'Toy % already processed for order %', v_toy_id, order_record.order_number;
                END IF;
            ELSE
                RAISE WARNING 'Could not find toy in order %: %', order_record.order_number, toy_item;
            END IF;
        END LOOP;
        
        fixed_orders := fixed_orders + 1;
    END LOOP;
    
    RAISE NOTICE 'Retroactive fix completed: % orders processed, % toys fixed', fixed_orders, processed_toys;
END $$;

-- ========================================
-- 6. VERIFICATION QUERY
-- ========================================

-- Run this after the fix to see results:
/*
SELECT 
    im.created_at,
    im.movement_type,
    im.quantity_change,
    im.notes,
    t.name as toy_name,
    ro.order_number
FROM inventory_movements im
JOIN toys t ON im.toy_id = t.id
LEFT JOIN rental_orders ro ON im.reference_id = ro.id
WHERE im.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY im.created_at DESC
LIMIT 20;
*/ 