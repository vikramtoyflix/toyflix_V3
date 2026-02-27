-- ================================================================================================
-- RENTAL ORDERS INVENTORY AUTOMATION SYSTEM
-- ================================================================================================
-- This script creates proper inventory automation for the rental_orders table
-- with toys_data JSONB structure used in the actual application.

-- ================================================================================================
-- 1. RENTAL ORDERS INVENTORY FUNCTION
-- ================================================================================================

CREATE OR REPLACE FUNCTION handle_rental_order_inventory_automation()
RETURNS TRIGGER AS $$
DECLARE
    v_toy_data JSONB;
    v_toy_item JSONB;
    v_toy_id UUID;
    v_quantity INTEGER;
    v_movement_type TEXT;
    v_movement_reason TEXT;
    v_current_available INTEGER;
    v_toy_name TEXT;
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
        WHEN TG_OP = 'INSERT' AND NEW.status IN ('pending', 'confirmed') THEN
            v_movement_type := 'RENTAL_OUT';
            v_movement_reason := 'New rental order created - toys reserved';
        WHEN NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
            v_movement_type := 'RENTAL_OUT';
            v_movement_reason := 'Order confirmed - toys reserved';
        WHEN NEW.status = 'shipped' AND OLD.status = 'confirmed' THEN
            -- Already reserved, no inventory change but log movement
            v_movement_type := 'RENTAL_OUT';
            v_movement_reason := 'Order shipped - toys dispatched to customer';
        WHEN NEW.status = 'delivered' AND OLD.status = 'shipped' THEN
            -- Already reserved, no inventory change but log movement
            v_movement_type := 'RENTAL_OUT';
            v_movement_reason := 'Order delivered - toys with customer';
        WHEN NEW.status = 'returned' AND OLD.status IN ('delivered', 'active') THEN
            v_movement_type := 'RENTAL_RETURN';
            v_movement_reason := 'Order returned - toys back in inventory';
        WHEN NEW.status = 'cancelled' AND OLD.status IN ('pending', 'confirmed') THEN
            v_movement_type := 'RENTAL_RETURN';
            v_movement_reason := 'Order cancelled - toys released back to inventory';
        ELSE
            -- No inventory impact for other status changes
            RAISE NOTICE 'No inventory impact for status change: % -> %', OLD.status, NEW.status;
            RETURN NEW;
    END CASE;

    -- Process toys_data if it exists
    IF NEW.toys_data IS NOT NULL AND jsonb_array_length(NEW.toys_data) > 0 THEN
        RAISE NOTICE 'Processing % toys in order %', jsonb_array_length(NEW.toys_data), NEW.order_number;
        
        FOR v_toy_item IN SELECT * FROM jsonb_array_elements(NEW.toys_data)
        LOOP
            -- Extract toy information from various possible structures
            v_toy_id := COALESCE(
                (v_toy_item->>'toy_id')::UUID,
                (v_toy_item->>'id')::UUID
            );
            
            v_quantity := COALESCE(
                (v_toy_item->>'quantity')::INTEGER, 
                1  -- Default to 1 if not specified
            );
            
            v_toy_name := COALESCE(
                v_toy_item->>'toy_name',
                v_toy_item->>'name',
                'Unknown Toy'
            );
            
            -- Skip if no valid toy_id
            IF v_toy_id IS NULL THEN
                RAISE WARNING 'Skipping toy item with missing toy_id in order %', NEW.order_number;
                CONTINUE;
            END IF;

            -- Get current available quantity for validation
            SELECT available_quantity, name INTO v_current_available, v_toy_name
            FROM toys 
            WHERE id = v_toy_id;
            
            IF NOT FOUND THEN
                RAISE WARNING 'Toy with ID % not found in toys table for order %', v_toy_id, NEW.order_number;
                CONTINUE;
            END IF;

            -- Record inventory movement and update quantity
            BEGIN
                IF v_movement_type = 'RENTAL_OUT' THEN
                    -- Check if sufficient inventory available
                    IF v_current_available < v_quantity THEN
                        RAISE WARNING 'Insufficient inventory for toy % (%): Available: %, Requested: %', 
                            v_toy_name, v_toy_id, v_current_available, v_quantity;
                        -- Continue processing but log the issue
                    END IF;
                    
                    -- Deduct inventory
                    UPDATE toys 
                    SET available_quantity = GREATEST(0, available_quantity - v_quantity),
                        updated_at = NOW()
                    WHERE id = v_toy_id;
                    
                    -- Log the movement
                    INSERT INTO inventory_movements (
                        toy_id,
                        movement_type,
                        quantity_change,
                        reference_type,
                        reference_id,
                        notes,
                        created_by
                    ) VALUES (
                        v_toy_id,
                        v_movement_type,
                        -v_quantity,  -- Negative for outgoing
                        'rental_order',
                        NEW.id,
                        format('%s for %s (Order: %s)', v_movement_reason, v_toy_name, NEW.order_number),
                        'automated_system'
                    );
                    
                    RAISE NOTICE 'Reduced inventory for toy % by % units (Order: %)', 
                        v_toy_name, v_quantity, NEW.order_number;
                        
                ELSIF v_movement_type = 'RENTAL_RETURN' THEN
                    -- Return inventory
                    UPDATE toys 
                    SET available_quantity = available_quantity + v_quantity,
                        updated_at = NOW()
                    WHERE id = v_toy_id;
                    
                    -- Log the movement
                    INSERT INTO inventory_movements (
                        toy_id,
                        movement_type,
                        quantity_change,
                        reference_type,
                        reference_id,
                        notes,
                        created_by
                    ) VALUES (
                        v_toy_id,
                        v_movement_type,
                        v_quantity,  -- Positive for incoming
                        'rental_order',
                        NEW.id,
                        format('%s for %s (Order: %s)', v_movement_reason, v_toy_name, NEW.order_number),
                        'automated_system'
                    );
                    
                    RAISE NOTICE 'Returned inventory for toy % by % units (Order: %)', 
                        v_toy_name, v_quantity, NEW.order_number;
                END IF;
                
                -- Sync with age-specific tables if function exists
                BEGIN
                    PERFORM sync_age_table_inventory(v_toy_id);
                EXCEPTION WHEN OTHERS THEN
                    -- Ignore if sync function doesn't exist
                    NULL;
                END;
                
            EXCEPTION WHEN OTHERS THEN
                -- Log error but don't fail the order operation
                RAISE WARNING 'Failed to update inventory for toy % (%) in order %: %', 
                    v_toy_name, v_toy_id, NEW.order_number, SQLERRM;
            END;
        END LOOP;
    ELSE
        RAISE NOTICE 'No toys_data found in order % or empty array', NEW.order_number;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================================================
-- 2. CREATE/REPLACE TRIGGERS
-- ================================================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_rental_order_inventory_automation ON rental_orders;

-- Create new trigger for rental orders
CREATE TRIGGER trigger_rental_order_inventory_automation
    AFTER INSERT OR UPDATE OF status ON rental_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_rental_order_inventory_automation();

-- ================================================================================================
-- 3. MANUAL INVENTORY CORRECTION FUNCTION
-- ================================================================================================

CREATE OR REPLACE FUNCTION correct_inventory_for_order(
    p_order_id UUID,
    p_action TEXT DEFAULT 'recalculate' -- 'recalculate', 'force_deduct', 'force_return'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_order RECORD;
    v_toy_item JSONB;
    v_toy_id UUID;
    v_quantity INTEGER;
    v_toy_name TEXT;
BEGIN
    -- Get order details
    SELECT * INTO v_order
    FROM rental_orders 
    WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;
    
    RAISE NOTICE 'Correcting inventory for order: % (Status: %)', v_order.order_number, v_order.status;
    
    -- Process each toy in the order
    IF v_order.toys_data IS NOT NULL AND jsonb_array_length(v_order.toys_data) > 0 THEN
        FOR v_toy_item IN SELECT * FROM jsonb_array_elements(v_order.toys_data)
        LOOP
            v_toy_id := COALESCE(
                (v_toy_item->>'toy_id')::UUID,
                (v_toy_item->>'id')::UUID
            );
            
            v_quantity := COALESCE((v_toy_item->>'quantity')::INTEGER, 1);
            
            SELECT name INTO v_toy_name FROM toys WHERE id = v_toy_id;
            
            IF v_toy_id IS NULL OR v_toy_name IS NULL THEN
                CONTINUE;
            END IF;
            
            CASE p_action
                WHEN 'recalculate' THEN
                    -- Determine what should happen based on order status
                    IF v_order.status IN ('confirmed', 'shipped', 'delivered', 'active') THEN
                        -- Should be deducted
                        RAISE NOTICE 'Order % should have deducted % units of %', 
                            v_order.order_number, v_quantity, v_toy_name;
                    ELSIF v_order.status IN ('returned', 'cancelled') THEN
                        -- Should be returned
                        RAISE NOTICE 'Order % should have returned % units of %', 
                            v_order.order_number, v_quantity, v_toy_name;
                    END IF;
                    
                WHEN 'force_deduct' THEN
                    UPDATE toys 
                    SET available_quantity = GREATEST(0, available_quantity - v_quantity),
                        updated_at = NOW()
                    WHERE id = v_toy_id;
                    
                    INSERT INTO inventory_movements (
                        toy_id, movement_type, quantity_change, reference_type, reference_id,
                        notes, created_by
                    ) VALUES (
                        v_toy_id, 'MANUAL_DECREASE', -v_quantity, 'rental_order', p_order_id,
                        format('Manual correction: Force deduct for order %s', v_order.order_number),
                        'manual_correction'
                    );
                    
                WHEN 'force_return' THEN
                    UPDATE toys 
                    SET available_quantity = available_quantity + v_quantity,
                        updated_at = NOW()
                    WHERE id = v_toy_id;
                    
                    INSERT INTO inventory_movements (
                        toy_id, movement_type, quantity_change, reference_type, reference_id,
                        notes, created_by
                    ) VALUES (
                        v_toy_id, 'MANUAL_INCREASE', v_quantity, 'rental_order', p_order_id,
                        format('Manual correction: Force return for order %s', v_order.order_number),
                        'manual_correction'
                    );
            END CASE;
        END LOOP;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ================================================================================================
-- 4. DIAGNOSTIC FUNCTIONS
-- ================================================================================================

CREATE OR REPLACE FUNCTION diagnose_inventory_for_order(p_order_id UUID)
RETURNS TABLE (
    toy_id UUID,
    toy_name TEXT,
    quantity_in_order INTEGER,
    current_available INTEGER,
    order_status TEXT,
    expected_action TEXT,
    movement_history_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as toy_id,
        t.name as toy_name,
        COALESCE((toy_item->>'quantity')::INTEGER, 1) as quantity_in_order,
        t.available_quantity as current_available,
        ro.status as order_status,
        CASE 
            WHEN ro.status IN ('confirmed', 'shipped', 'delivered', 'active') THEN 'Should be deducted'
            WHEN ro.status IN ('returned', 'cancelled') THEN 'Should be returned'
            ELSE 'No action needed'
        END as expected_action,
        COALESCE((
            SELECT COUNT(*) 
            FROM inventory_movements im 
            WHERE im.toy_id = t.id 
            AND im.reference_id = ro.id
        ), 0) as movement_history_count
    FROM rental_orders ro,
         jsonb_array_elements(ro.toys_data) as toy_item
    JOIN toys t ON t.id = COALESCE(
        (toy_item->>'toy_id')::UUID,
        (toy_item->>'id')::UUID
    )
    WHERE ro.id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================================================================
-- 5. INVENTORY AUDIT FUNCTION
-- ================================================================================================

CREATE OR REPLACE FUNCTION audit_rental_order_inventory()
RETURNS TABLE (
    order_id UUID,
    order_number TEXT,
    order_status TEXT,
    toy_count INTEGER,
    movement_count BIGINT,
    discrepancy_detected BOOLEAN,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ro.id as order_id,
        ro.order_number,
        ro.status as order_status,
        jsonb_array_length(COALESCE(ro.toys_data, '[]'::jsonb)) as toy_count,
        COALESCE((
            SELECT COUNT(*) 
            FROM inventory_movements im 
            WHERE im.reference_id = ro.id 
            AND im.reference_type = 'rental_order'
        ), 0) as movement_count,
        CASE 
            WHEN ro.status IN ('confirmed', 'shipped', 'delivered', 'active') 
                AND NOT EXISTS (
                    SELECT 1 FROM inventory_movements im 
                    WHERE im.reference_id = ro.id 
                    AND im.movement_type = 'RENTAL_OUT'
                ) THEN true
            WHEN ro.status IN ('returned', 'cancelled') 
                AND ro.status != 'pending'
                AND EXISTS (
                    SELECT 1 FROM inventory_movements im 
                    WHERE im.reference_id = ro.id 
                    AND im.movement_type = 'RENTAL_OUT'
                )
                AND NOT EXISTS (
                    SELECT 1 FROM inventory_movements im 
                    WHERE im.reference_id = ro.id 
                    AND im.movement_type = 'RENTAL_RETURN'
                ) THEN true
            ELSE false
        END as discrepancy_detected,
        CASE 
            WHEN jsonb_array_length(COALESCE(ro.toys_data, '[]'::jsonb)) = 0 THEN 'No toys in order'
            WHEN ro.status IN ('confirmed', 'shipped', 'delivered', 'active') 
                AND NOT EXISTS (
                    SELECT 1 FROM inventory_movements im 
                    WHERE im.reference_id = ro.id 
                    AND im.movement_type = 'RENTAL_OUT'
                ) THEN 'Missing outbound movement'
            WHEN ro.status IN ('returned', 'cancelled') 
                AND EXISTS (
                    SELECT 1 FROM inventory_movements im 
                    WHERE im.reference_id = ro.id 
                    AND im.movement_type = 'RENTAL_OUT'
                )
                AND NOT EXISTS (
                    SELECT 1 FROM inventory_movements im 
                    WHERE im.reference_id = ro.id 
                    AND im.movement_type = 'RENTAL_RETURN'
                ) THEN 'Missing return movement'
            ELSE 'Looks correct'
        END as notes
    FROM rental_orders ro
    WHERE ro.created_at >= CURRENT_DATE - INTERVAL '30 days'  -- Last 30 days
    ORDER BY ro.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ================================================================================================
-- 6. ENABLE TRIGGERS AND FINAL SETUP
-- ================================================================================================

-- Enable trigger if it was disabled
ALTER TABLE rental_orders ENABLE TRIGGER trigger_rental_order_inventory_automation;

-- Add helpful comments
COMMENT ON FUNCTION handle_rental_order_inventory_automation() IS 'Automatically manages toy inventory when rental orders are created or status changes';
COMMENT ON FUNCTION correct_inventory_for_order(UUID, TEXT) IS 'Manual function to correct inventory discrepancies for specific orders';
COMMENT ON FUNCTION diagnose_inventory_for_order(UUID) IS 'Diagnostic function to check inventory status for a specific order';
COMMENT ON FUNCTION audit_rental_order_inventory() IS 'Audit function to find inventory discrepancies across rental orders';

-- ================================================================================================
-- MIGRATION COMPLETION MESSAGE
-- ================================================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'RENTAL ORDERS INVENTORY AUTOMATION SETUP COMPLETE';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Features added:';
    RAISE NOTICE '• Automatic inventory deduction when orders are placed/confirmed';
    RAISE NOTICE '• Automatic inventory return when orders are cancelled/returned';
    RAISE NOTICE '• Full audit trail in inventory_movements table';
    RAISE NOTICE '• Manual correction functions for discrepancies';
    RAISE NOTICE '• Diagnostic and audit functions for monitoring';
    RAISE NOTICE '';
    RAISE NOTICE 'Key functions:';
    RAISE NOTICE '• handle_rental_order_inventory_automation() - Main trigger function';
    RAISE NOTICE '• correct_inventory_for_order(order_id, action) - Manual corrections';
    RAISE NOTICE '• diagnose_inventory_for_order(order_id) - Order diagnostics';
    RAISE NOTICE '• audit_rental_order_inventory() - System-wide audit';
    RAISE NOTICE '';
    RAISE NOTICE 'The system will now automatically manage inventory when:';
    RAISE NOTICE '• New rental orders are created';
    RAISE NOTICE '• Order status changes to confirmed/shipped/delivered';
    RAISE NOTICE '• Orders are cancelled or returned';
    RAISE NOTICE '=================================================================';
END $$; 