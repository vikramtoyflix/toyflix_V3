-- ========================================
-- AUTOMATED INVENTORY TRIGGERS SYSTEM
-- ========================================
-- This script sets up automated triggers for inventory management
-- Run this in Supabase SQL Editor after the main inventory functions

-- ========================================
-- TRIGGER FUNCTIONS
-- ========================================

-- Function to handle order status changes and update inventory accordingly
CREATE OR REPLACE FUNCTION handle_order_inventory_automation()
RETURNS TRIGGER AS $$
DECLARE
    v_toy_data JSONB;
    v_toy_item JSONB;
    v_toy_id UUID;
    v_quantity INTEGER;
    v_movement_type TEXT;
    v_movement_reason TEXT;
BEGIN
    -- Only process if status has changed
    IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Determine movement type based on status change
    CASE 
        WHEN NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
            v_movement_type := 'RENTAL_OUT';
            v_movement_reason := 'Order confirmed - toys reserved';
        WHEN NEW.status = 'delivered' AND OLD.status = 'confirmed' THEN
            v_movement_type := 'RENTAL_OUT';
            v_movement_reason := 'Order delivered - toys with customer';
        WHEN NEW.status = 'returned' AND OLD.status = 'delivered' THEN
            v_movement_type := 'RENTAL_RETURN';
            v_movement_reason := 'Order returned - toys back in inventory';
        WHEN NEW.status = 'cancelled' AND OLD.status IN ('pending', 'confirmed') THEN
            v_movement_type := 'RENTAL_RETURN';
            v_movement_reason := 'Order cancelled - toys released';
        ELSE
            -- No inventory impact for other status changes
            RETURN NEW;
    END CASE;

    -- Process toys_data if it exists
    IF NEW.toys_data IS NOT NULL AND jsonb_array_length(NEW.toys_data) > 0 THEN
        FOR v_toy_item IN SELECT * FROM jsonb_array_elements(NEW.toys_data)
        LOOP
            -- Extract toy information
            v_toy_id := (v_toy_item->>'toy_id')::UUID;
            v_quantity := COALESCE((v_toy_item->>'quantity')::INTEGER, 1);
            
            -- Skip if no valid toy_id
            IF v_toy_id IS NULL THEN
                CONTINUE;
            END IF;

            -- Record inventory movement
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
                    'Automated via order status change'
                );
                
                -- Sync with age-specific tables
                PERFORM sync_age_table_inventory(v_toy_id);
                
            EXCEPTION WHEN OTHERS THEN
                -- Log error but don't fail the order update
                RAISE WARNING 'Failed to update inventory for toy % in order %: %', 
                    v_toy_id, NEW.id, SQLERRM;
            END;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle inventory adjustments when toys are manually updated
CREATE OR REPLACE FUNCTION handle_toy_inventory_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_quantity_diff INTEGER;
BEGIN
    -- Calculate quantity difference
    v_quantity_diff := NEW.available_quantity - OLD.available_quantity;
    
    -- Only record movement if quantity actually changed
    IF v_quantity_diff != 0 THEN
        -- Record the inventory movement
        PERFORM record_inventory_movement(
            NEW.id,
            'ADJUSTMENT',
            v_quantity_diff,
            NULL,
            'Manual inventory adjustment',
            CASE 
                WHEN v_quantity_diff > 0 THEN 'Inventory increased manually'
                ELSE 'Inventory decreased manually'
            END
        );
        
        -- Sync with age-specific tables
        PERFORM sync_age_table_inventory(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle damage reporting
CREATE OR REPLACE FUNCTION handle_damage_report()
RETURNS TRIGGER AS $$
BEGIN
    -- If damage is reported, reduce available inventory
    IF NEW.damage_reported = true AND (OLD.damage_reported IS NULL OR OLD.damage_reported = false) THEN
        -- Extract damaged toys from toys_data and update inventory
        -- This is a simplified version - in practice, you'd want more detailed damage tracking
        PERFORM record_inventory_movement(
            NULL, -- Would need to extract toy_id from toys_data
            'DAMAGE',
            -1, -- Assume 1 unit damaged for now
            NEW.id,
            'Damage reported',
            COALESCE(NEW.damage_details, 'Damage reported without details')
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically reorder low stock items
CREATE OR REPLACE FUNCTION check_and_alert_low_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_threshold INTEGER;
    v_needs_reorder BOOLEAN;
BEGIN
    -- Get reorder threshold (20% of total quantity, minimum 2)
    v_threshold := GREATEST(FLOOR(NEW.total_quantity * 0.2), 2);
    
    -- Check if item is now below threshold
    v_needs_reorder := NEW.available_quantity <= v_threshold;
    
    -- If stock is critically low, create notification
    IF v_needs_reorder AND (OLD.available_quantity IS NULL OR OLD.available_quantity > v_threshold) THEN
        -- Insert into a notifications table (if you have one) or log
        RAISE NOTICE 'LOW STOCK ALERT: Toy % (%) has only % units available (threshold: %)', 
            NEW.name, NEW.id, NEW.available_quantity, v_threshold;
        
        -- You could also insert into a notifications/alerts table here
        -- INSERT INTO inventory_alerts (toy_id, alert_type, message, created_at)
        -- VALUES (NEW.id, 'LOW_STOCK', '...', now());
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- CREATE TRIGGERS
-- ========================================

-- Trigger for order status changes
DROP TRIGGER IF EXISTS trigger_order_inventory_automation ON rental_orders;
CREATE TRIGGER trigger_order_inventory_automation
    AFTER UPDATE ON rental_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_inventory_automation();

-- Trigger for manual toy inventory changes
DROP TRIGGER IF EXISTS trigger_toy_inventory_changes ON toys;
CREATE TRIGGER trigger_toy_inventory_changes
    AFTER UPDATE ON toys
    FOR EACH ROW
    WHEN (OLD.available_quantity IS DISTINCT FROM NEW.available_quantity)
    EXECUTE FUNCTION handle_toy_inventory_changes();

-- Trigger for low stock alerts
DROP TRIGGER IF EXISTS trigger_low_stock_check ON toys;
CREATE TRIGGER trigger_low_stock_check
    AFTER UPDATE ON toys
    FOR EACH ROW
    WHEN (OLD.available_quantity IS DISTINCT FROM NEW.available_quantity)
    EXECUTE FUNCTION check_and_alert_low_stock();

-- Trigger for damage reporting (if rental_orders table exists)
DROP TRIGGER IF EXISTS trigger_damage_report ON rental_orders;
CREATE TRIGGER trigger_damage_report
    AFTER UPDATE ON rental_orders
    FOR EACH ROW
    WHEN (OLD.damage_reported IS DISTINCT FROM NEW.damage_reported)
    EXECUTE FUNCTION handle_damage_report();

-- ========================================
-- SCHEDULED FUNCTIONS (for periodic tasks)
-- ========================================

-- Function to clean up old inventory movements (run monthly)
CREATE OR REPLACE FUNCTION cleanup_old_inventory_movements()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete movements older than 1 year (adjust as needed)
    DELETE FROM inventory_movements 
    WHERE created_at < NOW() - INTERVAL '1 year'
    AND movement_type NOT IN ('DAMAGE', 'LOSS'); -- Keep important records
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % old inventory movement records', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to generate daily inventory summary
CREATE OR REPLACE FUNCTION generate_daily_inventory_summary()
RETURNS TABLE (
    summary_date DATE,
    total_movements INTEGER,
    items_in INTEGER,
    items_out INTEGER,
    net_change INTEGER,
    low_stock_count INTEGER,
    out_of_stock_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CURRENT_DATE as summary_date,
        COUNT(*)::INTEGER as total_movements,
        SUM(CASE WHEN quantity_change > 0 THEN quantity_change ELSE 0 END)::INTEGER as items_in,
        SUM(CASE WHEN quantity_change < 0 THEN ABS(quantity_change) ELSE 0 END)::INTEGER as items_out,
        SUM(quantity_change)::INTEGER as net_change,
        (SELECT COUNT(*)::INTEGER FROM toys WHERE available_quantity <= 2) as low_stock_count,
        (SELECT COUNT(*)::INTEGER FROM toys WHERE available_quantity = 0) as out_of_stock_count
    FROM inventory_movements 
    WHERE DATE(created_at) = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to check for overdue returns and update inventory
CREATE OR REPLACE FUNCTION check_overdue_returns()
RETURNS INTEGER AS $$
DECLARE
    overdue_order RECORD;
    processed_count INTEGER := 0;
BEGIN
    -- Find orders that are overdue (more than 30 days past rental_end_date)
    FOR overdue_order IN 
        SELECT id, toys_data, rental_end_date
        FROM rental_orders 
        WHERE status = 'delivered' 
        AND rental_end_date < CURRENT_DATE - INTERVAL '30 days'
    LOOP
        -- Mark order as overdue and potentially lost
        UPDATE rental_orders 
        SET status = 'overdue',
            return_status = 'overdue',
            updated_at = NOW()
        WHERE id = overdue_order.id;
        
        -- Could also mark toys as potentially lost after extended overdue period
        -- This would require more sophisticated logic based on business rules
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Processed % overdue orders', processed_count;
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- UTILITY FUNCTIONS FOR AUTOMATION
-- ========================================

-- Function to bulk update inventory thresholds
CREATE OR REPLACE FUNCTION update_inventory_thresholds(
    p_category TEXT DEFAULT NULL,
    p_threshold_percentage NUMERIC DEFAULT 0.2
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
    v_where_clause TEXT := '';
BEGIN
    -- Build dynamic WHERE clause if category is specified
    IF p_category IS NOT NULL THEN
        v_where_clause := ' AND category = ' || quote_literal(p_category);
    END IF;
    
    -- Note: This is conceptual - you'd need to add a threshold column to toys table
    -- UPDATE toys 
    -- SET reorder_threshold = GREATEST(FLOOR(total_quantity * p_threshold_percentage), 2)
    -- WHERE total_quantity > 0 || v_where_clause;
    
    -- For now, just return count of toys that would be affected
    EXECUTE format('SELECT COUNT(*) FROM toys WHERE total_quantity > 0 %s', v_where_clause)
    INTO updated_count;
    
    RAISE NOTICE 'Would update % toys with new threshold percentage %', updated_count, p_threshold_percentage;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to simulate inventory forecast
CREATE OR REPLACE FUNCTION forecast_inventory_needs(
    p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
    toy_id UUID,
    toy_name TEXT,
    current_available INTEGER,
    projected_demand INTEGER,
    recommended_restock INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.available_quantity,
        -- Simple forecast based on recent rental patterns
        COALESCE((
            SELECT CEIL(AVG(
                CASE WHEN im.movement_type = 'RENTAL_OUT' 
                THEN ABS(im.quantity_change) ELSE 0 END
            ) * p_days_ahead / 30.0)::INTEGER
            FROM inventory_movements im
            WHERE im.toy_id = t.id
            AND im.created_at >= NOW() - INTERVAL '30 days'
            AND im.movement_type = 'RENTAL_OUT'
        ), 0) as projected_demand,
        -- Recommended restock = projected demand - current available + safety stock
        GREATEST(
            COALESCE((
                SELECT CEIL(AVG(
                    CASE WHEN im.movement_type = 'RENTAL_OUT' 
                    THEN ABS(im.quantity_change) ELSE 0 END
                ) * p_days_ahead / 30.0)::INTEGER
                FROM inventory_movements im
                WHERE im.toy_id = t.id
                AND im.created_at >= NOW() - INTERVAL '30 days'
                AND im.movement_type = 'RENTAL_OUT'
            ), 0) - t.available_quantity + GREATEST(FLOOR(t.total_quantity * 0.2), 2),
            0
        )::INTEGER as recommended_restock
    FROM toys t
    WHERE t.available_quantity <= GREATEST(FLOOR(t.total_quantity * 0.3), 3)
    ORDER BY recommended_restock DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Indexes for efficient trigger operations
CREATE INDEX IF NOT EXISTS idx_rental_orders_status_updated ON rental_orders(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_toy_date ON inventory_movements(toy_id, created_at);
CREATE INDEX IF NOT EXISTS idx_toys_available_quantity ON toys(available_quantity);
CREATE INDEX IF NOT EXISTS idx_toys_category_available ON toys(category, available_quantity);

-- ========================================
-- COMMENTS AND DOCUMENTATION
-- ========================================

COMMENT ON FUNCTION handle_order_inventory_automation() IS 
'Automatically updates inventory when order status changes';

COMMENT ON FUNCTION handle_toy_inventory_changes() IS 
'Records inventory movements when toy quantities are manually updated';

COMMENT ON FUNCTION check_and_alert_low_stock() IS 
'Generates alerts when toy inventory falls below threshold';

COMMENT ON FUNCTION cleanup_old_inventory_movements() IS 
'Periodic cleanup of old inventory movement records';

COMMENT ON FUNCTION generate_daily_inventory_summary() IS 
'Generates daily summary of inventory movements and status';

COMMENT ON FUNCTION check_overdue_returns() IS 
'Identifies and processes overdue rental returns';

COMMENT ON FUNCTION forecast_inventory_needs() IS 
'Provides inventory forecasting based on historical patterns';

-- ========================================
-- EXAMPLE USAGE AND TESTING
-- ========================================

/*
-- Test the automation system:

1. Create a test order and update its status:
   UPDATE rental_orders SET status = 'confirmed' WHERE id = 'your-order-id';

2. Check if inventory movements were recorded:
   SELECT * FROM inventory_movements WHERE rental_order_id = 'your-order-id';

3. Test manual inventory adjustment:
   UPDATE toys SET available_quantity = available_quantity - 1 WHERE id = 'your-toy-id';

4. Check low stock alerts in logs:
   -- Check PostgreSQL logs for NOTICE messages

5. Generate daily summary:
   SELECT * FROM generate_daily_inventory_summary();

6. Check inventory forecast:
   SELECT * FROM forecast_inventory_needs(7); -- 7 days ahead

7. Run cleanup (in development/staging only):
   SELECT cleanup_old_inventory_movements();
*/ 