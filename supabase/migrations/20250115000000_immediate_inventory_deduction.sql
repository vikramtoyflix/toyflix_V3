-- Migration: Immediate Inventory Deduction System
-- Description: Implements immediate inventory deduction when ANY order is placed
-- Date: 2025-01-15
-- ================================================================================================

-- ================================================================================================
-- 1. UNIVERSAL INVENTORY DEDUCTION FUNCTION
-- ================================================================================================

CREATE OR REPLACE FUNCTION immediate_inventory_deduction()
RETURNS TRIGGER AS $$
DECLARE
    v_toy_data JSONB;
    v_toy_item JSONB;
    v_toy_id UUID;
    v_quantity INTEGER;
    v_toy_name TEXT;
    v_current_available INTEGER;
    v_table_name TEXT;
    v_order_identifier TEXT;
BEGIN
    -- Get the table name for logging
    v_table_name := TG_TABLE_NAME;
    
    -- Get order identifier for logging
    v_order_identifier := COALESCE(
        NEW.order_number::TEXT, 
        NEW.id::TEXT,
        'Unknown Order'
    );

    -- Log the operation
    RAISE NOTICE '🚀 IMMEDIATE DEDUCTION: Processing % order: %', v_table_name, v_order_identifier;

    -- Extract toys data from different possible fields
    v_toy_data := COALESCE(
        NEW.toys_data,           -- rental_orders uses toys_data
        NEW.selected_toys,       -- queue_orders uses selected_toys
        '[]'::jsonb
    );

    -- Skip if no toys data
    IF v_toy_data IS NULL OR jsonb_array_length(v_toy_data) = 0 THEN
        RAISE NOTICE '⚠️ No toys found in % order: %', v_table_name, v_order_identifier;
        RETURN NEW;
    END IF;

    RAISE NOTICE '📦 Processing % toys in % order: %', 
        jsonb_array_length(v_toy_data), v_table_name, v_order_identifier;

    -- Process each toy in the order
    FOR v_toy_item IN SELECT * FROM jsonb_array_elements(v_toy_data)
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
        
        -- Skip if no valid toy_id
        IF v_toy_id IS NULL THEN
            RAISE WARNING '⚠️ Skipping toy item with missing toy_id in % order %', v_table_name, v_order_identifier;
            CONTINUE;
        END IF;

        -- Get current available quantity and toy name
        SELECT available_quantity, name INTO v_current_available, v_toy_name
        FROM toys 
        WHERE id = v_toy_id;
        
        IF NOT FOUND THEN
            RAISE WARNING '⚠️ Toy with ID % not found in toys table for % order %', v_toy_id, v_table_name, v_order_identifier;
            CONTINUE;
        END IF;

        -- Perform immediate inventory deduction
        BEGIN
            -- Check if sufficient inventory available (warn but continue)
            IF v_current_available < v_quantity THEN
                RAISE WARNING '🚨 INSUFFICIENT INVENTORY: Toy % (%): Available: %, Requested: % (Order: %)', 
                    v_toy_name, v_toy_id, v_current_available, v_quantity, v_order_identifier;
            END IF;
            
            -- IMMEDIATELY DEDUCT INVENTORY (regardless of status)
            UPDATE toys 
            SET available_quantity = GREATEST(0, available_quantity - v_quantity),
                updated_at = NOW()
            WHERE id = v_toy_id;
            
            -- Log the inventory movement
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
                'IMMEDIATE_DEDUCTION',
                -v_quantity,  -- Negative for outgoing
                v_table_name,  -- 'rental_orders' or 'queue_orders'
                NEW.id,
                format('IMMEDIATE DEDUCTION: %s order placed - %s (Order: %s)', 
                    v_table_name, v_toy_name, v_order_identifier),
                'automated_immediate_system'
            );
            
            RAISE NOTICE '✅ IMMEDIATE DEDUCTION: Reduced inventory for toy % by % units (Order: %)', 
                v_toy_name, v_quantity, v_order_identifier;
                
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the order creation
            RAISE WARNING '❌ Failed to deduct inventory for toy % (%) in % order %: %', 
                v_toy_name, v_toy_id, v_table_name, v_order_identifier, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '🎯 IMMEDIATE DEDUCTION COMPLETE for % order: %', v_table_name, v_order_identifier;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================================================
-- 2. INVENTORY RETURN FUNCTION (for cancellations/returns)
-- ================================================================================================

CREATE OR REPLACE FUNCTION handle_inventory_return()
RETURNS TRIGGER AS $$
DECLARE
    v_toy_data JSONB;
    v_toy_item JSONB;
    v_toy_id UUID;
    v_quantity INTEGER;
    v_toy_name TEXT;
    v_table_name TEXT;
    v_order_identifier TEXT;
BEGIN
    -- Only process if status changed to cancelled or returned
    IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    -- Only return inventory for specific status changes
    IF NEW.status NOT IN ('cancelled', 'returned') THEN
        RETURN NEW;
    END IF;
    
    v_table_name := TG_TABLE_NAME;
    v_order_identifier := COALESCE(NEW.order_number::TEXT, NEW.id::TEXT, 'Unknown Order');

    RAISE NOTICE '🔄 INVENTORY RETURN: Processing % order: % (Status: %)', 
        v_table_name, v_order_identifier, NEW.status;

    -- Extract toys data
    v_toy_data := COALESCE(
        NEW.toys_data,           -- rental_orders
        NEW.selected_toys,       -- queue_orders
        '[]'::jsonb
    );

    IF v_toy_data IS NULL OR jsonb_array_length(v_toy_data) = 0 THEN
        RETURN NEW;
    END IF;

    -- Process each toy for return
    FOR v_toy_item IN SELECT * FROM jsonb_array_elements(v_toy_data)
    LOOP
        v_toy_id := COALESCE(
            (v_toy_item->>'toy_id')::UUID,
            (v_toy_item->>'id')::UUID
        );
        v_quantity := COALESCE((v_toy_item->>'quantity')::INTEGER, 1);
        
        IF v_toy_id IS NULL THEN
            CONTINUE;
        END IF;

        SELECT name INTO v_toy_name FROM toys WHERE id = v_toy_id;
        
        IF NOT FOUND THEN
            CONTINUE;
        END IF;

        -- Return inventory
        BEGIN
            UPDATE toys 
            SET available_quantity = available_quantity + v_quantity,
                updated_at = NOW()
            WHERE id = v_toy_id;
            
            INSERT INTO inventory_movements (
                toy_id, movement_type, quantity_change, reference_type, reference_id,
                notes, created_by
            ) VALUES (
                v_toy_id, 'INVENTORY_RETURN', v_quantity, v_table_name, NEW.id,
                format('INVENTORY RETURN: %s order %s - %s (Order: %s)', 
                    v_table_name, NEW.status, v_toy_name, v_order_identifier),
                'automated_return_system'
            );
            
            RAISE NOTICE '✅ INVENTORY RETURNED: Added back % units of % (Order: %)', 
                v_quantity, v_toy_name, v_order_identifier;
                
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '❌ Failed to return inventory for toy % in % order %: %', 
                v_toy_name, v_table_name, v_order_identifier, SQLERRM;
        END;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================================================
-- 3. REPLACE EXISTING TRIGGERS WITH IMMEDIATE DEDUCTION TRIGGERS
-- ================================================================================================

-- ========================================
-- RENTAL ORDERS TRIGGERS
-- ========================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_rental_order_inventory_automation ON rental_orders;
DROP TRIGGER IF EXISTS trigger_rental_order_immediate_deduction ON rental_orders;
DROP TRIGGER IF EXISTS trigger_rental_order_inventory_return ON rental_orders;

-- Create immediate deduction trigger for rental_orders (fires on INSERT)
CREATE TRIGGER trigger_rental_order_immediate_deduction
    AFTER INSERT ON rental_orders
    FOR EACH ROW
    EXECUTE FUNCTION immediate_inventory_deduction();

-- Create return trigger for rental_orders (fires on status change to cancelled/returned)
CREATE TRIGGER trigger_rental_order_inventory_return
    AFTER UPDATE OF status ON rental_orders
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION handle_inventory_return();

-- ========================================
-- QUEUE ORDERS TRIGGERS
-- ========================================

-- Drop existing triggers (if any)
DROP TRIGGER IF EXISTS trigger_queue_order_immediate_deduction ON queue_orders;
DROP TRIGGER IF EXISTS trigger_queue_order_inventory_return ON queue_orders;

-- Only create queue_orders triggers if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'queue_orders') THEN
        -- Create immediate deduction trigger for queue_orders
        EXECUTE 'CREATE TRIGGER trigger_queue_order_immediate_deduction
                    AFTER INSERT ON queue_orders
                    FOR EACH ROW
                    EXECUTE FUNCTION immediate_inventory_deduction()';

        -- Create return trigger for queue_orders
        EXECUTE 'CREATE TRIGGER trigger_queue_order_inventory_return
                    AFTER UPDATE OF status ON queue_orders
                    FOR EACH ROW
                    WHEN (OLD.status IS DISTINCT FROM NEW.status)
                    EXECUTE FUNCTION handle_inventory_return()';
                    
        RAISE NOTICE '✅ Queue orders triggers created successfully';
    ELSE
        RAISE NOTICE '⚠️ queue_orders table does not exist, skipping queue triggers';
    END IF;
END $$;

-- ================================================================================================
-- 4. VERIFICATION FUNCTION
-- ================================================================================================

CREATE OR REPLACE FUNCTION test_immediate_deduction()
RETURNS TEXT AS $$
DECLARE
    test_result TEXT;
BEGIN
    -- Check if functions exist
    IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'immediate_inventory_deduction') THEN
        RETURN '❌ immediate_inventory_deduction function missing';
    END IF;
    
    -- Check if rental_orders triggers exist
    IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_rental_order_immediate_deduction') THEN
        RETURN '❌ rental_orders immediate deduction trigger missing';
    END IF;
    
    -- Check if queue_orders table and triggers exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'queue_orders') THEN
        IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_queue_order_immediate_deduction') THEN
            RETURN '❌ queue_orders immediate deduction trigger missing';
        END IF;
    END IF;
    
    RETURN '✅ Immediate inventory deduction system is properly configured!';
END;
$$ LANGUAGE plpgsql;

-- ================================================================================================
-- 5. RUN VERIFICATION AND LOG RESULTS
-- ================================================================================================

-- Test the system
SELECT test_immediate_deduction() as migration_status;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '🎉 MIGRATION COMPLETE: Immediate inventory deduction system deployed!';
    RAISE NOTICE '📋 Summary:';
    RAISE NOTICE '   ✅ rental_orders: Immediate deduction on INSERT';
    RAISE NOTICE '   ✅ queue_orders: Immediate deduction on INSERT (if table exists)';
    RAISE NOTICE '   ✅ Both tables: Return inventory on cancelled/returned status';
    RAISE NOTICE '   ✅ Complete audit trail in inventory_movements';
    RAISE NOTICE '   ✅ No waiting for status changes required';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 To verify: SELECT test_immediate_deduction();';
    RAISE NOTICE '📊 To monitor: SELECT * FROM inventory_movements WHERE movement_type = ''IMMEDIATE_DEDUCTION'' ORDER BY created_at DESC;';
END $$; 