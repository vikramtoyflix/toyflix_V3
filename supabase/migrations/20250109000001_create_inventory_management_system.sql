-- ================================================================================================
-- INVENTORY MANAGEMENT SYSTEM TABLES & AUTOMATION
-- ================================================================================================
-- This migration creates all required tables, functions, and triggers for comprehensive
-- inventory management across all toy tables.

-- ================================================================================================
-- 1. INVENTORY MOVEMENTS TABLE
-- ================================================================================================

CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    toy_id UUID NOT NULL REFERENCES public.toys(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN (
        'RENTAL_OUT', 'RENTAL_RETURN', 'PURCHASE', 'SALE', 'DAMAGE', 'LOSS', 
        'MANUAL_INCREASE', 'MANUAL_DECREASE', 'ADJUSTMENT', 'TRANSFER', 'REPAIR'
    )),
    quantity_change INTEGER NOT NULL,
    reference_type TEXT, -- 'order', 'damage_report', 'manual_adjustment', etc.
    reference_id UUID,
    notes TEXT,
    created_by TEXT, -- User ID or 'system'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_quantity_change CHECK (quantity_change != 0)
);

-- ================================================================================================
-- 2. INVENTORY ALERTS TABLE
-- ================================================================================================

CREATE TABLE IF NOT EXISTS public.inventory_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    toy_id UUID REFERENCES public.toys(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'low_stock', 'out_of_stock', 'damage_reported', 'overdue_return',
        'system_maintenance', 'restock_recommendation', 'system_setup'
    )),
    alert_severity TEXT NOT NULL DEFAULT 'medium' CHECK (alert_severity IN (
        'critical', 'high', 'medium', 'low'
    )),
    message TEXT NOT NULL,
    threshold_value INTEGER DEFAULT 0,
    current_value INTEGER DEFAULT 0,
    reference_type TEXT,
    reference_id UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint for active alerts
    UNIQUE NULLS NOT DISTINCT (toy_id, alert_type, resolved_at)
);

-- ================================================================================================
-- 3. INVENTORY SUMMARY VIEW
-- ================================================================================================

-- Drop existing view first to handle schema changes
DROP VIEW IF EXISTS inventory_summary;

CREATE VIEW inventory_summary AS
SELECT 
    COUNT(*) as total_toys,
    SUM(available_quantity) as total_available,
    SUM(COALESCE(total_quantity, 0) - available_quantity) as total_rented,
    COUNT(CASE WHEN available_quantity <= 5 AND available_quantity > 0 THEN 1 END) as low_stock_count,
    COUNT(CASE WHEN available_quantity = 0 THEN 1 END) as out_of_stock_count,
    ROUND(AVG(available_quantity), 2) as avg_available_per_toy
FROM toys;

-- ================================================================================================
-- 4. CORE AUTOMATION FUNCTIONS
-- ================================================================================================

-- Function: Update inventory when order status changes
CREATE OR REPLACE FUNCTION update_inventory_on_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    item_record RECORD;
    toy_record RECORD;
    inventory_change INTEGER;
BEGIN
    -- Only process specific status changes
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Process inventory changes based on status transitions
    FOR item_record IN 
        SELECT oi.toy_id, oi.quantity
        FROM order_items oi
        JOIN toys t ON oi.toy_id = t.id
        WHERE oi.order_id = NEW.id
    LOOP
        inventory_change := 0;
        
        -- Calculate inventory change based on status transition
        CASE 
            WHEN OLD.status = 'confirmed' AND NEW.status = 'dispatched' THEN
                inventory_change := -item_record.quantity; -- Reserve inventory
            WHEN OLD.status = 'dispatched' AND NEW.status = 'delivered' THEN
                inventory_change := 0; -- No change, already reserved
            WHEN OLD.status = 'delivered' AND NEW.status = 'returned' THEN
                inventory_change := item_record.quantity; -- Return to inventory
            WHEN NEW.status = 'cancelled' AND OLD.status IN ('confirmed', 'dispatched') THEN
                inventory_change := item_record.quantity; -- Return reserved inventory
            ELSE
                inventory_change := 0;
        END CASE;

        IF inventory_change != 0 THEN
            -- Update main toys table
            UPDATE toys 
            SET available_quantity = GREATEST(0, available_quantity + inventory_change),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = item_record.toy_id;

            -- Log inventory movement
            INSERT INTO inventory_movements (
                toy_id,
                movement_type,
                quantity_change,
                reference_type,
                reference_id,
                notes,
                created_by
            ) VALUES (
                item_record.toy_id,
                CASE 
                    WHEN inventory_change > 0 THEN 'RENTAL_RETURN'
                    ELSE 'RENTAL_OUT'
                END,
                ABS(inventory_change),
                'order',
                NEW.id,
                format('Order status changed from %s to %s', OLD.status, NEW.status),
                COALESCE(NEW.updated_by, 'system')
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Log manual inventory changes
CREATE OR REPLACE FUNCTION log_manual_inventory_change()
RETURNS TRIGGER AS $$
DECLARE
    quantity_diff INTEGER;
    movement_type TEXT;
BEGIN
    -- Calculate the difference
    quantity_diff := NEW.available_quantity - OLD.available_quantity;
    
    -- Skip if no change
    IF quantity_diff = 0 THEN
        RETURN NEW;
    END IF;

    -- Determine movement type
    movement_type := CASE 
        WHEN quantity_diff > 0 THEN 'MANUAL_INCREASE'
        ELSE 'MANUAL_DECREASE'
    END;

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
        NEW.id,
        movement_type,
        ABS(quantity_diff),
        'manual_adjustment',
        NEW.id,
        format('Manual inventory adjustment: %s → %s', OLD.available_quantity, NEW.available_quantity),
        COALESCE(current_setting('app.current_user_id', true), 'system')
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Generate low stock alerts
CREATE OR REPLACE FUNCTION check_and_create_low_stock_alerts()
RETURNS TRIGGER AS $$
DECLARE
    low_stock_threshold INTEGER := 5;
    out_of_stock_threshold INTEGER := 0;
    alert_severity TEXT;
    alert_message TEXT;
BEGIN
    -- Determine alert level
    IF NEW.available_quantity <= out_of_stock_threshold THEN
        alert_severity := 'critical';
        alert_message := format('%s is out of stock', NEW.name);
    ELSIF NEW.available_quantity <= low_stock_threshold THEN
        alert_severity := 'high';
        alert_message := format('%s has low stock (%s remaining)', NEW.name, NEW.available_quantity);
    ELSE
        -- Stock is adequate, remove any existing alerts
        UPDATE inventory_alerts 
        SET resolved_at = CURRENT_TIMESTAMP 
        WHERE toy_id = NEW.id 
          AND alert_type IN ('low_stock', 'out_of_stock') 
          AND resolved_at IS NULL;
        
        RETURN NEW;
    END IF;

    -- Create or update alert
    INSERT INTO inventory_alerts (
        toy_id,
        alert_type,
        alert_severity,
        message,
        threshold_value,
        current_value
    ) VALUES (
        NEW.id,
        CASE 
            WHEN NEW.available_quantity <= out_of_stock_threshold THEN 'out_of_stock'
            ELSE 'low_stock'
        END,
        alert_severity,
        alert_message,
        CASE 
            WHEN NEW.available_quantity <= out_of_stock_threshold THEN out_of_stock_threshold
            ELSE low_stock_threshold
        END,
        NEW.available_quantity
    )
    ON CONFLICT (toy_id, alert_type) 
    WHERE resolved_at IS NULL
    DO UPDATE SET
        alert_severity = EXCLUDED.alert_severity,
        message = EXCLUDED.message,
        current_value = EXCLUDED.current_value,
        updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================================================
-- 5. CREATE TRIGGERS
-- ================================================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_order_status_inventory_update ON rental_orders;
DROP TRIGGER IF EXISTS trigger_toys_inventory_change_log ON toys;
DROP TRIGGER IF EXISTS trigger_toys_stock_alert_check ON toys;

-- Create triggers for automated inventory management

-- 1. Order status change trigger (if rental_orders table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rental_orders') THEN
        EXECUTE 'CREATE TRIGGER trigger_order_status_inventory_update
                    AFTER UPDATE OF status ON rental_orders
                    FOR EACH ROW
                    WHEN (OLD.status IS DISTINCT FROM NEW.status)
                    EXECUTE FUNCTION update_inventory_on_order_status_change()';
    END IF;
END $$;

-- 2. Manual inventory change logging trigger
CREATE TRIGGER trigger_toys_inventory_change_log
    AFTER UPDATE OF available_quantity ON toys
    FOR EACH ROW
    WHEN (OLD.available_quantity IS DISTINCT FROM NEW.available_quantity)
    EXECUTE FUNCTION log_manual_inventory_change();

-- 3. Low stock alert trigger
CREATE TRIGGER trigger_toys_stock_alert_check
    AFTER UPDATE OF available_quantity ON toys
    FOR EACH ROW
    WHEN (OLD.available_quantity IS DISTINCT FROM NEW.available_quantity)
    EXECUTE FUNCTION check_and_create_low_stock_alerts();

-- ================================================================================================
-- 6. INDEXES FOR PERFORMANCE
-- ================================================================================================

-- Inventory movements indexes
CREATE INDEX IF NOT EXISTS idx_inventory_movements_toy_id_created_at 
    ON inventory_movements(toy_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference 
    ON inventory_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_movement_type 
    ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at 
    ON inventory_movements(created_at DESC);

-- Inventory alerts indexes
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_toy_id_resolved 
    ON inventory_alerts(toy_id, resolved_at);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_severity_created 
    ON inventory_alerts(alert_severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_type_resolved 
    ON inventory_alerts(alert_type, resolved_at);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_created_at 
    ON inventory_alerts(created_at DESC);

-- Toys inventory indexes
CREATE INDEX IF NOT EXISTS idx_toys_available_quantity 
    ON toys(available_quantity);
CREATE INDEX IF NOT EXISTS idx_toys_category_available 
    ON toys(category, available_quantity);

-- ================================================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================================================

-- Enable RLS on inventory tables
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

-- Inventory movements policies
CREATE POLICY "Admin users can view all inventory movements" ON inventory_movements
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM custom_users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admin users can insert inventory movements" ON inventory_movements
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM custom_users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Inventory alerts policies
CREATE POLICY "Admin users can view all inventory alerts" ON inventory_alerts
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM custom_users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admin users can manage inventory alerts" ON inventory_alerts
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM custom_users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Service role policies (for system automation)
CREATE POLICY "Service role can manage inventory movements" ON inventory_movements
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage inventory alerts" ON inventory_alerts
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ================================================================================================
-- 8. PERMISSIONS
-- ================================================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON inventory_movements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON inventory_alerts TO authenticated;
GRANT SELECT ON inventory_summary TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION update_inventory_on_order_status_change() TO authenticated;
GRANT EXECUTE ON FUNCTION log_manual_inventory_change() TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_create_low_stock_alerts() TO authenticated;

-- ================================================================================================
-- 9. INITIAL DATA SETUP
-- ================================================================================================

-- Create initial system alert for successful setup
INSERT INTO inventory_alerts (
    alert_type,
    alert_severity,
    message,
    current_value
) VALUES (
    'system_setup',
    'low',
    'Inventory management system initialized successfully',
    1
) ON CONFLICT DO NOTHING;

-- Create initial low stock alerts for existing toys
INSERT INTO inventory_alerts (
    toy_id,
    alert_type,
    alert_severity,
    message,
    threshold_value,
    current_value
)
SELECT 
    id,
    CASE 
        WHEN available_quantity = 0 THEN 'out_of_stock'
        ELSE 'low_stock'
    END,
    CASE 
        WHEN available_quantity = 0 THEN 'critical'
        ELSE 'high'
    END,
    CASE 
        WHEN available_quantity = 0 THEN name || ' is out of stock'
        ELSE name || ' has low stock (' || available_quantity || ' remaining)'
    END,
    CASE 
        WHEN available_quantity = 0 THEN 0
        ELSE 5
    END,
    available_quantity
FROM toys 
WHERE available_quantity <= 5
ON CONFLICT DO NOTHING;

-- ================================================================================================
-- 10. COMMENTS AND DOCUMENTATION
-- ================================================================================================

COMMENT ON TABLE inventory_movements IS 'Tracks all inventory changes with full audit trail';
COMMENT ON TABLE inventory_alerts IS 'Smart alerting system for inventory management';
COMMENT ON VIEW inventory_summary IS 'Real-time inventory overview statistics';
COMMENT ON FUNCTION update_inventory_on_order_status_change() IS 'Automatically updates inventory when order status changes';
COMMENT ON FUNCTION log_manual_inventory_change() IS 'Logs manual inventory adjustments for audit trail';
COMMENT ON FUNCTION check_and_create_low_stock_alerts() IS 'Creates alerts when inventory falls below thresholds';

-- ================================================================================================
-- MIGRATION COMPLETION
-- ================================================================================================

-- Final validation and success message
DO $$
BEGIN
    -- Verify all tables were created
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
        RAISE EXCEPTION 'inventory_movements table was not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_alerts') THEN
        RAISE EXCEPTION 'inventory_alerts table was not created';
    END IF;
    
    -- Verify functions exist
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_inventory_on_order_status_change') THEN
        RAISE EXCEPTION 'update_inventory_on_order_status_change function was not created';
    END IF;
    
    RAISE NOTICE '✅ Inventory Management System migration completed successfully!';
    RAISE NOTICE '📊 Tables created: inventory_movements, inventory_alerts';
    RAISE NOTICE '🔧 Functions created: automation triggers and logging';
    RAISE NOTICE '🔒 RLS policies: admin-only access configured';
    RAISE NOTICE '📈 System ready for real-time inventory tracking!';
END $$; 